# Primary specification

This document is the technical specification for the virtual lab protocol games repo. [docs/PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md) defines the hard invariants. [docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md) describes the design philosophy. This specification defines the schema and runtime expectations that implement those invariants.

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
name: open_plate_workspace
entry_step: open_plate_workspace
learning:
  objectives: "Students completing this mini-protocol will have achieved..."
  outcomes: "Students completing this mini-protocol will be able to..."
  goals: "Overall, this mini-protocol aims to accomplish..."
steps:
  - name: open_plate_workspace
    prompt: "Open the well plate workspace."
    sequence:
      - target: well_plate
        gesture: click
        validator: { preset: correct_target }
        response:
          scene_operations:
            - type: SceneChange
              to_scene: well_plate_workspace
    step_validator: { preset: sequence_complete }
    outcome:
      on_success: complete
      on_failure: retry
    next_step: null
```

A `protocol` carries `name`, `entry_step`, and `steps`. Each `step` carries `name`, `prompt`, `sequence`, `step_validator`, `outcome`, and `next_step`. Each `interaction` in a `sequence` carries `target`, `gesture`, `validator`, and `response`. Flow is `entry_step` plus `next_step`; YAML `steps` list order is reading convenience only and never controls flow. Sequence runners list constituent mini-protocols rather than authored steps; see Sequence runners below. Developer smoke protocols use the same top-level shape as mini-protocols but are exempt from the step-count and learning-block gates.

## Entry step

The `entry_step` field declares where protocol flow starts.

- `entry_step` is the `name` of the first step the runtime runs. Flow starts there and follows `next_step` from step to step.
- The scene a protocol opens in is not a protocol-level field. The protocol vocabulary is geometry-free and scene-free at the flow level; a step's interactions name semantic `target` objects, and the scene adapter resolves those names. A `SceneChange` scene operation in a step's `response` transitions the scene context. See [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md) and [specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md).

Validation rules:

- `entry_step` must name a step present in the `steps` list.
- A mini-protocol must not open in the hood unless its first step takes place in the hood. The hood is not a default starting scene.

## Learning block

The `learning` block records the pedagogy contract.

For mini-protocols the three fields are required and use these required leading phrases:

- `objectives`: "Students completing this mini-protocol will have achieved..."
- `outcomes`: "Students completing this mini-protocol will be able to..."
- `goals`: "Overall, this mini-protocol aims to accomplish..."

For sequence runners the `learning` block carries the overall pathway's pedagogy and may use "Students completing this protocol..." in place of the mini-protocol phrasing.

Developer smoke protocols and internal diagnostic protocols are exempt from the `learning` block requirement.

## Step structure

A step is one pedagogical unit. Its structure is the same for every step; there is no per-step discriminator that branches the schema. Every step carries:

- `name`: the stable snake_case identifier, used for flow, tests, and debugging.
- `prompt`: what the student is asked to accomplish.
- `sequence`: the ordered list of interactions that make up the step. Order always matters; there is no unordered mode.
- `step_validator`: a named preset that checks whole-step completion.
- `outcome`: the `{on_success, on_failure}` mapping that says how the step resolves.
- `next_step`: names the next step by its `name`, or `null` for a terminal step.

Each `interaction` in a `sequence` carries exactly four slots: `target` (the semantic scene object or control acted on), `gesture` (how the student acts on it), `validator` (a named preset checking that one gesture on that one target), and `response` (the post-validation system behavior). The task semantics of an interaction come from the target's `kind` plus the `gesture`; the schema has no separate task-type or completion-path discriminator. What were the legacy `interactionSequence`, `directTool`, `modal`, and `multipleChoice` kinds are all just steps: an ordered `click` sequence, a one-interaction `sequence`, an interaction whose `response` carries a `SceneChange` or `feedback`-only payload, and a `select`-gesture interaction validated by `correct_choice`.

### Gestures

A `gesture` is how the student acts on a target. The value set is closed: `click`, `drag`, `adjust`, `select`, `type`. `adjust` is the continuous, skill-based set-point gesture (a pipette volume, a power-supply voltage, a titrated pH); it must not collapse into `click`. `select` picks one option from a presented set; `click` acts on a scene object in the lab space.

### Scene operations

A `response` holds `scene_operations` (an ordered, possibly empty list of typed primitives) and optional `feedback`. There are five ratified `scene_operation` primitives, named with PascalCase `type` values: `ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`. They describe how the scene changes in response to a validated interaction. The set is closed but extensible. `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, and `SetPointDisplayChange` are reclassified to the object/render layer (invoked by an object's `visual_states`), and `ObjectStateChange` is the sole protocol primitive that mutates declared object state, including contents fields (`contents_name`, `contents_volume`, and the corresponding `held_contents_name` / `held_contents_volume` on tools) and set-point fields (`set_volume`, `set_temperature`, `set_rpm`, etc.).

### Validators and outcome

Every `validator` and every `step_validator` is a named preset with typed parameters; content creators select from the documented preset library and never write custom validation logic. Interaction presets: `correct_target`, `correct_choice`, `target_with_value`. Step presets: `sequence_complete`, `final_state_matches`. The `outcome` mapping has exactly two keys: `on_success: complete` resolves the step, after which flow moves to `next_step`; `on_failure: retry` restarts the whole step, resetting the entire `sequence`. `outcome` never carries an `advance` value and never names a step.

The walker, validator, and runtime dispatch from the step and interaction structure above. They must not dispatch from a step name or from per-protocol special cases.

## Targets and the scene boundary

A `target` is the addressable, semantic scene object or control a student acts on. It is named, not positional. Protocol YAML is geometry-free: it names no plate, well, tube, gel, column, lane, rack, or coordinate. A scene adapter holds a registry that maps each semantic `target` name to a concrete scene object; targets that fan out to several scene objects are named groups declared in the scene YAML `target_groups` block. See [specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md) for the scene side of this boundary.

## Events

Events are emitted by the runtime on a state transition, not hand-authored per step. The runtime emits a `<step_name>_complete` event when a step's `step_validator` passes, and a `<equipment_name>_elapsed` event when a timed phase ends. Event names are snake_case and derived from the `name` of the thing they report; an author who renames a step renames its completion event with it.

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

- branch on a step `name`, a protocol `name`, or any per-protocol special case;
- write to game state or any internal runtime state;
- mutate `window.prompt`, `window.confirm`, or similar DOM globals;
- call internal runtime APIs to make progress;
- click DOM nodes that are present but not visibly clickable.

If the walker cannot complete a step through visible UI, the YAML schema, the scene affordance, or the runtime behavior is incomplete. The fix is to extend the YAML, fix the scene, or fix the runtime; the fix is never a per-step or per-protocol walker branch.

## Source-code and content layout

Authored TypeScript source for the shared scene runtime lives under `src/scene_runtime/`. Generated runtime data (protocols, scenes, inventory, registry) emits under `generated/` at the repo root. Do not place generated files under `src/`.

Curriculum content lives under `content/<protocol_name>/`. Developer smoke protocols live under `tests/content/dev_smoke/<name>_check/`. The builder and walker support `tests/content/` as an explicit dev/test content root for smoke fixtures. Smoke fixtures use the same schema as curriculum content and remain validatable and runnable in dev/test mode, but are excluded from the student launcher, the full-protocol sequence, and the 6-to-10 step curriculum gate. Smoke fixtures declare `protocolType: dev_smoke`.

Mini-protocol HTML output uses the `<protocol_name>.html` convention. Example: `hood_flask_prep.html`, `plate_drug_treatment.html`, `cell_culture_full.html`.

## Sequence runners and friendly terminology

The `protocolType` schema value `sequence_runner` is rendered in docs and student-facing content as "full protocol runner" or "full protocol". Schema value stays stable; only the human-readable label changes.
