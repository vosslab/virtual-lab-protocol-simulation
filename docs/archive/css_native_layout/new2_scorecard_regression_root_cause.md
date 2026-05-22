# NEW2 scorecard regression root cause audit (Task #107)

## Purpose

Identify which file change(s) caused the 5-scene scorecard regression
flagged in Task #97. Lane C (Task #81 post-recalibration) baseline scores
have decayed since they were captured. This audit traces each regression
to its source.

## Per-scene regression breakdown

| Scene                         | Baseline (Lane C) | Current          | Delta | Type | Suspected source                                                                                               |
| ----------------------------- | ----------------- | ---------------- | ----- | ---- | -------------------------------------------------------------------------------------------------------------- |
| bench_basic                   | 90                | 70               | -20   | B    | `experiments/css_native_layout/styles/bench.css` 3-band grid applied unconditionally                           |
| staining_bench                | 60                | 45               | -15   | B    | same bench.css 3-band grid plus region styling                                                                 |
| drug_dilution_plate_workspace | 63                | 46               | -17   | B    | bench.css 3-band grid plus template region merge (5 regions -> 3)                                              |
| crowded_bench_dense           | 60                | 54               | -6    | B    | bench.css 3-band grid + label-hide interaction                                                                 |
| electrophoresis_bench         | 47                | 0 + 4 hard fails | -47   | A    | `experiments/css_native_layout/templates/electrophoresis_bench.html` inline CSS column-wrap (Lane E Trial 1.2) |

## Type categorization

### Type A (template structure / inline directive): 1 scene

- `electrophoresis_bench.html` lines 8-22: inline `<style>` block adds
  `.region--work_surface { flex-direction: column; flex-wrap: wrap; }`
  layout from Lane E Trial 1.2.
- Stack-and-wrap layout was tuned at a smaller dev viewport. At the
  production `1920x1080` viewport the rendered scene grows to
  `1920x1763`, exceeding the viewport ceiling.
- Triggers 4 hard fails: `off_page`, `svg_svg_overlap`,
  `aspect_ratio_fidelity`, `clipping`.

### Type B (CSS rule leakage outside intended scope): 4 scenes

- All four affected scenes use `scene--bench` and link
  `experiments/css_native_layout/styles/bench.css`.
- Commit `4d03b4b` ("I have no idea") refactored `bench.css` from
  Direction C to Direction B. The new 3-band grid layout
  (`grid-template-rows: 120px 1fr 100px`) and region backgrounds are
  applied to `.scene-container` WITHOUT a `.scene-mode--detail` guard,
  affecting every bench scene (template, composition, dense_clutter)
  equally.
- Direction C had flexible multi-row grids that allowed non-detail
  scenes to reflow. Direction B forces the 3-band model globally.
- The targeted zoom fix at `bench.css:163-164` is correctly scoped
  to `.scene-mode--detail .placement` and is not the source of the
  regression.

### Type C (scorer weight change): 0 scenes

Lane C (Task #81) baseline already used the current per-class weights;
weight changes are not the source of the regression.

### Type D (precheck behavior change): 0 scenes

Manager reverted the unauthorized `+243` line `precheck.mjs` modification
before re-running the scorecard. The current numbers are produced by the
restored `precheck.mjs`.

## Minimal revert candidates

### Candidate 1: revert `electrophoresis_bench.html` inline CSS

- File: `experiments/css_native_layout/templates/electrophoresis_bench.html`
- Lines: 8-22 inline `<style>` block + lines 72-83 DOM reorder.
- Estimated recovery: +47 points on electrophoresis_bench, removes all
  4 hard fails.
- Risk: reverts Lane E Trial 1.2 visual improvement. Safer alternative:
  add a viewport-aware CSS guard so the column-wrap only applies under
  a smaller dev viewport, not production 1920x1080.

### Candidate 2: guard the bench.css 3-band grid to detail mode

- File: `experiments/css_native_layout/styles/bench.css`
- Change: add `.scene-mode--detail` selector to the 3-band grid block
  (the rule defining `grid-template-rows: 120px 1fr 100px` plus the
  associated region backgrounds and footprint constraints).
- Estimated recovery: +58 points across 4 Type B scenes (+20 bench_basic,
  +15 staining_bench, +17 drug_dilution_plate_workspace, +6
  crowded_bench_dense).
- Risk: detail-mode scenes that currently render correctly under the
  3-band grid may need verification (only well_plate_96_zoom is in this
  category and it currently scores 92).

### Combined recovery estimate

Both reverts together: +105 points across the 5 regressed scenes,
restoring the scorecard close to or at the Lane C baseline.

## Recommendation

User decision required. Two options:

1. Apply Candidate 1 + Candidate 2. Restores scorecard to Lane C level.
   Documents Lane E Trial 1.2 as "not viewport-safe at production
   1920x1080" and re-runs it under a viewport-aware guard if visual
   value is wanted.

2. Accept the regression. Document scorecard as currently invalid
   reference; do not block NEW2 next implementation step on visual
   scorecard restoration.

Manager recommendation: option 1. Both reverts are CSS-only, in
experiment scope, reversible. Recovery is large (+105 points). Without
this, the scorecard ceases to be a usable optimization target and Lane S
monitoring is meaningless.

## Risk if not addressed

- Four Type B bench scenes remain constrained at lower quality.
- `electrophoresis_bench` remains at 0 with 4 hard fails. Cannot be
  cited as visual evidence for any NEW2 workstream.
- Lane C baseline ceases to be a reliable reference. Future scorecard
  comparisons become uninterpretable.
- Direction B rollout is effectively incomplete: the 3-band grid is
  sound for detail-mode placements but was applied too broadly.

## Cross-references

- `new1_5_layout_hardening_results.md` (Lane C baseline at lines 95-117 + 149-169).
- Commit `4d03b4b` ("I have no idea") applied bench.css + hood.css +
  instrument.css refactors and template restructures simultaneously.
- `new2_css_native_production_blocker_plan.md` (separate Workstream 2 production CSS context).
- Task #97 scorecard regression check (Lane S2).
- Task #100 Lane O-clean revert (separate metric-gaming context).

## Contract check

The proposed reverts are CSS rule and inline-style changes under
experiments/. They do NOT alter clickable-object identity, scene-object
layout-engine ownership, or material conventions. Complies with
`docs/PRIMARY_CONTRACT.md` item 3.
