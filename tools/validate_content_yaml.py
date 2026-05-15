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
import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# ============================================
# CONSTANTS WITH SPEC CITATIONS
# ============================================

# Object kinds - from OBJECT_YAML_FORMAT.md "Object identity" table
OBJECT_KINDS = {'plate', 'bottle', 'flask', 'pipette', 'rack', 'waste', 'equipment', 'decoration'}

# Object capabilities - from OBJECT_VOCABULARY.md "Capabilities" table
OBJECT_CAPABILITIES = {
	'clickable',
	'contents_container',
	'instrument_with_setpoint',
	'structured_surface',
	'cursor_attachable',
	'decoration_only',
}

# Retired object fields - user-stated retirement list and docs/specs/OBJECT_VOCABULARY.md
RETIRED_OBJECT_KEYS = {
	'short_label',
	'id',
	'role',
	'colorKey',
	'render_map',
	'liquid_container',
	'liquid_color',
	'liquid_id',
	'liquid_volume',
	'asset_name',
	'inventory_ref',
	'inventoryRef',
	'shortLabel',
	'sceneId',
}

# Base scene top-level keys - from SCENE_YAML_FORMAT.md "Top-level fields" table
BASE_SCENE_REQUIRED_KEYS = {'scene_name', 'workspace', 'capabilities', 'scene_bounds', 'zones', 'placements'}
BASE_SCENE_OPTIONAL_KEYS = {'background', 'layout_rules', 'accent_rules', 'wrong_order_message'}
BASE_SCENE_ALL_KEYS = BASE_SCENE_REQUIRED_KEYS | BASE_SCENE_OPTIONAL_KEYS

# Retired base scene keys
RETIRED_BASE_SCENE_KEYS = {
	'element_id',
	'sceneId',
	'elementId',
	'short_label',
}

# Protocol-scene top-level keys - from plan "Protocol-scene schema (closed)"
PROTOCOL_SCENE_ALLOWED_KEYS = {
	'scene_name', 'extends', 'add_placements', 'reposition_placements',
	'deactivate_placements', 'remove_placements', 'scene_notes'
}

# Locked fields within placements (object-owned)
PLACEMENT_LOCKED_FIELDS = {
	'label', 'kind', 'state_fields', 'visual_states', 'capabilities', 'layout'
}

# Reposition-only fields - from plan
REPOSITION_ALLOWED_FIELDS = {'placement_name', 'zone', 'position', 'depth', 'anchor', 'depth_tier', 'align_stop'}

# Protocol types - from PRIMARY_SPEC.md "Protocol types"
PROTOCOL_TYPES = {'protocol', 'mini_protocol', 'sequence_runner', 'dev_smoke'}

# Gestures - from PRIMARY_SPEC.md "Gestures"
VALID_GESTURES = {'click', 'drag', 'adjust', 'select', 'type'}

# Scene operations - from PRIMARY_SPEC.md "Scene operations"
VALID_SCENE_OPERATIONS = {'ObjectStateChange', 'CursorAttach', 'SceneChange', 'LayoutMove', 'TimedWait'}

# Interaction validator presets - from PROTOCOL_YAML_FORMAT.md "Validator presets"
INTERACTION_VALIDATOR_PRESETS = {'correct_target', 'correct_choice', 'target_with_value'}

# State field types - from OBJECT_YAML_FORMAT.md "state_fields"
STATE_FIELD_TYPES = {'enum', 'int', 'float', 'bool'}

# Retired protocol keys - from PROTOCOL_YAML_FORMAT.md
RETIRED_PROTOCOL_KEYS = {
	'action',
	'nextId',
	'stepIndex',
	'requiredItems',
	'usedItems',
	'completionPath',
	'completionTrigger',
	'colorKey',
}


class ValidationError(Exception):
	"""Raised when validation fails."""
	pass


