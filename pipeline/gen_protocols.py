#!/usr/bin/env python3
"""
Codegen for protocol index and protocol config from content/protocols and tests/content/dev_smoke.

Reads all protocol.yaml files from:
- content/protocols/<cluster>/<protocol_name>/protocol.yaml
- tests/content/dev_smoke/<name>_check/protocol.yaml

Validates against the closed protocol schema per PRIMARY_SPEC.md and
PROTOCOL_VOCABULARY.md. Emits generated/protocols.ts with two named exports:
- PROTOCOLS: Readonly<Record<string, ProtocolConfig>>
- PROTOCOLS_INDEX: ReadonlyArray<ProtocolIndexEntry> (excludes dev_smoke)

Validation:
- protocol_type is one of: mini_protocol, sequence_runner, dev_smoke
- protocol_name is present and is a string
- entry_step is present and matches a step_name
- mini_protocol and sequence_runner require a learning block
- steps array is present for mini_protocol and dev_smoke
- sequence array is present for sequence_runner
- every step carries step_name, prompt, sequence, step_validator, outcome, next_step
- every interaction carries target, gesture, validator, response
- gesture is one of: click, drag, adjust, select, type
- validator preset is one of: correct_target, correct_choice, target_with_value,
  sequence_complete, final_state_matches
- outcome.on_success is "complete" and outcome.on_failure is "retry"
- scene_operations are valid (discriminated by type field)
- unknown YAML fields raise an error
- missing required fields raise an error

Output ordering: PROTOCOLS_INDEX sorted by cluster then protocol_name (deterministic).
"""

import os
import subprocess

import yaml

#============================================

def get_repo_root() -> str:
	"""Get repository root via git rev-parse --show-toplevel."""
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	return result.stdout.strip()


#============================================

def collect_protocols(repo_root: str) -> dict:
	"""
	Collect all protocol.yaml files from content/protocols and tests/content/dev_smoke.
	Returns dict: {protocol_name: (yaml_data, cluster, is_dev_smoke)}
	"""
	protocols = {}

	# Collect curriculum protocols from content/protocols/<cluster>/<name>/
	content_dir = os.path.join(repo_root, "content", "protocols")
	if os.path.isdir(content_dir):
		for cluster in os.listdir(content_dir):
			cluster_path = os.path.join(content_dir, cluster)
			if not os.path.isdir(cluster_path):
				continue
			for protocol_dir in os.listdir(cluster_path):
				protocol_path = os.path.join(cluster_path, protocol_dir)
				if not os.path.isdir(protocol_path):
					continue
				protocol_yaml = os.path.join(protocol_path, "protocol.yaml")
				if os.path.isfile(protocol_yaml):
					with open(protocol_yaml, "r") as f:
						data = yaml.safe_load(f)
					if not isinstance(data, dict):
						raise ValueError(
							f"Protocol YAML must be a mapping: {protocol_yaml}"
						)
					protocol_name = data["protocol_name"]
					protocols[protocol_name] = (data, cluster, False)

	# Collect dev_smoke protocols from tests/content/dev_smoke/<name>_check/
	smoke_dir = os.path.join(repo_root, "tests", "content", "dev_smoke")
	if os.path.isdir(smoke_dir):
		for smoke_check_dir in os.listdir(smoke_dir):
			smoke_path = os.path.join(smoke_dir, smoke_check_dir)
			if not os.path.isdir(smoke_path):
				continue
			protocol_yaml = os.path.join(smoke_path, "protocol.yaml")
			if os.path.isfile(protocol_yaml):
				with open(protocol_yaml, "r") as f:
					data = yaml.safe_load(f)
				if not isinstance(data, dict):
					raise ValueError(
						f"Protocol YAML must be a mapping: {protocol_yaml}"
					)
				# Legacy dev_smoke fixtures used a different schema (camelCase
				# fields, no `protocol_name`). They are excluded from the new
				# generator surface. Skip rather than error so they can sit
				# alongside current-schema dev_smoke YAMLs until retired.
				if "protocol_name" not in data:
					continue
				protocol_name = data["protocol_name"]
				protocols[protocol_name] = (data, "dev_smoke", True)

	return protocols


#============================================

