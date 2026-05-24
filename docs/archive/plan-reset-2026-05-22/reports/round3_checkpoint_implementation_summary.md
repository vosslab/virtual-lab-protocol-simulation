# Round 3 checkpoint implementation summary

Status: checkpoint (doc-only; no production code, YAML, CSS, or test edits).
Date: 2026-05-21
HEAD: 8795d25
Workstream: B (implementation summary)
Round 3 code and CSS changes summarized below are already committed to HEAD.
Relevant commits:

- `c373a59` M1 no-crop reconciliation bundle (object YAML renames, Strategy
  C `bench.css`, `render_stress_to_html.py`, `object_footprints.yaml`, audit
  and decision artifacts).
- `a7ab89c` package.json + ASSET_SPECS update (7 new + 2 modified entries in
  `src/asset_specs.ts`).
- `d42c3f6` starter-repo updates (out of scope for this no-crop summary;
  cited for completeness only).

Canonical crop metric: `artwork_integrity.clipped_by_parent` (precheck.mjs
sub-check 12e). See
[no_crop_precheck_semantics.md](../audits/no_crop_precheck_semantics.md)
section 4 for the canonical baseline table.

## Scope

This note summarizes what landed during Round 3 no-crop SVG work, names the
artifacts each change moved, and separates production-relevant changes from
static-template-only changes. It does not propose new fixes; the active queue
lives in
[no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md).

## Strategy C CSS effect on the static-template baseline

The Strategy C dominant lever
(bench.css
lines 150-161, 103-111) removes `overflow: hidden` and `max-height: 100%` from
`.placement` and switches `.region--work_surface` to `overflow: visible`, so
the placement card stops cropping its child artwork. The viewport remains the
outer clip boundary so `off_page` still captures genuine viewport exits.

Effect on `artwork_integrity.clipped_by_parent`:

- templates: 41 -> 21 clipped objects.
- gold: 78 -> 38 clipped objects.

Source artifact:
`test-results/no_crop_round3_static_template_repair/strategy_c/visual_audit.json`
with companion summary
`test-results/no_crop_round3_static_template_repair/strategy_c/crops_summary.txt`.
Audit E section 4 records the same baseline.

## render_stress_to_html.py recovery

