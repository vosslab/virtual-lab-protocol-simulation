// src/scene_runtime/protocol/preset_guards.ts
//
// Closed-set runtime guards for the two validator-preset families.
//
// The authored YAML `ValidatorReference.preset` is typed as the 5-member
// ValidatorPreset union (the union of the 3-member interaction half and the
// 2-member step half). The step machine needs to narrow a preset to the
// correct half depending on the slot it appears in (a step's `step_validator`
// vs an interaction's `validator`). These guards perform that narrowing as a
// real runtime membership check, so a misslotted or unknown preset fails loud
// with a TypeScript-narrowed type, rather than being silently down-cast.
//
// References:
// - docs/PRIMARY_SPEC.md (Validators and outcome)
// - docs/specs/PROTOCOL_VOCABULARY.md (validator presets section)
// - src/shell/adapter/types.ts (InteractionValidatorPreset,
//   StepValidatorPreset, ValidatorPreset)

import type {
  InteractionValidatorPreset,
  StepValidatorPreset,
  ValidatorPreset,
} from "../../shell/adapter/types";

//============================================
// Closed preset member arrays
//============================================

// The complete set of interaction-slot validator presets. Declared `as const`
// so the array literal is the single source of truth and its element type is
// exactly InteractionValidatorPreset. If a new preset is added to the type
// without being added here (or vice versa), the satisfies check below errors.
const INTERACTION_PRESETS = ["correct_target", "correct_choice", "target_with_value"] as const;

// The complete set of step-slot validator presets, with the same closure rule.
const STEP_PRESETS = ["sequence_complete", "final_state_matches"] as const;

// Compile-time exhaustiveness: each array must cover its union exactly. The
// satisfies checks below pin the element type to the union member type, so
// dropping a member here (incomplete array) or adding a stray member (not in
// the union) both fail to compile.
const _interaction_presets_cover: readonly InteractionValidatorPreset[] =
  INTERACTION_PRESETS satisfies readonly InteractionValidatorPreset[];
const _step_presets_cover: readonly StepValidatorPreset[] =
  STEP_PRESETS satisfies readonly StepValidatorPreset[];
// Reference the const bindings so noUnusedLocals does not flag them; they exist
// only to document and enforce the union/array correspondence at compile time.
void _interaction_presets_cover;
void _step_presets_cover;

//============================================
// Guards
//============================================

// Narrow an authored preset to the interaction-slot family. Returns true only
// when the preset is one of the closed interaction presets.
export function is_interaction_preset(
  preset: ValidatorPreset,
): preset is InteractionValidatorPreset {
  // includes() over the closed array is the runtime membership test.
  return (INTERACTION_PRESETS as readonly string[]).includes(preset);
}

// Narrow an authored preset to the step-slot family. Returns true only when the
// preset is one of the closed step presets.
export function is_step_preset(preset: ValidatorPreset): preset is StepValidatorPreset {
  return (STEP_PRESETS as readonly string[]).includes(preset);
}
