# M1d instrument_station origin fix delta

STATIC EXPERIMENT EVIDENCE 2026-05-22 - M1d delta

This report records the M1d delta after a single CSS structural fix to
`experiments/css_native_layout/styles/instrument.css`. Static evidence only.
No HTML, SVG, JS, or YAML touched. No commit. The fix is scoped strictly to
the instrument workspace stylesheet, which is referenced only by
`cell_counter_basic.html` and `microscope_basic.html`. `bench.css` and
`hood.css` are untouched.

## 1. Investigation findings

### Symptom

M0 baseline: in `cell_counter_basic` and `microscope_basic` (both load
`instrument.css`), the `.region--instrument_station` element renders at
y=1162 with h=150. Its placement (the large-equipment cell counter or
microscope) renders at y=1174 h=125 -> y_bot=1299, fully below the 1080
viewport. The precheck reports each scene with off_page=1 and clipped\_by\_parent=1.

### CSS structure causing y=1162

`instrument.css` declared:

```css
.scene-container {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 100px 1fr 100px 150px 0px;
  ...
}

.region--popup_layer {
  display: grid;
  place-items: center;
  grid-area: 1 / 1 / -1 / -1;
  ...
}
```

The intent: `popup_layer` is a full-overlay element spanning every row.
Other regions (`rear_shelf`, `work_surface`, `front_tools`,
`instrument_station`) carry no explicit grid-row, so they auto-flow.

Live inspection at 1920x1080 confirmed the resolved `grid-template-rows`
expanded to NINE tracks:

```
100px 0px 100px 150px 0px 320px 120px 260px 150px
```

Explanation: `grid-area: 1 / 1 / -1 / -1` on `popup_layer` claims every
cell of the 5-track explicit grid. The other 4 regions are auto-placed
with default `grid-auto-flow: row`. Because no cell in the explicit grid
is available, the user agent appends IMPLICIT row tracks (320, 120, 260,
150) below the explicit grid to fit them. The 4 real regions therefore
sit BELOW the explicit grid:

- rear\_shelf at y=426
- work\_surface at y=758
- front\_tools at y=890
- instrument\_station at y=1162

The explicit grid's expanded width (rows 1-5) consumes the top ~400px
of the container as fully-empty cells, displacing the four real regions
downward by that same amount. `instrument_station` ends up at y=1162,
with its placement at y=1174 -- below h=1080.

This is the SHARED root cause for both `front_tools` (y_bot=1150 in
instrument.css scenes) and `instrument_station` (y_bot=1312) being
off-page in those two scenes. The dispatch defines the M1d-scoped bug
as the `instrument_station` origin; the same fix also restores
`front_tools` in the same two scenes because both regions share the
same displacement.

### Layer of the bug

CSS-only. `instrument.css` is the layer where the structural rule lives.
No HTML or YAML edit is required. The fix removes `popup_layer` from
the grid auto-flow so the four real regions occupy the explicit grid
tracks as authored.

## 2. Fix description

Two-part edit, both in `experiments/css_native_layout/styles/instrument.css`:

1. Move `popup_layer` out of grid auto-flow by switching it to
   absolute positioning anchored to the scene container's content edge
   (`inset: 16px` matches the container's 16px padding so a future
   modal still covers the full work area). Add `pointer-events: none`
   so the empty overlay does not intercept clicks on regions below it.
2. Drop the now-unused fifth track (`0px`) from `grid-template-rows`,
   leaving four explicit tracks for the four real regions
   (`rear_shelf`, `work_surface`, `front_tools`, `instrument_station`).
   Add `position: relative` on `.scene-container` so the absolutely
   positioned `popup_layer` anchors to it.

## 3. CSS diff hunks

```diff
diff --git a/experiments/css_native_layout/styles/instrument.css b/experiments/css_native_layout/styles/instrument.css
@@ -61,17 +61,25 @@
-/* Main scene container: fixed nominal dimensions, auto-collapse regions */
+/* Main scene container: fixed nominal dimensions, auto-collapse regions */
+/* M1d fix: position: relative anchors the absolute-positioned popup_layer
+ * overlay below. Previously popup_layer used grid-area: 1 / 1 / -1 / -1, which
+ * occupied every cell in the explicit grid and pushed the four real regions
+ * (rear_shelf, work_surface, front_tools, instrument_station) into IMPLICIT
+ * grid tracks below the explicit grid. That moved instrument_station to
+ * y=1162, with its placement at y=1174 -- off-page. */
 .scene-container {
   display: grid;
   grid-template-columns: 1fr;
-  grid-template-rows: 100px 1fr 100px 150px 0px;
+  grid-template-rows: 100px 1fr 100px 150px;
   gap: var(--gap-region);
   width: 1920px;
   height: 1080px;
   margin: 0 auto;
   padding: 16px;
   background: var(--color-bg);
   overflow: auto;
   box-sizing: border-box;
+  position: relative;
 }

@@ -127,11 +135,16 @@
 /* Popup layer: centered overlay (positioned last in DOM for natural stacking) */
+/* M1d fix: position: absolute removes popup_layer from the CSS grid auto-flow
+ * so it does NOT consume explicit grid cells. The four real regions stay in
+ * tracks 1-4 of the explicit grid. inset:16px aligns the overlay box with the
+ * container padding edge so a future modal still covers the full work area. */
 .region--popup_layer {
   display: grid;
   place-items: center;
-  grid-area: 1 / 1 / -1 / -1;
+  position: absolute;
+  inset: 16px;
   min-height: 0;
   background: transparent;
   border: none;
   padding: 0;
+  pointer-events: none;
 }
```

