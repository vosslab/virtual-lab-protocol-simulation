// src/scene_runtime/protocol/step_machine.ts
//
// Pure step machine for the typed protocol runtime. Owns step
// progression, interaction-index advancement, validator dispatch,
// scene-operation handoff, and ProtocolShellEvent emission via the
// injected RuntimeEmitterHandle.
//
// Public surface: create_step_machine() factory returning
// StepMachineHandle. No DOM, no globals, no window.
//
// References:
// - docs/PRIMARY_SPEC.md (entry_step, step structure, outcome
//   resolution, retry semantics, walker rule)
// - docs/specs/PROTOCOL_VOCABULARY.md (gesture, interaction, step,
//   sequence, response, scene_operations, validators)
// - docs/active_plans/active/web_ui/seam_interface.md (event lifecycle,
//   snapshot derivation)
// - src/shell/adapter/types.ts (closed seam)
// - src/scene_runtime/protocol/emitter.ts (RuntimeEmitterHandle, SnapshotReducer)
// - src/scene_runtime/protocol/validators.ts (validator dispatch)

import type {
  Gesture,
  InteractionRejectReason,
  InteractionValidatorPreset,
  ProtocolConfig,
  ProtocolShellEvent,
  ProtocolStep,
  SceneOperation,
  ShellViewSnapshot,
  StepValidatorPreset,
  ValidatorReference,
  ValidatorPreset,
} from "../../shell/adapter/types";
import type { RuntimeEmitterHandle, SnapshotReducer } from "./emitter";
// SceneOpHandler is defined canonically in scene_operations.ts (the module that
// builds the handler). Import it here (type-only, allowed within protocol/) and
// re-export so this module's existing public surface is unchanged.
import type { SceneOpHandler } from "./scene_operations";
import {
  dispatch_interaction_validator,
  dispatch_step_validator,
  type Interaction as ValidatorInteraction,
  type ProtocolStep as ValidatorStep,
} from "./validators";

//============================================
// Public types
//============================================

// SceneOpHandler re-exported from its canonical home (scene_operations.ts).
export type { SceneOpHandler };

export interface StepMachineHandle {
  start(): void;
  handle_click(target: string, gesture: Gesture): void;
  handle_modal_close(committed: boolean, choice_id: string | null): void;
  handle_timer_elapsed(equipment_name: string): void;
  // Commit a typed value for the active `type` interaction. The committed text
  // is the raw string the student typed into the visible type-input affordance
  // (src/shell/hud/type_input.tsx). It is validated by the active interaction's
  // target_with_value preset: the typed text is coerced to the type of the
  // single field declared in the validator's `value` block and compared. A
  // match advances exactly like a validated click; a mismatch emits
  // interaction_rejected (wrong_value) and does NOT advance.
  handle_type_commit(target: string, typed_text: string): void;
}

//============================================
// Snapshot reducer (exported for emitter wiring)
//============================================

// Empty starting snapshot. Fields populate as events arrive.
export function initial_snapshot(protocol_name: string): ShellViewSnapshot {
  const snapshot: ShellViewSnapshot = {
    protocol_name,
    current_step_name: null,
    current_prompt: null,
    // No step is active yet; tip is null until step_started fires.
    current_tip: null,
    current_interaction_index: 0,
    progress: { completed_step_count: 0, total_step_count: 0 },
    last_outcome: null,
    pending_validator_kind: null,
    modal: {
      is_open: false,
      kind: null,
      prompt: null,
      choices: [],
      invoking_target: null,
    },
    help: { is_open: false, topic: null },
    tray: { items: [] },
    active_scene_name: null,
    is_complete: false,
    active_interaction_target: null,
    active_interaction_gesture: null,
  };
  return snapshot;
}

// Helper to look up the current interaction's target and gesture
// from the config, given the step name and interaction index.
function get_active_interaction(
  config: ProtocolConfig,
  step_name: string | null,
  index: number,
): { target: string | null; gesture: Gesture | null } {
  if (!step_name) {
    return { target: null, gesture: null };
  }
  // sequence_runner protocols have no steps list; this helper is mini_protocol/dev_smoke only.
  const steps = config.steps ?? [];
  const step = steps.find((s) => s.step_name === step_name);
  if (!step) {
    return { target: null, gesture: null };
  }
  if (index < 0 || index >= step.sequence.length) {
    return { target: null, gesture: null };
  }
  const interaction = step.sequence[index];
  if (!interaction) {
    return { target: null, gesture: null };
  }
  return {
    target: interaction.target,
    gesture: interaction.gesture,
  };
}

