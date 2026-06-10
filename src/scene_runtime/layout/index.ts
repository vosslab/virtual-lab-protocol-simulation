// Public surface for the layout engine. Renderers, validators, and tests
// import from this module. Internal helpers stay in their own files.

// Named re-exports from constants: only symbols imported by code outside
// src/scene_runtime/layout/. Internal-only constants remain unexported here.
export { DEFAULT_VIEWPORT, PX_PER_SCENE_PERCENT, WORKSPACE_PX_PER_CM } from "./constants.js";

export * from "./types.js";
export { normalizeSchema } from "./normalize_schema.js";
export { resolveInheritance } from "./resolve_inheritance.js";
export { bindObjects } from "./bind_objects.js";
export { scaleToRealWorld } from "./scale_to_real_world.js";
export { groupByZone } from "./group_by_zone.js";
export { horizontalLayout } from "./horizontal_layout.js";
export { verticalLayout } from "./vertical_layout.js";
export { layoutLabels, resolveLabelCollisions } from "./layout_labels.js";
export { clampSceneBounds } from "./clamp_scene_bounds.js";
export { runPipeline } from "./run_pipeline.js";
export { wrapLabel } from "./wrap_label.js";
// depthFor, footprintFor, visualWidthFor, widthScaleFor omitted: no consumer
// outside src/scene_runtime/layout/ (grep confirmed zero imports).
export { DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS } from "./__fixtures__/demo_library.js";
export { resolveConfig, buildGlobalDefaults } from "./config/index.js";
export type {
  LayoutConfig,
  SpacingConfig,
  PackerConfig,
  ZoneLayoutConfig,
} from "./config/index.js";
// PHASE_ORDER, PLACEMENT_PHASES, runPhases, Phase, PhaseName, LayoutContext omitted:
// used only by run_pipeline.ts internally (grep confirmed zero external imports).
export {
  SEVERITY_TABLE,
  severityRuleFor,
  buildDiagnostic,
  failsBuild,
  countBuildFailures,
  buildActionablePayload,
  buildRowZoneDecision,
  buildDecisionMetadata,
} from "./diagnostics/index.js";
// SEVERITY_DIAGNOSTIC_CODES omitted: no external consumer (grep confirmed zero imports).
// SeverityDiagnosticCode kept as a discriminant type for test assertions.
export type {
  SeverityDiagnosticCode,
  DiagnosticSeverity,
  DiagnosticOwner,
  YamlPointerLevel,
  SeverityRule,
  YamlPointer,
  SeverityDiagnostic,
  ActionablePayload,
  AttemptedMove,
  ZoneDecision,
  DecisionMetadata,
} from "./diagnostics/index.js";
