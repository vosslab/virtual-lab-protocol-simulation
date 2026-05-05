#!/bin/bash
# run_web_server.sh - Build the bundled game and serve it on the local network.
# Usage: bash run_web_server.sh
#
# This serves the canonical dist/ build produced by build_github_pages.sh.
# For a portable single-file artifact, run export_single_file.sh instead;
# its output lands in dist-single/ and is not served here.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [ ! -d node_modules ]; then
	echo "node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

# Rebuild the canonical GitHub Pages artifact into dist/.
./build_github_pages.sh

# Detect the local IP address for the LAN URL
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
PORT="${PORT:-5080}"

echo ""
echo "========================================"
echo "  Send this link to others on your network:"
echo "  http://${LOCAL_IP}:${PORT}"
echo "========================================"
echo ""

# Open the browser, then start the static server bound to all interfaces.
sleep 1 && open "http://127.0.0.1:${PORT}" &
python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory dist
