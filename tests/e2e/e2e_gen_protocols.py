#!/usr/bin/env python3
"""End-to-end smoke for pipeline/gen_protocols.py.

Lives in tests/e2e/ because each pytest invocation re-ran the full
subprocess and consumed real YAML; per docs/E2E_TESTS.md, real
subprocess CLI round-trips belong here, not in the pytest fast lane.

Runs the generator twice (determinism check). Validates output structure
without hardcoded protocol counts or names per docs/PYTEST_STYLE.md.

Usage:
	python3 tests/e2e/e2e_gen_protocols.py
Exits 0 on success, nonzero on first failure.
"""

import os
import re
import subprocess
import sys

import pipeline.gen_protocols
import validation.yaml_schema.protocol_validator


def get_repo_root() -> str:
	result = subprocess.run(
		["git", "rev-parse", "--show-toplevel"],
		capture_output=True,
		text=True,
		check=True,
	)
	return result.stdout.strip()


def run_generator(repo_root: str) -> None:
	result = subprocess.run(
		[sys.executable, "pipeline/gen_protocols.py"],
		cwd=repo_root,
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise SystemExit(
			f"gen_protocols.py failed (exit {result.returncode})\n"
			f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
		)


def read_generated(repo_root: str) -> str:
	path = os.path.join(repo_root, "generated", "protocols.ts")
	with open(path) as f:
		return f.read()


def check_exports(content: str) -> None:
	if "export const PROTOCOLS:" not in content:
		raise SystemExit("PROTOCOLS export missing from generated/protocols.ts")
	if "export const PROTOCOLS_INDEX:" not in content:
		raise SystemExit("PROTOCOLS_INDEX export missing from generated/protocols.ts")


def check_index_covers_all_protocols(content: str) -> None:
	# Every protocol carries mini_protocol or sequence_runner; PROTOCOLS_INDEX
	# lists every protocol, so the entry count matches PROTOCOLS.
	protocols_section = content.split("export const PROTOCOLS:")[1].split("} as const;")[0]
	index_section = content.split("export const PROTOCOLS_INDEX:")[1].split("] as const;")[0]
	protocol_count = len(re.findall(r'protocol_name: "([^"]+)"', protocols_section))
	index_count = len(re.findall(r"protocol_name: '([^']+)'", index_section))
	if protocol_count == 0:
		raise SystemExit("PROTOCOLS export has no entries")
	if protocol_count != index_count:
		raise SystemExit(
			"PROTOCOLS_INDEX entry count does not match PROTOCOLS: "
			f"protocols={protocol_count}, index={index_count}"
		)
	protocol_types = set(re.findall(r"protocol_type: '([^']+)'", index_section))
	if not protocol_types <= {"mini_protocol", "sequence_runner"}:
		raise SystemExit(
			f"PROTOCOLS_INDEX has unexpected protocol_type values: {protocol_types}"
		)


def check_sorted_index(content: str) -> None:
	index_section = content.split("export const PROTOCOLS_INDEX:")[1].split("] as const;")[0]
	entries = re.findall(
		r"protocol_name: '([^']+)'.*?cluster: '([^']+)'",
		index_section,
	)
	if len(entries) <= 1:
		return
	sorted_entries = sorted(entries, key=lambda x: (x[1], x[0]))
	if entries != sorted_entries:
		raise SystemExit("PROTOCOLS_INDEX not sorted by cluster then protocol_name")


def check_index_field_alignment(content: str) -> None:
	index_section = content.split("export const PROTOCOLS_INDEX:")[1].split("] as const;")[0]
	protocol_names = len(re.findall(r"protocol_name:", index_section))
	clusters = len(re.findall(r"cluster:", index_section))
	types = len(re.findall(r"protocol_type:", index_section))
	hooks = len(re.findall(r"learning_hook:", index_section))
	if protocol_names == 0:
		raise SystemExit("PROTOCOLS_INDEX has no entries")
	if not (protocol_names == clusters == types == hooks):
		raise SystemExit(
			"PROTOCOLS_INDEX field count mismatch: "
			f"names={protocol_names}, clusters={clusters}, "
			f"types={types}, hooks={hooks}"
		)


def check_dev_smoke_rejected_by_codegen() -> None:
	"""gen_protocols.py's own protocol_type enum must reject dev_smoke.

	dev_smoke was removed from the active protocol vocabulary; this proves
	the codegen gate still fails loudly on a stale protocol_type value
	instead of silently accepting it.
	"""
	protocol_data = {
		"protocol_type": "dev_smoke",
		"protocol_name": "rejected_dev_smoke_check",
		"entry_step": "only_step",
	}
	path = "content/protocols/cell_culture/rejected_dev_smoke_check/protocol.yaml"
	raised = False
	try:
		pipeline.gen_protocols.validate_protocol(protocol_data, "cell_culture", path)
	except ValueError as error:
		raised = True
		if "dev_smoke" not in str(error):
			raise SystemExit(
				f"gen_protocols.py rejected dev_smoke without naming it: {error}"
			)
	if not raised:
		raise SystemExit(
			"gen_protocols.py accepted protocol_type: dev_smoke; expected ValueError"
		)


def check_dev_smoke_rejected_by_schema_validator() -> None:
	"""The schema validator's PROTOCOL_TYPES enum must reject dev_smoke.

	Independent of the codegen gate above: proves the schema validator
	(validation/yaml_schema/protocol_validator.py) also rejects dev_smoke,
	so removing it from the vocabulary was not silently bypassed by only
	one of the two gates.
	"""
	protocol_data = {
		"protocol_type": "dev_smoke",
		"protocol_name": "rejected_dev_smoke_check",
		"entry_step": "only_step",
		"learning": {},
		"steps": [],
	}
	path = "content/protocols/cell_culture/rejected_dev_smoke_check/protocol.yaml"
	validator = validation.yaml_schema.protocol_validator.ProtocolValidator()
	findings = validator.validate(protocol_data, path)
	protocol_type_findings = [
		finding for finding in findings if "protocol_type 'dev_smoke'" in finding.message
	]
	if not protocol_type_findings:
		raise SystemExit(
			"protocol_validator.py accepted protocol_type: dev_smoke; expected a "
			f"protocol_type finding, got: {[f.message for f in findings]}"
		)


def main() -> int:
	repo_root = get_repo_root()
	# Run twice and confirm byte-for-byte determinism.
	run_generator(repo_root)
	first = read_generated(repo_root)
	run_generator(repo_root)
	second = read_generated(repo_root)
	if first != second:
		raise SystemExit("gen_protocols.py output is non-deterministic across runs")
	# Structural checks on the most recent run.
	check_exports(second)
	check_index_covers_all_protocols(second)
	check_sorted_index(second)
	check_index_field_alignment(second)
	check_dev_smoke_rejected_by_codegen()
	check_dev_smoke_rejected_by_schema_validator()
	print("e2e_gen_protocols: OK")
	return 0


if __name__ == "__main__":
	sys.exit(main())
