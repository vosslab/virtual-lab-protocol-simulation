// Label rendering: positions label element at scene-percent coordinates.
// Multi-line labels from ComputedItem._labelLines. No clipping, no overflow.
// Font: monospace, size from layout_rules.label_font_size or 9px default.

import type { ComputedItem } from "../layout/types.js";

//============================================
// Label element rendering.
//============================================

/**
 * Render a label element for a ComputedItem.
 * Positions at scene-percent (_labelX, _labelY), emits multi-line text.
 *
 * @param item - ComputedItem with _labelLines, _labelX, _labelY, label, placement_name.
 * @param labelFontSize - Font size in px (from layout_rules.label_font_size or default 9px).
 * @returns HTMLElement positioned absolutely at label coordinates.
 */
export function renderLabel(item: ComputedItem, labelFontSize: number = 9): HTMLElement {
  const label = document.createElement("div");

  // Positioning: scene-percent to CSS percent for absolute positioning.
  label.style.position = "absolute";
  label.style.left = `${item._labelX}%`;
  label.style.top = `${item._labelY}%`;
  label.style.transform = "translateX(-50%)"; // Center horizontally on label point.

  // Typography: monospace, no wrapping since layout engine already wrapped.
  label.style.fontFamily = "monospace";
  label.style.fontSize = `${labelFontSize}px`;
  label.style.whiteSpace = "nowrap"; // Each line is already wrapped by pipeline.
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
