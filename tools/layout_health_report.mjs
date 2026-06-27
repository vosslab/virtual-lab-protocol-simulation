// tools/layout_health_report.mjs
//
// Developer tool: scene layout health report and author
// scorecard. This tool IS interpretation -- it turns the raw, opinion-free
// geometry metrics emitted by tools/layout_metrics.mjs into a
// designer-facing diagnosis: provisional health categories, a finding
// classifier (engine-fit / authoring / intentional / validation), a structured
// per-scene verdict with evidence and a suggested authoring target, and a
// worst-first aggregate scorecard.
//
// It reads the metrics JSON only; it never recomputes geometry and never
// runs the layout pipeline. If the metrics are missing, it tells the user to
// run tools/layout_metrics.mjs --all first.
//
// PROXY LABELING (locked decision 1):
//   The layout engine exposes no true per-object rescale-iteration count and no
//   floors-hit count. Shrink severity here is derived only from PROXY signals:
//   final_scale, at_h_floor (scale <= 0.56), the scene-wide uniform_rescale
//   factor / at_floor flag, shrunk_passes, and dm_shrink. Every place the report
//   uses shrink evidence it labels it "shrink proxy". No iteration count is
//   reported or implied.
//
// PROVISIONAL BANDS (locked decision 7, manager-owned):
//   The advisory bands (target fill range, large-empty-rectangle threshold,
//   shrink-severity threshold, plus an auxiliary label threshold) are derived at
//   runtime from the DISTRIBUTION of metric values across the scenes present
//   (percentile-based). They are provisional and pending human final approval;
//   they drive category assignment but are not contract thresholds.
//
// BORDERLINE (locked decision 6):
//   A scene whose triggering metric lands within a small margin of a band edge
//   is tagged "borderline" rather than hard-classified. The 50x50 LER grid and
//   200x200 fill grid are approximate, so near-edge readings are flagged.
//
// Usage:
//   node --import tsx tools/layout_health_report.mjs --all
//   node --import tsx tools/layout_health_report.mjs --scene <scene_name>
//
// Outputs to test-results/layout_health/:
//   health_report.md    -- designer-facing report (worst-first)
//   health_report.json  -- machine-readable bands + per-scene diagnoses
// and prints the bands and worst-first scorecard to stdout.
//
// Boundaries:
//   Read-only consumer of test-results/layout_metrics/*.json.
//   Never writes to src/, generated/, or dist/. Never edits the metrics tool.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

//============================================
// Constants
//============================================

// Engine floors, for PROXY context only (matches src/scene_runtime/layout/constants.ts).
// H_FLOOR = MIN_SCALE (horizontal packer); V_FLOOR = UNIFORM_RESCALE_MIN_SCALE.
const H_FLOOR = 0.55;
const V_FLOOR = 0.27;

// A scene counts as shrunk-by-majority when at least this fraction of its
// objects are at the horizontal packer floor (proxy: final_scale <= 0.56).
const MAJORITY_AT_FLOOR_FRAC = 0.5;

// Item count at or below which a scene is treated as a trivial fixture
// (a dev/test scene with almost no content), classified intentional.
const TRIVIAL_ITEM_COUNT = 2;

// Borderline margins: a metric within this distance of a band edge is borderline.
const FILL_BORDERLINE_FRAC = 0.1; // fraction of the [p25, p75] fill range
const LER_BORDERLINE_ABS = 0.02; // scene-area fraction
const SHRINK_BORDERLINE_ABS = 0.05; // mean final_scale
const LABEL_BORDERLINE_ABS = 1; // label conflict count

// Worst-first severity weights (documented in the report header).
const W_OFF_CANVAS = 1000;
const W_SAME_TIER_OVERLAP = 100;
const W_HIGH_EMPTY_SHRINK = 50;
const W_SHRINK_SEVERITY = 60; // times (1 - mean_scale)
const W_WASTED_ROOM = 60; // times max(0, ler - ler_high) when shrunk
const W_LABEL = 3; // times min(label_conflicts, 30)
const W_UNIFORM_FLOOR = 15;
const W_OBJ_OVERLAP = 5;

//============================================
// Repo root
//============================================

function repoRoot() {
  const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return top.trim();
}

