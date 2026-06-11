// Zone-band reflow stage. The horizontal axis folds the label into an item's
// extent (footprint.ts) and the row strategy already spaces objects with their
// labels included. The measure-vertical stage computed the vertical mirror per
// item: each item's side-independent combined extent (_combinedHeight = object
// height + label offset + wrapped label box). This stage lifts that per-item
// measurement to the ZONE level: it computes each zone's content extent from its
// depth-tier rows and reflows the scene's vertical range across the zones in
// depth order, producing a computed band per zone.
//
// This stage PRODUCES ComputedZoneBand and nothing more. It does NOT move any
// item: vertical_layout.ts still owns object geometry until place-vertical
// consumes these bands. Keeping produce/consume in separate stages makes the band
// computation testable on its own and keeps the precompute artifact byte-identical
// (the artifact serializes item geometry, which this stage never touches).
//
// Row and tier model:
// - A TIER is the set of items in a zone sharing the same depth_tier (default 0).
//   The horizontal stage spread a tier's items side-by-side, so one tier renders
//   as one vertical ROW.
// - A tier ROW HEIGHT is the maximum _combinedHeight over the tier's items: the
//   row is as tall as its tallest member.
// - Tier ORDER preserves the engine's existing depth_tier -> vertical mapping:
//   ascending depth_tier toward the band TOP (rear tier on top). This matches the
//   DEPTH_BASELINE_OFFSET direction (back = -4 toward the top) and the
//   group_by_zone sort (depth_tier ASC, then placement_name).
// - Zones are placed rear -> center -> front, which is the authored zone vertical
//   order (scene top to scene bottom), so the band stack reads top to bottom.
//
// Reflow range source (HARD acceptance item): the reflow range is the
// renderer-visible scene content range, scene.scene_bounds (the SceneBoundsRect
// rect). top = scene_bounds.top, bottom = scene_bounds.bottom. This is the SAME
// rect clamp_scene_bounds.ts validates item bboxes against and that
// structural_guards.ts requires every zone and label to lie inside, so the band
// reflow shares the renderer's visible viewport and cannot drift into a header
// band or a clipped region.

import { ZONE_PADDING, DEPTH_TIER_GAP, DEFAULT_LAYOUT_RULES } from "./constants.js";
import type {
  ComputedItem,
  ComputedTierRow,
  ComputedZoneBand,
  SceneBoundsRect,
  Zone,
} from "./types.js";

// One recorded baseline clamp: the authored baseline fraction fell outside [0, 1]
// (the authored baseline sat above the authored band top or below its bottom) and
// was clamped before being mapped onto the computed band. Surfaced so a reviewer
// can see which scenes had an out-of-band authored baseline.
export interface BaselineClampReport {
  zoneId: string;
  authoredFraction: number;
  clampedFraction: number;
}

// The reflow-zones output for one scene: the computed band per zone (keyed by
// zone id), the resolved reflow range it reflowed across, whether measured
// content overflowed that range (the uniform object rescale applies when it does),
// and any baseline clamps. place-vertical reads bands; this stage surfaces the
// rest for verification and review.
export interface ReflowZonesResult {
  bands: Map<string, ComputedZoneBand>;
  // The resolved reflow range, taken verbatim from scene.scene_bounds.
  sceneRangeTop: number;
  sceneRangeBottom: number;
  totalContent: number;
  // The NON-scaling portion of totalContent: the part of the summed content extent
  // that a uniform OBJECT rescale does not shrink. Per group it is
  // 2*zonePad + (tierCount-1)*tierGap (the zone padding and tier gaps) plus, for the
  // winning tier row, the fixed label strip (labelGap + labelBoxHeight). The uniform
  // rescale uses it to size the object scale against only the SCALABLE remainder
  // (totalContent - fixedOverhead) so the post-scale content lands inside the scene
  // range instead of overshooting it by this fixed overhead. It is taken from the
  // SAME winning member zone per group that set that group's contentExtent, so
  // fixedOverhead is always <= totalContent and consistent with it.
  fixedOverhead: number;
  // True when totalContent > (sceneRangeBottom - sceneRangeTop): the measured
  // content does not fit the scene range. The reflow stage compresses zones to
  // their content extent and hands the overflow to the scene-wide uniform object
  // rescale.
  overflow: boolean;
  baselineClamps: BaselineClampReport[];
}

