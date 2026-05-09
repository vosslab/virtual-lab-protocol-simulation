//============================================
// grid_counting_workspace.ts - GridCountingWorkspace scene capability
// Manual hemocytometer grid counting: quadrant selection, per-quadrant counts, submission.
//============================================

import type { SceneCapability, SceneContext, ClickTarget } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { registerCapability } from "../scene_registry";

//============================================
// GridCountingWorkspaceConfig - Validated scene configuration shape
// Capability-local view of what the mount config must contain.
//============================================

interface GridCountingWorkspaceConfig {
	readonly quadrants?: Array<{
		readonly id: string;
		readonly label?: string;
		[key: string]: unknown;
	}>;
	[key: string]: unknown;
}

//============================================
// GridCountingWorkspaceState - Capability-local state, keyed by sceneId
//============================================

interface GridCountingWorkspaceState {
	config: GridCountingWorkspaceConfig;
	sceneId: string;
	// which quadrants the user has clicked (boolean array of length 4)
	selectedQuadrants: boolean[];
	// per-quadrant counts entered by the user (null means not yet counted)
	quadrantCounts: (number | null)[];
	// whether the count has been submitted
	countSubmitted: boolean;
}

const STATE_BY_SCENE: Record<string, GridCountingWorkspaceState> = {};

//============================================
// Helpers
//============================================

/**
 * Validate that the config has the shape we expect.
 * Throws clearly if required keys are missing or malformed.
 *
 * @param config - The untyped config from the scene registry
 * @returns Validated GridCountingWorkspaceConfig
 * @throws Error - If config is missing required fields
 */
function validateGridCountingWorkspaceConfig(config: unknown): GridCountingWorkspaceConfig {
	const cfg = config as Record<string, unknown>;

	// quadrants is optional; if present, it should be an array
	if (cfg.quadrants !== undefined) {
		if (!Array.isArray(cfg.quadrants)) {
			throw new Error(
				`gridCountingWorkspace: config.quadrants must be an array; got ${typeof cfg.quadrants}`
			);
		}
		// Validate quadrants structure
		for (let i = 0; i < cfg.quadrants.length; i++) {
			const quadrant = cfg.quadrants[i];
			if (!quadrant || typeof quadrant !== 'object') {
				throw new Error(
					`gridCountingWorkspace: quadrants[${i}] must be an object; got ${typeof quadrant}`
				);
			}
			const quadObj = quadrant as Record<string, unknown>;
			if (!quadObj.id || typeof quadObj.id !== 'string') {
				throw new Error(
					`gridCountingWorkspace: quadrants[${i}].id must be a non-empty string`
				);
			}
		}
	}

	return cfg as GridCountingWorkspaceConfig;
}

/**
 * Get or initialize state for a scene.
 * Throws if config validation fails.
 *
 * @param sceneId - The scene id
 * @param config - The untyped config from the scene registry
 * @returns GridCountingWorkspaceState for this scene
 * @throws Error - If config validation fails
 */
function getOrInitializeState(sceneId: string, config: unknown): GridCountingWorkspaceState {
	if (sceneId in STATE_BY_SCENE) {
		return STATE_BY_SCENE[sceneId]!;
	}

	const validatedConfig = validateGridCountingWorkspaceConfig(config);
	const state: GridCountingWorkspaceState = {
		config: validatedConfig,
		sceneId: sceneId,
		selectedQuadrants: [false, false, false, false],
		quadrantCounts: [null, null, null, null],
		countSubmitted: false,
	};
	STATE_BY_SCENE[sceneId] = state;
	return state;
}

//============================================
// Exported helpers for adapters to use
//============================================

/**
 * Set whether a quadrant has been clicked.
 *
 * @param sceneId - The scene id
 * @param quadrantIndex - The quadrant index (0-3)
 * @param clicked - Whether the quadrant is clicked
 */
export function setQuadrantClicked(sceneId: string, quadrantIndex: number, clicked: boolean): void {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		if (quadrantIndex >= 0 && quadrantIndex < state.selectedQuadrants.length) {
			state.selectedQuadrants[quadrantIndex] = clicked;
		}
	}
}

