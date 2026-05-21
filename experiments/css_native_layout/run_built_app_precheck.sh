#!/bin/bash
# experiments/css_native_layout/run_built_app_precheck.sh
#
# Wrapper script for NEW2 Task #95: chain build + render_and_dump + precheck
# with sensible defaults for the built-app precheck workflow.
#
# This script:
# 1. Builds the runtime with dev_smoke protocols enabled
# 2. Runs render_and_dump.mjs to export the production runtime's rendered DOM
# 3. Runs precheck.mjs to audit the dumped HTML
#
# Usage:
#   bash experiments/css_native_layout/run_built_app_precheck.sh
#   bash experiments/css_native_layout/run_built_app_precheck.sh --protocol <name> --out <dir>
#
# Defaults:
#   --protocol well_plate_96_zoom_check
#   --out test-results/new1_spike/render_dump

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

PROTOCOL="well_plate_96_zoom_check"
OUT_DIR="test-results/new1_spike/render_dump"

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--protocol)
			PROTOCOL="$2"
			shift 2
			;;
		--out)
			OUT_DIR="$2"
			shift 2
			;;
		*)
			echo "Unknown option: $1"
			echo "Usage: bash experiments/css_native_layout/run_built_app_precheck.sh [--protocol <name>] [--out <dir>]"
			exit 1
			;;
	esac
done

echo "[info] run_built_app_precheck.sh: chaining build + dump + precheck"
echo "[info] Protocol: $PROTOCOL"
echo "[info] Output directory: $OUT_DIR"
echo ""

# Step 1: Build the runtime with dev_smoke protocols
echo "[step 1/3] Building runtime with dev_smoke protocols..."
INCLUDE_DEV_SMOKE=true bash pipeline/build_runtime_bundle.sh
echo "[step 1/3] Build complete."
echo ""

# Step 2: Dump the production runtime's rendered DOM
echo "[step 2/3] Running render_and_dump.mjs..."
DUMP_OUT="experiments/css_native_layout/spike_fixtures/spike_rendered/${PROTOCOL}.html"
node experiments/css_native_layout/render_and_dump.mjs --protocol "$PROTOCOL"
echo "[step 2/3] Dump complete: $DUMP_OUT"
echo ""

# Step 3: Run precheck against the dumped HTML
echo "[step 3/3] Running precheck.mjs audit..."
node experiments/css_native_layout/precheck.mjs \
	"$DUMP_OUT" \
	--out "$OUT_DIR" \
	--annotate off

echo "[step 3/3] Precheck complete."
echo ""
echo "[info] run_built_app_precheck.sh: all steps complete"
echo "[info] Reports: $OUT_DIR"
echo "[info] - visual_audit.json (machine-readable)"
echo "[info] - visual_audit.md (human-readable)"
echo "[info] - sizing_manifest.json (placement measurements)"
exit 0
