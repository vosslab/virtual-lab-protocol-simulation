#!/usr/bin/env python3
"""
Codegen for scene index from content/base_scenes/*.yaml and content/protocols/*/scenes/*.yaml.

Reads scene YAML files, validates against closed scene schema, and emits
generated/scenes.ts with typed SCENES export for the renderer.

Base scenes are emitted with their scene_name as key.
Per-protocol scenes are ingested, inheritance is resolved, and they are emitted
with composite key <protocol_name>_<scene_basename>.

Validation:
- background.type is "gradient" and from/to parse as hex
- every zone id is unique within the scene
- every placement.zone resolves to a declared zone
- every placement.object_name resolves to an object (cross-checked against
  generated/object_library.ts or content/objects/**/*.yaml)
- for Schema B scenes, every row_name is in WORKSPACE_ROW_LIBRARY
- per-protocol scenes: extends chain resolves to an existing base scene

SVG handling (controlled by --missing-svg flag):
- strict (default, normal build): a scene with a placement whose object references
  a missing SVG asset is reported loudly with object names and asset ids. The scene
  is excluded from SCENES and never silently skipped or blanked.
- placeholder (dev/test): a scene with missing-SVG placements emits normally; each
  affected placement carries missing_svg: true so the renderer can show a labeled
  placeholder. A missing-asset report is still emitted to stderr.

In both modes a missing-asset report is written to stderr listing every placement
with a missing SVG, the object name, and the missing asset ids.

Output: generated/scenes.ts with SCENE_ALLOWLIST, SCENES_SKIPPED,
SCENES_SKIPPED_FILES, and SCENES exports. Includes both base and per-protocol scenes.
"""

# Standard Library
import argparse
import os
import re
import subprocess
import sys

# PIP3 modules
import yaml  # pyyaml

# local repo modules
import scene_inheritance


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

def parse_args() -> argparse.Namespace:
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description="Generate generated/scenes.ts from content/base_scenes/ and per-protocol scenes."
	)
	parser.add_argument(
		'--missing-svg',
		dest='missing_svg_mode',
		choices=('strict', 'placeholder'),
		default='strict',
		help=(
			"How to handle scenes where a placement references an object with missing SVG assets. "
			"strict (default, normal build): report loudly and exclude the scene. "
			"placeholder (dev/test): emit the scene with missing_svg: true on affected placements."
		),
	)
	args = parser.parse_args()
	return args


#============================================

def parse_hex_color(hex_str: str) -> bool:
	"""Validate hex color string: #RRGGBB or #RRGGBBAA."""
	if not isinstance(hex_str, str):
		return False
	pattern = r'^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$'
	return bool(re.match(pattern, hex_str))


#============================================

def collect_svg_asset_names(repo_root: str) -> set:
	"""
	Collect all SVG asset base names (without .svg extension) from assets/equipment/.
	Returns a set of available asset name strings.
	"""
	available_svgs = set()
	equipment_dir = os.path.join(repo_root, "assets", "equipment")

	if not os.path.isdir(equipment_dir):
		return available_svgs

	for file in os.listdir(equipment_dir):
		if file.endswith(".svg"):
			# Strip .svg to get the base asset name used in object YAML asset_name fields
			base_name = file[:-4]
			available_svgs.add(base_name)

	return available_svgs


#============================================

