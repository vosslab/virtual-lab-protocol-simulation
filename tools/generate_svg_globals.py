#!/usr/bin/env python3
# generate_svg_globals.py
#
# Reads SVG files from assets/equipment/ and emits src/svg_globals.ts
# with one `export const SVG_<UPPER>: string = "<inline svg>"` per file.
#
# Replaces the legacy build_game.sh inline-injection step that the
# esbuild migration dropped. Without this, every SVG_* constant is the
# empty string and no equipment art renders.
#
# Transforms applied per SVG (matching legacy build_game.sh behavior):
#   1. strip XML declaration
#   2. strip Inkscape/Sodipodi namespace decls and attributes
#   3. strip <sodipodi:namedview .../> tags
#   4. namespace IDs with `<basename>__` prefix so multiple inlined
#      SVGs do not collide on shared id="body" / id="cap" / etc.
#   5. rewrite url(#foo) and href="#foo" to use the prefix
#
# Also injects CELL_CULTURE_PLATE_SVG from cell-culture2-clean.svg
# at the repo root if it exists.

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")
OUT_PATH = os.path.join(REPO_ROOT, "src", "svg_globals.ts")
PLATE_SVG = os.path.join(REPO_ROOT, "cell-culture2-clean.svg")


def transform_svg(svg_text, prefix):
	# strip XML declaration
	svg_text = re.sub(r"<\?xml[^?]*\?>", "", svg_text)
	# strip inkscape: and sodipodi: attributes
	svg_text = re.sub(r' inkscape:[a-zA-Z_-]+="[^"]*"', "", svg_text)
	svg_text = re.sub(r' sodipodi:[a-zA-Z_-]+="[^"]*"', "", svg_text)
	# strip xmlns:inkscape and xmlns:sodipodi declarations
	svg_text = re.sub(r' xmlns:inkscape="[^"]*"', "", svg_text)
	svg_text = re.sub(r' xmlns:sodipodi="[^"]*"', "", svg_text)
	# strip <sodipodi:namedview ... /> (single-line self-closing)
	svg_text = re.sub(r"<sodipodi:namedview[^>]*/>", "", svg_text)
	# strip <sodipodi:namedview ...> ... </sodipodi:namedview> blocks too
	svg_text = re.sub(
		r"<sodipodi:namedview\b[^>]*>.*?</sodipodi:namedview>",
		"",
		svg_text,
		flags=re.DOTALL,
	)
	# namespace ids
	svg_text = re.sub(r'id="([^"]*)"', lambda m: 'id="' + prefix + m.group(1) + '"', svg_text)
	# namespace url(#foo) refs
	svg_text = re.sub(r"url\(#([^)]*)\)", lambda m: "url(#" + prefix + m.group(1) + ")", svg_text)
	# namespace href="#foo" refs (covers both href and xlink:href)
	svg_text = re.sub(
		r'href="#([^"]*)"', lambda m: 'href="#' + prefix + m.group(1) + '"', svg_text
	)
	return svg_text


def extract_ids(svg_text):
	# return the list of every id attribute value found in the (un-namespaced)
	# raw svg text, in document order. Used to build the SVG_IDS manifest so
	# build-time validation can confirm patch targets exist.
	ids = re.findall(r'id="([^"]*)"', svg_text)
	return ids


def load_sidecar(basename):
	# look for an optional <basename>.colormap.json next to the svg. The file
	# declares semantic groups, e.g.:
	#   { "asset": "bottle", "groups": { "liquid": [{"id": "...", "opacity": 0.85}] } }
	# return None when not present so most assets stay sidecar-free.
	sidecar_path = os.path.join(ASSETS_DIR, basename + ".colormap.json")
	if not os.path.isfile(sidecar_path):
		return None
	with open(sidecar_path, "r", encoding="utf-8") as fh:
		data = json.load(fh)
	return data


def validate_sidecar(basename, sidecar, raw_ids):
	# raise on any sidecar entry whose id is not present in the source svg.
	# raw_ids are pre-namespacing ids; the namespacing happens in transform_svg.
	groups = sidecar.get("groups", {}) if isinstance(sidecar, dict) else {}
	id_set = set(raw_ids)
	for group_name, entries in groups.items():
		if not isinstance(entries, list):
			raise ValueError(
				"sidecar " + basename + ": group '" + group_name + "' must be a list"
			)
		for entry in entries:
			if not isinstance(entry, dict) or "id" not in entry:
				raise ValueError(
					"sidecar " + basename + ": entry in '" + group_name
					+ "' missing 'id' key"
				)
			if entry["id"] not in id_set:
				raise ValueError(
					"sidecar " + basename + ": id '" + entry["id"]
					+ "' in group '" + group_name + "' is not present in "
					+ basename + ".svg"
				)


def emit_const(out_lines, const_name, body):
	# template literal preserves newlines and double-quotes inside the
	# SVG without further escaping. We must still escape backticks and
	# `${` sequences so the literal does not terminate or interpolate.
	body = body.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
	out_lines.append("export const " + const_name + ": string = `" + body + "`;\n")


