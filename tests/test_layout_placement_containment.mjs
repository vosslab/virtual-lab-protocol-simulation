// Placement containment property test. Uses the tsx loader so the TS
// source imports directly. Run via:
//   node --import tsx --test tests/test_layout_placement_containment.mjs
//
// Locks the "Band-owned AABB containment invariant" documented in
// docs/specs/LAYOUT_ENGINE.md: every item's final placed object box is
// contained in its assigned computed band, and computed bands form a
// non-overlapping partition (same-horizontal-row membership; a spanning
// zone overlays the rows it crosses instead of fusing them).
//
// The scene below reproduces the reported bridge shape (a rear row, a tall
// center zone, and a bench row) from the plan's Context section: rear_left /
// rear_right form one row, left_bench / right_bench form another, and
// instrument_area spans the gap between them. rear_tip_box and
// left_microtube_rack are placed at the SAME x-column across the two rows,
// mirroring the exact real-scene pair whose 100% coincidence exposed the
// original transitive band-merge bug.

import test from "node:test";
import assert from "node:assert/strict";

import { reflowZones, verticalLayout } from "../src/scene_runtime/layout/index.ts";
import {
  collectItemOverlapDiagnostics,
  itemBbox,
} from "../src/scene_runtime/layout/diagnostics/item_overlap.ts";

const SCENE_BOUNDS = { left: 0, right: 100, top: 0, bottom: 100 };
// Float-noise tolerance for interval and containment comparisons, in the same
// scene-percent units the layout engine uses throughout.
const EPS = 1e-6;

// Build a minimal measured ComputedItem stub carrying only the fields the
// reflow and vertical-place stages read: placement_name / depth_tier (tier
// membership), _combinedHeight (the measured row extent, from measure-vertical),
// _centerX / _visualWidth (the horizontal placement, from place-horizontal),
// aspect (natural-height derivation), and layout.anchor_y (baseline back-solve).
// The .mjs test file is not type-checked, so a plain object stands in for the
// full ComputedItem.
function makeItem(name, depthTier, combinedHeight, centerX, visualWidth) {
  return {
    placement_name: name,
    depth_tier: depthTier,
    _combinedHeight: combinedHeight,
    _centerX: centerX,
    _visualWidth: visualWidth,
    aspect: 1,
    layout: { anchor_y: "bottom" },
  };
}

function makeZone(id, top, bottom) {
  return { id, bounds: { left: 5, right: 95, top, bottom } };
}

// The bridge shape from the plan's Context: rear row [5, 34], instrument_area
// [18, 92] spanning into the bench row [40, 92]. rear_tip_box (rear_left) and
// left_microtube_rack (left_bench) share centerX 25, the same x-column, so a
// transitive band fusion would land them at coincident coordinates.
function buildBridgeScene() {
  const zoneLayouts = new Map();
  zoneLayouts.set("rear_left", [makeItem("rear_tip_box", 0, 15, 25, 10)]);
  zoneLayouts.set("rear_right", [makeItem("rear_other", 0, 12, 70, 10)]);
  zoneLayouts.set("instrument_area", [makeItem("instrument_display", 0, 40, 48, 20)]);
  zoneLayouts.set("left_bench", [makeItem("left_microtube_rack", 0, 15, 25, 10)]);
  zoneLayouts.set("right_bench", [makeItem("right_other", 0, 12, 70, 10)]);

  const zones = [
    makeZone("rear_left", 5, 34),
    makeZone("rear_right", 5, 34),
    makeZone("instrument_area", 18, 92),
    makeZone("left_bench", 40, 92),
    makeZone("right_bench", 40, 92),
  ];
  return { zoneLayouts, zones };
}

