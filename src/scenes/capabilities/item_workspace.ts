//============================================
// item_workspace.ts - ItemWorkspace scene capability
// First concrete capability: handles item-in-zone interactions.
// Consumes shared modules: wrong_order_feedback, scene_layout, liquid_transfer.
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";
import { showWrongOrderToast } from "../shared/wrong_order_feedback";

//============================================
// ItemWorkspaceConfig - Validated scene configuration shape
// Capability-local view of what the mount config must contain.
//============================================

interface ItemWorkspaceConfig {
	readonly items: Array<{
		readonly id: string;
		readonly label?: string;
		readonly zone: string;
		[key: string]: unknown;
	}>;
	readonly zones: Array<{
		readonly id: string;
		[key: string]: unknown;
	}>;
	[key: string]: unknown;
}

//============================================
// ItemWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface ItemWorkspaceState {
	config: ItemWorkspaceConfig;
	sceneId: string;
	// Patch 7: For interactionSequence completion paths, track which interaction
	// step the user has completed. Defaults to 0. Advanced by onClick when
	// the clicked item matches the next expected interaction in the sequence.
	currentInteractionIndex: number;
}

const STATE_BY_SCENE: Record<string, ItemWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config has the shape we expect.
 * Throws clearly if required keys are missing or malformed.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated ItemWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validateItemWorkspaceConfig(config: unknown): ItemWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// Check that items array exists and is an array
	if (!Array.isArray(cfg.items)) {
		throw new Error(
			`itemWorkspace: config.items must be an array; got ${typeof cfg.items}`
		);
	}

	// Check that zones array exists and is an array
	if (!Array.isArray(cfg.zones)) {
		throw new Error(
			`itemWorkspace: config.zones must be an array; got ${typeof cfg.zones}`
		);
	}

	// Validate items structure
	for (let i = 0; i < cfg.items.length; i++) {
		const item = cfg.items[i];
		if (!item || typeof item !== 'object') {
			throw new Error(
				`itemWorkspace: items[${i}] must be an object; got ${typeof item}`
			);
		}
		const itemObj = item as Record<string, unknown>;
		if (!itemObj.id || typeof itemObj.id !== 'string') {
			throw new Error(
				`itemWorkspace: items[${i}].id must be a non-empty string`
			);
		}
		if (!itemObj.zone || typeof itemObj.zone !== 'string') {
			throw new Error(
				`itemWorkspace: items[${i}] (id="${itemObj.id}") must have zone string`
			);
		}
	}

	// Validate zones structure
	for (let i = 0; i < cfg.zones.length; i++) {
		const zone = cfg.zones[i];
		if (!zone || typeof zone !== 'object') {
			throw new Error(
				`itemWorkspace: zones[${i}] must be an object; got ${typeof zone}`
			);
		}
		const zoneObj = zone as Record<string, unknown>;
		if (!zoneObj.id || typeof zoneObj.id !== 'string') {
			throw new Error(
				`itemWorkspace: zones[${i}].id must be a non-empty string`
			);
		}
	}

	// Build zone id set for item zone reference validation
	const zoneIds = new Set(cfg.zones.map((z: unknown) => {
		const zObj = z as Record<string, unknown>;
		return zObj.id;
	}));

	// Validate item zone references
	for (const item of cfg.items) {
		const itemObj = item as Record<string, unknown>;
		if (!zoneIds.has(itemObj.zone as string)) {
			throw new Error(
				`itemWorkspace: item "${itemObj.id}" references unknown zone "${itemObj.zone}"`
			);
		}
	}

	return cfg as ItemWorkspaceConfig;
}

/**
 * Find an item in the loaded config by id.
 * Uses loud access (throws on missing item) per "fix the design, not the symptom".
 *
 * @param state - The scene state
 * @param itemId - The item id to look up
 * @returns The item config object
 * @throws Error - If the item id is not found
 */
function findItem(state: ItemWorkspaceState, itemId: string): ItemWorkspaceConfig['items'][0] {
	const item = state.config.items.find((i) => i.id === itemId);
	if (!item) {
		throw new Error(
			`itemWorkspace: unknown item id "${itemId}" in scene "${state.sceneId}"`
		);
	}
	return item;
}

//============================================
// itemWorkspaceCapability - The capability instance
//============================================

const itemWorkspaceCapability: SceneCapability = {
	id: 'itemWorkspace',

	/**
	 * mount - Initialize the capability with scene config and context.
	 *
	 * Validates the scene config shape, stores it in capability-local state.
	 * Throws clearly if validation fails.
	 *
	 * @param ctx - Scene context
	 * @param config - Scene config from registry (untyped)
	 */
	mount(ctx: SceneContext, config: unknown): void {
		const { sceneId } = ctx;

		// Validate the config shape and structure
		const validatedConfig = validateItemWorkspaceConfig(config);

		// Store in capability-local state
		STATE_BY_SCENE[sceneId] = {
			config: validatedConfig,
			sceneId,
			currentInteractionIndex: 0,
		};

		console.debug(
			`[itemWorkspace] mounted for scene "${sceneId}" ` +
			`with ${validatedConfig.items.length} items and ${validatedConfig.zones.length} zones`
		);
	},

	/**
	 * onStepChange - Respond to protocol step changes.
	 *
	 * Patch 7: Reset currentInteractionIndex when a new step begins (interactionSequence).
	 * This ensures each new interactionSequence step starts at index 0, allowing
	 * the onClick handler to validate clicks from the beginning of the sequence.
	 *
	 * @param ctx - Scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		const { sceneId } = ctx;
		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			state.currentInteractionIndex = 0;
		}
		console.debug(
			`[itemWorkspace] onStepChange: step "${step.id}" (reset interactionIndex to 0)`
		);
	},

	/**
	 * onClick - Handle click events on scene items.
	 *
	 * Returns true if the click was handled by this capability.
	 * Returns false if the item is not recognized by this capability.
	 *
	 * Dispatches ALL recognized items to the scene adapter, which is responsible
	 * for validating the click against the step's completion path and handling
	 * wrong-order cases. This ensures wrong-order detection works correctly even
	 * for items not in the current step's interaction sequence.
	 *
	 * @param ctx - Scene context
	 * @param target - The click target (item id + optional extra fields)
	 * @returns true if handled, false if unknown item
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		const { sceneId } = ctx;
		const { itemId } = target;

		// Look up the state for this scene
		const state = STATE_BY_SCENE[sceneId];
		if (!state) {
			console.warn(
				`[itemWorkspace] onClick: scene "${sceneId}" not mounted; returning false`
			);
			return false;
		}

		// Try to find the item; if it doesn't exist, return false
		// (this capability doesn't handle it; another capability might)
		const item = state.config.items.find((i) => i.id === itemId);
		if (!item) {
			return false;
		}

		// Item is known to this capability. Dispatch to the scene adapter.
		// The adapter is responsible for validating the click against the current
		// step's completion path and handling both correct and wrong-order cases.
		ctx.dispatchInteraction(itemId);
		return true;
	},

	/**
	 * unmount - Clean up capability-local state.
	 *
	 * Called when the scene transitions away. Clears state for this sceneId.
	 *
	 * @param ctx - Scene context
	 */
	unmount(ctx: SceneContext): void {
		const { sceneId } = ctx;

		if (sceneId in STATE_BY_SCENE) {
			delete STATE_BY_SCENE[sceneId];
			console.debug(`[itemWorkspace] unmounted for scene "${sceneId}"`);
		}
	},
};

//============================================
// Module initialization: register the capability at load time
//============================================

registerCapability(itemWorkspaceCapability);
