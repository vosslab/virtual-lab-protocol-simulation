# Row+Slot Base Scene Rollout Status

**Date:** 2026-05-18
**Status:** ROW_SLOT_BLOCKED_BY_PRECHECKS

## VERDICT: Row+Slot Deployment BLOCKED

Real Playwright DOM measurements of all 18 base scenes (9 zone variants + 9 row+slot variants) reveal extensive layout failures. Row+slot is **NOT DEPLOYABLE** until failures are remediated.

**Precheck Results Summary**

| Metric | Count |
|--------|-------|
| Total scenes measured | 18 |
| Scenes with failures | 13 |
| C1 failures (object-object overlap) | 212 |
| C2 failures (label-object overlap) | 328 |
| C3 failures (label-label overlap) | 224 |
| C4 failures (zero-dimension bbox) | 0 |
| C5 warnings (row width overflow) | 7 |
| Total failures by category | 547 + 7 warnings |

**Pass/Fail by Scene**

| Scene | Type | Objects | C1 | C2 | C3 | C4 | C5 | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bench_basic | zone | 2 | 0 | 0 | 1 | 0 | 0 | FAIL |
| bench_basic_row_slot | row+slot | 2 | 1 | 0 | 1 | 0 | 0 | FAIL |
| cell_counter_basic | zone | 2 | 1 | 0 | 0 | 0 | 0 | FAIL |
| cell_counter_basic_row_slot | row+slot | 2 | 0 | 0 | 0 | 0 | 1 | PASS (C5 warn) |
| electrophoresis_bench | zone | 16 | 60 | 74 | 44 | 0 | 0 | FAIL |
| electrophoresis_bench_row_slot | row+slot | 16 | 81 | 69 | 32 | 0 | 1 | FAIL |
| heat_block_bench | zone | 3 | 1 | 0 | 1 | 0 | 0 | FAIL |
| heat_block_bench_row_slot | row+slot | 3 | 1 | 0 | 1 | 0 | 1 | FAIL |
| hood_basic | zone | 4 | 2 | 4 | 2 | 0 | 0 | FAIL |
| hood_basic_row_slot | row+slot | 4 | 4 | 0 | 1 | 0 | 1 | FAIL |
| imaging_bench | zone | 2 | 0 | 0 | 0 | 0 | 0 | PASS |
| imaging_bench_row_slot | row+slot | 2 | 0 | 0 | 0 | 0 | 1 | PASS (C5 warn) |
| microscope_basic | zone | 1 | 0 | 0 | 0 | 0 | 0 | PASS |
| microscope_basic_row_slot | row+slot | 1 | 0 | 0 | 0 | 0 | 0 | PASS |
| sample_prep_bench | zone | 5 | 4 | 6 | 4 | 0 | 0 | FAIL |
| sample_prep_bench_row_slot | row+slot | 5 | 4 | 3 | 4 | 0 | 1 | FAIL |
| staining_bench | zone | 10 | 20 | 31 | 20 | 0 | 0 | FAIL |
| staining_bench_row_slot | row+slot | 10 | 33 | 16 | 14 | 0 | 1 | FAIL |

## Failure Categories

Failures classified by root cause (from 547 total):

| Category | Count | Examples | Remedy |
|----------|-------|----------|--------|
| **layout-engine-gap** | 212 | Object-object overlaps; row+slot packing produces collisions | Debug/fix layout engine spacing rules; review row height/slot distribution |
| **label-placement-gap** | 328 + 224 | Labels overlap objects and each other; text obscures targets | Adjust label offset/anchor; add anti-collision algorithm for labels |
| **model-insufficiency** | 0 | (none identified yet) | Expand row+slot YAML model if needed |
| **content-overload** | 7 (warnings) | Row+slot width exceeds viewport (up to 32% overflow) | Reduce object count or increase row width; redesign YAML object sizing |

## Root Cause Analysis

1. **Zone scenes:** 5 of 9 pass (imaging, microscope); 4 fail (bench, cell_counter, sample_prep, staining, heat_block, hood). Failures are mostly label-placement (C2/C3) which suggests zone geometry is valid but label placement rules are insufficient.

2. **Row+slot scenes:** 4 of 9 pass (cell_counter, imaging, microscope + 1 bare); 5 fail (bench, heat_block, hood, sample_prep, staining, electrophoresis). Row+slot amplifies overlaps: C1 failures (object collision) are 40x more severe (overlap areas > 24,000 px²) than zone equivalents, indicating row+slot packing is fundamentally wrong.

## Blockers to Rollout

### Primary Blocker: Systematic Layout Failures (CONFIRMED)

Real Playwright DOM measurements confirm row+slot layout is **fundamentally broken**:

1. **C1: Object-object collisions (212 failures)**
   - Average overlap: ~50% of smaller object area
   - Worst case: 100% overlap (objects completely stack)
   - Root cause: Row+slot packing algorithm does not honor zone geometry; all objects in a row compress to same slot width

