#!/usr/bin/env bash
# check_codebase.sh - orchestrator over npm scripts for codebase checks.
#
# Runs (in order):
#   1. TypeScript typecheck via tsconfig.json (src/).
#   2. Wider typecheck via tsconfig.lint.json if present (tests/, tools/).
#   3. ESLint (zero warnings).
#   4. Prettier --check.
#   5. Node unit tests under tests/ (node --test tests/test_*.mjs).
#   6. Production build (npm run build), with post-build artifact checks
#      on dist/index.html, dist/main.js, and dist/style.css (when
#      src/style.css existed at the start of the run).
#
# Playwright (browser walkthroughs) is intentionally NOT part of this
# gate; this script checks the codebase only. Run Playwright manually
# via `npm run test:playwright` after `bash run_web_server.sh`.
#
# All steps are invoked via 'npm run --silent <name>' so package.json
# remains the single source of truth for what each check does.
#
# Flags:
#   --fast              Skip the build step (inner-loop iteration).
#   -h, --help          Print usage and exit 0.
#
# A per-run summary is printed on exit (after preflight succeeds) listing
# PASS / FAIL / SKIP for each step. Exit code is 0 only when no step
# failed; preflight failures exit non-zero without a summary.

set -euo pipefail

# Usage
usage() {
	cat <<'USAGE'
Usage: check_codebase.sh [--fast] [-h|--help]

  --fast              Skip the build step (inner-loop iteration).
  -h, --help          Print this help and exit 0.

All steps are invoked via 'npm run --silent <name>'; package.json is
the source of truth for each check.
USAGE
}

# Parse flags
FAST=0
while [ "$#" -gt 0 ]; do
	case "$1" in
		--fast)
			FAST=1
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "ERROR: unknown flag: $1" >&2
			usage >&2
			exit 2
			;;
	esac
done

# Preflight (no summary on failure)
cd "$(git rev-parse --show-toplevel)"

if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node not found on PATH." >&2
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm not found on PATH." >&2
	exit 1
fi

echo "node $(node --version), npm $(npm --version)"

if [ ! -f package.json ]; then
	echo "ERROR: package.json missing." >&2
	exit 1
fi

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

if [ ! -f package-lock.json ]; then
	echo "WARN: package-lock.json missing; npm install will not produce a reproducible install." >&2
fi

# Capture whether src/style.css existed at the start of the run; this
# governs whether the post-build artifact check requires dist/style.css.
HAS_STYLE_CSS=0
if [ -f src/style.css ]; then
	HAS_STYLE_CSS=1
fi

# Step tracking (bash 3.2 compatible)
STEP_NAMES=()
STEP_STATUS=()
STEP_NOTES=()
SUMMARY_ENABLED=0

# step_record <name> <status> [note]
step_record() {
	STEP_NAMES+=("$1")
	STEP_STATUS+=("$2")
	if [ "$#" -ge 3 ]; then
		STEP_NOTES+=("$3")
	else
		STEP_NOTES+=("")
	fi
}

# step_skip <name> <reason>
step_skip() {
	local name="$1"
	local reason="$2"
	echo "==> SKIP $name ($reason)"
	step_record "$name" "SKIP" "$reason"
}

# require_script <name>
# Verifies that the named npm script exists in package.json. The script name
# is passed via env var, not interpolated into the JS source, so names that
# contain quotes or other JS metachars cannot break the probe.
require_script() {
	local name="$1"
	NAME="$name" node -e "process.exit(((require('./package.json').scripts)||{})[process.env.NAME] ? 0 : 1)" \
		|| { echo "ERROR: npm script '$name' missing in package.json." >&2; exit 1; }
}

# step_run <name>
# Runs 'npm run --silent <name>' after verifying the script exists.
# Records PASS or FAIL+summary+exit 1.
step_run() {
	local name="$1"
	echo "==> $name"
	require_script "$name"
	local rc=0
	set +e
	npm run --silent "$name"
	rc=$?
	set -e
	if [ "$rc" -eq 0 ]; then
		step_record "$name" "PASS"
	else
		step_record "$name" "FAIL"
		print_summary
		trap - EXIT
		exit 1
	fi
}

# Summary
print_summary() {
	if [ "$SUMMARY_ENABLED" != "1" ]; then
		return 0
	fi
	local total=${#STEP_NAMES[@]}
	local failed=0
	local i=0
	echo "Summary:"
	while [ "$i" -lt "$total" ]; do
		local name="${STEP_NAMES[$i]}"
		local status="${STEP_STATUS[$i]}"
		local note="${STEP_NOTES[$i]}"
		if [ "$status" = "FAIL" ]; then
			failed=$((failed + 1))
		fi
		if [ "$status" = "SKIP" ] && [ -n "$note" ]; then
			echo "  [$status] $name ($note)"
		else
			echo "  [$status] $name"
		fi
		i=$((i + 1))
	done
	if [ "$failed" -eq 0 ]; then
		echo "PASS: $total checks passed."
	else
		echo "FAIL: $failed of $total checks failed."
	fi
}

trap print_summary EXIT

# Steps
SUMMARY_ENABLED=1

# 1. typecheck (always)
step_run typecheck

# 2. typecheck:lint only if tsconfig.lint.json exists
if [ -f tsconfig.lint.json ]; then
	step_run typecheck:lint
else
	step_skip typecheck:lint "tsconfig.lint.json not present"
fi

# 3. lint
step_run lint

# 4. format:check
step_run format:check

# 5. test:node
step_run test:node

# 6. build (with post-build artifact checks)
if [ "$FAST" = "1" ]; then
	step_skip build "--fast"
else
	echo "==> build"
	require_script build
	build_rc=0
	set +e
	npm run --silent build
	build_rc=$?
	set -e
	if [ "$build_rc" -ne 0 ]; then
		step_record build "FAIL"
		print_summary
		trap - EXIT
		exit 1
	fi
	# Post-build artifact checks. Required: dist/index.html, dist/main.js.
	# Conditionally required: dist/style.css when src/style.css existed
	# at the start of the run.
	artifact_ok=1
	for required in dist/index.html dist/main.js; do
		if [ ! -f "$required" ]; then
			echo "ERROR: missing build artifact: $required" >&2
			artifact_ok=0
		fi
	done
	if [ "$HAS_STYLE_CSS" = "1" ] && [ ! -f dist/style.css ]; then
		echo "ERROR: missing build artifact: dist/style.css" >&2
		artifact_ok=0
	fi
	if [ "$artifact_ok" = "1" ]; then
		step_record build "PASS"
	else
		step_record build "FAIL"
		print_summary
		trap - EXIT
		exit 1
	fi
fi

# All steps complete; summary prints via EXIT trap. Exit 0 (no failures
# reach here -- failure paths exit 1 directly).
exit 0
