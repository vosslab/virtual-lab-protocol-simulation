#!/usr/bin/env bash
# build_github_pages.sh - canonical production build for GitHub Pages.
#
# Contract:
#   - Wipes dist/ from scratch.
#   - Type-checks via `tsc --noEmit` (src/tsconfig.json keeps noEmit: true).
#   - Bundles src/init.ts into dist/main.js with esbuild.
#   - Assembles dist/index.html from src/head.html + body.html + tail.html,
#     inserting the stylesheet link in the head and the script tag before
#     </body>. This preserves the DOM scaffolding the legacy concat build
#     used.
#   - Copies src/style.css into dist/.
#   - Creates dist/.nojekyll so GitHub Pages serves files starting with _.
#   - Asserts dist/index.html exists before exiting.
#
# Hard rule: this script must NOT produce single-file output. GitHub Pages
# output and portable export are different artifacts. For a portable
# one-file HTML build, use export_single_file.sh (output goes to
# dist-single/, never to dist/).

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

rm -rf dist
mkdir -p dist

npx tsc --noEmit -p src/tsconfig.json

npx esbuild src/init.ts \
	--bundle \
	--format=esm \
	--target=es2020 \
	--platform=browser \
	--outfile=dist/main.js

cp src/style.css dist/style.css

# Assemble dist/index.html from src/head.html + body.html + tail.html so
# the bundled build inherits the legacy DOM scaffolding. Inject the stylesheet
# link in <head> (head.html is missing its closing </head>) and the module
# script tag before </body>.
{
	cat src/head.html
	echo '<link rel="stylesheet" href="./style.css">'
	echo '</head>'
	# body.html already begins with <body> and ends with the closing </div>
	# of #game-container; it does NOT include </body> -- tail.html does.
	cat src/body.html
	echo '<script type="module" src="./main.js"></script>'
	cat src/tail.html
} > dist/index.html

touch dist/.nojekyll

test -f dist/index.html

echo "Built dist/ (GitHub Pages-ready)."
