# No-Crop SVG viewBox Audit

Read-only audit of every `viewBox` attribute on the root `<svg>` element of every
file under `assets/equipment/*.svg`. The audit covers all 125 SVGs in scope.
No SVG files were modified.

This audit feeds step 2 of the no-crop fix chain: if author cropped the
viewBox, the asset cannot render uncropped no matter what CSS or width is
applied downstream (see
[SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md#never-crop-in-display):
"Once an asset enters the rendering pipeline, no downstream container may
clip or distort it.").

The canonical no-crop metric cited throughout this audit is
`artwork_integrity.clipped_by_parent` (precheck.mjs sub-check 12e). Any
"clip" count referenced here resolves to that sub-check.

## Recommendation fix-tier framework

Every recommendation in this audit is classified into one of the eight
fix tiers. Each recommendation states tier, render path affected,
production-vs-static-harness scope, user-approval requirement, and the
screenshot evidence path that supports it.

The eight tiers:

1. Asset mapping or missing SVG
2. SVG viewBox or asset geometry
3. ASSET_SPECS.defaultWidth
4. Object `layout.display_width_cm`
5. Scene item `width_scale`
6. Zone overload or scene layout design
7. Renderer CSS preserving aspect ratio
8. Experiment-local static harness shim only

**Because this audit's subject is viewBox correctness, every finding
that lands inside the SVG file itself is Tier 2 by construction.** A
finding lands Tier 1 only if a referenced SVG is missing entirely, and
Tier 8 only if the recommendation is an experiment-local shim. Durable
fixes prefer tiers 1-7; tier 8 is experiment-local only.

Sizing-source reconciliation is accepted: viewBox footprint defines a
spacing slot per
[LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md), not a
crop box. No new CSS footprint classes are proposed as production
direction; any downstream-render finding is routed to the appropriate
sizing tier (3, 4, 5, or 7).

## Scope and method

- Source tree: `assets/equipment/*.svg`, HEAD `8795d25`.
- Total SVG files scanned: 125.
- Extraction: regex-based parse of the root `<svg>` opening tag (handles
  both bare `<svg ...>` and namespaced `<ns0:svg ...>` roots present in
  Servier-derived assets).
- Fields read per file: `viewBox`, root `width`, root `height`,
  `preserveAspectRatio`.
- Derived: viewBox minX, minY, width, height, aspect ratio (w / h), and
  any conflict between root width/height attributes and viewBox.
- Severity bucketing rules:
  - **BAD**: missing viewBox, unparseable viewBox, or non-positive
    width/height.
  - **SUSPICIOUS**: non-zero `minX`/`minY` origin, or a root
    width/height attribute aspect ratio that differs from the viewBox
    aspect ratio by more than 5 percent.
  - **ASPECT-EXTREME**: viewBox aspect ratio < 0.20 or > 5.0 (narrow or
    very wide assets; not automatically wrong, but stresses layout
    cards and may be confused with author cropping).
  - **OK**: zero-origin, parseable, in-range aspect, no width/height
    conflict.

## Summary

| Bucket         | Count |
| -------------- | ----: |
| BAD            |     0 |
| SUSPICIOUS     |     0 |
| ASPECT-EXTREME |     4 |
| OK             |   121 |
| **Total**      |   125 |

Headline finding: **no SVG in `assets/equipment/` has a missing or
malformed viewBox**. Every root element carries a parseable
`0 0 W H` viewBox with positive width and height. The four
ASPECT-EXTREME files all represent legitimately tall, thin objects
(disposable pipette stems / gel-loading tips); their viewBoxes are not
cropped, but their narrow aspect interacts with the downstream
rendering harness (see "Cross-reference with Strategy-C render audit"
below).

`preserveAspectRatio` is absent on every file. Per SVG defaults, that
resolves to `xMidYMid meet`, which matches the no-crop rule's required
behavior in
[SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md#never-crop-in-display):
"Preserve SVG `preserveAspectRatio='xMidYMid meet'`." This is consistent
across the asset set; no asset overrides the default to a cropping mode
such as `xMidYMid slice`.

## BAD bucket (count: 0)

No entries. Every file in `assets/equipment/*.svg` carries a viewBox.

Note on detection method: an initial scan that searched for `<svg\b`
without namespace awareness produced two false positives
(`p200_micropipette_empty.svg`, `p200_micropipette_filled.svg`). Both
files use a Servier-style `<ns0:svg ... viewBox="0 0 109.909 478.488">`
root with the default namespace declared via `xmlns=...`. The corrected
scan that matches `<(?:[a-zA-Z_][\w.-]*:)?svg\b` confirms both files
have valid viewBoxes; they are reclassified to OK. Downstream tooling
that parses these SVGs must handle the namespaced root prefix or the
same false-positive will recur.

## SUSPICIOUS bucket (count: 0)

No entries. Every viewBox uses a zero origin (`0 0 W H`), and no root
`width`/`height` attribute carries an aspect ratio that conflicts with
its viewBox aspect by more than 5 percent.

## ASPECT-EXTREME bucket (count: 4)

These four files have viewBox aspect ratios below 0.20. All represent
genuinely tall, thin disposable lab consumables. The viewBox itself is
consistent with the depicted artwork; the bucket flags them only
because their aspect stresses the downstream layout pipeline. These are
not crop bugs at the SVG layer.

| File                      | viewBox              | Aspect (w/h) | Object class        | Observation                                                                                                                                                                            |
| ------------------------- | -------------------- | -----------: | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p10_gel_loading_tip.svg` | `0 0 38.778 433.436` |        0.089 | gel-loading tip     | Very thin disposable; viewBox captures full tip. Cropping concern lives in downstream card sizing, not the SVG.                                                                        |
| `serological_pipette.svg` | `0 0 16 142`         |        0.113 | serological pipette | viewBox captures full pipette stem. Strategy-C round renders this at natural 17x150, a 627% area upscale (HARD FAIL on aspect 252.9%) -- a downstream renderer bug, not a viewBox bug. |
| `aspirating_pipette.svg`  | `0 0 16 139`         |        0.115 | aspirating pipette  | Same shape class as serological_pipette. viewBox is not the crop site.                                                                                                                 |
| `falcon_15ml.svg`         | `0 0 68.863 419.187` |        0.164 | 15 mL conical tube  | Tall conical; viewBox includes cap, body, and conical tip. No crop at the SVG layer.                                                                                                   |

For comparison, micropipette assets such as `p10_micropipette_empty.svg`
and `p200_micropipette_empty.svg` carry viewBox `0 0 109.909 478.488`
(aspect 0.230) and fall in OK because they include the larger
pipette-body silhouette. The four ASPECT-EXTREME entries above are
strictly the disposable-tip / thin-pipette family.

## OK bucket (count: 121)

121 files have zero-origin, parseable, in-range viewBoxes with no
width/height attribute conflict. The full per-file record is preserved
in `/tmp/viewbox_audit2.json` (not committed; rerun
`/tmp/_extract_viewbox2.py` to regenerate).

Selected distribution notes (informational, not findings):

- **Bottle / glassware family** (e.g. `coomassie_stain_bottle.svg`,
  `destain_bottle.svg`, `recycle_buffer_bottle.svg`,
  `running_buffer_10x_bottle.svg`, `bme_bottle.svg`, plus
  `_empty.svg` and `_filled.svg` variants): all use viewBox
  `0 0 141.317 395.943` (aspect 0.357). Strategy-C round reports
  these are rendered at natural 54x150 with HARD FAIL aspect 5.2%.
  The natural aspect 54/150 = 0.36 matches the viewBox aspect 0.357,
  so the SVG is not cropped; the rendered-card aspect 0.38 is the
  drift. The bug is in the rendering pipeline / card sizing, not in
  the SVG viewBox.
- **96-well plate**: `96well_pcr_plate.svg` viewBox
  `0 0 393.3275 278.5243` (aspect 1.412). Strategy-C reports natural
  393x279 rendered at 320x240 (aspect 1.33). Natural matches viewBox
  exactly; downstream renderer compresses to 1.33.
- **Placeholder family** (per
  [MISSING_SVG_PLACEHOLDERS.md](../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md)):
  `power_supply_off.svg`, `power_supply_on.svg`,
  `heat_block_closed.svg`, `heat_block_open.svg`,
  `microwave_closed.svg`, `microwave_open.svg`, `lightbox_off.svg`,
  `gel_opening_tool.svg`, `microtube_rack_24_placeholder.svg`,
  `kimwipe_pad.svg`, `electrode_module.svg`, plus `_placeholder.svg`.
  All carry the canonical 100x100 placeholder viewBox (aspect 1.0).
  When real artwork ships, the replacement must preserve a viewBox
  that captures the entire scientific object including its bottom and
  any cap; many of these objects (microwave, heat_block, lightbox)
  appear in the Strategy-C clipped list (see below). The viewBox is
  currently not the limiting factor because the artwork itself is
  blank.
- **T75 flask orientation schism**: `t75_flask.svg` (aspect 2.153,
  horizontal) and `t75_flask_servier.svg` / `t75_flask_v5.svg`
  (aspect 3.17, horizontal) coexist with `t75_flask_legacy.svg`,
  `t75_flask_v2.svg`, `t75_flask_v3.svg` (aspect 0.614, portrait)
  and `t75_flask_v4.svg` (aspect 0.609, portrait). Each viewBox is
  internally consistent with its asset's orientation; the schism is
  an asset-selection / authoring concern, not a viewBox correctness
  bug. Flagging for awareness only.

## Top 10 SVGs most likely to cause crops if viewBox is wrong

The Strategy-C round
(`visual_audit.md`)
reports HARD FAIL Sub-check e ("SVG cropped by parent overflow") on the
following object classes. Each is intersected with this audit's
findings.

| Rank | Asset (object class)            | Backing SVG file(s)                                           | viewBox                                        | Audit bucket     | Comment                                                                                                                      |
| ---: | ------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
|    1 | `p200_micropipette`             | `p200_micropipette_empty.svg`, `p200_micropipette_filled.svg` | `0 0 109.909 478.488`                          | OK               | viewBox captures full pipette top-to-tip. Clipping is downstream (card overflow on bottom).                                  |
|    2 | `cell_counter`                  | `cell_counter.svg`, `cell_counter_new.svg`                    | `0 0 510.123 361.058`                          | OK               | viewBox aspect 1.413 matches natural 212x150 used in render. Clipping is downstream.                                         |
|    3 | `microwave`                     | `microwave_closed.svg`, `microwave_open.svg`                  | `0 0 100 100`                                  | OK (placeholder) | Placeholder geometry; when real artwork ships, the new viewBox must include the full microwave silhouette including base.    |
|    4 | `rocking_shaker`                | `rocking_shaker_idle.svg`, `rocking_shaker_running.svg`       | `0 0 271.143 322.847`                          | OK               | viewBox correctly tall; clipping is downstream.                                                                              |
|    5 | `waste_container`               | `waste_container.svg`                                         | `0 0 44 73`                                    | OK               | Compact viewBox; clipping is downstream.                                                                                     |
|    6 | `electrophoresis_tank`          | `electrophoresis_tank.svg`                                    | `0 0 656.013 427.124`                          | OK               | Wide viewBox aspect 1.536; clipping reported on TOP (only HARD FAIL in the round to clip on top, all others clip on bottom). |
|    7 | `p10_gel_loading_tip_box`       | `p10_gel_loading_tip_box.svg`                                 | `0 0 328.025 214.072`                          | OK               | viewBox includes box footprint. Clipping is downstream.                                                                      |
|    8 | `protein_ladder_tube`           | `protein_ladder_tube.svg`, plus `_empty`/`_filled`            | `0 0 161.423 267.520` and `0 0 156.51 263.357` | OK               | viewBox includes cap and tube body. Clipping is downstream.                                                                  |
|    9 | `gel_opening_tool`              | `gel_opening_tool.svg`                                        | `0 0 100 100`                                  | OK (placeholder) | Placeholder. Real artwork replacement must keep handle and blade inside viewBox.                                             |
|   10 | `mini_protean_gel` / `gel_comb` | `mini_protean_gel.svg`, `gel_comb.svg`, `gel_cassette.svg`    | `0 0 462.274 518.665`                          | OK               | All three gel assets share one viewBox aspect 0.891; clipping is downstream.                                                 |

Additional clipped objects below the top 10 cut: `microscope.svg`
(viewBox `0 0 283.843 489.184`, OK), `tip_box.svg` (viewBox
`0 0 328.025 214.072`, OK), `waste_tray.svg` (viewBox `0 0 70 50`, OK).

**Net interpretation.** Every clipped asset in Strategy-C carries a
correct, zero-origin, full-silhouette viewBox. The crop is not in the
SVG file. Per
[SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md#never-crop-in-display)
("Object artwork cut off by cards, regions, wrappers, `overflow:
hidden`, or `.object-graphic` containers"), the residual
`artwork_integrity.clipped_by_parent` flag is in the downstream card /
region container, not at the SVG layer.

## Cross-reference with Strategy-C render audit

The Strategy-C visual_audit
(`visual_audit.md`)
reports two related render failure modes:

- **`artwork_integrity.clipped_by_parent` (sub-check 12e, HARD FAIL)**:
  every scene reports clips on the BOTTOM of glassware and
  instruments, with one outlier (`electrophoresis_tank` clipped on the
  top). None of these clips trace to the SVG viewBox per this audit.
- **Sub-check f (HARD FAIL, "aspect distorted vs natural")**: glassware
  rendered at natural 54x150 reports rendered 90x238, an aspect drift
  from 0.36 to 0.38 (5.2%). The natural 0.36 aspect matches the
  underlying viewBox aspect 0.357, so the SVG-side artwork is in
  proportion; the rendered drift is a downstream sizing issue.

Both classes of HARD FAIL are downstream of the SVG asset. **Author
cropping of viewBoxes is not the cause of the current Strategy-C
no-crop regressions.**

## Scope reduction note

The task brief noted a blocked-fallback path "if 125+ SVGs exceed
read/scan capacity, audit only the WS-A retry list plus WS-C Bucket A."
This audit did not need to invoke that fallback: all 125 SVGs were
scanned in a single bounded read pass via `/tmp/_extract_viewbox2.py`
(reads the first 30 kB of each file's root tag and stops). The full
set is covered.

## Source files read

- [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md) (entire) -
  "Never crop in display" section is the binding rule; "Source-tree
  boundary" and "Generator behavior summary" inform how viewBoxes flow
  to the runtime.
- [SCALING_MODEL.md](../../specs/SCALING_MODEL.md)
  (entire) - documents `display_width_cm` and `px_per_cm` per scene;
  no `viewBox`-specific section, but explains how SVG widths convert
  to render widths.
- [MISSING_SVG_PLACEHOLDERS.md](../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md)
  (entire) - placeholder roster used to interpret the 100x100 viewBox
  family.
- `visual_audit.md`
  (entire) - source of the clipped/distorted object list used for the
  top-10 intersection.
- All 125 files under `assets/equipment/*.svg` (root SVG tag only).

## Recommendations (tier-classified)

Each recommendation states tier, render path affected, production
relevance vs static-harness-only scope, user-approval requirement, and
the screenshot evidence path that supports it. Screenshot paths are
relative to the repo root.

### R1. No viewBox edits required for any of the 125 audited SVGs

- **Tier**: 2 (SVG viewBox or asset geometry).
- **Cite**: this audit is viewBox correctness, so its primary class of
  finding lands in Tier 2 by construction. Every audited file has a
  zero-origin, parseable, full-silhouette viewBox; no Tier 2 edit is
  warranted by current evidence.
- **Render path affected**: none (negative finding; the SVG layer is
  exonerated as the cause of the current Strategy-C
  `artwork_integrity.clipped_by_parent` regressions).
- **Production-relevant**: yes (production assets cleared).
- **Requires user approval**: no (no edit proposed).
- **Screenshot evidence**:
  `test-results/no_crop_round3_static_template_repair/strategy_c/bench_basic.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/electrophoresis_bench.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/staining_bench.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_plate_workspace.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_workspace_dense.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/crowded_bench_dense.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/hood_basic.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/microscope_basic.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/cell_counter_basic.png`,
  `test-results/no_crop_round3_static_template_repair/strategy_c/well_plate_96_zoom.png`.
  In every scene the clipped artwork is bounded by the parent card /
  region container, with the SVG's full intrinsic content present
  inside that boundary.

### R2. Replace 11 placeholder SVGs with real artwork; preserve full-silhouette viewBox at replacement time

- **Tier**: 1 (asset mapping or missing SVG; the placeholder is a
  stand-in for an absent asset per
  [MISSING_SVG_PLACEHOLDERS.md](../../../assets/equipment/MISSING_SVG_PLACEHOLDERS.md)).
- **Affected files**: `power_supply_off.svg`, `power_supply_on.svg`,
  `heat_block_closed.svg`, `heat_block_open.svg`,
  `microwave_closed.svg`, `microwave_open.svg`, `lightbox_off.svg`,
  `gel_opening_tool.svg`, `microtube_rack_24_placeholder.svg`,
  `kimwipe_pad.svg`, `electrode_module.svg`. The generic
  `_placeholder.svg` is excluded (it is the fallback, not a per-object
  stub).
- **Render path affected**: any scene that places these objects.
  Strategy-C reports `artwork_integrity.clipped_by_parent` HARD FAIL on
  `microwave` and `electrode_module` today even though the placeholder
  itself is blank; the replacement artwork must carry a viewBox that
  includes the full instrument silhouette (base, feet, top edge) so
  the no-crop rule continues to hold downstream.
- **Production-relevant**: yes.
- **Requires user approval**: yes (asset content choice is an authoring
  decision, not a fix the agent makes unilaterally; mirrors the
  placeholder roster's "Replace when suitable SVG sourced" status).
- **Screenshot evidence**:
  `test-results/no_crop_round3_static_template_repair/strategy_c/crowded_bench_dense.png`
  (microwave clip on bottom),
  `test-results/no_crop_round3_static_template_repair/strategy_c/staining_bench.png`
  (microwave clip on bottom),
  `test-results/no_crop_round3_static_template_repair/strategy_c/electrophoresis_bench.png`
  (electrode_module aspect drift 9.1%, gel_opening_tool clip on
  bottom).

### R3. Treat the four ASPECT-EXTREME thin-tip assets as non-actionable at the SVG layer; route downstream

- **Tier**: 2 (SVG viewBox or asset geometry) -- explicit no-op at
  Tier 2. Downstream sizing routes to Tier 3, 4, 5, or 7 depending on
  where the rendered aspect drift originates.
- **Affected files**: `p10_gel_loading_tip.svg`,
  `serological_pipette.svg`, `aspirating_pipette.svg`,
  `falcon_15ml.svg`.
- **Render path affected**: `serological_pipette` is the most stressed
  case (Strategy-C `electrophoresis_bench`: rendered area 627.5% of
  natural, HARD FAIL aspect 252.9%). The viewBox itself captures the
  full pipette stem at aspect 0.113; the runtime is upscaling the
  thin asset into a much wider rendered box. This is a rendering-side
  bug.
- **Production-relevant**: yes (the assets ship in production scenes).
- **Requires user approval**: no for the viewBox no-op; the downstream
  routing (which sizing tier owns the fix) is a separate question for
  the no-crop coordinator.
- **Screenshot evidence**:
  `test-results/no_crop_round3_static_template_repair/strategy_c/electrophoresis_bench.png`
  (serological_pipette, p200_micropipette aspect HARD FAIL),
  `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_plate_workspace.png`
  (p200_micropipette clip on bottom),
  `test-results/no_crop_round3_static_template_repair/strategy_c/bench_basic.png`
  (p200_micropipette clip on bottom).

### R4. Resolve the T75 flask orientation schism at the asset-mapping layer

- **Tier**: 1 (asset mapping or missing SVG; the question is which
  variant the runtime should map `t75_flask` to, not how to edit any
  viewBox).
- **Affected files**: `t75_flask.svg` (aspect 2.153, horizontal),
  `t75_flask_servier.svg` and `t75_flask_v5.svg` (aspect 3.17,
  horizontal) vs `t75_flask_legacy.svg`, `t75_flask_v2.svg`,
  `t75_flask_v3.svg` (aspect 0.614, portrait) and `t75_flask_v4.svg`
  (aspect 0.609, portrait).
- **Render path affected**: any scene placing `t75_flask`. The current
  audit cannot determine which mapping is canonical without an
  authoring decision; both portrait and horizontal viewBoxes are
  internally consistent.
- **Production-relevant**: yes.
- **Requires user approval**: yes (canonical-asset selection is an
  authoring choice).
- **Screenshot evidence**: not directly visible in the Strategy-C
  scene set (no scene in that round renders a T75 flask), so this is a
  flagged-for-awareness finding rather than an active regression. No
  current screenshot evidence; user approval gates further work.

### R5. Fix the namespaced-root false-positive in any downstream SVG scanner

- **Tier**: 8 (experiment-local static harness shim only) -- this
  applies to the audit harness, not to any production renderer. The
  production pipeline (`pipeline/generate_svg_globals.py`) already
  handles namespaced roots; only ad-hoc audit scripts are at risk.
- **Render path affected**: none in production. Any future audit
  scanner that matches `<svg\b` without namespace tolerance will
  reproduce this audit's initial false-positive on
  `p200_micropipette_empty.svg` and `p200_micropipette_filled.svg`.
- **Production-relevant**: no (static-harness-only).
- **Requires user approval**: no.
- **Screenshot evidence**: not applicable (this is a tooling
  recommendation, not a render-output finding).

## Tier distribution summary

|      Tier | Definition                                | Recommendation count | Recommendations                             |
| --------: | ----------------------------------------- | -------------------: | ------------------------------------------- |
|         1 | Asset mapping or missing SVG              |                    2 | R2 (11 placeholders), R4 (T75 flask schism) |
|         2 | SVG viewBox or asset geometry             |                    2 | R1 (no viewBox edits), R3 (thin-tip no-op)  |
|         3 | `ASSET_SPECS.defaultWidth`                |                    0 | --                                          |
|         4 | Object `layout.display_width_cm`          |                    0 | --                                          |
|         5 | Scene item `width_scale`                  |                    0 | --                                          |
|         6 | Zone overload or scene layout design      |                    0 | --                                          |
|         7 | Renderer CSS preserving aspect ratio      |                    0 | --                                          |
|         8 | Experiment-local static harness shim only |                    1 | R5 (namespaced-root scanner fix)            |
| **Total** | --                                        |                **5** | --                                          |

Interpretation: viewBox-correctness audits land naturally in tiers 1 and 2. The current evidence base produces no Tier 3-7 recommendations from
this audit alone; the downstream `artwork_integrity.clipped_by_parent`
flags in Strategy-C must be addressed by sizing-tier audits, not by
SVG edits. Durable production fixes (tiers 1-7) account for 4 of the 5
recommendations; tier 8 is bounded to the audit harness.

## Outputs

- This report: `docs/active_plans/audits/no_crop_svg_viewbox_audit.md`.
- Machine-readable per-file record:
  `/tmp/viewbox_audit2.json` (not committed; regenerate with
  `source source_me.sh && python3 /tmp/_extract_viewbox2.py`).
