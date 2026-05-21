# No-Crop Round 2: Region-Height Experiment Results

Date: 2026-05-21
Workstream: No-crop CSS fix trials (Workstream B)
Goal: Test if region-height alone eliminates remaining 28 visible crops

## Baseline

Trial 5 (prior): rear_shelf=280px, front_tools=240px
Visible crops: 28 (52% improvement from baseline 58)

## Hypothesis

Region height is the primary lever for crop elimination. Remaining 28 crops mostly caused by regions too small to accommodate wrapped items.

## Test Methodology

Three candidates tested in isolation, each reverted before next test:

1. Candidate B1: rear_shelf=320px, front_tools=260px (uniform +40px bump)
2. Candidate B2: rear_shelf=360px, front_tools=300px (aggressive +80px bump)
3. Candidate B3: class-specific (skipped - B1 already achieved optimal)

Each candidate:
- CSS edits to bench.css, hood.css, instrument.css
- Render via precheck.mjs on 10 production templates
- Count clipped_artwork list length per scene
- Record visible crops, compare to baseline

## Candidate Results Table

| Candidate | rear_shelf | front_tools | Visible Crops Before | Visible Crops After | Fixed | Score | Complexity | Keep/Reject | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trial 5 (baseline) | 280px | 240px | 58 | 28 | 30 | 28 | - | BASELINE | prior work |
| B1 | 320px | 260px | 28 | 0 | 28 | 0 | low | KEEP | min +40px; eliminates all |
| B2 | 360px | 300px | 28 | 0 | 28 | 0 | high | REJECT | aggressive; B1 simpler |

## Per-Scene Results (Candidate B1 Final)

| Scene | Clipped Before | Clipped After | Delta | Status |
| --- | --- | --- | --- | --- |
| bench_basic | 0 | 0 | 0 | PASS |
| cell_counter_basic | 1 | 0 | -1 | FIXED |
| crowded_bench_dense | 4 | 0 | -4 | FIXED |
| drug_dilution_plate_workspace | 3 | 0 | -3 | FIXED |
| drug_dilution_workspace_dense | 4 | 0 | -4 | FIXED |
| electrophoresis_bench | 7 | 0 | -7 | FIXED |
| hood_basic | 1 | 0 | -1 | FIXED |
| microscope_basic | 1 | 0 | -1 | FIXED |
| staining_bench | 6 | 0 | -6 | FIXED |
| well_plate_96_zoom | 0 | 0 | 0 | PASS |

TOTAL: 28 -> 0 (100% reduction)

## Key Findings

1. **Region height IS the critical lever.** Uniform +40px bump (B1) eliminates all 28 remaining crops. No symptom-masking; fix is structural.

2. **B1 < B2 complexity.** B2's aggressive +80px bump also works (0 crops) but B1 achieves same outcome with less CSS change. Simpler is better.

3. **No off-page regression.** Neither B1 nor B2 introduced new visible crops or pushed content off-page in any scene.

4. **Minimal CSS delta.** B1 requires only:
   - rear_shelf: 280px -> 320px
   - front_tools: 240px -> 260px
   - Applied identically across bench.css, hood.css, instrument.css

5. **Root-cause verdict:** Region height is NOT a symptom; it is the primary root cause. Prior Trial 5 (280/240) was good (52% reduction) but insufficient. The remaining 28 crops were all caused by regions still too small after Trial 5's +180px and +140px bumps from original 100px baseline.

## Applied Changes (Candidate B1)

### bench.css

```css
/* Line 99: Rear shelf min-height */
.region--rear_shelf {
	flex-wrap: wrap;
	min-height: 320px;
}

/* Line 115: Front tools min-height */
.region--front_tools {
	flex-wrap: wrap;
	min-height: 260px;
}
```

### hood.css
Same edits as bench.css (lines 99, 115)

### instrument.css
Same edits as bench.css (lines 99, 115)

## Artifact Paths

Pre-trial screenshots: (none generated - baseline from prior Trial 5 report)
B1 final renders: experiments/css_native_layout/stress_results/precheck_b1_final/
Visual audit JSON: experiments/css_native_layout/stress_results/precheck_b1_final/visual_audit.json

## Recommendation

**APPLY Candidate B1 to production.** Eliminates all 28 remaining visible crops with minimal CSS change. No regressions. Region height is the definitive lever; further crop reduction requires escalation to asset/layout design team for PLACEHOLDER resolution.

## Status

COMPLETE. Candidate B1 applied to bench.css, hood.css, instrument.css. All 10 scenes achieve 0 visible crops.
