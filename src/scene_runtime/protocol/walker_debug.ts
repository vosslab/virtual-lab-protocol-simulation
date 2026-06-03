// src/scene_runtime/protocol/walker_debug.ts
//
// Read-only walker/debug surface (WS-M3-D). Restores window.PROTOCOL_STEPS and
// window.gameState that the Solid HUD migration dropped, so the canonical
// walker (tests/playwright/e2e/protocol_walkthrough_yaml.mjs) and ad-hoc
// debugging can read protocol progress. These are FROZEN contract surfaces per
// docs/specs/WALKTHROUGH_GUIDE.md "Required future work" and the migration
// plan's "Browser runtime constraints":
//
//   - They are READ-ONLY signals. Tests may read them; nothing here mutates
//     game state, and the runtime never advances by writing them. They are a
//     projection of the step machine's emitter snapshot + the scene_store.
//   - No new window globals beyond the two documented surfaces are added.
//
// gameState surfaces the walker progress-predicate signals the helper
// clickItemAndWaitProgress() reads (walker_helpers.mjs):
//   activeStepId, interactionIndex, activeScene, completedSteps (count + ids),
//   selectedTool + heldLiquid (cursor/held state), plus wrongOrderClicks /
//   stepsOutOfOrder counters the walker's end-state assertions read. It also
//   surfaces activeTarget / activeGesture (the current interaction's target and
//   gesture, projected read-only from the snapshot) so the schema-driven walker
//   knows which visible [data-item-id] element to click next without any
//   per-protocol branch or internal-API call. These mirror the exact fields the
//   runtime itself uses to resolve a click's gesture (protocol_host.tsx).
//
// The signals are sourced from:
//   - the emitter snapshot (current_step_name, current_interaction_index,
//     active_scene_name, progress.completed_step_count, is_complete);
//   - step_completed / interaction_rejected events (completed-step ids,
//     wrong-order counters);
//   - the scene_store (cursor-attached tool + held material).
//
// References:
//   - docs/specs/WALKTHROUGH_GUIDE.md (window surfaces; progress predicate)
//   - tests/playwright/e2e/walker_helpers.mjs (fields the walker reads)
//   - src/scene_runtime/protocol/emitter.ts (snapshot + event stream)
//   - src/scene_runtime/state/scene_store.ts (cursor/held state)

import type {
  ProtocolConfig,
  ProtocolShellEvent,
  ProtocolStep,
} from "../../shell/adapter/types.js";
import type { RuntimeEmitterHandle } from "./emitter.js";
import type { SceneStore } from "../state/scene_store.js";

//============================================
// Public surface types (frozen walker contract)
//============================================

// One step in the read-only PROTOCOL_STEPS list. The walker iterates this list
// and reads id / next_step for flow assertions. Shape mirrors the new protocol
// vocabulary (step_name -> id, next_step -> nextId), not the legacy game.
export interface WalkerStep {
  id: string;
  label: string;
  scene: string | null;
  nextId: string | null;
}

// Held-material projection. tool is the cursor-attached object_name; liquid is
// the held material name. Both null when nothing is held.
export interface HeldLiquid {
  tool: string | null;
  liquid: string | null;
}

// Read-only game-state projection consumed by the walker progress predicate.
export interface WalkerGameState {
  activeStepId: string | null;
  interactionIndex: number;
  activeScene: string | null;
  completedSteps: string[];
  selectedTool: string | null;
  heldLiquid: HeldLiquid;
  wrongOrderClicks: number;
  stepsOutOfOrder: number;
  isComplete: boolean;
  // The current interaction's target and gesture, projected read-only from the
  // step machine's emitter snapshot (active_interaction_target /
  // active_interaction_gesture). These are the SAME fields the runtime itself
  // uses to resolve which gesture a click on a target counts as
  // (see protocol_host.tsx attach_click_resolver). The schema-driven walker
  // reads them to know which VISIBLE [data-item-id] element to click next, so
  // it can drive the protocol with no per-protocol branch and no internal-API
  // call. Both null when no interaction is active (between steps / complete).
  activeTarget: string | null;
  activeGesture: string | null;
  // For a `type` interaction only: the expected value the student should type,
  // rendered as a string. Derived read-only from the active interaction's
  // target_with_value validator `value` block (its single declared field). The
  // walker reads this to know what to type into the visible type-input
  // affordance -- the same read-only basis it uses to know which object to
  // click. Null when the active interaction is not a `type` gesture or declares
  // no expected value. This is NOT a state write: it is a projection of the
  // authored protocol the walker already has read access to via PROTOCOL_STEPS.
  activeTypeValue: string | null;
}

declare global {
  interface Window {
    // Frozen read-only walker/debug surfaces.
    PROTOCOL_STEPS?: ReadonlyArray<WalkerStep>;
    gameState?: WalkerGameState;
  }
}

//============================================
// PROTOCOL_STEPS derivation
//============================================

// Resolve the scene a step takes place in, when statically knowable: an
// explicit step.scene wins, else the first SceneChange.to_scene in the step's
// sequence, else null (the step inherits the active scene at runtime).
function resolve_step_scene(step: ProtocolStep): string | null {
  if (typeof step.scene === "string" && step.scene !== "") {
    return step.scene;
  }
  for (const interaction of step.sequence) {
    for (const op of interaction.response.scene_operations) {
      if (op.type === "SceneChange") {
        return op.to_scene;
      }
    }
  }
  return null;
}

