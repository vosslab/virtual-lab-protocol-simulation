// tests/protocol_walkthrough_yaml.mjs
//
// YAML-driven UI walker: real DOM regression test for protocol playthrough.
//
// Conforms to the six rules from the auto-walker spec:
// 1. Click the DOM, never the API. Every state advance comes from real clicks.
// 2. Fresh browser state, normal entry. localStorage.clear(), hard reload, welcome button, start flow.
// 3. Wait for the UI, not for the clock. Playwright waitFor* predicates over fixed timeouts.
// 4. Fail when the UI is broken. Missing/hidden/disabled items, wrong scene fail with clear messages.
// 5. Capture evidence. Per-step screenshots, console errors, network errors, playthrough_report.json.
// 6. Assert the ending. All steps completed, wrongOrderClicks === 0, activeStepId === null, final screen present.
//
// Step category dispatch:
// - interactionSequence non-empty: YAML-driven click plan (tool/source/destination)
// - isIncubation: click incubator on bench, wait for animation to complete
// - modal.owner === 'microscope': open microscope, confirm viability, enter quadrant counts, submit
// - modal.owner === 'drug_treatment': open drug modal, click the advance button
// - modal.owner === 'plate_reader': switch to plate_reader scene, click advance button
// - completionTrigger (prewarm_media): click water_bath on bench
// - completionTrigger (media_adjust): multichannel + media_bottle + well_plate
// - completionTrigger (add_mtt): multichannel + mtt_vial + well_plate
// - completionTrigger (decant_mtt): well_plate + biohazard_decant
// - completionTrigger (add_dmso): multichannel + dmso_bottle + well_plate
// - completionTrigger (plate_read, results): handled via plate_reader scene
//
// Stall detection:
// - Per-click budget: 3000ms. If no progress signal fires, fail with click_did_not_advance.
// - Per-step budget: 30000ms. If step not completed within budget, fail with step_stalled.
// - Whole-run budget: 600000ms (10 min). If exceeded, fail with run_stalled.
// - On any error: write report + final screenshot, close browser cleanly, exit non-zero.
//
// Usage:
//   node tests/protocol_walkthrough_yaml.mjs [OPTIONS]
//
// Options:
//   -p, --protocol NAME    Protocol id under src/content/ to walk (default: cell_culture).
//   --wrong-order          Drive interactions in wrong order (negative test).
//   -h, --help             Show help message and exit.
//
// Output: test-results/walker/ directory with screenshots and playthrough_report.json

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import { REPO_ROOT } from '../repo_root.mjs';

import {
	waitForStepCompleted,
	waitForHeldLiquid,
	isToolPreconditionMet,
	waitForMicroscopeOpen,
	waitForIncubationComplete,
	switchToBench,
	switchToHood,
	resolveSelector,
	clickItemAndWaitProgress,
	recordInfo,
	recordWarn,
	recordError,
	recordInjection,
	pickWrongOrderItem,
} from './walker_helpers.mjs';

const DIST_DIR = path.join(REPO_ROOT, 'dist');
const PORT = 8126;
const RESULTS_DIR = path.join(REPO_ROOT, 'test-results', 'walker');

// Whole-run budget: 10 minutes
const RUN_BUDGET_MS = 600000;
// Per-step budget: 30 seconds
const STEP_BUDGET_MS = 30000;
// Per-click budget: 3 seconds
const CLICK_BUDGET_MS = 3000;

//============================================
// Arg parsing
//============================================

function parseArgs() {
	const args = process.argv.slice(2);
	const result = {
		protocol: 'cell_culture',
		wrongOrder: false,
	};

	// Check for --help or -h first and print usage
	if (args.includes('--help') || args.includes('-h')) {
		const usage = `Usage: node tests/playwright/e2e/protocol_walkthrough_yaml.mjs [OPTIONS]

Walk through a protocol end-to-end in a headless browser, validating that every
step can be completed via real DOM interactions.

Options:
  -p, --protocol NAME    Protocol id under src/content/ to walk (default: cell_culture).
                         Examples: cell_culture, tutorial_hemocytometer_count,
                         tutorial_split, tutorial_cell_counter, tutorial_hood_transfer,
                         tutorial_drug_dilution, tutorial_bench_direct,
                         tutorial_pbs, tutorial_plate_reader.
                         The walker opens /?protocol=NAME against the built catalog.
                         Use the Python wrapper's --list-protocols option to see choices.
      --wrong-order      Drive interactions in the WRONG order (negative test:
                         expects the runtime to reject the click and not advance).
  -h, --help             Show this help message and exit.

Examples:
  node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
  node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_hemocytometer_count
  node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol cell_culture --wrong-order`;
		console.log(usage);
		process.exit(0);
	}

	for (let i = 0; i < args.length; i++) {
		if ((args[i] === '--protocol' || args[i] === '-p') && i + 1 < args.length) {
			result.protocol = args[i + 1];
			i++;
		} else if (args[i] === '--wrong-order') {
			result.wrongOrder = true;
		}
	}

	return result;
}

//============================================
// Server
//============================================

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

//============================================
// Report and logging
//============================================

