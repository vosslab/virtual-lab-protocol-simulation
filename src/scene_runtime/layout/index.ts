/**
 * src/scene_runtime/layout/index.ts
 *
 * Public API for the layout module.
 * Exports the layout engine (mined), adapter (RuntimeWorld bridge), and types.
 */

// Public API: adapter that bridges RuntimeWorld to layout engine.
export { computeSceneLayout } from './adapter';

// Mined layout engine (internal; exported for testing/documentation).
export { computeSceneLayout as computeSceneLayoutLegacy, computeRowSlotSceneLayout, preCacheAspectRatios } from './layout_engine';

// Types
export type { SceneItem, SceneLayoutRules, ZoneDef, ComputedItemLayout, AssetSpec, SceneBounds, SceneItemGroup, RowSlotSceneInput, Row, Slot } from './types';
