<!-- Archived 2026-05-09; render ownership migration complete. -->

# Plan: Scene render-ownership migration (successor to scene_capability_architecture)

## Context

The capability-based scene refactor (archived at `docs/archive/scene_capability_architecture_2026-05-09.md`) shipped the routing/dispatch half: every scene's clicks now flow through `runScene(sceneId)` -> registered `SceneCapability`s -> per-scene `SceneAdapter.dispatchInteraction`. Walkers run green for cell_culture (25/25) and 9/9 mini-protocols through the driver.

But render ownership did not migrate. `init.ts:237` unconditionally calls the flat scene files' `renderHoodScene()` / `renderBenchScene()` / `renderMicroscopeScene()` / `renderPlateScene()` / `renderIncubatorScene()` for every protocol regardless of `sceneRouter` value; the driver is attached on top as an event listener. As a result:

- The flat files `src/scenes/{hood,bench,microscope,plate,incubator}.ts` (2964 LOC) cannot be deleted.
- The `sceneRouter` flag (current values: `legacy | driver`) cannot yet be retired or renamed; its final status is open until render migrates.
- Helpers `deriveHeldLiquid` and `canonicalTool` are defined in BOTH the flat hood file and `src/scenes/shared/liquid_transfer.ts` (real duplication).
- Adapter `cell_culture_hood.ts` is 357 LOC, not the planned <50 -- because per-step state mutations (`completionEvent` switches) are genuine per-scene logic, not capability-shaped.

**Terminology -- avoid "legacy".** In this repo culture, "legacy" reads as "cruft and broken code." The flat scene files are not cruft. They are current, load-bearing render source modules whose ownership is being transferred. Use this vocabulary in the plan, in patches, and in commit messages:

| Phase        | Term to use                     |
| ------------ | ------------------------------- |
| Before A1    | flat scene files                |
| After A1     | temporary render source modules |
| After A2-A6b | migrated render ownership       |
| After B2     | retired source modules          |

Also avoid "legacy path", "legacy router", "legacy deletion." Prefer "current render path", "current routing mode" (or "temporary routing mode"), and "source-module retirement." The function name `buildLegacyToken` itself is a code identifier from before this plan; do not rename in this scope.

## Corrected architecture truth

The original plan's "thin adapter <50 LOC" budget was wrong. Capability mechanics ARE reusable across scenes (item-zone click routing, modal screen sequencing, instrument workspaces, grid counting). Per-step effects ARE NOT (each `completionEvent` is a unique state mutation). Update the architecture model:

- **Capabilities own reusable mechanics.** Click routing, layout, wrong-order detection, modal screens.
- **Adapters own scene-specific effects and rendering.** State mutations, notifications, scene-specific DOM assembly.
- **No LOC gates, no LOC thresholds.** Splits are decided by responsibility, not size. If a render migration creates a clear responsibility seam (DOM assembly vs effect dispatch vs sub-screens), split into sibling files such as `render.ts`, `effects.ts`, `adapter.ts`. If the adapter is large but cohesive, keep it together. Do not split solely because of line count.

## Scope

In scope:

- Add `render(ctx: SceneContext): void` to the `SceneAdapter` contract.
- Move `renderHoodScene` / `renderBenchScene` / `renderMicroscopeScene` (and its 4 sub-screens + grid drawers) / `renderPlateScene` (and its 2 modal screens) / `renderIncubatorScene` (+ `renderTrypsinIncubation`, `runIncubationOverlay`) into the per-scene adapter files. Create a separate `src/scenes/plate_reader/` adapter for the `plate_reader` activeScene rather than continuing to host its render under microscope.
- Route `init.ts` render switch through scene driver's `render()` for opted-in scenes.
- `git rm` the temporary render source modules `src/scenes/{hood,bench,microscope,plate,incubator}.ts` after render migration verified.
- Deduplicate helper implementations: `deriveHeldLiquid` and `canonicalTool` consolidate to `shared/liquid_transfer.ts`. `buildLegacyToken` is token-formatting glue, not liquid logic -- place in `shared/legacy_tokens.ts` (small dedicated module) unless analysis during B1 proves it is genuinely liquid-specific.
- **Resolve `sceneRouter` based on evidence after render migrates.** It may be removed, kept, or renamed; see "sceneRouter resolution" below.
- Update `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`, `docs/ROADMAP.md`. Archive this plan.

Out of scope (untouched):

- `src/svg_globals.ts` (2503 LOC, generated, exempt).
- `src/layout_engine.ts` (847 LOC, deferred).
- `src/bench_config.ts`, `src/hood_config.ts` (still legitimate sources of layout truth; YAML duplication is a separate problem flagged in the YAML critique).
- Behavior changes. This is a structural move only.
- New capabilities. Existing 6 capabilities stay as-is.

