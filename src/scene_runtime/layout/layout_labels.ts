// Stage 9: Label layout + 3-pass horizontal collision nudge, then greedy
// vertical stagger within each zone. Sets _labelX, _labelY, _labelLines.
// Wraps labels exceeding their budget. Labels are clamped inside the padded
// zone; cross-zone collision is not checked here.
//
// The stagger writes only _labelX/_labelY (label coordinates). It NEVER writes
// _x/_y (item coordinates), so item placement is unchanged and a scene whose
// labels do not collide assigns every label to row 0 and renders identically
// to the pre-stagger behavior.

import { buildGlobalDefaults } from "./config/index.js";
import { wrapLabel } from "./wrap_label.js";
import { detectCollision, buildResolutionCandidate } from "./geometry/collision.js";
import { buildActionablePayload } from "./diagnostics/payload.js";
import { buildDiagnostic } from "./diagnostics/severity_model.js";
import type { Aabb } from "./geometry/types.js";
import type { AttemptedMove } from "./diagnostics/payload.js";
import type { SeverityDiagnostic } from "./diagnostics/severity_model.js";
import type { LayoutConfig } from "./config/index.js";
import type { ComputedItem, Diagnostics, LayoutRules, Zone } from "./types.js";

// Effective rendered half-width of a label in scene-percent. The authored
// label_width is a layout-time budget; a long label whose wrapped line still
// exceeds the budget renders wider than it. The stagger's row-fit test uses the
// wider of the budget and the engine's own per-char text estimate
// (AVG_CHAR_WIDTH_PCT, the same model wrap_label uses) so it separates labels
// that would otherwise visually overprint. Short labels (text estimate <=
// budget) keep the budget half-width, so clean scenes still assign every label
// to row 0 and render identically.
function effectiveLabelHalfWidth(
  lines: string[],
  labelWidth: number,
  avgCharWidthPct: number,
): number {
  let maxLen = 0;
  for (const line of lines) {
    if (line.length > maxLen) maxLen = line.length;
  }
  const textWidth = maxLen * avgCharWidthPct;
  const effective = Math.max(labelWidth, textWidth);
  return effective / 2;
}

