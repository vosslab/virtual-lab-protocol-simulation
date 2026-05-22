# Round 3 runtime sizing source audit

Status: AUDIT
Date: 2026-05-22
Scope: trace the authoritative sizing source from authored YAML through
generated TS into the runtime layout engine and SVG renderer, name the
canonical field, and list the wrong-vocabulary names that must not be
used in follow-on work.

Related prior reports:

- [round3_runtime_truth_audit.md](round3_runtime_truth_audit.md) (A1)
- [round3_asset_specs_impact_audit.md](round3_asset_specs_impact_audit.md) (B2)
- [round3_display_width_cm_top10_plan.md](round3_display_width_cm_top10_plan.md) (B3)

## Canonical sizing field

The single authoritative sizing field is `layout.default_width` on an
authored object YAML under `content/objects/<kind>/<name>.yaml`. The
value is a per-object width in the layout-engine's coordinate units
(percent-of-viewport in current rules; the engine treats it as a
unitless visual width and multiplies through depth and label math). No
other authored field controls placement width.

Companions on the same `layout:` block:

- `label_width`: unscaled label-width estimate used by the label pass.
- `anchor_y`: vertical anchor mode (`top`, `bottom`, `tip`, or numeric).
- `anchor_y_offset`: numeric vertical nudge.

These four fields are the entire `layout` surface emitted into
`generated/object_data.ts` and consumed by the runtime; the schema is
closed.

## Emission path

1. Author edits `content/objects/<kind>/<name>.yaml` with a `layout:`
   block.
2. `pipeline/build_object_data.py` reads every object YAML, validates,
   classifies visual states, and emits `generated/object_data.ts`. The
   `layout` block is passed through verbatim via
   `json.dumps(obj_data['layout'])` at
   `pipeline/build_object_data.py:444`.
3. The emitted module exports `OBJECT_CATALOG: Record<string, ObjectConfig>`;
   the `ObjectConfig.layout` shape is declared in
   `src/scene_runtime/types.ts:193-198` with optional fields
   `default_width`, `label_width`, `anchor_y`, `anchor_y_offset`.

Confirmed by scanning `generated/object_data.ts`:

- `default_width` occurrences: 78 (every object that declares a width).
- `ASSET_SPECS`, `display_width`, `width_scale`, `defaultWidth`,
  `alias` occurrences: 0.

## Runtime consumption trace

The runtime pulls the authored value into an `AssetSpec`, then the
layout engine multiplies through depth and per-item scale, and the
renderer writes the result to SVG attributes.

- `src/scene_runtime/layout/adapter.ts:165` reads
  `objectSpec.layout.default_width` (falls back to literal `15` when
  absent) into a local `defaultWidth`.
- `src/scene_runtime/layout/adapter.ts:170` packs that value into
  `AssetSpec.defaultWidth` returned by `buildAssetSpec()`.
- `src/scene_runtime/layout/types.ts:45-50` defines `AssetSpec` with
  `defaultWidth: number`, `labelWidth: number`,
  `anchorYOffset?: number`, `widthScale?: number`.
- `src/scene_runtime/layout/types.ts:26-40` defines `SceneItem` with
  `widthScale: number` (required at the item level).
- `src/scene_runtime/layout/adapter.ts:152` hardcodes
  `widthScale: 1.0` on every `SceneItem` built from a placement (with a
  comment that says scene authors can override via `placement.position.scale`,
  but no read of any such field is wired in this file).
- `src/scene_runtime/layout/layout_engine.ts:261` computes the rendered
  visual width as
  `visualW = fpSpec.defaultWidth * fpItem.widthScale * depthScale`.
- `src/scene_runtime/layout/layout_engine.ts:264` and `:566` use
  `spec.labelWidth * item.widthScale` for label-width estimates.
- `src/scene_runtime/layout/layout_engine.ts:575` recovers the
  unscaled visual width as `spec.defaultWidth * item.widthScale` for
  the label-wrap availability calculation.
