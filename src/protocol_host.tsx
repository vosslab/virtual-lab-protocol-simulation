// src/protocol_host.tsx
//
// WP-3-8 protocol host page entry. Wires every M2 runtime module + every
// M3 shell component into one mountable page that loads a specific
// protocol selected by URL query (?protocol=<name>) or by an inlined
// window.__PROTOCOL_NAME__ fallback set by the per-protocol HTML wrapper.
//
// Mount order:
//   1. Resolve protocol name (query string or window fallback).
//   2. Look up ProtocolConfig from generated/protocols.ts.
//   3. Resolve the entry scene: (1) entry step's optional scene: field;
//      (2) first SceneChange.to_scene in the entry step; (3) throw.
//      For sequence_runner protocols, resolution delegates to the first
//      mini-protocol's entry step. See resolve_entry_scene.ts.
//   4. Run the layout pipeline + renderer to paint #scene-root.
//   5. Build emitter (seeded with initial ShellViewSnapshot), browser
//      scene-op handler, step machine, and click resolver.
//   6. Mount <ProtocolHud /> into #shell-root unless ?shell=off.
//   7. step_machine.start() drives the rest via emitter subscription.
//
// Debug-only query params (documented in seam_interface.md):
//   ?shell=off       -- skip shell mount; runtime still runs.
//   ?walker=expose   -- set window.__shellEmitter for the M4 walker.
//
// References:
//   - docs/active_plans/active/web_ui/runtime_seam_plan.md (WP-3-8)
//   - docs/active_plans/active/web_ui/seam_interface.md (debug flags)
//   - src/shell/adapter/types.ts (closed seam contract)
//   - docs/PRIMARY_CONTRACT.md item 4 (visible UI contract)

import type {
  Gesture,
  ProtocolConfig,
  ProtocolShellEmitter,
  ShellViewSnapshot,
} from "./shell/adapter/types";

import { PROTOCOLS } from "../generated/protocols.js";
import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";

import { runPipeline } from "./scene_runtime/layout/index.js";
import { mountScene, type SceneDispose } from "./scene_runtime/renderer/index.js";
import type { MaterialRegistry } from "./scene_runtime/renderer/visual_state_resolver.js";
import { create_scene_store } from "./scene_runtime/state/scene_store.js";
import { PROTOCOL_MATERIALS } from "../generated/protocol_materials.js";

import { createProtocolShellEmitter } from "./scene_runtime/protocol/emitter.js";
import {
  create_step_machine,
  create_snapshot_reducer,
} from "./scene_runtime/protocol/step_machine.js";
import { create_scene_op_handler } from "./scene_runtime/protocol/scene_operations.js";
import { build_store_scene_op_deps } from "./scene_runtime/protocol/scene_op_deps.js";
import { install_walker_debug_surface } from "./scene_runtime/protocol/walker_debug.js";
import { attach_click_resolver } from "./scene_runtime/protocol/click_resolver.js";
import {
  resolve_entry_scene_name,
  assert_scene_not_empty,
} from "./scene_runtime/protocol/resolve_entry_scene.js";

import { render } from "solid-js/web";
import { subscribeEmitterToSnapshot } from "./shell/signals.js";
import { ProtocolHud } from "./shell/hud/ProtocolHud.js";
import { TypeInput } from "./shell/hud/type_input.js";

//============================================
// Window extensions (debug-only)
//============================================

// Walker exposes the emitter via window.__shellEmitter when
// ?walker=expose is set. Inlined fallback for the protocol name is
// optional and set by the per-protocol HTML wrapper (WP-3-10).
declare global {
  interface Window {
    __shellEmitter?: ProtocolShellEmitter;
    __PROTOCOL_NAME__?: string;
  }
}

//============================================
// Helpers
//============================================

// Read a query param without throwing on missing search string.
function read_query_param(name: string): string | null {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  return params.get(name);
}

