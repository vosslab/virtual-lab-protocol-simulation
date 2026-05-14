"""
Pytest gate enforcing entry point consistency with first step.

WP-ENTRY-4: Every protocol's entry.scene field must match the first step's scene.
If entry.scene is 'cell_culture_hood', the first step's scene must also be
'cell_culture_hood'. This prevents entry points from defaulting to the hood
and ensures the per-scene declaration invariant holds (PRIMARY_CONTRACT.md item 3).

Exemptions:
- tests/content/dev_smoke/: diagnostic fixtures, not student-facing.
- content/cell_culture/: legacy monolith slated for deletion at M9.

The test enumerates every protocol.yaml under content/ (except exemptions) and
tests/content/dev_smoke/, validates entry block structure, identifies the first
step (using the count_steps pattern from test_mini_protocol_size_and_learning.py),
and enforces the cross-check invariant.
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
def _get_all_protocol_files() -> list[tuple[str, pathlib.Path]]:
	"""
	Enumerate all protocol.yaml files under content/ and tests/content/dev_smoke/.

	Exempts:
	- content/cell_culture/ (legacy monolith slated for M9 deletion)

	Returns list of (protocol_id, path) tuples in sorted order.
	"""
	repo_root = git_file_utils.get_repo_root()
	protocols = []

	# Enumerate curriculum protocols under content/
	content_dir = pathlib.Path(repo_root) / "content"
	if content_dir.exists():
		for folder in sorted(content_dir.iterdir()):
			if not folder.is_dir():
				continue
			if folder.name == "cell_culture":
				continue
			protocol_file = folder / "protocol.yaml"
			if protocol_file.exists():
				protocols.append((folder.name, protocol_file))

	# Enumerate dev_smoke protocols
	dev_smoke_dir = pathlib.Path(repo_root) / "tests" / "content" / "dev_smoke"
	if dev_smoke_dir.exists():
		for folder in sorted(dev_smoke_dir.iterdir()):
			if not folder.is_dir():
				continue
			protocol_file = folder / "protocol.yaml"
			if protocol_file.exists():
				protocol_id = f"dev_smoke/{folder.name}"
				protocols.append((protocol_id, protocol_file))

	return sorted(protocols)


#============================================
def _get_first_step(protocol_yaml: dict) -> dict | None:
	"""
	Extract the first step from a protocol.

	Steps can be directly in the protocol's 'steps' field, or nested under
	'parts.*.steps' for structured protocols. This function returns the first
	step encountered in document order.

	Returns the first step dict, or None if no steps exist.
	"""
	# Check for top-level steps first
	if "steps" in protocol_yaml:
		steps_list = protocol_yaml["steps"]
		if steps_list:
			return steps_list[0]

	# Check for part-nested steps
	if "parts" in protocol_yaml:
		for part in protocol_yaml["parts"]:
			if "steps" in part:
				steps_list = part["steps"]
				if steps_list:
					return steps_list[0]

	return None


#============================================
def test_protocol_entry_matches_first_step():
	"""
	Verify that every mini_protocol's entry point matches its first step's scene.

	For each mini_protocol:
	1. Load protocol.yaml.
	2. Verify entry block exists with scene and step fields.
	3. Extract the first step (top-level or part-nested).
	4. Assert entry.scene == first_step.scene.
	5. Assert entry.step == first_step.id.
	6. If entry.scene is 'cell_culture_hood', first step must also be in hood.

	Sequence_runners are skipped since they do not have direct steps.
	Dev_smoke protocols are tested for entry consistency.

	Collect all errors and fail loudly with a sorted list of offending protocols.
	"""
	protocol_list = _get_all_protocol_files()

	all_errors = []

	for protocol_id, protocol_file in protocol_list:
		protocol_yaml = _load_yaml(protocol_file)

		# Get protocol type; skip sequence_runners as they have no direct steps
		protocol_type = protocol_yaml.get("protocolType")
		if protocol_type == "sequence_runner":
			continue

		# Verify entry block exists
		if "entry" not in protocol_yaml:
			all_errors.append(f"{protocol_id}: missing 'entry' block")
			continue

		entry = protocol_yaml["entry"]

		# Verify entry.scene exists
		if "scene" not in entry:
			all_errors.append(f"{protocol_id}: entry.scene not declared")
			continue

		# Verify entry.step exists
		if "step" not in entry:
			all_errors.append(f"{protocol_id}: entry.step not declared")
			continue

		entry_scene = entry["scene"]
		entry_step_id = entry["step"]

		# Extract first step
		first_step = _get_first_step(protocol_yaml)

		if first_step is None:
			all_errors.append(f"{protocol_id}: no steps found in protocol")
			continue

		# Verify first step has an id
		if "id" not in first_step:
			all_errors.append(f"{protocol_id}: first step missing 'id' field")
			continue

		first_step_id = first_step["id"]

		# Verify first step has a scene
		if "scene" not in first_step:
			all_errors.append(f"{protocol_id}: first step missing 'scene' field")
			continue

		first_step_scene = first_step["scene"]

		# Cross-check: entry.step must match first step id
		if entry_step_id != first_step_id:
			all_errors.append(
				f"{protocol_id}: entry.step ('{entry_step_id}') does not match "
				f"first step id ('{first_step_id}')"
			)

		# Cross-check: entry.scene must match first step scene
		if entry_scene != first_step_scene:
			all_errors.append(
				f"{protocol_id}: entry.scene ('{entry_scene}') does not match "
				f"first step scene ('{first_step_scene}')"
			)

		# If entry.scene is hood, first step must also be hood
		if entry_scene == "cell_culture_hood" and first_step_scene != "cell_culture_hood":
			all_errors.append(
				f"{protocol_id}: entry.scene is 'cell_culture_hood' but "
				f"first step scene is '{first_step_scene}'"
			)

	# Report all failures in one assertion
	if all_errors:
		error_msg = "Protocol entry point violations:\n" + "\n".join(all_errors)
		assert False, error_msg


#============================================
def test_active_protocols_discovered():
	"""
	Verify that the test discovers at least one protocol.

	This is a smoke test to ensure the discovery logic is working.
	Uses a floor assertion (PYTEST_STYLE: no hardcoded protocol lists).
	"""
	protocols = _get_all_protocol_files()

	assert len(protocols) >= 1, (
		"No protocol files discovered. "
		"Check that protocol.yaml files exist in content/ and tests/content/dev_smoke/."
	)
