// src/scene_runtime/renderer/scene_item.tsx
//
// One positioned scene item, rendered by Solid. Each item is a reactive
// Solid component derived from a ComputedItem and the scene store.
//
// Geometry boundary (PRIMARY_DESIGN.md / plan "Solid owns rendering, not
// layout meaning"): every geometric value (_x, _top, _visualWidth, _height,
// depth, zone) comes VERBATIM from the ComputedItem produced by runPipeline.
// This component performs NO positioning math. The structured-subpart
// exception (well/lane/slot geometry) is not handled here; it would draw from
// declared object structure, never ad hoc component math.
//
// Reactive state boundary: artwork (asset / overlays / highlight) is derived
// from the scene_store via visual_state_resolver. When the store changes the
// item's state, only this item's reactive fragments update; the DOM node for
// the item is created once and reused (Solid keyed <For> in scene_view keeps
// the node stable across ObjectStateChange).
//
// Frozen DOM contract (plan "Frozen DOM contract"): the item div emits exactly
// these data-* attributes:
//   data-placement-name, data-object-name, data-zone, data-kind, data-depth,
//   data-target-id, data-item-id, data-asset, and (placeholder only)
//   data-missing-svg + data-placeholder-kind.
// Additive failure-only marker: data-resolver-degraded="<message>" is stamped on
// the item div when this item's visual-state resolution throws (see the resolver
// memo below). It is absent on a clean item. The scene-root marker
// (data-scene-degraded on the closest [data-scene-root]) is NOT stamped here; it
// is owned reactively by SceneView, which this item notifies via the onDegrade
// callback. SceneView stamps data-scene-root + data-scene-degraded (see
// scene_view.tsx).
// Click handling stays on the delegated click_resolver (it reads data-item-id);
// this component adds NO per-item click handler.

import type { JSXElement } from "solid-js";
import { createMemo, createSignal, createEffect, Show, For } from "solid-js";

import type { ComputedItem, ObjectVisualStates } from "../layout/types.js";
import type { SceneStore } from "../state/scene_store.js";
import {
  resolve_visual_state,
  type MaterialRegistry,
  type ObjectState,
  type ResolvedVisualState,
} from "./visual_state_resolver.js";
import { injectSvgInto } from "./inject_svg.js";
import { OBJECT_LIBRARY } from "../../../generated/object_library.js";

//============================================
// Depth -> z-index mapping
//============================================

const DEPTH_Z: Record<string, number> = {
  back: 1,
  mid: 2,
  front: 3,
};

// Resolve the z-index for an item's depth tier. Items lacking a depth tier
// render in the back tier (z-index 1).
function z_index_for(item: ComputedItem): number {
  if (!item.depth) {
    return 1;
  }
  return DEPTH_Z[item.depth] ?? 1;
}

//============================================
// Static-geometry style (computed once from PipelineResult, never reactive)
//============================================

// Build the absolute-position style string for an item from its computed
// geometry. Uses scene-percent left/top/width/height and a depth-derived z-index.
function position_style(item: ComputedItem): Record<string, string> {
  return {
    position: "absolute",
    left: `${item._x}%`,
    top: `${item._top}%`,
    width: `${item._visualWidth}%`,
    height: `${item._height}%`,
    "z-index": String(z_index_for(item)),
  };
}

//============================================
// Object-level visual_states filtering
//============================================

// Keep only the object-level visual_states entries. Subpart entries
// (applies_to: 'subpart') describe per-subpart rendering (well/tube/lane
// material) driven by subpart state, not the object's own state, and are
// handled by the structured-subpart path (not this object-level renderer).
function filter_object_visual_states(all: ObjectVisualStates): ObjectVisualStates {
  const out: ObjectVisualStates = {};
  for (const key of Object.keys(all)) {
    const def = all[key];
    if (def !== undefined && def.applies_to === "object") {
      out[key] = def;
    }
  }
  return out;
}

//============================================
// Reactive state read
//============================================

