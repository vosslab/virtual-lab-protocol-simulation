#!/usr/bin/env bash
# check_dist_ready.sh - guard for 'npm run serve'.
# Ensures dist/ has been built before starting the dev server.
# Exits non-zero with a clear message if dist/index.html is missing.

set -euo pipefail

if [ ! -f dist/index.html ]; then
	echo "ERROR: dist/ missing or dist/index.html not found." >&2
	echo "Run 'npm run build' to generate the distribution before serving." >&2
	exit 1
fi
