#!/usr/bin/env python3
"""
Build object data: reads content/objects/<kind>/<name>.yaml and emits generated/object_data.ts.

Discovers every object YAML file under content/objects/, validates required fields,
classifies visual_states mechanisms, and emits a TypeScript module with OBJECT_CATALOG.

Per WP-GENERATED-DATA-4, visual_states classifications:
  - svg_swap: Kind is 'svg'; emit as-is. Pilot 0 eligible.
  - composite_fill_height: Kind is 'composite' with formula fill_height. Deferred M2/WS-LIQUID.
  - composite_empty: Kind is 'composite' with empty composite list. No-op, deferred.
  - overlay: Kind is 'overlay'. Deferred M3+.
  - unsupported: All other kinds. Loud console.warn at runtime; no approximation.

Required fields per audit section 5.2:
  - object_name (yes)
  - kind (yes)
  - label (yes)
  - state_fields (yes)
  - visual_states (yes)
  - capabilities (yes)
  - layout (no)
  - structure (no)
"""

import sys
import json
from pathlib import Path
from typing import Any

from pipeline._pipeline_utils import REPO_ROOT, iter_objects, load_yaml


#============================================
# Constants
#============================================

# Valid kinds per OBJECT_VOCABULARY.md
VALID_KINDS = frozenset(["plate", "bottle", "flask", "pipette", "rack", "waste", "equipment", "decoration"])

# Valid state field types per OBJECT_YAML_FORMAT.md
VALID_STATE_TYPES = frozenset(["enum", "int", "float", "bool"])

# Valid visual_states kinds
VALID_VISUAL_KINDS = frozenset(["svg", "overlay", "composite"])

# Valid state field type metadata keys
STATE_TYPE_METADATA = {
	"enum": frozenset(["allowed", "default", "description", "unit", "applies_to"]),
	"int": frozenset(["unit", "min", "max", "step", "default", "description", "applies_to"]),
	"float": frozenset(["unit", "min", "max", "step", "default", "description", "applies_to"]),
	"bool": frozenset(["default", "description", "applies_to"]),
}

# Valid structure.layout values
VALID_STRUCTURE_LAYOUTS = frozenset(["grid", "list", "custom"])

# Valid structure.subpart_kind values
VALID_SUBPART_KINDS = frozenset(["well", "tube", "lane", "slot", "channel"])

# Valid subpart_groups.group_kind values
VALID_GROUP_KINDS = frozenset(["row", "column", "region"])


#============================================
# Discovery and Loading
#============================================

def discover_objects() -> dict[str, Path]:
	"""
	Discover all object YAML files under content/objects/, keyed by object_name.

	Returns dict keyed by object_name. Raises RuntimeError if duplicate names found.
	"""
	objects_by_name = {}

	for object_yaml in iter_objects():
		object_name = object_yaml.stem
		if object_name in objects_by_name:
			raise RuntimeError(
				f"Duplicate object name '{object_name}': "
				f"{objects_by_name[object_name]} and {object_yaml}"
			)
		objects_by_name[object_name] = object_yaml

	return objects_by_name


#============================================
# Validation
#============================================

def validate_required_field(obj: dict, field_name: str, object_name: str) -> None:
	"""Validate that a required field exists and is not None."""
	if field_name not in obj:
		raise RuntimeError(f"Object '{object_name}': required field '{field_name}' is missing")
	if obj[field_name] is None:
		raise RuntimeError(f"Object '{object_name}': required field '{field_name}' is None")


def validate_object_name(obj: dict, file_path: Path) -> None:
	"""Validate that object_name matches the filename."""
	object_name = obj.get("object_name")
	file_stem = file_path.stem

	if object_name != file_stem:
		raise RuntimeError(
			f"Object at {file_path}: object_name '{object_name}' does not match "
			f"filename '{file_stem}.yaml'"
		)


def validate_kind(obj: dict, object_name: str) -> None:
	"""Validate that kind is a valid enum value."""
	kind = obj.get("kind")
	if kind not in VALID_KINDS:
		raise RuntimeError(
			f"Object '{object_name}': kind '{kind}' is not in valid set: "
			f"{sorted(VALID_KINDS)}"
		)


def validate_kind_matches_folder(obj: dict, file_path: Path, object_name: str) -> None:
	"""Validate that kind matches the folder name."""
	kind = obj.get("kind")
	folder_name = file_path.parent.name

	if kind != folder_name:
		raise RuntimeError(
			f"Object '{object_name}': kind '{kind}' does not match "
			f"folder name '{folder_name}'"
		)


