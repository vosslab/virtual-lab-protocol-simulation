# Scene runtime status snapshot 2026-05-14

Status snapshot of the scene_runtime spine refactor at the point work was
paused. This is a snapshot, not a plan. The plan being executed is in
[scene_runtime_spine_plan.md](../archive/scene_runtime_spine_plan.md) and
[2026_May_13-Fresh_Refactor_Plan.md](2026_May_13-Fresh_Refactor_Plan.md).

## Summary

The scene_runtime spine refactor has completed milestones M0 through M5 and
has partial progress on M6. The generic walker engine, the runtime spine
(`contract.ts`, `types.ts`, loader), the layout/dispatch/highlight/liquid
modules, and a real `well_plate` adapter all exist under `src/scene_runtime/`.
The legacy `src/scenes/` tree is frozen. Five of six mini-protocols have had
their content text reworked and verified. Work is paused on one blocker: the
`plate_drug_treatment` backend architecture refactor, which is stalled on an
unresolved protocol-vocabulary design decision. M7 through M9 have not
started.

## Milestone status

- M0 doc conflict table: complete.
- M1 curriculum decomposition: complete.
- M2 protocol `entry:` blocks: complete.
- M3 runtime spine (`contract.ts`, `types.ts`, loader): complete.
- M4 generic walker engine: complete.
- M5 vertical proof: complete.
- M6 well_plate adapter: PARTIAL. Two tracks; see next section.
- M7: not started.
- M8 automated screenshot eval: not started (open task #32).
- M9: not started.

## M6 two-track detail

M6 is deliberately split into two tracks that are kept separate.

- Schema-coverage track: CLOSED. The private fixture
  `plate_drug_treatment_full` runs all 9 steps through the generic walker
  (about 565 screenshots). This proves the walker engine and the YAML schema
  support the full step set.
- Real-adapter track: PARTIAL. Steps 1-5 of `plate_drug_treatment` are proven
  through the real `src/scene_runtime/adapters/well_plate/` adapter via the
  visible UI (walker 5/5, screenshots captured). Steps 6-8 (the
  `plateTargets` steps) and step 9 (a modal step) are DEFERRED, pending the
  content and backend rework.

The schema-coverage track proves the engine and schema can express the
protocol. The real-adapter track proves a student can actually complete the
steps through the rendered UI. Only the real-adapter track satisfies
PRIMARY_CONTRACT item 4 (visible interaction must work).

## Content rework status

Tasks #34 and #35 cover reworking all `content/` mini-protocols.

- hood_flask_prep: reworked and verified.
- cell_counting_and_seeding: reworked and verified.
- mtt_assay_readout: reworked and verified.
- drug_dilution_setup: reworked and verified.
- cell_culture_full (sequence runner): reworked and verified.
- plate_drug_treatment: content text reworked, but the backend architecture
  refactor is PENDING and BLOCKED. See the next section.

Five of six are done. The sixth is blocked on the vocabulary decision.

## Primary blocker: plate_drug_treatment backend and protocol vocabulary

This is the item a reader most needs to understand. The
`plate_drug_treatment` backend refactor cannot proceed until a
protocol-vocabulary design decision is made.

### User position

An architect design for the backend was produced and REJECTED by the user.
The user's position: "plateTargets and tubeTargets are bad design, this is a
major regression on the vocab." Per
[../specs/PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), `interactions` is the
canonical vocabulary primitive. `plateTargets` and `tubeTargets` are
"optional metadata" bolted on parallel to `interactions`, and that parallel
structure is the regression the user wants eliminated.

### Reconciliation findings

These findings are authoritative for the current runtime state:

- `interactions[]` and `plateTargets[]` are LIVE across the walker, dispatch,
  highlight, and build paths.
- `tubeTargets[]` is BROKEN. `contract.ts` types it as `{tubeId}`, but the
  YAML uses `{source, diluent, destination, ...}`, and the walker produces
  zero clicks from it.
- `stateChange.heldLiquid`, `consumesVolumeMl`, per-interaction
  `completionEvent`, `requiredItems`, and `plateMap` are DEAD in the modern
  runtime.

### Open design tension

The unresolved question is how to express a transfer into many wells or tubes
without either of two bad options. Example: `add_carboplatin` discharges into
84 wells (7 rows x 12 cols).

- Option A: hand-author 84 individual interactions. Verbose and error-prone.
- Option B: reintroduce a parallel target-collection. This is the regression
  the user rejected.

The backend redesign is paused awaiting user clarification on how to resolve
this tension.

## New code and tests landed this session

All of the following is uncommitted and staged on `main`.

New runtime code under `src/scene_runtime/`:

```
src/scene_runtime/
  contract.ts
  types.ts
  layout/index.ts
  dispatch/index.ts
  highlight/index.ts
  liquid/index.ts
  adapters/well_plate/index.ts
  adapters/well_plate/render.ts
```

- Layout engine default constants changed: `DEFAULT_ITEM_WIDTH` and
  `DEFAULT_ITEM_HEIGHT` 10 -> 100; `MIN_GAP` 2 -> 10.
- Walker engine under `tests/playwright/walker/` plus the
  `tests/playwright/walker.mjs` CLI. The walker is generic: it dispatches only
  on `completionPath.kind`, has no `step.id` branches, and never writes state.
- Walker fixtures under `tests/playwright/fixtures/`: `smoke`,
  `interactions_array`, `plate_drug_treatment`, `plate_drug_treatment_full`,
  `plate_drug_treatment_real`. The walker reads steps from each fixture's
  `protocol.mjs`.
- `src/scenes/` is FROZEN: a legacy banner was added to every file;
  `tests/test_scenes_freeze_baseline.py` and
  `tests/data/scenes_freeze_baseline.json` enforce the freeze.
- `content/plate_drug_treatment/scene.yaml` added.
- `tools/build_test_fixture.sh` added: an esbuild bundle of the real adapter
  for `file://` CORS.

New tests:

- `test_dispatch_click.ts`
- `test_highlight.ts`
- `test_layout_engine.mjs`
- `test_liquid_state.mjs`
- `test_scene_runtime_loader.py`
- `test_scene_runtime_no_scenes_imports.py`
- `test_scenes_freeze_baseline.py`
- `test_scenes_legacy_banner.py`
- `test_walker_no_step_branches.py`

## Open tasks and recommended next steps

Open tasks at pause:

- #32 M8 automated screenshot eval: pending.
- #33 M6 real well_plate adapter visible-UI track: steps 1-5 done, steps 6-9
  deferred.
- #34 rework all `content/` mini-protocols: 5 done, blocked on #35.
- #35 rework `plate_drug_treatment` content: content text done, backend
  refactor blocked on the vocabulary decision.

Recommended next steps:

- Resolve the protocol-vocabulary design tension first. The
  `plate_drug_treatment` backend refactor, task #35, and the remaining
  `plate_drug_treatment` walker steps (6-9) all depend on it. This requires
  user clarification.
- Once the vocabulary decision lands, unblock #35, then complete the
  real-adapter track steps 6-9 under #33.
- M7 through M9, including #32 (M8 screenshot eval), follow after M6 closes.

## Verification state

- `source source_me.sh && pytest tests/ -q`: 520 passed, no regressions, for
  the reworked content (recorded in `docs/CHANGELOG.md` for 2026-05-14).
- Walker fixture results:
  - `plate_drug_treatment_full`: 9/9 steps through the generic walker (about
    565 screenshots). Schema-coverage track CLOSED.
  - `plate_drug_treatment_real`: steps 1-5 through the real `well_plate`
    adapter via visible UI (5/5, screenshots captured). Steps 6-9 deferred.
