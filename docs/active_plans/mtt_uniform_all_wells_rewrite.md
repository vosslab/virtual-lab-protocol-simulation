# Plan: mtt_solubilization_readout uniform-step rewrite to all_wells

## Context

The 96-well authoring shape semantics spike
([docs/active_plans/96_well_authoring_shape_finding.md](96_well_authoring_shape_finding.md))
measured five candidate YAML shapes for the same MTT uniform plate
action and surfaced a finding the original design note did not predict:
`well_plate_96.all_wells` already works on `main` today, produces the
shortest YAML by a wide margin (42 lines for the worked example fixture
vs. 160 for the existing 12-column-per-step form), and requires no spec
amendment because the geometric subpart-group cascade path in
`tools/stepper/scene_ops.py` (`_handle_subpart_group_cascade`) already
walks it cleanly.

This plan executes the narrow consequence: rewrite the three uniform
steps of `content/protocols/mtt_solubilization_readout/protocol.yaml`
to target `well_plate_96.all_wells` instead of enumerating 12 column
interactions per step. Dose-response style steps stay explicit per
column because variation is the skill (spike H2). Named regions are
deliberately NOT introduced here -- per the spike recommendation,
named regions are reserved for meaningful subsets, not aliases for the
whole plate.

Two follow-ups surfaced by the spike are tracked separately in
[docs/TODO.md](../TODO.md) and are NOT part of this plan:

- per-cell state tracking in `tools/stepper/state.py`
- optional named-region syntax with `members: all` shorthand,
  pending a real subset use case

## Objectives

- Collapse the two DMSO-related steps (`add_dmso_to_wells`,
  `trituration_to_dissolve`) of
  `content/protocols/mtt_solubilization_readout/protocol.yaml` from
  12 column interactions each to one `well_plate_96.all_wells`
  interaction each.
- Leave the third step (`read_absorbance`) as-is; it already uses
  `well_plate_96.all_wells` for the plate-reader read.
- Preserve every per-well final state (`material_name` +
  `material_volume`) against the baseline at
  `tests/baselines/mtt_solubilization_readout_baseline.yaml` captured
  during the spike.
- Preserve the technique-faithful prose in the step `prompt:` fields
  (the multichannel-walks-across-columns description stays; the YAML
  click count drops).

## Design philosophy

This plan executes a measured finding, not a taste-based default. Per
`docs/REPO_STYLE.md` "long-term over short-term", the rewrite removes
22 of 24 column interactions in the worked example without inventing
any vocabulary the repo cannot delete later. The rejected alternative
is to introduce protocol-level `regions:` for this case; the spike
showed that path is line-count-penalized by the required explicit
`members:` list and adds spec surface area without paying for itself
on a whole-plate action.

## Scope

- Rewrite `add_dmso_to_wells` step to one `well_plate_96.all_wells`
  interaction.
- Rewrite `trituration_to_dissolve` step to one
  `well_plate_96.all_wells` interaction.
- Update the top-of-file simulation comment to reflect the new
  granularity.
- Run validator + stepper to confirm pass; derive per-well final state
  and diff against the baseline.
- Append a dated entry to `docs/CHANGELOG.md` covering the rewrite.

## Non-goals

- Not introducing a protocol-level `regions:` block -- reserved for
  meaningful subsets per spike recommendation.
- Not amending `docs/specs/*` or `docs/PRIMARY_SPEC.md` -- this
  rewrite uses existing vocabulary only.
- Not landing any code in `tools/stepper/` or `tools/validators/` --
  the spike-only branch carries those, this plan does not touch them.
- Not migrating any other mini protocol -- mtt is the worked example;
  other minis will be assessed individually if and when their uniform
  steps surface as bloat.
- Not adding per-cell state tracking to the stepper -- tracked
  separately in TODO.md as a follow-up.
- Not collapsing the third step (`read_absorbance`) -- it is already
  one `well_plate_96.all_wells` interaction.

## Approach

1. Branch from `main` (NOT from `spike/region-stepper`): `git checkout
   -b mtt-all-wells-rewrite main`. The spike branch carries unrelated
   spike-only tooling that this rewrite must not depend on.
2. Read the current
   `content/protocols/mtt_solubilization_readout/protocol.yaml` to
   capture the exact existing `prompt:` text, `material_name`,
   `material_volume`, and pre-step micropipette/dmso_bottle
   interactions so they survive verbatim.
3. Replace the 12 column interactions in `add_dmso_to_wells` with one
   interaction:

   ```yaml
   - target: well_plate_96.all_wells
     gesture: click
     validator: { preset: correct_target }
     response:
       scene_operations:
         - type: ObjectStateChange
           target: well_plate_96.all_wells
           state:
             material_name: formazan_dmso_solution
             material_volume: 0.2
   ```

   Keep the three pre-step interactions (micropipette click,
   micropipette adjust, dmso_bottle click) verbatim; only the 12
   column-dispense entries collapse.
