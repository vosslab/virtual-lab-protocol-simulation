# NEW0 Visual Audit Report

## Summary

| Metric | Value |
| --- | --- |
| Total Scenes | 10 |
| PASS | 0 |
| PASS_TEMPLATE | 2 |
| WARN | 0 |
| FAIL | 8 |
| Checks with Issues | 16 |

## Scene-Composition Diagnostics

| Scene | Mode | Clipped | Off-Page | SVG-SVG | Region-Overflow | Primary-Ratio | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | template | 0 | 0 | 0 | 0 | — | **FAIL** |
| cell_counter_basic | template | 0 | 0 | 0 | 0 | — | **PASS_TEMPLATE** |
| crowded_bench_dense | composition | 0 | 0 | 0 | 0 | Y | **FAIL** |
| drug_dilution_plate_workspace | composition | 0 | 0 | 0 | 0 | Y | **FAIL** |
| drug_dilution_workspace_dense | composition | 0 | 0 | 0 | 0 | Y | **FAIL** |
| electrophoresis_bench | composition | 0 | 0 | 0 | 0 | Y | **FAIL** |
| hood_basic | template | 0 | 0 | 0 | 0 | — | **FAIL** |
| microscope_basic | template | 0 | 0 | 0 | 0 | — | **PASS_TEMPLATE** |
| staining_bench | composition | 0 | 0 | 0 | 0 | Y | **FAIL** |
| well_plate_96_zoom | composition | 0 | 0 | 0 | 0 | N | **FAIL** |

## Detailed Findings

### bench_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393×279, rendered 320×240
  - area ratio 70%, aspect mismatch 5.3%
