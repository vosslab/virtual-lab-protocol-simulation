"""
MaterialValidator: closure check for content/protocols/<name>/materials.yaml.

Spec: docs/specs/MATERIAL_CONVENTION.md "Materials YAML schema".

Schema:
- Top-level key `materials:` -> mapping (snake_case material_name -> entry).
- Each entry is a closed dict with exactly two required keys:
  - `label`: string
  - `display_color`: nested mapping with 'light' and 'dark' hex strings
- Unknown top-level keys and unknown per-entry keys are rejected.

Cross-protocol material consistency validation:
- Scalar display_color form is rejected (tag: PALETTE_SCALAR).
- Nested display_color must have both 'light' and 'dark' keys.
- Each color value must be a valid hex string (#rgb or #rrggbb).
- Unknown keys in display_color are rejected.
- Cross-protocol consistency is checked via validate_cross_protocol().

Reference resolution (T1_MATERIAL_REF) lives in ProtocolValidator; this
validator only enforces the materials.yaml schema itself.
"""

import re

from validation.yaml.findings import Finding, Severity
from validation.yaml.constants import MATERIAL_REQUIRED_KEYS, MATERIAL_ALL_KEYS


SNAKE_CASE_RE = re.compile(r'^[a-z][a-z0-9_]*$')
HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{3,8}$')


