# Cleanup handoff

Human-executed git operations only. Agents prepared this list by scanning
references via `git ls-files | xargs grep -l ...`. Each candidate carries
the verification snippet so the human can audit before running `git mv`
or `git rm`.

The canonical replacement pipeline is `package.json` `prebuild`:

```
python3 tools/gen_object_library.py
python3 tools/gen_svg_registry.py
python3 tools/gen_scene_index.py
python3 tools/gen_protocols.py
```

Plus `build_github_pages.sh` (esbuild bundle of `src/dist_entry.tsx`).

## 1. SAFE_TO_ARCHIVE pipeline scripts

The following `pipeline/` scripts have zero references from active code
(`src/`, `tests/`, `tools/`, `validation/`, `experiments/`, `devel/`,
root build scripts, `package.json`). Only docs/archive and pipeline
self-references remain.

NOT safe to archive (still referenced by active code, listed for the
record):

- `pipeline/build_protocol_html.py` -- referenced by
  `tests/e2e/e2e_protocol_html_build.py` and
  `tests/playwright/walker/audit_all.mjs`.
- `pipeline/build_protocol_data.py` -- referenced by
  `tests/playwright/walker/engine.mjs` (error message guidance).
- `pipeline/build_runtime_bundle.sh` -- referenced by
  `tests/playwright/walker/audit_all.mjs` and
  `experiments/css_native_layout/run_built_app_precheck.sh`.
- `pipeline/bootstrap_generated.sh` -- referenced by
  `tests/test_authored_vs_generated.py` and
  `tests/test_facade_imports.py` (error message guidance).
- `pipeline/generate_svg_globals.py` -- referenced by
  `tools/svg_picker/apply_decisions.py`,
  `tools/svg_picker/README.md`, and `validation/svg/pipeline_check.py`.

### 1a. `pipeline/build_object_data.py`

Replaced by `tools/gen_object_library.py` (now invoked by every
`package.json` `pre*` script).

Verification (active-code refs):

```
$ git ls-files tests/ tools/ validation/ src/ experiments/ devel/ \
    | xargs grep -l "build_object_data"
(no output)
```

Proposed move:

```
git mv pipeline/build_object_data.py docs/archive/legacy_pipeline/build_object_data.py
```

### 1b. `pipeline/build_scene_data.py`

Replaced by `tools/gen_scene_index.py` (now invoked by every
`package.json` `pre*` script).

Verification:

```
$ git ls-files tests/ tools/ validation/ src/ experiments/ devel/ \
    | xargs grep -l "build_scene_data"
(no output)
```

Proposed move:

```
git mv pipeline/build_scene_data.py docs/archive/legacy_pipeline/build_scene_data.py
```

### 1c. `pipeline/build_new_scene_data.py`

Only referenced from `pipeline/bootstrap_generated.sh` (which is itself
inactive aside from error-message strings in two pytest files). No
active code path imports or runs it.

Verification:

```
$ git ls-files tests/ tools/ validation/ src/ experiments/ devel/ \
    | xargs grep -l "build_new_scene_data"
(no output)
```

Proposed move:

```
git mv pipeline/build_new_scene_data.py docs/archive/legacy_pipeline/build_new_scene_data.py
```

### 1d. `pipeline/pipeline_utils.py`

Imported only by other `pipeline/*.py` modules. Once the build_* scripts
above move, this module's only callers are themselves archived. Archive
together.

Verification:

```
$ git ls-files | xargs grep -l "pipeline_utils" | sort -u
docs/archive/plan-reset-2026-05-22/scene_runtime_activation_on_hold.md
docs/archive/scene_runtime/row_slot_base_scene_prototype.md
docs/CHANGELOG-2026-05d.md
pipeline/build_new_scene_data.py
pipeline/build_object_data.py
pipeline/build_protocol_data.py
pipeline/build_scene_data.py
pipeline/pipeline_utils.py
```

Proposed move:

```
git mv pipeline/pipeline_utils.py docs/archive/legacy_pipeline/pipeline_utils.py
```

### 1e. `pipeline/__init__.py`

Package marker. Once 1a-1d are archived and the remaining "still active"
scripts (build_protocol_html.py, build_protocol_data.py,
build_runtime_bundle.sh, bootstrap_generated.sh, generate_svg_globals.py)
remain in place, `__init__.py` continues to serve them. Do NOT archive
yet -- leave it next to the surviving pipeline scripts.

Count: 4 scripts safe to archive in this pass.

## 2. `src/main.ts` retirement

`src/main.ts` is the legacy bench-only entry. The build now uses
`src/dist_entry.tsx` (see `build_github_pages.sh` `ENTRY="src/dist_entry.tsx"`).

Verification (no importers):

```
$ git ls-files src/ tests/ tools/ | xargs grep -l "src/main\|/main\.ts\|src\.main"
src/dist_entry.tsx     <-- not actually importing src/main.ts (false positive on "main" substring)
src/index.html
src/launcher/index.html
src/protocol_host_template.html
```

Spot-check of the four matches: the HTML files reference compiled
`main.js` (the esbuild output), and `src/dist_entry.tsx` has no
`import` of `./main`. No active TypeScript module imports `src/main.ts`.
`build_github_pages.sh` does not list `src/main.ts` in `REQUIRED_SOURCES`.

Proposed deletion:

```
git rm src/main.ts
```

Status: Y, retirable.

## 3. CamelCase TS filename renames

Full enumeration of `.ts`/`.tsx` files in `src/` with CamelCase
basenames:

```
$ git ls-files src/ | grep -E '\.tsx?$' | sort | (filter CamelCase)
src/launcher/Launcher.tsx
src/shell/hud/ProtocolHud.tsx
```

Two files. Both violate the snake_case filename rule in
[TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md).

### 3a. `src/launcher/Launcher.tsx` -> `src/launcher/launcher.tsx`

Importers (must update in the same commit):

```
src/dist_entry.tsx:51:  const { Launcher } = await import("./launcher/Launcher.js");
src/launcher/main.tsx:7:import { Launcher } from "./Launcher.js";
tests/playwright/test_launcher_render.mjs:16:  // src/launcher/Launcher.js
```

Proposed move + import edits:

```
git mv src/launcher/Launcher.tsx src/launcher/launcher.tsx
# then edit:
#   src/dist_entry.tsx  : "./launcher/Launcher.js"  -> "./launcher/launcher.js"
#   src/launcher/main.tsx : "./Launcher.js"          -> "./launcher.js"
#   tests/playwright/test_launcher_render.mjs comment string (informational only)
```

Note: the exported symbol `Launcher` (PascalCase component name) stays;
only the filename changes. Solid component names remain PascalCase.

### 3b. `src/shell/hud/ProtocolHud.tsx` -> `src/shell/hud/protocol_hud.tsx`

Importers (must update in the same commit):

```
src/protocol_host.tsx:62:import { ProtocolHud } from "./shell/hud/ProtocolHud.js";
tests/test_typescript_boundaries.py:258: violation2 = _check_import_violation("../../shell/hud/ProtocolHud")
```

Proposed move + import edits:

```
git mv src/shell/hud/ProtocolHud.tsx src/shell/hud/protocol_hud.tsx
# then edit:
#   src/protocol_host.tsx          : "./shell/hud/ProtocolHud.js"  -> "./shell/hud/protocol_hud.js"
#   tests/test_typescript_boundaries.py : "../../shell/hud/ProtocolHud" -> "../../shell/hud/protocol_hud"
```

Exported symbol `ProtocolHud` (PascalCase component name) stays.

Count: 2 files to rename.

## Summary counts

- Section 1 (SAFE_TO_ARCHIVE pipeline scripts): 4
- Section 2 (`src/main.ts` retirable): Y
- Section 3 (CamelCase TS files to rename): 2
