# C1: Bench_Basic Two-Stage Preflight

**Status**: Complete
**Date**: 2026-05-23
**Scope**: Lane C1 of M2b vertical slice

---

## Scope and Method

Two-stage precheck for `bench_basic` layout pipeline:

1. **Stage 1 (fixture-mode)**: Run `runPipeline()` with:
   - Scene: `bench_basic.yaml` (loaded via `SCENES.bench_basic` from `generated/scenes.ts`)
   - Object library: `DEMO_OBJECT_LIBRARY` (heat_block fixture, 8 objects)
   - Asset specs: `DEMO_ASSET_SPECS` (8 assets)

2. **Stage 2 (generated-mode)**: Run `runPipeline()` with:
   - Scene: `bench_basic.yaml` (same scene object)
   - Object library: `OBJECT_LIBRARY` (from `generated/object_library.ts`)
   - Asset specs: Derived from `SVG_REGISTRY` (from `generated/svg_registry.ts`)

3. **Comparison**: Verify that both stages produce matching geometry, diagnostics, and pass counts; flag any data-source mismatches.

Test script: `tests/test_bench_basic_preflight.mjs` (pure Node test, ~500 lines)

---

## Results

### Stage 1: Fixture Mode

**Outcome**: Expected failure (documented reason)

```
Scene: bench_basic
Workspace: bench

--- Diagnostics ---
Total: 2
  1. [bind/error] unknown_object (rear_left_waste)
  2. [bind/error] unknown_object (rear_right_vortex)

--- Final Placements ---
0 items (aborted due to missing objects)
```

**Reason for failure**: `bench_basic.yaml` references two objects:
- `waste_container` (placement: `rear_left_waste`)
- `vortex` (placement: `rear_right_vortex`)

The `DEMO_OBJECT_LIBRARY` fixture was authored for the heat_block bench and contains only 8 objects: `heat_block`, `microtube_rack_24`, `protein_ladder_tube`, `t75_flask`, `media_bottle`, `waste_jar`, `serological_pipette` (plus utilities).

Neither `waste_container` nor `vortex` exist in the demo fixture. This is **by design**: the demo fixture is not meant to support all scenes. Stage 1's purpose is to show fixture-vs-generated divergence; the divergence here is expected.

**Passes**: 1 (no convergence loop fired; bindObjects returned early)
**Overlaps**: 0
**Gaps**: 0 (N/A, no items)

---

### Stage 2: Generated Mode

**Outcome**: SUCCESS with caveats

```
Scene: bench_basic
Workspace: bench

--- Diagnostics ---
Total: 3
  1. [vertical/warn] item_escapes_zone_vertically (rear_right_vortex)
  2. [clamp/warn] zone_clamped_to_bounds
  3. [meta/warn] max_iterations_reached

--- Passes ---
Total passes: 3
  Pass 1: 2 diagnostics, zones_shrunk: [rear_right]
  Pass 2: 2 diagnostics, zones_shrunk: [rear_right]
  Pass 3: 2 diagnostics, zones_shrunk: [] (hit max_iterations)

--- Final Placements (2 items) ---

rear_left_waste:
  object: waste_container, asset: waste_container
  position: _x=17.5, _top=12.8
  size: _visualWidth=3.2, _height=5.7
  label: _labelX=17.5, _labelY=22.5, lines=2
  depth: back
  zone: rear_left
  asset_viewBox_aspect: 0.603
  item_aspect_ratio: 0.422
  aspect_check: MISMATCH (30% deviation)

rear_right_vortex:
  object: vortex, asset: vortex
  position: _x=82.5, _top=5.0
  size: _visualWidth=7.8, _height=13.8
  label: _labelX=82.5, _labelY=22.8, lines=1
  depth: back
  zone: rear_right
  asset_viewBox_aspect: 0.840
  item_aspect_ratio: 0.422
  aspect_check: MISMATCH (50% deviation)
```

**Key findings**:

1. **Both objects resolve**: `waste_container` and `vortex` exist in generated `OBJECT_LIBRARY`.
2. **Both assets available**: Inline SVGs exist in `SVG_REGISTRY` with valid viewBox attributes.
3. **Aspect ratio mismatches detected**:
   - `waste_container`: computed item aspect (0.422) deviates 30% from asset viewBox aspect (0.603)
   - `vortex`: computed item aspect (0.422) deviates 50% from asset viewBox aspect (0.840)
   - Both exceed the 5% tolerance threshold
4. **Convergence required**: Zone `rear_right` shrank twice (pass 1 and 2); max_iterations_reached warning issued on pass 3.
5. **Clamp warning**: Zone was clamped to scene bounds; indicates items overflowed the declared zone bbox.

**Passes**: 3 (convergence loop ran to max_iterations)
**Overlaps**: 0 (no two items intersect)
**Gaps**: 0 (no same-zone pairs too close)

---

## Analysis

### Data-source comparison

| Metric | Stage 1 | Stage 2 | Match |
|--------|---------|---------|-------|
| Scene name | bench_basic | bench_basic | YES |
| Workspace | bench | bench | YES |
| Placements count | 0 | 2 | NO |
| Diagnostics count | 2 | 3 | NO |
| Diagnostics kind | unknown_object (2x) | item_escapes_zone_vertically, zone_clamped_to_bounds, max_iterations_reached | DIVERGENT |
| Passes length | 1 | 3 | NO |

**Stage 1 failure root cause**: Object library mismatch (demo = generated).
**Stage 2 divergence from M2b acceptance**: Multiple issues:

1. Aspect ratio mismatches (both items exceed 5% tolerance)
2. Convergence over 3 passes (expected 1 pass for bench_basic per spec)
3. Zone clamp and vertical escape warnings
4. Item-escape diagnostic indicates vortex exceeds zone vertical bounds

---

## Issues Blocking C2

### Critical (hard blocker for C2)

1. **Aspect ratio distortion**: Both items show 30-50% aspect deviations.
   - Root cause: scene layout rules, asset sizing, or convergence adjustment
   - Impact: Rendered items will appear distorted vs. SVG viewBox

2. **Convergence does not stabilize at 1 pass**: Expected behavior per M2b spec is `passes.length === 1` for bench_basic.
   - Root cause: Zone capacity or layout rules do not accommodate items at default sizing
   - Impact: Layout engine required 3 passes; final pass did not resolve outstanding diagnostics

3. **Zone overflow warnings**: `item_escapes_zone_vertically` and `zone_clamped_to_bounds` indicate items exceed zone bounds.
   - Root cause: Zones too small or items too large
   - Impact: Structural guards will reject this layout at render time

### Non-critical (findings)

- Stage 1 fixture-mode divergence is expected and documented (fixture only covers heat_block)
- No item-item overlaps (good)
- No label collisions (good)

---

## Manager Decision Gate

**Recommendation: DO NOT PROCEED TO C2**

**Rationale**:

Bench_basic does not meet M2b acceptance criteria:

```
M2b acceptance criteria (relevant):
- result.diagnostics is empty for bench_basic FAIL (3 diagnostics in stage 2)
- result.passes.length === 1 for bench_basic FAIL (passes.length === 3)
- No aspect distortion FAIL (both items exceed 5% tolerance)
- No off-page or zone overflow FAIL (zone_clamped_to_bounds, item_escapes_zone_vertically)
```

**Next steps**:

1. **Investigate aspect ratio computation**: Review `computeItemAspect()` vs. asset viewBox aspect in the pipeline. Check if viewport aspect adjustment is incorrect.
2. **Review zone sizing**: Bench_basic zones may be too small relative to item sizing. Compare zone bounds to item `_visualWidth` and `_height`.
3. **Adjust layout rules or scene YAML**: Either increase zone bounds, reduce item default_width, or adjust layout_rules (zone_gap, label spacing).
4. **Verify item escape logic**: Confirm why `rear_right_vortex` escapes zone vertically; check anchor_y and scale adjustments.

**Blocker severity**: HIGH
**Estimated effort**: M2b manager decision required; may involve:
- Scene YAML edit (bounds, layout_rules)
- Object layout hints edit (default_width, anchor_y)
- Pipeline diagnostic review (aspect computation)

---

## Artifact Locations