export function layoutLabels(
  zoneLayouts: Map<string, ComputedItem[]>,
  zones: Zone[],
  layoutRules: LayoutRules = {},
  diagnostics: Diagnostics = [],
  config: LayoutConfig = buildGlobalDefaults(),
): Map<string, ComputedItem[]> {
  // Label tunables now resolve through LayoutConfig. The authored
  // layout_rules.label_offset_y still wins; otherwise the canonical config
  // labelOffsetY (3.5) applies, matching the prior `?? 3.5` fallback.
  const labelOffsetY = layoutRules.label_offset_y ?? config.labelOffsetY;
  const avgCharWidthPct = config.avgCharWidthPct;
  const lineHeightPct = config.labelLineHeightPct;
  const labelZonePadding = config.spacing.labelZonePadding;
  const nudgePasses = config.labelNudgePasses;
  const wrapBudgetTolerance = config.wrapBudgetTolerance;
  // Single shared label-collision slack (stagger row-fit and residual checks).
  const collisionTolerance = config.labelCollisionTolerance;
  const result = new Map<string, ComputedItem[]>();

  for (const zone of zones) {
    const source = zoneLayouts.get(zone.id) ?? [];
    const items: ComputedItem[] = source.map((it) => ({
      ...it,
      _labelLines: wrapLabel(it.label, it.layout.label_width, avgCharWidthPct, wrapBudgetTolerance),
      _labelX: it._x,
      _labelY: it._y + labelOffsetY,
    }));

    for (let pass = 0; pass < nudgePasses; pass++) {
      items.sort((a, b) => a._labelX - b._labelX);
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const cur = items[i];
        if (prev === undefined || cur === undefined) continue;
        // Overlap DETECTION uses each label's EFFECTIVE half-width (the wider of
        // authored budget vs rendered text width) so a budget-exceeding label
        // that visually overprints is detected even when the engine would
        // otherwise "converge". The separation target `want` is that effective
        // sum.
        const prevHalf = effectiveLabelHalfWidth(
          prev._labelLines,
          prev.layout.label_width,
          avgCharWidthPct,
        );
        const curHalf = effectiveLabelHalfWidth(
          cur._labelLines,
          cur.layout.label_width,
          avgCharWidthPct,
        );
        const want = prevHalf + curHalf;
        const gap = cur._labelX - prev._labelX;
        // Nudge MAGNITUDE is minimal: a pair is moved apart ONLY when its real
        // effective extents actually overlap (gap below the effective sum by more
        // than the shared collision tolerance), and then by exactly enough to
        // bring the two effective edges to touching (`want`). A pair already clear
        // under effective width is left exactly where it was anchored, so labels
        // that do not overprint keep their authored/anchored position instead of
        // being shoved off their bases. The tolerance gate is what restores
        // anchoring on clean scenes; the clearance target stays `want` so a real
        // overlap is fully separated (no residual handed to the global phase).
        if (gap < want - collisionTolerance) {
          const push = (want - gap) / 2;
          prev._labelX -= push;
          cur._labelX += push;
        }
      }
      const x0 = zone.bounds.left + labelZonePadding;
      const x1 = zone.bounds.right - labelZonePadding;
      for (const it of items) {
        // Clamp using the effective half-width so a budget-exceeding label is
        // held fully inside the padded zone by its real rendered extent.
        const half = effectiveLabelHalfWidth(
          it._labelLines,
          it.layout.label_width,
          avgCharWidthPct,
        );
        if (it._labelX < x0 + half) it._labelX = x0 + half;
        if (it._labelX > x1 - half) it._labelX = x1 - half;
      }
    }

    // Greedy interval-graph vertical stagger. After the horizontal nudge,
    // adjacent labels may still overlap (the nudge is bounded by zone width).
    // Sort by left edge (placement_name tiebreak for determinism), then place
    // each label in the lowest row whose last-placed label's right edge is
    // clear. A label that fits in row 0 stays at its row-0 _labelY, so clean
    // scenes are byte-identical. Lower rows drop _labelY by a multiple of the
    // staggered row height scaled by the label's line count.
    items.sort((a, b) => {
      if (a._labelX !== b._labelX) return a._labelX - b._labelX;
      return a.placement_name.localeCompare(b.placement_name);
    });
    // Pass 1: assign each label a row index. rowRightEdges[r] tracks the right
    // edge (scene-percent) of the last label placed in row r; a label fits in
    // row r when its left edge clears that right edge. Lowest fitting row wins.
    const rowRightEdges: number[] = [];
    const rowOf = new Map<string, number>();
    let maxRow = 0;
    for (const it of items) {
      const half = effectiveLabelHalfWidth(it._labelLines, it.layout.label_width, avgCharWidthPct);
      const leftEdge = it._labelX - half;
      const rightEdge = it._labelX + half;
      // collisionTolerance is the single shared slack value, mirrored below.
      let row = 0;
      while (row < rowRightEdges.length) {
        const edge = rowRightEdges[row];
        if (edge === undefined || leftEdge >= edge - collisionTolerance) break;
        row++;
      }
      rowRightEdges[row] = rightEdge;
      rowOf.set(it.placement_name, row);
      if (row > maxRow) maxRow = row;
    }

    // Pass 2: map row index to a _labelY. Row 0 keeps its baseline (so clean
    // single-row scenes are byte-identical). Lower rows drop by the staggered
    // row height, but the per-row step is compressed when the natural spacing
    // would push the bottom row past the padded zone floor -- this keeps every
    // assigned row at a DISTINCT Y instead of collapsing them all onto the
    // clamp line, which is what reintroduces overprint in tight, short zones.
    if (maxRow > 0) {
      // Use the largest line count among staggered labels so a 2-line label in
      // any lower row still clears the row below it where space allows.
      let maxLineCount = 1;
      for (const it of items) {
        const r = rowOf.get(it.placement_name) ?? 0;
        if (r > 0) maxLineCount = Math.max(maxLineCount, it._labelLines.length);
      }
      // FRAME SAFETY: the clamp bounds the label's TOP, but a multi-line label
      // extends lineHeightPct*lineCount below its top. Reserve that height so the
      // deepest row's BOTTOM edge stays inside the padded zone (which is within
      // the renderable scene frame). A label is never dropped below the visible
      // frame; if space runs out the rows compress and a residual overlap is
      // tolerated (and flagged below) rather than ejecting a label off-frame.
      const labelHeight = lineHeightPct * maxLineCount;
      const bottomClamp = zone.bounds.bottom - labelZonePadding - labelHeight;
      const naturalStep = lineHeightPct * maxLineCount;
      // Baseline is the common row-0 Y (item _y + labelOffsetY). All items in a
      // zone share labelOffsetY; row-0 items differ only by their own _y, so we
      // anchor each label's stagger on its own row-0 baseline, then compress the
      // step uniformly so the deepest row lands at or above the clamp.
      for (const it of items) {
        const row = rowOf.get(it.placement_name) ?? 0;
        if (row === 0) continue;
        const baseline = it._y + labelOffsetY;
        let step = naturalStep;
        const naturalBottom = baseline + maxRow * naturalStep;
        if (naturalBottom > bottomClamp) {
          // Compress so row maxRow sits exactly on the clamp line.
          const available = bottomClamp - baseline;
          step = available > 0 ? available / maxRow : 0;
        }
        it._labelY = baseline + row * step;
        diagnostics.push({
          stage: "labels",
          severity: "info",
          kind: "label_row_staggered",
          zone: zone.id,
          placement_name: it.placement_name,
          staggered_row: row,
        });
      }
    }

    // Residual collision: after staggering, two labels still overlap only when
    // they share a row and their horizontal extents overlap. Report each such
    // pair so the diagnostic metric can flag the scene.
    items.sort((a, b) => a._labelX - b._labelX);
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];
      if (prev === undefined || cur === undefined) continue;
      // Only labels on the same assigned row can collide horizontally; labels
      // on different rows are vertically separated by the stagger.
      if ((rowOf.get(prev.placement_name) ?? 0) !== (rowOf.get(cur.placement_name) ?? 0)) continue;
      const prevHalf = effectiveLabelHalfWidth(
        prev._labelLines,
        prev.layout.label_width,
        avgCharWidthPct,
      );
      const curHalf = effectiveLabelHalfWidth(
        cur._labelLines,
        cur.layout.label_width,
        avgCharWidthPct,
      );
      const want = prevHalf + curHalf;
      if (cur._labelX - prev._labelX < want - collisionTolerance) {
        diagnostics.push({
          stage: "labels",
          severity: "warn",
          kind: "label_collision_residual",
          zone: zone.id,
          between: [prev.placement_name, cur.placement_name],
        });
      }
    }

    items.sort((a, b) => {
      const ta = a.depth_tier ?? 0;
      const tb = b.depth_tier ?? 0;
      if (ta !== tb) return ta - tb;
      return a.placement_name.localeCompare(b.placement_name);
    });
    result.set(zone.id, items);
  }

  return result;
}

