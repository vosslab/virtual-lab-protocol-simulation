# M2c generalization preflight report

Run at: 2026-07-05 02:19:56 UTC

## Scope

Lane D3 runs the full layout pipeline on every emitted scene
(all keys in SCENES from generated/scenes.ts). For each scene:

- Parse and normalize the scene YAML
- Resolve all objects to the object library
- Resolve all assets to SVG_MANIFEST
- Run the full convergence loop (up to MAX_LAYOUT_PASSES)
- Run structural guards on final layout
- Capture diagnostics, pass counts, and guard pass/fail verdict

## Method

Each preflight invokes:
`runPipeline(scene, { library: OBJECT_LIBRARY, assets: ASSET_SPECS })`
followed by `runStructuralGuards(result.final, scene)` to verify
layout geometry before D4 attempts rendering.

## Results: summary table

| scene | diagnostics | passes | final_items | guard_verdict | overlap_count | zone_overflow |
| --- | --- | --- | --- | --- | --- | --- |
| adversarial_overflow_smoke | 15 | 3 | 21 | PASS | 0 | 2 |
| bench_basic | 0 | 1 | 11 | PASS | 0 | 0 |
| cell_counter_basic | 0 | 1 | 7 | PASS | 0 | 0 |
| cell_counter_workspace | 0 | 1 | 9 | PASS | 0 | 0 |
| centrifuge_workspace | 2 | 1 | 12 | PASS | 0 | 0 |
| dilution_workspace | 0 | 1 | 11 | PASS | 0 | 0 |
| drug_dilution_setup_bench_setup | 0 | 1 | 9 | PASS | 0 | 0 |
| electrophoresis_bench | 1 | 1 | 16 | PASS | 0 | 0 |
| extraction_workspace | 2 | 3 | 17 | PASS | 0 | 0 |
| heat_block_bench | 0 | 1 | 13 | PASS | 0 | 0 |
| hemocytometer_view | 0 | 1 | 9 | PASS | 0 | 0 |
| hood_basic | 0 | 1 | 10 | PASS | 0 | 0 |
| hood_workspace | 0 | 1 | 12 | PASS | 0 | 0 |
| imaging_bench | 0 | 1 | 12 | PASS | 0 | 0 |
| incubator_workspace | 0 | 1 | 9 | PASS | 0 | 0 |
| microscope_basic | 0 | 1 | 7 | PASS | 0 | 0 |
| missing_svg_check | 1 | 1 | 1 | PASS | 0 | 0 |
| mtt_reagent_prep_bench_workspace | 0 | 1 | 7 | PASS | 0 | 0 |
| mtt_solubilization_readout_bench_workspace | 0 | 1 | 7 | PASS | 0 | 0 |
| mtt_solubilization_readout_plate_reader_workspace | 0 | 1 | 7 | PASS | 0 | 0 |
| passage_hood_detachment_hood_workspace | 0 | 1 | 9 | PASS | 0 | 0 |
| passage_hood_detachment_microscope_view | 0 | 2 | 6 | PASS | 0 | 0 |
| plate_drug_treatment_media_adjustment_plate_workspace | 0 | 1 | 9 | PASS | 0 | 0 |
| plate_workspace | 0 | 1 | 11 | PASS | 0 | 0 |
| sample_prep_bench | 0 | 1 | 12 | PASS | 0 | 0 |
| sdspage_attach_lid_and_leads_workspace | 1 | 1 | 16 | PASS | 0 | 0 |
| sdspage_destain_gel_rock_workspace | 0 | 1 | 10 | PASS | 0 | 0 |
| sdspage_fill_tank_buffer_workspace | 1 | 1 | 16 | PASS | 0 | 0 |
| sdspage_heat_denature_samples_workspace | 0 | 1 | 13 | PASS | 0 | 0 |
| sdspage_load_sample_single_lane_workspace | 1 | 1 | 17 | PASS | 0 | 0 |
| sdspage_prepare_running_buffer_workspace | 1 | 1 | 16 | PASS | 0 | 0 |
| sdspage_prepare_sample_mix_single_lane_workspace | 0 | 1 | 12 | PASS | 0 | 0 |
| sdspage_recycle_buffer_workspace | 1 | 1 | 16 | PASS | 0 | 0 |
| sdspage_run_electrophoresis_workspace | 1 | 1 | 16 | PASS | 0 | 0 |
| seeding_workspace | 0 | 1 | 10 | PASS | 0 | 0 |
| select_check | 0 | 1 | 2 | PASS | 0 | 0 |
| staining_bench | 0 | 1 | 10 | PASS | 0 | 0 |
| type_check | 0 | 1 | 1 | PASS | 0 | 0 |

## Per-scene detail

### adversarial_overflow_smoke

**Guard verdict:** PASS

**Diagnostics:** 15 (passes: 3, final items: 21)
- horizontal/warn/zone_overflow_negative_gap
- horizontal/warn/zone_overflow_negative_gap
- labels/info/label_row_staggered [a_2]
- labels/info/label_row_staggered [a_3]
- labels/info/label_row_staggered [a_5]
- labels/info/label_row_staggered [a_7]
- labels/info/label_row_staggered [b_2]
- labels/info/label_row_staggered [b_4]
- labels/info/label_row_staggered [b_7]
- labels/info/label_row_staggered [b_8]
- labels/info/label_row_staggered [c_2]
- labels/info/label_row_staggered [c_4]
- labels/info/label_row_staggered [c_5]
- clamp/warn/zone_clamped_to_bounds
- meta/warn/max_iterations_reached

