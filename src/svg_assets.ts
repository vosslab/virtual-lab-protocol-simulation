// ============================================
// svg_assets.ts - SVG templates for all game assets
// ============================================

// Base SVG constants injected by build_game.sh from assets/equipment/
import type { WellData } from "./constants";
import { PLATE_96_ROWS, PLATE_96_COLS, ROW_LABELS, COL_LABELS } from "./steps/plate_96";
import { DRUG_CONCENTRATION_LABELS, DRUG_STOCK_CONCENTRATION_MM } from "./constants";
import { SVG_96WELL_PCR_PLATE, SVG_ANGRY_PROFESSOR, SVG_ASPIRATING_PIPETTE, SVG_BIOHAZARD_DECANT, SVG_BOTTLE, SVG_CELL_COUNTER, SVG_CENTRIFUGE, SVG_CONICAL_15ML_RACK, SVG_DILUTION_TUBE_RACK, SVG_DRUG_VIAL_RACK, SVG_ETHANOL_SPRAY, SVG_GLOVE_BOX, SVG_INCUBATOR, SVG_MICROPIPETTE_RACK, SVG_MICROSCOPE, SVG_MTT_VIAL, SVG_MULTICHANNEL_PIPETTE, SVG_PLATE_READER, SVG_SERO_PIPETTE, SVG_T75_FLASK, SVG_TIP_BOX, SVG_VORTEX, SVG_WASTE_CONTAINER, SVG_WASTE_TRAY, SVG_WATER_BATH, SVG_WELL_PLATE_24, SVG_MICROTUBE_OPEN_TRANSLUCENT, SVG_BOTTLE_MEDIUM_PINK } from "../generated/svg_assets";
import { composeSvg, createDynamicLabel, createLiquidOverlay, createLiquidOverlayWithColor, createPipetteLiquidOverlay } from "./svg_overlays";
import { applyPatches } from "./svg_color_patch";
import { flaskResiduePatches, bottleLiquidPatches, bottleLiquidLabel, type BottleLiquid, type T75LiquidVisual } from "./svg_recipes";
import { LIQUID_BY_ASSET_ID } from "./scenes/shared/liquid_transfer";
import { COLOR_MAP } from "./style_constants";

// ============================================
// Re-exports for scene-facing code.
// Scenes must not import from `./svg_recipes` directly (that is the recipes
// layer and is owned by the composition facade). Re-exporting the shape
// types and derivation helper here keeps scenes routed through this module
// for every SVG-related concern.
export type { BottleLiquid, T75LiquidVisual } from "./svg_recipes";
export { deriveT75Visual } from "./svg_recipes";


