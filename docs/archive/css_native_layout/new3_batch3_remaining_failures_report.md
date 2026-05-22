# NEW3 Batch 3 Remaining Failures Report

Date: 2026-05-21
Status: Batch 3 closed with mixed verdict. Major findings include scorecard methodology gap (hardFailCount missing clipped_by_parent), stress templates being static-HTML not YAML-driven, and B-verify revealing different scene set numerics that need contextualization.
Use "workstream" not "lane".

## Batch 2 accepted baseline

- Precheck artwork-integrity hard_fails: 1203 -> 2 on 110-scene batch2_n_canonical (-99.8%)
- Visual gallery (Workstream-D, Batch 2): 20 PNG pairs verified REAL_FIX
- Hard rule compliance: artwork-integrity level achieved on stress corpus
- 7 of 9 Batch 1 failure clusters collapsed
- Runtime stable: 6/6 interaction stress paths PASS, no DOM growth, no heap leak

## Batch 3 workstream outcomes

| Workstream    | Status             | Headline                                                                                                                                                                                                                                          | Artifact                                                                         |
| ------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A             | DONE_WITH_CONCERNS | 2 r_ovf root cause: generator overstuffing + footprint miscategorization (bottles render as container, not handheld)                                                                                                                              | batch3_a_remaining_hard_fails.md                                                 |
| B (generator) | DONE               | Placement cap added; 100 scenes regenerated (75 realistic + 25 adversarial); enforce_placement_caps still passes over-cap through                                                                                                                 | batch3_b_generator_cap_results.md                                                |
| B-verify      | DONE_WITH_CONCERNS | Realistic 75: 624 hard_fails (target 0). Different scene set than batch2_n; numerics not directly comparable                                                                                                                                      | batch3_b_verify_summary.md                                                       |
| C             | DONE               | 4 YAML reclassifications kept (cell_counter, well_plate_96, tube_rack_24, tube_rack_15ml). Trials 5-6 deferred (need new CSS classes, user-gated). Stress templates are static HTML; YAML edits semantically correct but no visible stress effect | batch3_c_reclassification_trials.md                                              |
| D             | DONE               | dense_clutter_014 -19pt verdict: KEEP. Pre-fix score 49 was false-high (10 unscored clipped_by_parent HARD_FAILs invisible to scorecard formula). Honest post-fix score 30                                                                        | batch3_d_dense_clutter_014_analysis.md                                           |
| E             | DONE               | Canonical scorecard rule + hygiene test PASSING. /tmp helper anti-pattern banned                                                                                                                                                                  | new3_batch3_canonical_scorecard_rule.md + tests/test_canonical_scorecard_rule.py |
| F             | DONE               | 6 contact sheets + INDEX, 52 scenes, 130 PNG refs. Verdict BATCH3_VISUAL_OK                                                                                                                                                                       | batch3_f_gallery/INDEX.html                                                      |
| G             | this report        | synthesis                                                                                                                                                                                                                                         | docs/active_plans/new3_batch3_remaining_failures_report.md                       |
| H             | DONE               | NEW2 showcase addendum recording cumulative Batch 2+3 outcomes                                                                                                                                                                                    | new2_showcase_batch2_addendum.md                                                 |

## Remaining 2 hard failures (post-Batch-2)

Both on stress_many_bottles_scene_001 and \_002. r_ovf only. Both `intended_difficulty: adversarial`. Workstream-A verdict: ADVERSARIAL (synthetic stress, not curriculum content).

Cause hierarchy:

1. Generator over-stuffs rear_shelf with 16-17 bottles (rng.randint(15, 20))
2. enforce_placement_caps has comment "Over-cap; mark as adversarial and still add (for now)" -- does NOT truncate
3. Bottles render as footprint--container (220x240 minimum) despite bench.yaml saying bottle: handheld (90x110)
4. rear_shelf CSS grid row is 100px fixed; 2-3 rows of container cards overflow 100px by 202-417px

Fix A (recommended): change build_many_bottles count to randint(8, 12) OR make enforce_placement_caps truncate.
Status: Workstream-B added cap infrastructure but did not enforce truncation. B-verify shows scenes still hit r_ovf.

## Generator cap result

B generator change: REGION_PLACEMENT_CAPS dict + enforce_placement_caps function + emit_scene_yaml realistic flag.
Caps set: rear_shelf 12, work_surface 6, front_tools 12, instrument_station 5, popup_layer 1.

