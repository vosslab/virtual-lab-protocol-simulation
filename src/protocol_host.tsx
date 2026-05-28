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
//   3. Resolve the entry scene (first SceneChange's to_scene, or a
//      protocol.entry_scene field, or the protocol's local scene).
//   4. Run the layout pipeline + renderer to paint #scene-root.
//   5. Build emitter (seeded with initial ShellViewSnapshot), scene-op
//      handler (stubbed deps; renderer integration is M2-3 follow-up),
//      step machine, and click resolver.
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
  ObjectStateChangeOp,
  CursorAttachOp,
  Gesture,
  LayoutMoveOp,
  ProtocolConfig,
  ProtocolShellEmitter,
  SceneChangeOp,
  ShellViewSnapshot,
  TimedWaitOp,
} from "./shell/adapter/types";

import { PROTOCOLS } from "../generated/protocols.js";
import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";

import { runPipeline } from "./scene_runtime/layout/index.js";
import { renderScene } from "./scene_runtime/renderer/index.js";

import { createProtocolShellEmitter } from "./scene_runtime/protocol/emitter.js";
import {
  create_step_machine,
  create_snapshot_reducer,
} from "./scene_runtime/protocol/step_machine.js";
import {
  create_scene_op_handler,
  type SceneOpDeps,
} from "./scene_runtime/protocol/scene_operations.js";
import { attach_click_resolver } from "./scene_runtime/protocol/click_resolver.js";

import { render } from "solid-js/web";
import { subscribeEmitterToSnapshot } from "./shell/signals.js";
import { ProtocolHud } from "./shell/hud/ProtocolHud.js";

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

// Resolve the entry scene name for a protocol. Order of precedence:
//   1. The first SceneChange operation in the protocol's entry step.
//   2. A protocol.entry_scene field, if present.
//   3. The protocol package's local scene, if discoverable in SCENES.
// Throws with a clear message if none of these resolve.
function resolve_entry_scene_name(config: ProtocolConfig): string {
  if (config.entry_scene && config.entry_scene !== "") {
    return config.entry_scene;
  }
  // Walk the entry step's sequence and pick the first SceneChange.
  const steps = config.steps ?? [];
  for (const step of steps) {
    if (step.step_name !== config.entry_step) {
      continue;
    }
    for (const interaction of step.sequence) {
      for (const op of interaction.response.scene_operations) {
        if (op.type === "SceneChange") {
          return op.to_scene;
        }
      }
    }
  }
  // Fall back to a protocol-local scene name guess: many packages
  // expose <protocol_name>_<scene_file>. Look for SCENES keys that
  // start with the protocol name.
  const scene_keys = Object.keys(SCENES);
  const prefix = `${config.protocol_name}_`;
  for (const key of scene_keys) {
    if (key.startsWith(prefix)) {
      return key;
    }
  }
  throw new Error(
    `protocol_host: cannot resolve entry scene for protocol "${config.protocol_name}"`,
  );
}

// Initial snapshot seed. Derived directly from the protocol config so the
// HUD has sensible values before the first event fires.
function build_initial_snapshot(config: ProtocolConfig): ShellViewSnapshot {
  const total_step_count = config.steps?.length ?? config.mini_protocols?.length ?? 0;
  const initial: ShellViewSnapshot = {
    protocol_name: config.protocol_name,
    current_step_name: null,
    current_prompt: null,
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

// Stub scene-op deps. All five operations (ObjectStateChange, CursorAttach,
// SceneChange, LayoutMove, TimedWait) console.warn for now. Full renderer
// integration is deferred to WP-2-3.
function build_stub_scene_op_deps(): SceneOpDeps {
  const deps: SceneOpDeps = {
    apply_object_state(op: ObjectStateChangeOp): void {
      // eslint-disable-next-line no-console
      console.warn(`protocol_host scene-op stub: ObjectStateChange target=${op.target}`);
    },
    apply_cursor_attach(op: CursorAttachOp): void {
      // eslint-disable-next-line no-console
      console.warn(
        `protocol_host scene-op stub: CursorAttach target=${op.target} op=${op.operation}`,
      );
    },
    apply_scene_change(op: SceneChangeOp): void {
      // eslint-disable-next-line no-console
      console.warn(`protocol_host scene-op stub: SceneChange to_scene=${op.to_scene}`);
    },
    apply_layout_move(op: LayoutMoveOp): void {
      // eslint-disable-next-line no-console
      console.warn(`protocol_host scene-op stub: LayoutMove target=${op.target} zone=${op.zone}`);
    },
    start_timed_wait(op: TimedWaitOp): void {
      // eslint-disable-next-line no-console
      console.warn(
        `protocol_host scene-op stub: TimedWait target=${op.target} duration_min=${op.duration_min}`,
      );
    },
  };
  return deps;
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

  // Resolve the scene-root and shell-root DOM hosts. Shell mounts as a
  // sibling of scene-root, never as an ancestor (asset-cropping rule).
  const scene_root = document.getElementById("scene-root");
  if (!(scene_root instanceof HTMLElement)) {
    throw new Error("protocol_host: #scene-root element not found");
  }
  const shell_root = document.getElementById("shell-root");
  if (!(shell_root instanceof HTMLElement)) {
    throw new Error("protocol_host: #shell-root element not found");
  }

  // Resolve and load the entry scene.
  const scene_name = resolve_entry_scene_name(config);
  const scene = SCENES[scene_name];
  if (!scene) {
    throw new Error(
      `protocol_host: scene "${scene_name}" not found in SCENES for protocol "${protocol_name}"`,
    );
  }

  // Layout + render pass into #scene-root.
  const pipeline_result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
  });
  renderScene(scene_root, pipeline_result);

  // Build the emitter + step machine + scene-op handler.
  const initial_snapshot = build_initial_snapshot(config);
  const reducer = create_snapshot_reducer(config);
  const emitter = createProtocolShellEmitter(initial_snapshot, reducer);
  const scene_op_handler = create_scene_op_handler(build_stub_scene_op_deps());
  const step_machine = create_step_machine(config, emitter, scene_op_handler);

  // Attach the click resolver to the scene root and route to step machine.
  attach_click_resolver(scene_root, (target: string, gesture: Gesture) => {
    step_machine.handle_click(target, gesture);
  });

  // Optional shell mount. ?shell=off keeps the runtime running but
  // leaves the shell DOM empty for independence testing (WP-3-11).
  const shell_off = read_query_param("shell") === "off";
  if (!shell_off) {
    const snapshot_signal = subscribeEmitterToSnapshot(emitter);
    render(() => <ProtocolHud snapshot={snapshot_signal} />, shell_root);
  }

  // Walker hook. Off by default; only consumed by the M4 walker.
  const walker_expose = read_query_param("walker") === "expose";
  if (walker_expose) {
    window.__shellEmitter = emitter;
  }

  // Kick the machine. Emits protocol_loaded + step_started.
  step_machine.start();
}

//============================================
// Entry
//============================================

mount();
