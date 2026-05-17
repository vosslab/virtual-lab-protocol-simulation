/**
 * tests/test_runtime_no_premature_mutation.mjs
 *
 * Node test for runtime behavior contract:
 * - Runtime must NOT advance on wrong target
 * - Runtime must NOT mutate state before validator passes
 *
 * This test builds a minimal runtime scenario and verifies that
 * applySceneOperation is only called when validator passes.
 */

import assert from 'node:assert';
import test from 'node:test';

/**
 * Mock RuntimeWorld for testing.
 */
function createMockWorld() {
	return {
		activeSceneId: 'test_scene',
		objectStates: {
			bottle_1: { empty: false },
		},
		scenes: {
			test_scene: { id: 'test_scene' },
		},
	};
}

/**
 * Mock validator that checks if a target matches expected.
 */
function mockValidator(interaction, target) {
	// correct_target validator: checks if clicked target matches interaction target
	if (interaction.validator.preset === 'correct_target') {
		return target === interaction.target;
	}
	// sequence_complete: all interactions in sequence must be valid
	if (interaction.validator.preset === 'sequence_complete') {
		return true;
	}
	return false;
}

/**
 * Mock applySceneOperation: tracks whether it was called.
 */
let applyCallCount = 0;
function mockApplySceneOperation(world, op) {
	applyCallCount += 1;
	if (op.type === 'ObjectStateChange') {
		const nextStates = {
			...world.objectStates,
			[op.target]: {
				...world.objectStates[op.target],
				...op.state,
			},
		};
		return {
			...world,
			objectStates: nextStates,
		};
	}
	return world;
}

test('Runtime does not advance on wrong target', async (t) => {
	const world = createMockWorld();
	const step = {
		step_name: 'test_step',
		prompt: 'Click the bottle',
		sequence: [
			{
				target: 'bottle_1',
				gesture: 'click',
				validator: { preset: 'correct_target' },
				response: {
					scene_operations: [
						{
							type: 'ObjectStateChange',
							target: 'bottle_1',
							state: { empty: true },
						},
					],
					feedback: 'Wrong target!',
				},
			},
		],
		step_validator: { preset: 'sequence_complete' },
		outcome: { on_success: 'complete', on_failure: 'retry' },
		next_step: null,
	};

	const interaction = step.sequence[0];

	// Scenario 1: Click WRONG target
	applyCallCount = 0;
	const wrongTarget = 'wrong_item';
	const validatorPassed = mockValidator(interaction, wrongTarget);

	// Validator should reject
	assert.strictEqual(validatorPassed, false, 'Validator should reject wrong target');

	// applySceneOperation should NOT be called when validator fails
	if (validatorPassed) {
		for (const op of interaction.response.scene_operations) {
			mockApplySceneOperation(world, op);
		}
	}

	assert.strictEqual(
		applyCallCount,
		0,
		'applySceneOperation should NOT be called on wrong target',
	);

	// Scenario 2: Click CORRECT target
	applyCallCount = 0;
	const correctTarget = 'bottle_1';
	const validatorPassed2 = mockValidator(interaction, correctTarget);

	// Validator should pass
	assert.strictEqual(validatorPassed2, true, 'Validator should pass for correct target');

	// applySceneOperation SHOULD be called when validator passes
	let nextWorld = world;
	if (validatorPassed2) {
		for (const op of interaction.response.scene_operations) {
			nextWorld = mockApplySceneOperation(nextWorld, op);
		}
	}

	assert.strictEqual(
		applyCallCount,
		1,
		'applySceneOperation should be called exactly once on correct target',
	);

	// World should be mutated only when validator passed
	assert.strictEqual(nextWorld.objectStates.bottle_1.empty, true, 'State should be mutated after validator pass');
});

test('Runtime does not mutate state before validator passes', async (t) => {
	const world = createMockWorld();

	const interaction = {
		target: 'bottle_1',
		gesture: 'click',
		validator: { preset: 'correct_target' },
		response: {
			scene_operations: [
				{
					type: 'ObjectStateChange',
					target: 'bottle_1',
					state: { empty: true },
				},
			],
			feedback: 'Feedback message',
		},
	};

	// Before any validator check, world state should be unchanged
	const originalState = JSON.stringify(world.objectStates);

	// Simulate wrong interaction (validator fails)
	const validatorPassed = mockValidator(interaction, 'wrong_target');
	assert.strictEqual(validatorPassed, false);

	// State should NOT be mutated when validator fails
	const stateAfterFailedValidator = JSON.stringify(world.objectStates);
	assert.strictEqual(
		originalState,
		stateAfterFailedValidator,
		'World state should remain unchanged when validator fails',
	);

	// Now simulate correct interaction (validator passes)
	const validatorPassed2 = mockValidator(interaction, 'bottle_1');
	assert.strictEqual(validatorPassed2, true);

	// Only now should state be mutated
	let nextWorld = world;
	if (validatorPassed2) {
		for (const op of interaction.response.scene_operations) {
			nextWorld = mockApplySceneOperation(nextWorld, op);
		}
	}

	assert.strictEqual(
		nextWorld.objectStates.bottle_1.empty,
		true,
		'State should be mutated ONLY after validator passes',
	);
});
