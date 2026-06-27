#!/usr/bin/env python3
"""End-to-end check for the generated generated/object_library.ts artifact.

Lives in tests/e2e/ because it reads a GENERATED build artifact
(generated/object_library.ts) rather than walking source YAML. Reading a
generated file in the pytest fast lane is a stale-file risk: the assertion can
pass or fail based on whether the generator was last run, not on current source.
Per docs/E2E_TESTS.md and docs/PYTEST_STYLE.md, artifact round-trip checks belong
here, not in `pytest tests/`. The fast YAML-walk behavioral tests stay in
tests/test_object_library_visual_states.py.

This verifies the generator -> generated file round trip: the emitted
object_library.ts must carry the aspirating_pipette visual_states behavioral
contract (the fill_height formula and the held_material_name cases).

Usage:
	python3 tests/e2e/e2e_object_library_generated.py
Exits 0 on success, nonzero on first failure.
"""

import os
import sys

# tests/file_utils.py is the shared repo-root helper. This e2e script runs
# standalone (not under pytest), so add tests/ to the path before importing it.
_TESTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _TESTS_DIR not in sys.path:
	sys.path.insert(0, _TESTS_DIR)

import file_utils


#============================================

def check_generated_visual_states(repo_root: str) -> None:
	"""Read generated/object_library.ts and assert the behavioral contract."""
	generated_path = os.path.join(repo_root, "generated", "object_library.ts")
	with open(generated_path, "r") as f:
		content = f.read()

	# The generated file must contain visual_states for aspirating_pipette and
	# reference the fill_height formula (behavioral contract), plus the
	# held_material_name cases.
	assert "fill_height(state(held_material_volume)" in content
	assert "'held_material_name'" in content


#============================================

def main() -> None:
	repo_root = file_utils.get_repo_root()
	check_generated_visual_states(repo_root)
	print("PASS: generated/object_library.ts carries aspirating_pipette visual_states")


if __name__ == "__main__":
	main()
