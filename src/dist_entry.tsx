// src/dist_entry.tsx
//
// WP-3-10 single-bundle dist entry. One esbuild output (dist/main.js) is
// shared by every page in dist/:
//
//   - dist/index.html        -> #launcher-root present -> launcher mount
//   - dist/<protocol>.html   -> #scene-root + #shell-root + window.__PROTOCOL_NAME__
//                                -> protocol_host mount
//   - dist/bench_basic.html  -> #scene-root only, no protocol name
//                                -> bench mount (legacy src/main.ts behavior)
//
// Routing is by DOM presence, not by URL. Each page declares its intent
// by which root elements it includes. The entry runs the matching module
// and ignores the rest. No untyped globals are added.
//
// References:
//   - docs/active_plans/active/web_ui/runtime_seam_plan.md (WP-3-10)
//   - docs/PRIMARY_CONTRACT.md item 1 (TypeScript runtime is shared)

//============================================
// Bench (legacy main.ts) mount
//============================================

// Inline the bench bootstrap so we do not need a second esbuild entry.
// Mirrors src/main.ts. The bench scene is preserved as a render smoke target;
// see tools/run_smoke.py.
async function mount_bench(root: HTMLElement): Promise<void> {
  const { SCENES } = await import("../generated/scenes.js");
  const { OBJECT_LIBRARY, ASSET_SPECS } = await import("../generated/object_library.js");
  const { runPipeline } = await import("./scene_runtime/layout/index.js");
  const { renderScene } = await import("./scene_runtime/renderer/index.js");

  const scene = SCENES.hood_basic;
  if (!scene) {
    throw new Error("Scene hood_basic not found in SCENES index");
  }
  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
  });
  renderScene(root, result);
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
  // present we treat it as bench. Launcher uses its own dedicated root.
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
    return mount_bench(scene_root);
  }
  throw new Error("dist_entry: no recognized root element (#launcher-root or #scene-root)");
}

route().catch((err: unknown) => {
  // Surface routing or mount failures loudly. The page will be blank
  // anyway, so console.error is the only useful escape valve.
  // eslint-disable-next-line no-console
  console.error("dist_entry failed:", err);
  throw err;
});
