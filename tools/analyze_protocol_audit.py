#!/usr/bin/env python3
"""
analyze_protocol_audit.py - Audit protocol steps for completeness and consistency.

Validates protocol YAML against a set of status rules:
- [OK] Step has interactionSequence and every requiredItem is in usedItems
- [INFO] Step has no interactionSequence (modal/direct/runtime flow)
- [WARN] Step has interactionSequence but requiredItems not all in usedItems
- [ERROR] Missing item/reagent, or unused non-visual item

Usage:
  source source_me.sh && python3 tools/analyze_protocol_audit.py --list-protocols
  source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol cell_culture
  source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol cell_culture --strict
"""

import subprocess
import pathlib
import argparse
import sys
import yaml


def get_repo_root():
	"""Determine REPO_ROOT via git rev-parse --show-toplevel."""
	result = subprocess.run(
		['git', 'rev-parse', '--show-toplevel'],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise RuntimeError(f"Failed to find repo root: {result.stderr}")
	return pathlib.Path(result.stdout.strip())


def load_yaml_file(path):
	"""Load a YAML file and return parsed content."""
	with open(path, 'r') as f:
		return yaml.safe_load(f)


def derive_used_items(step):
	"""Derive usedItems from interactionSequence in first-use order (tool -> source -> destination, de-duplicated)."""
	seen = set()
	used = []
	for interaction in step.get('interactionSequence', []):
		if interaction.get('tool') and interaction['tool'] not in seen:
			seen.add(interaction['tool'])
			used.append(interaction['tool'])
		if interaction.get('source') and interaction['source'] not in seen:
			seen.add(interaction['source'])
			used.append(interaction['source'])
		if interaction.get('destination') and interaction['destination'] not in seen:
			seen.add(interaction['destination'])
			used.append(interaction['destination'])
	return used


def discover_protocols(repo_root):
	"""Discover available protocols by globbing content/*/protocol.yaml."""
	content_dir = repo_root / 'content'
	if not content_dir.is_dir():
		return []

	protocols = []
	for subdir in content_dir.iterdir():
		if subdir.is_dir():
			protocol_yaml = subdir / 'protocol.yaml'
			if protocol_yaml.exists():
				protocols.append(subdir.name)

	return sorted(protocols)


def classify_step(step, items, reagents, item_index):
	"""
	Classify a step and return (status, message).

	Status: 'OK', 'INFO', 'WARN', 'ERROR'
	"""
	required_items = step.get('requiredItems', [])
	interactions = step.get('interactionSequence', [])
	used_items = derive_used_items(step)

	# Check for missing items in requiredItems or usedItems
	for item_id in required_items:
		if item_id not in item_index:
			return ('ERROR', f"required item '{item_id}' not in items.yaml")
	for item_id in used_items:
		if item_id not in item_index:
			return ('ERROR', f"used item '{item_id}' not in items.yaml")

	# Rule 1: If no interactionSequence, return INFO (modal/direct flow)
	if not interactions:
		return ('INFO', 'no interactionSequence (modal/direct flow)')

	# Rule 2: Check if every requiredItem is in usedItems
	missing = set(required_items) - set(used_items)
	if missing:
		missing_str = ', '.join(sorted(missing))
		return ('WARN', f"missing required item in interaction: {missing_str}")

	# Rule 3: Everything matches
	return ('OK', '')


def audit_protocol(repo_root, protocol_name, items_data, reagents_data, protocol_data):
	"""Audit a protocol and return list of (status, step_index, step_id, message)."""
	steps = protocol_data['steps']
	items = items_data['items']
	reagents = reagents_data['reagents']

	# Build item index
	item_index = set(items.keys())

	# Track which items are used (requiredItems across all steps)
	item_usage = {item_id: [] for item_id in items.keys()}

	# Audit each step
	results = []
	for step_index, step in enumerate(steps):
		step_id = step['id']
		required_items = step.get('requiredItems', [])

		# Track usage
		for item_id in required_items:
			if item_id in item_usage:
				item_usage[item_id].append(step_id)

		# Classify the step
		status, msg = classify_step(step, items, reagents, item_index)
		results.append((status, step_index + 1, step_id, msg, required_items))

	# Check for unused non-visual items
	unused_errors = []
	for item_id, usage_list in item_usage.items():
		if not usage_list:
			item_def = items[item_id]
			# visualOnly is optional; keep .get() for genuinely optional field
			if not item_def.get('visualOnly'):
				unused_errors.append((item_id, item_def))

	return results, unused_errors


def parse_args():
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description='Audit protocol steps for completeness and consistency.',
	)
	group = parser.add_mutually_exclusive_group()
	group.add_argument(
		'-p', '--protocol',
		dest='protocol',
		default='cell_culture',
		help='Protocol name to audit (default: cell_culture)',
	)
	group.add_argument(
		'-l', '--list-protocols',
		dest='list_protocols',
		action='store_true',
		help='List available protocols and exit',
	)
	parser.add_argument(
		'-s', '--strict',
		dest='strict',
		action='store_true',
		help='Exit non-zero if WARN or ERROR found',
	)
	args = parser.parse_args()
	return args