// One zone's measured content, derived from its tier rows. tierRowHeights is the
// per-tier maximum combined extent (one entry per distinct depth_tier, in
// ascending tier order); contentExtent folds the rows, the inter-row tier gaps,
// and the top+bottom zone padding into the zone's required vertical extent.
interface ZoneContent {
  zone: Zone;
  // Distinct depth_tier values present, ascending (rear first).
  tierValues: number[];
  // Maximum _combinedHeight over each tier, parallel to tierValues.
  tierRowHeights: number[];
  // group_by_zone-ordered placement names per tier, parallel to tierValues.
  tierPlacements: string[][];
  contentExtent: number;
  // The NON-scaling portion of contentExtent: 2*zonePad + (tierCount-1)*tierGap
  // plus the fixed label strip (labelGap + labelBoxHeight) of each tier's WINNING row
  // (the row whose _combinedHeight set the tier row height). Only the object height of
  // the winning row scales under the uniform object rescale; this is everything else.
  // fixedExtent <= contentExtent always.
  fixedExtent: number;
}

//============================================
// Per-zone content extent from tier rows
//============================================

// Bucket a zone's measured items into depth tiers and compute the per-tier row
// height (the max _combinedHeight over the tier). Items keep their incoming
// group_by_zone order (depth_tier ASC, then placement_name), so iterating the
// items in order and appending to each tier preserves that order inside the tier.
// An item missing _combinedHeight has not passed measure-vertical; that is a
// pipeline-ordering bug, so this throws rather than papering over it with a
// default extent (fix the design, not the symptom).
function zoneContentFor(
  zone: Zone,
  items: ComputedItem[],
  tierGap: number,
  zonePad: number,
  labelGap: number,
): ZoneContent {
  // depth_tier value -> { rowHeight, winningLabelBox, placementNames }. A Map
  // preserves first-seen (ascending, since items arrive group_by_zone-sorted) order.
  // winningLabelBox tracks the _labelBoxHeight of the item whose _combinedHeight set
  // the row height (the tallest member), so the fixed (non-scaling) label portion of
  // the row can be subtracted out for the uniform rescale.
  const tiers = new Map<
    number,
    { rowHeight: number; winningLabelBox: number; placements: string[] }
  >();
  for (const it of items) {
    if (it._combinedHeight === undefined) {
      throw new Error(
        `reflowZones: item "${it.placement_name}" in zone "${zone.id}" has no _combinedHeight; ` +
          "measure-vertical must run before reflow-zones",
      );
    }
    const tierValue = it.depth_tier ?? 0;
    // The fixed label strip of THIS item is labelGap + its label box height. Only the
    // object height portion of _combinedHeight scales; this label portion does not.
    const labelBox = it._labelBoxHeight ?? 0;
    const existing = tiers.get(tierValue);
    if (existing === undefined) {
      tiers.set(tierValue, {
        rowHeight: it._combinedHeight,
        winningLabelBox: labelBox,
        placements: [it.placement_name],
      });
    } else {
      // Row height is the max combined extent over the tier's side-by-side items.
      // When this item wins (taller), its label box becomes the winning label box so
      // the fixed portion subtracted out matches the item that set the row height.
      if (it._combinedHeight > existing.rowHeight) {
        existing.rowHeight = it._combinedHeight;
        existing.winningLabelBox = labelBox;
      }
      existing.placements.push(it.placement_name);
    }
  }

  // Sort tiers by depth_tier ascending so the rear tier (lowest value) is first.
  // The Map insertion order is already ascending for group_by_zone-sorted input,
  // but sorting the keys makes the ascending invariant explicit and robust.
  const tierValues = [...tiers.keys()].sort((a, b) => a - b);
  const tierRowHeights: number[] = [];
  const tierPlacements: string[][] = [];
  let rowSum = 0;
  // labelSum folds the fixed label strip (labelGap + winning label box) of each
  // tier's winning row; it is the per-tier non-scaling portion of the row heights.
  let labelSum = 0;
  for (const value of tierValues) {
    const tier = tiers.get(value);
    if (tier === undefined) continue;
    tierRowHeights.push(tier.rowHeight);
    tierPlacements.push(tier.placements);
    rowSum += tier.rowHeight;
    labelSum += labelGap + tier.winningLabelBox;
  }

  // contentExtent = sum(rowHeight) + (tierCount-1)*tierGap + 2*zonePad. An empty
  // zone (no tiers) reserves no content extent; the (tierCount-1) term is guarded
  // so it never goes negative.
  const tierCount = tierValues.length;
  const gapTotal = tierCount > 0 ? (tierCount - 1) * tierGap : 0;
  const contentExtent = tierCount > 0 ? rowSum + gapTotal + 2 * zonePad : 0;
  // fixedExtent is everything in contentExtent that does NOT scale with the object:
  // the zone padding, the tier gaps, and the per-tier fixed label strips. The
  // remainder (contentExtent - fixedExtent) is the sum of winning-row object heights,
  // the only portion the uniform object rescale shrinks. An empty zone has no fixed
  // extent.
  const fixedExtent = tierCount > 0 ? gapTotal + 2 * zonePad + labelSum : 0;

  const content: ZoneContent = {
    zone,
    tierValues,
    tierRowHeights,
    tierPlacements,
    contentExtent,
    fixedExtent,
  };
  return content;
}

