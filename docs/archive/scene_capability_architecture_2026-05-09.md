# Archive: Capability-based scene architecture migration

- Archive date: 2026-05-09
- Status: PARTIAL COMPLETION (Patches 1-16 landed; Patches 17-19 deferred)
- Source plan: `~/.claude/plans/sharded-imagining-diffie.md`
- Follow-up: see [docs/ROADMAP.md](../ROADMAP.md), section "Future work: scene rendering migration"
- Current-state writeup: see [docs/CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md), section
  "Capability-based scene architecture (current state, 2026-05-09)"

## Preface

This plan was executed from 2026-05-08 through 2026-05-09. Patches 1-16 landed successfully and
delivered a working capability-based dispatch pipeline. The scene driver
(`src/scenes/scene_driver.ts`), six capabilities under `src/scenes/capabilities/`, five scene
adapters under `src/scenes/<scene>/`, the per-protocol `sceneRouter` opt-in, and the build-time
scene-YAML compiler are all in place and load-bearing in production. Ten protocols route every
click and step completion through the new pipeline: nine tutorial mini-protocols and the full
`cell_culture` protocol (25/25 steps verified).

Patch 17 attempted to `git rm` the five legacy scene files (`hood.ts`, `bench.ts`, `microscope.ts`,
`plate.ts`, `incubator.ts`). The walker regressed immediately. Root-cause analysis revealed that
the migration moved click dispatch to the new pipeline but never moved scene **rendering**. The
five legacy files still own `renderHoodScene`, `renderBenchScene`, `renderMicroscopeScene`,
`renderPlateScene`, and `renderIncubatorScene` (~2964 LOC of SVG and DOM construction), and they
are imported and called by `src/init.ts` on every render in both legacy and driver routing modes.
The deleted files were restored, the walker matrix returned to green, and Patches 17-19 (legacy
deletion + `sceneRouter` removal + this docs writeup) were rescoped.

What landed is real and durable: the dispatch architecture is settled, every capability has been
exercised against at least one protocol, the full 25-step `cell_culture` workflow runs end-to-end
through the driver, and the element-id mechanism (Patch 14) lets new scene configs map to any DOM
element id. What did not land is rendering migration; that is the prerequisite for finally
deleting the legacy files and removing the `sceneRouter` scaffolding. The ROADMAP entry
"Future work: scene rendering migration" captures the gap, the pre-conditions already in place,
and three open high-level approaches for a fresh planner to evaluate.

The per-patch changelog entries in `docs/CHANGELOG.md` (Patches 1-16) and
`docs/CHANGELOG-2026-05a.md` are the per-patch evidence trail and are the canonical record of
what each patch touched, what it proved through walkers, and what legacy paths it left in place.
This archive preserves the plan as authored so the deferred work can be picked up without
re-deriving intent.

---

## Original plan (preserved verbatim from `~/.claude/plans/sharded-imagining-diffie.md`)

The full text of the original plan was preserved at archive time at the path above. For the
authoritative content, consult that file. The summary headings below mirror the plan's structure
so this archive remains useful even if the source path is rotated:

- Context (root-cause framing for why a capability/adapter model replaces the per-scene monolith)
- Design philosophy (long-term over short-term, fix the design, YAML declares + TS runs,
  capabilities not exceptions, mini-protocol-first proof, coexistence router during migration,
  walker green at every patch boundary, atomic decomposition, mature the driver through real
  protocols)
- Scope and Non-goals
- Deferred to ROADMAP (5 items captured in Patch 1; see ROADMAP)
- Mini-protocol fixture map (9 tutorial mini-protocols mapped to scenes and capabilities)
- Current state (LOC inventory and walker baseline at plan start)
- Architecture (target file layout; YAML schema sketch; capability contract sketch;
  per-protocol opt-in flag; component ownership table; milestones-to-patches mapping table)
- Milestone plan (MS-ROADMAP, MS-FOUNDATION 4 patches, MS-MINI-BENCH, MS-MINI-HOOD,
  MS-MINI-PLATE 2 patches, MS-MINI-CELL-COUNTER 2 patches, MS-MINI-INCUBATOR 2 patches,
  MS-FULL-CELL-CULTURE, MS-MICROSCOPE-HEMOCYTOMETER 2 patches, MS-CLEANUP 3 patches)
