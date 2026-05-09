//============================================
// incubator_workspace.ts - Incubator overlay state and trypsin-incubation lifecycle
// Owns: incubation overlay state, progress tracking, helper methods for adapters
// Does NOT own: game-state effects (applyIncubation, trypsinIncubated flag), scene routing
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";

//============================================
// IncubatorWorkspaceConfig - Scene configuration for incubator capability
//============================================

interface IncubatorWorkspaceConfig {
	readonly sceneId: string;
	readonly capabilities?: string[];
	[key: string]: unknown;
}

//============================================
// IncubatorWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface IncubatorWorkspaceState {
	config: IncubatorWorkspaceConfig;
	sceneId: string;
	// Track if an incubation overlay is currently active
	incubationActive: boolean;
	// Track the target step id that triggered the incubation (for onComplete dispatch)
	targetStepId: string | null;
	// Track the incubation type: 'trypsin' for hood, 'incubate' for incubator scene
	incubationType: 'trypsin' | 'incubate' | null;
	// Track the simulation duration in minutes (e.g., 5 for trypsin, 1440 for 24h)
	simulatedMinutes: number;
	// Interval ID for progress animation (for cleanup on unmount)
	animationIntervalId: number | null;
}

const STATE_BY_SCENE: Record<string, IncubatorWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config is well-formed.
 * Throws clearly if validation fails.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated IncubatorWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validateIncubatorWorkspaceConfig(config: unknown): IncubatorWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// Minimal validation: sceneId must exist
	if (!cfg.sceneId || typeof cfg.sceneId !== 'string') {
		throw new Error(
			`incubatorWorkspace: config.sceneId must be a non-empty string; got ${typeof cfg.sceneId}`
		);
	}

	return cfg as IncubatorWorkspaceConfig;
}

/**
 * Get capability-local state for a sceneId.
 * Throws if state does not exist (loud failure).
 *
 * @param sceneId - The scene id
 * @returns The state object
 * @throws Error - If state not found
 */
function getState(sceneId: string): IncubatorWorkspaceState {
	const state = STATE_BY_SCENE[sceneId];
	if (!state) {
		throw new Error(
			`incubatorWorkspace: no state for sceneId "${sceneId}". ` +
			`Capability may not be mounted yet.`
		);
	}
	return state;
}

//============================================
// Public helpers - called by adapters to manage incubation state
//============================================

/**
 * setIncubationActive - Mark an incubation as active or inactive.
 *
 * Called by adapters when starting or ending an incubation animation.
 *
 * @param sceneId - The scene id
 * @param active - true if incubation started, false if completed
 */
export function setIncubationActive(sceneId: string, active: boolean): void {
	const state = getState(sceneId);
	state.incubationActive = active;
	console.debug(
		`[incubatorWorkspace] setIncubationActive("${sceneId}", ${active})`
	);
}

/**
 * getIncubationActive - Check if an incubation is currently active.
 *
 * @param sceneId - The scene id
 * @returns true if incubation is in progress
 */
export function getIncubationActive(sceneId: string): boolean {
	const state = getState(sceneId);
	return state.incubationActive;
}

/**
 * setIncubationTarget - Store the target step id for onComplete dispatch.
 *
 * Called by adapters to record which step triggered the incubation,
 * so onComplete handlers know which step to fire when the overlay finishes.
 *
 * @param sceneId - The scene id
 * @param stepId - The step id that triggered incubation
 * @param type - The incubation type: 'trypsin' or 'incubate'
 * @param minutes - The simulated duration in minutes
 */
export function setIncubationTarget(
	sceneId: string,
	stepId: string | null,
	type: 'trypsin' | 'incubate' | null,
	minutes: number = 5,
): void {
	const state = getState(sceneId);
	state.targetStepId = stepId;
	state.incubationType = type;
	state.simulatedMinutes = minutes;
	console.debug(
		`[incubatorWorkspace] setIncubationTarget("${sceneId}", stepId="${stepId}", type="${type}", minutes=${minutes})`
	);
}

