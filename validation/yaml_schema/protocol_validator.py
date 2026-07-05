"""ProtocolValidator: validates protocol YAML per PRIMARY_SPEC.md with Tier 1 cross-file checks."""

from validation.yaml_schema.constants import (
	PROTOCOL_TYPES,
	PROTOCOL_REQUIRED_KEYS,
	PROTOCOL_ALL_KEYS,
	VALID_GESTURES,
	VALID_SCENE_OPERATIONS,
	INTERACTION_VALIDATOR_PRESETS,
	LEARNING_MINI_PROTOCOL_PREFIXES,
	LEARNING_SEQUENCE_RUNNER_PREFIXES,
	SCENE_OPERATION_SCHEMA,
	VALIDATOR_PRESET_SCHEMA,
)
from validation.yaml_schema.findings import Finding, Severity
from validation.yaml_schema.database import ContentDatabase


class ProtocolValidator:
	"""Validates protocol YAML files per PRIMARY_SPEC.md with Tier 1 cross-file checks."""

	def __init__(self, db: ContentDatabase | None = None):
		"""Initialize with optional ContentDatabase for Tier 1 checks."""
		self.db = db

	def _extract_protocol_name(self, path: str) -> str | None:
		"""
		Extract protocol name from a path like
		'content/protocols/<cluster>/<name>/protocol.yaml.steps[0]...' (clustered)
		or 'content/protocols/<name>/protocol.yaml...' (flat).

		Layout-agnostic: walk segments left to right and return the segment
		immediately preceding the one whose basename starts with 'protocol.yaml'
		(the protocol leaf directory). This handles any depth under
		content/protocols/.
		"""
		parts = path.split('/')
		for i, segment in enumerate(parts):
			if segment.startswith('protocol.yaml') and i > 0:
				return parts[i - 1]
		return None

	def validate_closure(self, protocol: dict, path: str) -> list:
		"""
		Check protocol top-level keys against the closed vocabulary
		(PROTOCOL_ALL_KEYS). Any key not in the documented whitelist is
		unknown. Subsumes the retired-key check; no allow-list maintained.

		This is the single schema source for top-level protocol key
		closure. Callers outside this module (for example
		pipeline/gen_protocols.py) must invoke this method rather than
		re-deriving their own key allow-list, so an unknown/escape-hatch
		field is rejected the same way everywhere.
		"""
		findings = []
		for key in protocol.keys():
			if key not in PROTOCOL_ALL_KEYS:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"[CLOSURE] unknown top-level key '{key}' (allowed: {sorted(PROTOCOL_ALL_KEYS)})",
				))
		return findings

	def validate(self, protocol: dict, path: str) -> list:
		"""Validate a protocol definition."""
		findings = []

		findings.extend(self.validate_closure(protocol, path))

		for key in PROTOCOL_REQUIRED_KEYS:
			if key not in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"missing required key '{key}'",
				))

		# Per-type required slot: sequence_runner declares `mini_protocols`;
		# every other type declares `steps`.
		ptype = protocol.get('protocol_type')
		if ptype == 'sequence_runner':
			if 'mini_protocols' not in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message="sequence_runner requires 'mini_protocols' (ordered constituent list)",
					tag="mini_protocols_required",
				))
			# Reject `steps:` on sequence_runner (must be omitted per spec)
			if 'steps' in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message="sequence_runner must omit 'steps' key (use 'mini_protocols' instead)",
					tag="steps_forbidden",
				))
		else:
			if 'steps' not in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"protocol_type '{ptype}' requires 'steps'",
				))
			# V1: Reject `mini_protocols:` on mini_protocol (must be omitted per spec)
			if 'mini_protocols' in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"protocol_type '{ptype}' must omit 'mini_protocols' key (use 'steps' instead)",
					tag="mini_protocols_forbidden",
				))

		if not findings:
			findings.extend(self._validate_protocol_type(protocol, path))
			findings.extend(self._validate_learning(protocol, path))
			if ptype == 'sequence_runner':
				findings.extend(self._validate_sequence_runner(protocol, path))
			else:
				findings.extend(self._validate_steps(protocol, path))

		return findings

	def _validate_sequence_runner(self, protocol: dict, path: str) -> list:
		"""
		Validate sequence_runner constituent list and shape per PRIMARY_SPEC.md.
		Includes V1 gate: entry_step matching and file resolution.
		"""
		findings = []
		mp_list = protocol.get('mini_protocols')

		if not isinstance(mp_list, list) or not mp_list:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="mini_protocols must be a non-empty list of constituent names",
				tag="mini_protocols_required",
			))
			return findings

		known = set(self.db.protocols.keys()) if self.db else set()
		for idx, name in enumerate(mp_list):
			if not isinstance(name, str):
				findings.append(Finding(
					path=f"{path}.mini_protocols[{idx}]",
					lineno=None,
					severity=Severity.ERROR,
					message="constituent entry must be a string (mini-protocol name)",
					tag="mini_protocol_not_found",
				))
				continue
			# V1: Each name must resolve to a known protocol (file exists).
			if self.db and name not in known:
				findings.append(Finding(
					path=f"{path}.mini_protocols[{idx}]",
					lineno=None,
					severity=Severity.ERROR,
					message=f"constituent '{name}' does not resolve to a known protocol",
					tag="mini_protocol_not_found",
				))
			# HARD RULE: sequence_runner may reference only mini_protocol leaves,
			# never another sequence_runner.
			elif self.db and name in known:
				referenced_protocol = self.db.protocols[name]
				referenced_type = referenced_protocol.get('protocol_type')
				if referenced_type == 'sequence_runner':
					findings.append(Finding(
						path=f"{path}.mini_protocols[{idx}]",
						lineno=None,
						severity=Severity.ERROR,
						message=f"sequence_runner '{name}' referenced in mini_protocols list; sequence runners may reference only mini_protocol leaves, never another sequence_runner",
						tag="runner_of_runner",
					))

		# V1: entry_step must match the first listed mini-protocol's entry_step
		if mp_list and isinstance(mp_list[0], str) and self.db:
			first_mini_name = mp_list[0]
			first_mini = self.db.protocols.get(first_mini_name)
			if first_mini:
				first_mini_entry = first_mini.get('entry_step')
				runner_entry = protocol.get('entry_step')
				if runner_entry != first_mini_entry:
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"sequence_runner entry_step '{runner_entry}' does not match first mini-protocol '{first_mini_name}' entry_step '{first_mini_entry}'",
						tag="entry_step_mismatch",
					))

		return findings

	def _validate_protocol_type(self, protocol: dict, path: str) -> list:
		"""Validate protocol_type per PRIMARY_SPEC.md."""
		findings = []
		ptype = protocol.get('protocol_type')
		if ptype not in PROTOCOL_TYPES:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"protocol_type '{ptype}' not in {PROTOCOL_TYPES}",
			))
		return findings

	def _validate_learning(self, protocol: dict, path: str) -> list:
		"""Validate learning block per PRIMARY_SPEC.md."""
		findings = []
		ptype = protocol.get('protocol_type')
		learning = protocol.get('learning')

		if ptype in ('mini_protocol', 'protocol', 'sequence_runner'):
			if not isinstance(learning, dict):
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message="learning block is required and must be a mapping",
				))
				return findings

			# Select prefix requirements based on protocol type
			if ptype == 'sequence_runner':
				prefixes = LEARNING_SEQUENCE_RUNNER_PREFIXES
			else:
				prefixes = LEARNING_MINI_PROTOCOL_PREFIXES

			for field, required_prefix in prefixes.items():
				if field not in learning:
					findings.append(Finding(
						path=f"{path}.learning",
						lineno=None,
						severity=Severity.ERROR,
						message=f"missing required key '{field}'",
					))
				else:
					value = learning[field]
					if not isinstance(value, str):
						findings.append(Finding(
							path=f"{path}.learning.{field}",
							lineno=None,
							severity=Severity.ERROR,
							message=f"'{field}' must be a string",
						))
					elif not value.startswith(required_prefix):
						findings.append(Finding(
							path=f"{path}.learning.{field}",
							lineno=None,
							severity=Severity.ERROR,
							message=f"'{field}' must start with: {required_prefix}",
						))

		return findings

	def _validate_steps(self, protocol: dict, path: str) -> list:
		"""Validate steps per PRIMARY_SPEC.md."""
		findings = []
		steps = protocol.get('steps')

		if not isinstance(steps, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="steps must be a list",
			))
			return findings

		if not steps:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="steps list cannot be empty",
			))
			return findings

		step_names = set()
		terminal_count = 0

		for idx, step in enumerate(steps):
			step_path = f"{path}.steps[{idx}]"
			if not isinstance(step, dict):
				findings.append(Finding(
					path=step_path,
					lineno=None,
					severity=Severity.ERROR,
					message="step entry must be a mapping",
				))
				continue

			required = ['step_name', 'prompt', 'sequence', 'step_validator', 'outcome', 'next_step']
			for key in required:
				if key not in step:
					findings.append(Finding(
						path=step_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"missing required key '{key}'",
					))

			step_name = step.get('step_name')
			if step_name:
				if step_name in step_names:
					findings.append(Finding(
						path=step_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"duplicate step name '{step_name}'",
					))
				else:
					step_names.add(step_name)

			findings.extend(self._validate_sequence(step, step_path))

			# Validate step_validator field shape
			step_validator = step.get('step_validator')
			if isinstance(step_validator, dict):
				findings.extend(self._validate_validator_shape(
					step_validator, f"{step_path}.step_validator", 'step'
				))

			outcome = step.get('outcome')
			if isinstance(outcome, dict):
				if outcome.get('on_success') != 'complete':
					findings.append(Finding(
						path=f"{step_path}.outcome.on_success",
						lineno=None,
						severity=Severity.ERROR,
						message="must be 'complete'",
					))
				if outcome.get('on_failure') != 'retry':
					findings.append(Finding(
						path=f"{step_path}.outcome.on_failure",
						lineno=None,
						severity=Severity.ERROR,
						message="must be 'retry'",
					))
				if 'advance' in outcome:
					findings.append(Finding(
						path=f"{step_path}.outcome",
						lineno=None,
						severity=Severity.ERROR,
						message="'advance' key is not allowed",
					))

			if step.get('next_step') is None:
				terminal_count += 1

		entry_step = protocol.get('entry_step')
		if entry_step and entry_step not in step_names:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"entry_step '{entry_step}' does not name any step",
			))

		if terminal_count != 1:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"must have exactly one terminal step, found {terminal_count}",
			))

		return findings

	def _validate_sequence(self, step: dict, step_path: str) -> list:
		"""Validate sequence (list of interactions) with Tier 1 cross-file checks."""
		findings = []
		sequence = step.get('sequence')

		if not isinstance(sequence, list):
			findings.append(Finding(
				path=step_path,
				lineno=None,
				severity=Severity.ERROR,
				message="sequence must be a list",
			))
			return findings

		for idx, interaction in enumerate(sequence):
			interaction_path = f"{step_path}.sequence[{idx}]"
			if not isinstance(interaction, dict):
				findings.append(Finding(
					path=interaction_path,
					lineno=None,
					severity=Severity.ERROR,
					message="interaction entry must be a mapping",
				))
				continue

			required = ['target', 'gesture', 'validator', 'response']
			for key in required:
				if key not in interaction:
					findings.append(Finding(
						path=interaction_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"missing required key '{key}'",
					))

			gesture = interaction.get('gesture')
			if gesture and gesture not in VALID_GESTURES:
				findings.append(Finding(
					path=f"{interaction_path}.gesture",
					lineno=None,
					severity=Severity.ERROR,
					message=f"gesture '{gesture}' not in {VALID_GESTURES}",
				))

			# T1_TARGET: interaction target must resolve to an object or subpart.
			target = interaction.get('target')
			if target and self.db:
				resolved = self.db.resolve_target(target)
				if not resolved:
					# Unresolved target is always ERROR; no object-name special-cases.
					severity = Severity.ERROR
					findings.append(Finding(
						path=f"{interaction_path}.target",
						lineno=None,
						severity=severity,
						message=f"target '{target}' does not resolve",
						tag="T1_TARGET",
					))

			# Validator preset field-shape check
			validator = interaction.get('validator')
			if isinstance(validator, dict):
				findings.extend(self._validate_validator_shape(
					validator, f"{interaction_path}.validator", 'interaction'
				))

			# Validator preset check, plus T1_TARGET_WITH_VALUE payload check.
			validator = interaction.get('validator')
			if isinstance(validator, dict):
				preset = validator.get('preset')
				if preset and preset not in INTERACTION_VALIDATOR_PRESETS:
					findings.append(Finding(
						path=f"{interaction_path}.validator",
						lineno=None,
						severity=Severity.ERROR,
						message=f"preset '{preset}' not recognized",
					))
				elif preset == 'target_with_value' and self.db and target:
					value_payload = validator.get('value', {})
					if isinstance(value_payload, dict):
						for value_key in value_payload.keys():
							field = self.db.resolve_state_field(target, value_key)
							if not field:
								findings.append(Finding(
									path=f"{interaction_path}.validator.value",
									lineno=None,
									severity=Severity.ERROR,
									message=f"value key '{value_key}' is not a declared state_field on target '{target}'",
									tag="T1_TARGET_WITH_VALUE",
								))

			# scene_operations schema + Tier 1 state mutation checks.
			response = interaction.get('response')
			if isinstance(response, dict):
				scene_ops = response.get('scene_operations', [])
				if not isinstance(scene_ops, list):
					findings.append(Finding(
						path=f"{interaction_path}.response",
						lineno=None,
						severity=Severity.ERROR,
						message="scene_operations must be a list",
					))
				else:
					for op_idx, op in enumerate(scene_ops):
						op_path = f"{interaction_path}.response.scene_operations[{op_idx}]"
						if isinstance(op, dict):
							op_type = op.get('type')
							if op_type and op_type not in VALID_SCENE_OPERATIONS:
								findings.append(Finding(
									path=op_path,
									lineno=None,
									severity=Severity.ERROR,
									message=f"type '{op_type}' not in {VALID_SCENE_OPERATIONS}",
								))

							# Validate scene_operation field shape
							findings.extend(self._validate_scene_operation_shape(op, op_path))

							# ObjectStateChange mutates declared object state.
							# An op may carry its own `target` (the object actually
							# mutated), distinct from the interaction's `target`
							# (where the student clicked). Resolve against the op
							# target when present; fall back to interaction target.
							if op_type == 'ObjectStateChange' and self.db:
								op_target = op.get('target') or target
								# op_target may be a placement_name (M7 identity model),
								# not only a declared object_name; resolve_target_prefix
								# accepts both and returns the underlying object data.
								obj_data = self.db.resolve_target_prefix(op_target) if op_target else None
								if obj_data:
									state_dict = op.get('state', {})
									if isinstance(state_dict, dict):
										for field_name, field_value in state_dict.items():
											field = self.db.resolve_state_field(op_target, field_name)
											if not field:
												findings.append(Finding(
													path=f"{op_path}.state",
													lineno=None,
													severity=Severity.ERROR,
													message=f"state field '{field_name}' not found on object '{op_target}'",
													tag="T1_STATE_FIELD",
												))
												continue
											# T1_ENUM: enum field value must be in declared allowed list.
											if field.get('type') == 'enum':
												allowed = field.get('allowed', [])
												if field_value not in allowed:
													findings.append(Finding(
														path=f"{op_path}.state",
														lineno=None,
														severity=Severity.ERROR,
														message=f"state field '{field_name}' value '{field_value}' not in allowed {allowed}",
														tag="T1_ENUM",
													))
											# Numeric min/max/step constraint check
											if field.get('type') in ('int', 'float') and field_value is not None:
												findings.extend(self._validate_numeric_constraints(
													field, field_name, field_value, op_target, op_path
												))
											# Subpart-target consistency check
											if field.get('applies_to') == 'subpart':
												findings.extend(self._validate_subpart_target(
													op_target, op_path, field_name
												))
											# T1_MATERIAL_REF: material_name / held_material_name must exist in protocol materials.
											# 'empty' and 'mixed' are sentinel values per OBJECT_VOCABULARY.md
											# (empty container, generic blended material) and do not need
											# materials.yaml entries.
											if field_name in ('material_name', 'held_material_name') and field_value not in ('empty', 'mixed'):
												protocol_name = self._extract_protocol_name(op_path)
												if protocol_name and field_value is not None:
													material = self.db.resolve_material(protocol_name, field_value)
													if not material:
														findings.append(Finding(
															path=f"{op_path}.state",
															lineno=None,
															severity=Severity.ERROR,
															message=f"state field '{field_name}' value '{field_value}' does not resolve to a known material entry",
															tag="T1_MATERIAL_REF",
														))

		return findings

	def _validate_validator_shape(self, validator: dict, path: str, scope: str) -> list:
		"""
		Validate validator preset field shape per VALIDATOR_PRESET_SCHEMA.
		scope: 'interaction' or 'step'
		"""
		findings = []
		preset = validator.get('preset')

		if not preset:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="missing required field 'preset'",
			))
			return findings

		if preset not in VALIDATOR_PRESET_SCHEMA:
			# Unrecognized preset is caught elsewhere; skip field-shape check
			return findings

		schema = VALIDATOR_PRESET_SCHEMA[preset]

		# Check that the preset scope matches the context
		if schema['scope'] != scope:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"preset '{preset}' is for '{schema['scope']}' scope, not '{scope}' scope",
			))

		# Check required fields are present
		for required_field in schema['required']:
			if required_field not in validator:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"preset '{preset}' missing required field '{required_field}'",
				))

		# Check for unknown fields
		known_fields = schema['required'] | schema['optional']
		for field in validator.keys():
			if field not in known_fields:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"preset '{preset}' does not allow unknown field '{field}'",
				))

		return findings

	def _validate_scene_operation_shape(self, op: dict, path: str) -> list:
		"""Validate scene_operation field shape per SCENE_OPERATION_SCHEMA."""
		findings = []
		op_type = op.get('type')

		if not op_type:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="missing required field 'type'",
			))
			return findings

		if op_type not in SCENE_OPERATION_SCHEMA:
			# Unrecognized type is caught elsewhere; skip field-shape check
			return findings

		schema = SCENE_OPERATION_SCHEMA[op_type]

		# Check required fields are present
		for required_field in schema['required']:
			if required_field not in op:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"'{op_type}' missing required field '{required_field}'",
				))

		# Check for unknown fields
		known_fields = schema['required'] | schema['optional']
		for field in op.keys():
			if field not in known_fields:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"'{op_type}' does not allow unknown field '{field}'",
				))

		return findings

	def _validate_numeric_constraints(self, field: dict, field_name: str, field_value, op_target: str, op_path: str) -> list:
		"""
		V3 gate: Check numeric field (int or float) value against declared min/max/step constraints.
		Emits ERROR with code: state_value_out_of_range.
		"""
		findings = []
		field_type = field.get('type')
		if field_type not in ('int', 'float'):
			return findings

		# Extract constraints
		min_val = field.get('min')
		max_val = field.get('max')
		step_val = field.get('step')
		unit = field.get('unit', '')

		# Check min constraint
		if min_val is not None and field_value < min_val:
			unit_str = f" {unit}" if unit else ""
			findings.append(Finding(
				path=op_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"state field '{field_name}' on '{op_target}' value {field_value}{unit_str} below declared minimum {min_val}{unit_str}",
				tag="state_value_out_of_range",
			))

		# Check max constraint
		if max_val is not None and field_value > max_val:
			unit_str = f" {unit}" if unit else ""
			findings.append(Finding(
				path=op_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"state field '{field_name}' on '{op_target}' value {field_value}{unit_str} exceeds declared maximum {max_val}{unit_str}",
				tag="state_value_out_of_range",
			))

		# Check step constraint (value must be min + k*step for integer k)
		if step_val is not None and min_val is not None:
			offset = field_value - min_val
			remainder = offset % step_val
			# Use small epsilon for float comparison
			if abs(remainder) > 1e-9 and abs(remainder - step_val) > 1e-9:
				unit_str = f" {unit}" if unit else ""
				findings.append(Finding(
					path=op_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"state field '{field_name}' on '{op_target}' value {field_value}{unit_str} does not align to step {step_val}{unit_str} from minimum {min_val}{unit_str}",
					tag="state_value_out_of_range",
				))

		return findings

	def _validate_subpart_target(self, op_target: str, op_path: str, field_name: str) -> list:
		"""
		V5 gate: Check that if a field is declared applies_to: subpart,
		the ObjectStateChange target must use dotted form (object.subpart),
		not bare object name.
		Emits ERROR with code: subpart_target_required.
		"""
		findings = []

		# If target contains a dot, it is already in subpart form
		if '.' in op_target:
			return findings

		# Target is bare object name, but field requires subpart form
		findings.append(Finding(
			path=op_path,
			lineno=None,
			severity=Severity.ERROR,
			message=f"state field '{field_name}' is declared applies_to: subpart but ObjectStateChange target '{op_target}' is bare object (should be 'object.subpart' form)",
			tag="subpart_target_required",
		))

		return findings
