"""
Test enforcement of protocol folder layout structure.

Validates that content/protocols/ maintains the three-cluster grouping
(cell_culture, sdspage, runners) with strict depth, naming, and ownership rules.

Every assertion failure cites docs/specs/TARGET_FILE_STRUCTURE.md as the rule source.

Tests import rule logic from validation/structure/layout_check.py to ensure
consistency between pytest and the validation stage.
"""

import sys
from pathlib import Path
import pytest
import yaml

import git_file_utils

# Add repo root to sys.path so we can import pipeline and validation modules
_REPO_ROOT = Path(git_file_utils.get_repo_root())
if str(_REPO_ROOT) not in sys.path:
	sys.path.insert(0, str(_REPO_ROOT))

import validation.structure.layout_check as layout_check


#============================================
# Module-level fixture: cache all protocol.yaml content at load time.

@pytest.fixture(scope="module")
def protocol_data():
	"""Load and cache all protocol.yaml files in content/protocols/."""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	data = {}  # path_str -> parsed_yaml_dict
	if protocols_dir.is_dir():
		for protocol_yaml in protocols_dir.rglob("protocol.yaml"):
			try:
				with open(protocol_yaml, 'r') as f:
					content = yaml.safe_load(f)
					data[str(protocol_yaml)] = content
			except Exception as exc:
				pytest.fail(f"Failed to load {protocol_yaml}: {exc}")

	return data


#============================================
# Rule 1: Closed cluster set
#============================================

def test_cluster_set_closed():
	"""
	Rule 1: Only three top-level subdirectories permitted under content/protocols/.
	The set is closed: cell_culture, sdspage, runners.

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Closed cluster set)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_cluster_set_closed(protocols_dir)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message}" for f in findings])
		pytest.fail(f"Cluster set violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 2: Relative depth shape
#============================================

def test_relative_depth_shape():
	"""
	Rule 2: Every protocol.yaml lives at exactly two path segments below content/protocols/.
	Shape: <cluster>/<name>/protocol.yaml. Depth is relative to content/protocols/, not repo root.

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Relative-depth shape)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_relative_depth_shape(protocols_dir)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message} ({f.path})" for f in findings])
		pytest.fail(f"Depth violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 3: Exactly one protocol.yaml per leaf
#============================================

def test_exactly_one_protocol_yaml_per_leaf():
	"""
	Rule 3: Each <cluster>/<name>/ directory contains exactly one protocol.yaml.
	Duplicates (copies, backups, stray files) fail the test.

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Exactly one protocol.yaml per leaf)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_exactly_one_protocol_yaml_per_leaf(protocols_dir)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message}" for f in findings])
		pytest.fail(f"Protocol.yaml count violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 4: Type matches cluster
#============================================

def test_type_matches_cluster(protocol_data):
	"""
	Rule 4: protocol_type must match the cluster.
	- cell_culture/<name>/protocol.yaml: protocol_type: mini_protocol
	- sdspage/<name>/protocol.yaml: protocol_type: mini_protocol
	- runners/<name>/protocol.yaml: protocol_type: sequence_runner

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Type matches cluster)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_type_matches_cluster(protocols_dir, protocol_data)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message} ({f.path})" for f in findings])
		pytest.fail(f"Type/cluster mismatches:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 5: Folder name equals protocol_name
#============================================

def test_folder_name_equals_protocol_name(protocol_data):
	"""
	Rule 5: The leaf folder basename must equal the protocol_name field inside protocol.yaml.
	This prevents identity drift (folder 'foo' carrying protocol_name: 'bar').

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Folder name equals protocol_name)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_folder_name_equals_protocol_name(protocols_dir, protocol_data)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message} ({f.path})" for f in findings])
		pytest.fail(f"Folder/protocol_name mismatches:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 6: Unique protocol_name
#============================================

def test_protocol_name_unique(protocol_data):
	"""
	Rule 6: Every protocol_name is unique across the whole content/protocols/ tree.
	A duplicate fails with both offending paths.

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Unique protocol_name)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_protocol_name_unique(protocols_dir, protocol_data)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message} ({f.path})" for f in findings])
		pytest.fail(f"Duplicate protocol_name violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 7: Sidecar ownership
#============================================

def test_sidecar_ownership():
	"""
	Rule 7: Every materials.yaml and scenes/ directory is a sibling of exactly one protocol.yaml.
	No nested scene sub-directories (scenes/<scene>.yaml only, not scenes/<sub>/<scene>.yaml).

	See: docs/specs/TARGET_FILE_STRUCTURE.md (Sidecar ownership)
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_sidecar_ownership(protocols_dir)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message} ({f.path})" for f in findings])
		pytest.fail(f"Sidecar ownership violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")


#============================================
# Rule 8: Discovery round-trip
#============================================

def test_discovery_round_trip():
	"""
	Rule 8: Verify that discovered protocol names match the filesystem folder names
	under content/protocols/. This closes the loop between filesystem layout and runtime
	identity by walking the actual filesystem structure under the three-cluster system.
	"""
	repo_root = Path(git_file_utils.get_repo_root())
	protocols_dir = repo_root / "content" / "protocols"

	findings = layout_check.check_discovery_round_trip(protocols_dir)
	if findings:
		msg = "\n".join([f"  {f.code}: {f.message}" for f in findings])
		pytest.fail(f"Discovery round-trip violations:\n{msg}\n\nSee: docs/specs/TARGET_FILE_STRUCTURE.md")
