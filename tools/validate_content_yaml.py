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
import tempfile
import yaml
from pathlib import Path
from validators.yaml_io import load_yaml
from validators.database import ContentDatabase
from validators.object_validator import ObjectValidator
from validators.scene_base_validator import BaseSceneValidator
from validators.scene_protocol_validator import ProtocolSceneValidator
from validators.protocol_validator import ProtocolValidator
from validators.material_validator import MaterialValidator
from validators.cross_protocol import CrossProtocolValidator
import validators.summary as summary_printer
import validators.compiled_summary as compiled_summary


class ValidationError(Exception):
	"""Raised when validation fails."""
	pass


# Verbose detail printers live in validators/summary.py. Dispatch by file_type.
VERBOSE_PRINTERS = {
	'object': summary_printer.print_object_details,
	'base_scene': summary_printer.print_scene_details,
	'protocol_scene': summary_printer.print_protocol_scene_details,
	'protocol': summary_printer.print_protocol_summary,
	'material': summary_printer.print_material_details,
}


def _load_and_collect(path: Path, rel_path: Path, validator, cross_validator: CrossProtocolValidator, errors: list):
	"""
	Load one YAML file, run validator + camelCase sweep, print and collect any
	findings. Returns (findings, data) where data is None if load failed.
	"""
	# YAML parse failure is the one case we catch and continue: one bad file
	# should not stop the whole-tree walk.
	try:
		data = load_yaml(path)
	except RuntimeError as e:
		msg = str(e)
		errors.append(msg)
		print(msg)
		return None, None
	findings = validator.validate(data, str(rel_path))
	findings.extend(cross_validator.check_camelcase_keys(data, str(rel_path)))
	for fnd in findings:
		msg = fnd.format()
		errors.append(msg)
		print(msg)
	return findings, data


def _print_pass(rel_path: Path, data: dict, file_type: str, verbose: bool) -> None:
	"""Print PASS + verbose details for one file when verbose mode is on."""
	if not verbose:
		return
	print(f"PASS: {rel_path}")
	printer = VERBOSE_PRINTERS.get(file_type)
	if printer is None:
		return
	if file_type == 'protocol':
		printer(str(rel_path), data, verbose=True)
	else:
		printer(data)


def find_yaml_files(root: str, file_type: str) -> list:
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
	elif file_type == 'material':
		files = list(root_path.glob('content/protocols/*/materials.yaml'))

	return sorted(files)


def validate_whole_tree(repo_root: str, quiet: bool = False, verbose: bool = False) -> tuple:
	"""
	Validate entire content tree.
	Returns (success, list_of_error_messages, counts_dict).
	counts_dict: {'objects': N, 'base_scenes': N, 'protocol_scenes': N, 'protocols': N, 'materials': N}
	"""
	errors = []
	counts = {'objects': 0, 'base_scenes': 0, 'protocol_scenes': 0, 'protocols': 0, 'materials': 0}

	# Collect protocol, protocol_scene, and material rows for compiled summary
	protocol_rows = []
	protocol_scene_rows = []
	material_rows = []

	# Load content database for Tier 1 cross-file checks
	db = ContentDatabase()
	db.load_from_tree(Path(repo_root))

	# Collect findings from database load errors
	for finding in db.findings:
		errors.append(finding.format())
		print(finding.format())

	# Cross-cutting camelCase regex sweep (general, no allow-list)
	cross_validator = CrossProtocolValidator()

	object_validator = ObjectValidator()
	base_scene_validator = BaseSceneValidator()
	base_scene_validator.set_object_names(set(db.objects.keys()))
	protocol_scene_validator = ProtocolSceneValidator()
	protocol_scene_validator.set_base_scenes(db.base_scenes)
	protocol_validator = ProtocolValidator(db=db)
	material_validator = MaterialValidator()

	sections = [
		('Objects', 'object', 'objects', object_validator),
		('Base scenes', 'base_scene', 'base_scenes', base_scene_validator),
		('Protocol scenes', 'protocol_scene', 'protocol_scenes', protocol_scene_validator),
		('Materials', 'material', 'materials', material_validator),
		('Protocols', 'protocol', 'protocols', protocol_validator),
	]

	for header, file_type, count_key, validator in sections:
		if verbose:
			print(f"=== {header} ===")
		for f in find_yaml_files(repo_root, file_type):
			rel_path = f.relative_to(repo_root)
			counts[count_key] += 1
			findings, data = _load_and_collect(f, rel_path, validator, cross_validator, errors)
			if data is not None and not findings:
				_print_pass(rel_path, data, file_type, verbose)
			# Collect rows for compiled summary (collect even if there are findings)
			if data is not None:
				if file_type == 'protocol':
					protocol_rows.append((str(rel_path), data))
				elif file_type == 'protocol_scene':
					protocol_scene_rows.append((str(rel_path), data))
				elif file_type == 'material':
					material_rows.append((str(rel_path), data))

	success = len(errors) == 0

	# Render compiled summary (gated by quiet)
	# Dashboard only renders when not quiet (regardless of success/failure)
	if not quiet:
		counts_agg = compiled_summary.aggregate(db, protocol_rows, protocol_scene_rows, material_rows, counts_dict=counts)
		compiled_summary.render(counts_agg)

	return success, errors, counts