def validate_state_fields(obj: dict, object_name: str) -> None:
	"""Validate state_fields list structure."""
	state_fields = obj.get("state_fields", [])

	if not isinstance(state_fields, list):
		raise RuntimeError(
			f"Object '{object_name}': state_fields must be a list, "
			f"got {type(state_fields).__name__}"
		)

	for i, field in enumerate(state_fields):
		if not isinstance(field, dict):
			raise RuntimeError(
				f"Object '{object_name}': state_fields[{i}] must be a dict, "
				f"got {type(field).__name__}"
			)

		if "field_name" not in field:
			raise RuntimeError(
				f"Object '{object_name}': state_fields[{i}] missing required field 'field_name'"
			)

		field_name = field["field_name"]

		if "type" not in field:
			raise RuntimeError(
				f"Object '{object_name}': state_fields[{i}] ('{field_name}') missing required 'type'"
			)

		field_type = field["type"]
		if field_type not in VALID_STATE_TYPES:
			raise RuntimeError(
				f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
				f"type '{field_type}' not in {sorted(VALID_STATE_TYPES)}"
			)

		if "default" not in field:
			raise RuntimeError(
				f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
				f"missing required 'default'"
			)

		# Validate metadata keys for this type
		allowed_keys = STATE_TYPE_METADATA[field_type]
		for key in field.keys():
			if key not in allowed_keys and key not in ["field_name", "type", "default"]:
				raise RuntimeError(
					f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
					f"unexpected key '{key}' for type '{field_type}'. "
					f"Allowed: {sorted(allowed_keys)}"
				)

		# Validate enum-specific constraints
		if field_type == "enum":
			if "allowed" not in field:
				raise RuntimeError(
					f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
					f"enum type requires 'allowed' list"
				)
			allowed = field["allowed"]
			if not isinstance(allowed, list) or not allowed:
				raise RuntimeError(
					f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
					f"'allowed' must be a non-empty list"
				)
			default = field["default"]
			if default not in allowed:
				raise RuntimeError(
					f"Object '{object_name}': state_fields[{i}] ('{field_name}') "
					f"default '{default}' not in allowed list {allowed}"
				)


def validate_visual_states(obj: dict, object_name: str) -> None:
	"""Validate visual_states structure."""
	visual_states = obj.get("visual_states", {})

	if not isinstance(visual_states, dict):
		raise RuntimeError(
			f"Object '{object_name}': visual_states must be a dict, "
			f"got {type(visual_states).__name__}"
		)

	for field_name, visual_def in visual_states.items():
		if not isinstance(visual_def, dict):
			raise RuntimeError(
				f"Object '{object_name}': visual_states['{field_name}'] must be a dict, "
				f"got {type(visual_def).__name__}"
			)

		if "kind" not in visual_def:
			raise RuntimeError(
				f"Object '{object_name}': visual_states['{field_name}'] missing required 'kind'"
			)

		kind = visual_def["kind"]
		if kind not in VALID_VISUAL_KINDS:
			raise RuntimeError(
				f"Object '{object_name}': visual_states['{field_name}'] "
				f"kind '{kind}' not in {sorted(VALID_VISUAL_KINDS)}"
			)


def validate_capabilities(obj: dict, object_name: str) -> None:
	"""Validate capabilities is a list."""
	capabilities = obj.get("capabilities", [])

	if not isinstance(capabilities, list):
		raise RuntimeError(
			f"Object '{object_name}': capabilities must be a list, "
			f"got {type(capabilities).__name__}"
		)


