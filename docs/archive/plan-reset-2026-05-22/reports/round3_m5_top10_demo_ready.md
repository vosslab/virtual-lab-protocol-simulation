# Round 3 M5 top-10 demo-ready scene ranking

Date: 2026-05-22
Owner: M5 task (demo-ready scene ranking)
Plan ref: Round 3 Runtime Quality Initiative, M5 demo-ready ranking
Inputs:
[round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md)
(R6 scoreboard),
[round3_object_frequency_inventory.md](round3_object_frequency_inventory.md)
(object frequency inventory),
[round3_runtime_interaction_smoke.md](round3_runtime_interaction_smoke.md)
(R7 interaction smoke),
[round3_protocol_advance_repair.md](round3_protocol_advance_repair.md)
(R9 click-advance repair + M5-PIVOT verification).

## Context

This artifact records the original M5 deliverable: a top-10 ranked list
of mounted runtime scenes suitable for demo use. M5 was pivoted
mid-task by the coordinator toward an independent verification of the
R9 protocol-advance repair (recorded in the M5-PIVOT section of
[round3_protocol_advance_repair.md](round3_protocol_advance_repair.md)).
This file rescues the ranking content from that pivot so the demo-ready
list is preserved as a first-class artifact.

The ranking is restricted to scenes that mount successfully and have
some evidence of interaction depth (object count, click-advance
evidence, or an authored next step). The `cell_counter` family is
excluded entirely because the walker reports a hard FAIL on it pre
M3-extension (see Excluded category below).

## Scoring criteria

Each candidate scene was judged on four signals. The ranking is
ordinal; no single composite number is published because the input
columns are heterogeneous (some signals are pass/fail, some are
counts, some are R6 score deltas).

- mount_success: the scene mounts cleanly under
  `bash pipeline/build_runtime_bundle.sh` +
  `source source_me.sh && python3 pipeline/build_protocol_html.py --all`
  and renders without runtime exceptions. All ten ranked scenes pass
  this gate.
- object_count: number of authored scene objects visible on entry.
  Higher means more demo surface area (more things a presenter can
  point at).
- interaction_depth: number of authored interactions reachable from
  entry without leaving the scene, weighted by click-advance evidence
  from R7/R9/M5-PIVOT smokes. Scenes with confirmed
  `interactionAdvanced = pass` rank above scenes with only authored
  interactions.
- r6_score: R6 combined_score where available. R6 only scored five
  rows; for unranked scenes the column is `n/a`.

## Top-10 ranking

| Rank | Scene | mount | object_count_band | interaction_depth | r6_score |
| --- | --- | --- | --- | --- | --- |
| 1 | sdspage_fill_tank_buffer_workspace | pass | high | high | n/a |
| 2 | sdspage_prepare_running_buffer_workspace | pass | high | high | n/a |
| 3 | sdspage_attach_lid_and_leads_workspace | pass | high | confirmed (R9 clickWorks pass) | -17 |
| 4 | mtt_solubilization_readout plate_reader_workspace | pass | medium | confirmed (R6 pass, R9 drive-only) | -5 to -6 |
| 5 | sdspage_recycle_buffer_workspace | pass | medium | medium | n/a |
| 6 | mtt_solubilization_readout bench_workspace | pass | medium | medium | n/a |
| 7 | plate_drug_treatment_media_adjustment plate_workspace | pass | medium | medium | n/a |
| 8 | sdspage_heat_denature_samples_workspace | pass | medium | confirmed (R9 clickWorks + statesChanged pass) | -4 |
| 9 | sdspage_prepare_sample_mix_single_lane sample_prep_bench_override | pass | medium | medium | n/a |
| 10 | mtt_reagent_prep bench_workspace | pass | medium | confirmed (R9 clickWorks pass) | -10 |

## Excluded category: cell_counter family

