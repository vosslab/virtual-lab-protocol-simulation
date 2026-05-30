// Shared helpers for horizontal and vertical layout stages.

import { DEPTH_SCALE, MAX_FOOTPRINT_RATIO } from "./constants.js";
import type { Depth, ScaledPlacement } from "./types.js";

export function depthFor(p: ScaledPlacement): Depth {
  return p.depth ?? "mid";
}

export function widthScaleFor(p: ScaledPlacement): number {
  // _width_scale is always set by scaleToRealWorld (cm model or 1.0 fallback).
  return p._width_scale;
}

export function visualWidthFor(p: ScaledPlacement, scale = 1): number {
  return p.layout.default_width * widthScaleFor(p) * DEPTH_SCALE[depthFor(p)] * scale;
}

export function footprintFor(p: ScaledPlacement, scale = 1): number {
  const visual = visualWidthFor(p, scale);
  const label = p.layout.label_width;
  const capped = Math.min(label, visual * MAX_FOOTPRINT_RATIO);
  return Math.max(visual, capped);
}