def validate_structure_if_present(obj: dict, object_name: str) -> None:
	"""Validate structure block if present."""
	structure = obj.get("structure")
	if structure is None:
		return

	if not isinstance(structure, dict):
		raise RuntimeError(
			f"Object '{object_name}': structure must be a dict, "
			f"got {type(structure).__name__}"
		)

	if "subpart_kind" not in structure:
		raise RuntimeError(
			f"Object '{object_name}': structure missing required 'subpart_kind'"
		)

	subpart_kind = structure["subpart_kind"]
	if subpart_kind not in VALID_SUBPART_KINDS:
		raise RuntimeError(
			f"Object '{object_name}': structure.subpart_kind '{subpart_kind}' "
			f"not in {sorted(VALID_SUBPART_KINDS)}"
		)

	if "layout" not in structure:
		raise RuntimeError(
			f"Object '{object_name}': structure missing required 'layout'"
		)

	layout = structure["layout"]
	if layout not in VALID_STRUCTURE_LAYOUTS:
		raise RuntimeError(
			f"Object '{object_name}': structure.layout '{layout}' "
			f"not in {sorted(VALID_STRUCTURE_LAYOUTS)}"
		)

	if "name_pattern" not in structure:
		raise RuntimeError(
			f"Object '{object_name}': structure missing required 'name_pattern'"
		)

	# Validate grid/list specific fields
	if layout == "grid":
		if "rows" not in structure or "cols" not in structure:
			raise RuntimeError(
				f"Object '{object_name}': structure with layout:grid requires 'rows' and 'cols'"
			)
	elif layout == "list":
		if "count" not in structure:
			raise RuntimeError(
				f"Object '{object_name}': structure with layout:list requires 'count'"
			)


#============================================
# Visual States Classification
#============================================

def classify_visual_state(field_name: str, visual_def: dict, object_name: str) -> dict[str, Any]:
	"""
	Classify a visual_states entry by mechanism.

	Returns dict with 'kind', 'pilot_0_eligible', 'cases' (if svg_swap),
	'formula' (if composite with formula), 'deferred_milestone' (if deferred).

	Emits loud console.warn for unsupported mechanisms (no silent approximation).
	"""
	kind = visual_def.get("kind")

	# SVG swap: svg kind with cases
	if kind == "svg":
		cases = visual_def.get("cases", [])
		classification = {
			"kind": "svg_swap",
			"pilot_0_eligible": True,
			"cases": cases,
		}
		return classification

	# Composite: check for fill_height or empty
	if kind == "composite":
		formula = visual_def.get("formula")
		composite_list = visual_def.get("composite", [])

		# fill_height formula: deferred to M2/WS-LIQUID
		if formula and "fill_height" in formula:
			return {
				"kind": "composite_fill_height",
				"pilot_0_eligible": False,
				"deferred_milestone": "M2/WS-LIQUID",
			}

		# Empty composite: no-op visual state
		if not composite_list:
			return {
				"kind": "composite_empty",
				"pilot_0_eligible": False,
				"deferred_milestone": "no-op",
			}

		# Other composite kinds: unsupported
		return {
			"kind": "unsupported",
			"pilot_0_eligible": False,
			"reason": "composite with non-fill_height formula or complex composite list",
		}

	# Overlay: deferred to M3+
	if kind == "overlay":
		return {
			"kind": "overlay",
			"pilot_0_eligible": False,
			"deferred_milestone": "M3+",
		}

	# Unknown kind: unsupported
	return {
		"kind": "unsupported",
		"pilot_0_eligible": False,
		"reason": f"unknown visual_states kind '{kind}'",
	}


#============================================
# TypeScript Emission
#============================================