- `src/scene_runtime/render/scene.ts:253-256` reads the computed
  `layout.x`, `layout.y`, `layout.width`, `layout.height` produced by
  the engine (no further width math in the renderer).
- `src/scene_runtime/render/scene.ts:139-143` writes the same
  numbers to the `<svg>` element's `x`, `y`, `width`, `height`
  attributes via `insertSvgAsset()` with
  `preserveAspectRatio="xMidYMid meet"`.
- `src/scene_runtime/render/svg_loader.ts:25-36`
  resolves asset names by literal SCREAMING_SNAKE_CASE concat:
  `"SVG_" + assetName.toUpperCase()`. There is no alias table and no
  cm-to-px conversion stage. The renderer treats the layout-engine's
  unitless width as the final on-canvas number.

## Wrong vocabulary (do NOT use these names)

The following names are wrong and must not appear in follow-on plans,
reports, or code edits. Each is annotated with the actual repo state.

- `ASSET_SPECS.defaultWidth`: there is no `ASSET_SPECS` constant in
  `generated/object_data.ts` (0 occurrences); the catalog is
  `OBJECT_CATALOG`, and the per-object width lives at
  `OBJECT_CATALOG[name].layout.default_width`.
- `layout.display_width_cm`: 0 occurrences anywhere in `generated/`
  or `src/`; the canonical field is `layout.default_width` and it is
  unitless in the engine, not cm-tagged.
- `width_scale`: 0 occurrences in `generated/object_data.ts`. The
  TypeScript type `AssetSpec.widthScale` and the required
  `SceneItem.widthScale` are typed paths that are never sourced from
  authored YAML; `adapter.ts:152` writes `widthScale: 1.0`
  unconditionally for every item.
- Asset alias map: there is no alias table. `svg_loader.ts` performs
  a literal `"SVG_" + assetName.toUpperCase()` lookup against
  `generated/svg_assets/index`. Asset name mismatches surface as
  fallback rects, not as alias misses.

## Dead-typed path inventory and recommendation

Two typed paths exist in the runtime that are never written from
authored content. They must be either wired or removed; leaving them
typed-but-dead causes ongoing vocabulary confusion (the A1 finding).

1. `SceneItem.widthScale` (required field) and
   `AssetSpec.widthScale` (optional). Currently hardcoded to `1.0`
   at `src/scene_runtime/layout/adapter.ts:152` for every placement.
   The layout engine multiplies through it at lines 261, 264, 566,
   and 575, so wiring an authored source would have correct
   downstream effects. Recommendation: pick one and act.
   - Wire option: define an authored `placement.position.scale`
     (or equivalent) on the scene placement schema, validate it, and
     read it at `adapter.ts:152` in place of the literal `1.0`. Add
     a docs entry under `docs/specs/SCENE_*` describing the field.
   - Remove option: collapse the multiply chain and delete
     `widthScale` from `SceneItem` and `AssetSpec`. The layout engine
     becomes `visualW = fpSpec.defaultWidth * depthScale` and the
     four other multiply sites simplify. This is the lower-risk
     option because the field has zero authored consumers today.
   The wire option is justified only if a real authoring need
   exists; otherwise the remove option is preferred to keep the
   vocabulary closed (PRIMARY_DESIGN closure principle).

2. `AssetSpec.anchorYOffset` is read from
   `objectSpec.layout.anchor_y_offset` at
   `src/scene_runtime/layout/adapter.ts:167` and packed into the
   spec, but its downstream consumers were not traced in this
   audit. Recommendation: a follow-up audit should confirm whether
   any layout-engine site reads `anchorYOffset`; if not, treat it
   the same as `widthScale` (wire or remove).

No other dead-typed sizing paths were found. The `default_width`,
`label_width`, and `anchor_y` paths are all live.

## Verification

- ASCII compliance: pass (this file uses ASCII only).
- Markdown link check: run from repo root.
