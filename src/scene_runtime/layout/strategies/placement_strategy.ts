// PlacementStrategy seam: the shared interface for per-zone horizontal placement.
//
// A PlacementStrategy computes the horizontal placement for a single zone:
// given that zone's items, the zone itself, and the resolved LayoutConfig, it
// returns the placed items for that zone. This matches the per-zone return
// shape of the horizontal stage (one ComputedItem[] per zone).
//
// The seam lets the overflow packer plug in per zone without rewriting the
// horizontal dispatcher. Two strategies exist: the row strategy (default greedy
// single-row placement) and the pack strategy (non-uniform shrink + compaction).

import type { LayoutConfig } from "../config/index.js";
import type { SeverityDiagnostic } from "../diagnostics/index.js";
import type { ComputedItem, Diagnostics, ScaledPlacement, Zone } from "../types.js";

// Forward declaration of the packer's per-zone outcome record. Declared here as
// an opaque type so the StrategyContext can carry the sink without a circular
// import; pack_strategy.ts owns the concrete PackerZoneOutcome shape.
import type { PackerZoneOutcome } from "./pack_strategy.js";

// The resolved per-call horizontal context that every strategy shares. These
// values are resolved once by the dispatcher (from layout_rules + config) and
// passed to each zone's strategy so the strategy reads no globals.
export interface StrategyContext {
  // Object gap between adjacent items in a zone.
  gap: number;
  // Floor scale for uniform shrink on overflow.
  minScale: number;
  // Inner padding subtracted from both zone edges.
  zonePadding: number;
  // Resolved layout config (carries defaultAlignStop and other tunables).
  config: LayoutConfig;
  // Shared diagnostics sink; strategies append overflow diagnostics here.
  diagnostics: Diagnostics;

  // The scene name, used by the packer to build actionable unresolved_overlap
  // payloads. Optional so direct unit-test callers may omit it.
  sceneName?: string;
  // The uniform scale the row strategy would have required for the current zone,
  // computed by the dispatcher's probe and recorded into the packer's decision
  // metadata. Optional; defaults to 1 when the packer is invoked directly.
  requiredRowScale?: number;
  // Optional sink the dispatcher passes when it engages the packer: the packer
  // records its per-zone outcome here so run_pipeline can fill the packer fields
  // of the DecisionMetadata without re-running the packer.
  packerSink?: Map<string, PackerZoneOutcome>;
  // Optional sink for severity-graded Errors (unresolved_overlap) the packer
  // emits when a zone cannot fit even at MIN_SCALE.
  severitySink?: SeverityDiagnostic[];
}

// A PlacementStrategy places the items of one zone horizontally and returns the
// computed items for that zone.
export type PlacementStrategy = (
  items: ScaledPlacement[],
  zone: Zone,
  ctx: StrategyContext,
) => ComputedItem[];
