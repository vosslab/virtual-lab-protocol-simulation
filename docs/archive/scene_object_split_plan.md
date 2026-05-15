# Plan: Split scene YAML into a three-vocabulary model (protocol, object, scene)

## Context

Today a single scene YAML file does two unrelated jobs at once. It declares
*what each thing is* (`items[]` with `svgAsset`, `kind`, `inventoryRef`, plus
the per-asset visual metrics that actually live in `src/asset_specs.ts`) and
*where each thing goes* (`zones`, `layoutRules`, `sceneBounds`, and the
placement sub-fields on each item). Object identity and spatial placement are
fused in one file, and object property data is split between the YAML and a
hand-maintained TypeScript table. This is the same failure mode
`PRIMARY_CONTRACT.md` item 1 already named once -- a format built around one
scene that does not generalize -- reappearing one layer down in the scene
format itself. It blocks the runtime work: the `plate_drug_treatment` backend
is stalled because there is no clean way to express object structure (96 wells)
separately from object placement.

The just-closed unified interaction vocabulary plan settled the protocol side
(`docs/active_plans/unified_interaction_vocabulary_plan.md`, committed in
`3bb25fa`). A brainstorming pass then settled the scene side: the fix is to
split authoring into three vocabularies, each answering exactly one question.

- **protocol** -- what should happen (already done: the two-level
  step/interaction model).
- **object** -- what a thing is, what state it can hold, and how that state
  appears. An object declares `state_fields` (the schema of its state
  variables) and a `render_map` (state value to visual asset). It owns SVG
  manipulation.
- **scene** -- where things appear and how the space is arranged. The scene
  references objects by id and places them; it declares no object identity.

Runtime state is not a fourth authoring language: it is just the current
values of an object's declared `state_fields`. The protocol mutates those
fields through semantic scene operations; it never names an SVG asset.

The intended outcome of this plan is the documentation for that three-way
split: a new `docs/OBJECT_VOCABULARY.md` and `docs/OBJECT_YAML_FORMAT.md`, a
rewritten `docs/SCENE_VOCABULARY.md` and `docs/SCENE_YAML_FORMAT.md`, a
re-touch of the just-closed `docs/PROTOCOL_VOCABULARY.md` to reclassify
`SvgSwap`, all ratified against the 7 existing scene YAML files and the 45
entries in `src/asset_specs.ts`, and ready for the two follow-on plans (first
migrate the `content/` and `src/scenes/` YAML files, then change the
TypeScript).

## Objectives

- Define an `object` authoring vocabulary: an object declares identity,
  structure/subparts, `state_fields` (typed state-variable schema), a
  `render_map` (state value to visual asset), and layout hints, and it owns
  all SVG manipulation.
- Define the cleaned `scene` authoring vocabulary: a scene references objects
  by id and places them, declares zones and spatial arrangement, and contains
  no object-identity data.
- Define the three-way boundary as an explicit rule: protocol names what
  happens, object names what a thing is and how its state appears, scene
  names where it goes -- with every current scene-YAML key and item sub-field
  assigned to exactly one vocabulary.
- Reclassify `SvgSwap` (and asset/overlay selection) out of the protocol-level
  `scene_operation` set into the object/render layer, and introduce
  `ObjectStateChange` as the semantic protocol primitive that sets declared
  object state.
- Ratify the split by decomposing every current scene YAML file and every
  current `src/asset_specs.ts` entry into object definitions plus scene placements,
  with a coverage matrix and a residual-gap list.
- Leave `docs/OBJECT_VOCABULARY.md`, `docs/OBJECT_YAML_FORMAT.md`,
  `docs/SCENE_VOCABULARY.md`, `docs/SCENE_YAML_FORMAT.md`, and the re-touched
  `docs/PROTOCOL_VOCABULARY.md` internally consistent and ready for the
  follow-on YAML-migration plan.

## Design philosophy

This plan spends three separate document families to keep object identity,
spatial placement, and learning flow from collapsing into each other again --
the alternative, a single richer scene format, was rejected because it is
exactly the conflation that failed. It leans on "Fix the design, not the
symptom" (`docs/REPO_STYLE.md`): the durable fix is a vocabulary that
separates the concerns, not a patch that makes the current fused format
stretch a little further. Like the unified interaction vocabulary plan before
it, this plan designs on paper and ratifies against the hardest real inputs
(the 7 existing scenes, the 96-well plate) before any code or content YAML
changes -- accepting that the docs will, for a while, describe a format the
code and content files do not yet match. Two follow-on plans, in order, close
that gap: first the content/scene YAML migration, then the TypeScript.

## Scope

- Consolidate an evidence artifact: every object-identity field and every
  placement field across current scene YAML files, every `src/asset_specs.ts`
  entries, the `items[]` sub-fields, the runtime liquid-state model, and the
  ratified `scene_operation` primitive set.
- Design the `object` vocabulary in a working design doc: identity,
  structure/subparts (structured surfaces such as wells, lanes, tubes),
  `state_fields` schema, `render_map`, capabilities, and layout hints.
- Design the cleaned `scene` vocabulary in the design doc: object references,
  placement, zones, spatial arrangement; the explicit list of what moves out
  to the object vocabulary.
- Design the three-way boundary rule and the per-key assignment of every
  current scene-YAML key and item sub-field to exactly one vocabulary.
- Design the protocol-side touch: `ObjectStateChange` as the semantic
  primitive, and the reclassification of `SvgSwap` and asset/overlay
  selection into the object/render layer; re-partition the ratified
  `scene_operation` primitive set accordingly.
- Ratify: decompose every current scene YAML file and every current `asset_specs.ts`
  entry into object-def plus scene-placement; produce a coverage matrix and
  a residual-gap list.
- Create `docs/OBJECT_VOCABULARY.md` and `docs/OBJECT_YAML_FORMAT.md`.
- Rewrite `docs/SCENE_VOCABULARY.md` and `docs/SCENE_YAML_FORMAT.md` to the
  cleaned scene-only vocabulary.
- Re-touch `docs/PROTOCOL_VOCABULARY.md` to reclassify `SvgSwap` and add
  `ObjectStateChange`.
- Align every dependent `docs/` file (`SCENE_ARCHITECTURE.md`,
  `LAYOUT_ENGINE.md`, `SVG_PIPELINE.md`, `LIQUID_CONVENTION.md`,
  `PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_YAML_FORMAT.md`,
  `CODE_ARCHITECTURE.md`, plus any a `docs/` audit surfaces).
- Finalize `docs/CHANGELOG.md`; stub the follow-on content-YAML-migration
  plan in `docs/active_plans/`.

## Non-goals

- Migrating the current `src/scenes/*.yaml` files or
  `content/plate_drug_treatment/scene.yaml` to the new format -- that is the
  first follow-on plan, not this one.
- Editing `src/asset_specs.ts`, `src/layout_engine.ts`, `src/scene_runtime/`,
  or any TypeScript -- that is the second follow-on plan.
- Building a scene-YAML or object-YAML loader, validator, or JSON schema --
  code work, deferred to the follow-on plans.
- Editing `src/scenes/` -- frozen per the archived `SRC_SCENES_FREEZE.md`.
- Implementing any of the the ratified `scene_operation` primitive set -- they remain
  target-state; this plan only re-partitions which layer owns each.
- Reopening the settled protocol two-level step/interaction model -- the only
  protocol-doc edit is the `SvgSwap` reclassification and `ObjectStateChange`
  addition.
- Designing the renderer -- the object vocabulary names the state-to-visual
  map; it does not specify how the scene adapter draws it.

## Current state summary

What exists today (from the M1-feeding investigation):

- The current scene YAML files:
  `src/scenes/{bench,cell_culture_hood,incubator,microscope,plate_reader,well_plate_workspace}/*.yaml`
  plus `content/plate_drug_treatment/scene.yaml`. No JSON schema; validation
  is hardcoded in `tools/build_scene_data.py`.
- Scene YAML top-level keys: `sceneId`, `workspace`, `capabilities`,
  `elementId`, `items`, `zones`, `sceneBounds`, `layoutRules`, `accentRules`,
  `wrongOrderMessage`, `tabStops`, `target_groups`. Of these, `items`
  (and `sceneId`, `workspace`) carry object identity; the rest are placement
  or boundary concerns.
- `items[]` sub-fields mix both concerns: `id`, `label`, `kind`, `svgAsset`,
  `inventoryRef` are object identity; `zone`, `depthTier`, `widthScale`,
  `anchorY`, `alignStop`, `depth`, `baselineOverride`, `shortLabel` are
  placement.
