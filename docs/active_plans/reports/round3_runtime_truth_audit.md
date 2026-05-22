# Round 3 runtime-truth audit (Workstream A1)

Date: 2026-05-22
Owner: A1 audit pass (read-only, no production source edits)
Plan ref: `~/.claude/plans/and-familiarize-yourself-with-magical-whale.md` Round 3 A1
Artifacts: `test-results/round3_runtime_truth/` (PNG + JSON)

## Purpose

A1 is the gate for Batch D. Round 2 reported approximately 101 cropped scientific SVG assets via static-template precheck. The question A1 must answer is whether those crops are present in the production runtime path (`file://dist/<protocol>.html` -> `runtime.bundle.js` -> `loadAndMountByProtocolName`) or whether they are static-template artifacts that the runtime does not actually render.

## Method

1. Built dist: `bash build_github_pages.sh` (exit 0). Built per-protocol HTML via `pipeline/build_protocol_html.py` and the runtime IIFE bundle via `pipeline/build_runtime_bundle.sh` (`dist/runtime.bundle.js`, 2.4 MB).
2. Wrote `tests/playwright/_temp_runtime_truth.mjs` (temporary, deletable). It loads `file://dist/<protocol>.html`, waits 3.5 s for the async `SceneRuntime.loadAndMountByProtocolName`, inspects `globalThis.__RUNTIME_PROTOCOL_CONFIG`, captures one full-page screenshot per protocol at 1280 x 900, and, when the initial scene differs from the target scene, clicks the first interaction target to drive the `SceneChange` and captures a second screenshot.
3. Selected scenes by walking the categories required by the plan: bench / composition, instrument, zoom / detail, and a "gold-listed and known to load through runtime" pick.

## Scene selection and rationale

The first selection pass picked the highest-crop-suspect scenes named in the Round 3 fix queue: `electrophoresis_bench`, `staining_bench`, `cell_counter_workspace`, `microscope_view`. **All four failed to mount in the production runtime** (artifact: `test-results/round3_runtime_truth/runtime_truth_summary_v1_failed_picks.json`). Three failed at `inferInitialScene` with "Cannot determine scene for target object ..." (entry-step ambiguity), and `passage_hood_detachment` failed with `scene "microscope_view" not found in SCENE_CATALOG`. This is itself a finding (see Finding 1 below) and was recorded rather than worked around.

The second pass was constrained to the 9 protocols that the walker audit (`test-results/_walker_audit/audit_report.md`, 2026-05-17) reports as PASS, so the protocol can be guaranteed to drive its initial scene through real runtime. Final 4 picks:

| # | Protocol | Target scene | Category | Rationale |
| --- | --- | --- | --- | --- |
| 1 | `mtt_reagent_prep` | `mtt_reagent_prep_bench_workspace` | bench / composition | A walker-PASS bench scene containing multiple bottle / tube / micropipette assets that map to the crop-implicated asset families in the queue (bottle, microcentrifuge tube, micropipette). |
| 2 | `mtt_solubilization_readout` | `mtt_solubilization_readout_plate_reader_workspace` | instrument (plate reader, with 96-well plate zoom card) | Walker-PASS, exercises a `SceneChange` into a plate-reader instrument scene. Initial scene `mtt_solubilization_readout_bench_workspace` plus post-click capture of the reader workspace. |
| 3 | `sdspage_attach_lid_and_leads` | `sdspage_attach_lid_and_leads_workspace` | instrument (electrophoresis tank with lid + leads) | Walker-PASS. Closest available passing protocol to the gold-listed `electrophoresis_bench` family; same asset cluster (tank, lid, electrodes) without the entry-step ambiguity that blocks `sdspage_assemble_electrode_module`. |
| 4 | `sdspage_heat_denature_samples` | `sdspage_heat_denature_samples_workspace` | instrument zoom / detail (heat block) | Walker-PASS. Acts as the zoom/detail pick: scene focuses on the heat block instrument and uses a placeholder dashed-box equipment SVG, which exposes the rendering pipeline cleanly. |

The plan asked for a "scene that is both gold-listed and known to load through runtime" as an optional fifth pick. Among the protocols whose initial scene name matches a gold-listed scene from `docs/active_plans/active/round3_checkpoint_next_action_queue.md` (`electrophoresis_bench`, `staining_bench`, `crowded_bench_dense`, `drug_dilution_plate_workspace`, `cell_counter_basic`, `microscope_basic`), none mounted in the runtime (Finding 1). The optional fifth pick is therefore omitted; pick 3 (`sdspage_attach_lid_and_leads_workspace`) is the nearest substitute since it loads the same gold-listed asset family (tank + lid + electrodes) through real runtime.

## Screenshots

All under `test-results/round3_runtime_truth/`.

