# Code architecture

Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md).
This doc uses that vocabulary without restating definitions.

## Overview

A browser-based educational simulation that teaches laboratory techniques
(cell culture, SDS-PAGE) through step-by-step YAML-authored mini-protocols.
Protocol and scene content lives as YAML in `content/` and is compiled to
TypeScript by generator scripts in `pipeline/` before each build. The shared
TypeScript runtime under `src/` renders scenes, drives protocol steps, and
surfaces a HUD shell to the student.

Build output is a GitHub Pages-ready directory at `dist/`. A shared bundle
(`dist/launcher.js`, `dist/protocol_host.js`) serves every page; routing is
by DOM-element presence, not by URL.

## Major components

### Entry and routing (`src/`)

| File | Purpose |
| --- | --- |
| [src/dist_entry.tsx](../src/dist_entry.tsx) | Bundle entry; routes to launcher, protocol host, or bench by DOM root presence |
| [src/launcher_entry.tsx](../src/launcher_entry.tsx) | Launcher bundle entry; mounts Solid `Launcher` into `#launcher-root` |
| [src/protocol_host_entry.tsx](../src/protocol_host_entry.tsx) | Protocol-host bundle entry; imports `protocol_host.tsx` |
| [src/protocol_host.tsx](../src/protocol_host.tsx) | Wires layout pipeline, renderer, step machine, click resolver, and HUD for one protocol page |
| [src/launcher/Launcher.tsx](../src/launcher/Launcher.tsx) | Solid component; renders the protocol selector from `PROTOCOLS_INDEX_SLIM` |
| [src/index.html](../src/index.html) | Bench page (render smoke target; copied to `dist/bench_basic.html`) |
| [src/launcher/index.html](../src/launcher/index.html) | Launcher page (copied to `dist/index.html`) |
| `src/protocol_host_template.html` | Six-region framed-interface shell for per-protocol pages (`#scene-root`, `#shell-root`, named `data-region` targets) |

`protocol_host.tsx` mount order:

1. Resolve protocol name from `?protocol=` query string or `window.__PROTOCOL_NAME__`.
2. Look up `ProtocolConfig` from `generated/protocols.ts`.
3. Resolve entry scene via `resolve_entry_scene_name` (see scene_runtime/protocol below).
4. Call `runPipeline` then `renderScene` to paint `#scene-root`.
5. Build emitter, scene-op handler, step machine, and click resolver.
6. Mount `ProtocolHud` into `#shell-root` (unless `?shell=off`).
7. Call `step_machine.start()`.

### Scene runtime - layout (`src/scene_runtime/layout/`)

Multi-pass layout pipeline. Converts a scene YAML record plus the object
library into positioned, scaled `ComputedItem` records.

| File | Purpose |
| --- | --- |
| [src/scene_runtime/layout/run_pipeline.ts](../src/scene_runtime/layout/run_pipeline.ts) | Top-level pipeline runner; stages 1-5 once, stages 6-10 in convergence loop |
| [src/scene_runtime/layout/types.ts](../src/scene_runtime/layout/types.ts) | All layout type definitions (`PipelineResult`, `ComputedItem`, `PlacementAuthored`, etc.) |
| [src/scene_runtime/layout/constants.ts](../src/scene_runtime/layout/constants.ts) | Layout constants (`DEFAULT_VIEWPORT`, `WORKSPACE_PX_PER_CM`, shrink factor) |
| [src/scene_runtime/layout/bind_objects.ts](../src/scene_runtime/layout/bind_objects.ts) | Stage: bind object YAML to placements |
| [src/scene_runtime/layout/resolve_inheritance.ts](../src/scene_runtime/layout/resolve_inheritance.ts) | Stage: resolve base-scene inheritance chain |
| [src/scene_runtime/layout/normalize_schema.ts](../src/scene_runtime/layout/normalize_schema.ts) | Stage: normalize Schema A scene fields and apply layout-rule defaults |
| [src/scene_runtime/layout/scale_to_real_world.ts](../src/scene_runtime/layout/scale_to_real_world.ts) | Stage: convert real-world dimensions to pixels |
| [src/scene_runtime/layout/horizontal_layout.ts](../src/scene_runtime/layout/horizontal_layout.ts) | Stage: compute x positions |
| [src/scene_runtime/layout/vertical_layout.ts](../src/scene_runtime/layout/vertical_layout.ts) | Stage: compute y positions |
| [src/scene_runtime/layout/group_by_zone.ts](../src/scene_runtime/layout/group_by_zone.ts) | Stage: group placements by zone |
| [src/scene_runtime/layout/footprint.ts](../src/scene_runtime/layout/footprint.ts) | Footprint helpers |
| [src/scene_runtime/layout/clamp_scene_bounds.ts](../src/scene_runtime/layout/clamp_scene_bounds.ts) | Clamp placements to scene bounds |
| [src/scene_runtime/layout/layout_labels.ts](../src/scene_runtime/layout/layout_labels.ts) | Label positioning |
| [src/scene_runtime/layout/wrap_label.ts](../src/scene_runtime/layout/wrap_label.ts) | Label line-wrap helper |
| [src/scene_runtime/layout/index.ts](../src/scene_runtime/layout/index.ts) | Barrel re-export: `runPipeline` |

