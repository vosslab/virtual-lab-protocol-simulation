# M0 static failed scenes: per-scene root-cause analysis

Lane M failed-scenes investigation for the layout-manager-clean-start manager.
Documentation-only, static evidence. No code, CSS, HTML, SVG, JS, or YAML is
modified by this report. Recommended fixes are surfaced but not applied.

## 1. Methodology

- Input artifacts (all under `test-results/m0_static_summary/precheck/`):
  - `visual_audit.json` (3843 lines): authoritative per-scene precheck output.
  - `visual_audit.md` (482 lines): human-readable summary of the same run.
  - `HARD_FAIL_TABLE.md` (62 lines): aggregate hard-fail column table.
  - `sizing_manifest.json`: natural and rendered sizes per placement.
  - 10 per-scene PNGs at 1920x1080.
- Viewport: 1920x1080 (per Lane K, this is the best viewport).
- Scene-container bbox per scene: x=0 y=0 w=1920 h=1080 (full viewport).
- For each scene the report names the failing placements by their
  `data-object-name` (the value of `placement_name` in `visual_audit.json`)
  so each finding maps to a single addressable scene object.
- "Hard fail" includes `clipped_artwork`, `off_page`, `svg_svg_overlap`,
  `region_overflow`, `svg_label_overlap`, `label_label_overlap`,
  `artwork_integrity.clipped_by_parent`, and
  `artwork_integrity.aspect_distorted` entries whose severity is
  `HARD_FAIL`. The column set in `HARD_FAIL_TABLE.md` is a subset; the
  full hard-fail count below includes artwork-integrity hard fails.
- This report cross-references Lane A precheck, Lane K viewport sweep,
  and Lane D asset audit (WRONG_ASSET and PLACEHOLDER findings).
- Read-only on all other artifacts. No CHANGELOG edit. No commit.

## 2. Aggregate table

Counts below merge `HARD_FAIL_TABLE.md` columns with the
`artwork_integrity` hard-fail entries from `visual_audit.json`. Column
"clip" = `clipped_by_parent` HARD_FAIL count. Column "aspect" =
`aspect_distorted` HARD_FAIL count. Column "off" = `off_page` count.
Column "regn" = `region_overflow` count. Column "svglbl" =
`svg_label_overlap` count. Column "place" = placeholder asset hits.
Column "total HF" = sum of `off`, `regn`, `svglbl`, `clip`, `aspect`.

| scene_name | class | off | regn | svglbl | clip | aspect | place | total HF | top-1 root cause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | template | 1 | 0 | 0 | 1 | 2 | 0 | 4 | front_tools placement clipped past viewport bottom |
| cell_counter_basic | template | 1 | 0 | 0 | 1 | 1 | 0 | 3 | instrument_station card too short; instrument clipped |
| crowded_bench_dense | composition | 3 | 2 | 0 | 3 | 6 | 0 | 14 | front_tools row overflows viewport bottom |
| drug_dilution_plate_workspace | composition | 2 | 0 | 0 | 2 | 6 | 1 | 11 | front_tools row clipped past viewport bottom |
| drug_dilution_workspace_dense | composition | 4 | 0 | 0 | 4 | 10 | 1 | 19 | front_tools row clipped; rack and tip aspect distortion |
| electrophoresis_bench | composition | 7 | 1 | 3 | 7 | 6 | 0 | 24 | tank overflows top; front_tools row overflows bottom |
| hood_basic | template | 0 | 0 | 0 | 0 | 3 | 0 | 3 | p1000_pipette aspect ratio 480% distorted |
| microscope_basic | template | 1 | 0 | 0 | 1 | 0 | 0 | 2 | instrument_station card too short; microscope clipped |
| staining_bench | composition | 2 | 1 | 0 | 2 | 3 | 0 | 8 | front_tools row clipped past viewport bottom |
| well_plate_96_zoom | composition | 0 | 0 | 0 | 0 | 1 | 0 | 1 | zoom asset stretched beyond 5% aspect tolerance |

Totals: off=21, regn=4, svglbl=3, clip=21, aspect=38, total HF=89.

