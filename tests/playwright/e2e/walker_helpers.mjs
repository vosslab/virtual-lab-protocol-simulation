// tests/walker_helpers.mjs
//
// Reusable Playwright helper functions for YAML-driven protocol walkers.
// Provides: click/wait/report patterns for game state readiness, scene switching,
// and structured logging.
//
// All functions read gameState only (no writes). All errors throw clearly.

//============================================
// Readiness helpers - wait for observable game state signals
//============================================

// Wait until the given step id appears in completedSteps.
export async function waitForStepCompleted(page, stepId, timeoutMs = 30000) {
	await page.waitForFunction(
		(id) => {
			const state = window.gameState;
			return state && state.completedSteps && state.completedSteps.includes(id);
		},
		stepId,
		{ timeout: timeoutMs }
	);
}

// Wait until heldLiquid.tool and heldLiquid.liquid match expected values.
export async function waitForHeldLiquid(page, expectedTool, expectedLiquid, timeoutMs = 3000) {
	await page.waitForFunction(
		({ expectedTool, expectedLiquid }) => {
			const state = window.gameState;
			if (!state || !state.heldLiquid) return false;
			return state.heldLiquid.tool === expectedTool && state.heldLiquid.liquid === expectedLiquid;
		},
		{ expectedTool, expectedLiquid },
		{ timeout: timeoutMs }
	);
}

// Check if the tool precondition for an interaction is already met.
// Mirrors dispatchInteractionClick's logic: heldLiquid is derived from selectedTool
// (via deriveHeldLiquid), so only check selectedTool canonical form.
// Do NOT read gameState.heldLiquid directly -- it may be stale from a prior step.
export async function isToolPreconditionMet(page, interactionTool) {
	if (!interactionTool) return true;
	return await page.evaluate((tool) => {
		const state = window.gameState;
		if (!state) return false;
		// Only check selectedTool (canonical form); heldLiquid is derived from selectedTool
		const sel = state.selectedTool;
		if (!sel) return false;
		const idx = sel.indexOf('_with_');
		const canonical = idx >= 0 ? sel.substring(0, idx) : sel;
		return canonical === tool;
	}, interactionTool);
}

// Wait until the scene is active.
export async function waitForActiveScene(page, sceneName, timeoutMs = 5000) {
	await page.waitForFunction(
		(scene) => {
			const state = window.gameState;
			return state && state.activeScene === scene;
		},
		sceneName,
		{ timeout: timeoutMs }
	);
}

// Wait until the instrument overlay is active.
export async function waitForMicroscopeOpen(page, timeoutMs = 3000) {
	await page.waitForFunction(
		() => {
			const overlay = document.getElementById('instrument-overlay');
			return overlay && overlay.classList.contains('active');
		},
		{ timeout: timeoutMs }
	);
}

// Wait until the incubator overlay is not active (animation complete).
export async function waitForIncubationComplete(page, timeoutMs = 10000) {
	await page.waitForFunction(
		() => {
			const overlay = document.getElementById('incubator-screen');
			return !overlay || !overlay.classList.contains('active');
		},
		{ timeout: timeoutMs }
	);
}

//============================================
// Scene switching helpers
//============================================

// Switch to bench scene via the "To Bench" button and wait.
export async function switchToBench(page, report) {
	const currentScene = await page.evaluate(() => window.gameState.activeScene);
	if (currentScene === 'bench') return;

	report.info('Switching to bench scene');
	// The "To Bench" button is rendered in the hood scene
	const toBenchBtn = page.locator('#hood-to-bench-btn').first();
	if ((await toBenchBtn.count()) === 0) {
		throw new Error('To Bench button not found in DOM; cannot switch scene without a real click');
	}
	await toBenchBtn.click();
	await waitForActiveScene(page, 'bench', 3000);
	report.info('Now on bench scene');
}

// Switch to hood scene via the "To Hood" button and wait.
export async function switchToHood(page, report) {
	const currentScene = await page.evaluate(() => window.gameState.activeScene);
	if (currentScene === 'hood') return;

	report.info('Switching to hood scene');
	// The "To Hood" button is rendered in the bench scene
	const toHoodBtn = page.locator('#bench-to-hood-btn').first();
	if ((await toHoodBtn.count()) === 0) {
		throw new Error('To Hood button not found in DOM; cannot switch scene without a real click');
	}
	await toHoodBtn.click();
	await waitForActiveScene(page, 'hood', 3000);
	report.info('Now on hood scene');
}

// Switch to well_plate_workspace scene by clicking well_plate in the hood and waiting.
export async function switchToPlate(page, report) {
	const currentScene = await page.evaluate(() => window.gameState.activeScene);
	if (currentScene === 'well_plate_workspace') return;

	report.info('Switching to well_plate_workspace scene');
	// Switch to hood first if not there
	if (currentScene !== 'hood') {
		await switchToHood(page, report);
	}

	// Click well_plate to trigger scene switch to well_plate_workspace
	const wellPlateLocator = page.locator('[data-item-id="well_plate"]').first();
	if ((await wellPlateLocator.count()) === 0) {
		throw new Error('well_plate not found in hood; cannot switch to well_plate_workspace scene without a real click');
	}
	await wellPlateLocator.click();
	await waitForActiveScene(page, 'well_plate_workspace', 3000);
	report.info('Now on well_plate_workspace scene');
}

