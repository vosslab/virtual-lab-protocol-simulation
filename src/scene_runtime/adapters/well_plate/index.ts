/**
 * well_plate/index.ts
 *
 * Adapter for well_plate_workspace scene. Renders the 96-well plate UI
 * and wires click dispatch for step completion.
 *
 * No imports from src/scenes/ or src/legacy_*.
 */

import type { SceneConfig, ProtocolStep } from '../../contract';
import type { HighlightState } from '../../types';
import { deriveHighlights } from '../../highlight';
import { dispatchClick } from '../../dispatch';
import { renderWorkspace, getWorkspaceStyles } from './render';

//============================================

export interface WellPlateAdapterConfig {
	containerSelector?: string;
	onStepComplete?: (stepId: string) => void;
	onClickMatched?: (targetId: string) => void;
}

//============================================

/**
 * Helper to compute expected sequence length for interactionSequence steps.
 */
function getInteractionSequenceLength(step: ProtocolStep): number {
	const path = step.completionPath;
	if (path.kind !== 'interactionSequence') {
		return 0;
	}

	let count = 0;
	const seq = path as any;

	if (seq.interactions && Array.isArray(seq.interactions)) {
		for (const interaction of seq.interactions) {
			if (interaction.tool) count++;
			if (interaction.source) count++;
			if (interaction.destination) count++;
		}
	} else {
		if (seq.tool) count++;
		if (seq.source) count++;
		if (seq.destination) count++;
	}

	return count;
}

/**
 * Mount the well_plate adapter: render workspace and wire click handlers.
 */
export function initWellPlateAdapter(
	scene: SceneConfig,
	step: ProtocolStep,
	config?: WellPlateAdapterConfig,
): void {
	const containerSelector = config?.containerSelector || '#app';
	const container = document.querySelector(containerSelector) as HTMLElement;
	if (!container) {
		console.error(`Container not found: ${containerSelector}`);
		return;
	}

	// Inject styles
	const styleEl = document.createElement('style');
	styleEl.textContent = getWorkspaceStyles();
	document.head.appendChild(styleEl);

	// Render initial workspace with highlights for this step
	const completedClicks: string[] = [];
	const highlights = deriveHighlights(step, completedClicks);
	const html = renderWorkspace(scene, highlights);
	container.innerHTML = html;

	// Wire click handlers on equipment and plate
	const clickableItems = container.querySelectorAll('[data-item-id]');
	clickableItems.forEach((element) => {
		element.addEventListener('click', (e) => {
			const target = e.currentTarget as HTMLElement;
			const itemId = target.getAttribute('data-item-id');
			if (!itemId) return;

			// Dispatch click
			const result = dispatchClick(scene, step, {
				id: itemId,
				kind: 'item',
			});

			if (result.matched) {
				completedClicks.push(itemId);
				config?.onClickMatched?.(itemId);

				// For interactionSequence, check if all interactions are complete
				let advances = result.advances;
				if (!advances && step.completionPath.kind === 'interactionSequence') {
					const expectedLength = getInteractionSequenceLength(step);
					if (expectedLength > 0 && completedClicks.length >= expectedLength) {
						advances = true;
					}
				}

				if (advances) {
					config?.onStepComplete?.(step.id);
				} else {
					// Re-render highlights
					const newHighlights = deriveHighlights(step, completedClicks);
					const newHtml = renderWorkspace(scene, newHighlights);
					container.innerHTML = newHtml;
					wireClickHandlers(scene, step, container, completedClicks, config);
				}
			}
		});
	});

	// Wire click handlers on well plate (for plateTargets)
	const clickableWells = container.querySelectorAll('[data-well-id]');
	clickableWells.forEach((element) => {
		element.addEventListener('click', (e) => {
			const target = e.currentTarget as HTMLElement;
			const wellId = target.getAttribute('data-well-id');
			if (!wellId) return;

			// Dispatch click for well
			const result = dispatchClick(scene, step, {
				id: wellId,
				kind: 'well',
			});

			if (result.matched) {
				completedClicks.push(wellId);
				config?.onClickMatched?.(wellId);

				// For interactionSequence, check if all interactions are complete
				let advances = result.advances;
				if (!advances && step.completionPath.kind === 'interactionSequence') {
					const expectedLength = getInteractionSequenceLength(step);
					if (expectedLength > 0 && completedClicks.length >= expectedLength) {
						advances = true;
					}
				}

				if (advances) {
					config?.onStepComplete?.(step.id);
				} else {
					// Re-render highlights
					const newHighlights = deriveHighlights(step, completedClicks);
					const newHtml = renderWorkspace(scene, newHighlights);
					container.innerHTML = newHtml;
					wireClickHandlers(scene, step, container, completedClicks, config);
				}
			}
		});
	});
}

