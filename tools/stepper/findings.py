"""Finding dataclass and emitter for semantic walker findings."""

from dataclasses import dataclass
from enum import Enum


class Level(Enum):
	"""Finding severity level."""
	ERROR = "ERROR"
	WARNING = "WARNING"


@dataclass(frozen=True)
class Finding:
	"""
	A semantic finding: error or warning from the stepper.

	Attributes:
		level: ERROR or WARNING.
		protocol_name: Name of the protocol being stepped.
		step_name: Name of the step containing the finding (optional).
		interaction_index: 0-based interaction index within the step (optional).
		target: Target object or control name (optional).
		file_path: Path to the YAML file containing the finding.
		code: Stable short identifier for this error class.
		message: Human-readable message describing the finding.
		spec_cite: REQUIRED - docs/specs/<file>.md section or anchor governing this rule.
	"""
	level: Level
	protocol_name: str
	step_name: str | None
	interaction_index: int | None
	target: str | None
	file_path: str
	code: str
	message: str
	spec_cite: str

	def __str__(self) -> str:
		"""Format the finding as a human-readable string."""
		lines = []
		lines.append(f"  {self.level.value} [{self.code}]: {self.message}")
		lines.append(f"  per {self.spec_cite}")
		return '\n'.join(lines)


class FindingEmitter:
	"""Emits findings to stdout in a standard format."""

	def __init__(self, verbose: bool = False):
		"""
		Initialize the emitter.

		Args:
			verbose: If True, emit per-step transition lines and state deltas.
				      If False, suppress transition lines and only emit findings.
		"""
		self.verbose = verbose
		self.findings: list[Finding] = []

	def emit_finding(self, finding: Finding) -> None:
		"""Record a finding for later output."""
		self.findings.append(finding)

	def emit_protocol_start(self, protocol_name: str, protocol_path: str, is_sequence_runner: bool = False, leaf_count: int = 0) -> None:
		"""
		Emit protocol start line (only if verbose).

		Args:
			protocol_name: Name of the protocol.
			protocol_path: Path to the protocol YAML file.
			is_sequence_runner: If True, this is a sequence runner.
			leaf_count: Number of leaves in a sequence runner (0 for mini_protocol).
		"""
		if self.verbose:
			if is_sequence_runner:
				print(f"Stepping {protocol_path} (sequence_runner, {leaf_count} leaves)")
			else:
				print(f"Stepping {protocol_path}")

	def emit_step_transition(self, step_name: str) -> None:
		"""Emit per-step transition line (only if verbose)."""
		if self.verbose:
			print(f"  step {step_name}")

	def emit_state_delta(self, placement_name: str, field_name: str, before: str, after: str) -> None:
		"""
		Emit a state change line (only if verbose).

		Args:
			placement_name: Object instance name.
			field_name: State field name.
			before: Before value (as string).
			after: After value (as string).
		"""
		if self.verbose:
			print(f"  ObjectStateChange  {placement_name}.{field_name}: {before} -> {after}")

	def emit_scene_operation(self, op_type: str) -> None:
		"""Emit a scene operation type line (only if verbose)."""
		if self.verbose:
			print(f"  {op_type}")

	def emit_protocol_summary(
		self,
		protocol_name: str,
		protocol_path: str,
		step_count: int,
		interaction_count: int,
		error_count: int,
		warning_count: int,
	) -> None:
		"""
		Emit a protocol summary line.

		Args:
			protocol_name: Name of the protocol.
			protocol_path: Path to the protocol YAML file.
			step_count: Number of steps stepped.
			interaction_count: Total interactions stepped.
			error_count: Number of ERROR findings.
			warning_count: Number of WARNING findings.
		"""
		total_findings = error_count + warning_count
		if error_count > 0:
			print(f"FAIL: {protocol_path}")
			# Findings will be printed separately
		else:
			print(f"PASS: {step_count} steps, {interaction_count} interactions, {total_findings} findings")

	def emit_leaf_summary(
		self,
		mini_name: str,
		step_count: int,
		interaction_count: int,
		error_count: int,
		warning_count: int,
	) -> None:
		"""
		Emit a per-leaf summary line for a sequence runner leaf.

		Args:
			mini_name: Name of the leaf mini-protocol.
			step_count: Number of steps stepped.
			interaction_count: Total interactions stepped.
			error_count: Number of ERROR findings.
			warning_count: Number of WARNING findings.
		"""
		if self.verbose:
			status = "FAIL" if error_count > 0 else "PASS"
			print(f"  -> {mini_name} {status} ({step_count} steps, {interaction_count} interactions)")

	def emit_sequence_runner_summary(
		self,
		protocol_name: str,
		protocol_path: str,
		leaf_count: int,
		step_count: int,
		interaction_count: int,
		error_count: int,
		warning_count: int,
	) -> None:
		"""
		Emit a sequence runner summary line.

		Args:
			protocol_name: Name of the sequence runner.
			protocol_path: Path to the protocol YAML file.
			leaf_count: Number of leaves.
			step_count: Total steps across all leaves.
			interaction_count: Total interactions across all leaves.
			error_count: Number of ERROR findings.
			warning_count: Number of WARNING findings.
		"""
		total_findings = error_count + warning_count
		if error_count > 0:
			print(f"FAIL: {protocol_path} (sequence_runner, {leaf_count} leaves)")
		else:
			print(f"PASS: {leaf_count} leaves, {step_count} steps, {interaction_count} interactions, {total_findings} findings")

	def print_findings(self) -> None:
		"""Print all accumulated findings to stdout."""
		for finding in self.findings:
			print(str(finding))

	def has_errors(self) -> bool:
		"""Return True if any ERROR findings are present."""
		return any(f.level == Level.ERROR for f in self.findings)

	def clear(self) -> None:
		"""Clear accumulated findings."""
		self.findings = []
