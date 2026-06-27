#!/usr/bin/env python3
"""Entry point for scene authors to run the layout health report.

Usage:
  python3 run_scene_health.py              -- all scenes
  python3 run_scene_health.py scene_name   -- one scene (stdout only)
  python3 run_scene_health.py --list       -- list known scene names
"""

# Standard Library
import argparse
import json
import os
import shutil
import subprocess
import sys

# Module-level constants
METRICS_TOOL = "tools/layout_metrics.mjs"
HEALTH_TOOL = "tools/layout_health_report.mjs"
SCENE_MANIFEST = "generated/scene_manifest.json"
REPORT_PATH = "test-results/layout_health/health_report.md"

#============================================

def repo_root() -> str:
	"""Return the absolute repo root via git rev-parse."""
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True, text=True, check=True,
	)
	return result.stdout.strip()

#============================================

def check_prereqs(root: str) -> None:
	"""Verify required tools and generated files are present before running."""
	# node must be on PATH for the mjs tools to run
	if shutil.which("node") is None:
		raise RuntimeError("node is not on PATH. Install Node.js and reopen your terminal.")
	# tsx must be installed in the local node_modules
	tsx_path = os.path.join(root, "node_modules", ".bin", "tsx")
	if not os.path.exists(tsx_path):
		raise RuntimeError(
			f"tsx not found at {tsx_path}\n"
			"Run: npm install"
		)
	# generated/scene_manifest.json must exist for scene discovery
	manifest_path = os.path.join(root, SCENE_MANIFEST)
	if not os.path.exists(manifest_path):
		raise RuntimeError(
			f"Scene manifest not found: {manifest_path}\n"
			"Run the build pipeline first: npm run build"
		)

#============================================

def list_known_scenes(root: str) -> list[str]:
	"""Return sorted list of scene names from the generated scene manifest."""
	manifest_path = os.path.join(root, SCENE_MANIFEST)
	with open(manifest_path) as f:
		manifest = json.load(f)
	# extract name field from each scene entry
	scene_names = [entry["name"] for entry in manifest["scenes"]]
	return sorted(scene_names)

#============================================

def run_health_report(root: str, scene_name: str | None) -> None:
	"""Run layout metrics then health classification for one scene or all scenes."""
	node = shutil.which("node")
	# step 1: refresh raw geometry metrics from the layout engine
	metrics_cmd = [node, "--import", "tsx", os.path.join(root, METRICS_TOOL)]
	if scene_name is not None:
		metrics_cmd += ["--scene", scene_name]
	else:
		metrics_cmd += ["--all"]
	subprocess.run(metrics_cmd, cwd=root, check=True)
	# step 2: classify metrics into health categories and findings
	health_cmd = [node, "--import", "tsx", os.path.join(root, HEALTH_TOOL)]
	if scene_name is not None:
		health_cmd += ["--scene", scene_name]
	else:
		health_cmd += ["--all"]
	subprocess.run(health_cmd, cwd=root, check=True)
	# for all-scenes mode, print where the persistent report landed
	if scene_name is None:
		report = os.path.join(root, REPORT_PATH)
		print(f"Report written to: {report}")

#============================================

def parse_args() -> tuple[str | None, bool]:
	"""Parse command-line arguments. Returns (scene_name, list_only)."""
	parser = argparse.ArgumentParser(
		description="Layout health report for scene YAML authors.",
	)
	parser.add_argument(
		"scene",
		nargs="?",
		default=None,
		help="Scene name to check (omit for all scenes)",
	)
	parser.add_argument(
		"-l", "--list",
		dest="list_scenes",
		action="store_true",
		help="List known scene names and exit",
	)
	args = parser.parse_args()
	return args.scene, args.list_scenes

#============================================

def main() -> None:
	"""Run the layout health report entry point."""
	scene_name, list_only = parse_args()
	root = repo_root()
	check_prereqs(root)
	if list_only:
		# print all known scene names, one per line
		scenes = list_known_scenes(root)
		for name in scenes:
			print(name)
		return
	if scene_name is not None:
		# validate scene name before running to give a friendly error
		known = list_known_scenes(root)
		if scene_name not in known:
			print(f"Scene not found: {scene_name}", file=sys.stderr)
			print("Run: python3 run_scene_health.py --list", file=sys.stderr)
			raise SystemExit(1)
	run_health_report(root, scene_name)

if __name__ == "__main__":
	main()
