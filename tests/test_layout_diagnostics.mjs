// Unit tests for src/scene_runtime/layout/diagnostics (WP-DIAG1). Covers the
// severity model, the actionable payload carried by the two overlap Errors, and
// the per-scene decision metadata. Uses the tsx loader so we import the TS
// source directly. Run via:
//   node --import tsx --test tests/test_layout_diagnostics.mjs

import test from "node:test";
import assert from "node:assert/strict";

import {
  SEVERITY_TABLE,
  severityRuleFor,
  buildDiagnostic,
  failsBuild,
  countBuildFailures,
} from "../src/scene_runtime/layout/diagnostics/severity_model.ts";
import { buildActionablePayload } from "../src/scene_runtime/layout/diagnostics/payload.ts";
import {
  buildRowZoneDecision,
  buildDecisionMetadata,
} from "../src/scene_runtime/layout/diagnostics/decision_metadata.ts";
import { buildGlobalDefaults } from "../src/scene_runtime/layout/config/index.ts";

//============================================
// Severity table mapping
//============================================

test("severity table grades the two overlap Errors as build-failing Errors", () => {
  for (const code of ["unresolved_label_overlap", "unresolved_overlap"]) {
    const rule = severityRuleFor(code);
    assert.equal(rule.severity, "Error");
    assert.equal(rule.failBuild, true);
  }
});

test("severity table grades Warnings and Review-required as non-failing", () => {
  const warnings = [
    "heavy_shrink",
    "low_primary_area",
    "poor_label_alignment",
    "excessive_packing",
  ];
  for (const code of warnings) {
    const rule = severityRuleFor(code);
    assert.equal(rule.severity, "Warning");
    assert.equal(rule.failBuild, false);
  }
  for (const code of ["possible_overload", "visual_review_unavailable"]) {
    const rule = severityRuleFor(code);
    assert.equal(rule.severity, "Review-required");
    assert.equal(rule.failBuild, false);
  }
});

test("buildDiagnostic copies the table row and attaches the pointer", () => {
  const pointer = { scene_name: "staining_bench", placement_name: "label_a" };
  const diag = buildDiagnostic("poor_label_alignment", pointer);
  assert.equal(diag.code, "poor_label_alignment");
  assert.equal(diag.severity, "Warning");
  assert.equal(diag.failBuild, false);
  assert.equal(diag.likelyOwner, SEVERITY_TABLE.poor_label_alignment.likelyOwner);
  assert.equal(diag.pointer.scene_name, "staining_bench");
  assert.equal(diag.suggestedFix, SEVERITY_TABLE.poor_label_alignment.suggestedFix);
  assert.equal(diag.payload, undefined);
});

test("failsBuild and countBuildFailures track only Error diagnostics", () => {
  const errorDiag = buildDiagnostic("unresolved_overlap", { scene_name: "s", zone_name: "z" });
  const warnDiag = buildDiagnostic("heavy_shrink", { scene_name: "s", placement_name: "p" });
  assert.equal(failsBuild(errorDiag), true);
  assert.equal(failsBuild(warnDiag), false);
  assert.equal(countBuildFailures([errorDiag, warnDiag, warnDiag]), 1);
});

//============================================
// Actionable payload shape (the WP-DIAG1 required assertion)
//============================================

// Build a synthetic unresolved overlap payload and assert every field the plan's
// "Actionable payload" paragraph requires is present and well-typed.
function syntheticPayload() {
  return buildActionablePayload({
    scene: "cell_counter_basic",
    zone: "bench_main",
    involvedItems: ["counter", "tube_rack"],
    remainingOverlapDepth: 3.2,
    remainingOverlapArea: 11.5,
    availableArea: 40.0,
    attemptedMoves: [
      { target: "tube_rack", kind: "nudge-x", magnitude: 2.0, outcome: "exited zone bounds" },
      { target: "tube_rack", kind: "shrink", magnitude: 0.2, outcome: "hit MIN_SCALE floor" },
    ],
    suggestedFix: "reduce items, enlarge the zone, or split the zone",
  });
}

