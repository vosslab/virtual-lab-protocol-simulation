# well_plate_workspace plan: paused

Date paused: 2026-05-12.

## Status

This plan is stopped. The mini-tutorial `tutorial_plate_drug_additions` and the
`well_plate_workspace` scene it targets are NOT pedagogically complete or
interaction-complete. Do not treat the current implementation as a finished
reference for new scene work. Do not continue patching interaction issues
inside this plan; the remaining problems are scene-engine and interaction-design
problems, not protocol-content problems.

The repo is left in a buildable state (see "Verification baseline at pause"
below). Useful artifacts produced by this plan are recorded under "Useful
artifacts to reuse later." Unverified or failed pieces are recorded under
"Do not trust." The intended next step is a new scene-system plan, not a
continuation of this plan.

## Verification baseline at pause

The repo is buildable as of the pause date. The verification commands and
their expected results:

- `source source_me.sh && npx tsc --noEmit -p src/tsconfig.json` -> exit 0.
- `source source_me.sh && pytest tests/` -> 417 passed.
- `source source_me.sh && python3 tools/build_protocol_data.py` -> clean.
- `npm run build` -> clean (`dist/main.js` around 911 KB).

`pytest` baseline dropped from 424 to 417 during the plan because
`tests/playwright/test_dilution_prep.mjs` was deleted as part of the
procedural -> Bioicons microtube swap (the deleted tests targeted the
procedural-circle code path that no longer exists). The drop is verified, not
silent.

## Useful artifacts to reuse later

These pieces produced during the plan are worth keeping for future scene-system
work. Each one is independently usable.

- multipleChoice schema and popup infrastructure
  - Step-kind `multipleChoice` in protocol YAML.
  - Validator support in `tools/build_protocol_data.py`.
  - Renderer primitive `src/scenes/shared/multiple_choice_prompt.ts` that
    emits `.mc-choice-button` elements with `data-item-id` for each choice.
  - Pedagogically useful for calculation-prompt steps regardless of scene.

- tubeTargets schema and validator
  - Step-kind metadata `tubeTargets` declaring source, diluent, destination,
    soluteVolumeMl, diluentVolumeMl, resultLiquid, resultLabel.
  - Validator gates source/diluent/destination/reagent identity and length
    invariants in `tools/build_protocol_data.py`.
  - Documented in `docs/PROTOCOL_STEPS.md` "Tube-target dilution prep steps".

- plateTargets schema and validator
  - Step-kind metadata `plateTargets` declaring rows/cols/liquid/volume/label
    per target group, validated against the 96-well layout.

- Reagent-driven liquid state idea
  - Per-microtube and per-well liquid state stored in `gameState.tubeLiquids`
    and `gameState.plateLiquids` with helpers (`addTubeLiquid`,
    `addWellLiquid`, `getTubeLiquids`, `getWellLiquids`, `clearTubeLiquids`).
  - Fill color is reagent identity (from `reagents.yaml` `displayColor`);
    outline is state. This convention is documented in
    `docs/PIPETTE_LIQUID_CONVENTION.md` and is sound; the renderer wiring on
    top of it is what is unreliable, not the state model.

- Bioicons asset normalization pipeline
  - Copy Bioicons SVG into `assets/equipment/<name>.svg`, register an alias
    in `EQUIPMENT_ASSETS` and a switch case in `renderEquipmentSvg` and the
    pipeline emits a generated `SVG_<NAME>` constant with namespaced ids.
  - Documented in `docs/SVG_PIPELINE.md` "Bioicons facade aliases".
  - Two assets shipped (`microtube_open_translucent`, `bottle_medium_pink`);
    the procedure is generic.

- Focused tutorial content direction
  - Stock-solution / intermediate-dilution / working-solution terminology is
    settled in `docs/PROTOCOL_VOCABULARY.md`.
  - 16-step skeleton in `src/content/tutorial_plate_drug_additions/` lays out
    open -> calc popups -> dilution prep -> skip-middle transition -> media
    adjustment -> row transfers -> review_loaded_plate. The shape is right;
    only the interaction layer underneath it is unreliable.
  - items.yaml is clean (no incubator, no `&micro;` entities, Unicode `µ` in
    labels, asset aliases for the new Bioicons items).