/**
 * Get whether a quadrant has been clicked.
 *
 * @param sceneId - The scene id
 * @param quadrantIndex - The quadrant index (0-3)
 * @returns true if the quadrant is clicked, false otherwise
 */
export function getQuadrantClicked(sceneId: string, quadrantIndex: number): boolean {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		if (quadrantIndex >= 0 && quadrantIndex < state.selectedQuadrants.length) {
			return state.selectedQuadrants[quadrantIndex]!;
		}
	}
	return false;
}

/**
 * Set the cell count for a quadrant.
 *
 * @param sceneId - The scene id
 * @param quadrantIndex - The quadrant index (0-3)
 * @param count - The count (null to clear)
 */
export function setQuadrantCount(sceneId: string, quadrantIndex: number, count: number | null): void {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		if (quadrantIndex >= 0 && quadrantIndex < state.quadrantCounts.length) {
			state.quadrantCounts[quadrantIndex] = count;
		}
	}
}

/**
 * Get the cell count for a quadrant.
 *
 * @param sceneId - The scene id
 * @param quadrantIndex - The quadrant index (0-3)
 * @returns The count (null if not yet counted)
 */
export function getQuadrantCount(sceneId: string, quadrantIndex: number): number | null {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		if (quadrantIndex >= 0 && quadrantIndex < state.quadrantCounts.length) {
			return state.quadrantCounts[quadrantIndex] ?? null;
		}
	}
	return null;
}

/**
 * Get the total count (sum of all quadrant counts).
 * Returns null if not all quadrants have counts.
 *
 * @param sceneId - The scene id
 * @returns The total count or null if incomplete
 */
export function getTotalCount(sceneId: string): number | null {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		let total = 0;
		for (let i = 0; i < state.quadrantCounts.length; i++) {
			const count = state.quadrantCounts[i];
			if (count === null || count === undefined) {
				return null;
			}
			total += count;
		}
		return total;
	}
	return null;
}

/**
 * Set whether the count has been submitted.
 *
 * @param sceneId - The scene id
 * @param submitted - Whether the count has been submitted
 */
export function setCountSubmitted(sceneId: string, submitted: boolean): void {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		state.countSubmitted = submitted;
	}
}

/**
 * Get whether the count has been submitted.
 *
 * @param sceneId - The scene id
 * @returns true if the count has been submitted
 */
export function getCountSubmitted(sceneId: string): boolean {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		return state.countSubmitted;
	}
	return false;
}

/**
 * Reset the count state (called on unmount or step change).
 *
 * @param sceneId - The scene id
 */
export function resetCount(sceneId: string): void {
	if (sceneId in STATE_BY_SCENE) {
		const state = STATE_BY_SCENE[sceneId]!;
		state.selectedQuadrants = [false, false, false, false];
		state.quadrantCounts = [null, null, null, null];
		state.countSubmitted = false;
	}
}

//============================================
// GridCountingWorkspace capability
//============================================

const gridCountingWorkspaceCapability: SceneCapability = {
	id: 'gridCountingWorkspace',

	//============================================
	// mount - Initialize the capability
	//============================================
	mount(ctx: SceneContext, config: unknown): void {
		// Validate and cache state for this scene
		getOrInitializeState(ctx.sceneId, config);
	},

	//============================================
	// onStepChange - Respond to step change
	//============================================
	onStepChange(ctx: SceneContext, step: ProtocolStep): void {
		// Reset count when a new step begins
		// (user may click the same quadrant on a different counting step)
		resetCount(ctx.sceneId);
	},

	//============================================
	// onClick - Handle clicks on quadrant elements
	//============================================
	onClick(ctx: SceneContext, target: ClickTarget): boolean {
		// Quadrant clicks are handled by the legacy code (setupQuadrantListeners)
		// which prompts the user for input and updates the DOM.
		// The capability does not intercept these clicks; return false to allow
		// legacy handlers to run.
		return false;
	},

	//============================================
	// unmount - Clean up
	//============================================
	unmount(ctx: SceneContext): void {
		// Reset state when the scene unmounts
		resetCount(ctx.sceneId);
		delete STATE_BY_SCENE[ctx.sceneId];
	},
};

//============================================
// Self-register at module load
//============================================

registerCapability(gridCountingWorkspaceCapability);
