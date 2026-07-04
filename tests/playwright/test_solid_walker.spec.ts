// tests/playwright/test_solid_walker.spec.ts
//
// M4 WP-4-3 Solid walker test. Drives a click-only mini-protocol through
// visible UI plus the typed seam exposed by ?walker=expose.
//
// Converted from the library-model tests/playwright/test_solid_walker.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set).
//
// Pilot pivot (2026-05-28, M4-FIX-3): the original pilot mtt_reagent_prep
// includes an "adjust" gesture (micropipette.set_volume) for which the
// runtime had no DOM affordance at the time. The walker stalled there. Pilot
// switched to sdspage_heat_denature_samples (click-only). This spec keeps
// that same pilot target; restoring mtt_reagent_prep is a separate follow-up
// once its full click path is re-verified end to end.
//
// Per PRIMARY_CONTRACT.md item 4 (visible UI rule):
//   - all progress comes from clicking [data-item-id] in #scene-root;
//   - no window.gameState reads (this spec reads only window.__shellEmitter,
//     the typed shell seam);
//   - no protocol-internal API calls (only emitter.subscribe and
//     emitter.get_snapshot are used).
//
// Strategy: subscribe to the typed event stream. On each step, iterate every
// visible [data-item-id] in DOM order and click them in sequence, watching
// interaction_validated events to decide when to move on. On
// protocol_completed (is_complete true from get_snapshot): assert and pass.
// If a step stalls (no validated interaction across the full candidate
// queue), fail with a message naming what broke -- this is the honest signal
// for an unwired gesture or an unrendered target, not a conversion bug to
// paper over.

import { test, expect } from "@playwright/test";
import type { ProtocolShellEmitter, ProtocolShellEvent } from "../../src/shell/adapter/types.js";

const PROTOCOL = "sdspage_heat_denature_samples";
const ARTIFACT_DIR = `test-results/solid_walker/${PROTOCOL}`;
const TOTAL_TIMEOUT_MS = 15000;

// Redeclares the same augmentation src/protocol_host.tsx carries, so the
// typed seam is visible under tsconfig.lint.json's narrower `tests/**`
// program (which does not transitively include that file). Declaration
// merging with the real augmentation is safe: identical optional member,
// identical imported type.
declare global {
  interface Window {
    __shellEmitter?: ProtocolShellEmitter;
    __walkerEvents?: ProtocolShellEvent[];
  }
}

