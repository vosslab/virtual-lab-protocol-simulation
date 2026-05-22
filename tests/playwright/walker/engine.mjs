/**
 * Walker engine for the scene runtime.
 *
 * Loads a protocol via the runtime contract, drives the UI through visible DOM
 * selectors only, controls the test clock for TimedWait, and fails loudly on
 * missing affordances. No per-protocol branches; pure schema-driven dispatch
 * on gesture and validator preset.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

/**
 * Options for the walker engine.
 *
 * @typedef {Object} WalkerOptions
 * @property {string} protocolName - Name of the protocol to walk
 * @property {string} [baseUrl] - Base URL for the protocol HTML (default: file:// to dist/ HTML)
 * @property {boolean} [headless] - Run headless browser (default: true)
 * @property {string} [screenshotDir] - Output directory for screenshots (default: test-results/<protocolName>/)
 * @property {number} [testClockSpeed] - Clock speed multiplier (default: 1.0)
 * @property {'quiet'|'info'|'debug'} [verbosity] - Logging level (default: info)
 */

/**
 * Result of a walker run.
 *
 * @typedef {Object} WalkerResult
 * @property {string} protocolName - Protocol that was walked
 * @property {number} stepsWalked - Number of steps successfully completed
 * @property {number} stepsTotal - Total number of steps in the protocol
 * @property {number} interactionsWalked - Total interactions executed
 * @property {number} screenshotsTaken - Number of screenshots captured
 * @property {boolean} success - Whether the walk succeeded
 * @property {string} [failedStepName] - Name of the step that failed (if success = false)
 * @property {string} [errorMessage] - Error message (if success = false)
 */

//============================================
// Walker implementation
//============================================

/**
 * Advance the test clock by the given seconds.
 * Used to handle TimedWait operations instantly during testing.
 */
async function __advanceTestClock(page, seconds) {
  return page.evaluate((secs) => {
    const globalThis_ = globalThis;
    if (globalThis_.__RUNTIME_TEST_CLOCK) {
      return globalThis_.__RUNTIME_TEST_CLOCK.advance(secs);
    }
    throw new Error(
      "Test clock not initialized; TimedWait not available in this build",
    );
  }, seconds);
}

/**
 * Log a message if verbosity permits.
 */
function log(msg, verbosity, level = "info") {
  const levels = { quiet: 0, info: 1, debug: 2 };
  if (levels[verbosity] >= levels[level]) {
    console.log(`[${level.toUpperCase()}] ${msg}`);
  }
}

/**
 * Ensure the screenshot directory exists.
 */
function ensureScreenshotDir(screenshotDir) {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
}

/**
 * Capture a screenshot before an interaction.
 */
async function captureBeforeScreenshot(
  page,
  screenshotDir,
  stepName,
  interactionIdx,
) {
  const filename = `${stepName}_${interactionIdx.toString().padStart(2, "0")}_before.png`;
  const filepath = path.join(screenshotDir, filename);
  try {
    await page.screenshot({ path: filepath });
  } catch (err) {
    console.warn(`Failed to capture before screenshot: ${err.message}`);
  }
}

/**
 * Capture a screenshot after an interaction.
 */
async function captureAfterScreenshot(
  page,
  screenshotDir,
  stepName,
  interactionIdx,
) {
  const filename = `${stepName}_${interactionIdx.toString().padStart(2, "0")}_after.png`;
  const filepath = path.join(screenshotDir, filename);
  try {
    await page.screenshot({ path: filepath });
  } catch (err) {
    console.warn(`Failed to capture after screenshot: ${err.message}`);
  }
}

/**
 * Locate a DOM element for a target using data-target-id selector.
 * For group targets (e.g., well_plate_96.all_wells), resolves to the first member cell.
 * The gesture is dispatched via the appropriate Playwright action (click, fill, etc.);
 * the DOM dispatch handler reads data-gesture from event context and defaults to 'click'.
 * Throws loud error if not found or not visible.
 */
