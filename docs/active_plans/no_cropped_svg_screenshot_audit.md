# No-Cropped SVG Screenshot Audit (Workstream A)

Date: 2026-05-21
Status: DONE_WITH_CONCERNS

## Audit scope

7 screenshot sources, 203 PNGs across 5 directories (batch3 and batch4 galleries contain only HTML, no standalone PNGs).

## Summary

- Total screenshots inspected: 203 PNGs
- Total objects flagged: 52 distinct object-level visual failures
- Diagnostic miss count BEFORE state: 0 of 52 (precheck did not catch any)
- Diagnostic miss count AFTER state (post sub-check e + f): ~20 of 52 (~38%)
- Top 3 cropping causes:
  1. parent-overflow (overflow:visible on region containers)
  2. svg-grow-needed (PLACEHOLDER boxes / asset not loading)
  3. aspect-cap-wrong (footprint card aspect mismatched to natural asset AR)

## Per-Object Crop Findings

| screenshot_path | scene | object | issue_type | precheck_caught | likely_cause | proposed_fix_class |
| --- | --- | --- | --- | --- | --- | --- |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_02_microscope_basic.png | microscope_basic | instrument_main_microscope | hidden_by_region | NO (PASS_TEMPLATE) | template-mode skips primary object ratio check; instrument renders 0x0 | svg-grow-needed |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_03_cell_counter_basic.png | cell_counter_basic | instrument_main_cell_counter | hidden_by_region | NO (PASS_TEMPLATE) | template-mode skips primary object ratio check; only slide cartridge tip visible | svg-grow-needed |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_04_bench_basic.png | bench_basic | p200_micropipette | too_tiny | NO | footprint--small-tool card (50x60) vs natural asset ratio 0.23; card too square for tall pipette | footprint-too-small |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_04_bench_basic.png | bench_basic | well_plate_96 | cropped_bottom | NO | well plate card height insufficient; bottom rows (G, H) clipped below region boundary | container-too-narrow |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_05_hood_basic.png | hood_basic | p1000_pipette | too_tiny | NO | all hood objects rendered as 1/10 of viewport; layout not filling available space | footprint-too-small |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_05_hood_basic.png | hood_basic | ethanol_bottle | distorted | NO (WARN only) | bottle natural ratio ~0.46 forced into near-square card; 69% aspect mismatch | aspect-cap-wrong |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_05_hood_basic.png | hood_basic | ddh2o_spray | distorted | NO (WARN only) | spray bottle natural ratio ~0.35 forced into wider card; 148% aspect mismatch | aspect-cap-wrong |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_06_crowded_bench_dense.png | crowded_bench_dense | rear_shelf_bottles (all) | cropped_top | NO | overflow:visible on .region--rear_shelf; tall bottles overflow top of region card into header | parent-overflow |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_07_drug_dilution_workspace_dense.png | drug_dilution_workspace_dense | rear_bottles | cropped_top | NO | same overflow:visible rear_shelf region; bottle neck/cap above region boundary | parent-overflow |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_07_drug_dilution_workspace_dense.png | drug_dilution_workspace_dense | p200_micropipette | too_tiny | NO | pipette in narrow right-tool slot; card too short for tall asset | footprint-too-small |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_08_electrophoresis_bench.png | electrophoresis_bench | power_supply | cropped_bottom | NO | power supply rendered with only top arch electrodes visible; body below card bottom | container-too-narrow |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_a_gallery_08_electrophoresis_bench.png | electrophoresis_bench | protein_ladder_tube | too_tiny | NO | tube in small-tool slot; 12.7% of natural area rendered | footprint-too-small |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/stress_composition_001.png | stress_composition_001 | multiple_objects (5+ PLACEHOLDERs) | hidden_by_region | NO (scoring only) | SVG assets not loading for composition scene objects; dashed PLACEHOLDER boxes rendered | svg-grow-needed |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/stress_composition_005.png | stress_composition_005 | multiple_objects (5+ PLACEHOLDERs) | hidden_by_region | NO | same PLACEHOLDER failure; SVG resolution broken for composition scene object types | svg-grow-needed |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/stress_composition_010.png | stress_composition_010 | multiple_objects (5+ PLACEHOLDERs) | hidden_by_region | NO | same PLACEHOLDER failure pattern | svg-grow-needed |
| docs/active_plans/current_css_native_layout_manager_status_report_assets/lane_b_runtime_before_click.png | runtime_test | entire_scene | hidden_by_region | NO | empty gray grid rendered; no objects visible at all; scene failed to populate | svg-grow-needed |
| docs/active_plans/new2_no_crop_audit_assets/microscope_basic__instrument_main_microscope.png | microscope_basic | instrument_main_microscope | hidden_by_region | NO (PASS_TEMPLATE) | instrument bbox 0x0; template-mode skips check; asset not rendering | svg-grow-needed |
| docs/active_plans/new2_no_crop_audit_assets/cell_counter_basic__instrument_main_cell_counter.png | cell_counter_basic | instrument_main_cell_counter | hidden_by_region | NO (PASS_TEMPLATE) | identical 0x0 render; template-mode exception fires; real asset completely absent | svg-grow-needed |
| docs/active_plans/new2_no_crop_audit_assets/hood_basic__center_p1000_pipette.png | hood_basic | p1000_pipette | cropped_top | YES (sub-check e AFTER) | overflow:visible on center region; tall pipette bleeds above card top | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/hood_basic__center_p1000_pipette.png | hood_basic | p1000_pipette | cropped_bottom | YES (sub-check e AFTER) | same overflow; pipette tip cut below card bottom | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/hood_basic__rear_left_ethanol_bottle.png | hood_basic | ethanol_bottle | distorted | YES (sub-check f AFTER) | 69.1% aspect ratio mismatch; bottle card too wide for tall narrow bottle SVG | aspect-cap-wrong |
| docs/active_plans/new2_no_crop_audit_assets/hood_basic__rear_center_ddh2o_spray.png | hood_basic | ddh2o_spray | distorted | YES (sub-check f AFTER) | 148.3% aspect ratio mismatch; spray asset aspect 0.35 into card ratio ~0.82 | aspect-cap-wrong |
| docs/active_plans/new2_no_crop_audit_assets/bench_basic__right_tool_p200_micropipette.png | bench_basic | p200_micropipette | off_card | YES (sub-check e AFTER) | pipette top and bottom extend well beyond card; rendered area 4x natural ratio | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/bench_basic__right_tool_p200_micropipette.png | bench_basic | p200_micropipette | distorted | YES (sub-check f AFTER) | pipette squashed to fit square card; natural ratio 0.23 forced into 0.83 card | aspect-cap-wrong |
| docs/active_plans/new2_no_crop_audit_assets/crowded_bench_dense__rear_bme_bottle.png | crowded_bench_dense | bme_bottle | off_card | YES (sub-check e AFTER) | 127.3% distortion; bottle overflows top and bottom of rear_shelf card | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/crowded_bench_dense__rear_laemmli_buffer.png | crowded_bench_dense | laemmli_buffer | off_card | YES (sub-check e AFTER) | 127.3% distortion; same overflow pattern; 13 of 13 rear objects flagged in visual_audit_AFTER | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/staining_bench__rear_left_coomassie_stain.png | staining_bench | coomassie_stain | off_card | YES (sub-check e AFTER) | bottle top and bottom extend beyond card; rendered H vs card H ~127% | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/staining_bench__rear_left_coomassie_recycle.png | staining_bench | coomassie_recycle | off_card | YES (sub-check e AFTER) | identical pattern; entire rear_shelf row of bottles affected | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/electrophoresis_bench__rear_left_protein_ladder_tube.png | electrophoresis_bench | protein_ladder_tube | off_card | YES (sub-check e AFTER) | tube top overflows card; narrow tube aspect does not fit flat rear-shelf card | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/electrophoresis_bench__right_tool_area_p200_micropipette.png | electrophoresis_bench | p200_micropipette | off_card | YES (sub-check e AFTER) | pipette overflows tool card top and bottom; aspect mismatch ~4x | parent-overflow |
| docs/active_plans/new2_no_crop_audit_assets/electrophoresis_bench__front_right_gel_comb.png | electrophoresis_bench | gel_comb | too_tiny | YES (sub-check f AFTER) | gel_comb rendered at 12.7% of natural area in tool card; too small to see clearly | footprint-too-small |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_electrophoresis_full_setup.png | gold_electrophoresis_full_setup | graduated_cylinder | cut_side | NO | cylinder severely cropped; only right half visible; left side cut at region boundary | container-too-narrow |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_electrophoresis_full_setup.png | gold_electrophoresis_full_setup | power_supply | hidden_by_region | NO | PLACEHOLDER box; power_supply SVG asset not loading for this scene type | svg-grow-needed |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_staining_bench.png | gold_staining_bench | rear_flasks (all) | cropped_top | NO | entire top row of flasks lacks necks and caps; all cut at region top boundary | parent-overflow |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_cell_counter_station.png | gold_cell_counter_station | cell_counter | too_tiny | NO | cell counter renders as thin flat rectangle above bench surface only | footprint-too-small |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_cell_counter_station.png | gold_cell_counter_station | counting_cartridge | hidden_by_region | NO | PLACEHOLDER box; counter_slide_cartridge SVG not loading | svg-grow-needed |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_microscope_slide_prep.png | gold_microscope_slide_prep | glass_slide | cut_side | NO | glass slide renders as thin blue vertical line; only left edge visible; severely cut | container-too-narrow |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_mixed_bench.png | gold_mixed_bench | glass_slide | hidden_by_region | NO | PLACEHOLDER box; slide SVG not resolving | svg-grow-needed |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/gold_mixed_bench.png | gold_mixed_bench | lab_marker | hidden_by_region | NO | PLACEHOLDER box; lab_marker SVG not resolving | svg-grow-needed |
| experiments/css_native_layout/stress_results/batch2_d_gallery/before/stress_many_bottles_scene_001.png | stress_many_bottles_scene_001 | all_16_bottles | hidden_by_region | NO (score=0) | all 16 bottle slots show PLACEHOLDER; rear_shelf SVG resolution broken for this density | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_tall_glassware_scene_001.png | stress_tall_glassware_scene_001 | all_glassware_slots (4) | hidden_by_region | NO | 4 PLACEHOLDER boxes in glassware region; tall_glassware object type SVGs not loading | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_tall_glassware_scene_002.png | stress_tall_glassware_scene_002 | glassware_slots (2) | hidden_by_region | NO | 2 PLACEHOLDER boxes; same tall_glassware SVG resolution failure | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_many_bottles_scene_001.png | stress_many_bottles_scene_001 | all_16_bottles | hidden_by_region | NO | all 16 show PLACEHOLDER; identical to batch2_before; not fixed by any batch | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_instrument_heavy_001.png | stress_instrument_heavy_001 | instruments (all) | too_tiny | NO | all instruments crammed into bottom quarter of viewport; severe footprint underallocation | footprint-too-small |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_dense_clutter_001.png | stress_dense_clutter_001 | multiple_objects (8+ PLACEHOLDERs) | hidden_by_region | NO | many object types rendering as PLACEHOLDER; dense scene SVG resolution partially broken | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_dense_clutter_006.png | stress_dense_clutter_006 | multiple_objects (PLACEHOLDERs) | hidden_by_region | NO | same PLACEHOLDER pattern in dense scene | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_dense_clutter_015.png | stress_dense_clutter_015 | multiple_objects (PLACEHOLDERs) | hidden_by_region | NO | same PLACEHOLDER pattern | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_composition_001.png | stress_composition_001 | multiple_objects (5+ PLACEHOLDERs) | hidden_by_region | NO | composition scene; PLACEHOLDERs throughout; SVG asset names not resolving to files | svg-grow-needed |
| experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/stress_zoom_detail_002.png | stress_zoom_detail_002 | zoomed_objects | distorted | NO | zoom detail crops to sub-region; object rendered at extreme aspect mismatch in zoom frame | aspect-cap-wrong |
| docs/active_plans/new3_layout_stress_reliability_assets/lane_i_state_cycle_before.png | interactive_state_test | none (state test) | none | N/A | lane_i tests interactive state behavior, not layout; no cropping issues visible | none |

