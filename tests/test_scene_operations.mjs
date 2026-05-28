// tests/test_scene_operations.mjs
//
// Node --test suite for the scene operations dispatcher.
// Tests: each primitive routes to the correct dep with the correct argument,
// unknown op.type cast as any throws with proper exhaustiveness guard,
// and handler is stateless (pure routing).

import { test, describe } from "node:test";
import assert from "node:assert";

import { create_scene_op_handler } from "../src/scene_runtime/protocol/scene_operations.ts";

//============================================
// Test fixture: mock dependencies
//============================================

/**
 * Create a mock dependency object that records calls.
 * Each dep returns a function that pushes a record to a calls array.
 */
function createMockDeps() {
  const calls = {
    apply_object_state: [],
    apply_cursor_attach: [],
    apply_scene_change: [],
    apply_layout_move: [],
    start_timed_wait: [],
  };

  const deps = {
    apply_object_state: (op) => {
      calls.apply_object_state.push(op);
    },
    apply_cursor_attach: (op) => {
      calls.apply_cursor_attach.push(op);
    },
    apply_scene_change: (op) => {
      calls.apply_scene_change.push(op);
    },
    apply_layout_move: (op) => {
      calls.apply_layout_move.push(op);
    },
    start_timed_wait: (op) => {
      calls.start_timed_wait.push(op);
    },
  };

  return { deps, calls };
}

//============================================
// Tests
//============================================

