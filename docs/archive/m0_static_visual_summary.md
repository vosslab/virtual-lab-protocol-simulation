# M0 static visual capability summary

STATIC EXPERIMENT EVIDENCE. Date: 2026-05-22.

Lane E (visual capability summary) for the layout-manager-clean-start
manager. Documentation-only. No code, CSS, HTML, SVG, JS, or YAML is
modified by this report. The numbers below are aggregated from the
upstream M0 lanes (A, B, C, D, K, M) under
`test-results/m0_static_summary/` and the two prior reports under
`docs/active_plans/reports/`.

## 1. Status banner

STATIC EXPERIMENT EVIDENCE. Not runtime evidence. `src/` empty
post-2026-05-22 reset; runtime dispatch path is broken. Static-template
diagnostics still work.

Concretely:

- `src/` is empty (the 2026-05-22 reset wiped every TypeScript module).
- There is no built runtime bundle, no `dist/main.js`, no
  `SceneRuntime`, no click dispatcher.
- The diagnostic scripts under `experiments/css_native_layout/` do not
  import from `src/`, so they still run. They render the 10
  hand-authored static HTML templates and audit the rendered DOM.
- Every metric below describes those static templates. None of it
  describes built-application behavior.

## 2. What works

- `experiments/css_native_layout/precheck.mjs` runs end-to-end against
  the 10 tracked top-level templates under
  `experiments/css_native_layout/templates/*.html` in 9.180 s wall time
  (single Playwright invocation, viewport 1920x1080).
- `experiments/css_native_layout/score_layout.mjs` aggregates precheck
  output into per-scene-class-weighted metrics in under 100 ms.
- `experiments/css_native_layout/no_crop_audit/inspect.mjs` runs
  standalone (exit 0); it does not import anything under `src/` and is
  unaffected by the reset.
- 10 PNG screenshots are produced at 1920x1080, one per template, under
  `test-results/m0_static_summary/precheck/`.
- The viewport sweep (1200x900, 1440x1000, 1920x1080) over the same 10
  templates completes in 17.9 s. 1920x1080 is the best viewport per
  Lane K's `SWEEP_TABLE.md`.
- `test-results/m0_static_summary/INDEX.html` renders a 10-card grid of
  the precheck PNGs alongside per-scene score and verdict.

## 3. What is broken

- `src/` is empty, so the runtime bundle cannot be built. That blocks
  `render_and_dump.mjs` (the bridge from the runtime bundle into static
  HTML), which blocks built-app precheck, which blocks any Playwright
  runtime spike.
- `pytest tests/` cannot start; `tests/conftest.py` imports
  `pipeline/build_new_protocol_data.py`, which does not exist in the
  current tree.
- `experiments/css_native_layout/score_layout.mjs` has no `--audit` or
  `--out` flags; the input and output paths are hardcoded relative to a
  fixed location. Lane B worked around this by copying outputs into
  `test-results/m0_static_summary/scorecard/` after the run.
- `experiments/css_native_layout/capture.mjs` (a 2-viewport
  direction-comparison driver) is not used for M0. It is gitignored and
  was supplanted by the Lane K viewport-sweep script
  `test-results/m0_static_summary/viewport_sweep/_sweep.mjs`.

## 4. Best 5 screenshots

Selected from the 10 templates by Lane A precheck hard-fail counts and
Lane B aggregate scores. `well_plate_96_zoom` is top per the brief's
required selection criteria (score 92, 1 hard fail in the extended
artwork-integrity count from Lane M; 0 in the Lane A column-set count).
`hood_basic` is in the top 5 per the brief (score 60, 0 hard fails in
the Lane A column-set count). The remaining three are chosen on the
lowest hard-fail count and best primary_ratio. All PNG paths resolve
on disk.

| Rank | Scene | Scene class | Score | Lane A HF | Lane M total HF | PNG path | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | well_plate_96_zoom | zoom_detail | 92 | 0 | 1 | test-results/m0_static_summary/precheck/well_plate_96_zoom.png | Only PASS scene. Primary ratio 92.0% against 25% threshold; single residual hard fail is a 6.49% plate aspect distortion at the zoom card. |
| 2 | hood_basic | template | 60 | 0 | 3 | test-results/m0_static_summary/precheck/hood_basic.png | Sole MARGINAL scene. Zero Lane A column hard fails. Three Lane M aspect distortions (worst is p1000_pipette at 480%). No off_page or clipped_artwork. |
| 3 | microscope_basic | template | 0 | 1 | 2 | test-results/m0_static_summary/precheck/microscope_basic.png | Lowest Lane M total HF among the FAIL scenes (2). Template-mode scene; primary detection skipped. Single off_page + one aspect distortion. |
| 4 | cell_counter_basic | template | 0 | 1 | 3 | test-results/m0_static_summary/precheck/cell_counter_basic.png | Same single off_page + clip pattern as microscope_basic, plus one cell_counter aspect distortion at 19.1%. |
| 5 | bench_basic | template | 0 | 1 | 4 | test-results/m0_static_summary/precheck/bench_basic.png | Lowest hard-fail count among scenes that declare equipment in the front_tools region. Pipette and plate aspect distortion are both borderline (15.6% and 5.34%). |

