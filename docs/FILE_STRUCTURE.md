# File structure

## Top-level layout

| Path | Purpose |
| --- | --- |
| [README.md](../README.md) | Project overview and quick start |
| [AGENTS.md](../AGENTS.md) | AI agent coding rules and pointers |
| [CLAUDE.md](../CLAUDE.md) | Claude Code rule manifest (loads style docs) |
| [VERSION](../VERSION) | CalVer version string |
| [LICENSE.LGPL_v3](../LICENSE.LGPL_v3) | Code license |
| [LICENSE.CC_BY_4_0](../LICENSE.CC_BY_4_0) | Content license |
| [build_github_pages.sh](../build_github_pages.sh) | Canonical production build into `dist/` |
| [run_web_server.sh](../run_web_server.sh) | Build then serve `dist/` on local network |
| [check_codebase.sh](../check_codebase.sh) | Aggregate lint, typecheck, and test gate |
| [source_me.sh](../source_me.sh) | Bash environment for Python 3.12 |
| [package.json](../package.json) | Node dev dependencies and npm scripts |
| [tsconfig.json](../tsconfig.json) | Repo-root TypeScript compiler config (strict) |
| [tsconfig.lint.json](../tsconfig.lint.json) | Wider typecheck covering `tests/` and `tools/` |
| [pip_requirements-dev.txt](../pip_requirements-dev.txt) | Python dev dependencies (pytest, pyflakes) |
| [eslint.config.js](../eslint.config.js) | ESLint flat config |
| [REPO_TYPE](../REPO_TYPE) | Repo type marker (`typescript`) |

## Key subtrees

### `src/` - Authored TypeScript runtime

Browser entry points, scene runtime, and shell HUD. All authored; nothing
under `src/` is generated.

```text
src/
+- dist_entry.tsx              -- bundle entry; DOM-presence router
+- launcher_entry.tsx          -- launcher bundle entry
+- protocol_host_entry.tsx     -- protocol-host bundle entry
+- protocol_host.tsx           -- wires pipeline, renderer, step machine, HUD
+- index.html                  -- bench page (smoke target)
+- style.css                   -- stylesheet (copied to dist/)
+- launcher/
|  +- index.html               -- launcher HTML page
|  +- Launcher.tsx             -- Solid protocol-selector component
|  `- main.tsx                 -- launcher Solid mount
+- scene_runtime/
|  +- layout/                  -- multi-pass layout pipeline
|  |  +- run_pipeline.ts       -- top-level pipeline runner
|  |  +- types.ts              -- PipelineResult, ComputedItem, layout types
|  |  +- constants.ts          -- DEFAULT_VIEWPORT, shrink factor
|  |  +- workspace_row_library.ts -- Schema B row templates
|  |  `- (bind_objects, normalize_schema, resolve_inheritance, scale_to_real_world,
|  |      group_by_zone, horizontal_layout, vertical_layout, layout_labels,
|  |      clamp_scene_bounds, footprint, wrap_label, index).ts
|  +- protocol/                -- step machine and protocol drivers
|  |  +- resolve_entry_scene.ts -- entry-scene resolution + empty-scene guard
|  |  +- step_machine.ts       -- pure step machine (no DOM)
|  |  +- validators.ts         -- interaction and step validator dispatch
|  |  +- scene_operations.ts   -- five SceneOperation primitives (stubbed)
|  |  +- click_resolver.ts     -- DOM click -> step machine
|  |  `- emitter.ts            -- ProtocolShellEmitter, RuntimeEmitterHandle
|  `- renderer/                -- DOM rendering from PipelineResult
|     +- render_scene.ts       -- top-level renderer (clear, guards, bg, items, labels)
|     +- render_item.ts        -- per-item render + missing-svg placeholder
|     +- render_label.ts       -- label element rendering
|     +- render_background.ts  -- background (gradient or asset)
|     +- structural_guards.ts  -- six layout validation guards
|     +- inject_svg.ts         -- inline SVG injection from ASSET_SPECS
|     `- index.ts              -- barrel: renderScene
`- shell/
   +- adapter/
   |  `- types.ts              -- closed seam: ProtocolConfig, ShellViewSnapshot, events, ops
   +- signals.ts               -- Solid signal helpers + subscribeEmitterToSnapshot
   +- hud/
   |  `- ProtocolHud.tsx       -- mounts four region components into named DOM targets
   `- regions/
      +- StepOutline.tsx       -- read-only ordered step cards
      +- TipsBubble.tsx        -- professor-tip bubble
      +- StepCounter.tsx       -- completed/total counter
      `- GuidanceBar.tsx       -- current-step prompt
```

