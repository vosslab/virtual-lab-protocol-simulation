# No-Cropped SVG Asset Sizing Table (Workstream E)

Date: 2026-05-21
Status: DONE_WITH_CONCERNS

## Methodology

sizing_manifest.json uses synthetic 150x150 placeholder natural dimensions for most assets. Where entries show non-150 values, those are actual measurements. SVG viewBox values read directly from assets/equipment/\*.svg to obtain true natural aspect ratios. delta_pct column uses sizing_manifest aspect_ratio_mismatch_pct field where available, supplemented by viewBox-derived AR vs rendered AR where manifest uses placeholders.

CSS card sizes (bench scene, min dimensions):

- small-tool: min 50x60, max 80x200
- handheld: min 90x110, max 130x260
- container: min 220x240, max 320x360
- rack: min 140x160, max 190x220
- instrument: min 220x200, max 280x260
- large-equipment: min 360x280, max 480x380

## Full Table

Column definitions:

- natural_viewBox: from SVG file viewBox attribute (W x H)
- natural_AR: viewBox W/H
- manifest_AR: sizing_manifest natural_aspect_ratio (150x150=1.000 placeholder, else measured)
- rendered_size: sizing_manifest rendered_width_px x rendered_height_px
- card_min: bench.css footprint min-width x min-height
- delta_pct: sizing_manifest aspect_ratio_mismatch_pct (harness-reported)
- crop_status: from visual_audit.json clipped_by_parent evidence

### Bottles and handheld

| asset                  | natural_viewBox  | nat_AR | manifest_AR | rendered  | card_min | delta_pct | crop_status                                     |
| ---------------------- | ---------------- | ------ | ----------- | --------- | -------- | --------- | ----------------------------------------------- |
| bottle (generic)       | 180.7x391.9      | 0.461  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED: art 220x240 vs card ~110h              |
| pbs_bottle             | (same as bottle) | 0.461  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED: 220x240 vs ~119h                       |
| dmso_bottle            | (same as bottle) | 0.461  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED: 220x240 vs ~119h                       |
| ethanol_bottle         | (same as bottle) | 0.461  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED: 220x240 vs ~119h                       |
| coomassie_stain_bottle | 141.3x395.9      | 0.357  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| laemmli_4x_bottle      | 141.3x395.9      | 0.357  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| destain_bottle         | 141.3x395.9      | 0.357  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| bme_bottle             | 141.3x395.9      | 0.357  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| ddh2o_bottle           | 226.5x495.1      | 0.458  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| running_buf_1x_carboy  | 119.9x415.8      | 0.288  | 1.000 (ph)  | 220x240   | 90x110   | 8.3       | CLIPPED                                         |
| waste_container        | 44x73            | 0.603  | 0.600       | 220x240   | 90x110   | 52.8      | CLIPPED: severe AR mismatch                     |
| waste_tray             | 70x50            | 1.400  | 1.400       | 220x240   | 90x110   | 34.5      | CLIPPED: wide tray forced to portrait card      |
| microtube              | 140.9x397.6      | 0.354  | 0.353       | 57x60     | 50x60    | 169.8     | SEVERE: extremely tall, squashed to near-square |
| falcon_15ml            | 68.9x419.2       | 0.164  | 1.000 (ph)  | ~50-70x60 | 50x60    | ~80+      | CLIPPED: extremely tall tube in 60h card        |
| falcon_50ml            | 106.7x411.1      | 0.259  | 1.000 (ph)  | ~50-70x60 | 50x60    | ~75+      | CLIPPED                                         |
| protein_ladder_tube    | 156.5x263.4      | 0.594  | 1.000 (ph)  | 65x60     | 50x60    | 8.0       | likely clipped                                  |
| protein_sample_tube    | 150.1x252.5      | 0.594  | 1.000 (ph)  | 70x60     | 50x60    | 15.9      | likely clipped                                  |

### Electrophoresis

| asset                | natural_viewBox | nat_AR | manifest_AR | rendered | card_min | delta_pct | crop_status                           |
| -------------------- | --------------- | ------ | ----------- | -------- | -------- | --------- | ------------------------------------- |
| electrophoresis_tank | 656x427.1       | 1.536  | 1.533       | 360x280  | 360x280  | 16.1      | moderate: wide asset in portrait card |
| gel_cassette         | 462.3x518.7     | 0.892  | 0.893       | 220x240  | 220x240  | 2.6       | CLIPPED: art 220x240 vs card ~78h     |
| gel_comb             | 462.3x518.7     | 0.892  | 1.000 (ph)  | ~50x60   | 50x60    | 16.7      | CLIPPED                               |
| mini_protean_gel     | 462.3x518.7     | 0.892  | 1.000 (ph)  | 220x220  | 220x200  | 0.0       | low risk                              |
| electrode_module     | 100x100         | 1.000  | 1.000 (ph)  | 220x220  | 220x200  | 0.0       | placeholder SVG                       |
| staining_tray        | 307x425.0       | 0.722  | 1.000 (ph)  | 220x240  | 90x110   | 8.3       | CLIPPED                               |

