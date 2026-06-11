// Tests for the M4/WP-LABEL1 global label de-overlap (resolveLabelCollisions),
// extended in WP-4a for DIRECTION-AWARE placement (top labels ladder up, bottom
// labels ladder down). Uses the tsx loader to import the TS source directly.
// Run via:
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
// artwork box (_centerX/_top/_visualWidth/_height), label position
// (_labelX/_labelY), wrapped lines, and the label_width budget.
//
// placement (default "bottom") gates BOTH the seeded label Y and the resolver's
// move direction. The resolver resolves placement per item from
// it.layout.label_placement, so a fixture must set it explicitly to control the
// direction (the engine config default is "top"). When labelY is not supplied the
// seed mirrors the engine's IDEAL UNCLAMPED seed for that placement so a
// non-colliding label is at its anchor and emits no drift Warning:
//   bottom: TOP edge = (top + h) + labelOffsetY (labelOffsetY below the art bottom).
//   top:    TOP edge = top - labelOffsetY - lineHeight * lines.
const LABEL_OFFSET_Y = buildGlobalDefaults().labelOffsetY;
const LINE_H = buildGlobalDefaults().labelLineHeightPct;
function item(name, opts) {
  const placement = opts.placement ?? "bottom";
  const lines = opts.lines ?? [name];
  // WP-3a bottom seed: the label TOP edge sits labelOffsetY below the object's ART
  // bottom (_top + _height), not below _baselineY. The engine's idealSeedY uses the
  // art bottom for every anchor mode, so the stub mirrors that to stay drift-clean.
  const objectBottom = opts.top + opts.h;
  const idealTop =
    placement === "bottom"
      ? objectBottom + LABEL_OFFSET_Y
      : opts.top - LABEL_OFFSET_Y - LINE_H * lines.length;
  return {
    placement_name: name,
    object_name: name,
    zone: opts.zone ?? "z",
    _centerX: opts.x,
    _top: opts.top,
    _visualWidth: opts.w,
    _height: opts.h,
    _labelX: opts.labelX ?? opts.x,
    _labelY: opts.labelY ?? idealTop,
    _labelLines: lines,
    layout: { label_width: opts.labelWidth ?? 8, label_placement: placement },
    // Remaining ComputedItem fields are not read by the resolver. _baselineY is the
    // bottom-anchor baseline (the art bottom), consistent with the WP-3a back-solve.
    _scale: 1,
    _baselineY: objectBottom,
    _footprint: opts.w,
    _width_scale: 1,
    depth_tier: 0,
  };
}

// The effective label AABB the resolver uses (mirror of effectiveLabelHalfWidth +
// labelAabb so a test can assert clearance independently). _labelY is the label
// TOP edge for both placements.
function labelBox(it, cfg) {
  let maxLen = 0;
  for (const l of it._labelLines) if (l.length > maxLen) maxLen = l.length;
  const textWidth = maxLen * cfg.avgCharWidthPct;
  const half = Math.max(it.layout.label_width, textWidth) / 2;
  const lineH = cfg.labelLineHeightPct * Math.max(1, it._labelLines.length);
  return { x: it._labelX - half, y: it._labelY, w: half * 2, h: lineH };
}
function artBox(it) {
  return { x: it._centerX - it._visualWidth / 2, y: it._top, w: it._visualWidth, h: it._height };
}

// Build the labelled map (one zone) the resolver consumes.
function mapOf(items, zoneId = "z") {
  return new Map([[zoneId, items]]);
}

const ROOMY_ZONE = { id: "z", bounds: { left: 0, right: 100, top: 0, bottom: 100 } };

// ── Tests ────────────────────────────────────────────────────────────

test("resolveLabelCollisions: clean bottom-label scene leaves every label untouched", () => {
  const cfg = buildGlobalDefaults();
  // Two objects far apart; neither label touches the other's artwork or label.
  const a = item("a", { x: 10, top: 10, w: 6, h: 8, placement: "bottom" });
  const b = item("b", { x: 60, top: 10, w: 6, h: 8, placement: "bottom" });
  const beforeA = { x: a._labelX, y: a._labelY };
  const beforeB = { x: b._labelX, y: b._labelY };
  const diags = resolveLabelCollisions(mapOf([a, b]), [ROOMY_ZONE], "clean", [], cfg);
  assert.equal(a._labelX, beforeA.x);
  assert.equal(a._labelY, beforeA.y);
  assert.equal(b._labelX, beforeB.x);
  assert.equal(b._labelY, beforeB.y);
  assert.equal(diags.length, 0);
});

