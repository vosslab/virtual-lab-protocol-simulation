//============================================
// plate/dispatch.ts - Plate scene interaction routing
// Owns: click dispatch, scene transitions
//============================================

import type { ProtocolStep } from "../../constants";
import { gameState, getCurrentStep, triggerStep, switchScene, showNotification, renderGame, addWellLiquid, addTubeLiquid } from "../../game_state";
import { computeTargetClassification } from "./plate_liquid_state";

//============================================
// onPlateItemClick - Main dispatcher for plate scene interactions
//
// Handles multipleChoice, modal flow, and plateTargets-driven interactionSequence.
// For multipleChoice, processes choice button clicks.
// For plateTargets, processes well_plate clicks and advances on completion.
//============================================
export function onPlateItemClick(itemId: string): void {
	const currentStep = getCurrentStep();
	if (!currentStep) {
		return;
	}

	// Multiple-choice quiz step
	if (currentStep.completionPath?.kind === 'multipleChoice') {
		const cp = currentStep.completionPath;
		const choice = cp.choices.find(c => c.id === itemId);
		if (!choice) return;
		if (choice.correct) {
			showNotification(choice.feedback);
			triggerStep(currentStep.id);
		} else {
			showNotification(choice.feedback);
		}
		return;
	}

	// Legacy modal flow (backward compat for plate_intro)
	if (currentStep.completionPath?.kind === 'modal') {
		if (itemId === currentStep.completionPath.advanceClick) {
			triggerStep(currentStep.id);
		}
		return;
	}

	// tubeTargets-driven flow: interactionSequence with tubeTargets (dilution-prep)
	if (currentStep.completionPath?.kind === 'interactionSequence' && currentStep.completionPath.tubeTargets) {
		const cp = currentStep.completionPath;
		const currentInteraction = cp.interactions[gameState.interactionIndex];
		if (!currentInteraction) return;

		// Load click: source/diluent bottle. Source field is set on load interactions.
		if (currentInteraction.source && itemId === currentInteraction.source) {
			if (currentInteraction.stateChange?.heldLiquid) {
				gameState.heldLiquid = currentInteraction.stateChange.heldLiquid;
			}
			gameState.interactionIndex += 1;
			renderGame();
			return;
		}

		// Discharge click: destination microtube. Destination field is set on discharge interactions.
		if (currentInteraction.destination && itemId === currentInteraction.destination) {
			// Pour the held liquid into the tube via addTubeLiquid. The function
			// looks up colorKey from REAGENTS itself; we just pass id + volume.
			if (gameState.heldLiquid) {
				addTubeLiquid(
					currentInteraction.destination,
					gameState.heldLiquid.liquid,
					gameState.heldLiquid.volumeMl,
				);
				gameState.heldLiquid = null;
			}
			gameState.interactionIndex += 1;

			// All interactions complete: trigger step.
			if (gameState.interactionIndex >= cp.interactions.length) {
				showNotification('Dilution tube prepared.');
				triggerStep(currentStep.id);
			} else {
				renderGame();
			}
			return;
		}

		// Clicked something else (wrong item for this stage): no-op, ignore quietly.
		return;
	}

	// plateTargets-driven flow: interactionSequence with plateTargets
	if (currentStep.completionPath?.kind === 'interactionSequence' && currentStep.completionPath.plateTargets) {
		const cp = currentStep.completionPath;
		const currentInteraction = cp.interactions[gameState.interactionIndex];

		// Handle load interactions (source/tool clicks): update heldLiquid state
		if (currentInteraction && currentInteraction.source && itemId === currentInteraction.source) {
			if (currentInteraction.stateChange?.heldLiquid) {
				gameState.heldLiquid = currentInteraction.stateChange.heldLiquid;
			}
			// Advance to discharge interaction
			gameState.interactionIndex += 1;
			renderGame();
			return;
		}

		// Handle discharge interactions: well_plate clicks deposit liquids
		if (itemId !== 'well_plate') {
			return;
		}

		const classification = computeTargetClassification(currentStep, gameState.interactionIndex);

		if (classification.activeTarget) {
			const target = classification.activeTarget;
			for (const row of target.rows) {
				for (const col of target.cols) {
					addWellLiquid(row, col, target.liquid, target.volumeMl);
				}
			}
		}

		// Clear heldLiquid after discharge
		gameState.heldLiquid = null;

		// Advance to next load interaction (or end of step)
		gameState.interactionIndex += 1;

		// Check if all targets are complete
		if (classification.currentTargetIndex >= classification.totalTargets) {
			// All targets done: trigger step completion
			showNotification(`All targets deposited.`);
			triggerStep(currentStep.id);
		} else {
			// More targets to go: just re-render
			renderGame();
		}
		return;
	}

}
