#!/usr/bin/env python3
"""
Build resolved scene data from base scenes and protocol-local scene overrides.

Reads YAML from:
- content/base_scenes/<name>.yaml (base layer, no inheritance)
- content/protocols/<cluster>/<name>/scenes/<name>.yaml (protocol overrides, extends base)

Resolves scene inheritance per docs/specs/SCENE_INHERITANCE.md:
1. Load all base scenes.
2. Load all protocol-local scenes.
3. For each protocol scene: resolve extends, then apply operations in order:
   - remove_placements
   - deactivate_placements
   - reposition_placements
   - add_placements
4. Validate: no cycles, no unknown bases, no unknown placement_name refs, no duplicates.
5. Emit fully resolved ResolvedSceneConfig records to generated/scene_data.ts.

No inheritance keys remain in emitted data. Each scene carries a source audit trail.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List

import yaml

from pipeline.pipeline_utils import REPO_ROOT

#============================================

def load_yaml_file(path: Path) -> Dict[str, Any]:
	"""
	Load a YAML file and return its contents as a dict.

	Args:
		path: Absolute path to YAML file.

	Returns:
		Parsed YAML dict.

	Raises:
		RuntimeError: If file does not exist or YAML parse fails.
	"""
	if not path.exists():
		raise RuntimeError(f"YAML file does not exist: {path}")

	try:
		with open(path, "r", encoding="utf-8") as f:
			data = yaml.safe_load(f)
	except yaml.YAMLError as e:
		raise RuntimeError(f"YAML parse error in {path}: {e}")

	if not isinstance(data, dict):
		raise RuntimeError(f"YAML file is not a dict: {path}")

	return data

#============================================

def discover_base_scenes() -> Dict[str, Path]:
	"""
	Discover all base scene YAML files under content/base_scenes/.

	Returns:
		Dict mapping scene_name -> absolute path.

	Raises:
		RuntimeError: If content/base_scenes/ does not exist.
	"""
	base_scenes_dir = REPO_ROOT / "content" / "base_scenes"
	if not base_scenes_dir.exists():
		raise RuntimeError(f"Base scenes directory does not exist: {base_scenes_dir}")

	scenes = {}
	for yaml_file in sorted(base_scenes_dir.glob("*.yaml")):
		data = load_yaml_file(yaml_file)
		scene_name = data.get("scene_name")

		if not scene_name:
			raise RuntimeError(f"Base scene YAML missing scene_name: {yaml_file}")

		if scene_name in scenes:
			raise RuntimeError(f"Duplicate base scene_name '{scene_name}' at {yaml_file} and {scenes[scene_name]}")

		scenes[scene_name] = yaml_file

	return scenes

#============================================

def discover_protocol_scenes() -> Dict[str, Path]:
	"""
	Discover all protocol-local scene YAML files under content/protocols/*/scenes/.

	Returns:
		Dict mapping scene_name -> absolute path.

	Raises:
		RuntimeError: If duplicate scene_name values exist across different protocols.
	"""
	protocols_dir = REPO_ROOT / "content" / "protocols"
	if not protocols_dir.exists():
		return {}

	scenes = {}
	for yaml_file in sorted(protocols_dir.rglob("scenes/*.yaml")):
		data = load_yaml_file(yaml_file)
		scene_name = data.get("scene_name")

		if not scene_name:
			raise RuntimeError(f"Protocol scene YAML missing scene_name: {yaml_file}")

		if scene_name in scenes:
			raise RuntimeError(f"Duplicate scene_name '{scene_name}' at {yaml_file} and {scenes[scene_name]}")

		scenes[scene_name] = yaml_file

	return scenes

#============================================

def validate_base_scene_schema(scene_name: str, data: Dict[str, Any]) -> None:
	"""
	Validate that a base scene YAML has required fields and no forbidden keys.

	Supports both zone-based (legacy with zones/placements) and row+slot shapes.
	Base scenes must not have extends, add_placements, remove_placements,
	deactivate_placements, or reposition_placements.

	Args:
		scene_name: Scene name (for error messages).
		data: Parsed YAML dict.

	Raises:
		RuntimeError: If validation fails.
	"""
	# Common required fields
	common_required = ["scene_name", "workspace", "background"]

	# Check common required fields
	for field in common_required:
		if field not in data:
			raise RuntimeError(f"Base scene '{scene_name}' missing required field: {field}")

	# Detect shape: zone-based vs row+slot
	has_zones = "zones" in data
	has_rows = "rows" in data

	# Exactly one shape must be present
	if has_zones and has_rows:
		raise RuntimeError(f"Base scene '{scene_name}' may not have both 'zones' and 'rows'")

	if not has_zones and not has_rows:
		raise RuntimeError(f"Base scene '{scene_name}' must have either 'zones' or 'rows'")

	# Zone-based shape requires zones and placements
	if has_zones:
		if "placements" not in data:
			raise RuntimeError(f"Base scene '{scene_name}' (zone-based) missing required field: placements")

		if "scene_bounds" not in data:
			raise RuntimeError(f"Base scene '{scene_name}' (zone-based) missing required field: scene_bounds")

		# Validate placements have placement_name
		placements = data.get("placements", [])
		if not isinstance(placements, list):
			raise RuntimeError(f"Base scene '{scene_name}' placements must be a list")

		for i, placement in enumerate(placements):
			if not isinstance(placement, dict):
				raise RuntimeError(f"Base scene '{scene_name}' placement {i} is not a dict")

			if "placement_name" not in placement:
				raise RuntimeError(f"Base scene '{scene_name}' placement {i} missing placement_name")

	# Row+slot shape requires rows (no placements)
	if has_rows:
		if "placements" in data:
			raise RuntimeError(f"Base scene '{scene_name}' (row+slot) must not have 'placements' field")

		rows = data.get("rows", [])
		if not isinstance(rows, list):
			raise RuntimeError(f"Base scene '{scene_name}' rows must be a list")

		for i, row in enumerate(rows):
			if not isinstance(row, dict):
				raise RuntimeError(f"Base scene '{scene_name}' row {i} is not a dict")

			if "row_name" not in row:
				raise RuntimeError(f"Base scene '{scene_name}' row {i} missing row_name")

			if "slots" not in row:
				raise RuntimeError(f"Base scene '{scene_name}' row {i} missing slots")

			slots = row.get("slots", [])
			if not isinstance(slots, list):
				raise RuntimeError(f"Base scene '{scene_name}' row {i} slots must be a list")

			for j, slot in enumerate(slots):
				if not isinstance(slot, dict):
					raise RuntimeError(f"Base scene '{scene_name}' row {i} slot {j} is not a dict")

				if "placement_name" not in slot:
					raise RuntimeError(f"Base scene '{scene_name}' row {i} slot {j} missing placement_name")

				if "object_name" not in slot:
					raise RuntimeError(f"Base scene '{scene_name}' row {i} slot {j} missing object_name")

	forbidden_keys = ["extends", "add_placements", "remove_placements", "deactivate_placements", "reposition_placements"]
	for key in forbidden_keys:
		if key in data:
			raise RuntimeError(f"Base scene '{scene_name}' may not have key '{key}'")

#============================================

def validate_protocol_scene_schema(scene_name: str, data: Dict[str, Any]) -> None:
	"""
	Validate that a protocol scene YAML has required fields and allowed keys.

	Protocol scenes must have scene_name and extends. Allowed keys:
	scene_name, extends, add_placements, remove_placements, deactivate_placements,
	reposition_placements, scene_notes.

	Args:
		scene_name: Scene name (for error messages).
		data: Parsed YAML dict.

	Raises:
		RuntimeError: If validation fails.
	"""
	required_fields = ["scene_name", "extends"]

	for field in required_fields:
		if field not in data:
			raise RuntimeError(f"Protocol scene '{scene_name}' missing required field: {field}")

	allowed_keys = {"scene_name", "extends", "add_placements", "remove_placements", "deactivate_placements", "reposition_placements", "scene_notes"}
	unknown_keys = set(data.keys()) - allowed_keys

	if unknown_keys:
		raise RuntimeError(f"Protocol scene '{scene_name}' has unknown keys: {unknown_keys}")

#============================================

def get_placement_name_dict(placements: List[Dict[str, Any]]) -> Dict[str, int]:
	"""
	Build a dict mapping placement_name -> index in the placements list.

	Args:
		placements: List of placement dicts.

	Returns:
		Dict mapping placement_name -> index.

	Raises:
		RuntimeError: If duplicate placement_name values exist.
	"""
	result = {}
	for i, placement in enumerate(placements):
		name = placement.get("placement_name")
		if not name:
			raise RuntimeError(f"Placement {i} missing placement_name")

		if name in result:
			raise RuntimeError(f"Duplicate placement_name '{name}'")

		result[name] = i

	return result

#============================================

def apply_remove_placements(placements: List[Dict[str, Any]], remove_list: List[str], scene_name: str) -> List[Dict[str, Any]]:
	"""
	Remove placements by placement_name.

	Args:
		placements: List of placement dicts.
		remove_list: List of placement_name values to remove.
		scene_name: Scene name (for error messages).

	Returns:
		New placements list with removed items.

	Raises:
		RuntimeError: If unknown placement_name is referenced.
	"""
	name_dict = get_placement_name_dict(placements)

	for remove_name in remove_list:
		if remove_name not in name_dict:
			raise RuntimeError(f"Scene '{scene_name}' remove_placements: unknown placement_name '{remove_name}'")

	# Keep placements not in remove_list
	result = [p for p in placements if p.get("placement_name") not in remove_list]
	return result

#============================================

def apply_deactivate_placements(placements: List[Dict[str, Any]], deactivate_list: List[str], scene_name: str) -> List[Dict[str, Any]]:
	"""
	Deactivate placements by marking them with deactivated=True.

	Args:
		placements: List of placement dicts.
		deactivate_list: List of placement_name values to deactivate.
		scene_name: Scene name (for error messages).

	Returns:
		New placements list with deactivated flags set.

	Raises:
		RuntimeError: If unknown placement_name is referenced.
	"""
	name_dict = get_placement_name_dict(placements)

	for deactivate_name in deactivate_list:
		if deactivate_name not in name_dict:
			raise RuntimeError(f"Scene '{scene_name}' deactivate_placements: unknown placement_name '{deactivate_name}'")

	# Mark deactivated placements
	result = []
	for placement in placements:
		if placement.get("placement_name") in deactivate_list:
			new_placement = placement.copy()
			new_placement["deactivated"] = True
			result.append(new_placement)
		else:
			result.append(placement)

	return result

#============================================

def apply_reposition_placements(placements: List[Dict[str, Any]], reposition_list: List[Dict[str, Any]], scene_name: str) -> List[Dict[str, Any]]:
	"""
	Reposition placements by updating zone, position, depth, anchor.

	Args:
		placements: List of placement dicts.
		reposition_list: List of reposition operation dicts with placement_name and field updates.
		scene_name: Scene name (for error messages).

	Returns:
		New placements list with repositioned fields.

	Raises:
		RuntimeError: If unknown placement_name or locked field is referenced.
	"""
	name_dict = get_placement_name_dict(placements)
	allowed_reposition_fields = {"placement_name", "zone", "position", "depth_tier", "anchor"}

	result = []
	for placement in placements:
		placement_name = placement.get("placement_name")

		# Find matching reposition operation
		reposition_op = None
		for op in reposition_list:
			if op.get("placement_name") == placement_name:
				reposition_op = op
				break

		if not reposition_op:
			# No reposition operation for this placement
			result.append(placement)
			continue

		# Validate fields in reposition operation
		unknown_fields = set(reposition_op.keys()) - allowed_reposition_fields
		if unknown_fields:
			raise RuntimeError(f"Scene '{scene_name}' reposition_placements: locked or unknown fields in '{placement_name}': {unknown_fields}")

		# Apply updates
		new_placement = placement.copy()
		for key, value in reposition_op.items():
			if key != "placement_name":
				new_placement[key] = value

		result.append(new_placement)

	# Check all reposition names exist
	for op in reposition_list:
		op_name = op.get("placement_name")
		if op_name not in name_dict:
			raise RuntimeError(f"Scene '{scene_name}' reposition_placements: unknown placement_name '{op_name}'")

	return result

#============================================

def apply_add_placements(placements: List[Dict[str, Any]], add_list: List[Dict[str, Any]], scene_name: str) -> List[Dict[str, Any]]:
	"""
	Add new placements to the list.

	Args:
		placements: Current placements list.
		add_list: List of new placement dicts to add.
		scene_name: Scene name (for error messages).

	Returns:
		New placements list with added items.

	Raises:
		RuntimeError: If duplicate placement_name or unknown required fields.
	"""
	result = list(placements)
	existing_names = {p.get("placement_name") for p in placements}
	required_placement_fields = {"placement_name", "object_name", "zone"}

	for new_placement in add_list:
		if not isinstance(new_placement, dict):
			raise RuntimeError(f"Scene '{scene_name}' add_placements: entry is not a dict")

		# Validate required fields
		for field in required_placement_fields:
			if field not in new_placement:
				raise RuntimeError(f"Scene '{scene_name}' add_placements: missing required field '{field}'")

		new_name = new_placement.get("placement_name")

		if new_name in existing_names:
			raise RuntimeError(f"Scene '{scene_name}' add_placements: duplicate placement_name '{new_name}'")

		result.append(new_placement)
		existing_names.add(new_name)

	return result

#============================================

def resolve_scene_inheritance(
	scene_name: str,
	protocol_scene_data: Dict[str, Any],
	base_scenes: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
	"""
	Resolve a protocol scene by applying inheritance from its base scene.

	Steps:
	1. Validate protocol scene schema.
	2. Look up base scene.
	3. Copy all locked fields from base.
	4. Copy placements from base.
	5. Apply operations in order: remove, deactivate, reposition, add.
	6. Validate no unknown placement_names remain.
	7. Return fully resolved scene dict.

	Args:
		scene_name: Scene name (for error messages).
		protocol_scene_data: Parsed protocol scene YAML.
		base_scenes: Dict mapping base scene_name -> parsed YAML.

	Returns:
		Fully resolved scene dict with all inheritance applied.

	Raises:
		RuntimeError: If inheritance resolution fails.
	"""
	validate_protocol_scene_schema(scene_name, protocol_scene_data)

	base_scene_name = protocol_scene_data.get("extends")
	if base_scene_name not in base_scenes:
		raise RuntimeError(f"Protocol scene '{scene_name}' extends unknown base '{base_scene_name}'")

	base_data = base_scenes[base_scene_name]

	# Start with locked fields from base
	result = {
		"scene_name": scene_name,
		"extends_base": base_scene_name,
		"workspace": base_data["workspace"],
		"capabilities": base_data["capabilities"],
		"scene_bounds": base_data["scene_bounds"],
		"background": base_data["background"],
		"zones": base_data["zones"],
	}

	# Optional locked fields
	if "layout_rules" in base_data:
		result["layout_rules"] = base_data["layout_rules"]

	if "wrong_order_message" in base_data:
		result["wrong_order_message"] = base_data["wrong_order_message"]

	# Start with placements from base
	placements = [p.copy() for p in base_data.get("placements", [])]

	# Apply operations in fixed order
	if "remove_placements" in protocol_scene_data:
		placements = apply_remove_placements(placements, protocol_scene_data["remove_placements"], scene_name)

	if "deactivate_placements" in protocol_scene_data:
		placements = apply_deactivate_placements(placements, protocol_scene_data["deactivate_placements"], scene_name)

	if "reposition_placements" in protocol_scene_data:
		placements = apply_reposition_placements(placements, protocol_scene_data["reposition_placements"], scene_name)

	if "add_placements" in protocol_scene_data:
		placements = apply_add_placements(placements, protocol_scene_data["add_placements"], scene_name)

	result["placements"] = placements

	return result

#============================================

def resolve_all_scenes(
	base_scenes: Dict[str, Dict[str, Any]],
	protocol_scenes: Dict[str, Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
	"""
	Resolve all scenes (base scenes as-is, protocol scenes via inheritance).

	Supports both zone-based and row+slot base scenes. Zone-based scenes use
	the inheritance system; row+slot scenes are emitted as-is.

	Args:
		base_scenes: Dict mapping scene_name -> parsed base YAML.
		protocol_scenes: Dict mapping scene_name -> parsed protocol YAML.

	Returns:
		Dict mapping scene_name -> fully resolved ResolvedSceneConfig.

	Raises:
		RuntimeError: If any scene resolution fails.
	"""
	result = {}

	# Emit base scenes as-is
	for scene_name, data in base_scenes.items():
		validate_base_scene_schema(scene_name, data)

		# Detect which shape this scene uses
		is_zone_based = "zones" in data
		is_row_slot = "rows" in data

		# Base scenes don't have extends_base field
		resolved = {
			"scene_name": scene_name,
			"workspace": data["workspace"],
			"background": data["background"],
		}

		# Normalize capabilities: convert snake_case to camelCase if needed
		capabilities = data.get("capabilities", [])
		normalized_capabilities = []
		for cap_id in capabilities:
			parts = cap_id.split('_')
			if len(parts) > 1:
				normalized = parts[0] + ''.join(word.capitalize() for word in parts[1:])
			else:
				normalized = cap_id
			normalized_capabilities.append(normalized)
		resolved["capabilities"] = normalized_capabilities

		if is_zone_based:
			# Zone-based shape
			resolved["scene_bounds"] = data["scene_bounds"]
			resolved["zones"] = data["zones"]
			resolved["placements"] = data["placements"]

		elif is_row_slot:
			# Row+slot shape
			resolved["rows"] = data["rows"]

		if "layout_rules" in data:
			resolved["layout_rules"] = data["layout_rules"]

		if "wrong_order_message" in data:
			resolved["wrong_order_message"] = data["wrong_order_message"]

		result[scene_name] = resolved

	# Resolve protocol scenes (only zone-based for now)
	for scene_name, data in protocol_scenes.items():
		result[scene_name] = resolve_scene_inheritance(scene_name, data, base_scenes)

	return result

#============================================

def emit_scene_data_ts(resolved_scenes: Dict[str, Dict[str, Any]], output_path: Path) -> None:
	"""
	Emit resolved scenes as a TypeScript ESM literal module.

	Supports both zone-based and row+slot scene shapes.

	Args:
		resolved_scenes: Dict mapping scene_name -> ResolvedSceneConfig.
		output_path: Absolute path to output generated/scene_data.ts.
	"""
	lines = [
		"// AUTO-GENERATED by pipeline/build_new_scene_data.py from content/base_scenes/ and content/protocols/*/scenes/. DO NOT EDIT BY HAND.",
		"",
		"import type { ResolvedSceneConfig } from '../src/scene_runtime/types';",
		"",
		"export const SCENE_CATALOG: Record<string, ResolvedSceneConfig> = {",
	]

	# Emit each scene as a TypeScript literal
	for scene_name in sorted(resolved_scenes.keys()):
		scene_data = resolved_scenes[scene_name]
		lines.append(f"\t{scene_name!r}: {{")

		lines.append(f"\t\tscene_name: {scene_data['scene_name']!r},")

		if "extends_base" in scene_data:
			lines.append(f"\t\textends_base: {scene_data['extends_base']!r},")

		lines.append(f"\t\tworkspace: {scene_data['workspace']!r},")
		lines.append(f"\t\tcapabilities: {scene_data['capabilities']!r},")

		bg = scene_data["background"]
		lines.append(f"\t\tbackground: {{ asset: {bg['asset']!r} }},")

		# Detect shape: zone-based or row+slot
		is_zone_based = "zones" in scene_data
		is_row_slot = "rows" in scene_data

		if is_zone_based:
			# Zone-based shape
			bounds = scene_data["scene_bounds"]
			lines.append(f"\t\tscene_bounds: {{ left: {bounds['left']}, right: {bounds['right']}, top: {bounds['top']}, bottom: {bounds['bottom']} }},")

			# Zones
			zones_str = _emit_zones(scene_data["zones"])
			lines.append(f"\t\tzones: {zones_str},")

			# Placements
			placements_str = _emit_placements(scene_data["placements"])
			lines.append(f"\t\tplacements: {placements_str},")

		elif is_row_slot:
			# Row+slot shape
			rows_str = _emit_rows(scene_data["rows"])
			lines.append(f"\t\trows: {rows_str},")

		if "layout_rules" in scene_data:
			rules = scene_data["layout_rules"]
			rules_str = _emit_value(rules, indent=3)
			lines.append(f"\t\tlayout_rules: {rules_str},")

		if "wrong_order_message" in scene_data:
			msg = scene_data["wrong_order_message"]
			msg_str = _emit_value(msg, indent=3)
			lines.append(f"\t\twrong_order_message: {msg_str},")

		lines.append("\t},")

	lines.append("};")
	lines.append("")

	output_path.parent.mkdir(parents=True, exist_ok=True)
	with open(output_path, "w", encoding="utf-8") as f:
		f.write("\n".join(lines))

