"""Scene calculator dump: JSON serializer for computed scene geometry.

This is a library-thin loader and serializer that reads scene YAML via the
shared LOAD toolkit, calls the pure functions from zones.py, labels.py,
bboxes.py, and aspect.py, and produces a JSON dump consumable by downstream
tools (scene_lint, scene_design).

The dump schema is pinned and is the canonical input format for B-rules and
design metrics. See WP-SIM-2 acceptance criteria for the full schema.

Placement-level bboxes (visual_bbox, placement_bbox, footprint_bbox,
label_bbox) use {x, y, w, h} keys where x=left, y=top, w=width, h=height.
Zone-level bounds and inner_rect use {left, right, top, bottom} edge-coordinate
form per the pinned schema.
"""

import json
from pathlib import Path
from typing import Any

from validation.shared_toolkit.yaml_io import load_yaml
from validation.shared_toolkit.scene_loaders import load_svg_viewbox
from validation.scene_calc.bboxes import (
	compute_visual_bbox,
	compute_placement_bbox,
	compute_footprint_bbox,
	BBox,
	DEFAULT_VIEWPORT,
)
from validation.scene_calc.aspect import predict_aspect_delta_pct
from validation.scene_calc.zones import zone_inner_rect
from validation.scene_calc.labels import estimate_label_box


#============================================
# JSON serialization helpers
#============================================

def _placement_bbox_to_dict(bbox: BBox) -> dict[str, float]:
	"""Serialize a placement-level BBox to {x, y, w, h} dict.

	Per WP-SIM-2 pinned schema, placement-level bboxes use x=left, y=top,
	w=right-left, h=bottom-top.  Zone-level bounds use edge coordinates.
	"""
	return {
		'x': bbox.left,
		'y': bbox.top,
		'w': bbox.right - bbox.left,
		'h': bbox.bottom - bbox.top,
	}


def _placement_label_to_dict(label_box: Any) -> dict[str, float]:
	"""Serialize a LabelBox to {x, y, w, h} dict.

	Label boxes are placement-level, so they use {x, y, w, h} form.
	"""
	return {
		'x': label_box.left,
		'y': label_box.top,
		'w': label_box.right - label_box.left,
		'h': label_box.bottom - label_box.top,
	}


def _inner_rect_to_dict(inner_rect: Any) -> dict[str, float]:
	"""Serialize an InnerRect to {left, right, top, bottom} dict.

	Zone inner_rect uses edge-coordinate form per the pinned schema.
	"""
	return {
		'left': inner_rect.left,
		'right': inner_rect.right,
		'top': inner_rect.top,
		'bottom': inner_rect.bottom,
	}


#============================================
# Object and asset resolution helpers
#============================================

def _build_object_registry(objects_dir: Path) -> dict[str, dict[str, Any]]:
	"""Scan the objects directory and return a dict mapping object_name -> object dict.

	Walks all .yaml files under objects_dir and indexes each by its object_name field.

	Args:
		objects_dir: Path to content/objects/ directory.

	Returns:
		Dict mapping object_name string to the parsed object YAML dict.
	"""
	registry: dict[str, dict[str, Any]] = {}
	for yaml_file in sorted(objects_dir.glob('**/*.yaml')):
		if not yaml_file.is_file():
			continue
		obj = load_yaml(yaml_file)
		obj_name = obj.get('object_name')
		if obj_name:
			registry[obj_name] = obj
	return registry


def _get_asset_name_from_object(obj: dict[str, Any]) -> str | None:
	"""Extract the primary asset_name from an object's visual_states.

	Walks the visual_states field and returns the first asset_name found
	in any 'when' case output.  Returns None if not found.

	Args:
		obj: Parsed object YAML dict.

	Returns:
		Asset name string or None.
	"""
	visual_states = obj.get('visual_states')
	if not isinstance(visual_states, dict):
		return None
	# Iterate over each field's visual state definition.
	for _field, state_def in visual_states.items():
		if not isinstance(state_def, dict):
			continue
		cases = state_def.get('cases')
		if not isinstance(cases, list):
			continue
		for case in cases:
			output = case.get('output', {})
			asset_name = output.get('asset_name')
			if asset_name:
				return asset_name
	return None


