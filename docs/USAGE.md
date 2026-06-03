# Usage

This doc explains how to build, render, and test the virtual lab protocol system. Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md).

## Quick start

From a fresh clone, one command brings up the server:

```bash
bash run_web_server.sh
```

`run_web_server.sh` installs npm dependencies if `node_modules` is missing, builds the site via [build_github_pages.sh](../build_github_pages.sh), and serves `dist/` on a random port with the protocol selector page open.

The npm aliases still work as thin wrappers around the shell scripts:

```bash
npm run build    # bash build_github_pages.sh
npm run serve    # bash run_web_server.sh
npm run check    # bash check_codebase.sh
npm run clean    # bash devel/dist_clean.sh
```

`npm run build` generates the typed TypeScript modules and bundles the renderer to produce `dist/`. Unlike `run_web_server.sh`, `build_github_pages.sh` does not install dependencies: it errors if `node_modules` is missing so it stays clean for CI / GitHub Pages (where the workflow runs `npm ci` first). A CI build must also provide `python3` and `pyyaml`, since the generators run inside the build.

## Build pipeline and file generation

The system compiles scene, object, and protocol definitions into typed TypeScript modules at build time. [build_github_pages.sh](../build_github_pages.sh) calls [pipeline/build_generated.sh](../pipeline/build_generated.sh), which wipes and regenerates `generated/` from source before type-checking and bundling. A fresh clone builds without any separate manual step. [check_codebase.sh](../check_codebase.sh) only checks the codebase; it never generates. Build `generated/` first (it is imported by the typechecked source).

To regenerate the `generated/` tree on its own (for debugging):

```bash
bash pipeline/build_generated.sh
```

`build_generated.sh` is the single source of truth for generator order. Run order is load-bearing: `gen_scene_index.py` reads `generated/object_library.ts`, so `gen_object_library.py` must run first.

### Generator scripts (under `pipeline/`)

- `gen_object_library.py`: Reads object YAML from `content/objects/**/*.yaml`, validates against closed `KINDS` enum and asset references, emits `generated/object_library.ts` with typed `OBJECT_LIBRARY` and `ASSET_SPECS`.
- `gen_svg_manifest.py`: Scans `assets/**/*.svg` for all tracked SVG files, validates SVG structure, emits `generated/svg_manifest.ts` mapping each `asset_name` to a relative SVG file path plus `generated/svg_placeholder_keys.ts` (build/test-only), and removes any stale `generated/svg_registry.ts`. It does not copy SVGs; the static SVG files are copied to `dist/assets/svg/` by `build_github_pages.sh` at bundle time. There is no inline `SVG_REGISTRY` markup blob; the runtime loads SVG via the manifest plus `fetch()`.
- `gen_scene_index.py`: Reads scene YAML from `content/base_scenes/*.yaml` and per-protocol scene files, validates placements against the object library, emits `generated/scenes.ts` with typed `SCENES` object and `generated/scene_manifest.json`. Accepts `--missing-svg=strict|placeholder` (placeholder is default; see [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) for details).
- `gen_protocols.py`: Reads `protocol.yaml` from `content/protocols/**/` and smoke fixtures, validates against the closed protocol schema, emits `generated/protocols.ts` and `generated/protocols_index_slim.ts`.

The `generated/` directory is gitignored; everything in it is a build artifact, never committed, and is fully rebuilt by `build_generated.sh`. Source of truth is `content/`, `assets/`, and the generator scripts themselves. Run `bash pipeline/build_generated.sh` before anything that imports from `generated/` (a standalone test, or `bash check_codebase.sh`, which checks the codebase only and never generates).

### Render flow

The entry point resolves the initial scene from the protocol's `entry_step` at runtime via
`resolve_entry_scene_name`. The default page served is the protocol selector; selecting a
protocol navigates to `<protocol_name>.html`, which loads the shared bundle and resolves
the initial scene from the protocol config.

