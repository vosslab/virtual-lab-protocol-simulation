# Plan: Protocol step-vocabulary refinement to a two-level step and interaction model

> **Superseded / historical.** This document predates the ratified unified
> interaction vocabulary and uses earlier, abandoned framing. The final model
> is the two-level `protocol -> step -> interaction -> response` spec. See
> [unified_interaction_vocabulary_design.md](unified_interaction_vocabulary_design.md)
> and the canonical docs [PROTOCOL_VOCABULARY.md](../PROTOCOL_VOCABULARY.md) and
> [SCENE_VOCABULARY.md](../SCENE_VOCABULARY.md). Kept for historical context only;
> do not use it to guide new work.

## Context

The protocol vocabulary was designed against one scene -- cell culture / well
plates -- and it does not generalize. The investigation that produced this
plan started narrow and widened at every step:

- It started as "`plateTargets` and `tubeTargets` are scene-specific drift."
- An inventory of all 54 steps in the 7 `content/*/protocol.yaml` files showed
  the drift is not two keys: the whole `completionPath.kind` taxonomy
  (`interactionSequence`, `directTool`, `modal`, `multipleChoice`) is four
  special-click systems, each with its own dispatch branch.
- The legacy `src/interaction_resolver.ts` already had a click-level action
  model (`InteractionResult.kind: load | discharge | ...`) that *derived*
  load/discharge from click context. The K2 `completionPath.kind` refactor
  lost that and pushed action semantics into structural YAML conventions.
- Three more source protocols were read for coverage:
  `docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md` (cell culture + MTT,
  complete), `docs/Miraculin_Protocol_2026.md` (protein purification, rough
  draft), `docs/SDS-PAGE_Protocol_2026.md` (gel electrophoresis, rough draft).
- The model collapsed: there are no step "kinds" and no interaction
  "patterns" -- everything is an interaction on a target, and the variety
  lives in a closed `action` vocabulary of a small set of families
  (`liquid`, `equipment`, `object`, `choose`, `popup`, `question`,
  `navigate`), each with an optional sub-type. The count is still settling:
  `solid` was dropped once it became clear that handling a solid (berries to
  powder) is not a distinct action -- it is an SVG-swap *effect* of an
  ordinary `equipment` or `liquid` action. Separating the action (the verb
  the student does) from its effect (what changes) is itself a design task.
- Then one more correction, pedagogy-first: not every interaction is a click.
  Setting a pipette volume or a voltage is a *skill*. The current sim
  regressed skill-based pipetting into a timed click. The model needs a
  second axis -- an interaction `mode` -- where `click` is the simple mode and
  `dial` is the continuous, skill-based mode (volume set-points, voltage, pH
  titration-to-target).
- Then the action model itself reframed: actions form a class hierarchy in
  the vocabulary sense (not necessarily a TypeScript inheritance requirement),
  not a flat list. A small set of *base* actions are SVG / layout / cursor /
  scene primitives -- `SvgSwap`, `ColorChange`, `CursorAttach` (a picked-up
  tool follows the cursor), `SceneChange`, `LayoutMove`. Designers build the
  higher-level, pedagogically-named actions (draw, dispense, grind, assemble)
  by *composing* one or more base primitives -- composition, not single-parent
  inheritance. The earlier "families" were mid-level composed actions, not the
  base.

This is PRIMARY_CONTRACT item 1's documented failure -- "TypeScript was
developed around the hood scene ... no longer acceptable" -- reappearing one
layer up, in the protocol vocabulary, plus a pedagogy regression on top.

### Course-corrections: from overloaded `action` to a two-level step/interaction model

A first pass through M1 and M2 converged on a `target + mode + action` model.
Review found the real defect: the word `action` was carrying four distinct
meanings at once -- what the learner does, how correctness is judged, what the
scene changes, and what pedagogical skill is taught. That overloading, not bad
reasoning, is the vocabulary collapse. The hard insights from the first pass
all stand: scene-specific drift is real, pedagogy is separate from
implementation, composition beats taxonomy, primitives are separate from
composed behavior, and the system needs a stable semantic substrate. Only the
terminology failed.

QTI (the IMS Question and Test Interoperability model) exposed the missing
separations. A first refinement split the overloaded `action` into seven flat
slots; review tightened that to six (`prompt`, `target`, `gesture`,
`validator`, `scene_operation`, `outcome`), dropping a redundant `interaction`
task-type enum because the `target`'s kind already carries the task semantics.
Then a fit check found the deeper defect: the flat model assumed one step
equals one gesture, and real protocol steps do not work that way. "Wash the
flask with 4 mL PBS" is one step but three gestures -- click the pipette,
click the source, click the destination -- each its own target / gesture /
validator with its own local effect. The flat six-slot model had no place for
that nesting.

QTI handles exactly this with multipart items: one item contains several
interactions, each with its own response variable, and response processing
combines those into item-level outcomes. The corrected model copies that
structure. It is two levels, not one:

- A `step` has a `prompt`, an ordered `sequence` of interactions, a
  `step_validator` (checks the whole sequence or the final state), and an
  `outcome` (complete, retry, feedback, advance).
- An `interaction` -- one entry in the `sequence` -- has a `target`, a
  `gesture`, a `validator` (checks that one gesture on that one target), and a
  `response`.
- A `response` is a container, not a primitive: it holds `scene_operations`
  (the durable primitive vocabulary -- `SvgSwap`, `ColorChange`,
  `CursorAttach`, `SceneChange`, `LayoutMove`, `LiquidDisplayChange`), an
  optional `feedback`, and an optional `state_update`. `response` is broader
  than a scene effect -- it can be feedback only, a modal open or close, or no
  visible change at all -- which is why it stays distinct from the
  `scene_operation` primitive layer beneath it.

The two-level split preserves local validation (did the learner click the
right tool?) without losing whole-step correctness (did the flask end up with
4 mL PBS, in the right order?). The first pass's "base actions" (`SvgSwap` and
the rest) were never learner actions -- they are the `scene_operation`
primitives inside a `response`. The first pass's `mode` axis (`click`, `dial`)
is the `gesture` slot (`click`, `drag`, `adjust`, `select`, `type`). The word
`action` is retired.

QTI lineage and its limits. The model inherits QTI's conceptual decomposition
(see [QTI_v3_SPEC.md](QTI_v3_SPEC.md), a reference copy of the QTI 3 guide):
`prompt` is QTI's item body and `qti-prompt`; a `step` holding a `sequence` of
interactions is QTI's multipart item; the interaction `validator` and the
`step_validator` together are QTI's `qti-response-processing` at two scopes;
`outcome` is QTI's outcome variables and feedback. QTI's interaction-type
concept is deliberately not a slot here. QTI separates interaction-type from
target because LMS systems need analytics, accessibility, alternate
renderers, keyboard navigation, and delivery-engine portability. This repo is
a simulator, not an assessment interchange format -- the `target` is a
semantic, addressable scene object (`pipette`, `well_A1`, `voltage_dial`), and
its kind carries the task meaning QTI would have placed in an interaction
type. QTI's interaction names still inform target typing: `hotspot`, for
example, gave the right mental model but the wrong formal term, because the
runtime tracks a named scene object, not a coordinate region on an image, and
the glow is presentation, not target identity. The `gesture` slot, the
`scene_operation` primitive layer, the `response` container, and the
reframing of `target` from QTI's declared response variable to an addressable
scene object are this repo's lab-sim extension. The plan adopts QTI's ideas,
not its format: QTI 3 is XML with web-component vocabularies and PCI
Javascript bridges, and that machinery is explicitly out of scope. The
conceptual separation is the durable insight; the XML is not.

This plan is course-corrected, not restarted. M1's evidence artifact stands.
The M2 design doc's first WP-SLOT1 draft (`target + mode + action`, boolean
base) and the intermediate flat six-slot model are both superseded; M2's model
work is reworked under the two-level step/interaction model.

The user's stated goal: a unified interaction vocabulary for all simulations
going forward, not locked to any scene, designed pedagogy-first. The intended
outcome of this plan is that vocabulary -- the two-level step/interaction
model, its slot definitions, the `scene_operation` primitives, the `response`
container, and the domain-verb composition rule -- written into
`docs/PROTOCOL_VOCABULARY.md` and `docs/SCENE_VOCABULARY.md`, ratified against
all four protocols, and ready for a separate follow-on plan to implement.

## Objectives

- Define one scene-agnostic two-level interaction model: a `step` has `prompt`,
  an ordered `sequence` of interactions, a `step_validator`, and an `outcome`;
  each `interaction` in the `sequence` has `target`, `gesture`, `validator`,
  and `response`. No single term carries learner behavior, validation, scene
  mutation, and pedagogy at once, and one step can hold many gestures.
- Define the `step` level: `prompt` (the instruction text), the ordered
  `sequence` of interactions, the `step_validator` (whole-sequence or
  final-state correctness), and the `outcome` (complete, retry, feedback,
  advance).
- Define the `target` slot (interaction level): the addressable, semantic
  scene object or control the student acts on (`pipette`, `well_A1`,
  `voltage_dial`, `answer_choice`). The target's kind carries the task
  semantics QTI would have placed in a separate interaction-type; define how a
  target declares its kind.
