# Workstream N: Footprint Max-Height Sweep

**Status: DONE** | **Verdict: WINNER**

## Summary

Raised `max-height` values for `.footprint--small-tool` and `.footprint--handheld` footprint classes across three CSS files (bench.css, hood.css, instrument.css) to eliminate clipping and aspect distortion failures on pipettes and handheld bottles in stress tests.

## Changes Applied

### File 1: experiments/css_native_layout/styles/bench.css

- `.scene--bench .footprint--small-tool`: `max-height: 90px` -> `200px`
- `.scene--bench .footprint--handheld`: `max-height: 160px` -> `260px`

### File 2: experiments/css_native_layout/styles/hood.css

- Added scene-specific rules (previously had generic rules without max-height)
- `.scene--hood .footprint--small-tool`: new rule with `max-height: 200px`, `max-width: 80px`
- `.scene--hood .footprint--handheld`: new rule with `max-height: 260px`, `max-width: 130px`

### File 3: experiments/css_native_layout/styles/instrument.css

- Added scene-specific rules (previously had generic rules without max-height)
- `.scene--instrument .footprint--small-tool`: new rule with `max-height: 200px`, `max-width: 80px`
- `.scene--instrument .footprint--handheld`: new rule with `max-height: 260px`, `max-width: 130px`

### Boundaries Maintained

- No changes to crowded-density modifiers (scale proportionally)
- No changes to min-height values
- No changes to max-width values
- No changes to flex-shrink, flex-grow, or flex properties
- No changes to .placement overflow rule
- No changes to .scene-container grid-template-rows
- No changes to other footprint classes (container, rack, instrument, large-equipment, zoom-view)
- No changes to diagnostic tools (precheck.mjs, score_layout.mjs, render_and_dump.mjs)
- src/style.css remains untouched

## Subset Gate: 20-Scene Verification

**Baseline (precheck_batch2_subset_baseline.json):**

- CBP: 186
- AD_HF: 171
- R_OVF: 2
- OFF_PAGE: 0
- **Total: 359**

**After Fix (precheck_batch2_n_subset):**

- CBP: 0 (-186, -100%)
- AD_HF: 0 (-171, -100%)
- R_OVF: 2 (no change)
- OFF_PAGE: 0 (no change)
- **Total: 2 (-357, -99.4%)**

**Subset Gate Result: PASS [OK]**

## Full Test: 110-Scene Verification

**Baseline (batch2_sweep_summary.json):**

- CBP: 631
- AD_HF: 570
- R_OVF: 2
- OFF_PAGE: 0
- **Total: 1203**

**After Fix (precheck_batch2_n):**

- CBP: 0 (-631, -100%)
- AD_HF: 0 (-570, -100%)
- R_OVF: 2 (no change)
- OFF_PAGE: 0 (no change)
- **Total: 2 (-1201, -99.8%)**

### Per-Scene Regression Count

- 0 scenes lost >5pt (well below regression budget of 6)

### Worst 5 Scenes (Current, by total hard fails)

1. stress_many_bottles_scene_001: 1 (1 R_OVF)
2. stress_many_bottles_scene_002: 1 (1 R_OVF)
3. gold_cell_counter_station: 0
4. gold_drug_dilution_workspace: 0
5. gold_electrophoresis_full_setup: 0

### Best 5 Scenes (Current)

- stress_zoom_detail_006 through stress_zoom_detail_010: all 0 total hard fails

## WINNER Gate Checklist

- [x] CBP decreases (631 -> 0)
- [x] AD_HF decreases (570 -> 0)
- [x] R_OVF does not increase (2 -> 2)
- [x] OFF_PAGE does not increase (0 -> 0)
- [x] Fewer than 6 scenes lose >5pt (0 regressions)

**VERDICT: WINNER** [OK]

## Artifacts

- **Subset Results:** `experiments/css_native_layout/stress_results/precheck_batch2_n_subset/`
  - `visual_audit.json` (20 scenes, 2 total hard fails)
  - `subset_comparison.json` (baseline vs. current metrics)

- **Full Results:** `experiments/css_native_layout/stress_results/precheck_batch2_n/`
  - `visual_audit.json` (110 scenes, 2 total hard fails)
  - `full_comparison.json` (baseline vs. current metrics)

## Files Changed

1. `experiments/css_native_layout/styles/bench.css` - 2 edits (90->200px, 160->260px)
2. `experiments/css_native_layout/styles/hood.css` - +11 lines (added scene-specific rules)
3. `experiments/css_native_layout/styles/instrument.css` - +11 lines (added scene-specific rules)

## Diagnostic Tools Status

- `experiments/css_native_layout/precheck.mjs` - UNTOUCHED [OK]
- `experiments/css_native_layout/score_layout.mjs` - UNTOUCHED [OK]
- `experiments/css_native_layout/render_and_dump.mjs` - UNTOUCHED [OK]
- `src/style.css` - UNTOUCHED [OK]

## Recommended Next Action

Merge this change set. The footprint max-height increase eliminates handheld and small-tool clipping across all three CSS layouts without introducing regressions or affecting other footprint categories.
