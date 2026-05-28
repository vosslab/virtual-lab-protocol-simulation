# Protocol Corpus Inventory

Milestone 3 exit evidence: WP-4-1 pilot protocol selection.

## Overview

Student-visible protocols: 26 (23 mini + 3 runners)
Dev smoke excluded: 3

## Student-visible Mini-Protocols Ranked by Risk

| Rank | Protocol | Cluster | Steps |
|------|----------|---------|-------|
| 1 | mtt_reagent_prep | cell_culture | 4 |
| 2 | passage_hood_detachment | cell_culture | 10 |
| 3 | plate_drug_treatment_media_adjustment | cell_culture | 2 |
| 4 | trypan_blue_counting | cell_culture | 9 |
| 5 | mtt_plate_reaction | cell_culture | 6 |
| 6 | passage_pellet_reseed | cell_culture | 10 |
| 7 | mtt_solubilization_readout | cell_culture | 3 |
| 8 | drug_dilution_setup | cell_culture | 8 |
| 9 | cell_seeding_plate_setup | cell_culture | 4 |
| 10 | plate_drug_treatment_drug_addition | cell_culture | 9 |
| 11-23 | 13 SDS-PAGE mini-protocols | sdspage | 2-4 |

## Top 3 Lowest-Risk Protocols

1. mtt_reagent_prep: 4 steps, 1 scene, click+adjust
2. passage_hood_detachment: 10 steps, 2 scenes, microscope workflow
3. plate_drug_treatment_media_adjustment: 2 steps, 1 scene, fewest

## Sequence Runners

- routine_passage (2 mini-protocols)
- cell_culture_full (10 mini-protocols)
- sdspage_full (20 mini-protocols)

## Dev Smoke (Excluded)

- well_plate_96_zoom_check (schema-compliant)
- bench_direct_check (legacy format)
- plate_reader_check (legacy format)

## Pilot Pair Recommendation

mtt_reagent_prep (rank 1) + trypan_blue_counting (rank 4)

Union coverage:
- 13 steps total
- 3 workspaces (mtt_reagent_prep, cell_counter, hemocytometer)
- All 5 scene operation primitives
- Dual-instrument workflow
- Viability decision gate (90% threshold)
- Both have learning blocks

Trade-off: no explicit modal surface yet authored

Alternative: swap trypan_blue_counting for mtt_solubilization_readout
if plate_reader becomes modal scene.

## Status: Complete

Inventory date: 2026-05-27
Total student-visible: 26 (23 mini + 3 runners)
Total dev_smoke: 3
Analysis: protocol.yaml structure, steps, scene ops, gestures,
  learning blocks, risk factors

