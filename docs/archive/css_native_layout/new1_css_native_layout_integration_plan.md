# NEW1 CSS-native layout integration plan

Status: ACTIVE - planning only, no implementation

> Reviewer 2026-05-19: "The next unknown is no longer static layout. The next
> unknown is whether this can satisfy the runtime contract without rebuilding
> the same layout engine under another name."

NEW1 must answer one question: can the NEW0 CSS-native semantic-region layout
satisfy the production runtime contract for clickable, interactive scenes
without recreating a coordinate-based layout engine under another name. The
production runtime contract includes hit-testable click targets, cursor-attach
and drag behavior, `ObjectStateChange` re-layout, and scene-adapter outputs as
defined in `PRIMARY_SPEC.md` and
`SCENE_VOCABULARY.md`.

NEW1 must NOT: implement production code, amend
`PRIMARY_CONTRACT.md`, begin broad migration of
scenes, or continue NEW0 visual tuning. NEW0 evidence is input; it is not
production proof. NEW1 reaches its first decision gate through a single,
narrow integration spike (section 3); only after the spike does the contract
path become a real choice.

## 1. Contract decision

Contract item 3 from `PRIMARY_CONTRACT.md` reads
verbatim:

> "Scene object layout is handled by the layout engine. Scenes must use the
> layout engine for positioning clickable objects. Custom geometry is allowed
> only for subparts inside a structured scientific object, such as wells
> inside a plate, tubes inside a rack, lanes inside a gel, or marks inside an
> instrument display. The structured object itself still remains a
> YAML-declared scene object placed by the layout engine."

NEW0 CSS-native layout is not contract-compliant under this clause. Two paths
exist:

- **Path A - Amend the contract.** Promote semantic-region CSS layout to be
  the layout engine. Item 3 is rewritten so that CSS Grid plus a closed
  region/footprint vocabulary becomes the contract-mandated layout mechanism.
  Subpart geometry (wells, tubes, lanes) stays inside scientific objects as
  today.
- **Path B - Keep CSS-native as an experimental renderer.** Do not promote.
  Production retains
  `layout_engine.ts`
  as the authoritative layout pathway. NEW0 stays under `experiments/` as
  historical evidence only.

**Decision gate.** The user decides Path A vs Path B. The triggering evidence
is the integration spike outcome defined in section 3, judged against the
success and failure gates in section 9. The decision is made after the spike
result, not now.

This plan does NOT amend the contract. No edits to
`PRIMARY_CONTRACT.md` are made or proposed in NEW1
planning.

## 2. Production integration surface

Each row maps a production layout need to its current path, its NEW1
CSS-native path, and the open question NEW1 must answer. NEW0 demonstrated
static rendering and precheck gates only; everything tied to runtime
interaction is still unknown.

| Production need                                   | Current layout engine path                                                | NEW1 CSS-native path                                                        | Open question                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Clickable object hit targets                      | Layout engine emits pixel rects; click handler consults rects             | CSS Grid cell holds DOM node; click hits DOM node directly                  | Do hover/focus/click targets remain hit-stable across viewport sizes and reflow?                     |
| Rendered object positions                         | Layout engine computes (x, y, w, h) per object                            | CSS Grid + flexbox derive position from region + footprint class            | Demonstrated statically in NEW0; not yet demonstrated under interaction                              |
| Label positions                                   | Layout engine assigns label anchor points                                 | CSS sibling or pseudo-element next to placement node                        | Can labels avoid collision without a coordinate solver?                                              |
| Cursor-attach / drag-to-pipette                   | Layout engine reports object center; runtime attaches cursor sprite there | CSS-native path must report a stable attach anchor without computing coords | UNKNOWN - no NEW0 evidence; first risk of "rebuilding the engine under another name"                 |
| ObjectStateChange re-layout                       | Layout engine recomputes affected placements                              | DOM re-render with new region/footprint/visual-state classes                | Does re-render preserve identity and avoid layout flicker for in-flight gestures?                    |
| Structured object interiors (wells, tubes, lanes) | Custom geometry inside the structured object; contract-permitted          | Unchanged - subpart geometry stays inside object SVG                        | None at NEW1 scope; subparts are out of layout-engine surface by contract                            |
| Scene adapter outputs                             | Adapter maps semantic target names to placed objects with coordinates     | Adapter maps semantic target names to DOM nodes by region + placement_name  | Can adapter resolve targets without coordinate lookups?                                              |
| Screenshot / precheck gates                       | Production currently has no equivalent gate                               | NEW0 `precheck.mjs` diagnostics already running                             | Demonstrated in NEW0 (10 scenes, 0 hard fails); promotion to production gate is a section-5 question |