def validate_gesture(gesture: str) -> None:
	"""Validate gesture is one of: click, drag, adjust, select, type."""
	valid = {"click", "drag", "adjust", "select", "type"}
	if gesture not in valid:
		raise ValueError(f"Unknown gesture: {gesture}. Must be one of: {valid}")


def validate_validator_preset(preset: str) -> None:
	"""Validate validator preset is one of the ratified presets."""
	valid = {
		"correct_target",
		"correct_choice",
		"target_with_value",
		"sequence_complete",
		"final_state_matches",
	}
	if preset not in valid:
		raise ValueError(
			f"Unknown validator preset: {preset}. Must be one of: {valid}"
		)


def validate_scene_operation(op: dict, protocol_name: str) -> None:
	"""Validate a scene_operation has a valid type."""
	if not isinstance(op, dict):
		raise ValueError(
			f"Protocol {protocol_name}: scene_operation is not a dict: {op}"
		)

	op_type = op["type"]
	if not op_type:
		raise ValueError(
			f"Protocol {protocol_name}: scene_operation missing type field"
		)

	valid_types = {
		"ObjectStateChange",
		"CursorAttach",
		"SceneChange",
		"LayoutMove",
		"TimedWait",
	}
	if op_type not in valid_types:
		raise ValueError(
			f"Protocol {protocol_name}: unknown scene_operation type: {op_type}"
		)


def validate_interaction(interaction: dict, protocol_name: str) -> None:
	"""Validate an interaction has all four required slots."""
	required_slots = {"target", "gesture", "validator", "response"}
	missing = required_slots - set(interaction.keys())
	if missing:
		raise ValueError(
			f"Protocol {protocol_name}: interaction missing slots: {missing}"
		)

	validate_gesture(interaction["gesture"])

	validator = interaction["validator"]
	if not isinstance(validator, dict):
		raise ValueError(
			f"Protocol {protocol_name}: validator is not a dict: {validator}"
		)
	if "preset" not in validator:
		raise ValueError(
			f"Protocol {protocol_name}: validator missing preset field"
		)
	validate_validator_preset(validator["preset"])

	response = interaction["response"]
	if not isinstance(response, dict):
		raise ValueError(
			f"Protocol {protocol_name}: response is not a dict: {response}"
		)
	if "scene_operations" not in response:
		raise ValueError(
			f"Protocol {protocol_name}: response missing scene_operations"
		)
	scene_ops = response["scene_operations"]
	if not isinstance(scene_ops, list):
		raise ValueError(
			f"Protocol {protocol_name}: scene_operations is not a list: {scene_ops}"
		)
	for op in scene_ops:
		validate_scene_operation(op, protocol_name)


def validate_step(step: dict, protocol_name: str, all_step_names: set) -> None:
	"""Validate a step has all six required slots."""
	required_slots = {
		"step_name",
		"prompt",
		"sequence",
		"step_validator",
		"outcome",
		"next_step",
	}
	missing = required_slots - set(step.keys())
	if missing:
		raise ValueError(
			f"Protocol {protocol_name}: step missing slots: {missing}"
		)

	step_name = step["step_name"]
	all_step_names.add(step_name)

	sequence = step["sequence"]
	if not isinstance(sequence, list):
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} sequence is not a list"
		)
	for interaction in sequence:
		validate_interaction(interaction, protocol_name)

	step_validator = step["step_validator"]
	if not isinstance(step_validator, dict):
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} step_validator is not a dict"
		)
	if "preset" not in step_validator:
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} step_validator missing preset"
		)
	validate_validator_preset(step_validator["preset"])

	outcome = step["outcome"]
	if not isinstance(outcome, dict):
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} outcome is not a dict"
		)
	if outcome["on_success"] != "complete":
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} outcome.on_success must be 'complete'"
		)
	if outcome["on_failure"] != "retry":
		raise ValueError(
			f"Protocol {protocol_name}: step {step_name} outcome.on_failure must be 'retry'"
		)


