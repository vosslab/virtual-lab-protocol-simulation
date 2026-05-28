# Round 3 markdown links cleanup

Date: 2026-05-22
Scope: Fix all broken/malformed local Markdown links in Round 3 report files

## Summary

**Before:** 12 markdown link errors in 6 files
**After:** 0 errors (gate passes)

## Issues found and fixed

### 1. Broken links to generated files (3 errors)

Files generated at build time are not tracked in git and cannot be linked.
Converted to inline code blocks with explanatory text.

**Files affected:**
- `round3_asset_specs_impact_audit.md` (2 instances at lines 15, 173)
- `round3_display_width_cm_top10_plan.md` (1 instance at line 41)

**Fix:** Changed ``object_data.ts`` to `` `object_data.ts` (generated at build time) ``

### 2. Broken links to temporary output directories (3 errors)

References to `test-results/` ephemeral output directories and temp test files.
These do not persist in the repo and should not be linked.

**Files affected:**
- `round3_protocol_advance_event_trace.md` (2 instances: directory link, temp file link)
- `round3_q1_best5_gallery.md` (1 instance at line 5)
- `round3_q2_worst5_gallery.md` (2 instances: lines 6, 26)

**Fix:** Removed markdown links and converted to inline code blocks:
- `test-results/round3_protocol_advance_event_trace/` (temporary output directory)
- `test-results/round3_runtime_initiative_galleries/best5_INDEX.html` (temporary gallery output)
- `test-results/round3_runtime_initiative_galleries/worst5_INDEX.html` (temporary gallery output)

### 3. Malformed link text with line numbers (4 errors)

Link text included source file line numbers but link URL did not, violating
MARKDOWN_STYLE.md rule that link text must match the target (either the URL,
the basename, or a valid tail of the target path).

**File affected:**
- `round3_runtime_label_readability.md` (4 instances at lines 13-16)

**Violations:**
- ``...` -> `...``
- ``...` -> `...``
- ``...` -> `...``
- ``...` -> `...``

**Fix:** Simplified link text to filename only, moved line numbers to parenthetical
text after the link per Markdown style conventions.

## Test results

### Before
```
Found 12 markdown link errors written to REPO_ROOT/report_markdown_links.txt
Issues per file
  docs/active_plans/reports/round3_asset_specs_impact_audit.md: 2
  docs/active_plans/reports/round3_display_width_cm_top10_plan.md: 1
  docs/active_plans/reports/round3_protocol_advance_event_trace.md: 2
  docs/active_plans/reports/round3_q1_best5_gallery.md: 1
  docs/active_plans/reports/round3_q2_worst5_gallery.md: 2
  docs/active_plans/reports/round3_runtime_label_readability.md: 4
```

### After
```
tests/test_markdown_links.py::test_markdown_links PASSED [100%]
1 passed in 0.15s
```

## Files edited

1. `docs/active_plans/reports/round3_asset_specs_impact_audit.md`
2. `docs/active_plans/reports/round3_display_width_cm_top10_plan.md`
3. `docs/active_plans/reports/round3_protocol_advance_event_trace.md`
4. `docs/active_plans/reports/round3_q1_best5_gallery.md`
5. `docs/active_plans/reports/round3_q2_worst5_gallery.md`
6. `docs/active_plans/reports/round3_runtime_label_readability.md`

## Status

OK Gate passes
OK All 12 errors resolved
OK Report files validated
OK No commits made (audit-only cleanup)
