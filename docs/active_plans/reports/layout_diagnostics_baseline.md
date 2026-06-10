# Layout diagnostics baseline

Current-state record of which scenes emit which layout diagnostics when `runPipeline` runs over every generated scene at a canonical 16:9 viewport (1920x1080). This is a read-only evidence snapshot taken before any layout-engine changes, so later improvements are measurable.

- Generated: 2026-06-08 12:47 UTC
- Scenes scanned: 38
- Viewport: 1920x1080 (16:9)
- Source: `tests/e2e_layout_diagnostics_baseline.mjs` over `generated/scenes.ts`

## Worst scenes by diagnostics

| Rank | Scene | Score | Diagnostics |
| --- | --- | --- | --- |
| 1 | `adversarial_overflow_smoke` | 131 | label_row_staggered=11, max_iterations_reached=1, zone_overflow_negative_gap=2 |
| 2 | `seeding_workspace` | 116 | item_escapes_zone_vertically=1, label_row_staggered=1, max_iterations_reached=1, zone_clamped_to_bounds=1 |
| 3 | `hood_workspace` | 115 | item_escapes_zone_vertically=1, max_iterations_reached=1, zone_clamped_to_bounds=1 |
| 4 | `imaging_bench` | 110 | max_iterations_reached=1, zone_overflow_negative_gap=1 |
| 5 | `missing_svg_check` | 8 | unknown_object=1 |
| 6 | `centrifuge_workspace` | 2 | label_row_staggered=2 |
| 7 | `drug_dilution_setup_bench_setup` | 1 | label_row_staggered=1 |

Score weights hard structural failures (`max_iterations_reached`=100, overflow/tab-stop/vertical-escape=10, clamp=5, identity=8) above label residuals (`label_collision_residual`=3, `label_row_staggered`=1); any other kind weighs 2.

## Per-scene diagnostics

| Scene | Passes | Converged | Total | item_escapes_zone_vertically | label_row_staggered | max_iterations_reached | unknown_object | zone_clamped_to_bounds | zone_overflow_negative_gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `adversarial_overflow_smoke` | 3 | NO | 14 | . | 11 | 1 | . | . | 2 |
| `bench_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `cell_counter_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `cell_counter_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `centrifuge_workspace` | 1 | YES | 2 | . | 2 | . | . | . | . |
| `dilution_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `drug_dilution_setup_bench_setup` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `electrophoresis_bench` | 1 | YES | 0 | . | . | . | . | . | . |
| `extraction_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `heat_block_bench` | 1 | YES | 0 | . | . | . | . | . | . |
| `hemocytometer_view` | 1 | YES | 0 | . | . | . | . | . | . |
| `hood_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `hood_workspace` | 3 | NO | 3 | 1 | . | 1 | . | 1 | . |
| `imaging_bench` | 3 | NO | 2 | . | . | 1 | . | . | 1 |
| `incubator_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `microscope_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `missing_svg_check` | 1 | YES | 1 | . | . | . | 1 | . | . |
| `mtt_reagent_prep_bench_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `mtt_solubilization_readout_bench_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `mtt_solubilization_readout_plate_reader_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `passage_hood_detachment_hood_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `passage_hood_detachment_microscope_view` | 1 | YES | 0 | . | . | . | . | . | . |
| `plate_drug_treatment_media_adjustment_plate_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `plate_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sample_prep_bench` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_attach_lid_and_leads_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_destain_gel_rock_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_fill_tank_buffer_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_heat_denature_samples_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_load_sample_single_lane_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_prepare_running_buffer_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_prepare_sample_mix_single_lane_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_recycle_buffer_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_run_electrophoresis_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `seeding_workspace` | 3 | NO | 4 | 1 | 1 | 1 | . | 1 | . |
| `select_check` | 1 | YES | 0 | . | . | . | . | . | . |
| `staining_bench` | 1 | YES | 0 | . | . | . | . | . | . |
| `type_check` | 1 | YES | 0 | . | . | . | . | . | . |

## Scenes that failed to run

None. Every scene ran to completion.
