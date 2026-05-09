//============================================
// liquid_transfer.ts
// Liquid handling abstractions: deriveHeldLiquid, canonicalTool, and liquid asset mapping.
// Extracted from hood.ts and layout_engine.ts (BOTTLE_ASSET_LIQUID).
// Also serves as the liquidTransfer capability module (capability registration added in Patch 5+).
//============================================

import type { BottleLiquid } from "../../svg_assets";

//============================================
// LIQUID_BY_ASSET_ID: Map consolidated bottle/stock asset ids to their BottleLiquid role.
// Formerly BOTTLE_ASSET_LIQUID in layout_engine.ts; renamed for clarity.
// Centralized here so dispatchers stay consistent.
export const LIQUID_BY_ASSET_ID: Record<string, BottleLiquid> = {
	media_bottle:      "media",
	pbs_bottle:        "pbs",
	trypsin_bottle:    "trypsin",
	dmso_bottle:       "dmso",
	sterile_water:     "sterileWater",
	carboplatin_stock: "carboplatin",
	metformin_stock:   "metformin",
};

//============================================
// deriveHeldLiquid(selectedTool): { tool, liquid, volumeMl, colorKey }
// Extract from hood.ts.
// Constructs held liquid info from a selected tool token.
// Maps legacy selectedTool tokens to synthetic heldLiquid with volume and color role.
export function deriveHeldLiquid(selectedTool: string | null): { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null } {
	if (!selectedTool) return { tool: null, liquid: null, volumeMl: 0, colorKey: null };
	const map: Record<string, { liquid: string; volumeMl: number; colorKey: string }> = {
		'serological_pipette_with_pbs':     { liquid: 'pbs',     volumeMl: 4,  colorKey: 'pbs' },
		'serological_pipette_with_trypsin': { liquid: 'trypsin', volumeMl: 3,  colorKey: 'trypsin' },
		'serological_pipette_with_media':   { liquid: 'media',   volumeMl: 9,  colorKey: 'media' },
		'serological_pipette_with_sample':  { liquid: 'cells',   volumeMl: 1,  colorKey: 'cells' },
		'serological_pipette_with_cells':   { liquid: 'cells',   volumeMl: 12, colorKey: 'cells' },
	};
	const hit = map[selectedTool];
	if (hit) return { tool: 'serological_pipette', liquid: hit.liquid, volumeMl: hit.volumeMl, colorKey: hit.colorKey };
	return { tool: selectedTool, liquid: null, volumeMl: 0, colorKey: null };
}

//============================================
// canonicalTool(selectedTool): string | null
// Extract from hood.ts.
// Strip liquid suffix from a tool token to get the base tool name.
export function canonicalTool(selectedTool: string | null): string | null {
	if (!selectedTool) return null;
	const i = selectedTool.indexOf('_with_');
	return i >= 0 ? selectedTool.substring(0, i) : selectedTool;
}
