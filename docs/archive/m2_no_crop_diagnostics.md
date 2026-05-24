# M2 no-crop diagnostics

Lane E1 tabular summary of per-scene diagnostic findings from D4 generalization render.

## Scope

Per-scene counts of critical acceptance violations extracted from D4's 11-assertion battery (assertions A through K). Lane E1 aggregates the D4 per-scene per-assertion results into a single cross-scene diagnostic matrix.

Six D2 generalization scenes:
- bench_basic
- bench_basic_row_slot
- sample_prep_bench
- staining_bench
- cell_counter_basic
- hood_basic

## Method

Read D4 render report (`m2_generalization_render.md`) per-assertion results. Map each assertion to diagnostic columns:

- **A (No clipping/cropping):** Direct match to "cropped/clipped" column
- **B (No placeholder SVG):** Direct match to "placeholder SVGs" column
- **C (Aspect ratio preserved >5%):** Direct match to "aspect distortion >5%" column
- **D (No item off-page):** Direct match to "off-page items" column
- **F (No item overlap):** Direct match to "item-item overlaps" column
- **G (No label outside scene):** Direct match to "labels outside scene" column
- **H (No label-own-SVG overlap):** Counted as part of label overlap category
- **I (No label-label overlap):** Direct match to "label-label overlaps" column
- **J (Label readability):** Subsumed in label-outside + label-overlap rows

All six D4 scenes rendered successfully; no scenes blocked. Extract pass/fail from assertion results.

## Diagnostic matrix

| Scene | Cropped/Clipped | Off-Page Items | Item-Item Overlaps | Aspect Distortion >5% | Placeholder SVGs | Labels Outside Scene | Label-Label Overlaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bench_basic_row_slot | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sample_prep_bench | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| staining_bench | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| cell_counter_basic | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| hood_basic | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Totals** | **0** | **0** | **0** | **0** | **0** | **0** | **1** |

## Summary

### Hard failures: 0

All 6 scenes pass the zero-tolerance criteria:
- No cropping or clipping (assertion A: all PASS)
- No off-page items (assertion D: all PASS)
- No item-item overlaps (assertion F: all PASS)
- No aspect-ratio distortion >5% (assertion C: all PASS)
- No placeholder SVGs (assertion B: all PASS)
- No labels outside scene (assertion G: all PASS)

### Warnings: 1

**staining_bench:** Assertion I (label-label overlap) FAIL. One pair of adjacent labels overlaps slightly at proximity. D4 classified this as a "minor formatting issue (proximity of adjacent labels), not a structural problem." Label placement is sub-optimal but does not block scene acceptance; M3 may reposition labels or adjust spacing.

### Pattern observations

1. **Bench and simple scenes (bench_basic, bench_basic_row_slot, cell_counter_basic):** Clean across all criteria. These minimal-placement scenes (2 objects each) show no overlap or spacing issues.

2. **Dense and multi-object scenes (sample_prep_bench, staining_bench):** Both render cleanly with one exception: staining_bench has label-label overlap. sample_prep_bench (5 placements, 5 labels) passes all criteria including label spacing. The layout engine's convergence-shrink loop and gap constraints prevent item overlap; label-label collision appears isolated to label-placement geometry (label offset vectors, not item bbox conflicts).

3. **Instrument and hood scenes (hood_basic):** All assertions pass. hood_basic (4 placements, 4 labels) shows no spatial issues despite the hood_surface being resized to default_width=6 in task #76. The reduction passes aspect-ratio checks and zone-containment checks; visual proportionality is a pedagogical concern flagged for M3 review (D4 notes the hood_surface appears as a thin orange rectangle, which is structurally correct but may not represent accurate hood scale).

4. **Aspect ratio and SVG integrity:** All 6 scenes preserve SVG aspect ratios within 5% and render real (non-placeholder) SVGs. The pipeline's constraint system and renderer's strict guards (pre-paint aspect check + post-paint bbox check) are effective.

5. **Label-label spacing as sole warning:** The single label-label overlap in staining_bench suggests label offset vectors are computed independently of label-label proximity constraints. Future label-placement improvements (M3 or beyond) could integrate label-label repulsion or nudge logic. Current rendering does not obscure science objects (labels do not overlap placement SVGs outside their own).

## Residual risks

1. **hood_basic hood_surface scale:** Structurally passes all 11 assertions. Visually scaled to default_width=6 (~80px at 1920px viewport). Visual review should confirm whether this represents accurate biosafety hood scale for pedagogical purposes. Technical structural integrity is high; semantic/pedagogical proportionality is unverified.

2. **staining_bench label-label overlap:** Low-severity warning. Two adjacent labels overlap slightly. This does not prevent scene acceptance (5/6 scenes clean, 1/6 has minor label-placement issue, threshold for M2c acceptance is 5 clean non-adversarial scenes). M3 may refine label layout or accept as acceptable proximity collision.

## Failures and next steps

**M2c acceptance achieved:** 6 / 6 D2 scenes render without hard failures. Label-label overlap on staining_bench is a formatting issue, not a structural integrity failure. All common-criteria invariants (no clipping, no overlaps, no off-page, no aspect distortion, no placeholders, no labels outside scene) are satisfied.

**Next steps:**
- M3 visual review of hood_basic hood_surface scale proportionality.
- M3 consider label-label overlap on staining_bench; either accept as minor proximity issue or adjust label placement vectors.
- Continue with M2d diagnostic lanes (E2-E5) for SVG completeness, scorecard, viewport sweep, and visual report.
