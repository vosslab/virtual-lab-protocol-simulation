# Round 3 A1B bottle family asset_name fixes

Workstream A1B: extend R2's `pbs_bottle` pattern across the remaining
bottle-family objects with placeholder issues. Same rule shape as
[round3_placeholder_asset_replacement.md](round3_placeholder_asset_replacement.md):
single-field `asset_name` rename per YAML, no schema change, no commits.

Sources:

- [round3_asset_alias_verification.md](round3_asset_alias_verification.md) (B1 audit, deferred bottle list)
- [round3_placeholder_asset_replacement.md](round3_placeholder_asset_replacement.md) (R2 pbs_bottle exemplar)

## Summary

- Bottles in `content/objects/bottle/`: 31 YAML files.
- Already-clean (per-object SVG exists, leave as-is): 18.
- Already-fixed by R2: 1 (`pbs_bottle`).
- Fixed in this pass: 7.
- Deferred (semantic art-choice required): 5.
- No-asset-field exemption (separate-pass item per B1): 1
  (`trypsin_bottle`).

## Per-bottle action table

| object | current asset_name | available SVG | action | applied |
| --- | --- | --- | --- | --- |
| bme_bottle | bme_bottle | bme_bottle.svg | leave (matches) | n |
| carboplatin_stock_bottle | carboplatin_bottle | (none; bottle.svg) | rename to `bottle` | y |
| cell_suspension_tube | microtube | microtube.svg | leave (matches) | n |
| conical_15ml | falcon_15ml | falcon_15ml.svg | leave (matches) | n |
| conical_tube_for_dilution | conical_15ml | (none; falcon_15ml.svg) | rename to `falcon_15ml` | y |
| coomassie_recycle_bottle | coomassie_recycle_bottle | coomassie_recycle_bottle.svg | leave (matches) | n |
| coomassie_stain_bottle | coomassie_stain_bottle | coomassie_stain_bottle.svg | leave (matches) | n |
| ddh2o_bottle | ddh2o_bottle | ddh2o_bottle.svg | leave (matches) | n |
| destain_bottle | destain_bottle | destain_bottle.svg | leave (matches) | n |
| destain_waste_bottle | destain_waste_bottle | destain_waste_bottle.svg | leave (matches) | n |
| dmso_bottle | dmso_bottle | (none; bottle.svg) | rename to `bottle` | y |
| ethanol_bottle | ethanol_bottle | (none; ethanol_spray.svg semantically near) | DEFER | n |
| laemmli_4x_bottle | laemmli_4x_bottle | laemmli_4x_bottle.svg | leave (matches) | n |
| media_bottle | media_bottle | (none; bottle_medium_pink.svg) | DEFER | n |
| metformin_stock_bottle | metformin_bottle | (none; bottle.svg) | rename to `bottle` | y |
| metformin_working_tube | microtube_1ml | (none; microtube.svg) | rename to `microtube` | y |
| microtube | microtube | microtube.svg | leave (matches) | n |
| microtube_15ml_intermediate | microtube_15ml | (none; falcon_15ml.svg) | rename to `falcon_15ml` | y |
| mtt_powder_container | mtt_powder_container | (none; mtt_vial.svg) | DEFER | n |
| mtt_solution_bottle | bottle | bottle.svg | leave (matches; resolves via R2-pattern already) | n |
| mtt_solution_tube | mtt_solution_tube | (none; falcon_15ml.svg OR microtube.svg) | DEFER | n |
| mtt_vial | mtt_vial | mtt_vial.svg | leave (matches) | n |
| pbs_bottle | bottle | bottle.svg | leave (R2 already fixed) | n |
| protein_ladder_tube | protein_ladder_tube | protein_ladder_tube.svg | leave (matches) | n |
| protein_sample_tube | protein_sample_tube | protein_sample_tube.svg | leave (matches) | n |
| recycle_buffer_bottle | recycle_buffer_bottle | recycle_buffer_bottle.svg | leave (matches) | n |
| running_buffer_10x_bottle | running_buffer_10x_bottle | running_buffer_10x_bottle.svg | leave (matches) | n |
| running_buffer_1x_carboy | running_buffer_1x_carboy | running_buffer_1x_carboy.svg | leave (matches) | n |
| sterile_water_bottle | water_bottle | (none; ddh2o_bottle.svg OR bottle.svg) | DEFER | n |
| trypan_blue_bottle | trypan_blue_bottle | (none; bottle.svg) | rename to `bottle` | y |
| trypsin_bottle | (none) | n/a | leave (no asset_name field; B1 separate-pass list) | n |

