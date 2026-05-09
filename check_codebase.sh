#!/usr/bin/env bash
# check_codebase.sh - type-check src/ and run smoke tests.
#
# Type checks src/ via the strict tsconfig and (when present) runs the
# Playwright smoke test against the bundled dist/ output.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

# check_codebase.sh is read-only by design. It does NOT regenerate
# generated/ artifacts; build scripts (build_github_pages.sh,
# export_single_file.sh) own that, and tests/conftest.py bootstraps
# generated/ on demand for pytest. If generated/svg_manifest.ts is
# missing here, run a build script or pytest first.
if [ ! -f generated/svg_manifest.ts ]; then
	echo "ERROR: generated/svg_manifest.ts missing." >&2
	echo "Run 'python3 tools/generate_svg_globals.py' or a build script first." >&2
	exit 1
fi

echo "Type-checking src/ ..."
npx tsc --noEmit -p src/tsconfig.json

# SVG pipeline health gate (M6): determinism + coverage of the SVG generator.
# Read-only by design -- runs the generator into two tempdirs and diffs them,
# never writes to the production generated/ tree. See
# tools/check_svg_pipeline.py for details.
echo "Checking SVG pipeline (determinism + coverage) ..."
python3 tools/check_svg_pipeline.py

echo "All checks passed."
echo "(Run 'node tests/playwright/test_game_ui.mjs' separately for the browser smoke.)"
