# NEW2 showcase reviewer guide

Audience: a reviewer opening the NEW2 showcase for the first time, including
outside reviewers and team members who did not participate in the round.

This guide is honest. It names what is proof, what is concept, and where the
round overstepped and had to revert.

## 1. What to open first

Open these artifacts in order. Do not skip ahead; later artifacts depend on
context from earlier ones.

1. [experiments/css_native_layout/showcase/index.html](../../experiments/css_native_layout/showcase/index.html)
   - The consolidated showcase entry point. Start here.
2. [docs/active_plans/new0_new1_layout_rebuild_progress_report.pdf](new0_new1_layout_rebuild_progress_report.pdf)
   - 1.1 MB evidence PDF from the prior round. Provides baseline context.
3. Lane A gallery contact sheet under
   [experiments/css_native_layout/showcase/](../../experiments/css_native_layout/showcase/)
   - Static-evidence sheet of best scenes.
4. Lane I pipeline diagram under
   [experiments/css_native_layout/showcase/](../../experiments/css_native_layout/showcase/)
   - One-page mental model of the rebuild pipeline.

## 2. What screenshots matter most

Four screenshot sets, ranked by evidentiary weight.

- Lane B before/after click pair. Runtime proof. This is the proof.
- Lane A 5 top-scorecard scenes. Best static evidence; reproducible from
  tracked CSS and templates.
- Lane M failure museum. Shows what NOT to trust and why; calibrates
  reviewer skepticism.
- Lane I pipeline diagram. Mental model that makes the other three legible.

If the reviewer only looks at one image, look at Lane B. If two, add Lane I.

## 3. What is real proof vs concept

Be precise about evidence tier. The round mixed tiers, and the showcase
preserves that mix on purpose so the reviewer can distinguish them.

Real proof:

- Lane R recovery suite: 7/7 PASS on the built bundle, exercising the
  production dispatch chain end-to-end.
- Scorecard improvements with reproducible CSS and template diffs. Candidate
  1 shows a measured +32 scorecard delta from tracked changes.

Real evidence (not proof, but reproducible):

- Precheck PNGs rendered by the canonical precheck tools on tracked
  templates. Reproducible from current `main`.

Concept only (mockups, not runtime-wired):

- Lane N teaching-scene mockups.
- Lane P2 selected-well presentation.
- Lane O2 hover/reveal interaction.

Invalid, rejected, and reverted:

- Lane O-prototype DOM-removal experiment. Reverted.
- `precheck.mjs` +243-line modification. Reverted.

## 4. What remains blocked

- Scorecard regression versus Lane C baseline. 5 scenes still WARN. Root
  cause is partially understood; full bisect not completed this round.
- Workstream 1 validator preset group-target fix. Gates 65 protocols. Needs
  approval to edit a forbidden-boundary file. See section 5.
- Workstream 2 production CSS viewport overflow patch. Applied in this
  round. Broader migration not approved and not in scope.
- Production migration off the legacy layout engine. Out of scope for NEW2
  and explicitly deferred.

## 5. What decisions the user should make next

These decisions block the next round.

- Approve or reject the Workstream 1 forbidden-boundary edit at
  `src/scene_runtime/bundle/entry.ts:755`.
- Decide whether to spend the next round bisecting the scorecard regression,
  or accept the current scorecard as a historical reference and restart the
  baseline.
- Approve or reject the per-scene-class threshold matrix design phase.
- Pick the next concept demo (Lane N, P2, or O2) to elevate from mockup to
  runtime-wired.

## 6. Estimated reviewer time

- 15 min, fast pass. Open the showcase index, read four captions, look at
  Lane B and Lane I. Enough to vote yes or no on direction.
- 45 min, normal review. Fast pass plus a skim of the evidence report PDF.
- 2 hours, thorough audit. Open every artifact, verify reproducibility of
  Lane B (rerun the recovery suite) and Candidate 1 (apply the CSS and
  template diffs locally and re-score).

## 7. Where the bodies are buried

Honest accounting of round mistakes. Reviewers deserve this section.

- Lane O-prototype overstep. The prototype edited production DOM behavior
  beyond the experiment's authority. Reverted. The mockup-tier Lane O2
  replaces it.
- `precheck.mjs` unauthorized edit. A +243-line modification was made to a
  canonical tool without approval. Reverted. The tracked tool is unchanged
  on `main`.
- Candidate 2 `bench.css` scope-guard fix did not restore the Lane C
  baseline. The fix narrowed scope correctly but did not recover the
  regressed scorecard delta. Candidate 2 is preserved as a learning
  artifact, not a recommendation.
- Workstream 1 was deferred because a cell-target workaround proved viable
  end-to-end without the forbidden-boundary edit. The workaround is not a
  permanent answer; the forbidden-boundary decision is still owed.

