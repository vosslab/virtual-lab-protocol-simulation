# M1 trial summary for layout-engine designer

One-page handoff. Seven CSS trials run against `experiments/css_native_layout/`
(10 hand-authored HTML+CSS scene templates) attempting to fix 10/10
precheck-FAIL at viewport 1920x1080. All trials are evidence for *why* the
CSS-grid + region-min-height approach cannot satisfy PRIMARY_DESIGN's
visual-integrity rule, and *why* a cm-driven aspect-preserving layout engine
is needed.

## Setup

- Viewport tested: 1920x1080 (best of 6 swept; see Lane K viewport sweep).
- Scenes: 10 templates under `experiments/css_native_layout/templates/`.
- Diagnostics: `precheck.mjs` -> `visual_audit.json` with 4 HARD_FAIL classes
  (off_page, region_overflow, clipped_by_parent, aspect_distorted) + scorer.
- Hard rule: PRIMARY_DESIGN "never crop or aspect-distort scientific assets"
  (>5% aspect deviation on glassware / pipettes / plates / instruments = HARD
  FAIL).

## M0 baseline (no edits)

| metric | count |
|---|---|
| scenes_failed | 10 / 10 |
| off_page | 21 |
| region_overflow | 4 |
| clipped_by_parent | 21 |
| aspect_distorted (HARD) | 38 |
| total HARD | 93 |

Aggregate per-scene worst: `electrophoresis_bench` (7 off_page), tied with
two dense bench scenes for clipped.

## Trial scorecard

| trial | hypothesis | verdict | off_page | clipped | HARD aspect | net |
|---|---|---|---|---|---|---|
| M0 | (baseline) | -- | 21 | 21 | 38 | 93 |
| M1a | cap `.region--front_tools { max-height: 180px }` | REJECT | 21 | 19 | 38 | 94 |
| M1b | add `align-items: flex-end` to front_tools | REJECT | 22 | 22 | 38 | 95 |
| M1c | per-footprint max-height in bench.css | REJECT | 21 | 21 | (+5 aspect, see below) | 96 |
| M1d | popup_layer + grid-template fix in instrument.css | **ACCEPT** | 19 | 20 | 38 | 90 |
| M1g | M1d x3 + M1c caps + masking removal | REJECT* | 4 | 3 | 38 (but p200 worsened in-place 61.7% -> 79.7%) | 89 |
| M1h | M1d x3 only, no caps, no masking removal | partial | 13 | 4 | 38 | 89 |

`*` M1g's off_page win was structural; the rejection was the in-place pipette
aspect worsening from the M1c caps. Without the caps (M1h), no asset
violation, but off_page only drops to 13.

Delta docs per trial:
- [m0_m1a_front_tools_fix_delta.md](m0_m1a_front_tools_fix_delta.md)
- [m0_m1b_front_tools_bottom_anchor_delta.md](m0_m1b_front_tools_bottom_anchor_delta.md)
- [m0_m1c_placement_height_cap_delta.md](m0_m1c_placement_height_cap_delta.md)
- [m0_m1d_instrument_station_origin_delta.md](m0_m1d_instrument_station_origin_delta.md)
- [m0_m1g_best_combo_delta.md](m0_m1g_best_combo_delta.md)
- [m0_m1h_ship_up_delta.md](m0_m1h_ship_up_delta.md)
- [m0_m1_css_root_cause_audit.md](m0_m1_css_root_cause_audit.md) (Lane M1f
  read-only audit; 87 hard fails across 22 scene/region pairs)

## Failure modes the layout engine must dodge

### Mode 1: fixed-px grid rows
`.scene-container { grid-template-rows: 100px 1fr 100px 150px 0px }`
allocates pixel-fixed rows for 5 named regions. Row 4 = 150px, but
`.region--instrument_station` has its own `min-height: 150px` baked in CSS,
AND microscope_basic places a 536px microscope object inside that row. Three
declarations of "150px" for the same dimension, all sources of truth.

**Pipeline answers this:** zones declared in YAML by author. Single source
of truth. Height not pre-allocated; derived from cm + aspect.

### Mode 2: popup_layer grid-area bug
`.region--popup_layer { grid-area: 1/1/-1/-1 }` claimed every cell of the
explicit grid. Real regions auto-flowed into 4 NEW implicit rows BELOW the
explicit grid. Content effectively started at y=426 instead of y=16. 410px
dead space at top. Two independent lanes (M1c, M1d) rediscovered this bug
before identifying it.

**Pipeline answers this:** no grid container; absolutely-positioned items
keyed off zone bounds. No way to "claim all rows."

### Mode 3: hardcoded viewport
`.scene-container { width: 1920px; height: 1080px }` is fixed. Lane K's
6-viewport sweep found 1920x1080 was the LEAST-bad - all 6 viewports
failed, but 1920x1080 failed the least.

