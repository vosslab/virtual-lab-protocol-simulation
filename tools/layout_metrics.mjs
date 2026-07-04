// tools/layout_metrics.mjs
//
// Developer tool: raw per-scene geometry metrics and SVG overlays.
// Emits NO interpretation -- no categories, verdicts, or thresholds.
// Interpretation lives in downstream tooling.
//
// Models each scene as a fixed-row packing problem (rows = zone bands by depth
// tier) and emits, for each scene, both a raw-metrics JSON file and an SVG
// overlay for visual inspection.
//
// Metrics emitted (JSON per scene):
//   fill               -- object fill ratio over scene_bounds (rectangle-union area)
//   largest_empty_rectangle -- largest empty AABB (grid approximation)
//   grid_occupancy     -- coarse 20x20 cell bitmap and occupancy fraction
//   zone_occupancy     -- per-zone occupied fraction
//   uniform_rescale    -- scene-wide terminal rescale: factor, floor flag, overflow
//   per_object         -- final scale, shrunk passes, floor flags, off-canvas, clamped
//   row_metrics        -- per row: item count, occupancy fraction, min inter-object gap
//   overlap_diagnostics -- Error-level overlap diagnostics from the engine's severity
//                          stream (unresolved_label_overlap, unresolved_overlap)
//   overlap_graph      -- AABB graph: object + label nodes; overlap/near/conflict edges
//   balance            -- area-weighted centroid offset; left/right and top/bottom ratios
//
// SVG overlay per scene: zone band fills, zone outlines, object AABBs (red if
// off-canvas), label AABBs (dashed green), placement name centered in each box.
//
// Usage (generated/ must exist -- run pipeline first):
//   node --import tsx tools/layout_metrics.mjs --all
//   node --import tsx tools/layout_metrics.mjs --scene <scene_name>
//
// Outputs to test-results/layout_metrics/:
//   <scene>_metrics.json
//   <scene>_overlay.svg
//
// Boundaries:
//   Read-only: never writes to src/, generated/, or dist/.
//   Reuses detectCollision from src/scene_runtime/layout/geometry/collision.ts.
//   Scene enumeration modeled on pipeline/precompute_layout.mjs.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { runPipeline } from "../src/scene_runtime/layout/index.ts";
import { detectCollision } from "../src/scene_runtime/layout/geometry/collision.ts";
import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";

//============================================
// Constants
//============================================

// Canonical viewport -- matches PRECOMPUTE_VIEWPORT in pipeline/precompute_layout.mjs.
const VIEWPORT = { w: 1920, h: 1080 };

// Coarse occupancy grid (400 cells -- small enough for JSON output).
const GRID_COLS = 20;
const GRID_ROWS = 20;

// High-resolution fill grid (reduces double-counting rounding error).
const FILL_COLS = 200;
const FILL_ROWS = 200;

// Largest-empty-rectangle approximation grid.
const LER_COLS = 50;
const LER_ROWS = 50;

// Near-overlap distance threshold in scene-percent.
const NEAR_THRESHOLD = 2;

// Horizontal packer floor: MIN_SCALE from src/scene_runtime/layout/constants.ts.
const H_FLOOR = 0.55;

// Terminal vertical rescale floor: UNIFORM_RESCALE_MIN_SCALE from constants.ts.
const V_FLOOR = 0.27;

// Tolerance for at-floor comparisons (avoids float equality issues).
const FLOOR_EPS = 0.01;

// SVG overlay canvas size (pixels).
const SVG_W = 960;
const SVG_H = 540;

// Repeating palette for zone band fills in the SVG overlay.
const BAND_FILLS = ["#4488ff", "#ff8844", "#44cc44", "#cc44cc", "#cccc44", "#44cccc"];

//============================================
// Repo root
//============================================

function repoRoot() {
  const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return top.trim();
}

//============================================
// Pipeline runner
//============================================

