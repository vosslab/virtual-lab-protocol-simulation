// Phase registry for the layout pipeline. Ratified contract:
// docs/active_plans/decisions/layout_model_layer_synthesis.md "Phase model".
//
// The ten named phases replace the previously inline 10-stage sequence in
// run_pipeline.ts. Phase order:
//
//   prepare -> resolve-metadata -> measure -> partition ->
//   place-horizontal -> place-vertical -> place-labels ->
//   resolve-collisions -> validate -> report
//
// Read/mutate boundary (enforced by review and by the mutatesPositions flag):
// - place-horizontal, place-vertical, place-labels, and resolve-collisions are
//   the only position-mutating phases.
// - resolve-collisions applies geometry results to positions: it mutates only
//   label _labelX / _labelY in place; object positions are unchanged.
// - prepare, resolve-metadata, measure, partition, validate, and report are
//   read-only with respect to position. The `validate` phase (clamp_scene_bounds)
//   is report-only: it measures scene-bounds overflow and emits diagnostics
//   without mutating positions, so its mutatesPositions flag is false.
//
// The `validate` phase wraps clamp_scene_bounds.ts: it no longer translates
// out-of-bounds zone groups; the vertical auto-fit shrinks tall items to fit
// instead. A pending git mv will rename clamp_scene_bounds.ts -> validate_bounds.ts
// and clampSceneBounds -> validateBounds; the behavior already matches the new name.

import { clampSceneBounds } from "./clamp_scene_bounds.js";
import { groupByZone } from "./group_by_zone.js";
import { horizontalLayout } from "./horizontal_layout.js";
import { layoutLabels, resolveLabelCollisions } from "./layout_labels.js";
import { verticalLayout } from "./vertical_layout.js";
import type { BoundsOverflow } from "./clamp_scene_bounds.js";
import type { LayoutConfig } from "./config/index.js";
import type { SeverityDiagnostic } from "./diagnostics/severity_model.js";
import type { PackerZoneOutcome } from "./strategies/index.js";
import type {
  ComputedItem,
  Diagnostics,
  GroupedPlacements,
  ScaledPlacement,
  SceneA,
} from "./types.js";

export const PHASE_ORDER = [
  "prepare",
  "resolve-metadata",
  "measure",
  "partition",
  "place-horizontal",
  "place-vertical",
  "place-labels",
  "resolve-collisions",
  "validate",
  "report",
] as const;

export type PhaseName = (typeof PHASE_ORDER)[number];

// Mutable context threaded through one pass of the placement phases. Identity
// resolution (prepare..partition source data) is computed once in run_pipeline
// and fed in via `scaled`; the per-pass context carries the maps each placement
// phase fills. diagnostics is the per-pass diagnostic sink.
export interface LayoutContext {
  readonly scene: SceneA;
  readonly viewport: { w: number; h: number };
  // Source placements for this pass (post-shrink in later passes).
  scaled: ScaledPlacement[];
  diagnostics: Diagnostics;
  grouped?: GroupedPlacements;
  horizontal?: Map<string, ComputedItem[]>;
  vertical?: Map<string, ComputedItem[]>;
  labelled?: Map<string, ComputedItem[]>;
  collided?: Map<string, ComputedItem[]>;
  clamped?: Map<string, ComputedItem[]>;
  // Report-only validate-phase output: structured unresolved_overlap Errors for
  // any zone whose items still escape scene_bounds after fit/shrink. run_pipeline
  // reads this to surface the Errors; it does not affect positions.
  overflows?: BoundsOverflow[];
  // resolve-collisions output: severity diagnostics from the global label
  // de-overlap (unresolved_label_overlap Errors, poor_label_alignment Warnings,
  // possible_overload Reviews). run_pipeline surfaces these on
  // PipelineResult.severityDiagnostics alongside the validate-phase overlaps.
  labelDiagnostics?: SeverityDiagnostic[];
  // place-horizontal output: per-zone packer outcomes for zones where the
  // dispatcher engaged the overflow packer. run_pipeline reads this to fill the
  // packer fields of the per-scene DecisionMetadata. Zones the row strategy
  // handled are absent (they keep the row-strategy decision).
  packerDecisions?: Map<string, PackerZoneOutcome>;
  // place-horizontal output: unresolved_overlap Errors the packer emitted for
  // zones it could not fit even at MIN_SCALE. run_pipeline surfaces these on
  // PipelineResult.severityDiagnostics.
  packerSeverity?: SeverityDiagnostic[];
}

export interface Phase {
  readonly name: PhaseName;
  // true only for place-* and resolve-collisions.
  readonly mutatesPositions: boolean;
  run(ctx: LayoutContext, config: LayoutConfig): LayoutContext;
}

//============================================
// Placement phases
//============================================

// partition: group scaled placements by zone. Read-only w.r.t. position; it
// only buckets items, it does not place them.
const partitionPhase: Phase = {
  name: "partition",
  mutatesPositions: false,
  run(ctx) {
    ctx.grouped = groupByZone(ctx.scaled, ctx.scene.zones ?? [], ctx.diagnostics);
    return ctx;
  },
};

