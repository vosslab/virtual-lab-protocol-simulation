# Plan: Focused well plate workspace mini-tutorial

> **PAUSED 2026-05-12.** This plan is stopped. The mini-tutorial and the
> `well_plate_workspace` scene are NOT pedagogically or interaction
> complete. The repo is buildable but the scene behavior is not
> trustworthy enough to keep iterating in-plan. See
> `docs/active_plans/well_plate_workspace_pause_note.md`
> for the verified vs unverified inventory, the reusable artifacts, and
> the reasons for the pause. Do not mark WP-G1, WP-C1-VISUAL,
> WP-Bottle-Swap, or breadcrumb cleanup complete. Next work should be a
> separate scene-system plan, not more patches to this mini-tutorial.

## Context

`tutorial_plate_drug_additions` is a self-contained mini-tutorial for loading a 96-well plate. The tutorial should not behave like the full OVCAR8 Day-2 protocol. It should not send students through the hood, bench, incubator, pre-incubation, or plate handoff.

The mini-tutorial teaches one focused workflow: prepare representative dilution tubes, use those prepared solutions to load the wells, and review the completed loaded plate. The scene should feel like a zoomed-in liquid-handling workspace centered on the well plate, pipettes, liquid sources, and microtube rack.

## Objectives

- Teach students how stock solutions become temporary working solutions through representative dilution-prep steps.
- Teach students how prepared working solutions map onto rows and columns of a 96-well plate.
- Keep all interactions inside one reusable scene named `well_plate_workspace`.
- Keep math questions as popup cards over the same scene, not separate scenes.
- End the tutorial with a completed loaded-plate review, not an incubation or full-protocol continuation.

## Design philosophy

This plan favors a stable, visual learning surface over protocol-complete realism. The rejected alternative is expanding the mini-tutorial into the full Day-2 workflow with hood, bench, incubator, and plate handoff. The tutorial should be small enough to teach one mental model clearly: liquid comes from a visible source, through a visible pipette, into a visible tube or well.

## Scope

- Create one reusable scene named `well_plate_workspace`.
- Keep the scene layout stable while the active process changes by step.
- Render calculation questions as multiple-choice popup cards over the scene.
- Add dilution-prep interactions using visible pipette, stock solution, distilled water, destination microtube, and microtube rack.
- Add plate-transfer interactions using visible multichannel pipette, active source solution, and highlighted target wells.
- Add microtube liquid state so completed tubes retain reagent color and labels.
- Use existing well-liquid rendering so completed wells retain liquid state.
- Use `tubeTargets` metadata for dilution-prep rendering and validation.
- Use `plateTargets` metadata for plate-transfer rendering and validation.
- Rewrite tutorial content so it ends at `review_loaded_plate`.
- Update protocol docs, authoring docs, validator, walker, tests, and visual review gates.

## Non-goals

- Do not include hood scene navigation, because this mini-tutorial is not a hood-navigation exercise.
- Do not include bench scene navigation, because the tutorial is only about loading wells.
- Do not include incubator or pre-incubation steps, because incubation belongs in the full `cell_culture` protocol.
- Do not create a separate `dilution_prep` scene, because dilution prep and plate transfer should occur inside the same stable workspace.
- Do not use hidden auto-loads for liquid handling, because students must see where liquid comes from.
- Do not render source items as snake_case text buttons, because the primary interaction surface should be visual lab objects.

## Current state summary

F1, F2, and F3 produced useful downstream infrastructure, but the tutorial still needs scope correction and upstream dilution-prep work.

Useful work to keep:

- `multipleChoice` completion-path kind for math popups.
- Well-liquid rendering and layered well state.
- `plateTargets` metadata for plate-transfer steps.
- Visible pipette and source objects during downstream plate transfer.
- Stock solution / intermediate dilution / working solution terminology.

Missing or incorrect work:

- The tutorial still risks drifting into the full Day-2 protocol.
- Incubation, bench, hood, or pre-incubation must be removed from this mini-tutorial.
- Dilution prep must happen inside `well_plate_workspace`, not a separate scene.
- The scene should not have separate layout modes. It should have stable layout with step-specific active objects.
- Microtubes need liquid state, labels, and active/completed/future rendering.
- The final tutorial step must be `review_loaded_plate`, not `incubate_plate`.

