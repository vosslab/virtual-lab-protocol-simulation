"""ProtocolValidator: validates protocol YAML per PRIMARY_SPEC.md with Tier 1 cross-file checks."""

from typing import Any, Dict, List, Optional

from validators.constants import (
	PROTOCOL_TYPES,
	PROTOCOL_REQUIRED_KEYS,
	RETIRED_PROTOCOL_KEYS,
	VALID_GESTURES,
	VALID_SCENE_OPERATIONS,
	INTERACTION_VALIDATOR_PRESETS,
	STEP_VALIDATOR_PRESETS,
	LEARNING_MINI_PROTOCOL_PREFIXES,
	LEARNING_SEQUENCE_RUNNER_PREFIXES,
)
from validators.findings import Finding, Severity
from validators.database import ContentDatabase


class ProtocolValidator:
	"""Validates protocol YAML files per PRIMARY_SPEC.md with Tier 1 cross-file checks."""

	def __init__(self, db: Optional[ContentDatabase] = None):
		"""Initialize with optional ContentDatabase for Tier 1 checks."""
		self.db = db

	def _extract_protocol_name(self, path: str) -> Optional[str]:
		"""
		Extract protocol name from a path like 'content/protocols/hood_flask_prep/protocol.yaml.steps[0]...'.
		Returns the protocol directory name or None.
		"""
		parts = path.split('/')
		if 'protocols' in parts:
			try:
				protocols_idx = parts.index('protocols')
				if protocols_idx + 1 < len(parts):
					return parts[protocols_idx + 1]
			except (ValueError, IndexError):
				pass
		return None

	def validate(self, protocol: Dict[str, Any], path: str) -> List[Finding]:
		"""Validate a protocol definition."""
		findings = []

		for retired in RETIRED_PROTOCOL_KEYS:
			if retired in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"retired key '{retired}' found",
				))

		for key in PROTOCOL_REQUIRED_KEYS:
			if key not in protocol:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"missing required key '{key}'",
				))

		if not findings:
			findings.extend(self._validate_protocol_type(protocol, path))
			findings.extend(self._validate_learning(protocol, path))
			findings.extend(self._validate_steps(protocol, path))

		return findings

	def _validate_protocol_type(self, protocol: Dict[str, Any], path: str) -> List[Finding]:
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

	def _validate_learning(self, protocol: Dict[str, Any], path: str) -> List[Finding]:
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

	def _validate_steps(self, protocol: Dict[str, Any], path: str) -> List[Finding]:
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

			required = ['name', 'prompt', 'sequence', 'step_validator', 'outcome', 'next_step']
			for key in required:
				if key not in step:
					findings.append(Finding(
						path=step_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"missing required key '{key}'",
					))

			step_name = step.get('name')
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

		ptype = protocol.get('protocol_type')
		if ptype == 'mini_protocol':
			num_steps = len(steps)
			if num_steps < 6 or num_steps > 10:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"mini_protocol must have 6-10 steps, found {num_steps}",
				))

		return findings

	def _validate_sequence(self, step: Dict[str, Any], step_path: str) -> List[Finding]:
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

			# TIER 1: Target resolution (T1.1)
			target = interaction.get('target')
			if target and self.db:
				resolved = self.db.resolve_target(target)
				if not resolved:
					findings.append(Finding(
						path=f"{interaction_path}.target",
						lineno=None,
						severity=Severity.ERROR,
						message=f"target '{target}' does not resolve",
						tag="T1_TARGET",
					))

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
				# T1.5: target_with_value payload check
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

							# TIER 1: State mutations in ObjectStateChange
							if op_type == 'ObjectStateChange' and self.db and target:
								obj_data = self.db.resolve_object(target)
								if obj_data:
									state_dict = op.get('state', {})
									if isinstance(state_dict, dict):
										for field_name, field_value in state_dict.items():
											# T1.2: State field resolution
											field = self.db.resolve_state_field(target, field_name)
											if not field:
												findings.append(Finding(
													path=f"{op_path}.state",
													lineno=None,
													severity=Severity.ERROR,
													message=f"state field '{field_name}' not found on object '{target}'",
													tag="T1_STATE_FIELD",
												))
											elif field:
												# T1.3: Enum value check
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
												# T1.4: Contents-name cross-ref
												if field_name in ('contents_name', 'held_contents_name'):
													protocol_name = self._extract_protocol_name(op_path)
													if protocol_name and field_value is not None:
														contents = self.db.resolve_contents(protocol_name, field_value)
														if not contents:
															findings.append(Finding(
																path=f"{op_path}.state",
																lineno=None,
																severity=Severity.ERROR,
																message=f"state field '{field_name}' value '{field_value}' does not resolve to a known contents entry",
																tag="T1_CONTENTS_REF",
															))

		return findings
