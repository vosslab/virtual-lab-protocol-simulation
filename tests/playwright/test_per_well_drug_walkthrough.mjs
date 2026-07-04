// tests/playwright/test_per_well_drug_walkthrough.mjs
//
// M4 WP-WALK browser evidence (PRIMARY_CONTRACT.md item 4, D11 spatial
// correspondence). Drives the per-well drug protocol
// plate_drug_treatment_drug_addition through the VISIBLE UI only, then asserts
// by data-subpart-name that the wells the active step targets (row B, B1..B12)
// turn the expected registered carboplatin color (#a719db) at their real grid
// positions, while untargeted wells stay transparent.
//
// Visible-UI contract (PRIMARY_SPEC.md "Walker requirement"):
//   - loads dist/<PROTOCOL>.html?walker=expose normally (welcome -> runtime);
//   - advances ONLY by clicking visible [data-item-id] scene objects in
//     #scene-root, or by committing the visible TypeInput affordance for a
//     `type` gesture (the only two visible advance paths the runtime wires);
//   - reads window.gameState / window.__shellEmitter for VERIFICATION ONLY
//     (which target/gesture is active, whether the step completed). It NEVER
//     writes game state, never calls an internal advance API, never mutates
//     window.prompt/confirm, and never branches on a step_name or protocol_name.
//
// The walker is generic: it asks the read-only gameState which target the
// runtime currently expects (activeTarget) and what gesture it is
// (activeGesture), then performs that gesture through the matching visible
// affordance. No per-step or per-protocol branch decides what to click.
//
// HARD HONESTY RULE (the dispatch brief): if a required interaction has NO
// visible affordance (an unwired gesture), the walker STOPS and reports the
// exact gap -- the step, the interaction index, the target, and the gesture
// -- with a failure screenshot. It does not fake progress.
//
// Run: node tests/playwright/test_per_well_drug_walkthrough.mjs

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

const PROTOCOL = "plate_drug_treatment_drug_addition";
const PLATE = "well_plate_96";
// The registered scalar display_color for carboplatin, read live from
// generated/protocol_materials.ts (plate_drug_treatment_drug_addition registry) so a
// content color change flows through automatically. The first step (add_carb_row_b)
// writes carboplatin to wells B1..B12; the D11 assertion expects this fill.
const CARBOPLATIN_COLOR = read_material_display_color(PROTOCOL, "carboplatin");
const TRANSPARENT = "transparent";

//============================================
// Read a material's display_color straight out of generated/protocol_materials.ts
//============================================

// Text-parses the generated PROTOCOL_MATERIALS literal (same approach as
// test_launcher.mjs's load_expected_index for generated/protocols.ts) rather than
// importing the .ts module, since this script runs under plain node.
function read_material_display_color(protocol_name, material_name) {
  const file = path.join(REPO_ROOT, "generated/protocol_materials.ts");
  const src = fs.readFileSync(file, "utf8");
  // Find the registry block for this protocol: `protocol_name: { ... },` on its own line.
  const protocolRe = new RegExp(`\\b${protocol_name}:\\s*\\{`);
  const protocolMatch = protocolRe.exec(src);
  if (!protocolMatch) {
    throw new Error(`Protocol ${protocol_name} not found in generated/protocol_materials.ts`);
  }
  // Registry entries are emitted one protocol per line, so the line end closes the block.
  const lineEnd = src.indexOf("\n", protocolMatch.index);
  const blob = src.slice(protocolMatch.index, lineEnd);
  // Match the exact material key (word boundary so "carboplatin" does not match
  // "carboplatin_200umol"), then pull its display_color.
  const materialRe = new RegExp(`\\b${material_name}:\\s*\\{[^}]*display_color:\\s*"([^"]+)"`);
  const materialMatch = materialRe.exec(blob);
  if (!materialMatch) {
    throw new Error(
      `Material ${material_name} not found under ${protocol_name} in generated/protocol_materials.ts`,
    );
  }
  return materialMatch[1];
}

// The wells the FIRST step targets (row B, cols 1..12), read from the protocol.
// Listed here as the EXPECTED spatial-correspondence set for the assertion only;
// the walker itself does not click these by name -- it clicks whatever the
// read-only gameState.activeTarget names.
const ROW_B = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"];
// A few control wells the first step does NOT touch (must stay transparent).
const UNTARGETED_CONTROLS = ["A1", "C1", "H12", "D6"];

const SHOT_DIR = path.join(REPO_ROOT, "test-results", "per_well_drug_walkthrough");
const TOTAL_TIMEOUT_MS = 20000;

//============================================
// Free port + static server (shared shape with test_solid_walker.mjs)
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
// Page-side read helpers (serialized into the browser).
//============================================

