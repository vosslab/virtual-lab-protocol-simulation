"""
Test that only the five authored modules import from generated/.

WP-1.2.2: Verify the generated/ import boundary:
- No file under src/ (except the authored boundary modules) imports from ../generated/*.
- The authored modules are hardcoded: svg_assets.ts, svg_color_patch.ts, scene_configs.ts, inventory.ts, protocol.ts.
- svg_assets.ts and svg_color_patch.ts form the recolor primitives composition layer.
- The line detector parses both `import ... from "..."` and `export ... from "..."` patterns,
  plus `import type` variants.
- Test bootstraps generators if required .ts files are missing.
"""

import os
import re

import pytest

import git_file_utils


#============================================
# Hardcoded list of facade files (basename only, no path prefix).
# Also included: svg_color_patch.ts (the recolor primitives layer owned by svg_assets.ts).
FACADE_FILES = {
	"svg_assets.ts",
	"svg_color_patch.ts",  # recolor primitives layer for SVG composition
	"scene_configs.ts",
	"inventory.ts",
	"protocol.ts",
}


#============================================
def is_ts_file(path: str) -> bool:
	"""Check if a file is a TypeScript source file."""
	return path.endswith(".ts")


#============================================
def is_facade_file(file_path: str) -> bool:
	"""Check if a file is one of the five facade files. svg_color_patch.ts is the recolor primitives composition layer."""
	basename = os.path.basename(file_path)
	return basename in FACADE_FILES


#============================================
def find_generated_imports(file_path: str) -> list[tuple[int, str]]:
	"""
	Find all lines that import from generated/.
	Returns list of (line_number, full_line) tuples (1-indexed line numbers).

	Patterns detected:
	- import ... from "../generated/..."
	- import ... from "./generated/..."
	- export ... from "../generated/..."
	- export ... from "./generated/..."
	- import type ... from "../generated/..."
	"""
	imports = []
	pattern = re.compile(
		r'(?:import|export)\s+(?:type\s+)?.*from\s+["\']\.{1,2}/generated/[^"\']+["\']'
	)
	with open(file_path, "r", encoding="utf-8") as f:
		for line_no, line in enumerate(f, start=1):
			if pattern.search(line):
				imports.append((line_no, line.rstrip()))
	return imports


#============================================
def walk_ts_files_in_dir(dir_path: str) -> list[str]:
	"""Walk a directory and return all .ts files (repo-root-relative paths)."""
	repo_root = git_file_utils.get_repo_root()
	ts_files = []
	if not os.path.isdir(dir_path):
		return ts_files
	for root, dirs, files in os.walk(dir_path):
		# Skip node_modules and other build artifacts
		dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", "build")]
		for f in files:
			if is_ts_file(f):
				full_path = os.path.join(root, f)
				rel_path = os.path.relpath(full_path, repo_root)
				ts_files.append(rel_path)
	return ts_files


#============================================
def test_facade_imports_only():
	"""
	WP-1.2.2: Assert no file under src/ imports from generated/ except the four facades.

	conftest.pytest_sessionstart() bootstraps generated/ if any required file is missing.
	If generated/ is still absent, skip with a clear message.
	"""
	repo_root = git_file_utils.get_repo_root()
	src_dir = os.path.join(repo_root, "src")
	generated_dir = os.path.join(repo_root, "generated")

	# Check if generated/ exists and has required files; if not, skip
	required_generated = [
		"svg_manifest.ts",
		"scene_data.ts",
		"protocol_data.ts",
		"inventory_data.ts",
	]

	missing_any = any(
		not os.path.isfile(os.path.join(generated_dir, f))
		for f in required_generated
	)
	if missing_any:
		pytest.skip(
			"generated/ files missing after conftest bootstrap; "
			"run: bash tools/bootstrap_generated.sh"
		)

	# Walk src/ and collect all TS files
	ts_files = walk_ts_files_in_dir(src_dir)

	# Check each file for unauthorized imports
	violations = []
	for ts_file in ts_files:
		full_path = os.path.join(repo_root, ts_file)
		# Skip facade files (they are allowed to import from generated/)
		if is_facade_file(ts_file):
			continue
		# Check for generated imports
		imports = find_generated_imports(full_path)
		if imports:
			violations.append((ts_file, imports))

	assert not violations, (
		"The following files under src/ import from generated/ but are not"
		" in the facade allowlist. Only these facades may import generated/:\n"
		f"  {', '.join(sorted(FACADE_FILES))}\n"
		+ "\nViolating imports:\n"
		+ "\n".join(
			f"  {file}:\n"
			+ "\n".join(f"    Line {line_no}: {line}" for line_no, line in imports)
			for file, imports in violations
		)
	)
