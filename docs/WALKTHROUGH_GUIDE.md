# Walkthrough guide

## Purpose

This guide documents the real-browser protocol walkthrough system. The
walkthrough is not a unit test. It is a Playwright-driven UI walker that starts
the built app, opens a protocol in a browser, clicks real DOM elements, waits
for observable game-state progress, records a JSON report, and saves
screenshots.

The canonical walker is
[protocol_walkthrough_yaml.mjs](../tests/playwright/e2e/protocol_walkthrough_yaml.mjs).
Shared helpers live in
[walker_helpers.mjs](../tests/playwright/e2e/walker_helpers.mjs). The optional
Python wrapper is
[run_protocol_walkthrough.py](../tools/run_protocol_walkthrough.py). The fast
browser smoke wrapper [run_smoke.py](../tools/run_smoke.py) is useful context,
but it is not a full protocol walkthrough.

The goal is to prove that a mini-protocol is playable through visible browser
interactions, not merely schema-valid.

## Target-state vs current-code

This guide is **current-code**: it describes the walker as it runs today,
against the current runtime. The current runtime and walker still dispatch
on the retired `completionPath` schema (`completionPath.kind`,
`interactionSequence` / `directTool` / `modal` / `multipleChoice`, `nextId`,
`heldLiquid` -- see the retired-terms table in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)). The target-state interaction model -- a `step` wrapping an
ordered `sequence` of four-slot `interaction` blocks, with `step_validator`,
`outcome`, and `next_step` -- is defined in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). Migrating the runtime and
the walker to that model is the follow-on code-migration plan's job; until
that lands, the walker dispatch and progress predicates documented below
reflect the legacy schema, and that is the honest current state, not a
contradiction of the canonical vocabulary.

## System overview

The walkthrough has four layers:

| Layer | File | Responsibility |
| --- | --- | --- |
| Built app | [dist/](../dist/) | Browser-rendered game output produced by the build |
| Node walker | [protocol_walkthrough_yaml.mjs](../tests/playwright/e2e/protocol_walkthrough_yaml.mjs) | Starts the server, launches Playwright, opens the protocol, walks steps, writes evidence |
| Helper library | [walker_helpers.mjs](../tests/playwright/e2e/walker_helpers.mjs) | Scene switching, selector resolution, click-and-wait logic, wrong-order helpers |
| Python wrapper | [run_protocol_walkthrough.py](../tools/run_protocol_walkthrough.py) | Optional build-and-run convenience around the Node walker |

The core loop is:

1. Serve the compiled [dist/](../dist/) directory.
2. Launch headless Chromium through Playwright.
3. Open the requested protocol with `/?protocol=<id>`.
4. Reset browser persistence with `localStorage.clear()` and reload.
5. Enter through the visible welcome/start UI.
6. Read the already-compiled protocol steps from `window.PROTOCOL_STEPS`.
7. For each step, dispatch by `completionPath.kind`.
8. Click visible DOM targets and wait for state progress.
9. Verify step completion and next-step advancement.
10. Save report and screenshot evidence.

The walker is both an E2E test and a playable audit. It is an E2E test because
it starts the built app in a browser and completes the protocol through real
DOM clicks. It is a playable audit because it checks whether a learner-visible
path actually exists through the protocol.
It is stricter than a smoke test because it must complete the protocol. It is
less detailed than a visual regression suite because it does not yet prove
every intermediate rendered state.

## What the walkthrough proves

A passing walkthrough proves that the compiled [dist/](../dist/) app can be
served locally and completed through the same visible click path a learner uses.

Specifically, it proves:

- The built app loads through `/?protocol=<protocol_name>`.
- The walker starts from normal browser entry, clears `localStorage`, reloads,
  and dismisses the welcome modal by clicking a visible start button.
- Protocol steps are available through `window.PROTOCOL_STEPS`.
- Runtime state is available through `window.gameState`.
- Required scene objects exist as DOM elements with `data-item-id`.
- Required click targets are visible when the walker clicks them.
- Clicks go through browser event handlers, not direct protocol APIs.
- Each click that uses `clickItemAndWaitProgress()` produces observable state
  progress.
- Each step reaches `gameState.completedSteps`.
- `activeStepId` advances to the step's `nextId` or to `null` at the end.
- The final result screen exists.
- Console errors and same-origin network failures are captured in the report.

