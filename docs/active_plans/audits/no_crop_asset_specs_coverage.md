# ASSET_SPECS coverage audit (no-crop chain, step 3)

Read-only audit. HEAD: 8795d25. Date: 2026-05-21.

Cross-checks `src/asset_specs.ts` against `assets/equipment/*.svg`. Per
`docs/specs/SCALING_MODEL.md`, the visual width comes from
`display_width_cm * px_per_cm`, scaled by `width_scale` whose denominator is
`default_width * px_per_scene_percent` (11.52). `ASSET_SPECS.defaultWidth` is
the per-asset baseline width in scene percent. Visual height is `defaultWidth
/ aspect`, where `aspect = svg.viewBox.width / svg.viewBox.height`. A
`defaultWidth` that is too small for a tall asset compresses the placement
card vertically and is a likely crop source under any `overflow: hidden`
parent.

## Summary counts

| metric                                  | count |
| --------------------------------------- | ----- |
| total SVGs in `assets/equipment/`       | 125   |
| total ASSET_SPECS entries               | 31    |
| ASSET_SPECS entries with a matched SVG  | 31    |
| ASSET_SPECS entries with no matched SVG | 0     |
| orphan SVGs (no ASSET_SPECS entry)      | 100   |
| suspect ASSET_SPECS entries             | 4     |

## ASSET_SPECS source

`src/asset_specs.ts` lines 12 to 45 define 31 entries. Schema:
`{ defaultWidth, labelWidth, anchorYOffset?, widthScale? }`. No `defaultWidth`
unit comment is present in the file; the value is "baseline width in scene %"
per the header comment.

## ASSET_SPECS to SVG resolution

A few specs do not match their SVG basename one-to-one. Resolution used in
this audit:

| spec name (line)        | resolves to SVG        | rule                      |
| ----------------------- | ---------------------- | ------------------------- |
| flask (L13)             | t75_flask.svg          | implicit prefix mapping   |
| well_plate (L14)        | well_plate_24.svg      | implicit suffix expansion |
| well_plate_96 (L15)     | 96well_pcr_plate.svg   | rename                    |
| media_bottle (L16)      | bottle_medium_pink.svg | facade alias              |
| trypsin_bottle (L17)    | bottle.svg             | generic-bottle reuse      |
| ethanol_bottle (L18)    | bottle.svg             | generic-bottle reuse      |
| sterile_water (L24)     | bottle.svg             | generic-bottle reuse      |
| pbs_bottle (L25)        | bottle.svg             | generic-bottle reuse      |
| dmso_bottle (L29)       | bottle.svg             | generic-bottle reuse      |
| carboplatin_stock (L30) | bottle.svg             | generic-bottle reuse      |
| metformin_stock (L31)   | bottle.svg             | generic-bottle reuse      |
| drug_vials (L22)        | drug_vial_rack.svg     | implicit rename           |

Note: the live mapping is performed at runtime via
`src/scene_runtime/render/svg_loader.ts` which converts asset name to
`SVG_<UPPER>` exports, plus content-side YAML choosing the actual SVG. The
audit treats these by best-effort name lookup. The single name resolution
inside the runtime is the loader's `SVG_<assetName>` lookup, so a spec key
like `flask` would not find `SVG_FLASK` unless an aliasing step also exists
in the renderer; this is itself a finding (see Cross-layer name drift,
below).

## Per-spec cross-check table

Aspect = svgW / svgH. box_h_pct = defaultWidth / aspect (the implied scene-%
height of the placement card if width is honored). Lower box_h_pct on a tall
asset implies a tall asset crammed into a short card.

