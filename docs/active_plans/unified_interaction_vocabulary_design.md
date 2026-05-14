# Unified interaction vocabulary design

M2 working design doc for the unified interaction vocabulary plan
([unified_interaction_vocabulary_plan.md](unified_interaction_vocabulary_plan.md)).
Everything here is target-state: it describes the designed vocabulary, not the
code today. The evidence base is
[protocol_interaction_inventory.md](protocol_interaction_inventory.md).
Architectural philosophy: see "Semantic inheritance and composition" in
[../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md#semantic-inheritance-and-composition).

The model is a tight linear protocol spec. WP-SLOT1 defined the two-level
model: the `step`, its ordered `sequence` of interactions, and the `target` and
`gesture` slots. WP-SOP1 defines the `response` container, the `scene_operation`
typed-primitive vocabulary, and the domain-verb composition mechanism. WP-STA1
tightens the model to the linear spec and defines the interaction `validator`,
the `step_validator`, the `outcome` mapping, the runtime state model, the
event-emission rule, and the `TimedWait` seventh `scene_operation` primitive.
The tight model is `protocol -> step(name, prompt, sequence, step_validator,
outcome, next_step) -> interaction(target, gesture, validator, response) ->
response(scene_operations[], feedback?)`.

The WP-STA1 tightening sweep adds a `protocol` level above `step`, drops
`sequence_mode`, drops the optional interaction `name`, and drops `state_update`
from `response`. It defers complex branching: `outcome` stays the simple
`{on_success, on_failure}` mapping. The `response` sub-fields are
`scene_operations` and optional `feedback`. The interaction `validator` and the
`step_validator` are named presets with typed parameters, drawn from a
documented preset library. The pedagogy-first rule (WP-PED1) and the
scene/protocol boundary (WP-BND1) are written by later work packages. This doc
names those remaining slots and gives each a one-line charter, but it does not
specify their internals.

## What changed from the first pass

The first draft of this doc described a single flat interaction primitive:
`target + mode + action`, with a base "action" that returned a boolean and a
layered `mode` of `click` or `dial`. That framing is superseded and removed.
It could not express a step that takes several gestures -- the model had no
place to put an ordered list of gestures inside one pedagogical step.

The settled model is two-level. The terms `target + mode + action`, the
boolean-return base action, the layered `mode` axis, the seven-slot
interaction, and the flat six-slot framing are all retired. Where the old
draft said "mode", the new model says `gesture`; where it said "action", the
work is split between the per-gesture `validator`, the `response` container,
and the `step_validator`.

## The two-level model

A `step` is one pedagogical unit of the protocol -- one thing the student is
asked to accomplish. A step is often multi-gesture. "Wash the flask with 4 mL
PBS" is a single step, but completing it takes three gestures: click the
pipette, click the PBS source, click the flask. The first-pass flat model
forced one gesture per step and could not say this. The two-level model exists
to fix exactly that: the step is the pedagogical unit, and inside it an ordered
`sequence` holds the individual gestures.

The two levels are the `step` and the `interaction`, wrapped by a `protocol`. A
step wraps an ordered `sequence` of interactions. Each interaction is one
gesture on one target, checked by its own validator, with its own response. The
step has its own `step_validator` that checks the whole sequence, an `outcome`
that says how the step resolved, and a `next_step` that names which step runs
next. Every step carries a stable snake_case `name`. Interactions do not carry a
`name` in the tight spec (see below).

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

The interaction `name` is deferred, not forbidden forever: a later plan may
reintroduce it with evidence that interactions need to be referenced by name.
In the tight spec the `interaction` slots are exactly `target`, `gesture`,
`validator`, and `response` -- four, no optional `name`.

## The `protocol` level

A `protocol` is the top level of the model. It wraps the whole linear sequence
of steps. A `protocol` has three slots:

- **`name`** -- a stable snake_case identifier for the protocol, for example
  `name: cell_culture`.
- **`entry_step`** -- the `name` of the first step the runtime runs. Flow
  starts here and follows `next_step` from step to step.
- **`steps`** -- the list of steps that make up the protocol. List order is
  reading convenience only; protocol flow is `entry_step` plus `next_step`,
  never `steps` list order.

The `protocol` level exists so flow has a defined start. Without `entry_step`,
the first step would be implied by file order -- and file order is never flow.

### Required and optional fields

The tight spec fixes which slots are required:

- A `protocol` requires `name`, `entry_step`, and `steps`.
- All six `step` slots are required: `name`, `prompt`, `sequence`,
  `step_validator`, `outcome`, `next_step`. `next_step` may be `null` for a
  terminal step, but the slot must be present.
- All four `interaction` slots are required: `target`, `gesture`, `validator`,
  `response`.
- `response.scene_operations` is required (it may be an empty list);
  `response.feedback` is optional.
- A `scene_operation` requires `type` plus that type's documented typed fields.

### Slot charters

Each slot owns one concern. The one-line charter for each:

| Level | Slot | Charter |
| --- | --- | --- |
| protocol | `name` | The stable snake_case identifier for the protocol. |
| protocol | `entry_step` | Names the first step by its `name`; flow starts here. |
| protocol | `steps` | The list of steps; list order is not protocol flow. |
| step | `name` | The stable snake_case identifier for the step, used for flow, tests, and debugging. |
| step | `prompt` | States what the student is asked to accomplish in this step. |
| step | `sequence` | The ordered list of interactions that make up the step; order always matters. |
| step | `step_validator` | Named preset that checks whole-step completion, not one gesture. |
| step | `outcome` | A mapping that says how the step resolves: `on_success` and `on_failure`. |
| step | `next_step` | Names the next step by its `name`, or `null` for a terminal step; this controls protocol flow. |
| interaction | `target` | Names the addressable scene object or control acted on. |
| interaction | `gesture` | Names how the student acts on the target. |
| interaction | `validator` | Named preset that checks this one gesture on this one target. |
| interaction | `response` | Container for post-validation system behavior: `scene_operations` and optional structured `feedback`. |

`name`, `prompt`, `sequence`, `step_validator`, `outcome`, and `next_step` are
the six step slots -- all required. `target`, `gesture`, `validator`, and
`response` are the four interaction slots -- all required. There is no separate
`interaction` task-type slot: the target's kind carries the task semantics (see
the `target` section below).

### The interaction chain

Within a step, the chain runs:

1. The student performs a `gesture` on a `target`. That pair is one
   `interaction`.
2. The interaction's `validator` -- a named preset -- checks that one gesture
   on that one target: was the right gesture done on the right target?
3. A valid interaction fires its `response`: the `response` container holds the
   scene operations the gesture causes and optional feedback. The `response`
   container is defined by WP-SOP1; this doc names it as the interaction's
   fourth slot and tightens it to `scene_operations` plus optional `feedback`.
4. The step's interactions run in `sequence` order. When the sequence is
   satisfied, the step's `step_validator` -- also a named preset -- checks
   whole-step completion.
5. The `step_validator` result drives the `outcome` mapping: `on_success`
   resolves the step, `on_failure` retries the whole step (the entire
   `sequence` resets). Advancing is not an `outcome` value -- once the step
   resolves, the step's `next_step` slot names which step runs next.

The two validation scopes are deliberate and separate. The interaction
`validator` is narrow: one gesture, one target, did the student do this part
right. The `step_validator` is wide: did the required interactions pass and is
the final state correct. The validator and state model section below writes
out the full validator, state, and event model; the interaction chain here
fixes the two scopes at the definitional level.

The `step_validator` name is settled. It was kept over `completion`, which was
too narrow -- a step validator does more than detect completion; it can also
reject a sequence that finished in the wrong state.

## Step naming and protocol flow

The step `name` and the `next_step` slot fix how a protocol identifies its
steps and how flow moves between them. These rules are locked in.

- **`name` is the stable identifier.** Every step has a `name`: a stable
  snake_case semantic identifier, for example `name: pbs_wash`. The `name` is
  the step's stable reference for protocol flow, tests, debugging, and future
  code migration. It is chosen for meaning, not for position.
