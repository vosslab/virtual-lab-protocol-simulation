// src/scene_runtime/protocol/scene_op_deps.ts
//
// Store-driven SceneOpDeps factory (WS-M3-D). Replaces the imperative
// attribute-poking build_scene_op_deps that lived in protocol_host.tsx. Each
// scene operation primitive writes the reactive scene_store (or drives the
// scene re-render) so the Solid renderer updates visible state automatically;
// no DOM attribute is patched here.
//
// Mapping (PRIMARY_SPEC.md "Scene operations"):
//   - ObjectStateChange -> scene_store.set_object_state (partial merge of
//     declared state fields; subpart targets like "plate.A1" are seeded on
//     first write since the subpart instance set is not enumerable from the
//     PipelineResult).
//   - CursorAttach      -> scene_store.set_cursor (attach/detach). The op
//     carries no material, so only the cursor_attached flag is driven; held
//     material is set by an ObjectStateChange on the held tool's
//     held_material_* fields.
//   - SceneChange       -> re-render the target scene through the same
//     generated YAML pipeline as the initial mount, applying the reset policy
//     (scene-local vessel state clears; cursor-held tool/material persists;
//     active-target + selected flags clear; subpart state clears on leaving
//     the scene) and disposing the prior Solid root.
//   - LayoutMove        -> Option A (DECIDED via WS-M2-I, zero authored uses):
//     explicitly unsupported this pass. Reported as a clear no-op (warn), not
//     a silent skip and not a throw, so an authored protocol that later adds a
//     LayoutMove surfaces in logs without crashing a student walkthrough.
//   - TimedWait         -> keep observable semantics through the store by
//     writing the timed-wait phase onto the target's declared state when the
//     object declares the relevant fields; otherwise it is an observable
//     no-op (the step machine drives completion via handle_timer_elapsed).
//
// References:
//   - docs/PRIMARY_SPEC.md (scene operations, reset policy)
//   - docs/active_plans/active/ migration plan WS-M3-D (LayoutMove Option A,
//     reset policy test matrix, walker debug surface)
//   - src/scene_runtime/state/scene_store.ts (store API)
//   - src/scene_runtime/protocol/scene_operations.ts (SceneOpDeps interface)

import type {
  ObjectStateChangeOp,
  CursorAttachOp,
  SceneChangeOp,
  LayoutMoveOp,
  TimedWaitOp,
} from "../../shell/adapter/types.js";
import type { SceneStore, StateValue, TargetSeed } from "../state/scene_store.js";
import type { SceneOpDeps } from "./scene_operations.js";

//============================================
// Cursor-held snapshot (reset-policy carry)
//============================================

// One cursor-held target carried across a SceneChange. The reset policy keeps
// cursor-held tool + held material; everything else (vessel state, flags,
// subpart state) is dropped by reseeding the next scene's targets.
interface CursorCarry {
  target: string;
  held_material_name: string | null;
  held_material_volume: number | null;
}

// Capture every cursor-attached target's held state from the store so it can
// be reapplied after a SceneChange reseed. Reads only; no mutation.
function snapshot_cursor_carry(store: SceneStore): CursorCarry[] {
  const carry: CursorCarry[] = [];
  for (const target of Object.keys(store.state)) {
    const entry = store.state[target];
    if (entry === undefined) {
      continue;
    }
    if (entry.flags.cursor_attached) {
      carry.push({
        target,
        held_material_name: entry.flags.held_material_name,
        held_material_volume: entry.flags.held_material_volume,
      });
    }
  }
  return carry;
}

//============================================
// Subpart seeding for ObjectStateChange
//============================================

// Split a target into its object segment (before the first ".") to decide
// whether a write addresses a subpart instance that must be seeded first.
function object_segment(target: string): string {
  const dot = target.indexOf(".");
  return dot < 0 ? target : target.slice(0, dot);
}

//============================================
// Store-driven deps factory
//============================================

