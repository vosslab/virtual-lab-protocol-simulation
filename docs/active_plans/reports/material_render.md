# Material-render regression guard report

This report explains what the material-render test learned, not just whether it passed.
It records how much of each `fill_height()` overlay's item bbox the overlay paints, and
uses that geometry as a regression guard. It does not claim that any measured percentage
is the ideal visual answer.

## What the test measures

Each item's bbox is rendered twice:

1. once with its fill overlay(s) visible
2. once with them hidden

The measurement is the pixel difference between those two images, isolated per driving
field so a two-overlay object is never diffed against itself. A pixel counts toward the
overlay area when its color changes by more than the diff threshold between the two shots.
Glass, background, outline, and label pixels are identical in both shots and drop out by
construction.

The diff method is the important methodological result from this test run. Flat-color pixel
matching was not reliable because the overlay color is often translucent and composited per
pixel over the underlying art. The visible-vs-hidden diff is the robust segmentation.

## What we learned

### 1. The fill overlay currently paints the full object bbox

The measured percentages show that the current fill overlay behaves like bbox coverage, not
liquid-interior clipping. Full containers land around the mid-to-high 90s, partial containers
land in the middle, and empty containers land at 0. That pattern is consistent with a volume
proxy, but it also confirms the deferred bug in `docs/ROADMAP.md:183`: the overlay is not yet
constrained to the SVG liquid interior.

This is the structural issue the guard is meant to pin. The report is intentionally labeled as
"no worse than baseline" rather than "correct rendering."

### 2. The material color path is currently falling back to grey

Every measured fill rendered as the same neutral grey fallback (`rgba(120, 120, 120, 0.35)`),
not as a material identity color. That means the renderer is not showing PBS as PBS, media as
media, waste as waste, and so on. The test did not uncover a content-authoring mistake; it
exposed a renderer-side color-path gap.

That makes the color problem distinct from the geometry problem:

- geometry: how much of the bbox is being painted
- color identity: whether the painted region is using the material's declared color at all

### 3. The percentage is a coarse proxy, not a correctness proof

The measured percentage tracks how high the fill rises, so it behaves like a volume proxy. It
does not prove that the painted shape is clipped correctly, nor that the color path is correct.
In other words, the metric can tell us when fill got bigger or smaller, but not whether the fill
has the right interior shape or the right material identity.

## Baseline status

**Baseline status: `known-bad-current-state`.**

Every fill_height overlay in this baseline currently paints the full object item bbox rather than
being constrained to the SVG liquid interior. The guard only blocks this state from getting worse.
The per-entry `tag` field stays empty and is reserved for future targeted annotation once the
renderer fix lands.

## Run summary

**Mode:** verify
**Items measured:** 231
**Diff threshold:** 15 (per-channel max-abs-diff)
**Regression threshold:** +5.0 percentage points above baseline

| Outcome | Count |
| --- | --- |
| unchanged (within threshold) | 231 |
| regressed | 0 |
| new (no baseline entry yet) | 0 |
| missing (baseline entry, no longer captured) | 0 |

## Interpretation

The test tells us two things with confidence:

- the current renderer behavior is stable relative to the saved baseline
- the renderer is still wrong in two separate ways: full-bbox fill behavior and grey fallback

The test does not tell us that the current state is acceptable. It tells us that the current
incorrect behavior is now measured and guarded.

## Full measured corpus

Every row below is known-bad current-state geometry. The `tag` column stays empty and is reserved
for future targeted annotation once the render fix for `docs/ROADMAP.md:183` lands.

