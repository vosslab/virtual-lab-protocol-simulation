/**
 * src/scene_runtime/loader/scene.ts
 *
 * Scene loader: validates and returns a typed ResolvedSceneConfig.
 *
 * Validates:
 * - scene exists in SCENE_CATALOG
 * - every placement.object_name resolves to a loaded ObjectConfig
 * - no unresolved inheritance keys remain (scenes are resolved Python-side)
 *
 * Throws loud errors on every violation with the offending scene / placement / field cited.
 */

import type { ResolvedSceneConfig, ObjectConfig } from '../types';

// Runtime-injected by the test harness or runtime entry point.
let SCENE_CATALOG_INJECTED: Record<string, ResolvedSceneConfig> | null = null;

/**
 * Set the scene catalog for the loader.
 * Must be called with the SCENE_CATALOG from generated/scene_data.ts
 * before any loadScene() calls.
 *
 * Exported for test use; normally set by bundle/entry.ts at runtime startup.
 */
export function setSceneCatalog(
	catalog: Record<string, ResolvedSceneConfig>
): void {
	SCENE_CATALOG_INJECTED = catalog;
}

/**
 * Brand type for scene names.
 * Validates that the name exists in SCENE_CATALOG.
 */
export type SceneId = string & { readonly __brand: 'SceneId' };

/**
 * Validate and construct a SceneId brand.
 * Throws if the name is not in SCENE_CATALOG_INJECTED.
 * Requires setSceneCatalog() to have been called first.
 */
export function SceneId(raw: string): SceneId {
	if (!SCENE_CATALOG_INJECTED) {
		throw new Error(
			'Scene loader not initialized; call setSceneCatalog() first'
		);
	}
	if (!(raw in SCENE_CATALOG_INJECTED)) {
		throw new Error(`unknown scene name: ${raw}`);
	}
	return raw as SceneId;
}

/**
 * Find all scene names that contain a given object in their placements.
 * Returns an empty array if no scenes contain the object or if the catalog is not initialized.
 * Used internally by the world loader to infer which scenes are needed based on target objects.
 */
export function findScenesContainingObject(objectName: string): string[] {
	if (!SCENE_CATALOG_INJECTED) {
		return [];
	}

	const matchingScenes: string[] = [];
	for (const sceneName of Object.keys(SCENE_CATALOG_INJECTED)) {
		const scene = SCENE_CATALOG_INJECTED[sceneName];
		if (!scene || !Array.isArray(scene.placements)) {
			continue;
		}
		const hasObject = scene.placements.some((p) => p.object_name === objectName);
		if (hasObject) {
			matchingScenes.push(sceneName);
		}
	}
	return matchingScenes;
}

/**
 * loadScene(name: SceneId): ResolvedSceneConfig
 *
 * Load a scene by name from the injected SCENE_CATALOG.
 * Validate that the scene is fully resolved (no inheritance keys remain).
 * Validate that every placement.object_name resolves to a loaded object.
 * Throw loud errors on missing fields or invalid references.
 * Return the typed, validated ResolvedSceneConfig.
 *
 * Requires setSceneCatalog() to have been called first.
 * Requires that loadObject is available for cross-reference validation.
 */
export function loadScene(
	name: SceneId,
	objectLoader: (objName: string) => ObjectConfig
): ResolvedSceneConfig {
	if (!SCENE_CATALOG_INJECTED) {
		throw new Error(
			'Scene loader not initialized; call setSceneCatalog() first'
		);
	}
	const scene = SCENE_CATALOG_INJECTED[name];

	if (!scene) {
		throw new Error(`missing scene in catalog: ${name}`);
	}

	// Validate required top-level fields.
	if (!scene.scene_name) {
		throw new Error(`missing required field scene_name on scene: ${name}`);
	}
	if (!scene.workspace) {
		throw new Error(`missing required field workspace on scene: ${name}`);
	}
	if (!Array.isArray(scene.capabilities)) {
		throw new Error(`missing required field capabilities on scene: ${name}`);
	}
	if (!scene.scene_bounds) {
		throw new Error(`missing required field scene_bounds on scene: ${name}`);
	}
	if (!scene.background) {
		throw new Error(`missing required field background on scene: ${name}`);
	}
	if (!Array.isArray(scene.zones)) {
		throw new Error(`missing required field zones on scene: ${name}`);
	}
	if (!Array.isArray(scene.placements)) {
		throw new Error(`missing required field placements on scene: ${name}`);
	}

	// Validate that no unresolved inheritance keys remain.
	// The Python builder must resolve extends, add_placements, remove_placements,
	// deactivate_placements, and reposition_placements before emitting.
	// If any of these keys exist in the loaded record, it is a builder gap signal.
	const unresolved = [
		'extends',
		'add_placements',
		'remove_placements',
		'deactivate_placements',
		'reposition_placements',
	];
	for (const key of unresolved) {
		if (key in scene) {
			throw new Error(
				`scene inheritance not resolved Python-side; unresolved key "${key}" found on scene: ${name}`
			);
		}
	}

	// Validate each placement resolves to a loaded object.
	for (let i = 0; i < scene.placements.length; i++) {
		const placement = scene.placements[i]!;

		// Validate required placement fields.
		if (!placement.placement_name) {
			throw new Error(
				`missing required field placement_name at placements[${i}] on scene: ${name}`
			);
		}
		if (!placement.object_name) {
			throw new Error(
				`missing required field object_name at placements[${i}].placement_name="${placement.placement_name}" on scene: ${name}`
			);
		}
		if (!placement.zone) {
			throw new Error(
				`missing required field zone at placements[${i}].placement_name="${placement.placement_name}" on scene: ${name}`
			);
		}

		// Validate that the referenced object exists by calling the object loader.
		// This will throw with a clear error if the object is missing.
		try {
			objectLoader(placement.object_name);
		} catch (err) {
			throw new Error(
				`placement "${placement.placement_name}" references unknown object "${placement.object_name}" on scene: ${name}`
			);
		}
	}

	// If we got here, the scene is valid. Return it.
	return scene;
}
