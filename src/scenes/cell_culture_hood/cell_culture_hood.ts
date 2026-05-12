//============================================
// cell_culture_hood.ts - Hood scene adapter (driver mode)
// Render ownership: moved from src/scenes/hood.ts in Patch A3
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	gameState,
	recordCleanlinessError,
	registerWarning,
	registeredEmitters,
	renderGame,
	showNotification,
	switchScene,
	triggerStep,
} from "../../game_state";
import { resolveInteraction, resolveInteractionByIndex } from "../../interaction_resolver";
import { showWrongOrderToast } from "../shared/wrong_order_feedback";
import { canonicalTool, deriveHeldLiquid } from "../shared/liquid_transfer";
import { FRESH_MEDIA_TARGET_ML } from "../../constants";
import { hideTransferHud, renderProtocolPanel, renderScoreDisplay } from "../../ui_rendering";
import { REAGENTS } from "../../inventory";
import { startAspiration, startAddingMedia } from "../../steps/feed_cells";
import { startDrugAddition } from "../../steps/drug_treatment";
import { applyPlateDoseMap } from "../../steps/plate_96";
import { renderTrypsinIncubation } from "../incubator/incubator";
import { renderHoodScene, getStartingToolForStep, getReagentSourceForStep, showWrongOrderHint, getAvailableActions } from "./render";
import { getSceneItemLabel } from "../shared/scene_item_lookup";
import { SCENE_CONFIGS } from "../../scene_configs";
import { setupHoodEventListeners } from "./hood_shared";

//============================================
// Hood config cache (loaded from SCENE_CONFIGS at runtime)
//============================================
const HOOD_CONFIG = SCENE_CONFIGS['cell_culture_hood'];

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
// Register hood-related emitters at module load
// These step ids are dispatched from hood interactions.
// The validator checks for completion-event coverage at page load.
//============================================
registeredEmitters.add('spray_hood');
registeredEmitters.add('pbs_wash');
registeredEmitters.add('add_trypsin');
registeredEmitters.add('seed_plate');
registeredEmitters.add('media_adjust');
registeredEmitters.add('add_mtt');
registeredEmitters.add('decant_mtt');
registeredEmitters.add('add_dmso');
registeredEmitters.add('carb_low_range');
registeredEmitters.add('metformin_stock');
registeredEmitters.add('add_carboplatin');
registeredEmitters.add('add_metformin');

//============================================
// dispatchInteractionClick(itemId: string)
//
// Patch 6: New wiring logic using resolveInteractionByIndex.
// Dispatches a click through the interactionIndex-aware resolver.
// On wrong-order, increments wrongOrderClicks and shows hint.
// On tool-select, updates selectedTool state without advancing.
// On interaction advance, advances interactionIndex and calls triggerStep if sequence complete.
//============================================
function dispatchInteractionClick(itemId: string): void {
	const activeStep = getCurrentStep();
	if (!activeStep || !activeStep.completionPath || activeStep.completionPath.kind !== 'interactionSequence') {
		return;
	}
	const interactions = activeStep.completionPath.interactions;

	const cleanTool = canonicalTool(gameState.selectedTool);

	const resolveArgs: Parameters<typeof resolveInteractionByIndex>[0] = {
		selectedTool: cleanTool,
		clickedItem: itemId,
		activeStep: activeStep,
		interactionIndex: gameState.interactionIndex,
	};

	if (gameState.heldLiquid && gameState.heldLiquid.liquid) {
		resolveArgs.heldLiquid = gameState.heldLiquid;
	}

	const result = resolveInteractionByIndex(resolveArgs);

	if (result.wrongOrder === true) {
		gameState.wrongOrderClicks++;
		const activeInteraction = interactions[gameState.interactionIndex];
		showWrongOrderHint(itemId, activeStep, activeInteraction);
		return;
	}

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
			gameState.selectedTool = result.resultActor;
		}

		if (result.indexDelta === 1) {
			gameState.interactionIndex++;
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
		}

		let notification = 'Loaded ' + result.resultLiquid + '.';
		if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
		if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
		if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
		if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
		showNotification(notification);
		renderGame();
		return;
	}

	if (result.kind === 'discharge') {
		const currentInteraction = interactions ? interactions[gameState.interactionIndex] : null;
		if (result.indexDelta === 0 && currentInteraction && (currentInteraction.source || currentInteraction.destination)) {
			const expectedTool = currentInteraction.tool;
			gameState.selectedTool = expectedTool || null;
			renderGame();
			return;
		}

		if (activeStep && activeStep.id && result.completionEvent) {
			if (result.completionEvent === 'spray_ethanol') {
				gameState.hoodSprayed = true;
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Sprayed hood with 70% ethanol.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'aspirate') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAspiration();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'pbs_wash') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.flaskMediaAge = 'fresh';
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Flask rinsed with PBS.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'pipette_trypsin') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.trypsinAdded = true;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'pipette_media') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
					gameState.trypsinNeutralized = true;
				}
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAddingMedia();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'pipette_to_plate') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.wellPlate.forEach(well => {
					well.hasCells = true;
				});
				gameState.cellsTransferred = true;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Cells transferred to all 24 wells.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
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
			if (result.completionEvent === 'media_adjust') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Media adjusted for all wells.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'resuspend') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAddingMedia();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'carb-low-range-confirm') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Low-range carboplatin stocks prepared.', 'success');
				renderGame();
				return;
			}
			if (result.completionEvent === 'metformin-stock-prepare') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Metformin 10 mM working stock prepared.', 'success');
				renderGame();
				return;
			}
			if (result.completionEvent === 'carb-add-confirm') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				applyPlateDoseMap();
				gameState.drugsAdded = true;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Carboplatin added to rows B-H.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'metformin-add-confirm') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Metformin added to columns 7-12.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'decant_mtt') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('MTT decanted into biohazard bin.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
		}
		if (activeStep && result.indexDelta === 1) {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.interactionIndex += result.indexDelta;
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
			renderGame();
			return;
		}
		gameState.selectedTool = canonicalTool(gameState.selectedTool);
		renderGame();
		return;
	}

	if (result.kind === 'error') {
		showNotification(result.hint);
		return;
	}

	renderGame();
}

