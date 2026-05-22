/**
 * test_render_apply_state_scene.mjs
 *
 * Unit tests for ObjectStateChange and SceneChange appliers.
 *
 * Tests:
 * (a) ObjectStateChange mutates only the named object's state field; original world unchanged.
 * (b) SceneChange changes active scene; protocol state and object states preserved.
 * (c) Each applier returns a fresh world reference.
 *
 * Run with: node --test tests/test_render_apply_state_scene.mjs
 */

import { strict as assert } from "assert";
import { test } from "node:test";
import { importTsModule } from "./_compile_for_test.mjs";

// Compile the TypeScript modules to JS.
const rendererModule = await importTsModule(
  "src/scene_runtime/render/apply.ts",
);
const { applyObjectStateChange, applySceneChange } = rendererModule;

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
      flask: { object_name: "flask", kind: "flask" },
      pipette: { object_name: "pipette", kind: "pipette" },
    },
    objectStates: {
      flask: { filled: "empty" },
      pipette: { volume: 0 },
    },
    cursorState: {
      attachedTo: null,
      operation: null,
    },
    pendingEvents: [],
  };
}

// ============================================
// Test: ObjectStateChange mutates only the target object

test("ObjectStateChange: mutates target object state only", () => {
  const world = createTestWorld();
  const flaskStateBeforeOp = world.objectStates.flask;
  const pipetteStateBeforeOp = world.objectStates.pipette;

  const op = {
    type: "ObjectStateChange",
    target: "flask",
    state: { filled: "full" },
  };

  const nextWorld = applyObjectStateChange(world, op);

  // Original world is unchanged.
  assert.deepEqual(world.objectStates.flask, flaskStateBeforeOp);
  assert.deepEqual(world.objectStates.pipette, pipetteStateBeforeOp);

  // New world has updated state for the target object.
  assert.strictEqual(nextWorld.objectStates.flask.filled, "full");

  // Other objects are unchanged in the new world.
  assert.deepEqual(nextWorld.objectStates.pipette, pipetteStateBeforeOp);

  // Protocol, scenes, and cursor are unchanged.
  assert.strictEqual(nextWorld.protocol, world.protocol);
  assert.strictEqual(nextWorld.scenes, world.scenes);
  assert.strictEqual(nextWorld.cursorState, world.cursorState);
});

// ============================================
// Test: ObjectStateChange returns a fresh RuntimeWorld reference

test("ObjectStateChange: returns a fresh world reference", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    target: "flask",
    state: { filled: "full" },
  };

  const nextWorld = applyObjectStateChange(world, op);

  // The worlds are different objects.
  assert.notStrictEqual(nextWorld, world);

  // But objectStates is a different object too (spread at changed branch).
  assert.notStrictEqual(nextWorld.objectStates, world.objectStates);

  // Other records (protocol, scenes, cursor) are reused (spread is at ObjectStates level).
  assert.strictEqual(nextWorld.protocol, world.protocol);
  assert.strictEqual(nextWorld.scenes, world.scenes);
  assert.strictEqual(nextWorld.cursorState, world.cursorState);
});

// ============================================
// Test: ObjectStateChange merges state fields

test("ObjectStateChange: merges state into existing object state", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    target: "pipette",
    state: { volume: 5 },
  };

  const nextWorld = applyObjectStateChange(world, op);

  // The pipette state is merged (volume updated, other fields if any preserved).
  assert.strictEqual(nextWorld.objectStates.pipette.volume, 5);

  // Original is unchanged.
  assert.strictEqual(world.objectStates.pipette.volume, 0);
});

// ============================================
// Test: SceneChange changes active scene only

test("SceneChange: changes active scene only", () => {
  const world = createTestWorld();
  const protocolBefore = world.protocol;
  const objectStatesBefore = world.objectStates;

  const op = {
    type: "SceneChange",
    to_scene: "incubator_workspace",
  };

  const nextWorld = applySceneChange(world, op);

  // Active scene changed.
  assert.strictEqual(nextWorld.activeSceneId, "incubator_workspace");

  // Original active scene unchanged.
  assert.strictEqual(world.activeSceneId, "hood_workspace");

  // Protocol, object states, and cursor are unchanged.
  assert.strictEqual(nextWorld.protocol, protocolBefore);
  assert.strictEqual(nextWorld.objectStates, objectStatesBefore);
  assert.strictEqual(nextWorld.cursorState, world.cursorState);

  // Scenes themselves unchanged.
  assert.strictEqual(nextWorld.scenes, world.scenes);
});

// ============================================
// Test: SceneChange returns a fresh world reference

test("SceneChange: returns a fresh world reference", () => {
  const world = createTestWorld();

  const op = {
    type: "SceneChange",
    to_scene: "incubator_workspace",
  };

  const nextWorld = applySceneChange(world, op);

  // The worlds are different objects.
  assert.notStrictEqual(nextWorld, world);

  // But most records are reused (only activeSceneId changed).
  assert.strictEqual(nextWorld.protocol, world.protocol);
  assert.strictEqual(nextWorld.scenes, world.scenes);
  assert.strictEqual(nextWorld.objectStates, world.objectStates);
});

// ============================================
// Test: ObjectStateChange throws on missing target

test("ObjectStateChange: throws on missing target", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    target: "nonexistent_object",
    state: { filled: "full" },
  };

  assert.throws(
    () => applyObjectStateChange(world, op),
    /not found in objectStates/,
  );
});

// ============================================
// Test: ObjectStateChange throws on missing target field

test("ObjectStateChange: throws on missing target field", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    // target is missing
    state: { filled: "full" },
  };

  assert.throws(
    () => applyObjectStateChange(world, op),
    /missing required field 'target'/,
  );
});

// ============================================
// Test: ObjectStateChange throws on missing state field

test("ObjectStateChange: throws on missing state field", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    target: "flask",
    // state is missing
  };

  assert.throws(
    () => applyObjectStateChange(world, op),
    /missing required field 'state'/,
  );
});

// ============================================
// Test: ObjectStateChange throws on wrong op.type

test("ObjectStateChange: throws on wrong operation type", () => {
  const world = createTestWorld();

  const op = {
    type: "SceneChange",
    target: "flask",
    state: { filled: "full" },
  };

  assert.throws(
    () => applyObjectStateChange(world, op),
    /requires type 'ObjectStateChange'/,
  );
});

// ============================================
// Test: SceneChange throws on missing to_scene

test("SceneChange: throws on missing to_scene field", () => {
  const world = createTestWorld();

  const op = {
    type: "SceneChange",
    // to_scene is missing
  };

  assert.throws(
    () => applySceneChange(world, op),
    /missing required field 'to_scene'/,
  );
});

// ============================================
// Test: SceneChange throws on nonexistent scene

test("SceneChange: throws on nonexistent scene", () => {
  const world = createTestWorld();

  const op = {
    type: "SceneChange",
    to_scene: "nonexistent_scene",
  };

  assert.throws(() => applySceneChange(world, op), /not found in scenes/);
});

// ============================================
// Test: SceneChange throws on wrong op.type

test("SceneChange: throws on wrong operation type", () => {
  const world = createTestWorld();

  const op = {
    type: "ObjectStateChange",
    to_scene: "incubator_workspace",
  };

  assert.throws(
    () => applySceneChange(world, op),
    /requires type 'SceneChange'/,
  );
});