- `src/asset_specs.ts` is the de-facto object-property store: every asset keyed
  by asset id, each with `defaultWidth`, `labelWidth`, `anchorYOffset`,
  `widthScale`. It is hand-maintained TypeScript, not authorable YAML.
- No `OBJECT_VOCABULARY.md`, no object-definition YAML, no `state_fields` or
  `render_map` anywhere -- `items[]` is the only place objects are declared.
- Runtime state is implicit: liquid state lives in
  `src/scene_runtime/types.ts` (`LiquidEntry`, `ContainerLiquid`,
  `LiquidState`), computed at runtime, never declared as schema on an object.
- The ratified `scene_operation` primitive set (`SvgSwap`, `ColorChange`,
  `CursorAttach`, `SceneChange`, `LayoutMove`, `LiquidDisplayChange`,
  `SetPointDisplayChange`, `TimedWait`) are all target-state in
  `docs/PROTOCOL_VOCABULARY.md`; none are implemented. `SvgSwap` is currently
  documented as a protocol-level `scene_operation` -- the brainstorm concluded
  it is really a render-level mechanism and belongs in the object layer.
- `docs/SCENE_ARCHITECTURE.md` already names an "Adapter registry (target
  resolution)" section, target-state, not yet implemented.

What is broken / missing:

- Object identity and placement are not separable, so an object cannot be
  reused across scenes and object structure (96 wells) cannot be declared
  apart from placement.
- Object property data is split across YAML and `asset_specs.ts` with no
  single authoring surface.
- The protocol vocabulary leaks a render mechanism (`SvgSwap`) into its
  semantic primitive set.

Evidence base: the two M1-feeding exploration briefings (scene-doc structure;
layout-engine + runtime + asset-specs structure), the current scene YAML files,
`src/asset_specs.ts`, `src/scene_runtime/contract.ts` and `types.ts`,
`src/layout_engine.ts`, `tools/build_scene_data.py`, and the M4-closed
`docs/PROTOCOL_VOCABULARY.md`.

## Architecture boundaries and ownership

This plan produces documentation only. "Components" are doc artifacts.

- Evidence artifact: a new file under `docs/active_plans/` (proposed
  `docs/active_plans/scene_object_split_inventory.md`). One owner. Single
  source of truth for what object-identity and placement data exist today.
- Vocabulary design doc: a new working doc under `docs/active_plans/`
  (proposed `docs/active_plans/scene_object_split_design.md`). The design
  surface before the canonical docs are created or rewritten.
- Canonical object vocabulary: `docs/OBJECT_VOCABULARY.md` (new). One owner.
- Canonical object YAML format: `docs/OBJECT_YAML_FORMAT.md` (new). One owner.
- Canonical scene vocabulary: `docs/SCENE_VOCABULARY.md` (rewrite). One owner.
- Canonical scene YAML format: `docs/SCENE_YAML_FORMAT.md` (rewrite). One
  owner.
- Protocol vocabulary re-touch: `docs/PROTOCOL_VOCABULARY.md` (narrow edit).
  One owner.
- Dependent docs: `docs/SCENE_ARCHITECTURE.md`, `docs/LAYOUT_ENGINE.md`,
  `docs/SVG_PIPELINE.md`, `docs/LIQUID_CONVENTION.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/PROTOCOL_YAML_FORMAT.md`,
  `docs/CODE_ARCHITECTURE.md`. One owner for the alignment pass.
- Ratification matrix: a section in the evidence artifact; one owner per
  decomposition lane.

Durable terminology: milestone / workstream / work package labels never enter
doc identifiers. The durable labels are the vocabulary terms the design
defines -- `state_fields`, `render_map`, structured surface, subpart, object
reference, placement, `ObjectStateChange` -- and naming them well for YAML
authors is the plan's central deliverable.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-EV | `docs/active_plans/scene_object_split_inventory.md` | 1 to 2 |
| M2 / WS-OBJ | design doc -- object vocabulary section | 1 |
| M2 / WS-SCN | design doc -- cleaned scene vocabulary section | 1 |
| M2 / WS-BND | design doc -- three-way boundary + per-key assignment | 1 |
| M2 / WS-PROTO | design doc -- ObjectStateChange + SvgSwap reclassification | 1 |
| M3 / WS-RAT-A | ratification: the current scene YAML files decomposed | 1 |
| M3 / WS-RAT-B | ratification: every asset_specs.ts entry to object defs | 1 |
| M3 / WS-RAT-C | ratification: runtime state model + scene_operation re-partition | 1 |
| M4 / WS-DOC-OV | `docs/OBJECT_VOCABULARY.md` (new) | 1 to 2 |
| M4 / WS-DOC-OY | `docs/OBJECT_YAML_FORMAT.md` (new) | 1 to 2 |
| M4 / WS-DOC-SV | `docs/SCENE_VOCABULARY.md` rewrite | 1 to 2 |
| M4 / WS-DOC-SY | `docs/SCENE_YAML_FORMAT.md` rewrite | 1 to 2 |
| M4 / WS-DOC-PV | `docs/PROTOCOL_VOCABULARY.md` re-touch | 1 |
| M4 / WS-DOC-DEP | dependent-doc alignment | 2 to 3 |
| M4 / WS-DOC-C | changelog + close-out + follow-on stub | 1 |

Patch counts are deliberately below the `CAPACITY_AND_SIZING.md` code-plan
ranges: this is a documentation-design plan, and each doc artifact is sized
for one owner and one reviewable patch.

## Milestone plan

### Milestone M1: Consolidate the object-vs-placement evidence base

- Depends on: none.
- Workstreams: WS-EV.
- Entry criteria: none.
- Exit criteria:
  - One committed artifact catalogs: every `items[]` sub-field across the 7
    scene YAML files, tagged object-identity vs placement; the 12 scene-YAML
    top-level keys, tagged; all every `src/asset_specs.ts` entry with their
    property names; the runtime liquid-state model
    (`LiquidEntry` / `ContainerLiquid` / `LiquidState`); and the 8
    `scene_operation` primitives with their current layer.
  - The artifact lists candidate `state_fields` (from the runtime state model
    and the liquid convention), candidate structured surfaces (wells, lanes,
    tubes, racks), and known inconsistencies (object data split across YAML
    and `asset_specs.ts`; `SvgSwap` mis-layered).
  - `docs/CHANGELOG.md` draft entry started.
  - Obvious follow-on: hand the artifact to all of M2.
- Parallel-plan ready: no -- a single consolidation artifact authored by one
  owner; splitting it creates merge churn on one file. Max parallel doers: 1.

### Milestone M2: Design the three-vocabulary model

- Depends on: M1 -- the design works from the consolidated evidence.
- Workstreams: WS-OBJ, WS-SCN, WS-BND, WS-PROTO.
- Entry criteria: M1 artifact complete.
- Exit criteria:
  - The `object` vocabulary is defined: identity, structure/subparts
    (structured surfaces and their subparts), the `state_fields` schema (each
    field has name, type, allowed values or range, default), the `render_map`
    (state value to visual asset, so the object owns the state-to-visual
    mapping and the protocol never names an asset), capabilities, and layout
    hints -- with a worked object example (a 96-well plate showing subparts
    plus per-well flat-primitive `state_fields` such as `liquid_id`,
    `liquid_volume`, `liquid_color` per RD-11, and a serological pipette
    showing flat-primitive `state_fields` such as `set_volume`,
    `held_liquid_id`, `held_liquid_volume` per RD-11).
  - The cleaned `scene` vocabulary is defined: how a scene references an
    object by id, how it places that object, zones and spatial arrangement;
    and an explicit list of every key and item sub-field that moves out of
    scene YAML into object YAML.
  - The three-way boundary rule is written, with a table assigning every
    current scene-YAML top-level key and every `items[]` sub-field to exactly
    one vocabulary (protocol / object / scene).
  - The protocol-side touch is designed: `ObjectStateChange` is specified as
    the semantic primitive that sets declared object `state_fields`; `SvgSwap`
    and asset/overlay selection are reclassified as object/render-layer
    mechanisms; the ratified `scene_operation` primitive set is re-partitioned into
    protocol-level versus object/render-layer.
  - No "TBD" survives in any of those sections.
  - All design output lives in the working design doc; the canonical docs are
    untouched until M4.
  - Obvious follow-on: flag any object construct that will not decompose
    cleanly for M3 before ratification starts.
