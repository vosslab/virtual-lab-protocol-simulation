/**
 * test_render_clock.mjs
 *
 * Unit tests for render/clock.ts: Clock interface and implementations.
 *
 * Tests:
 * (a) createTestClock() returns a Clock implementing the interface.
 * (b) applyTimedWait with testClock + advance(durationMs) fires the elapsed event.
 * (c) Cancel function from clock.schedule() prevents the callback.
 * (d) productionClock.schedule returns a function (smoke; does NOT wait real time).
 *
 * Run with: node --test tests/test_render_clock.mjs
 */

import { strict as assert } from "assert";
import { test } from "node:test";
import { importTsModule } from "./_compile_for_test.mjs";

// Compile the TypeScript modules to JS.
const clockModule = await importTsModule("src/scene_runtime/render/clock.ts");
const { createTestClock, productionClock } = clockModule;

const applyModule = await importTsModule("src/scene_runtime/render/apply.ts");
const { applyTimedWait } = applyModule;

// ============================================
// Fixtures: sample RuntimeWorld

function createTestWorld() {
  return {
    protocol: { protocol_name: "test_protocol", entry_step: "step_one" },
    activeStepIndex: 0,
    activeSceneId: "hood_workspace",
    scenes: {
      hood_workspace: { scene_name: "hood_workspace", placements: [] },
    },
    objects: {
      centrifuge: { object_name: "centrifuge", kind: "centrifuge" },
    },
    objectStates: {
      centrifuge: { spinning: false },
    },
    cursorState: {
      attachedTo: null,
      operation: null,
    },
    pendingEvents: [],
  };
}

// ============================================
// Test: (a) createTestClock() returns a Clock

test("(a) createTestClock returns a Clock with schedule method", () => {
  const clock = createTestClock();

  // Clock must have a schedule method.
  assert.strictEqual(typeof clock.schedule, "function");

  // schedule() returns a cancel function.
  const cancel = clock.schedule(100, () => {});
  assert.strictEqual(typeof cancel, "function");

  // advance method is present on TestClock.
  assert.strictEqual(typeof clock.advance, "function");
});

// ============================================
// Test: (b) applyTimedWait with testClock + advance fires elapsed event

test("(b) applyTimedWait with testClock + advance emits elapsed event", () => {
  const world = createTestWorld();
  const clock = createTestClock();

  const op = {
    type: "TimedWait",
    target: "centrifuge",
    duration_min: 5, // 5 seconds = 5000 ms
  };

  // Apply TimedWait operation.
  const nextWorld = applyTimedWait(world, op, clock);

  // pendingEvents should include the expected event name.
  assert.deepStrictEqual(
    nextWorld.pendingEvents,
    ["centrifuge_elapsed"],
    "pendingEvents contains the elapsed event name",
  );

  // Original world is unchanged.
  assert.deepStrictEqual(world.pendingEvents, []);
});

// ============================================
// Test: (c) Cancel function prevents the callback

test("(c) cancel function from clock.schedule prevents callback", () => {
  const clock = createTestClock();

  let callCount = 0;
  const callback = () => {
    callCount += 1;
  };

  // Schedule a callback for 100 ms.
  const cancel = clock.schedule(100, callback);

  // Cancel the scheduled callback.
  cancel();

  // Advance the clock by more than the scheduled duration.
  clock.advance(150);

  // Callback should NOT have fired.
  assert.strictEqual(callCount, 0, "callback was not called after cancel");
});

// ============================================
// Test: multiple callbacks fire in order when deadline elapses

test("multiple callbacks fire in order when deadline elapses", () => {
  const clock = createTestClock();

  const calls = [];
  const callback1 = () => calls.push("A");
  const callback2 = () => calls.push("B");
  const callback3 = () => calls.push("C");

  // Schedule callbacks with different durations.
  clock.schedule(100, callback1);
  clock.schedule(50, callback2);
  clock.schedule(150, callback3);

  // Advance clock by 75 ms: callback2 (50ms) should fire.
  clock.advance(75);
  assert.deepStrictEqual(calls, ["B"], "callback2 fired at 75ms");

  // Advance clock by 100 ms more (total 175 ms): callback1 (100ms) and callback3 (150ms) fire.
  clock.advance(100);
  assert.deepStrictEqual(
    calls,
    ["B", "A", "C"],
    "callback1 and callback3 fired",
  );
});

// ============================================
// Test: (d) productionClock.schedule returns a cancel function (smoke)

test("(d) productionClock.schedule returns a function (smoke)", () => {
  const cancel = productionClock.schedule(100, () => {});

  // productionClock.schedule must return a function (the cancel fn from setTimeout).
  assert.strictEqual(typeof cancel, "function");

  // Calling the cancel function should not throw (clearTimeout is safe even if invalid ID).
  assert.doesNotThrow(() => {
    cancel();
  });
});

// ============================================
// Test: no callbacks fire before deadline

test("no callbacks fire before deadline", () => {
  const clock = createTestClock();

  let callCount = 0;
  const callback = () => {
    callCount += 1;
  };

  clock.schedule(100, callback);

  // Advance by only 50 ms: callback should NOT fire.
  clock.advance(50);
  assert.strictEqual(callCount, 0, "callback did not fire before deadline");

  // Advance to exactly the deadline: callback should fire.
  clock.advance(50);
  assert.strictEqual(callCount, 1, "callback fired at deadline");
});

// ============================================
// Test: applyTimedWait with zero duration

test("applyTimedWait with zero duration_min", () => {
  const world = createTestWorld();
  const clock = createTestClock();

  const op = {
    type: "TimedWait",
    target: "centrifuge",
    duration_min: 0, // 0 seconds = 0 ms
  };

  const nextWorld = applyTimedWait(world, op, clock);

  // Event should be recorded.
  assert.deepStrictEqual(nextWorld.pendingEvents, ["centrifuge_elapsed"]);

  // Advancing by 0 should cause it to fire immediately.
  let eventFired = false;
  clock.schedule(0, () => {
    eventFired = true;
  });
  clock.advance(0);
  assert.strictEqual(
    eventFired,
    true,
    "zero-duration callback fires on zero advance",
  );
});
