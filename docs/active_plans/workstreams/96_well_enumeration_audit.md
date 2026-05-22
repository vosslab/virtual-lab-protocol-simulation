# Audit: 96-well plate enumeration sites

> **Status:** read-only audit produced under WP-AUDIT-1 of the
> active 96-well cleanup plan (user-side at `~/.claude/plans/`, not
> committed to the repo; the plan's structural rules are restated
> in this doc where needed). Captures site-level classification,
> pre-cleanup grep counts, manual smoke result, object-vocabulary
> verdict for `plate_drug_treatment_media_adjustment`, and a
> state-field semantics finding for `mtt_plate_reaction` that
> gates WP-MTT-FIX-1.

## Pre-cleanup grep counts

Pattern used for per-well / per-row / per-column targets:

```text
well_plate_96\.(`1[0-2]|[1-9]`|row_[A-H]|col_(1[0-2]|[1-9]))
```

Counted separately:

```text
well_plate_96\.all_wells
```

Run across `content/protocols/*/protocol.yaml` (31 files).

| File                                                  | enumerated | all_wells |
| ----------------------------------------------------- | ---------: | --------: |
| `mtt_plate_reaction/protocol.yaml`                    |        192 |         0 |
| `mtt_solubilization_readout/protocol.yaml`            |          0 |         6 |
| `plate_drug_treatment_drug_addition/protocol.yaml`    |        252 |         0 |
| `plate_drug_treatment_media_adjustment/protocol.yaml` |        192 |         0 |
| (every other protocol)                                |          0 |         0 |

Totals: 636 enumerated hits across 3 files; 6 `all_wells` hits in
1 file.

## Site-level classification

A site is one step-level contiguous block of interactions that
mutates the same plate object for one pedagogical action. The
table has one row per site, not per raw hit (see plan
`## Audit site definition`).

| Protocol                                | Step                           | Lines         | Raw hits | Current shape | Case bucket                     | Intended target shape                      | New object groups needed            |
| --------------------------------------- | ------------------------------ | ------------- | -------: | ------------- | ------------------------------- | ------------------------------------------ | ----------------------------------- |
| `mtt_plate_reaction`                    | `add_mtt_to_wells`             | 64-1046       |       96 | per-well      | case 1 (uniform plate action)   | `well_plate_96.all_wells` (1 interaction)  | no                                  |
| `plate_drug_treatment_media_adjustment` | `adjust_media_quadrant_a1_h6`  | 20-528 (\*)   |       48 | per-well      | case 3 (variation IS the skill) | 2 block-group interactions: 100 uL + 95 uL | YES (block_A_1_6 + block_B_H_1_6)   |
| `plate_drug_treatment_media_adjustment` | `adjust_media_quadrant_a7_h12` | 529-1053 (\*) |       48 | per-well      | case 3 (variation IS the skill) | 2 block-group interactions: 95 uL + 90 uL  | YES (block_A_7_12 + block_B_H_7_12) |
| `plate_drug_treatment_drug_addition`    | (out of scope, see TODO below) | n/a           |      252 | per-well      | likely case 3                   | deferred                                   | TBD                                 |

(\*) approximate; the two PDTMA quadrant steps each carry one
volume-set adjust, one media-bottle click, then the per-well
dispense block.

In-scope sites: 3 (the MTT site and the two PDTMA quadrant sites).
Out-of-scope site logged below.

Procedural ordering note (case 3 PDTMA sites): each quadrant step
already pre-orders the higher-volume row A dispense (100 or 95
uL) before the rows B-H dispense (95 or 90 uL) and re-adjusts the
pipette set_volume between the two volume classes. Collapsing
each block to one interaction per volume class preserves that
procedural ordering: the pipette adjust between volume classes
stays in the sequence, and the two block-group interactions
appear in the same row-A-first order.

## Manual smoke check

Rendered `python3 -m validation.manual mtt_solubilization_readout` on
`main`. Step 1 ("Add dmso to wells") renders ONE bullet for the
single `well_plate_96.all_wells` `ObjectStateChange`. Step 2
("Trituration to dissolve") renders one bullet for the
pipette-verify pre-interaction plus one bullet for the
`all_wells` draw. Step 3 ("Read absorbance") renders one bullet
for the `all_wells` plate-reader update.

Verdict: the renderer does NOT expand `all_wells` into 96
per-cell bullets. The case-1 collapse rule is safe to apply.

Cosmetic follow-up (NOT a blocker): the renderer phrases an
`all_wells` target as "the well all_wells of the 96-well plate".
Reads awkwardly. A polish item for the renderer, not this plan.
Logged to `docs/TODO.md` as a separate task.

