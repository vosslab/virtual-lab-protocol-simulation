// Report-only per-item off-canvas classification.
//
// The validate phase's clampSceneBounds measures overflow at the ZONE bbox
// level, which under-counts: a single item that has fallen entirely off the
// canvas is averaged into a zone bbox that may still touch scene_bounds. This
// module classifies EACH item independently against scene_bounds and grades it:
//
//   - fully_off_canvas: the item's whole artwork box sits outside scene_bounds
//     (no intersection at all). Graded "error" -- the object is invisible.
//   - partial_overflow: the box crosses a scene_bounds edge but still overlaps
//     the canvas. Graded "warning"; the warning magnitude scales with how far
//     the box escapes (worst-axis overshoot, scene-percent).
//
// This diagnostic is REPORT-ONLY. It is intentionally NOT a build-gate
// SeverityDiagnostic (severity_model.ts): nothing reads an OffCanvasDiagnostic
// to fail or block a build. It is a separate, informational stream surfaced on
// PipelineResult.offCanvasDiagnostics for audit tooling and the committed
// baseline. Promotion to a hard gate is out of scope and would require a
// vocabulary edit in severity_model.ts.
//
// All coordinates are scene-percent (0..100 per axis), matching the layout
// engine convention. The classifier reads only the item's artwork box
// (_centerX / _visualWidth / _top / _height); it never mutates the item.

import type { ComputedItem, SceneBoundsRect, Zone } from "../types.js";

//============================================
// Float-noise slack
//============================================

// Scene-percent slack. A fitted item can land exactly on a scene edge, which
// IEEE-754 rounding nudges a few 1e-15 past the bound. Only an escape larger
// than this counts; it matches the BOUNDS_EPSILON the zone-level validate uses.
const OFFCANVAS_EPSILON = 0.001;

//============================================
// Partial-overflow magnitude tiers
//============================================

// Worst-axis overshoot (scene-percent) below this is a minor partial overflow.
const MINOR_TIER_MAX = 2.0;
// Worst-axis overshoot (scene-percent) below this is a moderate partial overflow.
const MODERATE_TIER_MAX = 8.0;

// Ordered partial-overflow magnitude tiers, ascending. The warning severity of a
// partial overflow scales along this order: a larger worst-axis overshoot maps to
// a later tier. The exact thresholds are tunable; the ORDER is the contract.
export const OFFCANVAS_TIERS = ["minor", "moderate", "severe"] as const;

export type OffCanvasTier = (typeof OFFCANVAS_TIERS)[number];

// Map a worst-axis overshoot magnitude (scene-percent) to its tier. Monotonic:
// a larger magnitude never maps to an earlier tier.
export function offCanvasTier(worstOverflow: number): OffCanvasTier {
  if (worstOverflow < MINOR_TIER_MAX) return "minor";
  if (worstOverflow < MODERATE_TIER_MAX) return "moderate";
  return "severe";
}

//============================================
// Diagnostic record
//============================================

// How an item escapes scene_bounds. fully_off_canvas means the whole box is
// outside (no intersection); partial_overflow means the box crosses an edge but
// still overlaps the canvas.
export type OffCanvasClass = "fully_off_canvas" | "partial_overflow";

// Report-only grade. "error" for a fully off-canvas item (invisible art);
// "warning" for a partial overflow. This is NOT the build-gate
// DiagnosticSeverity; it never fails a build.
export type OffCanvasSeverity = "error" | "warning";

// Per-edge overshoot past scene_bounds (scene-percent). Each value is the signed
// distance the box escapes that edge, clamped at 0 (0 = inside that edge).
export interface OffCanvasOverflow {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

// One report-only off-canvas finding for a single item.
export interface OffCanvasDiagnostic {
  readonly scene: string;
  readonly zone: string;
  readonly placementName: string;
  readonly classification: OffCanvasClass;
  readonly severity: OffCanvasSeverity;
  // Per-edge overshoot (scene-percent), for a fixable message.
  readonly overflow: OffCanvasOverflow;
  // The worst single-axis overshoot (scene-percent); the magnitude the warning
  // tier scales on.
  readonly worstOverflow: number;
  // The magnitude tier of worstOverflow (minor / moderate / severe).
  readonly tier: OffCanvasTier;
}

//============================================
// Classification
//============================================

// Round a scene-percent length to 2 decimals for a clean, stable record.
function round2(value: number): number {
  return Number(value.toFixed(2));
}

// Classify a single item against scene_bounds. Returns an OffCanvasDiagnostic
// when the item escapes (fully or partially), or undefined when the item sits
// inside scene_bounds (within float-noise slack). Pure: reads only the artwork
// box, mutates nothing.
export function classifyItemOffCanvas(
  item: ComputedItem,
  sceneBounds: SceneBoundsRect,
  sceneName: string,
): OffCanvasDiagnostic | undefined {
  // Artwork box edges (scene-percent).
  const left = item._centerX - item._visualWidth / 2;
  const right = item._centerX + item._visualWidth / 2;
  const top = item._top;
  const bottom = item._top + item._height;

  // Signed overshoot past each bound (positive = how far the box escapes).
  const overLeft = Math.max(0, sceneBounds.left - left);
  const overRight = Math.max(0, right - sceneBounds.right);
  const overTop = Math.max(0, sceneBounds.top - top);
  const overBottom = Math.max(0, bottom - sceneBounds.bottom);
  const worst = Math.max(overLeft, overRight, overTop, overBottom);

  // No real escape on any axis: the item is inside scene_bounds.
  if (worst <= OFFCANVAS_EPSILON) return undefined;

  // The box intersects the canvas when it overlaps on BOTH axes by more than the
  // slack. A fully off-canvas box fails the overlap test on at least one axis.
  const intersects =
    left < sceneBounds.right - OFFCANVAS_EPSILON &&
    right > sceneBounds.left + OFFCANVAS_EPSILON &&
    top < sceneBounds.bottom - OFFCANVAS_EPSILON &&
    bottom > sceneBounds.top + OFFCANVAS_EPSILON;

  const classification: OffCanvasClass = intersects ? "partial_overflow" : "fully_off_canvas";
  const severity: OffCanvasSeverity = classification === "fully_off_canvas" ? "error" : "warning";

  const overflow: OffCanvasOverflow = {
    left: round2(overLeft),
    right: round2(overRight),
    top: round2(overTop),
    bottom: round2(overBottom),
  };
  const worstOverflow = round2(worst);

  // Assemble the full record, then return it (no inline object in return).
  const diagnostic: OffCanvasDiagnostic = {
    scene: sceneName,
    zone: item.zone,
    placementName: item.placement_name,
    classification,
    severity,
    overflow,
    worstOverflow,
    tier: offCanvasTier(worst),
  };
  return diagnostic;
}

// Classify every item in a per-zone layout map against scene_bounds. Returns one
// OffCanvasDiagnostic per escaping item, in zone order then item order. An empty
// list means no item escapes scene_bounds. Report-only: the input map is read,
// never mutated. Scenes without scene_bounds cannot be checked and return [].
export function collectOffCanvasDiagnostics(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect | undefined,
  sceneName = "",
): OffCanvasDiagnostic[] {
  const findings: OffCanvasDiagnostic[] = [];
  if (!sceneBounds) return findings;

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    for (const item of items) {
      const finding = classifyItemOffCanvas(item, sceneBounds, sceneName);
      if (finding !== undefined) findings.push(finding);
    }
  }
  return findings;
}
