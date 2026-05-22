# Plan: row+slot base scene prototype

## Context

Experiment 1 closed with `both_supported_pending_content` and Model B (row+slot)
tie-break-preferred. WP-IDENT-1 surfaced a real architectural question about
sdspage override files (the 7 `scene_content_incomplete` scenes inherit via
`extends:` from base scenes). User direction: defer the inheritance debate and
focus on **base scenes + working prototype first**.

The 9 current base scenes already carry all the real workspace composition.
Sdspage overrides are zero-placement at the override layer; their content
inherits from 3 of those 9 bases (`electrophoresis_bench`, `heat_block_bench`,
`staining_bench`). The fastest way to validate Experiment 1's Model B verdict
is to take ONE base scene, author it in row+slot, render it in the browser,
and compare against the current zone-bearing render. If the prototype works,
the path forward is base-scene migration; the sdspage inheritance question
follows naturally.

This plan supersedes the contract-first sdspage plan at
`docs/active_plans/sdspage_scene_content_completion.md` for the immediate term.
That plan stays parked; resumption follows the prototype outcome.

## Objectives

- Pick ONE base scene as the prototype target.
- Author a row+slot version of that base scene as a SIDE-BY-SIDE file (do not
  delete or modify the existing zone-bearing YAML).
- Extend the layout engine MINIMALLY to accept row+slot input alongside the
  existing zone input. No removal of the existing path; additive only.
- Render both versions in the browser via the existing base-scene gallery
  test (`tests/playwright/test_base_scene_gallery.mjs`) and compare.
- Decide based on the comparison: row+slot ready to roll out to remaining
  base scenes, or row+slot needs engine work before rollout.

## Design philosophy

This plan leans on **Fix the design, not the symptom** AND **Long-term over
short-term** from `docs/REPO_STYLE.md`. Prototype-first surfaces real engine
gaps before contract-design ratifies them on paper. The trade-off: small
additive engine change now (a parallel row+slot loader path) instead of
defining contracts in docs and then discovering the contracts are wrong.
Rejected alternative: continue with the contract-first sdspage plan,
authoring 5 contracts before any pixel renders.

## Scope

- One base scene rewritten in row+slot as a side-by-side file.
- Layout engine accepts row+slot input via a small additive code path.
- Base-scene gallery test renders both versions.
- Comparison doc captures the result.

## Non-goals

- Do not remove the existing zone-bearing code path. Additive only.
- Do not rewrite all 9 base scenes; only the prototype target.
- Do not touch the 7 sdspage overrides. Inheritance debate stays parked.
- Do not edit `docs/specs/*` (engine spec amendment, if needed, follows the
  prototype outcome).
- Do not modify validators; new file lives alongside the existing one.
- Do not commit.

## Prototype target selection

Pick the simplest base scene with at least 3 placements + at least 1
non-origin placement. Candidates:

- `hood_basic.yaml` - 4 placements, simple workspace, matches Pilot 1
  context. RECOMMENDED.
- `bench_basic.yaml` - 2 placements, too thin for a layout test.
- `cell_counter_basic.yaml`, `electrophoresis_bench.yaml`, `heat_block_bench.yaml`,
  `imaging_bench.yaml`, `microscope_basic.yaml`, `sample_prep_bench.yaml`,
  `staining_bench.yaml` - more complex; defer to follow-up scenes.

Default: `hood_basic`. Manager confirms before WP-PROTO-1 dispatches.

## Milestone plan

### Milestone 1: author the row+slot scene file

- Workstreams: WS-AUTHOR (1 patch).
- Touch points: new file
  `content/base_scenes/hood_basic_row_slot.yaml` (or equivalent for picked
  target).
- Exit:
  - File authored in Model B shape per Experiment 1 spec (`scene_name`,
    `workspace`, `capabilities`, `background`, `rows`).
  - Every placement_name from the existing `hood_basic.yaml` preserved.
  - Zero authored geometry; engine owns row band positions.
  - YAML gates green: `validation/validate.py`,
    `validation/manual/protocol_manual.py --all` (or noted as not-yet-aware
    of the new shape - recorded as a gap, not blocking).
- Parallel-plan ready: no.

### Milestone 2: minimal engine support for row+slot input

- Workstreams: WS-LOADER (1 patch), WS-LAYOUT (1 patch).
- Entry: M1 closed.
- Exit:
  - `pipeline/build_scene_data.py` (or equivalent) accepts row+slot YAML
    and emits a runtime data shape parallel to the existing zone shape.
    Additive; legacy path unchanged.
  - `src/scene_runtime/layout/layout_engine.ts` accepts the new shape and
    computes positions via a workspace-policy default for `hood`. Additive;
    legacy path unchanged.
  - `npx tsc --noEmit -p src/tsconfig.json` exits 0.
  - `pytest tests/ -q` exits 0.
- Parallel-plan ready: yes; max parallel doers: 2.

### Milestone 3: render + compare

