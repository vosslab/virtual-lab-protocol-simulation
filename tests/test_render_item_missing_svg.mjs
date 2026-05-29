// Tests for the missing_svg placeholder path in render_item.ts.
// Verifies that a ComputedItem with missing_svg: true yields a placeholder
// element with the correct attributes and no injected SVG, and that a normal
// item (missing_svg absent) still renders a real SVG element.
//
// renderItem calls document.createElement and element.style / setAttribute.
// Node has no browser DOM, so we install a minimal stub BEFORE importing the
// module. The stub tracks attributes and appendChild so we can assert on them.
//
// Run via:
//   node --import tsx --test tests/test_render_item_missing_svg.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

//============================================
// Minimal DOM stubs
// Must be installed before the module import so renderItem sees them.
//============================================

class StubStyle {
  constructor() {
    this._props = {};
  }
  set position(v) {
    this._props.position = v;
  }
  get position() {
    return this._props.position ?? "";
  }
  set left(v) {
    this._props.left = v;
  }
  get left() {
    return this._props.left ?? "";
  }
  set top(v) {
    this._props.top = v;
  }
  get top() {
    return this._props.top ?? "";
  }
  set width(v) {
    this._props.width = v;
  }
  get width() {
    return this._props.width ?? "";
  }
  set height(v) {
    this._props.height = v;
  }
  get height() {
    return this._props.height ?? "";
  }
  set zIndex(v) {
    this._props.zIndex = v;
  }
  get zIndex() {
    return this._props.zIndex ?? "";
  }
  // Placeholder-specific style props
  set boxSizing(v) {
    this._props.boxSizing = v;
  }
  get boxSizing() {
    return this._props.boxSizing ?? "";
  }
  set border(v) {
    this._props.border = v;
  }
  get border() {
    return this._props.border ?? "";
  }
  set backgroundColor(v) {
    this._props.backgroundColor = v;
  }
  get backgroundColor() {
    return this._props.backgroundColor ?? "";
  }
  set display(v) {
    this._props.display = v;
  }
  get display() {
    return this._props.display ?? "";
  }
  set alignItems(v) {
    this._props.alignItems = v;
  }
  get alignItems() {
    return this._props.alignItems ?? "";
  }
  set justifyContent(v) {
    this._props.justifyContent = v;
  }
  get justifyContent() {
    return this._props.justifyContent ?? "";
  }
  set overflow(v) {
    this._props.overflow = v;
  }
  get overflow() {
    return this._props.overflow ?? "";
  }
  // span label styles
  set fontSize(v) {
    this._props.fontSize = v;
  }
  get fontSize() {
    return this._props.fontSize ?? "";
  }
  set fontFamily(v) {
    this._props.fontFamily = v;
  }
  get fontFamily() {
    return this._props.fontFamily ?? "";
  }
  set color(v) {
    this._props.color = v;
  }
  get color() {
    return this._props.color ?? "";
  }
  set textAlign(v) {
    this._props.textAlign = v;
  }
  get textAlign() {
    return this._props.textAlign ?? "";
  }
  set padding(v) {
    this._props.padding = v;
  }
  get padding() {
    return this._props.padding ?? "";
  }
  set pointerEvents(v) {
    this._props.pointerEvents = v;
  }
  get pointerEvents() {
    return this._props.pointerEvents ?? "";
  }
  set whiteSpace(v) {
    this._props.whiteSpace = v;
  }
  get whiteSpace() {
    return this._props.whiteSpace ?? "";
  }
}

class StubElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.style = new StubStyle();
    this._attrs = new Map();
    this.children = [];
    this.textContent = "";
    this.innerHTML = "";
  }
  setAttribute(name, value) {
    this._attrs.set(name, value);
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  appendChild(child) {
    this.children.push(child);
    // Propagate child textContent upward for assertions.
    this.textContent = this.textContent + child.textContent;
    return child;
  }
  // querySelectorAll("svg") is used by the SVG-presence check.
  querySelectorAll(selector) {
    if (selector === "svg") {
      // Collect all <SVG> children recursively.
      const results = [];
      const walk = (el) => {
        if (el.tagName === "SVG") results.push(el);
        for (const c of el.children) walk(c);
      };
      for (const c of this.children) walk(c);
      // innerHTML contains injected SVG markup -- if non-empty, treat as one SVG.
      if (this.innerHTML && this.innerHTML.includes("<svg")) results.push(this);
      return results;
    }
    return [];
  }
}

class StubDocument {
  createElement(tagName) {
    return new StubElement(tagName);
  }
}

// Install before importing so renderItem sees the stub document.
globalThis.document = new StubDocument();

//============================================
// Now import the module under test
//============================================

const { renderItem } = await import("../src/scene_runtime/renderer/render_item.ts");

//============================================
// Helpers: minimal ComputedItem shapes
//============================================

