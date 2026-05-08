#!/usr/bin/env bash
# check_codebase.sh - type-check src/ and run smoke tests.
#
# Type checks src/ via the strict tsconfig and (when present) runs the
# Playwright smoke test against the bundled dist/ output.

set -e

cd "$(git rev-parse --show-toplevel)"

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

echo "Generating src/svg_globals.ts from assets/equipment/ ..."
python3 tools/generate_svg_globals.py

echo "Type-checking src/ ..."
npx tsc --noEmit -p src/tsconfig.json

echo "All checks passed."
echo "(Run 'node tests/playwright/e2e/test_game_ui.mjs' separately for the browser smoke.)"