//============================================
// Global 2D label de-overlap + label-vs-artwork avoidance (resolve-collisions)
//============================================
//
// layoutLabels (above) runs the legacy per-zone horizontal nudge + vertical
// stagger; it never checks a label against a NEIGHBORING object's artwork, and
// its residual check only flags same-row, adjacent-pair label overlaps. The
// resolve-collisions phase adds a global pass that runs AFTER labels are placed,
// resolving BOTH label-vs-artwork and label-vs-label overlaps across every zone
// using the shared geometry primitive (detectCollision / buildResolutionCandidate).
//
// Movement model (closed set of moves):
// - Artwork boxes are obstacles; they never move. Only label boxes move.
// - Allowed moves: a horizontal nudge along the label's x axis, or a discrete
//   row drop (one labelLineHeightPct step down on the y axis). The geometry's
//   suggestedAxis (cheaper minimum-penetration axis) picks the axis, EXCEPT:
//   - label-vs-artwork avoidance has PRIORITY over label-label spacing: an
//     artwork collision is always resolved before a label-label collision for
//     the same label in the same pass.
//   - if a horizontal nudge would push the label outside its zone bounds, a row
//     drop is used instead (keep labels inside the padded zone).
//   - full containment (Collision.aInB / bInA: the label sits entirely inside an
//     object box) cannot be cleared by one interval-separation step, so it forces
//     a full row drop (a larger correction).
// - When clearing an artwork collision re-introduces a label-label overlap, the
//   later label resolves it with a row drop on the next visit.
//
// Determinism: labels are visited in a fixed order (_labelX, then placement_name
// tiebreak); each label resolves its single deepest current collision per visit;
// a fixed pass budget (config.labelMaxResolvePasses, default 4) bounds the sweep
// and it stops early when a pass makes no move. Identical input -> identical
// output.
//
// End-state classification (severity diagnostics, returned to run_pipeline):
// - a label still overlapping after the budget -> unresolved_label_overlap Error.
// - a label clear of overlaps but far from its anchor -> poor_label_alignment
//   Warning.
// - a dense-but-readable cluster (many labels packed into deep rows but all
//   clear) -> possible_overload Review-required.

// Mutable working record for one label during de-overlap. The label box is
// recomputed from x/y/half/lineH on demand. anchorX / anchorY are the label's
// pre-resolve position, used to measure drift for poor_label_alignment. rowStep
// is the discrete row-drop increment (one labelLineHeightPct).
interface LabelWork {
  item: ComputedItem;
  zoneId: string;
  zone: Zone;
  half: number;
  lineH: number;
  x: number;
  y: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly rowStep: number;
  // Stagger row assigned by Phase B (0 = top row). Two labels on DIFFERENT rows
  // are vertically separated even when their x-extents overlap, mirroring the
  // legacy label_collision_residual semantics; only a same-row x-overlap is a real
  // label-label collision. Defaults to 0 (single row) until Phase B assigns it.
  row: number;
  moves: AttemptedMove[];
}

// The AABB of a label given its current center-x, top-y, half-width, and height.
function labelAabb(w: LabelWork): Aabb {
  const box: Aabb = { x: w.x - w.half, y: w.y, w: w.half * 2, h: w.lineH };
  return box;
}

