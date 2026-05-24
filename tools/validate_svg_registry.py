#!/usr/bin/env python3
"""
CLI wrapper to validate SVG files in assets/ directory.

Walks assets/**/*.svg, validates each, prints PASS/FAIL, exits 0 if all pass.
"""

import os
import sys
from pathlib import Path

# Import shared validator from same directory
sys.path.insert(0, os.path.dirname(__file__))
import svg_validate


#============================================


def get_repo_root() -> str:
	"""Get repository root via git."""
	import subprocess

	try:
		result = subprocess.run(
			["git", "rev-parse", "--show-toplevel"],
			cwd=os.path.dirname(__file__),
			capture_output=True,
			text=True,
			timeout=5,
		)
		if result.returncode == 0:
			return result.stdout.strip()
	except Exception:
		pass

	raise RuntimeError("Could not determine repo root via git")


#============================================


def validate_all_svgs() -> int:
	"""
	Validate all SVGs under assets/**/*.svg.
	Returns 0 if all pass, non-zero if any fail.
	"""
	repo_root = get_repo_root()
	assets_dir = os.path.join(repo_root, "assets")

	# Collect all SVG files
	svg_files = sorted(Path(assets_dir).rglob("*.svg"))

	if not svg_files:
		print(f"No SVG files found under {assets_dir}")
		return 1

	print(f"Validating {len(svg_files)} SVG files...")
	print()

	failed_count = 0

	for svg_path in svg_files:
		abs_path = str(svg_path)
		rel_path = os.path.relpath(abs_path, repo_root)

		try:
			svg_validate.validate(abs_path)
			print(f"PASS: {rel_path}")
		except (FileNotFoundError, ValueError) as e:
			print(f"FAIL: {rel_path}")
			print(f"      {str(e)}")
			failed_count += 1

	print()
	print(f"Results: {len(svg_files) - failed_count}/{len(svg_files)} passed")

	return 0 if failed_count == 0 else 1


#============================================


def main():
	"""Entry point."""
	exit_code = validate_all_svgs()
	sys.exit(exit_code)


if __name__ == "__main__":
	main()
