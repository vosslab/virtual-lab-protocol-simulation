// node tests/test_svg_pipeline.mjs (run from repo root)
//
// M6 manifest-integrity tests for the SVG asset pipeline. Verifies the
// invariants that bind src/svg_assets.ts (composition facade) to the
// generated/svg_manifest.ts (SVG_IDS, SVG_GROUPS) plus the patch recipes
// in src/svg_recipes.ts, so a misconfiguration upstream fails this test
// before it can throw at runtime in the user's browser.
//
// The standalone determinism + coverage gate lives in
// tools/check_svg_pipeline.py and is invoked by check_codebase.sh; this
// file owns the JS-side semantic gates.

import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

import { importTsModule } from "./_compile_for_test.mjs";
import { REPO_ROOT } from "./playwright/repo_root.mjs";

//============================================
// Modules under test. svg_assets is the public composition facade; the
// generated manifest is its only legitimate generated/ consumer aside
// from svg_color_patch. svg_recipes owns the state-to-patch enums.
const svgAssets = await importTsModule("src/svg_assets.ts");
const svgRecipes = await importTsModule("src/svg_recipes.ts");
const svgColorPatch = await importTsModule("src/svg_color_patch.ts");
const liquidTransfer = await importTsModule("src/scenes/shared/liquid_transfer.ts");

//============================================
// The generated manifest is plain JSON-shaped TS. Bundling through esbuild
// resolves the relative import without needing a separate test for it.
// We pull SVG_IDS / SVG_GROUPS by importing svg_color_patch (which already
// re-exports nothing of the manifest) and via a small dedicated entry that
// goes through esbuild bundling like the other modules.
const manifestModule = await importTsModule("generated/svg_manifest.ts");
const SVG_IDS = manifestModule.SVG_IDS;
const SVG_GROUPS = manifestModule.SVG_GROUPS;

//============================================
// EQUIPMENT_ASSETS is intentionally not exported by svg_assets.ts (the
// public surface is renderEquipmentSvg + getStaticSvg + getAssetAspectRatio).
// We rebuild the alias <-> canonical map by iterating the layout-only ids
// surfaced through scene YAMLs; this is the same set of ids that scene
// callers pass into renderEquipmentSvg.
//
// Layout aliases (same set as src/svg_assets.ts EQUIPMENT_ASSETS extras).
const LAYOUT_ALIASES_TO_CANONICAL = {
	flask:                "t75_flask",
	well_plate:           "well_plate_24",
	well_plate_96:        "96well_pcr_plate",
	ethanol_bottle:       "ethanol_spray",
	serological_pipette:  "sero_pipette",
	drug_vials:           "drug_vial_rack",
	media_bottle:         "bottle",
	pbs_bottle:           "bottle",
	trypsin_bottle:       "bottle",
	dmso_bottle:          "bottle",
	sterile_water:        "bottle",
	carboplatin_stock:    "bottle",
	metformin_stock:      "bottle",
};

// Canonical equipment ids that have their own SVG_IDS entry.
const CANONICAL_EQUIPMENT_IDS = [
	"angry_professor", "aspirating_pipette", "biohazard_decant", "bottle",
	"cell_counter", "centrifuge", "conical_15ml_rack", "dilution_tube_rack",
	"drug_vial_rack", "ethanol_spray", "glove_box", "incubator",
	"micropipette_rack", "microscope", "mtt_vial", "multichannel_pipette",
	"plate_reader", "sero_pipette", "t75_flask", "tip_box", "vortex",
	"waste_container", "waste_tray", "water_bath",
];

let testCount = 0;
function pass(label) {
	testCount += 1;
	console.log("  PASS [" + testCount + "] " + label);
}

//============================================
// Test 1: every canonical equipment id surfaces a SVG_IDS entry.
// Catches drift if a generator change drops a manifest section.
{
	for (const id of CANONICAL_EQUIPMENT_IDS) {
		assert.ok(
			Object.prototype.hasOwnProperty.call(SVG_IDS, id),
			"SVG_IDS missing canonical id: " + id,
		);
	}
	pass("canonical equipment ids all present in SVG_IDS");
}

