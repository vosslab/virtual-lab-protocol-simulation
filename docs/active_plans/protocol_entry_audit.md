# Protocol entry audit

## Purpose

This document is the WP-ENTRY-1 deliverable for the scene-runtime spine plan
(see [scene_runtime_spine_plan.md](../archive/scene_runtime_spine_plan.md)). It records
the intended `entry.scene` and `entry.step` values for every protocol currently
tracked under `content/` and `tests/content/dev_smoke/`. The goal is to give
WP-ENTRY-2 a single source of truth so the formal `entry:` block can be
inserted into each `protocol.yaml` without re-deriving the decision.

Evidence for each row comes from one or more of:

- the explicit `# intended_entry_scene:` comment at the top of the file,
- an already-present formal `entry:` block,
- the `scene:` field on the first authored step,
- the curriculum map in
  [curriculum_decomposition.md](curriculum_decomposition.md).

No `protocol.yaml` is modified by this audit. The audit is read-only.

## Per-protocol intended entry block

| Protocol folder                                  | protocolType     | Intended entry.scene  | Intended entry.step   | Source of decision                                   | Notes                                                                                                          |
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
- The legacy `content/cell_culture` monolith has no `protocolType`, no
  top-of-file `# intended_entry_scene:` comment, and no formal `entry:` block.
  The intended values above are inferred from its first authored step and from
  the curriculum decomposition map. Because the file is slated for deletion
  at M9, it may be acceptable to skip adding a formal entry block to it; the
  plan should confirm the policy for the monolith before WP-ENTRY-2 dispatches.
- The two `dev_smoke` protocols carry a single step each, so their entry block
  is unambiguous, but they have no `# intended_entry_scene:` comment. If the
  plan requires comments on every protocol, WP-ENTRY-2 must add one in
  addition to the formal entry block.
