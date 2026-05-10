//============================================
// bench/dispatch.ts - Bench scene interaction dispatch
//============================================

import type { Interaction, ProtocolStep } from "../../constants";
import {
	gameState,
	getCurrentStep,
	showNotification,
	renderGame,
	triggerStep,
	switchScene,
} from "../../game_state";
import { REAGENTS } from "../../inventory";
import { resolveInteraction, resolveInteractionByIndex } from "../../interaction_resolver";
import { canonicalTool, deriveHeldLiquid } from "../shared/liquid_transfer";
import { getSceneItemLabel } from "../shared/scene_item_lookup";
import { showWrongOrderToast } from "../shared/wrong_order_feedback";
import { SCENE_CONFIGS } from "../../scene_configs";
import { renderTrypsinIncubation } from "../incubator/incubator";

const BENCH_CONFIG_OPTIONAL = SCENE_CONFIGS['bench'];

// Assert BENCH_CONFIG is defined; fail fast if not.
if (!BENCH_CONFIG_OPTIONAL) {
	throw new Error('SCENE_CONFIGS missing bench - bench dispatch cannot initialize');
}

const BENCH_CONFIG = BENCH_CONFIG_OPTIONAL;

//============================================
// showWrongOrderHint(itemId, step, interaction) - Bench version
//
// Display wrong-order hint for bench clicks.
//============================================
function showWrongOrderHint(clickedItemId: string, step: ProtocolStep | null, interaction: Interaction | undefined): void {
	const clickedElem = document.querySelector(`[data-item-id="${clickedItemId}"]`) as HTMLElement | null;
	if (clickedElem) {
		clickedElem.classList.add('wrong-order-shake');
		setTimeout(() => {
			clickedElem.classList.remove('wrong-order-shake');
		}, 400);
	}

	let hintMessage: string;

	if (!interaction) {
		hintMessage = 'Try the highlighted item.';
	} else {
		const toolPreconditionMet = (): boolean => {
			if (canonicalTool(gameState.selectedTool) === interaction.tool) return true;
			const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
			if (heldLiquid && heldLiquid.tool === interaction.tool) return true;
			return false;
		};

		if (interaction.tool && !toolPreconditionMet()) {
			const toolLabel = getSceneItemLabel(BENCH_CONFIG.items, interaction.tool);
			hintMessage = `Use the ${toolLabel} first.`;
		} else if (interaction.source) {
			const sourceLabel = getSceneItemLabel(BENCH_CONFIG.items, interaction.source);
			hintMessage = `Use the ${sourceLabel}.`;
		} else if (interaction.destination) {
			const destLabel = getSceneItemLabel(BENCH_CONFIG.items, interaction.destination);
			hintMessage = `Use the ${destLabel}.`;
		} else {
			hintMessage = 'Try the highlighted item.';
		}
	}

	showWrongOrderToast(hintMessage);
}

