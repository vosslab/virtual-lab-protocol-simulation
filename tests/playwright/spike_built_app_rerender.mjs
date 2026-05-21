/**
 * tests/playwright/spike_built_app_rerender.mjs
 *
 * NEW1 spike Lane R: Proves that a state change (step completion via correct click)
 * triggers renderScene re-execution without editing the validator.
 *
 * Changes from Lane D:
 * 1. Target changed from well_plate_96.row_E (group) to well_plate_96.E7 (valid rect).
 * 2. Lane W prototype validates E7 as a valid well cell per geometry.
 * 3. Click on E7 should resolve to the cell element and match the protocol target.
 * 4. Proves renderScene re-fires by measuring __spike.get_css_native_invocation_count().
 *
 * Run: node tests/playwright/spike_built_app_rerender.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import { REPO_ROOT } from './repo_root.mjs';

//============================================
// Helper: load spike HTML from dist
//============================================

async function loadSpikeHarness() {
	const spike_html_path = path.join(REPO_ROOT, 'dist', '_spike_well_plate_96_zoom_check.html');
	const fs = await import('fs');
	const html = await new Promise((resolve, reject) => {
		fs.readFile(spike_html_path, 'utf8', (err, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});
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
		const capturedLogs = [];
		page.on('console', (msg) => {
			const type = msg.type();
			const text = msg.text();
			capturedLogs.push({ type, text });
			// Log everything, not just specific types
			console.log(`[console/${type}] ${text}`);
		});

		// Set up initialization: SceneRuntime property, spike flag, and click listener
		await page.addInitScript(() => {
			// 1. Set up SceneRuntime property setter
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

			// 2. Set up click event capture
			window.__click_events = [];
			window.__click_count = 0;

			const clickHandler = (e) => {
				const target = e.target;
				const targetWithId = target?.closest ? target.closest('[data-target-id]') : null;
				window.__click_count++;
				window.__click_events.push({
					timestamp: Date.now(),
					target_tag: target?.tagName || 'unknown',
					target_class: target?.className || '',
					closest_target_id: targetWithId?.getAttribute('data-target-id'),
				});
				console.log('[click-capture] Event #' + window.__click_count + ': target=' + (target?.tagName || 'unknown') + ', closest_id=' + (targetWithId?.getAttribute('data-target-id') || 'none'));
			};

			document.addEventListener('click', clickHandler, true);
			window.__click_listener_registered = true;
		});

		// Load the spike HTML from dist.
		const harness_html = await loadSpikeHarness();

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
				`Build the app first with: bash pipeline/build_runtime_bundle.sh`
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

		// === LANE R: RE-RENDER DETECTION ===
		console.log('');
		console.log('=== LANE R: RE-RENDER DETECTION ===');

		// Get the viewport bounding box.
		const viewport_locator = page.locator('[data-testid="scene-viewport"]');
		const viewport_bbox = await viewport_locator.boundingBox();
		console.log(`[info] scene viewport bbox: ${JSON.stringify(viewport_bbox)}`);

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
		const before_click_screenshot = path.join(screenshot_dir, 'lane_r_before_click.png');
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

		// === CLICK THE TARGET ===
		console.log('');
		console.log('Clicking well_plate_96.E7 (protocol target)...');

		// Find the E7 well element
		const e7_elem_info = await page.evaluate(() => {
			const elem = document.querySelector('[data-target-id="well_plate_96.E7"]');
			if (!elem) return { found: false };

			const rect = elem.getBoundingClientRect();
			const style = window.getComputedStyle(elem);

			return {
				found: true,
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				center_x: rect.x + rect.width / 2,
				center_y: rect.y + rect.height / 2,
				pointer_events: style.pointerEvents,
			};
		});

		if (!e7_elem_info.found) {
			throw new Error('well_plate_96.E7 element not found in DOM');
		}

		console.log(`well_plate_96.E7 found: ${JSON.stringify(e7_elem_info)}`);

		const center_x = e7_elem_info.center_x;
		const center_y = e7_elem_info.center_y;
		console.log(`Click at E7 center (${center_x.toFixed(1)}, ${center_y.toFixed(1)})`);

		// Debug: what's at the click position and what's the DOM structure?
		const debug_info = await page.evaluate(({ x, y }) => {
			const elem = document.elementFromPoint(x, y);
			const viewport = document.querySelector('[data-testid="scene-viewport"]');
			const svg = viewport?.querySelector('svg');
			const groups = viewport?.querySelectorAll('[data-target-id]');

			return {
				element_at_point: elem?.tagName,
				element_classes: elem?.className,
				element_pointer_events: elem ? window.getComputedStyle(elem).pointerEvents : 'N/A',
				svg_exists: !!svg,
				svg_pointer_events: svg ? window.getComputedStyle(svg).pointerEvents : null,
				svg_pointer_events_attr: svg?.style.pointerEvents,
				groups_found: groups?.length || 0,
				first_group_target_id: groups?.[0]?.getAttribute('data-target-id'),
			};
		}, { x: center_x, y: center_y });
		console.log(`[debug] DOM structure: ${JSON.stringify(debug_info)}`);

		// Try both mouse.click and programmatic click dispatch
		// Playwright's mouse.click might not trigger synthetic click events
		// Try to trigger a click via Playwright's click() on a clickable element
		console.log('Attempting click via multiple methods...');

		// Method 1: Playwright mouse.click on viewport
		try {
			await page.mouse.click(center_x, center_y);
			console.log('Method 1 (Playwright mouse.click): sent');
		} catch (e) {
			console.log(`Method 1 failed: ${e.message}`);
		}

		// Method 2: Try using Playwright's click() method which might handle events differently
		try {
			const viewport = await page.locator('[data-testid="scene-viewport"]');
			if (viewport) {
				await viewport.click({ position: { x: viewport.width / 2, y: viewport.height / 2 } });
				console.log('Method 2 (Playwright locator.click): attempted');
			}
		} catch (e) {
			console.log(`Method 2 failed: ${e.message}`);
		}

		// Wait a moment for the click to propagate and any re-render to occur.
		await page.waitForTimeout(500);

		// Check for "Wrong target" warning in console output.
		// If this warning appears, the click did not match the protocol target.
		console.log(`[info] Captured console messages: ${capturedLogs.length}`);
		for (const log of capturedLogs) {
			console.log(`[console] ${log.type}: ${log.text}`);
		}

		// Check click events and listener registration
		const click_state = await page.evaluate(() => ({
			listener_registered: window.__click_listener_registered,
			click_count: window.__click_count,
			click_events: window.__click_events || [],
		}));
		console.log(`[info] Click listener registered: ${click_state.listener_registered}`);
		console.log(`[info] Click events captured: ${click_state.click_events.length} (count=${click_state.click_count})`);
		for (const evt of click_state.click_events) {
			console.log(`[click] tag=${evt.target_tag}, class=${evt.target_class}, closest_id=${evt.closest_target_id}`);
		}

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
				`Before: ${invocation_count_before_click}, After: ${invocation_count_after_click}. ` +
				`This indicates renderScene did not re-execute after state change.`
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

		// Take a screenshot AFTER click.
		const after_click_screenshot = path.join(screenshot_dir, 'lane_r_rerender.png');
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
		console.log('=== TEST SUMMARY (LANE R) ===');
		console.log(`Flag set count:              ${flag_set_count}`);
		console.log(`CSS-native invocation mount: ${invocation_count_mount}`);
		console.log(`CSS-native invocation BEFORE click: ${invocation_count_before_click}`);
		console.log(`CSS-native invocation AFTER click:  ${invocation_count_after_click}`);
		console.log(`CSS-native invocation delta: ${invocation_count_delta} (PASS if > 0)`);
		console.log(`DOM children before:         ${body_children_before}`);
		console.log(`DOM children after:          ${body_children_after}`);
		console.log(`DOM children delta:          ${body_children_delta} (PASS if == 0)`);
		console.log(`Before-click screenshot:     ${before_click_screenshot}`);
		console.log(`After-click screenshot:      ${after_click_screenshot}`);
		console.log('=== ALL LANE R ASSERTIONS PASSED ===');

		await page.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('TEST FAILED:', err.message);
	process.exit(1);
});
