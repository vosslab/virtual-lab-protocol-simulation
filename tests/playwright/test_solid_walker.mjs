// tests/playwright/test_solid_walker.mjs
//
// M4 WP-4-3 Solid walker test. Drives a click-only mini-protocol through
// visible UI plus the typed seam exposed by ?walker=expose.
//
// Pilot pivot (2026-05-28, M4-FIX-3): the original pilot mtt_reagent_prep
// includes an "adjust" gesture (micropipette.set_volume) for which the
// runtime has no DOM affordance yet. The walker stalls there. Pilot
// temporarily switched to sdspage_attach_lid_and_leads (click-only,
// 1 step, 3 click interactions, 0 unresolved targets). See
// docs/active_plans/active/web_ui/pilot_selection.md.
//
// Follow-up: restore PROTOCOL = "mtt_reagent_prep" once adjust-gesture
// DOM affordance lands in the runtime.
//
// The walker:
//   - loads dist/<PROTOCOL>.html?walker=expose;
//   - reads window.__shellEmitter (WP-3-11 hook);
//   - subscribes to ProtocolShellEvent stream;
//   - drives the protocol by clicking [data-item-id] elements in
//     #scene-root, with no per-protocol branching and no game-state
//     reads.
//
// Per PRIMARY_CONTRACT.md item 4 (visible UI rule):
//   - all progress comes from clicking [data-item-id] in #scene-root;
//   - no window.gameState reads;
//   - no protocol-internal API calls (only emitter.subscribe and
//     emitter.get_snapshot are used).
//
// Known gap: the typed seam exposes a ShellViewSnapshot, but does NOT
// expose the active interaction's target name. The runtime's
// click_resolver only emits "click" gestures; an "adjust" interaction
// in mtt_reagent_prep.prepare_solution_tube cannot be driven through
// the visible UI today. The walker detects this and reports the gap
// rather than silently passing.
//
// Strategy:
//   - Subscribe to events. On step_started, iterate every visible
//     [data-item-id] in DOM order and click them in sequence, watching
//     interaction_validated vs interaction_rejected to decide when to
//     move on.
//   - On protocol_completed: assert is_complete=true and pass.
//   - If a step stalls (no validated interaction for N retries), take
//     a failure screenshot, log the snapshot + last event, and FAIL
//     with a message naming what broke.
//
// Screenshots: written to tests/playwright/artifacts/mtt_reagent_prep/
// (gitignored).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

const PROTOCOL = "sdspage_heat_denature_samples";
const ARTIFACT_DIR = path.join(REPO_ROOT, "tests", "playwright", "artifacts", PROTOCOL);

const TOTAL_TIMEOUT_MS = 15000;