//============================================
// dispatchBenchInteractionClick(itemId: string)
//
// New wiring logic for bench using resolveInteractionByIndex.
// Handles K2 completionPath.kind === 'interactionSequence' steps.
//============================================
function dispatchBenchInteractionClick(itemId: string): void {
	const activeStep = getCurrentStep();
	if (!activeStep || activeStep.completionPath?.kind !== 'interactionSequence') {
		return;
	}

	const interactions = activeStep.completionPath.interactions;

	const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
	const cleanTool = canonicalTool(gameState.selectedTool);
	const result = resolveInteractionByIndex({
		selectedTool: cleanTool,
		clickedItem: itemId,
		activeStep: activeStep,
		interactionIndex: gameState.interactionIndex,
		heldLiquid: heldLiquid,
	});

	// Wrong-order click: increment wrongOrderClicks, show hint, return
	if (result.wrongOrder === true) {
		gameState.wrongOrderClicks++;
		const activeInteraction = interactions[gameState.interactionIndex];
		showWrongOrderHint(itemId, activeStep, activeInteraction);
		return;
	}

	// Handle the result based on kind and indexDelta
	if (result.kind === 'load') {
		const reagent = REAGENTS[result.resultLiquid];
		if (!reagent) {
			throw new Error(`Reagent "${result.resultLiquid}" not found in REAGENTS inventory`);
		}
		gameState.heldLiquid = {
			tool: result.resultActor,
			liquid: result.resultLiquid,
			volumeMl: result.volumeMl,
			colorKey: reagent.colorKey,
		};

		// K2 dispatch: no legacy token needed, heldLiquid state is sufficient
		gameState.selectedTool = result.resultActor;

		if (result.indexDelta === 1) {
			gameState.interactionIndex++;
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
		}

		let notification = 'Loaded ' + result.resultLiquid + '.';
		showNotification(notification);
		renderGame();
		return;
	}

	if (result.kind === 'discharge') {
		if (activeStep && activeStep.id && result.completionEvent) {
			// centrifuge: zero flask volume so the resuspend guard does not trip
			if (result.completionEvent === 'centrifuge') {
				gameState.flaskMediaMl = 0;
				gameState.flaskMediaAge = 'old';
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Cells centrifuged.', 'success');
				renderGame();
				return;
			}
			// prewarm: advance step to mark media temperature changed
			if (result.completionEvent === 'prewarm') {
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Media warmed.', 'success');
				renderGame();
				return;
			}
		}
		gameState.selectedTool = canonicalTool(gameState.selectedTool);
		renderGame();
		return;
	}

	if (result.kind === 'error') {
		showNotification(result.hint);
		return;
	}

	// No match via new resolver; fall through to legacy code
	renderGame();
}

