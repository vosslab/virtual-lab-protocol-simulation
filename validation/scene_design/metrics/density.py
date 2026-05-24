"""Density metrics: right amount of stuff.

Implements two density metrics defined in SCENE_DESIGN_LINT_PLAN.md
section "Density - right amount of stuff":

  scene_density      - total placement footprint area / scene area
  row_overcrowding   - highest row-load score across all zones

Each function accepts the scene YAML dict and dump_data dict produced by
validation.scene_calc.dump.dump_scene_geometry, and returns a float in [0, 100]
or None when required data is absent (NotReady semantics).

Dump schema reference (WP-SIM-2 pinned):
  dump_data['placements'] is a list of dicts with keys:
    placement_name, kind, asset_path, visual_bbox, footprint_bbox,
    placement_bbox, label_bbox, aspect_delta_pct, scale_source
  Each bbox is {x, y, w, h} (placement-level; x=left, y=top, w=width, h=height).
  dump_data['zones'] is a list of dicts with keys: name, bounds, inner_rect.
    bounds/inner_rect use {left, right, top, bottom} edge-coordinate form.
  dump_data['scene_bounds'] is {left, right, top, bottom} in scene-%.
"""

from typing import Any


#============================================
# Internal helpers
#============================================

def _footprint_area(bbox: dict[str, float]) -> float:
	"""Return footprint area (w * h) from a {x, y, w, h} bbox dict.

	Args:
		bbox: Dict with keys x, y, w, h in scene-%.

	Returns:
		Area as w * h.
	"""
	return bbox['w'] * bbox['h']


def _scene_area(scene_bounds: dict[str, float]) -> float:
	"""Return scene area from scene_bounds {left, right, top, bottom}.

	Args:
		scene_bounds: Dict with left, right, top, bottom in scene-%.

	Returns:
		(right - left) * (bottom - top).
	"""
	width = scene_bounds['right'] - scene_bounds['left']
	height = scene_bounds['bottom'] - scene_bounds['top']
	return width * height


def _zone_inner_width(inner_rect: dict[str, float]) -> float:
	"""Return the inner width of a zone from its inner_rect.

	Args:
		inner_rect: Dict with left, right, top, bottom.

	Returns:
		right - left.
	"""
	return inner_rect['right'] - inner_rect['left']