The experiment-local static visual-test renderer
`render_stress_to_html.py`
had been wiped by a pre-M1 git reset (per the c373a59 commit message: "the
redo work landed inside M1"). It was reconstructed in place from the frozen
rendered artifacts under
`experiments/css_native_layout/stress_scenes/rendered/*.html` plus the
five-region order encoded in `bench.css`, and is now in HEAD as part of
c373a59.

Scope: experiment-local only. The reconstructed file declares itself as a
static visual-test renderer, names the experiment-local stress and gold
scene YAML under
`experiments/css_native_layout/stress_scenes/{gold,generated}/*.yaml` as its
input, and names `experiments/css_native_layout/precheck.mjs` as its
downstream consumer. It does NOT consume canonical scene YAML under
`content/base_scenes/` and is not invoked by the production runtime.

The footprint-class mapping it consumes lives at
`object_footprints.yaml`,
which the file header labels verbatim "Experimental CSS-native visual-test
mapping. Not production schema." The renderer falls back to `small-tool` for
unmapped `object_name` values.

## Sizing-source reconciliation

Per
[no_crop_round3_sizing_source_reconciliation.md](../decisions/no_crop_round3_sizing_source_reconciliation.md),
four candidate "footprint vocabulary" terms have been downgraded to
experiment-local shims rather than promoted to the durable sizing surface.
The durable sizing chain is anchored on the canonical `docs/specs/` surfaces:

- `SCALING_MODEL.md` for
  `display_width_cm` and `SCENE_PX_PER_CM`.
- `LAYOUT_ENGINE.md` sections
  "Asset specs", "Scene items", "Footprints", and "Layout invariant: no
  clipping or distortion".
- `SVG_PIPELINE.md` section "Never
  crop in display".
- `SCENE_VOCABULARY.md` and
  `SCENE_YAML_FORMAT.md` for
  `placement`, `object_name`, and `width_scale`.
- `OBJECT_VOCABULARY.md` and
  `OBJECT_YAML_FORMAT.md` for
  `layout.display_width_cm`.

The four downgraded candidates are footprint CSS class labels:
`footprint--tall-glassware`, `footprint--portrait-tool`,
`footprint--landscape-plate`, and `footprint--zoom-view`. They remain
permitted only as labels in the experiment-local static harness
(`experiments/css_native_layout/styles/bench.css` and
`experiments/css_native_layout/object_footprints.yaml`); they do not enter
the production renderer, the layout engine, the asset spec table, or any
scene or object YAML schema.

The decision note records the user directive verbatim that permanent CSS
footprint classes are the wrong direction; the durable fix flows through the
existing scaling model and SVG pipeline.

## Exp 9 ASSET_SPECS additions

`asset_specs.ts` gained 7 new entries and 2
modified entries in commit a7ab89c. tsc PASS confirmed by the
`check_codebase.sh` typecheck gate.

New entries:

- `p200_micropipette` (defaultWidth 3, labelWidth 5, anchorYOffset 0).
- `microwave` (defaultWidth 14, labelWidth 7, widthScale 1.0).
- `rocking_shaker` (defaultWidth 12, labelWidth 8, widthScale 1.0).
- `mini_protean_gel` (defaultWidth 12, labelWidth 8).
- `gel_comb` (defaultWidth 6, labelWidth 5).
- `gel_opening_tool` (defaultWidth 5, labelWidth 6).
- `p10_gel_loading_tip_box` (defaultWidth 9, labelWidth 8).

Modified entries:

- `cell_counter`: defaultWidth 12 -> 14 (widthScale 1.0 unchanged).
- `microscope`: defaultWidth 8 -> 10 (widthScale 0.9 unchanged).

These are Tier 3 fixes per the queue tier framework
([no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md) rows
1-4), and they route through the production runtime: scene object name ->
asset name -> `ASSET_SPECS.defaultWidth` -> layout engine computed box ->
renderer.

## Why Exp 9 did not move the static-template precheck (delta = 0)

The static-template precheck baseline at
`test-results/no_crop_round3_static_template_repair/strategy_c/visual_audit.json`
did not move after the Exp 9 ASSET_SPECS additions. The recorded delta is
zero on the static-template path even though 9 production-relevant entries
were added or tuned.

Root cause: the templates under
`experiments/css_native_layout/stress_scenes/{rendered,templates}/*.html`
are hand-authored static HTML files. They embed asset `<img>` tags with
literal `style="width:..."` markup or fixed footprint CSS classes. They do
NOT re-render from `ASSET_SPECS` at load time and do NOT invoke the layout
engine. Adding or tuning `ASSET_SPECS` entries cannot change the rendered
geometry of a frozen hand-authored HTML file.

Implication: the Exp 9 changes are still correct fixes at the source layer.
Their effect appears in the production runtime (the layout engine consults
`ASSET_SPECS.defaultWidth` when computing a placement's pixel box), not in
the static-template precheck baseline. The static-template baseline only
moves when (a) Strategy C CSS changes apply to the templates, (b) templates
are re-rendered through `render_stress_to_html.py` against updated
footprint mappings, or (c) the templates are reauthored.

Do not regress to interpreting a flat static-template delta as evidence
that an `ASSET_SPECS` fix is wrong. Fix correctness lives at the source
layer; static-template signal is downstream of a separate rendering path.

## Renamed object YAMLs

Two object YAMLs were renamed via `git mv` (landed in c373a59) to align
`asset_name` with canonical SVG basenames:

- conical_15ml.yaml.
- sharps_container.yaml.

These renames are production-relevant: they fix the `asset_name` lookup
that the production SVG loader uses (per
`SVG_PIPELINE.md` "Four-layer flow").
They do not affect the static-template precheck baseline for the same
reason as the ASSET_SPECS changes.

## Production-relevant vs static-template-only matrix

| change                                                                       | layer touched                               | production-relevant            | static-template-relevant            | precheck-baseline movement        |
| ---------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------ | ----------------------------------- | --------------------------------- |
| Strategy C CSS (`bench.css` `.placement` / `.region--work_surface` overflow) | experiment-local static harness CSS         | NO (experiment-local)          | YES                                 | templates 41 -> 21; gold 78 -> 38 |
| `render_stress_to_html.py` reconstruction                                    | experiment-local static renderer            | NO (experiment-local)          | YES (enables re-render)             | none directly; restores tooling   |
| `object_footprints.yaml` and `footprint--*` CSS class labels                 | experiment-local static-harness shim        | NO (downgraded to Tier 8 shim) | YES                                 | none beyond Strategy C            |
| `ASSET_SPECS` 7 new + 2 modified entries (`src/asset_specs.ts`)              | production runtime (layout engine consumer) | YES                            | NO (frozen HTML does not re-render) | delta = 0 on static template      |
| `conical_15ml.yaml` and `sharps_container.yaml` renames                      | production runtime (SVG loader)             | YES                            | NO (frozen HTML does not re-render) | delta = 0 on static template      |

## Source files read

- bench.css
- `render_stress_to_html.py`
- `object_footprints.yaml`
- `asset_specs.ts`
- conical_15ml.yaml
- sharps_container.yaml
- [no_crop_round3_next_fix_queue.md](../no_crop_round3_next_fix_queue.md)
- [no_crop_round3_sizing_source_reconciliation.md](../decisions/no_crop_round3_sizing_source_reconciliation.md)
- [no_crop_asset_specs_coverage.md](../audits/no_crop_asset_specs_coverage.md)
- [no_crop_object_sizing_coverage.md](../audits/no_crop_object_sizing_coverage.md)
- [no_crop_precheck_semantics.md](../audits/no_crop_precheck_semantics.md)
- [no_crop_sizing_chain_root_cause.md](../audits/no_crop_sizing_chain_root_cause.md)
- [no_crop_svg_viewbox_audit.md](../audits/no_crop_svg_viewbox_audit.md)
