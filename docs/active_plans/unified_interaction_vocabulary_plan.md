# Plan: Unified protocol interaction vocabulary (original first-pass working plan)

## Plan status: closed

This plan is CLOSED. Milestones M1 through M4, the primary-doc reconcile
(`PRIMARY_SPEC.md` / `PRIMARY_DESIGN.md`), the 4-pass audit, the 5 audit-fix
passes, and the final terminology gate are all complete and committed in git
commit 3bb25fa. Per OQ-4, the follow-on work is tracked in the separate
[protocol_vocabulary_code_migration_plan.md](protocol_vocabulary_code_migration_plan.md)
code-migration plan.

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

The user's stated goal: a unified interaction vocabulary for all simulations
going forward, not locked to any scene, designed pedagogy-first. The intended
outcome of this plan is that vocabulary -- the `target + mode + action` model,
its action inventory, and its mode set -- written into
`docs/PROTOCOL_VOCABULARY.md` and `docs/SCENE_VOCABULARY.md`, ratified against
all four protocols, and ready for a separate follow-on plan to implement.

## Objectives

- Define one scene-agnostic interaction model: an interaction has a `target`
  (scene object), a `mode` (how the student inputs), and an `action` (what it
  does, from a closed vocabulary).
- Define the interaction `mode` axis: `click` (the simple mode) and `dial`
  (continuous, skill-based set-points), with an extension rule for further
  modes.
- Define the `action` vocabulary as a class hierarchy in the vocabulary sense
  (not necessarily TypeScript inheritance): a small ratified initial set of
  base primitive actions (SVG / layout / cursor / scene operations) plus a
  composition rule -- a composed action is built from one or more base
  primitives -- covering every action the four source protocols require.
- Document each initial base action to a higher standard than composed
  actions, as a durable vocabulary primitive (see the base-action
  documentation requirement under M2).
- Establish pedagogy-first as a binding design rule: each interaction's mode
  and action are chosen to teach a specific skill; the anti-pattern is
  collapsing a skill-based interaction into a rote click.
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

## Scope

- Consolidate the existing interaction inventory into one committed evidence
  artifact: the 54-step content mapping, the legacy resolver model, and the
  exhaustive action/mode mapping of all four protocols (already drafted during
  the investigation that produced this plan).
- Design the `target + mode + action` model.
- Design the `mode` axis (`click`, `dial`, extension rule).
- Design the base-action vocabulary, composition rule, and author-facing
  composed-action categories.
- Write the pedagogy-first rule: how mode and action are chosen to teach.
- Design the state and event model.
- Define the scene-vs-protocol boundary.
- Ratify the design: map all four protocols and the 7 content files to it;
  produce a coverage matrix and a residual-gap list.
- Rewrite `docs/PROTOCOL_VOCABULARY.md` and `docs/SCENE_VOCABULARY.md`.
- Add a "Semantic inheritance and composition" section to
  `docs/PRIMARY_DESIGN.md` -- the repo-wide architectural philosophy the
  vocabulary design rests on (agent-editable philosophy, not a contract
  change).
- Align every `docs/` file that references the interaction model -- the three
  protocol docs (`PROTOCOL_YAML_FORMAT.md`, `PROTOCOL_STEPS.md`,
  `PROTOCOL_AUTHORING_GUIDE.md`), the scene docs (`SCENE_ARCHITECTURE.md`,
  `SCENE_YAML_FORMAT.md`), and -- because base actions are SVG / layout
  primitives -- `SVG_PIPELINE.md`, `LAYOUT_ENGINE.md`, `LIQUID_CONVENTION.md`,
  plus any others a `docs/` audit surfaces -- to the new vocabulary, or
  margin-note the sections the follow-on code plan must rewrite. The whole doc
  set stays in sync.
- Mark sections that describe unimplemented behavior as target-state, while
  keeping current-code sections clearly labeled.

## Non-goals

- Building the `dial`-mode interaction (the continuous volume/voltage control)
  -- the user wants it built, but building is code; this plan *defines* the
  mode, the follow-on code plan builds it.
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

## Current state summary

The model after the investigation: an interaction is `target + mode + action`.

- `target` -- a scene object or control that receives the student's
  interaction.
