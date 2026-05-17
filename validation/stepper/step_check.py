#!/usr/bin/env python3
"""
Protocol stepper CLI: second content gate after validate_content_yaml.py.

Walks authored mini-protocols and sequence runners semantically (in
memory, no browser) and emits ERROR / WARNING findings for broken flow,
undeclared materials, invalid state mutations, sequence-runner handoff
gaps, and cross-mini production gaps.

CLI is aligned with shared toolkit parser:
  --list-protocols           List shipped protocol names and exit.
  --interactive              Pick one protocol from a numbered menu.
  -p / --protocol  NAME...   Step one or more named protocols (or paths).
  -q / --quiet               Final pass/fail only (one line).
  -v / --verbose             Diagnostic summary: top codes, per-protocol counts.
With no selection flags, every shipped mini-protocol and sequence
runner is walked.
"""

import sys
from pathlib import Path

import validation.stepper.loader
import validation.stepper.runner
import validation.stepper.dashboard as dashboard
import validation.stepper.findings
import validation.shared_toolkit.cli as toolkit_cli
import validation.shared_toolkit.protocols as toolkit_protocols
import validation.shared_toolkit.interactive as toolkit_interactive
import validation.shared_toolkit.reporter as reporter


def parse_args():
	"""Parse command-line arguments using unified toolkit parser."""
	# Extras callback for tool-specific flags (none for stepper)
	def add_stepper_extras(parser):
		# No stepper-specific flags
		pass

	parser = toolkit_cli.build_parser(
		prog='step_check',
		description='Step through authored protocols and report semantic findings.',
		extras=add_stepper_extras
	)

	# Parse and map shared args to local expectations
	args = parser.parse_args()

	# Map shared 'protocols' to 'protocol_names' for backward compat with _resolve_selection
	args.protocol_names = args.protocols

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
	names = validation.stepper.runner.discover_sequence_runners(tree)
	names.extend(validation.stepper.runner.discover_mini_protocols(tree))
	return names


def _render_verbose_diagnostics(counts):
	"""
	Render diagnostic-summary output for -v mode.

	Shows:
	  - Top failing codes by occurrence (if any findings exist)
	  - Per-protocol error/warning counts (if any findings exist)
	  - Per-protocol PASS/FAIL summary (always shown)

	Args:
		counts: dict from dashboard.aggregate()
	"""
	output_lines = []

	#============================================
	# Top failing codes (only if findings exist)
	if counts['findings_by_code']:
		output_lines.append("Diagnostic Summary:")
		output_lines.append("")
		output_lines.append("Top failing codes (by occurrence):")
		# Sort by count descending, then by level (errors before warnings)
		sorted_items = sorted(
			counts['findings_by_code'].items(),
			key=lambda kv: (-kv[1]['count'], 0 if kv[1]['level'] == 'ERROR' else 1)
		)
		for code, entry in sorted_items[:10]:
			output_lines.append(f"  {code}: {entry['count']}")
		if len(sorted_items) > 10:
			output_lines.append(f"  ... and {len(sorted_items) - 10} more")

		#============================================
		# Per-protocol error/warning counts
		noisy_protocols = [
			(name, entry)
			for name, entry in counts['per_protocol'].items()
			if entry['errors'] > 0 or entry['warnings'] > 0
		]
		if noisy_protocols:
			output_lines.append("")
			output_lines.append("Per-protocol findings (only protocols with issues):")
			# Sort: most errors first, then most warnings, then by name
			noisy_protocols.sort(
				key=lambda kv: (-kv[1]['errors'], -kv[1]['warnings'], kv[0])
			)
			for name, entry in noisy_protocols[:10]:
				output_lines.append(
					f"  {name}: {entry['errors']} errors, {entry['warnings']} warnings"
				)
			if len(noisy_protocols) > 10:
				output_lines.append(f"  ... and {len(noisy_protocols) - 10} more protocols")

	#============================================
	# Per-protocol PASS/FAIL breakdown (always shown in -v mode)
	if output_lines:
		output_lines.append("")

	output_lines.append("Per-protocol breakdown:")
	# Sort: failures first (errors > 0), then by name
	all_protocols = sorted(
		counts['per_protocol'].items(),
		key=lambda kv: (0 if kv[1]['errors'] > 0 else 1, kv[0])
	)

	for name, entry in all_protocols:
		steps = entry.get('step_count', 0)
		interactions = entry.get('interaction_count', 0)
		if entry['errors'] > 0:
			status = f"FAIL ({entry['errors']} errors, {entry['warnings']} warnings)"
		else:
			status = f"PASS ({steps} steps, {interactions} interactions)"
		output_lines.append(f"  {name}: {status}")

	if output_lines:
		print('\n'.join(output_lines))
		print()


def main():
	"""Dispatch by selection mode and walk the chosen protocols.

	Verbosity contract (text output line targets):
	  -q / --quiet   : 1 line (final pass/fail with key numbers)
	  default        : 5-40 lines (stage summary, totals, top categories)
	  -v / --verbose : 40-<200 lines (per-content-file breakdown, grouped, summarized)
	  -j / --json    : full machine-readable detail (no bound)
	  -J / --ndjson  : streamed full detail (no bound)
	Raw per-step / per-asset internals go to JSON only, NOT text.
	"""
	args = parse_args()
	repo_root = Path(__file__).resolve().parent.parent.parent

	# --list is filesystem-based and fast; do not load the tree.
	if args.list_only:
		for name in toolkit_protocols.list_protocols():
			print(name)
		sys.exit(0)

	tree = validation.stepper.loader.load_content_tree(repo_root)

	protocol_names = _resolve_selection(args, repo_root, tree)
	if protocol_names is None:
		sys.exit(1)

	# Output model (revised for verbosity contract):
	#   -q:       only the closing summary line (one line).
	#   default:  grouped dashboard, closing summary line.
	#   -v:       diagnostic summary (top codes, per-protocol counts), dashboard, summary.
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

		if protocol_type == "sequence_runner":
			leaf_count, interaction_count, emitter = validation.stepper.runner.walk_sequence_runner(
				tree, protocol_name, verbose=False, quiet=runner_quiet,
			)
			step_count = leaf_count
		else:
			step_count, interaction_count, emitter = validation.stepper.runner.walk_protocol(
				tree, protocol_name, verbose=False, quiet=runner_quiet,
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
			if f.level == validation.stepper.findings.Level.WARNING
		)

	if not args.quiet:
		print()
		counts = dashboard.aggregate(walks)

		# Render diagnostic summary if verbose mode
		if args.verbose:
			_render_verbose_diagnostics(counts)

		dashboard.render(counts)
		print()

	reporter.print_summary_line(
		total, failures, item_label="protocols", warnings=warnings,
	)

	sys.exit(1 if has_error else 0)


if __name__ == '__main__':
	main()
