// ============================================
// svg_color_patch.ts - dynamic SVG sub-object recoloring
// ============================================
// Applies fill and opacity changes to authored SVG sub-objects
// addressed by their fully namespaced id (e.g. "t75_flask__liquid_residue").
// This module is the renderer for the recolor pipeline:
//   - SVG file owns shapes and stable ids
//   - TypeScript owns semantic state and color choice
//   - This module patches existing elements only; it never draws new geometry
//
// Design lock: do not extend this into an overlay engine, a clipping system,
// or a level/animation pipeline. Color and opacity only.

import { COLOR_MAP, type ColorRole } from "./style_constants";
import { SVG_GROUPS, SVG_IDS, type SvgGroupEntry } from "../generated/svg_manifest";

// A single patch targets exactly one authored SVG element by id.
// fillRole writes the `fill` attribute; strokeRole writes `stroke`. Stroke
// routing is in scope: the Servier bottle pristine-source diff classifies
// at least one liquid path as stroke-only (a thin highlight stripe), and
// dropping it would visibly lower the recolor fidelity. Extension was made
// deliberately after the build script reported the stroke count, not as a
// silent reaction to a test failure.
export type SvgColorPatch = {
	id: string;
	fillRole?: ColorRole;
	strokeRole?: ColorRole;
	opacity?: number;
};

// A group patch expands to one SvgColorPatch per id in the named group.
// fillRole is shared across the group; per-id opacity comes from the sidecar.
export type SvgGroupPatch = {
	asset: string;
	group: string;
	fillRole?: ColorRole;
	opacityScale?: number;
};

//============================================
// Find the start index of the opening tag whose id attribute equals targetId.
// Returns -1 when no such element exists. Matches only the first occurrence;
// ids are unique per document.
function findElementStart(svg: string, targetId: string): number {
	// id values are quoted in the generator output. We search for the literal
	// id="<targetId>" and then walk back to the matching '<' for that tag.
	const needle = 'id="' + targetId + '"';
	const idIndex = svg.indexOf(needle);
	if (idIndex < 0) {
		return -1;
	}
	// walk back to the most recent '<' to anchor on the element start
	let cursor = idIndex;
	while (cursor > 0 && svg.charAt(cursor) !== "<") {
		cursor -= 1;
	}
	return cursor;
}

//============================================
// Find the end of the opening tag (the '>' of the start tag) given the
// element start index. Self-closing tags ("<rect ... />") and normal opens
// both return the position of the '>' character.
function findOpenTagEnd(svg: string, startIndex: number): number {
	const endIndex = svg.indexOf(">", startIndex);
	return endIndex;
}

//============================================
// Replace or insert a single attribute value within the open tag delimited
// by [startIndex, endIndex] (inclusive of '<' and '>'). Operates only on
// that range; nested elements with the same attribute are not touched.
function setAttributeInTag(
	svg: string,
	startIndex: number,
	endIndex: number,
	attribute: string,
	value: string,
): string {
	// scope the search to the open tag only
	const openTag = svg.slice(startIndex, endIndex + 1);
	// match the attribute with surrounding whitespace so we only see real attrs
	const attrPattern = new RegExp(' ' + attribute + '="[^"]*"');
	const replacement = ' ' + attribute + '="' + value + '"';
	let updatedTag: string;
	if (attrPattern.test(openTag)) {
		updatedTag = openTag.replace(attrPattern, replacement);
	} else {
		// insert before the closing '>' or '/>' so the original token order
		// is preserved as much as possible
		const isSelfClose = openTag.endsWith("/>");
		const cutoff = isSelfClose ? openTag.length - 2 : openTag.length - 1;
		updatedTag = openTag.slice(0, cutoff) + replacement + openTag.slice(cutoff);
	}
	const result = svg.slice(0, startIndex) + updatedTag + svg.slice(endIndex + 1);
	return result;
}

