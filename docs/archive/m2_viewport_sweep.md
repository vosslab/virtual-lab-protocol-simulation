# M2 Viewport Sweep Report

## Scope

This report documents viewport sweep testing across 3 viewport sizes for all 6 D4 scenes.

**Method (Option B - Browser-only viewport sweep):**
- Pipeline renders at fixed 1920x1080 layout output (percentage coordinates)
- Browser viewport is parameterized to 3 sizes
- Tests CSS scaling and responsive reflow
- Does NOT rebuild layout engine for each viewport
- Rationale: Percentage coordinates make layout responsive by design; faster execution

## Viewport Sizes Tested

| Viewport | Aspect Ratio | Purpose |
| --- | --- | --- |
| 1200x900 | 4:3-ish | Older displays, smaller screens |
| 1440x1000 | ~14:10 | Mid-range modern displays |
| 1920x1080 | 16:9 | Default; modern widescreen |

## Results Table

| Scene | Viewport | Size (KB) | H-Scroll | V-Scroll | Status |
| --- | --- | --- | --- | --- | --- |
| bench_basic | 1200x900 | 29.4 | YES | YES | OK |
| bench_basic | 1440x1000 | 35.9 | YES | YES | OK |
| bench_basic | 1920x1080 | 47.6 | YES | YES | OK |
| bench_basic_row_slot | 1200x900 | 29.5 | YES | YES | OK |
| bench_basic_row_slot | 1440x1000 | 35.8 | YES | YES | OK |
| bench_basic_row_slot | 1920x1080 | 48.0 | YES | YES | OK |
| sample_prep_bench | 1200x900 | 38.5 | YES | YES | OK |
| sample_prep_bench | 1440x1000 | 46.2 | YES | YES | OK |
| sample_prep_bench | 1920x1080 | 62.5 | YES | YES | OK |
| staining_bench | 1200x900 | 54.9 | YES | YES | OK |
| staining_bench | 1440x1000 | 67.3 | YES | YES | OK |
| staining_bench | 1920x1080 | 89.0 | YES | YES | OK |
| cell_counter_basic | 1200x900 | 40.3 | YES | YES | OK |
| cell_counter_basic | 1440x1000 | 49.6 | YES | YES | OK |
| cell_counter_basic | 1920x1080 | 69.5 | YES | YES | OK |
| hood_basic | 1200x900 | 32.3 | YES | YES | OK |
| hood_basic | 1440x1000 | 38.6 | YES | YES | OK |
| hood_basic | 1920x1080 | 51.1 | YES | YES | OK |

## Observations

**Scroll behavior:** The following scenes triggered scroll at smaller viewports:
- bench_basic: scroll at 1200x900, 1440x1000, 1920x1080
- bench_basic_row_slot: scroll at 1200x900, 1440x1000, 1920x1080
- sample_prep_bench: scroll at 1200x900, 1440x1000, 1920x1080
- staining_bench: scroll at 1200x900, 1440x1000, 1920x1080
- cell_counter_basic: scroll at 1200x900, 1440x1000, 1920x1080
- hood_basic: scroll at 1200x900, 1440x1000, 1920x1080

**Screenshot sizes by scene (across all viewports):**
- bench_basic: avg=37.6 KB, range=29.4..47.6 KB
- bench_basic_row_slot: avg=37.8 KB, range=29.5..48.0 KB
- sample_prep_bench: avg=49.1 KB, range=38.5..62.5 KB
- staining_bench: avg=70.4 KB, range=54.9..89.0 KB
- cell_counter_basic: avg=53.1 KB, range=40.3..69.5 KB
- hood_basic: avg=40.7 KB, range=32.3..51.1 KB

## Artifacts

All 18 screenshots are stored in `tests/playwright/artifacts/`:
- Naming: `<scene>_<viewport>.png`
- Example: `bench_basic_1200x900.png`

## Summary

- Total scenes tested: 6
- Total viewports: 3
- Total screenshots: 18
- Failed renders: 0
- Convergence (no scroll): 0 / 6 scenes

## Residual Risks

- CSS media queries (if any) might behave differently than percentage-based layout
- Very small viewports (< 1200px) not tested; edge cases unknown
- Visual compression (squashing) subjective; not quantified in this sweep
- Layout engine convergence shrink (3 passes) not measured; pipeline still runs at 1920x1080

## Next Steps

- Review screenshots for any visual anomalies or clipping
- If scroll appears at certain viewports, determine root cause (constraint, zone, or CSS)
- Consider Option (A) if pipeline-level adaptive layout is needed (more complex, slower)
