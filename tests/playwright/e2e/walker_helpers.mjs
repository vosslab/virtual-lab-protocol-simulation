// tests/playwright/e2e/walker_helpers.mjs
//
// Reusable Playwright helpers for the schema-driven protocol walker that drives
// the NEW Solid protocol host (src/protocol_host.tsx). They read the FROZEN
// read-only walker surfaces only:
//
//   window.PROTOCOL_STEPS  - the step list (id / label / scene / nextId).
//   window.gameState       - the read-only progress projection, including the
//                            active interaction's target/gesture and the
//                            progress signals the progress predicate watches.
//
// Hard real-click integrity rules enforced here (see WALKTHROUGH_GUIDE.md):
//   - Every advance comes from a real visible click via Playwright's
//     actionability-checked locator.click(). No force-click, no dispatchEvent
//     on hidden nodes.
//   - The read-only surfaces are NEVER written. Nothing here calls an internal
//     runtime/protocol API, mutates the emitter, or forces a scene change.
//   - clickTargetAndWaitProgress snapshots observable progress signals BEFORE
//     the click, clicks the visible element, then WAITS for one of those signals
//     to change as a consequence of the real handler. The wait predicate reads
//     state but never sets it. If nothing changes within budget it throws
//     click_did_not_advance.
//   - A target is verified to EXIST and be VISIBLE before the click; a missing
//     or hidden target fails loudly.
//
// The new host mounts exactly one scene at a time into #scene-root and tags it
// with data-active-scene. Scene switches happen through the same gesture model
// (a validated click whose response carries a SceneChange scene_operation), not
// by writing activeScene. So scene scoping is simply the single #scene-root.

//============================================
// Read-only state snapshots
//============================================

// The progress signals a real click may change. Snapshot-compared, never set.
export async function readProgressSnapshot(page) {
  return await page.evaluate(() => {
    const s = window.gameState;
    return {
      activeStepId: s.activeStepId,
      interactionIndex: s.interactionIndex,
      activeScene: s.activeScene,
      completedStepsCount: (s.completedSteps || []).length,
      selectedTool: s.selectedTool,
      heldLiquid: JSON.stringify(s.heldLiquid),
      wrongOrderClicks: s.wrongOrderClicks,
      isComplete: s.isComplete,
    };
  });
}

// Read the full read-only gameState projection.
export async function readGameState(page) {
  return await page.evaluate(() => {
    const s = window.gameState;
    return {
      activeStepId: s.activeStepId,
      interactionIndex: s.interactionIndex,
      activeScene: s.activeScene,
      completedSteps: (s.completedSteps || []).slice(),
      selectedTool: s.selectedTool,
      heldLiquid: s.heldLiquid,
      wrongOrderClicks: s.wrongOrderClicks,
      stepsOutOfOrder: s.stepsOutOfOrder,
      isComplete: s.isComplete,
      activeTarget: s.activeTarget,
      activeGesture: s.activeGesture,
      activeTypeValue: s.activeTypeValue,
    };
  });
}

// Wait for the read-only walker surfaces to appear (after load and after reload).
export async function waitForExports(page, timeoutMs = 8000) {
  await page.waitForFunction(
    () => {
      return (
        typeof window.gameState !== "undefined" &&
        typeof window.PROTOCOL_STEPS !== "undefined" &&
        Array.isArray(window.PROTOCOL_STEPS) &&
        window.PROTOCOL_STEPS.length > 0
      );
    },
    { timeout: timeoutMs },
  );
}

//============================================
// Selectors (scene-scoped to the single mounted scene)
//============================================

// The new host mounts one scene at a time into #scene-root. Scoping to
// #scene-root avoids picking up a shell/outline element that might share an id.
export function resolveSelector(itemId) {
  return `#scene-root [data-item-id="${itemId}"]`;
}

//============================================
// Real-click + wait-for-progress
//============================================

