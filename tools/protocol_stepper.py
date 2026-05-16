#!/usr/bin/env python3
"""
Protocol stepper CLI: second content gate after validate_content_yaml.py.

Walks authored mini-protocols and sequence runners semantically (in
memory, no browser) and emits ERROR / WARNING findings for broken flow,
undeclared materials, invalid state mutations, sequence-runner handoff
gaps, and cross-mini production gaps.

CLI is aligned with tools/validate_content_yaml.py:
  --list-protocols           List shipped protocol names and exit.
  --interactive              Pick one protocol from a numbered menu.
  -p / --protocol  NAME...   Step one or more named protocols (or paths).
  -q / --quiet               Suppress section headers; keep findings + summary.
  -v / --verbose             Per-step state delta lines.
With no selection flags, every shipped mini-protocol and sequence
runner is walked.
"""

import sys
import argparse
from pathlib import Path

# Insert repo root so `tools.shared_toolkit.*` and `tools.stepper.*` import.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tools.stepper.loader
import tools.stepper.runner
import tools.stepper.dashboard as dashboard
import tools.stepper.findings
import tools.shared_toolkit.protocols as toolkit_protocols
import tools.shared_toolkit.interactive as toolkit_interactive
import tools.shared_toolkit.reporter as reporter


def parse_args():
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description='Step through authored protocols and report semantic findings.'
	)

	selection_group = parser.add_argument_group('Selection')
	selection_group.add_argument(
		'-p', '--protocol',
		dest='protocol_names',
		nargs='+',
		help='Protocol name(s) or path(s) to step. Default: every shipped protocol.'
	)
	selection_group.add_argument(
		'--list-protocols',
		dest='list_protocols_flag',
		action='store_true',
		help='List available protocols and exit.'
	)
	selection_group.add_argument(
		'--interactive',
		dest='interactive',
		action='store_true',
		help='Pick a protocol from a numbered menu.'
	)

	verbosity_group = parser.add_argument_group('Verbosity')
	verbosity_group.add_argument(
		'-q', '--quiet',
		dest='quiet',
		action='store_true',
		help='Suppress section headers and PASS lines. Findings + summary still print.'
	)
	verbosity_group.add_argument(
		'-v', '--verbose',
		dest='verbose',
		action='store_true',
		help='Print per-step state deltas and scene operations.'
	)

	args = parser.parse_args()
	return args


def _resolve_selection(args, repo_root, tree):
	"""
	Resolve which protocol names to walk based on CLI flags.

	Returns a list of protocol names, or None if the caller should exit.
	"""
	# --interactive: pick one
	if args.interactive:
		names = toolkit_protocols.list_protocols()
		selected = toolkit_interactive.pick_protocol_interactively(names)
		if selected is None:
			return None
		return [selected]

	# -p / --protocol: resolve each name-or-path to a protocol name
	if args.protocol_names:
		resolved = []
		for name_or_path in args.protocol_names:
			# If the user passed a name that loaded into the tree, use as-is.
			# Otherwise try the path resolver and derive the directory name.
			if name_or_path in tree.protocols:
				resolved.append(name_or_path)
				continue
			path = toolkit_protocols.resolve_protocol_path(name_or_path, repo_root=str(repo_root))
			if path is None:
				reporter.print_error(f"Protocol '{name_or_path}' not found.")
				return None
			resolved.append(toolkit_protocols.protocol_name_from_path(path))
		return resolved

	# Default: every shipped protocol (runners first, then minis)
	names = tools.stepper.runner.discover_sequence_runners(tree)
	names.extend(tools.stepper.runner.discover_mini_protocols(tree))
	return names


def main():
	"""Dispatch by selection mode and walk the chosen protocols."""
	args = parse_args()
	repo_root = Path(__file__).resolve().parent.parent

	# --list-protocols is filesystem-based and fast; do not load the tree.
	if args.list_protocols_flag:
		for name in toolkit_protocols.list_protocols():
			print(name)
		sys.exit(0)

	tree = tools.stepper.loader.load_content_tree(repo_root)

	protocol_names = _resolve_selection(args, repo_root, tree)
	if protocol_names is None:
		sys.exit(1)

	# Output model parallels validate_content_yaml.py:
	#   default:  per-protocol section header on FAIL, grouped dashboard,
	#             closing summary line. No per-finding spew.
	#   -v:       per-protocol section header always, runner's full
	#             PASS/FAIL + per-finding inline dump, then dashboard.
	#   -q:       only the closing summary line. No headers, no findings,
	#             no dashboard.
	# In other words: the runner's chatty mode is gated on --verbose;
	# the dashboard is gated on (not --quiet).
	runner_quiet = not args.verbose

	walks = []
	has_error = False
	total = 0
	failures = 0
	warnings = 0

	for protocol_name in protocol_names:
		total += 1
		protocol = tree.get_protocol(protocol_name)
		protocol_type = toolkit_protocols.classify_protocol(protocol)

		if args.verbose and not args.quiet:
			# Verbose dumps the runner's own section + summary + findings.
			reporter.print_section_header(f"Stepping {protocol_name}")

		if protocol_type == "sequence_runner":
			leaf_count, interaction_count, emitter = tools.stepper.runner.walk_sequence_runner(
				tree, protocol_name, verbose=args.verbose, quiet=runner_quiet,
			)
			step_count = leaf_count
		else:
			step_count, interaction_count, emitter = tools.stepper.runner.walk_protocol(
				tree, protocol_name, verbose=args.verbose, quiet=runner_quiet,
			)

		walks.append(
			(protocol_name, protocol_type, step_count, interaction_count, emitter)
		)

		if emitter.has_errors():
			has_error = True
			failures += 1
			# Even in default (non-verbose) mode, name the failing
			# protocol immediately so the reader doesn't have to wait
			# for the dashboard to learn what blew up.
			if not args.quiet and not args.verbose:
				reporter.print_fail(protocol_name)
		warnings += sum(
			1 for f in emitter.findings
			if f.level == tools.stepper.findings.Level.WARNING
		)

	if not args.quiet:
		print()
		counts = dashboard.aggregate(walks)
		dashboard.render(counts)
		print()

	reporter.print_summary_line(
		total, failures, item_label="protocols", warnings=warnings,
	)

	sys.exit(1 if has_error else 0)


if __name__ == '__main__':
	main()