function runScenePipeline(scene) {
  return runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
    viewport: VIEWPORT,
  });
}

//============================================
// AABB helpers (scene-percent coordinates)
//============================================

// Returns { x, y, w, h } for the object artwork box of an item (top-left origin).
function objectAabb(item) {
  const x = item._centerX - item._visualWidth / 2;
  return { x, y: item._top, w: item._visualWidth, h: item._height };
}

// Returns { x, y, w, h } for the label box of an item, or null if no visible label.
function labelAabb(item) {
  const lh = item._labelBoxHeight ?? 0;
  if (lh <= 0) return null;
  const labelLines = item._labelLines;
  if (!labelLines || labelLines.length === 0) return null;
  const lw = item.layout.label_width;
  const x = item._labelX - lw / 2;
  return { x, y: item._labelY, w: lw, h: lh };
}

//============================================
// Occupancy grid helper
//============================================

// Marks cells in `occupied` (flat Uint8Array, rows*cols, row-major) covered by `box`
// within scene-bounds `sb`. Clamps to sb edges; ignores zero-size boxes.
function markBox(occupied, cols, rows, box, sb) {
  if (!box || box.w <= 0 || box.h <= 0) return;
  const sbW = sb.right - sb.left;
  const sbH = sb.bottom - sb.top;
  if (sbW <= 0 || sbH <= 0) return;
  const bLeft = Math.max(box.x, sb.left);
  const bRight = Math.min(box.x + box.w, sb.right);
  const bTop = Math.max(box.y, sb.top);
  const bBottom = Math.min(box.y + box.h, sb.bottom);
  if (bRight <= bLeft || bBottom <= bTop) return;
  const c0 = Math.floor(((bLeft - sb.left) / sbW) * cols);
  const c1 = Math.ceil(((bRight - sb.left) / sbW) * cols);
  const r0 = Math.floor(((bTop - sb.top) / sbH) * rows);
  const r1 = Math.ceil(((bBottom - sb.top) / sbH) * rows);
  for (let r = r0; r < Math.min(r1, rows); r++) {
    for (let c = c0; c < Math.min(c1, cols); c++) {
      occupied[r * cols + c] = 1;
    }
  }
}

//============================================
// Fill fraction (rectangle union, no double-counting)
//============================================

// Returns the fraction [0, 1] of scene_bounds covered by the union of objectBoxes.
// Approximated via a FILL_COLS x FILL_ROWS occupancy grid to avoid double-counting.
function fillFraction(objectBoxes, sb) {
  const occupied = new Uint8Array(FILL_ROWS * FILL_COLS);
  for (const box of objectBoxes) {
    markBox(occupied, FILL_COLS, FILL_ROWS, box, sb);
  }
  let count = 0;
  for (let i = 0; i < occupied.length; i++) {
    if (occupied[i]) count++;
  }
  return count / (FILL_ROWS * FILL_COLS);
}

//============================================
// Largest empty axis-aligned rectangle (grid approximation)
//============================================