- **`next_step` controls flow.** A step's `next_step` slot names the next step
  by its `name`, for example `next_step: add_trypsin`. Protocol flow is
  explicit through `next_step`. It does not come from YAML file order and it
  does not come from a numeric index. `next_step: add_trypsin` is clearer in
  review than a numeric index pointing at `step_004`.
- **`next_step: null` is a terminal step.** A step with `next_step: null` has
  no successor; the protocol ends when it resolves. The slot is always present;
  `null` is its terminal value.
- **YAML file order is not flow.** Reordering step blocks in the YAML must not
  change protocol flow. File order may match reading order, but it is not the
  source of truth -- `entry_step` plus `next_step` is. Flow is `next_step`
  only, never YAML file order and never a numeric index. A `step_index` may
  exist for display order only -- it is not part of the protocol-flow spec and
  never controls flow.
- **`outcome` has no `advance`.** The `outcome` is a mapping with `on_success`
  and `on_failure` keys. Advancing to the next step is `next_step`'s job, not
  `outcome`'s; `outcome` never carries an `advance` value and never names a
  step.

## Sequence ordering

Step order and interaction order are separate concerns with separate
controls.

- **`sequence` order is always meaningful.** The interactions in a step's
  `sequence` run and validate in the order listed -- always. There is no
  unordered mode. The earlier `sequence_mode` slot is dropped: a later plan may
  revisit unordered sequences with evidence, but the tight spec has one rule --
  sequence order always matters.
- **Step order and interaction order do not mix.** Step order is controlled by
  `next_step`. Interaction order is controlled by `sequence` list order. Moving
  step blocks around in the YAML must not change flow; moving interactions
  inside a `sequence` changes validation.
- **All authored names are snake_case.** The step `name`, the protocol `name`,
  `entry_step` targets, and `next_step` targets are always snake_case -- never
  numbers, never opaque codes. The vocabulary is uniformly snake_case: every
  YAML key and every authored identifier value uses snake_case. The only
  exception is the seven `scene_operation` primitive type names, which stay
  PascalCase because they are class-like type names used as the value of the
  `type` field.

## Worked example: a multi-gesture step

"Wash the flask with 4 mL PBS" is one step. It is the canonical multi-gesture
case, and the reason the two-level model exists. Shown here as one step inside
a `protocol`'s `steps` list:

```yaml
protocol:
  name: cell_culture
  entry_step: pbs_wash
  steps:
    - name: pbs_wash
      prompt: "Wash the flask with 4 mL PBS."
      sequence:
        - target: serological_pipette
          gesture: click
          validator: { preset: correct_target }
          response:
            # the pipette is picked up and follows the cursor
            scene_operations:
              - type: CursorAttach
                target: serological_pipette
                operation: attach
        - target: pbs_bottle
          gesture: click
          validator: { preset: correct_target }
          response:
            # 4 mL PBS is drawn into the held pipette
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
            # the PBS is dispensed from the pipette into the flask
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

Reading the chain for this step:

- One `protocol`, `name: cell_culture`, with `entry_step: pbs_wash` -- flow
  starts at the `pbs_wash` step. The protocol's `steps` list holds every step;
  list order is not flow.
- One `step`, with `name: pbs_wash` and one `prompt`. The student is asked to
  accomplish one thing: the PBS wash. The `name` is the step's stable
  identifier.
- Three `interaction` entries in the `sequence`, each with exactly four slots:
  `target`, `gesture`, `validator`, `response` -- no interaction `name`. Each
  is one `gesture` (here all `click`) on one `target` (the pipette, the source
  bottle, the destination flask).
- Each interaction has its own `validator`, a named preset. `correct_target`
  checks just that gesture on just that target -- clicking the pipette is
  checked independently of clicking the flask. Authors select presets from the
  documented library; they never write custom validation logic.
- Each interaction has its own `response`, which is `scene_operations` plus
  optional `feedback` -- nothing else. Clicking the pipette attaches it to the
  cursor (`CursorAttach`); clicking the bottle draws 4 mL PBS into the held
  pipette (a `LiquidDisplayChange` with `operation: hold`) and carries
  structured `feedback` with `correct` and `incorrect` messages; clicking the
  flask zeroes the pipette (`operation: set`, `volume_ml: 0`) and adds the PBS
  to the flask (`operation: add`). State change is explicit in these
  `scene_operation` mutations -- there is no `state_update` slot. The
  `response` container and its `scene_operation` primitives are defined below.
- After the three interactions run in order, the `step_validator` checks the
  step. It is a named preset: `final_state_matches` asserts the flask holds
  4 mL PBS. That is a whole-step completion check, not a per-gesture check, and
  it does not re-run the interaction validators. The validator preset library
  is defined in the validator and state model section below.
- The `outcome` is a mapping: `on_success: complete` resolves the step,
  `on_failure: retry` restarts the whole step -- the entire `sequence` resets
  and the student redoes the step from its first interaction. `outcome` is a
  mapping, not a bare scalar, so a later plan could grow it without changing
  shape. Flow then moves to the step named by `next_step` -- here
  `add_trypsin`. Advancing is `next_step`'s job, not `outcome`'s.

The flat first-pass model had no `sequence` slot, so the only way to express
this wash was three separate one-gesture "steps" -- which broke the
pedagogical unit. The wash is one thing the student learns to do; it is one
step. The three gestures live inside it.

## The `target` slot

A `target` is the addressable, semantic scene object or control the student
acts on. It is named, not positional: the runtime tracks named scene objects
(`serological_pipette`, `pbs_bottle`, `flask`, `incubator`, a specific answer
choice), not coordinate regions or response variables. A protocol author
writes the target's name; the scene adapter owns where that object is and how
it is drawn.

### A target declares its kind

A target declares its `kind`. The kind says what sort of thing the target is
and, with that, what acting on it means. A liquid-handling tool, a reagent
source, a destination vessel, a piece of timed equipment, a popup control, an
answer choice -- each is a target kind. The kind is the target's stable
semantic type.

### The kind carries the task semantics

Because the target's kind carries the task semantics, the model needs no
separate `interaction` task-type slot. The old draft reached for a step
"kind" taxonomy and, later, an action family list, to say what sort of task a
step was. The two-level model does not: the work a gesture does is determined
by the gesture plus the kind of target it lands on. Clicking a reagent-source
target means "draw from this source"; clicking a destination-vessel target
means "dispense into this destination"; clicking an answer-choice target means
"select this answer". The author does not also tag the interaction with a task
type -- the target's kind already says it. This recovers the legacy
`interaction_resolver.ts` property that load and discharge were derived from
click context, not hand-declared (see Part 3 of
[protocol_interaction_inventory.md](protocol_interaction_inventory.md)).

### QTI lineage of target typing

QTI's interaction names (Choice, Hot Spot, Slider, Position Object, Order)
informed how target kinds are typed: they are a checklist of the interaction
shapes a learning system needs to express. But those names are not adopted as
formal terms here. QTI's interaction-type enum is a typed list of
*interactions*; this model puts the type on the *target*, not the interaction.
The runtime tracks named scene objects, not QTI's coordinate regions
(Hot Spot, Position Object) or response variables. The QTI names are
background reading, not vocabulary.

## The `gesture` slot

A `gesture` is how the student acts on a target. It is the physical input the
student performs. The gesture value set is:

| Gesture | What the student does |
| --- | --- |
| `click` | Clicks the target. The simple, discrete gesture. |
| `drag` | Drags the target, or drags from the target to another target. |
| `adjust` | Moves a continuous control to a set-point value. The skill-based gesture. |
| `select` | Picks one option from a presented set of choices. |
| `type` | Enters a value or text. |

This value set is settled.

### `adjust` is the skill-based set-point gesture

`adjust` is the continuous, skill-based set-point gesture. The student moves a
continuous control until it reaches a target value: a pipette volume, a power
supply voltage, a pH titrated to a target. The first pass called this `dial`
mode; the gesture is now `adjust`.

`adjust` exists for pedagogy. Setting a pipette to 4 mL is a lab skill. If that
were collapsed into a `click`, the student would learn nothing about volume
set-points -- the sim would have regressed a skill into a rote click. `adjust`
keeps skill-based parameter-setting (volume, voltage, pH-to-target) from
collapsing into `click`. The full pedagogy-first rule is WP-PED1's job; the
`gesture` slot just provides `adjust` as the gesture that rule needs.

### `select` versus `click`

`select` and `click` are kept distinct, and the distinction is recorded here
deliberately (open question OQ-8).

- `click` is acting on a scene object in the lab space -- a pipette, a bottle,
  an incubator. The target is a thing in the world.
- `select` is picking one option from a presented set -- an answer choice in a
  multiple-choice prompt, a phase to keep after centrifugation, a fraction to
  collect. The target is one option among a set the runtime presented.

The two read differently to a YAML author: `click` says "act on this lab
object", `select` says "choose among these options". They are kept separate
because the author's intent is different and the scene renders them
differently (a clickable lab object versus a presented choice set).

OQ-8 watch item: if ratification (M3) shows that every `select` case is, at
runtime, just a `click` on an option target -- that the option set is only a
target kind and `select` adds nothing `click` plus an option-kind target does
not already give -- then `select` could be merged into `click`. Because the
distinction is isolated to this one slot value and is not wired into the
target model or the validator scopes, that merge would be a small,
evidence-driven change, not a redesign. The distinction is kept for now; M3
ratification is the test.

### The gesture extension rule

The gesture value set is closed but extensible. A new gesture may be added
only when the evidence shows a student input that none of `click`, `drag`,
`adjust`, `select`, or `type` expresses, that the input recurs across more
than one protocol, and that it is a stable, reusable input shape -- the same
bar [../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md#semantic-inheritance-and-composition)
sets for a new primitive. A new gesture is a vocabulary addition, not a casual
one; adding one requires the same justification as adding a base primitive.

## The pedagogy-first rule

The `target` and `gesture` slots are not just UI plumbing. They are a
pedagogical choice. WP-SLOT1 fixed what the slots are; this section fixes how an
author chooses their values. The rule:

**An author chooses each interaction's `target` (and its `kind`) and its
`gesture` so the interaction teaches the specific lab skill the step is about.
The shape of an interaction is a pedagogical decision, not just a UI
decision.**

### The pairing determines what the interaction teaches

The model already says the target's `kind` carries the task semantics and the
`gesture` is how the student acts. Put together, the `kind` plus the `gesture`
determine **what the interaction teaches**:

- `adjust` on a continuous control -- a pipette volume, a power-supply voltage,
  a pH titrated to a target -- teaches a **set-point skill**: the student
  learns to bring a parameter to a correct value.
- `click` on a scene object -- a tool, a reagent source, a destination vessel,
  a piece of equipment -- teaches **recognition and sequencing**: the student
  learns which object is the right one and in what order to act on objects.
- `select` on an answer-choice target teaches a **decision**: the student picks
  the correct option from a presented set.
- `drag` on a scene object teaches a **spatial placement** skill: the student
  learns where something goes.
- `type` on a control teaches **entering a precise value** when free entry, not
  a continuous control, is the real lab action.

The author picks the pairing that matches the real lab skill the step exists to
teach. The interaction's shape is chosen to match the skill, not chosen for
whatever is easiest to render.

### The anti-pattern: collapsing a skill into a rote click

The anti-pattern this rule exists to catch is **collapsing a skill-based
interaction into a rote `click`**. The clearest case is pipetting. Setting a
serological pipette to 4 mL is a real lab skill -- the student must learn to
bring a continuous volume control to a set-point. Encoding that as a timed
`click`, or as a plain `click` with no set-point, teaches the student nothing
about volume set-points. It tests reaction time or object recognition instead
of the skill the step is supposed to teach.

This is a documented regression in the current sim: skill-based pipetting was
regressed into a timed click. Naming the anti-pattern is part of this work
package's job. Reviewers and M3 ratification must catch it: an interaction
whose step is about a set-point skill but whose `gesture` is `click` is wrong
by this rule, regardless of whether it passes a validator.

The correct shape for the pipette-volume step is `gesture: adjust` on the
pipette target, validated by `target_with_value` with the set-point value. That
is the `adjust` worked example below.

### Worked example: a `click` interaction

A `click` interaction teaches recognition and correct-tool selection. The step
is "pick up the correct pipette". The skill is recognizing which tool the task
needs -- a serological pipette, not the aspirating pipette next to it.

```yaml
- target: serological_pipette
  gesture: click
  validator: { preset: correct_target }
  response:
    # the correct pipette is picked up and follows the cursor
    scene_operations:
      - type: CursorAttach
        target: serological_pipette
        operation: attach
    feedback:
      correct: Serological pipette selected.
      incorrect: Use the serological pipette, not the aspirating pipette.
