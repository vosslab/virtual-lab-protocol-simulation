# Round 3 V1 sizing and asset field documentation

Status: AUDIT
Date: 2026-05-22
Scope: every authored, generated, and runtime field that controls
asset resolution, sizing, anchoring, and placement of clickable
scene objects in the production runtime. Extends
[round3_runtime_sizing_source_audit.md](round3_runtime_sizing_source_audit.md)
(R4) and pairs with
[round3_render_path_matrix.md](round3_render_path_matrix.md) (C3).

This document covers only the HIGH-trust production runtime path
(authored YAML -> `pipeline/build_object_data.py` ->
`generated/object_data.ts` and `generated/scene_data.ts` ->
`src/scene_runtime/`). Static template and stress-static HTML
paths are out of scope per the C3 trust verdict.

## Canonical field table

Each row is one authoritative field. Definition is where the
schema is declared in TypeScript. Consumers are the runtime code
sites that read the field. Units are the layout-engine units
(unitless per cent-of-viewport in current rules).

### Content YAML fields (authored)

| Field | Authored location | Type / unit | Default if missing | Consumer trace |
| --- | --- | --- | --- | --- |
| `layout.default_width` | `content/objects/<kind>/<name>.yaml` `layout:` block | number, layout-engine units | literal `15` at `src/scene_runtime/layout/adapter.ts:164` | emitted via `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:194`; read at `src/scene_runtime/layout/adapter.ts:164`; multiplied at `src/scene_runtime/layout/layout_engine.ts:261`, `:575` |
| `layout.label_width` | same object YAML `layout:` block | number, layout-engine units | literal `10` at `src/scene_runtime/layout/adapter.ts:165` | emitted via `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:195`; read at `src/scene_runtime/layout/adapter.ts:165`; consumed at `src/scene_runtime/layout/layout_engine.ts:264`, `:566` |
| `layout.anchor_y` | same object YAML `layout:` block | string enum `top`, `bottom`, `tip`, `center`, or numeric `0` | `center` cast at `src/scene_runtime/layout/adapter.ts:134` | typed at `src/scene_runtime/types.ts:196`; normalized at `src/scene_runtime/layout/adapter.ts:135-144`; consumed in vertical anchor branch at `src/scene_runtime/layout/layout_engine.ts:431-434` |
| `layout.anchor_y_offset` | same object YAML `layout:` block | number, layout-engine units | `0` at `src/scene_runtime/layout/adapter.ts:166` | emitted via `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:197`; packed at `src/scene_runtime/layout/adapter.ts:171`; consumed at `src/scene_runtime/layout/layout_engine.ts:426`, applied to tip-anchor top at `:434` |
| `scene.placements[].placement_name` | `content/scenes/<name>.yaml` or protocol-local scene | string identifier | required (loader throws) | typed at `src/scene_runtime/types.ts:115`; read at `src/scene_runtime/layout/adapter.ts:147` (becomes `SceneItem.id`) |
| `scene.placements[].object_name` | scene YAML placement entry | string, must match an `OBJECT_CATALOG` key | required (loader throws at `src/scene_runtime/loader/scene.ts`) | typed at `src/scene_runtime/types.ts:116`; resolved at `src/scene_runtime/layout/adapter.ts:82`; renderer lookup at `src/scene_runtime/render/scene.ts:231` |
| `scene.placements[].zone` | scene YAML placement entry | string, must match a `scene.zones[].id` | required (loader throws) | typed at `src/scene_runtime/types.ts:117`; copied to `SceneItem.zone` at `src/scene_runtime/layout/adapter.ts:150` |
| `scene.placements[].depth_tier` | scene YAML placement entry | integer | `0` at `src/scene_runtime/layout/adapter.ts:151` | typed at `src/scene_runtime/types.ts:118`; copied to `SceneItem.depthTier` at `src/scene_runtime/layout/adapter.ts:151` |
| `scene.placements[].position` | scene YAML placement entry | `Record<string, number>` | optional (no current runtime consumer) | typed at `src/scene_runtime/types.ts:121`; not read in `adapter.ts` or `layout_engine.ts` (typed-but-dead in current runtime) |
| `scene.zones[].bounds` | scene YAML | `{left, right, top, bottom}` numeric | `{0,100,0,100}` at `src/scene_runtime/layout/adapter.ts:185` | consumed at `src/scene_runtime/layout/adapter.ts:186-190` to build `ZoneDef.x0`, `ZoneDef.x1`, `ZoneDef.baseline` |
| `scene.zones[].align` | scene YAML | string enum `center`, `left`, `right`, `justify`, `tab-stops` | `center` at `src/scene_runtime/layout/adapter.ts:191` | consumed at `src/scene_runtime/layout/layout_engine.ts:289` |
| `scene.scene_bounds` | scene YAML | `{left, right, top, bottom}` numeric | optional; omitted when absent | typed at `src/scene_runtime/types.ts:129`; passed through at `src/scene_runtime/layout/adapter.ts:218-225` |
| `scene.layout_rules.label_font_size` | scene YAML | number | `14` (`DEFAULT_LABEL_FONT_SIZE` at `src/scene_runtime/layout/adapter.ts:35`) | read at `src/scene_runtime/layout/adapter.ts:202` |
| `scene.layout_rules.label_line_height` | scene YAML | number | `1.2` (`DEFAULT_LABEL_LINE_HEIGHT` at `src/scene_runtime/layout/adapter.ts:36`) | read at `src/scene_runtime/layout/adapter.ts:204` |
| `scene.layout_rules.label_offset_y` | scene YAML | number | `10` (`DEFAULT_LABEL_OFFSET_Y` at `src/scene_runtime/layout/adapter.ts:37`) | read at `src/scene_runtime/layout/adapter.ts:206` |
| object `visual_states[*].cases[].asset_name` | object YAML `visual_states` block | string, must resolve to an `SVG_<NAME>` export | required when matching case fires | typed at `src/scene_runtime/types.ts:164-165`; resolved at `src/scene_runtime/render/scene.ts:194-198`; loaded at `src/scene_runtime/render/svg_loader.ts:27,45` |

