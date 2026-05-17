#!/usr/bin/env python3
# generate_svg_globals.py
#
# Reads SVG files from assets/equipment/ and emits:
# 1. generated/svg_assets/*.ts (one per SVG, per-asset split)
# 2. generated/svg_assets/index.ts (barrel re-export)
# 3. generated/svg_manifest.ts (SVG_IDS and SVG_GROUPS only)
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

import argparse
import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")
PLATE_SVG = os.path.join(REPO_ROOT, "cell-culture2-clean.svg")

# Default output directory; overridable via --out-dir
DEFAULT_OUT_DIR = os.path.join(REPO_ROOT, "generated")

# Canonical generated file header
GENERATED_HEADER = "// Generated file. Do not edit by hand.\n// Source: assets/equipment/*.svg\n// Generator: tools/generate_svg_globals.py\n"


#============================================


#============================================

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


#============================================

def extract_ids(svg_text):
	# return the list of every id attribute value found in the (un-namespaced)
	# raw svg text, in document order. Used to build the SVG_IDS manifest so
	# build-time validation can confirm patch targets exist.
	ids = re.findall(r'id="([^"]*)"', svg_text)
	return ids


#============================================

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


#============================================

def validate_sidecar(basename, sidecar, raw_ids):
	# raise on any sidecar entry whose id is not present in the source svg.
	# raw_ids are pre-namespacing ids; the namespacing happens in transform_svg.
	groups = sidecar["groups"]
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


#============================================

def normalize_module_name(basename):
	# Normalize a basename to a Python/TypeScript module name.
	# Replace hyphens with underscores; used for name-collision detection.
	return basename.replace("-", "_")


#============================================

def check_name_collisions(asset_list):
	# Detect if any two source basenames normalize to the same module name.
	# asset_list: list of (basename, ...) tuples.
	norm_map = {}
	for basename, _, _, in asset_list:
		norm = normalize_module_name(basename)
		if norm in norm_map:
			raise ValueError(
				"Name collision: both " + norm_map[norm] + " and " + basename
				+ " normalize to module name " + norm + ". Rename or remove one."
			)
		norm_map[norm] = basename


#============================================

def emit_per_asset_file(out_dir, basename, const_name, body):
	# Emit one file under out_dir/svg_assets/<name>.ts
	assets_dir = os.path.join(out_dir, "svg_assets")
	os.makedirs(assets_dir, exist_ok=True)
	module_name = normalize_module_name(basename)
	file_path = os.path.join(assets_dir, module_name + ".ts")
	# template literal preserves newlines and double-quotes inside the
	# SVG without further escaping. We must still escape backticks,
	# `${` sequences, and backslashes so the literal does not terminate,
	# interpolate, or mis-escape.
	body = body.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
	lines = []
	lines.append(GENERATED_HEADER)
	lines.append("\n")
	lines.append("export const " + const_name + ": string = `" + body + "`;\n")
	with open(file_path, "w", encoding="utf-8") as fh:
		fh.writelines(lines)


#============================================

def emit_barrel(out_dir, asset_list):
	# Emit index.ts barrel file that re-exports all SVG_<NAME> constants.
	# asset_list: list of (basename, const_name, ...) tuples.
	assets_dir = os.path.join(out_dir, "svg_assets")
	os.makedirs(assets_dir, exist_ok=True)
	index_path = os.path.join(assets_dir, "index.ts")
	lines = []
	lines.append(GENERATED_HEADER)
	lines.append("\n")
	# Sort by module name (normalized basename) for determinism
	sorted_assets = sorted(asset_list, key=lambda x: normalize_module_name(x[0]))
	for basename, const_name, _, in sorted_assets:
		module_name = normalize_module_name(basename)
		lines.append("export { " + const_name + " } from \"./" + module_name + "\";\n")
	with open(index_path, "w", encoding="utf-8") as fh:
		fh.writelines(lines)


#============================================

def emit_manifest(out_dir, id_manifest, group_manifest):
	# Emit svg_manifest.ts with SVG_IDS and SVG_GROUPS, plus the SvgGroupEntry type.
	manifest_path = os.path.join(out_dir, "svg_manifest.ts")
	lines = []
	lines.append(GENERATED_HEADER)
	lines.append("\n")
	lines.append("// Group entry shape used by SVG_GROUPS manifest entries.\n")
	lines.append(
		"// attr routes the recipe's role to fill (default) or stroke; see\n"
	)
	lines.append(
		"// src/svg_color_patch.ts SvgColorPatch.strokeRole.\n"
	)
	lines.append(
		"export type SvgGroupEntry = { id: string; opacity?: number; "
		'attr?: "fill" | "stroke" };\n'
	)
	lines.append("\n")
	lines.append(
		"export const SVG_IDS: Record<string, readonly string[]> = "
	)
	lines.append(json.dumps(id_manifest, indent=2, sort_keys=True))
	lines.append(";\n\n")
	lines.append(
		"export const SVG_GROUPS: Record<string, Record<string, "
		"readonly SvgGroupEntry[]>> = "
	)
	lines.append(json.dumps(group_manifest, indent=2, sort_keys=True))
	lines.append(";\n")
	with open(manifest_path, "w", encoding="utf-8") as fh:
		fh.writelines(lines)


