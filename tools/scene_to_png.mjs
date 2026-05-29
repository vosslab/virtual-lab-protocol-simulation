#!/usr/bin/env node

// tools/scene_to_png.mjs
//
// WS-M2-A + WS-M2-C: Render scene pages to PNG and report render stats.
//
// Usage (bare node):
//   node tools/scene_to_png.mjs --scene <name> [--out <path>] [--viewport WxH]
//   node tools/scene_to_png.mjs --all [--out <dir>] [--viewport WxH]
//
// --scene <name>           : Render one named scene from the manifest.
// --all                    : Render every EMITTED scene in the manifest.
//                            Skipped scenes get a summary row but no PNG.
// --out <path>             : Single-scene: path for the PNG file.
//                            --all: output directory (default: test-results/scenes/).
// --missing-svg <mode>     : strict | placeholder. Recorded in stats.json but
//                            does NOT trigger a rebuild. To switch mode, run:
//                            bash build_github_pages.sh, then re-run this tool.
// --viewport WxH           : Viewport size (default 1920x1080).
//
// Speed design:
//   - Assumes dist/ already exists. If missing, emits a clear error and exits.
//   - Launches ONE chromium browser and ONE HTTP server for the whole run.
//   - Reuses a single page for sequential scene renders.
//   - Waits on #scene-root[data-viewer-ready="true"], NOT networkidle.
//   - Uses waitUntil:"load" (not networkidle) for fast goto.
//   - A 100ms settle is the only fixed sleep; tunable via SETTLE_MS constant.
//
// Category classification (mutually exclusive):
//   populated        : at least one real (non-placeholder) rendered item.
//   placeholder-only : all rendered items are placeholders.
//   empty            : viewer-ready but zero rendered items.
//   load-failed      : page threw or timed out before ready marker.
//   skipped          : manifest says outcome=skipped; no render attempted.

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeSceneStats } from "./scene_stats.mjs";

//============================================
// Paths
//============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DIST_DIR = path.join(REPO_ROOT, "dist");
const MANIFEST_PATH = path.join(REPO_ROOT, "generated", "scene_manifest.json");

//============================================
// Timing constants
//============================================

// Maximum ms to wait for the viewer-ready marker.
// 5 s is enough for successful scenes (~150ms); load-failed scenes timeout here.
// Lower = faster --all runs when many scenes are broken.
const READY_TIMEOUT_MS = 5000;
// Small settle after ready marker (DOM paint flush). Keep <= 150ms per spec.
const SETTLE_MS = 100;
// Maximum ms for page.goto before we declare load-failed.
const GOTO_TIMEOUT_MS = 12000;

//============================================
// MIME map for inline HTTP server
//============================================

const MIME_MAP = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

//============================================
// CLI argument parser
//============================================

function parse_args(argv) {
  const args = {
    scene: null,
    all: false,
    out: null,
    missing_svg: "placeholder",
    viewport: { width: 1920, height: 1080 },
  };

  let i = 2;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === "--scene") {
      args.scene = argv[++i];
    } else if (tok === "--all") {
      args.all = true;
    } else if (tok === "--out") {
      args.out = argv[++i];
    } else if (tok === "--missing-svg") {
      const mode = argv[++i];
      if (mode !== "strict" && mode !== "placeholder") {
        throw new Error(`--missing-svg must be "strict" or "placeholder", got: ${mode}`);
      }
      args.missing_svg = mode;
    } else if (tok === "--viewport") {
      const vp = argv[++i];
      const m = vp.match(/^(\d+)[xX](\d+)$/);
      if (!m) {
        throw new Error(`--viewport must be WxH (e.g. 1920x1080), got: ${vp}`);
      }
      args.viewport = { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
    } else {
      throw new Error(`Unknown argument: ${tok}`);
    }
    i++;
  }

  if (!args.scene && !args.all) {
    throw new Error("Specify --scene <name> or --all");
  }
  if (args.scene && args.all) {
    throw new Error("--scene and --all are mutually exclusive");
  }

  return args;
}

//============================================
// Manifest reader
//============================================