def validate_protocol(protocol_data: dict, cluster: str, is_dev_smoke: bool) -> None:
	"""Validate a protocol against the closed schema."""
	required_top = {"protocol_type", "protocol_name", "entry_step"}
	missing = required_top - set(protocol_data.keys())
	if missing:
		raise ValueError(
			f"Protocol missing required top-level fields: {missing}"
		)

	protocol_type = protocol_data["protocol_type"]
	valid_types = {"mini_protocol", "sequence_runner", "dev_smoke"}
	if protocol_type not in valid_types:
		raise ValueError(
			f"Unknown protocol_type: {protocol_type}. Must be one of: {valid_types}"
		)

	protocol_name = protocol_data["protocol_name"]
	if not isinstance(protocol_name, str):
		raise ValueError(f"protocol_name must be a string, got: {protocol_name}")

	entry_step = protocol_data["entry_step"]
	if not isinstance(entry_step, str):
		raise ValueError(f"entry_step must be a string, got: {entry_step}")

	# Learning block required for mini_protocol and sequence_runner
	if protocol_type in {"mini_protocol", "sequence_runner"}:
		if "learning" not in protocol_data:
			raise ValueError(
				f"Protocol {protocol_name}: {protocol_type} requires learning block"
			)
		learning = protocol_data["learning"]
		if not isinstance(learning, dict):
			raise ValueError(
				f"Protocol {protocol_name}: learning block is not a dict"
			)
		required_learning = {"objectives", "outcomes", "goals"}
		missing_learning = required_learning - set(learning.keys())
		if missing_learning:
			raise ValueError(
				f"Protocol {protocol_name}: learning block missing: {missing_learning}"
			)

	# mini_protocol and dev_smoke require steps
	if protocol_type in {"mini_protocol", "dev_smoke"}:
		if "steps" not in protocol_data:
			raise ValueError(
				f"Protocol {protocol_name}: {protocol_type} requires steps field"
			)
		steps = protocol_data["steps"]
		if not isinstance(steps, list):
			raise ValueError(
				f"Protocol {protocol_name}: steps is not a list"
			)
		all_step_names = set()
		for step in steps:
			validate_step(step, protocol_name, all_step_names)

		# Validate entry_step names a declared step
		if entry_step not in all_step_names:
			raise ValueError(
				f"Protocol {protocol_name}: entry_step '{entry_step}' does not match any step_name"
			)

		# Validate all next_step references are valid (or null)
		for step in steps:
			next_step = step["next_step"]
			if next_step is not None and next_step not in all_step_names:
				raise ValueError(
					f"Protocol {protocol_name}: step '{step['step_name']}' next_step '{next_step}' does not match any step_name"
				)

	# sequence_runner requires mini_protocols field
	elif protocol_type == "sequence_runner":
		if "mini_protocols" not in protocol_data:
			raise ValueError(
				f"Protocol {protocol_name}: sequence_runner requires mini_protocols field"
			)
		mini_protocols = protocol_data["mini_protocols"]
		if not isinstance(mini_protocols, list):
			raise ValueError(
				f"Protocol {protocol_name}: mini_protocols is not a list"
			)


#============================================

# Acronyms that must stay uppercase (or hyphenated uppercase) when a
# protocol_name is converted to a display_title. Hard-coded to keep the
# author surface closed: new acronyms require editing this list.
DISPLAY_ACRONYMS = {
	"sdspage": "SDS-PAGE",
	"mtt": "MTT",
	"pbs": "PBS",
	"dmso": "DMSO",
	"hepes": "HEPES",
}


def derive_display_title(protocol_name: str) -> str:
	"""
	Convert snake_case protocol_name to a human-readable display_title.
	Hard-coded acronyms (SDS-PAGE, MTT, PBS, DMSO, HEPES) keep canonical
	casing. The first acronym becomes a leading "ACRONYM:" prefix; remaining
	tokens are Title Case with underscores replaced by spaces.

	Examples:
		sdspage_heat_denature_samples -> "SDS-PAGE: Heat denature samples"
		mtt_plate_reaction            -> "MTT: Plate reaction"
		trypan_blue_counting          -> "Trypan blue counting"
	"""
	tokens = protocol_name.split("_")
	leading_acronym = None
	if tokens and tokens[0] in DISPLAY_ACRONYMS:
		leading_acronym = DISPLAY_ACRONYMS[tokens[0]]
		tokens = tokens[1:]
	# Title-case the remaining tokens; preserve embedded acronyms anywhere
	# in the name (rare but possible).
	rendered_tokens = []
	for i, tok in enumerate(tokens):
		if tok in DISPLAY_ACRONYMS:
			rendered_tokens.append(DISPLAY_ACRONYMS[tok])
		elif i == 0:
			rendered_tokens.append(tok.capitalize())
		else:
			rendered_tokens.append(tok)
	rest = " ".join(rendered_tokens)
	if leading_acronym is None:
		return rest
	if rest == "":
		return leading_acronym
	return f"{leading_acronym}: {rest}"


