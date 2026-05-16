# SDS-PAGE physical-scale companion

Text-only companion file capturing the per-object physical-scale class
proposed by the SDS-PAGE plan's "Object physical-scale convention" section.
The WP-0.3 schema-acceptance probe FAILED -- the object validator closes
its top-level key set and rejects `physical_scale`. See
`sdspage_inventory_lock.md` for the validator output. Per the plan, no
WP-1.x object YAML carries `physical_scale` or `approx_volume_ml`; this
file is the sole place that records the intended visual class so the
intent is not lost.

Format: `<object_name>: <class>`. Classes are
`tiny | small | medium | large | bench` per the plan's table.

## Tiny (cursor-scale or cursor-attachable)

- gel_comb: tiny
- kimwipe_pad: tiny
- p10_gel_loading_tip: tiny
- gel_opening_tool: tiny

## Small (single-slot bench item)

- eppendorf_tube: small
- protein_sample_tube: small
- protein_ladder_tube: small
- laemmli_4x_bottle: small
- bme_bottle: small

## Medium (visible bench footprint)

- coomassie_stain_bottle: medium
- destain_bottle: medium
- ddh2o_bottle: medium
- running_buffer_10x_bottle: medium
- coomassie_recycle_bottle: medium
- destain_waste_bottle: medium
- recycle_buffer_bottle: medium
- p10_gel_loading_tip_box: medium
- p10_micropipette: medium
- micropipette: medium
- eppendorf_rack_24: medium
- mini_protean_gel: medium
- gel_cassette: medium

## Large (multi-slot footprint)

- running_buffer_1x_carboy: large
- staining_tray: large
- electrode_module: large

## Bench (anchored equipment)

- electrophoresis_tank: bench
- power_supply: bench
- microwave: bench
- rocking_shaker: bench
- heat_block: bench
- lightbox: bench
