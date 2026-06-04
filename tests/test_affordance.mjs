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
//   top-level object names (no ".") are included in the returned set
//   subpart names containing "." (e.g. "well_plate_96.A1") are excluded
//   empty result.final yields an empty set
//   returned set contains exactly the top-level names provided
//
// Run with:
//   node --import tsx --test tests/test_affordance.mjs
//
// NOTE on PipelineResult fixture shape: enumerate_candidate_targets only reads
// result.final and item.object_name from each entry; fixtures here include only
// those fields. Full PipelineResult has many more fields but the function does
// not dereference them, so they are omitted to keep fixtures minimal.

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

// Helper: build a minimal PipelineResult-like fixture. Only result.final and
// item.object_name are read by enumerate_candidate_targets; no other fields
// are needed.
function make_pipeline_result(object_names) {
  return { final: object_names.map((object_name) => ({ object_name })) };
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
