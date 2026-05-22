# NEW3 Batch 4 Workstream C: Scorecard No-Crop Alignment Proposal

Status: PROPOSAL ONLY. User approval required. No code change made.
Date: 2026-05-21
Workstream: C (scorecard semantic alignment with precheck hard-fail definition)
Use "workstream" not "lane".

## Current state

### Location of hardFailCount in score_layout.mjs

File: experiments/css_native_layout/score_layout.mjs
Function: computeSceneMetrics, lines 332-339.

```javascript
const hardFailCount =
    (checks.clipped_artwork || []).length +
    (checks.off_page || []).length +
    (checks.svg_svg_overlap || []).length +
    (checks.region_overflow || []).length;
```

The hardFailCount value is returned at line 386 and consumed at line 453:

```javascript
if (hardFailCount > 0) {
    totalScore = 0;
}
```

### Current count categories

| Category | Source in visual_audit.json | Description |
| --- | --- | --- |
| clipped_artwork | checks.clipped_artwork | Placement bbox exceeds parent region bbox |
| off_page | checks.off_page | Placement center or corners outside viewport |
| svg_svg_overlap | checks.svg_svg_overlap | Placement-bbox intersection between two placements |
| region_overflow | checks.region_overflow | Region scrollHeight > clientHeight |

### Why this set was originally chosen

These four categories correspond to the original hard-fail list documented in experiments/css_native_layout/PRECHECK_SUMMARY.md (line 63): "Hard fails: clipped_artwork, off_page, svg_svg_overlap, region_overflow."

The clipped_by_parent and aspect_distorted sub-checks were added later as part of the artwork-integrity diagnostic suite (P3.0), described at precheck.mjs lines 277-287 as "Artwork Integrity Diagnostic Checks (P3.0)". The scorecard was not updated when the new checks were added to precheck.

### Precheck hard-fail definition (current, authoritative)

precheck.mjs lines 1083-1099 show the current hasHardFail logic:

```javascript
const integrityClippedByParent = checks.artwork_integrity?.clipped_by_parent || [];
const integrityAspectHardFails = (checks.artwork_integrity?.aspect_distorted || [])
    .filter(item => item.severity === 'HARD_FAIL');

const hardFails = [
    checks.clipped_artwork.length > 0,
    checks.off_page.length > 0,
    checks.svg_svg_overlap.length > 0,
    checks.region_overflow.length > 0,
    integrityClippedByParent.length > 0,
    integrityAspectHardFails.length > 0
];

const hasHardFail = hardFails.some(x => x);
```

The precheck already treats clipped_by_parent and aspect_distorted_HF as hard fails for the PASS/FAIL verdict. The scorecard does not. This is the semantic gap this proposal closes.

### Pseudocode of current scoring formula

```
function computeSceneMetrics(sceneData):
    hardFailCount =
        len(checks.clipped_artwork)
        + len(checks.off_page)
        + len(checks.svg_svg_overlap)
        + len(checks.region_overflow)

function scoreScene(sceneData):
    { hardFailCount, metrics } = computeSceneMetrics(sceneData)
    if hardFailCount > 0:
        totalScore = 0
    else:
        totalScore = computeTotalScore(metrics, weights)
    return { total_layout_score: totalScore, hard_fails: hardFailCount }
```

## Proposed change

### Extend hardFailCount to include crop and distortion violations

| New category | Source in visual_audit.json | Severity in precheck | Description |
| --- | --- | --- | --- |
| clipped_by_parent | checks.artwork_integrity.clipped_by_parent | HARD_FAIL (always) | SVG img bbox clipped by ancestor with overflow != visible |
| aspect_distorted_HF | checks.artwork_integrity.aspect_distorted filtered by severity === 'HARD_FAIL' | HARD_FAIL for glassware, pipette, plate, instrument | Rendered aspect ratio differs from natural by >5% on high-priority object class |

### Pseudocode of proposed scoring formula

```
function computeSceneMetrics(sceneData):
    legacyHardFailCount =
        len(checks.clipped_artwork)
        + len(checks.off_page)
        + len(checks.svg_svg_overlap)
        + len(checks.region_overflow)

    clippedByParent = checks.artwork_integrity?.clipped_by_parent ?? []
    aspectDistortedHF = (checks.artwork_integrity?.aspect_distorted ?? [])
                            .filter(item => item.severity === 'HARD_FAIL')
    extendedHardFailCount =
        legacyHardFailCount
        + len(clippedByParent)
        + len(aspectDistortedHF)

function scoreScene(sceneData):
    { legacyHardFailCount, extendedHardFailCount, metrics } = computeSceneMetrics(sceneData)
    if extendedHardFailCount > 0:
        totalScore = 0
    else:
        totalScore = computeTotalScore(metrics, weights)
    return {
        total_layout_score: totalScore,
        hard_fails: extendedHardFailCount,
        hard_fails_legacy: legacyHardFailCount,
        hard_fails_extended: extendedHardFailCount
    }
```

### Backward-compat: dual fields during transition

Phase 1: add hard_fails_legacy + hard_fails_extended alongside existing hard_fails. Existing hard_fails keeps current semantics. No score changes.

Phase 2: hard_fails switches to extended count; zeroing uses hard_fails_extended.

Phase 3: retire hard_fails_legacy.

## Expected effect on existing scores

### Batch 1 (pre-Workstream-N, legacy scoring)

From precheck_batch1_summary.md:

| Failure type | Total count (110 scenes) |
| --- | --- |
| clipped_by_parent | 631 |
| aspect_distorted_HF | 570 |
| region_overflow | 2 |
| clipped_artwork | 0 |
| off_page | 0 |
| svg_svg_overlap | 0 |

