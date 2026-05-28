// Item rendering. Creates a div for each ComputedItem with SVG asset injection.
// Positions at scene-percent coordinates. Emits all six DOM attributes.
// No fallback SVG, no placeholder elements.

import type { ComputedItem } from "../layout/types.js";
import { injectSvgInto } from "./inject_svg.js";

//============================================

/**
 * Render a single ComputedItem as an HTMLElement.
 * Creates a positioned div with SVG asset injected. Emits six DOM attributes:
 * data-placement-name, data-object-name, data-zone, data-kind, data-depth, data-target-id.
 * Sets z-index from depth tier (back:1, mid:2, front:3).
 * Position uses percent units (%).
 * Calls injectSvgInto for SVG injection (no innerHTML used directly).
 *
 * @param item - ComputedItem with layout coordinates and object metadata
 * @returns HTMLElement positioned and styled, ready to append to parent
 * @throws Error if SVG asset is missing
 */
export function renderItem(item: ComputedItem): HTMLElement {
  const el = document.createElement("div");

  // Position: scene-percent to CSS percent absolute positioning.
  el.style.position = "absolute";
  el.style.left = `${item._x}%`;
  el.style.top = `${item._top}%`;
  el.style.width = `${item._visualWidth}%`;
  el.style.height = `${item._height}%`;

  // Z-index from depth tier.
  const depthMap: Record<string, number> = {
    back: 1,
    mid: 2,
    front: 3,
  };
  const zIndex = item.depth ? (depthMap[item.depth] ?? 1) : 1;
  el.style.zIndex = String(zIndex);

  // Six DOM attributes for debugging, diagnostics, and future wiring.
  el.setAttribute("data-placement-name", item.placement_name);
  el.setAttribute("data-object-name", item.object_name);
  el.setAttribute("data-zone", item.zone);
  el.setAttribute("data-kind", item.kind);
  if (item.depth) {
    el.setAttribute("data-depth", item.depth);
  }
  el.setAttribute("data-target-id", ""); // Reserved, empty in M2b.
  // Walker-addressable id. Protocol YAML interactions reference targets
  // by object_name; mirror that onto data-item-id so click_resolver and
  // Playwright walkers can find the visible element directly.
  el.setAttribute("data-item-id", item.object_name);

  // Inject SVG asset. Throws if asset missing (no fallback, no placeholder).
  injectSvgInto(el, item.asset);

  return el;
}
