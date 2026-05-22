# Layout Scorecard: NEW0 CSS Native Design Optimization

## Purpose

Quantify layout quality across 10 NEW0 scenes to support iterative CSS tuning toward visible targets. The scorecard replaces binary pass/fail verdicts with a 0-100 numeric score per scene. Ranking allows the layout engineer to prioritize which metric to adjust next and compare layout iterations directly.

This document defines the scoring model, metric hierarchy, weight assignments per scene class, and the recommendation taxonomy for next improvements.

## Hard-fail gate

Four metrics cause an immediate zero score: hard fails prevent progress regardless of other metrics.

| Metric            | Definition                                          | Trigger                                            |
| ----------------- | --------------------------------------------------- | -------------------------------------------------- |
| `clipped_artwork` | Placement bbox exceeds parent region bbox           | Any placement clipped by its region                |
| `off_page`        | Placement center or corner exits 1920x1080 viewport | Any placement center or 4 corners outside viewport |
| `svg_svg_overlap` | Two placement bboxes intersect by >= 1 pixel        | Any pair of placements overlap                     |
| `region_overflow` | Region scrollHeight > clientHeight (or width)       | Any region in scroll overflow                      |

**Hard-fail result:** If any hard-fail metric is triggered, `total_layout_score = 0` immediately. No other metrics are evaluated.

**Verification:** Read `visual_audit.json` arrays `clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`. If any array is non-empty, hard fail.

## Scene classes

Five closed scene classes. Each class represents a distinct pedagogical or layout profile. The metric weights differ per class to reflect what matters most for that class.

| Class              | Examples                                                             | Definition                                                                                                              | Target primary ratio                                            |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `template`         | bench_basic, hood_basic, cell_counter_basic, microscope_basic        | Single-instrument skeleton; 1-2 placements; used as launch surface                                                      | N/A (template mode, no ratio threshold)                         |
| `composition`      | drug_dilution_plate_workspace, staining_bench, electrophoresis_bench | Multi-placement layout; pedagogically focused on one primary object; other objects support or contextualize             | >= 15% (soft target; used for recommendation only, not verdict) |
| `instrument_heavy` | electrophoresis_bench (subclass)                                     | Composition where the primary is a large scientific instrument and supporting objects cluster around it                 | >= 15% (soft target)                                            |
| `zoom_detail`      | well_plate_96_zoom                                                   | Detail/magnified view of a single object filling most of the viewport; high primary ratio by design                     | >= 70% (zoom-specific target)                                   |
| `dense_clutter`    | crowded_bench_dense, drug_dilution_workspace_dense                   | Stress-test density scenes; many placements in a constrained space; collision and label-overlap are the main challenges | >= 10% primary ratio; focus on label clarity                    |

## Per-scene metrics (12 total)

Each metric is measured from the precheck output and normalized to a 0-100 scale. The 12 metrics are:

1. **primary_area_ratio** (alias: `primary_visible_ratio`)
   - Definition: area of primary object / scene container area.
   - Source: `visual_audit.json[scene].checks.primary_object.ratio`.
   - Measurement: percentage of viewport occupied by the primary object.
   - Normalization: clamped 0-100 as a percentage. Scores highest when primary dominates.
   - Used by: all non-template classes.

2. **label_overlap** (alias: `label_collision_count`)
   - Definition: count of label-label or label-object overlaps.
   - Source: `visual_audit.json[scene].checks.label_label_overlap` + `svg_label_overlap` arrays.
   - Measurement: sum of two overlap arrays (both count intersecting pairs).
   - Normalization: 0 overlaps = score 100. Each additional overlap deducts points (sigmoid or linear; see Weights below). Flagged when > 2.
   - Used by: all classes.

3. **scene_occupied** (alias: `scene_whitespace_inverse`)
   - Definition: percentage of scene area occupied by any placement.
   - Source: `visual_audit.json[scene].checks.scene_whitespace.occupied_area / scene_area`.
   - Measurement: occupied_area / (viewport width \* viewport height).
   - Normalization: inverted from whitespace_pct: `100 - whitespace_pct`. Higher is better for composition; very high is poor for template.
   - Used by: composition and dense_clutter; de-emphasized for template.

