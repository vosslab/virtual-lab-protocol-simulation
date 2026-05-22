# Visual targets per scene class

Concrete, measurable visual rules per scene archetype for the NEW1.5 CSS-native
layout work. Each class lists 2-3 numeric rules, the existing scene that best
embodies the target, and the existing scene that fails it hardest. Rules are
sourced from the scorecard model in [LAYOUT_SCORECARD.md](LAYOUT_SCORECARD.md)
and apply against the class mapping in
[scene_class_manifest.yaml](scene_class_manifest.yaml).

These are visual acceptance targets, not new metrics. The scorer in
`score_layout.mjs` already computes the underlying values. Numbers below
declare the "good" band; values outside the band drive the recommendations
listed in [LAYOUT_SCORECARD.md](LAYOUT_SCORECARD.md) section "Recommendation
taxonomy".

Viewport assumption: 1920x1080. All ratios are fractions of the scene
container area unless stated otherwise. Distance bands are pixel measurements
at that viewport.

## Hard rule: NEVER crop SVG assets in display

Canonical home: [PRIMARY_DESIGN.md](../../docs/PRIMARY_DESIGN.md). See also [SVG_PIPELINE.md](../../docs/specs/SVG_PIPELINE.md) and [LAYOUT_ENGINE.md](../../docs/specs/LAYOUT_ENGINE.md).

A scene cannot pass visual review if any scientific SVG asset is cropped or
aspect-distorted enough to change what the object is.

This rule applies even if precheck reports `hard_fail_count = 0`. Visible
cropping or distortion is a visual failure regardless of bbox-level checks.

Forbidden in any rendered scene:

- Cropped bottoms of volumetric flasks
- Cropped bottle necks or caps
- Clipped pipette tips
- Hidden instrument edges
- Object artwork cut off by cards, regions, wrappers, `overflow: hidden`, or
  `.object-graphic` containers
- Squashing or stretching that changes the intended asset aspect ratio

Diagnostic requirement:

The `artwork_integrity` check must:

- Compare the rendered `.object-graphic` or `img`/`svg` bbox against its
  parent placement card.
- Flag if the asset is clipped by parent `overflow`.
- Flag if rendered aspect ratio deviates from expected asset aspect ratio
  beyond a small tolerance (default: 5%).
- Treat visible clipping as a HARD FAIL.
- Treat mild aspect distortion as advisory at first; escalate to hard fail
  for lab glassware, pipettes, plates, and instruments.

Fix direction (not a substitute for the rule):

- Use `object-fit: contain`, never `cover`.
- Preserve SVG `preserveAspectRatio="xMidYMid meet"` (default).
- Remove parent `overflow: hidden` where it clips assets.
- Size cards around assets, not assets into too-small cards.
- Add `min-height` / `min-width` for tall glassware cards.

Anti-patterns (forbidden):

- Do NOT "fix" cropping by hiding cropped assets, deleting DOM, or weakening
  diagnostics.
- Do NOT accept a high score if the asset is visibly cropped.
- Do NOT claim visual success while glassware bottoms are cut off.

See also: [DIAGNOSTICS_REFERENCE.md](DIAGNOSTICS_REFERENCE.md),
[../../docs/active_plans/new2_css_native_production_blocker_plan.md](../../docs/active_plans/new2_css_native_production_blocker_plan.md),
[new2_css_native_best_case_showcase_no_crop_addendum.md](../../docs/archive/css_native_layout/new2_css_native_best_case_showcase_no_crop_addendum.md).

## Bench

Bench scenes are composition-class layouts where a horizontal work_surface
holds a primary container (plate, tray, gel rig) plus reagents, tools, and a
rear shelf. Manifest class: `composition` (see
[scene_class_manifest.yaml](scene_class_manifest.yaml)).

- `primary_area_ratio` in `[0.20, 0.35]`. Below 0.20 the primary fails to
  read as the focus; above 0.35 the bench loses its supporting context.
- Support objects within 480 px of the primary's center on the work_surface
  band (Euclidean, single viewport). This keeps `support_distance` below
  0.25 of the scene diagonal.
- `label_readability` score >= 75: every label >= 11 px after the layout
  pass, with zero clipped or overflowed label bounding boxes.

Best example: `staining_bench` (primary 31.3%, balance 100, support
distance 100). Worst example: `drug_dilution_plate_workspace`
(`label_readability` = 0, region_filling = 16) per
`test-results/new0_css_native/scorecard/scorecard.md` (generated).

