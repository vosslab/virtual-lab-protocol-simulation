# Protocol authoring guide

This guide walks a new author through writing a protocol from scratch: the
three YAML files, the validator, and the real-UI walker. It uses the
canonical vocabulary defined in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). Read that document first;
this guide assumes those terms.

## Target-state vs current-code

This guide teaches the **target-state** two-level interaction model: a
`protocol` of `step` blocks, each wrapping an ordered `sequence` of
`interaction` blocks with the four literal slots `target`, `gesture`,
`validator`, `response`. The model is ratified; the runtime, builder, and
shipped YAML do not implement it yet. Sections that describe build and
walk tooling as it runs today are labeled current-code.

Related references:

- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md): canonical terms and the
  retired-terms table.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md): full schema for
  `items.yaml`, `reagents.yaml`, and `protocol.yaml`.
- [PROTOCOL_STEPS.md](PROTOCOL_STEPS.md): the step model and runtime
  resolution.
- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md): the `target_groups` schema
  the scene side owns.
- [WALKTHROUGH_GUIDE.md](WALKTHROUGH_GUIDE.md): the YAML-driven UI walker
  (canonical real-UI regression test).

## Terminology

A protocol is the complete student-facing lab pathway. It may span many scenes in sequence.

A mini-protocol is a focused subprotocol. It usually runs in one scene, or across a small scene transition where the transition is part of the workflow.

A sequence runner is a protocol that connects mini-protocols in order to form the full student-facing protocol.

A developer smoke protocol is a very small diagnostic protocol used to check that a scene or object works.

## What a protocol is

A protocol is a self-contained folder under `src/content/<protocol_name>/`
with three files:

```
src/content/<protocol_name>/
  items.yaml      # physical game items (pipettes, bottles, flasks, ...)
  reagents.yaml   # liquids and their colors
  protocol.yaml   # parts, days, and the ordered list of steps
```

A mini-protocol is a focused subprotocol that teaches and verifies one
smaller workflow. Every mini-protocol must define a `learning` block with
required fields `objectives`, `outcomes`, and `goals`, and an `entry` block
that declares the initial scene and first step. Larger protocols may be
assembled from mini-protocols (a sequence runner), or a protocol may be a
developer smoke protocol. See [PRIMARY_DESIGN.md](PRIMARY_DESIGN.md) for the
hierarchy and [PRIMARY_SPEC.md](PRIMARY_SPEC.md) for the schema.

A Python builder reads these files, validates them, and emits TypeScript
modules that the browser bundle imports. No YAML is parsed at runtime.

## The two-level model

Status: **target-state.**

Every protocol is a tight linear spec with three nested levels: `protocol`,
`step`, and `interaction`.

```
protocol
  name                    # stable snake_case identifier for this protocol
  entry_step              # name of the first step
  steps[]                 # the steps that make up the protocol
step
  name                    # stable snake_case identifier for this step
  prompt                  # what the student is asked to accomplish
  sequence[]              # ordered list of interactions; order always matters
    interaction
      target              # the addressable scene object or control
      gesture             # how the student acts on the target
      validator           # named preset: checks this gesture on this target
      response            # container: scene_operations, optional feedback
  step_validator          # named preset: checks whole-step completion
  outcome                 # mapping: on_success, on_failure
  next_step               # names the next step by its name, or null
```

A `step` is one pedagogical unit. A step is often multi-gesture; the
individual gestures live inside it in the ordered `sequence`. Each
`interaction` has exactly the four slots `target`, `gesture`, `validator`,
`response`. The full slot charters and the closed `gesture` value set
(`click`, `drag`, `adjust`, `select`, `type`) are in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

## Writing items.yaml and reagents.yaml

Status: **current-code.**

`items.yaml` declares every physical item the protocol references. Each
item has a unique snake_case id, a `label`, a `role` from the closed set,
a `scene`, and (for everything except `virtual` and `none` scenes) an
`asset` basename. An item id is what a step `interaction` names as its
`target`.

`reagents.yaml` declares every liquid the protocol references. Each reagent
has a `label`, a `colorKey`, and a `displayColor`. A reagent id is what a
`LiquidDisplayChange` `scene_operation` names as its `liquid`. Note: `colorKey`
is a legacy field listed in the retired-terms table of
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md), slated for removal by the
code-migration plan.

The full `items.yaml` and `reagents.yaml` field tables, the closed `role`
set, and the cross-file validation rules are in
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md).

## Writing protocol.yaml