**Zones shrunk per pass:** 0, 0, 0

**Overlap count:** 0
**Zone overflow count:** 2

### bench_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 11)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### cell_counter_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 7)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### cell_counter_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### centrifuge_workspace

**Guard verdict:** PASS

**Diagnostics:** 2 (passes: 1, final items: 12)
- labels/info/label_row_staggered [right_aspirating_pipette]
- labels/info/label_row_staggered [right_label_pen]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### dilution_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 11)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### drug_dilution_setup_bench_setup

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### electrophoresis_bench

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### extraction_workspace

**Guard verdict:** PASS

**Diagnostics:** 2 (passes: 3, final items: 17)
- labels/info/label_row_staggered [front_center_waste_container]
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0, 0, 0

**Overlap count:** 0
**Zone overflow count:** 0

### heat_block_bench

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 13)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### hemocytometer_view

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### hood_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 10)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### hood_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 12)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### imaging_bench

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 12)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### incubator_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### microscope_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 7)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### missing_svg_check

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 1)
- bind/error/unknown_object [test_placement] obj=test_missing_svg_target

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### mtt_reagent_prep_bench_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 7)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### mtt_solubilization_readout_bench_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 7)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### mtt_solubilization_readout_plate_reader_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 7)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### passage_hood_detachment_hood_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### passage_hood_detachment_microscope_view

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 2, final items: 6)
(none)

**Zones shrunk per pass:** 0, 0

**Overlap count:** 0
**Zone overflow count:** 0

### plate_drug_treatment_media_adjustment_plate_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 9)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### plate_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 11)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sample_prep_bench

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 12)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_attach_lid_and_leads_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_destain_gel_rock_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 10)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_fill_tank_buffer_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_heat_denature_samples_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 13)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_load_sample_single_lane_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 17)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_prepare_running_buffer_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_prepare_sample_mix_single_lane_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 12)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_recycle_buffer_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### sdspage_run_electrophoresis_workspace

**Guard verdict:** PASS

**Diagnostics:** 1 (passes: 1, final items: 16)
- labels/info/label_row_staggered [center_serological_pipette]

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### seeding_workspace

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 10)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### select_check

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### staining_bench

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 10)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### type_check

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 1)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

## Summary and next steps

**D4-ready (preflight pass):** 38 / 38

### Preflight-passing scenes (ready for D4 render):

- **adversarial_overflow_smoke**: 15 diagnostics
- **bench_basic**: 0 diagnostics
- **cell_counter_basic**: 0 diagnostics
- **cell_counter_workspace**: 0 diagnostics
- **centrifuge_workspace**: 2 diagnostics
- **dilution_workspace**: 0 diagnostics
- **drug_dilution_setup_bench_setup**: 0 diagnostics
- **electrophoresis_bench**: 1 diagnostics
- **extraction_workspace**: 2 diagnostics
- **heat_block_bench**: 0 diagnostics
- **hemocytometer_view**: 0 diagnostics
- **hood_basic**: 0 diagnostics
- **hood_workspace**: 0 diagnostics
- **imaging_bench**: 0 diagnostics
- **incubator_workspace**: 0 diagnostics
- **microscope_basic**: 0 diagnostics
- **missing_svg_check**: 1 diagnostics
- **mtt_reagent_prep_bench_workspace**: 0 diagnostics
- **mtt_solubilization_readout_bench_workspace**: 0 diagnostics
- **mtt_solubilization_readout_plate_reader_workspace**: 0 diagnostics
- **passage_hood_detachment_hood_workspace**: 0 diagnostics
- **passage_hood_detachment_microscope_view**: 0 diagnostics
- **plate_drug_treatment_media_adjustment_plate_workspace**: 0 diagnostics
- **plate_workspace**: 0 diagnostics
- **sample_prep_bench**: 0 diagnostics
- **sdspage_attach_lid_and_leads_workspace**: 1 diagnostics
- **sdspage_destain_gel_rock_workspace**: 0 diagnostics
- **sdspage_fill_tank_buffer_workspace**: 1 diagnostics
- **sdspage_heat_denature_samples_workspace**: 0 diagnostics
- **sdspage_load_sample_single_lane_workspace**: 1 diagnostics
- **sdspage_prepare_running_buffer_workspace**: 1 diagnostics
- **sdspage_prepare_sample_mix_single_lane_workspace**: 0 diagnostics
- **sdspage_recycle_buffer_workspace**: 1 diagnostics
- **sdspage_run_electrophoresis_workspace**: 1 diagnostics
- **seeding_workspace**: 0 diagnostics
- **select_check**: 0 diagnostics
- **staining_bench**: 0 diagnostics
- **type_check**: 0 diagnostics

Scenes that pass structural guards proceed to D4 rendering.
Scenes that fail are classified per D5 taxonomy.
