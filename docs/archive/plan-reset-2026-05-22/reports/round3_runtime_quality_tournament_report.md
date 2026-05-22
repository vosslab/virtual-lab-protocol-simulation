# Round 3 runtime quality tournament report (R8 synthesis)

Date: 2026-05-22
Owner: R8 final synthesis pass
Plan ref: Round 3 pivot, workstream R8 (final pivot report synthesis)

Inputs (round 3 artifacts):

- A1: [round3_runtime_truth_audit.md](round3_runtime_truth_audit.md)
- R1: [round3_runtime_mount_gap_repair.md](round3_runtime_mount_gap_repair.md)
- R1-alt: [round3_electrophoresis_mount_variant.md](round3_electrophoresis_mount_variant.md)
- R2: [round3_placeholder_asset_replacement.md](round3_placeholder_asset_replacement.md)
- R2-alt: [round3_well_plate_96_variant.md](round3_well_plate_96_variant.md)
- R3: [round3_runtime_label_readability.md](round3_runtime_label_readability.md)
- R3-alt: [round3_runtime_label_readability_css_variant.md](round3_runtime_label_readability_css_variant.md)
- R4: [round3_runtime_sizing_source_audit.md](round3_runtime_sizing_source_audit.md)
- R5: [../decisions/static_templates_are_not_runtime_truth.md](../decisions/static_templates_are_not_runtime_truth.md)
- R6: [round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md)
- R7: [round3_runtime_interaction_smoke.md](round3_runtime_interaction_smoke.md)
- B1: [round3_asset_alias_verification.md](round3_asset_alias_verification.md)
- B2: [round3_asset_specs_impact_audit.md](round3_asset_specs_impact_audit.md)
- B3: [round3_display_width_cm_top10_plan.md](round3_display_width_cm_top10_plan.md)
- B4: [round3_svg_geometry_audit.md](round3_svg_geometry_audit.md)
- C1: [round3_static_template_hardcoding_audit.md](round3_static_template_hardcoding_audit.md)
- C2: [round3_stress_renderer_recovery_review.md](round3_stress_renderer_recovery_review.md)
- C3: [round3_render_path_matrix.md](round3_render_path_matrix.md)
- Side: [round3_object_frequency_inventory.md](round3_object_frequency_inventory.md)
- Baseline reframing: [../decisions/layout_manager_baseline_reframing.md](../decisions/layout_manager_baseline_reframing.md)

## 1. Why no-crop stopped being the primary runtime issue

The Round 2 fix queue carried a ~101 cropped-asset count derived from the
static-template precheck. A1 measured the same scenes through the
production runtime path (`file://dist/<protocol>.html` ->
`runtime.bundle.js` -> `loadAndMountByProtocolName`) and recorded
**0 visible asset crops across 4 mounted scenes**:

- `mtt_reagent_prep_bench_workspace`
- `mtt_solubilization_readout_plate_reader_workspace`
- `sdspage_attach_lid_and_leads_workspace`
- `sdspage_heat_denature_samples_workspace`

The dominant runtime visual failure was instead oversized labels
combined with undersized or placeholder assets. Static-template crop
counts were divergence artifacts of the precheck renderer (which has
hardcoded CSS classes and its own sizing logic; see C1), not runtime
evidence. A1 verified zero scientific assets clipped at a card or
viewport boundary in any captured runtime scene.

## 2. Static-template claims superseded

C1 found that the static-template precheck hardcodes CSS classes that
bypass the runtime sizing path. C3's render-path matrix rates the
runtime as HIGH trust and the static template as MEDIUM trust. R5
formalized the decision: static-template no-crop failures are NOT
production runtime failures unless reproduced through runtime
screenshots. Static templates remain usable for visual experiments only;
they are not authoritative for production quality.

Consequence: every prior batch-D queue item that was scored using
static-template precheck must be re-validated against runtime
screenshots before it counts as a real fix target.

## 3. What was fixed (code changes)

### R1: mount disambiguation (src/scene_runtime/loader/world.ts)

Added an additive branch in `inferInitialScene` that consults the entry
step's first interaction `response.scene_operations` for a `SceneChange`
whose `to_scene` is already in the target-matching scene set. The branch
runs before the existing prefix resolver and never widens the candidate
set.