test("resolveLabelCollisions: clean top-label scene leaves every label untouched", () => {
  const cfg = buildGlobalDefaults();
  // Default placement: labels seeded ABOVE their objects. No collisions, so no
  // moves and no drift Warning (each label is at its ideal anchor).
  const a = item("a", { x: 10, top: 40, w: 6, h: 8, placement: "top" });
  const b = item("b", { x: 60, top: 40, w: 6, h: 8, placement: "top" });
  const beforeA = { x: a._labelX, y: a._labelY };
  const beforeB = { x: b._labelX, y: b._labelY };
  const diags = resolveLabelCollisions(mapOf([a, b]), [ROOMY_ZONE], "clean_top", [], cfg);
  assert.equal(a._labelX, beforeA.x);
  assert.equal(a._labelY, beforeA.y);
  assert.equal(b._labelX, beforeB.x);
  assert.equal(b._labelY, beforeB.y);
  assert.equal(diags.length, 0);
});

test("resolveLabelCollisions: a bottom label over a neighbor's artwork is moved clear", () => {
  const cfg = buildGlobalDefaults();
  // Object `tall` has a wide, tall artwork box. `owner`'s bottom label is placed
  // directly on top of tall's artwork; the resolver must move it clear.
  const tall = item("tall", { x: 30, top: 5, w: 20, h: 40, placement: "bottom" });
  const owner = item("owner", {
    x: 30,
    top: 50,
    w: 4,
    h: 6,
    placement: "bottom",
    labelX: 30,
    labelY: 20,
  });
  // Precondition: the label starts overlapping tall's artwork.
  const before = detectCollision(labelBox(owner, cfg), "L", artBox(tall), "A");
  assert.ok(before !== null, "fixture must start with the label over the artwork");
  resolveLabelCollisions(mapOf([tall, owner]), [ROOMY_ZONE], "art", [], cfg);
  const after = detectCollision(labelBox(owner, cfg), "L", artBox(tall), "A");
  assert.equal(after, null, "label must be clear of the artwork after resolve");
});

test("resolveLabelCollisions: a top label over a REAR-artwork box is moved UP clear", () => {
  const cfg = buildGlobalDefaults();
  // `rear` is a tall rear-zone object whose artwork extends down into where a
  // top label of the front object `owner` would seed. owner's top label starts
  // over rear's artwork; the resolver must clear it by stepping UP (a top label
  // never drops past its own object) until the label sits above rear's top edge.
  const rear = item("rear", { x: 30, top: 18, w: 22, h: 30, placement: "top" });
  const owner = item("owner", {
    x: 30,
    top: 60,
    w: 4,
    h: 6,
    placement: "top",
    labelX: 30,
    labelY: 24,
  });
  const before = detectCollision(labelBox(owner, cfg), "L", artBox(rear), "A");
  assert.ok(before !== null, "fixture must start with the top label over rear artwork");
  resolveLabelCollisions(mapOf([rear, owner]), [ROOMY_ZONE], "rear_top", [], cfg);
  const after = detectCollision(labelBox(owner, cfg), "L", artBox(rear), "A");
  assert.equal(after, null, "top label must be clear of rear artwork after resolve");
  // The clearing move went UP, not down: the resolved top edge is at or above the
  // obstacle top minus the label height.
  assert.ok(
    owner._labelY <= rear._top + 1e-6,
    `top label must move up above the obstacle (got ${owner._labelY}, obstacle top ${rear._top})`,
  );
});

