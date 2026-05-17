"""Content tree discovery utilities."""

import subprocess
from pathlib import Path
from typing import Iterator

from validation.shared_toolkit.repo_root import REPO_ROOT


def iter_protocols() -> Iterator[Path]:
	"""
	Yield each protocol.yaml file in the content tree.

	Each yielded path is an absolute Path to a file named protocol.yaml
	under content/protocols/<protocol_name>/.
	"""
	protocols_dir = REPO_ROOT / "content" / "protocols"
	if protocols_dir.exists():
		for protocol_yaml in protocols_dir.glob("*/protocol.yaml"):
			yield protocol_yaml


def iter_scenes() -> Iterator[Path]:
	"""
	Yield each scene YAML file in the content tree.

	Yields scene YAML files from:
	- content/protocols/<protocol_name>/scenes/*.yaml
	- content/scenes/*.yaml
	"""
	# Scenes under individual protocols
	protocols_dir = REPO_ROOT / "content" / "protocols"
	if protocols_dir.exists():
		for scene_yaml in protocols_dir.glob("*/scenes/*.yaml"):
			yield scene_yaml

	# Base scenes directory
	base_scenes_dir = REPO_ROOT / "content" / "scenes"
	if base_scenes_dir.exists():
		for scene_yaml in base_scenes_dir.glob("*.yaml"):
			yield scene_yaml


def iter_objects() -> Iterator[Path]:
	"""
	Yield each object YAML file in the content tree.

	Each yielded path is an absolute Path to a file under
	content/objects/<kind>/*.yaml, enumerated recursively.
	"""
	objects_dir = REPO_ROOT / "content" / "objects"
	if objects_dir.exists():
		for object_yaml in objects_dir.rglob("*.yaml"):
			yield object_yaml


def iter_focus() -> dict:
	"""
	Discover changed content and compute scope for focused validation.

	Runs git diff to identify touched files and maps them to validation
	entities (protocols, objects, scenes). Computes transitive dependents:
	if a protocol references a changed object/scene, the protocol is included
	in transitive_protocols.

	Returns:
		dict with keys:
		  - protocols: set[str] of directly changed protocol names
		  - objects: set[str] of directly changed object names
		  - scenes: set[str] of directly changed scene names
		  - transitive_protocols: set[str] of protocols that reference changed entities

	If git is unavailable or we are not in a git repo, returns empty sets.
	"""
	changed_paths = set()

	try:
		# Collect changed paths from git diff (HEAD vs working tree)
		result = subprocess.run(
			['git', 'diff', '--name-only', 'HEAD'],
			cwd=str(REPO_ROOT),
			capture_output=True,
			text=True,
			timeout=10,
		)
		if result.returncode == 0:
			for line in result.stdout.strip().split('\n'):
				if line:
					changed_paths.add(line)

		# Collect staged changes
		result = subprocess.run(
			['git', 'diff', '--name-only', '--cached'],
			cwd=str(REPO_ROOT),
			capture_output=True,
			text=True,
			timeout=10,
		)
		if result.returncode == 0:
			for line in result.stdout.strip().split('\n'):
				if line:
					changed_paths.add(line)

		# Collect untracked modified files
		result = subprocess.run(
			['git', 'ls-files', '--others', '--exclude-standard', '--modified'],
			cwd=str(REPO_ROOT),
			capture_output=True,
			text=True,
			timeout=10,
		)
		if result.returncode == 0:
			for line in result.stdout.strip().split('\n'):
				if line:
					changed_paths.add(line)
	except (subprocess.TimeoutExpired, FileNotFoundError):
		# If git is unavailable or fails, return empty scope
		return {
			'protocols': set(),
			'objects': set(),
			'scenes': set(),
			'transitive_protocols': set(),
		}

	# Map changed paths to entities
	protocols_direct = set()
	objects_direct = set()
	scenes_direct = set()

	for path in changed_paths:
		# content/protocols/<name>/... -> protocol <name>
		if path.startswith('content/protocols/'):
			parts = path.split('/')
			if len(parts) >= 3:
				protocol_name = parts[2]
				protocols_direct.add(protocol_name)
				# If it's under scenes/, also add the scene
				if len(parts) >= 5 and parts[3] == 'scenes':
					scene_name = parts[4].replace('.yaml', '')
					scenes_direct.add(scene_name)

		# content/objects/<kind>/<name>.yaml -> object <name>
		elif path.startswith('content/objects/'):
			parts = path.split('/')
			if len(parts) >= 3 and path.endswith('.yaml'):
				obj_name = parts[-1].replace('.yaml', '')
				objects_direct.add(obj_name)

		# content/scenes/<name>.yaml -> scene <name>
		elif path.startswith('content/scenes/') and path.endswith('.yaml'):
			parts = path.split('/')
			if len(parts) >= 2:
				scene_name = parts[-1].replace('.yaml', '')
				scenes_direct.add(scene_name)

	# Compute transitive protocols: scan every protocol.yaml and check if it
	# references any changed object or scene by name
	transitive_protocols = set()

	for protocol_path in iter_protocols():
		try:
			import yaml
			with open(protocol_path, 'r', encoding='utf-8') as f:
				protocol_data = yaml.safe_load(f)
			if not protocol_data:
				continue

			# Get protocol name from directory name
			protocol_name = protocol_path.parent.name

			# Check if protocol references any changed object or scene
			protocol_yaml_str = str(protocol_data)
			references_changed = False

			for obj_name in objects_direct:
				if obj_name in protocol_yaml_str:
					references_changed = True
					break

			if not references_changed:
				for scene_name in scenes_direct:
					if scene_name in protocol_yaml_str:
						references_changed = True
						break

			if references_changed:
				transitive_protocols.add(protocol_name)
		except yaml.YAMLError:
			# Skip protocols with YAML parse errors
			continue

	return {
		'protocols': protocols_direct,
		'objects': objects_direct,
		'scenes': scenes_direct,
		'transitive_protocols': transitive_protocols,
	}
