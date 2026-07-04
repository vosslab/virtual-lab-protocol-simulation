// src/scene_runtime/layout/precomputed_result.ts
//
// Production layout path: the shipped browser bundle no longer
// runs the runtime layout engine (runPipeline). Instead every shipped scene
// render consumes the build-time precomputed layout from
// generated/precomputed_layout.ts (PRECOMPUTED_LAYOUT[scene_name]).
//
// This module is the single production seam that turns a precomputed
// ComputedItem[] plus the live scene definition into a full PipelineResult the
// renderer (mountScene/renderScene/SceneView) can consume. It intentionally
// does NOT import the layout engine barrel (./index.js) or run_pipeline.js, so
// the production module graph holds no runPipeline call path. The engine stays
// on disk and is still used at BUILD time by pipeline/precompute_layout.mjs and
// by tests; it is simply absent from the shipped render path.
//
// buildDecisionMetadata is imported directly from its diagnostics module rather
// than from the layout barrel, so pulling this helper in does not drag the
// engine entry point into the production bundle.

import { OBJECT_LIBRARY, ASSET_SPECS } from "../../../generated/object_library.js";
import { PRECOMPUTED_LAYOUT } from "../../../generated/precomputed_layout.js";
import { buildDecisionMetadata } from "./diagnostics/decision_metadata.js";
import type { UnifiedDiagnostic } from "./diagnostics/unified.js";
import type { ComputedItem, PipelineResult, SceneA } from "./types.js";

//============================================
// Precomputed PipelineResult assembly
//============================================

// Assemble a PipelineResult from a precomputed ComputedItem[] plus the live
// scene definition. The renderer reads only `final` (the laid-out items) and
// `scene` (background, scene_name, layout_rules.label_font_size, and the
// structural-guard input); every other PipelineResult field is layout-engine
// internal and unused at render time, so it is filled with an explicit empty
// value rather than recomputed. This keeps the production path free of any
// runPipeline call while satisfying the full PipelineResult type with no cast.
export function makePrecomputedResult(
  scene: SceneA,
  final: ComputedItem[],
  unifiedDiagnostics: UnifiedDiagnostic[],
): PipelineResult {
  const result: PipelineResult = {
    scene,
    sourceScene: scene,
    diagnostics: [],
    passes: [],
    identityDiagCount: 0,
    stages: {
      inputs: { scene, library: OBJECT_LIBRARY, assets: ASSET_SPECS },
      normalized: { scene: null, source: "none", trace: [] },
      inheritance: { placements: [], provenance: [], operations: [] },
      bound: [],
      scaled: [],
      grouped: { groups: new Map(), orphans: [] },
      horizontal: new Map(),
      vertical: new Map(),
      labelled: new Map(),
      clamped: new Map(),
    },
    final,
    decisionMetadata: buildDecisionMetadata(scene.scene_name, []),
    severityDiagnostics: [],
    // The renderer reads only `final` and `scene`; the off-canvas report is a
    // build-time validate-phase artifact, unused at render time, so the
    // production path fills an explicit empty list.
    offCanvasDiagnostics: [],
    // The unified diagnostics stream is a build-time report artifact, unused at
    // render time. It is rehydrated from the precomputed artifact (serialized by
    // pipeline/precompute_layout.mjs) so report tooling reading a resolved
    // PipelineResult sees the same findings the build-time engine produced.
    unifiedDiagnostics,
    // The renderer reads only `final` and `scene`; the computed zone bands are a
    // build-time layout-engine artifact consumed at precompute time, unused at
    // render time, so the production path fills an explicit empty map.
    zoneBands: new Map(),
    // The reflow overflow report is a build-time layout-engine artifact consumed
    // at precompute time, unused at render time. The production path fills coherent
    // empty defaults: no overflow, zero content, scene_bounds range.
    reflowOverflow: false,
    reflowTotalContent: 0,
    reflowSceneRangeTop: scene.scene_bounds.top,
    reflowSceneRangeBottom: scene.scene_bounds.bottom,
    // The terminal-rescale outputs are build-time layout-engine artifacts, unused
    // at render time (the renderer reads only `final`). The production path fills
    // coherent empty defaults: no rescale (scale 1), no scene overflow, no label
    // dominance.
    reflowUniformScale: 1,
    sceneReflowOverflow: false,
    labelDominant: false,
  };
  return result;
}

// Resolve the production PipelineResult for a scene by name. Looks up the
// build-time precomputed layout and assembles a renderer-ready PipelineResult.
// A missing entry throws loudly rather than silently falling back to the
// runtime engine (single production path = precomputed; no runtime fallback
// ships to users). Callers pass the live scene definition (from SCENES) so the
// renderer reads current background/layout_rules without re-deriving layout.
export function resolvePrecomputedResult(scene_name: string, scene: SceneA): PipelineResult {
  const precomputed = PRECOMPUTED_LAYOUT[scene_name];
  if (!precomputed) {
    throw new Error(
      `precomputed_result: scene "${scene_name}" missing from PRECOMPUTED_LAYOUT; ` +
        "rebuild generated/precomputed_layout.ts (pipeline/precompute_layout.mjs)",
    );
  }
  const result = makePrecomputedResult(scene, precomputed.final, precomputed.unifiedDiagnostics);
  return result;
}
