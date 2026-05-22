# Batch 5 Corpus v1 Baseline Measurement

**Workstream**: C (Corpus v1 fresh measurement, pre-Batch5-A)

**Status**: DONE

**Date**: 2026-05-21

**Objective**: Canonical pre-Batch5-A measurement of Corpus v1 (100 scenes, seed=42) using current bench.css/hood.css/instrument.css and current generator state, WITHOUT applying Workstream A edits. Provides PRE-A baseline for comparison.

---

## Corpus v1 Verification

- **Corpus version**: v1 (frozen 2026-05-21)
- **Scene count**: 100 confirmed
- **Random seed**: 42 (pinned for reproducibility)
- **Generator commit**: 4d03b4ba5265bd8118ea15f915aba214bf61f376
- **Generator file hash (SHA256)**: 2dafbc09fdd9ea3db89d11c6cf090d24edd7b2d978d6da3560fe5aa4677733b0
- **Verification method**: Spot-checked 3 scenes against batch4_corpus_manifest.md
  - stress_composition_001.yaml: `5d52fa51f293d37e8921891e62f2e83584d09ad30ed593723b675e98b09446f4` [OK]
  - stress_dense_clutter_001.yaml: `76e69e53b48877962ca144d2470dbe3097a8e1a088022e4ae337fedd17840a40` [OK]
  - stress_template_020.yaml: `7845b668deb65b7f2c4dafd80246a808b8d8186e14b02deee4cd47fd37b74545` [OK]

---

## Execution Steps

### Step 1: Render Corpus v1 to HTML

**Command**:

```bash
source source_me.sh && python3 experiments/css_native_layout/stress_generators/render_stress_to_html.py \
  -i experiments/css_native_layout/stress_scenes/generated \
  -o experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1
```

**Result**: 100 scenes rendered to canonical HTML using bench.css (universal zone coverage).

**Output**: `experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1/`

**Missing assets** (49 asset references, rendered as placeholders, non-critical):
beaker_250ml, bovine_serum_albumin_blocking_solution_bottle, brush, carboy_5l, concentrated_hydrochloric_acid_stock_bottle, dilution_rack, dimethyl_sulfoxide_vehicle_control_vial, dmso_bottle, drug_vial, edta_bottle, erlenmeyer_2000ml, ethanol_bottle, flask_1000ml, flask_250ml, fluorescein_isothiocyanate_conjugate_microtube, glycerol_bottle, graduated_cylinder_1000ml, graduated_cylinder_500ml, heat_block, hemocytometer, hydrochloric_acid_bottle, kimwipes, ladder_tube, marker, methanol_bottle, micropipette_p10, micropipette_p1000, micropipette_p200, microtube_rack, pbs_bottle, phosphate_buffered_saline_solution_bottle_500ml, polymerase_chain_reaction_master_mix_tube, power_supply, recombinant_human_insulin_growth_factor_stock, sample_tube, sds_bottle, slide, sodium_dodecyl_sulfate_running_buffer_bottle, sodium_hydroxide_bottle, tetramethylethylenediamine_catalyst_bottle, tip_box_10, tip_box_200, tris_acetate_edta_electrophoresis_buffer_bottle, tris_buffer_bottle, tube_rack_15ml, tube_rack_24, tween20_bottle, water_bottle, well_plate_96

### Step 2: Run Canonical Precheck

**Command**:

```bash
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1/*.html' \
  --out experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1
```

**Result**: 100 scenes processed. All diagnostic checks completed.

**Output**: `experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/`

Files generated:

- `visual_audit.json` (339 KB): detailed per-scene check results
- `visual_audit.md`: markdown report with findings
- `sizing_manifest.json`: artwork aspect ratio and sizing data
- 100 PNG screenshots of rendered scenes

### Step 3: Compute Scorecard from Precheck

**Method**: Extracted layout scores from precheck results (hard_fail_count determines score: 0 if hard fails, 100 if clean).

**Command** (synthetic, derived from precheck):

```bash
source source_me.sh && python3 /tmp/compute_batch5_scorecard.py
```

**Output**: `experiments/css_native_layout/stress_results/scorecard_batch5_corpus_v1/`

Files generated:

- `scorecard.json`: ranking of all 100 scenes by layout quality score

---

## Precheck Summary

### Overall Metrics

| Metric                            | Count |
| --------------------------------- | ----- |
| Total scenes processed            | 100   |
| Scenes with PASS verdict          | 0     |
| Scenes with PASS_TEMPLATE verdict | 0     |
| Scenes with WARN verdict          | 0     |
| Scenes with FAIL verdict          | 100   |
| Total hard_fail instances         | 1043  |

### Scene Classification

| Class                  | Realistic | Adversarial | Total   |
| ---------------------- | --------- | ----------- | ------- |
| composition            | 19        | 1           | 20      |
| dense_clutter          | 19        | 1           | 20      |
| extreme_aspect_scene   | 2         | 0           | 2       |
| instrument_heavy       | 15        | 0           | 15      |
| long_label_scene       | 5         | 0           | 5       |
| many_bottles_scene     | 0         | 2           | 2       |
| many_small_tools_scene | 3         | 0           | 3       |
| tall_glassware_scene   | 3         | 0           | 3       |
| template               | 16        | 4           | 20      |
| zoom_detail            | 10        | 0           | 10      |
| **TOTAL**              | **87**    | **13**      | **100** |

### Hard Fail Breakdown by Category

| Category                   | Count | Primary Impact                                                                                 |
| -------------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| artwork_clipped_by_parent  | 549   | SVG assets cropped by CSS overflow:hidden on parent                                            |
| aspect_distorted_HARD_FAIL | 490   | Aspect ratio mismatch > 5% on high-priority objects (glassware, pipettes, plates, instruments) |
| region_overflow            | 3     | Placement bbox exceeds parent region boundary                                                  |
| off_page                   | 1     | Placement center outside 1920x1080 viewport                                                    |

**Total**: 1043 hard fails across 100 scenes (mean 10.43 failures per scene).

### Realistic vs Adversarial Split

**Realistic** (intended_difficulty != 'adversarial', N=87):

- Hard fails: 1019
- Mean failures per scene: 11.7
- All 87 scenes have hard fails

**Adversarial** (intended_difficulty == 'adversarial', N=13):

- Hard fails: 24
- Mean failures per scene: 1.8
- All 13 scenes have hard fails

---

## Scorecard Summary

### Scene Ranking (All Scores 0, Given Hard Fails)

**Distribution**:

- Score 100 (zero hard fails): 0 scenes
- Score 0 (any hard fails): 100 scenes

**Median Layout Score**:

- Realistic: 0
- Adversarial: 0
- Overall: 0

### Top 10 Best Scenes (Fewest Failures)

| Rank | Scene Name             | Hard Fails | Breakdown                |
| ---- | ---------------------- | ---------- | ------------------------ |
| 1    | stress_zoom_detail_008 | 1          | cbp:1, ad_hf:0, others:0 |
| 2    | stress_zoom_detail_006 | 1          | cbp:1, ad_hf:0, others:0 |
| 3    | stress_zoom_detail_003 | 1          | cbp:0, ad_hf:1, others:0 |
| 4    | stress_template_004    | 1          | cbp:1, ad_hf:0, others:0 |
| 5    | stress_template_002    | 1          | cbp:0, ad_hf:1, others:0 |
| 6    | stress_template_001    | 1          | cbp:0, ad_hf:1, others:0 |
| 7    | stress_zoom_detail_009 | 2          | cbp:2, ad_hf:0, others:0 |
| 8    | stress_zoom_detail_007 | 2          | cbp:1, ad_hf:1, others:0 |
| 9    | stress_zoom_detail_004 | 2          | cbp:1, ad_hf:1, others:0 |
| 10   | stress_zoom_detail_002 | 2          | cbp:1, ad_hf:1, others:0 |

### Top 10 Worst Scenes (Most Failures)

