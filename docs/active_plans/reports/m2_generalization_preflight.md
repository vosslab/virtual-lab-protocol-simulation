# M2c generalization preflight report

Run at: 2026-05-24 18:42:56 UTC

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
| sample_prep_bench | 0 | 1 | 5 | PASS | 0 | 0 |
| staining_bench | 3 | 3 | 10 | PASS | 0 | 1 |
| cell_counter_basic | 0 | 1 | 2 | PASS | 0 | 0 |
| hood_basic | 0 | 1 | 4 | PASS | 0 | 0 |
| bench_basic_row_slot | 0 | 1 | 2 | PASS | 0 | 0 |

## Per-scene detail

### bench_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

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

### cell_counter_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 2)
(none)

**Zones shrunk per pass:** 0

**Overlap count:** 0
**Zone overflow count:** 0

### hood_basic

**Guard verdict:** PASS

**Diagnostics:** 0 (passes: 1, final items: 4)
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

## Summary and next steps

**D4-ready (preflight pass):** 6 / 6

### Preflight-passing scenes (ready for D4 render):

- **bench_basic**: 0 diagnostics
- **sample_prep_bench**: 0 diagnostics
- **staining_bench**: 3 diagnostics
- **cell_counter_basic**: 0 diagnostics
- **hood_basic**: 0 diagnostics
- **bench_basic_row_slot**: 0 diagnostics

Scenes that pass structural guards proceed to D4 rendering.
Scenes that fail are classified per D5 taxonomy.