Worst scene: `electrophoresis_bench` (total HF=24).
Best scene: `well_plate_96_zoom` (total HF=1).

## 3. Per-scene root-cause sections

### 3.1 bench_basic

- Scene class: template (per `scene_class_manifest.yaml`).
- Verdict: FAIL.
- Hard-fail counts: off=1, regn=0, svglbl=0, clip=1, aspect=2.
- PNG: `test-results/m0_static_summary/precheck/bench_basic.png`.
- JSON section: `scenes[0]` in `visual_audit.json`.

Findings:

- `off_page`: placement `right_tool_p200_micropipette`
  (object `p200_micropipette`) at x=28 y=924 w=50 h=213; corners
  bottom-left and bottom-right are out of viewport. The placement
  starts at y=924 and extends to y=1137, 57px past the 1080 viewport
  bottom.
- `clipped_by_parent` HARD_FAIL: same placement, clipped by
  `DIV.scene-container.scene--bench` on the bottom by 31px.
- `aspect_distorted` HARD_FAIL: two entries.
  - `center_well_plate` (well_plate_96) distorted 5.34% (plate group,
    tolerance 5%): natural 1.41 vs rendered 1.33.
  - `right_tool_p200_micropipette` (p200_micropipette) distorted 15.6%
    (pipette group): natural 0.23 vs rendered 0.26.

Top root cause: `right_tool_p200_micropipette` sits in the `front_tools`
region whose bottom edge falls past viewport h=1080, so the pipette
SVG is clipped at the scene-container bottom.

Recommended fix surface (do NOT apply):

- Move `right_tool_p200_micropipette` higher in `front_tools` or shrink
  its `display_width_cm` so its rendered height is under ~150px.
- Pipette aspect distortion comes from rendered card 50x191 vs natural
  34x150. The card height should match the asset aspect (50 * 150/34
  approx 220px) rather than 191px; or the SVG width should drop to 43px
  to fit the 191px card while preserving aspect.
- Plate aspect distortion is borderline (5.34% vs 5% tolerance);
  raising rendered width by ~2px (320 to 322) brings it under tolerance.

### 3.2 cell_counter_basic

- Scene class: template.
- Verdict: FAIL.
- Hard-fail counts: off=1, regn=0, svglbl=0, clip=1, aspect=1.
- PNG: `test-results/m0_static_summary/precheck/cell_counter_basic.png`.
- JSON section: `scenes[1]` in `visual_audit.json`.

Findings:

- `off_page`: placement `instrument_main_cell_counter`
  (object `cell_counter`) at x=28 y=1174 w=160 h=125; ALL four corners
  out of viewport, center out=true. The whole placement renders below
  y=1174, beyond the 1080 viewport bottom.
- `clipped_by_parent` HARD_FAIL: same placement clipped on the bottom by
  217.78px.
- `aspect_distorted` HARD_FAIL: `instrument_main_cell_counter` (instrument
  group) distorted 19.1%: natural 1.41 vs rendered 1.14.
- `region_whitespace` flagged on `instrument_station` (92.9% empty) and
  `front_tools` (98.2% empty).

Top root cause: `instrument_station` region (or the instrument card
inside it) is laid out below the viewport at y=1174. This is a region
position bug, not a placement-position bug.

Recommended fix surface:

- Re-locate `instrument_station` region for `template` scenes so its
  vertical range fits within 0..1080.
- Card height (140) is shorter than natural-aspect height (160 * 1.41 =
  225 for natural-width 160). Either widen the card or shrink to
  preserve aspect.

### 3.3 crowded_bench_dense

- Scene class: dense_clutter (composition mode).
- Verdict: FAIL.
- Hard-fail counts: off=3, regn=2, svglbl=0, clip=3, aspect=6.
- PNG: `test-results/m0_static_summary/precheck/crowded_bench_dense.png`.
- JSON section: `scenes[2]` in `visual_audit.json`.

Findings:

- `off_page` (3):
  - `front_microwave` (microwave) at x=28 y=942 w=220 h=242: bottom corners out.
  - `front_rocking_shaker` (rocking_shaker) at x=258 y=902 w=220 h=282: bottom corners out.
  - `front_waste_container` (waste_container) at x=488 y=1018 w=90 h=166: bottom corners out, center out.
- `region_overflow` (2):
  - `work_surface` region (x=16 y=758 w=1888 h=120) overflows h by 1px.
  - `front_tools` region (x=16 y=890 w=1888 h=260) overflows h by 34px;
    region extends to y=1150 but viewport ends at y=1080.
- `clipped_by_parent` HARD_FAIL (3): same three placements clipped on
  the bottom by 78px each.
- `aspect_distorted` HARD_FAIL (6, glassware group, all 5.16% delta):
  `rear_coomassie_stain`, `rear_destain`, `rear_coomassie_recycle`,
  `rear_destain_waste`, `rear_laemmli_buffer`, `rear_bme_bottle`.
- `primary_object`: `center_staining_tray` ratio 3.4% (threshold 25%) flag.

Top root cause: `front_tools` region scrolls to 294px but the layout
budget is 260px; combined with region top at y=890 the region extends
to y=1184, 104px below viewport. The microwave, shaker, and waste
container all bottom-clip there.

Recommended fix surface:

- Reduce `front_tools` placement card heights so the region fits inside
  its declared 260px budget at 1920x1080.
- Move tall front-row equipment (microwave, rocking_shaker) into
  `work_surface` or `instrument_station` rather than `front_tools`.
- Glassware aspect distortion is a uniform 5.16% across all bottle
  variants; raising rendered width by ~1px brings the group under the
  5% tolerance (this is a per-card width adjustment, not an SVG swap).
- Primary-object ratio 3.4% well below 25% threshold: the
  `staining_tray` card is sized too small relative to surrounding
  supporting objects for a composition scene.

### 3.4 drug_dilution_plate_workspace

- Scene class: composition.
- Verdict: FAIL.
- Hard-fail counts: off=2, regn=0, svglbl=0, clip=2, aspect=6.
- PNG: `test-results/m0_static_summary/precheck/drug_dilution_plate_workspace.png`.
- JSON section: `scenes[3]` in `visual_audit.json`.

Findings:

- `off_page` (2):
  - `tool_p200` (p200_micropipette) at x=28 y=924 w=50 h=213: bottom corners out.
  - `waste_container` (waste_container) at x=88 y=971 w=90 h=166: bottom corners out.
- `clipped_by_parent` HARD_FAIL (2): same two placements clipped 31px on bottom.
- `aspect_distorted` HARD_FAIL (6):
  - `rear_dmso_bottle`, `rear_drug_bottle` (stock_bottle, glassware): 5.16%.
  - `center_well_plate` (well_plate_96, plate): 5.34%.
  - `work_sample_rack` (tube_rack_24, glassware): 12.5%.
  - `tool_tips` (tip_box, pipette): 45.65% (natural 1.53, rendered 0.83).
  - `tool_p200` (p200_micropipette, pipette): 15.6%.
- Placeholder reference: per Lane D, `microtube_rack_24_placeholder.svg`
  appears in this template (1 hit).
- `primary_object`: `center_well_plate` ratio 4% (threshold 25%) flag.

Top root cause: front-row `tool_p200` and `waste_container` cards sit
in `front_tools` which extends below y=1080; both clip on bottom.
Secondary: `tool_tips` card aspect ratio is 45.65% wrong (a tip_box is
1.53 wide x 1 tall in natural form but rendered 0.83, i.e., card is
tall instead of wide).

Recommended fix surface:

- Same `front_tools` budget fix as crowded_bench_dense.
- For `tool_tips`: rotate or relayout the card to be landscape rather
  than portrait so the 230x150 natural SVG renders without aspect crush.
- Replace `microtube_rack_24_placeholder.svg` with a real SVG (Lane D
  placeholder leak; one of two repo-wide).

### 3.5 drug_dilution_workspace_dense

