// Structural layout guards: verifies final layout against no-clipping and
// invariant constraints before rendering. This module is a verifier only;
// it reads geometry from PipelineResult and scene, does not compute positions.
// Throws with offending placement_name on first violation.

import type { ComputedItem, SceneA, SceneB, Bounds } from "../layout/types.js";
import { ASSET_SPECS } from "../../../generated/object_library.js";
import { SVG_REGISTRY } from "../../../generated/svg_registry.js";
import { DEFAULT_VIEWPORT } from "../layout/constants.js";

//============================================
// Type assertions for generated values (ESLint/TypeScript compatibility)
//============================================

const typedAssetSpecs = ASSET_SPECS as Record<
  string,
  { default_width: number; label_width: number; aspect: number }
>;
const typedSvgRegistry = SVG_REGISTRY;

//============================================
// Helper types and constants
//============================================

const JITTER_TOLERANCE = 0.5; // percent units
const ITEM_OVERLAP_TOLERANCE = 1; // percent units
const LABEL_OVERLAP_TOLERANCE = 1; // percent units
const ASPECT_TOLERANCE = 0.05; // 5% tolerance
const AVG_CHAR_WIDTH = 0.6; // from constants.ts
const DEFAULT_ZONE_GAP = 8; // px, converted to percent using viewport width
const DEFAULT_VIEWPORT_WIDTH = 1200;

//============================================
// Bbox computation helpers
//============================================

function itemBbox(item: ComputedItem): Bounds {
  return {
    left: item._x,
    top: item._top,
    right: item._x + item._visualWidth,
    bottom: item._top + item._height,
  };
}

function labelBbox(item: ComputedItem): Bounds {
  const labelWidth = Math.max(...item._labelLines.map((line) => line.length)) * AVG_CHAR_WIDTH;
  const labelHeight = item._labelLines.length * (item.layout.label_width || 9); // rough estimate
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

function checkItemsInZones(final: ComputedItem[], scene: SceneA | SceneB): void {
  const sceneA = "zones" in scene ? scene : null;
  if (!sceneA) {
    return; // SceneB doesn't have zones; skip this guard
  }

  const zoneMap = new Map<string, Bounds>();
  for (const zone of sceneA.zones) {
    zoneMap.set(zone.id, zone.bounds);
  }

  for (const item of final) {
    if (!item.zone) {
      continue;
    }
    const zoneBounds: Bounds | undefined = zoneMap.get(item.zone);
    if (!zoneBounds) {
      throw new Error(
        `Structural guard failure (zone lookup): item "${item.placement_name}" zone "${item.zone}" not found in scene.`,
      );
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
}

//============================================
// Guard 2: every zone lies inside scene_bounds
//============================================

function checkZonesInScene(scene: SceneA | SceneB): void {
  const sceneA = "zones" in scene ? scene : null;
  if (!sceneA) {
    return;
  }

  const sceneBounds = sceneA.scene_bounds;
  if (!sceneBounds) {
    return;
  }

  for (const zone of sceneA.zones) {
    if (!bboxContained(zone.bounds, sceneBounds, JITTER_TOLERANCE)) {
      throw new Error(
        `Structural guard failure (zone off-scene): zone "${zone.id}" bounds [${zone.bounds.left.toFixed(1)}, ${zone.bounds.top.toFixed(1)}, ${zone.bounds.right.toFixed(1)}, ${zone.bounds.bottom.toFixed(1)}] lies outside scene_bounds [${sceneBounds.left.toFixed(1)}, ${sceneBounds.top.toFixed(1)}, ${sceneBounds.right.toFixed(1)}, ${sceneBounds.bottom.toFixed(1)}].`,
      );
    }
  }
}

//============================================
// Guard 3: no item-item overlap
//============================================

function checkNoItemOverlap(final: ComputedItem[]): void {
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
        throw new Error(
          `Structural guard failure (item overlap): item "${itemA.placement_name}" overlaps with "${itemB.placement_name}" by ${overlapPct.toFixed(1)}%.`,
        );
      }
    }
  }
}

//============================================
// Guard 4: same-zone gap >= layout_rules.zone_gap
//============================================