const placeHorizontalPhase: Phase = {
  name: "place-horizontal",
  mutatesPositions: true,
  run(ctx, config) {
    const grouped = ctx.grouped ?? { groups: new Map(), orphans: [] };
    // Fresh per-pass packer sinks; the convergence loop reads the LAST pass's
    // outcomes (the same discipline as the diagnostics stream).
    const packerDecisions = new Map<string, PackerZoneOutcome>();
    const packerSeverity: SeverityDiagnostic[] = [];
    ctx.horizontal = horizontalLayout(
      grouped.groups,
      ctx.scene.zones ?? [],
      ctx.scene.layout_rules ?? {},
      ctx.diagnostics,
      config,
      {
        sceneName: ctx.scene.scene_name,
        packerSink: packerDecisions,
        severitySink: packerSeverity,
      },
    );
    ctx.packerDecisions = packerDecisions;
    ctx.packerSeverity = packerSeverity;
    return ctx;
  },
};

const placeVerticalPhase: Phase = {
  name: "place-vertical",
  mutatesPositions: true,
  run(ctx, config) {
    const horizontal = ctx.horizontal ?? new Map<string, ComputedItem[]>();
    ctx.vertical = verticalLayout(
      horizontal,
      ctx.scene.zones ?? [],
      ctx.viewport,
      ctx.diagnostics,
      config,
    );
    return ctx;
  },
};

const placeLabelsPhase: Phase = {
  name: "place-labels",
  mutatesPositions: true,
  run(ctx, config) {
    const vertical = ctx.vertical ?? new Map<string, ComputedItem[]>();
    ctx.labelled = layoutLabels(
      vertical,
      ctx.scene.zones ?? [],
      ctx.scene.layout_rules ?? {},
      ctx.diagnostics,
      config,
    );
    return ctx;
  },
};

// resolve-collisions: global label de-overlap. Reads the placed labels
// (ctx.labelled) plus every object's artwork box and resolves both
// label-vs-artwork and label-vs-label overlaps across all zones, mutating only
// the labels' _labelX / _labelY in place. Artwork boxes are obstacles and are
// never moved, so object positions stay exactly as place-vertical left them;
// the downstream validate phase therefore sees unchanged item geometry.
const resolveCollisionsPhase: Phase = {
  name: "resolve-collisions",
  mutatesPositions: true,
  run(ctx, config) {
    const labelled = ctx.labelled ?? new Map<string, ComputedItem[]>();
    ctx.labelDiagnostics = resolveLabelCollisions(
      labelled,
      ctx.scene.zones ?? [],
      ctx.scene.scene_name,
      ctx.diagnostics,
      config,
    );
    // resolveLabelCollisions mutates the same ComputedItem objects in place, so
    // ctx.collided is the same map with updated label coordinates.
    ctx.collided = labelled;
    return ctx;
  },
};

// validate: report-only bounds validation. clampSceneBounds measures overflow,
// records a zone_clamped_to_bounds warn in the runtime stream, and pushes a
// structured unresolved_overlap Error into ctx.overflows for any zone that still
// escapes scene_bounds after the vertical auto-fit and convergence shrink. It
// returns its input map unchanged, so this phase does not mutate positions.
//
// mutatesPositions is false: the vertical auto-fit owns the shrink-to-fit, so
// validate only reports. The prior silent group translation was removed when the
// vertical auto-fit stage took over that responsibility.
const validatePhase: Phase = {
  name: "validate",
  mutatesPositions: false,
  run(ctx) {
    const collided = ctx.collided ?? ctx.labelled ?? new Map<string, ComputedItem[]>();
    const overflows: BoundsOverflow[] = [];
    ctx.clamped = clampSceneBounds(
      collided,
      ctx.scene.zones ?? [],
      ctx.scene.scene_bounds,
      ctx.diagnostics,
      overflows,
      ctx.scene.scene_name,
    );
    ctx.overflows = overflows;
    return ctx;
  },
};

// The placement phases run inside the convergence loop. prepare /
// resolve-metadata / measure happen once in run_pipeline (identity resolution);
// report is assembled there from the final context.
export const PLACEMENT_PHASES: readonly Phase[] = [
  partitionPhase,
  placeHorizontalPhase,
  placeVerticalPhase,
  placeLabelsPhase,
  resolveCollisionsPhase,
  validatePhase,
];

// Run an ordered list of phases over a context. The driver is intentionally
// trivial: each phase reads the resolved config and returns the (same, mutated)
// context. Determinism comes from the phases, not the driver.
export function runPhases(
  ctx: LayoutContext,
  config: LayoutConfig,
  phases: readonly Phase[],
): LayoutContext {
  let current = ctx;
  for (const phase of phases) {
    current = phase.run(current, config);
  }
  return current;
}
