# No-crop footprint vocabulary proposal (WS-E / WP-E1)

Date: 2026-05-21
HEAD: 8795d25
Status: DONE_WITH_CONCERNS
Author note: Proposal only. No CSS, TypeScript, or YAML is edited.
This document does not introduce any class names in production code.

Amended 2026-05-21: Vocabulary corrected per
[docs/active_plans/no_crop_round3_architecture_vocabulary_clarification.md](../no_crop_round3_architecture_vocabulary_clarification.md).
References to `regions/*.yaml` and "Path 3" describe experiment-local
scaffolding for a static visual-test renderer, not sanctioned project
architecture. `footprint--*` classes are an experimental visual-test
layout aid, not a durable scene-side vocabulary; durable scene-side
terms are `scene`, `scene object`, `SVG asset`, and `zone` per
[docs/specs/SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md).
Class counts, evidence citations, and reduction estimates are
unchanged.

## Purpose

For each candidate `footprint--*` class surfaced by the Round 3 work, name
the objects that would consume it, the existing screenshot evidence that
justifies it, the expected crop reduction, the drift risk, and an explicit
permanent versus experiment-only call. Permanent count is capped at 4 by
the WP-E1 brief; excess candidates are routed to experiment-only.

This proposal is gated by a hard upstream finding (WS-D, no_crop_render_harness_audit.md):
none of the three render paths consume the experiment-local
`regions/*.yaml` `kind_to_footprint` mapping. Section "Application path"
below states what would have to change for any class proposed here to
take effect, and why this proposal is paper-only without that decision.
The mapping artifact is experiment-local scaffolding, not project
architecture; see the architecture vocabulary clarification note.

## Baseline references

