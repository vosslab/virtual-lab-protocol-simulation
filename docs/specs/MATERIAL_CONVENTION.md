# Material convention

This document is the canonical **runtime and object rendering convention** for
materials: how a resolved material identity and amount become visible on an
object, the closed render-effect tokens, the closed target vocabulary, the
generic evaluation rule the runtime follows, and the empty/zero and color rules.

This doc owns rendering mechanics only. The other material surfaces live in their
own docs and must not be restated here:

- The closed material terms (material, material identity, material state,
  sentinel, visible material, registry, mixture, waste, transfer, color
  resolver) are defined in [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md).
- The `materials.yaml` file schema (keys, `label`, the scalar `display_color`
  hex format, registry scope) is defined in
  [MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md).
- The design rationale (why color is identity, why empty is transparent, why
  identity and amount are separate layers) is in
  [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md).
- The validator and cross-YAML agreement rules are in
  `MATERIAL_LINT.md`.
- The `visual_states` authoring keys on an object (`kind`, `cases`, `formula`,
  `applies_to`) are defined in [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md).
  This doc names the render-effect and target *semantics* the runtime applies;
  the object-side declaration keys that select them are owned by that doc.

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

## The general render model

A material becomes visible through one declarative contract that is identical for
every object kind that holds, contains, or carries a material: a well subpart, a
pipette, a reagent bottle, a flask, a conical tube, a microtube, a waste
container, and an electrophoresis chamber all render through the same model. The
model has four declarative parts and one resolver:

- a **driving state field** (the `state_field` whose value drives the render):
  a material-identity field (`material_name` / `held_material_name`) or a
  material-amount field (`material_volume` / `held_material_volume`);
- an **`applies_to` scope** (`object` or `subpart`): whether the effect renders
  on the whole object or independently per structured subpart;
- a **`render_effect`** (the closed set below): what visible change the field
  drives;
- a **`target`** (the closed vocabulary below): which region of the rendered
  art the effect updates;
- the **color resolver** (defined in [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)),
  the single component that turns a material name into a color.

The runtime keys on these four declarative parts, never on object identity. No
runtime code path names "plate", "well", "pipette", or any specific object. A new
structured object renders its materials by declaring these parts plus its
geometry or anchors; it requires no new object-specific TypeScript renderer. This
is the declarative ownership boundary (contract item 1): `materials.yaml` owns
what color a material is, the object declaration owns where and why color
appears, generated data owns subpart geometry, and TypeScript owns only how to
interpret the declared contract.

## Render-effect set (closed)

A `render_effect` is the visible change a driving field produces. The set is
closed and extensible only by a vocabulary edit (see
[SPEC_DESIGN_CHECKLIST.md](SPEC_DESIGN_CHECKLIST.md)); an author selects an
effect, never invents one. There are exactly two effects, one per render layer:

| `render_effect` | Layer    | Driving field type        | Updates                                                    |
| --------------- | -------- | ------------------------- | --------------------------------------------------------- |
| `material_tint` | identity | a material-name field     | `fill` of the target region                               |
| `fill_height`   | amount   | a material-volume field   | `fill`, `y`, `height` (and `clip-path`) of the target region |

The two layers are independent (see [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md)):
color encodes identity and only identity; height encodes amount and only amount.
A vessel may declare one effect, the other, or both; each is resolved
independently from its own driving field.

### `material_tint` (identity layer)

`material_tint` recolors the fill of the target region to the resolved material's
`display_color`. It is the effect that makes a clear well or vessel read as the
right substance (blue reads as PBS, pink as media, violet as a drug). It targets
only the fillable interior region named by `target`; it never recolors the
glassware outline, the cap, or a label.

Typed params:

| Param          | Required | Type   | Allowed values                                      | Meaning                                                       |
| -------------- | -------- | ------ | --------------------------------------------------- | ------------------------------------------------------------ |
| `render_effect`| yes      | enum   | `material_tint`                                     | selects the identity effect                                  |
| `applies_to`   | yes      | enum   | `object`, `subpart`                                 | render once for the object, or independently per subpart    |
| `target`       | yes      | enum   | a member of the target vocabulary (below)           | which region's `fill` is recolored                          |

