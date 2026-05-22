# Finding: 96-well authoring shape semantics spike

> **Status:** finding doc from the diagnostic spike. Captures
> empirical evidence and a recommendation. Hand-off destination:
> follow-up execution plan (user-side, not committed) that
> ratifies the recommended shape into the spec and rewrites
> `content/protocols/mtt_solubilization_readout/`.
>
> **Follow-on audit doc:**
> [96_well_enumeration_audit.md](96_well_enumeration_audit.md)
> (WP-AUDIT-1, 2026-05-16) -- site-level classification of the
> two remaining 96-well over-enumeration protocols plus a state-
> field semantics finding that gates the MTT fix.
>
> **Implementation status (2026-05-16):** case 1 (uniform plate
> action, `well_plate_96.all_wells`) has shipped on
> `mtt_solubilization_readout` (commit 4e20dff) and
> `mtt_plate_reaction` (WP-MTT-FIX-1). Case 3 (variation IS the
> skill) has shipped on `plate_drug_treatment_media_adjustment`
> (WP-PDTMA-COLLAPSE-1) using new geometric block subpart-groups
> on `content/objects/plate/well_plate_96.yaml`. Case 2
> (protocol-level `regions:` block) remains deferred per
> `docs/TODO.md`.

## Hypotheses recap

The spike tested four hypotheses about how to author multi-well
plate actions. Predictions from the plan:

- **H1**: For uniform plate actions, named region wins over
  whole-plate wins over expanded columns.
- **H2**: For dose-variation, explicit per-column wins over
  region+override map.
- **H3**: The spike-only stepper + validator diff stays under ~150
  lines and is confined to `tools/stepper/` + `tools/validators/`.
- **H4**: Inline vs sibling `regions.yaml` produce identical
  semantics; the choice is cosmetic.

## Method

Six fixtures authored under `tests/content/dev_smoke/`:

- `mtt_uniform_expanded_check` (12 explicit column interactions, current
  vocab)
- `mtt_uniform_region_check` (new `regions:` block inline; new
  `region:` + `per_subpart_state:` on `ObjectStateChange`)
- `mtt_uniform_region_sidecar_check` (H4 pair; same shape with the
  `regions:` block factored out to a sibling `regions.yaml`)
- `mtt_uniform_whole_plate_check` (existing `well_plate_96.all_wells`
  geometric group; no new vocab)
- `dose_response_explicit_check` (12 explicit column interactions with
  12 distinct `material_volume` values)

Spike-only branch `spike/region-stepper` extended:

- `tools/validators/protocol_validator.py` (region declaration check,
  member-subset check, dual-source error, ObjectStateChange schema
  branch)
- `tools/validators/constants.py` (`regions` added to
  `PROTOCOL_OPTIONAL_KEYS`)
- `tools/stepper/loader.py` (sibling `regions.yaml` merge)
- `tools/stepper/scene_ops.py` (region-aware `_handle_region_state_change`
  branch)
