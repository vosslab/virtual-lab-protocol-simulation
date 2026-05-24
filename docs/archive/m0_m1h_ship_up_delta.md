# M1h popup_layer ship-up delta (all three stylesheets)

STATIC EXPERIMENT EVIDENCE 2026-05-22 - M1h delta

This report records the M1h delta after applying the M1d structural fix
identically to all three stylesheets under
`experiments/css_native_layout/styles/`. Static evidence only. No HTML,
SVG, JS, or YAML touched. No commit. The fix replaces the
`grid-area: 1 / 1 / -1 / -1` popup_layer rule with an absolutely
positioned overlay in `bench.css`, `hood.css`, and `instrument.css`, and
drops the trailing `0px` grid-row track from `.scene-container` in all
three. No other rule changes were made; in particular, no footprint
caps, no max-height, and no `.placement` mask edits (M1g warts dropped).

## 1. Change description

### Files modified

- `experiments/css_native_layout/styles/bench.css`
- `experiments/css_native_layout/styles/hood.css`
- `experiments/css_native_layout/styles/instrument.css`

### Exact CSS hunks (identical per file)

```diff
-/* Main scene container: fixed nominal dimensions, auto-collapse regions */
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
```

```diff
 /* Popup layer: centered overlay (positioned last in DOM for natural stacking) */
 .region--popup_layer {
   display: grid;
   place-items: center;
-  grid-area: 1 / 1 / -1 / -1;
+  position: absolute;
+  inset: 16px;
+  pointer-events: none;
   min-height: 0;
   background: transparent;
   border: none;
   padding: 0;
 }
```

Net per file: 1 line removed from `grid-template-rows`, 1 line added
(`position: relative` on `.scene-container`), 1 line replaced
(`grid-area` -> `position: absolute`), 2 lines inserted
(`inset: 16px` and `pointer-events: none`). Total across the three
files: 3 lines removed, 12 lines added; `git diff --stat` reports 7
modified lines per file (15 insertions, 6 deletions overall).

### Why this fix

Documented in detail in
[m0_m1d_instrument_station_origin_delta.md](m0_m1d_instrument_station_origin_delta.md).
Summary: `.region--popup_layer` was claiming every cell of the 5-track
explicit grid via `grid-area: 1 / 1 / -1 / -1`. The four real regions
(`rear_shelf`, `work_surface`, `front_tools`, `instrument_station`)
then auto-flowed into four NEW implicit rows below the explicit grid,
displacing content by ~410 px. The fix removes `popup_layer` from grid
flow entirely by switching it to absolute positioning anchored to the
container's content edge.

### What this fix deliberately does NOT touch

- Footprint sizing rules. M1g's combo capped footprint heights to
  reduce off-page failures further but visibly distorted the p200
  micropipette (aspect 61.7% -> 79.7%). M1h leaves all footprint
  rules untouched.
- `.placement` rule. M1g flipped masking; M1h preserves the
  current `.placement` definitions in all three stylesheets.
- `align-items` on `.region` (M1h leaves `flex-end` in `bench.css`
  and `flex-start` in `hood.css` / `instrument.css` unchanged).
- No `max-height` added anywhere.
- HTML, YAML, SVG, JavaScript, and TypeScript untouched.

## 2. Aggregate delta vs M0

Counts from `test-results/m0_static_summary/precheck_after_m1h/visual_audit.json`
compared to `test-results/m0_static_summary/precheck/visual_audit.json`.

| metric | M0 | M1h | delta |
| --- | --- | --- | --- |
| total scenes | 10 | 10 | +0 |
| scenes FAIL | 10 | 10 | +0 |
| checks_failed (summary) | 28 | 20 | -8 |
| off_page (scene composition) | 21 | 13 | -8 |
| region_overflow | 4 | 4 | +0 |
| clipped_artwork (scene composition) | 0 | 0 | +0 |
| aspect_HARD (hard_fail_group != null) | 38 | 38 | +0 |
| clipped_by_parent (HARD) | 21 | 4 | -17 |
| svg_svg_overlap | 0 | 1 | +1 |

Notes:

- `off_page` dropped by 8 (the popup_layer fix removes ~410 px of
  vertical dead space, which pulls four scenes' content fully onto the
  viewport but is not enough to recover the largest off-page scenes).
