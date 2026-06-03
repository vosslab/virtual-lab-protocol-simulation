"""
Focused pytest for the D6 structured-well-plate per-subpart material rule
in ObjectValidator.

Rule: an object with structure.subpart_kind: well must declare both
material_name and material_volume with applies_to: subpart. Absence of
either field is a validation ERROR.

The rule fires only for objects whose structure declares subpart_kind: well.
It does not fire for rack (tube), or for plate-like objects without a
structure block.
"""

import pytest

from validation.yaml_schema.object_validator import ObjectValidator
from validation.yaml_schema.findings import Severity


#============================================
@pytest.fixture
def validator() -> ObjectValidator:
	"""Provide a fresh ObjectValidator instance for each test."""
	return ObjectValidator()


def _minimal_well_plate(extra_state_fields: list | None = None) -> dict:
	"""
	Build a minimal well-plate object that satisfies all other validator rules.
	By default includes the required per-subpart fields; callers may replace
	state_fields to test the absence cases.
	"""
	state_fields: list = [
		{
			'field_name': 'material_name',
			'type': 'enum',
			'allowed': ['empty', 'mixed'],
			'default': 'empty',
			'applies_to': 'subpart',
			'description': 'Material in this well.',
		},
		{
			'field_name': 'material_volume',
			'type': 'float',
			'unit': 'ul',
			'min': 0,
			'max': 300,
			'default': 0,
			'applies_to': 'subpart',
			'description': 'Volume in this well.',
		},
	]
	if extra_state_fields is not None:
		state_fields = extra_state_fields

	return {
		'object_name': 'test_well_plate',
		# Place in content/objects/plate/ path by using kind: plate
		'kind': 'plate',
		'label': 'Test 96-well plate',
		'structure': {
			'subpart_kind': 'well',
			'layout': 'grid',
			'rows': 2,
			'cols': 2,
			'name_pattern': '{row_letter}{col}',
		},
		'state_fields': state_fields,
		'visual_states': {
			'material_name': {
				'applies_to': 'subpart',
				'render_effect': 'material_tint',
				'target': 'subpart_geometry',
			},
			'material_volume': {
				'kind': 'composite',
				'applies_to': 'subpart',
				'composite': [],
			},
		},
		'capabilities': ['clickable', 'structured_surface', 'material_container'],
		'layout': {'default_width': 20, 'label_width': 10},
	}


#============================================
def test_well_plate_with_both_subpart_fields_passes(validator: ObjectValidator) -> None:
	"""
	Positive case: a structured well plate that declares both material_name and
	material_volume with applies_to: subpart produces no D6 errors.
	"""
	obj = _minimal_well_plate()
	findings = validator.validate(obj, 'content/objects/plate/test_well_plate.yaml')
	# Filter to only ERROR-severity findings so warnings from other rules don't interfere
	errors = [f for f in findings if f.severity == Severity.ERROR]
	assert not errors, f"Expected no errors, got: {[f.message for f in errors]}"


#============================================
def test_well_plate_missing_both_subpart_material_fields_is_rejected(validator: ObjectValidator) -> None:
	"""
	Negative case: a structured well plate with no per-subpart material fields at all
	is rejected with an ERROR. This guards against a future regression that strips
	the fields from well_plate_96.yaml.
	"""
	# Declare material_name and material_volume at object scope (applies_to: object),
	# which does NOT satisfy the per-subpart requirement.
	state_fields_object_scope = [
		{
			'field_name': 'material_name',
			'type': 'enum',
			'allowed': ['empty', 'mixed'],
			'default': 'empty',
			'applies_to': 'object',
			'description': 'Object-level material -- not per-subpart.',
		},
		{
			'field_name': 'material_volume',
			'type': 'float',
			'unit': 'ul',
			'min': 0,
			'max': 300,
			'default': 0,
			'applies_to': 'object',
			'description': 'Object-level volume -- not per-subpart.',
		},
	]
	obj = _minimal_well_plate(extra_state_fields=state_fields_object_scope)
	# Adjust visual_states to match the object-scope state fields
	obj['visual_states'] = {
		'material_name': {
			'kind': 'svg',
			'applies_to': 'object',
			'cases': [
				{'when': 'empty', 'output': {'asset_name': 'test_plate'}},
			],
		},
		'material_volume': {
			'kind': 'composite',
			'applies_to': 'object',
			'composite': [],
		},
	}
	findings = validator.validate(obj, 'content/objects/plate/test_well_plate.yaml')
	error_messages = [f.message for f in findings if f.severity == Severity.ERROR]
	# The D6 rule must fire when both subpart fields are absent
	assert any('subpart_kind: well' in msg for msg in error_messages), (
		f"Expected D6 error about subpart_kind: well, got: {error_messages}"
	)


#============================================
def test_rack_with_tube_subpart_is_not_affected_by_d6_rule(validator: ObjectValidator) -> None:
	"""
	Non-well structured object (subpart_kind: tube) is exempt from the D6 rule
	even when per-subpart material fields are present.
	"""
	obj = {
		'object_name': 'test_tube_rack',
		'kind': 'rack',
		'label': 'Test tube rack',
		'structure': {
			'subpart_kind': 'tube',
			'layout': 'grid',
			'rows': 4,
			'cols': 1,
			'name_pattern': 'tube_{row_letter}',
		},
		'state_fields': [
			{
				'field_name': 'material_name',
				'type': 'enum',
				'allowed': ['empty'],
				'default': 'empty',
				'applies_to': 'subpart',
				'description': 'Contents of this tube.',
			},
			{
				'field_name': 'material_volume',
				'type': 'float',
				'unit': 'ul',
				'min': 0,
				'max': 1000,
				'default': 0,
				'applies_to': 'subpart',
				'description': 'Volume in this tube.',
			},
		],
		'visual_states': {
			'material_name': {
				'kind': 'svg',
				'applies_to': 'subpart',
				'cases': [
					{'when': 'empty', 'output': {'asset_name': 'tube_rack'}},
				],
			},
			'material_volume': {
				'kind': 'composite',
				'applies_to': 'subpart',
				'formula': 'fill_height(state(material_volume), capacity_ul=1000)',
			},
		},
		'capabilities': ['clickable', 'structured_surface', 'material_container'],
		'layout': {'default_width': 8, 'label_width': 6},
	}
	findings = validator.validate(obj, 'content/objects/rack/test_tube_rack.yaml')
	# D6 rule must not fire for subpart_kind: tube
	d6_errors = [
		f for f in findings
		if f.severity == Severity.ERROR and 'subpart_kind: well' in f.message
	]
	assert not d6_errors, f"D6 rule incorrectly fired for tube rack: {[f.message for f in d6_errors]}"
