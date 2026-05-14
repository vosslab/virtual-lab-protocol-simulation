// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// tube_layout.ts - Microtube position and layout mapping
// Maps microtube item ids to their positions within the dilution_tube_rack SVG
//============================================

// Microtube position mapping: item id -> { x, y, radius }
// These positions are in SVG viewBox coordinates for the dilution_tube_rack.
// The rack has a standard layout with 8 tube positions (one per row B-H)
// positioned horizontally with labels below.
export interface TubePosition {
	readonly x: number;      // center x in SVG coordinates
	readonly y: number;      // center y in SVG coordinates
	readonly radius: number; // tube radius in SVG coordinates
}

// Carboplatin and metformin working solutions mapped to rows B-H + one extra
// Positions derived from standard microtube rack layout: 8 tubes horizontal
const TUBE_POSITIONS: Record<string, TubePosition> = {
	// Carboplatin working solutions (B through H in typical 96-well)
	dilution_tube_carb_b: { x: 18, y: 35, radius: 6 },  // Row B = 0.1 µM final
	dilution_tube_carb_c: { x: 35, y: 35, radius: 6 },  // Row C = 0.2 µM final
	dilution_tube_carb_d: { x: 52, y: 35, radius: 6 },  // Row D = 0.5 µM final
	dilution_tube_carb_e: { x: 69, y: 35, radius: 6 },  // Row E = 1 µM final
	dilution_tube_carb_f: { x: 86, y: 35, radius: 6 },  // Row F = 2 µM final
	dilution_tube_carb_g: { x: 103, y: 35, radius: 6 }, // Row G = 5 µM final
	dilution_tube_carb_h: { x: 120, y: 35, radius: 6 }, // Row H = 10 µM final
	// Metformin working solution (separate position or same rack)
	dilution_tube_metformin_working: { x: 137, y: 35, radius: 6 }, // Additional position
};

//============================================
// getTubePosition - Retrieve position for a given tube id
//============================================
export function getTubePosition(tubeId: string): TubePosition | undefined {
	return TUBE_POSITIONS[tubeId];
}

//============================================
// getAllTubeIds - List all known tube ids
//============================================
export function getAllTubeIds(): string[] {
	return Object.keys(TUBE_POSITIONS);
}