**Pipeline answers this:** viewport is a `runPipeline` input; aspect-adjust
formula compensates. Tested by spec invariant ("square asset renders square
in pixels at every viewport").

### Mode 4: placement-card crush
M1c added `.footprint--handheld { max-height: 180px }`. CSS resolved by
shrinking image container without shrinking SVG natural size. p200
micropipette card height went 213px -> 180px (16% squash), aspect deviation
went 61.7% -> 79.7%. Same mechanism added 5 advisory aspect failures in
M1c, then re-fired in M1g. Every "make it fit" CSS fix that doesn't change
the asset itself ends up violating PRIMARY_DESIGN.

**Pipeline answers this:** Stage 8 derives height from `visualWidth *
viewport_aspect / aspect`. Asset aspect ratio is invariant by construction;
shrink only happens uniformly via Stage 7's `MIN_SCALE = 0.55`.

### Mode 5: masked failures
hood.css and instrument.css still carried `.placement { overflow: hidden;
max-height: 100% }` which clipped SVG content inside cards without
emitting any diagnostic. bench.css had removed this in a "Round 3"
edit. M1f audit surfaced this: hood+instrument scenes were under-counting
true clip failures.

**Pipeline answers this:** no per-card overflow control. SVG renders at
computed size; clipping cannot be silent.

### Mode 6: YAML vs HTML divergence
Lane Y audit found 1/10 scenes share canonical `zones[]` vocabulary with
`content/base_scenes/*.yaml`. 8/10 diverge. 1 has no canonical YAML
counterpart. Hand-authored HTML uses experiment-local 5-region taxonomy
(rear_shelf / work_surface / front_tools / instrument_station /
popup_layer); canonical YAML uses zone IDs like `rear_left`, `rear_center`,
`right_tool_area`. Only `work_surface` is shared across all 10.

See [m0_yaml_html_divergence.md](m0_yaml_html_divergence.md).

**Pipeline answers this:** YAML is single source; HTML is emitted. No way
to drift.

## Edges the spec could clarify

These are the edges where the trials surfaced behavior the LAYOUT_PIPELINE
spec doesn't yet pin down. Not gaps - just decisions worth being explicit
about when the TS port lands.

1. **Off-page items are still in `final[]`.** Pipeline's scene_bounds
   clamp (Stage 10) handles items escaping `scene_bounds` rect. But items
   inside a zone whose `bounds.bottom` exceeds `scene_bounds.bottom`
   still escape vertically after clamp. Diagnostic
   `item_escapes_zone_vertically` exists (Stage 8) at >3% tolerance, but
   nothing forces the renderer to clip or hide. Should renderer suppress
   off-page items? Show with diagnostic overlay? Author responsibility?

2. **`max-height` analog.** PRIMARY_DESIGN forbids aspect distortion >5%
   on lab assets, but pipeline currently has only `MIN_SCALE = 0.55` for
   horizontal shrink (preserves aspect, gentle). What's the recommendation
   when a single tall object (microscope, gel apparatus) exceeds its zone
   `bounds.bottom - bounds.top`? Trigger `item_escapes_zone_vertically`
   and rely on author to fix zone bounds upstream? Or auto-fit (would
   require asymmetric scale, violating aspect)?

3. **Material overlays + computed bbox.** Spec §9 puts liquid fill / gel
   contents inside `visual_states` (object-internal). But material level
   can change the *visual* bounding box (a half-full flask renders
   smaller-looking than a full one), while `_visualWidth` + `_height` from
   the pipeline assumes the SVG bbox is invariant. Confirm: pipeline's
   `_height` reflects max SVG bbox (asset's design size), and material
   overlays render INSIDE that envelope, never outside.

4. **Multi-instance placement.** Pipeline assumes one placement = one
   object instance. The experiments' templates contain placements like
   `front_left_p200` and `front_right_p200` for a left/right pipette pair
   (same object, two placements). Already supported via two
   `PlacementAuthored` entries with different `placement_name`. Confirming
   this for the record so the TS port doesn't try to de-duplicate by
   object_name.

5. **Scenes with NO placements (legitimately empty).** A welcome screen
   or a zoom-detail scene (well_plate_96_zoom is one of our 10) has very
   few or zero rows. Stage 6 returns empty groups; Stages 7-10 are no-ops;
   `final` is empty. Confirm intended behavior: emit empty scene + no
   diagnostics rather than warn for "no placements."

## What the trials cost us (and the lesson)

7 trials, 5 acceptance failures, 1 strict-accept partial-win, 1 violation
of visual-integrity rule. ~3 hours of background-agent CSS work + diagnostic
runs. None of it touches the long-term goal - every trial was a band-aid on
a model the contract already says is wrong (PRIMARY_CONTRACT item 3:
"Scene object layout is handled by the layout engine"). The trials are
useful only as evidence that the band-aid path is closed.

The cm-driven aspect-preserving pipeline in `design_advice/pipeline.jsx`
sidesteps all 6 failure modes above by construction. Porting that to
`src/scene_runtime/layout/layout_engine.ts` plus a thin renderer is the
right next move.

## Artifact pointers

- All delta docs: `docs/active_plans/reports/m0_m1*_delta.md`
- Audit: `docs/active_plans/reports/m0_m1_css_root_cause_audit.md`
- YAML/HTML divergence: `docs/active_plans/reports/m0_yaml_html_divergence.md`
- Failed scenes triage: `docs/active_plans/reports/m0_static_failed_scenes.md`
- Trial gallery (side-by-side): `test-results/m0_m1_trials/INDEX.html`
- M0 visual summary PDF: `docs/active_plans/reports/m0_static_visual_summary.pdf`