## Architecture boundaries and ownership

`well_plate_workspace` is the only scene used by this mini-tutorial. The scene renders a stable workspace with pipettes, liquid sources, microtube rack, and 96-well plate. The current step controls which process is active and which objects are highlighted.

Processes are step-level behavior descriptions, not scene modes:

| Process             | Purpose                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `calculation_popup` | Show a multiple-choice math card over the scene.                                                       |
| `dilution_prep`     | Prepare a representative dilution tube using pipette, source solution, distilled water, and microtube. |
| `plate_transfer`    | Transfer prepared solution or media into highlighted plate wells.                                      |
| `transition`        | Explain a skipped repetitive section and visibly update tube state.                                    |
| `review`            | Show the final loaded plate and summary.                                                               |

Scene code should import SVGs only through `src/svg_assets.ts`. Generic renderers must not hardcode OVCAR8 step ids, carboplatin, metformin, or row B-H logic. YAML authors the tutorial content and targets.

## Scene asset contract

`well_plate_workspace` is one stable scene. The layout does not switch between separate modes. The current step changes the active process and highlighted objects.

The current scene YAML is too sparse. It declares only `well_plate` as a scene item, so it does not yet describe the source liquids, pipettes, microtube rack, or transfer objects needed for the tutorial. `oai_citation:0?well_plate_workspace.yaml`

The scene must render the same major spatial regions throughout the tutorial:

| Region              | Position                   | Purpose                                                         |
| ------------------- | -------------------------- | --------------------------------------------------------------- |
| Tool area           | left side                  | pipettes and tip box                                            |
| Source area         | upper center               | stock solution, distilled water, media, active working solution |
| Microtube rack area | lower center               | dilution tubes and prepared working solutions                   |
| Plate area          | right side, largest object | 96-well plate and well liquid state                             |
| Popup layer         | centered overlay           | multiple-choice math questions                                  |

The layout stays stable. Each step only changes which objects are active, highlighted, clickable, or dimmed.

## Asset inventory and positioning

Use existing local assets first. Use Bioicons/Servier assets only when the local `assets/equipment/` set does not contain the needed object. Do not render source items as snake_case text buttons. All SVG access goes through `src/svg_assets.ts`.

| Object                     | Preferred SVG asset                                                                            | Notes                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 96-well plate              | `assets/equipment/96well_pcr_plate.svg` or procedural 96-well grid                             | Use procedural grid if per-well liquid layers cannot be applied cleanly to the asset. |
| Multichannel pipette       | `assets/equipment/multichannel_pipette.svg` or `assets/equipment/multichannel_pipette_new.svg` | Always visible during plate-transfer steps.                                           |
| Single-channel pipette     | `assets/equipment/aspirating_pipette.svg`                                                      | Use for dilution-prep clicks unless a true micropipette asset is added later.         |
| Pipette rack               | `assets/equipment/micropipette_rack.svg`                                                       | Tool area, left side.                                                                 |
| Tip box                    | `assets/equipment/tip_box.svg` or `assets/equipment/tip_box_new.svg`                           | Tool area, optional if layout becomes crowded.                                        |
| Media bottle               | `assets/equipment/bottle.svg` or Bioicons `bottle-medium-pink.svg`                             | Prefer Bioicons pink for media color identity.                                        |
| Distilled water bottle     | `assets/equipment/bottle.svg`                                                                  | Label as distilled water.                                                             |
| Carboplatin stock solution | `assets/equipment/bottle.svg` or `assets/equipment/drug_vial_rack.svg`                         | Label as "10 mM carboplatin stock solution".                                          |
| Metformin stock solution   | `assets/equipment/bottle.svg` or `assets/equipment/drug_vial_rack.svg`                         | Label as "1 M metformin stock solution".                                              |
| Microtube rack             | `assets/equipment/dilution_tube_rack.svg`                                                      | Holds carboplatin and metformin working-solution tubes.                               |
| Individual microtube       | Bioicons `microtube-open-translucent.svg`                                                      | Best default for empty/active tubes.                                                  |
| Filled microtube           | Dynamic reagent-color overlay on translucent tube                                              | Prefer dynamic overlay so reagent colors come from `reagents.yaml`.                   |
| Incubator                  | none                                                                                           | Excluded from this mini-tutorial.                                                     |

