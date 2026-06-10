# Layout remaining work

This document is a comprehensive reference for the layout and aesthetic improvement
work remaining after the cycle that shipped in June 2026. It describes what has
already shipped, what is pending, who owns each item, and the recommended order
of attack. It is a durable reference doc, not an active-plans artifact.

## 1. Purpose and status

### What has shipped this cycle

Two improvements landed before this document was written.

**Grounding cue (render layer) -- SHIPPED.**
Round-1 of the aesthetic-improvement loop introduced a per-object contact
drop-shadow (`filter: drop-shadow(0px 6px 8px rgba(40,44,48,0.26))`) and a
workspace-conditional surface band (`#scene-root[data-scene-workspace=...]::after`)
anchored at `top: 78%`. The band is warm wood-tone for bench-type workspaces
(`workspace_bench`, `cell_counter`), neutral cool blue-grey for clinical
workspaces (`microscope`, `incubator`, `plate_reader`), and absent for the
hood. Every scene received a grounding-score lift; the final state is
documented in
[aesthetic_round1_grounding.md](active_plans/reports/aesthetic_round1_grounding.md).
`generated/precomputed_layout.ts` stayed byte-identical throughout the
grounding sub-rounds -- no geometry changed.

**Label-disambiguation spacing (layout engine) -- SHIPPED.**
The nudge pass in `src/scene_runtime/layout/layout_labels.ts` was corrected
to use `effectiveLabelHalfWidth` (the wider of the authored `label_width`
budget and the actual rendered text half-width) rather than the raw
`label_width` average. This closes the visual overprint on
`electrophoresis_bench` and also closes a diagnostic blind spot (the engine
was reporting 0 label overlap codes while labels were visually colliding).
The fix is Lever 1 from
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md).

### What this document covers

Everything else. The remaining work divides into five categories:

- **Void-collapse** (authoring): reducing large center-empty regions in scene YAML.
- **Focal-promotion** (authoring): enlarging or repositioning the primary teaching
  object in object/scene YAML.
- **The 4 Error diagnostics** (authoring + possible contract change): four
  `severityDiagnostics` Errors emitted by the current build, two of which may
  warrant reclassification.
- **Label-Error severity contract** (contract decision): deciding whether a
  cross-zone label graze that the label layer cannot fix should stay as an Error
  or be downgraded to a Warning.
- **Baseline-tool gap** (engine/tooling): the E2E diagnostics baseline runner
  queries the old `diagnostics` stream instead of `severityDiagnostics`, making
  the gate untrustworthy.

Prior baseline scores are in
[aesthetic_baseline_round0.md](active_plans/reports/aesthetic_baseline_round0.md).
Error-diagnostic details are in
[layout_error_diagnostics_investigation.md](active_plans/reports/layout_error_diagnostics_investigation.md).

---

## 2. Remaining work categories -- overview table

| Category | Nature | Owner | Risk level | Crosses pedagogical-composition boundary? |
| --- | --- | --- | --- | --- |
| Void-collapse | Scene YAML zone `y` baselines and `align_stop` edits | Scene author | Low per-scene; medium for multi-scene sweep | YES -- zone repositioning changes which objects appear in which curriculum context; must align with protocol intent |
| Focal-promotion | Object YAML `display_width_cm` or scene YAML dedicated-zone edits | Object/scene author | Low-medium; "primary" picks are often debatable | YES -- enlarging an object implies it is the focal teaching object; must match protocol's first-interaction target |
| 4 Error diagnostics | Authored zone-geometry fixes (2 label Errors + 1 object overlap) + 1 deferred pending severity-contract decision | Scene author | Low for each fix; medium if contract change needed first | Partially -- the object-overlap Error is a correctness defect; the label Errors are zone-geometry tuning |
| Label-Error severity contract | Deciding whether cross-zone label grazes that the label layer cannot resolve should be Error or Warning | Human (contract decision) | Low implementation; high if wrong (degrades gate signal) | NO -- purely a diagnostic-system design question |
| Baseline-tool gap | Add `severityDiagnostics` column to `tests/e2e/e2e_layout_diagnostics_baseline.mjs` | Engine/tooling developer | Low | NO -- purely a tooling fix |

**Key principle for void-collapse and focal-promotion.** These are NOT bulk engine
algorithm changes. The evidence in
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md)
confirmed that the placement engine (`horizontal_layout`, `vertical_layout`,
`row_strategy`) places objects correctly within their zones. Voids arise from
sparsely positioned zones in scene YAML, not from engine bugs. Fix the YAML
authoring, not the engine.

---

## 3. Scene-by-scene breakdown

