# NEW3 Batch 5 Workstream D - Stress Pipeline Alignment Options

Date: 2026-05-21
Status: DONE_WITH_CONCERNS
Use "workstream" not "lane".

## Source evidence verified

| Source | File | Lines | Key fact |
| --- | --- | --- | --- |
| Batch 4 Workstream AB audit | experiments/css_native_layout/stress_results/batch4_ab_static_template_footprint_audit.md | 34-41, 110-114 | bottle -> container (accidental); pipette -> handheld (diverges from YAML small-tool) |
| Renderer hardcoded map | experiments/css_native_layout/stress_generators/render_stress_to_html.py | 27-44 | FOOTPRINT_KEYWORDS; bottle in container tuple at line 37; pipette in handheld tuple at line 43 |
| YAML canonical mapping | experiments/css_native_layout/regions/bench.yaml | 64-77 | bottle: handheld (line 70); pipette: small-tool (line 66) |
| YAML canonical mapping | experiments/css_native_layout/regions/hood.yaml | 64-77 | bottle: handheld (line 70); pipette: small-tool (line 66) |
| YAML canonical mapping | experiments/css_native_layout/regions/instrument.yaml | 61-74 | bottle: handheld (line 67); pipette: small-tool (line 63) |
| CSS footprint dimensions | experiments/css_native_layout/styles/bench.css | 184-241 | small-tool: 50-80px; handheld: 90-130px; container: 220-320px |

All three region YAMLs agree on both divergences. Renderer disagrees on both.

## Footprint dimension reference (bench.css lines 184-241)

| CSS class | min-width | max-width | min-height | max-height |
| --- | --- | --- | --- | --- |
| footprint--small-tool | 50px | 80px | 60px | 200px |
| footprint--handheld | 90px | 130px | 110px | 260px |
| footprint--container | 220px | 320px | 240px | 360px |
| footprint--rack | 140px | 190px | 160px | 220px |
| footprint--instrument | 220px | 280px | 200px | 260px |
| footprint--large-equipment | 360px | 480px | 280px | 380px |

Crowded-density modifier scales these 0.60-0.70x without changing class membership.

## Divergence summary

