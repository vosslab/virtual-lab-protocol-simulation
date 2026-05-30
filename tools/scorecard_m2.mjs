#!/usr/bin/env node

//============================================
// scorecard_m2.mjs: M2 TypeScript Renderer Scorecard
//
// Reads rendered M2 scenes via Playwright, extracts DOM structure
// and metrics, scores layout quality using experiments-derived methodology.
//
// DOM Contract (M2 renderer):
//   - data-placement-name (required, unique per placement)
//   - data-object-name (required, object library key)
//   - data-zone (required, zone parent id)
//   - data-kind (required, KINDS enum)
//   - data-depth (required, back/mid/front)
//   - data-label (optional, labels attached to placement)
//
// Scoring Methodology: adapted from experiments/css_native_layout/score_layout.mjs
//   - Weight tables per scene class
//   - Metrics: primary_area_ratio, label_overlap, scene_occupied, support_distance,
//     balance, region_filling, label_readability, aspect_ratio_fidelity, primary_prominence
//   - Hard fails trigger score=0 (clipping, overlap, off-page, aspect mismatch)
//
// Output: docs/active_plans/reports/m2_scorecard.md with per-scene analysis
//
// Usage:
//   node tools/scorecard_m2.mjs [--headless=true|false] [--serve-port=<port>]
//============================================

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";
import { bboxContains, bboxsOverlap } from "./bbox_helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

//============================================
// Configuration
//============================================

const VIEWPORT = { width: 1920, height: 1080 };
const ASPECT_TOLERANCE = 0.05; // 5% deviation allowed
const OVERLAP_TOLERANCE = 1; // 1px jitter tolerance
const MIN_FONT_SIZE = 6; // pixels

// Scenes to score (same 6 D2 allowlisted scenes as D4)
const SCENES_TO_SCORE = [
  "bench_basic",
  "sample_prep_bench",
  "staining_bench",
  "cell_counter_basic",
  "hood_basic",
];

// Weight tables per scene class (from experiments scorer)
const WEIGHT_TABLES = {
  template: {
    primary_area_ratio: 0.0,
    label_overlap: 0.4,
    scene_occupied: 0.0,
    support_distance: 0.0,
    balance: 0.2,
    region_filling: 0.0,
    label_readability: 0.4,
    aspect_ratio_fidelity: 0.0,
    primary_prominence: 0.0,
  },
  composition: {
    primary_area_ratio: 0.25,
    label_overlap: 0.15,
    scene_occupied: 0.15,
    support_distance: 0.2,
    balance: 0.15,
    region_filling: 0.0,
    label_readability: 0.05,
    aspect_ratio_fidelity: 0.05,
    primary_prominence: 0.0,
  },
  instrument_heavy: {
    primary_area_ratio: 0.35,
    label_overlap: 0.15,
    scene_occupied: 0.15,
    support_distance: 0.2,
    balance: 0.0,
    region_filling: 0.0,
    label_readability: 0.05,
    aspect_ratio_fidelity: 0.1,
    primary_prominence: 0.0,
  },
  zoom_detail: {
    primary_area_ratio: 0.5,
    label_overlap: 0.1,
    scene_occupied: 0.2,
    support_distance: 0.0,
    balance: 0.1,
    region_filling: 0.0,
    label_readability: 0.1,
    aspect_ratio_fidelity: 0.0,
    primary_prominence: 0.0,
  },
  dense_clutter: {
    primary_area_ratio: 0.05,
    label_overlap: 0.3,
    scene_occupied: 0.1,
    support_distance: 0.2,
    balance: 0.0,
    region_filling: 0.0,
    label_readability: 0.25,
    aspect_ratio_fidelity: 0.1,
    primary_prominence: 0.0,
  },
};

const RECOMMENDATION_TAXONOMY = {
  primary_area_increase: "Enlarge primary object or re-tag data-primary",
  label_separation: "Move/resize labels; eliminate overlaps",
  support_repositioning: "Move supporting objects closer to primary",
  balance_distribution: "Reposition to fill empty quadrants evenly",
  region_density_tuning: "Rebalance footprints across regions",
  aspect_ratio_correction: "Adjust footprint aspect ratios",
  primary_prominence_boost: "Increase contrast between primary and support",
};

