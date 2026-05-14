"""
Test gate for mini-protocol size and learning block completeness.

WP-DECOMP-9: Verify that mini-protocols have 6-10 steps and complete learning
blocks with correct leading phrases. Sequence runners require learning blocks
with "this protocol" phrasing. Dev smoke protocols are exempt from all checks.

Based on docs/PRIMARY_SPEC.md and docs/PRIMARY_CONTRACT.md.
"""

import os
import pytest
import yaml

# local repo modules
import git_file_utils


#============================================
# Helper functions
#============================================

def count_steps(protocol: dict) -> int:
	"""
	Count the total number of steps in a protocol.

	Steps can be directly in the protocol's 'steps' field, or nested
	under 'parts.*.steps' for structured protocols. This function counts
	both top-level and part-nested steps.

	Args:
		protocol: Parsed protocol YAML dict.

	Returns:
		int: Total step count.
	"""
	total = 0

	# Count top-level steps
	if 'steps' in protocol:
		total += len(protocol['steps'])

	# Count steps nested in parts
	if 'parts' in protocol:
		for part in protocol['parts']:
			if 'steps' in part:
				total += len(part['steps'])

	return total


def validate_learning_block_mini_protocol(protocol: dict, protocol_id: str) -> list[str]:
	"""
	Validate that a mini_protocol has a complete learning block with correct
	leading phrases.

	Args:
		protocol: Parsed protocol YAML dict.
		protocol_id: Protocol identifier for error messages.

	Returns:
		list[str]: List of error messages (empty if valid).
	"""
	errors = []

	if 'learning' not in protocol:
		errors.append(f"{protocol_id}: missing 'learning' block")
		return errors

	learning = protocol['learning']

	# Check objectives
	if 'objectives' not in learning:
		errors.append(f"{protocol_id}: missing learning.objectives")
	elif not learning['objectives'].startswith("Students completing this mini-protocol will have achieved"):
		errors.append(
			f"{protocol_id}: learning.objectives must start with "
			"'Students completing this mini-protocol will have achieved'"
		)

	# Check outcomes
	if 'outcomes' not in learning:
		errors.append(f"{protocol_id}: missing learning.outcomes")
	elif not learning['outcomes'].startswith("Students completing this mini-protocol will be able to"):
		errors.append(
			f"{protocol_id}: learning.outcomes must start with "
			"'Students completing this mini-protocol will be able to'"
		)

	# Check goals
	if 'goals' not in learning:
		errors.append(f"{protocol_id}: missing learning.goals")
	elif not learning['goals'].startswith("Overall, this mini-protocol aims to accomplish"):
		errors.append(
			f"{protocol_id}: learning.goals must start with "
			"'Overall, this mini-protocol aims to accomplish'"
		)

	return errors


def validate_learning_block_sequence_runner(protocol: dict, protocol_id: str) -> list[str]:
	"""
	Validate that a sequence_runner has a learning block with correct leading
	phrases (using "this protocol" instead of "this mini-protocol").

	Args:
		protocol: Parsed protocol YAML dict.
		protocol_id: Protocol identifier for error messages.

	Returns:
		list[str]: List of error messages (empty if valid).
	"""
	errors = []

	if 'learning' not in protocol:
		errors.append(f"{protocol_id}: missing 'learning' block")
		return errors

	learning = protocol['learning']

	# Check objectives
	if 'objectives' not in learning:
		errors.append(f"{protocol_id}: missing learning.objectives")
	elif not learning['objectives'].startswith("Students completing this protocol will have achieved"):
		errors.append(
			f"{protocol_id}: learning.objectives must start with "
			"'Students completing this protocol will have achieved'"
		)

	# Check outcomes
	if 'outcomes' not in learning:
		errors.append(f"{protocol_id}: missing learning.outcomes")
	elif not learning['outcomes'].startswith("Students completing this protocol will be able to"):
		errors.append(
			f"{protocol_id}: learning.outcomes must start with "
			"'Students completing this protocol will be able to'"
		)

	# Check goals
	if 'goals' not in learning:
		errors.append(f"{protocol_id}: missing learning.goals")
	elif not learning['goals'].startswith("Overall, this protocol aims to accomplish"):
		errors.append(
			f"{protocol_id}: learning.goals must start with "
			"'Overall, this protocol aims to accomplish'"
		)

	return errors


def load_protocol_yaml(protocol_path: str) -> dict:
	"""
	Load a protocol YAML file.

	Args:
		protocol_path: Absolute path to protocol.yaml.

	Returns:
		dict: Parsed YAML content.
	"""
	with open(protocol_path, 'r') as f:
		return yaml.safe_load(f)


#============================================
# Enumerate protocols
#============================================

