# Pipeline / Tools reorg inventory

Date: 2026-05-28

Policy:

- `pipeline/` owns codegen entry points and anything that emits to `generated/` or assembles bundles/HTML.
- `tools/` owns developer utilities only.
- No duplicate generators in both places.
- No legacy code "just in case" -- git history preserves history.

Live-reference evidence collected by `/tmp/_inventory2.py`, which scans every
git-tracked file (excluding `docs/`, `generated/`, `dist/`, `node_modules/`,
`.git/`) for `path`, `basename`, and bare-module-name imports. References that
exist only in `docs/` (changelogs, archived plans) are not counted as live.

## pipeline/

| path                                 | category | live references                                                                                  | action          |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------ | --------------- |
| pipeline/__init__.py                 | legacy   | 0                                                                                                | delete          |
| pipeline/bootstrap_generated.sh      | legacy   | 4 string mentions in tests/playwright/walker, tests/test_authored_vs_generated, test_facade_imports; invokes non-existent build_new_protocol_data.py | delete          |
| pipeline/build_new_scene_data.py     | legacy   | 1 (only invoked by bootstrap_generated.sh, also deleted)                                         | delete          |
| pipeline/build_object_data.py        | legacy   | 1 (only invoked by bootstrap_generated.sh, also deleted)                                         | delete          |
| pipeline/build_protocol_data.py      | legacy   | 1 string mention in tests/playwright/walker/engine.mjs error message                              | delete          |
| pipeline/build_protocol_html.py      | legacy   | 11 refs in tests/e2e + tests/playwright/walker/audit_all.mjs; references non-existent dist/runtime.bundle.js | delete          |
| pipeline/build_runtime_bundle.sh     | legacy   | 4 refs in experiments/ + walker/audit_all.mjs; references non-existent src/scene_runtime/bundle/entry.ts | delete          |
| pipeline/build_scene_data.py         | legacy   | 0                                                                                                | delete          |
| pipeline/generate_svg_globals.py     | legacy   | 6 refs; emits to non-existent generated/svg_assets/ tree; superseded by tools/gen_svg_registry.py | delete          |
| pipeline/pipeline_utils.py           | legacy   | 0                                                                                                | delete          |

Result: pipeline/ wiped, ready to receive moved codegen entry points.

## tools/

| path                                       | category       | live references                                                                                | action              |
| ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| tools/build_main_bundle.mjs                | runtime-build  | build_github_pages.sh:70                                                                       | move to pipeline/   |
| tools/gen_object_library.py                | codegen        | package.json (6 npm script entries)                                                            | move to pipeline/   |
| tools/gen_protocols.py                     | codegen        | package.json; tests/e2e/e2e_gen_protocols.py; tests/playwright/test_launcher.mjs comment; src/shell/adapter/types.ts comment | move to pipeline/   |
| tools/gen_scene_index.py                   | codegen        | package.json; tests/e2e/e2e_gen_scene_index.py; imports scene_inheritance                       | move to pipeline/   |
| tools/gen_svg_registry.py                  | codegen        | package.json; imports svg_validate                                                              | move to pipeline/   |
| tools/list_protocols.py                    | runtime-build  | build_github_pages.sh (3 refs)                                                                  | move to pipeline/   |
| tools/scene_inheritance.py                 | codegen helper | imported by tools/gen_scene_index.py                                                            | move to pipeline/   |
| tools/build_probe.sh                       | dev-tool       | 0 live refs                                                                                     | keep in tools/      |
| tools/build_test_fixture.sh                | dev-tool       | 0 live refs                                                                                     | keep in tools/      |
| tools/check_css_content_policy.py          | dev-tool       | check_codebase.sh step 5                                                                        | keep in tools/      |
| tools/check_dist_ready.sh                  | dev-tool       | package.json serve script                                                                       | keep in tools/      |
| tools/contrast_calculator.py               | dev-tool       | 0 live refs (docs only)                                                                         | keep in tools/      |
| tools/html_to_pdf.mjs                      | dev-tool       | package.json pdf script                                                                         | keep in tools/      |
| tools/inject_liquid_anchors.py             | legacy         | 0 live refs                                                                                     | delete              |
| tools/normalize_svg_v2.py                  | dev-tool       | tools/svg_picker/apply_decisions.py                                                              | keep in tools/      |
| tools/run_protocol_walkthrough.py          | dev-tool       | mentioned by tools/run_smoke.py                                                                 | keep in tools/      |
| tools/run_smoke.py                         | dev-tool       | src/dist_entry.tsx comment                                                                       | keep in tools/      |
| tools/run_ui_review_podman.sh              | dev-tool       | 0 live refs                                                                                     | keep in tools/      |
| tools/scorecard_m2.mjs                     | dev-tool       | eslint.config.js                                                                                | keep in tools/      |
| tools/seam_types_compile_check.ts          | dev-tool       | 0 live refs                                                                                     | keep in tools/      |
| tools/svg_picker/                          | dev-tool       | self-contained subtree                                                                          | keep in tools/      |
| tools/svg_validate.py                      | dev-tool       | tests/test_svg_validate.py; will be imported by relocated pipeline/gen_svg_registry.py via sys.path | keep in tools/   |
| tools/validate_svg_registry.py             | dev-tool       | imports svg_validate (same dir)                                                                 | keep in tools/      |

## Cross-script Python import handling

Per PYTHON_STYLE.md (no `from package import name`, bare-module imports
acceptable for sibling files), relocated codegen scripts that import a sibling
get a `sys.path.insert(0, os.path.dirname(__file__))` near the top. This
preserves the existing `import scene_inheritance` and `import svg_validate`
patterns. svg_validate is kept in tools/, so pipeline/gen_svg_registry.py
adds the tools/ dir to sys.path explicitly.