```typescript
// Simplified render path (protocol_host.tsx)
const scene_name = resolve_entry_scene_name(config, PROTOCOLS);
const scene = SCENES[scene_name];
const result = runPipeline(scene, OBJECT_LIBRARY, ASSET_SPECS, viewport);
renderScene(root, result);
```

The pipeline (`src/scene_runtime/layout/`) takes a `SceneA` plus `OBJECT_LIBRARY`
and `ASSET_SPECS`, produces `PipelineResult.final: ComputedItem[]`, and passes the result to
`renderScene()`. The renderer (`src/scene_runtime/renderer/`) reads `ComputedItem` and emits
absolutely-positioned SVG-injected DOM elements.

No runtime YAML parsing and no `js-yaml` dependency. Non-SVG data (object library, scenes, protocols) is compiled at build time. SVG assets are the exception: `svg_manifest_loader.ts` uses runtime `fetch()` to load SVG files from `dist/assets/svg/` via the SVG manifest. The bundled `svg_registry` injection path has been removed; the manifest-plus-`fetch()` path is the only runtime SVG loader.

## Artifact locations

- **Runtime bundle:** `dist/` contains `main.js` (bundled ES module), `index.html`, `style.css`, and per-protocol HTML shells (empty stubs that load shared runtime data).
- **Visual artifacts:** `tests/playwright/artifacts/` stores Playwright screenshots, before/after comparisons, and visual reports.
- **Diagnostic reports:** `docs/active_plans/reports/` stores milestone reports, failure taxonomies, and M2c diagnostic metrics.
- **Generated data:** `generated/object_library.ts`, `generated/svg_manifest.ts` (canonical SVG artifact), `generated/scenes.ts`, `generated/protocols.ts`, and `generated/protocols_index_slim.ts` are produced by the generator scripts and gitignored. `generated/svg_registry.ts` is REMOVED: `gen_svg_manifest.py` deletes any stale copy, and the runtime loads SVG via `generated/svg_manifest.ts` (relative paths) and `svg_manifest_loader.ts` fetch.

## Scene rendering and render-yield stats

`tools/scene_to_png.mjs` is a developer tool that renders scenes via the scene viewer page and
writes structured render-yield stats. `build_github_pages.sh` runs it as its final build step.
It does not modify any source files.

```bash
# Render one named scene (stats.json, single summary to stdout)
node tools/scene_to_png.mjs --scene hood_basic

# Render all emitted scenes; writes one stats.json per emitted scene
node tools/scene_to_png.mjs --all

# Add optional human PNG screenshots under test-results/scenes/
node tools/scene_to_png.mjs --all --png

# Custom viewport
node tools/scene_to_png.mjs --all --viewport 1440x900
```

The npm alias `npm run scene:png -- <args>` also works.

Output directories (defaults):

- Machine stats: one `generated/scene_render_stats/<scene>.stats.json` per emitted scene (required validation input). These are never written under `test-results/`.
- Optional human PNG screenshots (`--png` only): `test-results/scenes/<scene>.png`, plus `summary.json` under `test-results/scenes/` for `--all`.

Categories reported per scene:

- `populated`: at least one real (non-placeholder) rendered item.
- `placeholder-only`: all rendered items are placeholders (missing-svg mode).
- `empty`: viewer-ready but zero rendered items.
- `load-failed`: page threw or timed out before the ready marker.
- `skipped`: manifest says outcome=skipped; no render attempted.

The `--missing-svg` flag (`strict` or `placeholder`) is a passthrough recorded in stats.json.
Changing the missing-svg mode requires a rebuild: `bash build_github_pages.sh`.

Speed design: one browser and one HTTP server for the entire run; waits on the
`#scene-root[data-viewer-ready="true"]` marker, not `networkidle`. Elapsed time
is reported per scene and as a total.

## Protocol rendering and step reachability

`tools/protocol_to_png.mjs` is a developer tool that renders protocol pages to PNG and reports
load outcomes and step reachability. It does not modify any source or generated files.

