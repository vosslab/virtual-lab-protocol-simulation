// tests/test_affordance.mjs
//
// Pure unit tests for:
//   - compute_affordance_kind (src/scene_runtime/protocol/affordance.ts)
//   - enumerate_candidate_targets (src/scene_runtime/renderer/affordance_candidates.ts)
//
// No DOM, no Solid runtime, no network. Deterministic inputs and outputs only.
//
// Covered branches for compute_affordance_kind:
//   select + item in candidate_targets           -> "candidate"
//   select + item NOT in candidate_targets       -> "none"
//   click  + item == active_target               -> "active"
//   click  + item != active_target               -> "none"
//   null active_target (with click gesture)      -> "none"
//   null active_gesture (with matching target)   -> "none"
//   drag   + item == active_target               -> "active"  (locks "any other directed gesture" branch)
//   adjust + item == active_target               -> "active"  (directed-gesture branch, adjust variant)
//   type   + item == active_target               -> "active"  (directed-gesture branch, type variant)
//
// Covered cases for enumerate_candidate_targets:
//   top-level object names (no ".") with the "clickable" capability are
//     included in the returned set
//   subpart names containing "." (e.g. "well_plate_96.A1") are excluded
//   items lacking the "clickable" capability (decoration_only) are excluded
//   empty result.final yields an empty set
//   returned set contains exactly the top-level clickable names provided
//
// Run with:
//   node --import tsx --test tests/test_affordance.mjs
//
// NOTE on PipelineResult fixture shape: enumerate_candidate_targets only reads
// result.final, item.object_name, and item.capabilities from each entry;
// fixtures here include only those fields. Full PipelineResult has many more
// fields but the function does not dereference them, so they are omitted to
// keep fixtures minimal.

import { test } from "node:test";
import assert from "node:assert/strict";

import { compute_affordance_kind } from "../src/scene_runtime/protocol/affordance.ts";
import { enumerate_candidate_targets } from "../src/scene_runtime/renderer/affordance_candidates.ts";

//============================================
// Fixtures
//============================================

const CANDIDATES = new Set(["flask_a", "tube_b", "plate_c"]);
const EMPTY_CANDIDATES = new Set();

//============================================
// select gesture tests
//============================================

test("select + item in candidate_targets returns candidate", () => {
  const result = compute_affordance_kind({
    active_target: "flask_a",
    active_gesture: "select",
    item_target: "flask_a",
    candidate_targets: CANDIDATES,
  });
  assert.equal(result, "candidate");
});

test("select + item NOT in candidate_targets returns none", () => {
  const result = compute_affordance_kind({
    active_target: "flask_a",
    active_gesture: "select",
    item_target: "other_object",
    candidate_targets: CANDIDATES,
  });
  assert.equal(result, "none");
});

//============================================
// click gesture tests
//============================================

