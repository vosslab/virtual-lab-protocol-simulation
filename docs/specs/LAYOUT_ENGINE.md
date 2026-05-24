# Layout engine

## Purpose

This document explains how the layout engine places objects in a scene and
how future scene authors should use it when building a new layout-driven
scene.

The scene runtime is documented in [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md).
The scene YAML schema is documented in
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md); object identity (state, assets,
subparts) is documented in [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) and
[OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md). This guide focuses on the
placement method itself: how object placements, zones, asset metrics, depth,
labels, and scene bounds become positioned DOM elements.

The core implementation lives in layout_engine.ts.
The public types live in `scene_types.ts`, and the
asset metrics live in `asset_specs.ts`.

## Mental model

The layout engine is a deterministic row and zone placer. It does not know lab
biology, protocol meaning, click behavior, or scene-specific rendering. It
accepts static item declarations, static zone declarations, asset sizing
metadata, and viewport dimensions. It returns a `ComputedItemLayout[]` with
percent-based object boxes and label boxes.

The renderer remains responsible for:

- Choosing which scene config to use.
- Converting generated YAML `zones` arrays into a `Record<string, ZoneDef>`.
- Passing the current viewport size.
- Rendering the returned boxes into DOM or SVG.
- Wiring `data-item-id`, click handlers, highlights, and scene-specific state.

The engine remains responsible for:

- Grouping items by `zone`.
- Sorting each zone by `depth_tier`, then `id`.
- Computing horizontal placement from visual width and label footprint.
- Computing vertical placement from zone baselines, item depth, and anchors.
- Computing label wrapping, label positioning, and label collision nudges.
- Translating whole zone groups back into optional `sceneBounds`.

## Runtime pipeline

The current layout-driven scenes follow this data path:

```
content/base_scenes/<base_scene_name>.yaml                       (shared base scenes)
content/protocols/<cluster>/<protocol_name>/scenes/<scene_name>.yaml  (protocol-scoped overrides)
        |
        v
tools/build_scene_data.py
        |
        v
generated/scene_data.ts
        |
        v
src/scene_configs.ts
        |
        v
scene adapter render()
        |
        v
computeSceneLayout(items, ASSET_SPECS, layoutRules, viewportW, viewportH)
        |
        v
positioned scene DOM
```

The engine returns percent units, not pixels. Renderers turn `x`, `y`,
`width`, `height`, `labelX`, `labelY`, and `label_width` into absolutely
positioned CSS percentages. Object height is derived from the SVG viewBox
aspect ratio and the current viewport aspect ratio, so resizing the scene can
change rendered height even when the configured width is unchanged.

`computeSceneLayout()` is pure with respect to DOM state. It groups items by
zone, sorts each group, computes object boxes, computes labels, optionally
translates zone groups back inside `sceneBounds`, and returns data. It does
not mutate the source scene config and does not install click handlers.

Bench and hood are the main layout-engine examples:

- ../../src/scenes/bench/bench.yaml
- render.ts
- ../../src/scenes/cell_culture_hood/cell_culture_hood.yaml
- render.ts

## When to use it

Use the layout engine when the scene is made of lab objects arranged in
physical rows or zones. A layout-engine scene should have zones, row-like
placement, optional depth tiers, labels that may need collision handling, and
SVG-backed objects whose positions can be computed from scene YAML.

Do not use the layout engine just because a scene contains clickable objects.
If the main surface is a structured scientific object, such as a well plate,
tube rack, gel, graph, microscope field, or instrument display, use a custom
geometry renderer for that structured surface. The surrounding loose objects
may still use the layout engine when those objects belong in rows or zones.

The layout engine places objects; it does not place subparts inside a
structured object.

Good fits:

- Bench.
- Hood.
- Shelf.
- Equipment rack.
- Storage area.
- Pipette or tool station.

Poor fits:

- 96-well plate grid.
- Microtube rack with tube-specific liquid state, if individual tube positions
  or fills matter.
