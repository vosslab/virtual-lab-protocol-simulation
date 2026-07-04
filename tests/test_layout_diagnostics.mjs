// Unit tests for src/scene_runtime/layout/diagnostics (WP-DIAG1). Covers the
// severity model, the actionable payload carried by the two overlap Errors, and
// the per-scene decision metadata. Uses the tsx loader so we import the TS
// source directly. Run via:
//   node --import tsx --test tests/test_layout_diagnostics.mjs

import test from "node:test";
import assert from "node:assert/strict";

import {
  SEVERITY_TABLE,
  BUILD_GATE_EXEMPT_SCENES,
  isBuildGateExemptScene,
  severityRuleFor,
  buildDiagnostic,
  failsBuild,
  countBuildFailures,
} from "../src/scene_runtime/layout/diagnostics/severity_model.ts";
import { buildUnifiedDiagnostics } from "../src/scene_runtime/layout/diagnostics/unified.ts";
import {
  promoteBelowViewport,
  collectUnfittableAssets,
} from "../src/scene_runtime/layout/diagnostics/promote.ts";
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
// M17: preventive art_below_viewport + unfittable_asset codes
//============================================

test("art_below_viewport is a build-failing Error in the closed vocabulary", () => {
  const rule = severityRuleFor("art_below_viewport");
  assert.equal(rule.severity, "Error");
  assert.equal(rule.failBuild, true);
  assert.equal(rule.pointerLevel, "placement");
});

test("unfittable_asset is a non-failing Warning in the closed vocabulary", () => {
  const rule = severityRuleFor("unfittable_asset");
  assert.equal(rule.severity, "Warning");
  assert.equal(rule.failBuild, false);
  assert.equal(rule.pointerLevel, "placement");
});

// A synthetic off-canvas finding shaped like the report-only offcanvas stream.
function offCanvasFinding(classification, scene, zone, placementName) {
  return {
    scene,
    zone,
    placementName,
    classification,
    severity: classification === "fully_off_canvas" ? "error" : "warning",
    overflow: { left: 0, right: 0, top: 0, bottom: 30 },
    worstOverflow: 30,
    tier: "severe",
  };
}

test("a synthetic below-viewport item fires the art_below_viewport Error", () => {
  // Inject one fully-off-canvas item plus one partial overflow. Only the fully
  // off-canvas item promotes to a build-failing Error; the partial stays report-only.
  const offCanvas = [
    offCanvasFinding("fully_off_canvas", "demo_scene", "rear", "sunk_flask"),
    offCanvasFinding("partial_overflow", "demo_scene", "front", "edge_bottle"),
  ];
  const promoted = promoteBelowViewport(offCanvas);
  assert.equal(promoted.length, 1);
  const diag = promoted[0];
  assert.equal(diag.code, "art_below_viewport");
  assert.equal(diag.severity, "Error");
  assert.equal(diag.failBuild, true);
  assert.equal(diag.pointer.scene_name, "demo_scene");
  assert.equal(diag.pointer.zone_name, "rear");
  assert.equal(diag.pointer.placement_name, "sunk_flask");
  // The promoted Error is a build failure the gate will count.
  assert.equal(countBuildFailures(promoted), 1);
});

test("no fully-off-canvas item means no art_below_viewport (0 scenes trip it)", () => {
  const offCanvas = [offCanvasFinding("partial_overflow", "demo_scene", "front", "edge_bottle")];
  const promoted = promoteBelowViewport(offCanvas);
  assert.deepEqual(promoted, []);
});

// A synthetic final item carrying the fields collectUnfittableAssets reads.
function finalItem(placementName, zone, scale) {
  return { placement_name: placementName, zone, _scale: scale };
}

test("an item below the readable floor fires an unfittable_asset Warning", () => {
  const items = [
    finalItem("big_flask", "bench", 0.9), // readable, no warning
    finalItem("tiny_tube", "bench", 0.4), // below floor, warns
    finalItem("floor_item", "bench", 0.55), // exactly at floor, no warning
  ];
  const warnings = collectUnfittableAssets(items, "demo_scene", 0.55);
  assert.equal(warnings.length, 1);
  const diag = warnings[0];
  assert.equal(diag.code, "unfittable_asset");
  assert.equal(diag.severity, "Warning");
  assert.equal(diag.failBuild, false);
  assert.equal(diag.pointer.placement_name, "tiny_tube");
  assert.equal(diag.pointer.zone_name, "bench");
  // Warnings never fail the build.
  assert.equal(countBuildFailures(warnings), 0);
});

//============================================
// M17: build-gate scene exemptions
//============================================

test("the exempt set covers the intentional-void scenes and the adversarial fixture", () => {
  assert.equal(isBuildGateExemptScene("adversarial_overflow_smoke"), true);
  assert.equal(isBuildGateExemptScene("hood_basic"), true);
  assert.equal(isBuildGateExemptScene("microscope_basic"), true);
  assert.equal(isBuildGateExemptScene("hemocytometer_view"), true);
  assert.equal(isBuildGateExemptScene("passage_hood_detachment_microscope_view"), true);
  // A normal curriculum scene is NOT exempt.
  assert.equal(isBuildGateExemptScene("staining_bench"), false);
  assert.ok(BUILD_GATE_EXEMPT_SCENES.has("adversarial_overflow_smoke"));
});

//============================================
// M17: unified diagnostics stream
//============================================

test("buildUnifiedDiagnostics folds all four streams into one normalized array", () => {
  const legacy = [{ stage: "bind", severity: "info", kind: "label_row_staggered", zone: "z1" }];
  const passes = [
    {
      pass: 1,
      diagnostics: [
        { stage: "horizontal", severity: "warn", kind: "zone_overflow_negative_gap", zone: "z2" },
      ],
      zones_shrunk: ["z2"],
    },
  ];
  const severity = [
    buildDiagnostic("art_below_viewport", {
      scene_name: "demo_scene",
      zone_name: "rear",
      placement_name: "sunk_flask",
    }),
  ];
  const offCanvas = [offCanvasFinding("fully_off_canvas", "demo_scene", "rear", "sunk_flask")];

  const unified = buildUnifiedDiagnostics({
    sceneName: "demo_scene",
    legacy,
    passes,
    severity,
    offCanvas,
  });

  // One entry per source input, in stable source order.
  const sources = unified.map((u) => u.source);
  assert.deepEqual(sources, ["legacy", "pass", "severity", "offcanvas"]);
  // Every entry carries the scene name and a message.
  for (const u of unified) {
    assert.equal(u.scene, "demo_scene");
    assert.equal(typeof u.message, "string");
    assert.ok(u.message.length > 0);
  }
  // Only the severity-sourced entry is authoritative for the build gate.
  const failing = unified.filter((u) => u.failBuild);
  assert.equal(failing.length, 1);
  assert.equal(failing[0].source, "severity");
  assert.equal(failing[0].code, "art_below_viewport");
  // The pass entry carries its pass number; the legacy entry does not.
  const passEntry = unified.find((u) => u.source === "pass");
  assert.equal(passEntry.pass, 1);
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