One subsection per scene. Data sources: void percentages from the void-collapse
lever table in
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md);
primary-area percentages from the focal-promotion table in the same file;
Error diagnostics from
[layout_error_diagnostics_investigation.md](active_plans/reports/layout_error_diagnostics_investigation.md);
round-0 scores from
[aesthetic_baseline_round0.md](active_plans/reports/aesthetic_baseline_round0.md).

### Round-0 score summary

| Scene | r0 overall | r0 grounding | r0 focal_dominance | r0 label_clarity | r0 whitespace |
| --- | --- | --- | --- | --- | --- |
| `cell_counter_basic` | needs_review | 2 | 4 | 4 | 2 |
| `staining_bench` | needs_review | 2 | 4 | 3 | 3 |
| `sample_prep_bench` | weak | 2 | 2 | 3 | 3 |
| `hood_basic` | needs_review | 2 | 3 | 4 | 3 |
| `seeding_workspace` | needs_review | 2 | 3 | 3 | 3 |
| `electrophoresis_bench` | weak | 1 | 2 | 2 | 2 |
| `heat_block_bench` | needs_review | 2 | 3 | 4 | 3 |
| `bench_basic` | -- | -- | -- | -- | -- |
| `passage_hood_detachment_microscope_view` | clear | 3 | 5 | 4 | 4 |

`bench_basic` was rendered in the test set but was not scored in round-0 because
it was present as a stand-in for `heat_block_bench.png` (see cross-cutting note
below). `heat_block_bench` has a distinct score above, which was collected from
the same render pass that scored the other seven scenes.

---

### 3.1 cell_counter_basic

**Workspace kind.** `cell_counter` (bench-adjacent, warm surface band).

**Void status.**
Approximate center-emptiness ~55%, ranked 4th of 8. A wide horizontal band
separates the top row (slide cartridge, Trypan Blue, cell suspension) from the
lower instrument band. The reviewer described the result as "two disconnected
shelves." This is a real defect -- there is no pedagogical reason for the gap.
The zone `y` baselines for the upper and lower zones have too much separation;
pulling the upper zone's bottom boundary closer to the lower zone's top boundary
would collapse the void without moving the objects out of their correct
curriculum zones.

**Focal status.**
Primary object: `cell_counter` (automated cell counter), primary area ~12.4% of
scene units. This is a strong focal size -- the counter is clearly the teaching
instrument. No promotion needed; the object already dominates the lower band.
The round-0 `focal_dominance` score of 4 confirms this.

**Label status.** Clean. No standing Errors on this scene.

**Recommendation.**
Target: collapse the mid-canvas void by raising the `y_start` of the upper zone
(or lowering the `y_end` of the lower zone) by approximately 10-12 scene-percent
units. Do NOT move objects to different zones. Verify that the three upper objects
(slide cartridge, Trypan Blue, cell suspension) still cluster visually around the
instrument workflow after the zone adjustment. This is a low-risk, self-contained
authoring edit.

---

### 3.2 staining_bench

**Workspace kind.** `bench` (warm surface band).

**Void status.**
Approximate center-emptiness ~85%, ranked 1st (worst) of 8. The evidence in
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md)
identifies a wide vertical inter-zone gap at approximately y=32-44 scene-percent.
This is a genuine composition defect: two separately-authored zones with the
reagent row in the top band and the microwave/tray/waste in the lower band create
a large dead stripe through the scene center. Note that the round-0 reviewer gave
`canvas_balance` a 4 (good), meaning the scene is not lopsided -- it is balanced
but empty in the middle. The fix is a zone-y edit, not a column redistribution.

**Focal status.**
Primary object: `staining_tray`, primary area ~3.1%. The reviewer noted the
microwave as the strong central focal object (round-0 `focal_dominance` 4), but
the evidence table names `staining_tray` as the engine's primary pick at 3.1%.
This discrepancy suggests the "primary" designation in the layout engine does not
match what a vision reviewer reads as dominant. Before any focal-promotion edit,
confirm which object the protocol's first interaction targets. If the microwave is
the correct focal object, it may already be adequately sized at its current
position; enlarging `staining_tray` when the microwave dominates visually would be
wrong.

**Label status.**
Round-0 review noted that adjacent near-identical bottle names ("Coomassie stain"
vs "Coomassie recycle bottle") caused brief label ambiguity. After the
`effectiveLabelHalfWidth` fix, the label nudge pass should have improved spacing.
Re-render and re-check after shipping the label fix before deciding whether
further zone-geometry label work is needed on this scene. No standing Error.

**Recommendation.**
Highest-priority void-collapse target in the set. Reduce the inter-zone vertical
gap at y=32-44 by editing zone `y_end` / `y_start` boundaries in the scene YAML.
Verify that neither zone's object list overflows after the gap is closed (the
packer may need to adjust column counts). Defer focal-promotion until the
"primary" designation is confirmed against the protocol.

