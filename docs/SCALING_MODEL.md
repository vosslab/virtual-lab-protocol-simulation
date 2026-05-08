# Real-world dimension scaling model

The game uses a real-world-dimension scaling system to size items in scenes. Items are defined with a `displayWidthCm` value (in cm) which is converted to pixels via a per-scene `pxPerCm` constant.

## Overview

**displayWidthCm** is the game-display footprint of an item in centimeters. This value is intentionally **exaggerated**, not to true scale. A vortex mixer in real life is ~15cm, but we display it as 22cm so it remains visible at typical screen sizes.

**pxPerCm** is a per-scene constant that converts displayWidthCm to visual width. Larger values = bigger items; smaller values = tighter packing.

## Per-scene constants

```typescript
export const SCENE_PX_PER_CM = {
  hood: 8,              // Hood scene: 8 px/cm
  bench: 3.2,           // Bench scene: 3.2 px/cm (tuned for 7-item single row)
  microscope: 8,        // Microscope scene
  incubator: 6,         // Incubator scene
  plate_reader: 8,      // Plate reader scene
};
```

These values are tuned so that:
- Hood items (mostly bottles and pipettes) remain readable at 8 px/cm
- Bench items (7 instruments in a row) fit without overflow at 3.2 px/cm at 1280x720
- Other scenes match their visual design constraints

## How sizing works

1. Item definition includes `displayWidthCm` in `src/content/cell_culture/items.yaml`:
   ```yaml
   centrifuge:
     displayWidthCm: 60  # 60 cm (exaggerated, real ~40cm)
   ```

2. The value is compiled into `EQUIPMENT` in `src/content/inventory_data.ts`

3. Scene configs (`bench_config.ts`, `hood_config.ts`) compute `widthScale` from `displayWidthCm`:
   ```typescript
   widthScale = computeWidthScaleFromDisplay(displayWidthCm, scene, defaultWidth)
   ```

4. The formula:
   ```
   widthScale = (displayWidthCm * pxPerCm) / (defaultWidth * pxPerScenePercent)
   ```
   where `pxPerScenePercent = 11.52` (empirical: 1280px viewport, 90% usable = 1152px)

5. Layout engine uses `widthScale` to render items at the computed size

## Adding a new item

1. Add to `src/content/cell_culture/items.yaml` with `displayWidthCm`:
   ```yaml
   my_instrument:
     label: "My Instrument"
     ...
     displayWidthCm: 45
   ```

2. Rebuild with `bash build_game.sh` (generates `inventory_data.ts`)

3. Add to scene config (e.g., `bench_config.ts`):
   ```typescript
   { id: 'my_instrument', ..., widthScale: getHoodItemWidthScale('my_instrument', 10), ... }
   ```

4. Test with `source source_me.sh && python3 tools/run_protocol_walkthrough.py` to ensure layout fits

## Current fallback behavior

Items **without** `displayWidthCm` fall back to hardcoded `widthScale` values in scene configs:
```typescript
const legacyScales: Record<string, number> = {
  tip_box: 0.80,
  // ... other items
};
```

To migrate an item to `displayWidthCm`:
1. Add `displayWidthCm` to `src/content/cell_culture/items.yaml`
2. Remove the item from `legacyScales`
3. Verify layout with tests

## Tuning displayCm values

Start with rough proportions relative to real-world sizes, then exaggerate for visibility:

| Item type | Real (cm) | Display (cm) | Ratio |
| --- | --- | --- | --- |
| Vortex mixer | 15 | 22 | 1.47x |
| Microcentrifuge | 15 | 25 | 1.67x |
| Benchtop centrifuge | 40 | 60 | 1.5x |
| Water bath | 45 | 55 | 1.22x |
| Incubator | 45 | 50 | 1.11x |
| Cell counter | 35 | 38 | 1.09x |
| Microscope | 30 | 35 | 1.17x |
| Plate reader | 40 | 42 | 1.05x |
| T-75 Flask | 15 | 20 | 1.33x |
| Well plate (24) | 15 | 18 | 1.2x |
| Media bottle | 10 | 12 | 1.2x |
| Serological pipette | 2.5 | 3 | 1.2x |
| Multichannel pipette | 12 | 14 | 1.17x |

Larger items are exaggerated more than smaller items to maintain visibility.

## Optional fudge factor

For visual tweaks on specific items, add `fudge`:
```yaml
my_instrument:
  displayWidthCm: 45
  fudge: 1.1  # 10% larger than computed
```

This multiplies the final `widthScale`: `widthScale *= (fudge ?? 1.0)`

Use sparingly for final layout adjustments.

## Compatibility notes for layout scaling

The layout engine is unchanged. All scaling happens at the scene config level via `widthScale` computation. This ensures:
- Items without `displayWidthCm` continue to work with their hardcoded `widthScale`
- No changes needed to `layout_engine.ts`
- The layout metrics test should continue to pass
