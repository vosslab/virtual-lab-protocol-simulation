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

  if (!svgMarkup) {
    throw new Error(`SVG asset not found in registry: "${assetName}"`);
  }

  host.innerHTML = svgMarkup;
}