//============================================

/**
 * Helper to wire click handlers after re-render.
 */
function wireClickHandlers(
	scene: SceneConfig,
	step: ProtocolStep,
	container: HTMLElement,
	completedClicks: string[],
	config?: WellPlateAdapterConfig,
): void {
	// Wire item clicks
	const clickableItems = container.querySelectorAll('[data-item-id]');
	clickableItems.forEach((element) => {
		element.addEventListener('click', (e) => {
			const target = e.currentTarget as HTMLElement;
			const itemId = target.getAttribute('data-item-id');
			if (!itemId) return;

			const result = dispatchClick(scene, step, {
				id: itemId,
				kind: 'item',
			});

			if (result.matched) {
				completedClicks.push(itemId);
				config?.onClickMatched?.(itemId);

				// For interactionSequence, check if all interactions are complete
				let advances = result.advances;
				if (!advances && step.completionPath.kind === 'interactionSequence') {
					const expectedLength = getInteractionSequenceLength(step);
					if (expectedLength > 0 && completedClicks.length >= expectedLength) {
						advances = true;
					}
				}

				if (advances) {
					config?.onStepComplete?.(step.id);
				} else {
					const newHighlights = deriveHighlights(step, completedClicks);
					const newHtml = renderWorkspace(scene, newHighlights);
					container.innerHTML = newHtml;
					wireClickHandlers(scene, step, container, completedClicks, config);
				}
			}
		});
	});

	// Wire well clicks
	const clickableWells = container.querySelectorAll('[data-well-id]');
	clickableWells.forEach((element) => {
		element.addEventListener('click', (e) => {
			const target = e.currentTarget as HTMLElement;
			const wellId = target.getAttribute('data-well-id');
			if (!wellId) return;

			const result = dispatchClick(scene, step, {
				id: wellId,
				kind: 'well',
			});

			if (result.matched) {
				completedClicks.push(wellId);
				config?.onClickMatched?.(wellId);

				// For interactionSequence, check if all interactions are complete
				let advances = result.advances;
				if (!advances && step.completionPath.kind === 'interactionSequence') {
					const expectedLength = getInteractionSequenceLength(step);
					if (expectedLength > 0 && completedClicks.length >= expectedLength) {
						advances = true;
					}
				}

				if (advances) {
					config?.onStepComplete?.(step.id);
				} else {
					const newHighlights = deriveHighlights(step, completedClicks);
					const newHtml = renderWorkspace(scene, newHighlights);
					container.innerHTML = newHtml;
					wireClickHandlers(scene, step, container, completedClicks, config);
				}
			}
		});
	});
}

//============================================

/**
 * Render a single step of the well_plate scene.
 */
export function renderWellPlateStep(
	scene: SceneConfig,
	step: ProtocolStep,
	highlights: HighlightState,
): string {
	return renderWorkspace(scene, highlights);
}

//============================================

/**
 * Get affordances for a step (button IDs, etc).
 */
export function getWellPlateAffordances(step: ProtocolStep): string[] {
	const path = step.completionPath;
	const affordances: string[] = [];

	if (path.kind === 'modal') {
		const modal = path as any;
		if (modal.openClick) {
			affordances.push(modal.openClick);
		}
		if (modal.advanceClick) {
			affordances.push(modal.advanceClick);
		}
	} else if (path.kind === 'interactionSequence') {
		// For interaction sequences, return the sequence of expected clicks
		const seq = path as any;
		if (seq.tool) affordances.push(seq.tool);
		if (seq.source) affordances.push(seq.source);
		if (seq.destination) affordances.push(seq.destination);
	}

	return affordances.filter(Boolean);
}
