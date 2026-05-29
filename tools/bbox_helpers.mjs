// Shared bounding-box geometry helpers.
//
// Extracted from tests/playwright/test_bench_basic_render.mjs so both the
// Playwright render tests and the scene-diagnostics tools (tools/scene_stats.mjs,
// tools/scene_to_png.mjs) share one definition of containment/overlap math.
//
// A bbox is a plain object { x, y, width, height } in CSS pixels, matching the
// shape returned by Playwright's locator.boundingBox().

//============================================
// Containment and overlap
//============================================

// Returns true when inner is fully inside outer.
export function bboxContains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// Returns true when bbox1 and bbox2 overlap by more than tolerance px on both axes.
export function bboxsOverlap(bbox1, bbox2, tolerance = 0) {
  const left = Math.max(bbox1.x, bbox2.x);
  const right = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
  const top = Math.max(bbox1.y, bbox2.y);
  const bottom = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

  const overlapWidth = right - left;
  const overlapHeight = bottom - top;

  return overlapWidth > tolerance && overlapHeight > tolerance;
}

//============================================
// viewBox parsing
//============================================

// Parses an SVG viewBox string "minX minY width height" into a bbox object.
// Returns null when the string is absent or malformed.
export function extractViewBoxDimensions(viewBoxStr) {
  if (!viewBoxStr) return null;
  const parts = viewBoxStr.trim().split(/\s+/).map(Number);
  if (parts.length !== 4) return null;
  if (parts.some((value) => Number.isNaN(value))) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}