- `aspect_HARD` (the visual-integrity rule from
  `docs/PRIMARY_DESIGN.md`) is unchanged. Glassware, pipettes, plates,
  and instrument aspect distortions are inherent to the current
  footprint declarations and the natural SVG aspect ratios. M1h does
  not touch footprint sizing, so it does not change them.
- `clipped_by_parent` drops 21 -> 4 because content that previously
  hung below the viewport no longer does so for the four scenes that
  M1h fully rescues, and for several content items that previously
  spilled out of an overflowing parent region.
- `svg_svg_overlap` shows +1 in `cell_counter_basic`: the cell counter
  and counter-slide cartridge now register a 0.0 px^2 overlap (touching
  edges, not overlapping interiors). This is a measurement artifact of
  the new geometry, not new clipping; both objects sit inside the
  viewport.

## 3. Aggregate delta vs M1d (propagation effect)

M1d applied the same fix to `instrument.css` only, affecting two
scenes (`cell_counter_basic` and `microscope_basic`). M1h propagates
the same fix to `bench.css` (7 scenes) and `hood.css` (1 scene).

| metric | M1d | M1h | delta |
| --- | --- | --- | --- |
| off_page | 19 | 13 | -6 |
| region_overflow | 4 | 4 | +0 |
| clipped_artwork | 0 | 0 | +0 |
| aspect_HARD | 38 | 38 | +0 |
| clipped_by_parent (HARD) | 20 | 4 | -16 |

The additional 6 off_page improvements over M1d come from bench.css
scenes (bench_basic and the drug_dilution pair). hood_basic was already
at 0 off_page in M0, so propagation to `hood.css` does not reduce
off_page further (but it still removes the structural bug there, which
is verified by no regression).

## 4. Aggregate delta vs M1g (warts removed)

M1g combined the M1d-style popup_layer fix with footprint caps; the
caps crushed the p200 micropipette from 61.7% to 79.7% rendered area
ratio (still above tolerance) but visibly distorted aspect. M1g was
rejected on PRIMARY_DESIGN visual-integrity grounds. M1h drops the
footprint caps and keeps only the structural popup_layer change.

| metric | M1g | M1h | delta | note |
| --- | --- | --- | --- | --- |
| off_page | 4 | 13 | +9 | M1h does not get the off_page wins from cropping tall objects |
| region_overflow | 4 | 4 | +0 | same |
| clipped_artwork | 0 | 0 | +0 | same |
| aspect_HARD | 38 | 38 | +0 | both preserve aspect at the existing footprint declarations |
| clipped_by_parent (HARD) | 3 | 4 | +1 | M1g cropped slightly more aggressively |

The crucial M1g wart that M1h avoids: M1g's footprint caps shrink
glassware/pipette/plate cards below the natural SVG bbox. M1h leaves
those cards at their declared sizes, so no aspect distortion regresses.

## 5. Per-scene delta table

Per-scene off_page (the scene-composition metric that the dispatch
ranks):

| scene | M0 | M1d | M1g | M1h | d_M0 | d_M1g |
| --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 1 | 1 | 0 | 0 | -1 | +0 |
| cell_counter_basic | 1 | 0 | 1 | 0 | -1 | -1 |
| crowded_bench_dense | 3 | 3 | 0 | 3 | +0 | +3 |
| drug_dilution_plate_workspace | 2 | 2 | 0 | 0 | -2 | +0 |
| drug_dilution_workspace_dense | 4 | 4 | 1 | 1 | -3 | +0 |
| electrophoresis_bench | 7 | 7 | 1 | 7 | +0 | +6 |
| hood_basic | 0 | 0 | 0 | 0 | +0 | +0 |
| microscope_basic | 1 | 0 | 1 | 0 | -1 | -1 |
| staining_bench | 2 | 2 | 0 | 2 | +0 | +2 |
| well_plate_96_zoom | 0 | 0 | 0 | 0 | +0 | +0 |
| **TOTAL** | **21** | **19** | **4** | **13** | **-8** | **+9** |

Per-scene region_overflow:

| scene | M0 | M1d | M1g | M1h | d_M0 |
| --- | --- | --- | --- | --- | --- |
| bench_basic | 0 | 0 | 0 | 0 | +0 |
| cell_counter_basic | 0 | 0 | 1 | 0 | +0 |
| crowded_bench_dense | 2 | 2 | 1 | 2 | +0 |
| drug_dilution_plate_workspace | 0 | 0 | 0 | 0 | +0 |
| drug_dilution_workspace_dense | 0 | 0 | 0 | 0 | +0 |
| electrophoresis_bench | 1 | 1 | 1 | 1 | +0 |
| hood_basic | 0 | 0 | 0 | 0 | +0 |
| microscope_basic | 0 | 0 | 1 | 0 | +0 |
| staining_bench | 1 | 1 | 0 | 1 | +0 |
| well_plate_96_zoom | 0 | 0 | 0 | 0 | +0 |
| **TOTAL** | **4** | **4** | **4** | **4** | **+0** |

Per-scene clipped_by_parent (HARD artwork-integrity rule):

| scene | M0 | M1h | d_M0 |
| --- | --- | --- | --- |
| bench_basic | 1 | 0 | -1 |
| cell_counter_basic | 1 | 0 | -1 |
| crowded_bench_dense | 3 | 0 | -3 |
| drug_dilution_plate_workspace | 2 | 0 | -2 |
| drug_dilution_workspace_dense | 4 | 1 | -3 |
| electrophoresis_bench | 7 | 2 | -5 |
| hood_basic | 0 | 0 | +0 |
| microscope_basic | 1 | 1 | +0 |
| staining_bench | 2 | 0 | -2 |
| well_plate_96_zoom | 0 | 0 | +0 |
| **TOTAL** | **21** | **4** | **-17** |

Per-scene aspect_HARD (lab glassware/pipettes/plates/instruments):

| scene | M0 | M1h | d_M0 |
| --- | --- | --- | --- |
| bench_basic | 2 | 2 | +0 |
| cell_counter_basic | 1 | 1 | +0 |
| crowded_bench_dense | 6 | 6 | +0 |
| drug_dilution_plate_workspace | 6 | 6 | +0 |
| drug_dilution_workspace_dense | 10 | 10 | +0 |
| electrophoresis_bench | 6 | 6 | +0 |
| hood_basic | 3 | 3 | +0 |
| microscope_basic | 0 | 0 | +0 |
| staining_bench | 3 | 3 | +0 |
| well_plate_96_zoom | 1 | 1 | +0 |
| **TOTAL** | **38** | **38** | **+0** |

## 6. HARD aspect check (no new glassware/pipette/plate distortion)

Per-scene aspect_HARD totals are unchanged from M0 (38 -> 38). The set
of placements that fail the visual-integrity rule is identical to M0
on inspection of the per-item list:

- bench_basic: `center_well_plate` (plate), `right_tool_p200_micropipette` (pipette)
- cell_counter_basic: `instrument_main_cell_counter` (instrument)
- crowded_bench_dense: 6 glassware bottles
- drug_dilution_plate_workspace: 2 glassware, 1 plate, 1 rack, 2 pipettes
- drug_dilution_workspace_dense: 5 glassware, 1 plate, 2 racks, 2 pipettes
- electrophoresis_bench: 2 glassware, 1 instrument, 3 pipettes
- hood_basic: 2 glassware, 1 pipette
- microscope_basic: 0
- staining_bench: 3 glassware
- well_plate_96_zoom: 1 plate

Verdict: NO new HARD aspect distortion on any tracked group. The
visual-integrity rule in `docs/PRIMARY_DESIGN.md` is honored.

## 7. Acceptance verdict per rule

| rule | target | M1h | verdict |
| --- | --- | --- | --- |
| off_page <= 8 (drop >= 13 from M0=21) | <= 8 | 13 | FAIL |
| HARD aspect_distorted does NOT increase from M0=38 | <= 38 | 38 | PASS |
| region_overflow does NOT increase (<= 4) | <= 4 | 4 | PASS |
| clipped (composition) <= 21 | <= 21 | 0 | PASS |
| clipped_by_parent <= masking-still-present baseline (21) | <= 21 | 4 | PASS |

Overall verdict: ACCEPTANCE FAILS on off_page only. The structural
popup_layer fix alone, applied identically across all three stylesheets,
yields off_page=13 (drop of -8 from M0). The dispatch requires off_page
<= 8 (drop of at least -13). The remaining 13 off_page items are
structural placement failures unrelated to the popup_layer bug.

## 8. Remaining hard fails by category (what is NOT fixed and why)

After M1h, 13 off_page items remain across 5 scenes. Inspection of
their `placement_bbox` and `corners_out_of_viewport` fields shows two
recurring root causes, neither of which is a popup_layer artifact.