test("click + item == active_target returns active", () => {
  const result = compute_affordance_kind({
    active_target: "tube_b",
    active_gesture: "click",
    item_target: "tube_b",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "active");
});

test("click + item != active_target returns none", () => {
  const result = compute_affordance_kind({
    active_target: "tube_b",
    active_gesture: "click",
    item_target: "plate_c",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "none");
});

//============================================
// null active_target / null active_gesture tests
//============================================

test("click gesture + null active_target returns none", () => {
  const result = compute_affordance_kind({
    active_target: null,
    active_gesture: "click",
    item_target: "flask_a",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "none");
});

test("null active_gesture + matching item_target returns none", () => {
  const result = compute_affordance_kind({
    active_target: "flask_a",
    active_gesture: null,
    item_target: "flask_a",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "none");
});

//============================================
// Other directed gestures (drag branch)
//============================================

test("drag + item == active_target returns active", () => {
  const result = compute_affordance_kind({
    active_target: "plate_c",
    active_gesture: "drag",
    item_target: "plate_c",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "active");
});

test("adjust + item == active_target returns active", () => {
  const result = compute_affordance_kind({
    active_target: "plate_c",
    active_gesture: "adjust",
    item_target: "plate_c",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "active");
});

test("type + item == active_target returns active", () => {
  const result = compute_affordance_kind({
    active_target: "tube_b",
    active_gesture: "type",
    item_target: "tube_b",
    candidate_targets: EMPTY_CANDIDATES,
  });
  assert.equal(result, "active");
});

//============================================
// enumerate_candidate_targets tests
//============================================

// Helper: build a minimal PipelineResult-like fixture. Only result.final,
// item.placement_name, and item.capabilities are read by
// enumerate_candidate_targets (M8: the candidate set is keyed by the unique DOM
// placement_name, not object_name); no other fields are needed. These unit
// fixtures set placement_name = the provided name so the existing name-filtering
// assertions still read straight through. Defaults every item to the "clickable"
// capability so existing callers keep testing the name-filtering behavior;
// capability-gating tests pass their own capabilities explicitly.
function make_pipeline_result(names, capabilities = ["clickable"]) {
  return {
    final: names.map((name) => ({
      object_name: name,
      placement_name: name,
      capabilities,
    })),
  };
}

test("enumerate_candidate_targets: top-level names are included", () => {
  const fixture = make_pipeline_result(["flask_a", "tube_b", "plate_c"]);
  const result = enumerate_candidate_targets(fixture);
  assert.ok(result.has("flask_a"), "flask_a should be in candidate set");
  assert.ok(result.has("tube_b"), "tube_b should be in candidate set");
  assert.ok(result.has("plate_c"), "plate_c should be in candidate set");
});

test("enumerate_candidate_targets: subpart names containing '.' are excluded", () => {
  const fixture = make_pipeline_result(["well_plate_96", "well_plate_96.A1", "well_plate_96.B2"]);
  const result = enumerate_candidate_targets(fixture);
  assert.ok(result.has("well_plate_96"), "top-level well_plate_96 should be included");
  assert.ok(!result.has("well_plate_96.A1"), "subpart well_plate_96.A1 should be excluded");
  assert.ok(!result.has("well_plate_96.B2"), "subpart well_plate_96.B2 should be excluded");
});

test("enumerate_candidate_targets: empty result.final yields empty set", () => {
  const fixture = make_pipeline_result([]);
  const result = enumerate_candidate_targets(fixture);
  assert.equal(result.size, 0, "empty final should yield empty candidate set");
});

test("enumerate_candidate_targets: result contains exactly the top-level names provided", () => {
  // Only top-level names in; only top-level names out; size matches.
  const top_level = ["flask_a", "tube_b"];
  const subparts = ["flask_a.neck", "tube_b.cap"];
  const fixture = make_pipeline_result([...top_level, ...subparts]);
  const result = enumerate_candidate_targets(fixture);
  // Exactly two items (the two top-level names) and nothing else.
  assert.equal(result.size, 2, "should contain exactly 2 top-level names");
  assert.ok(result.has("flask_a"), "flask_a should be present");
  assert.ok(result.has("tube_b"), "tube_b should be present");
});

//============================================
// Capability gate (M6 "Enforce capabilities in renderer and candidate
// enumeration"): a decoration_only item is excluded from the candidate set
// even though its name has no "." and would otherwise pass the subpart filter.
//============================================

test("enumerate_candidate_targets: decoration_only items are excluded", () => {
  const fixture = {
    final: [
      { object_name: "flask_a", placement_name: "flask_a", capabilities: ["clickable"] },
      { object_name: "tip_box", placement_name: "tip_box", capabilities: ["decoration_only"] },
    ],
  };
  const result = enumerate_candidate_targets(fixture);
  assert.ok(result.has("flask_a"), "clickable flask_a should be present");
  assert.ok(!result.has("tip_box"), "decoration_only tip_box should be excluded");
  assert.equal(result.size, 1, "should contain exactly the one clickable name");
});

test("enumerate_candidate_targets: missing-object placeholder (capabilities: []) is excluded", () => {
  const fixture = {
    final: [
      { object_name: "flask_a", placement_name: "flask_a", capabilities: ["clickable"] },
      { object_name: "unknown_thing", placement_name: "unknown_thing", capabilities: [] },
    ],
  };
  const result = enumerate_candidate_targets(fixture);
  assert.ok(result.has("flask_a"), "clickable flask_a should be present");
  assert.ok(!result.has("unknown_thing"), "capabilities:[] placeholder should be excluded");
});
