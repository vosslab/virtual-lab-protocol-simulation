# Scene runtime activation -- ON HOLD

## Status: ON HOLD as of 2026-05-17

This plan is paused. A focused row-based base_scene layout plan (separate plan file at
`/Users/vosslab/.claude/plans/serene-stargazing-moore.md`) must land first. Resumption
of this plan is blocked on that work because the surfaced layout-truth bug (every base
scene authors its own coordinate grid via `zones[].bounds` rects) is a closed-vocabulary
violation that no amount of renderer or content patching here can fix.

### What landed during the active period

- **Pipeline self-containment**: `pipeline/` no longer imports from `validation/`.
  Duplicated 80 LOC of shared helpers into `pipeline/_pipeline_utils.py`. Pipeline is a
  separate build surface from validation.
- **Runtime spine, milestones M0 through M5 (partial)**:
  - M0 / M0.5: audits done; generated-data shape verified; scene inheritance confirmed
    resolved Python-side.
  - M1: contract realignment (`src/scene_runtime/contract.ts`, `types.ts`); loader
    (protocol / scene / object / material / world); render appliers for all 5
    `scene_operation` primitives; clock abstraction with prod + test clocks; click
    dispatch; legacy-import lint gate (`tests/test_scene_runtime_no_legacy_imports.py`).
  - M1.5: visible slice green; base-scene render path proven; smoke fixture clicks +
    updates + re-renders.
  - M2: layout engine mined under `src/scene_runtime/layout/`; well-plate adapter at
    three levels (static cells / group targets / per-cell visual state); liquid +
    highlight; per-cell colors without cell cloning.
  - M3: minimal chrome (scene viewport, prompt panel, feedback area, next button,
    adjust panel); adjust dispatch.
  - M4: per-mini-protocol HTML builder + `dist/<protocol>.html` shells; Pilot 1
    (`mtt_solubilization_readout`) walks 3/3 steps; `mtt_reagent_prep` walks 4/4.
  - M5 partial: generic walker engine; walker audit run across 26 protocols.
- **9 of 26 protocols green via walker audit**.
- **Validator parse-error path**: parse errors emit `tool="yaml_parser"`
  `code="yaml_parse_error"` instead of null; test error messages include offending
  file path.
- **Base-scene gallery generator**:
  `tests/playwright/test_base_scene_gallery.mjs` renders every base scene + emits an
  index.html for visual review. THIS is what exposed the layout-truth bug that
  triggered the hold.
- **pytest fast**: 823 pass in 2.27s. Slow `test_protocol_html_build.py` moved to
  `tests/e2e/`.
- **Orphan content cleanup**: deleted `content/base_scenes/minimal_test_scene.yaml`.

### What is paused

- **16 renderer-gap protocols** from the M6 walker audit. All are gated on the layout
  decision; mass content fixes cannot land until the new row+slot author surface is
  ratified, because each "fix" under the current `zones[].bounds` shape would author
  more coordinates.
- **1 orchestrator-gap protocol** (`mtt_plate_reaction`): next-button does not surface
  after 2-interaction step. Separate from layout, but parked alongside.
- **Phase 2 SVG renderer** (scaling per `SCALING_MODEL.md`) and **Phase 3** (label
  collision avoidance) -- both gated on the layout-truth decision because both
  depend on engine-owned geometry, not authored coordinates.
- **WS-GESTURE-EXPAND** (`select`, `type`, `drag`) -- gated by content actually
  exercising them; held while content work is paused.

### Why row+slot must land first

The current `zones[].bounds` author surface violates
`docs/PRIMARY_DESIGN.md` `## Vocabulary closure and anti-drift`: it lets every author
invent their own grid via raw coordinate rects. Nine base scenes carry nine slightly
different versions of the same intent. The layout engine cannot enforce workspace-wide
alignment because authors have already committed to specific x/y. Patching scene-by-scene
ratifies the escape hatch and guarantees the next ten scenes will each invent their own
grid as well.

The fix is to delete the coordinate surface from authoring, force ordered `rows` +
ordered `slots`, and move all geometry into the layout engine. See the focused plan at
`/Users/vosslab/.claude/plans/serene-stargazing-moore.md` for the locked schema, the
forbidden-field list, and the milestone breakdown.

### Resumption criteria

This plan resumes when:

1. The row+slot author surface is locked in `docs/specs/SCENE_YAML_FORMAT.md` /
   `SCENE_VOCABULARY.md` / `SCENE_INHERITANCE.md` / `LAYOUT_ENGINE.md`.
2. Every current base scene + every per-protocol scene override is rewritten to
   row+slot.
3. The base-scene gallery passes both the automated precheck suite and the manual
   review gate.
4. `pytest tests/ -q` exits 0 on the rewritten content under the hard validator gate.

When all four hold, mass content fixes for the 16 renderer-gap protocols can resume
under the M6 lane of this plan, no longer authoring coordinates because the surface
no longer admits them.

