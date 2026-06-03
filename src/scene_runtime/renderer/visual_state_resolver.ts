// visual_state_resolver.ts
//
// Pure resolver for object visual_states. Maps an object's current state plus
// its authored visual_states map plus the active protocol's material registry
// into a renderable description. This file has NO DOM and NO Solid; it is a
// pure function consumed by the Solid scene components (WS-M3-C).
//
// The resolver implements the closed formula mini-language tokens that
// authored objects actually use (see
// docs/active_plans/audits/formula_scene_op_inventory.md):
//   - fill_height(state(<field>), capacity_ml|capacity_ul|capacity_mg=<n>)
//   - label(state(<field>), format="<string with {value}>")
//   - conditional(state(<field>), <then-expr>, <else-expr>)
//   - compose(<token>, <token>, ...)  (zero authored uses today; implemented,
//     not silently no-opped)
// Unknown formula tokens fail loud.

import type { ObjectVisualStates, VisualStateCase } from "../layout/types.js";
import { resolve_color_result } from "./material_color.js";

//============================================
// Public input and output types
//============================================

// Current object state: flat map of field_name -> primitive value.
export type ObjectState = Record<string, string | number | boolean>;

// One material entry from a protocol's materials.yaml. display_color is a
// single scalar hex string (^#[0-9a-f]{6}$); this project targets light
// scientific workspaces only, so there is no light/dark theme branch.
export interface MaterialEntry {
  label: string;
  display_color: string;
}

// Per-protocol material registry. Each protocol package carries its own
// materials.yaml; this registry is passed in per protocol, never global.
export type MaterialRegistry = Record<string, MaterialEntry>;

// A fill overlay: a bottom-anchored fill expressed as a percentage [0..100].
export interface FillOverlay {
  type: "fill";
  field_name: string;
  // Fill fraction of capacity, clamped to [0, 100].
  fill_percent: number;
}

// A text overlay produced by label(...) or by a conditional resolving to text.
export interface TextOverlay {
  type: "text";
  field_name: string;
  text: string;
}

export type Overlay = FillOverlay | TextOverlay;

// Resolved material color: a single scalar `#rrggbb` hex string, or null when
// the material has no color (sentinel material such as `empty`, or no material
// field on the object). There is no theme branch (see
// docs/specs/MATERIAL_CONVENTION.md).
export type MaterialColor = string | null;

// Resolved, renderable description of one object instance.
export interface ResolvedVisualState {
  // Base SVG asset selected by the object's enum/bool svg visual_state, or
  // null when the object declares no svg case map.
  asset_name: string | null;
  // Ordered list of overlays (fills and text) to composite over the asset.
  overlays: Overlay[];
  // Theme color pair for the object's current material, or null.
  material_color: MaterialColor;
  // Convenience: the first text overlay's text, when present.
  label_text?: string;
  // True when the object should render as a labeled placeholder (no asset
  // could be resolved). Mirrors the renderer's missing-asset path.
  placeholder?: boolean;
  // Flat string attributes for the DOM node (data-* in the renderer layer).
  data_attrs: Record<string, string>;
}

//============================================
// Material-name state fields
//============================================

// Material-name state fields recognized on objects and tools.
const MATERIAL_FIELDS: readonly string[] = ["material_name", "held_material_name"];

//============================================
// Formula token parsing
//============================================

// A parsed formula expression. The mini-language is small enough that a hand
// written recursive parser is clearer than a grammar framework.
type FormulaExpr =
  | { token: "state"; field_name: string }
  | { token: "string"; value: string }
  | { token: "fill_height"; field_name: string; capacity_unit: string; capacity: number }
  | { token: "label"; field_name: string; format: string }
  | { token: "conditional"; cond: FormulaExpr; then_expr: FormulaExpr; else_expr: FormulaExpr }
  | { token: "compose"; parts: FormulaExpr[] };

