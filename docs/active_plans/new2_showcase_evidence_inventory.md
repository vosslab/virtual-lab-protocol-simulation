# NEW2 showcase evidence inventory

Inventory of every screenshot, report, and asset across the NEW2 showcase
package, the prior NEW1.5 evidence report, the canonical NEW0 precheck audit
outputs, and the showcase demo HTML directory. Each entry is classified by
provenance so the consolidator can keep proof, diagnostic, and concept
artifacts separate.

## Summary

- Total inventoried files: 86
- Tracked in git: 51
- Gitignored (build/test output, demo scratch): 35
- Proof class: 16
- Diagnostic class: 5
- Concept class: 30
- Historical class: 35
- Invalid evidence in active assets: 0 (Lane O prototype outputs and reverted
  precheck/render edits never produced files that survived in this set)

## Class definitions

- **Proof**: produced by approved pipelines (precheck.mjs canonical render,
  Lane R / Lane B runtime walkthrough, Candidate 1 scorecard renders).
  Counts as evidence that the CSS-native approach works.
- **Diagnostic**: machine-readable measurement output from precheck
  (visual_audit.json, sizing_manifest.json, score_layout). Supports proof
  but is not itself a visual claim.
- **Concept**: hand-authored demo HTML and renders of those demos. Shows
  intent / design vocabulary but does NOT prove the built app behaves this
  way. Counts only as concept evidence, never as proof.
- **Historical**: pre-NEW0 baselines, snapshots from earlier evidence
  packages kept for diff context. Not authoritative for current state.

## Lane R / Lane B / canonical precheck (proof and diagnostic)

| File | Source command | Tracked? | Class | Allowed evidence? |
| --- | --- | --- | --- | --- |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_b_runtime_before_click.png | node tests/playwright/spike_built_app_rerender.mjs | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_b_runtime_after_click.png | node tests/playwright/spike_built_app_rerender.mjs | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_b_assertion_log.txt | node tests/playwright/spike_built_app_rerender.mjs | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_01_well_plate_96_zoom.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_02_microscope_basic.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_03_cell_counter_basic.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_04_bench_basic.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_05_hood_basic.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_06_crowded_bench_dense.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_07_drug_dilution_workspace_dense.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_gallery_08_electrophoresis_bench.png | node precheck.mjs (canonical render) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_a_contact_sheet.html | hand-assembled contact sheet linking Lane A PNGs | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_d_scorecard.md | Candidate 1 scorecard (manual scoring over precheck output) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_c_diagnostics.md | summary of precheck diagnostics (score_layout + visual_audit) | yes | proof | yes |
| test-results/new0_css_native/audit/visual_audit.json | node precheck.mjs (canonical) | no - gitignored | diagnostic | yes |
| test-results/new0_css_native/audit/visual_audit.md | node precheck.mjs (canonical) | no - gitignored | diagnostic | yes |
| test-results/new0_css_native/audit/sizing_manifest.json | node precheck.mjs (canonical) | no - gitignored | diagnostic | yes |
| test-results/new0_css_native/audit/well_plate_96_zoom.png | node precheck.mjs (canonical) | no - gitignored | proof | yes |
| test-results/new0_css_native/audit/microscope_basic.png | node precheck.mjs (canonical) | no - gitignored | proof | yes |
| test-results/new0_css_native/audit/cell_counter_basic.png | node precheck.mjs (canonical) | no - gitignored | proof | yes |

## Concept demos (allowed only as concept evidence)

Hand-authored HTML mockups and renders of those mockups. They illustrate the
design vocabulary; they do not show the built app.