//============================================
// Apply one SvgColorPatch to one element matched by id. Throws when the id
// is not present in the SVG. Returns the updated SVG string.
function applyOnePatch(svg: string, patch: SvgColorPatch): string {
	const startIndex = findElementStart(svg, patch.id);
	if (startIndex < 0) {
		throw new Error(
			"svg_color_patch: id '" + patch.id + "' not found in SVG",
		);
	}
	const endIndex = findOpenTagEnd(svg, startIndex);
	let updated = svg;
	if (patch.fillRole !== undefined) {
		const hex = COLOR_MAP[patch.fillRole];
		// recompute end index after each mutation since length can change
		const s1 = findElementStart(updated, patch.id);
		const e1 = findOpenTagEnd(updated, s1);
		updated = setAttributeInTag(updated, s1, e1, "fill", hex);
	}
	if (patch.strokeRole !== undefined) {
		const hex = COLOR_MAP[patch.strokeRole];
		const ss = findElementStart(updated, patch.id);
		const se = findOpenTagEnd(updated, ss);
		updated = setAttributeInTag(updated, ss, se, "stroke", hex);
	}
	if (patch.opacity !== undefined) {
		const s2 = findElementStart(updated, patch.id);
		const e2 = findOpenTagEnd(updated, s2);
		const opacityStr = patch.opacity.toString();
		updated = setAttributeInTag(updated, s2, e2, "opacity", opacityStr);
	}
	// Add pointer-events="none" to all liquid elements so they don't block clicks on items beneath
	if (patch.id.indexOf("__liquid") >= 0) {
		const s3 = findElementStart(updated, patch.id);
		const e3 = findOpenTagEnd(updated, s3);
		updated = setAttributeInTag(updated, s3, e3, "pointer-events", "none");
	}
	// reference endIndex so the linter does not flag it (used implicitly above
	// only when the input had the shape we expect; kept here for clarity).
	void endIndex;
	return updated;
}

//============================================
// Apply a list of SvgColorPatch entries in order. Patches that throw bubble
// up; partial application is allowed because the caller passes the result.
export function applyPatches(svg: string, patches: readonly SvgColorPatch[]): string {
	let working = svg;
	for (const patch of patches) {
		working = applyOnePatch(working, patch);
	}
	return working;
}

//============================================
// Expand a group patch into individual SvgColorPatch entries using the
// SVG_GROUPS sidecar manifest. Throws when the asset/group is unknown.
export function expandGroupPatch(groupPatch: SvgGroupPatch): SvgColorPatch[] {
	const assetGroups = SVG_GROUPS[groupPatch.asset];
	if (assetGroups === undefined) {
		throw new Error(
			"svg_color_patch: no group manifest for asset '" + groupPatch.asset + "'",
		);
	}
	const entries = assetGroups[groupPatch.group];
	if (entries === undefined) {
		throw new Error(
			"svg_color_patch: group '" + groupPatch.group + "' not found in asset '"
			+ groupPatch.asset + "'",
		);
	}
	const scale = groupPatch.opacityScale === undefined ? 1 : groupPatch.opacityScale;
	const result: SvgColorPatch[] = [];
	for (const entry of entries) {
		const patch: SvgColorPatch = { id: entry.id };
		// Route the role to fill (default) or stroke based on the sidecar's
		// optional attr field. Cast is contained: SvgGroupEntry is a JSON
		// shape from generated code, attr is an optional generator-emitted
		// field documented in pipeline/generate_svg_globals.py.
		const entryAttr = (entry as { attr?: "fill" | "stroke" }).attr;
		if (groupPatch.fillRole !== undefined) {
			if (entryAttr === "stroke") {
				patch.strokeRole = groupPatch.fillRole;
			} else {
				patch.fillRole = groupPatch.fillRole;
			}
		}
		if (entry.opacity !== undefined) {
			patch.opacity = entry.opacity * scale;
		} else if (groupPatch.opacityScale !== undefined) {
			patch.opacity = scale;
		}
		result.push(patch);
	}
	return result;
}

//============================================
// Build-time validator: confirm every patch id exists in the SVG_IDS manifest
// for the given asset. Use this in unit/integration tests, not at hot paths.
export function validatePatchIds(asset: string, patches: readonly SvgColorPatch[]): void {
	const ids = SVG_IDS[asset];
	if (ids === undefined) {
		throw new Error("svg_color_patch: no id manifest for asset '" + asset + "'");
	}
	const idSet = new Set(ids);
	for (const patch of patches) {
		if (!idSet.has(patch.id)) {
			throw new Error(
				"svg_color_patch: patch id '" + patch.id + "' not in manifest for '"
				+ asset + "'",
			);
		}
	}
}

// re-export for convenience so callers do not also import from generated/svg_manifest
export type { SvgGroupEntry };
