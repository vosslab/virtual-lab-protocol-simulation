"""
Guard test: ensure experiments/css_native_layout/ has zero imports from src/
and zero legacy scaling/layout fields.

NEW0 is a clean-room prototype. No code in experiments/css_native_layout/
may import from src/, require from src/, or use @ts-ignore near src imports.
No YAML scene files may declare legacy layout fields (bounds, x, y, width, height, etc.).
No CSS or YAML may reference legacy scaling fields (display_width_cm, width_scale, px_per_cm, fudge).
"""

import os
import re

import git_file_utils

REPO_ROOT = git_file_utils.get_repo_root()
EXPERIMENT_DIR = os.path.join(REPO_ROOT, "experiments", "css_native_layout")

# Extensions for code files we care about
CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".py"}
YAML_EXTENSIONS = {".yaml", ".yml"}

# Patterns to reject: ES6 imports, CommonJS requires, @ts-ignore near src imports
PATTERNS_TO_REJECT = [
	re.compile(r'from\s+["\'](?:\.{1,2}/)*src/'),
	re.compile(r'require\s*\(\s*["\'](?:\.{1,2}/)*src/'),
	re.compile(r'from\s+["\']src/'),
	re.compile(r'require\s*\(\s*["\']src/'),
]

# Legacy scaling fields: forbidden everywhere in css_native_layout
LEGACY_SCALING_PATTERN = re.compile(
	r'\b(?:display_width_cm|width_scale|px_per_cm|fudge)\b'
)

# Legacy manifest fields: forbidden in YAML files (not in CSS, which may use padding/margin/border)
LEGACY_MANIFEST_FIELDS = {
	'bounds', 'x', 'y', 'top', 'left', 'right', 'bottom',
	'width', 'height', 'offset', 'align', 'alignment',
	'row', 'row_index', 'column', 'slot', 'slot_index',
	'depth', 'depth_tier', 'z_index', 'scale', 'margin', 'padding',
	'baseline', 'anchor', 'coordinates', 'position'
}

# Pattern to match YAML manifest field declarations (key: value format)
# Avoids matching in comments and CSS
MANIFEST_FIELD_PATTERN = re.compile(
	r'^\s*(' + '|'.join(re.escape(f) for f in LEGACY_MANIFEST_FIELDS) + r'):'
)

# Look for @ts-ignore on or near import lines
TS_IGNORE_PATTERN = re.compile(r'//\s*@ts-ignore')


#============================================
def get_experiment_files() -> tuple[list[str], list[str]]:
	"""
	Collect all committed files under experiments/css_native_layout/.
	Exclude test-results/ and generated/.
	Return (code_files, yaml_files) as separate lists.
	"""
	if not os.path.isdir(EXPERIMENT_DIR):
		return [], []

	code_files = []
	yaml_files = []
	for tracked_path in git_file_utils.list_tracked_files(
		REPO_ROOT,
		patterns=["experiments/css_native_layout/**/*"],
		error_message="Failed to list tracked files in experiments/css_native_layout/.",
	):
		full_path = os.path.join(REPO_ROOT, tracked_path)

		# Skip test-results/ and generated/
		if "test-results" in tracked_path or "generated" in tracked_path:
			continue

		if not os.path.isfile(full_path):
			continue

		_, ext = os.path.splitext(tracked_path)
		if ext in CODE_EXTENSIONS:
			code_files.append(full_path)
		elif ext in YAML_EXTENSIONS:
			yaml_files.append(full_path)

	return sorted(code_files), sorted(yaml_files)


#============================================
def check_file_for_src_imports(file_path: str) -> list[tuple[int, str]]:
	"""
	Scan a file for src/ imports or @ts-ignore near imports.
	Return list of (line_number, issue_description).
	"""
	issues = []

	with open(file_path, "r", encoding="utf-8") as f:
		lines = f.readlines()

	for line_num, line in enumerate(lines, start=1):
		# Check for explicit src/ imports
		for pattern in PATTERNS_TO_REJECT:
			if pattern.search(line):
				issues.append((line_num, f"Found src/ import: {line.strip()}"))
				break

		# Check for @ts-ignore near import lines (within 2 lines)
		if TS_IGNORE_PATTERN.search(line) and ("import" in line or "require" in line):
			issues.append((line_num, f"@ts-ignore near import: {line.strip()}"))

	return issues


#============================================
def check_file_for_legacy_scaling(file_path: str) -> list[tuple[int, str]]:
	"""
	Scan a file (CSS or YAML) for legacy scaling field names.
	Return list of (line_number, issue_description).
	"""
	issues = []

	with open(file_path, "r", encoding="utf-8") as f:
		lines = f.readlines()

	for line_num, line in enumerate(lines, start=1):
		if LEGACY_SCALING_PATTERN.search(line):
			# Avoid false positives in comments
			code_part = line.split("#")[0]  # Remove comment part
			if LEGACY_SCALING_PATTERN.search(code_part):
				issues.append((line_num, f"Found legacy scaling field: {line.strip()}"))

	return issues


#============================================
def check_yaml_for_legacy_manifest_fields(file_path: str) -> list[tuple[int, str]]:
	"""
	Scan a YAML file for legacy manifest field names.
	Return list of (line_number, issue_description).
	Only check YAML files (not CSS).
	"""
	issues = []

	with open(file_path, "r", encoding="utf-8") as f:
		lines = f.readlines()

	for line_num, line in enumerate(lines, start=1):
		# Match YAML key declarations: whitespace + key + colon
		match = MANIFEST_FIELD_PATTERN.match(line)
		if match:
			field_name = match.group(1)
			issues.append((line_num, f"Found legacy manifest field: {field_name}"))

	return issues


#============================================
def test_no_old_layout_imports() -> None:
	"""
	Assert that every file under experiments/css_native_layout/:
	1. Code files have zero imports from src/
	2. All files have zero legacy scaling fields (display_width_cm, width_scale, px_per_cm, fudge)
	3. YAML files have zero legacy manifest fields (bounds, x, y, width, height, etc.)
	"""
	code_files, yaml_files = get_experiment_files()
	all_files = code_files + yaml_files

	all_issues = []

	# Check code files for src imports
	for file_path in code_files:
		rel_path = os.path.relpath(file_path, REPO_ROOT)
		issues = check_file_for_src_imports(file_path)

		if issues:
			for line_num, description in issues:
				all_issues.append(f"{rel_path}:{line_num}: {description}")

	# Check all files for legacy scaling fields
	for file_path in all_files:
		rel_path = os.path.relpath(file_path, REPO_ROOT)
		issues = check_file_for_legacy_scaling(file_path)

		if issues:
			for line_num, description in issues:
				all_issues.append(f"{rel_path}:{line_num}: {description}")

	# Check YAML files for legacy manifest fields
	for file_path in yaml_files:
		rel_path = os.path.relpath(file_path, REPO_ROOT)
		issues = check_yaml_for_legacy_manifest_fields(file_path)

		if issues:
			for line_num, description in issues:
				all_issues.append(f"{rel_path}:{line_num}: {description}")

	# Pass vacuously if no files exist yet
	if not all_files:
		return

	# Assert zero violations
	assert not all_issues, (
		"experiments/css_native_layout/ guard gates failed:\n"
		+ "\n".join(all_issues)
	)