The driving field is the `visual_states` key the effect is declared under (a
material-name field); the effect names no field of its own. Color comes only from
the color resolver reading the material's scalar `display_color`; the declaration
names no hex value.

Example (a well subpart tinted by its own material identity):

```yaml
visual_states:
  material_name:
    applies_to: subpart
    render_effect: material_tint
    target: subpart_geometry
```

At render time, for each well subpart the runtime reads that subpart's
`material_name`, resolves it through the color resolver, and sets the `fill` of
that subpart's generated geometry to the resolved color. When the value is
`empty` (or the subpart's `material_volume` is `0`), no fill is rendered (see
empty/zero semantics below).

### `fill_height` (amount layer)

`fill_height` raises and lowers the liquid surface of the target region with the
material amount, computed from the driving volume field against a declared
capacity. Height encodes amount and never identity; the fill color still comes
from `material_tint` when both effects are declared on the same region. The
runtime computes the fill as `height * (volume / capacity)`, anchors the fill to
the bottom of the target bounds, and clips it to the declared clip region.

Typed params:

| Param          | Required | Type    | Allowed values                                       | Meaning                                                                 |
| -------------- | -------- | ------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `render_effect`| yes      | enum    | `fill_height`                                        | selects the amount effect                                              |
| `applies_to`   | yes      | enum    | `object`, `subpart`                                  | render once for the object, or independently per subpart              |
| `target`       | yes      | enum    | `anchor_liquid_bounds` (or a `subpart_geometry` region) | which region's bounds the fill rises within                           |
| `clip`         | no       | enum    | `anchor_liquid_clip`                                 | the clip region the fill is masked to (for anchor targets)            |
| `capacity_ul`  | one of   | float   | positive number                                      | the vessel capacity in microliters; the volume/capacity denominator   |
| `capacity_ml`  | one of   | float   | positive number                                      | the vessel capacity in milliliters; the volume/capacity denominator   |

Exactly one of `capacity_ul` / `capacity_ml` is declared, matching the driving
volume field's unit. The driving field is the `visual_states` key the effect is
declared under (a material-volume field).

Example (a serological pipette filled by the amount it holds, for reference; the
existing vessel fill behavior):

```yaml
visual_states:
  held_material_volume:
    applies_to: object
    render_effect: fill_height
    target: anchor_liquid_bounds
    clip: anchor_liquid_clip
    capacity_ml: 25.0
```

`fill_height` and anchor-target rendering are specified here as part of the
general model.

## Target vocabulary (closed)

A `target` names the region of the rendered art an effect updates. The
vocabulary is closed and covers both generated geometry (structured subparts the
generator emits) and SVG anchor regions (vessel and instrument liquid regions
authored into the base SVG). The interpreter is agnostic to object kind because
both target kinds are explicitly typed.

| `target`               | Kind               | Region it names                                                           |
| ---------------------- | ------------------ | ------------------------------------------------------------------------ |
| `subpart_geometry`     | generated geometry | the generated shape for the current structured subpart (well, lane, rack position) |
| `anchor_liquid_bounds` | SVG anchor         | the authored fill region a vessel's or instrument's liquid rises within  |
| `anchor_liquid_clip`   | SVG anchor         | the authored clip region that masks a vessel's liquid fill               |

### Generated geometry targets

`subpart_geometry` resolves to the generated shape for the subpart the effect is
currently rendering. The generator emits one typed geometry entry per subpart,
position-derived from the base art so the colored shape sits on the real subpart
(spatial correspondence). The shape set is closed; `circle` covers round wells
and `rect` covers rectangular subparts (gel lanes, rack slots). Other shapes
(`ellipse`, `path`) are added only when a current or near-term SVG needs one;
`path` is avoided unless no simpler shape fits.

```
type SubpartGeometry =
  | { shape: "circle"; cx: number; cy: number; r: number }
  | { shape: "rect"; x: number; y: number; w: number; h: number };
type SubpartGeometryMap = Record<string, SubpartGeometry>;
```

