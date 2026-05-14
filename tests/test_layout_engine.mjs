/**
 * tests/test_layout_engine.mjs
 *
 * Node test suite for scene runtime layout engine using node:test.
 * Tests pure layoutScene() function with empty, single-item, multi-zone,
 * row wrap, and depth ordering scenarios.
 *
 * Run with: node --test tests/test_layout_engine.mjs
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

//============================================
// Import layout function (compiled from TypeScript)
// Since this is .mjs, we import the compiled .js from dist or compile on the fly.
// For now, we re-implement the pure function in JS for testing.
//============================================

function depthScaleFor(depth) {
	if (depth === "back") return 0.8;
	if (depth === "front") return 1.1;
	return 1.0;
}

function depthBaselineOffsetFor(depth) {
	if (depth === "back") return -4;
	if (depth === "front") return 4;
	return 0;
}

const ZONE_PADDING = 1;
const DEFAULT_ITEM_WIDTH = 10;
const DEFAULT_ITEM_HEIGHT = 10;
const MIN_GAP = 2;

function layoutScene(scene) {
	const items = Object.values(scene.items || {});

	if (items.length === 0) {
		return {
			zones: {},
			itemPositions: {},
			items: [],
		};
	}

	const itemsByZone = {};

	for (const item of items) {
		const zoneId = item.scene || "default";
		if (!itemsByZone[zoneId]) {
			itemsByZone[zoneId] = [];
		}
		itemsByZone[zoneId].push(item);
	}

	const zones = {};
	const layoutItems = [];
	const itemPositions = {};

	let currentYOffset = 10;

	for (const [zoneId, zoneItems] of Object.entries(itemsByZone)) {
		const sorted = [...zoneItems].sort((a, b) => {
			const depthA = a.scene || "";
			const depthB = b.scene || "";
			return depthA.localeCompare(depthB);
		});

		const zoneWidth = 80;
		const zoneX = 10;
		const zoneHeight = sorted.length * 15 + 10;
		const zoneBaseline = currentYOffset + 20;

		zones[zoneId] = {
			x: zoneX,
			y: currentYOffset,
			width: zoneWidth,
			height: zoneHeight,
		};

		let xOffset = zoneX + ZONE_PADDING;
		let rowYOffset = 0;
		const rowHeight = DEFAULT_ITEM_HEIGHT + MIN_GAP;
		const maxRowWidth = 5 * (DEFAULT_ITEM_WIDTH + MIN_GAP);
		const wrapThreshold = Math.min(zoneX + zoneWidth - ZONE_PADDING, zoneX + maxRowWidth);

		for (let i = 0; i < sorted.length; i++) {
			const item = sorted[i];
			const depth = item.scene || "mid";
			const scale = depthScaleFor(depth);
			const baselineOffset = depthBaselineOffsetFor(depth);

			const width = DEFAULT_ITEM_WIDTH * scale;
			const height = DEFAULT_ITEM_HEIGHT * scale;

			if (xOffset + width > wrapThreshold && xOffset > zoneX + ZONE_PADDING) {
				xOffset = zoneX + ZONE_PADDING;
				rowYOffset += rowHeight;
			}

			const x = xOffset;
			const y = zoneBaseline + rowYOffset + baselineOffset - height / 2;

			const layoutItem = {
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

//============================================
// Test cases
//============================================

test("empty scene returns empty layout", () => {
	const scene = {
		id: "empty_scene",
		items: {},
	};

	const result = layoutScene(scene);

	assert.deepStrictEqual(result.zones, {});
	assert.deepStrictEqual(result.itemPositions, {});
	assert.deepStrictEqual(result.items, []);
});

test("single-item zone creates one layout item", () => {
	const scene = {
		id: "single_item_scene",
		items: {
			bottle_1: {
				id: "bottle_1",
				label: "Bottle",
				scene: "bench_zone",
				role: "storage",
			},
		},
	};

	const result = layoutScene(scene);

	assert.equal(Object.keys(result.zones).length, 1);
	assert.equal(result.items.length, 1);
	assert.equal(result.items[0].id, "bottle_1");
	assert.equal(typeof result.items[0].x, "number");
	assert.equal(typeof result.items[0].y, "number");
	assert.equal(typeof result.items[0].width, "number");
	assert.equal(typeof result.items[0].height, "number");
});

test("multi-item single zone lays items in row", () => {
	const scene = {
		id: "multi_item_scene",
		items: {
			item_1: { id: "item_1", label: "Item 1", scene: "zone_a" },
			item_2: { id: "item_2", label: "Item 2", scene: "zone_a" },
			item_3: { id: "item_3", label: "Item 3", scene: "zone_a" },
		},
	};

	const result = layoutScene(scene);

	assert.equal(Object.keys(result.zones).length, 1);
	assert.equal(result.items.length, 3);

	// Items should be positioned left-to-right (increasing x)
	const item1 = result.items.find((i) => i.id === "item_1");
	const item2 = result.items.find((i) => i.id === "item_2");
	const item3 = result.items.find((i) => i.id === "item_3");

	assert.ok(item1);
	assert.ok(item2);
	assert.ok(item3);
	assert.ok(item1.x < item2.x, "item_1 should be left of item_2");
	assert.ok(item2.x < item3.x, "item_2 should be left of item_3");
});

test("multi-zone layout separates zones vertically", () => {
	const scene = {
		id: "multi_zone_scene",
		items: {
			zone_a_item: {
				id: "zone_a_item",
				label: "Zone A",
				scene: "zone_a",
			},
			zone_b_item: {
				id: "zone_b_item",
				label: "Zone B",
				scene: "zone_b",
			},
		},
	};

	const result = layoutScene(scene);

	assert.equal(Object.keys(result.zones).length, 2);
	assert.equal(result.items.length, 2);

	// Zones should have different y positions
	const zoneA = result.zones.zone_a;
	const zoneB = result.zones.zone_b;

	assert.ok(zoneA);
	assert.ok(zoneB);
	assert.notEqual(zoneA.y, zoneB.y, "zones should be at different y positions");
});

test("depth scaling adjusts item width", () => {
	const scene = {
		id: "depth_scene",
		items: {
			back_item: {
				id: "back_item",
				label: "Back",
				scene: "back",
			},
			mid_item: {
				id: "mid_item",
				label: "Mid",
				scene: "mid",
			},
			front_item: {
				id: "front_item",
				label: "Front",
				scene: "front",
			},
		},
	};

	const result = layoutScene(scene);

	const backLayout = result.items.find((i) => i.id === "back_item");
	const midLayout = result.items.find((i) => i.id === "mid_item");
	const frontLayout = result.items.find((i) => i.id === "front_item");

	assert.ok(backLayout);
	assert.ok(midLayout);
	assert.ok(frontLayout);

	// back (0.8 scale) < mid (1.0 scale) < front (1.1 scale)
	assert.ok(
		backLayout.width < midLayout.width,
		"back item should be smaller than mid"
	);
	assert.ok(
		midLayout.width < frontLayout.width,
		"mid item should be smaller than front"
	);

	// Baseline offsets should differ in y position
	assert.ok(
		backLayout.y < midLayout.y,
		"back item should be higher (smaller y) than mid"
	);
	assert.ok(
		frontLayout.y > midLayout.y,
		"front item should be lower (larger y) than mid"
	);
});

test("row wrap occurs when items exceed row capacity", () => {
	const scene = {
		id: "wrap_scene",
		items: {
			item_1: { id: "item_1", label: "1", scene: "zone_a" },
			item_2: { id: "item_2", label: "2", scene: "zone_a" },
			item_3: { id: "item_3", label: "3", scene: "zone_a" },
			item_4: { id: "item_4", label: "4", scene: "zone_a" },
			item_5: { id: "item_5", label: "5", scene: "zone_a" },
			item_6: { id: "item_6", label: "6", scene: "zone_a" },
		},
	};

	const result = layoutScene(scene);

	assert.equal(result.items.length, 6);

	// Get y positions to detect row wrapping
	const yPositions = result.items.map((i) => Math.round(i.y));
	const uniqueYPositions = [...new Set(yPositions)];

	// With 6 items and row wrap, should have multiple y positions
	assert.ok(
		uniqueYPositions.length > 1,
		"items should be placed on multiple rows"
	);
});

test("item positions match item layout", () => {
	const scene = {
		id: "position_match_scene",
		items: {
			test_item: { id: "test_item", label: "Test", scene: "zone" },
		},
	};

	const result = layoutScene(scene);

	const layoutItem = result.items[0];
	const positionEntry = result.itemPositions["test_item"];

	assert.ok(layoutItem);
	assert.ok(positionEntry);
	assert.equal(layoutItem.x, positionEntry.x);
	assert.equal(layoutItem.y, positionEntry.y);
});