Prose follow-up (NOT a blocker): the `mtt_solubilization_readout`
step prompts still describe a per-column walk ("columns 1 through
12 sequentially") even though the YAML now targets `all_wells`.
This is the prompt-teaches-action rule violation that landed with
`4e20dff`. Logged to `docs/TODO.md` as a small content cleanup.

## Object vocabulary verdict for PDTMA

Existing `content/objects/plate/well_plate_96.yaml` declares
`row_A..H` (each 12 cols), `col_1..12` (each 8 rows), and
`all_wells`. The PDTMA quadrant sites need targets that intersect
a row letter with a column half-range (A1-A6 vs A7-A12 vs B-H 1-6
vs B-H 7-12). The current geometric groups cannot express any of
these without per-well writes.

Recommended additive geometric block groups:

| Name             | Members                   | Member count |
| ---------------- | ------------------------- | ------------ |
| `block_A_1_6`    | A1..A6                    | 6            |
| `block_A_7_12`   | A7..A12                   | 6            |
| `block_B_H_1_6`  | {B,C,D,E,F,G,H} x {1..6}  | 42           |
| `block_B_H_7_12` | {B,C,D,E,F,G,H} x {7..12} | 42           |

Total new wells covered: 96 (one per well, no overlap).
Names are purely geometric. No protocol-specific meaning baked
into the object.

The current `subpart_groups` has three families (`rows`,
`columns`, `plate_region`). Recommended: add a fourth family
named `blocks` (group_kind: `region` -- same kind as `plate_region`)
carrying the four block members above. Alternative names
considered and rejected:

- `quadrants` (suggests 4x4 cell quadrants, not half-plate
  quadrants).
- `treatment_zones` (protocol-flavored; forbidden).
- `row_A_left`, `row_A_right`, `body_left`, `body_right` (loses
  the explicit column range that makes the groups self-documenting).

## MTT state-field semantics finding (gates WP-MTT-FIX-1)

Inspected `content/objects/plate/well_plate_96.yaml` state field
`material_volume`. Schema description (line 85):

> Volume of contents in this well, in microliters.

This is the well's total contents volume, not the most-recently
dispensed reagent volume. The existing
`mtt_plate_reaction/protocol.yaml` writes `material_volume: 125`
per well at `add_mtt_to_wells`, which is consistent with this
reading: 100 uL of treatment media (carried from
`plate_drug_treatment_*`) plus 25 uL of MTT = 125 uL well total.

The plan's `## Expected MTT state transition` proposed
`material_volume: 25` for the MTT addition step. That number
represents the dispensed reagent volume, not the well total, and
conflicts with the schema description.

Recommendation for WP-MTT-FIX-1:

- `add_mtt_to_wells` writes `{material_name: mtt, material_volume:
125}` to `well_plate_96.all_wells`. The 125 stays (it is the
  correct post-dispense well total). The bug being fixed is the
  `material_name` (was `formazan`, now `mtt`), not the volume.
- `incubate_formazan_conversion` adds an `ObjectStateChange` to
  `well_plate_96.all_wells` writing `{material_name: formazan,
material_volume: 125}`. The biology transition writes
  `formazan` and preserves the 125 well total (no liquid leaves
  during incubation).

This interpretation:

- respects the schema's `material_volume` semantics;
- matches every other plate-writing protocol in the repo
  (PDTMA writes `material_volume: 100` to seeded wells, also a
  well-total, not a dispensed-reagent figure);
- preserves the original biology fix (no `formazan` at dispense;
  add the explicit `mtt -> formazan` transition during
  incubation);
- requires the plan's `## Expected MTT state transition` section
  to be updated to use `125` instead of `25`. The plan author
  (user) approves before WP-MTT-FIX-1 lands.

The prompt for `add_mtt_to_wells` still needs the wording fix
(drop "first row (column A)", state "25 uL of 12 mM MTT
dispensed into each well", describe the multichannel walk in
pedagogy terms). The 25 uL belongs in the PROMPT text describing
the dispensed action; the state-field write is the well-total
125 uL.

Cross-reference:
`material_volume_conservation_spec.md`
is a live RFC that resolves the `material_volume` rule scope
(per-response, per-step, per-mini) and disposal semantics. The
audit's MTT recommendation (well-total semantics) is consistent
with the current schema description and with how the rest of the
authored tree writes `material_volume` today, but the conservation
spec may later formalize, refine, or amend that meaning. If the
conservation spec adopts a different convention before WP-MTT-FIX-1
lands, the MTT fix must be re-evaluated against the new rule.

## PDTMA actual-vs-expected volume map (gates WP-PDTMA-COLLAPSE-1)

The plan's `## Expected PDTMA volume map` recorded the user's
working expectation: 100 / 90 / 95 / 85 uL across the four
blocks. The actual values derived from the current YAML by walking
every per-well `ObjectStateChange` (script:
`/tmp/_pdtma_audit.py`):

| Plate block | Target           | EXPECTED | ACTUAL |
| ----------- | ---------------- | -------: | -----: |
| A1-A6       | `block_A_1_6`    |   100 uL | 100 uL |
| A7-A12      | `block_A_7_12`   |    90 uL |  95 uL |
| B-H, 1-6    | `block_B_H_1_6`  |    95 uL |  95 uL |
| B-H, 7-12   | `block_B_H_7_12` |    85 uL |  90 uL |

Two discrepancies (rows A7-A12 and rows B-H 7-12). The right-half
block volumes in the YAML are each 5 uL higher than the user's
expected table.

The audit cannot decide which side is right -- this requires the
user's scientific judgment. Possibilities:

1. The current YAML is correct; the user's expected table was a
   misremembering. WP-PDTMA-COLLAPSE-1 lands with 100 / 95 / 95 /
   90 uL.
2. The user's expected table is correct (drug-addition volumes
   downstream require 85 and 90); the current YAML is the bug.
   The audit and the protocol both need updating; WP-PDTMA-COLLAPSE-1
   ships the corrected values 100 / 90 / 95 / 85 uL.
