#!/usr/bin/env python3
"""
Authoring-time YAML validator for protocol, scene, and object content.

Validates against the three-vocabulary spec:
- docs/PRIMARY_SPEC.md (protocol layer)
- docs/specs/OBJECT_YAML_FORMAT.md (object layer)
- docs/specs/SCENE_YAML_FORMAT.md and SCENE_INHERITANCE.md (scene layer)
- docs/specs/OBJECT_VOCABULARY.md (object terminology)

Standalone tool. Not a pytest. Not imported by build pipeline or src/.
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Import validators module
from validators.yaml_io import load_yaml
from validators.findings import Finding, Severity
from validators.constants import OBJECT_KINDS, RETIRED_OBJECT_KEYS
from validators.database import ContentDatabase
from validators.object_validator import ObjectValidator
from validators.scene_base_validator import BaseSceneValidator
from validators.scene_protocol_validator import ProtocolSceneValidator
from validators.protocol_validator import ProtocolValidator


class ValidationError(Exception):
	"""Raised when validation fails."""
	pass


def print_verbose_details(file_path: str, data: Dict[str, Any], file_type: str) -> None:
	"""
	Print 2-4 indented detail lines for a PASS result (--verbose mode only).
	file_type: 'object', 'base_scene', 'protocol_scene', or 'protocol'
	"""
	indent = "  "

	if file_type == 'object':
		kind = data.get('kind', 'unknown')
		caps = data.get('capabilities', [])
		caps_str = ', '.join(caps) if caps else 'none'
		state_count = len(data.get('state_fields', []))
		print(f"{indent}kind: {kind}")
		print(f"{indent}capabilities: {caps_str}")
		print(f"{indent}state_fields: {state_count}")

	elif file_type == 'base_scene':
		workspace = data.get('workspace', 'unknown')
		zone_count = len(data.get('zones', []))
		placement_count = len(data.get('placements', []))
		print(f"{indent}workspace: {workspace}")
		print(f"{indent}zones: {zone_count}")
		print(f"{indent}placements: {placement_count}")
		print(f"{indent}all placement object_name values resolve")

	elif file_type == 'protocol_scene':
		extends = data.get('extends', 'unknown')
		print(f"{indent}extends: {extends}")
		# Count operations with non-zero values
		add_count = len(data.get('add_placements', []))
		reposition_count = len(data.get('reposition_placements', []))
		deactivate_count = len(data.get('deactivate_placements', []))
		remove_count = len(data.get('remove_placements', []))
		if add_count > 0:
			print(f"{indent}add_placements: {add_count}")
		if reposition_count > 0:
			print(f"{indent}reposition_placements: {reposition_count}")
		if deactivate_count > 0:
			print(f"{indent}deactivate_placements: {deactivate_count}")
		if remove_count > 0:
			print(f"{indent}remove_placements: {remove_count}")

	elif file_type == 'protocol':
		proto_type = data.get('protocol_type', 'unknown')
		steps = data.get('steps', [])
		step_count = len(steps)
		entry_step = data.get('entry_step', 'unknown')
		# Count terminal steps
		terminal_count = sum(1 for s in steps if isinstance(s, dict) and s.get('next_step') is None)
		# Count unique scene references in steps (via SceneChange scene_operations)
		scenes_ref = set()
		for step in steps:
			if isinstance(step, dict):
				sequence = step.get('sequence', [])
				for interaction in sequence:
					if isinstance(interaction, dict):
						response = interaction.get('response', {})
						if isinstance(response, dict):
							scene_ops = response.get('scene_operations', [])
							for op in scene_ops:
								if isinstance(op, dict) and op.get('type') == 'SceneChange':
									to_scene = op.get('to_scene')
									if to_scene:
										scenes_ref.add(to_scene)
		print(f"{indent}protocol_type: {proto_type}")
		print(f"{indent}steps: {step_count}")
		print(f"{indent}entry_step: {entry_step}")
		print(f"{indent}terminal_steps: {terminal_count}")
		print(f"{indent}scenes_referenced: {len(scenes_ref)}")

	elif file_type == 'contents':
		contents_list = data.get('contents', [])
		contents_count = len(contents_list)
		# Count how many are referenced (have a 'name' field)
		referenced_count = sum(1 for c in contents_list if isinstance(c, dict) and 'name' in c)
		print(f"{indent}contents: {contents_count}")
		print(f"{indent}referenced: {referenced_count}")


def find_yaml_files(root: str, file_type: str) -> List[Path]:
	"""Find YAML files by type under content/."""
	root_path = Path(root)
	files = []

	if file_type == 'object':
		files = list(root_path.glob('content/objects/**/*.yaml'))
	elif file_type == 'base_scene':
		files = list(root_path.glob('content/scenes/*.yaml'))
	elif file_type == 'protocol_scene':
		files = list(root_path.glob('content/protocols/*/scenes/*.yaml'))
	elif file_type == 'protocol':
		files = list(root_path.glob('content/protocols/*/protocol.yaml'))

	return sorted(files)


def validate_whole_tree(repo_root: str, quiet: bool = False, verbose: bool = False) -> Tuple[bool, List[str], Dict[str, int]]:
	"""
	Validate entire content tree.
	Returns (success, list_of_error_messages, counts_dict).
	counts_dict: {'objects': N, 'base_scenes': N, 'protocol_scenes': N, 'protocols': N}
	"""
	errors = []
	counts = {'objects': 0, 'base_scenes': 0, 'protocol_scenes': 0, 'protocols': 0}

	# Load content database for Tier 1 cross-file checks
	db = ContentDatabase()
	db.load_from_tree(Path(repo_root))

	# Collect findings from database load errors
	for finding in db.findings:
		errors.append(finding.format())
		print(finding.format())

	# Validate objects
	if verbose:
		print("=== Objects ===")
	object_files = find_yaml_files(repo_root, 'object')
	object_validator = ObjectValidator()

	for obj_file in object_files:
		rel_path = obj_file.relative_to(repo_root)
		counts['objects'] += 1
		try:
			obj_data = load_yaml(obj_file)
			obj_findings = object_validator.validate(obj_data, str(rel_path))
			if obj_findings:
				for finding in obj_findings:
					errors.append(finding.format())
					print(finding.format())
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), obj_data, 'object')
		except RuntimeError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate base scenes
	if verbose:
		print("=== Base scenes ===")
	base_scene_files = find_yaml_files(repo_root, 'base_scene')
	base_scene_validator = BaseSceneValidator()

	for scene_file in base_scene_files:
		rel_path = scene_file.relative_to(repo_root)
		counts['base_scenes'] += 1
		try:
			scene_data = load_yaml(scene_file)
			scene_findings = base_scene_validator.validate(scene_data, str(rel_path))
			if scene_findings:
				for finding in scene_findings:
					errors.append(finding.format())
					print(finding.format())
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), scene_data, 'base_scene')
		except RuntimeError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate protocol scenes
	if verbose:
		print("=== Protocol scenes ===")
	protocol_scene_files = find_yaml_files(repo_root, 'protocol_scene')
	protocol_scene_validator = ProtocolSceneValidator()
	protocol_scene_validator.set_base_scenes(db.base_scenes)

	for scene_file in protocol_scene_files:
		rel_path = scene_file.relative_to(repo_root)
		counts['protocol_scenes'] += 1
		try:
			scene_data = load_yaml(scene_file)
			scene_findings = protocol_scene_validator.validate(scene_data, str(rel_path))
			if scene_findings:
				for finding in scene_findings:
					errors.append(finding.format())
					print(finding.format())
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), scene_data, 'protocol_scene')
		except RuntimeError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate protocols with Tier 1 checks enabled
	if verbose:
		print("=== Protocols ===")
	protocol_files = find_yaml_files(repo_root, 'protocol')
	protocol_validator = ProtocolValidator(db=db)

	for protocol_file in protocol_files:
		rel_path = protocol_file.relative_to(repo_root)
		counts['protocols'] += 1
		try:
			protocol_data = load_yaml(protocol_file)
			protocol_findings = protocol_validator.validate(protocol_data, str(rel_path))
			if protocol_findings:
				for finding in protocol_findings:
					errors.append(finding.format())
					print(finding.format())
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), protocol_data, 'protocol')
		except RuntimeError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	success = len(errors) == 0
	return success, errors, counts


def list_protocols(repo_root: str) -> List[str]:
	"""
	List all protocol names (directories under content/protocols/).
	Returns sorted list of names.
	"""
	protocols_dir = Path(repo_root) / 'content' / 'protocols'
	if not protocols_dir.exists():
		return []
	names = []
	for item in sorted(protocols_dir.iterdir()):
		if item.is_dir():
			protocol_yaml = item / 'protocol.yaml'
			if protocol_yaml.exists():
				names.append(item.name)
	return names


def resolve_protocol_path(name_or_path: str, repo_root: str) -> Optional[Path]:
	"""
	Resolve a protocol identifier to a protocol.yaml path.
	If name_or_path contains '/' or ends in '.yaml', treat as file path.
	Otherwise treat as a folder name and resolve to content/protocols/<name>/protocol.yaml.
	Returns Path if found, None otherwise.
	"""
	test_path = Path(name_or_path)
	# Treat as file path if contains '/' or ends in '.yaml'
	if '/' in name_or_path or name_or_path.endswith('.yaml'):
		full_path = Path(repo_root) / name_or_path if not test_path.is_absolute() else test_path
		if full_path.exists() and full_path.is_file():
			return full_path
		return None
	# Treat as protocol name
	protocol_yaml = Path(repo_root) / 'content' / 'protocols' / name_or_path / 'protocol.yaml'
	if protocol_yaml.exists():
		return protocol_yaml
	return None


def validate_protocol_package(protocol_name: str, repo_root: str, quiet: bool = False, verbose: bool = False) -> Tuple[bool, List[str]]:
	"""
	Validate a full protocol package: protocol.yaml, contents.yaml, scenes, and referenced objects.
	Returns (success, list_of_error_messages).
	"""
	errors = []
	files_checked = []
	files_data = {}

	protocol_path = Path(repo_root) / 'content' / 'protocols' / protocol_name
	if not protocol_path.exists():
		errors.append(f"Protocol '{protocol_name}' not found")
		return False, errors

	# Load content database for Tier 1 checks
	db = ContentDatabase()
	db.load_from_tree(Path(repo_root))

	# Collect findings from database load errors
	for finding in db.findings:
		errors.append(finding.format())

	# Load protocol.yaml
	protocol_yaml = protocol_path / 'protocol.yaml'
	if not protocol_yaml.exists():
		errors.append(f"Protocol package missing protocol.yaml: {protocol_yaml}")
		return False, errors

	try:
		protocol_data = load_yaml(protocol_yaml)
		protocol_validator = ProtocolValidator(db=db)
		proto_findings = protocol_validator.validate(protocol_data, str(protocol_yaml.relative_to(repo_root)))
		for finding in proto_findings:
			errors.append(finding.format())
		rel_path = str(protocol_yaml.relative_to(repo_root))
		files_checked.append(rel_path)
		files_data[rel_path] = ('protocol', protocol_data)
	except RuntimeError as e:
		errors.append(str(e))

	# Load all objects to build name set
	object_files = find_yaml_files(repo_root, 'object')
	object_validator = ObjectValidator()
	for obj_file in object_files:
		try:
			obj_data = load_yaml(obj_file)
			obj_findings = object_validator.validate(obj_data, str(obj_file.relative_to(repo_root)))
			for finding in obj_findings:
				errors.append(finding.format())
			rel_path = str(obj_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('object', obj_data)
		except RuntimeError as e:
			errors.append(str(e))

	# Load base scenes
	base_scene_files = find_yaml_files(repo_root, 'base_scene')
	base_scene_validator = BaseSceneValidator()
	for scene_file in base_scene_files:
		try:
			scene_data = load_yaml(scene_file)
			scene_findings = base_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
			for finding in scene_findings:
				errors.append(finding.format())
			rel_path = str(scene_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('base_scene', scene_data)
		except RuntimeError as e:
			errors.append(str(e))

	# Validate protocol-scene (inherited scenes) for this protocol
	protocol_scenes_dir = protocol_path / 'scenes'
	if protocol_scenes_dir.exists():
		protocol_scene_validator = ProtocolSceneValidator()
		for scene_file in sorted(protocol_scenes_dir.glob('*.yaml')):
			try:
				scene_data = load_yaml(scene_file)
				scene_findings = protocol_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
				for finding in scene_findings:
					errors.append(finding.format())
				rel_path = str(scene_file.relative_to(repo_root))
				files_checked.append(rel_path)
				files_data[rel_path] = ('protocol_scene', scene_data)
			except RuntimeError as e:
				errors.append(str(e))

	# Load contents.yaml if present
	contents_yaml = protocol_path / 'contents.yaml'
	if contents_yaml.exists():
		try:
			contents_data = load_yaml(contents_yaml)
			# Just verify it loads; no schema validation yet
			rel_path = str(contents_yaml.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('contents', contents_data)
		except RuntimeError as e:
			errors.append(str(e))

	success = len(errors) == 0
	if not quiet:
		print(f"Protocol '{protocol_name}':")
		for file_path in files_checked:
			print(f"  PASS: {file_path}")
			if verbose and file_path in files_data:
				file_type, file_data = files_data[file_path]
				# Print verbose details with 4-space indent (2 for PASS indent, 2 more for details)
				indent = "    "
				if file_type == 'object':
					kind = file_data.get('kind', 'unknown')
					caps = file_data.get('capabilities', [])
					caps_str = ', '.join(caps) if caps else 'none'
					state_count = len(file_data.get('state_fields', []))
					print(f"{indent}kind: {kind}")
					print(f"{indent}capabilities: {caps_str}")
					print(f"{indent}state_fields: {state_count}")
				elif file_type == 'base_scene':
					workspace = file_data.get('workspace', 'unknown')
					zone_count = len(file_data.get('zones', []))
					placement_count = len(file_data.get('placements', []))
					print(f"{indent}workspace: {workspace}")
					print(f"{indent}zones: {zone_count}")
					print(f"{indent}placements: {placement_count}")
					print(f"{indent}all placement object_name values resolve")
				elif file_type == 'protocol_scene':
					extends = file_data.get('extends', 'unknown')
					print(f"{indent}extends: {extends}")
					add_count = len(file_data.get('add_placements', []))
					reposition_count = len(file_data.get('reposition_placements', []))
					deactivate_count = len(file_data.get('deactivate_placements', []))
					remove_count = len(file_data.get('remove_placements', []))
					if add_count > 0:
						print(f"{indent}add_placements: {add_count}")
					if reposition_count > 0:
						print(f"{indent}reposition_placements: {reposition_count}")
					if deactivate_count > 0:
						print(f"{indent}deactivate_placements: {deactivate_count}")
					if remove_count > 0:
						print(f"{indent}remove_placements: {remove_count}")
				elif file_type == 'protocol':
					proto_type = file_data.get('protocol_type', 'unknown')
					steps = file_data.get('steps', [])
					step_count = len(steps)
					entry_step = file_data.get('entry_step', 'unknown')
					terminal_count = sum(1 for s in steps if isinstance(s, dict) and s.get('next_step') is None)
					scenes_ref = set()
					for step in steps:
						if isinstance(step, dict):
							sequence = step.get('sequence', [])
							for interaction in sequence:
								if isinstance(interaction, dict):
									response = interaction.get('response', {})
									if isinstance(response, dict):
										scene_ops = response.get('scene_operations', [])
										for op in scene_ops:
											if isinstance(op, dict) and op.get('type') == 'SceneChange':
												to_scene = op.get('to_scene')
												if to_scene:
													scenes_ref.add(to_scene)
					print(f"{indent}protocol_type: {proto_type}")
					print(f"{indent}steps: {step_count}")
					print(f"{indent}entry_step: {entry_step}")
					print(f"{indent}terminal_steps: {terminal_count}")
					print(f"{indent}scenes_referenced: {len(scenes_ref)}")
				elif file_type == 'contents':
					contents_list = file_data.get('contents', [])
					contents_count = len(contents_list)
					referenced_count = sum(1 for c in contents_list if isinstance(c, dict) and 'name' in c)
					print(f"{indent}contents: {contents_count}")
					print(f"{indent}referenced: {referenced_count}")
		if errors:
			for error in errors:
				print(f"  ERROR: {error}")
		print(f"  {len(files_checked)} files checked. {len(errors)} failures.")
	return success, errors


def parse_args():
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description='Validate Virtual Lab Protocol Simulation content YAML against ratified specs.\nWith no arguments, validates every YAML file under content/.'
	)

	# Author workflow (primary)
	author_group = parser.add_argument_group('Author workflow')
	author_group.add_argument(
		'-p', '--protocol',
		dest='protocol_name',
		help='Validate one protocol package (protocol.yaml, scenes, inherited bases, referenced objects). Accepts protocol name (e.g. hood_flask_prep) or file path.'
	)
	author_group.add_argument(
		'--list-protocols',
		dest='list_protocols_flag',
		action='store_true',
		help='List available protocols.'
	)
	author_group.add_argument(
		'--interactive',
		dest='interactive',
		action='store_true',
		help='Pick a protocol from a menu and validate it.'
	)

	# Verbosity
	verbosity_group = parser.add_argument_group('Verbosity')
	verbosity_group.add_argument(
		'-q', '--quiet',
		dest='quiet',
		action='store_true',
		help='Silent on success. Errors and final summary still printed on failure.'
	)
	verbosity_group.add_argument(
		'-v', '--verbose',
		dest='verbose',
		action='store_true',
		help='Show per-file PASS lines and section headers.'
	)

	# Developer/debug (secondary)
	dev_group = parser.add_argument_group('Developer/debug options')
	dev_group.add_argument(
		'-o', '--object',
		dest='object_file',
		help='Validate a single object YAML. (Prefer --protocol for author workflow.)'
	)
	dev_group.add_argument(
		'-s', '--scene',
		dest='base_scene_file',
		help='Validate a single base scene YAML. (Prefer --protocol for author workflow.)'
	)
	dev_group.add_argument(
		'--protocol-scene',
		dest='protocol_scene_file',
		help='Validate a single protocol-scene (inherited) YAML. (Prefer --protocol for author workflow.)'
	)

	return parser.parse_args()


def main():
	"""Main entry point."""
	args = parse_args()

	try:
		repo_root = Path(__file__).resolve().parent.parent
	except Exception:
		repo_root = Path.cwd()

	# List protocols
	if args.list_protocols_flag:
		protocols = list_protocols(str(repo_root))
		for name in protocols:
			print(name)
		sys.exit(0)

	# Interactive mode
	if args.interactive:
		import sys as sys_module
		if not sys_module.stdin.isatty():
			print("Interactive mode requires a terminal. Aborting.")
			sys.exit(1)
		protocols = list_protocols(str(repo_root))
		if not protocols:
			print("No protocols found.")
			sys.exit(1)
		print("Available protocols:")
		for idx, name in enumerate(protocols, 1):
			print(f"  {idx}. {name}")
		try:
			choice = input("Select a protocol (number): ").strip()
			choice_idx = int(choice) - 1
			if choice_idx < 0 or choice_idx >= len(protocols):
				print("Invalid selection.")
				sys.exit(1)
			selected = protocols[choice_idx]
		except (ValueError, EOFError):
			print("Invalid input.")
			sys.exit(1)
		success, errors = validate_protocol_package(selected, str(repo_root), quiet=args.quiet, verbose=args.verbose)
		sys.exit(0 if success else 1)

	# Protocol package validation
	if args.protocol_name:
		protocol_path = resolve_protocol_path(args.protocol_name, str(repo_root))
		if not protocol_path:
			print(f"Protocol '{args.protocol_name}' not found")
			sys.exit(1)
		# Extract protocol name from path
		protocol_name = protocol_path.parent.name
		success, errors = validate_protocol_package(protocol_name, str(repo_root), quiet=args.quiet, verbose=args.verbose)
		sys.exit(0 if success else 1)

	if args.object_file:
		try:
			obj_data = load_yaml(Path(args.object_file))
			validator = ObjectValidator()
			findings = validator.validate(obj_data, args.object_file)
			if findings:
				for finding in findings:
					print(finding.format())
				print(f"{len(findings)} error(s) in {args.object_file}")
			else:
				print(f"PASS: {args.object_file}")
			sys.exit(0 if not findings else 1)
		except RuntimeError as e:
			print(str(e))
			sys.exit(1)

	if args.base_scene_file:
		try:
			scene_data = load_yaml(Path(args.base_scene_file))
			validator = BaseSceneValidator()
			findings = validator.validate(scene_data, args.base_scene_file)
			if findings:
				for finding in findings:
					print(finding.format())
				print(f"{len(findings)} error(s) in {args.base_scene_file}")
			else:
				print(f"PASS: {args.base_scene_file}")
			sys.exit(0 if not findings else 1)
		except RuntimeError as e:
			print(str(e))
			sys.exit(1)

	if args.protocol_scene_file:
		try:
			# Load all base scenes for context
			base_scene_files = find_yaml_files(str(repo_root), 'base_scene')
			base_scenes = {}
			for scene_file in base_scene_files:
				try:
					scene_data = load_yaml(scene_file)
					scene_name = scene_data.get('scene_name')
					if scene_name:
						base_scenes[scene_name] = scene_data
				except RuntimeError:
					pass

			scene_data = load_yaml(Path(args.protocol_scene_file))
			validator = ProtocolSceneValidator()
			validator.set_base_scenes(base_scenes)
			findings = validator.validate(scene_data, args.protocol_scene_file)
			if findings:
				for finding in findings:
					print(finding.format())
				print(f"{len(findings)} error(s) in {args.protocol_scene_file}")
			else:
				print(f"PASS: {args.protocol_scene_file}")
			sys.exit(0 if not findings else 1)
		except RuntimeError as e:
			print(str(e))
			sys.exit(1)

	# Whole-tree validation (default, no-arg mode)
	if not args.quiet:
		print(f"Validating content tree under {repo_root}/content/")
	success, errors, counts = validate_whole_tree(str(repo_root), quiet=args.quiet, verbose=args.verbose)
	total_files = counts['objects'] + counts['base_scenes'] + counts['protocol_scenes'] + counts['protocols']
	failure_count = len(errors)
	if not args.quiet or not success:
		print(f"\nValidated {total_files} files ({counts['objects']} objects, {counts['base_scenes']} base scenes, {counts['protocol_scenes']} protocol scenes, {counts['protocols']} protocols). {failure_count} failures.")
	sys.exit(0 if success else 1)


if __name__ == '__main__':
	main()
