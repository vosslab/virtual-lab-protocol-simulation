# M0 -> M1c placement-height cap delta

CSS-only experiment in `experiments/css_native_layout/styles/bench.css`. Adds
`max-height: 180px` to `.scene--bench .region--front_tools .footprint--*`
for the three footprint classes that overflow `front_tools`. SVG integrity
preserved via existing `object-fit: contain` and natural SVG
`preserveAspectRatio`. No HTML or asset edits.

Acceptance verdict: REJECT (rule 1 only). Three of four acceptance rules
pass. The hypothesis is incomplete: capping placement card height shrinks
the cards but does not move them inside the viewport.

## 1. Hypothesis

`front_tools` region content overflows the 1920x1080 viewport at the bottom.
M1a tried capping the region itself to `max-height: 180px` and broke flex
alignment because the placement cards inside were already taller than 180px.
M1c hypothesis: the placement cards (handheld + small-tool, plus
instrument items routed into `front_tools`) are the real height source.
Capping per-footprint `max-height` to 180px should shrink the cards inside
the region. With `object-fit: contain` on `.object-graphic img` and natural
SVG `preserveAspectRatio="xMidYMid meet"`, the SVG content remains
uncropped and aspect-preserved. Items aligned at `flex-end` inside the
260px region should fit within the viewport.

## 2. Identified offending footprints in front_tools

From the M0 baseline (`test-results/m0_static_summary/precheck/visual_audit.json`)
cross-referenced with HTML templates. Of the 21 `clipped_by_parent` HARD
FAILs in M0, 18 live in `front_tools`. Their footprint classes:

| Footprint class       | Front_tools count | Img height range (px) | Clip bottom range (px) |
| ---                   | ---               | ---                   | ---                    |
| `footprint--small-tool` | 9                 | 27 - 284              | 19 - 110               |
| `footprint--handheld`   | 4                 | 59 - 136              | 9 - 78                 |
| `footprint--instrument` | 5                 | 212 - 252             | 64 - 78                |

No `footprint--rack` or `footprint--container` items in `front_tools`
clipped. The remaining 3 `clipped_by_parent` items live in `work_surface`
(electrophoresis_tank clipped on top) and `instrument_station`
(cell_counter, microscope clipped on bottom). Those are out of M1c scope.

Specific placements clipped in front_tools per scene:

| Scene                          | Placement                                  | Object                  | Footprint            | Img height (M0) | Clip side |
| ---                            | ---                                        | ---                     | ---                  | ---             | ---       |
| bench_basic                    | right_tool_p200_micropipette               | p200_micropipette       | small-tool           | 183             | bottom    |
| crowded_bench_dense            | front_microwave                            | microwave               | instrument           | 212             | bottom    |
| crowded_bench_dense            | front_rocking_shaker                       | rocking_shaker          | instrument           | 252             | bottom    |
| crowded_bench_dense            | front_waste_container                      | waste_container         | handheld             | 136             | bottom    |
| drug_dilution_plate_workspace  | tool_p200                                  | p200_micropipette       | small-tool           | 183             | bottom    |
| drug_dilution_plate_workspace  | waste_container                            | waste_container         | handheld             | 136             | bottom    |
| drug_dilution_workspace_dense  | tool_p200_micropipette                     | p200_micropipette       | small-tool           | 183             | bottom    |
| drug_dilution_workspace_dense  | tool_tip_box                               | tip_box                 | small-tool           | 27              | bottom    |
| drug_dilution_workspace_dense  | waste_container_main                       | waste_container         | handheld             | 136             | bottom    |
| drug_dilution_workspace_dense  | waste_tray_secondary                       | waste_tray              | handheld             | 59              | bottom    |
| electrophoresis_bench          | right_tool_area_p200_micropipette          | p200_micropipette       | small-tool           | 284             | bottom    |
| electrophoresis_bench          | right_tool_area_p10_gel_loading_tip_box    | p10_gel_loading_tip_box | small-tool           | 38              | bottom    |
| electrophoresis_bench          | rear_left_protein_ladder_tube              | protein_ladder_tube     | small-tool           | 121             | bottom    |
| electrophoresis_bench          | rear_right_gel_opening_tool                | gel_opening_tool        | small-tool           | 72              | bottom    |
| electrophoresis_bench          | front_left_mini_protean_gel                | mini_protean_gel        | instrument           | 238             | bottom    |
| electrophoresis_bench          | front_right_gel_comb                       | gel_comb                | small-tool           | 54              | bottom    |
| staining_bench                 | right_tool_area_microwave                  | microwave               | instrument           | 212             | bottom    |
| staining_bench                 | right_tool_area_rocking_shaker             | rocking_shaker          | instrument           | 252             | bottom    |

