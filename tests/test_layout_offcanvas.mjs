// Unit tests for the report-only per-item off-canvas classifier (WS-F).
// Covers src/scene_runtime/layout/diagnostics/offcanvas.ts: the per-item
// classification (fully off-canvas error vs partial-overflow warning), the
// magnitude-tier scaling, and the per-zone collector. Uses the tsx loader so we
// import the TS source directly. Run via:
//   node --import tsx --test tests/test_layout_offcanvas.mjs

import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFCANVAS_TIERS,
  offCanvasTier,
  classifyItemOffCanvas,
  collectOffCanvasDiagnostics,
} from "../src/scene_runtime/layout/diagnostics/offcanvas.ts";

//============================================
// Fixtures
//============================================

// A 0..100 scene-percent canvas, the engine convention.
const SCENE_BOUNDS = { left: 0, right: 100, top: 0, bottom: 100 };

// Build a minimal ComputedItem-shaped object carrying only the artwork-box
// fields the classifier reads. centerX/top/width/height are scene-percent.
function item(name, zone, centerX, top, width, height) {
  return {
    placement_name: name,
    zone,
    _centerX: centerX,
    _top: top,
    _visualWidth: width,
    _height: height,
  };
}

//============================================
// Per-item classification
//============================================

test("an item fully inside scene_bounds is not flagged", () => {
  const inside = item("flask", "bench", 50, 40, 20, 20);
  const finding = classifyItemOffCanvas(inside, SCENE_BOUNDS, "demo");
  assert.equal(finding, undefined);
});

test("an item that crosses an edge is a partial_overflow warning", () => {
  // Right edge at 105 escapes the right bound (100) by 5.
  const crossing = item("bottle", "bench", 95, 40, 20, 20);
  const finding = classifyItemOffCanvas(crossing, SCENE_BOUNDS, "demo");
  assert.ok(finding);
  assert.equal(finding.classification, "partial_overflow");
  assert.equal(finding.severity, "warning");
  assert.ok(finding.worstOverflow > 0);
  assert.equal(finding.overflow.right, 5);
  assert.equal(finding.scene, "demo");
  assert.equal(finding.zone, "bench");
  assert.equal(finding.placementName, "bottle");
});

test("an item whose whole box sits past an edge is a fully_off_canvas error", () => {
  // Left edge at 110, right edge at 130: entirely beyond the right bound.
  const offscreen = item("rack", "bench", 120, 40, 20, 20);
  const finding = classifyItemOffCanvas(offscreen, SCENE_BOUNDS, "demo");
  assert.ok(finding);
  assert.equal(finding.classification, "fully_off_canvas");
  assert.equal(finding.severity, "error");
  assert.ok(finding.worstOverflow > 0);
});

test("a box entirely above the canvas is fully_off_canvas (vertical axis)", () => {
  // top = -40, bottom = -20: entirely above the top bound (0).
  const above = item("tip", "bench", 50, -40, 20, 20);
  const finding = classifyItemOffCanvas(above, SCENE_BOUNDS, "demo");
  assert.ok(finding);
  assert.equal(finding.classification, "fully_off_canvas");
  assert.equal(finding.overflow.top, 40);
});

test("a hair past the edge (float noise) is not flagged", () => {
  // right edge at 100.0005, well under the float-noise slack.
  const noise = item("dish", "bench", 90.0005, 40, 20, 20);
  const finding = classifyItemOffCanvas(noise, SCENE_BOUNDS, "demo");
  assert.equal(finding, undefined);
});

//============================================
// Magnitude-tier scaling
//============================================

test("partial-overflow warning severity scales with overflow magnitude", () => {
  // A small overshoot lands at a tier no later than a large overshoot. The
  // ORDER is the contract, not the exact thresholds, so assert monotonicity by
  // comparing tier positions in OFFCANVAS_TIERS.
  const small = item("a", "bench", 99, 40, 20, 20); // right escapes by ~1
  const large = item("b", "bench", 110, 40, 20, 20); // right escapes by ~20

  const fSmall = classifyItemOffCanvas(small, SCENE_BOUNDS, "demo");
  const fLarge = classifyItemOffCanvas(large, SCENE_BOUNDS, "demo");
  assert.ok(fSmall && fLarge);
  assert.ok(fLarge.worstOverflow > fSmall.worstOverflow);

  const iSmall = OFFCANVAS_TIERS.indexOf(fSmall.tier);
  const iLarge = OFFCANVAS_TIERS.indexOf(fLarge.tier);
  assert.ok(iSmall >= 0 && iLarge >= 0);
  assert.ok(iLarge >= iSmall);
});

test("offCanvasTier is monotonic non-decreasing in magnitude", () => {
  const magnitudes = [0, 1, 1.9, 2, 5, 7.9, 8, 25, 100];
  let prevIndex = -1;
  for (const m of magnitudes) {
    const idx = OFFCANVAS_TIERS.indexOf(offCanvasTier(m));
    assert.ok(idx >= 0);
    assert.ok(idx >= prevIndex, `tier dropped at magnitude ${m}`);
    prevIndex = idx;
  }
});

//============================================
// Per-zone collector
//============================================

test("the collector flags only escaping items, in zone then item order", () => {
  const zones = [{ id: "left" }, { id: "right" }];
  const layouts = new Map([
    // left zone: one inside, one fully off the bottom.
    ["left", [item("inside_a", "left", 25, 40, 20, 20), item("below", "left", 25, 120, 20, 20)]],
    // right zone: one partial overflow on the right edge.
    ["right", [item("edge", "right", 95, 40, 20, 20)]],
  ]);

  const findings = collectOffCanvasDiagnostics(layouts, zones, SCENE_BOUNDS, "demo");
  // Two flagged items: the fully-off "below" and the partial "edge". The inside
  // item is absent.
  const names = findings.map((f) => f.placementName);
  assert.deepEqual(names, ["below", "edge"]);
  assert.equal(findings[0].classification, "fully_off_canvas");
  assert.equal(findings[1].classification, "partial_overflow");
});

test("the collector returns an empty list when no scene_bounds is given", () => {
  const zones = [{ id: "z" }];
  const layouts = new Map([["z", [item("x", "z", 120, 40, 20, 20)]]]);
  const findings = collectOffCanvasDiagnostics(layouts, zones, undefined, "demo");
  assert.deepEqual(findings, []);
});

test("the collector returns an empty list when every item is inside", () => {
  const zones = [{ id: "z" }];
  const layouts = new Map([
    ["z", [item("a", "z", 30, 30, 20, 20), item("b", "z", 70, 60, 20, 20)]],
  ]);
  const findings = collectOffCanvasDiagnostics(layouts, zones, SCENE_BOUNDS, "demo");
  assert.deepEqual(findings, []);
});