| Key | Object | Declared fill color | Measured % | Tag |
| --- | --- | --- | --- | --- |
| `bench_basic::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `bench_basic::rear_center_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.95 | |
| `bench_basic::rear_center_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 95.16 | |
| `bench_basic::rear_left_media_bottle::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 97.35 | |
| `bench_basic::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `cell_counter_basic::rear_cell_suspension_tube::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 73.90 | |
| `cell_counter_basic::rear_trypan_blue_tube::material_volume` | `trypan_blue_tube` | `rgba(120, 120, 120, 0.35)` | 63.22 | |
| `cell_counter_workspace::rear_cell_suspension_tube::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 74.29 | |
| `cell_counter_workspace::rear_trypan_blue_tube::material_volume` | `trypan_blue_tube` | `rgba(120, 120, 120, 0.35)` | 61.52 | |
| `cell_counter_workspace::right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `centrifuge_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `centrifuge_workspace::rear_left_conical_tube::material_volume` | `conical_15ml` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `centrifuge_workspace::rear_left_media_bottle_reseed::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 96.13 | |
| `centrifuge_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `centrifuge_workspace::rear_right_biohazard_decant::material_volume` | `biohazard_decant` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `centrifuge_workspace::rear_right_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 94.03 | |
| `centrifuge_workspace::right_aspirating_pipette::held_material_volume` | `aspirating_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `dilution_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `dilution_workspace::carb_intermediate::material_volume` | `microtube_15ml_intermediate` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `dilution_workspace::carb_stock::material_volume` | `carboplatin_stock_tube` | `rgba(120, 120, 120, 0.35)` | 93.99 | |
| `dilution_workspace::met_stock::material_volume` | `metformin_stock_tube` | `rgba(120, 120, 120, 0.35)` | 91.77 | |
| `dilution_workspace::met_working_tube::material_volume` | `metformin_working_tube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `dilution_workspace::rear_left_media_bottle::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 95.72 | |
| `dilution_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `drug_dilution_setup_bench_setup::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `drug_dilution_setup_bench_setup::center_metformin_working_tube::material_volume` | `metformin_working_tube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `drug_dilution_setup_bench_setup::center_microtube_intermediate::material_volume` | `microtube_15ml_intermediate` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `drug_dilution_setup_bench_setup::rear_center_metformin_stock::material_volume` | `metformin_stock_tube` | `rgba(120, 120, 120, 0.35)` | 94.32 | |
| `drug_dilution_setup_bench_setup::rear_left_carboplatin_stock::material_volume` | `carboplatin_stock_tube` | `rgba(120, 120, 120, 0.35)` | 94.30 | |
| `drug_dilution_setup_bench_setup::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `electrophoresis_bench::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `electrophoresis_bench::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `electrophoresis_bench::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `electrophoresis_bench::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `extraction_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `extraction_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `extraction_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::front_center_staining_tray::material_volume` | `staining_tray` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `extraction_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `extraction_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `heat_block_bench::front_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `heat_block_bench::mid_microtube_sample::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `heat_block_bench::rear_center_bme::material_volume` | `bme_tube` | `rgba(120, 120, 120, 0.35)` | 31.24 | |
| `heat_block_bench::rear_center_laemmli::material_volume` | `laemmli_4x_tube` | `rgba(120, 120, 120, 0.35)` | 63.86 | |
| `heat_block_bench::rear_left_protein_ladder::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 93.55 | |
| `heat_block_bench::rear_left_protein_sample::material_volume` | `protein_sample_tube` | `rgba(120, 120, 120, 0.35)` | 93.39 | |
| `heat_block_bench::rear_right_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 95.34 | |
| `heat_block_bench::rear_right_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hemocytometer_view::left_cell_suspension::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 74.01 | |
| `hemocytometer_view::rear_ethanol_bottle::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 97.95 | |
| `hemocytometer_view::right_microtube_left::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hemocytometer_view::staining_tubes::material_volume` | `trypan_blue_tube` | `rgba(120, 120, 120, 0.35)` | 61.42 | |
| `hood_basic::base_rear_center_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 95.47 | |
| `hood_basic::base_rear_right_media::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 96.17 | |
| `hood_basic::base_rear_right_sterile_water::material_volume` | `sterile_water_bottle` | `rgba(120, 120, 120, 0.35)` | 95.49 | |
| `hood_basic::base_right_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_basic::rear_center_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_basic::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 97.63 | |
| `hood_basic::right_aspirating_pipette::held_material_volume` | `aspirating_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_workspace::base_rear_center_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 93.43 | |
| `hood_workspace::center_t75_flask::material_volume` | `t75_flask` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_workspace::rear_center_conical_tube::material_volume` | `conical_15ml` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_workspace::rear_center_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `hood_workspace::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.94 | |
| `hood_workspace::rear_left_fresh_media::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 95.83 | |
| `hood_workspace::right_aspirating_pipette::held_material_volume` | `aspirating_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `imaging_bench::center_staining_tray::material_volume` | `staining_tray` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `imaging_bench::left_microtube::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `imaging_bench::rear_coomassie::material_volume` | `coomassie_stain_bottle` | `rgba(120, 120, 120, 0.35)` | 93.73 | |
| `imaging_bench::rear_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.81 | |
| `imaging_bench::rear_destain::material_volume` | `destain_bottle` | `rgba(120, 120, 120, 0.35)` | 94.84 | |
| `imaging_bench::rear_ethanol_bottle::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.13 | |
| `imaging_bench::right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `imaging_bench::right_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `incubator_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `incubator_workspace::hazard_waste_bin::material_volume` | `biohazard_decant_bin` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `incubator_workspace::mtt_solution::material_volume` | `mtt_stock_tube` | `rgba(120, 120, 120, 0.35)` | 18.64 | |
| `incubator_workspace::pipette_multichannel::held_material_volume` | `multichannel_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `incubator_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `microscope_basic::left_cell_suspension::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 72.23 | |
| `microscope_basic::rear_ethanol_bottle::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.45 | |
| `microscope_basic::right_microtube::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_reagent_prep_bench_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_reagent_prep_bench_workspace::center_mtt_solution_tube::material_volume` | `mtt_solution_tube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_reagent_prep_bench_workspace::rear_center_pbs_bottle::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 93.56 | |
| `mtt_reagent_prep_bench_workspace::rear_left_mtt_powder::material_volume` | `mtt_powder_container` | `rgba(120, 120, 120, 0.35)` | 43.58 | |
| `mtt_reagent_prep_bench_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_solubilization_readout_bench_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_solubilization_readout_bench_workspace::rear_center_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 95.04 | |
| `mtt_solubilization_readout_bench_workspace::rear_left_dmso::material_volume` | `dmso_tube` | `rgba(120, 120, 120, 0.35)` | 92.70 | |
| `mtt_solubilization_readout_bench_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_solubilization_readout_plate_reader_workspace::base_right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `mtt_solubilization_readout_plate_reader_workspace::rear_center_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 95.26 | |
| `mtt_solubilization_readout_plate_reader_workspace::rear_left_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `passage_hood_detachment_hood_workspace::center_flask::material_volume` | `t75_flask` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `passage_hood_detachment_hood_workspace::rear_center_media::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 97.50 | |
| `passage_hood_detachment_hood_workspace::rear_center_trypsin::material_volume` | `trypsin_bottle` | `rgba(120, 120, 120, 0.35)` | 96.28 | |
| `passage_hood_detachment_hood_workspace::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.66 | |
| `passage_hood_detachment_hood_workspace::rear_left_pbs::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 94.40 | |
| `passage_hood_detachment_hood_workspace::right_aspirating_pipette::held_material_volume` | `aspirating_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `passage_hood_detachment_microscope_view::instrument_t75_flask::material_volume` | `t75_flask` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `passage_hood_detachment_microscope_view::left_cell_suspension::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 72.28 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::base_rear_right_sterile_water::material_volume` | `sterile_water_bottle` | `rgba(120, 120, 120, 0.35)` | 96.19 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::rear_center_media::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 97.36 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::rear_center_pbs_decor::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 95.00 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::rear_center_waste_decor::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 98.20 | |
| `plate_drug_treatment_media_adjustment_plate_workspace::right_tool_multichannel::held_material_volume` | `multichannel_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `plate_workspace::base_rear_right_media::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 96.05 | |
| `plate_workspace::base_rear_right_sterile_water::material_volume` | `sterile_water_bottle` | `rgba(120, 120, 120, 0.35)` | 95.04 | |
| `plate_workspace::rear_center_metformin_stock::material_volume` | `metformin_working_tube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `plate_workspace::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 98.77 | |
| `plate_workspace::rear_left_pbs_decor::material_volume` | `pbs_bottle` | `rgba(120, 120, 120, 0.35)` | 94.12 | |
| `plate_workspace::rear_right_waste_decor::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `plate_workspace::right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sample_prep_bench::center_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sample_prep_bench::mid_microtube_sample::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sample_prep_bench::rear_center_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 96.15 | |
| `sample_prep_bench::rear_center_laemmli::material_volume` | `laemmli_4x_tube` | `rgba(120, 120, 120, 0.35)` | 63.79 | |
| `sample_prep_bench::rear_left_protein_ladder::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 93.49 | |
| `sample_prep_bench::rear_left_protein_sample::material_volume` | `protein_sample_tube` | `rgba(120, 120, 120, 0.35)` | 93.33 | |
| `sample_prep_bench::rear_right_bme::material_volume` | `bme_tube` | `rgba(120, 120, 120, 0.35)` | 31.17 | |
| `sample_prep_bench::rear_right_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_attach_lid_and_leads_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_attach_lid_and_leads_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_attach_lid_and_leads_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_attach_lid_and_leads_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `sdspage_destain_gel_rock_workspace::center_staining_tray::material_volume` | `staining_tray` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_destain_gel_rock_workspace::rear_center_destain::material_volume` | `destain_bottle` | `rgba(120, 120, 120, 0.35)` | 96.80 | |
| `sdspage_destain_gel_rock_workspace::rear_center_destain_waste::material_volume` | `destain_waste_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_destain_gel_rock_workspace::rear_left_coomassie_recycle::material_volume` | `coomassie_recycle_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_destain_gel_rock_workspace::rear_left_coomassie_stain::material_volume` | `coomassie_stain_bottle` | `rgba(120, 120, 120, 0.35)` | 96.80 | |
| `sdspage_destain_gel_rock_workspace::rear_right_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 95.95 | |
| `sdspage_destain_gel_rock_workspace::right_tool_area_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_fill_tank_buffer_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_fill_tank_buffer_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_fill_tank_buffer_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_fill_tank_buffer_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `sdspage_heat_denature_samples_workspace::front_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_heat_denature_samples_workspace::mid_microtube_sample::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_heat_denature_samples_workspace::rear_center_bme::material_volume` | `bme_tube` | `rgba(120, 120, 120, 0.35)` | 31.24 | |
| `sdspage_heat_denature_samples_workspace::rear_center_laemmli::material_volume` | `laemmli_4x_tube` | `rgba(120, 120, 120, 0.35)` | 63.86 | |
| `sdspage_heat_denature_samples_workspace::rear_left_protein_ladder::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 93.55 | |
| `sdspage_heat_denature_samples_workspace::rear_left_protein_sample::material_volume` | `protein_sample_tube` | `rgba(120, 120, 120, 0.35)` | 93.39 | |
| `sdspage_heat_denature_samples_workspace::rear_right_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 95.34 | |
| `sdspage_heat_denature_samples_workspace::rear_right_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_load_sample_single_lane_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_load_sample_single_lane_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::front_center_microtube::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_load_sample_single_lane_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_load_sample_single_lane_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `sdspage_prepare_running_buffer_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_prepare_running_buffer_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_prepare_running_buffer_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_prepare_running_buffer_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_running_buffer_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::center_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::eppendorf_tube::material_volume` | `microtube` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_center_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.93 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_center_laemmli::material_volume` | `laemmli_4x_tube` | `rgba(120, 120, 120, 0.35)` | 64.54 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_left_protein_ladder::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 96.54 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_left_protein_sample::material_volume` | `protein_sample_tube` | `rgba(120, 120, 120, 0.35)` | 91.95 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_right_bme::material_volume` | `bme_tube` | `rgba(120, 120, 120, 0.35)` | 31.28 | |
| `sdspage_prepare_sample_mix_single_lane_workspace::rear_right_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_recycle_buffer_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_recycle_buffer_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_recycle_buffer_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_recycle_buffer_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `sdspage_run_electrophoresis_workspace::center_ddh2o_bottle::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 94.25 | |
| `sdspage_run_electrophoresis_workspace::center_p200_micropipette::held_material_volume` | `p200_micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::center_running_buffer_1x_carboy::material_volume` | `running_buffer_1x_carboy` | `rgba(120, 120, 120, 0.35)` | 95.55 | |
| `sdspage_run_electrophoresis_workspace::center_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::front_center_waste_container::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::rear_center_electrophoresis_tank::inner_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::rear_center_electrophoresis_tank::outer_chamber_material_volume` | `electrophoresis_tank` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::rear_left_protein_ladder_tube::material_volume` | `protein_ladder_tube` | `rgba(120, 120, 120, 0.35)` | 95.10 | |
| `sdspage_run_electrophoresis_workspace::rear_left_recycle_buffer_bottle::material_volume` | `recycle_buffer_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `sdspage_run_electrophoresis_workspace::rear_left_running_buffer_10x::material_volume` | `running_buffer_10x_bottle` | `rgba(120, 120, 120, 0.35)` | 95.77 | |
| `seeding_workspace::rear_center_media_bottle::material_volume` | `media_bottle` | `rgba(120, 120, 120, 0.35)` | 96.30 | |
| `seeding_workspace::rear_left_cell_suspension_tube::material_volume` | `cell_suspension_tube` | `rgba(120, 120, 120, 0.35)` | 72.08 | |
| `seeding_workspace::rear_left_conical_tube_for_dilution::material_volume` | `conical_tube_for_dilution` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `seeding_workspace::rear_left_ethanol::material_volume` | `ethanol_bottle` | `rgba(120, 120, 120, 0.35)` | 96.47 | |
| `seeding_workspace::right_micropipette::held_material_volume` | `micropipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `seeding_workspace::right_serological_pipette::held_material_volume` | `serological_pipette` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `staining_bench::center_staining_tray::material_volume` | `staining_tray` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `staining_bench::rear_center_destain::material_volume` | `destain_bottle` | `rgba(120, 120, 120, 0.35)` | 96.80 | |
| `staining_bench::rear_center_destain_waste::material_volume` | `destain_waste_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `staining_bench::rear_left_coomassie_recycle::material_volume` | `coomassie_recycle_bottle` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
| `staining_bench::rear_left_coomassie_stain::material_volume` | `coomassie_stain_bottle` | `rgba(120, 120, 120, 0.35)` | 96.80 | |
| `staining_bench::rear_right_ddh2o::material_volume` | `ddh2o_bottle` | `rgba(120, 120, 120, 0.35)` | 95.95 | |
| `staining_bench::right_tool_area_waste::material_volume` | `waste_container` | `rgba(120, 120, 120, 0.35)` | 0.00 | |