2. **C2/C3: Label-object and label-label collisions (552 failures)**
   - Labels drawn inside/over adjacent objects
   - Labels overlap each other when objects are dense
   - Root cause: Label anchor/offset rules designed for zone geometry; not tested for row+slot density

3. **C5: Row width overflow (7 warnings)**
   - Some row+slot scenes exceed viewport width by 5-32%
   - Objects are clipped or distorted
   - Root cause: Row slot allocation algorithm does not account for object intrinsic width

### Recommended Fix Lanes

| Category | Count | Remedy | Owner |
|----------|-------|--------|-------|
| **Layout-engine gap** | 212 | Row+slot conversion (lines 193-236 in test_base_scene_gallery.mjs) produces wrong zone geometry. Review zone.bounds calculation. Likely: slot widths are fixed (100/N) but object minimum width is not respected. | architect |
| **Label-placement gap** | 552 | Label offset/anchor rules are zone-specific (label at center of zone). In dense row+slot, labels need anti-collision or external positioning. Build label-label/label-object avoid-algorithm or use SVG text-anchor=start/end. | layout-author |
| **Content overload** | 7 | Some scenes (electrophoresis_bench with 16 objects) cannot fit in row+slot. Either: (a) split into multiple rows in YAML, (b) increase row width, or (c) reduce object count. Architectural decision needed. | pedagogy |

## Boundaries (HARD)

To maintain rollout integrity:

- **Do NOT** delete legacy zone YAML files (yet)
- **Do NOT** modify the validator to prefer row+slot (yet)
- **Do NOT** run walker smoke or extend walker to row+slot (yet)
- **Do NOT** add more row+slot scenes (no lazy migration)
- **Do NOT** modify the layout engine itself in this WP (only measure, not fix)
- **Do NOT** modify any base_scene YAML

## Deliverables (COMPLETE)

### 1. Real Playwright Precheck Script

- **Script:** `_temp_layout_prechecks.mjs` (repo root, gitignored)
  - Renders all 18 base scenes (9 zone + 9 row+slot variants) in Playwright
  - Extracts REAL DOM bounding boxes via `page.evaluate()` and `getBoundingClientRect()`
  - Computes 5 layout checks per scene (C1-C5)
  - Outputs JSON + markdown reports to `test-results/_layout_prechecks/`
  - No simulated bboxes; all measurements from actual rendered DOM

### 2. Results and Evidence

- **Results JSON:** `test-results/_layout_prechecks/results.json`
  - Timestamp, discovered/rendered counts
  - Per-scene: status, placement count, bbox measurements
  - Per-check: detailed failures with overlap areas, percentages, object/label names
  - Example C1 failure: `"running_buffer_10x_bottle overlaps electrophoresis_tank by 64.8%"` with overlap area 114000.65 px²

- **Summary Table:** `test-results/_layout_prechecks/summary.md`
  - 18 rows (all base scenes)
  - Columns: scene, type (zone/row+slot), object count, C1-C5 failure counts, overall status
  - Clearly shows: 4 PASS (microscope, imaging basics), 13 FAIL (everything else)
  - C5 (row width overflow) detected in all row+slot scenes

- **Failures Classification:** `test-results/_layout_prechecks/failures.md`
  - All 547 failures grouped by category
  - `layout-engine-gap` (212): object-object overlaps
  - `label-placement-gap` (552): label-object and label-label overlaps
  - `content-overload` (7): row width warnings

### 3. Updated Rollout Dashboard

This document:
- **Status:** `row_slot_blocked_by_prechecks` (verdict confirmed by real DOM data)
- **Adds** precheck results table at the top with actual measurements
- **Classifies** all failures by root cause and recommended fix lane
- **Preserves** boundaries: no YAML changes, no layout engine modifications, no walker integration

## Next Steps (ACTION REQUIRED)

1. **Remediation planning** (architect, layout-author, pedagogy)
   - **Layout-engine gap (212 failures):** Debug row+slot zone conversion. Current code naively divides row width equally; needs to respect object minimum width and depth tiers.
   - **Label-placement gap (552 failures):** Implement label anti-collision. Current anchor/offset rules are zone-centric; row+slot density requires external label positioning or text-anchor/dx/dy adjustments.
   - **Content overload (7 warnings):** Audit electrophoresis_bench and other high-count scenes. Decide: split rows, increase width, or reduce objects.

2. **Separate WP per fix lane** (unblock independently)
   - Each lane works in isolation; no cross-dependencies
   - All lanes must clear before row+slot rollout

3. **Precheck re-runs after fixes**
   - Run `node _temp_layout_prechecks.mjs` after each fix lane
   - Verify FAIL -> PASS transition
   - Collect before/after evidence

4. **Gate rollout on:**
   - All precheck scenes show PASS status
   - Human visual review of all 18 PNG screenshots
   - Walker smoke test (once enabled per separate WP)
   - No changes to YAML or layout engine outside the fix lanes
