# Experiments vs runtime side-by-side (forensic FF)

Date: 2026-05-22. Viewport: 1280x900, chromium headless.

Render paths compared:

- experiments: CSS-native static HTML template (hand-authored layout, fixed positioning).
- runtime: procedural runtime that mounts protocol YAML through the scene runtime bundle.

Lower is better for crops/placeholders/labels_bad/offpage. Clickable is informational.

| pair | experiments_crops | runtime_crops | experiments_placeholders | runtime_placeholders | experiments_labels_bad | runtime_labels_bad | experiments_offpage | runtime_offpage | experiments_clickable | runtime_clickable | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bench | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | runtime-better |
| hood | 6 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | runtime-better |
| electrophoresis | 6 | 0 | 0 | 0 | 0 | 3 | 12 | 0 | 0 | 0 | runtime-better |
| well_plate | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | experiments-better |
| dense_composition | 0 | 0 | 0 | 0 | 0 | 1 | 6 | 0 | 0 | 0 | runtime-better |
| instrument | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 | 0 | 0 | runtime-better |

## Pair details

### bench

- experiments source: `experiments/css_native_layout/templates/dir_b/bench_basic.html` (CSS-native static template)
- runtime source: `dist/mtt_reagent_prep.html` -- mtt_reagent_prep (bench_workspace) (procedural runtime)

![experiments bench (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/bench/experiments.png)

![runtime bench (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/bench/runtime.png)

### hood

- experiments source: `experiments/css_native_layout/templates/dir_b/hood_basic.html` (CSS-native static template)
- runtime source: `dist/passage_hood_detachment.html` -- passage_hood_detachment (hood_workspace) (procedural runtime)

![experiments hood (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/hood/experiments.png)

![runtime hood (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/hood/runtime.png)

### electrophoresis

- experiments source: `experiments/css_native_layout/templates/electrophoresis_bench.html` (CSS-native static template)
- runtime source: `dist/sdspage_run_electrophoresis.html` -- sdspage_run_electrophoresis (procedural runtime)

![experiments electrophoresis (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/electrophoresis/experiments.png)

![runtime electrophoresis (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/electrophoresis/runtime.png)

### well_plate

- experiments source: `experiments/css_native_layout/templates/well_plate_96_zoom.html` (CSS-native static template)
- runtime source: `dist/plate_drug_treatment_drug_addition.html` -- plate_drug_treatment_drug_addition (plate_workspace) (procedural runtime)

![experiments well_plate (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/well_plate/experiments.png)

![runtime well_plate (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/well_plate/runtime.png)

### dense_composition

- experiments source: `experiments/css_native_layout/templates/crowded_bench_dense.html` (CSS-native static template)
- runtime source: `dist/drug_dilution_setup.html` -- drug_dilution_setup (dilution_workspace) (procedural runtime)

![experiments dense_composition (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/dense_composition/experiments.png)

![runtime dense_composition (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/dense_composition/runtime.png)

### instrument

- experiments source: `experiments/css_native_layout/templates/cell_counter_basic.html` (CSS-native static template)
- runtime source: `dist/trypan_blue_counting.html` -- trypan_blue_counting (cell_counter_workspace) (procedural runtime)

![experiments instrument (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/instrument/experiments.png)

![runtime instrument (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/instrument/runtime.png)

## Verdict tally

- experiments-better: 1
- runtime-better: 5
- tied: 0