// Verify a target exists and is visible, then click it and wait for an
// observable progress signal to change as a consequence of the real handler.
//
// progressKind:
//   "advance"  - expect one of the forward progress signals to change
//                (interactionIndex, activeStepId, activeScene, completedSteps,
//                 selectedTool, heldLiquid). Throws click_did_not_advance if
//                nothing changes within budget.
//   "reject"   - (wrong-order injection) expect wrongOrderClicks to increment
//                and the step position to stay unchanged. Throws if the click is
//                silently accepted as progress.
export async function clickTargetAndWaitProgress(
  page,
  itemId,
  report,
  { clickBudgetMs = 3000, progressKind = "advance", screenshotOpts = null } = {},
) {
  const selector = resolveSelector(itemId);
  const locator = page.locator(selector).first();

  // Rule b: verify EXISTS and VISIBLE before clicking. Fail loud otherwise.
  const count = await locator.count();
  if (count === 0) {
    throw new Error(`Element ${selector} does not exist in DOM`);
  }
  const visible = await locator.isVisible();
  if (!visible) {
    throw new Error(`Element ${selector} is not visible`);
  }

  // Rule d: snapshot observable progress signals BEFORE the click.
  const before = await readProgressSnapshot(page);

  // Rule a: real, actionability-checked click on the visible element.
  await locator.click();
  report.summary.totalClicks++;
  report.info(`Clicked ${itemId}`);

  if (progressKind === "reject") {
    // Expect wrongOrderClicks to increment; step/index must NOT advance.
    await page
      .waitForFunction((b) => window.gameState.wrongOrderClicks > b.wrongOrderClicks, before, {
        timeout: 1500,
      })
      .catch(() => {
        /* timeout handled by post-state read below */
      });
    const after = await readProgressSnapshot(page);
    if (after.wrongOrderClicks <= before.wrongOrderClicks) {
      throw new Error(
        `wrong_order_not_rejected: click on ${itemId} did not increment wrongOrderClicks ` +
          `(before ${before.wrongOrderClicks}, after ${after.wrongOrderClicks})`,
      );
    }
    if (
      after.interactionIndex !== before.interactionIndex ||
      after.activeStepId !== before.activeStepId
    ) {
      throw new Error(
        `wrong_order_advanced_step: click on ${itemId} advanced the step ` +
          `(idx ${before.interactionIndex}->${after.interactionIndex}, ` +
          `step ${before.activeStepId}->${after.activeStepId})`,
      );
    }
    report.info(`Wrong-order click on ${itemId} rejected (no advance)`);
  } else {
    // Rule d: wait for a forward progress signal. The predicate READS state.
    try {
      await page.waitForFunction(
        (b) => {
          const s = window.gameState;
          if (s.interactionIndex !== b.interactionIndex) return true;
          if (s.activeStepId !== b.activeStepId) return true;
          if (s.activeScene !== b.activeScene) return true;
          if ((s.completedSteps || []).length > b.completedStepsCount) return true;
          if (s.selectedTool !== b.selectedTool) return true;
          if (JSON.stringify(s.heldLiquid) !== b.heldLiquid) return true;
          if (s.isComplete !== b.isComplete) return true;
          return false;
        },
        before,
        { timeout: clickBudgetMs },
      );
    } catch {
      throw new Error(
        `click_did_not_advance: click on ${itemId} produced no state change after ${clickBudgetMs}ms`,
      );
    }
    report.info(`Click on ${itemId} progressed`);
  }

  // Optional per-click screenshot.
  if (screenshotOpts && screenshotOpts.mode === "per-click") {
    const { resultsDir, stepName, interactionIndex, clickIndex, gesture, target } = screenshotOpts;
    const screenshotName = `click_${stepName}_i${interactionIndex}_c${clickIndex}_${itemId}.png`;
    const screenshotPath = `${resultsDir}/${screenshotName}`;
    await page.screenshot({ path: screenshotPath });
    report.addEntry("info", `Screenshot: ${screenshotName}`, {
      screenshot: screenshotPath,
      step_name: stepName,
      interaction_index: interactionIndex,
      click_index: clickIndex,
      gesture: gesture || "click",
      target: target || itemId,
      item_id: itemId,
    });
  }
}

//============================================
// Real type-fill + commit (for the `type` gesture)
//============================================

// Drive a `type` interaction through the VISIBLE type-input affordance
// (src/shell/hud/type_input.tsx): verify the input + commit button exist and
// are visible, fill the input with a real Playwright fill() (actionability-
// checked), then click the visible Commit button and wait for an observable
// forward progress signal. No internal state write, no force interaction.
//
// typedText: the raw string the student would type.
export async function typeCommitAndWaitProgress(
  page,
  typedText,
  report,
  { clickBudgetMs = 3000 } = {},
) {
  const inputLocator = page.locator("[data-type-input]").first();
  const commitLocator = page.locator("[data-type-commit]").first();

  // Rule b: verify EXISTS and VISIBLE before interacting. Fail loud otherwise.
  if ((await inputLocator.count()) === 0) {
    throw new Error("type_input_missing: [data-type-input] affordance not in DOM for type gesture");
  }
  if (!(await inputLocator.isVisible())) {
    throw new Error("type_input_hidden: [data-type-input] affordance is not visible");
  }
  if ((await commitLocator.count()) === 0 || !(await commitLocator.isVisible())) {
    throw new Error("type_commit_missing: [data-type-commit] button not visible for type gesture");
  }

  // Rule d: snapshot observable progress signals BEFORE the commit.
  const before = await readProgressSnapshot(page);

  // Real, actionability-checked fill + commit.
  await inputLocator.fill(typedText);
  await commitLocator.click();
  report.summary.totalClicks++;
  report.info(`Typed "${typedText}" and committed`);

  try {
    await page.waitForFunction(
      (b) => {
        const s = window.gameState;
        if (s.interactionIndex !== b.interactionIndex) return true;
        if (s.activeStepId !== b.activeStepId) return true;
        if (s.activeScene !== b.activeScene) return true;
        if ((s.completedSteps || []).length > b.completedStepsCount) return true;
        if (s.isComplete !== b.isComplete) return true;
        return false;
      },
      before,
      { timeout: clickBudgetMs },
    );
  } catch {
    throw new Error(
      `type_did_not_advance: committing "${typedText}" produced no state change after ${clickBudgetMs}ms`,
    );
  }
  report.info(`Type commit "${typedText}" progressed`);
}

//============================================
// Wrong-order item picker
//============================================

// Pick a visible scene item that is NOT the required target. Used by
// --wrong-order mode to inject a real visible click on a non-required object.
export async function pickWrongOrderItem(page, requiredItemId) {
  return await page.evaluate((required) => {
    const items = document.querySelectorAll("#scene-root [data-item-id]");
    for (const elem of items) {
      const itemId = elem.getAttribute("data-item-id");
      if (itemId === required) continue;
      const style = window.getComputedStyle(elem);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = elem.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      return itemId;
    }
    return null;
  }, requiredItemId);
}

//============================================
// Report logging helpers
//============================================

export function recordInfo(report, message) {
  report.info(message);
}

export function recordWarn(report, message) {
  report.warn(message);
}

export function recordError(report, stepId, kind, evidence) {
  report.error(`[${kind}] ${evidence}`, { stepId });
}

export function recordInjection(report, stepId, itemId) {
  report.addEntry("injection", `[injection] step ${stepId}: clicked wrong-order item ${itemId}`, {
    stepId,
    injectedItemId: itemId,
  });
}
