#!/usr/bin/env python3
"""
Generate SVG registry as TypeScript module.

Validates all SVGs under assets/**/*.svg, strips sanitization-eligible attributes,
and emits cleaned markup as TS string literal into generated/svg_registry.ts.
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
import subprocess
from pathlib import Path

# Import the shared validator (lives in tools/ as a dev-tool helper).
# pipeline/ generator scripts add the sibling tools/ dir to sys.path so the
# bare-name import remains valid per docs/PYTHON_STYLE.md.
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import svg_validate

# Roots scanned for SVG-key references. A key not referenced in any of these
# trees is treated as orphan and dropped from the shipped registry. Authors
# can keep the .svg file on disk; only the bundled emission is filtered.
USAGE_SCAN_ROOTS = (
	"src",
	"tests",
	"content",
	"generated",
)

# File extensions that may legitimately reference an SVG key by name.
USAGE_SCAN_SUFFIXES = (".ts", ".tsx", ".mts", ".js", ".mjs", ".yaml", ".yml", ".json", ".py", ".html")

# Register default namespace so ET.tostring emits <svg> not <ns0:svg>
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def main():
	"""Main entry point."""
	repo_root = _get_repo_root()
	assets_dir = os.path.join(repo_root, "assets")
	generated_dir = os.path.join(repo_root, "generated")

	# Ensure generated/ exists
	os.makedirs(generated_dir, exist_ok=True)

	# Collect all SVG files
	svg_files = sorted(Path(assets_dir).rglob("*.svg"))

	print(f"Found {len(svg_files)} SVG files under {assets_dir}")

	registry = {}
	placeholder_keys = set()
	failed_files = []

	for svg_path in svg_files:
		abs_path = str(svg_path)

		print(f"processing {abs_path}")

		try:
			report = svg_validate.validate(abs_path)
			if not report.ok:
				failed_files.append((abs_path, report.error_message))
				continue
		except (FileNotFoundError, ValueError) as e:
			failed_files.append((abs_path, str(e)))
			continue

		# Parse and sanitize
		try:
			tree = ET.parse(abs_path)
			root = tree.getroot()
		except ET.ParseError as e:
			failed_files.append((abs_path, f"XML parse error: {e}"))
			continue

		# Strip unsafe attributes (onclick, onload, etc. are already caught by validator)
		_strip_unsafe_attrs(root)

		# Convert back to string
		svg_str = ET.tostring(root, encoding="unicode")

		# Derive registry key from filename (no extension)
		key = svg_path.stem

		registry[key] = svg_str

		# Flag dashed-box placeholder assets. A placeholder is a stand-in SVG
		# whose body is the dashed-box-plus-label convention (CSS classes
		# placeholder-border and placeholder-text). These resolve in the
		# registry like real art, so without an explicit flag the render-yield
		# and occupancy metrics treat them as populated content. Marking them
		# here lets the stats tools exclude placeholder-resolved objects.
		if _is_placeholder_svg(svg_str):
			placeholder_keys.add(key)

	# If there are failures, report and exit non-zero
	if failed_files:
		print("\nVALIDATION FAILURES:", file=sys.stderr)
		for path, error in failed_files:
			print(f"  {path}: {error}", file=sys.stderr)
		print(f"\nTotal: {len(failed_files)} file(s) failed", file=sys.stderr)
		sys.exit(1)

	# Filter orphans: drop keys that no source/content file references.
	# Pass --include-orphans to bypass (e.g. for asset-authoring previews).
	include_orphans = "--include-orphans" in sys.argv
	if include_orphans:
		shipped = registry
		dropped = {}
	else:
		referenced_keys = _scan_referenced_keys(repo_root, set(registry.keys()))
		shipped = {k: v for k, v in registry.items() if k in referenced_keys}
		dropped = {k: v for k, v in registry.items() if k not in referenced_keys}

	if dropped:
		dropped_bytes = sum(len(v) for v in dropped.values())
		print(f"\nDropped {len(dropped)} orphan SVG entries (~{dropped_bytes:,} bytes pre-escape).")
		print("Pass --include-orphans to ship them anyway. Orphan keys:")
		for key in sorted(dropped):
			print(f"  - {key}")

	# Restrict the placeholder-key set to shipped keys (orphans are dropped).
	shipped_placeholders = {k for k in placeholder_keys if k in shipped}

	# Emit TS module
	output_file = os.path.join(generated_dir, "svg_registry.ts")
	_emit_ts_registry(output_file, shipped, shipped_placeholders)

	print(f"\nGenerated {len(shipped)} SVG entries into {output_file}")
	print(f"Flagged {len(shipped_placeholders)} placeholder asset(s): "
		+ ", ".join(sorted(shipped_placeholders)))
	print("Exit code: 0")


def _scan_referenced_keys(repo_root: str, candidate_keys: set) -> set:
	"""Return the subset of candidate_keys referenced anywhere under USAGE_SCAN_ROOTS.

	A reference is any whole-word match of the key in a scannable source file.
	The svg_registry.ts file itself is excluded so its own keys do not
	count as references.
	"""
	# Build one combined regex of all candidate keys for a single pass per file
	if not candidate_keys:
		return set()
	# Sort to make scanning deterministic
	keys_sorted = sorted(candidate_keys, key=len, reverse=True)
	combined = re.compile(r'\b(' + '|'.join(re.escape(k) for k in keys_sorted) + r')\b')

	referenced = set()
	for root_name in USAGE_SCAN_ROOTS:
		root = Path(repo_root) / root_name
		if not root.exists():
			continue
		for path in root.rglob("*"):
			if not path.is_file():
				continue
			if path.suffix not in USAGE_SCAN_SUFFIXES:
				continue
			# Skip the registry itself so its own keys do not self-reference
			if path.name == "svg_registry.ts":
				continue
			try:
				text = path.read_text(errors="ignore")
			except OSError:
				continue
			for match in combined.finditer(text):
				referenced.add(match.group(1))
				if len(referenced) == len(candidate_keys):
					return referenced
	return referenced


def _is_placeholder_svg(svg_str: str) -> bool:
	"""Return True when the SVG markup is a dashed-box placeholder stand-in.

	The placeholder convention is a dashed rectangle plus a centered label,
	styled by the CSS classes placeholder-border and placeholder-text. Both
	class markers must be present so a real asset that happens to use one of
	the words is not mis-flagged.

	Args:
		svg_str: sanitized SVG markup string.

	Returns:
		True if the markup uses the placeholder-border and placeholder-text
		class convention, False otherwise.
	"""
	has_border = "placeholder-border" in svg_str
	has_text = "placeholder-text" in svg_str
	return has_border and has_text


def _strip_unsafe_attrs(elem):
	"""Recursively strip attributes that could be sanitization risks.

	The safe_attrs set uses both bare names (e.g. 'xlink:href') and
	ET-internal namespace-expanded forms (e.g. '{http://...}href') because
	xml.etree.ElementTree stores namespace-prefixed attributes using the
	Clark-notation expanded form internally. Without both forms, namespace-
	qualified attributes like xlink:href are silently dropped at serialization.

	Attributes stripped (not safe): event handlers (onclick, onload, etc.),
	javascript: href values, and any attribute not in the allow list. The
	validator (svg_validate.py) already rejects files with event handlers and
	script content; this strip is a defense-in-depth pass.
	"""
	# Namespace expansions used by Python xml.etree.ElementTree internally.
	XLINK_NS = "http://www.w3.org/1999/xlink"

	# Attributes that are safe to keep: standard SVG/XML attributes.
	# Include both bare form and ET-internal namespace-expanded form so that
	# xlink:href and similar namespace-qualified attributes survive round-trip.
	safe_attrs = {
		# --- identity and namespace declarations ---
		"xmlns",
		"version",
		# --- presentation and layout ---
		"viewBox",
		"preserveAspectRatio",
		"width",
		"height",
		"x",
		"y",
		"x1",
		"y1",
		"x2",
		"y2",
		"cx",
		"cy",
		"r",
		"rx",
		"ry",
		"d",
		"points",
		"pathLength",
		# --- paint ---
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
		"stroke-miterlimit",
		"stroke-dasharray",
		"stroke-dashoffset",
		"fill-opacity",
		"stroke-opacity",
		"fill-rule",
		"clip-path",
		"clip-rule",
		"color",
		"color-interpolation-filters",
		# --- filter and gradient ---
		"gradientUnits",
		"gradientTransform",
		"patternUnits",
		"patternTransform",
		"spreadMethod",
		"offset",
		"stop-color",
		"stop-opacity",
		"filterUnits",
		"primitiveUnits",
		"result",
		"in",
		"in2",
		"type",
		"values",
		"stdDeviation",
		"dx",
		"dy",
		"k1",
		"k2",
		"k3",
		"k4",
		"operator",
		"edgeMode",
		"flood-color",
		"flood-opacity",
		"lighting-color",
		# --- markers and text ---
		"marker-start",
		"marker-mid",
		"marker-end",
		"markerWidth",
		"markerHeight",
		"markerUnits",
		"refX",
		"refY",
		"orient",
		"font-size",
		"font-family",
		"font-weight",
		"font-style",
		"text-anchor",
		"dominant-baseline",
		"letter-spacing",
		"word-spacing",
		"textLength",
		"lengthAdjust",
		# --- structural ---
		"id",
		"class",
		"style",
		"transform",
		"opacity",
		"visibility",
		"display",
		"overflow",
		"clip",
		"clip-path",
		"mask",
		"enable-background",
		"shape-rendering",
		"image-rendering",
		"text-rendering",
		"color-rendering",
		# --- linking (bare form, used when no namespace prefix registered) ---
		"href",
		"xlink:href",
		# --- ET-internal Clark-notation expanded form for xlink:href.
		#     Python's ET stores 'xlink:href' as '{ns}href' internally;
		#     without this entry the attribute is treated as unsafe and stripped. ---
		"{%s}href" % XLINK_NS,
		# --- repo-specific data attributes ---
		"data-item-id",
		"data-well-id",
		"data-tube-id",
		"data-plate-id",
		"data-name",
	}

	# Remove attributes not in safe list
	attrs_to_remove = [key for key in elem.attrib.keys() if key not in safe_attrs]
	for key in attrs_to_remove:
		del elem.attrib[key]

	for child in elem:
		_strip_unsafe_attrs(child)


def _emit_ts_registry(output_file: str, registry: dict, placeholder_keys: set):
	"""Emit registry as TypeScript module.

	Emits two exports: SVG_REGISTRY maps each asset key to its sanitized
	markup string, and SVG_PLACEHOLDER_KEYS lists the keys whose markup is a
	dashed-box placeholder stand-in. A separate placeholder export keeps the
	string-valued registry shape that existing consumers expect, while letting
	stats tools and the runtime ask whether a resolved asset is real art.
	"""
	lines = []
	lines.append("// Auto-generated SVG registry. Do not edit.")
	lines.append("// Generated by pipeline/gen_svg_registry.py")
	lines.append("")
	lines.append("export const SVG_REGISTRY: Record<string, string> = {")

	for key in sorted(registry.keys()):
		svg_str = registry[key]
		# Escape quotes and newlines for TS string literal
		escaped = svg_str.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
		lines.append(f'  "{key}": "{escaped}",')

	lines.append("};")
	lines.append("")
	# Placeholder keys: assets that resolve in the registry but are dashed-box
	# stand-ins, not real scientific art. Stats and render code use this set to
	# avoid counting placeholders as populated content.
	lines.append("export const SVG_PLACEHOLDER_KEYS: ReadonlyArray<string> = [")
	for key in sorted(placeholder_keys):
		lines.append(f'  "{key}",')
	lines.append("];")
	lines.append("")

	with open(output_file, "w") as f:
		f.write("\n".join(lines))


def _get_repo_root() -> str:
	"""Get repository root via git."""
	try:
		result = subprocess.run(
			["git", "rev-parse", "--show-toplevel"],
			capture_output=True,
			text=True,
			timeout=5,
		)
		if result.returncode == 0:
			return result.stdout.strip()
	except Exception:
		pass

	raise RuntimeError("Could not determine repo root via git")


if __name__ == "__main__":
	main()
