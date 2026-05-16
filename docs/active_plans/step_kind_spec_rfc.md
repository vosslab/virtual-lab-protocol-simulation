# Plan: step_kind enum spec RFC

## Context

The stepper plan [../archive/protocol_stepper_tool.md](../archive/protocol_stepper_tool.md) WP-C2 includes a `TimedWait` scene-operation handler. The handler currently checks only that the host step exists and that a duration field is present and positive. It cannot check **whether `TimedWait` is firing in a step that should have a wait** (incubation, treatment, centrifugation) versus a step where a wait is meaningless (pure aspiration, scene change, modal answer), because the protocol schema has no field that names the pedagogical kind of a step.

The Resolved decisions block of the stepper plan explicitly defers this check: "no prompt-text or step-name inference. When the spec lands the field, the stepper enforces; until then, the check does not exist." Without this spec RFC, the WP-C2 deferred check never lands.

`docs/specs/PROTOCOL_STEPS.md` and `docs/specs/PROTOCOL_VOCABULARY.md` define the step shape today but contain no taxonomy of step kinds.

## Objectives

- Add a `step_kind` enum field to the step schema in `docs/specs/PROTOCOL_STEPS.md` (and any reflected schema in `docs/specs/PROTOCOL_VOCABULARY.md`).
- Define the closed value set: `incubation`, `treatment`, `centrifugation`, `wait` (and any others architect approves).
- Update `tools/validators/` to enforce the enum on load (unknown kind -> ERROR; missing field on a step that needs one -> WARNING during rollout, ERROR after migration).
- Unblock the stepper WP-C2 deferred check: `TimedWait` in a step whose `step_kind` is not in a wait-permitting subset emits ERROR.

## Design philosophy

Per `docs/PRIMARY_DESIGN.md`: closure over openness, one canonical term per concept. `step_kind` is a closed enum, not an open string. Per `docs/PRIMARY_CONTRACT.md`: new schema fields require user approval; this RFC is the approval artifact. No heuristic inference from prompt text or step name -- the field is explicit or it does not exist. Per `docs/REPO_STYLE.md` "fix the design, not the symptom": adding the field is the durable fix; teaching the stepper to guess step kind from prompt strings would rot with every curriculum edit.

## Scope

- Edit `docs/specs/PROTOCOL_STEPS.md`: add `step_kind` to the per-step required-fields table; document the enum values; show one example per kind.
- Edit `docs/specs/PROTOCOL_VOCABULARY.md`: add `step_kind` to the canonical-term list.
- Edit `tools/validators/`: add step-kind enum check.
- Migrate all shipped `content/protocols/*/protocol.yaml` to declare `step_kind` on every step.
- Update `docs/specs/SPEC_DESIGN_CHECKLIST.md` cross-reference if the checklist enumerates per-step required fields.

## Non-goals

- Do not implement the stepper TimedWait kind check here. That re-opens WP-C2 in a follow-on stepper patch.
- Do not infer `step_kind` from prompt text, step name, or any other authored content.
- Do not introduce a free-form `step_kind` string. The enum is closed.

## Approach

- Enumerate candidate `step_kind` values from current shipped content by reading each step's prompt and authoring intent; cluster into the smallest closed set that covers every shipped step. Initial candidates: `incubation`, `treatment`, `centrifugation`, `wait`, `transfer`, `setup`, `measurement`, `cleanup`. Architect picks the final closed set.
- Add the field to the step schema as required.
- Update validator to enforce the enum on load.
- Migrate shipped protocols in a single patch so the validator can flip from WARNING to ERROR atomically.
- Update stepper WP-C2: re-open the deferred check, anchor to the new spec section, ship `TimedWait` kind gate in a follow-on stepper patch.

## Out-of-scope follow-ons

- Stepper TimedWait kind check (re-opens WP-C2 in a follow-on stepper patch).
- Potential additional checks gated on `step_kind` (e.g. `step_kind: centrifugation` requires a centrifuge object in the active scene); evaluate after the field lands.