- Workstreams: WS-GALLERY (1 patch), WS-COMPARE (1 doc).
- Entry: M2 closed.
- Exit:
  - Base-scene gallery test renders both versions into
    `test-results/_base_scenes_gallery/` (filenames disambiguate, e.g.
    `hood_basic.png` vs `hood_basic_row_slot.png`).
  - Comparison doc at
    `docs/active_plans/row_slot_prototype_comparison.md` records the
    side-by-side: bounding boxes, occupancy, label collisions, intentional
    overlap diagnostics.
  - Decision verdict: `prototype_ready_rollout` | `prototype_blocked_engine`
    | `prototype_blocked_content`.
- Parallel-plan ready: no.

## Work packages

### WP-PROTO-1: author `hood_basic_row_slot.yaml`

- Touch points: new file under `content/base_scenes/`; `docs/CHANGELOG.md`.
- Acceptance:
  - File uses Model B shape only (`scene_name`, `workspace`, `capabilities`,
    `background`, `rows`); zero authored geometry.
  - Every placement_name from `hood_basic.yaml` preserved verbatim.
  - Row names semantic; no coordinate-flavored names.

### WP-PROTO-2: builder accepts row+slot input

- Touch points: `pipeline/build_scene_data.py`; possibly
  `pipeline/_pipeline_utils.py`.
- Acceptance:
  - Builder detects `rows:` top-level key and emits row+slot runtime data;
    `zones:` continues to emit zone runtime data unchanged.
  - `pytest tests/ -q` exits 0.

### WP-PROTO-3: layout engine accepts row+slot input

- Touch points: `src/scene_runtime/layout/layout_engine.ts`,
  `src/scene_runtime/layout/types.ts`.
- Acceptance:
  - Engine accepts row+slot input; computes positions via a workspace-policy
    default for `hood` (top-row vs middle-row vs front-row band heights).
  - Legacy zone path untouched.
  - `npx tsc --noEmit -p src/tsconfig.json` exits 0.

### WP-PROTO-4: gallery render + comparison

- Touch points: `tests/playwright/test_base_scene_gallery.mjs` (extend to
  pick up the new file); `docs/active_plans/row_slot_prototype_comparison.md`
  (new).
- Acceptance:
  - Gallery generates a screenshot for the row+slot file.
  - Comparison doc reports bounding boxes + occupancy + label collisions for
    both files.
  - Verdict line: one of
    `prototype_ready_rollout` / `prototype_blocked_engine` /
    `prototype_blocked_content`.

## Acceptance criteria and gates

- Hard: `pytest tests/ -q` exits 0 after every WP that touches `pipeline/`,
  `src/`, or `tests/`.
- Hard: `npx tsc --noEmit -p src/tsconfig.json` exits 0 after every WP that
  touches `src/`.
- Hard: legacy zone path unchanged across every WP (additive only).
- Hard: existing 9 base scenes still render in the gallery (no regression).
- Hard: row+slot file contains zero entries from Experiment 1's forbidden
  geometry list.
- Hard: `docs/CHANGELOG.md` entry per WP.

## Decision gate at plan close

- `prototype_ready_rollout` -> open the row+slot base-scene migration plan
  for the remaining 8 base scenes.
- `prototype_blocked_engine` -> open a focused engine-fix plan addressing the
  specific gap. Do NOT migrate more base scenes until the engine is ready.
- `prototype_blocked_content` -> open a content/contract plan for the
  blocker. Most likely outcome surfaces a real workspace-policy decision
  (slot spacing, row band weights, label side).

## Risk register

| Risk | Impact | Trigger | Mitigation |
| --- | --- | --- | --- |
| Engine refactor creeps into the prototype | high | WP-PROTO-3 starts rewriting layout_engine.ts | Additive-only rule; reviewer rejects any deletion or modification of existing zone code paths |
| Comparison is cosmetic, not structural | medium | gallery shows minor pixel differences; verdict unclear | Compare bounding boxes + occupancy + label collisions, not pixel hashes; record numeric diffs |
| Hood policy chosen arbitrarily | medium | workspace policy for hood embedded in engine without doc | Record the policy in the WP-PROTO-3 acceptance + comparison doc; do not promote to spec until rollout plan ratifies |
| Sdspage plan resumed prematurely | medium | someone re-opens sdspage contracts before prototype verdict | Sdspage plan stays parked; resumption follows prototype verdict |
| YAML gates fail because validator does not know row+slot | medium | validation/validate.py rejects the new shape | If validator rejects, surface as a gap; do NOT silently relax the validator; record in WP-PROTO-1 handoff |

## Open questions and decisions needed

These need user answers BEFORE WP-PROTO-1 dispatches:

1. Confirm prototype target: `hood_basic` (recommended) or alternate?
2. If the YAML validator rejects the new shape during WP-PROTO-1, accept
   the gap as out-of-scope (record + continue) or block and add a validator
   WP first?
3. Workspace policy for `hood` is engine-side; should the picked values
   (row band heights, slot spacing) be documented in
   `docs/active_plans/row_slot_prototype_comparison.md` or in a new spec
   doc? Recommended: comparison doc only until rollout plan.
