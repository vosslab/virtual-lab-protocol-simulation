# Walkthrough guide

## Purpose

This guide documents the real-browser protocol walkthrough system. The
walkthrough is not a unit test. It is a Playwright-driven UI walker that starts
the built app, opens a protocol in a browser, clicks real DOM elements, waits
for observable game-state progress, records a JSON report, and saves
screenshots.

The canonical walker is
[protocol_walkthrough_yaml.mjs](../../tests/playwright/e2e/protocol_walkthrough_yaml.mjs).
Shared helpers live in
[walker_helpers.mjs](../../tests/playwright/e2e/walker_helpers.mjs). The optional
Python wrapper is
[run_protocol_walkthrough.py](../../tools/run_protocol_walkthrough.py). The fast
browser smoke wrapper [run_smoke.py](../../tools/run_smoke.py) is useful context,
but it is not a full protocol walkthrough.

The goal is to prove that a mini-protocol is playable through visible browser
interactions, not merely schema-valid.

## System overview

The walkthrough has four layers:

| Layer          | File                                                                                      | Responsibility                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Built app      | `dist/`                                                                                   | Browser-rendered game output produced by the build                                       |
| Node walker    | [protocol_walkthrough_yaml.mjs](../../tests/playwright/e2e/protocol_walkthrough_yaml.mjs) | Starts the server, launches Playwright, opens the protocol, walks steps, writes evidence |
| Helper library | [walker_helpers.mjs](../../tests/playwright/e2e/walker_helpers.mjs)                       | Scene switching, selector resolution, click-and-wait logic, wrong-order helpers          |
| Python wrapper | [run_protocol_walkthrough.py](../../tools/run_protocol_walkthrough.py)                    | Optional build-and-run convenience around the Node walker                                |

The core loop is:

1. Serve the compiled `dist/` directory.
2. Launch headless Chromium through Playwright.
3. Open the requested protocol with `/?protocol=<id>`.
4. Reset browser persistence with `localStorage.clear()` and reload.
5. Enter through the visible welcome/start UI.
6. Read the already-compiled protocol steps from `window.PROTOCOL_STEPS`.
7. For each step, walk the `sequence` and perform each interaction's `gesture` on its `target`.
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

A passing walkthrough proves that the compiled `dist/` app can be
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
- Each step's `step_validator` passes and emits a `<step_name>_complete` event.
- The runtime advances to the step's `next_step`, or to a terminal state when `next_step` is `null`.
- The final result screen exists.
- Console errors and same-origin network failures are captured in the report.

This is the browser evidence side of
[../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md): a mini-protocol is not complete
until the visible interaction works.

## Current proof boundary

The walkthrough is not a replacement for protocol validators, TypeScript
checks, focused unit tests, or visual regression tests.

Current limits:

- It does not save a screenshot after every click.
- It does not save a screenshot after every interaction inside a step's
  `sequence`.
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
`dist/` app. Build first, then run the Node walker from the repo root:

```bash
npm run build
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol cell_culture
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_drug_additions --wrong-order
```

The Node walker:

- Serves `dist/` with `python3 -m http.server`.
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

- `--list-protocols`: list `content/protocols/*/protocol.yaml` protocol names.
- `--wrong-order`: pass wrong-order mode through to the Node walker.
- `--no-build`: skip its build step and run the walker against the existing
  `dist/` output.

The three workflows are:

| Workflow            | Use                                                                   | Command                                                                   |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Normal walkthrough  | Default real-browser protocol walkthrough                             | `node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <id>` |
| Python wrapper      | Optional convenience around the same headless walker                  | `python3 tools/run_protocol_walkthrough.py --protocol <id>`               |
| Codex-only fallback | UI review only when local browser launch fails in Codex macOS sandbox | `tools/run_ui_review_podman.sh`                                           |

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
- `step_<n>_<step_name>.png`: screenshot after each passed step.
- `fail_<step_name>.png`: screenshot after a step failure.
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

1. Start a local static server for `dist/`.
2. Launch Chromium headlessly with Playwright.
3. Open `/?protocol=<protocol_name>`.
4. Wait for browser exports: `window.gameState` and
   `window.PROTOCOL_STEPS` (runtime debug surface).
5. Clear `localStorage`.
6. Reload the page.
7. Wait for exports again.
8. Click the welcome/start button if present.
9. Read `window.PROTOCOL_STEPS` from the page.
10. Save `initial_state.png`.

This matters because persisted browser state can hide runtime bugs. The walker
is expected to start from fresh browser state and enter through the same UI path
as a normal user.

## How the walker decides what to click

The walker is schema-driven. `walkStep()` dispatches from each interaction's
`target.kind` plus its `gesture`, not from a per-step kind discriminator and
not from a hand-authored recipe table. Step kinds are retired entirely; see
[../PRIMARY_SPEC.md](../PRIMARY_SPEC.md) for the canonical interaction model.

