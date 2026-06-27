// Public surface for the layout diagnostics layer.
//
// Three concerns, kept separate per the ratified contract:
// - severity_model: the closed severity table + typed graded diagnostic.
// - payload: the actionable payload for the two overlap Errors.
// - decision_metadata: per-scene/per-zone decision metadata (NOT a diagnostic).

export {
  SEVERITY_DIAGNOSTIC_CODES,
  SEVERITY_TABLE,
  severityRuleFor,
  buildDiagnostic,
  failsBuild,
  countBuildFailures,
} from "./severity_model.js";
export type {
  SeverityDiagnosticCode,
  DiagnosticSeverity,
  DiagnosticOwner,
  YamlPointerLevel,
  SeverityRule,
  YamlPointer,
  SeverityDiagnostic,
} from "./severity_model.js";

export { buildActionablePayload } from "./payload.js";
export type { ActionablePayload, AttemptedMove } from "./payload.js";

export {
  OFFCANVAS_TIERS,
  offCanvasTier,
  classifyItemOffCanvas,
  collectOffCanvasDiagnostics,
} from "./offcanvas.js";
export type {
  OffCanvasTier,
  OffCanvasClass,
  OffCanvasSeverity,
  OffCanvasOverflow,
  OffCanvasDiagnostic,
} from "./offcanvas.js";

export { buildRowZoneDecision, buildDecisionMetadata } from "./decision_metadata.js";
export type { ZoneDecision, DecisionMetadata } from "./decision_metadata.js";
