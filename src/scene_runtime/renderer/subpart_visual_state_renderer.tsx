// src/scene_runtime/renderer/subpart_visual_state_renderer.tsx
//
// The GENERIC structured-subpart visual-state interpreter.
//
// This component renders the per-subpart material-tint effect for ANY structured
// object that DECLARES it. It is dispatched (never constructed by name) from
// scene_item.tsx when an object def satisfies the subpart render contract:
//   - the def carries subpart_geometry (typed generated geometry, MATERIAL_CONVENTION.md D10), AND
//   - the def carries a visual_states entry with applies_to === "subpart" and
//     render_effect === "material_tint" on a material-name field.
//
// Genericity (the binding rule for this interpreter):
//   - The interpreter hardcodes NO object name. The placement/object name arrives
//     as props from the dispatching SceneItem.
//   - The interpreter hardcodes NO field name. The driving field name is READ
//     from the declared visual_states entry's key (find_material_tint_subpart_field).
//     "material_name" is data flowing through the declaration, never a literal here.
//   - The interpreter hardcodes NO shape. It switches on geometry.shape (circle /
//     rect) from the typed SubpartGeometry union; a future rect-subpart object
//     (gel lanes, rack slots) needs no new TS.
//   - The interpreter keys on the declared EFFECT token (material_tint), not on
//     the field being named "material". A different material-name field name on a
//     future object resolves identically because the declaration drives it.
//
// Static-overlay model (MATERIAL_CONVENTION.md "Generic evaluation rule", D9):
//   The renderer builds ONE <svg> overlay once, sized to the def's view_box, and
//   draws one shape per subpart geometry entry via <For> (stable key = subpart
//   name). Each shape's fill is a per-subpart createMemo that reads the driving
//   field independently through the narrow store accessor getSubpartStateField,
//   then through the single color source resolve_color_result. A1 and A2 are
//   distinct reactive reads and update independently. No createEffect copies
//   state; no per-subpart state is duplicated; the runtime only updates the fill
//   attribute of existing nodes (Solid owns the reactive attribute writes).
//
// Empty / null / degrade semantics (MATERIAL_CONVENTION.md, D4):
//   - ok:true + color  -> that color is the fill.
//   - ok:true + null   -> "transparent" (empty / sentinel / unseeded well; base
//                         art shows through). This is the single no-fill success.
//   - ok:false         -> "transparent" fill (never a painted region) PLUS the
//                         failure is routed, unmodified, to the per-item degrade
//                         sink (onDegrade) that SceneView owns, so it is observable
//                         (data-scene-degraded) rather than silently invisible.
//
// DOM / SVG isolation (MATERIAL_CONVENTION.md D13 / L9): this overlay is a
// SEPARATE <svg> built from generated geometry. It references NO base-SVG id,
// builds NO DOM id, does NO anchor lookup, and queries NO arbitrary DOM. It sits
// over the base art with pointer-events: none so it never intercepts clicks. Each
// shape carries data-subpart-name and data-material-name for spatial-correspondence
// assertions (D11).

import type { JSXElement } from "solid-js";
import { createMemo, createEffect, For } from "solid-js";

import type { ObjectDef, SubpartGeometry, ViewBox } from "../layout/types.js";
import type { SceneStore } from "../state/scene_store.js";
import type { MaterialRegistry } from "./visual_state_resolver.js";
import { resolve_color_result } from "./material_color.js";

// The pure dispatch predicate lives in subpart_dispatch.ts (no JSX, importable
// without the Solid runtime). Both this component and scene_item.tsx import it
// directly from that module.

//============================================
// Per-subpart fill resolution
//============================================

// One resolved fill for a subpart: the SVG fill value plus the material name to
// stamp as data-material-name. degraded carries a non-empty message when the
// color resolver failed for this subpart (routed to the degrade sink).
interface SubpartFill {
  fill: string;
  material_name: string;
  degraded: string;
}

// The fill used when a subpart has no painted material: the single no-fill
// success (empty / sentinel / unseeded) and also the safe value for a failure
// (a failure is NEVER a painted region; the failure is surfaced via the sink).
const NO_FILL = "transparent";

// Resolve one subpart's fill from the store + color resolver. PURE: it reads the
// reactive store accessor (subscribing this subpart's slot) and the color source,
// and returns a value. It performs no side effects; the degrade message it
// returns is forwarded to the sink by the caller's effect-free render path.
//
// material_name: the raw declared driving-field value (or undefined when the
//   subpart is unseeded). Coerced to a string name for the resolver; an unseeded
//   subpart is treated as no material (null), the no-fill success.
function resolve_subpart_fill(
  raw_value: string | number | boolean | undefined,
  registry: MaterialRegistry | null,
): SubpartFill {
  // An unseeded subpart (no write yet) has no material: the no-fill success.
  // A non-string declared value cannot be a material name; treat it as no
  // material rather than guessing. (The driving field is an enum -> string.)
  const material_name: string | null = typeof raw_value === "string" ? raw_value : null;
  const result = resolve_color_result(material_name, registry);
  if (!result.ok) {
    // A content defect: never paint, surface the failure through the sink.
    return { fill: NO_FILL, material_name: material_name ?? "", degraded: result.reason };
  }
  // ok:true. color === null is the empty/sentinel no-fill success (transparent);
  // a color string is the painted material identity.
  const fill = result.color === null ? NO_FILL : result.color;
  return { fill, material_name: material_name ?? "", degraded: "" };
}

