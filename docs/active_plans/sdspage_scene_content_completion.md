# Plan: sdspage scene content completion

## Context

Experiment 1 closed 2026-05-17 with verdict `both_supported_pending_content`. 27 of
34 current scene files are expressible under both row+slot (Model B, tie-break
preferred) and region+slot (Model C). 7 sdspage scenes are zero-placement and
excluded from the verdict as `scene_content_incomplete`. Per Experiment 1's
decision gate, the next plan is content completion for those 7 scenes ONLY,
scoped narrowly per the well-plate-workspace pause note's next-step guidance.
Row+slot rollout does NOT start before Experiment 1 is re-run against the
completed corpus.

The 7 incomplete sdspage scene files:

1. `content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml`
2. `content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml`
3. `content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml`
4. `content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml`
5. `content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml`
6. `content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml`
7. `content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml`

Prior plans failed in a recurring halfway-fix pattern. Four layout plans left
authored geometry; the well-plate-workspace plan paused because every fix
surfaced a deeper scene-engine problem (launcher initial scene, click-target
derivation, capability schema, pointer-events scoping, pulse-keyframe
duplication, missing dispatch branches, missing MC click handler, microtube
data-attribute mismatch). The pause note's verdict: the underlying scene
interaction model is not specified well enough to support a new scene cleanly;
continuing to patch in-plan produces fragile coverage and false confidence.

This plan does NOT repeat that pattern. It defines stable contracts FIRST, then
authors the missing content against those contracts. Each contract is its own
milestone with its own gate.

## Objectives

- Identify the exact set of 7 incomplete sdspage scene files (already enumerated
  above; M1 verifies against current `git ls-files` + Experiment 1 Section 3).
- Define the stable render contract: what regions exist per sdspage scene, what
  items render in each, when.
- Define the stable dispatch contract: which click is the active target, what
  state mutation happens, how the step advances.
- Define the stable visual contract: active vs dim vs future, cursor,
  pointer-events, pulse. Shared across all sdspage scenes.
- Define a per-scene layout invariant doc per sdspage scene (analogous to
  `docs/archive/LAYOUT_METRICS.md` but contract-driven, not
  protocol-content-driven).
- Define a screenshot gate that runs against the contract, not against a
  specific protocol's content.
- Preserve the coordinate-free Experiment 1 result as input. Scene YAML stays
  geometry-free; content-completion authors workspace composition with
  non-coordinate vocabulary only; structured objects stay structured.
- After content completion, re-run Experiment 1 against the completed corpus.
- Do NOT start row+slot rollout before the re-run verdict.

## Design philosophy

This plan leans on **Fix the design, not the symptom** from `docs/REPO_STYLE.md`
core philosophies. The well-plate-workspace plan failed because content was
authored against unspecified contracts; every content gap surfaced an engine
gap. The fix is to define the contracts up front and treat content authoring
as the LAST milestone, not the first. Trade-off accepted: front-loaded design
work delays visible content delivery by 4 milestones. Rejected alternative:
author the 7 sdspage scenes first and resolve contract gaps as they surface;
that ratifies the halfway-fix pattern the pause note documents.

## Scope

- In scope: 7 sdspage scene YAML files (listed above) + contract docs +
  per-scene layout invariant docs + screenshot gate + Experiment 1 re-run.
- Contract docs live under `docs/active_plans/sdspage_contracts/` during
  development; promotion path to `docs/specs/` is an open question.
- Coordinate-free authoring: row+slot (Model B) or region+slot (Model C) per
  the Experiment 1 result; no authored geometry.
- Structured objects (gel cassette, plate-reader display, microscope field,
  etc.) appear as single placements; their interior is owned by the object
  adapter, not by scene YAML.

## Non-goals

- Do NOT edit any `docs/specs/*` file in this plan. Contract docs live under
  `docs/active_plans/sdspage_contracts/` until the user approves promotion.
- Do NOT modify the layout engine (`src/scene_runtime/layout/`).
- Do NOT add or modify validators.
- Do NOT modify any runtime code beyond what is needed to assert the contracts.
  Prefer contract docs + screenshot gate over runtime changes. If runtime
  changes are required, stop and surface as a spec-gap.
- Do NOT start the row+slot implementation; Experiment 1 verdict explicitly
  defers rollout until after the re-run.