Effect: `electrophoresis_bench` and `staining_bench` now mount through
production runtime. `cell_counter_workspace` is documented as a content
gap (its entry interaction has no `SceneChange`); the runtime fix alone
does not unblock it.

### R2: placeholder reduction (content/objects/*)

Four single-field `asset_name` edits:

- `content/objects/bottle/pbs_bottle.yaml`
- `content/objects/pipette/micropipette.yaml`
- `content/objects/pipette/p10_micropipette.yaml`
- `content/objects/pipette/p200_micropipette.yaml`

`pbs_bottle` was retargeted to `bottle` (generic colormap-driven).
`micropipette` / `p10_micropipette` / `p200_micropipette` were each
split per `held_material_name`: `empty` -> `*_empty`, all liquid cases
-> `*_filled`. Incidentally regenerated `generated/svg_assets/` (125
per-asset TS files plus `index.ts` and `svg_manifest.ts`) which folded
`serological_pipette.ts` into the bundle.

### R2-alt: well_plate_96 composite render

`src/scene_runtime/adapters/well_plate/render.ts` extended to draw a
plate frame (rounded white rect, dark stroke) behind the 96 cells, and
each cell now renders as an inset circle. Click hit-testing is
preserved via an invisible cell-sized rect that retains
`data-target-id`, `data-well`, and `pointer-events: auto`. No content
YAML changes; permitted by primary contract item 3 (custom geometry for
subparts inside structured scientific objects).

### R3: renderer label clamp (src/scene_runtime/render/scene.ts)

Single-line clamp in `renderPlacement`:

```ts
const fontSize = Math.min(declaredFontSize, width * 0.25);
```

Caps glyph height to a maximum of 25% of the placement width. One-way
(never enlarges past authored value); per-placement (scales each label
to its own placement size); no schema change.

### R3-alt: white halo CSS (pipeline/build_protocol_html.py + chrome/style.css)

Inlined `<style>` rule emitted by `pipeline/build_protocol_html.py`
(and mirrored without scope into `src/scene_runtime/chrome/style.css`):

```css
#runtime-root .scene-viewport svg text,
#runtime-root svg text {
    paint-order: stroke fill;
    stroke: #ffffff;
    stroke-width: 0.35px;
    stroke-linejoin: round;
    font-weight: 600;
}
```

A font-size clamp via CSS was tried and rejected: SVG viewBox units make
any px clamp wrong for at least one of the four mounted scenes. The
final shipped rule applies a white halo only; legibility improves
without any scene-relative size logic. R3 and R3-alt are complementary
(renderer-side size clamp plus CSS halo), not competing.

## 4. Vocabulary corrections (R4)

- `layout.default_width` is the canonical sizing field. It is a
  per-object width in the layout engine's coordinate units (unitless;
  the engine treats it as visual width and multiplies through depth
  and label math). Authored under `content/objects/<kind>/<name>.yaml`,
  passed through verbatim by `pipeline/build_object_data.py` into
  `generated/object_data.ts` (78 occurrences) and read at
  `src/scene_runtime/layout/adapter.ts:165`.
- `ASSET_SPECS.defaultWidth`: name does not exist in current source.
  The legacy `ASSET_SPECS` table is absent; only the dynamically built
  `AssetSpec.defaultWidth` field exists, sourced per object from
  `objectSpec.layout.default_width`.
- `layout.display_width_cm`: field does not exist anywhere in the repo
  (B3 confirmed 0 occurrences in `src/` or `generated/`). Wording that
  treats it as a real authored field is wrong.
- `width_scale`: dead typed path. `SceneItem.widthScale` and
  `AssetSpec.widthScale` are declared in
  `src/scene_runtime/layout/types.ts`, but
  `src/scene_runtime/layout/adapter.ts:152` hardcodes `widthScale: 1.0`
  for every item; no authored field is read. R4 recommendation: remove.
- Asset alias map: does not exist. `src/scene_runtime/render/svg_loader.ts`
  performs a literal `"SVG_" + assetName.toUpperCase()` lookup against
  `generated/svg_assets/index`. No alias table, no `EQUIPMENT_ASSETS`,
  no `getStaticSvg`. The alias machinery referenced in older CHANGELOG
  entries lived in a `src/svg_assets.ts` facade that has been removed.