class WalkerReport {
	constructor() {
		this.timestamp = new Date().toISOString();
		this.protocol = '';
		this.wrongOrderMode = false;
		this.entries = [];
		this.summary = {
			stepsWalked: 0,
			stepsPassed: 0,
			stepsFailed: 0,
			totalClicks: 0,
			failureReason: null,
		};
	}

	addEntry(severity, message, metadata = {}) {
		const entry = {
			timestamp: new Date().toISOString(),
			severity,
			message,
			...metadata,
		};
		this.entries.push(entry);
		const tag = severity.toUpperCase();
		console.log(`[${tag}] ${message}`);
	}

	info(msg, metadata) {
		this.addEntry('info', msg, metadata);
	}

	warn(msg, metadata) {
		this.addEntry('warn', msg, metadata);
	}

	error(msg, metadata) {
		this.addEntry('error', msg, metadata);
	}

	save(filePath) {
		const dirPath = path.dirname(filePath);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
		fs.writeFileSync(filePath, JSON.stringify(this, null, 2));
	}
}





//============================================
// Build click plan from YAML interaction
//============================================

async function buildClickPlan(page, interaction) {
	const plan = [];

	// Validation: completionEvent-only is invalid
	if (!interaction.tool && !interaction.source && !interaction.destination && interaction.completionEvent) {
		throw new Error('Invalid interaction shape: completionEvent only (no tool/source/destination)');
	}

	// Tool only (no source, no destination)
	if (interaction.tool && !interaction.source && !interaction.destination) {
		plan.push({ itemId: interaction.tool, kind: 'tool' });
		return plan;
	}

	// Tool + source, no destination (load)
	if (interaction.tool && interaction.source && !interaction.destination) {
		const preconditionMet = await isToolPreconditionMet(page, interaction.tool);
		if (!preconditionMet) {
			plan.push({ itemId: interaction.tool, kind: 'tool' });
		}
		plan.push({ itemId: interaction.source, kind: 'source' });
		return plan;
	}

	// Tool + destination, no source (discharge/apply)
	if (interaction.tool && !interaction.source && interaction.destination) {
		const preconditionMet = await isToolPreconditionMet(page, interaction.tool);
		if (!preconditionMet) {
			plan.push({ itemId: interaction.tool, kind: 'tool' });
		}
		plan.push({ itemId: interaction.destination, kind: 'destination' });
		return plan;
	}

	// Tool + source + destination (pass-through): click tool then source
	if (interaction.tool && interaction.source && interaction.destination) {
		plan.push({ itemId: interaction.tool, kind: 'tool' });
		plan.push({ itemId: interaction.source, kind: 'source' });
		return plan;
	}

	// Destination only
	if (!interaction.tool && !interaction.source && interaction.destination) {
		plan.push({ itemId: interaction.destination, kind: 'destination' });
		return plan;
	}

	throw new Error('Unable to determine click plan from interaction shape');
}

//============================================
// CATEGORY: Walk a step with interactionSequence
//============================================