## 3. CSS diff hunks

File modified: `experiments/css_native_layout/styles/bench.css`. Hood.css and
instrument.css were not touched: the clipped placements in their scenes are
in `instrument_station` and `work_surface`, not `front_tools`.

```diff
@@ Zoom view footprint (existing rule)
 .scene--bench .footprint--zoom-view {
   ...
 }
+
+/*
+ * M1c placement-height cap for front_tools region.
+ * Front_tools is the bottom region in the bench grid (150px grid cell).
+ * With min-height: 260px it overflows the grid cell, and at 1920x1080 the
+ * bottom of region content can fall outside the scene-container's
+ * overflow:auto box, clipping SVG assets. Cap each placement card height
+ * to 180px in front_tools so it fits inside the visible region.
+ * object-fit: contain on .object-graphic img preserves natural aspect and
+ * prevents any SVG cropping.
+ */
+.scene--bench .region--front_tools .footprint--small-tool {
+  max-height: 180px;
+}
+
+.scene--bench .region--front_tools .footprint--handheld {
+  max-height: 180px;
+}
+
+.scene--bench .region--front_tools .footprint--instrument {
+  max-height: 180px;
+}
```

Selector specificity (0,3,0) wins over the unscoped `.scene--bench
.footprint--small-tool` (0,2,0) baseline rule. Cap only applies inside
`region--front_tools` so other regions retain their existing height
allowances.

## 4. Aggregate delta table

Computed from `test-results/m0_static_summary/precheck/visual_audit.json`
(M0) and `test-results/m0_static_summary/precheck_after_m1c/visual_audit.json`
(M1c).

| Metric                       | M0  | M1c | Delta |
| ---                          | --- | --- | ---   |
| off_page                     | 21  | 21  | 0     |
| region_overflow              | 4   | 2   | -2    |
| clipped_by_parent (HARD)     | 21  | 21  | 0     |
| aspect_distorted (HARD)      | 38  | 38  | 0     |
| clipped_artwork              | 0   | 0   | 0     |
| svg_svg_overlap              | 0   | 0   | 0     |

## 5. Per-scene delta table

| Scene                          | off_page    | region_overflow | clipped_by_parent | aspect HARD_FAIL | Verdict (M1c) |
| ---                            | ---         | ---             | ---               | ---              | ---           |
| bench_basic                    | 1 -> 1 (0)  | 0 -> 0 (0)      | 1 -> 1 (0)        | 2 -> 2 (0)       | FAIL          |
| cell_counter_basic             | 1 -> 1 (0)  | 0 -> 0 (0)      | 1 -> 1 (0)        | 1 -> 1 (0)       | FAIL          |
| crowded_bench_dense            | 3 -> 3 (0)  | 2 -> 1 (-1)     | 3 -> 3 (0)        | 6 -> 6 (0)       | FAIL          |
| drug_dilution_plate_workspace  | 2 -> 2 (0)  | 0 -> 0 (0)      | 2 -> 2 (0)        | 6 -> 6 (0)       | FAIL          |
| drug_dilution_workspace_dense  | 4 -> 4 (0)  | 0 -> 0 (0)      | 4 -> 4 (0)        | 10 -> 10 (0)     | FAIL          |
| electrophoresis_bench          | 7 -> 7 (0)  | 1 -> 1 (0)      | 7 -> 7 (0)        | 6 -> 6 (0)       | FAIL          |
| hood_basic                     | 0 -> 0 (0)  | 0 -> 0 (0)      | 0 -> 0 (0)        | 3 -> 3 (0)       | FAIL          |
| microscope_basic               | 1 -> 1 (0)  | 0 -> 0 (0)      | 1 -> 1 (0)        | 0 -> 0 (0)       | FAIL          |
| staining_bench                 | 2 -> 2 (0)  | 1 -> 0 (-1)     | 2 -> 2 (0)        | 3 -> 3 (0)       | FAIL          |
| well_plate_96_zoom             | 0 -> 0 (0)  | 0 -> 0 (0)      | 0 -> 0 (0)        | 1 -> 1 (0)       | FAIL          |

Aggregate scene-level verdicts all stay FAIL because the same SVG cropping
HARD_FAILs persist. region_overflow improves in crowded_bench_dense
(2 -> 1, work_surface clean, front_tools still overflows by 17px after
cap, M0 was 34px) and staining_bench (1 -> 0, front_tools now fits).
electrophoresis_bench front_tools overflow reduced from 40px to 17px but
not eliminated; bench.css region rule allows region to expand.