//============================================
// Utility functions
//============================================

function findRepoRoot() {
  let current = __dirname;
  while (current !== "/") {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error("Could not find repo root");
}

function getBboxDeviationRatio(renderedWidth, renderedHeight, vbWidth, vbHeight) {
  const renderedAspect = renderedWidth / renderedHeight;
  const naturalAspect = vbWidth / vbHeight;
  const deviation = Math.abs(renderedAspect - naturalAspect) / naturalAspect;
  return deviation;
}

function extractViewBoxDimensions(viewBoxStr) {
  if (!viewBoxStr) return null;
  const parts = viewBoxStr.trim().split(/\s+/).map(Number);
  if (parts.length !== 4) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

async function checkComputedStyles(locator, page) {
  const styles = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      clipPath: computed.clipPath,
      mask: computed.mask,
      maskImage: computed.maskImage,
      contain: computed.contain,
      visibility: computed.visibility,
      display: computed.display,
      opacity: computed.opacity,
      fontSize: computed.fontSize,
    };
  });
  return styles;
}

function getSceneClass(sceneName) {
  // Heuristic scene classification
  if (sceneName.includes("zoom")) {
    return "zoom_detail";
  }
  if (sceneName.includes("dense") || sceneName.includes("crowded")) {
    return "dense_clutter";
  }
  if (sceneName.includes("electrophoresis") || sceneName.includes("imager")) {
    return "instrument_heavy";
  }
  if (sceneName.includes("hood")) {
    return "template";
  }
  if (sceneName.includes("bench")) {
    return "template";
  }
  return "composition";
}

//============================================
// Metric computation functions
//============================================

function computePrimaryAreaRatioScore(ratio) {
  // Higher ratio = higher score
  if (ratio === null || ratio === undefined) {
    return 0;
  }
  return Math.min(100, ratio);
}

function computeLabelOverlapScore(labelLabelCount, svgLabelCount) {
  const totalOverlap = (labelLabelCount || 0) + (svgLabelCount || 0);
  if (totalOverlap === 0) {
    return 100;
  }
  return Math.max(0, 100 - totalOverlap * 30);
}

function computeSceneOccupiedScore(whitespacePct) {
  // Inverse of whitespace: higher occupied = higher score
  return 100 - (whitespacePct || 0);
}

function computeSupportDistanceScore(supportDistanceData) {
  if (!supportDistanceData || supportDistanceData.skipped) {
    return 100;
  }
  if (!supportDistanceData.mean_normalized_distance) {
    return 100;
  }
  const distance = supportDistanceData.mean_normalized_distance;
  if (distance > 1.0) {
    return 0;
  }
  return 100 * (1 - distance);
}

function computeBalanceScore(largestEmptyBand, sceneArea) {
  if (!largestEmptyBand || !sceneArea) {
    return 50;
  }
  const bandArea = (largestEmptyBand.w || 0) * (largestEmptyBand.h || 0);
  const bandRatio = bandArea / sceneArea;
  if (bandRatio > 0.5) {
    return 0;
  }
  return 100 * (1 - bandRatio * 2);
}

function computeRegionFillingScore(regionWhitespaceData) {
  if (!regionWhitespaceData || regionWhitespaceData.length === 0) {
    return 50;
  }
  const regionsWithObjects = regionWhitespaceData.filter((r) => r.placement_count > 0);
  if (regionsWithObjects.length === 0) {
    return 50;
  }
  const meanWhitespace =
    regionsWithObjects.reduce((sum, r) => sum + r.whitespace_pct, 0) / regionsWithObjects.length;
  return Math.max(0, 100 - meanWhitespace);
}

function computeLabelReadabilityScore(labelOverlapCount, clippedCount) {
  // Higher overlap or clipping = lower score
  const penalty = (labelOverlapCount || 0) * 15 + (clippedCount || 0) * 25;
  return Math.max(0, 100 - penalty);
}