class ObjectValidator:
	"""Validates object YAML files per OBJECT_YAML_FORMAT.md."""

	def validate(self, obj: Dict[str, Any], path: str) -> List[str]:
		"""
		Validate an object definition.
		Returns list of error messages (empty if valid).
		"""
		errors = []

		# Required top-level keys per OBJECT_YAML_FORMAT.md table
		required = ['object_name', 'kind', 'label', 'state_fields', 'visual_states', 'capabilities', 'layout']
		for key in required:
			if key not in obj:
				errors.append(f"{path}: missing required key '{key}'")

		# Check for retired keys
		for retired in RETIRED_OBJECT_KEYS:
			if retired in obj:
				errors.append(f"{path}: retired key '{retired}' found (no longer supported)")

		if not errors:
			errors.extend(self._validate_identity(obj, path))
			errors.extend(self._validate_state_fields(obj, path))
			errors.extend(self._validate_capabilities(obj, path))

		return errors

	def _validate_identity(self, obj: Dict[str, Any], path: str) -> List[str]:
		"""Validate object_name, kind, label per OBJECT_YAML_FORMAT.md."""
		errors = []

		object_name = obj.get('object_name')
		if object_name and not self._is_snake_case(object_name):
			errors.append(f"{path}: object_name '{object_name}' is not snake_case")

		kind = obj.get('kind')
		if kind and kind not in OBJECT_KINDS:
			errors.append(f"{path}: kind '{kind}' not in allowed set {OBJECT_KINDS}")

		label = obj.get('label')
		if not label or not isinstance(label, str) or not label.strip():
			errors.append(f"{path}: label is required and must be non-empty string")

		return errors

	def _validate_state_fields(self, obj: Dict[str, Any], path: str) -> List[str]:
		"""Validate state_fields per OBJECT_YAML_FORMAT.md."""
		errors = []

		state_fields = obj.get('state_fields')
		if not isinstance(state_fields, list):
			errors.append(f"{path}: state_fields must be a list")
			return errors

		seen_names = set()
		for idx, field in enumerate(state_fields):
			field_path = f"{path}.state_fields[{idx}]"

			if not isinstance(field, dict):
				errors.append(f"{field_path}: state_field entry must be a mapping")
				continue

			if 'name' not in field:
				errors.append(f"{field_path}: missing required key 'name'")
			if 'type' not in field:
				errors.append(f"{field_path}: missing required key 'type'")
			if 'default' not in field:
				errors.append(f"{field_path}: missing required key 'default'")

			field_name = field.get('name')
			if field_name:
				if field_name in seen_names:
					errors.append(f"{field_path}: duplicate field name '{field_name}'")
				else:
					seen_names.add(field_name)

			field_type = field.get('type')
			if field_type and field_type not in STATE_FIELD_TYPES:
				errors.append(f"{field_path}: type '{field_type}' not in {STATE_FIELD_TYPES}")

			if field_type == 'enum' and 'allowed' not in field:
				errors.append(f"{field_path}: enum field missing required 'allowed' list")

		return errors

	def _validate_capabilities(self, obj: Dict[str, Any], path: str) -> List[str]:
		"""Validate capabilities per OBJECT_VOCABULARY.md."""
		errors = []

		capabilities = obj.get('capabilities')
		if not isinstance(capabilities, list):
			errors.append(f"{path}: capabilities must be a list")
			return errors

		has_decoration = 'decoration_only' in capabilities
		other_caps = set(capabilities) - {'decoration_only'}

		if has_decoration and other_caps:
			errors.append(f"{path}: decoration_only is mutually exclusive with other capabilities")

		for cap in capabilities:
			if cap not in OBJECT_CAPABILITIES:
				errors.append(f"{path}: unknown capability '{cap}'")

		return errors

	@staticmethod
	def _is_snake_case(s: str) -> bool:
		"""Check if string is snake_case."""
		if not s:
			return False
		return all(c.isalnum() or c == '_' for c in s) and not s[0].isdigit()