- Parallel-plan ready: yes -- WS-OBJ owns the object section, WS-SCN the scene
  section, WS-BND the boundary table, WS-PROTO the protocol touch; they share
  only the M1 artifact read-only. WS-SCN, WS-BND, WS-PROTO consume WS-OBJ's
  `state_fields` / `render_map` definitions, so they start a beat behind. Max
  parallel doers: 4.

### Milestone M3: Ratify the split against all existing scenes and assets

- Depends on: M2 -- ratification tests the designed vocabulary.
- Workstreams: WS-RAT-A, WS-RAT-B, WS-RAT-C.
- Entry criteria: M2 design doc complete.
- Exit criteria:
  - Every one of the the current scene YAML files is decomposed on paper into an object
    set plus a scene-placement file, with each current key and sub-field
    landing in its assigned vocabulary (WS-RAT-A).
  - All every `src/asset_specs.ts` entry are mapped to object definitions,
    showing where `defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`
    land (object layout hints) and which assets need `state_fields` /
    `render_map` (WS-RAT-B).
  - The runtime liquid-state model and the the ratified `scene_operation` primitive set are
    checked against the re-partition: every runtime state value maps to a
    declared `state_field`, and every primitive has a confirmed owning layer
    (WS-RAT-C).
  - A consolidated residual-gap list names every construct the model cannot
    express and says whether it needs a new object concept, a boundary
    revision, or a design revision.
  - If ratification surfaces a design gap, M2's design doc is revised and the
    revision noted; M3 is not done until the gap list is empty or every entry
    has an accepted disposition.
  - Obvious follow-on: hand the coverage matrix and gap dispositions to M4.
- Parallel-plan ready: yes -- three disjoint decomposition lanes, each
  read-only against its inputs and the shared design doc. The residual-gap
  consolidation is a short serial join owned by WS-RAT-A. Max parallel
  doers: 3.

### Milestone M4: Create and rewrite the canonical docs and close out

- Depends on: M3 -- the canonical docs encode the ratified vocabulary.
- Workstreams: WS-DOC-OV, WS-DOC-OY, WS-DOC-SV, WS-DOC-SY, WS-DOC-PV,
  WS-DOC-DEP, WS-DOC-C.
- Entry criteria: M3 ratification complete; residual-gap list dispositioned.
- Exit criteria:
  - `docs/OBJECT_VOCABULARY.md` created: object identity, structured surfaces
    and subparts, `state_fields`, `render_map`, capabilities, layout hints, the
    object's ownership of SVG manipulation. Target-state clearly labeled.
  - `docs/OBJECT_YAML_FORMAT.md` created: the object-definition YAML schema,
    every field typed, with worked examples.
  - `docs/SCENE_VOCABULARY.md` rewritten: defines the scene-side terms
    (placement, zones, object reference, background); shared concepts point
    to `OBJECT_VOCABULARY.md` and `PROTOCOL_VOCABULARY.md`.
  - `docs/SCENE_YAML_FORMAT.md` rewritten: documents the scene YAML schema
    that stays scene-side (object references plus placement) and a migration
    note pointing at the follow-on plan for keys that moved to object YAML.
  - `docs/PROTOCOL_VOCABULARY.md` re-touched: `SvgSwap` reclassified out of
    the `scene_operation` set into the object/render layer with a pointer to
    `OBJECT_VOCABULARY.md`; `ObjectStateChange` added as the semantic
    primitive; the retired-terms and primitive-list sections updated.
  - Every dependent `docs/` file is aligned: each affected section rewritten,
    deleted if obsolete, or moved to `docs/archive/` if still useful as
    history -- no transitional notes.
  - `docs/CHANGELOG.md` entry finalized.
  - A follow-on content/scene-YAML-migration plan is stubbed in
    `docs/active_plans/`, naming the ratified docs as its input and the 7
    scene YAML files plus `content/plate_drug_treatment/scene.yaml` as its
    targets; it notes the TypeScript change as the second follow-on after it.
  - Obvious follow-on: run the ASCII and markdown-link gate on every changed
    doc; if the `docs/` audit surfaces a file not in the dependent list, add
    and align it before closing.
- Parallel-plan ready: yes -- seven disjoint doc owners. WS-DOC-DEP and
  WS-DOC-C consume the finished WS-DOC-OV / WS-DOC-OY / WS-DOC-SV / WS-DOC-SY
  / WS-DOC-PV text. Max parallel doers: 5 (WS-DOC-DEP and WS-DOC-C gated on
  the five rewrites landing).

## Workstream breakdown

### Workstream WS-EV: Evidence consolidation

- Owner: planner.
- Interfaces:
  - Needs: the two M1-feeding exploration briefings; the the current scene YAML files;
    `src/asset_specs.ts`; `src/scene_runtime/contract.ts` and `types.ts`;
    `docs/PROTOCOL_VOCABULARY.md`.
  - Provides: the consolidated evidence artifact to all of M2.
- Expected patches: 1 to 2.

### Workstream WS-OBJ: Object vocabulary design

- Owner: architect.
- Interfaces:
  - Needs: M1 evidence artifact.
  - Provides: the object vocabulary -- identity, structured surfaces/subparts,
    `state_fields` schema, `render_map`, capabilities, layout hints -- to
    WS-SCN, WS-BND, WS-PROTO, and all of M3.
- Expected patches: 1.

### Workstream WS-SCN: Cleaned scene vocabulary design

- Owner: architect.
- Interfaces:
  - Needs: M1 evidence artifact; WS-OBJ's object definitions.
  - Provides: the cleaned scene vocabulary (object reference + placement) and
    the moved-keys list to WS-BND and M4.
- Expected patches: 1.

### Workstream WS-BND: Three-way boundary and per-key assignment

- Owner: architect.
- Interfaces:
  - Needs: WS-OBJ and WS-SCN definitions; M1 evidence on the current key set.
  - Provides: the boundary rule and the per-key / per-sub-field assignment
    table to WS-DOC-* in M4.
- Expected patches: 1.

### Workstream WS-PROTO: ObjectStateChange and SvgSwap reclassification design

- Owner: planner.
- Interfaces:
  - Needs: WS-OBJ's `state_fields` and `render_map` definitions; the
    M4-closed `docs/PROTOCOL_VOCABULARY.md` primitive set.
  - Provides: the `ObjectStateChange` spec and the re-partitioned
    `scene_operation` ownership table to WS-RAT-C and WS-DOC-PV.
- Expected patches: 1.

### Workstream WS-RAT-A: Ratify the the current scene YAML files

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc.
  - Provides: a decomposition matrix for the current scenes and the consolidated
    residual-gap list (this workstream owns the serial join).
- Expected patches: 1.

### Workstream WS-RAT-B: Ratify the every asset_specs.ts entry

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc.
  - Provides: an asset-to-object-definition mapping and gap entries to
    WS-RAT-A.
- Expected patches: 1.

### Workstream WS-RAT-C: Ratify the state model and scene_operation re-partition

- Owner: reviewer.
- Interfaces:
  - Needs: the M2 design doc; WS-PROTO's re-partition table.
  - Provides: the state-model coverage check and the confirmed primitive
    ownership to WS-RAT-A and WS-DOC-PV.
- Expected patches: 1.

### Workstream WS-DOC-OV: Create OBJECT_VOCABULARY.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; M3 gap dispositions.
  - Provides: the canonical object vocabulary to WS-DOC-DEP and WS-DOC-C.
- Expected patches: 1 to 2.

### Workstream WS-DOC-OY: Create OBJECT_YAML_FORMAT.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; WS-DOC-OV's vocabulary.
  - Provides: the canonical object YAML schema to WS-DOC-DEP and WS-DOC-C.
- Expected patches: 1 to 2.

### Workstream WS-DOC-SV: Rewrite SCENE_VOCABULARY.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; WS-BND's boundary rule.
  - Provides: the canonical scene vocabulary, cross-referenced to
    `OBJECT_VOCABULARY.md`.
- Expected patches: 1 to 2.

### Workstream WS-DOC-SY: Rewrite SCENE_YAML_FORMAT.md

- Owner: planner.
- Interfaces:
  - Needs: the ratified M2 design; WS-BND's per-key assignment table.
  - Provides: the canonical cleaned scene YAML schema.
- Expected patches: 1 to 2.

### Workstream WS-DOC-PV: Re-touch PROTOCOL_VOCABULARY.md

- Owner: planner.
- Interfaces:
  - Needs: WS-PROTO's `ObjectStateChange` spec and re-partition table;
    WS-RAT-C's confirmed ownership.
  - Provides: the consistent protocol vocabulary to WS-DOC-DEP.
