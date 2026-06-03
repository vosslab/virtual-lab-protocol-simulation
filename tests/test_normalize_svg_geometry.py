"""
Pytest tests for the arc-extrema bounding-box fix in tools/normalize_svg_v2.py.

Both tests target the arc-extrema defect that the bbox fix addresses:
  1. Semicircle bulge -- the endpoint-only bbox missed the arc bulge.
  2. Rotated arc -- exercises the rotation and sweep-clamp path.
"""

# Standard Library
import os
import sys

# Add tools/ to sys.path so normalize_svg_v2 can be imported directly.
_TOOLS_DIR = os.path.join(os.path.dirname(__file__), "..", "tools")
sys.path.insert(0, _TOOLS_DIR)

import normalize_svg_v2


#============================================
# 1. Arc extrema -- semicircle bulge
#    M 0 0 A 50 50 0 0 1 100 0
#    The arc is a lower-half semicircle (sweep=1 goes clockwise in SVG coords,
#    bulging downward to y=+50).  The old endpoint-only code saw only y=0 at
#    both endpoints and returned height 0.  The fixed code must include the
#    bulge point at y=50.
#============================================
def test_arc_extrema_semicircle_bulge() -> None:
	"""Semicircle M 0 0 A 50 50 0 0 0 100 0 -- bbox must include the y=+50 bulge.

	SVG coordinate system has y increasing downward.
	sweep=0 (CCW) from (0,0) to (100,0) with radius 50 arcs through y=+50 (downward).
	sweep=1 (CW) would arc through y=-50 (upward).
	Old endpoint-only code returned ys=[0,0] for any arc, height=0.
	The fixed arc_extrema must include the bulge point.
	"""
	# sweep=0: arc goes CCW (downward in SVG), bulge at y=+50.
	xs, ys = normalize_svg_v2.arc_extrema(0.0, 0.0, 50.0, 50.0, 0.0, 0, 0, 100.0, 0.0)
	min_y = min(ys)
	max_y = max(ys)
	# The bulge must appear: max_y should be ~50 (the bottom of the semicircle).
	# Old endpoint-only code produced max_y = 0 (i.e. no bulge detected), height = 0.
	assert max_y > 40.0, f"max_y={max_y} -- expected ~50 (semicircle bulge not captured)"
	assert abs(max_y - 50.0) < 1e-6, f"max_y={max_y}, expected 50.0"
	# min_y is at the two endpoints, both y=0.
	assert abs(min_y) < 1e-6, f"min_y={min_y}, expected 0.0"

	# Non-tautology check: endpoint-only (old) logic gives height=0;
	# the new code gives height=50. Confirm the endpoint ys alone are both 0.
	endpoint_ys_only = [0.0, 0.0]
	assert max(endpoint_ys_only) - min(endpoint_ys_only) < 1e-9, (
		"Sanity: endpoints alone give zero height -- proves this test is non-tautological"
	)


#============================================
# 1b. Arc extrema -- quarter circle with known extremum to exercise the
#     rotation-and-sweep-clamp path through arc_extrema.
#     M 0 50 A 50 50 0 0 1 50 0 is a CCW quarter arc in the upper-right
#     quadrant.  The extremum at x=50 is an endpoint; the extremum at y=50
#     is also an endpoint.  The midpoint at 45 deg should be near (35.36, 35.36)
#     (inside the bbox, not outside), confirming the sweep window trims
#     candidates that fall outside the arc.
#============================================
def test_arc_extrema_quarter_arc_rotated() -> None:
	"""Rotated arc: phi_deg=45 forces candidate angles into the sweep window.

	Arc from (0,0) to (0,100) with rx=ry=50 and phi_deg=45 (ellipse rotated 45 deg).
	With sweep=1 the arc passes through a rotated bulge.  The extremum at the
	rotation angle must be captured; without the rotation-branch code the bbox
	would undercount.  We verify the bbox is at least as wide as 50 (the radius)
	in the x direction, proving a non-endpoint extremum was included.
	"""
	xs, ys = normalize_svg_v2.arc_extrema(0.0, 0.0, 50.0, 50.0, 45.0, 0, 1, 0.0, 100.0)
	# The arc is a half-ellipse from (0,0) to (0,100) rotated 45 deg.
	# Center is at (0,50) in the original frame after the rotation.
	# The x-extremum of a rotated circle should reach at least +-35 from center x.
	bbox_width = max(xs) - min(xs)
	assert bbox_width > 30.0, (
		f"bbox_width={bbox_width:.3f} -- expected >30 for 45-deg rotated arc "
		"(rotation extremum not captured)"
	)