async function walkInteractionSequenceStep(page, step, report, wrongOrderMode) {
	// Get interactions from either the new completionPath schema or legacy top-level field
	const interactions = step.completionPath?.interactions || step.interactionSequence || [];
	report.info(`  Using interactionSequence path (${interactions.length} interactions)`);

	// In --wrong-order mode, we'll track when we're about to start the correct sequence
	// so we can compare state before and after the correct clicks (not including the injection).
	let stateBeforeCorrectSequence = null;

	for (let i = 0; i < interactions.length; i++) {
		const interaction = interactions[i];
		const startIndex = await page.evaluate(() => window.gameState.interactionIndex);
		report.info(`  Interaction ${i}/${interactions.length}`, { index: i, startInteractionIndex: startIndex });

		// In --wrong-order mode: before issuing the correct sequence,
		// inject a wrong-order click on a non-required item.
		if (wrongOrderMode) {
			const requiredItems = [];
			if (interaction.tool) requiredItems.push(interaction.tool);
			if (interaction.source) requiredItems.push(interaction.source);
			if (interaction.destination) requiredItems.push(interaction.destination);

			const wrongItem = await pickWrongOrderItem(page, requiredItems);
			if (wrongItem) {
				// Get pre-injection state
				const preWrongState = await page.evaluate(() => {
					return {
						wrongOrderClicks: window.gameState.wrongOrderClicks,
						interactionIndex: window.gameState.interactionIndex,
						activeStepId: window.gameState.activeStepId,
					};
				});

				// Click the wrong item
				report.info(`  [wrong-order injection] clicking ${wrongItem} (not in interaction)`);
				const wrongItemSelector = resolveSelector(wrongItem);
				const wrongItemLocator = page.locator(wrongItemSelector).first();
				await wrongItemLocator.click();
				report.summary.totalClicks++;

				// Wait for wrongOrderClicks to increment (observable signal of wrong-order click being processed).
				// If it never increments within the budget, that IS the failure case — post-state read below records it.
				const preCount = preWrongState.wrongOrderClicks;
				await page.waitForFunction(
					(target) => window.gameState.wrongOrderClicks > target,
					preCount,
					{ timeout: 1500 },
				).catch(() => { /* timeout is the failure case; let post-state read record it */ });

				// Verify the injection had the expected effect:
				// wrongOrderClicks incremented by 1, but index/activeStepId did NOT change
				const postWrongState = await page.evaluate(() => {
					return {
						wrongOrderClicks: window.gameState.wrongOrderClicks,
						interactionIndex: window.gameState.interactionIndex,
						activeStepId: window.gameState.activeStepId,
					};
				});

				const wrongClickIncremented = postWrongState.wrongOrderClicks === preWrongState.wrongOrderClicks + 1;
				const indexUnchanged = postWrongState.interactionIndex === preWrongState.interactionIndex;
				const stepUnchanged = postWrongState.activeStepId === preWrongState.activeStepId;

				recordInjection(report, step.id, wrongItem);

				if (!wrongClickIncremented) {
					report.error(
						`Wrong-order injection on ${wrongItem} failed to increment wrongOrderClicks ` +
						`(before: ${preWrongState.wrongOrderClicks}, after: ${postWrongState.wrongOrderClicks})`,
						{ stepId: step.id, injectedItemId: wrongItem }
					);
					throw new Error(
						`Injection on ${wrongItem}: wrongOrderClicks did not increment`
					);
				}

				if (!indexUnchanged || !stepUnchanged) {
					report.error(
						`Wrong-order injection on ${wrongItem} advanced the step ` +
						`(indexBefore: ${preWrongState.interactionIndex}, indexAfter: ${postWrongState.interactionIndex}; ` +
						`stepBefore: ${preWrongState.activeStepId}, stepAfter: ${postWrongState.activeStepId})`,
						{ stepId: step.id, injectedItemId: wrongItem }
					);
					throw new Error(
						`Injection on ${wrongItem}: step advanced when it should not have`
					);
				}

				report.info(`  [wrong-order injection] passed: wrongOrderClicks incremented, step unchanged`);

				// Record state after injection, before correct sequence
				stateBeforeCorrectSequence = postWrongState;
			} else {
				report.info(`  [wrong-order injection] skipped: no alternative item visible in scene`, { stepId: step.id });
				// Even if injection skipped, record pre-sequence state
				stateBeforeCorrectSequence = await page.evaluate(() => {
					const state = window.gameState;
					return {
						wrongOrderClicks: state.wrongOrderClicks,
						interactionIndex: state.interactionIndex,
						activeStepId: state.activeStepId,
					};
				});
			}
		}

		const clickPlan = await buildClickPlan(page, interaction);

		for (const click of clickPlan) {
			await clickItemAndWaitProgress(page, click.itemId, report);
		}
	}

	// Return the state before correct sequence for validation in walkStep
	return stateBeforeCorrectSequence;
}

//============================================
// CATEGORY: Walk incubation step (isIncubation: true)
// Player must: be on bench, click incubator, wait for animation
//============================================

async function walkIncubationStep(page, step, report) {
	report.info(`  Using incubation path for ${step.id}`);

	// Ensure we're on bench
	await switchToBench(page, report);

	// Click the incubator
	const incubatorLocator = page.locator('[data-item-id="incubator"]').first();
	const count = await incubatorLocator.count();
	if (count === 0) {
		throw new Error(`Incubator element not found on bench`);
	}

	// For incubate_day1: we need to pick up the well_plate first
	// (the incubator bench handler checks selectedTool === 'well_plate')
	if (step.id === 'incubate_day1') {
		// Switch to hood to pick up well_plate
		await switchToHood(page, report);
		// Click well_plate to pick it up
		const wellPlateLocator = page.locator('[data-item-id="well_plate"]').first();
		if ((await wellPlateLocator.count()) === 0) {
			throw new Error('well_plate not found in hood for incubate_day1; cannot proceed');
		}
		await clickItemAndWaitProgress(page, 'well_plate', report);
		await switchToBench(page, report);
	}

	// Click incubator to start animation
	await incubatorLocator.click();
	report.summary.totalClicks++;
	report.info('Clicked incubator, waiting for animation...');

	// Wait for incubation overlay to appear and complete
	// The overlay shows for ~4 seconds (4000ms animation + 1000ms delay)
	try {
		// First wait for overlay to become active
		await page.waitForFunction(
			() => {
				const overlay = document.getElementById('incubator-screen');
				return overlay && overlay.classList.contains('active');
			},
			{ timeout: 3000 }
		);
		report.info('Incubation overlay opened');
	} catch {
		// Overlay may have opened and closed already; check if step completed
		const completed = await page.evaluate((id) => {
			return window.gameState.completedSteps && window.gameState.completedSteps.includes(id);
		}, step.id);
		if (completed) {
			report.info('Incubation step already completed (overlay too fast)');
			return;
		}
	}

	// Wait for overlay to close (animation completes)
	await waitForIncubationComplete(page, 10000);
	report.info('Incubation animation complete');
}

//============================================
// CATEGORY: Walk microscope/count_cells step
// Player must: click cell_counter on bench -> confirm viability -> enter quadrant counts -> submit
//============================================