### Scene runtime - protocol (`src/scene_runtime/protocol/`)

Step machine, validators, scene operations, and click resolver.

| File | Purpose |
| --- | --- |
| [src/scene_runtime/protocol/resolve_entry_scene.ts](../src/scene_runtime/protocol/resolve_entry_scene.ts) | `resolve_entry_scene_name` (step.scene -> SceneChange fallback -> throw; runner delegation); `assert_scene_not_empty` guard |
| [src/scene_runtime/protocol/step_machine.ts](../src/scene_runtime/protocol/step_machine.ts) | Pure step machine: step progression, interaction-index advancement, validator dispatch, scene-op handoff, event emission |
| [src/scene_runtime/protocol/validators.ts](../src/scene_runtime/protocol/validators.ts) | Interaction and step validator dispatch (`correct_target`, `correct_choice`, `target_with_value`, `sequence_complete`, `final_state_matches`) |
| [src/scene_runtime/protocol/scene_operations.ts](../src/scene_runtime/protocol/scene_operations.ts) | Routes five `SceneOperation` primitives to injected deps (exhaustive switch over `ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`) |
| [src/scene_runtime/protocol/scene_op_deps.ts](../src/scene_runtime/protocol/scene_op_deps.ts) | Store-driven `SceneOpDeps`: `ObjectStateChange`/`CursorAttach` write `scene_store`; `SceneChange` reseeds + applies the reset policy (preserving cursor-held state); `LayoutMove` is a reported no-op (Option A); `TimedWait` keeps observable semantics through the subsequent state write |
| [src/scene_runtime/protocol/walker_debug.ts](../src/scene_runtime/protocol/walker_debug.ts) | Read-only walker/debug surface: installs `window.PROTOCOL_STEPS` + `window.gameState` projected from the emitter snapshot + scene store (frozen contract) |
| [src/scene_runtime/protocol/click_resolver.ts](../src/scene_runtime/protocol/click_resolver.ts) | Attaches DOM click listener; maps click target to interaction validator |
| [src/scene_runtime/protocol/emitter.ts](../src/scene_runtime/protocol/emitter.ts) | `ProtocolShellEmitter` and `RuntimeEmitterHandle`; snapshot reducer pattern |

Scene operations drive the reactive `scene_store` (WS-M3-D): a validated
interaction's `ObjectStateChange` writes declared object state, the Solid
renderer reacts, and a `SceneChange` re-renders the next scene while preserving
cursor-held tool/material. `protocol_host.tsx` wires the store-driven deps and
restores the read-only `window.PROTOCOL_STEPS` / `window.gameState` surfaces.

### Scene runtime - renderer (`src/scene_runtime/renderer/`)

Renders a `PipelineResult` into the DOM. The paint path is Solid: a reactive
`SceneView` component renders one `SceneItem` per placement and reacts to the
`scene_store`. The earlier imperative item-paint path (`render_item.ts`,
`render_label.ts`) is retired; `render_scene.tsx` is the public Solid mount
facade and `scene_item.tsx` / `scene_view.tsx` own item and label rendering.

