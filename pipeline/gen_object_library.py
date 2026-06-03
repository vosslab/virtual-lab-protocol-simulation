#!/usr/bin/env python3
"""
Codegen for object library from content/objects/**/*.yaml.

Reads object YAML files, validates against closed KINDS enum, layout sizing
fields, and asset references. Emits generated/object_library.ts with typed
ObjectLibrary, AssetSpecs, OBJECT_STATE_SCHEMAS, and OBJECT_SUBPART_STATE_SCHEMAS.

Validation:
- Every object.kind is in the closed KINDS enum.
- Every asset_name in visual_states resolves to an SVG file under assets/**/*.svg.
- Every layout.aspect (if set) is positive.
- Sizing fields (default_width, label_width) are positive numbers.

Output: generated/object_library.ts with:
  OBJECT_LIBRARY       - ObjectDef per object (now includes state_schema, visual_states, subpart_state_schema)
  ASSET_SPECS          - AssetSpec per asset name (aspect ratio, sizing)
  OBJECT_STATE_SCHEMAS - object-level state_fields schema per object (for store validation)
  OBJECT_SUBPART_STATE_SCHEMAS - subpart-level state_fields schema per object (for store validation)
"""

import os
import sys
import xml.etree.ElementTree as ET

import yaml

# Standard Library
import subprocess

# PIP3 modules

# local repo modules


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

def read_kinds_enum(repo_root: str) -> list:
	"""Read KINDS closed enum from src/scene_runtime/layout/constants.ts."""
	constants_path = os.path.join(
		repo_root,
		"src",
		"scene_runtime",
		"layout",
		"constants.ts",
	)
	with open(constants_path, "r") as f:
		content = f.read()

	# Find the KINDS array: export const KINDS = [
	start = content.find('export const KINDS = [')
	if start == -1:
		raise ValueError("KINDS enum not found in constants.ts")

	start += len('export const KINDS = [')
	end = content.find('] as const;', start)
	if end == -1:
		raise ValueError("KINDS enum closing bracket not found")

	kinds_section = content[start:end]
	# Extract quoted strings
	kinds = []
	for line in kinds_section.split('\n'):
		line = line.strip()
		if not line or line.startswith('//'):
			continue
		# Extract quoted string (may have trailing comma)
		if '"' in line:
			first_quote = line.find('"')
			last_quote = line.rfind('"')
			if first_quote != -1 and last_quote != -1 and first_quote < last_quote:
				kind = line[first_quote + 1:last_quote]
				if kind:
					kinds.append(kind)

	if not kinds:
		raise ValueError("Failed to parse KINDS enum")

	return kinds


#============================================

def collect_svg_files(repo_root: str) -> dict:
	"""
	Collect all SVG files under assets/**/*.svg.
	Returns {asset_name: absolute_path}.
	"""
	assets_dir = os.path.join(repo_root, "assets")
	svg_files = {}

	for root, dirs, files in os.walk(assets_dir):
		for file in files:
			if file.endswith(".svg"):
				abs_path = os.path.join(root, file)
				# Asset name is filename without .svg
				asset_name = file[:-4]
				svg_files[asset_name] = abs_path

	return svg_files


#============================================

def get_svg_aspect(svg_path: str) -> float:
	"""
	Extract aspect ratio from SVG viewBox.
	Returns width/height ratio. Fails loud if viewBox is missing or invalid.
	"""
	tree = ET.parse(svg_path)
	root = tree.getroot()

	viewbox = root.get("viewBox")
	if not viewbox:
		raise ValueError(f"SVG missing viewBox: {svg_path}")

	parts = viewbox.split()
	if len(parts) != 4:
		raise ValueError(f"Invalid viewBox format: {svg_path}")

	try:
		x, y, width, height = map(float, parts)
	except ValueError:
		raise ValueError(f"Non-numeric viewBox values: {svg_path}")

	if width <= 0 or height <= 0:
		raise ValueError(f"Invalid viewBox dimensions: {svg_path}")

	return width / height


#============================================

