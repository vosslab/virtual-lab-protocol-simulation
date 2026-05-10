// ============================================
// scene_driver.ts - Universal scene runtime skeleton
// ============================================

import type { ProtocolStep } from "../constants";
import { SCENE_CONFIGS, type SceneConfig } from "../scene_configs";

// ============================================
// ClickTarget - Minimal click event target specification
// ============================================

export interface ClickTarget {
	itemId: string;
	[key: string]: unknown;
}

// ============================================
// SceneContext - Runtime context for scene capabilities
// ============================================

export interface SceneContext {
	readonly sceneId: string;
	readonly dispatchInteraction: (itemId: string) => void;
	// Capabilities may attach scene-scoped state (DOM refs, event dispatchers,
	// item registries) under arbitrary keys; the index signature keeps that
	// open without requiring a registry of every shared field.
	[key: string]: unknown;
}

// ============================================
// SceneCapability - Universal interface for scene capabilities
// ============================================

export interface SceneCapability {
	readonly id: string;

	/**
	 * mount - Initialize the capability with scene config and context.
	 * Called once when the scene transitions to this capability.
	 *
	 * @param ctx - Runtime scene context
	 * @param config - Scene-specific config from YAML (opaque to the capability)
	 */
	mount(ctx: SceneContext, config: unknown): void;

	/**
	 * onStepChange - Respond to a protocol step change.
	 * Called when the active protocol step changes.
	 *
	 * @param ctx - Runtime scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void;

	/**
	 * onClick - Handle a click on a scene element.
	 * Return true if the click was handled; false if it should be propagated.
	 *
	 * @param ctx - Runtime scene context
	 * @param target - The clicked target (item id + optional extra fields)
	 * @returns true if handled, false otherwise
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean;

	/**
	 * unmount - Clean up and remove the capability.
	 * Called when the scene transitions away from this capability.
	 *
	 * @param ctx - Runtime scene context
	 */
	unmount(ctx: SceneContext): void;
}

// ============================================
// runScene - Driver function (Patch 6 implementation)
// ============================================

import { CAPABILITY_REGISTRY, getRegisteredScene, listRegisteredScenes } from "./scene_registry";

/**
 * runSceneRender - Render a scene through its adapter.
 *
 * Looks up the registered adapter for the scene and calls its render() method
 * if defined. Throws a loud error if no adapter is registered (all 5 current
 * scenes have adapters; missing one is a bug, not a graceful fallback case).
 *
 * @param sceneId - The scene to render
 * @throws Error - If no adapter is registered for this sceneId
 */
export function runSceneRender(sceneId: string): void {
	const adapter = getRegisteredScene(sceneId);
	if (!adapter) {
		const known = listRegisteredScenes().join(', ') || '(none registered)';
		throw new Error(
			`runSceneRender: no adapter registered for scene "${sceneId}". ` +
			`Must call registerScene(adapter) before rendering the scene. ` +
			`Registered scenes: ${known}.`
		);
	}

	const ctx: SceneContext = {
		sceneId,
		dispatchInteraction: (itemId: string) => {
			adapter.dispatchInteraction(itemId, ctx);
		},
	};

	adapter.render(ctx);
}

/**
 * runScene - Route a scene through the driver architecture.
 *
 * Orchestrates the full lifecycle:
 * 1. Look up the scene config
 * 2. Look up the registered adapter for this scene
 * 3. Mount all declared capabilities
 * 4. Wire click event listeners to dispatch through capabilities
 * 5. Set up unmount cleanup
 *
 * @param sceneId - The scene to route through the driver
 * @throws Error - If scene config missing, adapter missing, or capability not found
 */
export function runScene(sceneId: string): void {
	// Look up scene config
	const sceneConfig = SCENE_CONFIGS[sceneId];
	if (!sceneConfig) {
		throw new Error(
			`runScene: scene config not found for sceneId "${sceneId}". ` +
			`Available scenes: ${Object.keys(SCENE_CONFIGS).join(', ')}`
		);
	}

	// Look up registered adapter
	const adapter = getRegisteredScene(sceneId);
	if (!adapter) {
		throw new Error(
			`runScene: no adapter registered for scene "${sceneId}". ` +
			`Must call registerScene(adapter) before running the scene.`
		);
	}

	// Create scene context with dispatch callback from adapter
	const ctx: SceneContext = {
		sceneId,
		dispatchInteraction: (itemId: string) => {
			adapter.dispatchInteraction(itemId, ctx);
		},
	};

	// Mount all declared capabilities
	const capabilityIds = sceneConfig.capabilities;
	if (!Array.isArray(capabilityIds)) {
		throw new Error(
			`runScene: scene "${sceneId}" config missing 'capabilities' array`
		);
	}

	for (let i = 0; i < capabilityIds.length; i++) {
		const capId = capabilityIds[i];
		const capability = CAPABILITY_REGISTRY[capId as string];
		if (!capability) {
			throw new Error(
				`runScene: scene "${sceneId}" declares unknown capability "${capId}". ` +
				`Available capabilities: ${Object.keys(CAPABILITY_REGISTRY).join(', ')}`
			);
		}
		capability.mount(ctx, sceneConfig);
	}

	// Wire click event listeners on individual items
	// The driver runs once and sets up event capture on the scene container.
	// When capabilities handle a click, mark the event so legacy code can skip it.
	// Use sceneConfig.elementId if present; otherwise fall back to `${sceneId}-scene`
	const elementId = sceneConfig.elementId ?? `${sceneId}-scene`;
	const sceneEl = document.getElementById(elementId);
	if (sceneEl) {
		const handler = (event: Event) => {
			const target = event.target as HTMLElement;
			// Click target may be an inner SVG element; resolve to the nearest
			// ancestor carrying data-item-id so clicks on shapes inside an item
			// are still routed correctly. Without closest(), clicks on inner
			// SVG (rect/ellipse/path) reported itemId=null and the capability
			// dispatch silently dropped them, leaving the user unable to
			// interact after a renderHoodScene() that did not re-attach the
			// per-item bubble-phase listeners.
			const itemEl = target.closest && target.closest('[data-item-id]');
			const itemId = itemEl ? itemEl.getAttribute('data-item-id') : null;
			if (!itemId) {
				return;
			}

			// Check if legacy code already handled this (shouldn't happen, but safe guard)
			if ((event as any).__driverHandled) {
				return;
			}

			// Dispatch through capabilities until one handles it
			for (let i = 0; i < capabilityIds.length; i++) {
				const capId = capabilityIds[i];
				const capability = CAPABILITY_REGISTRY[capId as string];
				if (capability && capability.onClick(ctx, { itemId })) {
					// Capability handled the click; mark event to prevent legacy handlers
					(event as any).__driverHandled = true;
					event.stopPropagation();
					return;
				}
			}
		};

		// Attach listener in capture phase for early interception
		sceneEl.addEventListener('click', handler, true);
	}

	console.debug(
		`[scene_driver] runScene("${sceneId}"): mounted ${capabilityIds.length} capabilities, ` +
		`wired click dispatch to scene element`
	);
}
