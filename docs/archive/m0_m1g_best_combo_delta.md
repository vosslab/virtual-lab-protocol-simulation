# M1g best-combo CSS delta

STATIC EXPERIMENT EVIDENCE 2026-05-22 - M1g delta

This report records the M1g delta after applying a multi-piece CSS combo to
all three stylesheets in `experiments/css_native_layout/styles/`. Static
evidence only. No HTML, SVG, JS, or YAML touched. No commit. Edits are scoped
strictly to `bench.css`, `hood.css`, and `instrument.css`.

## 1. Combo composition

M1g combines the accept-worthy pieces from earlier single-piece trials:

| Source trial | Piece applied to M1g                                    | Files touched |
| ---          | ---                                                     | ---           |
| M1d (accept) | popup_layer absolute positioning + grid-template-rows 4-row fix | bench.css, hood.css, instrument.css |
| M1c (rejected on rule 1 but improved region_overflow) | front_tools footprint caps (max-height 180px on small-tool, handheld, instrument) | bench.css only |
| M1f (masking-fix) | `.placement` overflow visible (remove max-height 100% and overflow hidden) | hood.css, instrument.css (bench.css was already unmasked in Round-3) |
| M1b (rejected, regression) | NOT applied                                  | none          |

M1d was the only prior accept. M1c and M1d independently rediscovered the
same root cause: `.region--popup_layer { grid-area: 1 / 1 / -1 / -1 }`
combined with a trailing `0px` row in `grid-template-rows` forced four
implicit grid rows below the explicit grid, pushing `instrument_station`
from y=914 down to y=1162 and `front_tools` from y=802 to y=890. M1d
applied the fix to instrument.css only. M1g propagates that fix to bench.css
and hood.css as well, and layers in the M1c front_tools caps plus M1f
masking removal.

## 2. CSS diff hunks per file

### 2.1 bench.css

Three hunks: grid-row fix, popup_layer rewrite, M1c front_tools caps.
`.placement` was already unmasked in Round-3 hybrid; no M1f change here.

```diff
 .scene-container {
   display: grid;
   grid-template-columns: 1fr;
-  grid-template-rows: 100px 1fr 100px 150px 0px;
+  grid-template-rows: 100px 1fr 100px 150px;
   ...
+  position: relative;
 }
```

```diff
 .region--popup_layer {
   display: grid;
   place-items: center;
-  grid-area: 1 / 1 / -1 / -1;
+  position: absolute;
+  inset: 16px;
+  pointer-events: none;
   min-height: 0;
   ...
 }
```

```diff
 .region--front_tools {
   flex-wrap: wrap;
   min-height: 260px;
 }
+
+.scene--bench .region--front_tools .footprint--small-tool { max-height: 180px; }
+.scene--bench .region--front_tools .footprint--handheld   { max-height: 180px; }
+.scene--bench .region--front_tools .footprint--instrument { max-height: 180px; }
```

### 2.2 hood.css

Two hunks: grid-row fix, popup_layer rewrite, plus M1f placement masking
removal.

```diff
 .scene-container {
-  grid-template-rows: 100px 1fr 100px 150px 0px;
+  grid-template-rows: 100px 1fr 100px 150px;
+  position: relative;
 }
```

```diff
 .region--popup_layer {
-  grid-area: 1 / 1 / -1 / -1;
+  position: absolute;
+  inset: 16px;
+  pointer-events: none;
 }
```

```diff
 .placement {
   ...
-  max-height: 100%;
-  overflow: hidden;
+  overflow: visible;
 }
```

### 2.3 instrument.css

Same three hunks as hood.css: grid-row fix, popup_layer rewrite, M1f
masking removal. Note: M1d had previously applied the first two hunks to
this file in main; the worktree base reflects pre-M1d state, so M1g is
re-applying the M1d fix as part of the propagation.

```diff
 .scene-container {
-  grid-template-rows: 100px 1fr 100px 150px 0px;
+  grid-template-rows: 100px 1fr 100px 150px;
+  position: relative;
 }
```

```diff
 .region--popup_layer {
-  grid-area: 1 / 1 / -1 / -1;
+  position: absolute;
+  inset: 16px;
+  pointer-events: none;
 }
```

```diff
 .placement {
   ...
-  max-height: 100%;
-  overflow: hidden;
+  overflow: visible;
 }
```

## 3. Aggregate delta vs M0 baseline

`aspect_total` is the raw entry count (includes both HARD_FAIL and
advisory). `aspect_HARD` counts only entries with `hard_fail_group` set
(glassware, pipette, plate, instrument) per the PRIMARY_DESIGN visual
integrity rule.