- Scene class: dense_clutter (composition).
- Verdict: FAIL.
- Hard-fail counts: off=4, regn=0, svglbl=0, clip=4, aspect=10.
- PNG: `test-results/m0_static_summary/precheck/drug_dilution_workspace_dense.png`.
- JSON section: `scenes[4]` in `visual_audit.json`.

Findings:

- `off_page` (4): `tool_p200_micropipette`, `tool_tip_box`,
  `waste_container_main`, `waste_tray_secondary`. All four bottom-clip;
  `tool_tip_box` also has center_out=true (placement at y=1055..1137
  is mostly below 1080).
- `clipped_by_parent` HARD_FAIL (4): same four placements; clip amounts
  9px, 18px, 31px, 31px on bottom.
- `aspect_distorted` HARD_FAIL (10): five stock_bottle variants
  (5.16%), `rear_ethanol_bottle` (5.28%), `center_well_plate` (5.34%),
  `work_sample_rack_1` (45.31%), `work_sample_rack_2` (12.5%),
  `tool_p200_micropipette` (15.6%), `tool_tip_box` (45.65%).
- Placeholder reference: same `microtube_rack_24_placeholder.svg` leak.
- `primary_object`: `center_well_plate` ratio 4% (threshold 25%) flag.

Top root cause: front_tools row contains four tool cards that all
clip below 1080; tube_rack and tip_box cards have catastrophic aspect
distortion because they were sized into 140x160 cards regardless of
their natural 240x150 (rack_1) or 230x150 (tip_box) aspect.

Recommended fix surface:

- Same `front_tools` budget reduction.
- Resize rack and tip_box cards to match their natural landscape aspect
  ratio (~1.5+ wide:tall), not square or portrait.
- Replace `microtube_rack_24_placeholder.svg` with the canonical SVG.

### 3.6 electrophoresis_bench

- Scene class: instrument_heavy (composition).
- Verdict: FAIL (worst scene overall).
- Hard-fail counts: off=7, regn=1, svglbl=3, clip=7, aspect=6.
- PNG: `test-results/m0_static_summary/precheck/electrophoresis_bench.png`.
- JSON section: `scenes[5]` in `visual_audit.json`.

Findings:

- `off_page` (7):
  - `center_electrophoresis_tank` at x=1532 y=-217 w=360 h=320: top
    corners out, center out=true. Tank is positioned ABOVE the
    viewport (y=-217), the only off-top failure across all 10 scenes.
  - `right_tool_area_p200_micropipette` at x=28 y=948 w=73 h=222.
  - `right_tool_area_p10_gel_loading_tip_box` at x=111 y=1088 w=66 h=82.
  - `rear_left_protein_ladder_tube` at x=187 y=1019 w=83 h=151.
  - `rear_right_gel_opening_tool` at x=280 y=1068 w=97 h=102.
  - `front_left_mini_protean_gel` at x=387 y=902 w=220 h=268.
  - `front_right_gel_comb` at x=617 y=1086 w=56 h=84.
  - Five of the seven center_out=true.
- `region_overflow` (1): `front_tools` overflows h by 40px (scroll 300
  vs budget 260). Largest front_tools overflow of any scene.
- `svg_label_overlap` (3):
  - SVG `center_gel_cassette` overlaps label of `center_electrophoresis_tank` (overlap area 2850).
  - SVG `center_electrode_module` overlaps label of `center_gel_cassette` (299).
  - SVG `center_serological_pipette` overlaps label of `center_electrode_module` (552).
- `clipped_by_parent` HARD_FAIL (7): tank clipped on TOP by 171px;
  the other six placements clipped on BOTTOM by 56 to 110px.
- `aspect_distorted` HARD_FAIL (6): including the catastrophic
  `center_serological_pipette` at 252.94% delta (natural 0.11 vs
  rendered 0.40), `right_tool_area_p200_micropipette` at 61.7%,
  `right_tool_area_p10_gel_loading_tip_box` at 28.6%,
  `center_electrophoresis_tank` at 26.6%, plus glassware entries.
- `primary_object`: `center_electrophoresis_tank` ratio 5.6% (threshold 25%).

Top root cause(s):

