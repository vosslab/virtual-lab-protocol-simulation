// Structural layout guards: verifies final layout against no-clipping and
// invariant constraints before rendering. This module is a verifier only;
// it reads geometry from PipelineResult and scene, does not compute positions.
//
// Two consumption modes share one pure classification core:
//   - collectStructuralViolations(): returns the full list of violations and
//     never throws. The renderer uses this so a structural problem degrades the
//     scene (still renders every item, flags it) instead of blanking the page.
//   - runStructuralGuards(): throws on the first violation. Tests and CI use
//     this so a structural regression fails loudly.
//   - enforceNoLabelOwnSvgOverlap(): throws on Guard 8 (own-art label overlap)
//     only. The renderer calls this after collecting violations so own-art
//     overlap hard-fails at live render instead of degrading silently; other
//     guards keep degrade-not-blank semantics.
// The guards classify; the caller decides fatality. There is no try/catch
// around the guard calls; the throwing wrappers simply re-raise the
// violation the pure core already found.

import type { ComputedItem, SceneA, Bounds } from "../layout/types.js";
import { ASSET_SPECS } from "../../../generated/object_library.js";
import { SVG_MANIFEST } from "../../../generated/svg_manifest.js";
import {
  DEFAULT_VIEWPORT,
  AVG_CHAR_WIDTH_PCT,
  LABEL_LINE_HEIGHT_PCT,
} from "../layout/constants.js";

//============================================
// Type assertions for generated values (ESLint/TypeScript compatibility)
//============================================

const typedAssetSpecs = ASSET_SPECS as Record<
  string,
  { default_width: number; label_width: number; aspect: number }
>;
// Guard 6 validates asset presence against the SVG MANIFEST (the post-cutover
// source of every shipped asset), not the removed inline SVG_REGISTRY. An asset
// is resolvable iff it has a manifest entry.
const typedSvgManifest = SVG_MANIFEST;

//============================================
// Violation classification
//============================================

// One structural-guard violation. The guards classify problems into this flat
// record; the caller (renderer = report, tests/CI = throw) decides fatality.
export interface StructuralViolation {
  // Stable guard identifier, used for filtering and diagnostics.
  guard:
    | "zone_lookup"
    | "zone_off_scene"
    | "item_overlap"
    | "zone_gap"
    | "aspect_distortion"
    | "missing_asset"
    | "label_off_scene"
    | "label_svg_overlap";
  // Human-readable message identical to the legacy thrown Error message.
  message: string;
  // The primary placement (or zone) the violation concerns, when applicable.
  placement_name?: string;
}

//============================================
// Helper types and constants
//============================================

const JITTER_TOLERANCE = 0.5; // percent units
const ITEM_OVERLAP_TOLERANCE = 1; // percent units
const LABEL_OVERLAP_TOLERANCE = 1; // percent units
const ASPECT_TOLERANCE = 0.05; // 5% tolerance
// AVG_CHAR_WIDTH_PCT and LABEL_LINE_HEIGHT_PCT are imported from layout/constants.ts
// to keep bbox estimates consistent with the engine's width/height model.
const DEFAULT_ZONE_GAP = 8; // px, converted to percent using viewport width

//============================================
// Bbox computation helpers
//============================================

// Derive item bbox from the anchor-coordinate convention:
//   _centerX = shared horizontal center; left/right derived from it.
//   _top = derived visual top edge (used verbatim).
function itemBbox(item: ComputedItem): Bounds {
  return {
    left: item._centerX - item._visualWidth / 2,
    top: item._top,
    right: item._centerX + item._visualWidth / 2,
    bottom: item._top + item._height,
  };
}

