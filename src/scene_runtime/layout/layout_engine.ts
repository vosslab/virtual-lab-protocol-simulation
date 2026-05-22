/**
 * src/scene_runtime/layout/layout_engine.ts
 *
 * Scene layout engine: mined from src/layout_engine.ts.
 * Computes positions and labels for scene items in zones.
 *
 * All eight functions mined verbatim:
 * 1. depthScaleFor (legacy line 61-65)
 * 2. depthBaselineOffsetFor (legacy line 68-72)
 * 3. clusterAnchorOk (legacy line 78-101)
 * 4. splitLabelAtMiddle (legacy line 104-124)
 * 5. layoutZoneItems (legacy line 127-439)
 * 6. groupLayoutsByZone (legacy line 444-466)
 * 7. layoutLabels (legacy line 469-626)
 * 8. computeSceneLayout (legacy line 629-778)
 *
 * Asset aspect ratio helper re-implemented locally to avoid legacy imports.
 * getAssetAspectRatio depends on svg_assets facade which may not be available
 * in all runtime contexts; implements inline via viewBox parsing.
 */

import type {
  AssetSpec,
  ComputedItemLayout,
  SceneItem,
  SceneLayoutRules,
  ZoneDef,
  RowSlotSceneInput,
} from "./types";

//============================================
// Local aspect ratio cache and helper (avoids svg_assets import)
const _aspectRatioCache: Record<string, number> = {};

/**
 * Parse aspect ratio (height/width) from an SVG viewBox attribute.
 * Returns 1.0 (square) when the viewBox is missing or malformed.
 */
function parseSvgAspectRatio(svgHtml: string): number {
  const match = svgHtml.match(/viewBox="([^"]+)"/);
  if (!match || match[1] === undefined) return 1.0;
  const parts = match[1].split(/\s+/);
  if (parts.length < 4) return 1.0;
  // parts indices 2 and 3 are guaranteed to exist since length >= 4
  const vbWidth = parseFloat(parts[2]!);
  const vbHeight = parseFloat(parts[3]!);
  if (vbWidth <= 0) return 1.0;
  return vbHeight / vbWidth;
}

/**
 * Return the cached aspect ratio (height/width, in viewBox units) for a
 * scene-item svgAsset reference. This is a simplified version that parses
 * viewBox from SVG content; in production, external code pre-populates
 * this cache via `preCacheAspectRatios` before layout computation.
 * When unavailable, we accept 1.0 (square) as a safe default.
 */
function getAssetAspectRatio(assetId: string): number {
  // Return cached ratio if available
  if (_aspectRatioCache[assetId] !== undefined) {
    return _aspectRatioCache[assetId];
  }

  // Fallback to square (1.0) when SVG is unavailable
  // External code must call preCacheAspectRatios(assetId, svgContent)
  // before layout computation to pre-populate this cache
  return 1.0;
}

/**
 * Public helper: pre-populate the aspect ratio cache with an SVG string.
 * Called by adapter or scene runtime to populate cache before layout.
 *
 * @param assetId - the asset identifier
 * @param svgContent - SVG markup string
 */
export function preCacheAspectRatios(
  assetId: string,
  svgContent: string,
): void {
  if (_aspectRatioCache[assetId] === undefined) {
    const ratio = parseSvgAspectRatio(svgContent);
    _aspectRatioCache[assetId] = ratio;
  }
}

// ============================================
// Average character width as percentage of font size
export const AVG_CHAR_WIDTH_PCT = 0.55;

// Float tolerance for fit-vs-overflow comparisons and invariant checks
export const EPSILON = 0.001;

// Max footprint inflation: label can expand footprint up to K * visual width
export const MAX_FOOTPRINT_RATIO = 1.4;

// Max gap between items (% of scene) to prevent excessive spreading
export const MAX_GAP = 4;

// Minimum scale factor to prevent items from shrinking too much
export const MIN_SCALE = 0.75;

// Internal zone padding (%) to prevent items touching zone edges
export const ZONE_PADDING = 1;

// ============================================
// Depth tiers for scene items. back = parked on rear shelf (smaller and
// higher in the scene), mid = normal working position (baseline as-is,
// no scale change), front = active / pulled-forward (slightly larger and
// slightly lower). depthScale multiplies item visual width; depthBaseline
// is added to the zone's baseline (larger baseline = lower on screen).
// back_shelf goes UP (baseline - 4), front goes DOWN (baseline + 4).
export const DEPTH_SCALE_BACK = 0.8;
export const DEPTH_SCALE_MID = 1.0;
export const DEPTH_SCALE_FRONT = 1.1;
export const DEPTH_BASELINE_BACK = -4;
export const DEPTH_BASELINE_MID = 0;
export const DEPTH_BASELINE_FRONT = 4;

