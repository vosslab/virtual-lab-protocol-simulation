# NEW2 CSS-native production blocker plan

NEW2 implementation plan. Doc-only. Compiled from Lane W (well-plate
adapter rect audit) and Lane O (production viewport overflow audit) plus
the Lane T test strategy.

Forward references (sibling NEW2 lane outputs; some not yet on disk are
listed as code spans rather than Markdown links so the markdown-links
pytest gate stays green until they land):

- `new2_production_viewport_overflow_audit.md` (Lane O, on disk)
- `new2_test_strategy.md` (Lane T, on disk)
- `new2_well_plate_adapter_rect_audit.md` (Lane W, on disk)

Upstream context:

- [new1_5_layout_hardening_results.md](new1_5_layout_hardening_results.md)
- [../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md)

## Purpose

NEW2 unblocks the two remaining production-code blockers from NEW1.5.
NOT broad migration. NOT architecture rewrite.

## Scope

Workstream 1: validator preset hierarchical-target matching (corrected
scope per Lane W finding; was originally "well-plate adapter rect fix").
USER DECISION REQUIRED before this workstream can proceed.

Workstream 2: production viewport overflow fix via CSS rule.

## Non-goals

- Not broad migration.
- Not multi-scene rollout.
- Not contract amendment.
- Not coordinate solver in TS.
- Not deletion of legacy layout engine.
- Not adapter changes (Lane W proved adapter is correct).

## Workstream 1: Validator preset fix (BLOCKED ON USER DECISION)

Background: per Lane W, the click-resolution chain works correctly UP TO
the `correct_target` validator preset. The preset does exact string
equality between the expected and emitted target ids. When the protocol
declares target `well_plate_96` and the click emits sub-target
`well_plate_96.E7`, the preset rejects. The correct semantics per the
existing `isTargetSatisfied` helper are: accept sub-targets that belong
to the expected group's `contains` list.

Lane W findings already established:

- The well-plate render adapter at
  `src/scene_runtime/adapters/well_plate/render.ts` is CORRECT and needs
  no edit.
- The `isTargetSatisfied` helper at `entry.ts:443-491` is CORRECT and
  already accepts hierarchical group-member targets.
- The bug is isolated to the `correct_target` validator preset, which
  uses exact string match instead of calling `isTargetSatisfied`.

Proposed minimum change:

- Modify the `correct_target` validator preset to call
  `isTargetSatisfied(expected_target_id, emitted_target_id, target_object)`
  instead of strict equality.
- File: TBD (Lane W audit identifies the `entry.ts:761` region; the
  specific preset implementation file may be `entry.ts` itself or a
  sibling file inside the bundle).
- Estimated change: 1 function, approximately 10 lines.
- Boundary: this file is on the no-touch list per all prior briefs. Per
  user rule: "Do not edit validator logic unless Lane W proves there is
  no alternative, then stop and document." Lane W has done so.

Stop condition: USER MUST APPROVE before this workstream can proceed.
Default (no approval): workstream remains documented but unstarted; the
Lane R re-render proof remains BLOCKED.

## Workstream 2: Production viewport overflow CSS fix

Source: `new2_production_viewport_overflow_audit.md`.

Proposed patch:

- Patch 1: `src/style.css` (production stylesheet). Add a new rule:
  `.scene-container.scene-mode--detail svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }`.
- Patch 2: `experiments/css_native_layout/styles/bench.css`. Add
  `max-height: 100%;` to the existing `.scene-mode--detail .placement`
  rule (around line 211).
- Total: approximately 6 lines across 2 files.

No user decision required for Workstream 2. May proceed immediately.

## Exact files likely touched

Workstream 1 (gated):

- TBD validator preset file (`entry.ts` or sibling per Lane W audit).
- 1 file, approximately 10 lines.

Workstream 2:

- `src/style.css` (approximately 5 lines).
- `experiments/css_native_layout/styles/bench.css` (approximately 1
  line).
- 2 files, approximately 6 lines total.

## Gates (apply to BOTH workstreams)

- tsc baseline 175 maintained (or improved to 166 per Task #86
  recovery).
- ascii_compliance PASS.
- markdown_links: 0 NEW failures (8 pre-existing unchanged).
- NEW0 scorecard: 10 scenes all `hard_fail_count = 0`.
- `well_plate_96_zoom` score at least 80.
- Lane B precheck on built output: `hard_fail_count = 0` (Workstream 2
  gate).
- Lane R re-render proof Playwright test: invocation count strictly
  increments after click (Workstream 1 gate).

## Rollback

Per workstream:

- Workstream 1: `git checkout HEAD -- <validator-preset-file>`. Reverts
  in 1 command.
- Workstream 2: remove the added CSS rules (one rule per file), or
  `git checkout HEAD -- src/style.css experiments/css_native_layout/styles/bench.css`.

## How to prove success

Sequence per `new2_test_strategy.md`:

- W1 success: `tests/playwright/spike_built_app_rerender.mjs` PASSES
  with the strictly-increment assertion.
- W2 success: `render_and_dump.mjs` plus `precheck.mjs` reports
  `hard_fail_count = 0`.
- Combined: scorecard regression check stable.

## What counts as failure

- Workstream 1 requires changes beyond the named validator preset
  (for example touching dispatch, render, loader, or chrome).
- Workstream 1 requires contract amendment.
- Workstream 2 requires changes beyond CSS (for example a coordinate
  solver).
- Either workstream adds more than 50 LOC.
- tsc baseline regresses (any NEW error in spike-touched files).
- Scorecard regresses more than 5 points on any scene.

## Why not broad migration

Both workstreams are isolated bugs in known files. They do not require
restructuring the scene-rendering pipeline, contract amendment, or
scaling the NEW1.5 spike adapter across more scenes. NEW2 is a 2-patch
round, not an architecture pivot.

## User decision required

For Workstream 1: approve the validator preset edit (forbidden-boundary
file, but minimal surgical change per Lane W) OR accept that the Lane R
re-render proof remains BLOCKED indefinitely.

For Workstream 2: no user decision; may proceed.

## Cross-references

- `new2_well_plate_adapter_rect_audit.md` (Lane W, on disk)
- `new2_production_viewport_overflow_audit.md` (Lane O)
- `new2_test_strategy.md` (Lane T)
- [new1_5_layout_hardening_results.md](new1_5_layout_hardening_results.md)
- [../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md) (item 3)

## Workstream 1 status update (NEW2 prep-and-prototype round, 2026-05-20)

### Revised finding

The Lane R re-render proof was achieved WITHOUT modifying the validator
preset. The unblock came from changing the protocol target from
`well_plate_96.row_E` (a row group) to `well_plate_96.E7` (a direct cell
rect). Because E7's `data-target-id` exactly matches the expected string
in `correct_target`'s strict equality check, the preset accepts the click.

### Consequence for Workstream 1

- The validator preset IS still a bug for group-target use cases
  (`row_E`, `all_wells`, `gel_cassette.lane_1`).
- For INDIVIDUAL CELL TARGETS (`E7`, `B1`, `H12`), the preset already
  works without modification.
- The Lane R re-render proof no longer requires Workstream 1 to proceed.
- Workstream 1 remains BLOCKED ON USER DECISION for group-target protocols.

### Well-plate row group height=0 finding (deferred)

Lane W-prototype (`probe.mjs`) revealed that the parent group
`well_plate_96` has `height=0` in SVG coordinate space. Individual cells
(A1/E7/H12) have positive widths (~8px). This is a separate finding from
the validator preset issue. The row group height=0 originates in
`src/scene_runtime/adapters/well_plate/render.ts` (lines 190-231, group
bbox computation). This is a FORBIDDEN boundary. Not in Workstream 1
scope. Deferred. Does not block cell-target approach.

### Current state

- Re-render proof: ACHIEVED via E7 cell target (7/7 assertions pass).
- Workstream 1 (validator group-target fix): DEFERRED. Requires user
  approval to modify forbidden-boundary file. Not required for individual
  cell targets.
- Workstream 2 (CSS viewport fix): Applied. `src/style.css` and
  `experiments/css_native_layout/styles/bench.css` both patched.

## Pipeline with anti-drift boundaries

### Framing: two tracks, not one

NEW2 is two independent tracks. Conflating them is the root cause of prior
drift. The tracks share infrastructure but not acceptance.

- Runtime layout track. Path A production dispatch, Lane R proof, and the
  viewport-overflow CSS patch. Acceptance is whether the runtime renders
  the scene, dispatches the configured layout, and produces a usable
  interactive page.
- Visual-quality track. Static-template scorecard, rendered screenshots,
  label readability, and regression diffs against accepted baselines.
  Acceptance is whether the rendered scene looks correct to a human
  reviewer and clears measured constraint thresholds.

The report's three-layer framing applies here: runtime success must not
hide static-template failures. A scene that runs without throwing but
renders labels off-page, overlapped, or sub-readable is not "passing";
it is a visual-quality failure that the runtime track cannot detect on
its own.

A runtime-track pass does not imply a visual-track pass. A visual-track
pass does not imply a runtime-track pass. Each track has its own
evidence requirement, its own owner step, and its own gate.

### Pipeline shape

One closed pipeline. Not a plugin system. Not extensible by editing
YAML alone.

Stages, in fixed order:

- scene manifest
- CSS-native layout
- measured rect extraction
- constraint audit
- scorecard
- runtime interaction proof

Shared across every scene:

- the stage order above
- the manifest schema
- the rect extraction harness
- the constraint audit primitives (off-page, overlap, clipping, click
  target size, label readability)
- the scorecard math
- the runtime interaction proof harness

Scene-class-specific:

- scorecard weights
- label policy
- spacing policy
- viewport and detail policy
- acceptance thresholds

### Closed scene class list

The scene class enum is closed. Adding a class requires an RFC and
explicit review. No class is added by editing YAML or a scorecard
config alone.

- template
- composition
- dense_clutter
- instrument_heavy
- zoom_detail

### Scene classes may adjust ONLY

- scorecard weights
- label policy
- spacing policy
- viewport and detail policy
- acceptance thresholds

### Scene classes may NOT introduce

Hard forbidden surface. A scene class is a policy dial, not an
extension point.

- new layout algorithms
- open-ended strategy names
- coordinate fields
- per-scene solver logic
- hidden diagnostic behavior
- unreviewed CSS variants

### Specific guardrails

- Viewport policy is first-class. It is its own pipeline layer, not a
  CSS afterthought patched in at render time. A scene that overflows
  its viewport is a pipeline failure, not a styling tweak.
- Labels are separate from objects in the manifest. A label is its own
  manifest entry with its own rect, not a string attached to an object.
- Dense scenes MAY suppress labels. Composition scenes MUST preserve
  them. The label policy lives on the scene class, not in ad-hoc YAML.
- Constraint audit catches: off-page objects, overlap, clipping, tiny
  click targets (under 40 px on either axis), unreadable labels (under
  11 px or low contrast against background).
- Diagnostic tools (`precheck.mjs`, `score_layout.mjs`,
  `render_and_dump.mjs`) MAY NOT be edited to make a result pass. The
  bridge integrity guardrail stays in force: post-process placement
  count cannot decrease relative to pre-process placement count.
- Regression budget. No scene drops more than 5 points from its
  accepted baseline scorecard without explicit review.
- Any new scene class, any policy change, and any threshold change
  requires before-and-after screenshot review.

### Track separation contract

- Runtime track. Lane R proof remains the current Path A evidence.
  The viewport-overflow CSS patch lands as its own change, separately
  from any visual-quality work. No broad scene migration rides on the
  runtime track.
- Visual-quality track. The scorecard is repaired one scene at a time.
  Before-and-after screenshots are required for every scene touched.
  The track does not batch scenes.
- A runtime-track pass does not imply a visual-track pass. A
  visual-track pass does not imply a runtime-track pass. The two gates
  are evaluated independently.

### Anti-drift commitments

NEW2 will not do the following, even if a future task appears to need
them. Each item below has been a prior drift vector.

- No new layout strategies beyond the closed pipeline.
- No general plugin system.
- No use of "scene class" as a backdoor for arbitrary custom behavior.
- No diagnostic tool changes that hide a failure rather than expose it.

## Hard rule: NEVER crop SVG assets in display

Canonical home: [../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md). See also [../specs/SVG_PIPELINE.md](../specs/SVG_PIPELINE.md) and [../specs/LAYOUT_ENGINE.md](../specs/LAYOUT_ENGINE.md).

A scene cannot pass visual review if any scientific SVG asset is cropped or
aspect-distorted enough to change what the object is.

This rule applies even if precheck reports `hard_fail_count = 0`. Visible
cropping or distortion is a visual failure regardless of bbox-level checks.

Forbidden in any rendered scene:

- Cropped bottoms of volumetric flasks
- Cropped bottle necks or caps
- Clipped pipette tips
- Hidden instrument edges
- Object artwork cut off by cards, regions, wrappers, `overflow: hidden`, or
  `.object-graphic` containers
- Squashing or stretching that changes the intended asset aspect ratio

Diagnostic requirement:

The `artwork_integrity` check must:

- Compare the rendered `.object-graphic` or `img`/`svg` bbox against its
  parent placement card.
- Flag if the asset is clipped by parent `overflow`.
- Flag if rendered aspect ratio deviates from expected asset aspect ratio
  beyond a small tolerance (default: 5%).
- Treat visible clipping as a HARD FAIL.
- Treat mild aspect distortion as advisory at first; escalate to hard fail
  for lab glassware, pipettes, plates, and instruments.

Fix direction (not a substitute for the rule):

- Use `object-fit: contain`, never `cover`.
- Preserve SVG `preserveAspectRatio="xMidYMid meet"` (default).
- Remove parent `overflow: hidden` where it clips assets.
- Size cards around assets, not assets into too-small cards.
- Add `min-height` / `min-width` for tall glassware cards.

Anti-patterns (forbidden):

- Do NOT "fix" cropping by hiding cropped assets, deleting DOM, or weakening
  diagnostics.
- Do NOT accept a high score if the asset is visibly cropped.
- Do NOT claim visual success while glassware bottoms are cut off.

See also:
[../../experiments/css_native_layout/VISUAL_TARGETS.md](../../experiments/css_native_layout/VISUAL_TARGETS.md),
[../../experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md](../../experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md),
`new2_css_native_best_case_showcase_no_crop_addendum.md`.
