#!/usr/bin/env node

// tools/protocol_to_png.mjs
//
// WS-M2P-A + WS-M2P-B: Render protocol pages to PNG and report step reachability.
//
// Usage:
//   node tools/protocol_to_png.mjs --protocol <name> [--out <dir>] [--viewport WxH] [--steps]
//   node tools/protocol_to_png.mjs --all [--out <dir>] [--steps]
//
// --protocol <name>  : Render initial interface+scene for one protocol.
// --all              : Render all protocols from the protocols index.
// --out <dir>        : Output directory. Defaults vary by mode (see below).
// --viewport WxH     : Viewport size. Default: 1280x900.
// --steps            : Also enumerate and attempt to reach each declared step.
//                      Emits <protocol>.steps.json alongside PNGs.
//
// Load outcomes reported per protocol:
//   protocol-HTML-missing          : dist/<name>.html does not exist.
//   page-load-failure              : Browser threw a JS error or threw on goto.
//   shell-loaded-but-scene-empty   : Shell regions present, scene has 0 items.
//   scene-loaded-but-guidance-missing : Scene has items, guidance bar absent.
//   populated                      : Scene has >= 1 item and guidance bar present.

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

//============================================
// Paths
//============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DIST_DIR = path.join(REPO_ROOT, "dist");
const CONTENT_PROTOCOLS_DIR = path.join(REPO_ROOT, "content", "protocols");
const GENERATED_SLIM = path.join(REPO_ROOT, "generated", "protocols_index_slim.ts");

//============================================
// Timing constants
//============================================

const PAGE_TIMEOUT_MS = 15000;
const ITEM_WAIT_MS = 4000;
const RENDER_WAIT_MS = 1500;
const SETTLE_MS = 500;
const STEP_NAV_WAIT_MS = 1000;

//============================================
// MIME map for HTTP server
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
// HTTP server helper
//============================================