class BaseSceneValidator:
	"""Validates base scene YAML files per SCENE_YAML_FORMAT.md."""

	def __init__(self):
		self.all_objects: Set[str] = set()

	def set_object_names(self, names: Set[str]) -> None:
		"""Set known object names for cross-reference validation."""
		self.all_objects = names

	def validate(self, scene: Dict[str, Any], path: str) -> List[str]:
		"""Validate a base scene definition."""
		errors = []

		if 'extends' in scene:
			errors.append(f"{path}: base scenes must not have 'extends' field")

		for retired in RETIRED_BASE_SCENE_KEYS:
			if retired in scene:
				errors.append(f"{path}: retired key '{retired}' found")

		for key in BASE_SCENE_REQUIRED_KEYS:
			if key not in scene:
				errors.append(f"{path}: missing required key '{key}'")

		for key in scene:
			if key not in BASE_SCENE_ALL_KEYS:
				errors.append(f"{path}: unknown top-level key '{key}'")

		if not errors:
			zone_errors, zone_ids = self._validate_zones(scene, path)
			errors.extend(zone_errors)
			errors.extend(self._validate_placements(scene, path, zone_ids))

		return errors

	def _validate_zones(self, scene: Dict[str, Any], path: str) -> Tuple[List[str], Set[str]]:
		"""Validate zones per SCENE_YAML_FORMAT.md."""
		errors = []
		zones = scene.get('zones', [])

		if not isinstance(zones, list):
			errors.append(f"{path}: zones must be a list")
			return errors, set()

		zone_ids = set()
		for idx, zone in enumerate(zones):
			zone_path = f"{path}.zones[{idx}]"
			if not isinstance(zone, dict):
				errors.append(f"{zone_path}: zone entry must be a mapping")
				continue

			if 'id' not in zone:
				errors.append(f"{zone_path}: zone missing required 'id'")
			else:
				zone_id = zone['id']
				if zone_id in zone_ids:
					errors.append(f"{zone_path}: duplicate zone id '{zone_id}'")
				else:
					zone_ids.add(zone_id)

		return errors, zone_ids

	def _validate_placements(self, scene: Dict[str, Any], path: str, zone_ids: Set[str]) -> List[str]:
		"""Validate placements per SCENE_YAML_FORMAT.md."""
		errors = []
		placements = scene.get('placements', [])

		if not isinstance(placements, list):
			errors.append(f"{path}: placements must be a list")
			return errors

		placement_names = set()
		for idx, placement in enumerate(placements):
			placement_path = f"{path}.placements[{idx}]"
			if not isinstance(placement, dict):
				errors.append(f"{placement_path}: placement entry must be a mapping")
				continue

			if 'placement_name' not in placement:
				errors.append(f"{placement_path}: placement missing required 'placement_name'")
			else:
				pname = placement['placement_name']
				if pname in placement_names:
					errors.append(f"{placement_path}: duplicate placement_name '{pname}'")
				else:
					placement_names.add(pname)

			if 'object_name' not in placement:
				errors.append(f"{placement_path}: placement missing required 'object_name'")
			elif self.all_objects and placement['object_name'] not in self.all_objects:
				errors.append(f"{placement_path}: object_name '{placement['object_name']}' not found")

		return errors


