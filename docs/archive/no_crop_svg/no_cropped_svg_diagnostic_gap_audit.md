# No-Cropped SVG Diagnostic Gap Audit (Workstream C)

Date: 2026-05-21
Status: DONE_WITH_CONCERNS

## Inputs used

- docs/active_plans/no_cropped_svg_screenshot_audit.md (Workstream A, 52 flagged objects)
- experiments/css_native_layout/precheck.mjs (full source, 1460 lines)
- experiments/css_native_layout/styles/bench.css (lines 83-134, region overflow rules)
- experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/visual_audit.json (batch5 corpus, 100 scenes, all FAIL)
- docs/active_plans/no_cropped_svg_asset_sizing_table.md (Workstream E)
- docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md (Batch 5 Workstream C)

## Summary catch rate

| State                        | Caught   | Missed   | Miss rate |
| ---------------------------- | -------- | -------- | --------- |
| BEFORE (no sub-checks e/f)   | 0 / 52   | 52 / 52  | 100%      |
| AFTER (sub-checks e+f added) | ~20 / 52 | ~32 / 52 | ~62%      |

The AFTER improvement is entirely attributable to sub-check e catching placement-card overflow clipping and sub-check f catching aspect distortion for the small set of assets with real natural dimensions. All PLACEHOLDER failures, all overflow:visible region-boundary spillage, all template-mode instrument invisibility, and all footprint-too-small cases remain undetected.

## Root cause categories

### RC1: overflow:visible (parent-overflow)

CSS: bench.css lines 97-100 (.region--rear_shelf) and lines 113-116 (.region--front_tools) default to overflow:visible. precheck.mjs sub-check e ancestor traversal at lines 545-569 skips ancestors where overflowX/Y === 'visible'. clipped_artwork at lines 66-119 measures placement vs locator chain that may not reach .region element.

Root cause: clipped_artwork detector architecturally blind to overflow:visible spillage. Sub-check e requires non-visible ancestor to fire. Neither detects overflow:visible spillage.

Impact: ~10-14 of 52 flagged objects.

### RC2: svg-grow-needed (PLACEHOLDER / asset not loading)

When SVG fails to load, DOM renders dashed-border PLACEHOLDER. img element either has broken src or absent.

precheck.mjs sub-check e (line 534): guard returns null if width/height === 0. Sub-check f (line 633): skipped if naturalDims both 0. Sub-check a (line 362): same guard.

region_whitespace flags WARN with > 80% whitespace but indirect. primary_object exits early with PASS_TEMPLATE in template mode.

Root cause: no check examines if img src resolved, if naturalWidth/Height are 0 (broken load), or if container has PLACEHOLDER class. Whitespace signal indirect, doesn't identify object-level.

Impact: ~20-24 of 52 flagged objects. Largest miss category.

### RC3: aspect-cap-wrong (footprint mismatch / 150x150 placeholder)

sizing_manifest.json natural_width_px: 150, natural_height_px: 150 (placeholder) for most assets. Sub-check f computes delta between rendered AR (e.g. 0.917) and natural AR 1.000. Bottle 220x240 produces 8.3% delta triggering HARD_FAIL for glassware group. Real bottle AR is ~0.461 per Workstream E.

Only ~9 assets with real measured dimensions (microtube, drug_vial_rack, waste_container, waste_tray, electrophoresis_tank, centrifuge, incubator, vortex, gel_cassette).

Area-ratio underutilization is WARN only via sub-check a (60% threshold).

Root cause: sizing_manifest contains 150x150 placeholders. Aspect check sensitivity diluted. Area-ratio is WARN only.

Impact: ~5-8 of 52 objects with significant aspect distortion that sub-check f would catch more accurately with real dimensions.

### RC4: template-mode skip

precheck.mjs lines 837-849: checkPrimaryObjectRatio returns PASS_TEMPLATE early if sceneMode === 'template'. Verdict logic lines 1103-1113 produces PASS_TEMPLATE regardless of 0x0 primary instrument. Hard-fail list lines 1090-1097 does NOT include primary_object.flag - WARN contributor only.