async function walkCountCellsStep(page, step, report) {
	report.info(`  Using count_cells/microscope path for ${step.id}`);

	// Ensure on bench
	await switchToBench(page, report);

	// Override window.prompt to return a fixed cell count for walker
	// (quadrant buttons use prompt() for user input)
	await page.evaluate(() => {
		// Return 20 as the cell count for each quadrant (realistic value)
		window.prompt = function() { return '20'; };
	});

	// Click cell_counter on bench to open microscope
	const cellCounterLocator = page.locator('[data-item-id="cell_counter"]').first();
	if ((await cellCounterLocator.count()) === 0) {
		throw new Error('cell_counter element not found on bench');
	}

	// Load sample if serological_pipette_with_sample is needed
	// (bench.ts: if selectedTool === 'serological_pipette_with_sample', sets hemocytometerLoaded)
	// The hood legacy path requires serological_pipette -> flask -> click microscope.
	// But count_cells can also fire from cell_counter click directly.
	await cellCounterLocator.click();
	report.summary.totalClicks++;
	report.info('Clicked cell_counter, waiting for microscope overlay...');

	// Wait for microscope overlay to open
	await waitForMicroscopeOpen(page, 3000);
	report.info('Microscope overlay opened');

	// Step 1: Confirm Viability
	const confirmBtn = page.locator('#confirm-viability').first();
	if ((await confirmBtn.count()) > 0) {
		await confirmBtn.click();
		report.summary.totalClicks++;
		report.info('Clicked confirm-viability');

		// Wait for viability screen to switch to counting screen
		await page.waitForFunction(
			() => window.gameState.microscopeViabilityChecked === true,
			{ timeout: 3000 }
		);

		// Wait for quadrant buttons to appear
		await page.waitForSelector('.quadrant-btn', { timeout: 3000 });
		report.info('Viability confirmed, counting screen visible');
	}

	// Step 2: Click all 4 quadrant buttons to enter counts
	const quadrantBtns = page.locator('.quadrant-btn');
	const quadrantCount = await quadrantBtns.count();
	if (quadrantCount < 4) {
		throw new Error(`Expected 4 quadrant buttons, found ${quadrantCount}`);
	}

	for (let i = 0; i < 4; i++) {
		const btn = quadrantBtns.nth(i);
		await btn.click();
		report.summary.totalClicks++;
		report.info(`Clicked quadrant ${i}`);
		// Wait for the quadrant button to show as selected.
		// The promptoverride returns a fixed value; we wait for the button's border style to change.
		// The code sets `el.style.border = '3px solid #4caf50'` when selected.
		await page.waitForFunction(
			(index) => {
				const buttons = document.querySelectorAll('.quadrant-btn');
				if (buttons.length > index) {
					const btn = buttons[index];
					const style = window.getComputedStyle(btn);
					// Check if button's border style has changed (selected state)
					return style.borderColor === 'rgb(76, 175, 80)' || style.borderWidth === '3px';
				}
				return false;
			},
			i,
			{ timeout: 1500 }
		);
	}

	// Wait for all 4 quadrants to be selected (submit button enabled)
	await page.waitForFunction(
		() => {
			const submitBtn = document.getElementById('submit-cell-count');
			return submitBtn && !submitBtn.disabled;
		},
		{ timeout: 3000 }
	);
	report.info('All 4 quadrants counted, submit enabled');

	// Step 3: Submit the count
	const submitBtn = page.locator('#submit-cell-count').first();
	if ((await submitBtn.count()) === 0) {
		throw new Error('submit-cell-count button not found');
	}
	await submitBtn.click();
	report.summary.totalClicks++;
	report.info('Submitted quadrant count');
}

//============================================
// MICROSCOPE MODAL: Walk viability and/or quadrant counting steps
// Handles both: confirm-viability screens and quadrant-counting screens
//============================================

