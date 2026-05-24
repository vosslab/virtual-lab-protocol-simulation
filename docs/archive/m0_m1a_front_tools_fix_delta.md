# M1a front_tools fix delta

STATIC EXPERIMENT EVIDENCE 2026-05-22 - M1a delta

This report records the M1a delta after a single-rule CSS fix to
`.region--front_tools` in the three scene stylesheets under
`experiments/css_native_layout/styles/`. Static evidence only. No code, HTML,
SVG, JS, or YAML touched. No commit.

## 1. Background

Lane M (see docs/active_plans/reports/m0_static_failed_scenes.md)
identified `.region--front_tools` with `min-height: 260px` as pattern root cause #1
for off_page entries: the region spans y=890..1150 at 1920x1080, pushing 17 of
21 off_page entries past the viewport bottom (h=1080). Lane K's SWEEP_TABLE.md
showed bench_basic best at 1920x1080 (off_page=0 per center metric, 1 per corner
metric in audit JSON).

The M1a single-rule fix targets only `.region--front_tools`: cap the region's
height so it never extends past the viewport.

## 2. CSS diff

Three files modified, identical edit in each. Net change per file: 1 line
removed (`min-height: 260px;`), 4 lines added (3-line comment + revised
`min-height: 180px;` + new `max-height: 180px;`). Net repo total: +12 lines.

```diff
diff --git a/experiments/css_native_layout/styles/bench.css b/experiments/css_native_layout/styles/bench.css
@@ -113,9 +113,13 @@
 /* Front tools: wrap allowed for small tools */
+/* M1a clean-start fix: cap region inside viewport so placements anchored
+ * to flex-end stay inside h=1080 (was min-height:260 producing y=890..1150
+ * region extent, dragging 17 of 21 off_page entries past viewport bottom). */
 .region--front_tools {
   flex-wrap: wrap;
-  min-height: 260px;
+  min-height: 180px;
+  max-height: 180px;
 }
```

The same hunk applies to `experiments/css_native_layout/styles/hood.css` and
`experiments/css_native_layout/styles/instrument.css`. The base
`.region--front_tools` block is byte-identical across all three stylesheets.

## 3. Per-scene delta table

Counts pulled from `visual_audit.json` checks fields. Columns: off = off_page
entries; rov = region_overflow entries; clip = artwork_integrity.clipped_by_parent
HARD_FAIL entries.

| scene | off before | off after | off delta | rov before | rov after | rov delta | clip before | clip after | clip delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 1 | 1 | +0 | 0 | 1 | +1 | 1 | 1 | +0 |
| cell_counter_basic | 1 | 1 | +0 | 0 | 0 | +0 | 1 | 1 | +0 |
| crowded_bench_dense | 3 | 3 | +0 | 2 | 2 | +0 | 3 | 3 | +0 |
| drug_dilution_plate_workspace | 2 | 2 | +0 | 0 | 1 | +1 | 2 | 2 | +0 |
| drug_dilution_workspace_dense | 4 | 4 | +0 | 0 | 1 | +1 | 4 | 2 | -2 |
| electrophoresis_bench | 7 | 7 | +0 | 1 | 1 | +0 | 7 | 7 | +0 |
| hood_basic | 0 | 0 | +0 | 0 | 0 | +0 | 0 | 0 | +0 |
| microscope_basic | 1 | 1 | +0 | 0 | 0 | +0 | 1 | 1 | +0 |
| staining_bench | 2 | 2 | +0 | 1 | 1 | +0 | 2 | 2 | +0 |
| well_plate_96_zoom | 0 | 0 | +0 | 0 | 0 | +0 | 0 | 0 | +0 |

## 4. Aggregate delta

- off_page: 21 -> 21 (drop 0)
- region_overflow: 4 -> 7 (drop -3, i.e. 3 new region_overflow entries)
- clipped_by_parent (HARD_FAIL): 21 -> 19 (drop 2)
- verdict FAIL: 10 -> 10 (unchanged)

## 5. Acceptance check

Lane P M1a acceptance gate: off_page aggregate drops by at least 12.

Result: NO. Actual drop is 0.

Per dispatch instructions, this dispatch documents the partial drop and stops
without further CSS iteration. Root cause of acceptance failure is in section 7.

## 6. Per-placement position shifts

Off_page placements that did shift inward despite the unchanged aggregate
count. y_end is placement.y + placement.h; viewport bottom is 1080.

