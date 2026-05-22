# NEW3 Batch 4 Test System Hardening Report

Date: 2026-05-21
Status: Batch 4 CLOSED. Test harness hardened, scorecard alignment proposal queued for user approval, gold polish opportunities catalogued, frozen corpus declared.
Use "workstream" not "lane".

## Letter remap

User-A = my AA (harden cap)
User-E = my AB (static-HTML pipeline audit)
User-F = my AC (gold polish opportunities)
User-B, C, D, G, H = same letter throughout.

## Workstream outcomes

| Workstream                     | User letter | Status             | Headline                                                                                                                                                                                                     | Artifact                                                                       |
| ------------------------------ | ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| AA (cap truncate)              | A           | DONE               | Realistic 74 scenes: 0 r_ovf. Adversarial 26 scenes: 2 r_ovf (intentional). Hard-cap enforced.                                                                                                               | batch4_aa_hardened_cap_results.md                                              |
| AB (static pipeline audit)     | E           | DONE_WITH_CONCERNS | render_stress_to_html.py line 37 hardcodes 'bottle' in container tuple. Ignores YAML. Pipette also diverges. ACCIDENTAL. NEEDS_USER_DECISION align vs document.                                              | batch4_ab_static_template_footprint_audit.md                                   |
| AC (gold polish)               | F           | DONE               | 10 gold scenes audited. 7 bounded fixes (5 YAML + 2 generator), 7 user-gated, 3 accept-as-is. Top ROI: zoom_detail mode activation (+30-40pt).                                                               | batch4_ac_gold_polish_opportunities.md                                         |
| B (corpus manifest)            | B           | DONE               | Corpus v1 frozen: seed=42, 100 scenes, SHA256 hashed. Generator extended with --seed CLI.                                                                                                                    | batch4_corpus_manifest.md                                                      |
| C (no-crop alignment proposal) | C           | DONE               | Proposal: extend hardFailCount to include clipped_by_parent + aspect_distorted_HF. 3-phase rollout. Reframes Workstream-N as much bigger win (108 scenes lifted from would-be zero). User approval required. | new3_scorecard_no_crop_alignment_proposal.md                                   |
| D (guardrail extension)        | D           | DONE_WITH_CONCERNS | New test_scorecard_claims_require_canonical_command test added. FAILS by design: 2 non-compliant scorecard files identified. Per boundaries, NOT auto-edited.                                                | new3_canonical_scorecard_guardrail.md + tests/test_canonical_scorecard_rule.py |
| G (gallery)                    | G           | DONE               | BATCH4_VISUAL_OK. 4 contact sheets + INDEX, 43 scenes. Zero clipped_artwork in audit.                                                                                                                        | batch4_gallery/INDEX.html                                                      |
| H (this report)                | H           | synthesis          | -                                                                                                                                                                                                            | docs/active_plans/new3_batch4_test_system_hardening_report.md                  |

## Major findings

### 1. Static stress harness diverges from production runtime

Workstream-AB (user-E) traced: render_stress_to_html.py line 37 has 'bottle' hardcoded in container tuple of FOOTPRINT_KEYWORDS. Does NOT read regions/\*.yaml.

Production runtime (css_native_adapter.ts) is dynamic and consults YAML. Stress harness is static and uses parallel hardcoded list. Both audits (K + A) were correct; they measured different layers.

Secondary divergence: pipette (YAML small-tool, harness handheld).

User decision needed: ALIGN harness with YAML (loses some stress amplification) vs DOCUMENT_DIVERGENCE (silent split persists).

### 2. Scorecard hardFailCount missing clipped_by_parent + aspect_distorted_HF

Workstream-C (user-C) found: score_layout.mjs lines 332-339 hardFailCount counts only clipped_artwork, off_page, svg_svg_overlap, region_overflow. precheck.mjs lines 1083-1099 includes clipped_by_parent + aspect_distorted_HF in its hasHardFail. Scorecard never updated when those checks were added.

Consequence: scenes with crop violations scored >0 incorrectly. Batch 1 median 41 included 110 scenes that should have been zeroed.

Reframe of Workstream-N: under aligned scoring, N moved 108 scenes from "would-be zero" to measured composition scores (mean uplift ~37-40pt). Much bigger win than legacy scorecard suggested.

3-phase rollout proposal. Phase 1 (additive fields, low risk) requires user approval. Phase 2 (zeroing switch, medium risk) requires user approval after Phase 1 evidence reviewed.

### 3. Generator cap was soft; now hard for realistic scenes

Workstream-AA (user-A) hardened enforce_placement_caps. Realistic scenes truncate at cap. Adversarial scenes retain over-cap (intentional stress).

Result: 74 realistic scenes 0 r_ovf, 26 adversarial scenes 2 r_ovf preserved.

### 4. Frozen Corpus v1

Workstream-B declared Corpus v1: seed=42, 100 scenes, SHA256 manifest. Future batches compare against same corpus unless explicit v2 declared.

Regeneration command: python3 experiments/css_native_layout/stress_generators/generate_stress_scenes.py --seed 42

### 5. Canonical scorecard rule extended

Workstream-D (user-D) added test_scorecard_claims_require_canonical_command. Test FAILS by design on 2 non-compliant files (scorecard_batch3_b.md, scorecard_batch2_alt2/scorecard.md). Annotation deferred to user; not auto-edited.