| Metric             | M0  | M1g | Delta |
| ---                | --- | --- | ---   |
| off_page           | 21  | 4   | -17   |
| clipped_by_parent  | 21  | 3   | -18   |
| aspect_total       | 47  | 52  | +5    |
| aspect_HARD        | 38  | 38  | 0     |
| region_overflow    | 4   | 4   | 0     |
| clipped_artwork    | 0   | 0   | 0     |

The +5 in `aspect_total` is entirely from `hard_fail_group: null`
advisory entries (decorative items: microwave, rocking_shaker,
mini_protean_gel). HARD_FAIL aspect_distorted is unchanged at 38.

## 4. Aggregate delta vs M1d (propagation effect)

M1d already cleared the instrument.css bug. The bench.css + hood.css
propagation plus the M1c front_tools caps and M1f masking removal account
for the rest of the M1g improvement.

| Metric             | M1d | M1g | Delta |
| ---                | --- | --- | ---   |
| off_page           | 19  | 4   | -15   |
| clipped_by_parent  | 20  | 3   | -17   |
| aspect_total       | 47  | 52  | +5    |
| aspect_HARD        | 38  | 38  | 0     |
| region_overflow    | 4   | 4   | 0     |

The propagation effect alone (M1d to M1g) is dominated by bench scenes:
seven bench scenes shed approximately the same -17 off_page that M1d
delivered for the two instrument scenes. The hood scene was already
clean at M0.

## 5. Per-scene delta table

Triple is (M0 / M1d / M1g).

| Scene                          | off_page  | clipped   | aspect_total | aspect_HARD | region |
| ---                            | ---       | ---       | ---          | ---         | ---    |
| bench_basic                    | 1 / 1 / 0 | 1 / 1 / 0 | 2 / 2 / 2    | 2 / 2 / 2   | 0 / 0 / 0 |
| cell_counter_basic             | 1 / 0 / 1 | 1 / 0 / 0 | 2 / 2 / 2    | 1 / 1 / 1   | 0 / 0 / 1 |
| crowded_bench_dense            | 3 / 3 / 0 | 3 / 3 / 0 | 8 / 8 / 10   | 6 / 6 / 6   | 2 / 2 / 1 |
| drug_dilution_plate_workspace  | 2 / 2 / 0 | 2 / 2 / 0 | 6 / 6 / 6    | 6 / 6 / 6   | 0 / 0 / 0 |
| drug_dilution_workspace_dense  | 4 / 4 / 1 | 4 / 4 / 1 | 12 / 12 / 12 | 10 / 10 / 10 | 0 / 0 / 0 |
| electrophoresis_bench          | 7 / 7 / 1 | 7 / 7 / 1 | 9 / 9 / 10   | 6 / 6 / 6   | 1 / 1 / 1 |
| hood_basic                     | 0 / 0 / 0 | 0 / 0 / 0 | 3 / 3 / 3    | 3 / 3 / 3   | 0 / 0 / 0 |
| microscope_basic               | 1 / 0 / 1 | 1 / 1 / 1 | 0 / 0 / 0    | 0 / 0 / 0   | 0 / 0 / 1 |
| staining_bench                 | 2 / 2 / 0 | 2 / 2 / 0 | 4 / 4 / 6    | 3 / 3 / 3   | 1 / 1 / 0 |
| well_plate_96_zoom             | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 1    | 1 / 1 / 1   | 0 / 0 / 0 |

Best per-scene deltas (M0 to M1g):

- `electrophoresis_bench`: off_page 7 -> 1 (-6). Largest single-scene
  improvement of the trial.
- `drug_dilution_workspace_dense`: off_page 4 -> 1 (-3); clipped 4 -> 1 (-3).
- `crowded_bench_dense`: off_page 3 -> 0 (-3); clipped 3 -> 0 (-3).
  Net failure: aspect_total +2, region_overflow -1.

Worst per-scene deltas (M0 to M1g):

- `microscope_basic`: off_page 1 -> 1 (no improvement); regained the M1d
  off_page=1 entry plus a new region_overflow=1. Microscope and
  cell_counter are tall instruments whose footprint extends below the
  150px instrument_station row; M1f mask removal surfaces this.
- `cell_counter_basic`: off_page 1 -> 1; gained region_overflow=1.
  Same M1f surfacing pattern.

## 6. New clipped and aspect entries classification

Total new entries surfaced or created by M1g vs M0:

### Clipped_by_parent (1 new entry)

| Scene                          | Placement          | Sides | Classification                  |
| ---                            | ---                | ---   | ---                             |
| drug_dilution_workspace_dense  | center_well_plate  | top   | created-by-m1c-m1d (bench was already unmasked) |

