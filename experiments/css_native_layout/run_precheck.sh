#!/usr/bin/env bash
# Thin wrapper around experiments/css_native_layout/precheck.mjs.
# Defaults match the precheck.mjs built-in defaults; override by passing
# a positional HTML path/glob as $1, or set OUT_DIR in the environment.
# See experiments/css_native_layout/PRECHECK_USAGE.md.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PATTERN="${1:-experiments/css_native_layout/templates/*.html}"
# Default targets NEW0 audit location; NEW1 spike callers must override OUT_DIR.
OUT_DIR="${OUT_DIR:-test-results/new0_css_native/audit}"

echo "precheck pattern: $PATTERN"
echo "precheck out dir: $OUT_DIR"

node experiments/css_native_layout/precheck.mjs "$PATTERN" --out "$OUT_DIR"
