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

import sys
import tempfile
import yaml
from pathlib import Path

from validation.shared_toolkit.yaml_io import load_yaml
from validation.yaml_schema.database import ContentDatabase
from validation.yaml_schema.object_validator import ObjectValidator
from validation.yaml_schema.scene_base_validator import BaseSceneValidator
from validation.yaml_schema.scene_protocol_validator import ProtocolSceneValidator
from validation.yaml_schema.protocol_validator import ProtocolValidator
from validation.yaml_schema.material_validator import MaterialValidator
from validation.yaml_schema.cross_protocol import CrossProtocolValidator
import validation.yaml_schema.summary as summary_printer
import validation.yaml_schema.compiled_summary as compiled_summary

import validation.shared_toolkit.cli as toolkit_cli
import validation.shared_toolkit.protocols as toolkit_protocols
import validation.shared_toolkit.interactive as toolkit_interactive
import validation.shared_toolkit.emit as emit


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
	"""
	Collect per-file PASS data (structured format for JSON output only).

	Verbose output is now limited to diagnostic summary only; per-file PASS lines
	are not printed. The data is collected for potential JSON/NDJSON output.
	"""
	# No text output for individual PASS lines in any verbosity mode.
	# Per-file details are now trace-level and only emitted to JSON/NDJSON.
	pass


def find_yaml_files(root: str, file_type: str) -> list:
	"""Find YAML files by type under content/."""
	root_path = Path(root)
	files = []

	if file_type == 'object':
		files = list(root_path.glob('content/objects/**/*.yaml'))
	elif file_type == 'base_scene':
		files = list(root_path.glob('content/base_scenes/*.yaml'))
	elif file_type == 'protocol_scene':
		files = list(root_path.glob('content/protocols/**/scenes/*.yaml'))
	elif file_type == 'protocol':
		files = list(root_path.glob('content/protocols/**/protocol.yaml'))
	elif file_type == 'material':
		files = list(root_path.glob('content/protocols/**/materials.yaml'))

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

	# V6a cross-protocol material validation (after all materials are loaded)
	cross_material_findings = material_validator.validate_cross_protocol(material_rows)
	for fnd in cross_material_findings:
		msg = fnd.format()
		errors.append(msg)
		print(msg)

	success = len(errors) == 0

	# Render compiled summary (gated by quiet)
	# Dashboard only renders when not quiet (regardless of success/failure)
	if not quiet:
		counts_agg = compiled_summary.aggregate(db, protocol_rows, protocol_scene_rows, material_rows, counts_dict=counts)
		compiled_summary.render(counts_agg)

	return success, errors, counts, db.findings


def list_protocols(repo_root: str) -> list:
	"""
	List protocol names. Thin wrapper over shared_toolkit so existing
	call sites and tests keep working.
	"""
	protocols_dir = Path(repo_root) / 'content' / 'protocols'
	return toolkit_protocols.list_protocols(protocols_dir=protocols_dir)


def resolve_protocol_path(name_or_path: str, repo_root: str) -> Path | None:
	"""Resolve a protocol identifier. Thin wrapper over shared_toolkit."""
	return toolkit_protocols.resolve_protocol_path(name_or_path, repo_root=repo_root)


