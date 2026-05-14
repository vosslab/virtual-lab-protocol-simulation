// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// scene_item_lookup.ts - Shared helper for looking up scene items
//============================================
// Provides utility functions to find scene items by id and retrieve
// their labels. Both bench and hood adapters use these helpers.
// Accepts scene_data generated types (including DispatchOnlySceneItem)
// and scene_types types (full LayoutSceneItem).

import type { SceneItem as GeneratedSceneItem } from "../../scene_configs";
import type { SceneItem } from "../../scene_types";


//============================================
// getSceneItemLabel(sceneItems, itemId)
//
// Look up a scene item label by ID from the provided items array.
// Used by interaction code and hint displays. Returns the item id
// itself as a fallback for unknown ids (intentional, allows graceful
// degradation when item data is incomplete).
// Accepts both generated SceneItem (union) and scene_types SceneItem.
//============================================
export function getSceneItemLabel(sceneItems: (GeneratedSceneItem | SceneItem)[] | undefined, itemId: string): string {
	if (!sceneItems) {
		return itemId;
	}

	for (let i = 0; i < sceneItems.length; i++) {
		const item = sceneItems[i];
		if (item && item.id === itemId && 'label' in item) {
			return (item as any).label;
		}
	}

	return itemId;
}

//============================================
// findSceneItem(sceneItems, itemId)
//
// Look up a scene item by ID from the provided items array.
// Returns the full SceneItem object or undefined if not found.
// Used by render code to find item properties like kind and dimensions.
// Accepts both generated SceneItem (union) and scene_types SceneItem.
//============================================
export function findSceneItem(sceneItems: (GeneratedSceneItem | SceneItem)[] | undefined, itemId: string): SceneItem | undefined {
	if (!sceneItems) {
		return undefined;
	}

	for (let i = 0; i < sceneItems.length; i++) {
		const item = sceneItems[i];
		if (item && item.id === itemId) {
			return item as any;
		}
	}

	return undefined;
}