async function walkMicroscopeModalStep(page, step, report) {
	report.info(`  Using microscope modal path for ${step.id}`);

	const advanceSelector = `[data-walker-advance="${step.completionPath.advanceClick}"]`;
	const advanceClick = step.completionPath.advanceClick;

	// Check if advance button is already visible (modal already open from prior step)
	const alreadyOpenCount = await page.locator(advanceSelector).count();

	if (step.completionPath.openClick && alreadyOpenCount === 0) {
		// Open the microscope via the openClick item (e.g., microscope or cell_counter)
		await switchToBench(page, report);

		const openerLocator = page.locator(`[data-item-id="${step.completionPath.openClick}"]`).first();
		if ((await openerLocator.count()) === 0) {
			throw new Error(`Item ${step.completionPath.openClick} not found to open microscope`);
		}
		await clickItemAndWaitProgress(page, step.completionPath.openClick, report);

		// Wait for microscope modal to open
		await waitForMicroscopeOpen(page, 3000);
		report.info('Microscope overlay opened');
	}

	// If this step's advance button is confirm-viability, click it and return
	if (advanceClick === 'confirm-viability') {
		const confirmBtn = page.locator('#confirm-viability').first();
		if ((await confirmBtn.count()) === 0) {
			throw new Error('confirm-viability button not found');
		}
		await confirmBtn.click();
		report.summary.totalClicks++;
		report.info('Clicked confirm-viability');
		return;
	}

	// If this step's advance button is submit-cell-count, click all quadrants first
	if (advanceClick === 'submit-cell-count') {
		// Click all 4 quadrant buttons to enter counts
		const quadrantBtns = page.locator('.quadrant-btn');
		const quadrantCount = await quadrantBtns.count();
		if (quadrantCount < 4) {
			throw new Error(`Expected 4 quadrant buttons, found ${quadrantCount}`);
		}

		for (let i = 0; i < 4; i++) {
			const btn = quadrantBtns.nth(i);
			await btn.click();
			report.summary.totalClicks++;
			report.info(`Clicked quadrant ${i}`);

			// Wait for the quadrant button to show as selected
			await page.waitForFunction(
				(index) => {
					const buttons = document.querySelectorAll('.quadrant-btn');
					if (buttons.length > index) {
						const btn = buttons[index];
						const style = window.getComputedStyle(btn);
						return style.borderColor === 'rgb(76, 175, 80)' || style.borderWidth === '3px';
					}
					return false;
				},
				i,
				{ timeout: 1500 }
			);
		}

		// Wait for all 4 quadrants to be selected (submit button enabled)
		await page.waitForFunction(
			() => {
				const submitBtn = document.getElementById('submit-cell-count');
				return submitBtn && !submitBtn.disabled;
			},
			{ timeout: 3000 }
		);
		report.info('All 4 quadrants counted, submit enabled');
	}

	// Click the advance button
	const advanceBtn = page.locator(advanceSelector).first();
	if ((await advanceBtn.count()) === 0) {
		throw new Error(`Advance button with selector "${advanceSelector}" not found for step ${step.id}`);
	}
	await advanceBtn.click();
	report.summary.totalClicks++;
	report.info(`Clicked advance button for ${step.id}`);
}

//============================================
// GENERIC: Walk a modal step
// Player must: optionally open modal (if openClick present), then click advance button
//============================================

async function walkModalStep(page, step, openClick, advanceClick, completionEvent, report) {
	report.info(`  Using generic modal path for ${step.id}`);

	const advanceSelector = `[data-walker-advance="${advanceClick}"]`;

	// If the advance button is already visible, the modal is already open from
	// the prior step's completionEvent (e.g. results follows plate_read with
	// the plate_reader overlay still active). Re-running openClick in that
	// state re-renders the overlay and breaks pointer events. Skip openClick.
	const alreadyOpenCount = await page.locator(advanceSelector).count();

	if (openClick && alreadyOpenCount === 0) {
		// Use step.scene as the truth source (matches walkInteractionSequence).
		// DOM-detection was unreliable: items lack data-scene wrappers and
		// the heuristic defaulted to bench, leaving hood-scoped openers
		// (e.g. multichannel_pipette) invisible.
		if (step.scene === 'hood') {
			await switchToHood(page, report);
		} else if (step.scene === 'bench' || step.scene === 'plate_reader') {
			await switchToBench(page, report);
		}

		// Click the opener item
		const openerLocator = page.locator(`[data-item-id="${openClick}"]`).first();
		if ((await openerLocator.count()) === 0) {
			throw new Error(`Item ${openClick} not found to open modal for step ${step.id}`);
		}
		await clickItemAndWaitProgress(page, openClick, report);

		// Wait for modal to become visible (the advance button appears)
		await page.waitForSelector(advanceSelector, { timeout: 3000 });
		report.info(`Modal opened via ${openClick}, advance button visible`);
	} else {
		// Modal is already open from previous step's completionEvent
		// Just wait for the advance button to appear
		await page.waitForSelector(advanceSelector, { timeout: 3000 });
		report.info('Modal already open from prior step, advance button visible');
	}

	// Click the advance button
	const advanceBtn = page.locator(advanceSelector).first();
	if ((await advanceBtn.count()) === 0) {
		throw new Error(`Advance button with selector "${advanceSelector}" not found for step ${step.id}`);
	}
	await advanceBtn.click();
	report.summary.totalClicks++;
	report.info(`Clicked advance button for ${step.id}`);
}


//============================================
// CATEGORY: Walk prewarm_media (completionTrigger: water_bath on bench)
//============================================

async function walkPrewarmMediaStep(page, step, report) {
	report.info(`  Using prewarm_media path`);

	await switchToBench(page, report);

	// Click water_bath
	await clickItemAndWaitProgress(page, 'water_bath', report);
}

//============================================
// CATEGORY: Walk media_adjust (multichannel + media_bottle + well_plate on hood)
//============================================

async function walkMediaAdjustStep(page, step, report) {
	report.info(`  Using media_adjust path`);

	await switchToHood(page, report);

	// Build and execute click plan: tool, source, destination
	const clickPlan = [
		{ itemId: 'multichannel_pipette', kind: 'tool' },
		{ itemId: 'media_bottle', kind: 'source' },
		{ itemId: 'well_plate', kind: 'destination' },
	];

	for (const click of clickPlan) {
		const locator = page.locator(resolveSelector(click.itemId)).first();
		const count = await locator.count();
		if (count === 0) {
			throw new Error(`Item ${click.itemId} not found in DOM for media_adjust`);
		}
		await clickItemAndWaitProgress(page, click.itemId, report);
	}
}