// Returns { area_fraction, x, y, w, h } (scene-percent; area_fraction is [0, 1])
// for the largest empty AABB inside scene_bounds not covered by any object box.
// Algorithm: LER_COLS x LER_ROWS occupancy grid + largest-rectangle-in-histogram
// per row using a monotonic stack (O(cols) per row).
function largestEmptyRect(objectBoxes, sb) {
  const occupied = new Uint8Array(LER_ROWS * LER_COLS);
  for (const box of objectBoxes) {
    markBox(occupied, LER_COLS, LER_ROWS, box, sb);
  }

  // heights[c] = consecutive unoccupied rows above the current row at column c.
  const heights = new Int32Array(LER_COLS);
  let bestArea = 0;
  let bestH = 0;
  let bestC0 = 0;
  let bestC1 = 0;
  let bestR0 = 0;

  for (let r = 0; r < LER_ROWS; r++) {
    for (let c = 0; c < LER_COLS; c++) {
      heights[c] = occupied[r * LER_COLS + c] ? 0 : heights[c] + 1;
    }
    // Largest rectangle in histogram (monotonic stack).
    const stack = [];
    for (let c = 0; c <= LER_COLS; c++) {
      const h = c < LER_COLS ? heights[c] : 0;
      while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
        const top = stack.pop();
        const ht = heights[top];
        const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
        const area = ht * (c - left);
        if (area > bestArea) {
          bestArea = area;
          bestH = ht;
          bestC0 = left;
          bestC1 = c;
          bestR0 = r - ht + 1;
        }
      }
      stack.push(c);
    }
  }

  const sbW = sb.right - sb.left;
  const sbH = sb.bottom - sb.top;
  const cellW = sbW / LER_COLS;
  const cellH = sbH / LER_ROWS;

  return {
    area_fraction: parseFloat((bestArea / (LER_COLS * LER_ROWS)).toFixed(4)),
    x: parseFloat((sb.left + bestC0 * cellW).toFixed(2)),
    y: parseFloat((sb.top + bestR0 * cellH).toFixed(2)),
    w: parseFloat(((bestC1 - bestC0) * cellW).toFixed(2)),
    h: parseFloat((bestH * cellH).toFixed(2)),
  };
}

//============================================
// Coarse grid occupancy
//============================================

// Returns { cols, rows, cells, occupied_count, occupied_fraction }.
// cells is a flat number[] (0=empty, 1=occupied) in row-major order.
function gridOccupancy(objectBoxes, sb) {
  const occupied = new Uint8Array(GRID_ROWS * GRID_COLS);
  for (const box of objectBoxes) {
    markBox(occupied, GRID_COLS, GRID_ROWS, box, sb);
  }
  let count = 0;
  for (let i = 0; i < occupied.length; i++) {
    if (occupied[i]) count++;
  }
  return {
    cols: GRID_COLS,
    rows: GRID_ROWS,
    cells: Array.from(occupied),
    occupied_count: count,
    occupied_fraction: parseFloat((count / (GRID_ROWS * GRID_COLS)).toFixed(4)),
  };
}

//============================================
// Per-zone occupancy
//============================================

// Returns an object keyed by zone id: { occupied_fraction, zone_area }.
// zone_area is in scene-percent squared (same units as x/y/w/h fields).
function zoneOccupancy(items, scene) {
  const result = {};
  // 40x40 sub-grid per zone -- enough resolution for a fraction reading.
  const miniG = 40;
  for (const zone of scene.zones ?? []) {
    const za = (zone.bounds.right - zone.bounds.left) * (zone.bounds.bottom - zone.bounds.top);
    if (za <= 0) {
      result[zone.id] = { occupied_fraction: 0, zone_area: 0 };
      continue;
    }
    const zoneSb = {
      left: zone.bounds.left,
      right: zone.bounds.right,
      top: zone.bounds.top,
      bottom: zone.bounds.bottom,
    };
    const zoneBoxes = items.filter((it) => it.zone === zone.id).map((it) => objectAabb(it));
    const occ = new Uint8Array(miniG * miniG);
    for (const box of zoneBoxes) {
      markBox(occ, miniG, miniG, box, zoneSb);
    }
    let cnt = 0;
    for (let i = 0; i < occ.length; i++) {
      if (occ[i]) cnt++;
    }
    result[zone.id] = {
      occupied_fraction: parseFloat((cnt / (miniG * miniG)).toFixed(4)),
      zone_area: parseFloat(za.toFixed(3)),
    };
  }
  return result;
}

//============================================
// Per-object scale metrics
//============================================