def _resolve_svg_asset(asset_name: str, svg_root: Path) -> Path | None:
	"""Find the SVG file for asset_name under svg_root.

	Searches all subdirectories under svg_root for <asset_name>.svg.

	Args:
		asset_name: Asset name without extension.
		svg_root: Root directory to search for SVG files.

	Returns:
		Path to matching SVG file or None if not found.
	"""
	for svg_file in sorted(svg_root.glob(f'**/{asset_name}.svg')):
		if svg_file.is_file():
			return svg_file
	return None


#============================================
# Placement geometry synthesis helpers
#============================================

def _synthesize_placement_inputs(
	placement: dict[str, Any],
	obj: dict[str, Any],
	zone: dict[str, Any],
	asset_aspect: float,
	viewport: dict[str, int],
) -> dict[str, Any]:
	"""Synthesize pipeline-computed placement fields from YAML inputs.

	The bbox functions expect pipeline-computed fields (_x, _top, _visualWidth,
	aspect).  Since the Python dump operates on pre-pipeline YAML, this function
	derives reasonable values from the authored YAML layout hints.

	_visualWidth = layout.default_width (scene-percent)
	_x = zone center x (scene-percent)
	_top = zone center y - half of visual height (scene-percent)

	Args:
		placement: Placement dict from scene YAML.
		obj: Object dict from object library.
		zone: Zone dict from scene YAML.
		asset_aspect: w/h aspect ratio from SVG viewBox.
		viewport: Dict with w, h in CSS pixels.

	Returns:
		Dict suitable for passing to bbox/label primitives.
	"""
	# Layout hints: object default, then placement override.
	obj_layout = obj.get('layout', {})
	placement_layout = placement.get('layout', {})

	# default_width is scene-percent; honor placement override first.
	default_width = placement_layout.get('default_width', obj_layout.get('default_width', 8.0))
	label_width = placement_layout.get('label_width', obj_layout.get('label_width', 8.0))

	# width_scale: authored placement-level multiplier; default 1.0.
	width_scale = placement_layout.get('width_scale', 1.0)
	visual_width = float(default_width) * float(width_scale)

	# Zone center: use the zone bounds midpoint as placement anchor.
	zone_bounds = zone['bounds']
	zone_cx = (zone_bounds['left'] + zone_bounds['right']) / 2.0
	zone_cy = (zone_bounds['top'] + zone_bounds['bottom']) / 2.0

	# Compute visual height from aspect-correction formula.
	viewport_ratio = viewport['w'] / viewport['h']
	visual_height = visual_width * viewport_ratio / asset_aspect

	# Position: center horizontally in zone, anchor top at zone center.
	x = zone_cx
	top = zone_cy - visual_height / 2.0

	# Label position: below the visual with a small gap.
	label_x = x
	label_y = top + visual_height + 2.0  # 2 scene-% gap below visual

	return {
		'_x': x,
		'_top': top,
		'_visualWidth': visual_width,
		'_height': visual_height,
		'_labelX': label_x,
		'_labelY': label_y,
		'label_width': label_width,
	}


