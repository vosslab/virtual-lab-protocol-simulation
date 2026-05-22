# Round 3 runtime quality scoreboard (Workstream R6)

Date: 2026-05-22
Owner: R6 scoring pass (read-only, visual inspection of A1 captures)
Source artifacts: `test-results/round3_runtime_truth/` (A1 captures)
Companion report: [round3_runtime_truth_audit.md](round3_runtime_truth_audit.md)

## Purpose

R6 converts A1's qualitative runtime-truth audit into a per-scene numeric
scoreboard. Each row scores one mounted runtime scene on six visible
quality dimensions plus two smoke-test outcomes. The scoreboard is
intended to drive Batch D fix prioritization: lowest combined-score
scenes are the worst-quality runtime targets.

## Scoring rubric

- `visible_crop_count`: integer count of cropped scientific SVG assets.
  Counts assets whose own artwork is clipped at a card or viewport
  boundary. Oversized labels that overflow are recorded separately under
  `off_page_count` / `label_overlap_count`, not as crops.
- `placeholder_count`: integer count of green fallback rounded-rect or
  dashed-outline placeholder shapes (assets that did not resolve to a
  real SVG export).
- `label_overlap_count`: integer count of distinct label collisions
  (two or more text labels visibly overlapping each other or overlapping
  a scientific asset).
- `off_page_count`: integer count of objects (assets or labels) whose
  artwork extends beyond the visible 1280 x 900 viewport.
- `object_clarity`: subjective 0 to 5, where 5 = every scientific object
  is immediately recognizable; 0 = nothing is recognizable as scientific
  equipment.
- `click_target_smoke`: pass / fail / untested. Pass requires evidence
  that a real visible click drove a runtime state transition.
- `object_state_change_smoke`: pass / fail / untested. Pass requires
  evidence that an `ObjectStateChange` (set-point, material change,
  visual_state swap) was visible after a click.
- `combined_score`: lower is worse. Computed as
  `object_clarity - (visible_crop_count + placeholder_count + label_overlap_count + off_page_count)`.
  This treats clarity as positive signal and every defect class as
  equal-weight negative signal. Range is unbounded below; theoretical
  ceiling is 5.

## Smoke-test cost note

Re-running the walker against any of these scenes requires:
`bash build_github_pages.sh` + `bash pipeline/build_runtime_bundle.sh` +
per-protocol HTML build + `node tests/playwright/_temp_runtime_truth.mjs`.
This is not cheap inside this workstream's read-only budget. The only
scene with existing click-driven evidence is
`mtt_solubilization_readout_plate_reader_workspace`, which A1 reached by
clicking through a `SceneChange` from the bench workspace (see
`mtt_plate_reader_workspace_after_entry.png` and Scene 2 in the A1
report). That counts as click_target_smoke = pass for that scene; the
post-click capture also shows a visible Pipette Volume control that was
not present pre-click, which is an `ObjectStateChange`-class visible
delta (object_state_change_smoke = pass). All other scenes are marked
untested.

## Scoreboard

| Scene | visible_crop_count | placeholder_count | label_overlap_count | off_page_count | object_clarity | click_target_smoke | object_state_change_smoke | combined_score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mtt_reagent_prep_bench_workspace (initial) | 0 | 4 | 3 | 4 | 1 | untested | untested | -10 |
| mtt_solubilization_readout_plate_reader_workspace (initial) | 0 | 2 | 2 | 3 | 1 | untested | untested | -6 |
| mtt_solubilization_readout_plate_reader_workspace (after_entry) | 0 | 2 | 2 | 3 | 2 | pass | pass | -5 |
| sdspage_attach_lid_and_leads_workspace (initial) | 0 | 5 | 8 | 4 | 0 | untested | untested | -17 |
| sdspage_heat_denature_samples_workspace (initial) | 0 | 1 | 2 | 2 | 1 | untested | untested | -4 |

## Per-scene notes

### mtt_reagent_prep_bench_workspace (initial)

- crops: zero asset crops (one small bottle silhouette renders intact at thumbnail scale).
- placeholders: four green rounded-rect placeholders (tube on left, MTT solution tube center, vortex top-right, tube bottom-right).
- label_overlap: at top "tube/vial(s) PBS/vortex" labels collide into a single illegible cluster; mid-canvas "MTT solution" overlaps the placeholder ring beneath it; "tube" / "Micropipette" labels overlap each other near bottom-center.
- off_page: "vorte..." truncated at right edge; "Micropi..." truncated at right edge; large bottom-row labels run past viewport right; "MTT solution" label exceeds card.
- object_clarity = 1: only the small bottle is recognizable; everything else is a placeholder ring.