// The AABB of an object's artwork from its computed placement box (center-x,
// top, visual width, height).
function artworkAabb(it: ComputedItem): Aabb {
  const box: Aabb = {
    x: it._x - it._visualWidth / 2,
    y: it._top,
    w: it._visualWidth,
    h: it._height,
  };
  return box;
}

// A resolved collision pick for one label: the geometry fact, whether the other
// box is object artwork, the other box id (for the diagnostic payload), and the
// other box itself (so the mover can size an alternate-axis clearing nudge).
interface CollisionPick {
  readonly isArtwork: boolean;
  readonly collision: NonNullable<ReturnType<typeof detectCollision>>;
  readonly otherId: string;
  readonly otherBox: Aabb;
}

// The deepest current ARTWORK collision for one label against every object's
// artwork box (excluding its own owner's artwork). Deeper penetration wins; ties
// break on the box id so the choice is deterministic. Returns null when the label
// touches no neighboring artwork. Used by Phase A (artwork avoidance).
function deepestArtworkFor(
  self: LabelWork,
  artBoxes: { id: string; box: Aabb; owner: string }[],
): CollisionPick | null {
  const selfBox = labelAabb(self);
  const selfId = self.item.placement_name;
  let best: CollisionPick | null = null;
  for (const a of artBoxes) {
    if (a.owner === selfId) continue;
    const c = detectCollision(selfBox, "L:" + selfId, a.box, a.id);
    if (c === null) continue;
    if (
      best === null ||
      c.overlapDepth > best.collision.overlapDepth ||
      (c.overlapDepth === best.collision.overlapDepth && a.id < best.otherId)
    ) {
      best = { isArtwork: true, collision: c, otherId: a.id, otherBox: a.box };
    }
  }
  return best;
}

// The deepest current collision for one label against every OTHER label AND every
// artwork box. Artwork collisions outrank label collisions (the artwork-priority
// rule). Used by the end-state classifier to decide whether a label is still
// overlapping anything after both phases.
//
// A label-label collision counts ONLY when the two labels share the same stagger
// row (Phase B): labels on DIFFERENT rows are vertically separated by the stagger
// even when their x-extents overlap, which is exactly the legacy
// label_collision_residual semantics. Counting cross-row x-overlaps as Errors
// would falsely flag the intended staggered ladder.
function deepestAnyFor(
  idx: number,
  labels: LabelWork[],
  artBoxes: { id: string; box: Aabb; owner: string }[],
): CollisionPick | null {
  const self = labels[idx];
  if (self === undefined) return null;
  const art = deepestArtworkFor(self, artBoxes);
  if (art !== null) return art;

  const selfBox = labelAabb(self);
  const selfId = self.item.placement_name;
  let bestLab: CollisionPick | null = null;
  for (let j = 0; j < labels.length; j++) {
    if (j === idx) continue;
    const other = labels[j];
    if (other === undefined) continue;
    // Only same-row, same-zone labels can truly collide; a different row is a
    // vertical separation, not an overlap.
    if (other.zoneId === self.zoneId && other.row !== self.row) continue;
    const otherId = "L:" + other.item.placement_name;
    const c = detectCollision(selfBox, "L:" + selfId, labelAabb(other), otherId);
    if (c === null) continue;
    if (
      bestLab === null ||
      c.overlapDepth > bestLab.collision.overlapDepth ||
      (c.overlapDepth === bestLab.collision.overlapDepth && otherId < bestLab.otherId)
    ) {
      bestLab = { isArtwork: false, collision: c, otherId, otherBox: labelAabb(other) };
    }
  }
  return bestLab;
}

// True when a label centered at x with the given half-width fits inside the
// padded zone on the horizontal axis.
function labelFitsX(x: number, half: number, zone: Zone, pad: number): boolean {
  const fits =
    x - half >= zone.bounds.left + pad - 1e-9 && x + half <= zone.bounds.right - pad + 1e-9;
  return fits;
}

// A concrete candidate move for one label, with the resulting coordinate, the
// cost (distance moved), whether it stays inside the zone, and whether it fully
// clears the obstacle.
interface MoveOption {
  readonly kind: "nudge-x" | "row-drop";
  readonly newX: number;
  readonly newY: number;
  readonly cost: number;
  readonly inZone: boolean;
}