1. `center_electrophoresis_tank` is positioned at y=-217: either the
   tank card is taller than its placement region OR the region origin
   is wrong. The tank is the primary object (per data-primary) yet
   only 5.6% of the scene by area.
2. `front_tools` row has six different tool placements stacked into a
   260px-tall region; cards reach y=1170, 90px past viewport.
3. `center_serological_pipette` has the worst aspect distortion in the
   whole audit (253%): a thin 17x150 natural SVG rendered into an 80x200
   card.
4. Three SVG-label overlaps in the center cluster: instrumentation,
   cassette, electrode, and pipette labels overlap each other.

Recommended fix surface:

- Move the tank card so its top edge is at y>=0; either grow the
  surrounding region or position the tank lower.
- Reduce front_tools card heights or split front_tools into two
  vertically-stacked regions.
- Resize `center_serological_pipette` card to a thin column matching
  the natural 17x150 aspect rather than a wide 80x200 box.
- Reflow center cluster labels so cassette label does not sit under
  the tank label, electrode does not sit under cassette, and pipette
  does not sit under electrode (i.e., label_below for the front item
  and label_above for the rear item, or use a vertical offset bump).

### 3.7 hood_basic

- Scene class: template.
- Verdict: FAIL.
- Hard-fail counts: off=0, regn=0, svglbl=0, clip=0, aspect=3.
- PNG: `test-results/m0_static_summary/precheck/hood_basic.png`.
- JSON section: `scenes[6]` in `visual_audit.json`.

Findings:

- All scene-composition columns in `HARD_FAIL_TABLE.md` are zero. The
  scene still verdicts FAIL because of three `aspect_distorted`
  HARD_FAIL entries:
  - `rear_left_ethanol_bottle` (ethanol_bottle, glassware) 5.94%.
  - `rear_center_ddh2o_spray` (ddh2o_spray_bottle, glassware) 7.82%.
  - `center_p1000_pipette` (p1000_pipette, pipette) 480.18%.
- The p1000_pipette distortion is the WORST aspect mismatch in the
  whole audit (natural 0.11, rendered 0.66): a thin 17x150 column
  rendered into a 48x73 box, i.e., crushed to ~half height and
  widened to nearly square.
- `region_whitespace` flagged: rear_shelf (94.4% empty),
  work_surface (98% empty). Scene whitespace 98.1%.

Top root cause: `center_p1000_pipette` card is sized 48x73 instead of
the natural ~17x150 column. The card is roughly correct width (48 vs
natural 17 implies ~3x oversize) but VASTLY too short. Pipette assets
must render tall.

Recommended fix surface:

- Resize the `center_p1000_pipette` card to a tall column of at least
  150px height with width set by aspect (~17 if width is the
  constraint, or grow width and height proportionally).
- Ethanol and spray bottle aspect distortion is borderline; raise
  rendered width by 1-2px to clear the 5% tolerance.
- Hood scene has heavy whitespace (98%); consider whether
  `rear_shelf` should hold more bottles than the two it currently has.

### 3.8 microscope_basic

- Scene class: instrument_heavy (template mode).
- Verdict: FAIL.
- Hard-fail counts: off=1, regn=0, svglbl=0, clip=1, aspect=0.
- PNG: `test-results/m0_static_summary/precheck/microscope_basic.png`.
- JSON section: `scenes[7]` in `visual_audit.json`.

Findings:

- `off_page`: `instrument_main_microscope` (microscope) at x=28 y=1174
  w=160 h=125: all four corners out, center out=true. Same shape as
  cell_counter_basic.
- `clipped_by_parent` HARD_FAIL: same placement clipped on bottom by
  298.16px.
- Aspect-distorted HARD_FAIL: zero (the microscope SVG renders only
  1.1% off natural aspect; the only artwork_integrity HARD_FAIL is the
  clipping, not the aspect).
- Lane D WRONG_ASSET note: this template references
  `centrifuge_new.svg` for the `microscope` object. This is a wrong
  asset reference (a centrifuge SVG used to render a microscope card).