render_stress_to_html.py FOOTPRINT_KEYWORDS vs all three regions/*.yaml:

| Object kind | YAML (canonical) | Harness (render_stress_to_html.py) | Diverges? |
| --- | --- | --- | --- |
| bottle | handheld | container | YES - primary |
| pipette | small-tool | handheld | YES - secondary |
| flask | container | container | no |
| rack | rack | rack | no |

Both divergences accidental. Evidence: no comment in render_stress_to_html.py declares them intentional; generate_stress_scenes.py lines 41-43 label BOTTLES pool with "# Handheld" - generator author treats bottles as handheld.

## Option 1: ALIGN render_stress_to_html.py with YAML

Approach: replace static FOOTPRINT_KEYWORDS (lines 27-44) with loader reading kind_to_footprint from regions/*.yaml at render time. Two sub-approaches: 1A - load bench.yaml only (safe default); 1B - load region YAML matching each scene class (future-proof).

### Specific changes per divergence:

Bottle:
- Before: sodium_hydroxide_bottle -> keyword bottle in container tuple (line 37) -> footprint--container (220x240 min)
- After: bottle kind -> YAML handheld -> footprint--handheld (90x110 min)
- Delta: minimum footprint area drops from 52,800 sq-px to 9,900 sq-px (~81% reduction per bottle)

Pipette:
- Before: pipette in handheld tuple (line 43) -> footprint--handheld (90x110 min)
- After: pipette kind -> YAML small-tool -> footprint--small-tool (50x60 min)
- Delta: minimum footprint area drops from 9,900 sq-px to 3,000 sq-px (~70% reduction per pipette)

### Expected effect on stress scores
Many_bottles scenes pack rear_shelf with 16+ bottles. At footprint--container, 16 x 220px = 3,520px minimum, exceeds rear_shelf width and triggers r_ovf. At footprint--handheld, 16 x 90px = 1,440px, fits in most tested viewports. r_ovf scores for bottle-heavy scenes drop substantially or approach zero. Corpus v1 Batch 1-4 hard_fail counts for bottle-heavy scenes not directly comparable to post-ALIGN.

### Effect on reproducibility
Corpus v1 manifest currently records only stress_scenes/generated/*.yaml hashes. After ALIGN, rendered output also depends on region YAML content. Manifest needs to record region YAML file hashes at render time. One-line addition.

### Effect on production relevance
High. Stress harness uses same footprint logic as production CSS native adapter (css_native_adapter.ts reads kind_to_footprint).

### Files touched
- experiments/css_native_layout/stress_generators/render_stress_to_html.py (logic change)
- Corpus manifest generator (hash tracking extension, optional)

### Estimated effort
1-2 hours code + regenerate Corpus v1 HTML + rerun scorecard for new baseline. Batch 1-4 score series superseded but not deleted.

## Option 2: DOCUMENT_DIVERGENCE

Approach: comment block above render_stress_to_html.py line 37 (container tuple):

```
# Static harness intentional divergence from regions/*.yaml:
# - 'bottle' placed in container here (min-width 220px) but
#   regions/bench.yaml line 70 maps bottle: handheld (min-width 90px).
# - 'pipette' placed in handheld (see line 43) but
#   regions/bench.yaml line 66 maps pipette: small-tool (min-width 50px).
# These divergences amplify packing stress vs production. Accepted by design.
# Do not sync to YAML without a Batch score comparison.
# When harness transitions to production-fidelity testing, ALIGN is the correct
# next step. See docs/active_plans/new3_batch5_stress_pipeline_alignment_options.md
# and experiments/css_native_layout/stress_results/batch4_ab_static_template_footprint_audit.md
```

### Specific changes per divergence
None. footprint--container retained for bottles; footprint--handheld retained for pipettes.

### Expected effect on stress scores
None. Scores identical to Corpus v1 baseline. Batch 1-4 comparisons remain valid.

### Effect on reproducibility
None. Renderer inputs unchanged. Manifest requires no update.

### Effect on production relevance
Low. Stress scores remain separate from production. Reader missing the comment will misinterpret bottle scores as production-representative. Comment mitigates but does not eliminate.

### Files touched
- experiments/css_native_layout/stress_generators/render_stress_to_html.py (comment block only)

### Estimated effort
10 minutes. No regeneration.

## Side-by-side comparison

| Dimension | Option 1: ALIGN | Option 2: DOCUMENT_DIVERGENCE |
| --- | --- | --- |
| Bottle footprint (current) | container | container (unchanged) |
| Bottle footprint (post) | handheld | container (unchanged) |
| Bottle min-width (current) | 220px | 220px |
| Bottle min-width (post) | 90px | 220px |
| Pipette footprint (current) | handheld | handheld (unchanged) |
| Pipette footprint (post) | small-tool | handheld (unchanged) |
| Pipette min-width (current) | 90px | 90px |
| Pipette min-width (post) | 50px | 90px |
| Expected change to Corpus v1 hard_fails | bottle-heavy: drop in r_ovf | None |
| Corpus v1 hard_fails comparable after? | No (bottle baseline shifts) | Yes |
| Corpus v1 manifest needs update? | Yes | No |
| Production layout fidelity | High | Low |
| Batch 1-4 score series valid? | No | Yes |
| Stress amplification retained? | No | Yes |
| Future audit rediscovers divergence? | No | Possible if comment missed |
| Effort | 1-2 hours + regenerate | 10 minutes |

## Recommendation: DOCUMENT_DIVERGENCE (with ALIGN deferred, not cancelled)

Stress harness under experiments/, not production. Primary purpose in Batches 1-4: diagnostic robustness - amplifying packing stress to expose CSS-level failures. footprint--container on bottles (220px min vs production handheld 90px) is what makes many_bottles scenes hard - 16 bottles at container scale = 3,520px minimum width, well past rear_shelf capacity. Overflow IS the stress signal, not measurement error.

Aligning now invalidates Batch 1-4 score series and reduces diagnostic signal for bottle-heavy scenes while bottle overflow failures still under investigation. Right moment to ALIGN: when harness transitions from diagnostic-stress to production-fidelity testing, at which point full Corpus v1 regeneration expected anyway.

DOCUMENT_DIVERGENCE closes Batch 4 AB audit finding at minimal cost and preserves existing score series. Comment block flags ALIGN as correct next step so it is not re-proposed as new idea.

Single-sentence rationale: Stress harness is an amplifier, not a mirror; document divergence now and defer alignment to production-fidelity phase.

## Handoff

Status: DONE_WITH_CONCERNS
Recommendation: DOCUMENT_DIVERGENCE (ALIGN deferred to production-fidelity phase)
Rationale: stress harness under experiments/ is diagnostic amplifier; aligning now invalidates Batch 1-4 score series and reduces bottle stress signal before overflow investigation complete.

Files that would touch under each option:

Option 1 ALIGN:
- experiments/css_native_layout/stress_generators/render_stress_to_html.py (logic change to FOOTPRINT_KEYWORDS / classify_footprint, lines 27-66)
- Corpus manifest generator (hash tracking extension, one line, optional)

Option 2 DOCUMENT_DIVERGENCE:
- experiments/css_native_layout/stress_generators/render_stress_to_html.py (comment block above line 37, no logic change)

Blockers: None.
Escalate only if: user decides ALIGN requires new footprint class to distinguish bottle from other handheld kinds. Vocabulary change requiring PRIMARY_CONTRACT.md review; not part of either option as presented.