Status: **target-state.**

`protocol.yaml` carries the `learning` block, the `entry` block, the `parts`
and `days` organizational metadata, and the `steps` list. Steps are the
runnable units; protocol flow is `entry_step` plus each step's `next_step`,
not array position.

### A worked step

"Wash the flask with 4 mL PBS" is one step. It is the canonical
multi-gesture case:

```yaml
- name: pbs_wash
  prompt: "Wash the flask with 4 mL PBS."
  sequence:
    - target: serological_pipette
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: CursorAttach
            target: serological_pipette
            operation: attach
    - target: pbs_bottle
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: LiquidDisplayChange
            target: serological_pipette
            liquid: pbs
            volume_ml: 4
            operation: hold
        feedback:
          correct: PBS loaded.
          incorrect: Use the PBS bottle.
    - target: flask
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: LiquidDisplayChange
            target: serological_pipette
            liquid: pbs
            volume_ml: 0
            operation: set
          - type: LiquidDisplayChange
            target: flask
            liquid: pbs
            volume_ml: 4
            operation: add
  step_validator:
    preset: final_state_matches
    target: flask
    contains:
      liquid: pbs
      volume_ml: 4
  outcome:
    on_success: complete
    on_failure: retry
  next_step: add_trypsin
```

### A set-point step

Setting a pipette volume is a real lab skill. Encode it with `gesture:
adjust` and the `target_with_value` validator preset, never as a plain
`click` with a volume field:

```yaml
- name: set_pipette_volume
  prompt: "Set the serological pipette to 4 mL."
  sequence:
    - target: serological_pipette
      gesture: adjust
      validator: { preset: target_with_value, value: { volume_ml: 4 } }
      response:
        scene_operations:
          - type: SetPointDisplayChange
            target: serological_pipette
            value: { volume_ml: 4 }
  step_validator: { preset: sequence_complete }
  outcome:
    on_success: complete
    on_failure: retry
  next_step: draw_pbs
```

### A decision step

A multiple-choice or phase-keep decision is a `select`-gesture interaction
validated by `correct_choice`:

```yaml
- name: choose_dilution
  prompt: "Which recipe makes 1 mL of 200 uM working solution from a 10 mM stock?"
  sequence:
    - target: choice_20uL_stock
      gesture: select
      validator: { preset: correct_choice }
      response:
        feedback:
          correct: "Correct: 20 uL stock + 980 uL media is 200 uM."
          incorrect: "Check your math with C1V1 = C2V2."
  step_validator: { preset: sequence_complete }
  outcome:
    on_success: complete
    on_failure: retry
  next_step: prepare_working_solution
```

`scene_operations` may be an empty list here; a correct choice can be
`feedback`-only.

### A grouped-target step

The protocol YAML is geometry-free. A step that treats a row of wells
writes one semantic `target` name; the scene YAML owns the named group:

```yaml
- name: add_media_row_b
  prompt: "Add 100 uL media to every well in row B."
  sequence:
    - target: serological_pipette
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: CursorAttach
            target: serological_pipette
            operation: attach
    - target: media_bottle
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: LiquidDisplayChange
            target: serological_pipette
            liquid: media
            volume_ml: 0.7
            operation: hold
    - target: row_b
      gesture: click
      validator: { preset: correct_target }
      response:
        scene_operations:
          - type: LiquidDisplayChange
            target: row_b
            liquid: media
            volume_ml: 0.1
            operation: add
  step_validator:
    preset: final_state_matches
    target: row_b
    contains: { liquid: media }
  outcome:
    on_success: complete
    on_failure: retry
  next_step: add_media_row_c
```

The scene YAML defines `row_b` in its `target_groups` block; the protocol
never lists a well or a coordinate. See the `target_groups` schema in
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

## Domain verbs: authoring shorthand only

Status: **target-state.**

A domain verb -- `wash`, `dispense`, `grind`, `assemble`, `draw`,
`titrate`, and so on -- is the word a YAML author naturally reaches for.
Domain verbs are **authoring vocabulary and documentation shorthand, not
protocol YAML fields** in the initial tight spec. The executable YAML is
always the expanded two-level model: `step`, `sequence`, `target`,
`gesture`, `validator`, `response`, `scene_operations`, `step_validator`,
`outcome`, `next_step`.

This guide may teach with domain verbs, but every domain verb shown here
includes its explicit expansion to the literal slots. A domain verb implies
no hidden state change: all state change is explicit in a `response` as a
`scene_operation` mutation.

