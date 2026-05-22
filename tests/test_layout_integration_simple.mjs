/**
 * tests/test_layout_integration_simple.mjs
 *
 * Simple Node.js test for layout integration.
 * Tests that computeSceneLayout can be imported and called.
 *
 * Run with: node --test tests/test_layout_integration_simple.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { importTsModule } from "./_compile_for_test.mjs";

test("layout/index exports computeSceneLayout", async () => {
  const mod = await importTsModule("src/scene_runtime/layout/index.ts");
  assert.equal(
    typeof mod.computeSceneLayout,
    "function",
    "computeSceneLayout is not a function",
  );
});