### Microtube decision

Use Bioicons microtube assets for individual tubes. Do NOT use procedural circles. Preferred base asset:

```text
OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/microtube-open-translucent.svg
```

Render liquid state by overlaying reagent-colored liquid inside the tube, driven by `reagents.yaml` `displayColor`. The fixed-color variants (`microtube-open-pink.svg`, `microtube-open-blue.svg`) may be used only as a temporary visual fallback; fixed pink/blue assets do not scale to the carboplatin / media / metformin / water color identity set.

### Bottle decision

For media, prefer the Bioicons asset:

```text
OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/bottle-medium-pink.svg
```

For carboplatin stock solution, metformin stock solution, and distilled water, `assets/equipment/bottle.svg` is acceptable with text labels and optional color overlays.

### Facade aliases

Add facade aliases in `src/svg_assets.ts` for the new Bioicons assets so consumers reference repo-stable names:

- `microtube_open_translucent` -> `OTHER_REPOS/bioicons/.../microtube-open-translucent.svg`
- `bottle_medium_pink` -> `OTHER_REPOS/bioicons/.../bottle-medium-pink.svg`

### items.yaml cleanup target

The current uploaded `items.yaml` still includes `incubator`, assigns items to `hood` or `bench`, and uses `&micro;` entities in labels. Cleanup target:

```yaml
carboplatin_stock_solution:
  label: "10 mM carboplatin stock solution"
  asset: bottle
  role: reagent_source
  contains: carboplatin
metformin_stock_solution:
  label: "1 M metformin stock solution"
  asset: bottle
  role: reagent_source
  contains: metformin
distilled_water:
  label: "Distilled water"
  asset: bottle
  role: reagent_source
  contains: water
dilution_tube_carb_b:
  label: "4 µM carboplatin working solution"
  asset: microtube_open_translucent
```

Remove `incubator` from items.yaml. Replace every `&micro;` with literal Unicode `µ` in label strings (content YAML strings may use Unicode since they flow to the DOM via `textContent`).

## Stable scene layout

Use this layout target:

````text
+--------------------------------------------------------------------------------+
|                                                                                |
|  TOOL AREA             SOURCE AREA                     PLATE AREA              |
|  P20/P200/P1000        stock solution / water / media   96-well plate          |
|  multichannel pipette  active source highlighted        active wells outlined  |
|  tip box                                                                                |
|                                                                                |
|                        MICROTUBE RACK AREA                                     |
|                        dilution tubes, labels, liquid state                    |
|                                                                                |
+--------------------------------------------------------------------------------+

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-A | Protocol schema and validator | 1 to 2 patches |
| M1 / WS-B | Microtube liquid state and SVG facade | 1 to 2 patches |
| M1 / WS-C | `well_plate_workspace` scene contract | 1 to 2 patches |
| M2 / WS-D | Tutorial YAML content | 1 to 2 patches |
| M2 / WS-E | Walker and automated tests | 1 to 2 patches |
| M2 / WS-F | Documentation and changelog | 1 patch |
| M3 / WS-G | Visual review and integration cleanup | 1 to 2 patches |

## Milestone plan

### Milestone M1: Build reusable workspace primitives

- Depends on: none -- shared schema and rendering primitives can start from current F1/F2/F3 state.
- Workstreams: WS-A, WS-B, WS-C
- Entry criteria: Current branch includes F1/F2/F3 or equivalent downstream plate-transfer infrastructure.
- Exit criteria:
, `tubeTargets` schema and validator are implemented.
, Microtube liquid state is stored and rendered generically.
, `well_plate_workspace` scene exists or current plate scene is renamed/refactored to that reusable scene name.
, Scene layout stays stable while active objects change by step.
, Obvious follow-ons completed: update imports, update scene registry, update generated data, rerun targeted tests, update `docs/CHANGELOG.md` draft entry.
- Parallel-plan ready: yes -- max parallel doers: 3.