// Apply the chosen single move to one label, recording it in the label's move
// log. The label is geometry "A"; separationForA moves IT.
//
// Move policy: enumerate the in-zone clearing moves on BOTH axes and pick the
// cheapest that stays inside the label's own zone, with a nudge preferred over a
// row drop at equal cost (a nudge keeps the label near its anchor):
//  - nudge-x-left: slide the label left until its right edge clears the obstacle.
//  - nudge-x-right: slide the label right until its left edge clears the obstacle.
//  - row-drop: drop the label in whole rowStep increments until its top clears
//    the obstacle's bottom, bounded by the zone's padded floor.
// A horizontal nudge is allowed even when geometry's cheaper axis is y: when a
// blocked row drop would otherwise leave the label stuck against a tall neighbor's
// artwork, an x-nudge clears it instead. Full containment disables the x-nudge
// (one interval step cannot clear it) and forces a (larger) row drop.
// All moves are clamped to the zone: a label never wanders into a lower zone's
// artwork. When no move fully clears AND stays in-zone, the cheapest in-zone
// partial move is applied so each pass still makes progress; the end-state
// classifier flags any residual overlap as unresolved.
// Returns true when a real (non-zero) move was applied.
function applyLabelMove(
  self: LabelWork,
  pick: CollisionPick,
  zonePad: number,
  zoneNeighbors: LabelWork[],
): boolean {
  const collision = pick.collision;
  const contained = collision.aInB || collision.bInA;
  const moveTarget = self.item.placement_name;
  const overlapClass = pick.isArtwork ? "artwork" : "label";
  const o = pick.otherBox;
  const bottomMax = self.zone.bounds.bottom - zonePad - self.lineH;
  // The geometry's cheaper-axis suggestion. When two clearing moves cost the
  // same, the move on suggestedAxis is preferred so the engine honors the
  // minimum-penetration axis the geometry chose.
  const candidate = buildResolutionCandidate(collision);
  const preferRowDropOnTie = candidate.suggestedAxis === "y";

  const options: MoveOption[] = [];

  // Horizontal nudges are generated ONLY for label-vs-artwork collisions. A
  // label-vs-label collision is resolved with a row drop (when avoiding artwork
  // reintroduces a label-label overlap, resolve with a row drop); this preserves
  // the horizontal separation the per-zone stagger already established and prevents
  // one label's sideways nudge from sliding onto a zone neighbor. Nudges are also
  // disabled under full containment, where a single interval step cannot clear the
  // overlap.
  if (pick.isArtwork && !contained) {
    // Slide left so the label's right edge sits just left of the obstacle.
    const leftX = o.x - self.half - 1e-6;
    options.push({
      kind: "nudge-x",
      newX: leftX,
      newY: self.y,
      cost: Math.abs(leftX - self.x),
      inZone: labelFitsX(leftX, self.half, self.zone, zonePad),
    });
    // Slide right so the label's left edge sits just right of the obstacle.
    const rightX = o.x + o.w + self.half + 1e-6;
    options.push({
      kind: "nudge-x",
      newX: rightX,
      newY: self.y,
      cost: Math.abs(rightX - self.x),
      inZone: labelFitsX(rightX, self.half, self.zone, zonePad),
    });
  }

  // Row drop in whole rowStep increments until the label top clears the
  // obstacle's bottom. A contained label needs to clear its own full height too.
  const targetTop = o.y + o.h + 1e-6;
  const rawDrop = Math.max(self.rowStep, targetTop - self.y);
  const steps = Math.max(1, Math.ceil(rawDrop / self.rowStep));
  const dropY = self.y + steps * self.rowStep;
  options.push({
    kind: "row-drop",
    newX: self.x,
    newY: dropY,
    cost: dropY - self.y,
    inZone: dropY <= bottomMax + 1e-9,
  });

  // Score each in-zone move by its distance PLUS the worst new label-label
  // penetration it would create against same-zone neighbors. This steers the
  // artwork nudge toward the direction (or a row drop) that does not slide the
  // label onto a neighbor; ties still respect the geometry's cheaper axis.
  const inZone = options
    .filter((m) => m.inZone && m.cost > 1e-9)
    .map((m) => scoreMove(m, self, zoneNeighbors));
  let chosen: ScoredMove | undefined = pickCheapest(inZone, preferRowDropOnTie);
  if (chosen === undefined) {
    // No clearing move fits. Apply a bounded partial: drop to the zone floor if
    // there is any room below, which reduces a y-overlap without exiting the zone.
    const floorDrop = bottomMax - self.y;
    if (floorDrop > 1e-9) {
      chosen = {
        kind: "row-drop",
        newX: self.x,
        newY: bottomMax,
        cost: floorDrop,
        inZone: true,
        score: floorDrop,
      };
    }
  }
  if (chosen === undefined) return false;

  self.x = chosen.newX;
  self.y = chosen.newY;
  const cleared = chosen.inZone && chosen.newY <= bottomMax + 1e-9;
  self.moves.push({
    target: moveTarget,
    kind: chosen.kind,
    magnitude: Number(chosen.cost.toFixed(3)),
    outcome:
      chosen.kind === "nudge-x"
        ? "nudged clear of " + overlapClass
        : cleared
          ? "row drop clear of " + overlapClass
          : "row drop clamped to zone floor; " + overlapClass + " overlap not fully cleared",
  });
  return true;
}