```

The skill taught: object recognition and correct-tool selection. The `target`
kind is a liquid-handling tool; the `gesture` is `click`; the `correct_target`
preset checks the student clicked the right tool. There is no set-point here --
picking up a tool is a discrete recognition act, and `click` is the honest
gesture for it.

### Worked example: an `adjust` interaction

An `adjust` interaction teaches a set-point skill. The step is "set the pipette
to 4 mL". The skill is bringing a continuous volume control to a correct
value -- the real pipetting skill the timed-click anti-pattern destroys.

```yaml
- target: serological_pipette
  gesture: adjust
  validator: { preset: target_with_value, value: { volume_ml: 4 } }
  response:
    # the pipette's set-point display updates to the chosen volume
    scene_operations:
      - type: LiquidDisplayChange
        target: serological_pipette
        liquid: pbs
        volume_ml: 4
        operation: hold
    feedback:
      correct: Pipette set to 4 mL.
      incorrect: Set the pipette volume to 4 mL.
```

The skill taught: a volume set-point. The `target` kind is a liquid-handling
tool with a continuous control; the `gesture` is `adjust`; the
`target_with_value` preset checks the control reached `volume_ml: 4`. The
pedagogy lives in the `gesture` plus the validator preset: `adjust` makes the
student move the control, and `target_with_value` checks they moved it to the
right value. Swap `adjust` for `click` and the set-point skill is gone -- that
is the regression.

### The connection to ratification

This rule is the standard M3 ratification checks each interaction against. For
every interaction in a ratified protocol, ratification asks: **which lab skill
does this interaction teach, and is the `target`/`gesture` pairing the right
one to teach it?** An interaction whose pairing does not match its step's skill
-- most commonly a set-point step encoded as a `click` -- is a ratification
finding, not an author preference. The pedagogy-first rule gives M3 a concrete
standard: the pairing is judged against the skill, and a mismatch is escalated.

## The `response` container

A `response` is the interaction's fourth slot. It is the container for
post-validation system behavior -- what the system does after an interaction is
validated. It is not itself a primitive: it holds primitives. In the tight spec
a `response` has exactly two fields:

| Field | Required | What it holds |
| --- | --- | --- |
| `scene_operations` | yes (may be empty) | An ordered list of typed `scene_operation` primitives. |
| `feedback` | no | Optional learner-facing messaging, structured into `correct` and `incorrect`. |

The earlier draft carried a third `state_update` field for non-visual
bookkeeping. It is dropped. In the tight spec, **state change is explicit in a
`response` via a `scene_operation` mutation only** -- there is no arbitrary
non-visual state path. A later plan may reintroduce a bookkeeping field if it
proves one is needed; the tight spec does not assume it.

The canonical shape of a `response`:

```yaml
response:
  scene_operations:
    - type: CursorAttach
      target: serological_pipette
      operation: attach
    - type: LiquidDisplayChange
      target: serological_pipette
      operation: hold
      liquid: pbs
      volume_ml: 4
  feedback:
    correct: PBS loaded.
    incorrect: Use the PBS bottle.
