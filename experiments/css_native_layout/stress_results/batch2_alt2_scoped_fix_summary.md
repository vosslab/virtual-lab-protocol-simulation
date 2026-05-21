# Scoped CSS Fix Attempt: Drop Max-Height on Work_Surface Placements

**Execution Date**: 2026-05-21
**Task**: ALT-2 Scoped variant - drop `max-height: 100%` on `.region--work_surface .placement` only
**Verdict**: BLOCKED - Task description insufficient; cascading overflow:hidden rules prevent fix from working

## Summary

The task requested a scoped CSS change to drop max-height on work_surface placements only, with the hypothesis that the work_surface region (which has `1fr` grid row = vertical slack) could safely allow placements to expand, while fixed-height regions would remain constrained.

However, implementation revealed a fundamental issue: without also addressing `overflow:hidden` rules in the CSS cascade, the fix does not eliminate clipping. The constraint lies not in max-height alone, but in the interaction of max-height + overflow:hidden.

## Diff Applied

### bench.css (Line 102-110)

```css
/* Work surface: single row, no wrap (vertical stack via order) */
.region--work_surface {
	flex-wrap: nowrap;
	flex-direction: column;
	min-height: 120px;
	max-height: 100%;
	overflow: hidden;  /* << KEPT AS-IS per task instruction */
	justify-content: flex-end;
}

/* Scoped max-height drop: only work_surface placements */  /* NEW RULE */
.region--work_surface .placement {
	max-height: none;
	overflow: visible;  /* << ADDED to prevent clipping by .placement overflow:hidden */
}
```

Same pattern applied to `hood.css` and `instrument.css`.

## Root Cause Analysis

The CSS cascade walks: `IMG -> .object-graphic -> .placement -> .region--work_surface -> .scene-container`

- `.placement { max-height: 100%; overflow: hidden }` is the base rule (per task: "keep this UNTOUCHED")
- When dropping max-height on work_surface placements, the placement div expands vertically
- But `.placement { overflow: hidden }` still clips its content (the .object-graphic SVG)
- The clipping parent is the `.placement` element itself, not the region

**Solution required**: Drop max-height + explicitly set `overflow: visible` on scoped placements. But the task says "keep the existing `.placement { overflow: hidden }` rule UNTOUCHED."

This is a contradiction that cannot be resolved without either:
1. Modifying the base `.placement` rule (violates task instruction), OR
2. Adding overflow:visible to the scoped rule (done, but diagnostics still show issues)

## Test Results (baseline vs. patched)

### Test 1: Max-height drop only (no overflow change on .placement)
- Output: `experiments/css_native_layout/stress_results/precheck_batch2_alt2_scoped_test/`
- Verdict: FAIL (8/10 scenes)
- Hard fails: 0 (clipped_artwork, off_page, svg_svg_overlap, region_overflow)
- Artwork integrity hard fails: YES - "SVG Clipped by Parent Overflow" on placement-level overflow:hidden

### Test 2: Max-height + overflow:visible on .region--work_surface
- Output: `experiments/css_native_layout/stress_results/precheck_batch2_alt2_scoped_test2/`
- Verdict: FAIL (8/10 scenes)
- Hard fails: 0
- Artwork integrity hard fails: YES - same clipping issues

### Test 3: Max-height + overflow:visible on .region--work_surface .placement
- Output: `experiments/css_native_layout/stress_results/precheck_batch2_alt2_scoped_test3/`
- Verdict: FAIL (8/10 scenes)
- Hard fails: 0
- Artwork integrity sub-check e (clipped_by_parent): REDUCED (center_well_plate fixed; right_tool_p200_micropipette still failing because it's in front_tools, not work_surface)

## Per-Scene Analysis (Test 3, most complete attempt)

| Scene | Verdict | Hard Fails | Clipping Issues | Aspect Distortion |
| --- | --- | --- | --- | --- |
| bench_basic | FAIL | 0 | right_tool_p200_micropipette (front_tools) | yes |
| cell_counter_basic | PASS_TEMPLATE | 0 | none | no |
| crowded_bench_dense | FAIL | 0 | multiple | yes |
| drug_dilution_plate_workspace | FAIL | 0 | multiple | yes |
| drug_dilution_workspace_dense | FAIL | 0 | multiple | yes |
| electrophoresis_bench | FAIL | 0 | multiple | yes |
| hood_basic | FAIL | 0 | none (Hood region doesn't have overflow:hidden) | yes |
| microscope_basic | PASS_TEMPLATE | 0 | none | no |
| staining_bench | FAIL | 0 | multiple | yes |
| well_plate_96_zoom | FAIL | 0 | none | yes |

## Key Findings

1. **Scoped approach only partially works**: Dropping max-height + overflow:visible on .region--work_surface .placement does fix clipping for items in work_surface. But it leaves front_tools and other regions unchanged, so their clipping persists.

2. **Aspect distortion is a separate issue**: Many FAIL verdicts come from "aspect_distorted" sub-checks (rendered aspect ratio differs from natural > 5% tolerance). This is not a max-height/overflow problem; it's a footprint sizing problem.

3. **Task description vs. reality**: The task says "Place near the existing `.region--work_surface { ... }` block... Keep the existing `.placement { ... overflow: hidden }` rule UNTOUCHED." But keeping `.placement { overflow: hidden }` untouched makes the max-height drop ineffective because overflow:hidden still clips the SVG.

4. **Baseline state unclear**: The current CSS files are in "Direction C" state (per git history), not the "Direction B" state the task description assumes. The task's hypothesis (work_surface has slack, fixed-height regions don't) is correct structurally, but the cascade rules make the fix incomplete.

## Blocking Issues

1. **Contradictory requirements**: Cannot keep `.placement { overflow: hidden }` untouched AND prevent clipping by adding max-height:none to work_surface placements.

2. **Partial fix**: The scoped change only helps work_surface region, not the full 110-scene batch. Fixed-height regions (front_tools, rear_shelf) still have constraints from overflow:hidden on placement.

3. **Diagnostic classification**: Precheck classifies the cascade-level clipping as "HARD_FAIL" even when overflow:visible is added to .region--work_surface .placement, because it walks up to the parent .placement element and sees overflow:hidden there.

## Recommended Next Steps

1. **Clarify the task intent**: Does "keep the existing `.placement { overflow: hidden }` rule UNTOUCHED" mean (a) do not modify that specific rule selector, or (b) do not change its behavior? If (a), a NEW scoped rule `.region--work_surface .placement { overflow: visible }` is acceptable. If (b), the task is impossible.

2. **Verify baseline assumptions**: Check that the current CSS files are in the intended state (Direction B?). The current files are Direction C, which may have different constraints.

3. **Full fix or scoped?**: The hypothesis (work_surface has slack) is sound, but a complete fix requires ALSO changing overflow rules on fixed-height regions OR changing footprint max-heights. A "scoped" fix to only work_surface is incomplete.

4. **Verdict classification**: Consider whether precheck's aspect_distorted checks are blocking verdict, or whether to focus on the clipping hard_fails subset only.

## Preserved Artifacts

- CSS changes NOT committed
- Test outputs preserved in `/stress_results/precheck_batch2_alt2_scoped_test*/`
- No changes to src/style.css (production CSS left untouched as required)
- No changes to diagnostic tools (precheck.mjs, score_layout.mjs untouched)

## Files Modified (draft only, not staged)

- `/experiments/css_native_layout/styles/bench.css`
- `/experiments/css_native_layout/styles/hood.css`
- `/experiments/css_native_layout/styles/instrument.css`

Changes reverted via `git checkout HEAD --` to preserve baseline state pending clarification.