async function start_server(dist_dir) {
  const server = http.createServer((req, res) => {
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
  const url = `http://127.0.0.1:${port}`;

  return {
    port,
    url,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

//============================================
// Protocol index: read from generated/protocols_index_slim.ts
// Parse by regex -- avoids requiring js-yaml and handles TS const syntax.
//============================================

function read_protocols_index() {
  if (!fs.existsSync(GENERATED_SLIM)) {
    throw new Error(
      `Generated protocols index not found: ${GENERATED_SLIM}\nRun: bash build_github_pages.sh`,
    );
  }
  const source = fs.readFileSync(GENERATED_SLIM, "utf8");

  const entries = [];
  // Each entry is a { ... } object literal on a single line.
  const line_re = /\{\s*protocol_name:\s*'([^']+)'.*?step_count:\s*(\d+)/g;
  let m;
  while ((m = line_re.exec(source)) !== null) {
    entries.push({ protocol_name: m[1], step_count: parseInt(m[2], 10) });
  }
  if (entries.length === 0) {
    throw new Error("Could not parse any protocol entries from protocols_index_slim.ts");
  }
  return entries;
}

//============================================
// Step name reader: parse step_name fields from protocol.yaml
// Uses a simple regex sweep; handles the well-structured YAML schema.
//============================================

function read_step_names(protocol_name) {
  // Try each cluster dir
  const cluster_dirs = fs.readdirSync(CONTENT_PROTOCOLS_DIR);
  for (const cluster of cluster_dirs) {
    const yaml_path = path.join(CONTENT_PROTOCOLS_DIR, cluster, protocol_name, "protocol.yaml");
    if (!fs.existsSync(yaml_path)) continue;

    const src = fs.readFileSync(yaml_path, "utf8");
    const step_names = [];
    const re = /^\s*-\s+step_name:\s+(\S+)/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      step_names.push(m[1]);
    }
    return { step_names, yaml_path };
  }
  return { step_names: [], yaml_path: null };
}

//============================================
// Playwright: check browser installed
//============================================

async function check_playwright_installed() {
  try {
    const browser = await chromium.launch();
    await browser.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Executable") || msg.includes("not found") || msg.includes("install")) {
      console.error("Playwright browser not installed. Run: npx playwright install chromium");
      process.exit(1);
    }
    throw err;
  }
}

//============================================
// Page wait helpers
//============================================

async function wait_for_scene(page) {
  // Wait for scene-root to appear (tolerate absence -- outcome classifier handles it)
  await page
    .locator("#scene-root")
    .first()
    .waitFor({ state: "visible", timeout: ITEM_WAIT_MS })
    .catch(() => {});

  // Wait for items to appear inside scene-root (tolerate absence)
  await page
    .locator("#scene-root [data-item-id]")
    .first()
    .waitFor({ state: "visible", timeout: ITEM_WAIT_MS })
    .catch(() => {});

  // Wait for guidance text to be populated (shell onMount); tolerate loading delay
  await page
    .waitForFunction(
      () => {
        const el = document.getElementById("guidance-text");
        return el !== null && el.textContent !== "Loading...";
      },
      { timeout: RENDER_WAIT_MS },
    )
    .catch(() => {});

  await page.waitForTimeout(SETTLE_MS);
}

//============================================
// Region presence check (tolerates absent regions -- reports, never hard-fails)
//============================================

async function check_regions(page) {
  const regions = {
    "tips-bubble": false,
    "step-counter": false,
    outline: false,
    "guidance-bar": false,
  };

  for (const region of Object.keys(regions)) {
    const count = await page.locator(`[data-region="${region}"]`).count();
    regions[region] = count > 0;
  }
  return regions;
}

//============================================
// Classify load outcome
//============================================

async function classify_outcome(page, has_page_error) {
  if (has_page_error) return "page-load-failure";

  const scene_root = await page.locator("#scene-root").count();
  if (scene_root === 0) return "shell-loaded-but-scene-empty";

  const item_count = await page.locator("#scene-root [data-item-id]").count();
  if (item_count === 0) return "shell-loaded-but-scene-empty";

  const guidance_count = await page.locator('[data-region="guidance-bar"]').count();
  if (guidance_count === 0) return "scene-loaded-but-guidance-missing";

  return "populated";
}

//============================================
// Render one protocol's initial interface to PNG
// Returns a result record.
//============================================

async function render_protocol_initial(page, base_url, protocol_name, out_dir, viewport) {
  const html_path = path.join(DIST_DIR, `${protocol_name}.html`);

  if (!fs.existsSync(html_path)) {
    return {
      protocol_name,
      outcome: "protocol-HTML-missing",
      item_count: 0,
      png_path: null,
      page_error: false,
      regions: {},
    };
  }

  const url = `${base_url}/${protocol_name}.html`;
  const page_errors = [];
  page.removeAllListeners("pageerror");
  page.on("pageerror", (err) => page_errors.push(err.message));

  await page.setViewportSize(viewport);

  let goto_failed = false;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
  } catch {
    goto_failed = true;
  }

  const has_page_error = goto_failed || page_errors.length > 0;

  if (!goto_failed) {
    await wait_for_scene(page);
  }

  const outcome = await classify_outcome(page, has_page_error);
  const item_count = await page.locator("#scene-root [data-item-id]").count();
  const regions = await check_regions(page);

  // Save screenshot regardless of outcome (captures whatever is visible)
  fs.mkdirSync(out_dir, { recursive: true });
  const png_filename = `${protocol_name}.png`;
  const png_path = path.join(out_dir, png_filename);
  await page.screenshot({ path: png_path, fullPage: false });

  return {
    protocol_name,
    outcome,
    item_count,
    png_path,
    page_error: has_page_error,
    page_error_messages: page_errors,
    regions,
  };
}

//============================================
// WS-M2P-B: attempt to reach each declared step via visible UI
// Returns an array of step records.
//============================================