//============================================
// Load metrics
//============================================

// Reads every <scene>_metrics.json from the metrics output directory.
// Returns an array of parsed metrics objects sorted by scene_name.
// Exits with guidance if the directory is missing or empty.
function loadAllMetrics(root) {
  const dir = path.join(root, "test-results", "layout_metrics");
  if (!fs.existsSync(dir)) {
    process.stderr.write(
      `Error: ${dir} not found.\n` +
        "Run the raw-metrics generator first:\n" +
        "  node --import tsx tools/layout_metrics.mjs --all\n",
    );
    process.exit(1);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith("_metrics.json"))
    .sort();
  if (files.length === 0) {
    process.stderr.write(
      `Error: no *_metrics.json files in ${dir}.\n` +
        "Run the raw-metrics generator first:\n" +
        "  node --import tsx tools/layout_metrics.mjs --all\n",
    );
    process.exit(1);
  }
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

//============================================
// Distribution helpers
//============================================

// Linear-interpolated percentile of a numeric array (p in [0, 1]).
function percentile(values, p) {
  const sorted = values
    .filter((v) => v !== null && !Number.isNaN(v))
    .slice()
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

// Rounds to a fixed number of decimals and returns a Number (for clean JSON).
function round(n, places) {
  if (n === null || n === undefined) return null;
  return parseFloat(n.toFixed(places));
}

//============================================
// Per-scene feature extraction (proxy signals)
//============================================

// Translates an empty-rectangle box into a coarse region name relative to
// scene_bounds, e.g. "upper-right", "center", "lower-left".
function rectRegion(rect, sb) {
  const sbW = sb.right - sb.left;
  const sbH = sb.bottom - sb.top;
  if (sbW <= 0 || sbH <= 0) return "center";
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const fx = (cx - sb.left) / sbW;
  const fy = (cy - sb.top) / sbH;
  const horiz = fx < 0.4 ? "left" : fx > 0.6 ? "right" : "center";
  const vert = fy < 0.4 ? "upper" : fy > 0.6 ? "lower" : "middle";
  if (horiz === "center" && vert === "middle") return "center";
  if (vert === "middle") return horiz;
  if (horiz === "center") return vert;
  return `${vert}-${horiz}`;
}

// Reduces one metrics object to the scalar proxy features the classifier
// and the bands consume. All shrink fields are PROXY signals.
function sceneFeatures(m) {
  const objs = m.per_object;
  const n = objs.length;
  const scales = objs.map((o) => o.final_scale);
  const meanScale = n > 0 ? scales.reduce((a, b) => a + b, 0) / n : 1;
  const minScale = n > 0 ? Math.min(...scales) : 1;
  const atHFloor = objs.filter((o) => o.at_h_floor).length;
  const offCanvas = objs.filter((o) => o.off_canvas).length;
  const maxPasses = n > 0 ? Math.max(...objs.map((o) => o.shrunk_passes)) : 0;

  // Overlap-graph edge breakdown (object-object overlaps only; labels separate).
  const edges = m.overlap_graph.edges;
  const objOverlapEdges = edges.filter((e) => e.type === "overlap");
  const sameTier = objOverlapEdges.filter((e) => e.tag === "same-tier").length;
  const crossTier = objOverlapEdges.filter((e) => e.tag === "cross-tier").length;
  const crossZone = objOverlapEdges.filter((e) => e.tag === "cross-zone").length;

  // Zone with the highest occupied fraction -- used for authoring suggestions.
  let topZone = null;
  let topZoneOcc = -1;
  for (const [zid, z] of Object.entries(m.zone_occupancy)) {
    if (z.occupied_fraction > topZoneOcc) {
      topZoneOcc = z.occupied_fraction;
      topZone = zid;
    }
  }

  // Minimum inter-object gap across all populated rows (scene-percent).
  let minGap = null;
  for (const r of m.row_metrics) {
    if (r.min_gap_pct !== null && (minGap === null || r.min_gap_pct < minGap)) {
      minGap = r.min_gap_pct;
    }
  }

  const ler = m.largest_empty_rectangle;
  return {
    scene: m.scene_name,
    item_count: n,
    fill: m.fill.fraction,
    ler: ler.area_fraction,
    ler_region: rectRegion(ler, m.scene_bounds),
    mean_scale: round(meanScale, 4),
    min_scale: round(minScale, 4),
    shrink_severity: round(1 - meanScale, 4),
    frac_at_h_floor: n > 0 ? round(atHFloor / n, 3) : 0,
    uniform_applied: m.uniform_rescale.applied,
    uniform_factor: m.uniform_rescale.factor,
    uniform_at_floor: m.uniform_rescale.at_floor,
    label_dominant: m.uniform_rescale.label_dominant,
    max_shrunk_passes: maxPasses,
    label_conflicts: m.overlap_graph.summary.label_conflict_count,
    obj_overlaps: m.overlap_graph.summary.overlap_count,
    same_tier_overlaps: sameTier,
    cross_tier_overlaps: crossTier,
    cross_zone_overlaps: crossZone,
    off_canvas_count: offCanvas,
    top_zone: topZone,
    top_zone_occupancy: round(topZoneOcc, 4),
    min_gap_pct: minGap,
    offset_x: m.balance.offset_x,
    offset_y: m.balance.offset_y,
  };
}

//============================================
// Provisional advisory bands (distribution-derived)
//============================================

// Derives the provisional bands from the feature distribution across all scenes.
// Each band records its percentile basis and the sample so the report can show
// the derivation. All bands are provisional and pending human approval.
function deriveBands(features) {
  const fills = features.map((f) => f.fill);
  const lers = features.map((f) => f.ler);
  const meanScales = features.map((f) => f.mean_scale);
  const labels = features.map((f) => f.label_conflicts);

  const fillLow = percentile(fills, 0.25);
  const fillHigh = percentile(fills, 0.75);
  const lerHigh = percentile(lers, 0.75);
  const lerSevere = percentile(lers, 0.9);
  const shrinkEdge = percentile(meanScales, 0.5);
  const labelEdge = percentile(labels, 0.9);

  return {
    sample_size: features.length,
    fill: {
      metric: "fill.fraction",
      basis: "p25..p75 (target range)",
      target_low: round(fillLow, 4),
      target_high: round(fillHigh, 4),
      min: round(percentile(fills, 0), 4),
      median: round(percentile(fills, 0.5), 4),
      max: round(percentile(fills, 1), 4),
      note: "fill is low repo-wide; sparse = below p25, dense = above p75 (relative)",
    },
    ler: {
      metric: "largest_empty_rectangle.area_fraction",
      basis: "p75 (elevated) / p90 (severe)",
      elevated_edge: round(lerHigh, 4),
      severe_edge: round(lerSevere, 4),
      min: round(percentile(lers, 0), 4),
      median: round(percentile(lers, 0.5), 4),
      max: round(percentile(lers, 1), 4),
      note: "a large empty rectangle means usable room exists in the scene",
    },
    shrink: {
      metric: "mean final_scale (PROXY)",
      basis: "p50 (median readable scale)",
      stressed_edge: round(shrinkEdge, 4),
      min: round(percentile(meanScales, 0), 4),
      median: round(shrinkEdge, 4),
      max: round(percentile(meanScales, 1), 4),
      hard_floors: { h_floor: H_FLOOR, v_floor: V_FLOOR },
      note:
        "shrink-stressed = mean final_scale at or below the median, OR uniform " +
        "rescale at floor, OR a majority of objects at the packer floor (all PROXY)",
    },
    label: {
      metric: "overlap_graph.label_conflict_count",
      basis: "p90 (auxiliary, not one of the three required bands)",
      stressed_edge: round(labelEdge, 4),
      max: round(percentile(labels, 1), 4),
      note: "label-conflict distribution is degenerate (mostly zero); edge applied with a margin",
    },
  };
}

//============================================
// Classification
//============================================

// True when |value - edge| <= margin (value lands on a band edge).
function nearEdge(value, edge, margin) {
  if (value === null || edge === null) return false;
  return Math.abs(value - edge) <= margin;
}

// Classifies one scene against the provisional bands. Returns its categories,
// borderline tags, primary finding class, one-line verdict, evidence bullets,
// suggested authoring target, and a worst-first severity score.
function classifyScene(f, bands) {
  const categories = [];
  const borderline = [];

  // --- Stress detection (all shrink conditions are PROXY-based) ---
  const trivial = f.item_count <= TRIVIAL_ITEM_COUNT;
  const shrinkStressed =
    !trivial &&
    (f.mean_scale <= bands.shrink.stressed_edge ||
      f.uniform_at_floor ||
      f.frac_at_h_floor >= MAJORITY_AT_FLOOR_FRAC);
  const roomExists = f.ler >= bands.ler.elevated_edge;
  const highEmptyShrink = shrinkStressed && roomExists;
  const offCanvas = f.off_canvas_count > 0;
  const labelStressed = f.label_conflicts >= bands.label.stressed_edge && f.label_conflicts > 0;
  // Crowded: real object overlaps, or a dense scene forced to shrink.
  const crowded =
    !trivial && (f.obj_overlaps > 0 || (f.fill >= bands.fill.target_high && shrinkStressed));
  // Sparse: well below the fill floor and not shrunk (readable), or trivial fixture.
  const fillLow = f.fill < bands.fill.target_low;
  const sparse = trivial || (fillLow && !shrinkStressed && !crowded);

  // --- Category list (a scene may carry several) ---
  if (offCanvas) categories.push("off-canvas");
  if (highEmptyShrink) categories.push("high-empty-space-plus-shrink");
  if (shrinkStressed) categories.push("shrink-stressed");
  if (crowded) categories.push("crowded");
  if (labelStressed) categories.push("label-stressed");
  if (sparse) categories.push("sparse");
  if (categories.length === 0) categories.push("healthy");

  // --- Borderline tagging (decision 6): metric within a margin of a band edge ---
  const fillMargin = FILL_BORDERLINE_FRAC * (bands.fill.target_high - bands.fill.target_low);
  if (nearEdge(f.fill, bands.fill.target_low, fillMargin)) borderline.push("fill~sparse-edge");
  if (nearEdge(f.fill, bands.fill.target_high, fillMargin)) borderline.push("fill~dense-edge");
  if (nearEdge(f.ler, bands.ler.elevated_edge, LER_BORDERLINE_ABS))
    borderline.push("ler~room-edge");
  if (nearEdge(f.mean_scale, bands.shrink.stressed_edge, SHRINK_BORDERLINE_ABS)) {
    borderline.push("shrink~stressed-edge");
  }
  if (nearEdge(f.label_conflicts, bands.label.stressed_edge, LABEL_BORDERLINE_ABS)) {
    borderline.push("label~stressed-edge");
  }

  // --- Primary finding class + one-line verdict (priority order) ---
  let finding;
  let verdict;
  if (offCanvas) {
    finding = "validation";
    verdict = "art falls off-canvas and the engine validation does not fail on it";
  } else if (f.same_tier_overlaps > 0) {
    finding = "validation";
    verdict = "same-tier objects overlap (a real collision) without being caught";
  } else if (highEmptyShrink) {
    finding = "engine-fit";
    verdict = `engine leaves usable space (${f.ler_region}) while shrinking content toward the floor`;
  } else if (shrinkStressed) {
    finding = "authoring";
    verdict =
      "content is shrunk to fit with little spare room; likely too many objects for the zones";
  } else if (crowded && f.obj_overlaps > 0 && f.same_tier_overlaps === 0) {
    finding = "intentional";
    verdict =
      "dense scene with non-same-tier object overlap (cross-tier/cross-zone z-layering), content readable";
  } else if (crowded) {
    finding = "authoring";
    verdict = "dense scene; content pressure from object count or zone choice";
  } else if (labelStressed) {
    finding = "validation";
    verdict = "labels collide and the engine validation does not fail on it";
  } else if (sparse) {
    finding = "intentional";
    verdict = trivial
      ? "trivial fixture: almost no content, nothing to pack"
      : "sparse but readable and not shrunk; composition looks intentional";
  } else {
    finding = "healthy";
    verdict = "content fits at a readable scale with no overlap or label pressure";
  }

  // --- Evidence bullets (shrink evidence explicitly labeled PROXY) ---
  const evidence = [];
  evidence.push(`fill ${f.fill} (band ${bands.fill.target_low}..${bands.fill.target_high})`);
  evidence.push(
    `largest empty rect ${round(f.ler * 100, 1)}% at ${f.ler_region} (room edge ${bands.ler.elevated_edge})`,
  );
  evidence.push(
    `shrink proxy: mean final_scale ${f.mean_scale}, min ${f.min_scale}, ` +
      `${round(f.frac_at_h_floor * 100, 0)}% of objects at_h_floor (<=${round(H_FLOOR + 0.01, 2)})`,
  );
  if (f.uniform_applied) {
    evidence.push(
      `shrink proxy: uniform_rescale factor ${f.uniform_factor}` +
        (f.uniform_at_floor ? ` (AT v-floor ${V_FLOOR})` : ""),
    );
  }
  if (f.max_shrunk_passes > 0) {
    evidence.push(`shrink proxy: up to ${f.max_shrunk_passes} horizontal shrink pass(es)`);
  }
  if (f.label_conflicts > 0) {
    evidence.push(`label conflicts ${f.label_conflicts} (edge ${bands.label.stressed_edge})`);
  }
  if (f.obj_overlaps > 0) {
    evidence.push(
      `object overlaps ${f.obj_overlaps} (same-tier ${f.same_tier_overlaps}, ` +
        `cross-tier ${f.cross_tier_overlaps}, cross-zone ${f.cross_zone_overlaps})`,
    );
  }
  evidence.push(`${f.item_count} objects; balance offset (${f.offset_x}, ${f.offset_y})`);

  // --- Suggested authoring target ---
  const suggestion = suggestTarget(finding, f, highEmptyShrink, labelStressed, trivial);

  // --- Worst-first severity score ---
  const wastedRoom = shrinkStressed ? Math.max(0, f.ler - bands.ler.elevated_edge) : 0;
  const severity =
    W_OFF_CANVAS * f.off_canvas_count +
    W_SAME_TIER_OVERLAP * f.same_tier_overlaps +
    W_HIGH_EMPTY_SHRINK * (highEmptyShrink ? 1 : 0) +
    W_SHRINK_SEVERITY * Math.max(0, f.shrink_severity) +
    W_WASTED_ROOM * wastedRoom +
    W_LABEL * Math.min(f.label_conflicts, 30) +
    W_UNIFORM_FLOOR * (f.uniform_at_floor ? 1 : 0) +
    W_OBJ_OVERLAP * f.obj_overlaps;

  return {
    scene: f.scene,
    categories,
    borderline,
    finding,
    verdict,
    evidence,
    suggestion,
    severity: round(severity, 2),
  };
}

// Builds a suggested authoring target string from the primary finding.
function suggestTarget(finding, f, highEmptyShrink, labelStressed, trivial) {
  if (finding === "validation" && f.off_canvas_count > 0) {
    return "pull off-canvas objects back inside scene_bounds (route to LAYOUT_REMAINING_WORK)";
  }
  if (finding === "validation" && f.same_tier_overlaps > 0) {
    return "separate the overlapping same-tier objects or move one to another depth tier";
  }
  if (finding === "validation" && labelStressed) {
    return `shorten labels or widen label spacing in zone ${f.top_zone} (${f.label_conflicts} conflicts)`;
  }
  if (highEmptyShrink) {
    return (
      `objects shrink while the ${f.ler_region} stays empty; widen the packed zone ` +
      `(${f.top_zone}) or spread objects into the ${f.ler_region} empty band so the solver need not shrink`
    );
  }
  if (finding === "authoring" && f.obj_overlaps > 0) {
    return `reduce object count or split zone ${f.top_zone} across an added row`;
  }
  if (finding === "authoring") {
    return `too many objects for the zones; reduce count in zone ${f.top_zone} or add a zone row`;
  }
  if (finding === "intentional" && trivial) {
    return "no change needed (trivial dev/test fixture)";
  }
  if (finding === "intentional" && f.obj_overlaps > 0) {
    return "no change needed (intentional non-same-tier layering); confirm overlaps are by design";
  }
  if (finding === "intentional") {
    return "no change needed; add context objects only if pedagogically useful";
  }
  return "no change needed";
}

//============================================
// Report assembly
//============================================

function buildReport(metrics) {
  const features = metrics.map(sceneFeatures);
  const bands = deriveBands(features);
  const diagnoses = features.map((f) => classifyScene(f, bands));

  // Worst-first ordering; ties broken by scene name for determinism.
  diagnoses.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.scene < b.scene ? -1 : a.scene > b.scene ? 1 : 0;
  });

  // Category roll-up (how many scenes carry each category).
  const categoryCounts = {};
  for (const d of diagnoses) {
    for (const c of d.categories) {
      categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
    }
  }
  const findingCounts = {};
  for (const d of diagnoses) {
    findingCounts[d.finding] = (findingCounts[d.finding] ?? 0) + 1;
  }

  return { bands, diagnoses, categoryCounts, findingCounts };
}

