# Protocol vocabulary

This document is the canonical vocabulary for protocol authoring,
runtime code, tests, and documentation in this repository. Every
protocol-related doc, code comment, error message, validator
output, and authoring guide must use these exact terms with
these exact meanings. Synonyms listed in the banned table are
not used.

Related docs (each links back here):
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md)
- [PROTOCOL_STEPS.md](PROTOCOL_STEPS.md)
- [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md)
- [USAGE.md](USAGE.md)

## Strict hierarchy

```
Protocol
  Part
    Step
      Interaction sequence
        Interaction
          Click plan
          Optional state change
          Optional completion event
```

A Protocol contains Parts; a Part contains Steps; a Step
contains an Interaction sequence; an Interaction has a click
plan, an optional state change, and an optional completion
event.

## Core rule: one job per term

A **step** is what the player is trying to complete.

An **interaction sequence** is the ordered list of logical
operations needed to complete the step.

An **interaction** is one logical player operation.

A **click plan** is the ordered list of clicks that perform one
interaction. The first click is always the tool.

A **click target** is a single DOM element a click is dispatched
to.

A **state change** is an optional runtime change caused by an
interaction.

A **completion event** is an optional runtime signal emitted by
an interaction. A completion event signals step completion. Each
step may have at most one completion event, and it must be on
the final interaction.

## Why these terms

The vocabulary is chosen to fit lab authors, not interaction-
model abstractions. Each tier explains why the canonical word
beats common alternatives.

- **Protocol** -- the entire authored lab experiment (parts,
  reagents, items, steps). Better than "Game" (too broad,
  includes UI/scoring/rendering), "Scene" (too narrow,
  protocols span multiple scenes), or "Workflow" (less
  lab-specific).
- **Part** -- a named section of the protocol (Split, Count,
  Treat, Read). Organizational, not behavioral. Better than
  "Phase" (sounds runtime), "Section" (too document-y),
  "Chapter" (too narrative).
- **Step** -- the smallest unit of protocol progress. Better
  than "Action" (would conflict with instruction text), "Task"
  (collides with TaskCreate orchestration), "Objective" (too
  broad).
- **Interaction sequence** -- the ordered required list inside
  a step. The name makes ordering explicit. Better than
  "Allowed interactions" ("allowed" reads as optional;
  ordering is hidden) or "Recipe" (informal).
- **Interaction** -- one logical player operation. Higher-level
  than a click. Better than "Click" (too low-level; one
  interaction is 1-3 clicks), "Action" (overloaded), or
  "Operation" (less lab-native).
- **Click plan** -- the ordered click list for one interaction.
  Better than "Click sequence" (collides with interaction
  sequence) or "Click pattern".
- **Click target** -- one DOM element. UI-level only. Better
  than "Item" (modals/buttons can also be click targets) or
  "Object" (vague).
- **Tool** -- the item used to perform an interaction. A tool
  may be a handheld tool (`serological_pipette`), an
  instrument (`centrifuge`, `microscope`), or a direct-action
  item (`incubator`, `water_bath`, `ethanol_bottle`). A tool
  can be the only click in an interaction; see "Direct tool
  interaction" below. Lab language; better than "Actor"
  (abstract).
- **Source** -- the item providing liquid or material during a
  load. Already clear; kept.
- **Destination** -- the item that physically receives
  transferred liquid, cells, waste, or material during a
  discharge. Use `destination` only when the player should
  click the receiving item. Do not use a `destination` field
  to describe background context or scene affordances; for
  one-click actions performed by the tool itself, use a
  Direct tool interaction. Better than "Target" (overloaded
  with `targetItems` and "click target").
- **Direct tool interaction** -- a one-click interaction
  completed by clicking the tool itself. The interaction has
  a `tool` and a `completionEvent`, and no `source` or
  `destination`. Use this when the lab action is performed
  by the tool but no separate receiving item should be
  clicked (for example, spraying ethanol in the hood,
  starting an instrument, or opening a direct-control
  device). The walker clicks the tool; the step completes.
