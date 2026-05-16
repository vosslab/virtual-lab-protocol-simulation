"""
Content tree paths derived from this file's location.

The repo layout is: <repo>/tools/shared_toolkit/paths.py. Constants below
are the conventional locations every tool uses. For tests that load a
temporary content tree, use paths_from_root() instead of the constants.
"""

import os


# This file lives at <repo>/tools/shared_toolkit/paths.py. Go up two
# levels to reach the repo root.
PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))
TOOLS_DIR = os.path.dirname(PACKAGE_DIR)
REPO_ROOT = os.path.dirname(TOOLS_DIR)
CONTENT_ROOT = os.path.join(REPO_ROOT, "content")
PROTOCOLS_DIR = os.path.join(CONTENT_ROOT, "protocols")
OBJECTS_DIR = os.path.join(CONTENT_ROOT, "objects")
BASE_SCENES_DIR = os.path.join(CONTENT_ROOT, "scenes")


def paths_from_root(root):
	"""
	Return a dict of content-tree paths anchored at an arbitrary root.

	Useful for tests that build a temporary content tree and want the
	same path names as the production layout without monkey-patching the
	module-level constants.
	"""
	root_str = str(root)
	content_root = os.path.join(root_str, "content")
	paths = {
		"repo_root": root_str,
		"content_root": content_root,
		"protocols_dir": os.path.join(content_root, "protocols"),
		"objects_dir": os.path.join(content_root, "objects"),
		"base_scenes_dir": os.path.join(content_root, "scenes"),
	}
	return paths
