# M2c generalization preflight report

Run at: 2026-05-29 01:08:47 UTC

## Scope

Lane D3 runs the full layout pipeline on each of the 6 D1 generalization scenes
(from SCENE_ALLOWLIST in generated/scenes.ts). For each scene:

- Parse and normalize the scene YAML
- Resolve all objects to the object library
- Resolve all assets to SVG_REGISTRY
- Run the full convergence loop (up to MAX_LAYOUT_PASSES)
- Run structural guards on final layout
- Capture diagnostics, pass counts, and guard pass/fail verdict

## Method

Each preflight invokes:
`runPipeline(scene, { library: OBJECT_LIBRARY, assets: ASSET_SPECS })`
followed by `runStructuralGuards(result.final, scene)` to verify
layout geometry before D4 attempts rendering.

## Results: summary table

| scene | diagnostics | passes | final_items | guard_verdict | overlap_count | zone_overflow |
| --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 0 | 1 | 2 | PASS | 0 | 0 |
| bench_basic_row_slot | 0 | 1 | 2 | PASS | 0 | 0 |
| cell_counter_basic | 0 | 1 | 2 | PASS | 0 | 0 |
| electrophoresis_bench | 14 | 3 | 16 | FAIL: Structural guard failure (item overlap): item "rear_center_electrophoresis_tank" overlaps with "center_electrode_module" by 20.3%. | 0 | 9 |
| hood_basic | 0 | 1 | 4 | PASS | 0 | 0 |
| imaging_bench | 4 | 3 | 2 | PASS | 0 | 2 |
| sample_prep_bench | 0 | 1 | 5 | PASS | 0 | 0 |
| staining_bench | 3 | 3 | 10 | PASS | 0 | 1 |

## Per-scene detail

### bench_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### bench_basic_row_slot

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### cell_counter_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### electrophoresis_bench

**Guard verdict:** FAIL
**Guard failure message:** Structural guard failure (item overlap): item "rear_center_electrophoresis_tank" overlaps with "center_electrode_module" by 20.3%.

**Diagnostics:** 14 (passes: 3, final items: 16)
- horizontal/warn/zone_overflow_negative_gap
- vertical/warn/item_escapes_zone_vertically [rear_center_electrophoresis_tank]
- vertical/warn/item_escapes_zone_vertically [rear_right_power_supply]
- vertical/warn/item_escapes_zone_vertically [center_gel_cassette]
- vertical/warn/item_escapes_zone_vertically [center_serological_pipette]
- vertical/warn/item_escapes_zone_vertically [center_electrode_module]
- vertical/warn/item_escapes_zone_vertically [center_running_buffer_1x_carboy]
- vertical/warn/item_escapes_zone_vertically [front_left_mini_protean_gel]
- vertical/warn/item_escapes_zone_vertically [front_right_gel_comb]
- labels/warn/label_collision_residual
- labels/warn/label_collision_residual
- clamp/warn/zone_clamped_to_bounds
- clamp/warn/zone_clamped_to_bounds
- meta/warn/max_iterations_reached

**Zones shrunk per pass:** 0, 0, 0

**Overlap count:** 0
**Zone overflow count:** 9

### hood_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 4)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### imaging_bench

**Guard verdict:** PASS

**Diagnostics:** 4 (passes: 3, final items: 2)
- vertical/warn/item_escapes_zone_vertically [rear_center_lightbox]
- vertical/warn/item_escapes_zone_vertically [center_staining_tray]
- clamp/warn/zone_clamped_to_bounds
- meta/warn/max_iterations_reached

**Zones shrunk per pass:** 0, 0, 0

**Overlap count:** 0
**Zone overflow count:** 2

### sample_prep_bench

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 5)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### staining_bench

**Guard verdict:** PASS

**Diagnostics:** 3 (passes: 3, final items: 10)
- horizontal/warn/zone_overflow_negative_gap
- labels/warn/label_collision_residual
- meta/warn/max_iterations_reached

**Zones shrunk per pass:** 0, 0, 0

**Overlap count:** 0
**Zone overflow count:** 1

## Summary and next steps

**D4-ready (preflight pass):** 7 / 8

### Preflight-passing scenes (ready for D4 render):

- **bench_basic**: 0 diagnostics
- **bench_basic_row_slot**: 0 diagnostics
- **cell_counter_basic**: 0 diagnostics
- **hood_basic**: 0 diagnostics
- **imaging_bench**: 4 diagnostics
- **sample_prep_bench**: 0 diagnostics
- **staining_bench**: 3 diagnostics

### Preflight-failing scenes (needs fix before D4):

- **electrophoresis_bench**: Structural guard failure (item overlap): item "rear_center_electrophoresis_tank" overlaps with "center_electrode_module" by 20.3%.

Scenes that pass structural guards proceed to D4 rendering.
Scenes that fail are classified per D5 taxonomy.
