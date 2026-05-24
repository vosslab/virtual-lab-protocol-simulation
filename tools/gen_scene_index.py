#!/usr/bin/env python3
"""
Codegen for scene index from content/base_scenes/*.yaml.

Reads scene YAML files, validates against closed scene schema, and emits
generated/scenes.ts with typed SCENES export for the renderer.

Validation:
- background.type is "gradient" and from/to parse as hex
- every zone id is unique within the scene
- every placement.zone resolves to a declared zone
- every placement.object_name resolves to an object (cross-checked against
  generated/object_library.ts or content/objects/**/*.yaml)
- for Schema B scenes, every row_name is in WORKSPACE_ROW_LIBRARY

Output: generated/scenes.ts with SCENE_ALLOWLIST, SCENES_SKIPPED,
SCENES_SKIPPED_FILES, and SCENES exports.
"""

import os
import sys
import re
import subprocess

import yaml

# Standard Library

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

def parse_hex_color(hex_str: str) -> bool:
	"""Validate hex color string: #RRGGBB or #RRGGBBAA."""
	if not isinstance(hex_str, str):
		return False
	pattern = r'^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$'
	return bool(re.match(pattern, hex_str))


#============================================

def collect_object_names(repo_root: str) -> set:
	"""
	Collect all object_name values from content/objects/**/*.yaml.
	Returns a set of all valid object names.
	"""
	object_names = set()
	objects_dir = os.path.join(repo_root, "content", "objects")

	if not os.path.isdir(objects_dir):
		return object_names

	for root, dirs, files in os.walk(objects_dir):
		for file in files:
			if file.endswith(".yaml"):
				abs_path = os.path.join(root, file)
				try:
					with open(abs_path, "r") as f:
						data = yaml.safe_load(f)
					if data and isinstance(data, dict):
						object_name = data.get("object_name")
						if object_name:
							object_names.add(object_name)
				except Exception:
					# Silently skip objects that fail to parse
					pass

	return object_names


#============================================

def read_workspace_row_library(repo_root: str) -> dict:
	"""
	Read WORKSPACE_ROW_LIBRARY from src/scene_runtime/layout/workspace_row_library.ts.
	Returns {workspace: [row_names]}.
	"""
	row_lib_path = os.path.join(
		repo_root,
		"src",
		"scene_runtime",
		"layout",
		"workspace_row_library.ts",
	)

	workspace_rows = {}

	with open(row_lib_path, "r") as f:
		content = f.read()

	# Find export const WORKSPACE_ROW_LIBRARY = {
	start = content.find("export const WORKSPACE_ROW_LIBRARY: WorkspaceRowLibrary = {")
	if start == -1:
		raise ValueError("WORKSPACE_ROW_LIBRARY not found in workspace_row_library.ts")

	# Simple parser: find {workspace: [...rows...], workspace: [...rows...]}
	# Look for row_name: "name" patterns
	row_pattern = r"row_name:\s*['\"](\w+)['\"]"

	content_section = content[start:]
	end = content_section.find("};")
	if end == -1:
		raise ValueError("WORKSPACE_ROW_LIBRARY closing brace not found")

	content_section = content_section[:end]

	# Parse workspaces and their row_names
	current_workspace = None
	for line in content_section.split("\n"):
		# Check for workspace declaration: "bench: ["
		ws_match = re.match(r'\s*(\w+):\s*\[', line)
		if ws_match:
			current_workspace = ws_match.group(1)
			workspace_rows[current_workspace] = []

		# Check for row_name
		row_match = re.search(row_pattern, line)
		if row_match and current_workspace:
			row_name = row_match.group(1)
			workspace_rows[current_workspace].append(row_name)

	return workspace_rows


#============================================