async function render_protocol_steps(page, base_url, protocol_name, out_dir, viewport) {
  const { step_names } = read_step_names(protocol_name);
  const step_dir = path.join(out_dir, protocol_name);
  fs.mkdirSync(step_dir, { recursive: true });

  const html_path = path.join(DIST_DIR, `${protocol_name}.html`);
  if (!fs.existsSync(html_path)) {
    // All steps blocked: HTML missing
    return step_names.map((name) => ({
      step_name: name,
      status: "blocked",
      reason: "protocol-HTML-missing",
      item_count: 0,
      guidance_present: false,
      scene_rendered: false,
      page_error: false,
      png_path: null,
    }));
  }

  if (step_names.length === 0) {
    return [];
  }

  const url = `${base_url}/${protocol_name}.html`;
  const step_records = [];

  // Entry step: load the page fresh, capture
  const entry_name = step_names[0];
  {
    const page_errors = [];
    page.removeAllListeners("pageerror");
    page.on("pageerror", (err) => page_errors.push(err.message));

    await page.setViewportSize(viewport);
    let goto_failed = false;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
    } catch {
      goto_failed = true;
    }

    const has_page_error = goto_failed || page_errors.length > 0;
    if (!goto_failed) {
      await wait_for_scene(page);
    }

    const item_count = await page.locator("#scene-root [data-item-id]").count();
    const guidance_present = (await page.locator('[data-region="guidance-bar"]').count()) > 0;
    const scene_rendered = item_count > 0;

    const png_path = path.join(step_dir, `step_00.png`);
    await page.screenshot({ path: png_path, fullPage: false });

    step_records.push({
      step_name: entry_name,
      status: "reached",
      reason: null,
      item_count,
      guidance_present,
      scene_rendered,
      page_error: has_page_error,
      png_path,
    });
  }

  // Subsequent steps: attempt to navigate via visible UI.
  // The shell uses data-step-status="current" on the active outline card.
  // Try clicking the next-step button or outline cards to advance.
  // Per walker rules: only click visible UI; never write game state.
  for (let i = 1; i < step_names.length; i++) {
    const step_name = step_names[i];
    const png_path = path.join(step_dir, `step_${String(i).padStart(2, "0")}.png`);

    let reached = false;
    let reason = "no-visible-advance-control";
    let item_count = 0;
    let guidance_present = false;
    let scene_rendered = false;
    let has_page_error = false;

    try {
      // Look for a visible "Next step" or "Continue" button
      const next_btn = page
        .locator("button:visible")
        .filter({ hasText: /next|continue|complete/i });
      const next_count = await next_btn.count();

      if (next_count > 0) {
        await next_btn.first().click();
        await page.waitForTimeout(STEP_NAV_WAIT_MS);
        await wait_for_scene(page);
        reached = true;
        reason = null;
      } else {
        // Try outline step cards -- click the card for this step if it's clickable
        const outline_cards = page.locator(".outline-step-card:visible");
        const card_count = await outline_cards.count();

        if (card_count > i) {
          await outline_cards.nth(i).click();
          await page.waitForTimeout(STEP_NAV_WAIT_MS);
          await wait_for_scene(page);
          reached = true;
          reason = null;
        }
        // else: reason stays as initialized "no-visible-advance-control"
      }

      if (reached) {
        item_count = await page.locator("#scene-root [data-item-id]").count();
        guidance_present = (await page.locator('[data-region="guidance-bar"]').count()) > 0;
        scene_rendered = item_count > 0;

        const page_errors_after = [];
        page.on("pageerror", (e) => page_errors_after.push(e.message));
        has_page_error = page_errors_after.length > 0;

        await page.screenshot({ path: png_path, fullPage: false });
      }
    } catch (err) {
      reason = `error: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`;
    }

    step_records.push({
      step_name,
      status: reached ? "reached" : "blocked",
      reason,
      item_count,
      guidance_present,
      scene_rendered,
      page_error: has_page_error,
      png_path: reached ? png_path : null,
    });
  }

  return step_records;
}

//============================================
// Console table printer
//============================================

