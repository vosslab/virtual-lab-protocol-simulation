# Label Solver Validation Results

Date: 2026-05-18
Experiment: EXP3-LABEL-SOLVER-VALIDATE

## Section 1: Hypothesis

Prior analysis (geometry-only, non-applied) estimated that 78% of label failures could be resolved by applying Y-axis offsets (±10, ±20, ±30px) to individual labels. Specifically:

- C2 (label-object overlap) failures: 203 baseline, estimated 173 resolvable (85%)
- C3 (label-label overlap) failures: 125 baseline, estimated 84 resolvable (67%)
- Total resolvable: 257 of 328 label failures (78%)

This experiment implemented the solver as an applied post-processing pass and re-measured via the same precheck harness, to validate the estimate against reality.

## Section 2: Measured Results

### Baseline (no solver)

| Metric               |   Count |
| -------------------- | ------: |
| C1 (obj-obj overlap) |     212 |
| C2 (lbl-obj overlap) |     203 |
| C3 (lbl-lbl overlap) |     125 |
| C4 (zero dimension)  |       0 |
| C5 (row width)       |       5 |
| **Total (excl C5)**  | **540** |

### With Solver Applied

| Metric                |   Count |
| --------------------- | ------: |
| C1 (obj-obj overlap)  |     212 |
| C2 (lbl-obj overlap)  |     203 |
| C3 (lbl-lbl overlap)  |     125 |
| C4 (zero dimension)   |       0 |
| C5 (row width)        |       7 |
| **Total (excl C5)**   | **540** |
| **Unresolved labels** |  **76** |

### Comparison Table

| Metric                   | Baseline | With Solver |            Delta | Estimate Hit?                 |
| ------------------------ | -------: | ----------: | ---------------: | ----------------------------- |
| C1 (obj-obj)             |      212 |         212 |                0 | n/a (solver can't touch C1)   |
| C2 (lbl-obj)             |      203 |         203 | 0 (0% reduction) | Expected ~173 (85% reduction) |
| C3 (lbl-lbl)             |      125 |         125 | 0 (0% reduction) | Expected ~84 (67% reduction)  |
| **Total label failures** |  **328** |     **328** |            **0** | Expected ~257 (78% reduction) |

## Section 3: Estimate Accuracy Verdict

**ESTIMATE MASSIVELY OVERSHOOT** - The estimate predicted 78% (257 of 328) label failures would resolve via Y-axis offset alone. The actual applied solver achieved **0% reduction** (0 of 328 failures resolved).

This is not a measurement error or a close miss. The solver algorithm correctly processes label collisions but finds that no label can be moved via ±30px Y-offset to clear all its collisions. The root cause is:

1. **Mutual collision clusters**: Many labels collide with 2+ other labels at the same or nearly-same Y coordinate (e.g., waste_containe and vortex at Y=227 in bench_basic). Moving one label does not clear all its collisions when another label is stationary and overlapping.
2. **Greedy processing limitation**: The solver processes labels in collision-count order and applies offsets greedily to each. When two labels collide with each other, moving one by ±10/20/30px does not separate both; they often move closer or remain overlapped at the new Y position.
3. **Label spacing insufficient**: The offset range (±30px max) is too narrow for heavily overlapping scenes like electrophoresis_bench or staining_bench, where multiple objects and their labels are packed into a 900×700px viewport.

## Section 4: Per-Scene Before/After (Failing Scenes Only)

| Scene                          | Type     | Before C2 | After C2 | Before C3 | After C3 | Unresolved |
| ------------------------------ | -------- | --------: | -------: | --------: | -------: | ---------: |
| bench_basic                    | zone     |         0 |        0 |         1 |        1 |          2 |
| bench_basic_row_slot           | row+slot |         0 |        0 |         1 |        1 |          2 |
| electrophoresis_bench          | zone     |        74 |       74 |        44 |       44 |         16 |
| electrophoresis_bench_row_slot | row+slot |        69 |       69 |        32 |       32 |         16 |
| heat_block_bench               | zone     |         0 |        0 |         1 |        1 |          2 |
| heat_block_bench_row_slot      | row+slot |         0 |        0 |         1 |        1 |          2 |
| hood_basic                     | zone     |         4 |        4 |         2 |        2 |          4 |
| hood_basic_row_slot            | row+slot |         0 |        0 |         1 |        1 |          2 |
| sample_prep_bench              | zone     |         6 |        6 |         4 |        4 |          5 |
| sample_prep_bench_row_slot     | row+slot |         3 |        3 |         4 |        4 |          5 |
| staining_bench                 | zone     |        31 |       31 |        20 |       20 |         10 |
| staining_bench_row_slot        | row+slot |        16 |       16 |        14 |       14 |         10 |

## Section 5: Unresolved Labels (Sample)

The solver identifies all 76 unresolved labels in detail. Three examples from highest-collision scenes:

### electrophoresis_bench (16 unresolved, all labels in the scene)

All 16 labels remain unresolvable because the scene has massive C1 (object-object) overlap (60 failures) caused by placement overlaps. Labels inherit the position overlaps from their parent objects. Moving labels in Y alone does not address the underlying object geometry conflict.

### staining_bench (10 unresolved)

All 10 labels remain unresolvable; similar root cause to electrophoresis_bench - heavy object overlap (20 C1 failures).

### bench_basic (2 unresolved)

- Label: `waste_containe` at (x=-118.19, y=227.21), collides with `vortex` label
- Label: `vortex` at (x=588.91, y=227.21), collides with `waste_containe` label
  Both labels are at the same Y position. Moving waste_containe up by ±30px still leaves it overlapping with vortex (which doesn't move). The labels are far apart in X but occupy the same Y band.

## Section 6: Recommended Next Plan

**DO NOT implement solver in production.** The experiment reveals a fundamental mismatch: the solver hypothesis assumed label positioning is independent of object layout, but label collisions are primarily a symptom of underlying object placement overlap (C1 failures). Applying local label offsets cannot cure a global layout problem.

**Recommended pivot: Address the root cause via object placement (C1) fixes.**

Three options in priority order:

1. **Layout engine enhancement (high impact, high effort)**: Redesign the layout engine to avoid object-object overlap by applying better spacing heuristics or force-directed positioning. This solves C1 failures, which will reduce label collisions as a side effect. Plan scope: measure object spacing budgets, implement repulsion logic, add object-size awareness to zone calculation.

2. **Scene model simplification (medium impact, low effort)**: For scenes with >10 objects (electrophoresis_bench, staining_bench), evaluate whether all objects are genuinely required or if subgroups can be consolidated. Reducing object count reduces layout pressure and collision likelihood.

3. **Viewport expansion (quick win, low impact)**: Increase scene viewport from 900×700 to 1024×800 or add row-height tuning for row+slot scenes. C5 row-width violations suggest content density is near the limit.

**Next immediate task**: Audit C1 object overlap patterns to identify whether they stem from:

- Bad zone bounds definition (zones too small)
- Cumulative object size bloat (each object too large)
- Layout engine inability to distribute objects without overlap (algorithm gap)

Once root cause is known, implement the corresponding fix. Do not attempt further label-position post-processing.