//============================================
// Markdown rendering
//============================================

function renderMarkdown(report) {
  const { bands, diagnoses, categoryCounts, findingCounts } = report;
  const lines = [];

  lines.push("# Scene layout health report");
  lines.push("");
  lines.push(`Scenes analyzed: ${bands.sample_size}`);
  lines.push("");
  lines.push(
    "Shrink severity is PROXY-derived. The layout engine exposes no true " +
      "rescale-iteration count or floors-hit count. Shrink evidence below comes " +
      "only from proxy signals (final_scale, at_h_floor, uniform_rescale factor / " +
      "at_floor, shrunk_passes, dm_shrink). No iteration count is reported or implied.",
  );
  lines.push("");
  lines.push(
    "Bands are provisional, distribution-derived (percentile-based across the " +
      "scenes present), and pending human final approval. They drive category " +
      "assignment but are not contract thresholds.",
  );
  lines.push("");

  // --- Bands ---
  lines.push("## Provisional advisory bands");
  lines.push("");
  lines.push("| Band | Metric | Basis | Edge(s) | Distribution (min / median / max) | Note |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  lines.push(
    `| Target fill | ${bands.fill.metric} | ${bands.fill.basis} | ` +
      `${bands.fill.target_low} .. ${bands.fill.target_high} | ` +
      `${bands.fill.min} / ${bands.fill.median} / ${bands.fill.max} | ${bands.fill.note} |`,
  );
  lines.push(
    `| Large empty rect | ${bands.ler.metric} | ${bands.ler.basis} | ` +
      `elevated ${bands.ler.elevated_edge}, severe ${bands.ler.severe_edge} | ` +
      `${bands.ler.min} / ${bands.ler.median} / ${bands.ler.max} | ${bands.ler.note} |`,
  );
  lines.push(
    `| Shrink severity | ${bands.shrink.metric} | ${bands.shrink.basis} | ` +
      `stressed <= ${bands.shrink.stressed_edge} | ` +
      `${bands.shrink.min} / ${bands.shrink.median} / ${bands.shrink.max} | ${bands.shrink.note} |`,
  );
  lines.push(
    `| Label (auxiliary) | ${bands.label.metric} | ${bands.label.basis} | ` +
      `stressed >= ${bands.label.stressed_edge} | - / - / ${bands.label.max} | ${bands.label.note} |`,
  );
  lines.push("");

  // --- Roll-up ---
  lines.push("## Category and finding roll-up");
  lines.push("");
  lines.push("| Category | Scenes |");
  lines.push("| --- | --- |");
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${cat} | ${count} |`);
  }
  lines.push("");
  lines.push("| Finding class | Scenes (primary) |");
  lines.push("| --- | --- |");
  for (const [fc, count] of Object.entries(findingCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${fc} | ${count} |`);
  }
  lines.push("");

  // --- Scorecard ---
  lines.push("## Worst-first scorecard");
  lines.push("");
  lines.push("| Rank | Scene | Severity | Finding | Categories | One-line diagnosis |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  diagnoses.forEach((d, i) => {
    const cats = d.categories.join(", ");
    const bl = d.borderline.length > 0 ? " [borderline]" : "";
    lines.push(
      `| ${i + 1} | ${d.scene} | ${d.severity} | ${d.finding} | ${cats}${bl} | ${d.verdict} |`,
    );
  });
  lines.push("");

  // --- Per-scene detail ---
  lines.push("## Per-scene diagnoses (worst first)");
  lines.push("");
  diagnoses.forEach((d, i) => {
    lines.push(`### ${i + 1}. ${d.scene}`);
    lines.push("");
    lines.push(`- categories: ${d.categories.join(", ")}`);
    if (d.borderline.length > 0) lines.push(`- borderline: ${d.borderline.join(", ")}`);
    lines.push(`- finding: ${d.finding}`);
    lines.push(`- verdict: ${d.verdict}`);
    lines.push(`- severity: ${d.severity}`);
    lines.push("- evidence:");
    for (const e of d.evidence) lines.push(`  - ${e}`);
    lines.push(`- suggested authoring target: ${d.suggestion}`);
    lines.push("");
  });

  return lines.join("\n");
}

