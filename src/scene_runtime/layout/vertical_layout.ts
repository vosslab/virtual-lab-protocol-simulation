// Stage 8: Vertical placement -- consumes the computed zone bands.
//
// This stage runs AFTER measure-vertical and reflow-zones. Those stages measured
// each item's side-independent combined extent (object height + label offset +
// wrapped label box) and reflowed the scene's vertical range into a computed band
// per zone, each band carrying its depth-tier rows (one row per depth_tier, the
// row as tall as its tallest member, spaced top-to-bottom with the tier gap). This
// stage places each item's OBJECT strip inside its tier row and back-solves the
// item baseline from the row geometry per the item's anchor mode.
//
// heightPct = visualWidth * (viewport.w / viewport.h) / aspect. Keeps pixel
// aspect invariant regardless of viewport shape (percent units are per-axis).
//
// Objects keep their NATURAL height (no per-object shrink). The old vertical
// auto-fit (fitFactor + maxHeightInZone) is removed: the reflow already reserved a
// row tall enough for object + gap + label, so the object never needs to be
// squeezed to make room for its label. A scene whose measured content exceeds the
// scene range is handled by the scene-wide uniform object rescale, not by a
// per-object shrink here. Keeping natural height makes "an object covers its own
// label" structurally impossible and is never-crop safe by construction (aspect is
// never distorted, the artwork is never clipped to a too-short card).
//
// Combined-box geometry per label side, anchored at the tier row top:
//   top label:    labelTop = rowTop; objectTop = rowTop + labelBoxHeight + gap.
//   bottom label: objectTop = rowTop; labelTop = objectTop + objectHeight + gap.
// The baseline is then back-solved from objectTop per the item's anchor mode so a
// downstream consumer that reads _baselineY (the bottom-label seed in
// layout_labels) stays consistent with the placed object top.

import { DEFAULT_VIEWPORT, LABEL_DOMINANT_RATIO, UNIFORM_RESCALE_MIN_SCALE } from "./constants.js";
import { buildGlobalDefaults } from "./config/index.js";
import { reflowZones } from "./reflow_zones.js";
import type { LayoutConfig } from "./config/index.js";
import type {
  ComputedItem,
  ComputedZoneBand,
  Diagnostics,
  LabelPlacement,
  SceneBoundsRect,
  Zone,
} from "./types.js";

// Compute the _top edge for an item of the given height under its anchor mode,
// given the baseline. The inverse (baselineFromObjectTop) recovers the baseline
// from a desired top. Kept so the placed _top and _baselineY agree.
function anchorTop(it: ComputedItem, baseline: number, heightPct: number): number {
  if (it.layout.anchor_y === "bottom") {
    return baseline - heightPct;
  }
  if (it.layout.anchor_y === "tip") {
    return baseline + it.layout.anchor_y_offset - heightPct;
  }
  // anchor_y === "top" falls through here and is treated as "center" (top = baseline
  // - height/2). This is intentional and matches the back-solve pairing:
  // pairs anchorTop with baselineFromObjectTop, so as long as both map "top" to the
  // center case the placed _top and _baselineY stay consistent. Do not special-case
  // "top" here without changing baselineFromObjectTop in lockstep.
  return baseline - heightPct / 2;
}

// Back-solve the baseline that maps a desired object TOP to the item's anchor.
// This is the algebraic inverse of anchorTop: given objectTop and height, return
// the baseline `b` such that anchorTop(it, b, height) === objectTop.
//   bottom: top = b - h            -> b = objectTop + h
//   tip:    top = b + offset - h    -> b = objectTop + h - offset
//   center: top = b - h/2          -> b = objectTop + h/2
function baselineFromObjectTop(it: ComputedItem, objectTop: number, heightPct: number): number {
  if (it.layout.anchor_y === "bottom") {
    return objectTop + heightPct;
  }
  if (it.layout.anchor_y === "tip") {
    return objectTop + heightPct - it.layout.anchor_y_offset;
  }
  // anchor_y === "top" falls through to the center inverse (b = objectTop + h/2),
  // the algebraic inverse of the center branch in anchorTop. "top" intentionally
  // maps to center; the two functions must stay paired (see anchorTop).
  return objectTop + heightPct / 2;
}

// Resolve the object TOP edge inside a tier row for one item, given its label
// side. The combined box is anchored at the row top (combinedTop = rowTop):
//   top label:    the label strip sits at the row top, the object below it.
//   bottom label: the object sits at the row top, the label strip below it.
// The gap (labelGap) is the SAME label_offset_y the measure stage folded into the
// combined extent, so the object strip lands inside the reserved row height.
function objectTopInRow(
  rowTop: number,
  placement: LabelPlacement,
  labelBoxHeight: number,
  labelGap: number,
): number {
  if (placement === "bottom") {
    // Object at the row top; the label strip sits below the object.
    return rowTop;
  }
  // Top label: the label strip sits at the row top; the object sits below it.
  return rowTop + labelBoxHeight + labelGap;
}

