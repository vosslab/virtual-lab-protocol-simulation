# Plan: Finish the scene migration (TS, YAML, generated/)

> Archived 2026-05-09 -- migration complete. Patches A1-A6 (Plan A), B1-B12
> (Plan B), and C1-C5 (Plan C) all landed. Final cleanroom + walker green.
> See [docs/CHANGELOG.md](../CHANGELOG.md) under `## 2026-05-09` for the
> grouped closeout entry. Live-doc references to `src/svg_globals.ts`,
> `src/content/{protocol,inventory,scene}_data.ts`, `src/bench_config.ts`,
> `src/hood_config.ts`, and `src/scenes/shared/legacy_tokens.ts` were
> retired by C5; this archive intentionally preserves the historical
> terminology used at planning time.

## Context

The cell-culture-game-claude codebase has been moving from
TypeScript-source-of-truth scenes toward data-driven scenes for
several patch series. The 2026-05-09 render-ownership patch series
(commit `b983004`, archived plan
[docs/archive/scene_render_migration_2026-05-09.md](../../nsh/cell-culture-game-claude/docs/archive/scene_render_migration_2026-05-09.md))
shipped one slice; the SVG pipeline retirement of `src/svg_globals.ts`
just shipped another (
[docs/SVG_PIPELINE.md](../../nsh/cell-culture-game-claude/docs/SVG_PIPELINE.md)).
Three concrete gaps remain visible to the user and each must close
before the migration is honestly "done":

1. **Legacy adapter code lingers**, per
   [docs/ROADMAP.md](../../nsh/cell-culture-game-claude/docs/ROADMAP.md)
   "Scene adapter responsibility-seam decomposition". Each adapter
   still owns dispatch wiring, completion-event emission, modal
   rendering, and a compatibility-token interaction ladder in one
   file. `src/scenes/shared/legacy_tokens.ts` cannot retire until
   its bench and hood callers move onto K2 `completionPath` dispatch.
2. **The YAMLs are not the full source of truth.** `src/bench_config.ts`
   and `src/hood_config.ts` still hold layout facts that the
   per-scene YAMLs (`bench.yaml`, `cell_culture_hood.yaml`) already
   partially duplicate, and per-scene `<scene>.ts` adapters still
   hand-encode scene-specific data that should be data-driven.
3. **Generated TS lives under `src/` instead of `generated/`.**
   `src/content/{scene_data,protocol_data,inventory_data}.ts` carry
   `AUTO-GENERATED` headers but sit beside hand-written modules,
   while the SVG pipeline already proved the cleaner path
   (`generated/svg_assets/`, `generated/svg_manifest.ts`, gitignored,
   regenerated on every build).

This plan finishes those three migrations and turns each doctrine
into a checkable invariant guarded by a test, so the same gaps
cannot quietly reopen.

The plan is intentionally atomized into three short, independently
closeable sub-plans so each win lands cleanly and keeps momentum:

- **Plan A - Generated data boundary.** No generated TS under
  `src/`; facades are the only authored access path.
- **Plan B - Scene YAML owns static scene facts.** Layout truth
  leaves `bench_config.ts` and `hood_config.ts`.
- **Plan C - Adapter seams and compatibility-token retirement.**
  Hood compatibility-token ladder folded into completionPath
  dispatch; bench / microscope responsibility seams cleaned;
  `src/scenes/shared/legacy_tokens.ts` deleted.

Each sub-plan has its own hard close criteria. No patch needs to
prove the whole future; each patch moves one boundary and leaves
the repo better than it found it. In this document the three
sub-plans are presented as milestones M1 / M2 / M3 to fit the
canonical multi-workstream heading vocabulary, but they should be
read as three separable plans rather than one twenty-patch
monolith. Wording note: "compatibility token" is the canonical
term in prose; the code identifier `buildLegacyToken` and the
filename `legacy_tokens.ts` stay until deletion.

## Objectives

- Move every YAML-emitted TS file out of `src/` and under
  `generated/`, regenerated on every build, gitignored, never
  hand-edited.
- Make YAML the single source of static, declarative scene and
  layout facts; retire `src/bench_config.ts` and
  `src/hood_config.ts` once their layout data lives only in YAML.
- Route every authored module under `src/**` to generated data
  through one of four authored facade modules; ban direct
  `generated/` imports outside the facades.
- Fold the hood compatibility-token ladder into K2 `completionPath`
  dispatch; decompose `bench/bench.ts` and `microscope/microscope.ts`
  along their existing responsibility seams; delete
  `src/scenes/shared/legacy_tokens.ts` when its caller count reaches
  zero.
- Hold the Playwright walker green throughout
  (`node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`:
  cell_culture 25/25 + 9 tutorial mini-protocols).
- Ship pytests that fail loudly if any of the four invariants
  regresses (authored-vs-generated tree boundary; facade-only
  imports; YAML schema with cross-references; legacy-token
  absence).

## Design philosophy

