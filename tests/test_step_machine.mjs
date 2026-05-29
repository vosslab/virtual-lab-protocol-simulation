// tests/test_step_machine.mjs
//
// Node --test suite for the protocol step machine.
// Covers start, click happy path, wrong_target rejection, step
// completion + next_step transition, terminal step + no_active_step,
// retry path, modal_close (correct_choice), and snapshot reducer.

import { test, describe } from "node:test";
import assert from "node:assert";

import { createProtocolShellEmitter } from "../src/scene_runtime/protocol/emitter.ts";
import {
  create_step_machine,
  initial_snapshot,
  create_snapshot_reducer,
} from "../src/scene_runtime/protocol/step_machine.ts";

//============================================
// Fixture builders
//============================================

function make_click_step(name, target, next_step) {
  return {
    step_name: name,
    prompt: `Click ${target}`,
    sequence: [
      {
        target,
        gesture: "click",
        validator: { preset: "correct_target" },
        response: { scene_operations: [] },
      },
    ],
    step_validator: { preset: "sequence_complete" },
    outcome: { on_success: "complete", on_failure: "retry" },
    next_step,
  };
}

function make_two_click_step(name, t1, t2, next_step) {
  return {
    step_name: name,
    prompt: "Click two things",
    sequence: [
      {
        target: t1,
        gesture: "click",
        validator: { preset: "correct_target" },
        response: {
          scene_operations: [{ type: "SceneChange", to_scene: "scene_b" }],
        },
      },
      {
        target: t2,
        gesture: "click",
        validator: { preset: "correct_target" },
        response: { scene_operations: [] },
      },
    ],
    step_validator: { preset: "sequence_complete" },
    outcome: { on_success: "complete", on_failure: "retry" },
    next_step,
  };
}

function make_config(steps, entry_step) {
  return {
    protocol_name: "test_proto",
    protocol_type: "mini_protocol",
    entry_step,
    steps,
  };
}

function build_harness(config) {
  const events = [];
  const scene_ops = [];
  const start_snapshot = initial_snapshot(config.protocol_name);
  const reducer = create_snapshot_reducer(config);
  const emitter = createProtocolShellEmitter(start_snapshot, reducer);
  emitter.subscribe((event) => events.push(event));
  const machine = create_step_machine(config, emitter, (op) => scene_ops.push(op));
  return { machine, events, scene_ops, emitter };
}

function kinds(events) {
  return events.map((e) => e.kind);
}

//============================================
// Tests
//============================================

describe("step machine - start", () => {
  test("emits protocol_loaded then step_started for entry_step", () => {
    const cfg = make_config([make_click_step("a", "obj_a", null)], "a");
    const { machine, events } = build_harness(cfg);
    machine.start();
    const k = kinds(events);
    assert.strictEqual(k[0], "protocol_loaded");
    assert.strictEqual(k[1], "step_started");
    const loaded = events[0];
    assert.strictEqual(loaded.entry_step_name, "a");
    assert.strictEqual(loaded.total_step_count, 1);
    assert.strictEqual(events[1].step_name, "a");
  });
});

describe("step machine - happy path click", () => {
  test("validated click advances interaction_index and emits interaction_validated", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, events, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("t1", "click");
    const validated = events.find((e) => e.kind === "interaction_validated");
    assert.ok(validated);
    assert.strictEqual(validated.target_name, "t1");
    assert.strictEqual(validated.interaction_index, 0);
    assert.strictEqual(emitter.get_snapshot().current_interaction_index, 1);
  });

  test("scene_operation_applied and scene_changed fire for SceneChange op", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, events, scene_ops } = build_harness(cfg);
    machine.start();
    machine.handle_click("t1", "click");
    assert.strictEqual(scene_ops.length, 1);
    assert.strictEqual(scene_ops[0].type, "SceneChange");
    const k = kinds(events);
    assert.ok(k.includes("scene_operation_applied"));
    assert.ok(k.includes("scene_changed"));
  });
});

describe("step machine - wrong target", () => {
  test("emits interaction_rejected with reason wrong_target; no advance", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, events, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("oops", "click");
    const rejected = events.find((e) => e.kind === "interaction_rejected");
    assert.ok(rejected);
    assert.strictEqual(rejected.reason_code, "wrong_target");
    assert.strictEqual(emitter.get_snapshot().current_interaction_index, 0);
    // No interaction_validated should have fired.
    assert.ok(!events.some((e) => e.kind === "interaction_validated"));
  });
});

