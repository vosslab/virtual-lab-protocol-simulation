// Stage 10: Scene-bounds clamp.
// For each zone, computes the bbox of its items. If any edge escapes
// scene_bounds, translates the whole zone group by a single (dx, dy).
// Items in the same zone shift together; this preserves intra-zone alignment.

import type { ComputedItem, Diagnostics, SceneBoundsRect, Zone } from "./types.js";

export function clampSceneBounds(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect | undefined,
  diagnostics: Diagnostics = [],
): Map<string, ComputedItem[]> {
  if (!sceneBounds) return zoneLayouts;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    if (items.length === 0) {
      result.set(zone.id, items);
      continue;
    }

    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxBottom = -Infinity;
    for (const it of items) {
      const left = it._x - it._visualWidth / 2;
      const right = it._x + it._visualWidth / 2;
      if (left < minLeft) minLeft = left;
      if (right > maxRight) maxRight = right;
      if (it._top < minTop) minTop = it._top;
      const bot = it._top + it._height;
      if (bot > maxBottom) maxBottom = bot;
    }

    let dx = 0;
    let dy = 0;
    if (minLeft < sceneBounds.left) dx = sceneBounds.left - minLeft;
    if (maxRight > sceneBounds.right) dx = sceneBounds.right - maxRight;
    if (minTop < sceneBounds.top) dy = sceneBounds.top - minTop;
    if (maxBottom > sceneBounds.bottom) dy = sceneBounds.bottom - maxBottom;

    if (dx !== 0 || dy !== 0) {
      diagnostics.push({
        stage: "clamp",
        severity: "warn",
        kind: "zone_clamped_to_bounds",
        zone: zone.id,
        dx: Number(dx.toFixed(2)),
        dy: Number(dy.toFixed(2)),
      });
    }

    const updated = items.map(
      (it): ComputedItem => ({
        ...it,
        _x: it._x + dx,
        _y: it._y + dy,
        _top: it._top + dy,
        _labelX: it._labelX + dx,
        _labelY: it._labelY + dy,
        _clamped: dx !== 0 || dy !== 0,
      }),
    );
    result.set(zone.id, updated);
  }

  return result;
}
