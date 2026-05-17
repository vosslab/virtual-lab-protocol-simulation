/**
 * tests/test_loader_world.mjs
 *
 * Test suite for RuntimeWorld assembly via loadWorld.
 * Uses real protocols from generated/protocol_data.ts.
 * Asserts that loadWorld returns a fully populated RuntimeWorld with
 * protocol, scenes, objects, materials all loaded and validated.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { importTsModule } from './_compile_for_test.mjs';

// Load the generated catalogs first.
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

// Initialize loaders with catalogs.
setProtocolCatalog(PROTOCOL_CATALOG);
setSceneCatalog(SCENE_CATALOG);
setObjectCatalog(OBJECT_CATALOG);

// Build the loaders object to pass to loadWorld.
const loaders = {
	loadProtocol: protocolLoaderModule.loadProtocol,
	loadScene: sceneLoaderModule.loadScene,
	loadObject: objectLoaderModule.loadObject,
	loadMaterial: materialLoaderModule.loadMaterial,
	// Provide the scenesContainingObject function to support scene inference
	// in bundled contexts where module initialization order is unpredictable.
	scenesContainingObject: sceneLoaderModule.findScenesContainingObject,
	// Provide the objectCatalog directly to avoid module-level state issues
	// in bundled contexts where setObjectCatalog may not be visible to all
	// closure contexts.
	objectCatalog: OBJECT_CATALOG,
};

// ============================================
// Test: loadWorld assembles a complete RuntimeWorld
// ============================================

test('loadWorld assembles complete RuntimeWorld with protocol, scenes, objects, materials', () => {
	// Use mtt_solubilization_readout as the test protocol (Pilot 1).
	// This protocol is stable and exercises the full loader path.
	const testProtocolName = 'mtt_solubilization_readout';
	const protocolName = ProtocolName(testProtocolName);

	// Load the world.
	const world = loadWorld(protocolName, loaders);

	// Assertions: RuntimeWorld shape
	assert.ok(world.protocol, 'world has protocol');
	assert.strictEqual(world.protocol.protocol_name, testProtocolName);
	assert.strictEqual(world.activeStepIndex, 0, 'activeStepIndex starts at 0');
	assert.strictEqual(typeof world.activeSceneId, 'string', 'activeSceneId is a string');

	// Assertions: scenes are loaded
	assert.ok(Object.keys(world.scenes).length > 0, 'at least one scene is loaded');
	for (const sceneId of Object.keys(world.scenes)) {
		const scene = world.scenes[sceneId];
		assert.ok(scene.scene_name, `scene ${sceneId} has scene_name`);
		assert.ok(Array.isArray(scene.placements), `scene ${sceneId} has placements`);
	}

	// Assertions: objects are loaded
	assert.ok(Object.keys(world.objects).length > 0, 'at least one object is loaded');
	for (const objectId of Object.keys(world.objects)) {
		const obj = world.objects[objectId];
		assert.ok(obj.object_name, `object ${objectId} has object_name`);
		assert.ok(Array.isArray(obj.state_fields), `object ${objectId} has state_fields`);
	}

	// Assertions: objectStates are initialized
	assert.ok(Object.keys(world.objectStates).length > 0, 'at least one object state is initialized');
	for (const objectId of Object.keys(world.objectStates)) {
		const state = world.objectStates[objectId];
		assert.strictEqual(typeof state, 'object', `objectStates[${objectId}] is an object`);
		// Verify state contains materialized defaults from the object's state_fields.
		const obj = world.objects[objectId];
		for (const field of obj.state_fields) {
			assert.ok(
				field.field_name in state,
				`state for ${objectId} contains field ${field.field_name}`
			);
		}
	}

	// Assertions: cursor state is initialized
	assert.strictEqual(world.cursorState.attachedTo, null, 'cursorState.attachedTo starts null');
	assert.strictEqual(world.cursorState.operation, null, 'cursorState.operation starts null');

	// Assertions: materials are loaded
	assert.ok(world.materials, 'world has materials');
	assert.strictEqual(typeof world.materials, 'object', 'materials is an object');

	// If the protocol references materials, they should all be loaded.
	// For cell_seeding_plate_setup, materials may be present depending on content.
	// If present, validate their structure.
	for (const materialName of Object.keys(world.materials)) {
		const material = world.materials[materialName];
		assert.ok(material.label, `material ${materialName} has label`);
		assert.ok(material.display_color, `material ${materialName} has display_color`);
		assert.ok(
			material.display_color.light,
			`material ${materialName} display_color has light`
		);
		assert.ok(
			material.display_color.dark,
			`material ${materialName} display_color has dark`
		);
	}

	// Assertions: layout state exists (even if empty)
	assert.ok(typeof world.layoutState === 'object', 'layoutState is an object');
});

// ============================================
// Test: loadWorld throws on missing protocol
// ============================================

test('loadWorld throws loud error on missing protocol', () => {
	const missingProtocolName = 'nonexistent_protocol_xyzzy';

	assert.throws(
		() => {
			ProtocolName(missingProtocolName);
		},
		/unknown protocol name/,
		'ProtocolName throws on unknown name'
	);
});

// Use mtt_solubilization_readout (Pilot 1) as the test protocol for all tests.
const testProtocolName = 'mtt_solubilization_readout';

// ============================================
// Test: loadWorld correctly references loaded objects
// ============================================

test('loadWorld loads all objects referenced by scene placements', () => {
	assert.ok(testProtocolName, 'test protocol found');
	const protocolName = ProtocolName(testProtocolName);
	const world = loadWorld(protocolName, loaders);

	// Verify that every object referenced by a scene placement is loaded.
	for (const sceneId of Object.keys(world.scenes)) {
		const scene = world.scenes[sceneId];
		for (const placement of scene.placements) {
			assert.ok(
				placement.object_name in world.objects,
				`placement "${placement.placement_name}" references loaded object "${placement.object_name}"`
			);
		}
	}
});

// ============================================
// Test: loadWorld initializes object state with field defaults
// ============================================

test('loadWorld initializes objectStates from state_fields defaults', () => {
	assert.ok(testProtocolName, 'test protocol found');
	const protocolName = ProtocolName(testProtocolName);
	const world = loadWorld(protocolName, loaders);

	// For each loaded object, verify that objectStates contains every state_field
	// initialized to its declared default.
	for (const objectId of Object.keys(world.objects)) {
		const obj = world.objects[objectId];
		const state = world.objectStates[objectId];

		for (const field of obj.state_fields) {
			assert.ok(
				field.field_name in state,
				`state for ${objectId} contains field "${field.field_name}"`
			);
			assert.strictEqual(
				state[field.field_name],
				field.default,
				`state field "${field.field_name}" initialized to declared default`
			);
		}
	}
});

// ============================================
// Test: WP-LOADER-1D - Pilot 1 activeSceneId inference
// ============================================

test('loadWorld infers activeSceneId from entry_step first target for mtt_solubilization_readout', () => {
	// Pilot 1 protocol: mtt_solubilization_readout.
	// Entry step: add_dmso_to_wells.
	// First target: micropipette (no subpart).
	// The initial scene must be the one containing micropipette in its placements.
	const protocol = PROTOCOL_CATALOG['mtt_solubilization_readout'];
	assert.ok(protocol, 'mtt_solubilization_readout protocol found');
	assert.strictEqual(protocol.entry_step, 'add_dmso_to_wells', 'entry_step is add_dmso_to_wells');

	// Load the world.
	const protocolName = ProtocolName('mtt_solubilization_readout');
	const world = loadWorld(protocolName, loaders);

	// The activeSceneId should NOT be mtt_solubilization_readout_plate_reader_workspace
	// (which only appears in step 3's SceneChange).
	// Instead, it should be the scene containing micropipette.
	assert.notStrictEqual(
		world.activeSceneId,
		'mtt_solubilization_readout_plate_reader_workspace',
		'activeSceneId is NOT the plate_reader scene (which appears only in step 3)'
	);

	// Verify the activeSceneId's scene contains micropipette in its placements.
	const activeScene = world.scenes[world.activeSceneId];
	assert.ok(activeScene, `activeScene "${world.activeSceneId}" is loaded`);

	const hasMicropipette = activeScene.placements.some((p) => p.object_name === 'micropipette');
	assert.ok(
		hasMicropipette,
		`activeScene "${world.activeSceneId}" contains micropipette in placements`
	);

	// Verify that micropipette is actually loaded and accessible.
	assert.ok(
		world.objects['micropipette'],
		'micropipette object is loaded into world.objects'
	);

	// Verify that the only scene with a SceneChange (plate_reader_workspace) is still
	// loaded in world.scenes (as per the broader scene-collection logic).
	assert.ok(
		world.scenes['mtt_solubilization_readout_plate_reader_workspace'],
		'plate_reader_workspace is still collected and available for step 3'
	);
});