def parse_state_fields(data: dict, yaml_path: str) -> tuple:
	"""
	Parse state_fields list into (object_level, subpart_level) dicts.
	Keys are field_name. Each value is the field mapping from YAML.
	Returns ({field_name: field_def}, {field_name: field_def}).
	"""
	raw_fields = data.get("state_fields", [])
	object_fields = {}
	subpart_fields = {}

	for field in raw_fields:
		field_name = field["field_name"]
		# applies_to defaults to "object"
		applies_to = field.get("applies_to", "object")
		if applies_to == "subpart":
			subpart_fields[field_name] = field
		else:
			object_fields[field_name] = field

	# Also pick up subpart_state_fields from structure block if present
	structure = data.get("structure", {})
	if structure:
		for field in structure.get("subpart_state_fields", []):
			field_name = field["field_name"]
			subpart_fields[field_name] = field

	return object_fields, subpart_fields


#============================================

def parse_visual_states(data: dict, yaml_path: str) -> dict:
	"""
	Parse visual_states mapping from YAML into a structured Python dict.
	Returns {field_name: {kind, applies_to, cases?, formula?}}.
	"""
	raw_vs = data.get("visual_states", {})
	if not raw_vs:
		return {}

	result = {}
	for field_name, vs_def in raw_vs.items():
		if not isinstance(vs_def, dict):
			raise ValueError(
				f"visual_states.{field_name} must be a mapping: {yaml_path}"
			)
		kind = vs_def["kind"]
		applies_to = vs_def.get("applies_to", "object")

		entry = {
			"kind": kind,
			"applies_to": applies_to,
		}

		if "cases" in vs_def:
			entry["cases"] = vs_def["cases"]

		if "formula" in vs_def:
			entry["formula"] = vs_def["formula"]

		result[field_name] = entry

	return result


#============================================

def extract_primary_asset(visual_states: dict, data: dict) -> str | None:
	"""
	Extract the primary asset_name from the object.
	Tries explicit 'asset' field first, then scans visual_states cases.
	Returns asset_name string or None if not found.
	"""
	# Explicit asset override field
	asset_name = data.get("asset")
	if asset_name:
		return asset_name

	# Scan visual_states for the first svg case output
	for field_name, vs_def in visual_states.items():
		if vs_def.get("kind") == "svg":
			for case in vs_def.get("cases", []):
				output = case.get("output", {})
				if isinstance(output, dict) and "asset_name" in output:
					return output["asset_name"]

	return None


#============================================

def emit_state_field_ts(field: dict, indent: str) -> list:
	"""
	Emit TypeScript lines for a single StateFieldDef.
	Returns list of strings (without trailing newline per line).
	"""
	lines = []
	lines.append(indent + "{")
	lines.append(f"{indent}\tfield_name: {repr(field['field_name'])},")
	lines.append(f"{indent}\ttype: {repr(field['type'])},")

	default_val = field["default"]
	if isinstance(default_val, bool):
		lines.append(f"{indent}\tdefault: {str(default_val).lower()},")
	elif isinstance(default_val, str):
		lines.append(f"{indent}\tdefault: {repr(default_val)},")
	else:
		lines.append(f"{indent}\tdefault: {default_val},")

	applies_to = field.get("applies_to", "object")
	lines.append(f"{indent}\tapplies_to: {repr(applies_to)},")

	# enum-specific
	if field["type"] == "enum" and "allowed" in field:
		allowed = field["allowed"]
		allowed_str = "[" + ", ".join(repr(v) for v in allowed) + "]"
		lines.append(f"{indent}\tallowed: {allowed_str},")

	# numeric-specific
	for key in ["unit", "min", "max", "step"]:
		if key in field:
			val = field[key]
			if isinstance(val, str):
				lines.append(f"{indent}\t{key}: {repr(val)},")
			else:
				lines.append(f"{indent}\t{key}: {val},")

	if "description" in field:
		lines.append(f"{indent}\tdescription: {repr(field['description'])},")

	lines.append(indent + "}")
	return lines


#============================================

