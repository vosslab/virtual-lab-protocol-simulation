// src/scene_runtime/state/subpart_group_expand.ts
//
// Group-write fan-out for ObjectStateChange. An authored bulk write such as
// ObjectStateChange target "well_plate_96.all_wells" names a declared
// subpart_group, which is a bulk state write with no discrimination pedagogy to
// preserve. It must reach EVERY member well's material overlay, not a single
// non-rendered "all_wells" pseudo-node (which would set material with no visible
// change, since the renderer reads each well's own store slot).
//
// This resolver is data-driven off the object's declared subpart_groups in the
// generated object library: no object name and no group name is special-cased.
// A target whose suffix is NOT a declared group (a bare object, or a single
// subpart like "well_plate_96.A1") passes through unchanged.
//
// References:
//   - generated/object_library.ts (OBJECT_LIBRARY[obj].subpart_groups)
//   - src/scene_runtime/protocol/scene_op_deps.ts (apply_object_state consumer)
//   - docs/PRIMARY_SPEC.md ("Scene operations": ObjectStateChange mutates
//     declared object state, including per-subpart material fields)

import { OBJECT_LIBRARY } from "../../../generated/object_library.js";

// Split a target into its object segment (before the first ".") and the suffix
// after it. A bare object target has an empty suffix.
function split_object_suffix(target: string): { object_name: string; suffix: string } {
  const dot = target.indexOf(".");
  if (dot < 0) {
    return { object_name: target, suffix: "" };
  }
  return { object_name: target.slice(0, dot), suffix: target.slice(dot + 1) };
}

// Expand an ObjectStateChange target into the concrete store targets the write
// must reach. When the target's suffix names a declared subpart_group of the
// object, return one "<object>.<member>" target per group member so the write
// fans out to every member's own store slot. Every other target (bare object,
// or a single declared subpart) returns unchanged as a one-element list.
//
// This is intentionally a pure lookup: it never validates that the suffix is a
// real subpart (that is the load-time target_existence_check invariant); it only
// answers "is this suffix a group, and if so, what are its members".
export function expand_subpart_group_target(target: string): string[] {
  const { object_name, suffix } = split_object_suffix(target);
  if (suffix === "") {
    return [target];
  }
  const def = OBJECT_LIBRARY[object_name];
  if (def === undefined || def.subpart_groups === undefined) {
    return [target];
  }
  const members = def.subpart_groups[suffix];
  if (members === undefined) {
    return [target];
  }
  // Fan out: each member becomes its own "<object>.<member>" write target so
  // the renderer's per-member overlay updates.
  return members.map((member) => `${object_name}.${member}`);
}
