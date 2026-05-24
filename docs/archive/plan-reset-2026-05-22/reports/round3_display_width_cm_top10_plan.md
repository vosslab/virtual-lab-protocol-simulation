# Round 3 display_width_cm top 10 plan (B3)

Read-only plan. Date: 2026-05-22. Status: planning, gated by B2
([round3_asset_specs_impact_audit.md](round3_asset_specs_impact_audit.md))
which has landed. No edits applied in this workstream.

## Context

Round 3 Batch B3 was originally scoped as a "display_width_cm top 10
candidates plan" on the assumption that authored YAML carries a
`layout.display_width_cm` field distinct from `layout.default_width`.
B2 already found ASSET_SPECS does not live where the plan assumed
(`generated/object_data.ts` source, not the retired
`src/asset_specs.ts`). This B3 audit confirms a second drift in the
plan's vocabulary: the field name itself.

## Field clarification (key finding)

`layout.display_width_cm` does not exist anywhere in the repo.

Evidence:

- `git ls-files content/objects/*/*.yaml | xargs grep -l display_width_cm`
  returns zero matches across all 78 object YAMLs.
- `git ls-files | xargs grep -l display_width_cm` matches only
  planning, audit, and decision Markdown under `docs/active_plans/`
  (10 docs, all discussion of the proposed name). No code, no
  schema, no generated artifact uses the field.
- The canonical per-object width is `layout.default_width` in each
  `content/objects/<kind>/<object>.yaml`. All 78 objects carry it.
  Example from ddh2o_bottle.yaml:

  ```yaml
  layout:
    default_width: 3
    label_width: 6
  ```

- B2 already documented that the build emits `layout.default_width`
  into `OBJECT_CATALOG` in
  `object_data.ts` (generated at build time). That generated
  field carries the same name.

Conclusion: this workstream is effectively a `layout.default_width`
tuning plan, not a `display_width_cm` plan. The wording in upstream
plan docs that says "display_width_cm" should be read as referring to
`layout.default_width` until a vocabulary edit either renames the
field or formally introduces `display_width_cm` as a second, distinct
quantity. No new field is recommended; the existing single
`default_width` knob is sufficient and matches the B2 evidence.

## Top 10 candidates

Cross-reference of B2's top-priority list (precheck violation count)
plus next-tier precheck-positive objects from the same JSON. Ordered
by precheck violation count, then by scenes affected.

| rank | object_name              | category   | current default_width | current display_width_cm | recommended default_width | rationale                                                                                  |
| ---- | ------------------------ | ---------- | --------------------- | ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | p200_micropipette        | pipette    | 2                     | missing (field absent)   | 5                         | 4 off-card across 4 scenes; aspect 0.230 (tall narrow); B2 rank 1                          |
| 2    | ddh2o_bottle             | bottle     | 3                     | missing (field absent)   | 6                         | 3 off-card across 3 scenes; aspect 0.457; sibling bottles in Round-2 ran 7                 |
| 3    | coomassie_stain_bottle   | bottle     | 3                     | missing (field absent)   | 5                         | 2 off-card; aspect 0.357 cluster; bottle-class floor                                       |
| 4    | destain_bottle           | bottle     | 3                     | missing (field absent)   | 5                         | 2 off-card; aspect 0.357 cluster; match coomassie_stain_bottle                             |
| 5    | coomassie_recycle_bottle | bottle     | 3                     | missing (field absent)   | 5                         | 2 off-card; aspect 0.357 cluster; same SVG family                                          |
| 6    | destain_waste_bottle     | bottle     | 3                     | missing (field absent)   | 5                         | 2 off-card; aspect 0.357 cluster; same SVG family                                          |
| 7    | ethanol_bottle           | bottle     | 3                     | missing (field absent)   | 5                         | 1 off-card + 1 cropped across 2 scenes; aspect 0.461; Round-2 treated 5 as floor           |
| 8    | kimwipe_pad              | decoration | 3                     | missing (field absent)   | 6                         | 2 too-small across 2 scenes; sibling decorations cluster 4-10                              |
| 9    | bme_bottle               | bottle     | 3                     | missing (field absent)   | 5                         | 1 off-card; aspect 0.359 cluster; match coomassie/destain family                           |
| 10   | laemmli_4x_bottle        | bottle     | 3                     | missing (field absent)   | 5                         | 1 off-card; aspect 0.357 cluster; tail of same bottle-cluster regression                   |

The `current display_width_cm` column is "missing (field absent)" for
all 10 rows because the field does not exist in the schema. The
recommended action targets `default_width` in the same YAML file. The
column is retained so the upstream plan's vocabulary survives the
read-across.

## Rationale notes

- Items 3-6, 9, 10 share an SVG family with aspect ~0.357. They
  regress as a group and should be fixed as a group. Fixing one
  without the others will leave six scenes still failing precheck.
- Item 1 (p200_micropipette) is the single highest-impact change by
  count (4 scenes) and lives in a different category (pipette), so it
  is independent of the bottle cluster.
- Item 2 (ddh2o_bottle) has the most distinct scenes among the
  bottles (3) and a wider aspect (0.457). It sits in a more forgiving
  aspect band than items 3-6, but at `default_width: 3` it is still
  the most frequently violated bottle.
- Item 8 (kimwipe_pad) is the only decoration in the top 10. Its
  `too-small` violation differs from the bottle `off-card` pattern;
  the fix lifts area, not overhang.
- Three precheck objects (`drug_stock_bottle`, `stock_bottle`,
  `tip_box`) have 3+ violations each but are not in `OBJECT_CATALOG`,
  per B2. They cannot be `default_width`-tuned. They are listed in
  B2's "8 missing catalog rows" finding and belong to a separate
  object-name-drift workstream, not this one.

## Batch D candidate ranking

D3 should pick one or two changes to apply first. Recommended order:

1. **p200_micropipette: 2 -> 5.** Highest scene fan-out (4 scenes).
   Cross-category, so it does not entangle with bottle SVG-family
   regression. Easy to A/B against the precheck without disturbing
   the bottle cluster. **Primary D3 candidate.**
2. **ddh2o_bottle: 3 -> 6.** Three scenes, distinct from the 0.357
   bottle cluster. Validates that bottle-class `default_width`
   changes show up in the precheck the way Round-2 predicted. Safe
   second pick because it does not depend on the cluster fix.
3. (Defer to D4+) The 0.357 bottle-family cluster (items 3, 4, 5, 6,
   9, 10) should be batched together once the bottle-class fix
   discipline is validated by item 2.

## Limitations

- Recommended values come from B2's `box_h_pct` reasoning and
  Round-2 sibling ranges, not from a re-run of the precheck against
  patched YAML. D3 is the place to validate the first one or two
  recommendations end to end before sweeping the cluster.
- The precheck JSON covers 10 scenes (45 violations across 29
  distinct objects). It is partial corpus, not whole repo. Some top
  candidates may have additional brittle placements outside the
  sampled scenes.
- This plan does not propose introducing `display_width_cm` as a
  new field. If a future plan needs a separate "display-only" width
  distinct from `default_width`, that introduction is a vocabulary
  edit and belongs to a new SPEC-side workstream, not B3.

## Files read

- [round3_asset_specs_impact_audit.md](round3_asset_specs_impact_audit.md)
- no_crop_audit_results.json
- ddh2o_bottle.yaml
- 17 object YAMLs under content/objects/ (default_width lookup)
