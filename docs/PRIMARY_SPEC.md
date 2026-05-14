# Primary specification

This document is the technical specification for the virtual lab protocol games repo. [docs/PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md) defines the hard invariants. [docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md) describes the design philosophy. This specification defines the current schema and runtime expectations that implement those invariants.

## Protocol types

Every protocol declares a `protocolType` field with one of four values:

- `protocol`: a complete student-facing pathway.
- `mini_protocol`: a focused subprotocol, usually one scene or a small scene transition.
- `sequence_runner`: a protocol that connects mini-protocols in order.
- `dev_smoke`: a diagnostic protocol for testing scenes or objects. Not student-facing curriculum.

## Protocol YAML top-level fields

Each protocol lives in `content/<protocol_name>/protocol.yaml` and declares the following top-level fields:

```yaml
protocolType: mini_protocol
entry:
  scene: well_plate_workspace
  step: open_plate_workspace
learning:
  objectives: "Students completing this mini-protocol will have achieved..."
  outcomes: "Students completing this mini-protocol will be able to..."
  goals: "Overall, this mini-protocol aims to accomplish..."
parts:
  - id: part_setup
    label: "Setup"
    dayId: day1
days:
  - id: day1
    label: "Day 1"
steps:
  - id: open_plate_workspace
    label: "Open the workspace"
    scene: well_plate_workspace
    completionPath:
      kind: directTool
      tool: well_plate
      completionEvent: workspace_opened
    nextId: null
```

Sequence runners list constituent mini-protocols rather than authored steps; see Sequence runners below. Developer smoke protocols use the same top-level shape as mini-protocols but are exempt from the step-count and learning-block gates.

## Entry block

The `entry` block declares where the protocol starts.

- `entry.scene` is the scene id where the protocol opens.
- `entry.step` is the id of the first authored step.

Validation rules:

- `entry.step` must match the id of the first step in the `steps` list.
- `entry.scene` must equal that step's `scene`.
- A mini-protocol must not declare `entry.scene` as the hood unless its first authored step takes place in the hood. The hood is not a default starting scene.

## Learning block

The `learning` block records the pedagogy contract.

For mini-protocols the three fields are required and use these required leading phrases:

- `objectives`: "Students completing this mini-protocol will have achieved..."
- `outcomes`: "Students completing this mini-protocol will be able to..."
- `goals`: "Overall, this mini-protocol aims to accomplish..."

For sequence runners the `learning` block carries the overall pathway's pedagogy and may use "Students completing this protocol..." in place of the mini-protocol phrasing.

Developer smoke protocols and internal diagnostic protocols are exempt from the `learning` block requirement.

## Completion paths

Every step has exactly one `completionPath` with a `kind` discriminator. Allowed kinds:

- `interactionSequence`: an ordered list of clicks (tool, then source, then destination) that together complete the step.
- `directTool`: a single click on a visible tool or instrument control.
- `modal`: a click on a visible opener, then a click on a visible advance or confirm control inside a modal.
- `multipleChoice`: a click on the correct visible answer choice.

The walker, validator, and runtime dispatch from `completionPath.kind`. They must not dispatch from `step.id` or from per-protocol special cases.

## Derived fields

The build step derives the following fields. Authors must not write them in YAML.

- `usedItems`: the set of items referenced by the step's `completionPath`.
- `completionTrigger`: a step-level listener synthesized from `step.scene` and the `completionEvent` declared in `completionPath`. Each generated `completionTrigger` must have a matching runtime emitter.

## Sequence runners

A sequence runner is a protocol with `protocolType: sequence_runner`. It declares the ordered list of constituent mini-protocols in place of authored steps. A sequence runner has its own `entry` block (matching the first mini-protocol's entry) and a `learning` block scoped to the overall pathway. Sequence runners are exempt from the 6-to-10 step gate that applies to mini-protocols.

## Walker requirement

The walker is a runtime verifier generated from the protocol and scene YAML.

The walker:

- loads the page normally, including the welcome screen;
- starts in the protocol's declared entry scene;
- clicks visible objects, buttons, modal controls, and answer choices;
- saves screenshots before and after each meaningful interaction;
- may read game state for verification.

The walker must not:

- branch on `step.id`, `protocolId`, or `modal.owner`;
- write to game state or any internal runtime state;
- mutate `window.prompt`, `window.confirm`, or similar DOM globals;
- call internal runtime APIs to make progress;
- click DOM nodes that are present but not visibly clickable.

If the walker cannot complete a step through visible UI, the YAML schema, the scene affordance, or the runtime behavior is incomplete. The fix is to extend the YAML, fix the scene, or fix the runtime; the fix is never a per-step or per-protocol walker branch.

## Source-code and content layout

Authored TypeScript source for the shared scene runtime lives under `src/scene_runtime/`. Generated runtime data (protocols, scenes, inventory, registry) emits under `generated/` at the repo root. Do not place generated files under `src/`.

Curriculum content lives under `content/<protocol_name>/`. Developer smoke protocols live under `tests/content/dev_smoke/<name>_check/`. The builder and walker support `tests/content/` as an explicit dev/test content root for smoke fixtures. Smoke fixtures use the same schema as curriculum content and remain validatable and runnable in dev/test mode, but are excluded from the student launcher, the full-protocol sequence, and the 6-to-10 step curriculum gate. Smoke fixtures declare `protocolType: dev_smoke`.

Legacy code retired during a refactor is archived at `archive/code/<name>_<YYYY_MM>/` at the repo root, not under `src/`.

Files named `legacy_*.ts` under `src/` are temporary residents during an active refactor. The `legacy_` prefix marks them for review at refactor close: any helper that survives loses the prefix and moves into its appropriate `src/` subfolder; any helper that no longer serves a runtime purpose moves to `archive/code/<name>_<YYYY_MM>/`. No `legacy_*.ts` file may remain under `src/` after a refactor closes.

Mini-protocol HTML output uses the `<protocol_name>.html` convention. Example: `hood_flask_prep.html`, `plate_drug_treatment.html`, `cell_culture_full.html`.

## Sequence runners and friendly terminology

The `protocolType` schema value `sequence_runner` is rendered in docs and student-facing content as "full protocol runner" or "full protocol". Schema value stays stable; only the human-readable label changes.
