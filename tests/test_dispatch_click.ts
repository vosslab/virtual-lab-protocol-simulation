/**
 * test_dispatch_click.ts
 *
 * Unit tests for the click dispatcher (WP-DISPATCH-1).
 * Covers: target resolution via closest(), gesture reading, ambiguity rejection,
 * non-target-click silence, and detach function.
 *
 * Uses node's native test runner with custom DOM simulation.
 * Run with: npx tsx tests/test_dispatch_click.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { attachClickDispatch } from '../src/scene_runtime/dispatch/click';
import type { InteractionEvent } from '../src/scene_runtime/types';

// ============================================
// Helper: create a mock element with data attributes and DOM methods

type Listener = {
	type: string;
	listener: EventListener;
	useCapture: boolean;
};

interface MockHTMLElement extends HTMLElement {
	_attrs: Map<string, string>;
	_listeners: Listener[];
	_children: MockHTMLElement[];
	_parentElement: MockHTMLElement | null;
	_getListeners(): Listener[];
}

function createMockElement(
	attrs: Record<string, string> = {},
	children: MockHTMLElement[] = [],
): MockHTMLElement {
	const attributes = new Map(Object.entries(attrs));
	const listeners: Listener[] = [];

	const element: any = {
		_attrs: attributes,
		_listeners: listeners,
		_children: children,
		_parentElement: null as MockHTMLElement | null,

		getAttribute(name: string): string | null {
			return attributes.get(name) ?? null;
		},

		setAttribute(name: string, value: string): void {
			attributes.set(name, value);
		},

		closest(selector: string): MockHTMLElement | null {
			if (selector !== '[data-target-id]') {
				throw new Error(`Unsupported selector: ${selector}`);
			}
			let current: MockHTMLElement | null = this;
			while (current) {
				if (current.getAttribute('data-target-id')) {
					return current;
				}
				current = current._parentElement;
			}
			return null;
		},

		addEventListener(
			type: string,
			listener: EventListener,
			options?: boolean | AddEventListenerOptions,
		): void {
			const useCapture =
				typeof options === 'boolean' ? options : options?.capture ?? false;
			listeners.push({ type, listener, useCapture });
		},

		removeEventListener(
			type: string,
			listener: EventListener,
			options?: boolean | AddEventListenerOptions,
		): void {
			const useCapture =
				typeof options === 'boolean' ? options : options?.capture ?? false;
			const idx = listeners.findIndex(
				(l) => l.type === type && l.listener === listener && l.useCapture === useCapture,
			);
			if (idx >= 0) {
				listeners.splice(idx, 1);
			}
		},

		_getListeners(): Listener[] {
			return listeners;
		},
	};

	children.forEach((child) => {
		child._parentElement = element;
	});

	return element;
}

// Simple Event mock that has target property.
class SimpleEvent implements Event {
	target: EventTarget | null;
	constructor(public type: string, _init?: EventInit) {
		this.target = null;
	}
	get bubbles(): boolean {
		return false;
	}
	get cancelable(): boolean {
		return false;
	}
	get composed(): boolean {
		return false;
	}
	get currentTarget(): EventTarget | null {
		return null;
	}
	get eventPhase(): number {
		return 0;
	}
	get isTrusted(): boolean {
		return false;
	}
	get timeStamp(): number {
		return Date.now();
	}
	cancelBubble = false;
	returnValue = true;
	get srcElement(): EventTarget | null {
		return this.target;
	}
	composedPath(): EventTarget[] {
		return [];
	}
	initEvent(): void {}
	preventDefault(): void {}
	stopImmediatePropagation(): void {}
	stopPropagation(): void {}
	NONE = 0;
	CAPTURING_PHASE = 1;
	AT_TARGET = 2;
	BUBBLING_PHASE = 3;
}

function simulateClick(root: MockHTMLElement, targetElement: MockHTMLElement): void {
	const listeners = root._getListeners();
	const clickListeners = listeners.filter((l) => l.type === 'click' && l.useCapture);
	for (const { listener } of clickListeners) {
		const event = new SimpleEvent('click');
		event.target = targetElement as any;
		listener.call(root, event);
	}
}

// ============================================
// Tests

test('(a) click on target with data-target-id emits InteractionEvent', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const target = createMockElement({ 'data-target-id': 'flask_1', 'data-gesture': 'click' });
	root._children = [target];
	target._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, target);

	assert.equal(events.length, 1);
	assert.equal(events[0]!.targetId, 'flask_1');
	assert.equal(events[0]!.gesture, 'click');

	detach();
});

test('(b) click on child of target ancestor resolves via closest', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const target = createMockElement({ 'data-target-id': 'well_plate_96' });
	const child = createMockElement({ class: 'well' });
	target._children = [child];
	child._parentElement = target;
	root._children = [target];
	target._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, child);

	assert.equal(events.length, 1);
	assert.equal(events[0]!.targetId, 'well_plate_96');
	assert.equal(events[0]!.gesture, 'click');

	detach();
});

test('(c) click outside any target is silently ignored', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const noTarget = createMockElement({ class: 'background' });
	root._children = [noTarget];
	noTarget._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, noTarget);

	assert.equal(events.length, 0);

	detach();
});

test('(d) detach function removes the listener', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const target = createMockElement({ 'data-target-id': 'object_1' });
	root._children = [target];
	target._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, target);
	const countBefore = events.length;

	detach();

	simulateClick(root, target);
	const countAfter = events.length;

	assert.equal(countBefore, 1);
	assert.equal(countAfter, 1);
});

test('(e) gesture defaults to "click" when data-gesture is absent', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const target = createMockElement({ 'data-target-id': 'object_1' });
	root._children = [target];
	target._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, target);

	assert.equal(events.length, 1);
	assert.equal(events[0]!.gesture, 'click');

	detach();
});

test('(f) gesture defaults to "click" when data-gesture is empty string', () => {
	const events: InteractionEvent[] = [];
	const root = createMockElement();
	const target = createMockElement({ 'data-target-id': 'object_1', 'data-gesture': '' });
	root._children = [target];
	target._parentElement = root;

	const detach = attachClickDispatch(root as any, (e) => events.push(e));

	simulateClick(root, target);

	assert.equal(events.length, 1);
	assert.equal(events[0]!.gesture, 'click');

	detach();
});
