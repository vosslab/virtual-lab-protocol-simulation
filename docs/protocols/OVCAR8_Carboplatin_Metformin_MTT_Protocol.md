# Cell culture standard operating protocol

> **!!! WARNING -- READ BEFORE TRUSTING ANY NUMBER IN THIS DOC !!!**
>
> **CAUTION: THIS PROTOCOL'S MATH HAS CAUSED AT LEAST THREE
> REBUILD-TIME CONFUSIONS.** Defer to
> [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) for the
> reconciled, simulation-authoritative values whenever any number
> in this doc looks wrong.
>
> **HEADLINE TRAP ZONES:**
>
> 1. **WARNING: FINAL WELL VOLUME IS 200 uL, NOT 100 uL.** All
>    working stocks are 40x (5 uL added into 200 uL well). Any
>    "100 uL well total" phrasing is a residual typo.
>    See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md)
>    Ambiguity 1 + Summary decision table.
> 2. **WARNING: METFORMIN WORKING STOCK IS 200 mM, NOT 10 mM.**
>    5 uL of 200 mM into a 200 uL well gives the stated 5 mM final.
>    The 10 mM figure off-by-an-order-of-magnitude every metformin
>    calc.
>    See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 2.
> 3. **CAUTION: COLS 7-12 MEDIA ADJUSTMENT IS 90 uL, NOT 85 uL.**
>    Every well must land at exactly 200 uL after all additions
>    or absorbance readings at 560 nm reflect path-length
>    differences, not drug effect.
>    See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 3.
>
> This document body has been updated to the reconciled values.
> Inline `**CAUTION**` / `**WARNING**` flags appear at each former
> trap zone in Parts 3-5. When in doubt, defer to
> [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md).

OVCAR8 | Carboplatin IC50 +/- Metformin (5 mM) | 72h MTT assay

- Drug 1: Carboplatin
- Drug 2: Metformin

## Part 1 - Splitting cells

Passage OVCAR8 cells at a 1:7 split ratio when they reach 70-80% confluency.

- Aspirate media from the plate.
- Wash with ~4 mL of PBS to remove residual serum.
- Add trypsin and incubate ~2 minutes until cells detach.
  - 3 mL trypsin for 10 cm^2 plate
  - 5 mL trypsin for 15 cm^2 plate
- Confirm detachment under microscope before proceeding.
- Neutralize trypsin by adding 3x the trypsin volume of complete media.
- Transfer to a labeled 15 mL conical tube and centrifuge.
- Aspirate supernatant.
- Resuspend pellet and split at 1:7 for OVCAR8.
- Add media to the new plate:
  - 10 mL media for 10 cm^2 plate
  - 20 mL media for 15 cm^2 plate
- Label plate: cell line, date, passage #, initials.

| Cell line | Split ratio | Plate media (10 cm^2) | Plate media (15 cm^2) |
| --------- | ----------- | --------------------- | --------------------- |
| OVCAR8    | 1:7         | 10 mL                 | 20 mL                 |
| TYKnu     | 1:4         | 10 mL                 | 20 mL                 |
| CAOV3     | 1:3         | 10 mL                 | 20 mL                 |
| Kura      | 1:2         | 10 mL                 | 20 mL                 |

## Part 2 - Counting cells (Trypan Blue exclusion)

Count cells before seeding to achieve accurate and reproducible seeding density.

- Add 10 &micro;L of Trypan Blue to the diamond chamber.
- Add 10 &micro;L of cell suspension.
- Mix by pipetting.
- Load 10 &micro;L of the mixture into the semicircle chamber.
- Wipe off excess.
- Insert slide into cell counter.
- Wait for focus.
- Press "Capture" to record count and viability.

Note: use only samples with &gt;90% viability for experiments. Dead cells stain
blue; live cells remain clear.

## Part 3 - MTT assay protocol (72h, OVCAR8)

Plate layout:

- Columns 1-6 = Carboplatin only
- Columns 7-12 = Carboplatin + Metformin (5 mM)

### Day 1 - Cell seeding

- Prepare 12 mL of 2x10^5 cells/mL suspension in complete media.
- Seed 100 &micro;L per well into a 96-well clear-walled plate
  (final: 2x10^4 cells/well).
- Incubate ~24 hours to allow attachment and recovery before dosing.

### Day 2 - Drug treatment

- Add media adjustment to each well BEFORE adding any drug (see plate map, Part 5).
  Volumes: 100 / 95 / 95 / 90 uL by quadrant so every well lands at 200 uL after
  all additions.
  **CAUTION: cols 7-12 media adjustment is 90 uL, NOT 85 uL.** Earlier versions
  said 85 uL; that left cols 7-12 wells at 195 uL while cols 1-6 reached 200 uL.
  See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 3 + Summary
  decision table.
