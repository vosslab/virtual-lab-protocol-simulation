# tests/test_svg_id_parity.py
#
# Verifies that the SVG_IDS manifest emitted by tools/generate_svg_globals.py
# stays in lock-step with the authored ids in assets/equipment/*.svg. The
# manifest backs build-time validation in src/svg_color_patch.ts; if it
# drifts the recolor pipeline can dispatch patches against a missing id.

import json
import os
import re

import git_file_utils

REPO_ROOT = git_file_utils.get_repo_root()
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")
GLOBALS_TS = os.path.join(REPO_ROOT, "src", "svg_globals.ts")


#============================================
def _load_manifest() -> dict:
	# extract SVG_IDS = {...}; from the generated TS file. We do not parse the
	# whole TS module; the manifest is a JSON literal so json.loads works.
	text = open(GLOBALS_TS, "r", encoding="utf-8").read()
	match = re.search(
		r"SVG_IDS:\s*Record<[^>]+>\s*=\s*(\{.*?\});",
		text,
		re.DOTALL,
	)
	assert match is not None, "SVG_IDS manifest not found in svg_globals.ts"
	return json.loads(match.group(1))


#============================================
def _extract_ids(svg_path: str) -> list[str]:
	# pre-namespacing ids exactly as authored in the source file
	raw = open(svg_path, "r", encoding="utf-8").read()
	return re.findall(r'id="([^"]*)"', raw)


#============================================
def test_every_asset_has_manifest_entry() -> None:
	manifest = _load_manifest()
	for fname in sorted(os.listdir(ASSETS_DIR)):
		if not fname.endswith(".svg"):
			continue
		basename = fname[:-4]
		assert basename in manifest, (
			"missing SVG_IDS entry for " + basename
			+ "; regenerate via tools/generate_svg_globals.py"
		)


#============================================
def test_manifest_ids_match_source() -> None:
	manifest = _load_manifest()
	for fname in sorted(os.listdir(ASSETS_DIR)):
		if not fname.endswith(".svg"):
			continue
		basename = fname[:-4]
		prefix = basename + "__"
		expected = [prefix + raw_id for raw_id in _extract_ids(
			os.path.join(ASSETS_DIR, fname)
		)]
		actual = manifest[basename]
		assert actual == expected, (
			"SVG_IDS mismatch for " + basename + "\n"
			+ "expected: " + str(expected) + "\n"
			+ "actual:   " + str(actual)
		)


#============================================
def test_t75_residue_id_present() -> None:
	manifest = _load_manifest()
	assert "t75_flask__liquid_residue" in manifest["t75_flask"], (
		"liquid_residue missing from t75_flask manifest"
	)