### mtt_solubilization_readout_plate_reader_workspace (initial)

- crops: zero. The 96-well plate placeholder (grey rect with vertical hash marks) is present and centered.
- placeholders: two green rings (top-left, bottom-right) plus the hash-marked grey rectangle (treated as semi-placeholder; counted once as plate placeholder, the bottle silhouette is real, so total = 2).
- label_overlap: "DMSO" / "MTT" / "container" cluster collides at top-left; "vorte..." overlaps the top-right placeholder.
- off_page: "vorte..." truncated at right; "Micropi..." truncated at right; "DMSO container" label runs past left edge.
- object_clarity = 1: only the small bottle silhouette is identifiable; plate is a hash-mark placeholder, not a real well-plate asset.

### mtt_solubilization_readout_plate_reader_workspace (after_entry)

- Same defects as initial plus a new "Pipette Volume (uL)" control with slider visible mid-canvas. The set-point control is a visible runtime state change that was not present pre-click, so this row scores click_target_smoke = pass and object_state_change_smoke = pass.
- object_clarity bumped to 2 because the pipette volume widget is unambiguously identifiable as a set-point control.

### sdspage_attach_lid_and_leads_workspace (initial)

- crops: zero (image is too compressed to be sure of any single-asset clipping, but no visible crop is present).
- placeholders: five distinct green rounded-rect or ring placeholders (three left-center cluster, one right-center, one bottom). Plus a "Power Supply (off)" dashed-box label panel.
- label_overlap: at least eight visible label collisions; the entire upper third is a stack of overlapping text fragments ("electrolyte", "Gel...", "lid", "sealed cell", "PRIMER", "ladder", etc.) layered atop each other.
- off_page: at least four labels are truncated at left or right viewport edges.
- object_clarity = 0: nothing in the rendered scene resolves to a recognizable electrophoresis assembly. This is the worst scene in the set.

### sdspage_heat_denature_samples_workspace (initial)

- crops: zero. The dashed-outline "Heat Block (closed)" placeholder is intact.
- placeholders: one green rounded-rect (top-left) and one dashed-outline heat-block placeholder (total 1, with the dashed-outline counted as an authored placeholder visual not a fallback rect).
- label_overlap: "Heat Block" mid-canvas label overlaps the green rect placeholder; "slot)" and "ladder" collide at the top.
- off_page: top-edge "slot)" label clips the top of the viewport; "ladder t" runs past the right edge.
- object_clarity = 1: the dashed "Heat Block (closed)" placeholder is at least labeled and identifiable as an intended instrument slot, but the green rect placeholder above it is unlabeled and the oversized "Heat Block" mid-canvas label dominates the frame.

## Totals

- Scenes scored: 5 rows (4 distinct mounted scenes; the
  `mtt_solubilization_readout_plate_reader_workspace` scene appears
  twice, initial and after_entry, because A1 captured both).
- Sum visible_crop_count: 0
- Sum placeholder_count: 14
- Sum label_overlap_count: 17
- Sum off_page_count: 16
- Mean object_clarity: 1.0 (range 0 to 2)
- click_target_smoke: 1 pass, 0 fail, 4 untested
- object_state_change_smoke: 1 pass, 0 fail, 4 untested

## Worst scenes by combined score

1. `sdspage_attach_lid_and_leads_workspace` (initial) -- combined_score
   -17. Five placeholders, eight overlap clusters, four off-page labels,
   object_clarity 0. Nothing in the frame resolves to a recognizable
   electrophoresis lid-and-leads assembly.
2. `mtt_reagent_prep_bench_workspace` (initial) -- combined_score -10.
   Four placeholders, three overlap clusters, four off-page labels, only
   the small bottle silhouette is identifiable.

These two are the recommended Batch D fix-experiment targets: visible
runtime crops are not the problem (zero across the set), but oversized
labels plus placeholder-shape assets dominate the scenes and drive
object_clarity to floor.

## Boundaries respected

- Read-only on `src/`, `content/`, `generated/`, `dist/`, `pipeline/`,
  and `test-results/`. No new production captures generated; scoring is
  inspection-only on existing A1 artifacts.
- No `git commit`. No `./check_codebase.sh`. No `pytest` runs other
  than the markdown-links check requested for this artifact.
- Walker not re-run; click smoke is `untested` except where A1's
  existing post-click capture provides direct evidence.