For microscope_basic, cell_counter_basic: instrument renders 0x0. clipped_by_parent requires width/height !== 0 (line 535 guard), exits immediately. No sub-check fires.

Two-layer shield: template-mode skip + primary_object.flag is WARN not HARD_FAIL.

Impact: 4 of 52 rows (2 named objects in 2 screenshot sources each). Severity-1 failures (primary educational object completely absent).

### RC5: footprint-too-small (rendered area underutilization)

Sub-check a flags area_ratio < 60% as WARN. Threshold 60% not tuned for real-AR distribution. No HARD_FAIL escalation per object kind.

Root cause: no per-object-kind minimum rendered area check. Sub-check a fixed 60% at WARN with no escalation.

Impact: ~6-8 of 52 objects.

## Required diagnostic improvements (PROPOSAL ONLY)

### D1: overflow:visible spillage detection

Root cause: RC1.
Change: compute SVG img bbox vs region boundary. Flag HARD_FAIL if img exceeds region in any direction regardless of CSS overflow value.
Location: checkArtworkIntegrity precheck.mjs ~line 529. Or modify checkClippedArtwork (66-119) to use el.closest('.region') instead of locator('..').locator('..').
Phase: Phase 1 (additive new path, doesn't remove existing sub-check e).
Effort: small. 3 DOM API calls + 4 arithmetic comparisons.
Risk: low. Popup_layer exclusion needed (existing pattern in checkRegionOverflow).
A-audit impact: catches ~10-14 overflow:visible cases.

### D2: PLACEHOLDER class detection

Root cause: RC2.
Change: before sub-checks a/e/f, check if img naturalWidth === 0 AND naturalHeight === 0, or if src empty/absent, or class indicating placeholder. Insert HARD_FAIL branch.
Location: checkArtworkIntegrity ~lines 344-360 (where naturalDims read). Insert HARD_FAIL before existing skip.
Phase: Phase 1 (additive branch).
Effort: small. One conditional on naturalWidth/Height.
Risk: near zero. naturalWidth === 0 indicates broken image load in all browsers. No legitimate scenario.
A-audit impact: catches ~20-24 PLACEHOLDER failures. HIGHEST single improvement.

### D3: real SVG viewBox dimensions in sizing manifest

Root cause: RC3.
Change: at sizing_manifest build time, read viewBox attribute from assets/equipment/\*.svg, use viewBox W/H as natural dimensions, replacing 150x150 placeholder.
Location: generateSizingManifest precheck.mjs lines 1318-1365. Add viewBox parser (fs.readFileSync + regex).
Phase: Phase 2 (semantic change; user-gated). Changes what precheck measures; existing passing scenes may newly fail.
Effort: medium. SVG viewBox extractor + manifest build integration + corpus re-run.
Risk: unknown without re-run. Performance: one-time manifest cost.
A-audit impact: sub-check f fires at correct distortion percentages for all assets. ~15-20 already-partial catches gain accuracy.

### D4: remove template-mode exception for primary-object ratio check

Root cause: RC4.
Change: remove early-return at precheck.mjs lines 837-849. Add primary_object.flag === true to hardFails array at lines 1090-1097.
Location: precheck.mjs lines 837-849 + 1090-1097. Two distinct changes.
Phase: Phase 2 (semantic change; user-gated; removes exception, escalates WARN to HARD_FAIL).
Effort: small code change; medium validation.
Risk: template scenes may be intentionally sparse during development. Exception presumably added for reason.
A-audit impact: catches 4 of 52 rows (2 objects, 2 sources each). High severity (primary object absent).

### D5: minimum rendered area check per object kind

Root cause: RC5.
Change: define minimum rendered area fractions by kind (instrument: >= 8%; pipette: >= 1%; plate: >= 5%). Flag objects below kind-specific floor as HARD_FAIL.
Location: checkArtworkIntegrity precheck.mjs ~362-415. Add sub-check g after f. Or enhance checkPrimaryObjectRatio with kind-specific thresholds.
Phase: Phase 3 (new check, new kind-classification, new thresholds; user-gated).
Effort: large. Per-kind table + kind classification logic + corpus re-run + threshold calibration.
Risk: high without calibration. Floors too high will flag intentionally compact objects.
A-audit impact: ~6-8 footprint-too-small cases currently invisible to all checks.

## Recommendation order

### Phase 1 candidates (additive, low risk, no user gate)

| Rank | Proposal                      | A-audit catch gain | Type                | Risk                              |
| ---- | ----------------------------- | ------------------ | ------------------- | --------------------------------- |
| 1    | D2: PLACEHOLDER detection     | +20 to +24 of 52   | Additive new branch | Near zero false positives         |
| 2    | D1: overflow:visible spillage | +10 to +14 of 52   | Additive new path   | Low; popup_layer exclusion needed |

D2 first: largest miss category (40-46% of all 52), lowest implementation risk.
D1 second: second largest category, additive fix.

### Phase 2 candidates (semantic change, user-gated)

| Rank | Proposal                           | A-audit catch gain                  | Type                               | Risk                               |
| ---- | ---------------------------------- | ----------------------------------- | ---------------------------------- | ---------------------------------- |
| 3    | D3: real SVG viewBox               | accuracy for ~15-20 already-partial | Semantic change to manifest build  | Medium; corpus re-run              |
| 4    | D4: remove template-mode exception | +4 of 52 (low count, high severity) | Semantic change; removes exception | Medium; template-scene regressions |

### Phase 3 candidate (new spec data, user-gated)

| Rank | Proposal                           | A-audit catch gain | Type                      | Risk                     |
| ---- | ---------------------------------- | ------------------ | ------------------------- | ------------------------ |
| 5    | D5: minimum rendered area per kind | +6 to +8 of 52     | New check, new thresholds | High without calibration |

D5 last: requires new spec data not in existing docs. User-approved thresholds needed.

## Projected catch rate after all five proposals

| Phase           | Proposals       | Additional catches              | Running total   |
| --------------- | --------------- | ------------------------------- | --------------- |
| Current (AFTER) | sub-check e + f | ~20 / 52                        | ~20 / 52        |
| Phase 1         | D1 + D2         | +24 to +38                      | ~44 to ~50 / 52 |
| Phase 2         | D3 + D4         | +4 to +6 (accuracy + template)  | ~48 to ~52 / 52 |
| Phase 3         | D5              | +2 to +4 (some overlap with D1) | ~50 to ~52 / 52 |

Remaining 2-4 issues: cut-side failures (graduated_cylinder half-visible, glass_slide left-edge only) require container-width diagnostics not covered by any of D1-D5. Sixth category not addressed.

## Cross-references

- docs/active_plans/no_cropped_svg_screenshot_audit.md (Workstream A, 52 flagged objects)
- docs/active_plans/no_cropped_svg_asset_sizing_table.md (Workstream E, real viewBox dimensions)
- docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md (Batch 5 Workstream C, scorecard hardFailCount gap)

## Handoff

Status: DONE_WITH_CONCERNS

A-issue catch rate:

- BEFORE (current): 0 / 52
- AFTER (sub-check e + f): ~20 / 52 (~38%)
- After Phase 1 proposals (D1 + D2): ~44 to ~50 / 52 (~85-96%)

Top 3 missed root causes:

1. RC2 (svg-grow-needed / PLACEHOLDER): ~40-46% of 52; highest impact; addressed by D2
2. RC1 (overflow:visible / parent-overflow): ~19-27% of 52; addressed by D1
3. RC4 + RC5 (template-mode skip + footprint-too-small): ~15-19% combined; addressed by D4 and D5

D1-D5 proposals: 5 total
Phase 1 candidates: 2 (D1, D2) - additive, low risk, no user gate
Phase 2 candidates: 2 (D3, D4) - semantic change, user-gated
Phase 3 candidates: 1 (D5) - new spec data required, user-gated

Blocker for escalation: D3, D4, D5 require user approval. D3 changes what manifest measures. D4 removes existing exception. D5 requires new threshold specs.

Unresolved gap NOT covered by D1-D5: cut-side failures (graduated_cylinder, glass_slide) where object visible but only partially, clipped by container width constraint rather than region overflow or placement card overflow. Sixth root cause category requiring separate container-width diagnostic proposal.
