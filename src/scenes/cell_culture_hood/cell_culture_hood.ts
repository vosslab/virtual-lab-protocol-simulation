//============================================
// cell_culture_hood.ts - Hood scene adapter (driver mode)
// Thin glue between SceneContext and legacy hood game-state dispatch
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	gameState,
	renderGame,
	showNotification,
	triggerStep,
} from "../../game_state";
import { resolveInteractionByIndex } from "../../interaction_resolver";
import { showWrongOrderToast } from "../shared/wrong_order_feedback";
import { canonicalTool } from "../shared/liquid_transfer";
import { FRESH_MEDIA_TARGET_ML } from "../../constants";
import { hideTransferHud } from "../../ui_rendering";
import { REAGENTS } from "../../content/inventory_data";
import { renderHoodScene } from "../hood";

//============================================
// buildLegacyToken - Utility for constructing legacy tool tokens
//============================================
function buildLegacyToken(actor: string | null, liquid: string | null): string | null {
	const tool = actor || 'serological_pipette';
	const legacyToken = liquid === 'pbs'     ? `${tool}_with_pbs`
					  : liquid === 'trypsin' ? `${tool}_with_trypsin`
					  : liquid === 'media'   ? `${tool}_with_media`
					  : liquid === 'cells'   ? `${tool}_with_cells`
					  : null;
	return legacyToken;
}

//============================================
// dispatchHoodInteraction - Per-protocol dispatch wiring for hood scene
// Mirrors the effect logic from legacy hood.ts dispatchHoodInteractionClick
//============================================

function dispatchHoodInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// For hood steps with interactionSequence, validate the click first via resolveInteractionByIndex
	// to detect wrong-order interactions. The legacy dispatchHoodInteractionClick had this logic.
	if (activeStep.completionPath?.kind === 'interactionSequence') {
		const cleanTool = canonicalTool(gameState.selectedTool);
		const resolveArgs = {
			selectedTool: cleanTool,
			clickedItem: itemId,
			activeStep: activeStep,
			interactionIndex: gameState.interactionIndex,
		};

		if (gameState.heldLiquid && gameState.heldLiquid.liquid) {
			(resolveArgs as any).heldLiquid = gameState.heldLiquid;
		}

		const result = resolveInteractionByIndex(resolveArgs);

		// Wrong-order click: show hint and return without advancing
		if (result.wrongOrder === true) {
			gameState.wrongOrderClicks++;
			const activeInteraction = activeStep.completionPath.interactions[gameState.interactionIndex];
			showWrongOrderToast('Try the expected item.');
			return;
		}

		// Handle load result (setting heldLiquid and advancing interactionIndex if needed)
		if (result.kind === 'load') {
			if (result.resultActor && result.resultLiquid) {
				const reagent = REAGENTS[result.resultLiquid];
				const colorKey = reagent ? reagent.colorKey : result.resultLiquid;
				gameState.heldLiquid = {
					tool: result.resultActor,
					liquid: result.resultLiquid,
					volumeMl: result.volumeMl,
					colorKey: colorKey,
				};
			}

			// Build legacy token for downstream code
			const legacyToken = buildLegacyToken(result.resultActor, result.resultLiquid);
			if (legacyToken) {
				gameState.selectedTool = legacyToken;
			}

			// If indexDelta is 1, advance the interaction index
			if (result.indexDelta === 1) {
				gameState.interactionIndex++;
				// If we've reached the end of the sequence, call triggerStep
				if (gameState.interactionIndex >= activeStep.completionPath.interactions.length) {
					triggerStep(activeStep.id);
				}
			}

			let notification = 'Loaded ' + result.resultLiquid + '.';
			showNotification(notification);
			renderGame();
			return;
		}

		// Handle discharge result (dispatching based on completionEvent)
		if (result.kind === 'discharge') {
			// Special case: if indexDelta === 0, this is a tool-select action (pre-discharge setup).
			// Set selectedTool for subsequent source/destination clicks, then return without discharge.
			const currentInteraction = activeStep.completionPath.interactions ? activeStep.completionPath.interactions[gameState.interactionIndex] : null;
			if (result.indexDelta === 0 && currentInteraction && (currentInteraction.source || currentInteraction.destination)) {
				// Tool-select mode: set selectedTool and wait for source/destination click
				const expectedTool = currentInteraction.tool;
				gameState.selectedTool = expectedTool || null;
				renderGame();
				return;
			}

			// Advance interactionIndex if needed (before calling completionEvent handlers)
			if (result.indexDelta === 1) {
				gameState.interactionIndex++;
			}
			// If we've reached the end of the sequence, call triggerStep
			if (gameState.interactionIndex >= activeStep.completionPath.interactions.length) {
				triggerStep(activeStep.id);
				renderGame();
				return;
			}
		}
	}

	// After handling load/discharge, check if the current interaction has a completionEvent handler
	// (i.e., it's a final discharge step). If not, just render and return.

	if (activeStep.completionPath?.kind === 'interactionSequence') {
		const interactions = activeStep.completionPath.interactions;
		if (!interactions || interactions.length === 0) {
			renderGame();
			return;
		}

		// Get the CURRENT active interaction (after potential indexDelta advancement above)
		const activeInteraction = interactions[gameState.interactionIndex];
		if (!activeInteraction || !activeInteraction.completionEvent) {
			// No completionEvent on this interaction; it's an intermediate step
			// (already handled by load/discharge logic above)
			renderGame();
			return;
		}

		// We have a completionEvent handler to dispatch
		const completionEvent = activeInteraction.completionEvent;

		// Map completionEvent to state mutations and notifications
		if (completionEvent === 'spray_ethanol') {
			gameState.hoodSprayed = true;
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Sprayed hood with 70% ethanol.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'pbs_wash') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.flaskMediaAge = 'fresh';
			showNotification('Flask rinsed with PBS.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'pipette_trypsin') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.trypsinAdded = true;
			showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'pipette_media') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
				gameState.trypsinNeutralized = true;
			}
			showNotification('Media added to flask.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'pipette_to_plate') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.wellPlate.forEach(well => {
				well.hasCells = true;
			});
			gameState.cellsTransferred = true;
			showNotification('Cells transferred to all 24 wells.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'centrifuge') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.flaskMediaMl = 0;
			gameState.flaskMediaAge = 'old';
			showNotification('Cells centrifuged.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'media_adjust') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Media adjusted for all wells.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'carb-low-range-confirm') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Low-range carboplatin stocks prepared.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'carb-high-range-confirm') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('High-range carboplatin stocks prepared.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'metformin-stock-prepare') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Metformin 10 mM working stock prepared.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'carb-add-confirm') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.drugsAdded = true;
			showNotification('Carboplatin added to rows B-H.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'metformin-add-confirm') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Metformin added to columns 7-12.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'resuspend') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			// When resuspend completes, record the waste and complete the step
			// (driver mode: synchronous completion without animation)
			const finalVolume = gameState.flaskMediaMl;
			const waste = Math.abs(finalVolume - FRESH_MEDIA_TARGET_ML);
			gameState.mediaWastedMl += waste;
			gameState.flaskMediaAge = 'fresh';
			hideTransferHud();
			showNotification(`Resuspended in ${finalVolume.toFixed(1)} mL.`, 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'decant_mtt') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('MTT decanted into biohazard bin.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'carb_intermediate_complete') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Carboplatin intermediate dilution complete.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'aspirate') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Aspiration complete.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'add_dmso') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('DMSO added.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		if (completionEvent === 'add_mtt') {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('MTT added.', 'success');
			triggerStep(activeStep.id);
			renderGame();
			return;
		}

		// Generic fallback: advance index, clear tool, and render
		gameState.selectedTool = null;
		gameState.heldLiquid = null;
		renderGame();
		return;
	}

	// Fallback for non-interactionSequence steps: just re-render
	renderGame();
}

function renderHood(ctx: SceneContext): void {
	renderHoodScene();
}

const cellCultureHoodAdapter = {
	sceneId: 'cell_culture_hood',
	dispatchInteraction: dispatchHoodInteraction,
	render: renderHood,
};

//============================================
// registerScene at module load
//============================================

registerScene(cellCultureHoodAdapter);
