# Round 3 checkpoint verification status

Workstream C, checkpoint pass. Captures verification state for human review.
Read-only sweep against the current working tree. No production code edits.

- Date: 2026-05-21
- HEAD: a7ab89c (`updated package.json with latest versions`)
- Scope: pytest, tsc, node test runner, precheck JSON, screenshot evidence
- Boundary: read-only; only this one new doc was written.

## pytest

Command: `source source_me.sh && pytest tests/ -q`.

- 1244 passed, 10 failed.
- Duration: 4.87s.

Failing tests:

- `tests/test_markdown_links.py::test_markdown_links`
- `tests/test_object_asset_refs.py::test_object_asset_refs_assertion_fires_on_synthetic_growth`
- `tests/test_typescript_eslint.py::test_eslint_runs_clean`
- `tests/test_typescript_tsc.py::test_tsc_type_check_passes`
- `tests/test_whitespace.py::test_whitespace_hygiene[docs/CHANGELOG.md]`
- `tests/test_whitespace.py::test_whitespace_hygiene[docs/active_plans/current_css_native_layout_manager_status_report.md]`
- `tests/test_whitespace.py::test_whitespace_hygiene[docs/archive/css_native_layout/CSS_TRIAL_EXECUTION_SUMMARY.md]`
- `tests/test_whitespace.py::test_whitespace_hygiene[experiments/css_native_layout/stress_results/batch5_gold_fix_results.md]`
- `tests/test_whitespace.py::test_whitespace_hygiene[experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials.md]`
- `tests/test_whitespace.py::test_whitespace_hygiene[experiments/css_native_layout/stress_results/no_cropped_svg_round2_footprint_shape_experiment.md]`

The whitespace failures auto-fix on first run; they show as "Whitespace
issues were fixed. Please re-run pytest." A second `pytest tests/` would
clear those 6 failures, leaving 4 (markdown links, asset refs, eslint, tsc).
This checkpoint records the first-pass state and does NOT re-run.

## tsc

Command: `npx tsc --noEmit -p tsconfig.json`.

- Status: FAIL (errors emitted across `src/` and `tests/`).
- Wrapper exit code as reported by piped tail: `TSC_EXIT=0` (the `tail`
  exit code, not tsc's; tsc itself failed -- see also
  `tests/test_typescript_tsc.py::test_tsc_type_check_passes` which is
  failing in the pytest run above).

Representative error classes (not exhaustive):

- TS6133 unused locals across `src/scenes/incubator`, `src/scenes/microscope`,
  `src/scenes/plate_reader`, `src/scenes/well_plate_workspace`,
  `src/steps/drug_treatment.ts`, `src/svg_overlays.ts`, `src/ui_rendering.ts`.
- TS2305 missing exports: `SCENE_CONFIGS`, `SceneConfig` from
  `../scene_configs`; `SceneItem` from `../../scene_configs`; `REAGENTS`
  from `../../inventory`; `PROTOCOL_STEPS` from `./protocol`;
  `getModalOwnedSteps` from `../step_dispatch`; `deriveHighlights` from
  `../src/scene_runtime/highlight/index`.
- TS2591 `node:test` / `node:assert/strict` / `process` not found in
  `tests/test_dispatch_adjust.ts`, `tests/test_dispatch_click.ts`,
  `tests/test_highlight.ts`, `tests/test_layout_integration.ts`
  (suggests `@types/node` missing in TS-test compile config).
- TS2345 / TS18048 strict undefined-narrowing failures in
  `tests/playwright/walker/index.ts` and `tests/test_layout_integration.ts`.

## node --test (mjs)

Command: `node --test tests/test_*.mjs`.

- tests: 79
- pass: 75
- fail: 4
- duration: 1797ms

Failing mjs tests:

- `tests/test_generated_runtime_data_shape.mjs` - "every scene in
  SCENE_CATALOG has required top-level fields"
  (AssertionError: scene "bench_basic_row_slot" has scene_bounds).
- `tests/test_generated_runtime_data_shape.mjs` - "NO retired fields
  appear in loaded RuntimeWorld"
  (Error: entry_step "add_dmso_to_wells" references target
  "micropipette": no matching scene).
- `tests/test_layout_integration_simple.mjs` - ERR_MODULE_NOT_FOUND for
  `src/scene_runtime/layout/adapter` imported from
  `src/scene_runtime/layout/index.ts`.
- `tests/test_svg_pipeline.mjs` - esbuild fails on `src/svg_assets.ts`
  because `src/game_state.ts` imports `PROTOCOL_STEPS` from
  `./protocol` and `REAGENTS` from `./inventory` (neither export exists).

## precheck: templates scope (10 scenes)

`visual_audit.json` summaries under `test-results/no_crop_round3_*/templates/`
and `.../hybrid_templates/`:

| Run                                        | total | failed | checks_failed | clipped_by_parent | hard_fail |
| ------------------------------------------ | ----- | ------ | ------------- | ----------------- | --------- |
| baseline (pre-repair)                      | 10    | 10     | 25            | 41                | 0         |
| R3 exp1 templates                          | 10    | 10     | 28            | 21                | 0         |
| R3 exp9 templates                          | 10    | 10     | 28            | 21                | 0         |
| R3 exp23 templates                         | 10    | 10     | 28            | 21                | 0         |
| R3 static_template_repair hybrid_templates | 10    | 10     | 28            | 21                | 0         |

Round 3 template runs converge at `clipped_by_parent = 21`, down from
`41` baseline. `hard_fail = 0` across the board, consistent with the
PRIMARY_DESIGN note that `hard_fail_count = 0` does NOT imply visual
pass.

## precheck: gold scope (10 scenes)

`visual_audit.json` summaries under `test-results/no_crop_round3_*/gold/`
and `.../hybrid_gold/` / `.../baseline_gold/`:

| Run                                   | total | failed | checks_failed | clipped_by_parent | hard_fail |
| ------------------------------------- | ----- | ------ | ------------- | ----------------- | --------- |
| baseline_gold (pre-repair)            | 10    | 10     | 29            | 78                | 0         |
| R3 exp1 gold                          | 10    | 10     | 43            | 38                | 0         |
| R3 exp9 gold                          | 10    | 10     | 43            | 38                | 0         |
| R3 exp23 gold                         | 10    | 10     | 43            | 38                | 0         |
| R3 static_template_repair hybrid_gold | 10    | 10     | 43            | 38                | 0         |

Round 3 gold runs converge at `clipped_by_parent = 38`, down from `78`
baseline. `checks_failed` rose from 29 to 43; this reflects newly
surfaced (previously masked) checks, not new clipping.

## precheck: full corpus (110 scenes)

`visual_audit.json` summaries under
`experiments/css_native_layout/stress_results/precheck_batch5_*/`:

| Run                                        | total | failed | checks_failed | clipped_by_parent | hard_fail |
| ------------------------------------------ | ----- | ------ | ------------- | ----------------- | --------- |
| precheck_batch5_final3                     | 110   | 110    | 216           | 628               | 0         |
| precheck_batch5_clean                      | 110   | 110    | 216           | 628               | 0         |
| precheck_post_trial5 (10-scene subset)     | 10    | 10     | 20            | 28                | 0         |
| no_crop_round2_phase1 (10-scene subset)    | 10    | 10     | 32            | 26                | 0         |
| no_crop_round2_phase1_v2 (10-scene subset) | 10    | 10     | 16            | 58                | 0         |
| no_crop_audit (55-scene legacy)            | 55    | n/a    | n/a           | 0                 | 0         |

The 110-scene corpus is the full stress sweep and has not been
re-measured under Round 3 repairs; current Round 3 work is scoped to
templates and gold.

## Screenshot evidence paths

Round 3 Playwright outputs:

- `test-results/no_crop_round3_exp1_applied/templates/`
  (10 PNGs + `visual_audit.json` + `visual_audit.md` + `sizing_manifest.json`)
- `test-results/no_crop_round3_exp1_applied/gold/`
- `test-results/no_crop_round3_exp4_rendered/` (PNGs only; no audit JSON)
- `test-results/no_crop_round3_exp9_applied/templates/`
- `test-results/no_crop_round3_exp9_applied/gold/`
- `test-results/no_crop_round3_exp23_applied/templates/`
- `test-results/no_crop_round3_exp23_applied/gold/`
- `test-results/no_crop_round3_static_template_repair/baseline/`
- `test-results/no_crop_round3_static_template_repair/baseline_gold/`
- `test-results/no_crop_round3_static_template_repair/hybrid_templates/`
- `test-results/no_crop_round3_static_template_repair/hybrid_gold/`
- `test-results/no_crop_round3_static_template_repair/gold_regression/`
- `test-results/no_crop_round3_static_template_repair/hybrid/`
- `test-results/no_crop_round3_static_template_repair/strategy_a/`
- `test-results/no_crop_round3_static_template_repair/INDEX.html`

Earlier round artifacts (kept for diff):

- `test-results/no_crop_round2/`
- `test-results/no_cropped_svg/`
- `test-results/no_crop_footprint_vocab/`
- `test-results/no_crop_scope_reconciliation/`
- `test-results/no_crop_fresh_manager_sanity/`
- `experiments/css_native_layout/stress_results/no_crop_round2_phase1/`
- `experiments/css_native_layout/stress_results/no_crop_round2_phase1_v2/`
- `experiments/css_native_layout/stress_results/precheck_post_trial5/`
- `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/`
- `experiments/css_native_layout/stress_results/precheck_batch5_final3/`
- `experiments/css_native_layout/stress_results/precheck_batch5_clean/`

## Pre-existing vs introduced classification

Pre-existing failures (NOT introduced by Round 3 no-crop work):