```

### Why `response` is broader than a scene effect

The `response` slot is named `response`, not `scene_operation`, on purpose. A
validated interaction does not always change the scene:

- It can be `feedback` only -- a correct multiple-choice answer that just
  confirms "right" with an empty `scene_operations` list.
- It can be a modal open or close -- the scene shows a popup, then hides it.
- It can be a full scene mutation -- one or more `scene_operations` that swap
  an SVG, change a color, move an object, or transition the scene.

Because a `response` spans all of those, it is the broad container and
`scene_operation` is the narrow typed layer inside it. They are not the same
thing and `scene_operation` is not renamed to `response`. `scene_operation`
stays the durable typed-primitive vocabulary; `response` is the per-interaction
envelope for post-validation system behavior, which may or may not carry a
scene effect.

### `scene_operations`

`scene_operations` is an ordered list of typed `scene_operation` primitives. It
may be empty (a `feedback`-only response). Order matters: the runtime applies
the list top to bottom, so the pipette-empty operation must precede the
flask-fill operation when one liquid moves between two objects. Every entry is
one of the ratified primitives defined in the next section, specified with
typed fields.

### `feedback`

`feedback` is optional learner-facing messaging tied to this one interaction. It
is structured into two sub-keys: `correct`, the message shown when the
interaction validates, and `incorrect`, the corrective hint shown when it does
not. It carries no scene effect; anything visible in the scene belongs in
`scene_operations`. The full outcome model is in the validator and state model
section below; the `response` carries only the `correct` / `incorrect` shape.

### No `state_update` field

The tight spec drops the `state_update` field. The earlier draft used it for
non-visual runtime bookkeeping that no typed `scene_operation` represented. The
tight spec does not allow that path: **state change is explicit in a `response`
via a `scene_operation` mutation only.** There are no arbitrary state changes.
If a protocol later proves it needs non-visual bookkeeping that no
`scene_operation` can carry, that is evidence for a future plan to add a
bookkeeping field under the cost guardrail -- it is not assumed by the tight
spec.

## Scene operation primitives

A `scene_operation` is one of a small, ratified set of typed primitives. Each
is the smallest protocol-visible scene effect the runtime guarantees across
every scene. `scene_operation` primitives **describe how the scene changes,
not what the learner does**: the learner acts with a `gesture` on a `target`;
the `scene_operation` is what the scene does in response. The first pass's
"base actions" are these `scene_operation` primitives renamed -- they were
never things the student does, and they must not remain called actions.
Calling them actions confuses the scene's response with the learner's input;
the two are deliberately separate slots.

### The initial primitive set

Seven `scene_operation` primitives are ratified for the initial vocabulary:

| Primitive | What the scene does |
| --- | --- |
| `SvgSwap` | Replaces one SVG asset on a target with another. |
| `ColorChange` | Changes a fill or stroke color on a target. |
| `CursorAttach` | Attaches a target to the cursor, or detaches it. |
| `SceneChange` | Transitions the scene context to another scene. |
| `LayoutMove` | Moves or re-lays-out a scene object via the layout engine. |
| `LiquidDisplayChange` | Updates a tracked liquid: appears, volume changes, or well contents update. |
| `TimedWait` | Runs a timed phase on a piece of equipment, with a visible progress display. |

The first five are the first pass's mis-named "base actions".
`LiquidDisplayChange` was forced by the M2 fit check (see below). `TimedWait`
is the seventh primitive, ratified by WP-STA1 to close the timed-wait residual
gap (see below). The set is closed but extensible under the cost guardrail.

### Every primitive is specified with typed fields

A `response` may read like prose in a worked example, but each
`scene_operation` primitive's specification defines **typed fields, not
prose**. The user-given pattern: `LiquidDisplayChange` has the typed fields
`type`, `target`, `liquid`, `volume_ml`, `operation`. Every primitive below is
documented to the same durable-primitive standard: its typed fields and their
value types, what it means, what state it may read, what state it may change,
what visual effect it produces, what it must not do, examples from at least two
protocols where possible, common anti-patterns, and how domain verbs build on
it.

### Why `LiquidDisplayChange` is first-class

`LiquidDisplayChange` is not a composition of `SvgSwap` and `ColorChange`. It
is its own primitive because it tracks a liquid **quantity and well-contents
state**, not just an image. An `SvgSwap` changes which asset is drawn; a
`ColorChange` changes a color; neither tracks "this object now holds 4 mL of
PBS" as runtime state the `step_validator` can later check. Liquid transfer --
draw, dispense, aspirate, pour -- recurs in every cell-culture protocol and in
every one of the four source protocols. That recurrence is exactly the evidence
bar the cost guardrail sets for a new primitive, so `LiquidDisplayChange` is
ratified as first-class rather than forced into an `SvgSwap` / `ColorChange`
composition that would lose the quantity state.

### Primitive: `SvgSwap`

Replaces one SVG asset on a target with another.

- **Typed fields:**
  - `type` (string, literal `SvgSwap`)
  - `target` (string, a named scene object)
  - `from_asset` (string, the current asset id; optional when unambiguous)
  - `to_asset` (string, the replacement asset id)
- **What it means:** the target's drawn appearance changes wholesale from one
  declared asset to another.
- **State it may read:** the target's current asset id.
- **State it may change:** the target's asset id only.
- **Visual effect:** the target re-renders with the new SVG.
- **What it must not do:** it must not move the target (that is `LayoutMove`),
  recolor it without swapping the asset (that is `ColorChange`), or track a
  liquid quantity (that is `LiquidDisplayChange`).
- **Examples:** Miraculin "grind berries" -- the berries asset swaps to a
  powder asset. SDS-PAGE "stain the gel" -- the gel asset swaps to a stained-gel
  asset.
- **Anti-pattern:** using `SvgSwap` to fake a liquid level by swapping to a
  "flask-with-liquid" asset. Liquid level is `LiquidDisplayChange`; `SvgSwap`
  is for a discrete asset identity change.
- **Domain verbs build on it:** `grind` expands to an interaction whose
  `response` carries one `SvgSwap` (sample asset to ground-sample asset).

### Primitive: `ColorChange`

Changes a fill or stroke color on a target.

- **Typed fields:**
  - `type` (string, literal `ColorChange`)
  - `target` (string, a named scene object)
  - `property` (string, `fill` or `stroke`)
  - `color_key` (string, a named color from the scene palette)
- **What it means:** a color on the target changes without swapping the asset.
- **State it may read:** the target's current color for the named property.
- **State it may change:** the named color property on the target only.
- **Visual effect:** the target re-renders with the new color.
- **What it must not do:** it must not swap the asset (that is `SvgSwap`) or
  set a liquid volume (that is `LiquidDisplayChange`).
- **Examples:** an MTT well shifting color as formazan develops (OVCAR8 /
  `cell_culture` MTT readout); a pH indicator changing color during the
  Miraculin pH-adjust step.
- **Anti-pattern:** using `ColorChange` to represent a liquid being added.
  Liquid presence and volume are `LiquidDisplayChange`; `ColorChange` is for a
  color shift on an object that is not a tracked-liquid quantity change.
- **Domain verbs build on it:** a `develop` or `indicate` domain verb expands
  to an interaction whose `response` carries one `ColorChange`.

### Primitive: `CursorAttach`

Attaches a target to the cursor, or detaches it.

- **Typed fields:**
  - `type` (string, literal `CursorAttach`)
  - `target` (string, a named scene object)
  - `operation` (string, `attach` or `detach`)
- **What it means:** a picked-up tool follows the cursor (`attach`), or is set
  back down (`detach`).
- **State it may read:** whether a target is currently cursor-attached.
- **State it may change:** the cursor-attachment state for the named target.
- **Visual effect:** the target tracks the cursor while attached.
- **What it must not do:** it must not move the target to a fixed layout slot
  (that is `LayoutMove`) or transfer a liquid.
- **Examples:** clicking the `serological_pipette` in the PBS-wash step
  (`cell_culture`, `hood_flask_prep` pipetting steps); picking up the
  `aspirating_pipette` before aspirating old media.
- **Anti-pattern:** using `CursorAttach` for an object that should snap to a
  layout position rather than follow the cursor -- that is `LayoutMove`.
- **Domain verbs build on it:** any liquid-handling domain verb whose first
  interaction is "pick up the tool" expands that interaction's `response` to a
  `CursorAttach` with `operation: attach`.

### Primitive: `SceneChange`

Transitions the scene context to another scene.

- **Typed fields:**
  - `type` (string, literal `SceneChange`)
  - `to_scene` (string, the target scene id)
- **What it means:** the runtime swaps the active scene.
- **State it may read:** the current scene id.
- **State it may change:** the active scene id.
- **Visual effect:** the whole scene is replaced.
- **What it must not do:** it must not move a single object within a scene
  (that is `LayoutMove`); it changes which scene is active, not a layout
  within one.
- **Examples:** `cell_culture` opening the plate workspace as its own scene
  context; entering the microscope or plate-reader scene from a modal step.
- **Anti-pattern:** using `SceneChange` for a popup. A modal open or close is a
  `response` that opens a control surface, not a scene transition.
- **Domain verbs build on it:** an `enter` or `navigate` domain verb expands to
  an interaction whose `response` carries one `SceneChange`.

### Primitive: `LayoutMove`

Moves or re-lays-out a scene object via the layout engine.

- **Typed fields:**
  - `type` (string, literal `LayoutMove`)
  - `target` (string, a named scene object)
  - `to_slot` (string, a named layout slot or anchor)
- **What it means:** a scene object is repositioned to a named layout slot;
  the layout engine owns the geometry.
- **State it may read:** the target's current layout slot.
- **State it may change:** the target's layout slot only.
- **Visual effect:** the target animates or snaps to the new position.
- **What it must not do:** it must not compute coordinates itself (the layout
  engine owns geometry per `LAYOUT_ENGINE.md`) and must not swap the asset.
- **Examples:** SDS-PAGE assembly -- the gel cassette moving into the tank, the
  staining tray moving to the shaker. Both are ordered-assembly moves where the
  object changes position, not appearance.
- **Anti-pattern:** hand-authored x/y coordinates in the primitive. `LayoutMove`
  names a slot; the scene adapter and layout engine resolve where that slot is.
- **Domain verbs build on it:** an `assemble` step-level domain verb expands to
  a sequence of interactions whose responses each carry a `LayoutMove` (place
  cassette, attach clamps, etc.).

### Primitive: `LiquidDisplayChange`

Updates a tracked liquid on a target: a liquid appears, a volume changes, or
well contents update.

- **Typed fields:**
  - `type` (string, literal `LiquidDisplayChange`)
  - `target` (string, the named scene object holding the liquid)
  - `liquid` (string, a named liquid)
  - `volume_ml` (number, the volume in mL involved in this operation)
  - `operation` (string, `hold`, `set`, or `add`)
- **What it means:** the named liquid on the target changes. The operation set
  is `hold`, `set`, `add`:
  - `hold` -- cursor-carried or tool-carried contents: the target (a tool) now
    carries `volume_ml` of `liquid`. Drawing into a held tool uses `hold`.
  - `set` -- directly assigns the displayed content and state of the target to
    exactly `volume_ml` of `liquid`, regardless of what it held before. A
    preloaded well uses `set`; emptying a tool or vessel is `set` with
    `volume_ml: 0`.
  - `add` -- a destination transfer: `volume_ml` of `liquid` is added into a
    destination vessel on top of whatever it already holds. Dispensing into a
    vessel uses `add`.
- **`hold` versus `set`:** WP-STA1 ratifies these as distinct, not merged. The
  discriminator is the target kind: `hold` applies only to a liquid-handling
  tool and means "this tool is now carrying this volume" -- it is the
  cursor-tool counterpart of `CursorAttach` and is the pickup half of a
  draw/dispense pair. `set` applies to any target -- usually a vessel -- and
  asserts an absolute resting volume regardless of what the target held before;
  `aspirate` uses `set` with `volume_ml: 0` to zero a vessel to waste. They
  overlap only in that both name an absolute volume; they differ in target kind
  and in intent (tool carry-state versus vessel resting-state), so they stay
  separate.
- **Operation rename note:** the earlier draft used `fill` and `empty`. `fill`
  is renamed `add` (a destination transfer); `empty` is expressed as `set` with
  `volume_ml: 0`. The operation set is now `hold`, `set`, `add`.
- **State it may read:** the target's current liquid identity and volume.
- **State it may change:** the target's liquid identity and tracked volume.
- **Visual effect:** the rendered liquid level and color on the target update.
- **What it must not do:** it must not move the target or swap its asset; it
  tracks liquid quantity and identity, nothing else.
- **Examples:** the PBS wash above -- draw `hold`s 4 mL into the pipette,
  dispense `set`s the pipette to `volume_ml: 0` and `add`s the PBS to the flask.
  `cell_culture` `add_trypsin`, `neutralize_trypsin`, `resuspend`, `seed_plate`;
  `plate_drug_treatment` dilution steps -- every draw/dispense pair is a
  `LiquidDisplayChange` pair.
- **Anti-pattern:** faking a liquid with `SvgSwap` to a "filled" asset or with
  `ColorChange`. Those lose the tracked volume the `step_validator` checks.
- **Domain verbs build on it:** `draw` and `dispense` each expand to an
  interaction whose `response` carries one `LiquidDisplayChange`; `wash` is a
  step-level verb whose sequence chains a `CursorAttach` and several
  `LiquidDisplayChange` operations.

### Primitive: `TimedWait`

Runs a timed phase on a piece of equipment, with a visible progress display.

- **Typed fields:**
  - `type` (string, literal `TimedWait`)
  - `target` (string, the named piece of equipment running the timed phase)
  - `duration_min` (number, the length of the timed phase in minutes)
  - `display` (string, how the wait is shown, for example `progress`)
- **What it means:** the named equipment runs a timed phase of `duration_min`
  minutes. The runtime tracks the phase as started and, when `duration_min`
  elapses, as elapsed; the scene shows the wait via the `display` mode.
- **State it may read:** the named equipment's current state -- whether a timed
  phase is already running on it.
- **State it may change:** equipment state -- it starts the timed phase on the
  target and marks it elapsed when `duration_min` is reached.
- **Visual effect:** the equipment shows a timed-phase display -- a progress
  bar, a countdown, a timer animation -- per the `display` field.
- **What it must not do:** it must not move the equipment (that is
  `LayoutMove`), swap its asset (that is `SvgSwap`), or transfer a liquid (that
  is `LiquidDisplayChange`). It runs a timed phase and nothing else. It is not
  a special step type: a timed wait is a `scene_operation` inside a `response`,
  the same as the other six primitives.
- **Examples:** `cell_culture` `incubate_day1` -- the incubator runs its timed
  incubation phase. SDS-PAGE running the gel -- the gel tank runs its timed
  electrophoresis phase. It also covers centrifugation duration, staining, and
  destaining timed phases across the four source protocols.
- **Anti-pattern:** encoding a timed wait as a bare `state_update` flag with a
  hand-authored duration number, or as a separate "wait" step type. Timed
  duration with a progress display is a recurring, protocol-visible scene
  effect; it is a ratified primitive, not bookkeeping and not a step kind.
- **Domain verbs build on it:** the `use` (equipment) domain verb, when the
  equipment runs for a duration, expands to an interaction whose `response`
  carries one `TimedWait`.

Canonical use:

```yaml
response:
  scene_operations:
    - type: TimedWait
      target: incubator
      duration_min: 90
      display: progress