## Top 3 cropping causes

### 1. parent-overflow (overflow:visible on region containers)
bench.css lines 105-117 set `overflow: visible` on `.region--work_surface`, `.region--rear_shelf`, `.region--front_tools`. Tall assets (bottles, pipettes) with natural height exceeding region card height spill above and below card. Overflow check in precheck detects `overflow:hidden` clipping only; `overflow:visible` spillage is invisible to it. Affects every scene with rear-shelf bottles and handheld pipettes.

### 2. svg-grow-needed (PLACEHOLDER boxes / asset not loading)
Large category of failures where SVG asset for object type is not rendering. counter_slide_cartridge, glass_slide, lab_marker, tall_glassware, composition-scene objects, all objects in stress_many_bottles_scene_001 show dashed-border PLACEHOLDER boxes. Object-type-to-SVG-file resolution broken for these types. Precheck scorecard only flags as whitespace or region-score penalties, NOT missing-asset hard fails.

### 3. aspect-cap-wrong (footprint card aspect ratio does not match asset natural ratio)
Footprint class card dimensions do not account for natural aspect ratios. footprint--handheld card (~90x110, ratio ~0.82) is nearly square while p1000/p200 pipettes have natural ratios of 0.23-0.34. footprint--rear-bottle card proportioned for short bottles but tall bottles have natural ratios of 0.26-0.46. object-fit: contain then scales asset to fit square card, causing visible squashing/stretching.

