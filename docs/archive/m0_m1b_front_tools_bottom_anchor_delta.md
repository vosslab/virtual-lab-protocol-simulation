# M0 to M1b front_tools bottom anchor delta

Trial number two for the front_tools region overflow problem in the
layout-manager clean-start effort. Trial one (M1a) capped the region
height with `max-height: 180px`, which flipped flex cross-axis alignment
and anchored pipettes at the region top. M1b restores bottom anchoring
by adding `align-items: flex-end` to `.region--front_tools` without
adding a height cap.

## 1. Hypothesis

M1a flipped flex cross-axis alignment from `flex-end` (inherited) to
`flex-start` (the default that `max-height` reverted to), which moved
front-tool placements to the region top and worsened the layout. M1b
removes the height cap and adds an explicit `align-items: flex-end` to
restore bottom anchoring. The expectation was that bottom-anchored items
in the wrap region would pull the rendered bbox up into the viewport,
reducing `off_page` by 12 or more while keeping `region_overflow` and
`clipped_by_parent` at or below baseline.

## 2. CSS diff hunks

Same hunk applied to all three workspace stylesheets so the rule fires
in every scene type that uses a `.region--front_tools` region.

`experiments/css_native_layout/styles/bench.css`:

```diff
 /* Front tools: wrap allowed for small tools */
+/* M1b: restore bottom anchoring; flex handles height (no cap). */
 .region--front_tools {
   flex-wrap: wrap;
   min-height: 260px;
+  align-items: flex-end;
 }
```

`experiments/css_native_layout/styles/hood.css`:

```diff
 /* Front tools: wrap allowed for small tools */
+/* M1b: restore bottom anchoring; flex handles height (no cap). */
 .region--front_tools {
   flex-wrap: wrap;
   min-height: 260px;
+  align-items: flex-end;
 }
```

`experiments/css_native_layout/styles/instrument.css`:

```diff
 /* Front tools: wrap allowed for small tools */
+/* M1b: restore bottom anchoring; flex handles height (no cap). */
 .region--front_tools {
   flex-wrap: wrap;
   min-height: 260px;
+  align-items: flex-end;
 }
```

No other CSS was touched. No follow-on cleanup was applied. The base
`.region` rule was left as-is in each file (bench.css uses
`align-items: flex-end`; hood.css and instrument.css use
`align-items: flex-start`).

## 3. Aggregate delta table

Counts are sums across all 10 scenes at 1920x1080 viewport.

| Metric | M0 baseline | M1b after | Delta | Acceptance gate |
| --- | --- | --- | --- | --- |
| off_page | 21 | 22 | +1 | needs >= -12 (target <= 9) |
| region_overflow | 4 | 4 | 0 | needs <= 4 |
| clipped_by_parent | 21 | 22 | +1 | needs <= 21 |

## 4. Per-scene delta table

`op` = off_page count, `ro` = region_overflow count,
`cbp` = clipped_by_parent count (from artwork_integrity).

| Scene | M0 op | M1b op | dop | M0 ro | M1b ro | dro | M0 cbp | M1b cbp | dcbp | CSS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | bench.css |
| cell_counter_basic | 1 | 2 | +1 | 0 | 0 | 0 | 1 | 2 | +1 | instrument.css |
| crowded_bench_dense | 3 | 3 | 0 | 2 | 2 | 0 | 3 | 3 | 0 | bench.css |
| drug_dilution_plate_workspace | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | bench.css |
| drug_dilution_workspace_dense | 4 | 4 | 0 | 0 | 0 | 0 | 4 | 4 | 0 | bench.css |
| electrophoresis_bench | 7 | 7 | 0 | 1 | 1 | 0 | 7 | 7 | 0 | bench.css |
| hood_basic | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | hood.css |
| microscope_basic | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | instrument.css |
| staining_bench | 2 | 2 | 0 | 1 | 1 | 0 | 2 | 2 | 0 | bench.css |
| well_plate_96_zoom | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bench.css |

Only one scene moved: cell_counter_basic regressed by +1 on both
off_page and clipped_by_parent. Every other scene is unchanged.

## 5. Acceptance verdict

| Rule | Required | Observed | Result |
| --- | --- | --- | --- |
| off_page drops by >= 12 (<= 9) | <= 9 | 22 | FAIL |
| region_overflow does NOT increase (<= 4) | <= 4 | 4 | PASS |
| clipped_by_parent does NOT increase (<= 21) | <= 21 | 22 | FAIL |

