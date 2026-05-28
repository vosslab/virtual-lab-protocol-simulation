// src/scene_runtime/protocol/emitter.ts
//
// Typed event emitter for protocol runtime -> shell communication.
// The emitter is the single publish point for ProtocolShellEvent values.
// Subscribers receive events synchronously after state transitions.
//
// Public surface (shell-facing):
// - subscribe(listener): register a handler, return unsubscribe function
// - get_snapshot(): read current readonly snapshot
//
// Internal surface (runtime-only):
// - emit(event): dispatch an event to all subscribers and update snapshot
// (exported as RuntimeEmitterHandle, not part of the shell contract)
//
// Reference: src/shell/adapter/types.ts (seam interface contract)

import type {
  ProtocolShellEmitter,
  ProtocolShellEvent,
  ProtocolShellEventListener,
  ShellViewSnapshot,
  UnsubscribeFn,
} from "../../shell/adapter/types";

//============================================
// Internal reducer type
//============================================

// The reducer is injected at construction time so snapshot derivation
// logic stays out of this module. The emitter stores the current
// snapshot and notifies subscribers after each emit.

export type SnapshotReducer = (
  prev: ShellViewSnapshot,
  event: ProtocolShellEvent,
) => ShellViewSnapshot;

//============================================
// Emitter implementation
//============================================

export interface RuntimeEmitterHandle extends ProtocolShellEmitter {
  emit(event: ProtocolShellEvent): void;
}

function createProtocolShellEmitter(
  initial_snapshot: ShellViewSnapshot,
  reducer: SnapshotReducer,
): RuntimeEmitterHandle {
  let current_snapshot: ShellViewSnapshot = initial_snapshot;
  const listeners: Set<ProtocolShellEventListener> = new Set();

  function subscribe(listener: ProtocolShellEventListener): UnsubscribeFn {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function get_snapshot(): ShellViewSnapshot {
    return current_snapshot;
  }

  function emit(event: ProtocolShellEvent): void {
    // Apply the injected reducer to derive the new snapshot.
    current_snapshot = reducer(current_snapshot, event);

    // Notify all subscribers synchronously.
    for (const listener of listeners) {
      listener(event);
    }
  }

  const emitter: RuntimeEmitterHandle = {
    subscribe,
    get_snapshot,
    emit,
  };

  return emitter;
}

export { createProtocolShellEmitter };
