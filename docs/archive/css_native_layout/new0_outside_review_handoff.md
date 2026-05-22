# NEW0 outside-review handoff

## Manager action packet

Immediate objective: make NEW0 evidence reproducible before any verdict scoring.

Do now:

1. Add the NEW0 experimental-status note to `experiments/css_native_layout/README.md`.
2. Pick one tracked CSS file per workspace and update all templates to link only tracked CSS.
3. Re-run `precheck.mjs` against those tracked files.
4. Replace `PRECHECK_SUMMARY.md` with the tracked-code audit.
5. Write a short decision memo describing:
   - which CSS variants were selected;
   - what changed in the re-audit;
   - whether `PASS_TEMPLATE`, `data-primary`, and primary-ratio thresholds are accepted amendments or unresolved drift.

Do not do yet:

- Do not score NEW0.
- Do not open NEW1.
- Do not amend `PRIMARY_CONTRACT.md`.
- Do not restart M3 onward until the cleaned audit is available.

## Purpose

This is a handoff document for the NEW0 manager, summarizing a skeptical outside review of the CSS-native layout prototype under `experiments/css_native_layout/`. It is not a new plan, not an implementation patch, and not a verdict. It exists to help the manager decide what to clean up, what evidence to trust, and which questions need user review before NEW0 is scored.

The outside review was three independent subagents wearing the `ui-ux-engineer`, `typescript-engineer`, and `blueprint-plan-drafter` skill lenses, dispatched specifically to question the methodology rather than validate it. Their convergence across three lenses is the strongest signal here; their occasional overreach into project governance is flagged separately below.

## Strongest review concerns (in priority order)

1. **The audit evidence is not grounded in tracked code.** `experiments/` is in `.gitignore`. The tracked CSS deliverable is one file per workspace family (`bench.css`, `hood.css`, `instrument.css`). The audited templates link gitignored variants instead (for example `templates/hood_basic.html` links `styles/hood_c.css`; `templates/drug_dilution_plate_workspace.html` links `styles/bench_e.css`). The numbers in `experiments/css_native_layout/PRECHECK_SUMMARY.md` therefore measure scratch the build cannot reproduce. This is the single most important issue.
2. **The verdict ladder was adjusted mid-flight.** `PASS_TEMPLATE` is a new verdict not defined in the controlling plan at `~/.claude/plans/serene-stargazing-moore.md`; it appears in the P2.5 cleanup patch summary. `data-primary` was added to `electrophoresis_bench` so a 1.2 percent primary-object area ratio is accepted against a stated 25 percent threshold. The threshold and the verdict vocabulary moved without the restart clause the controlling plan attached to goalpost shifts.
3. **NEW0 is not contract-compliant and has not been declared experimental on its surface.** `PRIMARY_CONTRACT.md` item 3 still vests scene-object layout in the layout engine. NEW0 cannot be promoted to production under that contract. The contract has not been amended, and `experiments/css_native_layout/README.md` does not currently declare NEW0 as out-of-contract experimental work. Either statement is fine; the absence of either is the gap.
4. **The "no engine" framing is rhetorical.** The 932-LOC `src/scene_runtime/layout/layout_engine.ts` has been paralleled by approximately 1258 LOC of `experiments/css_native_layout/precheck.mjs` plus roughly 3000 LOC of tracked CSS plus per-scene hand-authored HTML. Per-object pixel decisions moved from TS to CSS class minimums. Complexity moved sideways; it did not shrink. Acknowledge this in any future verdict report rather than carrying the "no engine" framing forward unqualified.

## Methodological concerns (about how NEW0 is being judged)

These belong to the review process, not the code. Address them in the verdict report rather than by patching code.

- The 25 percent and 70 percent primary-object area thresholds are unsourced. Three of four composition scenes WARN against them. When a metric flags 75 percent of output, the metric, the threshold, or the scenes are wrong; likely all three. Either source the number, calibrate it against scenes the user calls good, or replace it with a checklist (primary object centered, largest single bbox, no label overlap).
- The closed taxonomy of five regions per workspace (`rear_shelf / work_surface / front_tools / instrument_station / popup_layer`) does not generalize as cleanly as the plan implies. `templates/drug_dilution_plate_workspace.html` has effectively invented a different five (`reagent_shelf / side_support / primary_work_surface / tool_lane / waste_corner`). Either the closed-5 taxonomy is being violated or the taxonomy is per-workspace; either way the plan understates the cost.
- Hand-authored HTML for eight scenes is selection-biased evidence. It proves a skilled human can write eight HTML files. It does not yet prove the planned emitter can reproduce that output without per-scene variants. Until the emitter does, the scaling claim is unverified.

## Implementation concerns (about the code as it sits)

These are concrete items the manager can act on inside the experiment without escalating.

- Templates link gitignored CSS variants. Standardize on the tracked CSS per workspace before re-auditing.
- The six discrete `footprint--*` categories collapse 96-well vs 384-well plates and microscope ocular vs objective to the same size. `display_width_cm` previously carried that distinction. Either accept the visual-fidelity loss in writing or admit a finer category split.
- Region names, footprint class names, and the `role` enum are duplicated across plan prose, `experiments/css_native_layout/regions/<workspace>.yaml`, HTML `data-*` attributes, and CSS selectors with no single source of truth. A typo (`rear_self`) compiles, renders, and silently bypasses any precheck selector that keys off the correct spelling. A `regions.ts` exporting `as const` arrays would close this hole at low cost; this is a follow-up, not a blocker.
- `precheck.mjs` at 1258 lines of untyped JavaScript is becoming a measurement engine in its own right. Worth noting; not urgent.

## Blockers before NEW0 verdict scoring

