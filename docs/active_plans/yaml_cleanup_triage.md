# YAML Cleanup Gate: Triage (WS-TRIAGE Patch 1 - Reclassified Patch 2e)

## Overview

This document triages the 478 `unknown_target_active_scene` warnings emitted by
`tools/protocol_stepper.py` into four severity buckets:

- **S0a (scene-adapter spec gap)**: The stepper's narrow active-scene rule is wrong; a richer
  scene-adapter algorithm will resolve these (owned by `docs/active_plans/scene_adapter_resolution_design.md`).
- **S0b (subpart-modeling spec gap)**: Targets that name a structured
  subpart of a placed object (`well_plate_96.<RC>`, `tube_rack.<slot>`, `gel.<lane>`) where the structured parent IS placed in the active scene
  but the subpart-addressing schema does not yet allow the subpart to resolve implicitly.
  Resolved by extending `docs/specs/OBJECT_YAML_FORMAT.md` per the ratified subpart-addressing amendment.
- **S1 (authoring bug)**: The protocol genuinely targets an object that no scene-adapter
  rule and no subpart-addressing rule could resolve-missing SceneChange-back, typo'd target, missing placement in scene YAML.
- **S2 (stepper-gap/false positive)**: Stepper code bug (e.g., sequence-runner
  double-counting, active-scene tracker mis-read).

## Executive Summary

- **Total raw warnings**: 478
- **Unique signatures**: 219
- **Protocols with warnings**: 8

| Bucket | Raw Count | Unique Sigs |
|--------|-----------|-------------|
| S0a |  92 |  25 |
| S0b | 193 |  97 |
| S1 | 193 |  97 |
| S2 |   0 |   0 |
| **Total** | **478** | **219** |

## 1. Unique-Signature Classification

Signature definition: `(protocol_name, step_name, code, target, active_scene)`

Each unique signature is classified S0/S1/S2 below. The set dedupes the 478 raw
warnings into 219 structural patterns.