## Bottles fixed (7)

1. `carboplatin_stock_bottle.yaml` -- `carboplatin_bottle` -> `bottle`.
2. `dmso_bottle.yaml` -- `dmso_bottle` -> `bottle`.
3. `metformin_stock_bottle.yaml` -- `metformin_bottle` -> `bottle`.
4. `trypan_blue_bottle.yaml` -- `trypan_blue_bottle` -> `bottle`
   (both `empty` and `trypan_blue` cases).
5. `conical_tube_for_dilution.yaml` -- `conical_15ml` -> `falcon_15ml`
   (all three cases: `empty`, `cell_suspension`, `fresh_media`).
6. `microtube_15ml_intermediate.yaml` -- `microtube_15ml` -> `falcon_15ml`
   (both cases: `empty`, `carboplatin`).
7. `metformin_working_tube.yaml` -- `microtube_1ml` -> `microtube`
   (all three cases: `empty`, `metformin`, `media`).

All 7 follow the R2 pbs_bottle pattern: identify the missing asset
name, rename to the closest existing SVG basename per the B1 audit
recommendation, no other field touched.

## Bottles deferred (5)

These bottles have a candidate alternate-art SVG that is more
specific than the generic `bottle.svg`. Choosing between the generic
and the specific art is a semantic decision, not a mechanical
rename, so they remain deferred per the workstream brief
("Skip bottles with semantic special handling").

- `ethanol_bottle` -- candidates: `ethanol_spray.svg` (specific art,
  but spray-shape may not match the bottle pour gesture) or
  `bottle.svg` (generic; safe default). B1 recommends `ethanol_spray`,
  pending scene-author confirmation.
- `media_bottle` -- candidate: `bottle_medium_pink.svg` (specific
  color for cell culture media). B1 recommends this over generic
  `bottle`.
- `mtt_powder_container` -- candidate: `mtt_vial.svg` (specific small
  vial). Requires decision: vial-shape vs. larger container.
- `mtt_solution_tube` -- candidates: `falcon_15ml.svg` or
  `microtube.svg`. Volume context (15 mL vs. 1 mL working stock)
  needed.
- `sterile_water_bottle` -- candidates: `ddh2o_bottle.svg` (the
  semantically identical water-bottle art) or generic `bottle.svg`.
  B1 recommends `ddh2o_bottle`.

A follow-up workstream that has access to the protocol-side volume
context and the scene authors can resolve these in one pass.

## Files changed

- content/objects/bottle/carboplatin_stock_bottle.yaml
- content/objects/bottle/conical_tube_for_dilution.yaml
- content/objects/bottle/dmso_bottle.yaml
- content/objects/bottle/metformin_stock_bottle.yaml
- content/objects/bottle/metformin_working_tube.yaml
- content/objects/bottle/microtube_15ml_intermediate.yaml
- content/objects/bottle/trypan_blue_bottle.yaml

`pipeline/generate_svg_globals.py` was re-run (idempotent; 125 SVG
constants, identical to the R2 regen output -- no new SVGs were
added or removed by this workstream).

## Build and walker evidence

