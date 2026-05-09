# Roadmap

<!-- Verified current: 2026-05-07 (delivered section confirmed against CHANGELOG; legacy M1-M5 labels removed; future items confirmed not in active plan) -->

Planned features and improvements for the cell culture simulation game.

## Delivered

- Two-scene workspace: hood (sterile work) and bench (equipment) peer scenes
- 96-well plate geometry with 8-point carboplatin dose response and metformin sensitization
- 25-step protocol across 3 days (Day 1 split/count/seed, Day 2 dilute/treat, Day 4 MTT/read)
- 22 hood reagents and equipment organized in tab-stop clusters
- 6 bench instruments: centrifuge, water bath, vortex, cell counter, microscope, incubator
- Depth-based visual layering (back/mid/front tiers with opacity and brightness)
- Cell model with metformin sensitization (2x IC50 shift)
- MTT assay readout with OD560 absorbance and realistic noise
- Protocol-fidelity scoring (5 categories: dilution, plate map, timing, MTT technique, absorbance plausibility)
- Dilution prep validation (intermediate, low-range, high-range, metformin stocks)
- Day timeline state machine (day1/day2/day4 with incubator-gated transitions)

## Future enhancements

## Hood setup phase

- Add a pre-protocol step where students arrange equipment inside the biosafety hood themselves
- Items start outside or on a staging area; students drag each into the hood workspace
- Teach sterile field layout: clean-to-dirty direction, airflow awareness, spacing
- Score placement based on proper technique (e.g., not blocking rear vents, waste on dirty side, spacing items)
- Could serve as an intro tutorial before the main cell culture protocol

- **Split `src/layout_engine.ts` (857 LOC) into 2 modules: `layout_assets.ts` + slimmed `layout_engine.ts`.** Coherent at
current size; revisit if it crosses 1000 LOC. Some of this logic moves into `src/scenes/shared/scene_layout.ts` during this
plan; the residual layout engine stays where it is.
- **Add `tests/types/` with `Expect<Equal<...>>` scaffold + 2 type-test files for `ProtocolStep` and `CompletionPath`.** Wire
into all three build scripts. Would have caught the K2 drift at compile time.
- **Capability contract type tests.** When the type-test suite lands, add a third file that asserts every capability module
conforms to the `SceneCapability` interface and every YAML scene config conforms to the `SceneConfig` schema. This is the
type-level safety net for the new system.

## Capability-based scene architecture (added 2026-05-08)

Items below were deferred from the capability-based scene architecture refactor plan
(`~/.claude/plans/sharded-imagining-diffie.md`). They are tracked here so they survive
the migration and surface during planning.

### Deferred work items

- **Split `src/layout_engine.ts` (857 LOC) into 2 modules: `layout_assets.ts` + slimmed `layout_engine.ts`.** Coherent at
  current size; revisit if it crosses 1000 LOC. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Add `tests/types/` with `Expect<Equal<...>>` scaffold + 2 type-test files for `ProtocolStep` and `CompletionPath`.**
  Wire into all three build scripts. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Capability contract type tests.** When the type-test suite lands, add a third file that asserts every capability module
  conforms to the `SceneCapability` interface and every YAML scene config conforms to the `SceneConfig` schema.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Scene YAML validator pytest.** Replace the one-time manual experiment in MS-FOUNDATION with an automated builder test
  that asserts a corpus of malformed scene YAMLs fail loudly and a corpus of valid ones load cleanly. Add once at least one
  real scene YAML exists. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Move scene YAML to `src/content/scenes/` if it becomes author-facing content.** Currently lives beside the adapter under
  `src/scenes/<scene>/`; if scenes become protocol-authored content, relocate in a separate migration.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.

### Locked-decision reminders (guardrails)

- **Mini-protocol failures are design evidence, not nuisance failures.** If a mini-protocol fails during a scene migration,
  fix the scene model or capability boundary before proceeding. Do not patch around the failure.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **`sceneRouter` is migration scaffolding, not a product feature.** It must be deleted at MS-CLEANUP (WP-C2.1). Do not
  extend or reuse it for unrelated routing. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Patch report contract.** Every subagent patch report must answer 3 questions in order: (1) what changed? (2) which
  mini-protocol (or full protocol) proves it? (3) which legacy path still exists?
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Adapter LOC budgets are warning lights, not gates.** If an adapter exceeds budget, classify the excess (capability
  candidate? scene-specific? unrealistic budget?) and act on the classification -- do not squeeze code purely to hit the
  number. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.

