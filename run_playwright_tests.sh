#!/usr/bin/env bash
# run_playwright_tests.sh - run the browser-driven walker sweep.
#
# Front door: run this directly as ./run_playwright_tests.sh. It mirrors the
# npm run test:playwright alias.
#
# Contract:
#   - Requires node and npm on PATH.
#   - Requires node_modules/ to be installed (npm install).
#   - Drives the real walker: the playwright-library sweep script
#     tests/playwright/e2e/walk_all_protocols.mjs, which spawns the
#     single-protocol schema-driven walker (protocol_walkthrough_yaml.mjs)
#     once per discovered content/protocols/**/protocol.yaml. This is the
#     same script the npm run walk:all alias points at.
#   - The sweep serves dist/ over a local port itself; it does not use
#     playwright.config.ts or the @playwright/test runner. Build dist/
#     first (or pass --build) so the sweep has a bundle to serve.
#   - Pass --build to force a rebuild of dist/ even when it already exists.
#   - Remaining arguments are forwarded to the sweep script.
#   - Exits with the sweep script's exit code.
#   - Prints a clear PASS or FAIL line on completion.
#
# Flags:
#   -h, --help    Print usage and exit 0.
#   --build       Force rebuild of dist/ before running the sweep.
#
# Examples:
#   bash run_playwright_tests.sh
#   bash run_playwright_tests.sh --build

set -euo pipefail

# Usage
usage() {
	cat <<'USAGE'
Usage: run_playwright_tests.sh [-h|--help] [--build] [SWEEP_ARGS...]

  -h, --help    Print this help and exit 0.
  --build       Force a dist/ rebuild before running the sweep.

Any remaining arguments are forwarded to the walker sweep script.
USAGE
}

# Parse script-level flags; collect the rest for the sweep script.
FORCE_BUILD=0
SWEEP_ARGS=()

while [ "$#" -gt 0 ]; do
	case "$1" in
		-h|--help)
			usage
			exit 0
			;;
		--build)
			FORCE_BUILD=1
			shift
			;;
		*)
			SWEEP_ARGS+=("$1")
			shift
			;;
	esac
done

cd "$(git rev-parse --show-toplevel)"

# Preflight: ensure required tools and project state are present.
if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node not found on PATH. Install Node.js first." >&2
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm not found on PATH. Install Node.js first." >&2
	exit 1
fi

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules/ missing. Run 'npm install' first." >&2
	exit 1
fi

SWEEP_SCRIPT="tests/playwright/e2e/walk_all_protocols.mjs"
if [ ! -f "$SWEEP_SCRIPT" ]; then
	echo "ERROR: sweep script not found at $SWEEP_SCRIPT." >&2
	exit 1
fi

# Build gate: rebuild dist/ when forced or when expected outputs are missing.
if [ "$FORCE_BUILD" -eq 1 ]; then
	echo "==> --build flag set: rebuilding dist/..."
	bash build_github_pages.sh
elif [ ! -f dist/index.html ] || [ ! -f dist/protocol_host.js ]; then
	echo "==> dist/index.html or dist/protocol_host.js missing: running build_github_pages.sh..."
	bash build_github_pages.sh
fi

# Run the walker sweep; capture exit code so we can print the summary line.
# ${arr[@]+...} expands to nothing when the array is empty under set -u (bash 3.2 safe).
echo "==> node $SWEEP_SCRIPT ${SWEEP_ARGS[*]+"${SWEEP_ARGS[*]}"}"
SWEEP_EXIT=0
set +e  # allow the sweep to exit non-zero; captured in SWEEP_EXIT below
node "$SWEEP_SCRIPT" ${SWEEP_ARGS[@]+"${SWEEP_ARGS[@]}"}
SWEEP_EXIT=$?
set -e  # re-enable exit-on-error

# Summary line.
if [ "$SWEEP_EXIT" -eq 0 ]; then
	echo "PASS: walker sweep passed."
else
	echo "FAIL: walker sweep failed (exit code $SWEEP_EXIT)."
fi

exit "$SWEEP_EXIT"