```

## Domain verbs

A domain verb is an author-facing named composition over the two-level model.
`grind`, `draw`, `dispense`, `assemble`, `wash` -- these are the words a YAML
author actually writes. A domain verb is **authoring vocabulary, not base
vocabulary**: it expands to slots that are already defined, and it adds no new
runtime concept.

### The composition rule

A domain verb expands at one of the two levels:

- An **interaction-level** domain verb expands to **one interaction** -- one
  `target`, one `gesture`, one `validator`, one `response`.
- A **step-level** domain verb expands to a **whole `sequence` plus its
  `step_validator`** -- several interactions and the whole-step check.

Each domain verb has a documented expansion. The expansion is the verb's
definition: there is nothing to a domain verb except the slots it expands to.

### A domain verb implies no hidden state change

A domain verb implies **no hidden state change**. All state change is explicit
in a `response` as a `scene_operation` mutation -- there is no other path. A
domain verb is a shorthand for slots an author could have written out
longhand; it never reaches past the `response` container to change runtime
state on the side. If a verb appears to need a side effect, that side effect
must surface as a `scene_operation` in one of the interactions the verb expands
to.

### Worked expansions

The four source protocols need the domain verbs below. Each is shown as its
expansion in YAML-author language.

`draw` -- interaction-level. The student clicks a reagent source with a tool in
hand; the tool fills. Drawing into a held tool uses `operation: hold`.

```yaml
# draw: { tool: serological_pipette, source: pbs_bottle, liquid: pbs, volume_ml: 4 }
interaction:
  target: pbs_bottle
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