This is the browser evidence side of
[PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md): a mini-protocol is not complete
until the visible interaction works.

## Current proof boundary

The walkthrough is not a replacement for protocol validators, TypeScript
checks, focused unit tests, or visual regression tests.

Current limits:

- It does not save a screenshot after every click.
- It does not save a screenshot after every interaction inside an
  `interactionSequence`.
- It does not attach screenshot paths to individual click entries in
  `playthrough_report.json`.
- It does not compare screenshots against golden baselines.
- It does not prove that every intermediate teaching visual is correct.
- It does not inspect every visual style detail such as exact highlight color,
  liquid fill geometry, label placement, or animation timing.

The current evidence is strong enough to prove browser-playable completion. It
is not yet strong enough to prove fine-grained visual pedagogy at every click.

## How to run it

Normal walkthroughs use local headless Playwright against the compiled
[dist/](../dist/) app. Build first, then run the Node walker from the repo root:

```bash
npm run build
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol cell_culture
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions --wrong-order
```

The Node walker:

- Serves [dist/](../dist/) with `python3 -m http.server`.
- Uses port `8126`.
- Opens `http://127.0.0.1:8126/?protocol=<protocol_name>`.
- Launches Chromium through the Playwright library.
- Uses a `1280 x 900` viewport.
- Runs headless.

The Python wrapper is an optional convenience around the same headless
walkthrough. It can build first and then invoke the Node walker:

```bash
python3 tools/run_protocol_walkthrough.py --protocol tutorial_plate_drug_additions
```

