"""
Pipeline-local utilities. Mirrors a small subset of validation/shared_toolkit/.

Intentional duplication: pipeline/ must be self-contained (no cross-tree imports).
This module contains ~80 LOC of shared discovery and YAML loading surface.

Update both copies if behavior changes:
- pipeline/_pipeline_utils.py (this file)
- validation/shared_toolkit/{repo_root, yaml_io, discovery}.py

Functions and constants:
- REPO_ROOT: Canonical repo root path
- load_yaml: Load YAML file with error handling
- find_protocol_yaml_files: Discover protocol.yaml files
- find_protocol_directory: Locate a protocol by name
- iter_objects: Enumerate object YAML files
"""

from pathlib import Path
from typing import Iterator
import yaml


# Canonical repo root path, resolved once at import time.
# This file lives at <repo>/pipeline/_pipeline_utils.py. Go up one level to reach the repo root.
REPO_ROOT = Path(__file__).resolve().parent.parent


def load_yaml(path: Path) -> dict:
	"""
	Load YAML file with pyyaml. Returns parsed YAML as dict, or {} if file is
	empty. Raises RuntimeError on YAML parse error; other I/O errors propagate
	naturally.
	"""
	try:
		with open(path, 'r') as f:
			data = yaml.safe_load(f)
		return data if isinstance(data, dict) else {}
	except yaml.YAMLError as e:
		raise RuntimeError(f"Failed to parse {path}: {e}")


def _protocol_name_for_path(path: str | Path) -> str | None:
	"""
	Walk up from path and return the protocol directory name.

	Walks up from the given path until finding a directory containing
	protocol.yaml. Returns the basename of that directory (the protocol name),
	or None if no such ancestor exists.

	This helper makes discovery layout-agnostic: works whether protocols
	live at depth 2 (flat: content/protocols/<name>) or depth 3 (clustered:
	content/protocols/<cluster>/<name>).

	Args:
		path: File or directory path (absolute or relative).

	Returns:
		Protocol directory basename, or None if no protocol.yaml ancestor found.
	"""
	current = Path(path).resolve()

	# Walk up at most 10 levels to avoid infinite loops
	for _ in range(10):
		if not current.is_dir():
			current = current.parent

		if (current / "protocol.yaml").exists():
			return current.name

		parent = current.parent
		if parent == current:
			# Reached filesystem root
			break
		current = parent

	return None


def find_protocol_directory(protocols_root: Path, protocol_name: str) -> Path:
	"""
	Find the absolute path to a protocol directory.

	Searches under protocols_root for a protocol directory with the given name.
	Works with both flat layout (content/protocols/<name>) and clustered layout
	(content/protocols/<cluster>/<name>).

	Args:
		protocols_root: Path to content/protocols directory (absolute or relative).
		protocol_name: Name of the protocol (directory basename).

	Returns:
		Absolute Path to the protocol directory.

	Raises:
		RuntimeError: If protocol_name is not found under protocols_root.
	"""
	protocols_path = Path(protocols_root).resolve()
	if not protocols_path.exists():
		raise RuntimeError(f"Protocols root does not exist: {protocols_root}")

	# Search for protocol.yaml under a directory named protocol_name
	for protocol_yaml in protocols_path.rglob("protocol.yaml"):
		if protocol_yaml.parent.name == protocol_name:
			return protocol_yaml.parent

	# Protocol not found
	raise RuntimeError(f"Protocol '{protocol_name}' not found under {protocols_root}")


def find_protocol_yaml_files(protocols_root: Path) -> list[Path]:
	"""
	Find every protocol.yaml under protocols_root, at any depth.

	Returns a sorted list of absolute paths. Works with both flat layout
	(content/protocols/<name>/protocol.yaml) and clustered layout
	(content/protocols/<cluster>/<name>/protocol.yaml).

	Args:
		protocols_root: Path to content/protocols directory.

	Returns:
		Sorted list of absolute paths to protocol.yaml files.
	"""
	if not protocols_root.exists():
		return []
	return sorted(protocols_root.rglob("protocol.yaml"))


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