//============================================
// CATEGORY: Walk add_mtt (multichannel + mtt_vial + well_plate on hood)
//============================================

async function walkAddMttStep(page, step, report) {
	report.info(`  Using add_mtt path`);

	await switchToHood(page, report);

	// Build and execute click plan: tool, source, destination
	const clickPlan = [
		{ itemId: 'multichannel_pipette', kind: 'tool' },
		{ itemId: 'mtt_vial', kind: 'source' },
		{ itemId: 'well_plate', kind: 'destination' },
	];

	for (const click of clickPlan) {
		const locator = page.locator(resolveSelector(click.itemId)).first();
		const count = await locator.count();
		if (count === 0) {
			throw new Error(`Item ${click.itemId} not found in DOM for add_mtt`);
		}
		await clickItemAndWaitProgress(page, click.itemId, report);
	}
}

//============================================
// CATEGORY: Walk decant_mtt (well_plate + biohazard_decant on hood)
//============================================

async function walkDecantMttStep(page, step, report) {
	report.info(`  Using decant_mtt path`);

	await switchToHood(page, report);

	// Build and execute click plan: tool, destination
	const clickPlan = [
		{ itemId: 'well_plate', kind: 'tool' },
		{ itemId: 'biohazard_decant', kind: 'destination' },
	];

	for (const click of clickPlan) {
		const locator = page.locator(resolveSelector(click.itemId)).first();
		const count = await locator.count();
		if (count === 0) {
			throw new Error(`Item ${click.itemId} not found in DOM for decant_mtt`);
		}
		await clickItemAndWaitProgress(page, click.itemId, report);
	}
}

//============================================
// CATEGORY: Walk add_dmso (multichannel + dmso_bottle + well_plate on hood)
//============================================

async function walkAddDmsoStep(page, step, report) {
	report.info(`  Using add_dmso path`);

	await switchToHood(page, report);

	// Build and execute click plan: tool, source, destination
	const clickPlan = [
		{ itemId: 'multichannel_pipette', kind: 'tool' },
		{ itemId: 'dmso_bottle', kind: 'source' },
		{ itemId: 'well_plate', kind: 'destination' },
	];

	for (const click of clickPlan) {
		const locator = page.locator(resolveSelector(click.itemId)).first();
		const count = await locator.count();
		if (count === 0) {
			throw new Error(`Item ${click.itemId} not found in DOM for add_dmso`);
		}
		await clickItemAndWaitProgress(page, click.itemId, report);
	}
}

//============================================
// Main step walker: dispatch to category handler
//============================================

async function walkStep(page, step, report, wrongOrderMode) {
	const stepReport = {
		stepId: step.id,
		label: step.label,
		clicks: [],
		passed: false,
		reason: null,
	};

	report.info(`Walking step: ${step.id} (${step.label})`, { stepId: step.id });

	// Per-step budget: race between step completion and a timeout
	const stepStart = Date.now();

	try {
		// Before-step state
		const beforeState = await page.evaluate(() => {
			const state = window.gameState;
			return {
				wrongOrderClicks: state.wrongOrderClicks,
				interactionIndex: state.interactionIndex,
			};
		});

		// Dispatch to correct handler based on completionPath.kind
		// Zero step.id branches: all dispatch is schema-driven
		let stateBeforeCorrectSequence = null;

		if (step.completionPath) {
			const kind = step.completionPath.kind;

			if (kind === 'interactionSequence') {
				// Ensure correct scene before walking
				if (step.scene === 'bench') {
					await switchToBench(page, report);
				} else if (step.scene === 'hood') {
					await switchToHood(page, report);
				}
				stateBeforeCorrectSequence = await walkInteractionSequenceStep(page, step, report, wrongOrderMode);

			} else if (kind === 'directTool') {
				// Direct tool interaction: click the tool and wait for completion
				const tool = step.completionPath.tool;

				// Determine scene for the tool
				if (step.scene === 'bench') {
					await switchToBench(page, report);
				} else if (step.scene === 'hood') {
					await switchToHood(page, report);
				}

				report.info(`  Using directTool path (tool: ${tool})`);
				await clickItemAndWaitProgress(page, tool, report);

			} else if (kind === 'modal') {
				// Dispatch to special handlers for microscope modals with quadrant counting
				if (step.modal?.screen === 'viability' || step.modal?.screen === 'counting') {
					// Hemocytometer quadrant counting requires window.prompt override.
					// Override window.prompt because the runtime collects quadrant counts via a native browser dialog; without this Playwright would hang on the modal dialog.
					await page.evaluate(() => {
						window.prompt = function() { return '20'; };
					});
					await walkMicroscopeModalStep(page, step, report);
				} else {
					// Generic modal interaction: optionally open, then click advance.
					// walkModalStep auto-detects an already-open modal so plate_reader
					// continuations (results after plate_read) need no special case.
					const openClick = step.completionPath.openClick || null;
					const advanceClick = step.completionPath.advanceClick;
					const completionEvent = step.completionPath.completionEvent;

					await walkModalStep(page, step, openClick, advanceClick, completionEvent, report);
				}

			} else {
				throw new Error(`Unknown completionPath.kind '${kind}' for step ${step.id}`);
			}
		} else if (step.isIncubation) {
			// Legacy: pure incubation steps (no completionPath yet)
			await walkIncubationStep(page, step, report);
		} else {
			throw new Error(`Step ${step.id} has no completionPath and is not an incubation step`);
		}

		// Check per-step budget
		if (Date.now() - stepStart > STEP_BUDGET_MS) {
			throw new Error(`step_stalled: step ${step.id} exceeded ${STEP_BUDGET_MS}ms budget`);
		}

		// Wait for step completion (async steps like incubation, aspiration animation)
		await waitForStepCompleted(page, step.id, STEP_BUDGET_MS);

		// After-step state
		const afterState = await page.evaluate(() => {
			const state = window.gameState;
			return {
				wrongOrderClicks: state.wrongOrderClicks,
				activeStepId: state.activeStepId,
				completedSteps: state.completedSteps.slice(),
			};
		});

		// Validate: step in completedSteps
		if (!afterState.completedSteps.includes(step.id)) {
			throw new Error(`Step ${step.id} not in completedSteps after walk`);
		}

		// Validate: activeStepId advanced to nextId (or null for terminal)
		const expectedNextId = step.nextId !== undefined ? step.nextId : null;
		if (afterState.activeStepId !== expectedNextId) {
			throw new Error(`activeStepId ${afterState.activeStepId} !== expected nextId ${expectedNextId}`);
		}

		// Validate: wrongOrderClicks did not increment during the correct sequence
		// (In --wrong-order mode with interactionSequence, compare to state after injection;
		//  otherwise compare to state at the start of the step.)
		const compareState = stateBeforeCorrectSequence !== null ? stateBeforeCorrectSequence : beforeState;
		if (afterState.wrongOrderClicks > compareState.wrongOrderClicks) {
			throw new Error(`wrongOrderClicks incremented during correct sequence (before: ${compareState.wrongOrderClicks}, after: ${afterState.wrongOrderClicks})`);
		}

		stepReport.passed = true;
		report.info(`Step passed: ${step.id}`);
		report.summary.stepsPassed++;

	} catch (err) {
		stepReport.reason = err.message;
		report.error(`Step failed: ${step.id} - ${err.message}`, { stepId: step.id });
		report.summary.stepsFailed++;
		throw err;
	}

	report.summary.stepsWalked++;
	return stepReport;
}

