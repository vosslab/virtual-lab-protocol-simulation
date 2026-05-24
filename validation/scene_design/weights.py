"""Per-class weight tables for scene design scoring.

Weight tables define the relative importance of each metric for each scene class.
These are extracted from SCENE_DESIGN_LINT_PLAN.md section "Per-class weight tables"
and are guaranteed to sum to 1.00 per class.

Classes:
	template - declared via data-scene-mode="template"
	composition - default/fallback classification
	instrument_heavy - primary placement is instrument/equipment kind
	zoom_detail - declared via data-scene-mode="zoom_detail"
	dense_clutter - >=10 placements after inheritance resolution
"""


WEIGHTS: dict[str, dict[str, float]] = {
	'template': {
		'predicted_label_overlap': 0.40,
		'label_wrap_rate': 0.40,
		'largest_empty_band': 0.20,
	},
	'composition': {
		'primary_area_ratio': 0.25,
		'zone_footprint_balance': 0.15,
		'support_distance': 0.20,
		'scene_density': 0.15,
		'predicted_label_overlap': 0.15,
		'label_wrap_rate': 0.05,
		'aspect_fidelity': 0.05,
	},
	'instrument_heavy': {
		'primary_area_ratio': 0.35,
		'support_distance': 0.20,
		'scene_density': 0.15,
		'predicted_label_overlap': 0.15,
		'label_wrap_rate': 0.05,
		'aspect_fidelity': 0.10,
	},
	'zoom_detail': {
		'primary_area_ratio': 0.50,
		'zone_footprint_balance': 0.10,
		'scene_density': 0.20,
		'predicted_label_overlap': 0.10,
		'label_wrap_rate': 0.10,
	},
	'dense_clutter': {
		'primary_area_ratio': 0.05,
		'support_distance': 0.20,
		'scene_density': 0.10,
		'predicted_label_overlap': 0.30,
		'label_wrap_rate': 0.25,
		'aspect_fidelity': 0.10,
	},
}