The framed interface uses six named DOM regions in `src/protocol_host_template.html`:
`header` (tips + counter), `scene` (bounded 16:9 panel), `outline` (step list),
and `guidance` (teal prompt bar). `#shell-root` is a sibling of `#scene-root`,
never an ancestor.

### `pipeline/` - Codegen and build scripts

Every script that emits to `generated/`, assembles bundles, or produces
`dist/` artifacts. Invoked by `package.json` pre-hooks and
`build_github_pages.sh`.

| File | Purpose |
| --- | --- |
| [gen_object_library.py](../pipeline/gen_object_library.py) | `content/objects/` YAML -> `generated/object_library.ts` |
| [gen_svg_registry.py](../pipeline/gen_svg_registry.py) | `assets/equipment/*.svg` -> `generated/svg_registry.ts` |
| [gen_scene_index.py](../pipeline/gen_scene_index.py) | Scene YAML -> `generated/scenes.ts`; `--missing-svg=strict|placeholder` |
| [gen_protocols.py](../pipeline/gen_protocols.py) | Protocol YAML -> `generated/protocols.ts` + `generated/protocols_index_slim.ts` |
| [build_protocol_index.py](../pipeline/build_protocol_index.py) | Protocol index build helpers |
| [list_protocols.py](../pipeline/list_protocols.py) | Reads `PROTOCOLS_INDEX`; `emit` writes one `dist/<name>.html` per protocol |
| [scene_inheritance.py](../pipeline/scene_inheritance.py) | Scene YAML inheritance resolution library (imported by gen_scene_index) |
| [build_main_bundle.mjs](../pipeline/build_main_bundle.mjs) | esbuild Node API: bundles launcher and protocol-host entries |

### `content/` - Authored YAML

All authored YAML; nothing under `content/` is generated or gitignored.

```text
content/
+- objects/                    -- reusable object definitions by kind
|  +- bottle/, equipment/, flask/, pipette/, plate/, rack/, waste/, decoration/
+- base_scenes/                -- shared base scenes (bench, hood, microscope, etc.)
+- protocols/
|  +- cell_culture/            -- cell culture mini-protocols and runners
|  +- sdspage/                 -- SDS-PAGE mini-protocols and runners
|  `- runners/                 -- sequence-runner protocols
+- objects_quarantine/         -- quarantined objects pending restoration review
`- base_scenes_quarantine/     -- quarantined base scenes pending restoration review
```

Each mini-protocol folder contains:

```text
content/protocols/<cluster>/<protocol_name>/
+- protocol.yaml               -- protocol_type, entry_step, learning block, steps
+- materials.yaml              -- material definitions for this protocol
`- scenes/                     -- per-protocol scene YAML overrides
```

### `validation/` - YAML and scene validators

Standalone Python validators. Entry point: [validation/validate.py](../validation/validate.py).

```text
validation/
+- validate.py                 -- aggregate entry: runs every validation stage
+- yaml_schema/                -- schema + cross-field rules for protocol, object, scene YAML
+- stepper/                    -- step-flow walker: simulates execution, checks semantics
+- svg/                        -- SVG asset usage audit
+- manual/                     -- human-readable protocol manual renderer
+- scene_lint/                 -- pre-render failure predictor (Group A BLOCKED, Group B advisory)
+- scene_design/               -- composition scorecard (weighted metrics, advisory only)
+- scene_calc/                 -- pure-function geometry primitives shared by lint and design
+- structure/                  -- layout structural check
`- shared_toolkit/             -- discovery, YAML I/O, findings, reporter, CLI helpers
```

### `tests/` - Test suite

Three tiers isolated by [tests/conftest.py](../tests/conftest.py)
(`collect_ignore = ["e2e", "playwright"]`).

```text
tests/
+- conftest.py                 -- pytest config; collect_ignore for e2e and playwright
+- test_*.py                   -- fast pytest: pyflakes, ASCII, indent, shebang, imports, etc.
+- test_*.mjs                  -- Node unit tests (run by node --import tsx --test)
+- TESTS_README.md             -- test-suite overview
+- git_file_utils.py           -- shared REPO_ROOT helper
+- content/
|  `- dev_smoke/               -- dev-smoke protocol fixtures (same schema as content/)
+- data/                       -- baseline snapshots used by pytest fixtures
+- e2e/                        -- non-browser E2E runners (e2e_*.py, e2e_*.sh)
+- fixtures/                   -- generated test fixtures (gitignored)
`- playwright/                 -- browser-driven tests
   +- repo_root.mjs            -- shared REPO_ROOT resolver
   +- test_*.mjs               -- browser tests (framed layout, initial scene, etc.)
   +- walker/                  -- shared Playwright walker engine
   `- e2e/                     -- full-path YAML walkthroughs
