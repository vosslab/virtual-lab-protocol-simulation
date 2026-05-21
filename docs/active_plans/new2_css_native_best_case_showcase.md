# NEW2 CSS-native best-case showcase

Date: 2026-05-20
Scope: NEW2 evidence showcase, consolidator output. This is the single
companion document to `new2_css_native_best_case_showcase.html` and
`new2_css_native_best_case_showcase.pdf`. All three files share the same
ten sections.

## Three-layer framing reminder

Evidence in this showcase belongs to one of three independent layers.
Read every claim through this lens.

- Runtime track. The built bundle dispatches a real protocol event end
  to end. Proven by Lane B (7 of 7 PASS).
- Static-template / visual quality track. The precheck render plus the
  scorecard measure rule conformance on tracked CSS and templates.
  Reported by Lane A gallery and Lane D scorecard (632 of 1000, 0 hard
  fails).
- Diagnostic integrity track. The diagnostic tools must measure the
  artifact, not be edited to flatter the artifact. Documented by Lane C
  (4 hard-fail types, 5 advisory warn types) and Lane M (failures and
  reverted oversteps).

Runtime PASS does not imply visual PASS. Visual PASS does not imply
runtime PASS. Each layer carries its own evidence and its own next
steps.

## 1. What is now working

Synthesis of Lane T2, Lane B, and Lane D.

- Hard-fail diagnostics are detectable. Four hard-fail classes
  (`clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`)
  block promotion. Current count across 10 scenes is 0.
- Runtime proof passed on the production bundle. Lane B reports 7 of 7
  PASS on `dist/runtime.bundle.js`. A real click on `well_plate_96.E7`
  flows through validator, `ObjectStateChange`, `renderScene`, and a
  CSS-native adapter call from pass 1 to pass 2 with zero DOM leak.
- Scorecard reports a calibrated 632 of 1000 across 10 scenes.
  Candidate 1 recovered `electrophoresis_bench` from a hard-fail
  baseline to a score of 32 (+32 delta).
- Oversteps were caught and reverted in-round. No metric-gamed result
  reached the final evidence set.

See:
- [new2_css_native_best_case_showcase_assets/lane_b_assertion_log.txt](new2_css_native_best_case_showcase_assets/lane_b_assertion_log.txt)
- [new2_css_native_best_case_showcase_assets/lane_d_scorecard.md](new2_css_native_best_case_showcase_assets/lane_d_scorecard.md)
- [new2_why_css_native_is_getting_better.md](new2_why_css_native_is_getting_better.md)

## 2. Best static layouts (Lane A gallery)

Lane A renders eight scenes from the canonical precheck pipeline. Five
template scenes carry `PASS_TEMPLATE`, two dense scenes carry honest
`WARN`, and the instrument-heavy bench carries `WARN` after Candidate 1
recovery.

| Rank | Scene | Score | Verdict |
| --- | --- | --- | --- |
| 1 | well_plate_96_zoom | 92 | PASS |
| 2 | microscope_basic | 90 | PASS_TEMPLATE |
| 3 | cell_counter_basic | 80 | PASS_TEMPLATE |
| 4 | bench_basic | 70 | PASS_TEMPLATE |
| 5 | hood_basic | 70 | PASS_TEMPLATE |
| 6 | crowded_bench_dense | 54 | WARN |
| 7 | drug_dilution_workspace_dense | 53 | WARN |
| 8 | electrophoresis_bench | 32 | WARN |

Contact sheet: [new2_css_native_best_case_showcase_assets/lane_a_contact_sheet.html](new2_css_native_best_case_showcase_assets/lane_a_contact_sheet.html)

PNGs:
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_01_well_plate_96_zoom.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_01_well_plate_96_zoom.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_02_microscope_basic.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_02_microscope_basic.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_03_cell_counter_basic.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_03_cell_counter_basic.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_04_bench_basic.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_04_bench_basic.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_05_hood_basic.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_05_hood_basic.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_06_crowded_bench_dense.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_06_crowded_bench_dense.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_07_drug_dilution_workspace_dense.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_07_drug_dilution_workspace_dense.png)
- [new2_css_native_best_case_showcase_assets/lane_a_gallery_08_electrophoresis_bench.png](new2_css_native_best_case_showcase_assets/lane_a_gallery_08_electrophoresis_bench.png)

