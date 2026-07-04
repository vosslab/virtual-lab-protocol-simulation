// tests/playwright/test_per_well_drug_walkthrough.spec.ts
//
// M4 WP-WALK browser evidence (PRIMARY_CONTRACT.md item 4, D11 spatial
// correspondence). Drives the per-well drug protocol
// plate_drug_treatment_drug_addition through the VISIBLE UI only, then would
// assert by data-subpart-name that the wells the active step targets (row B,
// B1..B12) turn the expected registered carboplatin color at their real grid
// positions, while untargeted wells stay transparent.
//
// Converted from the library-model tests/playwright/test_per_well_drug_walkthrough.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set).
//
// Visible-UI contract (PRIMARY_SPEC.md "Walker requirement"):
//   - loads dist/<PROTOCOL>.html?walker=expose normally;
//   - advances ONLY by clicking visible [data-item-id] scene objects in
//     #scene-root, by committing the visible TypeInput affordance for a
//     `type` gesture, or by committing the visible set-point editor for an
//     `adjust` gesture -- the visible advance paths the runtime wires;
//   - reads window.gameState for VERIFICATION ONLY (which target/gesture is
//     active, whether the step completed). It never writes game state, never
//     calls an internal advance API, and never branches on a step_name or
//     protocol_name.
//
// HONEST STATE (re-verified live against the current build, not the historic
// blocker the source .mjs recorded): the `adjust` gesture on the micropipette
// now HAS a wired visible affordance ([data-adjust-input] /
// [data-adjust-commit], src/shell/hud/set_point_editor.tsx) and this spec
// drives through it successfully. The walk instead stalls one interaction
// later, on interaction index 2, target "rear_center_carb_stocks.tube_A"
// (gesture click): no element in #scene-root resolves to
// [data-item-id="rear_center_carb_stocks.tube_A"] as a literal id -- the
// target names a subpart of the tube rack (dotted rack.tube form), and the
// click gesture's selector family only resolves whole-object
// [data-item-id="<placement_name>"] targets. This matches the recorded
// project decision (docs/active_plans, "plate_drug_treatment_drug_addition
// ... fails walker on tube-rack subpart clicks; pedagogy-HELD, do not
// auto-rewrite without a pedagogy call"): a real, currently-open interaction
// gap, not a conversion artifact of this spec. This spec expresses that gap
// honestly by failing with a clear diagnosis rather than faking a pass; see
// docs/active_plans/decisions/ for the HELD status and route any fix through
// the scene-manager/architect pedagogy call.

import { test, expect, type Page } from "@playwright/test";
import { PROTOCOL_MATERIALS } from "../../generated/protocol_materials.js";
import type { ProtocolShellEmitter } from "../../src/shell/adapter/types.js";
import type { WalkerGameState } from "../../src/scene_runtime/protocol/walker_debug.js";

// Redeclares the same __shellEmitter augmentation src/protocol_host.tsx
// carries, so the typed seam is visible under tsconfig.lint.json's narrower
// `tests/**` program (which does not transitively include that file).
// Declaration merging with the real augmentation is safe: identical optional
// member, identical imported type. __firstStepCompleted is local to this spec.
declare global {
  interface Window {
    __shellEmitter?: ProtocolShellEmitter;
    __firstStepCompleted?: boolean;
  }
}

const PROTOCOL = "plate_drug_treatment_drug_addition";
const PLATE = "well_plate_96";
const TRANSPARENT = "transparent";
const ARTIFACT_DIR = "test-results/per_well_drug_walkthrough";
const TOTAL_TIMEOUT_MS = 20000;

// The wells the FIRST step targets (row B, cols 1..12), read from the
// protocol. Listed here as the EXPECTED spatial-correspondence set for the
// assertion only; the walker itself does not click these by name -- it
// clicks whatever the read-only gameState.activeTarget names.
const ROW_B = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"];
// A few control wells the first step does NOT touch (must stay transparent).
const UNTARGETED_CONTROLS = ["A1", "C1", "H12", "D6"];

//============================================
// Registered material color (typed import, no text-parsing)
//============================================

// The registered scalar display_color for carboplatin, read live from the
// generated per-protocol registry so a content color change flows through
// automatically. The first step (add_carb_row_b) writes carboplatin to wells
// B1..B12; the D11 assertion expects this fill.
function requiredMaterialColor(protocolName: string, materialName: string): string {
  const registry = PROTOCOL_MATERIALS[protocolName];
  if (registry === undefined) {
    throw new Error(`Protocol ${protocolName} not found in generated/protocol_materials.ts`);
  }
  const entry = registry[materialName];
  if (entry === undefined) {
    throw new Error(`Material ${materialName} not found under ${protocolName}`);
  }
  return entry.display_color;
}

