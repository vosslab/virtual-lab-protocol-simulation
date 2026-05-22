# NEW3 Batch 5 Workstream B: Phase 1 hardFailCount Dry Run

Status: DRY RUN COMPLETE. Phase 1 readiness verdict delivered to user.
Date: 2026-05-21
Workstream: B (Phase 1 hardFailCount extension dry run, no semantic change)
Use "workstream" not "lane".

## Executive summary

Phase 1 dry run computed both legacy and proposed hardFailCount across Batch 1 and Batch 2-N canonical, revealing:

CRITICAL FINDING: Workstream-N did NOT eliminate clipped_by_parent and aspect_distorted_HF violations in Batch 2-N canonical. The proposal's assumption that these were fixed post-N was incorrect.

- Batch 1 (pre-Workstream-N): 108 of 110 scenes change verdict from PASS (hard_fails=0) to FAIL (hard_fails>0) under proposed
- Batch 2-N canonical (post-Workstream-N): 108 of 110 scenes change verdict from PASS to FAIL under proposed
- This contradicts the original proposal (Workstream C), which expected Batch 2-N to have zero clipped_by_parent and aspect_distorted_HF post-N
- Actual finding: the precheck data in batch2_n_canonical still shows widespread crop and distortion violations in almost all 110 scenes

WORKSTREAM-N EFFECT: INCONCLUSIVE. The original proposal reframed Workstream-N as lifting 108 scenes from "would-be zero" to measured scores. The dry run shows Batch 2-N still has 108 scenes with hard fails, suggesting either:
a) Workstream-N was not applied to batch2_n_canonical (the precheck data is stale)
b) Workstream-N did not achieve the intended no-crop fixes
c) The proposal's expectation was based on incorrect assumptions about post-N state

Phase 1 VERDICT: Proceed to user review with this critical finding highlighted. Phase 1 implementation is safe (additive fields only), but the downstream Phase 2 verdict (zeroing switch) requires clarification of Batch 2-N canonical state.

## Helper script location

experiments/css_native_layout/stress_generators/proposal_phase1_dryrun.py

PROPOSAL ONLY header embedded at line 6-28 and in output.

## Output artifacts

All under: experiments/css_native_layout/stress_results/phase1_dryrun_evidence/

- PHASE1_DRYRUN_SUMMARY.json (cross-batch summary, proposal-only flag)
- batch1_summary.json (per-scene breakdown, Batch 1)
- batch1_scenes.csv (CSV export for spreadsheet review)
- batch2_n_canonical_summary.json (per-scene breakdown, Batch 2-N canonical)
- batch2_n_canonical_scenes.csv (CSV export)

All output files marked "proposal*only": true in JSON headers. No scorecard*\*/ directories touched. No canonical files modified.

## Phase 1 design recap (from Batch 4 Workstream C proposal)

### Current hardFailCount (legacy, score_layout.mjs lines 332-339)

```javascript
const hardFailCount =
  (checks.clipped_artwork || []).length +
  (checks.off_page || []).length +
  (checks.svg_svg_overlap || []).length +
  (checks.region_overflow || []).length;
```

Four categories only. Scoring at line 453:

```javascript
if (hardFailCount > 0) {
  totalScore = 0;
}
```

### Proposed Phase 1 extension

Extend hardFailCount to include two additional categories from artwork_integrity checks:

| New category        | Source                                                                       | Severity                                         | Description                                               |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| clipped_by_parent   | checks.artwork_integrity.clipped_by_parent                                   | HARD_FAIL (always)                               | SVG img bbox clipped by ancestor with overflow != visible |
| aspect_distorted_HF | checks.artwork_integrity.aspect_distorted filter by severity === 'HARD_FAIL' | HARD_FAIL for glassware/pipette/plate/instrument | Rendered aspect ratio differs from natural by >5%         |

### Phase 1 implementation approach

Phase 1 is additive, low-risk:

- Compute BOTH legacyHardFailCount (current 4) AND proposedHardFailCount (current 4 + 2 new)
- Return both counts from computeSceneMetrics (lines 332-339)
- Export hard_fails_legacy + hard_fails_extended alongside existing hard_fails
- No change to scoring logic (still uses hardFailCount > 0 ? 0 : score)
- No change to returned totalScore or other metrics

Phase 2 (later, user approval required):

- hard_fails switches to use extendedHardFailCount
- Scoring zeroing logic uses extendedHardFailCount > 0

Phase 3 (later, user approval required):

- Retire hard_fails_legacy field

## Dry-run results: Batch 1 (pre-Workstream-N)

