"""
test_scene_yaml_validator.py - Validator tests for scene YAML configuration.

Fixtures prove classes of validation behavior, not the cartesian product of
fields and failure modes.

Tests the scene YAML schema enforcement:
- Required and optional fields match the documented schema
- Cross-references to SVG assets, inventory, and zones are validated
- Malformed YAML fails with useful error messages
- Valid YAML loads cleanly

The validator is reused from tools/build_scene_data.py to ensure the test
suite and the build pipeline enforce the same rules (single source of truth).
"""

import sys
import os
import pathlib

import pytest

# Get repo root for importing modules and finding fixtures
import git_file_utils
REPO_ROOT = git_file_utils.get_repo_root()

# Add tools to path so we can import the validator from build_scene_data
sys.path.insert(0, os.path.join(REPO_ROOT, 'tools'))
from build_scene_data import validate_scene_yaml, VALID_CAPABILITY_IDS


# ============================================
# Cross-reference extractors
# ============================================

def extract_svg_ids() -> set:
	"""
	Extract SVG asset keys from generated/svg_manifest.ts.
	Returns a set of SVG asset identifiers that are valid svgAsset values.
	"""
	svg_manifest_path = pathlib.Path(REPO_ROOT) / 'generated' / 'svg_manifest.ts'
	if not svg_manifest_path.exists():
		pytest.skip("generated/svg_manifest.ts not found; bootstrap required")

	content = svg_manifest_path.read_text()

	# Parse the SVG_IDS export. Extract keys from:
	# export const SVG_IDS: Record<string, readonly string[]> = {
	#   "asset_name": [...],
	#   ...
	# };
	import re
	pattern = r'"([a-z_0-9]+)":\s*\['
	matches = re.findall(pattern, content)
	return set(matches)


def extract_reagent_ids() -> set:
	"""
	Extract inventory item ids from generated/inventory_data.ts.
	Returns a set of EQUIPMENT and REAGENTS keys that are valid inventoryRef values.
	The inventoryRef field can point to either equipment items or reagents.
	"""
	inventory_path = pathlib.Path(REPO_ROOT) / 'generated' / 'inventory_data.ts'
	if not inventory_path.exists():
		pytest.skip("generated/inventory_data.ts not found; bootstrap required")

	content = inventory_path.read_text()

	# Parse both EQUIPMENT and REAGENTS exports.
	import re
	item_ids = set()

	# Extract EQUIPMENT keys from: export const EQUIPMENT: Record<string, InventoryItem> = {
	equipment_match = re.search(r'export const EQUIPMENT:.*?\{(.*?)\};', content, re.DOTALL)
	if equipment_match:
		equipment_block = equipment_match.group(1)
		# Match pattern like "item_key":{
		pattern = r'([a-z_0-9]+):\s*\{'
		matches = re.findall(pattern, equipment_block)
		item_ids.update(matches)

	# Extract REAGENTS keys from: export const REAGENTS: Record<string, InventoryReagent> = {
	reagents_match = re.search(r'export const REAGENTS:.*?\{(.*?)\};', content, re.DOTALL)
	if reagents_match:
		reagents_block = reagents_match.group(1)
		pattern = r'([a-z_0-9]+):\s*\{'
		matches = re.findall(pattern, reagents_block)
		item_ids.update(matches)

	return item_ids


# ============================================
# Fixtures
# ============================================

@pytest.fixture
def valid_fixtures_dir():
	"""Return the path to valid fixture YAML files."""
	return pathlib.Path(REPO_ROOT) / 'tests' / 'fixtures' / 'scene_yaml_valid'


@pytest.fixture
def malformed_fixtures_dir():
	"""Return the path to malformed fixture YAML files."""
	return pathlib.Path(REPO_ROOT) / 'tests' / 'fixtures' / 'scene_yaml_malformed'


@pytest.fixture
def svg_ids():
	"""Cache extracted SVG asset ids."""
	return extract_svg_ids()


@pytest.fixture
def reagent_ids():
	"""Cache extracted reagent ids."""
	return extract_reagent_ids()


