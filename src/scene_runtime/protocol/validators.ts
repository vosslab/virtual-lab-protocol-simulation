//============================================
// src/scene_runtime/protocol/validators.ts
//
// Pure validator functions for the five preset validators per
// docs/PRIMARY_SPEC.md "Validators and outcome" and
// docs/specs/PROTOCOL_VOCABULARY.md validator presets.
//
// References:
// - docs/active_plans/active/web_ui/seam_interface.md
//   (validation rules summary section)
// - docs/PRIMARY_SPEC.md (Validators and outcome, Step structure)
// - docs/specs/PROTOCOL_VOCABULARY.md (validator presets section)
// - src/shell/adapter/types.ts (InteractionValidatorPreset,
//   StepValidatorPreset, InteractionRejectReason)
//
// No DOM. No event emission. No global state. Pure functions only.
// Compile-time exhaustiveness enforced via never in dispatch switch.
//============================================

import type {
  InteractionValidatorPreset,
  StepValidatorPreset,
  InteractionRejectReason,
} from "../../shell/adapter/types";

//============================================
// Input types for validators
//============================================

// A single interaction from a protocol step.
export interface Interaction {
  readonly target: string;
  readonly gesture: string;
  readonly validator: {
    readonly preset: InteractionValidatorPreset;
    readonly parameters?: Record<string, unknown>;
  };
}

// A validated interaction provides the target that was clicked.
export interface ValidatedInteraction extends Interaction {
  readonly clicked_target: string;
}

// A step in a protocol.
export interface ProtocolStep {
  readonly step_name: string;
  readonly sequence: ReadonlyArray<Interaction>;
  readonly step_validator: {
    readonly preset: StepValidatorPreset;
    readonly parameters?: Record<string, unknown>;
  };
}

// An object state snapshot for final_state_matches validation.
export interface ObjectStateSnapshot {
  readonly [object_name: string]: {
    readonly [field_name: string]: unknown;
  };
}

// A value map for target_with_value validation.
export interface InteractionValueMap {
  readonly [key: string]: unknown;
}

// Result of an interaction validation.
export interface InteractionValidationResult {
  readonly ok: boolean;
  readonly reason: InteractionRejectReason | null;
}

//============================================
// Interaction validators
//============================================

/**
 * Validate that the clicked target matches the expected target.
 *
 * Preset: `correct_target`
 *
 * Rule: the student clicked a scene object with a name matching the
 * interaction's declared target name. Case-sensitive exact match.
 *
 * Rejection reasons:
 * - `wrong_target`: clicked target does not match expected target.
 */
export function validate_correct_target(
  interaction: Interaction,
  clicked_target: string,
): InteractionValidationResult {
  const ok = clicked_target === interaction.target;
  const reason: InteractionRejectReason | null = ok ? null : "wrong_target";
  return { ok, reason };
}

/**
 * Validate that the student selected the correct next-step scene object.
 *
 * Preset: `correct_choice`
 *
 * Corrected semantics (WS-M5-ST, ratified by the repo owner): `select` is
 * the primary way a student interacts with a protocol -- it means "choose the
 * next-step object among the scene objects already present in the scene." There
 * is NO separate answer/choice-list concept. The selectable set is simply the
 * clickable scene objects already rendered (each carrying its data-item-id).
 * `correct_choice` therefore means target-equality: the SELECTED scene object
 * equals the interaction's declared `target` (the student chose the correct
 * next-step object). Selecting a wrong present object fails the same way a
 * wrong-order click fails and does NOT advance.
 *
 * This is the same equality test as `correct_target`; the distinct preset name
 * is retained because the gesture (`select`) and pedagogy (choosing among
 * present objects) differ, and the closed preset vocabulary keeps the name.
 *
 * Rejection reasons:
 * - `wrong_target`: the selected scene object is not the expected target.
 */
export function validate_correct_choice(
  interaction: Interaction,
  selected_target: string | null,
): InteractionValidationResult {
  const ok = selected_target === interaction.target;
  const reason: InteractionRejectReason | null = ok ? null : "wrong_target";
  return { ok, reason };
}

/**
 * Validate that the target plus a value match expectations.
 *
 * Preset: `target_with_value`
 *
 * Rule: the student clicked the correct target AND the interaction's
 * validator parameters contain expected field values that match the
 * value_map snapshot at validation time. The value_map typically
 * comes from object state (e.g., pipette set_volume, power supply
 * set_voltage).
 *
 * Rejection reasons:
 * - `wrong_target`: target does not match.
 * - `wrong_value`: target matches but value does not.
 */
