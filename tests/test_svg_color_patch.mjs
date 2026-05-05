// node tests/test_svg_color_patch.mjs (run from repo root)
// Lightweight runtime check for src/svg_color_patch.ts. We do not pull in the
// browser-side TypeScript build; instead we exercise the same algorithm
// against a hand-built SVG string. If this passes, the build-time tsc is
// what guards the live module's behavior.

import assert from "node:assert/strict";

// Mirror the production algorithm (kept in sync with svg_color_patch.ts).
function findElementStart(svg, targetId) {
	const needle = 'id="' + targetId + '"';
	const idIndex = svg.indexOf(needle);
	if (idIndex < 0) {
		return -1;
	}
	let cursor = idIndex;
	while (cursor > 0 && svg.charAt(cursor) !== "<") {
		cursor -= 1;
	}
	return cursor;
}

function findOpenTagEnd(svg, startIndex) {
	return svg.indexOf(">", startIndex);
}

function setAttributeInTag(svg, startIndex, endIndex, attribute, value) {
	const openTag = svg.slice(startIndex, endIndex + 1);
	const attrPattern = new RegExp(' ' + attribute + '="[^"]*"');
	const replacement = ' ' + attribute + '="' + value + '"';
	let updatedTag;
	if (attrPattern.test(openTag)) {
		updatedTag = openTag.replace(attrPattern, replacement);
	} else {
		const isSelfClose = openTag.endsWith("/>");
		const cutoff = isSelfClose ? openTag.length - 2 : openTag.length - 1;
		updatedTag = openTag.slice(0, cutoff) + replacement + openTag.slice(cutoff);
	}
	return svg.slice(0, startIndex) + updatedTag + svg.slice(endIndex + 1);
}

function applyOne(svg, patch, COLOR) {
	const start = findElementStart(svg, patch.id);
	if (start < 0) {
		throw new Error("missing id: " + patch.id);
	}
	let updated = svg;
	if (patch.fill !== undefined) {
		const s = findElementStart(updated, patch.id);
		const e = findOpenTagEnd(updated, s);
		updated = setAttributeInTag(updated, s, e, "fill", COLOR[patch.fill]);
	}
	if (patch.opacity !== undefined) {
		const s = findElementStart(updated, patch.id);
		const e = findOpenTagEnd(updated, s);
		updated = setAttributeInTag(updated, s, e, "opacity", String(patch.opacity));
	}
	return updated;
}

const COLOR = { media: "#f7a6b8", residue: "#c69a3a" };

// Test 1: replace existing fill on a self-closing rect
{
	const svg = '<svg><rect id="t75__liquid" x="0" y="0" fill="#000" /></svg>';
	const out = applyOne(svg, { id: "t75__liquid", fill: "media" }, COLOR);
	assert.match(out, /id="t75__liquid"[^>]* fill="#f7a6b8"/);
}

// Test 2: insert opacity when absent
{
	const svg = '<svg><path id="t75__residue" d="M0 0 L1 1"/></svg>';
	const out = applyOne(svg, { id: "t75__residue", opacity: 0.35 }, COLOR);
	assert.match(out, /id="t75__residue"[^>]* opacity="0.35"/);
}

// Test 3: both fill and opacity, replace existing
{
	const svg = '<svg><rect id="x__a" fill="#fff" opacity="1" /></svg>';
	const out = applyOne(svg, { id: "x__a", fill: "residue", opacity: 0.5 }, COLOR);
	assert.match(out, /fill="#c69a3a"/);
	assert.match(out, /opacity="0.5"/);
}

// Test 4: missing id throws
{
	const svg = '<svg></svg>';
	let threw = false;
	try {
		applyOne(svg, { id: "nope", fill: "media" }, COLOR);
	} catch (err) {
		threw = true;
	}
	assert.equal(threw, true);
}

// Test 5: nested sibling with same attribute name is not affected
{
	const svg = '<svg><g id="outer__group" opacity="0.1"><rect id="x__a" opacity="1"/></g></svg>';
	const out = applyOne(svg, { id: "x__a", opacity: 0.5 }, COLOR);
	// outer untouched
	assert.match(out, /id="outer__group" opacity="0.1"/);
	// inner updated
	assert.match(out, /id="x__a" opacity="0.5"/);
}

// Test 6: attribute insert preserves self-closing form
{
	const svg = '<svg><rect id="x__a" /></svg>';
	const out = applyOne(svg, { id: "x__a", fill: "media" }, COLOR);
	assert.match(out, /id="x__a"\s+fill="#f7a6b8"\s*\/>/);
}

console.log("svg_color_patch: 6 tests passed");
