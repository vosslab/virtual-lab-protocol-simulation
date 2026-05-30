// Label rendering: positions label element at scene-percent coordinates.
// Multi-line labels from ComputedItem._labelLines. No clipping, no overflow.
// Font: PT Sans Narrow (bundled woff2), size from layout_rules.label_font_size
// or 16px default.
// The render canvas is ~1900px wide, so the default must be readable at that
// scale; the legacy 9px default rendered illegible on a full-size scene.

import type { ComputedItem } from "../layout/types.js";

//============================================
// Label element rendering.
//============================================

/**
 * Render a label element for a ComputedItem.
 * Positions at scene-percent (_labelX, _labelY), emits multi-line text.
 *
 * @param item - ComputedItem with _labelLines, _labelX, _labelY, label, placement_name.
 * @param labelFontSize - Font size in px (from layout_rules.label_font_size or default 16px).
 * @returns HTMLElement positioned absolutely at label coordinates.
 */
export function renderLabel(item: ComputedItem, labelFontSize: number = 16): HTMLElement {
  const label = document.createElement("div");

  // Positioning: scene-percent to CSS percent for absolute positioning.
  label.style.position = "absolute";
  label.style.left = `${item._labelX}%`;
  label.style.top = `${item._labelY}%`;
  label.style.transform = "translateX(-50%)"; // Center horizontally on label point.

  // Typography: PT Sans Narrow condensed face. The layout engine already
  // wrapped the label into
  // _labelLines, joined below with "\n". Use "pre" (not "nowrap"): "nowrap"
  // collapses the embedded newline into a space, so a 2-line label renders as
  // one long line, ~2x wider than the layout reserved, which reintroduces label
  // overprint. "pre" preserves each "\n" as a real line break and still does no
  // auto-wrapping inside a line (the pipeline already chose the break points).
  label.style.fontFamily = '"PT Sans Narrow", "Arial Narrow", sans-serif';
  label.style.fontSize = `${labelFontSize}px`;
  label.style.whiteSpace = "pre"; // Honor pipeline line breaks; no auto-wrap.
  label.style.textAlign = "center";
  label.style.color = "#333333";
  label.style.pointerEvents = "none"; // Non-interactive; click passes through.

  // Multi-line: join _labelLines with line breaks.
  const text = item._labelLines.join("\n");
  label.textContent = text;

  // Attributes for debugging, diagnostics, and future wiring.
  label.setAttribute("data-label", "");
  label.setAttribute("data-label-for", item.placement_name);

  return label;
}