// ============================================
// Public asset composition API
// ============================================
// Curated map of public equipment asset ids to the generated SVG_IDS keys
// (kept internal to this module). We use a curated map rather than
// `keyof typeof SVG_IDS` because the generated manifest exposes internal
// variants (legacy / _new / _old / versioned flask drafts / sidecar artifacts
// like t75_flask_v5, cell_counter_old, microscope_new, falcon_50ml_new) that
// must not leak to scene callers as a public type surface.
const EQUIPMENT_ASSETS = {
	angry_professor: "angry_professor",
	aspirating_pipette: "aspirating_pipette",
	biohazard_decant: "biohazard_decant",
	bottle: "bottle",
	cell_counter: "cell_counter",
	centrifuge: "centrifuge",
	conical_15ml_rack: "conical_15ml_rack",
	dilution_tube_rack: "dilution_tube_rack",
	drug_vial_rack: "drug_vial_rack",
	ethanol_spray: "ethanol_spray",
	glove_box: "glove_box",
	incubator: "incubator",
	micropipette_rack: "micropipette_rack",
	microscope: "microscope",
	mtt_vial: "mtt_vial",
	multichannel_pipette: "multichannel_pipette",
	plate_reader: "plate_reader",
	sero_pipette: "sero_pipette",
	t75_flask: "t75_flask",
	tip_box: "tip_box",
	vortex: "vortex",
	waste_container: "waste_container",
	waste_tray: "waste_tray",
	water_bath: "water_bath",
	// ----------------------------------------------------------------
	// Layout-only ids consumed by layout_engine.ts. These are scene-side
	// asset names (matching SceneItem.asset values authored in scene YAML)
	// rather than canonical equipment ids. They route to the same
	// underlying SVGs as their canonical counterparts; layout_engine.ts
	// queries them through getStaticSvg / getAssetAspectRatio.
	// Bottle-liquid aliases (media_bottle, pbs_bottle, ...) route through
	// LIQUID_BY_ASSET_ID + renderBottleFromLiquid() so the recolored bottle
	// is returned, not the raw unpatched Servier base. Plain aliases
	// (flask, ethanol_bottle, drug_vials, ...) return the static SVG
	// for the matching canonical equipment id.
	flask: "t75_flask",
	well_plate: "well_plate_24",
	well_plate_96: "96well_pcr_plate",
	ethanol_bottle: "ethanol_spray",
	serological_pipette: "sero_pipette",
	drug_vials: "drug_vial_rack",
	media_bottle: "bottle",
	pbs_bottle: "bottle",
	trypsin_bottle: "bottle",
	dmso_bottle: "bottle",
	sterile_water: "bottle",
	carboplatin_stock: "bottle",
	metformin_stock: "bottle",
	// Aliases for tutorial_plate_drug_additions items.yaml item ids that need
	// to resolve through getStaticSvg() in the well_plate_workspace static-render path.
	carboplatin_stock_solution: "bottle",
	metformin_stock_solution: "bottle",
	distilled_water: "bottle",
	microtube_open_translucent: "microtube_open_translucent",
	bottle_medium_pink: "bottle_medium_pink",
} as const;

// Public, narrow asset id type. Typos at scene call sites fail at compile time.
export type EquipmentAssetId = keyof typeof EQUIPMENT_ASSETS;

// Smallest overlay union covering current convergent usage. Existing
// internal helpers compose label + liquid overlays via createDynamicLabel /
// createLiquidOverlay; the public API exposes only label-text customization
// today. Liquid overlay parameters are derived from `liquidState` (see
// EquipmentRenderRequest), so we do not also surface them here.
export type OverlaySpec =
	| { kind: "label"; text: string };

// Public composition request. liquidState selects the recipe-driven
// recolor + overlay path for assets that support it (t75_flask, bottle).
// `label` overrides the default label string for assets that render one
// (forwards to createDynamicLabel inside the existing helpers).
// `overlays` is reserved for future additive overlay specs; currently the
// only kind is a label override, which is equivalent to setting `label`.
export type EquipmentRenderRequest = {
	assetId: EquipmentAssetId;
	liquidState?: T75LiquidVisual | BottleLiquid;
	label?: string;
	overlays?: readonly OverlaySpec[];
};

// ============================================
// Internal: render flask SVG with explicit visual state. Scenes derive
// the T75LiquidVisual via deriveT75Visual (re-exported above) and pass
// it through renderEquipmentSvg({ assetId: "t75_flask", liquidState }).
function renderT75FlaskFromVisual(visual: T75LiquidVisual, overrideLabel?: string): string {
	// patch the authored residue object first, then overlay liquid + label
	const patchedBase = applyPatches(SVG_T75_FLASK, flaskResiduePatches(visual));
	const isOldMedia = visual === "oldMedia";
	const liquidColor = isOldMedia ? COLOR_MAP.oldMedia : COLOR_MAP.media;
	const hasLiquid = visual === "freshMedia" || visual === "oldMedia";
	let labelText = "";
	if (overrideLabel !== undefined) {
		labelText = overrideLabel;
	} else if (hasLiquid) {
		labelText = isOldMedia ? "Old Media" : "DMEM";
	}
	const liquidLevel = hasLiquid ? 1 : 0;
	const overlays: string[] = [
		createLiquidOverlayWithColor("t75_flask", liquidLevel, liquidColor, patchedBase),
		createDynamicLabel("t75_flask", labelText, patchedBase),
	];
	return composeSvg(patchedBase, "t75_flask", overlays);
}

