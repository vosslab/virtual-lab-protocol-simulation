// ============================================
// svg_globals.ts - SVG asset constants
// ============================================
// In the legacy build_game.sh concatenation pipeline, these constants were
// injected at build time from assets/equipment/*.svg files. The new esbuild
// bundle has not yet been wired up to load those raw SVG files. For the
// type-check + bundle build to succeed, exports default to empty strings.
// Runtime visuals will be missing until the asset pipeline is restored.

export const SVG_T75_FLASK: string = "";
export const SVG_MEDIA_BOTTLE: string = "";
export const SVG_SERO_PIPETTE: string = "";
export const SVG_WELL_PLATE_24: string = "";
export const SVG_ASPIRATING_PIPETTE: string = "";
export const SVG_WASTE_CONTAINER: string = "";
export const SVG_ETHANOL_SPRAY: string = "";
export const SVG_DRUG_VIAL_RACK: string = "";
export const SVG_MULTICHANNEL_PIPETTE: string = "";
export const SVG_TRYPSIN_BOTTLE: string = "";
export const SVG_PBS_BOTTLE: string = "";
export const SVG_DMSO_BOTTLE: string = "";
export const SVG_STERILE_WATER_BOTTLE: string = "";
export const SVG_MTT_VIAL: string = "";
export const SVG_CARBOPLATIN_STOCK: string = "";
export const SVG_METFORMIN_STOCK: string = "";
export const SVG_MICROSCOPE: string = "";
export const SVG_INCUBATOR: string = "";
export const SVG_PLATE_READER: string = "";
export const SVG_CONICAL_15ML_RACK: string = "";
export const SVG_DILUTION_TUBE_RACK: string = "";
export const SVG_BIOHAZARD_DECANT: string = "";
export const SVG_MICROPIPETTE_RACK: string = "";
export const SVG_CENTRIFUGE: string = "";
export const SVG_WATER_BATH: string = "";
export const SVG_VORTEX: string = "";
export const SVG_CELL_COUNTER: string = "";
export const SVG_ANGRY_PROFESSOR: string = "";
export const SVG_TIP_BOX: string = "";
export const SVG_GLOVE_BOX: string = "";
export const SVG_WASTE_TRAY: string = "";
export const CELL_CULTURE_PLATE_SVG: string = "";
