# carb_high_range high-range stock count: decision

> Resolves the mismatch flagged in `wet_lab_classification.md` (3 stocks per
> wet-lab) vs `cell_culture/protocol.yaml` (2 stocks for rows G, H) vs plate
> geometry (8 rows total, A-H). Decision: **2 stocks (option a)** based on
> dose-map evidence.

## 1. The mismatch

- **Wet-lab source** (`docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md` Part 4
  lines 111-113): 3 high-range stocks at 5 uM, 25 uM, 100 uM.
- **Current protocol** (`src/content/cell_culture/protocol.yaml:491-507`):
  "Set up 2 high-range working stocks"; rows G and H; concentrations 5 uM and
  25 uM.
- **Plate geometry**: 96-well plate has 8 rows. Row A is control; rows B-F
  are low-range (5 stocks). Only G and H remain for high-range.

## 2. Dose map = ground truth

`src/steps/plate_96.ts:11-12` hardcodes the per-row concentrations:

```ts
export const CARB_CONC_BY_ROW_UM: number[] =
    [0.0, 0.010, 0.050, 0.125, 0.250, 0.500, 5.0, 25.0];
```

Exactly 2 high-range entries (5.0 and 25.0 uM) at rows G and H. There is no
100 uM row. The dose map is what `applyPlateDoseMap` consumes; it is the
empirical truth of what the game scores against.

## 3. Decision

**Option (a): keep 2 high-range stocks (rows G, H).**

Rationale:
- Plate geometry is fixed at 8 rows; cannot add a 9th.
- Dose map already commits to (5.0, 25.0); changing it cascades to scoring,
  rendering, and plate reader output.
- A 7-point dose series (nM to 25 uM) is pedagogically sufficient for IC50
  fitting; the 100 uM wet-lab point is a safety extreme, not essential.
- The protocol step text already says 2 stocks; this reflects the existing
  game design intent.

The mismatch is a documentation drift in `wet_lab_classification.md`, not a
real design conflict. wet_lab_classification.md should be annotated to note
that the game compresses the wet-lab 3-stock series to the 2 stocks the
plate can express.

## 4. Migration shape for carb_high_range

Mirrors `carb_low_range` (already migrated, walker-green). 8 interactions
(load + discharge per tube, twice - once for carboplatin, once for media).

```yaml
- id: carb_high_range
  scene: hood
  requiredItems: [micropipette, carboplatin_stock, media_bottle,
                  dilution_tube_carb_g, dilution_tube_carb_h]
  completionPath:
    kind: interactionSequence
    interactions:
      # Row G: 10 uL stock + 990 uL media -> 5 uM
      - tool: micropipette
        source: carboplatin_stock
        liquid: carboplatin
        volumeMl: 0.010
        stateChange:
          heldLiquid:
            tool: micropipette
            liquid: carboplatin
            volumeMl: 0.010
            colorKey: carboplatin
      - tool: micropipette
        destination: dilution_tube_carb_g
        liquid: carboplatin
        consumesVolumeMl: 0.010
      - tool: micropipette
        source: media_bottle
        liquid: media
        volumeMl: 0.990
        stateChange:
          heldLiquid:
            tool: micropipette
            liquid: media
            volumeMl: 0.990
            colorKey: media
      - tool: micropipette
        destination: dilution_tube_carb_g
        liquid: media
        consumesVolumeMl: 0.990
      # Row H: 50 uL stock + 950 uL media -> 25 uM
      - tool: micropipette
        source: carboplatin_stock
        liquid: carboplatin
        volumeMl: 0.050
        stateChange:
          heldLiquid:
            tool: micropipette
            liquid: carboplatin
            volumeMl: 0.050
            colorKey: carboplatin
      - tool: micropipette
        destination: dilution_tube_carb_h
        liquid: carboplatin
        consumesVolumeMl: 0.050
      - tool: micropipette
        source: media_bottle
        liquid: media
        volumeMl: 0.950
        stateChange:
          heldLiquid:
            tool: micropipette
            liquid: media
            volumeMl: 0.950
            colorKey: media
      - tool: micropipette
        destination: dilution_tube_carb_h
        liquid: media
        consumesVolumeMl: 0.950
        completionEvent: carb-high-range-confirm
```

Tool: micropipette. Final completionEvent: `carb-high-range-confirm`
(preserved). Remove `carb_high_range` from `registeredEmitters` in
`drug_treatment.ts`.

## 5. Items to add (`src/content/cell_culture/items.yaml`)

| Item ID                | Label         | Role           | Asset              | allowedLiquids      | capacityMl |
| ---------------------- | ------------- | -------------- | ------------------ | ------------------- | ---------- |
| `dilution_tube_carb_g` | "Carb row G"  | culture_vessel | dilution_tube_rack | [carboplatin, media]| 1          |
| `dilution_tube_carb_h` | "Carb row H"  | culture_vessel | dilution_tube_rack | [carboplatin, media]| 1          |

No new visual assets - reuse `dilution_tube_rack` like B-F do.

## 6. Open follow-ups

- Update `wet_lab_classification.md` to note the 2-stock game compression.
- Verify the plate reader output renders 8-row series with max 25 uM after
  migration (no regression).
