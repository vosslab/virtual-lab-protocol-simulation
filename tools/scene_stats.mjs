// Scene render-yield stats.
//
// computeSceneStats() reports not only what rendered, but what VANISHED: it
// compares the source placements declared in generated/scene_manifest.json
// against the items the browser actually rendered, so a coder can see drops.
//
// SCOPE (WS-M2-B): only easy-to-implement stats land here -- a direct count, a
// divide, or a single bbox check against sceneRootBbox. Anything that needs new
// capture infra or nontrivial geometry (browser-event counts, exact rectangle
// union, severe-overlap/occlusion, stability across runs, balance, zone
// coverage, contrast, interaction-readiness) is deferred to docs/ROADMAP.md and
// is intentionally NOT computed here.
//
// percent_empty_approx is a NAIVE coverage estimate: 1 - (sum of item areas /
// scene area), clamped to [0, 100]. Overlapping items double-count their area,
// so the sum can exceed the scene area and the "empty" estimate is an
// over/undercount, never an exact rectangle union. Named _approx for that
// reason; exact union is deferred.

import { bboxsOverlap } from "./bbox_helpers.mjs";

//============================================
// Input shapes (documented, not enforced)
//============================================

// manifestEntry: one entry from generated/scene_manifest.json:
//   { name, outcome: "emitted"|"skipped", reason: string|null,
//     source_placement_count: int, source_placement_names: string[] }
//
// renderedItems: array of rendered placement records collected by the CLI
// (WS-M2-A/C populates this from DOM queries). Each item:
//   { placementName: string,
//     objectName: string|null,
//     zone: string|null,
//     kind: string|null,
//     depth: number|null,
//     bbox: { x, y, width, height } | null,
//     isPlaceholder: boolean,
//     placeholderKind: "missing-svg" | "missing-object" | null }
//
// labels: array of { bbox: {x,y,width,height}|null, text: string } (label
// readability stats are deferred; labels are accepted for symmetry and a count).
//
// sceneRootBbox: { x, y, width, height } -- the #scene-root bounding box.

//============================================
// Tuning constants (hardcoded, not flags)
//============================================

// A populated scene whose naive coverage is below this is flagged near-empty.
// Advisory only; gates no milestone. Threshold value is a WS-M2-B decision.
const NEAR_EMPTY_COVERAGE_PERCENT = 5;

// An item whose rendered area is at or below this many square px is "tiny".
const TINY_ITEM_AREA_PX = 100;

//============================================
// Small numeric helpers
//============================================

// Clamps a number into [min, max].
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Rounds to one decimal place for stable, human-readable percentages.
function round1(value) {
  return Math.round(value * 10) / 10;
}

// Area of a bbox, or 0 when the bbox is missing.
function bboxArea(bbox) {
  if (!bbox) return 0;
  return bbox.width * bbox.height;
}

//============================================
// Layout checks (single bbox vs sceneRootBbox)
//============================================

// True when item is entirely outside the scene root (no overlap at all).
function isFullyOffscreen(itemBbox, sceneRootBbox) {
  if (!itemBbox || !sceneRootBbox) return false;
  return !bboxsOverlap(itemBbox, sceneRootBbox, 0);
}

// True when the item overlaps the scene root but is not fully contained
// (some part is clipped by the scene edge). Fully-offscreen items are reported
// separately and are not also counted as clipped.
function isClipped(itemBbox, sceneRootBbox) {
  if (!itemBbox || !sceneRootBbox) return false;
  if (isFullyOffscreen(itemBbox, sceneRootBbox)) return false;
  const withinLeft = itemBbox.x >= sceneRootBbox.x;
  const withinTop = itemBbox.y >= sceneRootBbox.y;
  const withinRight = itemBbox.x + itemBbox.width <= sceneRootBbox.x + sceneRootBbox.width;
  const withinBottom = itemBbox.y + itemBbox.height <= sceneRootBbox.y + sceneRootBbox.height;
  const fullyContained = withinLeft && withinTop && withinRight && withinBottom;
  return !fullyContained;
}