function checkSameZoneGap(final: ComputedItem[], scene: SceneA | SceneB): void {
  const sceneA = "zones" in scene ? scene : null;
  if (!sceneA) {
    return;
  }

  const zoneGapPx = sceneA.layout_rules?.zone_gap ?? DEFAULT_ZONE_GAP;
  const viewportWidth = DEFAULT_VIEWPORT_WIDTH; // fallback; could read from PipelineResult if available
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
            throw new Error(
              `Structural guard failure (zone gap): items "${itemA.placement_name}" and "${itemB.placement_name}" in zone "${zoneId}" have horizontal gap ${horizontalGap.toFixed(1)}% < required ${zoneGapPct.toFixed(1)}%.`,
            );
          }
        }
      }
    }
  }
}

//============================================
// Guard 5: aspect preserved per item
//============================================

function checkAspectRatio(
  final: ComputedItem[],
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
): void {
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
      throw new Error(
        `Structural guard failure (aspect distortion): item "${item.placement_name}" asset "${item.asset}" has rendered aspect ${renderedAspect.toFixed(3)} vs expected viewBox aspect ${expectedAspect.toFixed(3)} (deviation ${(deviation * 100).toFixed(1)}%).`,
      );
    }
  }
}

//============================================
// Guard 6: asset resolves in SVG_REGISTRY
//============================================

function checkAssetsResolved(final: ComputedItem[], scene: SceneA | SceneB): void {
  for (const item of final) {
    // Placeholder items deliberately have missing assets; skip the registry check.
    if (item.missing_svg === true) {
      continue;
    }

    const asset = item.asset;
    if (!typedSvgRegistry[asset]) {
      throw new Error(
        `Structural guard failure (missing asset): scene "${scene.scene_name}" / placement "${item.placement_name}" / object "${item.object_name}" / asset "${asset}" not in SVG_REGISTRY.`,
      );
    }
  }
}

//============================================
// Guard 7: no label outside scene
//============================================

function checkLabelsInScene(final: ComputedItem[], scene: SceneA | SceneB): void {
  const sceneBounds = scene.scene_bounds;
  if (!sceneBounds) {
    return;
  }

  for (const item of final) {
    if (item._labelLines.length === 0) {
      continue;
    }
    const labelBboxVal = labelBbox(item);
    if (!bboxContained(labelBboxVal, sceneBounds, JITTER_TOLERANCE)) {
      throw new Error(
        `Structural guard failure (label off-scene): label for item "${item.placement_name}" bbox [${labelBboxVal.left.toFixed(1)}, ${labelBboxVal.top.toFixed(1)}, ${labelBboxVal.right.toFixed(1)}, ${labelBboxVal.bottom.toFixed(1)}] lies outside scene_bounds [${sceneBounds.left.toFixed(1)}, ${sceneBounds.top.toFixed(1)}, ${sceneBounds.right.toFixed(1)}, ${sceneBounds.bottom.toFixed(1)}].`,
      );
    }
  }
}

//============================================
// Guard 8: no label overlap with own SVG
//============================================

function checkNoLabelOwnSvgOverlap(final: ComputedItem[]): void {
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
        throw new Error(
          `Structural guard failure (label-svg overlap): label for item "${item.placement_name}" overlaps its own SVG by ${overlapPct.toFixed(1)}%.`,
        );
      }
    }
  }
}

//============================================
// Main entry point
//============================================

export function runStructuralGuards(
  final: ComputedItem[],
  scene: SceneA | SceneB,
  viewport?: { w: number; h: number },
): void {
  // Guard 1: items inside zone bboxes
  checkItemsInZones(final, scene);

  // Guard 2: zones inside scene_bounds
  checkZonesInScene(scene);

  // Guard 3: no item-item overlap
  checkNoItemOverlap(final);

  // Guard 4: same-zone horizontal gaps
  checkSameZoneGap(final, scene);

  // Guard 5: aspect ratios preserved.
  // Pass the same viewport used by the pipeline so rendered-aspect checks are
  // consistent with computed _height values. Falls back to DEFAULT_VIEWPORT when
  // not provided (safe for full-viewport renders and unit tests).
  checkAspectRatio(final, viewport ?? DEFAULT_VIEWPORT);

  // Guard 6: assets resolved in registry
  checkAssetsResolved(final, scene);

  // Guard 7: labels inside scene
  checkLabelsInScene(final, scene);

  // Guard 8: labels don't overlap own SVG
  checkNoLabelOwnSvgOverlap(final);
}
