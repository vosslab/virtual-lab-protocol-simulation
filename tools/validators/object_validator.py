"""ObjectValidator: validates object YAML per OBJECT_YAML_FORMAT.md."""

from tools.validators.constants import (
	OBJECT_KINDS,
	OBJECT_CAPABILITIES,
	OBJECT_REQUIRED_KEYS,
	OBJECT_ALL_KEYS,
	STATE_FIELD_TYPES,
	STRUCTURE_SUBPART_KINDS,
	STRUCTURE_LAYOUT_TYPES,
	SUBPART_GROUP_KINDS,
	CHANNEL_ADDRESSABLE_KINDS,
)
from tools.validators.findings import Finding, Severity


class ObjectValidator:
	"""Validates object YAML files per OBJECT_YAML_FORMAT.md."""

	def validate(self, obj: dict, path: str) -> list:
		"""
		Validate an object definition.
		Returns list of Finding objects (empty if valid).
		"""
		findings = []

		# Closure: any top-level key not in the documented whitelist is unknown.
		# This subsumes the retired-key check; no allow-list maintained.
		for key in obj.keys():
			if key not in OBJECT_ALL_KEYS:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"[CLOSURE] unknown top-level key '{key}' (allowed: {sorted(OBJECT_ALL_KEYS)})",
				))

		# Check required keys
		for key in OBJECT_REQUIRED_KEYS:
			if key not in obj:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"missing required key '{key}'",
				))
				return findings  # Can't continue validation without required keys

		# Identity validation
		findings.extend(self._validate_identity(obj, path))

		# State fields validation
		findings.extend(self._validate_state_fields(obj, path))

		# Capabilities validation
		findings.extend(self._validate_capabilities(obj, path))

		# Structure validation (if present)
		if 'structure' in obj:
			findings.extend(self._validate_structure(obj, path))

		# Channel addressing validation (if present)
		if 'channel_addressing' in obj:
			findings.extend(self._validate_channel_addressing(obj, path))

		return findings

	def _validate_identity(self, obj: dict, path: str) -> list:
		"""Validate object_name, kind, label per OBJECT_YAML_FORMAT.md."""
		findings = []

		object_name = obj.get('object_name')
		if object_name and not self._is_snake_case(object_name):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"object_name '{object_name}' is not snake_case",
			))

		kind = obj.get('kind')
		if kind and kind not in OBJECT_KINDS:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"kind '{kind}' not in allowed set {OBJECT_KINDS}",
			))

		label = obj.get('label')
		if not label or not isinstance(label, str) or not label.strip():
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="label is required and must be non-empty string",
			))

		return findings

	def _validate_state_fields(self, obj: dict, path: str) -> list:
		"""Validate state_fields per OBJECT_YAML_FORMAT.md."""
		findings = []

		state_fields = obj.get('state_fields')
		if not isinstance(state_fields, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="state_fields must be a list",
			))
			return findings

		seen_names = set()
		for idx, field in enumerate(state_fields):
			field_path = f"{path}.state_fields[{idx}]"

			if not isinstance(field, dict):
				findings.append(Finding(
					path=field_path,
					lineno=None,
					severity=Severity.ERROR,
					message="state_field entry must be a mapping",
				))
				continue

			# Check required keys
			for required_key in ('field_name', 'type', 'default'):
				if required_key not in field:
					findings.append(Finding(
						path=field_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"missing required key '{required_key}'",
					))

			field_name = field.get('field_name')
			if field_name:
				if field_name in seen_names:
					findings.append(Finding(
						path=field_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"duplicate field name '{field_name}'",
					))
				else:
					seen_names.add(field_name)

			field_type = field.get('type')
			if field_type and field_type not in STATE_FIELD_TYPES:
				findings.append(Finding(
					path=field_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"type '{field_type}' not in {STATE_FIELD_TYPES}",
				))

			if field_type == 'enum' and 'allowed' not in field:
				findings.append(Finding(
					path=field_path,
					lineno=None,
					severity=Severity.ERROR,
					message="enum field missing required 'allowed' list",
				))

		return findings

	def _validate_capabilities(self, obj: dict, path: str) -> list:
		"""Validate capabilities per OBJECT_VOCABULARY.md."""
		findings = []

		capabilities = obj.get('capabilities')
		if not isinstance(capabilities, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="capabilities must be a list",
			))
			return findings

		has_decoration = 'decoration_only' in capabilities
		other_caps = set(capabilities) - {'decoration_only'}

		if has_decoration and other_caps:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="decoration_only is mutually exclusive with other capabilities",
			))

		for cap in capabilities:
			if cap not in OBJECT_CAPABILITIES:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"unknown capability '{cap}'",
				))

		return findings

	def _validate_structure(self, obj: dict, path: str) -> list:
		"""Validate structure block if present."""
		findings = []

		structure = obj.get('structure', {})
		if not isinstance(structure, dict):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="structure must be a mapping",
			))
			return findings

		# Check required keys for structure
		subpart_kind = structure.get('subpart_kind')
		if not subpart_kind:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="structure requires 'subpart_kind'",
			))
		elif subpart_kind not in STRUCTURE_SUBPART_KINDS:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"subpart_kind '{subpart_kind}' not in {STRUCTURE_SUBPART_KINDS}",
			))

		layout = structure.get('layout')
		if not layout:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="structure requires 'layout'",
			))
		elif layout not in STRUCTURE_LAYOUT_TYPES:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"layout '{layout}' not in {STRUCTURE_LAYOUT_TYPES}",
			))

		if layout == 'grid':
			for key in ('rows', 'cols'):
				if key not in structure:
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"structure.layout=grid requires '{key}'",
					))

		if layout == 'list':
			if 'count' not in structure:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message="structure.layout=list requires 'count'",
				))

		if 'name_pattern' not in structure:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="structure requires 'name_pattern'",
			))

		# Validate subpart_groups if present per OBJECT_YAML_FORMAT.md
		if 'subpart_groups' in structure:
			findings.extend(self._validate_subpart_groups(structure, path))

		return findings

	def _validate_subpart_groups(self, structure: dict, path: str) -> list:
		"""Validate subpart_groups block if present per OBJECT_YAML_FORMAT.md."""
		findings = []

		subpart_groups = structure.get('subpart_groups')
		if not isinstance(subpart_groups, dict):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="structure.subpart_groups must be a mapping",
			))
			return findings

		# subpart_groups is a mapping where each key is a label (author-chosen)
		# and each value is a group-kind mapping with group_kind and members
		for group_label, group_data in subpart_groups.items():
			if not isinstance(group_data, dict):
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"subpart_groups[{group_label}] must be a mapping",
				))
				continue

			# Check group_kind
			group_kind = group_data.get('group_kind')
			if not group_kind:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"subpart_groups[{group_label}] requires 'group_kind'",
				))
			elif group_kind not in SUBPART_GROUP_KINDS:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"subpart_groups[{group_label}].group_kind '{group_kind}' not in {SUBPART_GROUP_KINDS}",
				))

			# Check members
			members = group_data.get('members')
			if not isinstance(members, list):
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"subpart_groups[{group_label}].members must be a list",
				))
				continue

			if not members:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"subpart_groups[{group_label}].members must be non-empty",
				))

			seen_member_names = set()
			for member in members:
				if not isinstance(member, dict):
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"subpart_groups[{group_label}].members entry must be a mapping",
					))
					continue

				# Check member name
				member_name = member.get('name')
				if not member_name:
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"subpart_groups[{group_label}].members entry requires 'name'",
					))
				else:
					if member_name in seen_member_names:
						findings.append(Finding(
							path=path,
							lineno=None,
							severity=Severity.ERROR,
							message=f"subpart_groups[{group_label}] duplicate member name '{member_name}'",
						))
					else:
						seen_member_names.add(member_name)

				# Check contains
				contains = member.get('contains')
				if not isinstance(contains, list):
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"subpart_groups[{group_label}].members.contains must be a list",
					))
				elif not contains:
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"subpart_groups[{group_label}].members.contains must be non-empty",
					))

		return findings

	def _validate_channel_addressing(self, obj: dict, path: str) -> list:
		"""Validate channel_addressing block if present per OBJECT_YAML_FORMAT.md."""
		findings = []

		channel_addressing = obj.get('channel_addressing')
		if not isinstance(channel_addressing, dict):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="channel_addressing must be a mapping",
			))
			return findings

		# Check channels
		channels = channel_addressing.get('channels')
		if channels is None:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="channel_addressing requires 'channels'",
			))
		elif not isinstance(channels, int) or channels <= 0:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"channel_addressing.channels must be a positive integer, got {channels}",
			))

		# Check addressable_subpart_kinds
		addressable_subpart_kinds = channel_addressing.get('addressable_subpart_kinds')
		if addressable_subpart_kinds is None:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="channel_addressing requires 'addressable_subpart_kinds'",
			))
		elif not isinstance(addressable_subpart_kinds, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="channel_addressing.addressable_subpart_kinds must be a list",
			))
		else:
			if not addressable_subpart_kinds:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message="channel_addressing.addressable_subpart_kinds must be non-empty",
				))

			for kind in addressable_subpart_kinds:
				if kind not in CHANNEL_ADDRESSABLE_KINDS:
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"channel_addressing.addressable_subpart_kinds contains '{kind}' not in {CHANNEL_ADDRESSABLE_KINDS}",
					))

		return findings

	@staticmethod
	def _is_snake_case(s: str) -> bool:
		"""Check if string is snake_case."""
		if not s:
			return False
		return all(c.isalnum() or c == '_' for c in s) and not s[0].isdigit()
