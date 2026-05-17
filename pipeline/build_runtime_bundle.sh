#!/usr/bin/env bash

#
# pipeline/build_runtime_bundle.sh
#
# esbuild invocation: bundles src/scene_runtime/bundle/entry.ts into dist/runtime.bundle.js.
#
# Usage: bash pipeline/build_runtime_bundle.sh
# Exit code: 0 on success, nonzero on failure.
# Output: dist/runtime.bundle.js and dist/runtime.bundle.js.map
#

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENTRY_FILE="src/scene_runtime/bundle/entry.ts"
OUTPUT_FILE="dist/runtime.bundle.js"

if [ ! -f "$ENTRY_FILE" ]; then
	echo "ERROR: entry file not found: $ENTRY_FILE"
	exit 1
fi

# Ensure dist directory exists.
mkdir -p dist

# Run esbuild to bundle and minify.
# Flags:
#   --bundle: bundle all dependencies into a single file
#   --format=iife: output as Immediately-Invoked Function Expression
#   --global-name: expose the bundle as a global SceneRuntime object
#   --outfile: output path
#   --sourcemap: generate source map for debugging
#   --target=es2020: target modern JavaScript
echo "Building runtime bundle..."
npx esbuild "$ENTRY_FILE" \
	--bundle \
	--format=iife \
	--global-name=SceneRuntime \
	--outfile="$OUTPUT_FILE" \
	--sourcemap \
	--target=es2020

if [ ! -f "$OUTPUT_FILE" ]; then
	echo "ERROR: bundle output not found: $OUTPUT_FILE"
	exit 1
fi

# Report success.
BUNDLE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "?")
echo "SUCCESS: $OUTPUT_FILE ($BUNDLE_SIZE bytes)"
exit 0
