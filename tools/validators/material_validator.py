"""
MaterialValidator: closure check for content/protocols/<name>/materials.yaml.

Spec: docs/specs/MATERIAL_CONVENTION.md "Materials YAML schema".

Schema:
- Top-level key `materials:` -> mapping (snake_case material_name -> entry).
- Each entry is a closed dict with exactly two required keys:
  - `label`: string
  - `display_color`: hex string starting with '#'
- Unknown top-level keys and unknown per-entry keys are rejected.

Reference resolution (T1_MATERIAL_REF) lives in ProtocolValidator; this
validator only enforces the materials.yaml schema itself.
"""

import re

from validators.findings import Finding, Severity
from validators.constants import MATERIAL_REQUIRED_KEYS, MATERIAL_ALL_KEYS


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
			if not isinstance(color, str) or not HEX_COLOR_RE.match(color):
				findings.append(Finding(
					path=entry_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"material '{material_name}' field 'display_color' must be a hex string like '#b8e5ff', got '{color}'",
					tag="CLOSURE",
				))

		return findings