//============================================
// onBenchItemClick(itemId: string): void
//
// Click handler for bench items. Microscope/incubator open their
// modal overlays; the remaining instruments advance their matching
// protocol step when the active step calls for them.
//============================================
export function onBenchItemClick(itemId: string): void {
	// Route clicks through interactionIndex-aware resolver for steps with completionPath.kind === 'interactionSequence'
	const activeStep = getCurrentStep();
	if (activeStep && activeStep.completionPath?.kind === 'interactionSequence') {
		dispatchBenchInteractionClick(itemId);
		return;
	}

	// Legacy path for steps without interactionSequence
	// Old resolver code kept for compatibility
	if (activeStep) {
		const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
		const cleanTool = canonicalTool(gameState.selectedTool);
		const result = resolveInteraction({
			selectedTool: cleanTool,
			clickedItem: itemId,
			activeStep: activeStep,
			heldLiquid: heldLiquid,
		});
		if (result.kind === 'load') {
			// Set legacy _with_X token from the load result so existing downstream code keeps working.
			const legacyToken = result.resultLiquid === 'pbs'     ? 'serological_pipette_with_pbs'
						  : result.resultLiquid === 'trypsin' ? 'serological_pipette_with_trypsin'
						  : result.resultLiquid === 'media'   ? 'serological_pipette_with_media'
						  : result.resultLiquid === 'cells'   ? 'serological_pipette_with_cells'
						  : null;
			if (legacyToken) {
				gameState.selectedTool = legacyToken;
				let notification = 'Loaded ' + result.resultLiquid + '.';
				if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
				if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
				if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
				if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
				showNotification(notification);
				renderGame();
				return;
			}
			// Unknown liquid; fall through to legacy.
		} else if (result.kind === 'discharge') {
			// For discharge, dispatch based on the completion event name
			if (activeStep && activeStep.id && result.completionEvent) {
				// centrifuge: zero flask volume so the resuspend guard does not trip
				if (result.completionEvent === 'centrifuge') {
					gameState.flaskMediaMl = 0;
					gameState.flaskMediaAge = 'old';
					triggerStep(activeStep.id);
					showNotification('Cells centrifuged.', 'success');
					return;
				}
				// prewarm: advance step to mark media temperature changed
				if (result.completionEvent === 'prewarm') {
					triggerStep(activeStep.id);
					showNotification('Media warmed.', 'success');
					return;
				}
			}
			// Fallback: reset tool and re-render
			gameState.selectedTool = canonicalTool(gameState.selectedTool);
			renderGame();
			return;
		} else if (result.kind === 'error') {
			showNotification(result.hint);
			return;
		}
		// result.kind === 'no-op': fall through to the existing legacy if-ladder.
	}
	if (itemId === 'microscope') {
		// Serological pipette loaded with sample: use this click to load
		// the hemocytometer with trypan-blue-stained cells, then open the
		// microscope overlay. Mirrors the legacy hood handler which is
		// now dead because microscope no longer lives on the hood.
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		// switchScene already calls renderGame -- calling it again here
		// would start a second concurrent animation for modal scenes.
		switchScene('microscope');
		return;
	}
	if (itemId === 'incubator') {
		// Flask held + trypsin added + not yet incubated: run trypsin
		// incubation (UI sub-state, not a protocol step). After the
		// animation we return to hood for media neutralization.
		if (gameState.selectedTool === 'flask'
			&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = null;
			renderTrypsinIncubation();
			return;
		}
		// Well plate held: run the main incubator animation which
		// dispatches the matching incubate_* protocol step and returns
		// to hood. Do NOT call renderGame() after switchScene -- the
		// switchScene call already does, and a second call would start
		// a second concurrent runIncubationOverlay setInterval, causing
		// onComplete to fire twice. The second fire fell into the
		// fallback branch (since activeStepId had already advanced)
		// and pushed the next incubate_* id into outOfOrderAttempts.
		if (gameState.selectedTool === 'well_plate') {
			gameState.selectedTool = null;
			switchScene('incubator');
			return;
		}
		switchScene('incubator');
		return;
	}
	if (itemId === 'plate_reader') {
		const currentStep = getCurrentStep();
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'modal' && currentStep.completionPath.openClick === 'plate_reader') {
			switchScene('plate_reader');
			return;
		}
		showNotification('The plate reader is ready for the readout step.');
		return;
	}
	// Centrifuge: complete the centrifuge step when clicked
	if (itemId === 'centrifuge') {
		const currentStep = getCurrentStep();
		// Use completionPath.tool to match directTool steps (cell_culture centrifuge and tutorials)
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'directTool' && currentStep.completionPath.tool === 'centrifuge') {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
			// Centrifuge pellets the cells; supernatant is discarded.
			// Zero the flask volume so the subsequent resuspend flow
			// (serological + media_bottle + flask) can start from an
			// "empty" container without tripping startAddingMedia's
			// "flask must be aspirated first" guard.
			gameState.flaskMediaMl = 0;
			gameState.flaskMediaAge = 'old';
		}
		showNotification('Cells centrifuged.');
		return;
	}
	// Water bath: complete prewarm_media when clicked
	if (itemId === 'water_bath') {
		const currentStep = getCurrentStep();
		// Use completionPath.tool to match directTool steps
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'directTool' && currentStep.completionPath.tool === 'water_bath') {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
		}
		showNotification('Media warmed.');
		return;
	}
	// Cell counter: counting UI lives in the microscope overlay
	// (manual hemocytometer + quadrant counts). Routing here lets
	// the visibly-highlighted cell_counter item on the bench
	// actually advance count_cells. Mirror the microscope branch's
	// sample-load side effect so hemocytometerLoaded flips and the
	// downstream serological + flask click in the hood routes to
	// "load cells for plate transfer" instead of looping back to
	// "load sample for counting". switchScene already renders; do
	// not call renderGame() after it.
	if (itemId === 'cell_counter') {
		// New protocol: cell_counter is a modal opener that switches to microscope scene
		// Old protocol: cell_counter click after serological_pipette_with_sample
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		switchScene('microscope');
		return;
	}
	showNotification(getSceneItemLabel(BENCH_CONFIG?.items, itemId));
}