Net change in `instrument.css`: 2 lines removed, 14 lines added (8 of
which are explanatory comment lines), 1 line modified
(`grid-template-rows`).

## 4. Before/after instrument_station bbox table

Region-level bboxes for the two affected scenes. Both use
`instrument.css`. M1d numbers measured via Playwright at viewport
1920x1080 against the patched stylesheet.

### cell_counter_basic

| region | M0 y | M0 h | M0 y_bot | M0 status | M1d y | M1d h | M1d y_bot | M1d status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rear_shelf | 426 | 320 | 746 | IN | 16 | 320 | 336 | IN |
| work_surface | 758 | 120 | 878 | IN | 128 | 662 | 790 | IN |
| front_tools | 890 | 260 | 1150 | OUT | 802 | 260 | 1062 | IN |
| instrument_station | 1162 | 150 | 1312 | OUT | 914 | 150 | 1064 | IN |

### microscope_basic

| region | M0 y | M0 h | M0 y_bot | M0 status | M1d y | M1d h | M1d y_bot | M1d status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rear_shelf | 426 | 320 | 746 | IN | 16 | 320 | 336 | IN |
| work_surface | 758 | 120 | 878 | IN | 128 | 662 | 790 | IN |
| front_tools | 890 | 260 | 1150 | OUT | 802 | 260 | 1062 | IN |
| instrument_station | 1162 | 150 | 1312 | OUT | 914 | 150 | 1064 | IN |

The two scenes share identical layout (both reference `instrument.css`
and use the same region stack with empty `rear_shelf` and
`work_surface`), so both tables are numerically identical.

### Placement bboxes (instrument.css scenes only)

Live Playwright measurements at 1920x1080.

| scene | placement | M0 y | M0 y_bot | M0 status | M1d y | M1d y_bot | M1d status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cell_counter_basic | front_tools_counter_slide_cartridge | n/a (not off_page in M0) | n/a | IN | 814 | 926 | IN |
| cell_counter_basic | instrument_main_cell_counter | 1174 | 1299 | OUT | 926 | 1051 | IN |
| microscope_basic | instrument_main_microscope | 1174 | 1299 | OUT | 926 | 1051 | IN |

## 5. Aggregate metrics

Counts from `test-results/m0_static_summary/precheck_after_m1d/visual_audit.json`
compared to `test-results/m0_static_summary/precheck/visual_audit.json`.

| metric | M0 | M1d | delta |
| --- | --- | --- | --- |
| total scenes | 10 | 10 | +0 |
| scenes FAIL | 10 | 10 | +0 |
| checks_failed (summary) | 28 | 26 | -2 |
| off_page (sum across scenes) | 21 | 19 | -2 |
| region_overflow (sum) | 4 | 4 | +0 |
| clipped_by_parent (sum) | 21 | 20 | -1 |
| aspect_distorted (sum across scenes) | 47 | 47 | +0 |

### Per-scene off_page totals (verify per-scene non-regression)

| scene | M0 off_page | M1d off_page | delta |
| --- | --- | --- | --- |
| bench_basic | 1 | 1 | +0 |
| cell_counter_basic | 1 | 0 | -1 |
| crowded_bench_dense | 3 | 3 | +0 |
| drug_dilution_plate_workspace | 2 | 2 | +0 |
| drug_dilution_workspace_dense | 4 | 4 | +0 |
| electrophoresis_bench | 7 | 7 | +0 |
| hood_basic | 0 | 0 | +0 |
| microscope_basic | 1 | 0 | -1 |
| staining_bench | 2 | 2 | +0 |
| well_plate_96_zoom | 0 | 0 | +0 |
| TOTAL | 21 | 19 | -2 |

### Per-scene region_overflow totals

| scene | M0 | M1d | delta |
| --- | --- | --- | --- |
| bench_basic | 0 | 0 | +0 |
| cell_counter_basic | 0 | 0 | +0 |
| crowded_bench_dense | 2 | 2 | +0 |
| drug_dilution_plate_workspace | 0 | 0 | +0 |
| drug_dilution_workspace_dense | 0 | 0 | +0 |
| electrophoresis_bench | 1 | 1 | +0 |
| hood_basic | 0 | 0 | +0 |
| microscope_basic | 0 | 0 | +0 |
| staining_bench | 1 | 1 | +0 |
| well_plate_96_zoom | 0 | 0 | +0 |
| TOTAL | 4 | 4 | +0 |

### instrument_station off_page (per-scene)

