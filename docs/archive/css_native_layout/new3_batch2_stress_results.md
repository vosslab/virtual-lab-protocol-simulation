# NEW3 Batch 2 Stress Results

Date: 2026-05-21
Status: Batch 2 closed with mixed verdict. Headline win on artwork integrity; partial regression on composition scorecard requires Workstream-O investigation.

## Headline

Workstream-N (raise footprint--handheld max-height 130/160 -> 260, footprint--small-tool 90 -> 200 in three experiment CSS files) eliminated 99.8% of artwork-integrity HARD_FAILs across 110 stress scenes. Visual gallery (D, 20 PNG pairs) confirms real fix. Failure recluster (E) shows 7 of 9 Batch 1 clusters collapsed.

Scorecard regen reveals a tradeoff: template scenes gain +20 to +24, but 5 dense or composition scenes lose 12 to 16 points. Mean score +0.9, median -1. Five scenes blew the 5pt per-scene regression budget. Workstream-O dispatched to investigate.

## Workstream summary

| Workstream                           | Status             | Outcome                                                                                                                   | Artifact                              |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| AB v1 (handheld sweep)               | DONE_BLOCKED       | wrong-class diagnosis (bottle->container assumed; YAML proves bottle->handheld)                                           | batch2_footprint_fix_summary.md       |
| AB v2 (container max-height)         | DONE_BLOCKED       | wrong-axis; .placement max-height is binding                                                                              | batch2_container_fix_summary.md       |
| ALT-2 (drop .placement max-height)   | DONE_BLOCKED       | subset wins, full 110 regresses r_ovf+127 off_page+86 due to fixed-height grid rows                                       | batch2_alt2_fix_summary.md            |
| SCOPED ALT-2 (work_surface only)     | DONE_BLOCKED       | spec self-contradicts: dropping max-height alone insufficient when overflow:hidden still clips                            | batch2_alt2_scoped_fix_summary.md     |
| C (CSS classification)               | DONE_WITH_CONCERNS | 78-row classification table, 11 preservation rules, 5 patch candidates                                                    | new3_batch2_css_classification.md     |
| F (label policy)                     | DONE_WITH_CONCERNS | 6 policy variants, none materially improves label_readability without other regressions                                   | label_policy_matrix.md                |
| G (viewport policy)                  | DONE               | 60 PNG viewport matrix; current 1920x1080 confirmed reasonable                                                            | viewport_policy_matrix.md             |
| H (perf deep dive)                   | DONE_WITH_CONCERNS | Batch 1 perf misattribution corrected; real adapter 0.1ms p99 @ 1 placement, 0.6ms p99 @ 200                              | runtime_hotpath_profile.md            |
| I (interaction stress)               | DONE               | 6/6 stress paths PASS                                                                                                     | batch2_interaction_results.md         |
| K (object-kind -> footprint mapping) | DONE_WITH_CONCERNS | YAML kind_to_footprint is sole authority (not renderer); 7 mismatches; Rank 2 fix selected for N                          | new3_object_kind_footprint_mapping.md |
| M (manual no-crop review)            | DONE_WITH_CONCERNS | 22 scenes inspected, 100% diagnostic catch rate, 0 blind spots, 4 fix-classes identified                                  | batch2_manual_visual_review.md        |
| N (raise footprint max-heights)      | DONE_WINNER        | 1203 -> 2 incidents on 110 scenes (-99.8%); 0 scenes regressed in precheck budget; 5 scenes regressed in scorecard budget | batch2_workstream_n_fix_summary.md    |
| D (best/worst gallery)               | DONE               | 20 before/after PNG pairs; verdict REAL_FIX                                                                               | batch2_d_gallery_summary.md           |
| E (failure recluster)                | DONE_WITH_CONCERNS | 7 of 9 clusters collapsed; 2 persist (C5 scorecard-only, C6 generator r_ovf)                                              | batch2_e_failure_recluster.md         |
| Scorecard regen                      | DONE               | scorecard_batch2_n/ regenerated post-fix; reveals composition regressions                                                 | scorecard_batch2_n_summary.md         |
| O (regression root cause)            | IN FLIGHT          | investigate 5 scorecard regressions                                                                                       | (pending)                             |

## Headline metrics

### Precheck (artwork integrity, no-crop HARD_FAILs)

| Metric              | Batch 1 | Batch 2-N | Delta          |
| ------------------- | ------- | --------- | -------------- |
| clipped_by_parent   | 631     | 0         | -631 (-100%)   |
| aspect_distorted_HF | 570     | 0         | -570 (-100%)   |
| region_overflow     | 2       | 2         | 0              |
| off_page            | 0       | 0         | 0              |
| Total               | 1203    | 2         | -1201 (-99.8%) |

### Scorecard (composition quality)

| Metric | Batch 1 | Batch 2-N | Delta |
| ------ | ------- | --------- | ----- |
| Min    | 0       | 0         | 0     |
| Median | 41      | 40        | -1    |
| Mean   | 38.6    | 39.5      | +0.9  |
| P95    | 50      | 70        | +20   |
| Max    | 53      | 70        | +17   |

### Regression budget (5pt per scene)

| Source                    | Count >5pt regressed | Verdict                 |
| ------------------------- | -------------------- | ----------------------- |
| Precheck hard_fails delta | 0 / 110              | WITHIN BUDGET           |
| Scorecard total delta     | 5 / 110              | AT THRESHOLD (budget 6) |

Five scenes blowing the budget:

1. stress_dense_clutter_014: -16
2. gold_staining_bench: -15
3. gold_drug_dilution_workspace: -14
4. stress_long_label_scene_002: -13
5. stress_composition_001: -12