function read_manifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Scene manifest not found: ${MANIFEST_PATH}\nRun: bash build_github_pages.sh`);
  }
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.scenes;
}

function find_manifest_entry(scenes, scene_name) {
  const entry = scenes.find((s) => s.name === scene_name);
  return entry ?? null;
}

//============================================
// HTTP server (inline Node server, no external deps)
//============================================

async function start_server(dist_dir) {
  const server = http.createServer((req, res) => {
    // Strip query string; default to index.html for bare /
    const url_path = req.url ? req.url.split("?")[0] : "/";
    const norm = url_path === "/" ? "/index.html" : url_path;
    const file_path = path.join(dist_dir, norm);
    const ext = path.extname(file_path);
    const content_type = MIME_MAP[ext] ?? "application/octet-stream";

    fs.readFile(file_path, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`Not found: ${norm}`);
        return;
      }
      res.writeHead(200, { "Content-Type": content_type });
      res.end(data);
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base_url = `http://127.0.0.1:${port}`;

  return {
    port,
    base_url,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

//============================================
// Playwright: check browser installed
//============================================

async function check_playwright_installed() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Executable") ||
      msg.includes("not found") ||
      msg.includes("install") ||
      msg.includes("executable")
    ) {
      console.error("Playwright browser not installed. Run: npx playwright install chromium");
      process.exit(1);
    }
    throw err;
  }
}

//============================================
// DOM query: collect rendered items from the page
//============================================

// Collects all [data-placement-name] elements from the page.
// Returns an array matching the renderedItems shape scene_stats.mjs expects.
async function collect_rendered_items(page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-placement-name]"));
    return els.map((el) => {
      const rect = el.getBoundingClientRect();
      const bbox =
        rect.width > 0 || rect.height > 0
          ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          : null;

      // Determine if this is a placeholder. render_item.ts sets
      // data-placeholder-kind to "missing-object" or "missing-svg" and also
      // sets data-missing-svg="true" on BOTH placeholder causes for back-compat.
      // Read data-placeholder-kind directly so missing-object placeholders are
      // not misclassified as missing-svg.
      const placeholderKindAttr = el.getAttribute("data-placeholder-kind");
      const hasMissingSvgAttr = el.hasAttribute("data-missing-svg");
      const hasSvg = el.querySelector("svg") !== null;
      // A placeholder is any element flagged by either attribute, or with no SVG.
      const isPlaceholder = placeholderKindAttr !== null || hasMissingSvgAttr || !hasSvg;
      let placeholderKind = null;
      if (isPlaceholder) {
        if (placeholderKindAttr !== null) {
          placeholderKind = placeholderKindAttr;
        } else if (hasMissingSvgAttr) {
          // Back-compat fallback: only the legacy data-missing-svg flag present.
          placeholderKind = "missing-svg";
        } else {
          placeholderKind = "missing-object";
        }
      }

      return {
        placementName: el.getAttribute("data-placement-name") ?? "",
        objectName: el.getAttribute("data-object-name") ?? null,
        zone: el.getAttribute("data-zone") ?? null,
        kind: el.getAttribute("data-kind") ?? null,
        depth: el.hasAttribute("data-depth") ? Number(el.getAttribute("data-depth")) : null,
        bbox,
        isPlaceholder,
        placeholderKind,
      };
    });
  });
}

// Collects [data-label] elements.
// Returns an array of { bbox, text } matching the labels shape scene_stats.mjs expects.
async function collect_labels(page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-label]"));
    return els.map((el) => {
      const rect = el.getBoundingClientRect();
      const bbox =
        rect.width > 0 || rect.height > 0
          ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          : null;
      return {
        bbox,
        text: el.textContent ?? "",
      };
    });
  });
}

