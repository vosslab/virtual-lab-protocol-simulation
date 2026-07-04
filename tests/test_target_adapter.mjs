// tests/test_target_adapter.mjs
//
// Unit tests for the single protocol-target-to-DOM identity adapter
// (src/scene_runtime/protocol/target_adapter.ts, milestone M8).
//
// The adapter is the ONLY place a protocol target resolves to a DOM
// placement_name and back to an object_name. These tests construct scene
// placement bindings in-memory (no fixture directory) and probe:
//   - object_name -> unique placement_name (the auto-derive for singly-placed
//     objects, so no existing protocol target string changes);
//   - placement_name -> itself (an explicitly named placement);
//   - placement_name -> object_name reverse (the object_name-keyed store key);
//   - subpart suffix preservation on both directions;
//   - FAIL LOUD when an object_name is placed more than once with no
//     disambiguation (the twice-placed probe), while a specific placement_name
//     of that same twice-placed object still resolves uniquely.

import { test, describe } from "node:test";
import assert from "node:assert";

import {
  build_target_adapter,
  AmbiguousTargetError,
  placement_name_from_element,
  TARGET_DOM_ATTR,
  IDENTITY_TARGET_ADAPTER,
} from "../src/scene_runtime/protocol/target_adapter.ts";

//============================================
// Singly-placed objects: auto-derive object_name -> placement_name
//============================================

describe("build_target_adapter singly-placed", () => {
  // A scene whose placement names differ from their object names, exactly like
  // real content (placement_name center_gel_cassette for object_name gel_cassette).
  const adapter = build_target_adapter([
    { object_name: "gel_cassette", placement_name: "center_gel_cassette" },
    { object_name: "p200_micropipette", placement_name: "center_p200_micropipette" },
    { object_name: "protein_ladder_tube", placement_name: "rear_left_protein_ladder_tube" },
  ]);

  test("object_name resolves to its unique placement_name (DOM key)", () => {
    assert.strictEqual(adapter.resolve_to_placement("gel_cassette"), "center_gel_cassette");
    assert.strictEqual(
      adapter.resolve_to_placement("p200_micropipette"),
      "center_p200_micropipette",
    );
  });

  test("placement_name resolves to itself (already the DOM key)", () => {
    assert.strictEqual(adapter.resolve_to_placement("center_gel_cassette"), "center_gel_cassette");
  });

  test("placement_name resolves back to its object_name (store key)", () => {
    assert.strictEqual(adapter.resolve_to_object("center_gel_cassette"), "gel_cassette");
    assert.strictEqual(
      adapter.resolve_to_object("rear_left_protein_ladder_tube"),
      "protein_ladder_tube",
    );
  });

  test("object_name resolves to itself under resolve_to_object (identity)", () => {
    assert.strictEqual(adapter.resolve_to_object("gel_cassette"), "gel_cassette");
  });

  test("both directions compose to the DOM key from either input", () => {
    // An authored target that is the object_name and one that is the
    // placement_name both normalize to the same placement_name -- the property
    // the step-machine equality relies on to compare authored-vs-clicked.
    const from_object = adapter.resolve_to_placement("gel_cassette");
    const from_placement = adapter.resolve_to_placement("center_gel_cassette");
    assert.strictEqual(from_object, from_placement);
  });
});

//============================================
// Subpart suffix preservation
//============================================

describe("build_target_adapter subpart suffix", () => {
  const adapter = build_target_adapter([
    { object_name: "well_plate_96", placement_name: "center_well_plate_96" },
  ]);

  test("resolve_to_placement resolves the prefix and preserves .subpart", () => {
    assert.strictEqual(adapter.resolve_to_placement("well_plate_96.A1"), "center_well_plate_96.A1");
  });

  test("resolve_to_object resolves the prefix and preserves .subpart", () => {
    assert.strictEqual(adapter.resolve_to_object("center_well_plate_96.A1"), "well_plate_96.A1");
  });
});

//============================================
// Twice-placed object: the disambiguation probe (fail loud)
//============================================

describe("build_target_adapter twice-placed disambiguation", () => {
  // The only probe for the disambiguation path: one object placed twice, each
  // placement scene-unique. object_name is non-unique and cannot be a DOM key.
  const adapter = build_target_adapter([
    { object_name: "dilution_tube_rack", placement_name: "left_dilution_tube_rack" },
    { object_name: "dilution_tube_rack", placement_name: "right_dilution_tube_rack" },
  ]);

  test("the ambiguous object_name FAILS LOUD (no silent pick)", () => {
    assert.throws(
      () => adapter.resolve_to_placement("dilution_tube_rack"),
      (err) => {
        assert.ok(
          err instanceof AmbiguousTargetError,
          "expected AmbiguousTargetError for a twice-placed object_name",
        );
        // The error names both placements so an author can disambiguate.
        assert.match(err.message, /left_dilution_tube_rack/);
        assert.match(err.message, /right_dilution_tube_rack/);
        return true;
      },
    );
  });

  test("a specific placement_name still resolves uniquely (the fix path)", () => {
    assert.strictEqual(
      adapter.resolve_to_placement("left_dilution_tube_rack"),
      "left_dilution_tube_rack",
    );
    assert.strictEqual(
      adapter.resolve_to_placement("right_dilution_tube_rack"),
      "right_dilution_tube_rack",
    );
  });

  test("each placement resolves back to the shared object_name (store key)", () => {
    // The store is object_name-keyed: both placements of one object share one
    // state, so both reverse-resolve to the same object_name.
    assert.strictEqual(adapter.resolve_to_object("left_dilution_tube_rack"), "dilution_tube_rack");
    assert.strictEqual(adapter.resolve_to_object("right_dilution_tube_rack"), "dilution_tube_rack");
  });

  test("a subpart of the ambiguous object_name also fails loud", () => {
    assert.throws(
      () => adapter.resolve_to_placement("dilution_tube_rack.tube_1"),
      AmbiguousTargetError,
    );
  });
});

//============================================
// Unknown target and identity adapter
//============================================

describe("build_target_adapter unknown + identity", () => {
  const adapter = build_target_adapter([
    { object_name: "gel_cassette", placement_name: "center_gel_cassette" },
  ]);

  test("an unknown target passes through unchanged (not a name validator)", () => {
    // A target for a scene not currently mounted resolves to identity; the
    // caller's own equality / DOM lookup reports the mismatch.
    assert.strictEqual(adapter.resolve_to_placement("not_in_this_scene"), "not_in_this_scene");
    assert.strictEqual(adapter.resolve_to_object("not_in_this_scene"), "not_in_this_scene");
  });

  test("IDENTITY_TARGET_ADAPTER returns every target unchanged", () => {
    assert.strictEqual(IDENTITY_TARGET_ADAPTER.resolve_to_placement("anything"), "anything");
    assert.strictEqual(IDENTITY_TARGET_ADAPTER.resolve_to_object("anything.sub"), "anything.sub");
  });
});

//============================================
// DOM read-back helper
//============================================

describe("placement_name_from_element", () => {
  test("reads the placement_name off the canonical DOM attribute", () => {
    // A minimal stand-in Element exposing getAttribute; the helper reads only
    // TARGET_DOM_ATTR, so no real DOM is needed.
    const element = {
      getAttribute(name) {
        return name === TARGET_DOM_ATTR ? "center_gel_cassette" : null;
      },
    };
    assert.strictEqual(placement_name_from_element(element), "center_gel_cassette");
  });

  test("returns null when the element carries no DOM key", () => {
    const element = {
      getAttribute() {
        return null;
      },
    };
    assert.strictEqual(placement_name_from_element(element), null);
  });
});