// Returns an array of per-object metrics for each item in result.final.
// The terminal uniform rescale is scene-wide; only at_v_floor reflects it here.
// The dm_shrink field is the horizontal shrink factor from decisionMetadata
// (1.0 = no shrink applied; <1.0 = item was shrunk by the packer/row strategy).
function perObjectMetrics(items, reflowUniformScale, decisionMetadata, sb) {
  // Collect per-item horizontal shrink factors from decisionMetadata.zones.
  const dmShrink = {};
  for (const zd of decisionMetadata.zones ?? []) {
    for (const [name, factor] of Object.entries(zd.shrinkApplied ?? {})) {
      dmShrink[name] = factor;
    }
  }
  const uniformApplied = reflowUniformScale !== 1;
  const atVFloor = reflowUniformScale <= V_FLOOR + FLOOR_EPS;

  return items.map((item) => {
    const box = objectAabb(item);
    // Off-canvas: artwork box extends outside scene_bounds on any edge.
    const offCanvas =
      box.x < sb.left || box.x + box.w > sb.right || box.y < sb.top || box.y + box.h > sb.bottom;
    const scale = item._scale;
    return {
      placement_name: item.placement_name,
      zone: item.zone,
      depth_tier: item.depth_tier ?? null,
      final_scale: parseFloat(scale.toFixed(4)),
      shrunk_passes: item._shrunk_passes ?? 0,
      dm_shrink: dmShrink[item.placement_name] ?? null,
      at_h_floor: scale <= H_FLOOR + FLOOR_EPS,
      uniform_rescale_applied: uniformApplied,
      at_v_floor: atVFloor,
      off_canvas: offCanvas,
      clamped: item._clamped ?? false,
    };
  });
}

//============================================
// Row metrics
//============================================

// Returns an array of row records from the computed zone bands.
// One record per (zone, depth_tier) tier row: occupancy and min inter-object gap.
function rowMetrics(items, zoneBands, scene) {
  const byName = new Map(items.map((it) => [it.placement_name, it]));
  const records = [];

  for (const [zoneId, band] of (zoneBands ?? new Map()).entries()) {
    // Zone width in scene-percent; fall back to full scene width when zone not found.
    const zone = (scene.zones ?? []).find((z) => z.id === zoneId);
    const zoneW = zone ? zone.bounds.right - zone.bounds.left : 100;

    for (const tier of band.tiers) {
      const tierItems = tier.placementNames
        .map((n) => byName.get(n))
        .filter((it) => it !== undefined);

      if (tierItems.length === 0) {
        records.push({
          zone_id: zoneId,
          depth_tier: tier.depthTier,
          item_count: 0,
          occupancy_fraction: 0,
          min_gap_pct: null,
          row_height: parseFloat(tier.rowHeight.toFixed(3)),
        });
        continue;
      }

      // Occupancy: sum of footprints relative to zone width.
      const sumFp = tierItems.reduce((s, it) => s + (it._footprint ?? it._visualWidth), 0);
      const occupancy = zoneW > 0 ? sumFp / zoneW : 0;

      // Minimum visual gap: sort by center X, compare adjacent artwork edges.
      const sorted = tierItems.slice().sort((a, b) => a._centerX - b._centerX);
      let minGap = null;
      for (let i = 0; i + 1 < sorted.length; i++) {
        const aRight = sorted[i]._centerX + sorted[i]._visualWidth / 2;
        const bLeft = sorted[i + 1]._centerX - sorted[i + 1]._visualWidth / 2;
        const gap = bLeft - aRight;
        if (minGap === null || gap < minGap) minGap = gap;
      }

      records.push({
        zone_id: zoneId,
        depth_tier: tier.depthTier,
        item_count: tierItems.length,
        occupancy_fraction: parseFloat(occupancy.toFixed(4)),
        min_gap_pct: minGap !== null ? parseFloat(minGap.toFixed(3)) : null,
        row_height: parseFloat(tier.rowHeight.toFixed(3)),
      });
    }
  }
  return records;
}

//============================================
// Overlap diagnostics
//============================================