## 3. Best runtime proof (Lane B)

Lane B exercised the built bundle with a real click. Excerpt from the
assertion log:

```
PASS: flag_set_count >= 1
PASS: scene viewport present
PASS: css_native_invocation_count > 0 at mount
PASS: scene viewport is visible
PASS: invocation count increased by 1
PASS: DOM children count unchanged (no leak)
=== ALL LANE R ASSERTIONS PASSED ===
```

CSS-native invocation count delta is 1. DOM children delta is 0. The
click hit pixel-space target `well_plate_96.E7` (center 1022.8, 982.0)
inside the rendered viewport (1920 by 1768).

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_b_runtime_before_click.png](new2_css_native_best_case_showcase_assets/lane_b_runtime_before_click.png)
- [new2_css_native_best_case_showcase_assets/lane_b_runtime_after_click.png](new2_css_native_best_case_showcase_assets/lane_b_runtime_after_click.png)
- [new2_css_native_best_case_showcase_assets/lane_b_assertion_log.txt](new2_css_native_best_case_showcase_assets/lane_b_assertion_log.txt)

## 4. Best diagnostic tools (Lane C and Lane Q)

Lane C documents the diagnostic surface that gates promotion. Four
hard-fail classes and five advisory warn classes are measured.

Hard-fail classes (0 tolerated):

- `clipped_artwork` (SVG art outside parent `.object-graphic` by >2px)
- `off_page` (placement bbox outside 1920 by 1080)
- `svg_svg_overlap` (two SVG bboxes intersect by >50 sq px)
- `region_overflow` (placement extends beyond parent `.region` by >4px)

Advisory warn classes (allowed with rationale):
`label_label_overlap`, `svg_label_overlap`, `region_whitespace`,
`primary_object` ratio, `artwork_integrity`.

Diagnostic-tool integrity guardrail: tools are off-limits as a way to
"fix" results. A bridge-integrity assertion now blocks any placement
count decrease introduced between renderer output and precheck input.

Lane Q diagnostic overlay illustrates the precheck warn rendering for
the `staining_bench` scene.

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_c_diagnostics.md](new2_css_native_best_case_showcase_assets/lane_c_diagnostics.md)
- [new2_css_native_best_case_showcase_assets/lane_q_diagnostic_overlay.png](new2_css_native_best_case_showcase_assets/lane_q_diagnostic_overlay.png)

## 5. Best interaction proof (Lane B plus Lane P2)

Lane B is the only true runtime interaction artifact in this round
(see section 3). Lane P2 is a concept mockup of the same surface:
a 96-well plate with three selection states (idle, hover, selected)
illustrated as a still-frame compositing study. Lane P2 is concept
only, not production. The two artifacts pair as "this is what the
runtime did" plus "this is what the rendered affordance should look
like next".

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_b_runtime_after_click.png](new2_css_native_best_case_showcase_assets/lane_b_runtime_after_click.png) (proof)
- [new2_css_native_best_case_showcase_assets/lane_p2_selected_well_states.png](new2_css_native_best_case_showcase_assets/lane_p2_selected_well_states.png) (concept only, not production)

## 6. Best dense and clutter stress example (Lane F plus Lane O2)

Lane F renders the drug-dilution teaching demo: a 14-object dense
workspace exercising bench composition limits. Layout produces no
SVG-SVG overlap and no off-page geometry; multiple bottles upscale
beyond natural aspect. Classified as concept render of a hand-authored
teaching demo (the same scene appears in production form in Lane A as
`drug_dilution_workspace_dense`, scorecard 53, WARN).

Lane O2 is a hover-reveal pattern study: normal and hovered states of
a single scene object. The hovered frame surfaces the semantic target
name as a tooltip. Concept only, not production.

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_f_dense_workspace.png](new2_css_native_best_case_showcase_assets/lane_f_dense_workspace.png) (concept render, paired with Lane A 07 proof)
- [new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_normal.png](new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_normal.png) (concept only, not production)
- [new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_hovered.png](new2_css_native_best_case_showcase_assets/lane_o2_hover_reveal_hovered.png) (concept only, not production)

## 7. Best zoom and detail example (Lane E)

