# TODO

Triage backlog for issues surfaced but not fixed during recent work. See the
active plans under `~/.claude/plans/` or [ROADMAP.md](ROADMAP.md) for queued
work.

## Stepper and validator follow-ups from 96-well spike

Surfaced by the 96-well authoring shape semantics spike. See
[docs/active_plans/96_well_authoring_shape_finding.md](active_plans/96_well_authoring_shape_finding.md)
for measured evidence.

### Add per-cell state tracking to protocol_stepper

`validation/stepper/state.py` (`StateMap`) does not currently track per-cell
state for `well_plate_96` subparts. The current subpart-cascade path
in `validation/stepper/scene_ops.py` writes every cell mutation to the
placement's flat state dict (last-write-wins). This is invisible for
uniform actions but breaks the dose-variation case completely: only
the final column's value is observable.

The spike's per-well comparison method sidesteps this by deriving
final state from YAML directly. Any production validation of region
semantics or dose-response correctness needs real per-cell tracking
inside the stepper.

Acceptance criteria:

- `StateMap` tracks per-cell `material_name` and `material_volume`
  for `well_plate_96` placements.
- `validation/stepper/step_check.py` can emit a per-cell snapshot for any
  placement with subparts, suitable for byte-for-byte snapshot
  comparison.
- The dose-response explicit-per-column fixture
  (`tests/content/dev_smoke/dose_response_explicit_check/`) reports
  12 distinct `material_volume` values from the stepper's observed
  state, not from YAML derivation.
- The 12 currently shipped protocols continue to step cleanly.

Estimated scope: 50-150 lines, contained within `validation/stepper/`.

### Optional named-region syntax with members: all shorthand

Deferred from the 96-well spike. Only worth implementing if and when
a real subset use case appears (e.g., a control row, a 2x2 block, a
dose-response group of 4 wells that must carry an experimental name).
For whole-plate cases, `well_plate_96.all_wells` is sufficient and
ships today on `main` without any spec change.

If a real subset use case surfaces:

- Draft a spec amendment for protocol-level `regions:` + region-aware
  `ObjectStateChange` (the shape tested in
  `tests/content/dev_smoke/mtt_uniform_region_check/`).
- Include a `members: all` (or equivalent inferred-all) shorthand so
  the region shape is not line-count-penalized when the region
  happens to span the whole plate. The spike found the explicit
  96-member list made the named-region inline form *longer* than
  the expanded enumeration; this shorthand removes the penalty.
- Reference the spike-only branch `spike/region-stepper` (unmerged)
  for a working validator + stepper implementation of the region
  shape; the branch can be cherry-picked onto a fresh implementation
  branch rather than rewritten from scratch.

Do NOT introduce protocol-level `regions:` as a generic feature.
Reserve for meaningful subsets, not aliases for the whole plate.

## Follow-ups from 96-well enumeration audit

Surfaced by WP-AUDIT-1 of the active 96-well cleanup plan. See
[active_plans/96_well_enumeration_audit.md](active_plans/96_well_enumeration_audit.md)
for full evidence.

### Third 96-well over-enumeration site: plate_drug_treatment_drug_addition

`content/protocols/plate_drug_treatment_drug_addition/protocol.yaml`
carries 252 enumerated `well_plate_96.*` hits (more than either
of the two protocols handled by `serene-stargazing-moore.md`) and
zero `all_wells` hits. Likely case 3 (dose / drug variation IS the
skill) but not classified site-by-site yet.

Acceptance criteria:

- Audit the protocol step by step using the same
  `## Audit site definition` rule.
- Decide per-site whether collapse uses existing row / column
  groups, the block groups added by WP-WELLPLATE-OBJVOCAB-1 (if
  they land), or stays per-well by design.
- Open a new plan if the cleanup is non-trivial.

### Author docs/GLOSSARY.md (REPO-WIDE, all labs)

Single repo-wide file ratifying wet-lab + simulation vocabulary
used across EVERY lab family in `content/protocols/` -- cell
culture, drug dilution, colorimetric assay (MTT), SDS-PAGE
electrophoresis, plus the simulation-side authoring vocabulary.
NOT a one-lab glossary; the cross-lab coverage IS the value.

Triggered by the MTT cleanup (2026-05-16) where MTT etymology,
aspirate vs draw vs dispense, formazan identity, well-total
volume semantics, and trituration all needed clarification. The
same drift class is likely in every other lab area in the repo.

