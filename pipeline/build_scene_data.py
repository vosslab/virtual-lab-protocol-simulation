#!/usr/bin/env python3
"""
build_scene_data.py - Compile scene YAML to TypeScript data exports.

Reads scene YAML configs from src/scenes/<scene>/<scene>.yaml, validates
them against the scene schema, and emits generated/scene_data.ts.

No scene YAMLs exist yet; generated output is an empty but valid module.
"""

import sys
import argparse
import json
import pathlib

from pipeline._pipeline_utils import REPO_ROOT, load_yaml


# Hardcoded list of valid capability IDs (from plan, locked-decision section)
VALID_CAPABILITY_IDS = {
	'itemWorkspace',
	'modalWorkspace',
	'instrumentWorkspace',
	'gridCountingWorkspace',
	'incubatorWorkspace',
	'plateReaderWorkspace',
}


def validate_scene_yaml(path: pathlib.Path) -> dict:
	"""
	Validate a scene YAML file against the schema.

	Supports both legacy zone-based and new row+slot scene shapes.
	Normalizes row+slot YAML to internal representation before validation.

	Loud failures (raises ValueError) for:
	- Missing scene_name/workspace/capabilities (or normalized equivalents)
	- Mutually-exclusive zones and rows in same file
	- Unknown capability id
	- Item references unknown zone (zone-based) or orphaned placements (row+slot)
	- Duplicate ids
	- elementId, tabStops, layoutRules, accentRules present but wrong type
	- wrongOrderMessage missing required template/toastDurationMs
	- Mistyped fields

	Args:
		path: Path to the scene YAML file.

	Raises:
		ValueError: If validation fails.

	Returns:
		The parsed scene config (normalized to internal representation).
	"""
	scene_config = load_yaml(path)

	if not isinstance(scene_config, dict):
		raise ValueError(f"Scene YAML {path}: must be a dict, got {type(scene_config)}")

	# Normalize scene_name to sceneId if scene_name is present (row+slot shape uses scene_name)
	if 'scene_name' in scene_config and 'sceneId' not in scene_config:
		scene_config['sceneId'] = scene_config['scene_name']

	# Check required sceneId (either from sceneId field or normalized from scene_name)
	if 'sceneId' not in scene_config:
		raise ValueError(f"Scene YAML {path}: missing required 'sceneId' (or 'scene_name') field")

	scene_id = scene_config['sceneId']
	if not isinstance(scene_id, str) or not scene_id.strip():
		raise ValueError(f"Scene YAML {path}: sceneId must be a non-empty string, got {scene_id!r}")

	# Check for mutually-exclusive zones vs rows top-level keys
	has_zones = 'zones' in scene_config
	has_rows = 'rows' in scene_config
	if has_zones and has_rows:
		raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): scene must use either 'zones' or 'rows', not both")

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

	# Normalize capability ids: convert snake_case to camelCase if needed
	# E.g., item_workspace -> itemWorkspace
	normalized_capabilities = []
	for cap_id in capabilities:
		if not isinstance(cap_id, str):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): capabilities must contain strings, got {type(cap_id)}")
		# Convert snake_case to camelCase
		# Split by underscore, capitalize first letter of each part after the first
		parts = cap_id.split('_')
		if len(parts) > 1:
			normalized = parts[0] + ''.join(word.capitalize() for word in parts[1:])
		else:
			normalized = cap_id
		normalized_capabilities.append(normalized)

	scene_config['capabilities'] = normalized_capabilities

	# Validate each normalized capability id and check for required config blocks
	seen_capabilities = set()
	for i, cap_id in enumerate(normalized_capabilities):
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

	# Check rows field if present (row+slot shape)
	if 'rows' in scene_config:
		rows = scene_config['rows']
		if not isinstance(rows, list):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows must be a list, got {type(rows)}")

		# Collect all placement_name -> object_name pairs from rows for placement validation
		row_placements = {}  # placement_name -> object_name

		for i, row in enumerate(rows):
			if not isinstance(row, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}] must be a dict, got {type(row)}")

			if 'row_name' not in row:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}] missing 'row_name' field")

			row_name = row['row_name']
			if not isinstance(row_name, str) or not row_name.strip():
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].row_name must be a non-empty string, got {row_name!r}")

			if 'slots' not in row:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}] (row_name='{row_name}') missing 'slots' field")

			slots = row['slots']
			if not isinstance(slots, list):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots must be a list, got {type(slots)}")

			for j, slot in enumerate(slots):
				if not isinstance(slot, dict):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots[{j}] must be a dict, got {type(slot)}")

				if 'placement_name' not in slot:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots[{j}] missing 'placement_name' field")

				if 'object_name' not in slot:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots[{j}] missing 'object_name' field")

				placement_name = slot['placement_name']
				if not isinstance(placement_name, str) or not placement_name.strip():
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots[{j}].placement_name must be a non-empty string, got {placement_name!r}")

				object_name = slot['object_name']
				if not isinstance(object_name, str) or not object_name.strip():
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): rows[{i}].slots[{j}].object_name must be a non-empty string, got {object_name!r}")

				if placement_name in row_placements:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): duplicate placement_name '{placement_name}'")

				row_placements[placement_name] = object_name

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

			# Validate item field types (LayoutSceneItem or DispatchOnlySceneItem variant)
			# Check numeric fields if present
			if 'widthScale' in item:
				ws = item['widthScale']
				if not isinstance(ws, (int, float)) or ws <= 0:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}].widthScale must be a number > 0, got {ws!r}")

			if 'depthTier' in item:
				dt = item['depthTier']
				if not isinstance(dt, (int, float)) or dt <= 0:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}].depthTier must be a positive number, got {dt!r}")

			# Check enum fields if present
			if 'anchorY' in item:
				ay = item['anchorY']
				if ay not in ('top', 'bottom', 'tip'):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}].anchorY must be 'top', 'bottom', or 'tip', got {ay!r}")

			if 'alignStop' in item:
				als = item['alignStop']
				if als not in ('left', 'center', 'right'):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}].alignStop must be 'left', 'center', or 'right', got {als!r}")

	# Check optional layoutRules field
	if 'layoutRules' in scene_config:
		lr = scene_config['layoutRules']
		if not isinstance(lr, dict):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules must be a dict if present, got {type(lr)}")
		# Optional fields within layoutRules: clusterSpacingPx (int), tierBrightnessFactor (map), tierOpacity (map), defaultAlignStop (enum)
		if 'clusterSpacingPx' in lr:
			csp = lr['clusterSpacingPx']
			if not isinstance(csp, int):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.clusterSpacingPx must be an integer if present, got {type(csp)}")
		if 'tierBrightnessFactor' in lr:
			tbf = lr['tierBrightnessFactor']
			if not isinstance(tbf, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.tierBrightnessFactor must be a dict if present, got {type(tbf)}")
		if 'tierOpacity' in lr:
			to = lr['tierOpacity']
			if not isinstance(to, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.tierOpacity must be a dict if present, got {type(to)}")
		if 'defaultAlignStop' in lr:
			das = lr['defaultAlignStop']
			if das not in ('left', 'center', 'right'):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.defaultAlignStop must be 'left', 'center', or 'right' if present, got {das!r}")
		# New typed optional label metric fields
		if 'labelFontSize' in lr:
			lfs = lr['labelFontSize']
			if not isinstance(lfs, (int, float)) or lfs <= 0:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.labelFontSize must be a positive number if present, got {lfs!r}")
		if 'labelLineHeight' in lr:
			llh = lr['labelLineHeight']
			if not isinstance(llh, (int, float)) or llh <= 0:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.labelLineHeight must be a positive number if present, got {llh!r}")
		if 'labelOffsetY' in lr:
			loy = lr['labelOffsetY']
			if not isinstance(loy, (int, float)):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules.labelOffsetY must be a number if present, got {loy!r}")

	# Check optional accentRules field
	if 'accentRules' in scene_config:
		ar = scene_config['accentRules']
		if not isinstance(ar, dict):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): accentRules must be a dict if present, got {type(ar)}")
		# accentRules is a map of key -> { stroke?, fill?, pattern? }
		for key, value in ar.items():
			if not isinstance(value, dict):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): accentRules['{key}'] must be a dict, got {type(value)}")
			# Each key should map to a dict with optional stroke, fill, pattern (all strings)
			for field in value:
				if field not in ('stroke', 'fill', 'pattern'):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): accentRules['{key}'].{field} is not a valid field (must be stroke, fill, or pattern)")
				if not isinstance(value[field], str):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): accentRules['{key}'].{field} must be a string, got {type(value[field])}")

	# Check for unknown top-level keys on the scene config
	allowed_top_level_keys = {
		'sceneId', 'workspace', 'capabilities', 'elementId', 'items', 'zones',
		'sceneBounds', 'layoutRules', 'accentRules', 'wrongOrderMessage', 'tabStops',
		'scene_name', 'background', 'rows', 'placements'
	}
	for key in scene_config.keys():
		if key not in allowed_top_level_keys:
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): unknown top-level key '{key}'")

	# Check for unknown keys within items
	if 'items' in scene_config:
		allowed_item_keys = {
			'id', 'label', 'shortLabel', 'zone', 'depthTier', 'svgAsset', 'kind',
			'widthScale', 'anchorY', 'alignStop', 'accentKey', 'inventoryRef', 'baselineOverride'
		}
		items = scene_config['items']
		for i, item in enumerate(items):
			for key in item.keys():
				if key not in allowed_item_keys:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): items[{i}] has unknown key '{key}'")

	# Check for unknown keys within zones
	if 'zones' in scene_config:
		allowed_zone_keys = {'id', 'x0', 'x1', 'baseline', 'gap', 'align', 'tier', 'label'}
		zones = scene_config['zones']
		for i, zone in enumerate(zones):
			for key in zone.keys():
				if key not in allowed_zone_keys:
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): zones[{i}] has unknown key '{key}'")

	# Check for unknown keys within layoutRules
	if 'layoutRules' in scene_config:
		allowed_layout_rules_keys = {
			'clusterSpacingPx', 'tierBrightnessFactor', 'tierOpacity', 'defaultAlignStop',
			'labelFontSize', 'labelLineHeight', 'labelOffsetY'
		}
		layout_rules = scene_config['layoutRules']
		for key in layout_rules.keys():
			if key not in allowed_layout_rules_keys:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): layoutRules has unknown key '{key}'")

	# Check optional wrongOrderMessage field
	if 'wrongOrderMessage' in scene_config:
		wom = scene_config['wrongOrderMessage']
		if not isinstance(wom, dict):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): wrongOrderMessage must be a dict if present, got {type(wom)}")
		if 'template' in wom:
			tpl = wom['template']
			if not isinstance(tpl, str):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): wrongOrderMessage.template must be a string if present, got {type(tpl)}")
		if 'toastDurationMs' in wom:
			tdm = wom['toastDurationMs']
			if not isinstance(tdm, int):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): wrongOrderMessage.toastDurationMs must be an integer if present, got {type(tdm)}")

	# Check optional tabStops field
	if 'tabStops' in scene_config:
		ts = scene_config['tabStops']
		if not isinstance(ts, list):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): tabStops must be a list if present, got {type(ts)}")
		# tabStops is a list of lists of item ids
		for i, group in enumerate(ts):
			if not isinstance(group, list):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): tabStops[{i}] must be a list, got {type(group)}")
			for j, item_id in enumerate(group):
				if not isinstance(item_id, str):
					raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): tabStops[{i}][{j}] must be a string, got {type(item_id)}")

	# Check optional sceneBounds field (required dict with numeric left, right, top, bottom)
	if 'sceneBounds' in scene_config:
		sb = scene_config['sceneBounds']
		if not isinstance(sb, dict):
			raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): sceneBounds must be a dict if present, got {type(sb)}")
		# Check required fields within sceneBounds
		for required_field in ('left', 'right', 'top', 'bottom'):
			if required_field not in sb:
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): sceneBounds.{required_field} is required if sceneBounds is present")
			value = sb[required_field]
			if not isinstance(value, (int, float)):
				raise ValueError(f"Scene YAML {path} (sceneId={scene_id}): sceneBounds.{required_field} must be a number, got {type(value)}")

	return scene_config