- Templates baseline (HEAD 8795d25): 41 visible crops over 10 scenes.
  Source: `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
  (per WS-G `no_crop_current_render_sanity.md`).
- Gold scenes baseline: 78 visible crops over 10 scenes.
  Source: `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`.
- Combined 20-scene baseline: 119 visible crops.
- After Strategy C hybrid (WS-A `no_crop_round3_static_template_repair_report.md`):
  templates drop to 21 (-20, -49%); gold drops to 38 (-40, -51%). Strategy
  C removes `overflow: hidden` on `.placement` and `.region--work_surface`
  but does not re-shape any footprint class.
- Remaining 21 template crops post-hybrid are concentrated in: tall
  containers in dense scenes (electrophoresis, drug_dilution), bottom-of-
  viewport handhelds (p200_micropipette, cell_counter, microscope), and
  large landscape plates / racks (well_plate_96, tube_rack_24,
  drug_vial_rack).
- Existing 7 footprint literals in `experiments/css_native_layout/styles/bench.css`:
  `small-tool`, `handheld`, `container`, `rack`, `instrument`,
  `large-equipment`, `zoom-view`.

## Candidate classes

Plan-named candidates: `footprint--tall-glassware`,
`footprint--portrait-tool`, `footprint--landscape-plate`,
`footprint--instrument-wide`. WS-A/C audit surfaced no additional
candidate beyond these four; the missing-asset audit (Bucket A through E
in `no_crop_missing_asset_audit.md`) does not name new geometry classes,
only authoring backlog.

The plan's permanent cap is 4. With four named candidates and zero
WS-A/C-surfaced additions, every candidate fits inside the cap on count.
The classification below evaluates each on evidence quality and drift
risk to decide which are permanent and which are experiment-only.

### Class 1: footprint--tall-glassware

| Field | Value |
| --- | --- |
| Class name | `footprint--tall-glassware` |
| Intent | Vertical aspect (height > width); preserve natural SVG aspect to avoid bottom-edge crop in dense rows. |
| Candidate objects | volumetric flasks (250 mL, 500 mL, 1 L), graduated cylinders, gel tank with running buffer, large reagent bottles (media_bottle, pbs_bottle), erlenmeyer flask. |
| Evidence screenshot | `test-results/no_crop_round3_static_template_repair/hybrid_templates/electrophoresis_bench.png` (7 remaining crops, tall containers in dense scene; cite WS-A scoreboard "Remaining template violations" row). Pre-hybrid baseline: `test-results/no_crop_fresh_manager_sanity/templates/electrophoresis_bench.png` (12 visible crops). Gold cross-check: `test-results/no_crop_fresh_manager_sanity/gold/gold_electrophoresis_full_setup.png` (11 visible crops). |
| Expected crop reduction | Targets the 7-8 residual crops on `electrophoresis_bench` plus an estimated 3-4 in `staining_bench` / `crowded_bench_dense` involving tall containers. Estimated 5-10 visible_crops removed from the 21-crop post-hybrid template residual (~24-48% of residual). Source: WS-A "Remaining template violations" row count, no fresh measurement performed (proposal-only). |
| Drift risk | LOW. The existing `footprint--container` class already mixes flasks, plates, and gel cassettes in one box (220-320 min-width, 240-360 min-height); splitting tall items out is a natural narrowing of an over-broad class, not a new authoring axis. The CSS rule reads vertical (min-height > min-width) and matches a stable physical category. |
| Permanent vs experiment-only | **PERMANENT (candidate 1 of 4)**. The "tall glassware" category recurs in every wet-lab scene; closing this geometry now removes the largest single chunk of residual crops. Aligns with PRIMARY_DESIGN "scientific assets must never be cropped". |

### Class 2: footprint--portrait-tool

| Field | Value |
| --- | --- |
| Class name | `footprint--portrait-tool` |
| Intent | Vertical handheld; preserve natural aspect; allow taller rendered box than the current `small-tool` / `handheld` while keeping width narrow. |
| Candidate objects | p20 / p200 / p1000 micropipettes, multichannel pipette, electronic pipette, transfer pipette, scoopulas, large forceps, manual cell counter. |
| Evidence screenshot | `test-results/no_crop_round3_static_template_repair/hybrid_templates/bench_basic.png` (1 remaining crop, p200_micropipette bottom-of-viewport; cite WS-A "Remaining template violations" row). Cross-check: `test-results/no_crop_round3_static_template_repair/hybrid_templates/cell_counter_basic.png` (1 crop). Pre-hybrid: `test-results/no_crop_fresh_manager_sanity/templates/bench_basic.png` (2 visible crops). |
| Expected crop reduction | Targets the 3 isolated bottom-of-viewport crops on `bench_basic`, `cell_counter_basic`, `microscope_basic` plus 2-3 in `drug_dilution_workspace_dense`. Estimated 4-6 visible_crops from the 21-crop residual (~19-29%). Source: WS-A "Remaining template violations" rows. |
| Drift risk | MEDIUM. The current `small-tool` class (50-80 width, 60-200 height) and `handheld` class (90-130 width, 110-260 height) already overlap with portrait tools. A third tier risks fragmenting an already-thin band and may invite per-object class assignment by author rather than systematic mapping. |
| Permanent vs experiment-only | **PERMANENT (candidate 2 of 4)**. Pipettes are the most-touched objects in every protocol; persistent crops on them are visually unacceptable. Risk is mitigated by gating with a clear vertical-aspect rule (h:w > 2:1) rather than per-object opt-in. |

### Class 3: footprint--landscape-plate

| Field | Value |
| --- | --- |
| Class name | `footprint--landscape-plate` |
| Intent | Wide-aspect (width > height); preserve natural aspect to avoid left/right clip on dense rows; replaces the current overloaded `container` class for plate-like artwork. |
| Candidate objects | well_plate_96, well_plate_24, drug_vial_rack, tube_rack_24, multichannel reservoir, gel tray (loaded), staining_tray, source plate reservoir, gel_imager tray. |
| Evidence screenshot | `test-results/no_crop_round3_static_template_repair/hybrid_templates/drug_dilution_plate_workspace.png` (2 remaining crops on well_plate_96, tube_rack_24). Cross-check: `test-results/no_crop_round3_static_template_repair/hybrid_templates/drug_dilution_workspace_dense.png` (4 crops on well_plate_96, tube_rack_24, drug_vial_rack). Pre-hybrid: `test-results/no_crop_fresh_manager_sanity/templates/drug_dilution_workspace_dense.png` (8 visible crops); `test-results/no_crop_fresh_manager_sanity/gold/gold_drug_dilution_workspace.png` (8 crops). |
| Expected crop reduction | Targets the 6 residual crops across the two drug_dilution templates plus 2-3 in `staining_bench`. Estimated 6-8 visible_crops from the 21-crop residual (~29-38%). Source: WS-A "Remaining template violations" rows. |
| Drift risk | LOW-MEDIUM. The current `container` class lumps plates and tall glassware together; splitting landscape plates out is the symmetric move to Class 1 and helps both. Risk: gel cassettes are borderline (slightly portrait); a clear aspect-ratio rule (w:h > 1.3:1) keeps assignment deterministic. |
| Permanent vs experiment-only | **PERMANENT (candidate 3 of 4)**. Well plates and tube racks are placed in nearly every protocol; consistent landscape framing is a stable category. |

### Class 4: footprint--instrument-wide

| Field | Value |
| --- | --- |
| Class name | `footprint--instrument-wide` |
| Intent | Wide-aspect instrument (electrophoresis chamber, plate reader, gel imager); preserve landscape framing without forcing height growth that the current `instrument` and `large-equipment` classes impose. |
| Candidate objects | electrophoresis chamber, gel imager, plate reader, microscope (when shown in landscape orientation), water bath (wide), gel imaging lightbox. |
| Evidence screenshot | `test-results/no_crop_round3_static_template_repair/hybrid_templates/electrophoresis_bench.png` (3 of 7 crops belong to wide instruments per WS-A bucket "tall containers in dense scene" - subset assignment needs confirmation). Cross-check gold: `test-results/no_crop_fresh_manager_sanity/gold/gold_electrophoresis_full_setup.png` (11 crops); `test-results/no_crop_fresh_manager_sanity/gold/gold_plate_reader_assay.png` (6 crops). |
| Expected crop reduction | Targets 2-4 residual crops on `electrophoresis_bench` (subset of the 7) and 2-3 on `gold_plate_reader_assay`. Estimated 3-5 visible_crops from the 21-crop residual (~14-24%). Lowest expected reduction of the four. |
| Drift risk | HIGH. The current `instrument` (220-280 width, 200-260 height) and `large-equipment` (360-480 width, 280-380 height) classes already cover wide instruments; adding a third "wide-but-not-large" band is a fine-grained slice that may be better served by tuning the existing two classes. Evidence in screenshots is the weakest of the four - it requires per-object inspection to confirm the crops are actually aspect-driven rather than density-driven. |
| Permanent vs experiment-only | **EXPERIMENT-ONLY**. Weakest evidence (lowest expected reduction, highest classification overlap with existing classes). Round 3 should prototype this as a labeled experiment-only class to measure delta before promoting; do not adopt as permanent in this proposal. |

## Permanent versus experiment-only summary

Permanent cap = 4. Recommended split: 3 permanent, 1 experiment-only.

| Class | Recommendation | Permanent slot | Reason for slot |
| --- | --- | --- | --- |
| footprint--tall-glassware | PERMANENT | 1 | Largest expected reduction; stable category; low drift risk. |
| footprint--portrait-tool | PERMANENT | 2 | Persistent crops on pipettes (highest-touch objects); clear aspect rule mitigates risk. |
| footprint--landscape-plate | PERMANENT | 3 | Plates and racks recur in every protocol; symmetric to Class 1. |
| footprint--instrument-wide | EXPERIMENT-ONLY | n/a | Weakest evidence; high overlap with existing `instrument` and `large-equipment` classes; needs prototype delta before promotion. |

Permanent count: 3 (<= 4, satisfies the WP-E1 cap).
Experiment-only count: 1.

Total candidate classes evaluated: 4.

The fourth permanent slot is intentionally held open for a class
surfaced by the first Round 3 experiment cycle, in case Strategy C
hybrid plus the three permanent classes does not close the residual to
zero. Holding a slot in reserve avoids burning the cap on the weakest
evidence row.

## Application path (CRITICAL gap from WS-D)

WS-D `no_crop_render_harness_audit.md` confirmed that **none of the three
render paths consume the experiment-local `regions/*.yaml`
`kind_to_footprint` mapping** (this mapping is experiment-local
scaffolding, not project architecture):

- Production runtime: `src/scene_runtime/layout/css_native_adapter.ts`
  builds `.placement` divs but does NOT add `footprint--<kind>` class
  (line 116-119; cite WS-D row 1 of path table).
- Static template: each `experiments/css_native_layout/templates/*.html`
  has the `footprint--<kind>` class hand-typed per element (e.g.,
  `templates/bench_basic.html` lines 25 and 38). No generator script.
- Stress static-HTML: canonical renderer `render_stress_to_html.py`
  is missing from git history; rendered HTML on disk is the untracked
  byproduct of an uncommitted script.

Therefore, even if this proposal's three permanent classes are adopted,
**there is no live wiring that would attach the class to any scene
object**. WS-D quote (path table row 1, "Footprint assignment location"
column): "NONE in current tree. css_native_adapter.ts builds `.placement`
divs (line 116-119) but does NOT add `footprint--<kind>` class."

A class addition takes effect only if one of the following lands first:

1. **Hardcoded inline in template HTML.** Author edits each of 10
   templates by hand to type `class="object-graphic footprint--tall-glassware"`
   on the relevant elements. This is WS-D Path 2's current model and
   scales linearly with templates touched. Pro: no code change required.
   Con: every new scene replays the manual classification; no single
   source of truth; risk of per-template drift.
2. **Experiment-local mapping to build.** A generator script reads an
   explicit experiment-local footprint mapping (today:
   `experiments/css_native_layout/regions/<scene>.yaml`; preferred
   future shape: `experiments/css_native_layout/object_footprints.yaml`)
   plus per-object metadata, and emits
   `<div class="placement footprint--<kind>">` into the rendered HTML.
   This is the prior static visual-test renderer (the missing
   `render_stress_to_html.py`), not a region-architecture pivot.
   Reconstruction is feasible per WS-D "Recovery options" Option 2:
   rebuild a static visual-test renderer with ALIGN against the
   experiment-local footprint mapping rather than the prior hardcoded
   `FOOTPRINT_KEYWORDS` dict. Pro: single source of truth for the
   visual-test experiment; new visual-test scenes inherit class
   assignment automatically. Con: requires committing the renderer
   (new code surface, experiment-scoped) and aligning the experiment's
   mapping with the four new class names.
3. **Production-runtime adapter.** Extend
   `src/scene_runtime/layout/css_native_adapter.ts` to add the
   `footprint--<kind>` class when building `.placement` divs, driven by
   object metadata or a region lookup. Pro: production runtime starts
   honoring the vocabulary, closing the long-term gap WS-D named. Con:
   touches production runtime code, which the WP-E1 brief and the parent
   plan's Non-goals forbid in this milestone.

**Without one of these three application paths committed, this proposal
is paper-only.** No CSS class added to `bench.css` will reach a scene
object. The proposal therefore recommends:

- Adopt the three permanent classes as a *vocabulary* decision only;
  defer the CSS rule additions until an application path lands.
- Queue WS-D Recovery Option 2 (reconstruct a static visual-test
  renderer with ALIGN against an explicit experiment-local footprint
  mapping) as the first reversible Round 3 experiment. That experiment
  is the prerequisite for measuring whether any class proposed here
  actually reduces crops. This is a static visual-test renderer
  recovery, not a region-architecture adoption.
- Treat Class 4 (`footprint--instrument-wide`) as an experiment-only
  label that ships behind the Option 2 renderer once it exists.

The WP-F1 ready-to-fix table should carry "reconstruct stress renderer
with kind_to_footprint consumption" as a row strictly preceding any
"adopt footprint--tall-glassware" row. Crop reduction estimates in this
proposal are upper bounds; the actual delta will be measurable only
after the application path lands.

## Risk and drift summary

| Risk | Class(es) affected | Mitigation |
| --- | --- | --- |
| Vocabulary growth without authoring discipline | All 4 | Aspect-ratio rule per class (Class 1: h:w > 2:1; Class 3: w:h > 1.3:1; Class 4: 1.0:1 <= w:h < 1.3:1 wide instruments). Forbid per-object opt-in. |
| Overlap with existing classes | Class 4 (instrument-wide vs instrument vs large-equipment) | Experiment-only; do not adopt until prototype delta is measured. |
| Application path gap (WS-D) | All 4 | Block class adoption on Recovery Option 2 landing; document in WP-F1 ready-to-fix table. |
| Strategy C hybrid already in flight | All 4 | This proposal is additive to Strategy C, not a replacement; estimated reductions are on top of the 21/38 post-hybrid residuals, not the pre-hybrid 41/78. |
| Author drift on hand-typed templates (WS-D Path 2) | All 4 if Option 1 application path is chosen | Prefer Option 2 (YAML to build) over Option 1 (hand-typed). |

## Source files read

- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_round3_static_template_repair_report.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_missing_asset_audit.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_current_render_sanity.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_render_harness_audit.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/experiments/css_native_layout/styles/bench.css`
- `/Users/vosslab/.claude/plans/and-familiarize-yourself-with-magical-whale.md` (WP-E1 brief, lines 166-174)

Files referenced for evidence (not opened, screenshot citation only):

- `test-results/no_crop_round3_static_template_repair/hybrid_templates/*.png` (10 files)
- `test-results/no_crop_fresh_manager_sanity/templates/*.png` (10 files)
- `test-results/no_crop_fresh_manager_sanity/gold/*.png` (10 files)

Per-class evidence screenshots referenced live in
`test-results/no_crop_round3_static_template_repair/hybrid_templates/`
and `test-results/no_crop_fresh_manager_sanity/{templates,gold}/`. No
new screenshots were captured for this proposal (per WP-E1: "no new
screenshots - cite existing ones").

## Concerns

1. The estimated crop reductions per class are derived from WS-A's
   "Remaining template violations" object lists, not from a fresh
   per-class measurement pass. Real delta requires the application path
   (WS-D Option 2) to be in place; this proposal cannot validate the
   estimates by itself.
2. Class 4 (`footprint--instrument-wide`) has the weakest evidence and
   could be dropped entirely rather than promoted to experiment-only,
   but the WP-E1 brief lists it explicitly as a candidate, so it is
   retained as labeled experiment-only.
3. WS-A/C audits surfaced no additional candidate classes beyond the
   four named by the plan. If a Round 3 experiment cycle exposes a new
   geometry (e.g., aerial work_surface micro-trays), the held-open
   fourth permanent slot accommodates promotion without a contract
   change.
4. The CSS file `experiments/css_native_layout/styles/bench.css`
   currently defines its footprint blocks under `.scene--bench` only.
   If the proposal is adopted, the question of whether the four new
   classes are bench-only or whether they apply across hood, instrument,
   and zoom-view scenes is not yet answered. Recommendation: declare
   each new class once at the top level (no `.scene--bench` prefix) so
   it applies wherever the placement renders.

## Handoff

- Status: DONE_WITH_CONCERNS
- Artifact: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_footprint_vocab_proposal.md`
- Permanent class count: 3 (cap 4; one slot reserved for Round 3
  experiment cycle surfacings)
- Experiment-only class count: 1
- Source files read: enumerated in "Source files read" section above
- Key concerns: application path gap (WS-D found zero render paths
  consume `kind_to_footprint`); Class 4 evidence is weakest of the
  four; crop reduction estimates are upper bounds pending application
  path landing; bench-only versus all-scene CSS scope decision deferred
- Next workstream blocker: WP-F1 ready-to-fix table must place
  "reconstruct stress renderer with kind_to_footprint consumption"
  (WS-D Recovery Option 2) strictly before any class-adoption row;
  without it this proposal cannot be measured.
