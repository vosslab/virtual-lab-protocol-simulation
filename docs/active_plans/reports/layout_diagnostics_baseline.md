# Layout diagnostics baseline

Current-state record of which scenes emit which layout diagnostics when `runPipeline` runs over every generated scene at a canonical 16:9 viewport (1920x1080). This is a read-only evidence snapshot taken before any layout-engine changes, so later improvements are measurable.

- Generated: 2026-06-10 22:11 UTC
- Scenes scanned: 38
- Viewport: 1920x1080 (16:9)
- Source: `tests/e2e/e2e_layout_diagnostics_baseline.mjs` over `generated/scenes.ts`

## Worst scenes by diagnostics

| Rank | Scene | Score | Diagnostics |
| --- | --- | --- | --- |
| 1 | `adversarial_overflow_smoke` | 132 | label_row_staggered=12, max_iterations_reached=1, zone_overflow_negative_gap=2 |
| 2 | `seeding_workspace` | 116 | item_escapes_zone_vertically=1, label_row_staggered=1, max_iterations_reached=1, zone_clamped_to_bounds=1 |
| 3 | `hood_workspace` | 115 | item_escapes_zone_vertically=1, max_iterations_reached=1, zone_clamped_to_bounds=1 |
| 4 | `imaging_bench` | 110 | max_iterations_reached=1, zone_overflow_negative_gap=1 |
| 5 | `missing_svg_check` | 8 | unknown_object=1 |
| 6 | `centrifuge_workspace` | 3 | label_row_staggered=3 |
| 7 | `extraction_workspace` | 2 | label_row_staggered=2 |
| 8 | `electrophoresis_bench` | 1 | label_row_staggered=1 |
| 9 | `sdspage_attach_lid_and_leads_workspace` | 1 | label_row_staggered=1 |
| 10 | `sdspage_fill_tank_buffer_workspace` | 1 | label_row_staggered=1 |
| 11 | `sdspage_load_sample_single_lane_workspace` | 1 | label_row_staggered=1 |
| 12 | `sdspage_prepare_running_buffer_workspace` | 1 | label_row_staggered=1 |
| 13 | `sdspage_recycle_buffer_workspace` | 1 | label_row_staggered=1 |
| 14 | `sdspage_run_electrophoresis_workspace` | 1 | label_row_staggered=1 |

Score weights hard structural failures (`max_iterations_reached`=100, overflow/tab-stop/vertical-escape=10, clamp=5, identity=8) above label residuals (`label_collision_residual`=3, `label_row_staggered`=1); any other kind weighs 2.

## Per-scene diagnostics

| Scene | Passes | Converged | Total | item_escapes_zone_vertically | label_row_staggered | max_iterations_reached | unknown_object | zone_clamped_to_bounds | zone_overflow_negative_gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `adversarial_overflow_smoke` | 3 | NO | 15 | . | 12 | 1 | . | . | 2 |
| `bench_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `cell_counter_basic` | 1 | YES | 0 | . | . | . | . | . | . |
| `cell_counter_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `centrifuge_workspace` | 1 | YES | 3 | . | 3 | . | . | . | . |
| `dilution_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `drug_dilution_setup_bench_setup` | 1 | YES | 0 | . | . | . | . | . | . |
| `electrophoresis_bench` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `extraction_workspace` | 1 | YES | 2 | . | 2 | . | . | . | . |
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
| `sdspage_attach_lid_and_leads_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `sdspage_destain_gel_rock_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_fill_tank_buffer_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `sdspage_heat_denature_samples_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_load_sample_single_lane_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `sdspage_prepare_running_buffer_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `sdspage_prepare_sample_mix_single_lane_workspace` | 1 | YES | 0 | . | . | . | . | . | . |
| `sdspage_recycle_buffer_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `sdspage_run_electrophoresis_workspace` | 1 | YES | 1 | . | 1 | . | . | . | . |
| `seeding_workspace` | 3 | NO | 4 | 1 | 1 | 1 | . | 1 | . |
| `select_check` | 1 | YES | 0 | . | . | . | . | . | . |
| `staining_bench` | 1 | YES | 0 | . | . | . | . | . | . |
| `type_check` | 1 | YES | 0 | . | . | . | . | . | . |

## Severity-graded de-overlap diagnostics

Counts from `result.severityDiagnostics` (keyed by `code`), the de-overlap Error/Warning/Review stream. `unresolved_label_overlap` is the overlap-gate metric. `unresolved_overlap` is a bounds Error (object too big for its zone), not a label issue. A `.` means the code did not fire for that scene.