- Expected patches: 1.

### Workstream WS-DOC-DEP: Align dependent docs

- Owner: planner.
- Interfaces:
  - Needs: the finished WS-DOC-OV / WS-DOC-OY / WS-DOC-SV / WS-DOC-SY /
    WS-DOC-PV text.
  - Provides: aligned dependent docs. Known set: `SCENE_ARCHITECTURE.md`,
    `LAYOUT_ENGINE.md`, `SVG_PIPELINE.md`, `LIQUID_CONVENTION.md`,
    `PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_YAML_FORMAT.md`,
    `CODE_ARCHITECTURE.md`; a `docs/` audit confirms the full list.
- Expected patches: 2 to 3.

### Workstream WS-DOC-C: Close-out and follow-on stub

- Owner: planner.
- Interfaces:
  - Needs: all M4 doc rewrites landed.
  - Provides: the finalized changelog and the follow-on
    content-YAML-migration plan stub.
- Expected patches: 1.

## Work packages

### Work package WP-EV1: Build the consolidated object-vs-placement inventory

- Owner: planner.
- Touch points: `docs/active_plans/scene_object_split_inventory.md` (new).
- Depends on: none.
- Acceptance criteria:
  - Catalogs every `items[]` sub-field across the current scene YAML files, each
    tagged object-identity or placement, with counts.
  - Catalogs the 12 scene-YAML top-level keys, each tagged.
  - Lists every `src/asset_specs.ts` entry with their four property names.
  - Records the runtime liquid-state model and the ratified `scene_operation`
    primitive set with current layer.
  - Lists candidate `state_fields`, candidate structured surfaces, and the
    known inconsistencies.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_inventory.md`
- Obvious follow-ons:
  - Start the `docs/CHANGELOG.md` draft entry under "Additions and New
    Features".

### Work package WP-OBJ1: Define the object vocabulary

- Owner: architect.
- Touch points: `docs/active_plans/scene_object_split_design.md` (new) --
  object section.
- Depends on: WP-EV1.
- Acceptance criteria:
  - Defines object identity, structured surfaces and subparts, the
    `state_fields` schema (name, type, allowed values or range, default), the
    `render_map` (state value to visual asset), capabilities, and layout hints.
  - States plainly that the object owns the state-to-visual map and SVG
    manipulation; the protocol sets semantic state and the object resolves
    the asset.
  - Per RD-4 (subparts portion only) and RD-9 (named groups dropped):
    objects declare subparts (wells, lanes, rack slots), but `target_groups`
    is NOT added to the initial object vocabulary. Protocols address subparts
    explicitly (`treatment_plate.A1`, `treatment_plate.A2`).
  - Per RD-11, state_field types are flat primitives only (`enum`, `int`,
    `float`, `bool`). No structured `liquid` or `set_point` composite types.
  - Per RD-6, `capabilities` is a closed list (`clickable`,
    `liquid_container`, `instrument_with_setpoint`, `structured_surface`,
    `cursor_attachable`, `decoration_only`); `decoration_only` mutually
    exclusive with the others.
  - Includes a worked 96-well-plate object (subparts, per-well flat
    state_fields: `liquid_id` enum, `liquid_volume` float ul, `liquid_color`
    enum) and a serological-pipette object (flat state_fields:
    `set_volume` float ml, `held_liquid_id` enum, `held_liquid_volume`
    float ml).
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_design.md`
- Obvious follow-ons:
  - Hand the object definitions to WP-SCN1, WP-BND1, WP-PROTO1.

### Work package WP-SCN1: Define the cleaned scene vocabulary

- Owner: architect.
- Touch points: design doc -- scene section.
- Depends on: WP-OBJ1.
- Acceptance criteria:
  - Defines object-by-id reference, placement, zones, and spatial
    arrangement.
  - Per RD-1, defines the background as a static backdrop declared in scene
    YAML; clickable regions are objects placed over the background.
  - Lists every key and item sub-field that moves out of scene YAML into
    object YAML.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_design.md`
- Obvious follow-ons:
  - Hand the moved-keys list to WP-BND1.

### Work package WP-BND1: Define the three-way boundary and per-key assignment

- Owner: architect.
- Touch points: design doc -- boundary section.
- Depends on: WP-OBJ1, WP-SCN1.
- Acceptance criteria:
  - Writes the boundary rule (protocol = what happens, object = what a thing
    is and how its state appears, scene = where it goes).
  - Produces a table assigning every current scene-YAML top-level key and
    every `items[]` sub-field to exactly one vocabulary.
  - Per RD-2, encodes the instance-override rule: a scene placement may
    override an object's `label` and layout hints only; identity,
    `state_fields`, `render_map`, and `capabilities` stay object-owned.
  - Per RD-9, `target_groups` is dropped from the initial object vocabulary
    and removed from the boundary table entirely (not assigned to either
    side). Boundary table notes "deferred" with pointer to RD-9.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_design.md`
- Obvious follow-ons:
  - Hand the assignment table to WP-DOC-SV1 and WP-DOC-SY1.

### Work package WP-PROTO1: Design ObjectStateChange and the SvgSwap reclassification

- Owner: planner.
- Touch points: design doc -- protocol-touch section.
- Depends on: WP-OBJ1.
- Acceptance criteria:
  - Specifies `ObjectStateChange` with typed fields (target, state mapping)
    as the semantic primitive that sets declared object `state_fields`.
  - Reclassifies `SvgSwap` and asset/overlay selection as object/render-layer
    mechanisms, with the reason: the protocol stays semantic, and asset
    names stay replaceable.
  - Per RD-3, reclassifies `ColorChange` to the object/render layer alongside
    `SvgSwap`. Notes the single exception: a future protocol primitive may set
    color directly when color itself is the learning target (a colorimetric
    reading); that primitive is its own slot, not generic `ColorChange`.
  - Produces the re-partition table for all the ratified `scene_operation` primitive set,
    each assigned to protocol-level or object/render-layer.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_design.md`
- Obvious follow-ons:
  - Hand the re-partition table to WP-RAT-C1 and WP-DOC-PV1.

### Work package WP-RAT-A1: Ratify the the current scene YAML files

- Owner: reviewer.
- Touch points: a ratification matrix section in
  `docs/active_plans/scene_object_split_inventory.md`.
- Depends on: WP-OBJ1, WP-SCN1, WP-BND1, WP-PROTO1.
- Acceptance criteria:
  - Each of the the current scene YAML files decomposed on paper into an object set
    plus a scene-placement file, every key and sub-field landing in its
    assigned vocabulary.
  - Unmappable constructs flagged.
  - Owns the consolidated residual-gap list (merges WS-RAT-B and WS-RAT-C
    entries).
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_inventory.md`
- Obvious follow-ons:
  - If a gap requires a design revision, file it against WP-OBJ1 / WP-SCN1 /
    WP-BND1 and re-ratify the affected scenes before closing M3.

### Work package WP-RAT-B1: Ratify the every asset_specs.ts entry

- Owner: reviewer.
- Touch points: an asset-mapping matrix in the inventory artifact.
- Depends on: WP-OBJ1, WP-SCN1, WP-BND1, WP-PROTO1.
- Acceptance criteria:
  - All every entry mapped to object definitions, showing where
    `defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale` land and which
    assets need `state_fields` / `render_map`.
  - Gap entries handed to WP-RAT-A1.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_inventory.md`
- Obvious follow-ons:
  - Note any asset whose object identity is unclear from `asset_specs.ts`
    alone and needs a scene-YAML cross-check.

### Work package WP-RAT-C1: Ratify the state model and scene_operation re-partition

- Owner: reviewer.
- Touch points: a state-coverage section in the inventory artifact.
- Depends on: WP-OBJ1, WP-PROTO1.
- Acceptance criteria:
  - Every runtime liquid-state value (`LiquidEntry` / `ContainerLiquid` /
    `LiquidState`) maps to a declared `state_field`.
  - Every entry in the ratified `scene_operation` primitive set has a
    confirmed owning layer; disagreements with WP-PROTO1 flagged.
  - Gap entries handed to WP-RAT-A1.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/active_plans/scene_object_split_inventory.md`
- Obvious follow-ons:
  - Cross-check the re-partition against RD-3 (`ColorChange` and `SvgSwap`
    both render-layer), RD-9 (`target_groups` dropped from initial vocabulary),
    RD-10 (`LayoutMove` narrow scope), RD-11 (flat primitive state_fields
    only); flag any drift back to WP-PROTO1 or WP-BND1.

