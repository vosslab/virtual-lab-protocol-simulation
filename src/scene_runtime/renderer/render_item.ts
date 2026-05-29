// Item rendering. Creates a div for each ComputedItem with SVG asset injection.
// Positions at scene-percent coordinates. Emits all six DOM attributes.
// Placeholder path: when missing_svg === true (placeholder mode only), renders a
// dashed-border labeled box instead of a real SVG. Never appears in strict builds.

import type { ComputedItem } from "../layout/types.js";
import { injectSvgInto } from "./inject_svg.js";

//============================================

/**
 * Apply absolute-position CSS to an element using scene-percent coordinates.
 * Also sets z-index from depth tier (back:1, mid:2, front:3).
 *
 * @param el - element to position
 * @param item - ComputedItem supplying coordinates and depth
 */
function applyPositionStyles(el: HTMLElement, item: ComputedItem): void {
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
  // depth ?? 1 is an intentional default: items lacking a depth tier render in the back tier (z-index 1).
  const zIndex = item.depth ? (depthMap[item.depth] ?? 1) : 1;
  el.style.zIndex = String(zIndex);
}

/**
 * Emit the six shared DOM attributes present on every rendered item.
 * These attributes are used for debugging, diagnostics, and wiring.
 * data-item-id mirrors object_name so Playwright walkers and click_resolver
 * can address the visible element directly.
 *
 * @param el - element to annotate
 * @param item - ComputedItem supplying attribute values
 */
function applyItemAttributes(el: HTMLElement, item: ComputedItem): void {
  el.setAttribute("data-placement-name", item.placement_name);
  el.setAttribute("data-object-name", item.object_name);
  el.setAttribute("data-zone", item.zone);
  el.setAttribute("data-kind", item.kind);
  if (item.depth) {
    el.setAttribute("data-depth", item.depth);
  }
  el.setAttribute("data-target-id", ""); // Reserved, empty in M2b.
  // Walker-addressable id: mirrors object_name for click_resolver and Playwright.
  el.setAttribute("data-item-id", item.object_name);
}

//============================================

/**
 * Render a missing-SVG placeholder element.
 * Used in placeholder mode (--missing-svg=placeholder) only.
 * The element is addressable by data-item-id like a normal item, but carries
 * data-missing-svg="true" and is styled as a visually obvious labeled box.
 * It is NEVER styled as a real scientific SVG asset.
 * It is a development safety net and does not satisfy final release quality.
 *
 * @param item - ComputedItem with missing_svg === true
 * @returns HTMLElement with placeholder styling, same data-item-id as a normal item
 */
function renderMissingPlaceholder(item: ComputedItem): HTMLElement {
  const el = document.createElement("div");

  applyPositionStyles(el, item);
  applyItemAttributes(el, item);

  // Mark as placeholder so tests and diagnostics can distinguish it from real items.
  el.setAttribute("data-missing-svg", "true");

  // Placeholder visual: dashed border, neutral background, centered label.
  // Deliberately NOT an object-fit/SVG container so it cannot be mistaken for
  // or cropped like a real scientific asset.
  el.style.boxSizing = "border-box";
  el.style.border = "2px dashed #c0392b";
  el.style.backgroundColor = "#fdf2f1";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.overflow = "visible";

  // Label text: object_name so the author knows which asset is missing.
  const label = document.createElement("span");
  label.style.fontSize = "11px";
  label.style.fontFamily = "monospace";
  label.style.color = "#c0392b";
  label.style.textAlign = "center";
  label.style.padding = "2px 4px";
  label.style.pointerEvents = "none";
  // Show object name on first line and "MISSING ART" below it.
  label.textContent = `${item.object_name}\nMISSING ART`;
  // whiteSpace "pre" is required so the \n in the label text renders as a line break.
  label.style.whiteSpace = "pre";

  el.appendChild(label);

  return el;
}

//============================================

/**
 * Render a single ComputedItem as an HTMLElement.
 * For normal items: creates a positioned div with SVG asset injected.
 * For placeholder-mode items (missing_svg === true): renders a dashed-border
 * labeled box instead of SVG injection.
 * Emits six DOM attributes on all items:
 * data-placement-name, data-object-name, data-zone, data-kind, data-depth, data-target-id.
 * Emits data-item-id on all items (walker-addressable).
 * Emits data-missing-svg="true" on placeholder items only.
 * Position uses percent units (%).
 *
 * @param item - ComputedItem with layout coordinates and object metadata
 * @returns HTMLElement positioned and styled, ready to append to parent
 * @throws Error if SVG asset is missing on a non-placeholder item
 */
export function renderItem(item: ComputedItem): HTMLElement {
  // Placeholder path: item is marked missing_svg in placeholder-mode builds.
  // Render as a clearly-labeled dashed box; skip SVG injection entirely.
  if (item.missing_svg === true) {
    return renderMissingPlaceholder(item);
  }

  // Normal path: position, annotate, and inject the real SVG asset.
  const el = document.createElement("div");

  applyPositionStyles(el, item);
  applyItemAttributes(el, item);

  // Inject SVG asset. Throws if asset missing (no fallback, no placeholder).
  injectSvgInto(el, item.asset);

  return el;
}