Agents running Python in this repo should use the repo Python environment:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_plate_drug_additions
```

The wrapper also supports:

- `--list-protocols`: list `src/content/*/protocol.yaml` protocol ids.
- `--wrong-order`: pass wrong-order mode through to the Node walker.
- `--no-build`: skip its build step and run the walker against the existing
  [dist/](../dist/) output.

The three workflows are:

| Workflow | Use | Command |
| --- | --- | --- |
| Normal walkthrough | Default real-browser protocol walkthrough | `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <id>` |
| Python wrapper | Optional convenience around the same headless walker | `python3 tools/run_protocol_walkthrough.py --protocol <id>` |
| Codex-only fallback | UI review only when local browser launch fails in Codex macOS sandbox | `tools/run_ui_review_podman.sh` |

The Podman path is not the default walkthrough path. It is only for Codex macOS
sandbox browser-launch failures during screenshot-oriented UI review. It is not
for ordinary walkthroughs and not for Claude Code.

## Output files

The walker writes output under:

```text
test-results/walker/
```

Current outputs include:

- `playthrough_report.json`: structured run report with timestamp, protocol id,
  wrong-order mode, summary counts, log entries, final-state notes, console
  errors, and same-origin network errors.
- `initial_state.png`: screenshot after browser entry, localStorage clearing,
  reload, and welcome dismissal.
- `step_<n>_<step_id>.png`: screenshot after each passed step.
- `fail_<step_id>.png`: screenshot after a step failure.
- `final_screen.png`: screenshot after final checks.
- `crash_screen.png`: screenshot if the top-level walker crashes.

The report summary currently tracks:

- `stepsWalked`
- `stepsPassed`
- `stepsFailed`
- `totalClicks`
- `failureReason`

Report entries are timestamped and have a severity such as `info`, `warn`,
`error`, or `injection`. Wrong-order injections are intentionally logged with
the `injection` severity so they are grep-able.

## How the walker starts

The startup sequence is part of the contract. The walker does not call a test
API to place the app in a ready state.

The current sequence is:

1. Start a local static server for [dist/](../dist/).
2. Launch Chromium headlessly with Playwright.
3. Open `/?protocol=<protocol_name>`.
4. Wait for browser exports:
   `window.gameState`, `window.PROTOCOL_STEPS`, and
   `window.resolveInteractionByIndex`.
5. Clear `localStorage`.
6. Reload the page.
7. Wait for exports again.
8. Override `window.prompt` to return `20` for microscope quadrant-count
   prompts.
9. Click the welcome/start button if present.
10. Read `window.PROTOCOL_STEPS` from the page.
11. Save `initial_state.png`.

This matters because persisted browser state can hide runtime bugs. The walker
is expected to start from fresh browser state and enter through the same UI path
as a normal user.

## How the walker decides what to click

The walker is schema-driven. `walkStep()` dispatches from
`completionPath.kind`, not from a hand-authored recipe table.

For `interactionSequence` steps,
`walkInteractionSequenceStep()` reads each interaction and builds a click plan
from `tool`, `source`, and `destination`:

- `tool` only: click the tool.
- `tool` plus `source`: click the tool if the tool precondition is not already
  met, then click the source.
- `tool` plus `destination`: click the tool if the tool precondition is not
  already met, then click the destination.
- `tool`, `source`, and `destination`: click the tool, then click the source.
- `destination` only: click the destination.

The tool-precondition check reads `gameState.selectedTool`, canonicalizes any
`_with_` suffix, and compares it to the interaction's tool. It intentionally
does not use `gameState.heldLiquid` as the source of truth because held liquid
can be derived from the selected tool and may be stale across steps.

The central click helper is `clickItemAndWaitProgress()`. It resolves a
`data-item-id` selector, optionally scopes it to a scene container, verifies
that the element exists, verifies that it is visible, clicks it, increments
`report.summary.totalClicks`, and waits for observable state progress.

The progress predicate accepts any of these state changes:

- `selectedTool` changed.
- `heldLiquid` changed.
- `interactionIndex` changed.
- `activeStepId` changed.
- `activeScene` changed.
- `completedSteps.length` increased.

If none of those changes occur before the click budget expires, the helper
throws:

```text
click_did_not_advance: click on <item_id> produced no state change after <ms>ms
```

## Scene scoping

Scene scoping is important because the same `data-item-id` can exist in more
than one scene. `resolveScopedSelector()` maps scene names to scene containers:

| Scene | Container |
| --- | --- |
| `well_plate_workspace` | `#well_plate_workspace-scene` |
| `bench` | `#bench-scene` |
| `plate_reader` | `#bench-scene` |
| default/hood | `#hood-scene` |

The walker switches scenes through visible UI paths where possible:

- `switchToBench()` clicks `#hood-to-bench-btn`.
- `switchToHood()` clicks `#bench-to-hood-btn`.
- `switchToPlate()` switches to the hood if needed, clicks the visible
  `well_plate`, and waits for `activeScene === 'well_plate_workspace'`.

This catches scene-wiring problems that direct `gameState.activeScene` writes
would hide.

## Completion-path support

The current walker supports:

- `interactionSequence`: YAML-driven item interactions.
- `directTool`: direct click on the configured tool.
- `modal`: open a modal if needed, then click the configured advance control.
- `multipleChoice`: find the configured correct choice and click it.

It also retains legacy support for `isIncubation` steps that do not yet have a
`completionPath`.

Modal handling includes these details:

- Generic modal steps use `data-walker-advance="<advanceClick>"` to find the
  advance button.
- If the advance button is already present, the walker treats the modal as
  already open and skips `openClick`.
- Microscope viability and counting screens have a specialized modal path.
- Counting screens click all four `.quadrant-btn` buttons, use a prompt
  override for count entry, wait for selected styling, then click
  `#submit-cell-count`.

`multipleChoice` handling reads the `choices` array, finds the choice with
`correct: true`, and clicks that choice id in the step scene.

The walker should remain schema-driven. Step-id-specific branches should be
treated as temporary debt unless the behavior cannot yet be represented in the
protocol schema. Legacy branches should be treated as migration debt unless
they are backed by schema fields.

## Implementation nuances

These details are easy to miss when extending the walker.

`clickItemAndWaitProgress()` is deliberately state-based, not time-based. It
does not sleep after a click and hope the UI changed. It snapshots selected
tool, held liquid, interaction index, active step, active scene, and completed
step count before the click. After the click, it waits until one of those values
changes.

That design catches silent click-handler failures, but it also means a valid
click that only changes CSS and not game state will fail. If a new interaction
is meant to be walker-driven, it needs an observable state signal or a different
explicit wait predicate.

Scene-specific selectors are not optional. A bare `[data-item-id="..."]`
selector can pick the wrong copy of an item when the same object exists in more
than one scene. New walker code should pass `step.scene` into
`clickItemAndWaitProgress()` whenever the step is scene-specific.

Modal steps need already-open handling. Some modals stay open across adjacent
steps, so rerunning `openClick` can re-render the overlay and break pointer
events. The generic modal path first checks whether the configured
`data-walker-advance` button already exists; if it does, it skips `openClick`
and advances the existing modal.

The microscope path is special because the runtime uses native `prompt()` for
quadrant counts. The walker overrides `window.prompt` after each reload and
again before microscope modal walking so Playwright does not hang on a browser
dialog.

The walker records console and network errors without stopping immediately.
Those errors are collected during the run and then written into the report and
used in the final pass/fail decision. A visually completed run can still fail
because the browser logged application errors or same-origin asset failures.

## Edge cases for new coders

When a new protocol or scene fails in the walker, check these cases before
adding special-case code.

| Symptom | Likely cause | Better fix |
| --- | --- | --- |
| `Element ... does not exist in DOM` | Item id is missing from scene YAML, render output, or modal markup | Add the item to the scene/render path or fix the id |
| `Element ... is not visible` | Wrong scene is active, hidden duplicate was selected, or overlay state blocks the target | Fix scene switching or pass a scoped scene selector |
| `click_did_not_advance` | Click handler is missing, handler changes only CSS, or state signal is delayed beyond budget | Add the runtime handler or expose an observable state change |
| `activeStepId ... !== expected nextId` | Step completes but advances to the wrong next step | Fix protocol YAML `nextId` or completion dispatch |
| Final result screen missing | Terminal step completed without rendering the scoring/results screen | Fix terminal UI flow, not the walker |
| Wrong-order injection advances the step | Runtime accepts a non-required click as valid progress | Tighten interaction dispatch or active-target checks |
| Mini-protocol enters hood or bench unexpectedly | Scene isolation is broken for a workspace-only protocol | Fix protocol scene metadata or scene transition handlers |
| Modal advance button missing | `advanceClick` does not match a `data-walker-advance` attribute | Fix modal markup or protocol YAML |
| Multiple-choice step cannot click answer | Choice id is not rendered as a scene-scoped click target | Fix choice rendering/data attributes |

Prefer fixing runtime schema, YAML, render output, or dispatch behavior before
adding walker branches. The walker is most valuable when it remains a generic
consumer of the same schema the app uses.

## Adding new completion behavior

When a new `completionPath.kind` or interaction shape is needed, update the
runtime and walker together.

The minimum implementation contract is:

- The YAML schema describes the behavior without relying on a step id.
- Runtime rendering exposes visible click targets with stable ids.
- Runtime dispatch advances game state through normal click handlers.
- The walker can resolve the same ids from the schema.
- Every walker click has an observable state-progress signal.
- Step completion lands in `completedSteps`.
- The active step advances to `nextId`.
- Screenshot evidence still captures the before/after step boundary.

Avoid encoding protocol knowledge in the walker. A branch such as "if this step
is `some_specific_id`, click these three things" is usually a sign that the
schema is missing a concept.

## Adding a walkthrough for a new mini-protocol

To make a new mini-protocol walkthrough-ready:

1. Add the mini-protocol under `src/content/<protocol_id>/`.
2. Make sure `protocol.yaml` has a complete step chain.
3. Give every step a stable `id`.
4. Give every step a `scene`.
5. Give every step a `completionPath.kind`, unless it is still on a documented
   legacy path.
6. Give every step a `nextId`, or `nextId: null` for the final step.
7. Make sure every clicked object exists in the relevant `items.yaml` or scene
   YAML.
8. Make sure every clicked object renders with `data-item-id="<item_id>"`.
9. Make sure every click changes observable game state.
10. Add any new `completionPath.kind` to both runtime dispatch and the walker.
11. Build the app.
12. Run the walkthrough.
13. Inspect `test-results/walker/playthrough_report.json`.
14. Inspect the screenshots in `test-results/walker/`.

Observable state for walker clicks currently means at least one of these values
changes:

- `selectedTool`
- `heldLiquid`
- `interactionIndex`
- `activeStepId`
- `activeScene`
- `completedSteps.length`

Use this run pattern:

```bash
npm run build
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <protocol_id>
```

For a negative-order pass, also run:

```bash
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <protocol_id> --wrong-order
```

## Walkthrough-ready definition

A mini-protocol is walkthrough-ready when the walker can complete it from a
fresh browser state using only real DOM clicks, with no direct game-state
mutation, no hidden click targets, no missing scene objects, no console errors,
and a final result screen.

## Failure modes

The walker fails when the visible UI cannot support the protocol. Important
failure cases include:

- The static server does not start.
- Browser exports do not appear.
- A step has no supported completion path.
- A required item does not exist in the DOM.
- A required item exists but is hidden.
- A click produces no observable state change.
- A step exceeds its per-step budget.
- The whole run exceeds its run budget.
- A step is not added to `completedSteps`.
- `activeStepId` does not match the expected `nextId`.
- Wrong-order clicks are accepted during the correct sequence.
- The final result screen is missing.
- Console errors are detected.
- Same-origin network requests fail.
- The walker crashes before normal cleanup.

Current budgets:

| Budget | Value | Failure |
| --- | --- | --- |
| Per click | `3000ms` | `click_did_not_advance` |
| Per step | `30000ms` | `step_stalled` |
| Whole run | `600000ms` | `run_stalled` |

## Wrong-order mode

`--wrong-order` mode is a negative test. Before each correct
`interactionSequence` interaction, the walker tries to find a visible
`data-item-id` element that is not one of the required `tool`, `source`, or
`destination` ids for that interaction.

The wrong-order click must:

- Increment `gameState.wrongOrderClicks`.
- Leave `gameState.interactionIndex` unchanged.
- Leave `gameState.activeStepId` unchanged.

After the injected click is verified, the walker performs the correct click
sequence and checks that wrong-order count does not increase during the correct
sequence.

## Screenshot evidence status

The walkthrough uses headless Playwright. It currently captures screenshots at
step boundaries: initial state, after each passed step, failure state, final
screen, and crash state. This is useful, but it is not enough to prove
fine-grained interaction quality.

The desired future behavior is stronger: the walkthrough should save a
screenshot after every click or at least after every interaction. That evidence
would show the exact sequence of visible tool, source, destination, highlight,
and liquid-state changes.

Until that exists, a passing walkthrough proves that the protocol can be
completed through real DOM clicks in a headless browser. It does not fully prove
that every intermediate visual teaching state is correct.

## Required future work

Documented future work, not implemented yet:

- Add screenshot capture inside `clickItemAndWaitProgress()`.
- Name screenshots with step id, interaction index, click index, and item id.
- Add report entries linking each screenshot to the click that produced it.
- Optionally add a `--screenshots per-step|per-interaction|per-click` flag.

The current walker is already valuable because it proves real DOM completion.
The missing piece is finer screenshot evidence between step boundaries.

## Mini-protocol completion contract

A mini-protocol is not complete until the visible interaction works. A
walkthrough must run through each step and click each required interaction
through the real browser UI. Passing TypeScript, validators, and walker setup
is not enough.

The current walker saves step-boundary screenshot evidence. The required next
improvement is per-interaction or per-click screenshots, so completion evidence
can show that intended objects are visible, active click targets are
highlighted, clicks advance the protocol, and visible state changes appear
after each interaction.

## Headless browser contract

The walkthrough uses Chromium through the Playwright library, launched headless
by default. This aligns with [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md): the
canonical pattern is `chromium.launch()` with no headed option, and existing
scripts already run headless.

Agents should not document headed mode as the normal workflow, should not add
`headless: false`, and should not add `--headed` to walkthrough commands. Human
local debugging may use headed mode manually, but that is not part of the
walkthrough contract.

## Relationship to smoke tests

[run_smoke.py](../tools/run_smoke.py) builds the app and runs
[test_game_ui.mjs](../tests/playwright/test_game_ui.mjs). That smoke test
checks that the app loads, key UI elements render, and basic early gates pass.

Use smoke tests for fast browser sanity checks. Use the walkthrough when the
question is whether a complete protocol can be played through visible UI
interactions.

## When to update this guide

Update this guide whenever the walker gains a new `completionPath.kind`, a new
screenshot evidence mode, a new scene-switch helper, or a new failure mode that
future coders are likely to hit.

## Related docs

- [PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md): non-negotiable mini-protocol
  completion rule.
- [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md): Playwright conventions,
  headless default, and Codex-only Podman fallback.
- [E2E_TESTS.md](E2E_TESTS.md): browser test placement and E2E conventions.
- [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md): protocol
  authoring workflow and validation gates.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md): protocol schema.