| scene | placement | before y_end | after y_end | shift |
| --- | --- | --- | --- | --- |
| bench_basic | right_tool_p200_micropipette | 1137 | 1115 | -22 |
| cell_counter_basic | instrument_main_cell_counter | 1299 | 1219 | -80 |
| drug_dilution_plate_workspace | tool_p200 | 1137 | 1115 | -22 |
| drug_dilution_plate_workspace | waste_container | 1137 | 1115 | -22 |
| drug_dilution_workspace_dense | tool_p200_micropipette | 1137 | 1115 | -22 |
| drug_dilution_workspace_dense | tool_tip_box | 1137 | 1115 | -22 |
| drug_dilution_workspace_dense | waste_container_main | 1137 | 1115 | -22 |
| drug_dilution_workspace_dense | waste_tray_secondary | 1137 | 1115 | -22 |
| microscope_basic | instrument_main_microscope | 1299 | 1219 | -80 |
| crowded_bench_dense | front_microwave | 1184 | 1184 | +0 |
| crowded_bench_dense | front_rocking_shaker | 1184 | 1184 | +0 |
| crowded_bench_dense | front_waste_container | 1184 | 1184 | +0 |
| electrophoresis_bench | center_electrophoresis_tank | 103 | 103 | +0 |
| electrophoresis_bench | front_left_mini_protean_gel | 1170 | 1170 | +0 |
| electrophoresis_bench | front_right_gel_comb | 1170 | 1170 | +0 |
| electrophoresis_bench | rear_left_protein_ladder_tube | 1170 | 1170 | +0 |
| electrophoresis_bench | rear_right_gel_opening_tool | 1170 | 1170 | +0 |
| electrophoresis_bench | right_tool_area_p10_gel_loading_tip_box | 1170 | 1170 | +0 |
| electrophoresis_bench | right_tool_area_p200_micropipette | 1170 | 1170 | +0 |
| staining_bench | right_tool_area_microwave | 1184 | 1184 | +0 |
| staining_bench | right_tool_area_rocking_shaker | 1184 | 1184 | +0 |

## 7. Why off_page did not drop

The fix reduced the front_tools region's bbox height from 260px to 180px and
the region itself now ends at y=1070 (within viewport). However, off_page is
measured per-placement, not per-region. Two effects show in the position
data above:

1. Bench scenes (bench_basic, drug_dilution_*): placement bottom shifted up
   by only 22px instead of the 80px region shrink. This is because
   `max-height: 180px` plus a 213px-tall pipette flips the flex cross-axis
   alignment from flex-end to flex-start (a child taller than its flex
   container anchors at the start). The placement now sits at y=region_top+12
   = 902 with h=213, so y_end = 1115, still 35px past viewport. Before the
   fix the placement was anchored at region_bottom-12-213 = 925 with h=213,
   so y_end = 1138. Net shift = -23px.

2. Hood/instrument scenes (cell_counter_basic, microscope_basic): the
   instrument_station region shifted upward by 80px (the full front_tools
   reduction). But the instrument placements themselves are 125px tall and
   sit at y=region_top, so still extend past viewport (1219 > 1080).

3. crowded_bench_dense, electrophoresis_bench, staining_bench: no shift.
   These scenes have rear_shelf content that already consumes the 1fr
   workspace track, so reducing front_tools simply increases the work_surface
   1fr without moving downstream regions. The placements that were off_page
   inside front_tools stay off_page because the region's max-height = 180
   is still smaller than the placement's natural height (213-282px).

The clipped_by_parent count dropped from 21 to 19 (drug_dilution_workspace_dense
lost 2 clip entries: tip_box and waste_tray_secondary now fit inside the
visible scene-container).

Three new region_overflow entries appeared (bench_basic, drug_dilution_plate_workspace,
drug_dilution_workspace_dense). The max-height: 180 cap makes the region's
scrollHeight (225) exceed offsetHeight (180), which the precheck flags as
region overflow. This is a diagnostic surface, not a new geometry failure
(the region itself stays inside the viewport now).

A future M1b/M1c milestone needs to address the per-placement footprint
max-height values in each stylesheet (the placements are individually larger
than the available vertical space inside front_tools), and possibly add
`align-items: flex-end` explicitly to `.region--front_tools` so taller
children push upward rather than downward. Both edits are out of M1a scope.

## 8. Side-by-side PNG paths

Original (baseline) PNGs are in
`test-results/m0_static_summary/precheck/`:

- `bench_basic.png`
- `cell_counter_basic.png`
- `crowded_bench_dense.png`
- `drug_dilution_plate_workspace.png`
- `drug_dilution_workspace_dense.png`
- `electrophoresis_bench.png`
- `hood_basic.png`
- `microscope_basic.png`
- `staining_bench.png`
- `well_plate_96_zoom.png`

After-fix PNGs in
`test-results/m0_static_summary/precheck_after_m1a/` (same filenames).

PNGs are unannotated because `--annotate off` was used; raw rendered scenes
suffice for the static visual delta comparison.

## 9. Rollback command

```bash
git checkout HEAD -- experiments/css_native_layout/styles/bench.css \
                     experiments/css_native_layout/styles/hood.css \
                     experiments/css_native_layout/styles/instrument.css
```

## 10. Artifacts

- Baseline JSON: `test-results/m0_static_summary/precheck/visual_audit.json`
- After-fix JSON: `test-results/m0_static_summary/precheck_after_m1a/visual_audit.json`
- Baseline MD: `test-results/m0_static_summary/precheck/visual_audit.md`
- After-fix MD: `test-results/m0_static_summary/precheck_after_m1a/visual_audit.md`
