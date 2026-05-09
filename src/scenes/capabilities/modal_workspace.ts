//============================================
// modal_workspace.ts - Generic modal screen sequencing capability
// Reusable modal state machine for multi-step modal workflows.
// Does NOT own game-state effects; adapters wire those via callbacks.
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";

//============================================
// ModalWorkspaceConfig - Scene configuration for modal capability
//============================================

interface ModalWorkspaceConfig {
	readonly sceneId: string;
	readonly capabilities?: string[];
	[key: string]: unknown;
}

//============================================
// ModalWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface ModalWorkspaceState {
	config: ModalWorkspaceConfig;
	sceneId: string;
	// Track the currently active modal screen (if any)
	// For adapters to query: "which screen should I render?"
	currentScreenId: string | null;
	// For adapters to register callbacks: "when user clicks this button, run this handler"
	screenHandlers: Record<string, () => void>;
}

const STATE_BY_SCENE: Record<string, ModalWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config is well-formed.
 * Throws clearly if validation fails.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated ModalWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validateModalWorkspaceConfig(config: unknown): ModalWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// Minimal validation: sceneId must exist
	if (!cfg.sceneId || typeof cfg.sceneId !== 'string') {
		throw new Error(
			`modalWorkspace: config.sceneId must be a non-empty string; got ${typeof cfg.sceneId}`
		);
	}

	return cfg as ModalWorkspaceConfig;
}

//============================================
// modalWorkspaceCapability - The capability instance
//============================================

const modalWorkspaceCapability: SceneCapability = {
	id: 'modalWorkspace',

	/**
	 * mount - Initialize the capability with scene config and context.
	 *
	 * Validates the scene config shape, stores it in capability-local state.
	 * Initializes modal state (no active screen yet; adapters will set this
	 * in onStepChange or via mounted screen handlers).
	 *
	 * @param ctx - Scene context
	 * @param config - Scene config from registry (untyped)
	 */
	mount(ctx: SceneContext, config: unknown): void {
		const { sceneId } = ctx;

		// Validate the config shape
		const validatedConfig = validateModalWorkspaceConfig(config);

		// Store in capability-local state
		STATE_BY_SCENE[sceneId] = {
			config: validatedConfig,
			sceneId,
			currentScreenId: null,
			screenHandlers: {},
		};

		console.debug(
			`[modalWorkspace] mounted for scene "${sceneId}"`
		);
	},

	/**
	 * onStepChange - Respond to protocol step changes.
	 *
	 * Reset modal screen state when a new step begins.
	 * The adapter will call setActiveScreen() or register handlers as needed
	 * based on the step's modal configuration.
	 *
	 * @param ctx - Scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		const { sceneId } = ctx;
		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			state.currentScreenId = null;
			state.screenHandlers = {};
		}
		console.debug(
			`[modalWorkspace] onStepChange: step "${step.id}" (reset modal state)`
		);
	},

	/**
	 * onClick - Handle click events on modal elements.
	 *
	 * This capability does not consume clicks directly.
	 * The screen content and its buttons are rendered by the adapter;
	 * click handling is wired via registered screenHandlers.
	 *
	 * Returns false (not handled by this capability).
	 * Modal interaction is button-click based, not item-click based.
	 *
	 * @param ctx - Scene context
	 * @param target - The click target
	 * @returns false (always; modal handles clicks via button listeners, not via onClick)
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		// Modal capability does not handle clicks via the capability interface.
		// Adapters handle modal button clicks via direct DOM listeners.
		return false;
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
			console.debug(`[modalWorkspace] unmounted for scene "${sceneId}"`);
		}
	},
};

//============================================
// Public API helpers for adapters
//
// Adapters call these to manage modal screen state and button handlers.
// These are NOT part of the SceneCapability interface; they're helpers
// for scene adapters to call to coordinate modal workflows.
//============================================

/**
 * setActiveModalScreen - Set the currently active modal screen id.
 *
 * Called by adapters to declare which modal screen is active.
 * Adapters use this to decide what HTML to render.
 *
 * @param sceneId - The scene id
 * @param screenId - The screen id (e.g., "plate_intro", "plate_add_carb_row_b")
 * @throws Error - If scene not mounted
 */
export function setActiveModalScreen(sceneId: string, screenId: string | null): void {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`modalWorkspace: setActiveModalScreen called for unmounted scene "${sceneId}"`
		);
	}
	state.currentScreenId = screenId;
	console.debug(
		`[modalWorkspace] setActiveModalScreen("${sceneId}", "${screenId}")`
	);
}

/**
 * getActiveModalScreen - Get the currently active modal screen id.
 *
 * @param sceneId - The scene id
 * @returns The active screen id, or null if none
 * @throws Error - If scene not mounted
 */
export function getActiveModalScreen(sceneId: string): string | null {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`modalWorkspace: getActiveModalScreen called for unmounted scene "${sceneId}"`
		);
	}
	return state.currentScreenId;
}

/**
 * registerModalScreenHandler - Register a button-click handler for a modal screen element.
 *
 * Called by adapters to wire up button click handling for a specific button id.
 * Handlers are invoked when the button with that id is clicked in the rendered modal.
 *
 * @param sceneId - The scene id
 * @param buttonId - The HTML element id (e.g., "confirm-plate-intro")
 * @param handler - Callback function to invoke on click
 * @throws Error - If scene not mounted
 */
export function registerModalScreenHandler(
	sceneId: string,
	buttonId: string,
	handler: () => void
): void {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`modalWorkspace: registerModalScreenHandler called for unmounted scene "${sceneId}"`
		);
	}
	state.screenHandlers[buttonId] = handler;
	console.debug(
		`[modalWorkspace] registered handler for button "${buttonId}" in scene "${sceneId}"`
	);
}

/**
 * closeModalScreen - Clear the active modal screen and return to the previous scene.
 *
 * Called by adapters when the user closes the modal (e.g., clicks the close button).
 * Adapters are responsible for switching scenes (e.g., switchScene('hood')).
 *
 * @param sceneId - The scene id
 * @throws Error - If scene not mounted
 */
export function closeModalScreen(sceneId: string): void {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`modalWorkspace: closeModalScreen called for unmounted scene "${sceneId}"`
		);
	}
	state.currentScreenId = null;
	state.screenHandlers = {};
	console.debug(
		`[modalWorkspace] closed modal for scene "${sceneId}"`
	);
}

//============================================
// Module initialization: register the capability at load time
//============================================

registerCapability(modalWorkspaceCapability);
