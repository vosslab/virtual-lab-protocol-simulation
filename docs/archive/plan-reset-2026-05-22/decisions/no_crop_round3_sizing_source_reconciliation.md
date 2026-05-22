# No-crop Round 3 sizing-source reconciliation

Date: 2026-05-21
HEAD: 8795d25
Status: clarification note (doc-only; no code, CSS, YAML, or contract edits)
Supersedes framing in: WS-E (`no_crop_sizing_source_reconciliation.md`,
renamed from `no_crop_footprint_vocab_proposal.md`) and WS-F
(`no_crop_round3_plan.md`).

## User directive (verbatim authority)

Bottom line from the user, treated as authority for this note:

> "Permanent CSS footprint classes are probably the wrong direction.
> At most, they are a temporary diagnostic shim for the broken static
> harness. The durable fix should go through the existing scaling
> model and SVG pipeline."

The existing layout engine, scaling model, and SVG pipeline already
define how scene objects are sized and how their natural aspect ratio
is preserved through rendering. The Round 3 framing of "footprint
vocabulary" overreached: it treated CSS class labels as if they were a
new durable sizing surface, when in fact the durable surface already
exists in `docs/specs/`.

The layout engine's existing `footprint` concept is a spacing slot
(see [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) sections
"Algorithm invariants" and "Footprints"). It is the horizontal slot
used for distributing items in a row and for reserving label breathing
room. It is NOT a rendered crop box. It is NOT a CSS card class. It
is NOT a replacement for `display_width_cm`, `width_scale`, the
`ASSET_SPECS` table, or SVG aspect-ratio sizing.

## Three sizing surfaces, kept separate

The Round 3 work touched three different "sizing" surfaces that share
a word but not a role. They must stay separate in language:

| Surface                                | What it is                                                                                                                                                                                                                                                                     | Production?                                                        | Reference                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| layout-engine footprint (spacing slot) | Per-row spacing slot owned by `computeSceneLayout()`; may be wider than the visual box to reserve label space; used to distribute items inside a zone.                                                                                                                         | YES (durable production behavior)                                  | [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) sections "Algorithm invariants" and "Footprints" |
| CSS-native static-template class names | `.footprint--small-tool`, `.footprint--handheld`, `.footprint--container`, `.footprint--rack`, `.footprint--instrument`, `.footprint--large-equipment`, `.footprint--zoom-view` in `experiments/css_native_layout/styles/bench.css`. Used by hand-typed visual-test templates. | NO -- experiment-local visual-test CSS only                        | `experiments/css_native_layout/styles/bench.css`                                                  |
| stress-harness sizing shims            | `experiments/css_native_layout/object_footprints.yaml` (and the legacy `experiments/css_native_layout/regions/*.yaml`) -- experiment-local kind-to-footprint mapping. Header explicitly labels it "Experimental CSS-native visual-test mapping. Not production schema."        | NO -- experiment-local, "test harness only, not production schema" | `experiments/css_native_layout/object_footprints.yaml` header                                     |

The production sizing chain does not go through CSS class names or
through `kind_to_footprint` mappings. The user re-stated that chain
verbatim:

`scene object -> asset_name -> ASSET_SPECS/default_width -> display_width_cm or width_scale -> layout engine computed box -> renderer preserves SVG aspect ratio`

This chain is owned by:

- `asset_name` and per-placement metadata in scene YAML
  ([SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md);
  [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md) sections
  "placement" and "object_name").
- `ASSET_SPECS[asset_name].default_width` (named `defaultWidth` in the
  TypeScript table at `src/asset_specs.ts`); see
  [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) section
  "Asset specs".
- `layout.display_width_cm` on each object plus the per-scene
  `SCENE_PX_PER_CM` constants; see
  [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) sections
  "Overview", "Per-scene constants", and "How sizing works".
- `width_scale` per item (scene-specific multiplier on the asset's
  base width); see
  [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) section
  "Scene items".
- The renderer's responsibility to consume the engine's computed `x`,
  `y`, `width`, `height` and to preserve SVG aspect ratio; see
  [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md) section "Never
  crop in display" and
  [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) section
  "Layout invariant: no clipping or distortion".

The no-crop rule itself is a permanent invariant: scientific SVG
assets must never be clipped or distorted, regardless of any
diagnostic score. This is stated canonically in
[PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) "Visual integrity: never
crop scientific assets" and is mirrored in
[SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md) "Never crop in
display" and
[LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) "Layout
invariant: no clipping or distortion".

## Crop-cause checklist (verbatim)

When an object is rendered cropped, fix the actual cause. The user's
10-item checklist is the canonical diagnosis order for any cropping
incident:

1. missing/wrong SVG asset
2. bad asset alias
3. bad SVG viewBox
4. wrong `ASSET_SPECS.default_width`
5. wrong `display_width_cm`
6. wrong `width_scale`
7. zone is overloaded
8. parent container uses clipping CSS
9. renderer ignores computed layout box
10. static test harness diverges from production rendering

None of these causes is "the repo is missing a permanent CSS
`footprint--*` class". The CSS layer is a downstream renderer concern
(item 8 and item 9 above); it is not the source of sizing truth.

