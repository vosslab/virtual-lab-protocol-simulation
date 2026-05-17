/**
 * tests/test_generated_runtime_data_shape.mjs
 *
 * Generated-data parity test: verifies that every loaded protocol/scene/object/material
 * carries the required top-level fields per the realigned contract, and that NO
 * retired fields (completionPath, plateTargets, tubeTargets, requiredItems, errorHints)
 * appear anywhere in loaded runtime data.
 *
 * This test gates M1 before any renderer work; it catches contract regressions
 * early by scanning the generated data and the loaded RuntimeWorld.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { importTsModule } from './_compile_for_test.mjs';

// Load the generated catalogs.
const { PROTOCOL_CATALOG } = await import('../generated/protocol_data.ts');
const { SCENE_CATALOG } = await import('../generated/scene_data.ts');
const { OBJECT_CATALOG } = await import('../generated/object_data.ts');

// Import loader modules via esbuild.
const protocolLoaderModule = await importTsModule(
	'src/scene_runtime/loader/protocol.ts'
);
const { setProtocolCatalog, ProtocolName } = protocolLoaderModule;

const sceneLoaderModule = await importTsModule(
	'src/scene_runtime/loader/scene.ts'
);
const { setSceneCatalog } = sceneLoaderModule;

const objectLoaderModule = await importTsModule(
	'src/scene_runtime/loader/object.ts'
);
const { setObjectCatalog } = objectLoaderModule;

const materialLoaderModule = await importTsModule(
	'src/scene_runtime/loader/material.ts'
);

const worldLoaderModule = await importTsModule(
	'src/scene_runtime/loader/world.ts'
);
const { loadWorld } = worldLoaderModule;

// Initialize loaders.
setProtocolCatalog(PROTOCOL_CATALOG);
setSceneCatalog(SCENE_CATALOG);
setObjectCatalog(OBJECT_CATALOG);

// Build the loaders object to pass to loadWorld.
const loaders = {
	loadProtocol: protocolLoaderModule.loadProtocol,
	loadScene: sceneLoaderModule.loadScene,
	loadObject: objectLoaderModule.loadObject,
	loadMaterial: materialLoaderModule.loadMaterial,
};

// Retired field names that must NOT appear in generated data.
const RETIRED_FIELDS = [
	'completionPath',
	'plateTargets',
	'tubeTargets',
	'requiredItems',
	'errorHints',
];

/**
 * Recursively scan a value for any occurrence of retired field names.
 * Returns an array of paths where retired fields were found.
 */
function findRetiredFields(value, path = '') {
	const findings = [];

	if (value === null || value === undefined) {
		return findings;
	}

	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const itemPath = `${path}[${i}]`;
				findings.push(...findRetiredFields(value[i], itemPath));
			}
		} else {
			for (const key of Object.keys(value)) {
				if (RETIRED_FIELDS.includes(key)) {
					findings.push(`${path}.${key}`);
				}
				const childPath = path ? `${path}.${key}` : key;
				findings.push(...findRetiredFields(value[key], childPath));
			}
		}
	}

	return findings;
}

// ============================================
// Test: Protocol records have required top-level fields
// ============================================

test('every protocol in PROTOCOL_CATALOG has required top-level fields', () => {
	for (const protocolName of Object.keys(PROTOCOL_CATALOG)) {
		const protocol = PROTOCOL_CATALOG[protocolName];

		assert.ok(protocol.protocol_type, `protocol "${protocolName}" has protocol_type`);
		assert.ok(protocol.protocol_name, `protocol "${protocolName}" has protocol_name`);
		assert.strictEqual(
			protocol.protocol_name,
			protocolName,
			`protocol "${protocolName}" name matches key`
		);
		assert.ok(
			protocol.entry_step !== undefined,
			`protocol "${protocolName}" has entry_step`
		);
		assert.ok(Array.isArray(protocol.steps), `protocol "${protocolName}" has steps array`);

		// For mini_protocol, learning block is required.
		if (protocol.protocol_type === 'mini_protocol') {
			assert.ok(
				protocol.learning,
				`mini_protocol "${protocolName}" has learning block`
			);
			assert.ok(
				protocol.learning.objectives,
				`mini_protocol "${protocolName}" has learning.objectives`
			);
			assert.ok(
				protocol.learning.outcomes,
				`mini_protocol "${protocolName}" has learning.outcomes`
			);
			assert.ok(
				protocol.learning.goals,
				`mini_protocol "${protocolName}" has learning.goals`
			);
		}

		// materials must be an object (empty or populated).
		assert.strictEqual(
			typeof protocol.materials,
			'object',
			`protocol "${protocolName}" materials is an object`
		);
	}
});

// ============================================
// Test: Scene records have required top-level fields
// ============================================

test('every scene in SCENE_CATALOG has required top-level fields', () => {
	for (const sceneName of Object.keys(SCENE_CATALOG)) {
		const scene = SCENE_CATALOG[sceneName];

		assert.ok(scene.scene_name, `scene "${sceneName}" has scene_name`);
		assert.strictEqual(
			scene.scene_name,
			sceneName,
			`scene "${sceneName}" name matches key`
		);
		assert.ok(scene.workspace, `scene "${sceneName}" has workspace`);
		assert.ok(Array.isArray(scene.capabilities), `scene "${sceneName}" has capabilities`);
		assert.ok(scene.scene_bounds, `scene "${sceneName}" has scene_bounds`);
		assert.ok(scene.background, `scene "${sceneName}" has background`);
		assert.ok(Array.isArray(scene.zones), `scene "${sceneName}" has zones`);
		assert.ok(Array.isArray(scene.placements), `scene "${sceneName}" has placements`);

		// Validate that no inheritance keys remain (must be resolved Python-side).
		const unresolvedKeys = [
			'extends',
			'add_placements',
			'remove_placements',
			'deactivate_placements',
			'reposition_placements',
		];
		for (const key of unresolvedKeys) {
			assert.ok(
				!(key in scene),
				`scene "${sceneName}" has no unresolved inheritance key "${key}"`
			);
		}
	}
});