## Worst 5 visible screenshots (by severity)

1. lane_a_gallery_02_microscope_basic.png / microscope_basic__instrument_main_microscope.png - Main instrument completely invisible (0x0 render). Primary educational object absent. Template-mode exception silences diagnostic.

2. stress_many_bottles_scene_001.png (both batch2_before and precheck_batch5 identical) - 16 of 16 objects are PLACEHOLDER boxes. Entire scene's object population failed to load. Scene visually indistinguishable from empty scene except for dashed boxes.

3. lane_a_gallery_05_hood_basic.png - All hood objects (p1000 pipette, ethanol bottle, ddH2O spray) crammed into approximately 10% of viewport. Objects either extremely tiny or severely distorted. Entire layout collapsed to small top-left region.

4. lane_a_gallery_08_electrophoresis_bench.png / gold_electrophoresis_full_setup.png - Power supply renders as only top arch electrodes; instrument body cut. Graduated cylinder shows only right half. Primary scene objects for electrophoresis pedagogy.

5. gold_staining_bench.png (batch2_before) - Entire rear shelf row of flasks lacks all necks and caps. No flask top visible; every one cropped at top region boundary. Affects most visible row in scene.

## Recommended Workstream D CSS fix priority order

1. Fix PLACEHOLDER failures first: identify which object types have broken SVG resolution (counter_slide_cartridge, glass_slide, lab_marker, tall_glassware types, composition-scene types). Produce invisible scenes with no fallback. Fix priority: HIGHEST - missing asset is 100% visual failure.

