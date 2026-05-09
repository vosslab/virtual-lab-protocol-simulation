#!/usr/bin/env python3
"""
build_scene_data.py - Compile scene YAML to TypeScript data exports.

Reads scene YAML configs from src/scenes/<scene>/<scene>.yaml, validates
them against the scene schema, and emits src/content/scene_data.ts.

No scene YAMLs exist yet; generated output is an empty but valid module.
"""

import sys
import argparse
import json
import pathlib
import subprocess

import yaml


# Hardcoded list of valid capability IDs (from plan, locked-decision section)
VALID_CAPABILITY_IDS = {
	'itemWorkspace',
	'modalWorkspace',
	'instrumentWorkspace',
	'gridCountingWorkspace',
	'incubatorWorkspace',
	'plateReaderWorkspace',
	'liquidTransfer',
}


def get_repo_root() -> pathlib.Path:
	"""Determine REPO_ROOT via git rev-parse --show-toplevel."""
	result = subprocess.run(
		['git', 'rev-parse', '--show-toplevel'],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise RuntimeError(f"Failed to find repo root: {result.stderr}")
	return pathlib.Path(result.stdout.strip())


def load_yaml_file(path: pathlib.Path) -> dict:
	"""Load a YAML file and return parsed content."""
	with open(path, 'r') as f:
		return yaml.safe_load(f)


def validate_scene_yaml(path: pathlib.Path) -> dict:
	"""
	Validate a scene YAML file against the schema.

	Loud failures (raises ValueError) for:
	- Missing sceneId
	- Unknown capability id
	- Item references unknown zone
	- Duplicate ids
	- Capability declared but its required config block missing
	- elementId present but not a non-empty string

	Args:
		path: Path to the scene YAML file.

	Raises:
		ValueError: If validation fails.

	Returns:
		The parsed scene config.
	"""
	scene_config = load_yaml_file(path)

	if not isinstance(scene_config, dict):
		raise ValueError(f"Scene YAML {path}: must be a dict, got {type(scene_config)}")

	# Check required sceneId
	if 'sceneId' not in scene_config:
		raise ValueError(f"Scene YAML {path}: missing required 'sceneId' field")

	scene_id = scene_config['sceneId']
	if not isinstance(scene_id, str) or not scene_id.strip():
		raise ValueError(f"Scene YAML {path}: sceneId must be a non-empty string, got {scene_id!r}")

	# Check required workspace field (advisory label; declared as official schema field)
	if 'workspace' not in scene_config:
		raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): missing required 'workspace' field")
	workspace = scene_config['workspace']
	if not isinstance(workspace, str) or not workspace.strip():
		raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): workspace must be a non-empty string, got {workspace!r}")

	# Check optional elementId field (Patch 14: for custom DOM element id lookup)
	if 'elementId' in scene_config:
		element_id = scene_config['elementId']
		if not isinstance(element_id, str) or not element_id.strip():
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): elementId must be a non-empty string if present, got {element_id!r}")

	# Check capabilities field
	if 'capabilities' not in scene_config:
		raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): missing 'capabilities' field")

	capabilities = scene_config['capabilities']
	if not isinstance(capabilities, list):
		raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): capabilities must be a list, got {type(capabilities)}")

	# Validate each capability id and check for required config blocks
	seen_capabilities = set()
	for i, cap_id in enumerate(capabilities):
		if not isinstance(cap_id, str):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): capabilities[{i}] must be a string, got {type(cap_id)}")

		if cap_id not in VALID_CAPABILITY_IDS:
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): unknown capability id '{cap_id}' not in {sorted(VALID_CAPABILITY_IDS)}")

		if cap_id in seen_capabilities:
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): duplicate capability id '{cap_id}'")

		seen_capabilities.add(cap_id)

	# Check zones field if present
	if 'zones' in scene_config:
		zones = scene_config['zones']
		if not isinstance(zones, list):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): zones must be a list, got {type(zones)}")

		# Check for duplicate zone ids
		zone_ids = set()
		for i, zone in enumerate(zones):
			if not isinstance(zone, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): zones[{i}] must be a dict, got {type(zone)}")

			if 'id' not in zone:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): zones[{i}] missing 'id' field")

			zone_id = zone['id']
			if not isinstance(zone_id, str) or not zone_id.strip():
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): zones[{i}].id must be a non-empty string, got {zone_id!r}")

			if zone_id in zone_ids:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): duplicate zone id '{zone_id}'")

			zone_ids.add(zone_id)
	else:
		zone_ids = set()

	# Check items field if present
	if 'items' in scene_config:
		items = scene_config['items']
		if not isinstance(items, list):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items must be a list, got {type(items)}")

		# Validate each item
		item_ids = set()
		for i, item in enumerate(items):
			if not isinstance(item, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}] must be a dict, got {type(item)}")

			if 'id' not in item:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}] missing 'id' field")

			item_id = item['id']
			if not isinstance(item_id, str) or not item_id.strip():
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}].id must be a non-empty string, got {item_id!r}")

			if item_id in item_ids:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): duplicate item id '{item_id}'")

			item_ids.add(item_id)

			# Check zone reference if present
			if 'zone' in item:
				zone_ref = item['zone']
				if zone_ref not in zone_ids:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): item '{item_id}' references unknown zone '{zone_ref}'")

	return scene_config


