//============================================
// incubator.ts - Incubator scene adapter (driver mode)
// Thin glue between SceneContext and incubator game-state dispatch
// Handles 24h incubation overlay lifecycle (Patch 13).
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	renderGame,
	showNotification,
	switchScene,
	triggerStep,
} from "../../game_state";
import { isIncubationStep, getIncubationSteps } from "../../step_dispatch";
import { applyIncubation } from "../../cell_model";
import { setIncubationActive, setIncubationTarget } from "../capabilities/incubator_workspace";
import { renderIncubatorScene } from "../incubator";

//============================================
// dispatchIncubatorInteraction - Incubator scene dispatch
// Routes incubator interactions through game-state dispatch.
// Incubator is overlay-only; no clickable items trigger interactions.
//============================================

function dispatchIncubatorInteraction(itemId: string, ctx: SceneContext): void {
	// Incubator is a passive modal overlay; no click-driven interactions.
	// Incubation is triggered by the driver when a protocol step
	// has activeScene === 'incubator' (handled by rendering and overlay logic).
	// This adapter exists for completeness; actual incubation dispatch
	// happens in onStepChange-like logic (via renderIncubatorScene legacy call).
}

function renderIncubator(ctx: SceneContext): void {
	renderIncubatorScene();
}

const incubatorSceneAdapter = {
	sceneId: 'incubator',
	dispatchInteraction: dispatchIncubatorInteraction,
	render: renderIncubator,
};

//============================================
// registerScene at module load
//============================================

registerScene(incubatorSceneAdapter);
