# Cell culture standard operating protocol

> Editor's note: this protocol document predates the simulation work in this repo.
> Three quantitative discrepancies have been identified and are tracked in
> [OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md): (1) the well-volume sum
> in Part 5, (2) the metformin working-stock concentration in Part 4, and
> (3) the cols 7-12 media-adjustment volume in Part 5. The simulation uses the
> reconciled values; this document is pending a corresponding revision.

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
| --- | --- | --- | --- |
| OVCAR8 | 1:7 | 10 mL | 20 mL |
| TYKnu  | 1:4 | 10 mL | 20 mL |
| CAOV3  | 1:3 | 10 mL | 20 mL |
| Kura   | 1:2 | 10 mL | 20 mL |

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
- Prepare Carboplatin and Metformin working stocks (see Part 4).
- Add 5 &micro;L of Carboplatin working stock per well (columns 1-12, rows B-H).
  - Row A, columns 1-6: untreated control (media only)
  - Row A, columns 7-12: Metformin-only control (5 mM)
- Add 5 &micro;L of Metformin working stock (200 mM) to columns 7-12 (5 mM final).
- Incubate for 48 hours.

### Day 4 - MTT readout

- Prepare 12 mM MTT: dissolve 5 mg MTT (MW = 414.32 g/mol) per mL 1x PBS.
  Need &ge;4 mL per plate.
- Add 25 &micro;L of 12 mM MTT per well &rarr; 1.5 mM final concentration.
- Incubate 1.5 hours (OVCAR8) to allow formazan conversion.
- Decant MTT/media into biohazard bin.
- Pat plate dry gently on paper towels.
- Add 200 &micro;L DMSO per well.
- Pipette up and down ~10 times to fully dissolve formazan.
- Read absorbance at 560 nm.

## Part 4 - Drug dilution guide

Stocks on hand (both in sterile water):

| Drug | Stock conc. |
| --- | --- |
| Carboplatin | 10 mM |
| Metformin   | 1 M   |

All working stocks dispense 5 &micro;L per well (into a 200 &micro;L final well volume, giving a 40&times; dilution
multiplier). Prep steps: (1) make the **Carboplatin 400 &micro;M parent stock** from the 10 mM master stock
(40 &micro;L of 10 mM into 960 &micro;L media); (2) use this single parent stock as the source for all
seven carboplatin working stocks (1-2-5 graph-friendly series).

### Carboplatin working stocks (1-2-5 preferred numbers series)

Every working stock is 40&times; its target final concentration (because 5 &micro;L is added to a 200 &micro;L well).
All working stocks are made directly from the single 400 &micro;M parent stock via C1V1 = C2V2.

| Row | Final in well | Working stock | From 400 &micro;M parent | Drug (&micro;L) | Media (&micro;L) |
| --- | --- | --- | --- | --- | --- |
| B | 0.1 &micro;M  | 4 &micro;M            | 10 | 990 |
| C | 0.2 &micro;M  | 8 &micro;M            | 20 | 980 |
| D | 0.5 &micro;M  | 20 &micro;M           | 50 | 950 |
| E | 1 &micro;M    | 40 &micro;M           | 100 | 900 |
| F | 2 &micro;M    | 80 &micro;M           | 200 | 800 |
| G | 5 &micro;M    | 200 &micro;M          | 500 | 500 |
| H | 10 &micro;M   | 400 &micro;M          | (use as-is) | - |

The 1-2-5 pattern gives three dose points per order of magnitude with familiar, graph-friendly labels. The dilution
factors alternate (2&times;, 2.5&times;) so each working stock requires its own C1V1 = C2V2 calculation. See
[OVCAR8_MATH_REVIEW.md](OVCAR8_MATH_REVIEW.md) line 521-545 (Option 1: single-source dilution table) for the
mathematical justification and pedagogical rationale.

### Metformin working stock

Prepare fresh on day of treatment. 200 mM working stock, 5 &micro;L per well into a 200 &micro;L well
&rarr; 5 mM final. Calculate using C1V1 = C2V2: 1 M x V1 = 200 mM x 300 &micro;L, so V1 = 60 &micro;L.

| Final in well | Working stock | Source | Drug (&micro;L) | Media (&micro;L) | Total |
| --- | --- | --- | --- | --- | --- |
| 5 mM | 200 mM | 1 M stock | 60 | 240 | 300 &micro;L |

Note: prepare at least 300 &micro;L of Metformin working stock per experiment
(48 wells x 5 &micro;L per well = 240 &micro;L dosing draw, plus &sim;60 &micro;L dead volume).

## Part 5 - 96-well plate map

All wells end at 200 &micro;L total = 100 &micro;L cells seeded on Day 1 +
media adjustment + drug(s). Row A is the control row; rows B-H are the
Carboplatin dose series. The 200 &micro;L final volume ensures every working stock is 40&times; the target
final concentration when 5 &micro;L is added per well.

### Treatment by row

Columns 1-6 receive Carboplatin only; columns 7-12 receive the same
Carboplatin dose **plus** 5 mM Metformin. The carboplatin series follows the 1-2-5 preferred-numbers
pattern (0.1, 0.2, 0.5, 1, 2, 5, 10 &micro;M) for graph-friendly labels and interpretable dose spacing.

| Row | Carboplatin dose | Cols 1-6 (Carb only) | Cols 7-12 (Carb + Met 5 mM) |
| --- | --- | --- | --- |
| A | --              | Untreated control    | Metformin only (5 mM) |
| B | 0.1 &micro;M   | 0.1 &micro;M Carb    | 0.1 &micro;M Carb + 5 mM Met |
| C | 0.2 &micro;M   | 0.2 &micro;M Carb    | 0.2 &micro;M Carb + 5 mM Met |
| D | 0.5 &micro;M   | 0.5 &micro;M Carb    | 0.5 &micro;M Carb + 5 mM Met |
| E | 1 &micro;M     | 1 &micro;M Carb      | 1 &micro;M Carb + 5 mM Met |
| F | 2 &micro;M     | 2 &micro;M Carb      | 2 &micro;M Carb + 5 mM Met |
| G | 5 &micro;M     | 5 &micro;M Carb      | 5 &micro;M Carb + 5 mM Met |
| H | 10 &micro;M    | 10 &micro;M Carb     | 10 &micro;M Carb + 5 mM Met |

### Per-well volumes

All wells reach 200 &micro;L final volume. Row A gets no Carboplatin, so its media adjustment
absorbs the missing drug volume. Media adjustment is added BEFORE any drug, ensuring each well
is at its target working volume when drug is dispensed.

| Wells              | Cells  | Carboplatin | Metformin | Media adj. | Total |
| --- | --- | --- | --- | --- | --- |
| A, cols 1-6        | 100 &micro;L | --          | --          | 100 &micro;L | 200 &micro;L |
| A, cols 7-12       | 100 &micro;L | --          | 5 &micro;L  |  95 &micro;L | 200 &micro;L |
| B-H, cols 1-6      | 100 &micro;L | 5 &micro;L  | --          |  95 &micro;L | 200 &micro;L |
| B-H, cols 7-12     | 100 &micro;L | 5 &micro;L  | 5 &micro;L  |  90 &micro;L | 200 &micro;L |

Reminder: add the media adjustment BEFORE any drug, so each well is at its
target working volume when the drug goes in.
