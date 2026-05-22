# NEW3 stress/reliability rolling log

This is the chronological log of NEW3 stress batches. Each batch entry stays present forever (never edited or pruned). Use this log to track per-batch progress, fix attempts, and convergence trends.

Canonical plan: [new3_layout_stress_reliability_plan.md](new3_layout_stress_reliability_plan.md)

Hard rule: never crop SVG assets in display.

## Append-only structure

- Batch entries are append-only. Never delete, rewrite, or prune a prior batch entry.
- New batch entries are appended at the bottom of the file, below the most recent batch.
- Existing batch entries may only be edited to fill placeholders (`(filled by NEW3-H runner)`, etc.) with the actual measured values once the corresponding lane completes. Substantive content (fixes attempted, verdicts, scorecard deltas) is never rewritten after acceptance.
- If a fix is later reverted, record the revert as a new line in a later batch entry, not by editing the original.

## How to add a batch entry

Append a new section using this schema:

```
## Batch N - YYYY-MM-DD

**Status:** in progress | complete | aborted
**Scope:** one-line
**Scenes tested:** counts
**Hard fails:** counts
**Top failures:** bullet list of top 5 failure categories with frequency
**Fixes attempted:** list with file:line + scope
**Accepted fixes:** list with verdict + scorecard delta + screenshot path
**Rejected fixes:** list with reason
**Screenshots generated:** count + folder path
**Next batch plan:** bullet list
```

Field guidance:

- `Status` flips from `in progress` to `complete` only after the batch-J cluster lane and batch-I contact-sheet lane both finish.
- `Scenes tested` records the generated, gold, and total counts produced by the NEW3-H batch runner.
- `Hard fails` is the raw count of scenes that failed any zero-tolerance check (cropped asset, off-canvas, overlap above threshold).
- `Top failures` clusters from NEW3-J; keep to the top five with absolute frequency.
- `Fixes attempted` records every CSS/markup change tried during the batch, with the file path, line range, and scope (single scene vs cross-scene).
- `Accepted fixes` records only fixes that pass the 5pt regression budget per scene and the manager review gate.
- `Rejected fixes` records fixes the manager rejected, with the reason (regression budget exceeded, scope creep, coordinate-bearing field introduced, etc.).
- `Screenshots generated` points at the NEW3-I contact-sheet folder for that batch.
- `Next batch plan` lists the targeted failure clusters, expected fix scope, and prerequisites from other lanes.

## Anti-drift reminders

These rules apply to every batch. A fix that violates any of them is rejected on sight; do not negotiate them inside a batch entry.

- **No diagnostic weakening.** Do not raise overlap thresholds, soften off-canvas checks, or mute hard-fail categories to make a batch pass. Diagnostics define the contract; the fix changes the layout, not the contract.
- **No DOM deletion.** Do not delete scene objects, subparts, labels, or affordances to silence a failure. The fix is layout or styling, not amputation.
- **No coordinate-bearing fields.** Do not add `x`, `y`, `top`, `left`, `translate(...)`, or other absolute coordinates to YAML, CSS, or runtime config. Layout stays declarative and constraint-driven.
- **No broad production migration.** Stress fixes are scoped to the failing scene or the smallest cross-scene rule needed. Do not piggyback a global refactor onto a stress batch.
- **5pt regression budget per scene.** A fix may not drop any other scene's scorecard by more than 5 points. If it does, the fix is rejected or narrowed.

---

## Batch 1 - 2026-05-20

**Status:** in progress (first batch launching)

**Scope:** initial stress corpus + diagnostic baseline.

**Scenes tested:**

- generated: 100
- gold: 10
- total: 110

**Hard fails:** 110 scenes (100%) carry at least one hard-fail category.
Per-scene hard-fail-count distribution: 1 fail = 7 scenes, 2 fails = 101 scenes, 3 fails = 2 scenes.
Aggregate counts: clipped_by_parent = 631 placements, aspect_distorted_HF = 570 placements,
region_overflow = 2 regions, clipped_artwork / off_page / svg_svg_overlap = 0 each.

**Top failures:** (top 5 categories by absolute occurrence across all scenes)

- clipped_by_parent: 631 (SVG artwork clipped by ancestor overflow != visible)
- aspect_distorted_HF: 570 (glassware/pipette/plate/instrument rendered aspect drift > 5% vs natural)
- region_overflow: 2 (region scroll-content exceeds region box)
- clipped_artwork (legacy bbox-vs-region): 0
- svg_svg_overlap: 0

**Fixes attempted:** none yet (Batch 1 is baseline)

**Accepted fixes:** none yet

**Rejected fixes:** none yet

**Screenshots generated:** 0 contact-sheet PNGs yet (NEW3-I lane). Per-scene viewport PNGs were emitted by precheck.mjs into `test-results/new3_stress_batch1/audit/` (110 files) but no contact sheet was assembled in this lane.

**Next batch plan:**

- Batch 2 target: address top 3 failure clusters from Batch 1
- Batch 2 expected: same scene corpus + first round of CSS-only fixes
- Batch 2 prerequisites: NEW3-C diagnostic extensions live; NEW3-D + NEW3-E audits read by manager

---
