// Stage 2: Schema normalize.
// Detects input schema. Schema B (rows + slots) expands to Schema A via the
// workspace row library. Schema A is passthrough. Both paths populate
// scene_bounds and layout_rules defaults.

import { DEFAULT_LAYOUT_RULES, DEFAULT_SCENE_BOUNDS } from "./constants.js";
import { WORKSPACE_ROW_LIBRARY } from "./workspace_row_library.js";
import type {
  LayoutRules,
  NormalizeTrace,
  NormalizedScene,
  PlacementAuthored,
  SceneA,
  SceneB,
  WorkspaceRowLibrary,
  Zone,
} from "./types.js";

function isSceneB(scene: SceneA | SceneB): scene is SceneB {
  return Array.isArray((scene as SceneB).rows);
}

function mergeLayoutRules(authored: LayoutRules | undefined): LayoutRules {
  return { ...DEFAULT_LAYOUT_RULES, ...(authored ?? {}) };
}

export function normalizeSchema(
  scene: SceneA | SceneB | null | undefined,
  rowLibrary: WorkspaceRowLibrary = WORKSPACE_ROW_LIBRARY,
): NormalizedScene {
  if (!scene) {
    return { scene: null, source: "none", trace: [] };
  }

  if (isSceneB(scene)) {
    const lib = rowLibrary[scene.workspace] ?? [];
    const byName = new Map(lib.map((r) => [r.row_name, r]));
    const zones: Zone[] = [];
    const placements: PlacementAuthored[] = [];
    const trace: NormalizeTrace[] = [{ op: "detect", value: "row_slot" }];

    for (const row of scene.rows) {
      const ref = byName.get(row.row_name);
      if (!ref) {
        trace.push({
          op: "row_missing",
          row: row.row_name,
          workspace: scene.workspace,
        });
        continue;
      }
      zones.push({
        id: row.row_name,
        bounds: ref.bounds,
        align: ref.align,
        baseline: ref.baseline,
        label: row.row_name,
      });
      trace.push({
        op: "row_to_zone",
        row: row.row_name,
        slots: (row.slots ?? []).length,
      });
      (row.slots ?? []).forEach((slot, i) => {
        const placement: PlacementAuthored = {
          placement_name: slot.placement_name,
          object_name: slot.object_name,
          zone: row.row_name,
          depth_tier: slot.depth_tier ?? i + 1,
        };
        if (slot.align_stop !== undefined)
          placement.align_stop = slot.align_stop;
        if (slot.layout !== undefined) placement.layout = slot.layout;
        placements.push(placement);
      });
    }

    const normalized: SceneA = {
      scene_name: scene.scene_name,
      workspace: scene.workspace,
      scene_bounds: scene.scene_bounds ?? { ...DEFAULT_SCENE_BOUNDS },
      zones,
      placements,
      layout_rules: mergeLayoutRules(scene.layout_rules),
    };
    if (scene.capabilities) normalized.capabilities = scene.capabilities;
    if (scene.background) normalized.background = scene.background;
    if (scene.wrong_order_message)
      normalized.wrong_order_message = scene.wrong_order_message;

    return { scene: normalized, source: "row_slot", trace };
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