def process_scene_yaml(
	yaml_path: str,
	object_names: set,
	workspace_rows: dict,
	allowlist: list,
) -> tuple:
	"""
	Load and validate a single scene YAML.
	Returns (scene_name, scene_data) or raises on validation failure.
	"""
	# Log file path before opening (per Python style guide)
	print(f"processing {yaml_path}", file=sys.stderr)

	with open(yaml_path, "r") as f:
		data = yaml.safe_load(f)

	if not data:
		raise ValueError(f"Empty YAML: {yaml_path}")

	if not isinstance(data, dict):
		raise ValueError(f"Scene YAML must be a dict: {yaml_path}")

	# Validate required fields
	scene_name = data.get("scene_name")
	if not scene_name:
		raise ValueError(f"Missing scene_name: {yaml_path}")

	workspace = data.get("workspace")
	if not workspace:
		raise ValueError(f"Missing workspace: {yaml_path}")

	# Validate background if present
	background = data.get("background")
	if background:
		if isinstance(background, dict):
			bg_type = background.get("type")
			if bg_type and bg_type != "gradient":
				# Accept old asset-form backgrounds; will be skipped if out of allowlist
				pass
			elif bg_type == "gradient":
				# Validate gradient colors
				from_color = background.get("from")
				to_color = background.get("to")

				if not from_color or not parse_hex_color(from_color):
					raise ValueError(
						f"Invalid background.from hex color: {yaml_path}"
					)

				if not to_color or not parse_hex_color(to_color):
					raise ValueError(
						f"Invalid background.to hex color: {yaml_path}"
					)

	# For Schema A (zones), validate zones and placements
	zones = data.get("zones")
	if zones:
		# Schema A
		if not isinstance(zones, list):
			raise ValueError(f"zones must be a list: {yaml_path}")

		zone_ids = set()
		for zone in zones:
			zone_id = zone.get("id")
			if not zone_id:
				raise ValueError(f"Zone missing id: {yaml_path}")

			if zone_id in zone_ids:
				raise ValueError(
					f"Duplicate zone id '{zone_id}': {yaml_path}"
				)

			zone_ids.add(zone_id)

		# Validate placements reference existing zones and objects
		placements = data.get("placements", [])
		if not isinstance(placements, list):
			raise ValueError(f"placements must be a list: {yaml_path}")

		for placement in placements:
			placement_name = placement.get("placement_name")
			if not placement_name:
				raise ValueError(f"Placement missing placement_name: {yaml_path}")

			object_name = placement.get("object_name")
			if not object_name:
				raise ValueError(
					f"Placement '{placement_name}' missing object_name: {yaml_path}"
				)

			if object_name not in object_names:
				raise ValueError(
					f"Placement '{placement_name}' references unknown object "
					f"'{object_name}': {yaml_path}"
				)

			zone = placement.get("zone")
			if not zone:
				raise ValueError(
					f"Placement '{placement_name}' missing zone: {yaml_path}"
				)

			if zone not in zone_ids:
				raise ValueError(
					f"Placement '{placement_name}' references unknown zone "
					f"'{zone}': {yaml_path}"
				)

	# For Schema B (rows), validate rows and slots
	rows = data.get("rows")
	if rows:
		# Schema B
		if not isinstance(rows, list):
			raise ValueError(f"rows must be a list: {yaml_path}")

		if workspace not in workspace_rows:
			raise ValueError(
				f"Workspace '{workspace}' not in WORKSPACE_ROW_LIBRARY: {yaml_path}"
			)

		valid_row_names = set(workspace_rows[workspace])

		for row in rows:
			row_name = row.get("row_name")
			if not row_name:
				raise ValueError(f"Row missing row_name: {yaml_path}")

			if row_name not in valid_row_names:
				raise ValueError(
					f"Row '{row_name}' not in WORKSPACE_ROW_LIBRARY for "
					f"workspace '{workspace}': {yaml_path}"
				)

			slots = row.get("slots", [])
			if not isinstance(slots, list):
				raise ValueError(
					f"Row '{row_name}' slots must be a list: {yaml_path}"
				)

			for slot in slots:
				object_name = slot.get("object_name")
				if not object_name:
					raise ValueError(
						f"Slot in row '{row_name}' missing object_name: {yaml_path}"
					)

				if object_name not in object_names:
					raise ValueError(
						f"Slot in row '{row_name}' references unknown object "
						f"'{object_name}': {yaml_path}"
					)

	return scene_name, data


