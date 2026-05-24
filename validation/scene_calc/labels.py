"""Label-box estimation and intersection primitives.

Implements label-box calculation from LAYOUT_PIPELINE.md §"labels":
- estimate_label_box: compute the bounding rect of a placement's label text.
- label_intersects: check if a label box intersects with another bbox.

Label positioning follows the pipeline's vertical position calculation:
	_labelY = _top + (_height - label_height) / 2 (centered vertically)

Label width is authored in the layout hint as label_width (default 8 scene-%).
Label height is computed from font size and line wrapping.

All coordinates and dimensions are in scene-percent units per LAYOUT_PIPELINE.md §1.
"""

from dataclasses import dataclass
from typing import Any

from validation.scene_calc.bboxes import BBox


# Label-gap constants by object class.
# Scientific objects (equipment, flask, pipette, rack, plate, waste, bottle) are
# afforded a tight label gap: the label appears close to the object for spatial
# clarity. Decoration objects (decoration kind) use a larger gap for visual
# breathing room. SCIENTIFIC_KINDS = TS KINDS enum minus {decoration}.
# Per WP-SIM-2 acceptance: "Label tests cover zone-edge proximity and
# scientific-vs-decoration distinction."
LABEL_GAP_SCIENTIFIC = 2.0  # scene-% gap below visual for scientific objects
LABEL_GAP_DECORATION = 4.0  # scene-% gap below visual for decoration objects

# Object kinds classified as scientific (tighter label proximity).
SCIENTIFIC_KINDS = frozenset({'equipment', 'flask', 'pipette', 'rack', 'plate', 'waste', 'bottle'})


#============================================
# Data classes for return values
#============================================

@dataclass
class LabelBox:
	"""Bounding box of a label text."""
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
# Label primitives
#============================================

def _label_gap_for_kind(kind: str) -> float:
	"""Return the label gap (scene-%) for an object kind.

	Scientific objects get a tighter gap (LABEL_GAP_SCIENTIFIC).
	Decoration objects get a larger gap (LABEL_GAP_DECORATION).

	Args:
		kind: Object kind string from the object library.

	Returns:
		Gap in scene-percent between visual bottom and label top-center.
	"""
	if kind in SCIENTIFIC_KINDS:
		return LABEL_GAP_SCIENTIFIC
	# Default (including 'decoration' and unknown kinds) use larger gap.
	return LABEL_GAP_DECORATION


def estimate_label_box(
	placement: dict[str, Any],
	asset: dict[str, Any]
) -> LabelBox:
	"""
	Estimate the bounding box of a placement's label.

	Implements LAYOUT_PIPELINE.md §"labels":
		_labelY = _top + (_height - label_height) / 2  (vertically centered)
		_labelX is provided directly by the placement.

	Label width and height are taken from the placement's layout hint:
	- label_width (default 8 scene-%, per LayoutHint in LAYOUT_PIPELINE.md)
	- label_height (estimated from font size + line count)

	For v0, label_height is estimated as 4 scene-% per label line, with
	minimum 1 line (4 scene-%). Label width defaults to 8 scene-%.

	Scientific-vs-decoration distinction (WP-SIM-2):
	- Scientific objects (equipment, flask, pipette, rack, plate, waste, bottle)
	  use LABEL_GAP_SCIENTIFIC (2.0 scene-%) between visual bottom and label.
	- Decoration objects use LABEL_GAP_DECORATION (4.0 scene-%) for more breathing room.

	Args:
		placement: dict with keys:
			- _labelX: center x of label in scene-percent
			- _labelY: center y of label in scene-percent (if provided; else computed)
			- _top: top y of visual in scene-percent
			- _height: height of visual in scene-percent
			(optional) label_width: width in scene-percent (default 8)
			(optional) kind: object kind string for gap selection (default treats as decoration)
		asset: dict (unused; included for interface consistency).

	Returns:
		LabelBox with left, right, top, bottom in scene-percent.
	"""
	label_x = placement.get('_labelX', placement.get('_x', 0.0))
	label_width = placement.get('label_width', 8.0)

	# Determine gap based on object kind.
	kind = placement.get('kind', 'decoration')
	label_gap = _label_gap_for_kind(kind)

	# If _labelY is not in placement, compute it below the visual using the gap.
	if '_labelY' in placement:
		label_y = placement['_labelY']
	else:
		# Fallback: position below the visual with kind-appropriate gap.
		top = placement.get('_top', 0.0)
		height = placement.get('_height', 0.0)
		label_y = top + height + label_gap

	# Estimate label height: 4 scene-% per line, minimum 1 line.
	label_lines = placement.get('_labelLines', [])
	label_height = max(4.0, len(label_lines) * 4.0)

	# Compute bounding box centered horizontally on label_x, vertically on label_y.
	left = label_x - label_width / 2.0
	right = label_x + label_width / 2.0
	top = label_y - label_height / 2.0
	bottom = label_y + label_height / 2.0

	return LabelBox(left=left, right=right, top=top, bottom=bottom)


def label_intersects(
	label_box: LabelBox,
	other_bbox: BBox
) -> bool:
	"""
	Check if a label box intersects with another bbox.

	Two axis-aligned rectangles intersect if they overlap in both x and y.

	Args:
		label_box: LabelBox from estimate_label_box.
		other_bbox: BBox to check against.

	Returns:
		True if label_box and other_bbox overlap; False otherwise.
	"""
	# Rectangles do not overlap if one is entirely to the left, right, above, or below.
	if label_box.right <= other_bbox.left:
		return False
	if label_box.left >= other_bbox.right:
		return False
	if label_box.bottom <= other_bbox.top:
		return False
	if label_box.top >= other_bbox.bottom:
		return False

	return True
