#!/usr/bin/env bash
# bootstrap_generated.sh - one command to regenerate every YAML-emitted generated TS family.
#
# Idempotent: generates protocol_data.ts, inventory_data.ts, scene_data.ts, and
# SVG manifest from YAML and SVG sources. Safe to run multiple times. All outputs
# land under generated/ (which is gitignored).
#
# This is the single entry point for:
#   - build_github_pages.sh and export_single_file.sh (before tsc and bundling)
#   - tests/conftest.py (pytest bootstrap on missing generated/ files)
#   - cleanroom validation (dist_clean.sh + bootstrap + tsc)
#
# Order matters: build_protocol_data.py runs first to validate protocol YAML
# (fast gate), then scene YAML, then SVG generation.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Compile protocol YAML to generated/protocol_data.ts and generated/inventory_data.ts.
python3 pipeline/build_protocol_data.py

# Compile scene YAML to generated/scene_data.ts.
python3 pipeline/build_scene_data.py

# Regenerate generated/svg_assets/*.ts and generated/svg_manifest.ts from SVG sources.
python3 pipeline/generate_svg_globals.py
