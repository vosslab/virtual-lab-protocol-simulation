#!/usr/bin/env python3
"""
Inject liquid anchors (anchor_liquid_clip and anchor_liquid_bounds) into
container SVGs.

This script reads source SVGs (typically _empty variants) and injects bare-id
anchor elements needed for liquid-fill overlays. The anchors follow the pattern:
- anchor_liquid_clip: a clipPath element containing a geometry
- anchor_liquid_bounds: a rect defining the interior fill region

Per the material overlay vocabulary, anchor ids are never pre-prefixed with
<asset_name>__; the generator/runtime adds that prefix at composition time.
"""

import sys
import xml.etree.ElementTree as ET

# SVG namespace
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def find_liquid_bounds_from_paths(svg_tree):
	"""
	Scan SVG for the tallest/largest path or rect that represents the interior.
	Return (x, y, width, height) as a tuple.

	Heuristic: find all paths and rects, compute bounding boxes, return the one
	with largest area (or largest height for tall objects).
	"""
	root = svg_tree.getroot()

	# Get viewBox to establish coordinate space
	viewbox_str = root.get("viewBox", "0 0 100 100")
	viewbox_parts = viewbox_str.split()
	if len(viewbox_parts) == 4:
		viewbox_minx = float(viewbox_parts[0])
		viewbox_miny = float(viewbox_parts[1])
		viewbox_width = float(viewbox_parts[2])
		viewbox_height = float(viewbox_parts[3])
	else:
		viewbox_minx = viewbox_miny = 0
		viewbox_width = viewbox_height = 100

	candidates = []

	# Find all rect elements
	for rect in root.findall(".//{%s}rect" % SVG_NS):
		x = float(rect.get("x", 0))
		y = float(rect.get("y", 0))
		w = float(rect.get("width", 0))
		h = float(rect.get("height", 0))
		# Skip very small rects (those are likely decorative)
		if w > 0 and h > 0 and w * h > 10:
			candidates.append((x, y, w, h, w * h))

	if candidates:
		# Return the candidate with the largest area
		best = max(candidates, key=lambda c: c[4])
		return (best[0], best[1], best[2], best[3])

	# Fallback: estimate from viewBox, leaving some margin
	return (viewbox_minx + 5, viewbox_miny + 5, viewbox_width - 10, viewbox_height - 10)


def inject_anchors_into_svg(source_path, target_path):
	"""
	Read SVG from source_path, inject liquid anchors, write to target_path.

	Returns True on success, False on error.
	"""
	try:
		tree = ET.parse(source_path)
	except ET.ParseError as e:
		print(f"Error parsing {source_path}: {e}", file=sys.stderr)
		return False

	root = tree.getroot()

	# Find or create defs element
	defs = root.find("{%s}defs" % SVG_NS)
	if defs is None:
		defs = ET.Element("{%s}defs" % SVG_NS)
		root.insert(0, defs)

	# Remove any existing anchor_liquid_clip (we'll recreate it)
	existing_clip = defs.find("{%s}clipPath[@id='anchor_liquid_clip']" % SVG_NS)
	if existing_clip is not None:
		defs.remove(existing_clip)

	# Compute bounds from existing paths/rects
	x, y, w, h = find_liquid_bounds_from_paths(tree)

	# Create clipPath with embedded rect
	clippath = ET.Element("{%s}clipPath" % SVG_NS)
	clippath.set("id", "anchor_liquid_clip")

	clip_rect = ET.Element("{%s}rect" % SVG_NS)
	clip_rect.set("id", "anchor_liquid_bounds")
	clip_rect.set("x", str(x))
	clip_rect.set("y", str(y))
	clip_rect.set("width", str(w))
	clip_rect.set("height", str(h))

	clippath.append(clip_rect)
	defs.append(clippath)

	# Remove any existing standalone anchor_liquid_bounds rect
	# (it's now inside the clipPath)
	for rect in root.findall("{%s}rect[@id='anchor_liquid_bounds']" % SVG_NS):
		root.remove(rect)

	# Add standalone anchor_liquid_bounds rect as invisible marker
	# (for backward compat and visual debugging)
	anchor_rect = ET.Element("{%s}rect" % SVG_NS)
	anchor_rect.set("id", "anchor_liquid_bounds")
	anchor_rect.set("x", str(x))
	anchor_rect.set("y", str(y))
	anchor_rect.set("width", str(w))
	anchor_rect.set("height", str(h))
	anchor_rect.set("fill", "none")
	anchor_rect.set("stroke", "none")
	anchor_rect.set("display", "none")

	# Append to root (after overlay_root if it exists, otherwise at end)
	overlay_root = root.find("{%s}g[@id='overlay_root']" % SVG_NS)
	if overlay_root is not None:
		idx = list(root).index(overlay_root)
		root.insert(idx + 1, anchor_rect)
	else:
		root.append(anchor_rect)

	# Write output
	tree.write(target_path, encoding="utf-8", xml_declaration=True)
	return True


def main():
	"""
	Process a list of SVG files.
	Usage: python3 inject_liquid_anchors.py <source1.svg> [<source2.svg> ...]
	       python3 inject_liquid_anchors.py --from-list <list.txt>
	"""
	if not sys.argv[1:]:
		print(
			"Usage: inject_liquid_anchors.py <source1.svg> [<source2.svg> ...]",
			file=sys.stderr,
		)
		sys.exit(1)

	files_to_process = []

	for arg in sys.argv[1:]:
		if arg == "--from-list":
			# Not implemented in this version; just process the arg as a file
			pass
		else:
			files_to_process.append(arg)

	failed = []
	for source_file in files_to_process:
		print(f"Processing {source_file}...")
		if inject_anchors_into_svg(source_file, source_file):
			print("  -> OK")
		else:
			print("  -> FAILED")
			failed.append(source_file)

	if failed:
		print(f"\nFailed to process {len(failed)} file(s):", file=sys.stderr)
		for f in failed:
			print(f"  {f}", file=sys.stderr)
		sys.exit(1)

	print(f"\nSuccessfully processed {len(files_to_process) - len(failed)} file(s)")


if __name__ == "__main__":
	main()
