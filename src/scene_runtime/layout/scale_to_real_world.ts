// Stage 5: Scale to real-world dimensions (SCALING_MODEL.md).
// Computes _width_scale per placement from the cm model:
//   _width_scale = (display_width_cm * px_per_cm) / (default_width * 11.52) * fudge
// Fallback chain: cm_model -> fallback_no_workspace -> fallback_authored ->
// skipped_error.

import { PX_PER_SCENE_PERCENT, WORKSPACE_PX_PER_CM } from "./constants.js";
import type {
  BoundPlacement,
  Diagnostics,
  ScaledPlacement,
  Workspace,
  WorkspacePxPerCm,
} from "./types.js";

export function scaleToRealWorld(
  bound: BoundPlacement[],
  workspace: Workspace | undefined,
  opts: { workspacePxPerCm?: WorkspacePxPerCm } = {},
  diagnostics: Diagnostics = [],
): ScaledPlacement[] {
  const pxPerCmMap = opts.workspacePxPerCm ?? WORKSPACE_PX_PER_CM;
  const pxPerCm: number | undefined =
    workspace !== undefined ? pxPerCmMap[workspace] : undefined;

  return bound.map((p): ScaledPlacement => {
    if (p._error !== undefined) {
      return {
        ...p,
        _width_scale: 1.0,
        _scale_source: "skipped_error",
        _px_per_cm: null,
      };
    }
    const cm = p.layout.display_width_cm;
    const fudge = p.layout.fudge;
    const def = p.layout.default_width;

    if (cm !== undefined && pxPerCm !== undefined && def > 0) {
      const scale = ((cm * pxPerCm) / (def * PX_PER_SCENE_PERCENT)) * fudge;
      return {
        ...p,
        _width_scale: scale,
        _scale_source: "cm_model",
        _px_per_cm: pxPerCm,
      };
    }

    if (cm !== undefined && pxPerCm === undefined) {
      diagnostics.push({
        stage: "scale",
        severity: "warn",
        kind: "unknown_workspace",
        workspace: workspace ?? "",
        placement_name: p.placement_name,
      });
      return {
        ...p,
        _width_scale: p.layout.width_scale,
        _scale_source: "fallback_no_workspace",
        _px_per_cm: null,
      };
    }

    return {
      ...p,
      _width_scale: p.layout.width_scale,
      _scale_source: "fallback_authored",
      _px_per_cm: pxPerCm ?? null,
    };
  });
}