| Scene | File |
| --- | --- |
| `mtt_reagent_prep_bench_workspace` (initial) | `mtt_reagent_prep_bench_workspace_initial.png` |
| `mtt_solubilization_readout_bench_workspace` (initial) | `mtt_plate_reader_workspace_initial.png` |
| `mtt_solubilization_readout_plate_reader_workspace` (post first click) | `mtt_plate_reader_workspace_after_entry.png` |
| `sdspage_attach_lid_and_leads_workspace` (initial) | `sdspage_attach_lid_workspace_initial.png` |
| `sdspage_heat_denature_samples_workspace` (initial) | `sdspage_heat_block_workspace_initial.png` |

V1 failed-pick screenshots are also retained for evidence of Finding 1:

| Failed-pick scene | File |
| --- | --- |
| `electrophoresis_bench` (mount failed) | `electrophoresis_bench_initial.png` |
| `staining_bench` (mount failed) | `staining_bench_initial.png` |
| `cell_counter_workspace` (mount failed) | `cell_counter_workspace_initial.png` |
| `microscope_view` (scene missing from SCENE_CATALOG) | `microscope_view_initial.png` |

Failure modes for V1 picks recorded in `runtime_truth_summary_v1_failed_picks.json` and `runtime_truth_summary.json`.

## Per-scene crop review (human review of PNGs)

Methodology: visually inspect each rendered scene at 1280 x 900 and count visible cropped or aspect-distorted scientific SVG assets per the PRIMARY_DESIGN.md "Visual integrity" rule. The review counts assets whose artwork itself is cropped or distorted; pure label overflow is recorded separately as it is a label / layout failure, not a crop of the scientific SVG.

### Scene 1: mtt_reagent_prep_bench_workspace

Asset-crop count: 0 visible cropped scientific SVG assets.

Observation: scientific SVG assets are present but rendered very small (a bottle silhouette is a small grey thumbnail; "tube" / "well plate" entries render as solid-green outlined rounded rectangles with no internal artwork, suggesting placeholder SVG rather than real glassware). Labels are rendered at extreme size, multiple labels overlap each other, and text overflows the viewport ("vorte..." on the right edge, "soluti..." extending past the right edge). No scientific asset is partially clipped at a card boundary; the issue is that the assets are not large enough to be cropped.

Asset notes:
- `bottle` asset name -> tiny grey bottle silhouette (visible, not cropped)
- "MTT solution" tube -> rendered as green rounded rectangle (placeholder)
- "vortex" -> partially visible green rounded rectangle near right edge
- "vial(s) PBS" -> not visibly distinguishable; labels collide

### Scene 2: mtt_solubilization_readout_plate_reader_workspace (post first click)

Asset-crop count: 0 visible cropped scientific SVG assets.

Observation: post-`SceneChange` capture shows a grey rectangle with vertical hash marks (96-well plate placeholder) plus a small bottle and a green ring. Labels "DMSO container", "vortex", "Micropi..." are massively oversized and clip the right edge of the viewport. The plate placeholder itself is not cropped; it is centered and complete.

### Scene 3: sdspage_attach_lid_and_leads_workspace

Asset-crop count: 0 visible cropped scientific SVG assets.

Observation: assets render as small green rounded rectangles. A "Power Supply (off)" placeholder label panel sits in the upper right. Text labels for many items collide ("electrolyte", "Gel...", "lid", "sealed cell", "PRIMER"), and the lid/lead asset cluster does not resolve to recognizable artwork. No specific asset is cropped at a container boundary.

### Scene 4: sdspage_heat_denature_samples_workspace

Asset-crop count: 0 visible cropped scientific SVG assets.

Observation: scene shows a small green rounded rectangle (representing the heat block sample slot), a small green ring, a dashed-outline placeholder labeled "Heat Block (closed)", and very large overlapping labels ("Heat Block", "ladder", "slot)"). The dashed placeholder is intact, not cropped.

## Render-path consumption table

Evidence is `git ls-files 'src/**/*.ts' | xargs grep -n <key>`; rows cite `file:line`.