- Define the `gesture` slot (interaction level): the low-level user motion
  (`click`, `drag`, `adjust`, `select`, `type`), with an extension rule.
  `adjust` is the continuous, skill-based set-point gesture (volume, voltage,
  pH-to-target) -- the first pass called this `dial` mode.
- Define the two validation scopes: the interaction `validator` (one gesture
  on one target) and the `step_validator` (the whole sequence or the final
  state), and spell out how interaction validators compose into step
  validation -- including the iterative loop (`step_validator` plus
  `outcome: retry`).
- Define the `response` container (interaction level): it holds
  `scene_operations` (a list of typed primitives), an optional `feedback`, and
  an optional `state_update`. State why `response` is broader than a scene
  effect -- it can be feedback only, a modal open or close, or no visible
  change -- so it stays distinct from the `scene_operation` primitive layer.
- Define the `scene_operation` primitive vocabulary as a class hierarchy in
  the vocabulary sense (not necessarily TypeScript inheritance): a small
  ratified initial set of typed primitives (`SvgSwap`, `ColorChange`,
  `CursorAttach`, `SceneChange`, `LayoutMove`, `LiquidDisplayChange`, plus any
  further the evidence forces) -- the first five are the first pass's
  mis-named "base actions"; `LiquidDisplayChange` was forced by the fit check,
  where liquid-transfer steps recur across every cell-culture protocol -- plus
  a composition rule. `scene_operation` stays the durable primitive layer
  inside a `response`; it is not renamed to `response`.
- Specify every `scene_operation` primitive with typed fields, not prose. A
  `response` may read like prose in worked examples, but the spec for each
  primitive must define typed fields (for example `LiquidDisplayChange` has
  `type`, `target`, `liquid`, `volumeMl`, `operation`).
- Document each initial `scene_operation` primitive to a higher standard than
  composed behavior, as a durable vocabulary primitive (see the
  scene-operation documentation requirement under M2).
- Define `outcome` (step level): complete, retry, feedback, advance -- distinct
  from what the learner does and what the scene changes.
- Define domain verbs (grind, draw, dispense, assemble) as named compositions.
  An interaction-level domain verb expands to one `target / gesture /
  validator / response`; a step-level domain verb expands to a whole
  `sequence` plus its `step_validator`. Each has a documented expansion. A
  domain verb is authoring vocabulary, not base vocabulary, and implies no
  hidden state change -- all state change is explicit in a `response`, as a
  `scene_operation` mutation or a `state_update`. A domain verb that cannot be
  expressed as slots is evidence the model is incomplete or the verb hides a
  new `scene_operation`.
- Establish the cost guardrail: new domain verbs are cheap; new `gesture`
  values and new `scene_operation` primitives are expensive and require
  evidence.
- Establish pedagogy-first as a binding design rule: each interaction's
  `target` and `gesture` are chosen to teach a specific skill; the
  anti-pattern is collapsing a skill-based interaction into a rote click.
- Define the runtime state and event model the vocabulary depends on.
- Draw an explicit scene-vs-protocol boundary: what the protocol vocabulary
  names versus what a scene adapter owns.
- Ratify the vocabulary by mapping all four protocols and the 7 content files
  to it, with a coverage matrix and a residual-gap list.
- Leave `docs/PROTOCOL_VOCABULARY.md` and `docs/SCENE_VOCABULARY.md` rewritten
  and internally consistent, ready for a code-migration follow-on plan.

## Design philosophy

This plan is pedagogy-first: the vocabulary exists to teach lab skills, and
the model is shaped to preserve skill-based interaction even though
"everything is a click" would be simpler to build. The rejected alternative is
exactly that all-click collapse -- it was rejected because it is the regression
that already happened once, turning skill-based pipetting into a timed click.
The second rejected alternative is the four-`kind` status quo: it bakes the
cell-culture scene into the vocabulary, the failure PRIMARY_CONTRACT item 1
names. The plan also designs on paper and ratifies against four protocols
before any code changes -- accepting that the docs will, for a while, describe
a vocabulary the code does not yet implement. This leans on "Long-term over
short-term" and "Fix the design, not the symptom" (`docs/REPO_STYLE.md`): the
durable fix is a vocabulary proven against the hardest inputs first.

The plan also commits to separation of concerns over a single clever term, and
to matching the model's shape to the work. The first pass produced one word,
`action`, that meant four things; the corrected model spends named slots at
two levels to keep learner behavior, validation, scene mutation, and pedagogy
from collapsing into each other. Three alternatives were rejected: the compact
`target + mode + action` triple -- compact, but exactly the overloading that
failed; the seven-slot model that added an `interaction` task-type enum on top
of `target`, redundant because the target already carries the task semantics;
and the flat six-slot model, which assumed one step equals one gesture and so
could not express a step like "wash the flask with 4 mL PBS" that is one
instruction but three gestures. The two-level step/interaction model is the
durable fix: a `step` owns a `sequence` of interactions and whole-step
correctness, each `interaction` owns one gesture and its local correctness.
The cost guardrail enforces the discipline: new domain verbs (named
compositions over the slots, at either level) are cheap and expected; new
`gesture` values and new `scene_operation` primitives are expensive and need
evidence. That keeps authors productive without re-growing the scene-specific
taxonomy QTI just helped collapse.

This is a course-correction, not a restart. The first pass's conceptual work
-- scene-specific drift, pedagogy versus implementation, composition over
taxonomy, primitives versus composed behavior, the need for a stable semantic
substrate -- is sound and carried forward. Only the terminology is reworked.

## Scope

- Consolidate the existing interaction inventory into one committed evidence
  artifact: the 54-step content mapping, the legacy resolver model, and the
  exhaustive mapping of all four protocols (already drafted during the
  investigation that produced this plan).
- Design the two-level step/interaction model: a `step`
  (`prompt`, `sequence`, `step_validator`, `outcome`) wrapping an ordered
  `sequence` of interactions (`target`, `gesture`, `validator`, `response`).
- Design the `target` slot (semantic addressable scene object; how a target
  declares its kind) and the `gesture` slot (`click`, `drag`, `adjust`,
  `select`, `type`, extension rule).
- Design the interaction `validator` and the `step_validator` as the two
  validation scopes, and how the first composes into the second.
- Design the `response` container (`scene_operations`, optional `feedback`,
  optional `state_update`).
- Design the `scene_operation` typed-primitive vocabulary, its typed-field
  spec requirement, its documentation standard, and the composition rule.
- Design the `outcome` slot (complete, retry, feedback, advance), including
  the iterative loop as `step_validator` plus `outcome: retry`.
- Design the domain-verb mechanism: named compositions at the interaction
  level (one interaction) or the step level (a whole sequence), each with a
  documented expansion, plus the cost guardrail (verbs cheap, gestures and
  primitives expensive).
- Write the pedagogy-first rule: how an interaction's `target` and `gesture`
  are chosen to teach.
- Design the state and event model.
- Define the scene-vs-protocol boundary.
- Ratify the design: map all four protocols and the 7 content files to it;
  produce a coverage matrix and a residual-gap list.
- Rewrite `docs/PROTOCOL_VOCABULARY.md` and `docs/SCENE_VOCABULARY.md`.
- Add a "Semantic inheritance and composition" section to
  `docs/PRIMARY_DESIGN.md` -- the repo-wide architectural philosophy the
  vocabulary design rests on (agent-editable philosophy, not a contract
  change). (Done in the first pass; reconcile its wording with the two-level
  step/interaction model.)
- Align every `docs/` file that references the interaction model -- the three
  protocol docs (`PROTOCOL_YAML_FORMAT.md`, `PROTOCOL_STEPS.md`,
  `PROTOCOL_AUTHORING_GUIDE.md`), the scene docs (`SCENE_ARCHITECTURE.md`,
  `SCENE_YAML_FORMAT.md`), and -- because `scene_operation` primitives are SVG
  / layout operations -- `SVG_PIPELINE.md`, `LAYOUT_ENGINE.md`,
  `LIQUID_CONVENTION.md`, plus any others a `docs/` audit surfaces -- to the
  new vocabulary. No transitional notes: each affected section is rewritten to
  the new vocabulary, deleted if obsolete, or moved to `docs/archive/` if it
  is still useful as historical context. The whole doc set stays in sync.
- Mark sections that describe unimplemented behavior as target-state, while
  keeping current-code sections clearly labeled.

## Non-goals

- Building the `adjust`-gesture interaction (the continuous volume/voltage
  control) -- the user wants it built, but building is code; this plan
  *defines* the gesture, the follow-on code plan builds it.
- Changing `src/scene_runtime/contract.ts` or any runtime code.
- Editing `src/scenes/` -- frozen per `SRC_SCENES_FREEZE.md`.
- Migrating `content/*/protocol.yaml` files -- ratification maps them on
  paper; it does not rewrite them.
- Fixing the source-protocol science -- OVCAR8 math is tracked in
  `docs/OVCAR8_MATH_REVIEW.md`; Miraculin and SDS-PAGE are rough drafts with
  stubbed sections. Ratification uses them as interaction-shape evidence.
- Resolving the dead-field cleanup (`stateChange.heldLiquid`,
  `consumesVolumeMl`, per-interaction `completionEvent`, `requiredItems`) --
  the new state/event model supersedes these, but deleting them is code work.
