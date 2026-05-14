/**
 * layout/index.ts
 *
 * Pure layout engine for scene runtime. Computes positioning of items
 * within zones using row-based layout with depth ordering.
 *
 * Consumes SceneConfig from contract.ts and produces LayoutResult per types.ts.
 * No imports from src/scenes/ or src/legacy_*. No DOM, no async.
 */

import type { SceneConfig, SceneItem } from "../contract";
import type { LayoutResult, LayoutItem, Zone } from "../types";

//============================================
// Constants
//============================================

const ZONE_PADDING = 1;
const DEFAULT_ITEM_WIDTH = 100;
const DEFAULT_ITEM_HEIGHT = 100;
const MIN_GAP = 10;
const DEFAULT_BASELINE = 50;

//============================================
// Depth scale and baseline offset
//============================================

function depthScaleFor(depth: string | undefined): number {
	if (depth === "back") return 0.8;
	if (depth === "front") return 1.1;
	return 1.0;
}

function depthBaselineOffsetFor(depth: string | undefined): number {
	if (depth === "back") return -4;
	if (depth === "front") return 4;
	return 0;
}

//============================================
// Main layout function
//============================================

export function layoutScene(scene: SceneConfig): LayoutResult {
	const items = Object.values(scene.items || {});

	if (items.length === 0) {
		return {
			zones: {},
			itemPositions: {},
			items: [],
		};
	}

	// Group items by zone (zone id is expected to be in item.scene or
	// we treat all as a single zone)
	const itemsByZone: Record<string, SceneItem[]> = {};

	for (const item of items) {
		const zoneId = item.scene || "default";
		if (!itemsByZone[zoneId]) {
			itemsByZone[zoneId] = [];
		}
		itemsByZone[zoneId].push(item);
	}

	// Compute zones and item positions
	const zones: Record<string, Zone> = {};
	const layoutItems: LayoutItem[] = [];
	const itemPositions: Record<string, { x: number; y: number }> = {};

	let currentYOffset = 10;

	// Process zones in order of first appearance (preserve insertion order)
	for (const [zoneId, zoneItems] of Object.entries(itemsByZone)) {
		// Sort by depth tier (assumed to be in id if present, or stable sort)
		const sorted = [...zoneItems].sort((a, b) => {
			const depthA = a.scene || "";
			const depthB = b.scene || "";
			return depthA.localeCompare(depthB);
		});

		// Create zone record
		// Zone width should accommodate at least one item wide
		const zoneWidth = Math.max(DEFAULT_ITEM_WIDTH + MIN_GAP + 2 * ZONE_PADDING, 150);
		const zoneX = 10;
		// Calculate zone height based on actual row layout (not a fixed factor)
		const itemsPerRow = Math.max(1, Math.floor((zoneWidth - 2 * ZONE_PADDING) / (DEFAULT_ITEM_WIDTH + MIN_GAP)));
		const numRows = Math.max(1, Math.ceil(sorted.length / itemsPerRow));
		const zoneHeight = numRows * (DEFAULT_ITEM_HEIGHT + MIN_GAP) + 2 * ZONE_PADDING;
		const zoneBaseline = currentYOffset + 20;

		zones[zoneId] = {
			x: zoneX,
			y: currentYOffset,
			width: zoneWidth,
			height: zoneHeight,
		};

		// Layout items in this zone in rows; wrap when row capacity exceeded
		let xOffset = zoneX + ZONE_PADDING;
		let rowYOffset = 0;
		const rowHeight = DEFAULT_ITEM_HEIGHT + MIN_GAP;
		// Cap row width so multi-item zones wrap to readable rows
		const maxRowWidth = itemsPerRow * (DEFAULT_ITEM_WIDTH + MIN_GAP);
		const wrapThreshold = Math.min(zoneX + zoneWidth - ZONE_PADDING, zoneX + maxRowWidth);

		for (let i = 0; i < sorted.length; i++) {
			const item = sorted[i];
			if (!item) continue;

			const depth = item.scene || "mid";
			const scale = depthScaleFor(depth);
			const baselineOffset = depthBaselineOffsetFor(depth);

			const width = DEFAULT_ITEM_WIDTH * scale;
			const height = DEFAULT_ITEM_HEIGHT * scale;

			// Wrap to next row if placing this item would exceed zone width
			if (xOffset + width > wrapThreshold && xOffset > zoneX + ZONE_PADDING) {
				xOffset = zoneX + ZONE_PADDING;
				rowYOffset += rowHeight;
			}

			const x = xOffset;
			const y = zoneBaseline + rowYOffset + baselineOffset - height / 2;

			const layoutItem: LayoutItem = {
				id: item.id,
				x,
				y,
				width,
				height,
			};

			layoutItems.push(layoutItem);
			itemPositions[item.id] = { x, y };

			xOffset += width + MIN_GAP;
		}

		currentYOffset += zoneHeight + 5;
	}

	return {
		zones,
		itemPositions,
		items: layoutItems,
	};
}