Full acceptance criteria in [ROADMAP.md](ROADMAP.md) "Glossary
doc (planned)" section.

Defer until vocabulary drift surfaces in a second lab family
(MTT alone is insufficient justification for the repo-wide
sweep).

### Vocabulary: "aspirate" reserved for vacuum removal to waste

Lab convention: "aspirate" means vacuum-line removal to waste (e.g.,
"aspirate spent media from the plate"). Pipette loading from a
source uses "draw" or "pipette up", not "aspirate". The renderer
(`validation.manual` line 910) now emits "draw N uL from
{source}" in dispense bullets, but authored prompts in 8 of the 11
protocols that mention "aspirate" still use it loosely in pipette-
loading contexts. MTT trio + PDTMA fixed; remaining:

- `cell_seeding_plate_setup/protocol.yaml`
- `drug_dilution_setup/protocol.yaml`
- `passage_hood_detachment/protocol.yaml`
- `passage_pellet_reseed/protocol.yaml`
- `plate_drug_treatment_drug_addition/protocol.yaml`
- `sdspage_load_protein_ladder/protocol.yaml`
- `sdspage_load_sample_single_lane/protocol.yaml`
- `sdspage_prepare_running_buffer/protocol.yaml`

Action: per-protocol review; replace "aspirate" with "draw" or
"pipette up" in pipette-loading contexts; keep "aspirate" only in
vacuum-removal-to-waste contexts.

### Pipette accuracy: MTT 25 uL near low edge of P200 multichannel

`mtt_plate_reaction.add_mtt_to_wells` dispenses 25 microL per
channel. That sits in the lower-precision zone of a standard P200
multichannel (range 20-200 microL; accuracy degrades from ~3% mid-
range to ~5-10% at 20-25 microL). For dose-response assay rigor,
consider redesigning MTT prep: e.g., 100 microL of 3 mM MTT (instead
of 25 microL of 12 mM) gives same 300 nmol per well at a more
accurate pipette volume. Cascades back through Q6: post-MTT well
total changes from 225 to 300, decant + incubation volumes shift.
Defer until next wet-lab protocol revision; current YAML carries a
note in the prompt about freshly-calibrated tips.

### Renderer: multichannel aggregate-volume display

Renderer currently emits per-channel volume in dispense bullets
(e.g., "draw 25 uL from the 12 mM MTT solution") without noting
the multichannel aggregation (8 channels x 25 uL = 200 uL per
stroke drawn from the bottle). Wet-lab students may mis-interpret
the bottle drawdown rate. Possible fix: when source target is a
multichannel pipette, append "(per channel; 8 x N = M uL per
stroke)" to the dispense bullet.

### Cosmetic: validation.manual phrasing for group targets

Rendered manual for an `all_wells` target reads "the well
all_wells of the 96-well plate". Awkward but not wrong. The
renderer should special-case region / block groups to read
"every well of the 96-well plate" or similar natural phrasing.
Scope: `validation/manual/protocol_manual.py`.

### Content: mtt_solubilization_readout prompts still describe per-column walk

Step 1 and Step 2 prompts in
`content/protocols/mtt_solubilization_readout/protocol.yaml`
still say "columns 1 through 12 sequentially" even though the
YAML now targets `well_plate_96.all_wells`. Violates the
prompt-teaches-action rule from
`docs/active_plans/96_well_enumeration_audit.md`. Small content
cleanup: rewrite both prompts to describe the uniform whole-plate
dispense in pedagogy terms.

## Rendering and content display

### Fix unit rendering for browser-displayed YAML labels

Authored YAML strings that render in the browser should support proper
scientific unit display, especially micro units. The desired browser display is
`&mu;L` and `&mu;M`, but the source must remain safe and consistent with the
repo's ASCII documentation rules. Current workaround is to write `uL` and `uM`
in YAML labels and fenced code examples.

Acceptance criteria:

- Browser-displayed YAML labels can show `&mu;L` and `&mu;M` correctly.
- HTML entities such as `&mu;` or `&micro;` do not appear literally in the UI.
- The rendering path uses safe text handling and does not introduce unsafe
  HTML injection.
- Docs clarify the final convention for Markdown prose, fenced YAML examples,
  and authored YAML labels.
- Existing ASCII compliance checks still pass, or the exception is explicitly
  documented if source files are allowed to contain Unicode units.

## Pre-existing failures surfaced during M1b (2026-05-09)