| File | Purpose |
| --- | --- |
| [src/scene_runtime/renderer/render_scene.tsx](../src/scene_runtime/renderer/render_scene.tsx) | Public Solid mount facade: creates the scene store, mounts `SceneView` into `#scene-root`, returns a dispose handle |
| [src/scene_runtime/renderer/scene_view.tsx](../src/scene_runtime/renderer/scene_view.tsx) | Solid `SceneView`: renders background, one `SceneItem` per placement, and label elements; runs structural guards (collects violations) and sets `data-scene-degraded` |
| [src/scene_runtime/renderer/scene_item.tsx](../src/scene_runtime/renderer/scene_item.tsx) | Solid `SceneItem`: reactive single-item paint (position, depth, SVG inject, missing-svg placeholder dashed box, `data-*` attributes) |
| [src/scene_runtime/renderer/visual_state_resolver.ts](../src/scene_runtime/renderer/visual_state_resolver.ts) | Pure (no-DOM, no-Solid) resolver mapping object state + authored `visual_states` + per-protocol material registry to a renderable description |
| [src/scene_runtime/renderer/render_background.ts](../src/scene_runtime/renderer/render_background.ts) | Render scene background (gradient or asset) |
| [src/scene_runtime/renderer/structural_guards.ts](../src/scene_runtime/renderer/structural_guards.ts) | Six structural guards (item count, bounds, aspect ratio, asset presence, etc.); collects all violations rather than throwing on the first; throwing wrapper is exposed for tests/CI |
| [src/scene_runtime/renderer/inject_svg.ts](../src/scene_runtime/renderer/inject_svg.ts) | Inject inline SVG from `ASSET_SPECS` |
| [src/scene_runtime/renderer/index.ts](../src/scene_runtime/renderer/index.ts) | Barrel re-export: `renderScene`, `mountScene`, `SceneView`, `SceneItem`, `renderBackground` |

### Shell and HUD (`src/shell/`)

Solid.js observer layer. Subscribes to the emitter; never mutates protocol state.

| File | Purpose |
| --- | --- |
| [src/shell/adapter/types.ts](../src/shell/adapter/types.ts) | Closed seam contract: `ProtocolConfig`, `ShellViewSnapshot`, all event/op/gesture types |
| [src/shell/signals.ts](../src/shell/signals.ts) | Re-exports Solid signals; `subscribeEmitterToSnapshot` binding helper |
| [src/shell/hud/ProtocolHud.tsx](../src/shell/hud/ProtocolHud.tsx) | Mounts four Solid region components into named DOM targets |
| [src/shell/regions/StepOutline.tsx](../src/shell/regions/StepOutline.tsx) | Read-only ordered step cards (`data-step-status` current/previous/upcoming) |
| [src/shell/regions/TipsBubble.tsx](../src/shell/regions/TipsBubble.tsx) | Professor-tip bubble (`current_tip` or fallback) |
| [src/shell/regions/StepCounter.tsx](../src/shell/regions/StepCounter.tsx) | Completed/total counter |
| [src/shell/regions/GuidanceBar.tsx](../src/shell/regions/GuidanceBar.tsx) | Current-step prompt in the teal guidance bar |

The shell is a sibling of `#scene-root`, never an ancestor (asset-crop rule).

### Build pipeline (`pipeline/`)

All scripts that emit to `generated/` or produce `dist/` artifacts. Run by
`package.json` pre-hooks and `build_github_pages.sh`.

| File | Purpose |
| --- | --- |
| [pipeline/gen_object_library.py](../pipeline/gen_object_library.py) | YAML under `content/objects/` -> `generated/object_library.ts`; emits `OBJECT_LIBRARY` (per-object `state_schema`, `visual_states`, `subpart_state_schema`), `ASSET_SPECS`, `OBJECT_STATE_SCHEMAS` (object-level state-field contract for store validation), `OBJECT_SUBPART_STATE_SCHEMAS` (subpart-level state-field contract). `state_fields` are the contract; `visual_states` are the rendering map. |
| [pipeline/gen_svg_registry.py](../pipeline/gen_svg_registry.py) | `assets/equipment/*.svg` -> `generated/svg_registry.ts` |
| [pipeline/gen_scene_index.py](../pipeline/gen_scene_index.py) | Scene YAML -> `generated/scenes.ts` + `generated/scene_manifest.json` (per-scene classification: emitted/skipped/errored); `--missing-svg=strict|placeholder` flag (default `placeholder`) |
| [pipeline/gen_protocols.py](../pipeline/gen_protocols.py) | Protocol YAML -> `generated/protocols.ts` + `generated/protocols_index_slim.ts` + `generated/protocol_materials.ts` (per-protocol material registry from each package `materials.yaml`) |
| [pipeline/build_protocol_index.py](../pipeline/build_protocol_index.py) | Protocol index helpers |
| [pipeline/list_protocols.py](../pipeline/list_protocols.py) | Parses `PROTOCOLS_INDEX` from generated TS; `emit` subcommand writes per-protocol HTML |
| [pipeline/scene_inheritance.py](../pipeline/scene_inheritance.py) | Scene YAML inheritance resolution library (shared by gen_scene_index) |
| [pipeline/build_main_bundle.mjs](../pipeline/build_main_bundle.mjs) | esbuild Node API bundle: `src/launcher_entry.tsx` -> `dist/launcher.js`, `src/protocol_host_entry.tsx` -> `dist/protocol_host.js` |