// Build the read-only PROTOCOL_STEPS list from a protocol config. Empty for a
// sequence_runner (no authored steps list); the walker reads PROTOCOL_STEPS
// only for mini_protocol / dev_smoke flows.
export function build_protocol_steps(config: ProtocolConfig): WalkerStep[] {
  const steps = config.steps ?? [];
  const out: WalkerStep[] = [];
  for (const step of steps) {
    out.push({
      id: step.step_name,
      label: step.prompt,
      scene: resolve_step_scene(step),
      nextId: step.next_step,
    });
  }
  return out;
}

//============================================
// Active type-value derivation (read-only)
//============================================

// Resolve the expected typed value for a `type` interaction, as a string. Looks
// up the active step + interaction index in the config and reads the single
// declared field in the interaction's target_with_value validator `value` block.
// Returns null when the active interaction is not a `type` gesture, the index is
// out of range, or no expected value is declared. Pure read of authored config.
function resolve_active_type_value(
  config: ProtocolConfig,
  step_name: string | null,
  index: number,
): string | null {
  if (step_name === null) {
    return null;
  }
  const steps = config.steps ?? [];
  const step = steps.find((s) => s.step_name === step_name);
  if (!step) {
    return null;
  }
  if (index < 0 || index >= step.sequence.length) {
    return null;
  }
  const interaction = step.sequence[index];
  if (!interaction || interaction.gesture !== "type") {
    return null;
  }
  const value = interaction.validator.value;
  if (value === undefined) {
    return null;
  }
  // A type interaction declares exactly one expected field; surface its value.
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return null;
  }
  const first_key = keys[0];
  if (first_key === undefined) {
    return null;
  }
  return String(value[first_key]);
}

//============================================
// gameState projection
//============================================

// Read the cursor-attached tool + held material from the store. The first
// cursor-attached target is treated as the selected tool; its held material is
// the held liquid. Returns nulls when nothing is held.
function read_held(store: SceneStore): { tool: string | null; liquid: string | null } {
  for (const target of Object.keys(store.state)) {
    const entry = store.state[target];
    if (entry === undefined) {
      continue;
    }
    if (entry.flags.cursor_attached) {
      return { tool: target, liquid: entry.flags.held_material_name };
    }
  }
  return { tool: null, liquid: null };
}

// Install the read-only walker/debug surfaces on window. Subscribes to the
// emitter and rebuilds window.gameState after every event from the snapshot +
// store. Returns an unsubscribe function for host teardown.
//
// The returned object also records completed-step ids and wrong-order counters,
// which are not carried in the snapshot (the snapshot tracks a completed COUNT,
// not the id list the walker's completedSteps.includes(id) predicate needs).
export function install_walker_debug_surface(
  config: ProtocolConfig,
  emitter: RuntimeEmitterHandle,
  store: SceneStore,
): () => void {
  // Build the static step list once.
  window.PROTOCOL_STEPS = build_protocol_steps(config);

  // Mutable counters not carried by the snapshot.
  const completed_steps: string[] = [];
  let wrong_order_clicks = 0;
  let steps_out_of_order = 0;

  function rebuild_game_state(): void {
    const snapshot = emitter.get_snapshot();
    const held = read_held(store);
    const game_state: WalkerGameState = {
      activeStepId: snapshot.current_step_name,
      interactionIndex: snapshot.current_interaction_index,
      activeScene: snapshot.active_scene_name,
      // Fresh array each rebuild so a reader cannot mutate the internal list.
      completedSteps: completed_steps.slice(),
      selectedTool: held.tool,
      heldLiquid: { tool: held.tool, liquid: held.liquid },
      wrongOrderClicks: wrong_order_clicks,
      stepsOutOfOrder: steps_out_of_order,
      isComplete: snapshot.is_complete,
      // Read-only projection of the snapshot's active-interaction fields. The
      // walker mirrors the runtime's own click resolution by clicking the
      // visible element whose data-item-id equals activeTarget.
      activeTarget: snapshot.active_interaction_target,
      activeGesture: snapshot.active_interaction_gesture,
      activeTypeValue: resolve_active_type_value(
        config,
        snapshot.current_step_name,
        snapshot.current_interaction_index,
      ),
    };
    window.gameState = game_state;
  }

  function on_event(event: ProtocolShellEvent): void {
    // Record completed step ids (resolution "complete" only; "retry" restarts
    // the step and must not count as completed).
    if (event.kind === "step_completed" && event.resolution === "complete") {
      if (!completed_steps.includes(event.step_name)) {
        completed_steps.push(event.step_name);
      }
    }
    // Wrong-order signal: an interaction rejected for a wrong target/order is
    // the runtime declining to advance on a non-required click.
    if (event.kind === "interaction_rejected") {
      if (event.reason_code === "wrong_target" || event.reason_code === "out_of_order") {
        wrong_order_clicks += 1;
        steps_out_of_order += 1;
      }
    }
    rebuild_game_state();
  }

  const unsubscribe = emitter.subscribe(on_event);
  // Seed the surface immediately so a reader before the first event sees a
  // well-formed gameState (activeStepId null until start() fires step_started).
  rebuild_game_state();

  return () => {
    unsubscribe();
    delete window.PROTOCOL_STEPS;
    delete window.gameState;
  };
}
