"""Balance metrics: canvas filled evenly.

Implements three balance metrics defined in SCENE_DESIGN_LINT_PLAN.md
section "Balance - canvas filled evenly":

  zone_footprint_balance  - footprint distribution evenness across zones
  largest_empty_band      - largest contiguous empty band as fraction of scene
  scene_occupied          - total occupied area fraction as a 0-100 score

Each function accepts the scene YAML dict and dump_data dict produced by
validation.scene_calc.dump.dump_scene_geometry, and returns a float in [0, 100]
or None when required data is absent (NotReady semantics).

Resolved decision (plan "Resolved decisions"):
  zone_footprint_balance is populated only when placement_count >= 1 per zone.

Dump schema reference (WP-SIM-2 pinned):
  dump_data['placements'] list of dicts with keys:
    placement_name, kind, footprint_bbox ({x, y, w, h}), zone (via scene YAML), etc.
  dump_data['zones'] list of dicts with keys: name, bounds ({left, right, top, bottom}),
    inner_rect.
  dump_data['scene_bounds'] {left, right, top, bottom} in scene-%.
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


def _zone_area(zone_bounds: dict[str, float]) -> float:
	"""Return zone area from zone bounds {left, right, top, bottom}.

	Args:
		zone_bounds: Dict with left, right, top, bottom in scene-%.

	Returns:
		(right - left) * (bottom - top).
	"""
	width = zone_bounds['right'] - zone_bounds['left']
	height = zone_bounds['bottom'] - zone_bounds['top']
	return width * height


def _build_zone_placement_map(
	scene: dict[str, Any],
	dump_data: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
	"""Build a map from zone id to list of placement dump entries in that zone.

	Uses the scene YAML placements to learn each placement's zone, then
	joins with the dump placements for geometry.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Dict mapping zone_id -> list of dump placement dicts in that zone.
	"""
	# Build index from placement_name -> zone in scene YAML.
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
# Metric: zone_footprint_balance
#============================================

def zone_footprint_balance(scene: dict[str, Any], dump_data: dict[str, Any]) -> float | None:
	"""Footprint distribution evenness across zones, as a 0-100 score.

	Definition (SCENE_DESIGN_LINT_PLAN.md "Balance"):
	  max(sum footprint per zone) / min(sum footprint per zone) over populated zones.
	  Target: composition <=3x, dense_clutter <=8x.

	Only zones with placement_count >= 1 are included (resolved decision).
	A ratio of 1.0 (perfect balance) earns 100. Higher ratios earn less.
	Score = max(0, 100 - (ratio - 1.0) * 20.0), capped at [0, 100].
	  ratio 1.0 -> score 100
	  ratio 2.0 -> score 80
	  ratio 3.0 -> score 60 (at composition target)
	  ratio 6.0 -> score 0

	Returns None if dump_data is missing or fewer than 2 populated zones exist.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Float in [0, 100], or None if required data is absent.
	"""
	dump_placements = dump_data.get('placements')
	if not dump_placements:
		return None

	zone_map = _build_zone_placement_map(scene, dump_data)

	# Compute footprint sum per populated zone (>= 1 placement).
	zone_footprint_sums: list[float] = []
	for zone_id, zone_placements in zone_map.items():
		if len(zone_placements) < 1:
			continue
		zone_sum = sum(_footprint_area(dp['footprint_bbox']) for dp in zone_placements)
		zone_footprint_sums.append(zone_sum)

	if len(zone_footprint_sums) < 2:
		# Need at least 2 populated zones to compute balance.
		return None

	max_sum = max(zone_footprint_sums)
	min_sum = min(zone_footprint_sums)

	if min_sum <= 0.0:
		# Degenerate: one zone has zero footprint.
		return 0.0

	# Ratio of most-loaded to least-loaded zone.
	ratio = max_sum / min_sum
	# Score: 100 at ratio=1, decreasing 20 points per additional ratio unit.
	score = max(0.0, 100.0 - (ratio - 1.0) * 20.0)
	return score


#============================================
# Metric: largest_empty_band
#============================================

def largest_empty_band(scene: dict[str, Any], dump_data: dict[str, Any]) -> float | None:
	"""Largest contiguous empty horizontal or vertical band as fraction of scene, 0-100.

	Definition (SCENE_DESIGN_LINT_PLAN.md "Balance"):
	  Largest empty quadrant ratio; report-only metric.

	Approach: scan horizontal bands (rows of 5% scene height each) and
	vertical bands (columns of 5% scene width each). A band is empty if
	no placement footprint_bbox overlaps it. Returns the largest empty
	span as a fraction of the scene axis, expressed as a 0-100 score
	where 0 = completely empty and 100 = no empty bands.

	Score = max(0, 100 - largest_empty_fraction * 200.0), capped [0, 100].
	  0% empty -> 100
	  25% empty -> 50
	  50%+ empty -> 0

	Returns None if scene_bounds is missing or no dump placements exist.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry.

	Returns:
		Float in [0, 100], or None if required data is absent.
	"""
	scene_bounds = dump_data.get('scene_bounds')
	dump_placements = dump_data.get('placements')

	if not scene_bounds or dump_placements is None:
		return None

	scene_left = scene_bounds['left']
	scene_right = scene_bounds['right']
	scene_top = scene_bounds['top']
	scene_bottom = scene_bounds['bottom']

	scene_width = scene_right - scene_left
	scene_height = scene_bottom - scene_top

	if scene_width <= 0.0 or scene_height <= 0.0:
		return None

	# Grid resolution: 5% of scene dimension, minimum 1 step.
	n_cols = max(1, int(round(scene_width / 5.0)))
	n_rows = max(1, int(round(scene_height / 5.0)))

	col_width = scene_width / n_cols
	row_height = scene_height / n_rows

	# Mark each cell as occupied (True) or empty (False).
	# cell_occupied[row][col]
	cell_occupied: list[list[bool]] = [
		[False] * n_cols for _ in range(n_rows)
	]

	for dp in dump_placements:
		fb = dp['footprint_bbox']
		# footprint_bbox: {x=left, y=top, w, h}
		fp_left = fb['x']
		fp_top = fb['y']
		fp_right = fp_left + fb['w']
		fp_bottom = fp_top + fb['h']

		# Skip zero-size placements (skipped_error sentinel).
		if fb['w'] <= 0.0 or fb['h'] <= 0.0:
			continue

		# Find which cells this placement overlaps.
		for r in range(n_rows):
			cell_top = scene_top + r * row_height
			cell_bottom = cell_top + row_height
			if fp_bottom <= cell_top or fp_top >= cell_bottom:
				continue
			for c in range(n_cols):
				cell_left = scene_left + c * col_width
				cell_right = cell_left + col_width
				if fp_right <= cell_left or fp_left >= cell_right:
					continue
				cell_occupied[r][c] = True

	# Find largest contiguous empty horizontal band (consecutive empty rows).
	max_empty_rows = 0
	current_run = 0
	for r in range(n_rows):
		# Row is empty if all columns are empty.
		row_empty = all(not cell_occupied[r][c] for c in range(n_cols))
		if row_empty:
			current_run += 1
			if current_run > max_empty_rows:
				max_empty_rows = current_run
		else:
			current_run = 0

	# Find largest contiguous empty vertical band (consecutive empty columns).
	max_empty_cols = 0
	current_run = 0
	for c in range(n_cols):
		# Column is empty if all rows are empty.
		col_empty = all(not cell_occupied[r][c] for r in range(n_rows))
		if col_empty:
			current_run += 1
			if current_run > max_empty_cols:
				max_empty_cols = current_run
		else:
			current_run = 0

	# Convert to fraction of scene axis.
	largest_row_fraction = max_empty_rows / n_rows if n_rows > 0 else 0.0
	largest_col_fraction = max_empty_cols / n_cols if n_cols > 0 else 0.0
	largest_empty_fraction = max(largest_row_fraction, largest_col_fraction)

	# Score: 100 at no empty bands, 0 at >= 50% empty.
	score = max(0.0, 100.0 - largest_empty_fraction * 200.0)
	return score


#============================================
# Metric: scene_occupied
#============================================

def scene_occupied(scene: dict[str, Any], dump_data: dict[str, Any]) -> float | None:
	"""Total occupied scene area fraction, as a 0-100 score.

	Definition (SCENE_DESIGN_LINT_PLAN.md "Balance"):
	  total footprint / scene area; target 0.15-0.70 (class-dependent).

	Score: the target band is [0.15, 0.70] scene fraction (in scene-% squared units).
	  At exactly 0.15 or 0.70, score = 100.
	  Distance outside the band maps linearly to lower scores.
	  Score = max(0, 100 - distance_outside_band * 500.0), where
	  distance_outside_band is fraction below 0.15 or fraction above 0.70.

	Returns None if scene_bounds is missing or no dump placements exist.

	Args:
		scene: Parsed scene YAML dict.
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

	# Fraction of scene covered by placements.
	# Footprint areas are in scene-% squared; scene area is also scene-% squared.
	# The fraction is dimensionless.
	occupied_fraction = total_footprint / total_scene_area

	# Score based on target band [0.15, 0.70].
	low_target = 0.15
	high_target = 0.70

	if low_target <= occupied_fraction <= high_target:
		# Inside target band: perfect score.
		score = 100.0
	elif occupied_fraction < low_target:
		# Below band: penalize by distance below.
		distance = low_target - occupied_fraction
		score = max(0.0, 100.0 - distance * 500.0)
	else:
		# Above band: penalize by distance above.
		distance = occupied_fraction - high_target
		score = max(0.0, 100.0 - distance * 500.0)

	return score