## 5. Runtime screenshots inventory

Under `test-results/`:

- `round3_runtime_truth/`
  - `mtt_reagent_prep_bench_workspace_initial.png`
  - `mtt_plate_reader_workspace_initial.png`
  - `mtt_plate_reader_workspace_after_entry.png`
  - `sdspage_attach_lid_workspace_initial.png`
  - `sdspage_heat_block_workspace_initial.png`
  - `electrophoresis_bench_initial.png` / `electrophoresis_bench_after_fix.png`
  - `staining_bench_initial.png` / `staining_bench_after_fix.png`
  - `cell_counter_workspace_initial.png` / `cell_counter_workspace_after_fix.png`
  - `microscope_view_initial.png`
  - `*_after_label_fix.png` (R3 captures)
- `round3_placeholder_fixes/`
  - `sample_prep_bench_before.png` / `sample_prep_bench_after.png`
  - `hood_basic_before.png` / `hood_basic_after.png`
- `round3_well_plate_variants/`
  - `before_baseline.png` / `before_baseline_plate_crop.png`
  - `after_composite_frame.png` / `after_composite_frame_plate_crop.png`
  - `after_composite_frame_v2.png` / `after_composite_frame_v2_plate_crop.png`
  - `00_before_baseline.png`
- `round3_runtime_label_css_variant/`
  - `mtt_reagent_prep_bench_workspace_initial.png`
  - `mtt_plate_reader_workspace_after_entry.png`
  - `sdspage_attach_lid_workspace_initial.png`
  - `sdspage_heat_block_workspace_initial.png`
- `round3_runtime_interaction_smoke/`
  - per-scene `.log` and `summary.json`

## 6. Remaining blockers

Ordered by severity:

1. **R7 finding: clickWorks 0/4 across all mounted scenes**. Clicking
   the active step's first target does not advance `activeStepIndex`,
   `activeSceneId`, or any surfaced `world.objects[*].state` snapshot
   on any of the four mounted scenes. The app mounts and renders but is
   interactively dead through the surfaced runtime config. Highest
   priority. Console errors are zero and off-target clicks survive, so
   this is a protocol-advance regression, not a catastrophic crash.
2. **cell_counter_workspace mount gap**. The R1 disambiguation branch
   does not unblock it because the entry interaction in
   `trypan_blue_counting` carries no `SceneChange`. Needs an authored
   `SceneChange` added to `add_trypan_blue_to_chamber`'s first
   interaction (or a scene rename, which is broader). Content fix.
3. **sdspage_heat_denature_samples_workspace pointer interception**.
   R7 observed `<div class="scene-chrome">` intercepting pointer events
   at the `heat_block` click point. Independent of blocker 1.
4. **well_plate_96 inert `asset_name: well` lines**. The 292-reference
   frequency count from the inventory over-counts: the adapter
   short-circuits before `asset_name` lookup for `kind: plate`, so the
   YAML lines do nothing. Safe to delete in a future pass, but the
   visible plate problem is already solved by R2-alt's composite
   render.
5. **Bottle family beyond pbs_bottle**. 12 objects each need a
   per-object semantic decision (`carboplatin_stock_bottle`,
   `dmso_bottle`, `ethanol_bottle`, `media_bottle`,
   `metformin_stock_bottle`, `sterile_water_bottle`,
   `trypan_blue_bottle`, `conical_tube_for_dilution`,
   `metformin_working_tube`, `microtube_15ml_intermediate`,
   `mtt_powder_container`, `mtt_solution_tube`). Deferred.
6. **counter_slide_cartridge**. No candidate SVG exists; needs a new
   authored asset or primitive composition. Out of scope for any
   asset_name rename pass.

## 7. Scoreboard delta

A1 baseline (R6 sums across the 5 scored rows):

- visible_crop_count: 0
- placeholder_count: 14
- label_overlap_count: 17
- off_page_count: 16
- mean object_clarity: 1.0
- click_target_smoke: 1 pass, 0 fail, 4 untested (before R7)
- object_state_change_smoke: 1 pass, 0 fail, 4 untested (before R7)