def _determine_scale_source(
	obj: dict[str, Any],
	placement: dict[str, Any],
	asset_loaded: bool,
) -> str:
	"""Determine the scale_source value for a placement.

	Implements the four-value enum from WP-SIM-2:
		cm_model            - asset loaded and display_width_cm is present
		fallback_authored   - no cm-model but display_width_cm authored in placement/object
		fallback_no_workspace - no cm-model and no display_width_cm
		skipped_error       - asset could not be loaded

	Args:
		obj: Object dict from object library.
		placement: Placement dict from scene YAML.
		asset_loaded: True if the SVG asset was found and loaded.

	Returns:
		One of the four scale_source enum strings.
	"""
	if not asset_loaded:
		return 'skipped_error'

	# Check for display_width_cm in object layout (cm-model source).
	obj_layout = obj.get('layout', {})
	placement_layout = placement.get('layout', {})

	has_display_width_cm = (
		'display_width_cm' in obj_layout or
		'display_width_cm' in placement_layout
	)
	if has_display_width_cm:
		# cm-model: authored in cm and convertible via px_per_cm.
		return 'cm_model'

	# Check for default_width (authored scene-percent, no cm conversion).
	has_default_width = (
		'default_width' in obj_layout or
		'default_width' in placement_layout
	)
	if has_default_width:
		return 'fallback_authored'

	# No size hint at all.
	return 'fallback_no_workspace'


#============================================
# Main dump function
#============================================