### Work package WP-DOC-OV1: Create OBJECT_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/OBJECT_VOCABULARY.md` (new).
- Depends on: WP-RAT-A1.
- Acceptance criteria:
  - Encodes object identity, structured surfaces and subparts, `state_fields`,
    `render_map`, capabilities, layout hints, and the object's ownership of SVG
    manipulation.
  - Target-state sections clearly labeled.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/OBJECT_VOCABULARY.md`
- Obvious follow-ons:
  - Verify every cross-reference link resolves per `docs/MARKDOWN_STYLE.md`.

### Work package WP-DOC-OY1: Create OBJECT_YAML_FORMAT.md

- Owner: planner.
- Touch points: `docs/OBJECT_YAML_FORMAT.md` (new).
- Depends on: WP-RAT-A1, WP-DOC-OV1.
- Acceptance criteria:
  - Documents the object-definition YAML schema, every field typed, with
    worked examples (including the 96-well plate and the serological pipette).
  - Cross-references `OBJECT_VOCABULARY.md`.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/OBJECT_YAML_FORMAT.md`
- Obvious follow-ons:
  - Verify every cross-reference link resolves.

### Work package WP-DOC-SV1: Rewrite SCENE_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/SCENE_VOCABULARY.md`.
- Depends on: WP-RAT-A1, WP-DOC-OV1.
- Acceptance criteria:
  - Defines the scene-side terms (placement, zones, object reference,
    background); shared concepts point to `OBJECT_VOCABULARY.md` and
    `PROTOCOL_VOCABULARY.md`.
  - Target-state and current-code sections clearly labeled.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/SCENE_VOCABULARY.md`
- Obvious follow-ons:
  - Update the retired-terms section to point object-identity terms at
    `OBJECT_VOCABULARY.md`.

### Work package WP-DOC-SY1: Rewrite SCENE_YAML_FORMAT.md

- Owner: planner.
- Touch points: `docs/SCENE_YAML_FORMAT.md`.
- Depends on: WP-RAT-A1, WP-BND1, WP-DOC-OY1.
- Acceptance criteria:
  - Documents the scene YAML schema that stays scene-side (object references
    plus placement).
  - Adds a migration note pointing at the follow-on content-YAML plan for
    keys now owned by object YAML.
  - Target-state and current-code sections clearly labeled.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/SCENE_YAML_FORMAT.md`
- Obvious follow-ons:
  - Verify every cross-reference link resolves.

### Work package WP-DOC-PV1: Re-touch PROTOCOL_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_VOCABULARY.md`.
- Depends on: WP-RAT-C1, WP-PROTO1.
- Acceptance criteria:
  - `SvgSwap` reclassified out of the `scene_operation` primitive set into the
    object/render layer, with a pointer to `OBJECT_VOCABULARY.md`.
  - `ObjectStateChange` added as the semantic primitive.
  - The primitive list and retired-terms sections updated; no other part of
    the M4-closed protocol model is changed.
- Verification commands:
  - `source source_me.sh && python3 tests/check_ascii_compliance.py -i docs/PROTOCOL_VOCABULARY.md`
- Obvious follow-ons:
  - Note in `docs/CHANGELOG.md` that a just-closed canonical doc was
    deliberately reopened, with the reason.

### Work package WP-DOC-DEP1: Align all dependent docs

- Owner: planner.
- Touch points: `docs/SCENE_ARCHITECTURE.md`, `docs/LAYOUT_ENGINE.md`,
  `docs/SVG_PIPELINE.md`, `docs/LIQUID_CONVENTION.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/PROTOCOL_YAML_FORMAT.md`,
  `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`; confirm the full set
  by auditing `docs/` first.
- Depends on: WP-DOC-OV1, WP-DOC-OY1, WP-DOC-SV1, WP-DOC-SY1, WP-DOC-PV1.
- Acceptance criteria:
  - Audits `docs/` and lists every file referencing the scene/object model.
  - Each affected section rewritten, deleted if obsolete, or moved to
    `docs/archive/` if still useful as history -- no transitional notes.
  - `docs/FILE_STRUCTURE.md` updated: adds the new `OBJECT_VOCABULARY.md` and
    `OBJECT_YAML_FORMAT.md` entries; updates the scene-doc rows to reflect
    the cleaned scope; notes that content/ folder layout (objects vs scenes
    vs protocols subdirs) is owned by the follow-on YAML-migration plan.
  - No `docs/` file contradicts the new canonical docs.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - If the audit surfaces a doc not in the known list, add and align it
    before closing the work package.

### Work package WP-DOC-C1: Close-out and follow-on plan stubs

- Owner: planner.
- Touch points: `docs/CHANGELOG.md`, three new follow-on plan stubs under
  `docs/active_plans/`.
- Depends on: WP-DOC-DEP1.
- Acceptance criteria:
  - `docs/CHANGELOG.md` entry finalized under the correct categories.
  - Follow-on plan 1 stubbed -- content/scene-YAML migration: names the
    ratified docs as input and the current scene YAML files plus
    `content/plate_drug_treatment/scene.yaml` as targets.
  - Follow-on plan 2 stubbed -- TypeScript migration: depends on plan 1;
    targets `src/asset_specs.ts`, `src/layout_engine.ts`,
    `src/scene_runtime/`, and the scene adapter registry.
  - Follow-on plan 3 stubbed -- docs/ folder organization: a separate
    light-organization plan (not mixed into vocabulary or YAML migration).
    See the "Follow-on plans" section below for the full target structure and
    rules to copy into the stub.
- Verification commands:
  - `source source_me.sh && pytest tests/test_ascii_compliance.py`
- Obvious follow-ons:
  - If `docs/CHANGELOG.md` is over the rotation threshold, note it for a human
    rotation decision (do not rotate as part of this work package).

## Acceptance criteria and gates

- Per-patch gate: every doc patch passes `tests/test_ascii_compliance.py` (or
  the single-file `tests/check_ascii_compliance.py`) and conforms to
  `docs/MARKDOWN_STYLE.md` (sentence-case headings, ASCII tables, working
  relative links).
- Integration gate (end of M2): the design doc defines the object vocabulary
  (`state_fields`, `render_map`, structured surfaces, capabilities, layout
  hints), the cleaned scene vocabulary, the three-way boundary with a
  per-key assignment table, and the `ObjectStateChange` plus `SvgSwap`
  re-partition -- no "TBD" in any of those sections.
- Integration gate (end of M3): every current scene YAML file and every current `asset_specs.ts` entries appear in a decomposition matrix; every runtime
  state value maps to a declared `state_field`; every `scene_operation`
  primitive has a confirmed layer; the residual-gap list is empty or every
  entry has an accepted disposition.
- Manual review gate (end of M4): a human confirms `OBJECT_VOCABULARY.md`,
  `OBJECT_YAML_FORMAT.md`, `SCENE_VOCABULARY.md`, `SCENE_YAML_FORMAT.md`, and
  the re-touched `PROTOCOL_VOCABULARY.md` are internally consistent, the
  three-way boundary reads as a usable rule, and an author could write an
  object definition and a scene placement from the docs.

## Test and verification strategy

- This plan ships documentation, so verification is review-based. The pytest
  gate that applies is `tests/test_ascii_compliance.py` plus the markdown-link
  check; per-file work uses `tests/check_ascii_compliance.py -i <file>`.
- Design verification is ratification itself: M3 is the test. A vocabulary
  that cannot decompose a real scene YAML file or a real `asset_specs.ts`
  entry has failed, and the failure is a residual-gap entry that forces an M2
  revision.
- Coverage is measured by the ratification matrix: percent of scene-YAML keys
  and item sub-fields assigned cleanly, percent of `asset_specs.ts` entries
  mapped, count of residual gaps, and whether each gap is "needs a new object
  concept", "needs a boundary revision", or "needs a design revision".
- The follow-on plans -- not this plan -- carry the YAML-migration and
  TypeScript gates.

## Migration and compatibility policy

- Additive rollout: the design lands first in the working design doc, is
  ratified, and only then is promoted into the canonical docs at M4.
- Backward compatibility: after this plan the docs describe a three-vocabulary
  format the scene YAML files, `content/` YAML, and TypeScript do not yet
  match. This is intentional and explicit -- target-state sections are clearly
  labeled, current-code sections clearly labeled. The first follow-on plan
  migrates the YAML; the second changes the TypeScript.