//============================================
// Selector and click helpers
//============================================

// Resolve data-item-id selector.
export function resolveSelector(itemId) {
	return `[data-item-id="${itemId}"]`;
}

// Resolve scene-scoped data-item-id selector.
// When a step is scene-specific (scene: 'well_plate_workspace', 'bench', 'hood', 'plate_reader'),
// this function scopes the item locator to the correct scene container.
// Returns the scoped selector (e.g., '#well_plate_workspace-scene [data-item-id="multichannel_pipette"]').
// plate_reader items live in the bench scene DOM (they're not in a separate container).
export function resolveScopedSelector(itemId, scene) {
	const sceneSelector = scene === 'well_plate_workspace' ? '#well_plate_workspace-scene'
		: scene === 'bench' ? '#bench-scene'
		: scene === 'plate_reader' ? '#bench-scene'
		: '#hood-scene';
	return `${sceneSelector} [data-item-id="${itemId}"]`;
}

// Click an item and wait for progress signal.
// Optional clickBudgetMs parameter (default 3000ms) can be overridden by caller.
// Optional scene parameter scopes the item to a specific scene container (e.g., 'well_plate_workspace', 'bench', 'hood').
export async function clickItemAndWaitProgress(page, itemId, report, clickBudgetMs = 3000, scene = null) {
	const selector = scene !== null ? resolveScopedSelector(itemId, scene) : resolveSelector(itemId);
	const locator = page.locator(selector).first();

	// Verify element exists and is visible
	const elementCount = await locator.count();
	if (elementCount === 0) {
		throw new Error(`Element ${selector} does not exist in DOM`);
	}
	const isVisible = await locator.isVisible();
	if (!isVisible) {
		throw new Error(`Element ${selector} is not visible`);
	}

	// Get initial state
	const initialState = await page.evaluate(() => {
		const state = window.gameState;
		return {
			interactionIndex: state.interactionIndex,
			selectedTool: state.selectedTool,
			heldLiquid: JSON.stringify(state.heldLiquid),
			activeStepId: state.activeStepId,
			activeScene: state.activeScene,
			completedStepsCount: (state.completedSteps || []).length,
		};
	});

	// Click the element
	await locator.click();
	report.summary.totalClicks++;
	report.info(`Clicked ${itemId}`);

	// Wait for any state progress
	try {
		await page.waitForFunction((initState) => {
			const state = window.gameState;
			if (state.selectedTool !== initState.selectedTool) return true;
			if (JSON.stringify(state.heldLiquid) !== initState.heldLiquid) return true;
			if (state.interactionIndex !== initState.interactionIndex) return true;
			if (state.activeStepId !== initState.activeStepId) return true;
			if (state.activeScene !== initState.activeScene) return true;
			if ((state.completedSteps || []).length > initState.completedStepsCount) return true;
			return false;
		}, initialState, { timeout: clickBudgetMs });
	} catch (err) {
		throw new Error(`click_did_not_advance: click on ${itemId} produced no state change after ${clickBudgetMs}ms`);
	}

	report.info(`Click on ${itemId} progressed`);
}

//============================================
// Report logging helpers
//============================================

// Record info-level message to report.
export function recordInfo(report, message) {
	report.info(message);
}

// Record warn-level message to report.
export function recordWarn(report, message) {
	report.warn(message);
}

// Record error-level message to report.
export function recordError(report, stepId, kind, evidence) {
	const message = `[${kind}] ${evidence}`;
	report.error(message, { stepId });
}

// Record injection-level message to report.
// Distinct from info so injection records are grep-able in report.
export function recordInjection(report, stepId, itemId) {
	const message = `[injection] step ${stepId}: clicked wrong-order item ${itemId}`;
	report.addEntry('injection', message, { stepId, injectedItemId: itemId });
}

//============================================
// Wrong-order item picker
//============================================

// Pick a clickable wrong-order item from the active scene.
// Strategy: find any visible data-item-id element that is NOT in the
// required-interaction set (tool, source, destination).
// This ensures we click something valid and on-scene but not the expected
// next click.
export async function pickWrongOrderItem(page, requiredItemIds) {
	const wrongItem = await page.evaluate((required) => {
		// Find all visible data-item-id elements in the active scene
		const allItems = document.querySelectorAll('[data-item-id]');
		const requiredSet = new Set(required);

		for (const elem of allItems) {
			const itemId = elem.getAttribute('data-item-id');
			// Skip if this is one of the required items
			if (requiredSet.has(itemId)) {
				continue;
			}
			// Check visibility
			const style = window.getComputedStyle(elem);
			const rect = elem.getBoundingClientRect();
			if (style.display === 'none' || style.visibility === 'hidden') {
				continue;
			}
			if (rect.width === 0 || rect.height === 0) {
				continue;
			}
			// Found a clickable item that is not required
			return itemId;
		}
		return null;
	}, requiredItemIds);

	return wrongItem;
}