// ============================================
// Internal: render bottle SVG with explicit liquid + optional label override.
function renderBottleFromLiquid(liquid: BottleLiquid, overrideLabel?: string): string {
	const patched = applyPatches(SVG_BOTTLE, bottleLiquidPatches(liquid));
	const labelText = overrideLabel !== undefined ? overrideLabel : bottleLiquidLabel(liquid);
	const overlays: string[] = [
		createDynamicLabel("bottle", labelText, patched),
	];
	return composeSvg(patched, "bottle", overlays);
}

// ============================================
// Internal: render the waste container with its waste-liquid overlay.
function renderWasteContainerSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("waste_container", 0.3, "waste", SVG_WASTE_CONTAINER),
		createDynamicLabel("waste_container", "Waste", SVG_WASTE_CONTAINER),
	];
	return composeSvg(SVG_WASTE_CONTAINER, "waste_container", overlays);
}

// ============================================
// Internal: render the ethanol spray bottle with its liquid overlay.
function renderEthanolSprayInternal(): string {
	const overlays: string[] = [
		createLiquidOverlay("ethanol_spray", 0.7, "ethanol", SVG_ETHANOL_SPRAY),
		createDynamicLabel("ethanol_spray", "70% EtOH", SVG_ETHANOL_SPRAY),
	];
	return composeSvg(SVG_ETHANOL_SPRAY, "ethanol_spray", overlays);
}

// ============================================
// Internal: render the drug-vials rack with per-vial color overlays driven by
// DRUG_CONCENTRATION_LABELS. The geometry (cx = 12 + i*18, six vials) is fixed
// to the authored base SVG layout in assets/equipment/drug_vial_rack.svg.
function renderDrugVialsInternal(): string {
	let overlayContent = "";
	for (let i = 0; i < 6; i++) {
		const cx = 12 + i * 18;
		const intensity = i / 5;
		// linear ramp from light blue to deep blue by vial index
		const r = Math.round(220 - intensity * 80);
		const g = Math.round(220 - intensity * 100);
		const b = Math.round(240 - intensity * 20);
		const fillColor = "rgb(" + r + "," + g + "," + b + ")";
		// vial body extends above rack top edge at y=15
		overlayContent += '<rect x="' + (cx - 5) + '" y="5" width="10" height="45" rx="2"'
			+ ' fill="' + fillColor + '" stroke="#999999" stroke-width="0.5"/>';
		// vial cap
		overlayContent += '<rect x="' + (cx - 5) + '" y="2" width="10" height="5" rx="1"'
			+ ' fill="#888888"/>';
		// concentration label below the rack
		overlayContent += '<text x="' + cx + '" y="57" font-family="Arial,sans-serif"'
			+ ' font-size="5" fill="#666666" text-anchor="middle">'
			+ DRUG_CONCENTRATION_LABELS[i] + "</text>";
	}
	// stock concentration header
	overlayContent += '<text x="60" y="12" font-family="Arial,sans-serif"'
		+ ' font-size="5" fill="#555555" text-anchor="middle">('
		+ DRUG_STOCK_CONCENTRATION_MM + " mM)</text>";
	return composeSvg(SVG_DRUG_VIAL_RACK, "drug_vial_rack", [overlayContent]);
}

// ============================================
// Internal: typed lookup for bottle-liquid aliases. Throws if the asset id
// is registered in EQUIPMENT_ASSETS as a bottle alias but missing from
// LIQUID_BY_ASSET_ID. Per TYPESCRIPT_STYLE.md / REPO_STYLE.md the right
// behavior on missing data is a loud failure, not a silent default.
function liquidForBottleAlias(assetId: EquipmentAssetId): BottleLiquid {
	const liquid = LIQUID_BY_ASSET_ID[assetId];
	if (liquid === undefined) {
		throw new Error(
			"svg_assets: bottle alias '" + assetId + "' is registered in"
			+ " EQUIPMENT_ASSETS but missing from LIQUID_BY_ASSET_ID."
			+ " Add it to src/scenes/shared/liquid_transfer.ts.",
		);
	}
	return liquid;
}

