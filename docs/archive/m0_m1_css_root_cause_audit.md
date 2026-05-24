# M0/M1 CSS root cause audit

Lane M1f read-only structural audit of the CSS used by the 10 M0
template scenes under `experiments/css_native_layout/`. No CSS, HTML, or
template file is modified by this audit. Precheck was NOT re-run; this
report uses the existing M0 baseline outputs under
`test-results/m0_static_summary/precheck/`.

## 1. Methodology

For each of the 10 top-level templates under
`experiments/css_native_layout/templates/*.html`, the audit (a) parses
each template to map every `data-placement-name` to its enclosing
`<div class="region region--X">` and its `object-graphic` footprint
class, (b) pulls every HARD_FAIL finding from
`test-results/m0_static_summary/precheck/visual_audit.json` (entries
under `off_page`, `region_overflow`, `svg_label_overlap`, and
`artwork_integrity.clipped_by_parent` / `artwork_integrity.aspect_distorted`
where `severity == "HARD_FAIL"`), and (c) classifies each (scene,
region) pair against the closed root-cause set named in the brief by
joining failing placement bbox to template region. CSS rule properties
are cited at file and line from `experiments/css_native_layout/styles/`.
Total findings: 87 HARD_FAIL records (off_page=21, clipped_by_parent=21,
aspect_distorted=38, region_overflow=4, svg_label_overlap=3). This
matches Lane M's count except Lane M's text sums to 89 due to an
arithmetic note that does not change the per-class totals.

## 2. Per-scene matrix

Columns: scene_name, total HF, dominant failure type, primary
offending region (region with the most HF for that scene), secondary
offending region.

| scene_name | total HF | dominant failure type | primary region (count) | secondary region (count) |
| --- | --- | --- | --- | --- |
| bench_basic | 4 | mixed (clip + aspect + off) | front_tools (3) | work_surface (1) |
| cell_counter_basic | 3 | off_page + clip | instrument_station (3) | - |
| crowded_bench_dense | 14 | aspect_distorted | front_tools (7) | rear_shelf (6) |
| drug_dilution_plate_workspace | 10 | aspect_distorted | front_tools (5) | work_surface (3) |
| drug_dilution_workspace_dense | 18 | aspect_distorted | front_tools (10) | rear_shelf (5) |
| electrophoresis_bench | 24 | off_page + clip + label | front_tools (15) | work_surface (7) |
| hood_basic | 3 | aspect_distorted | rear_shelf (2) | work_surface (1) |
| microscope_basic | 2 | off_page + clip | instrument_station (2) | - |
| staining_bench | 8 | aspect_distorted | front_tools (5) | rear_shelf (3) |
| well_plate_96_zoom | 1 | aspect_distorted | work_surface (1) | - |

Totals match aggregate: off=21, regn=4, svglbl=3, clip=21, aspect=38;
sum 87 records.

Scene/CSS mapping (from `<link rel="stylesheet">` in each template):

| scene_name | scene_container class chain | stylesheet |
| --- | --- | --- |
| bench_basic | scene-container scene--bench | styles/bench.css |
| cell_counter_basic | scene-container scene--instrument | styles/instrument.css |
| crowded_bench_dense | scene-container scene--bench | styles/bench.css |
| drug_dilution_plate_workspace | scene-container scene--bench scene--drug-dilution | styles/bench.css |
| drug_dilution_workspace_dense | scene-container scene--bench scene--drug-dilution | styles/bench.css |
| electrophoresis_bench | scene-container scene--bench | styles/bench.css |
| hood_basic | scene-container scene--hood | styles/hood.css |
| microscope_basic | scene-container scene--instrument | styles/instrument.css |
| staining_bench | scene-container scene--bench | styles/bench.css |
| well_plate_96_zoom | scene-container scene--bench scene-mode--detail | styles/bench.css |

## 3. Per-region structural table

One row per (scene, region) pair that appears in any HARD_FAIL. Display
model, alignment, min/max height, and overflow values come from the
stylesheet linked in section 2 above. The shared rules (`.region`,
`.placement`, `.scene-container`) plus the per-region rule
(`.region--<name>`) cover every (scene, region) pair below. Per-scene
override rules (`.scene--bench`, `.scene--hood`, `.scene--instrument`)
add footprint min/max sizes; they do not redefine region geometry.