// Resolve the active protocol name. URL wins over the inlined fallback.
function resolve_protocol_name(): string {
  const from_url = read_query_param("protocol");
  if (from_url !== null && from_url !== "") {
    return from_url;
  }
  const from_window = window.__PROTOCOL_NAME__;
  if (typeof from_window === "string" && from_window !== "") {
    return from_window;
  }
  throw new Error(
    "protocol_host: no protocol selected (set ?protocol=<name> or window.__PROTOCOL_NAME__)",
  );
}

// resolve_entry_scene_name is imported from resolve_entry_scene.ts.
// See that file for the full precedence spec and sequence_runner delegation logic.
// This thin wrapper binds the module-level PROTOCOLS map so callers in mount()
// do not have to pass it explicitly.
function resolve_entry_scene_name_bound(config: ProtocolConfig): string {
  return resolve_entry_scene_name(config, PROTOCOLS);
}

// Initial snapshot seed. Derived directly from the protocol config so the
// HUD has sensible values before the first event fires.
function build_initial_snapshot(config: ProtocolConfig): ShellViewSnapshot {
  const total_step_count = config.steps?.length ?? config.mini_protocols?.length ?? 0;
  const initial: ShellViewSnapshot = {
    protocol_name: config.protocol_name,
    current_step_name: null,
    current_prompt: null,
    // No step active yet; tip resolves to null until step_started fires.
    current_tip: null,
    current_interaction_index: 0,
    progress: { completed_step_count: 0, total_step_count },
    last_outcome: null,
    pending_validator_kind: null,
    modal: {
      is_open: false,
      kind: null,
      prompt: null,
      choices: [],
      invoking_target: null,
    },
    help: { is_open: false, topic: null },
    tray: { items: [] },
    active_scene_name: null,
    is_complete: false,
    active_interaction_target: null,
    active_interaction_gesture: null,
  };
  return initial;
}

//============================================
// Mount
//============================================