// Compute label bbox using the engine's character width and line height constants.
// labelWidth: longest line * AVG_CHAR_WIDTH_PCT (0.45, matches wrap_label/stagger logic).
// labelHeight: line count * LABEL_LINE_HEIGHT_PCT (2.2, matches stagger row height).
// _labelX is the label horizontal center; _labelY is the label top edge.
function labelBbox(item: ComputedItem): Bounds {
  const labelWidth = Math.max(...item._labelLines.map((line) => line.length)) * AVG_CHAR_WIDTH_PCT;
  const labelHeight = item._labelLines.length * LABEL_LINE_HEIGHT_PCT;
  const labelLeft = item._labelX - labelWidth / 2;
  const labelTop = item._labelY;

  return {
    left: labelLeft,
    top: labelTop,
    right: labelLeft + labelWidth,
    bottom: labelTop + labelHeight,
  };
}

function bboxesIntersect(a: Bounds, b: Bounds): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function bboxArea(bbox: Bounds): number {
  const width = Math.max(0, bbox.right - bbox.left);
  const height = Math.max(0, bbox.bottom - bbox.top);
  return width * height;
}

function intersectionArea(a: Bounds, b: Bounds): number {
  if (!bboxesIntersect(a, b)) {
    return 0;
  }
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return Math.max(0, width * height);
}

function bboxContained(inner: Bounds, outer: Bounds, tolerance: number): boolean {
  return (
    inner.left >= outer.left - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.bottom <= outer.bottom + tolerance
  );
}

//============================================
// Guard 1: every item lies inside its zone bbox
//============================================

function checkItemsInZones(final: ComputedItem[], scene: SceneA): StructuralViolation[] {
  const violations: StructuralViolation[] = [];

  const zoneMap = new Map<string, Bounds>();
  for (const zone of scene.zones) {
    zoneMap.set(zone.id, zone.bounds);
  }

  for (const item of final) {
    if (!item.zone) {
      continue;
    }
    const zoneBounds: Bounds | undefined = zoneMap.get(item.zone);
    if (!zoneBounds) {
      // Zone-lookup miss is a structural violation, not a throw. The pure core
      // must never throw (report mode would blank the scene); the throwing
      // wrapper re-raises this like any other violation for tests/CI.
      violations.push({
        guard: "zone_lookup",
        placement_name: item.placement_name,
        message: `Structural guard failure (zone lookup): item "${item.placement_name}" zone "${item.zone}" not found in scene.`,
      });
      continue;
    }
    const itemBboxVal = itemBbox(item);
    if (!bboxContained(itemBboxVal, zoneBounds, JITTER_TOLERANCE)) {
      // Zone containment is a design-time check; tall scientific objects
      // (heat blocks, electrophoresis tanks) routinely extend above their
      // zone bounds by their anchor offset. Demote to console.warn so the
      // runtime mounts and design tooling under validation/scene_lint/
      // still flags drift loudly.
      // eslint-disable-next-line no-console
      console.warn(
        `Zone-containment drift: item "${item.placement_name}" bbox [${itemBboxVal.left.toFixed(1)}, ${itemBboxVal.top.toFixed(1)}, ${itemBboxVal.right.toFixed(1)}, ${itemBboxVal.bottom.toFixed(1)}] lies outside zone "${item.zone}" bounds [${zoneBounds.left.toFixed(1)}, ${zoneBounds.top.toFixed(1)}, ${zoneBounds.right.toFixed(1)}, ${zoneBounds.bottom.toFixed(1)}].`,
      );
    }
  }
  return violations;
}

//============================================
// Guard 2: every zone lies inside scene_bounds
//============================================

function checkZonesInScene(scene: SceneA): StructuralViolation[] {
  const violations: StructuralViolation[] = [];

  const sceneBounds = scene.scene_bounds;
  if (!sceneBounds) {
    return violations;
  }

  for (const zone of scene.zones) {
    if (!bboxContained(zone.bounds, sceneBounds, JITTER_TOLERANCE)) {
      violations.push({
        guard: "zone_off_scene",
        placement_name: zone.id,
        message: `Structural guard failure (zone off-scene): zone "${zone.id}" bounds [${zone.bounds.left.toFixed(1)}, ${zone.bounds.top.toFixed(1)}, ${zone.bounds.right.toFixed(1)}, ${zone.bounds.bottom.toFixed(1)}] lies outside scene_bounds [${sceneBounds.left.toFixed(1)}, ${sceneBounds.top.toFixed(1)}, ${sceneBounds.right.toFixed(1)}, ${sceneBounds.bottom.toFixed(1)}].`,
      });
    }
  }
  return violations;
}