// Extracts overlap-related diagnostics from the severity stream.
// Includes both the label-overlap codes and the object-overlap Error
// (unresolved_overlap) the engine emits when items still collide after
// shrink-to-MIN_SCALE + pack, so the scorecard's Error set matches the
// engine's. No interpretation is added here.
function overlapDiagnostics(severityDiagnostics) {
  const OVERLAP_CODES = new Set([
    "unresolved_label_overlap",
    "poor_label_alignment",
    "unresolved_overlap",
  ]);
  return (severityDiagnostics ?? [])
    .filter((d) => OVERLAP_CODES.has(d.code))
    .map((d) => ({
      code: d.code,
      severity: d.severity,
      placement_name: d.pointer.placement_name ?? null,
      zone_name: d.pointer.zone_name ?? null,
      involved_items: d.payload?.involvedItems ?? null,
    }));
}

//============================================
// AABB overlap graph
//============================================

// Builds an AABB overlap graph using the centralized detectCollision predicate.
//
// Nodes:
//   "obj:<placement_name>" -- object artwork bounding box
//   "lbl:<placement_name>" -- label bounding box (only when item has a visible label)
//
// Edge types:
//   "overlap"        -- actual AABB collision (detectCollision returns non-null)
//   "near-overlap"   -- no overlap but within NEAR_THRESHOLD scene-percent on any side
//   "label-conflict" -- overlap where at least one node is a label box
//
// Edge tags (spatial relationship, object-pair only; label pairs always tagged "label"):
//   "same-tier"  -- same zone, same depth_tier
//   "cross-tier" -- same zone, different depth_tier
//   "cross-zone" -- different zones
//   "label"      -- at least one node is a label box
function overlapGraph(items) {
  // Build node list: object box, then optional label box, per item.
  const nodes = [];
  for (const item of items) {
    nodes.push({
      id: `obj:${item.placement_name}`,
      kind: "object",
      pname: item.placement_name,
      zone: item.zone,
      tier: item.depth_tier ?? 0,
      aabb: objectAabb(item),
    });
    const lb = labelAabb(item);
    if (lb) {
      nodes.push({
        id: `lbl:${item.placement_name}`,
        kind: "label",
        pname: item.placement_name,
        zone: item.zone,
        tier: item.depth_tier ?? 0,
        aabb: lb,
      });
    }
  }

  const edges = [];
  const half = NEAR_THRESHOLD / 2;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const na = nodes[i];
      const nb = nodes[j];

      // Classify spatial relationship.
      let tag;
      if (na.kind === "label" || nb.kind === "label") {
        tag = "label";
      } else if (na.zone === nb.zone) {
        tag = na.tier === nb.tier ? "same-tier" : "cross-tier";
      } else {
        tag = "cross-zone";
      }

      // Test for actual overlap first.
      const col = detectCollision(na.aabb, na.id, nb.aabb, nb.id);
      if (col !== null) {
        const edgeType = na.kind === "label" || nb.kind === "label" ? "label-conflict" : "overlap";
        edges.push({
          a: na.id,
          b: nb.id,
          type: edgeType,
          tag,
          depth: parseFloat(col.overlapDepth.toFixed(3)),
          axis: col.overlapAxis,
        });
        continue;
      }

      // Test for near-overlap: expand box A by NEAR_THRESHOLD/2 on each side.
      const expanded = {
        x: na.aabb.x - half,
        y: na.aabb.y - half,
        w: na.aabb.w + NEAR_THRESHOLD,
        h: na.aabb.h + NEAR_THRESHOLD,
      };
      if (detectCollision(expanded, na.id, nb.aabb, nb.id) !== null) {
        edges.push({ a: na.id, b: nb.id, type: "near-overlap", tag, depth: null, axis: null });
      }
    }
  }

  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      placement_name: n.pname,
      zone: n.zone,
      depth_tier: n.tier,
      x: parseFloat(n.aabb.x.toFixed(3)),
      y: parseFloat(n.aabb.y.toFixed(3)),
      w: parseFloat(n.aabb.w.toFixed(3)),
      h: parseFloat(n.aabb.h.toFixed(3)),
    })),
    edges,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      overlap_count: edges.filter((e) => e.type === "overlap").length,
      near_overlap_count: edges.filter((e) => e.type === "near-overlap").length,
      label_conflict_count: edges.filter((e) => e.type === "label-conflict").length,
    },
  };
}

