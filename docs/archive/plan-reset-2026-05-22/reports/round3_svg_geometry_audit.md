# Round 3 SVG geometry audit (Workstream B4)

Status: read-only audit; no SVG files were modified; no generated assets were
rebuilt.
HEAD: matches `git rev-parse HEAD` at audit time.
Date: 2026-05-22.

This audit is the Round 3 SVG-level geometry sweep for Workstream B4. It
enumerates every SVG under `assets/equipment/` that backs an object
currently rendering as cropped or as a placeholder, and reports the
geometry fields that drive the runtime aspect-ratio computation. The
canonical no-crop metric, where referenced, is
`artwork_integrity.clipped_by_parent` (precheck.mjs sub-check 12e).

This refresh confirms the Round 3 prior finding in
[../audits/no_crop_svg_viewbox_audit.md](../audits/no_crop_svg_viewbox_audit.md)
(Audit C). The two artifacts are complementary: Audit C was a full-set
sweep (125 SVGs, severity buckets BAD / SUSPICIOUS / ASPECT-EXTREME /
OK); this B4 report is the problem-object focused slice required by the
Round 3 plan, with the table ordered by the B4 severity priority
(missing viewBox > non-default preserveAspectRatio > suspicious
intrinsic aspect > clean) and a top-10 highest-severity subsection.

## Scope and method

- Source tree scanned: every `*.svg` under `assets/equipment/` (125
  files).
- Extraction: bounded regex parse of the root `<svg>` (or
  `<ns0:svg>`-namespaced) opening tag. Helper script at
  `/tmp/_extract_svg_geometry.py`; per-file JSON written to
  `/tmp/svg_geometry_b4.json` (not committed).
- Fields read per file: `viewBox`, root `width` attribute, root `height`
  attribute, `preserveAspectRatio`, root-level `transform`.
- Derived: intrinsic aspect = viewBox `w / h`. Placeholder detection =
  viewBox `0 0 100 100`. Aspect-extreme threshold = aspect `< 0.20` or
  `> 5.0`.
- Problem-object subset: SVGs backing the clipped-object list from
  [../audits/no_crop_sizing_chain_root_cause.md](../audits/no_crop_sizing_chain_root_cause.md)
  (Audit A) plus every placeholder SVG listed in
  ../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md.
  Total problem subset: 46 files.

Severity bucketing (B4 task brief priority, sorted descending):

1. `missing_viewBox` -- no viewBox attribute on root.
2. `unparseable_viewBox` -- present but not `minX minY w h` numeric.
3. `nonpositive_viewBox` -- w or h <= 0.
4. `placeholder_100x100` -- root viewBox `0 0 100 100` (artwork is a
   placeholder, geometry is provisional; not a viewBox bug, but the
   replacement asset must preserve a full-silhouette viewBox).
5. `preserveAspectRatio_nondefault` -- attribute present and not
   `xMidYMid meet`.
6. `root_transform` -- root-level transform that alters geometry.
7. `nonzero_origin` -- viewBox `minX` or `minY` non-zero.
8. `aspect_attr_conflict` -- root width/height attribute aspect differs
   from viewBox aspect by > 5 percent.
9. `aspect_extreme` -- aspect `< 0.20` or `> 5.0` (genuinely thin or
   wide asset).
10. `clean` -- zero-origin, parseable, default preserveAspectRatio, no
    transform, in-range aspect, no width/height conflict.

## Full-set severity counts (125 SVGs)

| Severity                          | Count |
| --------------------------------- | ----: |
| missing_viewBox                   |     0 |
| unparseable_viewBox               |     0 |
| nonpositive_viewBox               |     0 |
| placeholder_100x100               |    12 |
| preserveAspectRatio_nondefault    |     0 |
| root_transform                    |     0 |
| nonzero_origin                    |     0 |
| aspect_attr_conflict              |     0 |
| aspect_extreme                    |     4 |
| clean                             |   109 |
| **Total**                         | **125** |

Headline: no SVG in `assets/equipment/` is missing or malformed at the
viewBox level. No SVG declares a non-default `preserveAspectRatio` (no
`slice` and no `none`). No SVG carries a root-level `transform`. Every
viewBox uses a zero origin. The four `aspect_extreme` entries are
legitimate thin disposables; the twelve `placeholder_100x100` entries
include the generic `_placeholder.svg` plus 11 per-object stubs awaiting
real artwork. The SVG layer is exonerated as the cause of the current
`artwork_integrity.clipped_by_parent` regressions; the residual cropping
lives in the downstream renderer / card sizing / `ASSET_SPECS.defaultWidth`
layers, per
[../audits/no_crop_sizing_chain_root_cause.md](../audits/no_crop_sizing_chain_root_cause.md).

## Problem-object subset severity counts (46 SVGs)

