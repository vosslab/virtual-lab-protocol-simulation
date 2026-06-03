// Public surface for the renderer. Consumers import from this module.
// Internal helpers (injectSvgInto) stay private.

export { renderScene, mountScene } from "./render_scene.js";
export type { SceneDispose, MountSceneOptions } from "./render_scene.js";
export { SceneView, build_seed_list } from "./scene_view.js";
export { SceneItem } from "./scene_item.js";
export { renderBackground } from "./render_background.js";