// A scored move: a MoveOption plus its selection score (move distance plus the
// worst new label-label penetration it would introduce against zone neighbors).
interface ScoredMove extends MoveOption {
  readonly score: number;
}

// Score a move: its travel cost plus the worst new label-label overlap depth the
// label would have against same-zone neighbors at the proposed position. The
// penalty steers an artwork nudge away from sliding the label onto a neighbor.
function scoreMove(m: MoveOption, self: LabelWork, zoneNeighbors: LabelWork[]): ScoredMove {
  // The label box at the proposed position.
  const moved: Aabb = { x: m.newX - self.half, y: m.newY, w: self.half * 2, h: self.lineH };
  let worstPenetration = 0;
  for (const n of zoneNeighbors) {
    if (n === self) continue;
    const c = detectCollision(moved, "L", labelAabb(n), "N");
    if (c !== null && c.overlapDepth > worstPenetration) worstPenetration = c.overlapDepth;
  }
  const scored: ScoredMove = { ...m, score: m.cost + worstPenetration };
  return scored;
}

// Pick the lowest-score move. On a score tie the preferred axis (from the
// geometry's suggestedAxis) wins: preferRowDrop true ranks row-drop first
// (geometry chose y), else nudge-x first (geometry chose x). Remaining ties break
// by (newY, newX) so the choice is fully deterministic.
function pickCheapest(options: ScoredMove[], preferRowDrop: boolean): ScoredMove | undefined {
  let best: ScoredMove | undefined;
  for (const m of options) {
    if (best === undefined) {
      best = m;
      continue;
    }
    if (m.score < best.score - 1e-9) {
      best = m;
      continue;
    }
    if (Math.abs(m.score - best.score) <= 1e-9) {
      const mRank = axisRank(m.kind, preferRowDrop);
      const bRank = axisRank(best.kind, preferRowDrop);
      if (mRank < bRank) best = m;
      else if (mRank === bRank && m.newY < best.newY - 1e-9) best = m;
      else if (mRank === bRank && Math.abs(m.newY - best.newY) <= 1e-9 && m.newX < best.newX - 1e-9)
        best = m;
    }
  }
  return best;
}

// Rank a move kind for tie-breaking. The geometry-preferred axis ranks 0.
function axisRank(kind: "nudge-x" | "row-drop", preferRowDrop: boolean): number {
  if (preferRowDrop) return kind === "row-drop" ? 0 : 1;
  return kind === "nudge-x" ? 0 : 1;
}

// Drift threshold (scene-percent) past which a clear label is flagged as far from
// its anchor. The label baseline is ~labelOffsetY below the anchor; a few rows of
// stagger is acceptable, so the threshold is generous (3 row steps) to avoid
// flagging normal de-overlap as poor alignment.
const POOR_ALIGNMENT_DRIFT_FACTOR = 3;
// A zone with at least this many labels that all needed a row drop is a dense but
// readable cluster worth an author review.
const OVERLOAD_ROW_DROP_COUNT = 4;

// Per-zone label-label de-overlap by distinct-row stagger (Phase B). Mirrors the
// legacy in-zone stagger: sort labels by current center-x (placement_name
// tiebreak), greedily assign each the lowest row whose last-placed label's right
// edge it clears, then map rows to a _labelY ladder. The per-row step is
// compressed when the natural spacing would push the deepest row past the padded
// zone floor, so every assigned row stays at a DISTINCT y instead of collapsing
// onto the floor. Row 0 keeps each label's current baseline, so a zone whose
// labels do not overlap is left untouched. Only _labelY (via w.y) changes here;
// w.x is preserved so Phase A's artwork separation survives.
function restaggerZoneLabels(
  zoneLabels: LabelWork[],
  zone: Zone,
  zonePad: number,
  tolerance: number,
): void {
  if (zoneLabels.length < 2) return;
  // Stable order: ascending center-x, then placement_name.
  const ordered = [...zoneLabels].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.item.placement_name.localeCompare(b.item.placement_name);
  });

  // Greedy interval-graph row assignment. rowRightEdges[r] is the right edge of
  // the last label placed in row r; a label fits in row r when its left edge
  // clears that right edge (within tolerance). Lowest fitting row wins.
  const rowRightEdges: number[] = [];
  const rowOf = new Map<string, number>();
  let maxRow = 0;
  for (const w of ordered) {
    const leftEdge = w.x - w.half;
    const rightEdge = w.x + w.half;
    let row = 0;
    while (row < rowRightEdges.length) {
      const edge = rowRightEdges[row];
      if (edge === undefined || leftEdge >= edge - tolerance) break;
      row++;
    }
    rowRightEdges[row] = rightEdge;
    rowOf.set(w.item.placement_name, row);
    w.row = row; // record the assigned row for the end-state classifier
    if (row > maxRow) maxRow = row;
  }
  if (maxRow === 0) return; // No label-label overlap: leave _labelY as is.

  // Map row index to a _labelY. Row 0 keeps each label's current baseline; lower
  // rows drop by the staggered step, compressed uniformly so the deepest row
  // lands at or above the padded zone floor (the lowest legal label top).
  let maxLineCount = 1;
  for (const w of ordered) {
    const r = rowOf.get(w.item.placement_name) ?? 0;
    if (r > 0) maxLineCount = Math.max(maxLineCount, Math.max(1, w.item._labelLines.length));
  }
  // FRAME SAFETY: reserve the deepest label's height so its BOTTOM edge stays
  // inside the padded zone (within the renderable scene frame) instead of
  // clamping only the top and letting the text fall below the visible frame.
  const labelHeight = (zoneLabels[0]?.rowStep ?? 0) * maxLineCount;
  const bottomClamp = zone.bounds.bottom - zonePad - labelHeight;
  const naturalStep = (zoneLabels[0]?.rowStep ?? 0) * maxLineCount;
  for (const w of ordered) {
    const row = rowOf.get(w.item.placement_name) ?? 0;
    if (row === 0) continue;
    const baseline = w.y; // current baseline (Phase A left row-0 labels here)
    let step = naturalStep;
    const naturalBottom = baseline + maxRow * naturalStep;
    if (naturalBottom > bottomClamp) {
      const available = bottomClamp - baseline;
      step = available > 0 ? available / maxRow : 0;
    }
    w.y = baseline + row * step;
  }
}