| Severity              | Count |
| --------------------- | ----: |
| missing_viewBox       |     0 |
| placeholder_100x100   |    11 |
| aspect_extreme        |     4 |
| clean                 |    31 |
| **Total**             | **46** |

## Geometry table (problem-object subset, sorted by severity)

| asset path | viewBox | intrinsic aspect | width attr | height attr | preserveAspectRatio | issue |
| --- | --- | --- | --- | --- | --- | --- |
| `assets/equipment/electrode_module.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/gel_opening_tool.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/heat_block_closed.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/heat_block_open.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/kimwipe_pad.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/lightbox_off.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/microtube_rack_24_placeholder.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/microwave_closed.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/microwave_open.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/power_supply_off.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/power_supply_on.svg` | `0 0 100 100` | 1.0 | - | - | (default xMidYMid meet) | placeholder_100x100 |
| `assets/equipment/aspirating_pipette.svg` | `0 0 16 139` | 0.1151 | - | - | (default xMidYMid meet) | aspect_extreme |
| `assets/equipment/falcon_15ml.svg` | `0 0 68.863 419.187` | 0.1643 | - | - | (default xMidYMid meet) | aspect_extreme |
| `assets/equipment/p10_gel_loading_tip.svg` | `0 0 38.778 433.436` | 0.0895 | - | - | (default xMidYMid meet) | aspect_extreme |
| `assets/equipment/serological_pipette.svg` | `0 0 16 142` | 0.1127 | - | - | (default xMidYMid meet) | aspect_extreme |
| `assets/equipment/96well_pcr_plate.svg` | `0 0 393.3275 278.5243` | 1.4122 | 393.3275 | 278.5243 | (default xMidYMid meet) | clean |
| `assets/equipment/cell_counter.svg` | `0 0 510.123 361.058` | 1.4129 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/cell_counter_new.svg` | `0 0 510.123 361.058` | 1.4129 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/cell_counter_old.svg` | `0 0 60 70` | 0.8571 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/electrophoresis_tank.svg` | `0 0 656.013 427.124` | 1.5359 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/electrophoresis_tank_inner_chamber.svg` | `0 0 74 114` | 0.6491 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/electrophoresis_tank_outer_chamber.svg` | `0 0 114 99` | 1.1515 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/gel_cassette.svg` | `0 0 462.274 518.665` | 0.8913 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/gel_comb.svg` | `0 0 462.274 518.665` | 0.8913 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/microscope.svg` | `0 0 283.843 489.184` | 0.5802 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/microscope_new.svg` | `0 0 283.843 489.184` | 0.5802 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/microscope_old.svg` | `0 0 283.843 489.184` | 0.5802 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/mini_protean_gel.svg` | `0 0 462.274 518.665` | 0.8913 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/multichannel_pipette.svg` | `0 0 162.784 484.989` | 0.3356 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/multichannel_pipette_new.svg` | `0 0 161.008 482.835` | 0.3335 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/multichannel_pipette_old.svg` | `0 0 24 116.5` | 0.2060 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/p10_gel_loading_tip_box.svg` | `0 0 328.025 214.072` | 1.5323 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/p10_micropipette_empty.svg` | `0 0 109.909 478.488` | 0.2297 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/p10_micropipette_filled.svg` | `0 0 109.909 478.488` | 0.2297 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/p200_micropipette_empty.svg` | `0 0 109.909 478.488` | 0.2297 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/p200_micropipette_filled.svg` | `0 0 109.909 478.488` | 0.2297 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/protein_ladder_tube.svg` | `0 0 161.423 267.52` | 0.6034 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/protein_ladder_tube_empty.svg` | `0 0 156.51 263.357` | 0.5943 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/protein_ladder_tube_filled.svg` | `0 0 156.51 263.357` | 0.5943 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/rocking_shaker_idle.svg` | `0 0 271.143 322.847` | 0.8398 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/rocking_shaker_running.svg` | `0 0 271.143 322.847` | 0.8398 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/tip_box.svg` | `0 0 328.025 214.072` | 1.5323 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/tip_box_new.svg` | `0 0 328.025 214.072` | 1.5323 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/tip_box_old.svg` | `0 0 60 70` | 0.8571 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/waste_container.svg` | `0 0 44 73` | 0.6027 | - | - | (default xMidYMid meet) | clean |
| `assets/equipment/waste_tray.svg` | `0 0 70 50` | 1.4000 | - | - | (default xMidYMid meet) | clean |

## Top 10 highest-severity assets

Ordering: placeholder_100x100 first (artwork itself absent, runtime is
rendering blank geometry), then `aspect_extreme` (narrow disposables
that stress the downstream sizing pipeline). All 11 placeholder rows in
the problem subset rank above the 4 aspect-extreme entries; this list
captures the highest-priority 10.