| spec (line)                | def_w | svgW  | svgH  | aspect | box_h_pct | svg used             | flag                                    |
| -------------------------- | ----- | ----- | ----- | ------ | --------- | -------------------- | --------------------------------------- |
| flask (L13)                | 12    | 69.2  | 32.2  | 2.153  | 5.57      | t75_flask            | (uses servier-style wide v5; see below) |
| well_plate (L14)           | 14    | 200.0 | 130.0 | 1.538  | 9.10      | well_plate_24        | OK                                      |
| well_plate_96 (L15)        | 14    | 393.3 | 278.5 | 1.412  | 9.91      | 96well_pcr_plate     | OK                                      |
| media_bottle (L16)         | 8     | 176.9 | 387.6 | 0.456  | 17.53     | bottle_medium_pink   | OK                                      |
| trypsin_bottle (L17)       | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| ethanol_bottle (L18)       | 5     | 180.7 | 391.9 | 0.461  | 10.85     | bottle               | borderline (narrow bottle)              |
| serological_pipette (L19)  | 3     | 16.0  | 142.0 | 0.113  | 26.62     | serological_pipette  | TINY_W TALL_ASSET                       |
| aspirating_pipette (L20)   | 3     | 16.0  | 139.0 | 0.115  | 26.06     | aspirating_pipette   | TINY_W TALL_ASSET                       |
| multichannel_pipette (L21) | 5     | 162.8 | 485.0 | 0.336  | 14.90     | multichannel_pipette | PIPETTE_SHORT                           |
| drug_vials (L22)           | 14    | 120.0 | 59.0  | 2.034  | 6.88      | drug_vial_rack       | OK                                      |
| waste_container (L23)      | 7     | 44.0  | 73.0  | 0.603  | 11.61     | waste_container      | OK                                      |
| sterile_water (L24)        | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| pbs_bottle (L25)           | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| conical_15ml_rack (L26)    | 8     | 60.0  | 70.0  | 0.857  | 9.33      | conical_15ml_rack    | OK (placeholder geometry)               |
| dilution_tube_rack (L27)   | 9     | 80.0  | 50.0  | 1.600  | 5.62      | dilution_tube_rack   | OK (placeholder)                        |
| mtt_vial (L28)             | 6     | 102.1 | 270.7 | 0.377  | 15.91     | mtt_vial             | OK                                      |
| dmso_bottle (L29)          | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| carboplatin_stock (L30)    | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| metformin_stock (L31)      | 7     | 180.7 | 391.9 | 0.461  | 15.18     | bottle               | OK                                      |
| micropipette_rack (L32)    | 8     | 60.0  | 85.0  | 0.706  | 11.33     | micropipette_rack    | PIPETTE_SHORT (placeholder geometry)    |
| biohazard_decant (L33)     | 7     | 50.0  | 70.0  | 0.714  | 9.80      | biohazard_decant     | OK (placeholder)                        |
| centrifuge (L34)           | 14    | 277.5 | 365.4 | 0.759  | 18.44     | centrifuge           | OK                                      |
| water_bath (L35)           | 16    | 281.7 | 274.4 | 1.026  | 15.59     | water_bath           | OK                                      |
| incubator (L36)            | 10    | 329.4 | 433.9 | 0.759  | 13.17     | incubator            | OK                                      |
| plate_reader (L37)         | 12    | 393.6 | 217.4 | 1.811  | 6.63      | plate_reader         | OK                                      |
| cell_counter (L38)         | 12    | 510.1 | 361.1 | 1.413  | 8.49      | cell_counter         | OK                                      |
| microscope (L39)           | 8     | 283.8 | 489.2 | 0.580  | 13.79     | microscope           | OK                                      |
| vortex (L40)               | 8     | 271.1 | 322.8 | 0.840  | 9.53      | vortex               | OK                                      |
| tip_box (L42)              | 9     | 328.0 | 214.1 | 1.532  | 5.87      | tip_box              | OK                                      |
| glove_box (L43)            | 10    | 60.0  | 70.0  | 0.857  | 11.67     | glove_box            | OK (placeholder)                        |
| waste_tray (L44)           | 12    | 70.0  | 50.0  | 1.400  | 8.57      | waste_tray           | OK                                      |

## Suspect ASSET_SPECS entries (likely crop sources)

These four entries are the top candidates for crops, ordered by severity.
"Crop risk" is the gap between the asset's natural aspect (very tall) and
the scene-% height the spec produces.

| rank | spec (line)                | def_w | aspect | implied box_h | crop risk                                                                                                                                                                                                                                                                                                                             |
| ---- | -------------------------- | ----- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | serological_pipette (L19)  | 3     | 0.113  | 26.62 %       | very tall card; if any parent has fixed height < 26 %, the tip clips. A 3 % wide column on a 1280px viewport is ~35 px; the pipette is fine in absolute terms but unforgiving of parent height caps.                                                                                                                                  |
| 2    | aspirating_pipette (L20)   | 3     | 0.115  | 26.06 %       | same shape as serological; same crop sensitivity.                                                                                                                                                                                                                                                                                     |
| 3    | multichannel_pipette (L21) | 5     | 0.336  | 14.90 %       | needs ~15 % vertical space; common in benchtop placements; check parent card height.                                                                                                                                                                                                                                                  |
| 4    | flask (L13)                | 12    | 2.153  | 5.57 %        | t75_flask.svg is the v5/servier wide shape (293 x 92, aspect 3.17); legacy/v2/v3 are 0.61 aspect. If the rendered flask uses a tall variant via runtime selection, the 5.57 % implied height is wrong (would need def_w ~ 12 and aspect 0.61 -> box_h_pct ~ 19.7). Selection-vs-spec mismatch is the crop cause to investigate first. |

Honorable mentions (not flagged but worth a glance):

- `ethanol_bottle` (L18) at def_w 5 on the shared bottle asset (aspect 0.461)
  yields box_h_pct 10.85, the narrowest bottle in the set. Visually thin
  bottle, but no crop unless cards are width-cropped.
