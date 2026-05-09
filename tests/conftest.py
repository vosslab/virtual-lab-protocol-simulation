# conftest = "don't collect tests/playwright/ or tests/e2e/ as pytest tests"
# Both subtrees run outside pytest -- see docs/PLAYWRIGHT_USAGE.md and docs/E2E_TESTS.md.
collect_ignore = ["e2e", "playwright"]


# ============================================
# Fresh-clone bootstrap for the gitignored generated/ tree.
#
# generated/ holds derived SVG asset modules emitted by
# tools/generate_svg_globals.py from assets/equipment/*.svg. The tree is
# gitignored, so a fresh clone has no generated/ files. Any pytest that
# (directly or transitively) imports from generated/ would fail without a
# build run first. Build scripts own regeneration; check_codebase.sh is
# read-only; this hook makes pytest self-sufficient by running the
# generator once per session if the manifest is missing.
import os
import subprocess

import git_file_utils


def pytest_sessionstart(session):
	# Run the SVG generator once if generated/svg_manifest.ts is missing.
	# Do not regenerate when it already exists -- avoids redundant work and
	# keeps the boundary clear (build scripts regenerate; this is bootstrap).
	del session  # unused; pytest hook signature
	repo_root = git_file_utils.get_repo_root()
	manifest_path = os.path.join(repo_root, "generated", "svg_manifest.ts")
	if os.path.isfile(manifest_path):
		return
	generator_path = os.path.join(repo_root, "tools", "generate_svg_globals.py")
	subprocess.run(
		["python3", generator_path],
		cwd=repo_root,
		check=True,
	)
