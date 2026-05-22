/**
 * test_render_apply_cursor_layout.mjs
 *
 * Unit tests for CursorAttach and LayoutMove appliers (WP-RENDER-1B).
 *
 * Tests:
 * (a) CursorAttach updates RuntimeWorld.cursorState to reflect attached object;
 *     detach reverses it.
 * (b) LayoutMove updates RuntimeWorld layout-state to reflect new position
 *     for the named target.
 * (c) Both return fresh RuntimeWorld; original unchanged.
 * (d) No visual / paint assertions (state-only in WP-RENDER-1B).
 *
 * Run with: node --test tests/test_render_apply_cursor_layout.mjs
 */

import { strict as assert } from "assert";
import { test } from "node:test";
import { importTsModule } from "./_compile_for_test.mjs";

// Compile the TypeScript modules to JS.
const rendererModule = await importTsModule(
  "src/scene_runtime/render/apply.ts",
);
const { applyCursorAttach, applyLayoutMove } = rendererModule;

// ============================================
// Fixtures: sample RuntimeWorld and operations

function createTestWorld() {
  return {
    protocol: { protocol_name: "test_protocol", entry_step: "step_one" },
    activeStepIndex: 0,
    activeSceneId: "hood_workspace",
    scenes: {
      hood_workspace: { scene_name: "hood_workspace", placements: [] },
      incubator_workspace: {
        scene_name: "incubator_workspace",
        placements: [],
      },
    },
    objects: {
      serological_pipette: {
        object_name: "serological_pipette",
        kind: "pipette",
      },
      flask: { object_name: "flask", kind: "flask" },
      treatment_plate: { object_name: "treatment_plate", kind: "plate" },
    },
    objectStates: {
      serological_pipette: { volume: 0, held_material: null },
      flask: { material: "empty" },
      treatment_plate: { filled_wells: 0 },
    },
    cursorState: {
      attachedTo: null,
      operation: null,
    },
    pendingEvents: [],
  };
}

// ============================================
// Test: CursorAttach with attach operation

test("CursorAttach: attach operation updates cursorState", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "serological_pipette",
    operation: "attach",
  };

  const nextWorld = applyCursorAttach(world, op);

  // cursorState is updated: attachedTo now references the target.
  assert.strictEqual(nextWorld.cursorState.attachedTo, "serological_pipette");
  assert.strictEqual(nextWorld.cursorState.operation, "attach");

  // Original world is unchanged.
  assert.strictEqual(world.cursorState.attachedTo, null);
  assert.strictEqual(world.cursorState.operation, null);

  // objectStates and other fields are unchanged.
  assert.strictEqual(nextWorld.objectStates, world.objectStates);
  assert.strictEqual(nextWorld.protocol, world.protocol);
});

// ============================================
// Test: CursorAttach with detach operation

test("CursorAttach: detach operation clears cursorState", () => {
  const world = createTestWorld();
  // Pre-set the cursor as if it's already attached.
  world.cursorState = {
    attachedTo: "serological_pipette",
    operation: "attach",
  };

  const op = {
    type: "CursorAttach",
    target: "serological_pipette",
    operation: "detach",
  };

  const nextWorld = applyCursorAttach(world, op);

  // cursorState is cleared: attachedTo is null.
  assert.strictEqual(nextWorld.cursorState.attachedTo, null);
  assert.strictEqual(nextWorld.cursorState.operation, "detach");

  // Original world is unchanged.
  assert.strictEqual(world.cursorState.attachedTo, "serological_pipette");
  assert.strictEqual(world.cursorState.operation, "attach");
});

// ============================================
// Test: CursorAttach returns a fresh RuntimeWorld reference

test("CursorAttach: returns a fresh world reference", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "flask",
    operation: "attach",
  };

  const nextWorld = applyCursorAttach(world, op);

  // The worlds are different objects.
  assert.notStrictEqual(nextWorld, world);

  // cursorState is a different object (spread immutability).
  assert.notStrictEqual(nextWorld.cursorState, world.cursorState);

  // Other records are reused.
  assert.strictEqual(nextWorld.protocol, world.protocol);
  assert.strictEqual(nextWorld.objectStates, world.objectStates);
});

// ============================================
// Test: CursorAttach throws on missing target field

test("CursorAttach: throws on missing target field", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    // target is missing
    operation: "attach",
  };

  assert.throws(
    () => applyCursorAttach(world, op),
    /missing required field 'target'/,
  );
});

// ============================================
// Test: CursorAttach throws on missing operation field

test("CursorAttach: throws on missing operation field", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "flask",
    // operation is missing
  };

  assert.throws(
    () => applyCursorAttach(world, op),
    /missing required field 'operation'/,
  );
});

// ============================================
// Test: CursorAttach throws on invalid operation value

test("CursorAttach: throws on invalid operation value", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "flask",
    operation: "invalid_op",
  };

  assert.throws(
    () => applyCursorAttach(world, op),
    /must be 'attach' or 'detach'/,
  );
});

// ============================================
// Test: CursorAttach throws on missing target in objectStates

test("CursorAttach: throws on target not in objectStates", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "nonexistent_object",
    operation: "attach",
  };

  assert.throws(
    () => applyCursorAttach(world, op),
    /not found in objectStates/,
  );
});