Status: code added, scenes regenerated. enforce_placement_caps does NOT actually reject over-cap placements -- it marks scenes as adversarial and adds them anyway. This is a soft cap, not a hard cap.

B-verify result on regenerated 100 scenes:

- Realistic 75: 624 hard_fails (8.3 per scene)
- Adversarial 25: 436 hard_fails (17.4 per scene)
- Realistic median 32, mean 34.7 (batch2_n median was 41)

Why realistic subset still has hard_fails:

- Generator cap addresses r_ovf (region overflow) only
- CBP and AD_HF come from CSS footprint sizing, NOT generator placement count
- Per Workstream-C, stress templates have hardcoded footprint classes; YAML kind_to_footprint changes do not change static template rendering
- Regenerated 100 scenes are a different mix than batch2_n's 110 scenes; new objects hit corners not previously sampled
- N's CSS fix (handheld/small-tool max-height raise) still applies, but new scenes use different object distributions

Recommendation: rerun B-verify against a scene set comparable to batch2_n (same 110 scenes regenerated with cap), or accept that 100-scene batch3_b is a new baseline. Do not auto-revert B.

## Footprint reclassification trials

Trial 1 (cell_counter equipment_small -> equipment_large): KEPT
Trial 2 (well_plate_96 out of equipment_large): KEPT
Trial 3 (tube_rack_24 out of equipment_large): KEPT
Trial 4 (tube_rack_15ml out of equipment_large): KEPT
Trial 5 (t75_flask landscape): EVIDENCE_ONLY (deferred; new CSS class user-gated)
Trial 6 (drug_vial_rack landscape): EVIDENCE_ONLY (deferred; new CSS class user-gated)

Files changed: regions/bench.yaml, hood.yaml, instrument.yaml. Closed vocabulary preserved.

Stress-scene precheck impact: zero (templates static-HTML, ignore YAML). Production-runtime impact: positive for cell_counter (renders at large-equipment instead of cramped 280px), well_plate_96 (now container instead of large-equipment), tube_rack_24/15ml (now rack).

## dense_clutter_014 analysis

Verdict: KEEP. Recommendation: no revert.

Pre-fix score 49 was a measurement artifact. Pre-fix scene had 10 unscored clipped_by_parent HARD_FAILs:

- ethanol_bottle 107px cropped
- dmso_bottle x2 107px cropped each
- dilution_rack 116px cropped
- tube_rack_15ml 116px cropped
- microtube 38px cropped
- waste_container top 56 + bottom 177px clipped
- tip_box_10 27px cropped
- Aspect distortions 8-170%

Scorecard hardFailCount counts only clipped_artwork, off_page, svg_svg_overlap, region_overflow. clipped_by_parent NOT counted. Correct count would be >=10, zeroing total_layout_score by formula (if hardFailCount>0: totalScore=0). Pre-fix 49 was false-high.

Post-fix 30 is honest reading. -19 delta entirely explained by label_overlap (1 pair -> 3 pairs, -60 raw at 30% weight = -18pt). N-patch raised handheld/small-tool min-heights; work_surface column (5 objects) crushed because grid row 1fr ~150-200px can't hold 5 x 200px cards.

Optional mitigation: data-scene-density="crowded" YAML field. Reduces card heights to crowded-modifier values. Risk: rear_shelf containers may re-enter crop territory. Deferred.

## Canonical scorecard enforcement

Workstream-E delivered:

- docs/active_plans/new3_batch3_canonical_scorecard_rule.md (137 lines)
- tests/test_canonical_scorecard_rule.py (67 lines, PASSING)
- experiments/css_native_layout/PRECHECK_USAGE.md (Scorecard generation section added)

Rule statement: scorecard claims must come from canonical score_layout.mjs. Helpers may prepare INPUT but cannot reimplement scoring logic. Reports must name exact bash command.

Banned patterns: hardcoded metric values, Python reimplementations of score_layout.mjs, stale visual_audit.json input.

Case study: /tmp/\_generate_scorecard_batch2_n.py that produced false "5 regressions" in Batch 2. Workstream O caught it; E codified the prevention rule.

Hygiene test scans experiments/css_native_layout/ for forbidden helper patterns. Currently PASSING.

## Major methodology findings

### 1. Scorecard hardFailCount gap

Discovered via Workstream D. score_layout.mjs hardFailCount counts only:

- clipped_artwork
- off_page
- svg_svg_overlap
- region_overflow