The `cell_counter` family of scenes is excluded from this ranking. The
walker reports a hard FAIL on these scenes prior to the M3-extension
(scene-change repair) landing. Including them in a demo-ready list
would misrepresent the runtime's state. They are tracked separately
under
[round3_cell_counter_scenechange.md](round3_cell_counter_scenechange.md)
and become eligible for re-ranking once M3-extension lands and the
walker reports a pass.

## Per-scene notes

### 1. sdspage_fill_tank_buffer_workspace

High object count (tank, buffer bottles, pipettes, surrounding bench
items). Clear "fill the tank" demo flow that is intuitive to a
non-expert audience. No R6 score; recommended for an early R6
follow-up pass.

### 2. sdspage_prepare_running_buffer_workspace

High object count with multiple bottles and a measuring vessel. The
"prepare buffer" flow is a familiar wet-lab story and reads cleanly
on first view. No R6 score; recommended for the next scoring pass.

### 3. sdspage_attach_lid_and_leads_workspace

R6 combined_score -17 (worst row in R6), but ranks high here because
the click-advance pipeline is confirmed healthy by R9 (clickWorks =
pass on `electrophoresis_tank`). The poor R6 score reflects label
overlap and placeholder-density issues that are visual polish, not
runtime breakage. Visual cleanup before a demo is recommended.

### 4. mtt_solubilization_readout plate_reader_workspace

R6 confirmed click_target_smoke = pass and object_state_change_smoke
= pass on the after_entry capture (pipette volume slider appears
after click). R9 / M5-PIVOT smoke notes the bench-to-plate-reader
drive loop is gated by an `adjust` gesture, but the plate-reader
scene itself mounts cleanly and shows a visible set-point widget on
arrival. Strong demo candidate when introduced from the bench-scene
flow.

### 5. sdspage_recycle_buffer_workspace

Medium object count, simple "return buffer to bottle" flow. No R6
score; ranks above lower-tier scenes by virtue of a clean visual
read.

### 6. mtt_solubilization_readout bench_workspace

The entry scene for the MTT plate-reader flow. Medium object count;
serves as the on-ramp to scene 4. Authored next step uses an
`adjust` gesture (orchestrator-mediated), which a presenter can
exercise via the adjust panel rather than a raw click.

### 7. plate_drug_treatment_media_adjustment plate_workspace

Medium object count, well-plate-centered scene. Plate is the most
referenced object in the repo (rank 1 in
[round3_object_frequency_inventory.md](round3_object_frequency_inventory.md),
292 references), so the demo surface reads as familiar to any
audience.

### 8. sdspage_heat_denature_samples_workspace

R6 combined_score -4 (best of the four R6-scored scenes in this
list). R9 confirms clickWorks = pass with a visible
`lid_open false -> true` state change on the heat block, which is
the strongest single-click demo evidence in the set. Heat-block
placeholder dominates the frame; visual polish would improve the
read.

### 9. sdspage_prepare_sample_mix_single_lane sample_prep_bench_override

Medium object count, authored sample-mix flow. Override scene; the
"single lane" framing reads cleanly without needing a multi-lane
context.

### 10. mtt_reagent_prep bench_workspace

R6 combined_score -10. R9 confirms clickWorks = pass (force-click
required because Playwright's actionability heuristic rejects the
small SVG target; real user clicks are unaffected). Demo-ready for
click-driven flow; the placeholder-density and label-overlap issues
flagged by R6 should be addressed before a high-stakes audience.

## How this ranking is intended to be used

- As an at-a-glance list of which mounted scenes are safest to put in
  front of a presenter or a stakeholder demo.
- As a prioritization input for visual polish: scenes 3, 8, and 10
  have known R6 defects but confirmed runtime health, so polish work
  on them has the highest demo-value per unit of effort.
- As a backstop against demo-ing the `cell_counter` family before the
  M3-extension walker pass lands.

## Boundaries respected

- Read-only on production source under `src/`, `generated/`,
  `content/`, and `pipeline/`.
- No new walker runs initiated by this artifact; ranking inputs are
  R6, R7, R9, and the M5-PIVOT independent verification.
- ASCII only.
- No `git commit`. No `git mv`. No contract edits.