- Vocabulary rewrite, not a compatibility layer: target-state docs and
  examples use only the new three-vocabulary terms. The fused-format keys are
  removed from the canonical path; they may be named only in a migration note,
  never in a target-state example.
- Deletion criteria for legacy doc content: object-identity sections in the
  scene docs are rewritten to object-reference terms or moved to
  `docs/archive/`; no transitional notes left in the canonical path.
- Rollback strategy: the work is documentation on an `agent/` branch. If
  ratification (M3) shows the split is unworkable, the design doc is revised
  in place; the canonical docs are not touched until M4, so there is nothing
  to roll back. No partial promotion to the canonical docs.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Object / scene boundary is ambiguous for some keys | High | M3 finds a scene-YAML key or item sub-field that fits neither vocabulary cleanly | architect (WS-BND) | WP-BND1 produces an explicit per-key table, not prose; M3 ratifies all current scenes in parallel to surface ambiguity early; hard calls (background, instance overrides, `ColorChange`, `target_groups`, capability list, formula language, ObjectStateChange scope, LayoutMove scope, state_field types, constraint metadata) are pre-resolved in the Resolved decisions section (RD-1 through RD-12). |
| `state_fields` schema cannot express a real object's state | High | M3 finds runtime state (liquid, set-point, contents) that does not fit the declared schema | architect (WS-OBJ) | WP-OBJ1 must work the 96-well plate and the pipette as worked examples before M3; WP-RAT-C1 maps every runtime state value explicitly. |
| Reopening the just-closed PROTOCOL_VOCABULARY.md introduces drift | Medium | The `SvgSwap` reclassification contradicts another part of the M4-closed protocol model | planner (WS-DOC-PV) | WP-DOC-PV1 is a narrow edit scoped to the primitive list and retired-terms sections only; WP-RAT-C1 confirms the re-partition before the doc edit; the changelog records the deliberate reopen. |
| Object data split across YAML and asset_specs.ts is hard to reconcile | Medium | WP-RAT-B1 finds `asset_specs.ts` properties with no clean object-vocabulary home | reviewer (WS-RAT-B) | WP-RAT-B1 maps every entry explicitly; properties with no home become residual-gap entries that force a WP-OBJ1 revision, not a silent drop. |
| Three docs drift from each other | Medium | A reader finds `OBJECT_VOCABULARY.md` and `SCENE_VOCABULARY.md` defining the same concept differently | planner (WS-DOC-*) | Shared concepts are cross-referenced, not restated; the M4 manual review gate checks internal consistency across all five docs. |
| Scope creep into code or YAML migration | Low | A doer edits a scene YAML file, `asset_specs.ts`, or TypeScript | planner | Non-goals are explicit; the two follow-on plans own those changes; reviewers reject any non-doc change. |

## Rollout and release checklist

- [x] M1 evidence artifact committed.
- [x] M2 design doc complete; integration gate passed (no TBD; object
  vocabulary, cleaned scene vocabulary, boundary table, and protocol
  re-partition all present).
- [x] M3 ratification matrices complete for every current scene YAML file and every current `asset_specs.ts` entries; state model and `scene_operation` re-partition
  checked; residual-gap list dispositioned.
- [x] M2 design doc revised if M3 surfaced gaps; affected items re-ratified.
- [x] `docs/OBJECT_VOCABULARY.md` created; target-state sections labeled.
- [x] `docs/OBJECT_YAML_FORMAT.md` created; schema typed; examples worked.
- [x] `docs/SCENE_VOCABULARY.md` rewritten; scene-side terms defined;
  object-identity terms point to `OBJECT_VOCABULARY.md`.
- [x] `docs/SCENE_YAML_FORMAT.md` rewritten; scene-side schema documented;
  migration note added for keys now owned by object YAML.
- [x] `docs/PROTOCOL_VOCABULARY.md` re-touched; `SvgSwap` reclassified;
  `ObjectStateChange` added.
- [x] Dependent docs aligned (rewritten, deleted, or archived -- no
  transitional notes).
- [x] `docs/CHANGELOG.md` entry finalized.
- [x] Follow-on content/scene-YAML-migration plan stubbed.
- [x] Follow-on TypeScript-migration plan stubbed.
- [x] Follow-on docs/ folder organization plan stubbed (per the
  "Follow-on plans" section).
- [ ] Human review of the five canonical docs for internal consistency, a
  usable three-way boundary, and author-applicability.

## Documentation close-out requirements

- Active plan / progress tracker updates: the evidence artifact and the design
  doc both live under `docs/active_plans/`; the follow-on YAML-migration plan
  is stubbed there. This plan stays in `docs/active_plans/` until M4 closes;
  closure is recorded when the follow-on YAML-migration plan picks up the
  ratified docs.
- `docs/CHANGELOG.md` entry: owner WS-DOC-C; expected categories "Additions
  and New Features" (the object vocabulary, `OBJECT_VOCABULARY.md`,
  `OBJECT_YAML_FORMAT.md`, the evidence artifact), "Behavior or Interface
  Changes" (the rewritten scene docs, the re-touched protocol doc),
  "Decisions and Failures" (the object/placement conflation as the drift
  origin, the `SvgSwap` mis-layering, the deliberate reopen of a just-closed
  canonical doc, the decision to design docs-first ahead of YAML and code).
- Archive / closure notes: when the follow-on YAML-migration plan starts, this
  plan and its working design doc move to `docs/archive/`; the evidence
  artifact may be promoted into `docs/` if it stays useful as reference.

## Patch plan and reporting format

- Patch 1: `scene_object_split_inventory.md` -- consolidated evidence (WP-EV1).
- Patch 2: design doc -- object vocabulary (WP-OBJ1).
- Patch 3: design doc -- cleaned scene vocabulary (WP-SCN1).
- Patch 4: design doc -- three-way boundary and per-key assignment (WP-BND1).
- Patch 5: design doc -- `ObjectStateChange` and `SvgSwap` reclassification
  (WP-PROTO1).
- Patch 6: ratification matrix -- current scene YAML files plus gap list (WP-RAT-A1).
- Patch 7: ratification matrix -- every `asset_specs.ts` entry (WP-RAT-B1).
- Patch 8: ratification -- state model and `scene_operation` re-partition
  (WP-RAT-C1).
- Patch 9: `docs/OBJECT_VOCABULARY.md` (WP-DOC-OV1).
- Patch 10: `docs/OBJECT_YAML_FORMAT.md` (WP-DOC-OY1).
- Patch 11: `docs/SCENE_VOCABULARY.md` rewrite (WP-DOC-SV1).
- Patch 12: `docs/SCENE_YAML_FORMAT.md` rewrite (WP-DOC-SY1).
- Patch 13: `docs/PROTOCOL_VOCABULARY.md` re-touch (WP-DOC-PV1).
- Patch 14: dependent-doc alignment (WP-DOC-DEP1).
- Patch 15: changelog, close-out, follow-on stub (WP-DOC-C1).

Reporting: each patch reports against its WP id. Because the deliverable is
documentation, the evidence for a patch is the reviewable doc diff plus the
ASCII / link gate output, not test runs.

## Follow-on plans

This plan ships documentation only. Three separate plans pick up after it, in
order. WP-DOC-C1 stubs all three under `docs/active_plans/`.

### Follow-on 1: content/scene-YAML migration

- Input: the ratified `OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`,
  `SCENE_VOCABULARY.md`, `SCENE_YAML_FORMAT.md`.
- Targets: the current `src/scenes/*.yaml` files plus
  `content/plate_drug_treatment/scene.yaml`. Migrate each into an object-def
  set plus a cleaned scene-placement file.
- First decision the follow-on plan must make: **content/ folder layout**.
  Object, scene, and protocol YAML files now live side-by-side in
  `src/scenes/` and `content/`. The migration must split them into separate
  subdirectories (proposed: `content/objects/`, `content/scenes/`,
  `content/protocols/`) so the three vocabularies have a one-to-one mapping
  to folders. The exact tree (per-protocol subfolders, shared object
  library, naming conventions) is a follow-on-plan design decision; this
  plan flags it as a required up-front task, not as decided.
- Scope: YAML rewrites, new object YAML files, and the content/ folder
  reshape. No TypeScript.

### Follow-on 2: TypeScript migration

- Depends on: follow-on 1 -- the YAML must match the new format first.
- Targets: `src/asset_specs.ts` (folded into object YAML), `src/layout_engine.ts`,
  `src/scene_runtime/` (loader, contract, adapter registry), the build script
  in `tools/build_scene_data.py`, and any walker / dispatch code that reads
  the old item shape.
