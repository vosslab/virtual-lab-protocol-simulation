// Stage 7: Horizontal layout per zone (dispatcher).
//
// Resolves the shared per-call context (gap, floor scale, zone padding) once,
// then selects a PlacementStrategy per zone and delegates placement to it.
// Two strategies exist: the row strategy (default greedy single-row placement)
// and the overflow packer (non-uniform shrink plus gap compaction).
//
// Per-zone strategy selection: probe the row layout's required uniform scale
// and overflow without placing anything; engage the packer when the row layout
// would require unacceptable shrink (requiredScale < config.packer.thresholdScale)
// OR overflows (negative gap / out of bounds). Otherwise the row strategy runs.
// See docs/active_plans/decisions/layout_model_layer_synthesis.md
// "Packer objective and trigger" for the ratified trigger rule.

import { buildGlobalDefaults } from "./config/index.js";
import { packStrategy, probeRow, rowStrategy } from "./strategies/index.js";
import type { LayoutConfig } from "./config/index.js";
import type { SeverityDiagnostic } from "./diagnostics/index.js";
import type { PackerZoneOutcome } from "./strategies/index.js";
import type { PlacementStrategy, StrategyContext } from "./strategies/index.js";
import type { ComputedItem, Diagnostics, LayoutRules, ScaledPlacement, Zone } from "./types.js";

// The result of selecting a strategy for one zone: the strategy plus the row
// probe numbers (so the dispatcher can record requiredRowScale even when it
// dispatches the packer).
interface StrategyChoice {
  strategy: PlacementStrategy;
  requiredRowScale: number;
  packerEngaged: boolean;
}

// Selects the placement strategy for a zone. Probes the row layout;
// engages the packer when the row layout would require unacceptable shrink
// (below config.packer.thresholdScale) or overflows. Tab-stop and single-row
// modes both probe; an empty zone or a comfortably-fitting zone keeps the row
// strategy.
function selectStrategy(
  zone: Zone,
  items: ScaledPlacement[],
  ctx: StrategyContext,
): StrategyChoice {
  const probe = probeRow(items, zone, ctx.gap, ctx.zonePadding, ctx.minScale);
  const threshold = ctx.config.packer.thresholdScale;
  // Positive trigger: unacceptable shrink OR overflow engages the packer.
  const packerNeeded = probe.requiredScale < threshold || probe.overflow;
  if (packerNeeded) {
    return { strategy: packStrategy, requiredRowScale: probe.requiredScale, packerEngaged: true };
  }
  return { strategy: rowStrategy, requiredRowScale: probe.requiredScale, packerEngaged: false };
}

export function horizontalLayout(
  groups: Map<string, ScaledPlacement[]>,
  zones: Zone[],
  layoutRules: LayoutRules = {},
  diagnostics: Diagnostics = [],
  config: LayoutConfig = buildGlobalDefaults(),
  sinks: {
    sceneName?: string;
    packerSink?: Map<string, PackerZoneOutcome>;
    severitySink?: SeverityDiagnostic[];
  } = {},
): Map<string, ComputedItem[]> {
  const result = new Map<string, ComputedItem[]>();
  // Object spacing and the floor scale now resolve through LayoutConfig. The
  // authored layout_rules.zone_gap still wins when set; otherwise the resolved
  // config's objectGap (canonically 2) applies.
  const gap = layoutRules.zone_gap ?? config.spacing.objectGap;
  const minScale = config.packer.minScale;
  const zonePadding = config.spacing.objectZonePadding;

  for (const zone of zones) {
    const items = groups.get(zone.id) ?? [];
    // The shared per-call context. requiredRowScale and the optional sinks are
    // set per zone so the packer records the correct decision metadata. Optional
    // keys are assigned only when present (exactOptionalPropertyTypes is on).
    const ctx: StrategyContext = { gap, minScale, zonePadding, config, diagnostics };
    if (sinks.sceneName !== undefined) ctx.sceneName = sinks.sceneName;
    if (sinks.packerSink !== undefined) ctx.packerSink = sinks.packerSink;
    if (sinks.severitySink !== undefined) ctx.severitySink = sinks.severitySink;
    const choice = selectStrategy(zone, items, ctx);
    ctx.requiredRowScale = choice.requiredRowScale;
    result.set(zone.id, choice.strategy(items, zone, ctx));
  }

  return result;
}