Column legend:

- `sel`: selector chain (innermost rule that governs the region).
- `disp`: `display` model of the region.
- `align`: `align-items` value.
- `justify`: `justify-content` value (where set).
- `min-h` / `max-h`: region `min-height` / `max-height`.
- `overflow`: region `overflow` value.
- `parent_bbox`: observed region bbox at 1920x1080 from
  `visual_audit.json -> region_overflow.region_bbox` (only the four
  region_overflow rows have observed bbox; other rows show "(not
  observed in precheck)" and the analytical bbox derived from the
  CSS grid + min-heights).
- `child_bbox`: number of failing-placement bboxes and the sum of their
  rendered heights.
- `fail_type` and `rc`: failure types in this (scene, region) row and
  the resulting root cause class.

### 3.1 bench.css regions

`.region` is bench.css line 86 (`display:flex; align-items:flex-end;
min-height:80px; border-bottom:1px solid rgba(0,0,0,0.06);`). Note that
`.region` in bench.css uses `align-items: flex-end` (line 94) whereas
hood.css line 95 and instrument.css line 94 both use
`align-items: flex-start`. `.placement` in bench.css is lines 156-163
(`overflow: visible`, no max-height; explicit Round-3 hybrid comment
in the source documenting this). `.scene-container` is lines 62-74
(`display: grid; grid-template-rows: 100px 1fr 100px 150px 0px;
width: 1920px; height: 1080px; overflow: auto`).

