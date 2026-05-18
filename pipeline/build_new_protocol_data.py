#!/usr/bin/env python3
"""
Build new-vocabulary protocol data from content/protocols YAML source.

Emits generated/protocol_data.ts with PROTOCOL_CATALOG keyed by protocol_name.
Materials are inlined per protocol. No environment-specific helpers (getRequestedProtocolId, etc.);
those belong in the browser runtime entry point.

Validates against new closed vocabulary: protocol_type, entry_step, learning block (for
mini_protocol), steps, interactions, gestures, validators, and scene operations.
"""

import sys
from pathlib import Path
from typing import Any

import yaml

from pipeline.pipeline_utils import REPO_ROOT, find_protocol_yaml_files


#============================================
# Type aliases and validation constants
#============================================

ALLOWED_PROTOCOL_TYPES = {"mini_protocol", "sequence_runner", "dev_smoke"}
ALLOWED_GESTURES = {"click", "drag", "adjust", "select", "type"}
ALLOWED_SCENE_OPERATION_TYPES = {
	"ObjectStateChange",
	"CursorAttach",
	"SceneChange",
	"LayoutMove",
	"TimedWait",
}
ALLOWED_VALIDATOR_PRESETS = {"correct_target", "correct_choice", "target_with_value"}
ALLOWED_STEP_VALIDATOR_PRESETS = {"sequence_complete", "final_state_matches"}
ALLOWED_OUTCOME_ON_SUCCESS = {"complete"}
ALLOWED_OUTCOME_ON_FAILURE = {"retry"}


#============================================
# Discovery and loading
#============================================

def discover_protocol_yamls() -> list[Path]:
	"""
	Find all protocol.yaml files under content/protocols/ (skip dev_smoke under tests/).

	Returns:
		Sorted list of absolute Path objects to protocol.yaml files.
	"""
	protocols_dir = REPO_ROOT / "content" / "protocols"
	if not protocols_dir.exists():
		return []

	protocol_files = []
	for protocol_yaml in find_protocol_yaml_files(protocols_dir):
		# Skip any protocol under tests/content/dev_smoke/
		if "tests/content/dev_smoke" not in str(protocol_yaml):
			protocol_files.append(protocol_yaml)

	return sorted(protocol_files)


def load_yaml_file(path: Path) -> dict:
	"""
	Load YAML file. Raise RuntimeError on parse failure or if file is not a dict.

	Args:
		path: Absolute path to YAML file.

	Returns:
		Parsed dict.

	Raises:
		RuntimeError: On YAML parse error or if parsed value is not a dict.
	"""
	try:
		with open(path, 'r', encoding='utf-8') as f:
			data = yaml.safe_load(f)
	except yaml.YAMLError as e:
		raise RuntimeError(f"Failed to parse YAML {path}: {e}")

	if not isinstance(data, dict):
		raise RuntimeError(f"YAML {path} did not parse to a dict")

	return data


#============================================
# Validation functions
#============================================

def validate_protocol_type(value: str) -> None:
	"""
	Validate protocol_type field.

	Args:
		value: The protocol_type value.

	Raises:
		RuntimeError: If value not in ALLOWED_PROTOCOL_TYPES.
	"""
	if value not in ALLOWED_PROTOCOL_TYPES:
		raise RuntimeError(
			f"protocol_type must be one of {ALLOWED_PROTOCOL_TYPES}, got '{value}'"
		)


def validate_learning_block(learning: Any, protocol_type: str) -> None:
	"""
	Validate learning block. Required for mini_protocol; optional for dev_smoke.

	Args:
		learning: The learning block from protocol YAML.
		protocol_type: The protocol_type field.

	Raises:
		RuntimeError: If required for type but missing or invalid.
	"""
	if protocol_type == "mini_protocol":
		if not isinstance(learning, dict):
			raise RuntimeError(
				"learning block is required for mini_protocol and must be a dict"
			)

		required_keys = {"objectives", "outcomes", "goals"}
		present_keys = set(learning.keys())
		missing = required_keys - present_keys

		if missing:
			raise RuntimeError(
				f"learning block missing required keys: {missing}"
			)

		for key in required_keys:
			if not isinstance(learning[key], str):
				raise RuntimeError(
					f"learning.{key} must be a string, got {type(learning[key]).__name__}"
				)


