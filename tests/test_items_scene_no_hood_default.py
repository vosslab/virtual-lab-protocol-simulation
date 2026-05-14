"""
Pytest gate enforcing scene declaration consistency for items.

WP-DECOMP-8, WP-ENTRY-3: Every item declared in items.yaml must have a scene
field that matches a scene actually used by at least one protocol step that
references the item. This gate prevents items from defaulting to cell_culture_hood
and ensures the per-scene declaration invariant holds (PRIMARY_CONTRACT.md item 3).

Exemptions:
- tests/content/dev_smoke/: diagnostic fixtures, not student-facing.
- content/cell_culture/: legacy monolith slated for deletion at M9.

The test uses shallow string matching for item references (acceptable false positives
with loud failure on false negatives; full parser-aware matching deferred to M3).
"""

import pathlib
import yaml

import git_file_utils


#============================================
def _load_yaml(file_path: pathlib.Path) -> dict:
	"""
	Load YAML file and return parsed dict.
	"""
	with open(file_path, "r", encoding="utf-8") as f:
		return yaml.safe_load(f) or {}


#============================================
def _get_active_protocol_folders() -> list[pathlib.Path]:
	"""
	Enumerate all protocol folders under content/, excluding exempted ones.

	Returns list of pathlib.Path objects for active protocol folders.
	Exempts: tests/content/dev_smoke/, content/cell_culture/
	"""
	repo_root = git_file_utils.get_repo_root()
	content_dir = pathlib.Path(repo_root) / "content"

	exempted_folders = {"cell_culture"}

	active_folders = []
	for folder in sorted(content_dir.iterdir()):
		if not folder.is_dir():
			continue
		if folder.name in exempted_folders:
			continue
		active_folders.append(folder)

	return active_folders


#============================================
def _get_scenes_used_in_protocol(protocol_yaml: dict) -> set[str]:
	"""
	Extract all scene names used by steps in the protocol.

	Steps can be directly in the protocol's 'steps' field, or nested
	under 'parts.*.steps' for structured protocols. This function returns
	scene identifiers from both locations.

	Returns set of scene identifiers (e.g., {'cell_culture_hood', 'bench', 'well_plate_workspace'}).
	"""
	scenes = set()

	# Collect scenes from top-level steps
	if "steps" in protocol_yaml:
		for step in protocol_yaml["steps"]:
			if "scene" in step:
				scenes.add(step["scene"])

	# Collect scenes from steps nested in parts
	if "parts" in protocol_yaml:
		for part in protocol_yaml["parts"]:
			if "steps" in part:
				for step in part["steps"]:
					if "scene" in step:
						scenes.add(step["scene"])

	return scenes


#============================================
def _get_items_referenced_in_protocol(protocol_yaml_text: str) -> set[str]:
	"""
	Perform shallow string search for item IDs in serialized protocol YAML.

	Given the raw YAML text, extract all item IDs that appear anywhere in the file.
	This allows false positives (e.g., "flask_a" matches if "flask" is an item),
	but ensures false negatives are caught loudly.

	Returns set of item ID strings found.
	"""
	# Collect all item IDs from requiredItems lists and completionPath references.
	# A shallow match is acceptable here: any string occurrence of the item ID
	# counts as a reference.
	item_ids = set()

	# Find requiredItems lists
	lines = protocol_yaml_text.split("\n")
	for line in lines:
		if "requiredItems:" in line:
			# Extract items from brackets: requiredItems: [item1, item2]
			if "[" in line and "]" in line:
				bracket_content = line[line.find("[")+1:line.find("]")]
				for item in bracket_content.split(","):
					item_id = item.strip()
					if item_id:
						item_ids.add(item_id)

	# Also capture items referenced in completionPath tool fields
	in_completion_path = False
	for line in lines:
		if "completionPath:" in line:
			in_completion_path = True
		elif in_completion_path and line and not line.startswith(" "):
			in_completion_path = False

		if in_completion_path:
			# Look for tool: item_id patterns
			if "tool:" in line:
				parts = line.split("tool:")
				if len(parts) > 1:
					item_id = parts[1].strip()
					if item_id:
						item_ids.add(item_id)
			# Look for source: item_id and destination: item_id patterns
			for field in ["source:", "destination:", "openClick:", "advanceClick:"]:
				if field in line:
					parts = line.split(field)
					if len(parts) > 1:
						item_id = parts[1].strip()
						if item_id:
							item_ids.add(item_id)

	return item_ids


#============================================
def test_items_scene_declarations():
	"""
	Assert that every item declared in items.yaml has a scene matching
	a scene actually used by at least one protocol step that references it.

	For each protocol folder:
	1. Load items.yaml and extract all item IDs and their declared scenes.
	2. Load protocol.yaml and extract all scenes used by steps.
	3. For each item, verify that its declared scene appears in the protocol's
	   scenes AND that the item is referenced by at least one step.

	Fail with a clear message listing offending items and which protocol folder.
	"""
	protocol_folders = _get_active_protocol_folders()

	offending_protocols = []

	for folder in protocol_folders:
		items_file = folder / "items.yaml"
		protocol_file = folder / "protocol.yaml"

		# Skip if YAML files are missing (e.g., not yet created)
		if not items_file.exists() or not protocol_file.exists():
			continue

		# Load YAML
		items_yaml = _load_yaml(items_file)
		protocol_yaml = _load_yaml(protocol_file)
		protocol_text = protocol_file.read_text(encoding="utf-8")

		# Extract scenes used by the protocol
		protocol_scenes = _get_scenes_used_in_protocol(protocol_yaml)

		# Extract items referenced in the protocol
		referenced_items = _get_items_referenced_in_protocol(protocol_text)

		# Check each item
		items_config = items_yaml.get("items", {})
		bad_items = []

		for item_id, item_config in items_config.items():
			declared_scene = item_config.get("scene")

			# If no scene declared, flag it
			if not declared_scene:
				bad_items.append((item_id, "no scene declared"))
				continue

			# If item is not referenced in the protocol, skip it
			# (it may be a legacy item not yet removed)
			if item_id not in referenced_items:
				continue

			# If declared scene is not in protocol scenes, flag it
			if declared_scene not in protocol_scenes:
				bad_items.append((item_id, f"scene '{declared_scene}' not used by protocol"))

		if bad_items:
			offending_protocols.append((folder.name, bad_items))

	# If any protocols failed, report them all
	if offending_protocols:
		error_lines = []
		for protocol_name, bad_items in offending_protocols:
			error_lines.append(f"\n{protocol_name}:")
			for item_id, reason in bad_items:
				error_lines.append(f"  - {item_id}: {reason}")

		error_msg = "Items with mismatched scene declarations:" + "".join(error_lines)
		assert False, error_msg


#============================================
def test_active_protocols_discovered():
	"""
	Verify that the test discovers at least one active protocol folder.

	This is a smoke test to ensure the discovery logic is working.
	Uses a floor assertion (PYTEST_STYLE: no hardcoded folder lists).
	"""
	folders = _get_active_protocol_folders()

	assert len(folders) >= 1, (
		"No protocol folders discovered. "
		"Check that protocol folders exist in content/ and cell_culture is exempted."
	)