Overall: FAIL. Two of three gates failed. M1b does not solve the
front_tools overflow problem.

## 6. Root cause analysis

The change did not lower any failure count anywhere, and created one
new failure in cell_counter_basic. Three observations explain why.

First, bench.css already had `align-items: flex-end` on the base
`.region` rule, so adding it to `.region--front_tools` was a complete
no-op for the seven bench-themed scenes
(bench_basic, crowded_bench_dense, drug_dilution_plate_workspace,
drug_dilution_workspace_dense, electrophoresis_bench, staining_bench,
well_plate_96_zoom). Those scenes' M0 numbers are visible above; they
do not move.

Second, hood.css and instrument.css base `.region` rules use
`align-items: flex-start`. Adding `flex-end` on the front_tools child
selector changed the alignment from top to bottom there. The hood_basic
scene was already 0/0/0 and stayed 0/0/0. The two instrument scenes
(cell_counter_basic and microscope_basic) had the alignment flip
applied. microscope_basic was unaffected. cell_counter_basic regressed
by one off_page and one clipped_by_parent on the same placement:

```
M1b new failure:
  placement: front_tools_counter_slide_cartridge
  object:    counter_slide_cartridge
  bbox:      x=28 y=1025 w=80 h=112  (bottom at y=1137)
  corners_out_of_viewport: bottom-left, bottom-right
  clipped_by_parent sides: bottom
```

That placement now bottom-anchors inside the front_tools region. The
region's lower edge is below the 1080px viewport because the grid row
allocated to `front_tools` extends past viewport on this scene
(grid-template-rows is `100px 1fr 100px 150px 0px` with a 1080px
container height and 16px padding plus 12px gap; the 150px row sits at
the bottom and the 100px row above it gets pushed against the bottom of
the viewport when the 1fr row consumes available space). With
top-anchored placements the cartridge sat near y=914 (region top) and
stayed inside the viewport. Bottom-anchoring moved it to y=1025, pushing
its bottom edge to y=1137, 57px below the 1080px viewport.

Third, the off_page failures in the bench-themed scenes are not
front_tools failures at all. They are instrument_station, work_surface,
and rear_shelf placements going off-page below the 1080px viewport.
Because the grid template ends with a 0px row and a 150px instrument
row, and because every placement uses footprint min-height values that
the grid does not shrink, the bottom of the scene-container overflows
1080px on dense scenes. `flex-end` alignment inside `.region--front_tools`
has zero leverage on those failures.

Net mechanism: M1b targeted the wrong layer. The viewport overflow is
caused by the grid row track sizing and footprint min-heights, not by
the front_tools cross-axis alignment.

## 7. Next-step recommendation

Stop trying to fix front_tools overflow with selectors scoped to
`.region--front_tools`. The diagnosed cause sits one level higher in
the scene container's grid template plus footprint minimum heights. The
front_tools region inherits its position from grid row sizing; it
cannot pull its own placements back into the viewport by changing
internal alignment.

Recommended next trial (M2 candidate, not committed by this lane):

- Audit `.scene-container` grid-template-rows on 1920x1080 viewport.
  Current value is `100px 1fr 100px 150px 0px`. Sum of fixed rows is
  350px plus 4 x 12px gap = 398px, leaving 682px for the `1fr`
  work_surface, plus 32px container padding. Whether this fits inside
  1080px depends on what the `1fr` row resolves to with overflow
  content; investigate whether grid is being driven into overflow by
  inner content forcing the 1fr row taller than its share.
- Either reduce footprint min-heights for `.scene--bench .footprint--*`
  on dense scenes, or change the bottom row from a fixed 150px to
  `minmax(0, 150px)` so it can shrink instead of overflowing the
  viewport.
- Revert the M1b CSS edit before the next experiment so trials are
  independent.

Revert command for the user (or a future agent):

```
git checkout main -- experiments/css_native_layout/styles/bench.css
git checkout main -- experiments/css_native_layout/styles/hood.css
git checkout main -- experiments/css_native_layout/styles/instrument.css
```

This delta doc and the precheck output under
`test-results/m0_static_summary/precheck_after_m1b/` should be retained
as the M1b evidence record.

## Iteration status

One-shot trial executed exactly as scoped. No iteration was attempted
after the FAIL verdict was computed, per the dispatch boundary.