3. Different experimental design than either expected; the user
   states the real values and WP-PDTMA-COLLAPSE-1 ships those.

WP-PDTMA-COLLAPSE-1 is blocked until the user picks an
interpretation. Both the plan's `## Expected PDTMA volume map`
table and the YAML must agree before the collapse lands.

Note: only THREE distinct volume values appear in the actual YAML
(100, 95, 90), and the 95 uL value appears in BOTH `block_A_7_12`
and `block_B_H_1_6`. The collapsed step structure is unchanged
(one block-group `ObjectStateChange` per block, four total across
both steps), but the manual will render two of the four bullets
with the same volume figure. That is correct -- the underlying
biology really does write the same volume to two different
geometric blocks.

## Third protocol surfaced (out of scope, logged to TODO)

The grep counts surfaced
`content/protocols/plate_drug_treatment_drug_addition/protocol.yaml`
with 252 enumerated `well_plate_96.*` hits and 0 `all_wells`
hits. This protocol is NOT in this plan's scope (per
`## Non-goals`). It is a third 96-well over-enumeration site
that requires a separate audit and cleanup pass.

Logged to `docs/TODO.md` as a follow-up cleanup item. Plan scope
stays at the two named protocols.

## Decisions needed from user

**Most decisions now resolved against the user's review of this
audit + `docs/protocols/OVCAR8_MATH_REVIEW.md`.** Open items
listed at the end.

### Resolved decisions (post-user-review + post-implementation)

- **Q1 (MTT material_name).** Use `mtt` (declared in
  `content/protocols/mtt_plate_reaction/materials.yaml`, label
  "12 mM MTT solution"). No materials.yaml edit.
- **Q2 (incubation transition).** `incubate_formazan_conversion`
  did NOT write `formazan`; only TimedWait. WP-MTT-FIX-1 added
  the explicit `mtt -> formazan` `ObjectStateChange`.
- **Q3 (PDTMA media dispenses).** Use the actual values 100 / 95
  / 95 / 90 uL across the four blocks (NOT the plan's earlier
  100 / 90 / 95 / 85 expectation). Math review confirms 200 uL
  final well volume after Day 2 (cells + media + drugs).
- **Q4 (block group naming).** Shipped under family name `blocks`
  on `content/objects/plate/well_plate_96.yaml` with members
  `block_A_1_6`, `block_A_7_12`, `block_B_H_1_6`,
  `block_B_H_7_12` -- exactly the audit-proposed names. Geometric
  only, no protocol-specific meaning.
- **Q5 (state-field semantics).** `material_volume` records the
  resulting WELL TOTAL volume after the dispense, not the
  dispensed-reagent volume. Schema description wins (line 85 of
  `content/objects/plate/well_plate_96.yaml`). Prompts describe
  added volume; YAML state records resulting well volume.
- **Q6 (MTT post-state cascade).** WP-MTT-FIX-1 writes
  `material_volume: 225` at the MTT addition (200 pre-MTT well
  total + 25 dispensed) and `material_volume: 225` at the
  formazan transition (volume preserved by metabolic reduction).
  Decant zeroes to `material_volume: 0`.
- **Q7 (PDTMA post-state material_name).** Shipped as
  `material_name: cells` (lowest-friction option 1).
  `plate_drug_treatment_media_adjustment/materials.yaml` updated
  to register `cells` alongside `media`. Cell identity is the
  biologically meaningful well content; media adjustment is
  volumetric, not a state change of cell identity.

### Open decisions

(All Q1-Q7 resolved as of the 2026-05-16 cleanup commits. Future
audits may reopen if downstream protocols surface new conflicts.)

### Cross-references

The MTT volume cascade (Q6) and PDTMA well-total writes (per Q5

- Q3) depend on the volume model in
  `OVCAR8_MATH_REVIEW.md`
  (Summary decision table: 200 uL final well volume; carboplatin
  40x multiplier; metformin 200 mM working stock fixed at 5 mM in
  columns 7-12). If that math review is later revised, Q6 and the
  PDTMA post-state table must be re-derived.