A verdict on NEW0 is not meaningful until these are resolved.

- **Evidence reproducibility.** All audited templates must link the tracked CSS per workspace. `PRECHECK_SUMMARY.md` (or its successor) must reflect a re-audit against tracked code only.
- **Surface declaration.** `experiments/css_native_layout/README.md` and any verdict report must state clearly that NEW0 is experimental and not currently contract-compliant. This does not require amending `PRIMARY_CONTRACT.md`; it requires the experiment to label itself honestly.
- **Verdict-ladder honesty.** If the verdict report continues to use `PASS_TEMPLATE` or accepts low primary-ratio values via `data-primary`, the report must explicitly say so and explain the reasoning. Carrying these adjustments forward silently is the drift the controlling plan warned against.

## Useful follow-up issues (not blockers)

These belong in a follow-up agenda the manager can sequence at their discretion.

- Decide whether five fixed regions per workspace is the right shape, or whether scenes should pick 2 to 6 regions from a controlled vocabulary of around ten names.
- Source or replace the primary-object area threshold.
- Wire one interactive flow (drag-to-pipette or cursor-attached transfer) against the proposed DOM nesting before declaring the layout model interactive-ready.
- Type the shared vocabulary (region name, footprint class, role) in a single TS module that the renderer, the YAML loader, and the precheck all consume.
- Port `precheck.mjs` to TypeScript when convenient.

## Contract and governance concern

`PRIMARY_CONTRACT.md` item 3 still says scene-object layout is handled by the layout engine. NEW0 proposes to replace that engine; the contract has not been amended. Two acceptable resolutions:

1. Amend the contract with user approval, scoping the new contract item explicitly.
2. Declare NEW0 an experiment outside the production contract on its own surface (`experiments/css_native_layout/README.md` and any verdict report).

Either path keeps work moving. The unacceptable state is the current one: NEW0 produced as if it were a candidate for promotion without either the contract amendment or the experimental disclaimer.

## Where the outside review may have overreached

The user's original request was a skeptical outsider review of the methodology, not a project-governance redirect. Treat the following review wording as input, not as orders.

- "Halt M5 verdict work" is too strong. The verdict cannot be scored against ignored scratch, but that is an evidence-reproducibility issue, not a project halt.
- "Restart M3 onward" is premature. Re-establish honest evidence first; restart is only justified if the cleaned evidence still demands it.
- "Return to stabilizing `layout_engine.ts`" is not a review finding. The reviews produced evidence that NEW0 is not promotion-ready under the current contract; they did not produce evidence that the old engine is the right path.
- "Answer 10 decision points before any further milestone" treats the review's questions as a gate. They are better used as a future agenda the user can work through at their own pace.

The substantive skepticism above stands. The directive language has been removed.

## Recommended next move for the manager

The manager has authority to execute the steps below without re-checking with the user on small decisions. The user should be consulted only on items 4 and 5.

1. Pick one CSS variant per workspace family (hood, bench, instrument). The pick can be the manager's judgment based on existing scratch. Replace the contents of the tracked `experiments/css_native_layout/styles/{hood,bench,instrument}.css` with the chosen variant. Leave the unchosen scratch variants where they are (gitignored) or delete them; either is fine.
2. Update every template's `<link rel="stylesheet">` to point at the tracked CSS, not at any `_b / _c / _d / _e / _diorama / _focusedstage / _gameboard` variant.
3. Re-run `node experiments/css_native_layout/precheck.mjs` against the cleaned templates. Replace `experiments/css_native_layout/PRECHECK_SUMMARY.md` with the re-audit.
4. Add a clear status note at the top of `experiments/css_native_layout/README.md`: NEW0 is experimental, not contract-compliant under `PRIMARY_CONTRACT.md` item 3, and is not a candidate for promotion until either the contract is amended or NEW0 is rescoped. Flag for user review.
5. Produce a short decision memo (one or two pages) alongside the re-audit: what the convergent findings were, that `PASS_TEMPLATE` and `data-primary` were added mid-flight, and whether to keep those adjustments, source them, or revert. Flag for user review.

After step 5: re-read the cleaned evidence with the user. Restart of M3 onward, stabilization of `layout_engine.ts`, and continuation of NEW0 toward NEW1 all remain options. None of them are mandated by this handoff.

## Verification

- Confirm Markdown links resolve: `pytest tests/test_markdown_links.py -q`.
- Confirm the gitignored scratch claim: `git check-ignore experiments/css_native_layout/styles/hood_b.css` returns the path.
- Confirm the tracked CSS shape: `git ls-files experiments/css_native_layout/styles/` returns three files.
- After cleanup: `git ls-files experiments/css_native_layout/templates/` and verify no template links a `_<letter>.css`, `_diorama.css`, `_focusedstage.css`, or `_gameboard.css` variant.

## Source files referenced

- `~/.claude/plans/serene-stargazing-moore.md` (controlling NEW0 plan; outside the repo)
- `experiments/css_native_layout/README.md`
- `experiments/css_native_layout/PRECHECK_SUMMARY.md`
- `experiments/css_native_layout/precheck.mjs`
- `experiments/css_native_layout/regions/hood.yaml`
- `experiments/css_native_layout/styles/hood.css`
- `experiments/css_native_layout/templates/hood_basic.html`
- `experiments/css_native_layout/templates/drug_dilution_plate_workspace.html`
- `experiments/css_native_layout/templates/electrophoresis_bench.html`
- `src/scene_runtime/layout/layout_engine.ts`
- `src/scene_runtime/layout/adapter.ts`
- `src/scene_runtime/layout/types.ts`
- `PRIMARY_CONTRACT.md`
