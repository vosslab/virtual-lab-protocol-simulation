"""Scene design scoring via weighted metric aggregation.

Aggregates metric values into a single 0-100 design score for a scene,
using per-class weight tables. Returns None if any required metric for
the class is None (indicating metrics are not yet populated).
"""

from validation.scene_design.weights import WEIGHTS


def aggregate_score(metrics: dict[str, float | None], scene_class: str) -> float | None:
	"""
	Aggregate individual metric scores into a single 0-100 design score.

	Args:
		metrics: Dict mapping metric name -> score (0-100 float, or None).
		scene_class: Scene class name (key in WEIGHTS dict).

	Returns:
		Weighted sum score (0-100 float), or None if any required metric
		for the class is None. Returns None represents NotReady semantics;
		metrics will be populated in downstream WPs (WP-METRICS-*).

	Raises:
		ValueError: If scene_class is not in WEIGHTS (class name invalid).
	"""
	if scene_class not in WEIGHTS:
		raise ValueError(f'Unknown scene class: {scene_class}')

	class_weights = WEIGHTS[scene_class]

	# Check that all required metrics for this class are present and non-None
	for metric_name in class_weights:
		if metrics.get(metric_name) is None:
			return None

	# All required metrics are present; compute weighted sum
	total_score = 0.0
	for metric_name, weight in class_weights.items():
		metric_value = metrics[metric_name]
		total_score += metric_value * weight

	return total_score
