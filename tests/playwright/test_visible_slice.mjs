/**
 * tests/playwright/test_visible_slice.mjs
 *
 * Playwright test for WP-VISIBLE-SLICE-1: one object, one click, one state change.
 *
 * Acceptance criteria:
 * - Bundle builds in under 5 seconds.
 * - One scene renders with one object (media_bottle) carrying data-target-id.
 * - Clicking the object triggers an ObjectStateChange (material_name toggles).
 * - The DOM visibly changes after the click (asset variant or attribute change).
 * - Before/after screenshots captured to test-results/_smoke/.
 * - Test exits in under 5 seconds total.
 *
 * Usage: node tests/playwright/test_visible_slice.mjs
 * Exit code: 0 on success, 1 on failure.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { REPO_ROOT } from './repo_root.mjs';

//============================================
// Build the runtime bundle
//============================================

async function buildBundle() {
	console.log('Building runtime bundle...');

	// Use the built-in Node child_process to run the build script.
	const { execSync } = await import('node:child_process');

	try {
		const output = execSync('bash pipeline/build_runtime_bundle.sh', {
			cwd: REPO_ROOT,
			encoding: 'utf-8',
		});
		console.log(output);
	} catch (err) {
		console.error('Bundle build failed:', err.message);
		throw err;
	}

	// Verify the bundle exists.
	const bundlePath = path.join(REPO_ROOT, 'dist', 'runtime.bundle.js');
	if (!fs.existsSync(bundlePath)) {
		throw new Error(`Bundle not found: ${bundlePath}`);
	}

	console.log(`Bundle ready: ${bundlePath}`);
}

//============================================
// Generate HTML from template and fixture
//============================================

function generateHtml() {
	console.log('Generating HTML from template and fixture...');

	const templatePath = path.join(
		REPO_ROOT,
		'tests/playwright/fixtures/_smoke_one_object.html.template'
	);
	const fixturePath = path.join(
		REPO_ROOT,
		'tests/playwright/smoke_fixtures/one_object.json'
	);
	const bundlePath = path.join(REPO_ROOT, 'dist', 'runtime.bundle.js');

	if (!fs.existsSync(templatePath)) {
		throw new Error(`Template not found: ${templatePath}`);
	}
	if (!fs.existsSync(fixturePath)) {
		throw new Error(`Fixture not found: ${fixturePath}`);
	}
	if (!fs.existsSync(bundlePath)) {
		throw new Error(`Bundle not found: ${bundlePath}`);
	}

	// Read the fixture and serialize it.
	const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
	const fixtureJson = JSON.stringify(fixtureData);

	// Read the bundle (esbuild output as ESM).
	const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

	// Read the template and inject the fixture data and bundle.
	let htmlContent = fs.readFileSync(templatePath, 'utf-8');
	htmlContent = htmlContent.replace('{RUNTIME_DATA_PLACEHOLDER}', fixtureJson);
	htmlContent = htmlContent.replace('{BUNDLE_CODE_PLACEHOLDER}', bundleCode);

	// Write the generated HTML.
	const outputDir = path.join(REPO_ROOT, 'dist');
	fs.mkdirSync(outputDir, { recursive: true });

	const outputPath = path.join(outputDir, '_smoke_one_object.html');
	fs.writeFileSync(outputPath, htmlContent);

	console.log(`Generated HTML: ${outputPath}`);

	return `file://${outputPath}`;
}

//============================================
// Run the Playwright test
//============================================

async function runTest() {
	console.log('Starting WP-VISIBLE-SLICE-1 smoke test...');

	// Build the bundle.
	await buildBundle();

	// Generate the HTML.
	const htmlUrl = generateHtml();

	// Create screenshot directory.
	const screenshotDir = path.join(REPO_ROOT, 'test-results', '_smoke');
	fs.mkdirSync(screenshotDir, { recursive: true });

	// Launch browser.
	console.log('Launching browser...');
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

	// Capture console logs and errors.
	page.on('console', (msg) => {
		console.log(`[BROWSER_LOG] ${msg.type()}: ${msg.text()}`);
	});
	page.on('pageerror', (err) => {
		console.error(`[BROWSER_ERROR] ${err.message}`);
	});

	try {
		// Load the HTML.
		console.log(`Loading ${htmlUrl}...`);
		await page.goto(htmlUrl, { waitUntil: 'networkidle' });

		// Wait briefly for the scene to render.
		await page.waitForTimeout(500);

		// Debug: Check for any errors on the page.
		const errorDiv = await page.locator('#debug-render-status').textContent().catch(() => 'NOT FOUND');
		console.log(`Debug render status: ${errorDiv}`);

		// Debug: Log the actual HTML structure.
		const pageContent = await page.content();
		const hasSceneContainer = pageContent.includes('id="scene-container"');
		const hasSvg = pageContent.includes('<svg');
		console.log(`Page has scene-container: ${hasSceneContainer}, has <svg: ${hasSvg}`);

		// Take a screenshot before clicking.
		const beforePath = path.join(screenshotDir, '01_before_click.png');
		await page.screenshot({ path: beforePath });
		console.log(`Screenshot (before): ${beforePath}`);

		// Verify the media_bottle element is present and get its bounding box.
		// The element is an SVG <g> inside the scene container.
		// We need to find it by looking for the SVG group with data-target-id attribute.
		const svgLocator = page.locator('svg');
		const svgCount = await svgLocator.count();
		console.log(`SVG elements found: ${svgCount}`);

		if (svgCount === 0) {
			throw new Error('No SVG element found in container');
		}

		// Query for the group element with data-target-id="media_bottle".
		const targetLocator = page.locator('svg > g[data-target-id="media_bottle"]');
		const count = await targetLocator.count();

		if (count === 0) {
			throw new Error('media_bottle element not found (looking for svg > g[data-target-id="media_bottle"])');
		}

		console.log(`Found media_bottle element: ${count} match(es)`);

		// Get the bounding box before click.
		const boxBefore = await targetLocator.first().boundingBox();
		console.log(`Before click bounding box: ${JSON.stringify(boxBefore)}`);

		// Check attribute changes (e.g., fill color on the rect child) before click.
		const fillBefore = await targetLocator.first().evaluate((el) => {
			const rect = el.querySelector('rect');
			return rect ? rect.getAttribute('fill') : null;
		}).catch(() => null);

		console.log(`Fill before click: ${fillBefore}`);

		// Click the media_bottle to toggle its state.
		console.log('Clicking media_bottle...');
		await targetLocator.first().click();

		// Wait for re-render.
		await page.waitForTimeout(300);

		// Get the bounding box after click (may have changed if SVG swap occurred).
		const boxAfter = await targetLocator.first().boundingBox();
		console.log(`After click bounding box: ${JSON.stringify(boxAfter)}`);

		// Check attribute changes (e.g., fill color on the rect child) after click.
		const fillAfter = await targetLocator.first().evaluate((el) => {
			const rect = el.querySelector('rect');
			return rect ? rect.getAttribute('fill') : null;
		}).catch(() => null);

		console.log(`Fill after click:  ${fillAfter}`);

		// Check if the DOM changed (bounding box, attribute, or content).
		// For svg_swap on material_name, the asset variant may change rendering.
		let domChanged = false;

		// Check bounding box change.
		if (boxBefore && boxAfter) {
			const positionChanged =
				Math.abs(boxBefore.x - boxAfter.x) > 1 ||
				Math.abs(boxBefore.y - boxAfter.y) > 1;
			const sizeChanged =
				Math.abs(boxBefore.width - boxAfter.width) > 1 ||
				Math.abs(boxBefore.height - boxAfter.height) > 1;

			if (positionChanged || sizeChanged) {
				console.log('DOM changed: bounding box differs');
				domChanged = true;
			}
		}

		if (fillBefore && fillAfter && fillBefore !== fillAfter) {
			console.log(`DOM changed: fill attribute changed (${fillBefore} -> ${fillAfter})`);
			domChanged = true;
		}

		// CRITICAL: No visual delta = test failure (not a warning).
		if (!domChanged) {
			throw new Error('FAILURE: No visual DOM delta detected after state change. Fill attribute must change on visual_states.material_name svg_swap.');
		}

		console.log('Assertion passed: DOM delta confirmed');

		// Take a screenshot after clicking.
		const afterPath = path.join(screenshotDir, '02_after_click.png');
		await page.screenshot({ path: afterPath });
		console.log(`Screenshot (after): ${afterPath}`);

		// Verify both screenshots exist.
		if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
			throw new Error('Screenshot files not created');
		}

		console.log('\nSUCCESS: WP-VISIBLE-SLICE-1 smoke test passed');
		return 0;
	} catch (err) {
		console.error('\nFAILURE:', err.message);
		return 1;
	} finally {
		await browser.close();
	}
}

//============================================
// Main
//============================================

const startTime = Date.now();

runTest()
	.then(code => {
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`\nTest completed in ${elapsed}s`);
		process.exit(code);
	})
	.catch(err => {
		console.error('Test error:', err);
		process.exit(1);
	});