This plan picks **enforced boundaries over diligence**: instead of
trusting future contributors to keep generated code out of `src/`
or to push static facts into YAML, every doctrine in the
Objectives ships paired with a pytest that fails the build when
the doctrine is broken. The cost is more test surface and a
slightly larger emitter; the rejected alternative ("document the
rules in CONTRIBUTING and review at PR time") was the prior state
that produced the three gaps this plan is closing. The plan also
treats the **patch boundary** as the migration unit: each generated
family moves out of `src/`, gains its facade, and redirects every
importer in one diff, because the prior render-ownership migration
showed that two-patch sequencing leaves the codebase importing both
old and new paths at the same time. Repo principles `Fix the
design, not the symptom` and `Atomic task decomposition` from
[docs/REPO_STYLE.md](../../nsh/cell-culture-game-claude/docs/REPO_STYLE.md)
are the load-bearing references.

## Scope

In scope:

- Move `src/content/scene_data.ts`, `src/content/protocol_data.ts`,
  `src/content/inventory_data.ts` to `generated/`.
- Introduce authored facades that all of `src/**` imports through:
  `src/scene_configs.ts`, `src/inventory.ts`, `src/protocol.ts`. The
  existing `src/svg_assets.ts` is the SVG facade and the precedent.
- Extend the scene YAML schema to carry the static, declarative layout
  facts currently in `bench_config.ts` / `hood_config.ts` (zones,
  items, labels, accent rules, layout rules, tab stops, item
  size/scale, depth tier, anchor / alignStop, kind, svgAsset,
  cross-reference rules to inventory and svg asset ids).
- Migrate per-scene layout facts from `_config.ts` modules into YAML;
  retire the `_config.ts` modules when their content is empty of
  layout truth.
- Audit and migrate `src/game_state.ts` dependencies on scene config
  (separate WP) before the bench/hood YAML migration.
- Fold the hood compatibility-token ladder into completionPath
  dispatch.
- Decompose `bench/bench.ts` and `microscope/microscope.ts` along
  their existing responsibility seams.
- Delete `src/scenes/shared/legacy_tokens.ts` once its callers are
  zero.
- Update emitter scripts (`tools/build_scene_data.py`,
  `tools/build_protocol_data.py`) to write to `generated/`.
- Update build scripts (`build_github_pages.sh`,
  `export_single_file.sh`, `check_codebase.sh`) and `tsconfig`
  includes.
- Update docs: `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`,
  `docs/SCENE_YAML_FORMAT.md`, `docs/SCENE_ARCHITECTURE.md`,
  `docs/SCENE_VOCABULARY.md`, `docs/ROADMAP.md`. Archive this plan at
  end. Run a docs-grep at closeout to flush stale `src/svg_globals.ts`,
  `src/content/scene_data.ts`, `src/content/protocol_data.ts`,
  `src/content/inventory_data.ts` references everywhere under `docs/`.
- Add `tests/test_scene_yaml_validator.py` with strict shape checks
  for every new schema field plus cross-reference checks against
  inventory ids and svg asset ids (deferred ROADMAP item, expanded).

## Non-goals

- Re-planning the SVG pipeline migration. It has already landed:
  `tools/generate_svg_globals.py` -> `generated/svg_assets/*.ts` +
  `generated/svg_manifest.ts`, with the authored facade
  `src/svg_assets.ts`. `docs/SVG_PIPELINE.md` is the doctrine source
  of truth and was finalized before this plan; `src/svg_globals.ts`
  retirement is owned by that effort, not this one.
- Splitting `src/layout_engine.ts` (deferred ROADMAP item; sequence
  after this plan).
- Migrating `src/layout_engine.ts` and `src/protocol_ui.ts` onto the
  SVG facade (called out as out-of-scope in `docs/SVG_PIPELINE.md`).
- New scene capabilities or new scene types.
- Behavioral changes to scenes. Render output, click behavior, walker
  results must remain identical.

## Current state summary

- Render-ownership migration shipped 2026-05-09 (commit `b983004`,
  archived plan `docs/archive/scene_render_migration_2026-05-09.md`).
  Six per-scene adapter folders exist with `<scene>.ts` and
  `<scene>.yaml` pairs.
- SVG pipeline boundary doctrine is in `docs/SVG_PIPELINE.md`. Files
  on disk: `generated/svg_assets/*.ts`, `generated/svg_manifest.ts`
  (gitignored, regenerated by the build), authored facade
  `src/svg_assets.ts`. Scene and capability code imports through
  the facade. `.gitignore` already contains `generated/`, so any
  file inside that tree is untracked the moment it lands there.
- Three other generated TS files still sit under `src/`, all with
  `AUTO-GENERATED` headers, all currently tracked in git (this is
  the artifact of their `src/` location; once they move to
  `generated/`, they become untracked like the SVG outputs):
  - `src/content/scene_data.ts` (zero importers today; awaits
    facade and schema extension)
  - `src/content/protocol_data.ts` (4 importers in `src/`:
    `init.ts`, `game_state.ts`, `protocol_ui.ts`, `step_dispatch.ts`)
  - `src/content/inventory_data.ts` (3 importers, all in scene
    adapters: `bench/bench.ts`,
    `cell_culture_hood/cell_culture_hood.ts`,
    `cell_culture_hood/render.ts`)
- Layout facts split between authored TS and authored YAML:
  - `src/bench_config.ts` exports `BENCH_LAYOUT_RULES`,
    `BENCH_SCENE_ITEMS`, `getBenchItemLabel` (consumed by
    `src/scenes/bench/bench.ts`, `src/game_state.ts`).
  - `src/hood_config.ts` exports `HOOD_LAYOUT_RULES`,
    `HOOD_SCENE_ITEMS`, `getHoodItemLabel` (consumed by
    `src/scenes/cell_culture_hood/{cell_culture_hood,render}.ts`,
    `src/game_state.ts`).
  - `src/scenes/bench/bench.yaml` (116 lines) and
    `src/scenes/cell_culture_hood/cell_culture_hood.yaml` (328 lines)
    duplicate part of the same data without a single source rule.
- Adapter responsibility seams unresolved:
  - `src/scenes/cell_culture_hood/cell_culture_hood.ts` (792 LOC):
    K2 completionPath dispatch with a compatibility-token fallback
    ladder using `buildLegacyToken`.
  - `src/scenes/bench/bench.ts` (626 LOC): render + dispatch +
    effects in one module; second `buildLegacyToken` caller.
  - `src/scenes/microscope/microscope.ts` (635 LOC): automated and
    manual hemocytometer dispatch share one module (microscope is
    not a `buildLegacyToken` caller).
- `src/scenes/shared/legacy_tokens.ts` (29 LOC) survives until its
  two callers move onto completionPath dispatch.
- Walker is green at HEAD (per archived plan's release-gate
  evidence).

## Architecture boundaries and ownership

Three doctrines, three boundaries:

- **Authored vs generated tree boundary.** No file in `src/` may
  begin with `AUTO-GENERATED` or `Generated file`. Every file in
  `generated/` must begin with one of those markers. Both checks are
  Grep-tool assertions.
- **Facade boundary for generated data.** *All* authored modules
  under `src/**` import generated data only through these facades:
  - `src/svg_assets.ts` (SVG; already in place)
  - `src/scene_configs.ts` (re-exports `SCENE_CONFIGS` and
    `SceneConfig` type from `generated/scene_data.ts`)
  - `src/inventory.ts` (re-exports `REAGENTS` and helpers from
    `generated/inventory_data.ts`)
  - `src/protocol.ts` (re-exports `PROTOCOL_ID`, `PROTOCOL_STEPS`,
    and helpers from `generated/protocol_data.ts`)

  The only exception is the facade module itself, which imports
  from `generated/`. This rule applies equally to scenes,
  capabilities, init, game_state, protocol_ui, step_dispatch, and
  any future authored module. (Decision recorded; was open question
  in prior draft.)
- **YAML owns static, declarative scene facts.** TypeScript owns
  algorithms, derived state, event effects, validation, and runtime
  conditionals. Once a static, declarative fact moves into
  `<scene>.yaml`, no authored TS may export the same fact under a
  different name. `src/bench_config.ts` and `src/hood_config.ts`
  shrink to zero or, if a runtime helper is genuinely needed, the
  helper relocates to `src/scenes/shared/`. The `_config.ts` file
  itself does not survive in either case.

### Ownership map

| Doctrine | Authored owner | Generated owner | Facade owner | Verifier |
| --- | --- | --- | --- | --- |
| Authored vs generated tree | `src/` | `generated/` | n/a | `tests/test_authored_vs_generated.py` (new) |
| Generated data facade | `src/svg_assets.ts`, `src/scene_configs.ts`, `src/inventory.ts`, `src/protocol.ts` | `generated/svg_assets/*`, `generated/svg_manifest.ts`, `generated/scene_data.ts`, `generated/inventory_data.ts`, `generated/protocol_data.ts` | (see authored owner) | `tests/test_facade_imports.py` (new; covers all of `src/**`) |
| YAML layout truth | `src/scenes/<scene>/<scene>.yaml` | `generated/scene_data.ts` | `src/scene_configs.ts` | `tests/test_scene_yaml_validator.py` (new); zero importers of `bench_config`, `hood_config` from `src/**` |

### Mapping (milestones / workstreams -> components / patches)

| Milestone | Workstream | Components touched | Patch grouping |
| --- | --- | --- | --- |
| M1 (Plan A) | M1.WS0 generated bootstrap command | `tools/bootstrap_generated.sh` (or equivalent), `build_github_pages.sh`, `export_single_file.sh`, `tests/conftest.py` | Patch A1 |
| M1 (Plan A) | M1.WS1 generated tree relocation + facade introduction (per data family) | `tools/build_*.py`, `generated/`, `src/{scene_configs,inventory,protocol}.ts`, all importers | Patches A2-A4 |
| M1 (Plan A) | M1.WS2 boundary tests | `tests/test_authored_vs_generated.py`, `tests/test_facade_imports.py` | Patch A5 |
| M1 (Plan A) | M1.WS3 docs + closeout grep + cleanroom gate | `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`, `tsconfig.json`, `.gitignore` | Patch A6 |
| M2 (Plan B) | M2.WS0 scene classification | `docs/archive/scene_classification_<date>.md` | Patch B1 |
| M2 (Plan B) | M2.WS1 SceneConfig schema extension + emitter | `tools/build_scene_data.py`, `generated/scene_data.ts` (regen), `docs/SCENE_YAML_FORMAT.md` | Patch B2 |
| M2 (Plan B) | M2.WS6 YAML validator pytest + corpora | `tests/test_scene_yaml_validator.py`, fixture corpora | Patch B3 |
| M2 (Plan B) | M2.WS2 layout duplication audit | `docs/archive/scene_yaml_layout_audit_<date>.md` | Patch B4 (doc only) |
| M2 (Plan B) | M2.WS3 game_state.ts dependency audit + extraction | `src/game_state.ts`, possibly `src/scenes/shared/` helpers | Patch B5 |
| M2 (Plan B) | M2.WS4 small-scene migration | `src/scenes/{incubator,plate,plate_reader,microscope}/<scene>.yaml` + adapter | Patches B6-B9 (one per scene) |
| M2 (Plan B) | M2.WS5 bench/hood migration + `_config.ts` retirement | `src/scenes/{bench,cell_culture_hood}/**`, `src/{bench,hood}_config.ts` | Patches B10-B11 |
| M3 (Plan C) | M3.WS1 hood compatibility-token ladder retirement | `src/scenes/cell_culture_hood/cell_culture_hood.ts` | Patch C1 |
| M3 (Plan C) | M3.WS2 bench decomposition | `src/scenes/bench/{bench,render,dispatch,effects}.ts` | Patch C2 |
| M3 (Plan C) | M3.WS3 microscope decomposition | `src/scenes/microscope/{microscope,manual_hemocytometer}.ts` | Patch C3 |
| M3 (Plan C) | M3.WS4 legacy_tokens retirement | `src/scenes/shared/legacy_tokens.ts` (delete) | Patch C4 |
| M3 (Plan C) | M3.WS5 docs closeout + archive + docs freshness grep | `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/archive/scene_migration_completion_<date>.md`, all `docs/**` | Patch C5 |

Component name discipline: workstream IDs are planning labels and
never appear in source filenames or test names. Module names use
durable terminology (`render`, `dispatch`, `effects`,
`manual_hemocytometer`, `scene_configs`, `inventory`, `protocol`).

## Milestone plan

### M1 (Plan A): Authored/generated boundary

> **Plan A close criteria (atomized hard endpoint):** `generated/`
> is gitignored; `src/content/*_data.ts` are gone; the four
> facades are the only authored access path; fresh-checkout
> bootstrap works (`bash dist_clean.sh && bash tools/bootstrap_generated.sh && npx tsc --noEmit -p src/tsconfig.json && bash build_github_pages.sh`);
> walker is green. Plans B and C may begin once these close.

- **Depends on:** none.
- **Entry criteria:** SVG pipeline migration landed
  (`generated/svg_assets/`, `generated/svg_manifest.ts`,
  `src/svg_assets.ts`, `docs/SVG_PIPELINE.md`). Walker green at
  HEAD.
- **Deliverables:** `generated/{scene_data,protocol_data,inventory_data}.ts`
  are emitted by the build scripts and exist after build/bootstrap,
  but are **not tracked by git** (`generated/` is in `.gitignore`);
  `src/content/{scene_data,protocol_data,inventory_data}.ts` are
  removed from `git ls-files`; three facades
  (`src/{scene_configs,inventory,protocol}.ts`) exist and are the
  only path to generated data from `src/**`; two new boundary
  pytests guard the doctrine (each bootstraps the generators if the
  generated file is missing, or fails with a clear message);
  `build_github_pages.sh`, `export_single_file.sh`, and the
  `tests/conftest.py` (or equivalent) handle regen explicitly;
  `tsconfig` updated; `.gitignore` cleaned of any obsolete
  per-file ignore lines now subsumed by `generated/`.
- **Done checks:**
  - Grep tool, `pattern="AUTO-GENERATED"`, `path="src/"` -> zero.
  - Grep tool, `pattern="(import|export)[^;]*from \"\\.\\./generated|(import|export)[^;]*from \"generated/|(import|export)[^;]*from \"\\./generated"`, `path="src/"`,
    exclude the four facade files -> zero (only the four facades
    may import `generated/`; both `import ... from` and
    `export ... from` shapes are caught).
  - `tests/test_authored_vs_generated.py` and
    `tests/test_facade_imports.py` pass (the latter parses both
    `import ... from "..."` and `export ... from "..."` lines, plus
    `import type` variants).
  - `git ls-files generated/` returns no output.
  - **Cleanroom build:** `bash dist_clean.sh && bash build_github_pages.sh`
    succeeds, then `npx tsc --noEmit -p src/tsconfig.json` is clean.
    This proves the build regenerates every generated TS family
    without relying on any committed copy.
  - **Determinism:**
    `source source_me.sh && python3 tools/build_protocol_data.py`,
    `source source_me.sh && python3 tools/build_scene_data.py`,
    then `git status --short generated/` returns no output and
    `git ls-files generated/` returns no output. Re-running the
    emitters does not produce new files git would track.
  - `bash check_codebase.sh` exits 0 (after a regen pass; see the
    build/check responsibility note in `Migration and compatibility
    policy`).
  - `bash export_single_file.sh` succeeds.
  - Playwright full walker green:
    `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
    exits 0.
- **Exit criteria:** All done checks + `docs/CODE_ARCHITECTURE.md`
  and `docs/FILE_STRUCTURE.md` describe `generated/` and the four
  facades; one or more `docs/CHANGELOG.md` entries cover M1 (per
  the grouped-entry rule in `Documentation close-out
  requirements`). Obvious follow-ons: regen
  `generated/scene_data.ts` from YAML on first emitter run after
  the move; update emitter `--output` defaults in the same patch
  as the file relocation; clean stale `.gitignore` lines.
- **Parallel-plan ready:** yes. M1.WS1 splits into three patches by
  data family (Patches A2-A4). A2 and A3 both touch
  `tools/build_protocol_data.py` and must serialize (or be
  bundled into one patch); A4 is independent and can run
  concurrently with the A2->A3 chain. M1.WS2 and M1.WS3 run in
  parallel after A2 lands. Maximum doers in parallel within M1:
  2 (the A2/A3 chain plus A4).

### M2 (Plan B): YAML as single source of layout truth

> **Plan B close criteria (atomized hard endpoint):**
> `bench_config.ts` and `hood_config.ts` are gone; scene YAML is
> the single source for static layout facts; validator proves
> cross-references; walker is green. Plan C may begin once these
> close.

- **Depends on:** M1 (facades and `generated/scene_data.ts` location
  must be settled before adapters consume an extended schema).
- **Entry criteria:** M1 done checks pass. Adapters consume scene
  data via `src/scene_configs.ts`. `bench_config.ts` and
  `hood_config.ts` are still in place (not yet migrated).
- **Deliverables:** Extended `SceneConfig` schema covers every
  field listed in the `SceneConfig schema extension` table inside
  `Workstream breakdown` -> M2.WS1;
  layout audit doc lists every duplicated fact and its decision;
  `game_state.ts` dependency audit completed and any layout-fact
  imports removed; six per-scene YAML files own all static
  declarative layout truth; `bench_config.ts` and `hood_config.ts`
  deleted (any surviving runtime helpers relocated to
  `src/scenes/shared/`); new YAML validator pytest in place with
  cross-reference checks.
- **Done checks:**
  - Grep tool, `pattern="bench_config|hood_config"`, `path="src/"`
    -> zero (or hits only inside the retired files themselves
    prior to deletion).
  - `tests/test_scene_yaml_validator.py` asserts the malformed
    corpus fails per file and the valid corpus loads cleanly,
    including cross-reference checks (item.svgAsset must resolve
    against `SVG_IDS`; item.id and zone references must
    cross-validate).
  - Each scene's mini-protocol passes after that scene's patch
    lands.
  - Full walker green
    (`node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`)
    after Patches B10 and B11.
- **Exit criteria:** All done checks +
  `docs/SCENE_YAML_FORMAT.md` documents the extended schema with
  one row per new field; `docs/SCENE_ARCHITECTURE.md` describes the
  facade and the retirement of `_config.ts`;
  `docs/SCENE_VOCABULARY.md` updated where it references
  `_config.ts`. Obvious follow-on: move
  `docs/archive/scene_yaml_layout_audit_<date>.md` from active to
  archive once its decisions are encoded.
- **Parallel-plan ready:** yes. M2.WS1, M2.WS2, M2.WS3 run
  concurrently. M2.WS4 splits into four per-scene lanes after
  M2.WS1 lands. M2.WS5 (bench/hood) runs after M2.WS2 and M2.WS3.
  M2.WS6 (validator) runs in parallel with M2.WS4-WS5 after M2.WS1.
  Maximum doers in parallel within M2: 6 (3 early + 4 small-scene
  lanes overlap briefly with the validator and bench/hood lanes).

### M3 (Plan C): Adapter seams + compatibility-token retirement

> **Plan C close criteria (atomized hard endpoint):**
> `buildLegacyToken` is gone; `legacy_tokens.ts` is gone; bench
> and microscope have clear responsibility seams; walker is green.
> Plan C closes the migration.

- **Depends on:** M2 (the compatibility-token ladder dispatches
  against item ids whose data surface settles in M2).
- **Entry criteria:** M2 done checks pass. `bench_config.ts` and
  `hood_config.ts` are gone. Walker green.
- **Deliverables:** Hood compatibility-token ladder folded into
  completionPath dispatch; bench split into render/dispatch/effects siblings;
  microscope manual hemocytometer extracted to a sibling module;
  `src/scenes/shared/legacy_tokens.ts` deleted; ROADMAP entry for
  responsibility-seam decomposition closed.
- **Done checks:**
  - Grep tool, `pattern="buildLegacyToken|legacy_tokens"`,
    `path="src/"` -> zero.
  - `git ls-files src/scenes/shared/legacy_tokens.ts` returns
    nothing.
  - Each adapter decomposition patch passes its scene's
    mini-protocol(s) plus
    `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`.
  - `npx tsc --noEmit -p src/tsconfig.json` clean.
- **Exit criteria:** All done checks + `docs/ROADMAP.md` updated
  (responsibility-seam item closed; `layout_engine.ts` split
  promoted as next deferred item);
  `docs/archive/scene_migration_completion_<date>.md` archives this
  plan; `docs/CHANGELOG.md` covers M3 (grouped entry permitted).
  **Closeout docs-grep gate:** Grep tool,
  `pattern="src/svg_globals\\.ts|src/content/scene_data\\.ts|src/content/protocol_data\\.ts|src/content/inventory_data\\.ts|flat monolithic scene modules"`,
  `path="docs/"`, **excluding `docs/archive/**` and `docs/CHANGELOG*.md`** -> zero.
  CHANGELOG entries are historical and immutable per [docs/REPO_STYLE.md](../REPO_STYLE.md), so they intentionally retain references to retired paths.
  Any hit outside the archive or changelog blocks plan archive until the doc is
  updated. Obvious follow-ons: rerun
  `bash check_codebase.sh` after each decomposition patch; update
  `docs/SCENE_ARCHITECTURE.md` if the responsibility-seam
  vocabulary changes.
- **Parallel-plan ready:** yes. M3.WS1, M3.WS2, M3.WS3 run
  concurrently. M3.WS4 (legacy_tokens delete) is a serial gate
  after WS1 + WS2 land. M3.WS5 (docs) runs in parallel from M3
  start; each prior workstream contributes its own CHANGELOG block.
  Maximum doers in parallel within M3: 4.

## Workstream breakdown

The workstream and work package detail blocks are kept together
below: each `### M<N>.WS<K>` heading defines a workstream, and its
nested `#### WP-...` sub-headings are the work packages owned by
that workstream. Read this section as the canonical-pair
"Workstream breakdown" + "Work packages" combined into one
navigable region; the per-section split adds noise without
adding information for a plan with 13 workstreams.

## Work packages

### M1.WS0 - Generated bootstrap command

- **Goal:** one command regenerates every YAML-emitted generated
  TS family (protocol, inventory, scene) plus the SVG manifest, so
  every downstream lane (boundary tests, build scripts, pytest
  conftest, dist_clean cleanroom checks) calls the same entry point
  and stays in sync.
- **Owner:** `coder`.
- **Work packages:** 1.

#### WP-1.0.1 - Add `tools/bootstrap_generated.sh`

- **Owner:** `coder`.
- **Touch points:** new
  `tools/bootstrap_generated.sh` (idempotent; calls
  `python3 tools/generate_svg_globals.py`,
  `python3 tools/build_protocol_data.py`,
  `python3 tools/build_scene_data.py` in deterministic order);
  `build_github_pages.sh` and `export_single_file.sh` invoke this
  script before tsc and the bundler;
  `tests/conftest.py` invokes this script when any
  `generated/*.ts` family is missing at session start.
- **Acceptance criteria:** Cleanroom proof:
  `bash dist_clean.sh && bash tools/bootstrap_generated.sh && npx tsc --noEmit -p src/tsconfig.json`
  succeeds. The script is idempotent: running it twice produces
  byte-identical `generated/` and zero `git status --short
  generated/` output (the tree is gitignored, so this is the
  determinism check across reruns). Build scripts and conftest no
  longer call individual generators directly.
- **Verification commands:**
  - `bash dist_clean.sh && bash tools/bootstrap_generated.sh`
  - `bash tools/bootstrap_generated.sh && bash tools/bootstrap_generated.sh`
    (idempotent rerun)
  - `npx tsc --noEmit -p src/tsconfig.json`
- **Dependencies:** none.

### M1.WS1 - Generated tree relocation + facade per data family

- **Goal:** for each generated TS family, move the file to
  `generated/`, add the authored facade, and redirect every importer
  in one patch. No patch leaves committed TypeScript imports
  pointing at the old `src/content/*.ts` paths.
- **Owner:** `coder` (one coder per data family; up to three
  parallel).
- **Work packages:** 3 (one per data family).

#### WP-1.1.1 - Move `protocol_data.ts` to `generated/` + add `src/protocol.ts` facade

- **Owner:** `coder`.
- **Touch points:** `git rm src/content/protocol_data.ts` (the
  old tracked file is removed; we do NOT `git mv` into
  `generated/` because that would track a file inside the
  gitignored tree); retarget `tools/build_protocol_data.py` to
  emit `generated/protocol_data.ts`; rerun
  `bash tools/bootstrap_generated.sh` so the file lives at the new
  location as a regenerated, untracked artifact; new
  `src/protocol.ts` facade re-exporting `PROTOCOL_ID`,
  `PROTOCOL_STEPS`, and any types; redirect 4 importers
  (`src/init.ts`, `src/game_state.ts`, `src/protocol_ui.ts`,
  `src/step_dispatch.ts`) to import from `src/protocol`. After the
  patch, `git ls-files generated/protocol_data.ts` returns no
  output.
- **Acceptance criteria:** No `src/**` file imports
  `generated/protocol_data` directly except `src/protocol.ts`. No
  `src/**` file imports `src/content/protocol_data` (the path no
  longer exists). Emitter writes to new path. Walker green.
- **Verification commands:**
  - `bash tools/bootstrap_generated.sh`
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `bash check_codebase.sh`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-1.0.1.

#### WP-1.1.2 - Move `inventory_data.ts` to `generated/` + add `src/inventory.ts` facade

- **Owner:** `coder`.
- **Touch points:** `git rm src/content/inventory_data.ts`;
  retarget `tools/build_protocol_data.py` (second output;
  shares the emitter with WP-1.1.1) to emit
  `generated/inventory_data.ts`; rerun
  `bash tools/bootstrap_generated.sh`; new `src/inventory.ts`
  facade re-exporting `REAGENTS` and related helpers; redirect 3
  scene importers (`src/scenes/bench/bench.ts`,
  `src/scenes/cell_culture_hood/cell_culture_hood.ts`,
  `src/scenes/cell_culture_hood/render.ts`) to `src/inventory`.
  After the patch, `git ls-files generated/inventory_data.ts`
  returns no output.
- **Acceptance criteria:** Only `src/inventory.ts` imports
  `generated/inventory_data`. Walker green.
- **Verification commands:** as WP-1.1.1.
- **Dependencies:** WP-1.0.1, WP-1.1.1. **Not parallel with
  WP-1.1.1**: both edit `tools/build_protocol_data.py`, so this
  WP serializes after WP-1.1.1 lands. (Bundling the two into a
  single patch is also acceptable if review prefers fewer touches
  to that emitter.)

#### WP-1.1.3 - Move `scene_data.ts` to `generated/` + add `src/scene_configs.ts` facade

- **Owner:** `coder`.
- **Touch points:** `git rm src/content/scene_data.ts`;
  retarget `tools/build_scene_data.py` to emit
  `generated/scene_data.ts`; rerun
  `bash tools/bootstrap_generated.sh`; new `src/scene_configs.ts`
  facade re-exporting `SCENE_CONFIGS` and `SceneConfig` type; no
  importers exist yet (added by M2 work packages). After the
  patch, `git ls-files generated/scene_data.ts` returns no
  output.
- **Acceptance criteria:** Only `src/scene_configs.ts` imports
  `generated/scene_data`. `npx tsc --noEmit` clean. Walker green.
- **Verification commands:** as WP-1.1.1.
- **Dependencies:** WP-1.0.1.

### M1.WS2 - Boundary pytests

- **Goal:** add pytests that prove the authored/generated boundary
  and the facade boundary stay enforced.
- **Owner:** `tester`.
- **Work packages:** 2.

#### WP-1.2.1 - `tests/test_authored_vs_generated.py`

- **Owner:** `tester`.
- **Touch points:** new pytest using `tests/git_file_utils.py` to
  walk every `*.ts` file under `src/` and assert no first-comment
  line begins with `AUTO-GENERATED` or `Generated file`. Walks
  `generated/` (only `*.ts` files; ignore other extensions and
  ignore an entirely missing `generated/` if the test does not
  bootstrap) and asserts every emitted `*.ts` file does begin with
  one of those markers. The test EITHER bootstraps the generators
  before walking `generated/`, OR skips the `generated/` half with
  a clear message when the tree is absent on a clean checkout.
  The `src/` half always runs.
- **Acceptance criteria:** Pytest passes on a clean checkout
  (after `dist_clean.sh`, before any build) AND after a build
  has populated `generated/`. Pytest passes after WP-1.1.1,
  WP-1.1.2, WP-1.1.3 land.
- **Verification commands:**
  `pytest tests/test_authored_vs_generated.py`.
- **Dependencies:** WP-1.1.1, WP-1.1.2, WP-1.1.3.

#### WP-1.2.2 - `tests/test_facade_imports.py`

- **Owner:** `tester`.
- **Touch points:** new pytest that walks every `*.ts` file under
  `src/` (including `src/scenes/**` and
  `src/scenes/capabilities/**`) and asserts no file imports from
  `generated/...` except the four facade files
  (`src/svg_assets.ts`, `src/scene_configs.ts`, `src/inventory.ts`,
  `src/protocol.ts`). The line-shape detector parses **both**
  `import ... from "..."` and `export ... from "..."` plus
  `import type` variants -- a grep gate on `from \"\\.\\./generated`
  alone misses re-export lines. Allowlist is hardcoded; new
  facades require test edit. The test bootstraps the generators
  if the relevant `generated/*.ts` file is missing, so it runs
  green on a clean checkout.
- **Acceptance criteria:** Pytest passes after WP-1.1.1-WP-1.1.3
  land.
- **Verification commands:** `pytest tests/test_facade_imports.py`.
- **Dependencies:** WP-1.1.1, WP-1.1.2, WP-1.1.3.

#### WP-1.2.3 - Facade smoke test

- **Owner:** `tester`.
- **Touch points:** new
  `tests/test_facade_smoke.py` (or equivalent node script under
  `tests/playwright/` if a TS import smoke is preferable; choose
  one and stick to it). Imports each of the four facades
  (`src/svg_assets.ts`, `src/scene_configs.ts`,
  `src/inventory.ts`, `src/protocol.ts`) and asserts the expected
  top-level keys exist: `SCENE_CONFIGS`, `REAGENTS`,
  `PROTOCOL_ID`, `PROTOCOL_STEPS`, plus the SVG facade's existing
  exported keys per `docs/SVG_PIPELINE.md`. Bootstraps the
  generators if any `generated/*.ts` family is missing. This
  catches facade drift faster than the full walker.
- **Acceptance criteria:** Smoke test passes on a clean checkout
  after `bash tools/bootstrap_generated.sh` and after WP-1.1.1-3
  land.
- **Verification commands:** `pytest tests/test_facade_smoke.py`
  (or `node tests/playwright/facade_smoke.mjs`, depending on
  implementation choice).
- **Dependencies:** WP-1.1.1, WP-1.1.2, WP-1.1.3.

### M1.WS3 - Docs and tooling cleanup

- **Goal:** record the doctrine in repo docs; clean stale
  references and gitignore lines.
- **Owner:** `planner` for docs; `coder` for tsconfig/.gitignore.
- **Work packages:** 1 (combined; small).

#### WP-1.3.1 - Architecture doc updates and stale-path sweep

- **Owner:** `planner` (docs); `coder` (tsconfig/.gitignore).
- **Touch points:** `docs/CODE_ARCHITECTURE.md`,
  `docs/FILE_STRUCTURE.md` add a Generated artifacts section
  cross-linking `docs/SVG_PIPELINE.md`; `tsconfig.json`,
  `src/tsconfig.json` add `generated/` to includes if not already
  added; `.gitignore` removes any obsolete
  `src/svg_globals.ts` and `src/content/*.ts` ignore lines.
- **Acceptance criteria:** Docs build clean per repo lint;
  `pytest tests/test_ascii_compliance.py` passes against changed
  docs; tsc clean.
- **Verification commands:**
  - `pytest tests/test_ascii_compliance.py`
  - `npx tsc --noEmit -p src/tsconfig.json`
- **Dependencies:** WP-1.1.1, WP-1.1.2, WP-1.1.3.

### SceneConfig schema extension (defined before WP-2.1.1)

The current emitter (`tools/build_scene_data.py`) types
`SceneConfig` with `sceneId`, `workspace`, `capabilities`,
`elementId?`, `items?`, `zones?`, and `wrongOrderMessage?`. WP-2.1.1
extends it to absorb every static declarative fact currently in
`bench_config.ts` and `hood_config.ts`. The schema below is the
contract; coders may not invent shapes patch by patch. Cross-reference
fields list which other namespace each value resolves against.

| Field | Owner | Required | Shape | Cross-references |
| --- | --- | --- | --- | --- |
| `sceneId` | YAML | yes | string | unique across `SCENE_CONFIGS` |
| `workspace` | YAML | yes | enum, current values from `docs/SCENE_VOCABULARY.md` (`equipment_bench`, `wet_lab_hood`, `modal_overlay`, plus whatever already appears in committed YAMLs); new values are added only if the layout audit (WP-2.2.1) proves they are needed | docs/SCENE_VOCABULARY.md |
| `capabilities` | YAML | yes | string[] | `CAPABILITY_REGISTRY` |
| `elementId` | YAML | optional | string | DOM id used by the renderer; defaults to `${sceneId}-scene` per current `docs/SCENE_YAML_FORMAT.md` (preserves existing behavior; do not require this field unless the audit proves the default is wrong) |
| `items` | YAML | yes (when scene has items) | `SceneItem[]`, where each entry is one of two variants below: `LayoutSceneItem` (full layout-engine item) or `DispatchOnlySceneItem` (minimal item, id and label only). The validator picks the variant per item by inspecting which fields are present; a scene may mix variants if its classification (see WP-2.4) calls for it. | per-item cross-refs below |
| `zones` | YAML | yes (when items reference zones) | `SceneZone[]` (see below) | items' `zone` field |
| `layoutRules` | YAML | optional | `SceneLayoutRules` (see below) | -- |
| `accentRules` | YAML | optional | `SceneAccentRules` (see below) | item.id |
| `wrongOrderMessage` | YAML | optional | `{ template: string; toastDurationMs: number }` | reserved field, validator-required only |
| `tabStops` | YAML | optional | `string[][]` (groups of item ids that share a tab stop) | item.id |

`LayoutSceneItem` shape (full layout-engine item; required for
items consumed by the layout engine in `src/scenes/<scene>/<scene>.ts`):

| Field | Required | Shape | Cross-reference |
| --- | --- | --- | --- |
| `id` | yes | string | unique within `items` |
| `label` | yes | string | -- |
| `zone` | yes | string | one of `zones[].id` |
| `depthTier` | yes | integer 1..5 | -- |
| `svgAsset` | yes | string | one of `SVG_IDS` keys (validator cross-checks against `generated/svg_manifest.ts`; this cross-reference is performed by the build tool / pytest, not by authored `src/**` runtime code) |
| `kind` | yes | enum (`bottle`, `flask`, `plate`, `pipette`, `instrument`, `tip_box`, `waste`, etc.) | docs/SCENE_VOCABULARY.md |
| `widthScale` | yes | number > 0 | -- |
| `anchorY` | yes | enum (`top`, `bottom`) | -- |
| `alignStop` | yes | enum (`left`, `center`, `right`) | -- |
| `accentKey` | optional | string | one of `accentRules` keys |
| `inventoryRef` | optional | string | one of `REAGENTS` keys (validator cross-checks against `generated/inventory_data.ts`; build-tool / pytest only) |

`DispatchOnlySceneItem` shape (minimal item; for scenes whose
items are dispatch surfaces only, not laid out by the layout
engine -- e.g., the current minimal microscope items per
`docs/SCENE_YAML_FORMAT.md`):

| Field | Required | Shape |
| --- | --- | --- |
| `id` | yes | string |
| `label` | yes | string |

The validator accepts either variant per item. A scene's
classification (see WP-2.4) determines which variant is
permitted; mixing is allowed inside one scene if and only if
that scene's classification explicitly calls for it. Future
work may unify the variants by promoting dispatch-only items
into the layout engine; that promotion is out of scope for
this plan.

`SceneZone` shape (migration-first; preserves the current
fields documented in `docs/SCENE_YAML_FORMAT.md`):

| Field | Required | Shape |
| --- | --- | --- |
| `id` | yes | string |
| `x0` | yes | number (left edge in scene coords) |
| `x1` | yes | number (right edge in scene coords) |
| `baseline` | yes | number (vertical baseline in scene coords) |
| `gap` | yes | number (item spacing) |
| `align` | yes | enum (`left`, `center`, `right`) |
| `tier` | optional | integer 1..5 (only if existing YAMLs already carry it) |
| `label` | optional | string |

A `rect` / `polygon` representation may be introduced **only if**
the layout audit (WP-2.2.1) proves the current
`x0`/`x1`/`baseline`/`gap`/`align` shape cannot represent a fact
that needs to migrate. Plan B is a source-of-truth migration, not
a layout-engine redesign; preserving the current zone fields is
the default.

`SceneLayoutRules` shape:

| Field | Required | Shape |
| --- | --- | --- |
| `clusterSpacingPx` | optional | integer |
| `tierBrightnessFactor` | optional | number map keyed by tier |
| `tierOpacity` | optional | number map keyed by tier |
| `defaultAlignStop` | optional | enum (`left`, `center`, `right`) |

`SceneAccentRules` shape:

| Field | Required | Shape |
| --- | --- | --- |
| `<key>` | -- | `{ stroke?: string; fill?: string; pattern?: string }` |

The schema doc table above is the contract for both
`tools/build_scene_data.py` (emitter) and
`tests/test_scene_yaml_validator.py` (validator). Either side
diverging from this table is a regression that the other side
catches.

### M2.WS1 - SceneConfig schema extension

- **Goal:** extend the emitter and the generated TS to cover the
  schema in the table above; update the format doc.
- **Owner:** `coder` (emitter); `planner` (doc).
- **Work packages:** 2.

#### WP-2.1.1 - Emitter and generated type extension

- **Owner:** `coder`.
- **Touch points:** `tools/build_scene_data.py`,
  `generated/scene_data.ts` (regenerated, never hand-edited).
- **Acceptance criteria:** Emitter accepts every field in the
  schema table; generated `SceneConfig` types each field; existing
  YAMLs round-trip without warnings; new YAMLs that omit optional
  fields succeed; new YAMLs that mistype a field fail loudly with
  the offending line and field name in the error.
- **Verification commands:**
  - `source source_me.sh && python3 tools/build_scene_data.py`
  - `npx tsc --noEmit -p src/tsconfig.json`
- **Dependencies:** M1 done.

#### WP-2.1.2 - `docs/SCENE_YAML_FORMAT.md` update

- **Owner:** `planner`.
- **Touch points:** doc.
- **Acceptance criteria:** Doc reproduces the schema table from
  this plan with a one-line description per field plus an example
  per nested shape.
- **Verification commands:** `pytest tests/test_ascii_compliance.py`.
- **Dependencies:** WP-2.1.1.

### M2.WS2 - Layout duplication audit

#### WP-2.2.1 - Audit doc

- **Owner:** `planner` (uses `Explore` agent for evidence).
- **Touch points:** new
  `docs/archive/scene_yaml_layout_audit_<date>.md`.
- **Acceptance criteria:** Doc enumerates every fact present in
  both `bench.yaml`/`cell_culture_hood.yaml` and
  `bench_config.ts`/`hood_config.ts`. Per fact, marks one of:
  `static-decl-YAML` (move to YAML), `runtime-helper-shared`
  (relocate to `src/scenes/shared/`), `runtime-helper-adapter`
  (keep inline in adapter), `delete-dead`. Each row links to the
  source line.
- **Verification commands:** `pytest tests/test_ascii_compliance.py`.
- **Dependencies:** none.

### M2.WS3 - `game_state.ts` dependency audit and extraction

- **Goal:** classify every `bench_config` / `hood_config` import in
  `src/game_state.ts` against the YAML/TS rule before bench/hood
  YAML migration. **`game_state.ts` must not depend directly on
  scene layout config.** This includes `SCENE_CONFIGS` itself when
  the consumed value is a layout fact (zone polygon, item label,
  accent rule). If `game_state.ts` needs a label or id, the value
  is either passed in from the caller (a scene adapter that
  already has facade access) or comes from a non-layout, runtime-
  safe helper under `src/scenes/shared/`. Core runtime state must
  not depend on scene configuration.
- **Owner:** `coder`.
- **Work packages:** 1.

#### WP-2.3.1 - Classify and extract

- **Owner:** `coder`.
- **Touch points:** `src/game_state.ts`; new non-layout runtime
  helpers under `src/scenes/shared/` if any survive; sites that
  consumed the old game_state exports.
- **Acceptance criteria:** No `src/game_state.ts` import from
  `bench_config` or `hood_config`. No `src/game_state.ts` import
  from `src/scene_configs.ts` (the facade carries layout truth;
  game_state must not depend on it). Every value game_state still
  needs is either passed in by the calling adapter or comes from a
  non-layout runtime helper under `src/scenes/shared/`. Walker
  green.
- **Verification commands:**
  - Grep tool, `pattern="bench_config|hood_config"`,
    `path="src/game_state.ts"` -> zero.
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-2.1.1, WP-2.2.1.

### M2.WS4 - Small-scene YAML migration (classify, then migrate)

- **Goal:** migrate incubator, plate, plate_reader, microscope
  scene data into YAML, but only after each scene is classified.
  Not every scene has layout facts to move; some are render-only
  modal scenes (e.g., plate_reader per
  `docs/SCENE_ARCHITECTURE.md`) and would suffer from forced
  layout fields.
- **Owner:** `coder` (one per scene, four parallel possible).
- **Work packages:** 5 (one classification doc + four per-scene
  migrations).

#### WP-2.4.0 - Classify the four small scenes

- **Owner:** `planner`.
- **Touch points:** new
  `docs/archive/scene_classification_<date>.md`. Classifies each
  of incubator, plate, plate_reader, microscope as exactly one of:
  `layout-engine` (full `LayoutSceneItem[]`),
  `modal-dispatch` (modal screens with click dispatch but no
  layout-engine items), `render-only-modal` (custom rendered
  surface with no scene-side dispatch), or `dispatch-only-item`
  (minimal `DispatchOnlySceneItem[]`). The classification decides
  which schema variant the scene's WP migrates and whether
  `LayoutSceneItem` fields are even valid for that scene.
- **Acceptance criteria:** Each of the four scenes has a row with
  classification, evidence (cited file:line in current adapter),
  and which schema variant applies.
- **Verification commands:** `pytest tests/test_ascii_compliance.py`.
- **Dependencies:** WP-2.1.1.

#### WP-2.4.1..4 - Migrate scene `<name>` per its classification

- **Owner:** `coder`.
- **Touch points:** `src/scenes/<scene>/<scene>.yaml`,
  `src/scenes/<scene>/<scene>.ts` (consume via
  `src/scene_configs.ts`). The scene's WP migrates only static
  facts allowed by that scene's classification: a `layout-engine`
  scene gets full `LayoutSceneItem[]`; a `dispatch-only-item`
  scene gets `DispatchOnlySceneItem[]` only; a
  `render-only-modal` scene migrates only `sceneId`,
  `workspace`, `capabilities`, and `elementId` -- no `items`, no
  `zones`. No artificial layout facts may be invented to satisfy
  schema fields the scene does not need.
- **Acceptance criteria:** Adapter consumes scene data via
  `SCENE_CONFIGS[sceneId]`. No `_config.ts` import from
  `src/scenes/<scene>/`. Scene's mini-protocol passes; full walker
  green.
- **Verification commands:**
  - `source source_me.sh && python3 tools/build_scene_data.py`
  - `npx tsc --noEmit -p src/tsconfig.json`
  - For each scene with a tutorial, that tutorial test under
    `tests/playwright/`
    (e.g., `node tests/playwright/test_plate_96.mjs` for plate;
    `node tests/playwright/test_layout_engine.mjs` for layout
    coverage).
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-2.1.1.

### M2.WS5 - Bench and hood YAML migration + `_config.ts` retirement

#### WP-2.5.1 - Bench

- **Owner:** `coder`.
- **Touch points:** `src/scenes/bench/bench.yaml`,
  `src/scenes/bench/bench.ts` (consume via facade),
  `src/bench_config.ts` (delete; relocate any runtime helper to
  `src/scenes/shared/`).
- **Acceptance criteria:** No `bench_config` import remains in
  `src/`. Bench mini-protocol and full walker green.
- **Verification commands:**
  - Grep tool, `pattern="bench_config"`, `path="src/"` -> zero.
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/test_bench_layout.mjs`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-2.1.1, WP-2.2.1, WP-2.3.1.

#### WP-2.5.2 - Hood

- **Owner:** `coder`.
- **Touch points:** `src/scenes/cell_culture_hood/cell_culture_hood.yaml`,
  `src/scenes/cell_culture_hood/{cell_culture_hood,render}.ts`,
  `src/hood_config.ts` (delete; relocate runtime helpers).
- **Acceptance criteria:** No `hood_config` import remains in
  `src/`. Full `cell_culture` walker green plus the four
  hood-touching tutorials (`tutorial_hood_transfer`,
  `tutorial_split`, `tutorial_drug_dilution`, `tutorial_pbs`)
  exercised by the YAML walkthrough harness.
- **Verification commands:**
  - Grep tool, `pattern="hood_config"`, `path="src/"` -> zero.
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/test_hood_layout.mjs`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-2.1.1, WP-2.2.1, WP-2.3.1.

### M2.WS6 - YAML validator pytest

#### WP-2.6.1 - Validator + corpora

- **Owner:** `tester`.
- **Touch points:** new `tests/test_scene_yaml_validator.py`; new
  fixture corpora under `tests/fixtures/scene_yaml_valid/` and
  `tests/fixtures/scene_yaml_malformed/`.
- **Acceptance criteria:** Validator enforces every field in the
  schema table; cross-references item.svgAsset against
  `generated/svg_manifest.ts` `SVG_IDS`; cross-references
  item.inventoryRef against `generated/inventory_data.ts`
  `REAGENTS`; cross-references item.zone against
  `zones[].id`; malformed corpus fails per file with a useful
  message; valid corpus loads cleanly.
- **Verification commands:**
  `pytest tests/test_scene_yaml_validator.py`.
- **Dependencies:** WP-2.1.1.

### M3.WS1 - Hood compatibility-token ladder retirement

#### WP-3.1.1 - Fold compatibility-token ladder into completionPath dispatch

- **Owner:** `coder`.
- **Touch points:** `src/scenes/cell_culture_hood/cell_culture_hood.ts`.
- **Acceptance criteria:** Compatibility-token fallback removed;
  all hood dispatch flows through `completionPath`. Zero
  `buildLegacyToken` references in this file.
- **Verification commands:**
  - Grep tool, `pattern="buildLegacyToken"`,
    `path="src/scenes/cell_culture_hood"` -> zero.
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** M2 done.

### M3.WS2 - Bench responsibility split

#### WP-3.2.1 - Split bench into seams

- **Owner:** `coder`.
- **Touch points:** `src/scenes/bench/bench.ts` ->
  `src/scenes/bench/{render,dispatch,effects}.ts` plus a thin
  `bench/bench.ts` adapter wrapper. Removes its `buildLegacyToken`
  call as part of the dispatch rewrite.
- **Acceptance criteria:** Each new file has one responsibility.
  Zero `buildLegacyToken` references in `src/scenes/bench/`. Bench
  mini-protocol and full walker green.
- **Verification commands:**
  - Grep tool, `pattern="buildLegacyToken"`, `path="src/scenes/bench"` -> zero.
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/test_bench_layout.mjs`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** M2 done.

### M3.WS3 - Microscope manual-hemocytometer extraction

#### WP-3.3.1 - Extract manual flow

- **Owner:** `coder`.
- **Touch points:** `src/scenes/microscope/microscope.ts`,
  new `src/scenes/microscope/manual_hemocytometer.ts`.
  Module-load registrations (`registeredEmitters.add`,
  `registerScene`) stay in the parent adapter (decision recorded;
  was open question in prior draft).
- **Acceptance criteria:** Manual hemocytometer flow lives in its
  own module; automated and manual dispatch no longer share a
  single function. Walker green for `tutorial_cell_counter`,
  `tutorial_hemocytometer_count`, full `cell_culture`.
- **Verification commands:**
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** M2 done.

### M3.WS4 - `legacy_tokens.ts` retirement

#### WP-3.4.1 - Delete file

- **Owner:** `coder`.
- **Touch points:** `git rm src/scenes/shared/legacy_tokens.ts`;
  remove any surviving imports.
- **Acceptance criteria:** Grep tool,
  `pattern="legacy_tokens|buildLegacyToken"`, `path="src/"` -> zero.
- **Verification commands:**
  - Grep checks above
  - `npx tsc --noEmit -p src/tsconfig.json`
  - `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- **Dependencies:** WP-3.1.1, WP-3.2.1.

### M3.WS5 - Docs closeout, archive, docs freshness grep

#### WP-3.5.1 - Closeout

- **Owner:** `planner`.
- **Touch points:** `docs/ROADMAP.md`,
  `docs/SCENE_ARCHITECTURE.md`, archive this plan to
  `docs/archive/scene_migration_completion_<date>.md`, finalize
  `docs/CHANGELOG.md` per grouped-entry rule.
- **Acceptance criteria:** Docs lint clean. Archive file exists.
  This plan file has a top-of-file "Archived" note. Docs freshness
  grep passes:
  - Grep tool,
    `pattern="src/svg_globals\\.ts|src/content/scene_data\\.ts|src/content/protocol_data\\.ts|src/content/inventory_data\\.ts|flat monolithic scene modules"`,
    `path="docs/"`, **excluding `docs/archive/**`** -> zero. The
    archive intentionally preserves historical terminology and
    must not block this gate.
- **Verification commands:**
  - `pytest tests/test_ascii_compliance.py`
  - the docs freshness grep above.
- **Dependencies:** WP-3.4.1.

## Acceptance criteria and gates

- **Verification gate (per patch):**
  - `npx tsc --noEmit -p src/tsconfig.json` clean
  - `bash check_codebase.sh` exits 0
  - `pytest tests/` green (fast lane)
  - The mini-protocol(s) listed in the work package pass.
- **Integration gate (per milestone):**
  `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs` exits 0
  (cell_culture 25/25 + 9 tutorials).
- **Regression gate (M2 specific):** every scene's mini-protocol
  passes after that scene's layout migration patch lands. Drift
  between YAML and the now-deleted `_config.ts` would surface as a
  mini-protocol failure here.
- **Release gate (plan completion):** Each grep below returns zero
  unless noted.
  - `pattern="AUTO-GENERATED|^// Generated file"`, `path="src/"`
  - `pattern="from \"\\.\\./generated|from \"generated/|from \"\\./generated"`,
    `path="src/"` -- zero except in the four facade files.
  - `pattern="src/content/(scene_data|protocol_data|inventory_data)"`,
    `path="src tests docs tools"` -- zero
  - `pattern="src/svg_globals\\.ts"`,
    `path="src tests docs tools"` -- zero
  - `pattern="bench_config|hood_config"`, `path="src/"` -- zero
  - `pattern="buildLegacyToken|legacy_tokens"`,
    `path="src/ tests/"` -- zero
  - `pattern="flat monolithic scene modules|src/svg_globals\\.ts|src/content/scene_data\\.ts|src/content/protocol_data\\.ts|src/content/inventory_data\\.ts"`,
    `path="docs/"`, exclude `docs/archive/**` -- zero. The
    archive intentionally preserves historical terminology
    (e.g., `docs/archive/scene_render_migration_2026-05-09.md`
    references the now-retired `src/scenes/{hood,bench,...}.ts`
    paths and the term "flat monolithic scene modules"). The
    closeout grep must not flag those archived references.
  - `git ls-files src/scenes/shared/legacy_tokens.ts`,
    `git ls-files src/bench_config.ts`,
    `git ls-files src/hood_config.ts` -- all return nothing
  - `git ls-files generated/` -- returns no output (the tree is
    gitignored; nothing should ever be tracked there)
  - **Cleanroom build gate:**
    `bash dist_clean.sh && bash build_github_pages.sh` succeeds
    (generators run from a wiped tree)
  - **Determinism gate:** rerunning every emitter against the
    populated tree produces zero diff:
    `source source_me.sh && python3 tools/build_protocol_data.py`
    then `python3 tools/build_scene_data.py`
    then `python3 tools/generate_svg_globals.py` then
    `git status --short generated/` -- expected: no tracked
    changes (and ideally no output, since `generated/` is
    gitignored)
  - `bash export_single_file.sh` succeeds
  - **Facade smoke test:** a small pytest (or node script) imports
    each facade and asserts the expected top-level keys exist
    (`SCENE_CONFIGS`, `REAGENTS`, `PROTOCOL_ID`, `PROTOCOL_STEPS`,
    plus the SVG facade's existing keys). This catches facade drift
    faster than the full walker.

## Test and verification strategy

| Tier | Where | Owner | What it proves |
| --- | --- | --- | --- |
| Unit | `tests/test_scene_yaml_validator.py` | `tester` | Malformed scene YAML fails per file; valid YAML loads; cross-refs resolve. |
| Unit | `tests/test_authored_vs_generated.py` | `tester` | No `AUTO-GENERATED` files under `src/`; `generated/` files all carry the marker. |
| Unit | `tests/test_facade_imports.py` | `tester` | No file under `src/**` imports from `generated/` except the four facades. |
| Unit | facade smoke pytest | `tester` | Each facade exports the expected top-level keys (catches facade drift). |
| Unit | existing `tests/test_pyflakes_code_lint.py`, `tests/test_ascii_compliance.py`, `tests/test_import_dot.py`, `tests/test_test_naming_conventions.py` | `tester` | Repo-wide invariants. |
| Integration | per-scene Playwright tests under `tests/playwright/` (`test_bench_layout.mjs`, `test_hood_layout.mjs`, `test_layout_engine.mjs`, etc.) | `coder` then `tester` | Per-scene render and layout proofs after each migrated scene. |
| Integration | `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs` | `coder` then `tester` | Full `cell_culture` 25/25 + 9 tutorials. |
| Smoke | `bash build_github_pages.sh`, `bash export_single_file.sh` | `coder` | Build pipeline still produces both bundles. |

Failure semantics: any verification-gate failure blocks patch
landing. Any integration-gate failure blocks milestone close. Any
release-gate failure blocks plan archive.

## Migration and compatibility policy

### Build, check, and test responsibility for `generated/`

`generated/` is gitignored. Every entry point that needs the
generated TS files must either regenerate them or bootstrap
explicitly. This plan extends the SVG pipeline doctrine to the
three new YAML-emitter families with the same rule per
[memory: asset pipeline hygiene]: build scripts write, check
scripts check, pytest bootstraps explicitly. Concretely:

- `build_github_pages.sh` regenerates every generated TS family
  before invoking `npx tsc` and the bundler. After WP-1.1.1..3, it
  calls `tools/build_protocol_data.py`,
  `tools/build_scene_data.py`, and the existing
  `tools/generate_svg_globals.py`.
- `export_single_file.sh` regenerates the same set before producing
  the portable HTML.
- `tests/conftest.py` (or a dedicated bootstrap fixture) runs the
  three emitters at session start when the generated TS family is
  missing, OR fails fast with a clear message naming the missing
  `generated/<file>.ts` and the emitter to run. Choice is made in
  WP-1.2.1 / WP-1.2.2 implementation. Do not silently skip checks
  because a generated file is absent.
- `check_codebase.sh` does NOT regenerate (matching the precedent
  set by `tools/build_scene_data.py`). It assumes `generated/` is
  populated. The plan's CHANGELOG entry for M1 documents this so
  contributors know to run a build first when running
  `check_codebase.sh` on a fresh checkout. The script may be
  updated in M1.WS3 to **fail clearly** (with a one-line
  instruction pointing at `bash tools/bootstrap_generated.sh`)
  when a `generated/*.ts` file is missing, but it MUST NOT
  regenerate -- writing belongs to build scripts and pytest
  bootstrap, never to the check runner.
- `dist_clean.sh` is the cleanroom validation step: wipes
  `generated/`, `dist/`, the bundled HTML/SVG, `test-results/`,
  and Python caches; the next build must regenerate everything.
  This is the cleanroom build gate referenced in `Acceptance
  criteria and gates`.

### Patch sequencing

Additive-first rollout with one sharp constraint:

- **No committed patch leaves active TypeScript imports using both
  the old and new generated-data path for the same data family.**
  Build-script paths or transitional emitter flags may briefly know
  both during a single patch's diff, but no committed TS file imports
  the retired path. This is the rule that matters for compilation
  and runtime; build-script byte-level constraints are a separate
  concern.
- M1 patches each move one data family AND introduce its facade AND
  redirect importers in the same diff. The retired `src/content/*.ts`
  path stops existing in the same patch.
- M2 extends the `SceneConfig` schema additively (Patch B2).
  Existing YAMLs continue to round-trip until the layout-fact
  migration patches add the new keys. `bench_config.ts` and
  `hood_config.ts` are deleted only inside the same patch that
  finishes redirecting every importer.
- M3 deletes `legacy_tokens.ts` only when the Grep tool confirms
  zero callers. If a caller is missed, M3.WS4 stops and routes back
  to whichever WS owns that caller.

Deletion criteria:

- `src/content/{scene_data,protocol_data,inventory_data}.ts`:
  remove the tracked file with `git rm` in the same patch that
  retargets the emitter to `generated/` and introduces the
  facade. The replacement under `generated/` is regenerated
  (untracked) by `tools/bootstrap_generated.sh`. Do not `git mv`
  into `generated/` -- that would leave the file tracked inside
  a gitignored tree, contradicting the close criteria
  (`git ls-files generated/` must return no output).
- `src/bench_config.ts`, `src/hood_config.ts`: delete in the patch
  that lands their layout migration; runtime helpers (if any)
  relocate to `src/scenes/shared/` in the same patch.
- `src/scenes/shared/legacy_tokens.ts`: delete in WP-3.4.1 after
  WP-3.1.1 and WP-3.2.1.

Rollback: each patch is a single `git revert` away from the prior
state. The walker is the rollback signal; if it goes red mid-patch,
revert and route the work back to the owning workstream.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Facade re-export gap surfaces as tsc errors after M1 | medium | `src/init.ts` etc. depend on internals not re-exported by `src/protocol.ts` | `coder` (M1.WS1) | Add named re-exports as needed; the facade is allowed to grow surface area; the rule is "imports through facade", not "minimal facade" |
| YAML schema extension breaks an existing YAML during WP-2.1.1 | high (walker red) | emitter test corpus passes but a real scene YAML fails | `coder` (M2.WS1) | Extend schema additively; keep old field names valid until M2.WS4-WS5; round-trip the existing six YAMLs as part of acceptance |
| Bench/hood layout audit reveals TS-encoded runtime logic, not pure data | high | audit (WP-2.2.1) finds a helper that computes layout from runtime state | `planner` (M2.WS2) | Apply the YAML/TS rule from `Architecture boundaries and ownership`: static declarative facts only move to YAML; runtime helpers stay in `src/scenes/shared/`; document each decision in the audit |
| `game_state.ts` carries scene-config dependencies that resist extraction | high | WP-2.3.1 finds a runtime invariant that requires layout data at game-state init | `coder` (M2.WS3) | If extraction would invert dependency direction (game_state depending on scenes), keep the runtime helper in `src/scenes/shared/` and import it from game_state; do not import `SCENE_CONFIGS` into game_state for runtime invariants |
| Hood ladder cleanup misses a code path the walker does not exercise | medium | regression in a non-walker scene | `coder` (M3.WS1) | Run all 4 hood tutorials + full `cell_culture`; if uncovered surface emerges, add a fixture before continuing |
| `legacy_tokens.ts` has a caller outside `src/` (e.g., test fixture) | medium | Grep at WP-3.4.1 returns a hit in `tests/` | `coder` (M3.WS4) | WP-3.4.1 stops, files a sub-WP for the discovered caller, then resumes |
| Scope creep into `layout_engine.ts` | medium | Reviewer asks "while we're here, split layout_engine" | `architect` | Decline; ROADMAP entry survives; this plan stays focused |
| Drift risk between plan and implementation | low-medium | mid-plan, milestone exit checks lag | `orchestrator` (if used) or `planner` | Per-milestone CHANGELOG entry covers the milestone's patches; M3.WS5 archives the plan with a final state diff |
| Module-load side-effect regression (lesson from archived plan) | high | A migration patch leaves a top-level statement in a retired module | `coder` | Per archived plan: enumerate `registeredEmitters.add(...)`, `registerScene(...)`, `window.*` bindings before deleting any module; M3.WS3 keeps registration in parent adapter explicitly |

## Rollout and release checklist

- [ ] **Preflight inventory captured** before M1 starts:
      Grep tool, `pattern="content/(scene_data|protocol_data|inventory_data)"`,
      `path="src tests tools"`; Grep tool,
      `pattern="bench_config|hood_config|buildLegacyToken|legacy_tokens"`,
      `path="src tests"`. The inventory output is pasted into the
      M1 kickoff CHANGELOG entry so subsequent WPs work from
      observed importer counts, not stale numbers.
- [ ] M1 done checks pass; CHANGELOG entry; walker green;
      cleanroom build (`bash dist_clean.sh && bash build_github_pages.sh`)
      succeeds.
- [ ] M2 done checks pass; CHANGELOG entry; walker green;
      per-scene mini-protocols green.
- [ ] M3 done checks pass; CHANGELOG entry; walker green.
- [ ] All release-gate Grep checks (`Acceptance criteria and
      gates`) return zero.
- [ ] Docs freshness grep returns zero (excluding `docs/archive/`).
- [ ] Cleanroom build:
      `bash dist_clean.sh && bash build_github_pages.sh` succeeds.
- [ ] Determinism: rerun all emitters; `git status --short generated/`
      empty.
- [ ] Facade smoke test passes.
- [ ] `bash build_github_pages.sh` produces a working `dist/`.
- [ ] `bash export_single_file.sh` produces a working portable
      HTML.
- [ ] This plan archived to
      `docs/archive/scene_migration_completion_<date>.md`.
- [ ] `docs/ROADMAP.md` updated: responsibility-seam item closed;
      `layout_engine.ts` split promoted as next deferred item.

## Documentation close-out requirements

- `docs/CHANGELOG.md`: each landed patch or tightly related patch
  group adds an entry covering the user-visible change, important
  implementation choice, failure, or verification evidence. Single
  patches with no learning value may be folded into a milestone
  rollup entry.
- `docs/CODE_ARCHITECTURE.md`: M1 updates the Generated artifacts
  section; M2 updates the Scene model section; M3 updates the
  Adapter section.
- `docs/FILE_STRUCTURE.md`: M1 adds `generated/` and the four
  facades; M2 records `bench_config.ts`/`hood_config.ts`
  retirement.
- `docs/SCENE_YAML_FORMAT.md`: M2.WS1 documents the extended schema
  (full table reproduced from this plan).
- `docs/SCENE_ARCHITECTURE.md`: M3.WS5 reflects post-migration
  state.
- `docs/SCENE_VOCABULARY.md`: M2 patches update any references to
  `_config.ts`.
- `docs/ROADMAP.md`: M3.WS5 closes responsibility-seam item;
  promotes layout-engine split.
- `docs/archive/scene_migration_completion_<date>.md`: M3.WS5
  archives this plan.
- `docs/SVG_PIPELINE.md`: not edited by this plan (the SVG fix-up
  shipped separately and is the doctrine source of truth). If a
  cross-link from `docs/CODE_ARCHITECTURE.md` or
  `docs/FILE_STRUCTURE.md` is needed, add it from the citing doc;
  do not modify the pipeline doc.

## Patch plan and reporting format

Patches are labeled by sub-plan (A / B / C) so each sub-plan can
close on its own hard endpoint. Plan A patches do not depend on
Plan B or C; Plan B patches assume Plan A is closed; Plan C
patches assume Plan B is closed.

| Patch | Plan | Component | Intent |
| --- | --- | --- | --- |
| A1 | A | tools, build scripts, conftest | Add `tools/bootstrap_generated.sh`; wire build scripts and pytest conftest |
| A2 | A | tools, generated, src/protocol.ts, init/game_state/protocol_ui/step_dispatch | `git rm src/content/protocol_data.ts`; retarget emitter; add `src/protocol.ts` facade; redirect 4 importers |
| A3 | A | tools, generated, src/inventory.ts, scene adapters | `git rm src/content/inventory_data.ts`; retarget emitter; add `src/inventory.ts` facade; redirect 3 scene importers. **Serializes after A2 (shared emitter file) or bundles with A2 into a single patch** |
| A4 | A | tools, generated, src/scene_configs.ts | `git rm src/content/scene_data.ts`; retarget emitter; add `src/scene_configs.ts` facade. Independent of A2/A3 (different emitter file) |
| A5 | A | tests | Add `test_authored_vs_generated.py`, `test_facade_imports.py`, and the facade smoke test |
| A6 | A | docs, tsconfig, .gitignore | Architecture / file-structure doc updates; tsconfig include; clean stale gitignore; cleanroom gate |
| B1 | B | docs/archive | Classify each scene (layout-engine / modal-dispatch / render-only-modal / dispatch-only-item) |
| B2 | B | tools, generated, docs | Extend `SceneConfig` schema (only fields classification justifies); emitter and format doc |
| B3 | B | tests | YAML validator pytest + corpora (cross-references for svgAsset, inventoryRef, zone) |
| B4 | B | docs/archive | Layout duplication audit |
| B5 | B | src/game_state.ts, src/scenes/shared | `game_state.ts` dependency audit and extraction |
| B6-B9 | B | scenes (incubator / plate / plate_reader / microscope) | Small-scene YAML migration (one per scene; per-scene classification governs schema variant) |
| B10 | B | scenes/bench, src/bench_config | Bench layout to YAML; retire `bench_config` |
| B11 | B | scenes/cell_culture_hood, src/hood_config | Hood layout to YAML; retire `hood_config` |
| C1 | C | scenes/cell_culture_hood | Fold hood compatibility-token ladder into completionPath dispatch |
| C2 | C | scenes/bench | Bench responsibility split (render / dispatch / effects) |
| C3 | C | scenes/microscope | Manual hemocytometer extraction |
| C4 | C | scenes/shared | Delete `legacy_tokens.ts` |
| C5 | C | docs | Close-out + archive + docs freshness grep |

Reporting format per
[docs/REPO_STYLE.md](../../nsh/cell-culture-game-claude/docs/REPO_STYLE.md):
each landed patch or tightly related patch group updates
`docs/CHANGELOG.md` with the user-visible change, important
implementation choice, failure, or verification evidence -- not a
separate entry per patch when several small patches share an
outcome. Each report answers the three-question contract from the
archived plan: what changed, which mini-protocol or full walker
proves it, which legacy path still exists.

Patch sizing: no patch touches more than two top-level components.
Patches B10 and B11 are the largest; they may split into a
data-move sub-patch and an importer-retire sub-patch if review
becomes the bottleneck. Doer cadence guidance: 1-2 reviewable
patches per coder per week, per
[references/CAPACITY_AND_SIZING.md](../skills/blueprint-plan-drafter/references/CAPACITY_AND_SIZING.md).
Each patch is bounded by its own sub-plan's close criteria and
needs no proof of work outside that sub-plan.

## Open questions and decisions needed

(None remaining; prior open questions resolved in `Architecture
boundaries and ownership` and `Workstream breakdown` with explicit
decisions: facade rule applies to all of `src/**`; **generated
files are NOT tracked in git** -- `generated/` is already in
`.gitignore`, and after WP-1.1.1..3 the three files leaving
`src/content/` are also untracked because they land inside
`generated/`; the build pipeline regenerates them on every run via
`build_github_pages.sh` and `export_single_file.sh`; one YAML per
scene unless the audit surfaces a clean seam; module-load
registrations stay in the parent adapter when a sibling module is
extracted.)