- Scope: implement the runtime that the YAML now expects.

### Follow-on 3: docs/ folder organization

A separate light-organization plan, not mixed into the vocabulary rewrite or
the YAML / TypeScript migrations.

Goal: make `docs/` easier to navigate while preserving stable repo-anchor
files that agents and scripts may already reference.

Target structure:

```
docs/
  CHANGELOG.md
  ROADMAP.md
  TODO.md
  PRIMARY_CONTRACT.md
  PRIMARY_DESIGN.md
  PRIMARY_SPEC.md
  REPO_STYLE.md
  architecture/
  specs/
  protocols/
  active_plans/
  archive/
  images/
  superpowers/
```

Keep at root (repo-anchor docs; may be referenced by `AGENTS.md`, scripts,
plans, or agent instructions; moving them risks breaking workflows):

- `CHANGELOG.md`
- `ROADMAP.md`
- `TODO.md`
- `PRIMARY_CONTRACT.md`
- `PRIMARY_DESIGN.md`
- `PRIMARY_SPEC.md`
- `REPO_STYLE.md`

Move into `docs/specs/`:

- `PROTOCOL_VOCABULARY.md`
- `SCENE_VOCABULARY.md`
- `OBJECT_VOCABULARY.md`
- `PROTOCOL_YAML_FORMAT.md`
- `SCENE_YAML_FORMAT.md`
- `OBJECT_YAML_FORMAT.md`
- `PROTOCOL_AUTHORING_GUIDE.md`
- `PROTOCOL_STEPS.md`
- `WALKTHROUGH_GUIDE.md`

Move into `docs/protocols/`:

- `OVCAR8_Carboplatin_Metformin_MTT_Protocol.md`
- `OVCAR8_MATH_REVIEW.md`
- `Miraculin_Protocol_2026.md`
- `SDS-PAGE_Protocol_2026.md`
- `VOSS_DILUTIONS_GUIDE.md`

Move into `docs/architecture/`:

- `CODE_ARCHITECTURE.md`
- `FILE_STRUCTURE.md`
- `TARGET_FILE_STRUCTURE.md`
- `SCENE_ARCHITECTURE.md`
- `LAYOUT_ENGINE.md`
- `LIQUID_CONVENTION.md`
- `SVG_PIPELINE.md`
- `SCALING_MODEL.md`
- `THIRD_PARTY_ASSETS.md`

Style and test docs (`MARKDOWN_STYLE.md`, `PYTHON_STYLE.md`,
`TYPESCRIPT_STYLE.md`, `PYTEST_STYLE.md`, `E2E_TESTS.md`,
`PLAYWRIGHT_USAGE.md`, `INSTALL.md`, `USAGE.md`, `AUTHORS.md`): may stay at
root for now or move later. Do not over-organize in the first pass.

`QTI_v3_SPEC.md` should not remain as a large root-level doc; the
docs-organization plan picks the destination (likely `docs/specs/` or
`docs/archive/`).

Plan rules for the docs-organization plan:

- Separate plan; not mixed into the vocabulary rewrite or the YAML / TS
  migrations.
- First inventory all doc-to-doc links and every `AGENTS.md` reference (and
  any script or plan reference) that would be affected.
- Move files in one controlled patch using `git mv`.
- Update every relative link in the same patch.
- Run ASCII and markdown-link checks on the result.
- Keep root-level repo-anchor docs stable unless there is a strong reason to
  move them.

This plan stays scoped to vocabulary; the docs-organization plan ships after
it. WP-DOC-C1 stubs the plan; it does not move any file.

## Resolved decisions

These four decisions were settled by the user during plan review and are
binding on the design work. WP-OBJ1, WP-SCN1, WP-BND1, and WP-PROTO1 encode
each rule directly; the design doc cites this section and does not relitigate.

- RD-1: **Background images are pure backdrops.** A scene background is a
  static backdrop declared in scene YAML. A clickable region (a sink, a
  benchtop edge, a tool drop zone) is an object placed over the background,
  never a property of the background. Owner: WS-SCN.
- RD-2: **Instance overrides are tightly bounded.** A scene placement may
  override an object's `label` and its layout hints only. A scene placement
  may not override object identity, `state_fields`, `render_map`, or
  `capabilities`. Owner: WS-BND. WP-BND1 encodes the rule and the per-key
  table reflects it.
- RD-3: **`ColorChange` lives in the object/render layer, with `SvgSwap`.**
  The object owns the state-to-visual map, and color is part of that map.
  The protocol sets semantic state (via `ObjectStateChange`); the object
  resolves which color is shown. The single exception: a future protocol
  primitive may set color directly when the color itself is the learning
  target (for example a colorimetric reading), but that is its own primitive,
  not generic `ColorChange`. Owner: WS-PROTO. WP-PROTO1 encodes this in the
  re-partition table.
- RD-4: **Subparts belong to the object.** Wells in a plate, lanes in a gel,
  slots in a rack, and similar internal structure are declared by the object,
  not by the scene. The scene places the object as a whole; subpart identity
  is part of object structure (`structure.subparts`). The unified-vocabulary
  plan's earlier scene-YAML placement of subpart structure is superseded by
  this plan. (Note: the named-groups portion of the original RD-4 is
  superseded by RD-9, which drops `target_groups` from the initial
  vocabulary.) Owner: WS-OBJ. WP-OBJ1 encodes subparts; WP-BND1 places
  subpart structure on the object side of the boundary table; WP-DOC-DEP1
  reconciles `PROTOCOL_AUTHORING_GUIDE.md` and `SCENE_VOCABULARY.md`
  accordingly.

- RD-5: **No fixed asset / scene counts in plan prose or canonical docs.**
  Counts belong in the inventory artifact, not the plan or docs. Replace
  "31 / every entry" wording with "every current `src/asset_specs.ts`
  entry" (and similar for scenes). Counts in
  `docs/active_plans/scene_object_split_inventory.md` remain authoritative
  as a snapshot. Owner: WS-DOC-DEP / WS-DOC-C; sweep applies to the plan,
  OBJECT_VOCABULARY.md, OBJECT_YAML_FORMAT.md, SCENE_VOCABULARY.md,
  SCENE_YAML_FORMAT.md, PROTOCOL_VOCABULARY.md.
- RD-6: **`capabilities` is a closed list.** No open-ended capability
  objects. Initial closed set: `clickable`, `liquid_container`,
  `instrument_with_setpoint`, `structured_surface`, `cursor_attachable`,
  `decoration_only`. `decoration_only` mutually exclusive with the others.
  Adding a capability value requires an explicit vocabulary edit. Owner:
  WS-OBJ; encoded in OBJECT_VOCABULARY.md and OBJECT_YAML_FORMAT.md.
- RD-7: **`render_map` formula mini-language is a small closed token set,
  defined in M4.** No prose formulas. Closed set lives in
  OBJECT_YAML_FORMAT.md (already drafted by WP-DOC-OY1). Unknown tokens =
  build error. Owner: WS-DOC-OY.
- RD-8: **`ObjectStateChange` only sets declared `state_fields`.** No
  arbitrary nested writes. Target a named state field; provide a value
  matching the field's declared primitive type. Validator rejects unknown
  fields and type-mismatched values. Owner: WS-PROTO; encoded in
  PROTOCOL_VOCABULARY.md and OBJECT_VOCABULARY.md.
- RD-9: **Drop `target_groups` from initial object vocabulary.** Protocols
  list explicit subparts (`treatment_plate.A1`, `treatment_plate.A2`, ...).
  Named groups deferred until real authoring pain appears, then revisited
  as a separate vocabulary addition. Supersedes the named-groups portion of
  RD-4; RD-4's "subparts belong to the object, not the scene" rule still
  holds. Owner: WS-OBJ; sweep OBJECT_VOCABULARY.md, OBJECT_YAML_FORMAT.md,
  SCENE_VOCABULARY.md to remove `target_groups` and named-group references.
- RD-10: **`LayoutMove` stays narrow.** Move an existing placement only;
  do not rewrite layout. Scope includes (a) row-to-row reposition handled
  by layout engine for the current scene, and (b) cross-scene transitions:
  remove placement from one scene, add to another (e.g., pipette moves
  from hood to bench; protocol with two bench areas). Layout engine owns
  the visible motion; `LayoutMove` names what moves and where. Owner:
  WS-PROTO; encoded in PROTOCOL_VOCABULARY.md and LAYOUT_ENGINE.md
  (touched by WP-DOC-DEP1).