//============================================
// Baseline recompute relative to the new band
//============================================

// Recompute an authored baseline relative to a zone's new computed band. The
// authored baseline is held as a FRACTION of the authored band (not an absolute
// Y), so a band that grows or shrinks keeps the baseline at the same relative
// position. An authored baseline outside the authored band clamps to [0, 1] and
// the clamp is reported. When no baseline was authored the band center is used.
function recomputeBaseline(
  zone: Zone,
  computedTop: number,
  computedHeight: number,
  clamps: BaselineClampReport[],
): number {
  if (zone.baseline === undefined) {
    // No authored baseline: use the computed band center.
    return computedTop + computedHeight / 2;
  }
  const authoredTop = zone.bounds.top;
  const authoredHeight = zone.bounds.bottom - zone.bounds.top;
  // A degenerate authored band (zero or negative height) has no meaningful
  // fraction; fall back to the band center rather than divide by zero.
  if (authoredHeight <= 0) {
    return computedTop + computedHeight / 2;
  }
  const rawFraction = (zone.baseline - authoredTop) / authoredHeight;
  const clampedFraction = Math.min(1, Math.max(0, rawFraction));
  // Record any clamp so a reviewer sees which scenes authored an out-of-band
  // baseline (the authored value sat above the band top or below its bottom).
  if (clampedFraction !== rawFraction) {
    clamps.push({ zoneId: zone.id, authoredFraction: rawFraction, clampedFraction });
  }
  const computedBaseline = computedTop + clampedFraction * computedHeight;
  return computedBaseline;
}

//============================================
// Tier-row placement inside a computed band
//============================================

// Place a zone's tier rows top-to-bottom inside its computed band. cursor starts
// at band.top + zonePad; each tier row is placed at the cursor and the cursor
// advances by the row height plus the tier gap. The rows are returned in
// ascending depth_tier order (rear first / toward the band top).
function placeTiers(
  content: ZoneContent,
  bandTop: number,
  tierGap: number,
  zonePad: number,
): ComputedTierRow[] {
  const tiers: ComputedTierRow[] = [];
  let cursor = bandTop + zonePad;
  for (let i = 0; i < content.tierValues.length; i++) {
    const depthTier = content.tierValues[i];
    const rowHeight = content.tierRowHeights[i];
    const placementNames = content.tierPlacements[i];
    // noUncheckedIndexedAccess: the parallel arrays are built together in
    // zoneContentFor, so the indices align; guard for the type checker.
    if (depthTier === undefined || rowHeight === undefined || placementNames === undefined)
      continue;
    const row: ComputedTierRow = {
      depthTier,
      rowTop: cursor,
      rowHeight,
      placementNames,
    };
    tiers.push(row);
    cursor += rowHeight + tierGap;
  }
  return tiers;
}

//============================================
// Vertical-band grouping (side-by-side zones share one vertical band)
//============================================