def discover_scene_yamls(repo_root: pathlib.Path) -> list:
	"""
	Discover scene YAML files from src/scenes/*/*.yaml (legacy zone path) and
	content/base_scenes/*.yaml (row+slot path).

	Returns list of (scene_id, path) tuples, sorted by scene_id.
	A scene_id is derived from:
	- For src/scenes/<name>/<name>.yaml: the directory name <name>
	- For content/base_scenes/<name>.yaml: the filename basename <name>

	Args:
		repo_root: Root path of the repository.

	Returns:
		List of (scene_id, path) tuples, sorted by scene_id.
	"""
	scenes = []

	# Legacy path: src/scenes/<dir>/<dir>.yaml
	scenes_dir = repo_root / 'src' / 'scenes'
	if scenes_dir.is_dir():
		for subdir in scenes_dir.iterdir():
			if subdir.is_dir():
				scene_yaml = subdir / f'{subdir.name}.yaml'
				if scene_yaml.exists():
					scene_id = subdir.name
					scenes.append((scene_id, scene_yaml))

	# Row+slot path: content/base_scenes/*.yaml
	base_scenes_dir = repo_root / 'content' / 'base_scenes'
	if base_scenes_dir.is_dir():
		for scene_yaml in base_scenes_dir.glob('*.yaml'):
			# Derive scene_id from filename (e.g., hood_basic_row_slot.yaml -> hood_basic_row_slot)
			scene_id = scene_yaml.stem
			scenes.append((scene_id, scene_yaml))

	return sorted(scenes, key=lambda x: x[0])