Lane M total HF includes the extended `artwork_integrity` hard fails
(`clipped_by_parent` HARD_FAIL and `aspect_distorted` HARD_FAIL) that
are not counted in the Lane A column-set.

## 5. Worst 5 screenshots

Selected from the bottom of the Lane M aggregate table by `total HF`.
All PNG paths resolve on disk.

| Rank | Scene | Scene class | Lane M total HF | Lane A HF | PNG path | One-line summary |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | electrophoresis_bench | instrument_heavy | 24 | 8 | test-results/m0_static_summary/precheck/electrophoresis_bench.png | Worst scene. 7 off_page + 1 region_overflow + 3 svg_label_overlap + 7 clipped_by_parent + 6 aspect_distorted. Tank overflows top by 171px; front_tools row overflows bottom; serological_pipette at 253% aspect distortion. |
| 9 | drug_dilution_workspace_dense | dense_clutter | 19 | 4 | test-results/m0_static_summary/precheck/drug_dilution_workspace_dense.png | 4 off_page + 4 clipped_by_parent + 10 aspect_distorted. tube_rack_24 placeholder leak; tip_box aspect 45.65% wrong; tube_rack_2 at 45.31%. |
| 8 | crowded_bench_dense | dense_clutter | 14 | 5 | test-results/m0_static_summary/precheck/crowded_bench_dense.png | 3 off_page + 2 region_overflow + 3 clipped_by_parent + 6 glassware aspect distortions at 5.16% each. front_tools region exceeds 260px budget by 34px. |
| 7 | drug_dilution_plate_workspace | composition | 11 | 2 | test-results/m0_static_summary/precheck/drug_dilution_plate_workspace.png | 2 off_page + 2 clipped_by_parent + 6 aspect_distorted. tool_p200 and waste_container clip past viewport bottom; tip_box 45.65% aspect distortion. |
| 6 | staining_bench | composition | 8 | 3 | test-results/m0_static_summary/precheck/staining_bench.png | 2 off_page + 1 region_overflow + 2 clipped_by_parent + 3 aspect_distorted. front_tools row clipped; primary staining_tray at 3.4% ratio. |

## 6. Diagnostic measurements (aggregate)

Numbers below come from
`test-results/m0_static_summary/scorecard/scorecard.json`,
`test-results/m0_static_summary/precheck/visual_audit.json`, Lane M's
extended count in `docs/active_plans/reports/m0_static_failed_scenes.md`,
and Lane D's category rollup in
`docs/active_plans/reports/m0_static_svg_completeness.md`.

| Metric | Count | Source |
| --- | --- | --- |
| Scenes processed | 10 | Lane A precheck + Lane B scorecard |
| Verdicts FAIL | 10 | Lane B (8 are score 0 hard-fail FAIL; the 2 non-zero scores are PASS and MARGINAL per scorecard summary but the per-scene precheck verdict is FAIL on all 10) |
| Aggregate layout score | 152 / 1000 | Lane B scorecard.md ranked table |
| Off-page placements | 21 | Lane A HARD_FAIL_TABLE totals |
| Region overflows | 4 | Lane A HARD_FAIL_TABLE totals |
| SVG-label overlaps | 3 (all in electrophoresis_bench) | Lane A + Lane M cross-reference |
| Clipped artwork (Lane A column-set) | 0 | Lane A HARD_FAIL_TABLE totals |
| SVG-SVG overlaps | 0 | Lane A HARD_FAIL_TABLE totals |
| Label-label overlaps | 0 | Lane A HARD_FAIL_TABLE totals |
| `clipped_by_parent` HARD_FAIL (Lane M extended) | 21 | Lane M aggregate table |
| `aspect_distorted` HARD_FAIL (Lane M extended) | 38 | Lane M aggregate table |
| Placeholder asset references | 2 (`microtube_rack_24_placeholder.svg` in drug_dilution_plate_workspace and drug_dilution_workspace_dense) | Lane A + Lane D |
| WRONG_ASSET references (Lane D) | 14 | Lane D aggregate category table |