// ============================================
// Internal: pull the most-specific override label from a request.
// `label` wins over any `{ kind: "label" }` overlay; the overlay form exists
// for future symmetry once additional overlay kinds land.
function pickLabelOverride(req: EquipmentRenderRequest): string | undefined {
	if (req.label !== undefined) {
		return req.label;
	}
	if (req.overlays !== undefined) {
		for (const overlay of req.overlays) {
			if (overlay.kind === "label") {
				return overlay.text;
			}
		}
	}
	return undefined;
}

// ============================================
// Convergence point for SVG composition. Scenes pass a semantic request
// (asset id + optional liquid state + optional label/overlays); this
// function dispatches to the internal renderers below. All scene/modal/overlay
// call sites route through this entry point; per-asset deprecated helpers
// were removed.
export function renderEquipmentSvg(req: EquipmentRenderRequest): string {
	const overrideLabel = pickLabelOverride(req);
	switch (req.assetId) {
		case "t75_flask":
		case "flask": {
			// liquidState for the flask is a T75LiquidVisual; default to "empty"
			// (no liquid, no residue) when not provided so callers that just
			// want the empty flask get a sensible render without state plumbing.
			// "flask" is the layout-side alias; both ids render the same SVG.
			const visual = (req.liquidState as T75LiquidVisual | undefined) ?? "empty";
			return renderT75FlaskFromVisual(visual, overrideLabel);
		}
		case "bottle": {
			// liquidState for the bottle is required. Throw if missing.
			if (req.liquidState === undefined) {
				throw new Error(
					"svg_assets: bottle asset '" + req.assetId + "' requires liquidState;"
					+ " a bottle must be rendered with a specific liquid color (media, pbs, etc.).",
				);
			}
			const liquid = req.liquidState as BottleLiquid;
			return renderBottleFromLiquid(liquid, overrideLabel);
		}
		// Bottle-liquid aliases (layout-only ids). Route through the bottle
		// liquid lookup and recolor pipeline so the static query path returns
		// the correctly-tinted bottle SVG, never the raw Servier base.
		case "media_bottle":
		case "pbs_bottle":
		case "trypsin_bottle":
		case "dmso_bottle":
		case "sterile_water":
		case "carboplatin_stock":
		case "carboplatin_stock_solution":
		case "metformin_stock":
		case "metformin_stock_solution":
		case "distilled_water": {
			const liquid = liquidForBottleAlias(req.assetId);
			return renderBottleFromLiquid(liquid, overrideLabel);
		}
		case "sero_pipette":
		case "serological_pipette":
			// renderEquipmentSvg returns the empty pipette; callers that need
			// a volume + custom hex color use getSeroPipetteSvg(volumeMl, color)
			// directly (see below).
			return SVG_SERO_PIPETTE;
		case "waste_container":
			return renderWasteContainerSvg();
		case "ethanol_spray":
		case "ethanol_bottle":
			return renderEthanolSprayInternal();
		case "drug_vial_rack":
		case "drug_vials":
			return renderDrugVialsInternal();
		case "angry_professor":
			return SVG_ANGRY_PROFESSOR;
		case "aspirating_pipette":
			return SVG_ASPIRATING_PIPETTE;
		case "biohazard_decant":
			return SVG_BIOHAZARD_DECANT;
		case "cell_counter":
			return SVG_CELL_COUNTER;
		case "centrifuge":
			return SVG_CENTRIFUGE;
		case "conical_15ml_rack":
			return SVG_CONICAL_15ML_RACK;
		case "dilution_tube_rack":
			return SVG_DILUTION_TUBE_RACK;
		case "glove_box":
			return SVG_GLOVE_BOX;
		case "incubator":
			return SVG_INCUBATOR;
		case "micropipette_rack":
			return SVG_MICROPIPETTE_RACK;
		case "microscope":
			return SVG_MICROSCOPE;
		case "mtt_vial":
			return SVG_MTT_VIAL;
		case "multichannel_pipette":
			return SVG_MULTICHANNEL_PIPETTE;
		case "plate_reader":
			return SVG_PLATE_READER;
		case "tip_box":
			return SVG_TIP_BOX;
		case "vortex":
			return SVG_VORTEX;
		case "waste_tray":
			return SVG_WASTE_TRAY;
		case "water_bath":
			return SVG_WATER_BATH;
		case "well_plate":
			return SVG_WELL_PLATE_24;
		case "well_plate_96":
			return SVG_96WELL_PCR_PLATE;
		case "microtube_open_translucent":
			return SVG_MICROTUBE_OPEN_TRANSLUCENT;
		case "bottle_medium_pink":
			return SVG_BOTTLE_MEDIUM_PINK;
		default: {
			// Exhaustiveness check: adding a new EQUIPMENT_ASSETS key without a
			// matching switch case becomes a compile error at this line, instead
			// of silently returning undefined at runtime.
			const _exhaustive: never = req.assetId;
			throw new Error("svg_assets: unhandled assetId " + String(_exhaustive));
		}
	}
}