class ProtocolSceneValidator:
	"""Validates protocol-scene (inherited) YAML files per SCENE_INHERITANCE.md."""

	def __init__(self):
		self.base_scenes: Dict[str, Dict[str, Any]] = {}

	def set_base_scenes(self, scenes: Dict[str, Dict[str, Any]]) -> None:
		"""Set known base scenes for inheritance validation."""
		self.base_scenes = scenes

	def validate(self, scene: Dict[str, Any], path: str) -> List[str]:
		"""Validate a protocol-scene definition."""
		errors = []

		for key in scene:
			if key not in PROTOCOL_SCENE_ALLOWED_KEYS:
				errors.append(f"{path}: unknown top-level key '{key}' (protocol-scene keys are closed)")

		if 'extends' not in scene:
			errors.append(f"{path}: protocol-scene missing required 'extends' field")
		else:
			extends = scene['extends']
			if extends not in self.base_scenes:
				errors.append(f"{path}: extends '{extends}' does not name a known base scene")

		if not errors and 'extends' in scene:
			errors.extend(self._validate_operations(scene, path))

		return errors

	def _validate_operations(self, scene: Dict[str, Any], path: str) -> List[str]:
		"""Validate add/remove/reposition/deactivate operations."""
		errors = []

		base_name = scene['extends']
		base_scene = self.base_scenes.get(base_name, {})
		base_placements = base_scene.get('placements', [])
		base_placement_names = {p.get('placement_name') for p in base_placements if isinstance(p, dict)}

		new_placement_names = set(base_placement_names)

		for op in ['remove_placements', 'deactivate_placements', 'reposition_placements', 'add_placements']:
			ops = scene.get(op, [])
			if not isinstance(ops, list):
				errors.append(f"{path}: {op} must be a list")
				continue

			for idx, entry in enumerate(ops):
				entry_path = f"{path}.{op}[{idx}]"
				if not isinstance(entry, dict):
					errors.append(f"{entry_path}: entry must be a mapping")
					continue

				if 'placement_name' not in entry:
					errors.append(f"{entry_path}: entry missing required 'placement_name'")
					continue

				pname = entry['placement_name']

				if op == 'add_placements':
					if pname in base_placement_names:
						errors.append(f"{entry_path}: add_placements placement_name '{pname}' collides with base")
					else:
						new_placement_names.add(pname)
				else:
					if pname not in new_placement_names:
						errors.append(f"{entry_path}: {op} references unknown placement_name '{pname}'")

				if op == 'reposition_placements':
					for key in entry:
						if key not in REPOSITION_ALLOWED_FIELDS:
							errors.append(f"{entry_path}: reposition_placements may only change zone, position, depth, anchor")

				if op == 'add_placements':
					for key in entry:
						if key in PLACEMENT_LOCKED_FIELDS:
							errors.append(f"{entry_path}: add_placements may not set object-owned field '{key}'")

		return errors