def enumerate_all_protocols() -> list[tuple[str, str]]:
	"""
	Enumerate all curriculum and dev_smoke protocols.

	Returns:
		list[tuple[str, str]]: List of (protocol_id, protocol_path) tuples.
	"""
	repo_root = git_file_utils.get_repo_root()
	protocols = []

	# Curriculum content
	content_root = os.path.join(repo_root, 'content')
	if os.path.isdir(content_root):
		for protocol_dir in os.listdir(content_root):
			protocol_path = os.path.join(content_root, protocol_dir, 'protocol.yaml')
			if os.path.isfile(protocol_path):
				# Skip legacy monolith (slated for M9 deletion per PRIMARY_SPEC.md)
				if protocol_dir == 'cell_culture':
					continue
				protocols.append((protocol_dir, protocol_path))

	# Dev smoke content
	smoke_root = os.path.join(repo_root, 'tests', 'content', 'dev_smoke')
	if os.path.isdir(smoke_root):
		for check_dir in os.listdir(smoke_root):
			protocol_path = os.path.join(smoke_root, check_dir, 'protocol.yaml')
			if os.path.isfile(protocol_path):
				protocols.append((f"dev_smoke/{check_dir}", protocol_path))

	return sorted(protocols)


#============================================
# Main test
#============================================

def test_mini_protocol_size_and_learning():
	"""
	Test all protocols for correct step counts and learning block completeness.

	Dispatch on protocolType:
	- mini_protocol: assert 6-10 steps, complete learning block with mini_protocol phrases.
	- sequence_runner: skip step count check, assert learning block with protocol phrases.
	- dev_smoke: skip all checks (confirm folder path under tests/content/dev_smoke/).
	- unknown type: fail with clear message.
	"""
	protocols = enumerate_all_protocols()

	assert len(protocols) > 0, "No protocols found to test"

	all_errors = []
	protocol_results = {}

	for protocol_id, protocol_path in protocols:
		protocol = load_protocol_yaml(protocol_path)

		# Extract protocolType
		protocol_type = protocol.get('protocolType')

		if protocol_type is None:
			all_errors.append(f"{protocol_id}: missing required 'protocolType' field")
			continue

		if protocol_type == 'mini_protocol':
			# Check step count
			step_count = count_steps(protocol)
			if step_count < 6 or step_count > 10:
				all_errors.append(
					f"{protocol_id}: mini_protocol has {step_count} steps "
					"(must be 6-10 inclusive)"
				)

			# Check learning block
			learning_errors = validate_learning_block_mini_protocol(protocol, protocol_id)
			all_errors.extend(learning_errors)

			protocol_results[protocol_id] = {
				'type': 'mini_protocol',
				'steps': step_count,
				'status': 'pass' if not learning_errors else 'fail',
			}

		elif protocol_type == 'sequence_runner':
			# Check learning block (skip step count)
			learning_errors = validate_learning_block_sequence_runner(protocol, protocol_id)
			all_errors.extend(learning_errors)

			protocol_results[protocol_id] = {
				'type': 'sequence_runner',
				'status': 'pass' if not learning_errors else 'fail',
			}

		elif protocol_type == 'dev_smoke':
			# Confirm folder path is under tests/content/dev_smoke/
			if 'tests/content/dev_smoke/' not in protocol_path:
				all_errors.append(
					f"{protocol_id}: dev_smoke protocol must live under "
					f"tests/content/dev_smoke/ (found at {protocol_path})"
				)

			protocol_results[protocol_id] = {
				'type': 'dev_smoke',
				'status': 'pass',
			}

		else:
			all_errors.append(
				f"{protocol_id}: unknown protocolType '{protocol_type}' "
				"(must be one of: mini_protocol, sequence_runner, dev_smoke)"
			)

	# Report all failures in one assertion
	if all_errors:
		error_report = "Protocol validation failures:\n" + "\n".join(all_errors)
		pytest.fail(error_report)


#============================================
# Reporting helper for human review
#============================================

def test_protocol_enumeration_report():
	"""
	Report the protocols found and their types (for verification).

	This test always passes but prints a summary for inspection.
	"""
	protocols = enumerate_all_protocols()

	mini_protocols = []
	sequence_runners = []
	dev_smoke_protocols = []

	for protocol_id, protocol_path in protocols:
		protocol = load_protocol_yaml(protocol_path)
		protocol_type = protocol.get('protocolType', 'unknown')

		if protocol_type == 'mini_protocol':
			step_count = count_steps(protocol)
			mini_protocols.append((protocol_id, step_count))
		elif protocol_type == 'sequence_runner':
			sequence_runners.append(protocol_id)
		elif protocol_type == 'dev_smoke':
			dev_smoke_protocols.append(protocol_id)

	print("\n=== Protocol Enumeration ===")
	print(f"\nMini-protocols ({len(mini_protocols)}):")
	for protocol_id, step_count in sorted(mini_protocols):
		print(f"  {protocol_id}: {step_count} steps")

	print(f"\nSequence runners ({len(sequence_runners)}):")
	for protocol_id in sorted(sequence_runners):
		print(f"  {protocol_id}")

	print(f"\nDev smoke protocols ({len(dev_smoke_protocols)}):")
	for protocol_id in sorted(dev_smoke_protocols):
		print(f"  {protocol_id}")

	# Report-only: ensure at least one protocol of each classified type exists.
	# Hardcoded counts forbidden by PYTEST_STYLE (brittle to curriculum growth).
	assert len(mini_protocols) >= 1, "No mini_protocols discovered"
	assert len(sequence_runners) >= 1, "No sequence_runners discovered"
	assert len(dev_smoke_protocols) >= 1, "No dev_smoke protocols discovered"
