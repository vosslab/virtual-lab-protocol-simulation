# TypeScript legacy reachability audit

M2-AUDIT pass for `/Users/vosslab/.claude/plans/and-familiarize-yourself-with-magical-whale.md`.
Entry point: `src/scene_runtime/bundle/entry.ts`.
Read-only audit; no source edits performed.

## Summary counts

- Total tracked .ts/.tsx files under `src/`: 93
- REACHABLE from bundle entry: 32
- UNREACHABLE (not reached from bundle, not reached from tests): 61
- TEST-ONLY (unreachable from bundle, reached from `tests/`): 0
- Surprises (plan expected UNREACHABLE but found REACHABLE): 4

## Surprises

Four files listed in the plan as expected-UNREACHABLE are in fact REACHABLE
through a TYPE-ONLY chain that originates in `generated/protocol_data.ts`:

| path                 | import chain (file <- importer ... <- entry)                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/protocol.ts`    | `src/protocol.ts <- src/game_state.ts <- src/constants.ts <- generated/protocol_data.ts <- src/scene_runtime/bundle/entry.ts`    |
| `src/inventory.ts`   | `src/inventory.ts <- src/game_state.ts <- src/constants.ts <- generated/protocol_data.ts <- src/scene_runtime/bundle/entry.ts`   |
| `src/game_state.ts`  | `src/game_state.ts <- src/constants.ts <- generated/protocol_data.ts <- src/scene_runtime/bundle/entry.ts`                       |
| `src/scene_types.ts` | `src/scene_types.ts <- src/game_state.ts <- src/constants.ts <- generated/protocol_data.ts <- src/scene_runtime/bundle/entry.ts` |

Notes for M2-DELETE:

- `entry.ts` does a dynamic `await import('../../../generated/protocol_data')`
  for runtime catalog injection. `generated/protocol_data.ts` line 3 does
  `import type { ProtocolStep } from "../src/constants"` (type-only).
- `src/constants.ts` line 6 does `import type { GameState } from "./game_state"`
  (type-only). `src/game_state.ts` pulls in `src/protocol.ts`, `src/inventory.ts`,
  and `src/scene_types.ts`.
- The whole subgraph (`protocol.ts`, `inventory.ts`, `game_state.ts`,
  `scene_types.ts`, plus `constants.ts` itself) is reached only through type
  imports plus the single live runtime import of `generated/protocol_data.ts`.
  If the `ProtocolStep` type import in `generated/protocol_data.ts` is replaced
  with a local definition (or dropped), all four surprise files plus
  `src/constants.ts` become candidates for deletion. Until that change ships,
  these five files must NOT be deleted -- removing them will break
  `tsc --noEmit` on the bundle entry chain.
- `src/constants.ts` is itself REACHABLE for the same reason and is not in the
  delete list below; flag it on the M2-DELETE follow-up if the generated type
  import is decoupled.

## Reachability map

### src/ (root)

| path                          | category    | imported-by-count | notes |
| ----------------------------- | ----------- | ----------------- | ----- |
| `src/asset_specs.ts`          | UNREACHABLE | 0                 |       |
| `src/brands.ts`               | UNREACHABLE | 0                 |       |
| `src/cell_model.ts`           | UNREACHABLE | 0                 |       |
| `src/constants.ts`            | REACHABLE   | 4                 |       |
| `src/css.d.ts`                | UNREACHABLE | 0                 |       |
| `src/game_state.ts`           | REACHABLE   | 2                 |       |
| `src/init.ts`                 | UNREACHABLE | 0                 |       |
| `src/interaction_resolver.ts` | UNREACHABLE | 0                 |       |
| `src/inventory.ts`            | REACHABLE   | 2                 |       |
| `src/layout_engine.ts`        | UNREACHABLE | 0                 |       |
| `src/legacy_tc_tools.ts`      | UNREACHABLE | 0                 |       |
| `src/legacy_tc_validate.ts`   | UNREACHABLE | 0                 |       |
| `src/plate_config.ts`         | UNREACHABLE | 0                 |       |
| `src/professor_overlay.ts`    | UNREACHABLE | 0                 |       |
| `src/protocol.ts`             | REACHABLE   | 2                 |       |
| `src/protocol_ui.ts`          | UNREACHABLE | 0                 |       |
| `src/scene_configs.ts`        | UNREACHABLE | 0                 |       |
| `src/scene_types.ts`          | REACHABLE   | 2                 |       |
| `src/scoring.ts`              | UNREACHABLE | 0                 |       |
| `src/step_dispatch.ts`        | UNREACHABLE | 0                 |       |
| `src/style_constants.ts`      | UNREACHABLE | 0                 |       |
| `src/svg_assets.ts`           | UNREACHABLE | 0                 |       |
| `src/svg_color_patch.ts`      | UNREACHABLE | 0                 |       |
| `src/svg_overlays.ts`         | UNREACHABLE | 0                 |       |
| `src/svg_recipes.ts`          | UNREACHABLE | 0                 |       |
| `src/types.ts`                | UNREACHABLE | 0                 |       |
| `src/ui_rendering.ts`         | UNREACHABLE | 0                 |       |

### src/scene_runtime/

| path                            | category  | imported-by-count | notes |
| ------------------------------- | --------- | ----------------- | ----- |
| `src/scene_runtime/contract.ts` | REACHABLE | 2                 |       |
| `src/scene_runtime/types.ts`    | REACHABLE | 24                |       |

### src/scene_runtime/adapters/

| path                                              | category  | imported-by-count | notes |
| ------------------------------------------------- | --------- | ----------------- | ----- |
| `src/scene_runtime/adapters/well_plate/index.ts`  | REACHABLE | 1                 |       |
| `src/scene_runtime/adapters/well_plate/render.ts` | REACHABLE | 1                 |       |

### src/scene_runtime/bundle/

| path                                | category  | imported-by-count | notes        |
| ----------------------------------- | --------- | ----------------- | ------------ |
| `src/scene_runtime/bundle/entry.ts` | REACHABLE | 0                 | bundle entry |

### src/scene_runtime/chrome/

| path                                        | category  | imported-by-count | notes |
| ------------------------------------------- | --------- | ----------------- | ----- |
| `src/scene_runtime/chrome/adjust_panel.ts`  | REACHABLE | 1                 |       |
| `src/scene_runtime/chrome/feedback_area.ts` | REACHABLE | 1                 |       |
| `src/scene_runtime/chrome/next_button.ts`   | REACHABLE | 1                 |       |
| `src/scene_runtime/chrome/prompt_panel.ts`  | REACHABLE | 1                 |       |
| `src/scene_runtime/chrome/scene_frame.ts`   | REACHABLE | 1                 |       |

### src/scene_runtime/dispatch/

| path                                   | category    | imported-by-count | notes |
| -------------------------------------- | ----------- | ----------------- | ----- |
| `src/scene_runtime/dispatch/adjust.ts` | REACHABLE   | 1                 |       |
| `src/scene_runtime/dispatch/click.ts`  | REACHABLE   | 2                 |       |
| `src/scene_runtime/dispatch/index.ts`  | UNREACHABLE | 0                 |       |

### src/scene_runtime/highlight/

| path                                   | category    | imported-by-count | notes |
| -------------------------------------- | ----------- | ----------------- | ----- |
| `src/scene_runtime/highlight/index.ts` | UNREACHABLE | 0                 |       |

### src/scene_runtime/layout/

| path                                             | category  | imported-by-count | notes |
| ------------------------------------------------ | --------- | ----------------- | ----- |
| `src/scene_runtime/layout/adapter.ts`            | REACHABLE | 2                 |       |
| `src/scene_runtime/layout/css_native_adapter.ts` | REACHABLE | 2                 |       |
| `src/scene_runtime/layout/feature_flags.ts`      | REACHABLE | 4                 |       |
| `src/scene_runtime/layout/index.ts`              | REACHABLE | 3                 |       |
| `src/scene_runtime/layout/layout_engine.ts`      | REACHABLE | 4                 |       |
| `src/scene_runtime/layout/types.ts`              | REACHABLE | 8                 |       |

### src/scene_runtime/liquid/

| path                                | category    | imported-by-count | notes |
| ----------------------------------- | ----------- | ----------------- | ----- |
| `src/scene_runtime/liquid/index.ts` | UNREACHABLE | 0                 |       |

### src/scene_runtime/loader/

| path                                   | category    | imported-by-count | notes |
| -------------------------------------- | ----------- | ----------------- | ----- |
| `src/scene_runtime/loader/index.ts`    | REACHABLE   | 1                 |       |
| `src/scene_runtime/loader/material.ts` | UNREACHABLE | 0                 |       |
| `src/scene_runtime/loader/object.ts`   | REACHABLE   | 1                 |       |
| `src/scene_runtime/loader/protocol.ts` | REACHABLE   | 1                 |       |
| `src/scene_runtime/loader/scene.ts`    | REACHABLE   | 3                 |       |
| `src/scene_runtime/loader/world.ts`    | REACHABLE   | 3                 |       |

### src/scene_runtime/render/

| path                                     | category    | imported-by-count | notes |
| ---------------------------------------- | ----------- | ----------------- | ----- |
| `src/scene_runtime/render/apply.ts`      | REACHABLE   | 1                 |       |
| `src/scene_runtime/render/clock.ts`      | REACHABLE   | 2                 |       |
| `src/scene_runtime/render/request.ts`    | UNREACHABLE | 0                 |       |
| `src/scene_runtime/render/scene.ts`      | REACHABLE   | 1                 |       |
| `src/scene_runtime/render/svg_loader.ts` | REACHABLE   | 1                 |       |
| `src/scene_runtime/render/types.ts`      | UNREACHABLE | 0                 |       |

### src/scenes/

| path                           | category    | imported-by-count | notes |
| ------------------------------ | ----------- | ----------------- | ----- |
| `src/scenes/scene_driver.ts`   | UNREACHABLE | 0                 |       |
| `src/scenes/scene_registry.ts` | UNREACHABLE | 0                 |       |

### src/scenes/bench/

| path                           | category    | imported-by-count | notes |
| ------------------------------ | ----------- | ----------------- | ----- |
| `src/scenes/bench/bench.ts`    | UNREACHABLE | 0                 |       |
| `src/scenes/bench/dispatch.ts` | UNREACHABLE | 0                 |       |
| `src/scenes/bench/render.ts`   | UNREACHABLE | 0                 |       |

### src/scenes/capabilities/

| path                                                 | category    | imported-by-count | notes |
| ---------------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/capabilities/grid_counting_workspace.ts` | UNREACHABLE | 0                 |       |
| `src/scenes/capabilities/incubator_workspace.ts`     | UNREACHABLE | 0                 |       |
| `src/scenes/capabilities/instrument_workspace.ts`    | UNREACHABLE | 0                 |       |
| `src/scenes/capabilities/item_workspace.ts`          | UNREACHABLE | 0                 |       |
| `src/scenes/capabilities/modal_workspace.ts`         | UNREACHABLE | 0                 |       |
| `src/scenes/capabilities/plate_reader_workspace.ts`  | UNREACHABLE | 0                 |       |