#============================================

def _emit_rows(rows: List[Dict[str, Any]]) -> str:
	"""
	Emit rows list (row+slot layout) as TypeScript array literal.

	Args:
		rows: List of row dicts with row_name and slots.

	Returns:
		TypeScript array literal string.
	"""
	if not rows:
		return "[]"

	lines = ["["]
	for row in rows:
		lines.append("\t\t\t{")
		lines.append(f"\t\t\t\trow_name: {row['row_name']!r},")

		slots = row.get("slots", [])
		if slots:
			lines.append("\t\t\t\tslots: [")
			for slot in slots:
				lines.append("\t\t\t\t\t{")
				lines.append(f"\t\t\t\t\t\tplacement_name: {slot['placement_name']!r},")
				lines.append(f"\t\t\t\t\t\tobject_name: {slot['object_name']!r},")
				lines.append("\t\t\t\t\t},")
			lines.append("\t\t\t\t],")
		else:
			lines.append("\t\t\t\tslots: [],")

		lines.append("\t\t\t},")

	lines.append("\t\t]")
	return "\n".join(lines)

#============================================

def _emit_zones(zones: List[Dict[str, Any]]) -> str:
	"""
	Emit zones list as TypeScript array literal.

	Args:
		zones: List of zone dicts.

	Returns:
		TypeScript array literal string.
	"""
	if not zones:
		return "[]"

	lines = ["["]
	for zone in zones:
		lines.append("\t\t\t{")
		lines.append(f"\t\t\t\tid: {zone['id']!r},")

		bounds = zone["bounds"]
		lines.append(f"\t\t\t\tbounds: {{ left: {bounds['left']}, right: {bounds['right']}, top: {bounds['top']}, bottom: {bounds['bottom']} }},")

		lines.append(f"\t\t\t\talign: {zone['align']!r},")

		if "label" in zone:
			lines.append(f"\t\t\t\tlabel: {zone['label']!r},")

		lines.append("\t\t\t},")

	lines.append("\t\t]")
	return "\n".join(lines)

