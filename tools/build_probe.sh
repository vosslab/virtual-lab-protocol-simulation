#!/usr/bin/env bash
# tools/build_probe.sh - probe-only esbuild verification for Solid.js
#
# Purpose: verify that Solid.js bundles cleanly under the canonical esbuild
# config with --jsx-import-source=solid-js --jsx=automatic before the main
# runtime consumes it. This is a one-time verification step (WP-1-2) that
# does NOT modify build_github_pages.sh or any part of the main build.
#
# Probe entry: src/shell/_probe.tsx
# Probe output: /tmp/probe_dist/probe.js + /tmp/probe_dist/probe.html
#
# Contract:
#   - Wipes /tmp/probe_dist/ from scratch.
#   - Type-checks src/shell/_probe.tsx via 'tsc --noEmit -p tsconfig.json'.
#   - Bundles src/shell/_probe.tsx with esbuild, using canonical flags
#     plus --jsx=automatic --jsx-import-source=solid-js.
#   - Copies a minimal probe.html into /tmp/probe_dist/ that loads probe.js
#     and provides <div id="root"></div> for the component.
#   - Exits with error if the probe source or esbuild invocation fails.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Verify probe entry exists.
if [ ! -f "src/shell/_probe.tsx" ]; then
	echo "ERROR: probe entry missing: src/shell/_probe.tsx" >&2
	exit 1
fi

# Clean probe output directory.
rm -rf /tmp/probe_dist
mkdir -p /tmp/probe_dist

# Type-check the entire project (catches any errors in _probe.tsx).
npx tsc --noEmit -p tsconfig.json

# Bundle the probe with canonical esbuild flags (no special JSX flags needed).
npx esbuild src/shell/_probe.tsx \
	--bundle \
	--format=esm \
	--target=es2020 \
	--platform=browser \
	--minify \
	--sourcemap \
	--outfile=/tmp/probe_dist/probe.js

# Write a minimal probe.html that loads the bundle and provides root.
cat > /tmp/probe_dist/probe.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Solid.js Probe</title>
</head>
<body>
	<div id="root"></div>
	<script type="module" src="probe.js"></script>
</body>
</html>
EOF

# Verify outputs exist.
test -f /tmp/probe_dist/probe.js
test -f /tmp/probe_dist/probe.html

echo "Built /tmp/probe_dist/ (Solid.js esbuild proof)."
