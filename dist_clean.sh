#!/usr/bin/env bash
# dist_clean.sh - wipe build/dist/generated artifacts for fresh-start testing.
#
# Removes everything that is gitignored as a build artifact (per .gitignore)
# so a subsequent build can be exercised end-to-end. Useful for validating
# that build scripts (e.g., build_github_pages.sh, export_single_file.sh)
# correctly regenerate the gitignored generated/ SVG asset tree on a clean
# checkout.
#
# Does NOT touch tracked source (src/, assets/, docs/, tests/, tools/) or
# node_modules/ (too expensive to reinstall). Idempotent: safe to run twice.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Remove a path if present, log either way. ASCII output only.
remove_path() {
	local target="$1"
	if [ -e "$target" ] || [ -L "$target" ]; then
		rm -rf "$target"
		echo "rm -rf $target"
	else
		echo "not present: $target"
	fi
}

# Build artifacts (per .gitignore "# Build artifacts" block).
remove_path "generated"
remove_path "dist"
remove_path "cell_culture_game.html"
remove_path "cell-culture2-clean.svg"

# Playwright screenshots (per docs/PLAYWRIGHT_USAGE.md).
remove_path "test-results"

# Python caches: __pycache__ directories anywhere in the tree, and *.pyc files.
# Bounded to repo root by the cd above. -exec ... + batches removals.
pycache_count=$(find . -type d -name __pycache__ -not -path "./node_modules/*" -print | wc -l | tr -d ' ')
if [ "$pycache_count" -gt 0 ]; then
	find . -type d -name __pycache__ -not -path "./node_modules/*" -exec rm -rf {} +
	echo "rm -rf __pycache__ directories ($pycache_count removed)"
else
	echo "not present: __pycache__ directories"
fi

pyc_count=$(find . -type f -name "*.pyc" -not -path "./node_modules/*" -print | wc -l | tr -d ' ')
if [ "$pyc_count" -gt 0 ]; then
	find . -type f -name "*.pyc" -not -path "./node_modules/*" -delete
	echo "rm *.pyc files ($pyc_count removed)"
else
	echo "not present: *.pyc files"
fi

echo "dist_clean: done. Run a build script to regenerate."
