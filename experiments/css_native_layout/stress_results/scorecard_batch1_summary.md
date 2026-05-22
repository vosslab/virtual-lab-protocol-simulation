# NEW3 Batch 1 Scorecard Summary

## Overall score distribution

| metric | value |
| ------ | ----- |
| min    | 0     |
| median | 41.0  |
| mean   | 38.6  |
| p95    | 50    |
| max    | 53    |

## Mean score by scene_class

| scene_class   | mean | count |
| ------------- | ---- | ----- |
| composition   | 42.0 | 79    |
| dense_clutter | 34.6 | 20    |
| zoom_detail   | 21.3 | 11    |

## Worst 20 scenes by score

| Scene                              | class         | score | hard_fails | top_worst          |
| ---------------------------------- | ------------- | ----- | ---------- | ------------------ |
| stress_many_bottles_scene_001      | composition   | 0     | 1          | primary_area_ratio |
| stress_many_bottles_scene_002      | composition   | 0     | 1          | primary_area_ratio |
| stress_zoom_detail_010             | zoom_detail   | 16    | 0          | primary_area_ratio |
| stress_zoom_detail_001             | zoom_detail   | 19    | 0          | primary_area_ratio |
| stress_zoom_detail_002             | zoom_detail   | 19    | 0          | primary_area_ratio |
| stress_zoom_detail_009             | zoom_detail   | 19    | 0          | primary_area_ratio |
| stress_zoom_detail_005             | zoom_detail   | 21    | 0          | primary_area_ratio |
| stress_zoom_detail_007             | zoom_detail   | 21    | 0          | primary_area_ratio |
| gold_well_plate_96_zoom_with_state | zoom_detail   | 23    | 0          | primary_area_ratio |
| stress_zoom_detail_003             | zoom_detail   | 24    | 0          | primary_area_ratio |
| stress_zoom_detail_004             | zoom_detail   | 24    | 0          | primary_area_ratio |
| stress_zoom_detail_006             | zoom_detail   | 24    | 0          | primary_area_ratio |
| stress_zoom_detail_008             | zoom_detail   | 24    | 0          | primary_area_ratio |
| stress_dense_clutter_007           | dense_clutter | 27    | 0          | label_overlap      |
| stress_dense_clutter_017           | dense_clutter | 27    | 0          | label_overlap      |
| stress_dense_clutter_010           | dense_clutter | 28    | 0          | label_overlap      |
| stress_dense_clutter_012           | dense_clutter | 28    | 0          | label_overlap      |
| stress_dense_clutter_013           | dense_clutter | 28    | 0          | label_overlap      |
| stress_dense_clutter_015           | dense_clutter | 28    | 0          | label_overlap      |
| stress_dense_clutter_019           | dense_clutter | 28    | 0          | label_overlap      |

## Best 20 scenes by score

| Scene                             | class         | score | hard_fails |
| --------------------------------- | ------------- | ----- | ---------- |
| gold_drug_dilution_workspace      | composition   | 53    | 0          |
| gold_staining_bench               | composition   | 53    | 0          |
| stress_dense_clutter_016          | dense_clutter | 50    | 0          |
| stress_template_006               | composition   | 50    | 0          |
| stress_template_007               | composition   | 50    | 0          |
| stress_template_013               | composition   | 50    | 0          |
| stress_template_014               | composition   | 50    | 0          |
| stress_template_018               | composition   | 50    | 0          |
| stress_template_019               | composition   | 50    | 0          |
| stress_dense_clutter_014          | dense_clutter | 49    | 0          |
| stress_dense_clutter_020          | dense_clutter | 49    | 0          |
| stress_extreme_aspect_scene_001   | composition   | 49    | 0          |
| stress_instrument_heavy_003       | composition   | 49    | 0          |
| stress_many_small_tools_scene_001 | composition   | 49    | 0          |
| stress_many_small_tools_scene_002 | composition   | 49    | 0          |
| stress_template_002               | composition   | 49    | 0          |
| stress_template_012               | composition   | 49    | 0          |
| stress_template_020               | composition   | 49    | 0          |
| stress_tall_glassware_scene_002   | composition   | 48    | 0          |
| stress_tall_glassware_scene_003   | composition   | 48    | 0          |

## Per-class baseline metrics

| scene_class   | n   | min | median | mean | max |
| ------------- | --- | --- | ------ | ---- | --- |
| composition   | 79  | 0   | 44     | 42.0 | 53  |
| dense_clutter | 20  | 27  | 30.0   | 34.6 | 50  |
| zoom_detail   | 11  | 16  | 21     | 21.3 | 24  |

## Scenes with score < 50: 101

