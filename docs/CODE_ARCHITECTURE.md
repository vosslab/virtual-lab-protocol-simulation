# Code architecture

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Overview

An interactive browser-based educational simulation that teaches cell culture
laboratory techniques. The game is authored as TypeScript ES modules under
[src/](../src/) and bundled by esbuild into a browser bundle. Two artifacts
are produced from the same sources:

- A GitHub Pages-ready directory at [dist/](../dist/) (separate `index.html`,
  `style.css`, `main.js`).
- A portable, fully self-contained single-file HTML at
  [dist-single/game.html](../dist-single/) for sharing without a server.

Protocol content lives as YAML in [src/content/](../src/content/) and is
compiled into TypeScript modules by [tools/build_protocol_data.py](../tools/build_protocol_data.py)
before each build. A pytest test suite plus Playwright browser tests support
local development.

## Major components

### TypeScript game modules ([src/](../src/))

The game is authored as ES modules. [src/init.ts](../src/init.ts) is the
single bundle entry point; esbuild walks the import graph and produces one
JavaScript output. There is no concatenation step.

#### Core runtime

- [src/init.ts](../src/init.ts) - Bootstrap, protocol graph validation,
  completion-event coverage check, render dispatcher.
- [src/constants.ts](../src/constants.ts) - `ProtocolStep`, `Interaction`,
  `CompletionPath` types and shared layout constants.
- [src/types.ts](../src/types.ts) - Shared runtime type definitions.
- [src/game_state.ts](../src/game_state.ts) - `GameState` interface,
  initial state, `completeStep()`, mutation helpers.
- [src/cell_model.ts](../src/cell_model.ts) - Cell population model with an
  IC50-style drug-response curve.
- [src/scoring.ts](../src/scoring.ts) - Final score across order,
  cleanliness, waste, and timing.

#### Scenes

- [src/scenes/bench.ts](../src/scenes/bench.ts) - Bench scene rendering
  and click handlers.
- [src/scenes/hood.ts](../src/scenes/hood.ts) - Sterile hood scene; owns
  `dispatchInteractionClick` and tool selection.
- [src/scenes/incubator.ts](../src/scenes/incubator.ts) - Incubator
  placement scene.
- [src/scenes/microscope.ts](../src/scenes/microscope.ts) - Microscope and
  plate-reader scenes. Supports both auto-counter modal (tutorial_cell_counter)
  and manual hemocytometer quadrant counting (tutorial_hemocytometer_count).
- [src/scenes/plate.ts](../src/scenes/plate.ts) - 96-well plate workspace
  scene; modal-style overlay for plate intro and carboplatin-addition screens
  (tutorial_plate_intro).

#### Step modules

Per-step UI and emitter logic. Each module registers a completion-event
emitter via `triggerStep(stepId)`.

- [src/steps/feed_cells.ts](../src/steps/feed_cells.ts) - Media aspirate /
  add with volume validation.
- [src/steps/dilution_prep.ts](../src/steps/dilution_prep.ts) - Drug
  dilution preparation modal.
- [src/steps/drug_treatment.ts](../src/steps/drug_treatment.ts) - Drug
  pipetting flow.
- [src/steps/mtt_readout.ts](../src/steps/mtt_readout.ts) - MTT plate
  readout flow.
- [src/steps/plate_96.ts](../src/steps/plate_96.ts) - 96-well plate
  rendering.

#### Interaction and dispatch

- [src/interaction_resolver.ts](../src/interaction_resolver.ts) - Resolves
  the current interaction from `step.completionPath.interactions`.
- [src/step_dispatch.ts](../src/step_dispatch.ts) - Maps step kind
  (`interactionSequence` / `directTool` / `modal`) to handlers.
- [src/protocol_ui.ts](../src/protocol_ui.ts) - Protocol panel rendering
  (left sidebar).
- [src/ui_rendering.ts](../src/ui_rendering.ts) - Sidebar HUD, meters,
  warnings, results screen.