- Do NOT extend scope to non-sdspage scenes.
- Do NOT entangle layout work with dispatch / capability / visual contract
  work; each contract is its own work package.
- Do NOT commit; humans commit.

## Milestone plan

### Milestone 1: identify and verify the 7 scenes

- Depends on: none.
- Workstreams: WS-IDENT (1 patch).
- Entry: Experiment 1 closed.
- Exit:
  - `docs/active_plans/sdspage_scene_content_completion_identify.md` lists the
    7 file paths verbatim, each with current placement count (expected 0) and
    the parent protocol's `step.target` references that must surface as
    workspace items.
  - Re-confirms the 7 are still zero-placement against current
    `git ls-files`.
- Parallel-plan ready: no; single read-only audit.

### Milestone 2: render contract

- Depends on: M1.
- Workstreams: WS-RENDER-CONTRACT (1 doc) + WS-RENDER-EXAMPLE (1 doc).
- Entry: M1 closed.
- Exit:
  - `docs/active_plans/sdspage_contracts/render_contract.md` defines: what
    workspace regions exist for sdspage scenes (gel staging, instrument face,
    tool shelf, reagent rack, sample rack, popup layer); what items render in
    each region; when items appear / hide; how structured objects (gel
    cassette, tank, power supply, ladder) declare their render boundaries.
  - `docs/active_plans/sdspage_contracts/render_example.md` walks one
    representative sdspage scene through the render contract to demonstrate the
    shape.
  - No spec edits; no runtime edits.
- Parallel-plan ready: yes; max parallel doers: 2.

### Milestone 3: dispatch contract

- Depends on: M2.
- Workstreams: WS-DISPATCH-CONTRACT (1 doc) + WS-DISPATCH-EXAMPLE (1 doc).
- Entry: M2 closed.
- Exit:
  - `docs/active_plans/sdspage_contracts/dispatch_contract.md` defines: which
    click maps to which interaction; how active target is derived from current
    step; what state mutation occurs (per the closed `scene_operation`
    primitives); how step advances on validator pass.
  - `docs/active_plans/sdspage_contracts/dispatch_example.md` walks one
    sdspage scene's full step chain through the dispatch contract.
  - No spec edits; no runtime edits.
- Parallel-plan ready: yes; max parallel doers: 2.

### Milestone 4: visual contract

- Depends on: M2 (render contract defines regions; visual contract decorates
  them).
- Workstreams: WS-VISUAL-CONTRACT (1 doc) + WS-VISUAL-PRIMITIVES (1 doc).
- Entry: M2 closed.
- Exit:
  - `docs/active_plans/sdspage_contracts/visual_contract.md` defines: active vs
    dim vs future, cursor, pointer-events, pulse semantics shared across all
    sdspage scenes; reconciles `.is-next-target` and `.equipment-active`
    primitives (the well-plate pause note flagged this as unresolved); names
    the single canonical primitive going forward.
  - `docs/active_plans/sdspage_contracts/visual_primitives.md` documents the
    CSS class set + DOM data-attributes + animation keyframes the contract
    relies on; no actual CSS or runtime edits in this WP.
  - No spec edits.
- Parallel-plan ready: yes (M3 + M4 run in parallel); max parallel doers: 2.

### Milestone 5: per-scene layout invariants + screenshot gate

- Depends on: M2, M3, M4.
- Workstreams: WS-INV-{1..7} (one per sdspage scene) + WS-GATE (1 patch).
- Entry: M2, M3, M4 closed.
- Exit:
  - 7 docs at `docs/active_plans/sdspage_contracts/layout_invariants/<scene>.md`,
    each declaring per-scene layout invariants in the spirit of
    `docs/archive/LAYOUT_METRICS.md` but contract-driven: which regions are
    required, which items must be present, which collisions are intentional,
    occupancy and overlap budgets, label collision rules. No authored
    coordinates; the engine still owns geometry.
  - One screenshot gate test under `tests/playwright/` (location confirmed by
    user) that runs against the contract, not against any single protocol's
    content. Gate asserts: render contract regions are present + non-empty;
    dispatch contract targets carry the right `data-target-id` + `data-gesture`
    attributes; visual contract classes apply on the right elements;
    per-scene layout invariants hold.