## Original plan

The verbatim original big plan is archived in its own file at
[scene_runtime_activation_plan_original.md](scene_runtime_activation_plan_original.md).

That file preserves the Context, Objectives, and Design philosophy verbatim. The
remaining ~2100 lines (subagent rules, dispatch templates, milestone plan M0-M6, work
packages, forbidden-pattern catalog, acceptance gates, risk register, resolved decisions
Q1-Q9, etc.) are recoverable from the pre-overwrite Claude Code session transcript at:

`/Users/vosslab/.claude/projects/-Users-vosslab-nsh-PODCAST-virtual-lab-protocol-simulation/b07bec17-24b0-4ead-b0b6-3ec12c771e29.jsonl`

Retrieve via `grep "Plan: YAML-to-browser scene runtime activation"` on that JSONL, or
via the system-reminder block in the same session that quoted the plan verbatim just
before the focused row+slot plan overwrote it at
`~/.claude/plans/serene-stargazing-moore.md`. To inline the full body, replace the
truncation block at the bottom of
[scene_runtime_activation_plan_original.md](scene_runtime_activation_plan_original.md).

The condensed retrievable summary above ("What landed", "What is paused",
"Resumption criteria") plus the held-binding operational reference sections below
capture the state needed to restart without re-reading the 2400-line body.

### Operational reference (held verbatim)

The following sections of the original plan stay binding when this plan resumes:

- `## Subagent operating rules` (runtime constitution, no-hack rules, required failure
  behavior, patch discipline).
- `## Reviewer rejection criteria`.
- `## Required subagent report format`.
- `## Tactical drift enforcement` (five-philosophy anchor, forbidden-pattern catalog,
  mandatory dispatch brief, subagent pre-flight, reviewer subagent checklist, manager
  enforcement, drift-watch, conflict resolution).
- `## Manager dispatch template`.
- `## Coder enablement` (pre-approved patterns library, worked exemplar per WP kind,
  stuck protocol escalation triggers, reading-list trim per WP, sandbox convention,
  test scaffolding library, done-early rule, decision log per WP, reviewer
  endorsements, lessons-learned cumulative log, manager checkpoint cadence, time
  budget per WP).
- `## Safe escape hatch`.
- `## Allowed implementation flexibility`.
- `## Default-value rule`.
- `## Error handling rule`.
- `## Definition of done for every WP`.
- `## Reviewer three-question test`.
- `## WP split trigger`.
- `## TODO discipline`.
- `## Architecture boundaries and ownership` (component map, bundling decision, test
  clock, content source layout, generated-data boundary, fixture discipline,
  visual-state no-approximation rule, top-level UI error boundary exception,
  three-way runtime-gap triage, mapping milestones->components->patches).
- `## Acceptance criteria and gates`.
- `## Test and verification strategy`.
- `## Migration and compatibility policy`.
- `## Risk register`.
- `## Rollout and release checklist`.
- `## Documentation close-out requirements`.
- `## Patch plan and reporting format`.
- `## Pipeline script naming review (deferred housekeeping)`.
- `## Resolved decisions` (Q1-Q9).
- `## Open questions and decisions needed` (none outstanding at hold).

The above sections continue to define manager + subagent + reviewer behavior for any
post-resumption WP. The full text was active and unchanged at the moment of hold; only
the layout-engine + scene-yaml workstreams are superseded by the focused row+slot plan.

### Milestone status at hold

- M0 -- DONE.
- M0.5 -- DONE.
- M1 -- DONE (contract, loader, render core, dispatch, no-legacy-imports lint).
- M1.5 -- DONE (base-scene render + visible slice).
- M2 -- DONE (layout audit, layout integrate, well-plate adapter A/B/C, liquid).
- M3 -- DONE (chrome minimal A/B, chrome adjust A/B).
- M4 -- DONE (HTML builder, Pilot 1 wired).
- M5 -- DONE in scaffold; walker engine + pilot walker green; audit run produced the
  9/26 result that surfaced the layout-truth bug.
- M6 -- PAUSED: 16 renderer-gap protocols, 1 orchestrator-gap, mass content fixes,
  gesture expansion. Resumption gated on row+slot landing.

### What changed since the plan was written

- Pipeline directory split from validation/. Plan referenced single-direction
  imports; now they are fully separated via `pipeline/_pipeline_utils.py`.
- `tests/test_protocol_html_build.py` moved to `tests/e2e/` per E2E_TESTS.md (was
  too slow as a pytest).
- Validator emits `tool`/`code` on YAML parse errors; test messages include file
  paths.
- `content/base_scenes/minimal_test_scene.yaml` deleted as orphaned content.
- Pilot 1 downgrade trigger never fired; `mtt_solubilization_readout` reached green
  walker. `mtt_reagent_prep` also green. Both pilots stand.

