# Blank scene gap report

WP-DIAG-1, M0. Produced 2026-05-28 against a fresh `bash build_github_pages.sh` build.

## Summary

Total protocols: 31 (26 mini_protocol, 5 sequence_runner).

| result_class | count |
| --- | --- |
| OK | 22 |
| scene-missing | 4 |
| unresolved | 5 |
| renders-empty | 0 |
| svg-gap | 0 |

Build final status: `Built dist/ (GitHub Pages-ready).`

Generator output: `Generated generated/scenes.ts with 31 scenes (6 base, 25 per-protocol), 14 skipped`

## Per-protocol table

| protocol_name | protocol_type | cluster | entry_step | step_scene | first_scenechange | resolved_scene | scene_key_exists | item_count | missing_svg_count | result_class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cell_seeding_plate_setup | mini_protocol | cell_culture | calculate_dilution_volume | none | seeding_workspace | seeding_workspace | True | 12 | 0 | OK |
| drug_dilution_setup | mini_protocol | cell_culture | prepare_carb_parent_stock | none | dilution_workspace | dilution_workspace | True | 11 | 0 | OK |
| mtt_plate_reaction | mini_protocol | cell_culture | gather_mtt_materials | none | incubator_workspace | incubator_workspace | True | 8 | 0 | OK |
| mtt_reagent_prep | mini_protocol | cell_culture | pick_up_mtt_powder | none | mtt_reagent_prep_bench_workspace | mtt_reagent_prep_bench_workspace | True | 7 | 0 | OK |
| mtt_solubilization_readout | mini_protocol | cell_culture | add_dmso_to_wells | none | mtt_solubilization_readout_bench_workspace | mtt_solubilization_readout_bench_workspace | True | 5 | 0 | OK |
| passage_hood_detachment | mini_protocol | cell_culture | inspect_confluence | none | passage_hood_detachment_microscope_view | passage_hood_detachment_microscope_view | True | 2 | 0 | OK |
| passage_pellet_reseed | mini_protocol | cell_culture | transfer_to_conical | none | hood_workspace | hood_workspace | True | 10 | 0 | OK |
| plate_drug_treatment_drug_addition | mini_protocol | cell_culture | add_carb_row_b | none | plate_workspace | plate_workspace | True | 8 | 0 | OK |
| plate_drug_treatment_media_adjustment | mini_protocol | cell_culture | adjust_media_quadrant_a1_h6 | none | plate_drug_treatment_media_adjustment_plate_workspace | plate_drug_treatment_media_adjustment_plate_workspace | True | 7 | 0 | OK |
| trypan_blue_counting | mini_protocol | cell_culture | add_trypan_blue_to_chamber | none | cell_counter_workspace | cell_counter_workspace | True | 5 | 0 | OK |
| cell_culture_full | sequence_runner | runners | inspect_confluence | none | none | UNRESOLVED | False | 0 | 0 | unresolved |
| routine_passage | sequence_runner | runners | inspect_confluence | none | none | UNRESOLVED | False | 0 | 0 | unresolved |
| sdspage_full | sequence_runner | runners | dilute_10x_concentrate | none | none | UNRESOLVED | False | 0 | 0 | unresolved |
| sdspage_load_samples_batch | sequence_runner | runners | swap_tip | none | none | UNRESOLVED | False | 0 | 0 | unresolved |
| sdspage_prepare_sample_mix_batch | sequence_runner | runners | add_protein_sample | none | none | UNRESOLVED | False | 0 | 0 | unresolved |
| sdspage_assemble_electrode_module | mini_protocol | sdspage | open_wing_clamps | none | electrophoresis_bench | electrophoresis_bench | False | 0 | 0 | scene-missing |
| sdspage_attach_lid_and_leads | mini_protocol | sdspage | secure_apparatus | none | sdspage_attach_lid_and_leads_workspace | sdspage_attach_lid_and_leads_workspace | True | 16 | 0 | OK |
| sdspage_destain_gel_rock | mini_protocol | sdspage | rock_run | none | sdspage_destain_gel_rock_workspace | sdspage_destain_gel_rock_workspace | True | 10 | 0 | OK |
| sdspage_destain_gel_setup | mini_protocol | sdspage | rinse_first | none | staining_bench | staining_bench | True | 10 | 0 | OK |
| sdspage_extract_gel_from_cassette | mini_protocol | sdspage | disconnect_power_and_remove_lid | none | extraction_workspace | extraction_workspace | True | 17 | 0 | OK |
| sdspage_fill_tank_buffer | mini_protocol | sdspage | fill_inner_chamber | none | sdspage_fill_tank_buffer_workspace | sdspage_fill_tank_buffer_workspace | True | 16 | 0 | OK |
| sdspage_heat_denature_samples | mini_protocol | sdspage | open_heat_block_lid | none | sdspage_heat_denature_samples_workspace | sdspage_heat_denature_samples_workspace | True | 3 | 0 | OK |
| sdspage_image_gel | mini_protocol | sdspage | final_rinse | none | imaging_bench | imaging_bench | False | 0 | 0 | scene-missing |
| sdspage_load_protein_ladder | mini_protocol | sdspage | open_gel_workspace | none | electrophoresis_bench | electrophoresis_bench | False | 0 | 0 | scene-missing |
| sdspage_load_sample_single_lane | mini_protocol | sdspage | swap_tip | none | sdspage_load_sample_single_lane_workspace | sdspage_load_sample_single_lane_workspace | True | 17 | 0 | OK |
| sdspage_prepare_gel_cassette | mini_protocol | sdspage | open_package | none | electrophoresis_bench | electrophoresis_bench | False | 0 | 0 | scene-missing |
| sdspage_prepare_running_buffer | mini_protocol | sdspage | dilute_10x_concentrate | none | sdspage_prepare_running_buffer_workspace | sdspage_prepare_running_buffer_workspace | True | 16 | 0 | OK |
| sdspage_prepare_sample_mix_single_lane | mini_protocol | sdspage | add_protein_sample | none | sdspage_prepare_sample_mix_single_lane_workspace | sdspage_prepare_sample_mix_single_lane_workspace | True | 6 | 0 | OK |
| sdspage_recycle_buffer | mini_protocol | sdspage | inspect_buffer | none | sdspage_recycle_buffer_workspace | sdspage_recycle_buffer_workspace | True | 16 | 0 | OK |
| sdspage_run_electrophoresis | mini_protocol | sdspage | set_voltage | none | sdspage_run_electrophoresis_workspace | sdspage_run_electrophoresis_workspace | True | 16 | 0 | OK |
| sdspage_stain_gel | mini_protocol | sdspage | rinse_tray | none | staining_bench | staining_bench | True | 10 | 0 | OK |

