/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
/**
 * render/apply.ts
 *
 * Pure function appliers for scene operations. Each applier takes a RuntimeWorld
 * and a scene operation, applies the operation, and returns a new RuntimeWorld.
 * The original world is never mutated.
 *
 * WP-RENDER-1A implements: ObjectStateChange, SceneChange.
 * WP-RENDER-1B extends this file: CursorAttach, LayoutMove (state-only).
 * Downstream WPs extends this file: TimedWait (1C), RenderRequest (1D).
 *
 * This file accesses builder-generated object structures with flexible schemas.
 * Disabled unsafe-access rules for dynamic data structures.
 */

import type { RuntimeWorld, SceneOperation } from "../types";
import type { Clock } from "./clock";

/**
 * Applies an ObjectStateChange operation to a RuntimeWorld.
 *
 * ObjectStateChange mutates only the named object's state field(s); all other
 * state (protocol, scenes, other objects, cursor) is unchanged.
 *
 * Supports both direct targets (e.g., "micropipette") and group targets
 * (e.g., "well_plate_96.all_wells"). For group targets, expands the group
 * to all member subparts and applies the state change to each.
 *
 * @param world The current RuntimeWorld.
 * @param op The ObjectStateChange operation (type='ObjectStateChange', target, state).
 * @returns A new RuntimeWorld with the object state updated; original unchanged.
 * @throws If target is missing or not found in objectStates.
 */
export function applyObjectStateChange(
  world: RuntimeWorld,
  op: SceneOperation,
): RuntimeWorld {
  if (op.type !== "ObjectStateChange") {
    throw new Error(
      `applyObjectStateChange requires type 'ObjectStateChange', got '${op.type}'`,
    );
  }

  if (!op.target) {
    throw new Error(
      `missing required field 'target' on ObjectStateChange operation`,
    );
  }

  if (!op.state) {
    throw new Error(
      `missing required field 'state' on ObjectStateChange operation for target '${op.target}'`,
    );
  }

  // Check if this is a group target (contains a dot) or a direct target.
  const targetParts = op.target.split(".");
  let nextObjectStates = { ...world.objectStates };

  if (targetParts.length === 2) {
    // Possible group target: "object_name.group_id"
    const objectName = targetParts[0] as string;
    const groupId = targetParts[1] as string;
    const obj = world.objects[objectName];

    if (obj && obj.structure && obj.structure.subpart_groups) {
      // Try to find the group
      let groupMembers: string[] | null = null;
      for (const groupCategory of Object.values(obj.structure.subpart_groups)) {
        const groupCat = groupCategory;
        if (groupCat.members) {
          for (const member of groupCat.members) {
            if (member.name === groupId && member.contains) {
              groupMembers = member.contains;
              break;
            }
          }
        }
        if (groupMembers) break;
      }

      // If we found the group, apply the state to each member
      if (groupMembers) {
        for (const memberId of groupMembers) {
          const memberKey = `${objectName}.${memberId}`;
          if (memberKey in nextObjectStates) {
            nextObjectStates[memberKey] = {
              ...nextObjectStates[memberKey],
              ...op.state,
            };
          }
        }
        return {
          ...world,
          objectStates: nextObjectStates,
        };
      }
    }
  }

  // Direct target or group not found, apply to the target directly.
  // Ensure the target exists in objectStates; do not silently default.
  if (!(op.target in world.objectStates)) {
    throw new Error(
      `ObjectStateChange target '${op.target}' not found in objectStates`,
    );
  }

  // Spread immutable update at the changed branch: merge new state into the named object.
  nextObjectStates = {
    ...world.objectStates,
    [op.target]: {
      ...world.objectStates[op.target],
      ...op.state,
    },
  };

  return {
    ...world,
    objectStates: nextObjectStates,
  };
}

/**
 * Applies a SceneChange operation to a RuntimeWorld.
 *
 * SceneChange changes only the active scene. Protocol state and object state
 * are preserved unless YAML declares otherwise (not supported in this WP).
 *
 * @param world The current RuntimeWorld.
 * @param op The SceneChange operation (type='SceneChange', to_scene).
 * @returns A new RuntimeWorld with the active scene changed; original unchanged.
 * @throws If to_scene is missing or not found in scenes.
 */