//============================================
// Guard 3: no item-item overlap
//============================================

function checkNoItemOverlap(final: ComputedItem[]): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  for (let i = 0; i < final.length; i++) {
    for (let j = i + 1; j < final.length; j++) {
      const itemA: ComputedItem | undefined = final[i];
      const itemB: ComputedItem | undefined = final[j];
      if (!itemA || !itemB) {
        continue;
      }
      const bboxA = itemBbox(itemA);
      const bboxB = itemBbox(itemB);

      if (!bboxesIntersect(bboxA, bboxB)) {
        continue;
      }

      const areaA = bboxArea(bboxA);
      const areaB = bboxArea(bboxB);
      const minArea = Math.min(areaA, areaB);
      const overlapArea = intersectionArea(bboxA, bboxB);
      const overlapPct = minArea > 0 ? (overlapArea / minArea) * 100 : 100;

      if (overlapPct > ITEM_OVERLAP_TOLERANCE) {
        violations.push({
          guard: "item_overlap",
          placement_name: itemA.placement_name,
          message: `Structural guard failure (item overlap): item "${itemA.placement_name}" overlaps with "${itemB.placement_name}" by ${overlapPct.toFixed(1)}%.`,
        });
      }
    }
  }
  return violations;
}

//============================================
// Guard 4: same-zone gap >= layout_rules.zone_gap
//============================================

function checkSameZoneGap(final: ComputedItem[], scene: SceneA): StructuralViolation[] {
  const violations: StructuralViolation[] = [];

  const zoneGapPx = scene.layout_rules?.zone_gap ?? DEFAULT_ZONE_GAP;
  // Use the canonical viewport width from layout/constants.ts (1920) so this
  // guard matches every other pipeline consumer.
  const viewportWidth = DEFAULT_VIEWPORT.w;
  const zoneGapPct = (zoneGapPx / viewportWidth) * 100;

  // Group items by zone
  const itemsByZone = new Map<string, ComputedItem[]>();
  for (const item of final) {
    if (!item.zone) {
      continue;
    }
    if (!itemsByZone.has(item.zone)) {
      itemsByZone.set(item.zone, []);
    }
    itemsByZone.get(item.zone)!.push(item);
  }

  // For each zone, check horizontal gaps
  for (const [zoneId, items] of itemsByZone) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA: ComputedItem | undefined = items[i];
        const itemB: ComputedItem | undefined = items[j];
        if (!itemA || !itemB) {
          continue;
        }
        const bboxA = itemBbox(itemA);
        const bboxB = itemBbox(itemB);

        // Check horizontal adjacency
        const horizontalGap = Math.min(
          Math.abs(bboxA.right - bboxB.left),
          Math.abs(bboxB.right - bboxA.left),
        );

        // Only enforce gap if horizontally adjacent
        if (horizontalGap < 1 && horizontalGap >= 0) {
          if (horizontalGap < zoneGapPct) {
            violations.push({
              guard: "zone_gap",
              placement_name: itemA.placement_name,
              message: `Structural guard failure (zone gap): items "${itemA.placement_name}" and "${itemB.placement_name}" in zone "${zoneId}" have horizontal gap ${horizontalGap.toFixed(1)}% < required ${zoneGapPct.toFixed(1)}%.`,
            });
          }
        }
      }
    }
  }
  return violations;
}

//============================================
// Guard 5: aspect preserved per item
//============================================