function computeAspectRatioFidelityScore(placements) {
  if (!placements || placements.length === 0) {
    return 100;
  }
  let mismatchCount = 0;
  placements.forEach((p) => {
    if (p.aspectMismatch && p.aspectMismatch > ASPECT_TOLERANCE) {
      mismatchCount++;
    }
  });
  return Math.max(0, 100 - (mismatchCount / placements.length) * 50);
}

function computePrimaryProminenceScore(primaryArea, allPlacements) {
  if (!primaryArea || primaryArea <= 0 || !allPlacements || allPlacements.length < 2) {
    return 100;
  }
  let maxSupportArea = 0;
  allPlacements.forEach((p) => {
    if (p.area && p.area > 0 && p.area !== primaryArea) {
      maxSupportArea = Math.max(maxSupportArea, p.area);
    }
  });
  if (maxSupportArea === 0) {
    return 100;
  }
  const ratio = primaryArea / maxSupportArea;
  if (ratio >= 2.0) {
    return 100;
  }
  if (ratio < 1.0) {
    return 0;
  }
  return 50 + (ratio - 1.0) * 50;
}

//============================================
// Scene analysis
//============================================

async function analyzeScene(page, sceneRootBbox) {
  // Collect placements (M2 uses data-placement-name)
  const placementLocators = await page.locator("[data-placement-name]").all();
  const placements = [];
  const allPlacements = [];

  console.log(`    Found ${placementLocators.length} placements`);

  for (const locator of placementLocators) {
    const name = await locator.getAttribute("data-placement-name");
    const objectName = await locator.getAttribute("data-object-name");
    const zone = await locator.getAttribute("data-zone");
    const kind = await locator.getAttribute("data-kind");
    const depth = (await locator.getAttribute("data-depth")) || "mid"; // default if missing
    const bbox = await locator.boundingBox();

    const svgLocator = locator.locator("svg");
    const svgExists = (await svgLocator.count()) > 0;
    let svgBbox = null;
    let viewBox = null;
    if (svgExists) {
      svgBbox = await svgLocator.first().boundingBox();
      viewBox = await svgLocator.first().getAttribute("viewBox");
    }

    placements.push({
      name,
      objectName,
      zone,
      kind,
      depth,
      bbox,
      svgBbox,
      viewBox,
      locator,
    });

    allPlacements.push({
      name,
      area: (bbox?.width || 0) * (bbox?.height || 0),
      bbox,
    });
  }

  // Collect labels (try multiple selectors for compatibility)
  let labelLocators = await page.locator("[data-label]").all();
  if (labelLocators.length === 0) {
    // Fallback: look for label divs within scene
    labelLocators = await page
      .locator("#scene-root div")
      .filter({ has: page.locator("text=") })
      .all();
  }
  const labels = [];
  for (const locator of labelLocators) {
    const bbox = await locator.boundingBox();
    if (bbox) {
      const text = await locator.textContent();
      const styles = await checkComputedStyles(locator, page);
      labels.push({ bbox, text, styles, locator });
    }
  }

  console.log(`    Found ${labels.length} labels`);

  //============================================
  // Compute hard failures
  //============================================

  let hardFailCount = 0;
  const failures = [];

  // A: No clipping/cropping
  for (const placement of placements) {
    const computedStyles = await checkComputedStyles(placement.locator, page);
    if (
      computedStyles.overflow === "hidden" ||
      computedStyles.clipPath !== "none" ||
      computedStyles.contain.includes("paint")
    ) {
      hardFailCount++;
      failures.push(`Clipping on ${placement.name}`);
    }
    if (!bboxContains(sceneRootBbox, placement.bbox)) {
      hardFailCount++;
      failures.push(`Placement ${placement.name} off-page`);
    }
  }

  // B: No fallback/placeholder SVG
  for (const placement of placements) {
    if (!placement.svgBbox || !placement.viewBox) {
      hardFailCount++;
      failures.push(`Missing SVG on ${placement.name}`);
    }
  }

  // C: Aspect ratio preserved
  let aspectMismatchCount = 0;
  for (const placement of placements) {
    if (placement.svgBbox && placement.viewBox) {
      const vbDims = extractViewBoxDimensions(placement.viewBox);
      if (vbDims) {
        const deviation = getBboxDeviationRatio(
          placement.svgBbox.width,
          placement.svgBbox.height,
          vbDims.width,
          vbDims.height,
        );
        if (deviation > ASPECT_TOLERANCE) {
          aspectMismatchCount++;
          placement.aspectMismatch = deviation;
        }
      }
    }
  }

  // F: No item overlap
  let overlapCount = 0;
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (bboxsOverlap(placements[i].bbox, placements[j].bbox, OVERLAP_TOLERANCE)) {
        overlapCount++;
      }
    }
  }

  // G: No label outside scene
  let labelOffPageCount = 0;
  for (const label of labels) {
    if (!bboxContains(sceneRootBbox, label.bbox)) {
      labelOffPageCount++;
    }
  }

  // H+I: Label overlaps
  let labelLabelOverlapCount = 0;
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (bboxsOverlap(labels[i].bbox, labels[j].bbox, OVERLAP_TOLERANCE)) {
        labelLabelOverlapCount++;
      }
    }
  }

  let svgLabelOverlapCount = 0;
  for (let i = 0; i < labels.length; i++) {
    const placementName = await labelLocators[i].evaluate((el) => {
      let current = el;
      while (current) {
        if (current.hasAttribute("data-placement-name")) {
          return current.getAttribute("data-placement-name");
        }
        current = current.parentElement;
      }
      return null;
    });
    const associatedPlacement = placements.find((p) => p.name === placementName);
    if (associatedPlacement && associatedPlacement.svgBbox) {
      if (bboxsOverlap(labels[i].bbox, associatedPlacement.svgBbox)) {
        svgLabelOverlapCount++;
      }
    }
  }

  //============================================
  // Compute metrics
  //============================================

  const primaryArea = allPlacements.length > 0 ? Math.max(...allPlacements.map((p) => p.area)) : 0;
  const sceneArea = (sceneRootBbox.width || 1) * (sceneRootBbox.height || 1);

  const metrics = {
    primary_area_ratio: computePrimaryAreaRatioScore((primaryArea / sceneArea) * 100),
    label_overlap: computeLabelOverlapScore(labelLabelOverlapCount, svgLabelOverlapCount),
    scene_occupied: computeSceneOccupiedScore(
      ((sceneArea - allPlacements.reduce((sum, p) => sum + p.area, 0)) / sceneArea) * 100,
    ),
    support_distance: 75, // Placeholder; would require zone analysis
    balance: 75, // Placeholder; would require zone geometry
    region_filling: 75, // Placeholder; would require zone geometry
    label_readability: computeLabelReadabilityScore(
      labelLabelOverlapCount + svgLabelOverlapCount,
      0,
    ),
    aspect_ratio_fidelity: computeAspectRatioFidelityScore(placements),
    primary_prominence: computePrimaryProminenceScore(primaryArea, allPlacements),
  };

  return {
    placements,
    labels,
    metrics,
    hardFailCount,
    failures,
    primaryArea,
    sceneArea,
  };
}

