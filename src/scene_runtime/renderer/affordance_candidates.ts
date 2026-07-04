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

// Enumerate the resolver-accepted top-level candidate placement names for a
// rendered scene.
//
// Source of truth: the click resolver (click_resolver.ts) resolves a click by
// walking up via closest("[data-item-id]") and accepting the matched element's
// data-item-id value. The renderer (scene_item.tsx) stamps
// data-item-id={item.placement_name} ONLY when item.capabilities includes
// "clickable" (M6 capability gate + M8 target-identity: the DOM key is the
// unique per-placement placement_name, not the non-unique object_name), and the
// rendered item list is exactly PipelineResult.final (scene_view.tsx renders one
// SceneItem per result.final entry). So the set of resolver-accepted top-level
// targets is precisely
// { item.placement_name for item in result.final if item is clickable }. This
// helper reads that same PipelineResult.final and applies the identical
// capability gate, so the candidate set cannot drift from what the resolver
// would accept; it is not a parallel approximation. The set is placement_name
// keyed to match the affordance memo (item_target = placement_name) and the
// resolved active_interaction_target the select-highlight compares against.
//
// Subpart placements (names containing ".", e.g. "well_plate_96.A1") are
// excluded. Top-level result.final placement names do not contain "."; the guard
// documents and enforces the top-level-only contract.
//
// Computed once per scene mount and passed by reference into the scene items;
// per-item memos only call .has(item_target) (O(1)) and never rebuild the set.
export function enumerate_candidate_targets(result: PipelineResult): ReadonlySet<string> {
  const candidates = new Set<string>();
  for (const item of result.final) {
    const placement_name = item.placement_name;
    // Exclude subpart targets; only top-level placements are resolver-accepted.
    if (placement_name.includes(".")) {
      continue;
    }
    // Exclude non-clickable items (decoration_only, missing-object
    // placeholders bound with capabilities: []): the renderer stamps no
    // data-item-id for them, so the resolver could never accept a click on
    // them either.
    if (!item.capabilities.includes("clickable")) {
      continue;
    }
    candidates.add(placement_name);
  }
  return candidates;
}
