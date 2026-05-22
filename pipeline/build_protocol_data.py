#!/usr/bin/env python3
"""
build_protocol_data.py - Compile M2 protocol YAML to TypeScript data exports.

Reads content/protocols/<cluster>/<protocol_name>/protocol.yaml + materials.yaml,
validates them, and emits generated/protocol_data.ts and generated/inventory_data.ts.

M2 schema: protocol.yaml contains protocol_type, protocol_name, entry_step, learning,
and steps. materials.yaml contains materials definitions.
"""

import sys
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional

from pipeline.pipeline_utils import REPO_ROOT, load_yaml


def discover_protocols(repo_root: Path) -> List[str]:
	"""Discover available M2 protocols by globbing content/protocols/*/protocol.yaml at any depth.

	Works with clustered layout (content/protocols/<cluster>/<name>/protocol.yaml).

	Returns:
		Sorted list of protocol names (directory basenames of each protocol.yaml parent).
	"""
	protocols_dir = repo_root / 'content' / 'protocols'
	if not protocols_dir.is_dir():
		return []

	protocols = []
	for protocol_yaml in protocols_dir.rglob('protocol.yaml'):
		protocol_data = load_yaml(protocol_yaml)
		# Only include M2 protocols (those with protocol_type field)
		if 'protocol_type' in protocol_data:
			protocol_name = protocol_yaml.parent.name
			if protocol_name not in protocols:
				protocols.append(protocol_name)

	return sorted(protocols)


def load_m2_protocol(repo_root: Path, protocol_name: str) -> Optional[Dict[str, Any]]:
	"""Load a single M2 protocol bundle.

	Args:
		repo_root: Repo root path.
		protocol_name: Protocol directory basename.

	Returns:
		Dict with keys: protocol, materials, or None if not found/not M2.

	Raises:
		FileNotFoundError, ValueError on validation failure.
	"""
	# Find protocol directory (works at any depth under content/protocols/)
	protocols_dir = repo_root / 'content' / 'protocols'
	protocol_yaml_path = None

	for protocol_yaml in protocols_dir.rglob('protocol.yaml'):
		if protocol_yaml.parent.name == protocol_name:
			protocol_yaml_path = protocol_yaml
			break

	if protocol_yaml_path is None:
		raise FileNotFoundError(f"Protocol '{protocol_name}' not found under {protocols_dir}")

	protocol_dir = protocol_yaml_path.parent
	protocol = load_yaml(protocol_yaml_path)

	# Validate M2 schema (protocol_type field required)
	if 'protocol_type' not in protocol:
		raise ValueError(f"Protocol '{protocol_name}': missing 'protocol_type' field (not M2 schema)")

	protocol_type = protocol['protocol_type']
	if protocol_type not in ('mini_protocol', 'sequence_runner', 'dev_smoke'):
		raise ValueError(f"Protocol '{protocol_name}': invalid protocol_type '{protocol_type}'")

	# Validate required top-level fields
	required_fields = ['protocol_name', 'entry_step']
	for field in required_fields:
		if field not in protocol:
			raise ValueError(f"Protocol '{protocol_name}': missing required field '{field}'")

	# Validate steps or mini_protocols based on protocol_type
	if protocol_type == 'sequence_runner':
		if 'mini_protocols' not in protocol:
			raise ValueError(f"Protocol '{protocol_name}': sequence_runner requires 'mini_protocols' field")
	else:
		if 'steps' not in protocol:
			raise ValueError(f"Protocol '{protocol_name}': {protocol_type} requires 'steps' field")

	# Validate learning block (required for mini_protocol, optional for others)
	if protocol_type == 'mini_protocol':
		if 'learning' not in protocol:
			raise ValueError(f"Protocol '{protocol_name}': mini_protocol requires 'learning' block")
		learning = protocol['learning']
		for field in ('objectives', 'outcomes', 'goals'):
			if field not in learning:
				raise ValueError(f"Protocol '{protocol_name}': learning block missing '{field}'")

	# Load materials.yaml if it exists
	materials_yaml_path = protocol_dir / 'materials.yaml'
	materials_data = {}
	if materials_yaml_path.exists():
		materials_file = load_yaml(materials_yaml_path)
		materials_data = materials_file.get('materials', {})

	# Validate steps (for mini_protocol and dev_smoke) or mini_protocols (for sequence_runner)
	if protocol_type == 'sequence_runner':
		mini_protocols = protocol.get('mini_protocols', [])
		if not isinstance(mini_protocols, list):
			raise ValueError(f"Protocol '{protocol_name}': 'mini_protocols' must be a list")
		if len(mini_protocols) == 0:
			raise ValueError(f"Protocol '{protocol_name}': 'mini_protocols' cannot be empty")
		# For sequence runners, don't validate step names since they reference other protocols
		steps = []
	else:
		steps = protocol.get('steps', [])
		if not isinstance(steps, list):
			raise ValueError(f"Protocol '{protocol_name}': 'steps' must be a list")
		if len(steps) == 0:
			raise ValueError(f"Protocol '{protocol_name}': 'steps' cannot be empty")
		# Validate entry_step references a step
		entry_step = protocol['entry_step']
		step_names = {s.get('step_name') for s in steps}
		if entry_step not in step_names:
			raise ValueError(f"Protocol '{protocol_name}': entry_step '{entry_step}' not found in steps")
		# Validate step_name fields exist
		for step in steps:
			if 'step_name' not in step:
				raise ValueError(f"Protocol '{protocol_name}': step missing 'step_name'")
			if 'sequence' not in step:
				raise ValueError(f"Protocol '{protocol_name}': step '{step.get('step_name')}' missing 'sequence'")

	return {
		'protocol': protocol,
		'materials': materials_data,
		'protocol_path': protocol_yaml_path,
	}


