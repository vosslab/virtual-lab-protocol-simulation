# NEW2 test strategy

NEW2 Task #90 test-strategist deliverable. Doc-only. This file does not author
test code; it specifies what each gate must prove, the order the gates run in,
and the exit criteria that close NEW2.

Cross-links:

- `new1_5_layout_hardening_results.md`
- Forward references (produced by sibling NEW2 lanes, not yet on disk):
  - `docs/active_plans/new2_css_native_production_blocker_plan.md` (Lane P)
  - `docs/active_plans/new2_well_plate_adapter_rect_audit.md` (Lane W)
  - `docs/active_plans/new2_production_viewport_overflow_audit.md` (Lane O)

The forward-reference paths are listed as code spans rather than Markdown links
so the markdown-links pytest gate stays green until those lanes land their
files. Once those files exist, convert the code spans to proper relative
links in a follow-up edit.

## Purpose

Test strategy for NEW2's two production workstreams: the well-plate adapter
rect fix (Workstream 1, from Lane W) and the production viewport overflow fix
(Workstream 2, from Lane O). This doc defines the gates that run before,
during, and after implementation so that NEW2 closes with measurable evidence
rather than informal "looks right" claims.

The strategy is layered: cheap static gates run first, Playwright behavior
gates run after each workstream lands, and the scorecard regression sweep is
the final whole-system check.

## Test surfaces

### Unit and Playwright tests for well-target rects

Goal: assert that the `well_plate` scene adapter generates a rect per
sub-target with `width > 0`, `height > 0`, no `NaN`, and no negative values.

Scope of what the test must prove:

- For each declared sub-target on a 96-well plate (A1 through H12), the
  adapter returns a finite rect.
- Rect math is derived from CSS-native layout output, not hard-coded pixel
  constants.
- Per-row and per-column rects are non-overlapping in the dominant axis.
- Off-board sub-targets (if any) are rejected by the adapter rather than
  silently emitting a zero-area rect.

Where the assertions live: a new Playwright spike (see Test file locations)
or an extension to the existing `spike_built_app_*.mjs` spike file. No
production code is modified to satisfy the test.

### Built-app click test

Goal: clicking a visible sub-target rect reaches the dispatcher without a
"Wrong target" console warning.

Scope:

- Launch the built app from `dist/` via `run_web_server.sh`.
- Drive a click on a visible sub-target (for example `well_plate.A1`).
- Capture the browser console.
- Assert no `Wrong target` warning emitted during the click.
- Assert the dispatcher recorded the expected `target` and `gesture`.

This gate proves that Workstream 1's rect math is wired through to the
validator and dispatcher, not just to the visible DOM.

### ObjectStateChange and re-render proof

Goal: prove the renderer actually re-runs in response to a validated click
and that the re-render is incremental rather than a full DOM rebuild.

Scope:

- Pre-click: snapshot a renderer-invocation counter exposed for instrumentation.
- Pre-click: snapshot the count of direct children under the scene root.
- Click a sub-target whose interaction carries an `ObjectStateChange` response.
- Post-click: assert the renderer-invocation counter strictly increments.
- Post-click: assert the spike adapter invocation count strictly increments.
- Post-click: assert the DOM children delta equals zero (re-render reused
  existing children rather than tearing down and rebuilding the scene).

This is the regression gate against the Lane R re-render probe findings.

### render_and_dump and precheck proof

Goal: a fresh built-app dump fed into the precheck reports
`hard_fail_count = 0` and a populated `primary_ratio_advisory`.

Scope:

- Run `render_and_dump.mjs` against the built app for each in-scope scene.
- Run `precheck.mjs` on each dump.
- Assert `hard_fail_count == 0` in every precheck output.
- Assert `primary_ratio_advisory` is present and non-empty for every scene
  that declares a primary ratio.

This gate proves Workstream 2's viewport overflow fix actually clears the
precheck signal that motivated the workstream.

### Scorecard regression check

Goal: no scene regresses materially against the Task #69 baseline.

Scope (all assertions against `experiments/css_native_layout/score_layout.mjs`
output):

- All 10 scenes in scope report `hard_fail_count == 0`.
- `well_plate_96_zoom` score is at least 80.
- No scene's score drops by more than 5 points relative to its Task #69
  baseline value.