| scene | region | sel | disp | align | justify | min-h | max-h | overflow | parent_bbox @ 1920x1080 | child_bbox (n / sum_h) | fail_type | rc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | front_tools | bench.css:116 `.region--front_tools` + bench.css:86 `.region` | flex (row) | flex-end | (default) | 260px (l.118) | (none) | (default `visible`) | grid row 3, declared 100px, expanded by min-h to >=260px (not observed in precheck) | 2 / 213+183 = 396 | off_page=1, clipped_by_parent=1, aspect_distorted=1 | placement_taller_than_region |
| bench_basic | work_surface | bench.css:107 `.region--work_surface` + bench.css:86 `.region` | flex (column) | flex-end | flex-end (l.112) | 120px (l.110) | (none) | visible (l.111) | grid row 2 (1fr), absorbs slack | 0 (only aspect_distorted) | aspect_distorted=1 | aspect_mismatch_card_vs_svg |
| crowded_bench_dense | front_tools | bench.css:116 + bench.css:86 | flex (row, wrap l.117) | flex-end | (default) | 260px | (none) | visible | x=16 y=890 w=1888 h=260 (observed; scroll_h=294) | 7 / 1550 (multi-row wrap) | off_page=3, clipped_by_parent=3, region_overflow=1 | region_too_tall_for_viewport |
| crowded_bench_dense | rear_shelf | bench.css:99 `.region--rear_shelf` + bench.css:86 | flex (row, wrap l.100) | flex-end | (default) | 320px (l.102) | (none) | visible | grid row 1 (declared 100px, expanded by min-h to 320px) | 0 (aspect_distorted on glassware children only) | aspect_distorted=6 | aspect_mismatch_card_vs_svg |
| crowded_bench_dense | work_surface | bench.css:107 + bench.css:86 | flex (column) | flex-end | flex-end | 120px | (none) | visible | x=16 y=758 w=1888 h=120 (observed; scroll_h=121, overflow_h=1) | 1 / 120 | region_overflow=1 | region_too_tall_for_viewport |
| drug_dilution_plate_workspace | front_tools | bench.css:116 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 260px | (none) | visible | grid row 3 (not observed; this template defines only 4 regions, no `instrument_station`, so front_tools is also the last non-popup row) | 4 / 698 | off_page=2, clipped_by_parent=2, aspect_distorted=1 | placement_taller_than_region |
| drug_dilution_plate_workspace | rear_shelf | bench.css:99 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 320px | (none) | visible | grid row 1 (not observed) | 0 | aspect_distorted=2 | aspect_mismatch_card_vs_svg |
| drug_dilution_plate_workspace | work_surface | bench.css:107 + bench.css:86 | flex (column) | flex-end | flex-end | 120px | (none) | visible | grid row 2 (not observed) | 0 | aspect_distorted=3 | aspect_mismatch_card_vs_svg |
| drug_dilution_workspace_dense | front_tools | bench.css:116 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 260px | (none) | visible | grid row 3 (not observed; precheck reported off_page + clip but no region_overflow flag) | 8 / 998 | off_page=4, clipped_by_parent=4, aspect_distorted=2 | placement_taller_than_region |
| drug_dilution_workspace_dense | rear_shelf | bench.css:99 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 320px | (none) | visible | grid row 1 (not observed) | 0 | aspect_distorted=5 | aspect_mismatch_card_vs_svg |
| drug_dilution_workspace_dense | work_surface | bench.css:107 + bench.css:86 | flex (column) | flex-end | flex-end | 120px | (none) | visible | grid row 2 (not observed) | 0 | aspect_distorted=3 | aspect_mismatch_card_vs_svg |
| electrophoresis_bench | front_tools | bench.css:116 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 260px | (none) | visible | x=16 y=890 w=1888 h=260 (observed; scroll_h=300, overflow_h=40) | 13 / 1975 (multi-row wrap) | off_page=6, clipped_by_parent=6, aspect_distorted=2, region_overflow=1 | region_too_tall_for_viewport |
| electrophoresis_bench | rear_shelf | bench.css:99 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 320px | (none) | visible | grid row 1 (not observed) | 0 | aspect_distorted=2 | aspect_mismatch_card_vs_svg |
| electrophoresis_bench | work_surface | bench.css:107 + bench.css:86 | flex (column) | flex-end | flex-end | 120px | (none) | visible | grid row 2 (not observed; placement `center_electrophoresis_tank` reports placement y=-217, i.e., positioned ABOVE the work_surface region origin via flex-end column alignment of an oversized card) | 2 / 549 | off_page=1, clipped_by_parent=1, aspect_distorted=2, svg_label_overlap=3 | placement_taller_than_region |
| staining_bench | front_tools | bench.css:116 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 260px | (none) | visible | x=16 y=890 w=1888 h=260 (observed; scroll_h=294, overflow_h=34) | 5 / 1248 (multi-row wrap) | off_page=2, clipped_by_parent=2, region_overflow=1 | region_too_tall_for_viewport |
| staining_bench | rear_shelf | bench.css:99 + bench.css:86 | flex (row, wrap) | flex-end | (default) | 320px | (none) | visible | grid row 1 (not observed) | 0 | aspect_distorted=3 | aspect_mismatch_card_vs_svg |
| well_plate_96_zoom | work_surface | bench.css:328 `.scene-container.scene-mode--detail .region--work_surface` + bench.css:107 + bench.css:86 | flex (column) | flex-end | flex-end | 1000px (l.329 in detail mode; overrides default 120px) | (none) | visible | grid uses single-row template `1fr` (bench.css:318); zoom card sized via `.footprint--zoom-view` 1200x800 (l.307-314) | 0 | aspect_distorted=1 | aspect_mismatch_card_vs_svg |

### 3.2 hood.css regions

`.region` in hood.css is line 86-97 (`display:flex; align-items:flex-start;
min-height:80px; border-bottom`). Critically, hood.css `.region--work_surface`
sets `max-height: 100%; overflow: hidden` at lines 110-111, and
`.placement` sets `max-height: 100%; overflow: hidden` at lines 157-158.
Bench.css does NOT do this (it explicitly removed those rules in
Round-3, per bench.css comment lines 105-107 and 152-155). Hood and
instrument scenes therefore clip on the placement and region levels;
bench scenes do not.