---

### 3.3 sample_prep_bench

**Workspace kind.** `bench` (warm surface band).

**Void status.**
Approximate center-emptiness ~65%, ranked 3rd. The round-0 reviewer scored this
scene "weak" -- the strongest critique was not void area per se but the scatter
of three loose rows with no workflow logic ("packer-dump of small similar
tubes/bottles"). Closing the void alone will not fix the scene; the underlying
issue is that duplicate items (two "Microtube rack (24-slot)", two "Laemmli 4x",
two tip boxes) have no grouping rationale, so closing zones just tightens the
scatter rather than creating a legible workflow cluster. This is an authoring
problem that requires a human decision before any layout edit.

**Focal status.**
Primary object: `micropipette`, primary area ~0.3%. This is almost certainly a
wrong primary pick. A micropipette at 0.3% is invisible as a focal object; the
visual evidence from round-0 shows no dominant teaching instrument. The reviewer
noted "no single dominant teaching object." Before any focal-promotion edit, the
scene author must identify which object the protocol intends as the teaching
focus. Do not enlarge the micropipette; it is not the intended dominant object.

**Label status.**
Round-0 found duplicate labels "Microtube rack (24-slot)" twice. This is an
authoring-rename decision (different physical racks need distinct labels so
students can identify each by name). No standing Error from the engine, but the
disambiguation requires a human call on whether the duplicates are intentional.
This was documented in
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md)
as a label-layer target that needs authoring rename, not an engine fix.

**Recommendation.**
HOLD on layout edits. The scene needs a human authoring decision first:
(a) confirm whether duplicate racks/reagents are intentional or an error,
(b) if intentional, assign distinct labels so the layout engine can
disambiguate, (c) identify the focal teaching object so any promotion edit
targets the correct object. Until those decisions are made, void-collapse and
focal-promotion edits will be applied to the wrong composition.

---

### 3.4 hood_basic

**Workspace kind.** `hood` (no surface band; clinical enclosure).

**Void status.**
Approximate center-emptiness ~32%, ranked 7th (2nd least). This is near the
boundary between a real defect and intentional hood breathing room. The BSC
(biosafety cabinet) workspace has an empty zone slot that the "BSC workspace"
label is anchored to; this is the source of the reported emptiness, not a broad
center void. The recommended approach is to either place an object in that zone
slot or suppress the orphan label -- not to collapse the hood geometry globally.
A hood scene is intentionally more open than a bench scene because the student
needs visual separation to identify pick-up and placement zones clearly.

**Focal status.**
Primary object: `hood_surface` at 14.6%. A `well_plate_96` at 5.7% is also
a candidate. The `hood_surface` is likely the zone-level concept, not a physical
object. The round-0 reviewer identified the 96-well plate as the eye-catcher.
Confirm whether `hood_surface` is a layout artifact or a distinct SVG-backed
object before any promotion edit.

**Label status.**
Round-0 identified the "BSC workspace" label as anchoring to empty space.
No Error from the engine, but the orphan label is a label-clarity issue.
The fix is an authoring decision: place the intended object in the BSC workspace
slot, or remove the slot and merge its space into an adjacent zone.

**Recommendation.**
Low priority for void-collapse. Do not mass-compress the hood layout. Address
the orphan "BSC workspace" label as a targeted authoring edit: either populate
the zone slot or remove it. Clarify whether `hood_surface` is a real scene
object before any focal-promotion work.

---

### 3.5 seeding_workspace

**Workspace kind.** `hood` (no surface band; classified as hood workspace in
scene registry). Note: `seeding_workspace` carries `data-scene-workspace="hood"`,
which excludes it from the warm bench band. This was reviewed and accepted in
[aesthetic_round1_grounding.md](active_plans/reports/aesthetic_round1_grounding.md).

**Void status.**
Approximate center-emptiness ~48%, ranked 5th. The mid-band "BSC workspace" zone
is empty, contributing a visible dead strip. The round-0 reviewer noted this
specifically as an over-sparse pattern. Unlike `hood_basic`, this scene has more
objects and a denser lower band, so closing the mid-band void would bring the
workflow items into a more coherent cluster without losing the hood's visual
openness.

**Focal status.**
Primary object: `well_plate_96`, primary area ~1.4%. The round-0 reviewer noted
the incubator (top right) and vortex (bottom) as the strong instrument anchors
with the 96-well plate adding color interest. At 1.4%, the plate is not visually
dominant. The incubator is likely a better focal candidate for a seeding protocol
(it is where cells ultimately go). Confirm against the protocol's first-interaction
target before any promotion edit.