- **State change** -- the runtime change caused by an
  interaction. Better than "Result" (could mean final game
  result or score) or "Effect" (less precise).
- **Completion event** -- the runtime signal that an
  interaction completed the step. Better than
  "Event" (too generic) or "Trigger" (collides with the
  step-level listener field).
- **Completion trigger** -- the step-level listener that fires
  on a completion event. Better than bare "Trigger".
- **Completion-event emitter** -- the scene or modal code
  path that emits a completion event after the player
  completes the matching interaction. Each declared
  `completionTrigger` in YAML must have a matching emitter
  in runtime code; otherwise the step can never complete.
  Better than "scene wiring" (vague) or bare "trigger"
  (collides with the YAML field).
- **Completion-event coverage** -- the startup validation
  check that confirms every step's `completionTrigger`
  has a matching completion-event emitter. Strict for the
  active protocol; relaxed (or warning-only) for tutorial
  protocols by design. Better than "trigger coverage" or
  "scene wiring coverage".
- **Interaction index** -- the zero-based position of the
  current required interaction inside the active step's
  interaction sequence. Better than "Cursor" (sounds like the
  mouse arrow on screen).
- **Used items** -- the derived, de-duplicated step-level
  summary of every `tool`/`source`/`destination` id in the
  step's interaction sequence, in first-use order. Not
  authored, not the live highlight set. Better than
  `targetItems` (collides with `destination`) and better than
  `highlightItems` (which sounds like the live highlight
  state).
- **Active highlight items** -- the runtime set of items
  currently glowing in the UI. Derived per-frame from the
  active interaction's `tool`/`source`/`destination`. Distinct
  from `usedItems`.
- **Wrong-order click** -- a click that does not satisfy the
  current interaction. Better than `outOfSequenceClicks`
  (long; technical).

## Container terms

| Term | Definition | Where it surfaces |
| --- | --- | --- |
| **Protocol** | The complete lab procedure. Lives as a self-contained folder under `src/content/<protocol_name>/` with `items.yaml`, `reagents.yaml`, `protocol.yaml`. | folder name; `--protocol <name>` build flag |
| **Part** | A named grouping of steps inside a protocol. | `protocol.yaml` part header |
| **Step** | One numbered objective in a part. | `protocol.yaml` step entry; `ProtocolStep` interface |
| **Interaction sequence** | The ordered list of interactions a step requires. | `step.interactionSequence` (renamed from `allowedInteractions`) |
| **Interaction** | One logical player operation. May require 1-3 clicks. | one entry in `interactionSequence` |
| **Click plan** | Ordered click list for a single interaction. Tool first. | derived per interaction shape |
| **Click target** | One DOM element a click is dispatched to. | UI/testing docs only |
| **Scene** | The active UI viewport. Allowed values: `hood`, `bench`, `incubator`, `microscope`, `plate_reader`. | `step.scene` |

## Field-level terms (modern YAML keys)

| Term | Definition | Field |
| --- | --- | --- |
| **Item** | A physical game item defined in `items.yaml`. Identified at the DOM by `data-item-id`. | `items.yaml` |
| **Reagent** | A substance defined in `reagents.yaml`. | `reagents.yaml` |
| **Liquid** | A reagent currently being moved or held. | `interaction.liquid` |
| **Tool** | The item performing the interaction. Always clicked first. | `interaction.tool` (renamed from `actor`) |
| **Source** | The item being drawn from during a load. | `interaction.source` |
| **Destination** | The item that physically receives transferred liquid, cells, waste, or material during a discharge. Click target. Do not use for context or scene affordances. | `interaction.destination` (renamed from `target`) |
| **Direct tool interaction** | A one-click interaction completed by clicking the tool itself. Has `tool` + `completionEvent`; no `source`, no `destination`. Use for spray-style actions, instrument starts, or direct-control devices. | tool-only entry in `interactionSequence` |
| **State change** | Optional runtime change caused by the interaction. | `interaction.stateChange` (renamed from `result`) |
| **Held liquid** | Runtime state of a tool that has drawn liquid. Mirrors `stateChange.heldLiquid`. | `gameState.heldLiquid` |
| **Completion event** | Optional runtime signal emitted by an interaction. | `interaction.completionEvent` (renamed from `event`) |
| **Completion trigger** | Step-level listener that fires on a completion event. | `step.completionTrigger` (renamed from `trigger`) |
| **Required items** | Flat set of items declared on the step as logically required. | `step.requiredItems` (kept) |
| **Used items** | Derived, de-duplicated step-level summary in first-use order. Not authored, not the live highlight set. | `step.usedItems` (derived; replaces `targetItems`) |

