"""Finding and severity model for validation results."""

import dataclasses

import validation.shared_toolkit.findings


@dataclasses.dataclass
class Finding:
	"""Single validation finding emitted by a validator.

	Attributes:
		path: Repo-relative path of the offending file, or a structured
			path inside a file such as `<file>.steps[2].sequence[0].target`.
		lineno: 1-based line number when known. None when the YAML loader
			(currently pyyaml) cannot provide it.
		severity: Severity.ERROR for spec violations; Severity.WARNING for
			hygiene observations that should not block validation.
		message: Human-readable description of the problem. May embed a
			tag prefix `[TAG]` when the message was authored before the
			structured `tag` field landed.
		tag: Optional structured tag matching the registry in
			tools/validators/constants.py (T1_TARGET, T1_STATE_FIELD,
			T1_ENUM, T1_MATERIAL_REF, T1_TARGET_WITH_VALUE, SCENE_EXTENDS,
			CLOSURE, T3_CAMELCASE, RETIRED, BANNED). Used for structured
			filtering and triage.
	"""
	path: str
	lineno: int | None
	severity: validation.shared_toolkit.findings.Severity
	message: str
	tag: str | None = None

	def format(self) -> str:
		"""Render the finding as one line: `path[:lineno]: SEVERITY [tag]: message`."""
		loc = f"{self.path}:{self.lineno}" if self.lineno else self.path
		tag_str = f" [{self.tag}]" if self.tag else ""
		return f"{loc}: {self.severity.value}{tag_str}: {self.message}"


Severity = validation.shared_toolkit.findings.Severity

__all__ = ['Severity', 'Finding']