//============================================
// stdout rendering (compact, covers every scene)
//============================================

function renderStdout(report) {
  const { bands, diagnoses } = report;
  const lines = [];
  lines.push(`layout health report: ${bands.sample_size} scenes analyzed`);
  lines.push("shrink severity is PROXY-derived (no true rescale-iteration count exists)");
  lines.push("");
  lines.push("Provisional advisory bands (distribution-derived, pending human approval):");
  lines.push(
    `  target fill   ${bands.fill.target_low}..${bands.fill.target_high}  ` +
      `[${bands.fill.basis}; dist min/med/max ${bands.fill.min}/${bands.fill.median}/${bands.fill.max}]`,
  );
  lines.push(
    `  large empty   elevated ${bands.ler.elevated_edge}, severe ${bands.ler.severe_edge}  ` +
      `[${bands.ler.basis}; dist ${bands.ler.min}/${bands.ler.median}/${bands.ler.max}]`,
  );
  lines.push(
    `  shrink (proxy) stressed <= ${bands.shrink.stressed_edge}  ` +
      `[${bands.shrink.basis}; dist ${bands.shrink.min}/${bands.shrink.median}/${bands.shrink.max}]`,
  );
  lines.push(`  label (aux)   stressed >= ${bands.label.stressed_edge}  [${bands.label.basis}]`);
  lines.push("");
  lines.push("Worst-first scorecard (rank. scene  severity  finding  [categories]):");
  diagnoses.forEach((d, i) => {
    lines.push(
      `${String(i + 1).padStart(2)}. ${d.scene}  sev=${d.severity}  ${d.finding}  ` +
        `[${d.categories.join(", ")}]`,
    );
    lines.push(`    verdict: ${d.verdict}`);
    if (d.borderline.length > 0) lines.push(`    borderline: ${d.borderline.join(", ")}`);
    lines.push(`    target:  ${d.suggestion}`);
  });
  return lines.join("\n") + "\n";
}

