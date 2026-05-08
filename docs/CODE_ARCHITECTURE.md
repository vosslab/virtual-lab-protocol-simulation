# Code architecture

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Overview

An interactive browser-based educational simulation that teaches cell culture
laboratory techniques. The game compiles from TypeScript modules into a single
self-contained HTML file with no external runtime dependencies. A Python
development server and Playwright-based test suite support local development.

## Major components

### TypeScript game modules (`src/`)

The game logic lives in 12 TypeScript files compiled and concatenated into one
JavaScript bundle. All declarations are global (no ES module wrapping).

- [src/constants.ts](../src/constants.ts) - Protocol step definitions,
  plate layout, scoring weights, and the `ProtocolStep` interface
- [src/game_state.ts](../src/game_state.ts) - `GameState` interface and
  well plate initialization
- [src/cell_model.ts](../src/cell_model.ts) - Cell population model with
  IC50-style drug response curve
- [src/svg_assets.ts](../src/svg_assets.ts) - SVG rendering for all visual
  elements (largest module)
- [src/scenes/hood.ts](../src/scenes/hood.ts) - Sterile hood interaction
  scene with click-based tool selection and load/discharge handling
- [src/scenes/microscope.ts](../src/scenes/microscope.ts) - Cell counting
  via hemocytometer quadrant selection
- [src/scenes/incubator.ts](../src/scenes/incubator.ts) - Incubation
  placement scene
- [src/steps/feed_cells.ts](../src/steps/feed_cells.ts) - Media aspiration and
  addition logic with volume validation
- [src/steps/drug_treatment.ts](../src/steps/drug_treatment.ts) - Serial dilution
  series selection (half-log, binary, shallow)
- [src/ui_rendering.ts](../src/ui_rendering.ts) - Sidebar HUD, warning
  banner, and score display
- [src/scoring.ts](../src/scoring.ts) - Final score calculation across
  four categories (order, cleanliness, waste, timing)
- [src/init.ts](../src/init.ts) - Bootstrap, protocol validation, and
  render dispatcher

### Build pipeline (`build_github_pages.sh`)

[build_github_pages.sh](../build_github_pages.sh) concatenates TypeScript files
in dependency order, compiles to JavaScript via esbuild (ES2020 target,
type-stripping only), and assembles the final HTML from
[src/head.html](../src/head.html), [src/style.css](../src/style.css),
[src/body.html](../src/body.html), and [src/tail.html](../src/tail.html).

### Local development server (`run_web_server.sh`)

[run_web_server.sh](../run_web_server.sh) rebuilds the game via [build_github_pages.sh](../build_github_pages.sh),
then serves [dist/](../dist/) on a local HTTP port for testing and Playwright automation.

### Test suite (`tests/`)

pytest-based tests covering code quality (pyflakes, bandit, ASCII compliance,
import policy, indentation) and an end-to-end Playwright walkthrough that
exercises the full 9-step protocol.

## Data flow

```text
User input (click)
  |
  v
Event handlers in scene modules
  |
  v
updateGameState() mutations on GameState
  |
  v
Validation (volume, interaction sequence, cleanliness)
  |
  v
warnings[] accumulation (real-time sidebar display)
  |
  v
renderGame() dispatcher (init.ts)
  |
  v
Scene-specific renderers (hood, microscope, incubator, plate reader)
  |
  v
SVG/HTML output to DOM
  |
  v
completeStep() advances protocol
  |
  v
Results scene: calculateScore() -> 3-star rating
```

## Game protocol

For authoring a new protocol from scratch, see [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md).

The 9-step guided workflow mirrors a real cell culture experiment in `cell_culture`:

1. Spray/sanitize hood
2. Aspirate old media
3. Add fresh media
4. Microscope viability check
5. Count cells (hemocytometer quadrants)
6. Transfer cells to plate
7. Add drug dilutions
8. Incubate
9. Read plate results

## Scoring

Four weighted categories in [src/scoring.ts](../src/scoring.ts):

| Category | Max points | Tracks |
| --- | --- | --- |
| Order | 30 | Steps completed in correct sequence |
| Cleanliness | 25 | Contamination and sterile technique errors |
| Waste | 20 | Excess media usage |
| Timing | 25 | Speed to completion |

Final score maps to a 1-3 star rating.

## Testing and verification

```bash
source source_me.sh && python3 -m pytest tests/
```

- **Linting:** pyflakes, bandit security scan, ASCII compliance
- **Style:** indentation (tabs), whitespace, shebang consistency
- **Imports:** no `import *`, no relative imports, all third-party in
  requirements files