// ============================================
export function depthScaleFor(depth: string | undefined): number {
  if (depth === "back") return DEPTH_SCALE_BACK;
  if (depth === "front") return DEPTH_SCALE_FRONT;
  return DEPTH_SCALE_MID;
}

// ============================================
export function depthBaselineOffsetFor(depth: string | undefined): number {
  if (depth === "back") return DEPTH_BASELINE_BACK;
  if (depth === "front") return DEPTH_BASELINE_FRONT;
  return DEPTH_BASELINE_MID;
}

// ============================================
// Verify the alignment-preservation invariant for a cluster of items.
// first = leftmost item (lowest x), last = rightmost item (highest x).
// Returns true iff the mode-specific visual-edge equality holds.
export function clusterAnchorOk(
  first: ComputedItemLayout,
  last: ComputedItemLayout,
  align: string,
  effectiveX0: number,
  effectiveX1: number,
): boolean {
  if (align === "left") {
    return Math.abs(first.x - effectiveX0) < EPSILON;
  }
  if (align === "right") {
    return Math.abs(last.x + last.width - effectiveX1) < EPSILON;
  }
  if (align === "justify") {
    // Both first left edge AND last right edge must be flush.
    const leftOk = Math.abs(first.x - effectiveX0) < EPSILON;
    const rightOk = Math.abs(last.x + last.width - effectiveX1) < EPSILON;
    return leftOk && rightOk;
  }
  // center
  const clusterMid = (first.x + last.x + last.width) / 2;
  const zoneMid = (effectiveX0 + effectiveX1) / 2;
  return Math.abs(clusterMid - zoneMid) < EPSILON;
}

// ============================================
export function splitLabelAtMiddle(text: string): string[] {
  // Find the space nearest to the middle of the string
  const mid = Math.floor(text.length / 2);
  let bestIdx = -1;
  let bestDist = text.length;
  // scan all spaces, pick the one closest to midpoint
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }
  if (bestIdx < 0) {
    // no space found, return as single line
    return [text];
  }
  return [text.substring(0, bestIdx), text.substring(bestIdx + 1)];
}

