/**
 * test_dispatch_click.ts
 *
 * Pure function tests for dispatchClick using node:test.
 * Tests all four completionPath kinds and wrong-order detection.
 *
 * Run: npx tsx --test tests/test_dispatch_click.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchClick } from '../src/scene_runtime/dispatch/index';
import type {
	SceneConfig,
	ProtocolStep,
	CompletionPath,
	InteractionSequencePath,
	DirectToolPath,
	ModalPath,
	MultipleChoicePath,
} from '../src/scene_runtime/contract';

//============================================

/**
 * Helper: create a minimal SceneConfig
 */
function makeScene(items: Record<string, any> = {}): SceneConfig {
	return {
		id: 'test_scene',
		items: items,
		reagents: {},
	};
}

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

test('interactionSequence: tool click matches', () => {
	const scene = makeScene();
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const result = dispatchClick(scene, step, { id: 'pipette', kind: 'item' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, false);
	assert.equal(result.expectedNext, 'pipette');
});

test('interactionSequence: unrelated item does not match', () => {
	const scene = makeScene();
	const path: InteractionSequencePath = {
		kind: 'interactionSequence',
		tool: 'pipette',
		source: 'tube_a',
		destination: 'tube_b',
		completionEvent: 'interaction_complete',
	};
	const step = makeStep('step1', path);

	const result = dispatchClick(scene, step, { id: 'random_item', kind: 'item' });

	assert.equal(result.matched, false);
	assert.equal(result.advances, false);
	assert.ok(result.reason);
});

test('directTool: correct tool advances', () => {
	const scene = makeScene();
	const path: DirectToolPath = {
		kind: 'directTool',
		tool: 'centrifuge',
		completionEvent: 'tool_used',
	};
	const step = makeStep('step2', path);

	const result = dispatchClick(scene, step, { id: 'centrifuge', kind: 'item' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, true);
});

test('directTool: wrong tool does not advance', () => {
	const scene = makeScene();
	const path: DirectToolPath = {
		kind: 'directTool',
		tool: 'centrifuge',
		completionEvent: 'tool_used',
	};
	const step = makeStep('step2', path);

	const result = dispatchClick(scene, step, { id: 'wrong_tool', kind: 'item' });

	assert.equal(result.matched, false);
	assert.equal(result.advances, false);
	assert.equal(result.expectedNext, 'centrifuge');
});

test('modal: open click matches, does not advance', () => {
	const scene = makeScene();
	const path: ModalPath = {
		kind: 'modal',
		openClick: 'modal_button',
		advanceClick: 'confirm_button',
		completionEvent: 'modal_confirmed',
	};
	const step = makeStep('step3', path);

	const result = dispatchClick(scene, step, { id: 'modal_button', kind: 'item' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, false);
	assert.equal(result.expectedNext, 'confirm_button');
});

test('modal: advance click matches and advances', () => {
	const scene = makeScene();
	const path: ModalPath = {
		kind: 'modal',
		openClick: 'modal_button',
		advanceClick: 'confirm_button',
		completionEvent: 'modal_confirmed',
	};
	const step = makeStep('step3', path);

	const result = dispatchClick(scene, step, { id: 'confirm_button', kind: 'item' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, true);
});

test('multipleChoice: correct choice advances', () => {
	const scene = makeScene();
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

	const result = dispatchClick(scene, step, { id: 'choice_a', kind: 'choice' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, true);
});

test('multipleChoice: incorrect choice does not advance', () => {
	const scene = makeScene();
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

	const result = dispatchClick(scene, step, { id: 'choice_b', kind: 'choice' });

	assert.equal(result.matched, true);
	assert.equal(result.advances, false);
	assert.ok(result.reason);
});