- right_tool_p200_micropipette (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34×150, rendered 50×90
  - area ratio 88.2%, aspect mismatch 145.1%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- center_well_plate (well_plate_96): SVG cropped by parent overflow on bottom: never crop SVG assets
- right_tool_p200_micropipette (p200_micropipette): SVG cropped by parent overflow on top, bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- center_well_plate (well_plate_96) (HARD FAIL): aspect distorted on plate: 5.3% (natural 1.41, rendered 1.33, tolerance 5%)
- right_tool_p200_micropipette (p200_micropipette) (HARD FAIL): aspect distorted on pipette: 145.1% (natural 0.23, rendered 0.56, tolerance 5%)

**Verdict: FAIL**

### cell_counter_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- front_tools_counter_slide_cartridge (counter_slide_cartridge): rendered area 19.8% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 212×150, rendered 70×90
  - area ratio 19.8%, aspect mismatch 45%

**Sub-check b: Artwork Extends Outside Card**
- front_tools_counter_slide_cartridge: artwork extends outside card on bottom

**Sub-check f: Rendered Aspect Distorted vs Natural**
- front_tools_counter_slide_cartridge (counter_slide_cartridge): aspect distorted: 45.0% (natural 1.41, rendered 0.78, tolerance 5%)

**Verdict: PASS_TEMPLATE**

### crowded_bench_dense

**Primary Object Ratio Flag**: 0.6% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.547, max=0.778

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_coomassie_stain (coomassie_stain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_destain (destain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_ddh2o (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69×150, rendered 90×110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_coomassie_recycle (coomassie_recycle_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_destain_waste (destain_waste_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_laemmli_buffer (laemmli_4x_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_bme_bottle (bme_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_staining_tray (staining_tray): rendered area 325.9% of natural (unintentional upscaling)
  - natural 108×150, rendered 220×240
  - area ratio 325.9%, aspect mismatch 27.3%
- center_kimwipe_pad (kimwipe_pad): rendered area 44.0% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150×150, rendered 90×110
  - area ratio 44%, aspect mismatch 18.2%
- center_gel_cassette (gel_cassette): rendered area 218.9% of natural (unintentional upscaling)
  - natural 134×150, rendered 220×200
  - area ratio 218.9%, aspect mismatch 23.1%
- front_microwave (microwave): rendered area 215.1% of natural (unintentional upscaling)
  - natural 150×150, rendered 220×220
  - area ratio 215.1%, aspect mismatch 0%
- front_rocking_shaker (rocking_shaker): rendered area 302.6% of natural (unintentional upscaling)
  - natural 126×150, rendered 220×260
  - area ratio 302.6%, aspect mismatch 0.7%
- front_waste_container (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90×150, rendered 90×110
  - area ratio 73.3%, aspect mismatch 36.4%

**Sub-check b: Artwork Extends Outside Card**
- center_staining_tray: artwork extends outside card on bottom
- center_kimwipe_pad: artwork extends outside card on bottom
- center_gel_cassette: artwork extends outside card on bottom
- front_microwave: artwork extends outside card on bottom
- front_rocking_shaker: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_coomassie_stain (coomassie_stain_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_destain (destain_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_ddh2o (ddh2o_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_coomassie_recycle (coomassie_recycle_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_destain_waste (destain_waste_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_laemmli_buffer (laemmli_4x_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_bme_bottle (bme_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_staining_tray (staining_tray): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_kimwipe_pad (kimwipe_pad): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_gel_cassette (gel_cassette): SVG cropped by parent overflow on bottom: never crop SVG assets
- front_microwave (microwave): SVG cropped by parent overflow on bottom: never crop SVG assets
- front_rocking_shaker (rocking_shaker): SVG cropped by parent overflow on bottom: never crop SVG assets
- front_waste_container (waste_container): SVG cropped by parent overflow on top, bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_coomassie_stain (coomassie_stain_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_destain (destain_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_ddh2o (ddh2o_bottle) (HARD FAIL): aspect distorted on glassware: 77.9% (natural 0.46, rendered 0.82, tolerance 5%)
- rear_coomassie_recycle (coomassie_recycle_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_destain_waste (destain_waste_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_laemmli_buffer (laemmli_4x_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_bme_bottle (bme_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- center_staining_tray (staining_tray): aspect distorted: 27.3% (natural 0.72, rendered 0.92, tolerance 5%)
- center_kimwipe_pad (kimwipe_pad): aspect distorted: 18.2% (natural 1.00, rendered 0.82, tolerance 5%)
- center_gel_cassette (gel_cassette): aspect distorted: 23.1% (natural 0.89, rendered 1.10, tolerance 5%)
- front_waste_container (waste_container): aspect distorted: 36.4% (natural 0.60, rendered 0.82, tolerance 5%)

**Verdict: FAIL**

### drug_dilution_plate_workspace

**Primary Object Ratio Flag**: 1.4% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.542, max=0.774

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_dmso_bottle (stock_bottle): rendered area 171.6% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×154
  - area ratio 171.6%, aspect mismatch 61.8%
- rear_pbs_bottle (stock_bottle): rendered area 134.3% of natural (unintentional upscaling)
  - natural 69×150, rendered 90×154
  - area ratio 134.3%, aspect mismatch 26.6%
- rear_drug_bottle (stock_bottle): rendered area 171.6% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×154
  - area ratio 171.6%, aspect mismatch 61.8%
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393×279, rendered 320×240
  - area ratio 70%, aspect mismatch 5.3%
- work_sample_rack (tube_rack_24): aspect mismatch 12.5% (natural 1.00, rendered 0.88)
  - natural 150×150, rendered 140×160
  - area ratio 99.6%, aspect mismatch 12.5%
- tool_tips (tip_box): rendered area 8.7% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230×150, rendered 50×60
  - area ratio 8.7%, aspect mismatch 45.7%
- tool_p200 (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34×150, rendered 50×90
  - area ratio 88.2%, aspect mismatch 145.1%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom
- work_sample_rack: artwork extends outside card on bottom
- tool_tips: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_dmso_bottle (stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_pbs_bottle (stock_bottle): SVG cropped by parent overflow on top: never crop SVG assets
- rear_drug_bottle (stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_well_plate (well_plate_96): SVG cropped by parent overflow on bottom: never crop SVG assets
- work_sample_rack (tube_rack_24): SVG cropped by parent overflow on bottom: never crop SVG assets
- tool_tips (tip_box): SVG cropped by parent overflow on bottom: never crop SVG assets
- tool_p200 (p200_micropipette): SVG cropped by parent overflow on top, bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_dmso_bottle (stock_bottle) (HARD FAIL): aspect distorted on glassware: 61.8% (natural 0.36, rendered 0.58, tolerance 5%)
- rear_pbs_bottle (stock_bottle) (HARD FAIL): aspect distorted on glassware: 26.6% (natural 0.46, rendered 0.58, tolerance 5%)
- rear_drug_bottle (stock_bottle) (HARD FAIL): aspect distorted on glassware: 61.8% (natural 0.36, rendered 0.58, tolerance 5%)
- center_well_plate (well_plate_96) (HARD FAIL): aspect distorted on plate: 5.3% (natural 1.41, rendered 1.33, tolerance 5%)
- work_sample_rack (tube_rack_24) (HARD FAIL): aspect distorted on glassware: 12.5% (natural 1.00, rendered 0.88, tolerance 5%)
- tool_tips (tip_box) (HARD FAIL): aspect distorted on pipette: 45.7% (natural 1.53, rendered 0.83, tolerance 5%)
- tool_p200 (p200_micropipette) (HARD FAIL): aspect distorted on pipette: 145.1% (natural 0.23, rendered 0.56, tolerance 5%)

**Verdict: FAIL**

### drug_dilution_workspace_dense

**Primary Object Ratio Flag**: 0.6% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.532, max=0.769

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_dmso_bottle (dmso_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_pbs_bottle (pbs_buffer_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69×150, rendered 90×110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_drug_bottle_1 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_drug_bottle_2 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_drug_bottle_3 (drug_stock_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_ethanol_bottle (ethanol_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69×150, rendered 90×110
  - area ratio 95.7%, aspect mismatch 77.9%
- center_well_plate (well_plate_96): aspect mismatch 5.3% (natural 1.41, rendered 1.33)
  - natural 393×279, rendered 320×240
  - area ratio 70%, aspect mismatch 5.3%
- work_sample_rack_1 (tube_rack_24): aspect mismatch 45.3% (natural 1.60, rendered 0.88)
  - natural 240×150, rendered 140×160
  - area ratio 62.2%, aspect mismatch 45.3%
- work_sample_rack_2 (tube_rack_24): aspect mismatch 12.5% (natural 1.00, rendered 0.88)
  - natural 150×150, rendered 140×160
  - area ratio 99.6%, aspect mismatch 12.5%
- work_vial_rack (drug_vial_rack): rendered area 50.5% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 300×148, rendered 140×160
  - area ratio 50.5%, aspect mismatch 56.8%
- tool_p200_micropipette (p200_micropipette): aspect mismatch 145.1% (natural 0.23, rendered 0.56)
  - natural 34×150, rendered 50×90
  - area ratio 88.2%, aspect mismatch 145.1%
- tool_tip_box (tip_box): rendered area 8.7% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230×150, rendered 50×60
  - area ratio 8.7%, aspect mismatch 45.7%
- waste_container_main (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90×150, rendered 90×110
  - area ratio 73.3%, aspect mismatch 36.4%
- waste_tray_secondary (waste_tray): rendered area 31.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 210×150, rendered 90×110
  - area ratio 31.4%, aspect mismatch 41.6%

**Sub-check b: Artwork Extends Outside Card**
- center_well_plate: artwork extends outside card on bottom
- work_sample_rack_1: artwork extends outside card on bottom
- work_sample_rack_2: artwork extends outside card on bottom
- work_vial_rack: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_dmso_bottle (dmso_stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_pbs_bottle (pbs_buffer_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_drug_bottle_1 (drug_stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_drug_bottle_2 (drug_stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_drug_bottle_3 (drug_stock_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_ethanol_bottle (ethanol_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_well_plate (well_plate_96): SVG cropped by parent overflow on bottom: never crop SVG assets
- work_sample_rack_1 (tube_rack_24): SVG cropped by parent overflow on bottom: never crop SVG assets
- work_sample_rack_2 (tube_rack_24): SVG cropped by parent overflow on bottom: never crop SVG assets
- work_vial_rack (drug_vial_rack): SVG cropped by parent overflow on bottom: never crop SVG assets
- tool_p200_micropipette (p200_micropipette): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- waste_container_main (waste_container): SVG cropped by parent overflow on top, bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_dmso_bottle (dmso_stock_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_pbs_bottle (pbs_buffer_bottle) (HARD FAIL): aspect distorted on glassware: 77.9% (natural 0.46, rendered 0.82, tolerance 5%)
- rear_drug_bottle_1 (drug_stock_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_drug_bottle_2 (drug_stock_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_drug_bottle_3 (drug_stock_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_ethanol_bottle (ethanol_bottle) (HARD FAIL): aspect distorted on glassware: 77.9% (natural 0.46, rendered 0.82, tolerance 5%)
- center_well_plate (well_plate_96) (HARD FAIL): aspect distorted on plate: 5.3% (natural 1.41, rendered 1.33, tolerance 5%)
- work_sample_rack_1 (tube_rack_24) (HARD FAIL): aspect distorted on glassware: 45.3% (natural 1.60, rendered 0.88, tolerance 5%)
- work_sample_rack_2 (tube_rack_24) (HARD FAIL): aspect distorted on glassware: 12.5% (natural 1.00, rendered 0.88, tolerance 5%)
- work_vial_rack (drug_vial_rack): aspect distorted: 56.8% (natural 2.03, rendered 0.88, tolerance 5%)
- tool_p200_micropipette (p200_micropipette) (HARD FAIL): aspect distorted on pipette: 145.1% (natural 0.23, rendered 0.56, tolerance 5%)
- tool_tip_box (tip_box) (HARD FAIL): aspect distorted on pipette: 45.7% (natural 1.53, rendered 0.83, tolerance 5%)
- waste_container_main (waste_container): aspect distorted: 36.4% (natural 0.60, rendered 0.82, tolerance 5%)
- waste_tray_secondary (waste_tray): aspect distorted: 41.6% (natural 1.40, rendered 0.82, tolerance 5%)

**Verdict: FAIL**

### electrophoresis_bench

**Label-Label Overlaps** (1 pairs):
- center_electrophoresis_tank ↔ center_electrode_module

**Primary Object Ratio Flag**: 0.7% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.52, max=0.754

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_running_buffer_10x (running_buffer_10x_bottle): rendered area 135.8% of natural (unintentional upscaling)
  - natural 54×150, rendered 100×110
  - area ratio 135.8%, aspect mismatch 152.5%
- center_running_buffer_1x_carboy (running_buffer_1x_carboy): rendered area 170.0% of natural (unintentional upscaling)
  - natural 43×150, rendered 100×110
  - area ratio 170%, aspect mismatch 216%
- center_ddh2o_bottle (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69×150, rendered 90×110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_left_recycle_buffer_bottle (recycle_buffer_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_waste_container (waste_container): aspect mismatch 41.6% (natural 0.60, rendered 0.85)
  - natural 90×150, rendered 93×110
  - area ratio 76.1%, aspect mismatch 41.6%
- center_electrophoresis_tank (electrophoresis_tank): rendered area 292.2% of natural (unintentional upscaling)
  - natural 230×150, rendered 360×280
  - area ratio 292.2%, aspect mismatch 16.1%
- center_gel_cassette (gel_cassette): rendered area 218.9% of natural (unintentional upscaling)
  - natural 134×150, rendered 220×200
  - area ratio 218.9%, aspect mismatch 23.1%
- center_electrode_module (electrode_module): rendered area 195.6% of natural (unintentional upscaling)
  - natural 150×150, rendered 220×200
  - area ratio 195.6%, aspect mismatch 10%
- center_serological_pipette (serological_pipette): rendered area 188.2% of natural (unintentional upscaling)
  - natural 17×150, rendered 80×60
  - area ratio 188.2%, aspect mismatch 1076.5%
- right_tool_area_p200_micropipette (p200_micropipette): rendered area 129.4% of natural (unintentional upscaling)
  - natural 34×150, rendered 73×90
  - area ratio 129.4%, aspect mismatch 259.4%
- right_tool_area_p10_gel_loading_tip_box (p10_gel_loading_tip_box): rendered area 11.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 230×150, rendered 66×60
  - area ratio 11.4%, aspect mismatch 28.6%
- rear_left_protein_ladder_tube (protein_ladder_tube): rendered area 53.9% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 89×150, rendered 80×90
  - area ratio 53.9%, aspect mismatch 49.8%
- rear_right_gel_opening_tool (gel_opening_tool): rendered area 28.4% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150×150, rendered 80×80
  - area ratio 28.4%, aspect mismatch 0%
- front_left_mini_protean_gel (mini_protean_gel): rendered area 269.1% of natural (unintentional upscaling)
  - natural 134×150, rendered 220×246
  - area ratio 269.1%, aspect mismatch 0.2%
- front_right_gel_comb (gel_comb): rendered area 17.1% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 134×150, rendered 56×62
  - area ratio 17.1%, aspect mismatch 1.4%

**Sub-check b: Artwork Extends Outside Card**
- center_electrophoresis_tank: artwork extends outside card on bottom
- center_gel_cassette: artwork extends outside card on bottom
- center_electrode_module: artwork extends outside card on bottom
- center_serological_pipette: artwork extends outside card on bottom
- front_left_mini_protean_gel: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_left_running_buffer_10x (running_buffer_10x_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_running_buffer_1x_carboy (running_buffer_1x_carboy): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_ddh2o_bottle (ddh2o_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_left_recycle_buffer_bottle (recycle_buffer_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_waste_container (waste_container): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_electrophoresis_tank (electrophoresis_tank): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_gel_cassette (gel_cassette): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_electrode_module (electrode_module): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_serological_pipette (serological_pipette): SVG cropped by parent overflow on bottom: never crop SVG assets
- right_tool_area_p200_micropipette (p200_micropipette): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_left_protein_ladder_tube (protein_ladder_tube): SVG cropped by parent overflow on top: never crop SVG assets
- front_left_mini_protean_gel (mini_protean_gel): SVG cropped by parent overflow on bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_left_running_buffer_10x (running_buffer_10x_bottle) (HARD FAIL): aspect distorted on glassware: 152.5% (natural 0.36, rendered 0.91, tolerance 5%)
- center_running_buffer_1x_carboy (running_buffer_1x_carboy): aspect distorted: 216.0% (natural 0.29, rendered 0.91, tolerance 5%)
- center_ddh2o_bottle (ddh2o_bottle) (HARD FAIL): aspect distorted on glassware: 77.9% (natural 0.46, rendered 0.82, tolerance 5%)
- rear_left_recycle_buffer_bottle (recycle_buffer_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- center_waste_container (waste_container): aspect distorted: 41.6% (natural 0.60, rendered 0.85, tolerance 5%)
- center_electrophoresis_tank (electrophoresis_tank) (HARD FAIL): aspect distorted on instrument: 16.1% (natural 1.53, rendered 1.29, tolerance 5%)
- center_gel_cassette (gel_cassette): aspect distorted: 23.1% (natural 0.89, rendered 1.10, tolerance 5%)
- center_electrode_module (electrode_module): aspect distorted: 10.0% (natural 1.00, rendered 1.10, tolerance 5%)
- center_serological_pipette (serological_pipette) (HARD FAIL): aspect distorted on pipette: 1076.5% (natural 0.11, rendered 1.33, tolerance 5%)
- right_tool_area_p200_micropipette (p200_micropipette) (HARD FAIL): aspect distorted on pipette: 259.4% (natural 0.23, rendered 0.81, tolerance 5%)
- right_tool_area_p10_gel_loading_tip_box (p10_gel_loading_tip_box) (HARD FAIL): aspect distorted on pipette: 28.6% (natural 1.53, rendered 1.09, tolerance 5%)
- rear_left_protein_ladder_tube (protein_ladder_tube) (HARD FAIL): aspect distorted on glassware: 49.8% (natural 0.59, rendered 0.89, tolerance 5%)

**Verdict: FAIL**

### hood_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_ethanol_bottle (ethanol_bottle): aspect mismatch 69.1% (natural 0.46, rendered 0.78)
  - natural 69×150, rendered 70×90
  - area ratio 60.9%, aspect mismatch 69.1%
- rear_center_ddh2o_spray (ddh2o_spray_bottle): aspect mismatch 148.3% (natural 0.34, rendered 0.84)
  - natural 51×150, rendered 76×90
  - area ratio 89.4%, aspect mismatch 148.3%
- center_p1000_pipette (p1000_pipette): rendered area 138.0% of natural (unintentional upscaling)
  - natural 17×150, rendered 44×80
  - area ratio 138%, aspect mismatch 385.3%

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_left_ethanol_bottle (ethanol_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_center_ddh2o_spray (ddh2o_spray_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_p1000_pipette (p1000_pipette): SVG cropped by parent overflow on top, bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_left_ethanol_bottle (ethanol_bottle) (HARD FAIL): aspect distorted on glassware: 69.1% (natural 0.46, rendered 0.78, tolerance 5%)
- rear_center_ddh2o_spray (ddh2o_spray_bottle) (HARD FAIL): aspect distorted on glassware: 148.3% (natural 0.34, rendered 0.84, tolerance 5%)
- center_p1000_pipette (p1000_pipette) (HARD FAIL): aspect distorted on pipette: 385.3% (natural 0.11, rendered 0.55, tolerance 5%)

**Verdict: FAIL**

### microscope_basic

**Primary Object Ratio**: SKIPPED (template-mode scene)

**Verdict: PASS_TEMPLATE**

### staining_bench

**Primary Object Ratio Flag**: 0.7% (threshold=25%, zoom=false)

**Supporting Object Distance**: mean=0.547, max=0.777

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- rear_left_coomassie_stain (coomassie_stain_bottle): rendered area 127.8% of natural (unintentional upscaling)
  - natural 54×150, rendered 94×110
  - area ratio 127.8%, aspect mismatch 137.6%
- rear_center_destain (destain_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- rear_right_ddh2o (ddh2o_bottle): aspect mismatch 77.9% (natural 0.46, rendered 0.82)
  - natural 69×150, rendered 90×110
  - area ratio 95.7%, aspect mismatch 77.9%
- rear_left_coomassie_recycle (coomassie_recycle_bottle): rendered area 135.8% of natural (unintentional upscaling)
  - natural 54×150, rendered 100×110
  - area ratio 135.8%, aspect mismatch 152.5%
- rear_center_destain_waste (destain_waste_bottle): rendered area 122.2% of natural (unintentional upscaling)
  - natural 54×150, rendered 90×110
  - area ratio 122.2%, aspect mismatch 127.3%
- center_staining_tray (staining_tray): rendered area 325.9% of natural (unintentional upscaling)
  - natural 108×150, rendered 220×240
  - area ratio 325.9%, aspect mismatch 27.3%
- center_kimwipe_pad (kimwipe_pad): rendered area 44.0% of natural (forced shrink suggests object-fit:contain underutilization)
  - natural 150×150, rendered 90×110
  - area ratio 44%, aspect mismatch 18.2%
- center_waste_container (waste_container): aspect mismatch 36.4% (natural 0.60, rendered 0.82)
  - natural 90×150, rendered 90×110
  - area ratio 73.3%, aspect mismatch 36.4%
- right_tool_area_microwave (microwave): rendered area 215.1% of natural (unintentional upscaling)
  - natural 150×150, rendered 220×220
  - area ratio 215.1%, aspect mismatch 0%
- right_tool_area_rocking_shaker (rocking_shaker): rendered area 302.6% of natural (unintentional upscaling)
  - natural 126×150, rendered 220×260
  - area ratio 302.6%, aspect mismatch 0.7%

**Sub-check b: Artwork Extends Outside Card**
- center_staining_tray: artwork extends outside card on bottom
- center_kimwipe_pad: artwork extends outside card on bottom
- center_waste_container: artwork extends outside card on bottom
- right_tool_area_microwave: artwork extends outside card on bottom
- right_tool_area_rocking_shaker: artwork extends outside card on bottom

**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**
- rear_left_coomassie_stain (coomassie_stain_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_center_destain (destain_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_right_ddh2o (ddh2o_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_left_coomassie_recycle (coomassie_recycle_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- rear_center_destain_waste (destain_waste_bottle): SVG cropped by parent overflow on top, bottom: never crop SVG assets
- center_staining_tray (staining_tray): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_kimwipe_pad (kimwipe_pad): SVG cropped by parent overflow on bottom: never crop SVG assets
- center_waste_container (waste_container): SVG cropped by parent overflow on bottom: never crop SVG assets
- right_tool_area_microwave (microwave): SVG cropped by parent overflow on bottom: never crop SVG assets
- right_tool_area_rocking_shaker (rocking_shaker): SVG cropped by parent overflow on bottom: never crop SVG assets

**Sub-check f: Rendered Aspect Distorted vs Natural**
- rear_left_coomassie_stain (coomassie_stain_bottle) (HARD FAIL): aspect distorted on glassware: 137.6% (natural 0.36, rendered 0.86, tolerance 5%)
- rear_center_destain (destain_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- rear_right_ddh2o (ddh2o_bottle) (HARD FAIL): aspect distorted on glassware: 77.9% (natural 0.46, rendered 0.82, tolerance 5%)
- rear_left_coomassie_recycle (coomassie_recycle_bottle) (HARD FAIL): aspect distorted on glassware: 152.5% (natural 0.36, rendered 0.91, tolerance 5%)
- rear_center_destain_waste (destain_waste_bottle) (HARD FAIL): aspect distorted on glassware: 127.3% (natural 0.36, rendered 0.82, tolerance 5%)
- center_staining_tray (staining_tray): aspect distorted: 27.3% (natural 0.72, rendered 0.92, tolerance 5%)
- center_kimwipe_pad (kimwipe_pad): aspect distorted: 18.2% (natural 1.00, rendered 0.82, tolerance 5%)
- center_waste_container (waste_container): aspect distorted: 36.4% (natural 0.60, rendered 0.82, tolerance 5%)

**Verdict: FAIL**

### well_plate_96_zoom

## Artwork Integrity Diagnostics

**Sub-check a: Natural vs Rendered Aspect / Area Issues**
- zoom_well_plate_96 (well_plate_96): rendered area 875.5% of natural (unintentional upscaling)
  - natural 393×279, rendered 1200×800
  - area ratio 875.5%, aspect mismatch 6.5%

**Sub-check f: Rendered Aspect Distorted vs Natural**
- zoom_well_plate_96 (well_plate_96) (HARD FAIL): aspect distorted on plate: 6.5% (natural 1.41, rendered 1.50, tolerance 5%)

**Verdict: FAIL**