The 96-well plate emits `circle` entries keyed by subpart name (`A1`, `B7`,
`H12`). The map is the typed, deterministically ordered input the overlay
renderer iterates; each subpart-name key resolves to its own geometry so a write
to `A1` colors the top-left well and a write to `H12` colors the bottom-right.

### SVG anchor targets

`anchor_liquid_bounds` and `anchor_liquid_clip` name the two invisible anchor
regions authored into a vessel or instrument base SVG. They are the vessel/
instrument counterpart of generated geometry: a pipette, bottle, flask, conical
tube, microtube, waste container, and electrophoresis chamber all carry these two
anchors and render their liquid through the same effects.

```
type AnchorTarget = "anchor_liquid_bounds" | "anchor_liquid_clip";
```

A visual-state target is therefore one of: a `subpart_geometry` region (resolved
through the `SubpartGeometryMap`), or an `AnchorTarget`. The interpreter handles
both through one code path.

#### Authored anchor SVG structure

Each base SVG that supports liquid rendering defines a `<clipPath>` with bare id
`anchor_liquid_clip` shaped to the container interior (the fillable region only,
excluding cotton plug, tip, cap, or label), and an invisible
`anchor_liquid_bounds` rect marking the region the fill rises within.

```svg
<defs>
	<clipPath id="anchor_liquid_clip">
		<rect x="5.5" y="15" width="5" height="101" rx="0.5"/>
	</clipPath>
</defs>
<rect id="anchor_liquid_bounds" x="5.5" y="15" width="5" height="101"
      fill="none" stroke="none" display="none"/>
```

The clip geometry must cover the interior space where liquid appears without
spilling onto non-liquid parts of the art.

#### Anchor id boundary: bare authored targets, resolved per SVG instance

The authored SVG carries bare `id="anchor_liquid_clip"` and
`id="anchor_liquid_bounds"`, and the object declaration names those bare targets
(`anchor_liquid_bounds`, `anchor_liquid_clip`). These names are declarative
targets, not DOM ids. Authors type the bare name, and material code reads the
bare name; neither side ever constructs a longer DOM id from it.

The bare authored id is not the live DOM id. SVG markup is injected into a shared
DOM, where many assets reuse the same internal ids (`id="a"`, and the two anchor
ids), so a bare `url(#anchor_liquid_clip)` reference would resolve against
whichever instance defined that id first. To keep references local to one
rendered instance, the SVG-injection path namespaces every internal id **per
render instance** as it injects. That namespacing is owned by the SVG pipeline
(see [SVG_PIPELINE.md](SVG_PIPELINE.md)), not by the material layer.

Earlier wording said the generator namespaces these ids to a fixed
`<asset_name>__anchor_liquid_*` form at composition time. That was a
composition-time, per-asset assumption that does not survive per-instance
namespacing: two placements of the same asset share an asset name but are
separate render instances with separate DOM ids, so a per-asset prefix cannot
address one instance. The fixed-prefix form is removed; the bare target is
resolved to a concrete instance through the lookup contract below.

The asset-readiness check in the object validator opens each collapsed base SVG
and confirms both bare ids are present; a missing bare id is reported against the
SVG path, not the YAML. The same two bare ids appear in every vessel/instrument
kind.

##### Lookup contract for an SVG-anchor target

Runtime material code never constructs a DOM id. For an `anchor_liquid_bounds`
or `anchor_liquid_clip` target, the runtime resolves the bare authored target to
the rendered DOM element for **that SVG instance** through a lookup seam owned by
the SVG-injection path. The seam is the SVG plan's deliverable (exposed by its
M5 static-SVG-plus-manifest stage); the material layer is its caller, not its
implementer, and this doc does not define the seam's function signature.

After M5 there is a single SVG DOM path: a static SVG file's text is fetched,
per-instance namespaced on injection, and then used by material and anchor
rendering. There is no second, old-registry compatibility path; the lookup seam
is the only way the material layer reaches an injected anchor element.