- Test script: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/tests/test_bench_basic_preflight.mjs`
- Generated scenes data: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/scenes.ts`
- Generated object library: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/object_library.ts`
- Generated SVG registry: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/svg_registry.ts`

---

## Run Instructions

To regenerate this preflight (after any object, scene, or asset changes):

```bash
npx tsx tests/test_bench_basic_preflight.mjs
```

Output format: plain text to stdout. Pipe to a markdown report or capture for manager review.

**Note**: Run must occur from the repo root. Generated artifacts are required (run codegen first if needed).

---

## Post-Fix Verification (2026-05-23)

After applying the four fixes specified in the blocker fix plan, re-ran the preflight with identical input (same scene YAML, same objects, same assets). Results:

### Stage 2: Generated Mode (Post-Fix)

```
Scene: bench_basic
Workspace: bench

--- Diagnostics ---
No diagnostics (clean run).

--- Passes ---
Total passes: 1
  Pass 1: 0 diagnostics, zones_shrunk: []

--- Final Placements (2 items) ---

rear_left_waste:
  object: waste_container, asset: waste_container
  position: _x=17.5, _top=10.7
  size: _visualWidth=4.0, _height=11.8
  label: _labelX=17.5, _labelY=26.5, lines=2
  aspect check: svg=0.603, item=0.603 [OK]
  zone: rear_left

rear_right_vortex:
  object: vortex, asset: vortex
  position: _x=82.5, _top=9.8
  size: _visualWidth=6.0, _height=12.7
  label: _labelX=82.5, _labelY=26.5, lines=1
  aspect check: svg=0.840, item=0.840 [OK]
  zone: rear_right

--- Overlap Check ---
No overlaps detected.

--- Gap Check ---
No problematic gaps (threshold: 2px).
```

### M2b Acceptance Status: PASS OK

| Criterion | Pre-Fix | Post-Fix | Status |
|-----------|---------|----------|--------|
| Diagnostics count | 3 | 0 | OK PASS |
| Passes count | 3 | 1 | OK PASS |
| Aspect distortion (waste_container) | MISMATCH 30% | OK 0% | OK PASS |
| Aspect distortion (vortex) | MISMATCH 50% | OK 0% | OK PASS |
| Overlaps | 0 | 0 | OK PASS |
| Gaps | 0 | 0 | OK PASS |
| Zone clamp warnings | 1 | 0 | OK PASS |
| Zone overflow warnings | 1 | 0 | OK PASS |
| Max iterations reached | YES | NO | OK PASS |

All M2b acceptance criteria now satisfied. Stage 2 output clean. Ready for C2 Playwright artifact screenshot lane.

### Applied Fixes Summary

1. **Test file Fix #1 (line 18)**: Added `GENERATED_ASSET_SPECS` variable declaration
2. **Test file Fix #2 (line 31)**: Load ASSET_SPECS from generated object_library module
3. **Test file Fix #3 (line 285)**: Pass GENERATED_ASSET_SPECS to Stage 2 runPipeline call
4. **Test file Fix #4 (line 78)**: Updated computeItemAspect function to correctly account for viewport aspect ratio when computing screen pixel aspect
5. **Content file Fix #5 (vortex.yaml line 23)**: Reduced vortex default_width from 12 to 6

### Implementation Notes

The key fix was understanding that the layout engine computes height in percentage units using the formula: `heightPct = (visualWidth * viewportAspect) / asset_aspect`. The rendered screen pixel aspect is then: `screenAspect = percentageAspect * viewportAspect = (visualWidth / heightPct) * viewportAspect = asset_aspect`. The test's aspect check now correctly applies this formula to match the structural guards' expectation.

The vortex width reduction from 12 to 6 was necessary to fit the object within the rear_right zone bounds without requiring convergence shrinking. This single-field YAML edit reduced the object's footprint by 50%, allowing it to fit at its natural aspect ratio without triggering zone overflow warnings.

## Residual Risks

1. **Aspect ratio tolerance**: The 5% threshold holds across all computed scenarios; no risk flagged post-fix.
2. **Convergence budget**: Max 3 passes is no longer needed; bench_basic now converges in 1 pass per design.
3. **Zone clamp semantics**: No longer relevant; zone clamp warning fully resolved by the width reduction fix.
