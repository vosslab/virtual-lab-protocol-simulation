# M2b Lane B1: Renderer Shell

## Scope
Built the scene rendering engine that converts `PipelineResult` into DOM, meeting all core invariants from PRIMARY_CONTRACT.md and PRIMARY_DESIGN.md.

**Files created (7):**
- `src/scene_runtime/renderer/inject_svg.ts` (26 lines)
- `src/scene_runtime/renderer/render_background.ts` (29 lines)
- `src/scene_runtime/renderer/render_item.ts` (55 lines)
- `src/scene_runtime/renderer/render_scene.ts` (48 lines)
- `src/scene_runtime/renderer/index.ts` (7 lines)
- `src/main.ts` (30 lines)
- `src/index.html` (13 lines)

**Generated fixture (updated):**
- `generated/scenes.ts` (105 lines)

## Per-file behavior

### inject_svg.ts
Reads from SVG_REGISTRY by asset name. Throws on missing asset. THE ONLY function using innerHTML. No fallback SVG, no placeholder.

### render_background.ts
Switches on background.type. M2b supports gradient only. Sets linear-gradient CSS. Throws on unknown type.

### render_item.ts
Creates positioned div for each ComputedItem. Emits six DOM attributes (placement_name, object_name, zone, kind, depth, target_id). Sets z-index from depth (back:1, mid:2, front:3). Calls injectSvgInto for SVG. Uses percent units (%).

### render_scene.ts
Top-level entry. Clears root. Calls runStructuralGuards (B2's validation). Renders background. Iterates final items in pipeline order, appending item + label to root. No scene-specific branching.

### index.ts
Barrel export. Exports renderScene, renderItem, renderBackground, renderLabel (re-export from B4). Does NOT re-export injectSvgInto (internal).

### main.ts
Hardcoded bench_basic. Loads scene from SCENES. Runs runPipeline with OBJECT_LIBRARY and ASSET_SPECS. Calls renderScene. Throws on missing root or scene.

### index.html
Minimal HTML. `<div id="scene-root"></div>`. Links style.css. Module script loads main.js.

## Verification

**TypeScript**: clean (npx tsc --noEmit -p tsconfig.json OK)

**ESLint**: clean on B1 files only (structural_guards lint issue is B2's responsibility)

**Prettier**: formatted OK

**innerHTML check**: Only inject_svg.ts + render_scene's root.removeChild loop
```
(only inject_svg.ts should use innerHTML)
```

**overflow:hidden check**: None present OK

**Scene branching check** (if scene === "..."): None present OK

**Build**: Successful
```
Built dist/ (GitHub Pages-ready).
dist/main.js      1.9mb
dist/index.html   343 bytes
dist/style.css    1.1K
dist/main.js.map  2.3mb
```

## Core Invariants Honored

1. **No clipping, no cropping**: Renderer passes through pipeline bounds. CSS uses object-fit: contain (B3 owns style.css).

2. **No fallback SVG**: injectSvgInto throws loud Error if asset missing.

3. **No scene-specific branching**: renderScene takes (root, PipelineResult). No if scene === checks anywhere.

4. **No mining old engine code**: All code is fresh, compact, single-purpose.

5. **No public-renderer pattern matching**: Renderer is deterministic function dispatch, not template-driven.

6. **No static template HTML reuse**: index.html is minimal and new.

7. **Renderer never special-cases a scene**: renderScene is generic over PipelineResult.

8. **Semantic inheritance**: ComputedItem type chain (ComputedItem -> ScaledPlacement -> BoundPlacement -> PlacementAuthored) carries all required fields. Renderer reads what it needs, no reconstruction.

## Boundaries

- Owns: render_* files, inject_svg.ts, index.ts, main.ts, index.html. Created placeholder structural_guards.ts (B2 updated it in parallel).
- B2 owns structural_guards.ts (implementation + lint cleanup).
- B3 owns style.css (no-crop CSS policy).
- B4 owns render_label.ts (label rendering).
- M2a owns layout/run_pipeline.ts (pipeline engine).

## Integration Boundary (B2 Parallel)

B2 has updated structural_guards.ts with full implementation including imports and type checks. Minor import path fix applied (../../generated not ../../../generated from renderer/). One lint warning in B2's code (no-unnecessary-type-assertion on line 18) - B2 should address in their cleanup pass.

Coordinate: runStructuralGuards signature is stable. B1 calls it before any DOM paint. B2's throws will propagate and prevent render.

## Residual Risks

**None identified**. The renderer is deterministic, generic, and unblocked. Pipeline and scene codegen are separate lanes (M2a owns pipeline, C1 owns precheck).

## Next Steps

Lane B1 is **complete**. Handoff to:
- C1: Run bench_basic through two-stage precheck (validate generated data).
- C2: Playwright screenshot walkthrough (visual evidence).
- B5: Renderer style integration audit (CSS no-crop compliance).