- Prepare Carboplatin and Metformin working stocks (see Part 4).
- Add 5 &micro;L of Carboplatin working stock per well (columns 1-12, rows B-H).
  - Row A, columns 1-6: untreated control (media only)
  - Row A, columns 7-12: Metformin-only control (5 mM)
- **WARNING: METFORMIN WORKING STOCK IS 200 mM, NOT 10 mM.** Add 5 &micro;L of
  Metformin working stock (200 mM) to columns 7-12 for 5 mM final
  (5 uL of 200 mM into 200 uL well = 5 mM). The 10 mM figure that appeared in
  earlier versions of Part 4 gives 0.5 mM final, off by an order of magnitude.
  See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 2.
- Incubate for 48 hours.

### Day 4 - MTT readout

> **What is MTT?** MTT stands for **M**ethyl(**T**)hiazolyldiphenyl-(**T**)etrazolium,
> the chemical-name shorthand for 3-(4,5-dimethylthiazol-2-yl)-2,5-diphenyltetrazolium
> bromide. A yellow tetrazole used in a colorimetric assay to assess cell metabolic
> activity. The MTT assay measures the reduction of MTT to purple formazan crystals
> by viable cells, indicating their metabolic activity. The depth of purple after
> DMSO solubilization (read at 560 nm) is proportional to the number of viable
> cells in each well.

- Prepare 12 mM MTT: dissolve 5 mg MTT (MW = 414.32 g/mol) per mL 1x PBS.
  Need &ge;4 mL per plate.
- **CAUTION: MTT FINAL CONCENTRATION DEPENDS ON PRE-MTT WELL TOTAL.**
  Add 25 &micro;L of 12 mM MTT per well. With the corrected 200 uL pre-MTT
  well total (Part 5), the final-in-well MTT is 12 mM x 25 / 225 = ~1.33 mM,
  NOT the 1.5 mM figure quoted in earlier versions. The 1.5 mM figure assumed
  a 200 uL well total post-addition (which would require a 175 uL pre-MTT well,
  contradicting Part 5).
  See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) for the 200 uL pre-MTT
  well-total derivation.
- Incubate 1.5 hours (OVCAR8) to allow formazan conversion.
- Decant MTT/media into biohazard bin.
- Pat plate dry gently on paper towels.
- Add 200 &micro;L DMSO per well.
- Pipette up and down ~10 times to fully dissolve formazan.
- Read absorbance at 560 nm.

## Part 4 - Drug dilution guide

Stocks on hand (both in sterile water):

| Drug        | Stock conc. |
| ----------- | ----------- |
| Carboplatin | 10 mM       |
| Metformin   | 1 M         |

**WARNING: WORKING STOCKS ARE 40x FINAL, BUILT FOR A 200 uL WELL, NOT A 100 uL WELL.**
All working stocks dispense 5 &micro;L per well into a **200 &micro;L final well volume** (NOT 100 uL --
that was the past trap). 5 uL into 200 uL = **40&times; dilution multiplier**, so every working stock
is 40&times; its target final concentration. If you assume a 100 uL well, every final concentration
will be 2x what is stated. See
[OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) "Volume model and working-stock multiplier" section
for the derivation.

Prep steps: (1) make the **Carboplatin 400 &micro;M parent stock** from the 10 mM master stock
(40 &micro;L of 10 mM into 960 &micro;L media); (2) use this single parent stock as the source for all
seven carboplatin working stocks (1-2-5 graph-friendly series).

### Carboplatin working stocks (1-2-5 preferred numbers series)

Every working stock is 40&times; its target final concentration (because 5 &micro;L is added to a 200 &micro;L well).
All working stocks are made directly from the single 400 &micro;M parent stock via C1V1 = C2V2.

| Row | Final in well | Working stock | From 400 &micro;M parent | Drug (&micro;L) | Media (&micro;L) |
| --- | ------------- | ------------- | ------------------------ | --------------- | ---------------- |
| B   | 0.1 &micro;M  | 4 &micro;M    | 10                       | 990             |
| C   | 0.2 &micro;M  | 8 &micro;M    | 20                       | 980             |
| D   | 0.5 &micro;M  | 20 &micro;M   | 50                       | 950             |
| E   | 1 &micro;M    | 40 &micro;M   | 100                      | 900             |
| F   | 2 &micro;M    | 80 &micro;M   | 200                      | 800             |
| G   | 5 &micro;M    | 200 &micro;M  | 500                      | 500             |
| H   | 10 &micro;M   | 400 &micro;M  | (use as-is)              | -               |

