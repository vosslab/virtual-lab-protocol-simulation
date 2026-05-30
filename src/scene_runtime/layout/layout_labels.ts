// Stage 9: Label layout + 3-pass horizontal collision nudge, then greedy
// vertical stagger within each zone. Sets _labelX, _labelY, _labelLines.
// Wraps labels exceeding their budget. Labels are clamped inside the padded
// zone; cross-zone collision is not checked here.
//
// The stagger writes only _labelX/_labelY (label coordinates). It NEVER writes
// _x/_y (item coordinates), so item placement is unchanged and a scene whose
// labels do not collide assigns every label to row 0 and renders identically
// to the pre-stagger behavior.

import { AVG_CHAR_WIDTH_PCT, LABEL_LINE_HEIGHT_PCT, ZONE_PADDING } from "./constants.js";
import { wrapLabel } from "./wrap_label.js";
import type { ComputedItem, Diagnostics, LayoutRules, Zone } from "./types.js";

// Effective rendered half-width of a label in scene-percent. The authored
// label_width is a layout-time budget; a long label whose wrapped line still
// exceeds the budget renders wider than it. The stagger's row-fit test uses the
// wider of the budget and the engine's own per-char text estimate
// (AVG_CHAR_WIDTH_PCT, the same model wrap_label uses) so it separates labels
// that would otherwise visually overprint. Short labels (text estimate <=
// budget) keep the budget half-width, so clean scenes still assign every label
// to row 0 and render identically.
function effectiveLabelHalfWidth(lines: string[], labelWidth: number): number {
  let maxLen = 0;
  for (const line of lines) {
    if (line.length > maxLen) maxLen = line.length;
  }
  const textWidth = maxLen * AVG_CHAR_WIDTH_PCT;
  const effective = Math.max(labelWidth, textWidth);
  return effective / 2;
}