- `mode` -- `click` (simple) or `dial` (continuous, skill-based set-point).
  Pedagogy chooses the mode.
- `action` -- a class hierarchy in the vocabulary sense (not necessarily a
  TypeScript inheritance requirement), not a flat list:
  - *base actions* are SVG / layout / cursor / scene primitives: `SvgSwap`,
    `ColorChange`, `CursorAttach` (a picked-up tool follows the cursor),
    `SceneChange`, `LayoutMove`. This set is still settling.
  - *composed actions* are pedagogically-named actions a designer builds by
    composing one or more base actions -- composition, not single-parent
    inheritance: draw, dispense, grind, assemble, and the rest. The earlier
    "families" (`liquid`, `equipment`, `object`, `choose`, `popup`,
    `question`, `navigate`) are composed actions, not the base. The
    berry-to-powder example appears to reduce mainly to `SvgSwap`; M2 should
    confirm whether any solid-handling cases need more primitives.
  Defining the base set and the composition rule is M2's central task.

Coverage already established by the investigation: all 54 current content
steps fit; OVCAR8 fits fully; Miraculin's reverse-micelle core fits (its
chromatography Parts 5-7 are unwritten stubs); SDS-PAGE fits once `dial` mode
absorbs voltage and volume set-points. The `dial` mode resolves the three
biggest gaps the coverage pass flagged (continuous voltage, volume set-point,
pH titration) -- they are not `question`-family popups.

Residual genuine gaps, flagged and not yet designed: the iterative loop (a
step that repeats until a state condition, e.g. destain until background
clear, rather than a fixed click count), and timed-wait visualization
(duration as a property of `equipment` actions).

What is broken in the docs:

- `docs/PROTOCOL_VOCABULARY.md` has no term for a single interaction, no term
  for the action it performs, no concept of an interaction mode, and never
  spells out the interaction -> action -> state change chain. `plate target`
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
defines -- the interaction primitive, the base action names, the mode names,
the composition terms, and the author-facing composed-action categories -- and
naming them well for YAML authors is the plan's central deliverable.

### Primitive-action contract

Base primitive actions are the smallest protocol-visible interaction effects
the runtime guarantees across all scenes. A primitive action may:

- mutate runtime state
- mutate scene presentation
- attach or detach cursor state
- transition scene context
- move or re-layout scene objects

A primitive action must define:

- its required inputs
- the state it reads
- the state it may mutate
- its visual / runtime side effects
- whether it is reversible
- whether it is instantaneous or duration-based
- whether it emits completion or progress events

Composed actions are declarative combinations of primitives chosen for
pedagogy and author readability. The runtime executes primitives; protocol
authors primarily reason in composed actions.