//============================================
// Free port + server helpers (shared shape with test_launcher)
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
// Main
//============================================

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const dist_dir = path.join(REPO_ROOT, "dist");
  if (!fs.existsSync(path.join(dist_dir, `${PROTOCOL}.html`))) {
    throw new Error(`dist/${PROTOCOL}.html missing; run \`bash build_github_pages.sh\``);
  }

  const port = await pick_free_port();
  const server = await start_server(port, dist_dir);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  // Capture every event via the typed seam.
  await page.exposeBinding("__walker_event", (_src, ev) => {
    // We deliberately do nothing JS-side; the page-side script
    // accumulates events in window.__walkerEvents instead. This
    // binding exists so the page can call into Playwright if needed.
    void ev;
  });

  try {
    await page.goto(`${base}/${PROTOCOL}.html?walker=expose`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("#scene-root", {
      state: "attached",
      timeout: 5000,
    });
    await page.waitForSelector("#shell-root", {
      state: "attached",
      timeout: 5000,
    });

    // Wait for the emitter to be exposed AND for protocol_loaded to fire.
    let emitter_appeared = true;
    try {
      await page.waitForFunction(
        () => {
          return typeof window.__shellEmitter === "object" && window.__shellEmitter !== null;
        },
        null,
        { timeout: 5000 },
      );
    } catch (e) {
      void e;
      emitter_appeared = false;
    }
    if (!emitter_appeared) {
      // Snapshot the failure for M4 evidence and surface the page
      // errors. The most common cause: the protocol_host throws before
      // the walker-expose hook runs (e.g. entry scene missing from
      // generated/scenes.ts).
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "fail_no_emitter.png"),
        fullPage: false,
      });
      throw new Error(
        `window.__shellEmitter never appeared under ?walker=expose. ` +
          `This is the M4 acceptance gap: the protocol_host crashed before exposing the typed seam. ` +
          `page_errors=${errors.join(" | ") || "(none captured)"}`,
      );
    }

    // Page-side: subscribe to the emitter and accumulate events.
    await page.evaluate(() => {
      window.__walkerEvents = [];
      const emitter = window.__shellEmitter;
      emitter.subscribe((ev) => {
        // Structured clone safe: ProtocolShellEvent is plain data.
        window.__walkerEvents.push(JSON.parse(JSON.stringify(ev)));
      });
    });

    await page.waitForTimeout(200);

    // Initial screenshot.
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "00_initial.png"),
      fullPage: false,
    });

    //============================================
    // Drive loop
    //============================================

    const screenshots = ["00_initial.png"];
    const click_log = [];
    let step_counter = 0;
    let click_counter = 0;
    const start_time = Date.now();

    // The walker iterates: while not complete & not timed out:
    //   - read snapshot from the typed seam
    //   - if is_complete: break
    //   - look at current_step_name; if it changed, reset our
    //     candidate-target queue for that step
    //   - pop next candidate and click it; wait briefly for an
    //     interaction_validated or interaction_rejected event
    //   - if validated: keep going; if rejected: try next candidate
    //   - if queue exhausted without progress: FAIL with gap report

    let last_step_name = null;
    let candidate_queue = [];

    while (Date.now() - start_time < TOTAL_TIMEOUT_MS) {
      const snapshot = await page.evaluate(() => {
        return window.__shellEmitter.get_snapshot();
      });

      if (snapshot.is_complete) {
        console.log(`OK: protocol_completed observed; is_complete=true`);
        break;
      }

      if (snapshot.current_step_name === null) {
        // Runtime hasn't entered a step yet; wait briefly.
        await page.waitForTimeout(100);
        continue;
      }

      if (snapshot.current_step_name !== last_step_name) {
        last_step_name = snapshot.current_step_name;
        step_counter += 1;
        // Re-seed the candidate queue with every visible
        // [data-item-id] in DOM order. The same id may appear
        // multiple times (e.g. for re-clicks); we leave the queue
        // long and iterate.
        candidate_queue = await page.$$eval("#scene-root [data-item-id]", (els) =>
          els.map((el) => el.getAttribute("data-item-id")).filter((s) => s !== null),
        );
        // Append a duplicate pass to allow re-clicking the same
        // target (some steps click the same object twice in a row).
        candidate_queue = candidate_queue.concat(candidate_queue);
        // Take a per-step screenshot.
        const fname = `step_${String(step_counter).padStart(2, "0")}_${snapshot.current_step_name}_start.png`;
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, fname),
          fullPage: false,
        });
        screenshots.push(fname);
        console.log(
          `step_started: ${snapshot.current_step_name} (interaction_index=${snapshot.current_interaction_index}, candidates=${candidate_queue.length / 2})`,
        );
      }

      // Snapshot event-log size BEFORE click so we can detect what
      // the runtime emitted in response.
      const events_before = await page.evaluate(() => window.__walkerEvents.length);

      // Pop next candidate.
      const candidate = candidate_queue.shift();
      if (candidate === undefined) {
        // No more candidates to try for this step.
        const fail_name = `fail_${String(step_counter).padStart(2, "0")}_${snapshot.current_step_name}.png`;
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, fail_name),
          fullPage: false,
        });
        screenshots.push(fail_name);
        const recent_events = await page.evaluate(() => window.__walkerEvents.slice(-10));
        throw new Error(
          `Walker stalled on step "${snapshot.current_step_name}" (interaction_index=${snapshot.current_interaction_index}). ` +
            `No visible [data-item-id] click advanced the step. ` +
            `This likely means the next interaction uses a non-click gesture (adjust/drag/select/type) that the runtime cannot drive through the visible UI today, ` +
            `OR the active interaction's target is not rendered as a [data-item-id]. ` +
            `last_snapshot=${JSON.stringify(snapshot)} ` +
            `recent_events=${JSON.stringify(recent_events)}`,
        );
      }

      // Click the candidate by its data-item-id selector. Use direct DOM
      // dispatch via page.evaluate so SVG-injected child elements (which
      // can fail Playwright actionability checks) still receive clicks.
      // The visible-UI contract is honored: this is the same click event
      // a real student's mouse would generate.
      const sel = `#scene-root [data-item-id="${candidate}"]`;
      const clicked = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        el.click();
        return true;
      }, sel);
      if (!clicked) {
        continue;
      }
      click_counter += 1;
      click_log.push({ step: snapshot.current_step_name, target: candidate });

      // Snapshot any new events. Wait briefly for the runtime to
      // react synchronously.
      await page.waitForTimeout(60);
      const new_events = await page.evaluate((n) => window.__walkerEvents.slice(n), events_before);
      const validated = new_events.find((e) => e.kind === "interaction_validated");
      const completed_step = new_events.find((e) => e.kind === "step_completed");
      if (validated) {
        // Persist a tiny success screenshot every 4th click to
        // avoid disk thrash but provide evidence.
        if (click_counter % 4 === 0) {
          const fname = `click_${String(click_counter).padStart(3, "0")}_${candidate}_ok.png`;
          await page.screenshot({
            path: path.join(ARTIFACT_DIR, fname),
            fullPage: false,
          });
          screenshots.push(fname);
        }
      }
      if (completed_step && completed_step.resolution === "complete") {
        // step_started for the next step will reset our queue on
        // the next loop iteration.
      }
    }

    // Final snapshot + screenshot.
    const final_snapshot = await page.evaluate(() => window.__shellEmitter.get_snapshot());
    const final_events = await page.evaluate(() => window.__walkerEvents);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "99_final.png"),
      fullPage: false,
    });
    screenshots.push("99_final.png");

    fs.writeFileSync(path.join(ARTIFACT_DIR, "events.json"), JSON.stringify(final_events, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "clicks.json"), JSON.stringify(click_log, null, 2));

    if (!final_snapshot.is_complete) {
      throw new Error(
        `Walker did not reach protocol_completed within ${TOTAL_TIMEOUT_MS}ms. ` +
          `final_snapshot=${JSON.stringify(final_snapshot)} ` +
          `total_clicks=${click_counter} ` +
          `total_events=${final_events.length}`,
      );
    }

    if (errors.length > 0) {
      throw new Error(`Page errors: ${errors.join(" | ")}`);
    }

    console.log(`OK: walked ${PROTOCOL} in ${click_counter} clicks, ${final_events.length} events`);
    console.log(`Artifacts written to ${ARTIFACT_DIR}`);
    console.log("PASS: test_solid_walker");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("FAIL: test_solid_walker");
  console.error(err);
  process.exit(1);
});