| scene | region | sel | disp | align | justify | min-h | max-h | overflow | parent_bbox @ 1920x1080 | child_bbox | fail_type | rc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hood_basic | rear_shelf | hood.css:100 `.region--rear_shelf` + hood.css:86 `.region` | flex (row, wrap l.101) | flex-start | (default) | 320px (l.103) | (none) | (default `visible`) | grid row 1 (not observed) | 0 | aspect_distorted=2 | aspect_mismatch_card_vs_svg |
| hood_basic | work_surface | hood.css:106 `.region--work_surface` + hood.css:86 | flex (column l.108) | flex-start | flex-end (l.112) | 120px (l.109) | 100% (l.110) | hidden (l.111) | grid row 2 (1fr) (not observed) | 0 (aspect distortion on `center_p1000_pipette` only, no clip/off) | aspect_distorted=1 | aspect_mismatch_card_vs_svg |

### 3.3 instrument.css regions

`.region` in instrument.css is lines 85-96 (`display:flex;
align-items:flex-start; min-height:80px`). `.region--work_surface`
again sets `max-height:100%; overflow:hidden` (lines 109-110).
`.region--instrument_station` is lines 121-126 (`flex-wrap:nowrap;
min-height:150px; justify-content:flex-start`). The two failing
instrument-scenes both push the instrument card to y=1174 (well below
1080), so the failure is region position, not region overflow.

| scene | region | sel | disp | align | justify | min-h | max-h | overflow | parent_bbox @ 1920x1080 | child_bbox | fail_type | rc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cell_counter_basic | instrument_station | instrument.css:121 `.region--instrument_station` + instrument.css:85 `.region` | flex (row, nowrap) | flex-start | flex-start (l.124) | 150px (l.123) | (none) | (default `visible`) | grid row 4 (declared 150px); observed via placement `instrument_main_cell_counter` y=1174 (200px below 1080 viewport bottom; child is at y=1190 by visible_bbox) | 1 placement, child h=125 but img y=1190 | off_page=1, clipped_by_parent=1, aspect_distorted=1 | region_pushed_below_viewport |
| microscope_basic | instrument_station | instrument.css:121 + instrument.css:85 | flex (row, nowrap) | flex-start | flex-start | 150px | (none) | visible | grid row 4; observed via placement `instrument_main_microscope` y=1174 (microscope img clipped by 298px) | 1 placement, child h=125 (clip 298px) | off_page=1, clipped_by_parent=1 | region_pushed_below_viewport |

### 3.4 Shared rule citations

The same selectors apply to every (scene, region) row above. Where a
finding is attributed to a region selector, the actual rendered geometry
comes from the cascade summarized here:

- `.scene-container` (bench.css:62-74, hood.css:62-74,
  instrument.css:62-74): identical in all three files except for
  background. `display: grid; grid-template-columns: 1fr;
  grid-template-rows: 100px 1fr 100px 150px 0px; width: 1920px;
  height: 1080px; overflow: auto`.
- `.region` shared block (bench.css:86, hood.css:86, instrument.css:85):
  `display: flex; flex-direction: row; gap: var(--gap-object); padding:
  12px; min-height: 80px; border-bottom: 1px solid rgba(...)`. Critical
  divergence between bench and the other two: bench.css uses
  `align-items: flex-end` (l.94), hood and instrument use
  `align-items: flex-start` (hood.css:95, instrument.css:94).
- `.placement` divergence between bench and the other two: bench.css
  lines 156-163 explicitly set `overflow: visible` and DO NOT set
  `max-height` (Round-3 hybrid documented in source). hood.css lines
  152-160 and instrument.css lines 151-159 set `overflow: hidden;
  max-height: 100%`. This is the dominant reason hood_basic does not
  show any `off_page` or `clipped_by_parent` HARD_FAIL (placement clip
  hides the symptom inside the placement card), whereas bench scenes do
  show those HARD_FAILs (bench placements do not self-clip).
- `.object-graphic img` (bench.css:349-358, hood.css:277-286,
  instrument.css:276-285): `object-fit: contain; max-width:100%;
  max-height:100%`. This preserves SVG aspect inside the
  `object-graphic` box but does not change the box's own aspect; aspect
  failures originate from `.footprint--*` rules that set per-card
  min/max width/height with mismatched ratio against the natural SVG
  aspect.

## 4. Root-cause class summary

Mapping per (scene, region) pair into the closed set named in the
brief. Counts are individual HARD_FAIL findings (not pair count).

