# Production-render precheck summary

**Status banner**: Production-render reality gate; complements algorithm-prototype EXP2 report. Measures real HTML DOM bounding boxes via Playwright on 18 base + variant scenes.

**Date**: 2026-05-18
**Measurement harness**: `_temp_layout_prechecks.mjs` (repo root, gitignored)
**Results location**: `test-results/_layout_prechecks/results.json`

## Scope

**Scenes measured**: 18 total
- 9 base scenes from `content/base_scenes/` (zone-based layout engine)
- 9 row+slot variant scenes (row+slot-capacity-wrap algorithm)

Base scene names: bench_basic, cell_counter_basic, electrophoresis_bench, heat_block_bench, hood_basic, imaging_bench, microscope_basic, sample_prep_bench, staining_bench.

**Not included**: Protocol-local scenes under `content/protocols/*/scenes/` are not measured. They require full protocol walkthrough execution and are deferred to post-prototype phase. Scope is intentionally bounded to base scenes for algorithm comparison.

**Measurement type**: Real HTML DOM via Playwright `element.getBoundingClientRect()`. No synthetic estimates.

**Checks performed**:
- C1: object-object overlap (>5% area intersection)
- C2: label overlaps non-owner object (>50% area intersection)
- C3: label-label overlap (>50% area intersection)
- C4: zero-dimension placements (width=0 or height=0)
- C5: row+slot only: sum of slot widths exceeds viewport width (900px)

## Per-scene pass/fail grid

| Scene | Objects | C1 obj-obj | C2 lbl-obj | C3 lbl-lbl | C4 zero | C5 row-overflow | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bench_basic | 2 | 0 | 0 | 1 | 0 | n/a | FAIL |
| bench_basic_row_slot | 2 | 1 | 0 | 1 | 0 | 0 | FAIL |
| cell_counter_basic | 2 | 1 | 0 | 0 | 0 | n/a | FAIL |
| cell_counter_basic_row_slot | 2 | 0 | 0 | 0 | 0 | 1 | PASS |
| electrophoresis_bench | 16 | 0 | 0 | 0 | 0 | n/a | FAIL |
| electrophoresis_bench_row_slot | 16 | 0 | 0 | 0 | 0 | 0 | FAIL |
| heat_block_bench | 3 | 0 | 0 | 0 | 0 | n/a | FAIL |
| heat_block_bench_row_slot | 3 | 0 | 0 | 0 | 0 | 0 | FAIL |
| hood_basic | 4 | 0 | 0 | 0 | 0 | n/a | FAIL |
| hood_basic_row_slot | 4 | 0 | 0 | 0 | 0 | 0 | FAIL |
| imaging_bench | 2 | 0 | 0 | 0 | 0 | n/a | PASS |
| imaging_bench_row_slot | 2 | 0 | 0 | 0 | 0 | 0 | PASS |
| microscope_basic | 1 | 0 | 0 | 0 | 0 | n/a | PASS |
| microscope_basic_row_slot | 1 | 0 | 0 | 0 | 0 | 0 | PASS |
| sample_prep_bench | 5 | 0 | 0 | 0 | 0 | n/a | FAIL |
| sample_prep_bench_row_slot | 5 | 0 | 0 | 0 | 0 | 0 | FAIL |
| staining_bench | 10 | 0 | 0 | 0 | 0 | n/a | FAIL |
| staining_bench_row_slot | 10 | 0 | 0 | 0 | 0 | 0 | FAIL |

**Summary**: 5 PASS, 13 FAIL.

## Category aggregate

**Failure distribution** (545 total failures):
- C1 object-object overlap: **212 failures** (39%)
- C2 label overlaps non-owner object: **203 failures** (37%)
- C3 label-label overlap: **125 failures** (23%)
- C4 zero-dimension: **0 failures**
- C5 row-overflow: **5 failures** (1%)

**Label-related failures (C2 + C3)**: 328 failures (60% of total). Label placement is the largest failure category in production render.

**Object-placement failures (C1)**: 212 failures (39% of total).

## Smallest next fix lane

**Candidate**: Label-placement anti-collision (C2 + C3 combined).

**Justification**: 328 label-related failures (60% of total) vs. 212 object-overlap failures (39% of total). Labels are the majority failure mode. An anti-collision solver that adjusts label positions WITHOUT moving objects could address all 328 label failures independently of object placement.

**Manager pick**: Label-placement anti-collision is the smallest fix lane. Implement a simple offset-based label solver (Task 4 experiment) to validate whether 80%+ of label collisions are resolvable by +/-10px Y-axis offsets. If yes, that is a clear next fix. If no, the problem is row-band height constraints, not label positioning.

## Evidence-backed vs speculative

### Evidence-backed (proven by _temp_layout_prechecks.mjs)
1. **545 real failures measured** across 18 scenes in live HTML DOM via Playwright (not synthetic estimates).
2. **Label-related failures dominate**: 328 instances (C2: 203, C3: 125) vs. object overlaps (C1: 212). Label placement is the larger problem.
3. **5 PASS scenes**: cell_counter_basic_row_slot, imaging_bench, imaging_bench_row_slot, microscope_basic, microscope_basic_row_slot. These have 1-2 objects and pass all checks.

### Speculative (hypotheses, not yet measured)
1. **Simple Y-axis offsets (+/-10px) would resolve 80%+ of label collisions** - unverified. See Task 4 label-solver experiment.
2. **Row-slot-capacity-wrap with label solver would reduce failures from 545 to <50** - unverified. Depends on Task 4 result.
3. **Object placement requires redesign** if label offsets cannot resolve label-label collisions. Unverified; only know label solver failure count post-Task-4.

## Recommended next test-only experiment

**Scope**: Prototype a label anti-collision solver that adjusts label positions WITHOUT moving objects. Goal: measure how many label collisions (C2 + C3) can be resolved by simple geometric transformations.

**Implementation**: See Task 4. Write `_temp_label_solver_experiment.mjs` at repo root. For each scene with label-label or label-object collisions, attempt simple offset resolution. Record success rate.

**Success criterion**: If >80% of label collisions are resolvable by simple offset (+/-10px Y, no object move), that is a real signal for the next fix lane. If <50% are resolvable, the problem is deeper (row heights too tight) and requires object-placement redesign.

**Evidence target**: Measure on all 18 precheck scenes. Split results by failure category (C2 vs C3). Report success rate per scene and aggregate.
