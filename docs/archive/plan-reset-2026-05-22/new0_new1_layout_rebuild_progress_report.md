# NEW0 / NEW1 layout rebuild progress

Purpose: short-form companion to the HTML progress report. The HTML carries
the screenshot evidence, diagnostic tables, and side-by-side comparisons.
This Markdown is the link index and reproduction-command sheet.

Current recommendation: continue Path A. Lane R (re-render proof) and
Lane P (precheck bridge on built output) are in flight as the two
remaining round-2 follow-ups. No contract amendment, no coordinate
solver, no forbidden-file edits required.

Full report: `new0_new1_layout_rebuild_progress_report.html`

Status summary:

- NEW0 reproducible evidence package: PASS.
- NEW0 stabilization (zoom fix, scene-class thresholds, scorecard): PASS.
- NEW1 path selection (A vs B vs C): Path A selected.
- NEW1 Lane 0 overflow fix: PASS.
- NEW1 Lane A bundle flag: PASS.
- NEW1 Lane B built-app render: PASS.
- NEW1 Lane C click target reaches production validator: PASS.
- NEW1 Lane D ObjectStateChange + re-render: PARTIAL.
- NEW1 Lane E precheck on built output: BLOCKED, deferred to Lane P.

Key plan documents:

- `new0_reproducible_evidence_package.md`
- `new0_stabilization_continuation.md`
- `new1_spike_path_comparison.md`
- [new1_well_plate_96_zoom_spike_result.md](new1_well_plate_96_zoom_spike_result.md)
- `new1_well_plate_96_zoom_dev_smoke_wiring.md`
- `lane_d_state_change_blocker.md`

Diagnostic artifacts (generated, gitignored):

- `test-results/new0_css_native/stabilized/visual_audit.md`
- `test-results/new0_css_native/scorecard/scorecard.md`
- `test-results/new0_css_native/contact_sheets/`
- `test-results/new1_spike/spike_run_summary.json`

Tracked scorecard specification:

- LAYOUT_SCORECARD.md

Tracked HTML assets copied for this report live under
`docs/active_plans/new0_new1_layout_rebuild_assets/` and are referenced
directly by the HTML report.

Regenerate evidence:

- Build runtime bundle: `bash pipeline/build_runtime_bundle.sh`
- Adapter-only Playwright proof: `node tests/playwright/spike_css_native_well_plate_zoom.mjs`
- Built-app render proof: `node tests/playwright/spike_built_app_well_plate_zoom.mjs`
- Built-app click-target proof: `node tests/playwright/spike_built_app_click_target.mjs`
- Built-app state-change proof: `node tests/playwright/spike_built_app_state_change.mjs`
- NEW0 precheck on tracked templates: `node experiments/css_native_layout/precheck.mjs`
- NEW0 scorecard: `node experiments/css_native_layout/score_layout.mjs`
- NEW0 contact sheets and gallery: `source source_me.sh && python3 _temp_contact_sheets.py`
