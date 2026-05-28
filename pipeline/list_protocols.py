#!/usr/bin/env python3
"""Emit protocol-name list from generated/protocols.ts, or render per-protocol HTML.

Two modes:

  list   (default): print one protocol_name per line to stdout, one per
                    entry in PROTOCOLS_INDEX.
  emit   --template <path> --out-dir <dir>: parse PROTOCOLS_INDEX from
                    generated/protocols.ts and write one
                    <out-dir>/<protocol_name>.html per entry, substituting
                    every occurrence of {{PROTOCOL_NAME}} in the template
                    file with the entry's protocol_name.

The script reads generated/protocols.ts as text and extracts the
PROTOCOLS_INDEX block. The generator emits each entry on its own line as:

    { protocol_name: '<name>', cluster: '<cluster>', ... },

so a simple line scan plus a name regex is sufficient and avoids a TS
parser dependency.

This module is called from build_github_pages.sh during the WP-3-10
dist build. It has no runtime dependencies beyond the standard library.
"""

# Standard Library
import re
import sys
import pathlib
import argparse

#============================================

INDEX_START_MARKER = "export const PROTOCOLS_INDEX"
INDEX_END_MARKER = "] as const"
NAME_RE = re.compile(r"protocol_name:\s*'([a-zA-Z0-9_]+)'")


def parse_protocols_index(protocols_ts_path: pathlib.Path) -> list[str]:
	"""Return ordered list of protocol_name values from PROTOCOLS_INDEX."""
	text = protocols_ts_path.read_text(encoding="utf-8")
	# Locate the PROTOCOLS_INDEX block bounds.
	start_idx = text.find(INDEX_START_MARKER)
	if start_idx < 0:
		raise RuntimeError(
			f"PROTOCOLS_INDEX block not found in {protocols_ts_path}"
		)
	end_idx = text.find(INDEX_END_MARKER, start_idx)
	if end_idx < 0:
		raise RuntimeError(
			f"PROTOCOLS_INDEX end marker not found in {protocols_ts_path}"
		)
	block = text[start_idx:end_idx]
	names = NAME_RE.findall(block)
	return names


def cmd_list(protocols_ts_path: pathlib.Path) -> int:
	names = parse_protocols_index(protocols_ts_path)
	for name in names:
		print(name)
	return 0


def cmd_emit(
	protocols_ts_path: pathlib.Path,
	template_path: pathlib.Path,
	out_dir: pathlib.Path,
) -> int:
	names = parse_protocols_index(protocols_ts_path)
	template = template_path.read_text(encoding="utf-8")
	out_dir.mkdir(parents=True, exist_ok=True)
	for name in names:
		rendered = template.replace("{{PROTOCOL_NAME}}", name)
		out_path = out_dir / f"{name}.html"
		out_path.write_text(rendered, encoding="utf-8")
	return 0


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument(
		"-p", "--protocols-ts",
		dest="protocols_ts",
		default="generated/protocols.ts",
		help="Path to generated/protocols.ts.",
	)
	subparsers = parser.add_subparsers(dest="command")
	subparsers.add_parser("list", help="Print protocol names to stdout.")
	emit = subparsers.add_parser("emit", help="Render per-protocol HTML files.")
	emit.add_argument("-t", "--template", dest="template", required=True)
	emit.add_argument("-o", "--out-dir", dest="out_dir", required=True)
	parser.set_defaults(command="list")
	args = parser.parse_args()
	return args


def main() -> int:
	args = parse_args()
	protocols_ts_path = pathlib.Path(args.protocols_ts)
	if args.command == "emit":
		template_path = pathlib.Path(args.template)
		out_dir = pathlib.Path(args.out_dir)
		return cmd_emit(protocols_ts_path, template_path, out_dir)
	# Default: list.
	return cmd_list(protocols_ts_path)


if __name__ == "__main__":
	sys.exit(main())