| Scene                              | class         | score |
| ---------------------------------- | ------------- | ----- |
| stress_many_bottles_scene_001      | composition   | 0     |
| stress_many_bottles_scene_002      | composition   | 0     |
| stress_zoom_detail_010             | zoom_detail   | 16    |
| stress_zoom_detail_001             | zoom_detail   | 19    |
| stress_zoom_detail_002             | zoom_detail   | 19    |
| stress_zoom_detail_009             | zoom_detail   | 19    |
| stress_zoom_detail_005             | zoom_detail   | 21    |
| stress_zoom_detail_007             | zoom_detail   | 21    |
| gold_well_plate_96_zoom_with_state | zoom_detail   | 23    |
| stress_zoom_detail_003             | zoom_detail   | 24    |
| stress_zoom_detail_004             | zoom_detail   | 24    |
| stress_zoom_detail_006             | zoom_detail   | 24    |
| stress_zoom_detail_008             | zoom_detail   | 24    |
| stress_dense_clutter_007           | dense_clutter | 27    |
| stress_dense_clutter_017           | dense_clutter | 27    |
| stress_dense_clutter_010           | dense_clutter | 28    |
| stress_dense_clutter_012           | dense_clutter | 28    |
| stress_dense_clutter_013           | dense_clutter | 28    |
| stress_dense_clutter_015           | dense_clutter | 28    |
| stress_dense_clutter_019           | dense_clutter | 28    |
| gold_heat_block_sample_prep        | composition   | 29    |
| stress_dense_clutter_003           | dense_clutter | 29    |
| stress_dense_clutter_008           | dense_clutter | 29    |
| stress_dense_clutter_009           | dense_clutter | 29    |
| gold_electrophoresis_full_setup    | composition   | 30    |
| stress_composition_014             | composition   | 31    |
| stress_dense_clutter_004           | dense_clutter | 31    |
| stress_dense_clutter_005           | dense_clutter | 31    |
| gold_plate_reader_assay            | composition   | 33    |
| stress_composition_006             | composition   | 33    |
| stress_long_label_scene_004        | composition   | 33    |
| stress_composition_013             | composition   | 34    |
| stress_composition_017             | composition   | 34    |
| gold_microscope_slide_prep         | composition   | 35    |
| stress_composition_007             | composition   | 35    |
| stress_composition_011             | composition   | 35    |
| stress_composition_020             | composition   | 35    |
| stress_instrument_heavy_009        | composition   | 36    |
| stress_instrument_heavy_012        | composition   | 36    |
| stress_composition_005             | composition   | 38    |
| gold_cell_counter_station          | composition   | 39    |
| gold_hood_prep                     | composition   | 39    |
| stress_composition_016             | composition   | 39    |
| stress_composition_019             | composition   | 39    |
| stress_dense_clutter_002           | dense_clutter | 40    |
| stress_dense_clutter_011           | dense_clutter | 40    |
| stress_dense_clutter_018           | dense_clutter | 40    |
| stress_long_label_scene_002        | composition   | 40    |
| gold_mixed_bench                   | composition   | 41    |
| stress_composition_008             | composition   | 41    |
| stress_dense_clutter_001           | dense_clutter | 41    |
| stress_dense_clutter_006           | dense_clutter | 41    |
| stress_instrument_heavy_001        | composition   | 41    |
| stress_instrument_heavy_006        | composition   | 41    |
| stress_instrument_heavy_007        | composition   | 41    |
| stress_instrument_heavy_014        | composition   | 41    |
| stress_long_label_scene_003        | composition   | 41    |
| stress_long_label_scene_005        | composition   | 41    |
| stress_composition_004             | composition   | 42    |
| stress_composition_009             | composition   | 42    |
| stress_composition_012             | composition   | 42    |
| stress_composition_018             | composition   | 42    |
| stress_composition_001             | composition   | 43    |
| stress_composition_002             | composition   | 43    |
| stress_composition_015             | composition   | 43    |
| stress_tall_glassware_scene_001    | composition   | 43    |
| stress_extreme_aspect_scene_002    | composition   | 44    |
| stress_instrument_heavy_010        | composition   | 44    |
| stress_long_label_scene_001        | composition   | 44    |
| stress_instrument_heavy_002        | composition   | 45    |
| stress_instrument_heavy_004        | composition   | 45    |
| stress_instrument_heavy_005        | composition   | 45    |
| stress_instrument_heavy_008        | composition   | 45    |
| stress_instrument_heavy_011        | composition   | 45    |
| stress_instrument_heavy_013        | composition   | 45    |
| stress_instrument_heavy_015        | composition   | 45    |
| stress_many_small_tools_scene_003  | composition   | 45    |
| stress_composition_010             | composition   | 46    |
| stress_template_010                | composition   | 46    |
| stress_template_015                | composition   | 46    |
| stress_composition_003             | composition   | 47    |
| stress_template_004                | composition   | 47    |
| stress_template_008                | composition   | 47    |
| stress_template_009                | composition   | 47    |
| stress_template_016                | composition   | 47    |
| stress_tall_glassware_scene_002    | composition   | 48    |
| stress_tall_glassware_scene_003    | composition   | 48    |
| stress_template_001                | composition   | 48    |
| stress_template_003                | composition   | 48    |
| stress_template_005                | composition   | 48    |
| stress_template_011                | composition   | 48    |
| stress_template_017                | composition   | 48    |
| stress_dense_clutter_014           | dense_clutter | 49    |
| stress_dense_clutter_020           | dense_clutter | 49    |
| stress_extreme_aspect_scene_001    | composition   | 49    |
| stress_instrument_heavy_003        | composition   | 49    |
| stress_many_small_tools_scene_001  | composition   | 49    |
| stress_many_small_tools_scene_002  | composition   | 49    |
| stress_template_002                | composition   | 49    |
| stress_template_012                | composition   | 49    |
| stress_template_020                | composition   | 49    |

## Scenes with hard_fail_count > 0: 2

| Scene                         | class       | hard_fails | score |
| ----------------------------- | ----------- | ---------- | ----- |
| stress_many_bottles_scene_001 | composition | 1          | 0     |
| stress_many_bottles_scene_002 | composition | 1          | 0     |