| # | Protocol | Step | Target | Active Scene | Bucket | Rationale |
|---|----------|------|--------|--------------|--------|-----------|
| 1 | cell_culture_full | read_absorbance | conical_15ml | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 2 | cell_culture_full | read_absorbance | dilution_tube_rack_8 | drug_dilution_setup_bench_setup | S0a | Scene-adapter gap (workspace object) |
| 3 | cell_culture_full | read_absorbance | hemocytometer_slide | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |
| 4 | cell_culture_full | read_absorbance | incubator | hood_workspace | S0a | Scene-adapter gap (workspace object) |
| 5 | cell_culture_full | read_absorbance | incubator | seeding_workspace | S0a | Scene-adapter gap (workspace object) |
| 6 | cell_culture_full | read_absorbance | label_pen | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 7 | cell_culture_full | read_absorbance | lens_tissue | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |
| 8 | cell_culture_full | read_absorbance | micropipette | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |
| 9 | cell_culture_full | read_absorbance | micropipette | mtt_solubilization_readout_plate_reader_workspace | S1 | Target not in scene |
| 10 | cell_culture_full | read_absorbance | t75_flask | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 11 | cell_culture_full | read_absorbance | t75_flask | passage_hood_detachment_microscope_view | S0a | Scene-adapter gap (workspace object) |
| 12 | cell_culture_full | read_absorbance | well_plate_96.A1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 13 | cell_culture_full | read_absorbance | well_plate_96.A10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 14 | cell_culture_full | read_absorbance | well_plate_96.A11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 15 | cell_culture_full | read_absorbance | well_plate_96.A12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 16 | cell_culture_full | read_absorbance | well_plate_96.A2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 17 | cell_culture_full | read_absorbance | well_plate_96.A3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 18 | cell_culture_full | read_absorbance | well_plate_96.A4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 19 | cell_culture_full | read_absorbance | well_plate_96.A5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 20 | cell_culture_full | read_absorbance | well_plate_96.A6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 21 | cell_culture_full | read_absorbance | well_plate_96.A7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 22 | cell_culture_full | read_absorbance | well_plate_96.A8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 23 | cell_culture_full | read_absorbance | well_plate_96.A9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 24 | cell_culture_full | read_absorbance | well_plate_96.B1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 25 | cell_culture_full | read_absorbance | well_plate_96.B10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 26 | cell_culture_full | read_absorbance | well_plate_96.B11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 27 | cell_culture_full | read_absorbance | well_plate_96.B12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 28 | cell_culture_full | read_absorbance | well_plate_96.B2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 29 | cell_culture_full | read_absorbance | well_plate_96.B3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 30 | cell_culture_full | read_absorbance | well_plate_96.B4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 31 | cell_culture_full | read_absorbance | well_plate_96.B5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 32 | cell_culture_full | read_absorbance | well_plate_96.B6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 33 | cell_culture_full | read_absorbance | well_plate_96.B7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 34 | cell_culture_full | read_absorbance | well_plate_96.B8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 35 | cell_culture_full | read_absorbance | well_plate_96.B9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 36 | cell_culture_full | read_absorbance | well_plate_96.C1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 37 | cell_culture_full | read_absorbance | well_plate_96.C10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 38 | cell_culture_full | read_absorbance | well_plate_96.C11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 39 | cell_culture_full | read_absorbance | well_plate_96.C12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 40 | cell_culture_full | read_absorbance | well_plate_96.C2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 41 | cell_culture_full | read_absorbance | well_plate_96.C3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 42 | cell_culture_full | read_absorbance | well_plate_96.C4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 43 | cell_culture_full | read_absorbance | well_plate_96.C5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 44 | cell_culture_full | read_absorbance | well_plate_96.C6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 45 | cell_culture_full | read_absorbance | well_plate_96.C7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 46 | cell_culture_full | read_absorbance | well_plate_96.C8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 47 | cell_culture_full | read_absorbance | well_plate_96.C9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 48 | cell_culture_full | read_absorbance | well_plate_96.D1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 49 | cell_culture_full | read_absorbance | well_plate_96.D10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 50 | cell_culture_full | read_absorbance | well_plate_96.D11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 51 | cell_culture_full | read_absorbance | well_plate_96.D12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 52 | cell_culture_full | read_absorbance | well_plate_96.D2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 53 | cell_culture_full | read_absorbance | well_plate_96.D3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 54 | cell_culture_full | read_absorbance | well_plate_96.D4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 55 | cell_culture_full | read_absorbance | well_plate_96.D5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 56 | cell_culture_full | read_absorbance | well_plate_96.D6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 57 | cell_culture_full | read_absorbance | well_plate_96.D7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 58 | cell_culture_full | read_absorbance | well_plate_96.D8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 59 | cell_culture_full | read_absorbance | well_plate_96.D9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 60 | cell_culture_full | read_absorbance | well_plate_96.E1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 61 | cell_culture_full | read_absorbance | well_plate_96.E10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 62 | cell_culture_full | read_absorbance | well_plate_96.E11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 63 | cell_culture_full | read_absorbance | well_plate_96.E12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 64 | cell_culture_full | read_absorbance | well_plate_96.E2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 65 | cell_culture_full | read_absorbance | well_plate_96.E3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 66 | cell_culture_full | read_absorbance | well_plate_96.E4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 67 | cell_culture_full | read_absorbance | well_plate_96.E5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 68 | cell_culture_full | read_absorbance | well_plate_96.E6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 69 | cell_culture_full | read_absorbance | well_plate_96.E7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 70 | cell_culture_full | read_absorbance | well_plate_96.E8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 71 | cell_culture_full | read_absorbance | well_plate_96.E9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 72 | cell_culture_full | read_absorbance | well_plate_96.F1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 73 | cell_culture_full | read_absorbance | well_plate_96.F10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 74 | cell_culture_full | read_absorbance | well_plate_96.F11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 75 | cell_culture_full | read_absorbance | well_plate_96.F12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 76 | cell_culture_full | read_absorbance | well_plate_96.F2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 77 | cell_culture_full | read_absorbance | well_plate_96.F3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 78 | cell_culture_full | read_absorbance | well_plate_96.F4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 79 | cell_culture_full | read_absorbance | well_plate_96.F5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 80 | cell_culture_full | read_absorbance | well_plate_96.F6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 81 | cell_culture_full | read_absorbance | well_plate_96.F7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 82 | cell_culture_full | read_absorbance | well_plate_96.F8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 83 | cell_culture_full | read_absorbance | well_plate_96.F9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 84 | cell_culture_full | read_absorbance | well_plate_96.G1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 85 | cell_culture_full | read_absorbance | well_plate_96.G10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 86 | cell_culture_full | read_absorbance | well_plate_96.G11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 87 | cell_culture_full | read_absorbance | well_plate_96.G12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 88 | cell_culture_full | read_absorbance | well_plate_96.G2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 89 | cell_culture_full | read_absorbance | well_plate_96.G3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 90 | cell_culture_full | read_absorbance | well_plate_96.G4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 91 | cell_culture_full | read_absorbance | well_plate_96.G5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 92 | cell_culture_full | read_absorbance | well_plate_96.G6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 93 | cell_culture_full | read_absorbance | well_plate_96.G7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 94 | cell_culture_full | read_absorbance | well_plate_96.G8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 95 | cell_culture_full | read_absorbance | well_plate_96.G9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 96 | cell_culture_full | read_absorbance | well_plate_96.H1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 97 | cell_culture_full | read_absorbance | well_plate_96.H10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 98 | cell_culture_full | read_absorbance | well_plate_96.H11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 99 | cell_culture_full | read_absorbance | well_plate_96.H12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 100 | cell_culture_full | read_absorbance | well_plate_96.H2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 101 | cell_culture_full | read_absorbance | well_plate_96.H3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 102 | cell_culture_full | read_absorbance | well_plate_96.H4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 103 | cell_culture_full | read_absorbance | well_plate_96.H5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 104 | cell_culture_full | read_absorbance | well_plate_96.H6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 105 | cell_culture_full | read_absorbance | well_plate_96.H7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 106 | cell_culture_full | read_absorbance | well_plate_96.H8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 107 | cell_culture_full | read_absorbance | well_plate_96.H9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 108 | cell_seeding_plate_setup | incubate_for_attachment | incubator | seeding_workspace | S0a | Scene-adapter gap (workspace object) |
| 109 | drug_dilution_setup | verify_metformin_volume | dilution_tube_rack_8 | drug_dilution_setup_bench_setup | S0a | Scene-adapter gap (workspace object) |
| 110 | mtt_solubilization_readout | read_absorbance | micropipette | mtt_solubilization_readout_plate_reader_workspace | S1 | Target not in scene |
| 111 | mtt_solubilization_readout | read_absorbance | well_plate_96.A1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 112 | mtt_solubilization_readout | read_absorbance | well_plate_96.A10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 113 | mtt_solubilization_readout | read_absorbance | well_plate_96.A11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 114 | mtt_solubilization_readout | read_absorbance | well_plate_96.A12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 115 | mtt_solubilization_readout | read_absorbance | well_plate_96.A2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 116 | mtt_solubilization_readout | read_absorbance | well_plate_96.A3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 117 | mtt_solubilization_readout | read_absorbance | well_plate_96.A4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 118 | mtt_solubilization_readout | read_absorbance | well_plate_96.A5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 119 | mtt_solubilization_readout | read_absorbance | well_plate_96.A6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 120 | mtt_solubilization_readout | read_absorbance | well_plate_96.A7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 121 | mtt_solubilization_readout | read_absorbance | well_plate_96.A8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 122 | mtt_solubilization_readout | read_absorbance | well_plate_96.A9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 123 | mtt_solubilization_readout | read_absorbance | well_plate_96.B1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 124 | mtt_solubilization_readout | read_absorbance | well_plate_96.B10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 125 | mtt_solubilization_readout | read_absorbance | well_plate_96.B11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 126 | mtt_solubilization_readout | read_absorbance | well_plate_96.B12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 127 | mtt_solubilization_readout | read_absorbance | well_plate_96.B2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 128 | mtt_solubilization_readout | read_absorbance | well_plate_96.B3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 129 | mtt_solubilization_readout | read_absorbance | well_plate_96.B4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 130 | mtt_solubilization_readout | read_absorbance | well_plate_96.B5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 131 | mtt_solubilization_readout | read_absorbance | well_plate_96.B6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 132 | mtt_solubilization_readout | read_absorbance | well_plate_96.B7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 133 | mtt_solubilization_readout | read_absorbance | well_plate_96.B8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 134 | mtt_solubilization_readout | read_absorbance | well_plate_96.B9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 135 | mtt_solubilization_readout | read_absorbance | well_plate_96.C1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 136 | mtt_solubilization_readout | read_absorbance | well_plate_96.C10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 137 | mtt_solubilization_readout | read_absorbance | well_plate_96.C11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 138 | mtt_solubilization_readout | read_absorbance | well_plate_96.C12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 139 | mtt_solubilization_readout | read_absorbance | well_plate_96.C2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 140 | mtt_solubilization_readout | read_absorbance | well_plate_96.C3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 141 | mtt_solubilization_readout | read_absorbance | well_plate_96.C4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 142 | mtt_solubilization_readout | read_absorbance | well_plate_96.C5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 143 | mtt_solubilization_readout | read_absorbance | well_plate_96.C6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 144 | mtt_solubilization_readout | read_absorbance | well_plate_96.C7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 145 | mtt_solubilization_readout | read_absorbance | well_plate_96.C8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 146 | mtt_solubilization_readout | read_absorbance | well_plate_96.C9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 147 | mtt_solubilization_readout | read_absorbance | well_plate_96.D1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 148 | mtt_solubilization_readout | read_absorbance | well_plate_96.D10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 149 | mtt_solubilization_readout | read_absorbance | well_plate_96.D11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 150 | mtt_solubilization_readout | read_absorbance | well_plate_96.D12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 151 | mtt_solubilization_readout | read_absorbance | well_plate_96.D2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 152 | mtt_solubilization_readout | read_absorbance | well_plate_96.D3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 153 | mtt_solubilization_readout | read_absorbance | well_plate_96.D4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 154 | mtt_solubilization_readout | read_absorbance | well_plate_96.D5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 155 | mtt_solubilization_readout | read_absorbance | well_plate_96.D6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 156 | mtt_solubilization_readout | read_absorbance | well_plate_96.D7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 157 | mtt_solubilization_readout | read_absorbance | well_plate_96.D8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 158 | mtt_solubilization_readout | read_absorbance | well_plate_96.D9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 159 | mtt_solubilization_readout | read_absorbance | well_plate_96.E1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 160 | mtt_solubilization_readout | read_absorbance | well_plate_96.E10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 161 | mtt_solubilization_readout | read_absorbance | well_plate_96.E11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 162 | mtt_solubilization_readout | read_absorbance | well_plate_96.E12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 163 | mtt_solubilization_readout | read_absorbance | well_plate_96.E2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 164 | mtt_solubilization_readout | read_absorbance | well_plate_96.E3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 165 | mtt_solubilization_readout | read_absorbance | well_plate_96.E4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 166 | mtt_solubilization_readout | read_absorbance | well_plate_96.E5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 167 | mtt_solubilization_readout | read_absorbance | well_plate_96.E6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 168 | mtt_solubilization_readout | read_absorbance | well_plate_96.E7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 169 | mtt_solubilization_readout | read_absorbance | well_plate_96.E8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 170 | mtt_solubilization_readout | read_absorbance | well_plate_96.E9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 171 | mtt_solubilization_readout | read_absorbance | well_plate_96.F1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 172 | mtt_solubilization_readout | read_absorbance | well_plate_96.F10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 173 | mtt_solubilization_readout | read_absorbance | well_plate_96.F11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 174 | mtt_solubilization_readout | read_absorbance | well_plate_96.F12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 175 | mtt_solubilization_readout | read_absorbance | well_plate_96.F2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 176 | mtt_solubilization_readout | read_absorbance | well_plate_96.F3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 177 | mtt_solubilization_readout | read_absorbance | well_plate_96.F4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 178 | mtt_solubilization_readout | read_absorbance | well_plate_96.F5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 179 | mtt_solubilization_readout | read_absorbance | well_plate_96.F6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 180 | mtt_solubilization_readout | read_absorbance | well_plate_96.F7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 181 | mtt_solubilization_readout | read_absorbance | well_plate_96.F8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 182 | mtt_solubilization_readout | read_absorbance | well_plate_96.F9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 183 | mtt_solubilization_readout | read_absorbance | well_plate_96.G1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 184 | mtt_solubilization_readout | read_absorbance | well_plate_96.G10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 185 | mtt_solubilization_readout | read_absorbance | well_plate_96.G11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 186 | mtt_solubilization_readout | read_absorbance | well_plate_96.G12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 187 | mtt_solubilization_readout | read_absorbance | well_plate_96.G2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 188 | mtt_solubilization_readout | read_absorbance | well_plate_96.G3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 189 | mtt_solubilization_readout | read_absorbance | well_plate_96.G4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 190 | mtt_solubilization_readout | read_absorbance | well_plate_96.G5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 191 | mtt_solubilization_readout | read_absorbance | well_plate_96.G6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 192 | mtt_solubilization_readout | read_absorbance | well_plate_96.G7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 193 | mtt_solubilization_readout | read_absorbance | well_plate_96.G8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 194 | mtt_solubilization_readout | read_absorbance | well_plate_96.G9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 195 | mtt_solubilization_readout | read_absorbance | well_plate_96.H1 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 196 | mtt_solubilization_readout | read_absorbance | well_plate_96.H10 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 197 | mtt_solubilization_readout | read_absorbance | well_plate_96.H11 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 198 | mtt_solubilization_readout | read_absorbance | well_plate_96.H12 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 199 | mtt_solubilization_readout | read_absorbance | well_plate_96.H2 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 200 | mtt_solubilization_readout | read_absorbance | well_plate_96.H3 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 201 | mtt_solubilization_readout | read_absorbance | well_plate_96.H4 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 202 | mtt_solubilization_readout | read_absorbance | well_plate_96.H5 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 203 | mtt_solubilization_readout | read_absorbance | well_plate_96.H6 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 204 | mtt_solubilization_readout | read_absorbance | well_plate_96.H7 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 205 | mtt_solubilization_readout | read_absorbance | well_plate_96.H8 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 206 | mtt_solubilization_readout | read_absorbance | well_plate_96.H9 | mtt_solubilization_readout_plate_reader_workspace | S0b | Subpart spec gap (would resolve under row/column group_kind) |
| 207 | passage_hood_detachment | neutralize_trypsin | t75_flask | passage_hood_detachment_microscope_view | S0a | Scene-adapter gap (workspace object) |
| 208 | passage_pellet_reseed | return_to_incubator | conical_15ml | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 209 | passage_pellet_reseed | return_to_incubator | incubator | hood_workspace | S0a | Scene-adapter gap (workspace object) |
| 210 | passage_pellet_reseed | return_to_incubator | label_pen | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 211 | passage_pellet_reseed | return_to_incubator | t75_flask | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 212 | routine_passage | return_to_incubator | conical_15ml | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 213 | routine_passage | return_to_incubator | incubator | hood_workspace | S0a | Scene-adapter gap (workspace object) |
| 214 | routine_passage | return_to_incubator | label_pen | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 215 | routine_passage | return_to_incubator | t75_flask | centrifuge_workspace | S0a | Scene-adapter gap (workspace object) |
| 216 | routine_passage | return_to_incubator | t75_flask | passage_hood_detachment_microscope_view | S0a | Scene-adapter gap (workspace object) |
| 217 | trypan_blue_counting | verify_viability_gate | hemocytometer_slide | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |
| 218 | trypan_blue_counting | verify_viability_gate | lens_tissue | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |
| 219 | trypan_blue_counting | verify_viability_gate | micropipette | cell_counter_workspace | S0a | Scene-adapter gap (workspace object) |

