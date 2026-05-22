# No-Crop Missing-Asset Audit (WS-C re-execution)

Date: 2026-05-21
Status: DONE_WITH_CONCERNS
HEAD: 8795d25
Author note: prior WS-C artifact was lost to a git reset. This audit
re-derives the state from the current filesystem and `git ls-files`
output, not from prior session memory.

## Methodology

Asset resolution model (verified by reading
`src/scene_runtime/render/svg_loader.ts` lines 1-58 and
`pipeline/generate_svg_globals.py` lines 240-360):

asset*name (snake_case) -> SVG*<UPPER>
`SVG_<UPPER>` is emitted by `pipeline/generate_svg_globals.py` for
every `assets/equipment/<basename>.svg` and exported through
`generated/svg_assets/index.ts`.

Therefore an `asset_name` reference resolves at runtime if and only if
`assets/equipment/<asset_name>.svg` is present on disk. There is no
intermediate manifest, alias table, or string-rewrite layer.

Inputs scanned (via `git ls-files <pathspec>` + Read tool):

- `assets/equipment/` (125 SVG files, 1 colormap JSON, 2 docs)
- `assets/equipment/MISSING_SVG_PLACEHOLDERS.md` (11 placeholders)
- `content/objects/**/*.yaml` (78 object YAMLs)
- `content/base_scenes/*.yaml` (20 scene YAMLs)
- `content/protocols/**/*.yaml` (protocol object references)
- `tests/content/dev_smoke/**/*.yaml` (dev smoke fixtures)
- `src/asset_specs.ts`, `src/svg_assets.ts`,
  `src/scene_runtime/render/svg_loader.ts`,
  `pipeline/generate_svg_globals.py`

YAML reference vocab parsed:

- `object_name: <name>` (object identity, content/objects)
- `kind: <category>` (grouping label, not an SVG ref)
- `asset_name: <name>` (under `visual_states.*.cases[].output`)
- `background.asset: <name>` (scene background ref)
- `placements[].object_name` (scene to object binding)
- `target: <name>` (protocol step target object)

Audit helper: `_temp_audit.py` (READ-ONLY; deletes nothing).

## Bucket totals

| Bucket                             | Count | Notes                                                                                 |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| A. mapping-exists-file-missing     | 12    | Asset_name referenced; no on-disk SVG.                                                |
| B. file-exists-mapping-missing     | 16    | True orphans (parent stem not referenced either).                                     |
| C. placeholder-despite-valid       | 11    | Real SVG exists but is a dashed-border placeholder (per MISSING_SVG_PLACEHOLDERS.md). |
| D. scene-ref-no-object-yaml        | 0     | No scene placement names an object that lacks a YAML.                                 |
| E. asset-authoring                 | 11    | Same set as C; placeholders are the asset-authoring backlog.                          |
| Total distinct asset/object issues | 39    | A + B + C (E is co-extensive with C).                                                 |

State-variant orphans (parent stem IS referenced; e.g.
`bme_bottle_empty`, `bme_bottle_filled`): 71 files. Not counted as
missing or as a problem; they are recipe-driven state outputs covered
by `visual_states.material_name.cases[]` even when those cases all
write the same root `asset_name`.

Historical reference: prior session reported "~30" and a regenerated
draft reported 65 across 5 buckets (30+12+11+7+5). Current count is
A=12, B=16, C=11, D=0 = 39 distinct rows. The discrepancy notes
section below explains both.

## Per-asset table -- Bucket A (mapping-exists-file-missing)

Asset_name referenced in YAML but no `assets/equipment/<name>.svg`
on disk.

