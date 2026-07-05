// Public surface for the layout diagnostics layer.
//
// Three concerns, kept separate per the ratified contract:
// - severity_model: the closed severity table + typed graded diagnostic.
// - payload: the actionable payload for the two overlap Errors.
// - decision_metadata: per-scene/per-zone decision metadata (NOT a diagnostic).

export {
  SEVERITY_DIAGNOSTIC_CODES,
  SEVERITY_TABLE,
  BUILD_GATE_EXEMPT_SCENES,
  isBuildGateExemptScene,
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

export { buildUnifiedDiagnostics } from "./unified.js";
export type { UnifiedDiagnostic, UnifiedDiagnosticSource } from "./unified.js";

export { promoteBelowViewport, collectUnfittableAssets } from "./promote.js";

// ITEM_OVERLAP_TOLERANCE_PCT, itemBbox, bboxesIntersect, bboxArea,
// intersectionArea, itemOverlapPercent, collectItemOverlapDiagnostics omitted:
// no consumer imports them via this barrel; every real consumer imports
// directly from "./item_overlap.js" (grep confirmed zero imports via
// diagnostics/index.js or layout/index.js for these symbols).