Five scenes gaining most:

1. stress_template_015: +24
2. stress_template_002: +21
3. stress_template_007: +20
4. stress_template_006: +20
5. stress_template_019: +20

Pattern: taller handheld/small-tool boxes give template scenes (sparse) more room to show assets. Dense scenes get worse because taller cards reflow composition, pushing primary objects out of frame and increasing label_overlap. Workstream-O investigates.

## Cluster status (post-Workstream-N)

| Cluster | Description                                     | Status                                           |
| ------- | ----------------------------------------------- | ------------------------------------------------ |
| C1      | Universal .placement card clips img bottom 19px | COLLAPSED (-631 incidents)                       |
| C2      | Universal handheld aspect distortion 8.33%      | COLLAPSED (-570 incidents)                       |
| C3      | Tall-glassware double-axis crop                 | COLLAPSED (inferred, in CBP=0)                   |
| C4      | Placeholder-asset square inflation              | UNCHANGED (WARN-level, asset gap)                |
| C5      | Stress sub-class fallthrough to composition     | PERSISTS (scoring-only, no HARD_FAIL)            |
| C6      | Region overflow on many_bottles                 | PERSISTS (2 scenes, generator-driven)            |
| C7      | Zoom_detail large-instrument-in-small-card      | COLLAPSED as HARD_FAIL (visual issue persists)   |
| C8      | Template scenes still hard-fail                 | COLLAPSED (downstream of C1)                     |
| C9      | Unclassified hard_fail_group leaks              | COLLAPSED as HARD_FAIL (diagnostic gap persists) |

## Hard rule compliance

User hard rule: NEVER crop SVG assets in display. Workstream-N reduces clipped_by_parent + aspect_distorted_HF to 0 on 110 stress scenes. Visual gallery (D, 20 scenes) confirms bottle bottoms restored, glassware renders full, aspect preserved. Hard rule compliance achieved at artwork-integrity level for stress corpus.

## Diagnostic integrity check

Workstream-N did not modify precheck.mjs, score_layout.mjs, render_and_dump.mjs. Bridge placement-count guardrail active. No metric-gaming. No filtered placements. No DOM removal from diagnostic input. CSS-only fix in three named experiment files.

## YAML latent issues (from Workstream K)

Workstream K mapping audit found 7 latent mismatches in regions/\*.yaml kind_to_footprint and equipment_large lists. None triggered by current stress corpus; left for Batch 3 cleanup:

1. cell_counter in equipment_small (should be equipment_large) -- 510x361px asset rendered at 280px max-height
2. well_plate_96 in equipment_large (should be plate->container)
3. tube_rack_24, tube_rack_15ml in equipment_large (should be rack)
4. t75_flask landscape 2.15:1 in portrait-biased container box
5. drug_vial_rack landscape 2.03:1 in portrait-biased rack box
6. dilution_tube_rack landscape 1.6:1 in portrait-biased rack box

YAML reclassifications require user approval (bounded YAML edits, but cross 3 region files). See new3_object_kind_footprint_mapping.md Risk Ranking sections 3-5.

## Batch 3 candidates

| Candidate                                                  | Type                | Estimated impact                                            | User approval needed                        |
| ---------------------------------------------------------- | ------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Generator placement cap on rear_shelf                      | Generator/Python    | Clears 2 remaining r_ovf                                    | No (bounded generator change)               |
| YAML reclassifications (K Risk Ranks 3-5)                  | YAML edits          | Improves visual quality on cell_counter, well_plates, racks | YES (closed-vocabulary YAML across 3 files) |
| Investigate scorecard regressions (Workstream O in flight) | Audit + bounded fix | Could recover 60-80 points across 5 scenes                  | Depends on fix shape                        |
| ALT-1 (drop .placement overflow:hidden)                    | CSS                 | No longer needed; N achieves goal without overflow change   | N/A                                         |
| Split-container new classes (L)                            | New CSS vocab       | No longer needed; N achieves goal                           | N/A                                         |
| C5 scorecard manifest fix                                  | score_layout.mjs    | Routes 7 stress sub-classes to correct thresholds           | Bounded, may improve scoring                |

## Data integrity notes

1. precheck_batch2_n/visual_audit.json contains PRE-fix data (Batch 1 baseline carried over). Annotated with STALE DATA WARNING. Authoritative source: full_comparison.json.
2. scorecard_batch2_n/ regenerated 2026-05-21 post-fix. 110 scenes. Use this for all score claims.
3. Workstream-N reported "0 scenes regressed >5pt" measured against precheck hard_fails, not scorecard composition. Scorecard-based budget shows 5/110 regressed. Discrepancy material; documented in this report.

## Boundaries preserved

- docs/PRIMARY_CONTRACT.md unmodified
- Legacy layout engine intact
- precheck.mjs, score_layout.mjs, render_and_dump.mjs semantics unchanged
- src/style.css untouched
- Bridge placement-count guardrail active
- Closed footprint vocabulary preserved (no new classes added)

## Recommendation

Batch 2 closes with N as the headline systemic fix. Hard rule (no SVG cropping) compliance verified on 110-scene stress corpus.

Open items for user decision:

1. Approve YAML reclassifications K identified (cell_counter, well_plate_96, tube_rack_24/15ml, t75_flask landscape).
2. Decide Batch 3 scope: generator placement cap, scorecard regression fix (pending Workstream-O), C5 manifest fix.
3. Game viewport contract (4:3 aspect ratio) decision deferred from Batch 1.
4. Per-scene-class threshold matrix design (composition vs zoom_detail vs template) -- C5 root cause is missing this.

Batch 2 status: CLOSED with concerns documented, evidence on disk, no boundaries violated.
