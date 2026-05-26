# Usage

This doc explains how to build, render, and test the virtual lab protocol system. Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md).

## Quick start

```bash
npm run build
npm run serve
```

`npm run build` runs the codegen pipeline and TypeScript renderer to produce `dist/`. `npm run serve` starts a web server on a random port and opens the first allowlisted scene (currently `bench_basic`).

To build and serve in one step:

```bash
bash run_web_server.sh
```

## Build pipeline and codegen

The system uses build-time codegen to compile scene, object, and protocol definitions into typed TypeScript modules. [build_github_pages.sh](../build_github_pages.sh) regenerates `generated/` before type-checking and bundling, so a fresh clone can build without a separate manual codegen step.

For codegen-only debugging, run:

```bash
python3 pipeline/gen_object_library.py
python3 pipeline/gen_svg_registry.py
python3 pipeline/gen_scene_index.py
```

The same three Python scripts also run automatically as npm `pre*` hooks before non-build gates that import from `generated/`:

### Codegen scripts (under `pipeline/`)

- `gen_object_library.py`: Reads object YAML from `content/objects/**/*.yaml`, validates against closed `KINDS` enum and asset references, emits `generated/object_library.ts` with typed `OBJECT_LIBRARY` and `ASSET_SPECS`.
- `gen_svg_registry.py`: Scans `assets/**/*.svg` for all tracked SVG files, validates SVG structure, emits `generated/svg_registry.ts` with inline `SVG_REGISTRY` content (one base64-encoded entry per SVG).
- `gen_scene_index.py`: Reads scene YAML from `content/base_scenes/*.yaml`, validates placements against the object library, emits `generated/scenes.ts` with typed `SCENES` object exposing every scene as a `SceneA` instance.

The `generated/` directory is gitignored; codegen output is a build artifact, never committed. Source of truth is `content/`, `assets/`, and the codegen scripts themselves.

### Render flow

The entry point `src/main.ts` imports codegen outputs directly:

```typescript
import { SCENES } from "../generated/scenes.js";
import { SCENE_ALLOWLIST } from "./scene_allowlist";
// ...
const scene = SCENES.bench_basic;  // M2b hardcoded; M2c expands allowlist
const result = runPipeline(scene);
renderScene(root, result);
```

The pipeline (`src/scene_runtime/layout/`) takes a `SceneA` plus `OBJECT_LIBRARY` and `ASSET_SPECS`, produces `PipelineResult.final: ComputedItem[]`, and passes the result to `renderScene()`. The renderer (`src/scene_runtime/renderer/`) reads `ComputedItem` and emits absolutely-positioned SVG-injected DOM elements.

No runtime YAML parsing, no `fetch`, no `js-yaml` dependency. All data is compiled at build time.

## Artifact locations

- **Runtime bundle:** `dist/` contains `main.js` (bundled ES module), `index.html`, `style.css`, and per-protocol HTML shells (empty stubs that load shared runtime data).
- **Visual artifacts:** `tests/playwright/artifacts/` stores Playwright screenshots, before/after comparisons, and visual reports.
- **Diagnostic reports:** `docs/active_plans/reports/` stores milestone reports, failure taxonomies, and M2c diagnostic metrics.
- **Generated data:** `generated/object_library.ts`, `generated/svg_registry.ts`, `generated/scenes.ts` are produced by codegen and gitignored.

## Scene allowlist

Currently only `bench_basic` is in `SCENE_ALLOWLIST` and will render. Other scenes under `content/base_scenes/` are present for M2c generalization work but are SKIPPED at runtime until they pass the full precheck suite.

To expand the allowlist, update `src/scene_allowlist.ts` after confirming the scene passes validation:

```bash
source source_me.sh && python3 validation/validate.py --protocol <scene_name> -O structure
```

## Validation

All validation tools accept a unified command-line interface. The canonical invocation pattern uses `source_me.sh` to set `PYTHONPATH`:

```bash
source source_me.sh && python3 validation/validate.py
```

### Canonical entry point

`validation/validate.py` is the aggregate entry point for the full validation suite. It runs seven stages (YAML schema, SVG assets, protocol stepper, folder layout, manual lint, scene-lint, scene-design) with a unified command-line interface and overview-mode rich summary output.

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

## Where to find more

- [docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md): design philosophy and flow-before-implementation discipline.
- [docs/PRIMARY_SPEC.md](PRIMARY_SPEC.md): technical specification, protocol types, schema, and runtime expectations.
- [docs/PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md): hard design invariants and non-negotiables.
- [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md): how to author a new protocol (worked example).
- [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md): system design, major components, and data flow.
- [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md): directory map and file purposes.
