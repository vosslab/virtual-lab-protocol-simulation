// Top-level pipeline runner.
// Stages 1-5 (identity resolution) run once. Stages 6-10 (placement and fit)
// run inside a convergence loop, up to MAX_LAYOUT_PASSES. Per-pass detail is
// recorded in result.passes. Last pass's stages map is exposed via result.stages.

import {
  LAYOUT_SHRINK_FACTOR,
  MAX_LAYOUT_PASSES,
  DEFAULT_VIEWPORT,
  WORKSPACE_PX_PER_CM,
} from "./constants.js";
import { bindObjects } from "./bind_objects.js";
import { clampSceneBounds } from "./clamp_scene_bounds.js";
import { groupByZone } from "./group_by_zone.js";
import { horizontalLayout } from "./horizontal_layout.js";
import { layoutLabels } from "./layout_labels.js";
import { normalizeSchema } from "./normalize_schema.js";
import { resolveInheritance } from "./resolve_inheritance.js";
import { scaleToRealWorld } from "./scale_to_real_world.js";
import { verticalLayout } from "./vertical_layout.js";
import { WORKSPACE_ROW_LIBRARY } from "./workspace_row_library.js";
import type {
  AssetSpecs,
  ComputedItem,
  Diagnostics,
  GroupedPlacements,
  ObjectLibrary,
  PassRecord,
  PipelineInputs,
  PipelineResult,
  ScaledPlacement,
  SceneA,
  SceneB,
} from "./types.js";

const FITTABLE_KINDS = new Set([
  "zone_overflow_negative_gap",
  "tab_stop_overflow",
  "item_escapes_zone_vertically",
]);

export function runPipeline(
  scene: SceneA | SceneB,
  opts: Partial<PipelineInputs> = {},
): PipelineResult {
  const library: ObjectLibrary = opts.library ?? {};
  const assets: AssetSpecs = opts.assets ?? {};
  const baseSceneMap = opts.baseSceneMap ?? {};
  const viewport = opts.viewport ?? DEFAULT_VIEWPORT;
  const rowLibrary = opts.rowLibrary ?? WORKSPACE_ROW_LIBRARY;
  const workspacePxPerCm = opts.workspacePxPerCm ?? WORKSPACE_PX_PER_CM;
  const maxPasses = opts.maxPasses ?? MAX_LAYOUT_PASSES;
  const shrinkFactor = opts.shrinkFactor ?? LAYOUT_SHRINK_FACTOR;
  const diagnostics: Diagnostics = [];

  // Stages 1-5: identity resolution (single-pass)
  const normalized = normalizeSchema(scene, rowLibrary);
  for (const t of normalized.trace) {
    if (t.op === "row_missing") {
      const d: Diagnostics[number] = {
        stage: "normalize",
        severity: "error",
        kind: "unknown_row",
      };
      if (t.row !== undefined) d.row = t.row;
      if (t.workspace !== undefined) d.workspace = t.workspace;
      diagnostics.push(d);
    }
  }
  const normalScene = normalized.scene ?? (scene as SceneA);
  const inheritance = resolveInheritance(normalScene, baseSceneMap);
  const bound = bindObjects(inheritance.placements, library, assets, diagnostics);
  let scaled: ScaledPlacement[] = scaleToRealWorld(
    bound,
    normalScene.workspace,
    { workspacePxPerCm },
    diagnostics,
  );

  const identityDiagCount = diagnostics.length;

  // Stages 6-10: convergence loop. Group -> Horizontal -> Vertical -> Labels
  // -> Clamp. After each pass, items in zones that emitted fittable
  // diagnostics get their _width_scale multiplied by shrinkFactor.
  const passes: PassRecord[] = [];
  let grouped: GroupedPlacements | undefined;
  let horizontal: Map<string, ComputedItem[]> | undefined;
  let vertical: Map<string, ComputedItem[]> | undefined;
  let labelled: Map<string, ComputedItem[]> | undefined;
  let clamped: Map<string, ComputedItem[]> | undefined;
  let lastPassDiagnostics: Diagnostics = [];

  for (let pass = 0; pass < maxPasses; pass++) {
    const passDiagnostics: Diagnostics = [];
    grouped = groupByZone(scaled, normalScene.zones ?? [], passDiagnostics);
    horizontal = horizontalLayout(
      grouped.groups,
      normalScene.zones ?? [],
      normalScene.layout_rules ?? {},
      passDiagnostics,
    );
    vertical = verticalLayout(horizontal, normalScene.zones ?? [], viewport, passDiagnostics);
    labelled = layoutLabels(
      vertical,
      normalScene.zones ?? [],
      normalScene.layout_rules ?? {},
      passDiagnostics,
    );
    clamped = clampSceneBounds(
      labelled,
      normalScene.zones ?? [],
      normalScene.scene_bounds,
      passDiagnostics,
    );

    const fittable = passDiagnostics.filter((d) => FITTABLE_KINDS.has(d.kind));
    const passRecord: PassRecord = {
      pass: pass + 1,
      diagnostics: [...passDiagnostics],
      zones_shrunk: [],
    };
    passes.push(passRecord);
    lastPassDiagnostics = passDiagnostics;

    if (fittable.length === 0) break;

    if (pass === maxPasses - 1) {
      passDiagnostics.push({
        stage: "meta",
        severity: "warn",
        kind: "max_iterations_reached",
        passes_used: maxPasses,
        unresolved: fittable.length,
      });
      lastPassDiagnostics = passDiagnostics;
      break;
    }

    const zonesToShrink = new Set<string>();
    for (const d of fittable) {
      if (d.zone !== undefined) zonesToShrink.add(d.zone);
    }
    passRecord.zones_shrunk = [...zonesToShrink];
    scaled = scaled.map(
      (p): ScaledPlacement =>
        zonesToShrink.has(p.zone)
          ? {
              ...p,
              _width_scale: p._width_scale * shrinkFactor,
              _shrunk_passes: (p._shrunk_passes ?? 0) + 1,
            }
          : p,
    );
  }

  for (const d of lastPassDiagnostics) diagnostics.push(d);

  const finalGrouped = grouped ?? { groups: new Map(), orphans: [] };
  const finalHorizontal = horizontal ?? new Map<string, ComputedItem[]>();
  const finalVertical = vertical ?? new Map<string, ComputedItem[]>();
  const finalLabelled = labelled ?? new Map<string, ComputedItem[]>();
  const finalClamped = clamped ?? new Map<string, ComputedItem[]>();

  const final: ComputedItem[] = [];
  for (const zone of normalScene.zones ?? []) {
    for (const it of finalClamped.get(zone.id) ?? []) final.push(it);
  }

  return {
    scene: normalScene,
    sourceScene: scene,
    diagnostics,
    passes,
    identityDiagCount,
    stages: {
      inputs: { scene, library, assets },
      normalized,
      inheritance,
      bound,
      scaled,
      grouped: finalGrouped,
      horizontal: finalHorizontal,
      vertical: finalVertical,
      labelled: finalLabelled,
      clamped: finalClamped,
    },
    final,
  };
}
