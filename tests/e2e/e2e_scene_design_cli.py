#!/usr/bin/env python3
"""End-to-end test: scene_design CLI dump_data wiring + graceful degradation.

Whole-CLI invocation via subprocess; coupled to real content/base_scenes/*.yaml
fixtures and to the dump pipeline's filesystem layout. Belongs in tests/e2e/
per docs/E2E_TESTS.md (excluded from `pytest tests/`).

Run directly:
	bash -c 'source source_me.sh && python3 tests/e2e/e2e_scene_design_cli.py'
"""

import json
import subprocess
import sys
from pathlib import Path


def test_scene_design_cli_populates_metrics_with_dump():
	"""scene_design CLI populates metrics with non-None values on successful dump."""
	scene_path = Path('content/base_scenes/bench_basic.yaml')
	if not scene_path.exists():
		raise FileNotFoundError(f'{scene_path} not found; run from repo root')

	result = subprocess.run(
		[sys.executable, '-m', 'validation.scene_design.cli', '-S', str(scene_path)],
		capture_output=True,
		text=True,
	)

	assert result.returncode == 0, f'CLI failed: {result.stderr}'
	assert result.stdout, 'CLI produced no output'

	card = json.loads(result.stdout.strip().split('\n')[0])
	metrics = card['metrics']

	# depth_tier_usage is YAML-only and should always populate.
	assert metrics['depth_tier_usage'] is not None

	# At least one dump-consuming metric should also populate.
	dump_consuming = [
		'predicted_label_overlap', 'label_to_object_distance', 'label_wrap_rate',
		'scene_density', 'row_overcrowding', 'tab_stops_symmetry', 'aspect_fidelity',
	]
	assert any(metrics.get(m) is not None for m in dump_consuming)


def test_scene_design_cli_degrades_gracefully_on_dump_failure():
	"""Dump failure on row-slot scenes produces no exception and a valid card."""
	row_slot_paths = list(Path('content/base_scenes').glob('*row_slot*.yaml'))
	if not row_slot_paths:
		print('No row-slot scenes available; skipping')
		return

	scene_path = row_slot_paths[0]

	result = subprocess.run(
		[sys.executable, '-m', 'validation.scene_design.cli', '-S', str(scene_path)],
		capture_output=True,
		text=True,
	)

	assert result.returncode == 0, f'CLI should not exit non-zero on dump failure: {result.stderr}'

	if result.stdout:
		card = json.loads(result.stdout.strip().split('\n')[0])
		assert 'metrics' in card


if __name__ == '__main__':
	test_scene_design_cli_populates_metrics_with_dump()
	test_scene_design_cli_degrades_gracefully_on_dump_failure()
	print('All tests passed.')
