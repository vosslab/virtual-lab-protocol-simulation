#!/bin/sh
#
# run_validate.sh validates the repository against EXISTING generated evidence.
# Scene layout validation reads renderer-produced stats from
# generated/scene_render_stats/<scene>.stats.json, produced by build_github_pages.sh.
# This script validates only: it never renders scenes or parses PNG pixels.
# If the stats are missing, validation fails clearly -- run ./build_github_pages.sh first.
set -eu
date
. ./source_me.sh
python3 ./validation/validate.py -q
echo ""