//============================================
// Test 2: every layout alias resolves through the curated canonical map
// to a real SVG_IDS key. Catches a misnamed alias mapping in svg_assets.ts.
{
	for (const [alias, canonical] of Object.entries(LAYOUT_ALIASES_TO_CANONICAL)) {
		assert.ok(
			Object.prototype.hasOwnProperty.call(SVG_IDS, canonical),
			"alias '" + alias + "' resolves to canonical '" + canonical
			+ "' which is missing from SVG_IDS",
		);
	}
	pass("layout aliases all resolve to canonical ids present in SVG_IDS");
}

//============================================
// Test 3: every patch id produced by flaskResiduePatches across all
// T75LiquidVisual enum values targets a real id in SVG_IDS["t75_flask"].
{
	const flaskStates = ["dirty", "empty", "clean", "freshMedia", "oldMedia"];
	for (const state of flaskStates) {
		const patches = svgRecipes.flaskResiduePatches(state);
		// validatePatchIds throws on any unknown id; passing means clean.
		svgColorPatch.validatePatchIds("t75_flask", patches);
	}
	pass("flaskResiduePatches targets are present in SVG_IDS for all T75LiquidVisual states");
}

//============================================
// Test 4: every patch id produced by bottleLiquidPatches across all
// BottleLiquid enum values targets a real id in SVG_IDS["bottle"].
{
	const bottleLiquids = [
		"media", "pbs", "trypsin", "dmso", "sterileWater",
		"ethanol", "carboplatin", "metformin",
	];
	for (const liquid of bottleLiquids) {
		const patches = svgRecipes.bottleLiquidPatches(liquid);
		assert.ok(patches.length > 0, "bottleLiquidPatches('" + liquid + "') returned no patches");
		svgColorPatch.validatePatchIds("bottle", patches);
	}
	pass("bottleLiquidPatches targets are present in SVG_IDS for all BottleLiquid states");
}

//============================================
// Test 5: every entry in SVG_GROUPS["bottle"]["liquid"] resolves to a real
// id in SVG_IDS["bottle"]. Same for any other groups present.
{
	const bottleIds = new Set(SVG_IDS["bottle"]);
	const bottleGroups = SVG_GROUPS["bottle"];
	assert.ok(bottleGroups !== undefined, "SVG_GROUPS['bottle'] missing");
	const liquidGroup = bottleGroups["liquid"];
	assert.ok(liquidGroup !== undefined, "SVG_GROUPS['bottle']['liquid'] missing");
	assert.ok(liquidGroup.length > 0, "bottle.liquid group is empty");
	for (const entry of liquidGroup) {
		assert.ok(
			bottleIds.has(entry.id),
			"bottle.liquid group entry id '" + entry.id + "' missing from SVG_IDS['bottle']",
		);
	}
	// Walk every other (asset, group) pair the manifest knows about.
	for (const [asset, groups] of Object.entries(SVG_GROUPS)) {
		const assetIds = new Set(SVG_IDS[asset]);
		assert.ok(
			SVG_IDS[asset] !== undefined,
			"SVG_GROUPS asset '" + asset + "' has no matching SVG_IDS entry",
		);
		for (const [groupName, entries] of Object.entries(groups)) {
			for (const entry of entries) {
				assert.ok(
					assetIds.has(entry.id),
					"group '" + asset + "." + groupName + "' entry id '"
					+ entry.id + "' missing from SVG_IDS['" + asset + "']",
				);
			}
		}
	}
	pass("SVG_GROUPS entries all resolve to ids in SVG_IDS");
}