`dispense` -- interaction-level. The student clicks a destination vessel with a
filled tool in hand; the tool is zeroed and the liquid is added to the vessel.
The tool half uses `set` with `volume_ml: 0`; the destination half uses `add`.

```yaml
# dispense: { tool: serological_pipette, destination: flask, liquid: pbs, volume_ml: 4 }
interaction:
  target: flask
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
```

`grind` -- interaction-level. The student acts on a grinder holding a sample;
the sample asset swaps to a ground-sample asset.

```yaml
# grind: { tool: coffee_grinder, sample: berries, result: berry_powder }
interaction:
  target: coffee_grinder
  gesture: click
  validator: { preset: correct_target }
  response:
    scene_operations:
      - type: SvgSwap
        target: coffee_grinder
        from_asset: berries
        to_asset: berry_powder
```

`aspirate` -- interaction-level. The student clicks a vessel with an aspirating
tool in hand; the vessel empties to waste. It is `dispense` in reverse: the
source empties, nothing fills a destination the learner tracks.

```yaml
# aspirate: { tool: aspirating_pipette, source: flask, waste: waste_container }
interaction:
  target: flask
  gesture: click
  validator: { preset: correct_target }
  response:
    scene_operations:
      - type: LiquidDisplayChange
        target: flask
        liquid: old_media
        volume_ml: 0
        operation: set
```

`wash` -- step-level. One instruction, three interactions: pick up the tool,
draw from the source, dispense into the destination. Its expansion is the
worked example earlier in this doc. Its `step_validator` checks the
destination holds the right liquid and volume.

`assemble` -- step-level. One instruction, an ordered sequence of `LayoutMove`
interactions (place the cassette, orient it, attach the clamps). Its
`step_validator` checks every part reached its slot in order. SDS-PAGE
assembly is the source case.

`spray` -- interaction-level. The student clicks a spray bottle; the scene
shows the spray. With no tracked liquid quantity, its `response` is a
`feedback` confirmation, optionally with an `SvgSwap` or `ColorChange` if the
sprayed surface changes appearance. `cell_culture` `spray_hood` is the source
case.

`use` (equipment) -- interaction-level. The student clicks a piece of
equipment -- a centrifuge, an incubator, a plate reader. For equipment that
runs instantly, its `response` is typically a `feedback`-only response with an
empty `scene_operations` list. For timed equipment, its `response` carries a
`TimedWait` `scene_operation` naming the equipment, `duration_min`, and the
progress `display`; WP-STA1 ratified `TimedWait` as the seventh primitive, so
timed-equipment duration is no longer a residual gap. `cell_culture`
`centrifuge`, `incubate_day1`, `plate_read` are source cases.

`select` (answer) -- interaction-level, using the `select` gesture on an
answer-choice target. The student picks one option from a presented set. Its
`response` is usually `feedback` only -- a correct multiple-choice answer
confirms with no scene change. This is kept distinct from `adjust`-gesture
parameter-setting: `select` picks one of a fixed set of options;
`adjust` moves a continuous control to a set-point. The eight multiple-choice
steps in `drug_dilution_setup` are `select` cases; setting a pipette volume is
an `adjust` case. They are different gestures and different verbs, and the
model keeps them separate.

### Every needed verb expands cleanly

Every domain verb the four protocols need expands cleanly to the two-level
model: `draw`, `dispense`, `grind`, `aspirate` are interaction-level; `wash`
and `assemble` are step-level; `spray`, `use`, and `select` are
interaction-level. No verb in the four source protocols needs a slot the
two-level model does not have. If a future verb cannot be expressed as an
expansion -- if it needs runtime behavior with no home in `target`, `gesture`,
`validator`, or `response` -- that is evidence the model is incomplete or the
verb hides a new `scene_operation`. A verb is never a license to add hidden
behavior; an inexpressible verb is a finding to escalate, not a special case to
code around.

## Cost guardrail

The three layers have different costs to extend, and the difference is
deliberate.

| Layer | Cost to add | Bar to clear |
| --- | --- | --- |
| Domain verb | Cheap | A documented expansion to existing slots. |
| `gesture` value | Expensive | Evidence: a recurring input shape no current gesture expresses. |
| `scene_operation` primitive | Expensive | Evidence: a recurring scene effect no composition of existing primitives expresses. |

New domain verbs are cheap and expected -- they are just named compositions,
and authors should add the verbs their protocols read naturally with. New
`gesture` values and new `scene_operation` primitives are expensive: each is a
permanent addition to the base vocabulary and requires the same evidence bar
[../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md#semantic-inheritance-and-composition)
sets -- a recurring shape, across more than one protocol, that no existing
primitive or composition expresses. `LiquidDisplayChange` and `TimedWait` are
the two primitives that have already cleared this bar: `LiquidDisplayChange`
for tracked liquid quantity, `TimedWait` for timed equipment phases with a
progress display.

A domain verb that **cannot** be expressed as the two-level model is itself
evidence: either the model is missing a slot or a level, or the verb is hiding
a new `scene_operation` that should be ratified explicitly. The cheap layer is
cheap precisely because it cannot smuggle in expensive behavior; if a verb
seems to need to, that is a signal to stop and design, not to extend the verb.

## The validator and state model

WP-SLOT1 fixed two validation scopes -- the per-gesture interaction `validator`
and the whole-step `step_validator` -- at the definitional level. This section
writes them out: how each one judges correctness, the named-preset shape both
use, the preset library, the runtime state they read, the `outcome` slot they
drive, and the event-emission rule.

### Validators are named presets

In the tight spec, every `validator` and every `step_validator` is a **named
preset with typed parameters**:

```yaml
validator: { preset: <name>, ...typed params }
```

A validator is never free-form prose, never an inline expression, and never a
raw structured object the author writes by hand. It is a `preset` name plus the
typed parameters that preset documents. Content creators select from the
documented preset library below; they never write custom validation logic. A
new preset requires ratification evidence -- the same cost-guardrail discipline
as a new `scene_operation` primitive.

### The interaction `validator`

The interaction `validator` judges one interaction: did the student perform the
correct `gesture` on the correct `target`. It is narrow on purpose -- one
gesture, one target, one yes-or-no result. It checks **local correctness only**
and does not look at the rest of the sequence; it does not check the final state
of the step. That is the `step_validator`'s job.

A `validator` returns a boolean. This carries the legacy boolean-return idea
down to interaction scope: the legacy `interaction_resolver.ts`
`InteractionResult.kind` collapsed to "this click advanced the step" or "it did
not" (see Part 3 of
[protocol_interaction_inventory.md](protocol_interaction_inventory.md)). The
interaction `validator` is that same yes-or-no judgment, scoped to one gesture.
A true result fires the interaction's `response`; a false result does not, and
drives the step's `outcome.on_failure`.

The interaction `validator` also carries the legacy derive-don't-declare idea:
the runtime derives whether the gesture is correct from the interaction context
and the current runtime state, rather than the author hand-declaring the state
transition. The legacy model derived `load` versus `discharge` from the
interaction shape rather than making the author declare it; the preset and the
runtime state model keep that property. The author names the preset; the
runtime checks it against the state model below.

Examples of the interaction `validator` preset shape:

```yaml
validator: { preset: correct_target }
validator: { preset: correct_choice }
validator: { preset: target_with_value, value: { volume_ml: 4 } }
```

### The `step_validator`

The `step_validator` judges the whole step: did the step reach its intended
completion. It is also a **named preset with typed parameters**. It runs only
after every interaction in the `sequence` has fired its `validator` and the
runtime has applied each `response`. The interaction validators are the
per-gesture gates; the `step_validator` is the whole-step gate that runs on top
of them.

