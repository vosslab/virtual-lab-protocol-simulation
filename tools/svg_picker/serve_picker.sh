#!/bin/bash
# Serve repo root on a random ephemeral port and open the SVG picker.
# Serving from the repo root (not tools/svg_picker/) lets the picker reach
# ../../assets/equipment/ SVGs without `..` traversal being rejected.
# Trap Ctrl-C to kill the background server cleanly.

set -e

# Random ephemeral port avoids the browser cache trap: each session lands on a
# fresh origin, so stale picker.js / picker.css from earlier sessions never
# replay. Python picks a free port atomically (bind to 0, read assigned port).
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()')"
REPO_ROOT="$(git rev-parse --show-toplevel)"

cd "${REPO_ROOT}"

python3 -m http.server "${PORT}" &
SERVER_PID=$!

trap "kill ${SERVER_PID} 2>/dev/null" EXIT INT TERM

sleep 0.5
open "http://127.0.0.1:${PORT}/tools/svg_picker/"

echo "Serving ${REPO_ROOT} at http://127.0.0.1:${PORT}/ (pid ${SERVER_PID})"
echo "Picker: http://127.0.0.1:${PORT}/tools/svg_picker/"
echo "Ctrl-C to stop."
wait ${SERVER_PID}
