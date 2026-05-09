//============================================
// scene_layout.ts
// Layout pipeline wrapper.
// Re-exports computeSceneLayout from the core engine.
// Future capability patches will add layout-policy hooks here (deferred).
//============================================

export { computeSceneLayout } from "../../layout_engine";
export type { ComputedItemLayout, SceneLayoutRules } from "../../scene_types";
