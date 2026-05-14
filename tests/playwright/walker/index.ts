// Walker engine core dispatch.
// Loads a protocol, runs every step end-to-end via visible UI,
// dispatching on completionPath.kind only.

import type { Page, Browser } from 'playwright';
import { chromium } from 'playwright';
import type {
	ProtocolConfig,
	ProtocolStep,
	CompletionPath,
	InteractionSequencePath,
	DirectToolPath,
	ModalPath,
	MultipleChoicePath,
} from '../../../src/scene_runtime/contract.js';
import { resolveAndClick, type ClickTarget } from './click_resolver.js';
import {
	captureBefore,
	captureAfter,
	captureStepSummary,
	ensureScreenshotDir,
	type ScreenshotContext,
} from './screenshot.js';

export interface WalkerOptions {
	protocolId: string;
	baseUrl?: string;        // default "http://localhost:8000"
	headless?: boolean;       // default true
	screenshotDir?: string;   // default "test-results/walker/<protocolId>"
	protocolConfig?: ProtocolConfig;  // optional: use directly instead of loading from window
}

export interface WalkerResult {
	protocolId: string;
	stepsPassed: number;
	stepsTotal: number;
	screenshotsTaken: number;
	failedStepId?: string;
	errorMessage?: string;
}

//============================================
// Game state reader (read-only, never mutate)
//============================================

interface GameState {
	activeScene?: string;
	selectedTool?: string;
	stepCompleted?: boolean;
	completedSteps?: string[];
	[key: string]: unknown;
}

async function readGameState(page: Page): Promise<GameState> {
	// Read game state from window.gameState for verification only.
	const state = await page.evaluate(() => {
		const w = window as unknown as { gameState?: GameState };
		return w.gameState || {};
	});
	return state;
}

//============================================
// Step completion dispatcher
//============================================

async function executeStep(
	page: Page,
	step: ProtocolStep,
	protocolId: string,
	stepIndex: number
): Promise<number> {
	const completionPath = step.completionPath;
	let actionIndex = 0;
	let screenshotsTaken = 0;

	// Build click targets from the completion path.
	const clickTargets: ClickTarget[] = [];

	if (completionPath.kind === 'interactionSequence') {
		const path = completionPath as InteractionSequencePath;

		// Handle array form (interactions) if present.
		if (path.interactions && path.interactions.length > 0) {
			for (const interaction of path.interactions) {
				if (interaction.tool) {
					clickTargets.push({ yamlField: 'tool', value: interaction.tool });
				}
				if (interaction.source) {
					clickTargets.push({ yamlField: 'source', value: interaction.source });
				}
				if (interaction.destination) {
					clickTargets.push({ yamlField: 'destination', value: interaction.destination });
				}
			}
		} else {
			// Fallback to flat form (legacy).
			if (path.tool) {
				clickTargets.push({ yamlField: 'tool', value: path.tool });
			}
			if (path.source) {
				clickTargets.push({ yamlField: 'source', value: path.source });
			}
			if (path.destination) {
				clickTargets.push({ yamlField: 'destination', value: path.destination });
			}
		}

		// Handle plateTargets if present.
		if (path.plateTargets && path.plateTargets.length > 0) {
			for (const target of path.plateTargets) {
				// If rows and cols arrays are provided, expand them.
				if (target.rows && target.cols) {
					for (const row of target.rows) {
						for (const col of target.cols) {
							const wellId = `${row}${col}`;
							clickTargets.push({ yamlField: 'plateTargets', value: wellId });
						}
					}
				} else if (target.wellId) {
					// Single well by wellId.
					clickTargets.push({ yamlField: 'plateTargets', value: target.wellId });
				} else if (target.row !== undefined && target.col !== undefined) {
					// Single well by row/col.
					const wellId = `${target.row}${target.col}`;
					clickTargets.push({ yamlField: 'plateTargets', value: wellId });
				}
			}
		}

		// Handle tubeTargets if present.
		if (path.tubeTargets && path.tubeTargets.length > 0) {
			for (const target of path.tubeTargets) {
				if (target.tubeId) {
					clickTargets.push({ yamlField: 'tubeTargets', value: target.tubeId });
				}
			}
		}
	} else if (completionPath.kind === 'directTool') {
		const path = completionPath as DirectToolPath;
		clickTargets.push({ yamlField: 'tool', value: path.tool });
	} else if (completionPath.kind === 'modal') {
		const path = completionPath as ModalPath;
		// For modal, handle openClick and advanceClick specially:
		// Click openClick, wait for advanceClick to become visible, then click it.
		clickTargets.push({ yamlField: 'openClick', value: path.openClick });
		if (path.advanceClick) {
			// Mark this as waiting for visibility by setting a special field
			clickTargets.push({
				yamlField: 'advanceClick',
				value: path.advanceClick,
			});
		}
	} else if (completionPath.kind === 'multipleChoice') {
		const path = completionPath as MultipleChoicePath;
		const correctChoice = path.choices.find((c) => c.correct === true);
		if (!correctChoice) {
			throw new Error(
				`Step ${step.id}: multipleChoice has no correct choice`
			);
		}
		clickTargets.push({ yamlField: 'choices[].id', value: correctChoice.id });
	}

	// Execute each click with before/after screenshots.
	for (let i = 0; i < clickTargets.length; i++) {
		const target = clickTargets[i];
		actionIndex += 1;
		const ctx: ScreenshotContext = {
			protocolId,
			stepIndex,
			actionIndex,
		};

		// Before screenshot.
		await captureBefore(page, ctx);
		screenshotsTaken += 1;

		// Click and wait for animation.
		await resolveAndClick(page, target);

		const waitTime = 500;
		await page.waitForTimeout(waitTime);

		// After screenshot.
		await captureAfter(page, ctx);
		screenshotsTaken += 1;
	}

	// Step summary screenshot.
	const summaryCtx: ScreenshotContext = {
		protocolId,
		stepIndex,
		actionIndex: 99,  // Fixed index for summary
	};
	await captureStepSummary(page, summaryCtx);
	screenshotsTaken += 1;

	// Verify step completion via gameState read (read-only).
	const gameState = await readGameState(page);
	const completed = (gameState.completedSteps as string[] | undefined) || [];
	const debugLog = (gameState.debugLog as string[] | undefined) || [];

	if (debugLog.length > 0) {
		console.log(`Step ${step.id} debug log:`, debugLog.join('; '));
	}

	if (!completed.includes(step.id)) {
		// Debug: check if event handlers are working by checking page logs
		const pageLogs = await page.evaluate(() => {
			return {
				completedSteps: (window as any).gameState?.completedSteps || [],
				docClickListener: document.hasEventListener?.('click'),
			};
		});
		console.log(`Step ${step.id} page state:`, JSON.stringify(pageLogs));
		throw new Error(
			`Step ${step.id}: not present in gameState.completedSteps after execution (saw: ${JSON.stringify(completed)})`
		);
	}

	return screenshotsTaken;
}