// Find the tier row (rowTop) for a placement name inside a computed band. Each
// band lists its rows in depth order; a placement appears in exactly one row's
// placementNames. Returns the row top, or undefined when the placement is not in
// any row (a pipeline-ordering bug the caller handles loudly).
function rowTopFor(band: ComputedZoneBand, placementName: string): number | undefined {
  for (const row of band.tiers) {
    if (row.placementNames.includes(placementName)) return row.rowTop;
  }
  return undefined;
}

export function verticalLayout(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  zoneBands: Map<string, ComputedZoneBand>,
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
  diagnostics: Diagnostics = [],
  config: LayoutConfig = buildGlobalDefaults(),
): Map<string, ComputedItem[]> {
  const viewportAspect = viewport.w / viewport.h;
  const aspectFloor = config.aspectFloor;
  // The gap between the object strip and the label strip. It is the SAME
  // label_offset_y the measure-vertical stage folded into _combinedHeight, so the
  // object strip placed here lands inside the reserved row height.
  const labelGap = config.labelOffsetY;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    const band = zoneBands.get(zone.id);

    const updated = items.map((it): ComputedItem => {
      const aspect = Math.max(aspectFloor, it.aspect);
      // Natural height at the current horizontal scale; objects keep this height
      // (no per-object shrink). Width and the natural height share one factor, so
      // the aspect ratio is preserved exactly (never-crop safe by construction).
      const naturalHeight = (it._visualWidth * viewportAspect) / aspect;

      // The label side and label-strip height the measure-vertical stage recorded.
      // They are present after measure-vertical; fall back defensively so a
      // direct-call unit test that skipped the measure stage still places objects.
      const placement: LabelPlacement = it._labelPlacement ?? it.layout.label_placement ?? "top";
      const labelBoxHeight = it._labelBoxHeight ?? 0;

      // An authored baseline_override pins the object baseline directly (rare; no
      // current content uses it). It bypasses the row back-solve so an explicit
      // author intent still wins. Object geometry then derives from that baseline.
      if (it.baseline_override !== undefined) {
        const baseline = it.baseline_override;
        const top = anchorTop(it, baseline, naturalHeight);
        const placed: ComputedItem = {
          ...it,
          _baselineY: baseline,
          _top: top,
          _height: naturalHeight,
        };
        return placed;
      }

      // The tier row this item belongs to. Without a band (a direct-call test that
      // did not run reflow-zones) or a missing row (a pipeline-ordering bug), fall
      // back to the zone's authored band top so the object still places
      // deterministically and a diagnostic surfaces.
      let rowTop: number | undefined;
      if (band !== undefined) rowTop = rowTopFor(band, it.placement_name);
      if (rowTop === undefined) {
        diagnostics.push({
          stage: "vertical",
          severity: "warn",
          kind: "item_escapes_zone_vertically",
          zone: zone.id,
          placement_name: it.placement_name,
        });
        rowTop = zone.bounds.top;
      }

      // Place the object strip inside the tier row per the label side, then
      // back-solve the baseline so _top and _baselineY agree under the anchor mode.
      const objectTop = objectTopInRow(rowTop, placement, labelBoxHeight, labelGap);
      const baseline = baselineFromObjectTop(it, objectTop, naturalHeight);

      const placed: ComputedItem = {
        ...it,
        _baselineY: baseline,
        _top: objectTop,
        _height: naturalHeight,
      };
      return placed;
    });

    result.set(zone.id, updated);
  }

  return result;
}

//============================================
// Terminal uniform object rescale
//============================================

// The result of the scene-wide uniform object rescale. scaledMeasured is the
// measured-items map with every object's dimensions multiplied by uniformScale and
// its combined extent recomputed; bands are the zone bands reflowed from those
// scaled extents (the caller feeds both into place-vertical). uniformScale is the
// one factor applied to every object's width AND height (aspect preserved).
// stillOverflow is true when the required scale fell BELOW the dedicated floor
// (the raw ratio sceneRange/totalContent < UNIFORM_RESCALE_MIN_SCALE, so the
// uniformScale was clamped up to the floor and even the floor-scaled objects cannot
// bring the content within the scene range). labelDominant is true when any item's
// label strip is at least LABEL_DOMINANT_RATIO of its scaled object height.
// newTotalContent is the reflowed content extent after scaling, surfaced for the
// report.
export interface UniformRescaleResult {
  scaledMeasured: Map<string, ComputedItem[]>;
  bands: Map<string, ComputedZoneBand>;
  uniformScale: number;
  stillOverflow: boolean;
  labelDominant: boolean;
  newTotalContent: number;
}