//============================================
// Test 6: every asset id used by scene YAML files has either a generated
// SVG export OR is a layout alias resolvable through the curated map.
// Reads the YAMLs as plain text and pulls `svgAsset:` values without
// requiring js-yaml as a dep. The closing colon and value parse rule
// (single-line `svgAsset: <name>` per the existing scene YAMLs) is
// enforced by the scene-data builder, so a regex is durable here.
{
	const sceneYamls = [
		"src/scenes/cell_culture_hood/cell_culture_hood.yaml",
		"src/scenes/bench/bench.yaml",
		"src/scenes/incubator/incubator.yaml",
		"src/scenes/microscope/microscope.yaml",
		"src/scenes/plate/plate.yaml",
		"src/scenes/plate_reader/plate_reader.yaml",
	];
	const sceneAssetIds = new Set();
	for (const rel of sceneYamls) {
		const full = path.join(REPO_ROOT, rel);
		if (!fs.existsSync(full)) {
			continue;
		}
		const text = fs.readFileSync(full, "utf8");
		const matches = text.matchAll(/^\s*svgAsset:\s*(\S+)\s*$/gm);
		for (const m of matches) {
			sceneAssetIds.add(m[1]);
		}
	}
	assert.ok(sceneAssetIds.size > 0, "no svgAsset values found in scene YAMLs");
	const knownIds = new Set([
		...CANONICAL_EQUIPMENT_IDS,
		...Object.keys(LAYOUT_ALIASES_TO_CANONICAL),
	]);
	const unknown = [];
	for (const id of sceneAssetIds) {
		if (!knownIds.has(id)) {
			unknown.push(id);
		}
	}
	assert.deepEqual(
		unknown, [],
		"scene YAML svgAsset values not covered by EQUIPMENT_ASSETS: " + unknown.join(", "),
	);
	pass("every scene YAML svgAsset value resolves to an EQUIPMENT_ASSETS id");
}

//============================================
// Test 7: getStaticSvg throws on unknown asset id.
{
	assert.throws(
		() => svgAssets.getStaticSvg("definitely_not_a_real_id_xyz"),
		/unknown asset id/,
		"getStaticSvg unknown id should throw",
	);
	pass("getStaticSvg throws on unknown asset id");
}

//============================================
// Test 8: getAssetAspectRatio throws on unknown asset id.
{
	assert.throws(
		() => svgAssets.getAssetAspectRatio("definitely_not_a_real_id_xyz"),
		/unknown asset id/,
		"getAssetAspectRatio unknown id should throw",
	);
	pass("getAssetAspectRatio throws on unknown asset id");
}

//============================================
// Test 9: every bottle-alias key in EQUIPMENT_ASSETS has a matching entry
// in LIQUID_BY_ASSET_ID. This verifies the precondition that keeps the
// `liquidForBottleAlias` throw-helper from firing in production. The
// throw helper is a defensive design (loud failure if the map drifts);
// this test catches the drift before it ships.
{
	const bottleAliases = [
		"media_bottle", "pbs_bottle", "trypsin_bottle", "dmso_bottle",
		"sterile_water", "carboplatin_stock", "metformin_stock",
	];
	const liquidMap = liquidTransfer.LIQUID_BY_ASSET_ID;
	for (const alias of bottleAliases) {
		assert.ok(
			Object.prototype.hasOwnProperty.call(liquidMap, alias),
			"bottle alias '" + alias + "' missing from LIQUID_BY_ASSET_ID;"
			+ " liquidForBottleAlias would throw at runtime",
		);
	}
	// And no orphan entries: every key in LIQUID_BY_ASSET_ID should match a
	// known bottle alias (catches a misspelled alias on the recipe side).
	for (const key of Object.keys(liquidMap)) {
		assert.ok(
			bottleAliases.includes(key),
			"LIQUID_BY_ASSET_ID has key '" + key + "' that is not a known bottle alias",
		);
	}
	pass("LIQUID_BY_ASSET_ID covers every bottle alias and has no orphan entries");
}

//============================================
// Test 10: renderEquipmentSvg dispatches every bottle alias to a non-empty
// recolored SVG (sanity smoke for the throw-protected path).
{
	const bottleAliases = [
		"media_bottle", "pbs_bottle", "trypsin_bottle", "dmso_bottle",
		"sterile_water", "carboplatin_stock", "metformin_stock",
	];
	for (const alias of bottleAliases) {
		const svg = svgAssets.renderEquipmentSvg({ assetId: alias });
		assert.ok(
			typeof svg === "string" && svg.length > 0,
			"renderEquipmentSvg('" + alias + "') returned empty string",
		);
		// Must contain an <svg> open tag; rules out an accidental fallback
		// to "" without going through the recolor path.
		assert.match(svg, /<svg/, "renderEquipmentSvg('" + alias + "') has no <svg>");
	}
	pass("renderEquipmentSvg returns non-empty SVG for every bottle alias");
}

console.log("svg_pipeline: " + testCount + " tests passed");