**Label status.**
Round-0 identified cramped label clustering in the bottom-left trio (cell
suspension, conical tube, micropipette). The `effectiveLabelHalfWidth` fix should
have improved nudge separation. Re-check after shipping the label fix.

**Error diagnostics -- unresolved_overlap (CORRECTNESS DEFECT).**
The engine emits `unresolved_overlap` for `rear_right_incubator`. The incubator has
`display_width_cm=55` in hood workspace, producing a visual width of approximately
38 scene-percent and a height that exceeds the `rear_right` zone height of 31
scene-percent. Even at `MIN_SCALE=0.55` the incubator escapes the zone vertically.
The `clampSceneBounds` / `validateBounds` phase records worst-axis overshoot of
12.85. This is a genuine layout correctness defect -- the object does not fit its
assigned zone -- and it predates the label work (introduced in M6, 2026-06-08).
Owner: scene author (zone too small) / object author (object too large).

**Recommendation.**
Fix the `unresolved_overlap` Error first -- this is the one genuine correctness
defect in the set. Two options:

1. Give the incubator a dedicated tall right-side zone (height >=50 scene-percent)
   so the object fits at minimum scale.
2. Reduce `rear_right_incubator`'s `display_width_cm` from 55 to approximately 25
   in the object library. This affects the incubator across all scenes, so verify
   the visual result in every scene that uses this object.

After fixing the overlap, address the mid-band void as a secondary edit. Defer
focal-promotion until the correctness defect is resolved.

---

### 3.6 electrophoresis_bench

**Workspace kind.** `bench` (warm surface band).

**Void status.**
Approximate center-emptiness ~72%, ranked 2nd. The electrophoresis tank floats
alone in a large void with huge dead zones around it. Round-0 scored this scene
"weak" with the lowest grounding (1) and the lowest scores across focal_dominance,
label_clarity, instructional_grouping, and canvas_balance (all 2s). This is the
most compositionally broken scene in the set. The core problem is that workflow
items are scattered to far corners (gel cassette, comb, tip box on the right;
buffers far left) with no clustering around the tank.

**Focal status.**
Primary object: `electrophoresis_tank`, primary area ~3.0%. At 3.0% of scene
units the tank is not visually dominant enough for the teaching instrument. The
round-0 reviewer recommended bringing the tank, power supply, and gel cassette
into one tighter cluster and redistributing items to eliminate the rim-only
layout. Promotion by increasing `display_width_cm` is one lever, but the larger
problem is the zone composition: items belong in different zones that currently
create a dispersed layout.

