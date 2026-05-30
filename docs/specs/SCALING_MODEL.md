# Real-world dimension scaling model

The game uses a real-world-dimension scaling system to size items in scenes. Items are defined with a `display_width_cm` value (in cm) which is converted to pixels via a per-scene `px_per_cm` constant.

## Overview

**display_width_cm** is the game-display footprint of an item in centimeters. This value is intentionally **exaggerated**, not to true scale. A vortex mixer in real life is ~15cm, but we display it as 22cm so it remains visible at typical screen sizes.

**px_per_cm** is a per-scene constant that converts display_width_cm to visual width. Larger values = bigger items; smaller values = tighter packing.

## Per-scene constants

```typescript
export const SCENE_PX_PER_CM = {
  hood: 8, // Hood scene: 8 px/cm
  bench: 3.2, // Bench scene: 3.2 px/cm (tuned for 7-item single row)
  microscope: 8, // Microscope scene
  incubator: 6, // Incubator scene
  plate_reader: 8, // Plate reader scene
};
```

These values are tuned so that:

- Hood items (mostly bottles and pipettes) remain readable at 8 px/cm
- Bench items (7 instruments in a row) fit without overflow at 3.2 px/cm at 1280x720
- Other scenes match their visual design constraints

## How sizing works

1. Object definition includes display sizing in `content/objects/<kind>/<object_name>.yaml`:

   ```yaml
   centrifuge:
     layout:
       display_width_cm: 60 # 60 cm (exaggerated, real ~40cm)
   ```

2. The value is compiled into object metadata in `generated/object_data.ts`
   (gitignored; consumed via the runtime object registry).

3. The layout engine computes an internal `_width_scale` from `display_width_cm`
   during the scale stage (`src/scene_runtime/layout/scale_to_real_world.ts`).
   `_width_scale` is a pipeline-computed quantity (underscore-prefixed). It is
   never authored in YAML; there is no authored `width_scale` field.

4. The formula:

   ```
   _width_scale = (display_width_cm * px_per_cm) / (default_width * px_per_scene_percent)
   ```

   where `px_per_scene_percent = 11.52` (empirical: 1280px viewport, 90% usable = 1152px)

5. Layout engine uses `_width_scale` to render objects at the computed size

## Adding a new object

1. Create or update `content/objects/<kind>/<object_name>.yaml` with layout fields:

   ```yaml
   object_name: my_instrument
   label: "My Instrument"
   layout:
     display_width_cm: 45
   ```

2. Rebuild with `bash build_game.sh` (generates object metadata)

3. Add to scene placement in the relevant `content/base_scenes/` or `content/protocols/<cluster>/<protocol_name>/scenes/`:

   ```yaml
   items:
     - object_name: my_instrument
       zone: bench
       depth_tier: 1
   ```

4. Test with `source source_me.sh && python3 tools/run_protocol_walkthrough.py` to ensure layout fits

## Current fallback behavior

Objects **without** `layout.display_width_cm`, or scenes without a known
workspace `px_per_cm`, fall back to a neutral internal `_width_scale` of `1.0`
(scale source `fallback_authored` or `fallback_no_workspace`). There is no
authored `width_scale` field to supply a custom fallback; size comes from the
object-level `display_width_cm`. The fix for a mis-sized object is to set its
`display_width_cm`, not to add an override.

## Tuning display_cm values

Start with rough proportions relative to real-world sizes, then exaggerate for visibility:

| Item type            | Real (cm) | Display (cm) | Ratio |
| -------------------- | --------- | ------------ | ----- |
| Vortex mixer         | 15        | 22           | 1.47x |
| Microcentrifuge      | 15        | 25           | 1.67x |
| Benchtop centrifuge  | 40        | 60           | 1.5x  |
| Water bath           | 45        | 55           | 1.22x |
| Incubator            | 45        | 50           | 1.11x |
| Cell counter         | 35        | 38           | 1.09x |
| Microscope           | 30        | 35           | 1.17x |
| Plate reader         | 40        | 42           | 1.05x |
| T-75 Flask           | 15        | 20           | 1.33x |
| Well plate (24)      | 15        | 18           | 1.2x  |
| Media bottle         | 10        | 12           | 1.2x  |
| Serological pipette  | 2.5       | 3            | 1.2x  |
| Multichannel pipette | 12        | 14           | 1.17x |

Larger items are exaggerated more than smaller items to maintain visibility.

## No override escape hatches

There is no per-placement size override. The removed `fudge` multiplier and the
authored `width_scale` field were escape hatches and have been deleted from the
schema, the generator, and the layout engine (vocabulary closure:
PRIMARY_DESIGN.md). Object size has exactly one source: the object-level
`display_width_cm` scaled by the workspace `px_per_cm`. To resize an object,
change its `display_width_cm`.