## Runtime / state terms

| Term | Definition | Code surface |
| --- | --- | --- |
| **Interaction index** | Zero-based position of the current required interaction inside the active step's interaction sequence. Reset on step entry; advances when an interaction completes. | `gameState.interactionIndex` (renamed from `cursor`) |
| **Active highlight items** | Runtime set of items currently glowing in the UI. Derived per-frame from the active interaction's `tool`/`source`/`destination`. Distinct from `usedItems`. | `src/scenes/hood.ts` |
| **Step-order error** | Existing soft-fail signal: a `completeStep` call for the wrong step id. | `gameState.stepsOutOfOrder`, `outOfOrderAttempts` |
| **Wrong-order click** | A click that does not satisfy the current interaction. Soft-fail in gameplay; hard-fail in the auto-walker. | `gameState.wrongOrderClicks` (renamed from `outOfSequenceClicks`) |
| **Completion-event emitter** | The scene/modal code path that emits a completion event when the player completes the matching interaction. | scene `.ts` files (`hood.ts`, `bench.ts`, modal handlers) |
| **Completion-event coverage** | Startup check that every declared `completionTrigger` has a matching emitter. Strict for `cell_culture`; relaxed for tutorials. | `src/init.ts` |

## Test-tier terms

| Term | Definition | Tool |
| --- | --- | --- |
| **Graph smoke** | Fast data-layer test that walks `nextId` by calling internal APIs. Proves the protocol graph is connected. Proves nothing about gameplay. | `devel/protocol_graph_smoke.mjs` |
| **Walker** | YAML-driven UI playthrough that clicks the real DOM. Canonical real-UI regression test. | `devel/protocol_walkthrough_yaml.mjs` |
| **Wrong-order UI pass** | Variant of the walker that injects a wrong-order click before each correct sequence and asserts soft-fail behavior. | walker `--wrong-order` flag |
| **Human playtest** | A human plays the game. The only thing that judges UX clarity. | a human |

## Banned synonyms (do not use)

Banned terms may appear only in this table, in explicit migration or rename notes, and in code identifiers (until Patch 1 mechanical rename). They must not appear in normal prose, examples, code comments, or error messages.

