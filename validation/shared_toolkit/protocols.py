"""Protocol discovery and name-or-path resolution shared across tools."""

import os
from pathlib import Path

import validation.shared_toolkit.paths as paths


def list_protocols(protocols_dir=None):
	"""
	List protocol package names under content/protocols/.

	A protocol package is a directory containing protocol.yaml. Returns a
	sorted list of names.
	"""
	root = protocols_dir if protocols_dir is not None else paths.PROTOCOLS_DIR
	root_path = Path(root)
	if not root_path.exists():
		return []
	names = []
	for item in sorted(root_path.iterdir()):
		if not item.is_dir():
			continue
		if (item / "protocol.yaml").exists():
			names.append(item.name)
	return names


def resolve_protocol_path(name_or_path, repo_root=None):
	"""
	Resolve a protocol identifier to an absolute protocol.yaml Path.

	If name_or_path contains '/' or ends in '.yaml', treat as a file
	path (absolute or repo-relative). Otherwise treat as a protocol
	directory name under content/protocols/.

	Returns Path on success, None if no protocol file was found.
	"""
	root = repo_root if repo_root is not None else paths.REPO_ROOT
	test_path = Path(name_or_path)
	if "/" in name_or_path or name_or_path.endswith(".yaml"):
		if test_path.is_absolute():
			full_path = test_path
		else:
			full_path = Path(root) / name_or_path
		if full_path.exists() and full_path.is_file():
			return full_path
		return None
	protocol_yaml = Path(root) / "content" / "protocols" / name_or_path / "protocol.yaml"
	if protocol_yaml.exists():
		return protocol_yaml
	return None


def classify_protocol(protocol_dict):
	"""
	Return the declared protocol_type, defaulting to mini_protocol.

	Reads the protocol_type field from a parsed protocol.yaml. The default
	mirrors the runtime: an unset protocol_type is treated as mini.
	"""
	if not isinstance(protocol_dict, dict):
		return "mini_protocol"
	return protocol_dict.get("protocol_type", "mini_protocol")


def protocol_name_from_path(protocol_path):
	"""
	Derive the protocol directory name from a path to its protocol.yaml.

	The protocol directory is the parent of protocol.yaml; its basename is
	the canonical protocol name.
	"""
	return os.path.basename(os.path.dirname(str(protocol_path)))
