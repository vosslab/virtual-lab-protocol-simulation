// Report-only bounds validation: measures per-zone overflow; does not mutate positions.
//
// For each zone the phase computes the item bbox and checks whether any edge
// escapes scene_bounds. When overflow is detected it records a
// zone_clamped_to_bounds warn (dx/dy = measured overshoot, not an applied
// shift) in the runtime diagnostics stream, and pushes a structured
// unresolved_overlap SeverityDiagnostic into the overflows sink carrying the
// actionable payload (scene, zone, items, depth, area, available area, and a
// suggested YAML fix). The phase returns its input map unchanged.
//
// The vertical auto-fit shrinks tall items to fit their zone, so the common
// overflow source is gone before this phase runs. A non-empty overflows list
// means an item still escaped at the MIN_SCALE floor -- a real unresolvable
// overflow. Float-noise touches (within BOUNDS_EPSILON) are ignored so
// boundary-touching items are not flagged.

import { buildActionablePayload } from "./diagnostics/payload.js";
import { buildDiagnostic } from "./diagnostics/severity_model.js";
import type { SeverityDiagnostic } from "./diagnostics/severity_model.js";
import type { ComputedItem, Diagnostics, SceneBoundsRect, Zone } from "./types.js";

// Float-noise slack (scene-percent). The vertical auto-fit lands a fitted item
// exactly on the zone/scene edge, which IEEE-754 rounding can push a few 1e-15
// past the bound. Only an overshoot larger than this counts as a real escape, so
// boundary-touching items are not flagged. A genuine unfittable overflow is many
// percent, far above this slack.
const BOUNDS_EPSILON = 0.001;

// One measured per-zone overflow that could not be resolved by fit/shrink.
export interface BoundsOverflow {
  readonly diagnostic: SeverityDiagnostic;
}

// The report-only validate pass. It returns the input layout unchanged (no
// position mutation) and pushes:
//   - a zone_clamped_to_bounds warn into the runtime `diagnostics` stream for
//     any zone whose bbox still escapes scene_bounds (kept so existing tooling
//     that reads the runtime diagnostic kinds still sees the measurement), and
//   - a structured unresolved_overlap SeverityDiagnostic into `overflows` for
//     each such zone, carrying the actionable payload.
// run_pipeline collects `overflows` and surfaces the Errors on its result.
export function clampSceneBounds(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneBounds: SceneBoundsRect | undefined,
  diagnostics: Diagnostics = [],
  overflows: BoundsOverflow[] = [],
  sceneName = "",
): Map<string, ComputedItem[]> {
  if (!sceneBounds) return zoneLayouts;

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    if (items.length === 0) continue;

    // Measure the zone's item bbox.
    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxBottom = -Infinity;
    for (const it of items) {
      const left = it._x - it._visualWidth / 2;
      const right = it._x + it._visualWidth / 2;
      if (left < minLeft) minLeft = left;
      if (right > maxRight) maxRight = right;
      if (it._top < minTop) minTop = it._top;
      const bot = it._top + it._height;
      if (bot > maxBottom) maxBottom = bot;
    }

    // Signed overshoot past each scene bound (positive = how far it escapes).
    const overLeft = Math.max(0, sceneBounds.left - minLeft);
    const overRight = Math.max(0, maxRight - sceneBounds.right);
    const overTop = Math.max(0, sceneBounds.top - minTop);
    const overBottom = Math.max(0, maxBottom - sceneBounds.bottom);
    const overX = Math.max(overLeft, overRight);
    const overY = Math.max(overTop, overBottom);

    // Only a real (above float-noise) escape is reported.
    if (overX <= BOUNDS_EPSILON && overY <= BOUNDS_EPSILON) continue;

    // Runtime-stream measurement (no mutation). Kept under the existing
    // zone_clamped_to_bounds kind so current tooling still sees the overflow;
    // dx/dy now report the measured overshoot rather than an applied shift.
    diagnostics.push({
      stage: "clamp",
      severity: "warn",
      kind: "zone_clamped_to_bounds",
      zone: zone.id,
      dx: Number(overX.toFixed(2)),
      dy: Number(overY.toFixed(2)),
    });

    // Structured, fixable Error. The remaining overlap depth is the worst-axis
    // overshoot; the overlap area approximates the escaped strip; available area
    // is the zone's interior. The fit stage already attempted the shrink, so the
    // only attempted move recorded here is that shrink-to-floor.
    const bboxWidth = maxRight - minLeft;
    const bboxHeight = maxBottom - minTop;
    const remainingOverlapDepth = Math.max(overX, overY);
    const overlapArea = overX * bboxHeight + overY * bboxWidth - overX * overY;
    const zoneArea =
      (zone.bounds.right - zone.bounds.left) * (zone.bounds.bottom - zone.bounds.top);
    const involvedItems = items.map((it) => it.placement_name);

    const payload = buildActionablePayload({
      scene: sceneName,
      zone: zone.id,
      involvedItems,
      remainingOverlapDepth: Number(remainingOverlapDepth.toFixed(2)),
      remainingOverlapArea: Number(Math.max(0, overlapArea).toFixed(2)),
      availableArea: Number(zoneArea.toFixed(2)),
      attemptedMoves: [
        {
          target: zone.id,
          kind: "shrink",
          magnitude: 0,
          outcome: "hit MIN_SCALE floor; item still escapes scene bounds",
        },
      ],
      suggestedFix: "reduce items, enlarge the zone, or split the zone",
    });

    const diagnostic = buildDiagnostic(
      "unresolved_overlap",
      { scene_name: sceneName, zone_name: zone.id },
      payload,
    );
    overflows.push({ diagnostic });
  }

  // Report-only: positions are returned unchanged.
  return zoneLayouts;
}