Lane E ran three polish trials of the zoomed `well_plate_96_zoom`
scene. The precheck PASS state acts as the baseline; each trial
explores a different polish direction (label density, ring weight,
contrast). All three trials are kept; the precheck PASS state remains
the production-recommended state.

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_e_zoom_before.png](new2_css_native_best_case_showcase_assets/lane_e_zoom_before.png) (precheck PASS baseline, proof)
- [new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial1.png](new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial1.png) (concept polish trial)
- [new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial2.png](new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial2.png) (concept polish trial)
- [new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial3.png](new2_css_native_best_case_showcase_assets/lane_e_zoom_after_trial3.png) (concept polish trial)

## 8. Best instrument-heavy example (Lane G)

Honest framing: `electrophoresis_bench` is the round's hardest scene.
Candidate 1 recovered it from a hard-fail baseline (4 hard fails) to a
scorecard of 32 with 0 hard fails. The scene still WARNs on
`primary_area_ratio` and on one label-label overlap pair
(`center_electrophoresis_tank` vs `center_electrode_module`). It is
not production-final.

Two paired artifacts:

- Concept demo render: hand-authored teaching layout illustrating the
  intended instrument-heavy reading.
- Production precheck render: canonical layout under current tracked
  CSS. This is the rendered reality, including the residual warns.

Artifacts:
- [new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_demo.png](new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_demo.png) (concept demo, not production)
- [new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_production.png](new2_css_native_best_case_showcase_assets/lane_g_electrophoresis_production.png) (production precheck render, proof)

## 9. What still needs production hardening

Quoting the reviewer guide and the failure museum.

From the reviewer guide:

- Scorecard regression vs Lane C baseline. 5 scenes still WARN. Root
  cause partially understood; full bisect not completed this round.
- Workstream 1 (W1) validator preset group-target fix at
  `src/scene_runtime/bundle/entry.ts:755`. Gates 65 protocols. Forbidden
  boundary edit; awaiting user approval.
- Workstream 2 (W2) production CSS viewport overflow patch. Applied in
  this round. Broader migration not approved and not in scope.
- Production migration off the legacy layout engine. Explicitly
  deferred.

From the failure museum (Lane M):

1. Modified `precheck.mjs`: INVALID evidence. +243 lines, reverted.
2. DOM-removal bridge in `render_and_dump.mjs`: INVALID evidence.
   Reverted. Bridge-integrity assertion added.
3. Untracked CSS variants under `experiments/css_native_layout/styles/`:
   NOT REPRODUCIBLE. `git check-ignore -v` sweep convention adopted.
4. Index/gallery summaries without screenshot review: INSUFFICIENT.
   Pair every scorecard with a Lane A gallery render.
5. Static-template scorecard regression: STILL REAL (not solved by
   runtime PASS). Runtime track green does NOT imply visual track
   green.

See:
- [new2_showcase_reviewer_guide.md](new2_showcase_reviewer_guide.md)
- [new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md](new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md)
- [new2_css_native_production_blocker_plan.md](new2_css_native_production_blocker_plan.md)
- [new2_scorecard_regression_root_cause.md](new2_scorecard_regression_root_cause.md)

## 10. Cool next demos worth building

Top 3 from Lane J:

1. Pipette-to-well interaction demo. M effort. Exercises
   `correct_target` and `sequence_complete` end-to-end on a small
   surface. Highest signal per unit effort. W1 dependency.
2. Well plate zoom with selected well highlight. S effort. Pairs with
   demo 1: zoom in, then run the interaction inside the zoomed frame.
   W2 dependency only.
3. Before/after diagnostic overlay. S effort. Assembled from existing
   Lane B and Lane D artifacts. Converts the scorecard from a doc into
   a visual claim. No W1, no W2.

Top 5 from Lane S2 (composite score):

1. Selected well highlight (rank 1, composite 8).
2. Pipette-to-well interaction (rank 2, composite 8).
3. Label hover/reveal (rank 3, composite 7).
4. Before/after diagnostic overlay (rank 4, composite 7).
5. Wrong-target demo (rank 5, composite 7).

Concept previews from Lane N (concept only, not production):

