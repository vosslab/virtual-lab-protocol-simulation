// material_color.ts
//
// The single color source: turns a material name plus the active per-protocol
// material registry into a renderable color result. No other component turns a
// name into a color, and no component invents a local fallback color or
// reinterprets a failure (see docs/specs/MATERIAL_CONVENTION.md "Color resolver
// behavior").
//
// This project targets light scientific workspaces only: display_color is a
// single scalar `#rrggbb` hex string read as-is. There is NO light/dark theme,
// no `.light` / `.dark` branch, and no theme-aware selection.
//
// The result is the typed discriminated union ColorResult:
//   - { ok: true; color: null }       the single no-fill success (the `empty`
//                                      sentinel, or no material field)
//   - { ok: true; color: "#rrggbb" }  a registry-backed scalar color, or a
//                                      built-in (`mixed` -> #686868)
//   - { ok: false; reason }           a content defect: a non-`empty` name
//                                      absent from a provided registry and not a
//                                      built-in, or a registry-backed name whose
//                                      display_color is missing/invalid
//
// An `ok: false` result is routed, unmodified, to the per-item degrade path; a
// consumer must NOT catch it and substitute a color, and must NOT treat
// `color: null` as a failure.

import type { MaterialRegistry } from "./visual_state_resolver.js";

//============================================
// Typed result (discriminated union)
//============================================

export type ColorResult = { ok: true; color: string | null } | { ok: false; reason: string };

//============================================
// Closed material sets fixed by the spec
//============================================

// The closed built-in material names, the single source both the color resolver
// (below) and the registry-backed acceptance predicate (material_acceptance.ts)
// read. These mirror the Python stepper's split frozensets
// (validation/stepper/sentinels.py) value-for-value, so a material name that the
// TS runtime accepts and the Python stepper accepts can never drift:
//   - NON_RENDERING_MATERIAL_SENTINELS: `empty` only -- renders no fill, base art
//     shows through, never a registry lookup.
//   - BUILTIN_VISIBLE_MATERIAL_NAMES: `mixed` only -- the one built-in visible
//     material; its color is spec-fixed (BUILTIN_MATERIAL_COLORS), never a
//     registry entry.
// Source of truth: docs/specs/MATERIAL_VOCABULARY.md and
// docs/specs/MATERIAL_YAML_FORMAT.md (D1 predicate). Every other written name --
// cells, formazan, mtt, the waste_* streams -- is registry-backed.
export const NON_RENDERING_MATERIAL_SENTINELS: ReadonlySet<string> = new Set(["empty"]);
export const BUILTIN_VISIBLE_MATERIAL_NAMES: ReadonlySet<string> = new Set(["mixed"]);

// Built-in material colors: the closed set of visible materials whose scalar
// color is fixed by the spec rather than authored per protocol (see
// docs/specs/MATERIAL_CONVENTION.md "Built-in material colors"). Today the only
// member is the sentinel `mixed`, a non-`empty` material with no tracked
// identity that must still render. The resolver produces this color itself; it
// is never a registry lookup and never resolves to null.
const BUILTIN_MATERIAL_COLORS: ReadonlyMap<string, string> = new Map([["mixed", "#686868"]]);

// Scalar display_color format fixed in docs/specs/MATERIAL_YAML_FORMAT.md.
const DISPLAY_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

//============================================
// Resolver
//============================================

// Resolve a material name into a ColorResult against the active registry.
//
// material_name:     the object's current material name, or null when the
//                    object declares no material field. null is a no-fill
//                    success (the base art shows through).
// material_registry: the active protocol's materials.yaml registry, or null
//                    when there is no protocol material context (diagnostic
//                    scene-viewer render). A provided registry (even empty) is
//                    authoritative: a non-sentinel material missing from it is
//                    a failure. A null registry means "no color context", so a
//                    non-sentinel material surfaces as a null-color success.
export function resolve_color_result(
  material_name: string | null,
  material_registry: MaterialRegistry | null,
): ColorResult {
  // No material field on the object: the single no-fill success.
  if (material_name === null) {
    return { ok: true, color: null };
  }
  // Built-in colors (today: `mixed`) are resolved here, not by a registry
  // lookup, and never resolve to null.
  const builtin = BUILTIN_MATERIAL_COLORS.get(material_name);
  if (builtin !== undefined) {
    return { ok: true, color: builtin };
  }
  // The non-rendering sentinel `empty` carries no color: a no-fill success so
  // the base art shows through. This is the ONLY name that resolves to null
  // before the registry lookup. Registry-backed names (cells, formazan, the
  // waste_* streams) must fall through to the registry so their authored
  // display_color paints; they are not sentinels here.
  if (NON_RENDERING_MATERIAL_SENTINELS.has(material_name)) {
    return { ok: true, color: null };
  }
  // A null registry means there is no protocol material context at all. There
  // is no color to resolve: surface a null-color success rather than a failure.
  // This is distinct from a PROVIDED registry (even empty {}), which is the
  // authoritative closed set for an active protocol.
  if (material_registry === null) {
    return { ok: true, color: null };
  }
  // A non-sentinel material absent from a provided registry is a content
  // defect: a failure routed to the degrade path, never a painted color.
  if (!(material_name in material_registry)) {
    const reason = `material '${material_name}' not in protocol material registry`;
    return { ok: false, reason };
  }
  const entry = material_registry[material_name]!;
  const scalar = entry.display_color;
  // A registry-backed name whose scalar display_color is missing or malformed
  // is a content defect: fail rather than paint an invalid color.
  if (!DISPLAY_COLOR_PATTERN.test(scalar)) {
    const reason = `material '${material_name}' has invalid display_color '${scalar}'`;
    return { ok: false, reason };
  }
  return { ok: true, color: scalar };
}