### Cause A: tall pipette/tip placements extending below row bottom

The `right_tool_p200_micropipette` and similar tall handheld tools in
the front_tools row have placements that sit inside the row but extend
their natural SVG height below the row's bottom edge into the
instrument_station row. This was concealed in M0 by the popup_layer
displacement (everything was already off-screen so the entire row was
out). With M1h restoring the explicit grid, the row sits inside the
viewport and the placement's lower portion overlaps the row below it,
which is flagged as off_page when the corners cross the viewport
boundary. Items in this category:

- `crowded_bench_dense`: 3 items (`front_microwave`, `front_rocking_shaker`,
  `front_waste_container`) -- all in `front_tools`, all with
  `center_out_of_viewport=false` and corner exits.
- `drug_dilution_workspace_dense`: 1 item.
- `staining_bench`: 2 items (`right_tool_area_microwave`,
  `right_tool_area_rocking_shaker`).

Structural fix needed: cap `front_tools` row height with a footprint
contract that fits inside the 260 px row, OR shrink the equipment
images via a layout-engine policy that respects the row bottom. M1g
attempted this via footprint caps but distorted aspect; the layout
engine MVP must do it without changing the natural SVG aspect.

### Cause B: electrophoresis_bench has 7 placements that exceed every
row in their column

`electrophoresis_bench` did not improve at all (off_page 7 -> 7). The
scene has a heavily populated `front_tools` row with multiple tall
items (`mini_protean_gel`, `gel_comb`, tip boxes, micropipettes) that
each individually exceed the 260 px front_tools row height. The
popup_layer fix correctly puts the row inside the viewport, but the
items inside the row still extend below it. The placements report
corner exits on the bottom edges only; centers remain in-viewport.

Structural fix needed: layout-engine MVP must (a) reflow tall front
tools across multiple sub-rows, (b) shrink to fit row height while
preserving aspect, or (c) reassign front_tools placements to a
dedicated tools-tray region. None of these is in scope for a CSS-only
patch.

### Cause C: drug_dilution_workspace_dense still off-page on 1 item

The scene retains one off_page placement (`waste_container_main` or
similar tall handheld). Same Cause A signature.

### Not in scope for M1h

The remaining 4 clipped_by_parent items
(`drug_dilution_workspace_dense` 1, `electrophoresis_bench` 2,
`microscope_basic` 1) are all instances where the SVG bbox extends
below its parent `.placement` card's bottom edge. They are independent
of the popup_layer bug. Microscope, in particular, has a natural SVG
aspect that is wider than the `large-equipment` footprint allows.

These are the inputs the layout engine MVP must handle: row-height
contracts, multi-row reflow for crowded `front_tools`, and a
placement-card sizing policy that grows the card around the natural
SVG aspect instead of cropping.

## 9. Main-repo apply recommendation

Recommendation: YES, apply M1h to the main repo.

Rationale:

- The M1h change is a strict subset of M1d (already applied to
  `instrument.css`) plus the same edit to `bench.css` and `hood.css`.
- Acceptance gates on aspect_HARD, region_overflow, and clipped_by_parent
  all PASS. The visual-integrity rule from `docs/PRIMARY_DESIGN.md` is
  honored: no glassware, pipette, plate, or instrument distortion
  regresses.
- The off_page acceptance gate FAILS (13 > 8), but the dispatch makes
  clear that the alternative (M1g) violates the visual-integrity rule
  and is rejected. M1h is the cleanest structural change that strictly
  improves M0 without introducing visual-integrity regressions.
- The remaining 13 off_page items are structural placement failures
  (Cause A and Cause B above) that require a layout-engine MVP to fix
  cleanly. They are not popup_layer artifacts.
- M0 -> M1h improvements: off_page -8, clipped_by_parent -17,
  checks_failed -8.
- M1d -> M1h propagation: off_page -6 with no regression on any other
  metric, including in `hood_basic` (verified IN at every region).
- Shipping the popup_layer fix to all three stylesheets is a
  prerequisite for the layout-engine MVP. Without M1h, the four real
  regions are still displaced ~410 px below their authored positions
  in bench.css and hood.css scenes, which would corrupt any
  layout-engine measurement done against the live DOM.

If main-repo apply proceeds, the next step is a layout-engine MVP that
handles row-height contracts and multi-row reflow for crowded
`front_tools`. That milestone owns the remaining 13 off_page items.