def build_m2_protocol_catalog(repo_root: Path, protocol_names: List[str]) -> Dict[str, Dict[str, Any]]:
	"""Load all requested M2 protocol bundles keyed by protocol id."""
	catalog = {}
	for protocol_name in protocol_names:
		try:
			bundle = load_m2_protocol(repo_root, protocol_name)
			if bundle is not None:
				catalog[protocol_name] = bundle
		except (FileNotFoundError, ValueError) as e:
			print(f"Warning: Skipping protocol '{protocol_name}': {e}", file=sys.stderr)
	return catalog


def protocol_to_ts_literal(protocol: Dict[str, Any], protocol_name: str) -> str:
	"""Convert a protocol dict to a TypeScript object literal."""
	lines = ['{']

	# protocol_type
	lines.append(f'\tprotocol_type: "{protocol.get("protocol_type", "mini_protocol")}",')

	# entry_step (as ProtocolEntry with scene + step)
	# For now, we derive the initial scene from the entry_step or from the protocol
	# Per PRIMARY_SPEC: scene is not a protocol-level field; it comes from the first step's operations
	entry_step_name = protocol.get('entry_step', '')
	lines.append(f'\tentry: {{ scene: "unknown_scene", step: "{entry_step_name}" }},')

	# id, title, description (optional)
	lines.append(f'\tid: "{protocol_name}",')
	lines.append(f'\ttitle: "{protocol_name}",')
	description = f"Protocol: {protocol_name}"
	lines.append(f'\tdescription: "{description}",')

	# learning block (if present)
	if 'learning' in protocol:
		learning = protocol['learning']
		lines.append('\tlearning: {')
		for key in ['objectives', 'outcomes', 'goals']:
			val = learning.get(key, '')
			escaped = val.replace('"', '\\"').replace('\n', ' ')
			lines.append(f'\t\t{key}: "{escaped}",')
		lines.append('\t},')

	# steps array
	lines.append('\tsteps: [')
	steps = protocol.get('steps', [])
	for step in steps:
		lines.append('\t\t{')
		lines.append(f'\t\t\tid: "{step.get("step_name", "")}",')
		lines.append(f'\t\t\tlabel: "{step.get("prompt", "")}",')
		lines.append(f'\t\t\taction: "{step.get("prompt", "")}",')
		lines.append('\t\t\twhy: "",')
		lines.append('\t\t\tscene: "unknown_scene",')
		lines.append(f'\t\t\tnextId: {json_str(step.get("next_step", None))},')
		lines.append('\t\t\tcompletionPath: { kind: "interactionSequence", completionEvent: "" },')
		lines.append('\t\t},')
	lines.append('\t],')

	lines.append('}')
	return '\n'.join(lines)


