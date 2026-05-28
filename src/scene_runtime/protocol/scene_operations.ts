// src/scene_runtime/protocol/scene_operations.ts
//
// Scene operations dispatcher. Routes typed SceneOperation primitives to
// the existing renderer and layout engine. Converts protocol state changes
// into imperative calls on the scene runtime.
//
// Five primitives per PRIMARY_SPEC.md:
// - ObjectStateChange: mutates object state (material, set_point fields)
// - CursorAttach: attaches/detaches cursor from object
// - SceneChange: transitions scene context
// - LayoutMove: repositions object to new zone
// - TimedWait: starts a timed phase with optional display
//
// Exhaustiveness is enforced at compile time via the 'never' type in the
// default case.
//
// Integration gaps (documented inline): if a renderer surface is missing
// for a primitive, the dep is a no-op stub with a console.warn.
//
// References:
// - src/shell/adapter/types.ts (SceneOperation discriminated union)
// - docs/specs/PROTOCOL_VOCABULARY.md (scene_operation primitives)
// - docs/PRIMARY_SPEC.md (scene operations section)
// - src/scene_runtime/renderer/index.ts (existing renderer exports)

import type {
  SceneOperation,
  ObjectStateChangeOp,
  CursorAttachOp,
  SceneChangeOp,
  LayoutMoveOp,
  TimedWaitOp,
} from "../../shell/adapter/types";

//============================================
// Dependency interface (injected, not hard-imported)
//============================================

/**
 * Injected renderer-facing dependencies.
 * Minimal call signatures to avoid hard import cycles.
 * Each dep corresponds to one scene operation primitive.
 */
export interface SceneOpDeps {
  /**
   * Apply ObjectStateChange to a target object.
   * Mutates object state fields: material_name, material_volume,
   * held_material_name, held_material_volume, set_volume, set_temperature,
   * set_rpm, etc. Called after the interaction is validated.
   */
  apply_object_state(op: ObjectStateChangeOp): void;

  /**
   * Attach or detach cursor from a target object.
   * CursorAttach is used to show that an object is "held" by the cursor.
   * Integration gap: if renderer has no cursor attachment surface,
   * this dep is a no-op stub with a console.warn.
   */
  apply_cursor_attach(op: CursorAttachOp): void;

  /**
   * Transition scene context.
   * Loads a new scene by name and renders it. Invalidates all
   * target references; scene adapter resolves new targets.
   */
  apply_scene_change(op: SceneChangeOp): void;

  /**
   * Move object to a new layout zone.
   * Repositions a scene object within the layout grid.
   * Integration gap: if layout engine is read-only from protocol,
   * this dep is a no-op stub with a console.warn.
   */
  apply_layout_move(op: LayoutMoveOp): void;

  /**
   * Start a timed phase.
   * Begin a duration-based delay (e.g. incubation, aspiration).
   * Optional display text (e.g. "Incubating...") may be shown.
   * Integration gap: if no timed-wait display surface exists,
   * this dep is a no-op stub with a console.warn.
   */
  start_timed_wait(op: TimedWaitOp): void;
}

//============================================
// Handler factory
//============================================

/**
 * Create a scene operation handler from injected dependencies.
 * Returns a function that switches on op.type with compile-time exhaustiveness.
 * Unknown types cause a TypeScript error (never type in default case).
 *
 * No DOM access. No event emission (that is the runtime's job).
 *
 * @param deps Injected renderer-facing dependency functions
 * @returns Handler function that dispatches scene operations
 */
export function create_scene_op_handler(deps: SceneOpDeps): SceneOpHandler {
  function handler(op: SceneOperation): void {
    switch (op.type) {
      case "ObjectStateChange": {
        deps.apply_object_state(op);
        break;
      }
      case "CursorAttach": {
        deps.apply_cursor_attach(op);
        break;
      }
      case "SceneChange": {
        deps.apply_scene_change(op);
        break;
      }
      case "LayoutMove": {
        deps.apply_layout_move(op);
        break;
      }
      case "TimedWait": {
        deps.start_timed_wait(op);
        break;
      }
      default: {
        // Compile-time exhaustiveness: if a new SceneOperation type is added
        // to the union, this default case will never be reached (TypeScript
        // error). This ensures every primitive is routed explicitly.
        const exhaustive_check: never = op;
        throw new Error(
          `Unknown scene operation type: ${String((exhaustive_check as SceneOperation).type)}`,
        );
      }
    }
  }

  return handler;
}

//============================================
// Public handler type
//============================================

/**
 * A scene operation handler routes a single SceneOperation to the renderer.
 */
export type SceneOpHandler = (op: SceneOperation) => void;