- `bash build_github_pages.sh`: FAIL on pre-existing infrastructure
  issue. `tsc --noEmit` walks `**/*.ts` per `tsconfig.json`'s
  `include`, and there is a stale audit artifact at
  `test-results/round3_svg_barrel_regen_audit/barrel_after_regen.ts`
  (gitignored, left over from a prior barrel-regen audit
  workstream). Its imports reference module paths without `.ts`
  extensions and trip TS2307 against the regenerated barrel. This is
  unrelated to the bottle-family edits and was present before this
  workstream started.
- Workaround for evidence capture: ran `npx esbuild` directly with
  the same flags the build script uses, producing
  `dist/main.js` (2.3 MB, identical size to R2's reported bundle).
  Copied `src/index.html`, `src/style.css`, and wrote `.nojekyll`
  manually.
- `node tests/playwright/test_base_scene_gallery.mjs`: PASS,
  19 of 19 base scenes rendered, 0 failures.

Suggested follow-up (outside A1B scope): either move the stale
audit artifact under an `_`-prefixed scratch path, exclude
`test-results/` in `tsconfig.json`, or add `.ts.bak` extension so
tsc skips it. Any of these unblocks `bash build_github_pages.sh`.

## Screenshots

- `test-results/round3_bottle_family/sample_prep_bench_before_a1b.png`
  (copied from `test-results/round3_placeholder_fixes/sample_prep_bench_after.png`;
  represents post-R2 / pre-A1B state, where pbs_bottle was already
  resolved but the seven A1B bottles still rendered as green
  fallback rects).
- `test-results/round3_bottle_family/sample_prep_bench_after_a1b.png`
  (copied from `test-results/_base_scenes_gallery/sample_prep_bench.png`
  after re-running the gallery walker with the seven new asset_name
  fixes applied).

Note: `sample_prep_bench` is the densest bottle scene in the gallery
suite. The seven fixed bottles appear in protocol-time scenes
(`carboplatin_stock_bottle` and `metformin_stock_bottle` in the drug
dilution protocols, `conical_tube_for_dilution` and
`metformin_working_tube` in the cell-seeding protocols,
`trypan_blue_bottle` in counting, `dmso_bottle` in solubilization,
`microtube_15ml_intermediate` in carboplatin intermediate). The base
scene gallery is the closest available test harness; full protocol
walkthroughs are deferred to a downstream workstream that runs
`tests/playwright/walker_*.mjs` for each affected protocol.

## Keep/reject per bottle

- carboplatin_stock_bottle: KEEP (rename to `bottle` matches the
  pbs_bottle pattern; carboplatin liquid color is handled by the
  bottle colormap sidecar, same as PBS).
- conical_tube_for_dilution: KEEP (rename to `falcon_15ml`;
  `conical_15ml` had no SVG, `falcon_15ml` is the existing 15 mL
  conical art and is the only candidate).
- dmso_bottle: KEEP (same rationale as carboplatin).
- metformin_stock_bottle: KEEP (same rationale as carboplatin).
- metformin_working_tube: KEEP (rename to `microtube`;
  `microtube_1ml` had no SVG, `microtube.svg` is the only generic
  microtube art; capacity range stays at 1000 ul per the YAML
  state_field).
- microtube_15ml_intermediate: KEEP (rename to `falcon_15ml`; same
  rationale as conical_tube_for_dilution).
- trypan_blue_bottle: KEEP (rename to `bottle`; trypan blue color is
  handled by the bottle colormap sidecar).

## Next action

M4 may surface more low-hanging asset fixes (e.g. the deferred
five bottles after volume-context decisions, the 16 no-asset-field
objects from B1's separate-pass list, the rack-family objects). The
infrastructure unblock (stale `barrel_after_regen.ts` removal) is
prerequisite to a clean `bash build_github_pages.sh` and should be
filed as a separate atomic task.

## Verification commands

- python3 tests/check_ascii_compliance.py -i docs/active_plans/reports/round3_a1b_bottle_family.md
- pytest tests/test_markdown_links.py -q