// Pure reducer mapping each ProtocolShellEvent to the next snapshot.
// See seam_interface.md "Snapshot derivation".
// The config is captured in the factory closure, below.
function create_snapshot_reducer(config: ProtocolConfig): SnapshotReducer {
  return (prev, event) => {
    switch (event.kind) {
      case "protocol_loaded": {
        const next: ShellViewSnapshot = {
          ...prev,
          protocol_name: event.protocol_name,
          progress: {
            completed_step_count: 0,
            total_step_count: event.total_step_count,
          },
          is_complete: false,
          active_interaction_target: null,
          active_interaction_gesture: null,
        };
        return next;
      }
      case "step_started": {
        const active = get_active_interaction(config, event.step_name, 0);
        // Resolve the step's tip from config; null when absent.
        // sequence_runner protocols have no steps list; this path is mini_protocol/dev_smoke only.
        const steps = config.steps ?? [];
        const started_step = steps.find((s) => s.step_name === event.step_name);
        const step_tip = started_step?.tip ?? null;
        const next: ShellViewSnapshot = {
          ...prev,
          current_step_name: event.step_name,
          current_prompt: event.prompt,
          current_tip: step_tip,
          current_interaction_index: 0,
          active_interaction_target: active.target,
          active_interaction_gesture: active.gesture,
        };
        return next;
      }
      case "interaction_validated": {
        const next_index = event.interaction_index + 1;
        const active = get_active_interaction(config, event.step_name, next_index);
        const next: ShellViewSnapshot = {
          ...prev,
          current_interaction_index: next_index,
          pending_validator_kind: event.validator_preset,
          active_interaction_target: active.target,
          active_interaction_gesture: active.gesture,
        };
        return next;
      }
      case "interaction_rejected": {
        const next: ShellViewSnapshot = {
          ...prev,
          pending_validator_kind: event.validator_preset,
        };
        return next;
      }
      case "step_completed": {
        const completed_delta = event.resolution === "complete" ? 1 : 0;
        const next: ShellViewSnapshot = {
          ...prev,
          progress: {
            completed_step_count: prev.progress.completed_step_count + completed_delta,
            total_step_count: prev.progress.total_step_count,
          },
          last_outcome: {
            step_name: event.step_name,
            resolution: event.resolution,
            retry_count: 0,
          },
          current_interaction_index: 0,
          active_interaction_target: null,
          active_interaction_gesture: null,
        };
        return next;
      }
      case "protocol_completed": {
        const next: ShellViewSnapshot = {
          ...prev,
          current_step_name: null,
          current_prompt: null,
          current_tip: null,
          is_complete: true,
          active_interaction_target: null,
          active_interaction_gesture: null,
        };
        return next;
      }
      case "scene_changed": {
        const next: ShellViewSnapshot = {
          ...prev,
          active_scene_name: event.to_scene,
        };
        return next;
      }
      case "scene_operation_applied": {
        return prev;
      }
      case "modal_opened": {
        const next: ShellViewSnapshot = {
          ...prev,
          modal: {
            is_open: true,
            kind: event.modal_kind,
            prompt: event.prompt,
            choices: event.choices,
            invoking_target: event.invoking_target,
          },
        };
        return next;
      }
      case "modal_closed": {
        const next: ShellViewSnapshot = {
          ...prev,
          modal: {
            is_open: false,
            kind: null,
            prompt: null,
            choices: [],
            invoking_target: null,
          },
        };
        return next;
      }
      case "help_opened": {
        const next: ShellViewSnapshot = {
          ...prev,
          help: { is_open: true, topic: event.topic },
        };
        return next;
      }
      case "help_closed": {
        const next: ShellViewSnapshot = {
          ...prev,
          help: { is_open: false, topic: null },
        };
        return next;
      }
      case "tray_changed": {
        const next: ShellViewSnapshot = {
          ...prev,
          tray: { items: event.items },
        };
        return next;
      }
      default: {
        // Compile-time exhaustiveness.
        const exhaustion_check: never = event;
        throw new Error(`Unhandled event kind in reducer: ${String(exhaustion_check)}`);
      }
    }
  };
}

// Export a default reducer for use in tests or contexts without config access.
// This version cannot populate active_interaction_* fields, so those remain null.
// For full functionality, use create_snapshot_reducer with config.
const default_snapshot_reducer: SnapshotReducer = create_snapshot_reducer({
  protocol_name: "",
  protocol_type: "mini_protocol",
  entry_step: "",
  steps: [],
});

export { create_snapshot_reducer, default_snapshot_reducer as snapshot_reducer };

//============================================
// Internal helpers
//============================================