def generate_scene_data(scene_configs: dict) -> str:
	"""
	Generate TypeScript code for scene_data.ts.

	Generates interfaces for both zone-based (legacy) and row+slot scenes.

	Args:
		scene_configs: Dict of sceneId -> config object.

	Returns:
		TypeScript source code.
	"""
	lines = [
		'// AUTO-GENERATED by pipeline/build_scene_data.py from src/scenes/*/*.yaml and content/base_scenes/*.yaml. DO NOT EDIT BY HAND.',
		'',
		'/**',
		' * Scene configuration registry.',
		' * Supports both zone-based layout (legacy) and row+slot layout (current).',
		' */',
		'',
		'// LayoutSceneItem: full layout-engine item with all placement and visual fields',
		'export interface LayoutSceneItem {',
		'\tid: string;',
		'\tlabel: string;',
		'\tzone: string;',
		'\tdepthTier: number;',
		'\tsvgAsset: string;',
		'\tkind: string;',
		'\twidthScale: number;',
		'\tanchorY: \'top\' | \'bottom\' | \'tip\';',
		'\talignStop: \'left\' | \'center\' | \'right\';',
		'\taccentKey?: string;',
		'\tinventoryRef?: string;',
		'\tshortLabel?: string;',
		'\tbaselineOverride?: number;',
		'}',
		'',
		'// DispatchOnlySceneItem: minimal item for dispatch-only scenes (id and label only)',
		'export interface DispatchOnlySceneItem {',
		'\tid: string;',
		'\tlabel: string;',
		'\tshortLabel?: string;',
		'}',
		'',
		'// SceneItem: discriminated union of layout or dispatch-only variant',
		'export type SceneItem = LayoutSceneItem | DispatchOnlySceneItem;',
		'',
		'// SceneZone: zone definitions for layout positioning (legacy zone-based scenes)',
		'export interface SceneZone {',
		'\tid: string;',
		'\tx0: number;',
		'\tx1: number;',
		'\tbaseline: number;',
		'\tgap: number;',
		'\talign: string;',
		'\ttier?: number;',
		'\tlabel?: string;',
		'}',
		'',
		'// SceneSlot: placement within a row (row+slot layout)',
		'export interface SceneSlot {',
		'\tplacement_name: string;',
		'\tobject_name: string;',
		'}',
		'',
		'// SceneRow: row containing slots (row+slot layout)',
		'export interface SceneRow {',
		'\trow_name: string;',
		'\tslots: SceneSlot[];',
		'}',
		'',
		'// SceneLayoutRules: optional layout tweaks',
		'export interface SceneLayoutRules {',
		'\tclusterSpacingPx?: number;',
		'\ttierBrightnessFactor?: Record<number, number>;',
		'\ttierOpacity?: Record<number, number>;',
		'\tdefaultAlignStop?: \'left\' | \'center\' | \'right\';',
		'\tlabelFontSize?: number;',
		'\tlabelLineHeight?: number;',
		'\tlabelOffsetY?: number;',
		'}',
		'',
		'// SceneAccentRules: optional accent styling rules keyed by item id',
		'export interface SceneAccentRules {',
		'\t[key: string]: {',
		'\t\tstroke?: string;',
		'\t\tfill?: string;',
		'\t\tpattern?: string;',
		'\t};',
		'}',
		'',
		'// SceneConfig: top-level scene configuration',
		'export interface SceneConfig {',
		'\tsceneId: string;',
		'\tworkspace: string;',
		'\tcapabilities: string[];',
		'\telementId?: string;',
		'\titems?: SceneItem[];',
		'\tzones?: SceneZone[];',
		'\trows?: SceneRow[];',
		'\tsceneBounds?: { left: number; right: number; top: number; bottom: number };',
		'\tlayoutRules?: SceneLayoutRules;',
		'\taccentRules?: SceneAccentRules;',
		'\twrongOrderMessage?: { template: string; toastDurationMs: number };',
		'\ttabStops?: string[][];',
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

	repo_root = REPO_ROOT

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

	# Write output file to generated/ (gitignored, regenerated by bootstrap_generated.sh)
	scene_data_path = repo_root / 'generated' / 'scene_data.ts'

	# Ensure generated/ exists
	scene_data_path.parent.mkdir(parents=True, exist_ok=True)

	with open(scene_data_path, 'w') as f:
		f.write(scene_data_ts)

	print(f"Generated {scene_data_path}")
	return 0


if __name__ == '__main__':
	sys.exit(main())