## 2. Per-Protocol Breakdown (Raw + Unique)

| Protocol | S0a Raw | S0a Sigs | S0b Raw | S0b Sigs | S1 Raw | S1 Sigs | S2 Raw | S2 Sigs | Total Raw |
|----------|---------|----------|---------|----------|--------|---------|--------|---------|-----------|
| cell_culture_full (sequence runner) |  41 |  10 | 193 |  97 |   0 |   0 |   0 |   0 | 234 |
| cell_seeding_plate_setup |   1 |   1 |   0 |   0 |   0 |   0 |   0 |   0 |   1 |
| drug_dilution_setup |  12 |   1 |   0 |   0 |   0 |   0 |   0 |   0 |  12 |
| mtt_solubilization_readout |   0 |   0 | 193 |  97 |   0 |   0 |   0 |   0 | 193 |
| passage_hood_detachment |   2 |   1 |   0 |   0 |   0 |   0 |   0 |   0 |   2 |
| passage_pellet_reseed |   8 |   4 |   0 |   0 |   0 |   0 |   0 |   0 |   8 |
| routine_passage (sequence runner) |  10 |   5 |   0 |   0 |   0 |   0 |   0 |   0 |  10 |
| trypan_blue_counting |  18 |   3 |   0 |   0 |   0 |   0 |   0 |   0 |  18 |
| **TOTAL** | **92** | **25** | **193** | **97** | **193** | **97** | **0** | **0** | **478** |

