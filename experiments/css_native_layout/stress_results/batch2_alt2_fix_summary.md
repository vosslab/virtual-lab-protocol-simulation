# Batch 2 ALT-2 fix attempt: drop `.placement { max-height: 100% }`

## Verdict

BLOCKED at 110-scene scale. Reverted bench.css, hood.css, instrument.css to baseline.

Subset (20 scenes) showed a clean win, but the wider 110-scene sweep showed
massive region_overflow (+127) and off_page (+86) regressions and a median
score drop from 41 to 0. The change fails the 5pt-per-scene regression
budget on 91 of 110 scenes. Per the brief, ALT-1 escalation is not allowed
without explicit user approval.

## Hypothesis (tested)

Removing `max-height: 100%` from `.placement` (while keeping
`overflow: hidden`) would let the wrapper grow to fit `min-height`-respecting
children so contain-scaled SVGs render at full natural size, eliminating the
parent-clipping of container-class bottles.

## CSS diff (verbatim, applied then reverted)

`experiments/css_native_layout/styles/bench.css` (lines 149-157):

```diff
 /* Placement (individual object) */
 .placement {
 	flex-shrink: 1;
 	display: flex;
 	flex-direction: column;
 	gap: 4px;
 	align-items: center;
-	max-height: 100%;
 	overflow: hidden;
 }
```

Identical edit was also applied to `hood.css` (lines 159-167) and
`instrument.css` (lines 156-164), then reverted. The
`.region--work_surface .placement[data-primary="true"]` override block was
NOT edited (its own `max-height: 100%` was left in place per the brief's
"do not touch Workstream-C scope" guidance).

## Subset (20 scenes) before/after

Baseline source: `precheck_batch2_container_baseline_subset/`.
ALT-2 source: `precheck_batch2_alt2_subset/`.

| Metric                     | Baseline | ALT-2 | Delta |
| -------------------------- | -------- | ----- | ----- |
| clipped_by_parent          | 186      | 0     | -186  |
| aspect_distorted HARD_FAIL | 171      | 0     | -171  |
| region_overflow            | 2        | 0     | -2    |
| off_page                   | 0        | 0     | +0    |

Per-scene (all 20 went to cbp=0, ad_HF=0):

| Scene                             | cbp_B | cbp_A | ad_HF_B | ad_HF_A | r_ovf_B | r_ovf_A |
| --------------------------------- | ----- | ----- | ------- | ------- | ------- | ------- |
| gold_staining_bench               | 10    | 0     | 5       | 0       | 0       | 0       |
| stress_composition_003            | 4     | 0     | 5       | 0       | 0       | 0       |
| stress_dense_clutter_001          | 12    | 0     | 11      | 0       | 0       | 0       |
| stress_dense_clutter_004          | 12    | 0     | 9       | 0       | 0       | 0       |
| stress_dense_clutter_006          | 12    | 0     | 10      | 0       | 0       | 0       |
| stress_dense_clutter_008          | 12    | 0     | 10      | 0       | 0       | 0       |
| stress_dense_clutter_009          | 12    | 0     | 13      | 0       | 0       | 0       |
| stress_dense_clutter_010          | 13    | 0     | 10      | 0       | 0       | 0       |
| stress_dense_clutter_017          | 12    | 0     | 9       | 0       | 0       | 0       |
| stress_dense_clutter_018          | 10    | 0     | 9       | 0       | 0       | 0       |
| stress_dense_clutter_019          | 12    | 0     | 12      | 0       | 0       | 0       |
| stress_extreme_aspect_scene_002   | 5     | 0     | 5       | 0       | 0       | 0       |
| stress_instrument_heavy_008       | 4     | 0     | 6       | 0       | 0       | 0       |
| stress_long_label_scene_003       | 8     | 0     | 7       | 0       | 0       | 0       |
| stress_many_bottles_scene_001     | 16    | 0     | 16      | 0       | 1       | 0       |
| stress_many_bottles_scene_002     | 17    | 0     | 17      | 0       | 1       | 0       |
| stress_many_small_tools_scene_002 | 5     | 0     | 9       | 0       | 0       | 0       |
| stress_tall_glassware_scene_001   | 7     | 0     | 5       | 0       | 0       | 0       |
| stress_template_007               | 2     | 0     | 2       | 0       | 0       | 0       |
| stress_zoom_detail_007            | 1     | 0     | 1       | 0       | 0       | 0       |

Subset decision gate (step 6): PASS.

## 110-scene before/after (full sweep)

Baseline source: `precheck_batch1/` and `scorecard_batch1/`.
ALT-2 source: `precheck_batch2_alt2/` and `scorecard_batch2_alt2/`.

| Metric                             | Baseline | ALT-2 | Delta |
| ---------------------------------- | -------- | ----- | ----- |
| clipped_by_parent (total)          | 631      | 393   | -238  |
| aspect_distorted HARD_FAIL (total) | 570      | 570   | +0    |
| region_overflow (total)            | 2        | 129   | +127  |
| off_page (total)                   | 0        | 86    | +86   |

