//============================================
// bench.ts - Bench scene adapter (driver mode)
// Thin glue between SceneContext and legacy bench game-state dispatch
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	gameState,
	getCurrentStep,
	renderGame,
	showNotification,
	switchScene,
	triggerStep,
} from "../../game_state";
import { getBenchItemLabel } from "../../bench_config";
import { renderBenchScene } from "../bench";

//============================================
// benchSceneAdapter - Per-protocol dispatch wiring for bench scene
//============================================

function dispatchBenchInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// Handle directTool completion path (single-click steps like centrifuge)
	if (activeStep.completionPath?.kind === 'directTool') {
		const completionPath = activeStep.completionPath;
		if (itemId === completionPath.tool) {
			// For centrifuge: zero the flask volume and mark as old (Bug A fix)
			if (itemId === 'centrifuge') {
				gameState.flaskMediaMl = 0;
				gameState.flaskMediaAge = 'old';
			}
			triggerStep(activeStep.id);
			showNotification('Step completed.', 'success');
			renderGame();
		} else {
			showNotification('Use the ' + completionPath.tool + '.', 'warning');
		}
		return;
	}

	// Handle modal completion path (opening click that switches to a modal scene)
	if (activeStep.completionPath?.kind === 'modal') {
		const completionPath = activeStep.completionPath;
		if (itemId === completionPath.openClick) {
			// Switch to the appropriate modal scene based on the item clicked
			// cell_counter -> microscope scene
			// microscope -> microscope scene (for manual hemocytometer, Patch 16)
			// plate_reader -> plate_reader scene
			// well_plate -> plate scene (but this would be from hood, not bench)
			if (itemId === 'cell_counter' || itemId === 'microscope') {
				switchScene('microscope');
				renderGame();
			} else if (itemId === 'plate_reader') {
				switchScene('plate_reader');
				renderGame();
			}
		}
		return;
	}
}

function renderBench(ctx: SceneContext): void {
	renderBenchScene();
}

const benchSceneAdapter = {
	sceneId: 'bench',
	dispatchInteraction: dispatchBenchInteraction,
	render: renderBench,
};

//============================================
// registerScene at module load
//============================================

registerScene(benchSceneAdapter);