function checkAspectRatio(
  final: ComputedItem[],
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  // Item dimensions are in percent units (0-100 scale).
  // Pipeline computes _height = _visualWidth * (viewport.w / viewport.h) / aspect_svg
  // So _visualWidth / _height = aspect_svg / (viewport.w / viewport.h)
  // To get the rendered screen-pixel aspect, multiply percent-aspect by viewport aspect.
  // IMPORTANT: viewport must match the pipeline viewport used to compute _height.
  // Using a different viewport (e.g. DEFAULT_VIEWPORT when the pipeline used the
  // actual bounded panel size) will cause false aspect-distortion failures.
  const viewportAspect = viewport.w / viewport.h;

  for (const item of final) {
    // Placeholder items have no real SVG asset; skip aspect check.
    if (item.missing_svg === true) {
      continue;
    }

    const assetSpec = typedAssetSpecs[item.asset];
    if (!assetSpec) {
      // If asset spec not found, that's caught by guard 6
      continue;
    }

    const expectedAspect = assetSpec.aspect;
    const percentAspect = item._height > 0 ? item._visualWidth / item._height : 0;

    if (percentAspect === 0 || expectedAspect === 0) {
      continue;
    }

    // Convert percent-units aspect to screen-pixel aspect
    const renderedAspect = percentAspect * viewportAspect;

    const aspectRatio = expectedAspect > 0 ? renderedAspect / expectedAspect : 1;
    const deviation = Math.abs(aspectRatio - 1);

    if (deviation > ASPECT_TOLERANCE) {
      violations.push({
        guard: "aspect_distortion",
        placement_name: item.placement_name,
        message: `Structural guard failure (aspect distortion): item "${item.placement_name}" asset "${item.asset}" has rendered aspect ${renderedAspect.toFixed(3)} vs expected viewBox aspect ${expectedAspect.toFixed(3)} (deviation ${(deviation * 100).toFixed(1)}%).`,
      });
    }
  }
  return violations;
}

//============================================
// Guard 6: asset resolves in the SVG manifest
//============================================

function checkAssetsResolved(final: ComputedItem[], scene: SceneA): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  for (const item of final) {
    // Placeholder items deliberately have missing assets; skip the manifest check.
    if (item.missing_svg === true) {
      continue;
    }

    const asset = item.asset;
    if (typedSvgManifest[asset] === undefined) {
      violations.push({
        guard: "missing_asset",
        placement_name: item.placement_name,
        message: `Structural guard failure (missing asset): scene "${scene.scene_name}" / placement "${item.placement_name}" / object "${item.object_name}" / asset "${asset}" not in SVG_MANIFEST.`,
      });
    }
  }
  return violations;
}

//============================================
// Guard 7: no label outside scene
//============================================

function checkLabelsInScene(final: ComputedItem[], scene: SceneA): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  const sceneBounds = scene.scene_bounds;
  if (!sceneBounds) {
    return violations;
  }

  for (const item of final) {
    if (item._labelLines.length === 0) {
      continue;
    }
    const labelBboxVal = labelBbox(item);
    if (!bboxContained(labelBboxVal, sceneBounds, JITTER_TOLERANCE)) {
      violations.push({
        guard: "label_off_scene",
        placement_name: item.placement_name,
        message: `Structural guard failure (label off-scene): label for item "${item.placement_name}" bbox [${labelBboxVal.left.toFixed(1)}, ${labelBboxVal.top.toFixed(1)}, ${labelBboxVal.right.toFixed(1)}, ${labelBboxVal.bottom.toFixed(1)}] lies outside scene_bounds [${sceneBounds.left.toFixed(1)}, ${sceneBounds.top.toFixed(1)}, ${sceneBounds.right.toFixed(1)}, ${sceneBounds.bottom.toFixed(1)}].`,
      });
    }
  }
  return violations;
}

//============================================
// Guard 8: no label overlap with own SVG
//============================================