### 6. Gold scene polish catalogue ready

Workstream-AC (user-F) catalogued 10 gold scenes. Top 3 bounded fixes:

1. Activate zoom_detail mode in generator (+30-40pt for gold_well_plate_96_zoom_with_state)
2. Reclassify cell_counter + microscope_new -> footprint--large-equipment (+5-10pt per scene)
3. Reclassify aspirating_pipette -> footprint--small-tool (resolves 697% aspect distortion)

5 bounded YAML tweaks + 2 bounded generator tweaks + 7 user-gated items + 3 accept-as-is.

Cross-scene systemic findings:

- primary_area_ratio=0 on ALL 10 (underclassification + canvas utilization)
- label_readability=0 on 9/10 (bench.css max-width 100px too short for lab equipment names)
- scene_occupied <13% on all 10 (objects at footprint minimums)
- aspect_ratio_fidelity=0 on 6/10 (bottle, bme_bottle, aspirating_pipette mismatches)

## Boundaries preserved

- docs/PRIMARY_CONTRACT.md untouched
- Legacy layout engine intact
- precheck.mjs, score_layout.mjs, render_and_dump.mjs semantics unchanged
- src/style.css untouched
- regions/\*.yaml unchanged in Batch 4 (changes were in Batch 3 Workstream C)
- Closed footprint vocabulary preserved
- Bridge placement-count guardrail active
- Canonical scorecard rule enforced via hygiene tests

## User-gated decisions queued

| Decision                                                                            | Workstream evidence             | Risk   | Reason gated                                                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Approve Phase 1 of hardFailCount extension                                          | C                               | low    | additive fields, no score change                                                             |
| Approve Phase 2 of hardFailCount extension (zeroing switch)                         | C                               | medium | Batch 1 median drops 41 -> 0; requires explicit acknowledgment of prior measurement artifact |
| Align render_stress_to_html.py with YAML (move 'bottle' from container to handheld) | AB/E                            | medium | reduces stress signal but eliminates silent divergence                                       |
| Document render_stress_to_html.py divergence                                        | AB/E                            | low    | annotate FOOTPRINT_KEYWORDS line 37 + add cross-ref to bench.yaml                            |
| Add landscape footprint classes (t75_flask, drug_vial_rack)                         | Batch 3 Workstream C trials 5-6 | medium | new CSS vocabulary; user-gated per closed-vocab rule                                         |
| Annotate 2 non-compliant scorecard files (test fix)                                 | D                               | low    | scorecard_batch3_b.md, scorecard_batch2_alt2/scorecard.md need canonical citation header     |
| Game viewport contract (4:3)                                                        | Batch 1 carryover               | medium | aspect ratio decision for production                                                         |
| Per-scene-class threshold matrix design                                             | Batch 1 C5                      | medium | scorecard calibration for zoom_detail, dense_clutter                                         |

## Batch 5 candidates

| Candidate                                                          | Type                        | Estimated impact                                                                            | Approval needed         |
| ------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| Apply 5 bounded YAML tweaks from AC                                | YAML                        | +25-50pt across affected gold scenes                                                        | No                      |
| Apply 2 bounded generator tweaks from AC                           | Generator                   | +30-40pt on gold_well_plate_96_zoom; +0-15pt on dense_clutter scenes via data-scene-density | No                      |
| Phase 1 hardFailCount extension implementation                     | score_layout.mjs (additive) | reveals 108-scene reframe of N-win                                                          | YES (Phase 1 approval)  |
| Annotate 2 non-compliant scorecard files                           | Documentation               | hygiene test passes                                                                         | No (bounded annotation) |
| Render Corpus v1 with current N+AC fixes, full canonical scorecard | Measurement                 | establishes Batch 5 baseline                                                                | No                      |
| Investigate pipette YAML/harness divergence (secondary AB finding) | Read-only audit             | aligns stress with production for pipette                                                   | No                      |
| Visual polish trials (small CSS-only) on top 5 gold scenes         | Bounded CSS                 | pedagogical quality uplift                                                                  | No                      |

## Recommendation: can NEW3 close Batch 4 and move to Batch 5 visual polish?

YES. Test harness now trustworthy enough to guide polish.

- Hard rule compliance verified at artwork-integrity level (Batch 2 + Batch 3 N-fix).
- Test corpus frozen (Corpus v1).
- Scorecard methodology gap identified with bounded-risk rollout proposal.
- Canonical scoring enforced via hygiene tests.
- Gold polish opportunities catalogued and ranked by ROI.
- Runtime layer remains stable.
- Generator cap hardened for realistic scenes.

Open items are non-blocking. User-gated decisions queue for sequential approval. Bounded fixes from AC can dispatch as Batch 5 Workstream A.

## Batch 5 first workstream queued

Workstream Batch5-A: apply 5 bounded YAML tweaks from AC (cell_counter, microscope_new, aspirating_pipette, rocking_shaker, staining_tray) + 2 bounded generator tweaks (zoom_detail mode mapping, dense_clutter density mapping). Re-render Corpus v1, full canonical precheck + scorecard. Measure ROI per AC priority order. Artifact: experiments/css_native_layout/stress_results/batch5_a_polish_apply.md.

## Batch 4 status: CLOSED

Evidence on disk. All 8 workstreams complete. Major findings documented. User-gated decisions queued. No boundaries violated.