### Validation (`validation/`)

Python validators for YAML content, SVG assets, and protocol step flow.
Entry point: [validation/validate.py](../validation/validate.py).

| Subtree | Purpose |
| --- | --- |
| `validation/yaml_schema/` | Schema and cross-field rules for protocol, object, and scene YAML |
| `validation/stepper/` | Protocol step-flow walker: simulates execution, checks validator/outcome/scene-op semantics |
| `validation/svg/` | SVG asset usage audit |
| `validation/manual/` | Human-readable protocol manual renderer |
| `validation/scene_lint/` | Pre-render failure predictor (BLOCKED Group A / advisory Group B) |
| `validation/scene_design/` | Composition scorecard (weighted metrics, advisory only) |
| `validation/scene_calc/` | Thin loader of rendered geometry (`test-results/scenes/<scene>.stats.json`) for scene_lint and scene_design; computes no layout. Single geometry producer: the browser render pipeline (`tools/scene_to_png.mjs` -> `tools/scene_stats.mjs`). |
| `validation/structure/` | Layout structural check |
| `validation/shared_toolkit/` | Shared discovery, YAML I/O, findings, reporter, CLI helpers |

### Testing (`tests/`)

Three tiers, isolated by [tests/conftest.py](../tests/conftest.py)
(`collect_ignore = ["e2e", "playwright"]`):

- **Fast pytest** (`tests/test_*.py`): pyflakes, ASCII compliance, tab indentation,
  trailing whitespace, shebangs, import policy, init-file hygiene, protocol YAML
  validators, spec doc camelCase gate, test naming conventions, and more.
- **Node unit tests** (`tests/test_*.mjs`, run by `node --import tsx --test`):
  layout engine, step machine, structural guards, resolve_entry_scene,
  visual_state_resolver, scene operations, shell signals, walker
  no-step-branches, and more.
- **Playwright browser tests** (`tests/playwright/`): framed-layout evidence,
  initial-scene evidence, interaction attrs, launcher, protocol host, solid walker,
  viewport sweep, and full-path walkthroughs under `tests/playwright/e2e/`.
- **Non-browser E2E** (`tests/e2e/`): `e2e_*.py` runners for bandit security,
  facade smoke, gen_protocols, gen_scene_index, and scene_design CLI.

### Developer tools (`tools/`)

Developer-only helpers that do not appear in any build chain.

| File | Purpose |
| --- | --- |
| [tools/run_smoke.py](../tools/run_smoke.py) | Fast browser smoke test wrapper |
| [tools/run_protocol_walkthrough.py](../tools/run_protocol_walkthrough.py) | Full protocol E2E wrapper |
| [tools/build_test_fixture.sh](../tools/build_test_fixture.sh) | Build a single dev-smoke protocol for local testing |
| [tools/normalize_svg_v2.py](../tools/normalize_svg_v2.py) | SVG post-processing for asset normalization |
| [tools/check_css_content_policy.py](../tools/check_css_content_policy.py) | CSS content policy checker (invoked by check_codebase.sh) |
| [tools/html_to_pdf.mjs](../tools/html_to_pdf.mjs) | Playwright-based HTML-to-PDF renderer |
| [tools/seam_types_compile_check.ts](../tools/seam_types_compile_check.ts) | Compile-time type check for seam interface literals |
| [tools/svg_picker/README.md](../tools/svg_picker/README.md) | Browser-based SVG asset picker for content authors |
| [tools/scorecard_m2.mjs](../tools/scorecard_m2.mjs) | M2 scene scorecard runner |
| [tools/scene_to_png.mjs](../tools/scene_to_png.mjs) | `scene:png` -- renders a scene page to PNG + writes render-yield stats |
| [tools/protocol_to_png.mjs](../tools/protocol_to_png.mjs) | `protocol:png` -- renders a protocol page to PNG; records load outcomes |
| [tools/scene_stats.mjs](../tools/scene_stats.mjs) | `computeSceneStats` -- shared scene statistics helper |
| [tools/bbox_helpers.mjs](../tools/bbox_helpers.mjs) | Shared bounding-box helper utilities used by scene tools |

