// Tests for the M4/WP-LABEL1 global label de-overlap (resolveLabelCollisions).
// Uses the tsx loader to import the TS source directly. Run via:
//   node --import tsx --test tests/test_layout_label_resolve.mjs
//
// resolveLabelCollisions mutates each ComputedItem's _labelX/_labelY in place to
// clear label-vs-artwork and label-vs-label overlaps, and returns severity
// diagnostics for the end-state classification. Artwork boxes (object placement
// geometry) are obstacles and never move.

import test from "node:test";
import assert from "node:assert/strict";

import { resolveLabelCollisions, buildGlobalDefaults } from "../src/scene_runtime/layout/index.ts";
import { detectCollision } from "../src/scene_runtime/layout/geometry/collision.ts";

// ── Helpers ──────────────────────────────────────────────────────────

// A minimal ComputedItem carrying just the fields the label resolver reads:
// artwork box (_x/_top/_visualWidth/_height), label position (_labelX/_labelY),
// wrapped lines, and the label_width budget.
function item(name, opts) {
  return {
    placement_name: name,
    object_name: name,
    zone: opts.zone ?? "z",
    _x: opts.x,
    _top: opts.top,
    _visualWidth: opts.w,
    _height: opts.h,
    _labelX: opts.labelX ?? opts.x,
    _labelY: opts.labelY ?? opts.top + opts.h + 3.5,
    _labelLines: opts.lines ?? [name],
    layout: { label_width: opts.labelWidth ?? 8 },
    // Remaining ComputedItem fields are not read by the resolver.
    _scale: 1,
    _y: opts.top,
    _footprint: opts.w,
    _width_scale: 1,
    depth_tier: 0,
  };
}

// The effective label AABB the resolver uses (mirror of effectiveLabelHalfWidth +
// labelAabb so a test can assert clearance independently).
function labelBox(it, cfg) {
  let maxLen = 0;
  for (const l of it._labelLines) if (l.length > maxLen) maxLen = l.length;
  const textWidth = maxLen * cfg.avgCharWidthPct;
  const half = Math.max(it.layout.label_width, textWidth) / 2;
  const lineH = cfg.labelLineHeightPct * Math.max(1, it._labelLines.length);
  return { x: it._labelX - half, y: it._labelY, w: half * 2, h: lineH };
}
function artBox(it) {
  return { x: it._x - it._visualWidth / 2, y: it._top, w: it._visualWidth, h: it._height };
}

// Build the labelled map (one zone) the resolver consumes.
function mapOf(items, zoneId = "z") {
  return new Map([[zoneId, items]]);
}

const ROOMY_ZONE = { id: "z", bounds: { left: 0, right: 100, top: 0, bottom: 100 } };

// ── Tests ────────────────────────────────────────────────────────────

test("resolveLabelCollisions: clean scene leaves every label untouched", () => {
  const cfg = buildGlobalDefaults();
  // Two objects far apart; neither label touches the other's artwork or label.
  const a = item("a", { x: 10, top: 10, w: 6, h: 8 });
  const b = item("b", { x: 60, top: 10, w: 6, h: 8 });
  const beforeA = { x: a._labelX, y: a._labelY };
  const beforeB = { x: b._labelX, y: b._labelY };
  const diags = resolveLabelCollisions(mapOf([a, b]), [ROOMY_ZONE], "clean", [], cfg);
  assert.equal(a._labelX, beforeA.x);
  assert.equal(a._labelY, beforeA.y);
  assert.equal(b._labelX, beforeB.x);
  assert.equal(b._labelY, beforeB.y);
  assert.equal(diags.length, 0);
});

