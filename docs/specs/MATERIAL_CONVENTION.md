# Material Convention

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Material vs object

A material is something physically present in, on, produced by, removed from, or transferred between objects. Reagents, media, cells, mixtures, suspensions, and waste are all materials. Liquid is the most common material state, but the vocabulary is not liquid-bound: a future powder, solid, or gel material declares the same two fields.

Objects are interactable rendered things (flask, bottle, pipette, well, waste container). Materials are what can be inside, held by, added to, removed from, or produced by objects. A bottle is an object; PBS is a material; a PBS bottle is an object whose `material_name` state field resolves to `pbs`.

Authoring vocabulary: protocol, object, scene, material.

## Materials YAML schema

Materials are authored per protocol in `content/protocols/<protocol_name>/materials.yaml`. Top-level key is `materials:`. Each entry is keyed by a snake_case identifier.

Closed schema, two required keys, no optional keys:

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `label` | yes | string | Human display label (`"1x PBS"`, `"Cell suspension"`) |
| `display_color` | yes | string | Hex color used by the object's `visual_states` to render this material (`"#b8e5ff"`) |

Unknown keys are rejected by the validator. A material kind enum (liquid, solid, gel, powder) is intentionally not authored until a non-liquid material needs distinct behavior.

Example:

```yaml
materials:
  pbs:
    label: "1x PBS"
    display_color: "#b8e5ff"
  spent_media:
    label: "Spent media"
    display_color: "#d8c08a"
  cell_suspension:
    label: "Cell suspension"
    display_color: "#f0d0a0"
  waste:
    label: "Liquid waste"
    display_color: "#8a7f73"
```

Sentinel values `empty` and `mixed` (per [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)) do not appear in `materials.yaml`. They are reserved state values meaning "empty container" and "generic blended material", respectively.

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

Reference palette in current curriculum content:

| Material name | Hex code | Notes |
| --- | --- | --- |
| media | #f7a6b8 | Pink |
| pbs | #b8e5ff | Light blue |
| trypsin | #ffe082 | Yellow |
| cells | #f3d6a2 | Cloudy tan |
| drug | #d8b4ff | Violet |
| mtt | #fff59d | Pale yellow |
| dmso | #e0e0e0 | Gray |

These hex codes are the values authors write into `materials.yaml`; the
runtime never overrides them.

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

## Convention scope: pipettes, microtubes, and wells

The same convention extends to microtubes and to wells in the
`well_plate_workspace` scene:

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

## Future Extensions

- **Multichannel pipette**: 8 parallel channels with individual fill rects (not implemented)
- **Aspirating pipette**: Similar single-tube fill (not implemented)
- **Dynamic color override**: Mixing on transfer (not implemented; game has no drag-and-drop)

## Testing

`devel/test_pipette_liquid.mjs` uses Playwright to verify:

1. Liquid overlay present when pipette is loaded
2. Overlay color matches the `display_color` for the held `material_name`
3. Fill height is non-zero and consistent with volume/capacity ratio