- [src/professor_overlay.ts](../src/professor_overlay.ts) - In-game hint
  overlay.

#### Layout and SVG art

- [src/layout_engine.ts](../src/layout_engine.ts) - Per-scene layout
  computation.
- [src/bench_config.ts](../src/bench_config.ts), [src/hood_config.ts](../src/hood_config.ts) -
  Scene-specific layout configs.
- [src/plate_config.ts](../src/plate_config.ts) - Plate scene layout config
  (bounds/zones/items/rules); exports are present but currently consumed by
  the modal-style renderer only, full layout-engine wiring is a follow-up.
- [src/scene_types.ts](../src/scene_types.ts) - Scene/zone enums and types.
- [src/style_constants.ts](../src/style_constants.ts) - Color and style
  tokens used by SVG and DOM rendering.
- [src/asset_specs.ts](../src/asset_specs.ts), [src/brands.ts](../src/brands.ts) -
  Asset metadata and brand-name helpers.
- [src/svg_assets.ts](../src/svg_assets.ts) - SVG composition helpers.
- [src/svg_overlays.ts](../src/svg_overlays.ts) - Overlay decorations
  (labels, badges) layered on SVG art.
- [src/svg_color_patch.ts](../src/svg_color_patch.ts) - Applies
  `SvgColorPatch[]` to a baked SVG string.
- [src/svg_recipes.ts](../src/svg_recipes.ts) - Maps semantic state to
  patch lists (`bottleLiquidPatches`, `T75LiquidVisual`, etc.).
- [src/svg_globals.ts](../src/svg_globals.ts) - Generated id manifest
  (regenerated each build; not tracked).
- [src/svg_globals.d.ts](../src/svg_globals.d.ts) - Type declarations for
  the generated manifest.

#### Content

- [src/content/cell_culture/](../src/content/cell_culture/) - Active
  protocol authored as YAML (items, reagents, protocol).
- Tutorial protocols (minimal protocols used by walker exercises):
  [src/content/tutorial_bench_direct/](../src/content/tutorial_bench_direct/),
  [src/content/tutorial_cell_counter/](../src/content/tutorial_cell_counter/),
  [src/content/tutorial_drug_dilution/](../src/content/tutorial_drug_dilution/),
  [src/content/tutorial_hemocytometer_count/](../src/content/tutorial_hemocytometer_count/),
  [src/content/tutorial_hood_transfer/](../src/content/tutorial_hood_transfer/),
  [src/content/tutorial_pbs/](../src/content/tutorial_pbs/),
  [src/content/tutorial_plate_intro/](../src/content/tutorial_plate_intro/),
  [src/content/tutorial_plate_reader/](../src/content/tutorial_plate_reader/),
  [src/content/tutorial_split/](../src/content/tutorial_split/).
- [src/content/protocol_data.ts](../src/content/protocol_data.ts) and
  [src/content/inventory_data.ts](../src/content/inventory_data.ts) -
  Generated TypeScript by [tools/build_protocol_data.py](../tools/build_protocol_data.py)
  (selected with `--protocol <name>`).
- [src/content/tools.ts](../src/content/tools.ts), [src/content/validate.ts](../src/content/validate.ts) -
  Build-side helpers that mirror generated data.

### Build pipeline

Two build entry points share a common pre-step:

1. [tools/build_protocol_data.py](../tools/build_protocol_data.py) parses
   `src/content/<protocol>/*.yaml`, applies the eight schema rules
   (including the `completionPath` Rule 8), and writes
   `src/content/protocol_data.ts` + `src/content/inventory_data.ts`. Build
   scripts run this with `--validate-only` first as a fast gate.
2. [tools/generate_svg_globals.py](../tools/generate_svg_globals.py) reads
   `assets/equipment/*.svg`, namespaces ids, and emits
   [src/svg_globals.ts](../src/svg_globals.ts).
3. `npx tsc --noEmit -p src/tsconfig.json` type-checks (no JS emit from tsc).
4. `npx esbuild src/init.ts --bundle ...` produces the JS bundle.