#============================================

def _emit_placements(placements: List[Dict[str, Any]]) -> str:
	"""
	Emit placements list as TypeScript array literal.

	Args:
		placements: List of placement dicts.

	Returns:
		TypeScript array literal string.
	"""
	if not placements:
		return "[]"

	lines = ["["]
	for placement in placements:
		lines.append("\t\t\t{")
		lines.append(f"\t\t\t\tplacement_name: {placement['placement_name']!r},")
		lines.append(f"\t\t\t\tobject_name: {placement['object_name']!r},")
		lines.append(f"\t\t\t\tzone: {placement['zone']!r},")

		if "depth_tier" in placement:
			lines.append(f"\t\t\t\tdepth_tier: {placement['depth_tier']},")

		if "anchor" in placement:
			lines.append(f"\t\t\t\tanchor: {placement['anchor']!r},")

		if "position" in placement:
			pos = placement["position"]
			lines.append(f"\t\t\t\tposition: {{ x: {pos['x']}, y: {pos['y']} }},")

		if "deactivated" in placement and placement["deactivated"]:
			lines.append("\t\t\t\tdeactivated: true,")

		lines.append("\t\t\t},")

	lines.append("\t\t]")
	return "\n".join(lines)

#============================================

def _emit_value(value: Any, indent: int) -> str:
	"""
	Recursively emit a Python value as TypeScript literal.

	Simple implementation for dict and list; for complex structures
	use JSON and convert.

	Args:
		value: Python value to emit.
		indent: Indentation level.

	Returns:
		TypeScript literal string.
	"""
	indent_str = "\t" * indent

	if isinstance(value, dict):
		if not value:
			return "{}"

		lines = ["{"]
		for k, v in value.items():
			v_str = _emit_value(v, indent + 1)
			lines.append(f"{indent_str}\t{k}: {v_str},")

		lines.append(f"{indent_str}}}")
		return "\n".join(lines)

	elif isinstance(value, list):
		if not value:
			return "[]"

		lines = ["["]
		for v in value:
			v_str = _emit_value(v, indent + 1)
			lines.append(f"{indent_str}\t{v_str},")

		lines.append(f"{indent_str}]")
		return "\n".join(lines)

	elif isinstance(value, bool):
		return "true" if value else "false"

	elif isinstance(value, (int, float)):
		return str(value)

	elif isinstance(value, str):
		return repr(value)

	else:
		# Fallback
		return repr(value)