## 6. Artwork integrity check (CRITICAL)

No NEW aspect HARD_FAILs introduced. Two classes of integrity change:

WORSENED existing HARD_FAILs (delta_pct increased on already-failing
items). Mechanism: capping small-tool max-height from 200 to 180 while
keeping min-width 50 makes the placement card relatively WIDER vs natural
aspect for tall narrow pipettes. SVG content inside still keeps natural
aspect via object-fit:contain; the audit's `aspect_distorted` check
measures the .object-graphic CARD bbox, not the rendered img content.

| Scene                          | Placement / Object                 | M0 delta_pct | M1c delta_pct | Delta |
| ---                            | ---                                | ---          | ---           | ---   |
| bench_basic                    | right_tool_p200_micropipette (p200_micropipette) | 15.59 | 22.55 | +6.96 |
| drug_dilution_plate_workspace  | tool_p200 (p200_micropipette)      | 15.59        | 22.55         | +6.96 |
| drug_dilution_workspace_dense  | tool_p200_micropipette (p200_micropipette) | 15.59 | 22.55 | +6.96 |
| electrophoresis_bench          | right_tool_area_p200_micropipette (p200_micropipette) | 61.72 | 79.69 | +17.97 |

NEW WARN-level aspect distortions (below the HARD_FAIL escalation list).
These items had no aspect_distorted entry in M0 (their cards were within
5% of natural aspect at the M0 render size). After the cap, the card
shrinks toward 180h while keeping baseline min-width / max-width
constraints, shifting card aspect away from natural for square-ish items.

| Scene                          | Placement / Object                   | M0 severity | M1c delta_pct | M1c severity |
| ---                            | ---                                  | ---         | ---           | ---          |
| crowded_bench_dense            | front_microwave (microwave)          | OK          | 10.0          | WARN         |
| crowded_bench_dense            | front_rocking_shaker (rocking_shaker) | OK          | 30.95         | WARN         |
| electrophoresis_bench          | front_left_mini_protean_gel (mini_protean_gel) | OK | 23.13 | WARN         |
| staining_bench                 | right_tool_area_microwave (microwave) | OK         | 10.0          | WARN         |
| staining_bench                 | right_tool_area_rocking_shaker (rocking_shaker) | OK | 30.95 | WARN         |

These are CARD aspect changes, not SVG content distortions. The rendered
SVG `img` inside the card stays aspect-correct via `object-fit: contain`
and `preserveAspectRatio="xMidYMid meet"`. clipped_by_parent count did not
change (21 -> 21), confirming no NEW cropping. natural_vs_rendered
sub-check a in the M1c report shows the img bboxes themselves stay within
the natural aspect tolerance for these items.

Per-affected SVG before/after aspect deviation (rendered img content, not
card box):

| Scene                | Placement                          | Object                | Natural aspect | M0 img aspect | M1c img aspect | SVG content cropped? |
| ---                  | ---                                | ---                   | ---            | ---           | ---            | ---                  |
| bench_basic          | right_tool_p200_micropipette       | p200_micropipette     | 0.227          | 0.262 (card)  | 0.278 (card)   | NO (object-fit contain) |
| crowded_bench_dense  | front_microwave                    | microwave             | 1.000          | 1.000         | 0.900 (card)   | NO                   |
| crowded_bench_dense  | front_rocking_shaker               | rocking_shaker        | 0.840          | 0.846         | 0.911 (card)   | NO                   |
| crowded_bench_dense  | front_waste_container              | waste_container       | 0.600          | 0.602         | 0.602          | NO                   |
| electrophoresis_bench | front_left_mini_protean_gel       | mini_protean_gel      | 0.893          | 0.894         | 1.100 (card)   | NO                   |
| staining_bench       | right_tool_area_microwave          | microwave             | 1.000          | 1.000         | 0.900 (card)   | NO                   |
| staining_bench       | right_tool_area_rocking_shaker     | rocking_shaker        | 0.840          | 0.846         | 0.911 (card)   | NO                   |

Aspect figures with `(card)` are the .object-graphic placement card box
aspect, not the rendered svg. SVG content (img) stays at natural aspect
because `.object-graphic img` keeps `object-fit: contain`. The integrity
rule (no cropping) is not violated; the audit's aspect_distorted sub-check
flags card box drift, which is unavoidable when capping height without
also reducing width.

## 7. Acceptance verdict per rule

