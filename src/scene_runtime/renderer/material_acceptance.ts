// material_acceptance.ts
//
// The single predicate for whether a written material_name / held_material_name
// value is ACCEPTABLE at runtime. This is the D1 validation predicate from
// docs/specs/MATERIAL_YAML_FORMAT.md, mirrored faithfully from the Python
// stepper (validation/stepper/state.py:mutate_state_field) so the TS runtime
// store and the Python stepper accept and reject the same material names:
//
//   valid(m, registry) == m in {empty, mixed}        # closed built-in allowlist
//                         OR m in registry            # active protocol's materials.yaml
//
// Acceptance is a SEPARATE concern from color resolution (resolve_color_result):
// this predicate decides what may be stored as a well's material identity, the
// color resolver decides what color (if any) that identity renders. Both read the
// SAME narrow built-in constants (NON_RENDERING_MATERIAL_SENTINELS +
// BUILTIN_VISIBLE_MATERIAL_NAMES from material_color.ts), so there is no second
// sentinel set and the two halves cannot drift from each other or from Python.
//
// Why registry-backed, not the declared enum: the shared well_plate_96 object
// declares only the closed sentinel allowlist [empty, mixed] as the SYNTACTIC
// floor (see content/objects/plate/well_plate_96.yaml). The curriculum owns the
// drug/assay material names in each protocol's materials.yaml. A closed object
// enum would force every new lesson to edit the shared plate object; the
// registry-backed predicate keeps treatments where they belong and needs no edit
// to the universal vessel per lesson.

import type { MaterialRegistry } from "./visual_state_resolver.js";
import {
  NON_RENDERING_MATERIAL_SENTINELS,
  BUILTIN_VISIBLE_MATERIAL_NAMES,
} from "./material_color.js";

//============================================
// Acceptance predicate (D1)
//============================================

// Return true when `value` is an acceptable material_name / held_material_name
// for a write, against the active protocol's material registry.
//
// value:    the material name being written.
// registry: the active protocol's materials.yaml registry, or null when there is
//           no protocol material context (a diagnostic scene-viewer render). A
//           null registry has no registered names, so only the two built-ins are
//           acceptable; this matches the Python stepper, where an empty registry
//           accepts only sentinels.
export function is_accepted_material_name(
  value: string,
  registry: MaterialRegistry | null,
): boolean {
  // The closed built-in allowlist: `empty` (non-rendering sentinel) and `mixed`
  // (the one built-in visible material). Both are accepted without registration.
  if (NON_RENDERING_MATERIAL_SENTINELS.has(value)) {
    return true;
  }
  if (BUILTIN_VISIBLE_MATERIAL_NAMES.has(value)) {
    return true;
  }
  // Every other name must be registered in the active protocol's registry. A
  // null registry (no protocol material context) registers nothing, so a
  // non-built-in name is rejected.
  if (registry === null) {
    return false;
  }
  return value in registry;
}