export function validate_target_with_value(
  interaction: Interaction,
  clicked_target: string,
  value_map: InteractionValueMap,
): InteractionValidationResult {
  // First, check target.
  if (clicked_target !== interaction.target) {
    return { ok: false, reason: "wrong_target" };
  }

  // Then, check the value map against validator parameters.
  if (!interaction.validator.parameters) {
    return { ok: false, reason: "wrong_value" };
  }

  // Compare each expected field in the validator parameters to the
  // value map. If any field does not match, fail.
  const expected_fields = interaction.validator.parameters;
  for (const [key, expected_value] of Object.entries(expected_fields)) {
    const actual_value = value_map[key];
    if (actual_value !== expected_value) {
      return { ok: false, reason: "wrong_value" };
    }
  }

  return { ok: true, reason: null };
}

//============================================
// Step validators
//============================================

/**
 * Validate that the step's entire sequence has been completed.
 *
 * Preset: `sequence_complete`
 *
 * Rule: every interaction in the step's sequence has been successfully
 * validated (all interactions_validated_count equals sequence length).
 *
 * Returns boolean; no rejection reason (step validators do not emit
 * rejection events; on_failure: retry restarts the entire sequence).
 */
export function validate_sequence_complete(
  step: ProtocolStep,
  interactions_validated_count: number,
): boolean {
  return interactions_validated_count === step.sequence.length;
}

/**
 * Validate that the final object state matches expected values.
 *
 * Preset: `final_state_matches`
 *
 * Rule: at the end of the step, specific object state fields match
 * the values declared in the validator parameters. The parameters
 * carry a map of {object_name: {field: expected_value}}.
 *
 * Returns boolean; no rejection reason.
 */
export function validate_final_state_matches(
  step: ProtocolStep,
  object_state_snapshot: ObjectStateSnapshot,
): boolean {
  if (!step.step_validator.parameters) {
    return false;
  }

  const expected_state = step.step_validator.parameters;

  // Iterate through each object and field expectation.
  for (const [object_name, expected_fields] of Object.entries(expected_state)) {
    if (typeof expected_fields !== "object" || expected_fields === null) {
      return false;
    }

    const actual_object_state = object_state_snapshot[object_name];
    if (!actual_object_state) {
      return false;
    }

    for (const [field_name, expected_value] of Object.entries(
      expected_fields as Record<string, unknown>,
    )) {
      const actual_value = actual_object_state[field_name];
      if (actual_value !== expected_value) {
        return false;
      }
    }
  }

  return true;
}

//============================================
// Dispatch functions (compile-time exhaustive)
//============================================

/**
 * Dispatch an interaction validator based on its preset name.
 *
 * Compile-time exhaustiveness: the default branch uses `never` to
 * force TypeScript to error if a new preset is added without a handler.
 *
 * @param preset The validator preset name.
 * @param interaction The interaction to validate.
 * @param clicked_target The target that was clicked or selected.
 * @param _unused Reserved slot (was the legacy modal choice_id; the corrected
 *                `correct_choice` uses target-equality on clicked_target and
 *                ignores this). Kept positional so callers do not churn.
 * @param value_map Optional: object state / typed values for target_with_value.
 * @returns The validation result (ok boolean + rejection reason).
 */
export function dispatch_interaction_validator(
  preset: InteractionValidatorPreset,
  interaction: Interaction,
  clicked_target: string,
  _unused?: string | null,
  value_map?: InteractionValueMap,
): InteractionValidationResult {
  switch (preset) {
    case "correct_target": {
      return validate_correct_target(interaction, clicked_target);
    }

    case "correct_choice": {
      // Corrected semantics: target-equality on the selected scene object.
      return validate_correct_choice(interaction, clicked_target);
    }

    case "target_with_value": {
      return validate_target_with_value(interaction, clicked_target, value_map ?? {});
    }

    default: {
      // Compile-time exhaustiveness check: if this code is reached,
      // a new preset was added without a handler.
      const exhaustion_check: never = preset;
      throw new Error(`Unknown interaction validator preset: ${String(exhaustion_check)}`);
    }
  }
}

/**
 * Dispatch a step validator based on its preset name.
 *
 * Compile-time exhaustiveness: the default branch uses `never` to
 * force TypeScript to error if a new preset is added without a handler.
 *
 * @param preset The validator preset name.
 * @param step The step to validate.
 * @param interactions_validated_count For sequence_complete: number of
 *                                     successfully validated interactions.
 * @param object_state_snapshot For final_state_matches: snapshot of
 *                              object state at the time of validation.
 * @returns Boolean indicating whether validation passed.
 */
export function dispatch_step_validator(
  preset: StepValidatorPreset,
  step: ProtocolStep,
  interactions_validated_count: number,
  object_state_snapshot?: ObjectStateSnapshot,
): boolean {
  switch (preset) {
    case "sequence_complete": {
      return validate_sequence_complete(step, interactions_validated_count);
    }

    case "final_state_matches": {
      return validate_final_state_matches(step, object_state_snapshot ?? {});
    }

    default: {
      // Compile-time exhaustiveness check.
      const exhaustion_check: never = preset;
      throw new Error(`Unknown step validator preset: ${String(exhaustion_check)}`);
    }
  }
}