- Microscope field.
- Plate-reader table.
- Gel lanes.
- Graph or chart surface.
- Instrument control panel.

Dedicated SVG-coordinate workspaces such as
render.ts
do not use the general layout engine for their internal plate or tube grid.
They own a custom geometric layout because their primary objects are structured
scientific grids, not row-and-zone bench objects.

## Algorithm invariants

The layout engine preserves zone alignment before it tries to hide overflow.
For left-aligned zones, the first item's visual left edge stays on the padded
left edge. For right-aligned zones, the last item's visual right edge stays on
the padded right edge. For centered zones, the visual cluster midpoint stays on
the padded zone midpoint. For justified zones, the intended invariant is that
the first and last visual edges touch the padded zone edges.

These invariants are checked with a small floating-point tolerance after each
zone layout. If the invariant is violated, the engine logs a console warning.
This is a regression signal for layout math, not something scene authors should
work around in YAML.

The engine works from visual boxes and layout footprints:

- The visual box is what the renderer draws.
- The footprint is the spacing slot used to distribute items in a row.
- The footprint can be wider than the visual box to reserve label space.
- Zone-edge invariants use visual edges, not footprint edges.

The engine applies `ZONE_PADDING` internally by shrinking every zone from
`x0..x1` to `x0 + ZONE_PADDING .. x1 - ZONE_PADDING`. Scene authors should not
pre-subtract that padding in YAML.

## Scene items

A layout item is a semantic object that needs a rendered visual box. The
required fields are defined by `SceneItem` in
`scene_types.ts`.

Important fields:

| Field               | Meaning                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `id`                | Stable item id. Also becomes the `data-item-id` click-dispatch attribute in renderers.            |
| `asset_name`        | Key into `asset_specs.ts` and the SVG facade.                                                     |
| `zone`              | Name of the zone that owns the item.                                                              |
| `depth_tier`        | Sort order inside the zone. Lower numbers are placed first.                                       |
| `width_scale`       | Per-scene multiplier on the asset's base width.                                                   |
| `label`             | Full label used for tooltip and label layout.                                                     |
| `anchor_y`          | Vertical anchor mode: `bottom`, `tip`, or `top`.                                                  |
| `align_stop`        | Left, center, or right stop inside `tab-stops` zones.                                             |
| `baseline_override` | Rare per-item baseline override. Used when one object should not sit on the shared zone baseline. |
| `group`             | Optional functional group for automatic depth resolution.                                         |
| `depth`             | Optional manual depth override: `back`, `mid`, or `front`.                                        |

Use `depth_tier` for deterministic ordering, not for visual scale. The engine
sorts by `depth_tier` before placing a zone. It does not infer scale or
prominence from the tier number.

Use `width_scale` for scene-specific relative size. The base size comes from
`ASSET_SPECS[asset_name].default_width`; `width_scale` lets one scene make the same
asset larger or smaller without changing global asset metrics.

## Asset specs

`asset_specs.ts` defines the default metrics that
make a visual asset usable by the layout engine:

| Field             | Meaning                                               |
| ----------------- | ----------------------------------------------------- |
| `default_width`   | Baseline object width in scene-percent units.         |
| `label_width`     | Minimum estimated label width in scene-percent units. |
| `anchor_y_offset` | Optional vertical adjustment for tip-anchored assets. |

The engine derives actual height from the SVG viewBox aspect ratio through
`getAssetAspectRatio(item.asset_name)`, then adjusts by viewport aspect ratio.
Do not hardcode item heights in scene YAML.

When adding a new layout asset:

1. Add or generate the SVG asset through the SVG pipeline.
2. Add an `ASSET_SPECS` entry with a realistic `default_width`.
3. Add a conservative `label_width`.
4. Render the scene at several viewport sizes before tuning `width_scale`.

## Zones

A zone is a horizontal row-like placement area. It defines x bounds, a vertical
baseline, a gap, and an alignment policy.

Important fields:

| Field        | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `zone_name`  | Stable zone name referenced by `items[].zone`.       |
| `x0`         | Left zone edge, in percent of scene width.           |
| `x1`         | Right zone edge, in percent of scene width.          |
| `baseline`   | Vertical baseline, in percent of scene height.       |
| `gap`        | Minimum inter-item gap in scene units.               |
| `align`      | Horizontal placement mode.                           |

Zones should represent meaningful physical regions: a bench shelf, a hood back
row, a front work row, or an instrument row. Avoid creating a new zone for
every individual object. If a row contains left, center, and right clusters,
use one `tab-stops` zone and assign each item an `align_stop`.

The engine applies `ZONE_PADDING` internally, so items and labels do not hug
the exact `x0` and `x1` edges.

## Alignment modes

The engine supports these zone alignment modes:

| Mode        | Placement rule                                                                   |
| ----------- | -------------------------------------------------------------------------------- |
| `left`      | First item visual left edge is flush with the padded left edge.                  |
| `right`     | Last item visual right edge is flush with the padded right edge.                 |
| `center`    | Cluster visual midpoint is centered in the padded zone.                          |
| `justify`   | First and last visual edges are pushed to both padded edges.                     |
| `tab-stops` | Items are partitioned by `align_stop` into left, center, and right sub-clusters. |

`tab-stops` is the preferred mode for lab scenes with visually distinct
groups. The bench `mid_bench` zone, for example, uses a left equipment cluster,
a center equipment cluster, and a right equipment cluster in one row.

## Footprints

The engine distinguishes visual width from layout footprint.

Visual width is the width of the rendered object. Footprint is the horizontal
slot used for spacing. Footprint may be wider than the object so labels have
room to breathe.

The footprint calculation uses:

- Asset `default_width`.
- Item `width_scale`.
- Current item `depth`.
- Estimated label width.
- `MAX_FOOTPRINT_RATIO`, which caps how much a long label can spread objects.

This is why a small object with a long label can occupy more row space than its
SVG appears to need.

The label estimate uses `AVG_CHAR_WIDTH_PCT` times the label length, compared
with the asset's `label_width`. If the full label has spaces and appears wider
than the visual object, the engine estimates the widest line after splitting at
the space nearest the middle. It then caps label-driven footprint growth at
`MAX_FOOTPRINT_RATIO` times the visual width.

Footprints are spacing hints only. The renderer should use `x`, `y`, `width`,
and `height` for the visible object. It should not render the footprint as a
box or use the footprint as the scene object's clickable region.

## Overflow behavior

When items fit, the engine uses the configured alignment and gap policy. When
items do not fit, it shrinks gaps first, then scales the footprints and visual
widths down to `MIN_SCALE`.

If content is still too large after the minimum scale floor, the engine permits
negative gaps. That creates visible overlap while preserving the alignment
invariant. This is intentional: overlap is the visible signal that the zone is
overloaded. The engine should not silently move a left-aligned group to the
center or clamp a right-aligned group to the opposite edge.

Fix overflow by changing the scene design:

- Move some objects to a new zone.
- Use `tab-stops` to group objects more naturally.
- Reduce `width_scale` for the least important objects.
- Remove nonessential labels in the renderer for dense storage objects.

Alignment-specific details:

- `left` and `right` keep the configured `gap` when the row fits.
- `center` may expand gaps, but caps that expansion at `MAX_GAP`.
- `justify` expands the gap so visual edges fill the row.
- `tab-stops` partitions items by `align_stop` and runs left, center, and right
  sub-layouts against the same zone.
- A single `justify` item is centered because one item cannot touch both edges.

Overflow edge cases:

- If the row barely overflows, the engine shrinks gaps before scaling objects.
- If the row still overflows after scaling to `MIN_SCALE`, the gap may become
  negative.
- Negative gap means visible overlap. That is an intentional failure mode.
- The engine logs containment warnings only when there is no negative-gap
  overflow.

## Vertical placement

Vertical placement starts with the zone baseline. The item's rendered height is
computed from the asset aspect ratio and viewport aspect ratio.

Baseline precedence:

1. `item.baseline_override`, if present.
2. `zone.baseline + depthBaselineOffsetFor(item.depth)`.

Anchor behavior:

| `anchor_y` | Placement rule                                                             |
| ---------- | -------------------------------------------------------------------------- |
| `bottom`   | Object bottom sits on the baseline.                                        |
| `tip`      | Object tip sits on the baseline, adjusted by `anchor_y_offset`.            |
| `top`      | Current engine fallback centers the object vertically around the baseline. |

Use `baseline_override` sparingly. It is appropriate when one object in a row
has a different visual contact point, such as the hood flask sitting slightly
lower than neighboring back-row items.

`baseline_override` replaces depth baseline movement. If an item has a manual
baseline override, the engine does not add the `back`, `mid`, or `front`
baseline offset to it. Use this only when an asset's contact point is truly
different from the row baseline.

## Depth

The layout engine supports three visual depth states:

| Depth   | Scale | Baseline offset | Meaning                                  |
| ------- | ----- | --------------- | ---------------------------------------- |
| `back`  | 0.80  | -4              | Parked farther back, smaller and higher. |
| `mid`   | 1.00  | 0               | Normal working position.                 |
| `front` | 1.10  | +4              | Active or pulled forward.                |

The engine only applies the final `depth` value. It does not decide which
items should be front, mid, or back.

That decision happens in
`resolveSceneItemsWithDepth()` in `game_state.ts`.
The resolver promotes active protocol targets to `front`, keeps related grouped
items at `mid`, and parks unrelated grouped items at `back`. Items without a
`group` stay `mid`, which keeps layouts visually stable.

If a new scene wants automatic depth behavior, add meaningful `group` values
to its items and pass the items through `resolveSceneItemsWithDepth()` before
calling `computeSceneLayout()`.

Automatic depth is opt-in through `group`. Items without `group` remain `mid`.
Manual `depth` wins over automatic resolution. With an active protocol step,
target items become `front`, items in the same functional group stay `mid`,
and unrelated grouped items move to `back`. Plates and flasks do not drop below
`mid` in the current resolver.

## Labels

`layoutLabels()` runs after object placement. It mutates the computed layout
objects with:

- `labelLines`
- `labelX`
- `labelY`
- `label_width`
- `labelMultiline`

Labels are centered on the visual object, then clamped to the padded zone
bounds. The label collision pass groups labels by zone, sorts them by `labelX`,
and nudges overlapping neighbors apart for up to three passes.

Label width decisions are made in the same approximate scene-percent units as
the footprint estimate. The label pass recovers the effective layout scale from
the rendered visual width, projects the footprint back to unscaled units, and
uses that as the available width for wrapping decisions.

The collision pass uses a small tolerance and nudges neighbors symmetrically.
Each nudge is capped relative to the zone gap, then clamped back inside the
padded zone. This pass is local to a zone; it does not compare labels across
different zones.

Renderers can still choose not to draw a label. The hood renderer suppresses
some dense storage labels unless the item is active or selected. That is a
renderer policy, not a layout-engine policy.

## Scene bounds

`sceneBounds` is an optional final safety pass. When present, the engine groups
layouts by zone and translates each whole zone group back inside the bounds.

This is a group-level translation, not a per-item clamp. The group-level shift
preserves the row's alignment semantics as much as possible. If a group is too
wide or too tall to fit inside the bounds, the engine warns and chooses the
least surprising edge based on the zone alignment.

Use `sceneBounds` to keep rows inside the scene surface. Do not use it as a
primary layout tool. If a row only looks correct because `sceneBounds` moves it,
fix the zone coordinates or item sizing instead.

The `sceneBounds` pass translates the item box and label position together.
It computes the maximum left, right, top, and bottom violations for the whole
zone group, then applies one `dx` and one `dy` to every layout in that group.
If a group is wider than the bounds, right-aligned groups prefer the right edge;
left and center groups prefer the left edge and log a warning.

## LayoutMove and the layout engine