// Collects the #scene-root bounding box.
async function collect_scene_root_bbox(page) {
  return page.evaluate(() => {
    const el = document.getElementById("scene-root");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

//============================================
// Render one scene: load, wait for ready, capture, compute stats
//============================================

// Renders one scene. Returns a result object.
// page is reused across calls; out_dir is the directory for outputs.
async function render_scene(page, base_url, scene_name, manifest_entry, out_dir, missing_svg_mode) {
  const t_start = Date.now();

  const url = `${base_url}/scene_viewer.html?scene=${encodeURIComponent(scene_name)}`;

  const page_errors = [];
  // Remove old listeners so reruns on the same page do not accumulate them.
  page.removeAllListeners("pageerror");
  page.on("pageerror", (err) => page_errors.push(err.message));

  let load_failed = false;

  try {
    // waitUntil:"load" is faster than "networkidle"; we wait on the ready marker next.
    await page.goto(url, { waitUntil: "load", timeout: GOTO_TIMEOUT_MS });
  } catch {
    load_failed = true;
  }

  if (!load_failed) {
    // Wait for the viewer-ready marker. This fires on EVERY path: populated,
    // placeholder-only, empty scene, AND the unknown-scene error banner.
    try {
      await page.waitForSelector("#scene-root[data-viewer-ready='true']", {
        timeout: READY_TIMEOUT_MS,
      });
    } catch {
      // Timed out waiting for the ready marker -- treat as load-failed.
      load_failed = true;
    }
  }

  if (!load_failed && page_errors.length > 0) {
    load_failed = true;
  }

  // Small settle to allow any post-ready DOM paint.
  if (!load_failed) {
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  }

  // Collect DOM data (empty arrays / null on load-failed).
  let rendered_items = [];
  let labels = [];
  let scene_root_bbox = null;

  if (!load_failed) {
    rendered_items = await collect_rendered_items(page);
    labels = await collect_labels(page);
    scene_root_bbox = await collect_scene_root_bbox(page);
  }

  // Compute stats using the shared module.
  const stats = computeSceneStats({
    sceneName: scene_name,
    manifestEntry: manifest_entry,
    renderedItems: rendered_items,
    labels,
    sceneRootBbox: scene_root_bbox,
    loadFailed: load_failed,
  });

  // Stamp the missing-svg mode so the JSON is self-documenting.
  stats.build_note = {
    missing_svg_mode,
    note: "missing_svg_mode is a passthrough flag. Changing it requires re-running bash build_github_pages.sh.",
  };

  // Save the PNG.
  fs.mkdirSync(out_dir, { recursive: true });
  const png_path = path.join(out_dir, `${scene_name}.png`);
  await page.screenshot({ path: png_path, fullPage: false });

  // Save the stats JSON alongside the PNG.
  const stats_path = path.join(out_dir, `${scene_name}.stats.json`);
  fs.writeFileSync(stats_path, JSON.stringify(stats, null, 2));

  const elapsed_ms = Date.now() - t_start;
  return { scene_name, stats, png_path, stats_path, elapsed_ms, load_failed };
}

//============================================
// Human summary printer (single scene)
//============================================

function print_scene_summary(result) {
  const { scene_name, stats, elapsed_ms } = result;
  const cat = stats.classification.category;
  const counts = stats.counts;
  const layout = stats.layout;
  const flags = stats.flags.advisory_flags;

  console.log(`  scene:          ${scene_name}`);
  console.log(`  category:       ${cat}`);
  console.log(
    `  rendered:       ${counts.rendered_placement_count} / ${counts.source_placement_count} placements (${counts.render_yield_percent}% yield)`,
  );
  console.log(`  real items:     ${counts.real_item_count}`);
  console.log(`  placeholders:   ${counts.placeholder_item_count}`);
  console.log(`  approx empty:   ${layout.percent_empty_approx}%`);
  console.log(`  overlaps:       ${layout.overlap_pair_count} pairs`);
  if (counts.dropped_placement_count > 0) {
    console.log(
      `  dropped:        ${counts.dropped_placement_count} (${counts.dropped_placement_names.join(", ")})`,
    );
  }
  if (stats.flags.missing_svg_names.length > 0) {
    console.log(`  missing-svg:    ${stats.flags.missing_svg_names.join(", ")}`);
  }
  if (stats.flags.missing_object_names.length > 0) {
    console.log(`  missing-object: ${stats.flags.missing_object_names.join(", ")}`);
  }
  if (flags.length > 0) {
    console.log(`  flags:          ${flags.join(", ")}`);
  }
  console.log(`  elapsed:        ${elapsed_ms} ms`);
}

//============================================
// --all mode: console table printer
//============================================

function print_all_summary_table(results) {
  // Pad a string to width (right-truncate if too long).
  function pad(s, w) {
    const str = String(s);
    if (str.length >= w) return str.slice(0, w);
    return str + " ".repeat(w - str.length);
  }

  const header = `${"SCENE".padEnd(48)} ${"CAT".padEnd(18)} ${"YIELD".padEnd(7)} ${"REAL".padEnd(5)} ${"PH".padEnd(4)} ${"EMPTY%".padEnd(7)} ${"OVLP".padEnd(5)} ${"FLAGS".padEnd(20)} ${"MS".padEnd(6)}`;
  console.log("\n" + header);
  console.log("-".repeat(header.length));

  for (const r of results) {
    const cat = r.category;
    const yield_str = r.render_yield_percent !== undefined ? `${r.render_yield_percent}%` : "-";
    const real_str = r.real_item_count !== undefined ? String(r.real_item_count) : "-";
    const ph_str = r.placeholder_item_count !== undefined ? String(r.placeholder_item_count) : "-";
    const empty_str = r.percent_empty_approx !== undefined ? `${r.percent_empty_approx}%` : "-";
    const ovlp_str = r.overlap_pair_count !== undefined ? String(r.overlap_pair_count) : "-";
    const flags_str = (r.advisory_flags ?? []).join(",") || "-";
    const ms_str = r.elapsed_ms !== undefined ? String(r.elapsed_ms) : "-";

    const row = `${pad(r.scene_name, 48)} ${pad(cat, 18)} ${pad(yield_str, 7)} ${pad(real_str, 5)} ${pad(ph_str, 4)} ${pad(empty_str, 7)} ${pad(ovlp_str, 5)} ${pad(flags_str, 20)} ${pad(ms_str, 6)}`;
    console.log(row);
  }
}

//============================================
// Single-scene mode
//============================================

async function run_single(args) {
  const scenes = read_manifest();
  const manifest_entry = find_manifest_entry(scenes, args.scene);

  if (!manifest_entry) {
    console.error(`Scene "${args.scene}" not found in scene manifest.`);
    console.error(`Available scenes: ${scenes.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  if (!fs.existsSync(path.join(DIST_DIR, "scene_viewer.html"))) {
    console.error("dist/scene_viewer.html not found. Run: bash build_github_pages.sh");
    process.exit(1);
  }

  // Handle manifest-skipped scene gracefully (no render).
  if (manifest_entry.outcome === "skipped") {
    console.log(`scene:    ${args.scene}`);
    console.log(`category: skipped`);
    console.log(`reason:   ${manifest_entry.reason ?? "(no reason recorded)"}`);
    console.log("No PNG rendered (scene is skipped in the manifest).");
    return;
  }

  const out_dir = args.out
    ? path.dirname(args.out)
    : path.join(REPO_ROOT, "test-results", "scenes");
  const png_override = args.out ?? null;

  await check_playwright_installed();

  const server = await start_server(DIST_DIR);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: args.viewport });

  try {
    console.log(`Rendering scene: ${args.scene}`);
    const result = await render_scene(
      page,
      server.base_url,
      args.scene,
      manifest_entry,
      out_dir,
      args.missing_svg,
    );

    // If a specific --out path was given, move the PNG there.
    if (png_override && png_override !== result.png_path) {
      fs.mkdirSync(path.dirname(png_override), { recursive: true });
      fs.renameSync(result.png_path, png_override);
      result.png_path = png_override;
    }

    console.log("");
    print_scene_summary(result);
    console.log(`  png:            ${result.png_path}`);
    console.log(`  stats:          ${result.stats_path}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

//============================================
// --all mode
//============================================

async function run_all(args) {
  if (!fs.existsSync(path.join(DIST_DIR, "scene_viewer.html"))) {
    console.error("dist/scene_viewer.html not found. Run: bash build_github_pages.sh");
    process.exit(1);
  }

  const scenes = read_manifest();
  const out_dir = args.out ?? path.join(REPO_ROOT, "test-results", "scenes");
  fs.mkdirSync(out_dir, { recursive: true });

  await check_playwright_installed();

  const server = await start_server(DIST_DIR);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: args.viewport });

  const summary_rows = [];
  const t_all_start = Date.now();

  try {
    for (const entry of scenes) {
      const t_scene_start = Date.now();

      // Skipped scenes: record row, no render.
      if (entry.outcome === "skipped") {
        console.log(`[skipped]  ${entry.name}  -- ${entry.reason ?? "(no reason)"}`);
        summary_rows.push({
          scene_name: entry.name,
          category: "skipped",
          render_yield_percent: undefined,
          real_item_count: undefined,
          placeholder_item_count: undefined,
          percent_empty_approx: undefined,
          overlap_pair_count: undefined,
          advisory_flags: [],
          elapsed_ms: 0,
          reason: entry.reason ?? null,
          png_path: null,
          stats_path: null,
        });
        continue;
      }

      // Emitted scenes: render.
      let result;
      try {
        result = await render_scene(
          page,
          server.base_url,
          entry.name,
          entry,
          out_dir,
          args.missing_svg,
        );
      } catch (err) {
        // Continue past a failing render -- record load-failed row.
        const elapsed_ms = Date.now() - t_scene_start;
        const err_msg = err instanceof Error ? err.message : String(err);
        console.error(`[ERROR] ${entry.name}: ${err_msg}`);
        summary_rows.push({
          scene_name: entry.name,
          category: "load-failed",
          render_yield_percent: 0,
          real_item_count: 0,
          placeholder_item_count: 0,
          percent_empty_approx: 100,
          overlap_pair_count: 0,
          advisory_flags: [],
          elapsed_ms,
          reason: err_msg,
          png_path: null,
          stats_path: null,
        });
        continue;
      }

      const stats = result.stats;
      summary_rows.push({
        scene_name: entry.name,
        category: stats.classification.category,
        render_yield_percent: stats.counts.render_yield_percent,
        real_item_count: stats.counts.real_item_count,
        placeholder_item_count: stats.counts.placeholder_item_count,
        percent_empty_approx: stats.layout.percent_empty_approx,
        overlap_pair_count: stats.layout.overlap_pair_count,
        advisory_flags: stats.flags.advisory_flags,
        elapsed_ms: result.elapsed_ms,
        reason: null,
        png_path: result.png_path,
        stats_path: result.stats_path,
      });

      const cat = stats.classification.category;
      console.log(`[${cat.padEnd(16)}] ${entry.name}  (${result.elapsed_ms} ms)`);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const total_ms = Date.now() - t_all_start;

  // Write summary.json.
  const summary_path = path.join(out_dir, "summary.json");
  fs.writeFileSync(
    summary_path,
    JSON.stringify({ generated_at: new Date().toISOString(), scenes: summary_rows }, null, 2),
  );

  // Print table + totals.
  print_all_summary_table(summary_rows);

  // Category counts.
  const cat_counts = {};
  for (const row of summary_rows) {
    cat_counts[row.category] = (cat_counts[row.category] ?? 0) + 1;
  }

  console.log("\n--- Category totals ---");
  for (const [cat, count] of Object.entries(cat_counts).sort()) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }
  console.log(`  ${"TOTAL".padEnd(20)} ${summary_rows.length}`);
  console.log(`\nTotal elapsed: ${total_ms} ms  (${(total_ms / 1000).toFixed(1)} s)`);
  console.log(`Summary written to: ${summary_path}`);
}

//============================================
// Entry point
//============================================

async function main() {
  let args;
  try {
    args = parse_args(process.argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Usage error: ${msg}`);
    console.error("Usage: node tools/scene_to_png.mjs --scene <name> | --all [options]");
    process.exit(1);
  }

  if (args.scene) {
    await run_single(args);
  } else {
    await run_all(args);
  }
}

main().catch((err) => {
  console.error("scene_to_png error:", err);
  process.exit(1);
});