- Parallel-plan ready: yes; max parallel doers: 4 (one per scene; serialize
  first 2).

### Milestone 6: content authoring + Experiment 1 re-run

- Depends on: M5.
- Workstreams: WS-CONTENT-{1..7} (one per sdspage scene) + WS-RERUN (1 patch).
- Entry: M5 closed.
- Exit:
  - 7 sdspage scene YAML files authored against the contracts. Each carries
    placements that satisfy the per-scene layout invariant. No authored
    geometry; uses the tie-break-preferred Model B (row+slot) authoring shape
    per the Experiment 1 verdict.
  - Each scene passes the screenshot gate.
  - YAML gates green: `validation/validate.py`,
    `validation/manual/protocol_manual.py --all`.
  - Experiment 1 re-run against the now-complete corpus: new deliverable at
    `docs/active_plans/scene_authoring_shape_experiment_1_rerun.md` with the
    final verdict (`row_slot_supported` / `region_slot_supported` /
    `both_supported` / `no_coordinate_free_model_supported`). The 7 sdspage
    scenes are no longer `scene_content_incomplete`.
- Parallel-plan ready: yes; max parallel doers: 4 (one per scene; serialize
  first 2 to validate the contract-driven authoring works).

## Work packages

### WP-IDENT-1: verify 7 sdspage scene files

- Touch points: `docs/active_plans/sdspage_scene_content_completion_identify.md`
  (new); `docs/CHANGELOG.md`.
- Acceptance:
  - 7 file paths listed verbatim against Experiment 1 Sections 3 + 5.1 + 9.1.1.
  - Each scene's parent protocol's `step.target` references enumerated.
  - Confirms zero-placement against current `git ls-files`.

### WP-RENDER-1, WP-RENDER-2

- One per render-contract doc per M2 exit.

### WP-DISPATCH-1, WP-DISPATCH-2

- One per dispatch-contract doc per M3 exit.

### WP-VISUAL-1, WP-VISUAL-2

- One per visual-contract doc per M4 exit. WP-VISUAL-2 documents the
  `.is-next-target` vs `.equipment-active` reconciliation per the well-plate
  pause note.

### WP-LAYOUT-INV-{1..7}

- One per sdspage scene per M5 exit. Touch points: one doc per scene under
  `docs/active_plans/sdspage_contracts/layout_invariants/`.

### WP-GATE-1: screenshot gate

- Touch points: one new test under `tests/playwright/` (location confirmed by
  user).
- Acceptance: gate asserts contract conformance (regions, targets, visual
  classes, invariants). Runs against the contract, not against any single
  protocol's content.

### WP-CONTENT-{1..7}

- One per sdspage scene per M6 exit. Touch points: one scene YAML per WP.
- Acceptance: scene passes screenshot gate; YAML gates green; uses Model B
  authoring shape; no authored geometry.

### WP-RERUN-1: re-run Experiment 1

- Touch points: new deliverable at
  `docs/active_plans/scene_authoring_shape_experiment_1_rerun.md`;
  `docs/CHANGELOG.md`.
- Acceptance: full Experiment 1 method re-applied against the now-complete
  corpus. Final verdict line is one of `row_slot_supported`,
  `region_slot_supported`, `both_supported`,
  `no_coordinate_free_model_supported`. No `_pending_content` value possible
  (every scene is now complete).

## Acceptance criteria and gates

- Hard: no edit to `docs/specs/*` in this plan.
- Hard: no edit to `src/scene_runtime/layout/` or any validator.
- Hard: runtime edits limited to MINIMUM needed for screenshot gate
  conformance; any larger change pauses the WP and surfaces as a spec-gap.
- Hard: `pytest tests/ -q` exits 0 after every WP that touches `tests/` or
  `content/`.
- Hard: `validation/validate.py` and `validation/manual/protocol_manual.py
  --all` green after every WP that touches `content/`.
- Hard: scene YAML files authored in M6 contain ZERO entries from the
  Experiment 1 forbidden-geometry list (`bounds`/`scene_bounds`/`x`/`y`/
  `left`/`right`/`top`/`bottom`/`width`/`height`/`align`/etc.).
- Hard: screenshot gate green for all 7 scenes before WP-RERUN-1 starts.
- Hard: `pytest tests/test_markdown_links.py -q` exits 0 after every
  contract-doc WP.