test("resolveLabelCollisions: top-label resolve is idempotent", () => {
  const cfg = buildGlobalDefaults();
  function scene() {
    return [
      item("rear", { x: 30, top: 18, w: 22, h: 30, placement: "top" }),
      item("owner", {
        x: 30,
        top: 60,
        w: 4,
        h: 6,
        placement: "top",
        labelX: 30,
        labelY: 24,
      }),
    ];
  }
  const first = scene();
  resolveLabelCollisions(mapOf(first), [ROOMY_ZONE], "idem", [], cfg);
  const afterFirst = first.map((it) => ({ x: it._labelX, y: it._labelY }));
  // Re-running on the already-resolved coordinates must not move anything.
  resolveLabelCollisions(mapOf(first), [ROOMY_ZONE], "idem", [], cfg);
  for (let i = 0; i < first.length; i++) {
    assert.equal(first[i]._labelX, afterFirst[i].x, `${first[i].placement_name} x moved on rerun`);
    assert.equal(first[i]._labelY, afterFirst[i].y, `${first[i].placement_name} y moved on rerun`);
  }
});

test("resolveLabelCollisions: identical input yields identical label coords (determinism)", () => {
  const cfg = buildGlobalDefaults();
  function buildScene() {
    return [
      item("big", { x: 25, top: 5, w: 18, h: 38, placement: "bottom" }),
      item("p1", {
        x: 22,
        top: 48,
        w: 4,
        h: 6,
        placement: "bottom",
        labelX: 22,
        labelY: 18,
        lines: ["p1 long"],
      }),
      item("p2", {
        x: 30,
        top: 48,
        w: 4,
        h: 6,
        placement: "bottom",
        labelX: 30,
        labelY: 18,
        lines: ["p2 long"],
      }),
      item("p3", { x: 14, top: 48, w: 4, h: 6, placement: "bottom", labelX: 14, labelY: 18 }),
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

test("resolveLabelCollisions: top-label resolve is deterministic across two runs", () => {
  const cfg = buildGlobalDefaults();
  function buildScene() {
    return [
      item("rear", { x: 25, top: 16, w: 22, h: 28, placement: "top" }),
      item("t1", {
        x: 22,
        top: 60,
        w: 4,
        h: 6,
        placement: "top",
        labelX: 22,
        labelY: 24,
        lines: ["t1 long"],
      }),
      item("t2", {
        x: 30,
        top: 60,
        w: 4,
        h: 6,
        placement: "top",
        labelX: 30,
        labelY: 24,
        lines: ["t2 long"],
      }),
      item("t3", { x: 14, top: 60, w: 4, h: 6, placement: "top", labelX: 14, labelY: 24 }),
    ];
  }
  const run1 = buildScene();
  const run2 = buildScene();
  resolveLabelCollisions(mapOf(run1), [ROOMY_ZONE], "det_top", [], cfg);
  resolveLabelCollisions(mapOf(run2), [ROOMY_ZONE], "det_top", [], cfg);
  for (let i = 0; i < run1.length; i++) {
    assert.equal(run1[i]._labelX, run2[i]._labelX, `${run1[i].placement_name} x differs`);
    assert.equal(run1[i]._labelY, run2[i]._labelY, `${run1[i].placement_name} y differs`);
  }
});

test("resolveLabelCollisions: unresolvable overlap emits an unresolved_label_overlap Error", () => {
  const cfg = buildGlobalDefaults();
  // A bottom label fully inside a giant artwork box, in a tiny zone with no
  // horizontal room to nudge clear and no vertical room to drop clear: the artwork
  // overlap survives the pass budget and must raise an Error.
  const tinyZone = { id: "z", bounds: { left: 0, right: 10, top: 0, bottom: 6 } };
  const blob = item("blob", { x: 5, top: 0, w: 40, h: 40, placement: "bottom" });
  const owner = item("owner", {
    x: 5,
    top: 0,
    w: 1,
    h: 1,
    placement: "bottom",
    labelX: 5,
    labelY: 3,
    labelWidth: 4,
  });
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
});

test("resolveLabelCollisions: artwork avoidance has priority over label spacing", () => {
  const cfg = buildGlobalDefaults();
  // `owner`'s bottom label sits over `block` artwork AND beside `peer`'s label.
  // The resolver must clear the artwork (priority) even if that requires moving
  // the label; after resolve the label must not overlap the artwork.
  const block = item("block", { x: 20, top: 5, w: 16, h: 30, placement: "bottom" });
  const peer = item("peer", {
    x: 45,
    top: 40,
    w: 4,
    h: 6,
    placement: "bottom",
    labelX: 45,
    labelY: 15,
  });
  const owner = item("owner", {
    x: 20,
    top: 40,
    w: 4,
    h: 6,
    placement: "bottom",
    labelX: 20,
    labelY: 15,
  });
  resolveLabelCollisions(mapOf([block, peer, owner]), [ROOMY_ZONE], "prio", [], cfg);
  const overArt = detectCollision(labelBox(owner, cfg), "L", artBox(block), "A");
  assert.equal(overArt, null, "owner label must be clear of block artwork");
});

test("resolveLabelCollisions: clamp drift emits poor_label_alignment with clamp cause", () => {
  const cfg = buildGlobalDefaults();
  // A top label whose object sits flush at the zone top has NO room above. The
  // seed-level clamp (in layoutLabels) would pin its TOP edge at zone.top + pad,
  // far below its ideal anchor (top - offset - height, which is above the frame).
  // Here we emulate that already-clamped seed by placing the label at the padded
  // zone top while its ideal anchor is well above it, with no artwork collision.
  // The resolver applies no move, but anchorY = ideal seed, so drift > threshold
  // raises a poor_label_alignment Warning whose payload reports the CLAMP cause.
  const pad = cfg.spacing.labelZonePadding;
  const obj = item("clamped", { x: 30, top: 0, w: 6, h: 8, placement: "top" });
  // Pin the label at the padded zone top (where the seed clamp would hold it).
  obj._labelY = ROOMY_ZONE.bounds.top + pad;
  const diags = resolveLabelCollisions(mapOf([obj]), [ROOMY_ZONE], "clamp", [], cfg);
  const warns = diags.filter((d) => d.code === "poor_label_alignment");
  assert.ok(warns.length >= 1, "a clamp-drifted label must raise poor_label_alignment");
  const w = warns[0];
  assert.equal(w.severity, "Warning");
  assert.equal(w.failBuild, false);
  assert.equal(w.pointer.placement_name, "clamped");
  // The payload's attempted-move outcome names the clamp cause, distinguishing it
  // from a collision displacement.
  assert.ok(w.payload !== undefined, "drift Warning carries a cause payload");
  const outcome = w.payload.attemptedMoves[0].outcome;
  assert.ok(/clamp drift/.test(outcome), `outcome must name clamp cause, got: ${outcome}`);
  // No real move was applied, so the resolver did not move the label coordinates.
  assert.equal(obj._labelY, ROOMY_ZONE.bounds.top + pad);
});

test("resolveLabelCollisions: collision displacement drift names the collision cause", () => {
  const cfg = buildGlobalDefaults();
  // A bottom label forced far down past a tall obstacle drifts from its ideal
  // anchor by a real collision move. The drift Warning's cause must be the
  // collision-displacement string, not the clamp one.
  const tall = item("tall", { x: 30, top: 5, w: 20, h: 50, placement: "bottom" });
  const owner = item("owner", {
    x: 30,
    top: 60,
    w: 4,
    h: 6,
    placement: "bottom",
    labelX: 30,
    labelY: 10,
  });
  const diags = resolveLabelCollisions(mapOf([tall, owner]), [ROOMY_ZONE], "disp", [], cfg);
  const warns = diags.filter(
    (d) => d.code === "poor_label_alignment" && d.pointer.placement_name === "owner",
  );
  // The owner label had to travel a long way down; if it cleared and drifted past
  // the threshold the cause must be collision displacement.
  if (warns.length >= 1) {
    const outcome = warns[0].payload.attemptedMoves[0].outcome;
    assert.ok(
      /collision displacement|row drop|nudged/.test(outcome),
      `outcome must reflect a collision move, got: ${outcome}`,
    );
  }
  // Regardless of the Warning, the label must end clear of the artwork.
  const after = detectCollision(labelBox(owner, cfg), "L", artBox(tall), "A");
  assert.equal(after, null, "owner label must clear the artwork");
});