The aggregate score 152/1000 follows the scorer's contract: any scene
with `hard_fails > 0` is floored to 0 regardless of weighted metric
performance. Only `well_plate_96_zoom` (92) and `hood_basic` (60) clear
the zero floor.

## 7. Exact commands used

All wall times are single-invocation, headless Chromium under
Playwright.

### Lane A precheck (9.180 s)

```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/*.html' \
  --out test-results/m0_static_summary/precheck \
  --annotate on
```

Produced: `visual_audit.json`, `visual_audit.md`,
`sizing_manifest.json`, `HARD_FAIL_TABLE.md`, and 10 PNGs under
`test-results/m0_static_summary/precheck/`. The `--annotate on` flag
warned that the optional Python annotation helper `_temp_annotate.py`
is absent; core artifacts were still produced.

### Lane B scorecard (under 100 ms)

```
node experiments/css_native_layout/score_layout.mjs
```

Reads `test-results/new0_css_native/audit` (the path is hardcoded in
the script). Outputs were copied to
`test-results/m0_static_summary/scorecard/scorecard.{json,md}` and
the human-readable `SCORECARD_SUMMARY.md` was authored from
`scorecard.json` in the same lane.

### Lane D no-crop audit (standalone, no `src/` dependency)

```
node experiments/css_native_layout/no_crop_audit/inspect.mjs
```

Reported 16 cropping or distortion incidents across the same 10
templates. JSON output was copied verbatim to
`test-results/m0_static_summary/no_crop_audit/no_crop_audit_results.json`.
The SVG completeness rollup itself was assembled by a manual fallback
that paired every `<img src="...svg">` reference with its enclosing
`data-object-name` and categorized against the assets tree under
`assets/equipment/`.

### Lane K viewport sweep (17.9 s)

```
node test-results/m0_static_summary/viewport_sweep/_sweep.mjs
```

Renders each of the 10 templates at 1200x900, 1440x1000, and
1920x1080. Wrote 30 PNGs plus 30 JSON files (10 templates x 3
viewports = 60 artifacts) and `SWEEP_TABLE.md`.

## 8. Output paths

All paths are relative to repo root. Every listed file exists on disk
at the time of this report; the PNGs were verified with `ls -la`.

- `test-results/m0_static_summary/precheck/visual_audit.json`
- `test-results/m0_static_summary/precheck/visual_audit.md`
- `test-results/m0_static_summary/precheck/sizing_manifest.json`
- `test-results/m0_static_summary/precheck/HARD_FAIL_TABLE.md`
- `test-results/m0_static_summary/precheck/bench_basic.png`
- `test-results/m0_static_summary/precheck/cell_counter_basic.png`
- `test-results/m0_static_summary/precheck/crowded_bench_dense.png`
- `test-results/m0_static_summary/precheck/drug_dilution_plate_workspace.png`
- `test-results/m0_static_summary/precheck/drug_dilution_workspace_dense.png`
- `test-results/m0_static_summary/precheck/electrophoresis_bench.png`
- `test-results/m0_static_summary/precheck/hood_basic.png`
- `test-results/m0_static_summary/precheck/microscope_basic.png`
- `test-results/m0_static_summary/precheck/staining_bench.png`
- `test-results/m0_static_summary/precheck/well_plate_96_zoom.png`
- `test-results/m0_static_summary/scorecard/scorecard.json`
- `test-results/m0_static_summary/scorecard/scorecard.md`
- `test-results/m0_static_summary/scorecard/SCORECARD_SUMMARY.md`
- `test-results/m0_static_summary/INDEX.html`
- `test-results/m0_static_summary/viewport_sweep/1200x900/` (10 PNG + 10 JSON)
- `test-results/m0_static_summary/viewport_sweep/1440x1000/` (10 PNG + 10 JSON)
- `test-results/m0_static_summary/viewport_sweep/1920x1080/` (10 PNG + 10 JSON)
- `test-results/m0_static_summary/viewport_sweep/SWEEP_TABLE.md`
- `test-results/m0_static_summary/viewport_sweep/_sweep.mjs`
- `test-results/m0_static_summary/no_crop_audit/no_crop_audit_results.json`
- docs/active_plans/reports/m0_static_svg_completeness.md
- docs/active_plans/reports/m0_static_failed_scenes.md

