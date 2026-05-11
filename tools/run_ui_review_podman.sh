#!/usr/bin/env bash
# run_ui_review_podman.sh - build local dist/, serve it with Python, and run
# Playwright UI review inside the official Playwright container.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PORT="${PORT:-5080}"
BIND="${BIND:-127.0.0.1}"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.59.1-noble}"
BASE_URL="${BASE_URL:-http://host.containers.internal:${PORT}}"

mkdir -p artifacts/ui-review test-results

bash build_github_pages.sh

python3 -m http.server "${PORT}" --bind "${BIND}" --directory dist > test-results/ui-review-server.log 2>&1 &
SERVER_PID="$!"

cleanup() {
	kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

python3 - <<PY
import sys
import time
import urllib.request

url = "http://${BIND}:${PORT}"
for _ in range(50):
	try:
		urllib.request.urlopen(url, timeout=0.5).read(1)
		sys.exit(0)
	except Exception:
		time.sleep(0.1)

print("Server did not become ready: " + url, file=sys.stderr)
sys.exit(1)
PY

podman run --rm \
	--ipc=host \
	-v "$PWD:/work:Z" \
	-w /work \
	-e BASE_URL="${BASE_URL}" \
	"${PLAYWRIGHT_IMAGE}" \
	bash -lc 'npm run ui:review'
