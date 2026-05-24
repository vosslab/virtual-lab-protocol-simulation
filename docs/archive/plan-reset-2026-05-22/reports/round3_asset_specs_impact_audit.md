# Round 3 ASSET_SPECS impact audit (B2)

Read-only audit. Date: 2026-05-22. Scope: per-object `default_width`
declared in `generated/object_data.ts` (the current home of the source
data the plan calls "ASSET_SPECS"; the legacy `src/asset_specs.ts`
referenced by the Round-2 audit no longer exists).

## What changed since the prior audit

The Round-2 audit
([no_crop_asset_specs_coverage.md](../audits/no_crop_asset_specs_coverage.md))
inspected `src/asset_specs.ts` (HEAD 8795d25). That file was retired
and the per-asset baseline width now lives as
`layout.default_width` on each entry inside
`OBJECT_CATALOG` in `object_data.ts` (generated at build time).
This audit reads the current generated file (mtime 2026-05-21 14:59).
The precheck JSON used for cross-reference
(no_crop_audit_results.json,
mtime 2026-05-21 23:08, generated_at 2026-05-20T21:51:15Z) is newer
than the object data, so its violation counts reflect the current
`default_width` values.

## Methodology

1. Parse every entry in `OBJECT_CATALOG` and extract `kind`, `label`,
   `layout.default_width`, and the candidate `asset_name` keys from
   `visual_states`.
2. Parse `viewBox` from every SVG in `assets/equipment/`. Compute
   `aspect = svgW / svgH` and `box_h_pct = default_width / aspect`,
   the implied scene-percent height of the placement card when the
   declared width is honored. The same scaling identity used by the
   Round-2 audit.
3. Group by `kind` (bottle, pipette, plate, rack, equipment, waste,
   flask, decoration) and compute the in-kind min, median, and max
   `default_width` to derive a sibling-comparison range per category.
4. Aggregate violations from `no_crop_audit_results.json` by
   `object_name` and `issue_type` (`off-card`, `cropped`, `too-small`).
   The precheck covers 10 scenes and 45 violations across 29 distinct
   objects, so this is partial-corpus evidence, not whole-repo.
5. Priority score per object: precheck violation count is the
   dominant signal. Ties broken by `scenes_affected`, then by
   distance from the in-kind median `default_width`. Objects with
   precheck evidence rank ahead of sibling-only suspects.

The precheck cross-reference is available and was used.

## Category sibling ranges (current values)

Derived from the 78 objects in the current `OBJECT_CATALOG`.

| kind       | count | min  | median | max  | typical aspect | notes                                                        |
| ---------- | ----- | ---- | ------ | ---- | -------------- | ------------------------------------------------------------ |
| bottle     | 30    | 2.0  | 3.0    | 4.0  | 0.36 - 0.46    | dominant width is 3; only the 1x carboy uses 4               |
| pipette    | 7     | 2.0  | 2.0    | 6.0  | 0.11 - 0.34    | tall, narrow assets; multichannel is wider                   |
| plate      | 1     | 14.0 | 14.0   | 14.0 | 1.41           | single entry (well_plate_96)                                 |
| rack       | 4     | 8.0  | 9.0    | 10.0 | 0.35 - varies  | placeholders dominate                                        |
| equipment  | 22    | 2.0  | 17.0   | 50.0 | 0.65 - 1.81    | hood_surface is the 50 outlier (background)                  |
| waste      | 4     | 4.0  | 4.0    | 4.0  | 0.60           | uniform                                                      |
| flask      | 2     | 12.0 | 12.0   | 12.0 | 2.15 (servier) | wide variant SVG (aspect 2.15) vs legacy/v2/v3 (aspect 0.61) |
| decoration | 7     | 1.0  | 6.0    | 10.0 | varies         | mixed                                                        |

Suspicious patterns visible from the sibling sweep alone:

- Every `bottle` is 2.0 or 3.0 except the 1x carboy at 4.0 and the
  mtt_solution_bottle at 4.0. With tall bottle aspects (`~0.36-0.46`)
  this yields card heights of only `5.3-8.7 %` of scene height. The
  Round-2 audit's `media_bottle` was `8`, `trypsin_bottle` was `7`,
  and even narrow `ethanol_bottle` was `5`. The current corpus has
  uniformly shrunk bottles, which is the simplest explanation for a
  surge in bottle `off-card` violations (10 of the 45 precheck
  violations are bottle `off-card`).
