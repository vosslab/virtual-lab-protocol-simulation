"""
Guards Plan C invariant: legacy compatibility-token interaction layer stays retired.

WP-1.1.4 (Plan C): Asserts that no source file under src/ contains references
to buildLegacyToken() or legacy_tokens. These symbols were used in the old
Plan B compatibility layer and must never reappear.
"""

import pathlib

import git_file_utils


#============================================
def test_no_legacy_tokens():
	"""
	Assert that no .ts file under src/ contains buildLegacyToken or legacy_tokens.
	"""
	repo_root = git_file_utils.get_repo_root()
	src_dir = pathlib.Path(repo_root) / "src"

	forbidden_patterns = [
		"buildLegacyToken",
		"legacy_tokens",
	]

	offending_files = []

	# Walk all .ts files under src/
	for ts_file in src_dir.rglob("*.ts"):
		content = ts_file.read_text(encoding="utf-8")

		for pattern in forbidden_patterns:
			if pattern in content:
				rel_path = ts_file.relative_to(repo_root)
				offending_files.append((str(rel_path), pattern))
				break  # One violation per file is enough

	assert not offending_files, (
		"The following files under src/ contain legacy token references that must be removed:\n"
		+ "\n".join(
			f"  {file}: contains '{pattern}'"
			for file, pattern in offending_files
		)
	)