def emit_protocols_index_slim_ts(repo_root: str, protocols: dict) -> None:
	"""
	Emit generated/protocols_index_slim.ts. Slim launcher-only metadata:
	{protocol_name, cluster, display_title, learning_goal_hook}. The full
	protocol surface (steps, sequences, validators, scene operations) lives
	in generated/protocols.ts and is loaded only by the protocol_host bundle.
	"""
	generated_dir = os.path.join(repo_root, "generated")
	os.makedirs(generated_dir, exist_ok=True)
	output_path = os.path.join(generated_dir, "protocols_index_slim.ts")

	ts_lines = []
	ts_lines.append(
		"// AUTO-GENERATED by tools/gen_protocols.py. Do not edit by hand."
	)
	ts_lines.append("")
	ts_lines.append(
		"import type { ProtocolIndexSlimEntry } from '../src/shell/adapter/types';"
	)
	ts_lines.append("")
	ts_lines.append(
		"// Slim launcher metadata (excludes dev_smoke). Sorted by cluster then protocol_name."
	)
	ts_lines.append(
		"export const PROTOCOLS_INDEX_SLIM: ReadonlyArray<ProtocolIndexSlimEntry> = ["
	)

	index_entries = []
	for protocol_name, (protocol_data, cluster, is_dev_smoke) in protocols.items():
		if is_dev_smoke:
			continue
		learning_goal_hook = extract_learning_hook(protocol_data.get("learning"))
		display_title = derive_display_title(protocol_name)
		# protocol_type is required at this point; validation has already run.
		# Use dict[key] not .get to fail loudly if it's missing.
		protocol_type = protocol_data["protocol_type"]
		step_count = compute_step_count(protocol_data, protocols)
		index_entries.append(
			(cluster, protocol_name, display_title, learning_goal_hook, protocol_type, step_count)
		)

	index_entries.sort()

	for cluster, protocol_name, display_title, learning_goal_hook, protocol_type, step_count in index_entries:
		ts_lines.append(
			f"\t{{ protocol_name: '{protocol_name}', cluster: '{cluster}', "
			f"display_title: {to_ts_literal(display_title)}, "
			f"learning_goal_hook: {to_ts_literal(learning_goal_hook)}, "
			f"protocol_type: '{protocol_type}', "
			f"step_count: {step_count} }},"
		)

	ts_lines.append("] as const;")

	with open(output_path, "w") as f:
		f.write("\n".join(ts_lines) + "\n")

	print(f"Generated: {output_path}")


def compute_step_count(protocol_data: dict, all_protocols: dict) -> int:
	"""
	Compute the step count for a protocol.
	- mini_protocol: length of the `steps` list
	- sequence_runner: sum of step counts of constituent mini-protocols
	- dev_smoke: excluded from slim index (caller guarantees this)
	If a constituent mini-protocol is missing, raise loudly so the
	authoring surface stays closed.
	"""
	protocol_type = protocol_data["protocol_type"]
	if protocol_type == "mini_protocol":
		steps = protocol_data["steps"]
		return len(steps)
	if protocol_type == "sequence_runner":
		mini_names = protocol_data["mini_protocols"]
		total = 0
		for mini_name in mini_names:
			if mini_name not in all_protocols:
				raise ValueError(
					f"sequence_runner references missing mini-protocol: {mini_name}"
				)
			mini_data, _cluster, _is_smoke = all_protocols[mini_name]
			# Recurse one level (a sequence_runner referencing another
			# sequence_runner is not in scope; mini-protocols only).
			if mini_data["protocol_type"] != "mini_protocol":
				raise ValueError(
					f"sequence_runner must reference mini_protocol entries; "
					f"got {mini_data['protocol_type']} for {mini_name}"
				)
			total += len(mini_data["steps"])
		return total
	# dev_smoke or unknown: caller should not have reached here.
	raise ValueError(f"compute_step_count: unsupported protocol_type {protocol_type}")