For every step, the walker reads the ordered `sequence` of `interaction`
blocks and, for each interaction, performs the named `gesture` on the named
`target`. `click` gestures click the resolved DOM element; `select` gestures
click the matching choice; `adjust` gestures perform the set-point input;
`drag` and `type` follow the corresponding visible UI affordance.

Tool-preconditions (where one interaction must precede another) are encoded
by the `sequence` order itself. The walker does not consult retired
`gameState.heldLiquid`, `selectedTool`, or `_with_` canonical-tool strings;
held state is derived from the `ObjectStateChange` `scene_operations` that
prior interactions emit.

The central click helper is `clickItemAndWaitProgress()`. It resolves a
`data-item-id` selector, optionally scopes it to a scene container, verifies
that the element exists, verifies that it is visible, clicks it, increments
`report.summary.totalClicks`, and waits for observable state progress.

The progress predicate accepts any observable state change produced by a
validated interaction's `response.scene_operations`:

- An `ObjectStateChange` mutated a declared `state_field`.
- A `CursorAttach` attached or detached a tool from the cursor.
- A `SceneChange` switched the active scene.
- A `LayoutMove` repositioned an object.
- A step resolved `complete` (the `<step_name>_complete` event fired).

If none of those changes occur before the click budget expires, the helper
throws:

```text
click_did_not_advance: click on <object_name> produced no state change after <ms>ms
```

## Scene scoping

Scene scoping is important because the same `data-item-id` can exist in more
than one scene. `resolveScopedSelector()` maps scene names to scene containers:

| Scene                  | Container                     |
| ---------------------- | ----------------------------- |
| `well_plate_workspace` | `#well_plate_workspace-scene` |
| `bench`                | `#bench-scene`                |
| `plate_reader`         | `#bench-scene`                |
| default/hood           | `#hood-scene`                 |

The walker switches scenes through visible UI paths where possible:

- `switchToBench()` clicks `#hood-to-bench-btn`.
- `switchToHood()` clicks `#bench-to-hood-btn`.
- `switchToPlate()` switches to the hood if needed, clicks the visible
  `well_plate`, and waits for `activeScene === 'well_plate_workspace'`.

This catches scene-wiring problems that direct `gameState.activeScene` writes
would hide.

## Interaction support

The walker dispatches from each interaction's closed `gesture` set
(`click`, `drag`, `adjust`, `select`, `type`) and the resolved `target`. The
retired per-step kinds (`interactionSequence`, `directTool`, `modal`,
`multipleChoice`) are no longer dispatchable shapes; every step is one
ordered `sequence` of interactions per [../PRIMARY_SPEC.md](../PRIMARY_SPEC.md).

What were the legacy kinds map to interaction shapes as follows:

- A legacy `interactionSequence` step is an ordered `click` sequence.
- A legacy `directTool` step is a one-interaction `sequence` with a `click`.
- A legacy `modal` step is an interaction whose `response` carries a
  `SceneChange` (open a modal) or a `feedback`-only payload (advance once
  inside).
- A legacy `multipleChoice` step is a `select`-gesture interaction validated
  by the `correct_choice` preset.

Modal handling details (microscope viability, counting screens, plate-reader
modal) are scene-side affordances reached through the same gesture model;
the walker has no per-step branch for them.

The walker stays schema-driven. Step-name-specific branches and per-protocol
special cases are not allowed; if the visible UI cannot be exercised by the
closed gesture set, the fix is to extend the YAML, scene, or runtime, never
to add a walker branch.

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

| Symptom                                         | Likely cause                                                                                 | Better fix                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Element ... does not exist in DOM`             | Item id is missing from scene YAML, render output, or modal markup                           | Add the item to the scene/render path or fix the id                             |
| `Element ... is not visible`                    | Wrong scene is active, hidden duplicate was selected, or overlay state blocks the target     | Fix scene switching or pass a scoped scene selector                             |
| `click_did_not_advance`                         | Click handler is missing, handler changes only CSS, or state signal is delayed beyond budget | Add the runtime handler or expose an observable state change                    |
| Active step advances to the wrong `step_name`   | Step completes but the runtime resolves `next_step` to a wrong or missing step               | Fix protocol YAML `next_step` value or completion dispatch                      |
| Final result screen missing                     | Terminal step completed without rendering the scoring/results screen                         | Fix terminal UI flow, not the walker                                            |
| Wrong-order injection advances the step         | Runtime accepts a non-required interaction as valid progress                                 | Tighten interaction-validator dispatch and active-target checks                 |
| Mini-protocol enters hood or bench unexpectedly | Scene isolation is broken for a workspace-only protocol                                      | Fix the `SceneChange` `scene_operation` chain in the affected step's `response` |
| Modal advance control missing                   | Modal scene's advance affordance is not rendered or not clickable                            | Fix modal scene rendering and the step's interaction `target`                   |
| `select`-gesture step cannot click answer       | Choice id is not rendered as a scene-scoped click target                                     | Fix choice rendering and the interaction `target`                               |

Prefer fixing runtime schema, YAML, render output, or dispatch behavior before
adding walker branches. The walker is most valuable when it remains a generic
consumer of the same schema the app uses.

## Adding new interaction behavior

When a step needs a behavior the existing closed gesture set cannot express,
update the YAML vocabulary, runtime, and walker together. Step kinds are
retired; behavior extends through the gesture set, the `scene_operation`
primitives, and the validator preset library.

The minimum implementation contract is:

- The YAML schema describes the behavior through `gesture`, `target`,
  `validator`, and `response.scene_operations` without relying on a
  `step_name`.
- Runtime rendering exposes visible click targets with stable ids resolved
  from `object_name` (or `<object_name>.<subpart_name>`).
- Runtime dispatch advances state through normal handlers for the named
  gesture, firing the validator preset and the response's
  `scene_operations`.
- The walker resolves the same ids from the schema.
- Every walker interaction produces an observable state-progress signal
  through an `ObjectStateChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, or step-complete event.
