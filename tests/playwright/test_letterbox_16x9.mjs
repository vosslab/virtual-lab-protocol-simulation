// tests/playwright/test_letterbox_16x9.mjs
//
// WP-PRECOMP2 evidence: the protocol host renders the scene inside an EXACT
// 16:9 letterboxed frame, and resizing the browser changes ONLY the letterbox
// bars / uniform scale -- never the scene-internal layout.
//
// What this test proves against the built dist/:
//   1. #scene-root has an exact 16:9 aspect ratio (width/height == 16/9 within
//      a 0.5% pixel tolerance) at every tested viewport aspect ratio, including
//      panels that are wider-than-16:9 and taller-than-16:9.
//   2. The scene-internal layout is identical across viewports: each rendered
//      item's center, expressed as a PERCENT of the #scene-root frame (the
//      scene-percent coordinate space the layout uses), matches the canonical
//      16:9 viewport within a small tolerance. Only the frame's pixel size and
//      the surrounding neutral bars change.
//
// The production path loads PRECOMPUTED_LAYOUT (no ?layout=runtime), so this
// also exercises the precomputed-consume switch end to end.
//
// Run:
//   bash build_github_pages.sh && node tests/playwright/test_letterbox_16x9.mjs

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Configuration
//============================================

// The protocol host page to load. mtt_reagent_prep's entry scene
// (mtt_reagent_prep_bench_workspace) is populated, so it renders multiple
// data-item-id objects to measure.
const PROTOCOL_PAGE = "mtt_reagent_prep.html";

// Viewports spanning three panel-aspect regimes. The grid/header/guidance-bar
// chrome makes the scene panel's own aspect differ from the window aspect, so
// these deliberately bracket both sides of 16:9 to exercise both pillarbox
// (wide) and letterbox (tall) regimes.
const VIEWPORTS = [
  { name: "canonical_1920x1080", width: 1920, height: 1080 }, // ~16:9 window
  { name: "wide_2400x1000", width: 2400, height: 1000 }, // very wide
  { name: "tall_1100x1200", width: 1100, height: 1200 }, // tall / narrow
  { name: "small_1280x800", width: 1280, height: 800 }, // 16:10
];

const TARGET_ASPECT = 16 / 9;
// Aspect tolerance: 0.5% of the target ratio. Sub-pixel rounding of width/height
// from getBoundingClientRect keeps the measured ratio within this band.
const ASPECT_TOLERANCE = TARGET_ASPECT * 0.005;
// Scene-percent center tolerance across viewports, in percent of the frame.
// Pure CSS letterboxing should reproduce identical percent centers; this small
// band only absorbs sub-pixel measurement noise at different pixel sizes.
const CENTER_PCT_TOLERANCE = 0.5;

const OUT_DIR = path.join(REPO_ROOT, "test-results", "letterbox_16x9");

//============================================
// Static server (serves dist/ on a free port)
//============================================

async function free_port() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function start_server(port) {
  const proc = spawn(
    "python3",
    ["-m", "http.server", String(port), "--directory", path.join(REPO_ROOT, "dist")],
    { cwd: REPO_ROOT, stdio: ["ignore", "ignore", "pipe"] },
  );
  // Give the server a moment to bind.
  await new Promise((r) => setTimeout(r, 600));
  return proc;
}

//============================================
// Measurement helpers
//============================================

// Read the #scene-root rect plus each data-item-id center expressed as a
// percent of the scene-root frame. Percent centers are the scene-percent
// coordinate space, invariant under pure letterboxing.
async function measure(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#scene-root");
    if (!root) return null;
    const r = root.getBoundingClientRect();
    const items = {};
    for (const el of document.querySelectorAll("#scene-root [data-item-id]")) {
      const b = el.getBoundingClientRect();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      // Center as a percent of the scene-root frame.
      items[el.getAttribute("data-item-id")] = {
        xPct: ((cx - r.x) / r.width) * 100,
        yPct: ((cy - r.y) / r.height) * 100,
      };
    }
    return { width: r.width, height: r.height, items };
  });
}

