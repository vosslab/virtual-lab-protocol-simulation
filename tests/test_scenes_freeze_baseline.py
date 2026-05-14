"""
Freeze gate for src/scenes/ TypeScript files.

Per docs/SRC_SCENES_FREEZE.md, src/scenes/ is legacy reference and
emergency-compatibility only. No new behavior, no new dispatch branches, no
new feature logic. Only allowed edits are mechanical renames, type-union
updates, the legacy banner header, and small COMPAT SHIM blocks marked for
M9 removal.

This test enforces the freeze by recording a baseline manifest of per-file
line counts under tests/data/scenes_freeze_baseline.json and asserting that
each file stays at or below its baseline plus a small drift allowance.
The baseline is created on first run if missing and read on every later run.
"""

# Standard Library
import os
import json
import pathlib
import subprocess

# local repo modules
import git_file_utils


# Drift allowance per file in lines. Covers the legacy banner header
# (1 line) plus tiny COMPAT SHIM markers. Anything bigger should land in
# src/scene_runtime/ instead. See docs/SRC_SCENES_FREEZE.md.
DRIFT_ALLOWANCE_LINES = 2

# Relative path of the baseline manifest from the repo root.
BASELINE_RELPATH = os.path.join("tests", "data", "scenes_freeze_baseline.json")


#============================================
def _list_scenes_ts_files(repo_root: str) -> list[str]:
	"""
	List tracked TypeScript files under src/scenes/.

	Args:
		repo_root: Absolute path to the repository root.

	Returns:
		Sorted list of repo-relative TS file paths under src/scenes/.
	"""
	# Use git ls-files to mirror what the legacy banner gate uses
	result = subprocess.run(
		["git", "ls-files", "src/scenes", "--cached"],
		cwd=repo_root,
		capture_output=True,
		text=True,
		check=True,
	)
	# Filter to .ts files only and sort for stable manifest output
	ts_files = [f for f in result.stdout.strip().split("\n") if f.endswith(".ts")]
	ts_files.sort()
	return ts_files


#============================================
def _count_lines(file_path: str) -> int:
	"""
	Count the number of lines in a text file using a streaming read.

	Args:
		file_path: Absolute path to the file.

	Returns:
		Number of lines in the file.
	"""
	# Stream the file so we never hold the full text in memory
	line_count = 0
	with open(file_path, "r", encoding="utf-8") as handle:
		for _ in handle:
			line_count += 1
	return line_count


#============================================
def _build_current_manifest(repo_root: str) -> dict[str, int]:
	"""
	Build a manifest mapping each src/scenes TS file to its current line count.

	Args:
		repo_root: Absolute path to the repository root.

	Returns:
		Dict from repo-relative TS path to current line count.
	"""
	# Collect every tracked scene file and record its current line count
	manifest = {}
	ts_files = _list_scenes_ts_files(repo_root)
	for rel_path in ts_files:
		full_path = os.path.join(repo_root, rel_path)
		manifest[rel_path] = _count_lines(full_path)
	return manifest


#============================================
def _load_or_create_baseline(baseline_path: str, manifest: dict[str, int]) -> dict[str, int]:
	"""
	Load the baseline manifest if it exists, otherwise create it from the
	current manifest and write it to disk.

	Args:
		baseline_path: Absolute path to the baseline JSON file.
		manifest: Current line-count manifest used to seed the baseline.

	Returns:
		The baseline manifest as a dict from path to line count.
	"""
	# Reuse an existing baseline when one is present
	if os.path.exists(baseline_path):
		with open(baseline_path, "r", encoding="utf-8") as handle:
			loaded = json.load(handle)
		return loaded

	# First-run seed: persist current manifest so future runs gate against it
	parent = os.path.dirname(baseline_path)
	pathlib.Path(parent).mkdir(parents=True, exist_ok=True)
	with open(baseline_path, "w", encoding="utf-8") as handle:
		json.dump(manifest, handle, indent="\t", sort_keys=True)
		handle.write("\n")
	return dict(manifest)


#============================================
def _format_violations(violations: list[tuple[str, int, int, int]]) -> str:
	"""
	Format a list of freeze violations into a readable assertion message.

	Args:
		violations: List of (path, baseline, current, allowance) tuples.

	Returns:
		Human-readable assertion message.
	"""
	# Build a multi-line message so failures point at the exact files
	message = "src/scenes/ freeze violation. See docs/SRC_SCENES_FREEZE.md.\n"
	message += "The following files exceed their baseline line count plus "
	message += f"drift allowance of {DRIFT_ALLOWANCE_LINES} lines:\n"
	for rel_path, baseline, current, allowance in violations:
		over = current - (baseline + allowance)
		message += f"  {rel_path}: baseline={baseline} current={current} over_by={over}\n"
	return message


#============================================
# Test functions
#============================================

def test_scenes_freeze_baseline_holds():
	"""
	Assert each src/scenes TS file stays within baseline + drift allowance.

	On first run, seeds tests/data/scenes_freeze_baseline.json from the
	current line counts and passes. On every later run, fails if any file
	has grown past its recorded baseline by more than DRIFT_ALLOWANCE_LINES.
	"""
	repo_root = git_file_utils.get_repo_root()
	baseline_path = os.path.join(repo_root, BASELINE_RELPATH)

	# Snapshot the current state of the legacy scene tree
	current_manifest = _build_current_manifest(repo_root)

	# Load or initialize the baseline from disk
	baseline_manifest = _load_or_create_baseline(baseline_path, current_manifest)

	# Compare each tracked file against its baseline
	violations = []
	for rel_path, current_lines in current_manifest.items():
		if rel_path not in baseline_manifest:
			# Brand-new file under src/scenes/ during the freeze period
			violations.append((rel_path, 0, current_lines, DRIFT_ALLOWANCE_LINES))
			continue
		baseline_lines = baseline_manifest[rel_path]
		if current_lines > baseline_lines + DRIFT_ALLOWANCE_LINES:
			violations.append((rel_path, baseline_lines, current_lines, DRIFT_ALLOWANCE_LINES))

	assert not violations, _format_violations(violations)


#============================================
def test_scenes_freeze_baseline_manifest_present():
	"""
	Assert that the baseline manifest file exists after the freeze gate runs.

	The first invocation of test_scenes_freeze_baseline_holds creates the
	baseline. This test documents that the baseline must be tracked going
	forward so the freeze gate has something to compare against.
	"""
	repo_root = git_file_utils.get_repo_root()
	baseline_path = os.path.join(repo_root, BASELINE_RELPATH)
	assert os.path.exists(baseline_path), (
		f"Baseline manifest missing at {BASELINE_RELPATH}. "
		"Run pytest tests/test_scenes_freeze_baseline.py once to seed it, "
		"then commit the generated file."
	)
