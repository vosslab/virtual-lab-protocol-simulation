"""Aspect-ratio prediction and distortion detection.

Implements the aspect-distortion rule from SCENE_LINT_PLAN.md §"B1 aspect_distorted_predicted":
	authored_aspect = svg.viewBox.width / svg.viewBox.height
	rendered_aspect = _visualWidth / _height
	delta_pct = abs(rendered_aspect - authored_aspect) / authored_aspect x 100
	if delta_pct > 5.0: ESCAPE_REQUIRED

The aspect-correction formula from LAYOUT_PIPELINE.md §1 is:
	_height = _visualWidth x (viewport.w / viewport.h) / aspect
"""

from dataclasses import dataclass
from typing import Any


DEFAULT_VIEWPORT = {'w': 1920, 'h': 1080}
ASPECT_DISTORTION_THRESHOLD_PCT = 5.0


@dataclass
class AspectPrediction:
	"""Aspect ratio prediction and distortion metrics."""
	authored_aspect: float
	"""w/h from SVG viewBox."""
	rendered_aspect: float
	"""_visualWidth / _height."""
	delta_pct: float
	"""Absolute percent deviation."""
	is_distorted: bool
	"""True if delta_pct > ASPECT_DISTORTION_THRESHOLD_PCT."""


def predict_aspect_delta_pct(
	placement: dict[str, Any],
	asset: dict[str, Any],
	viewport: dict[str, int] | None = None
) -> AspectPrediction:
	"""
	Predict aspect-ratio distortion from viewport and authored aspect.

	Implements SCENE_LINT_PLAN.md §"B1 aspect_distorted_predicted" and
	LAYOUT_PIPELINE.md §1 aspect-correction formula.

	Args:
		placement: dict with _visualWidth in scene-percent.
		asset: dict with aspect (w/h from SVG viewBox).
		viewport: dict with w, h in CSS pixels. Defaults to DEFAULT_VIEWPORT.

	Returns:
		AspectPrediction with authored_aspect, rendered_aspect, delta_pct, is_distorted.
	"""
	if viewport is None:
		viewport = DEFAULT_VIEWPORT

	visual_width = placement['_visualWidth']
	authored_aspect = asset['aspect']

	# Aspect-correction formula: _height = _visualWidth x (viewport.w / viewport.h) / aspect
	viewport_ratio = viewport['w'] / viewport['h']
	height = visual_width * viewport_ratio / authored_aspect

	# Rendered aspect after correction
	rendered_aspect = visual_width / height

	# Distortion delta as percent
	delta_pct = abs(rendered_aspect - authored_aspect) / authored_aspect * 100.0

	# Check if distorted beyond threshold
	is_distorted = delta_pct > ASPECT_DISTORTION_THRESHOLD_PCT

	return AspectPrediction(
		authored_aspect=authored_aspect,
		rendered_aspect=rendered_aspect,
		delta_pct=delta_pct,
		is_distorted=is_distorted
	)
