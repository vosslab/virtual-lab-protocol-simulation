"""Zone-fit mathematics primitives.

Implements zone-fit logic from LAYOUT_PIPELINE.md and SCENE_LINT_PLAN.md:
- zone_inner_rect: the usable interior of a zone after subtracting padding.
- fits_in_zone: check if a bbox fits within a zone's inner rect.
- required_scale_to_fit: compute the scale factor needed to fit a bbox in a zone.

All coordinates and dimensions are in scene-percent units per LAYOUT_PIPELINE.md §1.
"""

from dataclasses import dataclass
from typing import Any

from validation.scene_calc.bboxes import BBox, MIN_SCALE, ZONE_PADDING


#============================================
# Data classes for return values
#============================================

@dataclass
class InnerRect:
	"""Usable interior of a zone after padding subtraction."""
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


#============================================
# Zone fit primitives
#============================================

def zone_inner_rect(
	zone: dict[str, Any],
	padding: float | None = None
) -> InnerRect:
	"""
	Compute the inner usable rectangle of a zone after padding subtraction.

	Implements LAYOUT_PIPELINE.md §1 ZONE_PADDING constant: the padding
	value (default ZONE_PADDING) is subtracted from each edge.

	Args:
		zone: dict with keys:
			- bounds: dict with left, right, top, bottom in scene-percent
		padding: padding to subtract from edges in scene-percent.
			Defaults to ZONE_PADDING.

	Returns:
		InnerRect with left, right, top, bottom in scene-percent.
	"""
	if padding is None:
		padding = ZONE_PADDING

	bounds = zone['bounds']
	left = bounds['left'] + padding
	right = bounds['right'] - padding
	top = bounds['top'] + padding
	bottom = bounds['bottom'] - padding

	return InnerRect(left=left, right=right, top=top, bottom=bottom)


def fits_in_zone(
	bbox: BBox,
	zone: dict[str, Any],
	padding: float | None = None
) -> bool:
	"""
	Check if a bbox fits entirely within a zone's inner rectangle.

	Args:
		bbox: BBox with left, right, top, bottom in scene-percent.
		zone: dict with bounds in scene-percent.
		padding: padding to subtract from zone edges.
			Defaults to ZONE_PADDING.

	Returns:
		True if bbox fits entirely within zone inner rect; False otherwise.
	"""
	inner = zone_inner_rect(zone, padding)
	return (bbox.left >= inner.left and
			bbox.right <= inner.right and
			bbox.top >= inner.top and
			bbox.bottom <= inner.bottom)


def required_scale_to_fit(
	bbox: BBox,
	zone: dict[str, Any],
	padding: float | None = None
) -> float:
	"""
	Compute the scale factor required to fit a bbox in a zone's inner rect.

	If the bbox already fits, returns 1.0. If the bbox is larger than the
	zone interior, computes a scale factor that would fit it. The returned
	scale is never below MIN_SCALE per LAYOUT_PIPELINE.md §2.

	Formula: scale = min(zone_width / bbox_width, zone_height / bbox_height)

	Args:
		bbox: BBox with left, right, top, bottom in scene-percent.
		zone: dict with bounds in scene-percent.
		padding: padding to subtract from zone edges.
			Defaults to ZONE_PADDING.

	Returns:
		Scale factor (float >= MIN_SCALE). 1.0 if bbox already fits.
	"""
	if fits_in_zone(bbox, zone, padding):
		return 1.0

	inner = zone_inner_rect(zone, padding)
	zone_width = inner.width
	zone_height = inner.height

	bbox_width = bbox.width
	bbox_height = bbox.height

	# Compute scale factor from both dimensions; use minimum.
	scale_w = zone_width / bbox_width if bbox_width > 0 else 1.0
	scale_h = zone_height / bbox_height if bbox_height > 0 else 1.0

	scale = min(scale_w, scale_h)

	# Never return below MIN_SCALE per LAYOUT_PIPELINE.md §2.
	return max(scale, MIN_SCALE)
