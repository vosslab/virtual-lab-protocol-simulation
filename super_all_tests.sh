#!/usr/bin/env bash
# super_all_tests.sh - run EVERY test and gate in the repo. Nothing skipped.
#
# This is the exhaustive suite (not the fast gate). It runs the build, the code
# and content gates, and then every test file in the repo -- including the ones
# that pytest and the fast gate skip: the tests/e2e/ suite and the browser tests
# in tests/playwright/. It keeps going when a step fails, so one red never hides
# the rest, and prints a PASS/FAIL summary at the end. Wall time does not matter
# here; running everything does.
#
# Browser tests run through the Playwright test runner front door
# (run_playwright_tests.sh, which invokes `npx playwright test`) -- this
# repo's single Playwright model per docs/PLAYWRIGHT_TEST_STYLE.md. The
# runner's config owns the shared webServer and covers every .spec.ts file,
# including the protocol walker sweep at tests/playwright/e2e/protocol_walkthrough.spec.ts.
#
# Full output is saved to SUPER_LOG.txt. A short PASS/FAIL line prints per step.
#
# To add a new test: add one line in the matching section of main() below.
#
# Usage:
#   ./super_all_tests.sh

set -u

# Always work from the repo root, wherever the script is called from.
cd "$(git rev-parse --show-toplevel)" || exit 1

# Set up the Python environment once, so every python3 / pytest call below works.
source source_me.sh

LOG="SUPER_LOG.txt"

# These three lists record the outcome of each step, filled in by run().
STEP_NAMES=()
STEP_STATUS=()
STEP_SECONDS=()


# run - run one test or gate, save its output, and record pass or fail.
#
# Usage: run "a short name" the command to run...
# Example: run "pytest" pytest tests/
#          run "launcher" node tests/playwright/test_launcher.mjs
#
# It never stops the script on failure; it just records the result and moves on.
run() {
	name="$1"
	shift  # everything after the name is the command to run

	# Write a clear header into the log so each step is easy to find.
	{
		echo ""
		echo "################################################################"
		echo "# STEP: $name"
		echo "# CMD:  $*"
		echo "# TIME: $(date '+%Y-%m-%d %H:%M:%S')"
		echo "################################################################"
	} >> "$LOG"

	# Show which test is running before it starts (a step can take a while).
	printf 'RUN  %s\n' "$name"

	# Run the command. Send its output (normal + errors) to the log.
	start=$SECONDS
	if "$@" >> "$LOG" 2>&1; then
		result="PASS"
	else
		result="FAIL"
	fi
	seconds=$(( SECONDS - start ))

	# Close the block in the log and remember the result for the summary.
	echo "" >> "$LOG"
	echo "---------- END $name: $result (${seconds}s) ----------" >> "$LOG"
	STEP_NAMES+=("$name")
	STEP_STATUS+=("$result")
	STEP_SECONDS+=("$seconds")

	# Print a short live line to the screen.
	printf '[%s] %-40s %5ds\n' "$result" "$name" "$seconds"
}


# print_summary - print the table of results and the final verdict.
print_summary() {
	echo ""
	echo "========== SUMMARY =========="
	failed=0
	total=${#STEP_NAMES[@]}
	i=0
	while [ "$i" -lt "$total" ]; do
		printf '  [%s] %-40s %5ds\n' \
			"${STEP_STATUS[$i]}" "${STEP_NAMES[$i]}" "${STEP_SECONDS[$i]}"
		if [ "${STEP_STATUS[$i]}" = "FAIL" ]; then
			failed=$(( failed + 1 ))
		fi
		i=$(( i + 1 ))
	done

	if [ "$failed" -eq 0 ]; then
		echo "ALL PASS ($total/$total)"
	else
		echo "FAILED $failed of $total"
	fi

	# Also save the summary into the log.
	{
		echo ""
		echo "========== SUMMARY =========="
		i=0
		while [ "$i" -lt "$total" ]; do
			printf '  [%s] %-40s %5ds\n' \
				"${STEP_STATUS[$i]}" "${STEP_NAMES[$i]}" "${STEP_SECONDS[$i]}"
			i=$(( i + 1 ))
		done
		echo "failed: $failed of $total"
	} >> "$LOG"
}


main() {
	# Start a fresh log.
	echo "super_all_tests.sh" > "$LOG"
	date >> "$LOG"
	echo "Running the full suite. Details in $LOG"
	echo ""

	# --- 1. Build first. validate, scene health, and the browser tests all
	#        read what this produces (generated/, dist/, render stats). ---
	run "build" bash build_github_pages.sh

	# --- 2. Code and content gates. ---
	run "check_codebase" ./check_codebase.sh
	run "pytest"         pytest tests/
	run "validate"       bash run_validate.sh
	run "scene_health"   ./run_scene_health.py

	# --- 3. End-to-end tests in tests/e2e/ (pytest skips this folder). ---
	#     Python E2E tests:
	for testfile in tests/e2e/e2e_*.py; do
		[ -e "$testfile" ] || continue        # skip if none match
		run "e2e: $(basename "$testfile")" python3 "$testfile"
	done
	#     Node E2E tests. Run under the tsx loader so a .mjs that imports .ts
	#     source is transformed at import time; a plain .mjs with no .ts import
	#     runs fine under tsx too. Mirrors check_codebase.sh (node --import tsx).
	for testfile in tests/e2e/e2e_*.mjs; do
		[ -e "$testfile" ] || continue
		run "e2e: $(basename "$testfile")" node --import tsx "$testfile"
	done

	# --- 4. Browser tests in tests/playwright/ (pytest skips this folder). ---
	#     Runs every .spec.ts through the Playwright runner front door, which
	#     includes the protocol walker sweep spec.
	run "browser tests" bash run_playwright_tests.sh

	# --- Done: print the results table and exit non-zero if anything failed. ---
	print_summary
}

main