#============================================

def clear_stale_assets(out_dir):
	# Remove stale *.ts files from out_dir/svg_assets/ before writing new ones.
	# Only removes .ts files from that specific subdirectory, never deletes the
	# whole generated/ tree.
	assets_dir = os.path.join(out_dir, "svg_assets")
	if not os.path.isdir(assets_dir):
		return
	for fname in os.listdir(assets_dir):
		if fname.endswith(".ts"):
			fpath = os.path.join(assets_dir, fname)
			if os.path.isfile(fpath):
				os.remove(fpath)


#============================================

def main():
	parser = argparse.ArgumentParser(description="Generate SVG asset constants and manifests")
	parser.add_argument(
		"--out-dir",
		dest="out_dir",
		default=DEFAULT_OUT_DIR,
		help="Output directory for generated/ tree (default: " + DEFAULT_OUT_DIR + ")"
	)
	args = parser.parse_args()

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

	# Load and process all SVG assets
	svg_files = sorted(f for f in os.listdir(ASSETS_DIR) if f.endswith(".svg"))
	asset_list = []  # list of (basename, const_name, body) tuples
	count = 0
	id_manifest = {}
	group_manifest = {}

	for fname in svg_files:
		basename = fname[:-4]
		# Use the normalized module name for the const so hyphenated basenames
		# (e.g. `foo-bar.svg`) produce a valid TS identifier (`SVG_FOO_BAR`)
		# instead of the invalid `SVG_FOO-BAR`.
		const_name = "SVG_" + normalize_module_name(basename).upper()
		prefix = basename + "__"
		with open(os.path.join(ASSETS_DIR, fname), "r", encoding="utf-8") as fh:
			raw = fh.read()
		# capture pre-namespacing ids first so sidecars can reference the
		# author-time names (the runtime ids include the prefix).
		raw_ids = extract_ids(raw)
		body = transform_svg(raw, prefix)
		asset_list.append((basename, const_name, body))
		count += 1
		# id manifest stores fully-namespaced runtime ids
		id_manifest[basename] = [prefix + raw_id for raw_id in raw_ids]
		# optional sidecar grouping
		sidecar = load_sidecar(basename)
		if sidecar is None:
			continue
		validate_sidecar(basename, sidecar, raw_ids)
		groups_out = {}
		for group_name, entries in sidecar["groups"].items():
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

	# Check for name collisions in normalized module names
	check_name_collisions(asset_list)

	# Special-case CELL_CULTURE_PLATE_SVG (legacy fallback artwork)
	if os.path.isfile(PLATE_SVG):
		with open(PLATE_SVG, "r", encoding="utf-8") as fh:
			plate_raw = fh.read()
		plate_body = transform_svg(plate_raw, "cell_culture_plate__")
		# Add plate to asset_list so it gets emitted in per-asset split
		asset_list.append(("cell_culture_plate", "CELL_CULTURE_PLATE_SVG", plate_body))
		id_manifest["cell_culture_plate"] = []  # No IDs in the plate; it's a fallback
		group_manifest["cell_culture_plate"] = {}

	# Emit split output to generated/
	out_dir = args.out_dir
	os.makedirs(out_dir, exist_ok=True)

	# Clear stale per-asset files
	clear_stale_assets(out_dir)

	# Emit per-asset files for all SVGs (including plate)
	equipment_count = 0
	for basename, const_name, body, in asset_list:
		emit_per_asset_file(out_dir, basename, const_name, body)
		equipment_count += 1

	# Emit barrel (index.ts)
	emit_barrel(out_dir, asset_list)

	# Emit manifest (svg_manifest.ts)
	emit_manifest(out_dir, id_manifest, group_manifest)

	print(
		"Wrote " + str(equipment_count) + " per-asset files to "
		+ out_dir + "/svg_assets/, plus index.ts barrel and svg_manifest.ts ("
		+ str(len(id_manifest)) + " id manifests, "
		+ str(len(group_manifest)) + " group manifests; "
		+ str(count) + " equipment SVGs)."
	)
	return 0


if __name__ == "__main__":
	sys.exit(main())
