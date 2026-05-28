# Protocol execution seam discovery (WP-0-3)

Date: 2026-05-27
WP: WP-0-3 (web-ui shell plan)
Status: Case C - no shared TS runtime exists; halt plan; runtime-seam follow-on plan required.

## Executive summary

This repo is a scene-geometry and scene-rendering library only. Protocol
execution logic lives in an external `runtime.bundle.js` that is referenced
by pipeline scripts and consumed by walker tests, but its TypeScript source
is not committed to this repo. The intended runtime entry file
(`src/scene_runtime/bundle/entry.ts`) is referenced by
`pipeline/build_runtime_bundle.sh:18` but does not exist in
`git ls-files src/`.

The shell cannot observe protocol state through a typed seam until that
seam exists. WP-0-3 concludes **Case C**: halt the web-ui shell plan at
Milestone 0 exit and draft a separate runtime-seam plan before any
Milestone 1 (shell primitives), Milestone 2 (adapter), Milestone 3
(launcher), or Milestone 4 (pilots) work begins.

## Five-question audit

### (a) Which module is authoritative for protocol state?

No module in this repo. State is maintained in an external
`runtime.bundle.js` that is referenced from build scripts and read from
walker tests.

Walker reads (read-only) on `window.gameState`:

- `interactionIndex` (`tests/playwright/e2e/protocol_walkthrough_yaml.mjs:294`).
- `wrongOrderClicks` (`protocol_walkthrough_yaml.mjs:314, 344`).
- `activeStepId` (`protocol_walkthrough_yaml.mjs:316, 348`).
- `completedSteps` (`tests/playwright/e2e/walker_helpers.mjs:18`).
- `activeScene` (`walker_helpers.mjs:69`).
- `selectedTool` (`walker_helpers.mjs:56`).
- `heldLiquid` (`walker_helpers.mjs:35`).

`git ls-files src/` does not include any file under
`src/scene_runtime/bundle/`. `git ls-files | xargs grep -l "mountRuntime"`
returns only `pipeline/build_protocol_html.py`, walker tests, and archived
plans -- no live `src/*.ts` defines `mountRuntime`.

### (b) How do state transitions become observable?

In the intended (not-yet-built) runtime, observability is a single mutable
global `window.gameState`. No event emitter, no callback registration, no
typed observer interface, no exported seam type. The walker polls
`window.gameState` via Playwright `page.evaluate`.

### (c) No-backdoor list

Backdoor patterns the walker uses for test instrumentation that the shell
must never touch (from `walker_backdoor_audit.md`):

- `window.gameState = {...}` (full assignment).
- `window.gameState.activeScene = "..."`.
- `window.gameState.selectedTool = "..."`.
- `window.gameState.interactionIndex = ...`.
- `window.PROTOCOL_STEPS` writes.
- `window.resolveInteractionByIndex(...)` calls.
- `window.renderGame()` calls.
- `window.prompt = function() {...}` (modal override).
- `localStorage.clear()` and any `localStorage` write.
- `__RUNTIME_PROTOCOL_CONFIG`, `__RUNTIME_TEST_CLOCK`,
  `__RUNTIME_CLICK_LOG`, `__RUNTIME_CHECK_STEP_LOG`,
  `__RUNTIME_ORCHESTRATE_LOG`, `__RUNTIME_LAST_BUTTON_RENDER`
  (test-only diagnostic globals).

Shell may read `window.gameState.*` only through an explicit typed adapter
once Case C is resolved. Direct reads in any `src/shell/` component are
forbidden by the boundary lint planned in WP-1-7.

### (d) Artifacts emitted by today's execution path

- `pipeline/build_protocol_html.py:2073-2201` emits per-protocol HTML
  loading `./runtime.bundle.js` and inlining
  `<script id="protocol-runtime-data">` with the protocol name.
- `pipeline/build_runtime_bundle.sh` would bundle
  `src/scene_runtime/bundle/entry.ts` into `dist/runtime.bundle.js`.
  Entry file is missing.