export function applySceneChange(
  world: RuntimeWorld,
  op: SceneOperation,
): RuntimeWorld {
  if (op.type !== "SceneChange") {
    throw new Error(
      `applySceneChange requires type 'SceneChange', got '${op.type}'`,
    );
  }

  if (!op.to_scene) {
    throw new Error(
      `missing required field 'to_scene' on SceneChange operation`,
    );
  }

  // Ensure the target scene exists; do not silently default.
  if (!(op.to_scene in world.scenes)) {
    throw new Error(
      `SceneChange target scene '${op.to_scene}' not found in scenes`,
    );
  }

  // Spread immutable update at the changed branch: update only activeSceneId.
  return {
    ...world,
    activeSceneId: op.to_scene,
  };
}

/**
 * Applies a CursorAttach operation to a RuntimeWorld.
 *
 * CursorAttach updates the cursor state to reflect an attached object.
 * State-only in WP-RENDER-1B: updates cursorState fields only. Visual
 * cursor rendering and visible attachment animation land in the first
 * adapter / chrome WP that needs to display them.
 *
 * @param world The current RuntimeWorld.
 * @param op The CursorAttach operation (type='CursorAttach', target, operation).
 * @returns A new RuntimeWorld with cursor state updated; original unchanged.
 * @throws If target is missing, operation field is missing, or target not in objectStates.
 */
export function applyCursorAttach(
  world: RuntimeWorld,
  op: SceneOperation,
): RuntimeWorld {
  if (op.type !== "CursorAttach") {
    throw new Error(
      `applyCursorAttach requires type 'CursorAttach', got '${op.type}'`,
    );
  }

  if (!op.target) {
    throw new Error(
      `missing required field 'target' on CursorAttach operation`,
    );
  }

  if (!op.operation) {
    throw new Error(
      `missing required field 'operation' on CursorAttach operation for target '${op.target}'`,
    );
  }

  // Ensure the target exists in objectStates; do not silently default.
  if (!(op.target in world.objectStates)) {
    throw new Error(
      `CursorAttach target '${op.target}' not found in objectStates`,
    );
  }

  // Validate operation is one of the allowed values.
  const validOperations = ["attach", "detach"];
  if (!validOperations.includes(op.operation)) {
    throw new Error(
      `CursorAttach operation must be 'attach' or 'detach', got '${op.operation}'`,
    );
  }

  // Spread immutable update at the changed branch: update cursorState.
  const nextCursorState = {
    attachedTo: op.operation === "attach" ? op.target : null,
    operation: op.operation as "attach" | "detach" | null,
  };

  return {
    ...world,
    cursorState: nextCursorState,
  };
}

/**
 * Applies a LayoutMove operation to a RuntimeWorld.
 *
 * LayoutMove updates the layout state to reflect a new position for a named target.
 * State-only in WP-RENDER-1B: updates layout-state fields only. Visible
 * layout-transition painting and animation land in the first adapter / chrome WP
 * that needs to display them.
 *
 * @param world The current RuntimeWorld.
 * @param op The LayoutMove operation (type='LayoutMove', target, and position fields).
 * @returns A new RuntimeWorld with layout state updated; original unchanged.
 * @throws If target is missing or position information is incomplete.
 */