[build_github_pages.sh](../build_github_pages.sh) wipes [dist/](../dist/),
emits `--format=esm` to `dist/main.js`, copies `style.css`, assembles
`dist/index.html` from `head.html` + `body.html` + `tail.html` (linking
the external CSS and JS), and writes `.nojekyll` for GitHub Pages.

[export_single_file.sh](../export_single_file.sh) emits `--format=iife`
into a temporary `_bundle.js`, inlines `style.css` and the bundle into
`head.html` + `body.html` + `tail.html`, and writes a portable
`dist-single/game.html`. The two artifacts are independently buildable;
neither script touches the other's output directory.

### Local development server

[run_web_server.sh](../run_web_server.sh) runs
[build_github_pages.sh](../build_github_pages.sh) and serves
[dist/](../dist/) on a LAN-visible HTTP port (default 5080). This is the
canonical preview path. Playwright tests bootstrap-build their own
artifact via [tests/playwright/build_game_if_missing.mjs](../tests/playwright/build_game_if_missing.mjs).

### Test suite ([tests/](../tests/))

Three tiers, isolated by [tests/conftest.py](../tests/conftest.py)
(`collect_ignore = ["e2e", "playwright"]`):

- **Fast pytest** at the top level: pyflakes, bandit, ASCII compliance,
  whitespace, indentation, shebangs, import policy, init-file hygiene,
  protocol YAML validator (eight rules), test naming conventions.
- **Browser tests** under [tests/playwright/](../tests/playwright/): unit
  tests run inside a real page (resolver, interaction index, completion
  event coverage) and the data-layer
  [protocol_graph_smoke.mjs](../tests/playwright/protocol_graph_smoke.mjs).
- **Browser walkthroughs** under
  [tests/playwright/e2e/](../tests/playwright/e2e/): the canonical YAML
  walker [protocol_walkthrough_yaml.mjs](../tests/playwright/e2e/protocol_walkthrough_yaml.mjs)
  drives full protocols via DOM clicks; layout/scene checks live
  alongside.
- A reserved [tests/e2e/](../tests/e2e/) tree for non-browser shell or
  Python E2E runners (currently empty).

See [E2E_TESTS.md](E2E_TESTS.md) and [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md)
for tier-specific conventions.

## Data flow

```text
User input (click)
  |
  v
Scene event listeners (src/scenes/*.ts)
  |
  v
dispatchInteractionClick / step-kind handler (src/step_dispatch.ts)
  |
  v
GameState mutations (src/game_state.ts)
  |
  v
Validation (volume, interaction order, cleanliness)
  |
  v
warnings[] accumulation (real-time sidebar)
  |
  v
renderGame() dispatcher (src/init.ts)
  |
  v
Scene renderers (bench, hood, microscope, incubator, plate, plate reader)
  |
  v
SVG/HTML output to DOM
  |
  v
triggerStep(id) -> completeStep() advances protocol
  |
  v
Results scene -> calculateScore() -> star rating
```

## Game protocol

For authoring a new protocol from scratch, see
[PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md). The active
protocol id is `cell_culture` (25 steps modeling the OVCAR8 carboplatin
+ metformin MTT workflow). Tutorial protocols (`tutorial_bench_direct`,
`tutorial_cell_counter`, `tutorial_drug_dilution`, `tutorial_hood_transfer`,
`tutorial_pbs`, `tutorial_plate_intro`, `tutorial_plate_reader`,
`tutorial_split`) cover smaller subsets and exist primarily for walker
exercises.

Each step declares one `completionPath` of kind `interactionSequence`,
`directTool`, or `modal`. The walker dispatches by kind; legacy
`step.id`-based branches were removed in the K2 migration.

## Scoring

Four weighted categories in [src/scoring.ts](../src/scoring.ts):

