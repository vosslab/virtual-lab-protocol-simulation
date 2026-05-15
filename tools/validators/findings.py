"""Finding and severity model for validation results."""

import dataclasses
import enum


class Severity(enum.Enum):
	"""Finding severity levels."""
	ERROR = 'ERROR'
	WARNING = 'WARNING'


@dataclasses.dataclass
class Finding:
	"""Single validation finding."""
	path: str
	lineno: int | None
	severity: Severity
	message: str
	tag: str | None = None

	def format(self) -> str:
		"""Format finding as a single line message."""
		loc = f"{self.path}:{self.lineno}" if self.lineno else self.path
		tag_str = f" [{self.tag}]" if self.tag else ""
		return f"{loc}: {self.severity.value}{tag_str}: {self.message}"