# ============================================
# Valid fixture tests
# ============================================

class TestValidFixtures:
	"""Test that all valid fixtures pass validation."""

	@pytest.mark.parametrize(
		'fixture_file',
		[
			'layout_engine_scene.yaml',
			'modal_dispatch_scene.yaml',
			'render_only_modal_scene.yaml',
			'with_optional_layout.yaml',
		],
	)
	def test_valid_yaml_loads_cleanly(self, valid_fixtures_dir, fixture_file):
		"""Test that valid YAML files pass validation without error."""
		fixture_path = valid_fixtures_dir / fixture_file
		assert fixture_path.exists(), f"Fixture {fixture_file} not found"

		# validate_scene_yaml should not raise; if it does, the test fails
		config = validate_scene_yaml(fixture_path)
		assert config is not None
		assert isinstance(config, dict)


# ============================================
# Malformed fixture tests
# ============================================

class TestMalformedFixtures:
	"""Test that malformed fixtures fail validation with useful errors."""

	@pytest.mark.parametrize(
		'fixture_file,expected_error_substr',
		[
			('missing_scene_id.yaml', "sceneId"),
			('missing_workspace.yaml', "workspace"),
			('missing_capabilities.yaml', "capabilities"),
			('unknown_capability.yaml', "unknown capability"),
			('duplicate_item_id.yaml', "duplicate item id"),
			('duplicate_zone_id.yaml', "duplicate zone id"),
			('item_refs_unknown_zone.yaml', "unknown zone"),
			('invalid_depth_tier.yaml', "depthTier"),
			('scene_bounds_missing_left.yaml', "sceneBounds.left"),
		],
	)
	def test_malformed_yaml_fails_validation(
		self,
		malformed_fixtures_dir,
		fixture_file,
		expected_error_substr,
	):
		"""Test that malformed YAML fails validation with expected error message."""
		fixture_path = malformed_fixtures_dir / fixture_file
		assert fixture_path.exists(), f"Fixture {fixture_file} not found"

		with pytest.raises(ValueError) as exc_info:
			validate_scene_yaml(fixture_path)

		error_message = str(exc_info.value).lower()
		assert expected_error_substr.lower() in error_message, (
			f"Expected error message to contain '{expected_error_substr}', "
			f"but got: {exc_info.value}"
		)


# ============================================
# Cross-reference validation tests
# ============================================

class TestSvgAssetCrossReferences:
	"""Test validation of svgAsset cross-references against SVG manifest."""


	def test_valid_svg_assets_exist(self, valid_fixtures_dir, svg_ids):
		"""Test that valid fixtures only use known SVG assets."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'items' in config:
				for item in config['items']:
					if 'svgAsset' in item:
						svg_asset = item['svgAsset']
						assert svg_asset in svg_ids, (
							f"Fixture {fixture_file.name}: item '{item.get('id')}' "
							f"references unknown svgAsset '{svg_asset}'"
						)


class TestInventoryRefCrossReferences:
	"""Test validation of inventoryRef cross-references against inventory."""


	def test_valid_inventory_refs_exist(self, valid_fixtures_dir, reagent_ids):
		"""Test that valid fixtures only use known inventoryRef values."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'items' in config:
				for item in config['items']:
					if 'inventoryRef' in item:
						inv_ref = item['inventoryRef']
						assert inv_ref in reagent_ids, (
							f"Fixture {fixture_file.name}: item '{item.get('id')}' "
							f"references unknown inventoryRef '{inv_ref}'"
						)


