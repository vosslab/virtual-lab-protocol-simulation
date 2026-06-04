// src/shell/signals.ts
//
// Re-exports createSignal, createMemo, createEffect from Solid.js for use
// throughout the shell. Provides subscribeEmitterToSnapshot, a helper that
// binds a ProtocolShellEmitter to a Solid signal and returns the read-only
// accessor together with the emitter unsubscribe handle.
//
// The shell never mutates protocol state; it observes only. Callers create
// derived memos for projections (e.g., modal visibility from snapshot).

export { createSignal, createMemo, createEffect } from "solid-js";

import type { ProtocolShellEmitter, ShellViewSnapshot, UnsubscribeFn } from "./adapter/types";
import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";

//============================================
// Emitter to signal binding
//============================================

// The result of binding an emitter to a Solid signal: a read-only accessor for
// the latest snapshot and the unsubscribe handle that releases the emitter
// subscription. The caller must invoke unsubscribe on teardown.
export type EmitterSnapshotBinding = {
  snapshot: Accessor<ShellViewSnapshot>;
  unsubscribe: UnsubscribeFn;
};

// Subscribe a ProtocolShellEmitter to a Solid signal. Seeds the signal with
// the emitter's current snapshot, then updates it on every event. Returns the
// read-only accessor plus the unsubscribe handle. The caller never has direct
// access to the setter and cannot mutate the protocol state. Callers that mount
// outside a Solid owner must invoke unsubscribe on their own teardown path
// (e.g. a pagehide listener), since onCleanup does not apply there.
export function subscribeEmitterToSnapshot(emitter: ProtocolShellEmitter): EmitterSnapshotBinding {
  const initial_snapshot: ShellViewSnapshot = emitter.get_snapshot();
  const [snapshot, setSnapshot] = createSignal<ShellViewSnapshot>(initial_snapshot);

  // Subscribe to the emitter. On every event, update the signal with the
  // emitter's new snapshot. The returned unsubscribe handle releases this
  // subscription so listeners do not accumulate across navigations.
  const unsubscribe: UnsubscribeFn = emitter.subscribe(() => {
    const latest_snapshot: ShellViewSnapshot = emitter.get_snapshot();
    setSnapshot(latest_snapshot);
  });

  return { snapshot, unsubscribe };
}
