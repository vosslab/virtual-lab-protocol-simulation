"""
Test gate for walker source code pattern enforcement.

WP-WALKER-5: Verify that walker source files contain NO forbidden patterns.
- NO identity branches on step.id, protocolId, or modal.owner
- NO direct state writes to gameState, activeScene, selectedTool, or window properties
- NO state mutations via direct assignment

Forbidden identity branches (regex):
  - step.id === (identity check)
  - protocolId === (identity check)
  - modal.owner === (identity check)

Forbidden state writes (regex):
  - gameState.FIELD = VALUE (assignment, not comparison)
  - activeScene = VALUE
  - selectedTool = VALUE
  - window.prompt = VALUE
  - window.confirm = VALUE

Vacuously passes if tests/playwright/walker/ does not exist yet.
"""

import os
import re
import pytest

# local repo modules
import git_file_utils


#============================================
# Forbidden patterns
#============================================

FORBIDDEN_PATTERNS = [
	(r'step\.id\s*===', 'identity branch on step.id'),
	(r'protocolId\s*===', 'identity branch on protocolId'),
	(r'modal\.owner\s*===', 'identity branch on modal.owner'),
	(r'gameState\.\w+\s*=(?!=)', 'direct gameState write'),
	(r'activeScene\s*=(?!=)', 'direct activeScene write'),
	(r'selectedTool\s*=(?!=)', 'direct selectedTool write'),
	(r'window\.prompt\s*=(?!=)', 'window.prompt mutation'),
	(r'window\.confirm\s*=(?!=)', 'window.confirm mutation'),
	(r'advanceStepClick', 'walker calling fixture-specific function'),
]


#============================================
# Test function
#============================================

def test_walker_no_step_branches():
	"""
	Scan walker source files and verify no forbidden patterns exist.

	Walks tests/playwright/walker/ for .ts and .mjs files.
	For each file, checks every line against all forbidden patterns.
	Collects violations and reports them with file, line number, pattern, and content.

	Passes vacuously if walker folder doesn't exist.
	"""
	repo_root = git_file_utils.get_repo_root()
	walker_dir = os.path.join(repo_root, 'tests', 'playwright', 'walker')

	# Vacuously pass if walker folder doesn't exist yet
	if not os.path.isdir(walker_dir):
		pytest.skip('tests/playwright/walker/ does not exist yet (M4 in flight)')

	violations = []

	# Walk walker directory for .ts and .mjs files
	for root, dirs, files in os.walk(walker_dir):
		for filename in sorted(files):
			if not (filename.endswith('.ts') or filename.endswith('.mjs')):
				continue

			file_path = os.path.join(root, filename)
			try:
				with open(file_path, 'r', encoding='utf-8') as f:
					lines = f.readlines()
			except Exception as e:
				violations.append((file_path, 0, 'read error', str(e)))
				continue

			# Check each line against all forbidden patterns
			for line_num, line_content in enumerate(lines, start=1):
				for pattern_regex, pattern_name in FORBIDDEN_PATTERNS:
					if re.search(pattern_regex, line_content):
						violations.append((
							file_path,
							line_num,
							pattern_name,
							line_content.rstrip(),
						))

	# Report violations
	if violations:
		report_lines = ['Walker source code violations found:']
		for file_path, line_num, pattern_name, line_content in violations:
			rel_path = os.path.relpath(file_path, repo_root)
			report_lines.append(f'{rel_path}:{line_num}: {pattern_name}')
			report_lines.append(f'  {line_content}')

		pytest.fail('\n'.join(report_lines))


if __name__ == '__main__':
	test_walker_no_step_branches()