`LayoutMove` is the protocol-side `scene_operation` that names what moves
and where (see [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)). It stays narrow: it does not rewrite layout.
Only two uses are valid:

- Reposition an existing placement within the current scene (a row-to-row
  move). The layout engine owns the visible motion; the protocol writes the
  semantic `to_slot`.
- Cross-scene transition: remove the placement from one scene and add it to
  another (for example, a pipette moves from the hood to the bench, or a
  protocol uses two bench areas). The protocol writes both `to_scene` and
  `to_slot`; the layout engine on the destination scene places the object
  through the same zone/placement pipeline documented above.

Anything broader (rebuilding zones, redefining alignment policy, swapping
the asset shown) is out of `LayoutMove`'s scope. Asset and color changes
are object/render-layer concerns owned by the object's `visual_states` and
written through `ObjectStateChange`; they are not layout moves.

## Adapter responsibilities

The generated scene config emits `zones` as an array. The layout
engine expects `rules.zones` as a record keyed by zone id. Each layout-driven
adapter must convert the array before calling `computeSceneLayout()`.

Generated scene configs keep `sceneBounds` at the top level, not inside
`layoutRules`. Adapters must copy it into `SceneLayoutRules` so the final
group-translation pass runs.

Minimal adapter pattern (reads the generated TS field `id`, which the build pipeline emits from the authored YAML `zone_name` field per SPEC_DESIGN_CHECKLIST.md rule 25 runtime carve-out):

```ts
const zonesRecord: Record<string, ZoneDef> = {};
for (const zone of SCENE_CONFIG.zones || []) {
  if (zone && zone.id) {
    zonesRecord[zone.id] = zone;
  }
}

const layoutRules: SceneLayoutRules = {
  ...(SCENE_CONFIG.layoutRules || {}),
  zones: zonesRecord,
  sceneBounds: SCENE_CONFIG.sceneBounds,
  labelFontSize: SCENE_CONFIG.layoutRules?.labelFontSize || 14,
  labelLineHeight: SCENE_CONFIG.layoutRules?.labelLineHeight || 1.4,
  labelOffsetY: SCENE_CONFIG.layoutRules?.labelOffsetY || 0,
};

const layout = computeSceneLayout(
  items,
  ASSET_SPECS,
  layoutRules,
  sceneElement.clientWidth || 800,
  sceneElement.clientHeight || 600,
);
```

Then render each `ComputedItemLayout` as an absolutely positioned element:

```ts
html += '<div class="hood-item"';
html += ' data-item-id="' + item.id + '"';
html += ' style="left:' + item.x.toFixed(1) + "%;";
html += "top:" + item.y.toFixed(1) + "%;";
html += "width:" + item.width.toFixed(1) + "%;";
html += "height:" + item.height.toFixed(1) + '%;">';
html += svgHtml;
html += "</div>";
```

Use the computed values directly. Do not add independent positioning math in
the renderer unless the scene is intentionally not using the layout engine.

A layout is not implemented until the renderer consumes the computed layout and
produces visible positioned DOM elements. Adding zones, classes, or CSS without
rendering through `computeSceneLayout()` is not a completed layout-engine
integration.

## New scene workflow

Use this workflow when laying out a new row-and-zone scene:

1. Decide whether the scene is layout-engine-shaped. Benches, shelves, hood
   rows, and tool stations are good fits. Structured scientific surfaces need
   custom SVG coordinates.
2. Sketch the physical rows first. Turn each row into a zone with `x0`, `x1`,
   `baseline`, `gap`, and `align`.
3. Use `tab-stops` when a row has left, center, and right clusters.
4. Add items with stable ids, `asset_name`, `kind`, `zone`, `depth_tier`,
   `width_scale`, `label`, `anchor_y`, and `align_stop`.
5. Add missing asset specs in `asset_specs.ts`.
6. Build the adapter render path by copying the bench or hood conversion
   pattern from generated zones to `SceneLayoutRules`.
7. Render the scene and inspect at several viewport sizes.
8. Tune zone baselines and item `width_scale` before changing engine constants.
9. Add automatic depth only after the static layout is stable.

