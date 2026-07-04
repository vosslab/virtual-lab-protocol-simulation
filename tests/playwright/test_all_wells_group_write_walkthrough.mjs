// tests/playwright/test_all_wells_group_write_walkthrough.mjs
//
// Visible-UI walkthrough proving the subpart_group fan-out: an ObjectStateChange
// targeting "well_plate_96.all_wells" must change EVERY well's material overlay,
// not a single non-rendered pseudo-node. Drives mtt_solubilization_readout
// through the same visible affordances a student uses (scene-object clicks plus
// the real set-point editor for adjust gestures), then reads a sample of well
// fills by data-subpart-name before and after the group write.
//
// Contract compliance (docs/PRIMARY_CONTRACT.md item 4, docs/E2E_TESTS.md):
//   - loads dist/<PROTOCOL>.html?walker=expose normally;
//   - clicks visible [data-item-id] scene objects and drives the visible
//     [data-adjust-input] / [data-adjust-commit] set-point editor;
//   - reads the emitter snapshot + gameState only to KNOW the expected path
//     (activeGesture / activeAdjustValue), never to write state or force scenes;
//   - screenshots the plate before and after the all_wells write.
//
// Run: node tests/playwright/test_all_wells_group_write_walkthrough.mjs

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

const PROTOCOL = "mtt_solubilization_readout";
const PLATE = "well_plate_96";
// The step whose response writes well_plate_96.all_wells (formazan_dmso_solution).
const GROUP_WRITE_STEP = "add_dmso_to_wells";
// A sample of wells spanning the plate corners; every one must change together.
const SAMPLE_WELLS = ["A1", "A12", "D6", "H1", "H12"];
const SHOT_DIR = path.join(REPO_ROOT, "test-results", "all_wells_group_write");
const TOTAL_TIMEOUT_MS = 20000;

//============================================
// Free port + server helpers
//============================================

async function pick_free_port() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function start_server(port, dist_dir) {
  const child = spawn(
    "python3",
    ["-m", "http.server", String(port), "--directory", dist_dir, "--bind", "127.0.0.1"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const sock = net.createConnection({ host: "127.0.0.1", port }, () => {
        sock.end();
        resolve(true);
      });
      sock.on("error", () => resolve(false));
    });
    if (ready) return child;
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`http.server did not come up on port ${port}`);
}

//============================================
// Page-side reads
//============================================

// Read the fill + material of one well shape by data-subpart-name. Pure DOM read.
function read_well_fill_page(args) {
  const { plate, subpart } = args;
  const root = document.querySelector("#scene-root");
  if (root === null) return { present: false, fill: null, material: null };
  const overlay = root.querySelector(`[data-subpart-overlay='${plate}']`);
  if (overlay === null) return { present: false, fill: null, material: null };
  const shape = overlay.querySelector(`[data-subpart-name='${subpart}']`);
  if (shape === null) return { present: false, fill: null, material: null };
  return {
    present: true,
    fill: shape.getAttribute("fill"),
    material: shape.getAttribute("data-material-name"),
  };
}

async function read_sample_wells(page) {
  const out = {};
  for (const well of SAMPLE_WELLS) {
    out[well] = await page.evaluate(read_well_fill_page, { plate: PLATE, subpart: well });
  }
  return out;
}

