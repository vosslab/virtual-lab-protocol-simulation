/**
 * src/scene_runtime/layout/adapter.ts
 *
 * Adapter from RuntimeWorld to legacy computeSceneLayout.
 *
 * Public API: computeSceneLayout(world: RuntimeWorld, sceneId: string)
 * transforms world + scene into the legacy SceneItem[], AssetSpec[], and
 * SceneLayoutRules needed by the mined layout engine.
 */

import type { RuntimeWorld, ResolvedSceneConfig, ObjectConfig, PlacementConfig } from '../types';
import { computeSceneLayout as legacyComputeLayout } from './layout_engine';
import type { SceneItem, AssetSpec, SceneLayoutRules, ZoneDef, ComputedItemLayout } from './types';

/**
 * Default label styling when layout_rules does not specify.
 */
const DEFAULT_LABEL_FONT_SIZE = 14;
const DEFAULT_LABEL_LINE_HEIGHT = 1.2;
const DEFAULT_LABEL_OFFSET_Y = 10;
const DEFAULT_ZONE_GAP = 2;

/**
 * Public adapter: compute layout for one scene in a RuntimeWorld.
 *
 * Reads world.scenes[sceneId] and world.objects to build SceneItem[] and
 * SceneLayoutRules, then calls the mined layout engine.
 *
 * Returns ComputedItemLayout[] with positioned items, or throws on missing
 * scene, missing objects, or malformed layout data.
 */
export function computeSceneLayout(
	world: RuntimeWorld,
	sceneId: string,
	viewportW: number = 1200,
	viewportH: number = 900
): ComputedItemLayout[] {
	const scene = world.scenes[sceneId];
	if (!scene) {
		throw new Error(`computeSceneLayout: scene '${sceneId}' not found in world.scenes`);
	}

	// Build SceneItem[] from placements + object specs
	const sceneItems: SceneItem[] = [];
	const placements = scene.placements || [];

	for (const placement of placements) {
		const objectSpec = world.objects[placement.object_name];
		if (!objectSpec) {
			throw new Error(
				`computeSceneLayout: placement '${placement.placement_name}' references`
				+ ` unknown object '${placement.object_name}'`
			);
		}

		// Build SceneItem from placement + object spec
		const item = buildSceneItem(
			placement,
			objectSpec,
			sceneId
		);
		sceneItems.push(item);
	}

	// Build AssetSpec[] from object specs
	const assetSpecs: Record<string, AssetSpec> = {};
	for (const item of sceneItems) {
		if (!assetSpecs[item.svgAsset]) {
			const objectSpec = world.objects[item.svgAsset];
			if (!objectSpec) {
				throw new Error(
					`computeSceneLayout: object '${item.svgAsset}' not found in world.objects`
				);
			}
			assetSpecs[item.svgAsset] = buildAssetSpec(objectSpec);
		}
	}

	// Build SceneLayoutRules from scene zones + layout_rules
	const layoutRules = buildSceneLayoutRules(scene);

	// Call mined layout engine
	return legacyComputeLayout(
		sceneItems,
		assetSpecs,
		layoutRules,
		viewportW,
		viewportH
	);
}

/**
 * Build a SceneItem from a PlacementConfig and ObjectConfig.
 */
function buildSceneItem(
	placement: PlacementConfig,
	objectSpec: ObjectConfig,
	sceneId: string
): SceneItem {
	const layoutConfig = objectSpec.layout || {};
	const defaultWidth = layoutConfig.default_width || 15;
	const labelWidth = layoutConfig.label_width || 10;

	// Determine anchor_y: from layout config or fallback to 'center'
	let anchorY: 'top' | 'bottom' | 'tip' = 'center' as any;
	const configAnchorY = layoutConfig.anchor_y;
	if (configAnchorY === 'top' || configAnchorY === 'bottom' || configAnchorY === 'tip') {
		anchorY = configAnchorY;
	} else if (configAnchorY === 'center' || configAnchorY === 0) {
		anchorY = 'center' as any;
	}

	return {
		id: placement.placement_name,
		svgAsset: objectSpec.object_name,
		kind: objectSpec.kind,
		zone: placement.zone,
		depthTier: placement.depth_tier || 0,
		widthScale: 1.0, // Default scale; scene authors can override via placement.position.scale
		label: objectSpec.label,
		anchorY: anchorY,
		// Optional fields: shortLabel and depth are omitted, not set to undefined
	};
}

/**
 * Build an AssetSpec from an ObjectConfig.
 * Extracts default_width, label_width, and anchor_y_offset from layout config.
 */
function buildAssetSpec(objectSpec: ObjectConfig): AssetSpec {
	const layoutConfig = objectSpec.layout || {};
	const defaultWidth = layoutConfig.default_width || 15;
	const labelWidth = layoutConfig.label_width || 10;
	const anchorYOffset = layoutConfig.anchor_y_offset || 0;

	return {
		defaultWidth,
		labelWidth,
		anchorYOffset: typeof anchorYOffset === 'number' ? anchorYOffset : 0,
	};
}

/**
 * Build SceneLayoutRules from a ResolvedSceneConfig.
 * Converts scene.zones + layout_rules into the legacy ZoneDef[] map + defaults.
 */
function buildSceneLayoutRules(scene: ResolvedSceneConfig): SceneLayoutRules {
	// Build ZoneDef map from scene.zones
	const zonesMap: Record<string, ZoneDef> = {};
	const zones = scene.zones || [];

	for (const zone of zones) {
		const bounds = zone.bounds || { left: 0, right: 100, top: 0, bottom: 100 };
		zonesMap[zone.id] = {
			x0: bounds.left,
			x1: bounds.right,
			baseline: bounds.top + (bounds.bottom - bounds.top) / 2, // center baseline
			gap: DEFAULT_ZONE_GAP,
			align: (zone.align || 'center') as 'center' | 'left' | 'right' | 'justify' | 'tab-stops',
		};
	}

	// Extract label styling from layout_rules if present
	const layoutRules = scene.layout_rules || {};
	const labelFontSize = (layoutRules as any).label_font_size || DEFAULT_LABEL_FONT_SIZE;
	const labelLineHeight = (layoutRules as any).label_line_height || DEFAULT_LABEL_LINE_HEIGHT;
	const labelOffsetY = (layoutRules as any).label_offset_y || DEFAULT_LABEL_OFFSET_Y;

	// Build return object
	const rules: SceneLayoutRules = {
		zones: zonesMap,
		labelFontSize,
		labelLineHeight,
		labelOffsetY,
	};

	// Optional scene bounds: only add if present
	if (scene.scene_bounds) {
		rules.sceneBounds = {
			left: scene.scene_bounds.left,
			right: scene.scene_bounds.right,
			top: scene.scene_bounds.top,
			bottom: scene.scene_bounds.bottom,
		};
	}

	return rules;
}
