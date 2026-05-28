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


def check_dev_smoke_split(content: str) -> None:
	# dev_smoke protocols ship in PROTOCOLS but never in PROTOCOLS_INDEX.
	protocols_section = content.split("export const PROTOCOLS:")[1].split("} as const;")[0]
	index_section = content.split("export const PROTOCOLS_INDEX:")[1]
	if "dev_smoke" in protocols_section and "dev_smoke" in index_section:
		raise SystemExit(
			"dev_smoke protocols must be absent from PROTOCOLS_INDEX"
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
	check_dev_smoke_split(second)
	check_sorted_index(second)
	check_index_field_alignment(second)
	print("e2e_gen_protocols: OK")
	return 0


if __name__ == "__main__":
	sys.exit(main())
