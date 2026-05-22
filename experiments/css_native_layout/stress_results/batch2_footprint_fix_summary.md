# NEW3 Batch 2 footprint fix summary

- Audit date: 2026-05-20
- Lane: Workstream A+B (footprint sweep + apply winner)
- Status: **BLOCKED**
- Decision: do NOT push any candidate to the full 110-scene run

## Headline

The user-specified candidate set targets `.footprint--handheld` in
`experiments/css_native_layout/styles/bench.css`. In the rendered Batch 1
HTML, the placements that drive `clipped_by_parent` (bottles, water
bottles, reagent bottles) carry `footprint--container`, not
`footprint--handheld`. The only assets that carry `footprint--handheld`
in the subset HTMLs are micropipettes. Raising the handheld
`min-height` from 110/77 px to 230/161 px (or larger) increases the
parent-card height of every micropipette placement to a value the
pipette's natural aspect ratio cannot fill, so each pipette now
overflows the card bottom and trips a NEW `clipped_by_parent` HARD
fail.

All three candidates regress on the primary metric the lane is supposed
to improve.

## Subset sweep table

Subset: 20 scenes (10 worst Batch 1 + 10 class representatives).
Baseline derived from `experiments/css_native_layout/stress_results/precheck_batch1/`.

| Candidate                        | clipped_by_parent | aspect_distorted_HF | region_overflow | off_page | sum_all_HF_incidents | delta_vs_baseline |
| -------------------------------- | ----------------- | ------------------- | --------------- | -------- | -------------------- | ----------------- |
| Baseline (no CSS change)         | 186               | 171                 | 2               | 0        | 359                  | 0                 |
| C1: 230/260 px (crowded 161/182) | 207               | 171                 | 2               | 0        | 380                  | +21               |
| C2: 245/280 px (crowded 172/196) | 207               | 171                 | 2               | 0        | 380                  | +21               |
| C3: 260/320 px (crowded 182/224) | 207               | 171                 | 2               | 0        | 380                  | +21               |

All three candidates produce identical totals. None is a winner.

## Why the candidates regress

The new HARD-fail incidents introduced by every candidate are all
micropipettes:

| Scene                             | base CBP | new CBP | new placements                   |
| --------------------------------- | -------- | ------- | -------------------------------- |
| stress_composition_003            | 4        | 5       | +micropipette_p10 (bottom)       |
| stress_dense_clutter_001          | 12       | 15      | +micropipette_p200, +p10, +p1000 |
| stress_dense_clutter_004          | 12       | 13      | +micropipette_p200               |
| stress_dense_clutter_006          | 12       | 13      | +micropipette_p10                |
| stress_dense_clutter_008          | 12       | 13      | +micropipette_p10                |
| stress_dense_clutter_009          | 12       | 15      | +p10, +p1000, +p200              |
| stress_dense_clutter_018          | 10       | 12      | +p1000, +p200                    |
| stress_dense_clutter_019          | 12       | 14      | +p200, +p1000                    |
| stress_extreme_aspect_scene_002   | 5        | 6       | +micropipette_p10                |
| stress_instrument_heavy_008       | 4        | 6       | +p200, +p10                      |
| stress_many_small_tools_scene_002 | 5        | 9       | +p1000, +p10, +p200, +p200       |

No scene saw `clipped_by_parent` decrease.

## Root cause analysis (audit trail)

NEW3-J cluster doc (`docs/active_plans/new3_batch1_failure_clusters.md`,
C1) names the dominant clipper as "DIV.placement on 631 / 631
incidents" and the dominant card geometry as "220 wide x 207 tall
against 220 x 240 img". The card width of 220 px maps to
`.scene--bench .footprint--container` (`min-width: 220px`), not to
`.scene--bench .footprint--handheld` (`min-width: 90px,
max-width: 130px`).

Verified by reading a sample rendered HTML
(`experiments/css_native_layout/stress_scenes/rendered/stress_many_bottles_scene_002.html`):
every bottle placement uses `<div class="object-graphic
footprint--container">`. The cluster doc's recommendation text says
"handheld bottles at 82-92px width" but the live HTML places bottles
into the container footprint.

So the lane's target rule (`.footprint--handheld`) is the wrong
selector for the bottle/glassware family that owns 631 of 631
`clipped_by_parent` incidents.

## What this lane could do next (not in this lane's scope)

- Re-scope to `.footprint--container` and re-run the same three
  numerical candidates. That is the right rule for the bottle/glassware
  family that owns the bottom-clip class.
- Add a separate `.footprint--pipette` (or keep `.footprint--handheld`
  pipette-only) so handheld cards stay short enough that pipette
  natural aspect (0.227 for p200) does not bottom-overflow when card
  is taller.
- Investigate whether the cluster doc's "footprint--handheld" recommendation
  was meant for a future rebalancing where bottles are reclassified into
  handheld (and the container class is reserved for plates/cassettes).
  If so, the rebalancing must happen in the generator and CSS together,
  not as a CSS-only edit.

## Anti-regression check

bench.css was restored from `bench.css.bak_batch2` before exit. `diff
-u bench.css.bak_batch2 bench.css` shows no diff. No changes shipped.

## Artifact paths

- Subset selection: `experiments/css_native_layout/stress_results/batch2_subset.json`
- Subset baseline (Batch 1 numbers on 20 subset scenes): `experiments/css_native_layout/stress_results/batch2_subset_baseline.json`
- Per-candidate per-scene JSONs:
  - `experiments/css_native_layout/stress_results/precheck_batch2_sweep_C1_230_260/*.json`
  - `experiments/css_native_layout/stress_results/precheck_batch2_sweep_C2_245_280/*.json`
  - `experiments/css_native_layout/stress_results/precheck_batch2_sweep_C3_260_320/*.json`
- Per-candidate aggregate summary: `experiments/css_native_layout/stress_results/batch2_sweep_summary.json`
- This document: `experiments/css_native_layout/stress_results/batch2_footprint_fix_summary.md`

## Files NOT created (because no candidate qualifies)

- `experiments/css_native_layout/stress_results/precheck_batch2/`
- `experiments/css_native_layout/stress_results/scorecard_batch2/`
- 5 before/after PNG pairs under
  `docs/active_plans/new3_layout_stress_reliability_assets/lane_ab_*_AFTER.png`

These would have been produced had a candidate beaten baseline. They
are not produced because shipping any of the three candidates would
ship a regression.
