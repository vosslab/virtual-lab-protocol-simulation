#!/usr/bin/env bash
# walkthrough.sh - build the game and run the browser smoke walkthrough.
#
# Top-level driver: calls build_github_pages.sh to produce dist/, then
# runs the Playwright smoke at devel/test_game_ui.mjs from the repo
# root (the script must run from the repo root so its `import 'playwright'`
# resolves against ./node_modules -- see docs/PLAYWRIGHT_USAGE.md).
#
# Exit codes:
#   0  build green AND smoke passed all gates
#   1  build failed
#   2  smoke failed
#
# Prereqs (one-time):
#   npm install
#   npx playwright install chromium

set -e

cd "$(git rev-parse --show-toplevel)"

if [ ! -d node_modules ]; then
	echo "node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

if [ ! -d ~/Library/Caches/ms-playwright ] && [ ! -d ~/.cache/ms-playwright ]; then
	echo "Playwright browsers may be missing. If the smoke fails to launch chromium," >&2
	echo "run 'npx playwright install chromium' and retry." >&2
fi

echo "==> Building dist/ ..."
if ! ./build_github_pages.sh; then
	echo "BUILD FAILED" >&2
	exit 1
fi

echo
echo "==> Running browser walkthrough ..."
if ! node devel/test_game_ui.mjs; then
	echo "WALKTHROUGH FAILED" >&2
	exit 2
fi

echo
echo "All gates passed. Screenshot: test-results/test_game_ui.png"