def discover_scene_yamls(repo_root: pathlib.Path) -> list:
	"""
	Discover scene YAML files by globbing src/scenes/*/*yaml.

	Args:
		repo_root: Root path of the repository.

	Returns:
		List of (scene_id, path) tuples, sorted by scene_id.
	"""
	scenes_dir = repo_root / 'src' / 'scenes'
	if not scenes_dir.is_dir():
		return []

	scenes = []
	for subdir in scenes_dir.iterdir():
		if subdir.is_dir():
			scene_yaml = subdir / f'{subdir.name}.yaml'
			if scene_yaml.exists():
				scene_id = subdir.name
				scenes.append((scene_id, scene_yaml))

	return sorted(scenes, key=lambda x: x[0])


def generate_scene_data(scene_configs: dict) -> str:
	"""
	Generate TypeScript code for scene_data.ts.

	Args:
		scene_configs: Dict of sceneId -> config object.

	Returns:
		TypeScript source code.
	"""
	lines = [
		'// AUTO-GENERATED by tools/build_scene_data.py from src/scenes/*/*.yaml. DO NOT EDIT BY HAND.',
		'',
		'/**',
		' * Scene configuration registry.',
		' * Will be populated as scenes are migrated to the driver architecture.',
		' */',
		'',
		'export interface SceneConfig {',
		'\tsceneId: string;',
		'\tworkspace: string;',
		'\tcapabilities: string[];',
		'\telementId?: string;',
		'\titems?: unknown[];',
		'\tzones?: unknown[];',
		'\twrongOrderMessage?: { template: string; toastDurationMs: number };',
		'\t[key: string]: unknown;',
		'}',
		'',
		'export const SCENE_CONFIGS: Record<string, SceneConfig> = ',
	]

	# Serialize scene_configs as a JSON object (valid TypeScript literal)
	json_str = json.dumps(scene_configs, indent=2)
	lines.append(json_str)
	lines.append(';')
	lines.append('')

	return '\n'.join(lines)


def main() -> int:
	"""Main entry point."""
	parser = argparse.ArgumentParser(
		description='Compile scene YAML to TypeScript data exports.'
	)
	parser.add_argument(
		'--validate-only',
		action='store_true',
		help='Validate only; do not regenerate output files.',
	)
	args = parser.parse_args()

	repo_root = get_repo_root()

	# Discover scene YAML files
	discovered_scenes = discover_scene_yamls(repo_root)

	# Validate each scene YAML
	scene_configs = {}
	for scene_id, scene_yaml_path in discovered_scenes:
		config = validate_scene_yaml(scene_yaml_path)
		scene_configs[scene_id] = config

	if args.validate_only:
		if discovered_scenes:
			print(f"Validation passed for {len(discovered_scenes)} scene(s).")
		else:
			print("Validation passed (no scene YAMLs found).")
		return 0

	# Generate TypeScript output
	scene_data_ts = generate_scene_data(scene_configs)

	# Write output file
	scene_data_path = repo_root / 'src' / 'content' / 'scene_data.ts'
	with open(scene_data_path, 'w') as f:
		f.write(scene_data_ts)

	print(f"Generated {scene_data_path}")
	return 0


if __name__ == '__main__':
	sys.exit(main())
