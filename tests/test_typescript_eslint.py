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
def test_eslint_runs_clean() -> None:
	"""
	Ensure eslint runs without errors on canonical TS patterns.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	tsconfig_path = os.path.join(repo_root, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		pytest.fail("tsconfig.json missing in a typescript-typed repo")

	npx_available = os.popen("which npx").read().strip()
	if not npx_available:
		pytest.skip("npx not available; cannot run TS hygiene gate")

	proc = subprocess.run(
		[
			"npx",
			"eslint",
			"--no-error-on-unmatched-pattern",
			"--max-warnings",
			"0",
			"src/**/*.ts",
			"tests/**/*.ts",
			"*.ts",
		],
		cwd=repo_root,
		capture_output=True,
		text=True,
	)

	if proc.returncode != 0:
		error_msg = f"eslint failed:\nstdout: {proc.stdout}\nstderr: {proc.stderr}"
		raise AssertionError(error_msg)