Already demonstrated by NEW0: static rendering, precheck gates, region
overflow / off-page / svg-svg / clipping diagnostics. Not yet demonstrated:
cursor-attach anchors, drag behavior, ObjectStateChange re-render, hit
targets under reflow, scene adapter integration.

## 3. Minimal integration spike

**Scene chosen: `well_plate_96_zoom`.**

Justification (two sentences): the zoom-class scene has a single primary
placement (88.7% primary ratio in stabilized NEW0), so it isolates the
contract question - hit target, cursor-attach, ObjectStateChange re-layout -
from composition complexity that would muddy the spike result. If the
contract question cannot be answered for the simplest scene, it cannot be
answered for the harder ones, and a composition scene like
`drug_dilution_plate_workspace` (25.2% primary ratio, 9 placements) can be
added as the section-7 stage-2 spike only after stage-1 succeeds.

Spike steps:

1. Render `well_plate_96_zoom` through the NEW1 CSS-native DOM structure
   inside the production runtime path - not the experiment harness in
   `experiments/css_native_layout/`. The scene must load through the same
   build, scene loader, and scene adapter a real protocol would use.
2. Wire one click target. The well plate primary placement gets a single
   DOM-backed hit area sourced from the scene adapter via semantic target
   name, not via pixel rect.
3. Run one interaction flow end-to-end: pipette pickup (cursor-attach) ->
   plate well click (hit target) -> `ObjectStateChange` on the well
   (re-layout / visual state).
4. Run `precheck.mjs` (or its production successor) against the rendered
   output and confirm hard-fail count is 0.
5. Compare against current production rendering. Compare method: pixel-diff
   screenshot against the same scene rendered by the existing layout engine,
   plus a diagnostics diff (precheck JSON vs current production scene
   diagnostics).

