# Round 3 Runtime Quality Initiative - Q1 best 5 gallery

Date: 2026-05-22
Owner: Q1 best-5 selection (read-only, inspection of existing Round 3 captures)
Companion HTML: `test-results/round3_runtime_initiative_galleries/best5_INDEX.html` (temporary gallery output)
Source scoreboard: [round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md)

## Purpose

Q1 picks the 5 best runtime scenes from the Round 3 initiative for demo use:
highest visual quality, fewest visible defects, and most demo-worthy framing.
Selection draws from the A1 runtime-truth captures, the R1 mount-fix retakes,
the R2 placeholder-fix sweep, the R2-alt well-plate composite variants, the
R3-alt label CSS variant, and the R6 scoreboard. Subjective ranking applies
where scoreboard data is absent (R1 retakes and label-CSS retakes were taken
after R6 scored the originals).

## Ranking table

| Rank | Scene | Screenshot path | Score | Why good |
| --- | --- | --- | --- | --- |
| 1 | staining_bench (after R1 fix) | test-results/round3_runtime_truth/staining_bench_after_fix.png | not scored (post-R1) | Four real volumetric flask SVGs render cleanly with crisp labels, a real Rocking Shaker asset anchors the bottom-right, and the staining tray placeholder is clearly labeled. |
| 2 | sdspage_heat_denature_samples_workspace (after R3 label fix) | test-results/round3_runtime_truth/sdspage_heat_block_workspace_after_label_fix.png | R6 -4 (initial); R3 label fix cleaner | Cleanest SDS-PAGE family layout: a labeled dashed Heat Block placeholder, a recognizable Microtube rack region, and a real Protein ladder tube SVG, with no overlapping label clusters. |
| 3 | mtt_solubilization_readout_plate_reader_workspace (R3 label CSS variant, after_entry) | test-results/round3_runtime_label_css_variant/mtt_plate_reader_workspace_after_entry.png | R6 -5; click + ObjectStateChange smoke pass | Only scene with verified click-driven runtime state change: real 96-well plate SVG, a clean DMSO + Waste container pair, and a live Pipette Volume slider. |
| 4 | mtt_solubilization_readout_plate_reader_workspace (after R3 label fix) | test-results/round3_runtime_truth/mtt_plate_reader_workspace_after_label_fix.png | R6 -5; click + ObjectStateChange smoke pass | Same click-through success as rank 3 using the runtime-truth label-fix variant; hash-marked plate placeholder is still legible and the Pipette Volume widget is the unambiguous focal point. |
| 5 | electrophoresis_bench (after R1 fix) | test-results/round3_runtime_truth/electrophoresis_bench_after_fix.png | not scored (post-R1) | Real Running buffer flask, Protein ladder microtube, and Buffer recycle bottle anchor the top row; labeled dashed Power Supply placeholder plus labeled gel cassette and electrode module placeholders give the rest of the rig a clear semantic structure. |

## Gallery URL path

- HTML gallery: `test-results/round3_runtime_initiative_galleries/best5_INDEX.html`
- Open in a browser via `file://` or serve via `bash run_web_server.sh` and navigate to the file.

## Keep / reject

Keep. Archive this gallery for demo use during Round 3 close-out. The five
scenes selected are the only Round 3 captures that combine real (non-error,
non-placeholder-only) asset rendering with readable labels; they are the
strongest available demo frames until Batch D fix experiments produce
replacements.

## Boundaries respected

- Read-only on `src/`, `content/`, `generated/`, `dist/`, `pipeline/`, and
  the source `test-results/round3_*` capture trees. No new walker runs,
  no new captures, no new builds.
- No `git commit`. Only the markdown-link verification + ASCII compliance
  check are run after artifact creation.
