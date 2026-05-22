# Plan: YAML-to-browser scene runtime activation

## Context

The YAML backbone is solid. Twelve protocols pass `validation/validate.py` (aggregate;
includes `validation/yaml/`, `validation/stepper/`, `validation/svg/`) and
`validation/manual/protocol_manual.py --all`. Object vocabulary is
closed; `well_plate_96` recently gained a geometric `blocks` family; per-protocol materials
registries are in place. None of this is playable in a browser. There is no working
YAML-to-DOM render path, no scene runtime aligned to the closed vocabulary, no Playwright
walker that drives a real student-visible interaction surface, and no per-mini-protocol
HTML output that PRIMARY_CONTRACT item 2 requires.

The repo carries 5650 lines of pre-existing TypeScript under `src/` plus a partially-built
`src/scene_runtime/` skeleton (`contract.ts`, `types.ts`, plus empty-shell `adapters/`,
`dispatch/`, `highlight/`, `layout/`, `liquid/`) and a frozen `src/scenes/` legacy tree
(legacy banner + freeze baseline test). `src/scene_runtime/contract.ts` was written
against the pre-2026-05-15 protocol vocabulary (`completionPath` kinds
`interactionSequence` / `directTool` / `modal` / `multipleChoice`, plus `plateTargets` /
`tubeTargets` that the user explicitly rejected as a vocabulary regression). The current
closed vocabulary uses `step.sequence` of `interaction` records with `target`, `gesture`,
`validator`, and `response`, where `response.scene_operations` carries typed primitives
(`ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`) and
`gesture` is closed to `click` / `drag` / `adjust` / `select` / `type`. The runtime
contract and the content YAML no longer share a vocabulary.

`docs/active_plans/scene_runtime_status_2026_05_14.md` records a pause at M6 of the prior
spine refactor, blocked on the `plateTargets` / `tubeTargets` vocabulary tension. That
tension has since been resolved at the YAML layer (subpart groups + `all_wells` + the new
`blocks` family; the 96-well cleanup landed on 2026-05-16). The runtime now needs to be
brought in line with the resolved vocabulary and driven end-to-end through the visible UI.

The YAML backbone has never been exercised by a real browser; oversights are expected to
surface during scene wiring. The plan treats every such oversight under a three-way
triage (renderer gap, content gap, spec gap) and never as license to patch the walker
around a missing affordance.

### Critique that shaped this revision

A prior draft of this plan was reviewed and judged "directionally right but not atomic
enough". The reviewer flagged three likely stuck-points if the plan were dispatched
as-was: generated-data mismatch between the Python builder output and what the TypeScript
runtime needs; visual-state rendering ambiguity (which SVG changes when one
`ObjectStateChange` writes which field); and the well-plate adapter being the first real
render target instead of something simpler. The reviewer also pushed for a thin visible
slice before any layout / chrome / walker work, and for a bundling decision baked into
the plan rather than deferred. This revision adds an M0.5 generated-data audit, an M1.5
visible runtime slice (one object, one click, one state change, one visible DOM delta), a
Pilot 0 smoke harness ahead of the Pilot 1 mini-protocol, an explicit esbuild bundling
decision, a deterministic test clock for `TimedWait`, a three-way runtime-gap triage
contract, and stop-on-failure semantics for `main`.

## Objectives

- Realign the scene runtime contract (`src/scene_runtime/contract.ts` + `types.ts`) to the
  current closed protocol / scene / object vocabulary so loader, dispatcher, and renderer
  share one source of truth with the YAML.
- Prove the generated-data boundary: every field the TypeScript runtime needs is emitted
  by the Python builders, scene inheritance is fully resolved Python-side, and the audit
  surfaces every gap before loader work starts.
- Land one thin visible runtime slice (one scene, one object, one click, one
  `ObjectStateChange`, one visible DOM delta, one Playwright proof) before any layout,
  chrome, walker, or full protocol activation work.
- Ship a minimal scene runtime under `src/scene_runtime/` that loads protocols, scenes,
  objects, and materials; resolves object `visual_states` from declared `state_fields`;
  dispatches the closed `gesture` set from visible DOM; runs the five `scene_operation`
  primitives; and uses a clock abstraction so `TimedWait` is deterministic in tests.
- Provide a minimal chrome (scene viewport, prompt panel, next / feedback area) sufficient
  for one protocol to load and advance. Defer welcome, launcher, full MCQ modal, and
  visual polish until the runtime can complete the pilot.
- Bundle TypeScript with esbuild (already used by `tests/_compile_for_test.mjs` and
  `tools/build_test_fixture.sh`). Emit one shared runtime bundle plus per-protocol HTML
  shells that load per-protocol generated data.
- Audit the layout engine against the closed object vocabulary, the new `blocks` family,
  and `visual_states` rendering deltas; document and fix gaps.
- Emit one HTML file per mini-protocol (`<protocol_name>.html`) under `dist/` from a
  generator that consumes generated runtime data. `dist/` stays gitignored.
- Generate one generic Playwright walker that drives every mini-protocol through the
  visible UI, saves before / after screenshots into a gitignored `test-results/`, and
  contains zero per-protocol branches.
- Walk all 12 mini-protocols end-to-end in a real browser. Resolve every surfaced
  oversight under the renderer-gap / content-gap / spec-gap triage and never as a walker
  workaround.

## Design philosophy

**Plan scope is TypeScript-first.** The Python validation tree (`validation/`) and
utility scripts (`tools/`) are in good shape and OUT OF SCOPE for this plan except for
read-only reference. The only Python surface this plan may edit is `pipeline/`
(codegen: `build_protocol_data.py`, `build_scene_data.py`, `generate_svg_globals.py`,
`bootstrap_generated.sh`, plus new `build_runtime_bundle.sh` and
`build_protocol_html.py`). Any change beyond `pipeline/` requires user approval.

### Script directory policy

`pipeline/` contains artifact-producing build steps and build-gate scripts. A script
belongs in `pipeline/` only if it is part of the generated-data or browser-output
pipeline AND can be run non-interactively by CI or release tooling.

`tools/` contains developer / operator utilities, manual runners, debug helpers, and
one-off inspection commands. A script stays in `tools/` if its main purpose is to help
a human inspect, walk, debug, or operate the project.

`validation/` contains correctness checks over authored content. Validation scripts may
be used by CI, but they do not emit runtime build artifacts.

`tests/` contains automated test harnesses and assertions.

Decision rule for placing a new script:

```text
Does the script create or update generated artifacts needed by the runtime / build?
  yes -> pipeline/
  no  -> keep asking
Is the script a correctness gate over content?
  yes -> validation/
Is the script an automated assertion harness?
  yes -> tests/
Is the script mainly for human inspection, debugging, or manual walkthrough?
  yes -> tools/
```

Under this rule, `tools/run_protocol_walkthrough.py` stays in `tools/`. Plan's new
scripts (`build_runtime_bundle.sh`, `build_protocol_html.py`) belong in `pipeline/`
because both emit build artifacts (`dist/runtime.bundle.js`, `dist/<protocol>.html`)
and are CI-runnable non-interactively.

Naming hint for ambiguous cases: rename rather than move. A `tools/` script whose
name reads pipeline-like should be prefixed `manual_`, `inspect_`, or `debug_`
(e.g., `tools/manual_protocol_walkthrough.py`).

**YAML is the source of truth; TypeScript is the presentation layer.** Content YAML
under `content/` defines the protocol, scene, object state, materials, interactions,
validators, and scene operations. TypeScript under `src/scene_runtime/` loads that
authored truth, presents it in the browser, captures student gestures, and applies only
the state changes declared by YAML. If runtime behavior and YAML disagree, YAML wins:
fix the presenter or the generated-data bridge, not the YAML contract.

The runtime never carries its own copy of authoritative state; the runtime holds a
`RuntimeWorld` materialized from YAML on load and mutates it only through declared
`scene_operation` primitives that originate from YAML interaction responses.

**Prototype-only TypeScript fields are forbidden.** If a field is not in generated data
from YAML, it cannot appear in runtime contract types except inside an explicitly named
adapter-internal render-state structure (e.g., per-frame layout cache). Adapter-internal
render state never escapes its adapter and never feeds back into protocol meaning.

This plan replaces a paused spine refactor that was the user's prior architecture and was
abandoned mid-flight. The trade-off the plan accepts is to treat the existing `src/` tree
(`init.ts`, `game_state.ts`, `ui_rendering.ts`, `layout_engine.ts`, `svg_assets.ts`, and
the frozen `src/scenes/` adapters) as evidence of working primitives rather than as a
foundation to build on directly. The plan mines those files for capabilities (capture-phase
click dispatch, layout-engine row / zone placement, SVG color-patch and overlay handling,
modal / MCQ rendering, timed-wait choreography, scene-change transitions) and rebuilds
them under `src/scene_runtime/` against the closed vocabulary. The rejected alternative is
a file-by-file rehabilitation of the existing `src/` tree, which would keep the
pre-vocabulary contract alive in code while content evolves under the new one and produce
the exact drift PRIMARY_CONTRACT item 1 forbids.

This plan further accepts a **vertical-slice-first** ordering over a layered-architecture
rollout. A thin slice that puts one object on screen and updates its state on one click
lands before the full layout module, the full chrome surface, or any walker work. The
rejected alternative is to land contract, loader, render core, dispatch, layout, chrome,
and HTML builder horizontally before any visible proof; that ordering is exactly where
large TypeScript activations get stuck.

Per `docs/REPO_STYLE.md`, this plan leans on **Fix the design, not the symptom** when
oversights surface during browser wiring (renderer-gap or content-gap fixes follow the
triage; never patch the walker around a missing affordance) and on **Long-term over
short-term** when choosing to rebuild the runtime against the closed vocabulary rather
than carry the legacy contract forward.

## Subagent operating rules

Every subagent brief for this plan MUST include these rules verbatim.

### Runtime constitution

- YAML is the source of truth; TypeScript is the presentation layer.
- TypeScript may load, validate at runtime, render, dispatch, animate, and report.
- TypeScript must not invent protocol meaning, add implicit protocol state, or add
  runtime-only vocabulary.
- If runtime behavior and YAML disagree, fix the generated-data bridge or renderer.
  Do not rewrite YAML to satisfy a TypeScript shortcut unless the issue is classified
  as a content gap.
- Prototype-only TypeScript fields are forbidden. Any runtime contract field must come
  from generated YAML data or be explicitly adapter-internal render state.
- Adapter-internal render state must never feed back into protocol logic.

### No-hack rules

Subagents must not:

- add fallback defaults for missing YAML fields;
- use `||`, `??`, or `.get(..., default)` style behavior to hide missing required data;
- catch broad errors to keep the runtime moving;
- add per-protocol branches, per-step branches, or protocol-name switches;
- add new gestures, validators, scene operations, schema fields, or target syntaxes;
- import legacy `src/*.ts` files into `src/scene_runtime/`;
- modify `src/scenes/`;
- commit `dist/`, `test-results/`, screenshots, or generated browser output;
- change YAML schema or protocol structure during M0-M5;
- "just make the walker pass" by skipping hidden or missing affordances.

### Required failure behavior

When blocked, classify the failure before fixing:

- **Renderer gap**: YAML and spec are adequate; TypeScript presentation is missing
  support. Fix `src/scene_runtime/`.
- **Content gap**: YAML can express the behavior, but the protocol authored it
  incorrectly. Fix `content/`.
- **Generated-data gap**: YAML is correct, but generated TS data lacks required
  fields. Fix the Python builder under `pipeline/`.
- **Spec gap**: YAML cannot express the needed browser-visible behavior. Stop the
  affected WP, write a `docs/TODO.md` entry with a one-paragraph proposal, and the
  manager may continue unrelated lanes.

No subagent may silently convert a spec gap into a renderer workaround. No subagent
decides on its own to continue other lanes; only the manager re-dispatches.

### Patch discipline

Each subagent owns one atomic work package only. A patch must have:

- one clear outcome;
- one verification command set;
- no unrelated cleanup;
- a `docs/CHANGELOG.md` entry;
- no broad refactor outside its touch points.

If the obvious follow-on is inside the same work package, finish it. If the follow-on
changes scope, stop and report.

## Reviewer rejection criteria

A reviewer MUST reject a patch if it contains any of the following:

- runtime fields not traceable to generated YAML data;
- fallback defaults for required YAML fields;
- protocol-name, step-name, or target-name special cases;
- walker code that skips, retries, or branches around missing UI affordances;
- imports from legacy `src/*.ts` into `src/scene_runtime/`;
- edits to frozen `src/scenes/`;
- new vocabulary not documented in `docs/specs/`;
- generated outputs staged for commit (`dist/`, `test-results/`, screenshots);
- TypeScript state that changes protocol meaning outside declared `scene_operation`
  handling;
- vague TODOs without owner, location, and blocking status;
- any pattern in `## Tactical drift enforcement / ## Forbidden-pattern catalog`.

## Required subagent report format

Each subagent report must include:

- Work package:
- Files changed:
- Runtime-gap classification, if any:
- YAML / spec source consulted:
- New runtime fields added, with YAML / generated-data source:
- Verification commands run (quote the final success line or the relevant pass summary):
- Known limitations:
- Confirmation: no legacy imports, no per-protocol branches, no generated outputs
  committed.
- Philosophy invoked (one of the five from `docs/REPO_STYLE.md`, by name).
- Forbidden-pattern catalog items considered and rejected (one line each).

## Manager dispatch template

The manager uses this template verbatim for every WP. Reviewer rejects briefs that
drop any slot.

```
You are working on WP-<name> only.

Read first:
- docs/REPO_STYLE.md
- docs/PRIMARY_CONTRACT.md
- docs/PRIMARY_SPEC.md
- this plan's `## Design philosophy`
- this plan's `## Subagent operating rules`
- this plan's `## Reviewer rejection criteria`
- this plan's `## Required subagent report format`
- this plan's `## Tactical drift enforcement (supplements ## Subagent operating rules)` (forbidden-pattern catalog)
- <specific specs for this WP from docs/specs/>
- docs/PYTHON_STYLE.md OR docs/TYPESCRIPT_STYLE.md per file kind

Hard constraints:
- YAML is the source of truth; TypeScript is the presentation layer.
- Do not add runtime-only vocabulary.
- Do not add fallbacks for required generated data.
- Do not touch files outside the listed touch points.
- Do not edit legacy `src/*.ts` or frozen `src/scenes/`.
- Do not commit generated outputs.

Deliver:
- <exact files / behavior per the WP Acceptance criteria>
- <exact tests>
- `docs/CHANGELOG.md` entry

Stop only for:
- spec gap;
- missing information not inferable from repo / spec;
- failing gate that requires scope change.

Report in the format defined by `## Required subagent report format`.
```

## Coder enablement (counterweight to the restriction sections)

The sections above tell coders what NOT to do. This section tells them what TO do and
what support they have. The goal is velocity inside the guardrails, not paralysis. A
coder who feels hand-tied will either grind to a halt or hack around the rules; both
outcomes destroy the plan. The structures below exist so a coder can ship a patch in
hours, not days, while staying inside the constitution.

### Pre-approved patterns library

The mirror of `## Forbidden-pattern catalog`. These patterns are pre-approved; coders
copy them without asking. Reviewer endorses without debate. The library starts small
and grows from worked exemplars (next subsection).

| Need                                              | Pre-approved pattern                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Missing required YAML field                       | `throw new Error(\`missing required field <path> on <object>: <id>\`);` -- loud, named, no fallback.                           |
| Optional YAML field                               | Destructure with explicit `undefined` typing; never `??`. Caller branches on `=== undefined`.                                  |
| Discriminated union dispatch on `scene_operation` | `switch (op.type) { case 'ObjectStateChange': ... }` with exhaustive `default: assertNever(op);`                               |
| Brand / opaque type for semantic id               | One-liner brand: `type StepName = string & { readonly __brand: 'StepName' };` + a `StepName(raw)` constructor that validates.  |
| Immutable runtime-world update                    | `return { ...world, scenes: { ...world.scenes, [id]: nextScene } };` -- spread at the changed branch only; no `Object.assign`. |
| DOM target id encoding                            | `data-target-id="<object_id>"` and `data-target-id="<object_id>.<subpart_id>"`. No other encoding.                             |
| Walker selector                                   | `await page.locator('[data-target-id="..."][data-gesture="..."]').click();` Same shape every WP.                               |
| Per-frame layout cache                            | Adapter-internal `Map<ObjectId, ComputedBox>` invalidated on each `requestRedraw`. Never escapes the adapter.                  |
| Test fixture path                                 | Hand-authored under `tests/playwright/fixtures/` or `tests/_fixtures/`. Generated under `tests/_generated/` (gitignored).      |

A coder who needs a pattern not in this table either uses an existing exemplar (next
subsection) or asks the manager to add the pattern + worked example. New patterns
land in this table as they emerge; the table is the cumulative cookbook.

### Worked exemplar per WP kind

The first WP of each kind ships with extra reviewer attention precisely so it becomes
the exemplar for subsequent WPs of the same kind. Once shipped, the file path becomes
the canonical reference; later WPs cite "copy the shape of `<file>`" instead of
re-deriving from rules.

