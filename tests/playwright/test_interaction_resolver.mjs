// tests/test_interaction_resolver.mjs
// Test the resolveInteractionByIndex function with Playwright.
// Uses HTTP server to load dist/index.html, then runs tests via page.evaluate.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { REPO_ROOT } from './repo_root.mjs';

const DIST_DIR = path.join(REPO_ROOT, 'dist');
const PORT = 8124;

function startServer() {
	const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIST_DIR], {
		stdio: ['ignore', 'pipe', 'pipe'],
		cwd: REPO_ROOT,
	});
	return proc;
}

async function waitForServer(url, maxMs = 5000) {
	const deadline = Date.now() + maxMs;
	while (Date.now() < deadline) {
		try {
			const resp = await fetch(url);
			if (resp.ok) return;
		} catch {
			// keep retrying
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error('server never came up');
}

async function runTests() {
	const server = startServer();
	let serverDied = null;
	server.on('exit', (code) => {
		serverDied = code;
	});

	try {
		await waitForServer(`http://127.0.0.1:${PORT}/index.html`);
	} catch (err) {
		console.error('server startup failed:', err.message);
		server.kill();
		process.exit(1);
	}

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

	let passCount = 0;
	let totalTests = 0;

	try {
		await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(500);

		// Test 1: load interaction (source only) - tool click first (indexDelta: 0)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				return window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'serological_pipette',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (
				result.kind === 'discharge' &&
				result.indexDelta === 0 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 1: pbs_wash tool click (indexDelta: 0)');
				passCount++;
			} else {
				console.log('[FAIL] Test 1: pbs_wash tool click');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 1 - error:', err.message);
		}

		// Test 2: load interaction (source only) - source click with tool ready (indexDelta: 1)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				return window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'pbs_bottle',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (
				result.kind === 'load' &&
				result.resultActor === 'serological_pipette' &&
				result.resultLiquid === 'pbs' &&
				result.volumeMl === 4 &&
				result.indexDelta === 1 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 2: pbs_wash source click with tool ready (indexDelta: 1)');
				passCount++;
			} else {
				console.log('[FAIL] Test 2: pbs_wash source click with tool ready');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 2 - error:', err.message);
		}

		// Test 3: load interaction - source click without tool (wrong_order)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				return window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'pbs_bottle',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (
				result.kind === 'wrong_order' &&
				result.indexDelta === 0 &&
				result.wrongOrder === true
			) {
				console.log('[PASS] Test 3: pbs_wash source click without tool (wrong_order)');
				passCount++;
			} else {
				console.log('[FAIL] Test 3: pbs_wash source click without tool');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 3 - error:', err.message);
		}

		// Test 4: discharge interaction - destination click with held liquid (indexDelta: 1)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				return window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: 1,
					heldLiquid: {
						tool: 'serological_pipette',
						liquid: 'pbs',
						volumeMl: 4,
						colorKey: 'pbs',
					},
				});
			});
			if (
				result.kind === 'discharge' &&
				result.destination === 'flask' &&
				result.indexDelta === 1 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 4: pbs_wash destination click with held liquid (indexDelta: 1)');
				passCount++;
			} else {
				console.log('[FAIL] Test 4: pbs_wash destination click with held liquid');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 4 - error:', err.message);
		}


		// Test 5: out-of-bounds index returns no-op
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				return window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: 999,
					heldLiquid: undefined,
				});
			});
			if (result.kind === 'no-op') {
				console.log('[PASS] Test 5: out-of-bounds index returns no-op');
				passCount++;
			} else {
				console.log('[FAIL] Test 5: out-of-bounds index');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 5 - error:', err.message);
		}

		// Test 6: step without interactionSequence returns no-op (directTool and modal kinds not handled)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'count_cells');
				return window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (result.kind === 'no-op') {
				console.log('[PASS] Test 6: step without interactionSequence returns no-op');
				passCount++;
			} else {
				console.log('[FAIL] Test 6: step without interactionSequence');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 6 - error:', err.message);
		}

		// Test 7: directTool step returns no-op (spray_hood, not handled by resolver)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'spray_hood');
				return window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'ethanol_bottle',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (result.kind === 'no-op') {
				console.log('[PASS] Test 7: directTool step returns no-op (not resolver scope)');
				passCount++;
			} else {
				console.log('[FAIL] Test 7: directTool step handling');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 7 - error:', err.message);
		}

		// Test 8: aspirate_old_media (source+destination) - tool click first (indexDelta: 0)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'aspirate_old_media');
				return window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'aspirating_pipette',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (
				result.kind === 'discharge' &&
				result.indexDelta === 0 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 8: aspirate_old_media tool click (indexDelta: 0)');
				passCount++;
			} else {
				console.log('[FAIL] Test 8: aspirate_old_media tool click');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 8 - error:', err.message);
		}

		// Test 9: aspirate_old_media (source+destination) - source click with tool ready (indexDelta: 1)
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				const step = PROTOCOL_STEPS.find(s => s.id === 'aspirate_old_media');
				return window.resolveInteractionByIndex({
					selectedTool: 'aspirating_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: undefined,
				});
			});
			if (
				result.kind === 'discharge' &&
				result.destination === 'waste_container' &&
				result.indexDelta === 1 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 9: aspirate_old_media source click with tool ready (indexDelta: 1)');
				passCount++;
			} else {
				console.log('[FAIL] Test 9: aspirate_old_media source click with tool ready');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 9 - error:', err.message);
		}

		// Summary
		console.log('');
		if (passCount === totalTests) {
			console.log(`interaction_resolver: OK ${passCount}/${totalTests}`);
			await browser.close();
			server.kill();
			process.exit(0);
		} else {
			console.log(`interaction_resolver: FAILED ${passCount}/${totalTests}`);
			await browser.close();
			server.kill();
			process.exit(1);
		}
	} catch (err) {
		console.error('Test error:', err);
		await browser.close();
		server.kill();
		process.exit(1);
	}
}

runTests().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
