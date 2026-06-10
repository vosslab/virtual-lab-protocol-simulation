// Actionable payload for the two overlap Errors. Ratified contract:
//   plan partitioned-shimmying-dragonfly.md ("Actionable payload" paragraph):
//   "the unresolved_label_overlap and unresolved_overlap Errors carry a
//   structured payload so the message is fixable, not just 'build failed because
//   overlap': scene, zone, the labels or items involved, the remaining overlap
//   depth/area, the available label/zone area, the moves the engine attempted,
//   and a suggested YAML fix".
//
// This file defines that payload shape and a builder. The label and object
// layout phases populate it when they emit unresolved_label_overlap /
// unresolved_overlap. All numeric
// fields are scene-percent (lengths) or scene-percent-squared (areas).

//============================================
// One attempted move (for the "moves the engine attempted" field)
//============================================

// A single de-overlap move the engine tried before giving up. The engine
// records what it attempted so the author sees the move was tried, not skipped.
export interface AttemptedMove {
  // The item or label the engine tried to move (placement_name).
  readonly target: string;
  // The kind of move: a horizontal/vertical nudge, a discrete row drop, or a
  // uniform shrink. Closed set so the report can group moves.
  readonly kind: "nudge-x" | "nudge-y" | "row-drop" | "shrink";
  // Signed magnitude on the move axis (scene-percent) for a nudge/row-drop, or
  // the scale delta for a shrink. Positive magnitude only; direction lives in
  // the kind plus the sign convention of the emitting stage.
  readonly magnitude: number;
  // Why the move did not fully resolve the overlap (e.g. "exited zone bounds",
  // "reintroduced a label-label overlap", "hit MIN_SCALE floor").
  readonly outcome: string;
}

//============================================
// Actionable payload
//============================================

// The structured payload carried by unresolved_label_overlap and
// unresolved_overlap. Every field is required so the emitted Error is always
// fixable: it names the scene and zone, the involved items, how much overlap
// remains, how much area is available, what the engine already tried, and a
// concrete YAML fix.
export interface ActionablePayload {
  // The scene the unresolved overlap is in.
  readonly scene: string;
  // The zone the unresolved overlap is in.
  readonly zone: string;
  // The labels or items still involved in the overlap (placement_name list).
  readonly involvedItems: readonly string[];
  // Remaining penetration depth on the minimum axis (scene-percent). Zero or
  // negative would mean no overlap, so a real payload is always positive.
  readonly remainingOverlapDepth: number;
  // Remaining overlapping area (scene-percent squared) for the involved boxes.
  readonly remainingOverlapArea: number;
  // The label or zone area available to place the involved items into
  // (scene-percent squared). Lets the author see whether the zone is simply too
  // small for the item count.
  readonly availableArea: number;
  // The de-overlap moves the engine attempted before emitting this Error.
  readonly attemptedMoves: readonly AttemptedMove[];
  // A concrete YAML fix from the severity table's suggested-fix vocabulary
  // (reduce items, enlarge the zone, split the zone, or shorten labels).
  readonly suggestedFix: string;
}

//============================================
// Builder
//============================================

// Build an actionable payload from the fields a stage collected during
// de-overlap. The stage owns measuring the overlap and recording the attempted
// moves; this builder only assembles the immutable record so every emitting site
// produces the same shape.
export function buildActionablePayload(input: {
  scene: string;
  zone: string;
  involvedItems: readonly string[];
  remainingOverlapDepth: number;
  remainingOverlapArea: number;
  availableArea: number;
  attemptedMoves: readonly AttemptedMove[];
  suggestedFix: string;
}): ActionablePayload {
  // Assemble the full payload, then return the variable (no inline return).
  const payload: ActionablePayload = {
    scene: input.scene,
    zone: input.zone,
    involvedItems: [...input.involvedItems],
    remainingOverlapDepth: input.remainingOverlapDepth,
    remainingOverlapArea: input.remainingOverlapArea,
    availableArea: input.availableArea,
    attemptedMoves: [...input.attemptedMoves],
    suggestedFix: input.suggestedFix,
  };
  return payload;
}