// The scene-wide uniform object scale factor plus whether it was clamped up to the
// floor. The factor shrinks ONLY the scalable (object-height) portion of the content:
//
//   scalableContent = totalContent - fixedOverhead
//   raw = (sceneRange - fixedOverhead) / scalableContent
//
// fixedOverhead is the part of totalContent the object rescale does NOT shrink: zone
// padding, tier gaps, and per-tier fixed label strips (label gap + label box height).
// Sizing the scale against the scalable remainder makes the post-scale content land
// at sceneRange (fixedOverhead + raw*scalableContent == sceneRange), instead of the
// old sceneRange/totalContent which left fixedOverhead of content past the bottom.
//
// clamped is min(1, max(floor, raw)). The upper clamp of 1 means the rescale never
// ENLARGES an object. The floor is the dedicated vertical terminal-fallback floor
// UNIFORM_RESCALE_MIN_SCALE, distinct from the horizontal packer MIN_SCALE (0.55).
// clampedToFloor records when raw < floor: the required shrink was below the floor,
// so even floor-scaled objects leave the scene over its range -- the "still over at
// the floor" condition the diagnostic reports.
interface UniformScaleDecision {
  uniformScale: number;
  clampedToFloor: boolean;
}

function uniformScaleFor(
  totalContent: number,
  fixedOverhead: number,
  sceneRange: number,
): UniformScaleDecision {
  if (sceneRange <= 0 || totalContent <= 0) {
    return { uniformScale: 1, clampedToFloor: false };
  }
  const scalableContent = totalContent - fixedOverhead;
  const availableForObjects = sceneRange - fixedOverhead;
  // Degenerate overload: the fixed overhead (padding, tier gaps, fixed label strips)
  // alone meets or exceeds the scene range, or there is no object height to shrink.
  // The scene cannot fit even at zero object size -- a real overload to flag, not to
  // crop. Fall back to the MIN_SCALE floor and report it via clampedToFloor so the
  // scene_reflow_overflow diagnostic fires; do not divide by a non-positive scalable.
  if (scalableContent <= 0 || availableForObjects <= 0) {
    return { uniformScale: UNIFORM_RESCALE_MIN_SCALE, clampedToFloor: true };
  }
  const raw = availableForObjects / scalableContent;
  const clamped = Math.min(1, Math.max(UNIFORM_RESCALE_MIN_SCALE, raw));
  // clampedToFloor: the unclamped ratio fell below the floor, so the floor is the
  // binding constraint and the scaled content still exceeds the scene range.
  const clampedToFloor = raw < UNIFORM_RESCALE_MIN_SCALE;
  return { uniformScale: clamped, clampedToFloor };
}

// The maximum scale-refinement iterations. The per-tier row height is
// max(s*objectHeight + fixedLabel), a piecewise-linear function of s whose winning
// row can switch as s shrinks (a label-heavy short object overtakes a tall object
// once both shrink). The closed-form uniformScaleFor assumes a FIXED winning row, so
// after the first scale a different row may win and leave content slightly past the
// scene bottom. A bounded fixed-point refinement re-measures the post-scale content
// and recomputes the scale until the winning rows stabilize. The max function is
// monotone and deterministic, so this converges in a few steps; the cap is a safety
// bound, not an expected limit.
const UNIFORM_RESCALE_MAX_REFINE = 8;
// Convergence tolerance for the refinement: stop once the post-scale content sits at
// or below the scene range within this scene-percent slack. Tight enough that no art
// visibly crosses the bottom, loose enough to stop on float noise.
const UNIFORM_RESCALE_FIT_TOLERANCE = 1e-6;