| Score stat | Baseline | ALT-2 |
| ---------- | -------- | ----- |
| median     | 41       | 0     |
| mean       | 38.6     | 5.4   |
| p5         | 19       | 0     |
| p95        | 50       | 46    |

| Regression class             | Count    |
| ---------------------------- | -------- |
| Scenes with score drop > 5pt | 91 / 110 |
| Scenes with score gain > 5pt | 0 / 110  |

Decision gate (full sweep): FAIL on r_ovf (`r_ovf INCREASES -> REVERT`).

## Top 20 remaining failures after ALT-2 (before revert)

| Scene                         | cbp | ad_HF | r_ovf | off | total |
| ----------------------------- | --- | ----- | ----- | --- | ----- |
| stress_dense_clutter_001      | 13  | 11    | 2     | 8   | 34    |
| stress_dense_clutter_015      | 16  | 8     | 2     | 8   | 34    |
| stress_dense_clutter_006      | 13  | 10    | 2     | 8   | 33    |
| stress_dense_clutter_007      | 15  | 9     | 2     | 7   | 33    |
| stress_dense_clutter_004      | 12  | 9     | 2     | 5   | 28    |
| stress_dense_clutter_014      | 10  | 9     | 2     | 5   | 26    |
| stress_dense_clutter_020      | 10  | 9     | 2     | 5   | 26    |
| stress_dense_clutter_016      | 10  | 8     | 2     | 5   | 25    |
| gold_drug_dilution_workspace  | 9   | 8     | 2     | 4   | 23    |
| stress_dense_clutter_019      | 9   | 12    | 2     | 0   | 23    |
| gold_heat_block_sample_prep   | 10  | 10    | 2     | 0   | 22    |
| stress_dense_clutter_009      | 7   | 13    | 2     | 0   | 22    |
| stress_dense_clutter_017      | 9   | 9     | 2     | 2   | 22    |
| gold_staining_bench           | 10  | 5     | 2     | 3   | 20    |
| stress_many_bottles_scene_002 | 1   | 17    | 1     | 1   | 20    |
| gold_microscope_slide_prep    | 9   | 5     | 2     | 3   | 19    |
| gold_plate_reader_assay       | 6   | 7     | 2     | 4   | 19    |
| stress_dense_clutter_003      | 7   | 10    | 2     | 0   | 19    |
| stress_dense_clutter_008      | 8   | 10    | 1     | 0   | 19    |
| stress_dense_clutter_010      | 7   | 10    | 2     | 0   | 19    |

## Root-cause diagnosis (evidence-backed)

Diagnosed on `gold_drug_dilution_workspace` (53 -> 0). Sample:

- region_overflow: rear_shelf grid row is 144px; with no max-height, packed
  placements (the column flex stacks `.object-graphic` 218px + label) push
  scroll_height to 394px, leaving overflow_h=250.
- off_page: `placement_p200_micropipette_empty` rendered at y=933.7, h=218,
  bottom corners outside the 1080px container.

The `.scene-container` uses `grid-template-rows: 100px 1fr 100px 150px 0px`,
so rear/front/instrument rows have fixed budgets. `.placement { max-height:
100% }` previously made placements respect that budget. Removing it lets
flex children expand to min-height of the footprint (which for
`footprint--handheld` is 110-160px tall) plus label, overflowing fixed-size
rows. The bottle subset only contained dense work_surface placements where
the row is `1fr` -- so they had slack to grow into. Other rows do not.

The subset win was local: it fixed `footprint--container` (220x240) inside
the `1fr` work_surface, where the placement could grow. It cannot
generalize to fixed-height rows without making the row budgets dynamic.

## Status of step 7+ artifacts

Steps 7 and 8 partially executed BEFORE the regression was detected and
before revert:

- Full precheck under ALT-2: `experiments/css_native_layout/stress_results/precheck_batch2_alt2/` (kept for evidence)
- Full scorecard under ALT-2: `experiments/css_native_layout/stress_results/scorecard_batch2_alt2/` (kept for evidence)
- Subset precheck under ALT-2: `experiments/css_native_layout/stress_results/precheck_batch2_alt2_subset/` (kept for evidence)

CSS files reverted: confirmed via `git diff experiments/css_native_layout/styles/`
returning empty.

Step 9 (5 before/after PNGs) and step 10 (Lane R 7/7) were not performed:
preconditioned on WINNER status, which was not reached. Production `src/style.css`
was not touched at any point.

## Recommended next lane

Brief forbids unprompted ALT-1 escalation. Two evidence-grounded follow-ups
to propose to the user:

1. SCOPED ALT-2: drop `max-height: 100%` ONLY on placements inside
   `.region--work_surface` (the `1fr` row), keeping it on
   `.region--rear_shelf`, `.region--front_tools`, and
   `.region--instrument_station` (the fixed-size rows). This isolates the
   subset's gains to the row that actually has vertical slack and avoids
   the rear/front overflow that drove the 91-scene regression.
2. The brief's named ALT-1 (drop `.placement { overflow: hidden }`) with
   explicit approval, since ALT-2's safer-seeming change still has unsafe
   downstream effects.

ALT-3 (lower footprint min-height) is in AB-lane scope, not this lane.