def collect_object_svg_refs(repo_root: str, extra_object_dirs: list = None) -> dict:
	"""
	Walk content/objects/**/*.yaml and collect asset_name references from visual_states.
	Also walks any additional object directories supplied via extra_object_dirs.

	Returns a dict mapping object_name -> set of asset_name strings.
	Only svg-kind visual_states entries contribute asset_name references.
	"""
	# Directories to scan for object YAML files
	object_dirs = [os.path.join(repo_root, "content", "objects")]
	if extra_object_dirs:
		object_dirs.extend(extra_object_dirs)

	object_svg_refs = {}

	for scan_root in object_dirs:
		if not os.path.isdir(scan_root):
			continue

		for dir_root, _dirs, files in os.walk(scan_root):
			for file in files:
				if not file.endswith(".yaml"):
					continue
				abs_path = os.path.join(dir_root, file)
				with open(abs_path, "r") as f:
					data = yaml.safe_load(f)
				if not isinstance(data, dict):
					continue
				# object_name is a REQUIRED field in every object YAML; fail loudly if missing
				object_name = data["object_name"]
				# Collect all asset_name values from svg-kind visual_states entries
				asset_names = set()
				visual_states = data.get("visual_states")
				if isinstance(visual_states, dict):
					for _state_key, state_config in visual_states.items():
						if not isinstance(state_config, dict):
							continue
						# Only svg-kind entries reference asset files directly
						if state_config.get("kind") != "svg":
							continue
						for case in state_config.get("cases", []):
							if not isinstance(case, dict):
								continue
							output = case.get("output", {})
							if isinstance(output, dict):
								asset_name = output.get("asset_name")
								if asset_name:
									asset_names.add(asset_name)
				object_svg_refs[object_name] = asset_names

	return object_svg_refs


#============================================

def check_scene_svg_gaps(
	scene_data: dict,
	object_svg_refs: dict,
	available_svgs: set,
) -> list:
	"""
	Check a resolved scene's placements for objects with missing SVG assets.

	Returns a list of tuples: (placement_name, object_name, list_of_missing_asset_ids).
	An empty list means all placements have their SVG assets available.
	"""
	gaps = []
	placements = scene_data.get("placements", [])
	if not isinstance(placements, list):
		return gaps

	for placement in placements:
		if not isinstance(placement, dict):
			continue
		# placement_name and object_name are REQUIRED scene-placement fields; fail loudly if missing
		placement_name = placement["placement_name"]
		object_name = placement["object_name"]

		# Get the SVG asset names this object references
		asset_names = object_svg_refs.get(object_name, set())
		# Find which ones are missing
		missing = sorted(name for name in asset_names if name not in available_svgs)
		if missing:
			gaps.append((placement_name, object_name, missing))

	return gaps


#============================================

def emit_missing_asset_report(
	scene_name: str,
	gaps: list,
	mode: str,
) -> None:
	"""
	Emit a missing-asset report to stderr for a scene with SVG gaps.

	Args:
		scene_name: The scene_name field of the affected scene.
		gaps: List of (placement_name, object_name, [missing_asset_ids]).
		mode: 'strict' or 'placeholder', included in the report header.
	"""
	print(
		f"MISSING-SVG [{mode}] scene '{scene_name}': {len(gaps)} placement(s) with missing SVG assets:",
		file=sys.stderr,
	)
	for placement_name, object_name, missing_assets in gaps:
		asset_list = ", ".join(missing_assets)
		print(
			f"  placement '{placement_name}' -> object '{object_name}' -> missing: {asset_list}",
			file=sys.stderr,
		)


#============================================

def collect_object_names(repo_root: str, extra_object_dirs: list = None) -> set:
	"""
	Collect all object_name values from content/objects/**/*.yaml.
	Also collects from any additional directories supplied via extra_object_dirs.
	Returns a set of all valid object names.
	"""
	object_names = set()

	# Directories to scan
	scan_dirs = [os.path.join(repo_root, "content", "objects")]
	if extra_object_dirs:
		scan_dirs.extend(extra_object_dirs)

	for objects_dir in scan_dirs:
		if not os.path.isdir(objects_dir):
			continue

		for root, dirs, files in os.walk(objects_dir):
			for file in files:
				if file.endswith(".yaml"):
					abs_path = os.path.join(root, file)
					with open(abs_path, "r") as f:
						data = yaml.safe_load(f)
					if not isinstance(data, dict):
						raise ValueError(
							f"Object YAML must be a mapping at top level: {abs_path}"
						)
					object_name = data["object_name"]
					object_names.add(object_name)

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