| root_cause_class | count | examples |
| --- | --- | --- |
| aspect_mismatch_card_vs_svg | 29 | all rear_shelf / work_surface rows where the only HARD_FAILs are aspect_distorted; concentrated on glassware (`.footprint--handheld` 90x238 vs natural 54x150) and pipette / tip_box footprints across bench, hood, and instrument scenes |
| region_too_tall_for_viewport | 28 | 4 region_overflow + the 24 individual off/clip/aspect HARD_FAILs that sit inside the four overflowing regions (crowded_bench_dense work_surface, crowded_bench_dense front_tools, electrophoresis_bench front_tools, staining_bench front_tools) |
| placement_taller_than_region | 25 | front_tools rows in bench_basic, drug_dilution_plate_workspace, drug_dilution_workspace_dense (no region_overflow flag fired but individual placements still overflowed the viewport bottom); electrophoresis_bench work_surface (tank placement at y=-217) |
| region_pushed_below_viewport | 5 | cell_counter_basic instrument_station (1 off + 1 clip + 1 aspect) and microscope_basic instrument_station (1 off + 1 clip) -- the row 4 grid track is forced below y=1080 because rear_shelf min-h:320 + work_surface 1fr + front_tools min-h:260 already consume the budget |

The 38 aspect_distorted findings split: 29 are "pure" aspect (the
region only has aspect_distorted) and 9 are aspect_distorted findings
on placements that also have an off-page or clip finding in the same
region. The 9 co-resident aspect findings are counted under the
overflow/pushed root cause classes above, not double-counted as aspect.
The svg_label_overlap=3 findings sit inside
electrophoresis_bench work_surface (counted under
placement_taller_than_region for that row).

Total findings classified: 29 + 28 + 25 + 5 = 87 (= total HARD_FAIL
records observed).

## 5. Selector chain notes

How rules cascade for each failing region. All region rules live in
exactly one stylesheet per scene (bench.css, hood.css, or
instrument.css) and the scene-container class is what selects the
stylesheet (via `<link>`); there are no cross-stylesheet conflicts
inside a single scene.

- The bench scene class chain (`scene-container scene--bench`) and the
  drug-dilution variant (`scene-container scene--bench scene--drug-dilution`)
  both resolve to bench.css. There is no `.scene--drug-dilution`
  selector defined in bench.css, so drug-dilution scenes inherit every
  property unchanged from `.scene--bench`. The class chain difference
  is currently inert in the cascade.
- The composition vs template difference is encoded only by
  `data-scene-mode` and `data-scene-density` attributes, which the
  current CSS uses only via the `.scene-container[data-scene-density="crowded"]`
  density modifier (bench.css:250-304). That selector shrinks
  `.footprint--*` min/max sizes for `.scene--bench` only. Hood and
  instrument do not implement a density modifier; if a hood or
  instrument template ever sets `data-scene-density="crowded"`, the
  density rules will not apply.
- The zoom mode `.scene-container.scene-mode--detail` (bench.css:317-331)
  swaps grid-template-rows to `1fr` and hides three of the four
  non-popup regions. It is bench-only by reach; hood.css:244-258 and
  instrument.css:243-257 define the same swap but no hood or
  instrument template uses scene-mode--detail.
- The shared `.region` selector is defined three times, once per
  stylesheet. Bench's `.region` uses `align-items: flex-end`; hood and
  instrument use `align-items: flex-start`. This means children of a
  bench front_tools row anchor to the row's bottom edge, while children
  of a hood or instrument front_tools row anchor to the row's top edge.
  In practice the row 3 grid track is itself near the viewport bottom,
  so this difference matters only for tall multi-row wrap cases (which
  is the dense bench compositions).
- `.placement` is defined three times. Bench (lines 156-163) is the
  Round-3 hybrid (`overflow: visible`, no max-height). Hood (lines
  152-160) and instrument (lines 151-159) still carry the older
  `overflow: hidden; max-height: 100%` rule. This rule moves the clip
  point INSIDE the placement card and silently hides the symptom that
  bench's `clipped_by_parent` precheck catches at the
  `.scene-container` parent. This is why hood_basic shows 0 off_page
  and 0 clipped_by_parent HARD_FAILs even though the central
  `center_p1000_pipette` card (48x73) is far smaller than the natural
  pipette SVG (17x150).
