// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// instrument_workspace.ts - Mounted instrument surface capability
// Generic lifecycle for instruments (microscope, plate reader chassis, etc.)
// Owns: insertion, focus/calibration, readout/results display, eject.
// Does NOT own: per-instrument visual styling (adapter), specific game-state effects (adapter),
// manual grid counting (Patch 15 gridCountingWorkspace).
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";

//============================================
// InstrumentWorkspaceConfig - Scene configuration for instrument capability
//============================================

interface InstrumentWorkspaceConfig {
	readonly sceneId: string;
	readonly capabilities?: string[];
	[key: string]: unknown;
}

//============================================
// InstrumentWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface InstrumentWorkspaceState {
	config: InstrumentWorkspaceConfig;
	sceneId: string;
	// Track if an item is mounted in the instrument
	instrumentMounted: boolean;
	// Track the readout result (opaque to the capability; adapters interpret it)
	readoutResult: unknown;
}

const STATE_BY_SCENE: Record<string, InstrumentWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config is well-formed.
 * Throws clearly if validation fails.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated InstrumentWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validateInstrumentWorkspaceConfig(config: unknown): InstrumentWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// Minimal validation: sceneId must exist
	if (!cfg.sceneId || typeof cfg.sceneId !== 'string') {
		throw new Error(
			`instrumentWorkspace: config.sceneId must be a non-empty string; got ${typeof cfg.sceneId}`
		);
	}

	return cfg as InstrumentWorkspaceConfig;
}

/**
 * Get capability-local state for a sceneId.
 * Throws if state does not exist (loud failure).
 *
 * @param sceneId - The scene id
 * @returns The state object
 * @throws Error - If state not found
 */
function getState(sceneId: string): InstrumentWorkspaceState {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`instrumentWorkspace: no state for sceneId "${sceneId}". ` +
			`Capability may not be mounted yet.`
		);
	}
	return state;
}

//============================================
// Public helpers - called by adapters to manage instrument state
//============================================

/**
 * setInstrumentMounted - Mark an instrument as mounted (item inserted).
 *
 * Called by adapters when a sample/plate is inserted into the instrument.
 *
 * @param sceneId - The scene id
 * @param mounted - true if mounted, false if ejected
 */
export function setInstrumentMounted(sceneId: string, mounted: boolean): void {
	const state = getState(sceneId);
	state.instrumentMounted = mounted;
	console.debug(
		`[instrumentWorkspace] setInstrumentMounted("${sceneId}", ${mounted})`
	);
}

/**
 * getInstrumentMounted - Query if an instrument currently has a sample mounted.
 *
 * Called by adapters to check the current mount state.
 *
 * @param sceneId - The scene id
 * @returns true if mounted, false otherwise
 */
export function getInstrumentMounted(sceneId: string): boolean {
	const state = getState(sceneId);
	return state.instrumentMounted;
}

/**
 * setReadoutResult - Store a readout result from the instrument.
 *
 * Called by adapters after the instrument completes a measurement.
 * The shape is opaque to the capability; adapters interpret it.
 * Examples: { viability: 0.85, cellCount: 1000000 } for a cell counter,
 * or { absorptionValues: [...] } for a plate reader.
 *
 * @param sceneId - The scene id
 * @param result - The readout result (opaque)
 */
export function setReadoutResult(sceneId: string, result: unknown): void {
	const state = getState(sceneId);
	state.readoutResult = result;
	console.debug(
		`[instrumentWorkspace] setReadoutResult("${sceneId}", ${JSON.stringify(result)})`
	);
}

/**
 * getReadoutResult - Retrieve the stored readout result.
 *
 * Called by adapters to access the last recorded measurement.
 *
 * @param sceneId - The scene id
 * @returns The stored readout result, or undefined if not set
 */
export function getReadoutResult(sceneId: string): unknown {
	const state = getState(sceneId);
	return state.readoutResult;
}

//============================================
// instrumentWorkspaceCapability - The capability instance
//============================================

const instrumentWorkspaceCapability: SceneCapability = {
	id: 'instrumentWorkspace',

	/**
	 * mount - Initialize the capability with scene config and context.
	 *
	 * Validates the scene config shape, stores it in capability-local state.
	 * Initializes instrument state (not mounted; no readout result).
	 *
	 * @param ctx - Scene context
	 * @param config - Scene config from registry (untyped)
	 */
	mount(ctx: SceneContext, config: unknown): void {
		const { sceneId } = ctx;

		// Validate the config shape
		const validatedConfig = validateInstrumentWorkspaceConfig(config);

		// Store in capability-local state
		STATE_BY_SCENE[sceneId] = {
			config: validatedConfig,
			sceneId,
			instrumentMounted: false,
			readoutResult: undefined,
		};

		console.debug(
			`[instrumentWorkspace] mounted for scene "${sceneId}"`
		);
	},

	/**
	 * onStepChange - Respond to protocol step changes.
	 *
	 * Reset instrument state when a new step begins.
	 * The adapter will manage instrument interactions (insertion, readout, eject)
	 * based on the step's configuration.
	 *
	 * @param ctx - Scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		const { sceneId } = ctx;
		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			state.instrumentMounted = false;
			state.readoutResult = undefined;
		}
		console.debug(
			`[instrumentWorkspace] onStepChange: step "${step.id}" (reset instrument state)`
		);
	},

	/**
	 * onClick - Handle click events on scene elements.
	 *
	 * This capability does not consume clicks directly.
	 * Instrument interactions (insertion, focus, readout, eject) are typically
	 * modal-screen-based or button-driven, not item-click based.
	 *
	 * Returns false (not handled by this capability).
	 *
	 * @param ctx - Scene context
	 * @param target - The click target
	 * @returns false (always; instrument handles clicks via modal buttons, not item clicks)
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		// Instrument capability does not handle item clicks directly.
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
			console.debug(`[instrumentWorkspace] unmounted for scene "${sceneId}"`);
		}
	},
};

//============================================
// Self-register at module load
//============================================

registerCapability(instrumentWorkspaceCapability);