Column definitions:
- `step_scene`: the entry step's optional `scene:` field value; `none` if absent.
- `first_scenechange`: `to_scene` of the first SceneChange in the entry step's sequence; `none` if absent.
- `resolved_scene`: `step_scene` if set, else `first_scenechange`, else `UNRESOLVED`.
- `scene_key_exists`: whether `resolved_scene` is a key in `generated/scenes.ts SCENES`.
- `item_count`: number of `placement_name` entries in that scene block (0 if missing).
- `missing_svg_count`: count of scene objects whose referenced SVG assets are absent from `assets/equipment/`.
- `result_class`: OK / unresolved / scene-missing / renders-empty / svg-gap.

## H1-H4 verdicts

### H1: Per-protocol scenes do not emit into generated/scenes.ts

REFUTED.

Evidence: `pipeline/gen_scene_index.py` reports "Generated generated/scenes.ts with 31 scenes (6 base, 25 per-protocol), 14 skipped". All 25 authored per-protocol scene YAML files (under `content/protocols/*/scenes/*.yaml`) emit into SCENES. The `discover_per_protocol_scenes` function keys each scene by its `scene_name` field (not by filename), `resolve_protocol_scene` resolves the `extends` chain without silent drops, and all per-protocol scene keys appear in the generated SCENES export. No inheritance resolution failures were logged by the generator.

No code fix is required for H1.

### H2: Resolution falls through (entry step has neither `scene:` field nor a matching SceneChange, or prefix guess cannot match per-protocol keys)

CONFIRMED (for sequence_runner protocols and as a partial structural risk).

