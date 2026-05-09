// ============================================
// scene_registry.ts - Scene capability registry and routing
// ============================================

import type { SceneCapability, SceneContext } from "./scene_driver";
export { runSceneRender } from "./scene_driver";

// ============================================
// SceneRouterMode - Per-protocol routing decision
// ============================================

export type SceneRouterMode = 'legacy' | 'driver';

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
	// render? is a temporary bridge during A1-A6b only.
	// After A6b lands, the optional marker is removed and render(ctx) becomes required.
	render?(ctx: SceneContext): void;
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
// resolveSceneRouter - Resolve per-protocol routing decision
// ============================================

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
// resolveSceneRouter - Determine which router (legacy or driver) to use for a protocol.
// ============================================

/**
 * resolveSceneRouter - Determine which router (legacy or driver) to use for a protocol.
 *
 * Reads the optional 'sceneRouter' field from the protocol config.
 * Validates with exhaustive switch to ensure no invalid values slip through.
 * Defaults to 'legacy' when the field is absent or undefined.
 *
 * @param protocolConfig - Protocol configuration object (from protocol YAML)
 * @returns 'legacy' or 'driver'
 * @throws Error - If an invalid sceneRouter value is encountered
 */
export function resolveSceneRouter(protocolConfig: Record<string, unknown>): SceneRouterMode {
	const sceneRouter = protocolConfig.sceneRouter;

	// Default to legacy if field is absent or undefined
	if (sceneRouter === undefined || sceneRouter === null) {
		return 'legacy';
	}

	// Validate the value
	if (typeof sceneRouter !== 'string') {
		throw new Error(
			`Invalid sceneRouter value: expected string or undefined, got ${typeof sceneRouter}`
		);
	}

	const mode = sceneRouter as string;

	// Exhaustive switch with never-type safety
	switch (mode) {
		case 'legacy':
			return 'legacy';
		case 'driver':
			return 'driver';
		default: {
			const _exhaustive: never = mode as never;
			throw new Error(
				`Invalid sceneRouter value: '${mode}' not in ['legacy', 'driver']. ` +
				`Protocol id: ${protocolConfig.protocolId || 'unknown'}`
			);
		}
	}
}
