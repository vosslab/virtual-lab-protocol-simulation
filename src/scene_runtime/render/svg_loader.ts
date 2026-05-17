/**
 * svg_loader.ts
 *
 * Dynamic SVG asset loader for the scene renderer.
 * Resolves asset names to SVG strings from the generated svg_assets bundle.
 *
 * This module bridges the scene renderer (which operates independently of
 * the full svg_assets.ts facade) to the generated SVG constant exports.
 */

// Dynamically import SVG assets from generated/svg_assets/index.ts
// The barrel export provides all SVG_* constants.
import * as allAssets from '../../../generated/svg_assets/index';

// Type for any SVG constant export (SVG_BOTTLE, SVG_T75_FLASK, etc.)
type SvgExport = string;

/**
 * Map asset name to the corresponding SVG_* export name.
 * Example: "bottle" -> "SVG_BOTTLE", "t75_flask" -> "SVG_T75_FLASK"
 *
 * @param assetName The snake_case asset identifier.
 * @returns The SCREAMING_SNAKE_CASE export name, or undefined if no mapping.
 */
function mapAssetNameToExportName(assetName: string): string | undefined {
	// Convert snake_case to SCREAMING_SNAKE_CASE.
	const exportName = 'SVG_' + assetName.toUpperCase();

	// Check if the export exists in the allAssets barrel.
	if (exportName in allAssets) {
		return exportName;
	}

	// No matching export found.
	return undefined;
}

/**
 * Retrieve the SVG string for a given asset name.
 *
 * @param assetName The asset identifier (e.g., "bottle", "t75_flask").
 * @returns The SVG markup as a string, or undefined if not found.
 * @throws If the export name mapping fails or asset retrieval fails.
 */
export function getAssetSvgString(assetName: string): string | undefined {
	const exportName = mapAssetNameToExportName(assetName);
	if (!exportName) {
		return undefined;
	}

	// Retrieve the SVG constant from the barrel export.
	const svgConstant = (allAssets as Record<string, SvgExport>)[exportName];
	if (typeof svgConstant !== 'string') {
		return undefined;
	}

	return svgConstant;
}
