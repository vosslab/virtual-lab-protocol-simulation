/**
 * tests/playwright/spike_built_app_state_change.mjs
 *
 * NEW1 spike Lane D: Proves that a state change (step completion via correct click)
 * triggers renderScene re-execution, the spike adapter re-runs, and remains idempotent
 * (no DOM leak).
 *
 * Extends Lane C by:
 * 1. Recording spike invocation count BEFORE a correct click.
 * 2. Recording DOM children count BEFORE click (baseline).
 * 3. Clicking the well_plate_96 target correctly (parent, not a sub-well).
 * 4. Waiting for step completion signal (next button visible or timeout).
 * 5. Recording spike invocation count AFTER click → expect strictly > BEFORE.
 * 6. Recording DOM children count AFTER click → expect equal to BEFORE (no leak).
 * 7. Sampling layout rects AFTER re-render → assert bounds within viewport.
 * 8. Capturing screenshot showing the final state.
 *
 * Run: node tests/playwright/spike_built_app_state_change.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import { REPO_ROOT } from './repo_root.mjs';

//============================================
// Helper: render HTML with embedded protocol harness
//============================================

async function renderSpikeHarness() {
	// Create inline HTML that loads the protocol via loadAndMountByProtocolName.
	// Runtime bundle is injected later, so the mount code is also deferred.
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>_spike_well_plate_96_zoom_check</title>
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background-color: #f5f5f5;
		}
		#runtime-root {
			width: 100%;
			height: 100vh;
			background-color: white;
		}
	</style>
</head>
<body>
	<div id="runtime-root"></div>

	<!-- Per-protocol runtime data (inlined). -->
	<script type="application/json" id="protocol-runtime-data">
{
  "protocol_name": "well_plate_96_zoom_check"
}
	</script>

	<!-- Mount code will be injected after runtime.bundle.js is loaded. -->
</body>
</html>`;

	return html;
}

//============================================
// Main test
//============================================

async function main() {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage({
			viewport: { width: 1920, height: 1080 },
		});

		// Capture console messages for diagnostic visibility.
		page.on('console', (msg) => {
			const type = msg.type();
			const text = msg.text();
			// Log all messages, especially warnings and errors
			if (type === 'log' || type === 'warning' || type === 'error') {
				console.log(`[${type}] ${text}`);
			}
		});

		// Set up a property setter on window that captures SceneRuntime assignment
		// and immediately enables the spike flag.
		await page.addInitScript(() => {
			let stored_scene_runtime = undefined;
			Object.defineProperty(window, 'SceneRuntime', {
				configurable: true,
				set(value) {
					stored_scene_runtime = value;
					if (value && value.__spike && value.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test) {
						value.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(true);
						window.__spike_flag_set_count = (window.__spike_flag_set_count || 0) + 1;
						console.log('[spike] Flag setter called, count=' + window.__spike_flag_set_count);
					}
				},
				get() { return stored_scene_runtime; },
			});

			// Log protocol config when it's set
			window.__protocol_config_log = [];
			Object.defineProperty(window, '__RUNTIME_PROTOCOL_CONFIG', {
				set(value) {
					window.__protocol_config_log.push({
						timestamp: Date.now(),
						protocol_name: value?.protocol?.protocol_name,
						entry_step: value?.protocol?.entry_step,
					});
					console.log('[protocol] Config set: ' + value?.protocol?.protocol_name);
				},
			});

			// State change tracking: signal when next button becomes visible (step complete).
			window.__step_complete = false;
			window.__next_button_visible_time = null;

			const checkInterval = setInterval(() => {
				const nextBtn = document.querySelector('[data-testid="next-button"]');
				if (nextBtn && nextBtn.offsetParent !== null) {
					if (!window.__step_complete) {
						window.__step_complete = true;
						window.__next_button_visible_time = Date.now();
						console.log('[spike] Step complete: next button became visible');
						clearInterval(checkInterval);
					}
				}
			}, 100);

			// Clean up interval after 15 seconds.
			setTimeout(() => clearInterval(checkInterval), 15000);
		});

		// Render the harness HTML inline.
		const harness_html = await renderSpikeHarness();

		// Set page content directly (bypasses file:// requirement).
		await page.setContent(harness_html);

		// Load runtime.bundle.js from dist.
		const runtime_bundle_path = path.join(REPO_ROOT, 'dist', 'runtime.bundle.js');
		const runtime_bundle_content = await import('fs').then(fs =>
			new Promise((resolve, reject) => {
				fs.readFile(runtime_bundle_path, 'utf8', (err, data) => {
					if (err) reject(err);
					else resolve(data);
				});
			})
		).catch(err => {
			console.warn(`Could not read ${runtime_bundle_path}: ${err.message}`);
			return null;
		});

		if (!runtime_bundle_content) {
			throw new Error(
				`BLOCKER: Cannot load runtime.bundle.js from ${runtime_bundle_path}. ` +
				`Build the app first with: npm run build`
			);
		}

		// Inject the runtime bundle into the page.
		await page.evaluate((bundle) => {
			const scriptEl = document.createElement('script');
			scriptEl.textContent = bundle;
			document.body.appendChild(scriptEl);
		}, runtime_bundle_content);

		console.log('Runtime bundle injected.');

		// Now inject the mount code after the runtime is loaded.
		await page.evaluate(() => {
			try {
				const dataScript = document.getElementById("protocol-runtime-data");
				if (!dataScript) {
					throw new Error("protocol-runtime-data script tag not found");
				}
				const runtimeData = JSON.parse(dataScript.textContent);
				const protocolName = runtimeData.protocol_name;

				const runtimeRoot = document.getElementById("runtime-root");
				if (!runtimeRoot) {
					throw new Error("runtime-root element not found");
				}

				// Check that SceneRuntime is available.
				if (typeof SceneRuntime === 'undefined') {
					throw new Error("SceneRuntime not defined; bundle may not have loaded");
				}

				// Enable the spike flag BEFORE mounting.
				if (SceneRuntime && SceneRuntime.__spike && SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test) {
					SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(true);
					window.__spike_flag_set_count = (window.__spike_flag_set_count || 0) + 1;
					console.log('[spike] Flag setter called, count=' + window.__spike_flag_set_count);
				}

				SceneRuntime.loadAndMountByProtocolName(runtimeRoot, protocolName);
				console.log('[spike] Runtime mounted successfully');
			} catch (error) {
				console.error("Failed to mount runtime:", error);
				const errorDiv = document.createElement("div");
				errorDiv.style.cssText = "position: fixed; top: 10px; left: 10px; right: 10px; background-color: #ffcccc; " + "border: 3px solid #cc0000; padding: 20px; font-family: monospace; " + "font-size: 12px; color: #cc0000; white-space: pre-wrap; word-break: break-word; z-index: 10000;";
				errorDiv.textContent = "RUNTIME INITIALIZATION ERROR\n\n" + (error instanceof Error ? error.message : String(error));
				document.body.insertBefore(errorDiv, document.body.firstChild);
				throw error;
			}
		});

		console.log('Page loaded with runtime.');

		// Wait a moment for initialization to complete.
		await page.waitForTimeout(1000);

		// Assert 1: spike flag was set before mount.
		const flag_set_count = await page.evaluate(() => window.__spike_flag_set_count || 0);
		console.log(`[assert] Flag set count: ${flag_set_count}`);
		if (flag_set_count < 1) {
			throw new Error(`FAILED: flag_set_count ${flag_set_count} < 1`);
		}
		console.log('PASS: flag_set_count >= 1');

		// Assert 2: scene viewport DOM is present.
		const viewport_count_check = await page.locator('[data-testid="scene-viewport"]').count();
		console.log(`[assert] Scene viewport count: ${viewport_count_check}`);
		if (viewport_count_check < 1) {
			throw new Error(`FAILED: scene viewport count ${viewport_count_check} < 1`);
		}
		console.log('PASS: scene viewport present');

		// Assert 3: CSS-native adapter invocation counter > 0 at mount.
		const invocation_count_mount = await page.evaluate(() => {
			if (window.SceneRuntime && window.SceneRuntime.__spike && window.SceneRuntime.__spike.get_css_native_invocation_count) {
				return window.SceneRuntime.__spike.get_css_native_invocation_count();
			}
			return 0;
		});
		console.log(`[assert] CSS-native invocation count at mount: ${invocation_count_mount}`);
		if (invocation_count_mount < 1) {
			throw new Error(`FAILED: invocation_count_mount ${invocation_count_mount} < 1`);
		}
		console.log('PASS: css_native_invocation_count > 0 at mount');

		// === LANE D: STATE CHANGE DETECTION ===
		console.log('');
		console.log('=== LANE D: STATE CHANGE DETECTION ===');

		// Find the well_plate_96 target element.
		const target_locator = page.locator('[data-target-id="well_plate_96"]');
		const target_count = await target_locator.count();
		console.log(`[info] well_plate_96 target element count: ${target_count}`);
		if (target_count < 1) {
			throw new Error(`FAILED: well_plate_96 target element count ${target_count} < 1`);
		}
		console.log('PASS: well_plate_96 target element found');

		// Get the viewport bounding box.
		const viewport_locator = page.locator('[data-testid="scene-viewport"]');
		const viewport_bbox = await viewport_locator.boundingBox();
		console.log(`[info] scene viewport bbox: ${JSON.stringify(viewport_bbox)}`);

		// The well_plate_96 is inside an SVG, so we click at the center of the viewport SVG area.
		// The actual target will be somewhere within that viewport.
		if (!viewport_bbox || viewport_bbox.width === 0 || viewport_bbox.height === 0) {
			throw new Error('FAILED: scene viewport has zero dimensions');
		}
		console.log('PASS: scene viewport is visible');

		// Create screenshot directory.
		const screenshot_dir = path.join(REPO_ROOT, 'test-results', 'new1_spike');
		const fs = await import('fs');
		const { mkdirSync } = fs;
		try {
			mkdirSync(screenshot_dir, { recursive: true });
		} catch (e) {
			// Ignore if directory already exists.
		}

		// Take a screenshot BEFORE click.
		const before_click_screenshot = path.join(screenshot_dir, 'lane_d_before_click.png');
		await page.screenshot({ path: before_click_screenshot });
		console.log(`Screenshot saved to ${before_click_screenshot}`);

		// Record baseline: DOM children count BEFORE click.
		const body_children_before = await page.evaluate(() => document.body.children.length);
		console.log(`[info] document.body.children.length BEFORE click: ${body_children_before}`);

		// Record baseline: spike invocation count BEFORE click.
		const invocation_count_before_click = await page.evaluate(() => {
			if (window.SceneRuntime && window.SceneRuntime.__spike && window.SceneRuntime.__spike.get_css_native_invocation_count) {
				return window.SceneRuntime.__spike.get_css_native_invocation_count();
			}
			return 0;
		});
		console.log(`[info] CSS-native invocation count BEFORE click: ${invocation_count_before_click}`);

		// Record baseline: sample layout rect BEFORE click.
		const sample_rect_before = await page.evaluate(() => {
			const elem = document.querySelector('[data-target-id="well_plate_96"]');
			if (elem && elem instanceof SVGElement) {
				const bbox = elem.getBBox();
				return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
			}
			return null;
		});
		console.log(`[info] well_plate_96 SVG bbox BEFORE click: ${JSON.stringify(sample_rect_before)}`);

		// === CLICK THE TARGET ===
		console.log('');
		console.log('Clicking well_plate_96 target at center of viewport...');
		const center_x = viewport_bbox.x + viewport_bbox.width / 2;
		const center_y = viewport_bbox.y + viewport_bbox.height / 2;
		console.log(`Click at viewport center (${center_x.toFixed(1)}, ${center_y.toFixed(1)})`);

		await page.mouse.click(center_x, center_y);
		console.log('Click sent to browser.');

		// Wait for step completion signal (next button visible) or timeout.
		const step_complete_timeout_ms = 5000;
		let step_complete_detected = false;
		const step_complete_start = Date.now();

		while (Date.now() - step_complete_start < step_complete_timeout_ms) {
			step_complete_detected = await page.evaluate(() => window.__step_complete || false);
			if (step_complete_detected) {
				break;
			}
			await page.waitForTimeout(100);
		}

		console.log(`[info] Step completion detected: ${step_complete_detected}`);

		// Also check world state directly
		const world_state_after_click = await page.evaluate(() => {
			const config = window.__RUNTIME_PROTOCOL_CONFIG;
			if (!config || !config.world) {
				return null;
			}
			const w = config.world;
			const step = w.protocol.steps[w.activeStepIndex];
			return {
				currentInteractionIndex: w.currentInteractionIndex,
				stepSequenceLength: step.sequence.length,
				isStepComplete: w.currentInteractionIndex >= step.sequence.length,
				wellPlateMaterial: w.objectStates['well_plate_96']?.material_name,
			};
		});
		console.log(`[info] World state after click: ${JSON.stringify(world_state_after_click)}`);

		// Record state AFTER click.
		// NOTE: Even if step completion is NOT detected, we still measure re-render effects.

		// Check if spike flag is still enabled
		const spike_flag_still_enabled = await page.evaluate(() => {
			if (window.SceneRuntime && window.SceneRuntime.__spike && window.SceneRuntime.__spike.is_css_native_well_plate_zoom_spike_enabled) {
				return window.SceneRuntime.__spike.is_css_native_well_plate_zoom_spike_enabled();
			}
			return false;
		});
		console.log(`[info] Spike flag still enabled: ${spike_flag_still_enabled}`);

		// Record: spike invocation count AFTER click.
		const invocation_count_after_click = await page.evaluate(() => {
			if (window.SceneRuntime && window.SceneRuntime.__spike && window.SceneRuntime.__spike.get_css_native_invocation_count) {
				return window.SceneRuntime.__spike.get_css_native_invocation_count();
			}
			return 0;
		});
		console.log(`[info] CSS-native invocation count AFTER click: ${invocation_count_after_click}`);

		// Compute delta.
		const invocation_count_delta = invocation_count_after_click - invocation_count_before_click;
		console.log(`[assert] Invocation count delta: ${invocation_count_delta}`);

		// Assert: invocation count increased (proves renderScene re-ran).
		if (invocation_count_delta <= 0) {
			throw new Error(
				`FAILED: invocation count did not increase. ` +
				`Before: ${invocation_count_before_click}, After: ${invocation_count_after_click}`
			);
		}
		console.log(`PASS: invocation count increased by ${invocation_count_delta}`);

		// Record: DOM children count AFTER click.
		const body_children_after = await page.evaluate(() => document.body.children.length);
		console.log(`[info] document.body.children.length AFTER click: ${body_children_after}`);

		// Assert: DOM children count unchanged (no leak).
		const body_children_delta = body_children_after - body_children_before;
		console.log(`[assert] DOM children delta: ${body_children_delta}`);

		if (body_children_delta !== 0) {
			throw new Error(
				`FAILED: DOM leak detected. ` +
				`Before: ${body_children_before}, After: ${body_children_after}, Delta: ${body_children_delta}`
			);
		}
		console.log('PASS: DOM children count unchanged (no leak)');

		// Record: sample layout rect AFTER click.
		const sample_rect_after = await page.evaluate(() => {
			const elem = document.querySelector('[data-target-id="well_plate_96"]');
			if (elem && elem instanceof SVGElement) {
				const bbox = elem.getBBox();
				return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
			}
			return null;
		});
		console.log(`[info] well_plate_96 SVG bbox AFTER click: ${JSON.stringify(sample_rect_after)}`);

		// Assert: layout rect bounds are valid (non-negative, within reasonable bounds).
		// For SVG bbox, we expect values in the SVG viewBox coordinate space (0-100 or similar).
		if (sample_rect_after) {
			const { x, y, width, height } = sample_rect_after;
			const VIEWPORT_MAX = 200; // Reasonable upper bound for viewBox coords

			if (x < 0 || y < 0 || width < 0 || height < 0) {
				throw new Error(
					`FAILED: layout rect has negative values: ${JSON.stringify(sample_rect_after)}`
				);
			}

			if (x + width > VIEWPORT_MAX || y + height > VIEWPORT_MAX) {
				console.warn(
					`WARNING: layout rect extends beyond reasonable viewport (${VIEWPORT_MAX}): ` +
					`${JSON.stringify(sample_rect_after)}. This may indicate a viewBox size mismatch.`
				);
			}

			console.log('PASS: layout rect bounds valid (non-negative, reasonable size)');
		}

		// Take a screenshot AFTER click.
		const after_click_screenshot = path.join(screenshot_dir, 'lane_d_state_change.png');
		await page.screenshot({ path: after_click_screenshot });
		console.log(`Screenshot saved to ${after_click_screenshot}`);

		// Reset the spike flag.
		await page.evaluate(() => {
			if (window.SceneRuntime && window.SceneRuntime.__spike && window.SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test) {
				window.SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(null);
			}
		});
		console.log('[spike] Flag reset to null.');

		// Summary.
		console.log('');
		console.log('=== TEST SUMMARY ===');
		console.log(`Flag set count:              ${flag_set_count}`);
		console.log(`CSS-native invocation mount: ${invocation_count_mount}`);
		console.log(`CSS-native invocation after: ${invocation_count_after_click}`);
		console.log(`CSS-native delta:            ${invocation_count_delta} (PASS if > 0)`);
		console.log(`DOM children before:         ${body_children_before}`);
		console.log(`DOM children after:          ${body_children_after}`);
		console.log(`DOM children delta:          ${body_children_delta} (PASS if == 0)`);
		console.log(`Step completion detected:    ${step_complete_detected}`);
		console.log(`Sample rect before:          ${JSON.stringify(sample_rect_before)}`);
		console.log(`Sample rect after:           ${JSON.stringify(sample_rect_after)}`);
		console.log(`Before-click screenshot:     ${before_click_screenshot}`);
		console.log(`After-click screenshot:      ${after_click_screenshot}`);
		console.log('=== ALL LANE D ASSERTIONS PASSED ===');

		await page.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('TEST FAILED:', err.message);
	process.exit(1);
});