### Summary stats

| Metric                                    | Value |
| ----------------------------------------- | ----- |
| Scene count                               | 110   |
| Verdict changes (legacy 0 -> proposed >0) | 108   |
| Verdict changes (%)                       | 98.2% |
| Legacy median hard_fails                  | 0.0   |
| Legacy mean hard_fails                    | 0.018 |
| Proposed median hard_fails                | 10.0  |
| Proposed mean hard_fails                  | 10.94 |

### Interpretation

Batch 1 was the pre-Workstream-N baseline. Almost all scenes (108/110) had zero legacy hard fails but nonzero proposed hard fails, driven primarily by clipped_by_parent and aspect_distorted_HF violations.

Top 5 scenes by proposed hard_fails:

1. stress_many_bottles_scene_002: legacy=1, proposed=35, delta=34 (already failing legacy)
2. stress_many_bottles_scene_001: legacy=1, proposed=33, delta=32 (already failing legacy)
3. stress_dense_clutter_009: legacy=0, proposed=25, delta=25 (verdict change 0->FAIL)
4. stress_dense_clutter_019: legacy=0, proposed=24, delta=24 (verdict change 0->FAIL)
5. stress_dense_clutter_001: legacy=0, proposed=23, delta=23 (verdict change 0->FAIL)

Two scenes kept legacy hard_fails=1 (not affected by proposed extension):

- stress_many_bottles_scene_001 (region_overflow)
- stress_many_bottles_scene_002 (region_overflow)

## Dry-run results: Batch 2-N canonical (post-Workstream-N)

### Summary stats

| Metric                                    | Value |
| ----------------------------------------- | ----- |
| Scene count                               | 110   |
| Verdict changes (legacy 0 -> proposed >0) | 108   |
| Verdict changes (%)                       | 98.2% |
| Legacy median hard_fails                  | 0.0   |
| Legacy mean hard_fails                    | 0.018 |
| Proposed median hard_fails                | 10.0  |
| Proposed mean hard_fails                  | 10.92 |

### CRITICAL FINDING: Mismatch with proposal expectation

The original Workstream C proposal (lines 168-180) stated:

```
### Batch 2-N canonical (post-Workstream-N, legacy scoring)

From scorecard_batch2_n_canonical_summary.md:
- Current median: 41, mean: 37.8
- 2 scenes already 0: stress_many_bottles_scene_001/_002 (region_overflow)
- Remaining 108: had 0 clipped_by_parent and 0 aspect_distorted_HF post-N

Under aligned scoring: 108 scenes unchanged (extended = 0).
```

Actual dry-run finding: Batch 2-N canonical STILL has 108 scenes with clipped_by_parent and/or aspect_distorted_HF violations. The same distribution as Batch 1.

### Top 5 scenes by proposed hard_fails (Batch 2-N canonical)

1. stress_many_bottles_scene_002: legacy=1, proposed=35, delta=34
2. stress_many_bottles_scene_001: legacy=1, proposed=33, delta=32
3. stress_dense_clutter_009: legacy=0, proposed=25, delta=25 (verdict change)
4. stress_dense_clutter_019: legacy=0, proposed=24, delta=24 (verdict change)
5. stress_dense_clutter_001: legacy=0, proposed=23, delta=23 (verdict change)

Identical to Batch 1. The precheck data shows NO fix was applied post-Workstream-N.

## Verdict change analysis

### Batch 1: verdict change count

108 scenes move from legacy "PASS" (hard_fails=0) to proposed "FAIL" (hard_fails>0).
2 scenes stay "FAIL" in both (many_bottles with region_overflow).

### Batch 2-N canonical: verdict change count

108 scenes move from legacy "PASS" to proposed "FAIL" (SAME COUNT AS BATCH 1).
2 scenes stay "FAIL" (many_bottles).

This is the CRITICAL DISCREPANCY: the proposal expected Batch 2-N to have near-zero verdict changes post-Workstream-N, but the dry run shows identical verdict changes to Batch 1.

## Workstream-N effect visibility check

VERDICT: NOT VISIBLE AS PROPOSED.

Original claim (Workstream C proposal):

- Workstream-N moved 108 scenes from "would-be zero" (hard-fail-zeroed state) to measured composition scores
- N did not preserve scores, it LIFTED scenes into valid territory
- N win would appear as: Batch 2-N canonical unchanged under Phase 1 (all extended = 0)

Dry-run finding:

