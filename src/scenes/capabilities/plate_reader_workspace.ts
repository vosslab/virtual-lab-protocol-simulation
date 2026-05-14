// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// plate_reader_workspace.ts - Plate reader specific UI flows
// Handles plate reader chassis interactions: insert plate, start read, display results.
// Coordinates with modalWorkspace for screen sequencing.
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";

//============================================
// PlateReaderWorkspaceConfig - Scene configuration for plate reader capability
//============================================

interface PlateReaderWorkspaceConfig {
	readonly sceneId: string;
	readonly capabilities?: string[];
	[key: string]: unknown;
}

//============================================
// PlateReaderWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface PlateReaderWorkspaceState {
	config: PlateReaderWorkspaceConfig;
	sceneId: string;
	// Track plate reader state: is a plate inserted?
	plateInserted: boolean;
	// Track if a read is in progress
	readInProgress: boolean;
}

const STATE_BY_SCENE: Record<string, PlateReaderWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config is well-formed.
 * Throws clearly if validation fails.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated PlateReaderWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validatePlateReaderWorkspaceConfig(config: unknown): PlateReaderWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// Minimal validation: sceneId must exist
	if (!cfg.sceneId || typeof cfg.sceneId !== 'string') {
		throw new Error(
			`plateReaderWorkspace: config.sceneId must be a non-empty string; got ${typeof cfg.sceneId}`
		);
	}

	return cfg as PlateReaderWorkspaceConfig;
}

//============================================
// plateReaderWorkspaceCapability - The capability instance
//============================================

const plateReaderWorkspaceCapability: SceneCapability = {
	id: 'plateReaderWorkspace',

	/**
	 * mount - Initialize the capability with scene config and context.
	 *
	 * Validates the scene config shape, stores it in capability-local state.
	 * Initializes plate reader state (no plate inserted, no read in progress).
	 *
	 * @param ctx - Scene context
	 * @param config - Scene config from registry (untyped)
	 */
	mount(ctx: SceneContext, config: unknown): void {
		const { sceneId } = ctx;

		// Validate the config shape
		const validatedConfig = validatePlateReaderWorkspaceConfig(config);

		// Store in capability-local state
		STATE_BY_SCENE[sceneId] = {
			config: validatedConfig,
			sceneId,
			plateInserted: false,
			readInProgress: false,
		};

		console.debug(
			`[plateReaderWorkspace] mounted for scene "${sceneId}"`
		);
	},

	/**
	 * onStepChange - Respond to protocol step changes.
	 *
	 * Reset plate reader state when a new step begins.
	 * The adapter will manage plate reader interactions based on the step's
	 * modal configuration.
	 *
	 * @param ctx - Scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		const { sceneId } = ctx;
		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			state.plateInserted = false;
			state.readInProgress = false;
		}
		console.debug(
			`[plateReaderWorkspace] onStepChange: step "${step.id}" (reset plate reader state)`
		);
	},

	/**
	 * onClick - Handle click events on scene elements.
	 *
	 * This capability does not consume clicks directly.
	 * Plate reader interactions (insert plate, start read, display results)
	 * are modal-screen-based and button-driven, not item-click based.
	 *
	 * Returns false (not handled by this capability).
	 *
	 * @param ctx - Scene context
	 * @param target - The click target
	 * @returns false (always; plate reader handles clicks via modal buttons)
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		// Plate reader capability does not handle item clicks.
		// All interactions are modal button clicks, wired by the adapter.
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
			console.debug(`[plateReaderWorkspace] unmounted for scene "${sceneId}"`);
		}
	},
};

//============================================
// Public API helpers for adapters
//
// Adapters call these to manage plate reader state.
// These are NOT part of the SceneCapability interface; they're helpers
// for plate adapters to query and update plate reader state.
//============================================

/**
 * isPlateInserted - Query whether a plate is currently inserted in the reader.
 *
 * @param sceneId - The scene id
 * @returns true if a plate is inserted, false otherwise
 * @throws Error - If scene not mounted
 */
export function isPlateInserted(sceneId: string): boolean {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`plateReaderWorkspace: isPlateInserted called for unmounted scene "${sceneId}"`
		);
	}
	return state.plateInserted;
}

/**
 * setPlateInserted - Update the plate-inserted state.
 *
 * Called by adapters when the user inserts or removes a plate.
 *
 * @param sceneId - The scene id
 * @param inserted - true if plate was inserted, false if removed
 * @throws Error - If scene not mounted
 */
export function setPlateInserted(sceneId: string, inserted: boolean): void {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`plateReaderWorkspace: setPlateInserted called for unmounted scene "${sceneId}"`
		);
	}
	state.plateInserted = inserted;
	console.debug(
		`[plateReaderWorkspace] setPlateInserted("${sceneId}", ${inserted})`
	);
}

/**
 * isReadInProgress - Query whether a plate read is currently in progress.
 *
 * @param sceneId - The scene id
 * @returns true if a read is in progress, false otherwise
 * @throws Error - If scene not mounted
 */
export function isReadInProgress(sceneId: string): boolean {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`plateReaderWorkspace: isReadInProgress called for unmounted scene "${sceneId}"`
		);
	}
	return state.readInProgress;
}

/**
 * setReadInProgress - Update the read-in-progress state.
 *
 * Called by adapters when starting or completing a plate read operation.
 *
 * @param sceneId - The scene id
 * @param inProgress - true if a read is in progress, false if completed
 * @throws Error - If scene not mounted
 */
export function setReadInProgress(sceneId: string, inProgress: boolean): void {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`plateReaderWorkspace: setReadInProgress called for unmounted scene "${sceneId}"`
		);
	}
	state.readInProgress = inProgress;
	console.debug(
		`[plateReaderWorkspace] setReadInProgress("${sceneId}", ${inProgress})`
	);
}

//============================================
// Module initialization: register the capability at load time
//============================================

registerCapability(plateReaderWorkspaceCapability);