The Task #69 baseline is the reference point because that is the last point
where the scorecard was recorded as a clean snapshot prior to NEW2.

### Naming and style checks

Run as cheap static gates before any behavior work:

- pyflakes via `tests/test_pyflakes_code_lint.py`.
- ASCII compliance via `tests/test_ascii_compliance.py`.
- Markdown link validity via `tests/test_markdown_links.py`. Eight
  pre-existing failures are noted in the NEW0 evidence package and are
  tracked separately; this gate must not add to that count.
- `npx tsc --noEmit -p tsconfig.json` baseline at 175 diagnostics. The gate
  is that NEW2 does not increase this number.
- Targeted grep over spike files for newly introduced style violations:
  `camelCase` identifiers in YAML, `Id`-suffixed names, `as any`,
  `@ts-ignore`, and `as unknown as` casts.

### Separating pre-existing TypeScript errors from new ones

The repo has 175 pre-existing tsc diagnostics. NEW2 must not introduce new
ones. Procedure:

1. Before any production edit, run `npx tsc --noEmit -p tsconfig.json` and
   write its output to `/tmp/tsc_baseline.txt`.
2. After each workstream lands, run `npx tsc --noEmit -p tsconfig.json` and
   write its output to `/tmp/tsc_current.txt`.
3. Diff the two files.
4. Classify each new diagnostic by source file:
   - If the file is one Workstream 1 or Workstream 2 touched, it is
     in-scope and must be fixed before the workstream closes.
   - If the file is not touched by NEW2, the diagnostic is a discovery,
     not a regression, and is logged in the changelog but does not block
     NEW2 closure.

## Sequence

1. Pre-change baseline capture. Run
   `npx tsc --noEmit -p tsconfig.json 2>&1 > /tmp/tsc_baseline.txt`. Record
   current pass and fail state for markdown_links and ascii_compliance so
   regressions are attributable.
2. Apply Workstream 1, the well-plate adapter rect fix, per the Lane W
   audit.
3. Run the unit and Playwright well-target rect test. Expected result PASS.
4. Run the built-app click test. Expected result PASS with no "Wrong
   target" console warning.
5. Run the ObjectStateChange and re-render proof. Expected result PASS,
   adapter invocation count strictly increments, DOM children delta is
   zero.
6. Apply Workstream 2, the production viewport overflow fix, per the Lane
   O audit.
7. Re-run `render_and_dump.mjs` plus `precheck.mjs`. Expected result
   `hard_fail_count == 0` for every scene in scope.
8. Run the scorecard regression sweep. Expected result no regression
   beyond 5 points and `well_plate_96_zoom >= 80`.
9. Run the naming and style checks plus the tsc diff. Only spike-file
   changes are accepted; new diagnostics in untouched files block closure.

## Exit criteria

- All 9 sequence steps pass.
- tsc diagnostic count is unchanged or strictly improved relative to the
  175 baseline.
- pytest fast suite is green for markdown_links, ascii_compliance, and
  pyflakes_code_lint, or any failure exactly matches one of the 8
  pre-existing markdown_links failures.
- `scorecard.json` shows `well_plate_96_zoom >= 80` and
  `hard_fail_count == 0` for every scene.

## Test file locations

- Unit and well-target rect coverage:
  `tests/playwright/spike_well_plate_rects.mjs` (new), or an extension to
  an existing `tests/playwright/spike_built_app_*.mjs` file when the
  existing file is the more natural home.
- Built-app click and re-render proof: `tests/playwright/spike_built_app_rerender.mjs`
  (existing), extended to cover the new assertions.
- Scorecard regression: existing `experiments/css_native_layout/score_layout.mjs`.
- Precheck: existing `render_and_dump.mjs` and `precheck.mjs` chain.

## Forbidden in tests

- No `as any`, no `@ts-ignore`, no broad casts such as `as unknown as`.
- No edits to validator logic in `entry.ts` around line 761 driven from a
  test file. Validator behavior changes belong in production code with
  their own review.
- No production code modifications driven solely by test convenience. If a
  test cannot observe the behavior it needs without changing production
  code, the production change is its own ticket and goes through the
  normal review path, not in through the test-strategy door.