SVG DOM is the legitimate rendering substrate here, not application state. For an
object whose internal SVG structure is part of its declared contract (anchors,
clip-paths, gradients, material targets, per-instance id namespacing), the
injected SVG DOM is the correct and allowed place that structure lives. The DOM
is never used as application state or control flow: render state, reactivity, and
attribute updates stay in the Solid layer, and the runtime never reads a value
back out of the DOM to decide what to do next.

DOM access is isolated in the SVG injection/lookup layer. Material code asks that
layer for a declared target and receives the resolved element; it does not build
ids and does not query arbitrary DOM itself. The material layer issues no
`document.querySelector`, no `getElementById`, and no string-built `url(#...)`
reference; every reach into the injected SVG goes through the lookup seam. Solid
owns state, reactivity, and attribute updates: the material renderer updates the
declared attributes (`fill`, `x`, `y`, `width`, `height`, `clip-path`, `opacity`)
on the element returned by the lookup seam through Solid reactivity, rather than
reading or writing the DOM as a state store.

##### No id construction by name concatenation (invariant)

Runtime material code must not construct a DOM id by concatenating asset, scene,
placement, target, or anchor names (no `<asset_name>__anchor_liquid_clip`, no
`<placement>_<target>`, no string-built `url(#...)` reference). The material
layer owns declarative target names only; turning a bare target into a concrete
DOM element is the SVG-injection path's job, reached through the lookup seam
above. Constructing an id by name is a layer-boundary violation: it reintroduces
the per-asset assumption that per-instance namespacing exists to remove.

Well subparts (`target: subpart_geometry`) are namespace-safe by construction:
they render into a separate overlay SVG built from generated geometry that
references no base-SVG ids, so they carry no shared-id collision and need no
lookup seam.

## Generic evaluation rule

The runtime applies one rule for every render effect, with no object-specific
branch:

1. For each `visual_states` entry, read its driving state field, its
   `applies_to` scope, its `render_effect`, and its `target`.
2. Resolve the driving field independently per scope: for `applies_to: object`,
   read the object's field value once; for `applies_to: subpart`, read each
   structured subpart's field value independently (a per-subpart material name is
   resolved per subpart, not once for the whole object).
3. For a `material_tint` effect, resolve the material name through the color
   resolver to a color; for a `fill_height` effect, compute the fill geometry
   from the volume and capacity.
4. Apply the declared effect to the declared target by updating only SVG
   attributes (`fill`, `y`, `height`, `clip-path`, and the like). The runtime
   never adds, removes, or reorders DOM nodes per state change.

This is the static-overlay model: the renderer builds a stable overlay structure
once from the declarations plus the geometry, and runtime state updates only the
declared attributes of existing nodes. The same interpreter serves a well
(`subpart_geometry`, `material_tint`), a pipette (`anchor_liquid_bounds` /
`anchor_liquid_clip`, `fill_height` from `held_material_volume`), and a bottle
(anchor target, `fill_height` from `material_volume`). The runtime dispatches on
the declared contract, not on which object it is rendering.

## Color resolver behavior

The color resolver (named and bounded in
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)) is the single component that
turns a material name into a renderable color. This doc owns its runtime
behavior: its typed result, what each input maps to, and how rendering consumes
the result. No other component turns a name into a color, and no component
invents a local fallback color or reinterprets a failure.

The resolver takes a material name and the active material registry and returns a
concrete typed result, a discriminated union of a success or a failure:

```
type ColorResult =
  | { ok: true; color: string | null }
  | { ok: false; reason: string };
```

The `color` of a success is either a `#rrggbb` hex string or `null`. `null` is
not a failure: it is the one success that renders no fill (the `empty` case). A
failure carries a human-readable `reason` and renders no color through the
degrade path, never a painted region.

The resolver maps each input to exactly one result:

| Input material name                                       | Result                                  | Rendered as                                  |
| -------------------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| `empty`                                                  | `{ ok: true, color: null }`             | no fill (`fill="transparent"`); art shows through |
| `mixed`                                                  | `{ ok: true, color: "#686868" }`        | the spec-fixed built-in gray                 |
| a registry-backed name with a valid scalar `display_color` | `{ ok: true, color: "#rrggbb" }`        | that scalar color                            |
| a non-`empty` name absent from the registry and not a built-in | `{ ok: false, reason }`           | the per-item degrade path (never a color)    |
| a registry-backed name whose `display_color` is missing or not a valid `#rrggbb` | `{ ok: false, reason }` | the per-item degrade path (never a color)    |