- `npm run build` invokes `build_github_pages.sh` (bench-only
  `src/main.ts`), not `build_runtime_bundle.sh`. The canonical build does
  not produce `runtime.bundle.js`.

### (e) Live generator scripts vs documentation

Live per `package.json`:

- `tools/gen_object_library.py`
- `tools/gen_svg_registry.py`
- `tools/gen_scene_index.py`

Referenced in `docs/FILE_STRUCTURE.md` but not invoked by any npm script:

- `pipeline/build_protocol_data.py`
- `pipeline/build_scene_data.py`
- `pipeline/generate_svg_globals.py`

Mismatch flagged. The plan's WP-0-3 success condition requires updating
the plan or `docs/FILE_STRUCTURE.md` to resolve the disagreement before
Milestone 1 dispatches. Recommend correcting `docs/FILE_STRUCTURE.md` to
match `package.json`. This is a small doc patch that can land
independently of the runtime-seam plan.

## Case classification

**Case C: no shared TS runtime exists.**

- `src/scene_runtime/bundle/entry.ts` is referenced by build scripts but
  not committed.
- No live TS source defines `mountRuntime`, `loadAndMountByProtocolName`,
  `window.gameState`, `window.PROTOCOL_STEPS`, or
  `window.resolveInteractionByIndex`.
- `npm run build` produces a scene-rendering bundle only; no
  `runtime.bundle.js`.

The pipeline scripts and walker tests describe an intended runtime
contract, but the contract is not implemented in committed TypeScript
source.

## Decision per plan

Per
`/Users/vosslab/.claude/plans/sunny-enchanting-allen.md` Open decisions
("WP-0-3 case classification"), Case C halts this plan at Milestone 0
exit. No Milestone 1, 2, 3, or 4 work proceeds. A separate runtime-seam
plan must be drafted that:

1. Locates the source of truth for `mountRuntime` /
   `loadAndMountByProtocolName` / `window.gameState`. Candidates: sibling
   repo, previously-deleted source recoverable from history, net-new
   design.
2. Brings the runtime in-tree at `src/scene_runtime/bundle/entry.ts` (or
   defines a stable external-consumption contract).
3. Replaces the `window.gameState` global with a typed observer surface
   (`ProtocolShellEvent` discriminated union, or `ShellViewSnapshot`
   readonly object).
4. Wires `build_runtime_bundle.sh` (or successor) into `npm run build`
   so the runtime ships with every protocol HTML.
5. Reconciles `docs/FILE_STRUCTURE.md` with live `package.json` scripts.

## Secondary deliverable

`src/shell/adapter/types.ts` is **not created**. Case C precludes a useful
seam type until the runtime surface is decided. Drafting a type against a
non-existent runtime would lock in `window.gameState` as the contract,
which the runtime-seam plan should be free to redesign.

## Status

- Status label: `BLOCKED` (plan halted at Milestone 0 exit per Case C).
- Plan update required: yes. Update web-ui plan Milestone 1 dispatch gate
  to reference this doc and the runtime-seam follow-on plan.
- Doc drift required: yes. Correct `docs/FILE_STRUCTURE.md` generator
  filenames.
- Human notification: required per plan's Open decisions clause.

## References

- `/Users/vosslab/.claude/plans/sunny-enchanting-allen.md` -- approved
  web-ui shell plan.
- `docs/active_plans/active/web_ui/ADR_001_frontend_framework.md` --
  framework decision (Solid for shell only). Decision stands; Case C
  only delays application.
- `docs/active_plans/active/web_ui/walker_backdoor_audit.md` -- backdoor
  catalog feeding question (c).
- `docs/active_plans/active/web_ui/baseline_check_log.md` -- `npm run
  check` baseline (pass).
- `docs/active_plans/active/web_ui/protocol_corpus_inventory.md` -- pilot
  candidates ready for WP-4-1 once the plan resumes.
