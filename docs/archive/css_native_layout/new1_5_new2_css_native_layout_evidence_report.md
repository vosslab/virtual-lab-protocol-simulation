# NEW1.5 / NEW2 CSS-native layout evidence report

Purpose: short-form companion to the HTML evidence report. The HTML
carries the screenshot evidence, scorecard tables, and side-by-side
comparisons across three layers (production dispatch, static visual
scorecard, and diagnostic integrity). This Markdown is the link index,
finding list, and reproduction-command sheet.

Full HTML report: `new1_5_new2_css_native_layout_evidence_report.html`.
PDF: `new1_5_new2_css_native_layout_evidence_report.pdf`.

## Top 10 findings

- Lane R passed 7/7 on the built-app dev_smoke path; Path A production dispatch proof passed.
- Task #97 scorecard sweep regressed 5 non-well-plate scenes (bench_basic -20, staining_bench -19, drug_dilution_plate_workspace -17, crowded_bench_dense -6, electrophoresis_bench -47 with 4 hard fails).
- Unauthorized +243-line `precheck.mjs` modification was reverted; results from the modified tool are not allowed as evidence.
- Lane O prototype regex-deletion bridge was reverted; the honest 2-line CSS patch still reaches `hard_fail_count = 0` on the canonical precheck.
- Lane W identifies the `correct_target` validator preset (not the adapter, not `isTargetSatisfied`) as the click-rejection root cause; minimal patch is approximately 10 lines.
- Lane O identifies missing `max-height` under `.scene-mode--detail` as the viewport-overflow root cause; minimal patch is approximately 6 lines across `src/style.css` and `experiments/css_native_layout/styles/bench.css`.
- Lane C re-weights moved four template scenes into the top five at close; Task #97 sweep later disturbed those gains.
- Lane D `display: none` under `data-scene-density="crowded"` cleared label overlap (T3 of three trials).
- The compatibility shim in `css_native_adapter.ts` survived a Lane A overstep and a full file rewrite (Task #86, 261 canonical lines, snake_case, no forbidden casts).
- NEW1.5 produced two concrete production-code workstreams for NEW2; W2 may proceed immediately, W1 is BLOCKED on user decision over a forbidden-boundary edit.

## Recommended next work

Run the Task #97 sweep against the restored canonical `precheck.mjs` to re-attribute the five-scene regression, then land NEW2 Workstream 2 (viewport overflow CSS) under the runtime-proof workstream, keeping visual-scorecard repair work separate.

## Status summary

- Layer 1 (production dispatch): PASS (Lane R 7/7).
- Layer 2 (static visual scorecard): PARTIAL / UNSTABLE (Task #97 5-scene regression).
- Layer 3 (diagnostic integrity): REJECTED-then-restored (precheck +243 lines and render_and_dump DOM-removal both reverted).

## Key plan documents

- `new1_5_layout_hardening_results.md`
- [new1_5_layout_hardening_before_new2.md](new1_5_layout_hardening_before_new2.md)
- `new1_well_plate_96_zoom_spike_result.md`
- `new2_well_plate_adapter_rect_audit.md`
- `new2_production_viewport_overflow_audit.md`
- `new2_test_strategy.md`
- `new2_css_native_production_blocker_plan.md`
- `new2_implementation_test_matrix.md`
- [lane_r_rerender_probe_summary.md](lane_r_rerender_probe_summary.md)
- [lane_d_state_change_blocker.md](lane_d_state_change_blocker.md)

Tracked spec and tool files (canonical, post-revert):

- `experiments/css_native_layout/VISUAL_TARGETS.md`
- `experiments/css_native_layout/LAYOUT_SCORECARD.md`
- `experiments/css_native_layout/scene_class_manifest.yaml`
- `experiments/css_native_layout/score_layout.mjs`
- `experiments/css_native_layout/precheck.mjs`
- `experiments/css_native_layout/render_and_dump.mjs`

Tracked PNG assets live under `docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/` (12 files).

## Reproduction commands

- Build runtime bundle: `bash pipeline/build_runtime_bundle.sh`
- Adapter-only Playwright proof: `node tests/playwright/spike_css_native_well_plate_zoom.mjs`
- Built-app render proof (Lane R, 7/7): `node tests/playwright/spike_built_app_well_plate_zoom.mjs`
- Built-app click-target proof: `node tests/playwright/spike_built_app_click_target.mjs`
- Built-app state-change / re-render proof: `node tests/playwright/spike_built_app_rerender.mjs`
- NEW0 static-template precheck (canonical tool only): `node experiments/css_native_layout/precheck.mjs`
- NEW0 scorecard: `node experiments/css_native_layout/score_layout.mjs`
- Built-app render-and-dump (production 1920x1080, canonical tool): `node experiments/css_native_layout/render_and_dump.mjs`
- Render this report to PDF: `node tools/html_to_pdf.mjs --input docs/active_plans/new1_5_new2_css_native_layout_evidence_report.html`