// ============================================
export function layoutZoneItems(
  zoneItems: SceneItem[],
  zone: ZoneDef,
  specs: Record<string, AssetSpec>,
  viewportW: number,
  viewportH: number,
): ComputedItemLayout[] {
  const results: ComputedItemLayout[] = [];
  const n = zoneItems.length;
  if (n === 0) {
    return results;
  }
  // Tab-stops: partition items by per-item alignStop, run each
  // sub-cluster as its own row with the corresponding alignment, then
  // concatenate. Items at the same stop are packed with zone.gap; the
  // whitespace between stops is whatever the sub-cluster math leaves.
  if (zone.align === "tab-stops") {
    const leftItems: SceneItem[] = [];
    const centerItems: SceneItem[] = [];
    const rightItems: SceneItem[] = [];
    for (let ti = 0; ti < n; ti++) {
      // ti < n === zoneItems.length; index is in range
      const stop = zoneItems[ti]!.alignStop || "center";
      if (stop === "left") leftItems.push(zoneItems[ti]!);
      else if (stop === "right") rightItems.push(zoneItems[ti]!);
      else centerItems.push(zoneItems[ti]!);
    }
    const groups: Array<{ items: SceneItem[]; align: string }> = [
      { items: leftItems, align: "left" },
      { items: centerItems, align: "center" },
      { items: rightItems, align: "right" },
    ];
    for (let gi = 0; gi < groups.length; gi++) {
      // groups is a fixed-length literal array; gi is always in range
      if (groups[gi]!.items.length === 0) continue;
      const subZone: ZoneDef = {
        x0: zone.x0,
        x1: zone.x1,
        baseline: zone.baseline,
        gap: zone.gap,
        align: groups[gi]!.align as "left" | "center" | "right",
      };
      const subLayouts = layoutZoneItems(
        groups[gi]!.items,
        subZone,
        specs,
        viewportW,
        viewportH,
      );
      for (let sj = 0; sj < subLayouts.length; sj++) {
        // sj < subLayouts.length; index is in range
        results.push(subLayouts[sj]!);
      }
    }
    return results;
  }
  // apply internal zone padding to prevent edge clipping
  const effectiveX0 = zone.x0 + ZONE_PADDING;
  const effectiveX1 = zone.x1 - ZONE_PADDING;
  const zoneWidth = effectiveX1 - effectiveX0;

  // compute visual widths and layout footprints
  // footprint uses same label width estimation as the label pass
  const widths: number[] = []; // visual widths (for rendering)
  const footprints: number[] = []; // layout footprints (for spacing)
  let totalFootprint = 0;
  for (let i = 0; i < n; i++) {
    // i < n === zoneItems.length; both indices are in range
    const fpItem = zoneItems[i]!;
    const fpSpec = specs[fpItem.svgAsset]!;
    // depth multiplier: back 0.80, mid 1.00, front 1.10.
    const depthScale = depthScaleFor(fpItem.depth);
    const visualW = fpSpec.defaultWidth * depthScale;
    // estimate label width same way as layoutLabels()
    const charW = fpItem.label.length * AVG_CHAR_WIDTH_PCT;
    const specLabelW = fpSpec.labelWidth;
    let estLabelW = Math.max(charW, specLabelW);
    // if label would wrap, use the wider wrapped line
    if (estLabelW > visualW && fpItem.label.indexOf(" ") >= 0) {
      const split = splitLabelAtMiddle(fpItem.label);
      let maxLineW = 0;
      for (let li = 0; li < split.length; li++) {
        // split is produced by splitLabelAtMiddle; li is always in range
        const lineW = split[li]!.length * AVG_CHAR_WIDTH_PCT;
        if (lineW > maxLineW) maxLineW = lineW;
      }
      estLabelW = Math.max(maxLineW, specLabelW);
    }
    // cap label influence on footprint to prevent spacing blowup
    const cappedLabelW = Math.min(estLabelW, visualW * MAX_FOOTPRINT_RATIO);
    const footprint = Math.max(visualW, cappedLabelW);
    widths.push(visualW);
    footprints.push(footprint);
    totalFootprint += footprint;
  }

  // compute scale factor and gap
  let scaleFactor = 1.0;
  let gap = 0;
  let startX: number;
  const align = zone.align || "center";

  if (n === 1) {
    // single item: place based on alignment using visual-edge math.
    // startX is the LEFT EDGE OF THE FOOTPRINT SLOT; the visual box
    // sits inset by (footprint - width) / 2 inside that slot. To make
    // the visual edge hug the zone edge, offset startX by that inset.
    // 'justify' with a single item is ambiguous (both edges cannot be
    // flush simultaneously); fall back to center placement.
    // n===1 guarantees index 0 is in range
    const soloInset = (footprints[0]! - widths[0]!) / 2;
    if (align === "center" || align === "justify") {
      startX = effectiveX0 + (zoneWidth - widths[0]!) / 2 - soloInset;
    } else if (align === "right") {
      startX = effectiveX1 - widths[0]! - soloInset;
    } else {
      // left
      startX = effectiveX0 - soloInset;
    }
  } else {
    // multiple items: use footprints for distribution
    let totalGapWidth = (n - 1) * zone.gap;
    if (totalFootprint + totalGapWidth <= zoneWidth + EPSILON) {
      if (align === "left" || align === "right") {
        // left/right align: cluster items at edge, use minimum gap
        gap = zone.gap;
      } else if (align === "justify") {
        // justify (space-between): expand gap uncapped so first
        // and last items' VISUAL edges (not footprint edges) land
        // on effectiveX0 and effectiveX1. The visual span equals
        // scaledFootprintTotal + (n-1)*gap - firstInset - lastInset
        // and must equal zoneWidth, so:
        //   gap = (zoneWidth + firstInset + lastInset - totalFp)
        //         / (n - 1)
        // n > 1 here; indices 0 and n-1 are both in range
        const jFirstInset = (footprints[0]! - widths[0]!) / 2;
        const jLastInset = (footprints[n - 1]! - widths[n - 1]!) / 2;
        gap = (zoneWidth + jFirstInset + jLastInset - totalFootprint) / (n - 1);
        // Never shrink below the zone's configured minimum gap;
        // if items would need to overlap to reach both edges,
        // fall back to zone.gap and accept less-than-flush span.
        if (gap < zone.gap) {
          gap = zone.gap;
        }
      } else {
        // center align: spread gaps evenly, capped
        gap = Math.min(
          MAX_GAP,
          Math.max(zone.gap, (zoneWidth - totalFootprint) / (n - 1)),
        );
      }
    } else {
      // overflow: shrink gaps first, then scale
      gap = zone.gap;
      totalGapWidth = (n - 1) * gap;
      scaleFactor = Math.min((zoneWidth - totalGapWidth) / totalFootprint, 1.0);
      // enforce minimum scale to keep items legible
      scaleFactor = Math.max(scaleFactor, MIN_SCALE);
    }

    // apply scale factor to both visual and footprint
    let scaledFootprintTotal = 0;
    for (let i = 0; i < n; i++) {
      // i is always in range [0, n); the arrays were built with n entries
      widths[i] = widths[i]! * scaleFactor;
      footprints[i] = footprints[i]! * scaleFactor;
      scaledFootprintTotal += footprints[i]!;
    }

    // post-scale overflow recovery (Bug 1 fix): if items still do not
    // fit after the MIN_SCALE floor was applied, collapse the gap -
    // potentially to a negative value so items visibly overlap while
    // the cluster origin still honors the alignment invariant.
    const naiveSpan = scaledFootprintTotal + (n - 1) * gap;
    if (naiveSpan > zoneWidth + EPSILON) {
      gap = (zoneWidth - scaledFootprintTotal) / (n - 1);
      // gap may be negative; that is intentional
    }
    const totalSpan = scaledFootprintTotal + (n - 1) * gap;

    // compute starting X using visual-edge math: the boundary items'
    // VISUAL edges (not footprint edges) hug the zone edges.
    // first item's visual left = startX + (footprints[0] - widths[0]) / 2
    // last item's  visual right = startX + totalSpan
    //                             - (footprints[n-1] - widths[n-1]) / 2
    // n > 1; indices 0 and n-1 are in range after the scale loop above
    const firstInset = (footprints[0]! - widths[0]!) / 2;
    const lastInset = (footprints[n - 1]! - widths[n - 1]!) / 2;
    if (align === "center") {
      // center the visual span within the zone
      const visualSpan = totalSpan - firstInset - lastInset;
      startX = (effectiveX0 + effectiveX1) / 2 - visualSpan / 2 - firstInset;
    } else if (align === "right") {
      startX = effectiveX1 - totalSpan + lastInset;
    } else if (align === "justify") {
      // justify: first item's visual left edge hugs effectiveX0.
      // Gap was chosen above so last item's visual right edge lands
      // on effectiveX1 (space-between distribution). If the gap
      // floor kicked in (items couldn't expand enough), the right
      // edge may fall short; that is the intentional fallback.
      startX = effectiveX0 - firstInset;
    } else {
      // left
      startX = effectiveX0 - firstInset;
    }
  }

  // assign positions left-to-right using footprints.
  // No per-item visual clamp (Bug 2 fix): the startX math above keeps
  // items inside the zone by construction. An invariant check after the
  // loop catches any regression.
  let curX = startX;
  for (let i = 0; i < n; i++) {
    // i < n === zoneItems.length; all indices are in range
    const item = zoneItems[i]!;
    const spec = specs[item.svgAsset]!;
    const itemWidth = widths[i]!;
    const itemFootprint = footprints[i]!;
    // center visual width within footprint
    const visualOffset = (itemFootprint - itemWidth) / 2;

    // height from SVG aspect ratio, adjusted for viewport
    const aspectRatio = getAssetAspectRatio(item.svgAsset);
    const height = itemWidth * aspectRatio * (viewportW / viewportH);

    // determine baseline for this item. Order of precedence:
    //   1. item.baselineOverride (explicit per-item value wins)
    //   2. zone.baseline + depth offset (back -4, mid 0, front +4)
    // A manual baselineOverride is intentional and must not be nudged
    // by depth; depth tiers only shift items that ride the zone
    // baseline.
    let baseline: number;
    if (item.baselineOverride !== undefined) {
      baseline = item.baselineOverride;
    } else {
      baseline = zone.baseline + depthBaselineOffsetFor(item.depth);
    }
    const anchorOffset = spec.anchorYOffset ?? 0;

    // compute top position based on anchor mode
    // eslint-disable-next-line no-useless-assignment
    let top = 0;
    if (item.anchorY === "bottom") {
      top = baseline - height;
    } else if (item.anchorY === "tip") {
      top = baseline - height + anchorOffset;
    } else {
      // 'center'
      top = baseline - height / 2;
    }

    // visual X is centered within footprint
    const visualX = curX + visualOffset;

    // build layout with placeholder label values
    // labelX centered on visual object, not footprint
    const layout: ComputedItemLayout = {
      id: item.id,
      x: visualX,
      y: top,
      width: itemWidth,
      height: height,
      footprint: itemFootprint,
      tooltip: item.label,
      labelLines: [],
      labelX: visualX + itemWidth / 2,
      labelY: 0,
      labelWidth: 0,
      labelMultiline: false,
    };
    results.push(layout);

    // advance cursor by footprint, not visual width
    curX += itemFootprint + gap;
  }

  // ---- post-condition invariant checks (safety net for Bug 2 removal) ----
  // first = leftmost (index 0), last = rightmost (index n-1)
  // results was just built with exactly n entries; both indices are in range
  const first = results[0]!;
  const last = results[n - 1]!;
  if (!clusterAnchorOk(first, last, align, effectiveX0, effectiveX1)) {
    console.warn(
      "layout_engine: alignment anchor violated" +
        " (align=" +
        align +
        ", n=" +
        n +
        ")" +
        " first.x=" +
        first.x.toFixed(3) +
        " last.x+w=" +
        (last.x + last.width).toFixed(3) +
        " effective=[" +
        effectiveX0.toFixed(3) +
        "," +
        effectiveX1.toFixed(3) +
        "]",
    );
  }
  // visual-box containment only in non-overflow case (gap >= -EPSILON)
  if (gap >= -EPSILON) {
    if (first.x < effectiveX0 - EPSILON) {
      console.warn(
        "layout_engine: first item escapes left zone edge" +
          " first.x=" +
          first.x.toFixed(3) +
          " effectiveX0=" +
          effectiveX0.toFixed(3),
      );
    }
    if (last.x + last.width > effectiveX1 + EPSILON) {
      console.warn(
        "layout_engine: last item escapes right zone edge" +
          " last.x+w=" +
          (last.x + last.width).toFixed(3) +
          " effectiveX1=" +
          effectiveX1.toFixed(3),
      );
    }
  }

  return results;
}

