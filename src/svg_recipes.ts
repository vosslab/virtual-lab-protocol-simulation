// ============================================
// svg_recipes.ts - state-to-patch recipes for the recolor pipeline
// ============================================
// TypeScript owns semantic state. Each recipe maps a small enum of visual
// states to a list of SvgColorPatch entries against authored ids in the
// matching SVG. The patches are applied by svg_color_patch.ts; this module
// has no rendering logic of its own.

import type { ColorRole } from "./style_constants";
import { expandGroupPatch, type SvgColorPatch } from "./svg_color_patch";

//============================================
// T75 flask cleanliness/contents visual state.
// Derived from existing fields (flaskMediaMl, flaskMediaAge) by callers; this
// file does not introduce a new game-state field.
export type T75LiquidVisual =
	| "dirty"        // empty but with leftover residue film
	| "empty"        // empty and visually clean
	| "clean"        // explicitly cleaned (same render as empty for now)
	| "freshMedia"   // fresh DMEM
	| "oldMedia";    // exhausted media

//============================================
// Bottle liquid identity. The shared bottle artwork is recolored at runtime
// using the existing overlay-based liquid; the patch system targets only
// authored sub-objects when the bottle SVG has them. Bottles without
// authored ids fall back to no patches (empty list).
export type BottleLiquid =
	| "media"
	| "pbs"
	| "trypsin"
	| "dmso"
	| "sterileWater"
	| "ethanol"
	| "carboplatin"
	| "metformin";

//============================================
// T75 flask: map visual state to residue patches.
// The residue object is authored as <rect id="liquid_residue"> in
// assets/equipment/t75_flask.svg. Default opacity is 0.
export function flaskResiduePatches(state: T75LiquidVisual): SvgColorPatch[] {
	const residueId = "t75_flask__liquid_residue";
	if (state === "dirty") {
		return [{ id: residueId, fillRole: "residue", opacity: 0.35 }];
	}
	// empty / clean / freshMedia / oldMedia: hide residue
	return [{ id: residueId, opacity: 0 }];
}

//============================================
// Derive T75LiquidVisual from existing game-state fields without adding any
// new persistent state. Callers that already track flaskMediaMl and
// flaskMediaAge use this helper to pick the right recipe.
//============================================
// Map a BottleLiquid to its ColorRole. The shared bottle.svg is recolored at
// runtime via the 'liquid' group declared in bottle.colormap.json; one role
// drives liquid_base + liquid_shadow + liquid_highlight together.
const BOTTLE_LIQUID_ROLE: Record<BottleLiquid, ColorRole> = {
	media:        "media",
	pbs:          "pbs",
	trypsin:      "trypsin",
	dmso:         "dmso",
	sterileWater: "buffer",
	ethanol:      "ethanol",
	carboplatin:  "carboplatin",
	metformin:    "metformin",
};

//============================================
// Bottle: expand the 'liquid' group from bottle.colormap.json into
// SvgColorPatch entries with the role for the chosen liquid. Per-id opacity
// values come from the sidecar; this function does not invent geometry.
export function bottleLiquidPatches(liquid: BottleLiquid): SvgColorPatch[] {
	const role = BOTTLE_LIQUID_ROLE[liquid];
	return expandGroupPatch({ asset: "bottle", group: "liquid", fillRole: role });
}

//============================================
// Human-readable label per BottleLiquid for use by createDynamicLabel.
const BOTTLE_LIQUID_LABEL: Record<BottleLiquid, string> = {
	media:        "DMEM",
	pbs:          "PBS",
	trypsin:      "Trypsin",
	dmso:         "DMSO",
	sterileWater: "Water",
	ethanol:      "70% EtOH",
	carboplatin:  "Carboplatin",
	metformin:    "Metformin",
};

export function bottleLiquidLabel(liquid: BottleLiquid): string {
	return BOTTLE_LIQUID_LABEL[liquid];
}

export function deriveT75Visual(
	flaskMediaMl: number,
	flaskMediaAge: "old" | "fresh",
	isDirty: boolean,
): T75LiquidVisual {
	if (flaskMediaMl <= 0) {
		return isDirty ? "dirty" : "empty";
	}
	return flaskMediaAge === "old" ? "oldMedia" : "freshMedia";
}