```bash
# Render the initial interface of one protocol (single PNG + console outcome)
node tools/protocol_to_png.mjs --protocol passage_hood_detachment

# Render all protocols; writes one PNG per protocol + summary.json + console table
node tools/protocol_to_png.mjs --all

# Render one protocol and attempt to reach each declared step via visible UI
node tools/protocol_to_png.mjs --protocol passage_hood_detachment --steps

# Render all protocols with step reachability matrix
node tools/protocol_to_png.mjs --all --steps

# Custom output directory and viewport
node tools/protocol_to_png.mjs --all --out /tmp/protocol_pngs --viewport 1440x900
```

The npm alias `npm run protocol:png -- <args>` also works.

Output directories (defaults):

- `--all` initial: `test-results/protocols_initial/`
- `--all --steps`: `test-results/protocols_steps/`

Load outcomes reported per protocol:

- `protocol-HTML-missing`: `dist/<name>.html` does not exist (run build first).
- `page-load-failure`: browser JS error or navigation failure.
- `shell-loaded-but-scene-empty`: shell regions present; scene has 0 items.
- `scene-loaded-but-guidance-missing`: scene items rendered; guidance bar absent.
- `populated`: scene has >= 1 item and guidance bar present.

Step records in `<protocol>.steps.json`:

- `reached`: step was reached via visible UI; PNG captured.
- `blocked`: step could not be reached (reason recorded: no visible advance control, etc.).

## Scene discovery and classification

`pipeline/gen_scene_index.py` discovers ALL base scenes (`content/base_scenes/*.yaml`) and
per-protocol scene files automatically -- there is no curated allowlist. For each scene it
emits one of three classifications into `generated/scene_manifest.json`:

- `emitted`: scene passed validation and was written to `generated/scenes.ts`.
- `skipped`: scene was skipped for a machine-readable reason (e.g. missing required objects,
  broken inheritance, incomplete precheck suite). The reason string is recorded in the manifest.
- `errored`: a fatal error occurred while processing the scene; the error message is recorded.

The source of truth for which scenes are available at runtime is `generated/scene_manifest.json`.
To understand why a scene is absent from `generated/scenes.ts`, inspect its entry there.

To keep a scene out of the emitted set it must have a genuine skip or error reason -- there is
no list to omit it from. Fix the underlying issue to promote a scene from `skipped` to `emitted`.

## Validation

All validation tools accept a unified command-line interface. The canonical invocation pattern uses `source_me.sh` to set `PYTHONPATH`:

```bash
source source_me.sh && python3 validation/validate.py
```

### Canonical entry point

`validation/validate.py` is the aggregate entry point for the full validation suite. It runs seven stages (YAML schema, SVG assets, protocol stepper, folder layout, manual lint, scene-lint, scene-design) with a unified command-line interface and overview-mode rich summary output.

### Render evidence and validation

Scene render-stats are renderer-derived BUILD evidence. `build_github_pages.sh` produces them as its final step (after `dist/` is built), via `node tools/scene_to_png.mjs --all`, writing one `generated/scene_render_stats/<scene>.stats.json` per emitted scene. The required validation evidence is therefore a declared build artifact, not a hidden cache.

`run_validate.sh` VALIDATES ONLY: it reads the existing `generated/scene_render_stats/*.stats.json` and never renders. If those stats are absent, the Python validator fails clearly via `MissingRenderEvidenceError`, pointing at `./build_github_pages.sh` as the fix. There is no self-heal step.

Machine-readable scene stats live under `generated/scene_render_stats/` (generated, required validation input). They never live under `test-results/`. The Python validators stay pure: `scene-lint` and `scene-design` read only `generated/scene_render_stats/<scene>.stats.json` and never parse PNG pixels or spawn Node.

PNG screenshots are OPTIONAL human artifacts. Produce them with `--png`:

```bash
# Optional human screenshots: writes test-results/scenes/<scene>.png
node tools/scene_to_png.mjs --all --png
```

