"""
Pytest gate for scene runtime loader validation functions (WP-SPINE-4).

Tests the validation functions from tools/build_protocol_data.py:
- validate_protocol_contract(protocol, protocol_name)
- validate_completion_path_kinds(step)
- check_no_typescript_identifiers(obj, path)

Covers happy path cases and schema-violation cases without reading real YAML files.
Real YAML parsing is covered by existing pytest gates.
"""

import sys
import pathlib
import pytest

import git_file_utils


#============================================
def _import_build_tool():
	"""
	Import build_protocol_data module from tools/ directory.

	Returns the module object so tests can call validation functions.
	"""
	repo_root = git_file_utils.get_repo_root()
	tools_dir = pathlib.Path(repo_root) / "tools"
	sys.path.insert(0, str(tools_dir))

	import build_protocol_data
	return build_protocol_data


#============================================
class TestValidateProtocolContract:
	"""
	Test validate_protocol_contract(protocol, protocol_name).

	Validates that entry.scene and entry.step exist and match first step
	for mini_protocol, and that sequence_runner has non-empty sequence field.
	"""

	def test_happy_path_mini_protocol_valid_entry(self):
		"""
		Valid mini_protocol with entry.scene and entry.step matching first step.

		Should not raise.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"entry": {
				"scene": "bench",
				"step": "step_001",
			},
			"steps": [
				{
					"id": "step_001",
					"scene": "bench",
					"label": "Load tube",
					"action": "place",
					"why": "For testing",
					"partId": "part_1",
					"dayId": "day_1",
					"stepIndex": 0,
					"requiredItems": [],
					"nextId": "step_002",
				},
				{
					"id": "step_002",
					"scene": "bench",
					"label": "Next step",
					"action": "wait",
					"why": "Testing",
					"partId": "part_1",
					"dayId": "day_1",
					"stepIndex": 1,
					"requiredItems": [],
					"nextId": None,
				},
			],
		}

		# Should not raise
		build_protocol_data.validate_protocol_contract(protocol, "test_protocol")

	def test_missing_entry_key(self):
		"""
		Protocol missing 'entry' key should raise ValueError.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"steps": [
				{
					"id": "step_001",
					"scene": "bench",
					"label": "Test",
					"action": "place",
					"why": "Testing",
					"partId": "part_1",
					"dayId": "day_1",
					"stepIndex": 0,
					"requiredItems": [],
					"nextId": None,
				},
			],
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_protocol_contract(protocol, "no_entry")

		assert "missing 'entry'" in str(exc_info.value)

	def test_entry_scene_mismatch(self):
		"""
		entry.scene does not match first step's scene should raise.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"entry": {
				"scene": "cell_culture_hood",
				"step": "step_001",
			},
			"steps": [
				{
					"id": "step_001",
					"scene": "bench",
					"label": "Test",
					"action": "place",
					"why": "Testing",
					"partId": "part_1",
					"dayId": "day_1",
					"stepIndex": 0,
					"requiredItems": [],
					"nextId": None,
				},
			],
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_protocol_contract(protocol, "scene_mismatch")

		assert "entry.scene" in str(exc_info.value)
		assert "does not match" in str(exc_info.value)

	def test_entry_step_mismatch(self):
		"""
		entry.step does not match first step's id should raise.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"entry": {
				"scene": "bench",
				"step": "wrong_step_id",
			},
			"steps": [
				{
					"id": "step_001",
					"scene": "bench",
					"label": "Test",
					"action": "place",
					"why": "Testing",
					"partId": "part_1",
					"dayId": "day_1",
					"stepIndex": 0,
					"requiredItems": [],
					"nextId": None,
				},
			],
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_protocol_contract(protocol, "step_mismatch")

		assert "entry.step" in str(exc_info.value)
		assert "does not match" in str(exc_info.value)

	def test_sequence_runner_valid(self):
		"""
		Valid sequence_runner with 'sequence' field should pass.

		sequence_runner entry validation is deferred to runtime.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"entry": {
				"scene": "bench",
				"step": "some_step",
			},
			"sequence": [
				{"ref": "protocol_1"},
				{"ref": "protocol_2"},
			],
		}

		# Should not raise
		build_protocol_data.validate_protocol_contract(protocol, "seq_runner")

	def test_sequence_runner_empty_sequence(self):
		"""
		sequence_runner with empty 'sequence' list should raise.
		"""
		build_protocol_data = _import_build_tool()

		protocol = {
			"entry": {
				"scene": "bench",
				"step": "some_step",
			},
			"sequence": [],
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_protocol_contract(protocol, "seq_empty")

		assert "sequence" in str(exc_info.value)


#============================================
class TestValidateCompletionPathKinds:
	"""
	Test validate_completion_path_kinds(step).

	Validates that completionPath.kind is one of the valid contract values.
	"""

	def test_happy_path_valid_kinds(self):
		"""
		Step with valid completionPath.kind values should not raise.

		Valid kinds: 'interactionSequence', 'directTool', 'modal', 'multipleChoice'.
		"""
		build_protocol_data = _import_build_tool()

		valid_kinds = ["interactionSequence", "directTool", "modal", "multipleChoice"]

		for kind in valid_kinds:
			step = {
				"id": f"step_with_{kind}",
				"completionPath": {
					"kind": kind,
					"someOtherField": "value",
				},
			}

			# Should not raise
			build_protocol_data.validate_completion_path_kinds(step)

	def test_no_completion_path(self):
		"""
		Step without 'completionPath' key should not raise.

		completionPath is optional; if absent, validation skips.
		"""
		build_protocol_data = _import_build_tool()

		step = {
			"id": "step_no_cp",
		}

		# Should not raise
		build_protocol_data.validate_completion_path_kinds(step)

	def test_invalid_completion_path_kind(self):
		"""
		completionPath.kind with invalid value should raise.
		"""
		build_protocol_data = _import_build_tool()

		step = {
			"id": "step_bad_kind",
			"completionPath": {
				"kind": "bogus",
			},
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_completion_path_kinds(step)

		assert "completionPath.kind" in str(exc_info.value)
		assert "bogus" in str(exc_info.value)

	def test_completion_path_kind_missing(self):
		"""
		completionPath without 'kind' key should raise.
		"""
		build_protocol_data = _import_build_tool()

		step = {
			"id": "step_cp_no_kind",
			"completionPath": {
				"someField": "value",
			},
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.validate_completion_path_kinds(step)

		assert "completionPath.kind" in str(exc_info.value)
		assert "required" in str(exc_info.value)


#============================================
class TestCheckNoTypeScriptIdentifiers:
	"""
	Test check_no_typescript_identifiers(obj, path).

	Validates that object does not contain TypeScript patterns:
	${...}, import, require, function.
	"""

	def test_happy_path_clean_strings(self):
		"""
		Object with clean strings should not raise.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"label": "Add reagent",
			"description": "Mix the samples",
			"nested": {
				"value": "No special characters here",
				"list": [
					"item1",
					"item2",
				],
			},
		}

		# Should not raise
		build_protocol_data.check_no_typescript_identifiers(obj)

	def test_template_literal_pattern(self):
		"""
		String containing ${...} pattern should raise.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"label": "Add ${variable} reagent",
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		assert "template literal" in str(exc_info.value)
		assert "label" in str(exc_info.value)

	def test_import_statement_pattern(self):
		"""
		String containing 'import ' keyword should raise.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"description": "import { something } from module",
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		assert "import statement" in str(exc_info.value)

	def test_require_pattern(self):
		"""
		String containing 'require(' call should raise.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"note": "require('module-name')",
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		assert "require() call" in str(exc_info.value)

	def test_function_declaration_pattern(self):
		"""
		String containing 'function ' keyword should raise.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"code": "function doSomething() { }",
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		assert "function declaration" in str(exc_info.value)

	def test_nested_forbidden_pattern(self):
		"""
		Forbidden pattern in nested dict/list should raise with correct path.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"nested": {
				"steps": [
					{"id": "step_1", "label": "First"},
					{"id": "step_2", "label": "import bad stuff"},
				],
			},
		}

		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		assert "import statement" in str(exc_info.value)
		# Path should identify the nested location
		assert "nested" in str(exc_info.value)

	def test_word_boundary_prevents_false_positive(self):
		"""
		Word 'import' in middle of other word should not match.

		The regex uses \\b for word boundary, so 'imported' should not trigger.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"label": "The imported reagent",
		}

		# Should not raise because 'imported' is not a bare 'import ' statement
		build_protocol_data.check_no_typescript_identifiers(obj)

	def test_all_patterns_in_single_object(self):
		"""
		Object with multiple forbidden patterns should raise on first match.

		Only the first encountered pattern raises; rest are not checked.
		"""
		build_protocol_data = _import_build_tool()

		obj = {
			"field1": "import x from y",
			"field2": "function test() {}",
		}

		# Should raise on 'import' (dict iteration order)
		with pytest.raises(ValueError) as exc_info:
			build_protocol_data.check_no_typescript_identifiers(obj)

		# Either import or function is acceptable, depending on iteration
		error_str = str(exc_info.value)
		assert ("import statement" in error_str or "function declaration" in error_str)


#============================================
def test_all_imports_resolve():
	"""
	Smoke test to ensure build_protocol_data module can be imported and has all functions.

	Verifies that the validation functions exist and are callable.
	"""
	build_protocol_data = _import_build_tool()

	# Check that all three validation functions exist
	assert hasattr(build_protocol_data, "validate_protocol_contract")
	assert callable(build_protocol_data.validate_protocol_contract)

	assert hasattr(build_protocol_data, "validate_completion_path_kinds")
	assert callable(build_protocol_data.validate_completion_path_kinds)

	assert hasattr(build_protocol_data, "check_no_typescript_identifiers")
	assert callable(build_protocol_data.check_no_typescript_identifiers)