- `.footprint--*` rules are repeated in each of bench.css, hood.css,
  and instrument.css. Bench's rules are namespaced under `.scene--bench`
  (bench.css:190-247) and additionally scoped under `[data-scene-density="crowded"]`
  for crowded compositions (bench.css:250-304). Hood (lines 184-232)
  and instrument (lines 183-231) define the same footprints at module
  scope without a `.scene--hood` / `.scene--instrument` prefix, so the
  rules apply globally to any placement inside a hood or instrument
  scene-container. No conflict, but the asymmetry means a future
  density variant would behave differently across the three scene
  classes.

Top three selectors by HARD_FAIL count attributable to the row they
govern:

| rank | selector (file:line) | findings |
| --- | --- | --- |
| 1 | `.region--front_tools` (bench.css:116-119) | 45 (across bench_basic, crowded_bench_dense, drug_dilution_plate_workspace, drug_dilution_workspace_dense, electrophoresis_bench, staining_bench) |
| 2 | `.region--rear_shelf` (bench.css:99-103) | 18 (crowded_bench_dense=6, drug_dilution_plate_workspace=2, drug_dilution_workspace_dense=5, electrophoresis_bench=2, staining_bench=3) |
| 3 | `.region--work_surface` (bench.css:107-113) | 16 (every bench scene with a work_surface failure; includes the 1px work_surface region_overflow in crowded_bench_dense at scroll_h=121 vs h=120) |

Hood and instrument together account for 8 findings (hood
`.region--rear_shelf` 2 + hood `.region--work_surface` 1 +
instrument `.region--instrument_station` 5). The bench stylesheet is
the dominant blast radius.

## 6. Recommendation: trial mapping per root cause class

These mappings are advisory. The audit is read-only and does not apply
changes. The trial labels (M1b / M1c / M1d) follow the manager's
in-flight CSS trials.

- `region_too_tall_for_viewport` (28 findings, all in
  `.region--front_tools`, plus the 1px work_surface case): addressable
  by M1b "front_tools bottom anchor" type fix, which is the family of
  edits that already exists at
  [m0_m1b_front_tools_bottom_anchor_delta.md](m0_m1b_front_tools_bottom_anchor_delta.md).
  The fix surface is the front_tools min-height budget plus an anchor
  rule that keeps front_tools above the viewport bottom edge. A
  structural rewrite that switches `.scene-container` from `grid-template-rows: 100px 1fr 100px 150px 0px`
  to a constraint that pins row 3 against the viewport bottom would
  also work but is more invasive than M1b.
- `placement_taller_than_region` (25 findings; bench_basic
  front_tools, drug_dilution_* front_tools, electrophoresis_bench
  work_surface where the tank card escapes upward): same M1b surface
  for the front_tools cases; the electrophoresis tank case is unique
  and needs a separate per-card fix (either reduce
  `.footprint--container` max-height for tank or anchor the
  work_surface column on flex-end at the SVG height, not the card
  height). Probably M1d or combo.
- `aspect_mismatch_card_vs_svg` (29 findings): addressable by M1c
  "per-asset card resizing" type fix -- adjust `.footprint--handheld`
  / `.footprint--container` / `.footprint--rack` / `.footprint--small-tool`
  width:height ratios per asset group. The 5.16% glassware cluster
  needs a 1-2px width adjustment; the 15-480% pipette and rack
  distortions need a more substantial aspect-respecting rule
  (probably new dedicated footprints per asset or a `aspect-ratio:
  natural` mechanism). M1c plus per-asset rules.
- `region_pushed_below_viewport` (5 findings; both instrument
  template scenes): not addressed by any of M1b/M1c/M1d as named.
  Needs a structural rewrite of the `.scene-container` grid template
  for `.scene--instrument` so the `instrument_station` row tracks
  against viewport bottom (or above), not after a chain of expanding
  flex rows. Suggest a small targeted fix to `instrument.css` grid
  template (or convert row 4 from auto-flow to absolute-anchored).