| scene | M0 | M1d |
| --- | --- | --- |
| cell_counter_basic | 1 (instrument_main_cell_counter) | 0 |
| microscope_basic | 1 (instrument_main_microscope) | 0 |

### Clipped_by_parent (per-scene)

| scene | M0 | M1d | delta | note |
| --- | --- | --- | --- | --- |
| bench_basic | 1 | 1 | +0 | unchanged (bench.css, not in M1d scope) |
| cell_counter_basic | 1 | 0 | -1 | cell_counter is now in-viewport |
| crowded_bench_dense | 3 | 3 | +0 | bench.css scene |
| drug_dilution_plate_workspace | 2 | 2 | +0 | bench.css scene |
| drug_dilution_workspace_dense | 4 | 4 | +0 | bench.css scene |
| electrophoresis_bench | 7 | 7 | +0 | bench.css scene |
| hood_basic | 0 | 0 | +0 | hood.css scene |
| microscope_basic | 1 | 1 | +0 | placement now in-viewport, but the 200px-tall microscope SVG still overflows the placement box by 79px (out of M1d scope -- placement size vs. asset size) |
| staining_bench | 2 | 2 | +0 | bench.css scene |
| well_plate_96_zoom | 0 | 0 | +0 | unaffected |

## 6. front_tools regression check

Required acceptance: `front_tools` off_page count does NOT regress
(same or better than M0 baseline).

| scene | M0 front_tools off_page | M1d front_tools off_page | delta |
| --- | --- | --- | --- |
| bench_basic | 1 | 1 | +0 |
| cell_counter_basic | 0 | 0 | +0 (region newly in viewport, but no items had been off-page from this region originally; same is true post-fix) |
| crowded_bench_dense | 3 | 3 | +0 |
| drug_dilution_plate_workspace | 1 | 1 | +0 |
| drug_dilution_workspace_dense | 2 | 2 | +0 |
| electrophoresis_bench | 4 | 4 | +0 |
| microscope_basic | 0 | 0 | +0 |
| staining_bench | 2 | 2 | +0 |

front_tools off_page sum: 13 -> 13. No regression. bench.css scenes
unchanged (M1d does not edit bench.css). The two instrument.css scenes
saw their `front_tools` region move from y=890 (y_bot=1150, off-page)
to y=802 (y_bot=1062, in-viewport); however no individual placement in
those two scenes had been counted as front_tools-off_page in M0 either
(the M0 off_page sole entries in those scenes were the
instrument_station placements), so the count delta is +0.

## 7. Acceptance verdict

Acceptance criteria from dispatch:

- instrument_station off_page cases drop to zero: YES (2 -> 0).
- front_tools off_page count does NOT regress: YES (13 -> 13).
- region_overflow does NOT increase: YES (4 -> 4).
- No new clipped SVGs or aspect distortion >5%: YES.
  - aspect_distorted unchanged across all 10 scenes (47 -> 47).
  - clipped_by_parent improved by -1 (21 -> 20). No new clipping anywhere.

Overall acceptance: YES.

## 8. What is left

None within M1d scope. Items deliberately out of scope:

- All 10 scenes still verdict FAIL because of pre-existing aspect
  distortion HARD_FAILs and region-whitespace flags. These are
  separate workstreams (e.g. M1a, M1b for front_tools; lane assignments
  for aspect ratios and whitespace).
- `microscope_basic` still shows clipped_by_parent=1: the microscope
  SVG natural height is ~200px but the `.placement` box (constrained by
  the 150px instrument_station row minus padding and label) clips at
  121px. This is a placement/asset-size mismatch, not a region origin
  bug. Per dispatch wording ("Fix the origin (not the placements inside
  it)") it is out of M1d scope. Lane M1g or a future placement-sizing
  lane can address it by either (a) raising the instrument_station row
  height to ~220px, or (b) reducing the rendered microscope size.
- bench.css and hood.css have the same `popup_layer` grid-area
  pattern. Those stylesheets were intentionally not modified in M1d
  per the "do not mix with front_tools changes" instruction. The
  current Lane M1a/M1b work targets bench.css `front_tools` directly;
  M1d's investigation suggests an analogous popup_layer fix would
  remove ~80px from front_tools y-position in bench scenes too, but
  that decision belongs to the manager or to a Lane M1d-bench dispatch.

## 9. Run record

- Command: `OUT_DIR=test-results/m0_static_summary/precheck_after_m1d bash experiments/css_native_layout/run_precheck.sh 'experiments/css_native_layout/templates/*.html'`.
- Templates audited: 10.
- Output: `test-results/m0_static_summary/precheck_after_m1d/` with
  `visual_audit.json`, `visual_audit.md`, `sizing_manifest.json`, and 10
  per-scene PNGs at 1920x1080.
- Annotation step warning (optional Python helper `_temp_annotate.py`
  not present in repo) is identical to the M0 baseline run. Core
  artifacts unaffected.
- M0 baseline regenerated in this worktree before applying the fix to
  match the recorded M0 numbers from
  docs/active_plans/reports/m0_static_failed_scenes.md;
  the baseline reproduced 10/10 FAIL with 21 off_page sum, matching
  the prior baseline.