| Category | Max points | Tracks |
| --- | --- | --- |
| Order | 30 | Steps completed in correct sequence |
| Cleanliness | 25 | Contamination and sterile-technique errors |
| Waste | 20 | Excess media usage |
| Timing | 25 | Speed to completion |

Final score maps to a 1-3 star rating.

## Testing and verification

```bash
source source_me.sh && python3 -m pytest tests/
node tests/playwright/protocol_graph_smoke.mjs
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --wrong-order
```

- **Linting:** pyflakes, bandit, ASCII compliance.
- **Style:** tab indentation, trailing whitespace, shebang consistency.
- **Imports:** no `import *`, no relative imports, all third-party in
  requirements files.
- **Protocol YAML:** eight validator rules enforced by
  [tests/test_protocol_yaml_validator.py](../tests/test_protocol_yaml_validator.py).
- **Browser walker:** drives the full protocol via DOM clicks; the
  `--wrong-order` flag injects bad clicks and verifies soft-fail recovery.

## Dynamic SVG recolor pipeline

Liquid color in the game is data-driven, not baked into static art:

1. **SVG art** owns shapes and stable ids. Liquid sub-objects carry ids
   like `liquid_<sha8>` (geometry-keyed) or named ids like
   `liquid_residue`.
2. **Generator** ([tools/generate_svg_globals.py](../tools/generate_svg_globals.py))
   reads `assets/equipment/*.svg`, namespaces every id with
   `<basename>__`, and emits the `SVG_IDS` and `SVG_GROUPS` manifests in
   [src/svg_globals.ts](../src/svg_globals.ts).
3. **Renderer** ([src/svg_color_patch.ts](../src/svg_color_patch.ts))
   applies `SvgColorPatch[]` to a baked SVG string. Patches address one
   element by namespaced id and write `fill`, `stroke` (via
   `strokeRole`), and/or `opacity`.
4. **Recipes** ([src/svg_recipes.ts](../src/svg_recipes.ts)) map semantic
   state (`T75LiquidVisual`, `BottleLiquid`) to patch lists.
5. **Sidecar JSON** (`assets/equipment/<basename>.colormap.json`) groups
   multiple authored ids under one semantic target with per-id opacity,
   so one role color drives a layered shading effect (base + shadow +
   highlight).

Design lock: only fill/stroke/opacity changes on authored ids. No new
geometry, no overlay engine, no state machines.

## Completion-event coverage policy (CE-3)

Each protocol has a coverage policy returned by
`getCoveragePolicy(protocolId)` in [src/init.ts](../src/init.ts). The
policy controls how missing completion-event emitters are handled at
startup:

- **STRICT** (used for `cell_culture` and unknown ids): any step missing
  a matching emitter throws via `showValidationError` with
  `'missing completion-event emitter'`.
- **RELAXED** (used for `tutorial_*` protocols): missing emitters are
  logged via `console.warn`; the page still loads.

`validateCompletionEventCoverage()` runs after all scene render functions
on the `load` event and compares declared steps against the set of
emitters populated by `triggerStep()` calls.

## Extension points

- **New protocol steps:** edit
  `src/content/<protocol>/protocol.yaml`, add a `completionPath` block
  (kind + required fields), wire a matching `triggerStep(id)` call in the
  scene that owns the step, and re-run
  [tools/build_protocol_data.py](../tools/build_protocol_data.py). See
  [PROTOCOL_STEPS.md](PROTOCOL_STEPS.md) and
  [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md).
- **New scenes:** add a module under [src/scenes/](../src/scenes/),
  import it from [src/init.ts](../src/init.ts), and register a render
  branch in the dispatcher.
- **Drug models:** modify the IC50 curve parameters in
  [src/cell_model.ts](../src/cell_model.ts).
- **Scoring adjustments:** change weights and thresholds in
  [src/scoring.ts](../src/scoring.ts).

## Known gaps

- Verification task: confirm whether non-browser
  [tests/e2e/](../tests/e2e/) is intended to remain empty or whether
  shell wrappers (currently in [tools/](../tools/)) belong there.