//============================================
// Balance
//============================================

// Returns area-weighted centroid position (and its offset from scene_bounds center),
// plus left/right and top/bottom area fractions across all object boxes.
function balance(items, sb) {
  const cx = (sb.left + sb.right) / 2;
  const cy = (sb.top + sb.bottom) / 2;
  let totalArea = 0;
  let wx = 0;
  let wy = 0;
  let leftArea = 0;
  let rightArea = 0;
  let topArea = 0;
  let bottomArea = 0;

  for (const item of items) {
    const box = objectAabb(item);
    const area = box.w * box.h;
    const bcx = box.x + box.w / 2;
    const bcy = box.y + box.h / 2;
    totalArea += area;
    wx += area * bcx;
    wy += area * bcy;
    if (bcx < cx) leftArea += area;
    else rightArea += area;
    if (bcy < cy) topArea += area;
    else bottomArea += area;
  }

  if (totalArea <= 0) {
    return {
      centroid_x: null,
      centroid_y: null,
      offset_x: null,
      offset_y: null,
      left_fraction: null,
      right_fraction: null,
      top_fraction: null,
      bottom_fraction: null,
    };
  }

  return {
    centroid_x: parseFloat((wx / totalArea).toFixed(3)),
    centroid_y: parseFloat((wy / totalArea).toFixed(3)),
    offset_x: parseFloat((wx / totalArea - cx).toFixed(3)),
    offset_y: parseFloat((wy / totalArea - cy).toFixed(3)),
    left_fraction: parseFloat((leftArea / totalArea).toFixed(4)),
    right_fraction: parseFloat((rightArea / totalArea).toFixed(4)),
    top_fraction: parseFloat((topArea / totalArea).toFixed(4)),
    bottom_fraction: parseFloat((bottomArea / totalArea).toFixed(4)),
  };
}

//============================================
// Assemble metrics
//============================================

// Assembles all raw metrics for one scene into a single JSON-serializable object.
function computeMetrics(sceneName, result) {
  const items = result.final;
  const scene = result.scene;
  const sb = scene.scene_bounds;
  const objBoxes = items.map((it) => objectAabb(it));

  const fill = fillFraction(objBoxes, sb);
  const ler = largestEmptyRect(objBoxes, sb);
  const grid = gridOccupancy(objBoxes, sb);
  const zones = zoneOccupancy(items, scene);
  const perObj = perObjectMetrics(items, result.reflowUniformScale, result.decisionMetadata, sb);
  const rows = rowMetrics(items, result.zoneBands, scene);
  const ovlDiagnostics = overlapDiagnostics(result.severityDiagnostics);
  const graph = overlapGraph(items);
  const bal = balance(items, sb);

  return {
    scene_name: sceneName,
    item_count: items.length,
    scene_bounds: { left: sb.left, right: sb.right, top: sb.top, bottom: sb.bottom },
    fill: {
      fraction: parseFloat(fill.toFixed(4)),
      percent: parseFloat((fill * 100).toFixed(2)),
    },
    largest_empty_rectangle: ler,
    grid_occupancy: grid,
    zone_occupancy: zones,
    uniform_rescale: {
      applied: result.reflowUniformScale !== 1,
      factor: parseFloat(result.reflowUniformScale.toFixed(4)),
      at_floor: result.reflowUniformScale <= V_FLOOR + FLOOR_EPS,
      pre_rescale_overflow: result.reflowOverflow,
      post_rescale_overflow: result.sceneReflowOverflow,
      label_dominant: result.labelDominant,
    },
    per_object: perObj,
    row_metrics: rows,
    overlap_diagnostics: ovlDiagnostics,
    overlap_graph: graph,
    balance: bal,
    passes_used: result.passes.length,
  };
}

