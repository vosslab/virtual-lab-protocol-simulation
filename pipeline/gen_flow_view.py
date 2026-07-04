#!/usr/bin/env python3
"""
Emit a per-protocol flow view (audit artifact, not a design source) from
content/protocols/<cluster>/<protocol_name>/protocol.yaml.

PRIMARY_DESIGN.md requires an author to sketch the click path and visible
state changes BEFORE writing protocol.yaml. That flow sketch is the design
source. This script runs the other direction: it reads an already-authored
protocol.yaml and renders its step chain, click path, gestures, and state
changes back out as plain text, so a reviewer can check a finished protocol
against its intended flow. It is an audit/consistency artifact only.

Output: one generated/flow_views/<protocol_name>.txt file per mini_protocol
and dev_smoke protocol found under content/protocols/**/protocol.yaml.
sequence_runner protocols are skipped; they carry no authored `steps` of
their own to render (see PROTOCOL_VOCABULARY.md#protocol-kinds).
"""

# Standard Library
import os
import subprocess
import argparse

# PIP3 modules
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

def collect_protocol_yaml_paths(repo_root: str) -> list[str]:
	"""
	Return every content/protocols/<cluster>/<protocol_name>/protocol.yaml
	path found under the repo, sorted for deterministic output.
	"""
	content_dir = os.path.join(repo_root, "content", "protocols")
	paths = []
	if not os.path.isdir(content_dir):
		return paths
	for cluster in sorted(os.listdir(content_dir)):
		cluster_path = os.path.join(content_dir, cluster)
		if not os.path.isdir(cluster_path):
			continue
		for protocol_dir in sorted(os.listdir(cluster_path)):
			protocol_path = os.path.join(cluster_path, protocol_dir)
			protocol_yaml = os.path.join(protocol_path, "protocol.yaml")
			if os.path.isfile(protocol_yaml):
				paths.append(protocol_yaml)
	return paths


def load_protocol_yaml(protocol_yaml_path: str) -> dict:
	"""Load one protocol.yaml file as a dict."""
	with open(protocol_yaml_path, "r") as f:
		data = yaml.safe_load(f)
	if not isinstance(data, dict):
		raise ValueError(f"Protocol YAML must be a mapping: {protocol_yaml_path}")
	return data


#============================================

def render_interaction(interaction: dict, index: int) -> list[str]:
	"""
	Render one interaction as a few plain-text lines: target, gesture,
	validator preset, and the scene_operations it triggers.
	"""
	lines = []
	target = interaction["target"]
	gesture = interaction["gesture"]
	validator = interaction["validator"]
	response = interaction["response"]
	lines.append(f"      [{index}] {gesture} -> {target}  (validator: {validator['preset']})")
	scene_ops = response["scene_operations"]
	if not scene_ops:
		lines.append("          state change: none")
	for op in scene_ops:
		lines.append(f"          state change: {render_scene_operation(op)}")
	feedback = response.get("feedback")
	if feedback:
		lines.append(f"          feedback: {feedback}")
	return lines


def render_scene_operation(op: dict) -> str:
	"""
	Render one scene_operation as a short human-readable summary line.
	Field names differ by op type; access only the fields that type
	declares so an unrelated op type does not fail loudly on a missing key.
	"""
	op_type = op["type"]
	if op_type == "SceneChange":
		return f"SceneChange -> {op['to_scene']}"
	if op_type == "ObjectStateChange":
		return f"ObjectStateChange on {op['target']}"
	if op_type == "CursorAttach":
		return f"CursorAttach {op['target']}"
	if op_type == "LayoutMove":
		return f"LayoutMove {op['target']} -> {op['zone']}"
	if op_type == "TimedWait":
		return f"TimedWait {op['duration_min']}min ({op.get('display', 'no display text')})"
	raise ValueError(f"Unknown scene_operation type: {op_type}")


def render_step(step: dict) -> list[str]:
	"""Render one step as a block of plain-text lines."""
	lines = []
	step_name = step["step_name"]
	prompt = step["prompt"]
	lines.append(f"  step: {step_name}")
	lines.append(f"    prompt: {prompt}")
	lines.append("    sequence:")
	for index, interaction in enumerate(step["sequence"]):
		lines.extend(render_interaction(interaction, index))
	outcome = step["outcome"]
	lines.append(
		f"    step_validator: {step['step_validator']['preset']}, "
		f"on_success -> {outcome['on_success']}, on_failure -> {outcome['on_failure']}"
	)
	next_step = step["next_step"]
	lines.append(f"    next_step: {next_step if next_step is not None else '(terminal)'}")
	return lines


#============================================

def render_flow_view(protocol_data: dict, protocol_yaml_path: str, repo_root: str) -> str:
	"""
	Render one protocol's full flow view as a plain-text block. Raises if the
	protocol has no `steps` field (sequence_runner protocols; callers must
	skip those before calling this function).
	"""
	protocol_name = protocol_data["protocol_name"]
	protocol_type = protocol_data["protocol_type"]
	entry_step = protocol_data["entry_step"]
	source_rel_path = os.path.relpath(protocol_yaml_path, repo_root)

	lines = []
	lines.append(f"FLOW VIEW (audit artifact, not the design source): {protocol_name}")
	lines.append(f"source: {source_rel_path}")
	lines.append(f"protocol_type: {protocol_type}")
	lines.append(f"entry_step: {entry_step}")
	lines.append("")

	for step in protocol_data["steps"]:
		lines.extend(render_step(step))
		lines.append("")

	return "\n".join(lines)


#============================================

def write_flow_view(repo_root: str, protocol_name: str, rendered_text: str) -> str:
	"""Write one rendered flow view to generated/flow_views/<protocol_name>.txt."""
	out_dir = os.path.join(repo_root, "generated", "flow_views")
	os.makedirs(out_dir, exist_ok=True)
	out_path = os.path.join(out_dir, f"{protocol_name}.txt")
	with open(out_path, "w") as f:
		f.write(rendered_text)
	return out_path


#============================================

def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description=__doc__)
	args = parser.parse_args()
	return args


def main() -> None:
	parse_args()
	repo_root = get_repo_root()

	protocol_yaml_paths = collect_protocol_yaml_paths(repo_root)
	if not protocol_yaml_paths:
		raise RuntimeError("No protocol.yaml files found under content/protocols")

	processed_count = 0
	skipped_count = 0
	for protocol_yaml_path in protocol_yaml_paths:
		protocol_data = load_protocol_yaml(protocol_yaml_path)
		protocol_type = protocol_data["protocol_type"]
		# sequence_runner protocols carry no authored `steps` of their own;
		# skip them rather than rendering an empty flow view.
		if protocol_type == "sequence_runner":
			skipped_count += 1
			continue
		rendered_text = render_flow_view(protocol_data, protocol_yaml_path, repo_root)
		out_path = write_flow_view(repo_root, protocol_data["protocol_name"], rendered_text)
		print(f"Generated: {out_path}")
		processed_count += 1

	print(f"Processed {processed_count} protocol(s), skipped {skipped_count} sequence_runner(s).")


if __name__ == "__main__":
	main()
