// node tests/test_bottle_recolor.mjs (run from repo root)
//
// Verifies the consolidated bottle pipeline by walking SVG_GROUPS["bottle"]
// ["liquid"] and asserting that every grouped id ends up with the role's
// hex from COLOR_MAP after applyPatches runs. Does NOT hard-code any
// specific id (e.g. liquid_base) so the test stays valid as the bottle
// authoring evolves; the contract is "every grouped id is recolored".

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const generated = readFileSync("src/svg_globals.ts", "utf-8");

// extract the SVG_BOTTLE template literal
const bottleMatch = generated.match(
	/export const SVG_BOTTLE: string = `([^`]*)`/,
);
assert.ok(bottleMatch, "SVG_BOTTLE not found in svg_globals.ts");
const SVG_BOTTLE = bottleMatch[1];

// extract the SVG_GROUPS manifest (JSON literal at end of file)
const groupsMatch = generated.match(
	/SVG_GROUPS:[^=]+=\s*(\{[\s\S]*?\});/,
);
assert.ok(groupsMatch, "SVG_GROUPS manifest not found");
const SVG_GROUPS = JSON.parse(groupsMatch[1]);
assert.ok(SVG_GROUPS.bottle, "bottle group manifest missing");
const liquidGroup = SVG_GROUPS.bottle.liquid;
assert.ok(Array.isArray(liquidGroup) && liquidGroup.length > 0,
	"bottle.liquid group is empty");

// COLOR_MAP -- mirror style_constants.ts
const COLOR_MAP = {
	media:       "#f7a6b8",
	oldMedia:    "#c69a3a",
	residue:     "#c69a3a",
	buffer:      "#4a90d9",
	pbs:         "#b8e5ff",
	trypsin:     "#ffe082",
	cells:       "#f3d6a2",
	waste:       "#d4d4a0",
	drug:        "#d8b4ff",
	carboplatin: "#b64392",
	metformin:   "#01642a",
	mtt:         "#fff59d",
	dmso:        "#e0e0e0",
	ethanol:     "#ffd700",
	error:       "#d94444",
	success:     "#44aa66",
	signal:      "#222222",
};

// BottleLiquid -> ColorRole (mirror svg_recipes.ts)
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

// Mirror applyOnePatch from svg_color_patch.ts
function findElementStart(svg, targetId) {
	const idx = svg.indexOf('id="' + targetId + '"');
	if (idx < 0) return -1;
	let cursor = idx;
	while (cursor > 0 && svg.charAt(cursor) !== "<") cursor -= 1;
	return cursor;
}
function findOpenTagEnd(svg, startIndex) {
	return svg.indexOf(">", startIndex);
}
function setAttr(svg, s, e, attribute, value) {
	const tag = svg.slice(s, e + 1);
	const re = new RegExp(' ' + attribute + '="[^"]*"');
	const repl = ' ' + attribute + '="' + value + '"';
	let updated;
	if (re.test(tag)) {
		updated = tag.replace(re, repl);
	} else {
		const isSelf = tag.endsWith("/>");
		const cut = isSelf ? tag.length - 2 : tag.length - 1;
		updated = tag.slice(0, cut) + repl + tag.slice(cut);
	}
	return svg.slice(0, s) + updated + svg.slice(e + 1);
}
function applyPatch(svg, patch) {
	const s = findElementStart(svg, patch.id);
	if (s < 0) {
		throw new Error("missing id " + patch.id + " in SVG_BOTTLE");
	}
	let out = svg;
	if (patch.fill !== undefined) {
		const s2 = findElementStart(out, patch.id);
		const e2 = findOpenTagEnd(out, s2);
		out = setAttr(out, s2, e2, "fill", patch.fill);
	}
	if (patch.opacity !== undefined) {
		const s3 = findElementStart(out, patch.id);
		const e3 = findOpenTagEnd(out, s3);
		out = setAttr(out, s3, e3, "opacity", String(patch.opacity));
	}
	return out;
}

// Sanity 1: every liquid id in the manifest exists in SVG_BOTTLE
for (const entry of liquidGroup) {
	const idx = findElementStart(SVG_BOTTLE, entry.id);
	assert.notStrictEqual(
		idx,
		-1,
		"sidecar id " + entry.id + " not found in SVG_BOTTLE",
	);
}

// Drive the renderer: for each BottleLiquid, apply the group expansion and
// confirm every grouped id ends up with the expected fill from COLOR_MAP.
const liquids = Object.keys(BOTTLE_ROLE);
for (const liquid of liquids) {
	const role = BOTTLE_ROLE[liquid];
	const expectedHex = COLOR_MAP[role];
	let working = SVG_BOTTLE;
	for (const entry of liquidGroup) {
		const patch = { id: entry.id, fill: expectedHex };
		if (entry.opacity !== undefined) patch.opacity = entry.opacity;
		working = applyPatch(working, patch);
	}
	// every grouped id must carry the role's hex on its open tag
	for (const entry of liquidGroup) {
		const s = findElementStart(working, entry.id);
		const e = findOpenTagEnd(working, s);
		const tag = working.slice(s, e + 1);
		assert.ok(
			tag.includes('fill="' + expectedHex + '"'),
			liquid + ": " + entry.id + " did not get fill " + expectedHex
				+ "\n  tag=" + tag,
		);
		if (entry.opacity !== undefined) {
			assert.ok(
				tag.includes('opacity="' + entry.opacity + '"'),
				liquid + ": " + entry.id + " missing opacity "
					+ entry.opacity + "\n  tag=" + tag,
			);
		}
	}
}

console.log(
	"bottle_recolor: " + liquids.length + " liquids x "
	+ liquidGroup.length + " grouped ids verified",
);
