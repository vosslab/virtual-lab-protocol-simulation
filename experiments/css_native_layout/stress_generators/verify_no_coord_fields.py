#!/usr/bin/env python3
"""
Verifier for stress scene YAML files.

Scans every YAML file in the generated stress scenes directory and rejects
any that contain forbidden coordinate or escape-hatch fields. Exits
non-zero if any violations are found.

Forbidden field names (closure rule for NEW3 stress scenes):

	x, y, bounds, width, height, offsets, align, role,
	metadata, strategy, anchor, position, cx, cy, dx, dy,
	left, right, top, bottom, hidden_layout
"""

# Standard Library
import os
import re
import sys
import argparse


# Field tokens that must not appear as YAML keys in stress scenes.
# Match a token that appears at the start of a line (possibly indented)
# followed by a colon. This avoids flagging tokens that appear inside
# values or comments.
FORBIDDEN_TOKENS = [
	'x', 'y', 'cx', 'cy', 'dx', 'dy',
	'bounds', 'width', 'height',
	'offsets', 'align', 'role',
	'metadata', 'strategy', 'anchor', 'position',
	'left', 'right', 'top', 'bottom',
	'hidden_layout',
]

# Allowed keys (closed schema). Anything else triggers a violation as well.
ALLOWED_KEYS = {
	'scene_name', 'scene_class', 'object_count', 'large_equipment_count',
	'label_density', 'expected_primary_object', 'intended_difficulty',
	'placements', 'object_name', 'zone',
}


def parse_args():
	"""
	Parse command-line arguments.
	"""
	parser = argparse.ArgumentParser(
		description='Verify generated stress scenes contain no forbidden fields.'
	)
	parser.add_argument(
		'-d', '--dir', dest='scenes_dir', type=str,
		default='experiments/css_native_layout/stress_scenes/generated',
		help='Directory containing generated stress scene YAML.'
	)
	args = parser.parse_args()
	return args


def resolve_repo_root() -> str:
	"""
	Walk up from this script to find the repo root.
	"""
	here = os.path.abspath(__file__)
	current = os.path.dirname(here)
	while current != '/':
		if os.path.isdir(os.path.join(current, '.git')):
			return current
		current = os.path.dirname(current)
	return os.getcwd()


def scan_file(path: str) -> list:
	"""
	Return a list of violation strings for the file at path. Empty list
	means clean. Comments (lines starting with '#') are skipped.
	"""
	violations = []
	fh = open(path, 'r')
	lines = fh.readlines()
	fh.close()
	# Pattern that captures the first key on a YAML line. We allow leading
	# whitespace (tabs or spaces) and an optional list marker '- '.
	key_pattern = re.compile(r'^[\t ]*-?[\t ]*([A-Za-z_][A-Za-z0-9_]*)[\t ]*:')
	for line_idx, line in enumerate(lines):
		stripped = line.lstrip()
		if stripped.startswith('#'):
			continue
		if not stripped.strip():
			continue
		match = key_pattern.match(line)
		if match is None:
			continue
		key = match.group(1)
		if key in FORBIDDEN_TOKENS:
			violations.append(
				path + ':' + str(line_idx + 1) + ' forbidden field "' + key + '"'
			)
			continue
		if key not in ALLOWED_KEYS:
			violations.append(
				path + ':' + str(line_idx + 1) + ' unexpected field "' + key + '"'
			)
	return violations


def main():
	args = parse_args()
	repo_root = resolve_repo_root()
	if os.path.isabs(args.scenes_dir):
		scenes_dir = args.scenes_dir
	else:
		scenes_dir = os.path.join(repo_root, args.scenes_dir)
	if not os.path.isdir(scenes_dir):
		print('ERROR: scenes directory does not exist: ' + scenes_dir)
		sys.exit(2)
	all_violations = []
	scanned = 0
	for entry in sorted(os.listdir(scenes_dir)):
		if not entry.endswith('.yaml'):
			continue
		path = os.path.join(scenes_dir, entry)
		scanned += 1
		file_violations = scan_file(path)
		all_violations += file_violations
	if len(all_violations) == 0:
		print('PASS: ' + str(scanned) + ' YAML files clean (no forbidden fields).')
		sys.exit(0)
	print('FAIL: ' + str(len(all_violations)) + ' violations in ' + str(scanned) + ' files:')
	for violation in all_violations:
		print('  ' + violation)
	sys.exit(1)


if __name__ == '__main__':
	main()