**Label status.**
Round-0 found overlapping/wrapping labels in the top-left cluster ("Protein
ladder tube", "Buffer recycle bottle", "Running buffer 10x"). The
`effectiveLabelHalfWidth` fix in the label nudge pass was specifically designed
to address this exact pattern (see the evidence file's "Ranked label-layer
targets" table, where `electrophoresis_bench` is Rank 1). Re-render after
shipping the label fix before assessing whether further zone-geometry label edits
are needed.

**Additional authoring issue -- placeholder asset.**
The "Electrode module" renders as a dashed empty rectangle (placeholder asset).
A real, normalized SVG asset is needed before this scene can pass visual review.
This is a human/asset-author action.

**Recommendation.**
This scene requires the most work but has several blockers:
(1) Resolve the "Electrode module" placeholder asset first (human action).
(2) Re-render after the label fix to assess the top-left label cluster.
(3) After those two prerequisites are cleared, redesign the zone layout to
bring the electrophoresis tank, power supply, and gel-prep items into a
tighter cluster. This is a meaningful authoring effort -- essentially a scene
recomposition -- and should be done as a deliberate author pass, not an
automated geometry change.

---

### 3.7 heat_block_bench

**Workspace kind.** `bench` (warm surface band).

**Void status.**
Data for `heat_block_bench` is noted in the evidence as potentially
ambiguous because `heat_block_bench.png` was absent from the
`test-results/m7_after_r17/` render set; `bench_basic.png` was rendered
instead. The void percentage in the ranking table (not listed separately
for `heat_block_bench` in the evidence) should be treated as unconfirmed.
Confirm whether `heat_block_bench` is a distinct scene with its own render
pass before making any layout changes.

**Focal status.**
Primary object: `heat_block`, primary area ~1.2%. The heat block is
the teaching instrument ("95 C" readout) but its area is small relative
to the two loaded microtube racks. Round-0 reviewer flagged this: "Heat
block is not visually dominant enough relative to the racks given it is
the teaching instrument." A focal-promotion edit to increase
`display_width_cm` for the heat block is warranted IF the protocol's
first-interaction target is the heat block.

**Label status.** Clean in round-0 (label_clarity scored 4, no overlaps).
No standing Error.

**Authoring question -- duplicate racks.**
Round-0 found "Microtube rack (24-slot)" appearing twice (top band and
bottom band) without an obvious workflow reason. This may be intentional
(before/after placement) or an authoring duplication. A human decision is
needed before any grouping or focal-promotion edit.

**Recommendation.**
(1) Confirm that `heat_block_bench` has a dedicated render pass (not a
bench_basic stand-in) before any layout work.
(2) Get a human decision on the duplicate microtube racks.
(3) If the heat block is confirmed as the focal object, increase its
`display_width_cm` to make it visually dominant over the racks.
This is a targeted single-object edit with low risk.

---

### 3.8 bench_basic

**Workspace kind.** `bench` (warm surface band).

**Void status.**
Approximate center-emptiness ~42%, ranked 6th (borderline). The evidence
notes this as "borderline" -- neither clearly defective nor clearly fine.

**Focal status.**
Primary object: `centrifuge`, primary area ~10.2%. A 10% primary area is
a healthy focal size; the centrifuge likely reads as dominant. Round-0
did not produce a scored review for `bench_basic` as a standalone scene
(it appeared in the render set as a stand-in for `heat_block_bench`).
No r0 score available.

**Label status.**
The engine emits an `unresolved_label_overlap` Error on `bench_basic`.

**Error diagnostics -- unresolved_label_overlap.**
Involved items: `rear_left_waste` label vs `center_centrifuge` ARTWORK.
Root cause: the `rear_left` zone (top y=5 to y=36) and the `center` zone
(top y=38 to y=94) share the left edge at x=5. The centrifuge artwork's
top reaches y=38, which clips the waste label band at approximately y=36.
The `effectiveLabelHalfWidth` detection widening (the label fix) widened
the detection box enough to flag this cross-zone label-vs-artwork
collision. The 4-pass resolver cannot clear it because any nudge hits the
zone boundary. Owner: scene author.

Minimal fix: raise the `center` zone top boundary to `y_start >= 40`, or
reduce the `rear_left` `label_offset_y` so the waste label sits at
`y <= 34`. Either edit is a small scene YAML authoring change.

**Recommendation.**
Apply the minimal zone-boundary fix (raise `center` zone `y_start` to 40
or reduce `rear_left` `label_offset_y`). This is a low-risk two-line
authoring edit. Defer void-collapse for now (borderline status).

---

### 3.9 passage_hood_detachment_microscope_view

**Workspace kind.** `microscope` (neutral blue-grey surface band).

**Void status.**
Approximate center-emptiness ~38%, ranked 7th. The evidence explicitly
flags this scene: "Intentional framing; do NOT collapse." The microscope
dominates the center and supporting objects orbit it in a believable
cluster. The whitespace is load-bearing -- it frames the teaching
instrument. Collapsing the void would destroy the visual framing that
made this the only "clear" scene in round-0.

**Focal status.**
Primary object: `microscope`, primary area ~18.1%. Highest in the set.
Round-0 gave `focal_dominance` a 5. Do not touch the microscope scale.

**Label status.**
The engine emits an `unresolved_label_overlap` Error on this scene.

**Error diagnostics -- unresolved_label_overlap (x2, symmetric).**
Involved items: `left_cell_suspension` label vs `instrument_t75_flask`
LABEL. Root cause: `instrument_area` zone (left x=31 to x=71) and
`left_bench` zone (left x=4 to x=36) overlap at x=31-36. The t75 flask
placed in the overlap band collides with the cell suspension label
(`align_stop` right ~x=36). The collision is symmetric, counted as 2 in
the Error table. Owner: scene author.

Minimal fix: move `instrument_t75_flask` to the `left_bench` zone
(`align_stop` left end), OR narrow the `instrument_area` left bound to
`x_start >= 37`. The first option (move the flask) is lower risk because
it does not alter the zone geometry that positions the microscope.

**Recommendation.**
Do not collapse the void. Address the `unresolved_label_overlap` Error
with the targeted fix: move `instrument_t75_flask` to the `left_bench`
zone or narrow `instrument_area` left bound to >=37. Keep the microscope
and its surrounding cluster untouched.

---

## 4. The two non-authoring decisions

### 4.1 Label-Error severity contract

**Current state.** The engine emits `unresolved_label_overlap` (Error severity)
for any label-vs-label or label-vs-artwork collision that the 4-pass label
resolver cannot clear within its budget. This is appropriate when the label
layer is responsible and could resolve the collision given more passes or
different nudge parameters. However, two of the four current Errors
(`bench_basic` and `passage_hood_detachment_microscope_view`) are cross-zone
collisions that the label layer structurally cannot clear: any nudge hits a
zone boundary and the resolver exits without convergence. The real fix for
these cases is an object move or a zone-geometry change -- an authoring
action, not a label-placement action.

**The problem.** Emitting both types as Error conflates two different root causes:

- Type A: label layer converged but left overlap -- the label system failed.
  This is a genuine Error; the label layer is responsible.
- Type B: label layer hit a zone boundary while resolving a cross-zone graze --
  the scene zone geometry is responsible, not the label layer.

If both types stay as Error, the Error stream becomes noisy with Type B items that
the label layer cannot fix, and scene authors receive a confusing message ("label
error") when the real fix is a zone-geometry edit.

**Recommendation.**
Reserve `unresolved_label_overlap` (Error) for Type A: cases where the label
layer is responsible and could in principle resolve the collision. For Type B
(a cross-zone graze that structurally requires an object move or zone-geometry
change), route to a Warning (`poor_label_alignment`) addressed to the scene
author. The Warning must still name the scene, the zones involved, and the
colliding labels so authors have actionable context. It must NOT suppress the
information -- it changes severity and messaging, not detectability.

The `seeding_workspace` `unresolved_overlap` (object-level) is NOT affected by
this decision; it is already a different diagnostic code (`unresolved_overlap`,
not `unresolved_label_overlap`) and should stay as an Error because it is a
genuine object-fit failure.

**Risk.** The main risk is that downgrading Type B cases inadvertently masks a
real collision that the label layer could have fixed if the zone boundary were
not there. The safeguard is: (1) the Warning must include the collision geometry
and the zone names, (2) scene authors are explicitly named as the responsible
party, and (3) the Warning must still appear in the baseline runner output so it
does not silently disappear. With those safeguards, the Error stream becomes a
trustworthy build-gate signal: Error means "the label system failed and we
cannot ship"; Warning means "a zone boundary is causing a visual graze -- scene
author should review."

This is a contract decision. It requires human approval before implementation.
Do NOT implement it based solely on this doc.

---

### 4.2 Baseline-tool gap

**Current state.** The diagnostics baseline runner
`tests/e2e/e2e_layout_diagnostics_baseline.mjs` queries the OLD runtime
`diagnostics` stream, not `severityDiagnostics`. The `diagnostics` stream is
a legacy flat array that does not carry severity levels; `severityDiagnostics`
is the current severity-graded output (`Error`, `Warning`, `Review-required`).
This mismatch is why the M7 evidence table reported zero Errors for
`bench_basic` and `passage_hood_detachment_microscope_view`: those Errors
were only visible in `severityDiagnostics`, which the baseline runner never
queried. The full investigation is in
[layout_error_diagnostics_investigation.md](active_plans/reports/layout_error_diagnostics_investigation.md)
under the "Tooling gap" section.

**Consequence.** The baseline runner is currently not a trustworthy gate for
Error-severity diagnostics. A build that introduces new Errors can pass the
baseline runner because the runner is checking the wrong stream.

**Recommendation.**
Add a `severityDiagnostics` column to the baseline runner. For each scene, the
runner should output: existing diagnostics columns (unchanged) plus a new column
showing the count and codes of `severityDiagnostics` at each severity level
(`Error`, `Warning`, `Review-required`). The existing `diagnostics` column can
stay for backward compatibility. The gate condition should be: zero `Error`-
severity `severityDiagnostics` across all scenes (after any label-Error severity
reclassification decided in section 4.1 is applied).

This is an in-bounds engine/tooling change. It does not touch any authored
scene YAML, object YAML, or protocol YAML. It does not require human approval
beyond a normal code review. It should be done before or in parallel with the
authoring fixes in section 5 so the gate is trustworthy when those fixes land.

---

## 5. Recommended sequence

Priority order. Items earlier in the list unblock items later.

### Priority 1 -- fix the one real correctness defect

Fix `seeding_workspace` `rear_right_incubator` `unresolved_overlap`.

This is the only item in the entire list that is a genuine layout correctness
failure: an object does not fit its zone and the engine records a worst-axis
overshoot of 12.85 scene-percent. Every other item is a polish or tooling
improvement. Do this first.

Two options (choose one):

- **Option A (preferred if incubator scale is correct).** Move `rear_right_incubator`
  to a dedicated tall zone with height >=50 scene-percent on the right side of
  the scene. This requires adding a new zone to the `seeding_workspace` scene YAML.
- **Option B (if the object is genuinely oversized).** Reduce
  `rear_right_incubator`'s `display_width_cm` from 55 to approximately 25 in the
  object library YAML. Verify the visual result in every scene that uses the same
  incubator object.

Acceptance criterion: `unresolved_overlap` for `seeding_workspace` no longer
appears in `severityDiagnostics` after the fix.

---

### Priority 2 -- label-Error severity decision and baseline-tool fix

Both items are cheap, parallelizable, and restore the reliability of the
build gate.

**2a. Label-Error severity decision (human decision).**
Take the contract decision from section 4.1 to the human. The options are:
keep all `unresolved_label_overlap` as Error (current behavior), or reclassify
cross-zone structural grazes to Warning. Record the decision in `docs/CHANGELOG.md`
and if the reclassification is approved, update the severity model in
`src/scene_runtime/layout/diagnostics/severity_model.ts`.

**2b. Baseline-tool fix (tooling developer).**
Add the `severityDiagnostics` column to
`tests/e2e/e2e_layout_diagnostics_baseline.mjs` as described in section 4.2.
Run the baseline against the current build to establish the new column values;
update the snapshot. This is a self-contained Node script change.

---

### Priority 3 -- the two cross-zone label Errors

Once the label-Error severity decision is made (Priority 2a), address the two
cross-zone `unresolved_label_overlap` Errors as small authored zone-geometry edits.

**3a. bench_basic.**
Raise the `center` zone `y_start` to >=40, or reduce the `rear_left`
`label_offset_y` so the waste label sits at y<=34. Estimated effort: edit 2-3
lines in the `bench_basic` scene YAML. Re-run the baseline to confirm the
Error clears.

**3b. passage_hood_detachment_microscope_view.**
Move `instrument_t75_flask` to the `left_bench` zone (`align_stop` left end),
or narrow `instrument_area` left bound to `x_start >= 37`. The flask-move option
is lower risk. Estimated effort: edit 2-3 lines in the scene YAML. Do NOT
touch the microscope position, scale, or the overall void framing.

---

### Priority 4 -- void-collapse (OPTIONAL targeted polish)

Do NOT mass-rewrite all scenes. Pick only the worst, clearest cases.

**Approved void-collapse targets (clear defects):**

- `staining_bench` (~85% center void from a vertical inter-zone gap at y=32-44):
  highest priority in this category. Reduce the inter-zone gap by editing
  zone `y_end` / `y_start` boundaries. Re-check packer column counts after.
- `electrophoresis_bench` (~72% center void): second priority, but this scene
  has a placeholder asset blocker ("Electrode module") that must be resolved
  by a human before any layout redesign is useful. Do not invest layout effort
  on a scene with a placeholder asset.

**Intentional voids (do NOT collapse):**

- `passage_hood_detachment_microscope_view` (~38%): intentional microscope
  framing. Collapsing would destroy the round-0 "clear" rating.
- `hood_basic` (~32%): appropriate BSC open-workspace framing. Address only
  the orphan "BSC workspace" label slot, not the overall void.

**Borderline cases (defer):**

- `cell_counter_basic` (~55%): real defect but lower urgency than staining/gel.
- `sample_prep_bench` (~65%): needs human authoring decisions before layout edits.
- `seeding_workspace` (~48%): address the correctness defect first; re-evaluate
  void after.
- `bench_basic` (~42%): borderline; defer.
- `heat_block_bench`: missing render data; confirm scene identity first.

---

### Priority 5 -- focal-promotion (OPTIONAL targeted polish)

Do NOT promote objects based on the engine's current "primary" picks alone.
Several are likely wrong (notably `micropipette` at 0.3% for `sample_prep_bench`).
Before any promotion edit:

1. Identify the protocol's first-interaction target for the scene (the object
   the student clicks first). That is the pedagogically correct focal object.
2. Compare the protocol target against the engine's "primary" pick.
3. Promote only if the picks agree AND the current primary-area percentage is
   visually inadequate (rough threshold: below ~5% for an instrument, below ~3%
   for a consumable that serves as the teaching vessel).

Scenes with plausible focal-promotion value (subject to step 1-3 verification):

- `heat_block_bench`: heat block at 1.2%, visually dominated by racks.
  If the heat block is the first-click target, a `display_width_cm` increase
  is warranted. Blocked by the missing render data question (section 3.7).
- `electrophoresis_bench`: tank at 3.0%, visually lost in the void.
  Blocked by the placeholder asset and the zone recomposition needed first.

Do NOT promote:

- `micropipette` in `sample_prep_bench` (0.3%): wrong primary pick; scene
  needs a human authoring decision first.
- `hood_surface` in `hood_basic` (14.6%): likely a layout zone artifact, not a
  physical object.
- `microscope` in `passage_hood_detachment_microscope_view` (18.1%): already
  dominant; do not touch.
- `cell_counter` in `cell_counter_basic` (12.4%): already adequate.

---

## 6. Git and closeout items (human action required)

These items cannot be done by agents under the current repo rules.
They are recorded here so a human can action them in the appropriate order.

| Item | Action | Notes |
| --- | --- | --- |
| Rename `clamp_scene_bounds.ts` to `validate_bounds.ts` | `git mv src/scene_runtime/layout/clamp_scene_bounds.ts src/scene_runtime/layout/validate_bounds.ts` | Also rename the exported function `clampSceneBounds` to `validateBounds` and update all import sites. |
| Move `devel/ai_polish_review.mjs` to `tools/` | `git mv devel/ai_polish_review.mjs tools/ai_polish_review.mjs` | This script is a developer helper with no build-chain role; per AGENTS.md it belongs in `tools/`, not `devel/`. Update `docs/FILE_STRUCTURE.md` to reflect the move. |
| Commit untracked new files | `git add` the ~11 new markdown files that are causing `tests/test_markdown_links.py` failures | Untracked files are not browsable on GitHub, so relative links to them fail the link test. Commit the files to make the links valid. |
| Reconcile M7 evidence table | Edit `docs/active_plans/workstreams/m7_wp_valid1_evidence_table.md` to note that the "zero Error" line was inaccurate for `seeding_workspace` | The `seeding_workspace` `unresolved_overlap` was introduced by M6 (same day as M7) and should be noted in the M7 table with a correction. |

---

## Appendix: Error diagnostics cross-reference

Full Error table reproduced from
[layout_error_diagnostics_investigation.md](active_plans/reports/layout_error_diagnostics_investigation.md)
for convenience. "Owner" column reflects authoring vs contract responsibility.

| Code | Scene | Involved items | Overshoot or depth | Root cause | Owner | Minimal fix |
| --- | --- | --- | --- | --- | --- | --- |
| `unresolved_label_overlap` | `bench_basic` | `rear_left_waste` label vs `center_centrifuge` ARTWORK | 2.4 scene-pct | `rear_left` zone top y=5-36 and `center` zone top y=38-94 share left edge x=5; centrifuge artwork top y=38 clips waste label band at y~36; label nudge hits zone boundary and cannot clear | Scene author | Raise `center` zone `y_start` to >=40, or reduce `rear_left` `label_offset_y` so waste label sits at y<=34 |
| `unresolved_label_overlap` | `passage_hood_detachment_microscope_view` | `left_cell_suspension` label vs `instrument_t75_flask` LABEL (symmetric, 2 entries) | ~0.95 each | `instrument_area` (x=31-71) and `left_bench` (x=4-36) overlap at x=31-36; t75 flask in that band collides with cell_suspension label | Scene author | Move `instrument_t75_flask` to `left_bench` zone, or narrow `instrument_area` left bound to x_start>=37 |
| `unresolved_overlap` | `seeding_workspace` | `rear_right_incubator` | 12.85 worst-axis | Incubator `display_width_cm=55` -> visual width ~38 scene-pct, height exceeds `rear_right` zone (height 31 scene-pct); pre-existing from M6 | Scene author (zone too small) / object author (object too wide) | Dedicated tall zone (>=50 pct height) or reduce incubator `display_width_cm` to ~25 |

---

## Appendix: void and focal data summary

Data source:
[aesthetic_geometry_levers_evidence.md](active_plans/reports/aesthetic_geometry_levers_evidence.md).

| Scene | Approx. void % | Void assessment | Primary object | Primary area % | Focal assessment |
| --- | --- | --- | --- | --- | --- |
| `staining_bench` | ~85% | Real defect -- fix | `staining_tray` | 3.1% | Primary pick may be wrong; verify against protocol |
| `electrophoresis_bench` | ~72% | Real defect -- fix (after placeholder asset resolved) | `electrophoresis_tank` | 3.0% | Needs promotion but blocked by zone recomposition |
| `sample_prep_bench` | ~65% | Real defect -- blocked by human decisions | `micropipette` | 0.3% | Wrong primary pick; do not promote |
| `cell_counter_basic` | ~55% | Real defect -- fix | `cell_counter` | 12.4% | Already adequate; no promotion needed |
| `seeding_workspace` | ~48% | Real defect -- fix after correctness Error | `well_plate_96` | 1.4% | Incubator is likelier focal; verify |
| `bench_basic` | ~42% | Borderline -- defer | `centrifuge` | 10.2% | Adequate |
| `passage_hood_detachment_microscope_view` | ~38% | Intentional framing -- do NOT collapse | `microscope` | 18.1% | Dominant; do not touch |
| `hood_basic` | ~32% | Appropriate BSC openness -- do NOT collapse broadly | `hood_surface` | 14.6% | May be zone artifact; verify |
| `heat_block_bench` | unknown | Render data absent; confirm scene identity | `heat_block` | 1.2% | Warrants promotion if heat block is first-click target |