// A vertical band group: one or more zones that occupy the SAME authored vertical
// extent (a horizontal row of side-by-side zones, e.g. rear_left / rear_center /
// rear_right at the same authored top..bottom). The horizontal stage already
// spread these zones across the scene width, so they share ONE vertical band, not
// a stack of bands. authoredTop / authoredBottom are the group's authored extent
// (the union of its members'), used for depth ordering and proportional leftover
// distribution.
interface VerticalBandGroup {
  contents: ZoneContent[];
  authoredTop: number;
  authoredBottom: number;
  // The group's required vertical extent = the MAX content extent over its member
  // zones (side-by-side zones share the band; the tallest one sets the height).
  contentExtent: number;
  // The fixed (non-scaling) extent of the SAME member zone that set contentExtent.
  // Taken from the winning member, not the max over members, so the group's
  // fixedExtent stays consistent with the contentExtent it contributes: a uniform
  // object rescale shrinks (contentExtent - fixedExtent) and leaves fixedExtent.
  fixedExtent: number;
}

// Group zones that share an authored vertical band. Two zones belong to the same
// group when their authored vertical ranges OVERLAP (transitively): sweeping the
// zones by authored top, a zone joins the current group while its authored top is
// below the group's running authored bottom, otherwise it opens a new group. This
// merges exact side-by-side rows (identical [top, bottom]) AND partially
// overlapping rows (a center band [38,76] and a front band [72,94] that overlap by
// a few units stay in one vertical band so they are not stacked into a false
// overflow). The group's contentExtent is the MAX member content extent.
function groupVerticalBands(contents: ZoneContent[]): VerticalBandGroup[] {
  // Order the zones in depth order (authored top ascending). The tie-break returns
  // 0, so equal authored tops keep their INCOMING array order: zoneContentFor
  // preserved the caller-supplied depth order (the zones[] authored order), and
  // Array.prototype.sort is stable in V8/Node, so the sweep is deterministic and
  // depends on the caller passing zones in their authored depth order.
  const ordered = [...contents].sort((a, b) => {
    const da = a.zone.bounds.top - b.zone.bounds.top;
    if (da !== 0) return da;
    return 0;
  });

  const groups: VerticalBandGroup[] = [];
  for (const content of ordered) {
    const zoneTop = content.zone.bounds.top;
    const zoneBottom = content.zone.bounds.bottom;
    const current = groups[groups.length - 1];
    // Join the current group when this zone's authored range overlaps the group's
    // running authored range (its top sits above the group's authored bottom).
    if (current !== undefined && zoneTop < current.authoredBottom - 1e-9) {
      current.contents.push(content);
      current.authoredBottom = Math.max(current.authoredBottom, zoneBottom);
      current.authoredTop = Math.min(current.authoredTop, zoneTop);
      // The group's height is the MAX member content extent; when this member wins,
      // adopt its fixedExtent too so the pair stays consistent (fixedExtent is the
      // non-scaling part of the SAME extent the group contributes).
      if (content.contentExtent > current.contentExtent) {
        current.contentExtent = content.contentExtent;
        current.fixedExtent = content.fixedExtent;
      }
    } else {
      groups.push({
        contents: [content],
        authoredTop: zoneTop,
        authoredBottom: zoneBottom,
        contentExtent: content.contentExtent,
        fixedExtent: content.fixedExtent,
      });
    }
  }
  return groups;
}

//============================================
// Reflow entry point
//============================================

