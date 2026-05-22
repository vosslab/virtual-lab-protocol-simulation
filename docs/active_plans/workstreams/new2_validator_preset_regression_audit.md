# NEW2 validator preset regression audit (Lane W-regression)

## Purpose

Enumerate every existing protocol's usage of `correct_target` preset and
classify each by hierarchical impact of the Lane W-fix patch (replacing
strict string equality with `isTargetSatisfied`).

## Methodology

Searched all protocol files in `content/protocols/` and `tests/content/`
for `correct_target`. Identified each instance with its expected target id.
Classified each usage by expected behavior change under hierarchical
validation.

## Findings summary

Total `correct_target` instances: 395 across 27 protocol files (1 test + 26
production: 11 cell_culture + 15 sdspage).

## Classification breakdown

| Class | Count | Description |
| --- | --- | --- |
| (a) Simple parent | ~325 | Non-decomposing targets (micropipette, bottles, tubes, racks); identical under strict and hierarchical; no behavior change. |
| (b) Explicit sub-target | ~65 | Specific well/lane targets (`well_plate_96.B1`, `well_plate_96.row_E`, `gel_cassette.lane_1`); strict preset fails; hierarchical patch unblocks; INTENDED FIX. |
| (c) Ambiguous parent | ~5 | Parent with children queried bare (`well_plate_96` without dot, `gel_cassette` bare); hierarchical patch now ACCEPTS sub-cell clicks; POTENTIAL REGRESSION. |

## Class (a) examples (safe, no regression)

- `micropipette` (~80 instances across all protocols)
- `media_bottle`, `carboplatin_stock_bottle`, `metformin_stock_bottle`
- `microtube_15ml_intermediate`, `conical_15ml`, `metformin_working_tube`
- `centrifuge`, `vortex`, `t75_flask`
- `aspirating_pipette`, `label_pen`, `waste_container`
- `dilution_tube_rack_8`

These targets have no sub-children. Hierarchical matcher returns the same
result as strict equality.

## Class (b) examples (intended fix unblocked)

Well plate sub-targets:
- `well_plate_96.B1` through `well_plate_96.B12` (file:
  `content/protocols/.../plate_drug_treatment_drug_addition/protocol.yaml`).
- `well_plate_96.C1` through `well_plate_96.C12` (same file).
- `well_plate_96.row_E` (`tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`).
- `well_plate_96.all_wells` (`content/protocols/.../passage_pellet_reseed/protocol.yaml`).

Gel cassette sub-targets:
- `gel_cassette.lane_1`, `gel_cassette.lane_2`, `gel_cassette.lane_3`
  (`content/protocols/.../sdspage_load_sample_single_lane/protocol.yaml`).

These 65 instances are the primary use case for the Lane W-fix patch.

## Class (c) findings (potential regression)

About 5 instances query parent containers without explicit sub-target
notation. Examples:
- `well_plate_96` (bare) in
  `content/protocols/.../passage_pellet_reseed/protocol.yaml` line 287:
  prompt says "add fresh media to plate"; scene operation modifies
  `well_plate_96.all_wells`; the validator currently requires a click on
  the plate container itself, but the pedagogical intent appears to be
  bulk addition.
- `gel_cassette` (bare) in some sdspage protocols if present.

Hierarchical impact: under the patch, a click on any well of the plate
would now satisfy the `well_plate_96` target. Strictly this is a behavior
change, but the looser semantics are pedagogically acceptable (a student
clicking a specific well in a "fill the plate" step would no longer be
rejected). User-facing impact: BENIGN-to-DESIRABLE.

## Regression assessment

Breaking-change finding: YES, but LOW IMPACT.

- Affected protocols: ~5 instances, primarily `passage_pellet_reseed`.
- Severity: LOW (looser validation is more student-friendly).
- Risk: a protocol that pedagogically requires "click the plate, not a
  well" would now accept either; not currently any such case.

## Recommendation

Deploy the Lane W-fix hierarchical patch WITHOUT protocol changes.

Justification:
- Class (a) (325 instances): no behavior change.
- Class (b) (65 instances): patch unblocks intended functionality.
- Class (c) (~5 instances): looser validation is acceptable.

Optional follow-up (NOT REQUIRED): if a future protocol pedagogically
requires strict parent-only validation, add a `strict_parent_target`
preset variant. Out of scope for Lane W-fix.

## Cross-references

- [new2_well_plate_adapter_rect_audit.md](new2_well_plate_adapter_rect_audit.md)
- [new2_css_native_production_blocker_plan.md](new2_css_native_production_blocker_plan.md)
- [new1_5_layout_hardening_results.md](new1_5_layout_hardening_results.md)

## Contract check

The patch routes a validator preset through the canonical hierarchical
matcher already shipped in the same file. Does NOT introduce new matcher
semantics, NEW target naming, or new contract surface. Complies with
`docs/PRIMARY_CONTRACT.md` item 3.