- The step's `step_validator` resolves and the runtime advances to
  `next_step`.
- Screenshot evidence captures before/after step boundary.

Avoid encoding protocol knowledge in the walker. A branch such as "if this
step is `some_specific_step_name`, click these three things" is usually a
sign that the schema or scene affordance is missing a concept.

## Adding a walkthrough for a new mini-protocol

To make a new mini-protocol walkthrough-ready:

1. Add the mini-protocol under `content/protocols/<cluster>/<protocol_name>/`.
2. Make sure `protocol.yaml` has a complete step chain.
3. Give every step a stable `step_name`.
4. Give every step a `sequence` of one or more interactions.
5. Each interaction declares a `target`, a `gesture`, a `validator`, and a
   `response`; the closed gesture set is `click`, `drag`, `adjust`,
   `select`, `type`.
6. Give every step a `next_step`, or `next_step: null` for the final step.
7. Make sure every clicked object exists in `content/objects/` and is
   placed in the relevant protocol scene.
8. Make sure every clicked object renders with `data-item-id="<object_name>"`.
9. Make sure every interaction's `response.scene_operations` produces an
   observable state change.
10. Build the app.
11. Run the walkthrough.
12. Inspect `test-results/walker/playthrough_report.json`.
13. Inspect the screenshots in `test-results/walker/`.

Observable state for walker interactions currently means at least one of
these signals fires:

- An `ObjectStateChange` mutates a declared `state_field`.
- A `CursorAttach` attaches or detaches a tool.
- A `SceneChange` switches the active scene.
- A `LayoutMove` repositions an object.
- A `<step_name>_complete` event fires.

Use this run pattern:

```bash
npm run build
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <protocol_name>
```

For a negative-order pass, also run:

```bash
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol <protocol_name> --wrong-order
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
- A step's `step_validator` does not pass, so no `<step_name>_complete` event fires.
- The runtime advances to the wrong `step_name`, or `next_step` resolves to a missing step.
- Wrong-order clicks are accepted during the correct sequence.
- The final result screen is missing.
- Console errors are detected.
- Same-origin network requests fail.
- The walker crashes before normal cleanup.

Current budgets:

| Budget    | Value      | Failure                 |
| --------- | ---------- | ----------------------- |
| Per click | `3000ms`   | `click_did_not_advance` |
| Per step  | `30000ms`  | `step_stalled`          |
| Whole run | `600000ms` | `run_stalled`           |

## Wrong-order mode

`--wrong-order` mode is a negative test. Before each correct interaction
in a step's `sequence`, the walker tries to find a visible
`data-item-id` element that is not the required `target` for that
interaction.

The wrong-order click must:

- Trigger the scene's `wrong_order_message` toast affordance.
- Leave the step's interaction position unchanged.
- Leave the active step unchanged.

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
by default. This aligns with [../PLAYWRIGHT_USAGE.md](../PLAYWRIGHT_USAGE.md): the
canonical pattern is `chromium.launch()` with no headed option, and existing
scripts already run headless.

Agents should not document headed mode as the normal workflow, should not add
`headless: false`, and should not add `--headed` to walkthrough commands. Human
local debugging may use headed mode manually, but that is not part of the
walkthrough contract.

## Relationship to smoke tests

[run_smoke.py](../../tools/run_smoke.py) builds the app and runs
test_game_ui.mjs. That smoke test
checks that the app loads, key UI elements render, and basic early gates pass.

Use smoke tests for fast browser sanity checks. Use the walkthrough when the
question is whether a complete protocol can be played through visible UI
interactions.

## When to update this guide

Update this guide whenever the walker gains a new `completionPath.kind`, a new
screenshot evidence mode, a new scene-switch helper, or a new failure mode that
future coders are likely to hit.

## Related docs

- [../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md): non-negotiable mini-protocol
  completion rule.
- [../PLAYWRIGHT_USAGE.md](../PLAYWRIGHT_USAGE.md): Playwright conventions,
  headless default, and Codex-only Podman fallback.
- [../E2E_TESTS.md](../E2E_TESTS.md): browser test placement and E2E conventions.
- [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md): protocol
  authoring workflow and validation gates.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md): protocol schema.
