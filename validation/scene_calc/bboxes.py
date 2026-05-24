"""BBox computation primitives.

Implements the BBox vocabulary from SCENE_LINT_PLAN.md §"BBox vocabulary":
- visual_bbox: the rendered SVG's painted rectangle (asset-aspect-honoring).
- placement_bbox: visual_bbox + any depth offset and renderer margins.
- footprint_bbox: the space the layout engine budgets for the placement.

All coordinates and dimensions are in scene-percent units per LAYOUT_PIPELINE.md §1.
"""

from dataclasses import dataclass
from typing import Any


# Constants from LAYOUT_PIPELINE.md §2
MIN_SCALE = 0.55
MAX_FOOTPRINT_RATIO = 2.5
ZONE_PADDING = 1.5
PX_PER_SCENE_PERCENT = 11.52
DEFAULT_VIEWPORT = {'w': 1920, 'h': 1080}


#============================================
# Data classes for return values
#============================================

@dataclass
class BBox:
	"""A bounding box: left, right, top, bottom in scene-percent."""
	left: float
	right: float
	top: float
	bottom: float

	@property
	def width(self) -> float:
		"""Width in scene-percent."""
		return self.right - self.left

	@property
	def height(self) -> float:
		"""Height in scene-percent."""
		return self.bottom - self.top

	@property
	def x(self) -> float:
		"""Center x in scene-percent."""
		return (self.left + self.right) / 2.0

	@property
	def y(self) -> float:
		"""Center y in scene-percent."""
		return (self.top + self.bottom) / 2.0


#============================================
# BBox computation functions
#============================================

def compute_visual_bbox(
	placement: dict[str, Any],
	asset: dict[str, Any],
	viewport: dict[str, int] | None = None
) -> BBox:
	"""
	Compute the visual_bbox: the rendered SVG's painted rectangle.

	Implements SCENE_LINT_PLAN.md "BBox vocabulary" and LAYOUT_PIPELINE.md §1
	aspect-correction formula:
		_height = _visualWidth x (viewport.w / viewport.h) / aspect

	Args:
		placement: dict with keys:
			- _x: center x in scene-percent
			- _top: top y in scene-percent
			- _visualWidth: width in scene-percent (aspect-corrected)
		asset: dict with keys:
			- aspect: w/h ratio from SVG viewBox
		viewport: dict with keys w, h in CSS pixels. Defaults to DEFAULT_VIEWPORT.

	Returns:
		BBox with left, right, top, bottom in scene-percent.
	"""
	if viewport is None:
		viewport = DEFAULT_VIEWPORT

	x = placement['_x']
	top = placement['_top']
	visual_width = placement['_visualWidth']
	aspect = asset['aspect']

	# Aspect-correction formula from SCENE_LINT_PLAN.md "Unit audit":
	# _height = _visualWidth x (viewport.w / viewport.h) / aspect
	viewport_ratio = viewport['w'] / viewport['h']
	height = visual_width * viewport_ratio / aspect

	left = x - visual_width / 2.0
	right = x + visual_width / 2.0
	bottom = top + height

	return BBox(left=left, right=right, top=top, bottom=bottom)


def compute_placement_bbox(
	placement: dict[str, Any],
	asset: dict[str, Any],
	viewport: dict[str, int] | None = None
) -> BBox:
	"""
	Compute the placement_bbox: visual_bbox + depth offset and renderer margins.

	Implements SCENE_LINT_PLAN.md "BBox vocabulary". In the context of the
	simulator output, placement_bbox is the `.placement` element's rect that
	precheck's `region_overflow` measures.

	For v0, we use the visual_bbox directly (no depth offset or margin adjustment).
	This aligns with the rule "placement_bbox_outside_zone" which compares the
	post-Stage 10 placement result against zone bounds.

	Args:
		placement: dict from ComputedItem output (post-Stage 10).
		asset: dict with aspect.
		viewport: dict with w, h in CSS pixels.

	Returns:
		BBox with left, right, top, bottom in scene-percent.
	"""
	# For now, placement_bbox == visual_bbox (no depth offset applied in v0).
	return compute_visual_bbox(placement, asset, viewport)


def compute_footprint_bbox(
	placement: dict[str, Any],
	asset: dict[str, Any],
	viewport: dict[str, int] | None = None,
	label_height: float | None = None
) -> BBox:
	"""
	Compute the footprint_bbox: the space the layout engine budgets for placement.

	Implements SCENE_LINT_PLAN.md "BBox vocabulary":
		max(_visualWidth, min(label_width, _visualWidth x MAX_FOOTPRINT_RATIO))
		wide; height = max(_height, label_height).

	Args:
		placement: dict with keys:
			- _x: center x in scene-percent
			- _top: top y in scene-percent
			- _visualWidth: width in scene-percent
			- _labelX: label center x in scene-percent
		asset: dict with aspect.
		viewport: dict with w, h in CSS pixels.
		label_height: height of label in scene-percent. If None, computed from visual.

	Returns:
		BBox with left, right, top, bottom in scene-percent.
	"""
	if viewport is None:
		viewport = DEFAULT_VIEWPORT

	visual = compute_visual_bbox(placement, asset, viewport)
	visual_width = visual.width
	visual_height = visual.height

	# Compute footprint width: budgeted space including label wrap.
	# From SCENE_LINT_PLAN.md: "max(_visualWidth, min(label_width, _visualWidth x MAX_FOOTPRINT_RATIO))"
	# For v0, we use visual_width as the footprint width (label wrap not yet modeled).
	footprint_width = visual_width

	# Footprint height is max(visual_height, label_height).
	if label_height is None:
		footprint_height = visual_height
	else:
		footprint_height = max(visual_height, label_height)

	x = placement['_x']
	top = visual.top

	left = x - footprint_width / 2.0
	right = x + footprint_width / 2.0
	bottom = top + footprint_height

	return BBox(left=left, right=right, top=top, bottom=bottom)