async function locateTarget(page, target, _gesture) {
  let resolvedTarget = target;

  // Check if this is a group target by looking at the runtime world's object structure.
  const runtimeData = await page.evaluate(() => {
    const w = globalThis;
    return w.__RUNTIME_PROTOCOL_CONFIG;
  });

  if (runtimeData && runtimeData.world && runtimeData.world.objects) {
    const targetParts = target.split(".");
    if (targetParts.length === 2) {
      const [objectName, targetId] = targetParts;
      const obj = runtimeData.world.objects[objectName];

      if (obj && obj.structure && obj.structure.subpart_groups) {
        // Search for a group with this name.
        for (const groupCategory of Object.values(
          obj.structure.subpart_groups,
        )) {
          if (groupCategory.members) {
            for (const member of groupCategory.members) {
              if (
                member.name === targetId &&
                member.contains &&
                member.contains.length > 0
              ) {
                // This is a group; resolve to its first member.
                const firstMember = member.contains[0];
                resolvedTarget = `${objectName}.${firstMember}`;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Selector only uses data-target-id; dispatch infers gesture from the interaction's gesture field.
  const selector = `[data-target-id="${resolvedTarget}"]`;
  const locator = page.locator(selector).first();

  const exists = (await locator.count()) > 0;
  if (!exists) {
    throw new Error(
      `Missing DOM affordance: target="${target}" (resolved to "${resolvedTarget}") ` +
        `selector="${selector}" not found in DOM`,
    );
  }

  const isVisible = await locator
    .isVisible({ timeout: 100 })
    .catch(() => false);
  if (!isVisible) {
    throw new Error(
      `Target not visible: target="${target}" (resolved to "${resolvedTarget}") ` +
        `exists in DOM but not visibly clickable`,
    );
  }

  return locator;
}

/**
 * Dispatch a click gesture.
 */
async function dispatchClick(page, target, gesture) {
  const locator = await locateTarget(page, target, gesture);
  await locator.click();
  // Wait for any animations to settle
  await page.waitForTimeout(300);
}

/**
 * Dispatch an adjust gesture (e.g., slider, number input).
 *
 * Extracts the expected value from the interaction's validator (target_with_value preset).
 * Waits for the adjust panel input to appear, fills it with the expected value,
 * dispatches input/change events, and waits for the commit to complete.
 */
async function dispatchAdjust(page, interaction) {
  const { target, validator } = interaction;

  // Extract field name from target_with_value validator.
  // The validator shape is { preset: 'target_with_value', value: { <field>: <expectedValue> } }.
  let fieldName = null;
  let expectedValue = null;

  if (validator?.preset === "target_with_value" && validator.value) {
    const keys = Object.keys(validator.value);
    if (keys.length === 1) {
      fieldName = keys[0];
      expectedValue = validator.value[fieldName];
    }
  }

  if (!fieldName || expectedValue === null || expectedValue === undefined) {
    throw new Error(
      `adjust interaction on target "${target}" has no valid field name ` +
        `in validator.value. Validator: ${JSON.stringify(validator)}`,
    );
  }

  const inputSelector = `[data-testid="adjust-input-${fieldName}"]`;

  // Step 1: Wait for the adjust panel input to be present in the DOM.
  // The panel renders after the preceding interaction (usually a click) completes.
  await page.waitForSelector(inputSelector, { timeout: 4000 });

  // Step 2: Wait a brief moment for the element to be fully ready
  await page.waitForTimeout(200);

  // Step 3: Fill the input using JavaScript directly (more reliable than Playwright fill)
  await page.evaluate(({ selector, value }) => {
    const input = document.querySelector(selector);
    if (!input) {
      throw new Error(`Input not found: ${selector}`);
    }
    input.value = String(value);
  }, { selector: inputSelector, value: expectedValue });

  // Step 4: Dispatch input and change events to trigger the adjust dispatch handler
  await page.evaluate(({ selector, value }) => {
    const input = document.querySelector(selector);
    if (input) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, { selector: inputSelector, value: expectedValue });

  // Step 5: Optionally press Enter to commit (handlers may bind to Enter key)
  const inputLocator = page.locator(inputSelector);
  await inputLocator.press("Enter", { timeout: 2000 }).catch(() => {
    // Enter press might not be strictly necessary, events above should trigger commit
  });

  // Step 6: Wait for the commit to process and the interaction to advance
  // The adjust dispatch handler will update game state and trigger next interaction
  await page.waitForTimeout(500);
}

/**
 * Dispatch a select gesture (choosing from options).
 */
async function dispatchSelect(page, target, gesture) {
  const locator = await locateTarget(page, target, gesture);
  await locator.click();
  await page.waitForTimeout(300);
}

/**
 * Dispatch a type gesture (text input).
 */
async function dispatchType(page, target, gesture, text) {
  const locator = await locateTarget(page, target, gesture);
  await locator.fill(text);
  await page.waitForTimeout(300);
}

/**
 * Dispatch a drag gesture.
 */
async function dispatchDrag(page, target, gesture) {
  const locator = await locateTarget(page, target, gesture);
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Drag target ${target} has no bounding box`);
  }

  // Simple drag: move from center to 50px right and 50px down
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + 50;
  const endY = startY + 50;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY);
  await page.mouse.up();

  await page.waitForTimeout(300);
}

/**
 * Execute one interaction in a step's sequence.
 */
async function executeInteraction(
  page,
  interaction,
  stepName,
  interactionIdx,
  screenshotDir,
) {
  const { target, gesture } = interaction;

  if (!target) {
    throw new Error(`Interaction in step ${stepName} has no target`);
  }
  if (!gesture) {
    throw new Error(`Interaction in step ${stepName} has no gesture`);
  }

  // Capture before screenshot
  await captureBeforeScreenshot(page, screenshotDir, stepName, interactionIdx);

  // Dispatch gesture
  switch (gesture) {
    case "click":
      await dispatchClick(page, target, gesture);
      break;
    case "adjust":
      // Pass the full interaction object so dispatchAdjust can extract the validator.
      await dispatchAdjust(page, interaction);
      break;
    case "select":
      await dispatchSelect(page, target, gesture);
      break;
    case "type":
      // Type gesture requires text from the interaction or validator
      await dispatchType(page, target, gesture, "");
      break;
    case "drag":
      await dispatchDrag(page, target, gesture);
      break;
    default:
      throw new Error(
        `Unknown gesture "${gesture}" on target "${target}" ` +
          `in step ${stepName}`,
      );
  }

  // Capture after screenshot
  await captureAfterScreenshot(page, screenshotDir, stepName, interactionIdx);
}

/**
 * Execute one step: walk all interactions in sequence, verify completion.
 */
async function executeStep(
  page,
  step,
  stepIndex,
  protocol,
  screenshotDir,
  verbosity,
) {
  const { step_name, prompt, sequence, __next_step } = step;

  log(
    `Step ${stepIndex + 1}/${protocol.steps.length}: ${step_name}`,
    verbosity,
  );
  log(`  Prompt: ${prompt}`, verbosity, "debug");

  // Verify prompt panel shows the correct prompt
  const promptElement = page.locator('[data-testid="prompt-panel-text"]');
  const promptVisible = await promptElement
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  if (promptVisible) {
    const promptText = await promptElement.textContent();
    if (promptText !== prompt) {
      throw new Error(
        `Prompt mismatch in step ${step_name}: ` +
          `expected "${prompt}", got "${promptText}"`,
      );
    }
    log(`  Prompt verified`, verbosity, "debug");
  }

  // Execute each interaction in the sequence
  if (!sequence || sequence.length === 0) {
    throw new Error(`Step ${step_name} has no interactions in sequence`);
  }

  let interactionsWalked = 0;
  for (let i = 0; i < sequence.length; i++) {
    const interaction = sequence[i];
    log(
      `  Interaction ${i + 1}/${sequence.length}: ${interaction.gesture} on ${interaction.target}`,
      verbosity,
      "debug",
    );

    try {
      await executeInteraction(
        page,
        interaction,
        step_name,
        i + 1,
        screenshotDir,
      );
      interactionsWalked++;
    } catch (err) {
      throw new Error(
        `Failed executing interaction ${i + 1} in step ${step_name}: ${err.message}`,
      );
    }
  }

  // Check for step completion (the next button should be visible)
  const nextButton = page.locator('[data-testid="next-button"]');
  const nextVisible = await nextButton
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (!nextVisible) {
    // Check runtime state for debugging
    const runtimeState = await page.evaluate(() => {
      const w = globalThis;
      return {
        lastButtonRender: w.__RUNTIME_LAST_BUTTON_RENDER,
        currentInteractionIndex:
          w.__RUNTIME_PROTOCOL_CONFIG?.world?.currentInteractionIndex,
        activeStepIndex: w.__RUNTIME_PROTOCOL_CONFIG?.world?.activeStepIndex,
        stepLength:
          w.__RUNTIME_PROTOCOL_CONFIG?.world?.protocol?.steps?.[
            w.__RUNTIME_PROTOCOL_CONFIG?.world?.activeStepIndex || 0
          ]?.sequence?.length,
        clickLog: (w.__RUNTIME_CLICK_LOG || [])
          .slice(-10)
          .map((c) => `[${c.targetId}@idx${c.currentInteractionIndex}]`),
        checkStepLog: (w.__RUNTIME_CHECK_STEP_LOG || [])
          .slice(-10)
          .map(
            (c) => `[step${c.activeStepIndex}@idx${c.currentInteractionIndex}]`,
          ),
        orchestrateLog: (w.__RUNTIME_ORCHESTRATE_LOG || [])
          .slice(-10)
          .map(
            (o) => `[step${o.activeStepIndex}@idx${o.currentInteractionIndex}]`,
          ),
        orchestrateCallLog: (w.__RUNTIME_ORCHESTRATE_CALL_LOG || [])
          .slice(-20)
          .map((c) => `[step${c.step}@idx${c.idx}]`),
        clickError: w.__RUNTIME_CLICK_ERROR,
        orchestrateDetail: (w.__RUNTIME_ORCHESTRATE_DETAIL_LOG || []).map(
          (d) => `[${d.event}@step${d.activeStepIndex}]`,
        ),
        clickEarlyReturn: w.__RUNTIME_CLICK_EARLY_RETURN,
        adjustLog: (w.__RUNTIME_ADJUST_LOG || []).map(
          (a) => `[step${a.step}@idx${a.idxBefore}]`,
        ),
      };
    });
    throw new Error(
      `Step ${step_name} completed but next button not visible; ` +
        `step validator may not have passed. Runtime state: ${JSON.stringify(runtimeState, null, 2)}`,
    );
  }

  log(`  Step ${step_name} complete, advancing to next`, verbosity);

  // Capture screenshot of step completion with next button visible
  await captureAfterScreenshot(page, screenshotDir, step_name, sequence.length);

  // Click next button to advance to next step
  await nextButton.click();
  await page.waitForTimeout(500);

  return interactionsWalked;
}

/**
 * Load a protocol from the generated protocol data.
 * This is done at build time (in Node) before opening the browser.
 */
function loadProtocolFromGenerated(protocolName) {
  const generatedPath = path.join(
    process.cwd(),
    "generated",
    "protocol_data.ts",
  );
  if (!fs.existsSync(generatedPath)) {
    throw new Error(
      `Generated protocol data not found at ${generatedPath}. ` +
        `Run: source source_me.sh && python3 pipeline/build_protocol_data.py`,
    );
  }

  // Read the TypeScript file
  let tsContent = fs.readFileSync(generatedPath, "utf-8");

  // Note: evaluating the TypeScript generated file is complex due to interfaces,
  // imports, and type annotations. Instead, we rely on the browser runtime to load
  // the protocol config via the PROTOCOL_CATALOG exported by runtime.bundle.js.
  // Return null so the walker loads the full config from the browser.
  return null;
}

/**
 * Main walker engine: load protocol and walk all steps.
 */
export async function runWalker(opts) {
  const {
    protocolName,
    baseUrl,
    headless = true,
    screenshotDir,
    _testClockSpeed = 1.0,
    verbosity = "info",
  } = opts;

  const finalScreenshotDir = screenshotDir || `test-results/${protocolName}/`;
  const finalBaseUrl =
    baseUrl ||
    `file://${path.resolve(process.cwd(), `dist/${protocolName}.html`)}`;

  ensureScreenshotDir(finalScreenshotDir);

  let browser;
  let page;

  try {
    log(`Starting walker for protocol "${protocolName}"`, verbosity);
    log(`  Base URL: ${finalBaseUrl}`, verbosity, "debug");
    log(`  Screenshot dir: ${finalScreenshotDir}`, verbosity, "debug");

    // Load the protocol from generated data before launching the browser
    let protocol;
    try {
      protocol = loadProtocolFromGenerated(protocolName);
      log(
        `Loaded protocol "${protocolName}" with ${protocol.steps?.length || 0} steps from generated data`,
        verbosity,
      );
    } catch (err) {
      log(
        `Could not load protocol from generated data: ${err.message}`,
        verbosity,
      );
      // Continue anyway; the browser might have it
      protocol = null;
    }

    // Launch browser
    browser = await chromium.launch({ headless });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    // Load the protocol HTML
    await page.goto(finalBaseUrl);
    await page.waitForTimeout(1000);

    // If we don't have the protocol yet, try to get it from the browser
    if (!protocol) {
      protocol = await page.evaluate(() => {
        const w = globalThis;
        const data = w.__RUNTIME_PROTOCOL_CONFIG;
        return data?.protocol || null;
      });

      if (!protocol) {
        throw new Error(
          "Protocol config not found in generated data or runtime globals",
        );
      }
    }

    log(
      `Loaded protocol "${protocol.protocol_name}" with ${protocol.steps.length} steps`,
      verbosity,
    );

    // Verify entry step
    const entryStep = protocol.steps.find(
      (s) => s.step_name === protocol.entry_step,
    );
    if (!entryStep) {
      throw new Error(`Entry step "${protocol.entry_step}" not found in steps`);
    }

    let stepsWalked = 0;
    let interactionsWalked = 0;

    // Walk each step
    for (let i = 0; i < protocol.steps.length; i++) {
      const step = protocol.steps[i];
      try {
        const stepInteractions = await executeStep(
          page,
          step,
          i,
          protocol,
          finalScreenshotDir,
          verbosity,
        );
        stepsWalked++;
        interactionsWalked += stepInteractions;
      } catch (err) {
        log(`Step ${step.step_name} failed: ${err.message}`, verbosity);
        return {
          protocolName,
          stepsWalked,
          stepsTotal: protocol.steps.length,
          interactionsWalked,
          screenshotsTaken: stepsWalked * 2 + interactionsWalked * 2, // rough estimate
          success: false,
          failedStepName: step.step_name,
          errorMessage: err.message,
        };
      }
    }

    log(
      `Walker completed successfully: ${stepsWalked}/${protocol.steps.length} steps`,
      verbosity,
    );

    return {
      protocolName,
      stepsWalked,
      stepsTotal: protocol.steps.length,
      interactionsWalked,
      screenshotsTaken: stepsWalked * 2 + interactionsWalked * 2, // rough estimate
      success: true,
    };
  } catch (err) {
    log(`Walker failed with error: ${err.message}`, verbosity);
    return {
      protocolName,
      stepsWalked: 0,
      stepsTotal: 0,
      interactionsWalked: 0,
      screenshotsTaken: 0,
      success: false,
      errorMessage: err.message,
    };
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}
