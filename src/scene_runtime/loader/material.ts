/**
 * src/scene_runtime/loader/material.ts
 *
 * Material loader: validates and returns a typed MaterialConfig.
 *
 * Materials are inlined within each protocol record. The loader reads from
 * protocol.materials and validates that the requested material exists with
 * all required fields (label, display_color with light and dark).
 *
 * Throws loud errors on every violation: missing material, missing required
 * fields, invalid color structure.
 */

import type { ProtocolConfig, MaterialConfig } from '../types';

/**
 * Brand type for material names.
 * Validates that the name exists in the protocol's materials record.
 */
export type MaterialName = string & { readonly __brand: 'MaterialName' };

/**
 * Validate and construct a MaterialName brand.
 * Throws if the material is not in the protocol's materials record.
 */
export function MaterialName(
	protocolMaterials: Record<string, MaterialConfig>,
	raw: string
): MaterialName {
	if (!(raw in protocolMaterials)) {
		throw new Error(
			`unknown material name: "${raw}"; available materials: ${Object.keys(protocolMaterials).join(', ')}`
		);
	}
	return raw as MaterialName;
}

/**
 * loadMaterial(protocol, materialName): MaterialConfig
 *
 * Load a material by name from a protocol's inlined materials record.
 * Validate that all required fields are present (label, display_color).
 * Validate that display_color has both light and dark color values.
 * Throw loud errors on missing fields or invalid structure.
 * Return the typed, validated MaterialConfig.
 */
export function loadMaterial(
	protocol: ProtocolConfig,
	materialName: string
): MaterialConfig {
	// Validate that protocol has materials.
	if (!protocol.materials) {
		throw new Error(
			`missing required field materials on protocol: ${protocol.protocol_name}`
		);
	}
	if (typeof protocol.materials !== 'object' || Array.isArray(protocol.materials)) {
		throw new Error(
			`materials must be an object on protocol: ${protocol.protocol_name}`
		);
	}

	// Validate that the material exists.
	const material = protocol.materials[materialName];
	if (!material) {
		throw new Error(
			`material "${materialName}" not found in protocol "${protocol.protocol_name}"; available: ${Object.keys(protocol.materials).join(', ')}`
		);
	}

	// Validate required top-level fields.
	if (!material.label) {
		throw new Error(
			`missing required field label on material "${materialName}" in protocol "${protocol.protocol_name}"`
		);
	}
	if (typeof material.label !== 'string') {
		throw new Error(
			`field label must be a string on material "${materialName}" in protocol "${protocol.protocol_name}"; got ${typeof material.label}`
		);
	}

	// Validate display_color structure.
	if (!material.display_color) {
		throw new Error(
			`missing required field display_color on material "${materialName}" in protocol "${protocol.protocol_name}"`
		);
	}
	if (typeof material.display_color !== 'object' || Array.isArray(material.display_color)) {
		throw new Error(
			`field display_color must be an object on material "${materialName}" in protocol "${protocol.protocol_name}"; got ${typeof material.display_color}`
		);
	}

	// Validate light and dark color fields.
	if (!material.display_color.light) {
		throw new Error(
			`missing required field display_color.light on material "${materialName}" in protocol "${protocol.protocol_name}"`
		);
	}
	if (typeof material.display_color.light !== 'string') {
		throw new Error(
			`field display_color.light must be a string on material "${materialName}" in protocol "${protocol.protocol_name}"; got ${typeof material.display_color.light}`
		);
	}

	if (!material.display_color.dark) {
		throw new Error(
			`missing required field display_color.dark on material "${materialName}" in protocol "${protocol.protocol_name}"`
		);
	}
	if (typeof material.display_color.dark !== 'string') {
		throw new Error(
			`field display_color.dark must be a string on material "${materialName}" in protocol "${protocol.protocol_name}"; got ${typeof material.display_color.dark}`
		);
	}

	// If we got here, the material is valid. Return it.
	return material;
}
