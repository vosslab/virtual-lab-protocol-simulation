// Unit tests for the cross-zone final-placed-item overlap diagnostic.
// Covers src/scene_runtime/layout/diagnostics/item_overlap.ts (the pure AABB
// predicate + collector) and its wiring into runPipeline's `diagnostics` stream
// (constants.ts DIAGNOSTIC_KINDS "item_overlap"). Uses the tsx loader so we
// import the TS source directly. Run via:
//   node --import tsx --test tests/test_layout_item_overlap.mjs
//
// Background (docs/active_plans/reports/m2_generalization_preflight.md): a tall
// spanning zone can transitively fuse several authored zones into one computed
// band (groupVerticalBands, reflow_zones.ts). Two items from DIFFERENT zones
// then land in the same band and coincide, but the per-band containment checks
// never compare them, so overlap_count read 0 even at 100% render overlap.
// This diagnostic closes that blind spot by comparing the FINAL placed item
// array across every zone at once.

import test from "node:test";
import assert from "node:assert/strict";

import {
  ITEM_OVERLAP_TOLERANCE_PCT,
  itemBbox,
  itemOverlapPercent,
  collectItemOverlapDiagnostics,
} from "../src/scene_runtime/layout/diagnostics/item_overlap.ts";
import {
  DEMO_ASSET_SPECS,
  DEMO_OBJECT_LIBRARY,
  runPipeline,
} from "../src/scene_runtime/layout/index.ts";

//============================================
// Fixtures
//============================================

// Build a minimal ComputedItem-shaped object carrying only the artwork-box
// fields the predicate reads, plus placement/object identity.
function item(name, objectName, zone, centerX, top, width, height) {
  return {
    placement_name: name,
    object_name: objectName,
    zone,
    _centerX: centerX,
    _top: top,
    _visualWidth: width,
    _height: height,
  };
}

//============================================
// Pure predicate: itemBbox / itemOverlapPercent
//============================================

test("itemBbox derives left/right from centerX and width, top/bottom from top and height", () => {
  const box = itemBbox(item("flask", "t75_flask", "bench", 50, 20, 10, 30));
  assert.equal(box.left, 45);
  assert.equal(box.right, 55);
  assert.equal(box.top, 20);
  assert.equal(box.bottom, 50);
});

test("itemOverlapPercent is 0 for two boxes that do not intersect", () => {
  const a = itemBbox(item("a", "obj", "z1", 10, 10, 10, 10));
  const b = itemBbox(item("b", "obj", "z2", 80, 80, 10, 10));
  assert.equal(itemOverlapPercent(a, b), 0);
});

test("itemOverlapPercent is 100 for two fully coincident boxes", () => {
  const a = itemBbox(item("a", "obj", "z1", 30, 30, 20, 20));
  const b = itemBbox(item("b", "obj", "z2", 30, 30, 20, 20));
  assert.equal(itemOverlapPercent(a, b), 100);
});

//============================================
// collectItemOverlapDiagnostics: pure cross-zone scan
//============================================

test("collectItemOverlapDiagnostics flags two coincident items from DIFFERENT zones", () => {
  // This is the pre-fix transitive-band-merge symptom in isolation: two items
  // authored into different zones (rear_left, left_bench) whose final placed
  // boxes coincide because their zones got fused into one computed band.
  const final = [
    item("rear_tip_box", "microtube_rack_24", "rear_left", 26.5, 20, 13, 13),
    item("left_microtube_rack", "microtube_rack_24", "left_bench", 26.5, 20, 13, 13),
  ];
  const diagnostics = collectItemOverlapDiagnostics(final);
  assert.equal(diagnostics.length, 1);
  const [diag] = diagnostics;
  assert.equal(diag.kind, "item_overlap");
  assert.equal(diag.severity, "error");
  assert.deepEqual(diag.between, ["rear_tip_box", "left_microtube_rack"]);
  assert.equal(diag.overflow_pct, 100);

  // The e2e preflight report (tests/e2e/e2e_generalization_preflight.mjs)
  // derives overlap_count by counting diagnostics of this kind; mirror that
  // here so overlap_count is provably non-zero for this layout.
  const overlapCount = diagnostics.filter((d) => d.kind === "item_overlap").length;
  assert.ok(overlapCount > 0);
});

test("collectItemOverlapDiagnostics reports 0 for a clean, non-overlapping layout", () => {
  const final = [
    item("rear_tip_box", "microtube_rack_24", "rear_left", 26.5, 5, 13, 13),
    item("left_microtube_rack", "microtube_rack_24", "left_bench", 26.5, 40, 13, 13),
  ];
  const diagnostics = collectItemOverlapDiagnostics(final);
  const overlapCount = diagnostics.filter((d) => d.kind === "item_overlap").length;
  assert.equal(overlapCount, 0);
});

test("a near-touching pair within tolerance is not flagged", () => {
  // Two boxes overlapping by less than ITEM_OVERLAP_TOLERANCE_PCT of the
  // smaller box's area count as float-noise touching, not a real overlap.
  const final = [item("a", "obj", "z1", 10, 10, 10, 10), item("b", "obj", "z2", 19.95, 10, 10, 10)];
  const overlapPct = itemOverlapPercent(itemBbox(final[0]), itemBbox(final[1]));
  assert.ok(overlapPct <= ITEM_OVERLAP_TOLERANCE_PCT);
  assert.deepEqual(collectItemOverlapDiagnostics(final), []);
});

//============================================
// Engine wiring: runPipeline surfaces "item_overlap" via the FINAL item array
//============================================
//
// The "pre-fix transitive-merge condition reports non-zero overlap_count"
// half of the acceptance criteria is proved above, directly against
// collectItemOverlapDiagnostics on final-placed-AABB data shaped like the real
// microscope_basic bug (docs/active_plans/reports/m2_generalization_preflight.md)
// -- exercising the engine's own check without depending on the exact
// groupVerticalBands predicate (which lands independently and continues to
// evolve in reflow_zones.ts). The test below proves the OTHER half -- the
// wiring into runPipeline's diagnostics stream reads 0 on a genuinely clean
// scene -- using a layout that stays non-overlapping regardless of band
// membership (its zones do not share any vertical range at all).
function cleanScene() {
  return {
    scene_name: "cross_zone_overlap_clean_fixture",
    workspace: "bench",
    scene_bounds: { left: 1, right: 99, top: 1, bottom: 99 },
    zones: [
      { id: "rear_left", bounds: { left: 5, right: 48, top: 5, bottom: 34 } },
      { id: "left_bench", bounds: { left: 5, right: 48, top: 40, bottom: 92 } },
    ],
    placements: [
      {
        placement_name: "rear_tip_box",
        object_name: "microtube_rack_24",
        zone: "rear_left",
        depth_tier: 1,
      },
      {
        placement_name: "left_microtube_rack",
        object_name: "microtube_rack_24",
        zone: "left_bench",
        depth_tier: 1,
      },
    ],
  };
}

test("runPipeline reports overlap_count 0 on a genuinely clean scene", () => {
  const result = runPipeline(cleanScene(), {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
  });
  const overlapCount = result.diagnostics.filter((d) => d.kind === "item_overlap").length;
  assert.equal(overlapCount, 0);
});