// ============================================
// Group layouts by their source item's zone ID. Uses itemMap for the
// id -> SceneItem lookup; every layout must resolve or the function throws.
export function groupLayoutsByZone(
  layouts: ComputedItemLayout[],
  itemMap: Record<string, SceneItem>,
): Record<string, ComputedItemLayout[]> {
  const groups: Record<string, ComputedItemLayout[]> = {};
  for (let i = 0; i < layouts.length; i++) {
    // i < layouts.length; index is in range
    const layoutEntry = layouts[i]!;
    const src = itemMap[layoutEntry.id];
    if (!src) {
      throw new Error(
        "groupLayoutsByZone: layout id " +
          layoutEntry.id +
          " has no matching item in itemMap",
      );
    }
    const zoneId = src.zone;
    if (!groups[zoneId]) {
      groups[zoneId] = [];
    }
    groups[zoneId].push(layoutEntry);
  }
  return groups;
}

// ============================================
export function layoutLabels(
  layouts: ComputedItemLayout[],
  items: SceneItem[],
  specs: Record<string, AssetSpec>,
  rules: SceneLayoutRules,
): void {
  // build a lookup from item id to item and spec
  const itemMap: Record<string, SceneItem> = {};
  for (let i = 0; i < items.length; i++) {
    // i < items.length; index is in range
    itemMap[items[i]!.id] = items[i]!;
  }

  // first pass: compute label text and width for each layout
  for (let i = 0; i < layouts.length; i++) {
    // i < layouts.length; index is in range
    const lay = layouts[i]!;
    const item = itemMap[lay.id]!;
    const spec = specs[item.svgAsset]!;
    const zone = rules.zones[item.zone]!;

    // estimate label width from character count (unscaled char units)
    const charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
    const specWidth = spec.labelWidth;
    const estWidth = Math.max(charWidth, specWidth);

    // Available width for label wrap decisions. lay.footprint is
    // post-scale, so we recover the effective scale from the ratio of
    // rendered visual width to unscaled visual width and project
    // lay.footprint back into unscaled units. All comparisons below
    // (charWidth, estWidth, finalWidth, availableWidth) are then in
    // unscaled units, matching the existing char-width math.
    const unscaledVisual = spec.defaultWidth;
    const effectiveScale =
      unscaledVisual > 0 ? lay.width / unscaledVisual : 1.0;
    const unscaledFootprint =
      effectiveScale > 0 ? lay.footprint / effectiveScale : lay.footprint;
    const availableWidth = Math.max(unscaledFootprint, specWidth);

    // try full label first
    let labelText = item.label;
    let lines: string[] = [labelText];
    let finalWidth = estWidth;

    if (estWidth > availableWidth) {
      // too wide: try splitting at middle space
      const split = splitLabelAtMiddle(labelText);
      if (split.length === 2) {
        // split.length === 2 guarantees both indices are in range
        const w1 = split[0]!.length * AVG_CHAR_WIDTH_PCT;
        const w2 = split[1]!.length * AVG_CHAR_WIDTH_PCT;
        finalWidth = Math.max(w1, w2, specWidth);
        lines = split;
      }

      // if still too wide and shortLabel exists, try it
      if (finalWidth > availableWidth && item.shortLabel) {
        labelText = item.shortLabel;
        const shortCharW = labelText.length * AVG_CHAR_WIDTH_PCT;
        finalWidth = Math.max(shortCharW, specWidth);
        lines = [labelText];

        // split short label if it has a space
        if (finalWidth > availableWidth && labelText.indexOf(" ") >= 0) {
          const sSplit = splitLabelAtMiddle(labelText);
          if (sSplit.length === 2) {
            // sSplit.length === 2 guarantees both indices are in range
            const sw1 = sSplit[0]!.length * AVG_CHAR_WIDTH_PCT;
            const sw2 = sSplit[1]!.length * AVG_CHAR_WIDTH_PCT;
            finalWidth = Math.max(sw1, sw2, specWidth);
            lines = sSplit;
          }
        }
      }

      // if still too wide, no space, no short label: truncate
      if (
        finalWidth > availableWidth &&
        lines.length === 1 &&
        !item.shortLabel
      ) {
        // estimate how many chars fit
        const maxChars = Math.floor(availableWidth / AVG_CHAR_WIDTH_PCT);
        if (maxChars > 2) {
          lines = [labelText.substring(0, maxChars - 1) + "..."];
          finalWidth = availableWidth;
        }
      }
    }

    lay.labelLines = lines;
    lay.labelWidth = finalWidth;
    lay.labelMultiline = lines.length > 1;

    // label X centered on object, clamped to padded zone bounds
    const centerX = lay.x + lay.width / 2;
    const halfW = finalWidth / 2;
    const paddedX0 = zone.x0 + ZONE_PADDING;
    const paddedX1 = zone.x1 - ZONE_PADDING;
    const minX = paddedX0 + halfW;
    const maxX = paddedX1 - halfW;
    lay.labelX = Math.max(minX, Math.min(maxX, centerX));

    // labels always above the object to avoid going outside hood
    lay.labelY = lay.y - rules.labelOffsetY;
  }

  // second pass: collision resolution per zone
  const zoneGroups = groupLayoutsByZone(layouts, itemMap);
  const zoneKeys = Object.keys(zoneGroups);
  for (let z = 0; z < zoneKeys.length; z++) {
    // z < zoneKeys.length; both lookups resolve because keys came from the objects
    const group = zoneGroups[zoneKeys[z]!]!;
    const zone = rules.zones[zoneKeys[z]!]!;

    // sort by labelX
    group.sort(function (a: ComputedItemLayout, b: ComputedItemLayout): number {
      return a.labelX - b.labelX;
    });

    // up to 3 passes to resolve chained overlaps
    const tolerance = 0.5;
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < group.length - 1; i++) {
        // i < group.length - 1 means both i and i+1 are in range
        const left = group[i]!;
        const right = group[i + 1]!;
        const leftEdge = left.labelX + left.labelWidth / 2;
        const rightEdge = right.labelX - right.labelWidth / 2;

        if (leftEdge + tolerance > rightEdge) {
          // overlap detected: nudge apart symmetrically
          const overlap = leftEdge + tolerance - rightEdge;
          // nudge capped at 2x zone gap for tighter zones
          const nudge = Math.min(overlap / 2, zone.gap * 2);

          left.labelX -= nudge;
          right.labelX += nudge;

          // clamp to padded zone bounds
          const pX0 = zone.x0 + ZONE_PADDING;
          const pX1 = zone.x1 - ZONE_PADDING;
          const lHalf = left.labelWidth / 2;
          const rHalf = right.labelWidth / 2;
          left.labelX = Math.max(
            pX0 + lHalf,
            Math.min(pX1 - lHalf, left.labelX),
          );
          right.labelX = Math.max(
            pX0 + rHalf,
            Math.min(pX1 - rHalf, right.labelX),
          );
        }
      }
  }
}

