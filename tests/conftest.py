# conftest = "don't collect tests/playwright/ or tests/e2e/ as pytest tests"
# Both subtrees run outside pytest -- see docs/PLAYWRIGHT_USAGE.md and docs/E2E_TESTS.md.
collect_ignore = ["e2e", "playwright"]


# ============================================
# Fresh-clone bootstrap for the gitignored generated/ tree.
#
# generated/ holds derived TS modules emitted by:
#   - pipeline/generate_svg_globals.py from assets/equipment/*.svg
#   - pipeline/build_protocol_data.py from YAML protocol definitions
#   - pipeline/build_scene_data.py from YAML scene definitions
#
# The tree is gitignored, so a fresh clone has no generated/ files. Any pytest
# that (directly or transitively) imports from generated/ would fail without a
# build run first. Build scripts own regeneration; check_codebase.sh is
# read-only; this hook makes pytest self-sufficient by running the bootstrap
# script once per session if any required file is missing.

# Standard Library
import os
import subprocess

# local repo modules
import git_file_utils


def pytest_sessionstart(session) -> None:
	# Run the bootstrap script if any generated file is missing.
	# Do not regenerate when all files already exist -- avoids redundant work
	# and keeps the boundary clear (build scripts regenerate; this is bootstrap).
	# Covers SVG, scene, protocol, and inventory generators.
	del session  # unused; pytest hook signature
	repo_root = git_file_utils.get_repo_root()

	# Check for at least one file from each generated family. If any is missing,
	# run the bootstrap script to regenerate all.
	required_files = [
		os.path.join(repo_root, "generated", "svg_manifest.ts"),
		os.path.join(repo_root, "generated", "scene_data.ts"),
		os.path.join(repo_root, "generated", "protocol_data.ts"),
		os.path.join(repo_root, "generated", "inventory_data.ts"),
	]

	# If any required file is missing, bootstrap the entire generated tree.
	if any(not os.path.isfile(p) for p in required_files):
		bootstrap_path = os.path.join(repo_root, "pipeline", "bootstrap_generated.sh")
		subprocess.run(
			["bash", bootstrap_path],
			cwd=repo_root,
			check=True,
		)
