# Pipette Liquid Fill Convention

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

## Overview

Serological pipettes in the game visualize liquid fill through a bottom-anchored fill rectangle clipped to the inner glass tube. This document explains the asset structure and color conventions.

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

Liquid colors are driven by reagent `colorKey` values from `inventory_data.ts:REAGENTS`:

| Reagent | Color Key | Hex Code | Notes |
| --- | --- | --- | --- |
| Complete media | media | #f7a6b8 | Pink |
| PBS buffer | pbs | #b8e5ff | Light blue |
| Trypsin | trypsin | #ffe082 | Yellow |
| Cell suspension | cells | #f3d6a2 | Cloudy tan |
| Drug working solution | drug | #d8b4ff | Violet |
| MTT reagent | mtt | #fff59d | Pale yellow |
| DMSO | dmso | #e0e0e0 | Gray |

Colors are defined in `src/style_constants.ts:COLOR_MAP` and must match the `displayColor` field in `inventory_data.ts`.

## Implementation: createPipetteLiquidOverlay

```typescript
function createPipetteLiquidOverlay(
	equipmentId: string,        // e.g., "sero_pipette"
	volumeMl: number,           // volume in milliliters
	capacityMl: number,         // total capacity in milliliters
	color: string,              // hex color code
	svgString: string           // base SVG to parse anchors from
): string
```

The function:

1. Clamps volume to [0, capacityMl]
2. Parses `anchor_liquid_bounds` from the base SVG
3. Computes fill height as `height * (volume / capacity)`
4. Positions the rect at the bottom of the bounds (bottom-anchored)
5. Clips the rect to `anchor_liquid_clip`
6. Returns SVG string injected into `overlay_root`

## Game State Integration

When a pipette is loaded with liquid via `resolveInteraction`, the state change populates:

```typescript
gameState.heldLiquid = {
	tool: 'serological_pipette',
	liquid: 'pbs',
	volumeMl: 4,
	colorKey: 'pbs'
};
```

When the pipette is used (discharged) or put down, `heldLiquid` is cleared:

```typescript
gameState.heldLiquid = null;
```

## Rendering in Hood Scene

[src/scenes/cell_culture_hood/render.ts](../src/scenes/cell_culture_hood/render.ts) in the `getItemSvgHtml()` function checks if `gameState.heldLiquid.tool` matches the item being rendered:

```typescript
case 'serological_pipette':
	if (gameState.heldLiquid && gameState.heldLiquid.tool === 'serological_pipette') {
		const reagent = REAGENTS[gameState.heldLiquid.liquid];
		const color = reagent ? reagent.displayColor : COLOR_MAP[gameState.heldLiquid.colorKey];
		return getSeroPipetteSvg(gameState.heldLiquid.volumeMl, color);
	}
	return getSeroPipetteSvg();
```

## Convention scope: pipettes, microtubes, and wells

The same convention extends to microtubes and to wells in the
`well_plate_workspace` scene:

- **Fill = liquid identity.** The fill color is driven by the reagent's
  `displayColor` (resolved from `inventory_data.ts:REAGENTS`). Carboplatin
  fills are violet, media fills are pink, distilled water fills are pale,
  and so on. The fill never encodes progress state.
- **Outline = state class.** Active, completed, and future tubes or wells
  are distinguished by an outline CSS class (for example, glow for
  active, normal stroke for completed, dimmed for future). State
  rendering does not touch the fill color, so reagent identity stays
  readable at every progress stage.

For microtubes, the renderer reads `gameState.tubeLiquids[<tubeId>]`
(the layered `MicrotubeLiquid` entries written by
`addTubeLiquid` during dilution prep) and composites a fill rectangle
clipped to the Bioicons `microtube_open_translucent` interior. The
result reagent's `displayColor` provides the visible color; the
state class on the host element provides the outline treatment.

For wells, the plate renderer reads
`gameState.plateLiquids[<wellId>]` populated by the plate-transfer
dispatcher and fills each well with the reagent `displayColor`. The
active well receives the active outline class; completed wells keep
their fill but switch to the completed outline class. See
[src/scenes/well_plate_workspace/render.ts](../src/scenes/well_plate_workspace/render.ts)
for the implementation.

## Future Extensions

- **Multichannel pipette**: 8 parallel channels with individual fill rects (not currently implemented)
- **Aspirating pipette**: Similar single-tube fill (not currently implemented)
- **Dynamic color override**: Mixing on transfer (not currently implemented; game has no drag-and-drop)

## Testing

`devel/test_pipette_liquid.mjs` uses Playwright to verify:

1. Liquid overlay present when pipette is loaded
2. Overlay color matches expected reagent color
3. Fill height is non-zero and consistent with volume/capacity ratio
