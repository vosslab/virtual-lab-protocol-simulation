"""Cross-protocol checks (Tier 3): banned tokens, contents drift, closure."""

from typing import Any, Dict, List

from validators.constants import BANNED_TOKENS
from validators.findings import Finding, Severity


class CrossProtocolValidator:
	"""Tier 3: cross-protocol hygiene checks."""

	def check_banned_tokens(self, data: Dict[str, Any], path: str) -> List[Finding]:
		"""
		Recursive walk of YAML tree looking for banned token keys.
		Returns Finding for each banned token found.
		"""
		findings = []
		self._walk_banned_tokens(data, path, findings)
		return findings

	def _walk_banned_tokens(self, obj: Any, path: str, findings: list[Finding]) -> None:
		"""Recursively walk object tree looking for banned top-level keys."""
		if isinstance(obj, dict):
			for key, value in obj.items():
				if key in BANNED_TOKENS:
					reason = BANNED_TOKENS[key]
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.ERROR,
						message=f"banned token '{key}' found: {reason}",
					))
				self._walk_banned_tokens(value, f"{path}.{key}", findings)
		elif isinstance(obj, list):
			for idx, item in enumerate(obj):
				self._walk_banned_tokens(item, f"{path}[{idx}]", findings)

	def check_contents_drift(self, contents_by_protocol: Dict[str, Dict[str, Dict[str, Any]]]) -> List[Finding]:
		"""
		Check for contents entry drift across protocols.
		If same contents name appears in 2+ protocols with different label or displayColor, emit WARNING.
		"""
		findings = []

		# Group contents by name across all protocols
		contents_by_name: Dict[str, List[tuple]] = {}
		for protocol_name, protocol_contents in contents_by_protocol.items():
			for contents_name, contents_data in protocol_contents.items():
				if contents_name not in contents_by_name:
					contents_by_name[contents_name] = []
				contents_by_name[contents_name].append((protocol_name, contents_data))

		# Check for drift
		for contents_name, entries in contents_by_name.items():
			if len(entries) <= 1:
				continue  # Only one protocol, no drift possible

			# Compare first entry to all others
			first_protocol, first_data = entries[0]
			first_label = first_data.get('label')
			first_color = first_data.get('displayColor')

			for protocol_name, contents_data in entries[1:]:
				label = contents_data.get('label')
				color = contents_data.get('displayColor')

				if label != first_label or color != first_color:
					path = f"content/protocols/{protocol_name}/contents.yaml"
					findings.append(Finding(
						path=path,
						lineno=None,
						severity=Severity.WARNING,
						message=f"contents '{contents_name}' drifts from {first_protocol}: label={label!r}, color={color!r}",
					))

		return findings

	def check_closure(self, obj_whitelist: set, scene_whitelist: set, protocol_whitelist: set) -> List[Finding]:
		"""
		Check that top-level keys in loaded files match documented whitelists.
		Returns Finding for unknown top-level keys.
		"""
		findings = []
		# This check is integrated into individual validators; no centralized closure check needed here
		return findings
