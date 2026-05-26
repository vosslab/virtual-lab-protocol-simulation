#!/usr/bin/env python3
"""
Codegen for protocol launcher metadata from content/protocols/**/protocol.yaml.

Reads protocol YAML files and emits generated/protocol_index.ts with compact
metadata for the browser launcher. Runtime execution remains owned by the
TypeScript app; this file only exposes selection data.
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

def title_from_name(protocol_name: str) -> str:
	"""Convert a snake_case protocol name to a readable title."""
	words = protocol_name.split("_")
	title = " ".join(word.upper() if word == "sdspage" else word.capitalize() for word in words)
	return title


#============================================

def collect_protocol_yaml_paths(repo_root: str) -> list[str]:
	"""Return every protocol.yaml path under content/protocols."""
	protocols_root = os.path.join(repo_root, "content", "protocols")
	paths = []

	for root, dirs, files in os.walk(protocols_root):
		if "protocol.yaml" in files:
			paths.append(os.path.join(root, "protocol.yaml"))

	return sorted(paths)


#============================================

def first_scene_from_protocol(data: dict) -> str:
	"""Return the first authored SceneChange target, or hood_basic as the launch scene."""
	for step in data.get("steps", []):
		for interaction in step.get("sequence", []):
			response = interaction.get("response", {})
			for operation in response.get("scene_operations", []):
				if operation.get("type") == "SceneChange":
					return operation["to_scene"]

	return "hood_basic"


#============================================

def protocol_metadata_from_yaml(repo_root: str, yaml_path: str) -> dict:
	"""Read one protocol YAML file and return launcher metadata."""
	with open(yaml_path, "r") as f:
		data = yaml.safe_load(f)

	protocol_name = data["protocol_name"]
	protocol_type = data["protocol_type"]
	steps = data.get("steps", [])
	mini_protocols = data.get("mini_protocols", [])

	metadata = {
		"protocol_name": protocol_name,
		"protocol_type": protocol_type,
		"title": title_from_name(protocol_name),
		"step_count": len(steps),
		"mini_protocol_count": len(mini_protocols),
		"launch_scene": first_scene_from_protocol(data),
		"path": os.path.relpath(yaml_path, repo_root),
	}
	return metadata


#============================================

def ts_string(value: str) -> str:
	"""Return a single-quoted TypeScript string literal."""
	escaped = value.replace("\\", "\\\\").replace("'", "\\'")
	return f"'{escaped}'"


#============================================

def generate_ts(protocols: list[dict]) -> str:
	"""Generate protocol_index.ts content."""
	lines = [
		"// AUTO-GENERATED. Do not edit by hand.",
		"",
		"export type ProtocolKind = 'mini_protocol' | 'sequence_runner';",
		"",
		"export interface ProtocolLaunchMetadata {",
		"\tprotocol_name: string;",
		"\tprotocol_type: ProtocolKind;",
		"\ttitle: string;",
		"\tstep_count: number;",
		"\tmini_protocol_count: number;",
		"\tlaunch_scene: string;",
		"\tpath: string;",
		"}",
		"",
		"export const PROTOCOLS: readonly ProtocolLaunchMetadata[] = [",
	]

	for protocol in protocols:
		lines.extend([
			"\t{",
			f"\t\tprotocol_name: {ts_string(protocol['protocol_name'])},",
			f"\t\tprotocol_type: {ts_string(protocol['protocol_type'])} as ProtocolKind,",
			f"\t\ttitle: {ts_string(protocol['title'])},",
			f"\t\tstep_count: {protocol['step_count']},",
			f"\t\tmini_protocol_count: {protocol['mini_protocol_count']},",
			f"\t\tlaunch_scene: {ts_string(protocol['launch_scene'])},",
			f"\t\tpath: {ts_string(protocol['path'])},",
			"\t},",
		])

	lines.extend([
		"] as const;",
		"",
		"export const PROTOCOLS_BY_NAME: Record<string, ProtocolLaunchMetadata> =",
		"\tObject.fromEntries(PROTOCOLS.map((protocol) => [protocol.protocol_name, protocol]));",
		"",
	])

	content = "\n".join(lines)
	return content


#============================================

def main() -> None:
	"""Generate generated/protocol_index.ts."""
	repo_root = get_repo_root()
	paths = collect_protocol_yaml_paths(repo_root)
	protocols = [protocol_metadata_from_yaml(repo_root, path) for path in paths]
	protocols.sort(key=lambda protocol: (protocol["protocol_type"], protocol["title"]))

	output_path = os.path.join(repo_root, "generated", "protocol_index.ts")
	os.makedirs(os.path.dirname(output_path), exist_ok=True)

	with open(output_path, "w") as f:
		f.write(generate_ts(protocols))

	print(f"Generated {output_path} with {len(protocols)} protocols")


#============================================

if __name__ == "__main__":
	main()
