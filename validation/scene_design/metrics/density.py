"""Density metrics: right amount of stuff.

Implements one density metric defined in SCENE_DESIGN_LINT_PLAN.md
section "Density - right amount of stuff":

  scene_density      - total placement footprint area / scene area

Each function accepts the scene YAML dict and dump_data dict produced by
validation.scene_calc.dump.dump_scene_geometry, and returns a float in [0, 100]
or None when required data is absent (NotReady semantics).

Dump schema reference:
  dump_data['placements'] is a list of dicts with keys:
    placement_name, kind, asset_path, visual_bbox, footprint_bbox,
    placement_bbox, label_bbox, aspect_delta_pct, scale_source
  Each bbox is {x, y, w, h} (placement-level; x=left, y=top, w=width, h=height).
  dump_data['zones'] is a list of dicts with keys: name, bounds, inner_rect.
    bounds/inner_rect use {left, right, top, bottom} edge-coordinate form.
  dump_data['scene_bounds'] is {left, right, top, bottom} in scene-%.
"""


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


#============================================
# Metric: scene_density
#============================================

def scene_density(scene: dict[str, object], dump_data: dict[str, object]) -> float | None:
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
