"""BaseSceneValidator: validates base scene YAML per SCENE_YAML_FORMAT.md."""

from typing import Any, Dict, List, Set, Tuple

from validators.constants import (
	BASE_SCENE_REQUIRED_KEYS,
	BASE_SCENE_OPTIONAL_KEYS,
	BASE_SCENE_ALL_KEYS,
	RETIRED_BASE_SCENE_KEYS,
)
from validators.findings import Finding, Severity


class BaseSceneValidator:
	"""Validates base scene YAML files per SCENE_YAML_FORMAT.md."""

	def __init__(self):
		"""Initialize validator."""
		self.all_objects: Set[str] = set()

	def set_object_names(self, names: Set[str]) -> None:
		"""Set known object names for cross-reference validation."""
		self.all_objects = names

	def validate(self, scene: Dict[str, Any], path: str) -> List[Finding]:
		"""Validate a base scene definition."""
		findings = []

		if 'extends' in scene:
			findings.append(Finding(
				path=path,
				lineno=None,
				severity=Severity.ERROR,
				message="base scenes must not have 'extends' field",
			))

		for retired in RETIRED_BASE_SCENE_KEYS:
			if retired in scene:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"retired key '{retired}' found",
				))

		for key in BASE_SCENE_REQUIRED_KEYS:
			if key not in scene:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"missing required key '{key}'",
				))

		for key in scene:
			if key not in BASE_SCENE_ALL_KEYS:
				findings.append(Finding(
					path=path,
					lineno=None,
					severity=Severity.ERROR,
					message=f"unknown top-level key '{key}'",
				))

		if not findings:
			zone_findings, zone_ids = self._validate_zones(scene, path)
			findings.extend(zone_findings)
			findings.extend(self._validate_placements(scene, path, zone_ids))

		return findings

	def _validate_zones(self, scene: Dict[str, Any], path: str) -> Tuple[List[Finding], Set[str]]:
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

			if 'id' not in zone:
				findings.append(Finding(
					path=zone_path,
					lineno=None,
					severity=Severity.ERROR,
					message="zone missing required 'id'",
				))
			else:
				zone_id = zone['id']
				if zone_id in zone_ids:
					findings.append(Finding(
						path=zone_path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"duplicate zone id '{zone_id}'",
					))
				else:
					zone_ids.add(zone_id)

		return findings, zone_ids

	def _validate_placements(self, scene: Dict[str, Any], path: str, zone_ids: Set[str]) -> List[Finding]:
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

		return findings
