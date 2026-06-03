// SVG manifest loader: the FETCH/MANIFEST layer of SVG asset loading.
//
// This module is deliberately separate from DOM injection (inject_svg.ts). It
// resolves an asset_name to its relative built-site URL via the generated
// manifest, fetches the SVG text over HTTP, and caches the text by URL so each
// asset is fetched at most once and reused across every placement that renders
// it. It performs NO DOM parsing, NO id namespacing, and NO host insertion --
// those belong to the injection layer. Keeping the two layers apart means
// namespaceSvgIds stays source-agnostic: it works identically on text that came
// from a test-supplied markup string or from a fetched file.
//
// Loud failures only: an unknown asset name, or a fetch that does not return
// 200, throws an Error with context. There is no silent blank fallback.

import { SVG_MANIFEST } from "../../../generated/svg_manifest.js";

//============================================

// One in-flight-or-resolved fetch promise per asset URL. Caching the PROMISE
// (not just the resolved text) means concurrent placements that request the
// same asset before the first fetch resolves all share a single network call.
const svgTextCache = new Map<string, Promise<string>>();

//============================================

/**
 * Resolve an asset_name to its relative manifest URL.
 *
 * The returned path has no leading slash (for example
 * "assets/svg/equipment/bottle.svg") so it resolves under a GitHub Pages
 * project subpath. Throws if the asset is not in the manifest.
 *
 * @param assetName - asset_name key in SVG_MANIFEST
 * @returns the relative built-site URL for the asset's SVG file
 * @throws Error if the asset is not present in the manifest
 */
export function resolveSvgUrl(assetName: string): string {
  const entry = SVG_MANIFEST[assetName];
  if (entry === undefined) {
    throw new Error(`SVG asset not found in manifest: "${assetName}"`);
  }
  return entry.path;
}

//============================================

/**
 * Return whether an asset must render as injected SVG DOM (vs an opaque img).
 *
 * This is the generation-time-derived requires_dom_svg value read as data. It
 * is derived from object declarations, never from current material state, and
 * is stable across the object's lifetime. Throws if the asset is unknown.
 *
 * @param assetName - asset_name key in SVG_MANIFEST
 * @returns true when the asset requires injected SVG DOM rendering
 * @throws Error if the asset is not present in the manifest
 */
export function requiresDomSvg(assetName: string): boolean {
  const entry = SVG_MANIFEST[assetName];
  if (entry === undefined) {
    throw new Error(`SVG asset not found in manifest: "${assetName}"`);
  }
  return entry.requires_dom_svg;
}

//============================================

/**
 * Fetch the SVG text for an asset, cached by its manifest URL.
 *
 * One network fetch per asset URL; the in-flight promise is shared so many
 * placements requesting the same asset trigger a single fetch. A non-OK HTTP
 * response throws with the asset name, URL, and status -- never a silent blank.
 * An empty body also throws (an empty SVG would inject nothing).
 *
 * @param assetName - asset_name key in SVG_MANIFEST
 * @returns a promise resolving to the raw SVG text
 * @throws Error if the asset is unknown, the fetch fails, or the body is empty
 */
export async function fetchSvgText(assetName: string): Promise<string> {
  const url = resolveSvgUrl(assetName);

  // Reuse an in-flight or resolved fetch for this URL.
  const cached = svgTextCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  // Start one fetch and cache the promise immediately so concurrent callers
  // share it. On failure, evict the cache entry so a later call can retry
  // rather than permanently caching a rejected promise.
  const pending = fetchSvgTextUncached(assetName, url);
  svgTextCache.set(url, pending);
  pending.catch(function evictOnFailure(): void {
    svgTextCache.delete(url);
  });
  return pending;
}

//============================================

// Perform the actual fetch for one asset URL, with loud failures.
async function fetchSvgTextUncached(assetName: string, url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `SVG fetch failed for "${assetName}" at "${url}": ${response.status} ${response.statusText}`,
    );
  }
  const text = await response.text();
  if (text.trim().length === 0) {
    throw new Error(`SVG fetch returned empty body for "${assetName}" at "${url}"`);
  }
  return text;
}