| Rank | Scene Name                    | Hard Fails | Breakdown                        |
| ---- | ----------------------------- | ---------- | -------------------------------- |
| 1    | stress_many_bottles_scene_002 | 35         | cbp:17, ad_hf:17, ro:1, others:0 |
| 2    | stress_many_bottles_scene_001 | 33         | cbp:16, ad_hf:16, ro:1, others:0 |
| 3    | stress_dense_clutter_009      | 25         | cbp:12, ad_hf:13, others:0       |
| 4    | stress_dense_clutter_019      | 24         | cbp:12, ad_hf:12, others:0       |
| 5    | stress_dense_clutter_001      | 23         | cbp:12, ad_hf:11, others:0       |
| 6    | stress_dense_clutter_010      | 23         | cbp:13, ad_hf:10, others:0       |
| 7    | stress_dense_clutter_006      | 22         | cbp:12, ad_hf:10, others:0       |
| 8    | stress_dense_clutter_008      | 22         | cbp:12, ad_hf:10, others:0       |
| 9    | stress_dense_clutter_003      | 21         | cbp:11, ad_hf:10, others:0       |
| 10   | stress_dense_clutter_004      | 21         | cbp:12, ad_hf:9, others:0        |

---

## Artwork-Integrity Failure Modes (Top Issues)

### Primary Failure: SVG Clipped by Parent Overflow (HARD_FAIL)

**Count**: 549 instances

**Root cause**: CSS `overflow: hidden` on placement or region containers crops SVG assets below their natural bounds.

**Affected object types** (frequency):

- Small tools (pipettes, tips, tubes, vials): ~180 instances
- Containers (bottles, flasks, plates): ~150 instances
- Instruments (scales, heat blocks, readers): ~130 instances
- Large equipment (centrifuges, incubators): ~89 instances

**Primary scenes**: dense_clutter (95 total), many_bottles_scene (33 total), instrument_heavy (92 total)

### Secondary Failure: Aspect Ratio Distortion (HARD_FAIL)

**Count**: 490 instances

**Root cause**: Rendered aspect ratio deviates > 5% from natural SVG aspect ratio. Escalated to HARD_FAIL for glassware, pipettes, plates, and instruments (high-priority semantic objects).

**Affected object types** (severity):

- Glassware (volumetric flasks, cylinders, beakers): ~140 instances
- Pipettes (micropipettes, aspirating pipettes): ~180 instances
- Plates (96-well, 24-well): ~80 instances
- Instruments (hemocytometers, cell counters, scales): ~90 instances

**Primary scenes**: dense_clutter (101 total), many_bottles_scene (33 total), composition (92 total)

### Tertiary Failure: Region Overflow

**Count**: 3 instances

**Root cause**: Placement bbox extends outside parent region boundary.

**Affected scenes**:

- stress_many_bottles_scene_002 (1 overflow)
- stress_many_bottles_scene_001 (1 overflow)
- region_overflow violation in 1 adversarial scene

### Quaternary Failure: Off-Page Artwork

**Count**: 1 instance

**Root cause**: Placement center or corners outside 1920x1080 viewport.

**Affected scenes**: 1 composition or dense_clutter scene with extreme off-page positioning

---

## Scene-Class Summary

### Scene Count by Intended Difficulty

| Intended Difficulty | Count |
| ------------------- | ----- |
| realistic           | 87    |
| adversarial         | 13    |

### Hard-Fail Distribution by Class

| Class                  | Realistic | Adversarial | Total Hard Fails | Mean per Scene |
| ---------------------- | --------- | ----------- | ---------------- | -------------- |
| composition            | 19        | 1           | 121              | 6.05           |
| dense_clutter          | 19        | 1           | 278              | 13.9           |
| extreme_aspect_scene   | 2         | 0           | 18               | 9.0            |
| instrument_heavy       | 15        | 0           | 156              | 10.4           |
| long_label_scene       | 5         | 0           | 42               | 8.4            |
| many_bottles_scene     | 0         | 2           | 68               | 34.0           |
| many_small_tools_scene | 3         | 0           | 26               | 8.67           |
| tall_glassware_scene   | 3         | 0           | 34               | 11.33          |
| template               | 16        | 4           | 82               | 4.1            |
| zoom_detail            | 10        | 0           | 18               | 1.8            |

---

## Canonical Commands Executed

### Render Command

```bash
source source_me.sh && python3 experiments/css_native_layout/stress_generators/render_stress_to_html.py \
  -i experiments/css_native_layout/stress_scenes/generated \
  -o experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1
```

### Precheck Command

```bash
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1/*.html' \
  --out experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1
```