def protocol_to_config_ts_literal(protocol: Dict[str, Any], protocol_name: str, materials: Dict[str, Any]) -> str:
	"""Convert a protocol dict to a TypeScript ProtocolConfig object literal.

	ProtocolConfig requires:
	  - protocol_type: string
	  - protocol_name: string
	  - entry_step: string
	  - learning?: LearningBlock
	  - steps: Step[]
	  - materials: Record<string, MaterialConfig>
	"""
	lines = ['{']

	# protocol_type
	protocol_type = protocol.get('protocol_type', 'mini_protocol')
	lines.append(f'\tprotocol_type: "{protocol_type}",')

	# protocol_name
	lines.append(f'\tprotocol_name: "{protocol_name}",')

	# entry_step
	entry_step = protocol.get('entry_step', '')
	lines.append(f'\tentry_step: "{entry_step}",')

	# learning block (if present)
	if 'learning' in protocol:
		learning = protocol['learning']
		lines.append('\tlearning: {')
		for key in ['objectives', 'outcomes', 'goals']:
			val = learning.get(key, '')
			escaped = val.replace('"', '\\"').replace('\n', ' ')
			lines.append(f'\t\t{key}: "{escaped}",')
		lines.append('\t},')

	# steps array: convert YAML steps to Step[] shape
	lines.append('\tsteps: [')
	steps = protocol.get('steps', [])
	for step in steps:
		lines.append('\t\t{')
		lines.append(f'\t\t\tstep_name: "{step.get("step_name", "")}",')
		lines.append(f'\t\t\tprompt: "{escape_string(step.get("prompt", ""))}",')

		# sequence: array of interactions
		sequence = step.get('sequence', [])
		lines.append('\t\t\tsequence: [')
		for interaction in sequence:
			lines.append('\t\t\t\t{')
			lines.append(f'\t\t\t\t\ttarget: "{escape_string(interaction.get("target", ""))}",')
			lines.append(f'\t\t\t\t\tgesture: "{interaction.get("gesture", "")}",')
			lines.append(f'\t\t\t\t\tvalidator: {json_str(interaction.get("validator", {}))},')

			# response
			response = interaction.get('response', {})
			lines.append('\t\t\t\t\tresponse: {')
			scene_ops = response.get('scene_operations', [])
			lines.append('\t\t\t\t\t\tscene_operations: [')
			for op in scene_ops:
				lines.append(f'\t\t\t\t\t\t\t{json_str(op)},')
			lines.append('\t\t\t\t\t\t],')
			if 'feedback' in response:
				lines.append(f'\t\t\t\t\t\tfeedback: "{escape_string(response.get("feedback", ""))}",')
			lines.append('\t\t\t\t\t},')
			lines.append('\t\t\t\t},')
		lines.append('\t\t\t],')

		# step_validator
		step_validator = step.get('step_validator', {})
		lines.append(f'\t\t\tstep_validator: {json_str(step_validator)},')

		# outcome
		outcome = step.get('outcome', {'on_success': 'complete', 'on_failure': 'retry'})
		lines.append(f'\t\t\toutcome: {json_str(outcome)},')

		# next_step
		next_step = step.get('next_step')
		lines.append(f'\t\t\tnext_step: {json_str(next_step)},')
		lines.append('\t\t},')
	lines.append('\t],')

	# materials: Record<string, MaterialConfig>
	lines.append('\tmaterials: {')
	for material_id, material_def in materials.items():
		lines.append(f'\t\t{material_id}: {{')
		lines.append(f'\t\t\tlabel: "{escape_string(material_def.get("label", material_id))}",')

		# display_color
		display_color = material_def.get('display_color', {})
		lines.append('\t\t\tdisplay_color: {')
		if isinstance(display_color, dict):
			for color_key, color_val in display_color.items():
				lines.append(f'\t\t\t\t{color_key}: "{escape_string(color_val)}",')
		lines.append('\t\t\t},')
		lines.append('\t\t},')
	lines.append('\t},')

	lines.append('}')
	return '\n'.join(lines)


def escape_string(s: str) -> str:
	"""Escape a string for TypeScript/JSON output."""
	return s.replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')