- Two `equipment` entries are 2.0: `gel_opening_tool`. This is a
  hand tool, so 2 may be legitimate, but it sits two orders of
  magnitude below the equipment median (17) so it is at least worth
  a sibling-comparison flag.
- `pipette` entries split into a tall-thin cluster (def_w 2-3,
  aspect 0.11-0.34) and `multichannel_pipette` (def_w 6,
  aspect 0.336). The narrow pipettes survive aspect-wise (tall
  cards) but become brittle to any parent height cap; same finding
  as Round-2.
- `hood_surface` at `default_width: 50` is the scene background
  and is intentionally large; not a suspect.

## Total objects flagged

| bucket                                                    | count |
| --------------------------------------------------------- | ----- |
| objects with at least one precheck violation              | 21    |
| sibling-only suspects (no precheck hit but anomalous dw)  | 6     |
| **total flagged**                                         | **27**|
| objects with `default_width` missing or zero              | 0     |
| precheck object_names with no current OBJECT_CATALOG row  | 8     |

The 8 precheck names with no current catalog row
(`stock_bottle`, `drug_stock_bottle`, `tip_box`,
`dmso_stock_bottle`, `pbs_buffer_bottle`, `drug_vial_rack`,
`waste_tray`, `ddh2o_spray_bottle`, `p1000_pipette` -- 9 listed,
one was a recount) are scene-side placement names that no longer
resolve to an object in `OBJECT_CATALOG`. They are reported here as
data-layer informational findings; they do not have a current
`default_width` to fix.

## Top-priority list

Ten entries, ordered by precheck violation count. Each row carries
object_name, current `default_width`, suspected correct range
(derived from the Round-2 audit's `box_h_pct` discipline and the
in-kind sibling sweep), evidence, and a recommended value.

| rank | object_name              | current dw | suspected correct range | evidence (precheck hits, scenes, aspect)             | recommended dw | rationale                                                                                                                                                |
| ---- | ------------------------ | ---------- | ----------------------- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | p200_micropipette        | 2.0        | 4 - 6                   | 4 off-card violations across 4 scenes; aspect 0.230  | 5              | Tall narrow pipette. Round-2 audit accepted def_w 3 only with a `TINY_W TALL_ASSET` flag. At dw 2 the card is too narrow and the asset overhangs.        |
| 2    | ddh2o_bottle             | 3.0        | 5 - 7                   | 3 off-card violations across 3 scenes; aspect 0.457  | 6              | Tall bottle (aspect 0.46). Round-2 had `pbs_bottle` / `sterile_water` at dw 7 with box_h_pct 15. dw 3 -> box_h_pct 6.5; bottle visibly overhangs the card.|
| 3    | coomassie_stain_bottle   | 3.0        | 5 - 7                   | 2 off-card; aspect 0.357                             | 5              | Even taller aspect than ddh2o_bottle. Recommend the bottle-class minimum of 5 to clear the precheck off-card threshold.                                  |
| 4    | destain_bottle           | 3.0        | 5 - 7                   | 2 off-card; aspect 0.357                             | 5              | Same SVG family as coomassie_stain_bottle (aspect 0.357). Match its value.                                                                               |
| 5    | coomassie_recycle_bottle | 3.0        | 5 - 7                   | 2 off-card; aspect 0.357                             | 5              | Same SVG family; same fix.                                                                                                                               |
| 6    | destain_waste_bottle     | 3.0        | 5 - 7                   | 2 off-card; aspect 0.357                             | 5              | Same SVG family; same fix.                                                                                                                               |
| 7    | ethanol_bottle           | 3.0        | 5 - 7                   | 1 off-card + 1 cropped across 2 scenes; aspect 0.461 | 5              | Round-2 audit treated dw 5 as the floor (`borderline (narrow bottle)`). Current dw 3 is below floor; the new precheck shows a `cropped` issue.            |
| 8    | kimwipe_pad              | 3.0        | 5 - 8                   | 2 too-small across 2 scenes                          | 6              | Decoration; sibling decorations cluster at 4-10. `too-small` means the rendered image is < 9 % of card area. dw 6 lifts area proportionally.             |
| 9    | bme_bottle               | 3.0        | 5 - 7                   | 1 off-card; aspect 0.359                             | 5              | Same SVG family as coomassie/destain bottles (aspect 0.357 cluster). Match.                                                                              |
| 10   | laemmli_4x_bottle        | 3.0        | 5 - 7                   | 1 off-card; aspect 0.357                             | 5              | Same SVG family; same fix. Tail of the same bottle-cluster regression.                                                                                   |