- `region_whitespace` flagged: instrument_station (92.9% empty).

Top root cause: `instrument_station` region (or the microscope card
inside it) is positioned at y=1174, well below viewport h=1080. Same
template-mode region-position bug as cell_counter_basic.

Recommended fix surface:

- Re-position `instrument_station` so its vertical range fits inside
  0..1080.
- Swap the asset reference from `centrifuge_new.svg` back to the
  canonical microscope SVG (Lane D WRONG_ASSET fix).

### 3.9 staining_bench

- Scene class: composition.
- Verdict: FAIL.
- Hard-fail counts: off=2, regn=1, svglbl=0, clip=2, aspect=3.
- PNG: `test-results/m0_static_summary/precheck/staining_bench.png`.
- JSON section: `scenes[8]` in `visual_audit.json`.

Findings:

- `off_page` (2):
  - `right_tool_area_microwave` (microwave) at x=28 y=942 w=220 h=242: bottom corners out.
  - `right_tool_area_rocking_shaker` (rocking_shaker) at x=258 y=902 w=220 h=282: bottom corners out.
- `region_overflow` (1): `front_tools` overflows h by 34px (scroll 294 vs budget 260).
- `clipped_by_parent` HARD_FAIL (2): same two placements clipped 78px on bottom.
- `aspect_distorted` HARD_FAIL (3): `rear_center_destain` (5.16%),
  `rear_left_coomassie_recycle` (17.1%), `rear_center_destain_waste` (5.16%).
- `primary_object`: `center_staining_tray` ratio 3.4% (threshold 25%) flag.

Top root cause: same `front_tools` budget overflow shared with
`crowded_bench_dense`. The microwave (220x242) and rocking_shaker
(220x282) exceed the 260px front_tools region height.

Recommended fix surface:

- Move microwave and rocking_shaker to `instrument_station` or
  enlarge the `front_tools` region budget.
- Fix `rear_left_coomassie_recycle` card width so the bottle renders
  at natural 0.36 aspect instead of 0.42 (17.1% distortion: a tall
  bottle squashed wider, likely because the card was 110x260 but the
  natural is 54x150).

### 3.10 well_plate_96_zoom

- Scene class: zoom_detail (composition).
- Verdict: FAIL.
- Hard-fail counts: off=0, regn=0, svglbl=0, clip=0, aspect=1.
- PNG: `test-results/m0_static_summary/precheck/well_plate_96_zoom.png`.
- JSON section: `scenes[9]` in `visual_audit.json`.

Findings:

- Only one hard-fail entry: `zoom_well_plate_96` (well_plate_96, plate
  group) aspect distorted 6.49%: natural 1.41 vs rendered 1.50. The
  plate is rendered 1200x800 (natural 393x279).
- `primary_object`: ratio 92% (well above 25% threshold) - the zoom
  scene correctly fills the viewport.
- Scene whitespace 8% (the only single-digit value across all 10
  scenes).
- No off-page, no region overflow, no label overlap, no clipped
  artwork. This scene is the closest to passing.

Top root cause: The zoom plate card is 1200x800 (aspect 1.50). The
natural plate is 1.41 wide:tall. The card is too wide for its height.

Recommended fix surface:

- Adjust the zoom plate card to 1200x852 (1200 / 1.41 = 851.06) or
  1126x800 to bring rendered aspect into 5% tolerance.
- No SVG, region, or label changes needed.

## 4. Cross-scene patterns

These are the recurring root causes across the 10-scene set.

### 4.1 front_tools region overflow (5 scenes)

The `front_tools` region (x=16 y=890 w=1888 h=260) extends to y=1150,
70px past viewport h=1080. Tool cards placed in this region routinely
clip on the bottom.

- Scenes affected: bench_basic (1 off), crowded_bench_dense (3 off + 2
  regions), drug_dilution_plate_workspace (2 off), drug_dilution_workspace_dense
  (4 off), electrophoresis_bench (7 off + 1 region overflow), staining_bench
  (2 off + 1 region).
- 17 of 21 total off_page entries come from front_tools cards.
- All clip on the bottom (clip_over_px.bottom > 0). No left/right/top
  clipping in this set.
