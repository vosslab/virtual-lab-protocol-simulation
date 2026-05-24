// Stage 7: Horizontal layout per zone.
// Computes _x (center), _visualWidth, _footprint, _scale per item.
// Alignment modes: left, right, center, justify, tab-stops.
// Overflow handling: shrink gaps -> uniform shrink to MIN_SCALE -> emit
// zone_overflow_negative_gap diagnostic if still overflowing.

import { MIN_SCALE, ZONE_PADDING } from "./constants.js";
import { footprintFor, visualWidthFor } from "./footprint.js";
import type {
  ComputedItem,
  Diagnostics,
  LayoutRules,
  ScaledPlacement,
  Zone,
} from "./types.js";

interface PlacedItem extends ScaledPlacement {
  _scale: number;
  _x: number;
  _y: number;
  _visualWidth: number;
  _footprint: number;
}

function placeBucket(
  arr: ScaledPlacement[],
  anchor: number,
  side: "left" | "center" | "right",
  gap: number,
  scale: number,
  sink: PlacedItem[],
): { total: number } {
  if (arr.length === 0) return { total: 0 };
  const footprints = arr.map((it) => footprintFor(it, scale));
  const total = footprints.reduce((s, f) => s + f, 0) + gap * (arr.length - 1);
  let cursor: number;
  if (side === "left") cursor = anchor;
  else if (side === "right") cursor = anchor - total;
  else cursor = anchor - total / 2;
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    const fw = footprints[i];
    if (it === undefined || fw === undefined) continue;
    const vw = visualWidthFor(it, scale);
    sink.push({
      ...it,
      _scale: scale,
      _x: cursor + fw / 2,
      _y: 0,
      _visualWidth: vw,
      _footprint: fw,
    });
    cursor += fw + gap;
  }
  return { total };
}

export function horizontalLayout(
  groups: Map<string, ScaledPlacement[]>,
  zones: Zone[],
  layoutRules: LayoutRules = {},
  diagnostics: Diagnostics = [],
): Map<string, ComputedItem[]> {
  const result = new Map<string, ComputedItem[]>();
  const gap = layoutRules.zone_gap ?? 2;

  for (const zone of zones) {
    const items = groups.get(zone.id) ?? [];
    const provisionalY =
      zone.baseline ?? (zone.bounds.top + zone.bounds.bottom) / 2;
    if (items.length === 0) {
      result.set(zone.id, []);
      continue;
    }
    const x0 = zone.bounds.left + ZONE_PADDING;
    const x1 = zone.bounds.right - ZONE_PADDING;
    const zoneW = x1 - x0;
    const mode = zone.align ?? "left";

    if (mode === "tab-stops") {
      const buckets: Record<"left" | "center" | "right", ScaledPlacement[]> = {
        left: [],
        center: [],
        right: [],
      };
      for (const it of items) {
        const k = it.align_stop ?? layoutRules.default_align_stop ?? "center";
        buckets[k].push(it);
      }
      const out: PlacedItem[] = [];
      const leftRes = placeBucket(buckets.left, x0, "left", gap, 1, out);
      const rightRes = placeBucket(buckets.right, x1, "right", gap, 1, out);
      const mid = (x0 + x1) / 2;
      const centerRes = placeBucket(buckets.center, mid, "center", gap, 1, out);
      const bucketTotal =
        leftRes.total + centerRes.total + rightRes.total + 2 * gap;
      if (bucketTotal > zoneW + 0.5) {
        diagnostics.push({
          stage: "horizontal",
          severity: "warn",
          kind: "tab_stop_overflow",
          zone: zone.id,
          items: items.length,
          overflow_pct: Number((bucketTotal - zoneW).toFixed(2)),
        });
      }
      const byName = new Map(out.map((it) => [it.placement_name, it]));
      const ordered = items.map((it): ComputedItem => {
        const placed = byName.get(it.placement_name);
        const labelLines: string[] = [];
        const base: ComputedItem = {
          ...(placed ?? {
            ...it,
            _scale: 1,
            _x: 0,
            _visualWidth: visualWidthFor(it, 1),
            _footprint: footprintFor(it, 1),
          }),
          _y: provisionalY,
          _top: 0,
          _height: 0,
          _labelX: 0,
          _labelY: 0,
          _labelLines: labelLines,
        };
        return base;
      });
      result.set(zone.id, ordered);
      continue;
    }

    let scale = 1;
    let footprints = items.map((it) => footprintFor(it, scale));
    let totalFootprint =
      footprints.reduce((s, f) => s + f, 0) +
      gap * Math.max(0, items.length - 1);

    if (totalFootprint > zoneW) {
      const minSpread = footprints.reduce((s, f) => s + f, 0);
      if (minSpread >= zoneW) {
        scale = Math.max(MIN_SCALE, zoneW / minSpread);
        footprints = items.map((it) => footprintFor(it, scale));
        totalFootprint = footprints.reduce((s, f) => s + f, 0);
        if (totalFootprint > zoneW + 0.5) {
          diagnostics.push({
            stage: "horizontal",
            severity: "warn",
            kind: "zone_overflow_negative_gap",
            zone: zone.id,
            items: items.length,
            overflow_pct: Number((totalFootprint - zoneW).toFixed(2)),
          });
        }
      }
    }

    const out: PlacedItem[] = [];
    if (mode === "center" || mode === "justify" || items.length === 1) {
      const totalContent = footprints.reduce((s, f) => s + f, 0);
      const effGap =
        items.length > 1
          ? mode === "justify"
            ? (zoneW - totalContent) / (items.length - 1)
            : gap
          : 0;
      const totalSpan = totalContent + effGap * Math.max(0, items.length - 1);
      const startX = mode === "justify" ? x0 : (x0 + x1) / 2 - totalSpan / 2;
      let cursor = startX;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const fw = footprints[i];
        if (it === undefined || fw === undefined) continue;
        const vw = visualWidthFor(it, scale);
        out.push({
          ...it,
          _scale: scale,
          _x: cursor + fw / 2,
          _y: provisionalY,
          _visualWidth: vw,
          _footprint: fw,
        });
        cursor += fw + effGap;
      }
    } else if (mode === "right") {
      let cursor = x1;
      const placed: PlacedItem[] = [];
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const fw = footprints[i];
        if (it === undefined || fw === undefined) continue;
        const vw = visualWidthFor(it, scale);
        placed[i] = {
          ...it,
          _scale: scale,
          _x: cursor - fw / 2,
          _y: provisionalY,
          _visualWidth: vw,
          _footprint: fw,
        };
        cursor -= fw + gap;
      }
      for (const it of placed) if (it !== undefined) out.push(it);
    } else {
      let cursor = x0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const fw = footprints[i];
        if (it === undefined || fw === undefined) continue;
        const vw = visualWidthFor(it, scale);
        out.push({
          ...it,
          _scale: scale,
          _x: cursor + fw / 2,
          _y: provisionalY,
          _visualWidth: vw,
          _footprint: fw,
        });
        cursor += fw + gap;
      }
    }

    const finalItems: ComputedItem[] = out.map(
      (it): ComputedItem => ({
        ...it,
        _top: 0,
        _height: 0,
        _labelX: 0,
        _labelY: 0,
        _labelLines: [],
      }),
    );
    result.set(zone.id, finalItems);
  }

  return result;
}