It does NOT count:

- clipped_by_parent (the actual no-crop hard rule violation)
- aspect_distorted_HF

Effect: any scene with clipped_by_parent HARD_FAILs but no other hard-fail class scores >0 incorrectly. Pre-fix scores were systematically inflated. Post-fix scores can appear worse than pre-fix even when visual quality improves (the case for dense_clutter_014).

Recommendation: extend hardFailCount to include clipped_by_parent and aspect_distorted_HF. This is a diagnostic semantic change -- requires user approval per boundaries.

### 2. Stress templates are static HTML, not YAML-driven

Discovered via Workstream C. stress*scenes/rendered/*.html have hardcoded footprint classes from the render*stress_to_html.py generator. YAML kind_to_footprint edits in regions/*.yaml do not change static template rendering.

This explains:

- Workstream K source audit found no footprint assignment in css_native_adapter.ts or layout_engine.ts (correct -- they don't, for production)
- Workstream A HTML inspection found footprint--container on bottles (correct -- static template uses hardcoded class)
- Both audits true; just measuring different layers

Production runtime is dynamic (consults YAML). Stress harness is static (frozen HTML).

Implication: experiment-scope CSS changes affect both stress and production. YAML changes affect only production.

### 3. enforce_placement_caps is soft cap not hard cap

Discovered via Workstream A and B-verify. Generator function adds over-cap placements anyway, just marks scene as adversarial. Cap of 12 on rear_shelf does NOT prevent stress_many_bottles scenes from emitting 16-17 bottles.

Recommendation: change enforce_placement_caps to truncate. OR change build_many_bottles count from randint(15, 20) to randint(8, 12). Bounded generator fix.

## Recommendation: can NEW3 move from stress fixing to visual polish?

YES, with caveats.

Pro:

- Hard rule compliance (no crop) achieved at artwork-integrity level for the original 110-scene batch2_n_canonical corpus
- 7 of 9 Batch 1 failure clusters collapsed
- Visual gallery confirms real fix
- Runtime stable
- Diagnostic methodology gaps identified and either fixed (canonical rule) or documented (hardFailCount gap)

Caveats:

- 2 adversarial scenes still hard-fail (acceptable, marked adversarial)
- enforce_placement_caps soft-cap should be hardened (small fix)
- Scorecard hardFailCount gap should be addressed (diagnostic semantic change; user approval needed)
- B-verify on regenerated 100-scene set shows higher hard_fails than batch2_n's 110-scene set; investigate before claiming new set is canonical

User-gated decisions still queued:

- New CSS classes for landscape containers/racks (trials 5-6 from Workstream-C)
- Diagnostic semantic change: extend hardFailCount to include clipped_by_parent + aspect_distorted_HF
- Game viewport contract (4:3, deferred from Batch 1)
- Per-scene-class threshold matrix design (C5 cluster, scoring calibration)

## Suggested Batch 4 candidates (if pursued)

| Candidate                                                 | Type                     | Estimated impact                                                                            | User approval needed      |
| --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------- |
| Harden enforce_placement_caps (truncate not soft-mark)    | Generator                | Clears 2 remaining adversarial r_ovf if cap respected                                       | No                        |
| Extend hardFailCount in score_layout.mjs                  | Diagnostic semantic      | Honest score baselines; reveals pre-fix scenes were broken                                  | YES (diagnostic semantic) |
| Investigate render_stress_to_html.py footprint hardcoding | Render pipeline audit    | Document why static templates assign footprint--container to bottles; align with bench.yaml | Bounded read-only         |
| Landscape footprint classes (Trials 5-6 from C)           | New CSS classes          | Resolves t75_flask + drug_vial_rack latent issues                                           | YES (new vocabulary)      |
| Visual polish pass on gold scenes                         | Curriculum-content focus | Move from stress to pedagogy quality                                                        | No                        |

## Boundaries preserved

- docs/PRIMARY_CONTRACT.md untouched
- Legacy layout engine intact
- precheck.mjs, score_layout.mjs, render_and_dump.mjs semantics unchanged (Workstream E added test, not semantic change)
- src/style.css untouched
- Bridge placement-count guardrail active
- Closed footprint vocabulary preserved
- Canonical scorecard rule now enforced via hygiene test

## Batch 3 status: CLOSED

Evidence on disk. Workstreams A-H complete. Major findings documented. User-gated decisions queued. No boundaries violated.
