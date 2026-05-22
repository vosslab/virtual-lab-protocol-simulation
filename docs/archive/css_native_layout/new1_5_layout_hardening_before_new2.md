# NEW1.5 layout hardening before NEW2

## Scope

This plan defines the NEW1.5 layout hardening pass that must complete before
NEW2 work begins. NEW1 landed the CSS-native layout integration as a
production scaffold behind a hard-coded feature flag on the
`well_plate_96_zoom` scene. The spike confirmed code-path correctness for
click target binding, ObjectStateChange application, and cursor attach, but
end-to-end browser proof of re-render after state change remains blocked by
the dispatch-side target matching boundary. NEW1.5 closes that residual
risk surface so NEW2 can build on a stable layout floor rather than on a
flag-gated spike.

NEW1.5 is a stabilization pass. It does not redesign the layout vocabulary,
does not promote the spike to default-on for additional scenes, and does
not introduce a new protocol primitive. Its job is to harden what NEW1
landed: prove re-render after state change, remove the lane D blocker
through a reviewer-approved seam, and turn the LAYOUT_SCORECARD into a
gate the scene set must pass before NEW2.

## Status

Pre-work. Plan authored 2026-05-20. Companion finishing doc
`new1_5_layout_hardening_results.md`
will record empirical evidence and gate verdicts on closure.

## Background and prior evidence

NEW1 closed with the following posture:

- The CSS-native adapter scaffold landed and TypeScript compiled clean for
  the three spike files. See
  `new1_well_plate_96_zoom_spike_result.md`.
- Lanes A (click target proof), B (built-app render), and C (click target
  reaches production validator) passed.
- Lane D (ObjectStateChange + re-render) is PARTIAL. The dispatch layer
  rejects the well-subpart click after the state change applies, so step
  validation fails and renderScene is never re-invoked. Detailed evidence
  chain in
  [lane_d_state_change_blocker.md](lane_d_state_change_blocker.md).
- Lane E (precheck on built output) is BLOCKED and deferred to a Lane P
  follow-up.
- The cross-cutting progress snapshot lives in
  `new0_new1_layout_rebuild_progress_report.md`.
- The numeric layout quality target is defined in
  `LAYOUT_SCORECARD.md`.
  Hard-fail gates (clipped artwork, off-page placement, SVG overlap, region
  overflow) must remain clean for every scene in scope.

The two residual risks NEW1.5 inherits are:

1. Lane D blocker. Re-render after ObjectStateChange has been verified by
   code inspection but not by browser evidence on the spike path.
2. Flag-gating posture. The spike is hard-coded off in production; any
   downstream consumer needs either a reviewer-approved override seam or
   a default-on promotion. NEW2 cannot assume the new layout path is live.

## Goals

- Prove, with browser evidence, that a validated state change re-runs
  `renderScene` and the CSS-native adapter on the spike path, with no DOM
  leak across re-renders.
- Resolve the dispatch-side target matching gap that caused the Lane D
  blocker, either by extending the dev_smoke protocol to use a target the
  current matcher already accepts, or by a reviewer-approved fix to the
  matcher boundary.
- Confirm the LAYOUT_SCORECARD hard-fail gate is clean for every scene
  declared in scope; record the per-scene score for the regression floor.
- Decide and document the flag-override posture: keep hard-coded off and
  ship NEW2 behind the same flag, add a reviewer-approved override seam,
  or promote the spike path to default-on for `well_plate_96_zoom`.

## Non-goals

- No new layout primitives, no new scene classes, no new scorecard
  metrics.
- No expansion of the spike to additional scenes. Promotion is a NEW2
  decision, not a NEW1.5 deliverable.
- No edits to forbidden boundaries unless explicitly approved by the
  reviewer for this milestone. The boundaries listed in
  [lane_d_state_change_blocker.md](lane_d_state_change_blocker.md) remain
  in force by default.

## Workstreams

NEW1.5 is decomposed into four independent workstreams. Each has one
owner, one outcome, and one verification step.

### Workstream 1: Lane D unblock

Outcome: a passing browser test that proves `renderScene` re-runs after a
validated state change on the spike path, with idempotent DOM state.

Approach options, in priority order:

1. Replace the dev_smoke target with an object that has no sub-parts (for
   example a media bottle), trigger ObjectStateChange on that object, and
   verify re-render. This is the smallest path and avoids the
   subpart-matching gap entirely.
2. If subpart targeting must be preserved, request a reviewer-approved
   focused edit to the target matcher to recognize grid-coordinate
   subparts. Scope must be narrow and reviewed against the protocol
   vocabulary.

Verification: invocation count for `computeSceneLayoutCssNative`
increments on each validated state change. DOM element count for the
scene viewport stays bounded across N re-renders (no leak).

### Workstream 2: Re-render idempotence audit

Outcome: written confirmation that repeated `renderScene` calls on the
spike path produce a stable DOM (no duplicate groups, no stale
`data-target-id` attributes, no orphaned cursor-attach elements).

Approach: extend the spike Playwright harness to trigger N (>= 5) state
changes and snapshot DOM element counts and target-id sets between each
call.

Verification: element counts and target-id sets match between
re-renders. Documented in the results companion.

### Workstream 3: LAYOUT_SCORECARD regression floor

Outcome: a recorded per-scene scorecard run on the current production
build, plus a documented numeric floor each scene must hold across NEW2.

Approach: run
`node experiments/css_native_layout/precheck.mjs` and
`node experiments/css_native_layout/score_layout.mjs` against the current
tracked templates. Confirm the hard-fail gate is clean for every scene in
scope. Record the per-scene numeric score as the regression floor.

Verification: scorecard run committed as a referenced artifact, with the
per-scene numeric floor stated in
`new1_5_layout_hardening_results.md`.

### Workstream 4: Flag posture decision

Outcome: a documented decision on the
`ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE` flag posture for NEW2.

Approach: present the three options (keep hard-coded off, add an override
seam, default-on for `well_plate_96_zoom`) with reviewer disposition.
Record the chosen option and the rationale.

Verification: decision recorded in the results companion. The flag file
`feature_flags.ts`
reflects the chosen posture before NEW1.5 closes.

## Acceptance gates

NEW1.5 closes when all of the following hold:

- Workstream 1 verification passes (Lane D unblocked with browser
  evidence).
- Workstream 2 verification passes (re-render idempotence proven across
  N >= 5 state changes).
- Workstream 3 verification passes (LAYOUT_SCORECARD hard-fail gate clean
  for every in-scope scene; numeric floor recorded).
- Workstream 4 decision documented and applied to the flag file.
- Companion doc
  `new1_5_layout_hardening_results.md`
  exists and records evidence for each gate above.
- No regressions in pre-existing pytest markdown and ASCII compliance
  gates beyond the known pre-existing failure count.

## Open follow-ups deferred to NEW2

The following items are explicitly out of NEW1.5 scope and carry forward
to NEW2:

- Promoting the CSS-native adapter to default-on for scenes beyond
  `well_plate_96_zoom`.
- Lane E (precheck on built output) closure under Lane P.
- Any new layout primitive or scorecard metric.
- Any redesign of the protocol vocabulary required to express layout
  intent.

## Cross-references

- `new1_well_plate_96_zoom_spike_result.md`
- [lane_d_state_change_blocker.md](lane_d_state_change_blocker.md)
- `new0_new1_layout_rebuild_progress_report.md`
- `LAYOUT_SCORECARD.md`
- Future deliverable:
  `new1_5_layout_hardening_results.md`