- This is a single CSS region-height design bug, not 17 separate
  placement bugs.

### 4.2 instrument_station region position (2 scenes)

In `template` scenes, `instrument_station` places the main instrument
card at y=1174 (below viewport bottom y=1080).

- Scenes affected: cell_counter_basic, microscope_basic.
- Both scenes also show large `instrument_station` whitespace
  (92.9%) because the card that should fill it is positioned below
  the visible area.
- Single design bug: the template-mode `instrument_station` region
  origin is wrong.

### 4.3 Aspect distortion is repo-wide, not scene-local (9 of 10 scenes)

38 of 89 total hard fails are `aspect_distorted` HARD_FAIL entries.
Patterns:

- Glassware bottles cluster at 5.16% delta (just over the 5%
  tolerance). 13 entries across crowded_bench_dense,
  drug_dilution_plate_workspace, drug_dilution_workspace_dense,
  electrophoresis_bench, and staining_bench. Cause: 54x150 natural
  bottles are rendered into 90x238 cards instead of natural-aspect
  cards.
- Pipette and tip_box assets show catastrophic distortion (15% to
  480%). Affected: p200_micropipette (4 scenes), p1000_pipette (hood),
  tip_box (2 scenes), p10_gel_loading_tip_box (electrophoresis),
  serological_pipette (electrophoresis at 253%), gel_comb
  (electrophoresis). Cause: thin tall pipette SVGs squashed into
  near-square or short-wide cards.
- Well_plate_96 distorts 5.34% in three template/composition scenes
  (bench, drug_dilution_plate, drug_dilution_workspace) and 6.49% in
  the zoom scene. Cause: 393x279 natural rendered into 320x240 or
  1200x800.
- Most distortions are card-sizing bugs, not SVG-content bugs.

### 4.4 SVG-label overlap is concentrated in one scene

All 3 `svg_label_overlap` entries are in `electrophoresis_bench`,
specifically the center cluster (tank, cassette, electrode_module,
serological_pipette). No other scene has any label overlap.

### 4.5 Placeholder and wrong-asset leaks (Lane D corroboration)

- `microtube_rack_24_placeholder.svg` appears in
  `drug_dilution_plate_workspace.html` and
  `drug_dilution_workspace_dense.html` (2 hits, Lane D PLACEHOLDER list).
- `microscope_basic.html` references `centrifuge_new.svg` for the
  microscope object (Lane D WRONG_ASSET list, one of ~14 wrong-asset
  references repo-wide).

### 4.6 No off-top failures except one tank

Of 21 `off_page` entries, 20 clip on the bottom. The one exception is
`center_electrophoresis_tank` at y=-217 (clipped on top by 171px).
This is a region-position bug, not a region-height bug.

### 4.7 Primary-object ratio failure is composition-wide

Composition scenes (5 of 5: crowded_bench_dense,
drug_dilution_plate_workspace, drug_dilution_workspace_dense,
electrophoresis_bench, staining_bench) all report
`primary_object.ratio` between 3.4% and 5.6% against a 25% threshold.
The well_plate zoom scene clears at 92%. The four template-mode scenes
skip the check.

Single design issue: in composition scenes, the data-primary object
is not given enough visual weight relative to supporting items.

## 5. Recommended fix priority

Surfaces only; do not apply in this lane.

### 5.1 Easiest recoveries (single CSS rule, multi-scene impact)

1. Reduce `front_tools` region height OR move tall tool cards out of
   `front_tools`. Single CSS change recovers ~17 off_page entries and
   ~21 clipped_by_parent entries across 5 scenes (bench_basic,
   crowded_bench_dense, drug_dilution_plate_workspace,
   drug_dilution_workspace_dense, electrophoresis_bench, staining_bench).
2. Re-position `instrument_station` region for template-mode scenes
   so it fits within 0..1080. Recovers cell_counter_basic and
   microscope_basic clipping.