class ProtocolValidator:
	"""Validates protocol YAML files per PRIMARY_SPEC.md and PROTOCOL_YAML_FORMAT.md."""

	def validate(self, protocol: Dict[str, Any], path: str) -> List[str]:
		"""Validate a protocol definition."""
		errors = []

		for retired in RETIRED_PROTOCOL_KEYS:
			if retired in protocol:
				errors.append(f"{path}: retired key '{retired}' found")

		required = ['protocol_type', 'name', 'entry_step', 'learning', 'steps']
		for key in required:
			if key not in protocol:
				errors.append(f"{path}: missing required key '{key}'")

		if not errors:
			errors.extend(self._validate_protocol_type(protocol, path))
			errors.extend(self._validate_learning(protocol, path))
			errors.extend(self._validate_steps(protocol, path))

		return errors

	def _validate_protocol_type(self, protocol: Dict[str, Any], path: str) -> List[str]:
		"""Validate protocol_type per PRIMARY_SPEC.md."""
		errors = []
		ptype = protocol.get('protocol_type')
		if ptype not in PROTOCOL_TYPES:
			errors.append(f"{path}: protocol_type '{ptype}' not in {PROTOCOL_TYPES}")
		return errors

	def _validate_learning(self, protocol: Dict[str, Any], path: str) -> List[str]:
		"""Validate learning block per PRIMARY_SPEC.md."""
		errors = []
		ptype = protocol.get('protocol_type')
		learning = protocol.get('learning')

		if ptype in ('mini_protocol', 'protocol'):
			if not isinstance(learning, dict):
				errors.append(f"{path}: learning block is required and must be a mapping")
				return errors

			for field in {'objectives', 'outcomes', 'goals'}:
				if field not in learning:
					errors.append(f"{path}.learning: missing required key '{field}'")

		return errors

	def _validate_steps(self, protocol: Dict[str, Any], path: str) -> List[str]:
		"""Validate steps per PRIMARY_SPEC.md."""
		errors = []
		steps = protocol.get('steps')

		if not isinstance(steps, list):
			errors.append(f"{path}: steps must be a list")
			return errors

		if not steps:
			errors.append(f"{path}: steps list cannot be empty")
			return errors

		step_names = set()
		terminal_count = 0

		for idx, step in enumerate(steps):
			step_path = f"{path}.steps[{idx}]"
			if not isinstance(step, dict):
				errors.append(f"{step_path}: step entry must be a mapping")
				continue

			required = ['name', 'prompt', 'sequence', 'step_validator', 'outcome', 'next_step']
			for key in required:
				if key not in step:
					errors.append(f"{step_path}: missing required key '{key}'")

			step_name = step.get('name')
			if step_name:
				if step_name in step_names:
					errors.append(f"{step_path}: duplicate step name '{step_name}'")
				else:
					step_names.add(step_name)

			errors.extend(self._validate_sequence(step, step_path))

			outcome = step.get('outcome')
			if isinstance(outcome, dict):
				if outcome.get('on_success') != 'complete':
					errors.append(f"{step_path}.outcome.on_success: must be 'complete'")
				if outcome.get('on_failure') != 'retry':
					errors.append(f"{step_path}.outcome.on_failure: must be 'retry'")
				if 'advance' in outcome:
					errors.append(f"{step_path}.outcome: 'advance' key is not allowed")

			if step.get('next_step') is None:
				terminal_count += 1

		entry_step = protocol.get('entry_step')
		if entry_step and entry_step not in step_names:
			errors.append(f"{path}: entry_step '{entry_step}' does not name any step")

		if terminal_count != 1:
			errors.append(f"{path}: must have exactly one terminal step, found {terminal_count}")

		ptype = protocol.get('protocol_type')
		if ptype == 'mini_protocol':
			num_steps = len(steps)
			if num_steps < 6 or num_steps > 10:
				errors.append(f"{path}: mini_protocol must have 6-10 steps, found {num_steps}")

		return errors

	def _validate_sequence(self, step: Dict[str, Any], step_path: str) -> List[str]:
		"""Validate sequence (list of interactions)."""
		errors = []
		sequence = step.get('sequence')

		if not isinstance(sequence, list):
			errors.append(f"{step_path}: sequence must be a list")
			return errors

		for idx, interaction in enumerate(sequence):
			interaction_path = f"{step_path}.sequence[{idx}]"
			if not isinstance(interaction, dict):
				errors.append(f"{interaction_path}: interaction entry must be a mapping")
				continue

			required = ['target', 'gesture', 'validator', 'response']
			for key in required:
				if key not in interaction:
					errors.append(f"{interaction_path}: missing required key '{key}'")

			gesture = interaction.get('gesture')
			if gesture and gesture not in VALID_GESTURES:
				errors.append(f"{interaction_path}: gesture '{gesture}' not in {VALID_GESTURES}")

			validator = interaction.get('validator')
			if isinstance(validator, dict):
				preset = validator.get('preset')
				if preset and preset not in INTERACTION_VALIDATOR_PRESETS:
					errors.append(f"{interaction_path}.validator: preset '{preset}' not recognized")

			response = interaction.get('response')
			if isinstance(response, dict):
				scene_ops = response.get('scene_operations', [])
				if not isinstance(scene_ops, list):
					errors.append(f"{interaction_path}.response: scene_operations must be a list")
				else:
					for op_idx, op in enumerate(scene_ops):
						op_path = f"{interaction_path}.response.scene_operations[{op_idx}]"
						if isinstance(op, dict):
							op_type = op.get('type')
							if op_type and op_type not in VALID_SCENE_OPERATIONS:
								errors.append(f"{op_path}: type '{op_type}' not in {VALID_SCENE_OPERATIONS}")

		return errors


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