def emit_object_catalog(objects: dict[str, dict], output_path: Path) -> None:
	"""
	Emit generated/object_data.ts with OBJECT_CATALOG.

	Formats each ObjectConfig as a TypeScript object literal.
	Type declarations are imported from src/scene_runtime/types.ts.
	"""
	lines = []

	# Header
	lines.append("// Generated file: object_data.ts")
	lines.append("// DO NOT EDIT MANUALLY")
	lines.append("// Regenerate with: python3 pipeline/build_object_data.py")
	lines.append("")
	lines.append("import type { ObjectConfig } from '../src/scene_runtime/types';")
	lines.append("")
	lines.append("export const OBJECT_CATALOG: Record<string, ObjectConfig> = {")

	# Sort objects by name for deterministic output
	for object_name in sorted(objects.keys()):
		obj_data = objects[object_name]
		lines.append(f"\t{object_name}: {{")
		lines.append(f"\t\tobject_name: {json.dumps(obj_data['object_name'])},")
		lines.append(f"\t\tkind: {json.dumps(obj_data['kind'])},")
		lines.append(f"\t\tlabel: {json.dumps(obj_data['label'])},")

		# state_fields
		lines.append("\t\tstate_fields: [")
		for state_field in obj_data.get("state_fields", []):
			lines.append("\t\t\t{")
			lines.append(f"\t\t\t\tfield_name: {json.dumps(state_field['field_name'])},")
			lines.append(f"\t\t\t\ttype: {json.dumps(state_field['type'])},")

			# Add optional fields
			for key in ["allowed", "min", "max", "step", "unit", "applies_to", "description"]:
				if key in state_field:
					lines.append(f"\t\t\t\t{key}: {json.dumps(state_field[key])},")

			lines.append(f"\t\t\t\tdefault: {json.dumps(state_field['default'])},")
			lines.append("\t\t\t},")
		lines.append("\t\t],")

		# visual_states
		lines.append("\t\tvisual_states: {")
		for field_name in sorted(obj_data.get("visual_states", {}).keys()):
			vs_entry = obj_data["visual_states"][field_name]
			lines.append(f"\t\t\t{json.dumps(field_name)}: {{")
			lines.append(f"\t\t\t\tkind: {json.dumps(vs_entry['kind'])},")
			lines.append(f"\t\t\t\tpilot_0_eligible: {json.dumps(vs_entry['pilot_0_eligible'])},")

			# Add optional fields
			if "cases" in vs_entry:
				lines.append(f"\t\t\t\tcases: {json.dumps(vs_entry['cases'])},")
			if "formula" in vs_entry:
				lines.append(f"\t\t\t\tformula: {json.dumps(vs_entry['formula'])},")
			if "deferred_milestone" in vs_entry:
				lines.append(f"\t\t\t\tdeferred_milestone: {json.dumps(vs_entry['deferred_milestone'])},")
			if "reason" in vs_entry:
				lines.append(f"\t\t\t\treason: {json.dumps(vs_entry['reason'])},")

			lines.append("\t\t\t},")
		lines.append("\t\t},")

		# capabilities
		lines.append(f"\t\tcapabilities: {json.dumps(obj_data.get('capabilities', []))},")

		# layout (optional)
		if "layout" in obj_data:
			lines.append(f"\t\tlayout: {json.dumps(obj_data['layout'])},")

		# structure (optional)
		if "structure" in obj_data:
			lines.append(f"\t\tstructure: {json.dumps(obj_data['structure'])},")

		lines.append("\t},")

	lines.append("};")
	lines.append("")

	output_path.write_text("\n".join(lines), encoding="utf-8")


#============================================
# Main
#============================================

def main() -> int:
	"""Main entry point: discover, validate, classify, emit."""
	try:
		# Discover all objects
		objects_by_name = discover_objects()

		if not objects_by_name:
			raise RuntimeError("No object YAML files found under content/objects/")

		# Load and validate each object
		validated_objects = {}

		for object_name in sorted(objects_by_name.keys()):
			file_path = objects_by_name[object_name]

			# Load YAML
			obj = load_yaml(file_path)

			# Validate required fields
			validate_required_field(obj, "object_name", object_name)
			validate_required_field(obj, "kind", object_name)
			validate_required_field(obj, "label", object_name)
			validate_required_field(obj, "state_fields", object_name)
			validate_required_field(obj, "visual_states", object_name)
			validate_required_field(obj, "capabilities", object_name)

			# Validate identity fields
			validate_object_name(obj, file_path)
			validate_kind(obj, object_name)
			validate_kind_matches_folder(obj, file_path, object_name)

			# Validate schemas
			validate_state_fields(obj, object_name)
			validate_visual_states(obj, object_name)
			validate_capabilities(obj, object_name)
			validate_structure_if_present(obj, object_name)

			# Classify visual_states
			visual_states_classified = {}
			for field_name, visual_def in obj.get("visual_states", {}).items():
				visual_states_classified[field_name] = classify_visual_state(
					field_name, visual_def, object_name
				)

			# Build validated object record
			validated_objects[object_name] = {
				"object_name": obj["object_name"],
				"kind": obj["kind"],
				"label": obj["label"],
				"state_fields": obj["state_fields"],
				"visual_states": visual_states_classified,
				"capabilities": obj["capabilities"],
			}

			# Add optional fields
			if "layout" in obj:
				validated_objects[object_name]["layout"] = obj["layout"]
			if "structure" in obj:
				validated_objects[object_name]["structure"] = obj["structure"]

		# Emit TypeScript module
		output_path = REPO_ROOT / "generated" / "object_data.ts"
		output_path.parent.mkdir(parents=True, exist_ok=True)
		emit_object_catalog(validated_objects, output_path)

		print(f"SUCCESS: emitted {output_path}")
		print(f"Generated ObjectConfig records for {len(validated_objects)} objects")

		return 0

	except RuntimeError as e:
		print(f"ERROR: {e}", file=sys.stderr)
		return 1
	except Exception as e:
		print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
		return 1


if __name__ == "__main__":
	sys.exit(main())
