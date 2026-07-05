// tests/test_resolve_entry_scene.mjs
//
// Unit tests for WP-RESOLVE-1 (resolve_entry_scene_name) and
// WP-RESOLVE-2 (assert_scene_not_empty).
//
// Run with:
//   node --import tsx --test tests/test_resolve_entry_scene.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolve_entry_scene_name,
  assert_scene_not_empty,
} from "../src/scene_runtime/protocol/resolve_entry_scene.ts";

//============================================
// Fixture helpers
//============================================

function make_mini_protocol_step(step_name, scene, first_to_scene) {
  // Build a step optionally carrying a scene: field and/or a SceneChange.
  const scene_operations = [];
  if (first_to_scene !== null) {
    scene_operations.push({ type: "SceneChange", to_scene: first_to_scene });
  }
  const step = {
    step_name,
    prompt: `Prompt for ${step_name}`,
    sequence: [
      {
        target: "some_object",
        gesture: "click",
        validator: { preset: "correct_target" },
        response: { scene_operations },
      },
    ],
    step_validator: { preset: "sequence_complete" },
    outcome: { on_success: "complete", on_failure: "retry" },
    next_step: null,
  };
  // Only add scene field when explicitly provided (undefined means absent).
  if (scene !== undefined) {
    step.scene = scene;
  }
  return step;
}

function make_mini_config(protocol_name, entry_step, steps) {
  return {
    protocol_name,
    protocol_type: "mini_protocol",
    entry_step,
    steps,
  };
}

function make_runner_config(protocol_name, entry_step, mini_protocols) {
  return {
    protocol_name,
    protocol_type: "sequence_runner",
    entry_step,
    mini_protocols,
  };
}

//============================================
// WP-RESOLVE-1: resolve_entry_scene_name
//============================================

describe("WP-RESOLVE-1: resolve_entry_scene_name - precedence 1 (step.scene)", () => {
  test("returns step.scene when present and non-empty", () => {
    const step = make_mini_protocol_step("step_a", "my_exact_scene", "other_scene");
    const config = make_mini_config("proto_x", "step_a", [step]);
    const result = resolve_entry_scene_name(config, {});
    assert.strictEqual(result, "my_exact_scene");
  });

  test("step.scene takes priority over SceneChange when both are present", () => {
    const step = make_mini_protocol_step("entry", "scene_from_field", "scene_from_scenechange");
    const config = make_mini_config("proto_y", "entry", [step]);
    const result = resolve_entry_scene_name(config, {});
    assert.strictEqual(result, "scene_from_field");
  });
});