// Measure the post-scale reflow content for a candidate scale: scale the object
// portion of each item's combined extent, re-reflow, and return the reflow's
// totalContent + fixedOverhead at that scale. Pure read of the measured map. Used by
// the fixed-point refinement to account for winning-row switches the closed-form
// scale cannot see; it does not mutate measured or build the final scaled map.
function measureScaledContent(
  measured: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect,
  scale: number,
  viewportAspect: number,
  aspectFloor: number,
  labelGap: number,
  zonePad: number,
): { totalContent: number; fixedOverhead: number } {
  const probe = new Map<string, ComputedItem[]>();
  for (const zone of zones) {
    const items = measured.get(zone.id) ?? [];
    const scaledItems = items.map((it): ComputedItem => {
      const aspect = Math.max(aspectFloor, it.aspect);
      const scaledVisualWidth = it._visualWidth * scale;
      const scaledObjectHeight = (scaledVisualWidth * viewportAspect) / aspect;
      const labelBoxHeight = it._labelBoxHeight ?? 0;
      const scaledCombined = scaledObjectHeight + labelGap + labelBoxHeight;
      const scaled: ComputedItem = { ...it, _combinedHeight: scaledCombined };
      return scaled;
    });
    probe.set(zone.id, scaledItems);
  }
  const reflow = reflowZones(probe, zones, sceneBounds, zonePad, undefined, labelGap);
  return { totalContent: reflow.totalContent, fixedOverhead: reflow.fixedOverhead };
}

// Refine the object scale to a fixed point so the POST-scale reflow content fits the
// scene range. Starts from the closed-form scale, then re-measures the scaled
// content and recomputes the scale against the post-scale fixed overhead until the
// content fits within tolerance or the floor binds. Each step uses the recurrence
//   s_next = s * (sceneRange - fixedOverhead_s) / (totalContent_s - fixedOverhead_s)
// which re-targets the object portion measured AT the current scale, so a winning-row
// switch between steps is absorbed. The result never drops below the floor; a scene
// that still overflows at the floor reports clampedToFloor (a real overload).
function refineUniformScale(
  measured: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect,
  totalContent: number,
  fixedOverhead: number,
  viewportAspect: number,
  aspectFloor: number,
  labelGap: number,
  zonePad: number,
): UniformScaleDecision {
  const sceneRange = sceneBounds.bottom - sceneBounds.top;
  // Closed-form first guess from the pre-scale content.
  const initial = uniformScaleFor(totalContent, fixedOverhead, sceneRange);
  let scale = initial.uniformScale;
  // The closed-form already clamped to the floor: the scene cannot fit above the
  // floor, so refinement cannot help. Return it as the real, reportable overload.
  if (initial.clampedToFloor) return initial;
  // No shrink needed (content fit at scale 1); nothing to refine.
  if (scale >= 1) return initial;

  let clampedToFloor = false;
  for (let i = 0; i < UNIFORM_RESCALE_MAX_REFINE; i++) {
    const measuredAt = measureScaledContent(
      measured,
      zones,
      sceneBounds,
      scale,
      viewportAspect,
      aspectFloor,
      labelGap,
      zonePad,
    );
    const overflowNow = measuredAt.totalContent - sceneRange;
    // Within tolerance (at or under the range): the winning rows have stabilized and
    // the content fits. Done.
    if (overflowNow <= UNIFORM_RESCALE_FIT_TOLERANCE) break;
    const scalableAt = measuredAt.totalContent - measuredAt.fixedOverhead;
    const availableAt = sceneRange - measuredAt.fixedOverhead;
    // The fixed overhead measured at this scale already meets/exceeds the range, or
    // there is no scalable object height left: a real overload at any object size.
    if (scalableAt <= 0 || availableAt <= 0) {
      scale = UNIFORM_RESCALE_MIN_SCALE;
      clampedToFloor = true;
      break;
    }
    // Re-target the object portion measured AT this scale to exactly fill the range.
    const next = scale * (availableAt / scalableAt);
    if (next <= UNIFORM_RESCALE_MIN_SCALE) {
      // The refinement wants to shrink below the floor: pin to the floor and report
      // the overload. The floor-scaled content still exceeds the range.
      scale = UNIFORM_RESCALE_MIN_SCALE;
      clampedToFloor = true;
      break;
    }
    scale = next;
  }
  return { uniformScale: scale, clampedToFloor };
}