### Generated TypeScript fields

| Field | Definition | Type | Consumer trace |
| --- | --- | --- | --- |
| `OBJECT_CATALOG[name].layout.default_width` | emitted at `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:194` | `number?` | read into `AssetSpec.defaultWidth` at `src/scene_runtime/layout/adapter.ts:164,169` |
| `OBJECT_CATALOG[name].layout.label_width` | emitted at `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:195` | `number?` | read into `AssetSpec.labelWidth` at `src/scene_runtime/layout/adapter.ts:165,170` |
| `OBJECT_CATALOG[name].layout.anchor_y` | emitted at `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:196` | `string \| number?` | normalized at `src/scene_runtime/layout/adapter.ts:135-144` |
| `OBJECT_CATALOG[name].layout.anchor_y_offset` | emitted at `pipeline/build_object_data.py:444`; typed at `src/scene_runtime/types.ts:197` | `number?` | read into `AssetSpec.anchorYOffset` at `src/scene_runtime/layout/adapter.ts:166,171` |
| `OBJECT_CATALOG[name].object_name` | emitted in `pipeline/build_object_data.py` per-object record | string | becomes `SceneItem.svgAsset` at `src/scene_runtime/layout/adapter.ts:148`; drives SVG lookup at `src/scene_runtime/render/svg_loader.ts:27` |
| `OBJECT_CATALOG[name].visual_states.*.cases[].asset_name` | emitted from object YAML by `pipeline/build_object_data.py` | string | resolved at `src/scene_runtime/render/scene.ts:194-198`; loaded at `src/scene_runtime/render/svg_loader.ts:45` |
| `SVG_<NAME>` constants | `generated/svg_assets/index.ts` barrel re-exports | string (raw SVG markup) | star-imported at `src/scene_runtime/render/svg_loader.ts:13`; resolved via `"SVG_" + assetName.toUpperCase()` at `src/scene_runtime/render/svg_loader.ts:27` |
| `SCENE_CATALOG[scene_id]` | `generated/scene_data.ts` (emitted by scene builder) | `ResolvedSceneConfig` | injected into loader at `src/scene_runtime/loader/scene.ts:27-30` |

### Runtime-internal sizing fields

These fields exist only inside the runtime; they are derived from
authored fields above and are not author-visible. Listed for
completeness so follow-on work does not confuse them with authored
vocabulary.

| Field | Definition | Producer | Consumer |
| --- | --- | --- | --- |
| `AssetSpec.defaultWidth` | `src/scene_runtime/layout/types.ts:45` | written at `src/scene_runtime/layout/adapter.ts:169` from `layout.default_width` | `src/scene_runtime/layout/layout_engine.ts:261,575` |
| `AssetSpec.labelWidth` | `src/scene_runtime/layout/types.ts:46` | written at `src/scene_runtime/layout/adapter.ts:170` from `layout.label_width` | `src/scene_runtime/layout/layout_engine.ts:264,566` |
| `AssetSpec.anchorYOffset` | `src/scene_runtime/layout/types.ts:47` | written at `src/scene_runtime/layout/adapter.ts:171` from `layout.anchor_y_offset` | `src/scene_runtime/layout/layout_engine.ts:426` (applied at tip-anchor branch `:434`) |
| `SceneItem.id` | `src/scene_runtime/layout/types.ts:27` | `src/scene_runtime/layout/adapter.ts:147` from `placement_name` | layout engine zone packing |
| `SceneItem.svgAsset` | `src/scene_runtime/layout/types.ts:28` | `src/scene_runtime/layout/adapter.ts:148` from `object_name` | layout engine spec lookup; renderer asset resolution |
| `SceneItem.zone` | `src/scene_runtime/layout/types.ts:30` | `src/scene_runtime/layout/adapter.ts:150` from `placement.zone` | layout engine zone bucketing |
| `SceneItem.depthTier` | `src/scene_runtime/layout/types.ts:31` | `src/scene_runtime/layout/adapter.ts:151` from `placement.depth_tier` | depth scaling in layout engine |
| `SceneItem.anchorY` | `src/scene_runtime/layout/types.ts:34` | `src/scene_runtime/layout/adapter.ts:153` from `layout.anchor_y` | vertical anchor branch at `layout_engine.ts:431-434` |
| `ComputedItemLayout.{x,y,width,height}` | `src/scene_runtime/layout/types.ts:108-112` | layout engine output | written to `<svg>` attributes at `src/scene_runtime/render/scene.ts:139-143` after read at `:253-256` |

