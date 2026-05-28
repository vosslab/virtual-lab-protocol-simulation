# Base Scene Inventory

**Last Updated:** 2026-05-27

Audit of all base scenes in \`content/base_scenes/*.yaml\` for render-readiness.

## Summary

| Status | Count |
| ------ | ----- |
| Concrete | 9 |
| Template | 9 |
| Broken | 0 |
| **Total** | **18** |

**Concrete** = zones > 0, placements > 0; render-ready.
**Template** = zero placements; legacy row-slot format (deprecated).
**Broken** = invalid extends. Status: NONE.

## Concrete Scenes (Render-Ready)

| Scene | Zones | Placements | Workspace |
| --- | --- | --- | --- |
| bench_basic | 5 | 2 | bench |
| hood_basic | 5 | 4 | hood |
| cell_counter_basic | 2 | 2 | cell_counter |
| microscope_basic | 1 | 1 | microscope |
| electrophoresis_bench | 7 | 16 | bench |
| heat_block_bench | 5 | 3 | bench |
| sample_prep_bench | 5 | 5 | bench |
| imaging_bench | 3 | 2 | bench |
| staining_bench | 5 | 10 | bench |

## Template Scenes (Legacy Row-Slot Format)

| Scene | Rows | Workspace |
| --- | --- | --- |
| bench_basic_row_slot | 1 | bench |
| hood_basic_row_slot | 3 | hood |
| cell_counter_basic_row_slot | 2 | cell_counter |
| microscope_basic_row_slot | 1 | microscope |
| electrophoresis_bench_row_slot | 4 | bench |
| heat_block_bench_row_slot | 2 | bench |
| sample_prep_bench_row_slot | 2 | bench |
| imaging_bench_row_slot | 2 | bench |
| staining_bench_row_slot | 3 | bench |


## Inheritance Analysis

All base scenes are roots (none extend another base scene).

Concrete scenes extended by protocol-scoped overrides (24 total references):

- bench_basic: 7 protocol overrides
- electrophoresis_bench: 7 protocol overrides
- hood_basic: 5 protocol overrides
- microscope_basic: 2 protocol overrides
- staining_bench: 1 protocol override
- sample_prep_bench: 1 protocol override
- cell_counter_basic: 1 protocol override
- heat_block_bench: 0 protocol overrides (ready, unused)

Broken references check: **NONE DETECTED**


## Render-Readiness Assessment

All 9 concrete scenes are **READY FOR SHELL PILOTS**.

No render-blocking issues detected.

## Status Summary

- **Concrete:** 9 scenes, render-ready.
- **Template:** 9 scenes, deprecated legacy format.
- **Broken:** 0 (no invalid references).
- **Ready for Shell Pilots:** 9 concrete scenes, 24 active protocol references.

