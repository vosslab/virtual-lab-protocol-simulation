// Stage 8: Vertical layout -- aspect-aware vertical auto-fit.
// Computes _y (baseline), _height, _top per item.
//
// heightPct = visualWidth * (viewport.w / viewport.h) / aspect. Keeps pixel
// aspect invariant regardless of viewport shape (percent units are per-axis).
//
// Aspect-aware auto-fit: when an item's derived height exceeds the zone's
// available vertical space, it is scaled down so it fits inside the zone. The
// fit scales BOTH _visualWidth and _height by the same factor, so the asset
// aspect ratio is preserved exactly (never distorted; see PRIMARY_DESIGN.md
// "Visual integrity: never crop scientific assets"). The fit factor is floored
// so the applied placement scale never drops below config.packer.minScale
// (MIN_SCALE). An item that still does not fit at the MIN_SCALE floor records an
// item_escapes_zone_vertically diagnostic; run_pipeline reads that to escalate
// to an unresolved_overlap Error after the convergence loop gives up.
//
// This replaces the previous silent behavior, where a too-tall item kept its
// full height (escaping the zone) and emitted only a warn diagnostic; the
// downstream clamp then translated the whole zone group on overflow. The fit
// makes tall objects sit inside their zone instead of escaping.

import { DEPTH_BASELINE_OFFSET, DEFAULT_VIEWPORT } from "./constants.js";
import { buildGlobalDefaults } from "./config/index.js";
import { depthFor } from "./footprint.js";
import type { LayoutConfig } from "./config/index.js";
import type { ComputedItem, Diagnostics, Zone } from "./types.js";

// Compute the _top edge for an item of the given height under its anchor mode.
function anchorTop(it: ComputedItem, baseline: number, heightPct: number): number {
  if (it.layout.anchor_y === "bottom") {
    return baseline - heightPct;
  }
  if (it.layout.anchor_y === "tip") {
    return baseline + it.layout.anchor_y_offset - heightPct;
  }
  return baseline - heightPct / 2;
}

// The tallest height the item can have and still sit inside [zoneTop, zoneBottom]
// under its anchor. The anchor pins one reference point relative to the baseline,
// so growing the height pushes a specific edge toward a specific zone wall; this
// returns the height at which that edge just touches the nearest wall. A slack of
// `tolerance` is allowed past each wall so a hairline overshoot is not shrunk.
function maxHeightInZone(
  it: ComputedItem,
  baseline: number,
  zoneTop: number,
  zoneBottom: number,
  tolerance: number,
): number {
  const top = zoneTop - tolerance;
  const bottom = zoneBottom + tolerance;
  if (it.layout.anchor_y === "bottom") {
    // bottom edge pinned at baseline; top = baseline - h. Fit top >= zone top.
    return baseline - top;
  }
  if (it.layout.anchor_y === "tip") {
    // bottom edge pinned at baseline + offset; top = that - h.
    return baseline + it.layout.anchor_y_offset - top;
  }
  // center anchor: top = baseline - h/2, bottom = baseline + h/2. Both edges move
  // symmetrically, so the binding wall is whichever is closer to the baseline.
  const upRoom = baseline - top;
  const downRoom = bottom - baseline;
  return 2 * Math.min(upRoom, downRoom);
}

export function verticalLayout(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  viewport: { w: number; h: number } = DEFAULT_VIEWPORT,
  diagnostics: Diagnostics = [],
  config: LayoutConfig = buildGlobalDefaults(),
): Map<string, ComputedItem[]> {
  const viewportAspect = viewport.w / viewport.h;
  // Vertical tunables now resolve through LayoutConfig.
  const escapeTolerance = config.itemEscapesZoneTolerance;
  const aspectFloor = config.aspectFloor;
  const minScale = config.packer.minScale;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) ?? [];
    const zoneBaselineY = zone.baseline ?? (zone.bounds.top + zone.bounds.bottom) / 2;

    const updated = items.map((it): ComputedItem => {
      const depthOffset = DEPTH_BASELINE_OFFSET[depthFor(it)];
      const baseline = it.baseline_override ?? zoneBaselineY + depthOffset;
      const aspect = Math.max(aspectFloor, it.aspect);

      // Natural height at the current horizontal scale.
      const naturalHeight = (it._visualWidth * viewportAspect) / aspect;

      // The tallest height that keeps the item inside the zone under its anchor.
      // This is anchor-aware: a bottom-anchored bottle that overshoots the zone
      // TOP must shrink even when its raw height is less than the full zone span,
      // because its base is pinned at the baseline near the zone bottom.
      //
      // The fit uses ZERO slack so the item lands strictly inside the zone.
      // Authored zones sit inside scene_bounds, so a strict zone fit also keeps
      // the item inside scene_bounds; allowing the escapeTolerance slack here
      // would let a bottom-anchored item poke past a zone top that coincides with
      // the scene top, which the report-only validate phase would then flag.
      const allowedHeight = maxHeightInZone(it, baseline, zone.bounds.top, zone.bounds.bottom, 0);

      // Vertical auto-fit. If the natural height does not fit the allowed height,
      // scale the item down by allowedHeight/naturalHeight. The fit is floored so
      // the applied placement scale (it._scale already folds horizontal shrink)
      // cannot drop below minScale; aspect is preserved because width and height
      // are scaled by the same factor.
      let fitFactor = 1;
      if (allowedHeight > 0 && naturalHeight > allowedHeight) {
        const needed = allowedHeight / naturalHeight;
        // Do not let the cumulative scale fall under the MIN_SCALE floor.
        const floorFactor = it._scale > 0 ? minScale / it._scale : needed;
        fitFactor = Math.max(needed, floorFactor);
        // If the floor clamps above 1 (already below MIN_SCALE), keep no upscale.
        if (fitFactor > 1) fitFactor = 1;
      }

      const visualWidth = it._visualWidth * fitFactor;
      const heightPct = (visualWidth * viewportAspect) / aspect;
      const scale = it._scale * fitFactor;
      const top = anchorTop(it, baseline, heightPct);

      // After the fit, an item only still escapes if it could not be shrunk
      // enough at the MIN_SCALE floor. That is the genuine "does not fit" case;
      // run_pipeline escalates it to an unresolved_overlap Error once the
      // convergence loop has exhausted its shrink budget.
      if (
        top < zone.bounds.top - escapeTolerance ||
        top + heightPct > zone.bounds.bottom + escapeTolerance
      ) {
        diagnostics.push({
          stage: "vertical",
          severity: "warn",
          kind: "item_escapes_zone_vertically",
          zone: zone.id,
          placement_name: it.placement_name,
          overflow_pct: Number((heightPct - allowedHeight).toFixed(2)),
        });
      }

      return {
        ...it,
        _scale: scale,
        _visualWidth: visualWidth,
        _y: baseline,
        _top: top,
        _height: heightPct,
      };
    });

    result.set(zone.id, updated);
  }

  return result;
}