// Split a comma-separated argument list at the top level only, respecting
// nested parentheses and double-quoted strings.
function split_top_level_args(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let in_string = false;
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (in_string) {
      current += ch;
      if (ch === '"') {
        in_string = false;
      }
      continue;
    }
    if (ch === '"') {
      in_string = true;
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")") {
      depth--;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

// Parse a double-quoted string literal token into its contents.
function parse_string_literal(text: string): string {
  // text is expected to start and end with a double quote.
  const inner = text.slice(1, -1);
  return inner;
}

// Parse one formula expression string into a FormulaExpr. Fails loud on any
// unknown token, arity mismatch, or malformed argument.
function parse_formula_expr(text: string): FormulaExpr {
  const trimmed = text.trim();
  // String literal: "..."
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return { token: "string", value: parse_string_literal(trimmed) };
  }
  // Function-call form: name(args)
  const open = trimmed.indexOf("(");
  if (open === -1 || !trimmed.endsWith(")")) {
    throw new Error(`visual_state_resolver: malformed formula expression: ${text}`);
  }
  const name = trimmed.slice(0, open).trim();
  const inner = trimmed.slice(open + 1, -1);
  const args = split_top_level_args(inner);
  // state(<field_name>)
  if (name === "state") {
    if (args.length !== 1) {
      throw new Error(`visual_state_resolver: state(...) needs 1 arg: ${text}`);
    }
    return { token: "state", field_name: args[0]!.trim() };
  }
  // fill_height(state(<field>), capacity_xx=<n>)
  if (name === "fill_height") {
    return parse_fill_height(args, text);
  }
  // label(state(<field>), format="<string>")
  if (name === "label") {
    return parse_label(args, text);
  }
  // conditional(<cond>, <then>, <else>)
  if (name === "conditional") {
    if (args.length !== 3) {
      throw new Error(`visual_state_resolver: conditional(...) needs 3 args: ${text}`);
    }
    return {
      token: "conditional",
      cond: parse_formula_expr(args[0]!),
      then_expr: parse_formula_expr(args[1]!),
      else_expr: parse_formula_expr(args[2]!),
    };
  }
  // compose(<token>, <token>, ...)
  if (name === "compose") {
    if (args.length === 0) {
      throw new Error(`visual_state_resolver: compose(...) needs >= 1 arg: ${text}`);
    }
    const parts = args.map((a) => parse_formula_expr(a));
    return { token: "compose", parts };
  }
  throw new Error(`visual_state_resolver: unknown formula token '${name}': ${text}`);
}

// Parse the state(...) operand shared by fill_height and label.
function parse_state_operand(text: string): string {
  const expr = parse_formula_expr(text);
  if (expr.token !== "state") {
    throw new Error(`visual_state_resolver: expected state(<field>), got: ${text}`);
  }
  return expr.field_name;
}

// Parse fill_height(state(<field>), capacity_xx=<n>).
function parse_fill_height(args: string[], text: string): FormulaExpr {
  if (args.length !== 2) {
    throw new Error(`visual_state_resolver: fill_height(...) needs 2 args: ${text}`);
  }
  const field_name = parse_state_operand(args[0]!);
  // Second arg is a capacity keyword assignment: capacity_ml=10.0
  const eq = args[1]!.indexOf("=");
  if (eq === -1) {
    throw new Error(`visual_state_resolver: fill_height capacity must be keyword=value: ${text}`);
  }
  const capacity_unit = args[1]!.slice(0, eq).trim();
  // The capacity keyword is parameterized; it carries the unit (ml, ul, mg, ...)
  // and the resolver never assumes a liquid-volume unit.
  if (!capacity_unit.startsWith("capacity_")) {
    throw new Error(
      `visual_state_resolver: fill_height capacity keyword must start with 'capacity_': ${text}`,
    );
  }
  const capacity_raw = args[1]!.slice(eq + 1).trim();
  const capacity = Number(capacity_raw);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new Error(
      `visual_state_resolver: fill_height capacity must be a positive number: ${text}`,
    );
  }
  return { token: "fill_height", field_name, capacity_unit, capacity };
}

// Parse label(state(<field>), format="<string>").
function parse_label(args: string[], text: string): FormulaExpr {
  if (args.length !== 2) {
    throw new Error(`visual_state_resolver: label(...) needs 2 args: ${text}`);
  }
  const field_name = parse_state_operand(args[0]!);
  const fmt_arg = args[1]!.trim();
  const fmt_prefix = "format=";
  if (!fmt_arg.startsWith(fmt_prefix)) {
    throw new Error(`visual_state_resolver: label format must be 'format="..."': ${text}`);
  }
  const fmt_value = fmt_arg.slice(fmt_prefix.length).trim();
  if (!(fmt_value.startsWith('"') && fmt_value.endsWith('"') && fmt_value.length >= 2)) {
    throw new Error(`visual_state_resolver: label format must be a quoted string: ${text}`);
  }
  return { token: "label", field_name, format: parse_string_literal(fmt_value) };
}

