#!/usr/bin/env python3
"""
Self-contained SVG normalizer v2 plus smoke tests.

This replaces the earlier (salvaged) normalize_svg.py wrapper. The intended CLI is now:

  python3 test_normalize_svg_v2.py -i microtube_open_translucent.svg
  python3 test_normalize_svg_v2.py -i microtube_open_translucent.svg -o normalized/
  python3 test_normalize_svg_v2.py --self-test

What v2 does:
- Reads one or more SVG files.
- Computes the drawn bounding box from common SVG primitives and path data.
- Rewrites the SVG viewBox to start at 0 0 with configurable padding.
- Shifts coordinates so the drawing remains visible in the new viewBox.
- Converts common SVG path commands to straightforward absolute commands.
- Specifically supports relative h, v, and z paths that v1 skipped.

Path support:
  M/m, L/l, H/h, V/v, C/c, S/s, Q/q, T/t, A/a, Z/z

Bounding boxes for curves and arcs are approximate. Curves use control points
and endpoints. Arcs use endpoints. This is good enough for cropping icon art,
but it is not a mathematically exact Bezier or arc extrema solver.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
# Preserve canonical prefixes for embedded attribution metadata (Dublin Core,
# Creative Commons RDF). Without these, ElementTree renames foreign-namespace
# prefixes to ns0:/ns1:/... on write, breaking downstream attribution parsers
# and human readability. See `_temp_normalize_meta_probe.py` history.
ET.register_namespace("dc", "http://purl.org/dc/elements/1.1/")
ET.register_namespace("cc", "http://creativecommons.org/ns#")
ET.register_namespace("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#")
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
ET.register_namespace("sodipodi", "http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd")
ET.register_namespace("inkscape", "http://www.inkscape.org/namespaces/inkscape")

COMMAND_RE = re.compile(r"([AaCcHhLlMmQqSsTtVvZz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)")
COMMAND_ARITY = {
	"M": 2,
	"L": 2,
	"H": 1,
	"V": 1,
	"C": 6,
	"S": 4,
	"Q": 4,
	"T": 2,
	"A": 7,
	"Z": 0,
}
COORD_ATTRS_X = {"x", "x1", "x2", "cx"}
COORD_ATTRS_Y = {"y", "y1", "y2", "cy"}
SHAPE_TAGS = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"}


@dataclass(frozen=True)
class PathSegment:
	cmd: str
	nums: tuple[float, ...]


@dataclass(frozen=True)
class BBox:
	min_x: float
	min_y: float
	max_x: float
	max_y: float

	def union(self, other: "BBox") -> "BBox":
		return BBox(
			min(self.min_x, other.min_x),
			min(self.min_y, other.min_y),
			max(self.max_x, other.max_x),
			max(self.max_y, other.max_y),
		)

	@property
	def width(self) -> float:
		return self.max_x - self.min_x

	@property
	def height(self) -> float:
		return self.max_y - self.min_y


def local_name(tag: str) -> str:
	if "}" in tag:
		return tag.rsplit("}", 1)[1]
	return tag


def fmt(value: float) -> str:
	if abs(value) < 1e-9:
		value = 0.0
	text = f"{value:.6f}".rstrip("0").rstrip(".")
	return text if text else "0"


def parse_float(value: str | None, default: float = 0.0) -> float:
	if value is None:
		return default
	match = re.match(r"\s*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)", value)
	if not match:
		return default
	return float(match.group(1))


def tokenize_path(d_attr: str) -> list[str]:
	tokens: list[str] = []
	for match in COMMAND_RE.finditer(d_attr):
		tokens.append(match.group(1) or match.group(2))
	return tokens


def is_command(token: str) -> bool:
	return len(token) == 1 and token.isalpha()


def parse_path_to_absolute(d_attr: str) -> list[PathSegment]:
	"""Parse common SVG path data and convert commands to absolute form."""
	tokens = tokenize_path(d_attr)
	segments: list[PathSegment] = []
	index = 0
	current_cmd: str | None = None
	x = 0.0
	y = 0.0
	start_x = 0.0
	start_y = 0.0
	last_c_ctrl: tuple[float, float] | None = None
	last_q_ctrl: tuple[float, float] | None = None

	def read_numbers(count: int) -> tuple[float, ...] | None:
		nonlocal index
		if index + count > len(tokens):
			return None
		values: list[float] = []
		for offset in range(count):
			token = tokens[index + offset]
			if is_command(token):
				return None
			values.append(float(token))
		index += count
		return tuple(values)

	while index < len(tokens):
		token = tokens[index]
		if is_command(token):
			current_cmd = token
			index += 1
		elif current_cmd is None:
			raise ValueError(f"Path data begins with number instead of command: {d_attr[:80]}")

		if current_cmd is None:
			break

		cmd = current_cmd
		upper = cmd.upper()
		relative = cmd.islower()
		arity = COMMAND_ARITY.get(upper)
		if arity is None:
			raise ValueError(f"Unsupported path command: {cmd}")

		if upper == "Z":
			segments.append(PathSegment("Z", ()))
			x, y = start_x, start_y
			last_c_ctrl = None
			last_q_ctrl = None
			current_cmd = None
			continue

		first_moveto = upper == "M"
		consumed_any = False
		while index < len(tokens):
			if is_command(tokens[index]):
				break
			nums = read_numbers(arity)
			if nums is None:
				break
			consumed_any = True

			if upper == "M":
				nx, ny = nums
				if relative:
					nx += x
					ny += y
				x, y = nx, ny
				start_x, start_y = x, y
				segments.append(PathSegment("M", (x, y)))
				# Subsequent coordinate pairs after M/m are implicit L/l.
				upper = "L"
				arity = COMMAND_ARITY[upper]
				current_cmd = "l" if relative else "L"
				last_c_ctrl = None
				last_q_ctrl = None
				continue

			if upper == "L":
				nx, ny = nums
				if relative:
					nx += x
					ny += y
				x, y = nx, ny
				segments.append(PathSegment("L", (x, y)))
				last_c_ctrl = None
				last_q_ctrl = None

			elif upper == "H":
				(nx,) = nums
				if relative:
					nx += x
				x = nx
				segments.append(PathSegment("L", (x, y)))
				last_c_ctrl = None
				last_q_ctrl = None

			elif upper == "V":
				(ny,) = nums
				if relative:
					ny += y
				y = ny
				segments.append(PathSegment("L", (x, y)))
				last_c_ctrl = None
				last_q_ctrl = None

			elif upper == "C":
				x1, y1, x2, y2, nx, ny = nums
				if relative:
					x1 += x; y1 += y; x2 += x; y2 += y; nx += x; ny += y
				segments.append(PathSegment("C", (x1, y1, x2, y2, nx, ny)))
				x, y = nx, ny
				last_c_ctrl = (x2, y2)
				last_q_ctrl = None

			elif upper == "S":
				x2, y2, nx, ny = nums
				if last_c_ctrl is None:
					x1, y1 = x, y
				else:
					x1, y1 = 2 * x - last_c_ctrl[0], 2 * y - last_c_ctrl[1]
				if relative:
					x2 += x; y2 += y; nx += x; ny += y
				segments.append(PathSegment("C", (x1, y1, x2, y2, nx, ny)))
				x, y = nx, ny
				last_c_ctrl = (x2, y2)
				last_q_ctrl = None

			elif upper == "Q":
				x1, y1, nx, ny = nums
				if relative:
					x1 += x; y1 += y; nx += x; ny += y
				segments.append(PathSegment("Q", (x1, y1, nx, ny)))
				x, y = nx, ny
				last_q_ctrl = (x1, y1)
				last_c_ctrl = None

			elif upper == "T":
				nx, ny = nums
				if last_q_ctrl is None:
					x1, y1 = x, y
				else:
					x1, y1 = 2 * x - last_q_ctrl[0], 2 * y - last_q_ctrl[1]
				if relative:
					nx += x; ny += y
				segments.append(PathSegment("Q", (x1, y1, nx, ny)))
				x, y = nx, ny
				last_q_ctrl = (x1, y1)
				last_c_ctrl = None

			elif upper == "A":
				rx, ry, rot, large, sweep, nx, ny = nums
				if relative:
					nx += x; ny += y
				segments.append(PathSegment("A", (rx, ry, rot, large, sweep, nx, ny)))
				x, y = nx, ny
				last_c_ctrl = None
				last_q_ctrl = None

			if first_moveto:
				first_moveto = False

		if not consumed_any and index < len(tokens) and not is_command(tokens[index]):
			raise ValueError(f"Could not parse path near token {tokens[index]!r}")

	return segments


def path_segments_to_d(segments: Iterable[PathSegment], dx: float = 0.0, dy: float = 0.0) -> str:
	parts: list[str] = []
	for seg in segments:
		cmd = seg.cmd
		nums = list(seg.nums)
		if cmd in {"M", "L"}:
			nums[0] += dx
			nums[1] += dy
		elif cmd == "C":
			nums[0] += dx; nums[1] += dy
			nums[2] += dx; nums[3] += dy
			nums[4] += dx; nums[5] += dy
		elif cmd == "Q":
			nums[0] += dx; nums[1] += dy
			nums[2] += dx; nums[3] += dy
		elif cmd == "A":
			# rx ry rot large sweep x y; only endpoint shifts.
			nums[5] += dx
			nums[6] += dy
		elif cmd == "Z":
			parts.append("Z")
			continue
		parts.append(cmd + " " + " ".join(fmt(n) for n in nums))
	return " ".join(parts)


def path_bbox_from_segments(segments: Iterable[PathSegment]) -> BBox | None:
	xs: list[float] = []
	ys: list[float] = []
	current_start: tuple[float, float] | None = None
	for seg in segments:
		cmd = seg.cmd
		nums = seg.nums
		if cmd == "M":
			xs.append(nums[0]); ys.append(nums[1])
			current_start = (nums[0], nums[1])
		elif cmd == "L":
			xs.append(nums[0]); ys.append(nums[1])
		elif cmd == "C":
			xs.extend([nums[0], nums[2], nums[4]])
			ys.extend([nums[1], nums[3], nums[5]])
		elif cmd == "Q":
			xs.extend([nums[0], nums[2]])
			ys.extend([nums[1], nums[3]])
		elif cmd == "A":
			# Endpoint approximation. Arc extrema are not solved.
			xs.append(nums[5]); ys.append(nums[6])
		elif cmd == "Z" and current_start is not None:
			xs.append(current_start[0]); ys.append(current_start[1])
	if not xs:
		return None
	return BBox(min(xs), min(ys), max(xs), max(ys))


def parse_points(points: str) -> list[tuple[float, float]]:
	nums = [float(x) for x in re.findall(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?", points)]
	return [(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]


def format_points(points: list[tuple[float, float]], dx: float, dy: float) -> str:
	return " ".join(f"{fmt(x + dx)},{fmt(y + dy)}" for x, y in points)


def element_bbox(elem: ET.Element) -> BBox | None:
	tag = local_name(elem.tag)
	if tag not in SHAPE_TAGS:
		return None
	if elem.attrib.get("display") == "none":
		return None
	if elem.attrib.get("fill") == "none" and elem.attrib.get("stroke") == "none":
		return None

	if tag == "path":
		d_attr = elem.attrib.get("d")
		if not d_attr:
			return None
		return path_bbox_from_segments(parse_path_to_absolute(d_attr))

	if tag == "rect":
		x = parse_float(elem.attrib.get("x"))
		y = parse_float(elem.attrib.get("y"))
		w = parse_float(elem.attrib.get("width"))
		h = parse_float(elem.attrib.get("height"))
		return BBox(x, y, x + w, y + h)

	if tag == "circle":
		cx = parse_float(elem.attrib.get("cx"))
		cy = parse_float(elem.attrib.get("cy"))
		r = parse_float(elem.attrib.get("r"))
		return BBox(cx - r, cy - r, cx + r, cy + r)

	if tag == "ellipse":
		cx = parse_float(elem.attrib.get("cx"))
		cy = parse_float(elem.attrib.get("cy"))
		rx = parse_float(elem.attrib.get("rx"))
		ry = parse_float(elem.attrib.get("ry"))
		return BBox(cx - rx, cy - ry, cx + rx, cy + ry)

	if tag == "line":
		x1 = parse_float(elem.attrib.get("x1"))
		y1 = parse_float(elem.attrib.get("y1"))
		x2 = parse_float(elem.attrib.get("x2"))
		y2 = parse_float(elem.attrib.get("y2"))
		return BBox(min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))

	if tag in {"polyline", "polygon"}:
		points = parse_points(elem.attrib.get("points", ""))
		if not points:
			return None
		xs = [p[0] for p in points]
		ys = [p[1] for p in points]
		return BBox(min(xs), min(ys), max(xs), max(ys))

	if tag == "text":
		x = parse_float(elem.attrib.get("x"))
		y = parse_float(elem.attrib.get("y"))
		return BBox(x, y, x, y)

	return None


def compute_bbox(root: ET.Element) -> BBox:
	bbox: BBox | None = None
	for elem in root.iter():
		if not isinstance(elem.tag, str):
			continue
		eb = element_bbox(elem)
		if eb is None:
			continue
		bbox = eb if bbox is None else bbox.union(eb)
	if bbox is None:
		raise ValueError("No drawable SVG elements found")
	return bbox


def shift_element(elem: ET.Element, dx: float, dy: float) -> None:
	tag = local_name(elem.tag)
	if tag == "path" and elem.attrib.get("d"):
		segments = parse_path_to_absolute(elem.attrib["d"])
		elem.set("d", path_segments_to_d(segments, dx, dy))
		return
	if tag in {"polyline", "polygon"} and elem.attrib.get("points"):
		elem.set("points", format_points(parse_points(elem.attrib["points"]), dx, dy))
		return
	for attr in COORD_ATTRS_X:
		if attr in elem.attrib:
			elem.set(attr, fmt(parse_float(elem.attrib[attr]) + dx))
	for attr in COORD_ATTRS_Y:
		if attr in elem.attrib:
			elem.set(attr, fmt(parse_float(elem.attrib[attr]) + dy))


def extract_pre_root_comments(source_text: str) -> list[str]:
	"""Return XML comments that appear before the <svg> root element.

    ElementTree's TreeBuilder(insert_comments=True) preserves comments inside
    the root only; comments between <?xml ...?> and <svg ...> are otherwise
    dropped on round-trip, stripping attribution credit lines.

    Args:
        source_text: Full raw text of an SVG file.

    Returns:
        Each captured comment as its full <!-- ... --> form, in source order.
    """
	pre_root_match = re.search(r"^(.*?)<svg\b", source_text, re.DOTALL)
	if not pre_root_match:
		return []
	return re.findall(r"<!--.*?-->", pre_root_match.group(1), re.DOTALL)


def _ascii_id(value: str, seen_ids: dict[str, str]) -> str:
	"""Return an ASCII replacement for a non-ASCII id or data-name attribute value.

	Checks seen_ids to avoid collisions within a single file. The mapping is
	recorded in seen_ids so in-file references can be updated consistently.

	Args:
		value: The original attribute value (may contain non-ASCII).
		seen_ids: Mutable dict mapping original value -> replacement (in-file state).

	Returns:
		An ASCII replacement string.
	"""
	if value in seen_ids:
		return seen_ids[value]
	# Strip or transliterate each character to its ASCII equivalent.
	# For layer-style ids with CJK characters we drop non-ASCII bytes;
	# for unknown scripts we fall back to removing non-ASCII entirely
	# and then deduplicate against already-seen names.
	import unicodedata
	ascii_chars: list[str] = []
	for ch in value:
		if ord(ch) < 128:
			# Already ASCII -- keep as-is.
			ascii_chars.append(ch)
		else:
			# Try NFKD decomposition first (e.g. accented Latin).
			decomposed = unicodedata.normalize("NFKD", ch)
			ascii_part = decomposed.encode("ascii", "ignore").decode("ascii")
			if ascii_part:
				ascii_chars.append(ascii_part)
			else:
				# Non-decomposable (e.g. CJK). Drop the character.
				pass
	candidate = "".join(ascii_chars).strip("_").strip()
	# If the entire value was non-ASCII and everything was dropped, use a
	# generic fallback name based on position.
	if not candidate:
		candidate = "layer"
	# Make ids valid XML NCNames: replace spaces with underscores for id attrs.
	# data-name values can keep spaces; we detect by whether there were underscores.
	# Simpler: just return the candidate with spaces preserved (caller decides).
	# Deduplicate: if candidate already taken by a *different* original, append counter.
	reverse = {v: k for k, v in seen_ids.items()}
	base = candidate
	counter = 2
	while candidate in reverse and reverse[candidate] != value:
		candidate = f"{base}_{counter}"
		counter += 1
	seen_ids[value] = candidate
	return candidate


def make_ascii_clean(root: ET.Element) -> None:
	"""Replace non-ASCII id and data-name attribute VALUES with ASCII equivalents.

	Also updates any in-file references (href="#...", xlink:href="#...",
	url(#...) in fill/stroke/clip-path/mask attributes) to match renamed ids.
	Other non-ASCII text content (comments, text nodes) is not touched here;
	the write step will raise if they remain.

	The function modifies *root* in place.

	Args:
		root: The parsed SVG root element.
	"""
	# First pass: collect all non-ASCII ids and build the rename map.
	# seen_ids maps original_value -> ascii_replacement (shared state for uniqueness).
	seen_ids: dict[str, str] = {}
	id_renames: dict[str, str] = {}
	for elem in root.iter():
		if not isinstance(elem.tag, str):
			continue
		for attr in ("id", "data-name"):
			val = elem.attrib.get(attr)
			if val is None:
				continue
			if any(ord(ch) >= 128 for ch in val):
				new_val = _ascii_id(val, seen_ids)
				id_renames[val] = new_val
				elem.set(attr, new_val)
	if not id_renames:
		# Nothing to fix; return early.
		return
	# Second pass: update references to renamed ids.
	# References appear in href="#id", xlink:href="#id",
	# and as url(#id) inside fill, stroke, clip-path, mask, filter attributes.
	ref_attrs = {"fill", "stroke", "clip-path", "mask", "filter", "marker-start",
		"marker-mid", "marker-end", "color-profile", "cursor", "href"}
	xlink_href = "{http://www.w3.org/1999/xlink}href"
	url_pat = re.compile(r"url\(#([^)]+)\)")
	for elem in root.iter():
		if not isinstance(elem.tag, str):
			continue
		# Handle xlink:href and href as direct fragment references.
		for attr_name in (xlink_href, "href"):
			val = elem.attrib.get(attr_name)
			if val and val.startswith("#"):
				frag = val[1:]
				if frag in id_renames:
					elem.set(attr_name, "#" + id_renames[frag])
		# Handle url(#id) in presentation attributes.
		for attr_name in ref_attrs:
			val = elem.attrib.get(attr_name)
			if not val:
				continue
			def replace_url_ref(m: re.Match) -> str:
				frag = m.group(1)
				return "url(#" + id_renames.get(frag, frag) + ")"
			new_val = url_pat.sub(replace_url_ref, val)
			if new_val != val:
				elem.set(attr_name, new_val)


#============================================
def normalize_svg_file(input_path: Path, output_path: Path, padding: float = 2.0) -> tuple[BBox, str]:
	"""Normalize an SVG: crop to drawn bbox, shift to origin, repad.

    Preserves attribution metadata: pre-root XML comments are re-injected on
    write; in-root comments survive via TreeBuilder(insert_comments=True);
    dc:/cc:/rdf: namespace prefixes survive via module-level registrations.

    Args:
        input_path: Path to source SVG.
        output_path: Path to write the normalized SVG.
        padding: Padding around drawn content, in user units. Default 2.

    Returns:
        Tuple of the original drawn BBox and the new viewBox string.
    """
	source_text = input_path.read_text(encoding="utf-8")
	pre_root_comments = extract_pre_root_comments(source_text)
	parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
	tree = ET.parse(input_path, parser=parser)
	root = tree.getroot()
	# Rename non-ASCII id/data-name values to ASCII and update in-file references.
	make_ascii_clean(root)
	bbox = compute_bbox(root)
	dx = -bbox.min_x + padding
	dy = -bbox.min_y + padding
	new_width = bbox.width + 2 * padding
	new_height = bbox.height + 2 * padding
	for elem in root.iter():
		if isinstance(elem.tag, str):
			shift_element(elem, dx, dy)
	root.set("viewBox", f"0 0 {fmt(new_width)} {fmt(new_height)}")
	# Width/height attrs often disagree with viewBox after cropping. Keep them in sync if present.
	if "width" in root.attrib:
		root.set("width", fmt(new_width))
	if "height" in root.attrib:
		root.set("height", fmt(new_height))
	output_path.parent.mkdir(parents=True, exist_ok=True)
	tree.write(output_path, encoding="unicode", xml_declaration=False)
	# Re-inject any pre-root comments stripped by the parser so attribution
	# lines like `<!-- Created by Author, CC-BY-3.0 -->` survive normalization.
	if pre_root_comments:
		written = output_path.read_text(encoding="utf-8")
		svg_index = written.find("<svg")
		if svg_index >= 0:
			preamble = written[:svg_index]
			rest = written[svg_index:]
			comment_block = "\n".join(pre_root_comments) + "\n"
			output_path.write_text(preamble + comment_block + rest, encoding="utf-8")
	return bbox, root.attrib["viewBox"]


def output_path_for(input_path: Path, output_dir: Path | None, suffix: str, in_place: bool) -> Path:
	if in_place:
		return input_path
	if output_dir is not None:
		return output_dir / input_path.name
	return input_path.with_name(f"{input_path.stem}{suffix}{input_path.suffix}")


def path_data_list(svg_path: Path) -> list[str]:
	root = ET.parse(svg_path).getroot()
	data: list[str] = []
	for elem in root.iter():
		if isinstance(elem.tag, str) and local_name(elem.tag) == "path" and elem.attrib.get("d"):
			data.append(elem.attrib["d"])
	return data


def assert_no_relative_hvz(svg_path: Path) -> None:
	bad: list[str] = []
	for d_attr in path_data_list(svg_path):
		found = re.findall(r"[hvz]", d_attr)
		if found:
			bad.append(d_attr)
	if bad:
		raise AssertionError(f"Output still contains lowercase h/v/z in {svg_path}: {bad[:2]}")


def write_svg(path: Path, body: str, view_box: str = "0 0 100 100") -> None:
	path.write_text(f'<svg xmlns="{SVG_NS}" viewBox="{view_box}">\n{body}\n</svg>\n', encoding="utf-8")


METADATA_FIXTURE = '''<?xml version="1.0" encoding="UTF-8"?>
<!-- Created by Test Author, CC-BY-3.0 -->
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:cc="http://creativecommons.org/ns#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     viewBox="0 0 100 100">
  <metadata>
    <rdf:RDF>
      <cc:Work rdf:about="">
        <dc:title>Test Asset</dc:title>
        <dc:creator><cc:Agent><dc:title>Test Author</dc:title></cc:Agent></dc:creator>
        <cc:license rdf:resource="https://creativecommons.org/licenses/by/3.0/"/>
        <dc:source>https://bioicons.com/</dc:source>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <title>Test Asset</title>
  <desc>Centrifuge icon by Test Author</desc>
  <rect x="10" y="10" width="80" height="80" fill="#333"/>
</svg>
'''


def run_self_test() -> int:
	temp_dir = Path(tempfile.mkdtemp(prefix="normalize-svg-v2-self-test-"))
	failures: list[str] = []
	try:
		fixtures = [
			("relative_hvz_rectangle.svg", '<path d="M 10 20 h 30 v 40 h -30 z" fill="#000" />', "0 0 34 44"),
			("relative_hvz_two_subpaths.svg", '<path d="M 10 20 h 30 v 10 z m 50 50 h 5 v 5 z" fill="#000" />', "0 0 59 59"),
			("mixed_absolute_relative.svg", '<path d="M 5 5 L 15 5 h 10 V 30 v 5 z" fill="#000" />', "0 0 24 34"),
			("clip_path.svg", '<defs><clipPath id="a"><path d="M-.08.08h136.877v393.601H-.08z" /></clipPath></defs><path clip-path="url(#a)" d="M 5 5 h 10 v 10 z" fill="#000" />', "0 0 140.877 397.601"),
			("relative_curves.svg", '<path d="M 10 10 c 5 0 5 10 10 10 q 5 5 10 0 s 4 4 8 0 t 8 0 z" fill="#000" />', None),
		]
		for name, body, expected_viewbox in fixtures:
			input_path = temp_dir / name
			output_path = temp_dir / f"{Path(name).stem}.normalized.svg"
			write_svg(input_path, body)
			try:
				_bbox, viewbox = normalize_svg_file(input_path, output_path, padding=2.0)
				ET.parse(output_path)
				assert_no_relative_hvz(output_path)
				if expected_viewbox is not None and viewbox != expected_viewbox:
					raise AssertionError(f"expected viewBox {expected_viewbox}, got {viewbox}")
			except Exception as exc:  # noqa: BLE001 - test runner should collect failures
				failures.append(f"{name}: {exc}")

		# Attribution metadata preservation: dc:/cc:/rdf: prefixes must survive
		# round-trip (not be renamed to ns0:/ns1:/...). Top-of-file XML comments
		# and <title>/<desc> must also survive. Without this fixture, a future
		# refactor could silently strip credit information from third-party SVGs.
		meta_in = temp_dir / "attribution_metadata.svg"
		meta_out = temp_dir / "attribution_metadata.normalized.svg"
		meta_in.write_text(METADATA_FIXTURE, encoding="utf-8")
		try:
			normalize_svg_file(meta_in, meta_out, padding=2.0)
			content = meta_out.read_text(encoding="utf-8")
			required = [
				("dc:creator", "<dc:creator"),
				("dc:title", "<dc:title"),
				("cc:license", "<cc:license"),
				("cc:Work", "<cc:Work"),
				("rdf:RDF", "<rdf:RDF"),
				("top XML comment", "Test Author, CC-BY-3.0"),
				("<title>", "<title>"),
				("<desc>", "<desc>"),
			]
			for label, needle in required:
				if needle not in content:
					raise AssertionError(f"attribution metadata lost: {label} not in normalized output")
			forbidden_prefixes = ("ns0:", "ns1:", "ns2:", "ns3:")
			for prefix in forbidden_prefixes:
				if prefix in content:
					raise AssertionError(f"namespace prefix renamed to {prefix} (lost canonical dc:/cc:/rdf:)")
		except Exception as exc:  # noqa: BLE001
			failures.append(f"attribution_metadata.svg: {exc}")

		if failures:
			print("SELF-TEST FAILED")
			for failure in failures:
				print(f"FAIL: {failure}")
			print(f"Temp dir kept for inspection: {temp_dir}")
			return 1
		print("SELF-TEST PASSED")
		shutil.rmtree(temp_dir)
		return 0
	except Exception:
		print(f"Temp dir kept for inspection: {temp_dir}")
		raise


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Self-contained SVG normalizer v2 with h/v/z support.",
		formatter_class=argparse.RawDescriptionHelpFormatter,
		epilog=(
			"Examples:\n"
			"  python3 test_normalize_svg_v2.py -i microtube_open_translucent.svg\n"
			"  python3 test_normalize_svg_v2.py -i microtube_open_translucent.svg -o normalized/\n"
			"  python3 test_normalize_svg_v2.py --self-test\n"
		),
	)
	parser.add_argument("-i", "--input", action="append", default=[], help="SVG input file. May be repeated.")
	parser.add_argument("-o", "--output-dir", type=Path, default=None, help="Directory for normalized SVGs.")
	parser.add_argument("--in-place", action="store_true", help="Overwrite input SVG files.")
	parser.add_argument("--suffix", default=".normalized", help="Output suffix when not using --output-dir. Default: .normalized")
	parser.add_argument("-p", "--padding", type=float, default=2.0, help="Padding around content in px. Default: 2")
	parser.add_argument("--self-test", action="store_true", help="Run built-in fixture tests.")
	parser.add_argument("--keep-relative", action="store_true", help=argparse.SUPPRESS)
	return parser.parse_args()


def main() -> int:
	args = parse_args()
	if args.self_test or not args.input:
		code = run_self_test()
		if code != 0 or not args.input:
			return code

	if args.output_dir is not None and args.in_place:
		print("ERROR: use either --output-dir or --in-place, not both", file=sys.stderr)
		return 2

	failed = False
	for input_text in args.input:
		input_path = Path(input_text)
		if not input_path.exists():
			print(f"ERROR: input not found: {input_path}", file=sys.stderr)
			failed = True
			continue
		if input_path.suffix.lower() != ".svg":
			print(f"ERROR: input is not an SVG: {input_path}", file=sys.stderr)
			failed = True
			continue
		out_path = output_path_for(input_path, args.output_dir, args.suffix, args.in_place)
		try:
			bbox, viewbox = normalize_svg_file(input_path, out_path, padding=args.padding)
			assert_no_relative_hvz(out_path)
			print(
				f"OK: {input_path} -> {out_path} | "
				f"bbox=({fmt(bbox.min_x)}, {fmt(bbox.min_y)}, {fmt(bbox.max_x)}, {fmt(bbox.max_y)}) | "
				f"viewBox={viewbox}"
			)
		except Exception as exc:  # noqa: BLE001 - command-line tool should report and continue
			print(f"FAIL: {input_path}: {exc}", file=sys.stderr)
			failed = True
	return 1 if failed else 0


if __name__ == "__main__":
	raise SystemExit(main())