test("resolveLabelCollisions: a label over a neighbor's artwork is moved clear", () => {
  const cfg = buildGlobalDefaults();
  // Object `tall` has a wide, tall artwork box. `lbl_owner`'s label is placed
  // directly on top of tall's artwork; the resolver must move it clear.
  const tall = item("tall", { x: 30, top: 5, w: 20, h: 40 });
  const owner = item("owner", { x: 30, top: 50, w: 4, h: 6, labelX: 30, labelY: 20 });
  // Precondition: the label starts overlapping tall's artwork.
  const before = detectCollision(labelBox(owner, cfg), "L", artBox(tall), "A");
  assert.ok(before !== null, "fixture must start with the label over the artwork");
  resolveLabelCollisions(mapOf([tall, owner]), [ROOMY_ZONE], "art", [], cfg);
  const after = detectCollision(labelBox(owner, cfg), "L", artBox(tall), "A");
  assert.equal(after, null, "label must be clear of the artwork after resolve");
});

test("resolveLabelCollisions: identical input yields identical label coords (determinism)", () => {
  const cfg = buildGlobalDefaults();
  function buildScene() {
    return [
      item("big", { x: 25, top: 5, w: 18, h: 38 }),
      item("p1", { x: 22, top: 48, w: 4, h: 6, labelX: 22, labelY: 18, lines: ["p1 long"] }),
      item("p2", { x: 30, top: 48, w: 4, h: 6, labelX: 30, labelY: 18, lines: ["p2 long"] }),
      item("p3", { x: 14, top: 48, w: 4, h: 6, labelX: 14, labelY: 18 }),
    ];
  }
  const run1 = buildScene();
  const run2 = buildScene();
  resolveLabelCollisions(mapOf(run1), [ROOMY_ZONE], "det", [], cfg);
  resolveLabelCollisions(mapOf(run2), [ROOMY_ZONE], "det", [], cfg);
  for (let i = 0; i < run1.length; i++) {
    assert.equal(run1[i]._labelX, run2[i]._labelX, `${run1[i].placement_name} x differs`);
    assert.equal(run1[i]._labelY, run2[i]._labelY, `${run1[i].placement_name} y differs`);
  }
});

test("resolveLabelCollisions: unresolvable overlap emits an unresolved_label_overlap Error", () => {
  const cfg = buildGlobalDefaults();
  // A label fully inside a giant artwork box, in a tiny zone with no horizontal
  // room to nudge clear and no vertical room to drop clear: the artwork overlap
  // survives the pass budget and must raise an Error.
  const tinyZone = { id: "z", bounds: { left: 0, right: 10, top: 0, bottom: 6 } };
  const blob = item("blob", { x: 5, top: 0, w: 40, h: 40 });
  const owner = item("owner", { x: 5, top: 0, w: 1, h: 1, labelX: 5, labelY: 3, labelWidth: 4 });
  const diags = resolveLabelCollisions(mapOf([blob, owner]), [tinyZone], "tight", [], cfg);
  const errors = diags.filter((d) => d.code === "unresolved_label_overlap");
  assert.ok(errors.length >= 1, "a surviving overlap must raise an Error");
  const err = errors[0];
  assert.equal(err.severity, "Error");
  assert.equal(err.failBuild, true);
  assert.equal(err.pointer.scene_name, "tight");
  assert.equal(err.pointer.zone_name, "z");
  // The actionable payload names the involved labels and the remaining overlap.
  assert.ok(err.payload.involvedItems.length >= 1);
  assert.ok(err.payload.remainingOverlapDepth > 0);
  assert.ok(Array.isArray(err.payload.attemptedMoves));
});

test("resolveLabelCollisions: artwork avoidance has priority over label spacing", () => {
  const cfg = buildGlobalDefaults();
  // `owner`'s label sits over `block` artwork AND beside `peer`'s label. The
  // resolver must clear the artwork (priority) even if that requires moving the
  // label; after resolve the label must not overlap the artwork.
  const block = item("block", { x: 20, top: 5, w: 16, h: 30 });
  const peer = item("peer", { x: 45, top: 40, w: 4, h: 6, labelX: 45, labelY: 15 });
  const owner = item("owner", { x: 20, top: 40, w: 4, h: 6, labelX: 20, labelY: 15 });
  resolveLabelCollisions(mapOf([block, peer, owner]), [ROOMY_ZONE], "prio", [], cfg);
  const overArt = detectCollision(labelBox(owner, cfg), "L", artBox(block), "A");
  assert.equal(overArt, null, "owner label must be clear of block artwork");
});