The 1-2-5 pattern gives three dose points per order of magnitude with familiar, graph-friendly labels. The dilution
factors alternate (2&times;, 2.5&times;) so each working stock requires its own C1V1 = C2V2 calculation. See
[OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) line 521-545 (Option 1: single-source dilution table) for the
mathematical justification and pedagogical rationale.

### Metformin working stock

**WARNING: WORKING STOCK IS 200 mM, NOT 10 mM.** Earlier versions of this section
said "10 mM working stock"; that gives 0.5 mM final-in-well, off by an order of
magnitude from the stated 5 mM. See
[OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 2.

Prepare fresh on day of treatment. 200 mM working stock, 5 &micro;L per well into a 200 &micro;L well
&rarr; 5 mM final. Calculate using C1V1 = C2V2: 1 M x V1 = 200 mM x 300 &micro;L, so V1 = 60 &micro;L.

| Final in well | Working stock | Source    | Drug (&micro;L) | Media (&micro;L) | Total        |
| ------------- | ------------- | --------- | --------------- | ---------------- | ------------ |
| 5 mM          | 200 mM        | 1 M stock | 60              | 240              | 300 &micro;L |

Note: prepare at least 300 &micro;L of Metformin working stock per experiment
(48 wells x 5 &micro;L per well = 240 &micro;L dosing draw, plus &sim;60 &micro;L dead volume).

## Part 5 - 96-well plate map

> **!!! WARNING: FINAL WELL VOLUME IS 200 uL, NOT 100 uL !!!**
>
> Earlier versions of this doc said "ends at 100 uL total." That figure is
> WRONG. The correct figure is **200 uL TOTAL PER WELL** after all Day-2
> additions. The 100 / 200 ambiguity changed every Carboplatin final
> concentration by 2x and every Metformin calc by an order of magnitude. Every
> working stock in Part 4 is sized for the 200 uL well; trusting "100 uL"
> doubles every dose.
>
> See [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) Ambiguity 1 + Summary
> decision table for the full derivation and resolution.

All wells end at **200 &micro;L total** = 100 &micro;L cells seeded on Day 1 +
media adjustment + drug(s). Row A is the control row; rows B-H are the
Carboplatin dose series. The 200 &micro;L final volume ensures every working stock is 40&times; the target
final concentration when 5 &micro;L is added per well.

### Treatment by row

Columns 1-6 receive Carboplatin only; columns 7-12 receive the same
Carboplatin dose **plus** 5 mM Metformin. The carboplatin series follows the 1-2-5 preferred-numbers
pattern (0.1, 0.2, 0.5, 1, 2, 5, 10 &micro;M) for graph-friendly labels and interpretable dose spacing.

| Row | Carboplatin dose | Cols 1-6 (Carb only) | Cols 7-12 (Carb + Met 5 mM)  |
| --- | ---------------- | -------------------- | ---------------------------- |
| A   | --               | Untreated control    | Metformin only (5 mM)        |
| B   | 0.1 &micro;M     | 0.1 &micro;M Carb    | 0.1 &micro;M Carb + 5 mM Met |
| C   | 0.2 &micro;M     | 0.2 &micro;M Carb    | 0.2 &micro;M Carb + 5 mM Met |
| D   | 0.5 &micro;M     | 0.5 &micro;M Carb    | 0.5 &micro;M Carb + 5 mM Met |
| E   | 1 &micro;M       | 1 &micro;M Carb      | 1 &micro;M Carb + 5 mM Met   |
| F   | 2 &micro;M       | 2 &micro;M Carb      | 2 &micro;M Carb + 5 mM Met   |
| G   | 5 &micro;M       | 5 &micro;M Carb      | 5 &micro;M Carb + 5 mM Met   |
| H   | 10 &micro;M      | 10 &micro;M Carb     | 10 &micro;M Carb + 5 mM Met  |

### Per-well volumes

All wells reach 200 &micro;L final volume. Row A gets no Carboplatin, so its media adjustment
absorbs the missing drug volume. Media adjustment is added BEFORE any drug, ensuring each well
is at its target working volume when drug is dispensed.

| Wells          | Cells        | Carboplatin | Metformin  | Media adj.   | Total        |
| -------------- | ------------ | ----------- | ---------- | ------------ | ------------ |
| A, cols 1-6    | 100 &micro;L | --          | --         | 100 &micro;L | 200 &micro;L |
| A, cols 7-12   | 100 &micro;L | --          | 5 &micro;L | 95 &micro;L  | 200 &micro;L |
| B-H, cols 1-6  | 100 &micro;L | 5 &micro;L  | --         | 95 &micro;L  | 200 &micro;L |
| B-H, cols 7-12 | 100 &micro;L | 5 &micro;L  | 5 &micro;L | 90 &micro;L  | 200 &micro;L |

Reminder: add the media adjustment BEFORE any drug, so each well is at its
target working volume when the drug goes in.
