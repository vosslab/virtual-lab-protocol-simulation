# Git Incident 4e2c709 - Preserve Candidates (S5)

Date: 2026-05-21
Status: NEEDS_CONTEXT
Commit: 4e2c709 - "NEW3 Batch 5 Workstream F: Visual polish pilot on 3 gold scenes"
Files in commit: 224 files, 20,424 insertions, 163 deletions

All files in 4e2c709 currently present in working tree (this is HEAD). Audit assesses what to keep if soft-reset performed.

## High-value files (42, definitely preserve)

### NEW3 plan and log documents
- docs/active_plans/new3_layout_stress_reliability_plan.md - Master NEW3 plan, ACTIVE
- docs/active_plans/new3_layout_stress_reliability_log.md - Append-only rolling log, cannot regenerate
- docs/active_plans/new3_batch1_failure_clusters.md - Cluster analysis, systemic fault diagnosis
- docs/active_plans/new3_batch3_canonical_scorecard_rule.md - Active rule document
- docs/active_plans/new3_css_drift_audit.md - Cross-reference for failure root-cause
- docs/active_plans/new3_schema_drift_audit.md - Schema drift record
- docs/active_plans/new3_object_kind_footprint_mapping.md - Workstream K artifact, YAML authority finding

### Batch 4/5 stress results
- experiments/css_native_layout/stress_results/batch4_corpus_manifest.md - Frozen corpus v1 declaration, seed 42
- experiments/css_native_layout/stress_results/batch5_visual_polish_pilot.md - Batch 5 F result

### Stress generator
- experiments/css_native_layout/stress_generators/generate_stress_scenes.py - Per-scene seeding, corpus reproducibility

### NEW2 showcase
- docs/active_plans/new2_css_native_best_case_showcase.md
- docs/active_plans/new2_css_native_best_case_showcase.html
- docs/active_plans/new2_css_native_best_case_showcase.pdf
- docs/active_plans/new2_css_native_production_blocker_plan.md
- docs/active_plans/new2_no_crop_audit.md
- docs/active_plans/new2_css_native_best_case_showcase_no_crop_addendum.md
- docs/active_plans/new2_scorecard_regression_root_cause.md
- docs/active_plans/new2_well_plate_adapter_rect_audit.md - 432-line rect audit
- docs/active_plans/new2_showcase_evidence_inventory.md

### NEW1 spike
- docs/active_plans/new1_well_plate_96_zoom_spike_result.md - 764-line definitive record
- docs/active_plans/new1_css_native_layout_integration_plan.md
- docs/active_plans/new1_well_plate_96_zoom_spike_implementation_packet.md
- docs/active_plans/new1_well_plate_96_zoom_spike_checklist.md
- docs/active_plans/new1_spike_path_comparison.md
- docs/active_plans/lane_d_state_change_blocker.md - Active blocker report
- docs/active_plans/lane_r_rerender_probe_summary.md

### NEW0 evidence
- docs/active_plans/new0_reproducible_evidence_package.md (M)
- docs/active_plans/new0_new1_layout_rebuild_progress_report.md

### Workstream E hygiene test
- tests/test_canonical_scorecard_rule.py

### Scene class manifest
- experiments/css_native_layout/scene_class_manifest.yaml - Closed enum mapping, scorecard dispatch

### NEW1.5 hardening
- docs/active_plans/new1_5_layout_hardening_before_new2.md
- docs/active_plans/new1_5_layout_hardening_results.md - 328 lines

## Medium-value files (28, probably preserve)

### Experiment infrastructure docs
- experiments/css_native_layout/DECISION_MEMO.md (M)
- experiments/css_native_layout/PRECHECK_SUMMARY.md (M)
- experiments/css_native_layout/VISUAL_TARGETS.md (A)
- experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md (A)
- experiments/css_native_layout/LAYOUT_SCORECARD.md (A)
- experiments/css_native_layout/PRECHECK_USAGE.md (A)

### Spike path documents
- experiments/css_native_layout/spike_paths/path_a_adapter_compat/ (3 files)
- experiments/css_native_layout/spike_paths/path_b_dom_first/ (4 files)
- experiments/css_native_layout/spike_paths/path_c_hybrid/ (3 files)

### Spike fixtures
- experiments/css_native_layout/spike_fixtures/ (6 files)

### Remaining NEW2 plan docs
- docs/active_plans/new2_test_strategy.md
- docs/active_plans/new2_implementation_test_matrix.md
- docs/active_plans/new2_production_viewport_overflow_audit.md
- docs/active_plans/new2_validator_preset_regression_audit.md
- docs/active_plans/new2_showcase_reviewer_guide.md
- docs/active_plans/new2_why_css_native_is_getting_better.md
- docs/active_plans/new2_demo_backlog.md

### Shell wrappers
- experiments/css_native_layout/run_precheck.sh
- experiments/css_native_layout/run_built_app_precheck.sh

## Low-value files (~82, probably skip)

### PNG screenshots (regenerable from pipeline)
- docs/active_plans/new0_new1_layout_rebuild_assets/ (11 PNGs)
- docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/ (12 PNGs)
- docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_* (8 PNGs)
- docs/active_plans/new2_no_crop_audit_assets/ (~48 PNGs)