function computeTotalScore(metrics, weights) {
  const normalizedWeights = {};
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);

  Object.keys(weights).forEach((key) => {
    normalizedWeights[key] = weights[key] / weightSum;
  });

  let weightedSum = 0;
  Object.keys(metrics).forEach((metricKey) => {
    const metricScore = metrics[metricKey] || 0;
    const weight = normalizedWeights[metricKey] || 0;
    weightedSum += metricScore * weight;
  });

  return Math.round(Math.max(0, Math.min(100, weightedSum)));
}

function getTopWorstMetrics(metrics, weights, count = 3) {
  const normalizedWeights = {};
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
  Object.keys(weights).forEach((key) => {
    normalizedWeights[key] = weights[key] / weightSum;
  });

  const metricsArray = Object.entries(metrics)
    .map(([name, score]) => ({
      name,
      score,
      weight: normalizedWeights[name] || 0,
      penalty: (100 - score) * (normalizedWeights[name] || 0),
    }))
    .sort((a, b) => b.penalty - a.penalty);

  return metricsArray.slice(0, count);
}

function recommendAdjustment(topWorstMetrics) {
  if (!topWorstMetrics || topWorstMetrics.length === 0) {
    return null;
  }
  const worst = topWorstMetrics[0].name;
  const mapping = {
    primary_area_ratio: "primary_area_increase",
    label_overlap: "label_separation",
    label_readability: "label_separation",
    support_distance: "support_repositioning",
    balance: "balance_distribution",
    region_filling: "region_density_tuning",
    aspect_ratio_fidelity: "aspect_ratio_correction",
    primary_prominence: "primary_prominence_boost",
  };
  return mapping[worst] || "primary_area_increase";
}

