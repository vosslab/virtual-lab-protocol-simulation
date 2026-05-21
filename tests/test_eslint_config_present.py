import os
import subprocess


#============================================
def _resolve_repo_root() -> str:
	"""
	Resolve the repository root using git rev-parse.

	Returns:
		str: Absolute path to repository root.
	"""
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	return result.stdout.strip()


#============================================
def _read_marker() -> str:
	"""
	Read REPO_TYPE marker from repository root.

	Returns:
		str: Marker token (e.g., "typescript"), or None if missing.
	"""
	repo_root = _resolve_repo_root()
	marker_path = os.path.join(repo_root, "REPO_TYPE")
	if not os.path.exists(marker_path):
		return None
	with open(marker_path, "r", encoding="utf-8") as handle:
		content = handle.read().strip()
	return content if content else None


#============================================
def test_eslint_config_js_exists() -> None:
	"""
	Ensure eslint.config.js exists in typescript-typed repo.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	eslint_config_path = os.path.join(repo_root, "eslint.config.js")
	if not os.path.exists(eslint_config_path):
		pytest.fail("eslint.config.js missing in a typescript-typed repo")


#============================================
def test_eslintrc_cjs_not_present() -> None:
	"""
	Ensure legacy .eslintrc.cjs is not present (flat config is canonical).
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	eslintrc_path = os.path.join(repo_root, ".eslintrc.cjs")
	if os.path.exists(eslintrc_path):
		pytest.fail(".eslintrc.cjs should not exist; use flat config (eslint.config.js)")