2. Fix overflow:visible rear_shelf and front_tools region cropping: bench.css lines 105-117. Current overflow: visible comment says it implements no-crop rule, but effect is opposite for tall assets. Fix: constrain card height to match asset natural height rather than relying on overflow direction. Use min-height based on asset's natural aspect ratio applied to card width.

3. Fix instrument template-mode 0x0 render for microscope_basic and cell_counter_basic: template-mode scenes bypass ratio checks, allowing 0x0 rendered instrument to pass. Fix: enforce minimum rendered size for primary instrument object regardless of mode, or make instrument footprint class large enough to prevent collapse.

4. Fix footprint--handheld and footprint--small-tool card aspect ratios: current proportions are nearly square (ratio 0.82-0.89) but pipettes have natural ratios 0.23-0.34. Widen card height relative to width so object-fit: contain fits tall asset without squashing. Set minimum card height in handheld footprint to at least 3x card width.

5. Fix rear-bottle footprint for tall bottles: current rear-shelf slots size bottles to card too shallow for tall bottles with natural ratio < 0.5. Set minimum card height in rear-shelf bottle footprint class based on 1.1 / min_natural_ratio.

## Handoff

Status: DONE_WITH_CONCERNS
Screenshots inspected: 203 PNGs across 5 directories
Objects flagged: 52 distinct
Diagnostic miss count: BEFORE 0/52; AFTER ~20/52 (~38%)
Top 3 cropping causes: parent-overflow, svg-grow-needed, aspect-cap-wrong
Worst 5 screenshots: microscope_basic (invisible), stress_many_bottles_scene_001 (16 PLACEHOLDERs), hood_basic (<10% viewport), electrophoresis_bench (power supply cut), gold_staining_bench (flasks cropped)
Blocker: stress_many_bottles_scene_001 PLACEHOLDER failure identical in batch2_before and precheck_batch5. No batch fixed it. Unresolved across all test batches. microscope_basic instrument invisibility also unresolved (template-mode exception prevents detection).

Key files referenced:
- docs/active_plans/new2_no_crop_audit_assets/visual_audit_BEFORE.md
- docs/active_plans/new2_no_crop_audit_assets/visual_audit_AFTER.md
- docs/active_plans/new2_no_crop_audit.md
- experiments/css_native_layout/styles/bench.css (lines 105-117: region overflow rules)
- experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/visual_audit.json
- experiments/css_native_layout/stress_results/batch3_f_gallery_summary.md