function mount(): void {
  const protocol_name = resolve_protocol_name();

  // Look up the protocol config. PROTOCOLS is a closed record so a
  // missing entry must throw clearly rather than silently no-op.
  const config = PROTOCOLS[protocol_name];
  if (!config) {
    throw new Error(`protocol_host: protocol "${protocol_name}" not found in PROTOCOLS`);
  }
  const active_config = config;

  // Resolve the scene-root and shell-root DOM hosts. Shell mounts as a
  // sibling of scene-root, never as an ancestor (asset-cropping rule).
  const scene_root = document.getElementById("scene-root");
  if (!(scene_root instanceof HTMLElement)) {
    throw new Error("protocol_host: #scene-root element not found");
  }
  const active_scene_root = scene_root;
  const shell_root = document.getElementById("shell-root");
  if (!(shell_root instanceof HTMLElement)) {
    throw new Error("protocol_host: #shell-root element not found");
  }

  // Resolve the entry scene.
  const scene_name = resolve_entry_scene_name_bound(config);

  // WP-FRAME-2: measure actual #scene-root pixel dimensions before running the
  // pipeline. getBoundingClientRect() forces a synchronous layout reflow so the
  // CSS grid and flex sizing is resolved. The bounded panel is NOT full viewport
  // and may have a different aspect ratio than DEFAULT_VIEWPORT (1920x1080).
  // The pipeline's vertical_layout stage uses viewport W/H to compute item heights
  // as percentages. Passing the actual panel size makes item heights correct for
  // the bounded box: rendered pixel aspect = (visualWidth/height) * (panelW/panelH)
  // = aspect_svg (correct). Using the wrong viewport aspect ratio here would cause
  // Guard 5 (structural_guards.ts) to throw an aspect-distortion error.
  function measure_scene_viewport(el: HTMLElement): { w: number; h: number } {
    // Forces a layout reflow. Reliable even in synchronous DOMContentLoaded context.
    const rect = el.getBoundingClientRect();
    // Fail loud: zero dimensions mean CSS has not been applied or the element is
    // not yet in the rendered tree. A silent 1920x1080 fallback would hide a real
    // layout failure and cause incorrect item sizing downstream.
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(
        `protocol_host: #scene-root has zero dimensions (${rect.width}x${rect.height}); CSS may not be applied`,
      );
    }
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    return { w, h };
  }

  // Measure the actual panel size. With CSS aspect-ratio: 16/9 on #scene-root,
  // the panel should be close to 16:9 but the grid layout may constrain it to
  // a non-16:9 size depending on header/guidance bar heights. The measured size
  // is always correct regardless of CSS constraints.
  const scene_viewport = measure_scene_viewport(active_scene_root);

  // Per-protocol material registry (WS-M3-D). Each protocol package carries its
  // own materials.yaml; gen_protocols.py emits PROTOCOL_MATERIALS keyed by
  // protocol_name. A protocol with no materials.yaml has no entry; null then
  // disables material-color resolution (geometry/asset/overlays still resolve).
  // sequence_runner registries aggregate their constituent mini-protocols.
  const material_registry: MaterialRegistry | null = PROTOCOL_MATERIALS[protocol_name] ?? null;

  // Reactive scene store shared by the Solid renderer and the store-driven
  // store-driven scene_operations. The renderer seeds it from each rendered
  // scene's PipelineResult; scene operations write it after a validated
  // interaction, and the Solid renderer reacts. The material registry backs the
  // D1 acceptance check for material_name / held_material_name writes so a
  // registered drug (carboplatin, mtt) is accepted at the store and reaches the
  // well, while an unregistered non-sentinel name is rejected loudly -- the same
  // predicate the Python stepper applies.
  const scene_store = create_scene_store(material_registry);

  // The active scene's Solid root dispose handle. render_scene.ts owns the
  // dispose; protocol_host holds the latest handle so host teardown (and the
  // SceneChange reset path) can release it. mountScene returns the handle and
  // disposes any prior root for the same element internally.
  let active_dispose: SceneDispose | null = null;

  function render_protocol_scene(next_scene_name: string): void {
    const scene = SCENES[next_scene_name];
    if (!scene) {
      throw new Error(
        `protocol_host: scene "${next_scene_name}" not found in SCENES for protocol "${protocol_name}"`,
      );
    }

    const pipeline_result = runPipeline(scene, {
      library: OBJECT_LIBRARY,
      assets: ASSET_SPECS,
      viewport: scene_viewport,
    });

    // WP-RESOLVE-2: fail-loud empty-scene guard (via assert_scene_not_empty).
    // A student-visible protocol must render a non-empty scene. dev_smoke is exempt.
    assert_scene_not_empty(
      pipeline_result.final.length,
      active_config.protocol_type,
      protocol_name,
      next_scene_name,
    );

    // Mount (or re-mount) the Solid scene. mountScene owns the Solid root
    // dispose: a re-render into the same root disposes the prior root first
    // (tracked per-root in render_scene.ts), so a SceneChange re-render leaks no
    // orphan roots/effects/listeners. Pass the measured viewport so Guard 5
    // (aspect ratio) uses the same dimensions as the pipeline.
    active_dispose = mountScene(active_scene_root, pipeline_result, {
      store: scene_store,
      materialRegistry: material_registry,
      viewport: scene_viewport,
    });
    active_scene_root.setAttribute("data-active-scene", next_scene_name);
  }

  render_protocol_scene(scene_name);

  // Build the emitter + step machine + scene-op handler.
  const initial_snapshot = build_initial_snapshot(active_config);
  const reducer = create_snapshot_reducer(active_config);
  const emitter = createProtocolShellEmitter(initial_snapshot, reducer);
  // Store-driven scene-op deps (WS-M3-D). ObjectStateChange/CursorAttach write
  // the reactive store; SceneChange re-renders the target scene through
  // render_protocol_scene (which disposes the prior Solid root and reseeds the
  // store, applying the reset policy) while the deps preserve cursor-held state
  // across the transition; LayoutMove is a reported no-op (Option A); TimedWait
  // keeps observable semantics through the subsequent ObjectStateChange.
  const scene_op_handler = create_scene_op_handler(
    build_store_scene_op_deps(scene_store, render_protocol_scene),
  );
  const step_machine = create_step_machine(active_config, emitter, scene_op_handler);

  // Restore the read-only walker/debug surfaces (window.PROTOCOL_STEPS +
  // window.gameState) the Solid HUD migration dropped. Read-only: the walker
  // and tests read these to observe progress; nothing advances state by writing
  // them. Sourced from the emitter snapshot + step events + the scene store.
  const dispose_walker_surface = install_walker_debug_surface(active_config, emitter, scene_store);

  // Attach the click resolver to the scene root and route to step machine.
  // The click resolver only knows "a scene object was clicked" (gesture
  // "click"). The active interaction's gesture decides what that click counts
  // as: a `select` interaction promotes a click on the active target to a
  // `select` (the student is choosing the next-step object among the present
  // scene objects), so select reuses the same visible-click affordance as click.
  // A click on a non-active target stays "click" and the step machine rejects
  // it (wrong target / wrong order), which is exactly the wrong-selection path.
  attach_click_resolver(active_scene_root, (target: string, gesture: Gesture) => {
    const snapshot = emitter.get_snapshot();
    const active_gesture = snapshot.active_interaction_gesture;
    const resolved_gesture =
      snapshot.active_interaction_target === target && active_gesture !== null
        ? active_gesture
        : gesture;
    step_machine.handle_click(target, resolved_gesture);
  });

  // Mount the visible type-input affordance (WS-M5-ST). It lives in its own
  // overlay container appended to the document body so it works whether or not
  // the HUD shell is mounted (?shell=off). It shows only while the active
  // interaction's gesture is `type`; a real fill + commit routes the typed text
  // to step_machine.handle_type_commit (the only advance path), which validates
  // it via the interaction's target_with_value preset.
  const type_input_root = document.createElement("div");
  type_input_root.id = "type-input-root";
  document.body.appendChild(type_input_root);
  const type_snapshot_signal = subscribeEmitterToSnapshot(emitter);
  const dispose_type_input = render(
    () => (
      <TypeInput
        snapshot={type_snapshot_signal}
        on_commit={(target: string, typed_text: string) =>
          step_machine.handle_type_commit(target, typed_text)
        }
      />
    ),
    type_input_root,
  );

  // Optional shell mount. ?shell=off keeps the runtime running but
  // leaves the shell DOM empty for independence testing (WP-3-11).
  const shell_off = read_query_param("shell") === "off";
  if (!shell_off) {
    const snapshot_signal = subscribeEmitterToSnapshot(emitter);
    // Pass config.steps to ProtocolHud so the read-only step outline can render.
    // sequence_runner protocols have no steps list; mini_protocols and dev_smoke do.
    const protocol_steps = active_config.steps ?? [];
    render(() => <ProtocolHud snapshot={snapshot_signal} steps={protocol_steps} />, shell_root);
  }

  // Walker hook. Off by default; only consumed by the M4 walker.
  const walker_expose = read_query_param("walker") === "expose";
  if (walker_expose) {
    window.__shellEmitter = emitter;
  }

  // Host teardown: dispose the active Solid root and the walker/debug surface
  // on page hide so no orphan effects/listeners/globals survive navigation away
  // (plan "Lifecycle cleanup + ownership"). pagehide fires on both unload and
  // bfcache eviction; once is enough.
  window.addEventListener(
    "pagehide",
    () => {
      if (active_dispose !== null) {
        active_dispose();
        active_dispose = null;
      }
      dispose_type_input();
      if (type_input_root.parentNode !== null) {
        type_input_root.parentNode.removeChild(type_input_root);
      }
      dispose_walker_surface();
    },
    { once: true },
  );

  // Kick the machine. Emits protocol_loaded + step_started.
  step_machine.start();
}

//============================================
// Entry
//============================================

mount();
