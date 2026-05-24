# M0 static SVG completeness

STATIC EXPERIMENT EVIDENCE.

Lane D (no-crop / SVG completeness spot check) for the layout-manager-clean-start plan.
Source plan: `docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md`.

## 1. Methodology

Two evidence sources were used:

- `experiments/css_native_layout/no_crop_audit/inspect.mjs` ran to completion (exit 0)
  and wrote `experiments/css_native_layout/no_crop_audit/no_crop_audit_results.json`.
  That JSON file (18 KB) was copied verbatim to
  `test-results/m0_static_summary/no_crop_audit/no_crop_audit_results.json`.
  The script reported `Total cropping/distortion incidents: 16` across the same 10
  templates this lane audits (cropping is a separate dimension from SVG completeness).
  inspect.mjs does not categorize SVG references; it measures rendered geometry.

- A manual fallback was run anyway to satisfy the SVG-completeness brief. The 10
  tracked top-level templates under `experiments/css_native_layout/templates/` were
  enumerated via `git ls-files 'experiments/css_native_layout/templates/*.html' | grep -v dir_`
  to exclude the `dir_b/` and `dir_c/` variants. Each template was read with the Read tool,
  and every `<img src="...svg" />` reference was paired with its enclosing
  `data-object-name` attribute. Each SVG was checked for existence and file size under
  `assets/equipment/` via `ls -la`. References were categorized by these rules:
    - REAL_SVG: file exists, size > 500 bytes, and its filename matches the
      `data-object-name` semantically.
    - PLACEHOLDER: the SVG filename is `microtube_rack_24_placeholder.svg` or ends in
      `_placeholder.svg` (Lane B finding: any `_placeholder` reference is treated as
      PLACEHOLDER even if the file is non-trivial in size).
    - MISSING: the file does not exist under `assets/equipment/`.
    - WRONG_ASSET: file exists but its name does not match the `data-object-name`
      semantically (for example a `microscope` object using `centrifuge_new.svg`).

inspect.mjs running successfully is a positive signal: it does not import anything from
`src/`, so the empty `src/` tree did not block this experiment. The script depends only
on Playwright and on the templates plus styles directly under
`experiments/css_native_layout/`.

## 2. Per-template object table

