// src/scene_runtime/renderer/subpart_dispatch.ts
//
// The PURE dispatch predicate for the structured-subpart material-tint renderer.
// It is the SINGLE place that decides whether an object
// def declares the per-subpart material-tint contract. Both the dispatcher
// (scene_item.tsx) and the renderer component (subpart_visual_state_renderer.tsx)
// import it, so the dispatch decision and the render decision can never disagree.
//
// This file has NO JSX and NO Solid: it is pure logic over an ObjectDef. Keeping
// it separate from the .tsx component lets a plain Node test import it without the
// Solid JSX transform, and it underlines the modularity claim: the predicate keys
// on the DECLARED contract, never on object identity, field name, or shape.

import type { ObjectDef, VisualStateDef } from "../layout/types.js";

// The result of inspecting an object def for the subpart material-tint contract.
// field_name is the DECLARED driving field (read from the visual_states key),
// never a literal. Returned only when every part of the contract is satisfied.
export interface SubpartTintContract {
  field_name: string;
}

// Find the declared material-tint subpart field on an object def, or null when
// the def does not declare the subpart material-tint contract.
//
// The contract (all required):
//   1. the def carries subpart_geometry AND view_box (typed generated geometry +
//      its coordinate frame), AND
//   2. some visual_states entry has applies_to === "subpart",
//      render_effect === "material_tint", and target === "subpart_geometry".
//
// The driving field name is that entry's KEY, returned verbatim. The function
// hardcodes no object name and no field name; it reads the field name out of the
// declaration. A second structured object (different name, different field name,
// rect geometry) dispatches identically with no code change.
export function find_material_tint_subpart_field(def: ObjectDef): SubpartTintContract | null {
  // Generated geometry + its coordinate frame are required: with no geometry
  // there is nothing to draw, and with no view_box the overlay has no frame.
  if (def.subpart_geometry === undefined || def.view_box === undefined) {
    return null;
  }
  const visual_states = def.visual_states;
  for (const field_name of Object.keys(visual_states)) {
    const vs: VisualStateDef | undefined = visual_states[field_name];
    if (vs === undefined) {
      continue;
    }
    // Key on the declared contract tokens, not on the field's name.
    if (
      vs.applies_to === "subpart" &&
      vs.render_effect === "material_tint" &&
      vs.target === "subpart_geometry"
    ) {
      return { field_name };
    }
  }
  return null;
}