def dump_scene_geometry(
	scene_path: Path,
	library_paths: list[Path] | None = None,
	svg_root: Path | None = None,
	viewport: dict[str, int] | None = None
) -> dict[str, Any]:
	"""
	Compute and serialize scene geometry to a JSON-ready dict.

	Reads the scene YAML, loads object library data and SVG viewBox info,
	calls pure geometry functions, and returns a dict matching the pinned
	dump schema.

	Args:
		scene_path: Path to scene YAML file.
		library_paths: Ignored (kept for API compatibility). Object library is
			discovered by walking content/objects/ under the repo root.
		svg_root: Root path for SVG asset resolution.
			If None, uses assets/ under repo root (derived from scene_path).
		viewport: Dict with w, h in CSS pixels.
			If None, uses DEFAULT_VIEWPORT.

	Returns:
		Dict matching the WP-SIM-2 dump schema.
		Placement-level bboxes use {x, y, w, h} keys.
		Zone bounds and inner_rect use {left, right, top, bottom} keys.
	"""
	if viewport is None:
		viewport = DEFAULT_VIEWPORT

	scene_path = Path(scene_path)
	scene = load_yaml(scene_path)

	# Required fields: raise if missing so callers see a real error.
	scene_name = scene['scene_name']
	scene_bounds = scene['scene_bounds']

	# Resolve repo root and SVG asset directory.
	repo_root = scene_path.parent
	while repo_root.parent != repo_root:
		if (repo_root / 'AGENTS.md').exists():
			break
		repo_root = repo_root.parent

	if svg_root is None:
		svg_root = repo_root / 'assets'

	objects_dir = repo_root / 'content' / 'objects'
	object_registry = _build_object_registry(objects_dir)

	# Serialize scene bounds (edge-coordinate form per schema).
	bounds_dict = {
		'left': scene_bounds['left'],
		'right': scene_bounds['right'],
		'top': scene_bounds['top'],
		'bottom': scene_bounds['bottom'],
	}

	# Build zone lookup by zone_name for placement resolution.
	zones = scene.get('zones', [])
	zone_by_name: dict[str, dict[str, Any]] = {}
	for zone in zones:
		# Authored zone identifier per SPEC_DESIGN_CHECKLIST.md rule 25 (_name suffix).
		zone_name = zone['zone_name']
		zone_by_name[zone_name] = zone

	# Serialize zones (zone bounds use edge-coordinate form per schema).
	zones_output = []
	for zone in zones:
		zone_name = zone['zone_name']
		zone_bounds = zone['bounds']
		bounds_dict_zone = {
			'left': zone_bounds['left'],
			'right': zone_bounds['right'],
			'top': zone_bounds['top'],
			'bottom': zone_bounds['bottom'],
		}

		# Compute inner rect after padding.
		inner = zone_inner_rect({'bounds': bounds_dict_zone})
		inner_dict = _inner_rect_to_dict(inner)

		zones_output.append({
			'name': zone_name,
			'bounds': bounds_dict_zone,
			'inner_rect': inner_dict,
		})

	# Serialize placements.
	placements = scene.get('placements', [])
	placements_output = []
	for placement in placements:
		# Required placement fields.
		placement_name = placement['placement_name']
		object_name = placement['object_name']
		zone_id = placement['zone']

		# Resolve object from library.
		obj = object_registry.get(object_name, {})
		kind = obj.get('kind', 'unknown')

		# Resolve asset from object visual_states.
		asset_name = _get_asset_name_from_object(obj) if obj else None
		asset_path_str = asset_name if asset_name else '<unknown>'

		# Try to load the SVG viewBox.
		svg_path = None
		asset_aspect: float | None = None
		if asset_name and svg_root.exists():
			svg_path = _resolve_svg_asset(asset_name, svg_root)

		asset_loaded = False
		if svg_path is not None:
			svg_w, svg_h = load_svg_viewbox(svg_path)
			asset_aspect = svg_w / svg_h
			asset_path_str = str(svg_path.relative_to(repo_root))
			asset_loaded = True

		# Determine scale_source before any fallback.
		scale_source = _determine_scale_source(obj, placement, asset_loaded)

		# Resolve the zone for center-anchor computation.
		zone = zone_by_name.get(zone_id)

		if asset_aspect is not None and zone is not None:
			# Full path: synthesize pipeline inputs and call bbox primitives.
			asset_dict = {'aspect': asset_aspect}
			synth = _synthesize_placement_inputs(placement, obj, zone, asset_aspect, viewport)

			visual_bbox = compute_visual_bbox(synth, asset_dict, viewport)
			visual_dict = _placement_bbox_to_dict(visual_bbox)

			placement_bbox = compute_placement_bbox(synth, asset_dict, viewport)
			placement_dict = _placement_bbox_to_dict(placement_bbox)

			footprint_bbox = compute_footprint_bbox(synth, asset_dict, viewport)
			footprint_dict = _placement_bbox_to_dict(footprint_bbox)

			label_bbox = estimate_label_box(synth, asset_dict)
			label_dict = _placement_label_to_dict(label_bbox)

			aspect_pred = predict_aspect_delta_pct(synth, asset_dict, viewport)
			aspect_delta = aspect_pred.delta_pct
		else:
			# Asset or zone could not be resolved: emit a skipped marker.
			# Do not zero-fill; use a distinct sentinel so downstream tools can filter.
			scale_source = 'skipped_error'
			visual_dict = {'x': 0.0, 'y': 0.0, 'w': 0.0, 'h': 0.0}
			placement_dict = {'x': 0.0, 'y': 0.0, 'w': 0.0, 'h': 0.0}
			footprint_dict = {'x': 0.0, 'y': 0.0, 'w': 0.0, 'h': 0.0}
			label_dict = {'x': 0.0, 'y': 0.0, 'w': 0.0, 'h': 0.0}
			aspect_delta = 0.0

		placements_output.append({
			'placement_name': placement_name,
			'kind': kind,
			'asset_path': asset_path_str,
			'visual_bbox': visual_dict,
			'placement_bbox': placement_dict,
			'footprint_bbox': footprint_dict,
			'label_bbox': label_dict,
			'aspect_delta_pct': aspect_delta,
			'scale_source': scale_source,
		})

	return {
		'scene': scene_name,
		'scene_bounds': bounds_dict,
		'zones': zones_output,
		'placements': placements_output,
	}


def dumps_scene_geometry(
	scene_path: Path,
	library_paths: list[Path] | None = None,
	svg_root: Path | None = None,
	viewport: dict[str, int] | None = None
) -> str:
	"""
	Compute scene geometry and serialize to a single-line JSON string.

	Args:
		scene_path: Path to scene YAML file.
		library_paths: Ignored (kept for API compatibility).
		svg_root: Root path for SVG asset resolution.
		viewport: Dict with w, h in CSS pixels.

	Returns:
		JSON string (single line, no pretty printing).
	"""
	dump_dict = dump_scene_geometry(
		scene_path,
		library_paths=library_paths,
		svg_root=svg_root,
		viewport=viewport
	)
	return json.dumps(dump_dict, separators=(',', ':'))