//============================================
// SVG overlay
//============================================

// Generates an SVG overlay (SVG_W x SVG_H pixels) showing:
//   Zone computed band fills (semi-transparent; one color per zone)
//   Zone authored bounds (dashed gray outlines)
//   Object artwork AABBs (blue normally; red when off-canvas)
//   Label AABBs (dashed green)
//   Placement name centered in each object box
//   Scene name as title in the top-left corner
function generateOverlay(sceneName, result) {
  const items = result.final;
  const scene = result.scene;
  const sb = scene.scene_bounds;
  const sbW = sb.right - sb.left;
  const sbH = sb.bottom - sb.top;

  // Convert scene-percent to SVG pixel x/y positions.
  function px(v) {
    return ((v - sb.left) / sbW) * SVG_W;
  }
  function py(v) {
    return ((v - sb.top) / sbH) * SVG_H;
  }
  // Convert scene-percent width/height to SVG pixel dimensions.
  function pw(v) {
    return (v / sbW) * SVG_W;
  }
  function ph(v) {
    return (v / sbH) * SVG_H;
  }
  // One decimal place for SVG coordinate attributes.
  function r1(n) {
    return n.toFixed(1);
  }

  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}"`,
    `     viewBox="0 0 ${SVG_W} ${SVG_H}">`,
    `<rect width="${SVG_W}" height="${SVG_H}" fill="#f5f5f5"/>`,
  ];

  // Zone computed band fills (low opacity semi-transparent bands across full width).
  lines.push(`<g id="zone-bands">`);
  let bi = 0;
  for (const [zid, band] of (result.zoneBands ?? new Map()).entries()) {
    const bandFill = BAND_FILLS[bi % BAND_FILLS.length];
    const bandY = r1(py(band.top));
    const bandH = r1(ph(band.bottom - band.top));
    lines.push(
      `  <rect x="0" y="${bandY}" width="${SVG_W}" height="${bandH}"`,
      `        fill="${bandFill}" fill-opacity="0.15"/>`,
    );
    // Zone id label at band midpoint on the left edge.
    const midY = r1(py((band.top + band.bottom) / 2));
    lines.push(
      `  <text x="4" y="${midY}" font-size="9" fill="${bandFill}"`,
      `        font-family="monospace" fill-opacity="0.7">${zid}</text>`,
    );
    bi++;
  }
  lines.push(`</g>`);

  // Authored zone bounds (dashed gray outlines for visual reference).
  lines.push(
    `<g id="zone-bounds" fill="none" stroke="#aaa" stroke-width="0.5" stroke-dasharray="4 2">`,
  );
  for (const zone of scene.zones ?? []) {
    const zx = r1(px(zone.bounds.left));
    const zy = r1(py(zone.bounds.top));
    const zw = r1(pw(zone.bounds.right - zone.bounds.left));
    const zh = r1(ph(zone.bounds.bottom - zone.bounds.top));
    lines.push(`  <rect x="${zx}" y="${zy}" width="${zw}" height="${zh}"/>`);
  }
  lines.push(`</g>`);

  // Object artwork bounding boxes (blue; red when off-canvas).
  lines.push(`<g id="objects">`);
  for (const item of items) {
    const box = objectAabb(item);
    const ox = r1(px(box.x));
    const oy = r1(py(box.y));
    const ow = r1(pw(box.w));
    const oh = r1(ph(box.h));
    const offCanvas =
      box.x < sb.left || box.x + box.w > sb.right || box.y < sb.top || box.y + box.h > sb.bottom;
    const stroke = offCanvas ? "#dd2222" : "#2244cc";
    lines.push(
      `  <rect x="${ox}" y="${oy}" width="${ow}" height="${oh}"`,
      `        fill="${stroke}" fill-opacity="0.05" stroke="${stroke}" stroke-width="1.5"/>`,
    );
    // Placement name centered inside the object box.
    const tx = r1(px(box.x) + pw(box.w) / 2);
    const ty = r1(py(box.y) + ph(box.h) / 2);
    lines.push(
      `  <text x="${tx}" y="${ty}" font-size="6" fill="${stroke}"`,
      `        text-anchor="middle" dominant-baseline="middle"`,
      `        font-family="monospace">${item.placement_name}</text>`,
    );
  }
  lines.push(`</g>`);

  // Label bounding boxes (dashed green).
  lines.push(
    `<g id="labels" fill="none" stroke="#229944" stroke-width="1" stroke-dasharray="3 2">`,
  );
  for (const item of items) {
    const lb = labelAabb(item);
    if (!lb) continue;
    const lx = r1(px(lb.x));
    const ly = r1(py(lb.y));
    const lw = r1(pw(lb.w));
    const lh = r1(ph(lb.h));
    lines.push(`  <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}"/>`);
  }
  lines.push(`</g>`);

  // Outer border for the canvas.
  lines.push(
    `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}"`,
    `      fill="none" stroke="#333" stroke-width="2"/>`,
  );

  // Scene title.
  lines.push(
    `<text x="4" y="13" font-size="11" fill="#444" font-family="monospace">${sceneName}</text>`,
  );

  lines.push(`</svg>`);
  return lines.join("\n");
}