def validate_gesture(gesture: str) -> None:
	"""
	Validate gesture field.

	Args:
		gesture: The gesture value.

	Raises:
		RuntimeError: If gesture not in ALLOWED_GESTURES.
	"""
	if gesture not in ALLOWED_GESTURES:
		raise RuntimeError(
			f"gesture must be one of {ALLOWED_GESTURES}, got '{gesture}'"
		)


def validate_validator_preset(validator: Any) -> None:
	"""
	Validate interaction validator preset.

	Args:
		validator: The validator dict from interaction.

	Raises:
		RuntimeError: If validator invalid.
	"""
	if not isinstance(validator, dict):
		raise RuntimeError("validator must be a dict")

	if "preset" not in validator:
		raise RuntimeError("validator must have a 'preset' field")

	preset = validator["preset"]
	if preset not in ALLOWED_VALIDATOR_PRESETS:
		raise RuntimeError(
			f"validator.preset must be one of {ALLOWED_VALIDATOR_PRESETS}, "
			f"got '{preset}'"
		)

	if preset == "target_with_value" and "value" not in validator:
		raise RuntimeError(
			"validator preset 'target_with_value' requires a 'value' field"
		)


def validate_step_validator_preset(step_validator: Any) -> None:
	"""
	Validate step validator preset.

	Args:
		step_validator: The step_validator dict from step.

	Raises:
		RuntimeError: If step_validator invalid.
	"""
	if not isinstance(step_validator, dict):
		raise RuntimeError("step_validator must be a dict")

	if "preset" not in step_validator:
		raise RuntimeError("step_validator must have a 'preset' field")

	preset = step_validator["preset"]
	if preset not in ALLOWED_STEP_VALIDATOR_PRESETS:
		raise RuntimeError(
			f"step_validator.preset must be one of {ALLOWED_STEP_VALIDATOR_PRESETS}, "
			f"got '{preset}'"
		)


def validate_scene_operation(op: Any) -> None:
	"""
	Validate a single scene operation.

	Args:
		op: The scene operation dict.

	Raises:
		RuntimeError: If operation invalid.
	"""
	if not isinstance(op, dict):
		raise RuntimeError("scene_operation must be a dict")

	if "type" not in op:
		raise RuntimeError("scene_operation must have a 'type' field")

	op_type = op["type"]
	if op_type not in ALLOWED_SCENE_OPERATION_TYPES:
		raise RuntimeError(
			f"scene_operation.type must be one of {ALLOWED_SCENE_OPERATION_TYPES}, "
			f"got '{op_type}'"
		)


def validate_outcome(outcome: Any) -> None:
	"""
	Validate outcome field.

	Args:
		outcome: The outcome dict from step.

	Raises:
		RuntimeError: If outcome invalid.
	"""
	if not isinstance(outcome, dict):
		raise RuntimeError("outcome must be a dict")

	required_keys = {"on_success", "on_failure"}
	present_keys = set(outcome.keys())
	missing = required_keys - present_keys

	if missing:
		raise RuntimeError(
			f"outcome missing required keys: {missing}"
		)

	if outcome["on_success"] not in ALLOWED_OUTCOME_ON_SUCCESS:
		raise RuntimeError(
			f"outcome.on_success must be one of {ALLOWED_OUTCOME_ON_SUCCESS}, "
			f"got '{outcome['on_success']}'"
		)

	if outcome["on_failure"] not in ALLOWED_OUTCOME_ON_FAILURE:
		raise RuntimeError(
			f"outcome.on_failure must be one of {ALLOWED_OUTCOME_ON_FAILURE}, "
			f"got '{outcome['on_failure']}'"
		)


