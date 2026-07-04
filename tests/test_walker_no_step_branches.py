"""
Walker no-step-branches enforcement test.

Scans all walker engine files under tests/playwright/e2e/ and asserts
that no per-step or per-protocol branches exist. A walker must be generic
and driven entirely by schema, never by step_name or protocol_name
conditionals.

This test enforces the WP-WALKER-ENGINE-1 requirement:
  "Engine contains zero per-protocol branches at the AST level."
"""

import os
import re

import file_utils

REPO_ROOT = file_utils.get_repo_root()


def check_walker_files_for_branches() -> list[str]:
	"""
	Scan all .mjs/.ts files under tests/playwright/e2e/ for forbidden patterns.
	"""
	walker_dir = os.path.join(REPO_ROOT, 'tests', 'playwright', 'e2e')

	if not os.path.isdir(walker_dir):
		# Walker directory doesn't exist yet; test passes trivially.
		return []

	forbidden_patterns = [
		# Per-step conditionals
		(r'if\s*\(\s*step(?:Name)?(?:\s*===|[\.\w\[]*\s*===)\s*["\']', 'per-step branch on step name'),
		(r'switch\s*\(\s*step(?:Name)?', 'switch on step name'),
		# Per-protocol conditionals
		(r'if\s*\(\s*protocol(?:Name)?\s*===', 'per-protocol branch on protocol name'),
		(r'switch\s*\(\s*protocol(?:Name)?', 'switch on protocol name'),
		# Scene-specific branches
		(r'if\s*\(\s*scene(?:Id)?\s*===', 'per-scene branch'),
		(r'switch\s*\(\s*scene(?:Id)?', 'switch on scene'),
	]

	violations = []

	# Walk all source files in the walker directory
	for root, dirs, files in os.walk(walker_dir):
		for filename in files:
			if not filename.endswith(('.mjs', '.ts', '.js')):
				continue

			filepath = os.path.join(root, filename)
			rel_path = os.path.relpath(filepath, REPO_ROOT)

			try:
				with open(filepath, 'r', encoding='utf-8') as f:
					content = f.read()
			except (IOError, UnicodeDecodeError) as e:
				violations.append(f'{rel_path}: Could not read file: {e}')
				continue

			# Check for forbidden patterns
			for line_num, line in enumerate(content.split('\n'), 1):
				for pattern, desc in forbidden_patterns:
					if re.search(pattern, line):
						violations.append(
							f'{rel_path}:{line_num}: {desc}\n'
							f'  {line.strip()}'
						)

	return violations


def test_walker_files_scanned() -> None:
	"""
	Enforce that the live e2e walker directory exists and is actually scanned,
	so this test cannot pass vacuously against a missing directory.
	"""
	walker_dir = os.path.join(REPO_ROOT, 'tests', 'playwright', 'e2e')
	assert os.path.isdir(walker_dir)

	scanned = [
		filename
		for filename in os.listdir(walker_dir)
		if filename.endswith(('.mjs', '.ts', '.js'))
	]
	assert len(scanned) > 0


def test_walker_no_step_branches() -> None:
	"""
	Enforce: walker engine contains no per-step, per-protocol, or per-scene branches.
	"""
	violations = check_walker_files_for_branches()

	msg = 'Walker contains forbidden per-step/protocol/scene branches:\n\n'
	msg += '\n'.join(violations)
	assert not violations, msg
