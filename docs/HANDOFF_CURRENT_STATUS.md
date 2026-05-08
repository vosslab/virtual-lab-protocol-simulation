# Handoff: current repo status

> **This document is a status snapshot, not a source of truth for final
> design.** Verify against the working tree, tests, and docs before acting.
> Do not commit, refactor, or resume coding from this document alone. Run
> the verification checklist at the bottom of "Do not continue from memory"
> first.

The repo is paused mid-migration. This handoff captures what is true at
the pause point, what is hypothesized but unconfirmed, and what the next
manager should investigate before resuming code changes.

## Encoding note

This file uses ASCII only. If a future edit introduces mojibake (for
example bytes that render as `a` or `a`), replace with the ASCII
equivalents `--`, `->`, or plain hyphens before committing.

## Stale artifact warning

Several failures during this session were caused by stale generated
artifacts, not by source YAML. Before interpreting any browser-test
failure, rebuild:

```bash
bash build_github_pages.sh
```

Do not diagnose `dist/main.js`, `src/content/protocol_data.ts`, or
`src/content/inventory_data.ts` behavior unless the source YAML has just
been regenerated and the bundle rebuilt. `cell_culture_game.html` is a
generated/untracked artifact and is not a source of truth.

## Do not continue from memory

Before making any code change, re-establish ground truth. Run, in order:

```bash
git status --short
git diff --stat
bash build_github_pages.sh
node tests/playwright/test_interaction_resolver.mjs
node tests/playwright/test_interaction_index.mjs
node tests/playwright/protocol_graph_smoke.mjs
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
```

If any output diverges from the "Known current failures" table below, the
state has changed since pause. Trust the rerun, not this document.

## Confirmed facts

Items in this section were directly observed during this session.

### Repo identity

- Branch: `main`. Not protected via worktree.
- Version: `VERSION` and `package.json` declare `26.02`.
- Active protocol: `cell_culture` at 25 steps post-revert. Two tutorial
  protocols also ship: `tutorial_split` (3 steps) and `tutorial_pbs`
  (4 steps).
- Working tree: 83 modified or added files at pause time. No file is known
  to be corrupt; the volume reflects in-flight migration work.

### Plan and milestones

- Active plan: `.claude/plans/keen-swimming-fairy.md`.
- M1 (YAML contract modernization, Patches 0-3) and M2 (runtime
  enforcement, Patches 4-7) landed code-wise during this session.
- M3 (UI regression and cleanup, Patches 8-13) introduced the K2
  `completionPath` schema redesign and is mid-stream.

### K2 schema redesign

- `step.completionPath` is a discriminated union with three kinds:
  `interactionSequence`, `directTool`, `modal`. Modal advance buttons are
  identified by a kebab-case `data-walker-advance` attribute.
- Subpatches that landed: SP-K1 (vocab/docs), SP-K1b (locked decisions),
  SP-K2a (additive types/parser), SP-K2b (YAML migration), SP-K2c
  (Validator Rule 8), SP-K2d (walker dispatch by `completionPath.kind`).
