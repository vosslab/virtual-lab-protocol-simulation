# Protocol entry audit

## Status: superseded by Class I (entry_step) sweep

The original WP-ENTRY-1/WP-ENTRY-2 design inserted a compound `entry: { scene:, step: }`
block at the top of every `protocol.yaml`. That shape was retired by the
2026-05-15 spec doc sweep (Class I). The canonical form is now a flat
top-level `entry_step:` field referencing a `step_name`; the scene is not a
protocol-level field. See [../PRIMARY_SPEC.md](../PRIMARY_SPEC.md) and
[../specs/PROTOCOL_YAML_FORMAT.md](../specs/PROTOCOL_YAML_FORMAT.md).

The per-protocol step inventory below is still useful: each "Intended
entry.step" value is the `step_name` that should become the protocol's
`entry_step:`. WP-ENTRY-2 (now folded into Class I) consists of writing
`entry_step: <step_name>` at the top of each `protocol.yaml`. The
"Intended entry.scene" column is no longer relevant; scene transitions
belong inside step interactions via `SceneChange` `scene_operations`.

## Purpose (historical)

This document is the WP-ENTRY-1 deliverable for the scene-runtime spine plan
(see [scene_runtime_spine_plan.md](scene_runtime_spine_plan.md)). It records
the intended `entry_step` (and, historically, scene) values for every protocol currently
tracked under `content/` and `tests/content/dev_smoke/`.

Evidence for each row comes from one or more of:

- the explicit `# intended_entry_scene:` comment at the top of the file
  (now informational only; scene is no longer a protocol-level field),
- an already-present formal `entry_step:` or legacy `entry:` block,
- the `scene:` field on the first authored step (historically used to
  derive the scene; now informational),
- the curriculum map in
  [../active_plans/curriculum_decomposition.md](../active_plans/curriculum_decomposition.md).

No `protocol.yaml` is modified by this audit. The audit is read-only.

## Per-protocol intended entry block

| Protocol folder                                  | protocol_type     | Intended entry.scene  | Intended entry.step   | Source of decision                                   | Notes                                                                                                          |
| ------------------------------------------------ | ---------------- | --------------------- | --------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| content/cell_culture                             | (none declared)  | hood                  | spray_hood            | First step `scene: hood` (line 41); curriculum map   | Legacy monolith. No top-of-file comment, no formal entry block. Scheduled for deletion at M9; audit for record. |
| content/hood_flask_prep                          | mini_protocol    | hood                  | spray_hood            | First step `scene: hood` (line 30); comment mismatch | Comment line 1 reads `cell_culture_hood`, but first step declares `scene: hood`. Treat step scene as canonical. |
| content/cell_counting_and_seeding                | mini_protocol    | bench                 | count_cells           | Comment line 1; first step `scene: bench` (line 31)  | Comment and first step agree.                                                                                  |
| content/drug_dilution_setup                      | mini_protocol    | well_plate_workspace  | calc_carb_stock       | Existing formal entry block (lines 8 to 10)          | Already has a formal entry block. WP-ENTRY-2 should verify and leave intact.                                   |
| content/plate_drug_treatment                     | mini_protocol    | well_plate_workspace  | open_plate_workspace  | Existing formal entry block (lines 6 to 8)           | Already has a formal entry block. WP-ENTRY-2 should verify and leave intact.                                   |
| content/mtt_assay_readout                        | mini_protocol    | hood                  | add_mtt               | First step `scene: hood` (line 30); comment mismatch | Comment line 1 reads `cell_culture_hood`, but first step declares `scene: hood`. Treat step scene as canonical. |
| content/cell_culture_full                        | sequence_runner  | cell_culture_hood     | spray_hood            | Existing formal entry block (lines 8 to 10)          | Sequence runner. Uses long-form scene id `cell_culture_hood`. Verified by reading the file.                    |
| tests/content/dev_smoke/bench_direct_check       | dev_smoke        | bench                 | tutorial_centrifuge   | First step `scene: bench` (line 21)                  | Diagnostic protocol. Single step.                                                                              |
| tests/content/dev_smoke/plate_reader_check       | dev_smoke        | bench                 | tutorial_plate_read   | First step `scene: bench` (line 21)                  | Diagnostic protocol. Single step.                                                                              |

## Residual risks

- The `hood` vs `cell_culture_hood` scene id mismatch is the largest ambiguity
  surfaced by this audit. Four protocols touch the hood scene:
  `content/cell_culture`, `content/hood_flask_prep`, and
  `content/mtt_assay_readout` use the short id `hood` on their first step,
  while `content/cell_culture_full` uses the long id `cell_culture_hood`
  in its formal entry block. The two protocols that carry an
  `# intended_entry_scene:` comment for the hood also write
  `cell_culture_hood`, contradicting their own first-step `scene: hood`.
  The audit records the first-step scene as the intended value for the
  three mini-protocols because that is the value runtime code currently sees,
  but WP-ENTRY-2 should not silently paper this over: either every reference
  becomes `hood`, or every reference becomes `cell_culture_hood`. This
  decision needs an explicit ruling before WP-ENTRY-2 inserts entry blocks.
- The legacy `content/cell_culture` monolith has no `protocol_type`, no
  top-of-file `# intended_entry_scene:` comment, and no formal `entry:` block.
  The intended values above are inferred from its first authored step and from
  the curriculum decomposition map. Because the file is slated for deletion
  at M9, it may be acceptable to skip adding a formal entry block to it; the
  plan should confirm the policy for the monolith before WP-ENTRY-2 dispatches.
- The two `dev_smoke` protocols carry a single step each, so their entry block
  is unambiguous, but they have no `# intended_entry_scene:` comment. If the
  plan requires comments on every protocol, WP-ENTRY-2 must add one in
  addition to the formal entry block.
