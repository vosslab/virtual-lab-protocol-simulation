#!/usr/bin/env python3
# check_svg_pipeline.py
#
# Read-only health gate for the SVG asset pipeline. Verifies:
#   1. Determinism: tools/generate_svg_globals.py produces byte-identical
#      output across two independent runs into separate tempdirs.
#   2. Coverage: every assets/equipment/<name>.svg produces a matching
#      generated/svg_assets/<module>.ts (basename normalized via the
#      generator's normalize_module_name helper). No orphan modules; no
#      orphan source SVGs.
#
# This script never writes to the production generated/ tree. All outputs
# go to tempdirs that are cleaned on exit. It is invoked from
# check_codebase.sh as part of the M6 health gate.

# Standard Library
import os
import sys
import shutil
import tempfile
import subprocess

# REPO_ROOT via git rev-parse per docs/REPO_STYLE.md
try:
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	REPO_ROOT = result.stdout.strip()
except (subprocess.CalledProcessError, FileNotFoundError):
	print("ERROR: cannot determine REPO_ROOT via git rev-parse", file=sys.stderr)
	sys.exit(1)
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")
GENERATOR = os.path.join(REPO_ROOT, "tools", "generate_svg_globals.py")
PLATE_SVG = os.path.join(REPO_ROOT, "cell-culture2-clean.svg")


#============================================
def normalize_module_name(basename: str) -> str:
	# Mirror the normalization used by tools/generate_svg_globals.py so the
	# coverage check compares apples to apples. The generator replaces hyphens
	# with underscores when emitting per-asset module filenames.
	return basename.replace("-", "_")


#============================================
def run_generator(out_dir: str) -> None:
	# Invoke the production generator with --out-dir pointing at a tempdir.
	# check=True raises CalledProcessError on non-zero exit so the failure
	# bubbles up cleanly.
	subprocess.run(
		["python3", GENERATOR, "--out-dir", out_dir],
		cwd=REPO_ROOT,
		check=True,
		capture_output=True,
	)


#============================================
def check_determinism(dir_a: str, dir_b: str) -> None:
	# diff -r returns 0 when the two trees are byte-identical. Any output on
	# stdout means the trees differ; any non-zero exit means a mismatch was
	# found (or diff itself failed). Either case fails the gate.
	result = subprocess.run(
		["diff", "-r", dir_a, dir_b],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0 or result.stdout.strip() or result.stderr.strip():
		print("FAIL: SVG generator output is not deterministic.", file=sys.stderr)
		print("Two runs into separate tempdirs produced different output:", file=sys.stderr)
		if result.stdout:
			print(result.stdout, file=sys.stderr)
		if result.stderr:
			print(result.stderr, file=sys.stderr)
		sys.exit(2)


#============================================
def list_source_basenames() -> set:
	# Every assets/equipment/*.svg must produce a per-asset module. Sidecar
	# .colormap.json files are not modules; only .svg files map to outputs.
	basenames = set()
	for fname in os.listdir(ASSETS_DIR):
		if fname.endswith(".svg"):
			basenames.add(fname[:-4])
	return basenames


#============================================
def list_generated_modules(out_dir: str) -> set:
	# Inspect the freshly generated svg_assets/ subdir and return the set of
	# normalized module names (the file basenames without the .ts extension),
	# excluding the index.ts barrel.
	assets_dir = os.path.join(out_dir, "svg_assets")
	modules = set()
	for fname in os.listdir(assets_dir):
		if not fname.endswith(".ts"):
			continue
		stem = fname[:-3]
		if stem == "index":
			continue
		modules.add(stem)
	return modules


#============================================
def check_coverage(out_dir: str) -> None:
	# Compare the set of source SVG basenames (after normalization) against
	# the set of generated per-asset module names. The generator also emits
	# a special-case cell_culture_plate module sourced from cell-culture2-clean.svg
	# at the repo root, not from assets/equipment/, so account for that.
	source_basenames = list_source_basenames()
	expected_modules = {normalize_module_name(b) for b in source_basenames}
	if os.path.isfile(PLATE_SVG):
		expected_modules.add("cell_culture_plate")
	generated_modules = list_generated_modules(out_dir)

	# Modules emitted but with no matching source SVG (orphan modules). This
	# would indicate the generator wrote stale output the source no longer
	# justifies.
	orphan_modules = generated_modules - expected_modules
	# Source SVGs with no matching emitted module (orphan sources). This
	# would indicate the generator silently skipped a file.
	orphan_sources = expected_modules - generated_modules

	if orphan_modules or orphan_sources:
		print("FAIL: SVG pipeline coverage mismatch.", file=sys.stderr)
		if orphan_modules:
			print(
				"  orphan generated modules (no matching source SVG): "
				+ ", ".join(sorted(orphan_modules)),
				file=sys.stderr,
			)
		if orphan_sources:
			print(
				"  orphan source SVGs (no matching generated module): "
				+ ", ".join(sorted(orphan_sources)),
				file=sys.stderr,
			)
		sys.exit(3)


#============================================
def main() -> int:
	# Two tempdirs, one generator run each, then diff and coverage.
	dir_a = tempfile.mkdtemp(prefix="svg_check_a_")
	dir_b = tempfile.mkdtemp(prefix="svg_check_b_")
	# Use try/finally (no except) just to guarantee cleanup; we still let any
	# CalledProcessError or other exception propagate so the gate fails loudly.
	try:
		run_generator(dir_a)
		run_generator(dir_b)
		check_determinism(dir_a, dir_b)
		check_coverage(dir_a)
	finally:
		shutil.rmtree(dir_a, ignore_errors=True)
		shutil.rmtree(dir_b, ignore_errors=True)

	# Single-line OK marker that check_codebase.sh can spot in its stream.
	print("OK: SVG pipeline determinism + coverage gates passed.")
	return 0


if __name__ == "__main__":
	sys.exit(main())