def _safe_load(path: Path) -> tuple[dict | None, str | None]:
	"""Load YAML file; return (data, error_msg). Error message is None on success."""
	try:
		return load_yaml(path), None
	except RuntimeError as e:
		return None, str(e)


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

	protocol_data, err = _safe_load(protocol_yaml)
	if err:
		errors.append(err)
	else:
		protocol_validator = ProtocolValidator(db=db)
		proto_findings = protocol_validator.validate(protocol_data, str(protocol_yaml.relative_to(repo_root)))
		for finding in proto_findings:
			errors.append(finding.format())
		rel_path = str(protocol_yaml.relative_to(repo_root))
		files_checked.append(rel_path)
		files_data[rel_path] = ('protocol', protocol_data)

	# Load all objects to build name set
	object_files = find_yaml_files(repo_root, 'object')
	object_validator = ObjectValidator()
	for obj_file in object_files:
		obj_data, err = _safe_load(obj_file)
		if err:
			errors.append(err)
		else:
			obj_findings = object_validator.validate(obj_data, str(obj_file.relative_to(repo_root)))
			for finding in obj_findings:
				errors.append(finding.format())
			rel_path = str(obj_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('object', obj_data)

	# Load base scenes
	base_scene_files = find_yaml_files(repo_root, 'base_scene')
	base_scene_validator = BaseSceneValidator()
	for scene_file in base_scene_files:
		scene_data, err = _safe_load(scene_file)
		if err:
			errors.append(err)
		else:
			scene_findings = base_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
			for finding in scene_findings:
				errors.append(finding.format())
			rel_path = str(scene_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('base_scene', scene_data)

	# Validate protocol-scene (inherited scenes) for this protocol
	protocol_scenes_dir = protocol_path / 'scenes'
	if protocol_scenes_dir.exists():
		protocol_scene_validator = ProtocolSceneValidator()
		for scene_file in sorted(protocol_scenes_dir.glob('*.yaml')):
			scene_data, err = _safe_load(scene_file)
			if err:
				errors.append(err)
			else:
				scene_findings = protocol_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
				for finding in scene_findings:
					errors.append(finding.format())
				rel_path = str(scene_file.relative_to(repo_root))
				files_checked.append(rel_path)
				files_data[rel_path] = ('protocol_scene', scene_data)

	# Load materials.yaml if present (closed-schema validated)
	materials_yaml = protocol_path / 'materials.yaml'
	if materials_yaml.exists():
		materials_data, err = _safe_load(materials_yaml)
		if err:
			errors.append(err)
		else:
			material_validator = MaterialValidator()
			mat_findings = material_validator.validate(materials_data, str(materials_yaml.relative_to(repo_root)))
			for finding in mat_findings:
				errors.append(finding.format())
			rel_path = str(materials_yaml.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('material', materials_data)

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


def _render_verbose_diagnostics(db):
	"""
	Render diagnostic-summary output for -v mode.

	Shows:
	  - Top finding tags by occurrence
	  - Object kind drill-down (first 10 kinds, with counts)
	  - Top 5 protocols by step count

	Args:
		db: ContentDatabase instance with findings and objects populated.
	"""
	output_lines = []

	output_lines.append("Diagnostic Summary:")
	output_lines.append("")

	#============================================
	# Top finding tags by occurrence
	if db.findings:
		tag_counts = {}
		for finding in db.findings:
			tag = finding.code
			tag_counts[tag] = tag_counts.get(tag, 0) + 1

		output_lines.append("Top finding tags (by occurrence):")
		sorted_tags = sorted(tag_counts.items(), key=lambda kv: (-kv[1], kv[0]))
		for tag, count in sorted_tags[:10]:
			output_lines.append(f"  {tag}: {count}")
		if len(sorted_tags) > 10:
			output_lines.append(f"  ... and {len(sorted_tags) - 10} more")

	#============================================
	# Object kind drill-down
	if db.objects:
		output_lines.append("")
		output_lines.append("Object kinds (first 10 with counts):")
		kind_counts = {}
		for obj_name, obj_data in db.objects.items():
			kind = obj_data['kind']
			if kind not in kind_counts:
				kind_counts[kind] = 0
			kind_counts[kind] += 1

		sorted_kinds = sorted(kind_counts.items(), key=lambda kv: (-kv[1], kv[0]))
		for kind, count in sorted_kinds[:10]:
			# Truncate kind name if too long
			kind_str = kind if len(kind) <= 20 else kind[:17] + "..."
			output_lines.append(f"  {kind_str}: {count}")
		if len(sorted_kinds) > 10:
			output_lines.append(f"  ... and {len(sorted_kinds) - 10} more kinds")

	if output_lines and len(output_lines) > 2:
		# Only print if we have actual content (more than header + empty line)
		print('\n'.join(output_lines))
		print()


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
	"""Parse command-line arguments using unified toolkit parser."""
	# Extras callback for tool-specific flags
	def add_yaml_extras(parser):
		# Developer/debug options specific to yaml validator
		# These use different destination names to avoid conflicts with shared selection flags
		dev_group = parser.add_argument_group('Developer/debug options')
		dev_group.add_argument(
			'--validate-object',
			dest='object_file',
			help='Validate a single object YAML file. (Prefer --protocol for author workflow.)'
		)
		dev_group.add_argument(
			'--validate-scene',
			dest='base_scene_file',
			help='Validate a single base scene YAML file. (Prefer --protocol for author workflow.)'
		)
		dev_group.add_argument(
			'--validate-protocol-scene',
			dest='protocol_scene_file',
			help='Validate a single protocol-scene (inherited) YAML file. (Prefer --protocol for author workflow.)'
		)
		dev_group.add_argument(
			'--validate-material',
			dest='material_file',
			help='Validate a single materials.yaml file. (Prefer --protocol for author workflow.)'
		)
		dev_group.add_argument(
			'--self-test',
			dest='self_test',
			action='store_true',
			help='Run internal self-test for sequence_runner-leaves rule.'
		)

	parser = toolkit_cli.build_parser(
		prog='content_lint',
		description='Validate Virtual Lab Protocol Simulation content YAML against ratified specs. With no arguments, validates every YAML file under content/.',
		extras=add_yaml_extras
	)

	# Parse and return
	args = parser.parse_args()
	return args


def main():
	"""Dispatch to the correct validation mode: list, interactive, per-protocol,
	per-file, or whole-tree. Repo root is imported from shared_toolkit.

	Verbosity contract (text output line targets):
	  -q / --quiet   : 1 line (final pass/fail with key numbers)
	  default        : 5-40 lines (stage summary, totals, top categories)
	  -v / --verbose : 40-<200 lines (per-content-file breakdown, grouped, summarized)
	  -j / --json    : full machine-readable detail (no bound)
	  -J / --ndjson  : streamed full detail (no bound)
	Raw per-step / per-asset internals go to JSON only, NOT text.
	"""
	args = parse_args()

	from validation.shared_toolkit.repo_root import REPO_ROOT as repo_root

	# Self-test mode
	if args.self_test:
		_self_test_sequence_runner_leaves()
		sys.exit(0)

	# List protocols
	if args.list_only:
		protocols = list_protocols(str(repo_root))
		for name in protocols:
			print(name)
		sys.exit(0)

	# Interactive mode
	if args.interactive:
		protocols = list_protocols(str(repo_root))
		selected = toolkit_interactive.pick_protocol_interactively(protocols)
		if selected is None:
			sys.exit(1)
		success, errors = validate_protocol_package(selected, str(repo_root), quiet=args.quiet, verbose=args.verbose)
		sys.exit(0 if success else 1)

	# Protocol package validation (-p / --protocol flag)
	if args.protocols:
		# Handle multiple protocols
		all_success = True
		for protocol_name_or_path in args.protocols:
			protocol_path = resolve_protocol_path(protocol_name_or_path, str(repo_root))
			if not protocol_path:
				print(f"Protocol '{protocol_name_or_path}' not found")
				all_success = False
				continue
			# Extract protocol name from path
			protocol_name = protocol_path.parent.name
			success, errors = validate_protocol_package(protocol_name, str(repo_root), quiet=args.quiet, verbose=args.verbose)
			if not success:
				all_success = False
		sys.exit(0 if all_success else 1)

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
				scene_data = load_yaml(scene_file)
				scene_name = scene_data.get('scene_name')
				if scene_name:
					base_scenes[scene_name] = scene_data

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
	success, errors, counts, findings = validate_whole_tree(str(repo_root), quiet=args.quiet, verbose=args.verbose)
	total_files = counts['objects'] + counts['base_scenes'] + counts['protocol_scenes'] + counts['materials'] + counts['protocols']
	failure_count = len(errors)

	# Handle JSON/NDJSON output
	if args.output_format in ('json', 'ndjson'):
		emit.emit_findings(findings, output_format=args.output_format)
	else:
		# Text format (default)
		if args.verbose and not args.quiet:
			# Load database to get object/findings info for diagnostic summary
			db = ContentDatabase()
			db.load_from_tree(Path(repo_root))
			_render_verbose_diagnostics(db)

		terse_line = f"Validated {total_files} files ({counts['objects']} objects, {counts['base_scenes']} base scenes, {counts['protocol_scenes']} protocol scenes, {counts['materials']} materials, {counts['protocols']} protocols). {failure_count} failures."
		if args.quiet:
			print(terse_line)
		else:
			print(f"\n{terse_line}")

	sys.exit(0 if success else 1)


if __name__ == '__main__':
	main()
