// Top-level pipeline runner, expressed over a phase registry (see phases.ts and
// docs/active_plans/decisions/layout_model_layer_synthesis.md "Phase model").
//
// Identity resolution (the prepare / resolve-metadata / measure phases:
// normalize -> inheritance -> bind -> scale) runs once. The placement phases
// (partition -> place-horizontal -> place-vertical -> place-labels ->
// resolve-collisions -> validate) run inside the bounded convergence loop, up to
// config.maxPasses. Per-pass detail is recorded in result.passes. The last
// pass's stage maps are exposed via result.stages. report is assembled here from
// the final context.
//
// Output is byte-identical to the prior inline 10-stage pipeline: same phase
// order, same per-pass diagnostics, same shrink step, same final assembly.

import { DEFAULT_VIEWPORT, WORKSPACE_PX_PER_CM } from "./constants.js";
import { bindObjects } from "./bind_objects.js";
import { buildGlobalDefaults, resolveConfig } from "./config/index.js";
import {
  buildDecisionMetadata,
  buildPackZoneDecision,
  buildRowZoneDecision,
} from "./diagnostics/decision_metadata.js";
import { normalizeSchema } from "./normalize_schema.js";
import { resolveInheritance } from "./resolve_inheritance.js";
import { scaleToRealWorld } from "./scale_to_real_world.js";
import { PLACEMENT_PHASES, runPhases } from "./phases.js";
import type { LayoutConfig } from "./config/index.js";
import type { PackerZoneOutcome } from "./strategies/index.js";
import type { LayoutContext } from "./phases.js";
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
} from "./types.js";

const FITTABLE_KINDS = new Set([
  "zone_overflow_negative_gap",
  "tab_stop_overflow",
  "item_escapes_zone_vertically",
]);

export function runPipeline(scene: SceneA, opts: Partial<PipelineInputs> = {}): PipelineResult {
  const library: ObjectLibrary = opts.library ?? {};
  const assets: AssetSpecs = opts.assets ?? {};
  const baseSceneMap = opts.baseSceneMap ?? {};
  const viewport = opts.viewport ?? DEFAULT_VIEWPORT;
  const workspacePxPerCm = opts.workspacePxPerCm ?? WORKSPACE_PX_PER_CM;
  const diagnostics: Diagnostics = [];

  // Identity resolution (prepare / resolve-metadata / measure), single pass.
  const normalized = normalizeSchema(scene);
  const normalScene = normalized.scene ?? scene;
  const inheritance = resolveInheritance(normalScene, baseSceneMap);
  const bound = bindObjects(inheritance.placements, library, assets, diagnostics);
  let scaled: ScaledPlacement[] = scaleToRealWorld(
    bound,
    normalScene.workspace,
    { workspacePxPerCm },
    diagnostics,
  );

  const identityDiagCount = diagnostics.length;

  // Resolve the scene-wide LayoutConfig once. Runtime opts (maxPasses,
  // shrinkFactor) still override the resolved defaults; this keeps the existing
  // PipelineInputs override points working while routing the loop tunables
  // through LayoutConfig.
  const baseConfig = resolveConfig(
    buildGlobalDefaults(),
    normalScene.layout_rules ?? {},
    undefined,
    {},
    {},
    normalScene.zones ?? [],
  );
  const config: LayoutConfig = applyRuntimeOverrides(baseConfig, opts);
  const maxPasses = config.maxPasses;
  const shrinkFactor = config.shrinkFactor;

  // Convergence loop over the placement phases. After each pass, items in zones
  // that emitted fittable diagnostics get their _width_scale multiplied by
  // shrinkFactor. The loop re-enters only on new fittable diagnostics and caps
  // at maxPasses, so it cannot loop or vary between builds.
  const passes: PassRecord[] = [];
  let lastCtx: LayoutContext | undefined;
  let lastPassDiagnostics: Diagnostics = [];

  for (let pass = 0; pass < maxPasses; pass++) {
    const passDiagnostics: Diagnostics = [];
    const ctx: LayoutContext = {
      scene: normalScene,
      viewport,
      scaled,
      diagnostics: passDiagnostics,
    };
    lastCtx = runPhases(ctx, config, PLACEMENT_PHASES);

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

  // report: assemble the final ComputedItem[] and the stage maps from the last
  // context. clamped is the validate-phase output (report-only bounds check).
  const finalGrouped: GroupedPlacements = lastCtx?.grouped ?? { groups: new Map(), orphans: [] };
  const finalHorizontal = lastCtx?.horizontal ?? new Map<string, ComputedItem[]>();
  const finalVertical = lastCtx?.vertical ?? new Map<string, ComputedItem[]>();
  const finalLabelled = lastCtx?.labelled ?? new Map<string, ComputedItem[]>();
  const finalClamped = lastCtx?.clamped ?? new Map<string, ComputedItem[]>();

  const final: ComputedItem[] = [];
  for (const zone of normalScene.zones ?? []) {
    for (const it of finalClamped.get(zone.id) ?? []) final.push(it);
  }

  // Build per-scene decision metadata, separate from the diagnostics array.
  // Packer outcomes from the final pass: zones the dispatcher packed record a
  // "pack" ZoneDecision; all other zones record the row strategy with the
  // convergence-loop uniform per-zone shrink (derived from _shrunk_passes).
  const packerDecisions: Map<string, PackerZoneOutcome> =
    lastCtx?.packerDecisions ?? new Map<string, PackerZoneOutcome>();
  const decisionMetadata = buildSceneDecisionMetadata(
    normalScene,
    finalClamped,
    config,
    opts,
    packerDecisions,
  );

  // Surface the severity-graded Errors/Warnings/Reviews from the final pass.
  // Two sources, both kept SEPARATE from the closed-kind `diagnostics` stream:
  //   - the resolve-collisions label de-overlap
  //     (unresolved_label_overlap, poor_label_alignment, possible_overload), and
  //   - the report-only validate phase's unresolved_overlap bounds Errors.
  // The vertical auto-fit shrinks tall items to fit, so a non-empty overflow list
  // means an item still escaped scene_bounds at the MIN_SCALE floor after the
  // convergence loop exhausted its shrink budget. Taking the LAST context avoids
  // reporting a transient diagnostic that a later pass resolved.
  const labelDiagnostics = lastCtx?.labelDiagnostics ?? [];
  const boundsDiagnostics = (lastCtx?.overflows ?? []).map((o) => o.diagnostic);
  // unresolved_overlap Errors the packer emitted for zones it could not fit even
  // at MIN_SCALE. Kept SEPARATE from the closed-kind diagnostics stream, surfaced
  // here alongside the label and bounds severity diagnostics.
  const packerDiagnostics = lastCtx?.packerSeverity ?? [];
  const severityDiagnostics = [...labelDiagnostics, ...boundsDiagnostics, ...packerDiagnostics];

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
    decisionMetadata,
    severityDiagnostics,
  };
}