`empty` is the only `ok: true` with `color: null`; it is the single no-fill
success. The built-in `mixed` is resolved by the resolver itself to the concrete
spec-fixed gray `#686868` (see "Built-in material colors" below); it is never a
registry lookup and never resolves to `null`. The resolver reads only the scalar
`display_color` (see [MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md) for the
`^#[0-9a-f]{6}$` format); it selects no theme and reads no `.light` / `.dark`
branch, because no such branch exists.

The success/failure split is the rendering boundary: an `ok: true` result paints
the resolved `color` (or paints nothing for `null`), and an `ok: false` result is
routed, unmodified, to the observable per-item degrade path defined in
`MATERIAL_LINT.md`. A consumer must not catch an `ok: false` and substitute a
color, and must not treat `color: null` as a failure. The binding invariant from
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md) holds here: a non-`empty` name
that resolves to no color is a fault to be seen, never a silent invisible
"success".

## Empty, null, and zero-volume semantics

The sentinel material `empty` is the only material name that renders no fill. The
runtime skips the fill entirely when either:

- the driving identity field is `empty` (`material_name == empty` or
  `held_material_name == empty`), or
- the driving amount field is `0` (`material_volume == 0` or
  `held_material_volume == 0`).

When the fill is skipped, the base object art shows through unchanged: no fill
rect, no neutral ring, no gray placeholder. Transparency is the honest visual for
absence of material (see [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md)). The color
resolver returns `null` for `empty`, and the runtime renders `fill="transparent"`
(or omits the fill node's color) for that region.

Every other outcome is a result, not a skip:

- A non-`empty` material name that resolves to a color renders that color.
- A non-`empty` material name that resolves to *no* color is a resolver failure,
  never a silent invisible "success" (the binding invariant from
  [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)). The runtime routes the
  failure to the observable per-item degrade path defined in
  `MATERIAL_LINT.md`;
  it never paints nothing and treats the region as if it succeeded.

`empty` is the single no-fill success; every other no-fill outcome is a fault to
be seen, not hidden.

## Single base SVG, no per-material variant

Each container or pipette is rendered from a single base SVG. The runtime
overlays material fill from the resolved state through the render effects above.
There is no per-material variant SVG: no `<object>_empty.svg`,
`<object>_filled.svg`, or `<object>_with_<material>.svg`. Every material-name
case in an object's `visual_states` resolves to the same `asset_name`; the
visible difference between an empty PBS bottle and a full PBS bottle is the
runtime overlay's height and color, not a second base SVG. Declaring a per-
material variant SVG is the fan-out smell the convention forbids and is rejected
by `validation/yaml/object_validator.py` (and the rules in
`MATERIAL_LINT.md`).

## Declaration-based render mode

Render mode is decided by what an object **declares**, not by its current runtime
state. Any object that declares material rendering or anchor targeting requires
injected, per-instance-namespaced SVG DOM; it is never rendered through an
`<img>` element, even when its material state is currently empty.

An object declares material rendering or anchor targeting when it carries a
`visual_states` entry with a `render_effect` (`material_tint` or `fill_height`)
on a material-name, material-volume, or anchor target. Such a declaration is the
trigger: the runtime must inject the SVG markup so the named ids exist in the DOM
and the lookup seam can resolve them. An `<img>` element exposes no internal DOM
and cannot be per-instance namespaced, so it cannot host an anchor target or a
material overlay.

The trigger is the declaration, not the value. A bottle that declares
`fill_height` but currently holds `empty` still renders as injected SVG, because
the moment its material becomes non-empty the overlay must already have a DOM
home. Deciding render mode from the current value would flip an object between
`<img>` and injected SVG as its state changes, which the static-overlay model
(see "Generic evaluation rule") forbids.

## Single scalar display_color rendering

`display_color` is the sole source of material color for both the body tint
(`material_tint`) and the liquid-fill overlay (`fill_height`). It is a **single
scalar hex string**, read as-is by the color resolver. This project targets light
scientific workspaces only: there is no light/dark theme, no `.light` / `.dark`
branch, and no theme-aware color selection. One color renders a material in every
place it appears.

Material condition (fresh vs spent, unreacted vs reacted) is a separate material
name with its own scalar color, never an alternate color mode of one material
(see [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)). The object and protocol
YAML never name a hex color; they name a material name, and the runtime resolves
that name to its scalar `display_color` through the object's declared visual
state.

## Built-in material colors

A built-in is a visible material whose color is fixed by this spec rather than
authored per protocol. The built-in set is closed and is the only place a color
appears outside `materials.yaml`. Today the set has exactly one member, the
sentinel `mixed`:

| Material name | Built-in `display_color` | Renders | Why built-in                                                                   |
| ------------- | ------------------------ | ------- | ------------------------------------------------------------------------------ |
| `mixed`       | `#686868`                | yes     | A sentinel carrying no tracked identity, so it is not a registry entry; a non-`empty` material must render, so its color is spec-fixed. |

`#686868` is a neutral gray with a 5.57:1 contrast ratio against the white
workspace background (meeting the 5.5:1 bar that
[MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md)
requires of registry colors). Gray carries no specific hue, which matches the
meaning of `mixed`: visibly present, but of unidentified composition. The color
resolver returns this built-in color for `mixed`; `mixed` is never registered in
`materials.yaml` and never renders invisible. Every material name other than the
two sentinels (`empty`, `mixed`) is a registry-backed visible material whose
color comes from its `materials.yaml` entry; see
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md) for the settled
sentinel/visible classification.

