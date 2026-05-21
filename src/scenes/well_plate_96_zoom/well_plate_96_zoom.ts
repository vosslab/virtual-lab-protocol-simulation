// NEW1 spike: dev_smoke-only TS adapter for well_plate_96_zoom.
// Reuses spike CSS-native layout adapter via adapter.ts gate.
// Remove together with content/base_scenes/well_plate_96_zoom.yaml.
//============================================
// well_plate_96_zoom.ts - Well plate 96 zoom scene adapter (spike fixture)
// Minimal render-only adapter for spike scene loading and registration.
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import { registeredEmitters } from "../../game_state";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
registeredEmitters.add('zoom_complete');

//============================================
// dispatch_well_plate_96_zoom_interaction - No-op dispatch
//
// Spike scene has no item-driven interactions. All rendering is handled by
// the css_native_adapter gate in the layout engine (src/scene_runtime/layout/adapter.ts).
//============================================
function dispatch_well_plate_96_zoom_interaction(_itemId: string, _ctx: SceneContext): void {
	// Well plate 96 zoom is a spike render-only scene with no item-zone interactions.
	// Rendering is delegated to css_native_adapter via layout engine gate.
	// This method is a no-op.
}

//============================================
// render_well_plate_96_zoom - No-op render (delegated to layout engine)
//
// Rendering is handled by the layout engine's css_native_adapter path
// via adapter.ts line 48 gate. This function is a pass-through.
//============================================
function render_well_plate_96_zoom(_ctx: SceneContext): void {
	// Rendering is delegated to layout engine css_native_adapter.
	// No additional scene-specific render needed for spike.
}

// Property names sceneId, dispatchInteraction, and render are required by the
// SceneAdapter interface in scene_registry.ts and cannot be renamed here.
const well_plate_96_zoom_adapter = {
	sceneId: 'well_plate_96_zoom_check_scene',
	dispatchInteraction: dispatch_well_plate_96_zoom_interaction,
	render: render_well_plate_96_zoom,
};

//============================================
// registerScene at module load
//============================================

registerScene(well_plate_96_zoom_adapter);
