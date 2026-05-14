#!/usr/bin/env bash
# build_test_fixture.sh - Build adapter bundles for test fixtures.
#
# Usage:
#   bash tools/build_test_fixture.sh <fixture_name>
#
# Example:
#   bash tools/build_test_fixture.sh plate_drug_treatment_real
#
# Output:
#   tests/playwright/fixtures/<fixture_name>/adapter.js
#   tests/playwright/fixtures/<fixture_name>/runtime.js

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [ -z "${1:-}" ]; then
	echo "Usage: bash tools/build_test_fixture.sh <fixture_name>"
	exit 2
fi

FIXTURE_NAME="$1"
FIXTURE_DIR="tests/playwright/fixtures/$FIXTURE_NAME"

if [ ! -d "$FIXTURE_DIR" ]; then
	echo "Error: Fixture directory not found: $FIXTURE_DIR"
	exit 1
fi

# Ensure the fixture has TypeScript entry files to bundle
# For now, we'll create the adapter bundle that the fixture can import

# Bundle the adapter and all its dependencies
# Target: esm format for modern browsers, browser platform
npx esbuild "src/scene_runtime/adapters/well_plate/index.ts" \
	--bundle \
	--format=esm \
	--target=es2020 \
	--platform=browser \
	--external:fs \
	--external:path \
	--outfile="$FIXTURE_DIR/adapter.js"

# Wrap the ES module exports in a global for file:// protocol compatibility
# The fixture loads this via <script> tag which doesn't support ES modules on file://
ADAPTER_JS="$FIXTURE_DIR/adapter.js"
WRAPPED_JS="$FIXTURE_DIR/adapter-wrapped.js"

# Replace the ES6 export statement with a global assignment
sed 's/^export {$/window.adapterExports = {/' "$ADAPTER_JS" | sed 's/^};$/};/' > "$WRAPPED_JS"

echo "Built fixture adapter: $ADAPTER_JS"
echo "Built wrapped adapter for file:// protocol: $WRAPPED_JS"