## 9. What cannot be tested because src/ is gone

Each bullet names a capability the upstream tests would normally cover
but cannot exercise today because the runtime is absent.

- Runtime click dispatch. No `SceneRuntime` exists; no `compose_scene`,
  no event router, no click-target binding. A static PNG cannot prove
  click behavior.
- `ObjectStateChange` material updates. The protocol primitive that
  mutates `material_name`, `material_volume`, `held_material_name`, and
  `held_material_volume` cannot run.
- Validator preset hierarchical-target matching. Without a runtime,
  `correct_target`, `correct_choice`, `target_with_value`,
  `sequence_complete`, and `final_state_matches` cannot evaluate.
- Production 1920x1080 `well_plate_96_zoom` rect overflow. The runtime
  rect probe (`experiments/css_native_layout/well_plate_rect_probe/probe.mjs`)
  needs the built bundle; the static template-only run does not
  reproduce the runtime SVG rect coordinates for A1, E7, H12.
- Walker / Playwright spike runtime proofs. Visible-UI walkthroughs
  require the built app served from `dist/`; `dist/` is empty.
- Layout adapter recompute on state change. The CSS-native adapter spike
  (formerly `src/scene_runtime/layout/css_native_adapter.ts`) is gone;
  recompute behavior on object-state change is unobservable.
- Material setter primitives. The PROTOCOL_SPEC material setter family
  (`set_material_volume`, `transfer_material`, derived state flow) is
  not callable without `src/`.
- Cross-scene `SceneChange`. The protocol primitive that transitions
  scene context requires the runtime; only a single static template
  can be rendered at a time.

## 10. Next implementation target

The architecture extraction plan
docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md
lays out milestones M0 through M6 for rebuilding the production layout
manager under `src/scene_runtime/layout/`. Lane E recommends M1 of
that plan, scoped narrowly to two CSS-only fixes that do not need
`src/` rebuilt and that produce the largest measurable static-evidence
delta against the M0 baseline.

Lane M root cause 4.1 (front_tools region height) is the dominant
multi-scene defect. Per Lane M's `5.1` "Easiest recoveries", a single
CSS change to `front_tools` (reduce region height OR move tall tool
cards out of `front_tools`) is forecast to recover approximately 17
off_page entries and approximately 21 `clipped_by_parent` HARD_FAIL
entries across bench_basic, crowded_bench_dense,
drug_dilution_plate_workspace, drug_dilution_workspace_dense,
electrophoresis_bench, and staining_bench.

Lane M root cause 4.3 (aspect distortion is repo-wide) is the dominant
single-class defect. Per Lane M's `5.2` "Per-asset card resizing",
resizing pipette, tip_box, and glassware cards so each card aspect
matches the natural SVG aspect is forecast to recover approximately 38
`aspect_distorted` HARD_FAIL entries across 9 of 10 scenes.

Both fix surfaces are pure CSS edits under
`experiments/css_native_layout/styles/` and pure card-dimension changes
inside the template HTML; neither requires `src/` to be repopulated.
Both produce measurable deltas on the next precheck + scorecard run.

Combined upper-bound recovery: up to 17 of 21 off_page hard fails, up
to 21 of 21 `clipped_by_parent` extended hard fails, and up to 38 of
38 `aspect_distorted` extended hard fails. The 89 total Lane M hard
fails could drop to a residual on the order of 10 to 15 (the
electrophoresis tank top-clip at y=-217, the three center-cluster
svg_label_overlap entries, the placeholder leak in two scenes, and the
microscope wrong-asset). That residual maps cleanly onto the Lane M
section 5.3 per-scene targeted fixes and the section 5.4 pedagogy
review, neither of which is part of M1.

## 11. Files read

Top references consulted while writing this report:

- `test-results/m0_static_summary/scorecard/scorecard.md`
- `test-results/m0_static_summary/scorecard/SCORECARD_SUMMARY.md`
- `test-results/m0_static_summary/precheck/HARD_FAIL_TABLE.md`
- `test-results/m0_static_summary/viewport_sweep/SWEEP_TABLE.md`
- `docs/active_plans/reports/m0_static_failed_scenes.md`
- `docs/active_plans/reports/m0_static_svg_completeness.md`
- `docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md`
- `docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md`
- `docs/REPO_STYLE.md`, `docs/MARKDOWN_STYLE.md`, `AGENTS.md`
- Filesystem listings of
  `test-results/m0_static_summary/precheck/*.png` and the subdirectories
  under `test-results/m0_static_summary/`.
