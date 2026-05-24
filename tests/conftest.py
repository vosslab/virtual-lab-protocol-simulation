# conftest = "don't collect tests/playwright/ or tests/e2e/ as pytest tests"
# Both subtrees run outside pytest -- see docs/PLAYWRIGHT_USAGE.md and docs/E2E_TESTS.md.
collect_ignore = ["e2e", "playwright"]


# Standard Library
import sys

# local repo modules
import git_file_utils


# Add repo root to sys.path so tests can import top-level packages without
# needing `source source_me.sh`. Mirrors what source_me.sh exports via PYTHONPATH.
_REPO_ROOT = git_file_utils.get_repo_root()
if _REPO_ROOT not in sys.path:
	sys.path.insert(0, _REPO_ROOT)