## Convention scope

The render model binds every kind that holds, contains, or carries a material:

- `bottle` (every reagent bottle, including waste-feeder bottles)
- `flask` (T75 and other cell-culture flasks)
- conical tube (`conical_tube` and `conical_tube_in_rack`)
- microtube (the dilution microtube subpart inside the well-plate workspace)
- waste container (every `content/objects/waste/*.yaml` object)
- electrophoresis chamber (the inner and outer chambers inside
  `content/objects/equipment/electrophoresis_tank.yaml`, each pairing its own
  per-chamber `<prefix>material_name` / `<prefix>material_volume`)
- well subpart (each well inside `content/objects/plate/well_plate_96.yaml`)
- pipette (every `content/objects/pipette/*.yaml`; uses the `held_material_*`
  field pair instead of `material_*`)

For every kind above, fill color is material identity (driven by `material_tint`
from the resolved `display_color`), and fill height is material amount (driven by
`fill_height` from the volume). The fill never encodes progress state. Progress
state (active, completed, future) is carried by an outline CSS class on the host
element, which never touches the fill color, so material identity stays readable
at every progress stage.

## Worked example: a well subpart and a vessel

Identity layer on a well subpart, plus the (separately implemented) amount layer
on a vessel, both through the same model:

```yaml
# well subpart (per-subpart identity layer; implemented by the well_plate_96 plan)
visual_states:
  material_name:
    applies_to: subpart
    render_effect: material_tint
    target: subpart_geometry

# vessel (object-level amount layer; specified here, implemented by a separate plan)
visual_states:
  material_volume:
    applies_to: object
    render_effect: fill_height
    target: anchor_liquid_bounds
    clip: anchor_liquid_clip
    capacity_ul: 1000
```

For the well: when a subpart's `material_name` is `media`, the runtime resolves
`media` to its registered color and tints that one well's generated circle; when
the subpart is `empty`, the well renders transparent. For the vessel: the fill
rises within `anchor_liquid_bounds`, clipped to `anchor_liquid_clip`, in
proportion to `material_volume / 1000 ul`.

## Testing

`devel/test_pipette_liquid.mjs` uses Playwright to verify the overlay behavior
the runtime provides:

1. Liquid overlay present when a pipette is loaded.
2. Overlay color matches the resolved `display_color` for the held material name.
3. Fill height is non-zero and consistent with the volume/capacity ratio.