Hard-fail distribution:

| hard_fail_count | scenes |
| --- | --- |
| 1 | 7 |
| 2 | 101 |
| 3 | 2 |

All 110 scenes had at least one clipped_by_parent or aspect_distorted_HF. Every scene had hard_fail_count >= 1 in precheck verdict. Under aligned scoring: extendedHardFailCount > 0 for all 110.

Expected effect:
- Current Batch 1 median: 41, mean: 38.6
- Expected post-alignment median: 0, mean: 0 (all 110 scenes zeroed)
- Exception: stress_many_bottles_scene_001/_002 already 0 under legacy (region_overflow). Stay at 0.
- Net change: 108 scenes move from nonzero to 0.

### Batch 2-N canonical (post-Workstream-N, legacy scoring)

From scorecard_batch2_n_canonical_summary.md:
- Current median: 41, mean: 37.8
- 2 scenes already 0: stress_many_bottles_scene_001/_002 (region_overflow)
- Remaining 108: had 0 clipped_by_parent and 0 aspect_distorted_HF post-N

Under aligned scoring: 108 scenes unchanged (extended = 0). 2 many_bottles stay at 0.

Expected effect:
- Median: 41 (unchanged)
- Mean: ~37 (marginal)
- Per-scene delta: all 110 essentially unchanged

### dense_clutter_014 (Workstream-D finding)

From batch3_d_dense_clutter_014_analysis.md:
- Pre-fix (batch1): 10 clipped_by_parent HARD_FAILs + 8 aspect_distorted HARD_FAILs; scorecard reported hard_fails=0 and total=49
- Post-fix (batch2_n_canonical): 0 clipped_by_parent, score 30

Under aligned scoring:
- Pre-fix aligned: 0 (extendedHardFailCount >= 10, zeroing fires)
- Post-fix aligned: 30 (unchanged)
- The 49->30 "regression" is reframed: true trajectory is 0->30, an IMPROVEMENT. The regression was measurement artifact.

## Reframe of Workstream-N win

Under legacy scoring, Workstream-N appeared neutral on scorecard (Batch 1 median 41, Batch 2-N median 41).

Under aligned scoring, Workstream-N win is much larger:
- N moved 108 scenes from "would-be zero" (active crop violations legacy scoring ignored) to measured composition scores (range 15-53, median ~41)
- Mean uplift: ~37-40 points across 108 scenes
- N did not preserve scores. It LIFTED 108 scenes from hard-fail-zeroed state into valid scoring territory.

This reframe clarifies why "Batch 1 median 41" was not meaningful baseline. Median calculated on scenes that should have scored 0. Aligned metric makes Batch 2-N canonical the true starting baseline.

## Risks

### Score-regression risk on prior reports

Any report citing "Batch 1 median 41" or individual pre-N scene scores becomes misleading. Aligned Batch 1 = median 0. Could confuse readers.

Mitigation: label all Batch 1 data as "legacy scoring (pre-alignment)" and all Batch 2-N canonical as "aligned scoring (post-Workstream-N)".

### Retroactive label requirement

All scorecard JSON files and summaries from Batch 1 and earlier need scoring_mode annotation: legacy for pre-Phase-2, aligned for post-Phase-2.

### Phase 1 risk is low

Phase 1 (additive fields only) carries low risk. Adds two read-only fields. Does not change total_layout_score or existing hard_fails. Existing consumers unaffected.

### Phase 2 is a breaking change

Phase 2 switches zeroing. Pipelines reading cached Batch 1 scorecard total_layout_score see scores change from nonzero to zero. Statistics across batches break. Intended semantic correction, requires explicit user review.

## Rollout plan

### Phase 1: Additive fields, no score change (low risk)

Change computeSceneMetrics to compute both counts. Add hard_fails_legacy + hard_fails_extended to scorecard JSON. Do NOT change hard_fails or zeroing formula. Re-run on Batch 1 and Batch 2-N canonical to confirm:
- Batch 1: all 110 scenes show hard_fails_extended >= 1
- Batch 2-N canonical: 108 scenes show hard_fails_extended = 0; 2 show >= 1 (many_bottles)

User approves Phase 1 output before proceeding.

### Phase 2: Switch zeroing logic (medium risk, user approval required)

Change zeroing condition from hard_fails > 0 to hard_fails_extended > 0. Change emitted hard_fails to carry extended count. Re-run scorecard on all batches. Verify Batch 1 median drops to 0 and Batch 2-N canonical median stays at 41. User approves before labeling Batch 2-N canonical as authoritative baseline.

### Phase 3: Deprecate legacy field

Remove hard_fails_legacy from output JSON. Update documentation. Mark all pre-Phase-2 archives with scoring_mode: legacy.

## Recommendation

Request user approval for Phase 1 first (additive, no score change, low risk). Phase 1 produces evidence: does hard_fails_extended for Batch 1 match the 631+570=1201 individual hard-fail events expected from precheck_batch1_summary.md?

Then request user approval for Phase 2 once Phase 1 evidence reviewed.

Do NOT attempt Phase 2 without user review of Phase 1 output. Batch 1 score distribution change (median 41 to median 0) will appear dramatic and requires explicit acknowledgment that prior Batch 1 numbers were artifacts of incomplete counting, not evidence of good layout quality.

## Handoff

Status: DONE
Artifact path: docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md
File:line of hardFailCount function: experiments/css_native_layout/score_layout.mjs:335-339 (inside computeSceneMetrics defined at line 332)
Phase 1 estimated risk: low (additive only, no score change)
Phase 2 estimated risk: medium (zeroing switch, Batch 1 median drops to 0)
Blockers: None. Proposal only. User approval required before any code change.
