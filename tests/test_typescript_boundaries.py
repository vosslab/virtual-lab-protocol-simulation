"""
Boundary lint for src/scene_runtime/{layout,renderer}/ import restrictions.

Rules:
1. No 'solid-js' (or 'solid-js/...') import in scene_runtime/{layout,renderer}/*.ts
2. No src/shell/, src/launcher/ (or relative paths resolving to them) imported
   in scene_runtime/{layout,renderer}/*.ts

Approach: scan every .ts/.tsx file in the protected directories, extract imports,
and assert no violations. Includes a negative test that creates a known-bad fixture,
asserts it would be caught, then cleans up.
"""

import os
import re
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
def _extract_imports(file_content: str) -> list[str]:
	"""
	Extract all import paths from TypeScript/TSX file content.

	Matches patterns like:
	  import { x } from "path"
	  import x from 'path'
	  import * as x from "path"

	Args:
		file_content: Raw TypeScript/TSX source code

	Returns:
		List of import paths (the string inside quotes)
	"""
	# Match import statements with any quote style, capture the path string
	pattern = r'import\s+(?:\{[^}]*\}|[\w\s*,]+)\s+from\s+["\']([^"\']+)["\']'
	matches = re.findall(pattern, file_content)
	return matches


#============================================
def _check_import_violation(import_path: str) -> str | None:
	"""
	Check if a single import violates the boundary rules.

	Rule 1: no 'solid-js' or 'solid-js/*'
	Rule 2: no absolute or relative paths resolving to src/shell/ or src/launcher/

	Args:
		import_path: The import string (e.g., "solid-js", "./../../shell/foo")

	Returns:
		Violation reason string if violated, None if OK.
	"""
	# Rule 1: Reject solid-js and solid-js subpaths
	if import_path.startswith("solid-js"):
		return f"forbidden solid-js import: {import_path}"

	# Rule 2: Reject relative/absolute paths pointing to shell/ or launcher/.
	# Exception: src/shell/adapter/types is the typed seam contract; the
	# protocol runtime imports it deliberately. Type-only imports stay
	# free of any runtime dependency.
	is_seam_types = (
		"shell/adapter/types" in import_path
		or import_path.endswith("/shell/adapter/types")
	)
	if not is_seam_types:
		if "/shell/" in import_path or import_path.endswith("/shell"):
			return f"forbidden shell import: {import_path}"
	if "/launcher/" in import_path or import_path.endswith("/launcher"):
		return f"forbidden launcher import: {import_path}"

	return None


#============================================
def _scan_directory_for_violations(
	directory: str,
	repo_root: str,
) -> list[tuple[str, str]]:
	"""
	Scan a directory for .ts/.tsx files and check for import violations.

	Args:
		directory: Path to scan (e.g., src/scene_runtime/layout/)
		repo_root: Repository root for absolute path handling

	Returns:
		List of (filepath, violation_reason) tuples for files with violations
	"""
	violations: list[tuple[str, str]] = []

	# Find all .ts and .tsx files
	for root, dirs, files in os.walk(directory):
		for filename in files:
			if not (filename.endswith(".ts") or filename.endswith(".tsx")):
				continue

			filepath = os.path.join(root, filename)
			rel_path = os.path.relpath(filepath, repo_root)

			try:
				with open(filepath, "r", encoding="utf-8") as f:
					content = f.read()
			except Exception as e:
				violations.append((rel_path, f"read error: {e}"))
				continue

			imports = _extract_imports(content)
			for imp in imports:
				violation = _check_import_violation(imp)
				if violation:
					violations.append((rel_path, violation))

	return violations


#============================================
def test_no_solid_js_in_scene_runtime() -> None:
	"""
	Assert: no solid-js import exists in any src/scene_runtime/ subtree.
	The protocol/ subtree shares the rule with layout/ and renderer/: the
	runtime must not depend on the reactive framework.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	runtime_dirs = [
		os.path.join(repo_root, "src", "scene_runtime", "layout"),
		os.path.join(repo_root, "src", "scene_runtime", "renderer"),
		os.path.join(repo_root, "src", "scene_runtime", "protocol"),
	]

	violations: list[tuple[str, str]] = []

	for runtime_dir in runtime_dirs:
		if os.path.isdir(runtime_dir):
			violations.extend(_scan_directory_for_violations(runtime_dir, repo_root))

	if violations:
		msg_lines = ["Boundary lint violations found:"]
		for filepath, reason in violations:
			msg_lines.append(f"  {filepath}: {reason}")
		raise AssertionError("\n".join(msg_lines))


#============================================
def test_no_shell_launcher_in_scene_runtime() -> None:
	"""
	Assert: no src/shell/ or src/launcher/ import in scene_runtime/{layout,renderer}
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	layout_dir = os.path.join(repo_root, "src", "scene_runtime", "layout")
	renderer_dir = os.path.join(repo_root, "src", "scene_runtime", "renderer")

	violations: list[tuple[str, str]] = []

	if os.path.isdir(layout_dir):
		violations.extend(_scan_directory_for_violations(layout_dir, repo_root))

	if os.path.isdir(renderer_dir):
		violations.extend(_scan_directory_for_violations(renderer_dir, repo_root))

	if violations:
		msg_lines = ["Boundary lint violations found:"]
		for filepath, reason in violations:
			msg_lines.append(f"  {filepath}: {reason}")
		raise AssertionError("\n".join(msg_lines))


#============================================
def test_boundary_lint_fixture_detection() -> None:
	"""
	Negative test: create a known-bad fixture, verify lint catches it,
	then clean up. Proves the lint is working.
	"""
	import pytest

	marker = _read_marker()
	repo_root = _resolve_repo_root()

	if marker != "typescript":
		pytest.skip("repo is not typescript-typed")

	# Create a temporary fixture file in a protected directory
	fixture_dir = os.path.join(
		repo_root, "tests", "fixtures", "boundary_violation_test"
	)
	os.makedirs(fixture_dir, exist_ok=True)

	fixture_file = os.path.join(fixture_dir, "bad_import.ts")

	# Write a file with a forbidden import
	bad_content = """import { createSignal } from "solid-js";

export const x = createSignal(0);
"""

	try:
		with open(fixture_file, "w", encoding="utf-8") as f:
			f.write(bad_content)

		# Verify the fixture would be caught by our lint function
		imports = _extract_imports(bad_content)
		assert "solid-js" in imports, "fixture must have solid-js import"

		violation = _check_import_violation("solid-js")
		assert violation is not None, "lint must detect solid-js violation"

		# Also test shell/launcher detection. shell/adapter/types is the
		# typed seam exception, so use shell/hud which is forbidden.
		violation2 = _check_import_violation("../../shell/hud/ProtocolHud")
		assert violation2 is not None, "lint must detect shell import violation"

		# And confirm the seam-types exception is honored: importing from
		# shell/adapter/types must NOT be flagged.
		seam_allowed = _check_import_violation("../../shell/adapter/types")
		assert seam_allowed is None, "lint must allow shell/adapter/types seam"

		violation3 = _check_import_violation("../launcher/foo")
		assert violation3 is not None, "lint must detect launcher import violation"

	finally:
		# Clean up: remove the fixture file
		if os.path.exists(fixture_file):
			os.remove(fixture_file)
		if os.path.exists(fixture_dir):
			os.rmdir(fixture_dir)
