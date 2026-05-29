#!/usr/bin/env bash
# build_generated.sh - regenerate the generated/ artifact tree from source.
#
# Single source of truth for generator order. Everything under generated/ is a
# build artifact (the directory is gitignored), so this script wipes it and
# fully regenerates it from content/ and assets/.
#
# Run order is load-bearing: gen_scene_index.py reads generated/object_library.ts
# for its placement cross-check, so gen_object_library.py must run first.
#
#   1. gen_object_library.py -> generated/object_library.ts
#   2. gen_svg_registry.py   -> generated/svg_registry.ts
#   3. gen_scene_index.py    -> generated/scenes.ts (reads object_library.ts)
#   4. gen_protocols.py      -> generated/protocols.ts, generated/protocols_index_slim.ts
#
# Called directly by build_github_pages.sh and check_codebase.sh. No npm
# lifecycle hooks; no package.json aliases.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Wipe and recreate the artifact tree so no stale outputs survive.
rm -rf generated
mkdir -p generated

# Run the generators in canonical order.
python3 pipeline/gen_object_library.py
python3 pipeline/gen_svg_registry.py
python3 pipeline/gen_scene_index.py
python3 pipeline/gen_protocols.py

echo "Regenerated generated/ (object_library, svg_registry, scenes, protocols)."