// Assemble the per-scene DecisionMetadata from the final per-zone layouts. Each
// zone records the row strategy plus the actual per-item shrink the convergence
// loop applied (shrinkFactor raised to the item's _shrunk_passes count). The
// resolved config is re-resolved per zone so each ZoneDecision.resolvedConfig
// reflects that zone's overrides. This reads the final layout only; it mutates
// nothing.
function buildSceneDecisionMetadata(
  scene: SceneA,
  clamped: Map<string, ComputedItem[]>,
  config: LayoutConfig,
  opts: Partial<PipelineInputs>,
  packerDecisions: Map<string, PackerZoneOutcome>,
): ReturnType<typeof buildDecisionMetadata> {
  const zoneDecisions = [];
  for (const zone of scene.zones ?? []) {
    const items = clamped.get(zone.id) ?? [];
    // Per-item shrink applied = shrinkFactor ^ (passes this item was shrunk).
    // An unshrunk item records 1 (no shrink), matching current behavior.
    const shrinkApplied: Record<string, number> = {};
    for (const it of items) {
      const passes = it._shrunk_passes ?? 0;
      shrinkApplied[it.placement_name] = config.shrinkFactor ** passes;
    }
    // Re-resolve the config for this specific zone so its align/baseline/spacing
    // overrides are folded into resolvedConfig.
    const zoneBaseConfig = resolveConfig(
      buildGlobalDefaults(),
      scene.layout_rules ?? {},
      zone,
      {},
      {},
      scene.zones ?? [],
    );
    const zoneConfig = applyRuntimeOverrides(zoneBaseConfig, opts);

    // If the dispatcher packed this zone, record the packer's decision (its
    // non-uniform per-item shrink, the required row scale, and the result).
    // Otherwise record the row decision with the convergence-loop shrink.
    const packed = packerDecisions.get(zone.id);
    if (packed !== undefined) {
      zoneDecisions.push(
        buildPackZoneDecision({
          zoneId: zone.id,
          resolvedConfig: zoneConfig,
          requiredRowScale: packed.requiredRowScale,
          packerResult: packed.packerResult,
          rowsCreated: packed.rowsCreated,
          shrinkApplied: packed.shrinkApplied,
        }),
      );
    } else {
      zoneDecisions.push(
        buildRowZoneDecision({
          zoneId: zone.id,
          resolvedConfig: zoneConfig,
          shrinkApplied,
        }),
      );
    }
  }
  const metadata = buildDecisionMetadata(scene.scene_name, zoneDecisions);
  return metadata;
}

// Apply the runtime PipelineInputs override points (maxPasses, shrinkFactor)
// onto the resolved config. These are not authored YAML but real override
// points carried by PipelineInputs; folding them here keeps resolveConfig the
// single merge surface while preserving the existing opts behavior.
function applyRuntimeOverrides(base: LayoutConfig, opts: Partial<PipelineInputs>): LayoutConfig {
  if (opts.maxPasses === undefined && opts.shrinkFactor === undefined) return base;
  // Freeze the override result so a stage cannot accidentally mutate the
  // shared config, matching resolveConfig()/buildGlobalDefaults() which both
  // freeze their output.
  const overridden: LayoutConfig = Object.freeze({
    ...base,
    maxPasses: opts.maxPasses ?? base.maxPasses,
    shrinkFactor: opts.shrinkFactor ?? base.shrinkFactor,
  });
  return overridden;
}