Exit criteria are defined in [section 9](#9-success-and-failure-gates). No
broad migration. No second scene attempted until the spike passes section 9
success gates.

## 4. Data contract

The NEW1 CSS-native layout consumes a closed data shape from the scene
adapter. Schema:

| Field                         | Type        | Required | Notes                                                                                              |
| ----------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scene_name`                  | string      | yes      | snake_case scene identifier                                                                        |
| `workspace`                   | enum string | yes      | One of the closed workspace values (`bench`, `hood`, `instrument`, ...)                            |
| `placements[]`                | list        | yes      | Ordered placement entries                                                                          |
| `placements[].placement_name` | string      | yes      | snake_case stable identifier within the scene                                                      |
| `placements[].object_name`    | string      | yes      | semantic scene-object name; adapter resolves to SVG/DOM                                            |
| `placements[].region`         | enum string | yes      | Closed region vocabulary (e.g., `rear_shelf`, `work_surface`, `front_tools`, `instrument_station`) |
| `placements[].label`          | string      | optional | Visible label text; absent means no label                                                          |
| `placements[].primary`        | bool        | optional | Marks the pedagogical primary placement; one true per scene maximum                                |

The `role` alternative is dropped in favor of a `primary` boolean. Rationale
(one sentence): a single boolean flag captures the only role distinction
NEW0 used (`data-primary`) without opening a free-form role string that would
admit ad hoc values.

**Forbidden fields (denylist).** Any of these fields reintroduces the
coordinate model and must be rejected at schema-validation time:

- `x`
- `y`
- `bounds`
- `align`
- `offset`
- `depth`
- `width`
- `height`
- `coords`
- `position`
- `transform`

The schema is closed for the same reason laid out in
`PRIMARY_DESIGN.md` under "Vocabulary closure and
anti-drift": authors compose existing terms, they do not invent new ones by
editing YAML alone, and open maps or `metadata`/`extras`/`config` blobs
permit uncontrolled vocabulary growth. The vocabulary-closure audit
checklist that NEW1 schema review uses is
`SPEC_DESIGN_CHECKLIST.md`.

## 5. Diagnostics as production gates

NEW0 precheck diagnostics are carried into NEW1 as production gates. Hard
fails block scene promotion; advisories surface in CI/precheck reports but
do not block.

| Diagnostic             | Hard fail / Advisory   | Source                                | Rationale                                                                                                            |
| ---------------------- | ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `clipped_artwork`      | Hard fail              | NEW0 `precheck.mjs`                   | Clipped object SVG indicates a layout containment failure; not acceptable in production                              |
| `off_page`             | Hard fail              | NEW0 `precheck.mjs`                   | An object outside the viewport is unclickable and breaks the visible-UI contract                                     |
| `svg_svg_overlap`      | Hard fail              | NEW0 `precheck.mjs`                   | Overlapping artwork creates ambiguous hit targets; pedagogically and mechanically wrong                              |
| `region_overflow`      | Hard fail              | NEW0 `precheck.mjs`                   | A placement exceeding its region invalidates the closed region taxonomy                                              |
| `label_label_overlap`  | Hard fail              | NEW0 `precheck.mjs`                   | Two overlapping labels are unreadable; promoted to hard fail because labels carry semantic identity for students     |
| `svg_label_overlap`    | Advisory               | NEW0 `precheck.mjs`                   | A label can sit on top of decorative SVG fill without harming readability; promote only if spike shows real misreads |
| `region_whitespace`    | Advisory               | NEW0 `precheck.mjs`                   | Sparse template scenes legitimately trip this; advisory until calibrated                                             |
| `primary_object_ratio` | Advisory (scene-class) | NEW0 stabilized scene-class checklist | Scene-class thresholds are heuristic; ratio remains advisory until validated against interactive scenes              |

NEW0 visual-checklist booleans (`labels_readable`, `supporting_nearby`,
`primary_obvious`) remain advisory until calibrated against real interactive
scenes in the spike (section 3). They are heuristic visual-QA flags, not
mechanical gates, and should not block NEW1 spike outcomes.

## 6. WARN resolution

The 6 WARN scenes from NEW0 do not block NEW1 planning. They are heuristic
visual-QA flags, not mechanical failures: hard-fail counts
(`clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`) are all
zero across the 10 NEW0 scenes per
[new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md).

NEW1 must decide handling of three checklist items, after the spike:

- `labels_readable`. Calibrate against an actual screenshot OCR pass on
  spike-rendered scenes, or accept as a heuristic flag that surfaces in
  reports but does not gate promotion.
- `supporting_nearby`. Zoom-mode scenes legitimately have no supporting
  objects nearby (currently flagged false for `well_plate_96_zoom` by
  design). Add a zoom-mode exemption to the check or document that the flag
  is expected-false for zoom-class scenes.
- Primary-ratio scene-class thresholds. Currently advisory in the
  stabilized NEW0 precheck. Promote to a hard gate only if the spike shows
  the threshold meaningfully correlates with student-visible primary-object
  failure; otherwise keep advisory.

These decisions are deferred to post-spike. NEW1 planning does not
pre-resolve them.

## 7. Migration strategy

Staged rollout. No mass rewrite. Each stage has its own go/no-go gate;
failure at any stage halts migration, and the reviewer chooses revise vs
abandon at that gate.

1. **Stage 1 - One-scene spike.** Section 3. `well_plate_96_zoom` through
   production runtime, with one click target and one end-to-end interaction.
   Gate: section 9 success gates.
2. **Stage 2 - One-protocol spike.** One mini-protocol rendered end-to-end
   through CSS-native, scene-by-scene through its `entry_step` chain.
   Choose the smallest mini-protocol whose scenes are already in the NEW0
   set. Gate: zero hard fails across every scene in the mini-protocol; the
   walker completes every step through the visible UI per the contract item
   4 walker rules in `PRIMARY_SPEC.md`.
3. **Stage 3 - Three-scene-class coverage.** Composition (e.g.,
   `drug_dilution_plate_workspace`), zoom (`well_plate_96_zoom`), and
   instrument-heavy (`electrophoresis_bench`) all rendered through
   CSS-native in production. Gate: per-scene-class hard-fail counts are
   zero; advisory diagnostics do not regress against current production.
4. **Stage 4 - Broader base_scene migration.** Only if stages 1-3 all pass
   their gates. Section 5 diagnostics remain in force. Section 8 deletion
   conditions are evaluated at this stage, not earlier.

## 8. Old layout manager boundary

`layout_engine.ts`
and related production layout code remain in place during NEW1 planning and
the integration spike. CSS-native rendering during spike runs alongside the
layout engine in a scoped path; nothing in the layout engine is removed,
renamed, or deprecated by NEW1.

Quarantine and deletion conditions for the layout engine (all must hold
before any deletion is proposed):

- Contract amended under Path A in section 1.
- Integration spike passes section 9 success gates.
- All production scenes covered by a CSS-native equivalent that itself
  passes section 5 hard-fail gates.
- Documented rollback path: how to revert if a regression is discovered
  post-deletion (likely git revert against a tagged pre-deletion commit
  plus a documented re-enable procedure for the layout engine).

Explicit: no layout-engine deletion, no deprecation comment, no API
narrowing happens during NEW1 planning. Deletion is a post-stage-4 question
at the earliest.

## 9. Success and failure gates

NEW1 is falsifiable. The spike either meets every success gate or it
triggers re-evaluation under the failure gates.

**Success gates (all must pass).**

- One production scene (`well_plate_96_zoom` per section 3) renders through
  CSS-native layout in the production runtime path.
- One click target works through the visible UI path; a Playwright
  walkthrough confirms the click registers per
  `E2E_TESTS.md` and
  `PLAYWRIGHT_USAGE.md`.
- One interaction completes end-to-end: click -> validator -> response ->
  `ObjectStateChange` causes the expected re-render.
- Precheck hard-fail count = 0 on the rendered scene. Hard fails defined in
  section 5.
- Screenshot diff vs current production is acceptable. "Acceptable" means
  either (a) pixel-diff under a 5% per-region delta threshold against the
  layout-engine-rendered baseline, OR (b) explicit human review pass
  recorded in the spike report. Both forms are evidence; the spike picks
  one and records the result.

**Failure gates (any triggers re-evaluation).**

- CSS-native cannot support interaction without internally recreating a
  coordinate engine - that is, the spike ends up adding pixel-math, JS-side
  bounding-rect computation, or coordinate-keyed state that mirrors the
  existing layout engine. This is the reviewer 2026-05-19 risk; if it
  fires, Path B is the likely outcome.
- Contract amendment rejected (Path B selected by the user at the decision
  gate). NEW1 closes; CSS-native stays under `experiments/`.
- Diagnostics show regression vs current production rendering: a hard fail
  on the spike scene that current production does not exhibit, or an
  advisory whose count or severity exceeds current production by a clear
  margin recorded in the spike report.

## Boundaries

- No edits to production code yet.
- No amendments to `PRIMARY_CONTRACT.md` yet.
- No broad migration.
- No continuation of NEW0 visual tuning unless required by this plan.
- Keep NEW0 evidence as input, not as production proof.

## Relationship to other active_plans docs

- [new0_stabilization_continuation.md](new0_stabilization_continuation.md):
  closed on 2026-05-19 (reviewer-accepted closure after the NEW0
  hardening pass on the same date); the closure is recorded in the
  status line and closure note of
  [new0_stabilization_continuation.md](new0_stabilization_continuation.md).
  NEW1 supersedes it as the forward planning surface.
- [new0_reproducible_evidence_package.md](new0_reproducible_evidence_package.md):
  input evidence to NEW1 (10 scenes, 0 hard fails, stabilized verdict mix).
  NEW1 does not modify NEW0 evidence; it consumes it.

NEW1 supersedes NEW0 as the forward planning surface. NEW0 work continues
only insofar as NEW1's spike or migration stages require specific NEW0
artifacts (e.g., the precheck runner, the contact sheets).

## Ready to implement spike

Prep phase complete. Spike can begin on reviewer approval.

### Inputs ready

- Readiness audit: [new1_spike_readiness_audit.md](new1_spike_readiness_audit.md)
- Spike implementation checklist: [new1_well_plate_96_zoom_spike_checklist.md](new1_well_plate_96_zoom_spike_checklist.md)
- Contract amendment draft (not applied): [new1_primary_contract_item3_amendment_draft.md](new1_primary_contract_item3_amendment_draft.md)
- Spike fixtures: `experiments/css_native_layout/spike_fixtures/`
- Precheck usage doc: `experiments/css_native_layout/PRECHECK_USAGE.md`
- Precheck wrapper: `experiments/css_native_layout/run_precheck.sh`

### Proposed seam

Single conditional inside `src/scene_runtime/layout/adapter.ts`, gated on `scene.scene_name === 'well_plate_96_zoom'` plus a feature flag. Dispatches to new `computeSceneLayoutCssNative()`. Returns matching `ComputedItemLayout[]` so consumers stay untouched. Full rationale in the readiness audit.

### Remaining blockers before implementation

1. Reviewer approval of the readiness audit and the proposed seam.
2. Reviewer call on the contract decision posture: spike runs under current contract item 3 as a conditional substitution, but reviewer should confirm before merging the spike PR.
3. Reviewer call on `label_label_overlap` policy (hard vs advisory) before precheck runs are interpreted as gates.
4. Implementer choice of feature-flag mechanism (audit lists three; recommends hard-coded boolean for one-revert rollback).

### Out of scope for spike

- Other scenes (only well_plate_96_zoom).
- Dispatch, render/apply, state mutation code.
- Schema changes to existing YAML.
- Contract amendment (deferred until spike result).
- New precheck metrics.
- Broader migration.
