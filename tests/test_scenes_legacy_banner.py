"""
Test gate for legacy banner in src/scenes TypeScript files.

WP-SPINE-6: Verify that all *.ts files in src/scenes/ start with the
legacy banner on line 1:
  // LEGACY: superseded by src/scene_runtime/*. Do not extend.

This banner marks scene files as legacy and discourages extension.
"""

import os

# Standard Library
import subprocess

# local repo modules
import git_file_utils


#============================================
# Test functions
#============================================

def test_all_scene_files_have_legacy_banner():
	"""
	Assert that every *.ts file in src/scenes/ starts with the legacy banner.

	Walks the git index to find all TypeScript files and verifies that each
	has the exact banner text as the first line.
	"""
	banner = "// LEGACY: superseded by src/scene_runtime/*. Do not extend."
	repo_root = git_file_utils.get_repo_root()

	# Get all TS files in src/scenes
	result = subprocess.run(
		['git', 'ls-files', 'src/scenes', '--cached'],
		cwd=repo_root,
		capture_output=True,
		text=True,
		check=True
	)

	ts_files = [f for f in result.stdout.strip().split('\n') if f.endswith('.ts')]

	assert len(ts_files) > 0, "No TypeScript files found in src/scenes/"

	missing_banner = []

	for ts_file in ts_files:
		full_path = os.path.join(repo_root, ts_file)

		with open(full_path, 'r', encoding='utf-8') as f:
			first_line = f.readline().rstrip('\n')

		if first_line != banner:
			missing_banner.append((ts_file, first_line))

	if missing_banner:
		msg = "Legacy banner missing or incorrect in:\n"
		for ts_file, actual in missing_banner:
			msg += f"  {ts_file}\n"
			msg += f"    Expected: {banner}\n"
			msg += f"    Actual:   {actual}\n"
		raise AssertionError(msg)