//============================================
// One subpart shape
//============================================

// Render one subpart geometry shape with a reactive fill. The fill is a
// per-subpart createMemo so A1 and A2 update independently (fine-grained
// reactivity through getSubpartStateField): reading getSubpartStateField inside
// the memo subscribes ONLY this subpart's field slot, so a write to another well
// does not recompute this shape. The memo is PURE (no signal writes, no DOM
// reach): it only reads the store + color resolver. The degrade report to the
// SceneView-owned sink runs in a SEPARATE createEffect, mirroring scene_item.tsx
// (memo pure, effect reports). This is NOT a state-copy effect: it duplicates no
// subpart state, it only forwards a failure message to the parent's sink.
function SubpartShape(props: {
  subpart_name: string;
  geometry: SubpartGeometry;
  store: SceneStore;
  placement_id: string;
  field_name: string;
  registry: MaterialRegistry | null;
  on_degrade: (subpart_name: string, message: string) => void;
}): JSXElement {
  const resolved = createMemo<SubpartFill>(() => {
    const raw = props.store.getSubpartStateField(
      props.placement_id,
      props.subpart_name,
      props.field_name,
    );
    return resolve_subpart_fill(raw, props.registry);
  });

  // Report this subpart's degrade state to the sink whenever it changes. A
  // failing well surfaces a non-empty message; a recovering well clears it with
  // "". The effect tracks resolved(), so it re-runs only on a real change.
  createEffect(() => {
    props.on_degrade(props.subpart_name, resolved().degraded);
  });

  const geometry = props.geometry;
  // Switch on the typed shape. Circle covers round wells; rect covers
  // rectangular subparts (gel lanes, rack slots). No object-name branch.
  if (geometry.shape === "circle") {
    return (
      <circle
        data-subpart-name={props.subpart_name}
        data-material-name={resolved().material_name}
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.r}
        fill={resolved().fill}
      />
    );
  }
  // geometry.shape === "rect"
  return (
    <rect
      data-subpart-name={props.subpart_name}
      data-material-name={resolved().material_name}
      x={geometry.x}
      y={geometry.y}
      width={geometry.w}
      height={geometry.h}
      fill={resolved().fill}
    />
  );
}

//============================================
// Public component: the subpart overlay
//============================================

// Render the static per-subpart material overlay for a structured object.
//
// The component builds ONE <svg> sized to the def's view_box and draws one shape
// per subpart_geometry entry. The overlay is absolutely positioned to fill the
// item box (the same box the base SVG occupies), so the geometry expressed in the
// view_box frame lines up with the rendered base art (spatial correspondence,
// D11). pointer-events: none keeps the base art clickable.
//
// Caller (scene_item.tsx) must only mount this when find_material_tint_subpart_field
// returns non-null, so geometry/view_box/field_name are all present here.
export function SubpartVisualStateOverlay(props: {
  def: ObjectDef;
  store: SceneStore;
  // The placement's object name, used as the placement id segment of the subpart
  // target ("well_plate_96" -> "well_plate_96.A1"). Passed from SceneItem; this
  // component hardcodes no object name.
  placement_id: string;
  field_name: string;
  registry: MaterialRegistry | null;
  // Per-subpart degrade sink. SceneItem forwards this up to SceneView's onDegrade
  // with a subpart-qualified target so a failed well is observable on the scene
  // root, exactly like an object-level resolver failure.
  on_subpart_degrade: (subpart_name: string, message: string) => void;
}): JSXElement {
  // geometry + view_box are guaranteed present by the dispatch predicate; assert
  // loudly if a caller violated that contract rather than rendering a broken box.
  const geometry_map = props.def.subpart_geometry;
  const view_box: ViewBox | undefined = props.def.view_box;
  if (geometry_map === undefined || view_box === undefined) {
    throw new Error(
      `SubpartVisualStateOverlay: object "${props.def.object_name}" has no subpart_geometry/view_box`,
    );
  }

  // The deterministic, generator-ordered subpart name list. Object.keys preserves
  // the generated insertion order, which the generator fixes (name_pattern order),
  // so <For> iterates a stable list and assigns stable keys.
  const subpart_names = Object.keys(geometry_map);

  // The viewBox string from the typed view_box. The overlay svg uses the SAME
  // coordinate frame as the base art so generated geometry aligns with the asset.
  const view_box_attr = `${view_box.min_x} ${view_box.min_y} ${view_box.width} ${view_box.height}`;

  return (
    <svg
      data-subpart-overlay={props.def.object_name}
      viewBox={view_box_attr}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        // The overlay never intercepts clicks: the base art under it stays the
        // click target (the delegated click_resolver reads data-item-id).
        "pointer-events": "none",
      }}
    >
      <For each={subpart_names}>
        {(subpart_name: string) => {
          // Object.keys guarantees the key exists; noUncheckedIndexedAccess
          // narrows to possibly-undefined, so assert presence loudly.
          const geometry = geometry_map[subpart_name];
          if (geometry === undefined) {
            throw new Error(
              `SubpartVisualStateOverlay: missing geometry for subpart "${subpart_name}"`,
            );
          }
          return (
            <SubpartShape
              subpart_name={subpart_name}
              geometry={geometry}
              store={props.store}
              placement_id={props.placement_id}
              field_name={props.field_name}
              registry={props.registry}
              on_degrade={props.on_subpart_degrade}
            />
          );
        }}
      </For>
    </svg>
  );
}
