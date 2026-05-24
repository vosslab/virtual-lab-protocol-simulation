# Active plans cleanup inventory (M1 artifact)

Built per clean_up_active_plans.md M1/WP-INV-1.
Stops at M1 exit; no `git mv`, no delete, no archive move until user approves.

## Inputs used

- `git ls-files docs/active_plans/`
- `git status --porcelain docs/active_plans/`
- `find docs/active_plans -maxdepth 1`
- `du -sh` per entry
- Substring scan of `git ls-files docs/` for entry basenames (inbound refs)
- Live-work signals: [TODO.md](../TODO.md), [ROADMAP.md](../ROADMAP.md),
  latest two day blocks of [CHANGELOG.md](../CHANGELOG.md)
  (`## 2026-05-21`, `## 2026-05-20`)

Total entries: 129 (depth 1 in `docs/active_plans/`). Total size: 35M.

## Live-signal citations summary

`docs/TODO.md` cites:

- `active_plans/scene_runtime_activation_on_hold.md`
- `active_plans/96_well_authoring_shape_finding.md`
- `active_plans/96_well_enumeration_audit.md`

`docs/ROADMAP.md` cites no file inside `docs/active_plans/` (only `docs/archive/`).

`docs/CHANGELOG.md` 2026-05-21 cites (exempt per plan):

- `current_css_native_layout_manager_status_report.{md,html,pdf}`
  plus `current_css_native_layout_manager_status_report_assets/`

`docs/CHANGELOG.md` 2026-05-20 cites (KEEP per plan rule, even for NEW* prefixes;
flagged below as conflict with the plan's "every NEW*/no_crop/incident -> non-KEEP"
exit criterion -- resolution requested at M1 approval):

- `active_plans/new1_5_layout_hardening_results.md`
- `active_plans/new1_well_plate_96_zoom_spike_result.md`
- `active_plans/new0_new1_layout_rebuild_progress_report.{md,html}`
  plus `new0_new1_layout_rebuild_assets/`
- `active_plans/new2_well_plate_adapter_rect_audit.md`
- `active_plans/new2_production_viewport_overflow_audit.md`
- `active_plans/new2_css_native_production_blocker_plan.md`
- `active_plans/new2_test_strategy.md`
- `active_plans/new2_validator_preset_regression_audit.md`
- `active_plans/new2_implementation_test_matrix.md`

## Untracked / staged-but-uncommitted entries

`git status --porcelain docs/active_plans/`:

- `A  docs/active_plans/clean_up_active_plans.md` (this sweep's controlling plan)
- `A  docs/active_plans/workstreams/round3_missing_asset_repair_brief.md`
  (focused brief; pre-created `workstreams/` subdir before policy landed)

The two untracked working files named in the plan's Current state summary
(`new_manager_no_crop_readin.md`, `no_crop_scope_reconciliation.md`) are NOT
present in the working tree. Plan text may be stale; this inventory uses the
current `git status` output as ground truth.

## Open conflicts flagged for M1 approval

1. **KEEP count exceeds 20.** Following the strict rule "every CHANGELOG-cited
   file is KEEP" plus the TODO citations plus the exempt status-report set plus
   the in-flight plan itself plus the workstreams brief yields ~18 source `.md`
   files of clear KEEP intent, but adding generated siblings for the cited NEW\*
   docs pushes the count higher. The plan caps target at 10-20. Recommendation:
   keep the .md sources; drop generated siblings (html/pdf/`_assets/`) for
   non-exempt KEEPs via DELETE:generated.

2. **NEW* CHANGELOG-cited files conflict with "every NEW*/incident/no_crop ->
   non-KEEP" exit criterion.** Lines 126-127 of the plan state both rules.
   2026-05-20 is the second-latest day block and cites several NEW* files as
   active evidence. Inventory follows the CHANGELOG-citation rule and marks
   those files KEEP. User decision needed: either (a) accept the larger KEEP
   set, or (b) re-classify the 2026-05-20 entry as closed-and-cited
   (i.e., the citations describe what landed, not in-flight work) and let the
   NEW* files archive anyway.

3. **`scene_runtime_activation_plan_original.md` (132K).** Not cited anywhere
   live. TODO cites `scene_runtime_activation_on_hold.md` only. Treating the
   "\_original" file as a historical superseded plan -> ARCHIVE:scene_runtime.

4. **`2026-05-18_rollout_status.md` vs `2026_05_18_layout_rollout_status.md`.**
   Two near-duplicate names. Neither cited in latest 2 day blocks.
   Both -> ARCHIVE:misc_2026_05.

5. **`workstreams/round3_missing_asset_repair_brief.md`** is staged-untracked,
   already lives under `workstreams/`, declares `NEEDS_CONTEXT` (blocked
   waiting on a non-existent audit). Treating as KEEP under `workstreams/`
   since it names live in-flight work (Round 3 missing-asset repair).

## Inventory rows

Legend:

- KEEP: stays in `docs/active_plans/` or moves to `docs/active_plans/workstreams/`.
- ARCHIVE:<cluster>: `git mv` to `docs/archive/<cluster>/`.
- DELETE:generated: HTML/PDF/`*_assets/` removed; source markdown archived
  separately. Regeneration recipe column carries `tools/html_to_pdf.mjs`,
  `source markdown`, `regenerable from test-results`, or `intentionally dropped`.
- KEEPs missing `plan_type` frontmatter default to top-level with a note;
  user assigns final routing at M1 approval.
- Proposed destination column is `-` for ARCHIVE rows (destination is
  `docs/archive/<cluster>/`) and for DELETE rows.

### Source markdown rows

| #   | path                                                                       | tracked | size | classification               | reason                                                                                                      | inbound refs                                                                    | regen recipe | proposed destination                                       |
| --- | -------------------------------------------------------------------------- | ------- | ---- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------- |
| 1   | `docs/active_plans/2026-05-18_rollout_status.md`                           | tracked | 12K  | ARCHIVE:misc_2026_05         | Layout-rollout status snapshot from 2026-05-18; not cited in TODO/ROADMAP/latest-2 CHANGELOG                | docs/CHANGELOG.md (older entry only)                                            | -            | -                                                          |
| 2   | `docs/active_plans/2026_05_18_layout_rollout_status.md`                    | tracked | 12K  | ARCHIVE:misc_2026_05         | Near-duplicate of #1; same 2026-05-18 snapshot under second name                                            | -                                                                               | -            | -                                                          |
| 3   | `docs/active_plans/2026_May_13-Fresh_Refactor_Plan.md`                     | tracked | 92K  | ARCHIVE:misc_2026_05         | 2026-05-13 refactor brainstorm; referenced only by CHANGELOG-2026-05c archive                               | docs/CHANGELOG-2026-05c.md                                                      | -            | -                                                          |
| 4   | `docs/active_plans/96_well_authoring_shape_finding.md`                     | tracked | 16K  | KEEP                         | Cited by docs/TODO.md "Stepper and validator follow-ups from 96-well spike"                                 | docs/TODO.md, docs/CHANGELOG.md                                                 | -            | docs/active_plans/workstreams/ (focused)                   |
| 5   | `docs/active_plans/96_well_enumeration_audit.md`                           | tracked | 16K  | KEEP                         | Cited by docs/TODO.md "Follow-ups from 96-well enumeration audit"                                           | docs/TODO.md, docs/CHANGELOG.md                                                 | -            | docs/active_plans/workstreams/ (diagnostic)                |
| 6   | `docs/active_plans/CSS_NATIVE_STATUS_HANDOFF.txt`                          | tracked | 8.0K | ARCHIVE:css_native_layout    | Plaintext handoff note, no live citations; superseded by current_css_native_layout_manager_status_report.md | -                                                                               | -            | -                                                          |
| 7   | `docs/active_plans/CSS_TRIAL_EXECUTION_SUMMARY.md`                         | tracked | 8.0K | ARCHIVE:css_native_layout    | Closeout summary of CSS-trial execution; no live citations                                                  | -                                                                               | -            | -                                                          |
| 8   | `docs/active_plans/SRC_SCENES_FREEZE.md`                                   | tracked | 8.0K | ARCHIVE:misc_2026_05         | Freeze-notice for src/scenes; only referenced from older CHANGELOG-2026-05c and archive plans               | docs/CHANGELOG-2026-05c.md, docs/archive/\* (4 archive plans)                   | -            | -                                                          |
| 9   | `docs/active_plans/clean_up_active_plans.md`                               | staged  | 40K  | KEEP                         | This sweep's controlling plan (in-flight)                                                                   | -                                                                               | -            | docs/active_plans/ (full)                                  |
| 10  | `docs/active_plans/current_status_report_no_crop_correction_addendum.md`   | tracked | 8.0K | ARCHIVE:no_crop_svg          | Addendum to status report; no_crop scope, closed                                                            | -                                                                               | -            | -                                                          |
| 11  | `docs/active_plans/curriculum_decomposition.md`                            | tracked | 16K  | ARCHIVE:misc_2026_05         | Curriculum-decomposition planning doc; only referenced from archive plans                                   | docs/archive/protocol_entry_audit.md, docs/archive/scene_runtime_spine_plan.md  | -            | -                                                          |
| 12  | `docs/active_plans/generated_data_audit.md`                                | tracked | 28K  | ARCHIVE:misc_2026_05         | Audit of generated-data layout; no live citations                                                           | -                                                                               | -            | -                                                          |
| 13  | `docs/active_plans/git_incident_4e2c709_current_state.md`                  | tracked | 8.0K | ARCHIVE:git_incident_4e2c709 | Closed incident (baseline 4e2c709 accepted per CHANGELOG)                                                   | -                                                                               | -            | -                                                          |
| 14  | `docs/active_plans/git_incident_4e2c709_inventory.md`                      | tracked | 12K  | ARCHIVE:git_incident_4e2c709 | Closed incident postmortem                                                                                  | -                                                                               | -            | -                                                          |
| 15  | `docs/active_plans/git_incident_4e2c709_preserve_candidates.md`            | tracked | 12K  | ARCHIVE:git_incident_4e2c709 | Closed incident postmortem                                                                                  | -                                                                               | -            | -                                                          |
| 16  | `docs/active_plans/git_incident_4e2c709_recovery_options.md`               | tracked | 8.0K | ARCHIVE:git_incident_4e2c709 | Closed incident postmortem                                                                                  | -                                                                               | -            | -                                                          |
| 17  | `docs/active_plans/git_incident_4e2c709_risk_list.md`                      | tracked | 12K  | ARCHIVE:git_incident_4e2c709 | Closed incident postmortem                                                                                  | -                                                                               | -            | -                                                          |
| 18  | `docs/active_plans/git_incident_4e2c709_scope_audit.md`                    | tracked | 12K  | ARCHIVE:git_incident_4e2c709 | Closed incident postmortem                                                                                  | -                                                                               | -            | -                                                          |
| 19  | `docs/active_plans/label_solver_validation_2026_05_18.md`                  | tracked | 8.0K | ARCHIVE:misc_2026_05         | Dated diagnostic from 2026-05-18; pre-dates the two latest day blocks                                       | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 20  | `docs/active_plans/lane_d_state_change_blocker.md`                         | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW1 Lane D blocker write-up; not in latest 2 day blocks                                                    | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 21  | `docs/active_plans/lane_r_rerender_probe_summary.md`                       | tracked | 8.0K | ARCHIVE:css_native_layout    | Lane R summary, superseded by NEW2 lane work in CHANGELOG 2026-05-20                                        | -                                                                               | -            | -                                                          |
| 22  | `docs/active_plans/layout_engine_audit.md`                                 | tracked | 16K  | ARCHIVE:misc_2026_05         | Older layout-engine audit, superseded; no live citations                                                    | -                                                                               | -            | -                                                          |
| 23  | `docs/active_plans/layout_method_benchmark_report_2026_05_18.md`           | tracked | 20K  | ARCHIVE:misc_2026_05         | Dated benchmark report from 2026-05-18                                                                      | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 24  | `docs/active_plans/manual_validator_extension.md`                          | tracked | 12K  | ARCHIVE:misc_2026_05         | Validator-extension proposal; no live citations                                                             | -                                                                               | -            | -                                                          |
| 25  | `docs/active_plans/material_overlay_audit_2026_05_18.md`                   | tracked | 24K  | ARCHIVE:misc_2026_05         | Dated 2026-05-18 audit                                                                                      | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 26  | `docs/active_plans/material_volume_conservation_spec.md`                   | tracked | 8.0K | ARCHIVE:misc_2026_05         | Spec proposal; referenced from older CHANGELOG/USAGE/archive                                                | docs/CHANGELOG.md (older), docs/USAGE.md, docs/archive/protocol_stepper_tool.md | -            | -                                                          |
| 27  | `docs/active_plans/mtt_uniform_all_wells_rewrite.md`                       | tracked | 12K  | ARCHIVE:misc_2026_05         | MTT rewrite report; not in latest 2 day blocks                                                              | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 28  | `docs/active_plans/new0_new1_layout_rebuild_progress_report.md`            | tracked | 4.0K | KEEP                         | Cited by CHANGELOG 2026-05-20 as Round 2 progress report                                                    | docs/CHANGELOG.md                                                               | -            | docs/active_plans/ (full)                                  |
| 29  | `docs/active_plans/new0_outside_review_handoff.md`                         | tracked | 16K  | ARCHIVE:css_native_layout    | NEW0 handoff; not in latest 2 day blocks                                                                    | -                                                                               | -            | -                                                          |
| 30  | `docs/active_plans/new0_reproducible_evidence_package.md`                  | tracked | 32K  | ARCHIVE:css_native_layout    | Cited only by 2026-05-19 CHANGELOG (verdict retracted); not in latest 2 day blocks                          | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 31  | `docs/active_plans/new0_stabilization_continuation.md`                     | tracked | 12K  | ARCHIVE:css_native_layout    | Cited only by 2026-05-19 CHANGELOG; not in latest 2 day blocks                                              | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 32  | `docs/active_plans/new1_5_layout_hardening_before_new2.md`                 | tracked | 12K  | ARCHIVE:css_native_layout    | Pre-NEW2 hardening plan; not in latest 2 day blocks (results doc IS cited)                                  | -                                                                               | -            | -                                                          |
| 33  | `docs/active_plans/new1_5_layout_hardening_results.md`                     | tracked | 16K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW1.5 status banner + overstep history                                       | docs/CHANGELOG.md                                                               | -            | docs/active_plans/ (full)                                  |
| 34  | `docs/active_plans/new1_5_new2_css_native_layout_evidence_report.md`       | tracked | 8.0K | ARCHIVE:css_native_layout    | Closeout evidence report; not in latest 2 day blocks                                                        | -                                                                               | -            | -                                                          |
| 35  | `docs/active_plans/new1_css_native_layout_integration_plan.md`             | tracked | 20K  | ARCHIVE:css_native_layout    | NEW1 integration plan; cited only by older CHANGELOG entries                                                | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 36  | `docs/active_plans/new1_path_a_measurement_fallback_analysis.md`           | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW1 analysis doc; cited only by 2026-05-19                                                                 | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 37  | `docs/active_plans/new1_primary_contract_item3_amendment_draft.md`         | tracked | 12K  | ARCHIVE:css_native_layout    | Amendment draft; cited only in older CHANGELOG                                                              | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 38  | `docs/active_plans/new1_spike_path_comparison.md`                          | tracked | 12K  | ARCHIVE:css_native_layout    | NEW1 spike comparison; not in latest 2 day blocks                                                           | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 39  | `docs/active_plans/new1_spike_readiness_audit.md`                          | tracked | 8.0K | ARCHIVE:css_native_layout    | Readiness audit; not in latest 2 day blocks                                                                 | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 40  | `docs/active_plans/new1_well_plate_96_zoom_dev_smoke_wiring.md`            | tracked | 20K  | ARCHIVE:css_native_layout    | Dev-smoke wiring brief; not in latest 2 day blocks                                                          | -                                                                               | -            | -                                                          |
| 41  | `docs/active_plans/new1_well_plate_96_zoom_spike_checklist.md`             | tracked | 16K  | ARCHIVE:css_native_layout    | Spike checklist; not in latest 2 day blocks                                                                 | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 42  | `docs/active_plans/new1_well_plate_96_zoom_spike_implementation_packet.md` | tracked | 12K  | ARCHIVE:css_native_layout    | Implementation packet; not in latest 2 day blocks                                                           | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 43  | `docs/active_plans/new1_well_plate_96_zoom_spike_result.md`                | tracked | 48K  | KEEP                         | Cited by CHANGELOG 2026-05-20 "Bundle integration round 2" plus compatibility-shim guardrail audit          | docs/CHANGELOG.md                                                               | -            | docs/active_plans/ (full)                                  |
| 44  | `docs/active_plans/new2_css_native_best_case_showcase.md`                  | tracked | 20K  | ARCHIVE:css_native_layout    | NEW2 showcase narrative; not in latest 2 day blocks                                                         | -                                                                               | -            | -                                                          |
| 45  | `docs/active_plans/new2_css_native_best_case_showcase_no_crop_addendum.md` | tracked | 4.0K | ARCHIVE:css_native_layout    | Showcase no-crop addendum; not in latest 2 day blocks                                                       | -                                                                               | -            | -                                                          |
| 46  | `docs/active_plans/new2_css_native_production_blocker_plan.md`             | tracked | 16K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW2 prep package                                                             | docs/CHANGELOG.md                                                               | -            | docs/active_plans/ (full)                                  |
| 47  | `docs/active_plans/new2_demo_backlog.md`                                   | tracked | 12K  | ARCHIVE:css_native_layout    | Demo backlog; no live citations                                                                             | -                                                                               | -            | -                                                          |
| 48  | `docs/active_plans/new2_implementation_test_matrix.md`                     | tracked | 12K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW2 prep-and-prototype closure                                               | docs/CHANGELOG.md                                                               | -            | docs/active_plans/workstreams/ (focused)                   |
| 49  | `docs/active_plans/new2_no_crop_audit.md`                                  | tracked | 40K  | ARCHIVE:no_crop_svg          | NEW2 no-crop audit; no live citations                                                                       | -                                                                               | -            | -                                                          |
| 50  | `docs/active_plans/new2_production_viewport_overflow_audit.md`             | tracked | 16K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW2 prep package                                                             | docs/CHANGELOG.md                                                               | -            | docs/active_plans/workstreams/ (diagnostic)                |
| 51  | `docs/active_plans/new2_scorecard_regression_root_cause.md`                | tracked | 8.0K | ARCHIVE:css_native_layout    | Root-cause writeup; no live citations (referenced Task #107 in CHANGELOG narrative but not by name)         | -                                                                               | -            | -                                                          |
| 52  | `docs/active_plans/new2_showcase_batch2_addendum.md`                       | tracked | 8.0K | ARCHIVE:css_native_layout    | Showcase batch 2 addendum; no live citations                                                                | -                                                                               | -            | -                                                          |
| 53  | `docs/active_plans/new2_showcase_evidence_inventory.md`                    | tracked | 20K  | ARCHIVE:css_native_layout    | Showcase evidence inventory; no live citations                                                              | -                                                                               | -            | -                                                          |
| 54  | `docs/active_plans/new2_showcase_reviewer_guide.md`                        | tracked | 8.0K | ARCHIVE:css_native_layout    | Reviewer guide; no live citations                                                                           | -                                                                               | -            | -                                                          |
| 55  | `docs/active_plans/new2_test_strategy.md`                                  | tracked | 12K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW2 prep package                                                             | docs/CHANGELOG.md                                                               | -            | docs/active_plans/workstreams/ (focused)                   |
| 56  | `docs/active_plans/new2_validator_preset_regression_audit.md`              | tracked | 8.0K | KEEP                         | Cited by CHANGELOG 2026-05-20 Lane W-regression audit (395 instances classified)                            | docs/CHANGELOG.md                                                               | -            | docs/active_plans/workstreams/ (diagnostic)                |
| 57  | `docs/active_plans/new2_well_plate_adapter_rect_audit.md`                  | tracked | 16K  | KEEP                         | Cited by CHANGELOG 2026-05-20 NEW2 prep package                                                             | docs/CHANGELOG.md                                                               | -            | docs/active_plans/workstreams/ (diagnostic)                |
| 58  | `docs/active_plans/new2_why_css_native_is_getting_better.md`               | tracked | 4.0K | ARCHIVE:css_native_layout    | Narrative summary; no live citations                                                                        | -                                                                               | -            | -                                                          |
| 59  | `docs/active_plans/new3_batch1_failure_clusters.md`                        | tracked | 20K  | ARCHIVE:css_native_layout    | NEW3 batch 1 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 60  | `docs/active_plans/new3_batch2_css_classification.md`                      | tracked | 24K  | ARCHIVE:css_native_layout    | NEW3 batch 2 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 61  | `docs/active_plans/new3_batch2_stress_results.md`                          | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 batch 2 results; no live citations                                                                     | -                                                                               | -            | -                                                          |
| 62  | `docs/active_plans/new3_batch3_canonical_scorecard_rule.md`                | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW3 batch 3 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 63  | `docs/active_plans/new3_batch3_remaining_failures_report.md`               | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 batch 3 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 64  | `docs/active_plans/new3_batch4_test_system_hardening_report.md`            | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 batch 4 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 65  | `docs/active_plans/new3_batch5_closeout_after_commit_incident.md`          | tracked | 4.0K | ARCHIVE:css_native_layout    | NEW3 batch 5 closeout; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 66  | `docs/active_plans/new3_batch5_phase1_hardfailcount_dryrun.md`             | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 batch 5 dryrun; no live citations                                                                      | -                                                                               | -            | -                                                          |
| 67  | `docs/active_plans/new3_batch5_resume_notes.md`                            | tracked | 4.0K | ARCHIVE:css_native_layout    | NEW3 batch 5 resume notes; no live citations                                                                | -                                                                               | -            | -                                                          |
| 68  | `docs/active_plans/new3_batch5_scorecard_file_cleanup.md`                  | tracked | 4.0K | ARCHIVE:css_native_layout    | NEW3 batch 5 cleanup; no live citations                                                                     | -                                                                               | -            | -                                                          |
| 69  | `docs/active_plans/new3_batch5_stress_pipeline_alignment_options.md`       | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 batch 5 alignment options; no live citations                                                           | -                                                                               | -            | -                                                          |
| 70  | `docs/active_plans/new3_canonical_scorecard_guardrail.md`                  | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW3 scorecard guardrail; no live citations                                                                 | -                                                                               | -            | -                                                          |
| 71  | `docs/active_plans/new3_css_drift_audit.md`                                | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW3 CSS drift audit; no live citations                                                                     | -                                                                               | -            | -                                                          |
| 72  | `docs/active_plans/new3_layout_stress_reliability_log.md`                  | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW3 stress reliability log; no live citations                                                              | -                                                                               | -            | -                                                          |
| 73  | `docs/active_plans/new3_layout_stress_reliability_plan.md`                 | tracked | 16K  | ARCHIVE:css_native_layout    | NEW3 stress reliability plan; no live citations                                                             | -                                                                               | -            | -                                                          |
| 74  | `docs/active_plans/new3_object_kind_footprint_mapping.md`                  | tracked | 16K  | ARCHIVE:css_native_layout    | NEW3 footprint mapping; no live citations                                                                   | -                                                                               | -            | -                                                          |
| 75  | `docs/active_plans/new3_schema_drift_audit.md`                             | tracked | 8.0K | ARCHIVE:css_native_layout    | NEW3 schema drift audit; no live citations                                                                  | -                                                                               | -            | -                                                          |
| 76  | `docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md`           | tracked | 12K  | ARCHIVE:css_native_layout    | NEW3 alignment proposal; no live citations                                                                  | -                                                                               | -            | -                                                          |
| 77  | `docs/active_plans/no_agent_commits_guardrail.md`                          | tracked | 4.0K | ARCHIVE:misc_2026_05         | Guardrail note; no live citations                                                                           | -                                                                               | -            | -                                                          |
| 78  | `docs/active_plans/no_cropped_svg_asset_sizing_table.md`                   | tracked | 16K  | ARCHIVE:no_crop_svg          | No-crop diagnostic; closed                                                                                  | -                                                                               | -            | -                                                          |
| 79  | `docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md`                 | tracked | 12K  | ARCHIVE:no_crop_svg          | No-crop diagnostic; closed                                                                                  | -                                                                               | -            | -                                                          |
| 80  | `docs/active_plans/no_cropped_svg_phase1_diagnostic_proposal.md`           | tracked | 12K  | ARCHIVE:no_crop_svg          | No-crop diagnostic; closed                                                                                  | -                                                                               | -            | -                                                          |
| 81  | `docs/active_plans/no_cropped_svg_repair_summary.md`                       | tracked | 12K  | ARCHIVE:no_crop_svg          | No-crop repair summary; closed                                                                              | -                                                                               | -            | -                                                          |
| 82  | `docs/active_plans/no_cropped_svg_round2_asset_resolution_experiment.md`   | tracked | 16K  | ARCHIVE:no_crop_svg          | No-crop round 2; closed                                                                                     | -                                                                               | -            | -                                                          |
| 83  | `docs/active_plans/no_cropped_svg_round2_experiment_scoreboard.md`         | tracked | 16K  | ARCHIVE:no_crop_svg          | No-crop round 2; closed                                                                                     | -                                                                               | -            | -                                                          |
| 84  | `docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md`      | tracked | 8.0K | ARCHIVE:no_crop_svg          | No-crop round 2 acceptance; closed                                                                          | -                                                                               | -            | -                                                          |
| 85  | `docs/active_plans/no_cropped_svg_screenshot_audit.md`                     | tracked | 20K  | ARCHIVE:no_crop_svg          | No-crop screenshot audit; closed                                                                            | -                                                                               | -            | -                                                          |
| 86  | `docs/active_plans/no_cropped_svg_visual_confirmation_report.md`           | tracked | 8.0K | ARCHIVE:no_crop_svg          | No-crop visual confirmation; closed                                                                         | -                                                                               | -            | -                                                          |
| 87  | `docs/active_plans/ovcar8_action_coverage_matrix.md`                       | tracked | 16K  | ARCHIVE:misc_2026_05         | OVCAR8 action-coverage matrix; not in latest 2 day blocks                                                   | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 88  | `docs/active_plans/post_commit_4e2c709_binary_artifact_review.md`          | tracked | 12K  | ARCHIVE:git_incident_4e2c709 | Post-commit review; incident closed                                                                         | -                                                                               | -            | -                                                          |
| 89  | `docs/active_plans/post_commit_4e2c709_risky_file_review.md`               | tracked | 16K  | ARCHIVE:git_incident_4e2c709 | Post-commit review; incident closed                                                                         | -                                                                               | -            | -                                                          |
| 90  | `docs/active_plans/post_commit_4e2c709_stabilization_checklist.md`         | tracked | 4.0K | ARCHIVE:git_incident_4e2c709 | Post-commit checklist; incident closed                                                                      | -                                                                               | -            | -                                                          |
| 91  | `docs/active_plans/production_precheck_summary_2026_05_18.md`              | tracked | 8.0K | ARCHIVE:misc_2026_05         | Dated 2026-05-18 summary                                                                                    | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 92  | `docs/active_plans/protocol_vocabulary_code_migration_plan.md`             | tracked | 4.0K | ARCHIVE:misc_2026_05         | Vocabulary migration plan; not in latest 2 day blocks                                                       | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 93  | `docs/active_plans/row_slot_base_scene_prototype.md`                       | tracked | 12K  | ARCHIVE:scene_runtime        | Row-slot prototype writeup; closed per CHANGELOG older entries                                              | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 94  | `docs/active_plans/row_slot_base_scene_rollout.md`                         | tracked | 4.0K | ARCHIVE:scene_runtime        | Row-slot rollout; closed                                                                                    | -                                                                               | -            | -                                                          |
| 95  | `docs/active_plans/row_slot_base_scene_rollout_closure.md`                 | tracked | 4.0K | ARCHIVE:scene_runtime        | Row-slot rollout closure                                                                                    | -                                                                               | -            | -                                                          |
| 96  | `docs/active_plans/row_slot_prototype_comparison.md`                       | tracked | 8.0K | ARCHIVE:scene_runtime        | Row-slot comparison; closed                                                                                 | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 97  | `docs/active_plans/scene_authoring_shape_experiment_1.md`                  | tracked | 112K | ARCHIVE:scene_runtime        | Big experiment writeup; not in latest 2 day blocks                                                          | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 98  | `docs/active_plans/scene_runtime_activation_on_hold.md`                    | tracked | 12K  | KEEP                         | Cited by docs/TODO.md "On hold: scene runtime activation"                                                   | docs/TODO.md                                                                    | -            | docs/active_plans/ (full)                                  |
| 99  | `docs/active_plans/scene_runtime_activation_plan_original.md`              | tracked | 132K | ARCHIVE:scene_runtime        | Superseded by the on-hold doc above; historical reference only                                              | -                                                                               | -            | -                                                          |
| 100 | `docs/active_plans/scene_runtime_spec_index.md`                            | tracked | 16K  | ARCHIVE:scene_runtime        | Spec index; superseded by docs/specs/ structure                                                             | -                                                                               | -            | -                                                          |
| 101 | `docs/active_plans/scene_runtime_status_2026_05_14.md`                     | tracked | 8.0K | ARCHIVE:scene_runtime        | Dated 2026-05-14 status snapshot                                                                            | -                                                                               | -            | -                                                          |
| 102 | `docs/active_plans/sdspage_scene_content_completion.md`                    | tracked | 20K  | ARCHIVE:misc_2026_05         | SDSPAGE scene content completion; not in latest 2 day blocks                                                | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 103 | `docs/active_plans/sdspage_scene_content_completion_identify.md`           | tracked | 20K  | ARCHIVE:misc_2026_05         | SDSPAGE identify pass; not in latest 2 day blocks                                                           | docs/CHANGELOG.md (older)                                                       | -            | -                                                          |
| 104 | `docs/active_plans/step_kind_spec_rfc.md`                                  | tracked | 4.0K | ARCHIVE:misc_2026_05         | RFC; referenced only by older CHANGELOG/USAGE/archive                                                       | docs/CHANGELOG.md (older), docs/USAGE.md, docs/archive/protocol_stepper_tool.md | -            | -                                                          |
| 105 | `docs/active_plans/stepper_semantic_validation.md`                         | tracked | 20K  | ARCHIVE:misc_2026_05         | Stepper validation plan; no live citations                                                                  | -                                                                               | -            | -                                                          |
| 106 | `docs/active_plans/target_file_structure_migration.md`                     | tracked | 4.0K | ARCHIVE:misc_2026_05         | File-structure migration plan; referenced only in CHANGELOG-2026-05c archive                                | docs/CHANGELOG-2026-05c.md                                                      | -            | -                                                          |
| 107 | `docs/active_plans/typescript_migration_plan.md`                           | tracked | 4.0K | ARCHIVE:misc_2026_05         | TS migration plan; referenced by older CHANGELOG + archive                                                  | docs/CHANGELOG.md (older), docs/archive/\* (3 archive plans)                    | -            | -                                                          |
| 108 | `docs/active_plans/yaml_to_browser_audit.md`                               | tracked | 16K  | ARCHIVE:misc_2026_05         | YAML-to-browser audit; no live citations                                                                    | -                                                                               | -            | -                                                          |
| 109 | `docs/active_plans/workstreams/round3_missing_asset_repair_brief.md`       | staged  | 8.0K | KEEP                         | In-flight Round 3 missing-asset repair brief (status NEEDS_CONTEXT); already under workstreams/             | docs/CHANGELOG.md (older entry mentioning round3 cluster only)                  | -            | docs/active_plans/workstreams/ (focused; already in place) |

### Exempt CSS-native status report set (rows 110-113)

Plan declares this set exempt for this sweep; lifecycle policy auto-expires
the exemption when the source markdown is no longer cited in the latest two
day blocks. As of 2026-05-21 (latest day block) the source is cited, so all
four entries stay in `docs/active_plans/` untouched by this sweep.

| #   | path                                                                        | tracked | size | classification | reason                                                            | inbound refs      | regen recipe | proposed destination        |
| --- | --------------------------------------------------------------------------- | ------- | ---- | -------------- | ----------------------------------------------------------------- | ----------------- | ------------ | --------------------------- |
| 110 | `docs/active_plans/current_css_native_layout_manager_status_report.md`      | tracked | 40K  | KEEP (exempt)  | Cited by CHANGELOG 2026-05-21 status-report correction workstream | docs/CHANGELOG.md | -            | docs/active_plans/ (exempt) |
| 111 | `docs/active_plans/current_css_native_layout_manager_status_report.html`    | tracked | 56K  | KEEP (exempt)  | Exempt sibling of #110                                            | docs/CHANGELOG.md | -            | docs/active_plans/ (exempt) |
| 112 | `docs/active_plans/current_css_native_layout_manager_status_report.pdf`     | tracked | 1.4M | KEEP (exempt)  | Exempt sibling of #110                                            | docs/CHANGELOG.md | -            | docs/active_plans/ (exempt) |
| 113 | `docs/active_plans/current_css_native_layout_manager_status_report_assets/` | tracked | 996K | KEEP (exempt)  | Exempt sibling of #110 (29 PNG files)                             | -                 | -            | docs/active_plans/ (exempt) |

### Generated artifact rows (HTML / PDF / `*_assets/`)

All non-exempt rows below are DELETE:generated. Source markdown either
KEEP (regen recipe = `node tools/html_to_pdf.mjs --input <source>.md`) or
ARCHIVE (recipe = source markdown path under new archive cluster).

| #   | path                                                                    | tracked | size | classification   | reason                                                                       | inbound refs      | regen recipe                                                                                                                                                                          | proposed destination |
| --- | ----------------------------------------------------------------------- | ------- | ---- | ---------------- | ---------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 114 | `docs/active_plans/new0_new1_layout_rebuild_progress_report.html`       | tracked | 36K  | DELETE:generated | HTML sibling of KEEP row #28                                                 | docs/CHANGELOG.md | source markdown: `docs/active_plans/new0_new1_layout_rebuild_progress_report.md`                                                                                                      | -                    |
| 115 | `docs/active_plans/new0_new1_layout_rebuild_progress_report.pdf`        | tracked | 924K | DELETE:generated | PDF sibling of KEEP row #28                                                  | -                 | `node tools/html_to_pdf.mjs --input docs/active_plans/new0_new1_layout_rebuild_progress_report.md`                                                                                    | -                    |
| 116 | `docs/active_plans/new0_new1_layout_rebuild_assets/`                    | tracked | 540K | DELETE:generated | Asset dir for row #28 (12 PNGs)                                              | docs/CHANGELOG.md | regenerable from test-results (screenshots from precheck/Playwright runs)                                                                                                             | -                    |
| 117 | `docs/active_plans/new1_5_new2_css_native_layout_evidence_report.html`  | tracked | 44K  | DELETE:generated | HTML sibling of ARCHIVE row #34                                              | -                 | source markdown: archive path of #34                                                                                                                                                  | -                    |
| 118 | `docs/active_plans/new1_5_new2_css_native_layout_evidence_report.pdf`   | tracked | 1.1M | DELETE:generated | PDF sibling of ARCHIVE row #34                                               | -                 | `node tools/html_to_pdf.mjs --input <archived-md>`                                                                                                                                    | -                    |
| 119 | `docs/active_plans/new1_5_new2_css_native_layout_evidence_assets/`      | tracked | 648K | DELETE:generated | Asset dir for ARCHIVE row #34 (12 PNGs)                                      | -                 | regenerable from test-results                                                                                                                                                         | -                    |
| 120 | `docs/active_plans/new2_css_native_best_case_showcase.html`             | tracked | 32K  | DELETE:generated | HTML sibling of ARCHIVE row #44                                              | -                 | source markdown: archive path of #44                                                                                                                                                  | -                    |
| 121 | `docs/active_plans/new2_css_native_best_case_showcase.pdf`              | tracked | 6.1M | DELETE:generated | PDF sibling of ARCHIVE row #44                                               | -                 | `node tools/html_to_pdf.mjs --input <archived-md>`                                                                                                                                    | -                    |
| 122 | `docs/active_plans/new2_css_native_best_case_showcase_assets/`          | tracked | 6.3M | DELETE:generated | Asset dir for ARCHIVE row #44 (37 lane\_\* assets including HTML/PNG/MD/TXT) | -                 | regenerable from test-results + experiments/css_native_layout precheck output                                                                                                         | -                    |
| 123 | `docs/active_plans/new2_no_crop_audit_assets/`                          | tracked | 8.0M | DELETE:generated | Asset dir for ARCHIVE row #49 (52 PNGs + 2 .md)                              | -                 | regenerable from test-results visual-audit AFTER/BEFORE runs; embedded .md files (visual_audit_AFTER.md, visual_audit_BEFORE.md) intentionally dropped (superseded by audit markdown) | -                    |
| 124 | `docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.html` | tracked | 1.5M | DELETE:generated | HTML sibling of ARCHIVE row #84                                              | -                 | source markdown: archive path of #84                                                                                                                                                  | -                    |
| 125 | `docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.pdf`  | tracked | 1.4M | DELETE:generated | PDF sibling of ARCHIVE row #84                                               | -                 | `node tools/html_to_pdf.mjs --input <archived-md>`                                                                                                                                    | -                    |
| 126 | `docs/active_plans/no_cropped_svg_visual_confirmation_assets/`          | tracked | 3.6M | DELETE:generated | Asset dir for ARCHIVE row #86 (44 PNGs)                                      | -                 | regenerable from test-results visual-confirmation runs                                                                                                                                | -                    |
| 127 | `docs/active_plans/no_cropped_svg_visual_confirmation_report.html`      | tracked | 16K  | DELETE:generated | HTML sibling of ARCHIVE row #86                                              | -                 | source markdown: archive path of #86                                                                                                                                                  | -                    |
| 128 | `docs/active_plans/no_cropped_svg_visual_confirmation_report.pdf`       | tracked | 280K | DELETE:generated | PDF sibling of ARCHIVE row #86                                               | -                 | `node tools/html_to_pdf.mjs --input <archived-md>`                                                                                                                                    | -                    |

### Directory entries already accounted for

| #   | path                             | tracked                    | size | classification   | reason                                                        | inbound refs                                                          | regen recipe | proposed destination                           |
| --- | -------------------------------- | -------------------------- | ---- | ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| 129 | `docs/active_plans/workstreams/` | mixed (staged file inside) | 8.0K | KEEP (container) | New two-tier subdir; created early by the staged round3 brief | docs/CHANGELOG-2026-05b.md, docs/CHANGELOG.md, docs/archive/\* (many) | -            | docs/active_plans/workstreams/ (target subdir) |

## KEEP totals

Source markdown KEEPs (excluding exempt set):

- Top-level `docs/active_plans/` (full plans): rows 9, 28, 33, 43, 46, 98
  -> 6 files
- `docs/active_plans/workstreams/` (focused/diagnostic): rows 4, 5, 48, 50, 55,
  56, 57, 109 -> 8 files

Combined KEEP source markdown: 14 files. Within the plan's 10-20 target band.

Plus exempt status-report set (4 entries: rows 110-113) remains in top-level
until exemption expires.

## DELETE:generated totals

Rows 114-128 = 15 entries. Total reclaimed disk: ~30M
(approx: 36K+924K+540K + 44K+1.1M+648K + 32K+6.1M+6.3M + 8.0M + 1.5M+1.4M +
3.6M+16K+280K).

## Frontmatter status

None of the existing KEEP files carry `plan_type:` frontmatter (predates the
policy). Routing in this inventory is by heuristic per the plan
(filename / size / scope cues): `findings`, `audits`, `analysis`, `matrices`,
`strategy docs`, and the round3 brief -> `workstreams/`. Manager plans, the
sweep plan, in-flight progress reports, the on-hold doc, and the NEW1.5
hardening results -> top-level. A subagent will add frontmatter during M2
WS-FOCUSED-MOVE per the plan.

## Dry-run move preview

Format: `old path -> new path or DELETE | reason | affected inbound links`.
Empty `affected inbound links` means no edit required outside the file's own
content. CHANGELOG.md inbound refs are NOT rewritten (per the no-mid-sweep-
CHANGELOG-edits rule); the M4 rollup acknowledges archive moves.

### KEEP source markdown moves (focused/diagnostic -> workstreams/)

| old path                                                             | new path                                                                   | reason                    | affected inbound links   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- | ------------------------ |
| `docs/active_plans/96_well_authoring_shape_finding.md`               | `docs/active_plans/workstreams/96_well_authoring_shape_finding.md`         | focused finding           | docs/TODO.md             |
| `docs/active_plans/96_well_enumeration_audit.md`                     | `docs/active_plans/workstreams/96_well_enumeration_audit.md`               | diagnostic audit          | docs/TODO.md             |
| `docs/active_plans/new2_implementation_test_matrix.md`               | `docs/active_plans/workstreams/new2_implementation_test_matrix.md`         | focused matrix            | (none outside CHANGELOG) |
| `docs/active_plans/new2_production_viewport_overflow_audit.md`       | `docs/active_plans/workstreams/new2_production_viewport_overflow_audit.md` | diagnostic audit          | (none outside CHANGELOG) |
| `docs/active_plans/new2_test_strategy.md`                            | `docs/active_plans/workstreams/new2_test_strategy.md`                      | focused strategy          | (none outside CHANGELOG) |
| `docs/active_plans/new2_validator_preset_regression_audit.md`        | `docs/active_plans/workstreams/new2_validator_preset_regression_audit.md`  | diagnostic audit          | (none outside CHANGELOG) |
| `docs/active_plans/new2_well_plate_adapter_rect_audit.md`            | `docs/active_plans/workstreams/new2_well_plate_adapter_rect_audit.md`      | diagnostic audit          | (none outside CHANGELOG) |
| `docs/active_plans/workstreams/round3_missing_asset_repair_brief.md` | `docs/active_plans/workstreams/round3_missing_asset_repair_brief.md`       | already in place; no move | (none)                   |

### KEEP source markdown stays at top-level

| path                                                            | reason                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/active_plans/clean_up_active_plans.md`                    | this sweep's manager plan                                                               |
| `docs/active_plans/new0_new1_layout_rebuild_progress_report.md` | progress report, full plan scope                                                        |
| `docs/active_plans/new1_5_layout_hardening_results.md`          | NEW1.5 results, full plan scope                                                         |
| `docs/active_plans/new1_well_plate_96_zoom_spike_result.md`     | NEW1 spike result, full plan scope (CHANGELOG 2026-05-20 + 2026-05-21 update both cite) |
| `docs/active_plans/new2_css_native_production_blocker_plan.md`  | NEW2 blocker plan, full plan scope                                                      |
| `docs/active_plans/scene_runtime_activation_on_hold.md`         | on-hold doc, full plan scope                                                            |

### Exempt set (no move, no delete)

| path                                                                        | reason          |
| --------------------------------------------------------------------------- | --------------- |
| `docs/active_plans/current_css_native_layout_manager_status_report.md`      | exempt per plan |
| `docs/active_plans/current_css_native_layout_manager_status_report.html`    | exempt sibling  |
| `docs/active_plans/current_css_native_layout_manager_status_report.pdf`     | exempt sibling  |
| `docs/active_plans/current_css_native_layout_manager_status_report_assets/` | exempt sibling  |

### Archive moves (ARCHIVE:css_native_layout)

44 files: rows 6, 7, 20, 21, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41,
42, 44, 45, 47, 51, 52, 53, 54, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
69, 70, 71, 72, 73, 74, 75, 76, plus DELETE:generated rows 117-122 dispose of
this cluster's HTML/PDF/`_assets/` siblings.

Each `git mv old -> docs/archive/css_native_layout/<same-basename>`.
Inbound link impact: older CHANGELOG entries (archives) keep their links to
the old path -- archived CHANGELOG mirrors are not rewritten. Active surfaces
(TODO, ROADMAP, FILE_STRUCTURE, AGENTS) carry no inbound links to these rows.

### Archive moves (ARCHIVE:no_crop_svg)

10 files: rows 10, 49, 78, 79, 80, 81, 82, 83, 84, 85, 86. DELETE:generated
rows 123, 124, 125, 126, 127, 128 dispose of `_assets/` and HTML/PDF.

### Archive moves (ARCHIVE:git_incident_4e2c709)

9 files: rows 13, 14, 15, 16, 17, 18, 88, 89, 90.

### Archive moves (ARCHIVE:scene_runtime)

7 files: rows 93, 94, 95, 96, 97, 99, 100, 101.

### Archive moves (ARCHIVE:misc_2026_05)

22 files: rows 1, 2, 3, 8, 11, 12, 19, 22, 23, 24, 25, 26, 27, 77, 87, 91, 92,
102, 103, 104, 105, 106, 107, 108.

### DELETE rows

Rows 114-128. Total disk reclaimed: ~30M (35M -> ~5M, hitting the plan's
under-5M target).

## Verification commands (re-run before M2 entry)

```
git ls-files docs/active_plans/ | wc -l
find docs/active_plans -maxdepth 1 ! -path docs/active_plans | wc -l
git status --porcelain docs/active_plans/
du -sh docs/active_plans/
```

Combined entry count: 129 (one row per inventory entry above).

## M1 approval request

User to confirm:

1. The KEEP set (14 source `.md` + 4 exempt entries) matches intent.
2. The CHANGELOG-cited NEW* files (rows 28, 33, 43, 46, 48, 50, 55, 56, 57)
   should be KEEP, not ARCHIVE, despite the "every NEW* -> non-KEEP" exit
   criterion. (Conflict #2 above.)
3. Cluster assignments (`css_native_layout`, `no_crop_svg`,
   `git_incident_4e2c709`, `scene_runtime`, `misc_2026_05`) are correct.
4. The two `workstreams/`-routing heuristic calls (rows 4, 5, 48, 50, 55, 56, 57) match user intent for the two-tier split.
5. The DELETE:generated set is complete and each recipe is acceptable.

No M2 work begins until user signs off.