function makeMissingItem(overrides = {}) {
  // Minimal ComputedItem with missing_svg: true.
  // The asset name is intentionally not in the SVG registry.
  return {
    placement_name: "test_placement",
    object_name: "test_missing_svg_target",
    zone: "center",
    kind: "equipment",
    asset: "test_nonexistent_svg_asset_for_smoke",
    depth: "mid",
    label: "Test Missing SVG Target",
    capabilities: ["clickable"],
    layout: {
      default_width: 10,
      label_width: 8,
      anchor_y: "bottom",
      anchor_y_offset: 0,
      width_scale: 1.0,
      fudge: 1.0,
    },
    _x: 30,
    _top: 30,
    _visualWidth: 10,
    _height: 15,
    _footprint: 10,
    _labelX: 35,
    _labelY: 48,
    _labelLines: ["Test Missing SVG Target"],
    _scale: 1.0,
    _y: 30,
    _width_scale: 1.0,
    _scale_source: "default",
    _px_per_cm: null,
    // The flag that triggers the placeholder path.
    missing_svg: true,
    ...overrides,
  };
}

function makeRealItem(overrides = {}) {
  // Minimal ComputedItem referencing a real asset (vortex is in the SVG registry).
  return {
    placement_name: "vortex_placement",
    object_name: "vortex",
    zone: "work_surface",
    kind: "equipment",
    asset: "vortex",
    depth: "mid",
    label: "Vortex",
    capabilities: ["clickable"],
    layout: {
      default_width: 10,
      label_width: 8,
      anchor_y: "bottom",
      anchor_y_offset: 0,
      width_scale: 1.0,
      fudge: 1.0,
    },
    _x: 10,
    _top: 10,
    _visualWidth: 12,
    _height: 25.4,
    _footprint: 12,
    _labelX: 16,
    _labelY: 38,
    _labelLines: ["Vortex"],
    _scale: 1.0,
    _y: 10,
    _width_scale: 1.0,
    _scale_source: "default",
    _px_per_cm: null,
    // missing_svg absent (normal item)
    ...overrides,
  };
}

//============================================
// Tests: missing_svg placeholder path
//============================================

test("missing_svg item: element has data-missing-svg='true'", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-missing-svg"), "true");
});

test("missing_svg item: element has data-item-id matching object_name", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-item-id"), "test_missing_svg_target");
});

test("missing_svg item: element has data-placement-name", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-placement-name"), "test_placement");
});

test("missing_svg item: element textContent contains object_name", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  const text = el.textContent ?? "";
  assert.ok(
    text.includes("test_missing_svg_target"),
    `Expected object_name in textContent, got: "${text}"`,
  );
});

test("missing_svg item: element does NOT contain an injected SVG element", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  // innerHTML stays empty for placeholder elements (no injectSvgInto call).
  const svgHits = el.querySelectorAll("svg");
  assert.equal(svgHits.length, 0, "Placeholder must not contain an injected SVG");
});

test("missing_svg item: element is positioned absolutely with percent units", () => {
  const item = makeMissingItem();
  const el = renderItem(item);
  assert.equal(el.style.position, "absolute");
  assert.ok(el.style.left.endsWith("%"), `left must be percent, got: ${el.style.left}`);
  assert.ok(el.style.top.endsWith("%"), `top must be percent, got: ${el.style.top}`);
});

//============================================
// Tests: missing-object placeholder kind distinction
// A placement whose object is absent from OBJECT_LIBRARY is bound with
// missing_svg: true AND _missing_object: true (see bind_objects.ts). The
// renderer must mark it data-placeholder-kind="missing-object" so stats and
// the DOM can distinguish it from a missing-art (missing-svg) placeholder.
//============================================

test("missing-object item: data-placeholder-kind is 'missing-object'", () => {
  const item = makeMissingItem({ _missing_object: true });
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-placeholder-kind"), "missing-object");
});

test("missing-object item: still carries data-missing-svg='true' for back-compat", () => {
  const item = makeMissingItem({ _missing_object: true });
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-missing-svg"), "true");
});

test("missing-object item: label text includes 'MISSING OBJECT' cause", () => {
  const item = makeMissingItem({ _missing_object: true });
  const el = renderItem(item);
  const text = el.textContent ?? "";
  assert.ok(text.includes("MISSING OBJECT"), `Expected MISSING OBJECT cause, got: "${text}"`);
});

test("missing-svg (not missing-object) item: data-placeholder-kind is 'missing-svg'", () => {
  // _missing_object absent -> the object exists but its SVG art is absent.
  const item = makeMissingItem();
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-placeholder-kind"), "missing-svg");
});

//============================================
// Tests: normal item (no missing_svg)
//============================================

test("normal item: element does NOT have data-missing-svg attribute", () => {
  const item = makeRealItem();
  const el = renderItem(item);
  // data-missing-svg must be absent on real items.
  assert.equal(
    el.getAttribute("data-missing-svg"),
    null,
    "Normal item must not carry data-missing-svg",
  );
});

test("normal item: element has data-item-id matching object_name", () => {
  const item = makeRealItem();
  const el = renderItem(item);
  assert.equal(el.getAttribute("data-item-id"), "vortex");
});

test("normal item: element contains an injected SVG (innerHTML non-empty)", () => {
  const item = makeRealItem();
  const el = renderItem(item);
  // injectSvgInto sets innerHTML; non-empty means SVG was injected.
  assert.ok(el.innerHTML.length > 0, "Normal item must have SVG injected via innerHTML");
});