def json_str(val: Any) -> str:
	"""Convert a Python value to TypeScript/JSON string representation."""
	if val is None:
		return 'null'
	elif isinstance(val, bool):
		return 'true' if val else 'false'
	elif isinstance(val, str):
		escaped = val.replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
		return f'"{escaped}"'
	elif isinstance(val, (int, float)):
		return str(val)
	elif isinstance(val, list):
		items = ', '.join(json_str(item) for item in val)
		return f'[{items}]'
	elif isinstance(val, dict):
		items = [f'{json_str(k)}: {json_str(v)}' for k, v in val.items()]
		return '{ ' + ', '.join(items) + ' }'
	else:
		return 'null'


def material_to_ts_literal(material_id: str, material_def: Dict[str, Any]) -> str:
	"""Convert a material dict to a TypeScript object literal."""
	lines = ['{']
	lines.append(f'\tlabel: "{material_def.get("label", material_id)}",')

	# colorKey is the material_id
	lines.append(f'\tcolorKey: "{material_id}",')

	# displayColor: extract from display_color field or use a default
	display_color = '#cccccc'
	if 'display_color' in material_def:
		display_obj = material_def['display_color']
		if isinstance(display_obj, dict):
			# Use 'light' key if available, else 'dark', else first available
			display_color = display_obj.get('light') or display_obj.get('dark') or list(display_obj.values())[0]
		elif isinstance(display_obj, str):
			display_color = display_obj

	lines.append(f'\tdisplayColor: "{display_color}",')
	lines.append('}')
	return '\n'.join(lines)