// ============================================
// Test: CursorAttach throws on wrong op.type

test("CursorAttach: throws on wrong operation type", () => {
  const world = createTestWorld();

  const op = {
    type: "LayoutMove",
    target: "flask",
    operation: "attach",
  };

  assert.throws(
    () => applyCursorAttach(world, op),
    /requires type 'CursorAttach'/,
  );
});

// ============================================
// Test: LayoutMove updates layout state

test("LayoutMove: updates layout state for target", () => {
  const world = createTestWorld();
  const originalLayoutState = world.layoutState;

  const op = {
    type: "LayoutMove",
    target: "treatment_plate",
    operation: "reposition",
  };

  const nextWorld = applyLayoutMove(world, op);

  // layoutState is updated with the target.
  assert(nextWorld.layoutState);
  assert(nextWorld.layoutState.treatment_plate);
  assert.strictEqual(
    nextWorld.layoutState.treatment_plate.target,
    "treatment_plate",
  );
  assert.strictEqual(
    nextWorld.layoutState.treatment_plate.operation,
    "reposition",
  );

  // Original world is unchanged (or layoutState was undefined, still no mutation).
  assert.strictEqual(world.layoutState, originalLayoutState);

  // objectStates and other fields are unchanged.
  assert.strictEqual(nextWorld.objectStates, world.objectStates);
  assert.strictEqual(nextWorld.protocol, world.protocol);
});

// ============================================
// Test: LayoutMove returns a fresh RuntimeWorld reference

test("LayoutMove: returns a fresh world reference", () => {
  const world = createTestWorld();

  const op = {
    type: "LayoutMove",
    target: "flask",
    operation: "reposition",
  };

  const nextWorld = applyLayoutMove(world, op);

  // The worlds are different objects.
  assert.notStrictEqual(nextWorld, world);

  // layoutState is a different object (spread immutability).
  assert.notStrictEqual(nextWorld.layoutState, world.layoutState);

  // Other records are reused.
  assert.strictEqual(nextWorld.protocol, world.protocol);
  assert.strictEqual(nextWorld.objectStates, world.objectStates);
  assert.strictEqual(nextWorld.cursorState, world.cursorState);
});

// ============================================
// Test: LayoutMove throws on missing target field

test("LayoutMove: throws on missing target field", () => {
  const world = createTestWorld();

  const op = {
    type: "LayoutMove",
    // target is missing
    operation: "reposition",
  };

  assert.throws(
    () => applyLayoutMove(world, op),
    /missing required field 'target'/,
  );
});

// ============================================
// Test: LayoutMove throws on missing operation field

test("LayoutMove: throws on missing operation field", () => {
  const world = createTestWorld();

  const op = {
    type: "LayoutMove",
    target: "flask",
    // operation is missing
  };

  assert.throws(
    () => applyLayoutMove(world, op),
    /missing required field 'operation'/,
  );
});

// ============================================
// Test: LayoutMove throws on wrong op.type

test("LayoutMove: throws on wrong operation type", () => {
  const world = createTestWorld();

  const op = {
    type: "CursorAttach",
    target: "flask",
    operation: "reposition",
  };

  assert.throws(() => applyLayoutMove(world, op), /requires type 'LayoutMove'/);
});

// ============================================
// Test: LayoutMove preserves existing layout state for other targets

test("LayoutMove: preserves existing layout state for other targets", () => {
  const world = createTestWorld();
  // Pre-set layout state for one target.
  world.layoutState = {
    flask: { target: "flask", operation: "original_move" },
  };

  const op = {
    type: "LayoutMove",
    target: "treatment_plate",
    operation: "new_move",
  };

  const nextWorld = applyLayoutMove(world, op);

  // Both targets are in layoutState.
  assert.strictEqual(nextWorld.layoutState.flask.target, "flask");
  assert.strictEqual(nextWorld.layoutState.flask.operation, "original_move");
  assert.strictEqual(
    nextWorld.layoutState.treatment_plate.target,
    "treatment_plate",
  );
  assert.strictEqual(
    nextWorld.layoutState.treatment_plate.operation,
    "new_move",
  );

  // Original is unchanged.
  assert.strictEqual(world.layoutState.treatment_plate, undefined);
});

// ============================================
// Test: CursorAttach and LayoutMove can be chained

test("CursorAttach and LayoutMove: can be applied in sequence", () => {
  const world = createTestWorld();

  const cursorOp = {
    type: "CursorAttach",
    target: "serological_pipette",
    operation: "attach",
  };

  const layoutOp = {
    type: "LayoutMove",
    target: "serological_pipette",
    operation: "follow_cursor",
  };

  const afterCursor = applyCursorAttach(world, cursorOp);
  const afterLayout = applyLayoutMove(afterCursor, layoutOp);

  // Both state changes are present.
  assert.strictEqual(afterLayout.cursorState.attachedTo, "serological_pipette");
  assert.strictEqual(
    afterLayout.layoutState.serological_pipette.operation,
    "follow_cursor",
  );

  // Original world is unchanged.
  assert.strictEqual(world.cursorState.attachedTo, null);
  assert.strictEqual(world.layoutState, undefined);
});