## Adding a new layout-driven scene

To make a new scene use the layout engine:

1. Create the scene YAML file under
   `content/base_scenes/<base_scene_name>.yaml`.
2. Define scene `items` with stable ids, `asset_name`, `zone`, `depth_tier`,
   `width_scale`, `label`, and `anchor_y`.
3. Define scene `zones` with `id`, `x0`, `x1`, `baseline`, `gap`, and
   `align`.
4. Use `tab-stops` when one row has left, center, and right object clusters.
5. Add missing SVG facade entries if the asset is new.
6. Add missing `ASSET_SPECS` entries in
   `asset_specs.ts`.
7. Create or update the scene adapter render path.
8. Convert generated `zones` arrays into a `Record<string, ZoneDef>`.
9. Call `computeSceneLayout()` with scene items, `ASSET_SPECS`, layout rules,
   and viewport size.
10. Render each returned `ComputedItemLayout` as a visible DOM element with
    `data-item-id`.
11. Wire click handling in the scene adapter or shared scene dispatcher.
12. Run the scene build and TypeScript checks.
13. Save screenshots at laptop and desktop viewports.
14. If the scene participates in a protocol, run the relevant walkthrough.

Minimal YAML shape:

```yaml
items:
  - id: media_bottle
    asset_name: media_bottle
    kind: bottle
    zone: back_row
    depth_tier: 10
    width_scale: 1
    label: Media bottle
    anchor_y: bottom
    group: stocks

zones:
  - id: back_row
    x0: 5
    x1: 95
    baseline: 35
    gap: 4
    align: tab-stops
```

## Layout-ready definition

A scene is layout-ready when every authored item belongs to a valid zone, every
item has an SVG asset and asset spec, the renderer consumes
`computeSceneLayout()`, visible DOM elements use the computed boxes directly,
each scene object's clickable region aligns with the visible object, and
screenshot evidence shows the layout working at more than one viewport size.

## Tuning order

Tune in this order to avoid fighting the engine:

1. Zone geometry (`x0`, `x1`, `baseline`).
2. Item membership in zones.
3. `align` and `align_stop`.
4. Asset `default_width`, if the global asset size is wrong everywhere.
5. Item `width_scale`, if the asset is only wrong in this scene.
6. Renderer-level label suppression for dense, secondary items.
7. `baseline_override`, only for exceptional visual-contact fixes.

Avoid changing engine constants for a single scene. Constants such as
`MIN_SCALE`, `MAX_GAP`, and `ZONE_PADDING` affect every layout-driven scene.

## Common mistakes

- Passing generated `zones` arrays directly to `computeSceneLayout()`. Convert
  them to a record first.
- Omitting `sceneBounds` when the generated scene config defines it at the
  top level. Render adapters must pull it into `SceneLayoutRules`.
- Hardcoding heights in YAML or renderer code. Height comes from SVG aspect
  ratio, item width, and viewport aspect ratio.
- Using `depth_tier` as a visual scale. It is sort order only.
- Adding a zone for every item instead of using tab stops.
- Fixing a crowded row by shrinking every object until labels become unreadable.
- Adding renderer-specific x/y offsets after the engine computes positions.
- Treating CSS classes or zone declarations as a completed layout without
  rendering the scene through `computeSceneLayout()`.
- Using `baseline_override` for normal row placement instead of fixing the zone
  baseline.
- Expecting the engine to understand protocol steps. Step-aware depth belongs
  in the caller.
- Using the layout engine for a coordinate-specific surface such as a plate
  grid, tube rack, graph, gel, microscope field, or instrument panel.

## Debugging edge cases

Use the visual symptom to choose the fix:

- Item does not render: check for a missing `rules.zones[item.zone]`, missing
  asset spec, or adapter render loop that never consumes the returned layout.
- Item renders at the wrong row height: check `baseline`, `anchor_y`,
  `anchor_y_offset`, depth offset, and `baseline_override`. Fix the zone baseline
  before adding per-item overrides.