| WP kind                       | First WP (exemplar)                                    | Subsequent WPs cite                                                                      |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Contract realignment          | WP-CONTRACT-1                                          | "Brand-type + discriminated-union shape per `src/scene_runtime/contract.ts`."            |
| Loader                        | WP-LOADER-1                                            | "Missing-field error pattern + real-generated-data test shape per `loader/protocol.ts`." |
| Scene-operation primitive     | WP-RENDER-1 first primitive (`applyObjectStateChange`) | "Pure-function + immutable-update shape per `render/apply.ts`."                          |
| Dispatch resolver             | WP-DISPATCH-1                                          | "Capture-phase listener + ambiguity-rejection shape per `dispatch/click.ts`."            |
| Render adapter (first one)    | WP-WELLPLATE-ADAPTER-1A                                | "Static-cell render + `data-target-id` shape per `adapters/well_plate/render.ts`."       |
| Render adapter (groups)       | WP-WELLPLATE-ADAPTER-1B                                | "Group-container wrapping per subpart-group declaration."                                |
| Render adapter (visual state) | WP-WELLPLATE-ADAPTER-1C                                | "Per-cell `visual_states` resolution from `material_name` + `material_volume`."          |
| Chrome surface                | WP-CHROME-MINIMAL-1                                    | "Scene-frame mount + `data-testid` shape per `chrome/scene_frame.ts`."                   |
| Walker scale lane             | WP-SCALE-A-1                                           | "Per-protocol invocation + screenshot capture shape per the first scale lane."           |

The exemplar WP's handoff names the shape worth copying. Subsequent WPs of the same
kind get a shorter brief; the bulk is "copy `<file>`, change `<X>`, keep `<Y>`."

### Stuck protocol (concrete escalation triggers)

"Stop only at a real blocker" leaves too much room for grinding. Concrete triggers:

- **30 minutes of investigation without convergence on a single approach** -- post a
  question to manager with: what was tried, what was ruled out, what the gap is. Do
  not start a fourth approach.
- **A second `tsc` error after fixing the first** that points to a contract surface
  the WP does not own -- BLOCKED, escalate; the contract WP may need a follow-up.
- **A Playwright test that intermittently passes** -- never retry to flake-around;
  BLOCKED, escalate. Intermittent passes are usually real-time vs test-clock bugs
  or DOM-readiness ordering.
- **An audit shows two equally valid approaches** -- record both in the handoff with
  a one-line trade-off each; manager picks. Do not flip a coin.
- **Verification command output is ambiguous** -- BLOCKED with the output verbatim;
  manager re-dispatches with clarification or extends acceptance criteria.

### Reading-list trim per WP

Constitutional + tactical sections + repo style docs = ~3000 lines. No coder reads
all of it per WP. The manager's dispatch brief names the EXACT sections each WP
needs. Suggested per-kind trim:

- **Contract WPs**: `docs/REPO_STYLE.md` core philosophies (head), this plan's
  Design philosophy + Subagent operating rules + Reviewer rejection criteria +
  `docs/specs/PROTOCOL_VOCABULARY.md` + `PROTOCOL_YAML_FORMAT.md`. Skip layout
  and material specs.
- **Loader WPs**: above + `OBJECT_VOCABULARY.md` + `SCENE_VOCABULARY.md`. Skip
  protocol-step semantics doc.
- **Adapter WPs**: above + `LAYOUT_ENGINE.md` + `MATERIAL_CONVENTION.md` +
  `SVG_PIPELINE.md`. Skip protocol vocabulary.
- **Chrome WPs**: this plan + `docs/TYPESCRIPT_STYLE.md` +
  `references/ui_ux_review.md` from the `ui-ux-engineer` skill. Skip object specs.
- **Walker WPs**: this plan + `docs/E2E_TESTS.md` + `docs/PLAYWRIGHT_USAGE.md` +
  `docs/specs/WALKTHROUGH_GUIDE.md`.

A coder who feels the brief omits a needed doc asks the manager to extend the
reading list, then proceeds.

### Sandbox convention

Coders prototype freely under `_explore/` (gitignored) and underscore-prefixed
files (`_temp.ts`, `_scratch.mjs`). Per `docs/REPO_STYLE.md` repo-wide and per
`docs/CLAUDE_HOOK_USAGE_GUIDE.md`, underscore-prefixed files are safe to delete.
The WP closes only after the sandbox is cleaned up and the deliverable lives at
its committed path. The reviewer rejects PRs that leave `_explore/` or `_temp.*`
under tracked paths.

### Test scaffolding library

Repeated test setup belongs in shared helpers, not copied per test. The first
visible-slice WP (WP-VISIBLE-SLICE-1) ships `tests/playwright/helpers/`:

- `mountFixture(page, fixtureName)` -- loads a smoke or generated fixture HTML.
- `clickTarget(page, targetId, gesture)` -- the canonical walker click.
- `expectVisibleDelta(page, beforeBox, afterBox)` -- asserts DOM / attribute change.
- `captureBeforeAfter(page, label)` -- saves into `test-results/<label>/`.
- `withTestClock(page, fn)` -- installs test clock + runs `fn` + uninstalls.

Later test WPs use these helpers; reviewer rejects PRs that re-implement them.

### Done-early rule (counterweight to "finish the obvious")

"Finish the obvious" tells coders to keep going past substep boundaries. Coders
sometimes misread this as license to widen scope. The counterweight: **if a WP's
acceptance criteria are all met and no obvious follow-on is INSIDE THE WP, STOP.**
Do not add adjacent features, do not refactor neighbors, do not preemptively
solve M+1's problem. Scope creep is rejected as hard as missed acceptance.

The decision rule:

- Acceptance criteria met + obvious follow-on inside WP touch points -> finish it.
- Acceptance criteria met + obvious follow-on outside WP touch points -> STOP +
  log a new TODO entry naming the follow-on and the suggested next WP.
- Acceptance criteria met + no obvious follow-on -> STOP + ship.

### Decision log per WP (one entry, optional)

The handoff template includes an optional "Decisions" line. A coder who made a
non-obvious choice (picked `Map<X, Y>` over `Record<X, Y>`, used `Promise.all`
vs sequential, structured the brand constructor a particular way) records one
line per decision. The reviewer reads decisions before re-deriving the trade-off.
Future WPs of the same kind inherit the reasoning. Optional, not mandatory.

### Reviewer endorsements (positive findings)

The reviewer's job is not only to reject. When a patch lands a particularly clean
or reusable pattern, the reviewer's report includes one line under "Endorsements"
naming the pattern + file + suggested propagation. The manager appends endorsed
patterns to `## Pre-approved patterns library` above. The library grows from
endorsements, not from up-front guessing.

### Lessons-learned cumulative log

After each WP closes, the coder appends ONE LINE to
`docs/active_plans/scene_runtime_lessons.md` (created at M0 close): "WP-<id>:
<one-line lesson worth carrying forward>." Examples: "`visual_states` on
`well_plate_96` need per-cell re-render keyed on `material_volume`, not just
`material_name`." "Test clock must be installed BEFORE `mountFixture` or
`TimedWait` fires real-time." "esbuild `--watch` mode breaks `file://` loading;
use one-shot build."

The lessons file is short, append-only, and grep-friendly. Future WPs grep it
before starting. It is the single most valuable artifact for the next plan in
the same family.

### Manager checkpoint cadence

