"""
Test that src/scene_runtime/ files do not import from src/ outside scene_runtime.

Scene runtime is the new vocabulary; importing from legacy src/*.ts files
would silently re-link old vocabulary into the new tree and break the
boundary contract.
"""

import os
import re

import git_file_utils

REPO_ROOT = git_file_utils.get_repo_root()
SCENE_RUNTIME_ROOT = os.path.join(REPO_ROOT, "src", "scene_runtime")


#============================================
def collect_scene_runtime_files() -> list[str]:
	"""
	Collect all .ts, .mjs, .cjs files under src/scene_runtime/ recursively.
	"""
	files = []
	for root, dirs, filenames in os.walk(SCENE_RUNTIME_ROOT):
		for filename in filenames:
			if filename.endswith((".ts", ".mjs", ".cjs")):
				full_path = os.path.join(root, filename)
				files.append(full_path)
	return sorted(files)


#============================================
def extract_imports(content: str) -> list[tuple[int, str]]:
	"""
	Extract all import specifiers from TypeScript/JavaScript source.

	Returns list of (line_number, import_spec) where import_spec is the
	path/module name being imported.

	Matches:
	- import ... from '<spec>'
	- import('<spec>')
	- require('<spec>')
	"""
	imports = []

	import_from_re = re.compile(r"from\s+['\"]([^'\"]+)['\"]")
	import_call_re = re.compile(r"import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")
	require_re = re.compile(r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")

	for line_no, line in enumerate(content.split("\n"), start=1):
		for pattern in [import_from_re, import_call_re, require_re]:
			for match in pattern.finditer(line):
				spec = match.group(1)
				imports.append((line_no, spec))

	return imports


#============================================
def resolve_relative_path(import_spec: str, file_dir: str) -> str | None:
	"""
	Resolve a relative import spec to a real path.

	Only handles relative paths (starting with '.').
	Returns the normalized absolute path, or None if resolution fails.
	"""
	if not import_spec.startswith("."):
		return None

	resolved = os.path.normpath(os.path.join(file_dir, import_spec))
	resolved = os.path.abspath(resolved)

	if os.path.exists(resolved):
		return resolved
	if os.path.exists(f"{resolved}.ts"):
		return f"{resolved}.ts"
	if os.path.exists(f"{resolved}.mjs"):
		return f"{resolved}.mjs"
	if os.path.exists(f"{resolved}.cjs"):
		return f"{resolved}.cjs"
	if os.path.exists(f"{resolved}/index.ts"):
		return os.path.join(resolved, "index.ts")
	if os.path.exists(f"{resolved}/index.mjs"):
		return os.path.join(resolved, "index.mjs")
	if os.path.exists(f"{resolved}/index.cjs"):
		return os.path.join(resolved, "index.cjs")

	return None


#============================================
def is_legacy_import(import_spec: str, file_path: str) -> tuple[bool, str]:
	"""
	Check whether an import spec is a legacy import (outside scene_runtime).

	Imports from generated/ are permitted (they are generated data, not legacy code).
	Imports from src/scenes/ or other src/*.ts files are forbidden.

	Returns (is_legacy, reason_message).
	"""
	file_dir = os.path.dirname(file_path)

	if import_spec.startswith("."):
		resolved = resolve_relative_path(import_spec, file_dir)
		if resolved is None:
			return False, ""

		resolved_real = os.path.realpath(resolved)
		scene_runtime_real = os.path.realpath(SCENE_RUNTIME_ROOT)
		generated_real = os.path.realpath(os.path.join(REPO_ROOT, "generated"))

		# Allow imports from generated/ (they are generated data, not legacy code).
		if resolved_real.startswith(generated_real + os.sep):
			return False, ""

		# Forbid imports from outside scene_runtime (except generated/).
		if not resolved_real.startswith(scene_runtime_real + os.sep):
			if resolved_real != scene_runtime_real:
				return True, (
					f"relative import resolves to {os.path.relpath(resolved_real, REPO_ROOT)}, "
					f"outside src/scene_runtime/"
				)

		return False, ""

	if import_spec.startswith("/"):
		return True, f"absolute import {import_spec} is not allowed"

	return False, ""


#============================================
def test_scene_runtime_no_legacy_imports() -> None:
	"""
	Assert no import from src/*.ts (outside scene_runtime) in scene_runtime files.
	"""
	files = collect_scene_runtime_files()

	if not files:
		return

	violations = []

	for file_path in files:
		with open(file_path, "r", encoding="utf-8") as handle:
			content = handle.read()

		imports = extract_imports(content)

		for line_no, import_spec in imports:
			is_legacy, reason = is_legacy_import(import_spec, file_path)
			if is_legacy:
				rel_file = os.path.relpath(file_path, REPO_ROOT)
				violation = f"{rel_file}:{line_no}: {import_spec}: {reason}"
				violations.append(violation)

	if violations:
		rel_root = os.path.relpath(SCENE_RUNTIME_ROOT, REPO_ROOT)
		error_msg = (
			f"Found {len(violations)} legacy import(s) in {rel_root}/ files. "
			f"Scene runtime must not import from src/ outside src/scene_runtime/.\n\n"
		)
		error_msg += "\n".join(violations)
		raise AssertionError(error_msg)
