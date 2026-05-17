"""Unified finding and severity model for all tools."""

from dataclasses import dataclass
from enum import Enum


class Severity(str, Enum):
	"""Finding severity levels."""
	ERROR = 'ERROR'
	WARNING = 'WARNING'
	INFO = 'INFO'


@dataclass
class Finding:
	"""
	Unified finding model for validation, stepping, and other tools.

	Attributes:
		severity: Severity level (ERROR, WARNING, or INFO).
		tool: Name of the tool that produced the finding (e.g., 'validator', 'stepper').
		code: Stable short identifier for this error class.
		message: Human-readable description of the finding.
		path: Repo-relative path of the offending file, or None.
		line: 1-based line number when known, or None.
		protocol: Protocol name when applicable, or None.
		scene: Scene name when applicable, or None.
		step: Step name when applicable, or None.
		target: Target object or control name when applicable, or None.
		extras: Optional dict for tool-specific metadata.
	"""
	severity: Severity
	tool: str
	code: str
	message: str
	path: str | None = None
	line: int | None = None
	protocol: str | None = None
	scene: str | None = None
	step: str | None = None
	target: str | None = None
	extras: dict | None = None