- `svg_label_overlap` (3 findings in electrophoresis_bench): not a CSS
  region geometry issue; it is a label-positioning problem inside the
  scene work_surface column. Out of scope for M1b/M1c/M1d. Likely
  needs label_above / label_below variants in the placement labels
  schema.

Summary mapping table:

| root_cause_class | recommended trial | rationale |
| --- | --- | --- |
| region_too_tall_for_viewport | M1b | fix the front_tools row budget at the source |
| placement_taller_than_region | M1b (front_tools) + M1d / per-card (electrophoresis tank) | most are co-located with overflow; tank needs a per-card cap |
| aspect_mismatch_card_vs_svg | M1c (per-asset card resizing) | each footprint group has a natural aspect that the current `.footprint--*` rules ignore |
| region_pushed_below_viewport | structural-rewrite of `instrument.css` grid | not in M1b/M1c/M1d set as named |
| (svg_label_overlap) | out of scope for M1 CSS trials | label authoring layer, not CSS region geometry |

## 7. Open questions for manager

- Should the `front_tools` budget be enforced by CSS (clip to 260px,
  fail loudly) or by content authoring (limit card count and card
  height per placement)? M1b can pick either side but the choice
  changes whether tall front-row equipment (microwave, shaker, tank
  cassette) belongs in front_tools at all.
- Bench.css explicitly REMOVED `.placement { overflow:hidden;
  max-height:100% }` in Round 3 (per source comment) so that
  off_page/clip detection works at the scene-container level. Hood and
  instrument still carry the older rules. Should hood.css and
  instrument.css be normalized to the bench Round-3 hybrid (making
  hood / instrument symptoms visible to the precheck) before M1b is
  finalized? Today the two instrument scenes' instrument_station
  failures show up despite the rule (because the placement itself is
  positioned below viewport, not just oversized), but a future hood
  composition with similar overflow would be masked.
- The drug-dilution variant adds the class `.scene--drug-dilution` but
  no CSS rule references that class. Is the class intentional (future
  use) or stale (should be removed)? If it is intentional, M1 may need
  to define overrides at that selector.
- The four-region template `drug_dilution_plate_workspace` (no
  `instrument_station` region) does not show the
  `region_pushed_below_viewport` symptom even though its grid still
  declares 5 rows; the missing region's row track collapses to
  effectively 0. Should the template author also drop the trailing
  unused row from `grid-template-rows`, or should the CSS adapt? This
  is currently a benign inconsistency.
- Aspect tolerance is 5% in precheck (per natural_vs_rendered logic).
  The glassware cluster sits at 5.16% -- one tolerance bump to ~6%
  retires 13 of 29 aspect findings without a CSS edit. Is the
  tolerance the right value, or are the cards genuinely 5%
  off-natural? Lane M flagged the same question in
  [m0_static_failed_scenes.md](m0_static_failed_scenes.md) section 7.
- Should the `scene-container[data-scene-density="crowded"]` density
  rules in bench.css be lifted to hood.css and instrument.css as well,
  or is "crowded" intentionally bench-only?

## 8. Files read

- `experiments/css_native_layout/styles/bench.css`
- `experiments/css_native_layout/styles/hood.css`
- `experiments/css_native_layout/styles/instrument.css`
- `experiments/css_native_layout/templates/bench_basic.html`
- `experiments/css_native_layout/templates/cell_counter_basic.html`
- `experiments/css_native_layout/templates/crowded_bench_dense.html`
- `experiments/css_native_layout/templates/drug_dilution_plate_workspace.html`
- `experiments/css_native_layout/templates/drug_dilution_workspace_dense.html`
- `experiments/css_native_layout/templates/electrophoresis_bench.html`
- `experiments/css_native_layout/templates/hood_basic.html`
- `experiments/css_native_layout/templates/microscope_basic.html`
- `experiments/css_native_layout/templates/staining_bench.html`
- `experiments/css_native_layout/templates/well_plate_96_zoom.html`
- `test-results/m0_static_summary/precheck/visual_audit.json`
- `test-results/m0_static_summary/precheck/sizing_manifest.json`
- docs/active_plans/reports/m0_static_failed_scenes.md
- docs/active_plans/reports/m0_static_visual_summary.md
