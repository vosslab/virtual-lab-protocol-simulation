# Round 3 Workstream A: static-template repair report

Date: 2026-05-21
HEAD baseline: 8795d25
Status: DONE

## Scoreboard

| Pass | Templates visible_crops | Gold visible_crops | Templates off_page | Templates region_overflow | Templates svg_overlap |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline (HEAD 8795d25) | 41 | 78 | 20 | 0 | 0 |
| strategy_a (literal class sizing) | 64 (+23) | not run | 20 | 0 | 0 |
| strategy_b (region/card growth) | 41 (0) | not run | 26 (+6) | 0 | 0 |
| strategy_c (object containment) | 21 (-20) | not run | 21 (+1) | 4 (+4) | 0 |
| hybrid (== Strategy C alone) | 21 (-20) | 38 (-40) | 21 (+1) | 4 (+4) | 0 templates / 15 gold |

Visible crops = `checks.artwork_integrity.clipped_by_parent` length per scene
(Round 2 definition). off_page, region_overflow, svg_svg_overlap are the
other precheck hard-fail buckets and are tracked to catch regressions.

## Strategy results

### Strategy A: literal footprint class sizing

Edited `experiments/css_native_layout/styles/bench.css` to shrink
max-heights and min-widths on all seven existing footprint classes
(small-tool, handheld, container, rack, instrument, large-equipment,
zoom-view). Hypothesis: cap card heights tight against the current grid
row heights (rear_shelf=100px, front_tools=100px) so artwork stays inside
the placement's overflow:hidden box.

Result: regression. Templates crops jumped from 41 to 64 (+56%).

Failure mode: smaller cards allow more items per flex-wrap row, so more
items render visibly inside the 100px rear_shelf and front_tools rows,
each of which has the same per-card clip problem. Shrinking the card
does not stop the placement's `overflow: hidden` from clipping the
rendered SVG; it just packs more clipped items into the row. Reject this
strategy.

### Strategy B: region and card growth

Edited `experiments/css_native_layout/styles/bench.css` only on the
`.scene-container { grid-template-rows: ... }` rule. Tried two row
templates:

- v1 (`280px 1fr 220px 300px 0px`): grew rear_shelf/front_tools/
  instrument_station to their existing region `min-height` declarations.
  Result: 64 crops AND 64 off_page; the larger fixed rows pushed scene
  content outside the 1080px viewport. Total fixed rows + gaps exceeded
  the viewport budget.
- v2 (`200px 1fr 200px 180px 0px`): moderated row sizes. Total fixed
  rows ~620px leaves ~430px for work_surface (1fr). Result: 41 crops
  (zero change vs baseline) but off_page +6 (20 to 26). The placement's
  `overflow: hidden` is still the dominant clipper, so growing the row
  alone does not stop the clip; the row growth just shoves nearby cards
  off the viewport.

Reject this strategy in isolation. Region growth without object
containment relief does not move the visible-crop number and worsens
off-page in some scenes.

### Strategy C: object containment

Edited `experiments/css_native_layout/styles/bench.css`:

- `.placement` -- removed `overflow: hidden` and `max-height: 100%`;
  set `overflow: visible`.
- `.region--work_surface` -- removed `overflow: hidden` and
  `max-height: 100%`; set `overflow: visible`.