//============================================
// Main walker
//============================================

async function main() {
	const args = parseArgs();
	console.log(`Starting walker: protocol=${args.protocol}, wrongOrder=${args.wrongOrder}`);

	// Ensure results directory exists
	if (!fs.existsSync(RESULTS_DIR)) {
		fs.mkdirSync(RESULTS_DIR, { recursive: true });
	}

	const report = new WalkerReport();
	report.protocol = args.protocol;
	report.wrongOrderMode = args.wrongOrder;

	const runStart = Date.now();
	const gameUrl = `http://127.0.0.1:${PORT}/?protocol=${encodeURIComponent(args.protocol)}`;

	const server = startServer();
	let serverDied = null;
	server.on('exit', (code) => {
		serverDied = code;
	});

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

	// Capture console errors
	const consoleErrors = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			consoleErrors.push(msg.text());
		}
	});

	// Capture network errors
	const networkErrors = [];
	page.on('requestfailed', (req) => {
		// Only capture same-origin asset failures
		try {
			const url = new URL(req.url());
			if (url.origin === `http://127.0.0.1:${PORT}`) {
				networkErrors.push({
					url: req.url(),
					method: req.method(),
					reason: req.failure().errorText,
				});
			}
		} catch (e) {
			// ignore parse errors
		}
	});

	try {
		await waitForServer(`http://127.0.0.1:${PORT}/`);
	} catch (err) {
		report.error(`Server startup failed: ${err.message}`);
		server.kill();
		await browser.close();
		process.exit(1);
	}

	try {
		// Navigate to game
		report.info('Navigating to game', { url: gameUrl });
		await page.goto(gameUrl, { waitUntil: 'networkidle' });

		// Wait for window exports to be defined
		await page.waitForFunction(() => {
			return typeof window.gameState !== 'undefined' &&
				typeof window.PROTOCOL_STEPS !== 'undefined' &&
				typeof window.resolveInteractionByIndex === 'function' &&
				Array.isArray(window.PROTOCOL_STEPS) &&
				window.PROTOCOL_STEPS.length > 0;
		}, { timeout: 5000 });
		report.info('Game exports ready');

		// Clear localStorage and reload
		report.info('Clearing localStorage and reloading');
		await page.evaluate(() => { localStorage.clear(); });
		await page.reload({ waitUntil: 'networkidle' });

		// Wait again for exports after reload
		await page.waitForFunction(() => {
			return typeof window.gameState !== 'undefined' &&
				typeof window.PROTOCOL_STEPS !== 'undefined' &&
				Array.isArray(window.PROTOCOL_STEPS) &&
				window.PROTOCOL_STEPS.length > 0;
		}, { timeout: 5000 });

		// Override window.prompt for count_cells quadrant input
		// (must be done after reload and before microscope modal opens)
		await page.evaluate(() => {
			window.prompt = function() { return '20'; };
		});

		// Dismiss welcome modal
		report.info('Dismissing welcome modal');
		const welcomeBtn = page.locator('#welcome-start-btn, button:has-text("Start"), button:has-text("Begin")').first();
		if ((await welcomeBtn.count()) > 0) {
			await welcomeBtn.click();
			await page.waitForFunction(() => {
				return window.gameState && window.gameState.activeStepId !== null;
			}, { timeout: 2000 });
		}

		report.info('Game state initialized');

		// Get protocol steps from the page (they're already parsed from YAML)
		const steps = await page.evaluate(() => {
			return window.PROTOCOL_STEPS || [];
		});

		if (!steps || steps.length === 0) {
			throw new Error('No protocol steps found');
		}

		report.info(`Protocol has ${steps.length} steps`, { stepCount: steps.length });

		// Take initial screenshot
		await page.screenshot({ path: path.join(RESULTS_DIR, 'initial_state.png') });

		// Walk each step
		for (const step of steps) {
			// Check whole-run budget
			if (Date.now() - runStart > RUN_BUDGET_MS) {
				report.error(`run_stalled: exceeded ${RUN_BUDGET_MS}ms whole-run budget`);
				report.summary.failureReason = 'run_stalled';
				break;
			}

			try {
				await walkStep(page, step, report, args.wrongOrder);

				// Per-step screenshot on pass
				const stepScreenshot = path.join(RESULTS_DIR, `step_${report.summary.stepsWalked}_${step.id}.png`);
				await page.screenshot({ path: stepScreenshot });

			} catch (err) {
				report.summary.failureReason = err.message;
				// Screenshot on failure
				const failScreenshot = path.join(RESULTS_DIR, `fail_${step.id}.png`);
				await page.screenshot({ path: failScreenshot });
				break;
			}
		}

		// Final state check
		const endingState = await page.evaluate(() => {
			const state = window.gameState;
			return {
				activeStepId: state.activeStepId,
				completedSteps: state.completedSteps.slice(),
				wrongOrderClicks: state.wrongOrderClicks,
				stepsOutOfOrder: state.stepsOutOfOrder,
			};
		});

		report.info('Final game state', {
			activeStepId: endingState.activeStepId,
			completedStepsCount: endingState.completedSteps.length,
			wrongOrderClicks: endingState.wrongOrderClicks,
		});

		// End-state assertions (only if no failures)
		if (report.summary.stepsFailed === 0) {
			if (endingState.activeStepId !== null) {
				report.error('activeStepId is not null at end (not all steps completed)');
			}
			if (endingState.wrongOrderClicks > 0 && !args.wrongOrder) {
				report.error(`wrongOrderClicks = ${endingState.wrongOrderClicks} (should be 0)`);
			}
			if (endingState.stepsOutOfOrder > 0) {
				report.error(`stepsOutOfOrder = ${endingState.stepsOutOfOrder} (should be 0)`);
			}
		}

		// Check for final result screen (required per spec Rule 6)
		const resultScreen = page.locator('#scoring-screen, #results-screen, [data-screen="scoring"]').first();
		if ((await resultScreen.count()) === 0) {
			report.error('Final result screen not found in DOM (spec Rule 6: assert the ending)');
		} else {
			report.info('Final result screen present');
		}

		// Log any console errors
		if (consoleErrors.length > 0) {
			report.error(`Console errors detected: ${consoleErrors.length}`, { errors: consoleErrors.slice(0, 5) });
		}

		// Log any network errors
		if (networkErrors.length > 0) {
			report.error(`Network errors detected: ${networkErrors.length}`, { errors: networkErrors });
		}

		// Determine pass/fail
		const errorCount = report.entries.filter(e => e.severity === 'error').length;
		if (errorCount > 0 || report.summary.stepsFailed > 0) {
			const failMsg = errorCount > 0
				? `Walker FAILED: ${errorCount} errors logged`
				: `Walker FAILED: ${report.summary.stepsFailed} steps failed`;
			console.log(`\n${failMsg}`);
			console.log(`Passed: ${report.summary.stepsPassed}/${steps.length} steps`);
			process.exitCode = 1;
		} else {
			console.log(`\nWalker PASSED: all ${report.summary.stepsWalked} steps completed`);
			process.exitCode = 0;
		}

		// Final screenshot
		await page.screenshot({ path: path.join(RESULTS_DIR, 'final_screen.png') });

	} catch (err) {
		report.error(`Walker crashed: ${err.message}`, { stack: err.stack });
		report.summary.failureReason = err.message;
		process.exitCode = 1;

		// Screenshot on crash
		try {
			await page.screenshot({ path: path.join(RESULTS_DIR, 'crash_screen.png') });
		} catch {
			// ignore screenshot failure
		}

	} finally {
		// Save report before closing
		const reportPath = path.join(RESULTS_DIR, 'playthrough_report.json');
		report.save(reportPath);
		console.log(`Report saved to ${reportPath}`);

		await browser.close();
		server.kill();
		await new Promise((r) => setTimeout(r, 100));

	}
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