The manager reads diffs at WP completion, not mid-WP. Coders work uninterrupted
during a WP unless THEY request a checkpoint ("am I on the right track for
acceptance criterion 3?"). Manager-initiated mid-WP checkpoints are reserved
for: drift signals on `main` (failed gate elsewhere), upstream-WP fix that
changes a downstream WP's contract, or user-initiated re-prioritization.

### Time budget per WP (advisory, not enforced)

Rough sizing for the manager when deciding whether to split a WP. Not a deadline
for the coder.

| WP kind                                 | Advisory budget |
| --------------------------------------- | --------------- |
| Audit / spec-index                      | 1-2 hours       |
| Contract realignment                    | 2-4 hours each  |
| Loader (one slice)                      | 2-3 hours       |
| Render primitive                        | 1-2 hours each  |
| Dispatch (one gesture)                  | 1-2 hours       |
| Layout integrate                        | 3-5 hours       |
| Adapter (first one)                     | 4-8 hours       |
| Adapter (subsequent)                    | 2-4 hours each  |
| Chrome surface (one)                    | 2-3 hours       |
| HTML builder                            | 2-3 hours       |
| Walker engine                           | 3-5 hours       |
| Walker scale lane (first three)         | 2-3 hours each  |
| Walker scale lane (after stabilization) | 1-2 hours each  |
| Content / renderer fix                  | 1-3 hours each  |

A WP that runs 2x its advisory budget is a signal - coder reports BLOCKED for
re-scoping, manager splits the WP. Not a punitive deadline; an early-warning
trigger.

## Safe escape hatch

The rules are strict, but not meant to block real implementation work. If a coder
finds that the clean implementation requires a small deviation from a rule, the
coder must stop and report a proposed exception before editing.

An exception request must include:

- the rule that would be violated;
- why the clean path cannot satisfy the WP acceptance criteria;
- the smallest possible exception;
- why the exception does not create new protocol meaning;
- how the exception will be tested;
- whether the exception should become a TODO, a spec amendment, or a follow-up WP.

The manager, not the coder, decides whether to continue, re-scope the WP, or
escalate to the user. No exception may be merged silently.

## Allowed implementation flexibility

Coders may choose internal function names, file-local helper structure, DOM
structure, CSS class names, and adapter-internal render caches as long as those
choices do not add protocol meaning or new authoring vocabulary.

Coders may add small pure helper functions when they reduce duplication or make
tests clearer.

Coders may add narrow runtime assertions that fail loudly on invalid generated
data.

Coders may improve error messages, test fixtures, and local developer ergonomics
inside the WP scope.

Coders may refactor within listed touch points if the refactor is necessary to
satisfy the WP and does not broaden behavior.

## Default-value rule

Fallback defaults are forbidden for required YAML / generated-data fields.

Fallbacks are allowed only for presentation-only concerns that do not change
protocol meaning, such as a missing optional CSS class, a default viewport size,
or an empty non-authoritative render cache.

Allowed fallback example:

- use a default CSS class for an adapter wrapper if no optional class is provided.

Forbidden fallback examples:

- default a missing `entry_step` to the first step.
- default a missing material color to water / transparent.
- default an unknown target to the current object.

## Error handling rule

Do not catch errors to continue a protocol after invalid YAML, missing generated
data, or missing visual affordances.

A top-level UI error boundary is allowed if it stops the protocol, displays a
loud developer-visible error, and preserves the original error message. See
`## Top-level UI error boundary exception` above for the single permitted
boundary at runtime entry.

Local `try` / `catch` is allowed only around browser APIs that can fail for
environmental reasons, such as screenshot capture or optional storage, and only
if failure does not change protocol state.

## Definition of done for every WP

A WP is done only when:

- the implementation satisfies every listed acceptance criterion;
- the smallest relevant test proves the behavior;
- the full required gate set passes;
- no forbidden pattern appears in the diff;
- generated outputs are not staged;
- the handoff explains any limitation in plain language;
- the reviewer can trace new runtime behavior back to YAML, generated data, or
  a spec.

## Reviewer three-question test

For every runtime patch, the reviewer asks:

1. Where is the YAML or generated-data source for this behavior?
2. What fails loudly if that source is missing or invalid?
3. What visible browser behavior proves this works?

If any answer is unclear, the patch is not ready.

## WP split trigger

A WP must be split before implementation if it requires more than one independently
testable behavior change.

A WP must be split during implementation if:

- the first testable behavior is complete but the next behavior needs different
  files or a different failure mode;
- a fix requires touching files outside the WP touch points;
- the patch would mix runtime contract, renderer behavior, and browser UI behavior;
- the handoff would need more than one primary verification story.

The manager performs the split. The coder does not silently broaden the WP. When the
coder hits a split trigger, they stop and report; the manager re-dispatches as
two (or more) fresh WPs.

## TODO discipline

A TODO is acceptable only if it includes owner, location, blocking status, and a
concrete next action.

Allowed:

```
TODO(runtime, non-blocking): add per-volume liquid height after Pilot 1; tracked
under WS-CONTENT.
```

Forbidden:

```
TODO: improve this later.
```

## Scope

- Audit generated runtime data against the closed vocabulary; fix Python builders if
  required so generated data carries every field the runtime needs (including resolved
  scene inheritance).
- Realign `src/scene_runtime/contract.ts` and `src/scene_runtime/types.ts` to the closed
  protocol / scene / object vocabulary documented under `docs/specs/`.
- Land one visible runtime slice: one scene, one object, one click, one
  `ObjectStateChange`, one visible DOM delta, one Playwright proof.
- Implement a scene-runtime loader, render core (with deterministic test clock), and
  dispatch resolver under `src/scene_runtime/`.
- Provide a layout-engine audit covering the `blocks` family, per-cell fallback, label
  collision under the new geometry, and `visual_states`-driven re-render.
- Provide a minimal chrome (scene viewport, prompt panel, next / feedback area) sufficient
  for one protocol to load and advance.
- Bundle TypeScript with esbuild; emit one shared runtime bundle plus per-protocol HTML
  shells that load per-protocol generated data.
- Build per-mini-protocol HTML output under `dist/<protocol_name>.html` (gitignored).
- Build a generator-driven Playwright walker under `tests/playwright/walker/` with one
  walker engine and zero per-protocol branches.
- Walk every mini-protocol in a real browser and resolve every surfaced oversight under
  the three-way triage.

## Non-goals

- Do not return to a monolithic single-HTML build; PRIMARY_CONTRACT item 2 forbids it.
- Do not add new `scene_operation` primitives, new `gesture` values, new validator
  presets, new `state_field` primitive types, or any other authoring vocabulary
  expansion. The vocabulary is closed; runtime work happens inside it. Spec gaps surfaced
  by the runtime triage pause for user review; they do not become runtime patches.
- Do not rehydrate the frozen `src/scenes/` adapters in place; the freeze stands. New
  scene-runtime code lands under `src/scene_runtime/`.
- Do not gate delivery on mobile viewport polish. Mobile remains a tier-2 concern; the
  scene-frame container declares a responsive viewport shell, mobile breakpoints are
  noted in `docs/TODO.md`, and a focused mobile plan is deferred.
- Do not patch the walker with per-protocol branches; the walker stays generic.
  `tests/test_walker_no_step_branches.py` already exists and remains the gate.
- Do not implement scene-inheritance resolution in TypeScript. The Python builder owns
  inheritance; the runtime consumes fully-resolved scenes. If the builder does not
  resolve today, M0.5 fixes the builder, not the runtime.
- Do not implement all five gestures up-front. Pilot 0 requires `click` only; pilot 1
  requires `click` + `adjust`. The remaining gestures (`select`, `type`, `drag`) land as
  per-protocol needs surface during M6, gated by content actually exercising them.
- Do not commit `dist/` or `test-results/`. Both stay gitignored. Only the builders,
  walker engine, and curated reference baselines (if any) are committed.
- Do not commit. Humans commit; this plan prepares and verifies.
- Do not work on feature branches. All work lands on `main`. Stop-on-failure rule: if any
  integration gate fails on `main`, do not stack additional runtime patches until the
  failure is resolved.
- Do not edit `src/` legacy files (`init.ts`, `game_state.ts`, `ui_rendering.ts`,
  `protocol_ui.ts`, `interaction_resolver.ts`, `step_dispatch.ts`, `svg_assets.ts`,
  `svg_overlays.ts`, `svg_recipes.ts`, etc.) other than to mine them for behavior and
  re-implement under `src/scene_runtime/`. The legacy tree retires in a later plan.
- Do not change YAML schema or content `protocol.yaml` structure during M0-M5.
  Content-side oversights raised during M5-M6 walk-throughs land as separate
  per-protocol patches inside this plan's WS-CONTENT lane.
- Do not build a polished launcher or welcome screen as part of pilot delivery. Pilot
  loads via direct URL to `dist/<pilot>.html`. Launcher / welcome polish is a deferred
  Tier-2 lane.

## Current state summary

YAML backbone (green):

- 12 mini-protocols pass `validation/validate.py` (aggregate yaml + stepper + svg)
  and `validation/manual/protocol_manual.py --all` on `main`. Sequence runners
  (`cell_culture_full`, `routine_passage`, `sdspage_full`, etc.) may also pass
  validation, but this runtime activation plan targets the 12 student-facing
  mini-protocols only. Runner browser UI is out of scope and lands in a separate
  plan.
- `content/objects/plate/well_plate_96.yaml` declares `row_A..H`, `col_1..12`,
  `all_wells`, and the new `blocks` family.
- Per-protocol `materials.yaml` registries declare every named material.

Generated data (unknown):

- `generated/*.ts` exists for at least protocol, scene, inventory, and SVG; whether
  separate object data and material data files exist (or whether they are bundled
  inside scene / protocol data) is not currently verified.
  WP-GENERATED-DATA-1 identifies the exact generated files that exist today, the
  exact files that must exist for the runtime, and the interchange shape (ESM
  literal vs JSON sidecar vs hybrid).
- It is not currently verified that existing generated files carry every field the
  closed-vocabulary runtime needs. Whether scene inheritance is resolved Python-side
  is not currently verified. WP-GENERATED-DATA-1 closes all three gaps.

Runtime tree (mixed):

- `src/scene_runtime/contract.ts` (173 lines) types the **old** vocabulary
  (`completionPath`, `interactionSequence`, `plateTargets`, `tubeTargets`,
  `ProtocolEntry { scene, step }`, `requiredItems`, `errorHints`). It must be rewritten
  to match `docs/specs/PROTOCOL_VOCABULARY.md`.
- `src/scene_runtime/types.ts` (81 lines) and the empty-shell directories `adapters/`,
  `dispatch/`, `highlight/`, `layout/`, `liquid/` are scaffolding only.
- `src/scenes/` is FROZEN (legacy banner + `tests/test_scenes_freeze_baseline.py` +
  `tests/test_scenes_legacy_banner.py`). It must not be edited.
- `src/layout_engine.ts` (778 lines) is the legacy layout engine. The audit decides
  whether to mine it under `src/scene_runtime/layout/` or rebuild from
  `docs/specs/LAYOUT_ENGINE.md`.
- `src/init.ts`, `src/game_state.ts`, `src/ui_rendering.ts`, `src/protocol_ui.ts`,
  `src/interaction_resolver.ts`, `src/step_dispatch.ts`, `src/svg_assets.ts`,
  `src/svg_overlays.ts`, `src/svg_recipes.ts`, `src/svg_color_patch.ts` are legacy.
  Mine behavior; do not link into the new runtime path.

Tooling (green):

- `pipeline/build_protocol_data.py` and `pipeline/build_scene_data.py` emit `generated/*.ts`.
- `tools/build_test_fixture.sh` and `tests/_compile_for_test.mjs` already use esbuild
  (`--bundle --platform=node`). esbuild is the chosen bundler for production runtime
  output too; no new bundler dependency is introduced.
- Walker scaffolding under `tests/playwright/walker/` carries the generic
  no-per-step-branch invariant (`tests/test_walker_no_step_branches.py`). The walker
  engine predates the vocabulary rewrite and must be re-grounded on the realigned
  contract.

Docs (current):

- `docs/specs/PROTOCOL_VOCABULARY.md`, `PROTOCOL_YAML_FORMAT.md`, `PROTOCOL_STEPS.md`,
  `SCENE_VOCABULARY.md`, `SCENE_YAML_FORMAT.md`, `SCENE_ARCHITECTURE.md`,
  `OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`, `LAYOUT_ENGINE.md`,
  `MATERIAL_CONVENTION.md`, `SVG_PIPELINE.md`, `WALKTHROUGH_GUIDE.md` are the closed-
  vocabulary sources of truth.

## Architecture boundaries and ownership

The plan respects the three-vocabulary boundary documented in the specs: protocol names
what happens; object names what a thing is and how its state appears; scene names where
things appear and how the space is arranged. Runtime modules sit on the corresponding
boundary and do not cross. The runtime tree under `src/scene_runtime/` becomes the
authoritative implementation surface.

Component map:

- `src/scene_runtime/contract.ts` -- runtime type contract for the closed protocol
  vocabulary; consumed by every other runtime module.
- `src/scene_runtime/types.ts` -- runtime types for scene and object models.
- `src/scene_runtime/loader/` (new) -- loads `generated/protocol_data.ts`,
  `generated/scene_data.ts`, object data, and material data; cross-references resolve;
  consumes fully-resolved scenes (no inheritance work TS-side).
- `src/scene_runtime/render/` (new) -- renderer core; resolves object `visual_states`,
  applies the five `scene_operation` primitives, requests redraw, owns the clock
  abstraction.
- `src/scene_runtime/render/clock.ts` (new) -- production clock (real time) and test
  clock (advance-on-command); injected into `TimedWait` handling.
- `src/scene_runtime/dispatch/` (existing skeleton) -- DOM event capture, gesture
  extraction, target resolution to a semantic object id.
- `src/scene_runtime/layout/` (existing skeleton) -- layout module bound to the closed
  object vocabulary.
- `src/scene_runtime/highlight/` (existing skeleton) -- target-highlight overlay driven
  by the current `interaction.target`.
- `src/scene_runtime/liquid/` (existing skeleton) -- liquid render rules driven by
  `MATERIAL_CONVENTION.md`.
- `src/scene_runtime/adapters/` (existing skeleton) -- per-object render adapters.
- `src/scene_runtime/chrome/` (new) -- minimal chrome: scene viewport, prompt panel,
  next / feedback area. Welcome / launcher / polished MCQ are deferred Tier-2.
- `src/scene_runtime/bundle/entry.ts` (new) -- esbuild entry point that exports the
  initializer the per-protocol HTML shells call.
- `pipeline/build_runtime_bundle.sh` (new) -- esbuild invocation producing one shared
  `dist/runtime.bundle.js` plus source map.
- `pipeline/build_protocol_html.py` (new) -- per-mini-protocol HTML shell generator;
  each shell references the shared runtime bundle and inlines (or sibling-loads) the
  per-protocol generated data.
- `tests/playwright/walker/` (existing scaffold) -- generic walker engine driven by the
  realigned contract; one walker, no per-protocol branches.

### Bundling decision

esbuild is the chosen bundler. Rationale:

- The repo already uses esbuild via `tools/build_test_fixture.sh` (test utility, stays
  in `tools/`) and
  `tests/_compile_for_test.mjs` (`--bundle --platform=node`).
- No new tool dependency; `package.json` already pulls esbuild in.
- esbuild emits one shared `dist/runtime.bundle.js` plus per-protocol data files that
  the HTML shells reference. This avoids per-HTML bundle bloat (one shared bundle, many
  HTML shells) and avoids the Vite / Webpack tax for a static-output simulator.

Vite, Webpack, and bare `tsc` + manual script tags are rejected: Vite would add a dev
server abstraction the simulator does not need; Webpack adds tool surface for no win
over esbuild; bare `tsc` does not bundle and would push the bundling burden onto each
HTML shell.

### Test clock

`TimedWait` choreography uses a clock abstraction from `render/clock.ts`. Production runs
inject a real-time clock that calls `setTimeout` against `duration_min`. Playwright runs
inject a test clock that advances on explicit Playwright command. The walker advances the
clock; it does not wait real time. This keeps the walker fast and deterministic and
prevents M5 / M6 flake from real timers.

### Content source layout (per `content/README.md`)

Authored YAML lives under three sibling roots; nothing under `content/` is generated:

- `content/protocols/<protocol_name>/` -- `protocol.yaml` required; optional
  `materials.yaml`; optional `scenes/<scene_name>.yaml` for protocol-local scene
  overrides.
- `content/base_scenes/<scene_name>.yaml` -- shared scene definitions reused across
  protocols. A scene used by 2+ protocols lives here; a one-off scene stays under the
  owning protocol's `scenes/` subfolder.
- `content/objects/<kind>/<object_name>.yaml` -- object definitions grouped by `kind`
  taxonomy: `bottle`, `decoration`, `equipment`, `flask`, `pipette`, `plate`, `rack`,
  `waste`. New files auto-registered; new `kind` enum values require contract approval.

Three scene-resolution sources collapse Python-side before the runtime sees anything:
`content/base_scenes/<name>.yaml` (base layer) + `content/protocols/<P>/scenes/<name>.yaml`
(per-protocol overrides) + the `extends` / `add_placements` / `remove_placements` /
`deactivate_placements` / `reposition_placements` keys WITHIN those files. The
generated `scene_data.ts` entry for any scene id is the fully resolved post-merge
result. WP-GENERATED-DATA-1 audits all three sources, not just the inheritance keys.

### Generated-data boundary

The runtime never reaches into raw YAML. The Python builders (`pipeline/build_protocol_data.py`,
`pipeline/build_scene_data.py`, `pipeline/generate_svg_globals.py`) emit fully-resolved
typed data under `generated/`. Scene inheritance + base-scene merging + protocol-local
scene overrides are ALL resolved Python-side; the runtime sees one resolved scene per
scene id, indistinguishable by source. If WP-GENERATED-DATA-1 finds the builders do
not resolve any of these layers, the builders are patched, not the runtime.

### Fixture discipline

Tests may use hand-authored fixtures only for Pilot 0 and negative unit tests. Any
loader, contract, HTML builder, or walker test that claims runtime readiness must
exercise real generated data from `generated/`. Hand-authored fixtures cannot
substitute for generated-data compatibility.

Pilot 0 (WP-VISIBLE-SLICE-1) may use a synthetic smoke fixture because its purpose is
to prove the visible runtime path, not protocol compatibility. Pilot 1 and all later
tests must use generated data emitted from real YAML by the Python builders.

Specifically: `tests/test_loader_world.mjs` MUST load at least one real protocol from
`generated/protocol_data.ts` (not a hand-authored fixture). It is the first proof that
generated data and the runtime contract actually agree.

### Visual-state no-approximation rule

If a `visual_state` declared in object YAML cannot be classified into one mechanism
supported by the runtime (`svg_swap`, `css_class`, `attribute_patch`), the runtime
MUST NOT approximate it. The mechanism is marked `unsupported` in
`docs/active_plans/generated_data_audit.md`, the affected object is excluded from
Pilot 0, and a `docs/TODO.md` entry surfaces under spec-gap or renderer-gap triage as
appropriate. Approximation is a hard reject.

### Top-level UI error boundary exception

The no-try / no-catch rules in `## Subagent operating rules / No-hack rules` apply to
data flow (loaders, dispatch, render). They do NOT forbid a single top-level UI error
boundary at the runtime entry point (`bundle/entry.ts`) whose sole job is to render a
visible failure message when the runtime fails to initialize. The exception:

- The error boundary REPORTS LOUDLY (visible DOM message + console.error).
- The error boundary does NOT continue the protocol; the runtime halts.
- The error boundary does NOT swallow the error; it re-throws or logs the full stack.
- Exactly one error boundary exists, at the runtime entry. No nested boundaries
  inside loaders, dispatch, or render.

Any other `try` / `catch` requires the reviewer's explicit approval and a one-line
comment naming the boundary it crosses.

### Three-way runtime-gap triage

When any walker run, layout render, or chrome interaction fails to advance, the failure
is classified before fixing:

- **Renderer gap**: the YAML is adequate and the spec covers it, but the renderer does
  not implement that surface yet. Fix lands in `src/scene_runtime/`.
- **Content gap**: the YAML can express what the protocol needs, but this protocol
  authored it poorly (missing target, wrong validator preset, wrong `set_volume`, etc.).
  Fix lands in `content/protocols/<name>/`.
- **Spec gap**: the YAML cannot express the browser-needed affordance without inventing
  new vocabulary. **This pauses the work and surfaces a spec amendment proposal for user
  review.** It does not become an immediate runtime patch.

Every WS-CONTENT and runtime-fix WP cites the triage classification in its commit
message.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream      | Component                                                                                                                                                                                                                                           | Expected patches |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| M0 / WS-AUDIT               | `docs/active_plans/yaml_to_browser_audit.md` + read-only inventory of `src/` salvage                                                                                                                                                                | 1                |
| M0 / WS-SPEC-CONSOLIDATION  | `docs/active_plans/scene_runtime_spec_index.md` (no spec edits)                                                                                                                                                                                     | 1                |
| M0.5 / WS-GENERATED-DATA    | `docs/active_plans/generated_data_audit.md` + builder patches if needed                                                                                                                                                                             | 1 to 3           |
| M1 / WS-CONTRACT            | `src/scene_runtime/contract.ts`, `src/scene_runtime/types.ts`                                                                                                                                                                                       | 1 to 2           |
| M1 / WS-LOADER              | `src/scene_runtime/loader/` (split: 1A protocol, 1B scene+object, 1C material+world)                                                                                                                                                                | 3                |
| M1 / WS-RENDER-CORE         | `src/scene_runtime/render/` (split: 1A state+scene, 1B cursor+layout, 1C TimedWait+clock, 1D request queue)                                                                                                                                         | 4                |
| M1 / WS-DISPATCH            | `src/scene_runtime/dispatch/` (click only)                                                                                                                                                                                                          | 1                |
| M1 / WS-NO-LEGACY-IMPORTS   | `tests/test_scene_runtime_no_legacy_imports.py`                                                                                                                                                                                                     | 1                |
| M1.5 / WS-BASE-SCENE-RENDER | `src/scene_runtime/render/scene.ts`, `tests/playwright/test_base_scene_render.mjs`                                                                                                                                                                  | 1                |
| M1.5 / WS-VISIBLE-SLICE     | `src/scene_runtime/bundle/entry.ts`, `pipeline/build_runtime_bundle.sh`, `tests/playwright/fixtures/_smoke_one_object.html.template`, `tests/playwright/test_visible_slice.mjs` (built `dist/_smoke_one_object.html` is generated-only, gitignored) | 1 to 2           |
| M2 / WS-LAYOUT-AUDIT        | `docs/active_plans/layout_engine_audit.md` (read-only)                                                                                                                                                                                              | 1                |
| M2 / WS-LAYOUT-INTEGRATE    | `src/scene_runtime/layout/`                                                                                                                                                                                                                         | 1                |
| M2 / WS-WELLPLATE-ADAPTER   | `src/scene_runtime/adapters/well_plate/` (split: 1A static cells, 1B group targets, 1C per-cell material visual state)                                                                                                                              | 3                |
| M2 / WS-LIQUID              | `src/scene_runtime/liquid/`, `src/scene_runtime/highlight/`                                                                                                                                                                                         | 1                |
| M3 / WS-CHROME-MINIMAL      | `src/scene_runtime/chrome/` (split: 1A scene-frame+prompt, 1B feedback+next+validator)                                                                                                                                                              | 2                |
| M3 / WS-CHROME-ADJUST       | `src/scene_runtime/dispatch/adjust.ts` + chrome adjust surface                                                                                                                                                                                      | 1                |
| M4 / WS-HTML-BUILDER        | `pipeline/build_protocol_html.py` + `dist/<protocol_name>.html` template + .gitignore                                                                                                                                                               | 1                |
| M4 / WS-PILOT1              | `<PILOT1>` wired end-to-end (default `mtt_solubilization_readout`)                                                                                                                                                                                  | 1 to 2           |
| M5 / WS-WALKER-ENGINE       | `tests/playwright/walker/` engine refresh against realigned contract; clock control                                                                                                                                                                 | 1                |
| M5 / WS-WALKER-PILOT        | walker run on pilot protocol                                                                                                                                                                                                                        | 1                |
| M6 / WS-SCALE-A...K         | remaining 11 mini-protocols, one workstream per protocol initially                                                                                                                                                                                  | 11               |
| M6 / WS-CONTENT             | YAML / renderer fixes surfaced during walk-throughs                                                                                                                                                                                                 | 2 to 4           |
| M6 / WS-GESTURE-EXPAND      | `select` / `type` / `drag` dispatch + chrome surfaces, gated by content need                                                                                                                                                                        | 1 to 3           |
| M-Deferred / WS-LAUNCHER    | welcome screen + mini-protocol launcher (separate plan candidate)                                                                                                                                                                                   | 0 in this plan   |

## Milestone plan

### Milestone 0: Read-only audit and spec consolidation

- Depends on: none.
- Workstreams: WS-AUDIT, WS-SPEC-CONSOLIDATION.
- Entry criteria: `main` at the latest 2026-05-16 commit; YAML gates green.
- Exit criteria:
  - `docs/active_plans/yaml_to_browser_audit.md` lists every `src/` file with a verdict
    (`mine`, `replace`, `archive`) and names the runtime capability it informs.
  - The audit names every existing `src/scene_runtime/` file, its vocabulary alignment,
    and the realignment work needed.
  - `docs/active_plans/scene_runtime_spec_index.md` maps each runtime component to the
    `docs/specs/` source(s) of truth it must conform to.
  - `docs/CHANGELOG.md` entry under today's date.
  - Obvious follow-on: open M0.5 immediately.
- Parallel-plan ready: yes -- max parallel doers: 2.

### Milestone 0.5: Generated-data boundary audit

- Depends on: M0 -- the audit names the runtime components whose data needs verifying.
- Workstreams: WS-GENERATED-DATA.
- Entry criteria: M0 exit met.
- Exit criteria:
  - `docs/active_plans/generated_data_audit.md` lists every field the runtime needs
    (per `contract.ts` realignment design) and asserts whether `generated/*.ts` currently
    carries it.
  - The audit explicitly verifies scene inheritance is resolved Python-side (no
    `extends` / `add_placements` / `remove_placements` / `deactivate_placements` /
    `reposition_placements` in `generated/scene_data.ts`).
  - The audit explicitly verifies materials are emitted to `generated/` (not just
    referenced by name).
  - The audit explicitly verifies `state_fields` defaults, `visual_states` formula
    tokens, `subpart_groups` (rows, cols, all_wells, blocks), and `capabilities` for
    every object referenced by any protocol.
  - Any generated-data gap is fixed in the corresponding Python builder under
    `pipeline/`; YAML gates re-run; `pytest tests/ -q` exits 0. M0.5 does NOT change
    YAML schema or authored content unless the audit proves the issue is a
    pre-existing content defect that already violates current specs; such a case
    splits into a separate content-gap WP rather than being folded into a builder
    patch.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open M1 immediately; the generated-data audit is the entry
    criterion for M1 loader work.
- Parallel-plan ready: yes -- max parallel doers: 2 (one auditor + one builder fixer once
  gaps are listed).

### Milestone 1: Scene runtime spine on the closed vocabulary (sans visible render)

- Depends on: M0.5 -- generated data must carry every field the loader will read.
- Workstreams: WS-CONTRACT, WS-LOADER, WS-RENDER-CORE, WS-DISPATCH,
  WS-NO-LEGACY-IMPORTS.
- **Mandatory internal dispatch order** (manager enforces): (1) WP-CONTRACT-1 and
  WP-CONTRACT-2 land first and tsc-green; (2) WP-NO-LEGACY-IMPORTS-1 lands second so
  every subsequent runtime patch is lint-gated; (3) WP-LOADER-1A, WP-RENDER-1A, and
  WP-DISPATCH-1 run in parallel only after (1) and (2) close; (4) WP-LOADER-1B
  follows 1A; WP-LOADER-1C follows 1B; WP-RENDER-1B / 1C / 1D follow 1A and run in
  parallel among themselves. Loader / render / dispatch never start while the
  contract is not green.
- Entry criteria: M0.5 exit met.
- Exit criteria:
  - `src/scene_runtime/contract.ts` and `types.ts` describe the closed vocabulary
    verbatim per spec.
  - No `completionPath` / `plateTargets` / `tubeTargets` / `requiredItems` /
    `errorHints` types remain under `src/scene_runtime/`.
  - Loader returns a typed `RuntimeWorld` for one protocol + its scenes + its objects +
    its materials.
  - Render core applies each `scene_operation` primitive against a `RuntimeWorld` copy
    (immutable update); five deterministic node tests pass via `node --test`.
  - Render core injects a clock from `render/clock.ts`; production clock and test clock
    both implemented; one test asserts test-clock advances `TimedWait` instantly.
  - Dispatch resolves DOM `click` events to `InteractionEvent` via `data-target-id` +
    `data-gesture` attributes; ignores ambiguous targets (no silent default).
  - `tests/test_scene_runtime_no_legacy_imports.py` exists and passes; it asserts no
    import from `src/*.ts` (outside `src/scene_runtime/`) appears in any
    `src/scene_runtime/` file.
  - `npx tsc --noEmit -p src/tsconfig.json` exits 0.
  - `pytest tests/ -q` exits 0.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open M1.5 immediately.
- Parallel-plan ready: yes -- max parallel doers: 5. WS-CONTRACT precedes the other four;
  once it lands, the rest are independent.

### Milestone 1.5: First browser render proof (base-scene + interactive smoke)

- Depends on: M1 -- requires the realigned contract + loader + render core + dispatch.
- Workstreams: WS-BASE-SCENE-RENDER, WS-VISIBLE-SLICE.
- **Mandatory internal dispatch order** (manager enforces):
  1. WP-BASE-SCENE-RENDER-1 lands FIRST. Proves authored scene geometry interprets
     correctly (real generated scene data, no chrome, no interaction).
  2. WP-VISIBLE-SLICE-1 lands SECOND. Proves render-then-mutate path
     (one object, one click, one state delta).
  3. WP-VISIBLE-SLICE-2 optional last.
     Rationale: base-scene catches a different failure class than the click smoke
     (unresolved inheritance, ignored placement coords, all-at-origin stacking, scene
     root viewport bugs, missing `data-target-id` propagation). Failing the base-scene
     proof BEFORE the click smoke isolates layout-truth bugs from dispatch bugs.
- Entry criteria: M1 exit met.
- Exit criteria:
  - WP-BASE-SCENE-RENDER-1 green: one real resolved scene renders, every placement
    has nonzero bounding box, no unintended `(0,0)` stacking, every object's
    `data-target-id` reaches the DOM.
  - `src/scene_runtime/bundle/entry.ts` exports `mountRuntime(rootElement, runtimeData)`
    that loads one scene, renders one object, attaches one click handler, applies one
    `ObjectStateChange` on click, and re-renders the visual.
  - `pipeline/build_runtime_bundle.sh` invokes esbuild to produce
    `dist/runtime.bundle.js` + source map.
  - `dist/_smoke_one_object.html` is a hand-authored HTML shell (NOT generated by the
    per-protocol builder) that loads `runtime.bundle.js` + a hand-authored smoke fixture
    representing one scene with one clickable object that owns one `state_field` and one
    `visual_state` (e.g., a simple bottle that toggles "empty" / "full" on click).
  - The smoke fixture uses the simplest possible object, NOT `well_plate_96`.
  - `tests/playwright/test_visible_slice.mjs` loads
    `file://dist/_smoke_one_object.html`, asserts the object renders, clicks the
    `data-target-id` element, asserts the DOM / SVG changes visibly (asserted via
    boundingBox or attribute delta, not just a `data-state` attribute), saves a before
    and after screenshot under `test-results/_smoke/`.
  - The smoke test runs in under 5 seconds end-to-end.
  - `.gitignore` includes `dist/` and `test-results/`.
  - `docs/CHANGELOG.md` entry under today's date.
  - Obvious follow-on: open M2 and M3 in parallel; both are unblocked by the slice.
- Parallel-plan ready: no -- two workstreams but strict ordering required (see
  Mandatory internal dispatch order). Max parallel doers: 1. Rationale: this
  milestone exists precisely to compress one path through every runtime module
  before fanning out, and the base-scene proof gates the click smoke.

### Milestone 2: Layout, liquid, and highlight on the closed object vocabulary

- Depends on: M1.5 -- the visible slice proves the runtime spine works; layout work can
  now build on a known-good base.
- Workstreams: WS-LAYOUT-AUDIT, WS-LAYOUT-INTEGRATE, WS-WELLPLATE-ADAPTER, WS-LIQUID.
- **Mandatory internal dispatch order** (manager enforces, resolves
  WP-WELLPLATE-ADAPTER-1C <-> WP-LIQUID-1 dependency in the WP list):
  1. WP-LAYOUT-AUDIT-1.
  2. WP-LAYOUT-INTEGRATE-1.
  3. WP-WELLPLATE-ADAPTER-1A.
  4. WP-WELLPLATE-ADAPTER-1B and WP-LIQUID-1 may run in parallel after 1A.
  5. WP-WELLPLATE-ADAPTER-1C after WP-LIQUID-1.
- Entry criteria: M1.5 exit met.
- Exit criteria:
  - WS-LAYOUT-AUDIT publishes `docs/active_plans/layout_engine_audit.md` listing every
    layout primitive in `LAYOUT_ENGINE.md` and marking each as
    `present in legacy src/layout_engine.ts`, `gap`, or `present but drifted`. Explicit
    coverage for `row_*` / `col_*` / `all_wells` / `blocks` / per-cell fallback / label
    collision under block geometry / `visual_states` re-render delta.
  - WS-LAYOUT-INTEGRATE wires the layout module under `src/scene_runtime/layout/`
    (rebuild or mine per audit) and renders one full scene without throwing.
  - WS-WELLPLATE-ADAPTER renders a 96-well plate with per-cell `data-target-id` ids and
    block-group container `data-target-id` ids. Visual states for `material_name` +
    `material_volume` resolve per cell.
  - WS-LIQUID applies `MATERIAL_CONVENTION.md` render rules and drives a target-
    highlight overlay tied to the current step's interaction target id.
  - `npx tsc --noEmit -p src/tsconfig.json` exits 0.
  - `pytest tests/ -q` exits 0.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: M3 (chrome minimal) may have already landed in parallel; if not,
    open it now.
- Parallel-plan ready: yes -- max parallel doers: 4.

### Milestone 3: Minimal chrome (scene viewport + prompt + feedback)

- Depends on: M1.5 -- chrome consumes the runtime world built by M1; minimal chrome can
  run on the smoke slice and does not need full layout.
- Workstreams: WS-CHROME-MINIMAL, WS-CHROME-ADJUST.
- Entry criteria: M1.5 exit met (M2 NOT required; chrome is independent).
- Exit criteria:
  - WS-CHROME-MINIMAL ships scene-frame viewport, prompt panel, next-step button (for
    user-driven advance on `step_validator: sequence_complete`), and feedback area for
    `response.feedback`. NO welcome screen, NO mini-protocol launcher, NO polished MCQ
    modal in this milestone.
  - WS-CHROME-ADJUST ships generic `adjust` gesture dispatch plus the Pilot 1
    chrome bindings needed for `set_volume` (pipette volume) and `wavelength_nm`
    (plate-reader wavelength). Other adjust bindings (`set_temperature`, `set_rpm`,
    etc.) land later only when content exercises them, via WS-GESTURE-EXPAND.
  - Every chrome element exposes `data-testid` for the walker.
  - Runtime asserts the current step's prompt displays verbatim; runtime does not
    advance unless `step_validator` passes; runtime does not mutate state before
    validator passes.
  - `npx tsc --noEmit -p src/tsconfig.json` exits 0.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open M4 immediately.
- Parallel-plan ready: yes -- max parallel doers: 2.

### Milestone 4: Per-mini-protocol HTML build + Pilot 1 end-to-end

- Depends on: M2 (layout + well-plate adapter + liquid) and M3 (minimal chrome).
- Workstreams: WS-HTML-BUILDER, WS-PILOT1.
- Entry criteria: M2 and M3 exit met. **Combined integration gate**: before opening
  M4, the manager runs the following tests together against the post-M2+M3 tree:
  `test_visible_slice.mjs`, `test_chrome_scene_frame_prompt.mjs`,
  `test_chrome_feedback_next.mjs`, `test_chrome_adjust_pilot.mjs`,
  `test_well_plate_static.mjs`, `test_well_plate_groups.mjs`,
  `test_well_plate_visual_state.mjs`. All must pass in one combined run. Rationale: M2 and M3 ran in parallel against the M1.5
  smoke; this gate catches any render-semantics drift between the chrome built on
  smoke and the well-plate adapter built later.
- Exit criteria:
  - `pipeline/build_protocol_html.py` emits one `dist/<protocol_name>.html` per
    mini-protocol; each shell references the shared `dist/runtime.bundle.js` and
    inlines (or sibling-loads) per-protocol generated data.
  - No monolithic HTML artifact emits.
  - `pytest tests/test_protocol_html_build.py` asserts: the per-protocol output set
    matches the YAML catalog; no monolith path exists; no `dist/*.html` is committed
    (gitignored).
  - `.gitignore` carries `dist/` and `test-results/` (verified by `git status`).
  - `<PILOT1>` (default `mtt_solubilization_readout`, chosen for plate-runtime pilot
    status: exercises `all_wells`, plate-reader scene change, MCQ-free flow; downgrade
    per `### Pilot 1 protocol selection`) loads in a real browser, renders every
    step's scene, accepts `click` and `adjust` gestures through visible DOM, advances
    on each `step_validator` pass, and reaches `next_step: null`.
  - Manual walk-through captures at least one before / after screenshot per step into
    `test-results/<PILOT1>/`.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open M5 immediately.
- Parallel-plan ready: yes -- max parallel doers: 2.

### Milestone 5: Generic walker on the realigned contract

- Depends on: M4 -- the walker drives Pilot 1's HTML build through Playwright.
- Workstreams: WS-WALKER-ENGINE, WS-WALKER-PILOT.
- Entry criteria: M4 exit met.
- Exit criteria:
  - Walker engine reads each protocol's resolved `ProtocolConfig` (via the loader),
    drives only visible DOM via `data-testid` + `data-target-id` + `data-gesture`
    selectors, fails loudly on missing affordances.
  - Walker controls the test clock to advance `TimedWait` instantly.
  - `tests/test_walker_no_step_branches.py` continues to pass.
  - Pilot 1 walker run exits 0 with at least `2 * N` screenshots for `N` meaningful
    interactions.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open M6 immediately.
- Parallel-plan ready: partial -- WS-WALKER-ENGINE blocks WS-WALKER-PILOT. Max parallel
  doers: 1 inside the milestone.

### Milestone 6: Scale to all 12 mini-protocols

- Depends on: M5 -- one mini-protocol proves the pattern.
- Workstreams: WS-SCALE-A through WS-SCALE-K (one per remaining protocol initially),
  WS-CONTENT, WS-GESTURE-EXPAND.
- Entry criteria: M5 exit met.
- Exit criteria:
  - Each of the 12 mini-protocols carries a green walker run with before / after
    screenshots in `test-results/<protocol_name>/`.
  - First THREE protocols after Pilot 1 ship one-per-patch. Once the pattern is
    stable (three consecutive green runs with no triage drama), remaining protocols MAY
    be batched two-per-patch.
  - `node tests/playwright/walker/run_all.mjs` exits 0 across all 12 mini-protocols.
  - Every oversight surfaced during a walk-through is classified per the runtime-gap
    triage and resolved in the corresponding lane (renderer-gap -> runtime patch under
    `src/scene_runtime/`; content-gap -> YAML patch under `content/protocols/`;
    spec-gap -> paused for user review, surfaced as an entry in `docs/TODO.md`). No
    per-protocol walker branch is added.
  - WS-GESTURE-EXPAND adds `select` / `type` / `drag` dispatch + chrome surfaces only
    when a protocol actually requires them. Each gesture lands as its own WP.
  - The full-tree YAML gates continue to pass on `main` after every YAML edit.
  - `docs/CHANGELOG.md` entry per patch.
  - Obvious follow-on: open `docs/TODO.md` items for launcher / welcome polish, mobile
    polish, legacy `src/` retirement, and any deferred per-protocol cosmetic issues.
- Parallel-plan ready: yes -- max parallel doers: 11 once the first three pass; 1 until
  then. Each scale lane owns one protocol initially; assignment is by protocol id.

## Workstream breakdown

### Workstream WS-AUDIT: legacy `src/` salvage inventory

- Owner: `reviewer` (read-only).
- Interfaces:
  - Needs: read access to `src/`, `src/scene_runtime/`, `src/scenes/`, `tests/`,
    `docs/specs/`.
  - Provides: `docs/active_plans/yaml_to_browser_audit.md`.
- Expected patches: 1.

### Workstream WS-SPEC-CONSOLIDATION: runtime-component-to-spec map

- Owner: `reviewer` (read-only).
- Interfaces:
  - Needs: `docs/specs/` index.
  - Provides: `docs/active_plans/scene_runtime_spec_index.md`.
- Expected patches: 1.

### Workstream WS-GENERATED-DATA: generated-data audit + builder patches

- Owner: `reviewer` for the audit; `coder` for any builder patches.
- Interfaces:
  - Needs: WS-AUDIT findings + spec index + current `generated/*.ts`.
  - Provides: `docs/active_plans/generated_data_audit.md` + any necessary Python
    builder patches under `pipeline/`.
- Expected patches: 1 to 3.

### Workstream WS-CONTRACT: type contract realignment

- Owner: `typescript-engineer` (delegated; module-boundary type design + opaque types).
- Interfaces:
  - Needs: WS-AUDIT inventory + WS-SPEC-CONSOLIDATION index + WS-GENERATED-DATA report.
  - Provides: realigned `contract.ts` + `types.ts`.
- Expected patches: 1 to 2.

### Workstream WS-LOADER: runtime data loader

- Owner: `coder`.
- Interfaces:
  - Needs: realigned contract; `generated/*.ts` (verified by WS-GENERATED-DATA).
  - Provides: `RuntimeWorld` consumed by render core, dispatch, chrome, walker.
- Expected patches: 3 (WP-LOADER-1A protocol, WP-LOADER-1B scene+object, WP-LOADER-1C
  material+world).

### Workstream WS-RENDER-CORE: scene-operation applier + redraw queue + clock

- Owner: `coder`.
- Interfaces:
  - Needs: realigned contract; runtime world.
  - Provides: `applySceneOperation()`, `requestRedraw()`, `Clock` interface
    (production + test).
- Expected patches: 4 (WP-RENDER-1A state+scene, WP-RENDER-1B cursor+layout,
  WP-RENDER-1C TimedWait+clock, WP-RENDER-1D request queue).

### Workstream WS-DISPATCH: DOM-to-interaction resolver

- Owner: `coder`.
- Interfaces:
  - Needs: realigned contract; rendered DOM.
  - Provides: `InteractionEvent` stream for `click` (other gestures land later via
    WS-CHROME-ADJUST and WS-GESTURE-EXPAND).
- Expected patches: 1.

### Workstream WS-NO-LEGACY-IMPORTS: boundary lint

- Owner: `tester`.
- Interfaces:
  - Needs: realigned runtime layout.
  - Provides: `tests/test_scene_runtime_no_legacy_imports.py`.
- Expected patches: 1.

### Workstream WS-BASE-SCENE-RENDER: first real scene renders correctly

- Owner: `coder` (+ `tester` for the Playwright proof).
- Interfaces:
  - Needs: realigned contract; loader; render appliers.
  - Provides: `renderScene(world, sceneId)` plus a browser-visible proof that an
    authored scene geometry interprets correctly. Gates WS-VISIBLE-SLICE.
- Expected patches: 1.

### Workstream WS-VISIBLE-SLICE: Pilot 0 smoke

- Owner: `coder` + `tester` for the Playwright proof.
- Interfaces:
  - Needs: realigned runtime spine; hand-authored smoke fixture.
  - Provides: `dist/_smoke_one_object.html`, `dist/runtime.bundle.js`,
    `pipeline/build_runtime_bundle.sh`, `tests/playwright/test_visible_slice.mjs`,
    `.gitignore` updates.
- Expected patches: 1 to 2.

### Workstream WS-LAYOUT-AUDIT: layout engine gap analysis

- Owner: `reviewer` (read-only).
- Interfaces:
  - Needs: legacy `src/layout_engine.ts`; `LAYOUT_ENGINE.md`; well-plate object YAML.
  - Provides: `docs/active_plans/layout_engine_audit.md`.
- Expected patches: 1.

### Workstream WS-LAYOUT-INTEGRATE: layout module

- Owner: `coder`.
- Interfaces:
  - Needs: layout audit; runtime world.
  - Provides: `computeSceneLayout(world)` consumed by render core.
- Expected patches: 1.

### Workstream WS-WELLPLATE-ADAPTER: 96-well plate render adapter

- Owner: `coder`.
- Interfaces:
  - Needs: layout module; runtime world; liquid module (for 1C).
  - Provides: `well_plate_96` adapter with per-cell + group `data-target-id` ids and
    per-cell `visual_states` resolution.
- Expected patches: 3 (WP-WELLPLATE-ADAPTER-1A static cells, WP-WELLPLATE-ADAPTER-1B
  group targets, WP-WELLPLATE-ADAPTER-1C per-cell material visual state).

### Workstream WS-LIQUID: liquid + highlight render rules

- Owner: `coder`.
- Interfaces:
  - Needs: `MATERIAL_CONVENTION.md`; runtime world.
  - Provides: `renderLiquid()` + `renderHighlight()`.
- Expected patches: 1.

### Workstream WS-CHROME-MINIMAL: scene viewport + prompt + feedback

- Owner: `coder` (ui-ux-engineer review at M3 exit only).
- Interfaces:
  - Needs: realigned contract; runtime world.
  - Provides: minimal chrome DOM + `data-testid` hooks.
- Expected patches: 2 (WP-CHROME-MINIMAL-1A scene-frame+prompt, WP-CHROME-MINIMAL-1B
  feedback+next+validator-advance).

### Workstream WS-CHROME-ADJUST: adjust-gesture surface

- Owner: `coder` (ui-ux-engineer review at M3 exit only).
- Interfaces:
  - Needs: dispatch resolver; chrome minimal.
  - Provides: generic `adjust` dispatch + `<PILOT1>`-scoped panel bindings
    (`set_volume`, `wavelength_nm`). Additional bindings deferred to
    WS-GESTURE-EXPAND.
- Expected patches: 2 (WP-CHROME-ADJUST-1A generic dispatch, WP-CHROME-ADJUST-1B
  Pilot 1 bindings).

### Workstream WS-HTML-BUILDER: per-mini-protocol HTML generator

- Owner: `coder`.
- Interfaces:
  - Needs: generated runtime data; runtime bundle.
  - Provides: `pipeline/build_protocol_html.py` + `dist/<protocol_name>.html`.
- Expected patches: 1.

### Workstream WS-PILOT1: `<PILOT1>` end-to-end (default `mtt_solubilization_readout`)

- Owner: `coder`.
- Interfaces:
  - Needs: HTML builder; well-plate adapter; chrome minimal + adjust.
  - Provides: working pilot HTML in a real browser.
- Expected patches: 1 to 2.

### Workstream WS-WALKER-ENGINE: generic walker

- Owner: `tester`.
- Interfaces:
  - Needs: realigned contract; chrome `data-testid` hooks; test-clock control.
  - Provides: walker engine for any mini-protocol.
- Expected patches: 1.

### Workstream WS-WALKER-PILOT: pilot walk-through

- Owner: `tester`.
- Interfaces:
  - Needs: walker engine + Pilot 1 HTML.
  - Provides: green pilot walker run.
- Expected patches: 1.

### Workstreams WS-SCALE-A through WS-SCALE-K: per-protocol walkthroughs

- Owner: `tester` per WP.
- Interfaces:
  - Needs: walker engine + chrome + HTML builder.
  - Provides: green walker run per protocol.
- Expected patches: 11 (one per protocol initially; may batch later).

### Workstream WS-CONTENT: YAML / renderer fixes surfaced during scale

- Owner: `coder` + `tester` via TaskCreate handoffs.
- Interfaces:
  - Needs: walker failure reports from WS-SCALE-\*.
  - Provides: triaged fixes (renderer-gap or content-gap; spec-gap pauses for user).
- Expected patches: 2 to 4.

### Workstream WS-GESTURE-EXPAND: `select` / `type` / `drag` dispatch + chrome

- Owner: `coder`.
- Interfaces:
  - Needs: dispatch resolver; chrome.
  - Provides: per-gesture dispatch + per-gesture chrome surface, gated by content need.
- Expected patches: 1 to 3 (one per gesture actually exercised).

## Work packages

### WP-AUDIT-1: inventory and classify legacy `src/`

- Owner: `reviewer`.
- Touch points: `docs/active_plans/yaml_to_browser_audit.md` (new); `docs/CHANGELOG.md`.
- Depends on: none.
- Acceptance criteria:
  - Every `src/*.ts` file appears with verdict + reason.
  - Every `src/scene_runtime/` file appears with vocabulary-alignment verdict.
  - `tests/test_scenes_freeze_baseline.py` confirmed passing.
- Verification commands:
  - `pytest tests/test_scenes_freeze_baseline.py tests/test_scenes_legacy_banner.py -q`
  - `pytest tests/test_markdown_links.py -q`

### WP-SPEC-INDEX-1: runtime-component-to-spec map

- Owner: `reviewer`.
- Touch points: `docs/active_plans/scene_runtime_spec_index.md` (new);
  `docs/CHANGELOG.md`.
- Depends on: none.
- Acceptance criteria:
  - Every runtime component carries a cross-reference to its canonical spec.
- Verification commands:
  - `pytest tests/test_markdown_links.py -q`

### WP-GENERATED-DATA-1: audit generated runtime data

- Owner: `reviewer` (audit); `coder` (any builder patch lands as WP-GENERATED-DATA-2+).
- Touch points: `docs/active_plans/generated_data_audit.md` (new); `docs/CHANGELOG.md`.
- Depends on: WP-AUDIT-1, WP-SPEC-INDEX-1.
- Acceptance criteria:
  - Audit asserts whether `generated/protocol_data.ts` carries every field required
    by `docs/specs/PROTOCOL_VOCABULARY.md` and `docs/specs/PROTOCOL_YAML_FORMAT.md`,
    plus the runtime contract shape documented in the audit itself.
  - Audit includes a proposed TypeScript contract outline (one block per top-level
    type) but does NOT edit `contract.ts`. The outline is consumed by WP-CONTRACT-1.
  - Audit decides the **runtime data interchange shape**: ESM TS literal modules
    (current default), JSON sidecar, or hybrid. The chosen shape must work in both
    `node --test` and the browser esbuild bundle. WP-LOADER-1A cannot start until
    this decision is documented.
  - Audit asserts whether `generated/scene_data.ts` is fully resolved Python-side
    across ALL THREE scene sources: `content/base_scenes/<name>.yaml` (base layer),
    `content/protocols/<P>/scenes/<name>.yaml` (per-protocol overrides), and the
    inheritance keys WITHIN those files (`extends`, `add_placements`,
    `remove_placements`, `deactivate_placements`, `reposition_placements`). The
    runtime must see one resolved scene per id, with no remaining source-layer
    distinction.
  - Audit walks `content/objects/<kind>/` taxonomy (bottle, decoration, equipment,
    flask, pipette, plate, rack, waste) and confirms every authored object surfaces
    in generated object data; new files in any `kind/` subfolder must be picked up
    by the builder without manual registration.
  - Audit asserts whether object data is emitted with `state_fields`, `visual_states`
    formula tokens, `subpart_groups`, and `capabilities`.
  - Audit asserts whether materials are emitted to `generated/` per protocol.
  - Audit lists missing fields with a recommended Python builder patch path.
  - **Audit produces one concrete sample record per generated-data kind** (one protocol,
    one resolved scene, one object, one material) showing the exact shape TypeScript
    will consume. Each sample is a verbatim excerpt or a hand-pretty-printed JSON
    facsimile of the generated TS literal. Without samples the audit is too abstract
    to gate WP-LOADER-1.
  - **Audit classifies every `visual_states` mechanism in scope** for the runtime as
    one of: `svg_swap` (whole-asset variant), `css_class` (named class toggle),
    `attribute_patch` (one attribute on one element), or `unsupported`. Unsupported
    mechanisms surface as `docs/TODO.md` entries before M1.5; Pilot 0 may only use a
    mechanism in the supported set.
- Verification commands:
  - `pytest tests/test_markdown_links.py -q`

### WP-GENERATED-DATA-2 ... -N: Python builder patches

- Owner: `coder`.
- Touch points: relevant builder under `pipeline/build_*.py`; `generated/*.ts` re-emitted;
  `docs/CHANGELOG.md`.
- Depends on: WP-GENERATED-DATA-1.
- Acceptance criteria:
  - Patch adds the missing field(s) to the builder; `generated/*.ts` re-emitted.
  - YAML gates re-run: `validation/validate.py` and
    `validation/manual/protocol_manual.py --all` both pass.
  - `pytest tests/ -q` exits 0.
- Verification commands:
  - `source source_me.sh && python3 pipeline/build_protocol_data.py`
  - `source source_me.sh && python3 pipeline/build_scene_data.py`
  - `source source_me.sh && python3 validation/validate.py`
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --all`
  - `source source_me.sh && pytest tests/ -q`

### WP-CONTRACT-1: realign `contract.ts` to closed protocol vocabulary

- Owner: `typescript-engineer`.
- Touch points: `src/scene_runtime/contract.ts`; `docs/CHANGELOG.md`.
- Depends on: WP-AUDIT-1, WP-SPEC-INDEX-1, WP-GENERATED-DATA-1.
- Acceptance criteria:
  - File defines `ProtocolConfig`, `Step`, `Interaction`, `Response`, the closed
    `SceneOperation` union, the closed `Gesture` union, the closed validator-preset
    union, and the closed `Outcome` shape.
  - No `completionPath` / `plateTargets` / `tubeTargets` / `requiredItems` /
    `errorHints` types remain.
  - Discriminated unions use the `type` discriminator (PascalCase for
    `SceneOperation.type`).
  - Brand types guard `StepName`, `ProtocolName`, `SceneId`, `ObjectId`.
- Verification commands:
  - `npx tsc --noEmit -p src/tsconfig.json` -- expect `exit 0`.

### WP-CONTRACT-2: realign `types.ts` to closed scene + object vocabulary

- Owner: `typescript-engineer`.
- Touch points: `src/scene_runtime/types.ts`; `docs/CHANGELOG.md`.
- Depends on: WP-CONTRACT-1.
- Acceptance criteria:
  - File defines `SceneConfig`, `Zone`, `Placement`, `ObjectConfig`, `StateField`,
    `VisualState`, `Capability`, `SubpartGroup`.
  - No legacy `liquidCapable` / `capacityMl` / `containsAny` types remain.
- Verification commands:
  - `npx tsc --noEmit -p src/tsconfig.json` -- expect `exit 0`.

### WP-LOADER-1A: protocol + step-graph loader

- Owner: `coder`.
- Touch points: `src/scene_runtime/loader/protocol.ts` (new).
- Depends on: WP-CONTRACT-1, WP-GENERATED-DATA-1 (+ any -N patches).
- Acceptance criteria:
  - `loadProtocol(name)` returns a typed `ProtocolConfig` with every `next_step`
    validated against `steps[].step_name` and `entry_step` validated.
  - Loader throws loud errors on missing fields; no silent defaults.
  - `tests/test_loader_protocol.mjs` loads at least one **real protocol** from
    `generated/protocol_data.ts`.
- Verification commands:
  - `node --test tests/test_loader_protocol.mjs` -- expect green.

### WP-LOADER-1B: scene + object loader

- Owner: `coder`.
- Touch points: `src/scene_runtime/loader/scene.ts` (new),
  `src/scene_runtime/loader/object.ts` (new).
- Depends on: WP-CONTRACT-2, WP-LOADER-1A.
- Acceptance criteria:
  - `loadScene(name)` resolves every `placement.object_name` to a loaded
    `ObjectConfig`; scenes consumed are inheritance-resolved Python-side.
  - `loadObject(name)` materializes `state_fields` default values; rejects unknown
    `visual_states` formula tokens at load time.
- Verification commands:
  - `node --test tests/test_loader_scene_object.mjs` -- expect green.

### WP-LOADER-1C: material loader + `RuntimeWorld` assembly

- Owner: `coder`.
- Touch points: `src/scene_runtime/loader/material.ts` (new),
  `src/scene_runtime/loader/world.ts` (new).
- Depends on: WP-LOADER-1A, WP-LOADER-1B.
- Acceptance criteria:
  - `loadMaterial(name)` returns a typed `MaterialConfig` per
    `MATERIAL_CONVENTION.md`; missing material is a loud error.
  - `loadWorld(protocolName)` combines protocol + every referenced scene + every
    referenced object + every referenced material into a typed `RuntimeWorld`.
  - `tests/test_loader_world.mjs` exercises `loadWorld` on at least one **real**
    protocol from `generated/protocol_data.ts` (per `## Fixture discipline`).
  - **Generated-data parity test** at
    `tests/test_generated_runtime_data_shape.mjs` (new): asserts every loaded
    protocol / scene / object / material record carries the required top-level
    fields per the realigned contract. **Asserts no retired fields**
    (`completionPath`, `plateTargets`, `tubeTargets`, `requiredItems`,
    `errorHints`) appear anywhere in loaded runtime data. Catches contract
    regressions before browser work.
- Verification commands:
  - `node --test tests/test_loader_world.mjs` -- expect green.
  - `node --test tests/test_generated_runtime_data_shape.mjs` -- expect green; no
    retired fields detected.

### WP-RENDER-1A: `ObjectStateChange` + `SceneChange` appliers

- Owner: `coder`.
- Touch points: `src/scene_runtime/render/apply.ts` (new),
  `src/scene_runtime/render/types.ts` (new, applier signature).
- Depends on: WP-CONTRACT-1, WP-LOADER-1C.
- Acceptance criteria:
  - `applyObjectStateChange(world, op)` and `applySceneChange(world, op)` each return
    a new `RuntimeWorld`; original unchanged.
  - `SceneChange` preserves protocol state and object state unless YAML declares
    otherwise; only the active scene changes.
- Verification commands:
  - `node --test tests/test_render_apply_state_scene.mjs` -- expect green.

### WP-RENDER-1B: `CursorAttach` + `LayoutMove` appliers

- Owner: `coder`.
- Touch points: extend `src/scene_runtime/render/apply.ts`.
- Depends on: WP-RENDER-1A.
- Acceptance criteria:
  - `applyCursorAttach(world, op)` and `applyLayoutMove(world, op)` each return a
    new `RuntimeWorld`; original unchanged.
  - **State-only** in this WP: the appliers update `RuntimeWorld` cursor / layout
    state. Visual cursor rendering and visible layout transitions land in the first
    adapter / chrome WP that needs to display them; this WP does not paint anything.
- Verification commands:
  - `node --test tests/test_render_apply_cursor_layout.mjs` -- expect green.

### WP-RENDER-1C: `TimedWait` applier + clock abstraction

- Owner: `coder`.
- Touch points: extend `src/scene_runtime/render/apply.ts`,
  `src/scene_runtime/render/clock.ts` (new).
- Depends on: WP-RENDER-1A.
- Acceptance criteria:
  - `Clock` interface with `productionClock` (real time, `setTimeout`-backed) and
    `testClock` (advance-on-command) both exported.
  - `applyTimedWait(world, op, clock)` consumes the injected clock; emits the
    `<equipment_name>_elapsed` event on advance.
  - `TimedWait` is minimal per `## Acceptance criteria and gates`: display + accept
    test-clock advance + emit elapsed + continue. No animation polish.
  - `TimedWait` is **unit-proven in M1** (this WP). **Browser proof** (visible timer
    display + visible advance) is deferred to the first protocol that exercises
    `TimedWait` in a walker run; the walker must use the test clock then. The M1.5
    visible slice does NOT need to exercise `TimedWait`.
- Verification commands:
  - `node --test tests/test_render_clock.mjs` -- expect green; test clock advances
    `TimedWait` instantly (under 1 second wall-clock).

### WP-RENDER-1D: `RenderRequest` queue

- Owner: `coder`.
- Touch points: `src/scene_runtime/render/request.ts` (new).
- Depends on: WP-RENDER-1A.
- Acceptance criteria:
  - `RenderRequest` queue collapses redundant requests within one animation frame.
  - Subscriber API permits walker to listen for `world-changed` without polling.
- Verification commands:
  - `node --test tests/test_render_request.mjs` -- expect green.

### WP-DISPATCH-1: `click` resolver

- Owner: `coder`.
- Touch points: `src/scene_runtime/dispatch/click.ts` (new),
  `src/scene_runtime/dispatch/index.ts`.
- Depends on: WP-CONTRACT-1, WP-LOADER-1A.
- Acceptance criteria:
  - Capture-phase listener resolves `data-target-id` + `data-gesture="click"` from the
    closest ancestor; ignores ambiguous targets.
  - Emits one `InteractionEvent` per resolved click.
- Verification commands:
  - `npx tsx tests/test_dispatch_click.ts` -- expect green.

### WP-NO-LEGACY-IMPORTS-1: boundary lint

- Owner: `tester`.
- Touch points: `tests/test_scene_runtime_no_legacy_imports.py` (new).
- Depends on: none (lands at M1 entry).
- Acceptance criteria:
  - Test scans every file under `src/scene_runtime/` and asserts no `import` /
    `require` references any file under `src/` outside `src/scene_runtime/`.
  - Test fails loudly on the first offending import.
- Verification commands:
  - `pytest tests/test_scene_runtime_no_legacy_imports.py -q` -- expect green.

### WP-BASE-SCENE-RENDER-1: render one resolved base scene (minimal placement renderer)

- Owner: `coder` (+ `tester` for the Playwright proof).
- Touch points: `src/scene_runtime/render/scene.ts` (new) or equivalent render entry;
  `tests/playwright/test_base_scene_render.mjs` (new); optional fixture HTML shell
  under `tests/playwright/fixtures/` (committed); `docs/CHANGELOG.md`.
- Depends on: WP-LOADER-1C, WP-RENDER-1A. (WP-LAYOUT-INTEGRATE-1 NOT required.
  This WP implements ONLY the minimal placement projection needed to render
  already-resolved scene placements into DOM coordinates. It does NOT implement the
  full layout engine, row / zone placement, well-plate geometry, collision
  handling, or responsive layout.)
- Non-goal: does not implement full `LAYOUT_ENGINE.md`; only direct resolved
  placement geometry. Anything beyond direct-projection is rejected and rolled into
  WP-LAYOUT-INTEGRATE-1.
- Compile path: the Playwright test uses the existing test-fixture compile path
  (`tests/_compile_for_test.mjs` esbuild bundle), NOT
  `pipeline/build_runtime_bundle.sh`. This keeps WP-BASE-SCENE-RENDER-1 strictly
  prior to WP-VISIBLE-SLICE-1, which is the first WP to introduce the production
  bundle script.
- Scene selection rule: choose the smallest real resolved scene from
  `generated/scene_data.ts` with at least three placements, at least two distinct
  object kinds, and at least one non-origin placement. If no such scene exists,
  stop and report the closest candidate -- do NOT pick a trivial scene that hides
  layout bugs.
- Acceptance criteria:
  - Loads the selected real resolved scene from `generated/scene_data.ts` (no
    hand-authored scene fixture, per `## Fixture discipline`).
  - Renders the scene root into a browser-visible container.
  - Each placement renders with a stable `data-target-id` (or `data-object-id`
    where the scene declares no semantic target binding for that placement).
  - Asserts every placed object has a nonzero bounding box.
  - Asserts no object renders at `(0, 0)` unless the scene explicitly places it
    there. The assertion reads the GENERATED resolved scene placement coordinates
    and only permits origin for objects whose generated placement places them at
    origin (NOT raw YAML; runtime never reads raw YAML per `## Generated-data
boundary`).
  - Asserts no two placed objects have identical bounding boxes unless the scene
    explicitly overlaps them (same read-from-generated-scene-data reconciliation
    rule).
  - Captures one screenshot under `test-results/_base_scene/` (gitignored, aligned
    with the rest of the visible-render proof style).
  - No interactions, no chrome, no state mutation, no walker behavior in this WP.
  - Visual states resolve from declared `state_fields` defaults only (no click,
    no `ObjectStateChange` applied in this WP).
- Verification commands:
  - `node tests/playwright/test_base_scene_render.mjs` -- expect green.
  - `npx tsc --noEmit -p src/tsconfig.json` -- expect exit 0.

### WP-VISIBLE-SLICE-1: one object, one click, one state update, one visible delta

- Owner: `coder`.
- Touch points (committed): `src/scene_runtime/bundle/entry.ts` (new),
  `pipeline/build_runtime_bundle.sh` (new),
  `tests/playwright/fixtures/_smoke_one_object.html.template` (new, committed),
  `tests/playwright/smoke_fixtures/one_object.json` (new, committed),
  `tests/playwright/test_visible_slice.mjs` (new, committed), `.gitignore`,
  `docs/CHANGELOG.md`.
- Touch points (generated, gitignored): `dist/_smoke_one_object.html`,
  `dist/runtime.bundle.js`. The build step copies the template into `dist/` after
  esbuild produces the bundle. Templates and fixtures are committed; built outputs
  are not.
- Depends on: WP-BASE-SCENE-RENDER-1 (gates this WP per M1.5 internal dispatch order),
  WP-LOADER-1C, WP-RENDER-1A, WP-RENDER-1D, WP-DISPATCH-1.
- Acceptance criteria:
  - `mountRuntime(rootElement, runtimeData)` loads one scene, renders one object with a
    `data-target-id` SVG element, applies one `ObjectStateChange` on click, re-renders.
  - The smoke fixture uses the simplest possible object (e.g., a bottle with `empty` /
    `full` states), NOT `well_plate_96`.
  - `dist/runtime.bundle.js` builds via esbuild in under 5 seconds.
  - The smoke object's `visual_states` mechanism is in the supported set defined by
    WP-GENERATED-DATA-1 (svg_swap, css_class, or attribute_patch). The DOM delta is
    unambiguously asserted (attribute value, class membership, or asset variant).
  - `tests/playwright/test_visible_slice.mjs` loads
    `file://dist/_smoke_one_object.html`, asserts initial render, clicks the target,
    asserts a visible DOM delta (e.g., fill attribute or `boundingBox` change), saves
    before / after screenshots into `test-results/_smoke/`.
  - `.gitignore` includes `dist/` and `test-results/`.
- Verification commands:
  - `bash pipeline/build_runtime_bundle.sh` -- expect exit 0; bundle present.
  - `node tests/playwright/test_visible_slice.mjs` -- expect exit 0 in under 5 seconds.

### WP-VISIBLE-SLICE-2 (optional): one `SceneChange` smoke

- Owner: `coder`.
- Touch points: extend `tests/playwright/fixtures/_smoke_one_object.html.template` +
  smoke fixture; add a second scene to the fixture. The built
  `dist/_smoke_one_object.html` remains generated-only and gitignored.
- Depends on: WP-VISIBLE-SLICE-1.
- Acceptance criteria:
  - Clicking a "go to scene B" button triggers a `SceneChange`; the viewport visibly
    replaces; the Playwright test asserts the new scene's root element is present and
    the old one is gone.
- Verification commands:
  - `node tests/playwright/test_visible_slice.mjs` -- expect green.

### WP-LAYOUT-AUDIT-1: layout engine gap analysis

- Owner: `reviewer`.
- Touch points: `docs/active_plans/layout_engine_audit.md` (new); `docs/CHANGELOG.md`.
- Depends on: WP-AUDIT-1.
- Acceptance criteria:
  - Audit lists every primitive in `LAYOUT_ENGINE.md` with status (present / gap /
    drifted).
  - Explicit coverage for `blocks` family, per-cell fallback, label collision under
    block geometry, `visual_states`-driven re-render.
- Verification commands:
  - `pytest tests/test_markdown_links.py -q`

### WP-LAYOUT-INTEGRATE-1: layout module under `src/scene_runtime/layout/`

- Owner: `coder`.
- Touch points: `src/scene_runtime/layout/index.ts`.
- Depends on: WP-LAYOUT-AUDIT-1, WP-CONTRACT-2, WP-LOADER-1C.
- Acceptance criteria:
  - `computeSceneLayout(world)` returns positioned items for one full scene without
    throwing.
- Verification commands:
  - `npx tsx tests/test_layout_integration.ts` -- expect green.

### WP-WELLPLATE-ADAPTER-1A: static 96-cell render + per-cell `data-target-id`

- Owner: `coder`.
- Touch points: `src/scene_runtime/adapters/well_plate/index.ts`,
  `src/scene_runtime/adapters/well_plate/render.ts`.
- Depends on: WP-LAYOUT-INTEGRATE-1.
- Acceptance criteria:
  - Adapter renders 96 SVG cell elements at correct grid positions.
  - Each cell carries `data-target-id="well_plate_96.<A1..H12>"`.
  - Static render only; no state-driven visual change required at this WP.
- Verification commands:
  - `node tests/playwright/test_well_plate_static.mjs` -- expect 96 cells with
    correct ids.

### WP-WELLPLATE-ADAPTER-1B: subpart-group container targets

- Owner: `coder`.
- Touch points: extend `src/scene_runtime/adapters/well_plate/render.ts`.
- Depends on: WP-WELLPLATE-ADAPTER-1A.
- Acceptance criteria:
  - Group container elements carry `data-target-id` for `row_A..H`, `col_1..12`,
    `all_wells`, and every member of the `blocks` family
    (`block_A_1_6`, `block_A_7_12`, `block_B_H_1_6`, `block_B_H_7_12`).
  - Group containers are non-visual wrappers (`<g>` or `<div>`) sized to enclose
    their members; they do not paint anything that occludes per-cell visuals.
- Verification commands:
  - `node tests/playwright/test_well_plate_groups.mjs` -- expect every declared
    subpart-group id is present and selectable via `data-target-id`.

### WP-WELLPLATE-ADAPTER-1C: per-cell material visual state

- Owner: `coder`.
- Touch points: extend `src/scene_runtime/adapters/well_plate/render.ts`;
  per-cell `visual_states` resolution.
- Depends on: WP-WELLPLATE-ADAPTER-1A, WP-LIQUID-1.
- Acceptance criteria:
  - Per-cell visual state resolves from `material_name` + `material_volume` via the
    object's declared `visual_states`.
  - Pilot 1 visual minimalism: one visible delta per `material_name` is required
    (e.g., distinct fill per known material). Per-volume fill height is best-effort
    and deferred to WS-CONTENT later if it stalls this WP.
  - The Pilot 1 downgrade trigger applies to THIS WP only (1C), not to 1A or 1B; a
    static-render or group-targets stall does NOT trigger downgrade.
- Verification commands:
  - `node tests/playwright/test_well_plate_visual_state.mjs` -- expect green.

### WP-LIQUID-1: liquid + highlight render rules (Pilot 1 scope)

- Owner: `coder`.
- Touch points: `src/scene_runtime/liquid/index.ts`,
  `src/scene_runtime/highlight/index.ts`.
- Depends on: WP-WELLPLATE-ADAPTER-1A.
- Acceptance criteria:
  - Liquid render supports the material render fields present in `<PILOT1>`'s
    `materials.yaml` per `MATERIAL_CONVENTION.md` color rules.
  - Liquid render FAILS LOUDLY for material render fields that are not yet
    supported (no silent fallback color, no transparent default).
  - Highlight overlay shows the current interaction's target only; cleared on
    dispatch.
  - Additional material render features for non-pilot protocols are deferred to
    WS-CONTENT as those protocols enter scale (M6).
- Verification commands:
  - `node --test tests/test_liquid_state.mjs` -- expect green for `<PILOT1>`
    materials.

### WP-CHROME-MINIMAL-1A: scene frame + prompt panel

- Owner: `coder` (ui-ux-engineer review at M3 exit only).
- Touch points: `src/scene_runtime/chrome/scene_frame.ts`,
  `src/scene_runtime/chrome/prompt_panel.ts`, `src/scene_runtime/chrome/style.css`.
- Depends on: WP-CONTRACT-1, WP-RENDER-1A.
- Acceptance criteria:
  - Scene viewport hosts adapter render output.
  - Prompt panel shows the current step's `prompt` verbatim.
  - Both elements expose `data-testid`.
- Verification commands:
  - `node tests/playwright/test_chrome_scene_frame_prompt.mjs` -- expect green.

### WP-CHROME-MINIMAL-1B: feedback area + next button + validator advance

- Owner: `coder` (ui-ux-engineer review at M3 exit only).
- Touch points: `src/scene_runtime/chrome/feedback_area.ts`,
  `src/scene_runtime/chrome/next_button.ts`, extend `style.css`.
- Depends on: WP-CHROME-MINIMAL-1A.
- Acceptance criteria:
  - Next button advances on `step_validator: sequence_complete` pass; otherwise
    hidden.
  - Feedback area renders `response.feedback` when present; dismissable.
  - Both elements expose `data-testid`.
  - Runtime does not advance on wrong target; runtime does not mutate state before
    validator passes (asserted by node test against the render core).
- Verification commands:
  - `node tests/playwright/test_chrome_feedback_next.mjs` -- expect green.
  - `node --test tests/test_runtime_no_premature_mutation.mjs` -- expect green.

### WP-CHROME-ADJUST-1A: generic adjust dispatch (one numeric value)

- Owner: `coder`.
- Touch points: `src/scene_runtime/dispatch/adjust.ts`.
- Depends on: WP-DISPATCH-1.
- Acceptance criteria:
  - Generic `adjust` gesture resolver accepts a `(target, value)` pair.
  - Emits one `InteractionEvent` per discrete commit (not per drag tick); commit
    fires on blur / Enter / slider release.
  - No chrome UI in this WP; dispatch shape only.
- Verification commands:
  - `npx tsx tests/test_dispatch_adjust.ts` -- expect green.

### WP-CHROME-ADJUST-1B: chrome adjust panel bindings (Pilot 1 scope only)

- Owner: `coder` (ui-ux-engineer review at M3 exit only).
- Touch points: `src/scene_runtime/chrome/adjust_panel.ts`.
- Depends on: WP-CHROME-ADJUST-1A, WP-CHROME-MINIMAL-1B.
- Acceptance criteria:
  - Slider / numeric input bound to ONLY the validator presets exercised by
    `<PILOT1>` (default: `set_volume` for pipette adjust, `wavelength_nm` for
    plate-reader adjust). `set_temperature` / `set_rpm` are deferred to
    WS-GESTURE-EXPAND or a later content-driven WP if a downstream protocol needs
    them.
  - Each binding carries `data-testid` so the walker can drive it.
- Verification commands:
  - `node tests/playwright/test_chrome_adjust_pilot.mjs` -- expect green for the
    Pilot 1 bindings only.

### WP-HTML-BUILDER-1: per-mini-protocol HTML generator

- Owner: `coder`.
- Touch points: `pipeline/build_protocol_html.py` (new),
  `tests/test_protocol_html_build.py` (new), `docs/USAGE.md`, `.gitignore` confirmation.
- Depends on: WP-VISIBLE-SLICE-1 (proves the bundle path), WP-CHROME-MINIMAL-1B.
- Acceptance criteria:
  - Script emits one `dist/<protocol_name>.html` per mini-protocol.
  - Each shell references `dist/runtime.bundle.js` (shared) plus per-protocol generated
    data.
  - No monolithic HTML emits.
  - `dist/` and `test-results/` remain gitignored; the test asserts neither directory
    has tracked files.
- Verification commands:
  - `source source_me.sh && python3 pipeline/build_protocol_html.py --all` -- expect 12
    files.
  - `source source_me.sh && pytest tests/test_protocol_html_build.py -q` -- expect
    green.
  - `git status --porcelain dist/ test-results/` -- expect empty.

### Pilot 1 protocol selection

Throughout this plan, the symbol `<PILOT1>` refers to the chosen Pilot 1 mini-protocol
id. Default: `mtt_solubilization_readout`. If downgraded per the trigger below,
`<PILOT1>` becomes `mtt_reagent_prep` for every **future** handoff, walker invocation,
and screenshot path. Historical `docs/CHANGELOG.md` entries are **NOT rewritten**; the
downgrade is recorded ONCE under `### Decisions and Failures` on the day it happens,
with date + trigger evidence. The protocol id is set once for forward work and
propagated; no WP carries a hardcoded protocol name that diverges from `<PILOT1>` going
forward.

### Pilot 1 downgrade trigger (mechanical)

If **WP-WELLPLATE-ADAPTER-1C** (per-cell material visual state) misses its
acceptance criteria after **one fix pass**, `<PILOT1>` immediately switches from
`mtt_solubilization_readout` to `mtt_reagent_prep` (no well-plate dependency).
1A (static cells) or 1B (group targets) stalls do NOT trigger downgrade - those are
mechanical render work; 1C is the semantic gate. The plate-runtime pilot becomes
Pilot 2, scheduled after M5 closes on the simpler pilot. The downgrade is mechanical:
no debate, no indefinite debugging, no scope expansion of WP-WELLPLATE-ADAPTER-1C.
The first failed fix pass on 1C is the trigger. Manager performs the propagation per
the selection rule above. **Downgrade affects future handoffs only**: past
`docs/CHANGELOG.md` entries are NOT rewritten; the downgrade is recorded once under
`### Decisions and Failures` with the date and trigger evidence.

### WP-PILOT1-1: `<PILOT1>` end-to-end manual

- Owner: `coder`.
- Touch points: pilot's `content/protocols/<PILOT1>/protocol.yaml` (read-only);
  `dist/<PILOT1>.html` (generated-only, gitignored).
- Depends on: WP-HTML-BUILDER-1, WP-LIQUID-1, WP-CHROME-ADJUST-1B.
- Acceptance criteria:
  - Manual browser run loads `dist/<PILOT1>.html` and completes every step through
    visible DOM only; no console errors; no missing affordances.
  - Before / after screenshots captured manually per step into
    `test-results/<PILOT1>/` (not committed).
- Verification commands:
  - `bash run_web_server.sh &` + manual browser session on `dist/<PILOT1>.html`.
- Notes:
  - `<PILOT1>` resolves per `### Pilot 1 protocol selection`. Default
    `mtt_solubilization_readout`; downgrades to `mtt_reagent_prep` per the
    mechanical trigger.

### WP-WALKER-ENGINE-1: walker engine on realigned contract

- Owner: `tester`.
- Touch points: `tests/playwright/walker/engine.mjs`,
  `tests/playwright/walker/dispatch.mjs`.
- Depends on: WP-PILOT1-1.
- Acceptance criteria:
  - Engine consumes a `ProtocolConfig` and drives chrome via `data-testid` +
    `data-target-id` + `data-gesture` selectors only.
  - Engine controls the test clock to advance `TimedWait` instantly.
  - Engine refuses to advance on missing affordances (loud failure).
- Verification commands:
  - `pytest tests/test_walker_no_step_branches.py -q` -- expect green.
  - `node tests/playwright/walker/engine.test.mjs` -- expect green.

### WP-WALKER-PILOT-1: pilot walker run

- Owner: `tester`.
- Touch points: `test-results/<PILOT1>/` (not committed).
- Depends on: WP-WALKER-ENGINE-1.
- Acceptance criteria:
  - Walker exits 0 on `<PILOT1>`; screenshots present per `2 * N` rule.
- Verification commands:
  - `node tests/playwright/walker/run.mjs --protocol <PILOT1>` -- expect exit 0.

### WP-SCALE-A-1 ... WP-SCALE-K-1: per-protocol walkthroughs (one per WP initially)

- Owner: `tester` per WP.
- Touch points: `test-results/<protocol_name>/`; any oversight lands in WS-CONTENT or
  the appropriate runtime workstream per triage.
- Depends on: WP-WALKER-PILOT-1. **No more than one scale protocol is active at a time
  until three consecutive protocols pass without runtime architecture changes.** Only
  after the three-green stabilization gate do remaining WPs run in parallel or batch
  two-per-patch. **Stabilization counter reset rule**: any renderer architecture change
  during M6 (any patch under `src/scene_runtime/` other than a one-line bug fix)
  resets the "three consecutive green protocols" counter to zero. The next three
  protocols after the architecture change must run serially again before parallel /
  batch resumes. Reset is mechanical; manager logs it in `docs/CHANGELOG.md` under
  `### Decisions and Failures`.
- Acceptance criteria:
  - Each protocol's walker run exits 0; screenshots present.
  - Every oversight classified per the three-way triage and resolved in the
    corresponding lane.
- Verification commands:
  - `node tests/playwright/walker/run.mjs --protocol <name>` per protocol.
  - `node tests/playwright/walker/run_all.mjs` after all 11 land.

### WP-CONTENT-\*: triaged YAML / renderer fixes

- Owner: `coder`.
- Touch points: per-protocol YAML, materials, or runtime module per triage.
- Depends on: any open WP-SCALE-\* that surfaced the fix.
- Acceptance criteria:
  - Fix is renderer-gap or content-gap; never per-protocol walker branch; spec-gap
    pauses for user.
  - YAML gates re-run if YAML touched; tsc clean if TS touched; affected walker re-run.
- Verification commands:
  - YAML gates as appropriate; affected walker run.

### WP-GESTURE-EXPAND-\*: per-gesture dispatch + chrome

- Owner: `coder`.
- Touch points: `src/scene_runtime/dispatch/<gesture>.ts`,
  `src/scene_runtime/chrome/<gesture>_surface.ts`.
- Depends on: a WP-SCALE-\* that exercises that gesture.
- Acceptance criteria:
  - One gesture per WP; lands only when content actually requires it.
- Verification commands:
  - `node tests/playwright/test_chrome_<gesture>.mjs` -- expect green.

## Tactical drift enforcement (supplements `## Subagent operating rules`)

The constitutional rules live near the top of this plan under
`## Subagent operating rules`, `## Reviewer rejection criteria`,
`## Required subagent report format`, and `## Manager dispatch template`. This section
adds tactical enforcement: a forbidden-pattern catalog, grep-based drift-watch, and the
mandatory seven-part dispatch brief structure. The two sets compose: subagents read the
constitutional rules first, then this tactical section, then their WP-specific brief.

### Five-philosophy anchor (cite by name)

Every subagent dispatch brief MUST cite `docs/REPO_STYLE.md` `## Core philosophies`
verbatim and call out the philosophy the WP leans on. The reviewer subagent rejects
diffs whose handoff report does not cite a philosophy when the WP makes a judgment call.

| Philosophy                          | How it applies in this plan                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Long-term over short-term**       | No "temporary" types, no `// TODO: revisit` shortcuts in `contract.ts`, no quick `any` to silence tsc. If the durable fix takes one more patch, take the patch.                           |
| **Fix the design, not the symptom** | Walker fails to advance -> triage (renderer-gap / content-gap / spec-gap) -> fix the right layer. Never patch the walker to skip. Never widen the contract to swallow YAML inconsistency. |
| **Fresh subagent per task**         | Every WP dispatches a new subagent. No SendMessage chains across WPs. Each subagent reads `docs/REPO_STYLE.md` + relevant specs from a clean context.                                     |
| **Atomic task decomposition**       | One WP = one owner = one verification step = one patch (or a tight 2-patch pair for contract / types). WPs that look bigger get split before dispatch.                                    |
| **Finish the obvious**              | A WP whose tsc passes but whose `docs/CHANGELOG.md` entry is missing is NOT done. A WP that fixes a bug but leaves the same bug in the next listed file is NOT done.                      |

### Forbidden-pattern catalog (hard rejects for the reviewer)

These patterns are auto-rejected. Reviewer subagent fails the diff on sight; manager
re-dispatches with the rejection cited verbatim.

1. **`any` to silence tsc.** No `as any`, no `: any` parameter, no `as unknown as T`
   double-cast. The only permitted `as` is inside a brand constructor or a documented
   boundary adapter per `typescript-engineer` rules. Compiler errors get root-caused;
   they do not get muted.
2. **`try` / `catch` to hide YAML mismatch.** A loader that wraps an unknown field in
   `try { x } catch { undefined }` is a hard reject. Missing fields throw loudly;
   the fix lands in the Python builder under WS-GENERATED-DATA, not in the loader.
3. **`?? defaultValue` defensive defaults on required YAML fields.** If
   `protocol.entry_step` is missing, the loader throws. It does not default to
   `steps[0].step_name`. Defensive defaults hide content bugs and prevent
   `validation/validate.py` from catching the issue.
4. **`// @ts-ignore` / `// @ts-expect-error` outside negative type tests.** These are
   permitted only in `tests/types/` to prove an intentional rejection. Anywhere else
   is a hard reject.
5. **Inline literal YAML data inside TypeScript.** The runtime never carries hardcoded
   protocol / scene / object / material data. If a fixture is needed (smoke fixture,
   walker test), it lives under `tests/playwright/fixtures/` or `tests/_fixtures/`,
   never inside `src/scene_runtime/`.
6. **Per-protocol branches in the runtime.** No `if (protocolName === '...')`, no
   switch on `step_name`, no `if (sceneId === '...')` other than registry lookup.
   The runtime is generic; per-protocol behavior comes from YAML.
7. **Per-protocol branches in the walker.** `tests/test_walker_no_step_branches.py`
   already enforces this. Diffs that touch the walker re-run this test.
8. **Spec-gap fixed by inventing vocabulary.** A new `gesture`, new `scene_operation`
   primitive, new `validator` preset, or new `state_field` primitive type added by a
   runtime patch is a hard reject. Spec gaps pause per the Q9 resolution.
9. **Renderer reading raw YAML.** The runtime never reads `content/*.yaml` directly.
   Every read goes through `generated/*.ts`. A diff that imports a YAML parser into
   `src/scene_runtime/` is a hard reject.
10. **Scene-inheritance resolution in TypeScript.** `extends`, `add_placements`,
    `remove_placements`, `deactivate_placements`, `reposition_placements` are
    Python-side. A TS diff that interprets any of those keys is a hard reject; the
    fix lands in `pipeline/build_scene_data.py`.
11. **State mutation outside `applySceneOperation`.** Render functions, dispatch
    handlers, and chrome components never mutate `RuntimeWorld` directly. Every
    state write flows through a typed `scene_operation` primitive applied by the
    render core. Direct property assignment on a runtime object is a hard reject.
12. **`Object.assign` / spread to widen contract types.** No `{ ...contractField,
extraField }` that adds fields not declared in the contract. Contract is closed
    per the design philosophy.
13. **Silent fallback values for materials.** A missing material in
    `generated/materials_data.ts` throws at load. The renderer does not default to
    "water" or transparent. Missing materials surface as content-gap fixes.
14. **`setTimeout` / `setInterval` against real time in tests.** All test-clock-eligible
    work goes through `render/clock.ts`. A Playwright test that calls
    `page.waitForTimeout(60000)` to wait out a `TimedWait` is a hard reject.
15. **Edits to `src/scenes/`.** The freeze stands. Any diff touching `src/scenes/` is
    a hard reject (also caught by `tests/test_scenes_freeze_baseline.py`).
16. **Imports from legacy `src/*.ts` into `src/scene_runtime/`.** Caught by
    `tests/test_scene_runtime_no_legacy_imports.py`. The lint lands at M1 entry; any
    diff that breaks it is a hard reject.
17. **`docs/CHANGELOG.md` entry missing or vague.** Every patch has an entry under
    today's date, categorized per `docs/REPO_STYLE.md` rotation rules, citing the
    WP id and the philosophy invoked. "Misc cleanup" is a hard reject.
18. **WP closed without verification command output quoted in handoff.** Per the
    `delegate-manager-to-subagents` evidence-first rule, the handoff quotes the
    exact success line from each verification command. "All green" without evidence
    is treated as a false-green claim; manager re-dispatches.

### Mandatory dispatch brief (every WP)

The manager dispatches every WP using this seven-part template. The template is
non-negotiable; reviewer subagent rejects briefs that drop any part.

```
1. Plan reference: /Users/vosslab/.claude/plans/serene-stargazing-moore.md#<WP-id>
2. Context bootstrap (read in this order BEFORE any edit):
   - docs/REPO_STYLE.md  (Core philosophies, cite by name in handoff)
   - docs/PRIMARY_CONTRACT.md  (hard invariants)
   - docs/PRIMARY_SPEC.md  (schema)
   - this plan's `## Tactical drift enforcement` section (forbidden-pattern catalog)
   - the WP's listed spec docs under docs/specs/
   - `## Forbidden-pattern catalog` above
   - docs/PYTHON_STYLE.md OR docs/TYPESCRIPT_STYLE.md per file kind
3. Background: <one paragraph: why this WP exists and what depends on it>
4. Scope: verbatim copy of the WP's `Acceptance criteria` from this plan.
5. Boundaries:
   - files in scope: <explicit list>
   - files NOT in scope: <call out src/scenes/, legacy src/*.ts, content/*.yaml unless
     the WP is content-side>
   - vocabulary you may NOT extend: scene_operation primitives, gestures, validator
     presets, state_field primitive types
   - prototype-only TypeScript fields are forbidden
6. Verification: literal commands from the WP's `Verification commands`. Quote the
   exact success line in the handoff. "Looks green" is not acceptable.
7. Handoff template:
   - status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
   - philosophy invoked: <one of the five, by name>
   - files changed: <list, each tagged with the acceptance item it satisfies>
   - verification commands run + exact success lines quoted
   - any forbidden pattern considered and rejected (one line each)
   - any spec-gap, content-gap, or renderer-gap surfaced (triage classification)
   - obvious follow-ons taken (per Finish the obvious)
```

### Subagent pre-flight (every WP, first three actions)

Before any edit, every subagent:

1. Reads `docs/REPO_STYLE.md` `## Core philosophies` and names which one this WP leans
   on. The name appears in the handoff.
2. Reads the `## Forbidden-pattern catalog` section above. The handoff confirms each
   relevant pattern was considered.
3. Runs the verification commands listed in the WP **before any edit** to capture the
   baseline. If the baseline is already red, the subagent stops and reports BLOCKED;
   it does not stack a new patch on a broken baseline (Stop-on-failure rule).

### Reviewer subagent checklist (every patch)

The reviewer (separate fresh subagent per WP) reads the diff and applies this
checklist verbatim. Any failure is a blocker; the manager re-dispatches the original
coder with the failure cited.

```
[ ] Diff is scoped to the WP's listed files.
[ ] No forbidden pattern from `## Forbidden-pattern catalog` appears in the diff.
[ ] Every new module and every EXPORTED type / function is documented (one-line
    purpose comment). File-local obvious helpers do not require comments.
[ ] Handoff cites one of the five core philosophies by name.
[ ] Handoff quotes the verification commands' exact success lines.
[ ] `docs/CHANGELOG.md` entry present, dated, categorized, citing WP id and
    philosophy.
[ ] No `any`, no `try`/`catch` over a YAML field, no `?? default` for required YAML.
[ ] No per-protocol or per-step branch in runtime or walker.
[ ] No new vocabulary (gesture, scene_operation, validator preset, state_field type).
[ ] No raw YAML read in src/scene_runtime/.
[ ] No edit under src/scenes/.
[ ] No legacy import from src/*.ts into src/scene_runtime/.
[ ] If WP touches src/: tsc clean.
[ ] If WP touches content/: all three YAML gates pass.
[ ] If WP touches tests/: relevant pytest / node test green.
[ ] Obvious follow-on(s) taken or explicitly deferred with reason.
```

### Manager enforcement

The manager (this plan's operator):

- Dispatches a fresh subagent per WP. No SendMessage chains across WPs.
- Reads every diff read-only before dispatching the reviewer.
- Does NOT edit code, tests, or docs directly. The manager coordinates and
  integrates; all file changes belong to subagents.
- Does NOT commit. Humans commit. The manager prepares + verifies + reports.
- Halts the plan immediately if any hard-reject pattern lands on `main`. The fix is
  a revert + re-dispatch, not a follow-up patch that papers over the hack.
- Updates `docs/CHANGELOG.md` only via a docs subagent.

### Drift-watch (per-milestone)

At every milestone exit, the manager runs a 5-minute drift audit:

- `grep -rn ': any\|as any\|as unknown as\|@ts-ignore\|@ts-expect-error' src/scene_runtime/`
  -- expect zero hits outside the negative-type-test directory.
- `grep -rn 'try {' src/scene_runtime/` -- review every hit against the YAML-mismatch
  rule. Exactly one `try` is permitted at the runtime entry per `## Top-level UI error
boundary exception`.
- `grep -rn 'if.*=== .*protocol\|switch.*step_name\|switch.*sceneId'
src/scene_runtime/ tests/playwright/walker/` -- expect zero per-protocol branches.
- Narrow YAML-read check (preferred, low-noise):
  `grep -rnE "from .*yaml|require\(.*yaml|content/.*\.yaml|readFile.*\.yaml" src/scene_runtime/`
  -- expect zero hits; any hit is a blocker.
- Broad YAML mention (optional, noisy): `grep -rn 'yaml\|YAML' src/scene_runtime/`
  -- review every hit only if the narrow check is clean and a YAML-read is
  suspected anyway. Comments referencing YAML are fine.
- `git log --since="<milestone-start>" -- src/scene_runtime/ | wc -l` -- sanity check
  on patch count; if a milestone closes with double the planned patches, the WPs
  were too big and the manager logs a sizing lesson in `docs/TODO.md`.

Drift-watch failures land in `docs/CHANGELOG.md` as `### Decisions and Failures`
entries. The lesson stays in the changelog so future plans can grep for it.

### When the rules conflict with the plan

If a subagent finds that following an acceptance criterion would require violating a
forbidden pattern, the subagent reports BLOCKED with both citations. The manager
escalates to the user; the subagent does NOT improvise a third path. This is the
ultimate anti-drift rule: when uncertain, stop and ask.

## Acceptance criteria and gates

- Per-patch gate: each WP's verification commands pass; one reviewer subagent reads
  the diff and returns no blockers.
- TypeScript gate (hard): `npx tsc --noEmit -p src/tsconfig.json` exits 0 after every
  patch that touches `src/`.
- YAML gate (hard): all three YAML tools continue to pass on `main` after every patch
  that touches `content/`.
- Freeze gate (hard): `tests/test_scenes_freeze_baseline.py` and
  `tests/test_scenes_legacy_banner.py` continue to pass; `src/scenes/` stays untouched.
- Legacy-import gate (hard): `tests/test_scene_runtime_no_legacy_imports.py` continues
  to pass; no `src/scene_runtime/` file imports from any legacy `src/*.ts`.
- Walker gate (hard for M5 onward): `tests/test_walker_no_step_branches.py` continues
  to pass; no per-protocol `step_name` switch enters the walker.
- Visible-render gate (hard for every WP from M2 onward): a one-Playwright-test
  before / after assertion accompanies any change that mutates rendered DOM.
- Per-mini-protocol completion gate (PRIMARY_CONTRACT item 4): a mini-protocol is not
  marked complete in `docs/CHANGELOG.md` without a green walker run + before / after
  screenshots in `test-results/<protocol_name>/`.
- HTML output gate (PRIMARY_CONTRACT item 2): no monolithic HTML artifact may exist
  under `dist/`; `pytest tests/test_protocol_html_build.py` asserts this.
- `dist/` and `test-results/` stay-gitignored gate: `git status --porcelain` on either
  directory must be empty in every patch that builds.
- Stop-on-failure rule (hard, `main` workflow): if any integration gate fails on
  `main`, no additional runtime patch lands until the failing gate is green again. The
  human commits the fix; the manager re-runs gates before dispatching the next WP.
- Runtime behavior gates (asserted by node + Playwright tests where noted):
  - Runtime must display the exact current step prompt verbatim.
  - Runtime must NOT advance on wrong target.
  - Runtime must show feedback on wrong interaction when YAML defines feedback.
  - Runtime must NOT mutate state before the validator passes.
  - Every interaction target in the current step must correspond to a visible DOM
    affordance OR an intentional chrome surface (prompt, modal, input).
  - `SceneChange` must visibly replace the scene viewport, not only update internal
    state. `SceneChange` preserves `RuntimeWorld` protocol state and object state
    unless YAML scene operations declare otherwise; it only changes the active scene.
  - `ObjectStateChange` must update both internal state and visual state.
  - `TimedWait` implementation is minimal for this plan: display duration, accept
    test-clock advance, emit `<equipment_name>_elapsed`, continue. No animation polish,
    no real-time-accuracy guarantees beyond basic production behavior.

## Test and verification strategy

- Unit checks: node tests per-primitive (`test_render_apply.mjs`,
  `test_render_clock.mjs`, `test_render_request.mjs`, `test_loader_world.mjs`,
  `test_liquid_state.mjs`, `test_layout_integration.ts`, `test_dispatch_click.ts`).
- Integration checks: Playwright headless snapshot tests
  (`test_base_scene_render.mjs`, `test_visible_slice.mjs`,
  `test_chrome_scene_frame_prompt.mjs`, `test_chrome_feedback_next.mjs`,
  `test_chrome_adjust_pilot.mjs`, `test_well_plate_static.mjs`,
  `test_well_plate_groups.mjs`, `test_well_plate_visual_state.mjs`).
- Smoke checks: `pytest tests/ -q` after every patch; the existing 520+ tests stay
  green.
- Full regression: walker `run_all.mjs` across all 12 mini-protocols at M6 close.
- Test-clock discipline: every Playwright test that touches `TimedWait` uses the test
  clock; no real-time waits longer than 1 second per test.
- Failure semantics: any failed gate blocks the dependent WP. Failures during a
  walk-through pass through the three-way triage (renderer-gap / content-gap /
  spec-gap) and route to the right lane; per the design philosophy, fixes never bypass
  the walker.

## Migration and compatibility policy

- Additive rollout: the new runtime tree lands under `src/scene_runtime/` alongside the
  frozen `src/scenes/` and the legacy `src/*.ts` files. Nothing in `src/scenes/` or
  legacy `src/*.ts` is edited.
- Backward compatibility: no consumer of the old `contract.ts` `completionPath` shape
  remains in the runtime path after M1. The walker, dispatch, render core, chrome, and
  HTML builder all bind to the realigned contract.
- Deletion criteria for legacy paths: the legacy `src/` tree (everything outside
  `src/scene_runtime/`) retires in a separate later plan once the new runtime drives
  every mini-protocol and the walker is green on all 12 mini-protocols. This plan does not
  delete legacy code.
- Rollback strategy: each patch is independently revertable via `git revert` on `main`.
  The new runtime tree under `src/scene_runtime/` is isolated; reverting any new file
  removes that capability without breaking the YAML backbone or the legacy tree.

## Risk register

| Risk                                                              | Impact | Trigger                                                                             | Owner          | Mitigation                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generated data missing fields the runtime needs                   | high   | loader fails to construct `RuntimeWorld`; runtime imports a field that is undefined | reviewer       | WP-GENERATED-DATA-1 is a hard gate before any loader work; builder patches under WP-GENERATED-DATA-2+ land before WP-LOADER-1.                                                                                                |
| Scene inheritance accidentally reimplemented TypeScript-side      | high   | TS loader reads `extends` / `add_placements` / `remove_placements`                  | reviewer       | WP-GENERATED-DATA-1 asserts inheritance is resolved Python-side; if not, fix the builder. Boundary lint catches drift in review.                                                                                              |
| Visual-state rendering ambiguity stalls the pilot                 | high   | `ObjectStateChange` writes a field but no `visual_state` matches                    | coder          | Pilot 1 minimalism: one visible delta per `material_name` is sufficient; per-volume fill detail deferred to WS-CONTENT.                                                                                                       |
| Well-plate adapter is the first real render target and stalls     | high   | M2 cannot ship a green well-plate snapshot                                          | coder          | Pilot 0 (WP-VISIBLE-SLICE-1) renders a simple bottle, NOT the well-plate; well-plate enters at M2 with the runtime spine already proven.                                                                                      |
| Bundling decision left ambiguous, M4 stalls                       | high   | HTML builder cannot decide bundling                                                 | coder          | esbuild locked in `## Architecture boundaries and ownership / Bundling decision`; WP-VISIBLE-SLICE-1 proves the bundle path.                                                                                                  |
| `TimedWait` real timers cause Playwright flake                    | medium | walker waits real minutes; tests time out or flake                                  | tester         | Clock abstraction (`render/clock.ts`); test clock advances on Playwright command; required for WP-WALKER-ENGINE-1.                                                                                                            |
| Vocabulary drift returns inside a new runtime module              | high   | a new module ships fields not in `docs/specs/`                                      | reviewer       | WP-CONTRACT-1 / -2 own the closed vocabulary; every downstream WP cites the contract; reviewer reads every diff.                                                                                                              |
| Walker surfaces affordance gaps that tempt a per-protocol branch  | high   | walker run cannot advance through visible DOM                                       | tester         | Three-way triage; `tests/test_walker_no_step_branches.py` is the hard enforcement.                                                                                                                                            |
| Per-mini-protocol HTML bloats with shared chrome inlined          | medium | each `dist/<name>.html` carries chrome inline                                       | coder          | Chrome ships as one shared bundle referenced per HTML; HTML builder verifies bundle dedup.                                                                                                                                    |
| Mobile breakpoint becomes a blocking concern at WS-CHROME-MINIMAL | low    | manual narrow-viewport review surfaces broken layout                                | ui-ux-engineer | Mobile is tier 2; failures log to `docs/TODO.md`, do not gate.                                                                                                                                                                |
| Legacy `src/*.ts` accidentally re-linked into the runtime         | high   | import from any legacy `src/*.ts` appears in a runtime module                       | reviewer       | `tests/test_scene_runtime_no_legacy_imports.py` is the lint; lands at M1 entry.                                                                                                                                               |
| Spec gap pauses execution; user is offline                        | medium | walker surfaces a YAML-inexpressible affordance                                     | reviewer       | Spec gap pauses the affected WP only; other lanes continue. Spec gap surfaces in `docs/TODO.md` with a one-line proposal.                                                                                                     |
| Pilot 1 chosen too aggressively (well-plate-first); slip cascades | medium | WP-PILOT1-1 cannot complete; M5 blocked                                             | coder          | Pilot 0 (smoke, simple object) ships first and proves the runtime. Pilot 1 downgrades to `mtt_reagent_prep` only if WP-WELLPLATE-ADAPTER-1C (visual-state, the semantic gate) slips; 1A / 1B stalls do not trigger downgrade. |
| Screenshots accidentally committed                                | low    | `git add` picks up `test-results/`                                                  | reviewer       | `.gitignore` enforced; WP-HTML-BUILDER-1 acceptance asserts `git status --porcelain` empty for `dist/` and `test-results/`.                                                                                                   |

## Rollout and release checklist

- [ ] M0 exit: WP-AUDIT-1 + WP-SPEC-INDEX-1 committed; markdown links green.
- [ ] M0.5 exit: WP-GENERATED-DATA-1 + any -N builder patches committed; YAML gates
      green; generated data carries every field the runtime needs.
- [ ] M1 exit: WP-CONTRACT-1 + WP-CONTRACT-2 + WP-LOADER-1A + WP-LOADER-1B +
      WP-LOADER-1C + WP-RENDER-1A + WP-RENDER-1B + WP-RENDER-1C + WP-RENDER-1D +
      WP-DISPATCH-1 + WP-NO-LEGACY-IMPORTS-1 committed; tsc clean; pytest green; legacy-
      import lint green.
- [ ] M1.5 exit: WP-BASE-SCENE-RENDER-1 committed and green (real scene renders,
      bounding boxes nonzero, no unintended origin stacking); WP-VISIBLE-SLICE-1
      (and optionally -2) committed; smoke HTML loads in
      Playwright; one object renders; one click updates one state; one visible DOM delta
      asserted; `dist/` + `test-results/` gitignored.
- [ ] M2 exit: WP-LAYOUT-AUDIT-1 + WP-LAYOUT-INTEGRATE-1 + WP-WELLPLATE-ADAPTER-1A +
      WP-WELLPLATE-ADAPTER-1B + WP-WELLPLATE-ADAPTER-1C + WP-LIQUID-1 committed;
      well-plate snapshot green at all three levels (static cells, group targets,
      per-cell visual state).
- [ ] M3 exit: WP-CHROME-MINIMAL-1A + WP-CHROME-MINIMAL-1B + WP-CHROME-ADJUST-1A +
      WP-CHROME-ADJUST-1B committed; `ui-ux-engineer` review pass at M3 exit.
- [ ] M4 exit: WP-HTML-BUILDER-1 + WP-PILOT1-1 committed; pilot loads end-to-end in a
      real browser; no monolith.
- [ ] M5 exit: WP-WALKER-ENGINE-1 + WP-WALKER-PILOT-1 committed; `<PILOT1>` walker
      exits 0; test-clock controls `TimedWait`; no per-step branches.
- [ ] M6 exit: WP-SCALE-A-1 ... WP-SCALE-K-1 + WP-CONTENT-_ + WP-GESTURE-EXPAND-_
      committed; `run_all.mjs` exits 0 across all 12 mini-protocols; YAML gates green; freeze
      gates green.
- [ ] After M6: `docs/CHANGELOG.md` summary; `docs/TODO.md` opens for launcher /
      welcome polish, mobile polish, legacy `src/` retirement.

## Documentation close-out requirements

- Active plan: this plan file at
  `/Users/vosslab/.claude/plans/serene-stargazing-moore.md`.
- New audit docs:
  - `docs/active_plans/yaml_to_browser_audit.md` (lands as patch 1).
  - `docs/active_plans/scene_runtime_spec_index.md` (lands as patch 2).
  - `docs/active_plans/generated_data_audit.md` (lands at M0.5 entry).
  - `docs/active_plans/layout_engine_audit.md` (lands at M2 entry).
- `docs/CHANGELOG.md` entries: one per patch.
- `docs/USAGE.md`: append sections for `pipeline/build_runtime_bundle.sh` and
  `pipeline/build_protocol_html.py`.
- `docs/TODO.md` entries as Tier-2 / Tier-3 items surface: launcher / welcome polish,
  mobile polish, deferred per-protocol cosmetic issues, legacy `src/*.ts` retirement
  plan.

## Patch plan and reporting format

- Patch 1: WS-AUDIT `docs/active_plans/yaml_to_browser_audit.md` + `docs/CHANGELOG.md`.
- Patch 2: WS-SPEC-CONSOLIDATION `docs/active_plans/scene_runtime_spec_index.md` +
  `docs/CHANGELOG.md`.
- Patch 3: WS-GENERATED-DATA audit `docs/active_plans/generated_data_audit.md` +
  `docs/CHANGELOG.md`.
- Patches 4-N (variable): WS-GENERATED-DATA builder patches (only if audit surfaces
  gaps).
- Patch N+1: WS-CONTRACT `contract.ts` realignment + `docs/CHANGELOG.md`.
- Patch N+2: WS-CONTRACT `types.ts` realignment + `docs/CHANGELOG.md`.
- Patch N+3a: WS-LOADER-1A protocol loader + test + `docs/CHANGELOG.md`.
- Patch N+3b: WS-LOADER-1B scene+object loader + test + `docs/CHANGELOG.md`.
- Patch N+3c: WS-LOADER-1C material loader + RuntimeWorld + real-generated-data test
  - `docs/CHANGELOG.md`.
- Patch N+4a: WS-RENDER-1A ObjectStateChange + SceneChange + test +
  `docs/CHANGELOG.md`.
- Patch N+4b: WS-RENDER-1B CursorAttach + LayoutMove + test + `docs/CHANGELOG.md`.
- Patch N+4c: WS-RENDER-1C TimedWait + clock abstraction + test +
  `docs/CHANGELOG.md`.
- Patch N+4d: WS-RENDER-1D RenderRequest queue + test + `docs/CHANGELOG.md`.
- Patch N+5: WS-DISPATCH `src/scene_runtime/dispatch/click.ts` + tests +
  `docs/CHANGELOG.md`.
- Patch N+6: WS-NO-LEGACY-IMPORTS `tests/test_scene_runtime_no_legacy_imports.py` +
  `docs/CHANGELOG.md`.
- Patch N+7: WS-BASE-SCENE-RENDER `render/scene.ts` + `test_base_scene_render.mjs`
  - `docs/CHANGELOG.md`.
- Patch N+8: WS-VISIBLE-SLICE `bundle/entry.ts` + `pipeline/build_runtime_bundle.sh` +
  `tests/playwright/fixtures/_smoke_one_object.html.template` + smoke fixture +
  Playwright test + `.gitignore` + `docs/CHANGELOG.md`. Built `dist/` outputs
  generated-only, not committed.
- Patch N+9: WS-LAYOUT-AUDIT `docs/active_plans/layout_engine_audit.md` +
  `docs/CHANGELOG.md`.
- Patch N+10: WS-LAYOUT-INTEGRATE `src/scene_runtime/layout/index.ts` + test +
  `docs/CHANGELOG.md`.
- Patch N+11a: WS-WELLPLATE-ADAPTER-1A static cells + test + `docs/CHANGELOG.md`.
- Patch N+11b: WS-WELLPLATE-ADAPTER-1B group targets + test + `docs/CHANGELOG.md`.
- Patch N+11c: WS-WELLPLATE-ADAPTER-1C per-cell visual state + test +
  `docs/CHANGELOG.md`.
- Patch N+12: WS-LIQUID + test + `docs/CHANGELOG.md`.
- Patch N+13a: WS-CHROME-MINIMAL-1A scene-frame + prompt + test +
  `docs/CHANGELOG.md`.
- Patch N+13b: WS-CHROME-MINIMAL-1B feedback + next + validator advance + test +
  `docs/CHANGELOG.md`.
- Patch N+14a: WS-CHROME-ADJUST-1A generic adjust dispatch + test +
  `docs/CHANGELOG.md`.
- Patch N+14b: WS-CHROME-ADJUST-1B Pilot 1 panel bindings + test +
  `docs/CHANGELOG.md`.
- Patch N+15: WS-HTML-BUILDER `pipeline/build_protocol_html.py` +
  `tests/test_protocol_html_build.py` + `docs/USAGE.md` + `.gitignore` +
  `docs/CHANGELOG.md`.
- Patch N+16: WS-PILOT1 manual end-to-end + `docs/CHANGELOG.md`.
- Patch N+17: WS-WALKER-ENGINE + tests + `docs/CHANGELOG.md`.
- Patch N+18: WS-WALKER-PILOT pilot green + `docs/CHANGELOG.md`.
- Patches N+19 ... N+29: WS-SCALE-A through WS-SCALE-K (one per patch initially; may
  batch after three consecutive greens) + `docs/CHANGELOG.md` per patch.
- WS-CONTENT and WS-GESTURE-EXPAND patches land as needed, one fix bundle per patch.

## Pipeline script naming review (deferred; after `tools_split_and_consolidate` lands)

The `tools_split_and_consolidate.md` plan moves codegen scripts from `tools/` to
`pipeline/`. After that move lands, revisit the script filenames for action clarity.
Current names mix verbs (`build_`, `generate_`, `normalize_`, `check_`) and omit the
output format (`_to_ts`). A consistent verb-object-output convention reads better when
the directory is named `pipeline/`.

Candidate renames (post-move, not part of `tools_split_and_consolidate.md` scope unless
that manager picks them up):

| Current path                                        | Action it performs                           | Suggested rename                         |
| --------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `pipeline/build_protocol_data.py`                   | compile protocol YAML to TS exports          | `compile_protocols_to_ts.py`             |
| `pipeline/build_scene_data.py`                      | compile scene YAML to TS exports             | `compile_scenes_to_ts.py`                |
| `pipeline/generate_svg_globals.py`                  | extract + namespace SVG assets to TS modules | `compile_svg_assets_to_ts.py`            |
| `pipeline/normalize_svg.py` + `normalize_svg_v2.py` | canonicalize raw SVG assets in place         | merge into one `normalize_svg_assets.py` |
| `pipeline/check_svg_pipeline.py`                    | validate SVG pipeline output                 | `validate_svg_pipeline.py`               |

Convention proposed for every `pipeline/` script: `<verb>_<object>[_to_<output>].py`.
Verbs from a closed set: `compile`, `normalize`, `validate`, `extract`, `bundle`.
Output suffix mandatory when the script emits a file format (`_to_ts`, `_to_json`,
`_to_html`).

Deferred. Not gating on M0. Tracked as a `docs/TODO.md` entry once
`tools_split_and_consolidate.md` closes. If the other manager picks up the rename
during their move, this section closes; otherwise it becomes a follow-up WP after M6
under WS-CONTENT housekeeping.

## Resolved decisions

Reviewer accepted suggested answers to Q1-Q9:

- **Q1 resolved**: strict boundary. Chrome owns prompts, next, feedback, modal, input
  controls. Scene viewport owns only rendered lab objects and scene layout. Scene
  adapters never render prompt or chrome.
- **Q2 resolved**: mobile tier 2. One narrow-viewport smoke; no runtime block on
  mobile polish.
- **Q3 resolved**: WP-LAYOUT-AUDIT-1 decides mine-vs-rebuild on evidence. No pre-approval
  needed.
- **Q4 resolved**: rebuild-clean under `src/scene_runtime/`. Legacy `src/*.ts` is
  read-only behavioral evidence; no in-place rehab.
- **Q5 resolved**: Pilot 0 = bottle smoke; Pilot 1 = `mtt_solubilization_readout`;
  downgrade to `mtt_reagent_prep` is mechanical after one failed fix pass on
  WP-WELLPLATE-ADAPTER-1C (per-cell visual state - the semantic gate).
- **Q6 resolved**: `test-results/` stays gitignored; no `tests/baselines/` screenshot
  baselines in this plan; browser runtime churns too much early to commit baselines.
- **Q7 resolved**: `ui-ux-engineer` reviews once at M3 exit, NOT per chrome patch.
  Per-patch UI review would slow runtime delivery.
- **Q8 resolved**: launcher / welcome polish deferred (M-Deferred lane, 0 patches in
  this plan). Direct URL to `dist/<protocol_name>.html` is the access path during M4-M6.
- **Q9 resolved**: spec-gap pause policy. Spec gap pauses the affected WP and surfaces
  a `docs/TODO.md` entry with a one-paragraph proposal. The **manager** may continue
  unrelated lanes; subagents do not decide independently. Spec-gap escalates to a
  manager-blocking question to user only if it blocks the current pilot or the next
  ready WP on the critical path.

## Open questions and decisions needed

None outstanding. Q1-Q9 closed under `## Resolved decisions` above. New questions
surface in `docs/TODO.md` as they arise during execution; spec-gap pauses follow Q9
resolution (TODO entry + continue other lanes; escalate to user only if critical-path
blocked).