| Rule | Description                                                                 | Status |
| ---  | ---                                                                         | ---    |
| 1    | off_page drop >= 12 AND total <= 9                                          | NO     |
| 2    | No NEW clipped_by_parent HARD_FAIL (21 -> 21, delta 0)                      | YES    |
| 3    | No NEW aspect distortion >5% on scientific assets (0 new HARD_FAILs)        | YES    |
| 4    | region_overflow does not increase (4 -> 2, delta -2)                        | YES    |

Overall verdict: REJECT. Rule 1 unmet. The CSS edit is safe (rules 2, 3, 4
pass and one bench region_overflow even dropped), but the dispatch's
primary success metric (off_page reduction) requires fixing the regions'
position, not the items' size.

## 8. Root cause of FAIL

The off_page measurement counts placements whose bbox center or corners
fall outside the 1920x1080 viewport. Front_tools items render with their
bbox bottom past y=1080 because the front_tools region itself is
positioned past y=890 in the rendered grid layout. From a direct
Playwright probe of bench_basic post-M1c:

```
scene_container: y=0  h=1080
rear_shelf:      y=426 h=320   (computed_height: 320px, min-height 320 applied)
work_surface:    y=758 h=120
front_tools:     y=890 h=260   (computed_height: 260px, min-height 260 applied)
instrument_station: y=1162 h=150  (already past viewport bottom)
popup_layer:     y=16  h=398  (grid-area: 1 / 1 / -1 / -1, spans all rows)
```

Total bottom edge: 1162 + 150 + 16(padding) = 1328, scrollable. The
scene-container is `overflow: auto`, so content past y=1080 is clipped
from the viewport.

Items inside front_tools use `align-items: flex-end` (bench surface
metaphor) which positions items at the region's bottom edge. Region bottom
sits at y=890 + 260 = y=1150 in bench.css with min-height 260. Items
aligned to flex-end sit at y=1150 minus padding minus item height; a 180px
placement bottom = 1150 - 12 = 1138 (37px past viewport). Capping item
height moves item TOP upward but keeps item BOTTOM at the region bottom.

The deeper cause: rear_shelf starts at y=426, not y=16. The CSS Grid
template `grid-template-rows: 100px 1fr 100px 150px 0px` defines 5 row
tracks summing to 1080 with padding and gaps. The popup_layer region has
`grid-area: 1 / 1 / -1 / -1` which assigns it to all five rows as an
explicit grid placement, occupying all auto-flow slots. The remaining
four regions (rear_shelf, work_surface, front_tools, instrument_station)
are auto-flowed into implicit grid rows after row 5, sized by
`grid-auto-rows: auto`. This pushes the whole content stack into rows
6, 7, 8, 9 starting after the popup_layer's row-5 boundary.

The popup_layer's grid-area is the structural choice that pushes
front_tools off-viewport. No amount of placement-card height capping in
front_tools moves the region itself upward.

Fix directions outside M1c scope (requires user approval; do not implement
without sign-off):

- Remove `grid-area: 1 / 1 / -1 / -1` from `.region--popup_layer`. Make
  popup_layer a non-grid-flow element (`position: absolute` + `inset: 0`,
  or `display: contents`). Then auto-flow places the four content regions
  into rows 1-4 of the explicit grid tracks (100px 1fr 100px 150px),
  totalling 350 fixed + 1fr resolved to fit within 1080.

- Change `.region--front_tools` `align-items: flex-end` to
  `align-items: flex-start`, plus drop the region `min-height: 260px` so
  the region collapses to the actual content height (~180px from the cap)
  inside its 100px grid track. Items would sit at the top of the region,
  not the bottom, keeping their bbox inside the viewport even if the
  region itself overflows downward.

- Reduce grid template row 1 from `100px` and explicitly cap rear_shelf
  height so rear_shelf no longer expands beyond its track.

These options are out of M1c scope (placement-height cap only). Reporting
for the next iteration.

## Files of record

- Modified CSS: `experiments/css_native_layout/styles/bench.css` (added
  three M1c rules after `.scene--bench .footprint--zoom-view`).
- Precheck output (M1c): `test-results/m0_static_summary/precheck_after_m1c/`
  contains `visual_audit.json`, `visual_audit.md`, `sizing_manifest.json`,
  and 10 scene PNGs.
- Baseline (M0): `test-results/m0_static_summary/precheck/`.
- Analysis scripts (worktree-local, not committed): `_temp_analyze.py`,
  `_temp_delta.py`, `_temp_aspects.py`, `_temp_inspect.py`,
  `_temp_compare_pos.py`, `tests/playwright/_temp_layout_probe.mjs`.
