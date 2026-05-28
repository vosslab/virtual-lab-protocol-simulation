#!/usr/bin/env bash
# build_github_pages.sh - canonical production build for GitHub Pages.
#
# WP-3-10 extension. The build now produces:
#
#   dist/index.html              -- launcher entry (from src/launcher/index.html)
#   dist/main.js                 -- single shared ESM bundle (Solid + runtime)
#   dist/style.css               -- copied verbatim from src/style.css
#   dist/bench_basic.html        -- preserved bench page as a render smoke target
#                                   (renamed from the legacy dist/index.html)
#   dist/<protocol_name>.html    -- one per entry in generated PROTOCOLS_INDEX,
#                                   templated from src/protocol_host_template.html
#   dist/.nojekyll               -- GitHub Pages flag
#
# Contract:
#   - Wipes dist/ from scratch.
#   - Verifies required source files: src/dist_entry.tsx,
#     src/launcher/index.html, src/protocol_host_template.html,
#     src/index.html (bench), src/style.css. Aborts on missing.
#   - Type-checks via 'tsc --noEmit -p tsconfig.json'.
#   - Bundles src/dist_entry.tsx with esbuild (ESM, es2020, browser,
#     minified, sourcemap, Solid JSX flags) into dist/main.js.
#   - Copies src/launcher/index.html  -> dist/index.html (launcher page).
#   - Copies src/index.html           -> dist/bench_basic.html (bench page).
#   - Copies src/style.css            -> dist/style.css.
#   - Reads PROTOCOLS_INDEX entries from generated/protocols.ts via
#     pipeline/list_protocols.py and instantiates src/protocol_host_template.html
#     once per entry, substituting {{PROTOCOL_NAME}}.
#   - Writes dist/.nojekyll.
#   - Asserts the canonical artifacts exist before exiting.
#
# Hard rule: never produces single-file output. ESM only.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Two-bundle split (see docs/active_plans/active/web_ui/bundle_audit.md):
#   src/launcher_entry.tsx       -> dist/launcher.js       (lightweight)
#   src/protocol_host_entry.tsx  -> dist/protocol_host.js  (runtime + renderer + SVGs)

# Verify required source inputs before any destructive step.
REQUIRED_SOURCES=(
	"src/launcher_entry.tsx"
	"src/protocol_host_entry.tsx"
	"src/launcher/index.html"
	"src/protocol_host_template.html"
	"src/index.html"
	"src/style.css"
	"generated/protocols.ts"
	"generated/protocols_index_slim.ts"
	"pipeline/list_protocols.py"
)
for required in "${REQUIRED_SOURCES[@]}"; do
	if [ ! -f "$required" ]; then
		echo "ERROR: required source file missing: $required" >&2
		exit 1
	fi
done

# Wipe and recreate dist/.
rm -rf dist
mkdir -p dist

# 1. Typecheck.
npx tsc --noEmit -p tsconfig.json

# 2. Bundle the single dist entry via esbuild-plugin-solid (Node API).
#    The plugin runs Solid's babel transform on JSX so reactivity is
#    fine-grained. The plain esbuild CLI cannot do this transform.
node pipeline/build_main_bundle.mjs

# 3. Copy launcher HTML as the dist root (dist/index.html).
cp src/launcher/index.html dist/index.html

# 4. Copy bench HTML to bench_basic.html as a render smoke target.
#    The legacy bench page used to be dist/index.html; it is preserved
#    under a stable name so existing smoke paths keep working.
cp src/index.html dist/bench_basic.html

# 5. Copy stylesheet.
cp src/style.css dist/style.css

# 6. Generate dist/<protocol_name>.html for every PROTOCOLS_INDEX entry.
#    list_protocols.py 'emit' parses PROTOCOLS_INDEX from generated/protocols.ts
#    and writes one dist/<name>.html per entry, substituting {{PROTOCOL_NAME}}.
python3 pipeline/list_protocols.py emit \
	--template src/protocol_host_template.html \
	--out-dir dist

# 7. GitHub Pages marker.
touch dist/.nojekyll

# 8. Assert the canonical artifacts exist.
test -f dist/index.html
test -f dist/launcher.js
test -f dist/protocol_host.js
test -f dist/style.css
test -f dist/bench_basic.html

echo "Built dist/ (GitHub Pages-ready)."
