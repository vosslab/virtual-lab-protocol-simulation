// tools/scene_scale_report.mjs
//
// Developer tool: reports vertical scale health for one or all scenes.
//
// For each scene, the layout pipeline measures the total vertical content
// (reflowTotalContent) and the available scene range (reflowSceneRangeTop /
// reflowSceneRangeBottom). When content exceeds the range, a terminal uniform
// object rescale compresses everything to fit. This tool reports the
// PIPELINE'S ACTUAL applied scale (reflowUniformScale), not a recomputed
// estimate, so the dense-scene values match the engine's corrected formula:
//   applied = (sceneRange - fixedOverhead) / (totalContent - fixedOverhead)
// clamped to [UNIFORM_RESCALE_MIN_SCALE, 1].
//
// Run (requires generated/ to exist -- run bash pipeline/build_generated.sh first):
//   node --import tsx tools/scene_scale_report.mjs --scene <name>
//   node --import tsx tools/scene_scale_report.mjs --all
//
// Exit codes:
//   0: success (report produced, even if scenes are overloaded)
//   1: error (unknown scene name, missing generated/, bad args)
//
// Note: this tool is read-only. It never writes to generated/ or dist/.

import { execFileSync } from "node:child_process";

import { runPipeline } from "../src/scene_runtime/layout/index.ts";
import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";

//============================================
// Constants
//============================================

// Canonical 16:9 viewport -- matches precompute_layout.mjs.
const VIEWPORT = { w: 1920, h: 1080 };

// Health label thresholds (advisory only; not a gate).
// appliedScale >= 0.85: healthy (content fits with room to spare)
// 0.70 <= appliedScale < 0.85: dense (tight but survivable)
// appliedScale < 0.70: overloaded (uniform rescale will compress objects significantly)
const HEALTHY_THRESHOLD = 0.85;
const DENSE_THRESHOLD = 0.7;

//============================================
// Run the layout pipeline for one scene
//============================================

// Returns the PipelineResult for a single scene at the canonical viewport.
// Read-only: does not write any files.
function runScenePipeline(scene) {
  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
    viewport: VIEWPORT,
  });
  return result;
}

//============================================
// Scale health label
//============================================

// Returns a health label string based on the applied uniform scale.
// >= HEALTHY_THRESHOLD -> healthy
// >= DENSE_THRESHOLD   -> dense
// < DENSE_THRESHOLD    -> overloaded
function healthLabel(appliedScale) {
  if (appliedScale >= HEALTHY_THRESHOLD) return "healthy";
  if (appliedScale >= DENSE_THRESHOLD) return "dense";
  return "overloaded";
}

//============================================
// Extract per-scene scale metrics from pipeline result
//============================================

// Computes the key metrics for a scene from its PipelineResult:
//   totalContent: measured sum of per-group content extents
//   sceneRange: bottom - top of the reflow range
//   overflowRatio: totalContent / sceneRange
//   appliedScale: the pipeline's actual uniform rescale factor (reflowUniformScale);
//                 1.0 when no overflow (corrected formula, not the old estimate)
//   overflow: true when content exceeded range before rescale
// Returns an object with these fields.
function computeScaleMetrics(result) {
  const total = result.reflowTotalContent;
  const rangeTop = result.reflowSceneRangeTop;
  const rangeBottom = result.reflowSceneRangeBottom;
  const sceneRange = rangeBottom - rangeTop;

  // Guard: a degenerate scene with zero range or zero content is trivially healthy.
  if (sceneRange <= 0 || total <= 0) {
    return {
      totalContent: total,
      sceneRange: sceneRange,
      overflowRatio: 0,
      appliedScale: 1,
      overflow: false,
      labelDominant: false,
    };
  }

  const overflowRatio = total / sceneRange;
  // Use the pipeline's actual applied scale rather than recomputing the old
  // sceneRange/totalContent estimate. reflowUniformScale is 1.0 when no overflow
  // ran and the corrected clamped factor when the rescale fired.
  const appliedScale = result.reflowUniformScale ?? 1;

  return {
    totalContent: total,
    sceneRange: sceneRange,
    overflowRatio: overflowRatio,
    appliedScale: appliedScale,
    overflow: result.reflowOverflow,
    labelDominant: result.labelDominant ?? false,
  };
}