## Data flow

Opening a protocol page end-to-end:

```text
Browser loads dist/<protocol_name>.html
  |
  v
dist_entry.tsx: sees window.__PROTOCOL_NAME__ + #scene-root + #shell-root
  |
  v
protocol_host.tsx: look up ProtocolConfig in generated/protocols.ts
  |
  v
resolve_entry_scene_name(): entry step's scene: field -> SceneChange fallback -> throw
  |
  v
runPipeline(scene, {library: OBJECT_LIBRARY, assets: ASSET_SPECS})
  -> normalizeSchema -> resolveInheritance -> bindObjects
  -> scaleToRealWorld -> groupByZone -> horizontalLayout
  -> verticalLayout -> layoutLabels -> clampSceneBounds
  returns PipelineResult (ComputedItems)
  |
  v
renderScene(#scene-root, result): mounts Solid SceneView -> structural guards
  (collect violations, set data-scene-degraded + console.warn instead of
  throwing) -> renderBackground -> SceneItem per placement (inject_svg or
  placeholder) -> label elements
  |
  v
assert_scene_not_empty(): throws for student protocols with 0 items
  |
  v
createProtocolShellEmitter(): emitter + initial ShellViewSnapshot
create_scene_op_handler(build_store_scene_op_deps(store, render_scene)):
  ops write the reactive scene_store (SceneChange re-renders + resets)
install_walker_debug_surface(): window.PROTOCOL_STEPS + window.gameState (read-only)
create_step_machine(): pure step machine, no DOM
attach_click_resolver(): DOM click -> step machine
  |
  v
ProtocolHud.mount(#shell-root): StepOutline, TipsBubble, StepCounter, GuidanceBar
  subscribes via Solid signal to emitter snapshot
  |
  v
step_machine.start(): emits step_started for entry step -> HUD renders first prompt
  |
  v
Student clicks scene item -> click_resolver -> step_machine.handle_click()
  -> dispatch_interaction_validator() -> on success: scene_operations write
     the reactive scene_store -> Solid renderer reacts (artwork/highlight) and
     window.gameState reflects progress
  -> emit step progress events -> HUD re-renders
```

Scene operations are store-driven (WS-M3-D): `ObjectStateChange` writes declared
object state and the Solid renderer updates the affected item reactively;
`SceneChange` re-renders the next scene while preserving cursor-held
tool/material; `LayoutMove` is an explicit reported no-op (zero authored uses,
Option A). The read-only `window.gameState` / `window.PROTOCOL_STEPS` surfaces
are restored for the walker. Full PRIMARY_CONTRACT item 4 completion (every
student-visible protocol walked end-to-end) is the M4 corpus gate.

## Solid.js import boundary

Solid.js is the reactive rendering framework. Its imports are permitted only
in specific subtrees. This boundary is declared here and enforced by
[tests/test_typescript_boundaries.py](../tests/test_typescript_boundaries.py).

```text
Solid ALLOWED:    src/shell/
                  src/scene_runtime/renderer/
                  src/scene_runtime/state/

Solid FORBIDDEN:  src/scene_runtime/layout/
                  src/scene_runtime/protocol/
                  pipeline/
                  validation/
                  generated/
```

Rationale for each zone:

- `src/shell/` - the HUD observer layer; already uses Solid signals and
  components.
- `src/scene_runtime/renderer/` - hosts the Solid scene components
  (`SceneView`, `SceneItem`) that consume `PipelineResult` and emit the
  stable `data-*` DOM contract. The imperative item-paint path is retired.
- `src/scene_runtime/state/` - hosts the reactive object-state store
  (Solid signals/stores); object-state reactivity is Solid's job.
- `src/scene_runtime/layout/` - pure geometry pipeline; must never depend
  on the reactive framework. If layout uses Solid, two layout systems exist.
- `src/scene_runtime/protocol/` - the step machine (stepper); must not
  depend on Solid as a component. The stepper calls store operations through
  a small runtime bridge. Exception: `import type` statements that reference
  Solid types from the state layer are permitted (type-only, no runtime cost).