//============================================
// Main
//============================================

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(path.join(REPO_ROOT, "dist", PROTOCOL_PAGE))) {
    console.error(`letterbox: dist/${PROTOCOL_PAGE} missing; run build_github_pages.sh first`);
    process.exit(1);
  }

  const port = await free_port();
  const server = await start_server(port);
  const base = `http://localhost:${port}/${PROTOCOL_PAGE}`;

  const failures = [];
  const measurements = [];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(base, { waitUntil: "networkidle" });
      await page.waitForSelector("#scene-root [data-item-id]", { timeout: 8000 });
      await page.waitForTimeout(200);

      const m = await measure(page);
      if (m === null) {
        failures.push(`${vp.name}: #scene-root not found`);
        await page.close();
        continue;
      }

      // (1) exact 16:9 frame.
      const ratio = m.width / m.height;
      const aspect_ok = Math.abs(ratio - TARGET_ASPECT) <= ASPECT_TOLERANCE;
      if (!aspect_ok) {
        failures.push(
          `${vp.name}: #scene-root aspect ${ratio.toFixed(4)} != 16:9 ` +
            `(${TARGET_ASPECT.toFixed(4)} +/- ${ASPECT_TOLERANCE.toFixed(4)}); ` +
            `frame ${m.width.toFixed(1)}x${m.height.toFixed(1)}`,
        );
      }

      const screenshot = path.join(OUT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });

      measurements.push({ vp: vp.name, ratio, frame: m, aspect_ok, screenshot });
      console.log(
        `[letterbox] ${vp.name}: frame ${m.width.toFixed(1)}x${m.height.toFixed(1)} ` +
          `ratio=${ratio.toFixed(4)} aspect_ok=${aspect_ok} items=${Object.keys(m.items).length}`,
      );
      await page.close();
    }

    // (2) scene-internal layout invariance: compare every viewport's percent
    // centers against the canonical 16:9 viewport.
    const canonical = measurements.find((x) => x.vp === "canonical_1920x1080");
    if (canonical) {
      for (const meas of measurements) {
        if (meas.vp === canonical.vp) continue;
        for (const [id, c] of Object.entries(canonical.frame.items)) {
          const other = meas.frame.items[id];
          if (!other) {
            failures.push(`${meas.vp}: item ${id} present in canonical but missing here`);
            continue;
          }
          const dx = Math.abs(other.xPct - c.xPct);
          const dy = Math.abs(other.yPct - c.yPct);
          if (dx > CENTER_PCT_TOLERANCE || dy > CENTER_PCT_TOLERANCE) {
            failures.push(
              `${meas.vp}: item ${id} scene-percent center moved ` +
                `dx=${dx.toFixed(3)} dy=${dy.toFixed(3)} (> ${CENTER_PCT_TOLERANCE}%); ` +
                "scene-internal layout changed, not pure letterbox",
            );
          }
        }
      }
    } else {
      failures.push("canonical_1920x1080 viewport produced no measurement");
    }
  } finally {
    await browser.close();
    server.kill();
  }

  // Report.
  const report_lines = [];
  report_lines.push("# WP-PRECOMP2 letterbox 16:9 evidence");
  report_lines.push("");
  report_lines.push(`Protocol page: ${PROTOCOL_PAGE} (precomputed-consume production path).`);
  report_lines.push("");
  report_lines.push("| viewport | frame px | aspect | 16:9 ok |");
  report_lines.push("| --- | --- | --- | --- |");
  for (const m of measurements) {
    report_lines.push(
      `| ${m.vp} | ${m.frame.width.toFixed(1)}x${m.frame.height.toFixed(1)} | ` +
        `${m.ratio.toFixed(4)} | ${m.aspect_ok ? "yes" : "NO"} |`,
    );
  }
  report_lines.push("");
  report_lines.push(
    failures.length === 0
      ? "Result: PASS. Every frame is exact 16:9 and scene-internal percent " +
          "centers are invariant across viewports (only bars/scale change)."
      : `Result: FAIL (${failures.length}):\n- ${failures.join("\n- ")}`,
  );
  const report_path = path.join(OUT_DIR, "report.md");
  fs.writeFileSync(report_path, report_lines.join("\n"), "utf8");

  if (failures.length > 0) {
    console.error(`[letterbox] FAIL (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(`[letterbox] report: ${report_path}`);
    process.exit(1);
  }
  console.log(`[letterbox] PASS: all frames exact 16:9, scene layout invariant.`);
  console.log(`[letterbox] report: ${report_path}`);
}

main();