def load_yaml(path: Path) -> Optional[Dict[str, Any]]:
	"""Load YAML file safely."""
	try:
		with open(path, 'r') as f:
			return yaml.safe_load(f) or {}
	except Exception as e:
		raise ValidationError(f"Failed to load {path}: {e}")


def validate_whole_tree(repo_root: str, quiet: bool = False, verbose: bool = False) -> Tuple[bool, List[str], Dict[str, int]]:
	"""
	Validate entire content tree.
	Returns (success, list_of_error_messages, counts_dict).
	counts_dict: {'objects': N, 'base_scenes': N, 'protocol_scenes': N, 'protocols': N}
	"""
	errors = []
	counts = {'objects': 0, 'base_scenes': 0, 'protocol_scenes': 0, 'protocols': 0}

	# Validate objects
	if verbose:
		print("=== Objects ===")
	object_files = find_yaml_files(repo_root, 'object')
	object_names = set()
	object_validator = ObjectValidator()

	for obj_file in object_files:
		rel_path = obj_file.relative_to(repo_root)
		try:
			obj_data = load_yaml(obj_file)
			obj_errors = object_validator.validate(obj_data, str(rel_path))
			if obj_errors:
				errors.extend(obj_errors)
				for error in obj_errors:
					print(error)
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), obj_data, 'object')
				counts['objects'] += 1

			obj_name = obj_data.get('object_name')
			if obj_name:
				object_names.add(obj_name)
		except ValidationError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate base scenes
	if verbose:
		print("=== Base scenes ===")
	base_scene_files = find_yaml_files(repo_root, 'base_scene')
	base_scenes = {}
	base_scene_validator = BaseSceneValidator()
	base_scene_validator.set_object_names(object_names)

	for scene_file in base_scene_files:
		rel_path = scene_file.relative_to(repo_root)
		try:
			scene_data = load_yaml(scene_file)
			scene_errors = base_scene_validator.validate(scene_data, str(rel_path))
			if scene_errors:
				errors.extend(scene_errors)
				for error in scene_errors:
					print(error)
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), scene_data, 'base_scene')
				counts['base_scenes'] += 1

			scene_name = scene_data.get('scene_name')
			if scene_name:
				base_scenes[scene_name] = scene_data
		except ValidationError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate protocol scenes
	if verbose:
		print("=== Protocol scenes ===")
	protocol_scene_files = find_yaml_files(repo_root, 'protocol_scene')
	protocol_scene_validator = ProtocolSceneValidator()
	protocol_scene_validator.set_base_scenes(base_scenes)

	for scene_file in protocol_scene_files:
		rel_path = scene_file.relative_to(repo_root)
		try:
			scene_data = load_yaml(scene_file)
			scene_errors = protocol_scene_validator.validate(scene_data, str(rel_path))
			if scene_errors:
				errors.extend(scene_errors)
				for error in scene_errors:
					print(error)
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), scene_data, 'protocol_scene')
				counts['protocol_scenes'] += 1
		except ValidationError as e:
			error_msg = str(e)
			errors.append(error_msg)
			print(error_msg)

	# Validate protocols
	if verbose:
		print("=== Protocols ===")
	protocol_files = find_yaml_files(repo_root, 'protocol')
	protocol_validator = ProtocolValidator()

	for protocol_file in protocol_files:
		rel_path = protocol_file.relative_to(repo_root)
		try:
			protocol_data = load_yaml(protocol_file)
			protocol_errors = protocol_validator.validate(protocol_data, str(rel_path))
			if protocol_errors:
				errors.extend(protocol_errors)
				for error in protocol_errors:
					print(error)
			else:
				if verbose:
					print(f"PASS: {rel_path}")
					print_verbose_details(str(rel_path), protocol_data, 'protocol')
				counts['protocols'] += 1
		except ValidationError as e:
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

	# Load protocol.yaml
	protocol_yaml = protocol_path / 'protocol.yaml'
	if not protocol_yaml.exists():
		errors.append(f"Protocol package missing protocol.yaml: {protocol_yaml}")
		return False, errors

	try:
		protocol_data = load_yaml(protocol_yaml)
		protocol_validator = ProtocolValidator()
		proto_errors = protocol_validator.validate(protocol_data, str(protocol_yaml.relative_to(repo_root)))
		errors.extend(proto_errors)
		rel_path = str(protocol_yaml.relative_to(repo_root))
		files_checked.append(rel_path)
		files_data[rel_path] = ('protocol', protocol_data)
	except ValidationError as e:
		errors.append(str(e))

	# Load all objects to build name set
	object_files = find_yaml_files(repo_root, 'object')
	object_names = set()
	object_validator = ObjectValidator()
	for obj_file in object_files:
		try:
			obj_data = load_yaml(obj_file)
			obj_errors = object_validator.validate(obj_data, str(obj_file.relative_to(repo_root)))
			errors.extend(obj_errors)
			rel_path = str(obj_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('object', obj_data)
			obj_name = obj_data.get('object_name')
			if obj_name:
				object_names.add(obj_name)
		except ValidationError as e:
			errors.append(str(e))

	# Load base scenes
	base_scene_files = find_yaml_files(repo_root, 'base_scene')
	base_scenes = {}
	base_scene_validator = BaseSceneValidator()
	base_scene_validator.set_object_names(object_names)
	for scene_file in base_scene_files:
		try:
			scene_data = load_yaml(scene_file)
			scene_errors = base_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
			errors.extend(scene_errors)
			rel_path = str(scene_file.relative_to(repo_root))
			files_checked.append(rel_path)
			files_data[rel_path] = ('base_scene', scene_data)
			scene_name = scene_data.get('scene_name')
			if scene_name:
				base_scenes[scene_name] = scene_data
		except ValidationError as e:
			errors.append(str(e))

	# Validate protocol-scene (inherited scenes) for this protocol
	protocol_scenes_dir = protocol_path / 'scenes'
	if protocol_scenes_dir.exists():
		protocol_scene_validator = ProtocolSceneValidator()
		protocol_scene_validator.set_base_scenes(base_scenes)
		for scene_file in sorted(protocol_scenes_dir.glob('*.yaml')):
			try:
				scene_data = load_yaml(scene_file)
				scene_errors = protocol_scene_validator.validate(scene_data, str(scene_file.relative_to(repo_root)))
				errors.extend(scene_errors)
				rel_path = str(scene_file.relative_to(repo_root))
				files_checked.append(rel_path)
				files_data[rel_path] = ('protocol_scene', scene_data)
			except ValidationError as e:
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
		except ValidationError as e:
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
			errors = validator.validate(obj_data, args.object_file)
			if errors:
				for error in errors:
					print(error)
				print(f"{len(errors)} error(s) in {args.object_file}")
			else:
				print(f"PASS: {args.object_file}")
			sys.exit(0 if not errors else 1)
		except ValidationError as e:
			print(str(e))
			sys.exit(1)

	if args.base_scene_file:
		try:
			scene_data = load_yaml(Path(args.base_scene_file))
			validator = BaseSceneValidator()
			errors = validator.validate(scene_data, args.base_scene_file)
			if errors:
				for error in errors:
					print(error)
				print(f"{len(errors)} error(s) in {args.base_scene_file}")
			else:
				print(f"PASS: {args.base_scene_file}")
			sys.exit(0 if not errors else 1)
		except ValidationError as e:
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
				except ValidationError:
					pass

			scene_data = load_yaml(Path(args.protocol_scene_file))
			validator = ProtocolSceneValidator()
			validator.set_base_scenes(base_scenes)
			errors = validator.validate(scene_data, args.protocol_scene_file)
			if errors:
				for error in errors:
					print(error)
				print(f"{len(errors)} error(s) in {args.protocol_scene_file}")
			else:
				print(f"PASS: {args.protocol_scene_file}")
			sys.exit(0 if not errors else 1)
		except ValidationError as e:
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
