// src/shell/signals.ts
//
// Re-exports createSignal, createMemo, createEffect from Solid.js for use
// throughout the shell. Provides subscribeEmitterToSnapshot, a helper that
// binds a ProtocolShellEmitter to a Solid signal and returns the accessor
// (read-only).
//
// The shell never mutates protocol state; it observes only. Callers create
// derived memos for projections (e.g., modal visibility from snapshot).

export { createSignal, createMemo, createEffect } from "solid-js";

import type { ProtocolShellEmitter, ShellViewSnapshot } from "./adapter/types";
import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";

//============================================
// Emitter to signal binding
//============================================

// Subscribe a ProtocolShellEmitter to a Solid signal. Seeds the signal with
// the emitter's current snapshot, then updates it on every event. Returns
// the accessor only (read-only); the caller never has direct access to the
// setter and cannot mutate the protocol state.
export function subscribeEmitterToSnapshot(
  emitter: ProtocolShellEmitter,
): Accessor<ShellViewSnapshot> {
  const initial_snapshot: ShellViewSnapshot = emitter.get_snapshot();
  const [snapshot, setSnapshot] = createSignal<ShellViewSnapshot>(initial_snapshot);

  // Subscribe to the emitter. On every event, update the signal with the
  // emitter's new snapshot. Cleanup is the caller's responsibility via
  // createEffect or createRoot disposal.
  emitter.subscribe(() => {
    const latest_snapshot: ShellViewSnapshot = emitter.get_snapshot();
    setSnapshot(latest_snapshot);
  });

  return snapshot;
}