def emit_visual_state_case_ts(case: dict, indent: str) -> list:
	"""Emit TypeScript lines for one VisualStateCase."""
	lines = []
	lines.append(indent + "{")

	when_val = case["when"]
	if isinstance(when_val, bool):
		lines.append(f"{indent}\twhen: {str(when_val).lower()},")
	elif isinstance(when_val, str):
		lines.append(f"{indent}\twhen: {repr(when_val)},")
	else:
		lines.append(f"{indent}\twhen: {when_val},")

	# Emit output
	output = case["output"]
	lines.extend(emit_visual_state_output_ts(output, indent + "\t", key="output"))

	lines.append(indent + "},")
	return lines


#============================================

def emit_visual_state_output_ts(output: dict, indent: str, key: str = "output") -> list:
	"""Emit TypeScript lines for a VisualStateOutput mapping."""
	lines = []
	if "asset_name" in output:
		lines.append(f"{indent}{key}: {{ asset_name: {repr(output['asset_name'])} }},")
	elif "overlay_name" in output:
		lines.append(f"{indent}{key}: {{ overlay_name: {repr(output['overlay_name'])} }},")
	elif "composite" in output:
		lines.append(f"{indent}{key}: {{ composite: [")
		for sub_output in output["composite"]:
			# Inline emit of each composite sub-output as an object literal
			lines.append(indent + "\t\t{")
			if "asset_name" in sub_output:
				lines.append(f"{indent}\t\t\tasset_name: {repr(sub_output['asset_name'])},")
			elif "overlay_name" in sub_output:
				lines.append(f"{indent}\t\t\toverlay_name: {repr(sub_output['overlay_name'])},")
			lines.append(indent + "\t\t},")
		lines.append(indent + "\t] },")
	else:
		# Empty composite (kind: composite with no cases)
		lines.append(f"{indent}{key}: {{ composite: [] }},")
	return lines


#============================================

def emit_visual_states_ts(visual_states: dict, indent: str) -> list:
	"""Emit TypeScript lines for the visual_states block on an ObjectDef."""
	lines = []
	lines.append(f"{indent}visual_states: " + "{")
	for field_name, vs_def in sorted(visual_states.items()):
		lines.append(f"{indent}\t{repr(field_name)}: " + "{")
		lines.append(f"{indent}\t\tkind: {repr(vs_def['kind'])},")
		lines.append(f"{indent}\t\tapplies_to: {repr(vs_def['applies_to'])},")
		if "cases" in vs_def:
			lines.append(f"{indent}\t\tcases: [")
			for case in vs_def["cases"]:
				case_lines = emit_visual_state_case_ts(case, indent + "\t\t\t")
				lines.extend(case_lines)
			lines.append(f"{indent}\t\t],")
		if "formula" in vs_def:
			lines.append(f"{indent}\t\tformula: {repr(vs_def['formula'])},")
		lines.append(f"{indent}\t" + "},")
	lines.append(f"{indent}" + "},")
	return lines


#============================================

def emit_state_schema_ts(state_fields: dict, indent: str) -> list:
	"""Emit TypeScript lines for a state schema block (object or subpart level)."""
	lines = []
	lines.append("{")
	for field_name in sorted(state_fields.keys()):
		field = state_fields[field_name]
		field_lines = emit_state_field_ts(field, indent + "\t")
		lines.append(f"{indent}\t{repr(field_name)}: " + field_lines[0].strip())
		for fl in field_lines[1:-1]:
			lines.append(fl)
		lines.append(indent + "\t" + field_lines[-1].strip() + ",")
	lines.append(indent + "}")
	return lines


#============================================