### Milestone M2: Author the focused mini-tutorial

- Depends on: WP-A1, WP-B1, WP-C1 -- content depends on schema, microtube rendering, and scene contract.
- Workstreams: WS-D, WS-E, WS-F
- Entry criteria: M1 primitives pass validator and TypeScript checks.
- Exit criteria:
, `tutorial_plate_drug_additions` uses only `well_plate_workspace`.
, Tutorial step chain includes dilution-prep clicking, plate-transfer clicking, math popups, and `review_loaded_plate`.
, Tutorial contains no hood, bench, incubator, pre-incubation, or plate handoff step.
, Walker completes the tutorial using visible-object clicks and multiple-choice choices.
, Obvious follow-ons completed: update docs, update launcher metadata if needed, rebuild generated files, rerun walker and regression checks.
- Parallel-plan ready: yes -- max parallel doers: 3.

### Milestone M3: Verify visual pedagogy and close the loop

- Depends on: WP-D1, WP-E1, WP-F1 -- visual review requires implemented content, walker, and docs.
- Workstreams: WS-G
- Entry criteria: M2 automated checks pass.
- Exit criteria:
, UI review screenshots confirm visual source -> pipette -> tube/well chain.
, Final screen shows loaded plate summary.
, No `&micro;` entities render in the browser.
, No source item appears as a snake_case text button.
, No bench, hood, incubator, or pre-incubation appears in the mini-tutorial.
, Obvious follow-ons completed: fix screenshot regressions, rerun failed visual review, update changelog, prepare patch summary.
- Parallel-plan ready: no -- visual review and integration cleanup are sequential by nature.

## Workstream breakdown

### Workstream WS-A: Protocol schema and validation

- Owner: coder
- Interfaces:
, Needs: current protocol schema and F1/F2/F3 branch state.
, Provides: validated `tubeTargets` and final `plateTargets` rules for content authors.
- Expected patches: 1 to 2 patches.

### Workstream WS-B: Microtube liquid rendering

- Owner: coder
- Interfaces:
, Needs: reagent color data and SVG facade conventions.
, Provides: generic microtube liquid rendering and state helpers.
- Expected patches: 1 to 2 patches.

### Workstream WS-C: Workspace scene contract

- Owner: coder
- Interfaces:
, Needs: current plate scene, scene registry, SVG facade.
, Provides: stable `well_plate_workspace` scene that changes active objects by step.
- Expected patches: 1 to 2 patches.

### Workstream WS-D: Tutorial YAML authoring

- Owner: coder
- Interfaces:
, Needs: `multipleChoice`, `tubeTargets`, `plateTargets`, and `well_plate_workspace` support.
, Provides: final focused tutorial content.
- Expected patches: 1 to 2 patches.

### Workstream WS-E: Walker and tests

- Owner: tester
- Interfaces:
, Needs: schema and scene behavior from WS-A through WS-D.
, Provides: automated verification of the focused tutorial.
- Expected patches: 1 to 2 patches.

### Workstream WS-F: Documentation

- Owner: planner
- Interfaces:
, Needs: settled schema and scene contract.
, Provides: updated protocol, authoring, scene, SVG, and pipette docs.
- Expected patches: 1 patch.

### Workstream WS-G: Integration and visual review

- Owner: integrator
- Interfaces:
, Needs: M2 implementation complete.
, Provides: integrated branch with visual evidence and regression checks.
- Expected patches: 1 to 2 patches.

## Work packages

### Work package WP-A1: Add tubeTargets schema

- Owner: coder
- Touch points: `src/constants.ts`, `tools/build_protocol_data.py`, protocol docs.
- Depends on: none
- Acceptance criteria:
, `tubeTargets` is accepted only on relevant physical liquid-transfer steps.
, Validator checks source, diluent, destination, result liquid, solute volume, diluent volume, and result label.
, Invalid row/column/reagent/source references fail fast where applicable.
- Verification commands:
, `source source_me.sh && python3 tools/build_protocol_data.py`
, `pytest tests/test_scene_yaml_validator.py tests/test_authored_vs_generated.py`
- Obvious follow-ons:
, Add at least one valid and one invalid fixture if the repo has schema-fixture tests.
, Update generated protocol data after schema changes.