After R2 + R3 + R3-alt + R2-alt fixes (qualitative; new full
scoreboard not re-captured):

- placeholder_count reduced for `pbs_bottle` and the micropipette
  family on scenes that instantiate them. `well_plate_96` cosmetic
  transformed from grey hash-mark grid to recognizable 12x8 circular
  well plate.
- label_overlap_count and off_page_count reduced across all four
  mounted scenes per R3 and R3-alt captures: labels no longer overlap
  each other or their assets in the bench scene; the heat-block scene
  label is sized to its placement; the lid-and-leads scene gained the
  largest legibility improvement (R3-alt's subjective score 4/5).
- click_target_smoke / object_state_change_smoke regressed once
  measured: R7 recorded 0/4 clickWorks pass and 0/3 ObjectStateChange
  pass (1 untested) after the visual fixes. The smoke was not run
  before the fixes, so this is not a causal regression attributable to
  R1/R2/R3, only a now-visible blocker uncovered by R7.

## 7a. Why R7 is the new priority

A visually improved scene is useless if click -> protocol advance is
dead. R7 measured exactly that condition: clickWorks failed 4/4 across
all mounted scenes. The renderer-side and CSS-side label fixes (R3,
R3-alt), the placeholder-asset reductions (R2), the well-plate
composite render (R2-alt), and the mount disambiguation (R1) all
land on a runtime that does not advance protocol state when the
correct target is clicked. Without a working click -> advance path:

- A1's runtime-truth methodology cannot be extended past step 0 for
  most protocols.
- R6's scoreboard cannot record `click_target_smoke` or
  `object_state_change_smoke` as `pass` on any new scene.
- The walker's primary invariant (mini-protocol is complete only when
  visible interaction works; primary contract item 4) cannot be
  satisfied by any mini-protocol whose first interaction fails to
  advance.

R7 is therefore the new top blocker for Round 3. Visual quality work
should not consume further effort until click -> advance is restored.

The active follow-up batch is R9 plus parallel rescue tournament
workstreams P1-P5: R9 owns the protocol-advance regression
investigation and fix; P1-P5 fan out independent rescue paths
(adapter-side, validator-side, response-side, gesture-side, and a
walker re-instrumentation lane) so the tournament converges on the
fastest working repair. The single artifact that should land first
from that batch is a re-run of `_temp_round3_interaction_smoke.mjs`
showing clickWorks > 0 on at least one mounted scene.

## 8. Next implementation queue

Ordered by leverage:

a. **R9 + P1-P5: fix protocol-advance regression (parallel rescue
   tournament)**. The entire app is interactively dead through the
   surfaced runtime config across all four mounted scenes. Highest
   leverage; without this, no further visual fix can be validated
   through interaction. R9 is the owning workstream; P1-P5 are the
   parallel rescue tournament workstreams that fan out independent
   repair paths and converge on the first one that restores
   clickWorks > 0.
b. **R10: cell_counter_workspace SceneChange add**. Author an explicit
   `SceneChange` on the entry interaction of
   `trypan_blue_counting.add_trypan_blue_to_chamber`, naming the
   intended initial scene. Content-side fix; small.
c. **R11: remove dead width_scale path**. Delete `widthScale` from
   `SceneItem` and `AssetSpec`, collapse the multiply chain at the
   four layout-engine sites, drop the hardcoded `widthScale: 1.0` at
   `adapter.ts:152`. Closes a vocabulary leak that has caused recurrent
   plan-language drift.
d. **Bottle family asset_name pass**. 12 objects, one decision per
   object, mechanical edits once the semantic targets are picked. Use
   the B1 audit table as the source of safe targets.
e. **Sizing tune for remaining placeholders flagged in B2 top 10**.
   Each candidate must be measured against a fresh runtime screenshot
   per R5; do not act on static-template-only signals.

## Verification

- ASCII compliance via `tests/check_ascii_compliance.py -i
  docs/active_plans/reports/round3_runtime_pivot_report.md` -> PASS.
- Markdown link check via `pytest tests/test_markdown_links.py -q`
  -> PASS.