def process_object_yaml(
	yaml_path: str,
	svg_files: dict,
	kinds_enum: list,
) -> tuple:
	"""
	Load and validate a single object YAML.
	Returns (object_def, asset_spec) or raises on validation failure.
	"""
	# Log file path before opening
	print(f"processing {yaml_path}", file=sys.stderr)

	with open(yaml_path, "r") as f:
		data = yaml.safe_load(f)

	if not data:
		raise ValueError(f"Empty YAML: {yaml_path}")

	# Validate required identity fields
	object_name = data["object_name"]
	kind = data["kind"]
	label = data["label"]

	if kind not in kinds_enum:
		raise ValueError(
			f"Invalid kind '{kind}' not in KINDS enum: {yaml_path}"
		)

	# Parse state fields (object-level vs subpart-level)
	object_state_fields, subpart_state_fields = parse_state_fields(data, yaml_path)

	# Parse visual_states into structured form
	visual_states = parse_visual_states(data, yaml_path)

	# Extract primary asset_name (for layout engine asset lookup)
	asset_name = extract_primary_asset(visual_states, data)
	if not asset_name:
		raise ValueError(f"Missing asset_name: {yaml_path}")

	# Resolve SVG file - required for the primary asset
	if asset_name not in svg_files:
		raise ValueError(
			f"Asset '{asset_name}' not found in SVG registry: {yaml_path}"
		)

	svg_path = svg_files[asset_name]

	# Validate capabilities
	capabilities = data.get("capabilities", [])
	if not isinstance(capabilities, list):
		raise ValueError(f"capabilities must be a list: {yaml_path}")

	# Get layout hints
	layout = data["layout"]
	if not isinstance(layout, dict):
		raise ValueError(f"layout must be a dict: {yaml_path}")

	default_width = float(layout["default_width"])
	if default_width <= 0:
		raise ValueError(
			f"layout.default_width must be positive: {yaml_path}"
		)

	label_width = float(layout["label_width"])
	if label_width <= 0:
		raise ValueError(f"layout.label_width must be positive: {yaml_path}")

	# Optional: custom aspect ratio override
	aspect_override = layout.get("aspect")
	if aspect_override is not None:
		aspect = float(aspect_override)
		if aspect <= 0:
			raise ValueError(f"layout.aspect must be positive: {yaml_path}")
	else:
		# Derive from SVG viewBox
		aspect = get_svg_aspect(svg_path)

	# Build layout dict
	layout_dict = {
		"default_width": default_width,
		"label_width": label_width,
	}
	# Preserve other layout fields (anchor_y, anchor_y_offset, width_scale, etc.)
	for key in [
		"anchor_y",
		"anchor_y_offset",
		"width_scale",
		"display_width_cm",
		"fudge",
	]:
		if key in layout:
			layout_dict[key] = layout[key]

	# Build full object definition including state schema and visual_states
	object_def = {
		"object_name": object_name,
		"kind": kind,
		"label": label,
		"asset": asset_name,
		"capabilities": capabilities,
		"layout": layout_dict,
		"object_state_fields": object_state_fields,
		"subpart_state_fields": subpart_state_fields,
		"visual_states": visual_states,
	}

	# Build asset spec
	asset_spec = {
		"default_width": default_width,
		"label_width": label_width,
		"aspect": aspect,
	}

	return object_def, asset_spec


#============================================

def emit_object_def_ts(object_name: str, obj: dict) -> list:
	"""Emit the TypeScript lines for one OBJECT_LIBRARY entry."""
	lines = []
	lines.append(f"\t{repr(object_name)}: " + "{")
	lines.append(f"\t\tobject_name: {repr(obj['object_name'])},")
	lines.append(f"\t\tkind: {repr(obj['kind'])},")
	lines.append(f"\t\tlabel: {repr(obj['label'])},")
	lines.append(f"\t\tasset: {repr(obj['asset'])},")

	# capabilities
	caps = obj["capabilities"]
	lines.append("\t\tcapabilities: [")
	for cap in caps:
		lines.append(f"\t\t\t{repr(cap)},")
	lines.append("\t\t],")

	# layout
	lines.append("\t\tlayout: " + "{")
	layout = obj["layout"]
	for key in [
		"default_width",
		"label_width",
		"anchor_y",
		"anchor_y_offset",
		"width_scale",
		"display_width_cm",
		"fudge",
	]:
		if key in layout:
			val = layout[key]
			if isinstance(val, str):
				lines.append(f"\t\t\t{key}: {repr(val)},")
			else:
				lines.append(f"\t\t\t{key}: {val},")
	lines.append("\t\t},")

	# state_schema (object-level fields only)
	object_fields = obj["object_state_fields"]
	lines.append("\t\tstate_schema: {")
	for field_name in sorted(object_fields.keys()):
		field = object_fields[field_name]
		field_lines = emit_state_field_ts(field, "\t\t\t")
		lines.append(f"\t\t\t{repr(field_name)}: " + "{")
		# Emit the field body (skip first '{' and last '}' lines, add content)
		for fl in field_lines[1:-1]:
			lines.append(fl)
		lines.append("\t\t\t},")
	lines.append("\t\t},")

	# visual_states
	vs_lines = emit_visual_states_ts(obj["visual_states"], "\t\t")
	lines.extend(vs_lines)

	# subpart_state_schema
	subpart_fields = obj["subpart_state_fields"]
	lines.append("\t\tsubpart_state_schema: {")
	for field_name in sorted(subpart_fields.keys()):
		field = subpart_fields[field_name]
		field_lines = emit_state_field_ts(field, "\t\t\t")
		lines.append(f"\t\t\t{repr(field_name)}: " + "{")
		for fl in field_lines[1:-1]:
			lines.append(fl)
		lines.append("\t\t\t},")
	lines.append("\t\t},")

	lines.append("\t},")
	return lines


