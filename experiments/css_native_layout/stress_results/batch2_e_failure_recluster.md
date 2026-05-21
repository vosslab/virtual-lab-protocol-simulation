# NEW3 Batch 2 Workstream E - Failure Recluster (post-Workstream-N)

Review date: 2026-05-21
Reviewer: read-only audit agent
Source data: precheck_batch2_n/full_comparison.json (authoritative), precheck_batch1/*.json, scorecard_batch1/*.json

## Data integrity note (critical)

precheck_batch2_n/visual_audit.json contains PRE-fix baseline data, not post-fix. Bounding boxes are byte-identical to Batch 1 per-scene JSON files. File timestamp 2026-05-21T05:15:23.284Z but reflects pre-fix CSS state. Use full_comparison.json as authoritative source. No scorecard_batch2_n/ directory exists; score distribution analysis uses scorecard_batch1/ as proxy.

## Headline: Incident Totals Before/After

| Metric | Batch 1 (pre-fix) | Batch 2-N (post-fix) | Delta |
| --- | --- | --- | --- |
| CBP (clipped_by_parent) | 631 | 0 | -631 (-100%) |
| AD_HF (aspect_distorted hard fail) | 570 | 0 | -570 (-100%) |
| R_OVF (region overflow) | 2 | 2 | 0 (unchanged) |
| OFF_PAGE | 0 | 0 | 0 |
| Total | 1203 | 2 | -1201 (-99.8%) |

Per-scene count: 110 scenes.

## Cluster-by-Cluster Status

### C1: Universal .placement card clips img bottom 19px -- COLLAPSED
All 631 CBP incidents gone. Workstream-N max-height raise (handheld 130/160->260, small-tool 90->200) removed the height cap. The .placement { overflow: hidden } rule remains but no longer clips because max-height accommodates handheld/small-tool assets.

### C2: Universal handheld aspect distortion (8.33% glassware) -- COLLAPSED
All 570 AD_HF incidents gone. Adequate height removes object-fit:contain distortion at near-natural aspect.

### C3: Tall-glassware double-axis crop -- COLLAPSED (inferred)
85 top+bottom CBP records included in CBP=0 post-fix.

### C4: Placeholder-asset square inflation -- STATUS UNKNOWN
WARN-level cluster; underlying 55 missing asset gap persists. Not in full_comparison.json (HARD_FAIL only).

### C5: Stress sub-class fallthrough to composition -- PERSISTS
score_layout.mjs filename-prefix heuristic does not recognize 7 stress sub-classes; routes to composition. No fix applied. Scoring-only, no HARD_FAIL impact.

### C6: Region overflow on many_bottles -- PERSISTS
2 remaining r_ovf incidents are exactly C6. stress_many_bottles_scene_001 (overflow_h=202px), stress_many_bottles_scene_002 (overflow_h=417px). Generator over-stuffs rear_shelf (16/17 bottles into 232px row). Workstream-N may have slightly worsened (taller bottles in already-overflowing region).

### C7: Zoom_detail large-instrument-in-small-card -- COLLAPSED (inferred)
CBP records included in CBP=0. Underlying issue (wrong asset for zoom scene) persists at layout level. zoom_detail scorecard scores remain low.

### C8: Template scenes still hard-fail -- COLLAPSED
Downstream of C1. All 20 template scenes now pass artwork-integrity precheck.

### C9: Unclassified hard_fail_group leaks -- COLLAPSED (inferred)
230 AD_HF records with hard_fail_group=None included in AD_HF=0. Diagnostic classification gap persists; if CSS regresses, C9 re-emerges.

## Score Distribution

Batch 1 baseline (scorecard_batch1):
- Min 0, Median 41.0, Mean 38.6, P95 50, Max 53

Post-fix (batch2_n) score distribution: NOT AVAILABLE. No scorecard_batch2_n/ exists. Must re-run score_layout.mjs against post-fix HTML outputs.

What can be inferred: scorecard hard_fails field tracks region_overflow, not CBP/AD_HF. Clearing CBP/AD_HF changes precheck output but does not change scorecard composition metrics. The 2 worst scenes (many_bottles_scene_001/002) still score 0 because scorecard hard_fails=1 for region_overflow forces zero.

## Top 10 Remaining Problem Scenes

| Rank | Scene | Batch 1 Score | Post-fix Score (est.) | Top failure |
| --- | --- | --- | --- | --- |
| 1 | stress_many_bottles_scene_001 | 0 | 0 | r_ovf hard zero |
| 2 | stress_many_bottles_scene_002 | 0 | 0 | r_ovf hard zero |
| 3 | stress_zoom_detail_010 | 16 | 16 | primary_area_ratio |
| 4 | stress_zoom_detail_001 | 19 | 19 | primary_area_ratio |
| 5 | stress_zoom_detail_002 | 19 | 19 | primary_area_ratio |
| 6 | stress_zoom_detail_009 | 19 | 19 | primary_area_ratio |
| 7 | stress_zoom_detail_005 | 21 | 21 | primary_area_ratio |
| 8 | stress_zoom_detail_007 | 21 | 21 | primary_area_ratio |
| 9 | gold_well_plate_96_zoom_with_state | 23 | 23 | primary_area_ratio |
| 10 | stress_zoom_detail_003 | 24 | 24 | primary_area_ratio |

All zoom_detail scenes retain low scores due to primary_area_ratio threshold (25% not calibrated for zoom). Not a HARD_FAIL; scorecard calibration gap.

## Top 10 Most-Improved Scenes (incident-delta basis)

| Scene | Pre-fix CBP | Pre-fix AD_HF | Total pre | Post total | Delta |
| --- | --- | --- | --- | --- | --- |
| stress_dense_clutter_010 | 13 | 10 | 23 | 0 | -23 |
| stress_dense_clutter_006 | 13 | 10 | 23 | 0 | -23 |
| stress_dense_clutter_008 | 13 | 10 | 23 | 0 | -23 |
| stress_dense_clutter_004 | 13 | 9 | 22 | 0 | -22 |
| stress_dense_clutter_017 | 12 | 9 | 21 | 0 | -21 |
| stress_dense_clutter_018 | 12 | 9 | 21 | 0 | -21 |
| stress_many_small_tools_scene_002 | 9 | 9 | 18 | 0 | -18 |
| gold_staining_bench | 10 | 5 | 15 | 0 | -15 |
| stress_long_label_scene_003 | 8 | 7 | 15 | 0 | -15 |
| stress_instrument_heavy_008 | 6 | 6 | 12 | 0 | -12 |

## Win Distribution

UNIFORM. 108/110 scenes dropped from >=1 hard fail to 0. Only many_bottles_scene_001 and _002 remain at non-zero (1 r_ovf each). Zero scenes regressed. Universal CSS geometry fault: every scene with handheld or small-tool placements benefited equally. Systemic CSS fix signature, not scene-specific patch.

## New Top Failure Class

R_OVF (region_overflow):
- 2 instances, 2 scenes
- stress_many_bottles_scene_001 (rear_shelf overflow_h=202px), _002 (overflow_h=417px)
- Root cause: generator emits more bottles per scene than rear_shelf can accommodate. 16-17 bottles stack into 2-3 rows; rear_shelf is single-row 232px flex region.
- Classification: C6 (generator over-stuffing). Scene-specific, not systemic.
- Affected region: rear_shelf in bench layout.
- NOT a CSS failure. Generator count ceiling gap.

## Batch 3 Fix Candidate

Single viable systemic fix: generator placement cap for rear_shelf.

Fix target: scene generator or scene composition rules for many_bottles_scene_* stress classes. Cap bottle count per rear_shelf region to value that does not cause vertical overflow. Based on region height 232px and post-fix placement card height ~260px, maximum non-overflowing placement count is ~8 per row.

Estimated impact: clears 2 remaining r_ovf incidents. No CSS change required.

Whether this fix is worth a dedicated batch depends on whether many_bottles_scene represents real curriculum content. If synthetic stress artifact only, r_ovf incidents are expected and acceptable.

No further systemic CSS fix is needed. Workstream-N max-height increase resolved all CSS-driven HARD_FAILs. Remaining failures (r_ovf) are generator-driven.

Secondary candidates (not systemic):
- C9 diagnostic gap: add hard_fail_group to object library entries for rack, tray, vial. Improves classification but does not fix any current HARD_FAIL. Low urgency.
- Scorecard re-run: run score_layout.mjs against post-fix batch2_n HTML outputs to get fresh scorecard. Required before score distribution claims. Tooling gap, not CSS fix.

## Concerns

1. Missing post-fix scorecard. No scorecard_batch2_n/ directory exists. Score distribution uses batch1 as proxy. Re-run score_layout.mjs against post-fix HTML before any score-based claims.

2. visual_audit.json contains pre-fix data. precheck_batch2_n/visual_audit.json and visual_audit.md contain pre-fix baseline data. full_comparison.json is the only valid post-fix source. File needs rename or annotation.

3. Workstream-N fix did not restore aspect_ratio_fidelity in scorecard. Batch 1 had aspect_ratio_fidelity=0 in scorecard even with 0 hard_fails. Scorecard fidelity metric tracks something different from precheck AD_HF. Relationship unclear; warrants investigation.

4. R_OVF severity. 2 remaining r_ovf force score=0 in scorecard for many_bottles scenes. These are stress scenes (not gold), so score=0 not a curriculum failure. Generator over-stuffing could appear in curriculum if author places many bottles on rear_shelf.

5. Diagnostic integrity preserved. Workstream-N fix does not modify precheck.mjs, score_layout.mjs, render_and_dump.mjs. Bridge placement-count guardrail unchanged.

## Handoff

Status: DONE_WITH_CONCERNS
Cluster collapse counts: 7 collapsed (C1, C2, C3, C7, C8, C9 as HARD_FAILs; C4 unchanged non-HARD_FAIL gap), 2 persisting (C5 scorecard-only, C6 r_ovf)
Top remaining failure class: R_OVF -- 2 incidents, 2 scenes, generator-driven
Batch 3 fix candidate: Generator placement cap on rear_shelf, no CSS change needed
Blocker: Missing post-fix scorecard. Data gap, not contract amendment.
