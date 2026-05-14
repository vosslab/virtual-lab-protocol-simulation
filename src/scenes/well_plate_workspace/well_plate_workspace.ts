// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// well_plate_workspace.ts - Well plate workspace adapter (thin wrapper)
// Responsibility seams split:
// - render.ts: renderWellPlateWorkspace, layout, SVG, highlighting
// - dispatch.ts: onWellPlateItemClick, interaction routing
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import { registeredEmitters } from "../../game_state";
import { renderPlateScene } from "./render";
import { onPlateItemClick } from "./dispatch";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// The YAML completionEvent strings are a separate namespace.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
// Completion events for all plate-resident steps
registeredEmitters.add('plate-workspace-opened');
registeredEmitters.add('plate-media-cols-1-6');
registeredEmitters.add('plate-media-cols-7-12');
registeredEmitters.add('carb-row-b');
registeredEmitters.add('carb-row-c');
registeredEmitters.add('carb-row-d');
registeredEmitters.add('carb-row-e');
registeredEmitters.add('carb-row-f');
registeredEmitters.add('carb-row-g');
registeredEmitters.add('carb-row-h');
registeredEmitters.add('metformin-add-confirm');
registeredEmitters.add('place_in_incubator');

//============================================
// wellPlateWorkspaceAdapter - Per-protocol dispatch wiring
//============================================

function dispatchWellPlateInteraction(itemId: string, ctx: SceneContext): void {
	onPlateItemClick(itemId);
}

function renderWellPlateWorkspace(ctx: SceneContext): void {
	renderPlateScene(ctx);
}

const wellPlateWorkspaceAdapter = {
	sceneId: 'well_plate_workspace',
	dispatchInteraction: dispatchWellPlateInteraction,
	render: renderWellPlateWorkspace,
};

//============================================
// registerScene at module load
//============================================

registerScene(wellPlateWorkspaceAdapter);
