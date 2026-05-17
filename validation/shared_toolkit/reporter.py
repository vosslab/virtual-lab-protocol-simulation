"""
Shared output helpers for tools/ CLIs.

Goal: every tool's stdout follows the same pattern so authors learn it
once. Section headers wrap a block. Per-file PASS/FAIL lines name the
file. A summary line closes the run with counts.

All helpers respect a `quiet` flag where the tool wants per-file output
suppressed on success but summary still printed.
"""

import sys


def print_section_header(name):
	"""Print a `=== name ===` section header to stdout."""
	print(f"=== {name} ===")


def print_pass(label):
	"""Print a `PASS: label` line."""
	print(f"PASS: {label}")


def print_fail(label, reason=None):
	"""Print a `FAIL: label` line, with optional reason on the same line."""
	if reason:
		print(f"FAIL: {label} - {reason}")
	else:
		print(f"FAIL: {label}")


def print_warning(label, reason=None):
	"""Print a `WARN: label` line, with optional reason on the same line."""
	if reason:
		print(f"WARN: {label} - {reason}")
	else:
		print(f"WARN: {label}")


def print_error(message):
	"""Print an error line to stderr."""
	print(f"ERROR: {message}", file=sys.stderr)


def print_summary_line(total, failures, *, item_label="files", warnings=0):
	"""
	Print the final summary line for a tool run.

	Format mirrors validate_content_yaml.py:
	  "Checked N files. F failures." (warnings appended when non-zero)
	"""
	line = f"Checked {total} {item_label}. {failures} failures."
	if warnings:
		line += f" {warnings} warnings."
	print(line)