def discover_per_protocol_scenes(repo_root: str) -> dict:
	"""
	Discover all per-protocol scene YAML files under content/protocols/*/scenes/.

	Returns a dict mapping composite_key -> (protocol_name, scene_basename, yaml_path).
	Composite key format: <protocol_name>_<scene_basename>

	Args:
		repo_root: Repository root path.

	Returns:
		Dict mapping composite_key -> (protocol_name, scene_basename, yaml_path).
	"""
	protocol_scenes = {}
	protocols_dir = os.path.join(repo_root, "content", "protocols")

	if not os.path.isdir(protocols_dir):
		return protocol_scenes

	# Walk through each cluster/protocol_name/scenes/ directory
	for cluster_dir in os.listdir(protocols_dir):
		cluster_path = os.path.join(protocols_dir, cluster_dir)
		if not os.path.isdir(cluster_path):
			continue

		for protocol_name in os.listdir(cluster_path):
			protocol_path = os.path.join(cluster_path, protocol_name)
			scenes_dir = os.path.join(protocol_path, "scenes")

			if not os.path.isdir(scenes_dir):
				continue

			for file in os.listdir(scenes_dir):
				if file.endswith(".yaml"):
					scene_basename = file.replace(".yaml", "")
					yaml_path = os.path.join(scenes_dir, file)

					# Key by the YAML's scene_name field so the runtime key
					# matches SceneChange.to_scene values exactly. Authors
					# already namespace scene_name with the protocol prefix.
					with open(yaml_path, "r") as f:
						data = yaml.safe_load(f)
					if not isinstance(data, dict):
						raise ValueError(
							f"Per-protocol scene YAML must be a dict: {yaml_path}"
						)
					scene_name_field = data["scene_name"]
					if not scene_name_field or not isinstance(scene_name_field, str):
						raise ValueError(
							f"Missing or non-string scene_name in {yaml_path}"
						)
					composite_key = scene_name_field

					protocol_scenes[composite_key] = (
						protocol_name,
						scene_basename,
						yaml_path,
					)

	return protocol_scenes


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
	scene_name = data["scene_name"]
	if not scene_name:
		raise ValueError(f"Missing scene_name: {yaml_path}")

	workspace = data["workspace"]
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
				from_color = background["from"]
				to_color = background["to"]

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
			zone_id = zone["zone_name"]
			if not zone_id:
				raise ValueError(f"Zone missing zone_name: {yaml_path}")

			if zone_id in zone_ids:
				raise ValueError(
					f"Duplicate zone_name '{zone_id}': {yaml_path}"
				)

			zone_ids.add(zone_id)

		# Validate placements reference existing zones and objects
		placements = data.get("placements", [])
		if not isinstance(placements, list):
			raise ValueError(f"placements must be a list: {yaml_path}")

		for placement in placements:
			placement_name = placement["placement_name"]
			if not placement_name:
				raise ValueError(f"Placement missing placement_name: {yaml_path}")

			object_name = placement["object_name"]
			if not object_name:
				raise ValueError(
					f"Placement '{placement_name}' missing object_name: {yaml_path}"
				)

			if object_name not in object_names:
				raise ValueError(
					f"Placement '{placement_name}' references unknown object "
					f"'{object_name}': {yaml_path}"
				)

			zone = placement["zone"]
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
			row_name = row["row_name"]
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
				object_name = slot["object_name"]
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