#============================================

def main():
	"""
	Main entry point: discover scenes, resolve inheritance, emit TypeScript.
	"""
	try:
		# Discover base scenes
		base_scenes_paths = discover_base_scenes()
		print(f"Found {len(base_scenes_paths)} base scenes", file=sys.stderr)

		# Load base scene data
		base_scenes_data = {}
		for scene_name, path in base_scenes_paths.items():
			base_scenes_data[scene_name] = load_yaml_file(path)

		# Discover protocol scenes
		protocol_scenes_paths = discover_protocol_scenes()
		print(f"Found {len(protocol_scenes_paths)} protocol scenes", file=sys.stderr)

		# Load protocol scene data
		protocol_scenes_data = {}
		for scene_name, path in protocol_scenes_paths.items():
			protocol_scenes_data[scene_name] = load_yaml_file(path)

		# Resolve all scenes
		resolved_scenes = resolve_all_scenes(base_scenes_data, protocol_scenes_data)
		print(f"Resolved {len(resolved_scenes)} total scenes", file=sys.stderr)

		# Emit TypeScript
		output_path = REPO_ROOT / "generated" / "scene_data.ts"
		emit_scene_data_ts(resolved_scenes, output_path)
		print(f"Emitted {output_path}", file=sys.stderr)

		return 0

	except RuntimeError as e:
		print(f"ERROR: {e}", file=sys.stderr)
		return 1

#============================================

if __name__ == "__main__":
	sys.exit(main())