- `mtt_vial` (L28) at def_w 6 needs 15.9 % vertical; verify bench placements
  do not cap height.

## Orphan SVGs (no ASSET_SPECS entry)

100 SVGs in `assets/equipment/` have no entry in ASSET_SPECS. Categories:

- variant-suffixed forms expected by liquid overlays or A/B asset choice
  (`_empty`, `_filled`, `_old`, `_new`, `_legacy`, `_v2`-`_v5`, `_servier`).
  These are not expected to need their own spec rows if the rendered name
  matches an existing spec key.
- gel / Western blot domain (`gel_cassette`, `gel_comb`, `mini_protean_gel`,
  `staining_tray_*`, `electrophoresis_tank*`, `power_supply_*`,
  `protein_ladder_*`, `protein_sample_*`, `running_buffer_*`,
  `recycle_buffer_*`, `coomassie_*`, `destain_*`, `ddh2o_*`,
  `laemmli_4x_*`, `bme_bottle*`, `falcon_15ml`, `falcon_50ml*`,
  `heat_block_*`, `microwave_*`, `rocking_shaker_*`, `lightbox_*`,
  `microtube*`, `kimwipe_pad`, `ethanol_spray`, `p10_*`, `p200_*`).
  These belong to gel-electrophoresis content. If those scenes render
  through ASSET_SPECS, every kind needs a spec row; if they render via a
  different metric path, this is informational only.
- placeholders (`_placeholder.svg`, `microtube_rack_24_placeholder.svg`,
  `angry_professor.svg`) and small icons (`electrode_module`,
  `gel_opening_tool`, `heat_block_*`, `microwave_*`, `power_supply_*`,
  `lightbox_*`, `kimwipe_pad`).

Full orphan list (basename, viewBox, aspect):

```
_placeholder                            100.0x100.0   1.000
angry_professor                         200.0x200.0   1.000
bme_bottle                              143.0x398.1   0.359
bme_bottle_empty                        141.3x395.9   0.357
bme_bottle_filled                       141.3x395.9   0.357
cell_counter_new                        510.1x361.1   1.413
cell_counter_old                        60.0x70.0     0.857
centrifuge_new                          277.5x365.4   0.759
coomassie_recycle_bottle                141.3x395.9   0.357
coomassie_recycle_bottle_empty          141.3x395.9   0.357
coomassie_recycle_bottle_filled         141.3x395.9   0.357
coomassie_stain_bottle                  141.3x395.9   0.357
coomassie_stain_bottle_empty            141.3x395.9   0.357
coomassie_stain_bottle_filled           141.3x395.9   0.357
ddh2o_bottle                            226.5x495.1   0.457
ddh2o_bottle_empty                      226.5x495.1   0.457
ddh2o_bottle_filled                     226.5x495.1   0.457
destain_bottle                          141.3x395.9   0.357
destain_bottle_empty                    141.3x395.9   0.357
destain_bottle_filled                   141.3x395.9   0.357
destain_waste_bottle                    141.3x395.9   0.357
destain_waste_bottle_empty              141.3x395.9   0.357
destain_waste_bottle_filled             141.3x395.9   0.357
electrode_module                        100.0x100.0   1.000
electrophoresis_tank                    656.0x427.1   1.536
electrophoresis_tank_inner_chamber      74.0x114.0    0.649
electrophoresis_tank_outer_chamber      114.0x99.0    1.152
ethanol_spray                           25.0x73.0     0.342
falcon_15ml                             68.9x419.2    0.164
falcon_50ml                             106.7x411.1   0.260
falcon_50ml_new                         106.2x410.9   0.259
gel_cassette                            462.3x518.7   0.891
gel_comb                                462.3x518.7   0.891
gel_opening_tool                        100.0x100.0   1.000
heat_block_closed                       100.0x100.0   1.000
heat_block_open                         100.0x100.0   1.000
incubator_legacy                        329.4x433.9   0.759
incubator_new                           329.4x433.9   0.759
kimwipe_pad                             100.0x100.0   1.000
laemmli_4x_bottle                       141.3x395.9   0.357
laemmli_4x_bottle_empty                 141.3x395.9   0.357
laemmli_4x_bottle_filled                141.3x395.9   0.357
lightbox_off                            100.0x100.0   1.000
lightbox_on                             130.0x100.0   1.300
microscope_new                          283.8x489.2   0.580
microscope_old                          283.8x489.2   0.580
microtube                               140.9x397.6   0.354
microtube_empty                         137.0x393.3   0.348
microtube_filled                        150.2x252.5   0.595
microtube_open_translucent              137.0x393.3   0.348
microtube_rack_24_placeholder           100.0x100.0   1.000
microwave_closed                        100.0x100.0   1.000
microwave_open                          100.0x100.0   1.000
mini_protean_gel                        462.3x518.7   0.891
multichannel_pipette_new                161.0x482.8   0.333
multichannel_pipette_old                24.0x116.5    0.206
p10_gel_loading_tip                     38.8x433.4    0.089
p10_gel_loading_tip_box                 328.0x214.1   1.532
p10_micropipette_empty                  109.9x478.5   0.230
p10_micropipette_filled                 109.9x478.5   0.230
p200_micropipette_empty                 109.9x478.5   0.230
p200_micropipette_filled                109.9x478.5   0.230
plate_reader_new                        393.6x217.4   1.811
plate_reader_old                        393.6x217.4   1.811
power_supply_off                        100.0x100.0   1.000
power_supply_on                         100.0x100.0   1.000
protein_ladder_tube                     161.4x267.5   0.603
protein_ladder_tube_empty               156.5x263.4   0.594
protein_ladder_tube_filled              156.5x263.4   0.594
protein_sample_tube                     150.1x252.5   0.594
protein_sample_tube_empty               150.1x252.5   0.594
protein_sample_tube_filled              150.1x252.5   0.594
recycle_buffer_bottle                   141.3x395.9   0.357
recycle_buffer_bottle_empty             141.3x395.9   0.357
recycle_buffer_bottle_filled            141.3x395.9   0.357
rocking_shaker_idle                     271.1x322.8   0.840
rocking_shaker_running                  271.1x322.8   0.840
running_buffer_10x_bottle               141.3x395.9   0.357
running_buffer_10x_bottle_empty         141.3x395.9   0.357
running_buffer_10x_bottle_filled        141.3x395.9   0.357
running_buffer_1x_carboy                119.9x415.8   0.288
running_buffer_1x_carboy_empty          117.9x413.6   0.285
running_buffer_1x_carboy_filled         117.9x413.6   0.285
staining_tray_buffer                    307.0x425.0   0.722
staining_tray_destain                   307.0x425.0   0.722
staining_tray_empty                     307.0x425.0   0.722
staining_tray_stain                     307.0x425.0   0.722
staining_tray_water                     307.0x425.0   0.722
t75_flask_legacy                        102.0x166.0   0.614
t75_flask_servier                       293.1x92.4    3.172
t75_flask_v2                            102.0x166.0   0.614
t75_flask_v3                            102.0x166.0   0.614
t75_flask_v4                            140.0x230.0   0.609
t75_flask_v5                            293.1x92.4    3.172
tip_box_new                             328.0x214.1   1.532
tip_box_old                             60.0x70.0     0.857
vortex_new                              271.1x322.8   0.840
vortex_old                              271.1x322.8   0.840
water_bath_new                          281.7x274.4   1.026
water_bath_old                          281.7x274.4   1.026
```