## Decision gate at plan close

- `content_complete_rerun_exp1` -> WP-RERUN-1 produces a final
  Experiment 1 verdict against the now-complete corpus. The next plan
  (layout rollout) opens per that verdict.
- `content_blocked_redesign` -> one or more sdspage scenes cannot be
  content-completed under the stable contracts without runtime or spec
  changes. Open a fresh plan that addresses the surfaced contract gaps.
  Do NOT extend this plan to coerce a failing scene.

## Risk register

| Risk | Impact | Trigger | Mitigation |
| --- | --- | --- | --- |
| Halfway-fix recurrence | high | content authoring in M6 surfaces a contract gap; WP tries to patch contract mid-flight | Each contract is its own milestone with its own gate; M6 cannot start until M5 closes; contract changes after M5 close invalidate the contract and require a new WP |
| Contract debate stalls M2/M3/M4 | high | reviewers disagree on region taxonomy, dispatch shape, or visual primitive | Each contract WP carries ONE proposed shape + one example; user decides via approval, not via subagent debate; max one revision per WP before manager escalates |
| Content drifts into protocol behavior | medium | a scene YAML carries step-like fields | M6 WPs cite the protocol/scene boundary documented in `docs/specs/SCENE_VOCABULARY.md`; reviewer rejects any scene YAML carrying interaction or response fields |
| Screenshot gate brittle | medium | gate fails on cosmetic pixel differences | Gate asserts structure (region presence, target attributes, class membership) not pixel hashes; WP-GATE-1 acceptance includes tolerance rules |
| Scope creep into adjacent scenes | high | a contract change implies updating non-sdspage scenes | Non-goals are hard; reviewer rejects any non-sdspage content edit; surfaces as a follow-up plan if real |
| Runtime change required to satisfy a contract | high | WP-GATE-1 cannot assert the visual contract without new CSS / runtime code | Pause the affected WP; surface as a spec-gap; manager re-scopes or escalates; do NOT silently edit runtime |
| Adapter gap surfaces (e.g. gel cassette adapter missing) | high | M6 content WP cannot place an object because no adapter exists | Adapter authoring is OUT of scope per Non-goals; if a real gap surfaces, stop and open a separate adapter-authoring plan; do NOT inline-author an adapter |
| User unavailable for contract approvals | medium | M2/M3/M4 stall waiting for user input | M1 surfaces every open question for user resolution before M2 dispatches; plan reports BLOCKED rather than guessing |

## Open questions and decisions needed

These need user answers BEFORE WP-IDENT-1 dispatches:

1. **Owner of scene placements**: parent protocol step.target list vs runner
   override - which is the authoritative source for the workspace items each
   sdspage scene must contain? (Affects WP-IDENT-1 enumeration method.)
2. **Object adapter coverage**: do existing adapters cover every sdspage gear
   item (gel cassette, electrode lid, power supply, tank, comb, ladder, sample
   microtubes, transfer pipette)? Is the gel-cassette adapter the most likely
   gap? (If yes, M6 may surface an adapter-authoring escape.)
3. **Adapter authoring scope**: if a new adapter IS needed, does adapter
   authoring count as runtime code under the Non-goals? Recommended: yes;
   surfaces a separate plan.
4. **Re-run deliverable filename**: confirm
   `docs/active_plans/scene_authoring_shape_experiment_1_rerun.md` as the
   re-run target, or pick alternative.
5. **Contract-doc promotion path**: do contracts stay under
   `docs/active_plans/sdspage_contracts/` indefinitely, or is there a
   promotion path to `docs/specs/` after the re-run? If promotion exists,
   what triggers it?
6. **Screenshot gate location**: `tests/playwright/` vs
   `tests/playwright/e2e/`? Per `docs/E2E_TESTS.md` the latter is for full
   browser walkthroughs; contract-driven gate sounds like the former.
7. **Visual primitive reconciliation**: may WP-VISUAL-2 recommend retiring
   `.equipment-active` in favor of `.is-next-target` (or vice versa)? The
   well-plate pause note flagged this as unresolved.
8. **Parallelization budget**: M5 + M6 each have 7 per-scene WPs. Are 4
   parallel doers OK after the first 2 serialize, or stricter?

All eight are user-decidable; manager escalates rather than guesses.
