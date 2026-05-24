#!/usr/bin/env python3
"""
Codegen for object library from content/objects/**/*.yaml.

Reads object YAML files, validates against closed KINDS enum, layout sizing
fields, and asset references. Emits generated/object_library.ts with typed
ObjectLibrary and AssetSpecs for the layout engine.

Validation:
- Every object.kind is in the closed KINDS enum.
- Every object.asset resolves to an SVG file under assets/**/*.svg.
- Every layout.aspect (if set) is positive.
- Sizing fields (default_width, label_width) are positive numbers.

Output: generated/object_library.ts with OBJECT_LIBRARY and ASSET_SPECS exports.
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
		# Match "word", or "word",
		if '"' in line:
			# Find first quote and last quote on the line
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

def process_object_yaml(
	yaml_path: str,
	svg_files: dict,
	kinds_enum: list,
) -> tuple:
	"""
	Load and validate a single object YAML.
	Returns (object_def, asset_spec) or raises on validation failure.
	"""
	# Log file path before opening (per Python style guide)
	print(f"processing {yaml_path}", file=sys.stderr)

	with open(yaml_path, "r") as f:
		data = yaml.safe_load(f)

	if not data:
		raise ValueError(f"Empty YAML: {yaml_path}")

	# Validate required fields
	object_name = data.get("object_name")
	if not object_name:
		raise ValueError(f"Missing object_name: {yaml_path}")

	kind = data.get("kind")
	if not kind:
		raise ValueError(f"Missing kind: {yaml_path}")

	if kind not in kinds_enum:
		raise ValueError(
			f"Invalid kind '{kind}' not in KINDS enum: {yaml_path}"
		)

	label = data.get("label")
	if not label:
		raise ValueError(f"Missing label: {yaml_path}")

	# Get asset name from visual_states or from explicit asset field
	asset_name = data.get("asset")
	if not asset_name:
		# Try to extract from visual_states
		visual_states = data.get("visual_states", {})
		if visual_states:
			# Find first asset_name in the visual states
			for state_name, state_def in visual_states.items():
				if isinstance(state_def, dict):
					cases = state_def.get("cases", [])
					for case in cases:
						if isinstance(case, dict):
							output = case.get("output", {})
							if isinstance(output, dict):
								asset_name = output.get("asset_name")
								if asset_name:
									break
				if asset_name:
					break

	if not asset_name:
		raise ValueError(f"Missing asset_name: {yaml_path}")

	# Resolve SVG file
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
	layout = data.get("layout", {})
	if not isinstance(layout, dict):
		raise ValueError(f"layout must be a dict: {yaml_path}")

	default_width = layout.get("default_width")
	if default_width is None:
		raise ValueError(f"Missing layout.default_width: {yaml_path}")

	try:
		default_width = float(default_width)
	except (TypeError, ValueError):
		raise ValueError(
			f"layout.default_width must be numeric: {yaml_path}"
		)

	if default_width <= 0:
		raise ValueError(
			f"layout.default_width must be positive: {yaml_path}"
		)

	label_width = layout.get("label_width")
	if label_width is None:
		raise ValueError(f"Missing layout.label_width: {yaml_path}")

	try:
		label_width = float(label_width)
	except (TypeError, ValueError):
		raise ValueError(f"layout.label_width must be numeric: {yaml_path}")

	if label_width <= 0:
		raise ValueError(f"layout.label_width must be positive: {yaml_path}")

	# Optional: custom aspect ratio override
	aspect_override = layout.get("aspect")
	if aspect_override is not None:
		try:
			aspect_override = float(aspect_override)
		except (TypeError, ValueError):
			raise ValueError(f"layout.aspect must be numeric: {yaml_path}")

		if aspect_override <= 0:
			raise ValueError(f"layout.aspect must be positive: {yaml_path}")
		aspect = aspect_override
	else:
		# Derive from SVG viewBox
		aspect = get_svg_aspect(svg_path)

	# Build object definition (TypeScript ObjectDef)
	object_def = {
		"object_name": object_name,
		"kind": kind,
		"label": label,
		"asset": asset_name,
		"capabilities": capabilities,
		"layout": {
			"default_width": default_width,
			"label_width": label_width,
		},
		# Optionally include other layout fields if present
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
			object_def["layout"][key] = layout[key]

	# Build asset spec
	asset_spec = {
		"default_width": default_width,
		"label_width": label_width,
		"aspect": aspect,
	}

	return object_def, asset_spec


#============================================

def main() -> None:
	"""Main entry point for codegen."""
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

	# Process each object YAML
	object_library = {}
	asset_specs = {}
	failed_count = 0

	for yaml_path in object_files:
		try:
			obj_def, asset_spec = process_object_yaml(
				yaml_path,
				svg_files,
				kinds_enum,
			)
			object_name = obj_def["object_name"]
			object_library[object_name] = obj_def
			asset_specs[obj_def["asset"]] = asset_spec
		except Exception as e:
			# Log the error with the file path for visibility
			print(f"ERROR processing {yaml_path}: {e}", file=sys.stderr)
			failed_count += 1

	if failed_count > 0:
		sys.exit(1)

	# Generate TypeScript output
	output_path = os.path.join(repo_root, "generated", "object_library.ts")

	# Create generated directory
	os.makedirs(os.path.dirname(output_path), exist_ok=True)

	# Build TypeScript code
	ts_lines = [
		"// AUTO-GENERATED. Do not edit by hand.",
		"",
		"import type { AssetSpecs, ObjectLibrary } from '../src/scene_runtime/layout/types.js';",
		"",
		"export const OBJECT_LIBRARY: ObjectLibrary = {",
	]

	for object_name in sorted(object_library.keys()):
		obj = object_library[object_name]
		ts_lines.append(f"\t{repr(object_name)}: " + "{" )
		ts_lines.append(f"\t\tobject_name: {repr(obj['object_name'])},")
		ts_lines.append(f"\t\tkind: {repr(obj['kind'])},")
		ts_lines.append(f"\t\tlabel: {repr(obj['label'])},")
		ts_lines.append(f"\t\tasset: {repr(obj['asset'])},")

		# capabilities
		caps = obj["capabilities"]
		ts_lines.append("\t\tcapabilities: [")
		for cap in caps:
			ts_lines.append(f"\t\t\t{repr(cap)},")
		ts_lines.append("\t\t],")

		# layout
		ts_lines.append("\t\tlayout: " + "{" )
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
					ts_lines.append(f"\t\t\t{key}: {repr(val)},")
				else:
					ts_lines.append(f"\t\t\t{key}: {val},")
		ts_lines.append("\t\t},")

		ts_lines.append("\t},")

	ts_lines.append("};")
	ts_lines.append("")
	ts_lines.append("export const ASSET_SPECS: AssetSpecs = {")

	for asset_name in sorted(asset_specs.keys()):
		spec = asset_specs[asset_name]
		ts_lines.append(f"\t{repr(asset_name)}: " + "{" )
		ts_lines.append(f"\t\tdefault_width: {spec['default_width']},")
		ts_lines.append(f"\t\tlabel_width: {spec['label_width']},")
		ts_lines.append(f"\t\taspect: {spec['aspect']},")
		ts_lines.append("\t},")

	ts_lines.append("};")

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