A future plan may add domain-verb macros, but only after the expanded form
is stable.

### Interaction-level domain verb: `draw`

`draw` is shorthand for one interaction -- one `target`, one `gesture`, one
`validator`, one `response`. "Draw 4 mL PBS into the pipette" expands to:

```yaml
- target: pbs_bottle
  gesture: click
  validator: { preset: correct_target }
  response:
    scene_operations:
      - type: LiquidDisplayChange
        target: serological_pipette
        liquid: pbs
        volume_ml: 4
        operation: hold
```

### Step-level domain verb: `wash`

`wash` is shorthand for a whole `sequence` plus its `step_validator`. "Wash
the flask with 4 mL PBS" expands to the three-interaction `pbs_wash` step
shown in "A worked step" above: pick up the pipette (`CursorAttach`), draw
the PBS (`LiquidDisplayChange` `hold`), dispense into the flask
(`LiquidDisplayChange` `set` then `add`), checked by a
`final_state_matches` `step_validator`.

When you write a protocol, think in domain verbs, then write the expanded
slots. The expansion is the verb's definition; there is nothing to a domain
verb except the slots it expands to.

## The pedagogy-first rule

Status: **target-state.**

An author chooses each interaction's `target` and `gesture` so the
interaction teaches the specific lab skill the step is about. The shape of
an interaction is a pedagogical decision, not just a UI decision:

- `adjust` on a continuous control teaches a set-point skill.
- `click` on a scene object teaches recognition and sequencing.
- `select` on an answer-choice target teaches a decision.
- `drag` on a scene object teaches a spatial placement skill.
- `type` on a control teaches entering a precise value.

The anti-pattern this rule catches is collapsing a skill-based interaction
into a rote `click` -- for example encoding a pipette volume as a field on
a `click` instead of using `gesture: adjust`. See
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) for the full rule.

## Per-step authoring checklist

Status: **target-state.**

Run through this checklist for every step you write.

- **Each interaction has exactly four slots.** Every `interaction` carries
  `target`, `gesture`, `validator`, and `response` -- no more, no fewer.
- **Gesture matches the skill.** A set-point step uses `adjust`; a decision
  uses `select`; a scene-object action uses `click`. Do not collapse a
  skill into a rote `click`.
- **Targets are semantic and geometry-free.** Write a semantic `target`
  name; never write a well coordinate, a row range, or an x/y. Grouped
  targets are named groups owned by the scene YAML.
- **Validators are named presets.** Every `validator` and `step_validator`
  is a preset from the documented library, with that preset's typed
  parameters. Never write free-form validation logic.
- **Responses carry explicit state change.** `response.scene_operations` is
  an ordered list of typed primitives (possibly empty); `feedback` is
  optional. All state change is a `scene_operation` mutation.
- **Outcome is a mapping.** `outcome` always has `on_success` and
  `on_failure`. The bare-scalar form is rejected.
- **Flow is named.** `next_step` names the next step by its `name`, or is
  `null` for a terminal step. `entry_step` names the first step.
- **Referenced items and reagents exist.** Every interaction `target`
  resolves to a declared item or a named group; every `LiquidDisplayChange`
  `liquid` exists in `reagents.yaml`.
- **No retired vocabulary.** Do not use `completionPath`, the four-`kind`
  taxonomy, `plateTargets`, `tubeTargets`, `stateChange`, `completionEvent`,
  `nextId`, the overloaded `action`, or "click target". The full retired
  list is in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

## Build and walk loop

Status: **current-code.**

Iterate on a protocol with a short loop: audit, validate, build, walk. Stop
at the first failure and read the message. The builder runs all schema and
cross-file rules; the walker plays the protocol through the real DOM.

| Stage | Purpose |
| --- | --- |
| Audit | Quick per-step completeness report. |
| Validate | Run all schema and cross-file rules without writing output. |
| Build | Validate and emit the generated TypeScript modules. |
| Walk | Rebuild the bundle, launch Playwright, and play the protocol through the real DOM. |
| Wrong-order walk | Inject a wrong-order interaction before each correct one and assert the soft-fail behavior. |

Run Python tooling through the repo environment: `source source_me.sh && python3 ...`.

The build and walk commands and their exact flags are documented in
[WALKTHROUGH_GUIDE.md](WALKTHROUGH_GUIDE.md). When the protocol audits
clean, validates, builds, and walks green, it is shippable -- but a
mini-protocol is not complete until the visible interaction works through
the same path a student uses.