// Build the store-driven SceneOpDeps.
//
// store              the reactive scene store shared with the Solid renderer.
// render_scene       re-render a named scene into the scene root, applying the
//                    reset policy. The caller (protocol_host) owns the actual
//                    pipeline + mountScene call and the prior-root dispose; it
//                    passes a closure that performs the reseed-and-mount. The
//                    cursor carry is applied here AFTER that closure runs.
export function build_store_scene_op_deps(
  store: SceneStore,
  render_scene: (scene_name: string) => void,
): SceneOpDeps {
  const deps: SceneOpDeps = {
    //----------------------------------------
    apply_object_state(op: ObjectStateChangeOp): void {
      // Subpart targets ("treatment_plate.A1") are not enumerated from the
      // PipelineResult, so seed the subpart instance on first write before the
      // partial-merge. The seed uses the object segment as the object_name so
      // the store resolves the subpart state schema.
      const obj = object_segment(op.target);
      if (op.target !== obj) {
        // Subpart target: ensure the instance is seeded WITHOUT disturbing any
        // sibling target's state. seed_target is a no-op when already present.
        const seed: TargetSeed = { target: op.target, object_name: obj };
        store.seed_target(seed);
      }
      // Partial-merge the declared-state write. The store validates every key
      // against the resolved schema and throws on an undeclared key/value.
      const partial: Record<string, StateValue> = {};
      for (const key of Object.keys(op.state)) {
        const value = op.state[key];
        if (value !== undefined) {
          partial[key] = value;
        }
      }
      store.set_object_state(op.target, partial);
    },

    //----------------------------------------
    apply_cursor_attach(op: CursorAttachOp): void {
      // CursorAttach carries no material; drive only the cursor_attached flag.
      // Held material is set separately via an ObjectStateChange on the tool's
      // held_material_* fields, and is preserved by set_cursor on re-attach
      // only when this op explicitly re-supplied it (it never does here), so
      // an attach must not clobber an already-held material: read current held
      // state and carry it through.
      if (op.operation === "attach") {
        const entry = store.state[op.target];
        const held_name = entry?.flags.held_material_name ?? null;
        const held_volume = entry?.flags.held_material_volume ?? null;
        store.set_cursor(op.target, {
          attach: true,
          ...(held_name !== null ? { held_material_name: held_name } : {}),
          ...(held_volume !== null ? { held_material_volume: held_volume } : {}),
        });
      } else {
        store.set_cursor(op.target, { attach: false });
      }
    },

    //----------------------------------------
    apply_scene_change(op: SceneChangeOp): void {
      // Reset policy: capture cursor-held tool/material BEFORE the reseed, run
      // the caller's reseed-and-mount (which drops scene-local vessel state,
      // active-target/selected flags, and subpart state via seed_from_scene),
      // then reapply the cursor carry so the held tool/material survives the
      // transition.
      const carry = snapshot_cursor_carry(store);
      render_scene(op.to_scene);
      for (const c of carry) {
        // Only reapply to a target that exists in the new scene. A held tool
        // that is not placed in the next scene drops its cursor state (it is
        // not visible to re-attach to); this is the documented behavior.
        if (store.state[c.target] === undefined) {
          continue;
        }
        store.set_cursor(c.target, {
          attach: true,
          ...(c.held_material_name !== null ? { held_material_name: c.held_material_name } : {}),
          ...(c.held_material_volume !== null
            ? { held_material_volume: c.held_material_volume }
            : {}),
        });
      }
    },

    //----------------------------------------
    apply_layout_move(op: LayoutMoveOp): void {
      // Option A (DECIDED via WS-M2-I scan: zero authored LayoutMove uses).
      // Explicitly unsupported this pass: report a clear no-op rather than
      // silently skipping or throwing. If an authored protocol ever emits a
      // LayoutMove, this warning surfaces it for the follow-up that adds the
      // typed placement-override field (Option B), without crashing a walk.
      // eslint-disable-next-line no-console
      console.warn(
        `LayoutMove is unsupported this pass (target "${op.target}" -> zone "${op.zone}"); ` +
          `no-op. See migration plan WS-M2-I/WS-M3-D LayoutMove decision (Option A).`,
      );
    },

    //----------------------------------------
    start_timed_wait(op: TimedWaitOp): void {
      // TimedWait keeps observable semantics through the store WHEN the target
      // object declares a timed-wait state field. The vocabulary has no
      // dedicated timed-wait state primitive, so we only write fields the
      // object actually declares; the step machine drives phase completion via
      // handle_timer_elapsed. When the target declares no such field this is an
      // observable no-op (the spinner display is a render concern, not state).
      const entry = store.state[op.target];
      if (entry === undefined) {
        // Target not seeded in the active scene: nothing observable to write.
        // This is not an error: a timed wait may name equipment whose only
        // role is to gate step completion, not to change declared state.
        return;
      }
      // No declared timed-wait state field exists in the closed vocabulary, so
      // there is no store field to write here. The observable progress signal
      // for a TimedWait is the subsequent ObjectStateChange in the same
      // interaction response (e.g. focused: true), which writes the store.
    },
  };
  return deps;
}