//============================================
// Formula evaluation against current state
//============================================

// Read a declared state field. Missing fields fail loud (the field must exist
// because the formula names it and the schema declares it).
function read_state_field(state: ObjectState, field_name: string): string | number | boolean {
  if (!(field_name in state)) {
    throw new Error(
      `visual_state_resolver: formula references undeclared state field '${field_name}'`,
    );
  }
  return state[field_name]!;
}

// Truthiness for conditional(...). A numeric 0, false, empty string, and the
// `empty` sentinel are falsy; everything else is truthy.
function is_truthy(value: string | number | boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  // string
  if (value.length === 0) {
    return false;
  }
  if (value === "empty") {
    return false;
  }
  return true;
}

// Format a value into a label string by substituting {value}.
function format_label(format: string, value: string | number | boolean): string {
  // Convert the value to a string regardless of its type, then substitute.
  const value_text = String(value);
  const text = format.split("{value}").join(value_text);
  return text;
}

// Evaluate a parsed formula into overlays appended to the accumulator.
// field_name is the visual_states key this formula belongs to (used for the
// overlay field_name tag).
function eval_formula(
  expr: FormulaExpr,
  field_name: string,
  state: ObjectState,
  overlays: Overlay[],
): void {
  switch (expr.token) {
    case "fill_height": {
      const raw = read_state_field(state, expr.field_name);
      if (typeof raw !== "number") {
        throw new Error(
          `visual_state_resolver: fill_height field '${expr.field_name}' is not numeric`,
        );
      }
      // Fill fraction relative to declared capacity, clamped to [0, 100].
      const fraction = (raw / expr.capacity) * 100;
      const fill_percent = Math.max(0, Math.min(100, fraction));
      overlays.push({ type: "fill", field_name, fill_percent });
      return;
    }
    case "label": {
      const raw = read_state_field(state, expr.field_name);
      const text = format_label(expr.format, raw);
      overlays.push({ type: "text", field_name, text });
      return;
    }
    case "string": {
      // A bare string literal renders as a static text overlay.
      overlays.push({ type: "text", field_name, text: expr.value });
      return;
    }
    case "conditional": {
      const cond_value = eval_cond_operand(expr.cond, state);
      const branch = is_truthy(cond_value) ? expr.then_expr : expr.else_expr;
      eval_formula(branch, field_name, state, overlays);
      return;
    }
    case "compose": {
      // Compose has zero authored uses today but is implemented, not
      // no-opped: each part contributes its overlays in order.
      for (const part of expr.parts) {
        eval_formula(part, field_name, state, overlays);
      }
      return;
    }
    case "state": {
      // A bare state(...) as a render expression is not meaningful on its own;
      // it must be wrapped by fill_height/label/conditional. Fail loud.
      throw new Error(
        `visual_state_resolver: bare state(${expr.field_name}) is not a render expression`,
      );
    }
    default: {
      // Exhaustiveness guard. Unreachable given the union above.
      const never: never = expr;
      throw new Error(`visual_state_resolver: unhandled formula expr: ${JSON.stringify(never)}`);
    }
  }
}

// Evaluate the condition operand of a conditional into a comparable value.
function eval_cond_operand(expr: FormulaExpr, state: ObjectState): string | number | boolean {
  if (expr.token === "state") {
    return read_state_field(state, expr.field_name);
  }
  if (expr.token === "string") {
    return expr.value;
  }
  throw new Error(
    `visual_state_resolver: conditional condition must be state(...) or a string literal`,
  );
}

//============================================
// Case (enum/bool) resolution for svg asset selection
//============================================

// Match a visual_state case 'when' against the current field value.
function case_matches(when: string | boolean, value: string | number | boolean): boolean {
  if (typeof when === "boolean") {
    return when === value;
  }
  // Authored 'when' is a string; the state value may be enum string.
  return when === value;
}

