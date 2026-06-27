"""
Behavioral tests for gen_object_library.py visual_states and state schema emission.

WS-M1-F: Verifies that the generator emits visual_states and state schemas with
correct behavioral content, not just structural shape.

Tests check observable behavior:
- The empty state for a pipette's held_material_name resolves to an SVG asset
- The volume field for a pipette uses a fill_height formula referencing that field
- Subpart state fields are separated from object-level fields in the emitted schema
- Objects without subparts emit an empty subpart_state_schema
- Structured objects populate both object-level and subpart-level schemas
"""

import os
import sys

import yaml

import file_utils


#============================================

REPO_ROOT = file_utils.get_repo_root()


#============================================

def load_object_yaml(object_name: str) -> dict:
	"""Load a single object YAML by object_name from content/objects/."""
	objects_dir = os.path.join(REPO_ROOT, "content", "objects")
	for root, dirs, files in os.walk(objects_dir):
		for f in files:
			if f == f"{object_name}.yaml":
				path = os.path.join(root, f)
				with open(path, "r") as fh:
					return yaml.safe_load(fh)
	raise FileNotFoundError(f"Object YAML not found: {object_name}")


#============================================

def get_pipeline_module():
	"""Import the gen_object_library module for behavioral testing."""
	pipeline_dir = os.path.join(REPO_ROOT, "pipeline")
	sys.path.insert(0, pipeline_dir)
	import gen_object_library
	return gen_object_library


#============================================

def test_aspirating_pipette_empty_state_resolves_to_asset():
	"""
	The 'empty' case in held_material_name visual_states must resolve to an svg asset.
	This is a behavioral property: when empty, the pipette must render something visible.
	"""
	gen = get_pipeline_module()
	data = load_object_yaml("aspirating_pipette")
	visual_states = gen.parse_visual_states(data, "aspirating_pipette.yaml")

	held_material = visual_states["held_material_name"]
	# Find the 'empty' case
	empty_case = None
	for case in held_material["cases"]:
		if case["when"] == "empty":
			empty_case = case
			break

	assert empty_case is not None
	# The empty state must resolve to an asset (not overlay or composite)
	assert "asset_name" in empty_case["output"]
	assert empty_case["output"]["asset_name"]


#============================================

def test_aspirating_pipette_volume_uses_fill_height_formula():
	"""
	The held_material_volume visual_states must use a fill_height formula
	referencing 'held_material_volume'. This is the behavioral contract:
	volume state drives fill rendering.
	"""
	gen = get_pipeline_module()
	data = load_object_yaml("aspirating_pipette")
	visual_states = gen.parse_visual_states(data, "aspirating_pipette.yaml")

	volume_vs = visual_states["held_material_volume"]
	# Must be composite with a formula
	assert volume_vs["kind"] == "composite"
	formula = volume_vs["formula"]
	# The formula must reference the correct field name
	assert "held_material_volume" in formula
	assert "fill_height" in formula


#============================================

def test_flat_object_has_empty_subpart_schema():
	"""
	A flat object (no structure block) must produce an empty subpart_state_fields dict.
	This verifies the schema separation is correct, not just that it's present.
	"""
	gen = get_pipeline_module()
	data = load_object_yaml("aspirating_pipette")
	_object_fields, subpart_fields = gen.parse_state_fields(data, "aspirating_pipette.yaml")
	# A flat pipette has no subparts
	assert len(subpart_fields) == 0


#============================================

def test_structured_object_subpart_fields_are_separated():
	"""
	A structured object (dilution_tube_rack_8 has applies_to: subpart fields)
	must have those fields in subpart_state_fields, not in object_state_fields.
	"""
	gen = get_pipeline_module()
	data = load_object_yaml("dilution_tube_rack_8")
	object_fields, subpart_fields = gen.parse_state_fields(data, "dilution_tube_rack_8.yaml")

	# subpart fields exist and are not in object-level schema
	assert "material_name" in subpart_fields
	assert "material_volume" in subpart_fields
	# These fields have applies_to: subpart so must NOT be in object schema
	assert "material_name" not in object_fields
	assert "material_volume" not in object_fields

# NOTE: the generated-artifact round-trip test (reading
# generated/object_library.ts) was moved to tests/e2e/e2e_object_library_generated.py.
# Reading a generated build artifact in the pytest fast lane is a stale-file risk
# (it depends on whether the generator was last run, not on current source). See
# docs/E2E_TESTS.md and docs/PYTEST_STYLE.md.