## Future work: scene rendering migration (follow-up to 2026-05-08 capability migration)

The 2026-05-08 capability-based scene migration migrated **click dispatch and step
completion only** through a new driver pipeline. **Scene rendering** (SVG layout, DOM
build, modal markup, overlay UI) was not in scope and remains in the legacy per-scene
files. Patch 17 of the original plan attempted to delete those files and the walker
regressed immediately (no rendering source). The legacy files were restored and Patches
17-18 were deferred. Plan archived at
[archive/scene_capability_architecture_2026-05-09.md](archive/scene_capability_architecture_2026-05-09.md).

This roadmap entry tracks the rendering follow-up. It is intentionally a roadmap entry,
not an implementation plan: the design is open and a fresh planning pass should produce
the patch sequence.

### The gap

Click dispatch and step completion run through the new capability/adapter pipeline.
Scene rendering still runs through the original monolithic functions in five legacy
files (LOC counts as of 2026-05-09):

| Legacy file | LOC | Renderer entry point |
| --- | --- | --- |
| [src/scenes/hood.ts](../src/scenes/hood.ts) | 1438 | `renderHoodScene` |
| [src/scenes/microscope.ts](../src/scenes/microscope.ts) | 661 | `renderMicroscopeScene` (and modal renderers) |
| [src/scenes/bench.ts](../src/scenes/bench.ts) | 567 | `renderBenchScene` |
| [src/scenes/incubator.ts](../src/scenes/incubator.ts) | 151 | `renderIncubatorScene` |
| [src/scenes/plate.ts](../src/scenes/plate.ts) | 147 | `renderPlateScene` |

Total: ~2964 LOC of SVG/DOM rendering still in the legacy modules.

### Pre-conditions (already in place)

- Capability/adapter pattern is settled and proven through 10 protocols (9 mini +
  full `cell_culture` 25/25). The contract for new modules to plug into is known.
- The element-id mechanism on scene YAML (`elementId` field, Patch 14) lets scene
  configs point at any DOM element id, including the existing `hood-scene` and
  `microscope-overlay`.
- The per-protocol `sceneRouter` flag and the legacy/driver coexistence pattern
  are still in place; rendering migration can follow the same per-scene incremental
  pattern as dispatch did.

### High-level approaches (open for design)

A planning pass should pick one (or hybrid):

- **Adapter-owned rendering.** Each scene adapter grows a `render(ctx)` method
  that produces the scene's DOM/SVG. Capabilities stay focused on click dispatch
  and state. Pro: keeps the simple "one adapter per scene" mental model. Con: hood
  adapter would balloon past current LOC budgets.
- **Render capability per scene shape.** Add render capabilities mirroring the
  existing dispatch capabilities (for example a `gridCountingRender` to match
  `gridCountingWorkspace`) and a generic `sceneRenderer` that composes them. Pro:
  consistent with the dispatch model, naturally factors shared rendering. Con:
  more capability surface; requires careful capability-vs-adapter boundary work.
- **Standalone rendering modules.** Treat scene rendering as a peer of the
  capability pipeline rather than part of it. `src/scenes/<scene>/<scene>_render.ts`
  exports a `render<Scene>Scene` that the driver invokes alongside dispatch. Pro:
  smallest mental change. Con: re-creates the legacy split, just with new file
  paths.

Decision deferred. The right answer falls out of one or two pilot migrations
(suggest bench or incubator first; both are small).

### Post-conditions (what the follow-up unlocks)

- The five legacy scene files (`bench.ts`, `hood.ts`, `microscope.ts`, `plate.ts`,
  `incubator.ts`) can be `git rm`'d (Patch 17 of the original plan).
- The `sceneRouter` flag and the `legacy` branch in `scene_registry` and `init.ts`
  can be removed (Patch 18 of the original plan).
- `src/scenes/*.ts` then contains only driver infrastructure and per-scene folders;
  no flat monolithic scene modules remain.

Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
