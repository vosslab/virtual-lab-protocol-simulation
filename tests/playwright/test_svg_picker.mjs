// Headless smoke for tools/svg_picker/.
// Starts python3 -m http.server from repo root, opens the picker, asserts
// candidate tile images and the large preview image actually load (naturalWidth > 0).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT } from './repo_root.mjs';

const PORT = 8128;
const URL = `http://127.0.0.1:${PORT}/tools/svg_picker/`;

const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
	cwd: REPO_ROOT,
	stdio: ['ignore', 'pipe', 'pipe'],
});

let exitCode = 0;
try {
	// Give the server a moment to bind.
	await new Promise(r => setTimeout(r, 600));

	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

	const consoleErrors = [];
	page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));
	page.on('console', m => {
		if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
	});

	const failedRequests = [];
	page.on('requestfailed', r => {
		failedRequests.push(`${r.url()} -> ${r.failure()?.errorText}`);
	});
	page.on('response', r => {
		if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
	});

	await page.goto(URL);
	await page.waitForTimeout(1500);

	// Click first target so middle pane and candidate grid populate.
	const firstTarget = page.locator('.target-item').first();
	await firstTarget.click();
	await page.waitForTimeout(800);

	// Screenshot for visual record.
	const shotPath = path.join(REPO_ROOT, 'test-results', 'svg_picker_smoke.png');
	await page.screenshot({ path: shotPath, fullPage: true });
	console.log(`screenshot: ${shotPath}`);

	// Audit images that actually loaded.
	const imgStats = await page.evaluate(() => {
		const imgs = Array.from(document.querySelectorAll('img'));
		const total = imgs.length;
		const loaded = imgs.filter(i => i.complete && i.naturalWidth > 0).length;
		const broken = imgs
			.filter(i => i.complete && i.naturalWidth === 0)
			.slice(0, 5)
			.map(i => i.src);
		return { total, loaded, broken };
	});
	console.log(`images: ${imgStats.loaded}/${imgStats.total} loaded`);
	if (imgStats.broken.length) {
		console.log('sample broken srcs:');
		imgStats.broken.forEach(s => console.log(`  ${s}`));
	}

	if (failedRequests.length) {
		console.log(`failed requests: ${failedRequests.length}`);
		failedRequests.slice(0, 5).forEach(r => console.log(`  ${r}`));
	}
	if (consoleErrors.length) {
		console.log('console errors:');
		consoleErrors.forEach(e => console.log(`  ${e}`));
	}

	// Verify search box keeps focus across multiple keystrokes (regression: full
	// pane re-render used to destroy and recreate the input on every keystroke).
	const searchBox = page.locator('#search-box');
	await searchBox.click();
	await page.keyboard.type('asp', { delay: 50 });
	const searchValue = await searchBox.inputValue();
	const focusedId = await page.evaluate(() => document.activeElement?.id);
	console.log(`search box value="${searchValue}", focused id="${focusedId}"`);
	if (searchValue !== 'asp' || focusedId !== 'search-box') {
		console.error(`FAIL: search focus lost on keystrokes (value="${searchValue}", focus="${focusedId}")`);
		exitCode = 1;
	} else {
		console.log('PASS: search box retains focus across keystrokes');
	}

	if (imgStats.total === 0) {
		console.error('FAIL: no <img> tags rendered');
		exitCode = 1;
	} else if (imgStats.loaded === 0) {
		console.error('FAIL: zero images loaded successfully');
		exitCode = 1;
	} else if (imgStats.loaded < imgStats.total * 0.5) {
		console.error(`FAIL: only ${imgStats.loaded}/${imgStats.total} images loaded`);
		exitCode = 1;
	} else {
		console.log('PASS: picker renders SVG previews');
	}

	await browser.close();
} finally {
	server.kill('SIGTERM');
}

process.exit(exitCode);
