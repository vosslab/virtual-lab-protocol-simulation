# Material Convention

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Material vs object

A material is something physically present in, on, produced by, removed from, or transferred between objects. Reagents, media, cells, mixtures, suspensions, and waste are all materials. Liquid is the most common material state, but the vocabulary is not liquid-bound: a future powder, solid, or gel material declares the same two fields.

Objects are interactable rendered things (flask, bottle, pipette, well, waste container). Materials are what can be inside, held by, added to, removed from, or produced by objects. A bottle is an object; PBS is a material; a PBS bottle is an object whose `material_name` state field resolves to `pbs`.

Authoring vocabulary: protocol, object, scene, material.

## Materials YAML schema

Materials are authored per protocol in `content/protocols/<cluster>/<protocol_name>/materials.yaml`. Top-level key is `materials:`. Each entry is keyed by a snake_case identifier.

Closed schema, two required keys, no optional keys:

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `label` | yes | string | Human display label (`"1x PBS"`, `"Cell suspension"`) |
| `display_color` | yes | mapping with `light` and `dark` keys | Nested mapping with theme-specific hex colors (see Palette mapping section below). **DEPRECATED scalar form** (`display_color: "#..."`) will be rejected by V6a validator; migration required. |

Unknown keys are rejected by the validator. A material kind enum (liquid, solid, gel, powder) is intentionally not authored until a non-liquid material needs distinct behavior.

Example (nested palette form, currently valid):

```yaml
materials:
  pbs:
    label: "1x PBS"
    display_color:
      light: "#076dad"
      dark: "#b8e5ff"
  spent_media:
    label: "Spent media"
    display_color:
      light: "#6c6c00"
      dark: "#d8c08a"
  cell_suspension:
    label: "Cell suspension"
    display_color:
      light: "#935d00"
      dark: "#f0d0a0"
  waste:
    label: "Liquid waste"
    display_color:
      light: "#4a4641"
      dark: "#8a7f73"
```

## Palette mapping (nested display_color)

The `display_color` field contains theme-specific colors for light and dark rendering contexts.

### Structure

```yaml
display_color:
  light: "<hex_color>"    # rendered on light background (#ffffff)
  dark: "<hex_color>"     # rendered on dark background (#1a1a1a)
```

Both `light` and `dark` keys are required and contain hex color codes (for example, `"#076dad"`).

### Canonical backgrounds

Material colors are always rendered against one of two fixed backgrounds. These backgrounds are **non-overridable authored constants**:

- **Light mode background:** `#ffffff` (white)
- **Dark mode background:** `#1a1a1a` (very dark gray)

Scenes or UI themes may use either background; material rendering adapts via the corresponding `display_color` entry.

### WCAG contrast requirement

Every `display_color` pair must meet WCAG v2 AA accessibility standards:

- `light` hex color must have a **contrast ratio &ge; 5.5:1** against light background `#ffffff`
- `dark` hex color must have a **contrast ratio &ge; 5.5:1** against dark background `#1a1a1a`

This exceeds WCAG AA's 4.5:1 minimum (see [docs/COLOR_CONTRAST_ACCESSIBILITY.md](../COLOR_CONTRAST_ACCESSIBILITY.md) for details and formula).

### Finding accessible shades

Use `tools/contrast_calculator.py` to verify and derive accessible colors:

```bash
# Check if a color meets 5.5:1 ratio vs white
source source_me.sh && python3 tools/contrast_calculator.py --check '#e60000'

# Audit a set of colors and find replacements
source source_me.sh && python3 tools/contrast_calculator.py --audit
```

The tool exposes pure functions (`contrast_ratio()`, `find_accessible_shade()`) that can be imported for programmatic use during M4 content migration and V6a/V6b validation.

For programmatic access:

```python
from tools.contrast_calculator import contrast_ratio, find_accessible_shade

# Check a color
ratio = contrast_ratio('#e60000', '#ffffff')
if ratio < 5.5:
    # Find a darker shade that meets 5.5:1
    accessible = find_accessible_shade('#e60000', 5.5, bg_hex='#ffffff')
```

## Deprecated scalar display_color

**DEPRECATED.** The scalar form is no longer valid as of material_validator.py V6a.

Old form (invalid):

```yaml
materials:
  pbs:
    label: "1x PBS"
    display_color: "#b8e5ff"    # INVALID: scalar instead of nested mapping
```

**Action required:** All per-protocol `materials.yaml` files using scalar `display_color` must migrate to the nested mapping form. M4 content migration sweeps all existing materials and applies automated migration using `tools/contrast_calculator.py` to derive safe shades for each theme. After M4 completes, V6a validation will enforce nested form and reject any remaining scalars.

## Sentinel material allowlist

A small closed set of material-name values is exempt from per-protocol
`materials.yaml` registration. These sentinels are recognized directly by
the stepper and skipped by the `s-unregistered` gate. The full set is
eight values, grouped by purpose:

| Sentinel | Class | Meaning |
| --- | --- | --- |
| `empty` | state sentinel | empty container; no material present |
| `mixed` | state sentinel | generic blended material whose identity is not tracked |
| `cells` | biological identity | cell biomass; identity is intrinsic to the protocol and is not authored as a chemical reagent |
| `formazan` | biological identity | MTT assay product synthesized in-well from MTT plus living cells; identity is tracked structurally rather than registered |
| `waste_mtt` | disposal sink | MTT-contaminated waste stream |
| `waste_media` | disposal sink | spent-media waste stream |
| `waste_drug` | disposal sink | drug-contaminated waste stream |
| `waste_buffer` | disposal sink | buffer (PBS, wash) waste stream |

The state sentinels are defined by [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md);
the biological-identity and disposal-sink sentinels are recognized by the
material-registration check because they describe outputs of the protocol
or category-named destinations rather than authored input reagents.

The enforcement point is the stepper's `s-unregistered` gate (see
[../USAGE.md](../USAGE.md) "Stepper error classes"); any other
`material_name` or `held_material_name` value must appear in the
protocol's `materials.yaml`.

## Pipette liquid fill (rendering convention)

Serological pipettes in the game visualize liquid fill through a bottom-anchored fill rectangle clipped to the inner glass tube. This section explains the asset structure and color conventions for liquid materials specifically.

## SVG Structure: anchor_liquid_clip

Each pipette SVG that supports liquid visualization must define a `<clipPath>` with id `anchor_liquid_clip` shaped to the container interior (glass tube only, excluding cotton plug and tip):

```svg
<defs>
	<!-- Liquid clipping region: follows inner glass tube only -->
	<clipPath id="anchor_liquid_clip">
		<rect x="5.5" y="15" width="5" height="101" rx="0.5"/>
	</clipPath>
</defs>
```

The clip path geometry must cover the interior space where liquid appears without spilling onto non-liquid parts of the tool.

## Anchor Elements

Two invisible anchor rects help position overlays:

1. **anchor_liquid_bounds**: Defines the fill region where liquid can rise. Typically matches the inner tube bounds.
   ```svg
   <rect id="anchor_liquid_bounds" x="5.5" y="15" width="5" height="101" fill="none" stroke="none" display="none"/>
   ```

2. **anchor_liquid_clip**: The clipPath referenced above, prevents liquid from overflowing.

## Color Map

Liquid colors derive from the authored `materials.yaml` `display_color` field
for each material name. The authored color is the source of truth; the
runtime resolves a `material_name` (or `held_material_name`) state value to
its `display_color` through the object's `visual_states`. The canonical
`materials.yaml` schema lives in this doc (see "Materials YAML schema"
above); [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) cites it.

For the canonical palette of material hex codes currently used in curriculum
content, see [../archive/sds_palette_table.md](../archive/sds_palette_table.md).
The palette values are the primary source of truth; authors write these hex
codes into `materials.yaml` and the runtime never overrides them.

## Runtime implementation note (not authoring vocabulary)

The pipette liquid overlay is rendered at runtime from the resolved
`held_material_name` plus `held_material_volume` state. The runtime computes
fill height as `height * (volume / capacity)`, positions the fill rect at
the bottom of `anchor_liquid_bounds`, and clips to `anchor_liquid_clip`.
Function names, parameter names, and module paths in `src/` are
implementation detail; authoring never names them. See `src/` for the
current implementation surface.

## Authored state model

The authored state surface for held liquid on a tool is the flat
`held_material_name` plus `held_material_volume` `state_fields` declared
on the tool's object YAML (see
[OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md)). The protocol-side primitive
that writes these is `ObjectStateChange`; for example, picking up PBS into a
serological pipette is one interaction whose `response` carries an
`ObjectStateChange` setting `held_material_name: pbs` and
`held_material_volume: 4`.

For containers (flasks, microtubes, wells), the authored state is the flat
`material_name` plus `material_volume` pair, declared on the object via
`state_fields` (per object) or `structure.subpart_state_fields` (per
subpart). Discharging from a pipette into a well is one interaction whose
`response` carries two `ObjectStateChange` ops: one clearing the pipette's
held fields and one setting the well's `material_name` / `material_volume`.

The internal runtime state shape (the in-memory representation, whatever
its keys) is not the authored surface; runtime keys are derivable and may
differ from `held_material_name`. Do not surface runtime field names as
authoring vocabulary.

The choice between `material_name` (vessel) and `held_material_name` (tool) is
closed per `kind` enum value. See [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md)
for the complete kind-to-field convention table and authoring rules.

## Canonical rule: single base SVG + runtime overlay

Each container or pipette is rendered from a single base SVG; the runtime
overlays liquid fill from `material_name` + `material_volume` (or
`held_material_name` + `held_material_volume`) via `anchor_liquid_clip` and
`anchor_liquid_bounds`. There is no per-material variant SVG (no
`<object>_empty.svg` / `<object>_filled.svg` / `<object>_with_<material>.svg`
pair). Every `material_name` (or `held_material_name`) case in an object's
`visual_states` resolves to the same `asset_name`; the visible difference
between an empty PBS bottle and a full PBS bottle is the runtime overlay
height and color, not a second base SVG.