// Walk steps reachable from entry_step via next_step links. Returns
// the count of unique step_names reachable. Cycles (a step pointing
// back at an earlier step) are not counted twice.
function count_reachable_steps(config: ProtocolConfig): number {
  if (config.protocol_type === "sequence_runner") {
    const mini_protocols = config.mini_protocols ?? [];
    return mini_protocols.length;
  }
  const steps = config.steps ?? [];
  if (steps.length === 0) {
    return 0;
  }
  const by_name: Map<string, ProtocolStep> = new Map();
  for (const step of steps) {
    by_name.set(step.step_name, step);
  }
  const seen: Set<string> = new Set();
  let cursor: string | null = config.entry_step;
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    const step = by_name.get(cursor);
    if (!step) {
      break;
    }
    cursor = step.next_step;
  }
  return seen.size;
}

// Convert a config Interaction into the shape validators.ts expects.
function to_validator_interaction(
  target: string,
  gesture: Gesture,
  preset: InteractionValidatorPreset,
  params: Record<string, unknown> | undefined,
): ValidatorInteraction {
  const validator_block: ValidatorInteraction["validator"] = params
    ? { preset, parameters: params }
    : { preset };
  const interaction: ValidatorInteraction = {
    target,
    gesture,
    validator: validator_block,
  };
  return interaction;
}

function validator_parameters(ref: ValidatorReference): Record<string, unknown> | undefined {
  // `value` is the sole authored spelling (WS-M1-E vocabulary-closure patch).
  const authored_value = ref.value;
  if (authored_value === undefined) {
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(authored_value)) {
    out[key] = val;
  }
  return out;
}

// Convert a config ProtocolStep into the shape validators.ts expects.
function to_validator_step(step: ProtocolStep): ValidatorStep {
  const preset: StepValidatorPreset = step.step_validator.preset as StepValidatorPreset;
  const sequence: ReadonlyArray<ValidatorInteraction> = step.sequence.map((interaction) =>
    to_validator_interaction(
      interaction.target,
      interaction.gesture,
      interaction.validator.preset as InteractionValidatorPreset,
      validator_parameters(interaction.validator),
    ),
  );
  // Use `value` only (WS-M1-E vocabulary-closure patch; `params` alias removed).
  const validator_block: ValidatorStep["step_validator"] = step.step_validator.value
    ? {
        preset,
        parameters: step.step_validator.value,
      }
    : { preset };
  const out: ValidatorStep = {
    step_name: step.step_name,
    sequence,
    step_validator: validator_block,
  };
  return out;
}

//============================================
// Factory
//============================================

