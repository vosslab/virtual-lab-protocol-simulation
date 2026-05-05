// node tests/test_svg_color_patch.mjs (run from repo root)
//
// Imports applyPatches and expandGroupPatch from the real
// src/svg_color_patch.ts via esbuild compilation. The previous version
// re-implemented the algorithm in test code, which meant the tests stayed
// green even if the production module broke. This version exercises the
// production code path.

import assert from "node:assert/strict";
import { importTsModule } from "./_compile_for_test.mjs";

const colorPatch = await importTsModule("src/svg_color_patch.ts");
const { applyPatches, expandGroupPatch, validatePatchIds } = colorPatch;

// Test 1: replace existing fill on a self-closing rect via fillRole
{
	// COLOR_MAP['media'] is "#f7a6b8" -- expand into an SVG that has the
	// matching id, then apply a fill patch.
	const svg = '<svg><rect id="t75_flask__liquid_residue" x="0" y="0" fill="#000" /></svg>';
	const out = applyPatches(svg, [
		{ id: "t75_flask__liquid_residue", fillRole: "media" },
	]);
	assert.match(out, /id="t75_flask__liquid_residue"[^>]* fill="#f7a6b8"/);
}

// Test 2: insert opacity when absent
{
	const svg = '<svg><path id="t75_flask__liquid_residue" d="M0 0 L1 1"/></svg>';
	const out = applyPatches(svg, [
		{ id: "t75_flask__liquid_residue", opacity: 0.35 },
	]);
	assert.match(out, /id="t75_flask__liquid_residue"[^>]* opacity="0.35"/);
}

// Test 3: both fill and opacity, replace existing
{
	const svg = '<svg><rect id="bottle__liquid_base" fill="#fff" opacity="1" /></svg>';
	const out = applyPatches(svg, [
		{ id: "bottle__liquid_base", fillRole: "residue", opacity: 0.5 },
	]);
	assert.match(out, /fill="#c69a3a"/);
	assert.match(out, /opacity="0.5"/);
}

// Test 4: missing id throws
{
	const svg = '<svg></svg>';
	let threw = false;
	try {
		applyPatches(svg, [{ id: "nope", fillRole: "media" }]);
	} catch (err) {
		threw = true;
	}
	assert.equal(threw, true);
}

// Test 5: nested sibling with same attribute name is not affected
{
	const svg = '<svg><g id="bottle__outer" opacity="0.1"><rect id="bottle__inner" opacity="1"/></g></svg>';
	const out = applyPatches(svg, [{ id: "bottle__inner", opacity: 0.5 }]);
	assert.match(out, /id="bottle__outer" opacity="0.1"/);
	assert.match(out, /id="bottle__inner" opacity="0.5"/);
}

// Test 6: stroke routing via strokeRole
{
	const svg = '<svg><path id="bottle__liquid_stroke" stroke="#000" fill="none" /></svg>';
	const out = applyPatches(svg, [
		{ id: "bottle__liquid_stroke", strokeRole: "media" },
	]);
	assert.match(out, /id="bottle__liquid_stroke"[^>]* stroke="#f7a6b8"/);
	// fill must remain "none"
	assert.match(out, /fill="none"/);
}

// Test 7: validatePatchIds against the real SVG_IDS manifest
{
	// The bottle's authored ids include the residue object on T75, so a
	// patch list referencing only that id should validate cleanly.
	validatePatchIds("t75_flask", [
		{ id: "t75_flask__liquid_residue", opacity: 0 },
	]);
	// And referencing an unknown id must throw with a clear message
	let threw = false;
	try {
		validatePatchIds("t75_flask", [
			{ id: "t75_flask__not_a_real_id" },
		]);
	} catch (err) {
		threw = true;
	}
	assert.equal(threw, true);
}

// Test 8: expandGroupPatch returns one SvgColorPatch per id in the group
{
	const expanded = expandGroupPatch({
		asset: "bottle",
		group: "liquid",
		fillRole: "media",
	});
	assert.ok(expanded.length > 0, "bottle.liquid group should not be empty");
	for (const p of expanded) {
		assert.equal(typeof p.id, "string");
		// Each entry should set either fillRole or strokeRole based on attr
		assert.ok(
			p.fillRole === "media" || p.strokeRole === "media",
			"expanded patch should carry the role on fill or stroke",
		);
	}
}

console.log("svg_color_patch: 8 tests passed (production module imported)");
