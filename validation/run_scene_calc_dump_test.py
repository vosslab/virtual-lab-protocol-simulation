#!/usr/bin/env python3
"""Trace version of the runner."""

import argparse
import sys
from pathlib import Path

print("Before import: yaml module in sys.modules?", 'yaml' in sys.modules)

from validation.scene_calc.dump import dumps_scene_geometry

print("After import: yaml module in sys.modules?", 'yaml' in sys.modules)

def main():
	parser = argparse.ArgumentParser(
		description='Dump computed scene geometry to JSON'
	)
	parser.add_argument(
		'scenes',
		nargs='+',
		help='Scene YAML file paths'
	)
	args = parser.parse_args()

	exit_code = 0

	for scene_path_str in args.scenes:
		scene_path = Path(scene_path_str)

		if not scene_path.exists():
			print(f'Error: {scene_path} does not exist', file=sys.stderr)
			exit_code = 1
			continue

		try:
			print(f"DEBUG: about to call dumps_scene_geometry({scene_path})", file=sys.stderr)
			json_line = dumps_scene_geometry(scene_path)
			print(json_line)
		except Exception as e:
			print(f'Error dumping {scene_path}: {e}', file=sys.stderr)
			import traceback
			traceback.print_exc(file=sys.stderr)
			exit_code = 1

	sys.exit(exit_code)


if __name__ == '__main__':
	main()