const CARBOPLATIN_COLOR = requiredMaterialColor(PROTOCOL, "carboplatin");

//============================================
// Page-side read helper (verification-only DOM read, no mutation)
//============================================

interface WellFill {
  present: boolean;
  fill: string | null;
  material: string | null;
}

async function readWellFill(page: Page, plate: string, subpart: string): Promise<WellFill> {
  return page.evaluate(
    ({ plate: plateArg, subpart: subpartArg }): WellFill => {
      const root = document.getElementById("scene-root");
      if (root === null) {
        return { present: false, fill: null, material: null };
      }
      const overlay = root.querySelector(`[data-subpart-overlay='${plateArg}']`);
      if (overlay === null) {
        return { present: false, fill: null, material: null };
      }
      const shape = overlay.querySelector(`[data-subpart-name='${subpartArg}']`);
      if (shape === null) {
        return { present: false, fill: null, material: null };
      }
      return {
        present: true,
        fill: shape.getAttribute("fill"),
        material: shape.getAttribute("data-material-name"),
      };
    },
    { plate, subpart },
  );
}

//============================================
// Visible-UI gesture drivers
//============================================

// Click the visible scene object whose data-item-id equals target. Dispatched
// via page.evaluate so SVG-injected children (which can fail Playwright
// actionability checks) still receive the click; the same event a student's
// mouse produces.
async function clickSceneObject(page: Page, target: string): Promise<boolean> {
  const sel = `#scene-root [data-item-id="${target}"]`;
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el === null) {
      return false;
    }
    (el as HTMLElement).click();
    return true;
  }, sel);
}

// Drive a visible `type` gesture: fill the visible TypeInput and commit it.
async function commitTypeInput(page: Page, typedText: string): Promise<boolean> {
  const input = page.locator("[data-type-input]");
  if ((await input.count()) === 0) {
    return false;
  }
  await input.first().fill(typedText);
  await page.locator("[data-type-commit]").first().click();
  return true;
}

// Drive a visible `adjust` gesture: fill the visible set-point editor and
// commit it.
async function commitAdjustInput(page: Page, numericValue: string): Promise<boolean> {
  const input = page.locator("[data-adjust-input]");
  if ((await input.count()) === 0) {
    return false;
  }
  await input.first().fill(numericValue);
  const commit = page.locator("[data-adjust-commit]");
  if ((await commit.count()) === 0) {
    return false;
  }
  await commit.first().click();
  return true;
}

//============================================
// Test
//============================================