//============================================
// onItemClick(itemId: string)
//
// Main click dispatcher for hood items. Routes through new and legacy interactions.
//============================================
function onItemClick(itemId: string): void {
	const activeStep = getCurrentStep();
	if (activeStep && activeStep.completionPath && activeStep.completionPath.kind === 'interactionSequence') {
		dispatchInteractionClick(itemId);
		return;
	}

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
			if (result.resultActor && result.resultLiquid && result.volumeMl) {
				const reagent = REAGENTS[result.resultLiquid];
				const colorKey = reagent ? reagent.colorKey : result.resultLiquid;
				gameState.heldLiquid = {
					tool: result.resultActor,
					liquid: result.resultLiquid,
					volumeMl: result.volumeMl,
					colorKey: colorKey,
				};
				gameState.selectedTool = result.resultActor;
				let notification = 'Loaded ' + result.resultLiquid + '.';
				if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
				if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
				if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
				if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
				showNotification(notification);
				renderGame();
				return;
			}
		} else if (result.kind === 'discharge') {
			if (activeStep && activeStep.id && result.completionEvent) {
				if (result.completionEvent === 'spray_ethanol') {
					gameState.hoodSprayed = true;
					triggerStep(activeStep.id);
					showNotification('Sprayed hood with 70% ethanol.', 'success');
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'aspirate') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					startAspiration();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pbs_wash') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.flaskMediaAge = 'fresh';
					triggerStep(activeStep.id);
					showNotification('Flask rinsed with PBS.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_trypsin') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.trypsinAdded = true;
					triggerStep(activeStep.id);
					showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_media') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
						gameState.trypsinNeutralized = true;
					}
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_to_plate') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.wellPlate.forEach(well => {
						well.hasCells = true;
					});
					gameState.cellsTransferred = true;
					triggerStep(activeStep.id);
					showNotification('Cells transferred to all 24 wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'centrifuge') {
					gameState.flaskMediaMl = 0;
					gameState.flaskMediaAge = 'old';
					triggerStep(activeStep.id);
					showNotification('Cells centrifuged.', 'success');
					return;
				}
				if (result.completionEvent === 'prewarm') {
					triggerStep(activeStep.id);
					showNotification('Media warmed.', 'success');
					return;
				}
				if (result.completionEvent === 'media_adjust') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					triggerStep(activeStep.id);
					showNotification('Media adjusted for all wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'resuspend') {
					gameState.selectedTool = null;
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
			}
			gameState.selectedTool = canonicalTool(gameState.selectedTool);
			renderGame();
			return;
		} else if (result.kind === 'error') {
			showNotification(result.hint);
			return;
		}
	}

	if (!gameState.selectedTool) {
		if (itemId === 'ethanol_bottle') {
			const currentStep = getCurrentStep();
			if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'directTool' && currentStep.completionPath.tool === 'ethanol_bottle') {
				if (gameState.activeStepId) {
					triggerStep(gameState.activeStepId);
				}
				gameState.hoodSprayed = true;
				showNotification('Sprayed hood with 70% ethanol.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
		}

		if (itemId === 'microscope' && gameState.hemocytometerLoaded
			&& !gameState.completedSteps.includes('count_cells')) {
			switchScene('microscope');
			return;
		}

		if (itemId === 'microscope' && !gameState.hemocytometerLoaded) {
			if (!gameState.trypsinNeutralized) {
				showNotification('Complete trypsinization and media neutralization first.', 'warning');
			} else {
				showNotification('Load a cell sample onto the hemocytometer first.', 'warning');
			}
			return;
		}

		const currentStep = getCurrentStep();
		// Modal-kind completion path targeting well_plate (e.g., open_plate_workspace step)
		if (
			itemId === 'well_plate'
			&& currentStep
			&& currentStep.completionPath?.kind === 'modal'
			&& currentStep.completionPath.openClick === 'well_plate'
			&& currentStep.modal?.owner === 'plate'
		) {
			switchScene('well_plate_workspace');
			return;
		}
		// New dedicated well_plate_workspace scene flow
		if (itemId === 'well_plate' && currentStep && currentStep.scene === 'well_plate_workspace') {
			switchScene('well_plate_workspace');
			return;
		}

		if (itemId === 'well_plate' && gameState.cellsTransferred && gameState.drugsAdded
			&& !gameState.incubated) {
			gameState.selectedTool = 'well_plate';
			showNotification('Holding plate. Click the incubator to place it inside.');
			renderHoodScene();
			return;
		}

		if (itemId === 'flask' && gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = 'flask';
			showNotification('Holding flask. Click the incubator to incubate with trypsin.');
			renderHoodScene();
			return;
		}

		gameState.selectedTool = itemId;
		showNotification('Picked up ' + getSceneItemLabel(HOOD_CONFIG?.items, itemId));
		renderHoodScene();
		return;
	}

	const tool = gameState.selectedTool;

	if (tool === 'aspirating_pipette' && itemId === 'flask') {
		if (!gameState.hoodSprayed) {
			registerWarning('Always sanitize the hood before working! Spray with 70% ethanol first.');
			recordCleanlinessError('Started work without sanitizing the hood.');
		}
		gameState.selectedTool = null;
		startAspiration();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'flask' && itemId === 'incubator'
		&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
		gameState.selectedTool = null;
		renderTrypsinIncubation();
		return;
	}

	if (tool === 'serological_pipette' && itemId === 'trypsin_bottle') {
		gameState.selectedTool = 'serological_pipette_with_trypsin';
		showNotification('Loaded trypsin-EDTA. Click the flask to add.');
		renderHoodScene();
		return;
	}

	if (tool === 'serological_pipette_with_trypsin' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.trypsinAdded = true;
		showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'serological_pipette' && itemId === 'media_bottle') {
		gameState.mediaWarmed = true;
		gameState.selectedTool = 'serological_pipette_with_media';
		showNotification('Media warmed to 37 degrees C and loaded into pipette. Click the flask.');
		renderHoodScene();
		return;
	}

	if (tool === 'serological_pipette_with_media' && itemId === 'flask') {
		gameState.selectedTool = null;
		if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
			gameState.trypsinNeutralized = true;
		}
		startAddingMedia();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'serological_pipette' && itemId === 'pbs_bottle') {
		gameState.selectedTool = 'serological_pipette_with_pbs';
		showNotification('PBS loaded into pipette. Click the flask to rinse.');
		renderHoodScene();
		return;
	}

	if (tool === 'serological_pipette_with_pbs' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'pbs_bottle' && itemId === 'flask' && gameState.flaskMediaAge === 'old') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'serological_pipette' && itemId === 'flask' && gameState.flaskMediaAge === 'fresh') {
		const countDone = gameState.completedSteps.indexOf('count_cells') >= 0;
		if (!countDone) {
			gameState.selectedTool = 'serological_pipette_with_sample';
			showNotification('Cell sample loaded. Click the microscope to load the hemocytometer.');
			renderHoodScene();
			return;
		}
		gameState.selectedTool = 'serological_pipette_with_cells';
		showNotification('Loaded cell suspension. Click the 24-well plate to transfer.');
		renderHoodScene();
		return;
	}

	if (tool === 'serological_pipette_with_sample' && itemId === 'microscope') {
		gameState.selectedTool = null;
		gameState.hemocytometerLoaded = true;
		showNotification('Sample mixed with trypan blue and loaded onto hemocytometer.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'serological_pipette_with_cells' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		gameState.wellPlate.forEach(well => {
			well.hasCells = true;
		});
		gameState.cellsTransferred = true;
		showNotification('Cells transferred to all 24 wells.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	if (tool === 'multichannel_pipette' && itemId === 'drug_vials') {
		if (!gameState.cellsTransferred) {
			showNotification('Transfer cells to the plate first.', 'warning');
			gameState.selectedTool = null;
			renderHoodScene();
			return;
		}
		gameState.selectedTool = 'multichannel_pipette_with_drug';
		showNotification('Loaded drug dilutions. Click the 24-well plate to add drugs.');
		renderHoodScene();
		return;
	}

	if (tool === 'multichannel_pipette_with_drug' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		startDrugAddition();
		return;
	}

	const stepHint = getCurrentStep();
	let warningMsg = 'That combination does not work.';
	if (stepHint) {
		warningMsg += ' Current step: ' + stepHint.label;
	}
	registerWarning(warningMsg);
	gameState.selectedTool = null;
	renderHoodScene();
}

//============================================
// dispatchHoodInteraction - Per-protocol dispatch wiring for hood scene
// Routes adapter's SceneContext interaction through the item click handler
//============================================
function dispatchHoodInteraction(itemId: string, ctx: SceneContext): void {
	onItemClick(itemId);
}

function renderHood(ctx: SceneContext): void {
	renderHoodScene();
	setupHoodEventListeners(onItemClick);
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