def validate_interaction(interaction: Any) -> None:
	"""
	Validate a single interaction in a step sequence.

	Args:
		interaction: The interaction dict.

	Raises:
		RuntimeError: If interaction invalid.
	"""
	if not isinstance(interaction, dict):
		raise RuntimeError("interaction must be a dict")

	required_keys = {"target", "gesture", "validator", "response"}
	present_keys = set(interaction.keys())
	missing = required_keys - present_keys

	if missing:
		raise RuntimeError(
			f"interaction missing required keys: {missing}"
		)

	if not isinstance(interaction["target"], str):
		raise RuntimeError("interaction.target must be a string")

	validate_gesture(interaction["gesture"])
	validate_validator_preset(interaction["validator"])

	# Validate response
	response = interaction["response"]
	if not isinstance(response, dict):
		raise RuntimeError("interaction.response must be a dict")

	if "scene_operations" not in response:
		raise RuntimeError("response must have a 'scene_operations' field")

	scene_ops = response["scene_operations"]
	if not isinstance(scene_ops, list):
		raise RuntimeError("response.scene_operations must be a list")

	for op in scene_ops:
		validate_scene_operation(op)


def validate_step(step: Any, protocol_name: str) -> None:
	"""
	Validate a single step.

	Args:
		step: The step dict.
		protocol_name: The protocol name (for error messages).

	Raises:
		RuntimeError: If step invalid.
	"""
	if not isinstance(step, dict):
		raise RuntimeError(f"step in {protocol_name} must be a dict")

	required_keys = {"step_name", "prompt", "sequence", "step_validator", "outcome", "next_step"}
	present_keys = set(step.keys())
	missing = required_keys - present_keys

	if missing:
		raise RuntimeError(
			f"step in {protocol_name} missing required keys: {missing}"
		)

	if not isinstance(step["step_name"], str):
		raise RuntimeError("step.step_name must be a string")

	if not isinstance(step["prompt"], str):
		raise RuntimeError("step.prompt must be a string")

	# Validate sequence
	sequence = step["sequence"]
	if not isinstance(sequence, list):
		raise RuntimeError("step.sequence must be a list")

	for interaction in sequence:
		validate_interaction(interaction)

	validate_step_validator_preset(step["step_validator"])
	validate_outcome(step["outcome"])

	# next_step can be string or null
	next_step = step["next_step"]
	if next_step is not None and not isinstance(next_step, str):
		raise RuntimeError("step.next_step must be a string or null")


def validate_steps_list(steps: Any, protocol_name: str) -> None:
	"""
	Validate the steps list in a protocol.

	Args:
		steps: The steps list from protocol YAML.
		protocol_name: The protocol name (for error messages).

	Raises:
		RuntimeError: If steps invalid.
	"""
	if not isinstance(steps, list):
		raise RuntimeError(f"steps in {protocol_name} must be a list")

	if not steps:
		raise RuntimeError(f"steps in {protocol_name} must not be empty")

	for step in steps:
		validate_step(step, protocol_name)


def validate_materials(materials: Any, protocol_name: str) -> None:
	"""
	Validate materials dict (if present).

	Args:
		materials: The materials dict from materials.yaml.
		protocol_name: The protocol name (for error messages).

	Raises:
		RuntimeError: If materials invalid.
	"""
	if not isinstance(materials, dict):
		raise RuntimeError(f"materials in {protocol_name} must be a dict")

	for material_id, material_config in materials.items():
		if not isinstance(material_config, dict):
			raise RuntimeError(
				f"material '{material_id}' in {protocol_name} must be a dict"
			)

		required_keys = {"label", "display_color"}
		present_keys = set(material_config.keys())
		missing = required_keys - present_keys

		if missing:
			raise RuntimeError(
				f"material '{material_id}' in {protocol_name} missing keys: {missing}"
			)

		if not isinstance(material_config["label"], str):
			raise RuntimeError(
				f"material '{material_id}' label must be a string"
			)

		display_color = material_config["display_color"]
		if not isinstance(display_color, dict):
			raise RuntimeError(
				f"material '{material_id}' display_color must be a dict"
			)

		color_keys = set(display_color.keys())
		if color_keys != {"light", "dark"}:
			raise RuntimeError(
				f"material '{material_id}' display_color must have 'light' and 'dark' keys"
			)