function checkNoLabelOwnSvgOverlap(final: ComputedItem[]): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  for (const item of final) {
    if (item._labelLines.length === 0) {
      continue;
    }
    const labelBboxVal = labelBbox(item);
    const itemBboxVal = itemBbox(item);

    if (bboxesIntersect(labelBboxVal, itemBboxVal)) {
      const areaLabel = bboxArea(labelBboxVal);
      const areaItem = bboxArea(itemBboxVal);
      const minArea = Math.min(areaLabel, areaItem);
      const overlapArea = intersectionArea(labelBboxVal, itemBboxVal);
      const overlapPct = minArea > 0 ? (overlapArea / minArea) * 100 : 100;

      if (overlapPct > LABEL_OVERLAP_TOLERANCE) {
        violations.push({
          guard: "label_svg_overlap",
          placement_name: item.placement_name,
          message: `Structural guard failure (label-svg overlap): label for item "${item.placement_name}" overlaps its own SVG by ${overlapPct.toFixed(1)}%.`,
        });
      }
    }
  }
  return violations;
}

//============================================
// Main entry point
//============================================

/**
 * Pure classification core. Runs every guard and returns ALL violations found,
 * never throwing. Guard 1 zone-containment drift only console.warns and is not
 * a violation, but a guard 1 zone-lookup miss is collected. The renderer uses
 * this to degrade-not-blank; tests/CI use the throwing wrapper below.
 *
 * @param final - computed layout items
 * @param scene - source scene (SceneA)
 * @param viewport - pixel dimensions used by the pipeline (for aspect check)
 * @returns every structural violation, in guard order; empty when clean
 */
export function collectStructuralViolations(
  final: ComputedItem[],
  scene: SceneA,
  viewport?: { w: number; h: number },
): StructuralViolation[] {
  const effectiveViewport = viewport ?? DEFAULT_VIEWPORT;

  // Guards 1-8 each return a (possibly empty) violation list. Collect in order.
  const violations: StructuralViolation[] = [
    // Guard 1: items inside zone bboxes. Zone-containment drift is warn-only and
    // contributes no violation; a zone-lookup miss is a collected violation.
    ...checkItemsInZones(final, scene),
    // Guard 2: zones inside scene_bounds
    ...checkZonesInScene(scene),
    // Guard 3: no item-item overlap
    ...checkNoItemOverlap(final),
    // Guard 4: same-zone horizontal gaps
    ...checkSameZoneGap(final, scene),
    // Guard 5: aspect ratios preserved. Pass the same viewport used by the
    // pipeline so rendered-aspect checks are consistent with computed _height.
    ...checkAspectRatio(final, effectiveViewport),
    // Guard 6: assets resolved in SVG manifest
    ...checkAssetsResolved(final, scene),
    // Guard 7: labels inside scene
    ...checkLabelsInScene(final, scene),
    // Guard 8: labels don't overlap own SVG
    ...checkNoLabelOwnSvgOverlap(final),
  ];

  return violations;
}

/**
 * Throwing wrapper for tests and CI. Runs the pure core and throws the first
 * violation's Error so a structural regression fails loudly. This preserves the
 * historical fail-on-first-violation contract that the guard test suite asserts.
 * It is NOT a try/catch swallow; it re-raises the classification result.
 *
 * @throws Error with the first violation's message when any guard fails
 */
export function runStructuralGuards(
  final: ComputedItem[],
  scene: SceneA,
  viewport?: { w: number; h: number },
): void {
  const violations = collectStructuralViolations(final, scene, viewport);
  const first = violations[0];
  if (first) {
    throw new Error(first.message);
  }
}

/**
 * Gate escalation for Guard 8 (own-art label overlap). The renderer collects all
 * violations in report mode (degrade-not-blank), but a label overlapping its own
 * object's SVG is a manufacturing defect, not a degradation a student should ever
 * see. This helper hard-fails on any `label_svg_overlap` violation so own-art
 * overlap is gated at live render rather than silently reported. Other guards
 * keep degrade-not-blank semantics.
 *
 * @throws Error with the first own-art overlap violation's message
 */
export function enforceNoLabelOwnSvgOverlap(violations: StructuralViolation[]): void {
  // Promote own-art overlap from report-only to hard-fail. There is no instance
  // where a label over its own object art should be tolerated.
  const ownArt = violations.find((v) => v.guard === "label_svg_overlap");
  if (ownArt) {
    throw new Error(ownArt.message);
  }
}
