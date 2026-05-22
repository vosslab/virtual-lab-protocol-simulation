# NEW0 stabilization continuation

Status: CLOSED - 2026-05-19 (NEW0 hardening accepted by reviewer; superseded by [new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md))

## Closure note

This continuation plan was dispatched on 2026-05-19 to keep NEW0
stabilization open after the reviewer retracted the initial
`continue-to-NEW1` verdict. A subsequent NEW0 hardening pass on the same
date (2026-05-19) met every reviewer success criterion (composition
scenes, zoom scene, and instrument-heavy scene all PASS with 0 hard
fails) and was accepted by the reviewer. NEW1 spike-prep work is now
authorized; the forward planning surface is
[new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md).
The content below is retained as the historical record of the
continuation scope and stabilization actions taken before closure.

## Why this plan exists

The reviewer issued a controlling instruction on 2026-05-19: "Do not open
NEW1 yet. Continue NEW0 stabilization." The prior evidence package
([new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md))
and the experiment-side decision memo
(`DECISION_MEMO.md`)
had marked NEW0 as "Ready for NEW1 planning" with a `continue-to-NEW1`
verdict. The reviewer's contact-sheet inspection contradicts that:
Direction B as a global forward candidate collapses the
electrophoresis primary ratio to 0.5% and the drug-dilution primary ratio
to 1.5%, neither of which is acceptable for the scene class. This plan
governs the continued stabilization pass; the NEW1 doc above is being
retracted in parallel and the experiment-side memos are being amended to
point here.

## Controlling brief

> Do not open NEW1 yet. Continue NEW0 stabilization.
> The contact sheets show that the prototype avoids many old overlap
> failures, but the forward candidate is not visually strong enough and
> is not consistently better than the alternatives.
> Use this direction:
>
> 1. Stop treating Direction B as globally best.
>    - Use Direction B as the base for general bench composition only.
>    - Use Direction C or B legacy behavior for electrophoresis/
>      instrument-heavy scenes, because Forward collapses
>      electrophoresis primary ratio to 0.5%.
>    - Keep Direction A retired except for portable zoom/detail sizing
>      rules.
> 2. Restore or re-create the drug-dilution composition strength.
>    - The current tracked Forward candidate gives
>      drug_dilution_plate_workspace only 1.5% primary area.
>    - That is not acceptable for a plate-centered drug dilution scene.
>    - Recover the useful parts of the old Direction E / B legacy
>      tuning, but move them into tracked CSS/manifest rules, not
>      ignored variants.
> 3. Treat zoom/detail scenes as their own scene mode.
>    - well_plate_96_zoom improved to 44.4%, but that is still too small
>      for a detail view.
>    - Add a tracked zoom/detail rule that makes the structured object
>      dominate the viewport.
>    - Target: plate visibly dominates the scene, not just passes an
>      arbitrary metric.
> 4. Add or emphasize clutter stress scenes before judging success.
>    - Sparse PASS_TEMPLATE scenes should not drive the verdict.
>    - Use drug dilution, electrophoresis, staining, and crowded bench
>      as the main evidence scenes.
>    - Template scenes are smoke tests only.
> 5. Replace the single global primary-ratio threshold with scene-class
>    thresholds or a checklist.
>    - Composition scenes, instrument scenes, and zoom/detail scenes
>      have different visual goals.
>    - Do not use one 25% rule for all composition scenes.
>    - For now, report primary ratio as advisory and pair it with visual
>      checks: primary object obvious, supporting objects nearby, labels
>      readable, no clipping, no off-page art, no overlap.
> 6. Produce one more stabilization contact sheet.
>    - Only compare the selected forward candidate against the best
>      prior reference per scene.
>    - Do not generate many new variants.
>    - The goal is a single candidate with scene-class rules: general
>      bench, instrument-heavy, zoom/detail, and dense/cluttered
>      composition.

## Acceptance criteria

Direct quote of the reviewer's "Success for the next pass":

- drug_dilution has a visually dominant plate and nearby support items;
- electrophoresis has a visible tank/power context and does not shrink
  the tank into irrelevance;
- well_plate_96_zoom is clearly a detail view;
- staining/crowded bench remains readable with no clipping or label
  collisions;
- all evidence uses tracked files only.

## Workstream map

Four tracked workstreams run under this plan. None of them open NEW1.