- RD-11: **State-field types are flat primitives only.** Allowed types:
  `enum`, `int`, `float`, `bool`. No `string` (use `enum` with a closed
  `allowed` list). No structured `liquid` or `set_point` composite types.
  Model liquid and set-point state as multiple flat fields per object.
  Supersedes the structured `type: liquid` / `type: set_point` shapes
  drafted in OBJECT_VOCABULARY.md and OBJECT_YAML_FORMAT.md. Worked
  rewrites:
  - Well: `liquid_id` (enum), `liquid_volume` (float, unit=ul),
    `liquid_color` (enum).
  - Pipette: `set_volume` (float, unit=ml, min=0.1, max=25), and a
    separate `held_liquid_id` + `held_liquid_volume` if it carries liquid.
  Owner: WS-OBJ; sweep OBJECT_VOCABULARY.md, OBJECT_YAML_FORMAT.md,
  PROTOCOL_VOCABULARY.md (`ObjectStateChange` examples), and
  LIQUID_CONVENTION.md (touched by WP-DOC-DEP1).
- RD-12: **Per-type constraint metadata is closed.** No open-ended
  `constraints:` object. Allowed metadata keys per primitive type:
  - `enum`: `allowed`, `default`.
  - `int` / `float`: `unit`, `min`, `max`, `step`, `default`.
  - `bool`: `default`.
  Unknown metadata keys = build error. Owner: WS-DOC-OY; encoded in
  OBJECT_YAML_FORMAT.md.
- RD-13: **`LiquidDisplayChange` is reclassified to the object/render
  layer alongside `SvgSwap` and `ColorChange`.** Rationale (user,
  verbatim): "LiquidDisplayChange is the same kind of drift as SvgSwap
  and ColorChange: it names the display result instead of the semantic
  state change. Protocol uses ObjectStateChange to set flat declared
  liquid fields. The object render_map decides how liquid appears."
  `ObjectStateChange` is the sole protocol primitive for liquid state
  mutation; it writes the flat declared fields (`liquid_id`,
  `liquid_volume`, `liquid_color` for vessels and wells; corresponding
  `held_liquid_id` / `held_liquid_volume` for tools). The object's
  `render_map` resolves those fields to a fill height, tint, and asset.
  Consistent with RD-3 (render-layer mechanisms named by `render_map`),
  RD-8 (`ObjectStateChange` writes only declared `state_fields`), and
  RD-11 (state-field types are flat primitives only). Prevents two
  competing liquid paths in canonical docs. The WP-PROTO1 acceptance
  criteria and the re-partition table now place `LiquidDisplayChange`
  on the render-layer side alongside `SvgSwap` and `ColorChange`, with
  `ObjectStateChange` as its protocol-level superseder. Owner: WS-PROTO;
  sweep applies to PROTOCOL_VOCABULARY.md, PROTOCOL_AUTHORING_GUIDE.md,
  PROTOCOL_YAML_FORMAT.md, and the design-doc re-partition table.
- RD-14: **`SetPointDisplayChange` is reclassified to the object/render
  layer alongside `SvgSwap`, `ColorChange`, and `LiquidDisplayChange`
  (ratified 2026-05-15).** Rationale (user, verbatim): "Resolve as RD-14
  with option 1. Reclassify SetPointDisplayChange to the object/render
  layer. Keep ObjectStateChange as the protocol path for set-point
  state. This makes RD-13 consistent: display changes belong to object
  rendering; protocol changes declared state." `ObjectStateChange`
  writing the object's flat declared set-point fields (per RD-11:
  `set_volume`, `set_temperature`, `set_rpm`, etc. as flat numeric
  fields) is the sole protocol primitive for set-point state mutation;
  the object's `render_map` resolves the digit overlay or display
  visual. Consistent with RD-3, RD-8, RD-11, and RD-13. Brings the
  ratified protocol-level primitive count down from six (post RD-13) to
  five (`ObjectStateChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, `TimedWait`). The WP-PROTO1 acceptance criteria and the
  re-partition table now place `SetPointDisplayChange` on the
  render-layer side alongside `SvgSwap`, `ColorChange`, and
  `LiquidDisplayChange`, with `ObjectStateChange` as its protocol-level
  superseder. Owner: WS-PROTO; sweep applies to PROTOCOL_VOCABULARY.md,
  PROTOCOL_AUTHORING_GUIDE.md, PROTOCOL_YAML_FORMAT.md, PRIMARY_SPEC.md,
  SCENE_YAML_FORMAT.md, SPEC_DESIGN_CHECKLIST.md, and the design-doc
  re-partition table.

- RD-15: **Semantic-state-vs-appearance rule (ratified 2026-05-15).**
  Rationale (user, verbatim): "Does this primitive change semantic
  simulation state, or does it merely describe how that state appears?
  If it merely describes appearance, move it to object/render." Every
  protocol-level primitive must change semantic simulation state, not
  describe appearance. The test: does this primitive change what the
  simulation IS, or merely how it LOOKS? If it describes appearance, it
  belongs in the object/render layer. This is the generalized rule
  behind RD-3 (`ColorChange`), RD-13 (`LiquidDisplayChange`), and RD-14
  (`SetPointDisplayChange`); each named a display result instead of a
  state change and was reclassified to the object/render layer.
  Applies preemptively to every future primitive proposal: a primitive
  whose name describes a visual outcome (Display, Show, Render, Color,
  Swap, Animate, Move-pixels, Highlight) is a smell, not a primitive.
  Owner: WS-PROTO. Sweep: PROTOCOL_VOCABULARY.md primitive-table reason
  column sharpened to state semantic effect explicitly;
  SPEC_DESIGN_CHECKLIST.md gets a top-level smell class capturing the
  rule with the past-pitfalls (`SvgSwap`, `ColorChange`,
  `LiquidDisplayChange`, `SetPointDisplayChange`) named.
- RD-16: **`CursorAttach` is the held-material state primitive
  (ratified 2026-05-15).** `CursorAttach` is protocol-level only when
  it means "the learner is now holding this object instance" -- a
  semantic state change to the runtime's held-material state. It must
  not be read as "draw the object under the cursor" or as a cursor-
  follow visual; that is a render-layer concern owned by the scene /
  object-render side. Operations are limited to `attach` (set held
  material to this target) and `detach` (clear held material). The
  scene renders the cursor-follow visual in response to the state
  change; the protocol does not name the visual. Consistent with RD-15
  (semantic-state-vs-appearance). Owner: WS-PROTO; sweep applies to
  PROTOCOL_VOCABULARY.md primitive-table reason column.
- RD-17: **`TimedWait` is the protocol-time-advance primitive
  (ratified 2026-05-15).** `TimedWait` is protocol-level only when it
  means "protocol time advances on this equipment" or "the timed
  condition on this equipment is satisfied" -- a semantic change to
  the runtime's equipment-state (the equipment's timed phase has
  started, then elapsed). It must not be read as "show a spinner",
  "render a progress bar", or any other visual progress display; the
  visible progress display is owned by the object's `render_map` over
  the equipment's declared timed-phase `state_fields`. The protocol
  names what equipment, for how long, and what the timed condition is;
  the object/render layer handles the display. Consistent with RD-15
  (semantic-state-vs-appearance). The current `TimedWait` field
  `display` is an authoring hint to the object render layer about
  which display style is appropriate, not a protocol-side appearance
  knob; it does not name visual assets. Owner: WS-PROTO; sweep applies
  to PROTOCOL_VOCABULARY.md primitive-table reason column.

Per-primitive verdict (RD-15 sweep over the five ratified primitives):

- `ObjectStateChange`: already correctly defined as semantic. RD-8
  constrains it to declared `state_fields`. No new RD needed.
- `CursorAttach`: required sharpening; settled by RD-16.
- `SceneChange`: already correctly defined as semantic (a scene
  transition is the scene-id state change by definition). No new RD
  needed.
- `LayoutMove`: already settled by RD-10 (placement-only; layout
  engine owns visible motion). RD-15 sharpening encoded in the
  PROTOCOL_VOCABULARY.md reason column (must not encode animation,
  pixel offsets, layout rules, visual motion); no new RD needed.
- `TimedWait`: required sharpening; settled by RD-17.

## Open questions and decisions needed

- None open at plan-publication time. RD-1 through RD-17 settle the
  decisions raised during plan review. Any new question that surfaces
  lands here with an owner and a resolve-by milestone.