// ============================================
// Row+slot layout engine (new model)
//
// Workspace policy for 'hood':
// - Row band y-positions: 3 bands distributed as 25%, 50%, 75% down the workspace
//   (from top). Bands are anchored at their midpoint; items are centered in each band.
// - Slot x-positions: equal spacing within workspace width (100% wide, 0-100 x-coord).
//   Each slot receives (100 / slotCount) width; items are centered in their slots.
// - All items use a default depth tier (mid) and anchor_y='center'.
//
export function computeRowSlotSceneLayout(
  items: SceneItem[],
  specs: Record<string, AssetSpec>,
  input: RowSlotSceneInput,
  viewportW: number,
  viewportH: number,
): ComputedItemLayout[] {
  // Extract label styling from input or use defaults
  const labelFontSize = input.labelFontSize || 14;
  const labelLineHeight = input.labelLineHeight || 1.2;
  const labelOffsetY = input.labelOffsetY || 10;

  // Workspace-specific row band y-positions.
  // For 'hood': 3-row bands at 25%, 50%, 75% (scene y-coordinates 0-100 top-to-bottom).
  // Each row's baseline is set to its band position.
  const rowBandPositions: Record<string, number> = {};
  for (let ri = 0; ri < input.rows.length; ri++) {
    const row = input.rows[ri]!;
    // Position: 25, 50, 75 for rows 0, 1, 2 respectively.
    // Generalizes for more rows: even spacing between 25 and 75.
    const numRows = input.rows.length;
    let bandY: number;
    if (numRows === 1) {
      bandY = 50; // single row at middle
    } else {
      // Distribute rows across 25-75 range
      const minY = 25;
      const maxY = 75;
      bandY = minY + (ri / (numRows - 1)) * (maxY - minY);
    }
    rowBandPositions[row.row_name] = bandY;
  }

  // Build ZoneDef map from rows+slots: one zone per slot.
  // Workspace width is 100 (0-100 x-coords); distribute slots evenly.
  const zonesMap: Record<string, ZoneDef> = {};
  for (const row of input.rows) {
    const numSlots = row.slots.length;
    const slotWidth = numSlots > 0 ? 100 / numSlots : 100;

    for (let si = 0; si < row.slots.length; si++) {
      const slot = row.slots[si]!;
      // Zone x-extent for this slot: [x0, x1)
      const x0 = si * slotWidth;
      const x1 = (si + 1) * slotWidth;
      const baseline = rowBandPositions[row.row_name]!;

      zonesMap[slot.placement_name] = {
        x0,
        x1,
        baseline,
        gap: 2, // default gap; tunable via input later
        align: "center",
      };
    }
  }

  // Build SceneLayoutRules using generated zones
  const layoutRules: SceneLayoutRules = {
    zones: zonesMap,
    labelFontSize,
    labelLineHeight,
    labelOffsetY,
  };
  if (input.sceneBounds) {
    layoutRules.sceneBounds = input.sceneBounds;
  }

  // Build item-to-zone map: look up item.id in the input rows to find its slot placement_name.
  const itemToZone: Record<string, string> = {};
  for (const row of input.rows) {
    for (const slot of row.slots) {
      // Match items by their id (placement_name in the slot).
      for (const item of items) {
        if (item.id === slot.placement_name) {
          itemToZone[item.id] = slot.placement_name;
        }
      }
    }
  }

  // Update item.zone for each item based on row+slot mapping.
  // This is a destructive update; the caller's items array is modified.
  for (const item of items) {
    if (itemToZone[item.id]) {
      item.zone = itemToZone[item.id]!;
    }
  }

  // Call the existing zone-based layout engine with the generated zones.
  return computeSceneLayout(items, specs, layoutRules, viewportW, viewportH);
}