describe("WP-RESOLVE-1: resolve_entry_scene_name - precedence 2 (first SceneChange.to_scene)", () => {
  test("falls back to first SceneChange.to_scene when step.scene is absent", () => {
    // scene param undefined means no scene field on the step object
    const step = make_mini_protocol_step("calc_step", undefined, "dilution_workspace");
    const config = make_mini_config("drug_dilution_setup", "calc_step", [step]);
    const result = resolve_entry_scene_name(config, {});
    assert.strictEqual(result, "dilution_workspace");
  });

  test("walks the entry step only, ignoring other steps", () => {
    const other_step = make_mini_protocol_step("other_step", undefined, "wrong_scene");
    const entry_step = make_mini_protocol_step("entry_step", undefined, "correct_scene");
    const config = make_mini_config("proto_z", "entry_step", [other_step, entry_step]);
    const result = resolve_entry_scene_name(config, {});
    assert.strictEqual(result, "correct_scene");
  });

  test("SceneChange in a LATER interaction is found when first interaction has no SceneChange", () => {
    // Guards the loop-correctness property: resolution must scan all interactions,
    // not just sequence[0]. First interaction has no scene_operation; second carries
    // the SceneChange.
    const step = {
      step_name: "entry_step",
      prompt: "Multi-step entry",
      sequence: [
        {
          // First interaction: no SceneChange
          target: "some_object",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
        {
          // Second interaction: carries the SceneChange
          target: "other_object",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: {
            scene_operations: [{ type: "SceneChange", to_scene: "found_in_later_interaction" }],
          },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const config = make_mini_config("proto_later_sc", "entry_step", [step]);
    const result = resolve_entry_scene_name(config, {});
    assert.strictEqual(result, "found_in_later_interaction");
  });
});

describe("WP-RESOLVE-1: resolve_entry_scene_name - precedence 3 (throw)", () => {
  test("throws when entry step has neither scene: field nor SceneChange", () => {
    const step = make_mini_protocol_step("bare_step", undefined, null);
    const config = make_mini_config("proto_unresolved", "bare_step", [step]);
    assert.throws(() => resolve_entry_scene_name(config, {}), /cannot resolve entry scene/);
  });

  test("throws when entry_step name does not match any step in steps list", () => {
    const step = make_mini_protocol_step("actual_step", undefined, "some_scene");
    const config = make_mini_config("proto_mismatch", "nonexistent_step", [step]);
    assert.throws(() => resolve_entry_scene_name(config, {}), /cannot resolve entry scene/);
  });
});

describe("WP-RESOLVE-1: resolve_entry_scene_name - sequence_runner delegation", () => {
  test("resolves a runner via its first mini-protocol (SceneChange fallback)", () => {
    // Simulate cell_culture_full -> passage_hood_detachment
    const mini_step = make_mini_protocol_step(
      "inspect_confluence",
      undefined,
      "passage_hood_detachment_microscope_view",
    );
    const mini_config = make_mini_config("passage_hood_detachment", "inspect_confluence", [
      mini_step,
    ]);
    const runner_config = make_runner_config("cell_culture_full", "inspect_confluence", [
      "passage_hood_detachment",
    ]);
    const protocols = {
      passage_hood_detachment: mini_config,
    };
    const result = resolve_entry_scene_name(runner_config, protocols);
    assert.strictEqual(result, "passage_hood_detachment_microscope_view");
  });

  test("resolves a runner via its first mini-protocol (scene: field takes priority)", () => {
    const mini_step = make_mini_protocol_step("entry_step", "explicit_scene", "scenechange_scene");
    const mini_config = make_mini_config("mini_a", "entry_step", [mini_step]);
    const runner_config = make_runner_config("runner_proto", "entry_step", ["mini_a"]);
    const protocols = { mini_a: mini_config };
    const result = resolve_entry_scene_name(runner_config, protocols);
    assert.strictEqual(result, "explicit_scene");
  });

  test("throws when runner has no mini_protocols list", () => {
    const runner_config = {
      protocol_name: "empty_runner",
      protocol_type: "sequence_runner",
      entry_step: "some_step",
      mini_protocols: [],
    };
    assert.throws(() => resolve_entry_scene_name(runner_config, {}), /has no mini_protocols list/);
  });

  test("throws when runner's first mini-protocol is not in PROTOCOLS map", () => {
    const runner_config = make_runner_config("runner_missing", "step_x", ["nonexistent_mini"]);
    assert.throws(() => resolve_entry_scene_name(runner_config, {}), /not found in PROTOCOLS/);
  });
});

//============================================
// WP-RESOLVE-2: assert_scene_not_empty
//============================================

describe("WP-RESOLVE-2: assert_scene_not_empty - empty scene guard", () => {
  test("throws for mini_protocol with empty final (0 items)", () => {
    assert.throws(() => assert_scene_not_empty(0, "proto_a", "scene_a"), /rendered empty/);
  });

  test("throws for sequence_runner with empty final", () => {
    assert.throws(() => assert_scene_not_empty(0, "runner_b", "scene_b"), /rendered empty/);
  });

  test("does NOT throw for mini_protocol with non-empty final (1 item)", () => {
    assert.doesNotThrow(() => assert_scene_not_empty(1, "proto_c", "scene_c"));
  });

  test("does NOT throw for sequence_runner with non-empty final", () => {
    assert.doesNotThrow(() => assert_scene_not_empty(5, "runner_d", "scene_d"));
  });

  test("error message names the protocol and scene", () => {
    let caught_message = "";
    try {
      assert_scene_not_empty(0, "my_protocol", "my_scene");
    } catch (e) {
      caught_message = e.message;
    }
    assert.ok(caught_message.includes("my_protocol"), "message should name protocol");
    assert.ok(caught_message.includes("my_scene"), "message should name scene");
  });
});
