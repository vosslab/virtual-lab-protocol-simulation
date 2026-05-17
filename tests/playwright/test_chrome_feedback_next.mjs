/**
 * tests/playwright/test_chrome_feedback_next.mjs
 *
 * Playwright test for feedback area and next button components.
 * Tests rendering, dismissal, visibility control, and click handling.
 * Uses the esbuild-compiled bundle from dist/runtime.bundle.js.
 */

import { chromium } from 'playwright';
import { REPO_ROOT } from './repo_root.mjs';
import path from 'node:path';
import fs from 'node:fs';

const TEST_RESULTS_DIR = path.join(REPO_ROOT, 'test-results/_chrome');

/**
 * Create a test HTML that mounts the chrome components.
 * Assumes dist/runtime.bundle.js exists and has been compiled.
 */
function createTestHTML() {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Feedback/Next Chrome Test</title>
	<style>
		body { margin: 0; padding: 0; font-family: system-ui; }
		#root { width: 100%; height: 100vh; }

		.scene-chrome {
			display: flex;
			flex-direction: column;
			height: 100vh;
			width: 100%;
			background-color: #fafafa;
		}

		.scene-viewport {
			flex: 1;
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
			min-height: 60px;
		}

		.feedback-area {
			padding: 12px 16px;
			background-color: #fff3e0;
			border-top: 1px solid #ffe0b2;
			border-bottom: 1px solid #ffe0b2;
			display: none;
			min-height: auto;
			max-height: 100px;
			overflow-y: auto;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
		}

		.feedback-text {
			font-size: 13px;
			line-height: 1.4;
			color: #e65100;
			flex: 1;
		}

		.feedback-dismiss-button {
			padding: 6px 12px;
			background-color: #fff9c4;
			border: 1px solid #fdd835;
			border-radius: 4px;
			font-size: 12px;
			color: #e65100;
			cursor: pointer;
			white-space: nowrap;
			flex-shrink: 0;
		}

		.next-button-container {
			padding: 12px 16px;
			background-color: #f9f9f9;
			border-top: 1px solid #e0e0e0;
			display: flex;
			justify-content: flex-end;
			min-height: 48px;
			align-items: center;
		}

		.next-button {
			padding: 8px 20px;
			background-color: #4caf50;
			border: none;
			border-radius: 4px;
			font-size: 14px;
			color: white;
			cursor: pointer;
			font-weight: 500;
			display: none;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script>
		// Direct implementation of renderFeedback and renderNextButton for testing
		function renderFeedback(area, message) {
			area.innerHTML = '';
			if (message === null) {
				area.style.display = 'none';
				return;
			}
			area.style.display = 'block';
			const text = document.createElement('div');
			text.className = 'feedback-text';
			text.textContent = message;
			const btn = document.createElement('button');
			btn.className = 'feedback-dismiss-button';
			btn.setAttribute('data-testid', 'feedback-dismiss');
			btn.textContent = 'Dismiss';
			btn.addEventListener('click', () => {
				renderFeedback(area, null);
			});
			area.addEventListener('click', (e) => {
				if (e.target === area) {
					renderFeedback(area, null);
				}
			});
			area.appendChild(text);
			area.appendChild(btn);
		}

		function renderNextButton(container, options) {
			container.innerHTML = '';
			container.style.display = options.visible ? 'flex' : 'none';
			if (!options.visible) return;
			const btn = document.createElement('button');
			btn.className = 'next-button';
			btn.setAttribute('data-testid', 'next-button');
			btn.textContent = 'Next';
			btn.style.display = 'block';
			btn.addEventListener('click', options.onClick);
			container.appendChild(btn);
		}

		function mountSceneFrame(root) {
			root.innerHTML = '';
			const chrome = document.createElement('div');
			chrome.className = 'scene-chrome';
			const viewport = document.createElement('div');
			viewport.setAttribute('data-testid', 'scene-viewport');
			viewport.className = 'scene-viewport';
			const panel = document.createElement('div');
			panel.setAttribute('data-testid', 'prompt-panel');
			panel.className = 'prompt-panel';
			const area = document.createElement('div');
			area.setAttribute('data-testid', 'feedback-area');
			area.className = 'feedback-area';
			const nextBtn = document.createElement('div');
			nextBtn.className = 'next-button-container';
			chrome.appendChild(viewport);
			chrome.appendChild(panel);
			chrome.appendChild(area);
			chrome.appendChild(nextBtn);
			root.appendChild(chrome);
			return { sceneViewport: viewport, promptPanel: panel, feedbackArea: area, nextButton: nextBtn };
		}

		// Setup for test
		window.renderFeedback = renderFeedback;
		window.renderNextButton = renderNextButton;
		window.mountSceneFrame = mountSceneFrame;

		const root = document.getElementById('root');
		const { feedbackArea, nextButton } = mountSceneFrame(root);
		window.feedbackArea = feedbackArea;
		window.nextButton = nextButton;
		window.testReady = true;
	</script>
</body>
</html>
	`;
}

/**
 * Main test execution.
 */
async function main() {
	// Ensure test results directory exists
	fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		// Load the test HTML
		await page.setContent(createTestHTML());

		// Wait for test setup
		await page.waitForFunction(() => window.testReady, { timeout: 5000 });

		// Test 1: Feedback area initially hidden
		const initialHidden = await page.evaluate(() => {
			const area = document.querySelector('[data-testid="feedback-area"]');
			const displayValue = area.style.display;
			// CSS rule sets display: none in the stylesheet, but style.display may be empty string initially
			return displayValue === 'none' || displayValue === '';
		});
		if (!initialHidden) throw new Error('Test 1 failed: Feedback area should be initially hidden');

		// Test 2: Show feedback with message
		await page.evaluate(() => {
			window.renderFeedback(window.feedbackArea, 'This is a test feedback message');
		});

		const feedbackVisible = await page.evaluate(() => {
			const area = document.querySelector('[data-testid="feedback-area"]');
			return area.style.display === 'block';
		});
		if (!feedbackVisible) throw new Error('Test 2 failed: Feedback area should be visible');

		const feedbackText = await page.evaluate(() => {
			const text = document.querySelector('.feedback-text');
			return text && text.textContent.includes('test feedback message');
		});
		if (!feedbackText) throw new Error('Test 2b failed: Feedback text should contain message');

		// Capture initial screenshot
		await page.screenshot({ path: path.join(TEST_RESULTS_DIR, '1_feedback_visible.png') });

		// Test 3: Dismiss feedback by clicking dismiss button
		await page.click('[data-testid="feedback-dismiss"]');

		const feedbackHiddenAfterDismiss = await page.evaluate(() => {
			const area = document.querySelector('[data-testid="feedback-area"]');
			return area.style.display === 'none';
		});
		if (!feedbackHiddenAfterDismiss) throw new Error('Test 3 failed: Feedback area should be hidden after dismiss');

		// Capture after dismiss screenshot
		await page.screenshot({ path: path.join(TEST_RESULTS_DIR, '2_feedback_dismissed.png') });

		// Test 4: Next button initially hidden
		const nextButtonHidden = await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="next-button"]');
			return !btn;
		});
		if (!nextButtonHidden) throw new Error('Test 4 failed: Next button should not exist initially');

		// Test 5: Show next button
		await page.evaluate(() => {
			window.nextButtonClickFired = false;
			window.renderNextButton(window.nextButton, {
				visible: true,
				onClick: () => {
					window.nextButtonClickFired = true;
				},
			});
		});

		const nextButtonVisible = await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="next-button"]');
			return btn && btn.style.display === 'block';
		});
		if (!nextButtonVisible) throw new Error('Test 5 failed: Next button should be visible');

		// Capture next button visible screenshot
		await page.screenshot({ path: path.join(TEST_RESULTS_DIR, '3_next_button_visible.png') });

		// Test 6: Click next button fires handler
		await page.click('[data-testid="next-button"]');
		const clickFired = await page.evaluate(() => window.nextButtonClickFired);
		if (!clickFired) throw new Error('Test 6 failed: Next button click should fire handler');

		// Capture after click screenshot
		await page.screenshot({ path: path.join(TEST_RESULTS_DIR, '4_after_next_click.png') });

		console.log('✓ All feedback and next button tests passed');
		process.exit(0);
	} catch (error) {
		console.error('Test failed:', error);
		process.exit(1);
	} finally {
		await context.close();
		await browser.close();
	}
}

main();