## Secondary list (precheck-positive but lower count)

These are real precheck violations but each appears in only one
scene; surfaced for completeness so D2 can sweep cluster fixes.

| object_name               | current dw | precheck signal       | recommended dw | rationale                                                              |
| ------------------------- | ---------- | --------------------- | -------------- | ---------------------------------------------------------------------- |
| running_buffer_10x_bottle | 3.0        | 1 off-card (a 0.357)  | 5              | Same SVG cluster as items 3-6, 9-10.                                   |
| running_buffer_1x_carboy  | 4.0        | 1 off-card (a 0.288)  | 6              | Taller and narrower than 10x bottle; current 4 already above family.   |
| recycle_buffer_bottle     | 3.0        | 1 off-card (a 0.357)  | 5              | Same SVG cluster.                                                      |
| counter_slide_cartridge   | 8.0        | 1 too-small           | 10             | Rack-class; sibling racks cluster at 8-10. Bump to 10 for area.        |
| cell_counter              | 22.0       | 1 too-small           | 22 (keep)      | Likely a parent-card sizing issue, not a `default_width` issue. NO data-layer fix recommended; flag for B3 / scene layer. |
| p10_gel_loading_tip_box   | 8.0        | 1 too-small           | 10             | Decoration; sibling tip-boxes warrant ~10 for area.                    |
| protein_ladder_tube       | 2.0        | 1 off-card (a 0.603)  | 3              | Bottle-class minimum; aspect more forgiving than 0.36 cluster.         |
| gel_opening_tool          | 2.0        | 1 too-small           | 2 (keep)       | Hand tool; sibling comparison says small is correct. NO data-layer fix recommended.                                       |
| gel_comb                  | 8.0        | 1 too-small           | 10             | Equipment placeholder; bump within sibling range.                      |
| microscope                | 16.0       | 1 too-small           | 16 (keep)      | Equipment median 17; current value is in-band. NO data-layer fix recommended; investigate scene-side card.                |

## Sibling-only suspects (no precheck row, but anomalous default_width)

These are not present in the precheck snapshot. They are flagged
purely on sibling-comparison evidence and are lower priority than
any item above.

| object_name           | kind   | current dw | sibling range | concern                                                                            |
| --------------------- | ------ | ---------- | ------------- | ---------------------------------------------------------------------------------- |
| microtube             | bottle | 2.0        | 2 - 4         | Aspect 0.354; dw 2 -> box_h_pct 5.64. Below the bottle-class floor.                |
| mtt_vial              | bottle | 2.0        | 2 - 4         | Aspect 0.377; same shape. Likely brittle in bench placements.                      |
| protein_sample_tube   | bottle | 2.0        | 2 - 4         | Aspect 0.594; less brittle, but at the floor of the kind.                          |
| label_pen             | pipette| 2.0        | 2 - 6         | Decoration-as-pipette; small value plausible but flag for sibling sweep.           |
| t75_flask             | flask  | 12.0       | 12 only       | Aspect 2.153 on servier-wide SVG; legacy variant is aspect 0.61. Selection mismatch persists from Round-2 audit. |
| t75_flask_new         | flask  | 12.0       | 12 only       | Same selection-mismatch concern as t75_flask.                                      |

## Limitations

- Precheck JSON covers 10 scenes and 45 violations. It is partial
  corpus, not whole repo. Round-3 plan B3 should expand the precheck
  corpus or pair this audit with a scene-by-scene sweep before D2
  applies fixes.
- Eight precheck violations refer to placement names not present
  in `OBJECT_CATALOG`. They are not data-layer findings; they are
  evidence of object-name drift between scene YAML and the catalog.
- Recommended values are derived from the Round-2 audit's
  scene-percent `box_h_pct` rationale and the in-kind sibling range,
  not from a re-run of the precheck against patched values. D2's
  first ASSET_SPECS fix experiment is the place to validate one of
  these recommendations end to end.

## Files read

- `object_data.ts` (generated at build time)
- [no_crop_asset_specs_coverage.md](../audits/no_crop_asset_specs_coverage.md)
- no_crop_audit_results.json
- 125 SVGs in assets/equipment/ (viewBox only)
