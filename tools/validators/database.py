"""ContentDatabase: relational registry of all content across content tree."""

from pathlib import Path
import re

from validators.yaml_io import load_yaml
from validators.findings import Finding, Severity


class ContentDatabase:
	"""Holds all loaded content as a relational registry."""

	def __init__(self):
		"""Initialize empty registry."""
		self.objects: dict = {}
		self.base_scenes: dict = {}
		self.protocols: dict = {}
		self.materials_by_protocol: dict = {}
		self.findings: list[Finding] = []

	def load_from_tree(self, root: Path) -> None:
		"""
		Walk content tree and load all YAML files into registry.
		Populates objects, base_scenes, protocols, materials_by_protocol.
		Errors are collected in self.findings.
		"""
		root_path = Path(root)

		# Load objects
		objects_dir = root_path / 'content' / 'objects'
		if objects_dir.exists():
			for obj_file in sorted(objects_dir.glob('**/*.yaml')):
				try:
					obj_data = load_yaml(obj_file)
					obj_name = obj_data.get('object_name')
					if obj_name:
						self.objects[obj_name] = obj_data
				except RuntimeError as e:
					rel_path = str(obj_file.relative_to(root_path))
					self.findings.append(Finding(
						path=rel_path,
						lineno=None,
						severity=Severity.ERROR,
						message=str(e),
					))

		# Load base scenes
		scenes_dir = root_path / 'content' / 'scenes'
		if scenes_dir.exists():
			for scene_file in sorted(scenes_dir.glob('*.yaml')):
				try:
					scene_data = load_yaml(scene_file)
					scene_name = scene_data.get('scene_name')
					if scene_name:
						self.base_scenes[scene_name] = scene_data
				except RuntimeError as e:
					rel_path = str(scene_file.relative_to(root_path))
					self.findings.append(Finding(
						path=rel_path,
						lineno=None,
						severity=Severity.ERROR,
						message=str(e),
					))

		# Load protocols and their contents
		protocols_dir = root_path / 'content' / 'protocols'
		if protocols_dir.exists():
			for protocol_dir in sorted(protocols_dir.iterdir()):
				if not protocol_dir.is_dir():
					continue

				# Load protocol.yaml
				protocol_file = protocol_dir / 'protocol.yaml'
				if protocol_file.exists():
					try:
						protocol_data = load_yaml(protocol_file)
						protocol_name = protocol_data.get('protocol_name')
						if protocol_name:
							self.protocols[protocol_name] = protocol_data
					except RuntimeError as e:
						rel_path = str(protocol_file.relative_to(root_path))
						self.findings.append(Finding(
							path=rel_path,
							lineno=None,
							severity=Severity.ERROR,
							message=str(e),
						))

				# Load materials.yaml
				materials_file = protocol_dir / 'materials.yaml'
				if materials_file.exists():
					try:
						materials_data = load_yaml(materials_file)
						protocol_name = protocol_dir.name
						materials_dict = materials_data.get('materials', {})
						if isinstance(materials_dict, dict):
							self.materials_by_protocol[protocol_name] = materials_dict
					except RuntimeError as e:
						rel_path = str(materials_file.relative_to(root_path))
						self.findings.append(Finding(
							path=rel_path,
							lineno=None,
							severity=Severity.ERROR,
							message=str(e),
						))

	# ============================================
	# LOOKUP METHODS
	# ============================================

	def resolve_object(self, name: str) -> dict | None:
		"""Resolve object by name. Returns dict or None."""
		return self.objects.get(name)

	def resolve_target(self, target: str) -> tuple | None:
		"""
		Resolve a target (bare or dotted form).
		Returns (object_data, subpart_name) or None.
		Examples:
		  - "well_plate" -> (well_plate_object, None)
		  - "well_plate.A1" -> (well_plate_object, "A1")
		"""
		if '.' not in target:
			# Bare target
			obj = self.resolve_object(target)
			return (obj, None) if obj else None

		# Dotted form: object.subpart
		parts = target.split('.', 1)
		obj_name = parts[0]
		subpart_name = parts[1]

		obj = self.resolve_object(obj_name)
		if not obj:
			return None

		# Check if subpart_name matches the object's structure
		if self.subpart_matches(obj, subpart_name):
			return (obj, subpart_name)

		return None

	def subpart_matches(self, obj: dict, subpart_name: str) -> bool:
		"""Check if subpart_name is valid for this object."""
		structure = obj.get('structure', {})
		if not structure:
			return False

		# Check if subpart_name matches declared subparts or pattern
		subparts = structure.get('subparts', [])
		for sp in subparts:
			if isinstance(sp, dict) and sp.get('name') == subpart_name:
				return True

		# Check name_pattern regex; let re.error surface as a real failure
		# (a malformed name_pattern is an object-spec bug, not a hidden case).
		name_pattern = structure.get('name_pattern')
		if name_pattern:
			regex = self._pattern_to_regex(name_pattern)
			return bool(regex.fullmatch(subpart_name))

		return False

	@staticmethod
	def _pattern_to_regex(pattern: str) -> re.Pattern:
		"""
		Convert OBJECT_YAML_FORMAT.md name_pattern template to regex.
		Examples:
		  - "{row_letter}{col}" -> regex matching [A-Z][0-9]+
		  - "{index}" -> regex matching [0-9]+
		"""
		# Map template tokens to regex pieces
		token_map = {
			'row_letter': '[A-Z]',
			'col': '[0-9]+',
			'column': '[0-9]+',
			'col_letter': '[A-Z]',
			'index': '[0-9]+',
			'row': '[0-9]+',
		}

		regex_pattern = pattern
		for token, regex_piece in token_map.items():
			regex_pattern = regex_pattern.replace(f'{{{token}}}', regex_piece)

		# Escape any remaining {token} literals not covered by token_map so
		# they match as plain text rather than as regex syntax.
		unknown_tokens = re.findall(r'\{([^}]+)\}', regex_pattern)
		for token in unknown_tokens:
			regex_pattern = regex_pattern.replace(f'{{{token}}}', re.escape(f'{{{token}}}'))

		return re.compile(f'^{regex_pattern}$')

	def resolve_state_field(self, object_name: str, field_name: str) -> dict | None:
		"""
		Resolve state field declaration for an object.
		Returns field dict (with 'field_name', 'type', 'default', etc.) or None.
		"""
		obj = self.resolve_object(object_name)
		if not obj:
			return None

		state_fields = obj.get('state_fields', [])
		for field in state_fields:
			if isinstance(field, dict) and field.get('field_name') == field_name:
				return field

		return None

	def resolve_material(self, protocol_name: str, material_name: str) -> dict | None:
		"""Resolve material entry by protocol and material name."""
		protocol_materials = self.materials_by_protocol.get(protocol_name, {})
		return protocol_materials.get(material_name)