def main():
	if not os.path.isdir(ASSETS_DIR):
		print("ERROR: assets directory missing: " + ASSETS_DIR, file=sys.stderr)
		return 1

	# orphan sidecar guard: a <basename>.colormap.json with no matching
	# <basename>.svg means a deleted SVG left a stale sidecar behind. Fail
	# loudly so the inconsistency is fixed instead of silently no-oping.
	dir_files = os.listdir(ASSETS_DIR)
	svg_basenames = {f[:-4] for f in dir_files if f.endswith(".svg")}
	for f in dir_files:
		if not f.endswith(".colormap.json"):
			continue
		basename = f[:-len(".colormap.json")]
		if basename not in svg_basenames:
			print(
				"ERROR: sidecar " + f + " references missing "
				+ basename + ".svg; delete the orphan sidecar or restore "
				"the SVG.",
				file=sys.stderr,
			)
			return 2

	out_lines = []
	out_lines.append("// AUTO-GENERATED by tools/generate_svg_globals.py\n")
	out_lines.append("// Do not edit by hand. Regenerate via build_github_pages.sh.\n")
	out_lines.append("// Source: assets/equipment/*.svg + cell-culture2-clean.svg\n")
	out_lines.append("\n")

	svg_files = sorted(f for f in os.listdir(ASSETS_DIR) if f.endswith(".svg"))
	count = 0
	# build manifests as we iterate so we can emit them after the SVG constants.
	# both maps are keyed by basename (matches the prefix used in namespacing).
	id_manifest = {}
	group_manifest = {}
	for fname in svg_files:
		basename = fname[:-4]
		const_name = "SVG_" + basename.upper()
		prefix = basename + "__"
		with open(os.path.join(ASSETS_DIR, fname), "r", encoding="utf-8") as fh:
			raw = fh.read()
		# capture pre-namespacing ids first so sidecars can reference the
		# author-time names (the runtime ids include the prefix).
		raw_ids = extract_ids(raw)
		body = transform_svg(raw, prefix)
		emit_const(out_lines, const_name, body)
		count += 1
		# id manifest stores fully-namespaced runtime ids
		id_manifest[basename] = [prefix + raw_id for raw_id in raw_ids]
		# optional sidecar grouping
		sidecar = load_sidecar(basename)
		if sidecar is None:
			continue
		validate_sidecar(basename, sidecar, raw_ids)
		groups_out = {}
		for group_name, entries in sidecar.get("groups", {}).items():
			out_entries = []
			for entry in entries:
				ns_entry = {"id": prefix + entry["id"]}
				if "opacity" in entry:
					ns_entry["opacity"] = entry["opacity"]
				# attr field routes the recipe's role color to the fill
				# attribute (default) or the stroke attribute. Documented
				# in src/svg_color_patch.ts SvgColorPatch.strokeRole.
				if "attr" in entry:
					ns_entry["attr"] = entry["attr"]
				out_entries.append(ns_entry)
			groups_out[group_name] = out_entries
		group_manifest[basename] = groups_out

	# Special-case CELL_CULTURE_PLATE_SVG (legacy fallback artwork)
	if os.path.isfile(PLATE_SVG):
		with open(PLATE_SVG, "r", encoding="utf-8") as fh:
			plate_raw = fh.read()
		plate_body = transform_svg(plate_raw, "cell_culture_plate__")
		emit_const(out_lines, "CELL_CULTURE_PLATE_SVG", plate_body)
	else:
		out_lines.append('export const CELL_CULTURE_PLATE_SVG: string = "";\n')

	# emit SVG_IDS and SVG_GROUPS manifests so runtime + build-time validation
	# can confirm referenced ids exist in the generated artwork.
	out_lines.append("\n")
	out_lines.append("// Group entry shape used by SVG_GROUPS manifest entries.\n")
	out_lines.append(
		"// attr routes the recipe's role to fill (default) or stroke; see\n"
	)
	out_lines.append(
		"// src/svg_color_patch.ts SvgColorPatch.strokeRole.\n"
	)
	out_lines.append(
		"export type SvgGroupEntry = { id: string; opacity?: number; "
		'attr?: "fill" | "stroke" };\n'
	)
	out_lines.append("\n")
	out_lines.append(
		"export const SVG_IDS: Record<string, readonly string[]> = "
	)
	out_lines.append(json.dumps(id_manifest, indent=2, sort_keys=True))
	out_lines.append(";\n\n")
	out_lines.append(
		"export const SVG_GROUPS: Record<string, Record<string, "
		"readonly SvgGroupEntry[]>> = "
	)
	out_lines.append(json.dumps(group_manifest, indent=2, sort_keys=True))
	out_lines.append(";\n")

	with open(OUT_PATH, "w", encoding="utf-8") as fh:
		fh.writelines(out_lines)

	print(
		"Wrote " + OUT_PATH + " with " + str(count) + " equipment SVG constants, "
		+ str(len(id_manifest)) + " id manifests, "
		+ str(len(group_manifest)) + " group manifests."
	)
	return 0


if __name__ == "__main__":
	sys.exit(main())