### src/scenes/cell_culture_hood/

| path                                                | category    | imported-by-count | notes |
| --------------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/cell_culture_hood/cell_culture_hood.ts` | UNREACHABLE | 0                 |       |
| `src/scenes/cell_culture_hood/hood_shared.ts`       | UNREACHABLE | 0                 |       |
| `src/scenes/cell_culture_hood/render.ts`            | UNREACHABLE | 0                 |       |

### src/scenes/incubator/

| path                                | category    | imported-by-count | notes |
| ----------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/incubator/incubator.ts` | UNREACHABLE | 0                 |       |

### src/scenes/microscope/

| path                                            | category    | imported-by-count | notes |
| ----------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/microscope/manual_hemocytometer.ts` | UNREACHABLE | 0                 |       |
| `src/scenes/microscope/microscope.ts`           | UNREACHABLE | 0                 |       |

### src/scenes/plate_reader/

| path                                      | category    | imported-by-count | notes |
| ----------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/plate_reader/plate_reader.ts` | UNREACHABLE | 0                 |       |

### src/scenes/shared/

| path                                          | category    | imported-by-count | notes |
| --------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/shared/liquid_transfer.ts`        | UNREACHABLE | 0                 |       |
| `src/scenes/shared/multiple_choice_prompt.ts` | UNREACHABLE | 0                 |       |
| `src/scenes/shared/scene_item_lookup.ts`      | UNREACHABLE | 0                 |       |
| `src/scenes/shared/wrong_order_feedback.ts`   | UNREACHABLE | 0                 |       |

### src/scenes/well_plate_96_zoom/

| path                                                  | category    | imported-by-count | notes |
| ----------------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts` | UNREACHABLE | 0                 |       |

