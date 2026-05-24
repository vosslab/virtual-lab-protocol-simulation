# Round 3 R11: widthScale Removal Report

**Status: DONE_WITH_CONCERNS**

**Date:** 2026-05-22

## Overview

Removed `widthScale` field from layout engine TypeScript type definitions, adapter, and engine implementation. The field was dead vocabulary-never read or written at runtime-confirmed by prior Audit V1.

## Sites Enumerated

**TypeScript (removed):**
- `src/scene_runtime/layout/types.ts:32` - `SceneItem.widthScale: number`
- `src/scene_runtime/layout/types.ts:49` - `AssetSpec.widthScale?: number`
- `src/scene_runtime/layout/adapter.ts:152` - Default assignment `widthScale: 1.0`
- `src/scene_runtime/layout/layout_engine.ts:261` - Read in footprint calc `fpItem.widthScale * depthScale`
- `src/scene_runtime/layout/layout_engine.ts:264` - Read in label spec `fpSpec.labelWidth * fpItem.widthScale`
- `src/scene_runtime/layout/layout_engine.ts:566` - Read in label estimate `spec.labelWidth * item.widthScale`
- `src/scene_runtime/layout/layout_engine.ts:575` - Read in unscaled visual `spec.defaultWidth * item.widthScale`

**YAML (outside scope, reported as concern):**
- `src/scenes/bench/bench.yaml` - Lines 19, 29, 38, 47, 56, 65, 75, 84, 93, 102
- `src/scenes/cell_culture_hood/cell_culture_hood.yaml` - Multiple item definitions

Note: These YAML files are legacy/example scene definitions in `src/scenes/` and are not referenced by runtime code (verified via grep). They do not affect the removal completion.

## Diffs Applied

### 1. types.ts - SceneItem type

**Before:**
```typescript
export type SceneItem = {
  id: string;
  svgAsset: string;
  kind: string;
  zone: string;
  depthTier: number;
  widthScale: number;  // <-- REMOVED
  label: string;
  // ...
};
```

**After:**
```typescript
export type SceneItem = {
  id: string;
  svgAsset: string;
  kind: string;
  zone: string;
  depthTier: number;
  label: string;
  // ...
};
```

### 2. types.ts - AssetSpec type

**Before:**
```typescript
export type AssetSpec = {
  defaultWidth: number;
  labelWidth: number;
  anchorYOffset?: number;
  widthScale?: number;  // <-- REMOVED
};
```

**After:**
```typescript
export type AssetSpec = {
  defaultWidth: number;
  labelWidth: number;
  anchorYOffset?: number;
};
```

### 3. adapter.ts - buildSceneItem()

**Before:**
```typescript
return {
  id: placement.placement_name,
  svgAsset: objectSpec.object_name,
  kind: objectSpec.kind,
  zone: placement.zone,
  depthTier: placement.depth_tier || 0,
  widthScale: 1.0,  // <-- REMOVED
  label: objectSpec.label,
  anchorY: anchorY,
};
```

**After:**
```typescript
return {
  id: placement.placement_name,
  svgAsset: objectSpec.object_name,
  kind: objectSpec.kind,
  zone: placement.zone,
  depthTier: placement.depth_tier || 0,
  label: objectSpec.label,
  anchorY: anchorY,
};
```

### 4. layout_engine.ts - layoutZoneItems() footprint calc

**Before:**
```typescript
const depthScale = depthScaleFor(fpItem.depth);
const visualW = fpSpec.defaultWidth * fpItem.widthScale * depthScale;
// estimate label width
const specLabelW = fpSpec.labelWidth * fpItem.widthScale;
```

**After:**
```typescript
const depthScale = depthScaleFor(fpItem.depth);
const visualW = fpSpec.defaultWidth * depthScale;
// estimate label width
const specLabelW = fpSpec.labelWidth;
```

### 5. layout_engine.ts - layoutLabels() label width estimate

**Before:**
```typescript
const charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
const specWidth = spec.labelWidth * item.widthScale;
const estWidth = Math.max(charWidth, specWidth);
```

**After:**
```typescript
const charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
const specWidth = spec.labelWidth;
const estWidth = Math.max(charWidth, specWidth);
```

### 6. layout_engine.ts - layoutLabels() unscaled visual calc

**Before:**
```typescript
const unscaledVisual = spec.defaultWidth * item.widthScale;
const effectiveScale =
  unscaledVisual > 0 ? lay.width / unscaledVisual : 1.0;
```

**After:**
```typescript
const unscaledVisual = spec.defaultWidth;
const effectiveScale =
  unscaledVisual > 0 ? lay.width / unscaledVisual : 1.0;
```

## Verification

### TypeScript Compilation

```
npx tsc --noEmit -p tsconfig.json
```
**Result:** OK PASS (no errors)

### Build

```
bash build_github_pages.sh
```
**Result:** OK PASS
Built `dist/main.js` (2.3mb), `dist/main.js.map` (3.0mb)
Completed in 11ms

### Post-Removal Grep

Confirmed no `widthScale` references remain in TypeScript code:
```
src/scene_runtime/layout/*.ts - CLEAN
src/scene_runtime/*.ts - CLEAN
```

## Concerns

**YAML legacy references (non-blocking):**
The YAML files `src/scenes/bench/bench.yaml` and `src/scenes/cell_culture_hood/cell_culture_hood.yaml` contain `widthScale` field definitions. These are legacy/example scene definitions that are **not loaded by runtime code** (verified via grep of `src/scene_runtime/`). They do not affect the removal completion and are outside the scope of the layout module refactor.

**Recommendation:** If these YAML files are intended for future migration or documentation, they can be updated in a separate task. The active runtime code is now clean.

## Summary

- **Removal:** Complete (all TypeScript reads/writes eliminated)
- **TypeScript check:** OK Pass
- **Build:** OK Pass
- **Scope boundary:** Respected (layout module only)
- **Status:** DONE_WITH_CONCERNS (YAML legacy data outside scope, non-blocking)
