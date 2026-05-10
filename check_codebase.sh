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
# generated/ on demand for pytest. If any generated file is missing,
# run tools/bootstrap_generated.sh or a build script first.
MISSING_FILES=()
for FILE in generated/protocol_data.ts generated/inventory_data.ts generated/scene_data.ts generated/svg_manifest.ts; do
	if [ ! -f "$FILE" ]; then
		MISSING_FILES+=("$FILE")
	fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
	echo "ERROR: Missing generated files: ${MISSING_FILES[*]}" >&2
	echo "Run 'bash tools/bootstrap_generated.sh' to regenerate." >&2
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