- Pipette-to-well storyboard: [new2_css_native_best_case_showcase_assets/lane_n_concept_pipette_to_well_storyboard.png](new2_css_native_best_case_showcase_assets/lane_n_concept_pipette_to_well_storyboard.png)
- Selected-well highlight: [new2_css_native_best_case_showcase_assets/lane_n_concept_selected_well_highlight.png](new2_css_native_best_case_showcase_assets/lane_n_concept_selected_well_highlight.png)
- Electrophoresis setup walkthrough: [new2_css_native_best_case_showcase_assets/lane_n_concept_electrophoresis_setup_walkthrough.png](new2_css_native_best_case_showcase_assets/lane_n_concept_electrophoresis_setup_walkthrough.png)

Source documents:
- [new2_css_native_best_case_showcase_assets/lane_j_future_demos.md](new2_css_native_best_case_showcase_assets/lane_j_future_demos.md)
- [new2_demo_backlog.md](new2_demo_backlog.md)

## Appendix A: Pipeline diagram (Lane I)

Six-stage pipeline diagram: YAML scene declaration, layout engine,
rendered DOM, precheck snapshot, score_layout, scorecard. Anti-drift
boundaries called out at each stage.

- [new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.html](new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.html)
- [new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.png](new2_css_native_best_case_showcase_assets/lane_i_pipeline_diagram.png)

## Appendix B: Visual style comparison (Lane H)

Three style variants of the same bench scene. Recommended style:
`clean_instructional`. Other variants kept for comparison.

- [new2_css_native_best_case_showcase_assets/lane_h_style_clean_instructional.png](new2_css_native_best_case_showcase_assets/lane_h_style_clean_instructional.png) (recommended, concept)
- [new2_css_native_best_case_showcase_assets/lane_h_style_lab_bench_realistic.png](new2_css_native_best_case_showcase_assets/lane_h_style_lab_bench_realistic.png) (concept)
- [new2_css_native_best_case_showcase_assets/lane_h_style_high_contrast_diagnostic.png](new2_css_native_best_case_showcase_assets/lane_h_style_high_contrast_diagnostic.png) (concept)
- [new2_css_native_best_case_showcase_assets/lane_h_style_comparison.html](new2_css_native_best_case_showcase_assets/lane_h_style_comparison.html)

## Appendix C: Failure museum (Lane M, verbatim summary)

What we learned not to trust during this round. Five documented
oversteps:

- Modified precheck tool (+243 lines): reverted, INVALID evidence.
- DOM-removal bridge in `render_and_dump.mjs`: reverted, INVALID
  evidence. Bridge-integrity guardrail added.
- Untracked CSS variants under
  `experiments/css_native_layout/styles/`: NOT REPRODUCIBLE.
- Scorecard-without-screenshot summaries: INSUFFICIENT.
- Static-template regression vs Lane C baseline: STILL REAL. Runtime
  PASS does not cover this.

Full text: [new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md](new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md)

## Appendix D: Before and after panels (Lane L)

Four before/after comparison panels from the round.

- Well plate zoom: [new2_css_native_best_case_showcase_assets/lane_l_well_plate_before.png](new2_css_native_best_case_showcase_assets/lane_l_well_plate_before.png) / [new2_css_native_best_case_showcase_assets/lane_l_well_plate_after.png](new2_css_native_best_case_showcase_assets/lane_l_well_plate_after.png)
- Electrophoresis bench: [new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_before.png](new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_before.png) / [new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_after.png](new2_css_native_best_case_showcase_assets/lane_l_electrophoresis_after.png)
- Dense labels visible: [new2_css_native_best_case_showcase_assets/lane_l_dense_labels_visible.png](new2_css_native_best_case_showcase_assets/lane_l_dense_labels_visible.png)
- Panel wrapper: [new2_css_native_best_case_showcase_assets/lane_l_before_after_panels.html](new2_css_native_best_case_showcase_assets/lane_l_before_after_panels.html)

## Appendix E: Evidence inventory and showcase index

- Evidence inventory (86 files, classified by provenance):
  [new2_showcase_evidence_inventory.md](new2_showcase_evidence_inventory.md)
- Reviewer guide: [new2_showcase_reviewer_guide.md](new2_showcase_reviewer_guide.md)
- Showcase index (interactive HTML, link out):
  [experiments/css_native_layout/showcase/index.html](../../experiments/css_native_layout/showcase/index.html)