- `pipeline/` - build pipeline scripts that emit to `generated/`; must not
  depend on the reactive framework.
- `validation/` - Python-based YAML validators and protocol stepper simulation;
  TypeScript files here must not depend on the reactive framework.
- `generated/` - compiled YAML data files; must not import Solid.

The lint rule is enforced at pytest time. A violation in any forbidden zone
fails the `pytest tests/` gate.

## Testing and verification

```bash
# Fast pytest gate (Python)
pytest tests/

# Node unit tests (TypeScript modules, no browser)
npm run pretest:node && node --import tsx --test tests/test_*.mjs

# Codebase check gate (typecheck, lint, format, node tests)
bash check_codebase.sh

# Playwright browser tests (requires built dist/)
bash build_github_pages.sh && bash run_web_server.sh
# then in another shell:
node tests/playwright/test_framed_layout_m2.mjs
node tests/playwright/test_initial_scene_evidence_m1.mjs
```

What each gate checks:

- **pytest**: pyflakes, ASCII compliance, tab indentation, shebang hygiene,
  import policy, init-file hygiene, protocol YAML validators, markdown links,
  test naming conventions, spec doc camelCase gate.
- **node tests**: layout engine pipeline, step machine, structural guards,
  entry-scene resolution, visual_state_resolver, scene operations,
  protocol emitter, shell signals, walker no-step-branches.
- **check_codebase.sh**: TypeScript typecheck (tsconfig.json + tsconfig.lint.json),
  ESLint zero warnings, Prettier format check, CSS content policy, node unit tests.
- **Playwright**: framed-layout measurable evidence, initial-scene rendering
  evidence, full-path YAML walker.

See [E2E_TESTS.md](E2E_TESTS.md) and [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md)
for browser-test conventions.

## Extension points

- **New mini-protocol**: create `content/protocols/<cluster>/<name>/` with
  `protocol.yaml`, a `scenes/` directory, and optionally `materials.yaml`.
  Re-run the four pipeline generators (`npm run prebuild`).
  See [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md).
- **New scene**: add a YAML file under `content/base_scenes/` or alongside a
  protocol's `scenes/` directory. Re-run `pipeline/gen_scene_index.py`.
  See [specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md).
- **New scene region component**: add a Solid `.tsx` file under
  `src/shell/regions/` and mount it in `src/shell/hud/ProtocolHud.tsx`.
- **New pipeline generator**: add the script to `pipeline/` (not `tools/`);
  register it in `package.json` `prebuild` and `pretest:node` hooks;
  update [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) and
  [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) in the same patch
  (per `AGENTS.md` binding-location rule).
- **New validation rule**: add to the appropriate `validation/yaml_schema/`
  or `validation/scene_lint/` module; new rules in `scene_lint` must go
  through Group A (BLOCKED) or Group B (advisory) classification.

## Known gaps

- Scene operations are store-driven (WS-M3-D): `ObjectStateChange` and
  `CursorAttach` write the reactive `scene_store`, `SceneChange` re-renders the
  next scene under the reset policy, `TimedWait` is observable through the
  subsequent state write, and `LayoutMove` is an explicit reported no-op (zero
  authored uses, Option A).
- The canonical walker (`tests/playwright/e2e/protocol_walkthrough_yaml.mjs`)
  cannot yet complete a new-host protocol end-to-end: its startup contract still
  targets the legacy cell-culture game (`window.resolveInteractionByIndex`, a
  `#welcome-start-btn` modal, the `completionPath.kind` step schema, and a
  scoring screen) that the protocol host does not produce. The read-only
  `window.PROTOCOL_STEPS` / `window.gameState` surfaces the walker reads ARE
  restored and verified; rewriting the walker to the new schema-driven model is
  M4 work, not WS-M3-D.
- sequence_runner protocols resolve and render their initial scene but are
  not runnable: the step machine logs "Unknown step_name" because runners
  carry no `steps` list of their own.
- End-to-end placeholder rendering through the full pipeline is not yet
  proven: `gen_object_library.py` does not scan `tests/content/dev_smoke/`
  fixtures, so dev_smoke fixture objects are not loaded into `OBJECT_LIBRARY`.
- Verification task: confirm whether `tools/run_protocol_walkthrough.py` and
  `tools/run_smoke.py` are the canonical walkthrough entry points, or whether
  `tests/playwright/walker/` supersedes them.