These were uncovered while landing M1b of the SVG asset pipeline refactor
(plan ref: `~/.claude/plans/cuddly-snuggling-feather.md`). The reviewer
bisected against HEAD with M1b changes reverted and reproduced both
failures, so they are pre-existing and not caused by M1b. Surfaced here for
triage; M1c does NOT fix either. See the M1b CHANGELOG entry under
`## 2026-05-09` for the full context.

### Walker `interactionSequence` regression on hood scenes (RESOLVED 2026-05-09)

- Outcome: fixed. Root cause was the capture-phase click handler in
  [src/scenes/scene_driver.ts](../src/scenes/scene_driver.ts) calling
  `target.getAttribute('data-item-id')` on the raw click target, which is
  often an inner SVG shape (`ellipse`/`rect`/`path`) inside the `.hood-item`
  wrapper, not the wrapper itself. After a `directTool` step that called
  `renderHoodScene()` directly (skipping `runSceneRender`), the per-item
  bubble-phase listeners from
  [src/scenes/cell_culture_hood/hood_shared.ts](../src/scenes/cell_culture_hood/hood_shared.ts)
  were not re-attached on the rebuilt DOM, leaving only the capture-phase
  listener -- and that listener could not resolve the data-item-id from a
  nested SVG element. Fix: resolve the nearest ancestor via
  `target.closest('[data-item-id]')` before reading the id. See the
  CHANGELOG entry under `## 2026-05-09` `### Fixes and Maintenance` for
  full evidence (cell_culture 25/25, all 10 protocols pass, smoke 9/9,
  tsc clean).

### `tests/_compile_for_test.mjs` missing helper (RESOLVED 2026-05-09)

- Outcome: fixed. M6 of the SVG asset pipeline refactor authored the
  missing helper at `tests/_compile_for_test.mjs`
  (uses `npx esbuild --bundle --platform=node --define:window=globalThis`
  to compile a `.ts` entry to a tempdir `.mjs` and dynamic-import it).
  Both [tests/test_svg_color_patch.mjs](../tests/test_svg_color_patch.mjs)
  and the new [tests/test_svg_pipeline.mjs](../tests/test_svg_pipeline.mjs)
  use the helper to exercise production `.ts` modules directly. See the
  M6 CHANGELOG entry under `## 2026-05-09` for full evidence.

## V3 numeric-range violations follow-up

**Resolved 2026-05-17.** All three sites fixed pedagogically:

- [x] `content/protocols/cell_seeding_plate_setup/protocol.yaml`: wrong instrument
  class (micropipette max 1000 uL used for mL-range transfers). Fixed: switched to
  serological_pipette; values converted uL->mL (2400->2.4, 9600->9.6). Also fixed
  bonus bug: `well_plate_96.all_wells material_volume` 9600->100 uL per well.
- [x] `content/protocols/mtt_plate_reaction/protocol.yaml`: biohazard_decant_bin
  `material_volume` 21600 mL was mL/uL unit confusion (21600 uL total = 21.6 mL).
  Fixed: 21600->21.6.
- [x] `content/protocols/passage_hood_detachment/protocol.yaml`: trypsin_bottle
  max:100 was too small; protocol assumes 500 mL stock (consistent with pbs_bottle
  and media_bottle). Fixed: trypsin_bottle max/default 100->500; protocol value
  197->497.

Equipment V7 WARNINGs also resolved (same run):
- hemocytometer added `material_container` capability (was missing; caused WARNING).
- V7 gate refined: now warns only when equipment has material fields but lacks
  `material_container` capability (previously warned on any equipment with material fields).

## Deferred / future work

### V6b: WCAG contrast gate on material YAML palette (deferred)

Dropped from the spec-content-drift-remediation plan (see
[docs/archive/spec_content_drift_remediation.md](archive/spec_content_drift_remediation.md)
Objective #3). Reason: no current consumer renders material `display_color`
as a color swatch; the gate is forward-looking until a theme-aware visual
consumer ships. The gate should be included in the future "SVG asset
accessibility audit" follow-up plan as part of a WCAG audit on hard-coded
SVG fills. Note: V6a (cross-protocol material consistency) is deferred - `validation/yaml/cross_protocol.py`
lines 43-45 carry a "Deferred" comment. The gate was planned in
`docs/archive/spec_content_drift_remediation.md` WP-V6 but not implemented before plan
archive. Manual reconciliation of 9 divergent materials was done (CHANGELOG 2026-05-17),
but the automated enforcement gate does not yet exist. A future protocol addition could
re-introduce the same divergence silently.
