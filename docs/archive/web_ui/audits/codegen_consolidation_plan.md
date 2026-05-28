# Codegen consolidation plan

Date: 2026-05-28
Mission: identify which `pipeline/*.py` and `pipeline/*.sh` scripts can
be archived now that `tools/gen_*.py` is the canonical pipeline.

## Live pipeline (tools/gen_*, invoked by package.json pre* scripts)

| Generator | Emits | Exports |
| --- | --- | --- |
| tools/gen_object_library.py | generated/object_library.ts | OBJECT_LIBRARY, ASSET_SPECS |
| tools/gen_svg_registry.py | generated/svg_registry.ts | SVG_REGISTRY |
| tools/gen_scene_index.py | generated/scenes.ts | SCENES, SCENE_ALLOWLIST, SCENES_SKIPPED |
| tools/gen_protocols.py | generated/protocols.ts | PROTOCOLS, PROTOCOLS_INDEX |

Consumed by `src/main.ts`, `src/scene_runtime/renderer/inject_svg.ts`,
`src/scene_runtime/renderer/structural_guards.ts`, and
`tests/test_generalization_preflight.mjs`.

## Per pipeline/ script

| Script | Emits | Consumed by | Verdict |
| --- | --- | --- | --- |
| pipeline/build_object_data.py | generated/object_data.ts (OBJECT_CATALOG) | none | SAFE_TO_ARCHIVE |
| pipeline/build_scene_data.py | generated/scene_data.ts (SCENE_CONFIGS legacy) | none | SAFE_TO_ARCHIVE |
| pipeline/build_new_scene_data.py | generated/scene_data.ts (SCENE_CATALOG with inheritance) | none | UNCLEAR -- handles `extends` chains that gen_scene_index.py does not. If `content/protocols/*/scenes/*.yaml` files with `extends` are in active use, KEEP; else SAFE_TO_ARCHIVE. |
| pipeline/build_protocol_data.py | generated/protocol_data.ts + inventory_data.ts | none | SAFE_TO_ARCHIVE |
| pipeline/build_protocol_html.py | dist/&lt;protocol&gt;.html | referenced by build_github_pages.sh | UNCLEAR -- per-protocol HTML emitter; not yet replaced by Solid host. Re-evaluate after WP-3-10 (build_github_pages.sh extension). |
| pipeline/generate_svg_globals.py | generated/svg_assets/*.ts + svg_manifest.ts | none | SAFE_TO_ARCHIVE |
| pipeline/bootstrap_generated.sh | orchestrator (runs the four build_new_* + generate_svg_globals.py) | tests/conftest.py + build_github_pages.sh | KEEP -- still referenced. If the SAFE_TO_ARCHIVE list lands, update bootstrap to drop archived scripts or replace with `python3 tools/gen_*` calls. |
| pipeline/build_runtime_bundle.sh | dist/runtime.bundle.js | referenced by build_github_pages.sh | KEEP -- esbuild config. Will be superseded by the Solid host build path (WP-3-10) when M3 lands; archive then. |

## Recommended archive list (SAFE_TO_ARCHIVE)

1. `pipeline/build_object_data.py`
2. `pipeline/build_scene_data.py`
3. `pipeline/build_protocol_data.py`
4. `pipeline/generate_svg_globals.py`

Archive path: `docs/archive/pipeline_legacy_2026-05/`. Human runs
`git mv` after reviewing this doc.

## Open items for human review

- **UNCLEAR-1: pipeline/build_new_scene_data.py.** Question: does any
  current content/protocols/&lt;cluster&gt;/&lt;name&gt;/scenes/*.yaml
  use `extends:` to inherit a base scene? If yes, `gen_scene_index.py`
  is insufficient and this stays. If no, archive it.
- **UNCLEAR-2: pipeline/build_protocol_html.py.** Question: do we need
  per-protocol HTML emission today, before the Solid host (WP-3-10)
  replaces this path? If GitHub Pages currently ships per-protocol
  files, keep until WP-3-10; then archive both this and
  `build_runtime_bundle.sh` together.
- **bootstrap_generated.sh + build_github_pages.sh updates.** After the
  SAFE_TO_ARCHIVE list lands, both shell scripts need the archived
  script invocations removed or replaced with their `tools/gen_*`
  equivalents.

## Status

- Status label: DONE.
- 4 scripts ready for immediate archive.
- 2 scripts pending answers to UNCLEAR-1 and UNCLEAR-2.
- 2 scripts KEEP (revisit after WP-3-10 ships).
