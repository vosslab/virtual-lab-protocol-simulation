// Vertical measured-extent helper. The horizontal counterpart (footprint.ts)
// folds the label into an item's horizontal extent via
// footprintFor = max(visualWidth, capped(label_width)). This file is the
// vertical mirror: it folds the wrapped label box into an item's vertical
// extent so a later reflow can reserve a row tall enough for object + gap +
// label.
//
// The combined extent magnitude is SIDE-INDEPENDENT: object height + label
// offset + label box height is the same number whether the label sits above
// (top) or below (bottom) the object. Reflow therefore reserves the same row
// height for either side, and a terminal safety flip stays inside that
// reserved row.

import { LABEL_LINE_HEIGHT_PCT, AVG_CHAR_WIDTH_PCT } from "./constants.js";
import { wrapLabel } from "./wrap_label.js";
import type { ComputedItem } from "./types.js";

// Default wrap budget slack multiplier. Mirrors wrapLabel's own default and the
// resolve_config WRAP_BUDGET_TOLERANCE so a caller that does not thread the
// resolved config value still wraps identically to the canonical helper.
const DEFAULT_WRAP_BUDGET_TOLERANCE = 1.1;

// The vertical extent decomposition for one item, returned by
// verticalFootprintFor. labelLines is the REAL wrapped line list (reused by
// place-labels so the wrap is computed once); labelBoxHeight is the rendered
// label box height (one LABEL_LINE_HEIGHT_PCT per wrapped line); combinedHeight
// is the side-independent row extent (object height + label offset + label box).
export interface VerticalFootprint {
  labelLines: string[];
  labelBoxHeight: number;
  combinedHeight: number;
}

// Compute the combined object+gap+label vertical extent for one item. The wrap
// is the width-stable wrap_label result (depends only on label_width and
// AVG_CHAR_WIDTH_PCT, never object width), so the label box height is known
// independently of any object scaling. labelBoxHeight uses the REAL wrapped line
// count (1 or 2 lines), so a 2-line label reserves twice the line height.
//
// combinedHeight = objectHeight + labelOffsetY + labelBoxHeight. objectHeight is
// the object's rendered height in scene-percent; labelOffsetY is the gap between
// the object and the label; labelBoxHeight is the label strip. The sum is the same
// for a top or a bottom label, which is the side-independence the reflow relies
// on.
//
// objectHeight: measure-vertical runs AHEAD of place-vertical, so
// it._height is still 0 when the measure stage runs. The measure stage computes
// the NATURAL object height (visualWidth * viewportAspect / aspect) and passes it
// here as the explicit objectHeight. When objectHeight is omitted the helper falls
// back to it._height (the post-place-vertical direct-call path used by unit tests),
// so existing callers stay unchanged.
export function verticalFootprintFor(
  it: ComputedItem,
  lineHeightPct: number,
  labelOffsetY: number,
  avgCharWidthPct: number = AVG_CHAR_WIDTH_PCT,
  budgetTolerance: number = DEFAULT_WRAP_BUDGET_TOLERANCE,
  objectHeight: number = it._height,
): VerticalFootprint {
  // Width-stable wrap: reuse the canonical helper, never invent a new wrap. This
  // is the ONE wrap call site in the pipeline (place-labels consumes _labelLines
  // from here). The wrap-tuning args are threaded so this site reads the SAME
  // resolved config values (avgCharWidthPct, budgetTolerance) place-labels would,
  // so the measure wrap and the place-labels fallback wrap cannot diverge.
  const labelLines = wrapLabel(it.label, it.layout.label_width, avgCharWidthPct, budgetTolerance);
  // One line-height per wrapped line. lineHeightPct defaults to the canonical
  // constant for callers that do not thread the resolved config value.
  const labelBoxHeight = lineHeightPct * labelLines.length;
  // Side-independent row extent: object strip + gap + label strip. objectHeight is
  // the explicit natural height the measure stage passes (it._height is 0 before
  // place-vertical), or it._height for the direct-call default.
  const combinedHeight = objectHeight + labelOffsetY + labelBoxHeight;
  const footprint: VerticalFootprint = { labelLines, labelBoxHeight, combinedHeight };
  return footprint;
}

// Default-constant convenience: the canonical line-height constant, exposed so a
// caller computing a combined extent without a resolved LayoutConfig matches the
// stagger / wrap line-height. The config layer overrides this when threaded.
export const DEFAULT_LABEL_LINE_HEIGHT_PCT = LABEL_LINE_HEIGHT_PCT;
