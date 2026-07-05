# Layout diagnostics baseline

Current-state record of which scenes emit which layout diagnostics when `runPipeline` runs over every generated scene at a canonical 16:9 viewport (1920x1080). This is a read-only evidence snapshot taken before any layout-engine changes, so later improvements are measurable.

- Generated: 2026-07-05 16:20 UTC
- Scenes scanned: 34
- Viewport: 1920x1080 (16:9)
- Source: `tests/e2e/e2e_layout_diagnostics_baseline.mjs` over `generated/scenes.ts`

## Worst scenes by diagnostics

| Rank | Scene | Score | Diagnostics |
| --- | --- | --- | --- |
| 1 | `centrifuge_workspace` | 2 | label_row_staggered=2 |
| 2 | `extraction_workspace` | 2 | label_row_staggered=2 |
| 3 | `electrophoresis_bench` | 1 | label_row_staggered=1 |
| 4 | `sdspage_attach_lid_and_leads_workspace` | 1 | label_row_staggered=1 |
| 5 | `sdspage_fill_tank_buffer_workspace` | 1 | label_row_staggered=1 |
| 6 | `sdspage_load_sample_single_lane_workspace` | 1 | label_row_staggered=1 |
| 7 | `sdspage_prepare_running_buffer_workspace` | 1 | label_row_staggered=1 |
| 8 | `sdspage_recycle_buffer_workspace` | 1 | label_row_staggered=1 |
| 9 | `sdspage_run_electrophoresis_workspace` | 1 | label_row_staggered=1 |

Score weights hard structural failures (`max_iterations_reached`=100, overflow/tab-stop/vertical-escape=10, clamp=5, identity=8) above label residuals (`label_collision_residual`=3, `label_row_staggered`=1); any other kind weighs 2.

## Per-scene diagnostics

| Scene | Passes | Converged | Total | label_row_staggered |
| --- | --- | --- | --- | --- |
| `bench_basic` | 1 | YES | 0 | . |
| `cell_counter_basic` | 1 | YES | 0 | . |
| `cell_counter_workspace` | 1 | YES | 0 | . |
| `centrifuge_workspace` | 1 | YES | 2 | 2 |
| `dilution_workspace` | 1 | YES | 0 | . |
| `drug_dilution_setup_bench_setup` | 1 | YES | 0 | . |
| `electrophoresis_bench` | 1 | YES | 1 | 1 |
| `extraction_workspace` | 3 | YES | 2 | 2 |
| `heat_block_bench` | 1 | YES | 0 | . |
| `hemocytometer_view` | 1 | YES | 0 | . |
| `hood_basic` | 1 | YES | 0 | . |
| `hood_workspace` | 1 | YES | 0 | . |
| `imaging_bench` | 1 | YES | 0 | . |
| `incubator_workspace` | 1 | YES | 0 | . |
| `microscope_basic` | 1 | YES | 0 | . |
| `mtt_reagent_prep_bench_workspace` | 1 | YES | 0 | . |
| `mtt_solubilization_readout_bench_workspace` | 1 | YES | 0 | . |
| `mtt_solubilization_readout_plate_reader_workspace` | 1 | YES | 0 | . |
| `passage_hood_detachment_hood_workspace` | 1 | YES | 0 | . |
| `passage_hood_detachment_microscope_view` | 2 | YES | 0 | . |
| `plate_drug_treatment_media_adjustment_plate_workspace` | 1 | YES | 0 | . |
| `plate_workspace` | 1 | YES | 0 | . |
| `sample_prep_bench` | 1 | YES | 0 | . |
| `sdspage_attach_lid_and_leads_workspace` | 1 | YES | 1 | 1 |
| `sdspage_destain_gel_rock_workspace` | 1 | YES | 0 | . |
| `sdspage_fill_tank_buffer_workspace` | 1 | YES | 1 | 1 |
| `sdspage_heat_denature_samples_workspace` | 1 | YES | 0 | . |
| `sdspage_load_sample_single_lane_workspace` | 1 | YES | 1 | 1 |
| `sdspage_prepare_running_buffer_workspace` | 1 | YES | 1 | 1 |
| `sdspage_prepare_sample_mix_single_lane_workspace` | 1 | YES | 0 | . |
| `sdspage_recycle_buffer_workspace` | 1 | YES | 1 | 1 |
| `sdspage_run_electrophoresis_workspace` | 1 | YES | 1 | 1 |
| `seeding_workspace` | 1 | YES | 0 | . |
| `staining_bench` | 1 | YES | 0 | . |

## Severity-graded de-overlap diagnostics

Counts from `result.severityDiagnostics` (keyed by `code`), the de-overlap Error/Warning/Review stream. `unresolved_label_overlap` is the overlap-gate metric. `unresolved_overlap` is a bounds Error (object too big for its zone), not a label issue. A `.` means the code did not fire for that scene.

| Scene | poor_label_alignment | unfittable_asset |
| --- | --- | --- |
| `bench_basic` | . | 1 |
| `cell_counter_basic` | . | . |
| `cell_counter_workspace` | . | 1 |
| `centrifuge_workspace` | . | 2 |
| `dilution_workspace` | . | . |
| `drug_dilution_setup_bench_setup` | . | . |
| `electrophoresis_bench` | . | . |
| `extraction_workspace` | 1 | 1 |
| `heat_block_bench` | . | . |
| `hemocytometer_view` | . | 1 |
| `hood_basic` | . | . |
| `hood_workspace` | . | 3 |
| `imaging_bench` | . | . |
| `incubator_workspace` | . | . |
| `microscope_basic` | . | . |
| `mtt_reagent_prep_bench_workspace` | . | . |
| `mtt_solubilization_readout_bench_workspace` | . | . |
| `mtt_solubilization_readout_plate_reader_workspace` | . | . |
| `passage_hood_detachment_hood_workspace` | . | 9 |
| `passage_hood_detachment_microscope_view` | . | 1 |
| `plate_drug_treatment_media_adjustment_plate_workspace` | . | 9 |
| `plate_workspace` | . | 2 |
| `sample_prep_bench` | . | . |
| `sdspage_attach_lid_and_leads_workspace` | . | . |
| `sdspage_destain_gel_rock_workspace` | . | . |
| `sdspage_fill_tank_buffer_workspace` | . | . |
| `sdspage_heat_denature_samples_workspace` | . | . |
| `sdspage_load_sample_single_lane_workspace` | . | . |
| `sdspage_prepare_running_buffer_workspace` | . | . |
| `sdspage_prepare_sample_mix_single_lane_workspace` | . | . |
| `sdspage_recycle_buffer_workspace` | . | . |
| `sdspage_run_electrophoresis_workspace` | . | . |
| `seeding_workspace` | . | 1 |
| `staining_bench` | . | . |

## Overlap pairs

Each row is one overlap Error from `result.severityDiagnostics`, naming the two involved placements, the zone, the diagnostic code, and the remaining penetration depth (scene-percent). `unresolved_label_overlap` is a label sitting over another label or artwork; `unresolved_overlap` is an object escaping its zone bounds. Same-zone pairs are in-zone collisions; differing zone membership for the two names indicates a cross-zone graze.

None. No overlap Error fired in any scene.

## Scenes that failed to run

None. Every scene ran to completion.