```

Key pytest files:

| File | Purpose |
| --- | --- |
| [tests/test_pyflakes_code_lint.py](../tests/test_pyflakes_code_lint.py) | Pyflakes lint gate |
| [tests/test_ascii_compliance.py](../tests/test_ascii_compliance.py) | ASCII source check |
| [tests/test_markdown_links.py](../tests/test_markdown_links.py) | Markdown link validity |
| [tests/test_shebangs.py](../tests/test_shebangs.py) | Shebang consistency |
| [tests/test_import_dot.py](../tests/test_import_dot.py) | Forbids relative imports |
| [tests/test_import_requirements.py](../tests/test_import_requirements.py) | Third-party imports declared |
| [tests/test_test_naming_conventions.py](../tests/test_test_naming_conventions.py) | Test layout and naming |
| [tests/test_spec_docs_no_camelcase_yaml.py](../tests/test_spec_docs_no_camelcase_yaml.py) | Spec doc camelCase gate |
| [tests/test_walker_no_step_branches.py](../tests/test_walker_no_step_branches.py) | Walker must not branch on step name |

Key Node test files:

| File | Purpose |
| --- | --- |
| [tests/test_layout_engine.mjs](../tests/test_layout_engine.mjs) | Layout pipeline unit tests |
| [tests/test_step_machine.mjs](../tests/test_step_machine.mjs) | Step machine unit tests |
| [tests/test_structural_guards.mjs](../tests/test_structural_guards.mjs) | Structural guard unit tests |
| [tests/test_resolve_entry_scene.mjs](../tests/test_resolve_entry_scene.mjs) | Entry-scene resolution unit tests |
| [tests/test_render_item_missing_svg.mjs](../tests/test_render_item_missing_svg.mjs) | Missing-SVG placeholder contract |
| [tests/test_scene_operations.mjs](../tests/test_scene_operations.mjs) | Scene operations unit tests |
| [tests/test_protocol_emitter.mjs](../tests/test_protocol_emitter.mjs) | Emitter unit tests |
| [tests/test_shell_signals.mjs](../tests/test_shell_signals.mjs) | Shell signal binding tests |
| [tests/test_m2_integration.mjs](../tests/test_m2_integration.mjs) | M2 framed-layout integration |

### `assets/` - Source SVG art

`assets/equipment/` contains tracked source SVG files for all lab objects.
Sidecar `*.colormap.json` files group element ids for the recolor pipeline.
Processed by [pipeline/gen_svg_registry.py](../pipeline/gen_svg_registry.py).

### `tools/` - Developer-only helpers

Scripts that do not appear in any build chain. See [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md)
for the full list.

### `devel/` - Maintainer scripts

| File | Purpose |
| --- | --- |
| [devel/setup_playwright.sh](../devel/setup_playwright.sh) | Idempotent Playwright (chromium) install |
| [devel/setup_typescript.sh](../devel/setup_typescript.sh) | TypeScript dev environment setup |
| [devel/dist_clean.sh](../devel/dist_clean.sh) | Wipe `generated/` and `dist/` |
| [devel/rotate_changelog.py](../devel/rotate_changelog.py) | Changelog rotation (keeps two newest day blocks) |
| [devel/query_changelog.py](../devel/query_changelog.py) | Changelog search by date, category, keyword |
| [devel/commit_changelog.py](../devel/commit_changelog.py) | Draft commit message from new changelog entries |
| [devel/bump_version.py](../devel/bump_version.py) | Version bump helper |

### `docs/` - Documentation

| File | Purpose |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Chronological record of changes |
| [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) | System design, components, and data flow |
| [FILE_STRUCTURE.md](FILE_STRUCTURE.md) | This file |
| [INSTALL.md](INSTALL.md) | Prerequisites and setup |
| [USAGE.md](USAGE.md) | Build and run instructions |
| [AUTHORS.md](AUTHORS.md) | Maintainers and contributors |
| [ROADMAP.md](ROADMAP.md) | Planned work |
| [TODO.md](TODO.md) | Backlog scratchpad |
| [E2E_TESTS.md](E2E_TESTS.md) | E2E test conventions |
| [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) | Playwright browser-test usage |
| [PYTEST_STYLE.md](PYTEST_STYLE.md) | Pytest conventions |
| [PYTHON_STYLE.md](PYTHON_STYLE.md) | Python conventions |
| [TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md) | TypeScript conventions |
| [MARKDOWN_STYLE.md](MARKDOWN_STYLE.md) | Markdown formatting rules |
| [REPO_STYLE.md](REPO_STYLE.md) | Repo-wide conventions |
| [PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md) | Hard design invariants |
| [PRIMARY_DESIGN.md](PRIMARY_DESIGN.md) | Design philosophy |
| [PRIMARY_SPEC.md](PRIMARY_SPEC.md) | Technical specification |
| [CLAUDE_HOOK_USAGE_GUIDE.md](CLAUDE_HOOK_USAGE_GUIDE.md) | Claude Code permissions hook reference |
| [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md) | Canonical protocol vocabulary |
| [specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md) | Protocol YAML schema reference |
| [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) | Worked authoring example |
| [specs/PROTOCOL_STEPS.md](specs/PROTOCOL_STEPS.md) | Step-flow architecture |
| [specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md) | Canonical scene vocabulary |
| [specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md) | Scene YAML schema reference |
| [specs/SCENE_ARCHITECTURE.md](specs/SCENE_ARCHITECTURE.md) | Scene wiring and runtime |
| [specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md) | Canonical object vocabulary |
| [specs/OBJECT_YAML_FORMAT.md](specs/OBJECT_YAML_FORMAT.md) | Object-definition YAML schema reference |
| [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) | Layout-engine placement reference |
| [specs/MATERIAL_CONVENTION.md](specs/MATERIAL_CONVENTION.md) | Material vocabulary and liquid rendering |
| [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) | SVG asset ownership and pipeline |
| [specs/SCALING_MODEL.md](specs/SCALING_MODEL.md) | Scaling model notes |
| [specs/WALKTHROUGH_GUIDE.md](specs/WALKTHROUGH_GUIDE.md) | Real-browser protocol walkthrough guide |
| [specs/SPEC_DESIGN_CHECKLIST.md](specs/SPEC_DESIGN_CHECKLIST.md) | Author YAML vocabulary lock checklist |
| `active_plans/` | In-flight plan documents (active, audits, reports, decisions, workstreams) |
| `archive/` | Archived plans and design notes |

## Generated artifacts

All gitignored (see [.gitignore](../.gitignore)):

| Path | Source script |
| --- | --- |
| `generated/object_library.ts` | [pipeline/gen_object_library.py](../pipeline/gen_object_library.py) |
| `generated/svg_registry.ts` | [pipeline/gen_svg_registry.py](../pipeline/gen_svg_registry.py) |
| `generated/scenes.ts` | [pipeline/gen_scene_index.py](../pipeline/gen_scene_index.py) |
| `generated/protocols.ts` | [pipeline/gen_protocols.py](../pipeline/gen_protocols.py) |
| `generated/protocols_index_slim.ts` | [pipeline/gen_protocols.py](../pipeline/gen_protocols.py) |
| `dist/` | [build_github_pages.sh](../build_github_pages.sh) (GitHub Pages bundle) |
| `test-results/` | Playwright screenshots and reports |
| `node_modules/` | npm install output |

The `generated/` tree is rebuilt from current YAML and SVG sources on every
build. Do not place authored files there.

## Documentation map

| Question | Document |
| --- | --- |
| How is the system designed? | [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) |
| Where does each file live? | This file |
| What are the hard rules? | [PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md) |
| What is the YAML schema? | [specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md), [specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md), [specs/OBJECT_YAML_FORMAT.md](specs/OBJECT_YAML_FORMAT.md) |
| How do I author a protocol? | [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) |
| How do I set up the repo? | [INSTALL.md](INSTALL.md) |
| How do I run the game? | [USAGE.md](USAGE.md) |
| What is planned next? | [ROADMAP.md](ROADMAP.md) and [TODO.md](TODO.md) |

## Where to add new work

| Type | Location |
| --- | --- |
| New mini-protocol | `content/protocols/<cluster>/<name>/` with `protocol.yaml`, `scenes/`, `materials.yaml` |
| New base scene | `content/base_scenes/<name>.yaml` |
| New lab object | `content/objects/<kind>/<name>.yaml` |
| New SVG asset | `assets/equipment/<name>.svg` (plus optional `<name>.colormap.json`) |
| New pipeline generator | `pipeline/` (register in `package.json` pre-hooks; update these two docs) |
| New shell region | `src/shell/regions/` (mount in `src/shell/hud/ProtocolHud.tsx`) |
| New runtime module | `src/` (imported from entry or scene runtime) |
| New validation rule | `validation/yaml_schema/` or `validation/scene_lint/` |
| Fast pytest test | `tests/test_*.py` |
| Node unit test | `tests/test_*.mjs` |
| Playwright browser test | `tests/playwright/test_*.mjs` |
| Full-path walkthrough | `tests/playwright/e2e/` |
| Non-browser E2E | `tests/e2e/e2e_*.py` or `tests/e2e/e2e_*.sh` |
| Developer utility | `tools/` (never `pipeline/`) |
| Documentation | `docs/` with SCREAMING_SNAKE_CASE filename |
| Spec vocabulary | `docs/specs/` |
| Active plans | `docs/active_plans/active/`, `audits/`, `reports/`, `decisions/`, or `workstreams/` |
