# Plan: Spec-vs-content drift remediation and gate hardening

## Context

A spec-vs-content drift audit (this session, 48 findings; 5 BLOCKERs verified live)
showed that the recent SDS-PAGE content expansion drifted from the canonical specs
in `docs/specs/`. The three validators (`validate_content_yaml.py`,
`protocol_stepper.py`, `protocol_manual.py`) reported zero failures while real
violations were present: protocol writes mL-magnitude floats into a microliter-unit
field, a `p10_micropipette` is asked to set `set_volume: 30` when its declared
`max` is `10`, a per-protocol scene override collides on `scene_name` with the
base it extends, and a `sequence_runner` uses a top-level key (`mini_protocols:`)
that no spec doc enumerates. Six SDS equipment objects declare operational bool
state fields with no `visual_states` entry, and per-protocol `materials.yaml`
files carry diverging labels and `display_color` hex codes for shared reagents.

The validators did not catch any of this. Each gap is an authoring trap that will
recur on the next content expansion (Miraculin, follow-up curriculum) unless the
gate set is extended. The recent renderer fix that auto-promoted sub-mL numeric
values to microliters was a symptom patch (REPO_STYLE: "fix the design, not the
symptom") and masked the data error rather than surfacing it.

This plan fixes the verified drift and hardens the gate set so the same drift
classes fail loud at validate-time on the next attempt.

## Objectives

- Fix the five verified BLOCKER drift findings without breaking existing passing
  protocols.
- Reconcile the three HIGH systemic findings (`visual_states` completeness,
  cross-protocol material divergence, `kind`-vs-material-field convention split).
- Add seven validator gates that would have caught each fixed finding at
  validate-time.
- Revert the `protocol_manual.py` sub-mL volume auto-promotion that was masking
  the unit-magnitude bug.
- Ratify the `sequence_runner` top-level shape in `PROTOCOL_YAML_FORMAT.md` so
  the schema closure rule (`SPEC_DESIGN_CHECKLIST.md`) holds.

## Design philosophy

This plan leans on "fix the design, not the symptom" (`docs/REPO_STYLE.md`). The
renderer's sub-mL auto-promotion is the canonical wrong-layer fix; reverting it
forces the validator to be the authority on unit and magnitude. The rejected
alternative was a content-only sweep that left the validators unchanged: that
would fix today's data but guarantees the same drift on the next protocol,
because the gates that should have caught it are still absent. Validator
extensions are sequenced before the bulk content fixes so each content patch
lands under the gate that protects it. The plan does not introduce a global
material registry on this pass; instead it adds a cross-protocol consistency
gate that forces label and color agreement wherever the same `material_name`
appears, leaving the architecture question for a follow-up plan.

## Scope

- Edit `docs/specs/PROTOCOL_YAML_FORMAT.md` to ratify the `sequence_runner`
  shape (`mini_protocols:` list + `entry_step` semantics for runners).
- Edit `docs/specs/OBJECT_YAML_FORMAT.md` to pin the `kind`-to-material-field
  convention (which `kind` values use `material_name` vs `held_material_name`).
- Extend `validation/yaml/validate.py` with seven gates (see Workstream
  WS-V).
- Fix the five BLOCKER content findings in `content/` (B1, B2, B3, B5; B4 is a
  spec ratification, not a content edit).
- Sweep `visual_states` completeness across the six SDS equipment objects.
- Reconcile cross-protocol `materials.yaml` divergence for `ddh2o`,
  `coomassie_stain`, `coomassie_stain_used`, `destain_used`, and any other
  duplicates surfaced by the cross-protocol gate.
- Revert the renderer sub-mL auto-promotion in `validation/manual/validate.py`.
- Re-render every manual and re-step every protocol after each milestone exit.

## Non-goals

- Build a global cross-protocol material registry (architecture change; deferred
  to a follow-up plan).
- Introduce a unit-annotation system on protocol `ObjectStateChange` values
  (deferred; out of scope for this gate-hardening pass).
- Add a TypeScript runtime, browser walker, or any visible UI evidence layer
  (PRIMARY_CONTRACT item 4 remains forward-looking).
- Re-author the SDS-PAGE protocol or any other content beyond the surgical
  fixes named above.
- Mass-rename `held_material_name` to `material_name` (or vice versa) across
  the repo: the convention pin (M0) determines the rule, but enum sweeps and
  protocol fixes happen only where the gate flags them.
- Reorganize `docs/specs/` or rename any spec file.
- Touch `protocol_stepper.py` semantics beyond the validator handoff.

## Current state summary

- `validate_content_yaml.py` enforces the closed object schema, the closed
  protocol vocabulary, and reference resolution, but does not enforce
  numeric-field min/max on `ObjectStateChange` values, `visual_states`
  completeness, subpart-target consistency, scene self-extension, cross-protocol
  material consistency, the `sequence_runner` top-level shape, or the
  `kind`-to-material-field convention.
- `protocol_stepper.py` reaches a terminal step on all 31 protocols; it does not
  validate value magnitude or unit.
- `protocol_manual.py` renders all 31 manuals; it carries a sub-mL volume
  auto-promotion added last session to mask the B1 unit bug.
- `docs/specs/PROTOCOL_YAML_FORMAT.md` does not name `mini_protocols:`.
- `docs/specs/OBJECT_YAML_FORMAT.md` does not pin which `kind` values use
  `material_name` vs `held_material_name`; current content is split
  (all `kind: bottle` use `held_material_name`; `kind: flask` and `kind: waste`
  use `material_name`).
- Drift audit transcript captures all 48 findings; the live-verified BLOCKERs
  are B1, B2, B3, B4, B5.

## Architecture boundaries and ownership

- Spec docs under `docs/specs/` -- single owner per file, edits coordinated to
  avoid step-on conflicts.
- Validator extensions in `validation/yaml/validate.py` -- one shared module;
  each gate is a self-contained check function added behind a single dispatch
  loop. Each gate ships its own targeted test fixture.
- Content edits in `content/objects/`, `content/protocols/`, `content/scenes/`
  -- partitioned by file family; no two work packages edit the same file.
- Renderer revert in `validation/manual/validate.py` -- one work package, isolated
  to the volume-formatting helper.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M0 / WS-S | `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/OBJECT_YAML_FORMAT.md` | 2 |
| M1 / WS-V | `validation/yaml/validate.py` + `tests/test_validate_content_yaml.py` | 7 |
| M2 / WS-C | `content/protocols/sdspage_*/protocol.yaml`, `content/protocols/sdspage_load_sample_single_lane/scenes/`, `content/objects/pipette/` | 4 |
| M2 / WS-R | `validation/manual/validate.py` (sub-mL revert) | 1 |
| M3 / WS-O | `content/objects/equipment/*.yaml` (6 objects) | 6 |
| M4 / WS-M | per-protocol `content/protocols/sdspage_*/materials.yaml`; `content/objects/bottle/*.yaml`, `content/objects/flask/*.yaml`, `content/objects/waste/*.yaml` | 3 |
| M5 / WS-F | full-repo verification + `docs/CHANGELOG.md` close-out | 1 |

## Milestone plan

### Milestone M0: Spec ratification

- Depends on: none. M0 is the schema authority; M1 validators code against the
  M0 spec text.
- Workstreams: WS-S (spec docs).
- Entry criteria: drift audit findings frozen in this plan body.
- Exit criteria:
  - `PROTOCOL_YAML_FORMAT.md` documents `sequence_runner` top-level shape
    (`mini_protocols:` list-of-protocol-name, `entry_step` semantics, absence
    of `steps:`).
  - `OBJECT_YAML_FORMAT.md` pins the material-field convention table by `kind`.
  - `SPEC_DESIGN_CHECKLIST.md` flags both new closures as ratified.
  - `docs/CHANGELOG.md` entry naming the two spec edits.
- Parallel-plan ready: no. Two spec edits owned by one doer to avoid
  cross-doc terminology drift; both files land in one patch each, in order.

### Milestone M1: Validator extensions

- Depends on: M0 -- gates V1 (`sequence_runner` shape) and V7 (kind-to-field
  convention) need the ratified spec text. Gates V2-V6 do not depend on M0
  but are kept in M1 so the gate set lands as one coherent extension.
- Workstreams: WS-V (validator code + fixtures).
- Entry criteria: M0 exit met.
- Exit criteria:
  - Seven new gates (V1-V7 in Work packages) present in
    `validation/yaml/validate.py`.
  - Each gate has a focused pytest fixture that fails when the gate is removed.
  - `pytest tests/test_validate_content_yaml.py` passes.
  - Full-repo validator run on unchanged `content/` reports the **existing**
    drift findings as failures (B1, B2, B3, B5, H1 instances). This is the
    pre-fix baseline: the validator now sees the drift.
  - `docs/CHANGELOG.md` entry naming the seven gates and the new
    failure-baseline.
- Parallel-plan ready: yes. Max parallel doers: 7 (one per gate). Each gate
  is an independent function + fixture; the dispatch loop edit is small enough
  to merge after the gates land.

### Milestone M2: Content data fixes + renderer revert

- Depends on: M1 -- the new gates must already flag each fix, so the doer can
  rely on the gate going from red to green as the acceptance signal.
- Workstreams: WS-C (content fixes), WS-R (renderer revert).
- Entry criteria: M1 exit met; new validator baseline shows expected failures.
- Exit criteria:
  - B1 fixed: `sdspage_prepare_sample_mix_single_lane` `held_material_volume`
    values corrected (`0.021 -> 21`, `0.0285 -> 28.5`, `0.03 -> 30`); gate V3
    (numeric min/max) green.
  - B2 fixed: `sdspage_load_protein_ladder` and `sdspage_load_sample_single_lane`
    no longer set p10 above its `max: 10`. Resolution chosen by Open question
    OQ-1 (raise p10 max, swap in p200, or split into two pipettes); gate V3
    green.
  - B3 fixed: per-protocol scene override `scene_name` differs from
    `extends:` base name; gate V4 (scene self-extension) green.
  - B5 fixed: subpart-state writes target dotted subpart
    (`gel_cassette.lane_N`); gate V5 (subpart-target consistency) green.
  - WS-R: renderer sub-mL auto-promotion reverted; manuals re-render and show
    canonical microliter values (no `0.0285 uL` artifact, no `28.5 mL`
    artifact).
  - All 31 protocols still pass `protocol_stepper.py`; all 31 manuals still
    render.
  - `docs/CHANGELOG.md` entry naming the four content fixes, the renderer
    revert, and the decision recorded for OQ-1.
- Parallel-plan ready: yes. Max parallel doers: 5 (4 content fixes + 1
  renderer revert). Each touches disjoint files.

### Milestone M3: visual_states completeness sweep

- Depends on: M1 -- gate V2 (`visual_states` completeness) must already flag
  the missing entries.
- Workstreams: WS-O (object YAML edits).
- Entry criteria: M1 exit met; V2 baseline shows the 6 objects failing.
- Exit criteria:
  - Each of `gel_cassette`, `heat_block`, `microwave`, `rocking_shaker`,
    `lightbox`, `power_supply` has a `visual_states` entry for every declared
    `state_field`; entries with no render path use the explicit empty
    `composite` form per `OBJECT_YAML_FORMAT.md`.
  - `gel_comb` empty `visual_states: {}` resolved (either fill or drop the
    unused `state_field`).
  - V2 gate green on the full repo.
  - All protocols re-step clean; all manuals re-render clean.
  - `docs/CHANGELOG.md` entry naming the seven objects touched.
- Parallel-plan ready: yes. Max parallel doers: 7 (one per object file).

### Milestone M4: Material convention reconciliation

- Depends on: M1 -- gate V6 (cross-protocol material consistency) and V7
  (`kind`-to-field convention) must already flag the divergences.
- Workstreams: WS-M (materials + field-naming sweep).
- Entry criteria: M1 exit met; V6 + V7 baselines show the divergences.
- Exit criteria:
  - Every cross-protocol `material_name` that appears in 2+ per-protocol
    `materials.yaml` files has the same `label` and `display_color` in all
    appearances. The canonical label and color are chosen by the doer per
    convention rule established in M0 spec text; choice recorded inline as
    a one-line note in the M4 CHANGELOG entry.
  - Object material-field naming matches the M0 convention pin: every object
    of each `kind` uses the declared field name (no mixed
    `held_material_name`/`material_name` within a `kind`).
  - V6 + V7 gates green on the full repo.
  - All protocols re-step clean; all manuals re-render clean.
  - `docs/CHANGELOG.md` entry naming the reconciled materials and the field
    sweep scope.
- Parallel-plan ready: yes. Max parallel doers: 2 (one materials reconciliation
  lane, one field-naming sweep lane). The two lanes touch disjoint files.

### Milestone M5: Verify + closeout

- Depends on: M2, M3, M4 -- all green required.
- Workstreams: WS-F (final verification + docs).
- Entry criteria: M2, M3, M4 exits met.
- Exit criteria:
  - Full-repo `validate_content_yaml.py` reports zero failures.
  - `protocol_stepper.py` PASS on all 31 protocols.
  - `protocol_manual.py --all` renders all 31 manuals; spot-check confirms
    no `0.0285 uL` or `material name is now` leakage in any manual.
  - `docs/CHANGELOG.md` closing entry summarizes the drift remediation, lists
    the 7 new gates by ID, names the BLOCKERs closed and the HIGHs reconciled.
  - This plan file moves from `docs/active_plans/` to `docs/archive/`.
- Parallel-plan ready: no. Single-doer verification.

## Workstream breakdown

### Workstream WS-S: Spec ratification

- Owner: planner
- Interfaces:
  - Needs: drift audit findings (this plan body).
  - Provides: ratified spec text that M1 validators code against.
- Expected patches: 2 (one per spec file).

### Workstream WS-V: Validator extensions

- Owner: coder
- Interfaces:
  - Needs: M0 spec text for V1 + V7.
  - Provides: validator failures that M2, M3, M4 doers use as red-to-green
    acceptance signals.
- Expected patches: 7 (one per gate).

### Workstream WS-C: Content data fixes

- Owner: coder
- Interfaces:
  - Needs: M1 validator baseline showing the failures.
  - Provides: green V3, V4, V5 gates on edited files.
- Expected patches: 4 (one per BLOCKER fix).

### Workstream WS-R: Renderer revert

- Owner: coder
- Interfaces:
  - Needs: B1 content fix landing (so the revert does not regress visible
    output during the same patch).
  - Provides: clean manual output with canonical units.
- Expected patches: 1.

### Workstream WS-O: visual_states sweep

- Owner: coder (or two coders splitting the 7 objects)
- Interfaces:
  - Needs: M1 V2 baseline.
  - Provides: green V2 gate.
- Expected patches: 6 (or 7 if `gel_comb` resolution is a separate patch).

### Workstream WS-M: Material convention

- Owner: coder (or two coders splitting reconciliation vs field-naming sweep)
- Interfaces:
  - Needs: M0 convention pin, M1 V6 + V7 baseline.
  - Provides: green V6 + V7 gates.
- Expected patches: 3 (cross-protocol dedup, kind=bottle convention application,
  kind=flask/waste convention application).

### Workstream WS-F: Final verification

- Owner: planner / reviewer
- Interfaces:
  - Needs: M2, M3, M4 exits.
  - Provides: closing CHANGELOG entry + archive move.
- Expected patches: 1.

## Work packages

### Work package WP-S1: Ratify sequence_runner shape in PROTOCOL_YAML_FORMAT

- Owner: planner
- Touch points: `docs/specs/PROTOCOL_YAML_FORMAT.md`
- Depends on: none
- Acceptance criteria:
  - Doc names `mini_protocols:` as the `sequence_runner` top-level list key,
    typed as ordered list of `protocol_name` strings.
  - Doc clarifies that `sequence_runner` has no `steps:` and that `entry_step`
    matches the first listed mini-protocol's `entry_step`.
  - Doc declares `steps`-list cross-validation rule does not apply to
    `sequence_runner`.
- Verification commands:
  - Read the diff; confirm one section added and the existing fields-table
    edited.
- Obvious follow-ons:
  - Append a one-line cross-reference from `PROTOCOL_VOCABULARY.md` so the
    vocabulary list points at the new schema table.
  - Add the change to `docs/CHANGELOG.md` under the M0 entry.

### Work package WP-S2: Pin kind-to-material-field convention in OBJECT_YAML_FORMAT

- Owner: planner
- Touch points: `docs/specs/OBJECT_YAML_FORMAT.md`
- Depends on: none
- Acceptance criteria:
  - Doc adds a small table mapping each `kind` enum value to either
    `material_name` (vessels) or `held_material_name` (tools/carriers).
  - The table covers at minimum: `pipette`, `bottle`, `flask`, `waste`,
    `equipment`, `decoration`, `rack`.
  - The table picks one rule per `kind` (no "either is allowed").
- Verification commands:
  - Read the diff; confirm the table is present and every `kind` value
    currently in use is listed.
- Obvious follow-ons:
  - Cross-reference from `MATERIAL_CONVENTION.md`.
  - Add the change to `docs/CHANGELOG.md` under the M0 entry.

### Work package WP-V1: Gate `sequence_runner` shape

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: WP-S1
- Acceptance criteria:
  - When `protocol_type: sequence_runner`, validator requires `mini_protocols:`
    (list of strings), each name resolves to a `content/protocols/<name>/`
    directory, and `steps:` is absent.
  - When `protocol_type: mini_protocol`, validator requires `steps:` and
    rejects `mini_protocols:`.
  - Fixture proves both branches fail loud.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v1`
- Obvious follow-ons:
  - Run the gate against `content/protocols/sdspage_full/` and confirm green.

### Work package WP-V2: Gate `visual_states` completeness

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: none
- Acceptance criteria:
  - For every declared `state_field`, validator requires a matching key under
    `visual_states`.
  - A field with no render path may declare an empty `kind: composite` entry;
    a missing entry fails.
  - Fixture proves missing entry fails; empty composite passes.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v2`
- Obvious follow-ons:
  - Run the gate against `content/objects/` and record the failing object
    count (expected ~6) as the M3 baseline.

### Work package WP-V3: Gate `ObjectStateChange` numeric min/max

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: none
- Acceptance criteria:
  - When `ObjectStateChange.state` writes a numeric field, validator looks up
    the target object's declared `state_field` and checks the value satisfies
    `min`, `max`, and `step` (if present).
  - Fixture proves a value above `max` fails; a value at `max` passes;
    `step` violations fail.
  - Validator emits the field name, declared `unit`, declared `max`, and the
    offending value in the failure message.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v3`
- Obvious follow-ons:
  - Run the gate against `content/protocols/`; expect B1 + B2 to fail.

### Work package WP-V4: Gate scene self-extension

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: none
- Acceptance criteria:
  - When a scene override declares `extends:`, validator requires
    `scene_name != extends` value.
  - Fixture proves matching values fail.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v4`
- Obvious follow-ons:
  - Run the gate against `content/protocols/sdspage_load_sample_single_lane/scenes/`
    and confirm it fires.

### Work package WP-V5: Gate subpart-target consistency on `ObjectStateChange`

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: none
- Acceptance criteria:
  - When `ObjectStateChange` writes a field declared with
    `applies_to: subpart` (or the equivalent declaration; doer to confirm
    against the current `OBJECT_YAML_FORMAT.md` schema), validator requires
    the target to be a dotted subpart reference (`object.subpart`), not the
    bare object name.
  - Fixture proves bare-object target fails when the field is subpart-scoped.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v5`
- Obvious follow-ons:
  - Run the gate against `content/protocols/sdspage_load_sample_single_lane/`
    and confirm B5 fires.

### Work package WP-V6: Gate cross-protocol material consistency

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: none
- Acceptance criteria:
  - Validator collects every `material_name` declared in any
    `content/protocols/*/materials.yaml`.
  - When the same `material_name` appears in 2+ files, validator requires
    identical `label` and identical `display_color` across all occurrences.
  - Fixture proves divergent label fails and divergent color fails.
  - Failure message names every diverging file.
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v6`
- Obvious follow-ons:
  - Run the gate against the full repo and record the divergence set as the
    M4 baseline.

### Work package WP-V7: Gate `kind`-to-material-field convention

- Owner: coder
- Touch points: `validation/yaml/validate.py`,
  `tests/test_validate_content_yaml.py`
- Depends on: WP-S2
- Acceptance criteria:
  - For each object, validator looks up the declared `kind`, then enforces
    that the material field name (`material_name` vs `held_material_name`)
    matches the M0 convention table.
  - Fixture proves a `kind: bottle` using `material_name` fails (or whatever
    rule M0 declares).
- Verification commands:
  - `source source_me.sh && pytest tests/test_validate_content_yaml.py -k v7`
- Obvious follow-ons:
  - Run the gate against `content/objects/` and record the failing object
    count as the M4 field-sweep baseline.

### Work package WP-C1: Fix B1 volume magnitudes in sample-mix protocol

- Owner: coder
- Touch points:
  `content/protocols/sdspage_prepare_sample_mix_single_lane/protocol.yaml`
- Depends on: WP-V3
- Acceptance criteria:
  - Three `ObjectStateChange.state.held_material_volume` values corrected:
    `0.021 -> 21`, `0.0285 -> 28.5`, `0.03 -> 30`.
  - Prompts unchanged; existing `21 ` micro symbol `L`, `7.5 ` micro symbol `L`,
    `1.5 ` micro symbol `L` text remains the authoritative reference.
  - WP-V3 gate reports green on this file.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -p sdspage_prepare_sample_mix_single_lane`
  - `source source_me.sh && python3 validation/stepper/validate.py -p sdspage_prepare_sample_mix_single_lane`
- Obvious follow-ons:
  - Re-render the manual and confirm the bullet reads `21 uL`, not `0.021 uL`
    or `0.021 mL`.

### Work package WP-C2: Fix B2 p10 over-set in loading protocols

- Owner: coder
- Touch points:
  `content/protocols/sdspage_load_protein_ladder/protocol.yaml`,
  `content/protocols/sdspage_load_sample_single_lane/protocol.yaml`,
  `content/objects/pipette/p10_micropipette.yaml` (if OQ-1 chooses to raise
  `max`)
- Depends on: WP-V3, OQ-1 decided.
- Acceptance criteria:
  - Per OQ-1 decision: either raise the p10 `max`, or rename the object to
    a wider-range pipette (e.g., `p20_micropipette`), or add a separate
    `p200_micropipette` object and switch the targets in MP-9 / MP-10.
  - Prompts updated to match the chosen instrument.
  - WP-V3 gate reports green on both files.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -p sdspage_load_protein_ladder sdspage_load_sample_single_lane`
  - `source source_me.sh && python3 validation/stepper/validate.py -p sdspage_load_protein_ladder sdspage_load_sample_single_lane`
- Obvious follow-ons:
  - Re-render both manuals; confirm pipette name and set volume are coherent.
  - If a new pipette object lands, add the asset reference per
    `SOURCES.md` convention.

### Work package WP-C3: Fix B3 scene self-collision

- Owner: coder
- Touch points:
  `content/protocols/sdspage_load_sample_single_lane/scenes/electrophoresis_bench_override.yaml`,
  `content/protocols/sdspage_load_sample_single_lane/protocol.yaml`
- Depends on: WP-V4
- Acceptance criteria:
  - Override `scene_name` is unique (e.g.,
    `sdspage_load_sample_single_lane_workspace`).
  - Protocol `SceneChange.to_scene` updated to match.
  - WP-V4 gate reports green on this override.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -p sdspage_load_sample_single_lane`
  - `source source_me.sh && python3 validation/stepper/validate.py -p sdspage_load_sample_single_lane`
- Obvious follow-ons:
  - Audit the other 6 per-protocol scene overrides for the same pattern and
    fix any that also collide (this may move work into a small WP-C3b).

### Work package WP-C4: Fix B5 subpart-target write in load_sample_single_lane

- Owner: coder
- Touch points:
  `content/protocols/sdspage_load_sample_single_lane/protocol.yaml`
- Depends on: WP-V5
- Acceptance criteria:
  - `ObjectStateChange` in the `dispense_lane` step targets
    `gel_cassette.lane_N` (the same dotted subpart the gesture targets),
    not the bare `gel_cassette`.
  - WP-V5 gate reports green on this file.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -p sdspage_load_sample_single_lane`
- Obvious follow-ons:
  - Sweep the other lane-load and lane-state-writing steps for the same shape
    and fix any matches.

### Work package WP-R1: Revert sub-mL volume auto-promotion in protocol_manual

- Owner: coder
- Touch points: `validation/manual/validate.py`
- Depends on: WP-C1 -- the revert removes the symptom mask, so the data fix
  must already be in place to avoid regressing visible manual output.
- Acceptance criteria:
  - The volume-formatting helper renders the declared `unit` literally; values
    are not silently promoted from one unit to another.
  - No call site falls back to the promotion path.
  - `protocol_manual.py --all` succeeds.
  - Spot-check confirms no `0.0285 uL` or `28.5 mL` artifact in any rendered
    manual.
- Verification commands:
  - `source source_me.sh && python3 validation/manual/validate.py --all`
- Obvious follow-ons:
  - If the renderer test suite asserts on the promoted-output form, update or
    delete those assertions per `docs/PYTEST_STYLE.md` (do not preserve a
    fragile test that asserts on a removed symptom mask).

### Work package WP-O1..WP-O6: Fill visual_states for 6 SDS equipment objects

- Owner: coder (one work package per object)
- Touch points (one per WP):
  - WP-O1: `content/objects/equipment/gel_cassette.yaml`
  - WP-O2: `content/objects/equipment/heat_block.yaml`
  - WP-O3: `content/objects/equipment/microwave.yaml`
  - WP-O4: `content/objects/equipment/rocking_shaker.yaml`
  - WP-O5: `content/objects/equipment/lightbox.yaml`
  - WP-O6: `content/objects/equipment/power_supply.yaml`
- Depends on: WP-V2
- Acceptance criteria:
  - Every `state_field` declared on the object has a corresponding
    `visual_states` entry. Fields with no render path use the explicit
    empty `kind: composite` form.
  - WP-V2 gate green on this object file.
  - Object still passes `validate_content_yaml.py -o <name>`.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -o <object>`
- Obvious follow-ons:
  - Re-step every protocol that targets this object and confirm no regression.

### Work package WP-O7: Resolve gel_comb empty visual_states

- Owner: coder
- Touch points: `content/objects/equipment/gel_comb.yaml`
- Depends on: WP-V2
- Acceptance criteria:
  - The single `state_field` (`position`) either gets a real `visual_states`
    entry or is removed (with capabilities adjusted accordingly).
  - WP-V2 gate green.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py -o gel_comb`
- Obvious follow-ons:
  - If the field is removed, audit any protocol step that referenced it.

### Work package WP-M1: Reconcile divergent cross-protocol materials

- Owner: coder
- Touch points: per-protocol `materials.yaml` files surfaced by WP-V6 (at
  minimum: `sdspage_image_gel`, `sdspage_destain_gel_setup`,
  `sdspage_destain_gel_rock`, `sdspage_prepare_running_buffer`,
  `sdspage_stain_gel`)
- Depends on: WP-V6
- Acceptance criteria:
  - Every `material_name` that appears in 2+ files has identical `label` and
    `display_color`.
  - WP-V6 gate green on the full repo.
  - The canonical label/color picks are noted inline in the M4 CHANGELOG entry.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py`
- Obvious follow-ons:
  - Re-render the affected manuals and visually confirm display-color
    consistency.

### Work package WP-M2: Apply kind-to-field convention sweep on `kind: bottle`

- Owner: coder
- Touch points: every `content/objects/bottle/*.yaml` whose material-field name
  does not match the M0 convention.
- Depends on: WP-V7, WP-S2
- Acceptance criteria:
  - Every `kind: bottle` object uses the field name M0 declared canonical.
  - Every protocol that wrote the old field name updated to the new field name
    (use the gate to find them; do not mass-rewrite).
  - WP-V7 gate green on every `kind: bottle` object.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py`
  - `source source_me.sh && python3 validation/stepper/validate.py --all`
- Obvious follow-ons:
  - Re-step every affected protocol.

### Work package WP-M3: Apply kind-to-field convention sweep on `kind: flask`, `kind: waste`, `kind: equipment` (vessels)

- Owner: coder
- Touch points: every affected object YAML
- Depends on: WP-V7, WP-S2, WP-M2 (so the bottle sweep settles first and the
  convention is visibly working before the next kind is touched).
- Acceptance criteria:
  - Every affected object uses the M0-declared field name for its `kind`.
  - WP-V7 gate green on every affected object.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py`
- Obvious follow-ons:
  - Re-step every affected protocol.

### Work package WP-F1: Final verification + close-out

- Owner: planner / reviewer
- Touch points: full repo (read-only verification);
  `docs/CHANGELOG.md` (closing entry); plan archive move.
- Depends on: M2, M3, M4 exits
- Acceptance criteria:
  - Zero validator failures on full repo.
  - All 31 protocols PASS in stepper.
  - All 31 manuals render.
  - No `0.0285 uL` or `material name is now` artifact remaining.
  - Closing CHANGELOG entry references all 7 gates by ID and names every
    BLOCKER closed.
  - Plan file moved from `docs/active_plans/` to `docs/archive/`.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py`
  - `source source_me.sh && python3 validation/stepper/validate.py --all`
  - `source source_me.sh && python3 validation/manual/validate.py --all`
- Obvious follow-ons:
  - Open the follow-up plan stub for the deferred global material registry
    (M2/H2 architectural decision).

## Acceptance criteria and gates

- Per-patch gate: the new validator gate that the patch targets must report
  green on the edited file before the patch is considered done.
- Integration gate: full-repo `validate_content_yaml.py` reports zero failures
  after each milestone exit.
- Regression gate: `protocol_stepper.py` PASS on all 31 protocols after each
  milestone exit.
- Manual review gate: spot-check one rendered manual per touched protocol
  family after each milestone exit; confirm no symptom-mask artifact.
- Release gate (M5): all four checks above plus the closing CHANGELOG entry
  and archive move.

## Test and verification strategy

- Unit checks: each new validator gate (V1-V7) ships its own pytest fixture in
  `tests/test_validate_content_yaml.py` that fails when the gate is removed.
  Tests are fast (no real protocol load); fixtures are minimal YAML strings.
- Integration checks: full-repo `validate_content_yaml.py` run after each
  milestone exit. The expected failure set shrinks monotonically from M1 to
  M5 (M1 introduces the baseline failure count; M2-M4 each drive a slice to
  zero).
- Smoke checks: `protocol_stepper.py --all` and `protocol_manual.py --all`
  after each milestone exit.
- Regression check: pre-flight `pytest tests/` before any patch lands, and
  again at M5 exit. No existing pytest may regress.
- Failure semantics: any of the four gates above failing blocks the milestone
  exit; the doer fixes the failure before moving on.

## Migration and compatibility policy

- Additive rollout: the seven validator gates land before any content fix.
  Once the gates exist, the failure set is the migration scope. No gate is
  retired during this plan.
- Backward compatibility: no spec field is removed or renamed. New spec text
  (M0) extends, not replaces. No protocol stops parsing.
- Deletion criteria for the renderer sub-mL auto-promotion: removed when WP-C1
  has landed and no manual renders the mL/uL ambiguity.
- Rollback strategy: if any gate produces false-positive failures on legacy
  content not covered by this plan, the gate can be guarded behind a
  per-file allowlist temporarily, and the false-positive content scheduled
  for a follow-up plan. Do not weaken the gate semantics to accommodate one
  off-scope file.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| `kind`-to-field convention pin (M0) forces a wide sweep through bottle objects | High | M0 picks `material_name` for `kind: bottle`; every bottle file changes | planner | sweep is partitioned per kind in M4 (WP-M2, WP-M3); gate (V7) drives discovery so no manual file-grep is needed |
| New gate V3 surfaces additional min/max violations across non-SDS protocols (legacy MTT, cell-culture, drug-dilution) | Medium | full-repo V3 run reports failures outside the planned scope | coder / planner | record off-scope failures in M5 closing entry and schedule a follow-up plan; do not in-line fix |
| Renderer revert (WP-R1) regresses some manual readability (loss of human-friendly unit) | Low | Spot-check of WP-R1 output reads as awkward | coder | accept literal-unit output as canonical; if readability suffers, address with a unit-format helper that converts only when explicitly annotated (out of scope for this plan) |
| Gate V5 (subpart-target) needs a schema concept (`applies_to: subpart`) the current `OBJECT_YAML_FORMAT.md` does not declare | Medium | WP-V5 doer cannot find the declaration | coder | escalate during WP-V5; if needed, add a small spec addition under M0 before V5 lands |
| OQ-1 (p10 max resolution) blocks WP-C2 | Medium | OQ-1 stays open at M2 start | planner / user | resolve OQ-1 in writing before M2 begins; default recommendation: add a `p200_micropipette` object and switch MP-9 / MP-10 targets |
| M4 reconciliation picks a label/color the user dislikes | Low | manual spot-check fails subjective approval | coder | record canonical label/color picks in M4 CHANGELOG entry; user may override before archive |

## Rollout and release checklist

- [ ] M0 spec text reviewed and merged (WP-S1, WP-S2)
- [ ] M1 validator gates landed and tested (WP-V1..WP-V7)
- [ ] M1 baseline run recorded (current failure count, by gate ID)
- [ ] OQ-1 resolved in writing
- [ ] M2 content fixes landed (WP-C1..WP-C4) + renderer revert (WP-R1)
- [ ] M3 `visual_states` sweep landed (WP-O1..WP-O7)
- [ ] M4 material reconciliation landed (WP-M1..WP-M3)
- [ ] M5 full-repo verify clean
- [ ] Closing `docs/CHANGELOG.md` entry written
- [ ] Plan file moved to `docs/archive/`

## Documentation close-out requirements

- One `docs/CHANGELOG.md` entry per milestone exit, under that day's
  `## YYYY-MM-DD` heading, in the canonical section order
  (`### Additions and New Features` for the new gates,
  `### Behavior or Interface Changes` for the renderer revert and content
  fixes, `### Fixes and Maintenance` for the visual_states and material
  sweeps, `### Decisions and Failures` for OQ-1 resolution and any deferred
  follow-up plan stubs).
- One closing entry at M5 summarizing the whole drift remediation, naming
  the 7 gates by ID, listing each BLOCKER closed, and pointing at the
  follow-up plan stub for the global material registry.
- Move this plan file from `docs/active_plans/spec_content_drift_remediation.md`
  to `docs/archive/` at M5 exit.

## Patch plan and reporting format

- Patch 1: spec ratification, `PROTOCOL_YAML_FORMAT.md` sequence_runner
  shape (WP-S1)
- Patch 2: spec ratification, `OBJECT_YAML_FORMAT.md` kind-to-field
  convention table (WP-S2)
- Patch 3-9: validator gates V1-V7, each shipped as its own patch with its
  fixture (WP-V1..WP-V7)
- Patch 10: B1 volume magnitudes (WP-C1)
- Patch 11: B2 p10 resolution (WP-C2)
- Patch 12: B3 scene self-collision (WP-C3, plus follow-on audit of other
  overrides)
- Patch 13: B5 subpart-target write (WP-C4)
- Patch 14: renderer sub-mL auto-promotion revert (WP-R1)
- Patches 15-21: `visual_states` completeness, one per object (WP-O1..WP-O7)
- Patch 22: cross-protocol material reconciliation (WP-M1)
- Patch 23: kind=bottle field-naming sweep (WP-M2)
- Patch 24: kind=flask / waste / equipment field-naming sweep (WP-M3)
- Patch 25: M5 verification + closing CHANGELOG entry + archive move (WP-F1)

## Open questions and decisions needed

- OQ-1: p10 max-violation resolution. Three candidate fixes for B2:
  (a) raise `p10_micropipette` `max` from 10 to 30 (changes the instrument
  semantics; physically inaccurate -- a real p10 cannot do 30 uL);
  (b) rename the object to `p20_micropipette` and raise `max` to 20, then
  redesign MP-9 to use a smaller ladder volume;
  (c) add a new `p200_micropipette` object alongside the existing p10 and
  switch MP-9 / MP-10 targets to it (physically accurate; one new object).
  Decision owner: user. Recommendation: (c). Resolve before M2 starts.
- OQ-2: canonical hex color for `ddh2o` across protocols. Current candidates:
  `#e3f2fd` (used by `sdspage_image_gel`), `#f0f9ff` (used by destain +
  prepare_running_buffer). Decision owner: M4 doer (recorded inline in M4
  CHANGELOG entry; user may override at archive).
- OQ-3: canonical label and color for `coomassie_stain`, `coomassie_stain_used`,
  `destain_used` (each diverges across 2 files). Decision owner: M4 doer
  (same recording rule as OQ-2).
- OQ-4: does the current `OBJECT_YAML_FORMAT.md` already declare an
  `applies_to: subpart` discriminator on `state_field` (or an equivalent),
  or does WP-V5 need a small M0 spec addition first? Decision owner: WP-V5
  doer at start of M1; escalate to M0 if a spec edit is needed.
