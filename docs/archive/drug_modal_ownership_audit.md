# Drug modal ownership audit

> Read-only audit. Identifies what becomes deletable after the remaining 4
> drug steps (`carb_high_range`, `metformin_stock`, `add_carboplatin`,
> `add_metformin`) migrate from `kind: modal` to `kind: interactionSequence`.
> Pair with `sp_k2f_next_drug_steps_plan.md` and `wet_lab_classification.md`.

## 1. Current modal entry points and ownership

### Exported symbols from `src/steps/drug_treatment.ts`

| Symbol                           | Type                       | Callsites                                                                                     | Step IDs it drives today                                                                                | Dependencies                                                                                                    |
| -------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DILUTION_OPTIONS`               | const array                | `renderDilutionChoiceScreen` (l.218), `selectLowRangeDilution` (l.254)                        | `carb_low_range` (already migrated; callers dead)                                                       | none                                                                                                            |
| `DrugModalScreen`                | type alias                 | `DRUG_MODAL_SCREENS` decl                                                                     | n/a                                                                                                     | none                                                                                                            |
| `DRUG_MODAL_SCREENS`             | const Record               | `renderSingleButtonScreen` (l.180)                                                            | `carb_high_range`, `metformin_stock`, `add_carboplatin`, `add_metformin`                                | none                                                                                                            |
| `MODAL_OWNED_STEPS`              | const string[]             | `renderDrugModalStep` (l.147)                                                                 | open/close decision; 4 remaining steps                                                                  | `getModalOwnedSteps` from `step_dispatch.ts`                                                                    |
| `startDrugAddition`              | fn                         | `hood.ts:1221` (legacy `multichannel_pipette_with_drug + well_plate`); fixture only otherwise | all 4 remaining steps indirectly                                                                        | `renderDrugModalStep`                                                                                           |
| `renderDrugModalStep`            | fn                         | `startDrugAddition` (l.136), `advanceDrugModalStep` (l.284)                                   | same 4                                                                                                  | `MODAL_OWNED_STEPS`, `renderSingleButtonScreen`, `renderHoodScene`, `renderProtocolPanel`, `renderScoreDisplay` |
| `renderSingleButtonScreen`       | fn                         | `renderDrugModalStep` (l.163)                                                                 | 4 remaining                                                                                             | `DRUG_MODAL_SCREENS`, `advanceDrugModalStep`                                                                    |
| `renderDilutionChoiceScreen`     | fn                         | dead in current code                                                                          | none                                                                                                    | `DILUTION_OPTIONS`, `selectLowRangeDilution`                                                                    |
| `selectLowRangeDilution`         | fn                         | `renderDilutionChoiceScreen` only (dead)                                                      | `carb_low_range` (migrated)                                                                             | `DILUTION_OPTIONS`, `registerWarning`, `advanceDrugModalStep`                                                   |
| `advanceDrugModalStep`           | fn                         | `renderSingleButtonScreen` (l.198), `selectLowRangeDilution` (l.265 dead)                     | 4 remaining + dead path                                                                                 | `applyPlateDoseMap`, `triggerStep`, `renderDrugModalStep`                                                       |
| `registeredEmitters.add(...)` x5 | side effect at module load | `drug_treatment.ts:115-119`                                                                   | registers `carb_intermediate`, `carb_high_range`, `metformin_stock`, `add_carboplatin`, `add_metformin` | `registeredEmitters` from `game_state.ts`                                                                       |

Note: `carb_intermediate` is still registered in `registeredEmitters` (l.115) even though it migrated to `interactionSequence`. The emitter registration must move to `hood.ts` or the `carb_intermediate_complete` event must be confirmed covered there.

### Modal infrastructure in `hood.ts`

| Location                           | Description                                                                                                                                 | Step IDs      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| import `startDrugAddition` (l.15)  | entry point import                                                                                                                          | all 4         |
| `onItemClick` ll.1204-1222         | legacy route: `multichannel_pipette` -> `drug_vials` sets `multichannel_pipette_with_drug`; then + `well_plate` calls `startDrugAddition()` | 4 modal steps |
| `getAvailableActions` ll.1427-1434 | hint text for `carb_intermediate`, `carb_high_range`, `metformin_stock`, `add_carboplatin`                                                  | same 4        |

The `openClick: multichannel_pipette` field is the YAML signal; the actual click routing lives in the `hood.ts` legacy `onItemClick` path, NOT in `dispatchInteractionClick` (which only handles `interactionSequence`).

## 2. Per-step side effects to preserve

- **`add_carboplatin` (drug_treatment.ts ll.273-278):** `applyPlateDoseMap()` + `gameState.drugsAdded = true` run before `triggerStep('add_carboplatin')`. After migration, wire to `completionEvent: 'carb-add-confirm'` in `dispatchInteractionClick` (same pattern as `spray_ethanol`, `pbs_wash`). Must precede `triggerStep`.
- **`add_metformin`:** no side effects beyond `triggerStep`. Pure advance.
- **`carb_high_range`, `metformin_stock`:** no special side effects.

## 3. What becomes dead after all 5 drug steps migrate

| Symbol / branch                                      | Reason                                                                         | File:line                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| `startDrugAddition`                                  | sole callsite is `hood.ts:1221`; that branch goes dead                         | `drug_treatment.ts:131`, `hood.ts:15,1221` |
| `renderDrugModalStep`                                | only called by `startDrugAddition` and `advanceDrugModalStep`, both dead       | `drug_treatment.ts:142`                    |
| `renderSingleButtonScreen`                           | only called by `renderDrugModalStep`                                           | `drug_treatment.ts:179`                    |
| `renderDilutionChoiceScreen`                         | already dead                                                                   | `drug_treatment.ts:210`                    |
| `selectLowRangeDilution`                             | already dead                                                                   | `drug_treatment.ts:253`                    |
| `advanceDrugModalStep`                               | callers all dead                                                               | `drug_treatment.ts:272`                    |
| `MODAL_OWNED_STEPS`                                  | only used in `renderDrugModalStep`                                             | `drug_treatment.ts:124`                    |
| `DRUG_MODAL_SCREENS`                                 | only used in `renderSingleButtonScreen`                                        | `drug_treatment.ts:65`                     |
| `DILUTION_OPTIONS`                                   | already dead                                                                   | `drug_treatment.ts:34`                     |
| `DrugModalScreen`                                    | only used in `DRUG_MODAL_SCREENS` decl                                         | `drug_treatment.ts:58`                     |
| `registeredEmitters.add(...)` x5                     | wrong home post-migration; move emitter registration to handler site (hood.ts) | `drug_treatment.ts:115-119`                |
| `import { startDrugAddition }` in hood.ts            | unused                                                                         | `hood.ts:15`                               |
| `multichannel_pipette -> drug_vials` block           | sets `multichannel_pipette_with_drug`                                          | `hood.ts:1204-1216`                        |
| `multichannel_pipette_with_drug -> well_plate` block | calls `startDrugAddition()`                                                    | `hood.ts:1219-1223`                        |
| `drug_vials` SVG case in `getItemSvgHtml`            | unreachable if no step lists `drug_vials`                                      | `hood.ts:278`                              |
| toolbar hint for `multichannel_pipette_with_drug`    | dead branch                                                                    | `hood.ts:468`                              |
| `getAvailableActions` cases for the 4 modal step ids | hint strings for migrated steps                                                | `hood.ts:1422-1434`                        |
| entire `drug_treatment.ts` file                      | empty after symbol removals                                                    | full file                                  |

The test at `tests/playwright/e2e/test_step_dispatch.mjs:47-75` asserts `getModalOwnedSteps('drug_treatment')` returns 6 steps; after full migration the count drops to 0. Update or remove that block.

## 4. What stays

| Symbol                                                         | Reason                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `getModalOwnedSteps` in `step_dispatch.ts`                     | still needed for `microscope` owner (`count_cells`), `plate_read`, `results`. Generic fn. |
| `isModalOwnedStep`, `getModalOwnerForStep`                     | same                                                                                      |
| `applyPlateDoseMap` in `steps/plate_96.ts`                     | still called; move callsite to `hood.ts` `carb-add-confirm` handler                       |
| `protocol_walkthrough_yaml.mjs` `drug_treatment` walker branch | needs update to expect `interactionSequence`, not modal                                   |
| `drug_vials` item in items.yaml                                | depends on whether any migrated step's `requiredItems` keeps it; if not, delete           |

## 5. Suggested cleanup patch order

**With the last migration (add_metformin):**

- Move `applyPlateDoseMap()` + `gameState.drugsAdded = true` to the `carb-add-confirm` handler in `dispatchInteractionClick`.
- Delete `src/steps/drug_treatment.ts` entirely.
- Remove `import { startDrugAddition }` from `hood.ts:15`.
- Remove the two legacy hood.ts blocks (1204-1216, 1219-1223).
- Remove the `multichannel_pipette_with_drug` toolbar hint (l.468).
- Remove `getAvailableActions` cases (1422-1434).
- Move any still-needed `registeredEmitters.add()` calls to `hood.ts`.

**Follow-up patch:**

- Update or delete `test_step_dispatch.mjs:47-75`.
- Update walker's `drug_treatment` branch in `protocol_walkthrough_yaml.mjs`.
- Audit `drug_vials` usage; if unused, remove from items.yaml + the SVG case.
- Confirm `carb_intermediate_complete` emitter wiring after `drug_treatment.ts` is gone.