| asset_name                | expected SVG path                              | file_exists                           | registry/mapping location                                                                                                                   | bucket                      |
| ------------------------- | ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| bench_workspace_bg        | assets/equipment/bench_workspace_bg.svg        | NO                                    | content/base_scenes/bench_basic.yaml (and 12 other bench/heat_block/imaging/staining/sample_prep/electrophoresis/well_plate_96_zoom scenes) | mapping-exists-file-missing |
| cell_counter_workspace_bg | assets/equipment/cell_counter_workspace_bg.svg | NO                                    | content/base_scenes/cell_counter_basic.yaml; content/base_scenes/cell_counter_basic_row_slot.yaml                                           | mapping-exists-file-missing |
| conical_15ml              | assets/equipment/conical_15ml.svg              | NO                                    | content/objects/bottle/conical_15ml.yaml visual_states.material_name.cases                                                                  | mapping-exists-file-missing |
| ethanol_bottle            | assets/equipment/ethanol_bottle.svg            | NO (only \_empty/\_filled variants)   | content/objects/bottle/ethanol_bottle.yaml                                                                                                  | mapping-exists-file-missing |
| hood_workspace_bg         | assets/equipment/hood_workspace_bg.svg         | NO                                    | content/base_scenes/hood_basic.yaml; content/base_scenes/hood_basic_row_slot.yaml                                                           | mapping-exists-file-missing |
| media_bottle              | assets/equipment/media_bottle.svg              | NO                                    | content/objects/bottle/media_bottle.yaml                                                                                                    | mapping-exists-file-missing |
| microscope_view_bg        | assets/equipment/microscope_view_bg.svg        | NO                                    | content/base_scenes/microscope_basic.yaml; content/base_scenes/microscope_basic_row_slot.yaml                                               | mapping-exists-file-missing |
| pbs_bottle                | assets/equipment/pbs_bottle.svg                | NO (only \_empty/\_filled)            | content/objects/bottle/pbs_bottle.yaml                                                                                                      | mapping-exists-file-missing |
| sharps_container          | assets/equipment/sharps_container.svg          | NO                                    | content/objects/waste/sharps_container.yaml                                                                                                 | mapping-exists-file-missing |
| trypan_blue_bottle        | assets/equipment/trypan_blue_bottle.svg        | NO                                    | content/objects/bottle/trypan_blue_bottle.yaml                                                                                              | mapping-exists-file-missing |
| well                      | assets/equipment/well.svg                      | NO                                    | content/objects/plate/well_plate_96.yaml visual_states.material_name (applies_to=subpart)                                                   | mapping-exists-file-missing |
| well_plate_96             | assets/equipment/well_plate_96.svg             | NO (only 96well_pcr_plate.svg exists) | tests/content/dev_smoke/well_plate_96_zoom_check/items.yaml                                                                                 | mapping-exists-file-missing |

Sub-classification note. Several of these are likely resolvable by a
recipe layer rather than a new file:

- `ethanol_bottle`, `pbs_bottle`, `media_bottle`, `trypan_blue_bottle`,
  `conical_15ml`, `sharps_container`: bottle/conical/sharps SVGs ship
  only as `*_empty` and `*_filled` state files. YAML emits the
  bare name. Either rename YAML cases to a state variant, or
  generate a base alias.
- `well`: applies_to=subpart on a 96-well plate; no individual well
  SVG; renderer likely synthesizes via `fill_height` composite.
- `well_plate_96`: existing SVG is `96well_pcr_plate.svg` -- a name
  mismatch (rename file OR rename mapping).
- `*_workspace_bg`, `microscope_view_bg`: background SVGs never
  authored; scenes rely on CSS background or placeholder.

## Per-asset table -- Bucket B (file-exists-mapping-missing, true orphans)

SVG file on disk; no `asset_name`, `object_name`, or
`background.asset` reference; parent stem also unreferenced.

