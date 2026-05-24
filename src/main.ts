// Entry point: bench_basic scene hardcoded.
// Loads scene, runs pipeline, renders to DOM.

import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";
import { runPipeline } from "./scene_runtime/layout/index.js";
import { renderScene } from "./scene_runtime/renderer/index.js";

//============================================

// Get the root element. Throws if missing.
const root = document.getElementById("scene-root");
if (!root) {
  throw new Error("#scene-root element not found in DOM");
}

// Load hardcoded bench_basic scene.
const scene = SCENES.hood_basic;
if (!scene) {
  throw new Error("Scene bench_basic not found in SCENES index");
}

// Run the layout pipeline with resolved libraries.
const result = runPipeline(scene, {
  library: OBJECT_LIBRARY,
  assets: ASSET_SPECS,
});

// Render the scene to the DOM.
renderScene(root, result);