- Workstream specs (per-patch acceptance and verification, WP-R1.1 through WP-C3.1)
- Acceptance criteria and gates (per-patch, per-milestone, per-patch regression, release)
- Test strategy (tier-by-tier when-to-run table)
- Migration and compatibility (coexistence router, additive first, no long-lived shims,
  legacy deletion criteria, no backward compatibility required, rollback)
- Risks and mitigations
- Rollout / release checklist
- Documentation close-out requirements
- Decisions (locked) -- 14 decisions including capability naming, mini-protocols as contract
  tests, migration order, per-protocol `sceneRouter` flag, no legacy file deleted until cleanup,
  scene YAML location, per-scene folder convention, adapter LOC budgets, window binding rename
- Open questions (4 items including build tooling location and pre-flight for hemocytometer
  routing)

### Execution outcome by milestone

| Milestone | Patch range | Outcome |
| --- | --- | --- |
| MS-ROADMAP | 1 | Landed. Five deferred items recorded in `docs/ROADMAP.md`. |
| MS-FOUNDATION | 2-5 | Landed. Scene-YAML compiler, registry, shared helpers, `itemWorkspace`. |
| MS-MINI-BENCH | 6 | Landed. `tutorial_bench_direct` green through driver. |
| MS-MINI-HOOD | 7 | Landed. Four hood mini-protocols green through driver. |
| MS-MINI-PLATE | 8-9 | Landed. `modalWorkspace` + `plateReaderWorkspace` + plate adapter; two plate mini-protocols green through driver. |
| MS-MINI-CELL-COUNTER | 10-11 | Landed. `instrumentWorkspace` + microscope automated path; `tutorial_cell_counter` green through driver. |
| MS-MINI-INCUBATOR | 12-13 | Landed. `incubatorWorkspace` + incubator adapter. |
| MS-FULL-CELL-CULTURE | 14 | Landed. `cell_culture` 25/25 green through driver. Critical gate met. |
| MS-MICROSCOPE-HEMOCYTOMETER | 15-16 | Landed. `gridCountingWorkspace` + microscope manual path; `tutorial_hemocytometer_count` green through driver. |
| MS-CLEANUP / Patch 17 | 17 | DEFERRED. `git rm` of legacy scene files reverted; rendering still load-bearing. |
| MS-CLEANUP / Patch 18 | 18 | DEFERRED. `sceneRouter` flag still required while legacy renderers live. |
| MS-CLEANUP / Patch 19 | revised as this archive | LANDED in revised form. Documentation updated to reflect honest current state; plan archived; rendering migration captured in ROADMAP. |

### Evidence trail

Per-patch CHANGELOG entries (one per patch) name the WP id and the protocol that proved the
patch. The full per-patch evidence is preserved in:

- `docs/CHANGELOG.md` -- Patches 14, 15, 16, and this Patch 18 closeout entry
- `docs/CHANGELOG-2026-05a.md` -- Patches 1 through 13 (rotated)

### What a fresh planner picks up

The next planning pass should produce an implementation plan for scene rendering migration.
Inputs:

- This archive (intent, decisions, locked patterns)
- `docs/CODE_ARCHITECTURE.md` "Capability-based scene architecture (current state, 2026-05-09)"
  (the layered model, what driver owns, what legacy still owns)
- `docs/ROADMAP.md` "Future work: scene rendering migration" (the gap, pre-conditions, three
  open approaches)
- The five legacy files themselves (`src/scenes/{bench,hood,microscope,plate,incubator}.ts`)
  -- the source material to migrate

Outputs the new plan should produce:

- A capability/adapter/standalone-module decision (the three open approaches in the ROADMAP)
- An incremental per-scene patch sequence with walker gates at every boundary, mirroring the
  pattern that succeeded for dispatch
- A clear gate for finally executing Patches 17-18 of this archived plan: legacy file deletion
  and `sceneRouter` removal
