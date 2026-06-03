// tests/test_protocol_validators.mjs
//
// Node tests for src/scene_runtime/protocol/validators.ts.
// Imports the real TypeScript source via the tsx loader
// (node --import tsx --test). No mocks of the module under test.

import { test } from "node:test";
import assert from "node:assert";

import {
  validate_correct_target,
  validate_correct_choice,
  validate_target_with_value,
  validate_sequence_complete,
  validate_final_state_matches,
  dispatch_interaction_validator,
  dispatch_step_validator,
} from "../src/scene_runtime/protocol/validators.ts";

//============================================
// Fixture helpers
//============================================

function make_interaction(target, preset, parameters) {
  return {
    target,
    gesture: "click",
    validator: { preset, ...(parameters !== undefined ? { parameters } : {}) },
  };
}

function make_step(sequence_length, step_preset, step_params) {
  const sequence = Array.from({ length: sequence_length }, (_, i) => ({
    target: `target_${i}`,
    gesture: "click",
    validator: { preset: "correct_target" },
  }));
  return {
    step_name: "test_step",
    sequence,
    step_validator: {
      preset: step_preset,
      ...(step_params !== undefined ? { parameters: step_params } : {}),
    },
  };
}

//============================================
// validate_correct_target
//============================================

test("validate_correct_target: matching target passes", () => {
  const interaction = make_interaction("pipette", "correct_target");
  const result = validate_correct_target(interaction, "pipette");
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, null);
});

test("validate_correct_target: different target rejects with wrong_target", () => {
  const interaction = make_interaction("pipette", "correct_target");
  const result = validate_correct_target(interaction, "flask");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "wrong_target");
});

//============================================
// validate_correct_choice (corrected semantics: target-equality)
//
// `select` means "choose the next-step object among the scene objects already
// present". correct_choice now passes when the SELECTED scene object equals the
// interaction's declared target, and rejects (wrong_target) otherwise. There is
// no choice_id / answer-list concept.
//============================================

test("validate_correct_choice: selecting the correct object passes", () => {
  const interaction = make_interaction("treatment_plate", "correct_choice");
  const result = validate_correct_choice(interaction, "treatment_plate");
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, null);
});

test("validate_correct_choice: selecting a wrong present object rejects with wrong_target", () => {
  const interaction = make_interaction("treatment_plate", "correct_choice");
  const result = validate_correct_choice(interaction, "waste_beaker");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "wrong_target");
});

test("validate_correct_choice: no selection (null) rejects", () => {
  const interaction = make_interaction("treatment_plate", "correct_choice");
  const result = validate_correct_choice(interaction, null);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "wrong_target");
});

test("dispatch_interaction_validator: routes correct_choice as target-equality", () => {
  const interaction = make_interaction("treatment_plate", "correct_choice");
  const ok = dispatch_interaction_validator(
    "correct_choice",
    interaction,
    "treatment_plate",
    null,
    {},
  );
  assert.strictEqual(ok.ok, true);
  const bad = dispatch_interaction_validator(
    "correct_choice",
    interaction,
    "waste_beaker",
    null,
    {},
  );
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, "wrong_target");
});

//============================================
// validate_target_with_value
//============================================

test("validate_target_with_value: target and value match passes", () => {
  const interaction = make_interaction("pipette", "target_with_value", {
    set_volume: 100,
  });
  const result = validate_target_with_value(interaction, "pipette", { set_volume: 100 });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, null);
});

test("validate_target_with_value: wrong target rejects with wrong_target", () => {
  const interaction = make_interaction("pipette", "target_with_value", {
    set_volume: 100,
  });
  const result = validate_target_with_value(interaction, "flask", { set_volume: 100 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "wrong_target");
});

test("validate_target_with_value: right target wrong value rejects with wrong_value", () => {
  const interaction = make_interaction("pipette", "target_with_value", {
    set_volume: 100,
  });
  const result = validate_target_with_value(interaction, "pipette", { set_volume: 50 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "wrong_value");
});

//============================================
// validate_sequence_complete
//============================================

test("validate_sequence_complete: count equals sequence length passes", () => {
  const step = make_step(3, "sequence_complete");
  assert.strictEqual(validate_sequence_complete(step, 3), true);
});

test("validate_sequence_complete: count less than sequence length fails", () => {
  const step = make_step(3, "sequence_complete");
  assert.strictEqual(validate_sequence_complete(step, 2), false);
});

//============================================
// validate_final_state_matches
//============================================

test("validate_final_state_matches: snapshot matches expected state passes", () => {
  const step = make_step(1, "final_state_matches", {
    pipette: { material_name: "PBS", set_volume: 100 },
  });
  const snapshot = { pipette: { material_name: "PBS", set_volume: 100 } };
  assert.strictEqual(validate_final_state_matches(step, snapshot), true);
});

test("validate_final_state_matches: field mismatch fails", () => {
  const step = make_step(1, "final_state_matches", {
    pipette: { material_name: "PBS", set_volume: 100 },
  });
  const snapshot = { pipette: { material_name: "PBS", set_volume: 50 } };
  assert.strictEqual(validate_final_state_matches(step, snapshot), false);
});

test("validate_final_state_matches: missing object in snapshot fails", () => {
  const step = make_step(1, "final_state_matches", {
    pipette: { material_name: "PBS" },
  });
  const snapshot = { flask: { is_empty: false } };
  assert.strictEqual(validate_final_state_matches(step, snapshot), false);
});

//============================================
// dispatch_interaction_validator
//============================================

test("dispatch_interaction_validator: routes correct_target", () => {
  const interaction = make_interaction("pipette", "correct_target");
  const result = dispatch_interaction_validator("correct_target", interaction, "pipette");
  assert.strictEqual(result.ok, true);
});

test("dispatch_interaction_validator: routes target_with_value with value_map", () => {
  const interaction = make_interaction("pipette", "target_with_value", { set_volume: 100 });
  const result = dispatch_interaction_validator("target_with_value", interaction, "pipette", null, {
    set_volume: 100,
  });
  assert.strictEqual(result.ok, true);
});

//============================================
// dispatch_step_validator
//============================================

test("dispatch_step_validator: routes sequence_complete", () => {
  const step = make_step(2, "sequence_complete");
  assert.strictEqual(dispatch_step_validator("sequence_complete", step, 2), true);
});

test("dispatch_step_validator: routes final_state_matches with snapshot", () => {
  const step = make_step(1, "final_state_matches", { pipette: { material_name: "PBS" } });
  const ok = dispatch_step_validator("final_state_matches", step, 1, {
    pipette: { material_name: "PBS" },
  });
  assert.strictEqual(ok, true);
});

test("dispatch_step_validator: unknown preset throws at runtime", () => {
  const step = make_step(1, "sequence_complete");
  assert.throws(
    () => dispatch_step_validator(/** @type {any} */ ("bogus_preset"), step, 1),
    /Unknown step validator preset/,
  );
});
