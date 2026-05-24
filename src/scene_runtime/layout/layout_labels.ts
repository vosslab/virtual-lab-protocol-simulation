// Stage 9: Label layout + 3-pass collision nudge within each zone.
// Sets _labelX, _labelY, _labelLines. Wraps labels exceeding their budget.
// Labels are clamped inside the padded zone; cross-zone collision is not
// checked here.

import { ZONE_PADDING } from "./constants.js";
import { wrapLabel } from "./wrap_label.js";
import type { ComputedItem, Diagnostics, LayoutRules, Zone } from "./types.js";

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

    items.sort((a, b) => a._labelX - b._labelX);
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];
      if (prev === undefined || cur === undefined) continue;
      const want = (prev.layout.label_width + cur.layout.label_width) / 2;
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