- Building Miraculin or SDS-PAGE scenes -- they are ratification inputs only.
- Adopting QTI XML, the QTI web-component vocabularies, or QTI Portable Custom
  Interactions -- `docs/QTI_v3_SPEC.md` is a conceptual reference only. The
  plan inherits QTI's multipart-item decomposition and its two-scope
  response-processing idea, not its format or interop machinery.

## Current state summary

The model after the course-corrections is two levels. No single term carries
more than one concern, and one step can hold many gestures.

Step level:

- `prompt` -- the instruction or question text shown to the student.
- `sequence` -- the ordered list of interactions the step is made of.
- `step_validator` -- how whole-step correctness is judged: all required
  interactions completed (in order where order matters) and the final state
  reached. This is where the first pass's boolean-return idea lives, at step
  scope. The iterative loop is a `step_validator` condition plus
  `outcome: retry`.
- `outcome` -- what happens after the step: complete, retry, feedback,
  advance.

Interaction level (one entry in `sequence`):

- `target` -- the addressable, semantic scene object or control the student
  acts on (`pipette`, `well_A1`, `voltage_dial`, `answer_choice`). The
  target's kind carries the task semantics; an `interaction` task-type enum is
  not a separate slot because it would only restate what the target already
  is.
- `gesture` -- the low-level user motion: `click`, `drag`, `adjust`, `select`,
  `type`. `adjust` is the continuous skill-based set-point gesture (the first
  pass's `dial`). This set is still settling.
- `validator` -- how this one interaction is judged: the correct `gesture` on
  the correct `target` with the required state satisfied.
- `response` -- a container for what the interaction produces:
  `scene_operations` (a list of typed primitives), an optional `feedback`
  string, and an optional `state_update`. A `response` may be `feedback` only,
  a modal open or close, or no visible change at all, which is why it stays
  broader than -- and distinct from -- the `scene_operation` layer.

`scene_operation` is the durable typed-primitive vocabulary inside a
`response`: `SvgSwap`, `ColorChange`, `CursorAttach` (a picked-up tool follows
the cursor), `SceneChange`, `LayoutMove`, `LiquidDisplayChange` (liquid
appears, a volume changes, or well contents update), plus any further the
evidence forces. The first five are the first pass's mis-named "base actions";
`LiquidDisplayChange` was forced by the fit check. Every primitive is
specified with typed fields, not prose -- for example a `LiquidDisplayChange`
has `type`, `target`, `liquid`, `volumeMl`, `operation`. This set is still
settling.

Domain verbs (grind, draw, dispense, assemble, wash) are named compositions:
author-facing macros with a documented expansion. An interaction-level domain
verb expands to one `target / gesture / validator / response`; a step-level
domain verb expands to a whole `sequence` plus its `step_validator`. For
example a step-level `wash` expands to a three-interaction sequence (click the
pipette, click the source, click the destination), each interaction carrying
its own `validator` and `response`, with a `step_validator` checking the
destination received the right liquid and volume. An interaction-level `grind`
expands to `target: pestle`, `gesture: adjust` or `click`, `validator: correct
gesture on pestle with sample present`, `response: { scene_operations:
[SvgSwap(berries -> powder)] }`. A domain verb is authoring vocabulary, not
base vocabulary, and implies no hidden state change -- all state change is
explicit in a `response`, as a `scene_operation` mutation or a `state_update`.
The first pass's "families" (`liquid`, `equipment`, `object`, `choose`,
`popup`, `question`, `navigate`) were a half-formed version of this layer.
Cost guardrail: new domain verbs are cheap; new `gesture` values and new
`scene_operation` primitives are expensive and require evidence. A domain verb
that cannot be expressed as the two-level model is evidence the model is
incomplete or the verb hides a new `scene_operation`.

Defining the two levels, the `response` container, the `scene_operation`
typed-primitive set, and the domain-verb expansion mechanism is M2's central
task.

Coverage already established by the investigation (under the first pass's
terms, still valid as evidence): all 54 current content steps fit; OVCAR8 fits
fully; Miraculin's reverse-micelle core fits (its chromatography Parts 5-7 are
unwritten stubs); SDS-PAGE fits once the `adjust` gesture absorbs voltage and
volume set-points. The `adjust` gesture resolves the three biggest gaps the
coverage pass flagged (continuous voltage, volume set-point, pH titration) --
they are not multiple-choice prompts. M3 re-ratifies all of this against the
two-level model.

A fit check against the cell-culture protocol family (multiple-choice
planning steps, direct-tool steps, pipetting / liquid transfer, modal review
steps) produced the two-level model. It first confirmed the slot set is
sufficient -- every step is some combination of click or `adjust` targets,
validators, scene operations, and a completion outcome, with no seventh
`interaction` slot needed -- and then exposed the nesting gap: a pipetting
step is one instruction but three gestures, which a flat one-step-one-gesture
model cannot hold. The same check forced one `scene_operation` addition,
`LiquidDisplayChange`, because liquid appearing, a volume changing, or well
contents updating recurs in every one of those protocols and clears the cost
guardrail's evidence bar.

Residual genuine gaps, flagged and not yet designed: timed-wait visualization
(duration as a typed field on an equipment `scene_operation`). The iterative
loop is no longer a residual gap -- the two-level model handles it directly as
a `step_validator` condition plus `outcome: retry`.

What is broken in the docs:

- `docs/PROTOCOL_VOCABULARY.md` has no term for an interaction's `target`, no
  term for the `gesture`, no concept of an interaction `validator`, a
  `step_validator`, a `response` container, or a `scene_operation` primitive,
  and never spells out the step / sequence / interaction nesting or the
  interaction -> response -> step_validator -> outcome chain. `plate target`
  and `tube target` are scene-specific.
- `docs/SCENE_VOCABULARY.md` ties `completion event` to the legacy
  `triggerStep` / `registeredEmitters` model and names the same concept as
  `PROTOCOL_VOCABULARY.md` ("click target" vs `ClickTarget`) with no
  cross-reference.
- `docs/active_plans/scene_runtime_doc_conflicts.md` (the M0 audit) classified
  every `plateTargets` / `tubeTargets` section as `matches-contract`,
  justified by contract item C3. That is a category error -- C3 governs scene
  geometry, not protocol vocabulary -- and it let the drift through. This
  plan's ratification supersedes that verdict.

Evidence base: the in-conversation inventory artifacts (54-step mapping,
legacy resolver catalog, the three-protocol action/mode coverage tables),
plus `src/interaction_resolver.ts`, `src/scene_runtime/contract.ts`,
`src/scene_runtime/dispatch/index.ts`, `src/scene_runtime/highlight/index.ts`,
`tests/playwright/walker/index.ts`, the 7 `content/*/protocol.yaml` files, and
the four source protocol docs.

## Architecture boundaries and ownership

This plan produces documentation only. "Components" are the doc artifacts.

- Evidence artifact: a new file under `docs/active_plans/` (proposed
  `docs/active_plans/protocol_interaction_inventory.md`). One owner. The
  single source of truth for what interactions exist across all inputs.
- Vocabulary design doc: a new working doc under `docs/active_plans/`
  (proposed `docs/active_plans/unified_interaction_vocabulary_design.md`).
  The design surface before the canonical docs are rewritten.
- Canonical protocol vocabulary: `docs/PROTOCOL_VOCABULARY.md`. One owner.
- Canonical scene vocabulary: `docs/SCENE_VOCABULARY.md`. One owner.
- Dependent docs: `docs/PROTOCOL_YAML_FORMAT.md`, `docs/PROTOCOL_STEPS.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`. One owner for the alignment pass.
- Ratification matrix: a section in the evidence artifact; one owner per
  protocol mapped.

Durable terminology: the plan's milestones / workstreams / work packages never
enter doc identifiers. The durable labels are the vocabulary terms the design
defines -- the step and interaction slot names, the `gesture` value set, the
target-kind mechanism, the `response` container, the `scene_operation`
primitive names, and the domain-verb mechanism -- and naming them well for
YAML authors is the plan's central deliverable.

### Response container and scene-operation primitive contract

A `response` is the interaction-level container for what a correct interaction
produces. It is not itself a primitive. A `response` holds:

- `scene_operations` -- an ordered list of typed `scene_operation` primitives
  (may be empty).
- `feedback` -- optional learner-facing messaging (correct, retry hint, etc.).
- `state_update` -- optional non-visual runtime bookkeeping. `state_update` is
  only for runtime state that cannot be represented as a typed
  `scene_operation`; anything with a visual effect belongs in
  `scene_operations`.

A `response` may be `feedback` only, a modal open or close, or no visible
change at all. That breadth is why `response` stays distinct from the
`scene_operation` layer beneath it and is not renamed.

`scene_operation` primitives are the smallest protocol-visible scene effects
the runtime guarantees across all scenes. They are not learner actions; they
are what the scene does inside a `response`. A `scene_operation` primitive may:

- mutate runtime state
- mutate scene presentation
- attach or detach cursor state
- transition scene context
- move or re-layout scene objects

Every `scene_operation` primitive is specified with typed fields, not prose. A
`response` may read like prose in a worked example, but the spec for each
primitive must define typed fields (for example `LiquidDisplayChange` has
`type`, `target`, `liquid`, `volumeMl`, `operation`). For each primitive the
spec must define:

- its typed fields and their value types
- its required inputs
- the state it reads
- the state it may mutate
- its visual / runtime side effects
- whether it is reversible
- whether it is instantaneous or duration-based
- whether it emits completion or progress events

Domain verbs are declarative named compositions, chosen for pedagogy and
author readability. An interaction-level domain verb expands to one
interaction; a step-level domain verb expands to a whole `sequence` plus its
`step_validator`. Each domain verb has a documented expansion and implies no
hidden state change -- all state change is explicit in a `response`, as a
`scene_operation` mutation or a `state_update`. The runtime executes steps,
interactions, and primitives; protocol authors primarily reason in domain
verbs. Cost guardrail: domain verbs are cheap to add; `gesture` values and
`scene_operation` primitives are expensive and require evidence.

Layout semantics are treated here only as protocol-visible `scene_operation`
effects. The underlying layout engine remains the responsibility of
scene / runtime architecture and is out of scope for this plan.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-EV | `docs/active_plans/protocol_interaction_inventory.md` | 1 to 2 |
| M2 / WS-PHIL | `docs/PRIMARY_DESIGN.md` -- semantic inheritance section | 1 |
| M2 / WS-SLOT | design doc -- two-level step/interaction model, target + gesture slots | 1 |
| M2 / WS-SOP | design doc -- response container, scene_operation primitives, domain-verb mechanism | 1 |
| M2 / WS-PED | design doc -- pedagogy-first rule | 1 |
| M2 / WS-STA | design doc -- interaction validator, step_validator, outcome, state + event model | 1 |
| M2 / WS-BND | design doc -- scene/protocol boundary | 1 |
| M3 / WS-RAT-A | ratification: OVCAR8 + 7 current content files | 1 |
| M3 / WS-RAT-B | ratification: Miraculin | 1 |
| M3 / WS-RAT-C | ratification: SDS-PAGE | 1 |
| M4 / WS-DOC-P | `docs/PROTOCOL_VOCABULARY.md` rewrite | 1 to 2 |
| M4 / WS-DOC-S | `docs/SCENE_VOCABULARY.md` rewrite | 1 to 2 |
| M4 / WS-DOC-D | dependent-doc alignment (all docs/ referencing the model) | 2 to 3 |
| M4 / WS-DOC-C | changelog + close-out + follow-on plan stub | 1 |

Patch counts are deliberately below the `CAPACITY_AND_SIZING.md` code-plan
ranges: this is a documentation-design plan, and each doc artifact is sized
for one owner and one reviewable patch.

## Milestone plan

### Milestone M1: Consolidate the interaction evidence base