The `step_validator` checks **only whole-step completion**. It does **not**
re-run or repeat the interaction validators: each interaction validator already
checked its own local correctness. The `step_validator` reads the recorded
result of the sequence and checks that the step completed -- either that the
sequence ran to the end, or that the final state matches an expected shape.

Examples of the `step_validator` preset shape:

```yaml
step_validator: { preset: sequence_complete }
step_validator:
  preset: final_state_matches
  target: flask
  contains: { liquid: pbs, volume_ml: 4 }
```

The split between the two scopes is deliberate: the interaction `validator`
answers "did the student do this one part right", the `step_validator` answers
"did the step complete". A step can have every interaction validate and still
fail a `final_state_matches` `step_validator` if the sequence added up wrong --
that is exactly the wide check the `step_validator` exists for, distinct from
the narrow per-gesture interaction validators.

The iterative loop -- SDS-PAGE destaining until the background is clear -- is
expressed as a `final_state_matches` `step_validator` plus an
`outcome.on_failure: retry`. The preset names the state that must hold (the
gel's background is clear); while that state is not reached, `on_failure: retry`
restarts the whole step. The loop is the `step_validator` preset and the `retry`
outcome working together -- there is no separate `repeat_until` construct and no
separate loop step type.

```yaml
step_validator:
  preset: final_state_matches
  target: gel
  contains: { background_clear: true }
outcome:
  on_success: complete
  on_failure: retry
```

### The validator preset library

The initial preset library has five presets: three interaction presets and two
step presets. Content creators select from this library; they never author
custom validation logic.

#### `correct_target` (interaction preset)

- **Required fields:** `preset` (literal `correct_target`). No other fields.
- **What it checks:** the student performed the interaction's `gesture` on the
  interaction's `target` -- the right action on the right scene object.
- **Where it can be used:** interaction `validator` only.
- **Example:** `validator: { preset: correct_target }` -- used by every
  interaction in the PBS-wash worked example.

#### `correct_choice` (interaction preset)

- **Required fields:** `preset` (literal `correct_choice`). No other fields.
- **What it checks:** the student selected the correct answer-choice target
  from a presented set -- the `select` gesture landed on the right option.
- **Where it can be used:** interaction `validator` only, on a `select`-gesture
  interaction whose `target` is an answer choice.
- **Example:** `validator: { preset: correct_choice }` -- used by the
  multiple-choice steps in `drug_dilution_setup`.

#### `target_with_value` (interaction preset)

- **Required fields:** `preset` (literal `target_with_value`); `value` (a
  mapping of typed value keys, for example `{ volume_ml: 4 }` or
  `{ voltage_v: 150 }`).
- **What it checks:** the student performed the interaction's `gesture` on the
  interaction's `target` and the target reached the named `value` -- the right
  set-point on the right control. This is the preset an `adjust`-gesture
  interaction uses.
- **Where it can be used:** interaction `validator` only.
- **Example:** `validator: { preset: target_with_value, value: { volume_ml: 4 } }`
  -- used when the student sets a pipette volume to 4 mL.

#### `sequence_complete` (step preset)

- **Required fields:** `preset` (literal `sequence_complete`). No other fields.
- **What it checks:** every interaction in the step's `sequence` validated, in
  order. It is the plain "the student finished the sequence" check.
- **Where it can be used:** `step_validator` only.
- **Example:** `step_validator: { preset: sequence_complete }` -- used by a
  step whose completion is simply running its sequence to the end.

#### `final_state_matches` (step preset)

- **Required fields:** `preset` (literal `final_state_matches`); `target` (a
  named scene object); `contains` (a mapping of the expected target state, for
  example `{ liquid: pbs, volume_ml: 4 }` or `{ background_clear: true }`).
- **What it checks:** after the sequence runs, the named `target` is in the
  state described by `contains` -- the right end state, regardless of the exact
  path. A step can run its full sequence and still fail this preset if the
  sequence added up wrong.
- **Where it can be used:** `step_validator` only.
- **Example:** `step_validator: { preset: final_state_matches, target: flask, contains: { liquid: pbs, volume_ml: 4 } }`
  -- the PBS-wash worked example, and the SDS-PAGE destain loop.

New presets are added under the cost guardrail: a new preset requires evidence
from protocol ratification that a recurring validation shape no existing preset
expresses -- the same bar a new `scene_operation` primitive must clear. Content
creators never write custom validation logic; they request a new preset with
evidence, and the preset is ratified into this library.

### The `outcome` slot

`outcome` is a **mapping**, not a bare scalar. In the tight spec it has exactly
two keys:

```yaml
outcome:
  on_success: complete
  on_failure: retry
```

| Key | Meaning |
| --- | --- |
| `on_success` | What happens when the `step_validator` passes. `complete` resolves the step; flow then moves to `next_step`. |
| `on_failure` | What happens when the `step_validator` does not pass, or an interaction `validator` returned false. `retry` restarts the whole step -- the entire `sequence` resets and the student redoes the step from its first interaction. |

`outcome` is a mapping, not a bare scalar, so a later plan can grow it without
changing shape. The bare-scalar form `outcome: complete` is rejected: it cannot
say what happens on failure. The tight spec keeps `outcome` to the simple
`{on_success: complete, on_failure: retry}` mapping -- complex branching is
deferred. There is no `on_hint_requested`, no `branches` mapping, and no
adaptive review in the tight spec; a later plan may add such keys with
evidence, and the mapping shape absorbs them without a redefinition.

`outcome` does not advance the protocol. Advancing is `next_step`'s job. Once
`on_success` resolves the step, the step's `next_step` slot names which step
runs next; `outcome` never carries an `advance` value and never names a step.

The iterative loop lives here: a `final_state_matches` `step_validator` whose
condition is still false drives `outcome.on_failure: retry`, and the step
restarts its `sequence`. The loop is the `step_validator` preset plus the
`on_failure: retry` outcome working together -- no separate loop construct.

### The runtime state model

The vocabulary assumes a small, named runtime state. Every `validator` preset
and every `step_validator` preset reads this state; every state change is
written by a `response`. The state the model assumes:

| State | What it tracks | Example |
| --- | --- | --- |
| held material | Which tool, if any, is attached to the cursor, and what liquid it carries. | `held_tool: serological_pipette`, the pipette holding 4 mL PBS. |
| target contents | The tracked liquid identity and volume on each vessel and tool. | `flask` contains 4 mL PBS. |
| set-point values | The current value of a continuous control. | A pipette set to 4 mL, a power supply set to 150 V, a titration at pH 8.0. |
| equipment state | Whether a piece of equipment has run, and -- for timed equipment -- whether its timed phase has started and elapsed. | The centrifuge has run; the incubator's 48 h phase is elapsed. |
| phase state | A multi-phase result the student must resolve. | A centrifuged tube holding an aqueous phase and an organic phase. |
| object appearance | The current asset id, color, and layout slot of each scene object. | The grinder shows the `berry_powder` asset; the gel cassette is in the `tank` slot. |

This state is named and non-positional, the same as `target`: the runtime
tracks it by name. The scene adapter renders it -- a liquid level, a dial
position, a swapped asset -- but the protocol vocabulary names the state, not
the rendering. Where state rendering touches the scene boundary, WP-BND1 owns
the rule for what the protocol names versus what the scene adapter draws.

### State change is explicit in a `response`

State change is **explicit in a `response` via a `scene_operation` mutation
only**. There is no other path -- no `state_update` field, no arbitrary
non-visual state change. A domain verb implies no hidden state change: a verb is
shorthand for slots an author could have written longhand, and it never reaches
past the `response` container to mutate runtime state on the side. If a verb
appears to need a side effect, that side effect must surface as a
`scene_operation` in one of the interactions the verb expands to. If a protocol
later proves it needs state that no `scene_operation` can carry, that is
evidence for a future plan to add a path under the cost guardrail; the tight
spec does not assume one.

Each of the seven `scene_operation` primitives maps to the runtime state it
changes:

| Primitive | Runtime state it changes |
| --- | --- |
| `SvgSwap` | object appearance -- the target's asset id. |
| `ColorChange` | object appearance -- the target's named color property. |
| `CursorAttach` | held material -- the cursor-attachment state of the target. |
| `SceneChange` | the active scene id (a scene-context state, not a per-object state). |
| `LayoutMove` | object appearance -- the target's layout slot. |
| `LiquidDisplayChange` | held material and target contents -- the tracked liquid identity and volume on the target. |
| `TimedWait` | equipment state -- the target equipment's timed phase, started and then elapsed. |

This model supersedes the hand-authored `stateChange` of the shipped content.
The legacy `stateChange.heldLiquid` interaction field, the `consumesVolumeMl`
discharge field, and the `colorKey` nested in `heldLiquid` are all replaced: a
`LiquidDisplayChange` with `operation: hold` writes held material, an
`operation: add` writes target contents, an `operation: set` asserts an
absolute resting volume, and the liquid's color is resolved from the named
liquid rather than hand-authored per interaction. The follow-on code plan reads
this map to retire the hand-authored `stateChange` block: where the current
content declares a state transition by hand, the new model derives it from the
typed `scene_operation` the interaction's `response` already carries.
(`stateChange`, `heldLiquid`, `consumesVolumeMl`, and `colorKey` are camelCase
legacy fields, named here only as the fields being superseded; they are not
vocabulary in the new model and never appear in a target-state example.)

### The event-emission rule

The legacy content carried a `completionEvent` field with no naming convention
-- kebab-case, snake_case, and mixed forms coexisted across files (see Part 9
of [protocol_interaction_inventory.md](protocol_interaction_inventory.md)).
WP-STA1 settles both the emission rule and a single naming convention.

- **The emission rule.** An event is emitted on a state transition the rest of
  the protocol may react to: an interaction firing a true `validator`, a step
  resolving `complete`, or a timed-equipment phase elapsing. Events are emitted
  by the runtime, not hand-authored per interaction. An author does not write an
  event onto the final interaction of a step the way the legacy
  `completionEvent` field did; the runtime emits a `<step_name>_complete` event
  when the `step_validator` passes.
- **The naming convention.** Event names are snake_case, derived from the
  `name` of the thing they report, suffixed with the transition:
  `<step_name>_complete` when a step resolves, `<equipment_name>_elapsed` when a
  timed phase ends. There is one convention -- snake_case, name plus transition
  suffix -- and the legacy kebab-case and mixed forms are retired. This reuses
  the uniform snake_case rule already locked in for every YAML key and authored
  identifier.

Event names are derived, not separately authored: because the step `name` and
the equipment `target` name are already stable snake_case identifiers, the
event name follows from them. An author who renames a step renames its
completion event with it. This is the derive-don't-declare property applied to
events.

### Timed-wait disposition

Timed equipment -- incubate 48 h, shake 10 min, run the gel 25 min, heat at
95 C -- was flagged as a residual gap: duration is real, but the start /
progress / completion model around it was undesigned (Part 8 of
[protocol_interaction_inventory.md](protocol_interaction_inventory.md)).
WP-STA1's disposition closes that gap by ratifying `TimedWait` as the seventh
`scene_operation` primitive. A timed wait is a `scene_operation`, not a special
step type:

- **Duration is a `TimedWait` primitive.** A `use` (equipment) interaction on
  timed equipment carries a `TimedWait` `scene_operation` in its `response`.
  The primitive's typed fields name the equipment `target`, the `duration_min`,
  and the progress `display`. The primitive runs the timed phase and changes
  equipment state -- it marks the phase started and, when `duration_min`
  elapses, elapsed. Duration is a typed field on a ratified primitive, not a
  loose number on a bookkeeping field and not a new step kind.
- **Completion is an event.** When the timed phase elapses, the runtime emits
  an `<equipment_name>_elapsed` event under the event-emission rule above. A
  step whose progress depends on a timed phase uses that event, or a
  `final_state_matches` `step_validator` asserting the equipment's timed phase
  is elapsed, to resolve.
- **Progress rendering is the scene adapter's.** The visible countdown, the
  progress bar, the timer animation -- how a timed wait is drawn -- is scene
  rendering, not protocol vocabulary. The protocol names the equipment, the
  duration, and the `display` mode; the scene adapter renders the wait. WP-BND1
  owns the exact line between the named `TimedWait` fields and their rendering.

This keeps timed-wait inside the two-level model with no new step type: a `use`
interaction whose `response` carries one `TimedWait` `scene_operation`, plus an
`_elapsed` event the rest of the protocol reacts to. The construct added is a
durable primitive, ratified under the cost guardrail, not a one-off slot.

## What this work package does not define

This doc now defines the `protocol` level, the two-level step/interaction model,
the `target` and `gesture` slots (WP-SLOT1), the `response` container, the
`scene_operation` primitive set, and the domain-verb mechanism (WP-SOP1), the
interaction `validator`, the `step_validator`, the validator preset library,
the `outcome` mapping, the runtime state model, the event-emission rule, and the
`TimedWait` seventh primitive (WP-STA1), and the pedagogy-first rule for
choosing a `target` and `gesture` to teach a specific skill (WP-PED1). It does
not yet define:

- The scene-vs-protocol boundary. WP-BND1 writes the rule for what the protocol
  vocabulary names versus what the scene adapter owns. This doc states that
  targets are named and the scene adapter owns geometry -- that `LayoutMove`
  names a layout slot rather than coordinates, that the runtime state model is
  named while its rendering is the scene adapter's, and that timed-wait
  progress rendering is the scene adapter's -- but does not write the full
  boundary.

It also defers, by design: complex branching (the `outcome` mapping stays the
simple `{on_success, on_failure}` shape; the graph-flow framing is a stated
future direction, not built); unordered sequences (the dropped `sequence_mode`
slot); the interaction `name` (deferred until evidence shows interactions need
naming); and any non-visual bookkeeping path (the dropped `state_update`
field). A later plan may revisit each with evidence.

## Status

WP-SLOT1, WP-SOP1, and WP-STA1 complete; the model is a tight linear protocol
spec. WP-SLOT1: the two-level model, the `target` slot, the `gesture` slot, the
step `name` identifier, and the `next_step` flow slot. WP-SOP1: the `response`
container, the ratified `scene_operation` primitives, the domain-verb mechanism,
and the cost guardrail, plus a uniform snake_case sweep over every YAML key and
authored identifier, resolving plan open question OQ-10. WP-STA1 tightens the
model to the linear spec and lands its content:

- The tightening sweep: adds the `protocol` level (`name`, `entry_step`,
  `steps[]`); drops `sequence_mode` (sequence order is always meaningful);
  drops the optional interaction `name` (deferred); drops `state_update` from
  `response` (`response` is `scene_operations` plus optional `feedback`); and
  defers complex branching (`outcome` stays the simple `{on_success,
  on_failure}` mapping). The tight model is `protocol -> step(name, prompt,
  sequence, step_validator, outcome, next_step) -> interaction(target, gesture,
  validator, response) -> response(scene_operations[], feedback?)`.
- The interaction `validator` and the `step_validator` are named presets with
  typed parameters; the validator preset library has `correct_target`,
  `correct_choice`, `target_with_value` (interaction presets) and
  `sequence_complete`, `final_state_matches` (step presets). Content creators
  select from the library; new presets require ratification evidence.
- The `outcome` mapping (`on_success: complete`, `on_failure: retry`, where
  `retry` restarts the whole step), the runtime state model, the
  explicit-state-change rule (a `scene_operation` mutation only), the
  event-emission rule and snake_case naming convention, and the `TimedWait`
  seventh `scene_operation` primitive that closes the timed-wait residual gap.

The ratified `scene_operation` set is now seven: `SvgSwap`, `ColorChange`,
`CursorAttach`, `SceneChange`, `LayoutMove`, `LiquidDisplayChange`, `TimedWait`.

WP-PED1 lands the pedagogy-first rule: an author chooses each interaction's
`target` (and its `kind`) and its `gesture` to teach the specific lab skill the
step is about, so the interaction's shape is a pedagogical choice. It names the
anti-pattern -- collapsing a skill-based interaction into a rote `click`, the
documented timed-click pipetting regression -- and gives worked `click` and
`adjust` examples showing the skill each teaches. The rule is the standard M3
ratification checks each interaction against.

Target-state. Pending WP-BND1.
