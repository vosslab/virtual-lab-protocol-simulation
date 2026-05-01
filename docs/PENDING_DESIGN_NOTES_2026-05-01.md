# Pending design notes 2026-05-01

Captured from professor feedback to be addressed later. NOT yet implemented.

## Build state
`bash build_game.sh` exits 1 (verified by audit). Duplicates in `parts/asset_specs.ts`
(`incubator`, `microscope`, `plate_reader` defined twice) and duplicate top-level
declarations of `computeWidthScaleFromDisplay`, `deriveHeldLiquid`, `canonicalTool`.
Walkthrough has not been runnable since the 2026-04-29 Servier integration. Fix this
before any further visual work.

## Asset content fixes

### Flask
- `T75_flask.svg` (user hand-drawn, repo root) is the canonical T-75 flask.
- Servier `culture-flask-filled-lid` (currently active as `t75_flask_v5.svg`) is rejected.
- After swap-back, verify the heldLiquid overlay system actually colors the user's
  flask: PBS blue, trypsin yellow, empty (no overlay). Add anchor system if missing.

### Bottle default fills
- `media_bottle.svg` should default EMPTY. Pink media color comes from heldLiquid
  overlay only.
- `dmso_bottle.svg` currently shows clear liquid with a weird green shadow. Should be
  clear throughout, no green tint.
- `sterile_water_bottle.svg` currently has magenta/purple liquid. Should be clear or
  very pale blue.
- `pbs_bottle.svg`: 2026-04-29 audit confirmed recolor never landed; still magenta
  `#b64392`. Should be `#b8e5ff` blue.

### MTT vial
- Current asset (Servier `tube-screwcap-closed-orange.svg`) reads as a hospital
  blood-collection tube, which is wrong. MTT in lab is a small dark-liquid tube.
- Replacement candidate: a microtube (eppendorf) or a `falcon_15ml`-shape with a dark
  fill applied via the liquid overlay system.

## Asset naming scheme refactor

Rather than naming bottles by their CONTENT (`media_bottle`, `pbs_bottle`,
`trypsin_bottle`, `dmso_bottle`, `sterile_water_bottle`), name by STATE:
- `bottle_empty` (one canonical empty bottle SVG)
- `bottle_filled_pink` / `bottle_filled_blue` / `bottle_filled_yellow` / etc. (or just
  one `bottle_filled` SVG that takes a color via heldLiquid overlay)

Then the game maps `media -> pink`, `pbs -> blue`, `trypsin -> yellow`, etc. via the
existing reagent color map in `parts/style_constants.ts` and `content/cell_culture/reagents.yaml`.

Benefits:
- Asset count drops from 5 bottles to 1 or 2 base SVGs.
- Liquid color is data-driven from the existing color map rather than baked into the SVG.
- Adding a new reagent never requires a new SVG.

This aligns with the heldLiquid overlay pattern already implemented for the serological
pipette in M4 — extend the same convention to bottles.

## Required licensing follow-through
Servier attribution footer in `parts/tail.html` is still missing despite being claimed.
Required by CC-BY-3.0 for the equipment icons retained from the Servier integration.

## Equipment state variants (in-use vs idle)

Every interactive piece of equipment needs at least two visual states:
- **idle** (default): door closed, indicator off, rotor still, no sample loaded
- **in-use**: door open / lid raised, indicator lit, rotor spinning, sample visible

Examples:
- `centrifuge`: idle (lid down) vs running (lid down + spin animation or motion blur)
  vs loading (lid open showing rotor)
- `water_bath`: empty vs with bottles inside. Servier provides both:
  `OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Lab_apparatus/Servier/bath-empty.svg`
  and `bath_filled.svg` (currently used) plus `bath_flask.svg` (with a flask in it).
  Use these directly rather than rolling our own.
- `incubator`: door closed vs door open (showing flask inside)
- `microscope`: empty stage vs slide loaded (eyepiece glow / illuminated sample)
- `plate_reader`: tray closed vs tray extended with plate
- `vortex`: still vs vibrating (motion lines or wobble animation)
- `cell_counter`: blank screen vs displaying count
- Hood items similarly: `flask_capped` vs `flask_open` (cap removed during pipetting),
  `pipette_tipless` vs `pipette_with_tip`.

Implementation options (decide later):
1. Two separate SVG files per item (`centrifuge.svg`, `centrifuge_running.svg`),
   selected by `gameState.equipmentState[itemId]`.
2. Single SVG with named groups (`<g id="state_idle">`, `<g id="state_running">`),
   visibility toggled by CSS class.
3. Overlay system (similar to heldLiquid): base SVG plus a state-specific overlay rect
   or path drawn on top.

Option 2 is cleanest for bench items where the visual delta is small (an LED, a door
position). Option 1 is cleanest where the silhouette changes (door open showing
contents). Option 3 only fits a few cases.

## Gallery rule going forward
The asset gallery (`docs/ASSET_GALLERY_2026-04-29.html`) was rebuilt 2026-05-01 to embed
real SVG file bytes verbatim. Never regenerate with "synthesized representations" again.