//============================================
// Main walker entry
//============================================

export async function walkProtocol(opts: WalkerOptions): Promise<WalkerResult> {
	const {
		protocolId,
		baseUrl = 'http://localhost:8000',
		headless = true,
		screenshotDir = `test-results/walker/${protocolId}`,
		protocolConfig: optionalConfig,
	} = opts;

	let browser: Browser | undefined;
	let page: Page | undefined;

	try {
		// Launch chromium (headless by default per docs/PLAYWRIGHT_USAGE.md).
		browser = await chromium.launch({ headless });
		page = await browser.newPage();

		// Use provided config or load from window.
		let protocolConfig = optionalConfig;

		if (!protocolConfig) {
			// Load protocol via launcher (routes via entry.scene from generated data).
			const url = `${baseUrl}/?protocol=${protocolId}`;
			await page.goto(url);
			await page.waitForTimeout(1000);

			// Dismiss welcome overlay if visible.
			try {
				const overlay = page.locator('[data-testid="welcome-overlay"]');
				if (await overlay.isVisible({ timeout: 1000 })) {
					const closeBtn = page.locator('[data-testid="welcome-close"]');
					await closeBtn.click();
					await page.waitForTimeout(500);
				}
			} catch {
				// Overlay not present, continue.
			}

			// Read protocol config from window (should be set by launcher).
			protocolConfig = await page.evaluate(() => {
				const w = window as unknown as { currentProtocol?: ProtocolConfig };
				return w.currentProtocol;
			});
		} else {
			// For static fixtures, still load the page but don't expect a launcher.
			await page.goto(baseUrl);
			await page.waitForTimeout(1000);
		}

		if (!protocolConfig || !protocolConfig.steps) {
			throw new Error('Protocol config not found in window.currentProtocol or no steps');
		}

		const steps = protocolConfig.steps;
		let stepsPassed = 0;
		let totalScreenshotsTaken = 0;

		// Ensure screenshot directory exists.
		ensureScreenshotDir(protocolId);

		// Walk each step.
		for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
			const step = steps[stepIndex];
			try {
				// stepIndex is 0-based; pass 1-based stepIndex to executeStep.
				const screenshotsTaken = await executeStep(
					page,
					step,
					protocolId,
					stepIndex + 1
				);
				totalScreenshotsTaken += screenshotsTaken;
				stepsPassed += 1;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				return {
					protocolId,
					stepsPassed,
					stepsTotal: steps.length,
					screenshotsTaken: totalScreenshotsTaken,
					failedStepId: step.id,
					errorMessage,
				};
			}
		}

		// All steps passed.
		return {
			protocolId,
			stepsPassed,
			stepsTotal: steps.length,
			screenshotsTaken: totalScreenshotsTaken,
		};
	} finally {
		if (page) {
			await page.close();
		}
		if (browser) {
			await browser.close();
		}
	}
}