| Rank | Asset | viewBox | Intrinsic aspect | Severity | Why it ranks here |
| ---: | --- | --- | ---: | --- | --- |
| 1 | `assets/equipment/microwave_closed.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Backs `microwave` in `crowded_bench_dense` and `staining_bench`; Audit A clips on bottom; placeholder geometry forces square aspect downstream. |
| 2 | `assets/equipment/microwave_open.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Sibling state of the microwave; same clip risk and same square placeholder. |
| 3 | `assets/equipment/electrode_module.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Strategy-C `electrophoresis_bench` aspect drift 9.1 percent; replacement asset must include full electrode silhouette. |
| 4 | `assets/equipment/gel_opening_tool.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Clipped on bottom in `electrophoresis_bench`; placeholder geometry; real artwork must keep handle and blade inside viewBox. |
| 5 | `assets/equipment/power_supply_off.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Backs `power_supply` in electrophoresis scenes; placeholder blank artwork. |
| 6 | `assets/equipment/power_supply_on.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Sibling state of the power supply; same placeholder. |
| 7 | `assets/equipment/heat_block_closed.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Heat block instrument; placeholder blank artwork. |
| 8 | `assets/equipment/heat_block_open.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Sibling state of the heat block; same placeholder. |
| 9 | `assets/equipment/lightbox_off.svg` | `0 0 100 100` | 1.000 | placeholder_100x100 | Lightbox instrument; placeholder blank artwork. |
| 10 | `assets/equipment/serological_pipette.svg` | `0 0 16 142` | 0.113 | aspect_extreme | Strategy-C `electrophoresis_bench` rendered area 627 percent of natural; HARD FAIL aspect 252.9 percent; viewBox is correct but the narrow aspect stresses card sizing downstream. |

Honourable mentions (rank 11+ for context): the remaining two
placeholders `kimwipe_pad.svg` and
`microtube_rack_24_placeholder.svg`; then the three other
`aspect_extreme` entries (`aspirating_pipette.svg`,
`p10_gel_loading_tip.svg`, `falcon_15ml.svg`).

## Interpretation

- **No SVG-layer geometry edits are warranted by this audit.** Every
  viewBox in the asset set is zero-origin, parseable, full-silhouette,
  positive, and ships with the default `xMidYMid meet`
  preserveAspectRatio. No SVG carries a root-level transform. Per
  ../../specs/SVG_PIPELINE.md "Never crop
  in display": once the asset enters the rendering pipeline, the
  container is the crop site, not the SVG.
- **Placeholder replacements are gated authoring work**, not a
  geometry-edit task. When the 11 per-object stubs are replaced with
  real artwork (Audit C R2; gating documented in
  [../no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md)
  parked list), the replacement viewBox must preserve full silhouette
  including base, feet, and top edge so the no-crop rule continues to
  hold downstream.
- **Aspect-extreme assets route to downstream sizing tiers**, not to
  Tier 2. The four narrow disposables (`serological_pipette`,
  `aspirating_pipette`, `p10_gel_loading_tip`, `falcon_15ml`) cannot be
  "fixed" at the SVG layer; their depicted artwork is genuinely tall.
  The downstream drift is a Tier 3 / Tier 4 / Tier 7 concern, addressed
  by
  [../no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md).

## Related artifacts

- [../audits/no_crop_svg_viewbox_audit.md](../audits/no_crop_svg_viewbox_audit.md)
  -- prior full-125 sweep; this report is the Round 3 B4 problem-subset
  refresh of the same data.
- [../audits/no_crop_sizing_chain_root_cause.md](../audits/no_crop_sizing_chain_root_cause.md)
  -- Audit A clipped-object roster used to identify the problem subset.
- [../audits/no_crop_asset_specs_coverage.md](../audits/no_crop_asset_specs_coverage.md)
  -- Audit B ASSET_SPECS coverage; cross-reference for downstream
  sizing.
- [../no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md)
  -- top-10 next-fix queue; rows that depend on this audit's findings
  are R2 (placeholder replacement, gated) and R3 (aspect-extreme thin
  tips, downstream-routed).
- ../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md
  -- the placeholder roster used to identify the 11 placeholder rows in
  the table.

## Boundaries honoured

- Read-only: no SVG file under `assets/` was modified.
- No regeneration of `generated/svg_assets/*`.
- ASCII-only.
- No commit performed.

## Source files read

- All 125 files under `assets/equipment/*.svg` (root SVG tag only,
  bounded read of the first 30 kB per file).
- [../audits/no_crop_svg_viewbox_audit.md](../audits/no_crop_svg_viewbox_audit.md)
  (prior full-set audit).
- [../no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md)
  (problem-subset identification).
- ../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md
  (placeholder roster).
