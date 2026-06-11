// Unit tests for the zone-band reflow stage. Uses the tsx loader so the TS
// source imports directly. Run via:
//   node --import tsx --test tests/test_layout_reflow_zones.mjs
//
// reflowZones is tested standalone (no full pipeline): it takes the measured
// per-zone items (each with _combinedHeight), the authored zones, and the scene
// bounds rect, and returns the computed band per zone plus overflow / baseline
// clamp reports. The load-bearing properties:
//   - zones are placed in DEPTH ORDER (authored vertical order, scene top to
//     bottom), independent of the input array order;
//   - a zone's content extent is the PER-TIER-MAX SUM (a tier is one row as tall
//     as its tallest member), plus inter-row tier gaps and top+bottom padding,
//     NOT a union of every item height;
//   - leftover vertical range is distributed PROPORTIONALLY to authored band
//     height;
//   - an authored baseline is recomputed by the FRACTION formula relative to the
//     new band, clamped to [0, 1], and an out-of-range fraction is REPORTED.

import test from "node:test";
import assert from "node:assert/strict";

import { DEPTH_TIER_GAP, reflowZones, ZONE_PADDING } from "../src/scene_runtime/layout/index.ts";

// The canonical defaults reflowZones uses when a caller does not thread config.
// Imported from the barrel so a drift in the constants surfaces as a test failure.
const ZONE_PAD = ZONE_PADDING;
const TIER_GAP = DEPTH_TIER_GAP;

// Build a minimal measured ComputedItem stub carrying only the fields reflowZones
// reads: placement_name (ordering / tier membership), depth_tier (tier bucket),
// and _combinedHeight (the measured row extent). The .mjs test file is not
// type-checked, so a plain object stands in for the full ComputedItem.
function makeItem(name, depthTier, combinedHeight) {
  return { placement_name: name, depth_tier: depthTier, _combinedHeight: combinedHeight };
}

function makeZone(id, top, bottom, baseline) {
  const zone = { id, bounds: { left: 5, right: 95, top, bottom } };
  if (baseline !== undefined) zone.baseline = baseline;
  return zone;
}

// A 2-zone / 2-tier synthetic scene. scene_bounds top/bottom give a 100-unit
// reflow range. Zone "rear" authored [10, 40] (height 30) with baseline 25 at the
// band center; zone "front" authored [50, 90] (height 40) with no baseline.
//
// rear tier 0: two side-by-side items (8 and 12) -> row height 12 (the max).
// rear tier 1: one item (10) -> row height 10.
//   rear contentExtent = (12 + 10) + (2-1)*TIER_GAP + 2*ZONE_PAD = 22 + TIER_GAP + 2*ZONE_PAD.
// front tier 0: one item (14) -> row height 14.
// front tier 1: one item (6) -> row height 6.
//   front contentExtent = (14 + 6) + (2-1)*TIER_GAP + 2*ZONE_PAD = 20 + TIER_GAP + 2*ZONE_PAD.
const SCENE_BOUNDS = { left: 0, right: 100, top: 0, bottom: 100 };
const REAR_CONTENT = 22 + TIER_GAP + 2 * ZONE_PAD;
const FRONT_CONTENT = 20 + TIER_GAP + 2 * ZONE_PAD;

function buildLayout() {
  const layout = new Map();
  layout.set("rear", [
    makeItem("rear_t0_a", 0, 8),
    makeItem("rear_t0_b", 0, 12),
    makeItem("rear_t1_a", 1, 10),
  ]);
  layout.set("front", [makeItem("front_t0_a", 0, 14), makeItem("front_t1_a", 1, 6)]);
  return layout;
}

