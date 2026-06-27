// tools/scene_check.mjs
//
// Author convenience wrapper: run the full layout health check chain for one
// scene or all scenes, then print a compact summary to stdout.
//
// Chain (determined by inspecting tools/layout_metrics.mjs and
// tools/layout_health_report.mjs):
//   step 1 -- tools/layout_metrics.mjs --all
//     Runs runPipeline live in-process via tsx (reads generated/*.ts artifacts).
//     Writes test-results/layout_metrics/<scene>_metrics.json for every scene.
//     Does NOT read generated/precomputed_layout.ts; no separate precompute step needed.
//   step 2 -- tools/layout_health_report.mjs --all
//     Pure reader of the WS-B metrics JSON files. Does NOT run the pipeline.
//     Writes test-results/layout_health/health_report.md + health_report.json.
//
// Usage:
//   node tools/scene_check.mjs seeding_workspace
//   node tools/scene_check.mjs --all
//
// npm aliases (package.json):
//   npm run scene:check -- seeding_workspace
//   npm run scene:check:all

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

//============================================
// Repo root
//============================================

function repoRoot() {
  const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return top.trim();
}

//============================================
// Arg parsing
//============================================

function parseArgs() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    process.stderr.write(
      "Usage:\n" +
        "  node tools/scene_check.mjs <scene_name>\n" +
        "  node tools/scene_check.mjs --all\n",
    );
    process.exit(1);
  }
  if (argv[0] === "--all") {
    return { mode: "all", sceneName: null };
  }
  const sceneName = argv[0];
  if (sceneName.startsWith("-")) {
    process.stderr.write(`Error: unrecognized argument: ${sceneName}\n`);
    process.stderr.write("Usage:\n");
    process.stderr.write("  node tools/scene_check.mjs <scene_name>\n");
    process.stderr.write("  node tools/scene_check.mjs --all\n");
    process.exit(1);
  }
  return { mode: "single", sceneName };
}

//============================================
// Run a child process, streaming both stdio channels to the parent.
//============================================

function runStreamed(root, args) {
  execFileSync("node", args, { cwd: root, stdio: "inherit" });
}

//============================================
// Run a child process, capturing stdout while streaming stderr.
// Returns captured stdout as a string.
//============================================

function runCaptured(root, args) {
  return execFileSync("node", args, {
    cwd: root,
    // inherit stderr so errors surface; capture stdout
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });
}

//============================================
// Read the health report JSON and find one scene's diagnosis.
//============================================

function loadDiagnosis(root, sceneName) {
  const jsonPath = path.join(root, "test-results", "layout_health", "health_report.json");
  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const diag = report.diagnoses.find((d) => d.scene === sceneName);
  if (!diag) {
    // List known scene names so the author can correct a typo.
    const known = report.diagnoses
      .map((d) => d.scene)
      .sort()
      .join(", ");
    process.stderr.write(`Error: scene "${sceneName}" not found in health report.\n`);
    process.stderr.write(`Known scenes: ${known}\n`);
    process.exit(1);
  }
  return diag;
}

//============================================
// Print a one-scene compact summary to stdout.
//============================================

function printSceneSummary(diag, reportPath) {
  process.stdout.write(`\nreport: ${reportPath}\n`);
  process.stdout.write(`\nscene: ${diag.scene}\n`);
  process.stdout.write(`  finding:    ${diag.finding}\n`);
  process.stdout.write(`  categories: ${diag.categories.join(", ")}\n`);
  process.stdout.write(`  verdict:    ${diag.verdict}\n`);
  if (diag.borderline.length > 0) {
    process.stdout.write(`  borderline: ${diag.borderline.join(", ")}\n`);
  }
  process.stdout.write(`  severity:   ${diag.severity}\n`);
  process.stdout.write(`  target:     ${diag.suggestion}\n`);
}

//============================================
// Main
//============================================

function main() {
  const root = repoRoot();
  const opts = parseArgs();

  const reportPath = path.join(root, "test-results", "layout_health", "health_report.md");

  // Step 1: generate raw geometry metrics for all scenes.
  // Always all: health report requires every scene's metrics to derive
  // distribution-based advisory bands -- a single-scene metric run would
  // produce degenerate bands.
  process.stdout.write("[1/2] computing layout metrics (all scenes)...\n");
  runStreamed(root, ["--import", "tsx", "tools/layout_metrics.mjs", "--all"]);

  // Step 2: analyze health and write the report files.
  // Always --all so health_report.md and health_report.json are written.
  // For single-scene mode, capture stdout (suppressing the full 38-scene
  // scorecard) and extract just the requested scene's row from the JSON.
  process.stdout.write("[2/2] analyzing layout health...\n");
  if (opts.mode === "all") {
    // Stream health output directly; it already prints the scorecard + paths.
    runStreamed(root, ["--import", "tsx", "tools/layout_health_report.mjs", "--all"]);
    // The health tool prints the report path in its own output; nothing more needed.
    return;
  }

  // Single-scene mode: capture health output (suppress full scorecard noise),
  // then extract and print just this scene's compact summary.
  runCaptured(root, ["--import", "tsx", "tools/layout_health_report.mjs", "--all"]);
  const diag = loadDiagnosis(root, opts.sceneName);
  printSceneSummary(diag, reportPath);
}

main();