def generate_protocol_data_ts(catalog: Dict[str, Dict[str, Any]]) -> str:
	"""Generate TypeScript code for protocol_data.ts."""
	lines = [
		'// AUTO-GENERATED by pipeline/build_protocol_data.py from content/protocols/**/*.yaml. DO NOT EDIT BY HAND.',
		'',
		'import type { ProtocolStep } from "../src/scene_runtime/contract";',
		'import type { ProtocolConfig } from "../src/scene_runtime/types";',
		'',
		'export interface ProtocolPart {',
		'\tid: string;',
		'\tlabel: string;',
		'\tdayId: string;',
		'}',
		'',
		'export interface ProtocolDay {',
		'\tid: string;',
		'\tlabel: string;',
		'}',
		'',
		'export interface ProtocolSummary {',
		'\tid: string;',
		'\ttitle: string;',
		'\tkind: "full_protocol" | "tutorial";',
		'\tstepCount: number;',
		'\tdescription?: string;',
		'}',
		'',
		'export interface ProtocolCatalogEntry {',
		'\tsummary: ProtocolSummary;',
		'\tsteps: readonly ProtocolStep[];',
		'\tparts: Record<string, ProtocolPart>;',
		'\tdays: Record<string, ProtocolDay>;',
		'}',
		'',
	]

	# PROTOCOL_IDS: list of all protocol names
	protocol_names = sorted(catalog.keys())
	protocol_ids_str = ', '.join(f'"{name}"' for name in protocol_names)
	lines.append(f'export const PROTOCOL_IDS = [{protocol_ids_str}] as const;')
	lines.append('')
	lines.append('export type ProtocolId = typeof PROTOCOL_IDS[number];')
	lines.append('')
	lines.append('const PROTOCOL_ID_SET: ReadonlySet<string> = new Set<string>(PROTOCOL_IDS);')
	lines.append('')

	# PROTOCOL_CATALOG
	lines.append('export const PROTOCOL_CATALOG: Record<ProtocolId, ProtocolCatalogEntry> = {')
	for protocol_name in protocol_names:
		bundle = catalog[protocol_name]
		protocol = bundle['protocol']

		lines.append(f'\t{protocol_name}: {{')
		lines.append('\t\tsummary: {')
		lines.append(f'\t\t\tid: "{protocol_name}",')
		lines.append(f'\t\t\ttitle: "{protocol_name}",')
		lines.append('\t\t\tkind: "full_protocol",')
		step_count = len(protocol.get('steps', []))
		lines.append(f'\t\t\tstepCount: {step_count},')
		lines.append(f'\t\t\tdescription: "{protocol_name}",')
		lines.append('\t\t},')
		lines.append('\t\tsteps: [],')
		lines.append('\t\tparts: {},')
		lines.append('\t\tdays: {},')
		lines.append('\t},')

	lines.append('};')
	lines.append('')

	# PROTOCOL_CONFIGS: Record<string, ProtocolConfig> for loader consumption
	lines.append('export const PROTOCOL_CONFIGS: Record<string, ProtocolConfig> = {')
	for protocol_name in protocol_names:
		bundle = catalog[protocol_name]
		protocol = bundle['protocol']
		materials = bundle.get('materials', {})

		lines.append(f'\t{protocol_name}: {protocol_to_config_ts_literal(protocol, protocol_name, materials)},')

	lines.append('};')
	lines.append('')

	# Helper functions
	lines.extend([
		'export function getRequestedProtocolId(): string | null {',
		'\tif (typeof window === "undefined") return null;',
		'\tconst params = new URLSearchParams(window.location.search);',
		'\treturn params.get("protocol");',
		'}',
		'',
		'export function isKnownProtocolId(value: string | null): value is ProtocolId {',
		'\tif (value === null) return false;',
		'\treturn PROTOCOL_ID_SET.has(value);',
		'}',
		'',
		f'export const DEFAULT_PROTOCOL_ID: ProtocolId = "{protocol_names[0] if protocol_names else "cell_culture"}";',
		'export const REQUESTED_PROTOCOL_ID = getRequestedProtocolId();',
		'export const HAS_REQUESTED_PROTOCOL = REQUESTED_PROTOCOL_ID !== null;',
		'export const SELECTED_PROTOCOL_ID: ProtocolId | null = isKnownProtocolId(REQUESTED_PROTOCOL_ID)',
		'\t? REQUESTED_PROTOCOL_ID',
		'\t: null;',
		'export const REQUESTED_PROTOCOL_IS_VALID = SELECTED_PROTOCOL_ID !== null;',
		'export const INVALID_REQUESTED_PROTOCOL_ID: string | null =',
		'\tHAS_REQUESTED_PROTOCOL && !REQUESTED_PROTOCOL_IS_VALID',
		'\t\t? REQUESTED_PROTOCOL_ID',
		'\t\t: null;',
		'',
		'const ACTIVE_PROTOCOL_ID: ProtocolId = SELECTED_PROTOCOL_ID ?? DEFAULT_PROTOCOL_ID;',
		'export const PROTOCOL_ID: ProtocolId = ACTIVE_PROTOCOL_ID;',
		'export const PROTOCOL_STEPS: readonly ProtocolStep[] = PROTOCOL_CATALOG[ACTIVE_PROTOCOL_ID].steps;',
		'export const PROTOCOL_PARTS: Record<string, ProtocolPart> = PROTOCOL_CATALOG[ACTIVE_PROTOCOL_ID].parts;',
		'export const PROTOCOL_DAYS: Record<string, ProtocolDay> = PROTOCOL_CATALOG[ACTIVE_PROTOCOL_ID].days;',
		'export const PROTOCOL_SUMMARY: ProtocolSummary = PROTOCOL_CATALOG[ACTIVE_PROTOCOL_ID].summary;',
	])

	return '\n'.join(lines)