### Duplicate gallery/evidence PNGs
- new2_css_native_best_case_showcase_assets/lane_b/e/f/g/h/n/o2/p2/q_*.png

### PDF files (3, regenerable via tools/html_to_pdf.mjs)
- new0_new1_layout_rebuild_progress_report.pdf (945KB)
- new1_5_new2_css_native_layout_evidence_report.pdf (1.07MB)
- new2_css_native_best_case_showcase.pdf (6.39MB)

### HTML report files (rendered companions)
- new0_new1_layout_rebuild_progress_report.html
- new1_5_new2_css_native_layout_evidence_report.html
- new2_css_native_best_case_showcase.html
- new2_css_native_best_case_showcase_assets/lane_a_contact_sheet.html
- new2_css_native_best_case_showcase_assets/lane_h_style_comparison.html
- new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.html
- new2_css_native_best_case_showcase_assets/lane_l_before_after_panels.html

### Stress scene YAML corpus (regenerable with --seed 42 --count 100)
- experiments/css_native_layout/stress_scenes/generated/ (100 files)

## Uncertain files (23, need user decision)

### Production TypeScript source
- src/scene_runtime/layout/css_native_adapter.ts (+242) - Feature-flagged off by default. Spike code header says "must be removed or replaced before NEW1 promotion." User decision: keep as NEW1 foundation or discard as incomplete spike.
- src/scene_runtime/layout/feature_flags.ts (+48) - Spike flag machinery. Same status.
- src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts (+55) - Spike scene adapter. Header says "Remove together with content/base_scenes/well_plate_96_zoom.yaml."

### Production CSS
- experiments/css_native_layout/styles/bench.css (M) - 2 visual polish tweaks (max-width 100->110, --gap-object: 10px for dense_clutter). Primary deliverable of this commit.

### Content YAML for spike
- content/base_scenes/well_plate_96_zoom.yaml - "Do NOT reference from content/protocols/" + "Remove together with tests/content/dev_smoke/..."
- tests/content/dev_smoke/well_plate_96_zoom_check/ (3 files: items.yaml, protocol.yaml, reagents.yaml)

### Build infrastructure
- package.json.template (+29) - Template propagation artifact
- REPO_TYPE (+1) - Project marker "typescript"
- eslint.config.js (+40) - ESLint flat config. test_eslint_config_present.py depends on it
- devel/setup_typescript.sh (+28) - Dev tooling

### New pytest files
- tests/test_eslint_config_present.py (+74)
- tests/test_package_json_schema.py (+99) - May fail if package.json absent
- tests/test_readme_first_paragraph.py (+268)
- tests/test_tsconfig_canonical.py (+567) - May gate CI
- tests/test_smoke.mjs (+9) - Template propagation artifact

### Playwright spike tests
- tests/playwright/spike_built_app_rerender.mjs (+435)
- tests/playwright/spike_built_app_rerender_screenshots.mjs (+402)
- tests/playwright/spike_built_app_state_change.mjs (+481)
- tests/playwright/spike_css_native_well_plate_zoom.mjs (+385)
- tests/playwright/spike_validator_preset_hierarchy.mjs (+242)
- tests/playwright/spike_css_native_well_plate_zoom_results.md (+75)

### HTML template modifications (M)
- experiments/css_native_layout/templates/drug_dilution_plate_workspace.html (+82) - Structural template change, not just CSS
- experiments/css_native_layout/templates/drug_dilution_workspace_dense.html (+2/-1)
- experiments/css_native_layout/templates/electrophoresis_bench.html (+38)

### Tools
- tools/html_to_pdf.mjs (+93) - Propagated from template

## Recommendation for recovery sequence

If user picks soft-reset:

1. Re-stage and commit high-value batch docs grouped by workstream:
   - Group A: NEW3 plan + log + batch result docs (7 files)
   - Group B: NEW2 closed-workstream plans (9 MD files)
   - Group C: NEW1 spike docs + lane blocker reports (8 MD files)
   - Group D: Workstream E hygiene test + scene_class_manifest.yaml + generate_stress_scenes.py + batch4_corpus_manifest.md
   - Group E: PRECHECK_USAGE.md + experiment infra docs + spike path/fixture docs (13 files)

2. Hold medium-value PNGs and HTMLs pending user decision.

3. Skip low-value files (PDFs/PNGs regenerable; stress_scenes/generated/ regenerable with seed).

4. Hold all uncertain files; user reviews each group:
   - TS spike source + companion YAML: decision gates on NEW1 spike promotion/parking
   - bench.css tweak: accept or revert Batch 5 F polish
   - New test files: confirm CI ready
   - eslint.config.js + package.json.template + REPO_TYPE: confirm build infra intended

## Handoff

Status: NEEDS_CONTEXT
High-value: 42
Medium-value: 28
Low-value: ~82
Uncertain: 23

Blocker: stress_results/ from Batches 1-3 (scorecard_batch1/, scorecard_batch2_n_canonical/, precheck_batch1-3/, batch1_failure_table.md) NOT in commit 4e2c709. Already in working tree but committed earlier or untracked. Soft-reset doesn't affect those.