class TestZoneCrossReferences:
	"""Test validation of zone references within scene YAML."""

	def test_item_zone_references_valid(self, valid_fixtures_dir):
		"""Test that all item zone references point to declared zones."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			# Collect zone ids
			zone_ids = set()
			if 'zones' in config:
				for zone in config['zones']:
					zone_ids.add(zone['id'])

			# Check that all item zone references are valid
			if 'items' in config:
				for item in config['items']:
					if 'zone' in item:
						zone_ref = item['zone']
						assert zone_ref in zone_ids, (
							f"Fixture {fixture_file.name}: item '{item.get('id')}' "
							f"references unknown zone '{zone_ref}'"
						)


# ============================================
# Schema field validation tests
# ============================================

class TestSchemaFieldValidation:
	"""Test that schema fields are correctly validated."""

	def test_required_top_level_fields(self, valid_fixtures_dir):
		"""Test that all valid configs have required top-level fields."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			assert 'sceneId' in config
			assert 'workspace' in config
			assert 'capabilities' in config

	def test_zone_fields(self, valid_fixtures_dir):
		"""Test that zones have all required fields."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'zones' in config:
				for zone in config['zones']:
					assert 'id' in zone
					assert 'x0' in zone
					assert 'x1' in zone
					assert 'baseline' in zone
					assert 'gap' in zone
					assert 'align' in zone

	def test_layout_item_fields(self, valid_fixtures_dir):
		"""Test that layout items have required fields when present."""
		# This is less strict since items can be either LayoutSceneItem or
		# DispatchOnlySceneItem. We just verify that basic validation passes.
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'items' in config:
				for item in config['items']:
					# All items must have id and label
					assert 'id' in item
					assert 'label' in item

	def test_layout_rules_fields_when_present(self, valid_fixtures_dir):
		"""Test that layoutRules fields have correct types when present."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'layoutRules' in config:
				lr = config['layoutRules']
				assert isinstance(lr, dict)
				# Optional fields should have correct types if present
				if 'clusterSpacingPx' in lr:
					assert isinstance(lr['clusterSpacingPx'], int)
				if 'tierBrightnessFactor' in lr:
					assert isinstance(lr['tierBrightnessFactor'], dict)
				if 'defaultAlignStop' in lr:
					assert lr['defaultAlignStop'] in ('left', 'center', 'right')

	def test_accent_rules_structure(self, valid_fixtures_dir):
		"""Test that accentRules have correct structure when present."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			if 'accentRules' in config:
				ar = config['accentRules']
				assert isinstance(ar, dict)
				for key, value in ar.items():
					assert isinstance(value, dict)
					for field in value:
						assert field in ('stroke', 'fill', 'pattern')
						assert isinstance(value[field], str)

	def test_capability_ids_are_known(self, valid_fixtures_dir):
		"""Test that all declared capability ids are in the valid set."""
		for fixture_file in valid_fixtures_dir.glob('*.yaml'):
			config = validate_scene_yaml(fixture_file)
			for cap_id in config['capabilities']:
				assert cap_id in VALID_CAPABILITY_IDS, (
					f"Fixture {fixture_file.name}: unknown capability '{cap_id}'"
				)


# ============================================
# Regression tests
# ============================================

class TestActualSceneYamls:
	"""Test that actual production scene YAMLs pass validation."""

	def test_bench_scene_validates(self):
		"""Test that the bench scene YAML validates."""
		bench_path = pathlib.Path(REPO_ROOT) / 'src' / 'scenes' / 'bench' / 'bench.yaml'
		if not bench_path.exists():
			pytest.skip("bench.yaml not found")
		config = validate_scene_yaml(bench_path)
		assert config is not None

	def test_microscope_scene_validates(self):
		"""Test that the microscope scene YAML validates."""
		microscope_path = pathlib.Path(REPO_ROOT) / 'src' / 'scenes' / 'microscope' / 'microscope.yaml'
		if not microscope_path.exists():
			pytest.skip("microscope.yaml not found")
		config = validate_scene_yaml(microscope_path)
		assert config is not None

	def test_incubator_scene_validates(self):
		"""Test that the incubator scene YAML validates."""
		incubator_path = pathlib.Path(REPO_ROOT) / 'src' / 'scenes' / 'incubator' / 'incubator.yaml'
		if not incubator_path.exists():
			pytest.skip("incubator.yaml not found")
		config = validate_scene_yaml(incubator_path)
		assert config is not None
