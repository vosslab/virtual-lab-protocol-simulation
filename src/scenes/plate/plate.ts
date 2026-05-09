//============================================
// plate.ts - Plate scene adapter (driver mode)
// Thin glue between SceneContext and legacy plate game-state dispatch
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	gameState,
	renderGame,
	triggerStep,
} from "../../game_state";
import { renderPlateScene } from "../plate";

//============================================
// dispatchPlateInteraction - Per-protocol dispatch wiring for plate scene
// Routes plate interactions (modal completion paths) through game-state dispatch
//============================================

function dispatchPlateInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// Plate steps use modal completion paths
	if (activeStep.completionPath?.kind === 'modal') {
		const completionPath = activeStep.completionPath;

		// The openClick triggers the modal display (already handled by modal UI)
		// The advanceClick triggers the step completion
		if (itemId === completionPath.advanceClick) {
			triggerStep(activeStep.id);
			renderGame();
		}
	}
}

function renderPlate(ctx: SceneContext): void {
	renderPlateScene();
}

const plateSceneAdapter = {
	sceneId: 'plate',
	dispatchInteraction: dispatchPlateInteraction,
	render: renderPlate,
};

//============================================
// registerScene at module load
//============================================

registerScene(plateSceneAdapter);
