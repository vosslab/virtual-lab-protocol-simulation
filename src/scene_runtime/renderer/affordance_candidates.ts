// src/scene_runtime/renderer/affordance_candidates.ts
//
// Renderer-layer enumeration of the resolver-accepted candidate object names
// for a rendered scene. This belongs in the renderer layer because it depends
// on PipelineResult (the layout/render artifact); the protocol layer must not
// import layout types (PRIMARY_DESIGN.md layer boundary: protocol = intent,
// renderer/layout = placement).

import type { PipelineResult } from "../layout/types.js";

//============================================
// Candidate enumeration (single source of truth with the click resolver)
//============================================

// Enumerate the resolver-accepted top-level candidate object names for a
// rendered scene.
//
// Source of truth: the click resolver (click_resolver.ts) resolves a click by
// walking up via closest("[data-item-id]") and accepting the matched element's
// data-item-id value. The renderer (scene_item.tsx) stamps
// data-item-id={item.object_name} on EVERY rendered item, and the rendered item
// list is exactly PipelineResult.final (scene_view.tsx renders one SceneItem per
// result.final entry). So the set of resolver-accepted top-level object targets
// is precisely { item.object_name for item in result.final }. This helper reads
// that same PipelineResult.final, so the candidate set cannot drift from what
// the resolver would accept; it is not a parallel approximation.
//
// Subpart targets (names containing ".", e.g. "well_plate_96.A1") are excluded.
// Top-level result.final object names do not contain "."; the guard documents
// and enforces the top-level-only contract. Capability-gated clickability
// (filtering decor that carries data-item-id but should not be clickable) is a
// tracked follow-up, not this pass: this matches the current resolver, which
// accepts every data-item-id.
//
// Computed once per scene mount and passed by reference into the scene items;
// per-item memos only call .has(item_target) (O(1)) and never rebuild the set.
export function enumerate_candidate_targets(result: PipelineResult): ReadonlySet<string> {
  const candidates = new Set<string>();
  for (const item of result.final) {
    const object_name = item.object_name;
    // Exclude subpart targets; only top-level objects are resolver-accepted here.
    if (object_name.includes(".")) {
      continue;
    }
    candidates.add(object_name);
  }
  return candidates;
}
