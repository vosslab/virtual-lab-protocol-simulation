//============================================
// microscope.ts - Microscope scene adapter (driver mode)
// Thin glue between SceneContext and microscope game-state dispatch
// Handles AUTOMATED cell-counter path (Patch 11).
// Handles MANUAL hemocytometer path (Patch 16).
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	renderGame,
	showNotification,
	triggerStep,
	gameState,
} from "../../game_state";
import { renderMicroscopeScene } from "../microscope";

//============================================
// dispatchMicroscopeInteraction - Per-protocol dispatch wiring for microscope scene
// Routes microscope interactions through game-state dispatch
//============================================

function dispatchMicroscopeInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// AUTOMATED CELL COUNTER PATH (Patch 11):
	// Modal completion path triggered by clicking the capture button
	if (activeStep.completionPath?.kind === 'modal') {
		const completionPath = activeStep.completionPath;

		// The advanceClick triggers the step completion
		// For cell counter: advanceClick is "capture-count"
		if (itemId === completionPath.advanceClick) {
			triggerStep(activeStep.id);
			showNotification('Cell count captured.', 'success');
			renderGame();
		}
		return;
	}

	// MANUAL HEMOCYTOMETER PATH (Patch 16):
	// Two-step viability-then-counting workflow using modal.screen routing.
	if (activeStep.modal?.screen === 'viability') {
		// Viability confirmation step: user clicks "Confirm and Proceed to Counting"
		if (itemId === 'confirm-viability') {
			gameState.manualHemocytometerViabilityChecked = true;
			triggerStep(activeStep.id);
			showNotification('Viability confirmed. Proceed to counting.', 'success');
			renderGame();
		}
		return;
	}

	if (activeStep.modal?.screen === 'counting') {
		// Manual counting step: user submits 4 quadrant counts
		if (itemId === 'submit-cell-count') {
			// Check if the legacy code has populated the quadrant counts
			const quadrantCounts = (gameState as any).manualHemocytometerQuadrantCounts as (number | null)[];
			if (!quadrantCounts || quadrantCounts.length < 4) {
				showNotification('Please count cells in all 4 corner quadrants.', 'warning');
				return;
			}

			// Verify all 4 quadrants have counts
			let countedQuadrants = 0;
			let totalQuadrantCount = 0;
			for (let i = 0; i < 4; i++) {
				const count = quadrantCounts[i];
				if (count !== null && count !== undefined && typeof count === 'number') {
					countedQuadrants++;
					totalQuadrantCount += count;
				}
			}

			if (countedQuadrants < 4) {
				showNotification('Please count cells in all 4 corner quadrants.', 'warning');
				return;
			}

			// Formula: (sum of counts) / 4 (avg per square) * 10 (dilution) * 10,000 (hemocytometer conversion)
			const avgPerSquare = totalQuadrantCount / 4;
			const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
			gameState.cellCount = estimatedCount;

			// Mark as submitted
			gameState.manualHemocytometerSubmitted = true;

			// Provide feedback comparing estimate to actual
			const actual = gameState.actualCellCount;
			const errorPercent = Math.abs(estimatedCount - actual) / actual * 100;

			let feedback = 'Your count: ~' + estimatedCount.toLocaleString() + ' cells/mL. ';
			if (errorPercent <= 10) {
				feedback += 'Excellent -- very close to actual!';
			} else if (errorPercent <= 25) {
				feedback += 'Good count, within acceptable range.';
			} else {
				feedback += 'Actual was ~' + actual.toLocaleString() + ' cells/mL.';
			}

			showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
			triggerStep(activeStep.id);
			renderGame();
		}
		return;
	}
}

function renderMicroscope(ctx: SceneContext): void {
	renderMicroscopeScene();
}

const microscopeSceneAdapter = {
	sceneId: 'microscope',
	dispatchInteraction: dispatchMicroscopeInteraction,
	render: renderMicroscope,
};

//============================================
// registerScene at module load
//============================================

registerScene(microscopeSceneAdapter);
