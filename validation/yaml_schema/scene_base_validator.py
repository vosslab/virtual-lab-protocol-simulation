"""BaseSceneValidator: validates base scene YAML per SCENE_YAML_FORMAT.md."""

from validation.yaml_schema.constants import (
	BASE_SCENE_REQUIRED_KEYS,
	BASE_SCENE_ALL_KEYS,
	LABEL_PLACEMENT_VALUES,
)
from validation.yaml_schema.findings import Finding, Severity


class BaseSceneValidator:
	"""Validates base scene YAML files per SCENE_YAML_FORMAT.md."""

	def __init__(self):
		"""Initialize validator."""
		self.all_objects: set = set()

	def set_object_names(self, names: set) -> None:
		"""Set known object names for cross-reference validation."""
		self.all_objects = names

	def validate(self, scene: dict, path: str) -> list:
		"""Validate a base scene definition."""
		findings = []

		if 'extends' in scene:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="base scenes must not have 'extends' field",
			))

		for key in BASE_SCENE_REQUIRED_KEYS:
			if key not in scene:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"missing required key '{key}'",
				))

		# Closure: unknown top-level keys are flagged (subsumes retired-key check).
		for key in scene:
			if key not in BASE_SCENE_ALL_KEYS:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"[CLOSURE] unknown top-level key '{key}' (allowed: {sorted(BASE_SCENE_ALL_KEYS)})",
				))

		# Validate layout_rules.label_placement if the block and field are present.
		# layout_rules is optional; absent block validates cleanly (default resolved by engine).
		# Other layout_rules keys are intentionally not validated here: partial validation of
		# label_placement inside an otherwise opaque block is a documented choice.
		layout_rules = scene.get('layout_rules')
		if isinstance(layout_rules, dict) and 'label_placement' in layout_rules:
			lp_value = layout_rules['label_placement']
			if lp_value not in LABEL_PLACEMENT_VALUES:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=(
						f"layout_rules.label_placement '{lp_value}' is not valid "
						f"(allowed: {sorted(LABEL_PLACEMENT_VALUES)})"
					),
				))

		if not findings:
			zone_findings, zone_ids = self._validate_zones(scene, path)
			findings.extend(zone_findings)
			findings.extend(self._validate_placements(scene, path, zone_ids))

		return findings

	def _validate_zones(self, scene: dict, path: str) -> tuple:
		"""Validate zones per SCENE_YAML_FORMAT.md."""
		findings = []
		zones = scene.get('zones', [])

		if not isinstance(zones, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="zones must be a list",
			))
			return findings, set()

		zone_ids = set()
		for idx, zone in enumerate(zones):
			zone_path = f"{path}.zones[{idx}]"
			if not isinstance(zone, dict):
				findings.append(Finding(
					path=zone_path,
					lineno=None,
					severity=Severity.ERROR,
					message="zone entry must be a mapping",
				))
				continue

			if 'zone_name' not in zone:
				findings.append(Finding(
					path=zone_path,
					lineno=None,
					severity=Severity.ERROR,
					message="zone missing required 'zone_name'",
				))
			else:
				zone_name = zone['zone_name']
				if zone_name in zone_ids:
					findings.append(Finding(
						path=zone_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"duplicate zone_name '{zone_name}'",
					))
				else:
					zone_ids.add(zone_name)

		return findings, zone_ids

	def _validate_placements(self, scene: dict, path: str, zone_ids: set) -> list:
		"""Validate placements per SCENE_YAML_FORMAT.md."""
		findings = []
		placements = scene.get('placements', [])

		if not isinstance(placements, list):
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="placements must be a list",
			))
			return findings

		placement_names = set()
		for idx, placement in enumerate(placements):
			placement_path = f"{path}.placements[{idx}]"
			if not isinstance(placement, dict):
				findings.append(Finding(
					path=placement_path,
					lineno=None,
					severity=Severity.ERROR,
					message="placement entry must be a mapping",
				))
				continue

			if 'placement_name' not in placement:
				findings.append(Finding(
					path=placement_path,
					lineno=None,
					severity=Severity.ERROR,
					message="placement missing required 'placement_name'",
				))
			else:
				pname = placement['placement_name']
				if pname in placement_names:
					findings.append(Finding(
						path=placement_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"duplicate placement_name '{pname}'",
					))
				else:
					placement_names.add(pname)

			if 'object_name' not in placement:
				findings.append(Finding(
					path=placement_path,
					lineno=None,
					severity=Severity.ERROR,
					message="placement missing required 'object_name'",
				))
			elif self.all_objects and placement['object_name'] not in self.all_objects:
				findings.append(Finding(
					path=placement_path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"object_name '{placement['object_name']}' not found",
				))

			# Validate placement.layout.label_placement if the block and field are present.
			# layout block is optional; absent block validates cleanly (default resolved by engine).
			placement_layout = placement.get('layout')
			if isinstance(placement_layout, dict) and 'label_placement' in placement_layout:
				lp_value = placement_layout['label_placement']
				if lp_value not in LABEL_PLACEMENT_VALUES:
					findings.append(Finding(
						path=placement_path,
						lineno=None,
						severity=Severity.ERROR,
						message=(
							f"placement.layout.label_placement '{lp_value}' is not valid "
							f"(allowed: {sorted(LABEL_PLACEMENT_VALUES)})"
						),
					))

		return findings