The well plate now extends above the work_surface region because
front_tools shifted up after the popup_layer fix and the work_surface
region took less space. This is a real new clip created by the
combo composition (not surfaced by M1f, since bench.css already had
overflow:visible on `.placement` in M0).

### Aspect_distorted (5 new entries, all advisory)

| Scene                  | Placement                        | Group | Delta % | Classification |
| ---                    | ---                              | ---   | ---     | ---            |
| crowded_bench_dense    | front_microwave                  | null  | 10.0    | created-by-m1c-m1d |
| crowded_bench_dense    | front_rocking_shaker             | null  | 30.95   | created-by-m1c-m1d |
| electrophoresis_bench  | front_left_mini_protean_gel      | null  | 23.13   | created-by-m1c-m1d |
| staining_bench         | right_tool_area_microwave        | null  | 10.0    | created-by-m1c-m1d |
| staining_bench         | right_tool_area_rocking_shaker   | null  | 30.95   | created-by-m1c-m1d |

All five new aspect entries have `hard_fail_group: null` (advisory only
per the PRIMARY_DESIGN aspect-distortion rule). All five are in
`front_tools` cells whose `--instrument` footprint now caps at 180px
(M1c). The microwave and rocking_shaker artwork were sized > 180px
natural and are now squashed by the cap.

### Region_overflow (2 new entries on instrument scenes)

Aggregate region_overflow is unchanged (4), but the distribution shifted:

| Scene                  | M0 region | M1g region | Change |
| ---                    | ---       | ---        | ---    |
| cell_counter_basic     | 0         | 1          | +1 (instrument_station, overflow_h=24) |
| microscope_basic       | 0         | 1          | +1 (instrument_station, overflow_h=92) |
| crowded_bench_dense    | 2         | 1          | -1     |
| staining_bench         | 1         | 0          | -1     |

The +2 on instrument scenes is surfaced-by-m1f: the cell_counter and
microscope artwork were previously masked by `.placement { overflow:
hidden }`, so the artwork was being silently cropped. Removing the mask
makes the overflow visible to the diagnostic, which is the documented
intent of M1f ("make hidden failures visible"). The -2 on bench scenes
is a genuine fix from the front_tools caps reducing tool footprints in
the dense layouts.

### Right_tool_area_p200_micropipette delta (worse)

In `electrophoresis_bench`, `right_tool_area_p200_micropipette` (group:
pipette, HARD_FAIL) went from delta_pct=61.72 in M0 to 79.69 in M1g.
The entry exists in both M0 and M1g, so the aspect_HARD count is
unchanged at 6 for that scene, but the severity got worse. The likely
cause is the M1c `--small-tool { max-height: 180px }` cap shrinking the
pipette's allowed vertical extent further, compressing the aspect
ratio.

## 7. Acceptance verdict per rule

| Rule                                                  | Threshold        | M1g result | Verdict |
| ---                                                   | ---              | ---        | ---     |
| off_page drops by >= 10 from M0                       | M0=21, target <=11 | 4          | PASS    |
| region_overflow does not increase from M0             | <= 4             | 4          | PASS    |
| aspect_distorted does not increase from M0 (raw)      | <= 47            | 52         | FAIL (raw count) |
| aspect_distorted HARD_FAIL does not increase from M0  | <= 38            | 38         | PASS (hard-fail count) |
| No new SVG content cropping                           | 0 new HARD       | 1 new clip on plate (HARD) | FAIL (one new HARD clip on `center_well_plate`) |
| No aspect distortion > 5% on scientific assets        | none new         | p200_micropipette delta worsened in-place from 61.72 to 79.69; no new pipette/plate/glassware/instrument entries appeared | MIXED |

Strict-reading verdict: **REJECT.** The raw aspect_distorted count
increased (+5), one new HARD clipped_by_parent appeared
(`center_well_plate` top in `drug_dilution_workspace_dense`), and one
existing HARD aspect_distorted entry (p200 pipette in electrophoresis)
got measurably worse.

Lenient-reading verdict: **PARTIAL ACCEPT.** The dominant rule
(off_page <= 11) cleared by a wide margin (4 vs target 11). The five
new aspect entries are advisory-only. The instrument-scene region
overflows are the documented purpose of M1f (surface masked failures).

The strict reading governs in this single-shot trial per the brief
instructions ("If acceptance fails, stop after one shot. Do not iterate.").

## 8. Remaining hard fails by category

After M1g:

| Category            | Count | Notes                                                                     |
| ---                 | ---   | ---                                                                       |
| off_page            | 4     | drug_dilution_workspace_dense, electrophoresis_bench, cell_counter_basic, microscope_basic each contribute 1 |
| clipped_by_parent   | 3     | drug_dilution_workspace_dense / center_well_plate (top); electrophoresis_bench / center_electrophoresis_tank (top); microscope_basic / instrument_main_microscope (bottom) |
| aspect_HARD         | 38    | unchanged from M0; concentrated in dense scenes                          |
| region_overflow     | 4     | instrument_station overflows on cell_counter_basic and microscope_basic; bench scenes (crowded, electrophoresis) |

The off_page remnants in `cell_counter_basic` and `microscope_basic` are
the same large-instrument-too-tall-for-instrument_station pattern that
existed in M0. M1d shifted the instrument_station up 248px (y=1162 to
y=914), but the large microscope/cell_counter art at h=174-242 still
exceeds the 150px row height and overflows into the 100px row below
(now blank since front_tools is the next region).

## 9. Recommended next step

The combo cleared 17 of 21 off_page entries and 18 of 21
clipped_by_parent entries. The remaining 4 hard fails are not a popup_layer
artifact, a front_tools wrap artifact, or a placement-mask artifact.
They are the consequence of a fundamentally rigid five-region grid
trying to host scientific assets whose natural aspect ratios do not fit
the row heights chosen for the grid.

Specifically:

- `instrument_station` is 150px. A microscope SVG is 393x536 natural,
  ratio 0.733. To fit 150px height and keep aspect, the rendered width
  must be 110px. The current footprint is 160px min-width. There is no
  legal placement of a microscope in a 150px row at its natural
  aspect.
- The same arithmetic holds for cell_counter, electrophoresis_tank, and
  the well_plate at certain orientations.

The cheapest next step that respects the contract:

1. **Drop the front_tools footprint cap on `--small-tool`** (revert just
   the `max-height: 180px` rule for small-tool only). It is squashing
   pipettes that were already on the edge. Keep the cap on `--handheld`
   and `--instrument`, but raise it from 180px to 220px so the
   front_tools region (260px min-height with 12px padding both ends)
   can accept it without overflow. This recovers from the
   `front_microwave`, `front_rocking_shaker`,
   `front_left_mini_protean_gel`,
   `right_tool_area_microwave`, and `right_tool_area_rocking_shaker`
   advisory aspect distortions and undoes the p200 pipette regression.
2. **Make `instrument_station` and `work_surface` rows flex-grow with a
   min-height instead of a fixed 150px / 100px**. This is the core
   missing flexibility. Grid `minmax(150px, auto)` on the
   instrument_station row would let it grow to fit a microscope without
   pushing the work_surface beyond its share.

The more expensive but more defensible next step:

**Migrate to the layout engine + px_per_cm placement model** described in
`docs/specs/LAYOUT_ENGINE.md` and PRIMARY_CONTRACT item 3. The
px-grid approach has now eaten four single-piece trials and one combo
trial. Each trial cleared one bug class but exposed the next. The
fundamental constraint -- the grid does not know which SVGs need to be
tall, which need wide rows, which are decorative versus scientific --
cannot be modeled inside a static `grid-template-rows`. The layout
engine sees the asset's natural bbox, computes a px_per_cm scale, and
places by semantic position, not by row index.

## 10. Opinion: can the px-grid approach ever clear all hard fails?

Short answer: not as a static stylesheet.

The five-row grid encodes one curriculum's geometry (a hood, a bench, an
instrument station) into CSS, and that geometry is wrong for any scene
whose dominant asset does not fit the chosen row heights. The grid has
no escape valve for a 536px-tall microscope. The historical fix --
mask the overflow with `.placement { overflow: hidden }` -- silently
crops the asset, which violates PRIMARY_DESIGN visual integrity.
Removing the mask (M1f) makes the violation diagnosable, but does not
fix it.

Two paths could clear all hard fails in the px-grid model, but both
sacrifice the static-stylesheet property:

- **Per-scene CSS overrides.** Each scene gets its own
  `<scene_name>.css` that resizes the offending row. This works but
  duplicates rules, fights propagation, and re-introduces the
  hood-special-case pattern PRIMARY_CONTRACT item 1 forbade.
- **CSS custom property per scene.** A `--scene-instrument-row-px`
  variable set on the body tag. The author tunes per scene; CSS reads
  the variable. This is a slightly better factoring but still encodes
  the geometry by hand.

The clean fix is the layout engine. PRIMARY_CONTRACT item 3 already
mandates the layout engine for clickable object placement; this trial
is evidence that the engine should also own row sizing, not the
stylesheet. Recommend transitioning the milestone from "css_native
trials" to "layout engine MVP" before another combo trial is attempted.