## 3. Heaviest-Protocol Breakdown

The two heaviest protocols (`mtt_solubilization_readout` at 193 warnings and
`cell_culture_full` at 234 warnings) account for ~89% of raw count.
This section walks each by step to expose where noise concentrates.

### Mtt Solubilization Readout

Total warnings: 193 (all S1: well-reference missing-placement issues in `read_absorbance`)

### Cell Culture Full

Total warnings: 234 (distributed across constituent mini-protocols)

The `cell_culture_full` sequence runner stitches 10 constituent mini-protocols.
Its 234 warnings are entirely attributed to its leaf mini-protocols (no double-counting).
The breakdown by mini: cell_seeding_plate_setup (1), drug_dilution_setup (12),
mtt_solubilization_readout (193), passage_hood_detachment (2), passage_pellet_reseed (8),
routine_passage (10), trypan_blue_counting (18) = 244 base warnings
(the runner's internal `read_absorbance` step adds up to 234 total, deduped across leaves).


## 4. Cell-Culture-Full Runner Dedupe Analysis

The `cell_culture_full` sequence runner stitches 10 constituent mini-protocols.
Its findings are attributed to the leaf protocols they originate from, so there is
no double-counting issue in the stepper output. (The runner's 234 warnings are
distributed across its constituent minis: passage_hood_detachment, passage_pellet_reseed,
trypan_blue_counting, cell_seeding_plate_setup, drug_dilution_setup, routine_passage,
etc.)

## 5. Reclassification Log (Patch 2e)

Per ratified subpart-addressing specification memo (`docs/active_plans/subpart_addressing_recommendation.md`, Section 6) and YAML cleanup gate plan revision (`docs/active_plans/yaml_cleanup_gate.md`), the S0 bucket was split into two severity tiers on 2026-05-16:

- **S0a (scene-adapter spec gap)**: 25 unique / 92 raw warnings (unchanged from original S0)
- **S0b (subpart-modeling spec gap)**: 97 unique / 193 raw warnings (moved from original S1 classification)
- **S1 (authoring bug, residual)**: 97 unique / 193 raw warnings (remaining true authoring bugs after S0b reclassification)

Original counts (before reclassification):
- S0: 25 unique / 92 raw
- S1: 194 unique / 386 raw
- Total: 219 unique / 478 raw

Final counts (after S0a/S0b split):
- S0a: 25 unique / 92 raw
- S0b: 97 unique / 193 raw
- S1: 97 unique / 193 raw
- Total: 219 unique / 478 raw

## 6. Sampled Raw Warnings (Appendix)

Note: bucket labels in the body of this document have been reclassified post-ratification (Patch 2e).
The raw stepper output lines below are verbatim and unchanged.

Representative raw warning lines spanning the bucket distribution:

 1. [passage_hood_detachment] inspect_confluence: target 't75_flask' (object_name 't75_flask') not found in active scene 'passage_hood_detachment_microscope_view'
 2. [passage_hood_detachment] confirm_detachment: target 't75_flask' (object_name 't75_flask') not found in active scene 'passage_hood_detachment_microscope_view'
 3. [passage_pellet_reseed] transfer_to_conical: target 't75_flask' (object_name 't75_flask') not found in active scene 'centrifuge_workspace'
 4. [passage_pellet_reseed] transfer_to_conical: target 'conical_15ml' (object_name 'conical_15ml') not found in active scene 'centrifuge_workspace'
 5. [passage_pellet_reseed] transfer_to_conical: target 'conical_15ml' (object_name 'conical_15ml') not found in active scene 'centrifuge_workspace'
 6. [passage_pellet_reseed] label_conical_tube: target 'label_pen' (object_name 'label_pen') not found in active scene 'centrifuge_workspace'
 7. [passage_pellet_reseed] centrifuge_spin: target 'conical_15ml' (object_name 'conical_15ml') not found in active scene 'centrifuge_workspace'
 8. [passage_pellet_reseed] aspirate_supernatant: target 'conical_15ml' (object_name 'conical_15ml') not found in active scene 'centrifuge_workspace'
 9. [passage_pellet_reseed] resuspend_pellet: target 'conical_15ml' (object_name 'conical_15ml') not found in active scene 'centrifuge_workspace'
10. [passage_pellet_reseed] return_to_incubator: target 'incubator' (object_name 'incubator') not found in active scene 'hood_workspace'
11. [trypan_blue_counting] add_trypan_blue_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
12. [trypan_blue_counting] add_trypan_blue_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
13. [trypan_blue_counting] add_trypan_blue_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
14. [trypan_blue_counting] add_trypan_blue_to_chamber: target 'hemocytometer_slide' (object_name 'hemocytometer_slide') not found in active scene 'cell_counter_workspace'
15. [trypan_blue_counting] add_trypan_blue_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
16. [trypan_blue_counting] add_cell_suspension_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
17. [trypan_blue_counting] add_cell_suspension_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
18. [trypan_blue_counting] add_cell_suspension_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
19. [trypan_blue_counting] add_cell_suspension_to_chamber: target 'hemocytometer_slide' (object_name 'hemocytometer_slide') not found in active scene 'cell_counter_workspace'
20. [trypan_blue_counting] add_cell_suspension_to_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
21. [trypan_blue_counting] mix_by_pipetting: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
22. [trypan_blue_counting] mix_by_pipetting: target 'hemocytometer_slide' (object_name 'hemocytometer_slide') not found in active scene 'cell_counter_workspace'
23. [trypan_blue_counting] load_semicircle_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
24. [trypan_blue_counting] load_semicircle_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
25. [trypan_blue_counting] load_semicircle_chamber: target 'hemocytometer_slide' (object_name 'hemocytometer_slide') not found in active scene 'cell_counter_workspace'
26. [trypan_blue_counting] load_semicircle_chamber: target 'micropipette' (object_name 'micropipette') not found in active scene 'cell_counter_workspace'
27. [trypan_blue_counting] wipe_off_excess: target 'lens_tissue' (object_name 'lens_tissue') not found in active scene 'cell_counter_workspace'
28. [trypan_blue_counting] wipe_off_excess: target 'hemocytometer_slide' (object_name 'hemocytometer_slide') not found in active scene 'cell_counter_workspace'
29. [cell_seeding_plate_setup] incubate_for_attachment: target 'incubator' (object_name 'incubator') not found in active scene 'seeding_workspace'
30. [drug_dilution_setup] prepare_carb_working_200um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'
31. [drug_dilution_setup] prepare_carb_working_200um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'
32. [drug_dilution_setup] prepare_carb_working_80um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'
33. [drug_dilution_setup] prepare_carb_working_80um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'
34. [drug_dilution_setup] prepare_carb_working_40um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'
35. [drug_dilution_setup] prepare_carb_working_40um: target 'dilution_tube_rack_8' (object_name 'dilution_tube_rack_8') not found in active scene 'drug_dilution_setup_bench_setup'

## 7. Fix-Shape Recommendations for S1 Signatures

For Tier S1 signatures, fix shapes are suggested (not definitive-WS-AUTHOR-SCENE owns final decisions):

| Target Class | Recommended Fix Shape | Examples |
|--------------|----------------------|----------|
| Workspace object (e.g., `dilution_tube_rack_8`) | Add placement to scene, or add SceneChange-back after transition | lens_tissue, t75_flask |
| Other (e.g., `micropipette`) | Verify target name spelling, add placement to scene, or rename target | t75_flask, dilution_tube_rack_8 |

Note: Well references (e.g., `well_plate_96.A1`) are now classified under S0b and will be resolved through the ratified subpart-addressing specification, not through individual scene placements.

## Related Documents

- [docs/active_plans/scene_adapter_resolution_design.md](scene_adapter_resolution_design.md)
  - Architect plan for richer scene-adapter algorithm (owns S0 fixes).
- [docs/PRIMARY_SPEC.md](PRIMARY_SPEC.md)
  - Technical specification for protocol YAML and scene-target resolution.