def generate_inventory_data_ts(catalog: Dict[str, Dict[str, Any]]) -> str:
	"""Generate TypeScript code for inventory_data.ts."""
	lines = [
		'// AUTO-GENERATED by pipeline/build_protocol_data.py from content/protocols/**/*.yaml. DO NOT EDIT BY HAND.',
		'',
		'import { DEFAULT_PROTOCOL_ID, SELECTED_PROTOCOL_ID, type ProtocolId } from "./protocol_data";',
		'',
		'export interface InventoryItem {',
		'\tlabel: string;',
		'\trole: string;',
		'\tscene: string;',
		'\tasset?: string;',
		'\tliquidCapable?: boolean;',
		'\tcapacityMl?: number;',
		'\tallowedLiquids?: string[];',
		'\tcontains?: string;',
		'\tcontainsAny?: string[];',
		'\tvisualOnly?: boolean;',
		'}',
		'',
		'export interface InventoryReagent {',
		'\tlabel: string;',
		'\tcolorKey: string;',
		'\tdisplayColor: string;',
		'}',
		'',
		'export interface InventoryCatalogEntry {',
		'\tequipment: Record<string, InventoryItem>;',
		'\treagents: Record<string, InventoryReagent>;',
		'}',
		'',
	]

	# INVENTORY_CATALOG
	lines.append('export const INVENTORY_CATALOG: Record<ProtocolId, InventoryCatalogEntry> = {')
	protocol_names = sorted(catalog.keys())

	for protocol_name in protocol_names:
		bundle = catalog[protocol_name]
		materials = bundle.get('materials', {})

		lines.append(f'\t{protocol_name}: {{')
		lines.append('\t\tequipment: {')
		lines.append('\t\t},')
		lines.append('\t\treagents: {')

		# Emit materials as reagents
		for material_id, material_def in materials.items():
			lines.append(f'\t\t\t{material_id}: {material_to_ts_literal(material_id, material_def)},')

		lines.append('\t\t},')
		lines.append('\t},')

	lines.append('};')
	lines.append('')

	# Helper exports
	lines.extend([
		'const ACTIVE_PROTOCOL_ID: ProtocolId = SELECTED_PROTOCOL_ID ?? DEFAULT_PROTOCOL_ID;',
		'export const EQUIPMENT: Record<string, InventoryItem> = INVENTORY_CATALOG[ACTIVE_PROTOCOL_ID].equipment;',
		'export const REAGENTS: Record<string, InventoryReagent> = INVENTORY_CATALOG[ACTIVE_PROTOCOL_ID].reagents;',
	])

	return '\n'.join(lines)


def main():
	"""Main entry point."""
	parser = argparse.ArgumentParser(
		description='Compile M2 protocol YAML to TypeScript data exports.'
	)
	group = parser.add_mutually_exclusive_group()
	group.add_argument(
		'-p', '--protocol',
		dest='protocol',
		default=None,
		help='Validate one protocol by name. Generated output still includes the full catalog.',
	)
	group.add_argument(
		'-l', '--list-protocols',
		dest='list_protocols',
		action='store_true',
		help='List available M2 protocols and exit.',
	)
	parser.add_argument(
		'--validate-only',
		action='store_true',
		help='Validate only; do not regenerate output files.',
	)
	args = parser.parse_args()

	repo_root = REPO_ROOT

	# Handle --list-protocols
	if args.list_protocols:
		protocols = discover_protocols(repo_root)
		for p in protocols:
			print(p)
		return 0

	# Discover all M2 protocols
	all_protocols = discover_protocols(repo_root)
	if not all_protocols:
		print("Error: No M2 protocols found (missing protocol_type field)", file=sys.stderr)
		return 1

	if args.protocol is not None:
		if args.protocol not in all_protocols:
			print(f"Error: Protocol '{args.protocol}' not found", file=sys.stderr)
			return 1

	# Build catalog (loads and validates all protocols)
	try:
		full_catalog = build_m2_protocol_catalog(repo_root, all_protocols)
	except (FileNotFoundError, ValueError) as err:
		print(f"Error: {err}", file=sys.stderr)
		return 1

	if args.validate_only:
		print(f"Validation passed for {len(full_catalog)} protocols.")
		return 0

	if not full_catalog:
		print("Error: No valid M2 protocols to emit", file=sys.stderr)
		return 1

	# Generate and write output files
	protocol_data_ts = generate_protocol_data_ts(full_catalog)
	inventory_data_ts = generate_inventory_data_ts(full_catalog)

	protocol_data_path = repo_root / 'generated' / 'protocol_data.ts'
	inventory_data_path = repo_root / 'generated' / 'inventory_data.ts'

	# Ensure generated/ exists
	protocol_data_path.parent.mkdir(parents=True, exist_ok=True)

	with open(protocol_data_path, 'w') as f:
		f.write(protocol_data_ts)
	with open(inventory_data_path, 'w') as f:
		f.write(inventory_data_ts)

	print(f"Generated {protocol_data_path} ({len(protocol_data_ts)} bytes)")
	print(f"Generated {inventory_data_path} ({len(inventory_data_ts)} bytes)")

	return 0


if __name__ == '__main__':
	sys.exit(main())
