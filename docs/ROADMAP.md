# Roadmap

<!-- Verified current: 2026-05-09 (scene render-ownership migration marked done; sceneRouter resolution recorded; bench_config/hood_config YAML duplication captured as deferred) -->

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
- Capability-based scene dispatch migration (Patches 1-16, 2026-05-08 to 2026-05-09; archived plan: [archive/scene_capability_architecture_2026-05-09.md](archive/scene_capability_architecture_2026-05-09.md))
- Scene render-ownership migration: render moved from flat `src/scenes/{hood,bench,microscope,plate,incubator}.ts` source modules into per-scene adapters under `src/scenes/<scene>/<scene>.ts`; `SceneAdapter.render(ctx)` made required; new first-class `plate_reader` adapter; helper duplicates consolidated into `shared/liquid_transfer.ts` and `shared/legacy_tokens.ts`; `sceneRouter` flag retired (decision: REMOVED, see "sceneRouter resolution" below). Completed 2026-05-09 (Patches A1-B4; archived plan: [archive/scene_render_migration_2026-05-09.md](archive/scene_render_migration_2026-05-09.md)).

## sceneRouter resolution (recorded 2026-05-09)

The per-protocol `sceneRouter` flag was migration scaffolding from the
2026-05-08 capability migration. Patch B3 of the render-ownership
migration applied the decision rule from the archived plan and resolved
the flag as **REMOVED**:

- Every protocol used `driver` (no `legacy` opt-out remained).
- Patch B2 retired the alternative implementation (the flat source
  modules), so `legacy` had no backing path.
- No roadmap product feature would consume the field.

The flag, the `SceneRouterMode` type, and the `resolveSceneRouter`
function are gone. There is one render and one dispatch path. The
field is intentionally absent rather than missing by oversight.

## Future enhancements

## Scene adapter responsibility-seam decomposition (added 2026-05-09)

The scene render-ownership migration moved each scene's render code from a flat
`src/scenes/<scene>.ts` source module into a per-scene adapter folder, but it
did not decompose the moved logic. Every adapter still owns dispatch wiring,
result handling, completion-event emission, modal rendering, and (in the hood's
case) a token-shaped legacy interaction ladder, all in one file. Patch 4 of the
follow-up plan was scoped to consolidate the hood ladder; bench, microscope,
plate, and incubator adapters carry the same shape and were not addressed.

What to do here is split each adapter by **responsibility seam**, not by line
count: separate dispatch routing from result mutation, separate the legacy
token ladder from the K2 completionPath dispatch, separate render assembly
from event wiring (the hood/`render.ts` split is the working model). The
legacy-token compatibility layer (`src/scenes/shared/legacy_tokens.ts`) can
retire only after the call sites in `bench/bench.ts`, `cell_culture_hood.ts`,
and any other adapter that still consumes `_with_<liquid>` tokens move onto
completionPath dispatch.

Concrete tasks (not ordered; pick by which adapter is next changed for an
unrelated feature):

- Hood interaction-ladder cleanup (deferred Patch 4 of the SCENE_MIGRATION
  follow-up plan): the long token-ladder fallback in
  `src/scenes/cell_culture_hood/cell_culture_hood.ts` should fold into the
  K2 completionPath dispatch above it.
- Bench dispatch decomposition: split `src/scenes/bench/bench.ts` into render,
  dispatch, and result-handling modules along the seams already present in
  the file.
- Microscope dispatch decomposition: extract the manual hemocytometer flow
  from `src/scenes/microscope/microscope.ts` into a sibling module so the
  automated and manual paths stop sharing a single dispatcher.
- Plate / incubator: smaller surfaces; revisit if either grows new behavior.

When all `buildLegacyToken` call sites in the adapters reach zero,
`src/scenes/shared/legacy_tokens.ts` can be deleted as part of the same
patch that retires the last caller.

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
- **`sceneRouter` was migration scaffolding, not a product feature.** Resolved 2026-05-09 (Patch B3) as REMOVED; see "sceneRouter resolution" above.
  Do not reintroduce the flag or a near-equivalent without an explicit product reason.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Patch report contract.** Every subagent patch report must answer 3 questions in order: (1) what changed? (2) which
  mini-protocol (or full protocol) proves it? (3) which legacy path still exists?
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Adapter LOC budgets are warning lights, not gates.** If an adapter exceeds budget, classify the excess (capability
  candidate? scene-specific? unrealistic budget?) and act on the classification -- do not squeeze code purely to hit the
  number. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.

## Deferred cleanups (post 2026-05-09 render migration)

The render-ownership migration (Patches A1-B4, archived plan
[archive/scene_render_migration_2026-05-09.md](archive/scene_render_migration_2026-05-09.md))
explicitly held the following item out of scope. Tracked here so it is
not lost.

- **Layout config vs scene YAML duplication.** `src/bench_config.ts`
  and `src/hood_config.ts` are still legitimate sources of layout
  truth, but parts of the same layout information now also live in the
  scene YAML files under `src/scenes/<scene>/<scene>.yaml`. A future
  cleanup should pick one source of truth per layout fact and remove
  the duplicated definitions from the other side. This is a
  layout-engine concern, not a scene-runtime concern; sequence after
  any further layout-engine refactor (the `layout_engine.ts` split
  listed above).
