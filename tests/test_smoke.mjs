// tests/test_smoke.mjs - minimal smoke test so 'node --test' has at least
// one passing test on a freshly-bootstrapped TS repo. Delete or extend
// once the repo grows its real test suite.
import test from "node:test";
import assert from "node:assert/strict";

test("smoke: node --test runner is wired", () => {
	assert.equal(1 + 1, 2);
});
