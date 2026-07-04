// tests/playwright/helper_scene_reactivity_harness.tsx
//
// TEST-ONLY harness entry (helper_-prefixed; never a production route).
// Bundled on the fly by test_scene_reactivity_lifecycle.mjs with esbuild +
// esbuild-plugin-solid, served, and driven by Playwright to prove the Solid
// scene renderer's runtime behavior:
//   - keyed/localized updates: an ObjectStateChange-style store write updates
//     only the affected item (same DOM node, same data-item-id, bbox stable),
//     never remounting the scene root or unaffected items.
//   - lifecycle: mountScene disposes the prior Solid root before mounting a new
//     one, and the returned dispose tears the scene down (no orphan children).
//
// This harness mounts the SAME mountScene + scene_store used in production.
// It writes the store directly (the WS-M3-D runtime bridge does not exist yet),
// which is legitimate for a renderer unit test: it exercises the reactive path
// the production scene-op layer will drive. It is NOT a walker and never claims
// contract item 4.

import { runPipeline } from "../../src/scene_runtime/layout/index.js";
import { mountScene } from "../../src/scene_runtime/renderer/index.js";
import { create_scene_store, type SceneStore } from "../../src/scene_runtime/state/scene_store.js";
import { SCENES } from "../../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../../generated/object_library.js";

interface Harness {
  mount(scene_name: string): void;
  remount(scene_name: string): void;
  dispose(): void;
  set_state(target: string, partial: Record<string, string | number | boolean>): void;
  store: SceneStore;
}

declare global {
  interface Window {
    __harness: Harness;
  }
}

function get_root(): HTMLElement {
  const root = document.getElementById("scene-root");
  if (!(root instanceof HTMLElement)) {
    throw new Error("harness: #scene-root not found");
  }
  return root;
}

const store = create_scene_store();
let current_dispose: (() => void) | null = null;

function mount(scene_name: string): void {
  const scene = SCENES[scene_name];
  if (!scene) {
    throw new Error(`harness: unknown scene ${scene_name}`);
  }
  const result = runPipeline(scene, { library: OBJECT_LIBRARY, assets: ASSET_SPECS });
  current_dispose = mountScene(get_root(), result, { store, materialRegistry: null });
}

function dispose(): void {
  if (current_dispose) {
    current_dispose();
    current_dispose = null;
  }
}

window.__harness = {
  store,
  mount,
  remount: mount,
  dispose,
  set_state(target: string, partial: Record<string, string | number | boolean>): void {
    store.set_object_state(target, partial);
  },
};