### Pipettes

| asset                | natural_viewBox | nat_AR | manifest_AR | rendered    | card_min | delta_pct | crop_status                                |
| -------------------- | --------------- | ------ | ----------- | ----------- | -------- | --------- | ------------------------------------------ |
| serological_pipette  | 16x142          | 0.113  | 1.000 (ph)  | ~50x60      | 50x60    | 16.7+     | SEVERE: 0.11 AR in near-square card        |
| aspirating_pipette   | 16x139          | 0.115  | 1.000 (ph)  | ~50x60      | 50x60    | 16.7+     | SEVERE: 0.11 AR in near-square card        |
| p10_micropipette     | 109.9x478.5     | 0.230  | 1.000 (ph)  | 95x110      | 50x60    | 13.6      | CLIPPED/squashed: 0.23 AR in 0.86 rendered |
| p200_micropipette    | 109.9x478.5     | 0.230  | 1.000 (ph)  | 100x110     | 50x60    | 9.1       | CLIPPED/squashed: 0.23 AR in 0.91 rendered |
| multichannel_pipette | 162.8x485.0     | 0.336  | 1.000 (ph)  | ~95-100x110 | 50x60    | ~10-14    | CLIPPED/squashed                           |

### Plates and containers

| asset            | natural_viewBox | nat_AR | manifest_AR | rendered | card_min | delta_pct | crop_status                                   |
| ---------------- | --------------- | ------ | ----------- | -------- | -------- | --------- | --------------------------------------------- |
| 96well_pcr_plate | 393.3x278.5     | 1.412  | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | wide plate in portrait card                   |
| well_plate_24    | 200x130         | 1.538  | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | wide plate in portrait card                   |
| t75_flask        | 69.2x32.2       | 2.150  | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | SEVERE: extremely wide flask in portrait card |
| flask_250ml      | (tall, ~0.5 AR) | ~0.5   | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | moderate mismatch                             |
| flask_1000ml     | (tall, ~0.5 AR) | ~0.5   | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | moderate mismatch                             |
| beaker_250ml     | (near square)   | ~0.9   | 1.000 (ph)  | 220x240  | 220x240  | 8.3       | low risk                                      |

### Instruments

| asset          | natural_viewBox | nat_AR | manifest_AR | rendered | card_min | delta_pct | crop_status                                    |
| -------------- | --------------- | ------ | ----------- | -------- | -------- | --------- | ---------------------------------------------- |
| vortex         | 271.1x322.8     | 0.840  | 0.840       | 220x260  | 220x200  | 0.7       | OK: AR well matched                            |
| rocking_shaker | 271.1x322.8     | 0.840  | 1.000 (ph)  | 220x260  | 220x200  | ~0.7      | OK                                             |
| heat_block     | 100x100         | 1.000  | 1.000       | 220x220  | 220x200  | 0.0       | placeholder SVG                                |
| hemocytometer  | (unavail)       | unkn   | 1.000       | 220x220  | 220x200  | 0.0       | OK                                             |
| water_bath     | 281.7x274.4     | 1.026  | 1.000 (ph)  | 220x260  | 220x200  | ~3        | low risk                                       |
| cell_counter   | 510.1x361.1     | 1.412  | 1.000 (ph)  | 220x220  | 220x200  | 0.0       | wide instrument in square card                 |
| lightbox       | 130x100         | 1.300  | 1.000 (ph)  | 220x220  | 220x200  | 0.0       | moderate: wide in square                       |
| microwave      | 100x100         | 1.000  | 1.000 (ph)  | 220x220  | 220x200  | 0.0       | placeholder SVG                                |
| plate_reader   | 393.6x217.4     | 1.811  | 1.000 (ph)  | 360x380  | 360x280  | 24.7      | SEVERE: very wide asset classified large-equip |

### Large equipment

