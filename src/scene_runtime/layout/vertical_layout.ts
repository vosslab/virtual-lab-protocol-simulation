// Stage 8: Vertical layout.
// Computes _y (baseline), _height, _top per item.
// heightPct = visualWidth * (viewport.w / viewport.h) / aspect. Keeps pixel
// aspect invariant regardless of viewport shape (percent units are per-axis).

import {
  DEPTH_BASELINE_OFFSET,
  DEFAULT_VIEWPORT,
  ITEM_ESCAPES_ZONE_TOLERANCE,
} from "./constants.js";
import { depthFor } from "./footprint.js";
import type { ComputedItem, Diagnostics, Zone } from "./types.js";

export function verticalLayout(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
  diagnostics: Diagnostics = [],
): Map<string, ComputedItem[]> {
  const viewportAspect = viewport.w / viewport.h;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    const zoneBaselineY = zone.baseline ?? (zone.bounds.top + zone.bounds.bottom) / 2;

    const updated = items.map((it): ComputedItem => {
      const depthOffset = DEPTH_BASELINE_OFFSET[depthFor(it)];
      const baseline = it.baseline_override ?? zoneBaselineY + depthOffset;
      const aspect = Math.max(0.01, it.aspect);
      const heightPct = (it._visualWidth * viewportAspect) / aspect;
      let top: number;
      if (it.layout.anchor_y === "bottom") {
        top = baseline - heightPct;
      } else if (it.layout.anchor_y === "tip") {
        top = baseline + it.layout.anchor_y_offset - heightPct;
      } else {
        top = baseline - heightPct / 2;
      }

      if (
        top < zone.bounds.top - ITEM_ESCAPES_ZONE_TOLERANCE ||
        top + heightPct > zone.bounds.bottom + ITEM_ESCAPES_ZONE_TOLERANCE
      ) {
        diagnostics.push({
          stage: "vertical",
          severity: "warn",
          kind: "item_escapes_zone_vertically",
          zone: zone.id,
          placement_name: it.placement_name,
        });
      }

      return {
        ...it,
        _y: baseline,
        _top: top,
        _height: heightPct,
      };
    });

    result.set(zone.id, updated);
  }

  return result;
}
