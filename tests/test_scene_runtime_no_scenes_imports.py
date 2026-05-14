"""
Guards WP-SPINE-5 invariant: scene_runtime spine stays free of legacy contamination.

Enforces that no file under src/scene_runtime/ may import from src/scenes/ or
src/legacy_*. The new scene runtime spine must remain pure and decoupled from
legacy code and specific scene implementations.
"""

import pathlib
import re

import git_file_utils


#============================================
def _scan_imports_in_file(file_path: pathlib.Path) -> list[tuple[int, str]]:
	"""
	Scan a TypeScript file for forbidden import patterns.

	Checks for imports matching:
	- from "../scenes
	- from "../../scenes
	- from "src/scenes
	- from "../legacy_
	- from "./legacy_
	- from "src/legacy_

	Args:
		file_path: Path to the TypeScript file to scan.

	Returns:
		List of (line_number, line_content) tuples for lines with forbidden imports.
	"""
	forbidden_patterns = [
		r'from\s+["\']\.\.?/.*scenes',
		r'from\s+["\']src/scenes',
		r'from\s+["\']\.\.?/.*legacy_',
		r'from\s+["\']\./?legacy_',
		r'from\s+["\']src/legacy_',
	]

	violations = []
	content = file_path.read_text(encoding="utf-8")
	lines = content.split("\n")

	for line_num, line in enumerate(lines, start=1):
		for pattern in forbidden_patterns:
			if re.search(pattern, line):
				violations.append((line_num, line))
				break  # One violation per line is enough

	return violations


#============================================
def test_scene_runtime_no_scenes_imports():
	"""
	Assert that no .ts file under src/scene_runtime/ imports from src/scenes/
	or src/legacy_*.

	Scans all TypeScript files recursively under src/scene_runtime/ for forbidden
	import patterns. If any are found, reports them with file paths and line numbers.
	If the src/scene_runtime/ directory does not exist or is empty, test passes vacuously.
	"""
	repo_root = git_file_utils.get_repo_root()
	scene_runtime_dir = pathlib.Path(repo_root) / "src" / "scene_runtime"

	# Vacuous pass if directory does not exist
	if not scene_runtime_dir.exists():
		return

	offending_files = []

	# Walk all .ts files under src/scene_runtime/
	ts_files = list(scene_runtime_dir.rglob("*.ts"))

	# Vacuous pass if no .ts files found
	if not ts_files:
		return

	for ts_file in ts_files:
		violations = _scan_imports_in_file(ts_file)

		if violations:
			rel_path = ts_file.relative_to(repo_root)
			offending_files.append((str(rel_path), violations))

	assert not offending_files, (
		"The following files under src/scene_runtime/ contain forbidden imports "
		"from src/scenes/ or src/legacy_*:\n"
		+ "\n".join(
			f"  {file}:\n"
			+ "\n".join(
				f"    Line {line_num}: {line.strip()}"
				for line_num, line in violations
			)
			for file, violations in offending_files
		)
	)


#============================================
def test_scene_runtime_folder_exists_or_empty():
	"""
	Smoke test: verify that src/scene_runtime/ exists (for M3+ tracking).

	Once WP-SPINE-5 work begins, this directory is expected to exist.
	This test documents that expectation and helps catch accidental deletion.
	"""
	repo_root = git_file_utils.get_repo_root()
	scene_runtime_dir = pathlib.Path(repo_root) / "src" / "scene_runtime"

	# At minimum, the folder should exist (it was created in M1/M2)
	assert scene_runtime_dir.exists(), (
		"src/scene_runtime/ folder not found. "
		"Check that the folder exists and the path is correct."
	)