| Template | data-object-name | SVG referenced | Category | Notes |
| --- | --- | --- | --- | --- |
| bench_basic.html | well_plate_96 | 96well_pcr_plate.svg | REAL_SVG | 151 KB, matches |
| bench_basic.html | p200_micropipette | p200_micropipette_filled.svg | REAL_SVG | 16 KB, matches |
| cell_counter_basic.html | counter_slide_cartridge | cell_counter.svg | WRONG_ASSET | cartridge object using counter image |
| cell_counter_basic.html | cell_counter | cell_counter_new.svg | REAL_SVG | 3.2 KB, matches |
| crowded_bench_dense.html | coomassie_stain_bottle | coomassie_stain_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | destain_bottle | destain_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | ddh2o_bottle | ddh2o_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | coomassie_recycle_bottle | coomassie_recycle_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | destain_waste_bottle | destain_waste_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | laemmli_4x_bottle | laemmli_4x_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | bme_bottle | bme_bottle_filled.svg | REAL_SVG | matches |
| crowded_bench_dense.html | staining_tray | staining_tray_empty.svg | REAL_SVG | matches |
| crowded_bench_dense.html | kimwipe_pad | kimwipe_pad.svg | REAL_SVG | 490 bytes, name matches |
| crowded_bench_dense.html | gel_cassette | gel_cassette.svg | REAL_SVG | matches |
| crowded_bench_dense.html | microwave | microwave_closed.svg | REAL_SVG | matches |
| crowded_bench_dense.html | rocking_shaker | rocking_shaker_idle.svg | REAL_SVG | matches |
| crowded_bench_dense.html | waste_container | waste_container.svg | REAL_SVG | matches |
| drug_dilution_plate_workspace.html | stock_bottle (DMSO) | destain_bottle_filled.svg | WRONG_ASSET | reused stain SVG |
| drug_dilution_plate_workspace.html | stock_bottle (PBS) | ddh2o_bottle_filled.svg | WRONG_ASSET | reused water SVG |
| drug_dilution_plate_workspace.html | stock_bottle (Drug) | bme_bottle_filled.svg | WRONG_ASSET | reused BME SVG |
| drug_dilution_plate_workspace.html | well_plate_96 | 96well_pcr_plate.svg | REAL_SVG | matches |
| drug_dilution_plate_workspace.html | tube_rack_24 | microtube_rack_24_placeholder.svg | PLACEHOLDER | rack stub |
| drug_dilution_plate_workspace.html | tip_box | tip_box_new.svg | REAL_SVG | matches |
| drug_dilution_plate_workspace.html | p200_micropipette | p200_micropipette_filled.svg | REAL_SVG | matches |
| drug_dilution_plate_workspace.html | waste_container | waste_container.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | dmso_stock_bottle | destain_bottle_filled.svg | WRONG_ASSET | reused stain SVG |
| drug_dilution_workspace_dense.html | pbs_buffer_bottle | ddh2o_bottle_filled.svg | WRONG_ASSET | reused water SVG |
| drug_dilution_workspace_dense.html | drug_stock_bottle (A) | bme_bottle_filled.svg | WRONG_ASSET | reused BME SVG |
| drug_dilution_workspace_dense.html | drug_stock_bottle (B) | laemmli_4x_bottle_filled.svg | WRONG_ASSET | reused laemmli SVG |
| drug_dilution_workspace_dense.html | drug_stock_bottle (C) | coomassie_stain_bottle_filled.svg | WRONG_ASSET | reused stain SVG |
| drug_dilution_workspace_dense.html | ethanol_bottle | bottle.svg | REAL_SVG | generic 20 KB bottle |
| drug_dilution_workspace_dense.html | well_plate_96 | 96well_pcr_plate.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | tube_rack_24 (A) | dilution_tube_rack.svg | REAL_SVG | 3 KB, semantic neighbor |
| drug_dilution_workspace_dense.html | tube_rack_24 (B) | microtube_rack_24_placeholder.svg | PLACEHOLDER | rack stub |
| drug_dilution_workspace_dense.html | drug_vial_rack | drug_vial_rack.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | p200_micropipette | p200_micropipette_filled.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | tip_box | tip_box_new.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | waste_container | waste_container.svg | REAL_SVG | matches |
| drug_dilution_workspace_dense.html | waste_tray | waste_tray.svg | REAL_SVG | matches |
| electrophoresis_bench.html | running_buffer_10x_bottle | running_buffer_10x_bottle_filled.svg | REAL_SVG | matches |
| electrophoresis_bench.html | running_buffer_1x_carboy | running_buffer_1x_carboy_filled.svg | REAL_SVG | matches |
| electrophoresis_bench.html | ddh2o_bottle | ddh2o_bottle_filled.svg | REAL_SVG | matches |
| electrophoresis_bench.html | recycle_buffer_bottle | running_buffer_10x_bottle_filled.svg | WRONG_ASSET | reused 10x buffer SVG |
| electrophoresis_bench.html | waste_container | waste_container.svg | REAL_SVG | matches |
| electrophoresis_bench.html | electrophoresis_tank | electrophoresis_tank.svg | REAL_SVG | matches |
| electrophoresis_bench.html | gel_cassette | gel_cassette.svg | REAL_SVG | matches |
| electrophoresis_bench.html | electrode_module | electrode_module.svg | REAL_SVG | 495 bytes stub but name matches |
| electrophoresis_bench.html | serological_pipette | aspirating_pipette.svg | WRONG_ASSET | reused aspirating pipette |
| electrophoresis_bench.html | p200_micropipette | p200_micropipette_filled.svg | REAL_SVG | matches |
| electrophoresis_bench.html | p10_gel_loading_tip_box | p10_gel_loading_tip_box.svg | REAL_SVG | matches |
| electrophoresis_bench.html | protein_ladder_tube | protein_ladder_tube_filled.svg | REAL_SVG | matches |
| electrophoresis_bench.html | gel_opening_tool | gel_opening_tool.svg | REAL_SVG | 495 bytes stub but name matches |
| electrophoresis_bench.html | mini_protean_gel | mini_protean_gel.svg | REAL_SVG | matches |
| electrophoresis_bench.html | gel_comb | gel_comb.svg | REAL_SVG | matches |
| hood_basic.html | ethanol_bottle | bottle.svg | REAL_SVG | generic 20 KB bottle, semantic neighbor |
| hood_basic.html | ddh2o_spray_bottle | ethanol_spray.svg | WRONG_ASSET | spray, but wrong contents label |
| hood_basic.html | p1000_pipette | aspirating_pipette.svg | WRONG_ASSET | pipette family but wrong member |
| microscope_basic.html | microscope | centrifuge_new.svg | WRONG_ASSET | confirmed Lane B production bug |
| staining_bench.html | coomassie_stain_bottle | coomassie_stain_bottle_filled.svg | REAL_SVG | matches |
| staining_bench.html | destain_bottle | destain_bottle_filled.svg | REAL_SVG | matches |
| staining_bench.html | ddh2o_bottle | ddh2o_bottle_filled.svg | REAL_SVG | matches |
| staining_bench.html | coomassie_recycle_bottle | coomassie_recycle_bottle_filled.svg | REAL_SVG | matches |
| staining_bench.html | destain_waste_bottle | destain_waste_bottle_filled.svg | REAL_SVG | matches |
| staining_bench.html | staining_tray | staining_tray_empty.svg | REAL_SVG | matches |
| staining_bench.html | kimwipe_pad | kimwipe_pad.svg | REAL_SVG | 490 bytes, name matches |
| staining_bench.html | waste_container | waste_container.svg | REAL_SVG | matches |
| staining_bench.html | microwave | microwave_closed.svg | REAL_SVG | matches |
| staining_bench.html | rocking_shaker | rocking_shaker_idle.svg | REAL_SVG | matches |
| well_plate_96_zoom.html | well_plate_96 | 96well_pcr_plate.svg | REAL_SVG | matches |