## Orphan ASSET_SPECS entries (no matched SVG)

None. All 31 entries match an SVG basename or a documented alias.

## Cross-layer name drift (informational)

`src/scene_runtime/render/svg_loader.ts` resolves `assetName` to
`SVG_<UPPER(assetName)>` by direct mapping. For spec keys that are not
identical to SVG basenames (`flask`, `well_plate`, `media_bottle`,
`drug_vials`, and the seven generic-bottle aliases), there must be a
separate redirection layer or the runtime lookup must use a different name
than the spec key. The audit could not locate that redirection in the read
files; if it lives outside the loader (likely in the YAML object kind
mapping under `content/objects/`), confirm before treating the `flask`-vs-
`t75_flask` shape as a crop concern.

## Files read

- `docs/specs/SCALING_MODEL.md`
- `docs/specs/SVG_PIPELINE.md`
- `src/asset_specs.ts`
- `src/scene_runtime/render/svg_loader.ts`
- `pipeline/generate_svg_globals.py`
- 125 SVGs in `assets/equipment/` (viewBox attribute only)

## Top 5 crop suspects

1. `flask` (L13, def_w 12, aspect 2.153 on servier-style SVG) - shape
   mismatch with legacy/v2/v3/v4 tall variants (aspect ~0.61). If runtime
   picks a tall variant, the 5.6 % implied height is wrong.
2. `serological_pipette` (L19, def_w 3, aspect 0.113) - 26.6 % implied
   card height. Crops if any pipette parent caps height below that.
3. `aspirating_pipette` (L20, def_w 3, aspect 0.115) - same shape as
   serological; 26 % implied height.
4. `multichannel_pipette` (L21, def_w 5, aspect 0.336) - 14.9 % implied
   height; benchtop placements with tight rows clip the tip.
5. `mtt_vial` (L28, def_w 6, aspect 0.377) - 15.9 % implied height; small
   tube that needs vertical room.