| Key | Consumed by current runtime? | Evidence |
| --- | --- | --- |
| `ASSET_SPECS.defaultWidth` | NO (legacy table absent; only the `defaultWidth` field on a dynamically built `AssetSpec`). The legacy `ASSET_SPECS` table referenced repeatedly in `docs/active_plans/audits/no_crop_asset_specs_coverage.md` is no longer present in `src/`. The field `AssetSpec.defaultWidth` is built per object from `objectSpec.layout.default_width` (or default 15) and consumed in layout math. | `src/scene_runtime/layout/adapter.ts:165` (`const defaultWidth = layoutConfig.default_width \|\| 15;`); `src/scene_runtime/layout/types.ts:46`; `src/scene_runtime/layout/layout_engine.ts:261` and `:575` (read `fpSpec.defaultWidth`). |
| `layout.display_width_cm` | NO. Token `display_width_cm` does not appear in any `src/**/*.ts` file. | `git ls-files 'src/**/*.ts' \| xargs grep -ln "display_width\|displayWidth"` returns only `adapter.ts`, `layout_engine.ts`, `layout/types.ts`, `scene_runtime/types.ts`, all matching `default_width` / `defaultWidth`, not `display_width_cm`. No occurrence of the literal `display_width_cm`. |
| `width_scale` | NO (read), YES (typed). The TypeScript type system declares `widthScale` on `SceneItem` and on the optional `SceneItemSpec`, but the adapter hard-codes `widthScale: 1.0` for every item with the inline comment "Default scale; scene authors can override via placement.position.scale". `placement.position.scale` is never read. Layout engine reads `item.widthScale` (always 1.0). | `src/scene_runtime/layout/adapter.ts:152` (`widthScale: 1.0, // Default scale; scene authors can override via placement.position.scale`); `src/scene_runtime/layout/types.ts:32` and `:49`; consumers at `layout_engine.ts:261, 264, 566, 575`. No producer reads any per-placement scale override. |
| Asset aliases | NO in the current runtime. `src/scene_runtime/render/svg_loader.ts` resolves `assetName -> "SVG_" + assetName.toUpperCase()` and looks up the export in `generated/svg_assets/index`; there is no alias map, no `LIQUID_BY_ASSET_ID`, no `getStaticSvg`, no `EQUIPMENT_ASSETS`. The alias machinery described in `docs/CHANGELOG-2026-05b.md` (M4 entry) lived in the previous `src/svg_assets.ts` facade which is no longer in `src/`. | `src/scene_runtime/render/svg_loader.ts:25-58` (full alias logic is the `mapAssetNameToExportName` snake-to-SCREAMING-snake transform; missing exports return `undefined`); `git ls-files 'src/**/*.ts' \| xargs grep -ln "alias\|EQUIPMENT_ASSETS\|getStaticSvg\|LIQUID_BY_ASSET_ID"` returns no `src/` matches. |

## Findings

### Finding 1 - Several gold-listed scenes do not mount in production runtime

`electrophoresis_bench`, `staining_bench`, and `cell_counter_workspace` were not reachable: their owning protocols fail at `inferInitialScene` with `Cannot determine scene for target object "<x>"` because the entry-step target object exists in many scenes and the disambiguation rule (`protocol-name prefix`) does not match the scene name. `passage_hood_detachment` references `microscope_view` which is absent from `SCENE_CATALOG`. The static-template precheck reports crops on these scenes because the precheck renders the scene template directly; the production runtime never reaches them via these protocols.

### Finding 2 - Production runtime renders are visually broken in a different way

For all four passing protocols, the production runtime produces scenes where labels are massively oversized and overlap each other and the viewport, and scientific SVG assets render either tiny (true-to-asset but at sub-thumbnail scale) or as placeholder shapes (green rounded rectangles, dashed-outline boxes). There are zero visible asset crops in the conventional sense (no asset is clipped at a card boundary). The dominant failure mode is *under-sized assets relative to over-sized labels*, not asset cropping. The ~101 crops reported by static-template precheck do not appear as visible crops in any of the four runtime captures.

### Finding 3 - Two of the four "layout knobs" the plan asks about are not consumed

`display_width_cm` is not read by `src/scene_runtime/` at all. `widthScale` is read by the layout engine but is hard-coded to `1.0` at the adapter boundary; no per-placement override is wired. Only `defaultWidth` (via `objectSpec.layout.default_width`) and the alias path (via `snake_case -> SVG_SNAKE_CASE` mechanical mapping, not a curated map) are live.

## Conclusion

**The ~101 cropped-asset count from prior static-template precheck reports does not correspond to visible asset crops in the current production runtime: zero visible scientific-SVG asset crops were observed across all four runtime-mounted scenes, and three of four crop-implicated gold-listed scenes do not mount in the runtime at all. The runtime's dominant visual failure is oversized labels combined with undersized or placeholder assets, not asset cropping; Batch D fix experiments should not assume the static precheck crop list is a one-to-one map of runtime failures.**

## Boundaries respected

- Read-only on production source. Edits only to: `test-results/round3_runtime_truth/` (screenshots + JSON), `tests/playwright/_temp_runtime_truth.mjs` (temp driver, safe to delete), this report.
- Reused existing walker engine path (HTML build + runtime bundle build + `file://` page load) rather than inventing a new walker.
- Did not edit `src/scene_runtime/**`, `generated/**`, `content/**`, the precheck tool, or `dist/` outputs by hand.
- No `git commit`. No `pytest`. No `./check_codebase.sh`.

## Reproduce

```
bash build_github_pages.sh
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_solubilization_readout
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_attach_lid_and_leads
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_heat_denature_samples
node tests/playwright/_temp_runtime_truth.mjs
```