//============================================
// File I/O
//============================================

function writeOutputs(root, sceneName, metrics, overlay) {
  const dir = path.join(root, "test-results", "layout_metrics");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${sceneName}_metrics.json`),
    JSON.stringify(metrics, null, 2),
    "utf8",
  );
  fs.writeFileSync(path.join(dir, `${sceneName}_overlay.svg`), overlay, "utf8");
}

//============================================
// CLI
//============================================

function parseArgs() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    process.stderr.write(
      "Usage:\n" +
        "  node --import tsx tools/layout_metrics.mjs --all\n" +
        "  node --import tsx tools/layout_metrics.mjs --scene <name>\n",
    );
    process.exit(1);
  }
  if (argv.includes("--all") && argv.includes("--scene")) {
    process.stderr.write("Error: --all and --scene are mutually exclusive\n");
    process.exit(1);
  }
  if (argv.includes("--all")) {
    return { mode: "all", sceneName: null };
  }
  const si = argv.indexOf("--scene");
  if (si !== -1) {
    const name = argv[si + 1];
    if (!name || name.startsWith("-")) {
      process.stderr.write("Error: --scene requires a scene name argument\n");
      process.exit(1);
    }
    return { mode: "single", sceneName: name };
  }
  process.stderr.write(`Error: unrecognized arguments: ${argv.join(" ")}\n`);
  process.exit(1);
}

//============================================
// Main
//============================================

function main() {
  const root = repoRoot();
  const opts = parseArgs();

  let sceneNames;
  if (opts.mode === "all") {
    sceneNames = Object.keys(SCENES).sort();
  } else {
    if (!SCENES[opts.sceneName]) {
      process.stderr.write(`Error: unknown scene "${opts.sceneName}"\n`);
      process.stderr.write(`Known scenes: ${Object.keys(SCENES).sort().join(", ")}\n`);
      process.exit(1);
    }
    sceneNames = [opts.sceneName];
  }

  for (const sceneName of sceneNames) {
    const result = runScenePipeline(SCENES[sceneName]);
    const metrics = computeMetrics(sceneName, result);
    const overlay = generateOverlay(sceneName, result);
    writeOutputs(root, sceneName, metrics, overlay);
  }

  const outDir = path.join(root, "test-results", "layout_metrics");
  process.stdout.write(`layout_metrics: ${sceneNames.length} scene(s) -> ${outDir}\n`);
}

main();