## Wrong vocabulary (do NOT use)

These names occur in stale plans, comments, or older audit
references. Each is annotated with the actual repo state. If a
follow-on plan uses one of these names, treat it as a defect and
fix the plan before acting.

- `ASSET_SPECS` (catalog constant): does not exist. Zero
  occurrences in `generated/`. The runtime catalog is
  `OBJECT_CATALOG`, defined by the emission at
  `pipeline/build_object_data.py:444` and typed at
  `src/scene_runtime/types.ts:186-200`.
- `ASSET_SPECS.defaultWidth`: see above; both halves of the name
  are wrong. The runtime equivalent is
  `OBJECT_CATALOG[name].layout.default_width` (snake_case at the
  authored / generated boundary) which is converted into the
  runtime-internal `AssetSpec.defaultWidth` (camelCase) inside
  the layout adapter.
- `layout.display_width_cm`: not a field. Zero occurrences in
  `generated/` and `src/`. The canonical field is
  `layout.default_width` and it is unitless in the layout
  engine, not cm-tagged. No cm-to-pixel conversion stage
  exists.
- `width_scale` / `widthScale`: removed. Zero occurrences in
  `generated/object_data.ts` and zero occurrences in
  `src/scene_runtime/layout/layout_engine.ts` and
  `src/scene_runtime/layout/types.ts`. The current
  `AssetSpec` shape at `src/scene_runtime/layout/types.ts:44-48`
  carries only `defaultWidth`, `labelWidth`, and optional
  `anchorYOffset`; there is no `widthScale` field at the asset
  or item level. The R4 dead-typed-path recommendation has
  been carried out.
- Asset alias map: does not exist. `src/scene_runtime/render/svg_loader.ts:25-36`
  performs a literal `"SVG_" + assetName.toUpperCase()` lookup
  against the `generated/svg_assets/index` barrel. Asset name
  mismatches surface as the export lookup returning `undefined`
  (caller substitutes a fallback rect), not as an alias miss.
- `placement.position.scale`: not wired. `PlacementConfig.position`
  is typed as `Record<string, number>` at
  `src/scene_runtime/types.ts:121` but the layout adapter does
  not read it. Treat as typed-but-dead at the placement layer;
  do not author against it expecting a sizing effect.

## Transitional notes

None. This document records the present runtime state as of
repo `VERSION` `26.05.17`. All wrong-vocabulary entries above
are dead at the time of writing, not in-flight migrations. No
`schema_version` field exists or is planned; the repo `VERSION`
is the sole schema version anchor per
[docs/PRIMARY_SPEC.md](../../PRIMARY_SPEC.md) section
"No schema version".

## Recommendation

This document should graduate from `docs/active_plans/reports/`
into `docs/specs/` after V4 review, candidate path
`docs/specs/SIZING_AND_ASSET_FIELDS.md`. Rationale:

- The field table is a closed authoring surface that authors
  need to read while editing object and scene YAML; canonical
  authoring docs belong under `docs/specs/`.
- The wrong-vocabulary list is reusable across reviews and
  audits; keeping it in an active-plans report risks the list
  drifting out of view once Round 3 closes.
- The trace pattern (authored -> generated -> runtime, with
  `file:line` citations) is the format
  [docs/PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) requires
  for closed-vocabulary surfaces.

Before graduation, V4 review should confirm: no further
typed-but-dead fields remain in the path; the canonical field
count matches the authoring schema in
[docs/specs/SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md)
and the object YAML format spec; and the wrong-vocabulary list
is reconciled with any new audit findings between R4 and
graduation.

Keep / Reject recommendation: keep and graduate to canonical
`docs/specs/` after V4 review.

## Field counts

- Canonical fields: 24 (15 content YAML, 8 generated TypeScript,
  9 runtime-internal). Counted as one row per table entry across
  the three canonical tables; the runtime-internal block contains
  derived fields that pair with authored fields rather than new
  authoring vocabulary.
- Wrong-vocabulary entries: 6.

## Verification

- ASCII compliance: `python3 tests/check_ascii_compliance.py
  docs/active_plans/reports/round3_v1_sizing_field_documentation.md`.
- Markdown links: `pytest tests/test_markdown_links.py -q`.