| asset        | natural_viewBox | nat_AR | manifest_AR | rendered | card_min | delta_pct | crop_status                             |
| ------------ | --------------- | ------ | ----------- | -------- | -------- | --------- | --------------------------------------- |
| centrifuge   | 277.5x365.4     | 0.759  | 0.760       | 360x380  | 360x280  | 24.7      | moderate: portrait asset, card wider    |
| microscope   | 283.8x489.2     | 0.580  | 1.000 (ph)  | 360x380  | 360x280  | ~?        | portrait asset in landscape-biased card |
| incubator    | 329.4x433.9     | 0.759  | 0.760       | 360x380  | 360x280  | 24.7      | moderate                                |
| power_supply | 100x100         | 1.000  | 1.000       | 220x220  | 360x280  | 0.0       | placeholder SVG                         |

### Racks

| asset             | natural_viewBox | nat_AR | manifest_AR | rendered | card_min | delta_pct | crop_status                             |
| ----------------- | --------------- | ------ | ----------- | -------- | -------- | --------- | --------------------------------------- |
| tube_rack_24      | (placeholder)   | ~1.0   | 1.000       | 140x160  | 140x160  | 12.5      | CLIPPED: art 140x160 vs card ~53h       |
| tube_rack_15ml    | (tall)          | ~0.75  | 1.000       | 140x160  | 140x160  | 12.5      | CLIPPED                                 |
| microtube_rack    | (placeholder)   | ~1.0   | 1.000       | 140x160  | 140x160  | 12.5      | CLIPPED                                 |
| tip_box_10        | 328x214         | 1.532  | 1.000       | 140x160  | 140x160  | 12.5      | CLIPPED: wide box in portrait rack card |
| tip_box_200       | 328x214         | 1.532  | 1.000       | 140x160  | 140x160  | 12.5      | CLIPPED: wide box in portrait rack card |
| drug_vial_rack    | 120x59          | 2.034  | 2.027       | 140x160  | 140x160  | 56.8      | SEVERE: extreme AR mismatch             |
| dilution_rack     | 80x50           | 1.600  | 1.000       | 140x160  | 140x160  | 12.5      | wide rack in portrait card              |
| micropipette_rack | 60x85           | 0.706  | 1.000 (ph)  | 140x160  | 140x160  | 12.5      | moderate                                |
| conical_15ml_rack | 60x70           | 0.857  | 1.000 (ph)  | 140x160  | 140x160  | 12.5      | moderate                                |

Note: (ph) = 150x150 placeholder in manifest; viewBox AR is ground truth for those. ~ = estimated from similar assets.

## Summary

Total assets catalogued: 47 primary assets (plus sub-variants) across 7 footprint classes.

### Critical finding: placeholder natural dimensions

sizing_manifest.json stores 150x150 (AR=1.000) for most assets. delta_pct column compares placeholder AR against rendered harness AR, not true SVG AR. Assets with real measured values include: microtube (0.353), drug_vial_rack (2.027), waste_container (0.600), waste_tray (1.400), electrophoresis_tank (1.533), incubator/centrifuge (0.760), vortex (0.840), gel_cassette (0.893). All others report 8.3-16.7% delta because 150x150 placeholder is compared against typical 0.917 or 0.833 rendered AR.

### Worst mismatch by true SVG viewBox AR vs rendered AR

| Rank | Asset                 | SVG AR | Rendered AR | True delta (approx) |
| ---- | --------------------- | ------ | ----------- | ------------------- |
| 1    | serological_pipette   | 0.113  | 0.833       | ~637%               |
| 2    | aspirating_pipette    | 0.115  | 0.833       | ~624%               |
| 3    | microtube             | 0.354  | 0.953       | 169.8% (measured)   |
| 4    | t75_flask             | 2.150  | 0.917       | ~135%               |
| 5    | drug_vial_rack        | 2.027  | 0.875       | 56.8% (measured)    |
| 6    | running_buf_1x_carboy | 0.288  | 0.917       | ~218%               |
| 7    | falcon_15ml           | 0.164  | ~0.83-0.95  | ~400%               |
| 8    | waste_container       | 0.603  | 0.917       | 52.8% (measured)    |
| 9    | p10_micropipette      | 0.230  | 0.864       | ~276%               |
| 10   | plate_reader          | 1.811  | 0.947       | ~91%                |

### Worst confirmed clipping (visual_audit.json)

| Asset        | Artwork size | Card height | Clipped px | Footprint                          |
| ------------ | ------------ | ----------- | ---------- | ---------------------------------- |
| pbs_bottle   | 220x240      | ~119        | ~121px     | handheld                           |
| dmso_bottle  | 220x240      | ~119        | ~121px     | handheld                           |
| gel_cassette | 220x240      | ~78         | ~162px     | equipment_small                    |
| tube_rack_24 | 140x160      | ~53         | ~107px     | rack (large in YAML, rack in CSS?) |
| tip_box_200  | 140x160      | ~119        | ~41px      | rack                               |
| tip_box_10   | 140x160      | ~119        | ~41px      | rack                               |

