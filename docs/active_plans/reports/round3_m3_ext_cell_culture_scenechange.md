# Round 3 M3-extension: cell_culture cluster SceneChange-add pass

Date: 2026-05-22

## Scope

Applied R10's SceneChange-add pattern to the 8 cell_culture mini-protocols
identified by the M4 scene catalog coverage audit. trypan_blue_counting
was already fixed by R10 and was not modified in this pass.

For each protocol, the entry_step's first interaction `response.scene_operations`
list received a `SceneChange { to_scene: <workspace> }` as the FIRST scene
operation. Any pre-existing operations were preserved in original order
after the SceneChange.

## Per-protocol results

| protocol | target_workspace | applied | mount | activeSceneId | screenshot |
| --- | --- | --- | --- | --- | --- |
| cell_seeding_plate_setup | seeding_workspace | yes | yes | seeding_workspace | test-results/round3_m3_ext/cell_seeding_plate_setup_mounted.png |
| drug_dilution_setup | dilution_workspace | yes | yes | dilution_workspace | test-results/round3_m3_ext/drug_dilution_setup_mounted.png |
| mtt_plate_reaction | incubator_workspace | yes | yes | incubator_workspace | test-results/round3_m3_ext/mtt_plate_reaction_mounted.png |
| mtt_reagent_prep | mtt_reagent_prep_bench_workspace | yes | yes | mtt_reagent_prep_bench_workspace | test-results/round3_m3_ext/mtt_reagent_prep_mounted.png |
| mtt_solubilization_readout | mtt_solubilization_readout_bench_workspace | yes | yes | mtt_solubilization_readout_bench_workspace | test-results/round3_m3_ext/mtt_solubilization_readout_mounted.png |
| passage_pellet_reseed | hood_workspace | yes | yes | hood_workspace | test-results/round3_m3_ext/passage_pellet_reseed_mounted.png |
| plate_drug_treatment_drug_addition | plate_workspace | yes | yes | plate_workspace | test-results/round3_m3_ext/plate_drug_treatment_drug_addition_mounted.png |
| plate_drug_treatment_media_adjustment | plate_drug_treatment_media_adjustment_plate_workspace | yes | yes | plate_drug_treatment_media_adjustment_plate_workspace | test-results/round3_m3_ext/plate_drug_treatment_media_adjustment_mounted.png |

Applied: 8 of 8. Mount-success: 8 of 8.

## Failures

None.

## Method notes

- Edits made via targeted text replacement anchored on the entry step's
  step_name + first target's response block, preserving existing indentation
  (10-space `scene_operations:` header, 12-space list items, 14-space fields).
- Where the original `scene_operations` was an inline empty list `[]`, it
  was expanded to a block list with the SceneChange as the sole entry.
- Where the original `scene_operations` already had entries
  (CursorAttach, ObjectStateChange), SceneChange was inserted as the first
  list item; subsequent entries were preserved in original order.
- `pipeline/build_protocol_data.py` regenerated `generated/protocol_data.ts`
  with the new SceneChange entries embedded in each PROTOCOL_CONFIGS entry.
- `bash build_github_pages.sh` rebuilt `dist/main.js` from the regenerated
  data; tsc warnings present from earlier (widthScale unrelated) but esbuild
  bundle succeeded.
- Walker mounted each protocol via `window.SceneRuntime.loadAndMountByProtocolName(root, name)`
  served from a local `http://localhost:8765` (file:// blocks ESM dynamic
  imports). Mount success was determined by `window.__RUNTIME_PROTOCOL_CONFIG.world.activeSceneId`
  and the presence of children under `[data-testid="scene-viewport"]`.

## Contract compliance

- SceneChange is one of the five ratified scene_operation primitives
  in `docs/PRIMARY_SPEC.md`. No new vocabulary added.
- Exactly one SceneChange added per protocol, placed first per task spec.
- ASCII-only edits.

## Keep / Reject

All 8 protocols: KEEP. Each independently fixes its own mount path; all
8 now report `mounted=true` with an `activeSceneId` matching the intended
scene for the entry step.

## Files changed

- `content/protocols/cell_culture/cell_seeding_plate_setup/protocol.yaml`
- `content/protocols/cell_culture/drug_dilution_setup/protocol.yaml`
- `content/protocols/cell_culture/mtt_plate_reaction/protocol.yaml`
- `content/protocols/cell_culture/mtt_reagent_prep/protocol.yaml`
- `content/protocols/cell_culture/mtt_solubilization_readout/protocol.yaml`
- `content/protocols/cell_culture/passage_pellet_reseed/protocol.yaml`
- `content/protocols/cell_culture/plate_drug_treatment_drug_addition/protocol.yaml`
- `content/protocols/cell_culture/plate_drug_treatment_media_adjustment/protocol.yaml`

Regenerated artifacts (transitive): `generated/protocol_data.ts`,
`generated/inventory_data.ts`, `dist/main.js`, `dist/main.js.map`,
`dist/index.html`, `dist/style.css`, `dist/.nojekyll`.

## References

- [round3_m4_scene_catalog_coverage.md](round3_m4_scene_catalog_coverage.md)
- [round3_cell_counter_scenechange.md](round3_cell_counter_scenechange.md)
- `docs/PRIMARY_SPEC.md` (Scene operations section)
- `src/scene_runtime/loader/world.ts` `inferInitialScene` explicit-SceneChange disambiguation