describe("scene_operations dispatcher", () => {
  test("ObjectStateChange routes to apply_object_state with correct argument", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "ObjectStateChange",
      target: "sample_vial_1",
      state: {
        material_name: "ethanol",
        material_volume: 500,
      },
    };

    handler(op);

    assert.strictEqual(calls.apply_object_state.length, 1);
    assert.deepStrictEqual(calls.apply_object_state[0], op);
    assert.strictEqual(calls.apply_cursor_attach.length, 0);
    assert.strictEqual(calls.apply_scene_change.length, 0);
    assert.strictEqual(calls.apply_layout_move.length, 0);
    assert.strictEqual(calls.start_timed_wait.length, 0);
  });

  test("CursorAttach routes to apply_cursor_attach with correct argument", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "CursorAttach",
      target: "p20_pipette",
      operation: "attach",
    };

    handler(op);

    assert.strictEqual(calls.apply_cursor_attach.length, 1);
    assert.deepStrictEqual(calls.apply_cursor_attach[0], op);
    assert.strictEqual(calls.apply_object_state.length, 0);
    assert.strictEqual(calls.apply_scene_change.length, 0);
    assert.strictEqual(calls.apply_layout_move.length, 0);
    assert.strictEqual(calls.start_timed_wait.length, 0);
  });

  test("SceneChange routes to apply_scene_change with correct argument", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "SceneChange",
      to_scene: "hood_workspace",
    };

    handler(op);

    assert.strictEqual(calls.apply_scene_change.length, 1);
    assert.deepStrictEqual(calls.apply_scene_change[0], op);
    assert.strictEqual(calls.apply_object_state.length, 0);
    assert.strictEqual(calls.apply_cursor_attach.length, 0);
    assert.strictEqual(calls.apply_layout_move.length, 0);
    assert.strictEqual(calls.start_timed_wait.length, 0);
  });

  test("LayoutMove routes to apply_layout_move with correct argument", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "LayoutMove",
      target: "flask_500ml",
      zone: "workspace_mid",
    };

    handler(op);

    assert.strictEqual(calls.apply_layout_move.length, 1);
    assert.deepStrictEqual(calls.apply_layout_move[0], op);
    assert.strictEqual(calls.apply_object_state.length, 0);
    assert.strictEqual(calls.apply_cursor_attach.length, 0);
    assert.strictEqual(calls.apply_scene_change.length, 0);
    assert.strictEqual(calls.start_timed_wait.length, 0);
  });

  test("TimedWait routes to start_timed_wait with correct argument", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "TimedWait",
      target: "incubator_37c",
      duration_min: 5,
      display: "Incubating...",
    };

    handler(op);

    assert.strictEqual(calls.start_timed_wait.length, 1);
    assert.deepStrictEqual(calls.start_timed_wait[0], op);
    assert.strictEqual(calls.apply_object_state.length, 0);
    assert.strictEqual(calls.apply_cursor_attach.length, 0);
    assert.strictEqual(calls.apply_scene_change.length, 0);
    assert.strictEqual(calls.apply_layout_move.length, 0);
  });

  test("multiple operations dispatch in order", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op1 = {
      type: "ObjectStateChange",
      target: "vial_1",
      state: { material_name: "water" },
    };

    const op2 = {
      type: "CursorAttach",
      target: "pipette",
      operation: "attach",
    };

    const op3 = {
      type: "SceneChange",
      to_scene: "workspace_2",
    };

    handler(op1);
    handler(op2);
    handler(op3);

    assert.strictEqual(calls.apply_object_state.length, 1);
    assert.strictEqual(calls.apply_cursor_attach.length, 1);
    assert.strictEqual(calls.apply_scene_change.length, 1);

    assert.deepStrictEqual(calls.apply_object_state[0], op1);
    assert.deepStrictEqual(calls.apply_cursor_attach[0], op2);
    assert.deepStrictEqual(calls.apply_scene_change[0], op3);
  });

  test("unknown op.type (as any) throws with exhaustiveness message", () => {
    const { deps } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    // Cast unknown type as any to bypass TypeScript compile-time check.
    // This is the runtime guard for completeness.
    const badOp = {
      type: "UnknownOperation",
      target: "something",
    };

    assert.throws(() => {
      handler(badOp);
    }, /Unknown scene operation type: UnknownOperation/);
  });

  test("handler is stateless (multiple calls, no cross-talk)", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op1 = {
      type: "ObjectStateChange",
      target: "obj_1",
      state: { value: 1 },
    };

    const op2 = {
      type: "ObjectStateChange",
      target: "obj_2",
      state: { value: 2 },
    };

    handler(op1);
    handler(op2);

    // Both calls should have been recorded independently.
    assert.strictEqual(calls.apply_object_state.length, 2);
    assert.deepStrictEqual(calls.apply_object_state[0].target, "obj_1");
    assert.deepStrictEqual(calls.apply_object_state[1].target, "obj_2");
  });

  test("ObjectStateChange with optional transition field", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "ObjectStateChange",
      target: "flask",
      state: { material_name: "pbs" },
      transition: "fade_in",
    };

    handler(op);

    assert.strictEqual(calls.apply_object_state.length, 1);
    assert.deepStrictEqual(calls.apply_object_state[0], op);
    assert.strictEqual(calls.apply_object_state[0].transition, "fade_in");
  });

  test("CursorAttach detach operation", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "CursorAttach",
      target: "tool",
      operation: "detach",
    };

    handler(op);

    assert.strictEqual(calls.apply_cursor_attach.length, 1);
    assert.deepStrictEqual(calls.apply_cursor_attach[0].operation, "detach");
  });

  test("TimedWait without optional display field", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "TimedWait",
      target: "timer",
      duration_min: 30,
    };

    handler(op);

    assert.strictEqual(calls.start_timed_wait.length, 1);
    assert.deepStrictEqual(calls.start_timed_wait[0], op);
    assert.strictEqual(calls.start_timed_wait[0].display, undefined);
  });

  test("deps are called with exact operation object (no copying)", () => {
    const { deps, calls } = createMockDeps();
    const handler = create_scene_op_handler(deps);

    const op = {
      type: "SceneChange",
      to_scene: "workspace",
    };

    handler(op);

    // The dep should have received the exact same object reference.
    assert.strictEqual(calls.apply_scene_change[0], op);
  });
});
