"""Regression guard: SCENE_ALLOWLIST must never return to gen_scene_index.py.

SCENE_ALLOWLIST was a hiding gate that silently dropped base scenes outside a
curated list, turning broken generation coverage into an invisible product
decision. It was deleted in favor of discover-all + explicit per-scene
classification (emitted / skipped-with-reason / errored) plus a machine-readable
generated/scene_manifest.json. This test fails if the identifier reappears in the
generator source, so the hiding gate cannot be reintroduced by accident.
"""

import os

import git_file_utils


#============================================

def test_scene_allowlist_identifier_absent() -> None:
	"""The SCENE_ALLOWLIST identifier must not appear in the generator source."""
	repo_root = git_file_utils.get_repo_root()
	generator_path = os.path.join(repo_root, "pipeline", "gen_scene_index.py")

	with open(generator_path, "r") as f:
		source = f.read()

	# Fail loudly if the hiding gate is reintroduced under its old name.
	assert "SCENE_ALLOWLIST" not in source, (
		"SCENE_ALLOWLIST reappeared in pipeline/gen_scene_index.py; the curated "
		"allowlist is a hiding gate and must stay deleted. Classify each scene as "
		"emitted/skipped-with-reason/errored instead."
	)