This rule is enforced by `validation/yaml/object_validator.py` as a hard
vocabulary error: an object whose `visual_states` declares a paired
`<prefix>material_volume` `fill_height(...)` composite while its paired
`<prefix>material_name` (or `<prefix>held_material_name`) cases resolve to
more than one distinct `asset_name` is rejected at validation time.

## Convention scope

The canonical rule binds every kind that holds, contains, or carries a
tracked liquid material:

- `bottle` (every reagent bottle, including waste-feeder bottles)
- `flask` (T75 and other cell-culture flasks)
- conical tube (the `conical_tube` and `conical_tube_in_rack` objects under
  `content/objects/microtube/` and `content/objects/rack/`)
- microtube (the dilution microtube subpart inside the well-plate
  workspace)
- waste container (every `content/objects/waste/*.yaml` object)
- electrophoresis chamber (the inner and outer chambers inside
  `content/objects/equipment/electrophoresis_tank.yaml`, each pairing its
  own per-chamber `<prefix>material_name` / `<prefix>material_volume`)
- well subpart (each well inside `content/objects/plate/well_plate_96.yaml`)
- pipette (every `content/objects/pipette/*.yaml`; uses the
  `held_material_*` field pair instead of `material_*`)

For every kind above:

- **Fill = material identity.** The fill color is driven by the
  `display_color` declared for the value of `material_name` (or
  `held_material_name`) in `materials.yaml`. Carboplatin fills are violet,
  media fills are pink, distilled water fills are pale, and so on. The
  fill never encodes progress state.
- **Outline = state class.** Active, completed, and future tubes or wells
  are distinguished by an outline CSS class (for example, glow for
  active, normal stroke for completed, dimmed for future). State
  rendering does not touch the fill color, so material identity stays
  readable at every progress stage.

For microtubes, the renderer resolves the subpart's `material_name` through
the object's `visual_states` and composites a fill rectangle clipped to the
microtube interior; the resolved `display_color` provides the visible
color, and the state class on the host element provides the outline
treatment. For wells, the plate renderer does the same per-well lookup.

## Anchor id boundary: bare ids authored, prefix added by generator

The authored SVG carries bare `id="anchor_liquid_clip"` and
`id="anchor_liquid_bounds"`. The pipeline generator
(`pipeline/generate_svg_globals.py`) and the runtime composite handler
together namespace these ids to `<asset_name>__anchor_liquid_clip` and
`<asset_name>__anchor_liquid_bounds` at composition time, so multiple
assets sharing the same scene SVG never collide on ids.

Authors never type the `<asset_name>__` prefix. The asset-readiness check
in the object validator opens each collapsed base SVG and confirms both
bare ids are present; a missing bare id is reported against the SVG path,
not the YAML.

Example minimal authored SVG fragment:

```svg
<defs>
	<clipPath id="anchor_liquid_clip">
		<rect x="5.5" y="15" width="5" height="101" rx="0.5"/>
	</clipPath>
</defs>
<rect id="anchor_liquid_bounds" x="5.5" y="15" width="5" height="101"
      fill="none" stroke="none" display="none"/>
```

The same two bare ids appear in every kind listed under "Convention
scope"; the generator prefixes them per-asset at namespacing time.

## `empty` semantics: single base SVG, runtime skips the overlay

The sentinel material `empty` resolves to the same base `asset_name` as
every non-empty material value declared on the object. The runtime is
expected to skip the liquid overlay entirely when either
`material_name == empty` or `material_volume == 0` (the equivalent rule
for tools is `held_material_name == empty` or
`held_material_volume == 0`). The validator does not require a separate
base SVG for the `empty` case; on the contrary, declaring one is the
variant-fan-out smell the canonical rule forbids.

Worked single-asset example (every case points at the same base):

```yaml
visual_states:
  material_name:
    kind: svg
    cases:
      - when: empty
        output: { asset_name: bme_bottle }
      - when: bme
        output: { asset_name: bme_bottle }
  material_volume:
    kind: composite
    formula: fill_height(state(material_volume), capacity_ml=500)
```

At render time: when `material_name == empty` (default initial state) or
`material_volume == 0`, the runtime renders only `bme_bottle.svg`. When
`material_name == bme` and `material_volume > 0`, the runtime renders
`bme_bottle.svg` plus a fill rect colored by the `bme` material's
`display_color` and clipped to that asset's prefixed
`<asset_name>__anchor_liquid_clip`.

## Future Extensions

- **Multichannel pipette**: 8 parallel channels with individual fill rects (not implemented)
- **Aspirating pipette**: Similar single-tube fill (not implemented)
- **Dynamic color override**: Mixing on transfer (not implemented; game has no drag-and-drop)

## Testing

`devel/test_pipette_liquid.mjs` uses Playwright to verify:

1. Liquid overlay present when pipette is loaded
2. Overlay color matches the `display_color` for the held `material_name`
3. Fill height is non-zero and consistent with volume/capacity ratio