#============================================
# Protocol validation and normalization
#============================================

def validate_protocol_yaml(protocol_data: dict, protocol_path: Path) -> None:
	"""
	Validate protocol YAML against new vocabulary.

	Args:
		protocol_data: Parsed protocol.yaml as dict.
		protocol_path: Path to protocol.yaml (for error messages).

	Raises:
		RuntimeError: If validation fails.
	"""
	protocol_name = protocol_path.parent.name

	# Check required top-level fields
	required_keys = {"protocol_type", "protocol_name", "entry_step"}
	present_keys = set(protocol_data.keys())
	missing = required_keys - present_keys

	if missing:
		raise RuntimeError(
			f"protocol {protocol_name}: missing required keys: {missing}"
		)

	# Validate protocol_type
	protocol_type = protocol_data["protocol_type"]
	validate_protocol_type(protocol_type)

	# Validate protocol_name matches directory name
	if protocol_data["protocol_name"] != protocol_name:
		raise RuntimeError(
			f"protocol.yaml protocol_name '{protocol_data['protocol_name']}' "
			f"does not match directory name '{protocol_name}'"
		)

	# entry_step must be a string
	if not isinstance(protocol_data["entry_step"], str):
		raise RuntimeError(
			f"protocol {protocol_name}: entry_step must be a string"
		)

	# Validate learning block (required for mini_protocol)
	learning = protocol_data.get("learning")
	validate_learning_block(learning, protocol_type)

	# For mini_protocol and dev_smoke, validate steps
	# sequence_runner does not have steps; it has mini_protocols instead
	if protocol_type in {"mini_protocol", "dev_smoke"}:
		if "steps" not in protocol_data:
			raise RuntimeError(
				f"protocol {protocol_name} ({protocol_type}): steps field required"
			)
		validate_steps_list(protocol_data["steps"], protocol_name)

		# Validate that entry_step references a defined step
		entry_step = protocol_data["entry_step"]
		step_names = {step["step_name"] for step in protocol_data["steps"]}
		if entry_step not in step_names:
			raise RuntimeError(
				f"protocol {protocol_name}: entry_step '{entry_step}' does not "
				f"match any step_name in steps list"
			)
	elif protocol_type == "sequence_runner":
		# sequence_runner does not have authored steps; it may have mini_protocols
		# (not required for this builder to validate; TypeScript will handle it)
		pass


#============================================
# Data transformation to TypeScript types
#============================================

def transform_protocol_to_ts(protocol_data: dict, materials: dict) -> dict:
	"""
	Transform validated protocol and materials to TypeScript ProtocolConfig shape.

	Args:
		protocol_data: Parsed protocol.yaml.
		materials: Parsed materials.yaml (or empty dict if absent).

	Returns:
		Dict matching ProtocolConfig TypeScript interface.
	"""
	result = {
		"protocol_type": protocol_data["protocol_type"],
		"protocol_name": protocol_data["protocol_name"],
		"entry_step": protocol_data["entry_step"],
		"steps": protocol_data.get("steps", []),
		"materials": materials,
	}

	# learning is optional; include only if present
	if "learning" in protocol_data:
		result["learning"] = protocol_data["learning"]

	return result


#============================================
# TypeScript code generation
#============================================