`summary.json` is also an optional human run report under `test-results/scenes/`.

Clean-tree sequence (nothing else is needed between steps; the build produces the validation evidence):

```bash
devel/dist_clean.sh && devel/setup_typescript.sh && ./build_github_pages.sh && ./run_validate.sh
```

### Unified flag table

All validation CLIs (aggregate `validation/validate.py`, plus per-stage `python3 -m validation.yaml_schema`, `python3 -m validation.svg`, `python3 -m validation.stepper`, `python3 -m validation.scene_lint.cli`, `python3 -m validation.scene_design.cli`, and `python3 validation/manual/protocol_manual.py --validate`) accept this flag set:

| Long            | Short | Type     | Default | Notes                                                                                                                                                                                                                             |
| --------------- | ----- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--focus`       | `-f`  | flag     | off     | Run on protocols/objects/scenes touched by `git diff HEAD --cached` plus transitive dependents. Mutually exclusive with `--protocol`, `--object`, `--scene`.                                                                      |
| `--protocol`    | `-p`  | name(s)  | (all)   | One or more protocol names to validate.                                                                                                                                                                                           |
| `--object`      | `-o`  | name(s)  | (all)   | One or more object names. Alias: `--asset` / `-A`.                                                                                                                                                                                |
| `--scene`       | `-S`  | name(s)  | (all)   | One or more scene names.                                                                                                                                                                                                          |
| `--list`        | `-l`  | flag     | off     | List selectable entities for the tool and exit.                                                                                                                                                                                   |
| `--interactive` | `-i`  | flag     | off     | Numbered picker menu (no effect if stdin not a tty).                                                                                                                                                                              |
| `--quiet`       | `-q`  | flag     | off     | Suppress stage rows; findings + summary only. Mutually exclusive with `--verbose`.                                                                                                                                                |
| `--verbose`     | `-v`  | flag     | off     | Per-item state + inline warnings. Mutually exclusive with `--quiet`.                                                                                                                                                              |
| `--errors-only` | `-e`  | flag     | off     | Suppress warnings from output (exit code unchanged).                                                                                                                                                                              |
| `--strict`      | `-s`  | flag     | off     | Exit non-zero on warning in addition to error.                                                                                                                                                                                    |
| `--no-color`    | --    | flag     | off     | Suppress color output. Also honors `NO_COLOR` env var.                                                                                                                                                                            |
| `--json`        | `-j`  | flag     | off     | Emit unified JSON document.                                                                                                                                                                                                       |
| `--ndjson`      | `-J`  | flag     | off     | Stream one finding per line + final summary record.                                                                                                                                                                              |
| `--only`        | `-O`  | stage(s) | (all)   | Stage filter: `yaml`, `svg`, `stepper`, `structure`, `manual`, `scene-lint`, `scene-design` (aggregate entry only). `svg` runs both pipeline_check and asset_audit. `manual` runs `validation/manual/protocol_manual.py --validate`. `scene-lint` runs Group A + Group B render-failure predictors; `scene-design` runs the composition scorecard. |

Short-flag summary: `-f -p -o -S -l -i -q -v -e -s -j -J -O`, plus alias `-A` for `--asset`.

### Overview-mode examples

Default mode shows a one-screen rich summary (suitable for CI, local feedback, and humans):

```bash
validation/validate.py                          # whole suite
validation/validate.py --focus                  # git-scoped
validation/validate.py -p passage_hood_detachment
validation/validate.py -o cell_culture_dish
validation/validate.py -O yaml                  # YAML stage only
validation/validate.py -O structure             # folder layout stage only
validation/validate.py -O stepper -v            # stepper with per-step state
```

### Agent-mode examples

Use `--json` or `--ndjson` for tool consumption and parsing:

```bash
validation/validate.py --json | jq '.findings[]'
validation/validate.py --ndjson | jq -c 'select(.severity=="ERROR")'
validation/validate.py --protocol cell_culture_full --json > findings.json
```

### Per-stage direct invocation

Run individual validation stages directly (per-stage entry points ignore `--only`):

```bash
python3 validation/structure/layout_check.py
python3 -m validation.yaml_schema
python3 -m validation.svg
python3 -m validation.stepper
python3 validation/manual/protocol_manual.py --validate --all
python3 -m validation.scene_lint.cli -S content/base_scenes/*.yaml
python3 -m validation.scene_design.cli -S content/base_scenes/*.yaml
```

### Scene-lint specific flags

Beyond the unified flag set, `python3 -m validation.scene_lint.cli` accepts:

| Long                  | Type   | Default                                       | Notes                                                                                                                                                                                                       |
| --------------------- | ------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--report-only`       | flag   | off                                           | Print findings but exit 0 regardless (diagnostics).                                                                                                                                                         |
| `--validate-against`  | path   | (none)                                        | Path to `test-results/scene_lint/labeled_corpus.yaml` for confusion-table validation.                                                                                                                       |
| `--emit-confusion`    | path   | (none)                                        | Output stem; CLI emits one Markdown confusion file per rule.                                                                                                                                                |
| `--suppressions`      | path   | (none)                                        | Suppression manifest; matching Group B advisories are removed before output. Group A is never suppressible.                                                                                                 |
| `--promotions`        | path   | `validation/scene_lint/promotions.yaml`       | Promotion config; promoted-rule `ESCAPE_REQUIRED` findings cause exit 1 under `--strict`.                                                                                                                   |
| `--no-promotions`     | flag   | off                                           | Skip promotions loading entirely; with `--strict`, no ESCAPE_REQUIRED finding causes exit 1.                                                                                                                |

### Scene-design specific flags

Beyond the unified flag set, `python3 -m validation.scene_design.cli` accepts:

| Long              | Short | Type | Default | Notes                                                                                                                                            |
| ----------------- | ----- | ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--markdown`      | `-m`  | flag | off     | Emit Markdown card output instead of JSONL.                                                                                                       |
| `--no-history`    | --    | flag | off     | Skip appending a row to `test-results/scene_design/history/scorecard_history.jsonl` (useful for dry runs and tests).                              |

Quarterly rollups are produced via the separate manual-trigger script:

```bash
python3 -m validation.scene_design.quarterly \
    --quarter 2026-Q2 \
    --history-path test-results/scene_design/history/scorecard_history.jsonl \
    --out docs/active_plans/active/scene_lint/scorecard_quarterly_2026-Q2.md
```

## Testing

### Browser smoke test (fast 9-gate check)

```bash
source source_me.sh && python3 tools/run_smoke.py
```

This verifies the app loads and renders the first 9 bench gates. Fast signal for CI/local feedback.

### Full protocol walkthrough

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py
```

This builds the game, then runs the YAML-driven UI walker to completion of the active protocol. Run with `--wrong-order` to verify soft-fail recovery:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --wrong-order
```

Run on a specific protocol:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_split
```

### Unit and integration tests

```bash
source source_me.sh && python3 -m pytest tests/
```

Run only changed files for faster feedback:

```bash
FAST_REPO_HYGIENE=1 source source_me.sh && python3 -m pytest tests/
```

### Other browser and tool commands

These run directly (they are no longer npm aliases). Run a build first if they depend on `dist/` or `generated/`:

```bash
node tests/playwright/test_game_ui.mjs    # browser smoke walkthrough
node tests/playwright/ui_review.mjs       # UI review capture
node tools/html_to_pdf.mjs --input report.html --output test-results/report.pdf
```

## Where to find more

- [docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md): design philosophy and flow-before-implementation discipline.
- [docs/PRIMARY_SPEC.md](PRIMARY_SPEC.md): technical specification, protocol types, schema, and runtime expectations.
- [docs/PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md): hard design invariants and non-negotiables.
- [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md): how to author a new protocol (worked example).
- [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md): system design, major components, and data flow.
- [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md): directory map and file purposes.