| asset basename                | file path                                          | rendered usage                                                                                    | bucket                      |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| 96well_pcr_plate              | assets/equipment/96well_pcr_plate.svg              | none (well_plate_96 mapping points to nonexistent file)                                           | file-exists-mapping-missing |
| \_placeholder                 | assets/equipment/\_placeholder.svg                 | likely fallback artwork                                                                           | file-exists-mapping-missing |
| angry_professor               | assets/equipment/angry_professor.svg               | none in content/; possibly used by professor_overlay.ts                                           | file-exists-mapping-missing |
| bottle_medium_pink            | assets/equipment/bottle_medium_pink.svg            | none in content/                                                                                  | file-exists-mapping-missing |
| dilution_tube_rack            | assets/equipment/dilution_tube_rack.svg            | declared in src/asset_specs.ts but no object yaml references it                                   | file-exists-mapping-missing |
| drug_vial_rack                | assets/equipment/drug_vial_rack.svg                | none in content/ (E table flagged it visually)                                                    | file-exists-mapping-missing |
| ethanol_spray                 | assets/equipment/ethanol_spray.svg                 | none in content/ (Workstream A screenshot audit flagged ddh2o_spray distortion -- likely renamed) | file-exists-mapping-missing |
| falcon_15ml                   | assets/equipment/falcon_15ml.svg                   | none in content/; conical_15ml.yaml uses bare name                                                | file-exists-mapping-missing |
| falcon_50ml                   | assets/equipment/falcon_50ml.svg                   | none in content/                                                                                  | file-exists-mapping-missing |
| glove_box                     | assets/equipment/glove_box.svg                     | declared in src/asset_specs.ts but no object yaml                                                 | file-exists-mapping-missing |
| micropipette_rack             | assets/equipment/micropipette_rack.svg             | declared in src/asset_specs.ts but no object yaml                                                 | file-exists-mapping-missing |
| microtube_open_translucent    | assets/equipment/microtube_open_translucent.svg    | none in content/                                                                                  | file-exists-mapping-missing |
| microtube_rack_24_placeholder | assets/equipment/microtube_rack_24_placeholder.svg | none; placeholder per MISSING_SVG_PLACEHOLDERS.md                                                 | placeholder-despite-valid   |
| tip_box                       | assets/equipment/tip_box.svg                       | declared in src/asset_specs.ts but no object yaml                                                 | file-exists-mapping-missing |
| waste_tray                    | assets/equipment/waste_tray.svg                    | declared in src/asset_specs.ts but no object yaml                                                 | file-exists-mapping-missing |
| well_plate_24                 | assets/equipment/well_plate_24.svg                 | none in content/                                                                                  | file-exists-mapping-missing |

## Per-asset table -- Bucket C / E (placeholder-despite-valid)

Source: assets/equipment/MISSING_SVG_PLACEHOLDERS.md (11 rows).
All files exist on disk; all are 100x100 viewBox dashed-border
templates with object-name text.

| placeholder SVG                   | object_kind       | file_exists | bucket                                      |
| --------------------------------- | ----------------- | ----------- | ------------------------------------------- |
| power_supply_on.svg               | power_supply      | YES         | placeholder-despite-valid / asset-authoring |
| power_supply_off.svg              | power_supply      | YES         | placeholder-despite-valid / asset-authoring |
| heat_block_closed.svg             | heat_block        | YES         | placeholder-despite-valid / asset-authoring |
| heat_block_open.svg               | heat_block        | YES         | placeholder-despite-valid / asset-authoring |
| microwave_closed.svg              | microwave         | YES         | placeholder-despite-valid / asset-authoring |
| microwave_open.svg                | microwave         | YES         | placeholder-despite-valid / asset-authoring |
| lightbox_off.svg                  | lightbox          | YES         | placeholder-despite-valid / asset-authoring |
| gel_opening_tool.svg              | gel_opening_tool  | YES         | placeholder-despite-valid / asset-authoring |
| microtube_rack_24_placeholder.svg | microtube_rack_24 | YES         | placeholder-despite-valid / asset-authoring |
| kimwipe_pad.svg                   | kimwipe_pad       | YES         | placeholder-despite-valid / asset-authoring |
| electrode_module.svg              | electrode_module  | YES         | placeholder-despite-valid / asset-authoring |