Layout semantics are treated here only as protocol-visible interaction
effects. The underlying layout engine remains the responsibility of
scene / runtime architecture and is out of scope for this plan.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-EV | `docs/active_plans/protocol_interaction_inventory.md` | 1 to 2 |
| M2 / WS-PHIL | `docs/PRIMARY_DESIGN.md` -- semantic inheritance section | 1 |
| M2 / WS-MOD | design doc -- interaction primitive + mode axis | 1 |
| M2 / WS-ACT | design doc -- action class hierarchy + base-action docs | 1 |
| M2 / WS-PED | design doc -- pedagogy-first rule | 1 |
| M2 / WS-STA | design doc -- state + event model | 1 |
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
    `interaction_resolver.ts` action model; and the exhaustive
    `target + mode + action` mapping of OVCAR8, Miraculin, and SDS-PAGE
    (formalized from the investigation's draft tables).
  - The artifact lists candidate author-facing composed-action categories,
    candidate base primitives, the candidate mode set (`click`, `dial`), and
    the residual gaps (iterative loop, timed-wait visualization), each tagged
    with the requiring protocol(s).
  - Known inconsistencies recorded (e.g. `decant_mtt` expressed two ways;
    `resuspend` volume mismatch; `completionEvent` naming chaos).
  - `docs/CHANGELOG.md` draft entry started.
- Parallel-plan ready: no -- a single consolidation artifact authored by one
  owner; splitting it creates merge churn on one file. Max parallel doers: 1.

### Milestone M2: Design the unified model

- Depends on: M1 -- the design works from the consolidated evidence.
- Workstreams: WS-PHIL, WS-MOD, WS-ACT, WS-PED, WS-STA, WS-BND.
- Entry criteria: M1 artifact complete; OQ-1, OQ-2, OQ-3 resolved by the user.
- Exit criteria:
  - The interaction primitive is defined: one term for an interaction, and
    the interaction -> action -> state change chain spelled out.
  - The mode axis is defined: `click` and `dial`, what each means for a YAML
    author, how a scene renders each, and the extension rule for further
    modes. `dial` is defined as the skill-based continuous set-point mode
    (volume, voltage, pH-to-target).
  - The action vocabulary is defined as a class hierarchy in the vocabulary
    sense (not necessarily TypeScript inheritance): the base primitive actions
    (SVG / layout / cursor / scene operations) are named and ratified for the
    initial vocabulary, and the composition rule is written -- a composed
    action is built from one or more base primitives. Every composed action the four protocols use is shown as
    a composition of base actions, named in YAML-author language.
  - Base-action documentation requirement: the base-action set is extensible,
    but not casual. M2 must document each initial base action as a durable
    vocabulary primitive, defining for each one: what the action means; what
    state it may read; what state it may change; what visual effect it
    produces; what it must not do; examples from at least two protocols where
    possible; common mistakes or anti-patterns; and how composed actions may
    build on it. Adding a new base action later requires the same
    documentation standard and a clear reason why composition from existing
    primitives is not sufficient.
  - The pedagogy-first rule is written: how an author chooses mode and action
    to teach a skill, with the skill-to-timed-click regression named as the
    anti-pattern.
  - The state and event model is defined: what runtime state the vocabulary
    assumes, how an action implies its state change (recovering the legacy
    derive-don't-declare model), how events are emitted and named.
  - The scene-vs-protocol boundary is written as an explicit rule: the
    protocol vocabulary names no plate, well, tube, gel, or column; the scene
    adapter owns geometry, target expansion, and how a mode is rendered.
  - The two residual gaps (iterative loop, timed-wait) each have a written
    disposition: designed into the model, or deferred with a reason.
  - The "Semantic inheritance and composition" section is added to
    `docs/PRIMARY_DESIGN.md` (agent-editable philosophy).
  - All other design output lives in the working design doc; the canonical
    vocabulary docs (`PROTOCOL_VOCABULARY.md`, `SCENE_VOCABULARY.md`) are
    untouched until M4.
- Parallel-plan ready: yes -- the six workstreams own disjoint artifacts and
  share only the M1 evidence artifact (read-only). WS-ACT, WS-PED, WS-STA,
  WS-BND consume WS-MOD's primitive + mode definitions, so they start a beat
  behind; WS-PHIL (which writes `docs/PRIMARY_DESIGN.md`) runs fully in
  parallel. Max parallel doers: 6.

### Milestone M3: Ratify the design against all four protocols

- Depends on: M2 -- ratification tests the designed vocabulary.
- Workstreams: WS-RAT-A, WS-RAT-B, WS-RAT-C.
- Entry criteria: M2 design doc complete.
- Exit criteria:
  - Every step of OVCAR8 and all 7 current `content/*/protocol.yaml` files is
    mapped to the model: target, mode, composed action, base primitive
    composition, completion (WS-RAT-A).
  - Every Miraculin procedure step with real content is mapped (WS-RAT-B).
  - Every SDS-PAGE procedure step with real content is mapped (WS-RAT-C).
  - Each workstream flags any step the model cannot express and any step
    whose pedagogy is unclear (which skill does it teach, is the mode right).
  - A consolidated residual-gap list names every unmappable step and says
    whether it needs a new action sub-type, a new mode, or a design revision.
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
  - `docs/PROTOCOL_VOCABULARY.md` rewritten: the interaction primitive, the
    mode axis, the action vocabulary, the pedagogy-first rule, the state/event
    model, the scene/protocol boundary. Target-state sections clearly
    labeled; current-code sections clearly labeled.
  - `docs/SCENE_VOCABULARY.md` rewritten: the scene side of the boundary,
    including how a scene renders `click` versus `dial`, with explicit
    cross-references to `PROTOCOL_VOCABULARY.md` for shared concepts.
  - Every `docs/` file that references the interaction model (the protocol
    docs plus the scene / SVG / layout / liquid docs, full set confirmed by a
    `docs/` audit) is aligned to the new vocabulary or margin-noted for the
    follow-on code plan -- the doc set is in sync, no file contradicting the
    canonical two.
  - `docs/CHANGELOG.md` entry finalized.
  - A follow-on code-migration plan is stubbed in `docs/active_plans/`,
    pointing at the ratified vocabulary as its input and naming the
    `dial`-mode build as an early deliverable.
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
    philosophy, written into `docs/PRIMARY_DESIGN.md`, that WS-MOD, WS-ACT,
    and WS-BND build on.
- Expected patches: 1.

### Workstream WS-MOD: Interaction primitive and mode axis

- Owner: architect.
- Interfaces:
  - Needs: M1 evidence artifact.
  - Provides: the interaction primitive, the `click` / `dial` mode
    definitions, and the mode extension rule to WS-ACT, WS-PED, WS-STA,
    WS-BND, and all of M3.
- Expected patches: 1.

### Workstream WS-ACT: Action vocabulary

- Owner: planner.
- Interfaces:
  - Needs: M1 evidence artifact; WS-MOD's primitive definition.
  - Provides: the action class hierarchy (the documented base primitive
    actions plus the composition rule) and the worked compositions for the
    four protocols' actions.
- Expected patches: 1.

### Workstream WS-PED: Pedagogy-first rule

- Owner: planner.
- Interfaces:
  - Needs: WS-MOD's mode axis; WS-ACT's action families.
  - Provides: the rule for choosing mode and action to teach a skill, with the
    skill-to-timed-click anti-pattern, to M3 (which checks pedagogy) and M4.
- Expected patches: 1.

### Workstream WS-STA: State and event model

- Owner: planner.
- Interfaces:
  - Needs: WS-MOD's primitive; WS-ACT's action families.
  - Provides: the state model, the action-implies-state-change rule, the
    event-emission rule, and the event-naming convention.
- Expected patches: 1.

### Workstream WS-BND: Scene-vs-protocol boundary

- Owner: architect.
- Interfaces:
  - Needs: WS-MOD's mode axis; WS-ACT's action families; M1 evidence on
    scene-specific drift.
  - Provides: the boundary rule -- protocol names no geometry; adapter owns
    expansion and mode rendering -- to WS-DOC-P and WS-DOC-S.
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
  - Provides: aligned-or-margin-noted dependent docs -- every `docs/` file that
    references the interaction model. Known set: `PROTOCOL_YAML_FORMAT.md`,
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
  - Cross-reference the new section from the M2 design doc so the vocabulary
    design cites its philosophical basis.

### Work package WP-MOD1: Define the interaction primitive and mode axis

- Owner: architect.
- Touch points: `docs/active_plans/unified_interaction_vocabulary_design.md`
  (new) -- the primitive and mode sections.
- Depends on: WP-EV1.
- Acceptance criteria:
  - Defines one term for an interaction and writes the
    interaction -> action -> state change chain.
  - Defines `click` and `dial` modes in YAML-author language; defines `dial`
    as the skill-based continuous set-point mode (volume, voltage,
    pH-to-target).
  - States the mode extension rule for adding modes later.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Hand the primitive and mode definitions to WP-ACT1, WP-PED1, WP-STA1,
    WP-BND1.

### Work package WP-ACT1: Define and document the action class hierarchy

- Owner: planner.
- Touch points: the action sections of the design doc.
- Depends on: WP-MOD1.
- Acceptance criteria:
  - Defines and ratifies the initial set of base primitive actions -- SVG /
    layout / cursor / scene operations such as `SvgSwap`, `ColorChange`,
    `CursorAttach`, `SceneChange`, `LayoutMove`, plus any others the evidence
    forces.
  - Defines the composition rule: a composed action is built from one or more
    base primitives (composition, not single-parent inheritance).
  - Documents each base action to the durable-primitive standard. For each
    base action the docs define: what the action means; what state it may
    read; what state it may change; what visual effect it produces; what it
    must not do; examples from at least two protocols where possible; common
    mistakes or anti-patterns; how composed actions may build on it.
  - Shows every action the four protocols need as a named composition of base
    actions, in YAML-author language.
  - Confirms `question`-style knowledge prompts and `dial`-mode
    parameter-setting are kept distinct.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Flag any sub-type whose meaning conflicts with a mode back to WP-MOD1
    before M3.

### Work package WP-PED1: Write the pedagogy-first rule

- Owner: planner.
- Touch points: the pedagogy section of the design doc.
- Depends on: WP-MOD1, WP-ACT1.
- Acceptance criteria:
  - States how an author chooses mode and action to teach a specific skill.
  - Names the skill-to-timed-click regression as the anti-pattern, with the
    pipetting example.
  - Gives at least one worked example per mode (a `click` step and a `dial`
    step) showing the skill each teaches.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Hand the rule to WS-RAT-* so ratification can check each step's pedagogy.

### Work package WP-STA1: Define the state and event model

- Owner: planner.
- Touch points: the state/event section of the design doc.
- Depends on: WP-MOD1, WP-ACT1.
- Acceptance criteria:
  - Defines the runtime state the vocabulary assumes (held material, target
    contents, set-point values, equipment state, phase state, object
    appearance).
  - Maps each base primitive action to the runtime state it changes, and
    states how a composed action's state change follows from its base actions
    -- documenting how the target model would supersede hand-authored
    `stateChange` in the follow-on code plan.
  - Defines the event-emission rule and a single event-naming convention.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Note which current fields the new model supersedes, for the follow-on
    code plan.

### Work package WP-BND1: Define the scene-vs-protocol boundary

- Owner: architect.
- Touch points: the boundary section of the design doc.
- Depends on: WP-MOD1, WP-ACT1.
- Acceptance criteria:
  - Writes the boundary rule: the protocol vocabulary names no plate, well,
    tube, gel, or column; the scene adapter owns geometry, target expansion,
    and how each mode is rendered.
  - Maps each design concept to its side of the boundary.
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
- Depends on: WP-MOD1, WP-ACT1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every step of OVCAR8 and all 54 content steps mapped: target, mode,
    composed action, base primitive composition, completion, and the skill it
    teaches.
  - Unmappable steps and unclear-pedagogy steps flagged.
  - Owns the consolidated residual-gap list (merges WS-RAT-B and WS-RAT-C
    entries).
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - If a gap requires a design revision, file it against WP-MOD1 / WP-ACT1
    and re-ratify the affected steps before closing M3.

### Work package WP-RAT-B1: Ratify Miraculin

- Owner: reviewer.
- Touch points: a Miraculin ratification matrix.
- Depends on: WP-MOD1, WP-ACT1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every Miraculin procedure step with real content mapped.
  - Phase separation (`choose`), grinding (an `equipment` action with an
    SVG-swap effect), and pH titration (`dial`) explicitly tested against the
    design.
  - Gap entries handed to WP-RAT-A1.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Note which Miraculin sections (chromatography Parts 5-7) are stubbed and
    need protocol polishing before they can be mapped.

### Work package WP-RAT-C1: Ratify SDS-PAGE

- Owner: reviewer.
- Touch points: an SDS-PAGE ratification matrix.
- Depends on: WP-MOD1, WP-ACT1, WP-PED1, WP-STA1, WP-BND1.
- Acceptance criteria:
  - Every SDS-PAGE procedure step with real content mapped.
  - Ordered assembly (`object`), voltage and volume set-points (`dial`), and
    the iterative destain loop explicitly tested against the design.
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
  - Encodes the ratified interaction primitive, mode axis, action vocabulary,
    pedagogy-first rule, state/event model, and boundary rule.
  - `plate target` / `tube target` removed.
  - Target-state sections clearly labeled; current-code sections clearly
    labeled.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - Update the banned-synonyms section to flag the removed scene-specific
    terms and the retired `kind` taxonomy.

### Work package WP-DOC-S1: Rewrite SCENE_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/SCENE_VOCABULARY.md`.
- Depends on: WP-RAT-A1, WP-DOC-P1.
- Acceptance criteria:
  - Encodes the scene side of the boundary rule, including how a scene renders
    `click` versus `dial`.
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
    model, step `kind`s, `plateTargets` / `tubeTargets`, or the action and
    base-action concepts.
  - Each such section aligned to the new vocabulary or carrying a margin note
    for the follow-on code plan.
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
    vocabulary as its input and naming the `dial`-mode build as an early
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
- Integration gate (end of M2): the design doc defines the interaction
  primitive, the mode axis (`click`, `dial`), the action class hierarchy with
  every base action documented to the durable-primitive standard, the
  pedagogy-first rule, the state/event model, and the boundary rule -- with no
  "TBD" in any of those sections, and a written disposition for both residual
  gaps.
- Integration gate (end of M3): every step of all four protocols and the 7
  content files appears in a ratification matrix with its mode, action, and
  taught skill; the residual-gap list is empty or every entry has an accepted
  disposition.
- Manual review gate (end of M4): a human confirms `PROTOCOL_VOCABULARY.md`
  and `SCENE_VOCABULARY.md` are internally consistent, target-state sections
  are clearly labeled and current-code sections clearly labeled, the
  scene/protocol boundary reads as a usable rule, and the
  pedagogy-first rule is concrete enough that an author could choose a mode
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
  cleanly, count of residual gaps, and whether each gap is "needs a new
  sub-type" (cheap), "needs a new mode" (medium), or "needs a design revision"
  (expensive, M2 reopens).
- The follow-on code plan -- not this plan -- carries the TypeScript, build,
  and walker gates, including building the `dial`-mode interaction.

## Migration and compatibility policy

- Additive rollout: the design lands first in the working design doc, is
  ratified, and only then is promoted into the canonical
  `docs/PROTOCOL_VOCABULARY.md` / `docs/SCENE_VOCABULARY.md` at M4.
- Backward compatibility: the docs will, after this plan, describe a
  vocabulary the code does not implement -- including the `dial` mode, which
  does not exist in the runtime yet. This is intentional and explicit:
  target-state sections are clearly labeled and current-code sections clearly
  labeled. The follow-on code plan flips target-state sections to current-code
  as it implements.
- Deletion criteria for legacy doc content: the four-`kind` taxonomy and the
  `plateTargets` / `tubeTargets` sections in the dependent docs are aligned or
  margin-noted in this plan, not deleted. The follow-on code plan deletes them
  once the code stops using them.
- Rollback strategy: the work is documentation on an `agent/` branch. If
  ratification (M3) shows the design is unworkable, the design doc is revised
  in place; the canonical docs were never touched, so there is nothing to roll
  back. No partial promotion to the canonical docs.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Mode axis is incomplete | High | M3 finds a skill-based interaction that is neither `click` nor `dial` | architect (WS-MOD) | The mode extension rule (WP-MOD1) makes adding a mode possible; M3 ratifies all four protocols in parallel to surface this early, not after the docs are written. |
| Pedagogy rule is too vague to apply | High | M3 reviewers cannot decide a step's mode from the rule; M4 manual gate fails | planner (WS-PED) | WP-PED1 must ship worked examples per mode, not just principles; the rule is tested in M3, before the canonical rewrite. |
| Rough-draft protocols give thin evidence | Medium | Miraculin / SDS-PAGE steps too stubbed to map | reviewer (WS-RAT-B/C) | Map only steps with real procedure content; record stubbed sections as "protocol needs polishing", not as vocabulary gaps. |
| Action vocabulary churns after M2 | Medium | M3 keeps finding unmappable steps | planner (WS-ACT) | Composition from existing base primitives absorbs most new actions cheaply; a design revision is only forced when a genuinely new base primitive or mode is missing. Resolve OQ-1/2/3 before M2. |
| Design over-fits to one protocol | Medium | A construct works for cell culture but not SDS-PAGE assembly or Miraculin extraction | architect (WS-BND) | M2 work packages each cite evidence from at least two protocols; M3 ratifies all four in parallel. |
| Iterative-loop gap is deferred and forgotten | Low | The follow-on code plan hits the destain loop with no design | planner (WS-STA) | WP-STA1 must give the iterative loop a written disposition (designed or explicitly deferred with a reason); M2 integration gate checks for it. |
| Scope creep back into code | Low | A doer "just builds" the `dial` mode or edits `contract.ts` | planner | Non-goals are explicit; reviewers reject any code change in this plan. |

## Rollout and release checklist

- [x] OQ-1, OQ-2, OQ-3 resolved.
- [x] M1 evidence artifact committed.
- [x] M2 design doc complete; integration gate passed (no TBD; both residual
  gaps dispositioned).
- [x] M3 ratification matrices complete for all four protocols and the 7
  content files; every step has a mode, action, and taught skill;
  residual-gap list dispositioned.
- [x] M2 design doc revised if M3 surfaced gaps; affected steps re-ratified.
- [x] `docs/PROTOCOL_VOCABULARY.md` rewritten; target-state and current-code
  sections clearly labeled.
- [x] `docs/SCENE_VOCABULARY.md` rewritten; cross-references resolve.
- [x] Dependent docs aligned or margin-noted.
- [x] `docs/CHANGELOG.md` entry finalized.
- [x] Follow-on code-migration plan stubbed; `dial`-mode build named.
- [x] `scene_runtime_doc_conflicts.md` annotated.
- [ ] Human review of the two canonical docs for internal consistency, a
  usable scene/protocol boundary, and an applicable pedagogy rule.

## Documentation close-out requirements

- Active plan / progress tracker updates: the evidence artifact and the design
  doc both live under `docs/active_plans/`; the follow-on code plan is stubbed
  there. `docs/active_plans/scene_runtime_doc_conflicts.md` is annotated where
  this plan supersedes its verdict.
- `docs/CHANGELOG.md` entry: owner WS-DOC-C; expected categories "Additions
  and New Features" (the unified vocabulary, the mode axis, the evidence
  artifact), "Behavior or Interface Changes" (the rewritten canonical docs),
  "Decisions and Failures" (the drift origin, the mis-classified M0 audit, the
  skill-to-timed-click pedagogy regression, the decision to design docs-first
  ahead of code).
- Archive / closure notes: this plan stays in `docs/active_plans/` until M4
  closes; closure is recorded when the follow-on code plan picks up the
  ratified vocabulary.

## Patch plan and reporting format

- Patch 1: `protocol_interaction_inventory.md` -- consolidated evidence
  (WP-EV1).
- Patch 2: `docs/PRIMARY_DESIGN.md` -- semantic inheritance and composition
  section (WP-PHIL1).
- Patch 3: design doc -- interaction primitive and mode axis (WP-MOD1).
- Patch 4: design doc -- action class hierarchy + base-action docs (WP-ACT1).
- Patch 5: design doc -- pedagogy-first rule (WP-PED1).
- Patch 6: design doc -- state and event model (WP-STA1).
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

- OQ-1: The mode set. The plan proposes `click` and `dial`. Is `dial` the
  right author word for the continuous skill-based mode, and are two modes
  enough, or is a third needed now (for example a `drag` mode for moving an
  object along a path during assembly)? Decision owner: user. WP-MOD1 ships a
  concrete proposal so this is a confirm-or-extend, not an open design.
  Layout movement is considered only as an action effect in this plan;
  broader layout-engine semantics are deferred.
- OQ-2: The action model -- does an action name carry fixed state-change
  semantics in the runtime ("action implies it", recovering the legacy
  `interaction_resolver.ts` behavior), or does each interaction declare its
  own state change? The plan assumes "action implies it"; WP-STA1 ships the
  concrete proposal. Decision owner: user.
- OQ-3: Step completion -- does each interaction carry an explicit "completes
  the step" flag, or does the runtime derive it (last interaction in the
  ordered list; the correct answer for a `question`; the set-point reached for
  a `dial`)? This also covers the iterative-loop case (a step that completes
  on a state condition). Decision owner: user; WP-MOD1 / WP-STA1 ship a
  proposal.
- OQ-4: Where the evidence artifact and design doc live -- both under
  `docs/active_plans/` as proposed, or does the evidence artifact belong in a
  more permanent `docs/` location since it outlives the plan? Decision owner:
  user / architect.
- OQ-5: Scope of the dependent-doc alignment (WP-DOC-D1) -- align the three
  dependent docs fully now, or only margin-note them and let the follow-on
  code plan do the full rewrite alongside the code? Decision owner: user.