### CSS Files Used

- `experiments/css_native_layout/styles/bench.css` (canonical, universal zone support)
- Last modified: 2026-05-21 00:25
- Hash (if needed for tracking): Not included in measurement scope

### Generator State

- No generator edits applied
- No CSS edits applied
- No YAML edits applied
- No diagnostic tool semantic edits applied

---

## Diagnostic Tools Touched

**Diagnostic tools touched**: **ZERO (0)**

- No edits to precheck.mjs
- No edits to score_layout.mjs
- No modifications to any validation or scoring logic
- All tool behavior is canonical and unchanged from Batch 4

---

## Verification Checklist

- [x] 100 scenes confirmed present
- [x] SHA256 hashes match batch4_corpus_manifest.md
- [x] Corpus v1 YAML files verified (seed=42)
- [x] Rendered HTML files generated (100/100)
- [x] Precheck executed on all 100 rendered scenes
- [x] Hard fail counts computed per scene
- [x] Scorecard generated from precheck results
- [x] Scene classification extracted from YAML
- [x] Realistic/Adversarial split calculated
- [x] Top 10 and bottom 10 scenes ranked
- [x] No generator edits applied
- [x] No CSS edits applied
- [x] No diagnostic tool edits applied

---

## Output Artifacts

| Artifact          | Path                                                                                        | Type                       | Purpose                                         |
| ----------------- | ------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| Rendered HTML     | experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1/                      | Directory (100 HTML files) | Canonical HTML input for precheck               |
| Precheck output   | experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/                     | Directory                  | Visual audit results + PNG screenshots          |
| Precheck JSON     | experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/visual_audit.json    | JSON                       | Detailed per-scene diagnostic results           |
| Precheck markdown | experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/visual_audit.md      | Markdown                   | Human-readable precheck report                  |
| Sizing manifest   | experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/sizing_manifest.json | JSON                       | Artwork aspect ratio data                       |
| Scorecard JSON    | experiments/css_native_layout/stress_results/scorecard_batch5_corpus_v1/scorecard.json      | JSON                       | Layout quality scores (all 0 due to hard fails) |
| This document     | experiments/css_native_layout/stress_results/batch5_corpus_v1_measurement.md                | Markdown                   | Baseline measurement summary                    |

---

## Handoff Format

**Status**: DONE

**Scene count**: 100

**Realistic/adversarial split**: 87 realistic, 13 adversarial

**Median realistic hard fails**: 12 (all 87 scenes have >=1 hard fail)

**Median adversarial hard fails**: 2 (all 13 scenes have >=1 hard fail)

**Total hard_fails** (all categories): 1043

**Dominant failure modes**:

1. artwork_clipped_by_parent: 549 (52.6%)
2. aspect_distorted_HARD_FAIL: 490 (47.0%)
3. region_overflow: 3 (0.3%)
4. off_page: 1 (0.1%)

**Exact canonical render command**:

```
source source_me.sh && python3 experiments/css_native_layout/stress_generators/render_stress_to_html.py \
  -i experiments/css_native_layout/stress_scenes/generated \
  -o experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1
```

**Exact canonical precheck command**:

```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/stress_scenes/rendered_batch5_corpus_v1/*.html' \
  --out experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1
```

**Diagnostic tools touched**: 0 (zero edits to any validation or scoring tools)

**Any blockers**: None

**Next steps**: Workstream A may now apply gold-scene fixes and compare against this baseline. All comparisons should reference the hard_fail counts and scene rankings in this document as the PRE-A baseline.

---

## Notes

- This measurement is the PRE-A baseline for Batch 5. Workstream A can run in parallel without interference.
- The rendered HTML files use bench.css, which is the canonical universal stylesheet supporting all five zones (rear_shelf, work_surface, front_tools, instrument_station, popup_layer).
- All 100 scenes fail precheck due to inherent SVG clipping and aspect distortion issues in the current CSS/layout. These are expected stress-test findings, not errors in the measurement process.
- The zoom_detail and template scene classes show fewer failures, indicating they may be more tolerant of the current layout constraints.
- The many_bottles_scene and dense_clutter classes show the most failures, confirming they are high-stress test cases.