test("per-well drug walkthrough: row B paints carboplatin at its real grid positions", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(`/${PROTOCOL}.html?walker=expose`, { waitUntil: "networkidle" });
  await page.waitForSelector("#scene-root", { state: "attached", timeout: 5000 });
  await page.waitForFunction(
    () => typeof window.gameState === "object" && window.gameState !== null,
    undefined,
    { timeout: 5000 },
  );

  await page.screenshot({ path: `${ARTIFACT_DIR}/00_before.png` });

  //----------------------------------------
  // Generic visible-UI drive loop: read the read-only gameState to learn the
  // active target + gesture, then perform that gesture through the matching
  // VISIBLE affordance. Stops on completion of the first per-well step (the
  // D11 evidence point), on protocol completion, on a visible-UI affordance
  // gap (honest blocker), or on timeout.
  //----------------------------------------

  const firstStepName = await page.evaluate(() => window.gameState?.activeStepId ?? null);
  await page.evaluate((stepName) => {
    window.__firstStepCompleted = false;
    const emitter = window.__shellEmitter;
    if (emitter === undefined) {
      throw new Error("window.__shellEmitter missing at subscribe time");
    }
    emitter.subscribe((ev) => {
      if (
        ev.kind === "step_completed" &&
        ev.resolution === "complete" &&
        ev.step_name === stepName
      ) {
        window.__firstStepCompleted = true;
      }
    });
  }, firstStepName);

  const clickLog: Array<{ index: number; target: string; gesture: string }> = [];
  let blocker: {
    stepName: string | null;
    interactionIndex: number;
    target: string;
    gesture: string;
    detail?: string;
  } | null = null;

  const startTime = Date.now();
  let lastTarget: string | null = null;
  let lastIndex = -1;
  let stallCount = 0;

  while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
    const gs: WalkerGameState = await page.evaluate(() => {
      const state = window.gameState;
      if (state === undefined) {
        throw new Error("window.gameState missing mid-walk");
      }
      return state;
    });
    const firstDone = await page.evaluate(() => window.__firstStepCompleted === true);
    if (firstDone || gs.isComplete) {
      break;
    }

    const target = gs.activeTarget;
    const gesture = gs.activeGesture;
    const index = gs.interactionIndex;

    if (target === null || gesture === null) {
      await page.waitForTimeout(80);
      continue;
    }

    if (target === lastTarget && index === lastIndex) {
      stallCount += 1;
    } else {
      stallCount = 0;
      lastTarget = target;
      lastIndex = index;
    }

    let drove: boolean;
    if (gesture === "click" || gesture === "select") {
      drove = await clickSceneObject(page, target);
      if (drove) {
        clickLog.push({ index, target, gesture: `${gesture}(click)` });
      }
    } else if (gesture === "type") {
      drove = await commitTypeInput(page, gs.activeTypeValue ?? "");
      if (drove) {
        clickLog.push({ index, target, gesture: `type("${gs.activeTypeValue ?? ""}")` });
      }
    } else if (gesture === "adjust") {
      drove = await commitAdjustInput(page, gs.activeAdjustValue ?? "");
      if (drove) {
        clickLog.push({ index, target, gesture: `adjust("${gs.activeAdjustValue ?? ""}")` });
      }
    } else {
      // "drag" has no driver wired in this spec today.
      blocker = { stepName: gs.activeStepId, interactionIndex: index, target, gesture };
      break;
    }

    if (!drove) {
      blocker = {
        stepName: gs.activeStepId,
        interactionIndex: index,
        target,
        gesture,
        detail: "no visible affordance element found for the active target/gesture",
      };
      break;
    }

    // Give the runtime a moment to react synchronously.
    await page.waitForTimeout(70);

    if (stallCount >= 8) {
      blocker = {
        stepName: gs.activeStepId,
        interactionIndex: index,
        target,
        gesture,
        detail: "visible gesture attempts did not advance the runtime (stalled)",
      };
      break;
    }
  }

  await page.screenshot({ path: `${ARTIFACT_DIR}/01_after.png` });

  //----------------------------------------
  // Honest blocker path: report the exact gap rather than faking a pass.
  //----------------------------------------
  if (blocker !== null) {
    await page.screenshot({ path: `${ARTIFACT_DIR}/blocker.png` });
    const recent = await page.evaluate(() => {
      const gs = window.gameState;
      if (gs === undefined) {
        return null;
      }
      return {
        activeStepId: gs.activeStepId,
        interactionIndex: gs.interactionIndex,
        activeTarget: gs.activeTarget,
        activeGesture: gs.activeGesture,
        activeScene: gs.activeScene,
      };
    });
    const detail = blocker.detail !== undefined ? ` detail=${blocker.detail}` : "";
    throw new Error(
      `HONEST BLOCKER: ${PROTOCOL} step "${blocker.stepName}" interaction ` +
        `${blocker.interactionIndex} requires gesture "${blocker.gesture}" on target ` +
        `"${blocker.target}", which has no visible UI affordance today.${detail} ` +
        `This is the recorded pedagogy-HELD tube-rack subpart click gap, not a conversion ` +
        `bug; not faking a pass. gameState_snapshot=${JSON.stringify(recent)} ` +
        `clicks_driven=${JSON.stringify(clickLog)}`,
    );
  }

  //----------------------------------------
  // Success path: the first per-well step completed through visible UI. Run
  // the D11 spatial-correspondence assertion.
  //----------------------------------------
  const failures: string[] = [];
  for (const well of ROW_B) {
    const r = await readWellFill(page, PLATE, well);
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
  for (const well of UNTARGETED_CONTROLS) {
    const r = await readWellFill(page, PLATE, well);
    if (!r.present) {
      failures.push(`${well}: overlay shape missing`);
      continue;
    }
    if (r.fill !== TRANSPARENT) {
      failures.push(`${well} (untargeted) must be transparent, got ${r.fill}`);
    }
  }

  expect(failures, `D11 spatial-correspondence assertion: ${failures.join("; ")}`).toEqual([]);
  expect(pageErrors, "no uncaught page errors during the walk").toEqual([]);
});
