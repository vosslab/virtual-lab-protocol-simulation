# Round3 A2 fix: wire bootstrap_generated.sh into build_github_pages.sh

## Summary

Wired `pipeline/bootstrap_generated.sh` into `build_github_pages.sh` and
`pipeline/build_runtime_bundle.sh` so SVG barrel + protocol/scene/object
generated TS files cannot fall stale between adding an SVG asset and a
production build. Previously only `tests/conftest.py` invoked the
bootstrap on missing files; production builds skipped it entirely.

Also fixed a pre-existing breakage in `pipeline/bootstrap_generated.sh`
referencing a deleted script (`pipeline/build_new_protocol_data.py`,
removed in commit b24d031). Replaced with the current canonical
`pipeline/build_protocol_data.py`. Without this fix the new wiring would
have aborted every build.

## Files changed

- `build_github_pages.sh` (prepend bootstrap call before tsc/esbuild)
- `pipeline/build_runtime_bundle.sh` (prepend bootstrap call before esbuild)
- `pipeline/bootstrap_generated.sh` (fix stale `build_new_protocol_data.py`
  reference)

## Diff snippets

### build_github_pages.sh

```
 set -euo pipefail
 cd "$(git rev-parse --show-toplevel)"

+# Regenerate every YAML-emitted generated TS family (protocol, scene, object, SVG barrel)
+# before type-checking and bundling. Idempotent; safe to run on every build.
+bash pipeline/bootstrap_generated.sh
+
 # Resolve entry point.
```

### pipeline/build_runtime_bundle.sh

```
 REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
 cd "$REPO_ROOT"

+# Regenerate every YAML-emitted generated TS family before bundling.
+bash pipeline/bootstrap_generated.sh
+
 ENTRY_FILE="src/scene_runtime/bundle/entry.ts"
```

### pipeline/bootstrap_generated.sh

```
-# Compile protocol YAML to generated/protocol_data.ts (new vocabulary).
-python3 pipeline/build_new_protocol_data.py
+# Compile protocol YAML to generated/protocol_data.ts (current vocabulary).
+python3 pipeline/build_protocol_data.py
```

## Build pass: YES

`bash build_github_pages.sh` completes clean:

- protocol_data.ts: 244356 bytes
- inventory_data.ts: 16180 bytes
- scene_data.ts: 44 resolved scenes
- object_data.ts: 78 objects
- svg_assets/: 125 per-asset files + index.ts barrel + svg_manifest.ts
- dist/main.js: 2.3 MB bundle, dist/main.js.map: 3.0 MB sourcemap

## Idempotence pass: YES

Ran `bash build_github_pages.sh` twice. Hashed every file under
`generated/` after each run with md5 (131 files). `diff` between the
two hash manifests returned exit=0 (zero output, identical trees).

```
find generated -type f | sort | xargs md5 > /tmp/gen_hash_1.txt   # 131 files
bash build_github_pages.sh                                         # second run
find generated -type f | sort | xargs md5 > /tmp/gen_hash_2.txt
diff /tmp/gen_hash_1.txt /tmp/gen_hash_2.txt   # exit=0, no diff
```

## Barrel sync

`generated/` is gitignored, so `git diff generated/svg_assets/index.ts`
returns empty by definition. Idempotence check above is the meaningful
in-tree verification: barrel content is stable across consecutive
bootstrap invocations.

## Notes

- The previously-conftest-only bootstrap path explained the A2 staleness
  finding: production builds and runtime bundle builds both skipped SVG
  regeneration. With this wiring, every `build_github_pages.sh` and
  `pipeline/build_runtime_bundle.sh` invocation regenerates the barrel.
- Bootstrap remains idempotent: re-running produces no `generated/` diff.