3. Adjust `well_plate_96` rendered card dimensions to preserve natural
   1.41 aspect ratio (1200x852 or 1126x800 for zoom; ~322x228 for the
   320x240 template cards). Recovers 4 plate aspect HARD_FAILs across
   bench_basic, drug_dilution_plate_workspace, drug_dilution_workspace_dense,
   well_plate_96_zoom.

### 5.2 Per-asset card resizing (deterministic, many small edits)

4. Resize pipette and tip_box cards in 4 scenes
   (drug_dilution_plate_workspace, drug_dilution_workspace_dense,
   electrophoresis_bench, hood_basic) so card aspect matches natural
   SVG aspect. Affects p1000_pipette (480% delta in hood),
   serological_pipette (253% in electrophoresis), p200_micropipette,
   p10_gel_loading_tip_box, tip_box.
5. Resize glassware bottle cards across composition scenes to match
   natural ~0.36 aspect; currently 90x238 cards push rendered aspect
   to 0.379 (5.16% over). Affects 13 bottle placements.
6. Resize `tube_rack_24` cards (drug_dilution_plate_workspace and
   drug_dilution_workspace_dense) to landscape aspect; currently
   140x160 portrait cards crush a 240x150 natural rack.

### 5.3 Per-scene targeted fixes

7. `electrophoresis_bench` tank repositioning: move
   `center_electrophoresis_tank` so y>=0 (currently y=-217).
8. `electrophoresis_bench` label reflow: address 3
   svg_label_overlap entries in the center cluster (cassette under
   tank label, electrode under cassette label, pipette under
   electrode label).
9. `drug_dilution_plate_workspace` and `drug_dilution_workspace_dense`
   placeholder swap: replace `microtube_rack_24_placeholder.svg` with
   the canonical SVG (Lane D placeholder leak).
10. `microscope_basic` asset swap: stop using `centrifuge_new.svg` for
    the microscope object (Lane D wrong-asset leak).

### 5.4 Pedagogy and composition (deeper review)

11. Primary-object ratio recovery in 5 composition scenes (ratios
    3.4% to 5.6% vs 25% threshold). Likely needs supporting-object
    count reduction or primary card growth; review whether the scene
    class manifest threshold of 25% is the right target for these
    composition scenes.
12. Scene whitespace > 95% in 4 scenes (bench_basic, cell_counter_basic,
    hood_basic, microscope_basic) - either reduce the scene-container
    to fit the content or add planned content.

### 5.5 Assets that may need authoring (longest lead time)

13. SVGs referenced as `*_placeholder.svg` need real assets authored.
14. Lane D WRONG_ASSET set (~14 references) needs each cross-mapped
    to the correct existing SVG or, if no correct SVG exists, the
    new asset authored. Only `microscope_basic` is in this 10-scene
    set; the other 13 wrong-asset references are outside the M0
    template surface.

## 6. Files read

- `test-results/m0_static_summary/precheck/visual_audit.json`
- `test-results/m0_static_summary/precheck/visual_audit.md`
- `test-results/m0_static_summary/precheck/HARD_FAIL_TABLE.md`
- `docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md`
  (sections 1-3 for context).

PNG references in section 3 are cited but not opened in this lane
(static evidence is derived from the JSON; the PNGs are visual
attachments for the next manager).

## 7. Open questions

- Is the `front_tools` 260px region budget itself wrong, or are the
  tool cards inside it oversized? The cleanest resolution depends on
  whether the layout engine is supposed to enforce the budget or the
  cards are supposed to size into it.
- For aspect_distorted at the 5% boundary (5.16% to 5.34% deltas),
  is the 5% tolerance correct, or should tolerance be raised slightly
  (e.g., to 6%) and only the genuinely-distorted entries flagged?
  Out-of-scope here; surface only.
- The `primary_object.ratio` of 3.4% to 5.6% in composition scenes is
  far below 25%. Is the threshold itself the issue, or are the scenes
  authored with too many supporting objects? Review needed.
- `instrument_station` region position in template-mode places its
  cards at y=1174. Is this a region origin bug in CSS, an experiment-
  template hand-author bug, or both? Source not investigated in this
  lane.