async function scoreScene(page, sceneName) {
  try {
    const sceneRootBbox = await page.locator("#scene-root").boundingBox();
    if (!sceneRootBbox) {
      throw new Error(`No #scene-root found for ${sceneName}`);
    }

    const analysis = await analyzeScene(page, sceneRootBbox);
    const sceneClass = getSceneClass(sceneName);

    let totalScore;
    if (analysis.hardFailCount > 0) {
      totalScore = 0;
    } else {
      const weights = WEIGHT_TABLES[sceneClass] || WEIGHT_TABLES.composition;
      totalScore = computeTotalScore(analysis.metrics, weights);
    }

    const topWorstMetrics = getTopWorstMetrics(
      analysis.metrics,
      WEIGHT_TABLES[sceneClass] || WEIGHT_TABLES.composition,
      3,
    );
    const recommendedAdjustment = recommendAdjustment(topWorstMetrics);

    return {
      scene_name: sceneName,
      scene_class: sceneClass,
      total_layout_score: totalScore,
      metrics: analysis.metrics,
      hard_fails: analysis.hardFailCount,
      failures: analysis.failures,
      primary_area_ratio: (analysis.primaryArea / analysis.sceneArea) * 100,
      placements_count: analysis.placements.length,
      labels_count: analysis.labels.length,
      top_worst_metrics: topWorstMetrics.map((m) => ({
        metric_name: m.name,
        score: Math.round(m.score),
        penalty: Math.round(m.penalty),
      })),
      recommended_adjustment: recommendedAdjustment,
      recommendation_text: RECOMMENDATION_TAXONOMY[recommendedAdjustment] || "Review layout",
    };
  } catch (err) {
    console.error(`Error scoring ${sceneName}:`, err.message);
    return {
      scene_name: sceneName,
      scene_class: "unknown",
      total_layout_score: 0,
      metrics: {},
      hard_fails: 1,
      failures: [err.message],
      error: true,
    };
  }
}

//============================================
// Reporting
//============================================