// Select the svg asset_name from a case map for the field's current value.
function resolve_svg_asset(
  field_name: string,
  cases: VisualStateCase[],
  state: ObjectState,
): string | null {
  const value = read_state_field(state, field_name);
  for (const c of cases) {
    if (case_matches(c.when, value)) {
      const output = c.output;
      if ("asset_name" in output) {
        return output.asset_name;
      }
      // svg case maps are expected to carry asset_name outputs.
      throw new Error(`visual_state_resolver: svg case for '${field_name}' has no asset_name`);
    }
  }
  // No matching case: fail loud so missing coverage is visible.
  throw new Error(
    `visual_state_resolver: no svg case matched '${field_name}' value '${String(value)}'`,
  );
}

//============================================
// Material color resolution
//============================================

// Read the object's current material name from the recognized material-name
// state fields. Returns null when the object declares no material field.
function read_material_name(state: ObjectState): string | null {
  for (const f of MATERIAL_FIELDS) {
    if (f in state) {
      const v = state[f]!;
      if (typeof v === "string") {
        return v;
      }
      return null;
    }
  }
  return null;
}

// Resolve the object's current material color from the per-protocol registry.
// Delegates the name -> color mapping to the single color source in
// material_color.ts (see docs/specs/MATERIAL_CONVENTION.md): scalar
// display_color, built-in `mixed` gray, sentinel/empty null, no theme branch.
// The render path here is fail-loud: a ColorResult failure (a content defect,
// e.g. a non-sentinel material missing from a provided registry, or an invalid
// scalar color) is rethrown so the resolver surfaces it through the same loud
// channel as every other render defect, rather than being silently dropped.
function resolve_material_color(
  state: ObjectState,
  material_registry: MaterialRegistry | null,
): { color: MaterialColor; material_name: string | null } {
  const material_name = read_material_name(state);
  const result = resolve_color_result(material_name, material_registry);
  if (!result.ok) {
    throw new Error(`visual_state_resolver: ${result.reason}`);
  }
  return { color: result.color, material_name };
}

//============================================
// Public entry point
//============================================

// Resolve an object's visual state into a renderable description.
//
// object_visual_states: the object's authored visual_states map.
// state:                the object's current flat state values.
// material_registry:    the active protocol's materials.yaml registry, or null
//                       when there is no protocol material context (diagnostic
//                       scene-viewer render). A provided registry (even empty)
//                       is authoritative; null means "no color context".
export function resolve_visual_state(
  object_visual_states: ObjectVisualStates,
  state: ObjectState,
  material_registry: MaterialRegistry | null,
): ResolvedVisualState {
  let asset_name: string | null = null;
  const overlays: Overlay[] = [];
  const data_attrs: Record<string, string> = {};

  // Walk every authored visual_states entry, keyed by field_name.
  for (const field_name of Object.keys(object_visual_states)) {
    const def = object_visual_states[field_name]!;
    if (def.kind === "svg") {
      // svg entries carry a case map selecting the base asset.
      if (!def.cases) {
        throw new Error(`visual_state_resolver: svg visual_state '${field_name}' has no cases`);
      }
      asset_name = resolve_svg_asset(field_name, def.cases, state);
      continue;
    }
    // overlay and composite entries either carry a formula or an empty
    // composite literal (composite: []), which contributes nothing.
    if (def.formula) {
      const expr = parse_formula_expr(def.formula);
      eval_formula(expr, field_name, state, overlays);
      continue;
    }
    // No formula and not svg: an empty composite (composite: []) is a valid
    // no-op authored form. Anything else with no formula is also a no-op here.
  }

  // Resolve material color from the per-protocol registry.
  const material = resolve_material_color(state, material_registry);

  // Expose the resolved material name as a data attribute when present.
  if (material.material_name !== null) {
    data_attrs["data-material"] = material.material_name;
  }

  // Convenience: surface the first text overlay as label_text.
  let label_text: string | undefined;
  for (const o of overlays) {
    if (o.type === "text") {
      label_text = o.text;
      break;
    }
  }

  // Placeholder when no base asset could be resolved.
  const placeholder = asset_name === null ? true : undefined;

  const result: ResolvedVisualState = {
    asset_name,
    overlays,
    material_color: material.color,
    data_attrs,
  };
  if (label_text !== undefined) {
    result.label_text = label_text;
  }
  if (placeholder !== undefined) {
    result.placeholder = placeholder;
  }
  return result;
}
