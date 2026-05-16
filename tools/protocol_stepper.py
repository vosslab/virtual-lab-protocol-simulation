#!/usr/bin/env python3
"""Protocol stepper CLI: walk protocols through loader, flow, state, and scene ops."""

import sys
import argparse
from pathlib import Path

# Add repo root to path for tools imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import tools.stepper.loader
import tools.stepper.runner


def parse_args():
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description="Step through protocols and report findings."
	)
	parser.add_argument(
		'-p', '--protocol',
		dest='protocol_names',
		nargs='+',
		help='Protocol name(s) to step (default: all mini_protocol types)'
	)
	parser.add_argument(
		'-v', '--verbose',
		dest='verbose',
		action='store_true',
		help='Print per-step state deltas and scene operations'
	)
	args = parser.parse_args()
	return args


def main():
	"""Main entry point."""
	args = parse_args()

	# Determine repo root
	repo_root = Path(__file__).parent.parent

	# Load the content tree
	tree = tools.stepper.loader.load_content_tree(repo_root)

	# Determine which protocols to walk
	if args.protocol_names:
		protocol_names = args.protocol_names
	else:
		# Default: walk both sequence runners and mini protocols
		protocol_names = tools.stepper.runner.discover_sequence_runners(tree)
		protocol_names.extend(tools.stepper.runner.discover_mini_protocols(tree))

	# Walk each protocol and accumulate error status
	has_error = False

	for protocol_name in protocol_names:
		try:
			protocol = tree.get_protocol(protocol_name)
			protocol_type = protocol.get("protocol_type")

			if protocol_type == "sequence_runner":
				leaf_count, interaction_count, emitter = tools.stepper.runner.walk_sequence_runner(
					tree,
					protocol_name,
					verbose=args.verbose,
				)
			else:
				# Default to mini_protocol walk
				step_count, interaction_count, emitter = tools.stepper.runner.walk_protocol(
					tree,
					protocol_name,
					verbose=args.verbose,
				)

			if emitter.has_errors():
				has_error = True

		except tools.stepper.loader.ProtocolNotFoundError:
			print(f"ERROR: Protocol '{protocol_name}' not found.")
			has_error = True

	# Exit with error status if any ERROR finding was recorded
	if has_error:
		sys.exit(1)
	else:
		sys.exit(0)


if __name__ == '__main__':
	main()