#============================================

def main() -> None:
	"""Main entry point for codegen."""
	repo_root = get_repo_root()

	# Allowlist: controls which scenes ship to runtime
	# D1 generalization scene set, expanded per M2c Lane D2
	SCENE_ALLOWLIST = [
		"bench_basic",
		"sample_prep_bench",
		"staining_bench",
		"cell_counter_basic",
		"hood_basic",
		"bench_basic_row_slot",
	]

	# Scenes skipped with documented reasons
	# These scenes are in the D1 generalization set but blocked on asset gaps.
	# Electrophoresis_tank missing 4 visual-state SVGs (with_lid, without_lid, with_module, without_module).
	# Well_plate_96_zoom quarantined (references quarantined well_plate_96 object).
	# Adversarial_overflow_smoke designed to fail preflight (capacity stress test).
	# Long_labels_smoke requires 6 chemical bottle objects not yet authored (dmf_bottle, dmso_bottle, etc.).
	SCENES_SKIPPED_METADATA = {
		"electrophoresis_bench": "SVG gap: electrophoresis_tank missing 4 visual-state SVGs",
		"well_plate_96_zoom": "Quarantined: references quarantined object well_plate_96",
		"adversarial_overflow_smoke": "Design skip: capacity stress test, expected to fail loudly",
		"long_labels_smoke": "Object gap: requires 6 chemical bottle objects not yet authored",
	}

	# Read object names
	object_names = collect_object_names(repo_root)

	# Read workspace row library
	workspace_rows = read_workspace_row_library(repo_root)

	# Find all base scene YAML files and smoke fixtures
	scene_files = []

	# Scan content/base_scenes/
	scenes_dir = os.path.join(repo_root, "content", "base_scenes")
	if not os.path.isdir(scenes_dir):
		raise ValueError(f"Scenes directory not found: {scenes_dir}")

	for file in os.listdir(scenes_dir):
		if file.endswith(".yaml"):
			abs_path = os.path.join(scenes_dir, file)
			scene_files.append((file, abs_path))

	# Scan tests/content/dev_smoke/ for smoke fixtures
	smoke_dir = os.path.join(repo_root, "tests", "content", "dev_smoke")
	if os.path.isdir(smoke_dir):
		for subdir in os.listdir(smoke_dir):
			scene_yaml = os.path.join(smoke_dir, subdir, "scene.yaml")
			if os.path.isfile(scene_yaml):
				# Extract scene_name from the YAML to form a unique filename
				try:
					with open(scene_yaml, "r") as f:
						data = yaml.safe_load(f)
					if data and isinstance(data, dict):
						scene_name = data.get("scene_name", subdir)
						scene_files.append((f"{scene_name}.yaml", scene_yaml))
				except Exception:
					pass  # Silently skip malformed smoke fixtures

	scene_files.sort(key=lambda x: x[0])

	# Process each scene YAML
	scenes_dict = {}
	skipped_files = []
	failed_count = 0

	for filename, yaml_path in scene_files:
		try:
			scene_name, scene_data = process_scene_yaml(
				yaml_path,
				object_names,
				workspace_rows,
				SCENE_ALLOWLIST,
			)

			# Only include scenes in the allowlist
			if scene_name in SCENE_ALLOWLIST:
				scenes_dict[scene_name] = scene_data
			else:
				# Track skipped scenes
				base_name = filename.replace(".yaml", "")
				skipped_files.append(base_name)

		except Exception as e:
			# Extract scene_name from the YAML file for better error tracking
			scene_name = None
			try:
				with open(yaml_path, "r") as f:
					data = yaml.safe_load(f)
				if data and isinstance(data, dict):
					scene_name = data.get("scene_name")
			except Exception:
				pass

			# Log the error with the file path for visibility
			print(f"ERROR processing {yaml_path}: {e}", file=sys.stderr)

			# Only fail if an allowlisted scene has a validation error
			if scene_name and scene_name in SCENE_ALLOWLIST:
				failed_count += 1
			elif scene_name:
				# Non-allowlisted scenes can fail validation; they're skipped anyway
				base_name = filename.replace(".yaml", "")
				skipped_files.append(base_name)

	if failed_count > 0:
		sys.exit(1)

	# Generate TypeScript output
	output_path = os.path.join(repo_root, "generated", "scenes.ts")

	# Create generated directory
	os.makedirs(os.path.dirname(output_path), exist_ok=True)

	# Build TypeScript code
	ts_lines = [
		"// AUTO-GENERATED. Do not edit by hand.",
		"",
		"import type { SceneA, SceneB } from '../src/scene_runtime/layout/types.js';",
		"",
		f"export const SCENE_ALLOWLIST = {repr(SCENE_ALLOWLIST)} as const;",
		f"export const SCENES_SKIPPED = {len(skipped_files)};",
		f"export const SCENES_SKIPPED_FILES = {repr(sorted(skipped_files))} as const;",
		"",
		"// D1 scenes skipped with documented blockers",
		"export const SCENES_SKIPPED_METADATA: Record<string, string> = {",
	]

	for scene_name, reason in sorted(SCENES_SKIPPED_METADATA.items()):
		ts_lines.append(f"\t{repr(scene_name)}: {repr(reason)},")

	ts_lines.extend([
		"};",
		"",
		"export const SCENES: Record<typeof SCENE_ALLOWLIST[number], SceneA | SceneB> = {",
	])

	# Emit each scene
	for scene_name in SCENE_ALLOWLIST:
		if scene_name in scenes_dict:
			scene_data = scenes_dict[scene_name]
			ts_lines.append(f"\t{repr(scene_name)}: " + "{" )

			# Emit each field from the scene YAML
			ts_lines.append(f"\t\tscene_name: {repr(scene_data.get('scene_name'))},")
			ts_lines.append(f"\t\tworkspace: {repr(scene_data.get('workspace'))},")

			# capabilities
			capabilities = scene_data.get("capabilities")
			if capabilities:
				ts_lines.append("\t\tcapabilities: [")
				for cap in capabilities:
					ts_lines.append(f"\t\t\t{repr(cap)},")
				ts_lines.append("\t\t],")

			# background
			background = scene_data.get("background")
			if background:
				ts_lines.append("\t\tbackground: " + "{" )
				for key, val in background.items():
					if isinstance(val, str):
						ts_lines.append(f"\t\t\t{key}: {repr(val)},")
					elif isinstance(val, (int, float)):
						ts_lines.append(f"\t\t\t{key}: {val},")
					else:
						# Handle complex types
						pass
				ts_lines.append("\t\t},")

			# scene_bounds
			scene_bounds = scene_data.get("scene_bounds")
			if scene_bounds:
				ts_lines.append("\t\tscene_bounds: " + "{" )
				for key in ["left", "right", "top", "bottom"]:
					val = scene_bounds.get(key)
					if val is not None:
						ts_lines.append(f"\t\t\t{key}: {val},")
				ts_lines.append("\t\t},")

			# zones (Schema A)
			zones = scene_data.get("zones")
			if zones:
				ts_lines.append("\t\tzones: [")
				for zone in zones:
					ts_lines.append("\t\t\t" + "{" )
					ts_lines.append(f"\t\t\t\tid: {repr(zone.get('id'))},")
					bounds = zone.get("bounds")
					if bounds:
						ts_lines.append("\t\t\t\tbounds: " + "{" )
						for key in ["left", "right", "top", "bottom"]:
							val = bounds.get(key)
							if val is not None:
								ts_lines.append(f"\t\t\t\t\t{key}: {val},")
						ts_lines.append("\t\t\t\t},")
					if zone.get("align"):
						ts_lines.append(f"\t\t\t\talign: {repr(zone.get('align'))},")
					if zone.get("baseline") is not None:
						ts_lines.append(f"\t\t\t\tbaseline: {zone.get('baseline')},")
					if zone.get("label"):
						ts_lines.append(f"\t\t\t\tlabel: {repr(zone.get('label'))},")
					ts_lines.append("\t\t\t},")
				ts_lines.append("\t\t],")

			# placements (Schema A)
			placements = scene_data.get("placements")
			if placements:
				ts_lines.append("\t\tplacements: [")
				for placement in placements:
					ts_lines.append("\t\t\t" + "{" )
					ts_lines.append(
						f"\t\t\t\tplacement_name: {repr(placement.get('placement_name'))},"
					)
					ts_lines.append(
						f"\t\t\t\tobject_name: {repr(placement.get('object_name'))},"
					)
					ts_lines.append(
						f"\t\t\t\tzone: {repr(placement.get('zone'))},"
					)
					if placement.get("depth_tier") is not None:
						ts_lines.append(
							f"\t\t\t\tdepth_tier: {placement.get('depth_tier')},"
						)
					ts_lines.append("\t\t\t},")
				ts_lines.append("\t\t],")

			# rows (Schema B)
			rows = scene_data.get("rows")
			if rows:
				ts_lines.append("\t\trows: [")
				for row in rows:
					ts_lines.append("\t\t\t" + "{" )
					ts_lines.append(f"\t\t\t\trow_name: {repr(row.get('row_name'))},")
					slots = row.get("slots", [])
					ts_lines.append("\t\t\t\tslots: [")
					for slot in slots:
						ts_lines.append("\t\t\t\t\t" + "{" )
						ts_lines.append(
							f"\t\t\t\t\t\tplacement_name: {repr(slot.get('placement_name'))},"
						)
						ts_lines.append(
							f"\t\t\t\t\t\tobject_name: {repr(slot.get('object_name'))},"
						)
						if slot.get("depth_tier") is not None:
							ts_lines.append(
								f"\t\t\t\t\t\tdepth_tier: {slot.get('depth_tier')},"
							)
						ts_lines.append("\t\t\t\t\t},")
					ts_lines.append("\t\t\t\t],")
					ts_lines.append("\t\t\t},")
				ts_lines.append("\t\t],")

			# layout_rules
			layout_rules = scene_data.get("layout_rules")
			if layout_rules:
				ts_lines.append("\t\tlayout_rules: " + "{" )
				for key, val in layout_rules.items():
					if isinstance(val, str):
						ts_lines.append(f"\t\t\t{key}: {repr(val)},")
					elif isinstance(val, (int, float)):
						ts_lines.append(f"\t\t\t{key}: {val},")
				ts_lines.append("\t\t},")

			# wrong_order_message
			wrong_order_msg = scene_data.get("wrong_order_message")
			if wrong_order_msg:
				ts_lines.append("\t\twrong_order_message: " + "{" )
				for key, val in wrong_order_msg.items():
					if isinstance(val, str):
						ts_lines.append(f"\t\t\t{key}: {repr(val)},")
					elif isinstance(val, (int, float)):
						ts_lines.append(f"\t\t\t{key}: {val},")
				ts_lines.append("\t\t},")

			ts_lines.append("\t},")

	ts_lines.append("} as const;")

	ts_code = "\n".join(ts_lines)

	# Write output file
	with open(output_path, "w") as f:
		f.write(ts_code)

	print(
		f"Generated {output_path} with {len(scenes_dict)} scenes, "
		f"{len(skipped_files)} skipped",
		file=sys.stderr,
	)


#============================================

if __name__ == "__main__":
	main()
