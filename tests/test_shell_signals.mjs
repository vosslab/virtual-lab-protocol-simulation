// tests/test_shell_signals.mjs
//
// Node tests for src/shell/signals.ts. Tests the subscribeEmitterToSnapshot
// binding: emitter events drive signal updates.
//
// Run with: node --import tsx --test tests/test_shell_signals.mjs

import { test } from "node:test";
import { equal } from "node:assert/strict";
import { createRoot } from "solid-js";

// Import the binding function.
import { subscribeEmitterToSnapshot } from "../src/shell/signals.ts";
import { createProtocolShellEmitter } from "../src/scene_runtime/protocol/emitter.ts";

//============================================
// Test fixtures
//============================================

// A minimal snapshot reducer that tracks event kinds but does not
// perform complex derivations. Used to verify that emitter events
// trigger signal updates.
function trivial_reducer(prev, event) {
  // For testing, we just mark the event was seen. The reducer's job is
  // to derive a new snapshot; the test verifies the signal reflects it.
  // Echo back the previous snapshot with a marker of the last event kind.
  // This is enough to verify the signal was updated.
  const next = {
    ...prev,
    current_step_name: event.kind === "step_started" ? event.step_name : prev.current_step_name,
  };
  return next;
}

// Initial snapshot for the emitter.
function initial_snapshot() {
  return {
    protocol_name: "test_protocol",
    current_step_name: null,
    current_prompt: null,
    current_interaction_index: 0,
    progress: {
      completed_step_count: 0,
      total_step_count: 1,
    },
    last_outcome: null,
    pending_validator_kind: null,
    modal: {
      is_open: false,
      kind: null,
      prompt: null,
      choices: [],
      invoking_target: null,
    },
    help: {
      is_open: false,
      topic: null,
    },
    tray: {
      items: [],
    },
    active_scene_name: null,
    is_complete: false,
  };
}

//============================================
// Tests
//============================================

test("subscribeEmitterToSnapshot seeds signal with emitter snapshot", (_t) => {
  createRoot((dispose) => {
    const emitter = createProtocolShellEmitter(initial_snapshot(), trivial_reducer);

    const snapshot_accessor = subscribeEmitterToSnapshot(emitter);
    const current = snapshot_accessor();

    equal(current.protocol_name, "test_protocol");
    equal(current.current_step_name, null);

    dispose();
  });
});

test("subscribeEmitterToSnapshot updates signal on emitter event", (_t) => {
  createRoot((dispose) => {
    const emitter = createProtocolShellEmitter(initial_snapshot(), trivial_reducer);

    const snapshot_accessor = subscribeEmitterToSnapshot(emitter);

    // Read initial state.
    const before = snapshot_accessor();
    equal(before.current_step_name, null);

    // Emit a step_started event. The reducer will set current_step_name
    // to the step name.
    emitter.emit({
      kind: "step_started",
      step_name: "test_step",
      prompt: "Do something",
      interaction_count: 1,
    });

    // Read updated state from the signal.
    const after = snapshot_accessor();
    equal(after.current_step_name, "test_step");

    dispose();
  });
});

test("subscribeEmitterToSnapshot reflects multiple events", (_t) => {
  createRoot((dispose) => {
    const emitter = createProtocolShellEmitter(initial_snapshot(), trivial_reducer);

    const snapshot_accessor = subscribeEmitterToSnapshot(emitter);

    equal(snapshot_accessor().current_step_name, null);

    // Emit first event.
    emitter.emit({
      kind: "step_started",
      step_name: "first_step",
      prompt: "Step 1",
      interaction_count: 1,
    });

    equal(snapshot_accessor().current_step_name, "first_step");

    // Emit second event.
    emitter.emit({
      kind: "step_started",
      step_name: "second_step",
      prompt: "Step 2",
      interaction_count: 1,
    });

    equal(snapshot_accessor().current_step_name, "second_step");

    dispose();
  });
});

test("subscribeEmitterToSnapshot returns accessor, not setter", (_t) => {
  createRoot((dispose) => {
    const emitter = createProtocolShellEmitter(initial_snapshot(), trivial_reducer);

    const snapshot_accessor = subscribeEmitterToSnapshot(emitter);

    // The accessor should be a function.
    equal(typeof snapshot_accessor, "function");

    // Calling it returns the snapshot.
    const snap = snapshot_accessor();
    equal(snap.protocol_name, "test_protocol");

    // No setter is exposed; the binding is read-only from the caller's
    // perspective. Mutations happen via emitter.emit only.

    dispose();
  });
});