def dict_to_ts_literal(value: Any, indent: int = 0) -> str:
	"""
	Convert a Python dict (or other value) to TypeScript literal syntax.

	Handles nested dicts, lists, strings, numbers, bools, and None.
	Indentation uses tabs.

	Args:
		value: Python value to convert.
		indent: Indentation level (number of tabs).

	Returns:
		TypeScript literal string.
	"""
	tab = "\t" * indent

	if value is None:
		return "null"
	elif isinstance(value, bool):
		return "true" if value else "false"
	elif isinstance(value, (int, float)):
		return str(value)
	elif isinstance(value, str):
		# Escape single quotes and newlines
		escaped = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
		return f"'{escaped}'"
	elif isinstance(value, dict):
		if not value:
			return "{}"
		lines = ["{"]
		for key, val in value.items():
			val_str = dict_to_ts_literal(val, indent + 1)
			lines.append(f"{tab}\t{key}: {val_str},")
		lines.append(f"{tab}}}")
		return "\n".join(lines)
	elif isinstance(value, list):
		if not value:
			return "[]"
		lines = ["["]
		for item in value:
			item_str = dict_to_ts_literal(item, indent + 1)
			lines.append(f"{tab}\t{item_str},")
		lines.append(f"{tab}]")
		return "\n".join(lines)
	else:
		# Fallback for unknown types
		return str(value)


def generate_ts_file(protocols_data: dict[str, dict]) -> str:
	"""
	Generate the full TypeScript protocol_data.ts file content.

	Args:
		protocols_data: Dict of protocol_name -> ProtocolConfig dict.

	Returns:
		Full TypeScript file content as string.
	"""
	lines = [
		"// AUTO-GENERATED from content/protocols/ YAML source.",
		"// Do not edit by hand; regenerate with pipeline/build_new_protocol_data.py",
		"",
		"import type { ProtocolConfig } from '../src/scene_runtime/types';",
		"",
		"export const PROTOCOL_CATALOG: Record<string, ProtocolConfig> = {",
	]

	# Emit each protocol
	for protocol_name in sorted(protocols_data.keys()):
		protocol = protocols_data[protocol_name]
		protocol_ts = dict_to_ts_literal(protocol, indent=1)
		lines.append(f"\t{protocol_name}: {protocol_ts},")

	lines.append("};")
	lines.append("")

	return "\n".join(lines)


#============================================
# Main build logic
#============================================

def build_protocol_catalog() -> dict[str, dict]:
	"""
	Discover, load, validate, and transform all protocols in content/protocols/.

	Returns:
		Dict of protocol_name -> ProtocolConfig dict.

	Raises:
		RuntimeError: On any validation failure.
	"""
	protocol_yaml_files = discover_protocol_yamls()

	if not protocol_yaml_files:
		raise RuntimeError("No protocols discovered under content/protocols/")

	catalog = {}

	for protocol_path in protocol_yaml_files:
		protocol_name = protocol_path.parent.name

		# Load protocol.yaml
		protocol_data = load_yaml_file(protocol_path)

		# Validate protocol YAML
		validate_protocol_yaml(protocol_data, protocol_path)

		# Load materials.yaml if present
		materials_path = protocol_path.parent / "materials.yaml"
		if materials_path.exists():
			materials_data = load_yaml_file(materials_path)
			# Extract the materials dict (it's under a 'materials' key)
			materials = materials_data.get("materials", {})
			validate_materials(materials, protocol_name)
		else:
			materials = {}

		# Transform to ProtocolConfig shape
		protocol_config = transform_protocol_to_ts(protocol_data, materials)

		catalog[protocol_name] = protocol_config

	return catalog


def main() -> None:
	"""
	Main entry point: build protocol catalog and emit TypeScript.
	"""
	try:
		catalog = build_protocol_catalog()

		# Generate TypeScript file
		ts_content = generate_ts_file(catalog)

		# Write to generated/protocol_data.ts
		output_dir = REPO_ROOT / "generated"
		output_dir.mkdir(exist_ok=True)
		output_path = output_dir / "protocol_data.ts"

		with open(output_path, 'w', encoding='utf-8') as f:
			f.write(ts_content)

		protocol_count = len(catalog)
		print(f"Build successful: emitted {protocol_count} protocols to {output_path}")

	except RuntimeError as e:
		print(f"Build failed: {e}", file=sys.stderr)
		sys.exit(1)
	except Exception as e:
		print(f"Unexpected error: {e}", file=sys.stderr)
		sys.exit(1)


if __name__ == "__main__":
	main()