test("reflowZones: zone content extent is the per-tier-max sum, not a union", () => {
  const layout = buildLayout();
  const zones = [makeZone("rear", 10, 40, 25), makeZone("front", 50, 90)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  const front = result.bands.get("front");
  assert.ok(rear !== undefined && front !== undefined, "both bands produced");

  // Per-tier-max sum: rear tier 0 takes the MAX of (8, 12) = 12, not 8+12=20.
  // The content extent therefore reflects one row per tier, sized by its tallest
  // member, plus the inter-row gap and the top+bottom padding.
  assert.equal(rear.tiers.length, 2, "rear has two tier rows");
  assert.equal(rear.tiers[0].rowHeight, 12, "rear tier 0 row = max(8, 12)");
  assert.equal(rear.tiers[1].rowHeight, 10, "rear tier 1 row = 10");
  assert.equal(front.tiers[0].rowHeight, 14, "front tier 0 row = 14");
  assert.equal(front.tiers[1].rowHeight, 6, "front tier 1 row = 6");

  // totalContent folds both zones' per-tier-max content extents.
  assert.equal(result.totalContent, REAR_CONTENT + FRONT_CONTENT, "total = 29 + 27");
  assert.equal(result.overflow, false, "56 content fits the 100 range");

  // The two side-by-side tier-0 items are listed together in one row (one tier =
  // one row), in group_by_zone order (placement_name within the tier).
  assert.deepEqual(rear.tiers[0].placementNames, ["rear_t0_a", "rear_t0_b"]);
});

test("reflowZones: zones are placed in depth order regardless of input order", () => {
  const layout = buildLayout();
  // Pass the zones OUT of vertical order (front first) to prove the stage orders
  // by authored band top, not by input array order.
  const zones = [makeZone("front", 50, 90), makeZone("rear", 10, 40, 25)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  const front = result.bands.get("front");
  // The rear zone (authored top 10) bands above the front zone (authored top 50):
  // rear.top is the scene-range top and rear.bottom == front.top (bands stack with
  // no gap, top to bottom).
  assert.equal(rear.top, SCENE_BOUNDS.top, "rear band starts at the scene-range top");
  assert.ok(
    rear.bottom <= front.top + 1e-9 && rear.bottom >= front.top - 1e-9,
    "front follows rear",
  );
  assert.ok(rear.top < front.top, "rear is above front (depth order rear -> front)");
});

test("reflowZones: leftover range is distributed proportionally to authored band height", () => {
  const layout = buildLayout();
  const zones = [makeZone("rear", 10, 40, 25), makeZone("front", 50, 90)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  const front = result.bands.get("front");
  const rearHeight = rear.bottom - rear.top;
  const frontHeight = front.bottom - front.top;

  // Each band = its content extent + a proportional share of the leftover.
  const rearShare = rearHeight - REAR_CONTENT;
  const frontShare = frontHeight - FRONT_CONTENT;
  const sceneRange = SCENE_BOUNDS.bottom - SCENE_BOUNDS.top;
  const leftover = sceneRange - result.totalContent;

  // The two shares sum to the whole leftover (the band stack fills the range).
  assert.ok(Math.abs(rearShare + frontShare - leftover) < 1e-9, "shares sum to leftover");
  // Authored heights are 30 (rear) and 40 (front), so the leftover splits 30:40.
  // Assert the share RATIO equals the authored-height ratio (float-safe).
  assert.ok(Math.abs(rearShare / frontShare - 30 / 40) < 1e-9, "leftover split 30:40");
  // The full range is consumed: rear.top at range top, front.bottom at range bottom.
  assert.ok(Math.abs(rear.top - SCENE_BOUNDS.top) < 1e-9, "stack starts at range top");
  assert.ok(Math.abs(front.bottom - SCENE_BOUNDS.bottom) < 1e-9, "stack ends at range bottom");
});

test("reflowZones: authored baseline recomputed by the fraction formula", () => {
  const layout = buildLayout();
  // rear baseline 25 sits at the center of authored [10, 40] -> fraction 0.5.
  const zones = [makeZone("rear", 10, 40, 25), makeZone("front", 50, 90)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  const front = result.bands.get("front");
  // computedBaseline = computedTop + fraction * computedHeight; fraction = 0.5.
  const expectedRearBaseline = rear.top + 0.5 * (rear.bottom - rear.top);
  assert.ok(
    Math.abs(rear.baseline - expectedRearBaseline) < 1e-9,
    "fraction 0.5 maps to band center",
  );
  // front has no authored baseline -> band center.
  const expectedFrontBaseline = front.top + 0.5 * (front.bottom - front.top);
  assert.ok(
    Math.abs(front.baseline - expectedFrontBaseline) < 1e-9,
    "absent baseline uses the band center",
  );
  // No baseline fell outside its authored band, so nothing was clamped.
  assert.equal(result.baselineClamps.length, 0, "no baseline clamps for in-range baselines");
});

test("reflowZones: an out-of-band authored baseline clamps to [0, 1] and is reported", () => {
  const layout = buildLayout();
  // rear baseline 5 sits ABOVE the authored top 10 -> fraction (5-10)/30 < 0,
  // which clamps to 0 (the band top).
  const zones = [makeZone("rear", 10, 40, 5), makeZone("front", 50, 90)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  // Clamped fraction 0 maps the baseline onto the band top.
  assert.ok(Math.abs(rear.baseline - rear.top) < 1e-9, "fraction clamped to 0 -> band top");
  // The clamp is reported with the raw out-of-range fraction and the clamped value.
  assert.equal(result.baselineClamps.length, 1, "the out-of-band baseline is reported");
  const report = result.baselineClamps[0];
  assert.equal(report.zoneId, "rear");
  assert.ok(report.authoredFraction < 0, "raw fraction was below 0");
  assert.equal(report.clampedFraction, 0, "clamped to 0");
});

test("reflowZones: content over the scene range overflows and compresses to content extent", () => {
  const layout = buildLayout();
  const zones = [makeZone("rear", 10, 40, 25), makeZone("front", 50, 90)];
  // A tiny scene range (smaller than the 56-unit total content) forces overflow.
  const tightBounds = { left: 0, right: 100, top: 0, bottom: 40 };
  const result = reflowZones(layout, zones, tightBounds);

  assert.equal(result.overflow, true, "56 content over a 40 range overflows");
  const rear = result.bands.get("rear");
  const front = result.bands.get("front");
  // Overflow path: each band compresses to exactly its content extent (no
  // leftover share), stacked from the range top. WP-3b applies the uniform rescale.
  assert.ok(Math.abs(rear.bottom - rear.top - REAR_CONTENT) < 1e-9, "rear compressed to content");
  assert.ok(
    Math.abs(front.bottom - front.top - FRONT_CONTENT) < 1e-9,
    "front compressed to content",
  );
});

test("reflowZones: tier rows are placed top-to-bottom with padding and tier gap", () => {
  const layout = buildLayout();
  const zones = [makeZone("rear", 10, 40, 25), makeZone("front", 50, 90)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const rear = result.bands.get("rear");
  // First row starts at band.top + zonePad; the next row follows by rowHeight +
  // tierGap. rear tier 0 row height is 12.
  assert.ok(Math.abs(rear.tiers[0].rowTop - (rear.top + ZONE_PAD)) < 1e-9, "row 0 at top + pad");
  const expectedRow1Top = rear.top + ZONE_PAD + 12 + TIER_GAP;
  assert.ok(Math.abs(rear.tiers[1].rowTop - expectedRow1Top) < 1e-9, "row 1 = row0 + height + gap");
  // Tier order is ascending depth_tier (rear tier toward the band top).
  assert.equal(rear.tiers[0].depthTier, 0);
  assert.equal(rear.tiers[1].depthTier, 1);
});

test("reflowZones: side-by-side zones (same authored vband) share one computed band", () => {
  // Three zones authored at the SAME vertical extent [10, 30] are a horizontal row
  // (the horizontal stage spread them across the scene width). They MUST share one
  // vertical band, not stack into three bands. A single front zone [40, 60] forms a
  // second band below.
  const layout = new Map();
  // rear_a: one tier, row height 10. rear_b: one tier, row height 18 (the tallest,
  // so the shared rear band uses 18). rear_c: one tier, row height 6.
  layout.set("rear_a", [makeItem("rear_a_0", 0, 10)]);
  layout.set("rear_b", [makeItem("rear_b_0", 0, 18)]);
  layout.set("rear_c", [makeItem("rear_c_0", 0, 6)]);
  layout.set("front", [makeItem("front_0", 0, 12)]);
  const zones = [
    makeZone("rear_a", 10, 30),
    makeZone("rear_b", 10, 30),
    makeZone("rear_c", 10, 30),
    makeZone("front", 40, 60),
  ];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const a = result.bands.get("rear_a");
  const b = result.bands.get("rear_b");
  const c = result.bands.get("rear_c");
  const front = result.bands.get("front");
  assert.ok(a && b && c && front, "all four bands produced");

  // The three side-by-side zones get the IDENTICAL computed band (same top/bottom):
  // they share one vertical band, they do not stack.
  assert.ok(Math.abs(a.top - b.top) < 1e-9 && Math.abs(b.top - c.top) < 1e-9, "rear tops equal");
  assert.ok(
    Math.abs(a.bottom - b.bottom) < 1e-9 && Math.abs(b.bottom - c.bottom) < 1e-9,
    "rear bottoms equal",
  );
  // The shared rear band starts at the scene-range top.
  assert.ok(Math.abs(a.top - SCENE_BOUNDS.top) < 1e-9, "rear band at the scene-range top");
  // The front zone bands BELOW the shared rear band (depth order rear -> front).
  assert.ok(front.top >= a.bottom - 1e-9, "front follows the shared rear band");

  // totalContent counts the rear ROW ONCE (the tallest member, 18 + 2*ZONE_PAD),
  // not three stacked zones. rear group content = 18 + 2*1.5 = 21; front = 12 + 3 =
  // 15; total = 36, well under the 100 range -> no overflow. If the stacking bug
  // were present, total would be ~21*3 + 15 and the scene would falsely overflow.
  const REAR_GROUP_CONTENT = 18 + 2 * ZONE_PAD;
  const FRONT_CONTENT = 12 + 2 * ZONE_PAD;
  assert.ok(
    Math.abs(result.totalContent - (REAR_GROUP_CONTENT + FRONT_CONTENT)) < 1e-9,
    `total counts the rear row once: ${result.totalContent} vs ${REAR_GROUP_CONTENT + FRONT_CONTENT}`,
  );
  assert.equal(result.overflow, false, "grouped content fits; no false overflow from stacking");
});

test("reflowZones: partially overlapping authored bands merge into one vertical band", () => {
  // A center band [38, 76] and a front band [72, 94] overlap by 4 units (the real
  // sdspage layout). They must merge into one vertical band group so the front zone
  // is not stacked below the center, which would push it off-screen. A separate
  // rear band [5, 30] sits cleanly above.
  const layout = new Map();
  layout.set("rear", [makeItem("rear_0", 0, 8)]);
  layout.set("center", [makeItem("center_0", 0, 20)]);
  layout.set("front", [makeItem("front_0", 0, 10)]);
  const zones = [makeZone("rear", 5, 30), makeZone("center", 38, 76), makeZone("front", 72, 94)];
  const result = reflowZones(layout, zones, SCENE_BOUNDS);

  const center = result.bands.get("center");
  const front = result.bands.get("front");
  // The overlapping center/front zones share one band (identical top/bottom).
  assert.ok(Math.abs(center.top - front.top) < 1e-9, "overlapping bands share a top");
  assert.ok(Math.abs(center.bottom - front.bottom) < 1e-9, "overlapping bands share a bottom");
  // The merged band's content extent is the MAX member (center 20), counted once.
  const rear = result.bands.get("rear");
  assert.ok(rear.bottom <= center.top + 1e-9, "rear bands above the merged center/front band");
});
