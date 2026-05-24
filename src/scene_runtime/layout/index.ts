// Public surface for the layout engine. Renderers, validators, and tests
// import from this module. Internal helpers stay in their own files.

export * from "./constants.js";
export * from "./types.js";
export { WORKSPACE_ROW_LIBRARY } from "./workspace_row_library.js";
export { normalizeSchema } from "./normalize_schema.js";
export { resolveInheritance } from "./resolve_inheritance.js";
export { bindObjects } from "./bind_objects.js";
export { scaleToRealWorld } from "./scale_to_real_world.js";
export { groupByZone } from "./group_by_zone.js";
export { horizontalLayout } from "./horizontal_layout.js";
export { verticalLayout } from "./vertical_layout.js";
export { layoutLabels } from "./layout_labels.js";
export { clampSceneBounds } from "./clamp_scene_bounds.js";
export { runPipeline } from "./run_pipeline.js";
export { wrapLabel } from "./wrap_label.js";
export {
  depthFor,
  footprintFor,
  visualWidthFor,
  widthScaleFor,
} from "./footprint.js";
export {
  DEMO_OBJECT_LIBRARY,
  DEMO_ASSET_SPECS,
} from "./__fixtures__/demo_library.js";