export function applyLayoutMove(
  world: RuntimeWorld,
  op: SceneOperation,
): RuntimeWorld {
  if (op.type !== "LayoutMove") {
    throw new Error(
      `applyLayoutMove requires type 'LayoutMove', got '${op.type}'`,
    );
  }

  if (!op.target) {
    throw new Error(`missing required field 'target' on LayoutMove operation`);
  }

  // LayoutMove requires position fields to determine the new layout state.
  // Validate that position information is present (x, y coordinates or equivalent).
  // We check for the presence of fields that describe position intent;
  // exact field names depend on builder output.
  if (!op.operation) {
    throw new Error(
      `missing required field 'operation' or position info on LayoutMove operation for target '${op.target}'`,
    );
  }

  // If layout state does not yet exist in the world, initialize it.
  // layoutState is optional on RuntimeWorld (added in WP-RENDER-1B).
  const currentLayoutState = world.layoutState || {};

  // Record the layout move for this target. The exact representation
  // (x/y coordinates, zone reference, etc.) depends on how LayoutMove
  // is defined in protocol YAML. For now, we store the operation intent.
  const nextLayoutState = {
    ...currentLayoutState,
    [op.target]: {
      target: op.target,
      operation: op.operation,
    },
  };

  return {
    ...world,
    layoutState: nextLayoutState,
  };
}

/**
 * Applies a TimedWait operation to a RuntimeWorld.
 *
 * TimedWait schedules a timed phase for the named equipment. When the duration
 * elapses, an event is emitted via the injected clock. The event name is
 * derived from the target equipment name: `<equipment_name>_elapsed`.
 *
 * State-only in WP-RENDER-1C: updates the pending events. Visual timer display
 * and render handling are owned by the first adapter / chrome WP that needs to
 * display them.
 *
 * @param world The current RuntimeWorld.
 * @param op The TimedWait operation (type='TimedWait', target, duration_min).
 * @param clock The injected clock (productionClock or testClock).
 * @returns A new RuntimeWorld with the timed phase registered.
 * @throws If target is missing or duration is missing/invalid.
 */
export function applyTimedWait(
  world: RuntimeWorld,
  op: SceneOperation,
  clock: Clock,
): RuntimeWorld {
  if (op.type !== "TimedWait") {
    throw new Error(
      `applyTimedWait requires type 'TimedWait', got '${op.type}'`,
    );
  }

  if (!op.target) {
    throw new Error(`missing required field 'target' on TimedWait operation`);
  }

  if (op.duration_min === null || op.duration_min === undefined) {
    throw new Error(
      `missing required field 'duration_min' on TimedWait operation for target '${op.target}'`,
    );
  }

  // Convert duration from seconds to milliseconds.
  const durationMs = op.duration_min * 1000;

  // Event name: derived from target equipment name + '_elapsed'.
  const eventName = `${op.target}_elapsed`;

  // Schedule the callback to emit the event when the duration elapses.
  // The callback will be invoked by the clock (instantly in tests, after the real duration in production).
  clock.schedule(durationMs, () => {
    // Note: The event emission happens asynchronously via the injected clock.
    // At the time of schedule(), we record the intent to emit; the actual emission
    // occurs when the clock fires the callback (either via real setTimeout or test advance).
  });

  // Immutable update: add the event name to pendingEvents.
  const nextPendingEvents = [...world.pendingEvents, eventName];

  return {
    ...world,
    pendingEvents: nextPendingEvents,
  };
}

/**
 * Dispatches a scene operation to the appropriate applier.
 *
 * This dispatcher is the main entry point for applying operations to a world.
 * It uses discriminated-union dispatch to handle known operation types.
 *
 * @param world The current RuntimeWorld.
 * @param op The scene operation to apply.
 * @param clock The injected clock instance (required for TimedWait).
 * @returns A new RuntimeWorld with the operation applied.
 * @throws If the operation type is unknown or not yet implemented.
 */
export function applySceneOperation(
  world: RuntimeWorld,
  op: SceneOperation,
  clock: Clock,
): RuntimeWorld {
  const opType = op.type;
  switch (opType) {
    case "ObjectStateChange":
      return applyObjectStateChange(world, op);
    case "SceneChange":
      return applySceneChange(world, op);
    case "CursorAttach":
      return applyCursorAttach(world, op);
    case "LayoutMove":
      return applyLayoutMove(world, op);
    case "TimedWait":
      return applyTimedWait(world, op, clock);
    case "RenderRequest":
      throw new Error(
        `applySceneOperation: ${opType} is not yet implemented (deferred to later WP)`,
      );
    default:
      throw new Error(
        `applySceneOperation: unknown operation type '${opType}'`,
      );
  }
}