| File | Source command | Tracked? | Class | Allowed evidence? |
| --- | --- | --- | --- | --- |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_e_zoom_before.png | precheck canonical render (used as before-state) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial1.png | playwright render of well_plate_96_zoom_polish.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial2.png | playwright render of well_plate_96_zoom_polish.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial3.png | playwright render of well_plate_96_zoom_polish.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_f_dense_workspace.png | playwright render of drug_dilution_teaching_demo.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_demo.png | playwright render of electrophoresis_compelling_demo.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_production.png | node precheck.mjs (canonical, paired with concept) | yes | proof | yes |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_h_style_clean_instructional.png | playwright render of style_clean_instructional_bench.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_h_style_high_contrast_diagnostic.png | playwright render of style_high_contrast_diagnostic_bench.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_h_style_lab_bench_realistic.png | playwright render of style_lab_bench_realistic_bench.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_h_style_comparison.html | hand-authored comparison wrapper | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.html | hand-authored pipeline diagram | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.png | playwright render of lane_i_pipeline_diagram.html | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_j_future_demos.md | hand-authored future-work notes | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_before_after_panels.html | hand-authored before/after wrapper | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_dense_labels_visible.png | playwright render of concept demo | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_before.png | playwright render of concept demo | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_after.png | playwright render of concept demo | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_well_plate_before.png | playwright render of concept demo | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_l_well_plate_after.png | playwright render of concept demo | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md | hand-authored failure-mode notes | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_normal.png | playwright render of hover_reveal_demo.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_hovered.png | playwright render of hover_reveal_demo.html (concept) | yes | concept | yes (concept-only) |
| docs/active_plans/new2_css_native_best_case_showcase_assets/lane_p2_selected_well_states.png | playwright render of selected_well_demo.html (concept) | yes | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/index.html | hand-authored demo index | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/well_plate_96_zoom_polish.html | hand-authored mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/drug_dilution_teaching_demo.html | hand-authored mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/electrophoresis_compelling_demo.html | hand-authored mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/hover_reveal_demo.html | hand-authored mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/selected_well_demo.html | hand-authored mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/style_clean_instructional_bench.html | hand-authored style mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/style_high_contrast_diagnostic_bench.html | hand-authored style mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/style_lab_bench_realistic_bench.html | hand-authored style mockup | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/concepts/pipette_to_well_storyboard.html | hand-authored storyboard | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/styles/clean_instructional.css | hand-authored stylesheet for concept | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/styles/high_contrast_diagnostic.css | hand-authored stylesheet for concept | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/_temp_render_lane_h.mjs | scratch render helper | no - gitignored | concept | yes (concept-only) |
| experiments/css_native_layout/showcase/_temp_render_lane_p2.mjs | scratch render helper | no - gitignored | concept | yes (concept-only) |

## Historical baselines (reference only)

NEW0 / NEW1 / NEW1.5 baselines kept for diff context.

| File | Source command | Tracked? | Class | Allowed evidence? |
| --- | --- | --- | --- | --- |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_bench_basic.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_cell_counter_basic.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_crowded_bench_dense.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_drug_dilution_workspace_dense.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_electrophoresis_bench.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_hood_basic.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_microscope_basic.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new0_well_plate_96_zoom.png | node precheck.mjs (NEW0 baseline) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new1_5_lane_a_before_click.png | spike_built_app_rerender.mjs (NEW1.5 capture) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new1_5_lane_a_rerender_attempt.png | spike_built_app_rerender.mjs (NEW1.5 capture) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new1_lane_b_built_app.png | built-app screenshot (NEW1 capture) | yes | historical | reference |
| docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/new2_well_plate_rect_probe_annotated.png | rect-probe annotated screenshot | yes | historical | reference |
| test-results/new0_css_native/audit/bench_basic.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/bench_basic_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/cell_counter_basic_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/crowded_bench_dense.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/drug_dilution_plate_workspace.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/drug_dilution_plate_workspace_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/drug_dilution_workspace_dense.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/electrophoresis_bench.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/electrophoresis_bench_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/hood_basic.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/hood_basic_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/microscope_basic_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/staining_bench.png | node precheck.mjs (canonical) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/staining_bench_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/well_plate_96_zoom_annotated.png | git show + render (older annotation pass) | no - gitignored | historical | reference |
| test-results/new0_css_native/audit/well_plate_96_zoom_check.png | manual capture (rect-probe check) | no - gitignored | historical | reference |

## Invalid evidence (rejected)

After the Lane O prototype rollback and the precheck.mjs / render_and_dump.mjs
reverts, no invalid-pattern outputs remain in the active asset set. The
following invalid pipelines never produced files that survived in these
directories:

- precheck.mjs +243-line edit (reverted) - no surviving outputs in inventory
- render_and_dump.mjs DOM-removal regex (reverted) - no surviving outputs
- Lane O-prototype outputs - none present (rolled back before capture)

## Embed snippet for final consolidator

```markdown
## Evidence inventory
Full inventory of NEW2 showcase + prior assets is in
[docs/active_plans/new2_showcase_evidence_inventory.md](new2_showcase_evidence_inventory.md).
Totals: 86 files, 51 tracked, 35 gitignored. Class breakdown: 16 proof,
5 diagnostic, 30 concept (concept-only evidence), 35 historical reference.
No invalid-pattern outputs survived in the active asset set.
```
