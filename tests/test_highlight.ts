/**
 * test_highlight.ts
 *
 * Pure function tests for deriveHighlights using node:test.
 * Tests highlight derivation for all four completionPath kinds.
 *
 * Run: npx tsx --test tests/test_highlight.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveHighlights } from '../src/scene_runtime/highlight/index';
import type {
	ProtocolStep,
	CompletionPath,
	InteractionSequencePath,
	DirectToolPath,
	ModalPath,
	MultipleChoicePath,
} from '../src/scene_runtime/contract';

//============================================

/**
 * Helper: create a ProtocolStep
 */
function makeStep(id: string, completionPath: CompletionPath): ProtocolStep {
	return {
		id: id,
		label: `Step ${id}`,
		scene: 'test_scene',
		completionPath: completionPath,
	};
}

//============================================

test('interactionSequence: initial state highlights first click', () => {
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const state = deriveHighlights(step, []);

	assert.deepEqual(state.nextTargets, ['pipette']);
	assert.deepEqual(state.completedTargets, []);
});

test('interactionSequence: after tool click highlights source', () => {
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const state = deriveHighlights(step, ['pipette']);

	assert.deepEqual(state.nextTargets, ['tube_a']);
	assert.deepEqual(state.completedTargets, ['pipette']);
});

test('interactionSequence: after tool and source highlights destination', () => {
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const state = deriveHighlights(step, ['pipette', 'tube_a']);

	assert.deepEqual(state.nextTargets, ['tube_b']);
	assert.deepEqual(state.completedTargets, ['pipette', 'tube_a']);
});

test('interactionSequence: complete sequence has no next targets', () => {
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const state = deriveHighlights(step, ['pipette', 'tube_a', 'tube_b']);

	assert.deepEqual(state.nextTargets, []);
	assert.deepEqual(state.completedTargets, ['pipette', 'tube_a', 'tube_b']);
});

test('directTool: initial state highlights the tool', () => {
	const path: DirectToolPath = {
		kind: 'directTool',
		tool: 'centrifuge',
		completionEvent: 'tool_used',
	};
	const step = makeStep('step2', path);

	const state = deriveHighlights(step, []);

	assert.deepEqual(state.nextTargets, ['centrifuge']);
	assert.deepEqual(state.completedTargets, []);
});

test('directTool: after click has no next targets', () => {
	const path: DirectToolPath = {
		kind: 'directTool',
		tool: 'centrifuge',
		completionEvent: 'tool_used',
	};
	const step = makeStep('step2', path);

	const state = deriveHighlights(step, ['centrifuge']);

	assert.deepEqual(state.nextTargets, []);
	assert.deepEqual(state.completedTargets, ['centrifuge']);
});

test('modal: initial state highlights openClick', () => {
	const path: ModalPath = {
		kind: 'modal',
		openClick: 'modal_button',
		advanceClick: 'confirm_button',
		completionEvent: 'modal_confirmed',
	};
	const step = makeStep('step3', path);

	const state = deriveHighlights(step, []);

	assert.deepEqual(state.nextTargets, ['modal_button']);
	assert.deepEqual(state.completedTargets, []);
});

test('modal: after open highlights advanceClick', () => {
	const path: ModalPath = {
		kind: 'modal',
		openClick: 'modal_button',
		advanceClick: 'confirm_button',
		completionEvent: 'modal_confirmed',
	};
	const step = makeStep('step3', path);

	const state = deriveHighlights(step, ['modal_button']);

	assert.deepEqual(state.nextTargets, ['confirm_button']);
	assert.deepEqual(state.completedTargets, ['modal_button']);
});

test('modal: complete has no next targets', () => {
	const path: ModalPath = {
		kind: 'modal',
		openClick: 'modal_button',
		advanceClick: 'confirm_button',
		completionEvent: 'modal_confirmed',
	};
	const step = makeStep('step3', path);

	const state = deriveHighlights(step, ['modal_button', 'confirm_button']);

	assert.deepEqual(state.nextTargets, []);
	assert.deepEqual(state.completedTargets, ['modal_button']);
});

test('multipleChoice: all choices available simultaneously', () => {
	const path: MultipleChoicePath = {
		kind: 'multipleChoice',
		question: 'Which is correct?',
		choices: [
			{ id: 'choice_a', text: 'Option A', correct: true },
			{ id: 'choice_b', text: 'Option B', correct: false },
			{ id: 'choice_c', text: 'Option C', correct: false },
		],
		completionEvent: 'choice_selected',
	};
	const step = makeStep('step4', path);

	const state = deriveHighlights(step, []);

	assert.deepEqual(state.nextTargets, ['choice_a', 'choice_b', 'choice_c']);
	assert.deepEqual(state.completedTargets, []);
});

test('multipleChoice: clicked choice marked as completed', () => {
	const path: MultipleChoicePath = {
		kind: 'multipleChoice',
		question: 'Which is correct?',
		choices: [
			{ id: 'choice_a', text: 'Option A', correct: true },
			{ id: 'choice_b', text: 'Option B', correct: false },
		],
		completionEvent: 'choice_selected',
	};
	const step = makeStep('step4', path);

	const state = deriveHighlights(step, ['choice_b']);

	assert.deepEqual(state.nextTargets, ['choice_a', 'choice_b']);
	assert.deepEqual(state.completedTargets, ['choice_b']);
});
