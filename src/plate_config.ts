// ============================================
// plate_config.ts - Plate scene item declarations and zone layout rules
// ============================================
// Semantic config only: what items exist, which zone they belong to,
// and how they should be prioritized. No pixel coordinates.

import type { SceneBounds, SceneItem, SceneLayoutRules, ZoneDef } from "./scene_types";


export const PLATE_BOUNDS: SceneBounds = {
	left: 1,
	right: 99,
	top: 1,
	bottom: 98,
};

// ============================================
// Zone layout: three plate scene zones.
//
// The plate scene is modal-overlaid on top of hood or bench. Its zones are
// laid out as a grid to maximize the visual prominence of the 96-well plate.
//
// zone_plate_center: left and center 70-75% of width, hosts the 96-well
//                    plate at large widthScale (~2.5-3.0) so the plate
//                    visually dominates the scene
// zone_pipettes_right: narrow right strip (~15-20% width), hosts
//                      multichannel_pipette vertically centered
// zone_liquids_top: horizontal strip across top (~15-20% height), hosts
//                   reagent sources left-to-right (carboplatin, etc.)

export const PLATE_ZONES: Record<string, ZoneDef> = {
	// Plate center zone: dominant visual zone containing the 96-well plate
	// at large scale
	zone_plate_center: { x0: 5, x1: 75, baseline: 50, gap: 2, align: 'center' },
	// Pipette zone: narrow right strip for multichannel pipette, vertically
	// centered
	zone_pipettes_right: { x0: 76, x1: 98, baseline: 50, gap: 2, align: 'center' },
	// Liquids zone: top horizontal strip for reagent sources
	zone_liquids_top: { x0: 5, x1: 98, baseline: 18, gap: 3, align: 'left' },
};

// Priority is set to define visual insertion order. The well_plate is the
// dominant visual element, followed by the pipette, then the reagent
// sources at the top.
export const PLATE_SCENE_ITEMS: SceneItem[] = [
	// Center zone: 96-well plate at large scale
	{ id: 'well_plate', svgAsset: 'well_plate_96', kind: 'plate', zone: 'zone_plate_center', depthTier: 1, widthScale: 2.8, label: '96-Well Plate', anchorY: 'bottom', alignStop: 'center' },
	// Right zone: multichannel pipette vertically centered
	{ id: 'multichannel_pipette', svgAsset: 'multichannel_pipette', kind: 'pipette', zone: 'zone_pipettes_right', depthTier: 2, widthScale: 1.0, label: 'Multichannel Pipette', shortLabel: 'Multichannel', anchorY: 'tip', alignStop: 'center' },
	// Top zone: reagent sources left-to-right
	{ id: 'carboplatin_working_stock', svgAsset: 'dilution_tube_rack', kind: 'bottle', zone: 'zone_liquids_top', depthTier: 3, widthScale: 0.6, label: 'Carboplatin Working Stock', shortLabel: 'Carb Stock', anchorY: 'bottom', alignStop: 'left' },
];

export const PLATE_LAYOUT_RULES: SceneLayoutRules = {
	zones: PLATE_ZONES,
	labelFontSize: 9,
	labelLineHeight: 1.1,
	labelOffsetY: 3,
	sceneBounds: PLATE_BOUNDS,
};

// ============================================
// Helper: look up an item label by ID (used by interaction code)
export function getPlateItemLabel(itemId: string): string {
	for (let i = 0; i < PLATE_SCENE_ITEMS.length; i++) {
		const item = PLATE_SCENE_ITEMS[i];
		if (item && item.id === itemId) {
			return item.label;
		}
	}
	return itemId;
}