//============================================
// Count and yield section
//============================================

// Builds the counts section: source vs rendered, drops, yield, placeholders.
function computeCounts(manifestEntry, renderedItems) {
  const sourcePlacementCount = manifestEntry.source_placement_count;
  const sourceNames = manifestEntry.source_placement_names;

  const renderedPlacementCount = renderedItems.length;
  const droppedPlacementCount = Math.max(0, sourcePlacementCount - renderedPlacementCount);

  // Dropped names: source placement names not present among rendered items.
  // Only meaningful when the manifest actually carries source names.
  const renderedNameSet = new Set(renderedItems.map((item) => item.placementName));
  const droppedPlacementNames = sourceNames.filter((name) => !renderedNameSet.has(name));

  // Render yield: rendered / source, as a percent. A source count of zero
  // yields 100% by convention (nothing to render, nothing dropped).
  let renderYieldPercent;
  if (sourcePlacementCount === 0) {
    renderYieldPercent = 100;
  } else {
    renderYieldPercent = round1((renderedPlacementCount / sourcePlacementCount) * 100);
  }

  const placeholderItemCount = renderedItems.filter((item) => item.isPlaceholder).length;
  const realItemCount = renderedPlacementCount - placeholderItemCount;

  let placeholderFraction;
  if (renderedPlacementCount === 0) {
    placeholderFraction = 0;
  } else {
    placeholderFraction = round1(placeholderItemCount / renderedPlacementCount);
  }

  const counts = {
    source_placement_count: sourcePlacementCount,
    rendered_placement_count: renderedPlacementCount,
    dropped_placement_count: droppedPlacementCount,
    dropped_placement_names: droppedPlacementNames,
    render_yield_percent: renderYieldPercent,
    real_item_count: realItemCount,
    placeholder_item_count: placeholderItemCount,
    placeholder_fraction: placeholderFraction,
  };
  return counts;
}

//============================================
// Missing-asset name collection
//============================================

// Collects object names for placeholders by placeholder kind.
function computeMissingNames(renderedItems) {
  const missingObjectNames = [];
  const missingSvgNames = [];
  for (const item of renderedItems) {
    if (!item.isPlaceholder) continue;
    // Prefer the object name; fall back to placement name when absent.
    const label = item.objectName || item.placementName;
    if (item.placeholderKind === "missing-object") {
      missingObjectNames.push(label);
    } else if (item.placeholderKind === "missing-svg") {
      missingSvgNames.push(label);
    }
  }
  return { missingObjectNames, missingSvgNames };
}

//============================================
// Layout section
//============================================

// Builds the layout section: coverage, overlaps, clipping, offscreen, tiny.
function computeLayout(renderedItems, sceneRootBbox) {
  const sceneArea = bboxArea(sceneRootBbox);

  // Naive coverage: sum of item areas over scene area. Overlaps double-count.
  let summedItemArea = 0;
  for (const item of renderedItems) {
    summedItemArea += bboxArea(item.bbox);
  }
  let percentEmptyApprox;
  if (sceneArea === 0) {
    // No scene area to divide by; report fully empty rather than divide by zero.
    percentEmptyApprox = 100;
  } else {
    const coverageFraction = summedItemArea / sceneArea;
    percentEmptyApprox = round1(clamp((1 - coverageFraction) * 100, 0, 100));
  }

  // Pairwise overlap count using the shared helper.
  let overlapPairCount = 0;
  for (let i = 0; i < renderedItems.length; i++) {
    for (let j = i + 1; j < renderedItems.length; j++) {
      const a = renderedItems[i].bbox;
      const b = renderedItems[j].bbox;
      if (!a || !b) continue;
      if (bboxsOverlap(a, b, 0)) overlapPairCount++;
    }
  }

  let clippedItemCount = 0;
  let fullyOffscreenItemCount = 0;
  let tinyItemCount = 0;
  for (const item of renderedItems) {
    if (isFullyOffscreen(item.bbox, sceneRootBbox)) {
      fullyOffscreenItemCount++;
    } else if (isClipped(item.bbox, sceneRootBbox)) {
      clippedItemCount++;
    }
    if (item.bbox && bboxArea(item.bbox) <= TINY_ITEM_AREA_PX) {
      tinyItemCount++;
    }
  }

  const layout = {
    percent_empty_approx: percentEmptyApprox,
    overlap_pair_count: overlapPairCount,
    clipped_item_count: clippedItemCount,
    fully_offscreen_item_count: fullyOffscreenItemCount,
    tiny_item_count: tinyItemCount,
    label_count: 0,
  };
  return layout;
}