//============================================
// Main
//============================================

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const dist_dir = path.join(REPO_ROOT, "dist");
  if (!fs.existsSync(path.join(dist_dir, `${PROTOCOL}.html`))) {
    throw new Error(`dist/${PROTOCOL}.html missing; run \`bash build_github_pages.sh\``);
  }

  const port = await pick_free_port();
  const server = await start_server(port, dist_dir);
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    await page.goto(`${base}/${PROTOCOL}.html?walker=expose`, { waitUntil: "networkidle" });
    await page.waitForSelector("#scene-root", { state: "attached", timeout: 5000 });
    await page.waitForFunction(
      () => typeof window.__shellEmitter === "object" && window.__shellEmitter !== null,
      null,
      { timeout: 5000 },
    );
    await page.evaluate(() => {
      window.__walkerEvents = [];
      window.__shellEmitter.subscribe((ev) => {
        window.__walkerEvents.push(JSON.parse(JSON.stringify(ev)));
      });
    });
    await page.waitForTimeout(200);

    let before_wells = null;
    let after_wells = null;
    let last_step = null;
    // Candidates already tried for the CURRENT (step, interaction) so a re-query
    // after an in-step scene change does not loop on the same failing target.
    let tried = new Set();
    let last_signature = null;
    const start_time = Date.now();

    while (Date.now() - start_time < TOTAL_TIMEOUT_MS) {
      const snapshot = await page.evaluate(() => window.__shellEmitter.get_snapshot());
      if (snapshot.is_complete) break;
      const gs = await page.evaluate(() => window.gameState ?? null);
      if (gs === null || gs.activeGesture === null) {
        await page.waitForTimeout(80);
        continue;
      }

      // On entering the group-write step, capture the plate BEFORE the write.
      if (snapshot.current_step_name !== last_step) {
        last_step = snapshot.current_step_name;
        if (snapshot.current_step_name === GROUP_WRITE_STEP) {
          before_wells = await read_sample_wells(page);
          await page.screenshot({ path: path.join(SHOT_DIR, "before_all_wells.png") });
        }
      }

      // Reset the tried set whenever the active interaction advances.
      const signature = `${snapshot.current_step_name}#${snapshot.current_interaction_index}`;
      if (signature !== last_signature) {
        last_signature = signature;
        tried = new Set();
      }

      const events_before = await page.evaluate(() => window.__walkerEvents.length);
      const gesture = gs.activeGesture;

      if (gesture === "adjust") {
        // Drive the real visible set-point editor: fill + commit the expected value.
        await page.fill("[data-adjust-input]", String(gs.activeAdjustValue));
        await page.click("[data-adjust-commit]");
        await page.waitForTimeout(80);
        continue;
      }
      if (gesture === "type") {
        await page.fill("[data-type-input]", String(gs.activeTypeValue));
        await page.click("[data-type-commit]");
        await page.waitForTimeout(80);
        continue;
      }

      // click / select: re-query the CURRENT scene's targets each iteration
      // (an in-step SceneChange swaps the DOM), and click the first untried one.
      const candidates = await page.$$eval("#scene-root [data-item-id]", (els) =>
        els.map((el) => el.getAttribute("data-item-id")).filter((s) => s !== null),
      );
      const candidate = candidates.find((c) => !tried.has(c));
      if (candidate === undefined) {
        await page.screenshot({ path: path.join(SHOT_DIR, "stalled.png") });
        throw new Error(
          `Stalled on step "${snapshot.current_step_name}" gesture "${gesture}"; ` +
            `no visible click advanced it. snapshot=${JSON.stringify(snapshot)}`,
        );
      }
      tried.add(candidate);
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.click();
      }, `#scene-root [data-item-id="${candidate}"]`);
      await page.waitForTimeout(50);
      const new_events = await page.evaluate((n) => window.__walkerEvents.slice(n), events_before);
      const completed_step = new_events.find(
        (e) => e.kind === "step_completed" && e.resolution === "complete",
      );
      // When the group-write step completes, capture the plate AFTER the write.
      if (completed_step && snapshot.current_step_name === GROUP_WRITE_STEP) {
        await page.waitForTimeout(120);
        after_wells = await read_sample_wells(page);
        await page.screenshot({ path: path.join(SHOT_DIR, "after_all_wells.png") });
      }
    }

    const final_snapshot = await page.evaluate(() => window.__shellEmitter.get_snapshot());
    await page.screenshot({ path: path.join(SHOT_DIR, "final.png") });
    fs.writeFileSync(
      path.join(SHOT_DIR, "wells.json"),
      JSON.stringify({ before_wells, after_wells }, null, 2),
    );

    if (errors.length > 0) {
      throw new Error(`Page errors: ${errors.join(" | ")}`);
    }
    if (before_wells === null || after_wells === null) {
      throw new Error(
        `Did not capture before/after for the all_wells write. ` +
          `is_complete=${final_snapshot.is_complete}. See ${SHOT_DIR}.`,
      );
    }
    // Assert the visible fan-out: every sampled well was empty (no material)
    // before and shows the group material after.
    for (const well of SAMPLE_WELLS) {
      const b = before_wells[well];
      const a = after_wells[well];
      if (!b.present || !a.present) {
        throw new Error(`well ${well} overlay shape missing (before/after present check)`);
      }
      if (a.material !== "formazan_dmso_solution") {
        throw new Error(
          `well ${well} did not receive the group material: before=${JSON.stringify(b)} ` +
            `after=${JSON.stringify(a)}`,
        );
      }
      if (a.fill === b.fill) {
        throw new Error(
          `well ${well} fill did not visibly change: before.fill=${b.fill} after.fill=${a.fill}`,
        );
      }
    }
    if (!final_snapshot.is_complete) {
      throw new Error(
        `Protocol did not complete through the visible UI within ${TOTAL_TIMEOUT_MS}ms. ` +
          `final=${JSON.stringify(final_snapshot)}`,
      );
    }

    console.log(`OK: all_wells group write fanned out to ${SAMPLE_WELLS.length} sampled wells.`);
    console.log(`  before: ${JSON.stringify(before_wells)}`);
    console.log(`  after:  ${JSON.stringify(after_wells)}`);
    console.log(`  screenshots: ${SHOT_DIR}/before_all_wells.png, after_all_wells.png`);
    console.log("PASS: test_all_wells_group_write_walkthrough");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
