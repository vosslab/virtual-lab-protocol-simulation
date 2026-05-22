/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
/**
 * test_dispatch_adjust.ts
 *
 * Unit tests for the adjust dispatcher (WP-CHROME-ADJUST-1A).
 * Covers: AdjustCommit dispatch, element listener attachment (blur/Enter/change),
 * multi-event suppression (no per-tick commits), detach function, and value extraction.
 *
 * Uses node's native test runner with custom DOM simulation.
 * Run with: npx tsx tests/test_dispatch_adjust.ts
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  attachAdjustDispatchToElement,
  dispatchAdjustCommit,
} from "../src/scene_runtime/dispatch/adjust";
import type { InteractionEvent } from "../src/scene_runtime/types";

// ============================================
// Helper: create a mock input element with event simulation

interface MockInputElement extends HTMLInputElement {
  _attrs: Map<string, string>;
  _listeners: Map<string, EventListener[]>;
  _value: string;
  _checked: boolean;
  _dispatchEvent(eventType: string): void;
}

function createMockInputElement(
  type: string = "text",
  attrs: Record<string, string> = {},
): MockInputElement {
  const attributes = new Map(Object.entries(attrs));
  const listeners = new Map<string, EventListener[]>();

  const element: any = {
    _attrs: attributes,
    _listeners: listeners,
    _value: "",
    _checked: false,
    type,

    getAttribute(name: string): string | null {
      return attributes.get(name) ?? null;
    },

    setAttribute(name: string, value: string): void {
      attributes.set(name, value);
    },

    get value(): string {
      return this._value;
    },

    set value(v: string) {
      this._value = v;
    },

    get checked(): boolean {
      return this._checked;
    },

    set checked(c: boolean) {
      this._checked = c;
    },

    addEventListener(eventType: string, listener: EventListener): void {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
      }
      listeners.get(eventType)!.push(listener);
    },

    removeEventListener(eventType: string, listener: EventListener): void {
      const list = listeners.get(eventType);
      if (list) {
        const idx = list.indexOf(listener);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
      }
    },

    _dispatchEvent(eventType: string): void {
      const list = listeners.get(eventType);
      if (list) {
        for (const listener of list) {
          listener.call(this, new Event(eventType));
        }
      }
    },
  };

  return element;
}

// ============================================
// Tests

test("(a) dispatchAdjustCommit emits InteractionEvent with value attached", () => {
  const events: InteractionEvent[] = [];

  dispatchAdjustCommit({ targetId: "pipette_1", value: 100 }, (e) =>
    events.push(e),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]!.targetId, "pipette_1");
  assert.equal(events[0]!.gesture, "adjust");
  assert.equal(events[0]!.value, 100);
});

test("(b) dispatchAdjustCommit emits with string value", () => {
  const events: InteractionEvent[] = [];

  dispatchAdjustCommit({ targetId: "wavelength_1", value: "600nm" }, (e) =>
    events.push(e),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, "600nm");
});

test("(c) dispatchAdjustCommit emits with boolean value", () => {
  const events: InteractionEvent[] = [];

  dispatchAdjustCommit({ targetId: "power_switch", value: true }, (e) =>
    events.push(e),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, true);
});

test("(d) attachAdjustDispatchToElement wires blur event", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "50";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("blur");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.targetId, "pipette_1");
  assert.equal(events[0]!.gesture, "adjust");
  assert.equal(events[0]!.value, 50);

  detach();
});

test("(e) attachAdjustDispatchToElement wires Enter key", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "75";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  // Simulate Enter key.
  const listeners = input._listeners.get("keydown") || [];
  for (const listener of listeners) {
    listener.call(input, { key: "Enter" } as any);
  }

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, 75);

  detach();
});

test("(f) attachAdjustDispatchToElement wires change event", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("range");
  input.value = "25";

  const detach = attachAdjustDispatchToElement(input, "slider_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("change");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, 25);

  detach();
});

test("(g) attachAdjustDispatchToElement does NOT fire on input event (per-tick suppression)", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "10";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  // Simulate input event (should be ignored; we listen for blur/keydown/change only).
  if (input._listeners.has("input")) {
    const listeners = input._listeners.get("input")!;
    for (const listener of listeners) {
      listener.call(input, new Event("input"));
    }
  }

  assert.equal(events.length, 0);

  detach();
});

test("(h) attachAdjustDispatchToElement detach removes all listeners", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "100";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  // Fire one event before detach.
  input._dispatchEvent("blur");
  assert.equal(events.length, 1);

  // Detach.
  detach();

  // Fire another event after detach; should not emit.
  input._dispatchEvent("blur");
  assert.equal(events.length, 1);
});

test("(i) attachAdjustDispatchToElement coerces number type input to number", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "42.5";

  const detach = attachAdjustDispatchToElement(input, "dial_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("blur");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, 42.5);
  assert.equal(typeof events[0]!.value, "number");

  detach();
});

test("(j) attachAdjustDispatchToElement coerces range type input to number", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("range");
  input.value = "66";

  const detach = attachAdjustDispatchToElement(input, "slider_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("change");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, 66);
  assert.equal(typeof events[0]!.value, "number");

  detach();
});

test("(k) attachAdjustDispatchToElement handles checkbox as boolean", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("checkbox");
  input._checked = true;

  const detach = attachAdjustDispatchToElement(input, "switch_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("change");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, true);
  assert.equal(typeof events[0]!.value, "boolean");

  detach();
});

test("(l) attachAdjustDispatchToElement handles text input as string", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("text");
  input.value = "wavelength_600nm";

  const detach = attachAdjustDispatchToElement(input, "wavelength_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("blur");

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, "wavelength_600nm");
  assert.equal(typeof events[0]!.value, "string");

  detach();
});

test("(m) attachAdjustDispatchToElement does NOT emit on empty value", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  input._dispatchEvent("blur");

  assert.equal(events.length, 0);

  detach();
});

test("(n) attachAdjustDispatchToElement does NOT emit when Enter is on wrong key", () => {
  const events: InteractionEvent[] = [];
  const input = createMockInputElement("number");
  input.value = "50";

  const detach = attachAdjustDispatchToElement(input, "pipette_1", (e) =>
    events.push(e),
  );

  // Simulate Escape key (should be ignored).
  const listeners = input._listeners.get("keydown") || [];
  for (const listener of listeners) {
    listener.call(input, { key: "Escape" } as any);
  }

  assert.equal(events.length, 0);

  detach();
});

test("(o) attachAdjustDispatchToElement supports optional field in commit", () => {
  const events: InteractionEvent[] = [];

  dispatchAdjustCommit(
    { targetId: "pipette_1", value: 100, field: "set_volume" },
    (e) => events.push(e),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]!.value, 100);
  // Note: field is not carried through to InteractionEvent by dispatchAdjustCommit,
  // so we just verify the core value is emitted correctly.
});
