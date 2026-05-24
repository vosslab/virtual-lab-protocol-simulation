import json
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
def test_package_json_required_keys() -> None:
	"""
	Ensure package.json has required top-level keys.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	package_json_path = os.path.join(repo_root, "package.json")
	if not os.path.exists(package_json_path):
		pytest.fail("package.json missing in a typescript-typed repo")

	with open(package_json_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	required_keys = ["name", "type", "scripts", "devDependencies"]
	for key in required_keys:
		if key not in data:
			raise AssertionError(f"package.json missing required key: {key}")


#============================================
def test_package_json_type_module() -> None:
	"""
	Ensure package.json has type set to "module".
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	package_json_path = os.path.join(repo_root, "package.json")
	if not os.path.exists(package_json_path):
		pytest.fail("package.json missing in a typescript-typed repo")

	with open(package_json_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	if data.get("type") != "module":
		raise AssertionError(f'package.json type must be "module", got: {data.get("type")}')


#============================================
def test_package_json_canonical_scripts() -> None:
	"""
	Ensure package.json has all canonical scripts defined.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	package_json_path = os.path.join(repo_root, "package.json")
	if not os.path.exists(package_json_path):
		pytest.fail("package.json missing in a typescript-typed repo")

	with open(package_json_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	scripts = data.get("scripts", {})
	canonical_scripts = [
		"build",
		"serve",
		"check",
		"clean",
		"typecheck",
		"lint",
		"format:check",
		"test:node",
	]
	for script in canonical_scripts:
		if script not in scripts:
			raise AssertionError(f"package.json missing script: {script}")


#============================================
def test_package_json_canonical_devdeps() -> None:
	"""
	Ensure package.json has all canonical devDependencies.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	package_json_path = os.path.join(repo_root, "package.json")
	if not os.path.exists(package_json_path):
		pytest.fail("package.json missing in a typescript-typed repo")

	with open(package_json_path, "r", encoding="utf-8") as handle:
		data = json.load(handle)

	dev_deps = data.get("devDependencies", {})
	canonical_deps = [
		"eslint",
		"@eslint/js",
		"typescript-eslint",
		"globals",
		"typescript",
		"esbuild",
		"prettier",
		"@playwright/test",
	]
	for dep in canonical_deps:
		if dep not in dev_deps:
			raise AssertionError(f"package.json missing devDependency: {dep}")
