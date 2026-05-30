// SVG injection helper. THE ONLY function in the renderer that uses innerHTML.
// Reads from SVG_REGISTRY[assetName]. Throws loudly if asset is missing.
// No fallback SVG, no placeholder, no silent failures.

import { SVG_REGISTRY } from "../../../generated/svg_registry.js";

//============================================

/**
 * Inject an SVG asset into a host element by asset name.
 * Reads from SVG_REGISTRY. Throws if asset is missing.
 * This is the ONLY function in the renderer that uses innerHTML.
 *
 * @param host - HTMLElement to inject SVG into
 * @param assetName - Asset name key in SVG_REGISTRY
 * @throws Error if asset is not found in SVG_REGISTRY
 */
export function injectSvgInto(host: HTMLElement, assetName: string): void {
  const svgMarkup = SVG_REGISTRY[assetName];

  // Missing key: the asset was never registered (e.g. dropped by validation).
  if (svgMarkup === undefined) {
    throw new Error(`SVG asset not found in registry: "${assetName}"`);
  }

  // Empty / whitespace-only markup: a registered-but-empty asset (e.g. a
  // 0-byte source SVG) would inject nothing and draw a silent blank layer.
  // Fail loudly here so a future empty asset can never render as invisible
  // content. Repo principle: loud failures, never silent blank.
  if (svgMarkup.trim().length === 0) {
    throw new Error(`SVG asset is empty in registry: "${assetName}"`);
  }

  host.innerHTML = svgMarkup;
}