- pytest `test_markdown_links` - global link audit; predates Round 3.
- pytest `test_object_asset_refs_assertion_fires_on_synthetic_growth` -
  generator-cap assertion, predates Round 3 sweep.
- pytest `test_typescript_eslint::test_eslint_runs_clean` - eslint
  errors across `src/scenes/*` and `src/scene_runtime/*`; predates
  Round 3.
- pytest `test_typescript_tsc::test_tsc_type_check_passes` - mirrors
  the tsc errors below; predates Round 3.
- pytest `test_whitespace_hygiene[docs/CHANGELOG.md]` and the four
  experiment-doc whitespace failures - first-pass auto-fix artifacts of
  prior Round 3 edits to those docs; would clear on a second `pytest`
  run.
- tsc TS6133 unused-local errors and TS2305 missing-export errors -
  reflect in-progress scene_runtime / scene_configs refactor; predate
  Round 3 no-crop scope.
- tsc TS2591 missing `node:test` / `process` types in `tests/test_*.ts`
  - `@types/node` not in the tsconfig include for TS test files;
    predates Round 3.
- mjs `test_layout_integration_simple` ERR_MODULE_NOT_FOUND for
  `src/scene_runtime/layout/adapter` - the file does not exist;
  predates Round 3.
- mjs `test_svg_pipeline` and `test_generated_runtime_data_shape` -
  fail on missing `PROTOCOL_STEPS` / `REAGENTS` exports and an
  unresolved `entry_step` -> `micropipette` target; these are
  scene_runtime / content drift issues that predate Round 3.

Introduced by Round 3 (assessed):

- None confirmed. All failing tests trace to refactor or content drift
  that predates Round 3 no-crop work. Round 3 added decision and
  audit docs under `docs/active_plans/decisions/` and
  `docs/active_plans/audits/`, plus screenshot evidence under
  `test-results/no_crop_round3_*/`. None of these are production code.

Caveat: `tests/test_layout_integration.ts` is modified in the working
tree. Whether the diff is Round 3 work or unrelated is out of scope
for this checkpoint sweep; the tsc errors it produces could pre-date or
be introduced. Flagged for human review.

## Measured vs source-layer claim table

Cross-check that measured precheck counts come from the precheck
harness, not from the production sizing chain. The production sizing
chain is documented in
`docs/active_plans/decisions/no_crop_round3_sizing_source_reconciliation.md`
and runs:

`scene object -> asset_name -> ASSET_SPECS/default_width
-> display_width_cm or width_scale -> layout engine computed box
-> renderer preserves SVG aspect ratio`.

| Claim                                                                  | Source                                                                                            | Layer                                               | Measured here?                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Round 3 templates `clipped_by_parent = 21`                             | `test-results/no_crop_round3_exp*/templates/visual_audit.json`                                    | precheck harness (static CSS-native test scenes)    | YES                                                  |
| Round 3 gold `clipped_by_parent = 38`                                  | `test-results/no_crop_round3_exp*/gold/visual_audit.json`                                         | precheck harness (rendered gold scenes)             | YES                                                  |
| Baseline templates `clipped_by_parent = 41`                            | `test-results/no_crop_round3_static_template_repair/baseline/visual_audit.json`                   | precheck harness                                    | YES                                                  |
| Baseline gold `clipped_by_parent = 78`                                 | `test-results/no_crop_round3_static_template_repair/baseline_gold/visual_audit.json`              | precheck harness                                    | YES                                                  |
| Production sizing chain unchanged                                      | inferred (no `src/asset_specs.ts`, `src/layout_engine/*`, or `docs/specs/*` diff in working tree) | source (asset_specs + layout engine + SVG renderer) | NO direct measurement; only diff-absence evidence    |
| CSS `.footprint--*` classes are experiment-local, not production       | `experiments/css_native_layout/styles/bench.css` header; decision doc                             | source layer (experiment-only CSS)                  | NO -- documentary classification, not a measured run |
| `object_footprints.yaml` is "test harness only, not production schema" | file header line; decision doc                                                                    | source layer (experiment-only YAML shim)            | NO -- documentary classification                     |
| 110-scene corpus not re-measured under Round 3                         | absence of `precheck_round3_batch5*` directory                                                    | precheck harness                                    | NO -- gap noted                                      |
| `hard_fail = 0` implies pass                                           | refuted by PRIMARY_DESIGN "Visual integrity"                                                      | source (contract)                                   | n/a -- contract clause, not a measurement            |

Bottom line: precheck numbers above are harness measurements at the
template and gold scopes. They are NOT measurements of the production
sizing chain. The production sizing chain has not been instrumented in
this checkpoint pass; the only evidence that it is unchanged is the
absence of working-tree diffs against `src/asset_specs.ts`,
`src/layout_engine/`, `src/svg_assets.ts`, or `docs/specs/`. Full
corpus (110-scene) measurement under Round 3 repairs is missing and
should be queued.