### src/scenes/well_plate_workspace/

| path                                                      | category    | imported-by-count | notes |
| --------------------------------------------------------- | ----------- | ----------------- | ----- |
| `src/scenes/well_plate_workspace/dispatch.ts`             | UNREACHABLE | 0                 |       |
| `src/scenes/well_plate_workspace/plate_liquid_state.ts`   | UNREACHABLE | 0                 |       |
| `src/scenes/well_plate_workspace/render.ts`               | UNREACHABLE | 0                 |       |
| `src/scenes/well_plate_workspace/tube_layout.ts`          | UNREACHABLE | 0                 |       |
| `src/scenes/well_plate_workspace/tube_state.ts`           | UNREACHABLE | 0                 |       |
| `src/scenes/well_plate_workspace/well_plate_workspace.ts` | UNREACHABLE | 0                 |       |

### src/steps/

| path                          | category    | imported-by-count | notes |
| ----------------------------- | ----------- | ----------------- | ----- |
| `src/steps/drug_treatment.ts` | UNREACHABLE | 0                 |       |
| `src/steps/feed_cells.ts`     | UNREACHABLE | 0                 |       |
| `src/steps/mtt_readout.ts`    | UNREACHABLE | 0                 |       |
| `src/steps/plate_96.ts`       | UNREACHABLE | 0                 |       |