| Scene | poor_label_alignment | unresolved_label_overlap | unresolved_overlap |
| --- | --- | --- | --- |
| `adversarial_overflow_smoke` | 6 | 5 | 2 |
| `bench_basic` | 1 | . | . |
| `cell_counter_basic` | 1 | . | . |
| `cell_counter_workspace` | 1 | . | . |
| `centrifuge_workspace` | 3 | . | . |
| `dilution_workspace` | 1 | 1 | . |
| `drug_dilution_setup_bench_setup` | . | . | . |
| `electrophoresis_bench` | 3 | . | . |
| `extraction_workspace` | 4 | . | . |
| `heat_block_bench` | 1 | . | . |
| `hemocytometer_view` | 3 | . | . |
| `hood_basic` | 6 | . | . |
| `hood_workspace` | 6 | . | 1 |
| `imaging_bench` | . | . | 1 |
| `incubator_workspace` | 1 | . | . |
| `microscope_basic` | 2 | . | . |
| `missing_svg_check` | . | . | . |
| `mtt_reagent_prep_bench_workspace` | 1 | . | . |
| `mtt_solubilization_readout_bench_workspace` | 1 | . | . |
| `mtt_solubilization_readout_plate_reader_workspace` | . | . | . |
| `passage_hood_detachment_hood_workspace` | 5 | . | . |
| `passage_hood_detachment_microscope_view` | 2 | . | . |
| `plate_drug_treatment_media_adjustment_plate_workspace` | 8 | . | . |
| `plate_workspace` | 4 | . | . |
| `sample_prep_bench` | 1 | . | . |
| `sdspage_attach_lid_and_leads_workspace` | 3 | . | . |
| `sdspage_destain_gel_rock_workspace` | . | . | . |
| `sdspage_fill_tank_buffer_workspace` | 3 | . | . |
| `sdspage_heat_denature_samples_workspace` | 1 | . | . |
| `sdspage_load_sample_single_lane_workspace` | 3 | . | . |
| `sdspage_prepare_running_buffer_workspace` | 3 | . | . |
| `sdspage_prepare_sample_mix_single_lane_workspace` | 1 | . | . |
| `sdspage_recycle_buffer_workspace` | 3 | . | . |
| `sdspage_run_electrophoresis_workspace` | 3 | . | . |
| `seeding_workspace` | 5 | . | 1 |
| `select_check` | . | . | . |
| `staining_bench` | . | . | . |
| `type_check` | . | . | . |

## Overlap pairs

Each row is one overlap Error from `result.severityDiagnostics`, naming the two involved placements, the zone, the diagnostic code, and the remaining penetration depth (scene-percent). `unresolved_label_overlap` is a label sitting over another label or artwork; `unresolved_overlap` is an object escaping its zone bounds. Same-zone pairs are in-zone collisions; differing zone membership for the two names indicates a cross-zone graze.

| Scene | Code | Zone | Item A | Item B | Depth |
| --- | --- | --- | --- | --- | --- |
| `adversarial_overflow_smoke` | unresolved_label_overlap | `zone_b` | `b_1` | `b_2` | 2.2 |
| `adversarial_overflow_smoke` | unresolved_label_overlap | `zone_b` | `b_5` | `b_4` | 2.2 |
| `adversarial_overflow_smoke` | unresolved_label_overlap | `zone_b` | `b_7` | `b_2` | 2.2 |
| `adversarial_overflow_smoke` | unresolved_label_overlap | `zone_c` | `c_5` | `c_4` | 2.2 |
| `adversarial_overflow_smoke` | unresolved_label_overlap | `zone_c` | `c_6` | `c_4` | 2.2 |
| `adversarial_overflow_smoke` | unresolved_overlap | `zone_b` | `b_1` | `b_2` | 10.07 |
| `adversarial_overflow_smoke` | unresolved_overlap | `zone_c` | `c_1` | `c_2` | 4.26 |
| `dilution_workspace` | unresolved_label_overlap | `rear_right` | `met_working_tube` | `water_source` | 1.9 |
| `hood_workspace` | unresolved_overlap | `rear_right` | `rear_right_incubator` | `-` | 12.85 |
| `imaging_bench` | unresolved_overlap | `left_tool_area` | `left_rocking_shaker` | `-` | 1 |
| `seeding_workspace` | unresolved_overlap | `rear_right` | `rear_right_incubator` | `-` | 12.85 |

## Scenes that failed to run

None. Every scene ran to completion.