describe("step machine - step completion and next_step", () => {
  test("all interactions validated -> step_completed complete + next step_started", () => {
    const cfg = make_config(
      [make_click_step("a", "obj_a", "b"), make_click_step("b", "obj_b", null)],
      "a",
    );
    const { machine, events } = build_harness(cfg);
    machine.start();
    machine.handle_click("obj_a", "click");
    const completed = events.find((e) => e.kind === "step_completed" && e.step_name === "a");
    assert.ok(completed);
    assert.strictEqual(completed.resolution, "complete");
    // step_started for "b" must follow.
    const started_b = events.find((e) => e.kind === "step_started" && e.step_name === "b");
    assert.ok(started_b);
  });
});

describe("step machine - terminal step + protocol_completed", () => {
  test("emits protocol_completed; subsequent clicks emit no_active_step", () => {
    const cfg = make_config([make_click_step("a", "obj_a", null)], "a");
    const { machine, events, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("obj_a", "click");
    const done = events.find((e) => e.kind === "protocol_completed");
    assert.ok(done);
    assert.strictEqual(emitter.get_snapshot().is_complete, true);

    const before = events.length;
    machine.handle_click("obj_a", "click");
    const new_events = events.slice(before);
    const rejected = new_events.find((e) => e.kind === "interaction_rejected");
    assert.ok(rejected);
    assert.strictEqual(rejected.reason_code, "no_active_step");
  });
});

describe("step machine - retry path", () => {
  test("step_validator fail -> step_completed(retry) + interaction_index resets", () => {
    // Use final_state_matches with empty snapshot to force false.
    const step = {
      step_name: "a",
      prompt: "go",
      sequence: [
        {
          target: "t1",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
      ],
      step_validator: {
        preset: "final_state_matches",
        params: { some_obj: { field: "expected" } },
      },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step], "a");
    const { machine, events, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("t1", "click");
    const completed = events.filter((e) => e.kind === "step_completed");
    assert.ok(completed.length >= 1);
    assert.strictEqual(completed[0].resolution, "retry");
    // Sequence restarts: a second step_started for "a".
    const started_a = events.filter((e) => e.kind === "step_started" && e.step_name === "a");
    assert.ok(started_a.length >= 2);
    assert.strictEqual(emitter.get_snapshot().current_interaction_index, 0);
  });
});

describe("step machine - modal close drives correct_choice", () => {
  test("commit with correct choice_id validates", () => {
    const step = {
      step_name: "a",
      prompt: "pick",
      sequence: [
        {
          target: "modal_target",
          gesture: "select",
          validator: {
            preset: "correct_choice",
            params: { choice_id: "yes" },
          },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step], "a");
    const { machine, events } = build_harness(cfg);
    machine.start();
    machine.handle_modal_close(true, "yes");
    const validated = events.find((e) => e.kind === "interaction_validated");
    assert.ok(validated);
    const done = events.find((e) => e.kind === "protocol_completed");
    assert.ok(done);
  });

  test("commit with wrong choice_id rejects with wrong_value", () => {
    const step = {
      step_name: "a",
      prompt: "pick",
      sequence: [
        {
          target: "modal_target",
          gesture: "select",
          validator: {
            preset: "correct_choice",
            params: { choice_id: "yes" },
          },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step], "a");
    const { machine, events } = build_harness(cfg);
    machine.start();
    machine.handle_modal_close(true, "no");
    const rejected = events.find((e) => e.kind === "interaction_rejected");
    assert.ok(rejected);
    assert.strictEqual(rejected.reason_code, "wrong_value");
  });
});

describe("step machine - reducer snapshot derivation", () => {
  test("snapshot tracks current_step_name, progress, last_outcome, is_complete", () => {
    const cfg = make_config(
      [make_click_step("a", "obj_a", "b"), make_click_step("b", "obj_b", null)],
      "a",
    );
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    let snap = emitter.get_snapshot();
    assert.strictEqual(snap.current_step_name, "a");
    assert.strictEqual(snap.progress.total_step_count, 2);
    assert.strictEqual(snap.is_complete, false);

    machine.handle_click("obj_a", "click");
    snap = emitter.get_snapshot();
    assert.strictEqual(snap.current_step_name, "b");
    assert.ok(snap.last_outcome);
    assert.strictEqual(snap.last_outcome.step_name, "a");
    assert.strictEqual(snap.last_outcome.resolution, "complete");
    assert.strictEqual(snap.progress.completed_step_count, 1);

    machine.handle_click("obj_b", "click");
    snap = emitter.get_snapshot();
    assert.strictEqual(snap.is_complete, true);
    assert.strictEqual(snap.progress.completed_step_count, 2);
  });
});

describe("step machine - active_interaction_target and active_interaction_gesture", () => {
  test("step_started sets target and gesture to the first interaction", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    const snap = emitter.get_snapshot();
    assert.strictEqual(snap.active_interaction_target, "t1");
    assert.strictEqual(snap.active_interaction_gesture, "click");
  });

  test("interaction_validated advances target and gesture to the next interaction", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("t1", "click");
    const snap = emitter.get_snapshot();
    assert.strictEqual(snap.active_interaction_target, "t2");
    assert.strictEqual(snap.active_interaction_gesture, "click");
  });

  test("last interaction validates -> target and gesture become null", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    machine.handle_click("t1", "click");
    machine.handle_click("t2", "click");
    const snap = emitter.get_snapshot();
    assert.strictEqual(snap.active_interaction_target, null);
    assert.strictEqual(snap.active_interaction_gesture, null);
  });

  test("step_completed clears target and gesture", () => {
    const cfg = make_config(
      [make_click_step("a", "obj_a", "b"), make_click_step("b", "obj_b", null)],
      "a",
    );
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    let snap = emitter.get_snapshot();
    assert.strictEqual(snap.active_interaction_target, "obj_a");
    assert.strictEqual(snap.active_interaction_gesture, "click");
    machine.handle_click("obj_a", "click");
    snap = emitter.get_snapshot();
    // After step_completed and step_started for "b", the target/gesture
    // should be set to the first (and only) interaction of "b".
    assert.strictEqual(snap.active_interaction_target, "obj_b");
    assert.strictEqual(snap.active_interaction_gesture, "click");
  });

  test("protocol_completed clears target and gesture", () => {
    const cfg = make_config([make_click_step("a", "obj_a", null)], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    assert.strictEqual(emitter.get_snapshot().active_interaction_target, "obj_a");
    machine.handle_click("obj_a", "click");
    const snap = emitter.get_snapshot();
    assert.strictEqual(snap.is_complete, true);
    assert.strictEqual(snap.active_interaction_target, null);
    assert.strictEqual(snap.active_interaction_gesture, null);
  });

  test("interaction_rejected does not change target or gesture", () => {
    const cfg = make_config([make_two_click_step("a", "t1", "t2", null)], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    const before = emitter.get_snapshot();
    assert.strictEqual(before.active_interaction_target, "t1");
    machine.handle_click("wrong", "click");
    const after = emitter.get_snapshot();
    assert.strictEqual(after.active_interaction_target, "t1");
    assert.strictEqual(after.active_interaction_gesture, "click");
  });
});

describe("step machine - current_tip snapshot field", () => {
  test("current_tip is set from step.tip on step_started", () => {
    const step = {
      step_name: "a",
      prompt: "Click the bottle",
      tip: "Make sure the cap is loose before clicking.",
      sequence: [
        {
          target: "obj_a",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    assert.strictEqual(
      emitter.get_snapshot().current_tip,
      "Make sure the cap is loose before clicking.",
    );
  });

  test("current_tip reverts to null when protocol completes", () => {
    const step = {
      step_name: "a",
      prompt: "Click the bottle",
      tip: "Tip text here.",
      sequence: [
        {
          target: "obj_a",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    assert.strictEqual(emitter.get_snapshot().current_tip, "Tip text here.");
    machine.handle_click("obj_a", "click");
    assert.strictEqual(emitter.get_snapshot().is_complete, true);
    assert.strictEqual(emitter.get_snapshot().current_tip, null);
  });

  test("current_tip transitions from tip step to null step on next_step", () => {
    const step_with_tip = {
      step_name: "a",
      prompt: "Step A",
      tip: "Here is the tip.",
      sequence: [
        {
          target: "obj_a",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: "b",
    };
    const step_no_tip = {
      step_name: "b",
      prompt: "Step B",
      sequence: [
        {
          target: "obj_b",
          gesture: "click",
          validator: { preset: "correct_target" },
          response: { scene_operations: [] },
        },
      ],
      step_validator: { preset: "sequence_complete" },
      outcome: { on_success: "complete", on_failure: "retry" },
      next_step: null,
    };
    const cfg = make_config([step_with_tip, step_no_tip], "a");
    const { machine, emitter } = build_harness(cfg);
    machine.start();
    assert.strictEqual(emitter.get_snapshot().current_tip, "Here is the tip.");
    machine.handle_click("obj_a", "click");
    // Step B has no tip; current_tip must be null.
    assert.strictEqual(emitter.get_snapshot().current_tip, null);
  });
});