| Workstream                     | Owner                     | Tracked outputs                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scene-class CSS rules          | coder subagent (CSS)      | `bench.css`, `hood.css`, `instrument.css`, and the affected templates under `templates`                                                                                                                                                   |
| Precheck threshold + checklist | coder subagent (precheck) | `precheck.mjs`                                                                                                                                                                                                                            |
| Contact-sheet rebuild          | docs/coder coordination   | `_temp_contact_sheets.py` regeneration into `test-results/new0_css_native/contact_sheets/` and `gallery.html`                                                                                                                             |
| Doc retractions and closeout   | docs subagents            | this file plus [new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md), `DECISION_MEMO.md`, `PRECHECK_SUMMARY.md`, and `CHANGELOG.md` (the closing docs subagent owns the CHANGELOG entry after the coders finish) |

Scene-class targets for the CSS workstream:

- General bench composition: Direction B base (current `bench.css`
  layout) preserved as the default.
- Instrument-heavy (electrophoresis): Direction C or B-legacy behavior
  restored as a scene-class rule, not a separate gitignored variant.
- Zoom/detail (well_plate_96_zoom and any future detail scene): a
  tracked zoom/detail rule that lets the structured object dominate the
  viewport (target: plate visibly dominates; not a numeric threshold).
- Drug dilution composition: the useful parts of Direction E or
  B-legacy tuning recovered into tracked CSS, with no reference to
  gitignored variants.

## Hard boundaries

- No edits to `src/`, `pipeline/`, `validation/`, `docs/specs/`,
  `PRIMARY_CONTRACT.md`, production YAML, or
  any gitignored CSS variant.
- No new tracked CSS files. Scene-class behavior lives in the existing
  `bench.css` / `hood.css` / `instrument.css` (and templates that opt in
  via class selectors).
- No NEW1 work. No production integration. No contract amendment.
- No deletions, moves, or `git mv` of any other `docs/active_plans/`
  file. Cleanup of the active_plans bloat is open work; it is flagged
  below but not executed in this pass.

## Verification gates

After the CSS and precheck workstreams land, the closing docs subagent
must confirm:

1. Precheck rerun against the tracked surface:
   `node experiments/css_native_layout/precheck.mjs`
2. Markdown link sweep:
   `source source_me.sh && python3 _temp_link_sweep.py`
3. Pytest markdown-link gate:
   `source source_me.sh && pytest tests/test_markdown_links.py -q`
4. No-old-layout-imports gate (if present in the suite):
   `source source_me.sh && pytest tests/test_no_old_layout_imports.py -q`

The closing pass also produces the final stabilization contact sheet:
one selected forward candidate compared against the best prior reference
per scene (per reviewer item 6).

## Relationship to other active_plans docs

The `docs/active_plans/` directory currently holds 36 markdown files
(this file is the 37th). The reviewer brief does not authorize archival
in this pass, so the table below labels relationships only.

| Doc                                                                            | Relationship to this plan                                                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| [new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md) | Superseded as forward-direction guidance. Evidence content remains valid; NEW1-ready language is being retracted in the same dispatch. |
| [new0_outside_review_handoff.md](new0_outside_review_handoff.md)               | Historic handoff. Still authoritative as the description of how NEW0 reached stabilization; not the controlling forward-direction doc. |
| `2026_05_18_layout_rollout_status.md`, `2026-05-18_rollout_status.md`          | Rollout status snapshots. Out of scope for this pass.                                                                                  |
| `layout_engine_audit.md`, `layout_method_benchmark_report_2026_05_18.md`       | Background on the contract item 3 layout-engine path. Out of scope for NEW0 stabilization.                                             |
| `production_precheck_summary_2026_05_18.md`                                    | Production-side precheck record; do not conflate with NEW0 experiment precheck.                                                        |
| All other `docs/active_plans/*.md` files                                       | Unrelated workstreams. Not touched by this dispatch.                                                                                   |

Open cleanup work flagged here only: the `docs/active_plans/` count is
large enough that a future archival sweep is warranted. That sweep is
not part of NEW0 stabilization and must be requested separately.

## Closeout

This plan closes when either:

1. All five acceptance criteria above are met against the stabilized
   tracked surface, the verification gates pass, the final contact
   sheet is produced, and the closing docs subagent records the result
   in `CHANGELOG.md` and updates the experiment-side
   memos; or
2. The reviewer issues a follow-on brief that supersedes the current
   one.

On closeout, this file may be archived alongside
[new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md)
as part of a future `docs/active_plans/` cleanup pass. Until then, this
file is the controlling NEW0 plan.
