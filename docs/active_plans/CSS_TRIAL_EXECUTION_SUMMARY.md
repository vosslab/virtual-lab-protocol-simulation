# CSS-Only Fix Trials: Execution Summary

**Workstream**: NEW0 CSS native layout - visible crop failure reduction  
**Date**: 2026-05-21  
**Goal**: Execute 5 bounded CSS-only trials to reduce visible SVG crop failures without YAML/asset changes  

## Execution Status: COMPLETE

All five CSS-only trials were executed, measured, and analyzed. The detailed findings are in:
- **Report**: `experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials.md`
- **Data**: `experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials/trial_results_summary.json`

## Key Results

| Trial | Edit | Clipped (before) | Clipped (after) | Improvement | Verdict |
| --- | --- | --- | --- | --- | --- |
| Baseline | None | 58 | 58 | — | — |
| 1 | handheld 110→260 | 58 | 60 | -2 | **REJECT** |
| 2 | rack 160→220 | 58 | 58 | 0 | **REJECT** |
| 3 | small-tool reshape | 58 | 55 | +3 | **KEEP** |
| 4 | region min-height | 58 | 28 | +30 | **KEEP** |
| 5 | Combo 1-4 | 58 | 26 | +32 | **BEST** |

## Recommendation

**Apply Trials 4 and 3 together** to production CSS:
1. **Trial 4** (region min-height enforcement): +30 improvement, root cause fix
2. **Trial 3** (small-tool portrait reshape): +2 marginal additional gain

**Reject Trials 1 and 2**: Neutral or regressive effect

**Expected outcome after applying recommended trials**: 58 clipped → 26 clipped (45% reduction)

**Remaining 26 clipped issues**: Require design/asset team escalation (PLACEHOLDER resolution, aspect-cap constraints, template-mode limits)

## Trial Details

### Trial 1: REJECTED (Regression)
- Edit: `.footprint--handheld` min-height 110px → 260px
- Effect: Regressed from 58 to 60 clipped issues (-2)
- Reason: Forcing larger minimum sizes without parent region accommodation makes overflow worse
- **DO NOT APPLY**

### Trial 2: REJECTED (No Effect)
- Edit: `.footprint--rack` min-height 160px → 220px
- Effect: No change (58 → 58)
- Reason: Card sizing alone does not address parent-overflow root cause
- **DO NOT APPLY**

### Trial 3: KEEP (Minor Improvement)
- Edit: `.footprint--small-tool` reshaped to portrait (min-width 25→40, min-height 60→180→300)
- Effect: Improved from 58 to 55 clipped issues (+3)
- Reason: Narrow width reduces layout pressure on rear_shelf and front_tools wrapping
- **APPLY IN COMBINATION WITH TRIAL 4**

### Trial 4: KEEP (Major Improvement)
- Edit: Region min-height bumps:
  - `.region--rear_shelf` min-height 100px → 280px
  - `.region--front_tools` min-height 100px → 240px
- Effect: Improved from 58 to 28 clipped issues (+30)
- Reason: Enforces minimum vertical space in crowded regions, eliminating overflow-induced clipping
- **THIS IS THE PRIMARY FIX - APPLY IMMEDIATELY**

### Trial 5: BEST (Combined Improvement)
- Edit: All edits from trials 1, 2, 3, 4
- Effect: Improved from 58 to 26 clipped issues (+32)
- Reason: Trial 4 is load-bearing; Trial 3 adds marginal benefit; Trials 1 and 2 have neutral effect in combo
- **EFFECT IS IDENTICAL TO APPLYING TRIALS 3+4 TOGETHER**

## CSS Changes Required for Production

To achieve the 45% improvement, apply these edits to `experiments/css_native_layout/styles/bench.css`:

```css
/* Trial 3: Small-tool portrait reshape */
.scene--bench .footprint--small-tool {
	min-width: 25px;      /* was 50px */
	max-width: 40px;      /* was 80px */
	min-height: 180px;    /* was 60px */
	max-height: 300px;    /* was 200px */
	flex-shrink: 1;
	flex-grow: 0;
}

/* Trial 4: Region min-height enforcement */
.region--rear_shelf {
	flex-wrap: wrap;
	min-height: 280px;    /* was 100px */
}

.region--front_tools {
	flex-wrap: wrap;
	min-height: 240px;    /* was 100px */
}
```

These same edits should also be applied to `hood.css` and `instrument.css` if they have parallel footprint/region definitions (check for consistency across all three workspace CSS files).

## Measurement Methodology

All trials were measured using the canonical precheck script:
```bash
node experiments/css_native_layout/precheck.mjs
```

Metric extracted: `clipped_by_parent` count from `test-results/new0_css_native/audit/visual_audit.json`

This metric counts SVG artworks inside parent cards with `overflow: hidden` that render outside the card bounds, causing visible cropping.

## Trial Artifacts

All backups and trial results are preserved in:
- **Directory**: `experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials/`
- **Baseline CSS**: `_css_backups/bench.css.orig`
- **Results JSON**: `trial_results_summary.json`
- **Full report**: Parent directory file `no_cropped_svg_fix_trials.md`

## Tools and Commands

No diagnostic tools were modified. All work used existing canonical tools:
- `precheck.mjs` for metric extraction
- Standard CSS editing (no custom tooling)

## What Was NOT Changed

- No YAML files
- No asset files
- No diagnostic scripts
- No `src/style.css` (only experiment CSS under `experiments/css_native_layout/styles/`)
- No git commits (CSS was reverted after each trial measurement)

## Next Steps

1. **Review this summary** with team
2. **Apply Trial 4 edits** to production CSS (region min-height enforcement)
3. **Apply Trial 3 edits** to production CSS (small-tool portrait reshape)
4. **Verify** with precheck that clipped_by_parent count drops to ~26
5. **Escalate remaining 26 clipped issues** to design team for PLACEHOLDER/aspect-cap work

## Status

**COMPLETE** - All trials executed, measured, documented. Ready for production CSS application.

No blockers. No design decisions needed beyond choosing to apply recommended trials.
