# TypeScript Dependency Graph: src/**/*.ts

Generated: 2026-05-27
Status: ANALYSIS_COMPLETE

## Executive Summary

- Total TS files: 25
- Dead exports: 0 (no true dead code found)
- Runtime-adjacent identifiers: 8
- Entry point: src/main.ts
- All 25 modules reachable from main.ts

---

## File Inventory

### By Directory

src/ (root): 1 file
src/scene_runtime/layout/: 18 files
src/scene_runtime/renderer/: 7 files

---

## Per-File Export Summary

### Layout Module

| File | Public Exports | Category |
|------|--------|----------|
| constants.ts | 39+ constants | Pure data |
| types.ts | 30+ types | Type definitions |
| run_pipeline.ts | runPipeline | RUNTIME-ADJACENT |
| bind_objects.ts | bindObjects | Stage 4 |
| normalize_schema.ts | normalizeSchema | Stage 2 |
| resolve_inheritance.ts | resolveInheritance | Stage 3 |
| scale_to_real_world.ts | scaleToRealWorld | Stage 5 |
| group_by_zone.ts | groupByZone | Stage 6 |
| horizontal_layout.ts | horizontalLayout | Stage 7 |
| vertical_layout.ts | verticalLayout | Stage 8 |
| layout_labels.ts | layoutLabels | Stage 9 |
| clamp_scene_bounds.ts | clampSceneBounds | Stage 10 |
| footprint.ts | 4 functions | Utilities |
| workspace_row_library.ts | WORKSPACE_ROW_LIBRARY | RUNTIME-ADJACENT |
| wrap_label.ts | wrapLabel | Helper |
| demo_library.ts | 2 constants | Fixtures |
| index.ts | All above | Public surface |

### Renderer Module

| File | Public Exports | Category |
|------|--------|----------|
| render_scene.ts | renderScene | RUNTIME-ADJACENT |
| render_item.ts | renderItem | RUNTIME-ADJACENT |
| render_label.ts | renderLabel | RUNTIME-ADJACENT |
| render_background.ts | renderBackground | RUNTIME-ADJACENT |
| structural_guards.ts | runStructuralGuards | RUNTIME-ADJACENT |
| inject_svg.ts | injectSvgInto | Helper |
| index.ts | All above | Public surface |

---

## Import-Edge Summary

Dependency counts:
- run_pipeline.ts: 10 dependencies (orchestrator)
- normalize_schema.ts: 3 dependencies
- structural_guards.ts: 4 dependencies
- horizontal_layout.ts: 3 dependencies
- vertical_layout.ts: 3 dependencies
- layout_labels.ts: 3 dependencies
- Other stage functions: 1-2 dependencies
- constants.ts: 0 internal dependencies
- types.ts: 1 dependency (constants)

Verified: No circular dependencies. Clean DAG structure.

---

## Dead-Export Analysis

Result: 0 dead exports

Details:
1. resolveLayout - internal helper (bind_objects.ts)
2. isSceneB - internal helper (normalize_schema.ts)
3. mergeLayoutRules - internal helper (normalize_schema.ts)
4. placementName - internal helper (resolve_inheritance.ts)
5. placeBucket - internal helper (horizontal_layout.ts)
6. 14 internal guards in structural_guards.ts

All are intentional module-local helpers. No exported symbols are dead.

---

## Runtime-Adjacent Identifier Highlights

8 critical identifiers with runtime/protocol/step/interaction keywords:

1. runPipeline (run_pipeline.ts:42)
   - Layout computation entry point
   - 10 stages with convergence loop

2. renderScene (render_scene.ts:25)
   - Scene display orchestrator
   - Validates before rendering

3. runStructuralGuards (structural_guards.ts:367)
   - Pre-render validation (8 guards)

4. renderItem (render_item.ts:22)
   - Per-item SVG rendering

5. renderLabel (render_label.ts:19)
   - Label positioning at scene-percent

6. renderBackground (render_background.ts:16)
   - Background gradient rendering

7. WORKSPACE_ROW_LIBRARY (workspace_row_library.ts:8)
   - Static protocol data per workspace
   - Closed library (6 workspaces)

8. PassRecord (types.ts:267)
   - Per-pass diagnostic interface

---

## Entry-Point Reachability Analysis

Main Entry: src/main.ts

Direct imports:
- scene_runtime/layout/index.ts
- scene_runtime/renderer/index.ts

Total reachable: 25/25 modules (100%)
Unreachable: None

---

## Dependency Layers

Layer 0: constants.ts
Layer 1: types.ts
Layer 2: Stage functions + utilities
Layer 3: run_pipeline, workspace_row_library, wrap_label
Layer 4: index.ts re-export surfaces
Layer 5: render_*, structural_guards, inject_svg
Layer 6: main.ts (application)

---

## Code Quality Assessment

Strengths:
1. Strict module boundaries
2. Type safety (PipelineStages interface)
3. No circular dependencies
4. Clear 10-stage pipeline
5. Convergence pattern with shrink-factor retry
6. Test fixtures

Refactoring candidates:
- resolveLayout, isSceneB could move to _internal.ts
- structural_guards.ts could split into per-guard modules (optional)

---

## Summary Statistics

- Total files: 25
- Layout modules: 18
- Renderer modules: 7
- Dead exports: 0
- Internal helpers: 5 (intentional)
- Circular dependencies: 0
- Runtime-adjacent identifiers: 8
- Max dependency depth: 6
- Convergence loop max passes: 3

---

## Status Label

COMPLETE. All 25 src files analyzed. Dependency graph mapped.
No dead code. All modules reachable from main.ts.
Runtime-adjacent identifiers highlighted.

ASCII-only document.
