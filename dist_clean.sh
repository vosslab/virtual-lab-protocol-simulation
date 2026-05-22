#!/usr/bin/env bash
# dist_clean.sh - wipe build artifacts, tool caches, and dependency installs.
#
# After this runs you must `npm install` again before `npm run check`,
# `npm run build`, or `npm run serve` will work.
set -euo pipefail
shopt -s globstar nullglob
cd "$(git rev-parse --show-toplevel)"

# Build outputs. _bundle.js is a legacy single-file artifact swept for one
# more release; remove the entry below once no consumer has it on disk.
rm -rf dist dist-single _site _bundle.js

# TypeScript incremental build info (any depth).
rm -rf **/*.tsbuildinfo

# Dependency installs and lockfile (forces clean reinstall on next npm install).
rm -rf node_modules package-lock.json

# Tool caches.
rm -rf .cache .eslintcache .prettiercache

# Python bytecode and pytest caches (any depth).
rm -rf **/__pycache__ **/.pytest_cache

echo "Cleaned dist/, dist-single/, _site/, _bundle.js, *.tsbuildinfo, node_modules/, package-lock.json, .cache, .eslintcache, .prettiercache, __pycache__/, .pytest_cache/."