// Reflow the scene's vertical range across its vertical BAND GROUPS in depth
// order, producing a computed band per zone. Pure: it reads the measured per-zone
// items and the authored zones, and returns the band structure plus overflow/clamp
// reports. It mutates nothing, so it is safe to call from a read-only pipeline
// phase.
//
// Side-by-side zones (a horizontal row at the same authored vertical extent) share
// ONE computed band: they are grouped, the group's height is the MAX of its member
// zones' content extents, and every member zone gets the same computed band
// top/bottom. This is the authored grid semantics the pre-reflow vertical layout
// had (each zone placed in its own authored bounds); stacking every zone instead
// would push a 5-7 zone grid scene 3-4x past its scene range and place most objects
// off-screen.
//
// zonePad and tierGap default to the canonical constants (ZONE_PADDING and the
// depth spacing magnitude DEPTH_TIER_GAP) so a direct caller matches the pipeline
// phase. The pipeline phase threads the resolved config padding.
export function reflowZones(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect,
  zonePad: number = ZONE_PADDING,
  tierGap: number = DEPTH_TIER_GAP,
  labelGap: number = DEFAULT_LAYOUT_RULES.label_offset_y,
): ReflowZonesResult {
  // HARD acceptance item: the reflow range is scene.scene_bounds verbatim. top
  // and bottom are the SceneBoundsRect (renderer-visible) top/bottom, the same
  // rect clamp_scene_bounds validates against.
  const sceneRangeTop = sceneBounds.top;
  const sceneRangeBottom = sceneBounds.bottom;
  const sceneRange = sceneRangeBottom - sceneRangeTop;

  // Measure each zone's content extent from its tier rows. Order is preserved for
  // the grouping sweep below; the group sort imposes the final depth order. labelGap
  // is threaded so each zone's fixedExtent (the non-scaling portion) can subtract the
  // fixed label strip of every tier's winning row.
  const contents: ZoneContent[] = zones.map((zone) =>
    zoneContentFor(zone, zoneLayouts.get(zone.id) ?? [], tierGap, zonePad, labelGap),
  );

  // Group side-by-side zones into vertical band groups so a horizontal row of
  // zones shares one band instead of stacking into a false overflow.
  const groups = groupVerticalBands(contents);

  // totalContent is the SUM of the per-GROUP content extents (a group contributes
  // its tallest member once), so a horizontal row counts a single band height.
  const totalContent = groups.reduce((sum, g) => sum + g.contentExtent, 0);
  // fixedOverhead is the SUM of the per-group fixedExtent (the same winning member
  // per group whose contentExtent it contributed). It is the non-scaling portion of
  // totalContent: zone padding, tier gaps, and the fixed label strips. The uniform
  // object rescale shrinks only (totalContent - fixedOverhead).
  const fixedOverhead = groups.reduce((sum, g) => sum + g.fixedExtent, 0);
  const overflow = totalContent > sceneRange;

  // Per-group computed band height.
  const computedHeights: number[] = [];
  if (overflow) {
    // Content does not fit: compress each group to its content extent and stack
    // from the scene-range top. The stack extends past the scene-range bottom; the
    // terminal uniform object rescale shrinks objects so the recomputed content fits.
    for (const g of groups) computedHeights.push(g.contentExtent);
  } else {
    // Content fits: each group gets its content extent plus a share of the leftover
    // vertical range, distributed proportionally to authored band height (the
    // group's authored extent).
    const leftover = sceneRange - totalContent;
    const authoredHeights = groups.map((g) => Math.max(0, g.authoredBottom - g.authoredTop));
    const authoredTotal = authoredHeights.reduce((sum, h) => sum + h, 0);
    for (let i = 0; i < groups.length; i++) {
      const authored = authoredHeights[i];
      const group = groups[i];
      if (group === undefined || authored === undefined) continue;
      // Proportional share of the leftover. When the authored heights sum to zero
      // (degenerate scene), split the leftover evenly so the band stack still fills
      // the scene range deterministically.
      const share =
        authoredTotal > 0 ? leftover * (authored / authoredTotal) : leftover / groups.length;
      computedHeights.push(group.contentExtent + share);
    }
  }

  // Lay the band groups out top-to-bottom from the scene-range top. Every member
  // zone of a group gets the SAME computed [top, bottom]; its tier rows are placed
  // top-to-bottom inside that shared band and its baseline recomputed against it.
  const bands = new Map<string, ComputedZoneBand>();
  const baselineClamps: BaselineClampReport[] = [];
  let cursor = sceneRangeTop;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const computedHeight = computedHeights[i];
    if (group === undefined || computedHeight === undefined) continue;
    const top = cursor;
    const bottom = top + computedHeight;
    for (const content of group.contents) {
      const tiers = placeTiers(content, top, tierGap, zonePad);
      const baseline = recomputeBaseline(content.zone, top, computedHeight, baselineClamps);
      const band: ComputedZoneBand = {
        id: content.zone.id,
        top,
        bottom,
        baseline,
        tiers,
      };
      bands.set(content.zone.id, band);
    }
    cursor = bottom;
  }

  const result: ReflowZonesResult = {
    bands,
    sceneRangeTop,
    sceneRangeBottom,
    totalContent,
    fixedOverhead,
    overflow,
    baselineClamps,
  };
  return result;
}
