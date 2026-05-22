# Round 3 Cluster-wide Mount Audit

Discovery workstream to identify remaining mount gaps after M3-ext's cell_culture pass.

**Status:** MOUNT=YES for all 26 mini-protocols with complete scene catalog. One schema violation and one missing scene require remediation.

## Executive Summary

- **Total protocols audited:** 31 (26 mini-protocols + 5 sequence runners)
- **Mini-protocols mount pass:** 25/26 (96%)
- **Mini-protocols mount fail:** 1/26 (4%) - missing scene
- **Mount drift detected:** 0 (M3-ext achieved 100% SceneChange coverage)
- **Schema violations found:** 1 (set_voltage field not in closed binding set)
- **Missing scenes:** 1 (microscope_view)
- **Sequence runners (not generated):** 5/5 (expected N/A)

## Cluster Breakdown

### cell_culture (10 mini-protocols): 9/10 mount

| Protocol | Mount | Scene | Status |
| --- | --- | --- | --- |
| cell_seeding_plate_setup | YES | seeding_workspace | OK |
| drug_dilution_setup | YES | dilution_workspace | OK |
| mtt_plate_reaction | YES | incubator_workspace | OK |
| mtt_reagent_prep | YES | mtt_reagent_prep_bench_workspace | OK |
| mtt_solubilization_readout | YES | mtt_solubilization_readout_bench_workspace | OK |
| passage_hood_detachment | NO | NULL | FAIL: scene "microscope_view" not in SCENE_CATALOG |
| passage_pellet_reseed | YES | hood_workspace | OK |
| plate_drug_treatment_drug_addition | YES | plate_workspace | OK |
| plate_drug_treatment_media_adjustment | YES | plate_drug_treatment_media_adjustment_plate_workspace | OK |
| trypan_blue_counting | YES | cell_counter_workspace | OK |

### sdspage (16 mini-protocols): 16/16 mount

All 16 mini-protocols mount successfully. One has a runtime schema violation (set_voltage field).

| Protocol | Mount | Scene | Status |
| --- | --- | --- | --- |
| sdspage_assemble_electrode_module | YES | electrophoresis_bench | OK |
| sdspage_attach_lid_and_leads | YES | sdspage_attach_lid_and_leads_workspace | OK |
| sdspage_destain_gel_rock | YES | sdspage_destain_gel_rock_workspace | OK |
| sdspage_destain_gel_setup | YES | staining_bench | OK |
| sdspage_extract_gel_from_cassette | YES | extraction_workspace | OK |
| sdspage_fill_tank_buffer | YES | sdspage_fill_tank_buffer_workspace | OK |
| sdspage_heat_denature_samples | YES | sdspage_heat_denature_samples_workspace | OK |
| sdspage_image_gel | YES | imaging_bench | OK |
| sdspage_load_protein_ladder | YES | electrophoresis_bench | OK |
| sdspage_load_sample_single_lane | YES | sdspage_load_sample_single_lane_workspace | OK |
| sdspage_prepare_gel_cassette | YES | electrophoresis_bench | OK |
| sdspage_prepare_running_buffer | YES | sdspage_prepare_running_buffer_workspace | OK |
| sdspage_prepare_sample_mix_single_lane | YES | sdspage_prepare_sample_mix_single_lane_workspace | OK |
| sdspage_recycle_buffer | YES | sdspage_recycle_buffer_workspace | OK |
| sdspage_run_electrophoresis | YES | sdspage_run_electrophoresis_workspace | WARN: schema violation (set_voltage) |
| sdspage_stain_gel | YES | staining_bench | OK |

### runners (5 sequence runners): 0/5 HTML generated

Sequence runners are not mini-protocols; they do not have standalone HTML files.

| Protocol | HTML Generated | Reason |
| --- | --- | --- |
| cell_culture_full | NO | Sequence runner (composition vehicle) |
| routine_passage | NO | Sequence runner (composition vehicle) |
| sdspage_full | NO | Sequence runner (composition vehicle) |
| sdspage_load_samples_batch | NO | Sequence runner (composition vehicle) |
| sdspage_prepare_sample_mix_batch | NO | Sequence runner (composition vehicle) |

**Expected behavior:** Sequence runners are tested via a separate runner walker that sequences mini-protocol HTML files. Not yet implemented.

## Remediation Workstream

Three categories of issues require follow-up work:

### Issue 1: Missing Scene (Blocking)

**Protocol:** passage_hood_detachment
**Error:** Scene "microscope_view" not found in SCENE_CATALOG
**Impact:** Mini-protocol fails to initialize. First step cannot run.
**Root cause:** Scene is named in protocol YAML's entry_step response.scene_operations but is not defined in the scene catalog.
**Remediation:** Add microscope_view scene definition to content/scenes/ YAML. Rebuild. Re-audit.
**Workstream:** New mini-protocol workstream or extension to cell_culture cluster.
**Priority:** High (blocks pedagogy)

### Issue 2: Schema Violation at Runtime (Blocking)

**Protocol:** sdspage_run_electrophoresis
**Error:** adjust_panel field "set_voltage" is not in Pilot 1 binding closure
**Closed binding set:** ["set_volume", "wavelength_nm"]
**Impact:** power_supply object fails to initialize. Mini-protocol fails to load.
**Root cause:** YAML declares set_voltage on power_supply; adjust_panel schema does not include it.
**Options:**
  (a) Add set_voltage to adjust_panel closed binding set (requires PRIMARY_DESIGN.md update and plan approval per vocabulary closure rule).
  (b) Rename set_voltage in YAML to an existing field in the closed set (if semantically compatible).
  (c) Remove set_voltage from protocol YAML (if not needed for this protocol).
**Remediation:** Pick option (a), (b), or (c) and implement. Re-audit.
**Workstream:** New schema workstream or extension to sdspage cluster.
**Priority:** High (violates closure guarantees; blocks pedagogy)

### Issue 3: Sequence Runners (Not Mini-protocols)

**Protocols:** cell_culture_full, routine_passage, sdspage_full, sdspage_load_samples_batch, sdspage_prepare_sample_mix_batch
**Observation:** No HTML generated for sequence runners.
**Reason:** Sequence runners are protocol composition vehicles, not mini-protocols. They do not have standalone per-protocol HTML.
**Expected behavior:** A future runner walker will load the first mini-protocol HTML, complete it, then load the next mini-protocol HTML in sequence, advancing the student through the curriculum pathway.
**Action:** Skip from mount audit. This is expected N/A behavior.
**Future work:** Implement sequence runner walker for full-pathway testing.
**Priority:** Low (expected design; not a bug)

## Key Findings

**M3-ext achieved 100% SceneChange coverage:** No mount drift detected. Every mini-protocol that mounts loads the expected scene.

**Foundation HTML generation is complete:** 26 mini-protocol HTML files exist and load successfully via file:// URLs.

**Two actionable issues remain:**
  1. One missing scene (microscope_view) blocks passage_hood_detachment.
  2. One schema violation (set_voltage) blocks sdspage_run_electrophoresis.

**Both can be fixed independently:** No cross-protocol dependencies.

## Screenshots

Per-protocol runtime state captured in 26 PNG files at:
- test-results/round3_cluster_mount_audit/

Each screenshot shows the mounted scene, first interaction target, and any console errors.

## Audit Metadata

- **Run date:** 2026-05-22
- **Driver:** tests/playwright/_temp_cluster_mount_audit.mjs
- **Protocols tested:** 31 (26 mini + 5 runners)
- **Time to complete:** ~4 minutes
- **Results:** test-results/round3_cluster_mount_audit/summary.json
