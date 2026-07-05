// Cross-zone final-placed-item overlap diagnostic.
//
// Bug this closes: groupVerticalBands (reflow_zones.ts) can transitively fuse
// several authored zones into one computed band (a tall spanning zone bridges
// two rows). Two objects from DIFFERENT authored zones then land in the same
// band and coincide. The engine's own containment checks run PER-BAND, so they
// never compare two items whose bands differ from their zones, and
// overlap_count reads 0 even while the objects render 100% on top of each
// other. structural_guards.ts Guard 3 (checkNoItemOverlap) already catches this
// post-render; this module gives the engine the same check pre-render, over
// the FINAL placed item array (every zone at once, not per-band).
//
// The AABB bbox model and overlap-percent predicate here are the single source
// of truth: structural_guards.ts imports them instead of keeping its own copy,
// so the engine diagnostic and the post-render guard can never drift onto two
// different epsilons for the same question ("do these two boxes really
// overlap").
//
// All coordinates are scene-percent (0..100 per axis), matching the layout
// engine convention. Pure: reads items, mutates nothing.

import type { Bounds, ComputedItem, Diagnostic } from "../types.js";

//============================================
// Shared AABB bbox helpers (also used by structural_guards.ts)
//============================================

// Overlap-percent tolerance, in percent-of-smaller-box-area units. Below this,
// a touching/near-touching pair is treated as not overlapping (float noise).
export const ITEM_OVERLAP_TOLERANCE_PCT = 1;

// Derive an item's artwork bbox from the anchor-coordinate convention:
//   _centerX = shared horizontal center; left/right derived from it.
//   _top = derived visual top edge (used verbatim).
export function itemBbox(item: ComputedItem): Bounds {
  return {
    left: item._centerX - item._visualWidth / 2,
    top: item._top,
    right: item._centerX + item._visualWidth / 2,
    bottom: item._top + item._height,
  };
}

export function bboxesIntersect(a: Bounds, b: Bounds): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export function bboxArea(bbox: Bounds): number {
  const width = Math.max(0, bbox.right - bbox.left);
  const height = Math.max(0, bbox.bottom - bbox.top);
  return width * height;
}

export function intersectionArea(a: Bounds, b: Bounds): number {
  if (!bboxesIntersect(a, b)) {
    return 0;
  }
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return Math.max(0, width * height);
}

// Percent of the SMALLER box's area covered by the intersection. Matches
// structural_guards.ts Guard 3's overlapPct definition exactly (100 when one
// box has zero area but the boxes still intersect, so a degenerate box is
// still flagged rather than silently dividing by zero).
export function itemOverlapPercent(a: Bounds, b: Bounds): number {
  if (!bboxesIntersect(a, b)) {
    return 0;
  }
  const areaA = bboxArea(a);
  const areaB = bboxArea(b);
  const minArea = Math.min(areaA, areaB);
  const overlapArea = intersectionArea(a, b);
  const overlapPct = minArea > 0 ? (overlapArea / minArea) * 100 : 100;
  return overlapPct;
}

//============================================
// Cross-zone diagnostic scan
//============================================

// Compare every pair of FINAL placed items, regardless of zone or band
// membership, and emit one "item_overlap" Diagnostic per pair whose artwork
// boxes overlap past ITEM_OVERLAP_TOLERANCE_PCT. This is O(n^2) over the final
// item list, which is scene-sized (tens of items), so the cost is negligible.
export function collectItemOverlapDiagnostics(final: readonly ComputedItem[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (let i = 0; i < final.length; i++) {
    for (let j = i + 1; j < final.length; j++) {
      const itemA = final[i];
      const itemB = final[j];
      if (!itemA || !itemB) continue;

      const bboxA = itemBbox(itemA);
      const bboxB = itemBbox(itemB);
      const overlapPct = itemOverlapPercent(bboxA, bboxB);
      if (overlapPct <= ITEM_OVERLAP_TOLERANCE_PCT) continue;

      diagnostics.push({
        stage: "meta",
        severity: "error",
        kind: "item_overlap",
        placement_name: itemA.placement_name,
        object_name: itemA.object_name,
        between: [itemA.placement_name, itemB.placement_name],
        overflow_pct: Number(overlapPct.toFixed(1)),
      });
    }
  }
  return diagnostics;
}