/**
 * getIncubationTarget - Retrieve the target step id for incubation.
 *
 * @param sceneId - The scene id
 * @returns The step id and type, or null if not set
 */
export function getIncubationTarget(sceneId: string): {
	stepId: string | null;
	type: 'trypsin' | 'incubate' | null;
	minutes: number;
} {
	const state = getState(sceneId);
	return {
		stepId: state.targetStepId,
		type: state.incubationType,
		minutes: state.simulatedMinutes,
	};
}

/**
 * clearIncubationTarget - Reset incubation state after completion.
 *
 * @param sceneId - The scene id
 */
export function clearIncubationTarget(sceneId: string): void {
	const state = getState(sceneId);
	state.targetStepId = null;
	state.incubationType = null;
	state.simulatedMinutes = 5;
	console.debug(`[incubatorWorkspace] clearIncubationTarget("${sceneId}")`);
}

//============================================
// incubatorWorkspaceCapability - The capability instance
//============================================

const incubatorWorkspaceCapability: SceneCapability = {
	id: 'incubatorWorkspace',

	/**
	 * mount - Initialize the capability with scene config and context.
	 *
	 * Validates the scene config shape, stores it in capability-local state.
	 * Initializes incubation state (no active incubation yet; adapters will set this
	 * when incubation starts).
	 *
	 * @param ctx - Scene context
	 * @param config - Scene config from registry (untyped)
	 */
	mount(ctx: SceneContext, config: unknown): void {
		const { sceneId } = ctx;

		// Validate the config shape
		const validatedConfig = validateIncubatorWorkspaceConfig(config);

		// Store in capability-local state
		STATE_BY_SCENE[sceneId] = {
			config: validatedConfig,
			sceneId,
			incubationActive: false,
			targetStepId: null,
			incubationType: null,
			simulatedMinutes: 5,
			animationIntervalId: null,
		};

		console.debug(
			`[incubatorWorkspace] mounted for scene "${sceneId}"`
		);
	},

	/**
	 * onStepChange - Respond to protocol step changes.
	 *
	 * Patch 13: Adapters will check if the new step is an incubation step
	 * and trigger the overlay via setIncubationTarget + setIncubationActive.
	 * This capability does not decide autonomously; the adapter controls the decision.
	 *
	 * @param ctx - Scene context
	 * @param step - The new active protocol step
	 */
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		const { sceneId } = ctx;
		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			// Reset to inactive state on each step change
			// Adapters will call setIncubationActive if this step needs incubation
			state.incubationActive = false;
			state.targetStepId = null;
		}
		console.debug(
			`[incubatorWorkspace] onStepChange: step "${step.id}" (reset incubation state)`
		);
	},

	/**
	 * onClick - Handle click events on scene items.
	 *
	 * Incubator is not click-driven; this is a no-op.
	 * Incubation overlays are triggered by adapters via setIncubationActive.
	 *
	 * @param ctx - Scene context
	 * @param target - The click target (item id + optional extra fields)
	 * @returns false (incubator does not handle clicks)
	 */
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		// Incubator overlays are not click-driven; return false to let other
		// capabilities handle the click.
		return false;
	},

	/**
	 * unmount - Clean up capability-local state.
	 *
	 * Called when the scene transitions away. Clears state for this sceneId
	 * and cancels any running animation interval.
	 *
	 * @param ctx - Scene context
	 */
	unmount(ctx: SceneContext): void {
		const { sceneId } = ctx;

		const state = STATE_BY_SCENE[sceneId];
		if (state) {
			// Clean up animation interval if still running
			if (state.animationIntervalId !== null) {
				clearInterval(state.animationIntervalId);
				state.animationIntervalId = null;
			}
			delete STATE_BY_SCENE[sceneId];
			console.debug(`[incubatorWorkspace] unmounted for scene "${sceneId}"`);
		}
	},
};

//============================================
// Module initialization: register the capability at load time
//============================================

registerCapability(incubatorWorkspaceCapability);
