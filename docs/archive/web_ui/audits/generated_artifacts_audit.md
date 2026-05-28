# Generated artifacts audit

Audit of the `npm run prebuild` codegen pipeline: what scripts run, what files
land in `generated/`, what symbols they export, and whether `src/` consumers
import symbols that actually exist.

## Prebuild exit code

- Command: `npm run prebuild`
- Resolved chain: `python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py`
- Exit code: 0
- Errors / warnings observed in the log (non-fatal; each scene is skipped
  rather than aborting the build):
  - `gen_scene_index.py` reports `ERROR processing <path>: Zone missing id`
    for the following scene YAMLs, which are then excluded from
    `SCENE_ALLOWLIST` and surfaced in `SCENES_SKIPPED_FILES`:
    - `tests/content/dev_smoke/adversarial_overflow_smoke/scene.yaml`
    - `content/base_scenes/bench_basic.yaml`
    - `content/base_scenes/cell_counter_basic.yaml`
    - `content/base_scenes/electrophoresis_bench.yaml`
    - `content/base_scenes/heat_block_bench.yaml`
    - `content/base_scenes/hood_basic.yaml`
    - `content/base_scenes/imaging_bench.yaml`
    - `tests/content/dev_smoke/long_labels_smoke/scene.yaml`
    - `content/base_scenes/microscope_basic.yaml`
    - `content/base_scenes/sample_prep_bench.yaml`
    - `content/base_scenes/staining_bench.yaml`
  - The `Zone missing id` complaint repeats for the canonical
    `*_basic.yaml` siblings of every `*_basic_row_slot.yaml` that does land in
    the allowlist. The generator currently treats only `_row_slot` scenes as
    valid, even though `SCENES_SKIPPED_METADATA` claims `bench_basic`,
    `sample_prep_bench`, `staining_bench`, `cell_counter_basic`, and
    `hood_basic` are part of `SCENE_ALLOWLIST`. The TS table is inconsistent
    with the runtime skip log; see Gaps below.

## Generated file tree

| File | Bytes | Lines |
| --- | --- | --- |
| `generated/object_library.ts` | 25,046 | 1,317 |
| `generated/scenes.ts` | ~12 KB | 590 |
| `generated/svg_registry.ts` | 2,014,808 | 130 |

Only these three files exist under `generated/`. The directory is gitignored;
the listing above is the freshly regenerated state after `npm run prebuild`.

## Per-file top-level exports

### generated/object_library.ts

Imports:

- `import type { AssetSpecs, ObjectLibrary } from '../src/scene_runtime/layout/types.js';`

Exports:

- `export const OBJECT_LIBRARY: ObjectLibrary` (line 5)
- `export const ASSET_SPECS: AssetSpecs` (line 1077)

Generator: `tools/gen_object_library.py`. Source: 74 object YAML files under
`content/objects/`; emits 74 object entries plus 48 asset specs (per the
prebuild log summary line).

### generated/svg_registry.ts

Imports: none.

Exports:

- `export const SVG_REGISTRY: Record<string, string>` (line 4)

Generator: `tools/gen_svg_registry.py`. Source: 125 SVGs under `assets/`.
Each value is the inline SVG markup as a JSON-escaped string; the file is
overwhelmingly one giant object literal, which is why the file is 2 MB on
disk despite only 130 newlines.

### generated/scenes.ts

Imports:

- `import type { SceneA, SceneB } from '../src/scene_runtime/layout/types.js';`

Exports:

- `export const SCENE_ALLOWLIST` (line 5) -- `readonly tuple of scene names`
- `export const SCENES_SKIPPED` (line 6) -- `number`, currently `14`
- `export const SCENES_SKIPPED_FILES` (line 7) -- `readonly tuple of skipped scene file stems`
- `export const SCENES_SKIPPED_METADATA: Record<string, string>` (line 10) -- documented blocker per scene
- `export const SCENES: Record<typeof SCENE_ALLOWLIST[number], SceneA | SceneB>` (line 17)

Generator: `tools/gen_scene_index.py`. Source: scene YAML files under
`content/base_scenes/` and `tests/content/dev_smoke/`.

## Consumer cross-check

The only files under `src/` that import from `../generated/...` are:

| Consumer | Line | Import |
| --- | --- | --- |
| `src/main.ts` | 4 | `import { SCENES } from "../generated/scenes.js";` |
| `src/main.ts` | 5 | `import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";` |
| `src/scene_runtime/renderer/inject_svg.ts` | 5 | `import { SVG_REGISTRY } from "../../../generated/svg_registry.js";` |
| `src/scene_runtime/renderer/structural_guards.ts` | 7 | `import { ASSET_SPECS } from "../../../generated/object_library.js";` |
| `src/scene_runtime/renderer/structural_guards.ts` | 8 | `import { SVG_REGISTRY } from "../../../generated/svg_registry.js";` |

Symbol presence cross-check:

| Importer:line | Symbol | Defined in | Present? |
| --- | --- | --- | --- |
| `src/main.ts:4` | `SCENES` | `generated/scenes.ts:17` | YES |
| `src/main.ts:5` | `OBJECT_LIBRARY` | `generated/object_library.ts:5` | YES |
| `src/main.ts:5` | `ASSET_SPECS` | `generated/object_library.ts:1077` | YES |
| `src/scene_runtime/renderer/inject_svg.ts:5` | `SVG_REGISTRY` | `generated/svg_registry.ts:4` | YES |
| `src/scene_runtime/renderer/structural_guards.ts:7` | `ASSET_SPECS` | `generated/object_library.ts:1077` | YES |
| `src/scene_runtime/renderer/structural_guards.ts:8` | `SVG_REGISTRY` | `generated/svg_registry.ts:4` | YES |

No `src/` consumer imports any other named symbol from `generated/`. The
extra exports in `generated/scenes.ts` (`SCENE_ALLOWLIST`, `SCENES_SKIPPED`,
`SCENES_SKIPPED_FILES`, `SCENES_SKIPPED_METADATA`) are currently unused at
the `src/` level.

### Python pipeline references to generated/ artifacts

`pipeline/build_protocol_html.py` was inspected per the brief. It does not
reference any file under `generated/`. It only depends on `content/protocols/`
YAML and a separately produced `dist/runtime.bundle.js`. So nothing in the
HTML builder consumes the prebuild output directly.

Other `pipeline/*.py` scripts mention `generated/` artifacts that are not
produced by `npm run prebuild`:

- `pipeline/build_object_data.py` -> `generated/object_data.ts` (NOT GENERATED by prebuild)
- `pipeline/build_protocol_data.py` -> `generated/protocol_data.ts`, `generated/inventory_data.ts` (NOT GENERATED by prebuild)
- `pipeline/build_scene_data.py` -> `generated/scene_data.ts` (NOT GENERATED by prebuild)
- `pipeline/build_new_scene_data.py` -> `generated/scene_data.ts` (NOT GENERATED by prebuild)
- `pipeline/generate_svg_globals.py` -> `generated/svg_assets/*.ts`, `generated/svg_assets/index.ts`, `generated/svg_manifest.ts` (NOT GENERATED by prebuild)

These pipeline scripts are not invoked by `npm run prebuild`; the prebuild
chain is exactly `gen_object_library.py + gen_svg_registry.py +
gen_scene_index.py`. Whether the `pipeline/` scripts are wired into a
different orchestrator (e.g. `pipeline/bootstrap_generated.sh`) is out of
scope for this audit; no `src/` consumer imports any of the
`pipeline/`-produced artifact names, so the gap is latent rather than
immediately breaking.

## Gaps

### Imported-but-not-exported

None. Every symbol imported under `src/` from `generated/` is exported by the
matching generated file.

### Expected-but-not-generated

1. `pipeline/` scripts document a parallel artifact set
   (`object_data.ts`, `protocol_data.ts`, `inventory_data.ts`,
   `scene_data.ts`, `svg_manifest.ts`, `svg_assets/`) that `npm run prebuild`
   does not produce. No `src/` file imports these names today, so this is a
   latent gap: a build orchestrator that calls those pipeline scripts is
   needed before any consumer can rely on them. The naming overlap with
   `gen_*` outputs (`object_library.ts` vs `object_data.ts`,
   `svg_registry.ts` vs `svg_manifest.ts`) is itself a drift risk.
2. `generated/scenes.ts` `SCENES_SKIPPED_METADATA` lists
   `bench_basic`, `sample_prep_bench`, `staining_bench`,
   `cell_counter_basic`, and `hood_basic` as part of the allowlist while
   the prebuild log shows `gen_scene_index.py` printing `Zone missing id`
   errors for those same files. The current emission keeps them in
   `SCENE_ALLOWLIST` AND in the error log; the generator's skip path and
   allowlist path are not aligned. This is not an import-time failure
   (the `SCENES` object still contains the keys) but it is a content/
   schema drift the generator is hiding.

### Unused-but-exported

`generated/scenes.ts` exports `SCENE_ALLOWLIST`, `SCENES_SKIPPED`,
`SCENES_SKIPPED_FILES`, and `SCENES_SKIPPED_METADATA`, none of which is
consumed by `src/`. They are diagnostic exports waiting on a consumer.

## Status label

PASS-WITH-DRIFT. The three prebuild artifacts compile, exports match every
`src/` import, and the runtime entry path (`src/main.ts` -> `SCENES`,
`OBJECT_LIBRARY`, `ASSET_SPECS`, plus renderer's `SVG_REGISTRY`) is satisfied.
Drift is concentrated in (a) `gen_scene_index.py` reporting `Zone missing id`
errors for scenes it still places in `SCENE_ALLOWLIST`, and (b) the
`pipeline/` scripts referencing a parallel `generated/*_data.ts` artifact set
that no current orchestrator produces and no `src/` consumer imports.