- `tools/validate_content_yaml.py`, `tools/validators/database.py`,
  `tools/shared_toolkit/protocols.py` (dev_smoke loading plumbing per
  `docs/PRIMARY_SPEC.md`'s "builder and walker support tests/content/
  as an explicit dev/test content root")

Per-well final state derived by direct YAML walk (independent of
StateMap) since the current `StateMap` does not track per-cell
state -- it collapses subpart cascades to flat placement state. This
gap is itself a finding for the follow-up plan; the comparison method
sidesteps it.

Baseline captured from `content/protocols/mtt_solubilization_readout/protocol.yaml`
via the same derivation at
`tests/baselines/mtt_solubilization_readout_baseline.yaml` BEFORE any
fixture authoring.

## Comparison table

| Fixture                              | protocol.yaml lines | Cells covered | Snapshot equivalence vs. baseline | Validator (spike branch) | Stepper (spike branch) |
| ------------------------------------ | ------------------- | ------------- | --------------------------------- | ------------------------ | ---------------------- |
| mtt_uniform_expanded_check           | 160                 | 96            | match                             | pass                     | pass                   |
| mtt_uniform_region_check             | 173                 | 96            | match                             | pass                     | pass                   |
| mtt_uniform_region_sidecar_check     | 65 + 113 sidecar    | 96            | match                             | pass                     | pass                   |
| mtt_uniform_whole_plate_check        | 42                  | 96            | match                             | pass                     | pass                   |
| dose_response_explicit_check         | 145                 | 96            | 12 distinct material_volumes      | pass                     | pass                   |

Notes:

- "Snapshot equivalence vs. baseline" for MTT-uniform fixtures means
  the derived per-well final-state map equals the baseline byte-for-
  byte over the 96 cells of `well_plate_96` (`material_name` +
  `material_volume`).
- "12 distinct material_volumes" for dose-response means the 12 column
  interactions produced 12 different values: `[0.0, 0.01, 0.02, 0.05,
  0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]`. No collapse.

### Pedagogy score

Resolved decision in the plan: user + one curriculum / science reader
score independently; both scores recorded separately, no averaging.
Scores not yet collected. Placeholder rows below.

| Fixture                              | User score (1-3) | Curriculum score (1-3) | Notes |
| ------------------------------------ | ---------------- | ---------------------- | ----- |
| mtt_uniform_expanded_check           | (pending)        | (pending)              | Technique-faithful: 12 column clicks model multichannel walk. |
| mtt_uniform_region_check             | (pending)        | (pending)              | Carries experimental meaning via region name `treated_wells`. |
| mtt_uniform_region_sidecar_check     | (pending)        | (pending)              | Same meaning as inline; navigation differs (regions in separate file). |
| mtt_uniform_whole_plate_check        | (pending)        | (pending)              | Geometric-only; `all_wells` carries no experimental meaning. |
| dose_response_explicit_check         | (pending)        | (pending)              | Variation is the skill; explicit form preserves it. |

## Hypothesis resolution

- **H1 (uniform plate action shape ranking)**: **partially refuted on
  line count**, **inconclusive on pedagogy** pending scores. Predicted
  ranking was named-region > whole-plate > expanded. Actual line-count
  ranking is whole-plate (42) > region sidecar (65 + 113 = 178) >
  expanded (160) > region inline (173). The explicit 96-member list in
  the regions block makes the named-region inline form *longer* than
  the expanded enumeration, which contradicts the prediction. Whole-
  plate using the existing `well_plate_96.all_wells` geometric group
  is dramatically shorter than every other shape and requires no new
  vocabulary at all.

- **H2 (dose-variation shape)**: **supported** on the explicit-per-
  column arm. The override-map shape was deferred per the resolved
  decision (would require inventing extra syntax to test). The
  explicit form encodes 12 distinct volumes across 96 cells with no
  collapse, exactly as predicted.

- **H3 (stepper + validator diff bounded)**: **partially refuted on
  size; supported on location**. Predicted under ~150 lines. Actual
  diff: 518 insertions / 72 deletions across 7 files (`tools/stepper/`,
  `tools/validators/`, `tools/validate_content_yaml.py`,
  `tools/shared_toolkit/protocols.py`). Falsification condition was
  "diff requires changes outside `tools/stepper/` + `tools/validators/`";
  that condition was NOT met (no scene adapter or runner dispatch-core
  changes). But the line budget was exceeded by roughly 2-3x. Drivers:
  comprehensive region validation (~100 lines), dev_smoke loading
  plumbing (~240 lines, which `PRIMARY_SPEC.md` already permits but
  the current tools did not yet implement for new-format dev_smoke
  protocols).

- **H4 (inline vs sibling regions equivalence)**: **supported**. The
  two fixtures produce identical per-cell final state. The choice is
  cosmetic at the semantic level. However, file-size comparison shows
  the sibling form is NOT shorter overall: protocol.yaml shrinks from
  173 to 65 lines, but the sibling `regions.yaml` adds 113 lines, so
  total YAML on disk is 178 vs 173. Sibling advantage is reader
  navigation, not byte savings.

## Surprises and second-order findings

1. **Explicit member lists dominate every "named region" line count.**
   With the spec as drafted (explicit `members:` list), the region
   shape is the LONGEST authoring form for whole-plate actions, not
   the shortest. The prediction assumed members would be implicit or
   inherit from the target object's geometric subparts. A `members:
   all` (or equivalent inferred-member) shorthand would invert the
   ranking. Without it, the region shape only earns its keep when
   members is a small explicit subset (e.g., a single row, a 2x2
   block, a control group of 4 wells).

2. **`StateMap` does not track per-cell state today.** The current
   subpart-cascade path writes every cell mutation to the placement's
   flat state dict (last-write-wins). This is invisible for uniform
   actions (the snapshot is identical whether collapsed or
   per-cell) but breaks the dose-variation case completely: only the
   final column's value is observable. The spike's comparison
   method sidesteps this by deriving per-cell state from YAML
   directly, but ANY follow-up plan that ratifies region semantics
   for production should add real per-cell tracking inside
   `tools/stepper/state.py`. Estimated scope: 50-150 lines, contained
   within `tools/stepper/`.

3. **`well_plate_96.all_wells` already works.** The existing geometric
   subpart-group cascade path in `tools/stepper/scene_ops.py`
   (`_handle_subpart_group_cascade`) walks
   `well_plate_96.all_wells` cleanly today on `main`. No spec
   amendment is required to author the whole-plate shape. This means
   a partial migration of `mtt_solubilization_readout` to a whole-
   plate target could ship TODAY without any spec ratification.

4. **dev_smoke loading needed plumbing.** The spec says the builder
   and walker support `tests/content/` as a dev/test content root,
   but the validator + stepper + shared toolkit did not implement
   that root for new-format (snake_case) protocols. The spike's M1
   coder agent added the plumbing as a prerequisite to walking any
   of the fixtures. This plumbing is in-spec and probably should
   land on `main` regardless of which authoring shape ultimately
   wins.

## Recommendation

The recommended canonical shape for 96-well plate authoring depends
on the experimental meaning the protocol carries. Three patterns:

1. **Uniform plate action with no experimental meaning to name** (e.g.,
   "add DMSO across every well", "read absorbance across every
   well"): use `well_plate_96.all_wells`. This works today on `main`,
   produces the shortest YAML (42 lines for the worked example), and
   requires no spec amendment. The two DMSO-related steps of
   `mtt_solubilization_readout` qualify.

2. **Subset plate action that carries experimental meaning** (e.g.,
   "the carboplatin dose-response wells", "the control row"): use a
   protocol-level named region with `region:` + `per_subpart_state:`
   on `ObjectStateChange`. The region name carries the meaning the
   geometric path cannot. This requires the spec amendments tested in
   this spike. Make `members:` accept an inferred-all shorthand (e.g.,
   `members: all`) so the region shape is not penalized when the
   region happens to span the whole plate.

3. **Dose variation across columns or rows** (e.g., "increasing
   carboplatin concentration per column"): use explicit per-column
   interactions. The variation is the skill; no collapsed shape
   preserves it pedagogically without inventing override-map
   vocabulary.

The "author the lab skill unit, not the renderer atom" rule from the
plan survives this spike with two amendments:

- The "skill unit" boundary is not always the named region. Sometimes
  it is the geometric whole-plate group (case 1) and sometimes it is
  the explicit per-column action (case 3). The named region is the
  right choice only when the subset is meaningful AND non-trivial to
  derive from geometry alone (case 2).
- The collapse rule from the plan ("same material + volume + purpose
  -> largest meaningful unit") still holds. Application to case 1
  collapses to `all_wells`; application to case 3 stays at the column
  level because the volume varies.

## Hand-off to follow-up execution plan

If the user adopts the recommendation:

1. Land the dev_smoke loading plumbing on `main` (already implemented
   on the spike branch; merging this slice is independent of the rest
   of the spike and pays for itself in dev_smoke testability).
2. Land the spike-only validator's dev_smoke learning-block exemption
   on `main` (this is a straight bug fix per `PRIMARY_SPEC.md`).
3. Rewrite the two DMSO-related steps of
   `content/protocols/mtt_solubilization_readout/protocol.yaml` to
   use `well_plate_96.all_wells` instead of the 12 column interactions
   each. This needs no spec amendment.
4. Draft the spec amendment for protocol-level `regions:` + region-
   aware `ObjectStateChange`, including the `members: all` (or
   equivalent inferred-all) shorthand so the region shape is not
   line-count-penalized when the region spans the whole plate.
5. Plan and ratify per-cell state tracking inside `tools/stepper/state.py`
   so the production stepper can validate per-cell snapshot equivalence
   directly (replacing the YAML-derivation comparison this spike used).
6. Do NOT migrate other minis until the spec amendment lands and case
   1 / case 2 / case 3 boundaries are documented with worked examples.

If the user does not adopt:

- Branch `spike/region-stepper` should be retained but not merged.
- The whole-plate-via-`all_wells` rewrite of
  `mtt_solubilization_readout` (case 1) can still ship as a standalone
  patch, since it requires no spec change.