test("placement pipeline: rear/bench cohorts resolve to distinct, non-overlapping intervals", () => {
  const { zoneLayouts, zones } = buildBridgeScene();
  const reflow = reflowZones(zoneLayouts, zones, SCENE_BOUNDS);

  const rearLeftBand = reflow.bands.get("rear_left");
  const rearRightBand = reflow.bands.get("rear_right");
  const instrumentBand = reflow.bands.get("instrument_area");
  const leftBenchBand = reflow.bands.get("left_bench");
  const rightBenchBand = reflow.bands.get("right_bench");
  assert.ok(
    rearLeftBand && rearRightBand && instrumentBand && leftBenchBand && rightBenchBand,
    "all five bands produced",
  );

  // The success signal is the INTERVAL, not the id: ComputedZoneBand.id is
  // always the zone's own id, so id equality proves nothing about fusion.
  // rear_left / rear_right (the rear row) share one interval.
  assert.ok(
    Math.abs(rearLeftBand.top - rearRightBand.top) < EPS &&
      Math.abs(rearLeftBand.bottom - rearRightBand.bottom) < EPS,
    "rear_left/rear_right resolve to one shared rear-cohort interval",
  );
  // left_bench / right_bench (the bench row) share a distinct interval.
  assert.ok(
    Math.abs(leftBenchBand.top - rightBenchBand.top) < EPS &&
      Math.abs(leftBenchBand.bottom - rightBenchBand.bottom) < EPS,
    "left_bench/right_bench resolve to one shared bench-cohort interval",
  );
  // The rear cohort interval and the bench cohort interval are distinct and
  // non-overlapping (stacked, rear above bench): the tall instrument_area no
  // longer bridges them into one band.
  assert.ok(
    rearLeftBand.bottom <= leftBenchBand.top + EPS,
    "rear cohort interval sits entirely above the bench cohort interval",
  );

  // instrument_area keeps its OWN spanning interval: it must not equal the
  // rear cohort's interval nor the bench cohort's interval (three distinct
  // intervals total, not one fused band across all five zones).
  assert.ok(
    Math.abs(instrumentBand.top - rearLeftBand.top) > EPS ||
      Math.abs(instrumentBand.bottom - rearLeftBand.bottom) > EPS,
    "instrument_area's interval is distinct from the rear cohort's",
  );
  assert.ok(
    Math.abs(instrumentBand.top - leftBenchBand.top) > EPS ||
      Math.abs(instrumentBand.bottom - leftBenchBand.bottom) > EPS,
    "instrument_area's interval is distinct from the bench cohort's",
  );
  // Sanity check that this scene actually reproduces the bridge shape: the
  // spanning interval genuinely crosses the rear/bench boundary (otherwise the
  // scene would not exercise the transitive-merge case at all).
  assert.ok(
    instrumentBand.top < rearLeftBand.bottom && instrumentBand.bottom > leftBenchBand.top,
    "instrument_area's interval crosses the rear/bench boundary",
  );
});

test("placement pipeline: every placed object box is contained in its own band", () => {
  const { zoneLayouts, zones } = buildBridgeScene();
  const reflow = reflowZones(zoneLayouts, zones, SCENE_BOUNDS);
  const placedByZone = verticalLayout(zoneLayouts, zones, reflow.bands);

  for (const zone of zones) {
    const band = reflow.bands.get(zone.id);
    assert.ok(band !== undefined, `band produced for zone ${zone.id}`);
    const items = placedByZone.get(zone.id) ?? [];
    assert.ok(items.length > 0, `items placed for zone ${zone.id}`);
    for (const item of items) {
      const bbox = itemBbox(item);
      assert.ok(
        bbox.top >= band.top - EPS,
        `${item.placement_name} top edge (${bbox.top}) is inside band ${zone.id} [${band.top}, ${band.bottom}]`,
      );
      assert.ok(
        bbox.bottom <= band.bottom + EPS,
        `${item.placement_name} bottom edge (${bbox.bottom}) is inside band ${zone.id} [${band.top}, ${band.bottom}]`,
      );
    }
  }
});

test("placement pipeline: no two placed objects overlap on both axes", () => {
  const { zoneLayouts, zones } = buildBridgeScene();
  const reflow = reflowZones(zoneLayouts, zones, SCENE_BOUNDS);
  const placedByZone = verticalLayout(zoneLayouts, zones, reflow.bands);

  // Flatten the final placed items across every zone, the same input shape
  // the engine's own cross-zone diagnostic consumes. rear_tip_box and
  // left_microtube_rack share an x-column but sit in distinct bands, so the
  // fix must keep them apart.
  const final = zones.flatMap((zone) => placedByZone.get(zone.id) ?? []);
  const diagnostics = collectItemOverlapDiagnostics(final);
  assert.equal(diagnostics.length, 0, "no cross-zone overlap once bands stay distinct per row");
});

test("collectItemOverlapDiagnostics: flags a seeded transitive-merge fusion", () => {
  // Simulate the PRE-FIX outcome directly: rear_tip_box and left_microtube_rack
  // are authored in different rows but land at the IDENTICAL placed box because
  // a transitively-fused band put them at the same tier cursor and x-column
  // (the reported "item overlaps ... by 100.0%" bug). This proves the
  // engine's own overlap check -- the same one the containment/no-overlap
  // tests above rely on -- actually catches this failure mode rather than
  // passing trivially when nothing is wrong.
  const fused = { top: 20, height: 15, centerX: 25, width: 10 };
  const rearTipBoxFused = {
    placement_name: "rear_tip_box",
    object_name: "tip_box",
    _centerX: fused.centerX,
    _visualWidth: fused.width,
    _top: fused.top,
    _height: fused.height,
  };
  const leftMicrotubeRackFused = {
    placement_name: "left_microtube_rack",
    object_name: "microtube_rack",
    _centerX: fused.centerX,
    _visualWidth: fused.width,
    _top: fused.top,
    _height: fused.height,
  };

  const diagnostics = collectItemOverlapDiagnostics([rearTipBoxFused, leftMicrotubeRackFused]);
  assert.equal(diagnostics.length, 1, "the fused pair is flagged as exactly one overlap");
  assert.equal(
    diagnostics[0].overflow_pct,
    100,
    "coincident boxes overlap 100%, matching the reported bug",
  );
  assert.deepEqual(
    diagnostics[0].between,
    ["rear_tip_box", "left_microtube_rack"],
    "the flagged pair names the two coincident placements",
  );
});
