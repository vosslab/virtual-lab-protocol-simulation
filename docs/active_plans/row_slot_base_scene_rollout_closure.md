# Row+slot base scene rollout closure

Completion report for WP-ROLL-N (all 7 remaining base scenes).

## Scene rollout table

| Scene | Rows | Slots | Placements | Gallery Screenshot | Status |
| --- | --- | --- | --- | --- | --- |
| heat_block_bench_row_slot | 2 | 3 | 3 | test-results/_base_scenes_gallery/heat_block_bench_row_slot.png | green |
| cell_counter_basic_row_slot | 2 | 2 | 2 | test-results/_base_scenes_gallery/cell_counter_basic_row_slot.png | green |
| electrophoresis_bench_row_slot | 4 | 16 | 16 | test-results/_base_scenes_gallery/electrophoresis_bench_row_slot.png | green |
| imaging_bench_row_slot | 2 | 2 | 2 | test-results/_base_scenes_gallery/imaging_bench_row_slot.png | green |
| microscope_basic_row_slot | 1 | 1 | 1 | test-results/_base_scenes_gallery/microscope_basic_row_slot.png | green |
| sample_prep_bench_row_slot | 2 | 5 | 5 | test-results/_base_scenes_gallery/sample_prep_bench_row_slot.png | green |
| staining_bench_row_slot | 3 | 10 | 10 | test-results/_base_scenes_gallery/staining_bench_row_slot.png | green |

Previous work (hood_basic_row_slot, bench_basic_row_slot) already delivered:

| Scene | Rows | Slots | Placements | Gallery Screenshot | Status |
| --- | --- | --- | --- | --- | --- |
| hood_basic_row_slot | 3 | 3 | 3 | test-results/_base_scenes_gallery/hood_basic_row_slot.png | green |
| bench_basic_row_slot | 1 | 2 | 2 | test-results/_base_scenes_gallery/bench_basic_row_slot.png | green |

## Verdict

**rollout_complete**

All 8 row+slot base scenes are authored, compiled, rendered, and verified:
- Gallery auto-discovery fixed (test now iterates generated/scene_data.ts)
- 7 new row+slot YAML files created following Model B sketches from Section 4
- All placements preserved verbatim from legacy YAML
- No geometry fields (bounds, zones, scene_bounds, etc.)
- All scenes render with correct placement count
- Gallery test discovers and renders 18 base scenes total (9 legacy + 9 row+slot)
- All pytest tests pass: 830 passed, 1 skipped

## Placement preservation summary

All 45 total placements across 7 scenes preserved verbatim:

- heat_block_bench_row_slot: 3/3 placements preserved
- cell_counter_basic_row_slot: 2/2 placements preserved
- electrophoresis_bench_row_slot: 16/16 placements preserved
- imaging_bench_row_slot: 2/2 placements preserved
- microscope_basic_row_slot: 1/1 placement preserved
- sample_prep_bench_row_slot: 5/5 placements preserved
- staining_bench_row_slot: 10/10 placements preserved

## Next steps

Recommendation: Row+slot migration is complete for all base scenes. Next plan should handle:
1. Optional: legacy zone-based scene file deletion (preserve git history via git rm + CHANGELOG note)
2. Optional: validation that protocol overrides work with row+slot base scenes
3. Closure: retire WP-ROLL-N (this rollout) and archive plan doc to docs/active_plans/ archive