## Fix-priority order (verbatim)

When a no-crop incident is being diagnosed, fix in this order:

1. asset mapping / SVG existence
2. SVG viewBox correctness
3. `ASSET_SPECS.default_width`
4. object `display_width_cm`
5. item `width_scale`
6. zone placement / overload
7. renderer CSS preserving aspect ratio

Permanent CSS class labels are not in this priority order. They may
serve as a temporary experiment-local diagnostic shim while a static
visual-test harness is being recovered, but they must be labeled "test
harness only, not production schema" and removed or replaced once the
renderer correctly consumes scene objects, asset specs, and SVG
aspect ratios.

## Allowed scope for CSS-native experiment artifacts

A temporary experiment-local sizing shim is permitted strictly when:

- It is scoped to a static visual-test harness that has not yet been
  reconnected to the production renderer.
- It is labeled verbatim "test harness only, not production schema".
- It is compared against the real layout-engine model (asset spec +
  `display_width_cm` + `width_scale`) as part of its sign-off.
- It is removed or replaced once the renderer uses scene objects,
  asset specs, and SVG aspect ratios correctly.

A permanent CSS class is allowed ONLY when the proposing document
proves all of the following are checked and none can represent the
object:

- `ASSET_SPECS.default_width`
- `display_width_cm`
- `width_scale`
- SVG `viewBox`

Without that proof, the candidate class is at most an
experiment-local visual-test shim.

## Round 3 must answer

Any Round 3 fix that touches a cropping symptom must answer these
three questions before proposing CSS or vocabulary changes:

1. Why did the current sizing model fail to preserve the SVG?
2. Is the failure in asset data, layout data, renderer CSS, or static
   harness divergence?
3. What is the smallest fix that makes the real engine preserve the
   full SVG?

If a workstream report cannot answer all three, it has not yet
diagnosed the cropping cause through the durable sizing chain. A
CSS-class proposal is not a substitute for that diagnosis.

## Round 3 revisions applied

This reconciliation reframes the Round 3 sizing work:

1. "Footprint vocabulary proposal" is renamed to "sizing-source
   reconciliation". The WS-E artifact has been renamed via `git mv`
   from `no_crop_footprint_vocab_proposal.md` to
   `no_crop_sizing_source_reconciliation.md` and amended.
2. The three sizing surfaces (production layout-engine footprint;
   CSS-native static-template class names; stress-harness sizing
   shims) are kept separate in language and in the surface table
   above.
3. No permanent classes like `footprint--tall-glassware`,
   `footprint--portrait-tool`, or `footprint--landscape-plate` are
   adopted unless the existing scaling model is proven inadequate per
   the gate above.
4. The fix-priority order replaces "permanent footprint vocab
   adoption" with the user's 7-step sizing-chain order.
5. The no-crop rule binds regardless of any precheck or visual
   acceptance score: a rendered scientific SVG that is visibly
   cropped is HARD FAIL, per
   [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md).

## Citations (durable vocabulary surface)

- [SCALING_MODEL.md](../../specs/SCALING_MODEL.md), sections
  "Overview", "Per-scene constants", "How sizing works", "Adding a
  new object", "Current fallback behavior", "Tuning display_cm
  values".
- [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md), sections
  "Mental model", "Algorithm invariants", "Scene items", "Asset
  specs", "Footprints", "Layout invariant: no clipping or
  distortion", "Tuning order".
- [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md), sections
  "Four-layer flow", "Hard rule for scenes and capabilities", "Never
  crop in display".
- [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md),
  sections "placement", "object_name", "zone".
- [SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md)
  for the scene-side schema.
- [OBJECT_VOCABULARY.md](../../specs/OBJECT_VOCABULARY.md)
  and
  [OBJECT_YAML_FORMAT.md](../../specs/OBJECT_YAML_FORMAT.md)
  for the object-side schema (including `layout.display_width_cm`).
- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md), section "Visual
  integrity: never crop scientific assets".
- [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md), items 1 and 3.

`src/asset_specs.ts` is the authored TypeScript table that implements
the `ASSET_SPECS` surface; the field is named `defaultWidth` in code
and `default_width` in spec prose. The conceptual surface is the
same.

## Note on minor spec-vs-code naming

[LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) section
"Asset specs" and
[SCALING_MODEL.md](../../specs/SCALING_MODEL.md) refer to
`default_width` (snake_case prose). The authored TypeScript table at
`src/asset_specs.ts` uses `defaultWidth` (camelCase identifier). Both
refer to the same per-asset baseline width field. No conflict with
the user directive; the user used the prose form `default_width`.

## Handoff

- Status: DONE.
- Artifact: this file
  (`docs/active_plans/decisions/no_crop_round3_sizing_source_reconciliation.md`).
- Reframes Round 3 from "footprint vocabulary" to "sizing-source
  reconciliation".
- WS-E renamed via `git mv` from
  `no_crop_footprint_vocab_proposal.md` to
  `no_crop_sizing_source_reconciliation.md` (amended separately).
- WS-F (`no_crop_round3_plan.md`) amended separately to use the
  sizing-source framing and the new fix-priority order.
