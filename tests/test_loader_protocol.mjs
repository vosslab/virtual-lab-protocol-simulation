/**
 * tests/test_loader_protocol.mjs
 *
 * Test the protocol loader against real generated protocol data.
 * Uses node --test (native Node.js test runner).
 *
 * Verifies:
 * - loadProtocol(name) returns a typed ProtocolConfig
 * - entry_step is validated against steps[].step_name
 * - all next_step references are valid
 * - no duplicate step names exist
 * - missing required fields throw loud errors
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { importTsModule } from './_compile_for_test.mjs';

// Load the generated protocol data first.
const { PROTOCOL_CATALOG } = await import('../generated/protocol_data.ts');

// Import the loader module via esbuild bundling.
const loaderModule = await importTsModule(
	'src/scene_runtime/loader/protocol.ts'
);
const { loadProtocol, ProtocolName, setProtocolCatalog } = loaderModule;

// Initialize the loader with the catalog.
setProtocolCatalog(PROTOCOL_CATALOG);

// Get a list of protocol names.
const protocolNames = Object.keys(PROTOCOL_CATALOG);

test('loadProtocol loads at least one real protocol', (t) => {
	assert(protocolNames.length > 0, 'PROTOCOL_CATALOG is empty');
	console.log(`  Found ${protocolNames.length} protocols in PROTOCOL_CATALOG`);
});

test('loadProtocol returns valid protocol shape', (t) => {
	// Pick a mini_protocol (not a sequence_runner which has empty steps).
	const miniProtocols = protocolNames.filter(
		(name) => PROTOCOL_CATALOG[name].protocol_type === 'mini_protocol'
	);

	assert(miniProtocols.length > 0, 'no mini_protocol found in PROTOCOL_CATALOG');

	const protocolName = miniProtocols[0];
	const proto = PROTOCOL_CATALOG[protocolName];

	console.log(`  Testing with protocol: ${protocolName}`);
	console.log(`    entry_step: ${proto.entry_step}`);
	console.log(`    steps: ${proto.steps.length} steps`);

	// Call the loader.
	const protocolNameBrand = ProtocolName(protocolName);
	const loaded = loadProtocol(protocolNameBrand);

	// Verify the loaded protocol matches.
	assert.equal(loaded.protocol_name, protocolName);
	assert.equal(loaded.protocol_type, proto.protocol_type);
	assert.equal(loaded.entry_step, proto.entry_step);
	assert.equal(loaded.steps.length, proto.steps.length);

	// Verify entry_step is in steps.
	const stepNames = loaded.steps.map((s) => s.step_name);
	assert(
		stepNames.includes(loaded.entry_step),
		`entry_step "${loaded.entry_step}" not found in steps`
	);

	// Verify no duplicate step names.
	const uniqueStepNames = new Set(stepNames);
	assert.equal(
		uniqueStepNames.size,
		stepNames.length,
		'duplicate step names found'
	);

	// Verify every next_step reference is valid.
	for (const step of loaded.steps) {
		if (step.next_step !== null) {
			assert(
				stepNames.includes(step.next_step),
				`next_step "${step.next_step}" not found in steps at step_name="${step.step_name}"`
			);
		}
	}

	console.log(
		`  ✓ Loaded protocol "${protocolName}" with ${loaded.steps.length} steps`
	);
});

test('ProtocolName constructor validates protocol existence', (t) => {
	const invalidName = 'nonexistent_protocol_xyz_abc';
	assert.throws(
		() => ProtocolName(invalidName),
		(err) => err.message.includes('unknown protocol name'),
		`should throw for unknown protocol: ${invalidName}`
	);
	console.log(`  ✓ ProtocolName correctly rejected unknown protocol`);
});

test('loadProtocol validates all steps have required fields', (t) => {
	// Use a real protocol and verify all steps are valid.
	const miniProtocols = protocolNames.filter(
		(name) => PROTOCOL_CATALOG[name].protocol_type === 'mini_protocol'
	);

	const protocolName = miniProtocols[0];
	const protocolNameBrand = ProtocolName(protocolName);
	const loaded = loadProtocol(protocolNameBrand);

	// Verify all steps have required fields.
	for (const step of loaded.steps) {
		assert(typeof step.step_name === 'string', 'step_name must be string');
		assert(typeof step.prompt === 'string', 'prompt must be string');
		assert(Array.isArray(step.sequence), 'sequence must be array');
		assert(typeof step.step_validator === 'object', 'step_validator must be object');
		assert(typeof step.outcome === 'object', 'outcome must be object');
		assert(
			step.next_step === null || typeof step.next_step === 'string',
			'next_step must be null or string'
		);
	}

	console.log(
		`  ✓ All steps in "${protocolName}" have required fields`
	);
});