- SP-K2bd2 attempted YAML hybrid splits (count_cells_setup/_confirm,
  six drug-step pairs) plus a `setQuadrantCountsForWalker` window
  back-door. It was reverted in full (task #76).

### SP-K2bd2-resolver-compat (task #81)

- Found a K2 integration gap during diagnostic work: resolver read
  obsolete top-level `step.interactionSequence`; generated data uses
  `step.completionPath.interactions`.
- Fix shape: added `getInteractionSequence(step)` helper. Returns
  `step.completionPath.interactions` only when
  `step.completionPath.kind === "interactionSequence"`. Returns `null`
  otherwise.
- Both `resolveInteraction` and `resolveInteractionByIndex` use the helper
  and return `{kind: "no-op"}` when null.
- A first revision attempt synthesized a fake one-element interaction
  array for `directTool` steps. That was rejected and removed in the
  revision pass. directTool dispatch happens via scene click handlers and
  `data-walker-advance` paths, not through the resolver.
- Two test fixtures were updated: `test_interaction_resolver.mjs` Test 5
  (spray_hood) replaced with one verifying directTool returns `no-op`;
  `test_interaction_index.mjs` Test 5 deleted (count moved 6/6 to 5/5).

### Walker failure signature

Last observed failing command at pause:

```bash
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
```

Observed behavior: walker cleanly walks through `spray_hood`,
`aspirate_old_media`, `pbs_wash`, then fails during `add_trypsin`.

When resuming, capture before deciding anything:

- Full terminal output of the walker run.
- `test-results/walker/playthrough_report.json` if present.
- Any per-step screenshot the walker produces.
- Browser console errors from the run.

## Known current failures

Last known status was captured during this session. None of these have
been re-verified at the moment of writing. **Treat any "green" entry as
provisional until you rerun the command yourself.**

| Gate | Command | Last status | Caveat |
|---|---|---|---|
| Build + bundle | `bash build_github_pages.sh` | green | rerun to refresh dist/ |
| Pytest | `pytest tests/` | 264 passed | rerun |
| TypeScript | `npx tsc --noEmit -p src/tsconfig.json` | clean | rerun |
| Game UI smoke | `node tests/playwright/e2e/test_game_ui.mjs` | 9/9 | currently lives under e2e/; per layout policy it may belong in `tests/playwright/`. Confirm path before treating as canonical. |
| Resolver unit | `node tests/playwright/test_interaction_resolver.mjs` | 9/9 | rerun |
| Index unit | `node tests/playwright/test_interaction_index.mjs` | 5/5 | rerun |
| Coverage policy | `node tests/playwright/test_completion_event_coverage.mjs` | 7/7 | rerun |
| Graph reachability | `node tests/playwright/protocol_graph_smoke.mjs` | 25/25 | rerun |
| YAML walker | `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs` | **3/25, fails at add_trypsin** | open |
| Smoke wrapper | `python3 tools/run_smoke.py` | green | rerun |

Notes:

- The Game UI smoke path was observed at `tests/playwright/e2e/test_game_ui.mjs`
  via `ls`. Per the four-folder layout in `tests/TESTS_README.md`, smoke
  tests should sit at `tests/playwright/` and only full walkthroughs at
  `tests/playwright/e2e/`. Whether `test_game_ui.mjs` is a smoke test or a
  walkthrough should be confirmed; if smoke, it should be moved.
- Graph smoke is at `tests/playwright/protocol_graph_smoke.mjs` (correct
  per layout).
- Walker is at `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
  (correct per layout, full walkthrough).

## Open hypotheses

Items in this section are not confirmed. They are listed as candidate
explanations for the walker regression so the next investigation has
something concrete to test.

The puzzle: `pbs_wash` (step 3) and `add_trypsin` (step 4) have identical
shape - same scene, same `kind: "interactionSequence"`, same two-
interaction click plan, same tool, same destination - yet `pbs_wash`
passes and `add_trypsin` fails immediately after. Pre-resolver-compat the
walker reached step 8; post-resolver-compat it reaches step 3.

Candidate causes (any could be right; none have been confirmed):

1. **Per-event branch bug.** `src/scenes/hood.ts:600-800` contains a
   completionEvent-switch. The `pbs_wash` branch (around line 654) and
   the `pipette_trypsin` branch (around line 669) may diverge in a way
   that breaks add_trypsin specifically.
2. **State reset issue.** `completeStep` (`src/game_state.ts:251`) resets
   `interactionIndex` to 0 on step entry. The defensive backstop at
   `game_state.ts:236-240` refuses to complete a step if
   `interactionIndex < sequence.length`. One of these may misfire on the
   pbs_wash to add_trypsin transition.
3. **selectedTool issue.** Hood may clear or fail to clear `selectedTool`
   between steps; the walker may be re-clicking the tool when it should
   skip, or vice versa.
4. **heldLiquid issue.** Same as above for the held-liquid state.
5. **Dispatch ownership problem.** Hood has resolver-first dispatch with
   early returns at lines 556/599/612/781/785, plus legacy item-id
   branches at lines 955-1277 that are now dead-coded for
   interactionSequence steps. The resolver-driven path may be incomplete
   for some shape that pbs_wash happens to satisfy by coincidence.
6. **Walker assumption bug.** The walker may assume something about the
   click plan that holds for pbs_wash but not for add_trypsin (for
   example, assumptions about post-step state cleanup, tool re-selection,
   or scene transitions).

The investigation should determine which of these (or which combination)
is the actual cause. Do not assume scope before evidence is collected.

## Recommended next investigation

Single fresh agent. Read-and-instrument only. No production code edits.
No broad refactor. Goal: produce evidence, not a fix.

### Brief

Determine why `pbs_wash` passes but `add_trypsin` fails after the resolver
was rewired to read `step.completionPath.interactions`.

Temporarily instrument only:

- `src/scenes/hood.ts`
- if needed, `src/interaction_resolver.ts`
- if needed, `src/game_state.ts`

Trace exactly these three steps:

- `pbs_wash`
- `add_trypsin`
- `neutralize_trypsin`

For every click within those steps, log:

- step id
- clicked item
- selectedTool before / after
- heldLiquid before / after
- interactionIndex before / after
- resolver result (kind, indexDelta, wrongOrder, completionEvent)
- completionEvent at the per-event switch (if reached)
- whether `triggerStep()` fired
- activeStepId before / after

Run:

```bash
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
```

Capture the trace output for steps 3-5. Remove all trace logging before
closing the patch. The output of this investigation is a written analysis
plus a recommendation; it is not a code fix yet.

The trace may reveal any of the six candidate causes above. Do not commit
to a fix shape until the trace points at one.

## Minimum acceptance before commit

Do not commit until all of these are true after a clean rebuild:

```bash
bash build_github_pages.sh
pytest tests/
npx tsc --noEmit -p src/tsconfig.json
node tests/playwright/test_interaction_resolver.mjs
node tests/playwright/test_interaction_index.mjs
node tests/playwright/test_completion_event_coverage.mjs
node tests/playwright/protocol_graph_smoke.mjs
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --wrong-order
python3 tools/analyze_protocol_audit.py --protocol cell_culture
```

The Game UI smoke (`test_game_ui.mjs`) should also be in this list once
its canonical path is confirmed (see "Known current failures" caveat).

The walker must not use any of:

- `step.id` behavior branches in dispatch code.
- `window.set*ForWalker` back-doors.
- direct `window.gameState` mutation.
- direct `completeStep()` or `triggerStep()` calls (except in the
  graph-smoke layer, which is allowed).
- fake source or destination items.

## Untracked and scratch file policy

Before any commit:

- Remove temporary trace files added during investigation.
- Remove `_temp*`, `_debug*`, `_inspect*`, and other underscore-prefixed
  scratch `.mjs` or `.py` files.
- Keep `devel/commit_changelog.py`. The maintainer uses it manually.
- Do not remove orphan SVG assets without explicit human approval.
- Do not hand-edit generated files (`src/content/protocol_data.ts`,
  `src/content/inventory_data.ts`, `dist/main.js`,
  `cell_culture_game.html`). Regenerate from YAML.

## Pending classification audit table

SP-K2bd2-alpha (task #77) is paused. When it resumes it should produce
this table from direct UI observation, not from memory. The rows below
list likely-suspect steps and are not authoritative.

| Step id | Current kind | Actual UI behavior | Hybrid? | Proposed action | Notes |
|---|---|---|---|---|---|
| count_cells | modal | microscope overlay + quadrant UI | TBD | TBD | Do not use `setQuadrantCountsForWalker`. |
| plate_read | modal | plate-reader UI button | TBD | TBD | Confirm whether single modal step suffices. |
| add_carboplatin | modal | drug modal flow | TBD | TBD | No step-id walker branch. |
| add_metformin | modal | drug modal flow | TBD | TBD | No step-id walker branch. |
| add_mtt | modal | likely pipette + modal | TBD | TBD | Verify actual UI path. |
| add_dmso | modal or directTool | DMSO addition flow | TBD | TBD | Verify actual UI path. |
| media_adjust | modal or directTool | media adjustment flow | TBD | TBD | Verify actual UI path. |

Alpha must fill TBDs based on observed UI behavior. The audit is
read-only; no YAML or code edits.

## Desired dispatch ownership model

This is the target after cleanup, not the current state. The current
state has the resolver path and legacy item-id branches coexisting,
which is one of the open hypotheses for the walker regression.

1. Walker clicks DOM only.
2. Scene receives the DOM click and identifies the clicked item.
3. Scene calls the resolver only for `completionPath.kind:
   interactionSequence`.
4. Resolver returns the semantic result: load, discharge, wrong-order,
   no-op.
5. Scene applies the resolver result exactly once.
6. Scene calls `triggerStep()` only when the active completion path is
   complete.
7. `completeStep()` remains a defensive backstop, not normal mid-sequence
   logic.

No legacy item-id fallback should handle an `interactionSequence` step
after the resolver has handled it. directTool and modal steps continue
to be dispatched outside the resolver.

## Docs still needing final sweep

After the dispatch issue is resolved, search the repo for stale terms
and replace with the modern vocabulary:

- `validateTriggerCoverage` -> `validateCompletionEventCoverage`
- `registeredTriggers` -> `registeredEmitters`
- `requiredAction` -> remove (deleted, not deprecated)
- `allowedInteractions` -> `interactionSequence` (now under `completionPath`)
- top-level `interactionSequence` -> `completionPath.interactions`
- `targetItems` -> `usedItems` (derived) or remove
- `cursor` -> `interactionIndex`
- `event` (in interaction context) -> `completionEvent`
- `scene wiring` (in coverage context) -> `completion-event emitter` or
  "completion-event coverage"

This sweep is part of SP-K2e (task #72).

## Suggested commit strategy

Do not squash 83 files into one commit. Suggested logical commits:

1. Vocabulary and docs modernization.
2. YAML schema rename and builder/validator updates.
3. Runtime `interactionIndex` and resolver updates.
4. Test layout move and supporting tooling.
5. Walker and walkthrough tooling.
6. Tutorial protocols.
7. `completionPath` schema redesign (K1 through K2d).
8. Resolver `completionPath` integration plus the eventual hood dispatch
   fix.
9. Final docs and changelog cleanup.

Generated files (`src/content/protocol_data.ts`,
`src/content/inventory_data.ts`) should be committed alongside the source
YAML or schema change that produces them. Do not commit a stale generated
file.

## Open tasks at pause

| # | Status | Task |
|---|---|---|
| 72 | pending | SP-K2e: Cleanup |
| 76 | in_progress | SP-K2bd2-revert (work complete; closure gated on walker fix) |
| 77 | pending | SP-K2bd2-alpha: Read-only classification audit |
| 78 | pending | SP-K2bd2-beta: YAML splits only |
| 79 | pending | SP-K2bd2-gamma: Walker rewrite only |
| 80 | pending | SP-K2bd2-delta: Gates plus docs/changelog wrap-up |
| 81 | in_progress | SP-K2bd2-resolver-compat (work complete; closure gated on walker fix) |

A new task should be created when work resumes, after the trace
investigation:

- A patch task for whatever the trace identifies (event-branch fix, state
  reset fix, dispatch refactor, or walker fix). The shape of the patch
  follows from the evidence, not from this document.

## Current locked decisions

These were decided during this session and govern current execution.
They can be revisited later, but should not be changed during the next
manager's first pass.

- Tool-first click model. Source-first and destination-first click
  models are not supported.
- One completion event per step, on the final interaction.
- `usedItems` is derived, not authored.
- `requiredAction` is deleted, not deprecated.
- Wrong-order clicks are soft-fail in gameplay and hard-fail in the
  walker (without the `--wrong-order` flag).
- Three K2 kinds total: `interactionSequence`, `directTool`, `modal`. No
  fourth kind unless an audit demonstrates a real authoring need.
- No legacy aliases or top-level `step.interactionSequence` fallback.
- The resolver does not synthesize fake interactions for directTool or
  modal steps.
- Validator Rule 8 is strict and is not weakened to accept legacy fields.
- AI agents do not run `git commit`. Commits are human-only.

## Engineering principles in force

These are saved as memory and applied across every dispatch in this
session. They are guidelines, not rigid rules:

- Long-term over short-term. Prefer durable fixes over quick patches.
- Fix the design, not the symptom. No try/except blocks to hide errors.
  No defensive defaults for required keys. No step.id branches in generic
  dispatch code.
- Fresh subagent per task. Each independent task gets a new Agent
  invocation with a self-contained brief.
- Atomic task decomposition. Each subpatch has one owner, one clear
  outcome, one verification step.

## Key files to know about

Source-of-truth files for the protocol contract:

- `src/content/cell_culture/protocol.yaml` -- active 25-step protocol.
- `src/content/cell_culture/items.yaml`, `reagents.yaml`.
- `src/content/tutorial_split/`, `src/content/tutorial_pbs/` -- tutorial
  protocols.
- `tools/build_protocol_data.py` -- parser, validator (Rules 1-8),
  emitter.

Runtime hot spots:

- `src/init.ts` -- boot, scene attach, validator wiring,
  `validateCompletionEventCoverage`, window exports for tests.
- `src/game_state.ts` -- `activeStepId`, `interactionIndex`,
  `wrongOrderClicks`, `heldLiquid`, `completeStep` (with defensive
  backstop), `triggerStep`.
- `src/interaction_resolver.ts` -- pure resolver. Reads from
  `step.completionPath.interactions` only.
- `src/scenes/hood.ts` -- the dispatch hot spot for the open
  hypotheses. Lines 521-560 (resolver wiring), 600-800 (per-event
  branches), 791-792 (route entry), 955-1277 (legacy item-id branches).
- `src/scenes/bench.ts`, `src/scenes/microscope.ts` -- other scenes.
- `src/steps/drug_treatment.ts` -- drug-modal step registrations.
- `src/step_dispatch.ts` -- central scene routing.
- `src/ui_rendering.ts` -- toolbar derivation.

Test infrastructure:

- `tests/playwright/repo_root.mjs` -- shared `git rev-parse` helper.
- `tests/conftest.py` -- excludes `e2e` and `playwright` from pytest.
- `tests/test_test_naming_conventions.py` -- enforces folder layout
  rules.
- `tests/test_protocol_yaml_validator.py` -- pytest covering all eight
  validator rules.

Documentation:

- `docs/PROTOCOL_VOCABULARY.md` -- canonical terms.
- `docs/PROTOCOL_YAML_FORMAT.md` -- schema reference.
- `docs/PROTOCOL_AUTHORING_GUIDE.md` -- worked example, checklist,
  walker contract.
- `docs/CODE_ARCHITECTURE.md` -- system architecture.
- `docs/CHANGELOG.md` -- chronological log.
- `tests/TESTS_README.md` -- four-folder layout.

## Final note

The repo is paused mid-migration. The next manager should not resume
broad coding. First, verify the working tree and run a narrow dispatch
trace to explain the `pbs_wash` / `add_trypsin` asymmetry. After that
evidence is collected, decide whether the next patch is a small hood
dispatch fix or a broader dispatch ownership refactor.

The long-term design direction appears sound, but the repo is paused
mid-migration and is not commit-ready.
