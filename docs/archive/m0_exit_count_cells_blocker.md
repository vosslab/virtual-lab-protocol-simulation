# M0 exit: `count_cells` blocker captured

> **Superseded.** `count_cells` was later reclassified as an automated
> cell-counter workspace/modal workflow and fixed by replacing the
> off-protocol manual hemocytometer flow. Keep this file as the historical
> M0 exit record.

Per the plan's M0 exit clause (b), the walker is blocked only at a documented,
unrelated K2 modal gap after the dispatch asymmetry was design-level fixed
(WP-H1).

## Failing step id

`count_cells`

## Failure mode

```
[ERROR] Step failed: count_cells - page.waitForSelector: Timeout 3000ms exceeded.
Call log:
  - waiting for locator('[data-walker-advance="submit-cell-count"]') to be visible
```

The walker switches to the bench scene and clicks `cell_counter` (the modal
opener), then waits for the modal advance button identified by
`data-walker-advance="submit-cell-count"`. The opener click "progressed" (state
changed) but the advance button never becomes visible within the 3-second
budget.

## Report path

`test-results/walker/playthrough_report.json`

## Cause summary (one paragraph)

`count_cells` is a `kind: modal` step. Its `completionPath` declares
`openClick: cell_counter` and `advanceClick: submit-cell-count`. The bench's
`cell_counter` click handler appears to route the user through a count-entry
flow whose terminal "submit" button does not yet carry the
`data-walker-advance="submit-cell-count"` attribute the walker requires. This
is the same modal gap the failed SP-K2bd2 attempt tried to paper over with the
`setQuadrantCountsForWalker` back-door (since reverted). The proper fix is
either to add the missing `data-walker-advance` attribute to the existing
submit element, to split the step (per SP-K2bd2-beta), or to introduce a new
`completionPath.kind` (rejected unless alpha demonstrates real authoring
need). All three options are M1 territory.

## Proposed owner / next task

`SP-K2bd2-alpha` (WP-A1 in the active plan): a fresh `Explore` agent runs the
read-only audit of the seven candidate modal/directTool steps (count_cells,
plate_read, add_carboplatin, add_metformin, add_mtt, add_dmso, media_adjust)
and produces a classification table with a recommendation per row (split,
keep-as-modal, or new-kind). Output:
`docs/active_plans/sp_k2bd2_alpha_audit.md`. No code edits.

## M0 exit status

**M0 exit satisfied** under clause (b):

- Walker is blocked at a documented unrelated step (`count_cells`).
- Named failing step id, report path, cause summary, and next-task owner are
  all recorded above.
- The `pbs_wash` -> `add_trypsin` dispatch asymmetry is root-caused
  (`docs/active_plans/wp_t1_trace_analysis.md`) and design-level fixed
  (WP-H1, see `docs/CHANGELOG.md`).
- Resolver, index, and coverage tests are green (9/9, 5/5, 7/7).
- All other gates green.

Closing tasks #76 (SP-K2bd2-revert) and #81 (SP-K2bd2-resolver-compat) is
blocked only on this M0 closure note and the changelog entry, both of which
now exist.
