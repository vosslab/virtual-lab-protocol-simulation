/**
 * src/scene_runtime/loader/object.ts
 *
 * Object loader: validates and returns a typed ObjectConfig.
 *
 * Validates:
 * - object exists in OBJECT_CATALOG
 * - all state_fields have materialized default values (never null unless schema declares null)
 * - every visual_states entry's kind is one of the four authored mechanisms
 *   (svg_swap, composite_fill_height, composite_empty, overlay)
 *
 * Throws loud errors on every violation with the offending object / field / state cited.
 */

import type { ObjectConfig } from '../types';

// Runtime-injected by the test harness or runtime entry point.
let OBJECT_CATALOG_INJECTED: Record<string, ObjectConfig> | null = null;

/**
 * Set the object catalog for the loader.
 * Must be called with the OBJECT_CATALOG from generated/object_data.ts
 * before any loadObject() calls.
 *
 * Exported for test use; normally set by bundle/entry.ts at runtime startup.
 */
export function setObjectCatalog(
	catalog: Record<string, ObjectConfig>
): void {
	OBJECT_CATALOG_INJECTED = catalog;
}

/**
 * Brand type for object names.
 * Validates that the name exists in OBJECT_CATALOG.
 */
export type ObjectId = string & { readonly __brand: 'ObjectId' };

/**
 * Validate and construct an ObjectId brand.
 * Throws if the name is not in OBJECT_CATALOG_INJECTED.
 * Requires setObjectCatalog() to have been called first.
 */
export function ObjectId(raw: string): ObjectId {
	if (!OBJECT_CATALOG_INJECTED) {
		throw new Error(
			'Object loader not initialized; call setObjectCatalog() first'
		);
	}
	if (!(raw in OBJECT_CATALOG_INJECTED)) {
		throw new Error(`unknown object name: ${raw}`);
	}
	return raw as ObjectId;
}

// Closed set of supported visual_states mechanisms.
const SUPPORTED_VISUAL_STATES_KINDS = new Set([
	'svg_swap',
	'composite_fill_height',
	'composite_empty',
	'overlay',
]);

/**
 * loadObject(name: ObjectId): ObjectConfig
 *
 * Load an object by name from the injected OBJECT_CATALOG.
 * Materialize each state_fields[i].default value (return the typed value, never null).
 * Validate every visual_states entry's kind is one of the four authored mechanisms.
 * Throw loud errors on missing fields or invalid state mechanisms.
 * Return the typed, validated ObjectConfig.
 *
 * Requires setObjectCatalog() to have been called first.
 */
export function loadObject(name: ObjectId): ObjectConfig {
	if (!OBJECT_CATALOG_INJECTED) {
		throw new Error(
			'Object loader not initialized; call setObjectCatalog() first'
		);
	}
	const obj = OBJECT_CATALOG_INJECTED[name];

	if (!obj) {
		throw new Error(`missing object in catalog: ${name}`);
	}

	// Validate required top-level fields.
	if (!obj.object_name) {
		throw new Error(`missing required field object_name on object: ${name}`);
	}
	if (!obj.kind) {
		throw new Error(`missing required field kind on object: ${name}`);
	}
	if (!obj.label) {
		throw new Error(`missing required field label on object: ${name}`);
	}
	if (!Array.isArray(obj.state_fields)) {
		throw new Error(`missing required field state_fields on object: ${name}`);
	}
	if (!obj.visual_states || typeof obj.visual_states !== 'object') {
		throw new Error(
			`missing required field visual_states on object: ${name}`
		);
	}
	if (!Array.isArray(obj.capabilities)) {
		throw new Error(`missing required field capabilities on object: ${name}`);
	}

	// Validate state_fields: each must have a default value (materialized, not null).
	for (let i = 0; i < obj.state_fields.length; i++) {
		const field = obj.state_fields[i]!;

		if (!field.field_name) {
			throw new Error(
				`missing required field field_name at state_fields[${i}] on object: ${name}`
			);
		}
		if (!field.type) {
			throw new Error(
				`missing required field type at state_fields[${i}].field_name="${field.field_name}" on object: ${name}`
			);
		}

		// Check that default exists and is not null (even though the schema widened default to allow null,
		// the spec requires authored defaults to be materialized).
		if (field.default === undefined || field.default === null) {
			throw new Error(
				`missing required field default at state_fields[${i}].field_name="${field.field_name}" on object: ${name}`
			);
		}
	}

	// Validate visual_states: each entry's kind must be in the closed set.
	for (const [fieldName, visualState] of Object.entries(obj.visual_states)) {
		if (!visualState.kind) {
			throw new Error(
				`missing required field kind at visual_states["${fieldName}"] on object: ${name}`
			);
		}

		// Reject unknown visual_states kinds; the set is closed at the four authored mechanisms.
		if (!SUPPORTED_VISUAL_STATES_KINDS.has(visualState.kind)) {
			throw new Error(
				`unknown visual_states kind "${visualState.kind}" at visual_states["${fieldName}"] on object: ${name}; ` +
				`supported kinds are: ${Array.from(SUPPORTED_VISUAL_STATES_KINDS).join(', ')}`
			);
		}
	}

	// If we got here, the object is valid. Return it.
	return obj;
}