export function layoutLabels(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  layoutRules: LayoutRules = {},
  diagnostics: Diagnostics = [],
): Map<string, ComputedItem[]> {
  const labelOffsetY = layoutRules.label_offset_y ?? 3.5;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const source = zoneLayouts.get(zone.id) ?? [];
    const items: ComputedItem[] = source.map((it) => ({
      ...it,
      _labelLines: wrapLabel(it.label, it.layout.label_width),
      _labelX: it._x,
      _labelY: it._y + labelOffsetY,
    }));

    for (let pass = 0; pass < 3; pass++) {
      items.sort((a, b) => a._labelX - b._labelX);
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const cur = items[i];
        if (prev === undefined || cur === undefined) continue;
        const want = (prev.layout.label_width + cur.layout.label_width) / 2;
        const gap = cur._labelX - prev._labelX;
        if (gap < want) {
          const push = (want - gap) / 2;
          prev._labelX -= push;
          cur._labelX += push;
        }
      }
      const x0 = zone.bounds.left + ZONE_PADDING;
      const x1 = zone.bounds.right - ZONE_PADDING;
      for (const it of items) {
        const half = it.layout.label_width / 2;
        if (it._labelX < x0 + half) it._labelX = x0 + half;
        if (it._labelX > x1 - half) it._labelX = x1 - half;
      }
    }

    // Greedy interval-graph vertical stagger. After the horizontal nudge,
    // adjacent labels may still overlap (the nudge is bounded by zone width).
    // Sort by left edge (placement_name tiebreak for determinism), then place
    // each label in the lowest row whose last-placed label's right edge is
    // clear. A label that fits in row 0 stays at its row-0 _labelY, so clean
    // scenes are byte-identical. Lower rows drop _labelY by a multiple of the
    // staggered row height scaled by the label's line count.
    items.sort((a, b) => {
      if (a._labelX !== b._labelX) return a._labelX - b._labelX;
      return a.placement_name.localeCompare(b.placement_name);
    });
    // Pass 1: assign each label a row index. rowRightEdges[r] tracks the right
    // edge (scene-percent) of the last label placed in row r; a label fits in
    // row r when its left edge clears that right edge. Lowest fitting row wins.
    const rowRightEdges: number[] = [];
    const rowOf = new Map<string, number>();
    let maxRow = 0;
    for (const it of items) {
      const half = effectiveLabelHalfWidth(it._labelLines, it.layout.label_width);
      const leftEdge = it._labelX - half;
      const rightEdge = it._labelX + half;
      // Gap of 0.3 mirrors the residual-collision tolerance used below.
      let row = 0;
      while (row < rowRightEdges.length) {
        const edge = rowRightEdges[row];
        if (edge === undefined || leftEdge >= edge - 0.3) break;
        row++;
      }
      rowRightEdges[row] = rightEdge;
      rowOf.set(it.placement_name, row);
      if (row > maxRow) maxRow = row;
    }

    // Pass 2: map row index to a _labelY. Row 0 keeps its baseline (so clean
    // single-row scenes are byte-identical). Lower rows drop by the staggered
    // row height, but the per-row step is compressed when the natural spacing
    // would push the bottom row past the padded zone floor -- this keeps every
    // assigned row at a DISTINCT Y instead of collapsing them all onto the
    // clamp line, which is what reintroduces overprint in tight, short zones.
    if (maxRow > 0) {
      const bottomClamp = zone.bounds.bottom - ZONE_PADDING;
      // Use the largest line count among staggered labels so a 2-line label in
      // any lower row still clears the row below it where space allows.
      let maxLineCount = 1;
      for (const it of items) {
        const r = rowOf.get(it.placement_name) ?? 0;
        if (r > 0) maxLineCount = Math.max(maxLineCount, it._labelLines.length);
      }
      const naturalStep = LABEL_LINE_HEIGHT_PCT * maxLineCount;
      // Baseline is the common row-0 Y (item _y + labelOffsetY). All items in a
      // zone share labelOffsetY; row-0 items differ only by their own _y, so we
      // anchor each label's stagger on its own row-0 baseline, then compress the
      // step uniformly so the deepest row lands at or above the clamp.
      for (const it of items) {
        const row = rowOf.get(it.placement_name) ?? 0;
        if (row === 0) continue;
        const baseline = it._y + labelOffsetY;
        let step = naturalStep;
        const naturalBottom = baseline + maxRow * naturalStep;
        if (naturalBottom > bottomClamp) {
          // Compress so row maxRow sits exactly on the clamp line.
          const available = bottomClamp - baseline;
          step = available > 0 ? available / maxRow : 0;
        }
        it._labelY = baseline + row * step;
        diagnostics.push({
          stage: "labels",
          severity: "info",
          kind: "label_row_staggered",
          zone: zone.id,
          placement_name: it.placement_name,
          staggered_row: row,
        });
      }
    }

    // Residual collision: after staggering, two labels still overlap only when
    // they share a row and their horizontal extents overlap. Report each such
    // pair so the diagnostic metric can flag the scene.
    items.sort((a, b) => a._labelX - b._labelX);
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];
      if (prev === undefined || cur === undefined) continue;
      // Only labels on the same assigned row can collide horizontally; labels
      // on different rows are vertically separated by the stagger.
      if ((rowOf.get(prev.placement_name) ?? 0) !== (rowOf.get(cur.placement_name) ?? 0)) continue;
      const prevHalf = effectiveLabelHalfWidth(prev._labelLines, prev.layout.label_width);
      const curHalf = effectiveLabelHalfWidth(cur._labelLines, cur.layout.label_width);
      const want = prevHalf + curHalf;
      if (cur._labelX - prev._labelX < want - 0.3) {
        diagnostics.push({
          stage: "labels",
          severity: "warn",
          kind: "label_collision_residual",
          zone: zone.id,
          between: [prev.placement_name, cur.placement_name],
        });
      }
    }

    items.sort((a, b) => {
      const ta = a.depth_tier ?? 0;
      const tb = b.depth_tier ?? 0;
      if (ta !== tb) return ta - tb;
      return a.placement_name.localeCompare(b.placement_name);
    });
    result.set(zone.id, items);
  }

  return result;
}