### Work package WP-B1: Add microtube liquid state

- Owner: coder
- Touch points: `src/game_state.ts`, `src/constants.ts`, `src/svg_assets.ts`, `src/scenes/well_plate_workspace/` or current scene equivalent.
- Depends on: none
- Acceptance criteria:
, Microtube contents persist in game state by tube id.
, Tube contents include liquid id, volume, color key or reagent color, and label.
, Completed microtubes render with reagent color and label.
, Fill color indicates liquid identity, not progress state.
- Verification commands:
, `npx tsc --noEmit -p src/tsconfig.json`
, `pytest tests/`
- Obvious follow-ons:
, Remove dead CSS or apply CSS classes consistently.
, Keep SVG access through `src/svg_assets.ts`.

### Work package WP-C1: Implement well_plate_workspace scene

- Owner: coder
- Touch points: `src/scenes/well_plate_workspace/`, `src/init.ts`, scene registry, `src/body.html`, `src/style.css`.
- Depends on: none
- Acceptance criteria:
, Scene id is `well_plate_workspace`.
, Scene layout remains stable across processes.
, Active process is derived from current step metadata, not hardcoded step ids.
, Visible objects include pipette/tools, source liquids/tubes, microtube rack, and 96-well plate as relevant to the step.
, Multiple-choice cards render as popups over the same scene.
- Verification commands:
, `npx tsc --noEmit -p src/tsconfig.json`
, `pytest tests/test_scene_yaml_validator.py`
- Obvious follow-ons:
, Update scene imports and registered emitters.
, Remove or archive old plate-only scene paths only after regression checks pass.

### Work package WP-D1: Rewrite tutorial step chain

- Owner: coder
- Touch points: `src/content/tutorial_plate_drug_additions/protocol.yaml`, `items.yaml`, `reagents.yaml`.
- Depends on: WP-A1, WP-B1, WP-C1
- Acceptance criteria:
, Tutorial begins in `well_plate_workspace`.
, Tutorial includes calculation popups, dilution-prep interactions, plate-transfer interactions, and final loaded-plate review.
, Tutorial ends with `review_loaded_plate`.
, Tutorial includes no hood, bench, incubator, pre-incubation, or plate handoff step.
, Terminology uses stock solution, intermediate dilution, and working solution correctly.
- Verification commands:
, `source source_me.sh && python3 tools/build_protocol_data.py`
, `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions`
- Obvious follow-ons:
, Replace all `&micro;` with Unicode `µ`.
, Confirm launcher metadata and tutorial title still match the focused scope.

### Work package WP-D2: Author final tutorial sequence

- Owner: coder
- Touch points: `src/content/tutorial_plate_drug_additions/protocol.yaml`.
- Depends on: WP-D1
- Acceptance criteria:
, The final sequence is:
, `open_well_plate_workspace`
, carboplatin calculation popup and representative dilution-prep steps
, visible skip-middle transition
, metformin calculation popup and dilution-prep step
, media adjustment steps
, carboplatin row transfer steps
, metformin final-well calculation popup and transfer step
, `review_loaded_plate`
, Carboplatin transfer uses one step per row B through H.
, Active source and active destination are declared for every liquid-transfer step.
- Verification commands:
, `source source_me.sh && python3 tools/build_protocol_data.py`
, `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions`
- Obvious follow-ons:
, Update `docs/CHANGELOG.md` with the final step count and scope correction.

### Work package WP-E1: Extend walker for workspace interactions

- Owner: tester
- Touch points: `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`, `tests/playwright/e2e/walker_helpers.mjs`.
- Depends on: WP-C1, WP-D1
- Acceptance criteria:
, Walker handles multiple-choice popups.
, Walker handles dilution-prep click sequence.
, Walker handles plate-transfer click sequence.
, Walker completes `tutorial_plate_drug_additions` with no scene transitions to hood, bench, or incubator.
- Verification commands:
, `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions`
, `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol cell_culture`
, `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_reader`
- Obvious follow-ons:
, Add regression assertion that the mini-tutorial does not visit hood, bench, or incubator scenes.