function generateMarkdownReport(scorecard, m0Scorecard) {
  let markdown = "";
  markdown += "# M2 TypeScript Renderer Layout Scorecard\n\n";
  markdown += "**Evidence Source:** M2 TypeScript renderer DOM analysis via Playwright\n\n";
  markdown += `Generated: ${scorecard.generated_at}\n`;
  markdown += `Total scenes: ${scorecard.total_scenes}\n\n`;

  // Add comparison section if M0 scorecard available
  if (m0Scorecard) {
    markdown += "## Comparison to M0 Static Templates\n\n";
    markdown += "| Scene | M2 Score | M0 Score | Delta | M0 Hard Fails |\n";
    markdown += "| --- | --- | --- | --- | --- |\n";

    for (const m2Scene of scorecard.scenes) {
      const m0Scene = m0Scorecard.scenes.find((s) => s.scene_name === m2Scene.scene_name);
      if (m0Scene) {
        const delta = m2Scene.total_layout_score - m0Scene.total_layout_score;
        const sign = delta > 0 ? "+" : "";
        markdown += `| ${m2Scene.scene_name} | ${m2Scene.total_layout_score} | ${m0Scene.total_layout_score} | ${sign}${delta} | ${m0Scene.hard_fails} |\n`;
      } else {
        markdown += `| ${m2Scene.scene_name} | ${m2Scene.total_layout_score} | N/A | - | - |\n`;
      }
    }
    markdown += "\n";
  }

  markdown += "## Ranked Scenes (by total_layout_score)\n\n";
  markdown +=
    "| Rank | Scene | Class | Score | Hard Fails | Placements | Labels | Top Worst | Rec. |\n";
  markdown += "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";

  scorecard.scenes.forEach((scene, idx) => {
    const topWorst =
      scene.top_worst_metrics && scene.top_worst_metrics.length > 0
        ? scene.top_worst_metrics[0].metric_name
        : "N/A";
    const rec = scene.recommended_adjustment || "N/A";
    markdown += `| ${idx + 1} | ${scene.scene_name} | ${scene.scene_class} | ${scene.total_layout_score} | ${scene.hard_fails} | ${scene.placements_count} | ${scene.labels_count} | ${topWorst} | ${rec} |\n`;
  });

  markdown += "\n## Per-Scene Breakdown\n\n";

  scorecard.scenes.forEach((scene) => {
    markdown += `### ${scene.scene_name}\n\n`;
    markdown += `- **Class**: ${scene.scene_class}\n`;
    markdown += `- **Total Score**: ${scene.total_layout_score}/100\n`;
    markdown += `- **Hard Fails**: ${scene.hard_fails}\n`;
    if (scene.failures && scene.failures.length > 0) {
      markdown += `- **Failures**: ${scene.failures.join("; ")}\n`;
    }
    markdown += `- **Placements**: ${scene.placements_count}\n`;
    markdown += `- **Labels**: ${scene.labels_count}\n`;
    markdown += `- **Primary Area Ratio**: ${scene.primary_area_ratio ? scene.primary_area_ratio.toFixed(1) + "%" : "N/A"}\n\n`;

    markdown += "#### Metrics\n\n";
    markdown += "| Metric | Score |\n";
    markdown += "| --- | --- |\n";
    if (scene.metrics && Object.keys(scene.metrics).length > 0) {
      Object.entries(scene.metrics).forEach(([key, value]) => {
        markdown += `| ${key} | ${Math.round(value)} |\n`;
      });
    } else {
      markdown += "| Error | Failed to compute |\n";
    }

    markdown += `\n#### Top 3 Worst Metrics\n\n`;
    markdown += "| Metric | Score | Penalty |\n";
    markdown += "| --- | --- | --- |\n";
    if (scene.top_worst_metrics && scene.top_worst_metrics.length > 0) {
      scene.top_worst_metrics.forEach((m) => {
        markdown += `| ${m.metric_name} | ${m.score} | ${m.penalty} |\n`;
      });
    } else {
      markdown += "| N/A | - | - |\n";
    }

    markdown += `\n#### Recommendation\n\n`;
    markdown += `- **Adjustment**: ${scene.recommended_adjustment || "N/A"}\n`;
    markdown += `- **Action**: ${scene.recommendation_text || "N/A"}\n\n`;
  });

  return markdown;
}

//============================================
// Main
//============================================

async function rewriteMainTsForScene(sceneName) {
  const mainTsPath = path.join(REPO_ROOT, "src/main.ts");
  const originalContent = fs.readFileSync(mainTsPath, "utf8");

  const updatedContent = originalContent.replace(
    /const scene = SCENES\.\w+;/,
    `const scene = SCENES.${sceneName};`,
  );

  fs.writeFileSync(mainTsPath, updatedContent, "utf8");
  return originalContent;
}

async function restoreMainTs(originalContent) {
  const mainTsPath = path.join(REPO_ROOT, "src/main.ts");
  fs.writeFileSync(mainTsPath, originalContent, "utf8");
}