def main():
	args = parse_args()
	repo_root = get_repo_root()

	# Handle --list-protocols
	if args.list_protocols:
		protocols = discover_protocols(repo_root)
		for p in protocols:
			print(p)
		return 0

	# Load protocol
	protocol_name = args.protocol
	protocol_dir = repo_root / 'src' / 'content' / protocol_name
	if not protocol_dir.is_dir():
		print(f"Error: Protocol directory not found: {protocol_dir}", file=sys.stderr)
		return 1

	items_path = protocol_dir / 'items.yaml'
	reagents_path = protocol_dir / 'reagents.yaml'
	protocol_path = protocol_dir / 'protocol.yaml'

	for path in [items_path, reagents_path, protocol_path]:
		if not path.exists():
			print(f"Error: Missing file: {path}", file=sys.stderr)
			return 1

	items_data = load_yaml_file(items_path)
	reagents_data = load_yaml_file(reagents_path)
	protocol_data = load_yaml_file(protocol_path)

	# Audit the protocol
	results, unused_errors = audit_protocol(repo_root, protocol_name, items_data, reagents_data, protocol_data)

	# Print header
	print('=' * 80)
	print(f'PROTOCOL AUDIT: {protocol_name}')
	print('=' * 80)

	# Print each step with status
	status_counts = {'OK': 0, 'INFO': 0, 'WARN': 0, 'ERROR': 0}
	for status, step_index, step_id, msg, required_items in results:
		status_counts[status] += 1
		req_str = ', '.join(required_items) if required_items else '(none)'
		status_tag = f'[{status}]'
		if msg:
			print(f"{status_tag.ljust(8)} {str(step_index).rjust(2)} {step_id.ljust(20)} required=[{req_str}]")
			print(f"{''.ljust(8)}    note: {msg}")
		else:
			print(f"{status_tag.ljust(8)} {str(step_index).rjust(2)} {step_id.ljust(20)} required=[{req_str}]")

	# Print unused items
	if unused_errors:
		print('\n' + '=' * 80)
		print('UNUSED NON-VISUAL ITEMS:')
		print('=' * 80)
		for item_id, item_def in unused_errors:
			status_counts['ERROR'] += 1
			role = item_def['role']
			scene = item_def['scene']
			print(f"[ERROR] {item_id.ljust(25)} role={role} scene={scene}")

	# Print summary
	print('\n' + '=' * 80)
	print('SUMMARY')
	print('=' * 80)
	print(f"OK: {status_counts['OK']} | INFO: {status_counts['INFO']} | WARN: {status_counts['WARN']} | ERROR: {status_counts['ERROR']}")

	# Exit code
	if args.strict and (status_counts['WARN'] > 0 or status_counts['ERROR'] > 0):
		return 1

	return 0


if __name__ == '__main__':
	sys.exit(main())
