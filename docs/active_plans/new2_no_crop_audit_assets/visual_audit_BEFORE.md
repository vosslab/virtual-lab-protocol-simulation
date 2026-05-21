# NEW0 Visual Audit Report

## Summary

| Metric | Value |
| --- | --- |
| Total Scenes | 10 |
| PASS | 1 |
| PASS_TEMPLATE | 4 |
| WARN | 5 |
| FAIL | 0 |
| Checks with Issues | 1 |

## Scene-Composition Diagnostics

| Scene | Mode | Clipped | Off-Page | SVG-SVG | Region-Overflow | Primary-Ratio | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | template | 0 | 0 | 0 | 0 | - | **PASS_TEMPLATE** |
| cell_counter_basic | template | 0 | 0 | 0 | 0 | - | **PASS_TEMPLATE** |
| crowded_bench_dense | composition | 0 | 0 | 0 | 0 | Y | **WARN** |
| drug_dilution_plate_workspace | composition | 0 | 0 | 0 | 0 | Y | **WARN** |
| drug_dilution_workspace_dense | composition | 0 | 0 | 0 | 0 | Y | **WARN** |
| electrophoresis_bench | composition | 0 | 0 | 0 | 0 | Y | **WARN** |
| hood_basic | template | 0 | 0 | 0 | 0 | - | **PASS_TEMPLATE** |
| microscope_basic | template | 0 | 0 | 0 | 0 | - | **PASS_TEMPLATE** |
| staining_bench | composition | 0 | 0 | 0 | 0 | Y | **WARN** |
| well_plate_96_zoom | composition | 0 | 0 | 0 | 0 | N | **PASS** |

## Detailed Findings

### bench_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393x279, rendered 320x240
  - area ratio 70%, aspect mismatch 5.3%
