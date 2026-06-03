"""
Behavioral regression tests for well_plate_96 subpart geometry emission (WP-GEOM).

Verifies that derive_grid_geometry produces:
- Exactly 96 entries, one per well (8 rows x 12 cols).
- Each entry is a circle whose center and bounding box fall inside the view_box.
- Row-major ordering: A1..A12, B1..B12, ..., H1..H12 (numeric col order, not lexical).
- Determinism: two independent calls return identical maps (no nondeterminism).
"""

import os
import sys

import yaml

import git_file_utils


#============================================

REPO_ROOT = git_file_utils.get_repo_root()


#============================================

def get_gen_module():
	"""Import gen_object_library from pipeline/ for direct function testing."""
	pipeline_dir = os.path.join(REPO_ROOT, "pipeline")
	sys.path.insert(0, pipeline_dir)
	import gen_object_library
	return gen_object_library


#============================================

def load_well_plate_structure() -> dict:
	"""Load the structure block from well_plate_96.yaml."""
	yaml_path = os.path.join(
		REPO_ROOT, "content", "objects", "plate", "well_plate_96.yaml"
	)
	with open(yaml_path, "r") as fh:
		data = yaml.safe_load(fh)
	return data["structure"]


#============================================

def test_well_plate_96_geometry_has_96_entries():
	"""
	derive_grid_geometry emits exactly one entry per well (8 rows x 12 cols = 96).

	Behavioral: the count must equal the grid dimensions declared in the YAML.
	The YAML declares rows: 8, cols: 12; the function must produce that many entries.
	"""
	gen = get_gen_module()
	structure = load_well_plate_structure()
	rows = int(structure["rows"])
	cols = int(structure["cols"])
	expected_count = rows * cols

	geometry_map, view_box = gen.derive_grid_geometry("well_plate_96", structure)

	assert geometry_map is not None
	assert view_box is not None
	# Count must match grid dimensions, not a magic number
	assert len(geometry_map) == expected_count


#============================================

def test_well_plate_96_geometry_circles_inside_viewbox():
	"""
	Every circle entry must have its center and its bounding disk inside the view_box.

	Behavioral: the generator must not place geometry outside the declared view bounds.
	A circle is inside when: cx - r >= min_x, cx + r <= max_x, cy - r >= min_y,
	cy + r <= max_y. Failing this means a well geometry would be rendered off-screen.
	"""
	gen = get_gen_module()
	structure = load_well_plate_structure()
	geometry_map, view_box = gen.derive_grid_geometry("well_plate_96", structure)

	assert geometry_map is not None
	assert view_box is not None

	min_x = view_box["min_x"]
	min_y = view_box["min_y"]
	max_x = min_x + view_box["width"]
	max_y = min_y + view_box["height"]

	violations = []
	for name, geom in geometry_map.items():
		assert geom["shape"] == "circle", f"{name}: expected shape circle"
		cx = geom["cx"]
		cy = geom["cy"]
		r = geom["r"]
		# Center must be inside
		if not (min_x <= cx <= max_x):
			violations.append(f"{name}: cx={cx} outside [{min_x}, {max_x}]")
		if not (min_y <= cy <= max_y):
			violations.append(f"{name}: cy={cy} outside [{min_y}, {max_y}]")
		# Bounding disk must be inside (no clipping at edges)
		if cx - r < min_x:
			violations.append(f"{name}: left edge cx-r={cx - r} < min_x={min_x}")
		if cx + r > max_x:
			violations.append(f"{name}: right edge cx+r={cx + r} > max_x={max_x}")
		if cy - r < min_y:
			violations.append(f"{name}: top edge cy-r={cy - r} < min_y={min_y}")
		if cy + r > max_y:
			violations.append(f"{name}: bottom edge cy+r={cy + r} > max_y={max_y}")

	assert not violations, "Circles outside view_box:\n" + "\n".join(violations)


#============================================

def test_well_plate_96_geometry_row_major_numeric_col_order():
	"""
	The key sequence must be row-major with numeric column ordering (A1, A2, ..., A10,
	A11, A12, B1, ..., H12), not lexical (which would put A10 before A2).

	Behavioral property: A10 must appear AFTER A2 in iteration order.
	Also asserts that the full sequence equals the expected row-major derivation
	built from the same structure the YAML declares (rows A..H, cols 1..12).
	"""
	gen = get_gen_module()
	structure = load_well_plate_structure()
	rows = int(structure["rows"])
	cols = int(structure["cols"])

	geometry_map, _ = gen.derive_grid_geometry("well_plate_96", structure)

	assert geometry_map is not None

	# Derive expected row-major key sequence from structure dimensions
	expected_keys = []
	for row_idx in range(rows):
		row_letter = chr(ord("A") + row_idx)
		for col_num in range(1, cols + 1):
			expected_keys.append(f"{row_letter}{col_num}")

	actual_keys = list(geometry_map.keys())
	assert actual_keys == expected_keys, (
		"Key sequence is not row-major numeric order. "
		f"First divergence: expected {expected_keys[:14]!r}, got {actual_keys[:14]!r}"
	)

	# Explicit guard: A10 must not come before A2 (lexical sort would break this)
	assert actual_keys.index("A10") > actual_keys.index("A2"), (
		"A10 appears before A2: column ordering is lexical, not numeric"
	)


#============================================

def test_well_plate_96_geometry_is_deterministic():
	"""
	Calling derive_grid_geometry twice must yield identical maps.

	Behavioral property: the function is pure and stable. No date, random seed,
	or dict-order nondeterminism should cause successive calls to differ.
	"""
	gen = get_gen_module()
	structure = load_well_plate_structure()

	geometry_map_1, view_box_1 = gen.derive_grid_geometry("well_plate_96", structure)
	geometry_map_2, view_box_2 = gen.derive_grid_geometry("well_plate_96", structure)

	assert geometry_map_1 is not None
	assert geometry_map_2 is not None

	# Key order must be identical across both calls
	assert list(geometry_map_1.keys()) == list(geometry_map_2.keys()), (
		"Key order differs between calls: nondeterministic emission"
	)

	# Every entry must be value-equal
	assert geometry_map_1 == geometry_map_2, (
		"Geometry values differ between calls: nondeterministic emission"
	)

	# view_box must also be identical
	assert view_box_1 == view_box_2, (
		"view_box differs between calls: nondeterministic emission"
	)