## Hood

Hood scenes frame a sash and interior work_surface with a small set of
sterile items. Manifest class: `template` for `hood_basic`. Future hood
compositions inherit the bench rules plus the constraints below.

- Primary item centered laterally: primary center x within +/- 10% of
  scene midline. The sash frame is symmetric, so off-center primaries
  read as broken.
- `balance` score >= 80, equivalent to no empty band exceeding 20% of
  scene_area. Hoods exaggerate empty bands because the sash crops the
  top and bottom.
- `label_readability` score >= 75. The hood interior is small; labels
  below 11 px or overlapping the sash frame fail.

Best example: `hood_basic` for centering and balance (balance = 100).
Worst example: `hood_basic` again for label readability (score = 25,
top worst metric in `test-results/new0_css_native/scorecard/scorecard.md` (generated));
hood labels must move off the sash overlay.

## Zoom / detail

Magnified single-object views. Manifest class: `zoom_detail`. The primary
fills most of the viewport and supporting objects are absent by design.

- `primary_area_ratio` in `[0.70, 0.92]`. Below 0.70 the view stops
  reading as a zoom; above 0.92 the artwork is clipped or the framing
  margin disappears.
- `scene_occupied` >= 0.75. The primary plus any callouts should cover
  most of the viewport.
- Margin band: at least 24 px of clear space on every viewport edge so
  the primary does not touch the frame and labels never overlap the
  edge.

Best example: `well_plate_96_zoom` (primary 88.7%, scene_occupied 89,
balance 100). No worst example: the class has one scene; future zoom
scenes are graded against this one.

## Instrument heavy

Composition where the primary is a large scientific instrument and a
ring of tools and reagents clusters around it. Manifest class:
`instrument_heavy`.

- `primary_area_ratio` in `[0.30, 0.45]`. The instrument must dominate;
  the current `electrophoresis_bench` at 21.9% is below this band and
  drives the lowest score in `test-results/new0_css_native/scorecard/scorecard.md` (generated).
- `primary_prominence` >= 2.0 (primary area at least twice the largest
  supporting object's area).
- Support objects within 200 px of the primary's bounding box edge,
  not its center. This keeps tools visibly attached to the instrument
  rather than scattered across the bench.

Best example: none currently meets the band; `electrophoresis_bench` is
the only scene in this class and the worst-scoring scene (47/100,
`primary_area_ratio` is the top worst metric). It is the reference for
what must improve.

## Dense clutter

Stress-test density scenes; many placements in a constrained space.
Manifest class: `dense_clutter`. Collision and label legibility dominate.

- `primary_area_ratio` >= 0.10 (soft floor; primary still readable in
  the crowd).
- `label_readability` score >= 60: text >= 11 px, fewer than 2 clipped
  or overflowed labels in the whole scene. Both current dense scenes
  score 0 here; this is the main thing to fix.
- Zero hard fails: no `svg_svg_overlap` and no `region_overflow`. Dense
  scenes are allowed to crowd, not to clip.

Best example: `crowded_bench_dense` (primary 31.3%, balance 100, zero
hard fails). Worst example: `drug_dilution_workspace_dense` for label
readability (score = 0) and region_filling (20). See
`test-results/new0_css_native/scorecard/scorecard.md` (generated).

## Template

Single-instrument skeleton scenes used as launch surfaces. Manifest
class: `template`. Primary ratio is skipped; readability and balance
carry the score.

- `balance` score >= 80, equivalent to no empty quadrant covering more
  than 20% of scene_area. The single object should read as centered.
- `label_readability` score >= 75 with text >= 11 px. Templates have
  few labels; each one must be unambiguous.
- `scene_occupied` in `[0.05, 0.25]`. Templates are intentionally
  sparse; above 0.25 the scene stops reading as a skeleton.

Best example: `bench_basic` and `microscope_basic` (both 90/100, balance
100). Worst example: `hood_basic` (label_readability = 25, score 70).

## Cross-references

- Metric definitions and weights: [LAYOUT_SCORECARD.md](LAYOUT_SCORECARD.md).
- Class assignments per scene: [scene_class_manifest.yaml](scene_class_manifest.yaml).
- Latest measured scores: `test-results/new0_css_native/scorecard/scorecard.md` (generated).
