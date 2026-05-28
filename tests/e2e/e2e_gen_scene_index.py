#!/usr/bin/env python3
"""End-to-end smoke for pipeline/gen_scene_index.py.

Lives in tests/e2e/ because each invocation re-runs the full subprocess
and reads real YAML from content/protocols/; per docs/E2E_TESTS.md,
real subprocess CLI round-trips belong here, not in the pytest fast lane.

Validates behavioral properties (generator succeeds, pilot scenes present,
per-protocol scenes ingested) without hardcoded counts or scene name lists
per docs/PYTEST_STYLE.md.

Usage:
	python3 tests/e2e/e2e_gen_scene_index.py
Exits 0 on success, raises SystemExit on first failure.
"""

import os
import re
import subprocess
import sys


def get_repo_root() -> str:
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	return result.stdout.strip()


def run_generator(repo_root: str) -> None:
	result = subprocess.run(
		[sys.executable, "pipeline/gen_scene_index.py"],
		cwd=repo_root,
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise SystemExit(
			f"gen_scene_index.py failed (exit {result.returncode})\n"
			f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
		)


def read_generated(repo_root: str) -> str:
	path = os.path.join(repo_root, "generated", "scenes.ts")
	with open(path) as f:
		return f.read()


def extract_scene_keys(content: str) -> set:
	"""Extract scene keys from scenes.ts (pattern: 'key': {)."""
	return set(re.findall(r"'([a-z_0-9]+)':\s*\{", content))


def check_generator_succeeds(repo_root: str) -> None:
	"""Generator runs to completion and writes the output file."""
	ts_path = os.path.join(repo_root, "generated", "scenes.ts")
	if not os.path.isfile(ts_path):
		raise SystemExit("generated/scenes.ts does not exist after run")


def check_pilot_scene_resolves(keys: set) -> None:
	"""The mtt_reagent_prep_bench_workspace key must appear."""
	if "mtt_reagent_prep_bench_workspace" not in keys:
		raise SystemExit(
			"mtt_reagent_prep_bench_workspace missing from scenes.ts"
		)


def check_walker_pilot_scene_resolves(keys: set) -> None:
	"""The sdspage_heat_denature_samples_workspace key must appear."""
	if "sdspage_heat_denature_samples_workspace" not in keys:
		raise SystemExit(
			"sdspage_heat_denature_samples_workspace missing from scenes.ts"
		)


def check_per_protocol_scenes_ingested(repo_root: str, keys: set) -> None:
	"""Every authored per-protocol scene_name must appear in generated keys."""
	import yaml

	protocols_dir = os.path.join(repo_root, "content", "protocols")
	authored = set()

	for cluster in os.listdir(protocols_dir):
		cluster_path = os.path.join(protocols_dir, cluster)
		if not os.path.isdir(cluster_path):
			continue
		for protocol in os.listdir(cluster_path):
			scenes_dir = os.path.join(cluster_path, protocol, "scenes")
			if not os.path.isdir(scenes_dir):
				continue
			for fname in os.listdir(scenes_dir):
				if fname.endswith(".yaml"):
					with open(os.path.join(scenes_dir, fname)) as f:
						data = yaml.safe_load(f)
					if isinstance(data, dict) and isinstance(data.get("scene_name"), str):
						authored.add(data["scene_name"])

	missing = authored - keys
	if missing:
		raise SystemExit(
			f"per-protocol scenes missing from generated output: {sorted(missing)}"
		)


def main() -> int:
	repo_root = get_repo_root()
	run_generator(repo_root)
	content = read_generated(repo_root)
	keys = extract_scene_keys(content)

	check_generator_succeeds(repo_root)
	check_pilot_scene_resolves(keys)
	check_walker_pilot_scene_resolves(keys)
	check_per_protocol_scenes_ingested(repo_root, keys)

	print("e2e_gen_scene_index: OK")
	return 0


if __name__ == "__main__":
	sys.exit(main())