test("unresolved_overlap Error carries the full actionable payload", () => {
  const payload = syntheticPayload();
  const diag = buildDiagnostic(
    "unresolved_overlap",
    { scene_name: "cell_counter_basic", zone_name: "bench_main" },
    payload,
  );
  // The Error itself.
  assert.equal(diag.code, "unresolved_overlap");
  assert.equal(diag.severity, "Error");
  assert.equal(diag.failBuild, true);
  // Scene + zone.
  assert.equal(diag.payload.scene, "cell_counter_basic");
  assert.equal(diag.payload.zone, "bench_main");
  // Involved items.
  assert.deepEqual(diag.payload.involvedItems, ["counter", "tube_rack"]);
  // Remaining overlap depth/area.
  assert.equal(typeof diag.payload.remainingOverlapDepth, "number");
  assert.ok(diag.payload.remainingOverlapDepth > 0);
  assert.equal(typeof diag.payload.remainingOverlapArea, "number");
  // Available area.
  assert.equal(typeof diag.payload.availableArea, "number");
  // Attempted moves, each with target/kind/magnitude/outcome.
  assert.equal(diag.payload.attemptedMoves.length, 2);
  for (const move of diag.payload.attemptedMoves) {
    assert.equal(typeof move.target, "string");
    assert.equal(typeof move.kind, "string");
    assert.equal(typeof move.magnitude, "number");
    assert.equal(typeof move.outcome, "string");
  }
  // Suggested fix.
  assert.equal(diag.payload.suggestedFix, "reduce items, enlarge the zone, or split the zone");
});

test("unresolved_label_overlap Error carries the full actionable payload", () => {
  const payload = buildActionablePayload({
    scene: "staining_bench",
    zone: "labels_top",
    involvedItems: ["label_dye", "label_buffer", "label_fixative"],
    remainingOverlapDepth: 1.1,
    remainingOverlapArea: 4.0,
    availableArea: 18.0,
    attemptedMoves: [
      { target: "label_buffer", kind: "row-drop", magnitude: 5.0, outcome: "reintroduced overlap" },
    ],
    suggestedFix: "reduce labels, enlarge the zone, or shorten labels",
  });
  const diag = buildDiagnostic(
    "unresolved_label_overlap",
    { scene_name: "staining_bench", placement_name: "label_buffer" },
    payload,
  );
  assert.equal(diag.severity, "Error");
  assert.equal(diag.failBuild, true);
  assert.equal(diag.payload.scene, "staining_bench");
  assert.equal(diag.payload.zone, "labels_top");
  assert.equal(diag.payload.involvedItems.length, 3);
  assert.ok(diag.payload.remainingOverlapDepth > 0);
  assert.equal(diag.payload.attemptedMoves[0].kind, "row-drop");
  assert.ok(diag.payload.suggestedFix.length > 0);
});

// The builder copies the input arrays, so a later mutation of the caller's array
// does not change the emitted payload (immutability guard).
test("buildActionablePayload snapshots its array inputs", () => {
  const items = ["a", "b"];
  const payload = buildActionablePayload({
    scene: "s",
    zone: "z",
    involvedItems: items,
    remainingOverlapDepth: 1,
    remainingOverlapArea: 1,
    availableArea: 1,
    attemptedMoves: [],
    suggestedFix: "reduce items",
  });
  items.push("c");
  assert.deepEqual(payload.involvedItems, ["a", "b"]);
});

//============================================
// Decision metadata (separate from diagnostics)
//============================================

test("buildRowZoneDecision records current row behavior", () => {
  const config = buildGlobalDefaults();
  const decision = buildRowZoneDecision({
    zoneId: "bench_main",
    resolvedConfig: config,
    shrinkApplied: { counter: 1, tube_rack: 0.9 },
  });
  assert.equal(decision.zoneId, "bench_main");
  assert.equal(decision.selectedStrategy, "row");
  assert.equal(decision.requiredRowScale, 1);
  assert.equal(decision.packerAttempted, false);
  assert.equal(decision.packerResult, "not-needed");
  assert.equal(decision.rowsCreated, 1);
  assert.equal(decision.packerThreshold, config.packer.thresholdScale);
  assert.equal(decision.shrinkApplied.tube_rack, 0.9);
  assert.deepEqual(decision.unresolvedConstraints, []);
});

test("buildDecisionMetadata groups zone decisions under the scene name", () => {
  const config = buildGlobalDefaults();
  const zoneA = buildRowZoneDecision({ zoneId: "z1", resolvedConfig: config });
  const zoneB = buildRowZoneDecision({ zoneId: "z2", resolvedConfig: config });
  const metadata = buildDecisionMetadata("staining_bench", [zoneA, zoneB]);
  assert.equal(metadata.sceneName, "staining_bench");
  assert.equal(metadata.zones.length, 2);
  assert.equal(metadata.zones[0].zoneId, "z1");
});
