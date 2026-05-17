#!/usr/bin/env python3
# pipeline_check.py
#
# Read-only health gate for the SVG asset pipeline. Verifies:
#   1. Determinism: pipeline/generate_svg_globals.py produces byte-identical
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
import json

# Local modules
import validation.shared_toolkit.paths as toolkit_paths
import validation.shared_toolkit.cli
import validation.shared_toolkit.console

REPO_ROOT = toolkit_paths.REPO_ROOT
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")
GENERATOR = os.path.join(REPO_ROOT, "pipeline", "generate_svg_globals.py")
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
def check_determinism(dir_a: str, dir_b: str, console) -> None:
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
		sys.exit(1)


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
def check_coverage(out_dir: str, console) -> None:
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
		sys.exit(1)


def _render_verbose_diagnostics(source_basenames: set) -> None:
	"""
	Render diagnostic-summary output for -v mode.

	Shows:
	  - Asset family breakdown (by basename prefix)
	  - Normalization summary (count requiring hyphen conversion)
	  - Top 5 source SVG files by size

	Args:
		source_basenames: set of source SVG basenames (without .svg extension).
	"""
	output_lines = []

	output_lines.append("Diagnostic Summary:")
	output_lines.append("")

	#============================================
	# Asset family breakdown (by basename prefix)
	if source_basenames:
		output_lines.append("Asset families (by basename prefix):")
		family_counts = {}
		for basename in source_basenames:
			# Split on underscore to get prefix
			prefix = basename.split('_')[0] if '_' in basename else basename
			if prefix not in family_counts:
				family_counts[prefix] = 0
			family_counts[prefix] += 1

		for prefix, count in sorted(family_counts.items(), key=lambda kv: (-kv[1], kv[0])):
			output_lines.append(f"  {prefix}_*: {count}")

	#============================================
	# Normalization summary (hyphens to underscores)
	normalization_count = sum(1 for b in source_basenames if '-' in b)
	output_lines.append("")
	output_lines.append(f"Normalization: {normalization_count} source SVG(s) require hyphen-to-underscore conversion")

	#============================================
	# Top 5 source SVG files by file size
	if os.path.exists(ASSETS_DIR):
		output_lines.append("")
		output_lines.append("Top 5 source SVGs by file size:")
		sizes = []
		for fname in os.listdir(ASSETS_DIR):
			if fname.endswith(".svg"):
				fpath = os.path.join(ASSETS_DIR, fname)
				try:
					size = os.path.getsize(fpath)
					sizes.append((fname, size))
				except OSError:
					pass

		if sizes:
			sizes.sort(key=lambda kv: (-kv[1], kv[0]))
			for fname, size in sizes[:5]:
				size_kb = size / 1024.0
				output_lines.append(f"  {fname}: {size_kb:.1f} KB")

	if output_lines and len(output_lines) > 2:
		print('\n'.join(output_lines))
		print()


#============================================
def main() -> int:
	"""SVG pipeline health check: determinism and coverage.

	Verbosity contract (text output line targets):
	  -q / --quiet   : 1 line (final pass/fail with key numbers)
	  default        : 5-40 lines (stage summary, totals, top categories)
	  -v / --verbose : 40-<200 lines (per-content-file breakdown, grouped, summarized)
	  -j / --json    : full machine-readable detail (no bound)
	  -J / --ndjson  : streamed full detail (no bound)
	Raw per-step / per-asset internals go to JSON only, NOT text.
	"""
	parser = validation.shared_toolkit.cli.build_parser(
		prog="check",
		description="SVG pipeline determinism + coverage health gate."
	)
	args = parser.parse_args()
	console = validation.shared_toolkit.console.make_console(no_color=args.no_color)

	# Determine output mode
	is_quiet = args.quiet
	is_verbose = args.verbose
	is_json = args.output_format == 'json'

	# Collect counts for reporting
	source_basenames = list_source_basenames()
	source_count = len(source_basenames)
	# We'll get generated_count from a single generator run during the check

	# Two tempdirs, one generator run each, then diff and coverage.
	dir_a = tempfile.mkdtemp(prefix="svg_check_a_")
	dir_b = tempfile.mkdtemp(prefix="svg_check_b_")
	# Use try/finally (no except) just to guarantee cleanup; we still let any
	# CalledProcessError or other exception propagate so the gate fails loudly.
	try:
		run_generator(dir_a)
		run_generator(dir_b)
		check_determinism(dir_a, dir_b, console)
		check_coverage(dir_a, console)

		# Get generated module count from dir_a
		generated_count = len(list_generated_modules(dir_a))
	finally:
		shutil.rmtree(dir_a, ignore_errors=True)
		shutil.rmtree(dir_b, ignore_errors=True)

	# Output handling based on verbosity and format mode
	if is_json:
		# JSON output: minimal summary with results
		result = {
			"findings": [],
			"summary": {
				"tool": "svg.pipeline_check",
				"checks_passed": ["determinism", "coverage"],
				"source_svgs": source_count,
				"generated_modules": generated_count,
			}
		}
		print(json.dumps(result))
	elif is_quiet:
		# Quiet mode: only the OK marker (matches baseline)
		print("OK: SVG pipeline determinism + coverage gates passed.")
	elif is_verbose:
		# Verbose mode: diagnostic summary + step-by-step report
		_render_verbose_diagnostics(source_basenames)
		print("SVG pipeline check")
		print(f"  Source SVGs: {source_count}")
		print(f"  Generated modules: {generated_count} (after normalization)")
		print("  Determinism: byte-identical between two generator runs")
		print("  Coverage: every source SVG produced a module; no orphans")
		print("OK: SVG pipeline determinism + coverage gates passed.")
	else:
		# Default mode: summary line + OK marker
		print(f"SVG pipeline: checked {source_count} source SVGs, {generated_count} generated modules. Determinism + coverage OK.")
		print("OK: SVG pipeline determinism + coverage gates passed.")

	return 0


if __name__ == "__main__":
	sys.exit(main())
