# Code architecture

Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Overview

An interactive browser-based educational simulation that teaches cell culture
laboratory techniques. The game is authored as TypeScript ES modules under
[src/](../src/) and bundled by esbuild into a browser bundle. Two artifacts
are produced from the same sources:

- A GitHub Pages-ready directory at `dist/` (separate `index.html`,
  `style.css`, `main.js`).
- A portable, fully self-contained single-file HTML at
  `dist-single/game.html` for sharing without a server.

Protocol content lives as YAML in `content/protocols/` and is
compiled into TypeScript modules by [pipeline/build_protocol_data.py](../pipeline/build_protocol_data.py)
before each build. Object library YAML lives under `content/objects/`;
shared base scenes under `content/scenes/`. A pytest test suite plus Playwright browser tests support
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

Scene runtime is fully driver-routed as of 2026-05-09. Each scene is
implemented as an adapter at `src/scenes/<scene>/<scene>.ts`; no flat
monolithic scene modules remain at `src/scenes/*.ts`. See the
[Capability-based scene architecture](#capability-based-scene-architecture-current-state-2026-05-09)
section below for the layered model and the per-adapter file map. Schema
reference for the per-scene `<scene>.yaml` files lives in
[specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md); the deep-dive on driver,
registry, adapters, and capabilities lives in
[specs/SCENE_ARCHITECTURE.md](specs/SCENE_ARCHITECTURE.md), the canonical scene terms
in [specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md), and the canonical object
terms (state_fields, render_map, structured surfaces and subparts) in
[specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md) and
[specs/OBJECT_YAML_FORMAT.md](specs/OBJECT_YAML_FORMAT.md).

#### Step modules

Per-step UI and emitter logic. Each module registers a completion-event
emitter via `triggerStep(stepId)`.

- [src/steps/feed_cells.ts](../src/steps/feed_cells.ts) - Media aspirate /
  add with volume validation.
- [src/steps/drug_treatment.ts](../src/steps/drug_treatment.ts) - Drug
  pipetting flow.
- [src/steps/mtt_readout.ts](../src/steps/mtt_readout.ts) - MTT plate
  readout flow.
- [src/steps/plate_96.ts](../src/steps/plate_96.ts) - 96-well plate
  rendering.

#### Interaction and dispatch

The modules below describe the interaction-dispatch runtime.

- [src/interaction_resolver.ts](../src/interaction_resolver.ts) - Resolves
  the current interaction from the step.
- [src/step_dispatch.ts](../src/step_dispatch.ts) - Maps the
  step shape to handlers.
- [src/protocol_ui.ts](../src/protocol_ui.ts) - Protocol panel rendering
  (left sidebar).
- [src/ui_rendering.ts](../src/ui_rendering.ts) - Sidebar HUD, meters,
  warnings, results screen.
- [src/professor_overlay.ts](../src/professor_overlay.ts) - In-game hint
  overlay.

#### Layout and SVG art

- [src/layout_engine.ts](../src/layout_engine.ts) - Per-scene layout
  computation.
- Bench and hood layout: declared in scene YAML at
  [src/scenes/bench/bench.yaml](../src/scenes/bench/bench.yaml) and
  [src/scenes/cell_culture_hood/cell_culture_hood.yaml](../src/scenes/cell_culture_hood/cell_culture_hood.yaml).
  The legacy `src/bench_config.ts` and `src/hood_config.ts` modules were
  retired in the 2026-05-09 scene migration; YAML is the single source of
  truth for layout in those scenes.
- Well-plate workspace layout: declared in scene YAML at
  [src/scenes/well_plate_workspace/well_plate_workspace.yaml](../src/scenes/well_plate_workspace/well_plate_workspace.yaml).
  The workspace is a first-class scene for plate-transfer and tube-prep
  mini-protocols, with render assembly in
  [src/scenes/well_plate_workspace/render.ts](../src/scenes/well_plate_workspace/render.ts)
  and click dispatch in
  [src/scenes/well_plate_workspace/dispatch.ts](../src/scenes/well_plate_workspace/dispatch.ts).
- [src/plate_config.ts](../src/plate_config.ts) - Legacy plate layout
  exports retained for older helpers; superseded for interactive work by
  [src/scenes/well_plate_workspace/](../src/scenes/well_plate_workspace/).
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
- `generated/svg_assets/<name>.ts` - Per-asset SVG string constants
  (`SVG_<NAME>: string`), one file per source SVG under
  `assets/equipment/`. Gitignored; regenerated by
  [pipeline/generate_svg_globals.py](../pipeline/generate_svg_globals.py).
- `generated/svg_assets/index.ts` - Barrel re-exporting every per-asset
  constant. Consumed only by [src/svg_assets.ts](../src/svg_assets.ts);
  other importers reach for the specific per-asset module they need.
- `generated/svg_manifest.ts` - Small manifest exporting `SVG_IDS`,
  `SVG_GROUPS`, and the `SvgGroupEntry` type (no SVG strings). Imported
  by [src/svg_color_patch.ts](../src/svg_color_patch.ts) and tests that
  do not need SVG markup.
- The entire `generated/` tree is gitignored. Build scripts
  (`build_github_pages.sh`, `export_single_file.sh`) regenerate it
  before `tsc` and the bundler; `tests/conftest.py` regenerates it once
  per pytest session if `generated/svg_manifest.ts` is missing.
- See [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) for the full SVG asset
  ownership boundary and the rule that scenes import only
  `svg_assets.ts`.

#### Content and generated data facades

- `content/protocols/<protocol_name>/` - Authored protocols (each
  carrying `protocol.yaml`, `materials.yaml`, and optional protocol-scoped
  scene overrides under `scenes/`).
- `content/objects/<object_name>.yaml` - Object library (shared across
  protocols).
- `content/scenes/<base_scene_name>.yaml` - Shared base scenes.
- Build-side helpers that mirror generated data live in `src/` next to
  the facade modules listed below.
- **Authored content facades:**
  - [src/protocol.ts](../src/protocol.ts) - Re-exports protocol steps and protocol ID
    from `generated/protocol_data.ts`.
  - [src/inventory.ts](../src/inventory.ts) - Re-exports inventory metadata
    from `generated/inventory_data.ts`.
  - [src/scene_configs.ts](../src/scene_configs.ts) - Re-exports scene configurations
    from `generated/scene_data.ts`.
  - [src/svg_assets.ts](../src/svg_assets.ts) - Re-exports SVG string constants and
    utilities (imported from `generated/svg_assets/`).
  - [src/svg_color_patch.ts](../src/svg_color_patch.ts) - Composition layer for recolor
    primitives that imports `generated/svg_manifest` directly for color-group metadata;
    provides utilities for applying SVG group-based color patches.
- **Generated TypeScript artifacts (gitignored):**
  - `generated/protocol_data.ts` - Protocol steps and metadata
    (emitted by [pipeline/build_protocol_data.py](../pipeline/build_protocol_data.py)).
  - `generated/inventory_data.ts` - Inventory metadata for items and reagents
    (emitted by [pipeline/build_protocol_data.py](../pipeline/build_protocol_data.py)).
  - `generated/scene_data.ts` - Scene configurations and registrations
    (emitted by [pipeline/build_scene_data.py](../pipeline/build_scene_data.py)).
  - `generated/svg_assets/*.ts` - Per-asset SVG string constants
    (emitted by [pipeline/generate_svg_globals.py](../pipeline/generate_svg_globals.py)).
  - `generated/svg_manifest.ts` - SVG id/group registry and type definitions
    (emitted by [pipeline/generate_svg_globals.py](../pipeline/generate_svg_globals.py)).
  - See [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) for the full SVG asset
    pipeline and ownership rules.

### Build pipeline

Two build entry points share a common pre-step:

1. [pipeline/build_protocol_data.py](../pipeline/build_protocol_data.py) parses
   `content/protocols/<protocol_name>/*.yaml`, applies the cross-file schema
   rules (see [specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md)),
   and writes `generated/protocol_data.ts` + `generated/inventory_data.ts`
   (gitignored; consumed via the `src/protocol.ts` and `src/inventory.ts`
   facades). Build scripts run this with `--validate-only` first as a fast
   gate.
2. [pipeline/generate_svg_globals.py](../pipeline/generate_svg_globals.py) reads
   `assets/equipment/*.svg`, namespaces ids, and emits
   `generated/svg_assets/<name>.ts` (per-asset SVG modules),
   `generated/svg_assets/index.ts` (barrel re-export), and
   `generated/svg_manifest.ts` (`SVG_IDS` and `SVG_GROUPS`). The
   `generated/` tree is gitignored and regenerated on every build.
3. `npx tsc --noEmit -p src/tsconfig.json` type-checks (no JS emit from tsc).
4. `npx esbuild src/init.ts --bundle ...` produces the JS bundle.

[build_github_pages.sh](../build_github_pages.sh) wipes `dist/`,
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
`dist/` on a LAN-visible HTTP port (default 5080). This is the
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
Scene driver capture-phase listener (src/scenes/scene_driver.ts)
  |
  v
SceneAdapter.dispatchInteraction(itemId, ctx) (src/scenes/<scene>/<scene>.ts)
  |
  v
step-kind handler (src/step_dispatch.ts)
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
SceneAdapter.render(ctx) per scene (bench, cell_culture_hood, microscope, incubator, plate, plate_reader)
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
[specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md). The
curriculum comprises 10 mini-protocols covering the OVCAR8 carboplatin
+ metformin MTT workflow, assembled into two sequence runners (`cell_culture_full`
for the complete pathway and `routine_passage` for cell passaging). Each mini-protocol
teaches one focused workflow and is independently walkable and testable.

Each step wraps an ordered `sequence` of `interaction` blocks, checked by
a `step_validator`, resolved by an `outcome`, and linked by `next_step`; see
[specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md) and
[specs/PROTOCOL_STEPS.md](specs/PROTOCOL_STEPS.md).

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
  `tests/test_protocol_yaml_validator.py`.
- **Browser walker:** drives the full protocol via DOM clicks; the
  `--wrong-order` flag injects bad clicks and verifies soft-fail recovery.

## Dynamic SVG recolor pipeline

Liquid color in the game is data-driven, not baked into static art:

1. **SVG art** owns shapes and stable ids. Liquid sub-objects carry ids
   like `liquid_<sha8>` (geometry-keyed) or named ids like
   `liquid_residue`.
2. **Generator** ([pipeline/generate_svg_globals.py](../pipeline/generate_svg_globals.py))
   reads `assets/equipment/*.svg`, namespaces every id with
   `<basename>__`, and emits the `SVG_IDS` and `SVG_GROUPS` manifests in
   `generated/svg_manifest.ts` (alongside the per-asset SVG modules
   under `generated/svg_assets/`).
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

- **STRICT** (used for sequence runners and unknown ids): any step missing
  a matching emitter throws via `showValidationError` with
  `'missing completion-event emitter'`.
- **RELAXED** (used for mini-protocols): missing emitters are
  logged via `console.warn`; the page still loads.

`validateCompletionEventCoverage()` runs after all scene render functions
on the `load` event and compares declared steps against the set of
emitters populated by `triggerStep()` calls.

## Extension points

- **New protocol steps:** edit
  `content/protocols/<protocol_name>/protocol.yaml`, add a `step` with its
  `sequence`, `step_validator`, `outcome`, and `next_step` slots, and
  re-run [pipeline/build_protocol_data.py](../pipeline/build_protocol_data.py).
  See [specs/PROTOCOL_STEPS.md](specs/PROTOCOL_STEPS.md) and
  [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md).
- **New scenes:** create a folder `src/scenes/<scene>/` with `<scene>.yaml`
  (capabilities + items + optional `elementId`) and `<scene>.ts` (a
  `SceneAdapter` implementation with `dispatchInteraction(itemId, ctx)` and
  `render(ctx)`). Import the adapter from [src/init.ts](../src/init.ts) so
  it self-registers with the scene registry, and add a `case` in the
  `renderGame` switch that calls `runSceneRender('<scene>')`.
- **Drug models:** modify the IC50 curve parameters in
  [src/cell_model.ts](../src/cell_model.ts).
- **Scoring adjustments:** change weights and thresholds in
  [src/scoring.ts](../src/scoring.ts).

## Capability-based scene architecture

The scene system uses a capability-based driver with click dispatch and
per-scene adapters. Every scene's click dispatch and render are adapter-owned,
every protocol routes through the driver, and the `sceneRouter` flag has been
removed.

### Ownership model

- **Capabilities own reusable mechanics.** Click routing, layout,
  wrong-order detection, modal screen sequencing, instrument
  workspaces, grid counting. A capability is shared infrastructure that
  multiple scenes can compose.
- **Adapters own scene-specific render assembly, state mutations,
  notifications, and per-step effects.** An adapter is per-scene and
  cannot be shared. Each `completionEvent` handler is unique scene
  logic, not capability-shaped.
- **No LOC gates.** Splits are decided by responsibility seams, not
  size. Today only `cell_culture_hood` is split (assembly seam between
  `cell_culture_hood/render.ts` and `cell_culture_hood/cell_culture_hood.ts`);
  the other adapters are single-file because they are cohesive.

### Layered model

```text
+---------------------------------------------------------------+
|  init.ts renderGame switch                                    |
|    -> runSceneRender(sceneId)   [scene_driver.ts]             |
|         -> SceneAdapter.render(ctx)   [scene-owned DOM/SVG]   |
|    -> runScene(sceneId) (once per scene)                      |
|         -> dispatch click events on scene element             |
|         -> walk capability list from scene_registry           |
|         -> capability.onClick / onStepChange / mount / unmount|
|         -> SceneAdapter.dispatchInteraction(itemId, ctx)      |
|         -> game_state.completeStep / triggerStep / mutations  |
+---------------------------------------------------------------+
```

### SceneAdapter contract

```ts
interface SceneAdapter {
	sceneId: string;
	dispatchInteraction(itemId: string, ctx: SceneContext): void;
	render(ctx: SceneContext): void;
}
```

`render(ctx)` is required.

### Driver infrastructure

- [src/scenes/scene_driver.ts](../src/scenes/scene_driver.ts) -
  `runScene(sceneId)` lifecycle plus `runSceneRender(sceneId)` render
  routing.
- [src/scenes/scene_registry.ts](../src/scenes/scene_registry.ts) -
  capability and scene-adapter registries.

### Capabilities

Six capability modules live in [src/scenes/capabilities/](../src/scenes/capabilities/).
Each conforms to a `SceneCapability` contract (`mount`, `onStepChange`,
`onClick`, `unmount`) and self-registers at module load.

| Capability id | Module | Responsibility |
| --- | --- | --- |
| `item_workspace` | `item_workspace.ts` | Item-grid click dispatch, accent styling, wrong-order detection |
| `modal_workspace` | `modal_workspace.ts` | Modal screen flow tracking |
| `plate_reader_workspace` | `plate_reader_workspace.ts` | Plate-reader insert/read state |
| `instrument_workspace` | `instrument_workspace.ts` | Mounted-instrument surface state (microscope, cell counter) |
| `incubator_workspace` | `incubator_workspace.ts` | Incubation overlay lifecycle state |
| `grid_counting_workspace` | `grid_counting_workspace.ts` | Hemocytometer quadrant click tracking and total-count aggregation |

### Scene adapters

Six first-class adapters under `src/scenes/<scene>/`. Each owns its
scene's render assembly and dispatch.

| Scene | Adapter | Render | YAML |
| --- | --- | --- | --- |
| Bench | [src/scenes/bench/bench.ts](../src/scenes/bench/bench.ts) | adapter | [bench.yaml](../src/scenes/bench/bench.yaml) |
| Cell-culture hood | [src/scenes/cell_culture_hood/cell_culture_hood.ts](../src/scenes/cell_culture_hood/cell_culture_hood.ts) | sibling [render.ts](../src/scenes/cell_culture_hood/render.ts) (assembly seam) | [cell_culture_hood.yaml](../src/scenes/cell_culture_hood/cell_culture_hood.yaml) |
| Well-plate workspace | [src/scenes/well_plate_workspace/well_plate_workspace.ts](../src/scenes/well_plate_workspace/well_plate_workspace.ts) | sibling [render.ts](../src/scenes/well_plate_workspace/render.ts) and [dispatch.ts](../src/scenes/well_plate_workspace/dispatch.ts) | [well_plate_workspace.yaml](../src/scenes/well_plate_workspace/well_plate_workspace.yaml) |
| Microscope | [src/scenes/microscope/microscope.ts](../src/scenes/microscope/microscope.ts) | adapter | [microscope.yaml](../src/scenes/microscope/microscope.yaml) |
| Incubator | [src/scenes/incubator/incubator.ts](../src/scenes/incubator/incubator.ts) | adapter | [incubator.yaml](../src/scenes/incubator/incubator.yaml) |
| Plate reader | [src/scenes/plate_reader/plate_reader.ts](../src/scenes/plate_reader/plate_reader.ts) | adapter | [plate_reader.yaml](../src/scenes/plate_reader/plate_reader.yaml) |

Scene YAML is compiled at build time by
[pipeline/build_scene_data.py](../pipeline/build_scene_data.py) into
`generated/scene_data.ts` (gitignored; consumed via the `src/scene_configs.ts`
facade; loud build-time failures on missing
`sceneId`, unknown capability ids, item references to unknown zones,
duplicate ids, and missing required config blocks).

### Element-id mechanism

Most scenes use a DOM element id of the form `<sceneId>-scene` (for
example `bench-scene`). Two scenes do not: `cell_culture_hood` mounts
to `hood-scene`, and `microscope` uses `instrument-overlay` for the
modal-style flow (shared with `plate_reader`). The scene YAML carries an optional `elementId` field
that overrides the default; `runScene` consults `sceneConfig.elementId`
first and falls back to `${sceneId}-scene` when absent.

### Flat files at src/scenes/

The only flat files at `src/scenes/*.ts` are driver infrastructure
(`scene_driver.ts`, `scene_registry.ts`). Every scene implementation lives
under its own folder.


## Known gaps

- Verification task: confirm whether non-browser
  [tests/e2e/](../tests/e2e/) is intended to remain empty or whether
  shell wrappers (currently in [tools/](../tools/)) belong there.
- `src/layout_engine.ts` (~857 LOC) is coherent at its current size but
  is the next deferred decomposition target if it grows further.
  Tracked as a deferred cleanup in [ROADMAP.md](ROADMAP.md).