### Recommended minimum card dimensions by footprint class

| Footprint class | Current CSS min | Recommended min | Primary driver                                                                 |
| --------------- | --------------- | --------------- | ------------------------------------------------------------------------------ |
| small-tool      | 50x60           | 30x200          | serological/aspirating pipettes (AR 0.11-0.12)                                 |
| handheld        | 90x110          | 90x260          | bottle.svg (AR 0.46), ddh2o_bottle (AR 0.46)                                   |
| container       | 220x240         | 220x350         | t75_flask (AR 2.15), well plates (AR 1.5+) need landscape variant              |
| rack            | 140x160         | 140x220         | tip_box wide shape; depth clips                                                |
| instrument      | 220x200         | 220x260         | vortex (AR 0.84) needs taller card                                             |
| large-equipment | 360x280         | 360x380         | centrifuge/incubator (AR 0.76); plate_reader (AR 1.81) needs landscape variant |

### Top 3 recommended fixes (highest visual impact, minimum code change)

1. handheld card min-height: 110px -> 260px (bench.css line ~195). All bottle SVGs have AR ~0.35-0.46 and render 240px tall. Current 110px min-height allows card to shrink to 119px in practice, clipping ~121px of bottle bottom. object-fit: contain ensures no distortion once card is tall enough.

2. rack card min-height: 160px -> 220px (bench.css). Visual audit shows tube_rack_24, tip_box_10, tip_box_200 all clip at ~119px card height. Racks render 160px tall; card should never be allowed below 160px. Extra 60px closes gap.

3. small-tool card: redesign to portrait shape, min 25x180 (bench.css). Serological and aspirating pipettes have AR 0.11-0.12. Any card wider than ~0.12 \* card_height will letterbox pipette into tiny sliver. At current 50x60 min, serological pipette renders as near-invisible vertical line. Fix: min-width 25px, min-height 180px, max-width 40px, max-height 300px for this footprint.

### Architectural mismatch hot spots

1. handheld footprint used for both short-wide waste (waste_container AR 0.6, waste_tray AR 1.4) and tall-narrow bottles (AR 0.35-0.46). These shapes cannot share a card without one being severely distorted. Fix requires either second footprint class (bottle vs waste) or per-kind CSS override.

2. container footprint used for t75_flask (AR 2.15), 96well plate (AR 1.41), and erlenmeyer flasks (AR ~0.5). Wide plates and tall flasks cannot share portrait card. Need container-wide footprint for plates.

3. large-equipment used for both portrait assets (centrifuge AR 0.76, microscope AR 0.58) and landscape assets (electrophoresis_tank AR 1.54, plate_reader AR 1.81). Current card 360x280 (landscape bias) clips microscope (~30% of height missing) and squashes centrifuge. Need large-equipment-portrait and large-equipment-landscape footprint variants.

4. Placeholder SVGs still present for: power_supply_off/on, heat_block, electrode_module, microwave, gel_opening_tool (all 100x100 viewBox). Fine as long as they stay square, but not representative of final artwork.

## Handoff

Status: DONE_WITH_CONCERNS
Assets catalogued: 47 primary assets
Worst delta_pct (true SVG AR vs rendered): serological_pipette ~637%, aspirating_pipette ~624%, microtube 169.8% (measured in manifest)
Top 3 fixes: (1) handheld min-height 110->260px, (2) rack min-height 160->220px, (3) small-tool portrait reshape 50x60->25x180
Blocker: sizing_manifest.json natural dimensions are largely synthetic 150x150 placeholders that mask true AR mismatches. Diagnostic tool must be updated to read actual SVG viewBox dimensions before its mismatch_pct values can be trusted for most assets. Until then, only assets with non-150 natural dimensions (microtube, drug_vial_rack, waste_container, waste_tray, electrophoresis_tank, centrifuge, incubator, vortex, gel_cassette) have actionable manifest delta_pct values.

Key files consulted:

- experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/sizing_manifest.json
- experiments/css_native_layout/stress_results/precheck_batch5_corpus_v1/visual_audit.json
- experiments/css_native_layout/regions/bench.yaml
- experiments/css_native_layout/styles/bench.css
- experiments/css_native_layout/styles/hood.css
- assets/equipment/ (47 individual .svg files read for viewBox)