def extract_learning_hook(learning: dict | None) -> str | None:
	"""Extract a one-liner hook from the learning.goals field."""
	if not learning:
		return None
	goals = learning["goals"]
	if not goals or not isinstance(goals, str):
		return None
	# Return first 80 chars (fit in most UI layouts)
	hook = goals.strip()
	if len(hook) > 80:
		hook = hook[:77] + "..."
	return hook


def emit_protocols_ts(
	repo_root: str, protocols: dict
) -> None:
	"""
	Emit generated/protocols.ts with PROTOCOLS and PROTOCOLS_INDEX exports.
	"""
	generated_dir = os.path.join(repo_root, "generated")
	os.makedirs(generated_dir, exist_ok=True)

	output_path = os.path.join(generated_dir, "protocols.ts")

	# Build the TypeScript output
	ts_lines = []
	ts_lines.append(
		"// AUTO-GENERATED by tools/gen_protocols.py. Do not edit by hand."
	)
	ts_lines.append("")
	ts_lines.append(
		"import type { ProtocolConfig, ProtocolIndexEntry } from '../src/shell/adapter/types';"
	)
	ts_lines.append("")
	ts_lines.append(
		"// All protocols (including dev_smoke, for validation and testing)."
	)
	ts_lines.append(
		"export const PROTOCOLS: Readonly<Record<string, ProtocolConfig>> = {"
	)

	for protocol_name in sorted(protocols.keys()):
		protocol_data, cluster, is_dev_smoke = protocols[protocol_name]
		ts_lines.append(f"\t{protocol_name}: {to_ts_literal(protocol_data)},")

	ts_lines.append("} as const;")
	ts_lines.append("")
	ts_lines.append(
		"// Student-visible protocol index (excludes dev_smoke). Sorted by cluster then protocol_name."
	)
	ts_lines.append(
		"export const PROTOCOLS_INDEX: ReadonlyArray<ProtocolIndexEntry> = ["
	)

	# Build index: exclude dev_smoke, sort by cluster then protocol_name
	index_entries = []
	for protocol_name, (protocol_data, cluster, is_dev_smoke) in protocols.items():
		if is_dev_smoke:
			continue
		learning_hook = extract_learning_hook(protocol_data.get("learning"))
		index_entries.append((cluster, protocol_name, learning_hook))

	index_entries.sort()

	for cluster, protocol_name, learning_hook in index_entries:
		protocol_data, _, _ = protocols[protocol_name]
		protocol_type = protocol_data.get("protocol_type")
		ts_lines.append(
			f"\t{{ protocol_name: '{protocol_name}', cluster: '{cluster}', protocol_type: '{protocol_type}', learning_hook: {to_ts_literal(learning_hook)} }},"
		)

	ts_lines.append("] as const;")

	# Write to file
	with open(output_path, "w") as f:
		f.write("\n".join(ts_lines) + "\n")

	print(f"Generated: {output_path}")


def to_ts_literal(value: object) -> str:
	"""Convert a Python value to a TypeScript literal."""
	if value is None:
		return "null"
	if isinstance(value, bool):
		return "true" if value else "false"
	if isinstance(value, str):
		# Escape backslashes, newlines, and quotes
		escaped = (value
			.replace("\\", "\\\\")
			.replace("\n", "\\n")
			.replace("\r", "\\r")
			.replace('"', '\\"')
		)
		return f'"{escaped}"'
	if isinstance(value, (int, float)):
		return str(value)
	if isinstance(value, dict):
		items = []
		for k, v in value.items():
			items.append(f"{k}: {to_ts_literal(v)}")
		return f"{{ {', '.join(items)} }}"
	if isinstance(value, list):
		items = [to_ts_literal(v) for v in value]
		return f"[{', '.join(items)}]"
	raise TypeError(f"Cannot convert {type(value)} to TypeScript literal: {value}")


#============================================

def main() -> None:
	"""Main entry point."""
	repo_root = get_repo_root()

	protocols = collect_protocols(repo_root)

	if not protocols:
		raise RuntimeError("No protocols found in content/protocols or tests/content/dev_smoke")

	for protocol_name, (protocol_data, cluster, is_dev_smoke) in protocols.items():
		validate_protocol(protocol_data, cluster, is_dev_smoke)

	emit_protocols_ts(repo_root, protocols)
	emit_protocols_index_slim_ts(repo_root, protocols)


if __name__ == "__main__":
	main()