//============================================
// Find the heaviest vertical band group
//============================================

// A band group is the set of zones that share one vertical band (side-by-side
// zones at the same authored vertical extent are merged into one group by the
// reflow logic). The heaviest group is the one with the largest contentExtent,
// since that group drives the overflow.
//
// We reconstruct band groups from the zoneBands on the PipelineResult, grouping
// by identical [top, bottom] pairs (zones in the same group get the same
// computed top/bottom from reflow_zones). For each group we collect:
//   - zone ids
//   - the group's contentExtent (same as the heaviest member's computed height)
//   - total tier count across all member zones
//   - the 2-3 tallest contributing items (placement_name + _combinedHeight)
//
// Returns null if the scene has no zone bands (empty scene).
function findHeaviestBandGroup(result) {
  const zoneBands = result.zoneBands;
  if (!zoneBands || zoneBands.size === 0) return null;

  // Index computed items by placement_name so we can look up _combinedHeight.
  const itemByName = new Map();
  for (const item of result.final) {
    itemByName.set(item.placement_name, item);
  }
  // _combinedHeight is set in measure-vertical and threaded through all subsequent
  // phases, so result.final items carry it.

  // Group zones by their computed [top, bottom] band (same computed extent = same group).
  // Use a string key "top|bottom" for grouping.
  const groupMap = new Map();
  for (const [zoneId, band] of zoneBands) {
    const key = `${band.top.toFixed(4)}|${band.bottom.toFixed(4)}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.zoneIds.push(zoneId);
      existing.tiers.push(...band.tiers);
    } else {
      groupMap.set(key, {
        zoneIds: [zoneId],
        tiers: [...band.tiers],
        // Computed band height = contentExtent of this group's representative member.
        // All members in a group share the same [top, bottom], so any member's
        // (bottom - top) is the group's computed height.
        computedHeight: band.bottom - band.top,
        bandTop: band.top,
        bandBottom: band.bottom,
      });
    }
  }

  // Find the group with the largest computed height (= heaviest contentExtent).
  let heaviest = null;
  for (const group of groupMap.values()) {
    if (!heaviest || group.computedHeight > heaviest.computedHeight) {
      heaviest = group;
    }
  }
  if (!heaviest) return null;

  // Collect all placement names across the group's tiers and find their _combinedHeight.
  const placementsInGroup = [];
  for (const tier of heaviest.tiers) {
    for (const pname of tier.placementNames) {
      const item = itemByName.get(pname);
      const combined = item ? (item._combinedHeight ?? 0) : 0;
      placementsInGroup.push({ name: pname, combinedHeight: combined });
    }
  }

  // Sort by combinedHeight descending to surface the top contributors.
  placementsInGroup.sort((a, b) => b.combinedHeight - a.combinedHeight);
  const topItems = placementsInGroup.slice(0, 3);

  return {
    zoneIds: heaviest.zoneIds,
    computedHeight: heaviest.computedHeight,
    tierCount: heaviest.tiers.length,
    topItems,
  };
}

//============================================
// Single-scene detailed report
//============================================

// Print a detailed breakdown for one scene: scale metrics plus a per-zone-group
// breakdown so a writer sees which zone is overfull.
function reportSingleScene(sceneName) {
  const scene = SCENES[sceneName];
  if (!scene) {
    process.stderr.write(`Error: unknown scene "${sceneName}"\n`);
    process.stderr.write(`Known scenes: ${Object.keys(SCENES).sort().join(", ")}\n`);
    process.exit(1);
  }

  const result = runScenePipeline(scene);
  const metrics = computeScaleMetrics(result);
  const heavy = findHeaviestBandGroup(result);

  const label = healthLabel(metrics.appliedScale);
  const labelStr = label.toUpperCase().padEnd(10);

  process.stdout.write(`Scene: ${sceneName}\n`);
  process.stdout.write(`  totalContent   : ${metrics.totalContent.toFixed(2)}\n`);
  process.stdout.write(`  sceneRange     : ${metrics.sceneRange.toFixed(2)}\n`);
  process.stdout.write(`  overflow ratio : ${metrics.overflowRatio.toFixed(2)}`);
  if (metrics.overflow) {
    process.stdout.write(`  [OVERFLOW]\n`);
  } else {
    process.stdout.write(`\n`);
  }
  process.stdout.write(`  applied scale  : ${metrics.appliedScale.toFixed(3)}\n`);
  process.stdout.write(`  label dominant : ${metrics.labelDominant ? "yes" : "no"}\n`);
  process.stdout.write(`  health         : ${labelStr}\n`);

  if (!heavy) {
    process.stdout.write(`  (no zone bands computed)\n`);
    return;
  }

  process.stdout.write(`\n`);
  process.stdout.write(`Heaviest band group:\n`);
  process.stdout.write(`  zones          : ${heavy.zoneIds.join(", ")}\n`);
  process.stdout.write(`  computed height: ${heavy.computedHeight.toFixed(2)}\n`);
  process.stdout.write(`  tier count     : ${heavy.tierCount}\n`);
  if (heavy.topItems.length > 0) {
    process.stdout.write(`  top contributors (placement + combinedHeight):\n`);
    for (const item of heavy.topItems) {
      process.stdout.write(`    ${item.name.padEnd(45)} ${item.combinedHeight.toFixed(2)}\n`);
    }
  }

  // Per-zone band breakdown: show each zone's tier rows and their items.
  process.stdout.write(`\nZone band detail:\n`);
  const zoneBands = result.zoneBands;
  if (zoneBands && zoneBands.size > 0) {
    // Sort zones by band top for readable top-to-bottom output.
    const sortedBands = [...zoneBands.entries()].sort((a, b) => a[1].top - b[1].top);
    for (const [zoneId, band] of sortedBands) {
      const bandH = band.bottom - band.top;
      process.stdout.write(
        `  [${zoneId}]  top=${band.top.toFixed(2)}  bottom=${band.bottom.toFixed(2)}  height=${bandH.toFixed(2)}\n`,
      );
      for (const tier of band.tiers) {
        const namesStr = tier.placementNames.join(", ");
        process.stdout.write(
          `    tier ${tier.depthTier}  rowHeight=${tier.rowHeight.toFixed(2)}  items: ${namesStr}\n`,
        );
      }
    }
  }
}

//============================================
// All-scenes table report
//============================================

// Row data for the --all table.
function buildAllRows() {
  const rows = [];
  for (const [sceneName, scene] of Object.entries(SCENES)) {
    const result = runScenePipeline(scene);
    const metrics = computeScaleMetrics(result);
    const heavy = findHeaviestBandGroup(result);
    rows.push({ sceneName, metrics, heavy });
  }
  // Sort densest first (smallest appliedScale first, then by name).
  rows.sort((a, b) => {
    const diff = a.metrics.appliedScale - b.metrics.appliedScale;
    if (Math.abs(diff) > 1e-9) return diff;
    return a.sceneName < b.sceneName ? -1 : 1;
  });
  return rows;
}

// Print the --all summary table and a short count summary.
function reportAllScenes() {
  const rows = buildAllRows();

  // Column widths (fixed): scene name 55, ratio 6, scale 7, ldom 4, health 10.
  const COL_SCENE = 55;
  const COL_RATIO = 6;
  const COL_SCALE = 7;
  const COL_LDOM = 4; // label dominant: "yes" or "no"
  const COL_HEALTH = 10;
  const COL_HEAVY = 30; // heaviest zone group zone ids (truncated)

  // Header
  const header =
    "SCENE".padEnd(COL_SCENE) +
    "  " +
    "RATIO".padStart(COL_RATIO) +
    "  " +
    "SCALE".padStart(COL_SCALE) +
    "  " +
    "LDOM".padEnd(COL_LDOM) +
    "  " +
    "HEALTH".padEnd(COL_HEALTH) +
    "  " +
    "HEAVIEST BAND";
  const separator = "-".repeat(header.length);
  process.stdout.write(header + "\n");
  process.stdout.write(separator + "\n");

  let overloaded = 0;
  let dense = 0;
  let healthy = 0;

  for (const row of rows) {
    const { sceneName, metrics, heavy } = row;
    const label = healthLabel(metrics.appliedScale);
    if (label === "overloaded") overloaded++;
    else if (label === "dense") dense++;
    else healthy++;

    // Heaviest band: show zone ids, truncated to fit column.
    let heavyStr = "";
    if (heavy) {
      heavyStr = heavy.zoneIds.join(",");
      if (heavyStr.length > COL_HEAVY) {
        heavyStr = heavyStr.slice(0, COL_HEAVY - 3) + "...";
      }
    }

    // Overflow marker on ratio column.
    const ratioStr = metrics.overflowRatio.toFixed(2) + (metrics.overflow ? "*" : " ");
    const scaleStr = metrics.appliedScale.toFixed(3);
    // Label-dominant flag: "yes" when the scene's label strip is visually dominant.
    const ldomStr = metrics.labelDominant ? "yes" : "no";
    const labelStr = label.toUpperCase();

    process.stdout.write(
      sceneName.padEnd(COL_SCENE) +
        "  " +
        ratioStr.padStart(COL_RATIO + 1) +
        "  " +
        scaleStr.padStart(COL_SCALE) +
        "  " +
        ldomStr.padEnd(COL_LDOM) +
        "  " +
        labelStr.padEnd(COL_HEALTH) +
        "  " +
        heavyStr +
        "\n",
    );
  }

  process.stdout.write(separator + "\n");
  process.stdout.write(
    `  * = overflow (terminal uniform rescale applied)\n` +
      `  overloaded: ${overloaded}  dense: ${dense}  healthy: ${healthy}  total: ${rows.length}\n`,
  );
}

//============================================
// CLI arg parsing
//============================================

// Parses --scene <name> or --all from process.argv. Returns { mode, sceneName }.
function parseArgs() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    process.stderr.write(
      "Usage:\n" +
        "  node --import tsx tools/scene_scale_report.mjs --scene <name>\n" +
        "  node --import tsx tools/scene_scale_report.mjs --all\n",
    );
    process.exit(1);
  }

  const allIdx = argv.indexOf("--all");
  const sceneIdx = argv.indexOf("--scene");

  if (allIdx !== -1 && sceneIdx !== -1) {
    process.stderr.write("Error: --all and --scene are mutually exclusive\n");
    process.exit(1);
  }

  if (allIdx !== -1) {
    return { mode: "all", sceneName: null };
  }

  if (sceneIdx !== -1) {
    const name = argv[sceneIdx + 1];
    if (!name || name.startsWith("-")) {
      process.stderr.write("Error: --scene requires a scene name argument\n");
      process.exit(1);
    }
    return { mode: "single", sceneName: name };
  }

  process.stderr.write(
    `Error: unrecognized arguments: ${argv.join(" ")}\n` +
      "Usage:\n" +
      "  node --import tsx tools/scene_scale_report.mjs --scene <name>\n" +
      "  node --import tsx tools/scene_scale_report.mjs --all\n",
  );
  process.exit(1);
}

//============================================
// Main
//============================================

function main() {
  // Verify repo root from git so relative paths do not depend on cwd.
  execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });

  const opts = parseArgs();

  if (opts.mode === "all") {
    reportAllScenes();
  } else {
    // mode === "single", sceneName is non-null (parseArgs exits otherwise).
    reportSingleScene(opts.sceneName);
  }
}

main();
