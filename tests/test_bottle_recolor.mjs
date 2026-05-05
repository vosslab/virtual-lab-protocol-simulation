// node tests/test_bottle_recolor.mjs (run from repo root)
//
// Verifies the consolidated bottle pipeline by exercising the REAL
// production code (svg_color_patch + svg_recipes), not a hand-mirrored
// copy. For each BottleLiquid value, calls bottleLiquidPatches() and
// applyPatches() on SVG_BOTTLE, then asserts that every grouped id
// receives the expected role hex on its open tag.

import assert from "node:assert/strict";
import { importTsModule } from "./_compile_for_test.mjs";

const recipes = await importTsModule("src/svg_recipes.ts");
const colorPatch = await importTsModule("src/svg_color_patch.ts");
const styleConsts = await importTsModule("src/style_constants.ts");
const globals = await importTsModule("src/svg_globals.ts");

const { bottleLiquidPatches } = recipes;
const { applyPatches } = colorPatch;
const { COLOR_MAP } = styleConsts;
const { SVG_BOTTLE, SVG_GROUPS } = globals;

assert.ok(SVG_BOTTLE && SVG_BOTTLE.length > 0, "SVG_BOTTLE must be present");
assert.ok(SVG_GROUPS.bottle, "bottle group manifest must exist");
const liquidGroup = SVG_GROUPS.bottle.liquid;
assert.ok(Array.isArray(liquidGroup) && liquidGroup.length > 0,
	"bottle.liquid group should not be empty");

// BottleLiquid -> ColorRole (mirrors svg_recipes.ts BOTTLE_LIQUID_ROLE).
// Listed here so we exercise every role; the test is the contract owner.
const BOTTLE_ROLE = {
	media:        "media",
	pbs:          "pbs",
	trypsin:      "trypsin",
	dmso:         "dmso",
	sterileWater: "buffer",
	ethanol:      "ethanol",
	carboplatin:  "carboplatin",
	metformin:    "metformin",
};

// Find an element's open tag substring by id.
function tagFor(svg, id) {
	const idx = svg.indexOf('id="' + id + '"');
	if (idx < 0) return null;
	let start = idx;
	while (start > 0 && svg.charAt(start) !== "<") start -= 1;
	const end = svg.indexOf(">", start);
	return svg.slice(start, end + 1);
}

// Sanity: every sidecar id resolves to a real element in SVG_BOTTLE
for (const entry of liquidGroup) {
	assert.ok(
		tagFor(SVG_BOTTLE, entry.id) !== null,
		"sidecar id " + entry.id + " missing from SVG_BOTTLE",
	);
}

// Drive the production recipe + patcher for each BottleLiquid value
const liquids = Object.keys(BOTTLE_ROLE);
let assertions = 0;
for (const liquid of liquids) {
	const role = BOTTLE_ROLE[liquid];
	const expectedHex = COLOR_MAP[role];
	const patches = bottleLiquidPatches(liquid);
	const out = applyPatches(SVG_BOTTLE, patches);
	for (const entry of liquidGroup) {
		const tag = tagFor(out, entry.id);
		assert.ok(tag, liquid + ": tag for " + entry.id + " not found post-patch");
		// the role hex shows up on either fill or stroke depending on attr
		const carriesFill = tag.includes('fill="' + expectedHex + '"');
		const carriesStroke = tag.includes('stroke="' + expectedHex + '"');
		assert.ok(
			carriesFill || carriesStroke,
			liquid + ": " + entry.id + " did not get role hex " + expectedHex
				+ "\n  tag=" + tag,
		);
		if (entry.opacity !== undefined) {
			assert.ok(
				tag.includes('opacity="' + entry.opacity + '"'),
				liquid + ": " + entry.id + " missing opacity " + entry.opacity
					+ "\n  tag=" + tag,
			);
		}
		assertions += 1;
	}
}

console.log(
	"bottle_recolor: " + liquids.length + " liquids x "
	+ liquidGroup.length + " grouped ids = " + assertions
	+ " assertions verified (production module imported)",
);
