/**
 * types.ts
 *
 * Scene runtime result and state types. Defines the shape of layout results,
 * dispatch outcomes, highlight state, and liquid state that the scene runtime
 * spine produces and manages during protocol execution.
 *
 * No imports from src/scenes/ or src/legacy_*. No runtime code; types only.
 */

export interface Zone {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutItem {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutResult {
	zones: Record<string, Zone>;
	itemPositions: Record<string, { x: number; y: number }>;
	items: LayoutItem[];
}

export type DispatchOutcome = 'matched' | 'wrong_order' | 'wrong_tool' | 'no_match';

export interface DispatchResult {
	matched: boolean;
	advances: boolean;
	expectedNext?: string | undefined;
	wrongOrder?: boolean | undefined;
	reason?: string | undefined;
}

export interface HighlightState {
	nextTargets: string[];
	completedTargets: string[];
}

/**
 * Liquid entry: a single reagent in a container with volume and optional color key.
 */
export interface LiquidEntry {
	key: string;
	volumeMl: number;
	colorKey?: string;
}

/**
 * Container state: list of liquids, tracked volume.
 */
export interface ContainerLiquid {
	liquids: LiquidEntry[];
	totalVolumeMl: number;
}

/**
 * Liquid state: per-container map of liquids and totals.
 */
export interface LiquidState {
	containers: Record<string, ContainerLiquid>;
}

/**
 * Liquid transfer operation: move, discharge, or mix.
 */
export interface LiquidTransfer {
	kind: 'transfer' | 'discharge' | 'mix';
	from?: string;
	to?: string;
	liquid: string;
	volumeMl: number;
	colorKey?: string;
}