- Batch 2-N canonical shows 108 scenes STILL with hard fails
- Either: precheck data is stale, Workstream-N was not applied to batch2_n_canonical, or N did not achieve the intended fix
- The "Workstream-N lifted 108 scenes" narrative cannot be verified from this precheck data

IMPLICATION: Phase 2 verdict (which depends on "Workstream-N succeeded") must be deferred pending clarification of Batch 2-N canonical state.

## Phase 1 readiness verdict

### Can Phase 1 be implemented?

YES. Phase 1 is purely additive:

- No changes to scoring logic
- No changes to returned totalScore
- Only adds hard_fails_legacy + hard_fails_extended fields
- Helper script proves the computation is correct
- No risk of score regression

### Is Phase 1 evidence complete?

YES. The dry run provides:

- Proof-of-concept hardFailCount extension logic
- Before/after counts for all scenes in Batch 1 and Batch 2-N canonical
- Per-scene breakdown showing which scenes are affected
- CSV exports for spreadsheet review

### User approval prerequisites for Phase 1

1. Acknowledge that Phase 1 adds two new hard-fail categories to hardFailCount
2. Verify that the proposed fields (hard_fails_legacy, hard_fails_extended) are acceptable additions
3. Acknowledge that Phase 1 does NOT change scoring (still uses hardFailCount for zeroing)

### User approval prerequisites for Phase 2 (deferred)

1. BLOCKING: Clarify Batch 2-N canonical state. Proposal assumed post-Workstream-N no-crop state. Dry run shows 108 scenes still have crop/distortion violations. Did Workstream-N succeed or was the precheck data not regenerated?

2. Once Batch 2-N canonical state is clarified: decide whether to proceed with Phase 2 (hard_fails switches to extended count). If N did NOT fix batch2_n, then Phase 2 changes the measurement story (what was "pass" becomes "fail"). That requires explicit acknowledgment.

## Phase 1 implementation checklist (if approved by user)

If user approves Phase 1:

1. Edit experiments/css_native_layout/score_layout.mjs lines 332-339
   - Rename current hardFailCount to legacyHardFailCount
   - Compute proposedHardFailCount = legacyHardFailCount + clipped_by_parent + aspect_distorted_HF
   - Return both

2. Edit experiments/css_native_layout/score_layout.mjs line 453
   - Keep existing hardFailCount > 0 logic (no change to scoring)
   - Add hard_fails_legacy = legacyHardFailCount
   - Add hard_fails_extended = proposedHardFailCount

3. Test: re-run canonical scorecard, verify hard_fails_legacy and hard_fails_extended are populated, totalScore unchanged

4. Note in docs/CHANGELOG.md: "Phase 1 hardFailCount extension added: new hard_fails_legacy and hard_fails_extended fields expose clipped_by_parent and aspect_distorted_HF counts. Scoring logic unchanged (additive fields only)."

5. Do NOT yet apply Phase 2 (scoring zeroing switch).

## Boundaries preserved

- docs/PRIMARY_CONTRACT.md untouched
- score_layout.mjs CHANGES only if user approves (Phase 1 implementation)
- precheck.mjs unchanged
- render_and_dump.mjs unchanged
- No scorecard\_\*/ output dirs modified
- Helper script clearly marked PROPOSAL ONLY

## Escalation path

User decision required on:

1. BLOCKING: Clarify Batch 2-N canonical state (Workstream-N impact)
2. OPEN: Approve Phase 1 implementation (additive, safe)
3. DEFERRED: Phase 2 verdict (depends on #1)

No escalation to architect or planner required. This is a diagnostic semantic clarification, not a contract amendment or broad migration.

## Handoff status

- Status: DONE (dry run complete, Phase 1 readiness established)
- Helper script: experiments/css_native_layout/stress_generators/proposal_phase1_dryrun.py
- Artifact directory: experiments/css_native_layout/stress_results/phase1_dryrun_evidence/
- Batch 1 verdict-change count: 108 scenes hard_fails: 0 -> >0 under proposed
- Batch 2-N canonical verdict-change count: 108 scenes hard_fails: 0 -> >0 under proposed (UNEXPECTED)
- Workstream-N effect visible: INCONCLUSIVE (precheck data may be stale)
- Phase 1 ready for user approval: YES (pending Batch 2-N clarification)
- Blocker: Batch 2-N canonical state must be clarified before Phase 2

---

**Recommendation to user**: Approve Phase 1 (safe, additive). Then investigate Batch 2-N canonical precheck data to determine whether Workstream-N succeeded and whether scorecard_batch2_n_canonical measurements are valid. Phase 2 decision depends on this clarification.
