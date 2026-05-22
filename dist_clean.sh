#!/usr/bin/env bash
# dist_clean.sh - wipe build artifacts, tool caches, and dependency installs.
#
# After this runs you must `npm install` again before `npm run check`,
# `npm run build`, or `npm run serve` will work.
set -euo pipefail
shopt -s globstar nullglob
cd "$(git rev-parse --show-toplevel)"

DELETED=()

# delete_if_exists <path...>
# Removes each path that exists (file, dir, or symlink) and records it.
# Unmatched globs expand to nothing under nullglob, so missing entries
# silently no-op and are not reported.
delete_if_exists() {
	local p
	for p in "$@"; do
		if [ -e "$p" ] || [ -L "$p" ]; then
			rm -rf "$p"
			DELETED+=("$p")
		fi
	done
}

# Build outputs. _bundle.js is a legacy single-file artifact swept for one
# more release; remove the entry below once no consumer has it on disk.
delete_if_exists dist dist-single _site _bundle.js

# Bundler/esbuild meta artifacts.
delete_if_exists meta.json stats.html

# TypeScript incremental build info (any depth).
delete_if_exists **/*.tsbuildinfo

# Dependency installs and lockfile (forces clean reinstall on next npm install).
delete_if_exists node_modules package-lock.json

# JS/TS tool caches.
delete_if_exists .cache .eslintcache .prettiercache .nyc_output

# Test outputs (Playwright, coverage).
delete_if_exists test-results playwright-report blob-report coverage

# Python bytecode and tool caches (any depth).
delete_if_exists **/__pycache__ **/.pytest_cache **/.mypy_cache **/.ruff_cache

if [ "${#DELETED[@]}" -eq 0 ]; then
	echo "Nothing to clean."
else
	echo "Cleaned ${#DELETED[@]} path(s):"
	for p in "${DELETED[@]}"; do
		echo "  $p"
	done
fi