export function create_step_machine(
  config: ProtocolConfig,
  emitter: RuntimeEmitterHandle,
  scene_op_handler: SceneOpHandler,
): StepMachineHandle {
  // Build step lookup once.
  const steps_by_name: Map<string, ProtocolStep> = new Map();
  for (const step of config.steps ?? []) {
    steps_by_name.set(step.step_name, step);
  }

  // Mutable machine state.
  let active_step_name: string | null = null;
  let interaction_index = 0;
  let started = false;
  let completed = false;

  function current_step(): ProtocolStep | null {
    if (active_step_name === null) {
      return null;
    }
    return steps_by_name.get(active_step_name) ?? null;
  }

  function enter_step(step_name: string): void {
    const step = steps_by_name.get(step_name);
    if (!step) {
      throw new Error(`Unknown step_name in protocol: ${step_name}`);
    }
    active_step_name = step.step_name;
    interaction_index = 0;
    const event: ProtocolShellEvent = {
      kind: "step_started",
      step_name: step.step_name,
      prompt: step.prompt,
      interaction_count: step.sequence.length,
    };
    emitter.emit(event);
  }

  function apply_response_scene_ops(ops: ReadonlyArray<SceneOperation>): void {
    for (const op of ops) {
      scene_op_handler(op);
      const target_name = "target" in op ? op.target : null;
      const applied: ProtocolShellEvent = {
        kind: "scene_operation_applied",
        operation_type: op.type,
        target_name,
      };
      emitter.emit(applied);
      if (op.type === "SceneChange") {
        const scene_changed: ProtocolShellEvent = {
          kind: "scene_changed",
          from_scene: null,
          to_scene: op.to_scene,
        };
        emitter.emit(scene_changed);
      }
    }
  }

  function emit_step_validator_outcome(step: ProtocolStep): void {
    const preset = step.step_validator.preset as StepValidatorPreset;
    const validator_step = to_validator_step(step);
    const passed = dispatch_step_validator(preset, validator_step, step.sequence.length, undefined);
    if (passed) {
      const completed_event: ProtocolShellEvent = {
        kind: "step_completed",
        step_name: step.step_name,
        resolution: "complete",
      };
      emitter.emit(completed_event);
      if (step.next_step === null) {
        active_step_name = null;
        completed = true;
        const done_event: ProtocolShellEvent = {
          kind: "protocol_completed",
          protocol_name: config.protocol_name,
        };
        emitter.emit(done_event);
        return;
      }
      enter_step(step.next_step);
      return;
    }
    // Step validator failed: emit retry and restart the sequence.
    const retry_event: ProtocolShellEvent = {
      kind: "step_completed",
      step_name: step.step_name,
      resolution: "retry",
    };
    emitter.emit(retry_event);
    interaction_index = 0;
    const restart_event: ProtocolShellEvent = {
      kind: "step_started",
      step_name: step.step_name,
      prompt: step.prompt,
      interaction_count: step.sequence.length,
    };
    emitter.emit(restart_event);
  }

  function emit_rejection(
    step_name: string,
    index: number,
    target: string,
    gesture: Gesture,
    preset: ValidatorPreset,
    reason: InteractionRejectReason,
  ): void {
    // The reject event's validator_preset is an interaction preset.
    // For no_active_step we fall back to correct_target as a safe
    // default; the reason_code carries the real signal.
    const interaction_preset: InteractionValidatorPreset =
      preset === "sequence_complete" || preset === "final_state_matches"
        ? "correct_target"
        : preset;
    const event: ProtocolShellEvent = {
      kind: "interaction_rejected",
      step_name,
      interaction_index: index,
      target_name: target,
      gesture,
      validator_preset: interaction_preset,
      reason_code: reason,
    };
    emitter.emit(event);
  }

  function handle_validated(
    step: ProtocolStep,
    target: string,
    gesture: Gesture,
    preset: InteractionValidatorPreset,
  ): void {
    const validated: ProtocolShellEvent = {
      kind: "interaction_validated",
      step_name: step.step_name,
      interaction_index,
      target_name: target,
      gesture,
      validator_preset: preset,
    };
    emitter.emit(validated);
    // Apply scene operations for the validated interaction.
    const interaction = step.sequence[interaction_index];
    if (interaction) {
      apply_response_scene_ops(interaction.response.scene_operations);
    }
    interaction_index += 1;
    // If sequence done, run step validator.
    if (interaction_index >= step.sequence.length) {
      emit_step_validator_outcome(step);
    }
  }

  //============================================
  // Public handle methods
  //============================================

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    const total = count_reachable_steps(config);
    const loaded: ProtocolShellEvent = {
      kind: "protocol_loaded",
      protocol_name: config.protocol_name,
      entry_step_name: config.entry_step,
      total_step_count: total,
    };
    emitter.emit(loaded);
    enter_step(config.entry_step);
  }

  function handle_click(target: string, gesture: Gesture): void {
    const step = current_step();
    if (!started || completed || step === null) {
      emit_rejection(
        active_step_name ?? "",
        0,
        target,
        gesture,
        "correct_target",
        "no_active_step",
      );
      return;
    }
    const interaction = step.sequence[interaction_index];
    if (!interaction) {
      emit_rejection(
        step.step_name,
        interaction_index,
        target,
        gesture,
        "correct_target",
        "no_active_step",
      );
      return;
    }
    const preset = interaction.validator.preset as InteractionValidatorPreset;
    // Out-of-order target or wrong gesture: reject as wrong_target.
    if (interaction.target !== target || interaction.gesture !== gesture) {
      emit_rejection(step.step_name, interaction_index, target, gesture, preset, "wrong_target");
      return;
    }
    // Dispatch the preset validator. Clicks feed correct_target
    // or target_with_value; correct_choice is feed via modal.
    const validator_interaction = to_validator_interaction(
      interaction.target,
      interaction.gesture,
      preset,
      validator_parameters(interaction.validator),
    );
    const value_map =
      preset === "target_with_value" ? validator_parameters(interaction.validator) : {};
    const result = dispatch_interaction_validator(
      preset,
      validator_interaction,
      target,
      null,
      value_map,
    );
    if (!result.ok) {
      emit_rejection(
        step.step_name,
        interaction_index,
        target,
        gesture,
        preset,
        result.reason ?? "wrong_target",
      );
      return;
    }
    handle_validated(step, target, gesture, preset);
  }

  function handle_modal_close(committed: boolean, choice_id: string | null): void {
    const step = current_step();
    if (!started || completed || step === null) {
      return;
    }
    const interaction = step.sequence[interaction_index];
    if (!interaction) {
      return;
    }
    const preset = interaction.validator.preset as InteractionValidatorPreset;
    if (!committed) {
      // Cancel: emit interaction_rejected (reason: out_of_order) so the
      // shell sees the user dismissed the modal without committing.
      // interaction_index does not advance; the next click re-enters the
      // same interaction.
      emit_rejection(
        step.step_name,
        interaction_index,
        interaction.target,
        interaction.gesture,
        preset,
        "out_of_order",
      );
      return;
    }
    const validator_interaction = to_validator_interaction(
      interaction.target,
      interaction.gesture,
      preset,
      validator_parameters(interaction.validator),
    );
    const result = dispatch_interaction_validator(
      preset,
      validator_interaction,
      interaction.target,
      choice_id,
      {},
    );
    if (!result.ok) {
      emit_rejection(
        step.step_name,
        interaction_index,
        interaction.target,
        interaction.gesture,
        preset,
        result.reason ?? "wrong_value",
      );
      return;
    }
    handle_validated(step, interaction.target, interaction.gesture, preset);
  }

  function handle_timer_elapsed(equipment_name: string): void {
    const step = current_step();
    if (!started || completed || step === null) {
      return;
    }
    const interaction = step.sequence[interaction_index];
    if (!interaction) {
      return;
    }
    // Find a TimedWait scene_operation in the current interaction's
    // response naming this equipment (matched by target field).
    const wait_op = interaction.response.scene_operations.find(
      (op): op is Extract<SceneOperation, { type: "TimedWait" }> =>
        op.type === "TimedWait" && op.target === equipment_name,
    );
    if (!wait_op) {
      return;
    }
    const preset = interaction.validator.preset as InteractionValidatorPreset;
    handle_validated(step, interaction.target, interaction.gesture, preset);
  }

  function handle_type_commit(target: string, typed_text: string): void {
    const step = current_step();
    if (!started || completed || step === null) {
      emit_rejection(active_step_name ?? "", 0, target, "type", "correct_target", "no_active_step");
      return;
    }
    const interaction = step.sequence[interaction_index];
    if (!interaction) {
      emit_rejection(
        step.step_name,
        interaction_index,
        target,
        "type",
        "correct_target",
        "no_active_step",
      );
      return;
    }
    const preset = interaction.validator.preset as InteractionValidatorPreset;
    // A type commit only applies to the active `type` interaction on its target.
    if (interaction.gesture !== "type" || interaction.target !== target) {
      emit_rejection(step.step_name, interaction_index, target, "type", preset, "wrong_target");
      return;
    }
    // Build the value_map from the typed text. target_with_value compares the
    // validator's declared `value` fields against this map. The visible type
    // input yields a single string; coerce it to each declared field's type so
    // a numeric field compares as a number, not a string.
    const expected = validator_parameters(interaction.validator) ?? {};
    const value_map = build_typed_value_map(expected, typed_text);
    const validator_interaction = to_validator_interaction(
      interaction.target,
      interaction.gesture,
      preset,
      expected,
    );
    const result = dispatch_interaction_validator(
      preset,
      validator_interaction,
      target,
      null,
      value_map,
    );
    if (!result.ok) {
      emit_rejection(
        step.step_name,
        interaction_index,
        target,
        "type",
        preset,
        result.reason ?? "wrong_value",
      );
      return;
    }
    handle_validated(step, target, "type", preset);
  }

  const handle: StepMachineHandle = {
    start,
    handle_click,
    handle_modal_close,
    handle_timer_elapsed,
    handle_type_commit,
  };
  return handle;
}

//============================================
// Typed-value coercion for the `type` gesture
//============================================

// Build the value_map a target_with_value validator compares against, from the
// raw typed text. Each field the validator's `value` block declares is filled
// with the typed text coerced to that field's value kind (number vs string vs
// boolean), inferred from the expected value's JS type. A `type` interaction
// declares exactly one expected field in practice, but every declared field is
// filled identically so multi-field declarations stay well-defined.
function build_typed_value_map(
  expected: Record<string, unknown>,
  typed_text: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, expected_value] of Object.entries(expected)) {
    out[key] = coerce_typed_text(typed_text, expected_value);
  }
  return out;
}

// Coerce the typed string to the JS type of the expected value so a numeric
// field compares as a number. A non-numeric string against a numeric field
// yields NaN, which never strict-equals the expected number, so it correctly
// rejects. A boolean field compares the lowercased text against "true".
function coerce_typed_text(typed_text: string, expected_value: unknown): unknown {
  const trimmed = typed_text.trim();
  if (typeof expected_value === "number") {
    return Number(trimmed);
  }
  if (typeof expected_value === "boolean") {
    return trimmed.toLowerCase() === "true";
  }
  return trimmed;
}