- **E2E:** `tests/protocol_walkthrough_yaml.mjs` is the canonical real-UI regression test (drives the full protocol via Playwright DOM clicks). `tests/protocol_graph_smoke.mjs` is a fast data-layer smoke test that proves graph reachability (calls `completeStep()` directly). See [docs/PROTOCOL_STEPS.md](PROTOCOL_STEPS.md) for the protocol-flow architecture.

Test scope is controllable via environment variables (`FAST_REPO_HYGIENE=1`,
`REPO_HYGIENE_SCOPE=changed`, `SKIP_REPO_HYGIENE=1`).

## Dynamic SVG recolor pipeline

Liquid color in the game is data-driven, not baked into static art. The
pipeline:

1. **SVG art** owns shapes and stable ids. Liquid sub-objects carry ids
   like `liquid_<sha8>` (geometry-keyed) or named ids like `liquid_residue`.
2. **Generator** (`tools/generate_svg_globals.py`) reads
   `assets/equipment/*.svg`, namespaces every id with `<basename>__`, and
   emits two manifests in [src/svg_globals.ts](../src/svg_globals.ts):
   `SVG_IDS` (per-asset id list) and `SVG_GROUPS` (sidecar groupings,
   loaded from optional `<basename>.colormap.json`).
3. **Renderer** (`src/svg_color_patch.ts`) applies `SvgColorPatch[]` to a
   baked SVG string. Patches address one element by namespaced id and
   write `fill`, `stroke` (via `strokeRole`), and/or `opacity`.
4. **Recipes** (`src/svg_recipes.ts`) map semantic state (`T75LiquidVisual`,
   `BottleLiquid`) to patch lists. `bottleLiquidPatches('media')` expands
   the `liquid` group from `bottle.colormap.json` into N patches.
5. **Sidecar JSON** (`assets/equipment/<basename>.colormap.json`) groups
   multiple authored ids under one semantic target with per-id opacity, so
   one role color drives a layered shading effect (base + shadow +
   highlight).
6. **Bottle authoring** (`tools/build_servier_recolor.py`) diffs the three
   pristine Servier source colors (pink/orange/green) by structural color
   palette, classifies non-shared fills/strokes as the liquid layer, and
   writes `bottle.svg` + `bottle.colormap.json`.

Design lock: only fill/stroke/opacity changes on authored ids. No new
geometry, no overlay engine, no state machines.

Validation: `tests/test_svg_id_parity.py` keeps the manifest aligned with
the SVGs; `tests/test_svg_color_patch.mjs` and
`tests/test_bottle_recolor.mjs` import the real production module via
`tests/_compile_for_test.mjs` and exercise the full recolor path.

## Completion-event coverage policy (CE-3)

Each protocol has a completion-event coverage policy defined in `getCoveragePolicy(protocolId)` in
[src/init.ts](../src/init.ts). The policy controls how missing completion-event emitters are
handled at startup:

- **STRICT** (default; used for `cell_culture`): any step missing a matching completion-event emitter
  throws via `showValidationError` with the message `'missing completion-event emitter'`. This
  enforces that every declared step has a working implementation.
- **RELAXED** (used for `tutorial_*` protocols): missing emitters are logged via `console.warn`
  but do not block page load; the game can start even with incomplete wiring. Useful for tutorial
  and development protocols where full coverage is not yet required.
- **Unknown protocols** default to **STRICT** for safety.

The startup check `validateCompletionEventCoverage()` runs after all scene render functions
have executed (on the `load` event) and compares the declared steps against the set of
registered emitters populated by `triggerStep()` calls.

## Extension points

- **New protocol steps:** Add entries to `PROTOCOL_STEPS` in
  `src/constants.ts`, wire a `triggerStep(id)` call (completion-event emitter)
  in the scene that owns the step, and add a module-scope `registeredEmitters.add(id)`
  pre-registration line. Step ordering uses explicit `nextId` linked-list
  transitions (not array position). Full instructions, validators, and the walker
  test are documented in [docs/PROTOCOL_STEPS.md](PROTOCOL_STEPS.md).
- **New scenes:** Create a new `*_scene.ts` file in `src/scenes/`, add it to the
  build order in [build_github_pages.sh](../build_github_pages.sh), and register
  it in the render dispatcher in [src/init.ts](../src/init.ts)
- **Drug models:** Modify the IC50 curve parameters in
  [src/cell_model.ts](../src/cell_model.ts)
- **Scoring adjustments:** Change weights and thresholds in
  [src/scoring.ts](../src/scoring.ts)

## Known gaps

- No automated TypeScript linting or type checking beyond esbuild compilation
- E2E test depends on Playwright and Chromium installation; may not run in all
  CI environments