#============================================

def emit_schema_registry_ts(
	registry: dict,
	export_name: str,
	type_name: str,
) -> list:
	"""
	Emit TypeScript lines for OBJECT_STATE_SCHEMAS or OBJECT_SUBPART_STATE_SCHEMAS.
	registry: {object_name: {field_name: field_def}}
	"""
	lines = []
	lines.append(f"export const {export_name}: {type_name} = " + "{")
	for object_name in sorted(registry.keys()):
		fields = registry[object_name]
		lines.append(f"\t{repr(object_name)}: " + "{")
		for field_name in sorted(fields.keys()):
			field = fields[field_name]
			field_lines = emit_state_field_ts(field, "\t\t")
			lines.append(f"\t\t{repr(field_name)}: " + "{")
			for fl in field_lines[1:-1]:
				lines.append(fl)
			lines.append("\t\t},")
		lines.append("\t},")
	lines.append("};")
	return lines


#============================================

def main() -> None:
	"""Main entry point for the object-library generator."""
	repo_root = get_repo_root()

	# Read KINDS enum
	kinds_enum = read_kinds_enum(repo_root)

	# Collect SVG files
	svg_files = collect_svg_files(repo_root)

	# Find all object YAML files
	objects_dir = os.path.join(repo_root, "content", "objects")
	if not os.path.isdir(objects_dir):
		raise ValueError(f"Objects directory not found: {objects_dir}")

	object_files = []
	for root, dirs, files in os.walk(objects_dir):
		for file in files:
			if file.endswith(".yaml"):
				abs_path = os.path.join(root, file)
				object_files.append(abs_path)

	object_files.sort()

	# Fixture-local objects from tests/content/dev_smoke/*/objects/. tests/content/
	# is the explicit dev/test content root for smoke fixtures (PRIMARY_SPEC.md
	# "Source-code and content layout"). gen_scene_index.py already discovers
	# these fixture-local object dirs for scene placement cross-checks; the object
	# library must carry the same objects so the runtime store can seed their
	# declared state_fields when a smoke scene renders them. These are processed
	# with tolerant failure: a smoke fixture may INTENTIONALLY reference a missing
	# asset (e.g. missing_svg_check) to exercise the placeholder path, so a
	# processing failure here is skipped with a warning rather than failing the
	# whole build (curriculum objects below keep strict hard-fail).
	smoke_object_files = []
	smoke_dir = os.path.join(repo_root, "tests", "content", "dev_smoke")
	if os.path.isdir(smoke_dir):
		for subdir in sorted(os.listdir(smoke_dir)):
			local_objects_dir = os.path.join(smoke_dir, subdir, "objects")
			if not os.path.isdir(local_objects_dir):
				continue
			for root, dirs, files in os.walk(local_objects_dir):
				for file in sorted(files):
					if file.endswith(".yaml"):
						smoke_object_files.append(os.path.join(root, file))

	# Process each curriculum object YAML (strict hard-fail). No try/except:
	# a malformed curriculum object is a real build error and must surface
	# loudly (fix the design, not the symptom). process_object_yaml raises
	# ValueError on validation failure and KeyError on a missing required
	# field; both should abort the build with a full traceback naming the file.
	object_library = {}
	asset_specs = {}

	for yaml_path in object_files:
		obj_def, asset_spec = process_object_yaml(
			yaml_path,
			svg_files,
			kinds_enum,
		)
		object_name = obj_def["object_name"]
		object_library[object_name] = obj_def
		asset_specs[obj_def["asset"]] = asset_spec

	# Process fixture-local smoke objects (tolerant: skip on failure with a warn).
	# A dev_smoke fixture may INTENTIONALLY be broken to exercise a runtime path
	# (e.g. missing_svg_check references a missing asset to test the placeholder
	# path). Those deliberate breaks surface as one of these expected types:
	#   - ValueError: validation failure (including missing asset in registry),
	#   - KeyError: a required YAML field omitted on purpose,
	#   - yaml.YAMLError: a deliberately malformed YAML fixture,
	#   - FileNotFoundError: a fixture that references a moved/missing path.
	# We narrow the catch to exactly those types so a genuine bug in the generator
	# itself (TypeError, AttributeError, etc.) still aborts the build with a full
	# traceback rather than being silently skipped as an intentional fixture break.
	for yaml_path in smoke_object_files:
		try:
			obj_def, asset_spec = process_object_yaml(
				yaml_path,
				svg_files,
				kinds_enum,
			)
			object_name = obj_def["object_name"]
			object_library[object_name] = obj_def
			asset_specs[obj_def["asset"]] = asset_spec
		except (ValueError, KeyError, yaml.YAMLError, FileNotFoundError) as e:
			# Intentional fixture break: skip it rather than break the build.
			print(f"SKIP smoke object {yaml_path}: {e}", file=sys.stderr)

	# Generate TypeScript output
	output_path = os.path.join(repo_root, "generated", "object_library.ts")

	# Create generated directory if needed
	os.makedirs(os.path.dirname(output_path), exist_ok=True)

	# Build TypeScript code
	ts_lines = [
		"// AUTO-GENERATED. Do not edit by hand.",
		"",
		"import type {",
		"\tAssetSpecs,",
		"\tObjectLibrary,",
		"\tObjectStateSchemas,",
		"\tObjectSubpartStateSchemas,",
		"} from '../src/scene_runtime/layout/types.js';",
		"",
		"export const OBJECT_LIBRARY: ObjectLibrary = {",
	]

	for object_name in sorted(object_library.keys()):
		obj = object_library[object_name]
		ts_lines.extend(emit_object_def_ts(object_name, obj))

	ts_lines.append("};")
	ts_lines.append("")
	ts_lines.append("export const ASSET_SPECS: AssetSpecs = {")

	for asset_name in sorted(asset_specs.keys()):
		spec = asset_specs[asset_name]
		ts_lines.append(f"\t{repr(asset_name)}: " + "{")
		ts_lines.append(f"\t\tdefault_width: {spec['default_width']},")
		ts_lines.append(f"\t\tlabel_width: {spec['label_width']},")
		ts_lines.append(f"\t\taspect: {spec['aspect']},")
		ts_lines.append("\t},")

	ts_lines.append("};")
	ts_lines.append("")

	# Build OBJECT_STATE_SCHEMAS (object-level fields only)
	object_state_registry = {
		name: obj["object_state_fields"]
		for name, obj in object_library.items()
	}
	ts_lines.extend(
		emit_schema_registry_ts(
			object_state_registry,
			"OBJECT_STATE_SCHEMAS",
			"ObjectStateSchemas",
		)
	)
	ts_lines.append("")

	# Build OBJECT_SUBPART_STATE_SCHEMAS (subpart-level fields only)
	subpart_state_registry = {
		name: obj["subpart_state_fields"]
		for name, obj in object_library.items()
	}
	ts_lines.extend(
		emit_schema_registry_ts(
			subpart_state_registry,
			"OBJECT_SUBPART_STATE_SCHEMAS",
			"ObjectSubpartStateSchemas",
		)
	)

	ts_code = "\n".join(ts_lines)

	# Write output file
	with open(output_path, "w") as f:
		f.write(ts_code)

	print(
		f"Generated {output_path} with {len(object_library)} objects"
		f" and {len(asset_specs)} asset specs",
		file=sys.stderr,
	)


#============================================

if __name__ == "__main__":
	main()
