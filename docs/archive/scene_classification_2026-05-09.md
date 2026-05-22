# Scene classification (2026-05-09)

## Context

This doc supports Plan B / Patch B1 (WP-2.4.0) of `~/.claude/plans/sorted-kindling-swing.md`.
Plan B retires `src/bench_config.ts` and `src/hood_config.ts` by promoting per-scene YAMLs to
the single source of truth for static, declarative scene facts. Before Patch B2 extends the
`SceneConfig` schema with item-level fields, we must classify every scene by what shape of
item list (if any) the schema needs to carry for it. The plan calls out four small scenes;
this doc covers all six so the schema work in B2 has the full picture before bench (B10) and
hood (B11) migrate. Evidence is grounded in the current scene adapters under
`src/scenes/<scene>/<scene>.ts`.

## Classifications

| Scene             | Classification    | Evidence (file:line)                                                                                                                                                                                                                                                                                                                               | Schema variant            | Notes                                                                                                                                                                                            |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bench             | layout-engine     | `src/scenes/bench/bench.ts:430-434` (`resolveSceneItemsWithDepth(BENCH_SCENE_ITEMS, ...)` + `computeSceneLayout`); `src/scenes/bench/bench.ts:543-560` wires per-item click handlers via `data-item-id`                                                                                                                                            | `LayoutSceneItem[]`       | Has both interactionSequence dispatch and legacy directTool/modal dispatch; many items (microscope, incubator, plate_reader, centrifuge, water_bath, vortex, cell_counter).                      |
| cell_culture_hood | layout-engine     | `src/scenes/cell_culture_hood/render.ts:9-10` (imports `HOOD_SCENE_ITEMS`, `HOOD_LAYOUT_RULES`, `computeSceneLayout`); `src/scenes/cell_culture_hood/render.ts:260-261` calls `computeSceneLayout(HOOD_SCENE_ITEMS, ASSET_SPECS, HOOD_LAYOUT_RULES, ...)`                                                                                          | `LayoutSceneItem[]`       | Largest scene (`cell_culture_hood.yaml`, 328 lines). Has highlight derivation and wrong-order shake; click handlers wired per item.                                                              |
| incubator         | render-only-modal | `src/scenes/incubator/incubator.ts:138-140` -- `dispatchIncubatorInteraction` is an explicit no-op ("Incubator is overlay-only; no clickable items trigger interactions"); animation overlay handled by `runIncubationOverlay` at lines 31-60                                                                                                      | none                      | Passive timer/progress overlay; advances the active incubation step on completion via `triggerStep` from inside the overlay's onComplete callback (`src/scenes/incubator/incubator.ts:120-128`). |
| plate             | modal-dispatch    | `src/scenes/plate/plate.ts:135-163` `renderPlateScene` routes on `currentStep.modal.screen` to `renderPlateIntroScreen` / `renderPlateAddCarbRowBScreen`; `src/scenes/plate/plate.ts:170-186` `dispatchPlateInteraction` advances on `completionPath.advanceClick`                                                                                 | `DispatchOnlySceneItem[]` | Multiple modal screens (`plate_intro`, `plate_add_carb_row_b`); button event handlers also wired inside each render function (e.g. `submit-plate-action` at line 110).                           |
| plate_reader      | render-only-modal | `src/scenes/plate_reader/plate_reader.ts:166-170` `dispatchPlateReaderInteraction` is an explicit no-op ("Plate reader is a render-only modal scene with no item-zone interactions. All interactions are wired directly in renderPlateReaderScene")                                                                                                | none                      | Modal renders MTT 8x12 result table; close button wired inside `renderPlateReaderScene` and returns to hood via `switchScene('hood')` at line 157.                                               |
| microscope        | modal-dispatch    | `src/scenes/microscope/microscope.ts:540-552` advances on `completionPath.advanceClick` (capture-count); `src/scenes/microscope/microscope.ts:556-565` routes `modal.screen === 'viability'` -> `confirm-viability`; `src/scenes/microscope/microscope.ts:567-617` routes `modal.screen === 'counting'` -> `submit-cell-count` with quadrant tally | `DispatchOnlySceneItem[]` | Two-step manual hemocytometer flow (viability + counting) plus capture-count modal; advanceClick targets are CSS ids (e.g. `confirm-viability`, `submit-cell-count`), not scene items.           |

## Decisions and rationale

- **bench**: `BENCH_SCENE_ITEMS` and `BENCH_LAYOUT_RULES` are passed straight into
  `computeSceneLayout`; every item id is rendered as a positioned `.hood-item` div. This is
  the canonical layout-engine shape, so the YAML must carry full `LayoutSceneItem[]` after B10.
- **cell_culture_hood**: Same shape as bench (just a different config bundle). The render
  module also derives per-step highlights from `HOOD_SCENE_ITEMS`, which means the migrated
  YAML rows must keep id, asset, label, accent, depthTier, and zone fields.
- **incubator**: The scene's dispatch is a no-op and there are no clickable items; it is a
  pure animated modal. No item array is needed. The schema should not require items here.
- **plate**: The plate scene has no per-item layout; rendering switches on
  `currentStep.modal.screen` to one of two screen renderers, and dispatch advances on the
  active step's `completionPath.advanceClick`. Items here are dispatch tokens, not laid-out
  hood-style items, so the schema variant is the lighter `DispatchOnlySceneItem[]`.
- **plate_reader**: All wiring lives inside `renderPlateReaderScene`; the adapter's dispatch
  is explicitly a no-op. There is nothing for the schema to declare beyond scene identity.
- **microscope**: Like plate, microscope routes between several modal screens
  (`viability`, `counting`, plus the cell counter capture path), and dispatch is keyed on
  string ids (`confirm-viability`, `submit-cell-count`, `capture-count`). These are dispatch
  targets, not laid-out items, so `DispatchOnlySceneItem[]` is the right variant.

## Implications for B2 schema extension

Given the mix above, the `SceneConfig` schema in B2 should:

- Treat the items array as **optional**, not required. Two of six scenes (incubator,
  plate_reader) have no items at all, and forcing an empty `[]` would invite a junk
  `items: []` line in those YAMLs that future readers would have to interpret.
- Use a **discriminated union** (or two parallel optional arrays) keyed on classification:
  - `layoutItems?: LayoutSceneItem[]` for `layout-engine` scenes (bench, hood). Required
    fields per row: id, assetId, label, zone, depthTier, plus optional accent.
  - `dispatchItems?: DispatchOnlySceneItem[]` for `modal-dispatch` scenes (plate,
    microscope). Required fields per row: id (the dispatch token / advanceClick) and
    `screen` (which modal screen the row belongs to). No layout/asset/accent fields.
- Add a `classification` field on `SceneConfig` itself with the four-value enum
  (`layout-engine` | `modal-dispatch` | `render-only-modal` | `dispatch-only-item`). This
  gives the loader a quick switch to validate that exactly one of `layoutItems` /
  `dispatchItems` is populated (or neither, for `render-only-modal`).
- The plan's plain `dispatch-only-item` bucket would map to `DispatchOnlySceneItem[]` with
  a single-row array. None of the six current scenes is purely "one dispatch item, nothing
  else", so this remains a defined-but-unused shape until a future scene needs it. No new
  schema variant beyond `LayoutSceneItem` and `DispatchOnlySceneItem` is needed.
- The two `render-only-modal` scenes (incubator, plate_reader) only need the existing
  static fields (sceneId, background, etc.). They drive their content from in-render
  imperative code that B-plan does not aim to YAML-ify; the schema should not try to.