- Walker regression assertion for scene isolation
  - The walker in `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` asserts
    that `tutorial_plate_drug_additions` never transitions to hood, bench, or
    incubator. The assertion logic is reusable for any future mini-tutorial
    that wants to be scoped to a single scene.

- Launcher routing fix
  - `createInitialGameState` in `src/game_state.ts` now derives `activeScene`
    from `PROTOCOL_STEPS[0].scene` instead of hardcoding `'hood'`. Any future
    tutorial whose first step declares a non-hood scene benefits.

- Shared `next-target-pulse` keyframe
  - Promoted out of hood-only scope into a scene-agnostic primitive at the
    top of `src/style.css`. `.is-next-target` and `.equipment-active` both
    consume it. Useful, but see the "Do not trust" entry about whether all
    scenes actually opt in.

## Do not trust

These pieces were produced during the plan but are unverified or known to
behave incorrectly. Future work should not assume they are correct without
re-verifying.

- Clicking is not reliable end-to-end
  - Walker confirms that clicking the active source bottle on step 6
    (`prep_carb_first_dilution`) advances state. Walker did NOT exercise the
    full step chain to `review_loaded_plate`. Discharge clicks on the
    microtube, subsequent load clicks, and the entire plate-transfer half of
    the protocol have not been walker-verified end-to-end.
  - Multi-tube `tubeTargets` (more than one target per step) has not been
    walker-verified.
  - The `autoFillTubes` engine hook on the skip-middle transition step is
    declared in the YAML but has not been verified to actually pre-fill the
    middle tubes' visible state.
  - Discharge into a microtube uses `addTubeLiquid` correctly per code review,
    but the visible reagent-colored fill inside the Bioicons tube SVG has not
    been screenshot-verified.

- Pulse / highlight behavior may not use the same interaction primitive as the hood
  - The `next-target-pulse` keyframe is centralized. The `.is-next-target`
    rule is now scene-agnostic (no `.hood-item` parent prefix). But:
    - Bench, microscope, plate_reader, and incubator scenes do NOT currently
      emit `.is-next-target` on their active items. They have their own
      affordance mechanisms. The shared primitive is available; the adoption
      across scenes is not.
    - well_plate_workspace uses `.equipment-active`, aliased to the same
      animation. Whether `.equipment-active` should be retired in favor of
      `.is-next-target` is unresolved.
  - The hood's pointer-events block is still scoped to `#hood-items-layer`
    and uses a different selector pattern than the workspace's
    `.scene-object.equipment-dim` rule. There is no single "inactive items
    cannot be clicked" primitive yet.

- Scene layout lacks stable design invariants
  - `docs/archive/LAYOUT_METRICS.md` defines pixel-level layout invariants for hood
    and bench (widthScale ratios, occupancy thresholds, overlap budgets,
    empty-space fraction, pipette-height constraint) and enforces them via
    `devel/test_layout_metrics.mjs`. There is no equivalent for
    well_plate_workspace.
  - The CSS grid (`180px 1fr 2fr` / two rows) used by the workspace is a
    guess. The 4 pipettes stack vertically in a 180 px column with a 1:3
    aspect ratio (multichannel pipette), which crowds them. The plate area
    proportions vs the popup overlay are unverified.
  - The five-region contract (tool / source / rack / plate / popup) is
    documented in `focused_well_plate_workspace_plan.md` but has no automated
    visual gate.

- Render and dispatch contracts are not clearly specified
  - `src/scenes/well_plate_workspace/render.ts` and `dispatch.ts` evolved
    by patching. The render emits static + dynamic equipment, computes
    `activeClickTarget` from the current interaction, and applies emphasis
    classes; the dispatch handles `multipleChoice`, legacy modal,
    `tubeTargets`, and `plateTargets` branches. None of this is captured in
    a contract doc.
  - The interaction model is implicit: load click sets `heldLiquid` via
    `stateChange.heldLiquid` in the step YAML; discharge click pours via
    `addTubeLiquid` / `addWellLiquid`. The pipette `tool` field is logical
    only and is NOT a click target. This contract is not documented and was
    discovered by walker-verification, not by spec.
  - `well_plate_workspace.yaml` declares `capabilities: []`. The scene
    bypasses the capability system entirely. Whether the workspace should
    define a new capability or stay adapter-only is unresolved.