Evidence: Five `sequence_runner` protocols (`cell_culture_full`, `routine_passage`, `sdspage_full`, `sdspage_load_samples_batch`, `sdspage_prepare_sample_mix_batch`) resolve as UNRESOLVED because they have no `steps:` list of their own. Their `entry_step` names a step that belongs to their first listed mini-protocol, not to themselves. The current `resolve_entry_scene_name` in `src/protocol_host.tsx:109-140` walks `config.steps` looking for the entry step name; it finds nothing, falls through to the prefix-guess branch, and (for runners) throws because no SCENES key matches the runner's `protocol_name` prefix.

For mini-protocols: all 22 OK cases resolve via the first `SceneChange.to_scene` in the entry step's sequence. Zero protocols use a `scene:` field on the entry step (no authored `scene:` fields exist in any `steps` block). The runtime's `entry_scene` branch (`config.entry_scene`) reads a protocol-level field that is forbidden by `docs/PRIMARY_SPEC.md` and absent from all content. The prefix guess is dead code for all current mini-protocols because the SceneChange walker fires first.

The root defect: `resolve_entry_scene_name` ignores the spec-correct path (entry step's `scene:` field) and relies on SceneChange fallback, which works for mini-protocols but is fragile. For runners it breaks entirely.

### H3: Resolved scene emits but placements are empty or dropped (including missing-SVG drops)

REFUTED.

Evidence: The probe reports `item_count > 0` for all 22 OK protocols. No protocol has `result_class = renders-empty`. The `renderScene` path (`src/scene_runtime/renderer/render_scene.ts:25-48`) would produce a silent blank for an empty `final[]`, but no current protocol exercises that path because all emitted scenes have non-zero placement counts.

### H4: Scene excluded for SVG gap (SCENES_SKIPPED_METADATA entry)

CONFIRMED (but with a stale-metadata finding).

Evidence: Four mini-protocols resolve to base scenes excluded from SCENES:
- `electrophoresis_bench`: three protocols (`sdspage_assemble_electrode_module`, `sdspage_load_protein_ladder`, `sdspage_prepare_gel_cassette`) -> `result_class = scene-missing`.
- `imaging_bench`: one protocol (`sdspage_image_gel`) -> `result_class = scene-missing`.

Both exclusion mechanisms are SCENE_ALLOWLIST policy (not in the allowlist). `electrophoresis_bench` appears in `SCENES_SKIPPED_METADATA` with reason "SVG gap: electrophoresis_tank missing 4 visual-state SVGs"; however, inspection of the current `electrophoresis_tank.yaml` object shows only 3 unique referenced SVG assets (`electrophoresis_tank`, `electrophoresis_tank_inner_chamber`, `electrophoresis_tank_outer_chamber`), all of which ARE present in `assets/equipment/`. The probe found `missing_svg_count = 0` for all scenes. The SCENES_SKIPPED_METADATA entry for `electrophoresis_bench` is stale: the SVG gap was resolved but the metadata and allowlist were not updated. `imaging_bench` has no SCENES_SKIPPED_METADATA entry and is simply not allowlisted.

No scene in the current build has actual missing SVGs. svg-gap count = 0.

## Nominated M1/M2 evidence set

One protocol per cluster with a non-empty resolved scene, in order of simplicity (lowest item count):

| cluster | protocol | resolved_scene | item_count | rationale |
| --- | --- | --- | --- | --- |
| cell_culture | passage_hood_detachment | passage_hood_detachment_microscope_view | 2 | fewest placements; simple 2-object microscope scene |
| sdspage | sdspage_heat_denature_samples | sdspage_heat_denature_samples_workspace | 3 | fewest placements; single heat-block setup scene |
| runners | (none) | -- | -- | All 5 runner protocols are UNRESOLVED; runners cannot serve as M1 evidence until WP-RESOLVE-1 adds runner entry-step support |

Fallback for runners evidence: use `cell_culture_full` after WP-RESOLVE-1 teaches runners to delegate entry-step lookup to their first listed mini-protocol (which is `passage_hood_detachment`).

## Nominated missing-SVG scene for placeholder-mode evidence

`electrophoresis_bench` is the natural candidate for WP-SUPPLY-1 placeholder-mode testing, for the following reasons:

1. It is currently excluded from SCENES by SCENE_ALLOWLIST policy (not SVG gap), so adding it to SCENES requires only an allowlist change (which WP-SUPPLY-1 controls via `--missing-svg` flag behavior).
2. The `SCENES_SKIPPED_METADATA` entry documents it as an SVG-gap scene, giving it historical identity as the placeholder test target.
3. Its base scene YAML is valid and all referenced SVGs are present, so it would emit successfully under placeholder mode without requiring net-new art.

Note: there are no actual missing SVGs in the current asset set. The missing-SVG placeholder test for WP-SUPPLY-1 will need to either (a) use `electrophoresis_bench` as a scene that was previously excluded for SVG gap and is now unblocked, or (b) introduce a dev-smoke fixture with a deliberately missing SVG. Option (b) is recommended for a deterministic test.

## Scene emission detail

### SCENES keys present in generated/scenes.ts (31 total)

6 base scenes from SCENE_ALLOWLIST:
- `bench_basic` (2 placements)
- `bench_basic_row_slot` (2 placements)
- `cell_counter_basic` (2 placements)
- `hood_basic` (4 placements)
- `sample_prep_bench` (5 placements)
- `staining_bench` (10 placements)

25 per-protocol scenes:
- `cell_counter_workspace` (5), `centrifuge_workspace` (8), `dilution_workspace` (11), `drug_dilution_setup_bench_setup` (10), `extraction_workspace` (17), `hemocytometer_view` (3), `hood_workspace` (10), `incubator_workspace` (8), `mtt_reagent_prep_bench_workspace` (7), `mtt_solubilization_readout_bench_workspace` (5), `mtt_solubilization_readout_plate_reader_workspace` (4), `passage_hood_detachment_hood_workspace` (8), `passage_hood_detachment_microscope_view` (2), `plate_drug_treatment_media_adjustment_plate_workspace` (7), `plate_workspace` (8), `sdspage_attach_lid_and_leads_workspace` (16), `sdspage_destain_gel_rock_workspace` (10), `sdspage_fill_tank_buffer_workspace` (16), `sdspage_heat_denature_samples_workspace` (3), `sdspage_load_sample_single_lane_workspace` (17), `sdspage_prepare_running_buffer_workspace` (16), `sdspage_prepare_sample_mix_single_lane_workspace` (6), `sdspage_recycle_buffer_workspace` (16), `sdspage_run_electrophoresis_workspace` (16), `seeding_workspace` (12)

### Authored scene YAMLs NOT in generated/scenes.ts (12 excluded base scenes)

These are valid base scene YAMLs excluded by SCENE_ALLOWLIST policy:
- `cell_counter_basic_row_slot`, `electrophoresis_bench`, `electrophoresis_bench_row_slot`, `heat_block_bench`, `heat_block_bench_row_slot`, `hood_basic_row_slot`, `imaging_bench`, `imaging_bench_row_slot`, `microscope_basic`, `microscope_basic_row_slot`, `sample_prep_bench_row_slot`, `staining_bench_row_slot`

Additionally 2 smoke fixture scenes were skipped (1 errored: `long_labels_smoke` references undeclared objects; 1 design-skip: `adversarial_overflow_smoke`).

## Stale metadata finding (out of scope for M0; flag for M1)

`SCENES_SKIPPED_METADATA["electrophoresis_bench"]` in `pipeline/gen_scene_index.py:388-389` says "SVG gap: electrophoresis_tank missing 4 visual-state SVGs". The SVG gap no longer exists: all referenced SVG assets (`electrophoresis_tank`, `electrophoresis_tank_inner_chamber`, `electrophoresis_tank_outer_chamber`) are present in `assets/equipment/`. The scene is excluded only by SCENE_ALLOWLIST policy. WP-SUPPLY-1 should clean up the stale metadata entry when the allowlist is extended.

## Conditional code fix (H1 was refuted -- no fix required)

Per scope item 6 of WP-DIAG-1: the conditional fix was gated on H1 confirmation. H1 is refuted (per-protocol scenes emit correctly). No code was changed.