4. Replace the 12 column interactions in `trituration_to_dissolve`
   with one interaction targeting `well_plate_96.all_wells` carrying
   the trituration state (`material_volume: 0.2` with `transition:
   animated`). Keep the leading `micropipette click` verbatim.
5. Update the top-of-file simulation comment: drop the "column at a
   time" wording for the two collapsed steps; preserve the
   technique-faithful description in the step `prompt:` fields.
6. Run `source source_me.sh && python3 tools/validate_content_yaml.py -p mtt_solubilization_readout`.
7. Run `source source_me.sh && python3 tools/protocol_stepper.py -p mtt_solubilization_readout -v`.
8. Capture per-well final state via the same YAML-derivation method
   the spike used (`StateMap` does not track per-cell state today; the
   spike's TODO.md follow-up will fix this in the stepper, but this
   plan does not block on it).
9. Diff derived per-well state against
   `tests/baselines/mtt_solubilization_readout_baseline.yaml`. Every
   cell must match on `material_name` and `material_volume`.
10. Regenerate the protocol manual via
    `source source_me.sh && python3 tools/protocol_manual.py mtt_solubilization_readout`
    and compare section structure against the pre-rewrite manual.
11. Append the dated entry to `docs/CHANGELOG.md`.

## Files to modify

- `content/protocols/mtt_solubilization_readout/protocol.yaml` --
  collapse two steps; update top-of-file comment.
- `docs/CHANGELOG.md` -- one dated entry covering the rewrite.

## Verification

1. `source source_me.sh && python3 tools/validate_content_yaml.py -p mtt_solubilization_readout`
   exits 0.
2. `source source_me.sh && python3 tools/protocol_stepper.py -p mtt_solubilization_readout`
   exits 0; dashboard shows zero ERROR findings.
3. Per-well final state derived from the rewritten protocol equals
   `tests/baselines/mtt_solubilization_readout_baseline.yaml` cell-for-
   cell on `material_name` + `material_volume`. The derivation script
   used by the spike is the reference comparison method until per-cell
   `StateMap` tracking lands.
4. `source source_me.sh && python3 tools/protocol_stepper.py`
   (full-tree run) shows the `mtt_solubilization_readout` per-protocol
   warning row drops proportional to the collapsed interactions
   (~193 to roughly 16; the residual warnings are
   `unknown_target_active_scene` from steps untouched by this plan).
5. `cell_culture_full` sequence runner walks cleanly (it references
   `mtt_solubilization_readout` as a leaf).
6. `tools/protocol_manual.py mtt_solubilization_readout` produces a
   manual whose section structure matches the pre-rewrite manual
   (smoke-level pedagogy preservation check).
7. `pytest tests/` passes locally on the rewrite branch.

## Risk register

| Risk | Impact | Trigger | Mitigation |
| --- | --- | --- | --- |
| Per-well snapshot regresses because the existing geometric cascade does not write the expected fields | high | derived per-cell state for the rewritten protocol differs from baseline | the spike already proved the cascade walks `well_plate_96.all_wells` cleanly via the `mtt_uniform_whole_plate_check` fixture; if regression appears, capture the diff before changing the rewrite (the cascade is the suspect, not the rewrite). |
| Prompt prose loses the technique description | medium | reviewer reads the rewritten step and cannot recover "multichannel column-by-column" technique | the `prompt:` text is copied verbatim from the pre-rewrite file; only the YAML interaction list changes. |
| Stepper dashboard warning count does not drop as predicted | low | full-tree run shows the same warning count after the rewrite | `unknown_target_active_scene` is the dominant warning and is orthogonal to this rewrite; only the warnings tied to the 22 dropped interactions should decrease. Spot-check the per-protocol row, not the total. |
| Spike branch tooling is implicitly required by this rewrite | medium | rewrite validates or steps only on `spike/region-stepper`, not on `main` | rewrite uses `well_plate_96.all_wells` (existing vocab on `main`); validation must succeed on `main` before merging. The branch isolation in Approach step 1 catches this. |

## Resolved decisions

- Branch base: `main`, not `spike/region-stepper`. The spike branch
  carries unrelated experimental tooling that this rewrite must not
  inherit.
- Region syntax: not used. Reserved for meaningful subsets per spike
  recommendation.
- Per-cell state tracking: not blocking this rewrite. Tracked
  separately as a TODO follow-up. The YAML-derivation comparison
  method from the spike is the reference for verification step 3.
- Other minis: out of scope. Assess individually when their uniform
  steps surface as bloat.

## Hand-off

After this plan lands:

- `mtt_solubilization_readout/protocol.yaml` reads cleanly at ~80
  lines (down from ~344) without losing pedagogy.
- The spike's recommendation case 1 (uniform plate action with no
  experimental meaning) has a worked example in production code.
- The spike branch `spike/region-stepper` stays unmerged.
- The two TODO follow-ups (per-cell state tracking; named-region
  syntax) remain open and are revisited when a real subset use case
  appears.
