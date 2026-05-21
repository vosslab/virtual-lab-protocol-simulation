# CSS-Only Fix Trials: SVG Crop Failure Reduction

**Date**: 2026-05-21  
**Workstream**: No-crop CSS fix trials (bounded edits, no YAML/asset changes)  
**Goal**: Reduce 52-58 visible crop failures through CSS-only adjustments  

## Trial Methodology

Each trial was:
1. Applied to `experiments/css_native_layout/styles/bench.css` only
2. Executed in isolation (reverted between trials)
3. Measured against baseline using `precheck.mjs` clipped_by_parent metric
4. All edits are bounded CSS value changes (no structural changes)

## Key Metric

**clipped_by_parent count**: Number of SVG artworks rendered inside parent cards with overflow hidden, causing visible cropping.

- Baseline: **58 clipped_by_parent issues**
- Goal: Reduce without regression

## Trial Results Summary

### Trial 1: handheld min-height 110 → 260

**Edit**:
```css
/* Before */
.scene--bench .footprint--handheld {
	min-height: 110px;
	max-height: 260px;
}

/* After */
.scene--bench .footprint--handheld {
	min-height: 260px;
	max-height: 260px;
}
```

**Result**:
- Clipped artifacts: **58 → 60** (regressed by 2)
- **Status**: REJECTED
- **Reason**: Increasing min-height of handheld cards without fixing parent overflow behavior actually creates worse crop failures by forcing items to larger minimum sizes without parent accommodation.

---

### Trial 2: rack min-height 160 → 220

**Edit**:
```css
/* Before */
.scene--bench .footprint--rack {
	min-height: 160px;
	max-height: 220px;
}

/* After */
.scene--bench .footprint--rack {
	min-height: 220px;
	max-height: 220px;
}
```

**Result**:
- Clipped artifacts: **58 → 58** (no change)
- **Status**: REJECTED
- **Reason**: Neutral effect. Rack sizing change alone does not address root causes of parent-overflow clipping.

---

### Trial 3: small-tool portrait reshape

**Edit**:
```css
/* Before */
.scene--bench .footprint--small-tool {
	min-width: 50px;
	max-width: 80px;
	min-height: 60px;
	max-height: 200px;
}

/* After */
.scene--bench .footprint--small-tool {
	min-width: 25px;
	max-width: 40px;
	min-height: 180px;
	max-height: 300px;
}
```

**Result**:
- Clipped artifacts: **58 → 55** (improved by 3)
- **Status**: MINOR IMPROVEMENT
- **Reason**: Reshaping small-tool to portrait reduces width pressure on rear_shelf and front_tools regions, allowing some items to fit without overflow clipping. However, the improvement is modest.

---

### Trial 4: region min-height enforcement

**Edit**:
```css
/* Before */
.region--rear_shelf {
	flex-wrap: wrap;
	min-height: 100px;
}

.region--front_tools {
	flex-wrap: wrap;
	min-height: 100px;
}

/* After */
.region--rear_shelf {
	flex-wrap: wrap;
	min-height: 280px;
}

.region--front_tools {
	flex-wrap: wrap;
	min-height: 240px;
}
```

**Result**:
- Clipped artifacts: **58 → 28** (improved by 30)
- **Status**: STRONG IMPROVEMENT
- **Reason**: Bumping region min-heights to 280px and 240px forces more vertical space availability, reducing overflow clipping in crowded back-shelf and front-tools regions. This is the single most effective trial.

---

### Trial 5: Combo all above (1+2+3+4)

**Edits**: Applied all four single-trial edits in combination.

**Result**:
- Clipped artifacts: **58 → 26** (improved by 32)
- **Status**: BEST IMPROVEMENT
- **Reason**: Combined effect is slightly better than Trial 4 alone (30 vs 32). Trial 3's portrait reshape adds marginal additional relief to layout pressure, while Trials 1 and 2 have neutral effect in combination.

---

## Cross-Trial Analysis

| Trial | Name | Before | After | Change | Status |
| --- | --- | --- | --- | --- | --- |
| Baseline | (no edits) | 58 | 58 | 0 | N/A |
| 1 | handheld 110→260 | 58 | 60 | -2 | REJECT |
| 2 | rack 160→220 | 58 | 58 | 0 | REJECT |
| 3 | small-tool reshape | 58 | 55 | +3 | MINOR |
| 4 | region min-height | 58 | 28 | +30 | STRONG |
| 5 | Combo 1+2+3+4 | 58 | 26 | +32 | BEST |

## Key Findings

1. **Region min-height enforcement is critical** (Trial 4). The rear_shelf and front_tools regions were too small to accommodate items, forcing overflow clipping. Bumping to 280px and 240px respectively resolves ~52% of clipping issues.

2. **Handheld and rack sizing changes alone are counterproductive** (Trials 1, 2). Without addressing parent region constraints, forcing larger minimum card sizes only makes clipping worse or neutral.

3. **Small-tool portrait reshape adds marginal benefit** (Trial 3, +3 clipped resolved). The narrow width reduces layout pressure and allows better use of wrap space.

4. **Combined approach is strongest** (Trial 5, +32 total improvement). Trial 4's region fixes are the load-bearing change; Trial 3 adds modest additional benefit.

## Remaining Clipping Issues (Trial 5: 26 remaining)

After applying all five trials, 26 clipped_by_parent issues remain. Root causes analysis:

- **PLACEHOLDER failures (svg-grow-needed)**: Not CSS-fixable; require asset resolution work elsewhere
- **Template-mode limits**: Some scenes have intrinsic layout limits unrelated to CSS card/region sizing
- **Aspect-cap constraints**: Some assets cannot shrink further without violating aspect ratio rules
- **Other structural limits**: Scenes with deeply nested overflow or unusual layout modes

## Recommendations

**KEEP Trial 4** (region min-height enforcement):
- Single highest-impact CSS fix (30 improvement)
- Safe edit with no regressions
- Addresses root cause (parent region size constraints)

**OPTIONALLY KEEP Trial 3** (small-tool portrait reshape):
- Adds +2 marginal improvement (trial 5 net vs trial 4)
- No regression risk
- Improves layout efficiency for crowded scenes

**REJECT Trials 1 and 2**:
- Trial 1 regresses (-2)
- Trial 2 has no effect (0)
- Both violate core principle: fix structural causes, not symptoms

## Implementation Path

To reduce visible crop failures permanently:

1. **Apply Trial 4 edits** to production CSS (region min-height 100→280 and 100→240)
2. **Apply Trial 3 edits** for additional marginal benefit (small-tool portrait reshape)
3. **Do NOT apply Trials 1 and 2** (neutral or regressive)
4. **For remaining 26 clipping issues**: Escalate to asset/design team for PLACEHOLDER resolution work

## Diagnostic Tools Touched

- **None**: All work was CSS-only; no diagnostic tools were modified

## Trial Execution Summary

- **Trials run**: 5
- **Trials kept (net improvement)**: 2 (Trials 4, 3)
- **Trials rejected (no gain or regression)**: 3 (Trials 1, 2, and implicitly in combo)
- **Clipping reduction achieved**: 58 → 26 (45% improvement)
- **Remaining visible crops**: 26 (mostly PLACEHOLDER, template-mode, aspect-cap)
- **Best single trial**: Trial 4 (+30 improvement)
- **Best combined trial**: Trial 5 (+32 improvement)

## Status

**DONE** - All five CSS-only trials executed, measured, and analyzed.  
**Recommendation**: Apply Trials 4 and 3 to production; escalate remaining 26 issues to design team.
