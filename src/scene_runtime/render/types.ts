/**
 * render/types.ts
 *
 * Type definitions for scene-operation appliers and rendering.
 * Defines the applier function signature and registry shape
 * that downstream WPs will extend (CursorAttach, LayoutMove, TimedWait, RenderRequest).
 */

import type { RuntimeWorld, SceneOperation } from '../types';

/**
 * Applier function signature: transforms a RuntimeWorld by applying a scene operation.
 * Pure function; returns a new RuntimeWorld; original is unchanged.
 */
export type Applier<TOp extends SceneOperation> = (
	world: RuntimeWorld,
	op: TOp,
) => RuntimeWorld;

/**
 * Applier registry: a map of scene operation type names to applier functions.
 * Extended by downstream WPs (WP-RENDER-1B, WP-RENDER-1C, WP-RENDER-1D).
 */
export interface ApplierRegistry {
	ObjectStateChange: Applier<any>;
	SceneChange: Applier<any>;
	CursorAttach?: Applier<any>;
	LayoutMove?: Applier<any>;
	TimedWait?: Applier<any>;
	RenderRequest?: Applier<any>;
}