### Work package WP-F1: Update documentation

- Owner: planner
- Touch points: `docs/PROTOCOL_VOCABULARY.md`, `docs/PROTOCOL_YAML_FORMAT.md`, `docs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/PROTOCOL_STEPS.md`, `docs/SCENE_YAML_FORMAT.md`, `docs/SVG_PIPELINE.md`, `docs/PIPETTE_LIQUID_CONVENTION.md`, `docs/CHANGELOG.md`.
- Depends on: WP-A1, WP-B1, WP-C1
- Acceptance criteria:
, Docs describe `multipleChoice`, `tubeTargets`, and `plateTargets` consistently.
, Docs describe `well_plate_workspace` as one scene with step-driven processes.
, Docs state that this mini-tutorial excludes hood, bench, incubator, pre-incubation, and plate handoff.
, Docs use stock solution, intermediate dilution, and working solution consistently.
- Verification commands:
, `pytest tests/test_ascii_compliance.py`
, `python3 tools/build_protocol_data.py`
- Obvious follow-ons:
, Update changelog after implementation details settle.

### Work package WP-G1: Run visual review and fix regressions

- Owner: integrator
- Touch points: `artifacts/ui-review/`, UI review scripts, CSS, scene renderer.
- Depends on: WP-D2, WP-E1, WP-F1
- Acceptance criteria:
, Screenshots show one `well_plate_workspace` scene.
, Screenshots show visible pipette, stock solution, distilled water, microtube rack, multichannel pipette, source tubes, and 96-well plate at appropriate steps.
, Screenshots show completed microtubes and wells retaining liquid state.
, Screenshots show no snake_case source buttons.
, Screenshots show no bench, hood, incubator, or pre-incubation step.
- Verification commands:
, `REVIEW_PROTOCOL=tutorial_plate_drug_additions bash tools/run_ui_review_podman.sh`
, `bash build_github_pages.sh`
- Obvious follow-ons:
, Inspect screenshots and `report.json` before declaring green.
, Fix visible regressions and rerun the review.

## Acceptance criteria and gates

- Per-patch gate: TypeScript, protocol build, and relevant targeted tests pass.
- Integration gate: `tutorial_plate_drug_additions` walker completes and does not visit hood, bench, incubator, or pre-incubation.
- Visual gate: screenshots show visible source -> pipette -> tube/well chain.
- Manual review gate: a reviewer can explain the workflow from screenshots without reading YAML.
- Scope gate: tutorial ends at `review_loaded_plate` and includes no full-protocol continuation.

## Test and verification strategy

Run standard build checks:

```bash
source source_me.sh && python3 tools/build_protocol_data.py
bash tools/bootstrap_generated.sh
npx tsc --noEmit -p src/tsconfig.json
pytest tests/
bash build_github_pages.sh
````

Run walker checks:

```bash
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol cell_culture
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_reader
```

Run visual review:

```bash
REVIEW_PROTOCOL=tutorial_plate_drug_additions bash tools/run_ui_review_podman.sh
```

Failure semantics:

- Any hood, bench, incubator, or pre-incubation appearance in this mini-tutorial blocks closure.
- Any snake_case source button blocks closure.
- Any well or microtube fill that uses generic progress color instead of reagent identity blocks closure.
- Any hidden auto-load for liquid transfer blocks closure.

## Migration and compatibility policy

- Additive rollout: keep existing `multipleChoice`, well-liquid, and `plateTargets` infrastructure while adding `tubeTargets` and `well_plate_workspace` behavior.
- Backward compatibility promises: full `cell_culture` and `tutorial_plate_reader` protocols must keep passing.
- Deletion criteria for legacy paths: remove old plate-only or `applyReagent` stubs only after `tutorial_plate_drug_additions`, `cell_culture`, and `tutorial_plate_reader` walkers pass.
- Rollback strategy: revert tutorial YAML and scene registration first; keep schema additions if they are generic and already validated.

## Risk register

| Risk                                          | Impact | Trigger                                                   | Owner      | Mitigation                                                    |
| --------------------------------------------- | ------ | --------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| Scope drifts back to full protocol            | High   | Incubator, bench, hood, or pre-incubation appears         | integrator | Add explicit walker and visual assertions.                    |
| Scene naming causes confusion                 | Medium | Code creates separate dilution scene or mode-only layouts | architect  | Use `well_plate_workspace` with step-driven active process.   |
| Visuals pass tests but fail pedagogy          | High   | Screenshots do not show source -> pipette -> destination  | reviewer   | Require visual review before closure.                         |
| Reagent identity confused with progress state | Medium | Generic green/yellow fills appear                         | coder      | Separate fill color from outline/progress state.              |
| Schema changes become tutorial-specific       | Medium | Renderer branches on OVCAR8 ids                           | reviewer   | Require generic metadata and grep for hardcoded drug strings. |

## Rollout and release checklist

- [ ] Protocol schema accepts and validates `tubeTargets`.
- [ ] Microtube liquid state renders with reagent colors.
- [ ] `well_plate_workspace` scene renders stable layout and active objects.
- [ ] Tutorial content ends at `review_loaded_plate`.
- [ ] Walker completes focused tutorial with no forbidden scenes.
- [ ] UI review screenshots pass visual acceptance criteria.
- [ ] Regression walkers pass for `cell_culture` and `tutorial_plate_reader`.
- [ ] Documentation and changelog are updated.

## Documentation close-out requirements

- Active plan / progress tracker updates: update the active plan or repo-root plan file used by the manager.
- `docs/CHANGELOG.md` entry: include scene rename, scope correction, `tubeTargets`, microtube liquid rendering, and final loaded-plate tutorial flow.
- Archive / closure notes: record that the mini-tutorial intentionally excludes incubation and full-protocol handoff.

## Patch plan and reporting format

- Patch 1: schema add `tubeTargets` and validation.
- Patch 2: microtube liquid state and SVG facade rendering.
- Patch 3: `well_plate_workspace` scene contract and stable layout.
- Patch 4: tutorial YAML rewrite for focused well-loading flow.
- Patch 5: walker and regression tests.
- Patch 6: docs and changelog.
- Patch 7: visual review fixes and integration cleanup.

## Canonical sequencing override (2026-05-11)

The original sequencing scheduled visual proof immediately after the render shell. That was wrong: a screenshot gate before tutorial content and items are ready can only test the empty shell, not the student workflow. The corrected dependency order:

1. WP-C1 render shell (DONE)
2. **Parallel band:** WP-D1 content + items cleanup, WP-Hood-Nav scene switch, WP-UI-Review-Selectors harness selectors. All three touch disjoint files and land before visual proof becomes meaningful.
3. WP-C1-VISUAL screenshot proof. Reruns only after band (2) is complete.
4. WP-D2 final sequence polish. Depends on WP-D1.
5. WP-E1 walker isolation assertion. Depends on WP-D1 plus navigation fix.
6. WP-Asset-Swap (microtube Bioicons render) and WP-Bottle-Swap (bottle Bioicons render). These both touch `src/svg_assets.ts` and `src/scenes/well_plate_workspace/render.ts`; DO NOT dispatch in parallel with each other or with active render work. Sequence them one-at-a-time after band (2) lands.
7. WP-F1 docs + CHANGELOG. Can run alongside (4)-(6).
8. WP-G1 final visual review. Depends on content, walker, docs, and asset swaps.

The task tracker's `blockedBy` field carries stale edges from prior plan iterations and the API does not support removing edges. When dispatching, consult this Sequencing Override section as the authoritative dependency map; do not treat stale `blockedBy` entries as gating. Document any further override explicitly in this section so future agents do not trust stale state.

## Open questions and decisions needed

- Microtube SVG: **resolved**. Use Bioicons `microtube-open-translucent.svg` with dynamic reagent-color overlay driven by `reagents.yaml` `displayColor`. Do not render procedural circles. Do not use fixed-color microtube variants as state assets.
- Well-plate asset: 96-well plate uses `assets/equipment/96well_pcr_plate.svg` when per-well liquid layers can be applied cleanly; otherwise keep procedural well-grid rendering and document the fallback in the changelog.