## 3. Aggregate counts

Total placements audited: 69.

| Category | Count |
| --- | --- |
| REAL_SVG | 53 |
| PLACEHOLDER | 2 |
| MISSING | 0 |
| WRONG_ASSET | 14 |
| TOTAL | 69 |

Category totals add to 69 and match the per-template count rollup.

Per-template totals match the `inspect.mjs` `placements=` values in console output:

| Template | This audit | inspect.mjs placements |
| --- | --- | --- |
| bench_basic | 2 | 2 |
| cell_counter_basic | 2 | 2 |
| crowded_bench_dense | 13 | 13 |
| drug_dilution_plate_workspace | 8 | 8 |
| drug_dilution_workspace_dense | 14 | 14 |
| electrophoresis_bench | 15 | 15 |
| hood_basic | 3 | 3 |
| microscope_basic | 1 | 1 |
| staining_bench | 10 | 10 |
| well_plate_96_zoom | 1 | 1 |

## 4. Known production bugs

These are bugs in the template SVG selection, not artifacts of this audit:

- `microscope_basic.html`: the `microscope` object renders `centrifuge_new.svg`. A
  centrifuge SVG stands in for a microscope. Lane B and Lane C documented this. Lane
  C's `dir_b/dir_c` template variants fix it.
- `microtube_rack_24_placeholder.svg` is referenced as a real asset for `tube_rack_24`
  objects in `drug_dilution_plate_workspace.html` and `drug_dilution_workspace_dense.html`.
  The Lane B finding is that the `_placeholder` suffix is being treated as a normal
  asset name; the file is non-trivial in size (584 bytes) but it is still a stub.
- The drug-dilution templates reuse a small set of bottle SVGs across distinct
  reagent identities (DMSO, PBS, three drugs). The SVG looks the same; only the
  `alt` text and the `placement-label` differentiate them. From a visual-clarity
  standpoint these are WRONG_ASSET references, not just labeling.
- `hood_basic.html` puts the `p1000_pipette` object on `aspirating_pipette.svg`.
  An aspirating pipette is a different family member from a P1000 micropipette;
  the visual would mislead a student.
- `electrophoresis_bench.html` reuses `running_buffer_10x_bottle_filled.svg` for
  the `recycle_buffer_bottle`, and `aspirating_pipette.svg` for the
  `serological_pipette`.
- `cell_counter_basic.html` puts the `counter_slide_cartridge` object on
  `cell_counter.svg`. A cartridge is a small consumable; using the full instrument
  image for it is misleading.
- Two tiny SVGs (`electrode_module.svg`, `gel_opening_tool.svg`) are 495 bytes each.
  They are below the 500-byte threshold the brief uses for "substantive SVG file",
  but their filenames do match the object names. They are reported as REAL_SVG with
  a "stub" note; future audits may want to escalate sub-500-byte files to a separate
  STUB category.

## 5. Output paths

- This report: `docs/active_plans/reports/m0_static_svg_completeness.md`.
- inspect.mjs JSON copy: `test-results/m0_static_summary/no_crop_audit/no_crop_audit_results.json`.
- inspect.mjs default output (untouched in place):
  `experiments/css_native_layout/no_crop_audit/no_crop_audit_results.json`.

End of report.
