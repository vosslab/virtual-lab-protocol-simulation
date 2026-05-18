/**
 * src/scene_runtime/layout/types.ts
 *
 * Type definitions for the layout engine.
 * Mined from src/scene_types.ts with six refinements per audit:
 * - Added shortLabel?: string to SceneItem
 * - Dropped [key: string]: unknown escape hatch from SceneLayoutRules
 * - Dropped dead SemanticZoneDef type
 * - Carried labelFontSize, labelLineHeight, labelOffsetY as named fields
 * - Carried closed SceneItemGroup union
 * - Asset metrics: aspect ratio parsed at runtime from SVG viewBox
 */

//============================================
// Scene items and grouping

export type SceneItemGroup =
	| 'stocks'
	| 'wash'
	| 'waste'
	| 'pipetting'
	| 'plate'
	| 'dilution_prep'
	| 'equipment';

export type SceneItem = {
	id: string;
	svgAsset: string;
	kind: string;
	zone: string;
	depthTier: number;
	widthScale: number;
	label: string;
	shortLabel?: string;
	anchorY: 'top' | 'bottom' | 'tip';
	baselineOverride?: number;
	alignStop?: 'left' | 'center' | 'right';
	depth?: 'back' | 'mid' | 'front';
	group?: SceneItemGroup;
};

//============================================
// Asset specifications

export type AssetSpec = {
	defaultWidth: number;
	labelWidth: number;
	anchorYOffset?: number;
	widthScale?: number;
};

//============================================
// Zone definitions (resolved)

export type ZoneDef = {
	x0: number;
	x1: number;
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right' | 'justify' | 'tab-stops';
};

//============================================
// Scene bounds

export type SceneBounds = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

//============================================
// Layout rules (closed schema; no escape hatches)

export type SceneLayoutRules = {
	zones: Record<string, ZoneDef>;
	labelFontSize: number;
	labelLineHeight: number;
	labelOffsetY: number;
	sceneBounds?: SceneBounds;
};

//============================================
// Row+slot scene input (new model; parallel to zone-based input)

export type Slot = {
	placement_name: string;
	object_name: string;
};

export type Row = {
	row_name: string;
	slots: Slot[];
};

export type RowSlotSceneInput = {
	rows: Row[];
	workspace: 'hood'; // extensible to other workspaces later
	labelFontSize?: number;
	labelLineHeight?: number;
	labelOffsetY?: number;
	sceneBounds?: SceneBounds;
};

//============================================
// Computed layout result

export type ComputedItemLayout = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	footprint: number;
	tooltip: string;
	labelLines: string[];
	labelX: number;
	labelY: number;
	labelWidth: number;
	labelMultiline: boolean;
};
