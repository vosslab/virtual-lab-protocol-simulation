//============================================
// bench.ts - Bench scene adapter (thin wrapper)
// Responsibility seams split in Patch C2:
// - render.ts: renderBenchScene, layout, SVG
// - dispatch.ts: onBenchItemClick, interaction routing
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import { registeredEmitters } from "../../game_state";
import { renderBenchScene } from "./render";
import { onBenchItemClick } from "./dispatch";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
registeredEmitters.add('centrifuge');
registeredEmitters.add('prewarm_media');

//============================================
// benchSceneAdapter - Per-protocol dispatch wiring for bench scene
//============================================

function dispatchBenchInteraction(itemId: string, ctx: SceneContext): void {
	onBenchItemClick(itemId);
}

function renderBench(ctx: SceneContext): void {
	renderBenchScene(onBenchItemClick);
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