// ============================================
// Test: Object records have required top-level fields
// ============================================

test('every object in OBJECT_CATALOG has required top-level fields', () => {
	for (const objectName of Object.keys(OBJECT_CATALOG)) {
		const obj = OBJECT_CATALOG[objectName];

		assert.ok(obj.object_name, `object "${objectName}" has object_name`);
		assert.strictEqual(
			obj.object_name,
			objectName,
			`object "${objectName}" name matches key`
		);
		assert.ok(obj.kind, `object "${objectName}" has kind`);
		assert.ok(obj.label, `object "${objectName}" has label`);
		assert.ok(Array.isArray(obj.state_fields), `object "${objectName}" has state_fields`);
		assert.ok(
			typeof obj.visual_states === 'object',
			`object "${objectName}" has visual_states`
		);
		assert.ok(Array.isArray(obj.capabilities), `object "${objectName}" has capabilities`);

		// Validate state_fields structure.
		for (let i = 0; i < obj.state_fields.length; i++) {
			const field = obj.state_fields[i];
			assert.ok(
				field.field_name,
				`object "${objectName}" state_fields[${i}] has field_name`
			);
			assert.ok(
				field.type,
				`object "${objectName}" state_fields[${i}] has type`
			);
			assert.ok(
				field.default !== undefined,
				`object "${objectName}" state_fields[${i}].${field.field_name} has default`
			);
		}
	}
});

// ============================================
// Test: Material records in protocols have required fields
// ============================================

test('every material in protocol.materials has required fields', () => {
	for (const protocolName of Object.keys(PROTOCOL_CATALOG)) {
		const protocol = PROTOCOL_CATALOG[protocolName];
		const materials = protocol.materials || {};

		for (const materialName of Object.keys(materials)) {
			const material = materials[materialName];

			assert.ok(material.label, `material "${materialName}" in protocol "${protocolName}" has label`);
			assert.ok(
				material.display_color,
				`material "${materialName}" in protocol "${protocolName}" has display_color`
			);
			assert.ok(
				material.display_color.light,
				`material "${materialName}" in protocol "${protocolName}" display_color has light`
			);
			assert.ok(
				material.display_color.dark,
				`material "${materialName}" in protocol "${protocolName}" display_color has dark`
			);
		}
	}
});

// ============================================
// Test: NO retired fields appear in any loaded data
// ============================================

test('NO retired fields (completionPath, plateTargets, etc.) appear in generated PROTOCOL_CATALOG', () => {
	for (const protocolName of Object.keys(PROTOCOL_CATALOG)) {
		const protocol = PROTOCOL_CATALOG[protocolName];
		const retired = findRetiredFields(protocol, `PROTOCOL_CATALOG["${protocolName}"]`);

		assert.strictEqual(
			retired.length,
			0,
			`protocol "${protocolName}" has no retired fields; found: ${retired.join(', ')}`
		);
	}
});

test('NO retired fields appear in generated SCENE_CATALOG', () => {
	for (const sceneName of Object.keys(SCENE_CATALOG)) {
		const scene = SCENE_CATALOG[sceneName];
		const retired = findRetiredFields(scene, `SCENE_CATALOG["${sceneName}"]`);

		assert.strictEqual(
			retired.length,
			0,
			`scene "${sceneName}" has no retired fields; found: ${retired.join(', ')}`
		);
	}
});

test('NO retired fields appear in generated OBJECT_CATALOG', () => {
	for (const objectName of Object.keys(OBJECT_CATALOG)) {
		const obj = OBJECT_CATALOG[objectName];
		const retired = findRetiredFields(obj, `OBJECT_CATALOG["${objectName}"]`);

		assert.strictEqual(
			retired.length,
			0,
			`object "${objectName}" has no retired fields; found: ${retired.join(', ')}`
		);
	}
});

// ============================================
// Test: NO retired fields in loaded RuntimeWorld
// ============================================

test('NO retired fields appear in loaded RuntimeWorld', () => {
	// Find a test protocol with at least one SceneChange.
	let testProtocolName = null;
	for (const name of Object.keys(PROTOCOL_CATALOG)) {
		const proto = PROTOCOL_CATALOG[name];
		if (proto.protocol_type === 'mini_protocol' && proto.steps.length > 0) {
			const hasSceneChange = proto.steps.some((step) =>
				(step.sequence || []).some((interaction) => {
					const ops = (interaction.response?.scene_operations || []);
					return ops.some((op) => op.type === 'SceneChange');
				})
			);
			if (hasSceneChange) {
				testProtocolName = name;
				break;
			}
		}
	}
	assert.ok(testProtocolName, 'found test protocol with SceneChange');

	const protocolName = ProtocolName(testProtocolName);
	const world = loadWorld(protocolName, loaders);

	const retired = findRetiredFields(world, 'world');

	assert.strictEqual(
		retired.length,
		0,
		`loaded RuntimeWorld has no retired fields; found: ${retired.join(', ')}`
	);
});