// Apply the scene-wide uniform object rescale and re-run the zone reflow ONCE.
//
// This is the terminal vertical fallback. It runs AFTER horizontal
// convergence, on the measured items (post measure-vertical, carrying
// _visualWidth / _combinedHeight / _labelBoxHeight / _labelPlacement). It scales
// OBJECT dimensions only -- _visualWidth, _scale, and the natural object height
// folded into _combinedHeight -- by ONE factor applied to both axes, so the aspect
// ratio is preserved exactly (never-crop safe by construction). Label line height,
// label gap (labelOffsetY), tier gap, and zone padding stay FIXED (canvas-relative):
// _labelBoxHeight and _labelPlacement are carried through unchanged, and the reflow
// re-uses the same fixed tierGap / zonePad. The combined extent is recomputed once
// as scaledObjectHeight + fixedLabelGap + fixedLabelBoxHeight, then reflowZones runs
// once on the scaled extents to produce fresh bands. It does NOT touch _centerX,
// _footprint, or _width_scale: horizontal geometry is owned by the horizontal stage
// and this fallback never routes back through the convergence loop.
//
// It is pure: it reads the measured map and returns a fresh scaled map plus the
// reflowed bands. The caller (run_pipeline) feeds the scaled map and bands into
// place-vertical to finish placement.
export function applyUniformRescale(
  measured: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect,
  totalContent: number,
  fixedOverhead: number,
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
  config: LayoutConfig = buildGlobalDefaults(),
): UniformRescaleResult {
  const viewportAspect = viewport.w / viewport.h;
  const aspectFloor = config.aspectFloor;
  // The fixed gap between the object strip and the label strip. It is the SAME
  // label_offset_y measure-vertical folded into _combinedHeight; it does NOT scale.
  const labelGap = config.labelOffsetY;
  const zonePad = config.spacing.objectZonePadding;
  // Size the object scale against only the SCALABLE remainder of the content (the
  // object heights), leaving the fixed overhead (padding, tier gaps, label strips)
  // untouched, then refine to a fixed point so the POST-scale content (whose winning
  // tier rows may switch as objects shrink) lands inside the scene range instead of
  // overshooting it. The result is still ONE uniform factor applied to both
  // axes; refinement only sharpens that single scalar.
  const decision = refineUniformScale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    viewportAspect,
    aspectFloor,
    labelGap,
    zonePad,
  );
  const uniformScale = decision.uniformScale;

  // Scale every object's dimensions by the one factor and recompute its combined
  // extent. The natural object height shares the factor with the width (one scalar,
  // both axes), so aspect is preserved. The label strip (_labelBoxHeight) and the
  // gap (labelGap) are added back UNSCALED, so the label is never shrunk with the
  // object.
  let labelDominant = false;
  const scaledMeasured = new Map<string, ComputedItem[]>();
  for (const zone of zones) {
    const items = measured.get(zone.id) ?? [];
    const scaledItems = items.map((it): ComputedItem => {
      const aspect = Math.max(aspectFloor, it.aspect);
      const scaledVisualWidth = it._visualWidth * uniformScale;
      // The scaled natural object height. Width and height share the one factor, so
      // this is exactly uniformScale * the pre-scale natural height.
      const scaledObjectHeight = (scaledVisualWidth * viewportAspect) / aspect;
      const labelBoxHeight = it._labelBoxHeight ?? 0;
      // Recompute the side-independent combined extent with the FIXED label gap and
      // label box height, only the object portion shrunk.
      const scaledCombined = scaledObjectHeight + labelGap + labelBoxHeight;
      // labelDominant review flag: the label strip is large relative to the now
      // smaller object. Guard the divide; a zero-height object cannot be dominated.
      if (scaledObjectHeight > 0 && labelBoxHeight / scaledObjectHeight >= LABEL_DOMINANT_RATIO) {
        labelDominant = true;
      }
      const scaled: ComputedItem = {
        ...it,
        _visualWidth: scaledVisualWidth,
        _scale: it._scale * uniformScale,
        _combinedHeight: scaledCombined,
      };
      return scaled;
    });
    scaledMeasured.set(zone.id, scaledItems);
  }

  // Re-run the zone reflow ONCE on the scaled extents. tierGap and zonePad default
  // to the same fixed constants the reflow phase threads, so the only thing that
  // changed between reflows is the per-item object height. The fresh bands place the
  // scaled objects; when the scaled content still exceeds the range (the fixed
  // label/gap/padding portion does not shrink) reflowZones compresses each group to
  // its content extent and stacks from the top, which is the honest tight placement.
  // zonePad was resolved above (shared with the scale refinement). Thread labelGap so
  // the re-reflow's fixedOverhead is computed the same way as the pre-scale reflow.
  const reflow = reflowZones(scaledMeasured, zones, sceneBounds, zonePad, undefined, labelGap);

  // stillOverflow is the "still over at the floor" condition: the required scale fell
  // below the dedicated floor, so even floor-scaled objects cannot fit the content.
  // It is NOT reflow.overflow on the scaled extents -- the fixed label/gap/padding
  // portion keeps that flag set for most rescaled scenes even when the object shrink
  // was the intended, accepted result. Only a clamp at the floor is a real, reportable
  // overflow (the scene needs more shrink than the floor allows).
  const out: UniformRescaleResult = {
    scaledMeasured,
    bands: reflow.bands,
    uniformScale,
    stillOverflow: decision.clampedToFloor,
    labelDominant,
    newTotalContent: reflow.totalContent,
  };
  return out;
}