| Banned | Use instead | Reason |
| --- | --- | --- |
| `actor` | **tool** | abstract; lab-author-unfriendly |
| `target` | **destination** | overloaded with `targetItems` and "click target" |
| `targetItems` | **usedItems** | conflated with destination |
| `allowedInteractions` | **interactionSequence** | "allowed" reads as optional/unordered |
| `result` | **stateChange** | could mean game score/result |
| `event` | **completionEvent** | too generic; collides with DOM events |
| `trigger` (alone) | **completionTrigger** | vague |
| `cursor` | **interaction index** | sounds like the mouse arrow |
| `outOfSequenceClicks` | **wrongOrderClicks** | technical and long |
| `requiredAction` | (removed) | deleted; not replaced |
| `highlightItems` | **usedItems** (summary) or **active highlight items** (live) | sounded like live state, but was the summary |
| "object" (clickable) | **item** | overloaded with JS object literals |
| "action" (bare) | **interaction**, **click**, or **completion event** | overloaded |
| "sequence" (bare) | **interaction sequence**, **click plan**, or **step chain** | always specify which level |
| "task" | **step** | collides with TaskCreate/TaskUpdate |
| "phase" (planning) | **milestone** | per repo planning conventions |
| "stage" (planning) | **milestone** | reserve "stage" for code-level pipeline |
| "drag" / "drop" / "carry" | **load** (for source) / **discharge** (for destination) / **held liquid** | game has no drag-and-drop |
| "ingredient" | **reagent** or **liquid** | undefined in this codebase |
| "scene step" / "screen" | **scene** | one canonical viewport word |
| "recipe" | **interaction sequence** | informal |
| "source-first" | (unsupported) | tool-first is the canonical click model |
| `scene wiring` | **completion-event emitter** | vague; conflates YAML field, runtime signal, and emitter code |
| `trigger coverage` | **completion-event coverage** | "trigger" alone collides with the YAML field |
| `registered triggers` | **registered emitters** | same |
| `trigger` (bare, in code/runtime context) | **completion event** OR **completion-event emitter** | always specify which level |

## Worked example

Modern YAML for a PBS wash:

```yaml
- id: pbs_wash
  label: "Wash the flask with 4 mL PBS"
  scene: hood
  interactionSequence:
    - tool: serological_pipette
      source: pbs_bottle
      liquid: pbs
      stateChange:
        heldLiquid:
          tool: serological_pipette
          liquid: pbs
          volumeMl: 4
          colorKey: pbs
    - tool: serological_pipette
      destination: flask
      liquid: pbs
      consumesVolumeMl: 4
      completionEvent: pbs_wash
  nextId: add_trypsin
```

Required click plans (canonical):

```
Step: Wash cells with PBS

  Interaction 0: Load PBS into pipette
    Click plan:
      1. serological_pipette   (tool first)
      2. pbs_bottle            (source)
    State change:
      - serological_pipette holds 4 mL PBS
    Completion event:
      - none

  Interaction 1: Add PBS to flask
    Click plan:
      1. serological_pipette   (only if not still selected)
      2. flask                 (destination)
    State change:
      - flask receives PBS
    Completion event:
      - pbs_wash
```

Note: the YAML's `completionTrigger.completionEvent: "click:pbs_wash"`
names the event, but the step only completes when the runtime code
in `src/scenes/hood.ts` actually emits it. That code path is the
**completion-event emitter** for `pbs_wash`. The startup
**completion-event coverage** check enforces that every declared
trigger has a matching emitter.

Derived `usedItems` (summary; first-use order, tool -> source ->
destination):

```
usedItems: [serological_pipette, pbs_bottle, flask]
```

## State-change vs. completion rule

A state change is not a step completion. Loading the pipette
changes state but does not complete the step. Discharging into
the flask changes state AND emits the completion event that
completes the step.

In this schema, a completion event is the signal that the step
is complete. Each step may have at most one completion event,
and it must be on the final interaction. Setup or intermediate
interactions carry `stateChange` but not `completionEvent`. The
validator enforces this exactly.

## Tool-first click model

The tool is always clicked before its source or destination.
Source-first or destination-first click models are not
supported. The validator rejects any interaction that has
`source`, `destination`, `liquid`, or `stateChange` but does not
declare `tool` (the only exception is an interaction that
explicitly declares `direct: true`, allowed for direct-action
items like opening an incubator door).

## Migration note

<!-- TODO Patch 1 close: remove this section once the mechanical rename is complete and legacy field names are gone. -->

This vocabulary is the only vocabulary used in the repo. The
schema rename and field cleanup are tracked in the active plan.
Until Patch 1 lands, runtime code still uses legacy field names;
this doc is the canonical contract the rest of the docs reference.
There is no compatibility layer for legacy field names once the
rename completes.
