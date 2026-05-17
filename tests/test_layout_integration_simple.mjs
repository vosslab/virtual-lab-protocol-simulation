/**
 * tests/test_layout_integration_simple.mjs
 *
 * Simple Node.js test for layout integration (ESM, no tsconfig).
 * Tests that computeSceneLayout can be imported and called.
 *
 * Run with: node tests/test_layout_integration_simple.mjs
 */

import assert from 'assert';

// Test imports work
console.log('Testing imports...');

try {
	// This will fail at import time if there are syntax/type errors
	const { computeSceneLayout } = await import('../src/scene_runtime/layout/index.ts');
	console.log('Layout module imported successfully');
	console.log('computeSceneLayout:', typeof computeSceneLayout);

	// Quick sanity check: the function should be callable
	assert(typeof computeSceneLayout === 'function', 'computeSceneLayout is not a function');

	console.log('All basic tests passed!');
	process.exit(0);
} catch (err) {
	console.error('Test failed:', err);
	process.exit(1);
}