## Design philosophy

- **Push ahead, do not replan.** The capability architecture works for what it works for. Render is the next obvious chunk; finish it.
- **Ownership transfer, not coexistence.** The plan is `current render source modules -> migrated adapter render -> retired source modules`. There is no "pre-migration path" we preserve. A1 creates a short bridge so each migration can be verified one scene at a time; the bridge dies as scenes migrate.
- **One scene per patch, ownership moves in the same patch.** Each scene's render migration includes deleting that scene's source-module export in the same patch (or, if not practical, the very next patch -- never preserved beyond that). No duplicate render paths survive a patch boundary.
- **`sceneRouter` is a decision point, not scaffolding to embarrass.** Its final status (remove / keep / rename) is decided in B3 from evidence after render migrates, not assumed up front.

### sceneRouter resolution

`sceneRouter` started as migration scaffolding. After render ownership migrates, the right answer is decided by code-base evidence, not by a default expectation that scaffolding must die.

Decision rule for B3:

- **Remove** if every protocol uses the driver, no alternative scene implementation exists, and no upcoming product feature would consume it.
- **Keep and rename** if the field carries durable product value: comparing implementations during active development, supporting experimental scene variants, or routing to scene profiles (e.g., a future organic-chemistry hood vs cell-culture hood). Honest renames: `sceneImplementation: default | driver`, `sceneProfile: cell_culture`, `sceneSet: standard`. Drop migration-era vocabulary.

Throughout this plan, statements about `sceneRouter` are framed as "resolve after render migration" rather than "remove after cleanup."

## Current state

- `src/scenes/hood.ts`: render (`renderHoodScene`) + dispatch (largely duplicated in the cell_culture_hood adapter) + helpers (some duplicated in `shared/`) + wiring.
- `src/scenes/bench.ts`: render (`renderBenchScene`) + dispatch + helpers.
- `src/scenes/microscope.ts`: 5 render functions (microscope view, 2 hemocytometer screens, quadrant buttons, plate-reader scene, plus `drawHemocytometerGrid` and `drawCellsOnGrid`) + small dispatch.
- `src/scenes/plate.ts`: `renderPlateScene` + 2 modal-screen renderers + small dispatch.
- `src/scenes/incubator.ts`: `renderIncubatorScene` + `renderTrypsinIncubation` + `runIncubationOverlay`.
- `init.ts:237-310` switch on `gameState.activeScene` calls the flat scene files' render unconditionally.
- All 9 mini-protocols + cell_culture have `sceneRouter: driver`.
- Walker green: 25/25 cell_culture + 9/9 mini.

## Architecture

### Adapter contract extension

```ts
interface SceneAdapter {
  sceneId: string;
  dispatchInteraction(itemId: string, ctx: SceneContext): void;
  // `render?` is a temporary bridge during A1-A6b only.
  // After A6b lands, the optional marker is removed and `render(ctx)` is required.
  render?(ctx: SceneContext): void;
}
```

Driver gains `runSceneRender(sceneId)` that calls the adapter's `render()` if defined.

### init.ts refactor

```ts
// Before:
case 'hood':
	renderHoodScene();
	if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') { ... runScene('cell_culture_hood'); }
	break;

// After:
case 'hood':
	runSceneRender('cell_culture_hood');  // adapter owns render
	if (!DRIVER_INITIALIZED_SCENES.has('cell_culture_hood')) {
		DRIVER_INITIALIZED_SCENES.add('cell_culture_hood');
		runScene('cell_culture_hood');
	}
	break;
```

Note: `PROTOCOL_SCENE_ROUTER_MODE === 'driver'` check disappears in Patch B3.

## Patch plan