- Depends on: none.
- Workstreams: WS-EV.
- Entry criteria: none.
- Exit criteria:
  - One committed artifact catalogs: every click-target field across the 7
    content files; the 54-step interaction mapping; the legacy
    `interaction_resolver.ts` action model; and the exhaustive interaction
    mapping of OVCAR8, Miraculin, and SDS-PAGE (formalized from the
    investigation's draft tables).
  - The artifact lists candidate interaction effects, candidate primitives,
    candidate skill-based gestures, and the residual gaps (iterative loop,
    timed-wait visualization), each tagged with the requiring protocol(s).
  - Known inconsistencies recorded (e.g. `decant_mtt` expressed two ways;
    `resuspend` volume mismatch; `completionEvent` naming chaos).
  - `docs/CHANGELOG.md` draft entry started.
- Note: M1 is complete. Its artifact uses the first pass's `target + mode +
  action` terms; that is valid evidence and M2 re-reads it under the
  two-level step/interaction model rather than rewriting it.
- Parallel-plan ready: no -- a single consolidation artifact authored by one
  owner; splitting it creates merge churn on one file. Max parallel doers: 1.

### Milestone M2: Design the unified model

- Depends on: M1 -- the design works from the consolidated evidence.
- Workstreams: WS-PHIL, WS-SLOT, WS-SOP, WS-PED, WS-STA, WS-BND.
- Entry criteria: M1 artifact complete; the two-level step/interaction
  course-correction accepted; OQ-6 and OQ-7 resolved.
- Exit criteria:
  - The two-level model is defined: a `step` (`prompt`, `sequence`,
    `step_validator`, `outcome`) wrapping an ordered `sequence` of
    interactions (`target`, `gesture`, `validator`, `response`), each slot
    with a one-line charter saying which single concern it owns, and the
    interaction -> response -> step_validator -> outcome chain spelled out.
  - The `target` slot is defined: the addressable, semantic scene object or
    control; how a target declares its kind; and why the target's kind carries
    the task semantics so no separate `interaction` task-type slot is needed.
  - The `gesture` slot is defined: `click`, `drag`, `adjust`, `select`,
    `type`, what each means for a YAML author, how a scene renders each, and
    the extension rule. `adjust` is defined as the skill-based continuous
    set-point gesture (volume, voltage, pH-to-target).
  - The two validation scopes are defined: the interaction `validator` (the
    correct `gesture` on the correct `target` with required state satisfied --
    this carries the legacy derive-don't-declare model and the boolean-return
    idea at interaction scope) and the `step_validator` (all required
    interactions completed, in order where order matters, and the final state
    reached). How interaction validators compose into step validation is
    written.
  - The `response` container is defined: `scene_operations` (a list of typed
    primitives), optional `feedback`, optional `state_update`; why `response`
    is broader than a scene effect and stays distinct from the
    `scene_operation` layer; and why it is not renamed.
  - The `scene_operation` vocabulary is defined as a class hierarchy in the
    vocabulary sense (not necessarily TypeScript inheritance): the typed
    primitives (`SvgSwap`, `ColorChange`, `CursorAttach`, `SceneChange`,
    `LayoutMove`, `LiquidDisplayChange`, plus any further the evidence forces)
    are named and ratified for the initial vocabulary, and the composition
    rule is written.
  - Scene-operation documentation requirement: the primitive set is
    extensible, but not casual. M2 must specify each initial `scene_operation`
    primitive with typed fields, not prose, and document it as a durable
    vocabulary primitive, defining for each one: its typed fields and their
    value types; what it means; what state it may read; what state it may
    change; what visual effect it produces; what it must not do; examples from
    at least two protocols where possible; common mistakes or anti-patterns;
    and how domain verbs may build on it. Adding a new primitive later
    requires the same documentation standard and evidence that composition
    from existing primitives is not sufficient.
  - The domain-verb mechanism is defined: an interaction-level domain verb
    expands to one interaction, a step-level domain verb expands to a whole
    `sequence` plus its `step_validator`, each with a documented expansion,
    and it implies no hidden state change. The cost guardrail is written --
    domain verbs cheap, `gesture` values and `scene_operation` primitives
    expensive. Every domain verb the four protocols need (grind, draw,
    dispense, assemble, wash, and the rest) is shown as a worked expansion in
    YAML-author language.
  - The `outcome` slot is defined: complete, retry, feedback, advance; the
    iterative loop is a `step_validator` condition plus `outcome: retry`.
  - The pedagogy-first rule is written: how an author chooses an
    interaction's `target` and `gesture` to teach a skill, with the
    skill-to-timed-click regression named as the anti-pattern.
  - The state and event model is defined: what runtime state the vocabulary
    assumes; state change is explicit in a `response` (a `scene_operation`
    mutation or a `state_update`), and domain verbs do not imply hidden state
    changes; how events are emitted and named.
  - The scene-vs-protocol boundary is written as an explicit rule: the
    protocol vocabulary names no plate, well, tube, gel, or column; the scene
    adapter owns geometry, target expansion, and how a `gesture` is rendered.
  - The residual gap (timed-wait visualization) has a written disposition:
    designed into the model, or deferred with a reason. The iterative loop is
    recorded as resolved by the two-level model, not deferred.
  - The "Semantic inheritance and composition" section in
    `docs/PRIMARY_DESIGN.md` (added in the first pass) is reconciled with the
    two-level step/interaction terminology.
  - The first pass's superseded WP-SLOT1 draft content in the design doc is
    reworked to the two-level model; no `target + mode + action` language, no
    seven-slot `interaction` slot, and no flat six-slot framing survives in
    the design doc.
  - All other design output lives in the working design doc; the canonical
    vocabulary docs (`PROTOCOL_VOCABULARY.md`, `SCENE_VOCABULARY.md`) are
    untouched until M4.
- Parallel-plan ready: yes -- the six workstreams own disjoint artifacts and
  share only the M1 evidence artifact (read-only). WS-SOP, WS-PED, WS-STA,
  WS-BND consume WS-SLOT's slot definitions, so they start a beat behind;
  WS-PHIL (which writes `docs/PRIMARY_DESIGN.md`) runs fully in parallel. Max
  parallel doers: 6.

### Milestone M3: Ratify the design against all four protocols

- Depends on: M2 -- ratification tests the designed vocabulary.
- Workstreams: WS-RAT-A, WS-RAT-B, WS-RAT-C.
- Entry criteria: M2 design doc complete.
- Exit criteria:
  - Every step of OVCAR8 and all 7 current `content/*/protocol.yaml` files is
    mapped to the two-level model: the step slots (`prompt`, `sequence`,
    `step_validator`, `outcome`) and, for each interaction in the `sequence`,
    its slots (`target`, `gesture`, `validator`, `response`), plus the domain
    verb if one applies (WS-RAT-A).
  - Every Miraculin procedure step with real content is mapped (WS-RAT-B).
  - Every SDS-PAGE procedure step with real content is mapped (WS-RAT-C).
  - Each workstream flags any step or interaction the model cannot express and
    any interaction whose pedagogy is unclear (which skill does it teach, is
    the `target` and `gesture` pairing right).
  - A consolidated residual-gap list names every unmappable step and says
    whether it needs a new domain verb (cheap), a new `gesture` value
    (medium), a new `scene_operation` primitive (expensive), or a design
    revision (expensive).
  - If ratification surfaces a design gap, M2's design doc is revised and the
    revision noted; M3 is not "done" until the gap list is empty or every
    entry has an accepted disposition.
- Parallel-plan ready: yes -- three disjoint protocol-mapping workstreams,
  each read-only against its protocol and the shared design doc. The
  residual-gap consolidation is a short serial join owned by WS-RAT-A. Max
  parallel doers: 3.

### Milestone M4: Rewrite the canonical docs and close out

- Depends on: M3 -- the canonical docs encode the ratified vocabulary.
- Workstreams: WS-DOC-P, WS-DOC-S, WS-DOC-D, WS-DOC-C.
- Entry criteria: M3 ratification complete; residual-gap list dispositioned.
- Exit criteria:
  - `docs/PROTOCOL_VOCABULARY.md` rewritten: the two-level step/interaction
    model, the `target` slot and target-kind mechanism, the `gesture` value
    set, the two validation scopes, the `response` container, the
    `scene_operation` typed-primitive vocabulary, the domain-verb mechanism,
    the pedagogy-first rule, the state/event model, the scene/protocol
    boundary. Target-state sections clearly labeled; current-code sections
    clearly labeled.
  - `docs/SCENE_VOCABULARY.md` rewritten: the scene side of the boundary,
    including how a scene renders each `gesture`, with explicit
    cross-references to `PROTOCOL_VOCABULARY.md` for shared concepts.
  - Every `docs/` file that references the interaction model (the protocol
    docs plus the scene / SVG / layout / liquid docs, full set confirmed by a
    `docs/` audit) is aligned to the new vocabulary -- each affected section
    rewritten, deleted if obsolete, or moved to `docs/archive/` if still
    useful as history; no transitional notes. The doc set is in sync, no file
    contradicting the canonical two.
  - `docs/CHANGELOG.md` entry finalized.
  - A follow-on code-migration plan is stubbed in `docs/active_plans/`,
    pointing at the ratified vocabulary as its input and naming the
    `adjust`-gesture build as an early deliverable.
  - `docs/active_plans/scene_runtime_doc_conflicts.md` annotated where this
    plan supersedes its `matches-contract` verdict on the
    `plateTargets` / `tubeTargets` sections.
- Parallel-plan ready: yes -- four disjoint doc owners. WS-DOC-D and WS-DOC-C
  consume the finished WS-DOC-P / WS-DOC-S text. Max parallel doers: 4
  (WS-DOC-D and WS-DOC-C gated on the two rewrites landing).

## Workstream breakdown

### Workstream WS-EV: Evidence consolidation

- Owner: planner.
- Interfaces:
  - Needs: the in-conversation inventory artifacts; the 7 content files; the
    legacy resolver; the four protocol docs.
  - Provides: the consolidated evidence artifact to all of M2.
- Expected patches: 1 to 2.

### Workstream WS-PHIL: Semantic inheritance and composition philosophy

- Owner: architect.
- Interfaces:
  - Needs: M1 evidence artifact.
  - Provides: the repo-wide semantic-inheritance / composition-over-duplication
    philosophy, written into `docs/PRIMARY_DESIGN.md`, that WS-SLOT, WS-SOP,
    and WS-BND build on.
- Expected patches: 1.

### Workstream WS-SLOT: Two-level step/interaction model, target and gesture slots

- Owner: architect.
- Interfaces:
  - Needs: M1 evidence artifact.
  - Provides: the two-level step/interaction model (step slots `prompt`,
    `sequence`, `step_validator`, `outcome`; interaction slots `target`,
    `gesture`, `validator`, `response`), the `target` slot and target-kind
    mechanism, the `gesture` value set (`click`, `drag`, `adjust`, `select`,
    `type`), and the gesture extension rule to WS-SOP, WS-PED, WS-STA, WS-BND,
    and all of M3.
- Expected patches: 1.

### Workstream WS-SOP: Response container, scene-operation primitives, domain-verb mechanism

- Owner: planner.
- Interfaces:
  - Needs: M1 evidence artifact; WS-SLOT's slot definitions.
  - Provides: the `response` container definition (`scene_operations`,
    `feedback`, `state_update`), the `scene_operation` typed-primitive class
    hierarchy (the documented typed primitives plus the composition rule), the
    domain-verb mechanism with the cost guardrail, and the worked expansions
    for the four protocols' domain verbs at both the interaction and step
    levels.
- Expected patches: 1.

### Workstream WS-PED: Pedagogy-first rule

- Owner: planner.
- Interfaces:
  - Needs: WS-SLOT's target and gesture slots; WS-SOP's domain verbs.
  - Provides: the rule for choosing the `target` and `gesture` to teach a
    skill, with the skill-to-timed-click anti-pattern, to M3 (which checks
    pedagogy) and M4.
- Expected patches: 1.

### Workstream WS-STA: Interaction validator, step_validator, outcome, state and event model

- Owner: planner.
- Interfaces:
  - Needs: WS-SLOT's slot definitions; WS-SOP's `response` container and
    `scene_operation` primitives.
  - Provides: the interaction `validator` definition, the `step_validator`
    definition, how the first composes into the second, the `outcome` slot
    definition (including the iterative loop), the state model, the
    state-change-is-explicit-in-a-response rule, the event-emission rule, and
    the event-naming convention.
- Expected patches: 1.

### Workstream WS-BND: Scene-vs-protocol boundary

- Owner: architect.
- Interfaces:
  - Needs: WS-SLOT's slot definitions; WS-SOP's scene_operation primitives;
    M1 evidence on scene-specific drift.
  - Provides: the boundary rule -- protocol names no geometry; adapter owns
    geometry, target expansion, and gesture rendering -- to WS-DOC-P and
    WS-DOC-S.
- Expected patches: 1.

### Workstream WS-RAT-A: Ratify OVCAR8 and the 7 current content files

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc.
  - Provides: a coverage matrix for 8 protocols and the consolidated
    residual-gap list (this workstream owns the serial join).
- Expected patches: 1.

### Workstream WS-RAT-B: Ratify Miraculin

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc.
  - Provides: a Miraculin coverage matrix and gap entries to WS-RAT-A.
- Expected patches: 1.

### Workstream WS-RAT-C: Ratify SDS-PAGE

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc.
  - Provides: an SDS-PAGE coverage matrix and gap entries to WS-RAT-A.
- Expected patches: 1.

### Workstream WS-DOC-P: Rewrite PROTOCOL_VOCABULARY.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; M3 gap dispositions.
  - Provides: the canonical protocol vocabulary to WS-DOC-D and WS-DOC-C.
- Expected patches: 1 to 2.

### Workstream WS-DOC-S: Rewrite SCENE_VOCABULARY.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; WS-BND's boundary rule.
  - Provides: the canonical scene vocabulary, cross-referenced to
    PROTOCOL_VOCABULARY.md.
- Expected patches: 1 to 2.

### Workstream WS-DOC-D: Align all dependent docs

- Owner: planner.
- Interfaces:
  - Needs: the finished WS-DOC-P and WS-DOC-S text.
  - Provides: aligned dependent docs (each affected section rewritten, deleted
    if obsolete, or moved to `docs/archive/` -- no transitional notes) -- every
    `docs/` file that references the interaction model. Known set:
    `PROTOCOL_YAML_FORMAT.md`,
    `PROTOCOL_STEPS.md`, `PROTOCOL_AUTHORING_GUIDE.md`, `SCENE_ARCHITECTURE.md`,
    `SCENE_YAML_FORMAT.md`, `SVG_PIPELINE.md`, `LAYOUT_ENGINE.md`,
    `LIQUID_CONVENTION.md`; WP-DOC-D1 audits `docs/` to confirm the full list.
- Expected patches: 2 to 3.

### Workstream WS-DOC-C: Close-out and follow-on stub

- Owner: planner.
- Interfaces:
  - Needs: all M4 doc rewrites landed.
  - Provides: finalized changelog, the follow-on code-plan stub, and the
    annotation on `scene_runtime_doc_conflicts.md`.
- Expected patches: 1.

## Work packages

### Work package WP-EV1: Build the consolidated interaction inventory

- Owner: planner.
- Touch points: `docs/active_plans/protocol_interaction_inventory.md` (new).
- Depends on: none.
- Acceptance criteria:
  - Catalogs every click-target field across the 7 content files, with counts.
  - Includes the 54-step `target + mode + action` mapping table.
  - Includes the legacy `interaction_resolver.ts` action model.
  - Includes the `target + mode + action` mapping for OVCAR8, Miraculin, and
    SDS-PAGE, formalized from the investigation's draft tables.
  - Lists candidate author-facing composed-action categories, candidate base
    primitives, the candidate mode set, and the residual gaps, each tagged
    with the requiring protocol(s).
  - Records the known inconsistencies.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Start the `docs/CHANGELOG.md` draft entry under "Additions and New
    Features".

### Work package WP-PHIL1: Add the semantic inheritance and composition section

- Owner: architect.
- Touch points: `docs/PRIMARY_DESIGN.md`.
- Depends on: WP-EV1.
- Acceptance criteria:
  - Adds a "Semantic inheritance and composition" section stating: the system
    prefers semantic inheritance over scene-specific duplication; inheritance
    is semantic-first, not necessarily class-based -- derived concepts must
    preserve the guarantees, constraints, and meaning of their parents;
    composition is preferred over taxonomy explosion.
  - States that a new primitive requires evidence that existing primitives
    cannot express the behavior clearly, that the behavior recurs across
    multiple protocols or scenes, and that the primitive is a stable reusable
    semantic unit.
  - Frames primitives as durable vocabulary infrastructure, not short-term
    implementation conveniences.
  - Edits `docs/PRIMARY_DESIGN.md` only -- no change to
    `docs/PRIMARY_CONTRACT.md` (agent-editable philosophy, not a new contract
    item).
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Cross-reference the new section from the M2 design doc, and reconcile its
    wording with the two-level step/interaction model once WP-SLOT1 lands.

### Work package WP-SLOT1: Define the two-level step/interaction model and the target and gesture slots

- Owner: architect.
- Touch points: `docs/active_plans/unified_interaction_vocabulary_design.md`
  -- the model, target, and gesture sections. Reworks the first pass's
  superseded `target + mode + action` draft and the intermediate flat
  six-slot framing in this file.
- Depends on: WP-EV1.
- Acceptance criteria:
  - Defines the two-level model: a `step` (`prompt`, `sequence`,
    `step_validator`, `outcome`) wrapping an ordered `sequence` of
    interactions (`target`, `gesture`, `validator`, `response`), each slot
    with a one-line charter naming the single concern it owns.
  - Writes the step / sequence / interaction nesting and the
    interaction -> response -> step_validator -> outcome chain, with a worked
    example of a multi-gesture step (the "wash the flask with 4 mL PBS"
    three-interaction sequence).
  - Defines the `target` slot in YAML-author language: the addressable,
    semantic scene object or control; how a target declares its kind; and why
    the target's kind carries the task semantics so no separate `interaction`
    task-type slot is needed. Records that QTI interaction names (Choice, Hot
    Spot, Slider, Position Object, Order) informed target typing but are not
    adopted as formal terms -- the runtime tracks named scene objects, not
    coordinate regions or response variables.
  - Defines the `gesture` value set (`click`, `drag`, `adjust`, `select`,
    `type`) in YAML-author language; defines `adjust` as the skill-based
    continuous set-point gesture (volume, voltage, pH-to-target); states the
    extension rule. Documents the `select` versus `click` distinction clearly
    (OQ-8 watch item) so a later merge of `select` into `click` would be a
    small evidence-driven change, not a redesign.
  - Removes all `target + mode + action` language, the boolean-return base
    framing, the seven-slot `interaction` slot, and the flat six-slot framing
    from the design doc; that content is superseded.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Hand the model and slot definitions to WP-SOP1, WP-PED1, WP-STA1,
    WP-BND1.

### Work package WP-SOP1: Define the response container, scene_operation primitives, and domain-verb mechanism

- Owner: planner.
- Touch points: the `response`, scene_operation, and domain-verb sections of
  the design doc.
- Depends on: WP-SLOT1.
- Acceptance criteria:
  - Defines the `response` container: `scene_operations` (an ordered list of
    typed primitives), optional `feedback`, optional `state_update`. States
    plainly why `response` is broader than a scene effect (it can be feedback
    only, a modal open or close, or no visible change) and why it is not
    renamed to `scene_operation`. Constrains `state_update` to non-visual
    runtime bookkeeping that cannot be represented as a typed
    `scene_operation`.
  - Defines and ratifies the initial set of `scene_operation` primitives --
    `SvgSwap`, `ColorChange`, `CursorAttach`, `SceneChange`, `LayoutMove`,
    `LiquidDisplayChange`, plus any further the evidence forces. States
    plainly that these are scene effects, not learner actions.
    `LiquidDisplayChange` is the one primitive the fit check already forced;
    document why it is first-class and not a `SvgSwap` / `ColorChange`
    composition (it tracks a liquid quantity and well-contents state, not just
    an image swap).
  - Specifies every `scene_operation` primitive with typed fields, not prose.
    A `response` may read like prose in worked examples, but each primitive's
    spec defines typed fields (for example `LiquidDisplayChange` has `type`,
    `target`, `liquid`, `volumeMl`, `operation`).
  - Defines the composition rule and the domain-verb mechanism: an
    interaction-level domain verb expands to one interaction, a step-level
    domain verb expands to a whole `sequence` plus its `step_validator`, each
    with a documented expansion; a domain verb implies no hidden state change
    -- all state change is explicit in a `response`, as a `scene_operation`
    mutation or a `state_update`.
  - Writes the cost guardrail: new domain verbs are cheap; new `gesture`
    values and new `scene_operation` primitives are expensive and require
    evidence. States that a domain verb that cannot be expressed as the
    two-level model is evidence the model is incomplete or the verb hides a
    new `scene_operation`.
  - Documents each `scene_operation` primitive to the durable-primitive
    standard. For each: its typed fields and their value types; what it means;
    what state it may read; what state it may change; what visual effect it
    produces; what it must not do; examples from at least two protocols where
    possible; common mistakes or anti-patterns; how domain verbs may build on
    it.
  - Shows every domain verb the four protocols need (grind, draw, dispense,
    assemble, wash, and the rest) as a documented expansion at the right
    level (interaction or step), in YAML-author language.
  - Confirms multiple-choice knowledge prompts and `adjust`-gesture
    parameter-setting are kept distinct.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Flag any domain verb that will not expand cleanly back to WP-SLOT1's model
    before M3 -- it means a slot or a level is missing.

### Work package WP-PED1: Write the pedagogy-first rule

- Owner: planner.
- Touch points: the pedagogy section of the design doc.
- Depends on: WP-SLOT1, WP-SOP1.
- Acceptance criteria:
  - States how an author chooses an interaction's `target` and `gesture` to
    teach a specific skill.
  - Names the skill-to-timed-click regression as the anti-pattern, with the
    pipetting example.
  - Gives at least one worked example per gesture (a `click` interaction and
    an `adjust` interaction) showing the skill each teaches.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Hand the rule to WS-RAT-* so ratification can check each interaction's
    pedagogy.

### Work package WP-STA1: Define the interaction validator, step_validator, outcome, and the state and event model

- Owner: planner.
- Touch points: the validator, step_validator, outcome, and state/event
  sections of the design doc.
- Depends on: WP-SLOT1, WP-SOP1.
- Acceptance criteria:
  - Defines the interaction `validator`: how one interaction is judged (the
    correct `gesture` on the correct `target` with required state satisfied),
    carrying the legacy derive-don't-declare model and the boolean-return idea
    at interaction scope.
  - Defines the `step_validator`: how whole-step correctness is judged (all
    required interactions completed, in order where order matters, and the
    final state reached), and how interaction validators compose into it.
  - Defines the `outcome` slot: complete, retry, feedback, advance; covers the
    iterative loop as a `step_validator` condition plus `outcome: retry`.
  - Defines the runtime state the vocabulary assumes (held material, target
    contents, set-point values, equipment state, phase state, object
    appearance).
  - States the rule that state change is explicit in a `response` -- either a
    `scene_operation` mutation or a `state_update` -- and that domain verbs do
    not imply hidden state changes. Maps each `scene_operation` primitive to
    the runtime state it changes, documenting how the model would supersede
    hand-authored `stateChange` in the follow-on code plan.
  - Defines the event-emission rule and a single event-naming convention.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Note which current fields the new model supersedes, for the follow-on
    code plan.

### Work package WP-BND1: Define the scene-vs-protocol boundary

- Owner: architect.
- Touch points: the boundary section of the design doc.
- Depends on: WP-SLOT1, WP-SOP1.
- Acceptance criteria:
  - Writes the boundary rule: the protocol vocabulary names no plate, well,
    tube, gel, or column; the scene adapter owns geometry, target expansion,
    and how each `gesture` is rendered.
  - Maps each step and interaction slot to its side of the boundary.
  - Resolves the `PROTOCOL_VOCABULARY.md` "click target" vs
    `SCENE_VOCABULARY.md` `ClickTarget` naming collision.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Hand the boundary rule to WP-DOC-P1 and WP-DOC-S1.

### Work package WP-RAT-A1: Ratify OVCAR8 and the 7 current content files

- Owner: reviewer.
- Touch points: a ratification matrix section in
  `docs/active_plans/protocol_interaction_inventory.md`.
- Depends on: WP-SLOT1, WP-SOP1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every step of OVCAR8 and all 54 content steps mapped to the two-level
    model (the step slots and each interaction's slots) plus the domain verb
    if one applies, with the skill each interaction teaches.
  - Unmappable steps or interactions and unclear-pedagogy interactions
    flagged.
  - Owns the consolidated residual-gap list (merges WS-RAT-B and WS-RAT-C
    entries).
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - If a gap requires a design revision, file it against WP-SLOT1 / WP-SOP1
    and re-ratify the affected steps before closing M3.

### Work package WP-RAT-B1: Ratify Miraculin

- Owner: reviewer.
- Touch points: a Miraculin ratification matrix.
- Depends on: WP-SLOT1, WP-SOP1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every Miraculin procedure step with real content mapped.
  - Phase separation (an `answer_choice` target, `select` gesture), grinding
    (the `grind` domain verb expanding to an interaction whose `response`
    carries a `SvgSwap` scene_operation), and pH titration (an `adjust`
    gesture) explicitly tested against the design.
  - Gap entries handed to WP-RAT-A1.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Note which Miraculin sections (chromatography Parts 5-7) are stubbed and
    need protocol polishing before they can be mapped.

### Work package WP-RAT-C1: Ratify SDS-PAGE

- Owner: reviewer.
- Touch points: an SDS-PAGE ratification matrix.
- Depends on: WP-SLOT1, WP-SOP1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every SDS-PAGE procedure step with real content mapped.
  - Ordered assembly (a `sequence` of `drag` or `select` interactions on
    ordered targets, with an order-checking `step_validator`), voltage and
    volume set-points (an `adjust` gesture), and the iterative destain loop (a
    `step_validator` condition plus `outcome: retry`) explicitly tested
    against the design.
  - Gap entries handed to WP-RAT-A1.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Note which SDS-PAGE sections are stubbed and need protocol polishing.

### Work package WP-DOC-P1: Rewrite PROTOCOL_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_VOCABULARY.md`.
- Depends on: WP-RAT-A1 (ratification complete, gaps dispositioned).
- Acceptance criteria:
  - Encodes the ratified two-level step/interaction model, the `target` slot
    and target-kind mechanism, the `gesture` value set, the interaction
    `validator` and `step_validator`, the `response` container, the
    `scene_operation` typed-primitive vocabulary, the domain-verb mechanism,
    the pedagogy-first rule, the state/event model, and the boundary rule.
  - `plate target` / `tube target` removed.
  - Target-state sections clearly labeled; current-code sections clearly
    labeled.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Update the banned-synonyms section to flag the removed scene-specific
    terms, the retired `kind` taxonomy, and the retired overloaded `action`
    term.

### Work package WP-DOC-S1: Rewrite SCENE_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/SCENE_VOCABULARY.md`.
- Depends on: WP-RAT-A1, WP-DOC-P1.
- Acceptance criteria:
  - Encodes the scene side of the boundary rule, including how a scene renders
    each `gesture` (`click`, `drag`, `adjust`, `select`, `type`).
  - Cross-references `PROTOCOL_VOCABULARY.md` for every shared concept; the
    `ClickTarget` naming collision is resolved.
  - Target-state sections clearly labeled; current-code sections clearly
    labeled.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Verify every cross-reference link resolves per `docs/MARKDOWN_STYLE.md`.

### Work package WP-DOC-D1: Align all dependent docs

- Owner: planner.
- Touch points: every `docs/` file that references the interaction model.
  Known: `docs/PROTOCOL_YAML_FORMAT.md`, `docs/PROTOCOL_STEPS.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/SCENE_ARCHITECTURE.md`,
  `docs/SCENE_YAML_FORMAT.md`, `docs/SVG_PIPELINE.md`, `docs/LAYOUT_ENGINE.md`,
  `docs/LIQUID_CONVENTION.md`; confirm the full set by auditing `docs/` first.
- Depends on: WP-DOC-P1, WP-DOC-S1.
- Acceptance criteria:
  - Audits `docs/` and lists every file that references the interaction
    model, step `kind`s, `plateTargets` / `tubeTargets`, or the retired
    `action` / `base-action` / `mode` / `interaction`-slot / flat-six-slot
    concepts.
  - No transitional notes: each affected section is rewritten to the new
    vocabulary, deleted if obsolete, or moved to `docs/archive/` if it is
    still useful as historical context.
  - No `docs/` file contradicts the rewritten canonical docs -- the doc set is
    in sync.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - If the audit surfaces a doc not in the known list, add it and align it
    before closing the work package.

### Work package WP-DOC-C1: Close-out and follow-on plan stub

- Owner: planner.
- Touch points: `docs/CHANGELOG.md`,
  `docs/active_plans/scene_runtime_doc_conflicts.md`, a new follow-on plan
  stub under `docs/active_plans/`.
- Depends on: WP-DOC-D1.
- Acceptance criteria:
  - `docs/CHANGELOG.md` entry finalized under the correct categories.
  - The follow-on code-migration plan is stubbed, pointing at the ratified
    vocabulary as its input and naming the `adjust`-gesture build as an early
    deliverable.
  - `scene_runtime_doc_conflicts.md` annotated where this plan supersedes its
    `plateTargets` / `tubeTargets` verdict.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - List the deferred dead-field cleanup as a follow-on plan pointer.

## Acceptance criteria and gates

- Per-patch gate: every doc patch passes `tests/test_ascii_compliance.py` and
  conforms to `docs/MARKDOWN_STYLE.md` (sentence-case headings, ASCII tables,
  working relative links).
- Integration gate (end of M2): the design doc defines the two-level
  step/interaction model, the `target` slot and target-kind mechanism, the
  `gesture` value set, the interaction `validator` and the `step_validator`,
  the `response` container, the `scene_operation` typed-primitive class
  hierarchy with every primitive documented to the durable-primitive standard,
  the domain-verb mechanism with the cost guardrail, the `outcome` slot, the
  pedagogy-first rule, the state/event model, and the boundary rule -- with no
  "TBD" in any of those sections, no `target + mode + action` language, no
  seven-slot `interaction` slot, and no flat six-slot framing surviving, and a
  written disposition for the timed-wait residual gap.
- Integration gate (end of M3): every step of all four protocols and the 7
  content files appears in a ratification matrix with its step slots, each
  interaction's slots, its domain verb if any, and its taught skill; the
  residual-gap list is empty or every entry has an accepted disposition.
- Manual review gate (end of M4): a human confirms `PROTOCOL_VOCABULARY.md`
  and `SCENE_VOCABULARY.md` are internally consistent, target-state sections
  are clearly labeled and current-code sections clearly labeled, the
  scene/protocol boundary reads as a usable rule, and the pedagogy-first rule
  is concrete enough that an author could choose a `target` and `gesture`
  from it.

## Test and verification strategy

- This plan ships documentation, so verification is review-based. The pytest
  gate that applies is `tests/test_ascii_compliance.py` plus any markdown-link
  check.
- Design verification is ratification itself: M3 is the test. A vocabulary
  that cannot map a real protocol step has failed, and the failure is a
  residual-gap entry that forces an M2 revision. A step whose pedagogy is
  unclear under the rule is also a failure.
- Coverage is measured by the ratification matrix: percent of steps mapped
  cleanly, count of residual gaps, and whether each gap is "needs a new domain
  verb" (cheap), "needs a new `gesture` value" (medium), "needs a new
  `scene_operation` primitive" (expensive), or "needs a design revision"
  (expensive, M2 reopens).
- The follow-on code plan -- not this plan -- carries the TypeScript, build,
  and walker gates, including building the `adjust`-gesture interaction.

## Migration and compatibility policy

- Additive rollout: the design lands first in the working design doc, is
  ratified, and only then is promoted into the canonical
  `docs/PROTOCOL_VOCABULARY.md` / `docs/SCENE_VOCABULARY.md` at M4.
- Backward compatibility: the docs will, after this plan, describe a
  vocabulary the code does not implement -- including the `adjust` gesture,
  which does not exist in the runtime yet. This is intentional and explicit:
  target-state sections are clearly labeled and current-code sections clearly
  labeled. The follow-on code plan flips target-state sections to current-code
  as it implements.
- Deletion criteria for legacy doc content: the four-`kind` taxonomy and the
  `plateTargets` / `tubeTargets` sections in the dependent docs are rewritten
  to the new vocabulary, deleted if obsolete, or moved to `docs/archive/` if
  still useful as history -- no transitional notes left in the canonical path.
  Code that still uses the legacy fields is the follow-on code plan's concern.
- Rollback strategy: the work is documentation on an `agent/` branch. If
  ratification (M3) shows the design is unworkable, the design doc is revised
  in place; the canonical docs were never touched, so there is nothing to roll
  back. No partial promotion to the canonical docs.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| gesture set is incomplete | High | M3 finds a skill-based interaction that fits no `gesture` value | architect (WS-SLOT) | The gesture extension rule (WP-SLOT1) makes adding a value possible; M3 ratifies all four protocols in parallel to surface this early, not after the docs are written. |
| Pedagogy rule is too vague to apply | High | M3 reviewers cannot decide a step's target and gesture from the rule; M4 manual gate fails | planner (WS-PED) | WP-PED1 must ship worked examples per gesture, not just principles; the rule is tested in M3, before the canonical rewrite. |
| Rough-draft protocols give thin evidence | Medium | Miraculin / SDS-PAGE steps too stubbed to map | reviewer (WS-RAT-B/C) | Map only steps with real procedure content; record stubbed sections as "protocol needs polishing", not as vocabulary gaps. |
| Slot model churns after M2 | Medium | M3 keeps finding unmappable steps | planner (WS-SOP) | The domain-verb layer absorbs most new behavior cheaply via slot composition; a design revision is only forced when a genuinely new `gesture` value or `scene_operation` primitive is missing. |
| "action" re-collapse, `interaction` slot creeps back, or the two levels flatten | Medium | A doer reintroduces one term spanning learner behavior, validation, scene mutation, and pedagogy; re-adds a task-type enum on top of `target`; or collapses the `step` / `sequence` / `interaction` nesting back to one-step-one-gesture | architect (WS-SLOT) | The two-level model and the one-line per-slot charter make the separation explicit; the target's kind carries task semantics, so no `interaction` slot is needed; the "wash the flask" worked example shows why nesting is required; reviewers reject any doc text that merges slots, re-adds the enum, or flattens the levels. |
| Design over-fits to one protocol | Medium | A construct works for cell culture but not SDS-PAGE assembly or Miraculin extraction | architect (WS-BND) | M2 work packages each cite evidence from at least two protocols; M3 ratifies all four in parallel. |
| Timed-wait gap is deferred and forgotten | Low | The follow-on code plan hits a timed incubation step with no design | planner (WS-STA) | WP-STA1 must give timed-wait a written disposition (designed into a `scene_operation` typed field or explicitly deferred with a reason); M2 integration gate checks for it. The iterative loop is no longer a gap -- the two-level model handles it as `step_validator` plus `outcome: retry`. |
| Scope creep back into code | Low | A doer "just builds" the `adjust` gesture or edits `contract.ts` | planner | Non-goals are explicit; reviewers reject any code change in this plan. |

## Rollout and release checklist

- [ ] Two-level step/interaction course-correction accepted; OQ-6 and OQ-7
  resolved.
- [ ] M1 evidence artifact committed.
- [ ] M2 design doc complete; first pass's `target + mode + action` draft, the
  seven-slot `interaction` slot, and the flat six-slot framing reworked away;
  integration gate passed (no TBD; timed-wait residual gap dispositioned).
- [ ] M3 ratification matrices complete for all four protocols and the 7
  content files; every step has its step slots, each interaction's slots, its
  domain verb if any, and a taught skill; residual-gap list dispositioned.
- [ ] M2 design doc revised if M3 surfaced gaps; affected steps re-ratified.
- [ ] `docs/PROTOCOL_VOCABULARY.md` rewritten; target-state and current-code
  sections clearly labeled.
- [ ] `docs/SCENE_VOCABULARY.md` rewritten; cross-references resolve.
- [ ] Dependent docs aligned (rewritten, deleted, or archived -- no
  transitional notes).
- [ ] `docs/CHANGELOG.md` entry finalized.
- [ ] Follow-on code-migration plan stubbed; `adjust`-gesture build named.
- [ ] `scene_runtime_doc_conflicts.md` annotated.
- [ ] Human review of the two canonical docs for internal consistency, a
  usable scene/protocol boundary, and an applicable pedagogy rule.

## Documentation close-out requirements

- Active plan / progress tracker updates: the evidence artifact and the design
  doc both live under `docs/active_plans/`; the follow-on code plan is stubbed
  there. `docs/active_plans/scene_runtime_doc_conflicts.md` is annotated where
  this plan supersedes its verdict.
- `docs/CHANGELOG.md` entry: owner WS-DOC-C; expected categories "Additions
  and New Features" (the two-level step/interaction vocabulary, the `response`
  container, the domain-verb mechanism, the evidence artifact), "Behavior or
  Interface Changes" (the rewritten canonical docs), "Decisions and Failures"
  (the drift origin, the mis-classified M0 audit, the skill-to-timed-click
  pedagogy regression, the "action" overload course-correction, the
  seven-slot-to-six-slot tightening, the flat-six-slot-to-two-level nesting
  course-correction, the decision to design docs-first ahead of code).
- Archive / closure notes: this plan stays in `docs/active_plans/` until M4
  closes; closure is recorded when the follow-on code plan picks up the
  ratified vocabulary.

## Patch plan and reporting format

- Patch 1: `protocol_interaction_inventory.md` -- consolidated evidence
  (WP-EV1). Done.
- Patch 2: `docs/PRIMARY_DESIGN.md` -- semantic inheritance and composition
  section (WP-PHIL1). Done; reconcile wording with the two-level
  step/interaction model.
- Patch 3: design doc -- two-level step/interaction model, target and gesture
  slots (WP-SLOT1). Reworks the superseded first-pass draft and the flat
  six-slot framing.
- Patch 4: design doc -- response container, scene_operation primitives,
  domain-verb mechanism (WP-SOP1).
- Patch 5: design doc -- pedagogy-first rule (WP-PED1).
- Patch 6: design doc -- interaction validator, step_validator, outcome,
  state and event model (WP-STA1).
- Patch 7: design doc -- scene/protocol boundary (WP-BND1).
- Patch 8: ratification matrix -- OVCAR8 + 7 content files + gap list
  (WP-RAT-A1).
- Patch 9: ratification matrix -- Miraculin (WP-RAT-B1).
- Patch 10: ratification matrix -- SDS-PAGE (WP-RAT-C1).
- Patch 11: `docs/PROTOCOL_VOCABULARY.md` rewrite (WP-DOC-P1).
- Patch 12: `docs/SCENE_VOCABULARY.md` rewrite (WP-DOC-S1).
- Patch 13: dependent-doc alignment, all docs/ referencing the model
  (WP-DOC-D1).
- Patch 14: changelog, close-out, follow-on stub (WP-DOC-C1).

Reporting: each patch reports against its WP id. Because the deliverable is
documentation, the evidence for a patch is the reviewable doc diff plus the
ASCII / link gate output, not test runs.

## Open questions and decisions needed

- OQ-1, OQ-2, OQ-3: resolved by the course-corrections. The first pass's
  `mode` set became the `gesture` slot (`click`, `drag`, `adjust`, `select`,
  `type`), `dial` is now `adjust` (was OQ-1). State change is explicit in a
  `response` -- a `scene_operation` mutation or a `state_update` -- and domain
  verbs do not imply hidden state changes; owned by WP-STA1 (was OQ-2). Step
  completion is the `step_validator` plus `outcome` slots, owned by WP-STA1;
  the iterative loop is a `step_validator` condition plus `outcome: retry`
  (was OQ-3).
- OQ-4: resolved. The evidence artifact, the design doc, this plan, and the
  follow-on code-plan stub all stay in `docs/active_plans/` while the plan is
  live. Rule: `docs/active_plans/` holds live plans only. Once a plan closes,
  the plan and its temporary working artifacts move to `docs/archive/`, unless
  an artifact has become durable reference material -- durable material is
  promoted into normal `docs/`, not archived. For this plan: the design doc is
  expected to archive; the evidence artifact may deserve promotion into
  `docs/` later. A plan "closes" when the canonical docs are rewritten,
  dependent docs are aligned, the changelog is updated, the follow-on code
  plan exists, and the plan is no longer being edited.
  `docs/active_plans/scene_runtime_doc_conflicts.md` is archived only after
  this plan annotates it and the superseding canonical docs are in place.
- OQ-5: resolved. The plan leaves no transitional notes in canonical docs.
  Each dependent-doc section affected by the new vocabulary is rewritten to
  match it, deleted if obsolete, or moved to `docs/archive/` if it is still
  useful as historical context. WP-DOC-D1 applies this rule.
- OQ-6: resolved. The slot *content* is settled: no seventh `interaction`
  slot is needed -- the `target`'s kind carries the task semantics
  (`target: voltage_dial` + `gesture: adjust`, not `interaction: set_value` on
  top), and QTI's interaction names (Choice, Hot Spot, Slider, Position
  Object, Order) inform target typing but are not adopted as formal terms.
  The `gesture` value set is confirmed as `click`, `drag`, `adjust`,
  `select`, `type`, with the extension rule owned by WP-SLOT1. The same fit
  check forced one `scene_operation` addition: `LiquidDisplayChange` becomes a
  first-class typed primitive (liquid appears, a volume changes, or well
  contents update), because that effect recurs across every cell-culture
  protocol and clears the cost guardrail's evidence bar; WP-SOP1 documents it
  to the durable-primitive standard alongside the original five. The fit
  check also exposed a structural defect the flat slot list could not fix --
  see OQ-7.
- OQ-7: resolved by the two-level course-correction. The flat slot list
  assumed one step equals one gesture; the cell-culture fit check showed real
  steps are multi-gesture ("wash the flask with 4 mL PBS" is one step, three
  gestures). The model is now two levels: a `step` (`prompt`, `sequence`,
  `step_validator`, `outcome`) wraps an ordered `sequence` of interactions
  (`target`, `gesture`, `validator`, `response`); a `response` is a container
  holding `scene_operations` (typed primitives), optional `feedback`, and
  optional `state_update`. `scene_operation` stays the durable typed-primitive
  layer and is not renamed. Names confirmed by the user: `step_validator` is
  kept (it clearly means whole-step validation; `completion` was rejected as
  too narrow), and the `response` sub-field names `scene_operations`,
  `feedback`, `state_update` are kept as written.
- OQ-8 (watch item, not blocking): `select` may later collapse into `click`.
  It is kept in the initial `gesture` set for now; WP-SLOT1 must document the
  `select` versus `click` distinction clearly so a later merge is a small,
  evidence-driven change rather than a redesign.