class MaterialValidator:
	"""Validates one materials.yaml file against the closed schema."""

	def validate(self, data, path: str) -> list:
		"""Return list of Finding for the supplied materials.yaml data."""
		findings = []

		if not isinstance(data, dict):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="materials.yaml top level must be a mapping",
				tag="CLOSURE",
			))
			return findings

		# Closure on top-level keys: only `materials:` allowed.
		for key in data.keys():
			if key != 'materials':
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"unknown top-level key '{key}'; only 'materials:' is allowed",
					tag="CLOSURE",
				))

		materials = data.get('materials')
		if materials is None:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="materials.yaml missing required top-level 'materials:' key",
				tag="CLOSURE",
			))
			return findings

		if not isinstance(materials, dict):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="'materials:' must be a mapping of material_name -> entry",
				tag="CLOSURE",
			))
			return findings

		for material_name, entry in materials.items():
			findings.extend(self._validate_entry(material_name, entry, path))

		return findings

	def _validate_entry(self, material_name, entry, path: str) -> list:
		"""Validate one material entry (key + body)."""
		findings = []
		entry_path = f"{path}::materials.{material_name}"

		# Material name must be snake_case.
		if not isinstance(material_name, str) or not SNAKE_CASE_RE.match(material_name):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material name '{material_name}' must be snake_case (lowercase, digits, underscores)",
				tag="CLOSURE",
			))

		if not isinstance(entry, dict):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' must be a mapping with 'label' and 'display_color'",
				tag="CLOSURE",
			))
			return findings

		# Required keys present.
		missing = MATERIAL_REQUIRED_KEYS - set(entry.keys())
		for key in sorted(missing):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' missing required key '{key}'",
				tag="CLOSURE",
			))

		# Unknown keys.
		for key in entry.keys():
			if key not in MATERIAL_ALL_KEYS:
				findings.append(Finding(
					path=entry_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"material '{material_name}' has unknown key '{key}'; closed schema rejects extras",
					tag="CLOSURE",
				))

		# Type checks.
		label = entry.get('label')
		if label is not None and not isinstance(label, str):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' field 'label' must be a string",
				tag="CLOSURE",
			))

		color = entry.get('display_color')
		if color is not None:
			findings.extend(self._validate_display_color(material_name, color, entry_path))

		return findings

	def _validate_display_color(self, material_name, color, entry_path: str) -> list:
		"""Validate display_color field (nested light/dark mapping)."""
		findings = []

		# Reject scalar display_color form (deprecated).
		if isinstance(color, str):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' field 'display_color' must be a mapping with 'light' and 'dark' keys, not a scalar string",
				tag="PALETTE_SCALAR",
			))
			return findings

		# Must be a mapping for nested form.
		if not isinstance(color, dict):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' field 'display_color' must be a mapping (dict), got {type(color).__name__}",
				tag="PALETTE_MALFORMED",
			))
			return findings

		# Require both 'light' and 'dark' keys.
		required_keys = {'light', 'dark'}
		missing_keys = required_keys - set(color.keys())
		for key in sorted(missing_keys):
			findings.append(Finding(
				path=entry_path,
				lineno=None,
				severity=Severity.ERROR,
				message=f"material '{material_name}' field 'display_color' missing required key '{key}'",
				tag="PALETTE_MALFORMED",
			))

		# Reject unknown keys (closure).
		for key in color.keys():
			if key not in required_keys:
				findings.append(Finding(
					path=entry_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"material '{material_name}' field 'display_color' has unknown key '{key}'; only 'light' and 'dark' are allowed",
					tag="PALETTE_MALFORMED",
				))

		# Validate each hex value (light and dark).
		for key in ['light', 'dark']:
			if key in color:
				value = color[key]
				if not isinstance(value, str) or not HEX_COLOR_RE.match(value):
					findings.append(Finding(
						path=entry_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"material '{material_name}' field 'display_color.{key}' must be a hex string like '#b8e5ff', got '{value}'",
						tag="PALETTE_MALFORMED",
					))

		return findings

	def validate_cross_protocol(self, material_rows: list) -> list:
		"""
		Validate cross-protocol material consistency.

		Args:
			material_rows: list of (path, yaml_data) tuples from all materials.yaml files.

		Returns:
			List of Finding objects for divergences.

		Cross-protocol rule: For any material_name appearing in 2+ files,
		the label, display_color.light, and display_color.dark must be identical
		across all files. Divergences are reported with tag PALETTE_DIVERGENT.
		"""
		findings = []

		# Index: material_name -> set of (path, label, light, dark) tuples
		material_index = {}

		for path, yaml_data in material_rows:
			if not isinstance(yaml_data, dict):
				continue

			materials = yaml_data.get('materials')
			if not isinstance(materials, dict):
				continue

			for material_name, entry in materials.items():
				if not isinstance(entry, dict):
					continue

				label = entry.get('label', '')
				color_info = entry.get('display_color')

				# Extract light and dark (or None if missing/invalid).
				light = dark = None
				if isinstance(color_info, dict):
					light = color_info.get('light')
					dark = color_info.get('dark')

				# Skip entries with invalid color structure (will be caught by single-file validation).
				if light is None or dark is None:
					continue

				key = material_name
				if key not in material_index:
					material_index[key] = set()

				material_index[key].add((path, label, light, dark))

		# Check for divergences.
		for material_name, entries in material_index.items():
			if len(entries) < 2:
				# Only one occurrence or all invalid; no divergence to report.
				continue

			# Collect all variants to detect which fields diverge
			entry_list = sorted(list(entries))

			# Extract unique values for each field
			labels = set(e[1] for e in entry_list)
			lights = set(e[2] for e in entry_list)
			darks = set(e[3] for e in entry_list)

			# Determine which fields diverge
			divergent_fields = []
			if len(labels) > 1:
				divergent_fields.append('label')
			if len(lights) > 1:
				divergent_fields.append('light')
			if len(darks) > 1:
				divergent_fields.append('dark')

			if divergent_fields:
				# Divergence found.
				paths_involved = sorted(set(e[0] for e in entry_list))
				field_details = ', '.join(divergent_fields)
				message = f"material '{material_name}' diverges in {field_details} across protocols. "
				message += f"Found in: {', '.join(paths_involved)}"

				findings.append(Finding(
					path='<cross-protocol>',
					lineno=None,
					severity=Severity.ERROR,
					message=message,
					tag="PALETTE_DIVERGENT",
				))

		return findings