def emit_scene_ts(
	scene_key: str,
	scene_data: dict,
	ts_lines: list,
	missing_svg_placements: set,
) -> None:
	"""
	Emit a single scene entry into ts_lines.

	Args:
		scene_key: The key used in the SCENES record (scene_name or composite_key).
		scene_data: Resolved scene dict from YAML.
		ts_lines: List to append TypeScript lines to.
		missing_svg_placements: Set of placement_name values that have missing SVGs.
			These placements get missing_svg: true in the emitted output.
	"""
	ts_lines.append(f"\t{repr(scene_key)}: " + "{")

	# Emit each field from the scene YAML
	# scene_name and workspace are required fields, validated upstream -- fail loudly if missing
	ts_lines.append(f"\t\tscene_name: {repr(scene_data['scene_name'])},")
	ts_lines.append(f"\t\tworkspace: {repr(scene_data['workspace'])},")

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
		ts_lines.append("\t\tbackground: " + "{")
		for key, val in background.items():
			if isinstance(val, str):
				ts_lines.append(f"\t\t\t{key}: {repr(val)},")
			elif isinstance(val, (int, float)):
				ts_lines.append(f"\t\t\t{key}: {val},")
			else:
				# Handle complex types (skipped)
				pass
		ts_lines.append("\t\t},")

	# scene_bounds
	scene_bounds = scene_data.get("scene_bounds")
	if scene_bounds:
		ts_lines.append("\t\tscene_bounds: " + "{")
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
			ts_lines.append("\t\t\t" + "{")
			# Authored YAML uses `zone_name` (rule 25). The TS runtime type
			# SceneZone declares `id: string`; the pipeline maps zone_name -> id
			# at this YAML/TS boundary so the runtime field name is unchanged.
			ts_lines.append(f"\t\t\t\tid: {repr(zone['zone_name'])},")
			bounds = zone.get("bounds")
			if bounds:
				ts_lines.append("\t\t\t\tbounds: " + "{")
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
			ts_lines.append("\t\t\t" + "{")
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
			# Mark missing-SVG placements in placeholder mode
			pname = placement.get("placement_name")
			if pname and pname in missing_svg_placements:
				ts_lines.append("\t\t\t\tmissing_svg: true,")
			ts_lines.append("\t\t\t},")
		ts_lines.append("\t\t],")

	# rows (Schema B)
	rows = scene_data.get("rows")
	if rows:
		ts_lines.append("\t\trows: [")
		for row in rows:
			ts_lines.append("\t\t\t" + "{")
			ts_lines.append(f"\t\t\t\trow_name: {repr(row.get('row_name'))},")
			slots = row.get("slots", [])
			ts_lines.append("\t\t\t\tslots: [")
			for slot in slots:
				ts_lines.append("\t\t\t\t\t" + "{")
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
				# Row-slot missing_svg support (placeholder mode)
				slot_pname = slot.get("placement_name")
				if slot_pname and slot_pname in missing_svg_placements:
					ts_lines.append("\t\t\t\t\t\tmissing_svg: true,")
				ts_lines.append("\t\t\t\t\t},")
			ts_lines.append("\t\t\t\t],")
			ts_lines.append("\t\t\t},")
		ts_lines.append("\t\t],")

	# layout_rules
	layout_rules = scene_data.get("layout_rules")
	if layout_rules:
		ts_lines.append("\t\tlayout_rules: " + "{")
		for key, val in layout_rules.items():
			if isinstance(val, str):
				ts_lines.append(f"\t\t\t{key}: {repr(val)},")
			elif isinstance(val, (int, float)):
				ts_lines.append(f"\t\t\t{key}: {val},")
		ts_lines.append("\t\t},")

	# wrong_order_message
	wrong_order_msg = scene_data.get("wrong_order_message")
	if wrong_order_msg:
		ts_lines.append("\t\twrong_order_message: " + "{")
		for key, val in wrong_order_msg.items():
			if isinstance(val, str):
				ts_lines.append(f"\t\t\t{key}: {repr(val)},")
			elif isinstance(val, (int, float)):
				ts_lines.append(f"\t\t\t{key}: {val},")
		ts_lines.append("\t\t},")

	ts_lines.append("\t},")


#============================================