- Visual proof gate did not complete
  - `WP-C1-VISUAL` (task #61) was attempted multiple times. Each iteration
    surfaced a real gap (hood-nav, activeTargets, render scene-id mismatch,
    capability/zone, harness selector, popup-step capture window). Each was
    fixed. The gate was never re-run after the final batch of fixes and
    was NOT marked complete.
  - `WP-G1` (full visual review) was never attempted.

- Breadcrumb metadata
  - The UI breadcrumb shows "Day 1 > Unknown Part > Step N" for the mini-
    tutorial despite the protocol declaring a labelled part. The
    metadata-to-breadcrumb wiring was not traced.

- distilled_water item retained but unused
  - The items.yaml entry for `distilled_water` is still present. After the
    "working solutions in media" pedagogy decision, no step references it as
    a diluent. Removing it would require care because the
    `EQUIPMENT_ASSETS` facade alias still exists; future cleanup needs to
    audit both surfaces together.

## Why the work is paused

Each round of manager-direct fixes inside this plan surfaced another lower-
level scene-engine problem (launcher initial scene, click-target
derivation, capability schema, pointer-events scoping, pulse-keyframe
duplication, missing tubeTargets dispatch branch, missing mc click handler,
microtube data-attribute mismatch). The fixes worked individually, but the
pattern shows the underlying scene interaction model is not specified well
enough to support a new scene cleanly. Continuing to patch the mini-tutorial
in-place keeps producing fragile coverage and false confidence.

The mini-tutorial is also pedagogically incomplete: the dilution-prep flow
has not been student-tested, the skip-middle transition has not been visually
verified, and the plate-transfer half of the protocol has not been
walker-verified at all.

The next step is a separate scene-system plan that nails down:

- one stable render contract per scene (what regions exist, what items
  render in each, when),
- one stable dispatch contract per scene (which click is the active target,
  what state mutation happens, how the step advances),
- one stable visual contract (active vs dim vs future, cursor, pointer-
  events, pulse) shared across all scenes,
- a per-scene layout invariant doc analogous to `docs/archive/LAYOUT_METRICS.md` for
  hood/bench,
- a screenshot gate that runs against the contract, not against a specific
  protocol's content.

Once that lower-level work exists, the mini-tutorial can be re-attempted on
top of it.

## What NOT to do

- Do not mark `WP-G1`, `WP-C1-VISUAL`, `WP-Bottle-Swap`, or breadcrumb
  cleanup complete.
- Do not claim the mini-tutorial is pedagogically complete.
- Do not run `WP-G1`, `WP-C1-VISUAL`, `WP-Bottle-Swap`, or breadcrumb
  cleanup as a continuation of this plan.
- Do not patch interaction issues by manager-direct fixes inside this plan.
  Any further interaction work is part of the new scene-system plan, not
  this one.

## Pointers

- Original plan: `focused_well_plate_workspace_plan.md` at the repo root.
- Earlier plan: `/Users/vosslab/.claude/plans/pure-moseying-ember.md`.
- Tutorial content: `src/content/tutorial_plate_drug_additions/`.
- Scene code: `src/scenes/well_plate_workspace/`.
- Shared primitives: top of `src/style.css` ("Shared scene primitives"),
  `src/scenes/shared/multiple_choice_prompt.ts`,
  `src/scenes/shared/liquid_transfer.ts`.
- Walker: `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` (carries the
  scene-isolation assertion for `tutorial_plate_drug_additions`).
- Diagnostic scripts (manager-side, not propagated): `tests/playwright/
  debug_workspace_render.mjs`, `tests/playwright/debug_step6_dispatch.mjs`.
- Changelog entries: `docs/CHANGELOG.md` 2026-05-11 and 2026-05-12 day
  blocks carry the per-task summary trail.