test("solid walker: sdspage_heat_denature_samples completes through visible clicks", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(`/${PROTOCOL}.html?walker=expose`, { waitUntil: "networkidle" });
  await page.waitForSelector("#scene-root", { state: "attached", timeout: 5000 });
  await page.waitForSelector("#shell-root", { state: "attached", timeout: 5000 });

  // Wait for the typed seam to be exposed. A missing emitter is the M4
  // acceptance gap itself (the protocol_host crashed before exposing it), so
  // report the captured page errors alongside the timeout.
  await page
    .waitForFunction(
      () => typeof window.__shellEmitter === "object" && window.__shellEmitter !== null,
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {
      throw new Error(
        `window.__shellEmitter never appeared under ?walker=expose. ` +
          `page_errors=${pageErrors.join(" | ") || "(none captured)"}`,
      );
    });

  // Subscribe page-side and accumulate events for later diagnosis.
  await page.evaluate(() => {
    window.__walkerEvents = [];
    const emitter = window.__shellEmitter;
    if (emitter === undefined) {
      throw new Error("window.__shellEmitter missing at subscribe time");
    }
    emitter.subscribe((ev) => {
      window.__walkerEvents?.push(JSON.parse(JSON.stringify(ev)) as ProtocolShellEvent);
    });
  });

  await page.screenshot({ path: `${ARTIFACT_DIR}/00_initial.png` });

  //============================================
  // Drive loop
  //============================================

  let stepCounter = 0;
  let clickCounter = 0;
  const startTime = Date.now();
  let lastStepName: string | null = null;
  let candidateQueue: string[] = [];

  while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
    const snapshot = await page.evaluate(() => {
      const emitter = window.__shellEmitter;
      if (emitter === undefined) {
        throw new Error("window.__shellEmitter missing mid-walk");
      }
      return emitter.get_snapshot();
    });

    if (snapshot.is_complete) {
      break;
    }

    if (snapshot.current_step_name === null) {
      // Runtime has not entered a step yet; wait briefly for it to.
      await page
        .waitForFunction(
          () => window.__shellEmitter?.get_snapshot().current_step_name !== null,
          undefined,
          { timeout: 500 },
        )
        .catch(() => {
          /* re-check on the next loop iteration */
        });
      continue;
    }

    if (snapshot.current_step_name !== lastStepName) {
      lastStepName = snapshot.current_step_name;
      stepCounter += 1;
      // Re-seed the candidate queue with every visible [data-item-id] in DOM
      // order, doubled so a step that re-clicks the same target still finds
      // it in the queue.
      const ids = await page
        .locator("#scene-root [data-item-id]")
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-item-id")).filter((s): s is string => s !== null),
        );
      candidateQueue = ids.concat(ids);
      const fname = `step_${String(stepCounter).padStart(2, "0")}_${snapshot.current_step_name}_start.png`;
      await page.screenshot({ path: `${ARTIFACT_DIR}/${fname}` });
    }

    const eventsBefore = await page.evaluate(() => window.__walkerEvents?.length ?? 0);

    const candidate = candidateQueue.shift();
    if (candidate === undefined) {
      const failName = `fail_${String(stepCounter).padStart(2, "0")}_${snapshot.current_step_name}.png`;
      await page.screenshot({ path: `${ARTIFACT_DIR}/${failName}` });
      const recentEvents = await page.evaluate(() => window.__walkerEvents?.slice(-10) ?? []);
      throw new Error(
        `Walker stalled on step "${snapshot.current_step_name}" ` +
          `(interaction_index=${snapshot.current_interaction_index}). ` +
          `No visible [data-item-id] click advanced the step. This likely means the next ` +
          `interaction uses a non-click gesture the runtime cannot drive through the visible ` +
          `UI today, OR the active interaction's target is not rendered as a [data-item-id]. ` +
          `last_snapshot=${JSON.stringify(snapshot)} recent_events=${JSON.stringify(recentEvents)}`,
      );
    }

    // Click the candidate by its data-item-id selector. Dispatch via
    // page.evaluate so SVG-injected child elements (which can fail
    // Playwright actionability checks) still receive clicks; this is the
    // same click event a real student's mouse produces.
    const sel = `#scene-root [data-item-id="${candidate}"]`;
    const clicked = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el === null) {
        return false;
      }
      (el as HTMLElement).click();
      return true;
    }, sel);
    if (!clicked) {
      continue;
    }
    clickCounter += 1;

    // Wait for the runtime to react: poll for a new event rather than a
    // fixed sleep, bounded short since a rejected click never advances.
    await page
      .waitForFunction((n) => (window.__walkerEvents?.length ?? 0) > n, eventsBefore, {
        timeout: 500,
      })
      .catch(() => {
        /* no new event; the candidate loop will try the next target */
      });

    const newEvents = await page.evaluate(
      (n) => window.__walkerEvents?.slice(n) ?? [],
      eventsBefore,
    );
    const validated = newEvents.find((e) => e.kind === "interaction_validated");
    if (validated && clickCounter % 4 === 0) {
      await page.screenshot({
        path: `${ARTIFACT_DIR}/click_${String(clickCounter).padStart(3, "0")}_${candidate}_ok.png`,
      });
    }
  }

  const finalSnapshot = await page.evaluate(() => {
    const emitter = window.__shellEmitter;
    if (emitter === undefined) {
      throw new Error("window.__shellEmitter missing at final read");
    }
    return emitter.get_snapshot();
  });
  const finalEvents = await page.evaluate(() => window.__walkerEvents ?? []);
  await page.screenshot({ path: `${ARTIFACT_DIR}/99_final.png` });

  expect(
    finalSnapshot.is_complete,
    `walker did not reach protocol_completed within ${TOTAL_TIMEOUT_MS}ms. ` +
      `final_snapshot=${JSON.stringify(finalSnapshot)} total_clicks=${clickCounter} ` +
      `total_events=${finalEvents.length}`,
  ).toBe(true);
  expect(pageErrors, "no uncaught page errors during the walk").toEqual([]);
});
