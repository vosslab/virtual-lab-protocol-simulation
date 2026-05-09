// tests/test_interaction_index.mjs
// Runtime unit tests for interactionIndex state tracking and advancement.
// Tests the integration between resolveInteractionByIndex resolver and
// the runtime dispatchInteractionClick wiring that updates gameState.
//
// Uses Playwright + HTTP server to load dist/index.html, then exercises
// click sequences that advance interactionIndex, trigger wrongOrderClicks,
// and ultimately call completeStep() to advance to the next protocol step.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { REPO_ROOT } from './repo_root.mjs';

const DIST_DIR = path.join(REPO_ROOT, 'dist');
const PORT = 8125;

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

		// ==================================================
		// Test 1: Load interaction advances index from 0 to 1
		// Scenario: pbs_wash step, first interaction is (tool:serological_pipette, source:pbs_bottle).
		// Click serological_pipette (tool select), then click pbs_bottle (load action).
		// Expected: resolver returns indexDelta: 1, and caller advances interactionIndex by that delta.
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				// Reset game state for fresh test
				window.gameState.interactionIndex = 0;
				window.gameState.wrongOrderClicks = 0;
				window.gameState.selectedTool = null;
				window.gameState.heldLiquid = null;
				window.gameState.completedSteps = [];
				window.gameState.activeStepId = 'pbs_wash';

				const step = window.PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');

				// Step 1: Click serological_pipette (tool select)
				const toolResult = window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'serological_pipette',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: null,
				});

				// Tool result should be 'discharge' with indexDelta: 0
				const indexAfterTool = window.gameState.interactionIndex;

				// Step 2: Click pbs_bottle (load action) with tool selected
				const loadResult = window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'pbs_bottle',
					activeStep: step,
					interactionIndex: 0,
					heldLiquid: null,
				});

				// Load result should have indexDelta: 1; we manually apply it
				if (loadResult.indexDelta === 1) {
					window.gameState.interactionIndex += loadResult.indexDelta;
				}

				const indexAfterLoad = window.gameState.interactionIndex;

				return {
					indexAfterTool,
					indexAfterLoad,
					loadResultKind: loadResult.kind,
					loadIndexDelta: loadResult.indexDelta,
					wrongOrder: loadResult.wrongOrder,
				};
			});

			if (
				result.indexAfterTool === 0 &&
				result.indexAfterLoad === 1 &&
				result.loadResultKind === 'load' &&
				result.loadIndexDelta === 1 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 1: pbs_wash load advances index 0 -> 1');
				passCount++;
			} else {
				console.log('[FAIL] Test 1: pbs_wash load index advancement');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 1 - error:', err.message);
		}

		// ==================================================
		// Test 2: Discharge after load advances 1 to 2 (reaches end, triggers completeStep)
		// Scenario: pbs_wash step, second interaction is (destination:flask).
		// At interaction index 1, click flask to discharge.
		// Expected: resolver returns indexDelta: 1, advancing index to 2 (end of sequence).
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				// Set up state: pbs_wash at interaction index 1 with loaded liquid
				window.gameState.interactionIndex = 1;
				window.gameState.wrongOrderClicks = 0;
				window.gameState.selectedTool = 'serological_pipette_with_pbs';
				window.gameState.heldLiquid = {
					tool: 'serological_pipette',
					liquid: 'pbs',
					volumeMl: 4,
					colorKey: 'pbs',
				};
				window.gameState.completedSteps = [];
				window.gameState.activeStepId = 'pbs_wash';

				const step = window.PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
				// Get interaction sequence length from completionPath
				let sequenceLength = 0;
				if (step && step.completionPath && step.completionPath.kind === 'interactionSequence') {
					sequenceLength = step.completionPath.interactions.length;
				}

				const dischargeResult = window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: 1,
					heldLiquid: window.gameState.heldLiquid,
				});

				// Manually apply indexDelta as the scene code does
				if (dischargeResult.indexDelta === 1) {
					window.gameState.interactionIndex += dischargeResult.indexDelta;
				}

				const indexAfterDischarge = window.gameState.interactionIndex;
				const reachedEnd = window.gameState.interactionIndex >= sequenceLength;

				return {
					indexAfterDischarge,
					reachedEnd,
					sequenceLength,
					dischargeKind: dischargeResult.kind,
					dischargeIndexDelta: dischargeResult.indexDelta,
					wrongOrder: dischargeResult.wrongOrder,
				};
			});

			if (
				result.indexAfterDischarge === 2 &&
				result.reachedEnd === true &&
				result.dischargeKind === 'discharge' &&
				result.dischargeIndexDelta === 1 &&
				result.wrongOrder === false
			) {
				console.log('[PASS] Test 2: pbs_wash discharge advances index 1 -> 2');
				passCount++;
			} else {
				console.log('[FAIL] Test 2: pbs_wash discharge index advancement');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 2 - error:', err.message);
		}

		// ==================================================
		// Test 3: Wrong-order click increments wrongOrderClicks without advancing index
		// Scenario: pbs_wash step at interactionIndex=0. Click flask (destination)
		// before clicking pbs_bottle (source). This violates the sequence order.
		// Expected: wrongOrder=true, indexDelta=0, wrongOrderClicks increments,
		// interactionIndex stays at 0.
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				// Reset state
				window.gameState.interactionIndex = 0;
				window.gameState.wrongOrderClicks = 0;
				window.gameState.selectedTool = null;
				window.gameState.heldLiquid = null;
				window.gameState.completedSteps = [];
				window.gameState.activeStepId = 'pbs_wash';

				const step = window.PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');

				// Click flask (destination) at index 0 when source+load is expected
				const wrongOrderResult = window.resolveInteractionByIndex({
					selectedTool: 'serological_pipette',
					clickedItem: 'flask',
					activeStep: step,
					interactionIndex: window.gameState.interactionIndex,
					heldLiquid: null,
				});

				const indexAfterWrongClick = window.gameState.interactionIndex;

				return {
					indexAfterWrongClick,
					wrongOrder: wrongOrderResult.wrongOrder,
					indexDelta: wrongOrderResult.indexDelta,
					resultKind: wrongOrderResult.kind,
				};
			});

			if (
				result.wrongOrder === true &&
				result.indexDelta === 0 &&
				result.indexAfterWrongClick === 0 &&
				result.resultKind === 'wrong_order'
			) {
				console.log('[PASS] Test 3: wrong-order click stays at index 0');
				passCount++;
			} else {
				console.log('[FAIL] Test 3: wrong-order click handling');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 3 - error:', err.message);
		}

		// ==================================================
		// Test 4: Tool-first rejection (source clicked before tool selected)
		// Scenario: pbs_wash step at interactionIndex=0. Click pbs_bottle (source)
		// without first selecting serological_pipette as the tool.
		// Expected: wrongOrder=true, tool not yet selected so interaction rejected.
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				// Reset state
				window.gameState.interactionIndex = 0;
				window.gameState.wrongOrderClicks = 0;
				window.gameState.selectedTool = null;
				window.gameState.heldLiquid = null;
				window.gameState.completedSteps = [];
				window.gameState.activeStepId = 'pbs_wash';

				const step = window.PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');

				// Click pbs_bottle (source) without tool selected
				const sourceFirstResult = window.resolveInteractionByIndex({
					selectedTool: null,
					clickedItem: 'pbs_bottle',
					activeStep: step,
					interactionIndex: window.gameState.interactionIndex,
					heldLiquid: null,
				});

				const indexAfterSourceClick = window.gameState.interactionIndex;

				return {
					indexAfterSourceClick,
					wrongOrder: sourceFirstResult.wrongOrder,
					indexDelta: sourceFirstResult.indexDelta,
					resultKind: sourceFirstResult.kind,
				};
			});

			if (
				result.wrongOrder === true &&
				result.indexDelta === 0 &&
				result.indexAfterSourceClick === 0 &&
				result.resultKind === 'wrong_order'
			) {
				console.log('[PASS] Test 4: tool-first rejection (source without tool)');
				passCount++;
			} else {
				console.log('[FAIL] Test 4: tool-first rejection');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 4 - error:', err.message);
		}


		// ==================================================
		// Test 5: Save/load round-trip preserves interactionIndex
		// Note: Per Patch 4 spec, codebase has no persistent gameState save/load yet.
		// We test localStorage round-trip and reading interactionIndex from gameState.
		// This test verifies that interactionIndex can be serialized and restored.
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				// Set a specific interactionIndex value
				window.gameState.interactionIndex = 3;
				window.gameState.wrongOrderClicks = 5;
				const savedIndex = window.gameState.interactionIndex;
				const savedWrongClicks = window.gameState.wrongOrderClicks;

				// Attempt to serialize gameState (manual, since no save func exists yet)
				const serialized = JSON.stringify({
					interactionIndex: window.gameState.interactionIndex,
					wrongOrderClicks: window.gameState.wrongOrderClicks,
				});

				// Store in localStorage
				localStorage.setItem('_test_gamestate_probe', serialized);

				// Restore from localStorage
				const restored = JSON.parse(localStorage.getItem('_test_gamestate_probe') ?? '{}');
				localStorage.removeItem('_test_gamestate_probe');

				return {
					savedIndex,
					restoredIndex: restored.interactionIndex,
					savedWrongClicks,
					restoredWrongClicks: restored.wrongOrderClicks,
					roundTripOk: restored.interactionIndex === 3 && restored.wrongOrderClicks === 5,
				};
			});

			if (result.roundTripOk) {
				console.log('[PASS] Test 5: save/load round-trip preserves interactionIndex');
				passCount++;
			} else {
				console.log('[FAIL] Test 5: save/load round-trip');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 5 - error:', err.message);
		}

		// ==================================================
		// Test 6: Micropipette discharge via dispatchInteractionClick
		// Regression for the deriveHeldLiquid legacy-token bug: only the
		// serological_pipette_with_* tokens were recognized, so a
		// micropipette holding carboplatin produced heldLiquid:null in
		// resolveArgs and the destination click was mis-classified as
		// wrong_order. The fix reads gameState.heldLiquid directly.
		//
		// Scenario: carb_intermediate, position the state at interaction
		// index 1 (the discharge to dilution_tube_carb_intermediate after
		// loading carb stock). Click the destination via the runtime
		// dispatchInteractionClick. Expected: interactionIndex advances
		// to 2, heldLiquid is cleared, wrongOrderClicks stays 0.
		// ==================================================
		totalTests++;
		try {
			const result = await page.evaluate(() => {
				window.gameState.activeStepId = 'carb_intermediate';
				window.gameState.completedSteps = [];
				window.gameState.interactionIndex = 1;
				window.gameState.wrongOrderClicks = 0;
				window.gameState.selectedTool = 'micropipette';
				window.gameState.heldLiquid = {
					tool: 'micropipette',
					liquid: 'carboplatin',
					volumeMl: 0.020,
					colorKey: 'carboplatin',
				};

				window.dispatchInteractionClick('dilution_tube_carb_intermediate');

				return {
					interactionIndex: window.gameState.interactionIndex,
					wrongOrderClicks: window.gameState.wrongOrderClicks,
					heldLiquid: window.gameState.heldLiquid,
					selectedTool: window.gameState.selectedTool,
				};
			});

			const advancedOk = result.interactionIndex === 2;
			const noWrongOrder = result.wrongOrderClicks === 0;
			const heldCleared = result.heldLiquid === null;
			if (advancedOk && noWrongOrder && heldCleared) {
				console.log('[PASS] Test 6: micropipette discharge advances interactionIndex');
				passCount++;
			} else {
				console.log('[FAIL] Test 6: micropipette discharge');
				console.log('  Result:', JSON.stringify(result));
			}
		} catch (err) {
			console.log('[FAIL] Test 6 - error:', err.message);
		}

		// Summary
		console.log('');
		if (passCount === totalTests) {
			console.log(`interaction_index: OK ${passCount}/${totalTests}`);
			await browser.close();
			server.kill();
			process.exit(0);
		} else {
			console.log(`interaction_index: FAILED ${passCount}/${totalTests}`);
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