// Read the fill + material of one subpart shape by data-subpart-name. Returns
// {present, fill, material}. Verification-only DOM read (no mutation).
function read_well_fill_page(args) {
  const plate = args[0];
  const subpart = args[1];
  const root = document.getElementById("scene-root");
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

//============================================
// Visible-UI gesture drivers
//============================================

// Click the visible scene object whose data-item-id equals target. Uses a real
// DOM click() dispatched on the element (the same event a student's mouse
// produces); SVG-injected children can fail Playwright actionability checks, so
// the click is dispatched on the matched node directly. Returns true if an
// element was found and clicked.
async function click_scene_object(page, target) {
  const sel = `#scene-root [data-item-id="${target}"]`;
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el === null) return false;
    el.click();
    return true;
  }, sel);
}

// Drive a visible `type` gesture: fill the visible TypeInput and commit it. The
// TypeInput overlay shows only while the active interaction's gesture is `type`.
// Returns true if the visible input was found and committed.
async function commit_type_input(page, typed_text) {
  // The TypeInput affordance lives under #type-input-root. Find its text input
  // and commit button by visible role rather than internal ids.
  const input = page.locator("#type-input-root input");
  const has_input = (await input.count()) > 0;
  if (!has_input) return false;
  await input.first().fill(typed_text);
  // Commit: a visible button, or Enter on the field.
  const button = page.locator("#type-input-root button");
  if ((await button.count()) > 0) {
    await button.first().click();
  } else {
    await input.first().press("Enter");
  }
  return true;
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

  const page_errors = [];
  page.on("pageerror", (err) => page_errors.push(err.message));

  const click_log = [];
  let blocker = null;

  try {
    await page.goto(`${base}/${PROTOCOL}.html?walker=expose`, { waitUntil: "networkidle" });
    await page.waitForSelector("#scene-root", { state: "attached", timeout: 5000 });

    // Wait for the read-only walker surface + emitter to come up.
    await page.waitForFunction(
      () =>
        typeof window.gameState === "object" &&
        window.gameState !== null &&
        typeof window.__shellEmitter === "object" &&
        window.__shellEmitter !== null,
      null,
      { timeout: 5000 },
    );

    // Initial (before) screenshot: the entry scene before any interaction.
    await page.screenshot({ path: path.join(SHOT_DIR, "00_before.png") });

    //----------------------------------------
    // Generic visible-UI drive loop.
    //
    // Each iteration: read the read-only gameState to learn the active target +
    // gesture, then perform that gesture through the matching VISIBLE affordance.
    // The loop stops on completion of the first per-well step (the D11 evidence
    // point), on protocol completion, on a visible-UI affordance gap (honest
    // blocker), or on timeout.
    //----------------------------------------

    const start_time = Date.now();
    let last_target = null;
    let last_index = -1;
    let stall_count = 0;

    // We only need to drive through the FIRST step (add_carb_row_b: write
    // carboplatin to B1..B12) to produce the D11 spatial-correspondence
    // evidence. Detect that step's completion via the emitter event stream.
    await page.evaluate(() => {
      window.__firstStepCompleted = false;
      window.__firstStepName = window.gameState ? window.gameState.activeStepId : null;
      const emitter = window.__shellEmitter;
      emitter.subscribe((ev) => {
        if (
          ev.kind === "step_completed" &&
          ev.resolution === "complete" &&
          ev.step_name === window.__firstStepName
        ) {
          window.__firstStepCompleted = true;
        }
      });
    });

    while (Date.now() - start_time < TOTAL_TIMEOUT_MS) {
      const gs = await page.evaluate(() => window.gameState);
      const first_done = await page.evaluate(() => window.__firstStepCompleted === true);
      if (first_done || gs.isComplete) {
        break;
      }
      const target = gs.activeTarget;
      const gesture = gs.activeGesture;
      const index = gs.interactionIndex;

      if (target === null || gesture === null) {
        await page.waitForTimeout(80);
        continue;
      }

      // Detect a stall: same target+index across several iterations means the
      // gesture we attempted did not advance the runtime.
      if (target === last_target && index === last_index) {
        stall_count += 1;
      } else {
        stall_count = 0;
        last_target = target;
        last_index = index;
      }

      // Dispatch by gesture through the matching VISIBLE affordance only.
      let drove = false;
      if (gesture === "click" || gesture === "select") {
        // Both click and select are driven by clicking the visible scene object
        // (the runtime promotes a click on the active select-target to select).
        drove = await click_scene_object(page, target);
        if (drove) click_log.push({ index, target, gesture: `${gesture}(click)` });
      } else if (gesture === "type") {
        const typed = gs.activeTypeValue ?? "";
        drove = await commit_type_input(page, typed);
        if (drove) click_log.push({ index, target, gesture: `type("${typed}")` });
      } else {
        // gesture is "adjust" or "drag": the runtime wires NO visible affordance
        // for these (no HUD control, no scene gesture, no step-machine entry
        // point). This is the honest blocker: the protocol cannot be completed
        // through the visible UI today.
        blocker = {
          step_name: gs.activeStepId,
          interaction_index: index,
          target,
          gesture,
        };
        break;
      }

      // If a click/type found no visible element, that too is a gap.
      if (!drove) {
        blocker = {
          step_name: gs.activeStepId,
          interaction_index: index,
          target,
          gesture,
          detail: "no visible affordance element found for the active target/gesture",
        };
        break;
      }

      // Give the runtime a moment to react synchronously.
      await page.waitForTimeout(70);

      if (stall_count >= 8) {
        // The same interaction has not advanced after repeated visible attempts.
        blocker = {
          step_name: gs.activeStepId,
          interaction_index: index,
          target,
          gesture,
          detail: "visible gesture attempts did not advance the runtime (stalled)",
        };
        break;
      }
    }

    // After-step screenshot, regardless of outcome (evidence of the state the
    // visible UI actually reached).
    await page.screenshot({ path: path.join(SHOT_DIR, "01_after.png") });

    //----------------------------------------
    // Honest blocker path.
    //----------------------------------------
    if (blocker !== null) {
      await page.screenshot({ path: path.join(SHOT_DIR, "blocker.png") });
      const recent = await page.evaluate(() => {
        const gs = window.gameState;
        return {
          activeStepId: gs.activeStepId,
          interactionIndex: gs.interactionIndex,
          activeTarget: gs.activeTarget,
          activeGesture: gs.activeGesture,
          activeScene: gs.activeScene,
        };
      });
      console.log("BLOCKER: per-well drug protocol cannot be completed through the visible UI.");
      console.log(`  protocol:           ${PROTOCOL}`);
      console.log(`  blocked step:       ${blocker.step_name}`);
      console.log(`  interaction index:  ${blocker.interaction_index}`);
      console.log(`  required target:    ${blocker.target}`);
      console.log(`  required gesture:   ${blocker.gesture}`);
      if (blocker.detail) console.log(`  detail:             ${blocker.detail}`);
      console.log(`  gameState snapshot: ${JSON.stringify(recent)}`);
      console.log(`  clicks driven:      ${JSON.stringify(click_log)}`);
      console.log(`  screenshots:        ${SHOT_DIR}/00_before.png, 01_after.png, blocker.png`);
      console.log(
        "  reason: the runtime wires visible affordances for click, select, and type only; " +
          "the `adjust` gesture (micropipette.set_volume) has no visible affordance and no " +
          "step-machine entry point. A student cannot set the pipette volume, so the protocol " +
          "stalls at the second interaction of the first step.",
      );
      throw new Error(
        `HONEST BLOCKER: ${PROTOCOL} step "${blocker.step_name}" interaction ` +
          `${blocker.interaction_index} requires gesture "${blocker.gesture}" on target ` +
          `"${blocker.target}", which has no visible UI affordance. Not faking a pass.`,
      );
    }

    //----------------------------------------
    // SUCCESS path: the first per-well step completed through visible UI.
    // Run the D11 spatial-correspondence assertion.
    //----------------------------------------
    await page.waitForTimeout(80);

    const failures = [];
    // Targeted wells (row B) must paint carboplatin's registered color.
    for (const well of ROW_B) {
      const r = await page.evaluate(read_well_fill_page, [PLATE, well]);
      if (!r.present) {
        failures.push(`${well}: overlay shape missing`);
        continue;
      }
      if (r.fill !== CARBOPLATIN_COLOR) {
        failures.push(`${well}: expected fill ${CARBOPLATIN_COLOR}, got ${r.fill}`);
      }
      if (r.material !== "carboplatin") {
        failures.push(`${well}: expected data-material-name carboplatin, got ${r.material}`);
      }
    }
    // Untargeted controls must remain transparent.
    for (const well of UNTARGETED_CONTROLS) {
      const r = await page.evaluate(read_well_fill_page, [PLATE, well]);
      if (!r.present) {
        failures.push(`${well}: overlay shape missing`);
        continue;
      }
      if (r.fill !== TRANSPARENT) {
        failures.push(`${well} (untargeted) must be transparent, got ${r.fill}`);
      }
    }

    if (failures.length > 0) {
      console.log("D11 spatial-correspondence assertion FAILED:");
      failures.forEach((f) => console.log(`  - ${f}`));
      throw new Error(`D11 assertion failed: ${failures.join("; ")}`);
    }

    if (page_errors.length > 0) {
      throw new Error(`Page errors: ${page_errors.join(" | ")}`);
    }

    console.log("PASS: per-well drug walkthrough (visible UI).");
    console.log(`  protocol:        ${PROTOCOL}`);
    console.log(`  clicks driven:   ${click_log.length}`);
    console.log(`  D11: row B (B1..B12) painted ${CARBOPLATIN_COLOR}; controls transparent.`);
    console.log(`  screenshots:     ${SHOT_DIR}/00_before.png, 01_after.png`);
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("FAIL: test_per_well_drug_walkthrough");
  console.error(err.message);
  process.exit(1);
});
