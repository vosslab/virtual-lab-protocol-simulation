// tests/test_material_color.mjs
//
// Resolver-contract tests for material_color.ts (WP-COLOR). These are PURE
// function tests: they call resolve_color_result directly and never render a
// Solid component. They lock the D3 ColorResult contract from
// docs/specs/MATERIAL_CONVENTION.md "Color resolver behavior":
//
//   empty sentinel / no material field   -> { ok: true, color: null }
//   built-in `mixed`                     -> { ok: true, color: "#686868" }
//   registry-backed valid scalar         -> { ok: true, color: "#rrggbb" }
//   non-sentinel absent from registry     -> { ok: false, reason }
//   registry-backed invalid/missing hex   -> { ok: false, reason }
//   null registry (no protocol context)   -> { ok: true, color: null }
//
// `empty` is the ONLY name that resolves to null before the registry lookup.
// A registry-backed name (cells, formazan, the waste_* streams) is NOT a
// sentinel here: with a registry that registers it, it resolves to its
// authored display_color; only a null registry yields a no-color success.
//
// Run with:
//   node --import tsx --test tests/test_material_color.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resolve_color_result } from "../src/scene_runtime/renderer/material_color.ts";

//============================================
// Fixture registry (scalar display_color)
//============================================

const REGISTRY = {
  pbs: { label: "1x PBS", display_color: "#076dad" },
  media: { label: "Growth media", display_color: "#6c6c00" },
  cells: { label: "Cells", display_color: "#cc0066" },
  bad_hex: { label: "Malformed", display_color: "not-a-color" },
  short_hex: { label: "Three-digit", display_color: "#fff" },
  upper_hex: { label: "Uppercase", display_color: "#ABCDEF" },
};

//============================================
// ok: true, color: null (no-fill successes)
//============================================

describe("no-fill successes resolve to ok/null", () => {
  test("no material field (null name) -> ok, null", () => {
    const r = resolve_color_result(null, REGISTRY);
    assert.deepEqual(r, { ok: true, color: null });
  });

  test("empty sentinel -> ok, null", () => {
    const r = resolve_color_result("empty", REGISTRY);
    assert.deepEqual(r, { ok: true, color: null });
  });

  // `cells` is a registry-backed visible material, NOT a sentinel. With a null
  // registry (no protocol material context) it surfaces as a no-color success.
  test("registry-backed name (cells) with null registry -> ok, null", () => {
    const r = resolve_color_result("cells", null);
    assert.deepEqual(r, { ok: true, color: null });
  });
});

//============================================
// ok: true, color: scalar (built-in + registry)
//============================================

describe("color successes resolve to ok/scalar", () => {
  test("built-in mixed -> ok, #686868 (resolver-produced, not registry)", () => {
    const r = resolve_color_result("mixed", REGISTRY);
    assert.deepEqual(r, { ok: true, color: "#686868" });
  });

  test("mixed resolves to the built-in even with a null registry", () => {
    const r = resolve_color_result("mixed", null);
    assert.deepEqual(r, { ok: true, color: "#686868" });
  });

  test("registry-backed valid scalar -> ok, that scalar", () => {
    const r = resolve_color_result("pbs", REGISTRY);
    assert.deepEqual(r, { ok: true, color: "#076dad" });
  });

  // Regression: a registry-backed visible material formerly hardcoded into the
  // sentinel set (cells) must resolve to its authored color through the
  // provided-registry path, NOT to null. This is the D2/D3 correctness fix.
  test("registry-backed cells -> ok, its registered color (not null)", () => {
    const r = resolve_color_result("cells", REGISTRY);
    assert.deepEqual(r, { ok: true, color: "#cc0066" });
  });

  // Boundary: any registered material resolves to its color, not null, when a
  // registry is provided.
  test("a registered material resolves to its color through the registry path", () => {
    const r = resolve_color_result("media", REGISTRY);
    assert.deepEqual(r, { ok: true, color: "#6c6c00" });
  });
});

//============================================
// ok: false (content defects routed to degrade path)
//============================================

describe("failures resolve to ok:false with a reason", () => {
  test("non-sentinel absent from a provided registry -> not ok", () => {
    const r = resolve_color_result("trypsin", REGISTRY);
    assert.equal(r.ok, false);
    assert.match(r.reason, /not in protocol material registry/);
  });

  test("registry-backed invalid hex -> not ok", () => {
    const r = resolve_color_result("bad_hex", REGISTRY);
    assert.equal(r.ok, false);
    assert.match(r.reason, /invalid display_color/);
  });

  test("registry-backed three-digit hex is rejected (#rrggbb only)", () => {
    const r = resolve_color_result("short_hex", REGISTRY);
    assert.equal(r.ok, false);
    assert.match(r.reason, /invalid display_color/);
  });

  test("registry-backed uppercase hex is rejected (lowercase ^#[0-9a-f]{6}$)", () => {
    const r = resolve_color_result("upper_hex", REGISTRY);
    assert.equal(r.ok, false);
    assert.match(r.reason, /invalid display_color/);
  });
});

//============================================
// null registry (no protocol material context)
//============================================

describe("null registry yields no-color success for non-sentinels", () => {
  test("non-sentinel name with null registry -> ok, null (no color context)", () => {
    const r = resolve_color_result("pbs", null);
    assert.deepEqual(r, { ok: true, color: null });
  });

  test("empty with null registry -> ok, null", () => {
    const r = resolve_color_result("empty", null);
    assert.deepEqual(r, { ok: true, color: null });
  });
});