function print_table(rows) {
  const headers = ["protocol", "outcome", "items"];
  const col_widths = [
    Math.max(headers[0].length, ...rows.map((r) => r.protocol_name.length)),
    Math.max(headers[1].length, ...rows.map((r) => r.outcome.length)),
    Math.max(headers[2].length, ...rows.map((r) => String(r.item_count).length)),
  ];

  const separator = "+-" + col_widths.map((w) => "-".repeat(w)).join("-+-") + "-+";
  const fmt_row = (cols) => "| " + cols.map((c, i) => c.padEnd(col_widths[i])).join(" | ") + " |";

  console.log(separator);
  console.log(fmt_row(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(fmt_row([row.protocol_name, row.outcome, String(row.item_count)]));
  }
  console.log(separator);
}

//============================================
// Arg parsing
//============================================

function parse_args() {
  const args = process.argv.slice(2);
  const opts = {
    protocol: null,
    all: false,
    out: null,
    viewport: { width: 1280, height: 900 },
    steps: false,
  };

  let i = 0;
  while (i < args.length) {
    if (args[i] === "--protocol" && args[i + 1]) {
      opts.protocol = args[++i];
    } else if (args[i] === "--all") {
      opts.all = true;
    } else if (args[i] === "--out" && args[i + 1]) {
      opts.out = args[++i];
    } else if (args[i] === "--viewport" && args[i + 1]) {
      const parts = args[++i].split("x");
      opts.viewport = { width: parseInt(parts[0], 10), height: parseInt(parts[1], 10) };
    } else if (args[i] === "--steps") {
      opts.steps = true;
    }
    i++;
  }

  return opts;
}

//============================================
// Main
//============================================

async function main() {
  const opts = parse_args();

  if (!opts.protocol && !opts.all) {
    console.error(
      "Usage: node tools/protocol_to_png.mjs --protocol <name> | --all [--out <dir>] [--viewport WxH] [--steps]",
    );
    process.exit(1);
  }

  // Check Playwright browser installed
  await check_playwright_installed();

  // Check dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`dist/ directory not found. Run: bash build_github_pages.sh`);
    process.exit(1);
  }

  // Resolve protocol list
  let protocols;
  if (opts.all) {
    protocols = read_protocols_index();
  } else {
    // Single protocol: verify it's in the index
    const index = read_protocols_index();
    const entry = index.find((e) => e.protocol_name === opts.protocol);
    if (!entry) {
      console.error(`Unknown protocol: "${opts.protocol}"`);
      console.error(`Known protocols: ${index.map((e) => e.protocol_name).join(", ")}`);
      process.exit(1);
    }
    protocols = [entry];
  }

  // Resolve output directory
  const default_out = opts.steps
    ? path.join(REPO_ROOT, "test-results", "protocols_steps")
    : path.join(REPO_ROOT, "test-results", "protocols_initial");
  const out_dir = opts.out ? path.resolve(opts.out) : default_out;

  console.log(`Output directory: ${out_dir}`);
  console.log(`Protocols: ${protocols.length}`);
  console.log(`Steps mode: ${opts.steps}`);
  console.log(`Viewport: ${opts.viewport.width}x${opts.viewport.height}`);
  console.log("");

  // Start HTTP server
  const srv = await start_server(DIST_DIR);
  console.log(`HTTP server: ${srv.url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: opts.viewport });

  const summary_rows = [];

  try {
    for (const { protocol_name } of protocols) {
      console.log(`\n--- ${protocol_name} ---`);

      let initial_result;
      try {
        // Initial interface render (always done)
        const protocol_out = opts.steps ? path.join(out_dir, protocol_name) : out_dir;
        initial_result = await render_protocol_initial(
          page,
          srv.url,
          protocol_name,
          protocol_out,
          opts.viewport,
        );

        console.log(`  outcome: ${initial_result.outcome}`);
        console.log(`  items: ${initial_result.item_count}`);
        if (initial_result.png_path) {
          console.log(`  png: ${initial_result.png_path}`);
        }
        if (initial_result.page_error_messages && initial_result.page_error_messages.length > 0) {
          console.log(
            `  page errors: ${initial_result.page_error_messages.slice(0, 2).join(" | ")}`,
          );
        }
      } catch (err) {
        console.error(
          `  ERROR during initial render: ${err instanceof Error ? err.message : String(err)}`,
        );
        initial_result = {
          protocol_name,
          outcome: "page-load-failure",
          item_count: 0,
          png_path: null,
          page_error: true,
          regions: {},
        };
      }

      summary_rows.push({
        protocol_name,
        outcome: initial_result.outcome,
        item_count: initial_result.item_count,
      });

      // Steps mode (WS-M2P-B)
      if (opts.steps) {
        let step_records = [];
        try {
          step_records = await render_protocol_steps(
            page,
            srv.url,
            protocol_name,
            out_dir,
            opts.viewport,
          );
        } catch (err) {
          console.error(
            `  ERROR during step render: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // Write steps JSON
        const steps_json_path = path.join(out_dir, `${protocol_name}.steps.json`);
        fs.writeFileSync(
          steps_json_path,
          JSON.stringify(
            {
              protocol_name,
              initial_outcome: initial_result.outcome,
              steps: step_records,
            },
            null,
            2,
          ),
        );
        console.log(`  steps.json: ${steps_json_path}`);
        console.log(`  steps declared: ${step_records.length}`);

        const reached = step_records.filter((s) => s.status === "reached").length;
        const blocked = step_records.filter((s) => s.status === "blocked").length;
        console.log(`  steps reached: ${reached}  blocked: ${blocked}`);
      }
    }
  } finally {
    await browser.close();
    await srv.close();
  }

  // Write summary.json (--all mode, or always in case useful)
  if (opts.all) {
    fs.mkdirSync(out_dir, { recursive: true });
    const summary_path = path.join(out_dir, "summary.json");
    fs.writeFileSync(
      summary_path,
      JSON.stringify(
        {
          protocol_count: summary_rows.length,
          protocols: summary_rows,
        },
        null,
        2,
      ),
    );
    console.log(`\nSummary: ${summary_path}`);

    // Console table
    console.log("\n=== Protocol load summary ===");
    print_table(summary_rows);

    const outcomes = {};
    for (const row of summary_rows) {
      outcomes[row.outcome] = (outcomes[row.outcome] ?? 0) + 1;
    }
    console.log("\nOutcome counts:");
    for (const [outcome, count] of Object.entries(outcomes)) {
      console.log(`  ${outcome}: ${count}`);
    }
  } else if (summary_rows.length === 1) {
    // Single protocol: print brief summary
    const row = summary_rows[0];
    console.log(`\n=== Result: ${row.protocol_name} ===`);
    console.log(`  outcome: ${row.outcome}`);
    console.log(`  items: ${row.item_count}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