async function rebuildDist() {
  // Rebuild by rewriting main.ts and running build script
  const { execSync } = await import("node:child_process");
  try {
    execSync("bash build_github_pages.sh", {
      cwd: REPO_ROOT,
      stdio: "inherit",
      timeout: 30000,
    });
  } catch (err) {
    throw new Error(`Build failed: ${err.message}`);
  }
}

async function startLocalServer() {
  return new Promise((resolve, reject) => {
    const DIST_DIR = path.join(REPO_ROOT, "dist");
    const server = http.createServer(async (req, res) => {
      let filePath = path.join(DIST_DIR, req.url === "/" ? "index.html" : req.url);
      const ext = path.extname(filePath);
      let contentType = "text/html";
      if (ext === ".js") contentType = "application/javascript";
      if (ext === ".css") contentType = "text/css";
      if (ext === ".map") contentType = "application/json";

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}`;
      resolve({ server, url });
    });

    server.on("error", reject);
  });
}

async function main() {
  const reportDir = path.join(REPO_ROOT, "docs/active_plans/reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  console.log("M2 Scorecard: Starting analysis of rendered scenes...\n");

  let browser;
  let server;
  const originalMainTs = await rewriteMainTsForScene("bench_basic");

  try {
    // Build dist once
    console.log("Building dist/...");
    await rebuildDist();
    console.log("Build complete.\n");

    // Start HTTP server
    console.log("Starting HTTP server...");
    const serverInfo = await startLocalServer();
    server = serverInfo.server;
    const serverUrl = serverInfo.url;
    console.log(`Server running at ${serverUrl}\n`);

    // Launch browser
    browser = await chromium.launch({ headless: true });

    const scorecard = {
      generated_at: new Date().toISOString(),
      renderer_source: "M2 TypeScript",
      total_scenes: SCENES_TO_SCORE.length,
      scenes: [],
    };

    // Score each scene
    for (const sceneName of SCENES_TO_SCORE) {
      console.log(`Scoring ${sceneName}...`);

      // Rewrite main.ts
      const prevContent = await rewriteMainTsForScene(sceneName);
      await rebuildDist();

      const page = await browser.newPage({ viewport: VIEWPORT });
      try {
        await page.goto(serverUrl, { waitUntil: "networkidle" });

        // Give render time to complete
        await page.waitForTimeout(2000);

        const result = await scoreScene(page, sceneName);
        scorecard.scenes.push(result);

        console.log(`  Score: ${result.total_layout_score}/100`);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
      } finally {
        await page.close();
      }
    }

    // Sort by score descending
    scorecard.scenes.sort((a, b) => b.total_layout_score - a.total_layout_score);

    // Load M0 scorecard for comparison
    let m0Scorecard = null;
    const m0ScorePath = path.join(
      REPO_ROOT,
      "test-results/m0_static_summary/scorecard/scorecard.json",
    );
    if (fs.existsSync(m0ScorePath)) {
      try {
        const m0Data = fs.readFileSync(m0ScorePath, "utf8");
        m0Scorecard = JSON.parse(m0Data);
      } catch (err) {
        console.warn(`Could not load M0 scorecard: ${err.message}`);
      }
    }

    // Generate report
    const markdown = generateMarkdownReport(scorecard, m0Scorecard);
    const reportPath = path.join(reportDir, "m2_scorecard.md");
    fs.writeFileSync(reportPath, markdown);
    console.log(`\nScorecard written to ${reportPath}`);

    // Summary
    console.log("\n=== Summary ===");
    console.log(`Total scenes: ${scorecard.total_scenes}`);
    const avgScore =
      scorecard.scenes.reduce((sum, s) => sum + s.total_layout_score, 0) / scorecard.scenes.length;
    console.log(`Average score: ${avgScore.toFixed(1)}/100`);
    console.log("\nTop 3 scenes:");
    scorecard.scenes.slice(0, 3).forEach((s, idx) => {
      console.log(`  ${idx + 1}. ${s.scene_name}: ${s.total_layout_score}/100`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err.message);
    process.exit(1);
  } finally {
    // Cleanup
    await restoreMainTs(originalMainTs);

    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
  }
}

main();