| Patch | WS                                 | Component / proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Mini-protocol gate                                                                         | Owner   |
| ----- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------- |
| A1    | render bridge                      | Add `render?(ctx)` to SceneAdapter + `runSceneRender(sceneId)` to driver. Each adapter implements `render()` that delegates to the current source-module `renderXxxScene()` for one patch only. init.ts switches its render switch to `runSceneRender()`. The source modules' `renderXxxScene` exports remain only because A2-A6b have not landed yet.                                                                                                                                                                                                                                                                       | full walker (25/25 + 9/9)                                                                  | coder   |
| A2    | bench render move                  | Move `renderBenchScene` body into `bench/bench.ts` adapter. **In the same patch:** delete the export from `src/scenes/bench.ts` and remove the import in the bench adapter. After A2, no other module imports `renderBenchScene` from the source module.                                                                                                                                                                                                                                                                                                                                                                     | tutorial_bench_direct + full walker                                                        | coder   |
| A3    | hood render move                   | Move `renderHoodScene` body into `cell_culture_hood/cell_culture_hood.ts`. **In the same patch:** delete the export from `src/scenes/hood.ts`. If a clear render/effects/dispatch seam emerges, split into `render.ts` / `effects.ts` / `adapter.ts` siblings -- by responsibility, not size.                                                                                                                                                                                                                                                                                                                                | tutorial_hood_transfer, tutorial_split, tutorial_drug_dilution, tutorial_pbs + full walker | coder   |
| A4    | incubator render move              | Move `renderIncubatorScene` + `renderTrypsinIncubation` + `runIncubationOverlay` into `incubator/incubator.ts`. **In the same patch:** delete those exports from `src/scenes/incubator.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                  | full cell_culture incubator-step path (existing incubator driver runner) + full walker     | coder   |
| A5    | plate render move                  | Move `renderPlateScene` + 2 modal-screen functions into `plate/plate.ts`. **In the same patch:** delete those exports from `src/scenes/plate.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | tutorial_plate_intro, tutorial_plate_reader + full walker                                  | coder   |
| A6a   | microscope render move             | Move `renderMicroscopeScene` + 2 hemocytometer screens + `renderQuadrantButtons` + `drawHemocytometerGrid` + `drawCellsOnGrid` into `microscope/microscope.ts`. **In the same patch:** delete those exports from `src/scenes/microscope.ts`.                                                                                                                                                                                                                                                                                                                                                                                 | tutorial_cell_counter, tutorial_hemocytometer_count + full walker                          | coder   |
| A6b   | plate_reader adapter + render move | Create `src/scenes/plate_reader/plate_reader.{yaml,ts}` as a first-class adapter (plate_reader is a top-level activeScene; do not keep it nested under microscope just because the source happened to live there). Move `renderPlateReaderScene` from the microscope source module into this adapter and **delete the export from `src/scenes/microscope.ts` in the same patch.** Register via scene_registry. init.ts case `'plate_reader'` calls `runSceneRender('plate_reader')`. **At the end of A6b:** make `render(ctx)` required on the `SceneAdapter` interface -- drop the `?` on the optional. The bridge is gone. | tutorial_plate_reader + full cell_culture plate-read/results path + full walker            | coder   |
| B1    | helper dedup + import cleanup      | No duplicate implementations of `deriveHeldLiquid`, `canonicalTool`, or `buildLegacyToken` remain anywhere in `src/`. `deriveHeldLiquid` and `canonicalTool` consolidate to `shared/liquid_transfer.ts`. `buildLegacyToken` lands in `shared/legacy_tokens.ts` (token formatting is not liquid logic -- locked, no override). All callers import from the chosen shared module. tsc clean.                                                                                                                                                                                                                                   | full walker                                                                                | coder   |
| B2    | source-module retirement           | Pure verification + delete. Entry criteria (must hold before `git rm`): (1) no production or test file imports any symbol from `src/scenes/hood.ts`, `bench.ts`, `microscope.ts`, `plate.ts`, `incubator.ts`; (2) each source module has no exported symbol still consumed anywhere; (3) the adapter `render(ctx)` is no longer optional. With those satisfied, `git rm src/scenes/hood.ts src/scenes/bench.ts src/scenes/microscope.ts src/scenes/plate.ts src/scenes/incubator.ts`. tsc clean, walker green. If any entry criterion fails, B2 stops and the missing migration goes back to its A-patch.                    | full walker                                                                                | coder   |
| B3    | sceneRouter resolution             | Apply the decision rule from "sceneRouter resolution" above. Either: (a) remove the field from every protocol YAML and delete its switch in `resolveSceneRouter`; or (b) keep and rename it to honest non-migration vocabulary (`sceneImplementation` / `sceneProfile` / `sceneSet`). Document the decision and rationale in the patch's CHANGELOG entry. tsc clean, walker green.                                                                                                                                                                                                                                           | full walker                                                                                | coder   |
| B4    | docs + archive                     | Update `docs/CODE_ARCHITECTURE.md` (corrected adapter ownership model: capabilities own reusable mechanics, adapters own scene-specific render and effects), `docs/FILE_STRUCTURE.md` (source modules retired, plate*reader adapter added), `docs/ROADMAP.md` (rendering migration done; `bench_config.ts`/`hood_config.ts` vs YAML duplication remains as deferred; sceneRouter resolution recorded). Archive this plan to `docs/archive/scene_render_migration*<date>.md`.                                                                                                                                                 | n/a                                                                                        | planner |

Total: **11 patches** (A1, A2, A3, A4, A5, A6a, A6b, B1, B2, B3, B4).

## Acceptance gates

### Per-patch

