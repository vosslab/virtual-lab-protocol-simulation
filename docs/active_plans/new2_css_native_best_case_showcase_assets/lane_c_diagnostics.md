# Lane C: Diagnostics demo

This section documents the diagnostic surface that gates NEW0 / NEW2 scene
promotion. Source of truth: `experiments/css_native_layout/precheck.mjs` and
`experiments/css_native_layout/score_layout.mjs`. Reference doc:
`experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md`. Raw audit:
`test-results/new0_css_native/audit/visual_audit.md`.

## What the diagnostic catches

### Hard-fail types (4)

Any one instance blocks promotion. Must be zero.

- `clipped_artwork`: an SVG `img` extends outside its parent `.object-graphic`
  bounding box by more than 2px. Example: every NEW0 scene in the audit has 0
  clipped instances (column "Clipped" = 0 across all 10 scenes including
  `crowded_bench_dense`, verdict WARN; hard-fail subscore PASS).
- `off_page`: any placement bounding box falls outside the 1920x1080 viewport.
  Example: `electrophoresis_bench` reports 0 off-page placements (verdict
  WARN driven by advisory metrics, not off-page).
- `svg_svg_overlap`: two SVG artwork bounding boxes intersect by more than
  50 sq px. Example: `drug_dilution_workspace_dense` reports 0 SVG-SVG
  overlaps despite being the densest composition scene.
- `region_overflow`: a placement bounding box extends beyond its parent
  `.region` by more than 4px. Example: `staining_bench` reports 0
  region-overflow flags; the WARN verdict comes from primary-ratio and
  aspect mismatches.

### Advisory warn types (5)

Flagged but non-blocking. Each requires a documented rationale when present.

- `label_label_overlap`: two `.placement-label` spans overlap by more than
  4 sq px. Example: `electrophoresis_bench` reports 1 pair
  (`center_electrophoresis_tank` vs `center_electrode_module`).
- `svg_label_overlap`: an SVG bounding box overlaps a placement label by
  more than 10 sq px. Example: not currently flagged in any NEW0 scene;
  metric is wired but quiet on the present 10-scene set.
- `region_whitespace`: an occupied region is more than 80% empty by area.
  Example: composition scenes with WARN verdict (`crowded_bench_dense`,
  `drug_dilution_workspace_dense`) reflect low primary fill but template
  scenes are exempted via `PASS_TEMPLATE`.
- `primary_object` ratio: the `data-primary="true"` placement covers less
  than 25% of scene area (standard) or less than 70% (zoom). Example:
  `crowded_bench_dense` reports primary ratio 0.6% vs 25% threshold;
  `well_plate_96_zoom` is the only PASS, with primary above zoom threshold.
- `artwork_integrity`: aspect mismatch above 10%, scale factor below 0.5,
  or scale factor above 3 between natural and rendered SVG. Example:
  `crowded_bench_dense` flags `center_staining_tray` at 325.9% rendered
  area of natural; `electrophoresis_bench` flags
  `center_serological_pipette` at 1076.5% aspect mismatch.

INFO-only metrics (not WARN, reported for traceability):
`scene_whitespace`, `largest_empty_band`, `supporting_distance` (currently
unreliable for multi-region Direction C scenes).

## What scoring measures

`score_layout.mjs` reads `visual_audit.json` and `sizing_manifest.json`
and emits a per-scene scorecard. Scenes are bucketed by class
(`template`, `composition`, `instrument_heavy`, ...), each class carrying
its own weight table over the metric set: `primary_area_ratio`,
`label_overlap`, `scene_occupied`, `support_distance`, `balance`,
`region_filling`, `label_readability`, `aspect_ratio_fidelity`,
`primary_prominence`. Templates zero out the density-driven weights
(`scene_occupied`, `region_filling`, `support_distance`,
`primary_area_ratio`) so sparse skeleton scenes are not penalized for
their design. Composition scenes weight `primary_area_ratio` (0.25),
`support_distance` (0.20), and `label_overlap` (0.15) most. Scores are
normalized within class so the scorecard ranks scenes against peers of
the same class, not against the full pool.

## Bad evidence rejected

Two metric-gaming attempts surfaced during NEW2 lane work and were both
reverted. They are documented here so they cannot recur as silent
"improvements".

- Lane O-prototype DOM-strip patch: `precheck.mjs` was modified by +243
  lines to inject a regex-based DOM-removal filter that hid the densest
  placements before the precheck snapshot was taken. This made the
  affected scenes look like they had fewer SVG-SVG overlaps and less
  region overflow than the actual rendered layout produced. Reverted.
- Render-time placement-count post-filter: `render_and_dump.mjs` had a
  post-render filter added that quietly dropped placements with certain
  attribute patterns from the dump, shrinking the audited population.
  Reverted, and a bridge-integrity guardrail was added to
  `render_and_dump.mjs` as a runtime assertion: if the rendered
  placement count drops below the YAML-declared placement count for the
  scene, the run aborts before writing the audit JSON.

Both patches are INVALID evidence patterns, not successes. They lowered
hard-fail counts by hiding inputs from the metric, which is metric
gaming. The bridge-integrity guardrail exists specifically to make the
DOM-strip and post-filter variants fail loudly the next time someone
tries them.

## Annotated screenshot

Annotated screenshot not regenerated this round. Per task constraint,
no new annotation infrastructure was created. Existing annotated PNGs
from the NEW0 audit run remain available under
`test-results/new0_css_native/audit/` (for example
`electrophoresis_bench_annotated.png` and
`drug_dilution_plate_workspace_annotated.png`), produced by the prior
precheck render pass.
