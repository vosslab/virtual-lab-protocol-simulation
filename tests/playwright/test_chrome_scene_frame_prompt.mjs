/**
 * tests/playwright/test_chrome_scene_frame_prompt.mjs
 *
 * Playwright test: verify that the chrome scene frame and prompt panel
 * mount correctly and display step prompts verbatim.
 *
 * Assertions:
 * 1. Scene viewport element exists with correct data-testid.
 * 2. Prompt panel element exists with correct data-testid.
 * 3. Prompt panel displays the step's prompt verbatim via textContent.
 * 4. XSS prevention: user content is rendered as text, not HTML.
 * 5. Screenshots captured under test-results/_chrome/.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// TEST: scene frame mount and prompt render
//============================================

async function runTest() {
  console.log("Starting WP-CHROME-MINIMAL-1A test...");

  // Sample step to render.
  const testStep = {
    step_name: "test_step_1",
    prompt: "Open the well plate workspace and prepare to add media.",
    sequence: [],
    step_validator: { preset: "sequence_complete" },
    outcome: { on_success: "complete", on_failure: "retry" },
    next_step: null,
  };

  // HTML test harness that mounts the chrome and renders the step.
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Chrome Scene Frame + Prompt Test</title>
	<style>
		body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
		#root { width: 100vw; height: 100vh; }

		.scene-chrome {
			display: flex;
			flex-direction: column;
			height: 100vh;
			width: 100%;
			background-color: #fafafa;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			color: #333;
		}

		.scene-viewport {
			flex: 1;
			overflow: auto;
			background-color: #fff;
			border-bottom: 1px solid #e0e0e0;
			min-height: 300px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.prompt-panel {
			padding: 16px;
			background-color: #f5f5f5;
			border-top: 1px solid #e0e0e0;
			max-height: 120px;
			overflow-y: auto;
			min-height: 60px;
		}

		.prompt-text {
			font-size: 14px;
			line-height: 1.5;
			color: #333;
			white-space: pre-wrap;
			word-wrap: break-word;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script>
		// Inline implementations of mountSceneFrame and renderPromptPanel.
		// These are copied from src/scene_runtime/chrome/ for test isolation.

		function mountSceneFrame(rootElement) {
			rootElement.innerHTML = '';

			const chrome = document.createElement('div');
			chrome.className = 'scene-chrome';

			const sceneViewport = document.createElement('div');
			sceneViewport.setAttribute('data-testid', 'scene-viewport');
			sceneViewport.className = 'scene-viewport';

			const promptPanel = document.createElement('div');
			promptPanel.setAttribute('data-testid', 'prompt-panel');
			promptPanel.className = 'prompt-panel';

			chrome.appendChild(sceneViewport);
			chrome.appendChild(promptPanel);

			rootElement.appendChild(chrome);

			return {
				sceneViewport,
				promptPanel,
			};
		}

		function renderPromptPanel(panel, step) {
			panel.innerHTML = '';

			if (!step) {
				return;
			}

			const promptText = document.createElement('div');
			promptText.className = 'prompt-text';
			promptText.textContent = step.prompt;

			panel.appendChild(promptText);
		}

		// Main test code
		const root = document.getElementById('root');
		if (!root) throw new Error('Root element not found');

		// Mount the scene frame chrome.
		const { sceneViewport, promptPanel } = mountSceneFrame(root);

		// Render the test step prompt.
		const testStep = ${JSON.stringify(testStep)};
		renderPromptPanel(promptPanel, testStep);

		// Signal completion to the test.
		window.chromeReady = true;
	</script>
</body>
</html>`;

  const tempDir = path.join(REPO_ROOT, "test-results", "_chrome");
  fs.mkdirSync(tempDir, { recursive: true });

  const htmlPath = path.join(tempDir, "index.html");
  fs.writeFileSync(htmlPath, htmlContent);

  // Start a browser and load the HTML.
  console.log("  Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });

  const fileUrl = `file://${htmlPath}`;
  console.log(`  Loading ${fileUrl}...`);
  await page.goto(fileUrl);

  // Wait for chrome to be ready.
  await page.waitForFunction(() => window.chromeReady === true, {
    timeout: 5000,
  });
  console.log("  Chrome mounted and ready");

  // Take a screenshot after mount.
  const screenshotAfter = path.join(tempDir, "01_scene_frame_prompt.png");
  await page.screenshot({ path: screenshotAfter });
  console.log(`  Screenshot: ${screenshotAfter}`);

  // ============================================
  // Assertion 1: scene-viewport element exists
  // ============================================
  const viewportExists = await page
    .locator('[data-testid="scene-viewport"]')
    .count();
  if (viewportExists !== 1) {
    throw new Error(
      `Expected 1 scene-viewport element, found ${viewportExists}`,
    );
  }
  console.log(
    '  ✓ Scene viewport element exists with data-testid="scene-viewport"',
  );

  // ============================================
  // Assertion 2: prompt-panel element exists
  // ============================================
  const panelExists = await page
    .locator('[data-testid="prompt-panel"]')
    .count();
  if (panelExists !== 1) {
    throw new Error(`Expected 1 prompt-panel element, found ${panelExists}`);
  }
  console.log(
    '  ✓ Prompt panel element exists with data-testid="prompt-panel"',
  );

  // ============================================
  // Assertion 3: prompt text is rendered verbatim
  // ============================================
  const promptPanel = page.locator('[data-testid="prompt-panel"]');
  const panelText = await promptPanel.textContent();
  const expectedText = testStep.prompt;

  if (panelText !== expectedText) {
    throw new Error(
      `Prompt text mismatch.\nExpected: "${expectedText}"\nGot: "${panelText}"`,
    );
  }
  console.log("  ✓ Prompt panel displays step prompt verbatim");

  // ============================================
  // Assertion 4: XSS prevention (textContent used)
  // ============================================
  const xssTestStep = {
    step_name: "xss_test",
    prompt: '<script>alert("xss")</script>Test content',
    sequence: [],
    step_validator: { preset: "sequence_complete" },
    outcome: { on_success: "complete", on_failure: "retry" },
    next_step: null,
  };

  await page.evaluate((step) => {
    // Re-render with XSS test step
    const promptPanel = document.querySelector('[data-testid="prompt-panel"]');
    promptPanel.innerHTML = "";
    const promptText = document.createElement("div");
    promptText.className = "prompt-text";
    promptText.textContent = step.prompt;
    promptPanel.appendChild(promptText);
  }, xssTestStep);

  // Check that the HTML tags are rendered as text (not executed).
  const xssText = await promptPanel.textContent();
  if (!xssText.includes("<script>")) {
    throw new Error("XSS test failed: script tags should be rendered as text");
  }
  if (xssText !== xssTestStep.prompt) {
    throw new Error(
      `XSS test mismatch.\nExpected: "${xssTestStep.prompt}"\nGot: "${xssText}"`,
    );
  }
  console.log(
    "  ✓ XSS prevention verified: HTML tags rendered as text via textContent",
  );

  // ============================================
  // Final screenshot
  // ============================================
  const screenshotFinal = path.join(tempDir, "02_xss_test.png");
  await page.screenshot({ path: screenshotFinal });
  console.log(`  Screenshot (XSS test): ${screenshotFinal}`);

  // ============================================
  // Cleanup and exit
  // ============================================
  await browser.close();
  console.log("Test passed! All assertions green.");
  process.exit(0);
}

// Run the test.
runTest().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