// Run the global label de-overlap over the per-zone labelled maps. Mutates each
// item's _labelX / _labelY in place to clear label-vs-artwork and label-vs-label
// overlaps, then returns severity diagnostics for the end-state classification.
// This is the resolve-collisions phase's label work; it reads object artwork
// boxes (which are NOT moved) and writes only label coordinates.
export function resolveLabelCollisions(
  labelled: Map<string, ComputedItem[]>,
  zones: Zone[],
  sceneName: string,
  diagnostics: Diagnostics = [],
  config: LayoutConfig = buildGlobalDefaults(),
): SeverityDiagnostic[] {
  const avgCharWidthPct = config.avgCharWidthPct;
  const lineHeightPct = config.labelLineHeightPct;
  const labelZonePadding = config.spacing.labelZonePadding;
  const maxPasses = config.labelMaxResolvePasses;
  const tolerance = config.labelCollisionTolerance;

  // Build one global work list of movable labels plus the immutable artwork
  // obstacle list. A label is keyed to its owning zone for bounds clamping.
  const labels: LabelWork[] = [];
  const artBoxes: { id: string; box: Aabb; owner: string }[] = [];
  for (const zone of zones) {
    const items = labelled.get(zone.id) ?? [];
    for (const it of items) {
      artBoxes.push({
        id: "A:" + it.placement_name,
        box: artworkAabb(it),
        owner: it.placement_name,
      });
      const half = effectiveLabelHalfWidth(it._labelLines, it.layout.label_width, avgCharWidthPct);
      const lineH = lineHeightPct * Math.max(1, it._labelLines.length);
      labels.push({
        item: it,
        zoneId: zone.id,
        zone,
        half,
        lineH,
        x: it._labelX,
        y: it._labelY,
        anchorX: it._x,
        anchorY: it._labelY,
        rowStep: lineHeightPct,
        row: 0,
        moves: [],
      });
    }
  }

  // Deterministic sweep order: ascending _labelX, then placement_name. Sort once;
  // the order is stable across passes because we never re-sort on mutated x.
  labels.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.item.placement_name.localeCompare(b.item.placement_name);
  });

  // Same-zone neighbor lists, so an artwork move can be scored by the new
  // label-label overlap it would create against its own zone's labels.
  const neighborsByZone = new Map<string, LabelWork[]>();
  for (const w of labels) {
    const list = neighborsByZone.get(w.zoneId) ?? [];
    list.push(w);
    neighborsByZone.set(w.zoneId, list);
  }

  // ----- Phase A: label-vs-artwork avoidance (global) -----
  // Each pass visits every label in order and clears its deepest neighboring
  // artwork overlap with a single move (x-nudge preferred, bounded row drop
  // fallback) chosen to introduce the least new label-label overlap. Artwork
  // boxes never move. Stop early when a whole pass makes no move, so clean scenes
  // do no work. This is the capability the legacy per-zone stagger lacked.
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (const self of labels) {
      const hit = deepestArtworkFor(self, artBoxes);
      if (hit === null) continue;
      const zoneNeighbors = neighborsByZone.get(self.zoneId) ?? [];
      const applied = applyLabelMove(self, hit, labelZonePadding, zoneNeighbors);
      if (applied) moved = true;
    }
    if (!moved) break;
  }

  // ----- Phase B: per-zone label-label de-overlap (row stagger) -----
  // Phase A may have nudged a label sideways onto a zone neighbor. Re-separate
  // label-label overlaps per zone with the proven distinct-row stagger: labels
  // whose horizontal extents overlap are placed in successive rows, and the row
  // step is compressed so the deepest row still lands above the padded zone floor.
  // A row drop is the only label-label move, so Phase A's horizontal artwork
  // separation is preserved. Run after Phase A so it stamps the final _labelY
  // ladder onto the artwork-adjusted x positions.
  for (const zone of zones) {
    const zoneLabels = labels.filter((w) => w.zoneId === zone.id);
    restaggerZoneLabels(zoneLabels, zone, labelZonePadding, tolerance);
  }

  // Write resolved coordinates back onto the items.
  for (const w of labels) {
    w.item._labelX = w.x;
    w.item._labelY = w.y;
  }

  // End-state classification. A label still overlapping anything after the budget
  // is an unresolved_label_overlap Error; a clear-but-drifted label is a
  // poor_label_alignment Warning; a zone whose labels all needed row drops yet are
  // all clear is a possible_overload Review.
  const severityDiagnostics: SeverityDiagnostic[] = [];
  const driftThreshold = POOR_ALIGNMENT_DRIFT_FACTOR * lineHeightPct;
  const rowDroppedByZone = new Map<string, number>();

  for (let i = 0; i < labels.length; i++) {
    const self = labels[i];
    if (self === undefined) continue;
    const hit = deepestAnyFor(i, labels, artBoxes);
    const stillOverlaps = hit !== null && hit.collision.overlapDepth > tolerance;

    if (stillOverlaps) {
      const c = hit.collision;
      const zone = self.zone;
      const zoneArea =
        (zone.bounds.right - zone.bounds.left) * (zone.bounds.bottom - zone.bounds.top);
      // Overlap area approximates the penetration rectangle on the minimum axis.
      const overlapArea =
        c.overlapAxis === "x" ? c.overlapDepth * self.lineH : c.overlapDepth * (self.half * 2);
      const otherName = hit.isArtwork
        ? hit.otherId.replace(/^A:/, "")
        : hit.otherId.replace(/^L:/, "");
      const payload = buildActionablePayload({
        scene: sceneName,
        zone: zone.id,
        involvedItems: [self.item.placement_name, otherName],
        remainingOverlapDepth: Number(c.overlapDepth.toFixed(2)),
        remainingOverlapArea: Number(Math.max(0, overlapArea).toFixed(2)),
        availableArea: Number(zoneArea.toFixed(2)),
        attemptedMoves: self.moves,
        suggestedFix: "reduce labels, enlarge the zone, or shorten labels",
      });
      const diagnostic = buildDiagnostic(
        "unresolved_label_overlap",
        { scene_name: sceneName, zone_name: zone.id, placement_name: self.item.placement_name },
        payload,
      );
      severityDiagnostics.push(diagnostic);
      continue;
    }

    // Clear label: count row drops per zone (for the overload review) and flag
    // drift past the threshold.
    const rowDrops = self.moves.filter((m) => m.kind === "row-drop").length;
    if (rowDrops > 0) {
      rowDroppedByZone.set(self.zoneId, (rowDroppedByZone.get(self.zoneId) ?? 0) + 1);
    }
    const drift = Math.abs(self.y - self.anchorY) + Math.abs(self.x - self.anchorX);
    if (drift > driftThreshold) {
      const diagnostic = buildDiagnostic("poor_label_alignment", {
        scene_name: sceneName,
        zone_name: self.zoneId,
        placement_name: self.item.placement_name,
      });
      severityDiagnostics.push(diagnostic);
    }
  }

  // A zone where many labels each needed a row drop yet all came out clear is a
  // dense-but-readable cluster: one Review-required possible_overload per zone.
  for (const [zoneId, count] of [...rowDroppedByZone.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (count >= OVERLOAD_ROW_DROP_COUNT) {
      const diagnostic = buildDiagnostic("possible_overload", {
        scene_name: sceneName,
        zone_name: zoneId,
      });
      severityDiagnostics.push(diagnostic);
    }
  }

  // Echo an info-level runtime diagnostic per resolved zone so the legacy stream
  // records that the global pass ran (keeps existing tooling consistent without a
  // new closed kind: reuse label_row_staggered for any label this pass dropped).
  for (const w of labels) {
    const droppedRows = w.moves.filter((m) => m.kind === "row-drop").length;
    if (droppedRows > 0) {
      diagnostics.push({
        stage: "labels",
        severity: "info",
        kind: "label_row_staggered",
        zone: w.zoneId,
        placement_name: w.item.placement_name,
        staggered_row: droppedRows,
      });
    }
  }

  return severityDiagnostics;
}
