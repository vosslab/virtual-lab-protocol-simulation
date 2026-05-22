# Round 3 Q2 worst-5 runtime scenes gallery

Date: 2026-05-22
Owner: Q2 (read-only gallery build, no new captures)
Source scoreboard: [round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md)
Gallery HTML: `test-results/round3_runtime_initiative_galleries/worst5_INDEX.html` (temporary gallery output)

## Purpose

Q2 converts the R6 scoreboard's lowest-combined-score rows into a
visual gallery (screenshot + score + defect callouts + recommended
fix workstream). The artifact feeds the next-fix queue (keep/reject).

## Ranking table

| Rank | Scene | Score | Defect callouts | Highest-leverage fix |
| --- | --- | --- | --- | --- |
| 1 | sdspage_attach_lid_and_leads_workspace (initial) | -17 | 5 placeholders; 8 label overlaps; 4 off-page; clarity 0; pointer-intercept untested | A1B (power supply, gel cell, lead-wire SVG import) + R7 (label-overflow guard) |
| 2 | mtt_reagent_prep_bench_workspace (initial) | -10 | 4 placeholders; 3 overlaps; 4 off-page; clarity 1; pointer-intercept untested | A1B (tube, MTT-solution tube, vortex SVG import) + R7 (label width clamp) |
| 3 | mtt_solubilization_readout_plate_reader_workspace (initial) | -6 | 2 placeholders incl. hash-mark plate; 2 overlaps; 3 off-page; clarity 1; pointer-intercept untested | A1B (real 96-well plate SVG) + R7 (DMSO/vortex label width) |
| 4 | mtt_solubilization_readout_plate_reader_workspace (after_entry) | -5 | same defects as initial; volume slider recovers clarity to 2; click_target and state_change smoke pass | R9 (propagate click-driven evidence pattern to other 4 untested scenes); A1B for residual placeholders |
| 5 | sdspage_heat_denature_samples_workspace (initial) | -4 | 1 placeholder; 2 overlaps; 2 off-page; clarity 1; pointer-intercept untested | A1B (real heat-block SVG) + R7 (shrink mid-canvas Heat Block label) |

## Gallery URL

- HTML: `test-results/round3_runtime_initiative_galleries/worst5_INDEX.html` (temporary gallery output)
- Screenshots referenced (all under `test-results/round3_runtime_truth/`):
  - sdspage_attach_lid_workspace_initial.png
  - mtt_reagent_prep_bench_workspace_initial.png
  - mtt_plate_reader_workspace_initial.png
  - mtt_plate_reader_workspace_after_entry.png
  - sdspage_heat_block_workspace_initial.png

## Cross-cutting findings

- Placeholder fallbacks dominate (sum placeholder_count = 14 across 5
  rows). Asset import (A1B) is the highest-leverage lever.
- Label overflow/overlap is the next class (sum label_overlap_count +
  off_page_count = 33). R7 label-overflow guard addresses both.
- Visible crops sum to zero across the set. Do not direct effort at
  crop fixes for this slice.
- Only one row (plate-reader after_entry) carries pass smoke evidence.
  R9 should propagate that click-driven SceneChange + ObjectStateChange
  pattern to the four untested rows.

## Keep / Reject decision

Keep. Feeds next-fix queue: A1B asset-import targets are enumerated
per scene; R7 and R9 follow-ons are named.

## Boundaries respected

- Read-only on `test-results/round3_runtime_truth/` (no new captures).
- No `git commit`. No `./check_codebase.sh`.
- ASCII-only artifact and gallery markup.
- Markdown links validated.