// ============================================
// Public asset query API (M4)
// ============================================
// Layout/scene-facing code (e.g. layout_engine.ts) needs the raw SVG markup
// and its viewBox aspect ratio for any equipment asset id, without going
// through the recipe/overlay pipeline. These two helpers replace the
// per-asset `import { SVG_* } from "../generated/svg_assets/<name>"` block
// that lived in layout_engine.ts before M4. With them, only svg_assets.ts
// (the composition facade) and svg_color_patch.ts (the recolor primitives
// layer) remain as legitimate `generated/` importers.

// ============================================
// Internal: cache of parsed aspect ratios keyed by EquipmentAssetId. The
// raw SVG markup is invariant for the lifetime of the bundle, so a single
// parse per asset id is sufficient.
const _aspectRatioCache: Record<string, number> = {};

// ============================================
// Parse aspect ratio (height/width) from an SVG viewBox attribute. Returns
// 1.0 (square) when the viewBox is missing or malformed; layout_engine
// callers tolerate this by treating 1.0 as the safe default.
function parseSvgAspectRatio(svgHtml: string): number {
	const match = svgHtml.match(/viewBox="([^"]+)"/);
	if (!match || match[1] === undefined) return 1.0;
	const parts = match[1].split(/\s+/);
	if (parts.length < 4) return 1.0;
	// parts indices 2 and 3 are guaranteed to exist since length >= 4
	const vbWidth = parseFloat(parts[2]!);
	const vbHeight = parseFloat(parts[3]!);
	if (vbWidth <= 0) return 1.0;
	return vbHeight / vbWidth;
}

// ============================================
// Internal: narrow runtime check that an arbitrary string is a known
// EquipmentAssetId. Layout/scene callers receive ids from scene YAML
// (typed as `string`) and must convert at the boundary; unknown ids fall
// through to the safe default (empty SVG / 1.0 aspect ratio) rather than
// crashing the layout pass for a missing asset.
function isEquipmentAssetId(value: string): value is EquipmentAssetId {
	return Object.prototype.hasOwnProperty.call(EQUIPMENT_ASSETS, value);
}

// ============================================
// Return the raw SVG markup for an equipment asset, with bottle-liquid
// aliases recolored via the recipe pipeline. Used by layout_engine.ts for
// aspect-ratio extraction and by protocol_ui.ts for the static angry-prof
// bubble image. Calls renderEquipmentSvg with no liquidState so the
// "natural" static render is returned (an empty flask, an unfilled bottle
// recolored for the alias's liquid, etc.). Throws an Error when the asset id
// is unknown, exposing scene YAML typos or mislabeled asset references at
// composition time instead of silently returning empty SVG.
export function getStaticSvg(assetId: string): string {
	if (!isEquipmentAssetId(assetId)) {
		throw new Error(
			"svg_assets: getStaticSvg called with unknown asset id '" + assetId + "'",
		);
	}
	return renderEquipmentSvg({ assetId });
}