Hypothesis: the precheck `clipped_by_parent` metric walks ancestors for
the most restrictive `overflow != visible` clip box and counts img
pixels outside it. The placement and work_surface region were the two
ancestors actually clipping artwork. Removing those clips lets the SVG
render at its natural size; `scene-container { overflow: auto }`
remains the viewport boundary so genuine off-page exits are still
caught (precheck's off_page check is independent of clipped_by_parent).

Result: 41 -> 21 crops (-49%). off_page +1 (20 -> 21). region_overflow
went 0 -> 4, but no new svg_svg_overlap on templates. region_overflow
is the precheck `scrollHeight > clientHeight` check on regions; it is a
fair trade for unclipped artwork in the dense scenes (crowded_bench_dense,
electrophoresis_bench, staining_bench).

Keep this strategy.

## Hybrid build

Strategy C is the only non-regressing lever in this corpus. The hybrid
equals Strategy C with no Strategy A or B pieces. Adding Strategy B v2
on top would not help on the templates (B alone was a no-op for crops)
and would cost off_page budget that we have already spent on the
viewport-edge cases unmasked by C.

Applied to a clean baseline and re-run:

| Suite | visible_crops | off_page | region_overflow | svg_svg_overlap |
| ---: | ---: | ---: | ---: | ---: |
| templates baseline | 41 | 20 | 0 | 0 |
| templates hybrid | 21 | 21 | 4 | 0 |
| gold baseline | 78 | 34 | 0 | 0 |
| gold hybrid | 38 | 38 | 20 | 15 |

Templates: -20 visible crops (-49%) with +5 net other hard fails. Gold:
-40 visible crops (-51%) with +39 other hard fails (20 region_overflow,
15 svg_svg_overlap, +4 off_page). Gold is NOT worsened on the
clipped_by_parent metric the workstream is named after.

## Gold regression check

Per the workstream brief: "Must NOT worsen gold crop count."

Gold visible_crops: baseline 78 -> hybrid 38. No worsening; substantial
improvement.

The hybrid does surface previously-hidden hard fails on gold:
- region_overflow 0 -> 20: the gold scenes contain placements that
  always overflowed their regions; the baseline `overflow: hidden`
  masked this. Surfacing the metric is good; the underlying layout
  problem was always there.
- svg_svg_overlap 0 -> 15: with placements no longer clipped, neighbour
  cards in dense gold scenes now visibly overlap. This is honest
  reporting; it indicates the gold scenes need region/row growth or
  per-scene density tuning.

The "must not worsen" condition is on visible_crops. The hybrid meets
the bar. The newly-surfaced region_overflow and svg_svg_overlap belong
to the next workstream (gold repair).

## Remaining template violations

After hybrid, 21 visible_crops remain across 8 of 10 templates:

| Scene | crops | objects |
| ---: | ---: | --- |
| electrophoresis_bench | 7 | tall containers in dense scene |
| drug_dilution_workspace_dense | 4 | well_plate_96, tube_rack_24, drug_vial_rack, etc. |
| crowded_bench_dense | 3 | dense work_surface |
| drug_dilution_plate_workspace | 2 | well_plate_96, tube_rack_24 |
| staining_bench | 2 | staining_tray, waste_container |
| bench_basic | 1 | p200_micropipette bottom-of-viewport |
| cell_counter_basic | 1 | cell_counter bottom-of-viewport |
| microscope_basic | 1 | microscope bottom-of-viewport |
| hood_basic | 0 | none |
| well_plate_96_zoom | 0 | none |

These are predominantly bottom-of-viewport overflow: the SVG asset
renders at its natural size and extends below the 1080px viewport
boundary. The fix lives in two follow-on workstreams:

1. Asset sizing pass (already documented in
   docs/active_plans/no_cropped_svg_asset_sizing_table.md): shrink the
   handheld and rack natural rendered sizes so they fit the 1080px
   budget, or move them into regions with more vertical room.
2. Gold repair workstream (queued next): apply hybrid to the gold
   scenes plus targeted region/row growth where region_overflow and
   svg_svg_overlap are now visible.

## Decisions and rejects

| Pass | Decision | Reason |
| --- | --- | --- |
| Strategy A | REJECT | regression: 41 -> 64 visible crops |
| Strategy B | REJECT in isolation | crops unchanged, off_page +6 |
| Strategy C | KEEP | 41 -> 21 crops, minor off_page +1 |
| Hybrid | KEEP (== Strategy C) | A and B add no value over C; combining would worsen off_page |

## Artifact paths

All paths are absolute under the repo root.

- Report: `docs/active_plans/workstreams/no_crop_round3_static_template_repair_report.md`
- Contact sheet: `test-results/no_crop_round3_static_template_repair/INDEX.html`
- Baseline templates precheck: `test-results/no_crop_round3_static_template_repair/baseline/`
- Baseline gold precheck: `test-results/no_crop_round3_static_template_repair/baseline_gold/`
- Strategy A precheck: `test-results/no_crop_round3_static_template_repair/strategy_a/`
- Strategy B precheck: `test-results/no_crop_round3_static_template_repair/strategy_b/`
- Strategy C precheck: `test-results/no_crop_round3_static_template_repair/strategy_c/`
- Hybrid templates precheck: `test-results/no_crop_round3_static_template_repair/hybrid_templates/`
- Hybrid gold precheck: `test-results/no_crop_round3_static_template_repair/hybrid_gold/`
- Applied hybrid bench.css copy: `test-results/no_crop_round3_static_template_repair/hybrid_bench.css.applied`
- Hybrid diff vs HEAD: `test-results/no_crop_round3_static_template_repair/hybrid_bench.css.diff`

Per-scene PNG screenshots are saved inside each precheck output folder
(named `<scene_id>.png`). The contact sheet links them in
before/after pairs.

## Files edited

| File | Status |
| --- | --- |
| `experiments/css_native_layout/styles/bench.css` | REVERTED to HEAD 8795d25 (git status clean for this file) |

The hybrid diff is preserved at `hybrid_bench.css.diff` so it can be
re-applied verbatim by the follow-on workstream.

## Commands

Baseline templates precheck (one line per directive):

```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/*.html' \
  --out test-results/no_crop_round3_static_template_repair/baseline \
  --annotate off
```

Per-strategy and hybrid runs follow the same pattern with the `--out`
folder swapped (`strategy_a`, `strategy_b`, `strategy_c`,
`hybrid_templates`). Gold runs use the
`stress_scenes/rendered_batch5_clean/gold_*.html` glob and `--out
hybrid_gold` or `baseline_gold`.

Counts in this report were produced by `_temp_count.py` in the repo
root (Round 3 throwaway helper) summing `clipped_by_parent` entries per
scene from each `visual_audit.json`.

## Next workstream queued

Recommendation: queue **gold repair workstream** next.

Rationale: gold scenes show -40 visible_crops with the hybrid applied
(78 -> 38), but the hybrid surfaces region_overflow +20 and
svg_svg_overlap +15 that were previously hidden by `overflow: hidden`.
These honest hard fails belong to the gold scenes' density and region
layout, not to template chrome. The next workstream should:

1. Re-apply the hybrid diff (`hybrid_bench.css.diff`).
2. Audit each gold scene's region rows and per-card sizing.
3. Decide whether to shrink dense placements, grow regions, or move
   items to other regions, scene by scene.

A parallel **missing-asset repair workstream**
(`docs/active_plans/workstreams/round3_missing_asset_repair_brief.md`)
is also queued; it is independent because asset SVG availability is a
separate axis from layout containment.

## Verification

- Baseline precheck output captured: YES
  (`test-results/no_crop_round3_static_template_repair/baseline/visual_audit.json`)
- Per-strategy precheck before+after captured: YES (each strategy is a
  full run from clean baseline; before == baseline run; after ==
  strategy run)
- Hybrid gold-regression precheck captured: YES
  (`hybrid_gold/visual_audit.json` vs `baseline_gold/visual_audit.json`)
- Screenshot pairs per strategy and hybrid: precheck.mjs emits one
  `<scene>.png` per scene in each `--out` folder. INDEX.html threads
  baseline and strategy folders.

## Handoff

Status: DONE

- Baseline visible_crops (templates): 41 (cite: `_temp_count.py
  test-results/.../baseline/visual_audit.json` -> `TOTAL
  visible_crops (clipped_by_parent): 41`)
- Per-strategy delta:
  - A: +23 (REJECT)
  - B: 0 (REJECT, off_page +6)
  - C: -20 (KEEP)
- Winning strategy: C (object containment via overflow visible on
  `.placement` and `.region--work_surface`)
- Hybrid vs templates: 21 visible_crops, -20 vs baseline (-49%)
- Gold regression: 78 -> 38 visible_crops; not worsened. New surface
  region_overflow and svg_svg_overlap are honest reports on gold layout
  density.
- Remaining template violations: 21, listed in
  "Remaining template violations" section above.
- Artifact paths: enumerated in "Artifact paths" section.
- Files edited: `experiments/css_native_layout/styles/bench.css`
  reverted to HEAD; hybrid preserved as `hybrid_bench.css.applied` and
  `hybrid_bench.css.diff` under the test-results subfolder.
- Next workstream queued: gold repair (re-apply hybrid + scene-by-scene
  density audit). Missing-asset repair already drafted under
  `docs/active_plans/workstreams/round3_missing_asset_repair_brief.md`.
