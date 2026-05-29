// src/dist_entry.tsx
//
// WP-3-10 single-bundle dist entry. One esbuild output (dist/main.js) is
// shared by every page in dist/:
//
//   - dist/index.html        -> #launcher-root present -> launcher mount
//   - dist/<protocol>.html   -> #scene-root + #shell-root + window.__PROTOCOL_NAME__
//                                -> protocol_host mount
//   - dist/scene_viewer.html -> #scene-root only, no protocol name, ?scene=<name>
//                                -> scene viewer mount (defaults to hood_basic when
//                                   ?scene= is absent; also serves as bench smoke target)
//
// Note: dist/bench_basic.html loads protocol_host.js, not main.js, so this
// entry never routes bench_basic.html traffic. The scene viewer path above is
// the correct route for standalone scene display via this bundle.
//
// Routing is by DOM presence, not by URL. Each page declares its intent
// by which root elements it includes. The entry runs the matching module
// and ignores the rest. No untyped globals are added.
//
// References:
//   - docs/active_plans/active/web_ui/runtime_seam_plan.md (WP-3-10)
//   - docs/PRIMARY_CONTRACT.md item 1 (TypeScript runtime is shared)

//============================================
// Scene viewer mount (replaces legacy bench mount)
//============================================

// Renders any named scene without a protocol. The scene name is read from
// the ?scene= URL search param, defaulting to hood_basic when absent.
// On success or recoverable error, sets data-viewer-ready="true" on root
// so automated tools can tell the viewer finished from a page load failure.
async function mount_scene_viewer(root: HTMLElement, scene_name: string): Promise<void> {
  const { SCENES } = await import("../generated/scenes.js");
  const { OBJECT_LIBRARY, ASSET_SPECS } = await import("../generated/object_library.js");
  const { runPipeline } = await import("./scene_runtime/layout/index.js");
  const { renderScene } = await import("./scene_runtime/renderer/index.js");

  // Guard: unknown scene -> visible error banner, no throw.
  const scene = SCENES[scene_name];
  if (!scene) {
    const banner = document.createElement("div");
    banner.style.cssText =
      "padding:1rem;background:#fee;border:2px solid #c00;color:#900;font-family:monospace;";
    banner.textContent = `Scene viewer error: unknown scene "${scene_name}". Check the ?scene= parameter.`;
    root.appendChild(banner);
    // Mark ready so tools know the viewer ran (even on error path).
    root.setAttribute("data-viewer-ready", "true");
    return;
  }

  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
  });
  renderScene(root, result);
  // Mark ready after a successful render.
  root.setAttribute("data-viewer-ready", "true");
}

//============================================
// Launcher mount
//============================================

async function mount_launcher(root: HTMLElement): Promise<void> {
  const { render } = await import("solid-js/web");
  const { PROTOCOLS_INDEX_SLIM } = await import("../generated/protocols_index_slim.js");
  const { Launcher } = await import("./launcher/Launcher.js");
  render(() => <Launcher index={PROTOCOLS_INDEX_SLIM} />, root);
}

//============================================
// Protocol host mount
//============================================

async function mount_protocol_host(): Promise<void> {
  // The host module wires every M2 runtime + M3 shell binding. Its
  // top-level call site mounts on import, so a dynamic import is enough.
  await import("./protocol_host.js");
}

//============================================
// Route
//============================================

function route(): Promise<void> {
  // Order matters. Protocol host is the most specific: it requires a
  // protocol name set on window AND a scene-root. If only scene-root is
  // present, check for ?scene= to use the scene viewer, else fall back
  // to bench (hood_basic). Launcher uses its own dedicated root.
  const launcher_root = document.getElementById("launcher-root");
  if (launcher_root instanceof HTMLElement) {
    return mount_launcher(launcher_root);
  }
  const scene_root = document.getElementById("scene-root");
  if (scene_root instanceof HTMLElement) {
    const has_protocol_name =
      typeof window.__PROTOCOL_NAME__ === "string" && window.__PROTOCOL_NAME__ !== "";
    const has_shell_root = document.getElementById("shell-root") instanceof HTMLElement;
    if (has_protocol_name && has_shell_root) {
      return mount_protocol_host();
    }
    // Scene viewer: activated when no protocol name is set. Read ?scene=
    // from the URL; fall back to hood_basic when absent (bench smoke target).
    const url_params = new URLSearchParams(window.location.search);
    const scene_param = url_params.get("scene");
    const scene_name = scene_param !== null && scene_param !== "" ? scene_param : "hood_basic";
    return mount_scene_viewer(scene_root, scene_name);
  }
  throw new Error("dist_entry: no recognized root element (#launcher-root or #scene-root)");
}

route().catch((err: unknown) => {
  // Surface routing or mount failures loudly for unexpected errors
  // (e.g. dynamic import failures). Known recoverable errors (unknown scene)
  // are handled inside mount_scene_viewer and never reach here.
  // eslint-disable-next-line no-console
  console.error("dist_entry failed:", err);
  // Do NOT rethrow: rethrowing leaves a blank page with no user-visible
  // feedback. The console.error above is the only useful signal.
});