- `npx tsc --noEmit -p src/tsconfig.json` clean.
- `bash check_codebase.sh` exits 0.
- Walker: cell_culture 25/25 + 9/9 mini-protocols green through driver.
- For Patches A2-A6b: that scene's mini-protocol(s) listed in the patch table verified green.
- **DOM contract preserved:** Walker-facing and user-facing DOM contracts must be preserved: stable ids, `data-item-id` / `data-step-id` attributes, active/selected/completed CSS classes, modal/control ids, labels, and click targets. Incidental whitespace or attribute-order changes are acceptable. Render is a structural move; selector resolution and accessibility must not change.
- Source-module export of the migrated render function is removed in the same patch (or, if not practical, the very next patch); no migrated render path coexists with its source-module original beyond a single patch boundary.

### Release gate

- No flat monolithic scene implementation files remain at `src/scenes/*.ts`. Flat shared infrastructure files (`scene_driver.ts`, `scene_registry.ts`, future `types.ts`, `capability_registry.ts`, `scene_test_api.ts`, etc.) are allowed.
- Explicit deletion check: `git ls-files src/scenes/hood.ts src/scenes/bench.ts src/scenes/microscope.ts src/scenes/plate.ts src/scenes/incubator.ts` returns no output.
- `grep -rE "deriveHeldLiquid|canonicalTool" src/scenes/` returns hits only in `shared/liquid_transfer.ts` and adapter usages.
- `grep -r "buildLegacyToken" src/scenes/` returns hits only in `shared/legacy_tokens.ts` and adapter usages.
- `sceneRouter` resolution applied per B3; CHANGELOG documents the decision.
- `pytest tests/` green.
- `bash build_github_pages.sh` succeeds.
- `bash export_single_file.sh` succeeds.

## Risks

| Risk                                                                                                 | Mitigation                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inlined render references private source-module helpers not exported                                 | First check imports before inlining; if a helper is needed across scenes, move it to `shared/` in the same patch                                                                      |
| `renderHoodScene` calls into `getItemSvgHtml` / `getHoodItemAccentStyle` which other scenes also use | These are already exported; keep them temporarily in `src/scenes/hood_render_helpers.ts` if cross-scene, or inline if only hood uses them                                             |
| init.ts has scene-specific show/hide logic for hood/bench DOM                                        | Preserve that block; only the render call changes                                                                                                                                     |
| Adapter contains two clearly independent responsibilities after a migration patch                    | Split by responsibility into sibling files (e.g., `render.ts`, `effects.ts`, `adapter.ts`). Do not split based on line count alone; do not avoid splitting just because it adds files |
| Walker drops mid-migration                                                                           | Single `git revert` per patch; stop and diagnose, do not push past red                                                                                                                |
| `sceneRouter` decision is rushed in B3                                                               | Treat B3 as a real design decision, not a cleanup formality. If evidence is mixed, defer the rename and document why in CHANGELOG; removal is not the only success outcome            |

## Open questions

1. **Per-scene adapter file split after migration.** Decided per scene by responsibility seams discovered post-merge, not preemptively. Likely candidates for hood after A3: `cell_culture_hood/render.ts` (DOM assembly), `cell_culture_hood/effects.ts` (the 17 completionEvent handlers), `cell_culture_hood/adapter.ts` (registers + thin wrapper).
2. **`sceneRouter` final form.** Decided in B3 from evidence (see "sceneRouter resolution"). Not assumed.

(`buildLegacyToken` placement is now locked, not open: `shared/legacy_tokens.ts`. plate_reader adapter location is locked: `src/scenes/plate_reader/`.)

## Lesson learned (post-execution)

**Module-load side effects are ownership too.**

A6a and B1 each shipped a false-green claim because the executing coder treated "render ownership" as "the named render function plus its called helpers" and missed the side-effecting top-level statements that ran when the source module was previously imported. Concretely, both patches left `registeredEmitters.add(...)` calls inside source modules that nothing imported anymore, so the protocol validator threw `missing completion-event emitter` at page load and a modal-alert overlay blocked walker pointer events on cell_culture step 6.

In both cases the manager caught the regression by re-running cell_culture directly and comparing to the verified-green baseline, then dispatched a focused fix that moved the side effects into the owning adapter. No code damage shipped, but the pattern would have been cheaper to prevent than to catch.

For future render or source-module retirement work, the brief must say explicitly that ownership covers all module-load side effects, not only the named render function. Items to enumerate when migrating a scene:

- `registeredEmitters.add(...)` calls
- `registerScene(...)` and `registerCapability(...)` calls
- `window.*` / test-API bindings
- top-level `addEventListener` and observer setup
- mutations of any global registry (`SCENE_REGISTRY`, `CAPABILITY_REGISTRY`, etc.)
- any other module-load `import "..."` for side effects

If a source module is being retired, every one of these must move with the responsibility, not stay behind. Verification: after the move, the source module must contain no top-level statements with side effects.