- right_tool_p200_micropipette (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34x150, rendered 50x90
  - area ratio 88.2%, aspect mismatch 145.1%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom

**Verdict: PASS_TEMPLATE**

### cell_counter_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- front_tools_counter_slide_cartridge (counter_slide_cartridge): rendered area 19.8% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 212x150, rendered 70x90
  - area ratio 19.8%, aspect mismatch 45%

**Sub-check b: Artwork Extends Outside Card**
- front_tools_counter_slide_cartridge: artwork extends outside card on bottom

**Verdict: PASS_TEMPLATE**

### crowded_bench_dense

**Primary Object Ratio Flag**: 0.6% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.547, max=0.778

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_coomassie_stain (coomassie_stain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_destain (destain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_ddh2o (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69x150, rendered 90x110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_coomassie_recycle (coomassie_recycle_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_destain_waste (destain_waste_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_laemmli_buffer (laemmli_4x_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_bme_bottle (bme_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_staining_tray (staining_tray): rendered area 325.9% of natural (unintentional upscaling)
  - natural 108x150, rendered 220x240
  - area ratio 325.9%, aspect mismatch 27.3%
- center_kimwipe_pad (kimwipe_pad): rendered area 44.0% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150x150, rendered 90x110
  - area ratio 44%, aspect mismatch 18.2%
- center_gel_cassette (gel_cassette): rendered area 218.9% of natural (unintentional upscaling)
  - natural 134x150, rendered 220x200
  - area ratio 218.9%, aspect mismatch 23.1%
- front_microwave (microwave): rendered area 215.1% of natural (unintentional upscaling)
  - natural 150x150, rendered 220x220
  - area ratio 215.1%, aspect mismatch 0%
- front_rocking_shaker (rocking_shaker): rendered area 302.6% of natural (unintentional upscaling)
  - natural 126x150, rendered 220x260
  - area ratio 302.6%, aspect mismatch 0.7%
- front_waste_container (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90x150, rendered 90x110
  - area ratio 73.3%, aspect mismatch 36.4%

**Sub-check b: Artwork Extends Outside Card**
- center_staining_tray: artwork extends outside card on bottom
- center_kimwipe_pad: artwork extends outside card on bottom
- center_gel_cassette: artwork extends outside card on bottom
- front_microwave: artwork extends outside card on bottom
- front_rocking_shaker: artwork extends outside card on bottom

**Verdict: WARN**

### drug_dilution_plate_workspace

**Primary Object Ratio Flag**: 1.4% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.542, max=0.774

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_dmso_bottle (stock_bottle): rendered area 171.6% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x154
  - area ratio 171.6%, aspect mismatch 61.8%
- rear_pbs_bottle (stock_bottle): rendered area 134.3% of natural (unintentional upscaling)
  - natural 69x150, rendered 90x154
  - area ratio 134.3%, aspect mismatch 26.6%
- rear_drug_bottle (stock_bottle): rendered area 171.6% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x154
  - area ratio 171.6%, aspect mismatch 61.8%
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393x279, rendered 320x240
  - area ratio 70%, aspect mismatch 5.3%
- work_sample_rack (tube_rack_24): aspect mismatch 12.5% (natural 1.00, rendered 0.88)
  - natural 150x150, rendered 140x160
  - area ratio 99.6%, aspect mismatch 12.5%
- tool_tips (tip_box): rendered area 8.7% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230x150, rendered 50x60
  - area ratio 8.7%, aspect mismatch 45.7%
- tool_p200 (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34x150, rendered 50x90
  - area ratio 88.2%, aspect mismatch 145.1%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom
- work_sample_rack: artwork extends outside card on bottom
- tool_tips: artwork extends outside card on bottom

**Verdict: WARN**

### drug_dilution_workspace_dense

**Primary Object Ratio Flag**: 0.6% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.532, max=0.769

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_dmso_bottle (dmso_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_pbs_bottle (pbs_buffer_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69x150, rendered 90x110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_drug_bottle_1 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_drug_bottle_2 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_drug_bottle_3 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_ethanol_bottle (ethanol_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69x150, rendered 90x110
  - area ratio 95.7%, aspect mismatch 77.9%
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393x279, rendered 320x240
  - area ratio 70%, aspect mismatch 5.3%
- work_sample_rack_1 (tube_rack_24): aspect mismatch 45.3% (natural 1.60, rendered 0.88)
  - natural 240x150, rendered 140x160
  - area ratio 62.2%, aspect mismatch 45.3%
- work_sample_rack_2 (tube_rack_24): aspect mismatch 12.5% (natural 1.00, rendered 0.88)
  - natural 150x150, rendered 140x160
  - area ratio 99.6%, aspect mismatch 12.5%
- work_vial_rack (drug_vial_rack): rendered area 50.5% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 300x148, rendered 140x160
  - area ratio 50.5%, aspect mismatch 56.8%
- tool_p200_micropipette (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34x150, rendered 50x90
  - area ratio 88.2%, aspect mismatch 145.1%
- tool_tip_box (tip_box): rendered area 8.7% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230x150, rendered 50x60
  - area ratio 8.7%, aspect mismatch 45.7%
- waste_container_main (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90x150, rendered 90x110
  - area ratio 73.3%, aspect mismatch 36.4%
- waste_tray_secondary (waste_tray): rendered area 31.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 210x150, rendered 90x110
  - area ratio 31.4%, aspect mismatch 41.6%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom
- work_sample_rack_1: artwork extends outside card on bottom
- work_sample_rack_2: artwork extends outside card on bottom
- work_vial_rack: artwork extends outside card on bottom

**Verdict: WARN**

### electrophoresis_bench

**Label-Label Overlaps** (1 pairs):
- center_electrophoresis_tank &harr; center_electrode_module

**Primary Object Ratio Flag**: 0.7% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.52, max=0.754

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_running_buffer_10x (running_buffer_10x_bottle): rendered area 135.8% of natural (unintentional upscaling)
  - natural 54x150, rendered 100x110
  - area ratio 135.8%, aspect mismatch 152.5%
- center_running_buffer_1x_carboy (running_buffer_1x_carboy): rendered area 170.0% of natural (unintentional upscaling)
  - natural 43x150, rendered 100x110
  - area ratio 170%, aspect mismatch 216%
- center_ddh2o_bottle (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69x150, rendered 90x110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_left_recycle_buffer_bottle (recycle_buffer_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_waste_container (waste_container): aspect mismatch 41.6% (natural 0.60, rendered 0.85)
  - natural 90x150, rendered 93x110
  - area ratio 76.1%, aspect mismatch 41.6%
- center_electrophoresis_tank (electrophoresis_tank): rendered area 292.2% of natural (unintentional upscaling)
  - natural 230x150, rendered 360x280
  - area ratio 292.2%, aspect mismatch 16.1%
- center_gel_cassette (gel_cassette): rendered area 218.9% of natural (unintentional upscaling)
  - natural 134x150, rendered 220x200
  - area ratio 218.9%, aspect mismatch 23.1%
- center_electrode_module (electrode_module): rendered area 195.6% of natural (unintentional upscaling)
  - natural 150x150, rendered 220x200
  - area ratio 195.6%, aspect mismatch 10%
- center_serological_pipette (serological_pipette): rendered area 188.2% of natural (unintentional upscaling)
  - natural 17x150, rendered 80x60
  - area ratio 188.2%, aspect mismatch 1076.5%
- right_tool_area_p200_micropipette (p200_micropipette): rendered area 129.4% of natural (unintentional upscaling)
  - natural 34x150, rendered 73x90
  - area ratio 129.4%, aspect mismatch 259.4%
- right_tool_area_p10_gel_loading_tip_box (p10_gel_loading_tip_box): rendered area 11.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230x150, rendered 66x60
  - area ratio 11.4%, aspect mismatch 28.6%
- rear_left_protein_ladder_tube (protein_ladder_tube): rendered area 53.9% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 89x150, rendered 80x90
  - area ratio 53.9%, aspect mismatch 49.8%
- rear_right_gel_opening_tool (gel_opening_tool): rendered area 28.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150x150, rendered 80x80
  - area ratio 28.4%, aspect mismatch 0%
- front_left_mini_protean_gel (mini_protean_gel): rendered area 269.1% of natural (unintentional upscaling)
  - natural 134x150, rendered 220x246
  - area ratio 269.1%, aspect mismatch 0.2%
- front_right_gel_comb (gel_comb): rendered area 17.1% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 134x150, rendered 56x62
  - area ratio 17.1%, aspect mismatch 1.4%

**Sub-check b: Artwork Extends Outside Card**
- center_electrophoresis_tank: artwork extends outside card on bottom
- center_gel_cassette: artwork extends outside card on bottom
- center_electrode_module: artwork extends outside card on bottom
- center_serological_pipette: artwork extends outside card on bottom
- front_left_mini_protean_gel: artwork extends outside card on bottom

**Verdict: WARN**

### hood_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_ethanol_bottle (ethanol_bottle): aspect mismatch 69.1% (natural 0.46, rendered 0.78)
  - natural 69x150, rendered 70x90
  - area ratio 60.9%, aspect mismatch 69.1%
- rear_center_ddh2o_spray (ddh2o_spray_bottle): aspect mismatch 148.3% (natural 0.34, rendered 0.84)
  - natural 51x150, rendered 76x90
  - area ratio 89.4%, aspect mismatch 148.3%
- center_p1000_pipette (p1000_pipette): rendered area 138.0% of natural (unintentional upscaling)
  - natural 17x150, rendered 44x80
  - area ratio 138%, aspect mismatch 385.3%

**Verdict: PASS_TEMPLATE**

### microscope_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

**Verdict: PASS_TEMPLATE**

### staining_bench

**Primary Object Ratio Flag**: 0.7% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.547, max=0.777

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_coomassie_stain (coomassie_stain_bottle): rendered area 127.8% of natural (unintentional upscaling)
  - natural 54x150, rendered 94x110
  - area ratio 127.8%, aspect mismatch 137.6%
- rear_center_destain (destain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_right_ddh2o (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69x150, rendered 90x110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_left_coomassie_recycle (coomassie_recycle_bottle): rendered area 135.8% of natural (unintentional upscaling)
  - natural 54x150, rendered 100x110
  - area ratio 135.8%, aspect mismatch 152.5%
- rear_center_destain_waste (destain_waste_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54x150, rendered 90x110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_staining_tray (staining_tray): rendered area 325.9% of natural (unintentional upscaling)
  - natural 108x150, rendered 220x240
  - area ratio 325.9%, aspect mismatch 27.3%
- center_kimwipe_pad (kimwipe_pad): rendered area 44.0% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150x150, rendered 90x110
  - area ratio 44%, aspect mismatch 18.2%
- center_waste_container (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90x150, rendered 90x110
  - area ratio 73.3%, aspect mismatch 36.4%
- right_tool_area_microwave (microwave): rendered area 215.1% of natural (unintentional upscaling)
  - natural 150x150, rendered 220x220
  - area ratio 215.1%, aspect mismatch 0%
- right_tool_area_rocking_shaker (rocking_shaker): rendered area 302.6% of natural (unintentional upscaling)
  - natural 126x150, rendered 220x260
  - area ratio 302.6%, aspect mismatch 0.7%

**Sub-check b: Artwork Extends Outside Card**
- center_staining_tray: artwork extends outside card on bottom
- center_kimwipe_pad: artwork extends outside card on bottom
- center_waste_container: artwork extends outside card on bottom
- right_tool_area_microwave: artwork extends outside card on bottom
- right_tool_area_rocking_shaker: artwork extends outside card on bottom

**Verdict: WARN**

### well_plate_96_zoom

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- zoom_well_plate_96 (well_plate_96): rendered area 875.5% of natural (unintentional upscaling)
  - natural 393x279, rendered 1200x800
  - area ratio 875.5%, aspect mismatch 6.5%

**Verdict: PASS**