// Read the current declared object state for a target from the store. Returns
// an empty object when the target was not seeded (e.g. a non-clickable decor
// item with no state schema); the resolver then produces no overlays and uses
// the object's default svg case via the item asset.
function read_object_state(store: SceneStore, target: string): ObjectState {
  const entry = store.state[target];
  if (entry === undefined) {
    return {};
  }
  // The reactive read of entry.state subscribes this memo to state changes.
  const out: ObjectState = {};
  for (const key of Object.keys(entry.state)) {
    const value = entry.state[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

// Read the runtime highlight flags for a target. Missing target -> both off.
function read_flags(
  store: SceneStore,
  target: string,
): {
  is_selected: boolean;
  is_active_target: boolean;
} {
  const entry = store.state[target];
  if (entry === undefined) {
    return { is_selected: false, is_active_target: false };
  }
  return {
    is_selected: entry.flags.is_selected,
    is_active_target: entry.flags.is_active_target,
  };
}

//============================================
// SVG host (imperative innerHTML injection, ref-driven)
//============================================

// Inject a validated generated SVG asset into a host div by ref. inject_svg.ts
// is the ONLY innerHTML site and accepts only build-time generated asset names
// from SVG_REGISTRY; no authored YAML string ever reaches innerHTML here.
function SvgHost(props: { asset: string }): JSXElement {
  // The ref callback runs once when Solid creates the node. asset is a stable
  // resolved registry key (string), never authored markup.
  return (
    <div
      style={{ width: "100%", height: "100%" }}
      ref={(el: HTMLDivElement) => {
        injectSvgInto(el, props.asset);
      }}
    ></div>
  );
}

//============================================
// Overlay rendering (fills + text), bottom-anchored
//============================================

// Render the resolved overlays for an item. Fill overlays are bottom-anchored
// percentage bars tinted by the resolved material color; text overlays render
// as a centered caption. Overlays are advisory render layers over the asset;
// they do not change item geometry.
function Overlays(props: { resolved: ResolvedVisualState }): JSXElement {
  return (
    <For each={props.resolved.overlays}>
      {(overlay) => {
        if (overlay.type === "fill") {
          // Bottom-anchored fill. Color from the resolved material pair (light
          // theme) when present; otherwise a neutral translucent fill so the
          // fill level is still visible for a sentinel/empty material.
          const color =
            props.resolved.material_color !== null
              ? props.resolved.material_color.light
              : "rgba(120, 120, 120, 0.35)";
          return (
            <div
              data-overlay="fill"
              data-overlay-field={overlay.field_name}
              style={{
                position: "absolute",
                left: "0",
                bottom: "0",
                width: "100%",
                height: `${overlay.fill_percent}%`,
                "background-color": color,
                "pointer-events": "none",
              }}
            ></div>
          );
        }
        // Text overlay: centered caption near the bottom of the item box.
        return (
          <div
            data-overlay="text"
            data-overlay-field={overlay.field_name}
            style={{
              position: "absolute",
              left: "0",
              right: "0",
              bottom: "2%",
              "text-align": "center",
              "font-family": "monospace",
              "font-size": "10px",
              color: "#222222",
              "pointer-events": "none",
            }}
          >
            {overlay.text}
          </div>
        );
      }}
    </For>
  );
}

//============================================
// Placeholder body (missing-svg / missing-object)
//============================================

// Render the labeled dashed-box body used for placeholder-mode items.
// Emits a dashed border, centered label, two-line object_name + cause text.
// NEVER an object-fit SVG container.
function PlaceholderBody(props: { item: ComputedItem }): JSXElement {
  const cause = (): string =>
    props.item._missing_object === true ? "MISSING OBJECT" : "MISSING ART";
  return (
    <span
      style={{
        "font-size": "11px",
        "font-family": "monospace",
        color: "#c0392b",
        "text-align": "center",
        padding: "2px 4px",
        "pointer-events": "none",
        // whiteSpace pre renders the \n in the label text as a line break.
        "white-space": "pre",
      }}
    >
      {`${props.item.object_name}\n${cause()}`}
    </span>
  );
}

//============================================
// Public component: one positioned item
//============================================

// Render one positioned scene item. The geometry comes from the ComputedItem
// verbatim; the artwork/overlays/highlight are reactive from the store.
//
// props.item            ComputedItem from runPipeline (geometry authority)
// props.store           reactive scene store
// props.materialRegistry active protocol's material registry (may be empty)
export function SceneItem(props: {
  item: ComputedItem;
  store: SceneStore;
  materialRegistry: MaterialRegistry | null;
  // SceneView-owned degrade sink. Called with a non-empty message when this
  // item's resolver throws, and with "" when it resolves cleanly, so SceneView
  // can reactively own the scene-root data-scene-degraded marker without a
  // child closest()/onMount race. Optional so unit harnesses can mount a bare
  // SceneItem without wiring the callback.
  onDegrade?: (target: string, message: string) => void;
}): JSXElement {
  const item = props.item;
  const target = item.object_name;

  // Placeholder-mode items skip SVG/state resolution entirely.
  const is_placeholder = item.missing_svg === true;

  // Resolve the object's authored visual_states map (empty when the object is
  // not in the library, e.g. a missing-object placeholder), filtered to the
  // OBJECT-level entries. Subpart visual_states (applies_to: 'subpart', e.g. the
  // per-tube material on a rack, or per-well material on a plate) render with the
  // structured-subpart geometry that is OUT OF SCOPE for this object-level
  // renderer pass; resolving them against object-level state would reference
  // fields the object schema does not declare. They are rendered (if at all) by
  // the structured-subpart path, not here.
  const all_visual_states: ObjectVisualStates = OBJECT_LIBRARY[target]?.visual_states ?? {};
  const visual_states: ObjectVisualStates = filter_object_visual_states(all_visual_states);

  // Whether this object declares any visual_states. When it does not, there is
  // no reactive artwork to derive: we render the item's bound asset directly
  // (the asset chosen at bind time by the layout pipeline), preserving static
  // behavior for decor/equipment that has no state-driven art.
  const has_visual_states = Object.keys(visual_states).length > 0;

  // Reactive degraded message for THIS item. Empty string means "not degraded".
  // A resolver failure (a content bug, e.g. a visual_states formula referencing
  // an undeclared field) is surfaced here, NOT swallowed: it sets this signal,
  // which stamps an observable per-item marker (data-resolver-degraded) AND
  // notifies SceneView via onDegrade so SceneView can reactively own the
  // scene-root data-scene-degraded marker. This routes the failure through the
  // SAME observable degrade channel structural_guards uses (data-scene-degraded
  // on the scene root), so a walker/test can detect it -- but ownership now
  // lives in SceneView, removing the old closest()/onMount timing race. We do
  // NOT throw from the memo: a Solid memo throw propagates up and blanks the
  // whole reactive tree (there is no per-item report-mode wrapper), violating
  // the degrade-never-blank policy. We also do NOT silently return null: that is
  // the exact bug-hiding fallback this fix removes.
  const [resolverDegraded, setResolverDegraded] = createSignal<string>("");

  // Pure resolution result: the resolved state OR the error message. The memo
  // stays PURE (no signal writes, no console side effects, no DOM reach): it
  // only computes. Reading store.state[target] inside the memo subscribes the
  // memo (and thus only this item's reactive fragments) to that target's state.
  // An ObjectStateChange re-runs this memo and updates the affected fragments
  // WITHOUT remounting the item's DOM node.
  type ResolveResult = { state: ResolvedVisualState | null; error: string };
  const resolveResult = createMemo<ResolveResult>(() => {
    if (is_placeholder || !has_visual_states) {
      return { state: null, error: "" };
    }
    const state = read_object_state(props.store, target);
    // An object with visual_states whose target was not seeded (no declared
    // state schema, so build_seed_list skipped it) has no state to resolve
    // against. Skip resolution and fall back to the bound asset; resolving an
    // empty state against a field-referencing formula would throw.
    if (Object.keys(state).length === 0) {
      return { state: null, error: "" };
    }
    // The strict resolver behavior is preserved for tests/CI that call
    // resolve_visual_state directly. Here in the render path a failure must
    // surface observably (degraded marker + loud warn) rather than blanking the
    // scene or being silently nulled. We keep the catch narrow to this single
    // resolve call so an unrelated bug in surrounding render code is not masked.
    try {
      const resolvedState = resolve_visual_state(visual_states, state, props.materialRegistry);
      return { state: resolvedState, error: "" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { state: null, error: message };
    }
  });

  // The resolved visual state for downstream rendering (overlays / asset).
  const resolved = createMemo<ResolvedVisualState | null>(() => resolveResult().state);

  // Side-effect channel for a resolver failure. This effect is the ONLY place
  // that mutates the degrade signals / warns / notifies SceneView, keeping the
  // memo pure. It runs on first render and whenever the resolve result changes:
  //   - stamps the per-item data-resolver-degraded signal,
  //   - warns loudly once per transition into a failure,
  //   - notifies SceneView via onDegrade so SceneView reactively owns the
  //     scene-root data-scene-degraded marker (no closest()/onMount race).
  let lastError = "";
  createEffect(() => {
    const error = resolveResult().error;
    setResolverDegraded(error);
    if (error.length > 0 && error !== lastError) {
      // eslint-disable-next-line no-console
      console.warn(`SceneItem "${target}" visual-state resolution degraded: ${error}`);
    }
    lastError = error;
    if (props.onDegrade) {
      props.onDegrade(target, error);
    }
  });

  // The base asset to inject. When visual_states drive the asset, use the
  // resolved asset; otherwise fall back to the bound item.asset (static).
  const asset_name = createMemo<string>(() => {
    const r = resolved();
    if (r !== null && r.asset_name !== null) {
      return r.asset_name;
    }
    return item.asset;
  });

  // Reactive highlight flags.
  const flags = createMemo(() => read_flags(props.store, target));

  // Base style: static geometry plus reactive highlight outline. The outline
  // is a box-shadow so it does not change layout box size (no geometry math).
  const base_style = position_style(item);

  const highlight_style = createMemo<Record<string, string>>(() => {
    const f = flags();
    if (f.is_active_target) {
      return { "box-shadow": "0 0 0 3px #f5a623", "border-radius": "2px" };
    }
    if (f.is_selected) {
      return { "box-shadow": "0 0 0 2px #4a90d9", "border-radius": "2px" };
    }
    return {};
  });

  // data-asset reflects the currently rendered asset so stats tooling reads
  // the live asset. For state-free objects the resolved asset equals the
  // bound asset from the layout pipeline.

  if (is_placeholder) {
    const placeholder_kind = item._missing_object === true ? "missing-object" : "missing-svg";
    return (
      <div
        data-placement-name={item.placement_name}
        data-object-name={item.object_name}
        data-zone={item.zone}
        data-kind={item.kind}
        data-depth={item.depth ?? undefined}
        data-target-id=""
        data-item-id={item.object_name}
        data-asset={item.asset}
        data-missing-svg="true"
        data-placeholder-kind={placeholder_kind}
        style={{
          ...base_style,
          "box-sizing": "border-box",
          border: "2px dashed #c0392b",
          "background-color": "#fdf2f1",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          overflow: "visible",
        }}
      >
        <PlaceholderBody item={item} />
      </div>
    );
  }

  return (
    <div
      data-placement-name={item.placement_name}
      data-object-name={item.object_name}
      data-zone={item.zone}
      data-kind={item.kind}
      data-depth={item.depth ?? undefined}
      data-target-id=""
      data-item-id={item.object_name}
      data-asset={asset_name()}
      data-resolver-degraded={resolverDegraded().length > 0 ? resolverDegraded() : undefined}
      style={{ ...base_style, ...highlight_style() }}
    >
      {/* SVG host keyed by the resolved asset name. When the asset changes
          (e.g. an SvgSwap-style enum visual_state), the keyed Show remounts
          only the inner SVG host, never the item's outer node. */}
      <Show when={asset_name()} keyed>
        {(asset) => <SvgHost asset={asset} />}
      </Show>
      <Show when={resolved() !== null}>
        <Overlays resolved={resolved()!} />
      </Show>
    </div>
  );
}
