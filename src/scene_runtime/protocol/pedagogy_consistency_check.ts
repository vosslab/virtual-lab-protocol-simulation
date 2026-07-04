// src/scene_runtime/protocol/pedagogy_consistency_check.ts
//
// Load-time structure-derived pedagogy consistency invariant.
//
// This pass runs once at protocol load, inside create_step_machine, beside the
// other load-time checks (validate_protocol_presets, validate_authored_validator_values,
// validate_gesture_affordances, validate_target_existence). It catches ONE narrow
// class of drift: authored prose that makes an explicit, structured claim about
// the protocol's own shape, and that claim no longer matches the actual authored
// structure.
//
// This pass is DELIBERATELY NARROW to avoid false positives from free-form
// prose. It checks exactly two structured claim shapes and nothing else:
//
//   1. A "The N steps" phrase anywhere in the learning block (objectives,
//      outcomes, or goals) is parsed for its count N and compared against
//      config.steps.length.
//   2. A step's prompt text that literally names another authored target's
//      exact token (a token already used as an interaction target SOMEWHERE
//      else in this protocol) is checked against that step's own interaction
//      target set. A token that belongs to a different step is drift.
//
// Ambiguous prose ("insert the treated plate", "every well") is never flagged.
// Only an exact, structured token or count match is considered.
//
// References:
//   - docs/PRIMARY_SPEC.md (learning block, prompt, target vocabulary)
//   - src/scene_runtime/protocol/authored_value_check.ts (the load-time pass
//     pattern this file mirrors: named error, location suffix, pass entry point)

import type { ProtocolConfig } from "../../shell/adapter/types";

//============================================
// Named author-facing errors
//============================================

// Locating fields shared by both structured-claim error classes.
interface PedagogyClaimLocation {
  readonly protocol_name: string;
}

// Class 1: a "The N steps" claim in the learning block does not match the
// actual authored step count.
export class StepCountClaimMismatchError extends Error {
  constructor(
    location: PedagogyClaimLocation,
    learning_field: string,
    claimed_count: number,
    actual_count: number,
  ) {
    let message = `Learning block makes a structured step-count claim that does not`;
    message += ` match the authored steps`;
    message += ` in protocol "${location.protocol_name}", learning field "${learning_field}".`;
    message += ` Claimed "The ${claimed_count} steps", but the protocol authors`;
    message += ` ${actual_count} step(s). Fix the prose or the step list so they agree.`;
    super(message);
    this.name = "StepCountClaimMismatchError";
  }
}

// Class 2: a step's prompt literally names another step's exact target token.
export class PromptTargetDriftError extends Error {
  constructor(location: PedagogyClaimLocation, step_name: string, target_token: string) {
    let message = `Step prompt names a target token that is not among this step's`;
    message += ` own interaction targets`;
    message += ` in protocol "${location.protocol_name}", step "${step_name}".`;
    message += ` The prompt names target token "${target_token}", which is used as an`;
    message += ` interaction target elsewhere in this protocol, but not in this step's`;
    message += ` own sequence. Fix the prompt text or the step's sequence so they agree.`;
    super(message);
    this.name = "PromptTargetDriftError";
  }
}

//============================================
// Structured-claim parsing
//============================================

// Matches an explicit "The N steps" claim, case-insensitive, anywhere in a
// prose string. Only this exact structured shape is treated as a claim;
// anything looser ("several steps", "the steps above") is left unflagged.
const STEP_COUNT_CLAIM_PATTERN = /\bThe (\d+) steps\b/i;

// Word-boundary token pattern for a dotted subpart target reference, matching
// the shape of an authored `target` value that names a subpart (for example
// "well_plate_96.all_wells"). Deliberately narrower than any bare snake_case
// word: a bare object name ("micropipette", "incubator") is common,
// legitimate narrative prose that names an object mentioned earlier or later
// in the protocol without meaning it as this step's own target, so bare
// tokens are never scanned. Only the dotted object.subpart shape is
// structured enough that its appearance in a prompt is a deliberate target
// reference rather than incidental prose.
const TARGET_TOKEN_PATTERN = /\b[a-z][a-z0-9_]*\.[a-z0-9_]+\b/g;

//============================================
// Pass entry point
//============================================

// Validate that the two narrow structured-claim shapes agree with the
// authored structure. Throws a named author-facing error on the first miss;
// returns normally when every structured claim found matches, or when no
// structured claim is present (the common, unflagged case).
export function validate_pedagogy_consistency(config: ProtocolConfig): void {
  const location: PedagogyClaimLocation = { protocol_name: config.protocol_name };
  const steps = config.steps ?? [];

  // Check 1: "The N steps" claim in the learning block, checked against the
  // actual authored step count. Only fires on an authored mini_protocol or
  // sequence_runner with a learning block; a protocol without one has nothing
  // to check.
  if (config.learning !== undefined) {
    const learning_fields: ReadonlyArray<readonly [string, string]> = [
      ["objectives", config.learning.objectives],
      ["outcomes", config.learning.outcomes],
      ["goals", config.learning.goals],
    ];
    for (const [field_name, field_text] of learning_fields) {
      const match = STEP_COUNT_CLAIM_PATTERN.exec(field_text);
      if (match === null) {
        continue;
      }
      // match[1] is captured by the pattern's one numeric group, so it is
      // always present when match itself is non-null.
      const claimed_count = Number(match[1]);
      if (claimed_count !== steps.length) {
        throw new StepCountClaimMismatchError(location, field_name, claimed_count, steps.length);
      }
    }
  }

  // Build the global target vocabulary: every interaction target used
  // anywhere in this protocol, so a prompt naming another step's exact
  // target token can be recognized as structured rather than incidental.
  const global_targets: Set<string> = new Set();
  for (const step of steps) {
    for (const interaction of step.sequence) {
      global_targets.add(interaction.target);
    }
  }

  // Check 2: a step's prompt literally names another step's exact target
  // token. Scoped to tokens already proven to be real authored targets
  // elsewhere in the protocol, so free-form prose words never match.
  for (const step of steps) {
    const step_targets: Set<string> = new Set(
      step.sequence.map((interaction) => interaction.target),
    );
    const tokens = step.prompt.match(TARGET_TOKEN_PATTERN) ?? [];
    for (const token of tokens) {
      if (!global_targets.has(token)) {
        continue;
      }
      if (step_targets.has(token)) {
        continue;
      }
      throw new PromptTargetDriftError(location, step.step_name, token);
    }
  }
}
