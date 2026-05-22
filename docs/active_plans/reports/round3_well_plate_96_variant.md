# Round 3 well_plate_96 variant report

R2-ALT workstream. Single-object deep dive on `well_plate_96`, the highest
frequency (292 references) entry in `round3_object_frequency_inventory.md`.
Peer R2 owns the multi-object surface; this report stays scoped to the
plate.

## Approaches explored

### A. Composite render (custom subpart geometry)

Extend `src/scene_runtime/adapters/well_plate/render.ts` to draw a plate
frame (rounded rect background) behind the 96 cells, and render each cell
as an inset circle (real wells are round). Permitted by primary contract
item 3: custom geometry is allowed for subparts inside structured
scientific objects. The well-plate adapter is the canonical home of that
composition.

### B. Single asset_name rename

Inspected `assets/equipment/` for plate-like SVGs (`well_plate_24.svg`,
`96well_pcr_plate.svg`). Read `src/scene_runtime/render/scene.ts:269-286`
and `src/scene_runtime/adapters/well_plate/index.ts`. Confirmed
`tryRenderWellPlate` short-circuits before any `asset_name` lookup for
`kind: plate` objects. The `asset_name: well` lines in
`content/objects/plate/well_plate_96.yaml:497-530` are inert (dead
authored code); renaming them does nothing at runtime. Rejected.

### C. Synthesize `assets/equipment/well.svg`

A minimal `<circle>` SVG would resolve the `well` alias, but the alias is
never consulted (see B). Synthesizing the file changes no rendered
pixel. Rejected.

## Picked approach: A (composite render)

Reason: the adapter is the only code path that actually renders the plate.
Cosmetic state today is plain 12x8 gray squares (see `before_baseline_plate_crop.png`),
which reads as an opaque grid rather than a plate. The frame plus circular
wells convert the same data into a recognizable 96-well plate without
touching authored content YAML, the contract, or the asset pipeline.
Click hit testing is preserved by keeping an invisible bbox-sized
`<rect data-target-id="...">` per cell as an overlay.

## Files changed

- `src/scene_runtime/adapters/well_plate/render.ts`
  - Added plate frame rect (white fill, dark stroke, rounded corners,
    `pointer-events: none`, `data-plate-frame="true"`).
  - Replaced visible cell rect with a circle (`data-well-circle="<cell>"`)
    plus an invisible cell-sized rect that still carries
    `data-target-id`, `data-well`, and `pointer-events: auto`. Click
    behavior unchanged; visual reads as wells in a plate.
- No content YAML changes. No contract edits. No new SVG assets.

## Before / after screenshots

`test-results/round3_well_plate_variants/`:

- `before_baseline.png` -- full mtt_plate_reaction scene; plate renders
  as a uniform gray square grid (legacy adapter output).
- `before_baseline_plate_crop.png` -- tight crop on the plate; gray
  vertical-stripe appearance.
- `after_composite_frame.png` / `after_composite_frame_plate_crop.png`
  -- first revision (frame `#f5f5f5`, well stroke `#666 / 0.6`).
- `after_composite_frame_v2.png` /
  `after_composite_frame_v2_plate_crop.png` -- final revision (frame
  `#ffffff` with `#444 / 2` stroke, well stroke `#888 / 0.4`); plate
  now reads as a rounded white frame with a visible 12x8 grid of
  circular wells.
- `00_before_baseline.png` -- preserved gallery baseline (synthetic
  green-rect renderer; kept for context but not part of the production
  render path).

## Verification commands

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_plate_reaction
npx tsc --noEmit -p tsconfig.json
```

`tsc` exited clean. Bundle and html were rebuilt between revisions.

## Residual issues

- The mtt_plate_reaction scene has unrelated text overlap (labels for
  paper_towel_pad, vortex, multichannel_pipette) that crowd the plate
  visually. Out of scope here.
- Cells still default to `#f0f0f0` when their state is `empty` or
  unrecorded. Material-driven coloring already works in the adapter for
  non-empty wells; no change needed.
- The `asset_name: well` lines in `content/objects/plate/well_plate_96.yaml`
  remain inert. They could be deleted in a separate authored-vocabulary
  pass, but doing so requires confirming the YAML schema allows omitting
  the `visual_states.material_name.kind: svg` block for plate-kind
  objects. Not in this round.
- Other plate-kind objects in the repo (none currently besides
  `well_plate_96`) would automatically pick up the same frame+circle
  treatment via the adapter. No follow-up needed unless a new plate
  object lands.