def _build_zone_placement_map(
	scene: dict[str, Any],
	dump_data: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
	"""Build a map from zone id to list of dump placement entries in that zone.

	Uses scene YAML to learn each placement's zone, then joins with dump
	placements for geometry.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Dict mapping zone_id -> list of dump placement dicts in that zone.
	"""
	# Build index from placement_name -> zone from scene YAML.
	name_to_zone: dict[str, str] = {}
	for sp in scene.get('placements', []):
		pname = sp.get('placement_name', '')
		zone_id = sp.get('zone', '')
		if pname and zone_id:
			name_to_zone[pname] = zone_id

	# Build zone -> [dump placements] map.
	zone_map: dict[str, list[dict[str, Any]]] = {}
	for dp in dump_data.get('placements', []):
		zone_id = name_to_zone.get(dp['placement_name'], '')
		if zone_id:
			if zone_id not in zone_map:
				zone_map[zone_id] = []
			zone_map[zone_id].append(dp)

	return zone_map


#============================================
# Metric: scene_density
#============================================

def scene_density(scene: dict[str, Any], dump_data: dict[str, Any]) -> float | None:
	"""Total placement footprint area / scene area, expressed as 0-100 score.

	Definition (SCENE_DESIGN_LINT_PLAN.md "Density"):
	  total footprint / scene area; target 0.15-0.70 (skipped for template).

	The density fraction is the raw ratio. The 0-100 score uses the same
	target band [0.15, 0.70] as scene_occupied in balance.py:
	  At any fraction in [0.15, 0.70]: score = 100.
	  Below 0.15: score = max(0, 100 - (0.15 - fraction) * 500).
	  Above 0.70: score = max(0, 100 - (fraction - 0.70) * 500).

	Note: scene_density and scene_occupied share the same formula and target.
	Both are retained because they serve different metric groups in
	SCENE_DESIGN_LINT_PLAN.md (density vs. balance) and appear under separate
	weight table entries.

	Returns None if scene_bounds is missing or no dump placements exist.

	Args:
		scene: Parsed scene YAML dict. (Not used; included for API uniformity.)
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Float in [0, 100], or None if required data is absent.
	"""
	scene_bounds = dump_data.get('scene_bounds')
	dump_placements = dump_data.get('placements')

	if not scene_bounds or dump_placements is None:
		return None

	total_scene_area = _scene_area(scene_bounds)
	if total_scene_area <= 0.0:
		return None

	# Sum footprint areas for all non-skipped placements.
	total_footprint = sum(
		_footprint_area(dp['footprint_bbox'])
		for dp in dump_placements
		if dp['footprint_bbox']['w'] > 0.0 and dp['footprint_bbox']['h'] > 0.0
	)

	# Density fraction (dimensionless).
	density_fraction = total_footprint / total_scene_area

	# Score based on target band [0.15, 0.70].
	low_target = 0.15
	high_target = 0.70

	if low_target <= density_fraction <= high_target:
		score = 100.0
	elif density_fraction < low_target:
		distance = low_target - density_fraction
		score = max(0.0, 100.0 - distance * 500.0)
	else:
		distance = density_fraction - high_target
		score = max(0.0, 100.0 - distance * 500.0)

	return score


#============================================
# Metric: row_overcrowding
#============================================

def row_overcrowding(scene: dict[str, Any], dump_data: dict[str, Any]) -> float | None:
	"""Highest row-load score: sum of widths / zone inner width, as 0-100.

	Definition (SCENE_DESIGN_LINT_PLAN.md "Density"):
	  per-row required-scale to fit; aggregated as min(scales) across zones;
	  target >=0.75 (gradient of the render predictor's MIN_SCALE binary).

	Row-load is computed per zone as:
	  row_load = sum(footprint_bbox.w for placements in zone) / zone_inner_width

	A row_load <= 1.0 means placements fit without horizontal overcrowding.
	Row_load > 1.0 indicates overcrowding. Score uses the worst (highest) zone
	load:

	Formula:
	  max_row_load = max(row_load over all populated zones)
	  score = max(0, 100 - (max_row_load - 1.0) * 100)
	    row_load 1.0 -> score 100 (fits exactly)
	    row_load 1.5 -> score 50
	    row_load 2.0 -> score 0

	Returns None if dump_data is missing zones with inner_rect, or if no
	zone has placements.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Float in [0, 100], or None if required data is absent.
	"""
	dump_placements = dump_data.get('placements')
	dump_zones = dump_data.get('zones')

	if not dump_placements or not dump_zones:
		return None

	# Build zone inner_rect lookup from dump zones.
	zone_inner: dict[str, dict[str, float]] = {}
	for zone in dump_zones:
		zone_name = zone.get('name', '')
		inner = zone.get('inner_rect')
		if zone_name and inner:
			zone_inner[zone_name] = inner

	if not zone_inner:
		return None

	# Build zone -> list of placements map using scene YAML zone assignments.
	zone_map = _build_zone_placement_map(scene, dump_data)

	# Compute row_load for each zone that has both placements and inner_rect.
	zone_loads: list[float] = []
	for zone_id, zone_placements in zone_map.items():
		inner_rect = zone_inner.get(zone_id)
		if not inner_rect:
			# Zone in placements but no inner_rect in dump: skip this zone.
			continue

		inner_width = _zone_inner_width(inner_rect)
		if inner_width <= 0.0:
			# Degenerate zone with zero inner width: treat as fully overcrowded.
			zone_loads.append(2.0)
			continue

		# Sum footprint widths for valid placements in this zone.
		total_width = sum(
			dp['footprint_bbox']['w']
			for dp in zone_placements
			if dp['footprint_bbox']['w'] > 0.0
		)

		row_load = total_width / inner_width
		zone_loads.append(row_load)

	if not zone_loads:
		return None

	# Use the worst (highest) zone load.
	max_row_load = max(zone_loads)
	# Score: 100 when load <= 1.0, decreasing as load exceeds 1.0.
	# Cap at 100 (row_load < 1.0 yields a raw value > 100; clamp to the max).
	score = min(100.0, max(0.0, 100.0 - (max_row_load - 1.0) * 100.0))
	return score