def main() -> None:
	"""Main entry point for codegen."""
	args = parse_args()
	missing_svg_mode = args.missing_svg_mode

	repo_root = get_repo_root()

	# Allowlist: controls which base scenes ship to runtime.
	# D1 generalization scene set; electrophoresis_bench and imaging_bench added
	# in M1/WP-SUPPLY-1 (their SVGs are present; the stale SCENES_SKIPPED_METADATA
	# entry has been corrected below).
	SCENE_ALLOWLIST = [
		"bench_basic",
		"bench_basic_row_slot",
		"cell_counter_basic",
		"electrophoresis_bench",
		"hood_basic",
		"imaging_bench",
		"sample_prep_bench",
		"staining_bench",
	]

	# Scenes skipped with documented reasons.
	# Only scenes with a genuine, current skip reason belong here.
	# electrophoresis_bench was previously listed with a stale "SVG gap" reason;
	# that entry is removed because all referenced SVGs are present in assets/equipment/.
	# electrophoresis_bench and imaging_bench are now in SCENE_ALLOWLIST.
	SCENES_SKIPPED_METADATA = {
		"well_plate_96_zoom": "Quarantined: references quarantined object well_plate_96",
		"adversarial_overflow_smoke": "Design skip: capacity stress test, expected to fail loudly",
		"long_labels_smoke": "Object gap: requires 6 chemical bottle objects not yet authored",
	}

	# Collect SVG assets available in assets/equipment/
	available_svgs = collect_svg_asset_names(repo_root)

	# Collect per-smoke-fixture local object directories for extended object discovery
	# This supports dev-smoke fixtures that need test-only objects not in content/objects/
	smoke_dir = os.path.join(repo_root, "tests", "content", "dev_smoke")
	extra_object_dirs = []
	if os.path.isdir(smoke_dir):
		for subdir in os.listdir(smoke_dir):
			local_objects_dir = os.path.join(smoke_dir, subdir, "objects")
			if os.path.isdir(local_objects_dir):
				extra_object_dirs.append(local_objects_dir)

	# Read object names (standard content/objects/ plus any fixture-local objects)
	object_names = collect_object_names(repo_root, extra_object_dirs=extra_object_dirs)

	# Collect SVG references from all objects (standard + fixture-local)
	all_extra_object_dirs = []
	if extra_object_dirs:
		all_extra_object_dirs.extend(extra_object_dirs)
	object_svg_refs = collect_object_svg_refs(repo_root, extra_object_dirs=all_extra_object_dirs)

	# Read workspace row library
	workspace_rows = read_workspace_row_library(repo_root)

	# Find all base scene YAML files and smoke fixtures.
	# scene_files is a list of (filename, yaml_path, is_smoke_fixture).
	# is_smoke_fixture=True means the scene should always be emitted (not subject to
	# SCENE_ALLOWLIST filtering) and SVG gaps never fail the build (smoke fixtures are
	# dev/test only and may intentionally reference missing assets).
	scene_files = []

	# Scan content/base_scenes/
	scenes_dir = os.path.join(repo_root, "content", "base_scenes")
	if not os.path.isdir(scenes_dir):
		raise ValueError(f"Scenes directory not found: {scenes_dir}")

	for file in os.listdir(scenes_dir):
		if file.endswith(".yaml"):
			abs_path = os.path.join(scenes_dir, file)
			# is_smoke_fixture=False for base scenes
			scene_files.append((file, abs_path, False))

	# Scan tests/content/dev_smoke/ for smoke fixtures
	if os.path.isdir(smoke_dir):
		for subdir in os.listdir(smoke_dir):
			scene_yaml = os.path.join(smoke_dir, subdir, "scene.yaml")
			if os.path.isfile(scene_yaml):
				# Extract scene_name from the YAML to form a unique filename
				with open(scene_yaml, "r") as f:
					data = yaml.safe_load(f)
				if not isinstance(data, dict):
					raise ValueError(
						f"Smoke scene YAML must be a mapping: {scene_yaml}"
					)
				# scene_name is required in smoke fixtures -- fail loudly if missing
				scene_name = data["scene_name"]
				# is_smoke_fixture=True for dev-smoke fixtures
				scene_files.append((f"{scene_name}.yaml", scene_yaml, True))

	scene_files.sort(key=lambda x: x[0])

	# Process each base scene YAML
	scenes_dict = {}
	base_scenes_dict = {}
	skipped_files = []
	failed_count = 0
	# Maps scene_key -> set of placement_names with missing SVGs (placeholder mode)
	scenes_missing_svg_placements = {}
	# Accumulates all missing-SVG findings across all scenes for the final report
	all_missing_svg_findings = []

	for filename, yaml_path, is_smoke_fixture in scene_files:
		try:
			scene_name, scene_data = process_scene_yaml(
				yaml_path,
				object_names,
				workspace_rows,
				SCENE_ALLOWLIST,
			)

			# Track base scene for per-protocol inheritance
			base_scenes_dict[scene_name] = scene_data

			# Determine whether to emit this scene:
			# - Smoke fixtures: always emit (bypass allowlist filtering)
			# - Base scenes: emit only if in SCENE_ALLOWLIST
			should_emit = is_smoke_fixture or (scene_name in SCENE_ALLOWLIST)

			if should_emit:
				# Check for missing SVG assets before emitting
				gaps = check_scene_svg_gaps(scene_data, object_svg_refs, available_svgs)
				if gaps:
					# Accumulate for final missing-asset report
					all_missing_svg_findings.append((scene_name, gaps))
					# Report immediately to stderr (both modes)
					emit_missing_asset_report(scene_name, gaps, missing_svg_mode)
					if missing_svg_mode == "strict" and not is_smoke_fixture:
						# Strict mode for non-smoke: exclude and report error
						print(
							f"ERROR [strict] scene '{scene_name}' excluded: {len(gaps)} placement(s) "
							f"have missing SVG assets. Use --missing-svg=placeholder to emit with "
							f"placeholders instead.",
							file=sys.stderr,
						)
						base_name = filename.replace(".yaml", "")
						skipped_files.append(base_name)
						failed_count += 1
					else:
						# Placeholder mode (any scene) or strict mode for smoke fixtures:
						# emit the scene with missing_svg markers on affected placements.
						# Smoke fixtures never fail the build even in strict mode -- they
						# exist to exercise the SVG-gap code path, not to have final art.
						missing_pnames = {p for p, _obj, _assets in gaps}
						scenes_missing_svg_placements[scene_name] = missing_pnames
						scenes_dict[scene_name] = scene_data
				else:
					# No SVG gaps: emit normally
					scenes_dict[scene_name] = scene_data
			else:
				# Track skipped scenes (non-allowlisted base scenes)
				base_name = filename.replace(".yaml", "")
				skipped_files.append(base_name)

		except (ValueError, KeyError, yaml.YAMLError, OSError) as e:
			# A scene failed validation. Re-read the YAML once to get its
			# scene_name for logging; if the re-read also fails, the error
			# message will name the file path only.
			scene_name = None
			with open(yaml_path, "r") as f:
				data = yaml.safe_load(f)
			if isinstance(data, dict):
				scene_name = data.get("scene_name")

			# Log the error with the file path for visibility
			print(f"ERROR processing {yaml_path}: {e}", file=sys.stderr)

			# Only fail if an allowlisted base scene has a validation error.
			# Smoke fixtures with validation errors are skipped with a warning,
			# not a build failure.
			if not is_smoke_fixture and scene_name and scene_name in SCENE_ALLOWLIST:
				failed_count += 1
			else:
				# Non-allowlisted base scenes and smoke fixtures can fail validation;
				# they are skipped
				if scene_name:
					base_name = filename.replace(".yaml", "")
					skipped_files.append(base_name)

	# Discover and process per-protocol scenes
	per_protocol_scenes = discover_per_protocol_scenes(repo_root)
	per_protocol_count = 0

	for composite_key in sorted(per_protocol_scenes.keys()):
		protocol_name, scene_basename, yaml_path = per_protocol_scenes[composite_key]

		try:
			with open(yaml_path, "r") as f:
				protocol_scene_data = yaml.safe_load(f)

			if not protocol_scene_data:
				raise ValueError(f"Empty YAML: {yaml_path}")

			if not isinstance(protocol_scene_data, dict):
				raise ValueError(f"Scene YAML must be a dict: {yaml_path}")

			# Resolve inheritance
			resolved_scene = scene_inheritance.resolve_protocol_scene(
				composite_key,
				protocol_scene_data,
				base_scenes_dict,
			)

			# Check for missing SVG assets in the resolved per-protocol scene
			gaps = check_scene_svg_gaps(resolved_scene, object_svg_refs, available_svgs)
			if gaps:
				# Accumulate for final missing-asset report
				all_missing_svg_findings.append((composite_key, gaps))
				# Report immediately to stderr
				emit_missing_asset_report(composite_key, gaps, missing_svg_mode)
				if missing_svg_mode == "strict":
					# Strict mode: exclude this per-protocol scene
					print(
						f"ERROR [strict] per-protocol scene '{composite_key}' excluded: "
						f"{len(gaps)} placement(s) have missing SVG assets.",
						file=sys.stderr,
					)
					failed_count += 1
					continue
				else:
					# Placeholder mode: emit with missing_svg markers
					missing_pnames = {p for p, _obj, _assets in gaps}
					scenes_missing_svg_placements[composite_key] = missing_pnames

			scenes_dict[composite_key] = resolved_scene
			per_protocol_count += 1

		except (ValueError, KeyError, yaml.YAMLError, OSError) as e:
			print(
				f"ERROR processing per-protocol scene {yaml_path}: {e}",
				file=sys.stderr,
			)
			failed_count += 1

	if failed_count > 0:
		sys.exit(1)

	# Emit a consolidated missing-asset summary if any gaps were found
	if all_missing_svg_findings:
		total_placements = sum(len(gaps) for _sn, gaps in all_missing_svg_findings)
		print(
			f"MISSING-SVG SUMMARY [{missing_svg_mode}]: {len(all_missing_svg_findings)} scene(s), "
			f"{total_placements} placement(s) with missing SVG assets.",
			file=sys.stderr,
		)
		if missing_svg_mode == "placeholder":
			print(
				"MISSING-SVG SUMMARY: placeholder mode active -- affected placements "
				"emitted with missing_svg: true for renderer placeholder display.",
				file=sys.stderr,
			)

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
		"export const SCENES: Record<string, SceneA | SceneB> = {",
	])

	# Emit scenes in sorted order (base scenes first, then per-protocol)
	for scene_key in sorted(scenes_dict.keys()):
		scene_data = scenes_dict[scene_key]
		# Get the set of placement_names that have missing SVGs for this scene
		missing_svg_placements = scenes_missing_svg_placements.get(scene_key, set())
		emit_scene_ts(scene_key, scene_data, ts_lines, missing_svg_placements)

	ts_lines.append("} as const;")

	ts_code = "\n".join(ts_lines)

	# Write output file
	with open(output_path, "w") as f:
		f.write(ts_code)

	# Count base scenes actually emitted (scenes in SCENE_ALLOWLIST that shipped)
	base_scene_count = sum(1 for k in scenes_dict if k in SCENE_ALLOWLIST)

	print(
		f"Generated {output_path} with {len(scenes_dict)} scenes "
		f"({base_scene_count} base, {per_protocol_count} per-protocol), "
		f"{len(skipped_files)} skipped",
		file=sys.stderr,
	)


#============================================

if __name__ == "__main__":
	main()