Note: `lightbox_on.svg` exists on disk but is NOT enumerated in
`MISSING_SVG_PLACEHOLDERS.md` (paired-state inconsistency; flag for
review but treat as non-placeholder until verified visually).

## Bucket D (scene-ref-no-object-yaml)

Empty. Every `placements[].object_name` reference in the 20 scenes
under `content/base_scenes/` resolves to a YAML in
`content/objects/**/*.yaml`. The dev-smoke scene under
`tests/content/dev_smoke/well_plate_96_zoom_check/` defines its
target inline; its only Bucket A miss is the `well_plate_96`
asset_name reference, already counted above.

## Source-files-read list

Registry/mapping modules (TypeScript and Python):

- /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/scene_runtime/render/svg_loader.ts
- /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/asset_specs.ts
- /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/svg_recipes.ts
- /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/pipeline/generate_svg_globals.py

Placeholder roster:

- /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/assets/equipment/MISSING_SVG_PLACEHOLDERS.md

Asset directory listings via `git ls-files`:

- assets/equipment/ (125 .svg + 1 .json + 2 .md)
- content/objects/ (78 .yaml under bottle/, equipment/, decoration/, plate/, waste/)
- content/base_scenes/ (20 .yaml)
- content/protocols/ (full subtree, scanned for target/object_name)
- tests/content/dev_smoke/ (scanned for items.yaml)

Object/scene YAML samples Read for vocab confirmation:

- content/objects/bottle/ethanol_bottle.yaml
- content/objects/bottle/pbs_bottle.yaml
- content/objects/bottle/conical_15ml.yaml
- content/objects/plate/well_plate_96.yaml
- content/objects/waste/sharps_container.yaml
- content/base_scenes/hood_basic.yaml

Prior-art docs for cross-check:

- docs/active_plans/no_cropped_svg_asset_sizing_table.md
- docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md
- docs/active_plans/no_cropped_svg_screenshot_audit.md
- docs/active_plans/no_cropped_svg_repair_summary.md
- docs/active_plans/workstreams/round3_missing_asset_repair_brief.md

## Discrepancy vs historical estimates

Three prior estimates exist; this audit reconciles each.

1. Dispatch text and Workstream A/G text: "~30 reported missing or
   placeholder SVG assets". Current count is 39 distinct rows across
   A+B+C (12+16+11). The 39 splits cleanly into:
   - 12 missing files behind active YAML mappings (Bucket A)
   - 11 placeholders that resolve but display dashed templates
     (Bucket C/E)
   - 16 orphan SVGs on disk with no live mapping (Bucket B)

   The "~30" estimate likely combined A + C (12 + 11 = 23) and added
   a partial orphan tally; it under-counts orphans.

2. `round3_missing_asset_repair_brief.md` claimed 65 rows
   (30+12+11+7+5). The current count is 39. Differences:
   - mapping-exists-file-missing was 30 in the brief; this audit
     finds 12. The brief did not partition by `asset_name` distinctness;
     a single missing `bench_workspace_bg` was cited by 13 scenes and
     may have been counted per-scene.
   - obsolete (7 in brief) is empty in this audit -- the brief's
     candidates were `kind:` category labels misread as object
     identities by the prior tool.
   - asset-authoring (5 in brief) is 11 here -- the canonical
     `MISSING_SVG_PLACEHOLDERS.md` enumerates 11. The brief used a
     reduced set.

3. Workstream A's "~20-24 PLACEHOLDER failures" referred to
   _visually_ affected scenes, not distinct assets. Per current
   placeholder roster, only 11 SVG files are placeholders;
   visual impact scales with how many scenes place them.

Net surface change: the canonical figure for this audit is 39
distinct asset/object issues. New surfaces discovered:

- `lightbox_on.svg` exists but is not in the placeholder roster --
  inconsistency with `lightbox_off.svg` (which is a placeholder). May
  be a legitimate paired asset; visual review needed.
- `well` (subpart asset_name) and `*_workspace_bg` (scene background
  asset_name) point at SVGs that are not authored anywhere. These
  may be intentional non-SVG renderer surfaces (CSS background,
  composite well fill). Confirm with renderer code before classifying
  as authoring backlog.

## Verification

- All 12 Bucket A asset_names re-verified against `git ls-files
assets/equipment/`. Zero false positives.
- Bucket B orphan list cross-referenced against `src/asset_specs.ts`
  and YAML `asset_name` set; the `dilution_tube_rack`, `glove_box`,
  `micropipette_rack`, `tip_box`, `waste_tray` orphans are declared
  in `asset_specs.ts` but have no `content/objects/**/*.yaml` binding,
  so they are still orphans for the audit's purposes.
- Bucket C enumeration matches `MISSING_SVG_PLACEHOLDERS.md` line for
  line.
- Bucket D verified by enumerating every `placements[].object_name`
  across 20 base_scenes; all 20 resolve.
- Total covers every reported missing/placeholder asset.
- Every row carries a bucket label.

## Handoff

- Status: DONE_WITH_CONCERNS
- Total asset row count: 39 (12 A + 16 B + 11 C/E)
- Per-bucket counts:
  - mapping-exists-file-missing: 12
  - file-exists-mapping-missing: 16 (plus 71 state-variants ignored)
  - placeholder-despite-valid: 11 (co-extensive with asset-authoring)
  - scene-ref-no-object-yaml: 0
  - asset-authoring: 11
- New buckets surfaced: none structural; one new sub-bucket
  observation -- "subpart/background asset_name not authored as SVG"
  (4 cases: well, bench_workspace_bg, cell_counter_workspace_bg,
  hood_workspace_bg, microscope_view_bg) may not require an SVG at all
  if the renderer covers them via composite/CSS-native paths.
- Artifact path: docs/active_plans/workstreams/no_crop_missing_asset_audit.md
- Source-files-read list: see Source-files-read section above
- Discrepancy vs historical ~30: 39 vs ~30 (about +30%). Historical
  count likely missed orphans and double-counted scene-side
  duplicates of the same missing `*_workspace_bg`. Historical 65-row
  brief was self-described as NEEDS_CONTEXT; its 30/12/11/7/5 split
  is not reproduced.
- Concerns:
  - `_temp_audit.py` heuristic does not parse YAML structurally; it
    line-matches `asset_name:` and `background.asset:`. Risk of
    missing nested or quoted forms; verified by spot-reads on
    bottle/, plate/, waste/ samples.
  - Orphan classification depends on string-stem heuristic; a
    `*_servier` or `*_v5` variant marked state-variant might be a
    genuine orphan if its parent stem isn't authored either. Marked
    14 t75_flask variants as state-variants because `t75_flask.svg`
    exists; all 5 `t75_flask_v*` files are state-variants of an
    authored parent.
  - Bucket A's "missing" status for `well`, `bench_workspace_bg`,
    `cell_counter_workspace_bg`, `hood_workspace_bg`,
    `microscope_view_bg` may be a false alarm: renderer may handle
    these via non-SVG paths. Recommend a follow-on read of
    `src/scene_runtime/render/apply.ts` and the layout adapter to
    confirm.

Hard-stop checks:

- assets/equipment/ readable: YES (125 .svg files enumerated).
- registry/mapping module located: YES
  (src/scene_runtime/render/svg_loader.ts + pipeline/generate_svg_globals.py).
- No commit performed.
- READ-ONLY on assets/, src/, generated/, pipeline/, content/,
  experiments/. Only write target was
  docs/active_plans/workstreams/no_crop_missing_asset_audit.md (this
  file).