//============================================
// Classification (mutually exclusive categories)
//============================================

// Returns one of: populated | placeholder-only | empty.
// "load-failed" is set by the caller when the page threw before render; it is
// passed in via opts.loadFailed. "skipped" is set by the caller from the
// manifest, never computed here.
function classifyScene(counts, loadFailed) {
  if (loadFailed) return "load-failed";
  if (counts.rendered_placement_count === 0) return "empty";
  if (counts.real_item_count === 0) return "placeholder-only";
  return "populated";
}

//============================================
// Advisory flags (orthogonal, can stack)
//============================================

// near-empty: a populated scene whose naive coverage is below threshold.
// degraded: renders real items but drops source placements or has missing assets.
function computeAdvisoryFlags(category, counts, layout, missing) {
  const flags = [];

  const isNearEmpty =
    category === "populated" && 100 - layout.percent_empty_approx < NEAR_EMPTY_COVERAGE_PERCENT;
  if (isNearEmpty) flags.push("near-empty");

  const hasMissingAssets =
    missing.missingObjectNames.length > 0 || missing.missingSvgNames.length > 0;
  const isDegraded =
    counts.real_item_count > 0 && (counts.dropped_placement_count > 0 || hasMissingAssets);
  if (isDegraded) flags.push("degraded");

  return flags;
}

//============================================
// Pass/fail verdict (raw stats are primary; NO single quality score)
//============================================

function computePassFail(category, counts, missing) {
  const renders = category === "populated" || category === "placeholder-only";
  const noDroppedPlacements = counts.dropped_placement_count === 0;
  const noMissingAssets =
    missing.missingObjectNames.length === 0 && missing.missingSvgNames.length === 0;
  return {
    renders,
    no_dropped_placements: noDroppedPlacements,
    no_missing_assets: noMissingAssets,
  };
}

//============================================
// Public entry point
//============================================

// Computes the full structured stats object for one scene.
//
// args:
//   sceneName: string
//   manifestEntry: manifest row (see shape note above)
//   renderedItems: array of rendered item records (see shape note above)
//   labels: array of label records (see shape note above)
//   sceneRootBbox: { x, y, width, height } | null
//   loadFailed: optional boolean -- true when the page threw before render
//
// Returns a STRUCTURED object with sections: identity, classification, counts,
// layout, flags, pass_fail.
export function computeSceneStats({
  sceneName,
  manifestEntry,
  renderedItems,
  labels,
  sceneRootBbox,
  loadFailed = false,
}) {
  const items = renderedItems || [];
  const labelList = labels || [];

  const counts = computeCounts(manifestEntry, items);
  const missing = computeMissingNames(items);
  const layout = computeLayout(items, sceneRootBbox);
  layout.label_count = labelList.length;

  const category = classifyScene(counts, loadFailed);
  const advisoryFlags = computeAdvisoryFlags(category, counts, layout, missing);
  const passFail = computePassFail(category, counts, missing);

  const stats = {
    identity: {
      scene_name: sceneName,
      outcome: manifestEntry.outcome,
      reason: manifestEntry.reason,
    },
    classification: {
      category: category,
    },
    counts: counts,
    layout: layout,
    flags: {
      advisory_flags: advisoryFlags,
      missing_object_names: missing.missingObjectNames,
      missing_svg_names: missing.missingSvgNames,
    },
    pass_fail: passFail,
  };
  return stats;
}