//============================================
// File I/O
//============================================

function writeOutputs(root, report) {
  const dir = path.join(root, "test-results", "layout_health");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "health_report.md"), renderMarkdown(report), "utf8");
  fs.writeFileSync(path.join(dir, "health_report.json"), JSON.stringify(report, null, 2), "utf8");
  return dir;
}

//============================================
// CLI
//============================================

function parseArgs() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    process.stderr.write(
      "Usage:\n" +
        "  node --import tsx tools/layout_health_report.mjs --all\n" +
        "  node --import tsx tools/layout_health_report.mjs --scene <name>\n",
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
  const allMetrics = loadAllMetrics(root);

  // Bands must be derived from the full distribution even for a single-scene
  // view, so always load every scene, then filter the displayed diagnoses.
  const report = buildReport(allMetrics);

  if (opts.mode === "single") {
    const known = allMetrics.some((m) => m.scene_name === opts.sceneName);
    if (!known) {
      process.stderr.write(`Error: unknown scene "${opts.sceneName}"\n`);
      const names = allMetrics
        .map((m) => m.scene_name)
        .sort()
        .join(", ");
      process.stderr.write(`Known scenes: ${names}\n`);
      process.exit(1);
    }
    const one = report.diagnoses.filter((d) => d.scene === opts.sceneName);
    const singleReport = { ...report, diagnoses: one };
    process.stdout.write(renderStdout(singleReport));
    return;
  }

  const outDir = writeOutputs(root, report);
  process.stdout.write(renderStdout(report));
  process.stdout.write(`\nwrote: ${path.join(outDir, "health_report.md")}\n`);
  process.stdout.write(`wrote: ${path.join(outDir, "health_report.json")}\n`);
}

main();