def list_protocols(repo_root: str) -> list:
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


def resolve_protocol_path(name_or_path: str, repo_root: str) -> Path | None:
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


def validate_protocol_package(protocol_name: str, repo_root: str, quiet: bool = False, verbose: bool = False) -> tuple:
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

	# Load materials.yaml if present (closed-schema validated)
	materials_yaml = protocol_path / 'materials.yaml'
	if materials_yaml.exists():
		try:
			materials_data = load_yaml(materials_yaml)
			material_validator = MaterialValidator()
			mat_findings = material_validator.validate(materials_data, str(materials_yaml.relative_to(repo_root)))
			for finding in mat_findings:
				errors.append(finding.format())
			rel_path = str(materials_yaml.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('material', materials_data)
		except RuntimeError as e:
			errors.append(str(e))

	success = len(errors) == 0
	if not quiet:
		print(f"Protocol '{protocol_name}':")
		for file_path in files_checked:
			print(f"  PASS: {file_path}")
			if verbose and file_path in files_data:
				file_type, file_data = files_data[file_path]
				printer = VERBOSE_PRINTERS.get(file_type)
				if printer is not None:
					if file_type == 'protocol':
						printer(file_path, file_data, verbose=True)
					else:
						printer(file_data)
		if errors:
			for error in errors:
				print(f"  ERROR: {error}")
		print(f"  {len(files_checked)} files checked. {len(errors)} failures.")
	return success, errors


def _self_test_sequence_runner_leaves() -> None:
	"""
	Self-test for sequence_runner-leaves rule.
	Verifies that sequence runners referencing another sequence_runner are caught
	and that valid references pass. Exits non-zero on failure.
	"""
	with tempfile.TemporaryDirectory() as tmp_dir:
		tmp_path = Path(tmp_dir)
		content_dir = tmp_path / 'content'
		protocols_dir = content_dir / 'protocols'
		protocols_dir.mkdir(parents=True)

		# Mini protocol leaf
		mini_1_dir = protocols_dir / 'mini_leaf_1'
		mini_1_dir.mkdir()
		mini_1_yaml = {
			'protocol_type': 'mini_protocol',
			'protocol_name': 'mini_leaf_1',
			'entry_step': 'step_one',
			'learning': {
				'objectives': 'Students completing this mini-protocol will have achieved fluency.',
				'outcomes': 'Students completing this mini-protocol will be able to act.',
				'goals': 'Overall, this mini-protocol aims to accomplish something.',
			},
			'steps': [
				{
					'step_name': 'step_one',
					'prompt': 'Do something.',
					'sequence': [
						{
							'target': 'generic_object',
							'gesture': 'click',
							'validator': {'preset': 'correct_target'},
							'response': {'scene_operations': []},
						}
					],
					'step_validator': {'preset': 'sequence_complete'},
					'outcome': {'on_success': 'complete', 'on_failure': 'retry'},
					'next_step': None,
				}
			],
		}
		mini_1_path = mini_1_dir / 'protocol.yaml'
		with open(mini_1_path, 'w') as f:
			yaml.dump(mini_1_yaml, f, default_flow_style=False)

		# Sequence runner 1 (correct: references mini)
		sr_1_dir = protocols_dir / 'seq_runner_1'
		sr_1_dir.mkdir()
		sr_1_yaml = {
			'protocol_type': 'sequence_runner',
			'protocol_name': 'seq_runner_1',
			'entry_step': 'step_one',
			'learning': {
				'objectives': 'Students completing this protocol will have achieved fluency.',
				'outcomes': 'Students completing this protocol will be able to act.',
				'goals': 'Overall, this protocol aims to accomplish something.',
			},
			'mini_protocols': ['mini_leaf_1'],
		}
		sr_1_path = sr_1_dir / 'protocol.yaml'
		with open(sr_1_path, 'w') as f:
			yaml.dump(sr_1_yaml, f, default_flow_style=False)

		# Sequence runner 2 (incorrect: references another sequence_runner)
		sr_2_dir = protocols_dir / 'seq_runner_2'
		sr_2_dir.mkdir()
		sr_2_yaml = {
			'protocol_type': 'sequence_runner',
			'protocol_name': 'seq_runner_2',
			'entry_step': 'step_one',
			'learning': {
				'objectives': 'Students completing this protocol will have achieved fluency.',
				'outcomes': 'Students completing this protocol will be able to act.',
				'goals': 'Overall, this protocol aims to accomplish something.',
			},
			'mini_protocols': ['seq_runner_1'],
		}
		sr_2_path = sr_2_dir / 'protocol.yaml'
		with open(sr_2_path, 'w') as f:
			yaml.dump(sr_2_yaml, f, default_flow_style=False)

		# Load database and validate
		db = ContentDatabase()
		db.load_from_tree(tmp_path)

		validator = ProtocolValidator(db=db)

		# Test 1: bad reference should fail
		findings = validator.validate(sr_2_yaml, 'content/protocols/seq_runner_2/protocol.yaml')
		error_found = False
		for finding in findings:
			if 'sequence_runner' in finding.message.lower() and 'mini_protocol' in finding.message.lower():
				error_found = True
				break
		if not error_found:
			raise RuntimeError("Self-test failed: sequence_runner referencing sequence_runner should be caught")

		# Test 2: valid reference should pass (filter for the specific rule error)
		findings = validator.validate(sr_1_yaml, 'content/protocols/seq_runner_1/protocol.yaml')
		leaf_rule_errors = [
			f for f in findings
			if 'sequence_runner' in f.message.lower() and 'mini_protocol' in f.message.lower()
		]
		if leaf_rule_errors:
			raise RuntimeError(f"Self-test failed: valid sequence_runner reference should pass. Errors: {[f.message for f in leaf_rule_errors]}")

		print("Self-test passed: sequence_runner-leaves rule working correctly.")


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
	dev_group.add_argument(
		'-m', '--material',
		dest='material_file',
		help='Validate a single materials.yaml. (Prefer --protocol for author workflow.)'
	)
	dev_group.add_argument(
		'-t', '--self-test',
		dest='self_test',
		action='store_true',
		help='Run internal self-test for sequence_runner-leaves rule.'
	)

	return parser.parse_args()


def main():
	"""Dispatch to the correct validation mode: list, interactive, per-protocol,
	per-file, or whole-tree. Repo root is derived from this file's location."""
	args = parse_args()

	repo_root = Path(__file__).resolve().parent.parent

	# Self-test mode
	if args.self_test:
		_self_test_sequence_runner_leaves()
		sys.exit(0)

	# List protocols
	if args.list_protocols_flag:
		protocols = list_protocols(str(repo_root))
		for name in protocols:
			print(name)
		sys.exit(0)

	# Interactive mode
	if args.interactive:
		if not sys.stdin.isatty():
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

	if args.material_file:
		try:
			material_data = load_yaml(Path(args.material_file))
			validator = MaterialValidator()
			findings = validator.validate(material_data, args.material_file)
			if findings:
				for finding in findings:
					print(finding.format())
				print(f"{len(findings)} error(s) in {args.material_file}")
			else:
				print(f"PASS: {args.material_file}")
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
	total_files = counts['objects'] + counts['base_scenes'] + counts['protocol_scenes'] + counts['materials'] + counts['protocols']
	failure_count = len(errors)

	terse_line = f"Validated {total_files} files ({counts['objects']} objects, {counts['base_scenes']} base scenes, {counts['protocol_scenes']} protocol scenes, {counts['materials']} materials, {counts['protocols']} protocols). {failure_count} failures."
	if args.quiet:
		print(terse_line)
	else:
		print(f"\n{terse_line}")

	sys.exit(0 if success else 1)


if __name__ == '__main__':
	main()