// ============================================
// Return the cached aspect ratio (height/width, in viewBox units) for an
// equipment asset id. The cache key is the asset id; identical ids share
// a cached parse result. Throws an Error when the asset id is unknown,
// exposing scene YAML typos or mislabeled asset references at composition
// time instead of silently returning a default ratio.
export function getAssetAspectRatio(assetId: string): number {
	if (_aspectRatioCache[assetId] !== undefined) {
		return _aspectRatioCache[assetId]!;
	}
	const svgHtml = getStaticSvg(assetId);
	const ratio = parseSvgAspectRatio(svgHtml);
	_aspectRatioCache[assetId] = ratio;
	return ratio;
}


/**
 * Gets the hood background SVG - the tissue culture hood/biosafety cabinet interior
 */
export function getHoodBackgroundSvg(): string {
	return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
		<!-- Define gradients -->
		<defs>
			<linearGradient id="stainlessSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:#e8e8e8;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#c0c0c0;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#a0a0a0;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#b0d4ff;stop-opacity:0.4" />
				<stop offset="100%" style="stop-color:#7cb3ff;stop-opacity:0.3" />
			</linearGradient>
			<linearGradient id="padGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#4a90e2;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#2563d4;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Side walls (dark gray) -->
		<polygon points="0,100 50,50 750,50 800,100 800,550 750,600 50,600 0,550" fill="#888888" />

		<!-- Back wall (stainless steel) -->
		<polygon points="50,50 750,50 750,350 50,350" fill="url(#stainlessSteelGrad)" />

		<!-- Glass sash at top (semi-transparent) -->
		<polygon points="60,60 740,60 740,200 60,200" fill="url(#glassGrad)" stroke="#999" stroke-width="2" />

		<!-- Subtle horizontal line on glass (reflection effect) -->
		<line x1="60" y1="90" x2="740" y2="90" stroke="#ffffff" stroke-width="1" opacity="0.6" />

		<!-- Lower back wall continues -->
		<polygon points="50,350 750,350 750,550 50,550" fill="#999999" />

		<!-- Work surface (white/light gray trapezoid for perspective) -->
		<polygon points="40,550 60,580 740,580 760,550" fill="#f5f5f5" stroke="#ddd" stroke-width="1" />

		<!-- Blue absorbent pad on work surface -->
		<rect x="70" y="560" width="660" height="18" fill="url(#padGrad)" rx="2" />

		<!-- pad detail line -->
		<line x1="70" y1="578" x2="730" y2="578" stroke="#ccc" stroke-width="0.5" />

		<!-- Side walls (3D effect) -->
		<polygon points="0,100 50,50 50,550 0,550" fill="#666666" />
		<polygon points="750,50 800,100 800,550 750,550" fill="#777777" />

		<!-- Bottom edge line -->
		<line x1="40" y1="550" x2="760" y2="550" stroke="#ccc" stroke-width="1" />
	</svg>`;
}

// ============================================
// Public helpers below: functions that stay public because their signatures
// cannot collapse cleanly into renderEquipmentSvg.
// ============================================

/**
 * Renders the serological pipette with an optional liquid fill overlay tinted
 * by a caller-supplied hex color and volume. Kept as a named helper because
 * the volume + custom-hex-color signature is outside renderEquipmentSvg's
 * semantic-state surface (which only accepts liquidState role enums).
 *
 * @param volumeMl - volume of liquid in milliliters (default 0 = empty)
 * @param color - hex color code for liquid (default null = no overlay)
 */
export function getSeroPipetteSvg(volumeMl: number = 0, color: string | null = null): string {
	if (volumeMl <= 0 || !color) {
		return SVG_SERO_PIPETTE;
	}
	const overlays: string[] = [
		createPipetteLiquidOverlay("sero_pipette", volumeMl, 10, color, SVG_SERO_PIPETTE),
	];
	return composeSvg(SVG_SERO_PIPETTE, "sero_pipette", overlays);
}

/**
 * Renders the 24-well plate (despite the name, an 8x12 = 96-well grid driven
 * by PLATE_96_ROWS / PLATE_96_COLS) with per-well color overlays derived from
 * the WellData state. Kept as a named helper because the input is a per-well
 * data array, not a single liquidState role.
 */
export function getWellPlateSvg(wells: WellData[]): string {
	// Render 8x12 well plate grid
	// viewBox="0 0 320 240" with 10 px per well + padding for labels
	const wellSize = 10;
	const spacingX = 12;
	const spacingY = 12;
	const marginLeft = 25;
	const marginTop = 20;

	let svgContent = '<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">';
	svgContent += '<defs>';
	svgContent += '<linearGradient id="well_gradient_carb" x1="0%" y1="0%" x2="100%" y2="100%">';
	svgContent += '<stop offset="0%" style="stop-color:#f5e6c8;stop-opacity:1" />';
	svgContent += '<stop offset="100%" style="stop-color:#8a4fa0;stop-opacity:1" />';
	svgContent += '</linearGradient>';
	svgContent += '</defs>';

	svgContent += '<rect width="320" height="240" fill="white" />';

	for (let row = 0; row < PLATE_96_ROWS; row++) {
		const y = marginTop + row * spacingY + wellSize / 2;
		svgContent += '<text x="8" y="' + (y + 2) + '" font-family="Arial,sans-serif"'
			+ ' font-size="7" fill="#333333" text-anchor="middle">' + ROW_LABELS[row] + '</text>';
	}

	for (let col = 0; col < PLATE_96_COLS; col++) {
		const x = marginLeft + col * spacingX + wellSize / 2;
		svgContent += '<text x="' + x + '" y="12" font-family="Arial,sans-serif"'
			+ ' font-size="6" fill="#333333" text-anchor="middle">' + COL_LABELS[col] + '</text>';
	}

	for (let row = 0; row < PLATE_96_ROWS; row++) {
		for (let col = 0; col < PLATE_96_COLS; col++) {
			const x = marginLeft + col * spacingY;
			const y = marginTop + row * spacingY;
			const well = wells[row * PLATE_96_COLS + col];

			let fill = '#eaeaea'; // default empty grey

			if (well !== undefined && well.hasCells) {
				if (well.absorbance > 0) {
					// Gradient from tan (blank ~0.05) to purple (high ~1.2)
					// Map absorbance to 0-1 range for gradient interpolation
					const absorbanceMin = 0.05;
					const absorbanceMax = 1.2;
					const normalizedAbs = Math.max(0, Math.min(1, (well.absorbance - absorbanceMin) / (absorbanceMax - absorbanceMin)));
					// Interpolate between tan (#f5e6c8) and purple (#8a4fa0)
					const tanR = 245, tanG = 230, tanB = 200;
					const purpleR = 138, purpleG = 79, purpleB = 160;
					const r = Math.round(tanR + normalizedAbs * (purpleR - tanR));
					const g = Math.round(tanG + normalizedAbs * (purpleG - tanG));
					const b = Math.round(tanB + normalizedAbs * (purpleB - tanB));
					fill = 'rgb(' + r + ',' + g + ',' + b + ')';
				} else {
					// Cells present but not yet read; use tan
					fill = '#f5e6c8';
				}
			}

			svgContent += '<rect x="' + x + '" y="' + y + '" width="' + wellSize + '" height="' + wellSize + '"'
				+ ' fill="' + fill + '" stroke="#ccc" stroke-width="0.5" />';
		}
	}

	svgContent += '</svg>';
	return svgContent;
}

