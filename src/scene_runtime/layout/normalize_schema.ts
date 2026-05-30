// Stage 2: Schema normalize.
// Schema A is passthrough. Applies scene_bounds and layout_rules defaults.

import { DEFAULT_LAYOUT_RULES } from "./constants.js";
import type { LayoutRules, NormalizeTrace, NormalizedScene, SceneA } from "./types.js";

function mergeLayoutRules(authored: LayoutRules | undefined): LayoutRules {
  return { ...DEFAULT_LAYOUT_RULES, ...(authored ?? {}) };
}

export function normalizeSchema(scene: SceneA | null | undefined): NormalizedScene {
  if (!scene) {
    return { scene: null, source: "none", trace: [] };
  }

  // Schema A passthrough - but apply layout_rules defaults so downstream
  // stages see a populated rules block. Schema A authors are required to
  // write scene_bounds; we do not invent it here.
  const merged: SceneA = {
    ...scene,
    layout_rules: mergeLayoutRules(scene.layout_rules),
  };
  const trace: NormalizeTrace[] = [{ op: "detect", value: "zone_bounds" }];
  return { scene: merged, source: "zone_bounds", trace };
}