## Delete recommendation (UNREACHABLE files)

Flat list ready for `git rm`. Excludes TEST-ONLY files.

```
src/asset_specs.ts
src/brands.ts
src/cell_model.ts
src/css.d.ts
src/init.ts
src/interaction_resolver.ts
src/layout_engine.ts
src/legacy_tc_tools.ts
src/legacy_tc_validate.ts
src/plate_config.ts
src/professor_overlay.ts
src/protocol_ui.ts
src/scene_configs.ts
src/scene_runtime/dispatch/index.ts
src/scene_runtime/highlight/index.ts
src/scene_runtime/liquid/index.ts
src/scene_runtime/loader/material.ts
src/scene_runtime/render/request.ts
src/scene_runtime/render/types.ts
src/scenes/bench/bench.ts
src/scenes/bench/dispatch.ts
src/scenes/bench/render.ts
src/scenes/capabilities/grid_counting_workspace.ts
src/scenes/capabilities/incubator_workspace.ts
src/scenes/capabilities/instrument_workspace.ts
src/scenes/capabilities/item_workspace.ts
src/scenes/capabilities/modal_workspace.ts
src/scenes/capabilities/plate_reader_workspace.ts
src/scenes/cell_culture_hood/cell_culture_hood.ts
src/scenes/cell_culture_hood/hood_shared.ts
src/scenes/cell_culture_hood/render.ts
src/scenes/incubator/incubator.ts
src/scenes/microscope/manual_hemocytometer.ts
src/scenes/microscope/microscope.ts
src/scenes/plate_reader/plate_reader.ts
src/scenes/scene_driver.ts
src/scenes/scene_registry.ts
src/scenes/shared/liquid_transfer.ts
src/scenes/shared/multiple_choice_prompt.ts
src/scenes/shared/scene_item_lookup.ts
src/scenes/shared/wrong_order_feedback.ts
src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts
src/scenes/well_plate_workspace/dispatch.ts
src/scenes/well_plate_workspace/plate_liquid_state.ts
src/scenes/well_plate_workspace/render.ts
src/scenes/well_plate_workspace/tube_layout.ts
src/scenes/well_plate_workspace/tube_state.ts
src/scenes/well_plate_workspace/well_plate_workspace.ts
src/scoring.ts
src/step_dispatch.ts
src/steps/drug_treatment.ts
src/steps/feed_cells.ts
src/steps/mtt_readout.ts
src/steps/plate_96.ts
src/style_constants.ts
src/svg_assets.ts
src/svg_color_patch.ts
src/svg_overlays.ts
src/svg_recipes.ts
src/types.ts
src/ui_rendering.ts
```