// ============================================
export function computeSceneLayout(
  items: SceneItem[],
  specs: Record<string, AssetSpec>,
  rules: SceneLayoutRules,
  viewportW: number,
  viewportH: number,
): ComputedItemLayout[] {
  // group items by zone
  const zoneGroups: Record<string, SceneItem[]> = {};
  for (let i = 0; i < items.length; i++) {
    // i < items.length; index is in range
    const zoneId = items[i]!.zone;
    if (!zoneGroups[zoneId]) {
      zoneGroups[zoneId] = [];
    }
    zoneGroups[zoneId].push(items[i]!);
  }

  // sort each group by priority then id for deterministic order
  const zoneKeys = Object.keys(zoneGroups);
  for (let z = 0; z < zoneKeys.length; z++) {
    // z < zoneKeys.length; key came from the object's own keys
    zoneGroups[zoneKeys[z]!]!.sort(function (
      a: SceneItem,
      b: SceneItem,
    ): number {
      if (a.depthTier !== b.depthTier) {
        return a.depthTier - b.depthTier;
      }
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }

  // layout each zone
  const allLayouts: ComputedItemLayout[] = [];
  for (let z = 0; z < zoneKeys.length; z++) {
    // z < zoneKeys.length; both lookups resolve because keys came from the objects
    const key = zoneKeys[z]!;
    const zone = rules.zones[key]!;
    const zoneLayouts = layoutZoneItems(
      zoneGroups[key]!,
      zone,
      specs,
      viewportW,
      viewportH,
    );
    for (let j = 0; j < zoneLayouts.length; j++) {
      allLayouts.push(zoneLayouts[j]!);
    }
  }

  // compute labels with collision resolution
  layoutLabels(allLayouts, items, specs, rules);

  // final pass: group-level clamp to scene bounds if defined.
  // Group items by zone and translate each group as a unit so that
  // right/center/left alignment semantics are preserved even when one
  // item in a cluster would violate sceneBounds. (Bug 4 fix.)
  if (rules.sceneBounds) {
    const sb = rules.sceneBounds;
    const itemMapForClamp: Record<string, SceneItem> = {};
    for (let i = 0; i < items.length; i++) {
      // i < items.length; index is in range
      itemMapForClamp[items[i]!.id] = items[i]!;
    }
    const clampGroups = groupLayoutsByZone(allLayouts, itemMapForClamp);
    const clampKeys = Object.keys(clampGroups);
    for (let gi = 0; gi < clampKeys.length; gi++) {
      // gi < clampKeys.length; both lookups resolve because keys came from the objects
      const gKey = clampKeys[gi]!;
      const gLays = clampGroups[gKey]!;
      const gZone = rules.zones[gKey];
      const gAlign = (gZone && gZone.align) || "center";

      // compute max violations on each axis
      let maxLeft = 0;
      let maxRight = 0;
      let maxTop = 0;
      let maxBottom = 0;
      for (let li = 0; li < gLays.length; li++) {
        // li < gLays.length; index is in range
        const gLay = gLays[li]!;
        if (gLay.x < sb.left) {
          const lv = sb.left - gLay.x;
          if (lv > maxLeft) maxLeft = lv;
        }
        if (gLay.x + gLay.width > sb.right) {
          const rv = gLay.x + gLay.width - sb.right;
          if (rv > maxRight) maxRight = rv;
        }
        if (gLay.y < sb.top) {
          const tv = sb.top - gLay.y;
          if (tv > maxTop) maxTop = tv;
        }
        if (gLay.y + gLay.height > sb.bottom) {
          const bv = gLay.y + gLay.height - sb.bottom;
          if (bv > maxBottom) maxBottom = bv;
        }
      }

      // x-axis: resolve violations, alignment-preferred tiebreak
      let dx = 0;
      if (maxLeft > EPSILON && maxRight > EPSILON) {
        // group is wider than sceneBounds -- impossible to satisfy
        // both edges; honor the alignment-preferred edge.
        if (gAlign === "right") {
          dx = -maxRight;
        } else {
          // left or center default to left edge
          dx = maxLeft;
        }
        console.warn(
          'layout_engine: zone "' +
            gKey +
            '" exceeds sceneBounds width' +
            " (align=" +
            gAlign +
            ")",
        );
      } else if (maxLeft > 0) {
        dx = maxLeft;
      } else if (maxRight > 0) {
        dx = -maxRight;
      }

      // y-axis: same pattern but no alignment concept for vertical
      let dy = 0;
      if (maxTop > EPSILON && maxBottom > EPSILON) {
        // height exceeds sceneBounds: prefer top
        dy = maxTop;
        console.warn(
          'layout_engine: zone "' + gKey + '" exceeds sceneBounds height',
        );
      } else if (maxTop > 0) {
        dy = maxTop;
      } else if (maxBottom > 0) {
        dy = -maxBottom;
      }

      // apply uniform shift to every item AND label in the group
      if (dx !== 0 || dy !== 0) {
        for (let li2 = 0; li2 < gLays.length; li2++) {
          // li2 < gLays.length; index is in range
          const s = gLays[li2]!;
          s.x += dx;
          s.y += dy;
          s.labelX += dx;
          s.labelY += dy;
        }
      }
    }
  }

  return allLayouts;
}
