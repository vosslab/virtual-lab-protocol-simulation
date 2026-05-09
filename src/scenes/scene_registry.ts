// ============================================
// scene_registry.ts - Scene capability registry and routing
// ============================================

import type { SceneCapability, SceneContext } from "./scene_driver";

// ============================================
// Capability registry - populated by capability modules at load time
// ============================================

/**
 * CAPABILITY_REGISTRY - Global registry of scene capabilities.
 *
 * Capability modules populate this by calling registerCapability() at module load.
 * Will be populated as capabilities are implemented in Patches 5, 8, 10, 12, 15.
 * Currently empty during MS-FOUNDATION.
 */
export const CAPABILITY_REGISTRY: Record<string, SceneCapability> = {};

// ============================================
// Scene adapter registry - populated by scene adapters at load time
// ============================================

/**
 * SCENE_REGISTRY - Global registry of scene adapters.
 *
 * Scene adapters register themselves via registerScene() at module load.
 * An adapter provides scene-specific dispatch logic (game-state updates, etc.)
 * that the driver calls through SceneContext.dispatchInteraction.
 */
interface SceneAdapter {
	readonly sceneId: string;
	dispatchInteraction(itemId: string, ctx: SceneContext): void;
	// render is required for every scene adapter. A1-A6b completed migration of all scenes.
	render(ctx: SceneContext): void;
}

const SCENE_REGISTRY: Record<string, SceneAdapter> = {};

// ============================================
// registerCapability - Register a capability module
// ============================================

/**
 * registerCapability - Register a scene capability in the global registry.
 *
 * Called by capability modules at module load to make themselves available
 * to the driver. Throws if a capability with the same id is already registered
 * (loud failure on duplicate).
 *
 * @param capability - The capability to register
 * @throws Error - If a capability with this id is already registered
 */
export function registerCapability(capability: SceneCapability): void {
	const { id } = capability;
	if (id in CAPABILITY_REGISTRY) {
		throw new Error(`Duplicate capability registration: id '${id}' already registered`);
	}
	CAPABILITY_REGISTRY[id] = capability;
}

// ============================================
// registerScene - Register a scene adapter
// ============================================

/**
 * registerScene - Register a scene adapter in the global registry.
 *
 * Called by scene adapter modules at module load to make themselves available
 * to the driver. Throws if a scene with the same id is already registered
 * (loud failure on duplicate).
 *
 * @param adapter - The scene adapter to register
 * @throws Error - If a scene with this id is already registered
 */
export function registerScene(adapter: SceneAdapter): void {
	const { sceneId } = adapter;
	if (sceneId in SCENE_REGISTRY) {
		throw new Error(`Duplicate scene registration: sceneId '${sceneId}' already registered`);
	}
	SCENE_REGISTRY[sceneId] = adapter;
	console.debug(`[scene_registry] registered scene adapter for "${sceneId}"`);
}

// ============================================
// getRegisteredScene - Look up a registered scene adapter
// ============================================

/**
 * getRegisteredScene - Retrieve a registered scene adapter by id.
 *
 * Returns undefined if the scene is not registered (no error; the check happens in runScene).
 *
 * @param sceneId - The scene id to look up
 * @returns The adapter, or undefined if not found
 */
export function getRegisteredScene(sceneId: string): SceneAdapter | undefined {
	return SCENE_REGISTRY[sceneId];
}

// ============================================
// listRegisteredScenes - Enumerate registered scene ids (for diagnostics)
// ============================================

export function listRegisteredScenes(): string[] {
	return Object.keys(SCENE_REGISTRY);
}