4. **support_distance** (alias: `supporting_proximity`)
   - Definition: mean normalized distance of supporting objects to primary object's center.
   - Source: `visual_audit.json[scene].checks.supporting_distance[]` (skipped for template mode).
   - Measurement: Euclidean distance from each non-primary placement's center to primary's center, normalized by scene diagonal.
   - Normalization: 0 (all supporting at primary) = score 100. > 1.0 (supporting at scene edge) = score 0. Linear interpolation.
   - Used by: composition, instrument_heavy, dense_clutter (template skips; zoom_detail doesn't need it).

5. **balance** (alias: `layout_symmetry` or `spatial_distribution`)
   - Definition: Inverse of the largest empty quadrant ratio.
   - Source: `visual_audit.json[scene].checks.largest_empty_band` (x, y, w, h).
   - Measurement: largest_empty_band_area / scene_area.
   - Normalization: 0% empty band (perfectly filled) = score 100. 50%+ empty band = score 0. Quadratic scale penalizes extreme asymmetry.
   - Used by: template, composition, dense_clutter.

6. **region_filling** (alias: `region_occupied` or `region_utilization`)
   - Definition: Mean occupancy ratio across all regions (weighted by region area).
   - Source: `visual_audit.json[scene].checks.region_whitespace[]` per region.
   - Measurement: For each region with placements, occupied_area / region_area. Average across regions.
   - Normalization: High filling (< 20% whitespace) = score 100. Very sparse (> 80% whitespace, region flagged) = score 0. Linear.
   - Used by: composition, template.

7. **label_readability** (alias: `label_sizing` or `text_legibility`)
   - Definition: Inverse of label overflow and clipping counts.
   - Source: `visual_audit.json[scene].checks.artwork_integrity.label_sizing` (if present) or derived from placement-label bbox checks.
   - Measurement: count of labels with font-size-forced-small or bbox-clipped status.
   - Normalization: 0 clipped/overflowed = score 100. Each clipped label deducts points. Flagged when > 1.
   - Used by: dense_clutter, composition (de-emphasized for template).

8. **aspect_ratio_fidelity** (alias: `artwork_preservation`)
   - Definition: Mean aspect-ratio mismatch across all placements.
   - Source: `sizing_manifest.json[placement].aspect_ratio_mismatch_pct`.
   - Measurement: Average mismatch percentage across all placements in the scene.
   - Normalization: 0% mismatch (natural aspect preserved) = score 100. > 50% mismatch = score 0. Sigmoid scale.
   - Advisory metric (not critical to layout): used for context only; low weight in all classes.
   - Used by: all classes (low weight).

9. **primary_prominence** (alias: `primary_distinctness`)
   - Definition: Primary object's area as a ratio of largest supporting object's area.
   - Source: Derived from `visual_audit.json[scene].checks.primary_object.area` and placement bboxes.
   - Measurement: primary_area / largest_supporting_area (clamped 0.1-10.0).
   - Normalization: >= 2.0 (primary clearly dominant) = score 100. < 1.0 (primary smaller than support) = score 0. Log scale.
   - Used by: composition, instrument_heavy, zoom_detail.

10. **total_placements** (alias: `object_count`)
    - Definition: Count of all placements in the scene.
    - Source: Count non-empty `placements[]` entries in precheck output.
    - Measurement: raw count (0 to ~15 in these scenes).
    - Normalization: Advisory metric. Used only for scatter/context plots, not for direct scoring.
    - Used by: none (context only).

11. **hard_fail_count** (alias: `failure_count`)
    - Definition: Count of hard-fail metrics triggered.
    - Source: Sum of `clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow` array lengths.
    - Measurement: 0 = pass gate; >= 1 = zero score.
    - Normalization: 0 hard fails = gate passed (proceed to other metrics). >= 1 hard fail = immediate 0 score.
    - Used by: gate (applied first; blocks all other scoring).

12. **primary_detection_confidence** (alias: `primary_annotation_coverage`)
    - Definition: Whether the primary object was correctly identified (tagged vs fallback).
    - Source: `visual_audit.json[scene].checks.primary_object.found_by` field.
    - Measurement: Presence of `data-primary="true"` attribute or fallback detection method.
    - Normalization: `data-primary` tagged = score 100. Fallback "first placement" = score 90. Fallback "largest bbox" = score 70. Template mode = skipped.
    - Advisory metric. Used for transparency in scorecard output only; not part of weighted formula.
    - Used by: composition, instrument_heavy, zoom_detail (advisory).

## Scoring formula

```
if hard_fail_count > 0:
    total_layout_score = 0
else:
    Apply class-specific weights (see tables below)
    total_layout_score = weighted_sum(metrics, class_weights)
    total_layout_score = clamp(0, 100)
```

### Weight tables by scene class

Each table shows recommended weight allocation. Weights sum to 1.0. Normalize before application if weights are adjusted.

#### Template class weights

| Metric                | Weight   | Rationale                                  |
| --------------------- | -------- | ------------------------------------------ |
| primary_area_ratio    | 0.0      | Skipped (template mode, single object OK)  |
| label_overlap         | 0.30     | Labels must be readable on skeleton        |
| scene_occupied        | 0.15     | Some usage is OK; empty is OK for template |
| support_distance      | 0.0      | Skipped (template mode, no support)        |
| balance               | 0.20     | Single object should be centered           |
| region_filling        | 0.20     | Regions should not be cluttered            |
| label_readability     | 0.10     | Critical: labels must be legible           |
| aspect_ratio_fidelity | 0.05     | Minor: artwork integrity                   |
| primary_prominence    | 0.0      | N/A (single object)                        |
| **Sum**               | **1.00** |                                            |

#### Composition class weights

| Metric                | Weight   | Rationale                                          |
| --------------------- | -------- | -------------------------------------------------- |
| primary_area_ratio    | 0.25     | Core pedagogical goal: primary must stand out      |
| label_overlap         | 0.15     | Important: no label collisions                     |
| scene_occupied        | 0.15     | Moderate: some whitespace is good; not too sparse  |
| support_distance      | 0.20     | Important: support objects near primary            |
| balance               | 0.15     | Moderate: spatial distribution matters             |
| region_filling        | 0.0      | Implicit in scene_occupied                         |
| label_readability     | 0.15     | Important: all labels readable                     |
| aspect_ratio_fidelity | 0.05     | Minor: artwork integrity                           |
| primary_prominence    | 0.10     | Important: primary clearly stands out from support |
| **Sum**               | **1.20** | Normalize by dividing by 1.20                      |

#### Instrument-heavy class weights

| Metric                | Weight   | Rationale                                   |
| --------------------- | -------- | ------------------------------------------- |
| primary_area_ratio    | 0.35     | Critical: instrument must dominate visually |
| label_overlap         | 0.15     | Important: labels around dense instrument   |
| scene_occupied        | 0.15     | Moderate: instrument plus support objects   |
| support_distance      | 0.20     | Important: tools cluster around instrument  |
| balance               | 0.15     | Moderate: distributed layout around primary |
| region_filling        | 0.0      | Implicit in scene_occupied                  |
| label_readability     | 0.15     | Important: identify instrument parts        |
| aspect_ratio_fidelity | 0.05     | Minor: artwork integrity                    |
| primary_prominence    | 0.15     | Critical: instrument clearly distinguished  |
| **Sum**               | **1.35** | Normalize by dividing by 1.35               |

#### Zoom-detail class weights

| Metric                | Weight   | Rationale                                         |
| --------------------- | -------- | ------------------------------------------------- |
| primary_area_ratio    | 0.50     | Critical: magnified object fills viewport (70%+)  |
| label_overlap         | 0.10     | Minor: few labels in zoom view                    |
| scene_occupied        | 0.20     | Important: well plate should fill available space |
| support_distance      | 0.0      | N/A (zoom context, no supporting objects)         |
| balance               | 0.10     | Minor: centering matters but less critical        |
| region_filling        | 0.0      | N/A (single object)                               |
| label_readability     | 0.10     | Moderate: identify specific wells/regions         |
| aspect_ratio_fidelity | 0.05     | Minor: artwork integrity                          |
| primary_prominence    | 0.0      | N/A (single object, 100% prominent by design)     |
| **Sum**               | **1.05** | Normalize by dividing by 1.05                     |

#### Dense-clutter class weights

| Metric                | Weight   | Rationale                                           |
| --------------------- | -------- | --------------------------------------------------- |
| primary_area_ratio    | 0.15     | Soft target (10% OK in dense) vs composition (15%+) |
| label_overlap         | 0.30     | Critical: dense scenes have label-collision risk    |
| scene_occupied        | 0.15     | Important: tight packing but measurable             |
| support_distance      | 0.20     | Important: objects should cluster, not spread       |
| balance               | 0.10     | Minor: extreme crowding makes symmetry hard         |
| region_filling        | 0.0      | Implicit in scene_occupied                          |
| label_readability     | 0.25     | Critical: cramped labels are unreadable             |
| aspect_ratio_fidelity | 0.05     | Minor: artwork integrity                            |
| primary_prominence    | 0.10     | Moderate: primary should still stand out in crowd   |
| **Sum**               | **1.30** | Normalize by dividing by 1.30                       |

### Normalization and clamping

Each metric is independently normalized to 0-100. The weighted sum is then:

```
weighted_score = sum(metric_i * weight_i) / sum(weights)
total_layout_score = clamp(weighted_score, 0, 100)
```

## Recommendation taxonomy

When a scene's total score is below target, the scorecard identifies the top-3 worst-performing metrics and suggests an adjustment category for each. The seven adjustment categories are:

1. **primary_area_increase** - Enlarge the primary object footprint or re-tag primary.
   - Suggested when: `primary_area_ratio` < 15% and is in top-3 worst metrics.
   - Action: Increase `flex-grow`, `flex-basis`, or `max-width` for primary placement. Or re-tag `data-primary`.

2. **label_separation** - Move or resize labels to eliminate overlaps.
   - Suggested when: `label_overlap` > 2 or `label_readability` flagged.
   - Action: Reposition label or reduce label font-size. Adjust placement padding/margin.

3. **support_repositioning** - Move supporting objects closer to primary.
   - Suggested when: `support_distance` > 0.5 (normalized) and in top-3 worst.
   - Action: Adjust flexbox `order`, `justify-content`, or `gap` to tighten layout.

4. **balance_distribution** - Reposition objects to fill empty quadrants more evenly.
   - Suggested when: `largest_empty_band` > 30% of scene and in top-3 worst.
   - Action: Reorganize placement order or adjust regional layout.

5. **region_density_tuning** - Rebalance footprints across regions.
   - Suggested when: `region_filling` < 50% (sparse) and in top-3 worst.
   - Action: Adjust `flex-basis`, `flex-grow`, or split placements across regions.

6. **aspect_ratio_correction** - Adjust footprint aspect ratios to match natural artwork.
   - Suggested when: `aspect_ratio_fidelity` shows > 50% mismatch and in top-3 worst.
   - Action: Tune `footprint--*` min/max width/height constraints. Or source artwork with matching aspect.

7. **primary_prominence_boost** - Increase contrast between primary and supporting objects.
   - Suggested when: `primary_prominence` < 2.0 (primary not clearly dominant).
   - Action: Increase primary `flex-grow` or decrease support `flex-basis`.

## Rerun and comparison

### Single-run command (from repo root)

```bash
node experiments/css_native_layout/score_layout.mjs
```

Reads precheck output from `test-results/new0_css_native/audit/` (current run) or falls back to `stabilized/`. Emits:

- `test-results/new0_css_native/scorecard/scorecard.json` (machine-readable).
- `test-results/new0_css_native/scorecard/scorecard.md` (human-readable ranked table).

### Comparison mode

```bash
node experiments/css_native_layout/score_layout.mjs --compare test-results/new0_css_native/baseline/ test-results/new0_css_native/audit/
```

Loads two audit directories (or two scorecard JSONs if they exist). Computes per-scene delta, per-metric delta. Emits diff report to stdout with top-3 movers per scene.

### Verify outputs exist

```bash
test -f test-results/new0_css_native/scorecard/scorecard.json && echo "OK" || echo "MISSING"
test -f test-results/new0_css_native/scorecard/scorecard.md && echo "OK" || echo "MISSING"
```

## Limitations and advisory flags

These metrics are **advisory only** (used for context, not for verdicts):

- **aspect_ratio_fidelity** - Artwork mismatch is a render-system artifact (object-fit behavior), not a layout bug. Low weight in all classes.
- **primary_detection_confidence** - Advisory transparency: indicates whether primary is hand-tagged or fallback-detected. Does not affect score.
- **total_placements** - Context metric only. Not scored; used for scatter plots.

**Known noise sources:**

- **primary_ratio variation** - The primary is identified by `data-primary="true"` tag or fallback (first placement, largest bbox). Scenes without tags may misidentify primary, inflating or suppressing the ratio metric. Re-tagging can shift ratios by +/- 10pp. This is expected and recorded in precheck output under `found_by` field.
- **region_filling > 80%** - The precheck flags regions as sparse when whitespace exceeds 80%. This is a hard threshold and may not reflect pedagogical intent (a rear shelf with no objects is correctly sparse). Use as advisory only.
- **viewport fixed at 1920x1080** - No resize testing. Different viewport sizes (tablets, mobile) will have different scores. This scorecard applies to 1920x1080 only.

## Initial weight selection rationale

The weights above are starting recommendations, tuned from the task #69 specification and the existing precheck verdict mix (0 hard fails, 4 PASS_TEMPLATE, 6 WARN, 0 FAIL). The weights emphasize:

- **Hard gates first:** any hard fail -> score 0.
- **Primary prominence:** composition scenes need a clearly-visible primary object (25% of weight).
- **Label clarity:** all classes heavily penalize overlaps (15-30% of weight).
- **Support locality:** composition needs support objects near primary (20% of weight).
- **Class differentiation:** template skips primary ratio; zoom emphasizes it (50%); dense emphasizes labels (25%+).

Adjustments made during scorecard runs are documented in LAYOUT_SCORECARD.md under a "Weight Tuning History" section (created after first run if needed).

## Score interpretation guide

| Score range | Interpretation                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| 0           | Hard fail: clipped artwork, off-page, overlaps, or region overflow                                    |
| 1-30        | Poor: multiple major metrics failing (primary too small, many label overlaps, sparse filling)         |
| 31-60       | Fair: one or two metrics dragging (acceptable layout overall; addressable next-iteration adjustments) |
| 61-85       | Good: most metrics acceptable; minor adjustments needed                                               |
| 86-100      | Excellent: no hard fails, all metrics within acceptable ranges for the scene class                    |

## Revised weights (NEW1.5 Lane C)

**Motivation:** Template scenes (bench_basic, cell_counter_basic, hood_basic, microscope_basic) are sparse by design. They are single-instrument skeletons used as pedagogical launch surfaces. The original weights penalized them for low `scene_occupied` and `region_filling` metrics, conflicting with their intended design. The revised weights eliminate these penalties for templates while maintaining strict gates for hard fails.

**Changes:**

### Template class (revised)

| Metric                | Old Weight | New Weight | Rationale                                                |
| --------------------- | ---------- | ---------- | -------------------------------------------------------- |
| primary_area_ratio    | 0.0        | 0.0        | Skipped (no primary-specific tag in templates)           |
| label_overlap         | 0.30       | 0.40       | Increase: labels must be crisp on skeleton layouts       |
| scene_occupied        | 0.15       | 0.0        | **Eliminated:** sparse by design, no longer penalized    |
| support_distance      | 0.0        | 0.0        | N/A (single object, no support)                          |
| balance               | 0.20       | 0.20       | Moderate: centered single object preferred               |
| region_filling        | 0.20       | 0.0        | **Eliminated:** sparse by design, no longer penalized    |
| label_readability     | 0.10       | 0.40       | Increase: labels must be fully legible on minimal layout |
| aspect_ratio_fidelity | 0.05       | 0.0        | De-emphasized (artwork can be basic in templates)        |
| primary_prominence    | 0.0        | 0.0        | N/A (single object)                                      |
| **Old Sum**           | **1.00**   |            |                                                          |
| **New Sum**           |            | **1.00**   | No normalization needed; weights sum to 1.0 exactly      |

### Other classes (revised)

**Composition:** primary_area: 0.25, label_overlap: 0.15, scene_occupied: 0.15, support_distance: 0.20, balance: 0.15, label_readability: 0.05, aspect_ratio: 0.05, primary_prominence: 0.0 (sum = 1.00; removed primary_prominence which was 0.10).

**Instrument-heavy:** primary_area: 0.35, label_overlap: 0.15, scene_occupied: 0.15, support_distance: 0.20, label_readability: 0.05, aspect_ratio: 0.10, primary_prominence: 0.0 (sum = 1.00; removed balance 0.15).

**Zoom-detail:** primary_area: 0.50, label_overlap: 0.10, scene_occupied: 0.20, balance: 0.10, label_readability: 0.10, aspect_ratio: 0.0 (sum = 1.00; unchanged core structure).

**Dense-clutter:** primary_area: 0.05, label_overlap: 0.30, scene_occupied: 0.10, support_distance: 0.20, label_readability: 0.25, aspect_ratio: 0.10, primary_prominence: 0.0 (sum = 1.00; reduced from 1.30).

### Ranking impact (before vs. after)

| Rank | Scene                         | Class            | OLD Score | NEW Score | Delta | Direction |
| ---- | ----------------------------- | ---------------- | --------- | --------- | ----- | --------- |
| 1    | bench_basic                   | template         | 59        | 90        | +31   | UP        |
| 2    | microscope_basic              | template         | 65        | 90        | +25   | UP        |
| 3    | well_plate_96_zoom            | zoom_detail      | 89        | 90        | +1    | UP        |
| 4    | cell_counter_basic            | template         | 51        | 80        | +29   | UP        |
| 5    | hood_basic                    | template         | 53        | 70        | +17   | UP        |
| 6    | staining_bench                | composition      | 59        | 64        | +5    | UP        |
| 7    | drug_dilution_plate_workspace | composition      | 58        | 63        | +5    | UP        |
| 8    | crowded_bench_dense           | dense_clutter    | 61        | 60        | -1    | DOWN      |
| 9    | drug_dilution_workspace_dense | dense_clutter    | 60        | 58        | -2    | DOWN      |
| 10   | electrophoresis_bench         | instrument_heavy | 54        | 47        | -7    | DOWN      |

### Verification

- Hard-fail gate unchanged: any hard_fail -> score 0 (no scenes triggered hard fails).
- All weights sum to 1.0 (no normalization skew).
- Template scenes now rank at top (1, 2, 4, 5) reflecting their sparse-by-design status.
- well_plate_96_zoom maintains score >= 80 (score = 90).
- All 10 scenes pass gate (hard_fail_count = 0).

## Next steps (scorecard operation)

1. Run `node experiments/css_native_layout/score_layout.mjs` to generate scorecard for current audit.
2. Review `test-results/new0_css_native/scorecard/scorecard.md` for ranked table and per-scene breakdown.
3. For scenes scoring < 60, examine top-3 worst metrics and recommended adjustment category.
4. Make one targeted CSS adjustment per iteration.
5. Re-run precheck: `node experiments/css_native_layout/precheck.mjs 'experiments/css_native_layout/templates/*.html'`.
6. Re-run scorer: `node experiments/css_native_layout/score_layout.mjs`.
7. Compare deltas: `node experiments/css_native_layout/score_layout.mjs --compare test-results/new0_css_native/baseline/ test-results/new0_css_native/audit/` (if baseline exists).
8. Iterate until all scenes >= 60 or higher target met.