- Row hugs the wrong side: check `align`, `align_stop`, `depth_tier`, and `id`
  sort order.
- Objects overlap: the zone is overloaded after the `MIN_SCALE` floor. Move
  items to another zone or split the row into tab stops.
- Labels overlap: labels exceed the zone after the three-pass collision nudge.
  Suppress secondary labels in the renderer.
- Whole row shifts unexpectedly: `sceneBounds` translated the zone group. Fix
  zone geometry or item size instead of relying on bounds.
- Click target exists but visual is elsewhere: the renderer probably added its
  own offsets after layout. Use the computed box directly.

Console warnings from layout_engine.ts are
specific:

- `alignment anchor violated` means the visual-edge invariant failed for a
  zone. Treat this as layout-engine math regression unless YAML is malformed.
- `first item escapes left zone edge` or `last item escapes right zone edge`
  means visual containment failed when the row was not in negative-gap
  overflow.
- `zone "<id>" exceeds sceneBounds width` means the whole zone group cannot
  fit horizontally inside `sceneBounds`; the engine chose one edge to honor.
- `zone "<id>" exceeds sceneBounds height` means the group cannot fit
  vertically; the engine prefers the top edge.

When debugging, inspect both the source item and the computed layout. Source
items explain semantic inputs (`zone`, `depth_tier`, `width_scale`, `anchor_y`,
`group`), while computed layouts explain renderer inputs (`x`, `y`, `width`,
`height`, `footprint`, `labelX`, `labelY`, `labelLines`).

## Layout invariant: no clipping or distortion

Canonical home: [../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md).

The layout engine must size containers to fit their placed objects' natural aspect ratios. A container that clips or distorts its placed asset is a layout failure regardless of bbox-level metrics. This rule applies even if precheck reports `hard_fail_count = 0`.

Forbidden in any rendered scene:

- Cropped bottoms of volumetric flasks
- Cropped bottle necks or caps
- Clipped pipette tips
- Hidden instrument edges
- Object artwork cut off by cards, regions, wrappers, `overflow: hidden`, or `.object-graphic` containers
- Squashing or stretching that changes the intended asset aspect ratio

Diagnostic requirement:

- The `artwork_integrity` check must compare the rendered asset bbox against its parent placement card and flag overflow clipping plus aspect-ratio deviation > 5%.
- Visible clipping is HARD FAIL.
- Aspect distortion is HARD FAIL for lab glassware, pipettes, plates, and instruments; advisory for decorative items.

Fix direction (not a substitute for the rule):

- Use `object-fit: contain`, never `cover`.
- Preserve SVG `preserveAspectRatio="xMidYMid meet"`.
- Remove parent `overflow: hidden` where it clips assets.
- Size cards around assets, not assets into too-small cards.
- Add `min-height` / `min-width` for tall glassware cards.

Anti-patterns (forbidden):

- Do not "fix" cropping by hiding cropped assets, deleting DOM, or weakening diagnostics.
- Do not accept a high score if the asset is visibly cropped.
- Do not claim visual success while glassware bottoms are cut off.

## Verification

For documentation-only edits, no runtime test is required. For code or scene
YAML changes that affect layout:

```bash
source source_me.sh && python3 tools/build_scene_data.py
npx tsc --noEmit -p src/tsconfig.json
```

Then save screenshot evidence at laptop and desktop viewports. A passing type
check proves the layout code compiles; it does not prove the scene is visually
correct. If the scene participates in a protocol, also run the relevant
Playwright walker or scene-specific smoke test.

## Related docs

- [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) - Runtime scene driver,
  registry, adapter, and capability model.
- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) - Scene YAML fields and build
  pipeline.
- [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) - Canonical scene terms.
- [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) - Canonical object terms;
  asset metrics like `default_width` migrate here in the follow-on plan.
- [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) - Object-definition YAML
  schema referenced by scene placements.
- [SVG_PIPELINE.md](SVG_PIPELINE.md) - SVG asset generation and ownership.
