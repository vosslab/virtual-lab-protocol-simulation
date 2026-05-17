"""Canonical repo root path, resolved once at import time."""

from pathlib import Path


# This file lives at <repo>/validation/shared_toolkit/repo_root.py. Go up two
# levels to reach the repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
