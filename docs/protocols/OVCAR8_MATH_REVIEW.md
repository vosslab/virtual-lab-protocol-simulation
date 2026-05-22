# OVCAR8 protocol math review

This doc surfaces math discrepancies in [OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)
that the cell-culture-game simulation exposed when authoring `tutorial_plate_drug_additions`.
This review identifies the authoritative values that should be encoded in Wave 3 of the plate-scene plan.

The math throughout uses C1V1 = C2V2 with strict unit cancellation, as taught in
[VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md) (Example 5 and especially Example 6, the
2 M / 25 mM unit-cancellation trap).

## Ambiguity 1: Carboplatin row B final concentration

### Quoted protocol text

Part 4, "Carboplatin working stocks" table (line 106):

```
|  10 nM  | 400 nM  | 200 uM intermediate |   2 | 998 |
```

Stated final in well = 10 nM, working stock = 400 nM, drug volume per well = 5 uL
(Part 4 line 95: "All working stocks dispense 5 uL per well").

Part 5, "Per-well volumes" table (lines 154-159):

```
| Wells              | Cells  | Carboplatin | Metformin | Media adj. |
| --- | --- | --- | --- | --- |
| A, cols 1-6        | 100 uL | --          | --        | 100 uL |
| A, cols 7-12       | 100 uL | --          | 5 uL      |  90 uL |
| B-H, cols 1-6      | 100 uL | 5 uL        | --        |  95 uL |
| B-H, cols 7-12     | 100 uL | 5 uL        | 5 uL      |  85 uL |
```

Part 5, line 129: "All wells end at 100 uL total = 100 uL cells seeded on Day 1 +
media adjustment + drug(s)."

### Worked arithmetic (C1V1 = C2V2)

- If the well total is 100 uL after additions:
  - C2 = C1 &times; V1 / V2 = 400 nM &times; 5 uL / 100 uL = 20 nM final.
  - **Conflicts with the stated 10 nM.**
- If the well total is 200 uL (100 uL cells + 95 uL media + 5 uL drug):
  - C2 = 400 nM &times; 5 uL / 200 uL = 10 nM final.
  - **Matches the stated 10 nM.**

The Part 5 per-well volume table shows the additions sum to 200 uL for B-H cols 1-6
(100 + 95 + 5 = 200), which contradicts the "ends at 100 uL total" sentence at line 129.
This is the same trap as Example 6 in [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md)
(lines 365-392): an off-by-an-order claim disappears once the units cancel cleanly.

### Possible resolutions (reader picks one)

- **(A)** "Ends at 100 uL" at line 129 is a typo for 200 uL. The Part 5 table sums to
  200 uL, all working-stock C1V1 math gives the stated finals, no other values change.
- **(B)** The stated final concentrations are wrong by 2x. Working stocks (400 nM,
  2 uM, 5 uM, 10 uM, 20 uM, 100 uM, 500 uM, 2 mM) are correct, but the "final in well"
  column should read 20 nM, 100 nM, 250 nM, 500 nM, 1 uM, 10 uM, 50 uM, 200 uM. Update
  Part 4 table and Part 5 plate map (rows B-H).
- **(C)** Working stock concentrations are wrong by 2x. Halve them (200 nM, 1 uM,
  2.5 uM, 5 uM, 10 uM, 50 uM, 250 uM, 1 mM). Update Part 4 table only.
- **(D)** Volume added per well is wrong. Should be 2.5 uL not 5 uL. Update Part 3
  Day 2 line 68 and Part 4 line 95.

Reading Part 4 lines 95-99 ("All working stocks dispense 5 &micro;L per well") together with
Part 5 lines 154-159 (per-well volumes) shows that resolution **(A)** is the only one
that leaves the operational steps (volumes added, working stocks prepared) unchanged.

> Honest note on the historical table: the 200 &micro;L well-total resolution
> explains the low-dose rows cleanly. For example, 10 nM final / 400 nM
> working stock gives 5/200 &times; 400 = 10 nM, a 40&times; multiplier. But
> the historical table mixes multipliers across rows: 5 &micro;M final /
> 100 &micro;M working stock gives 5/200 &times; 100 = 2.5 &micro;M, NOT
> 5 &micro;M -- the high-dose rows imply a 20&times; multiplier, not 40&times;.
> The historical carboplatin table is internally inconsistent across rows,
> not just at the well-total summary line. **Recommendation: replace the
> historical table rather than patch it.** Use the redesigned 1-2-5 series
> (or another resolution-per-decade option from the later sections) so every
> working stock follows the same 40&times; rule.

## Ambiguity 2: Metformin final concentration

### Quoted protocol text

Part 4, line 117: "Prepare fresh on day of treatment. 10 mM working stock, 5 uL per
well -&gt; 5 mM final (500 uM per 100 uL well)."

Part 4, line 122 (Metformin table row): `| 5 mM | 10 mM | 1 M stock | 10 | 990 |`

Part 3, Day 2, line 71: "Add 5 uL of Metformin working stock (200 mM) to columns
7-12."

Part 3, Day 2, line 64 (section header context): protocol title (line 3) says
"Metformin (5 mM)".

### Worked arithmetic

- 5 uL of 10 mM working stock into a 100 uL well:
  - C2 = 10 mM &times; 5 uL / 100 uL = 0.5 mM = 500 uM final.
  - **Matches the parenthetical "(500 uM per 100 uL well)" but NOT the stated "5 mM final."**
- 5 uL of 200 mM working stock (the value claimed in Part 3 Day 2 line 71) into 100 uL:
  - C2 = 200 mM &times; 5 uL / 100 uL = 10 mM final.
  - **Matches neither 5 mM nor 500 uM.**
- 5 uL of working stock into a 200 uL well (the volume implied by Ambiguity 1
  resolution A):
  - 10 mM stock: C2 = 10 mM &times; 5 / 200 = 0.25 mM = 250 uM final.
  - 100 mM stock: C2 = 100 mM &times; 5 / 200 = 2.5 mM final.
  - 200 mM stock: C2 = 200 mM &times; 5 / 200 = 5 mM final. **Matches title "Metformin
    (5 mM)" if and only if the well total is 200 uL and the working stock is 200 mM.**

This is the trap pattern in [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md)
Example 6 (lines 365-392): mixing mM and M without canceling units produces an answer
that is wrong by an order of magnitude in either direction.

There are **two** internal inconsistencies here:

1. Part 4 line 117 self-contradicts: "5 mM final" vs "(500 uM per 100 uL well)". 5 mM
   is not equal to 500 uM (5 mM = 5000 uM).
2. Part 4 line 117 ("10 mM working stock") contradicts Part 3 Day 2 line 71
   ("Metformin working stock (200 mM)").

### Possible resolutions (reader picks one)

- **(A)** "5 mM final" is the typo. Actual final is 0.5 mM (= 500 uM). Working stock
  is 10 mM (Part 4 line 117). Update Part 3 protocol title (line 3), Part 3 line 55,
  Part 3 line 70, and Part 3 Day 2 line 71 to say "200 uM" or "0.5 mM" everywhere
  the cell biology effect is described. Cross-check against published OVCAR8 +
  metformin literature for the sensitizing dose.
- **(B)** Working stock should be 100 mM (not 10 mM) and well total is 100 uL.
  5 uL of 100 mM into 100 uL = 5 mM final. Update Part 4 line 117 and Part 4 table
  line 122 (Drug column would become 100 uL of 1 M into 900 uL media). Drop the
  parenthetical "(500 uM per 100 uL well)".
- **(C)** Working stock is 200 mM (matching Part 3 Day 2 line 71) and well total is
  200 uL (matching Ambiguity 1 resolution A). 5 uL of 200 mM into 200 uL = 5 mM
  final. Update Part 4 line 117 to say "200 mM working stock" and update the Part 4
  Metformin table accordingly (5 uL of 1 M stock into 20 uL media for 200 mM working
  stock, or equivalent). This resolution is the only one consistent with **both**
  the "Metformin (5 mM)" title and Ambiguity 1 resolution A.
- **(D)** Volume added per well changes (e.g., 50 uL). Probably not the intended fix
  because it changes total well volume and the Part 5 per-well volume table.

If Ambiguity 1 is resolved as **(A)** ("ends at 200 uL"), then Ambiguity 2 resolution
**(C)** is the only consistent pick.

## Ambiguity 3 (minor): Media adjustment for combined-drug wells

### Quoted protocol text

Part 5 per-well volume table (lines 154-159), repeated for reference:

```
| B-H, cols 1-6      | 100 uL | 5 uL  | --    |  95 uL |
| B-H, cols 7-12     | 100 uL | 5 uL  | 5 uL  |  85 uL |
```

### Worked arithmetic

- B-H, cols 1-6 totals: 100 + 95 + 5 = **200 uL**.
- B-H, cols 7-12 totals: 100 + 85 + 5 + 5 = **195 uL**.
- A, cols 1-6 totals: 100 + 100 = **200 uL**.
- A, cols 7-12 totals: 100 + 90 + 5 = **195 uL**.

Final volumes across the plate are not equal (200 uL vs 195 uL). Assay validity
requires all wells to have the SAME final volume so that absorbance readings at
560 nm reflect drug effect and not optical path length differences.

The "ends at 100 uL total" claim (line 129) is impossible for any well under the
current table, regardless of which Ambiguity 1 resolution is chosen.

### Possible resolutions (reader picks one)

- **(A)** Cols 7-12 media adjustment should be 90 uL, not 85 uL. Then:
  - B-H, cols 7-12: 100 + 90 + 5 + 5 = 200 uL.
  - A, cols 7-12: would need to drop to 85 uL media adj (100 + 85 + 5 = 190 uL)
    or keep at 90 uL (100 + 90 + 5 = 195 uL, still wrong). Adjust A row separately
    so all wells land at 200 uL.
- **(B)** Cell seeding volume on Day 2 is actually 95 uL (some media evaporated
  during 24h incubation, or Day-1 seeding was 95 uL not 100 uL). Update Part 3
  Day 1 line 60 and re-derive the table. Less likely; evaporation in a humidified
  incubator at 24h is usually negligible for a sealed 96-well plate.

A clean rewrite under Ambiguity 1 resolution **(A)** ("ends at 200 uL") would be:

```
| A, cols 1-6        | 100 uL | --   | --   | 100 uL |  total 200 uL
| A, cols 7-12       | 100 uL | --   | 5 uL |  95 uL |  total 200 uL
| B-H, cols 1-6      | 100 uL | 5 uL | --   |  95 uL |  total 200 uL
| B-H, cols 7-12     | 100 uL | 5 uL | 5 uL |  90 uL |  total 200 uL
```

That single edit (A cols 7-12: 90 -&gt; 95 uL; B-H cols 7-12: 85 -&gt; 90 uL) brings every
well to a uniform 200 uL.

## Summary decision table

| Ambiguity                     | Question                    | User's chosen resolution                                                                                                 |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Carboplatin row B final    | 10 nM or 20 nM?             | 10 nM (well total = 200 &micro;L; protocol doc Part 5 line 129 "ends at 100 &micro;L" is the typo)                       |
| 2. Metformin final            | 0.5 mM or 5 mM?             | 5 mM final via 200 mM working stock (Part 3 Day 2 line 71 is correct; Part 4 line 117 "10 mM working stock" is the typo) |
| 3. Cols 7-12 media adjustment | 85 &micro;L or 90 &micro;L? | 90 &micro;L (so 100 cells + 90 media + 5 carb + 5 met = 200 &micro;L, matching cols 1-6 at 100 + 95 + 5 = 200 &micro;L)  |

> The protocol should use a 200 &micro;L final well volume. Each drug
> addition is 5 &micro;L, so all working stocks are 40&times; the desired
> final well concentration. Carboplatin is the variable dose-response drug,
> so students choose a dose-series resolution for carboplatin only.
> Metformin is the fixed modifier drug at 5 mM, prepared as a 200 mM
> working stock. Media adjustment is used only to bring every well to
> 200 &micro;L total.

The three ambiguities are coupled. If you pick "200 uL well" for Ambiguity 1, the
self-consistent picks are Ambiguity 2 resolution (C) and Ambiguity 3 resolution
(A with A-row tweak). If you pick "100 uL well" for Ambiguity 1, then Ambiguity 2
resolution (B) and a separate media-volume rewrite for Ambiguity 3 are required.

## Follow-up

After resolution, update [OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)
Parts 3-5 to match the chosen values, then notify the manager to dispatch Wave 3
(calc-step subsystem) which will encode the answers in
`src/content/tutorial_plate_drug_additions/protocol.yaml` calculation steps.

## Volume model and working-stock multiplier

The general rule for converting a target final-in-well concentration to a
working-stock concentration is:

```
C_working = C_final * (V_final_well / V_drug_added)
```

For this protocol:

- `V_final_well` = 200 &micro;L (after all additions: cells + media adjustment + carb + met)
- `V_drug_added` = 5 &micro;L per drug

So the working-stock multiplier is **40&times;** the desired final concentration.
If a future protocol uses a different `V_drug_added` or `V_final_well`, recalculate
the multiplier.

> Every working stock is 40&times; final dose when 5 &micro;L is added to a
> 200 &micro;L final well. If a different final well volume is chosen, recalculate
> the multiplier as final well volume divided by drug-addition volume.

That one sentence prevents the "just adjust starting concentration?" confusion.

## Two-drug experimental design: variable carb + fixed metformin

> Handle carboplatin and metformin separately. Same dilution logic, different stock concentration, different biological role.

Handle the two drugs separately, but keep the same overall dilution logic.

The clean structure is:

1. **Carboplatin is the variable drug.** Students choose or are assigned a dose
   series. Each row gets a different carboplatin concentration.
2. **Metformin is the fixed modifier drug.** Columns 7-12 all get the same
   metformin concentration (5 mM). It is not part of the dose series.

So students should NOT design a two-drug dilution series. That would be too much.
They are really doing:

> Variable carboplatin dose series &plusmn; constant metformin background.

That is a good experimental design because the question becomes: **Does
fixed-dose metformin shift the carboplatin response?**

**Student-facing framing (verbatim):**

> Carboplatin is the dose-response drug, so carboplatin changes by row.
> Metformin is the modifier drug, so metformin is held constant in columns 7-12.
> Calculate each drug separately using C1V1 = C2V2. Then adjust the media volume
> so every well ends at the same final volume.

**Role separation table:**

| Component   | Role                        | Student choice?         | Calculation                            |
| ----------- | --------------------------- | ----------------------- | -------------------------------------- |
| Carboplatin | Variable dose-response drug | Yes, choose dose series | Calculate each row                     |
| Metformin   | Fixed modifier              | No, fixed dose          | One working stock                      |
| Media       | Volume balancer             | No                      | Adjust so all wells reach 200 &micro;L |

**Rule for multi-drug protocols:**

> Dose-series choice applies only to the variable drug. Fixed co-treatment drugs
> are calculated separately and added at the same concentration to every relevant
> well.

This keeps the learning real but not frustrating. Students choose the carboplatin
dose logic, but metformin stays constant and does not add another layer of
series-design complexity.

**Corrected examples table for the 200 &micro;L well model:**

| Drug        | Final in well | Volume added | Final well volume | Required working stock |
| ----------- | ------------- | ------------ | ----------------- | ---------------------- |
| Carboplatin | 1 &micro;M    | 5 &micro;L   | 200 &micro;L      | 40 &micro;M            |
| Carboplatin | 10 &micro;M   | 5 &micro;L   | 200 &micro;L      | 400 &micro;M           |
| Metformin   | 5 mM          | 5 &micro;L   | 200 &micro;L      | 200 mM                 |

The last row reconciles OVCAR8 Part 3 Day 2 line 71 ("Metformin working stock
(200 mM)") with Part 4 line 117. The 200 mM value is correct; the Part 4 table's
"10 mM working stock" line is a typo to be fixed in the protocol doc.

## Pedagogy: which dilution skill does this teach?

OVCAR8's working-stock math is mostly parallel C1V1 = C2V2 problems, not the
fixed-dilution-factor (DF) serial chain that the BSA standard-curve lab teaches.
This section explains the distinction and presents one option for how to split
the pedagogy across the launcher's two relevant tutorials.

### BSA lab pattern (for contrast)

The BSA protein-assay lab uses a single starting BSA stock and 8 chained
dilutions where every step applies the SAME net DF = 1.5 serially down the
row. Total DF is the running product of the net DFs: 4, 6, 9, 13.5, 20.25,
30.38, 45.56, 68.34. (Source: BSA lab handout, pages 4-7, at
`/Users/vosslab/Documents/teaching/CLASS/biol_301-lab/2024-1spring-301LAB/Individual_LABS/LAB03-BSA/lab07-protein_concentation_assay-take_2.pdf`,
outside this repo.)

The fixed-DF serial pattern teaches three skills:

- The running product: `DF_total(n) = DF_net ^ n` when net DF is uniform.
- The per-tube transfer volume formula: `aliquot_volume = final_volume / DF_net`.
- Why serial dilution beats one big dilution for pipette-error control (see
  [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md) Example 8 in the serial
  dilution section).

### OVCAR8 pattern

Three observations distinguish OVCAR8 from the BSA pattern:

1. **OVCAR8 dose targets are not a geometric series.** Final-in-well values
   from Part 5 are 10, 50, 125, 250, 500 nM, 5, 25 &micro;M. Successive ratios
   are 5x, 2.5x, 2x, 2x, 10x, 5x. The ratios are not constant, so the dose
   plan cannot be cast as a single fixed-DF serial chain.

2. **Working-stock prep is 8 parallel independent C1V1 = C2V2 problems.** Each
   working stock is made directly from ONE of two sources (the 10 mM master
   stock or the 200 &micro;M intermediate, per Part 4 lines 95-99). Working
   stocks do NOT chain: the 50 nM stock is not derived from the 10 nM stock.
   Each row in the Part 4 table is its own standalone C1V1 = C2V2 calculation,
   matching the pattern in [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md)
   Example 5.

3. **There is a hidden uniform dilution factor at the well-dosing step.**
   Adding 5 &micro;L of working stock into a 200 &micro;L final well gives a
   1:40 dilution, applied identically to every dose. So every working stock
   is 40&times; final-in-well. This is one dilution factor applied many times
   in parallel across the plate, not the BSA-style serial chain down a row.

Where genuine serial dilution does appear in OVCAR8: the 10 mM master stock to
200 &micro;M intermediate step (1:50, one C1V1 = C2V2). That single step is the
only serial precursor in the whole protocol.

### Option for the tutorial structure

The launcher already exposes two relevant tutorials (per
`tools/build_protocol_data.py` PROTOCOL_METADATA): `tutorial_drug_dilution`
(currently a stub) and `tutorial_plate_drug_additions`. The pedagogy can be
split between them. Both options are presented neutrally so the protocol
author can pick.

- **Option A: keep OVCAR8 as C1V1 = C2V2 throughout.** The calc prompts in
  `tutorial_plate_drug_additions` ask students to compute drug-microliter
  volumes given source concentration, target working-stock concentration, and
  final volume. Pattern matches [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md)
  Examples 5 and 6. Pros: faithful to the OVCAR8 protocol as written. Cons:
  does not teach the fixed-DF serial pattern that the BSA lab uses.

- **Option B: split fixed-DF serial pedagogy into `tutorial_drug_dilution`.**
  Author `tutorial_drug_dilution` as a BSA-style serial dilution tutorial:
  one drug, serial 1:2 or 1:3 dilutions across rows with a fixed net DF, and
  students compute total DF as a running product. `tutorial_plate_drug_additions`
  then stays C1V1 = C2V2 for OVCAR8's actual working-stock-prep math. Pros:
  students see both dilution skills in separate, focused tutorials, mirroring
  the BSA-lab pedagogy on the serial side. Cons: requires authoring
  `tutorial_drug_dilution` content (currently a stub).

Recommended: redesign the OVCAR8 dose values around graph logic (see the next
major section, "Redesigning the dose series for graph logic"). The historical
OVCAR8 ratios (5&times;, 2.5&times;, 2&times;, 2&times;, 10&times;, 5&times;)
make the math hard for students to defend on a bar plot. Implementing this in
`carb_low_range` as a scheme-picker calc step (Option C from earlier) lets
students pick a clean rule and compute the per-row volumes from it. Option A
(keep historical values) and Option B (split serial-dilution into its own
tutorial) remain on the table but the graph-logic redesign is the strongest
single move.

See the new "Decision rule for picking a dose series" section for goal-to-series
mapping. The final consolidated framing lives in "Recommended student-facing
choice: resolution per decade" -- treat that section as the primary
pedagogical answer.

## Redesigning the dose series for graph logic

> Your dose series should not look random. The concentrations should follow a
> clear rule so the graph can be interpreted visually. For a bar plot, use
> values that are easy to read and easy to defend.

The OVCAR8 protocol's historical dose values (10, 50, 125, 250, 500 nM, 5,
25 &micro;M) follow no single rule that a student can articulate, so the
resulting bar plot looks like hand-picked noise. Four candidate redesigns
follow, each with a clean rule and a full A-H table.

### Half-log 1,3 series (recommended default for IC50 scouting)

This is probably the cleanest teaching series. Approximately 3-fold between
steps, broad range (3 decades), values look intentional. Makes a nice bar
plot because students can see the low-to-high effect transition clearly.

| Row | Dose         |
| --- | ------------ |
| A   | 0 &micro;M   |
| B   | 0.1 &micro;M |
| C   | 0.3 &micro;M |
| D   | 1 &micro;M   |
| E   | 3 &micro;M   |
| F   | 10 &micro;M  |
| G   | 30 &micro;M  |
| H   | 100 &micro;M |

Net DF: approximately 1:3.16 (half a log). Working stocks at 40&times;
(5 &micro;L into 200 &micro;L well): 0 nM, 4, 12, 40, 120, 400 &micro;M,
1.2 mM, 4 mM.

### Binary serial (best for teaching serial-dilution math)

A binary series is also defensible. Teaches serial dilution beautifully, but
labels are less clean for a bar plot.

| Row | Dose          |
| --- | ------------- |
| A   | 0 &micro;M    |
| B   | 0.78 &micro;M |
| C   | 1.56 &micro;M |
| D   | 3.13 &micro;M |
| E   | 6.25 &micro;M |
| F   | 12.5 &micro;M |
| G   | 25 &micro;M   |
| H   | 50 &micro;M   |

Net DF: 1:2 per step. Maps directly to BSA-style serial dilution pedagogy.
Pro: simplest math (every value is 2&times; the previous). Con: ugly
intermediate labels for a bar plot.

### Rounded 2-fold series (compromise)

This may be the best compromise: clear rule, simple labels, easy for students
to explain.

| Row | Dose        |
| --- | ----------- |
| A   | 0 &micro;M  |
| B   | 1 &micro;M  |
| C   | 2 &micro;M  |
| D   | 4 &micro;M  |
| E   | 8 &micro;M  |
| F   | 16 &micro;M |
| G   | 32 &micro;M |
| H   | 64 &micro;M |

Net DF: 1:2 per step (same as binary above, but rounded so the lowest dose is
a clean 1 &micro;M). Pro: every label is a power-of-2 integer in &micro;M,
very memorable. Con: doesn't capture sub-&micro;M activity if IC50 is below
1 &micro;M.

### Preferred numbers 1,2,5 (alternative half-log)

#### Mathematical justification

The 1-2-5 pattern is a rounded version of equal log spacing with three intervals per decade. The exact log-spaced values are 10^(0/3) = 1.00, 10^(1/3) = 2.15, 10^(2/3) = 4.64, 10^(3/3) = 10.00. Rounded to "preferred numbers" they become 1, 2, 5, 10:

| Step | Exact log-spaced value | Rounded teaching value |
| ---- | ---------------------- | ---------------------- |
| 1    | 1.00                   | 1                      |
| 2    | 2.15                   | 2                      |
| 3    | 4.64                   | 5                      |
| 4    | 10.00                  | 10                     |

Student-facing phrasing:

> This dose series uses three roughly equal steps per order of magnitude. The exact log-spaced values would be 1, 2.15, 4.64, and 10, but we round them to 1, 2, 5, and 10 so the concentrations are easier to prepare, label, graph, and interpret.

That is much easier to defend than the historical mixed series (5&times;, 2.5&times;, 2&times;, 2&times;, 10&times;, 5&times;), which has no rule a student can articulate.

Engineering / E-series style spacing -- the pattern you see on matplotlib
log-axis ticks, capacitor values, multimeter dials, and banknotes. Three
values per decade instead of two (vs the 1,3 series), with alternating
2&times; and 2.5&times; step ratios (average ~2.15&times;).

| Row | Dose         |
| --- | ------------ |
| A   | 0 &micro;M   |
| B   | 0.1 &micro;M |
| C   | 0.2 &micro;M |
| D   | 0.5 &micro;M |
| E   | 1 &micro;M   |
| F   | 2 &micro;M   |
| G   | 5 &micro;M   |
| H   | 10 &micro;M  |

A 1-2-5 series does not give one constant dilution factor, but it does not
have to become c1V1 = c2V2 chaos. It depends how you prepare it.

The stepwise dilution factors alternate:

```
| Step              | Fold change |
| ---               | ---         |
| 10 &rarr; 5       | 2&times;    |
| 5 &rarr; 2        | 2.5&times;  |
| 2 &rarr; 1        | 2&times;    |
| 1 &rarr; 0.5      | 2&times;    |
| 0.5 &rarr; 0.2    | 2.5&times;  |
| 0.2 &rarr; 0.1    | 2&times;    |
```

So it is not as clean as a binary 2-fold series. Students cannot simply
repeat "transfer 100 &micro;L into 100 &micro;L" every time.

#### Option 1: single-source dilution table

A simple, defensible approach: make one parent stock at the top of the range
(400 &micro;M), then prepare every working stock from that single source via
c1V1 = c2V2. Every working stock is 40&times; its target final dose (5 &micro;L
into 200 &micro;L well), and every working stock comes from the same
400 &micro;M parent.

```
| Working stock | From 400 &micro;M stock | Media        | Final well dose |
| ---           | ---                     | ---          | ---             |
| 400 &micro;M  | (use as-is)             | none         | 10 &micro;M     |
| 200 &micro;M  | 500 &micro;L            | 500 &micro;L | 5 &micro;M      |
| 80 &micro;M   | 200 &micro;L            | 800 &micro;L | 2 &micro;M      |
| 40 &micro;M   | 100 &micro;L            | 900 &micro;L | 1 &micro;M      |
| 20 &micro;M   | 50 &micro;L             | 950 &micro;L | 0.5 &micro;M    |
| 8 &micro;M    | 20 &micro;L             | 980 &micro;L | 0.2 &micro;M    |
| 4 &micro;M    | 10 &micro;L             | 990 &micro;L | 0.1 &micro;M    |
```

This is not a constant DF, but it is not chaotic. It is a single-source
dilution table. Students can see the rule: **working stock is 40&times; final
dose, and all working stocks are made from one 400 &micro;M stock.** The math
is C1V1 = C2V2 applied seven times with the same C1, which is exactly the
pattern in [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md) Examples 5-6.

Pro: every dose label is a familiar "preferred number" -- students recognize
the pattern from everyday life. The single-source rule is easy to defend.
Con: each working stock requires its own C1V1 = C2V2 calculation; not a
repeated fixed-DF chain like the BSA lab.

### Recommendation

> Use either 0, 0.1, 0.3, 1, 3, 10, 30, 100 &micro;M if the goal is IC50
> scouting (recommended default), or 0, 1, 2, 4, 8, 16, 32, 64 &micro;M if
> the goal is dilution-series logic. The 1,2,5 pattern is a strong third
> option when familiar everyday labels matter most.

Then drop the OVCAR8 hand-tuned series (5&times;, 2.5&times;, 2&times;,
2&times;, 10&times;, 5&times;) entirely from future content. The historical
OVCAR8 values were a hand-crafted log-spaced sampling motivated by published
OVCAR8 IC50 estimates, but the irregular ratios make the math hard for
students to defend.

### Student questioning rubric

> When students hand in a dose-response experiment, ask:
>
> 1. What rule did your dose series follow?
> 2. What range did your series cover?
> 3. Why did your lowest dose make sense?
> 4. Why did your highest dose make sense?
> 5. Would this series help you see an IC50 transition on a bar plot?
>
> This makes "random values" unacceptable without making the math overly
> complicated.

## Decision rule for picking a dose series

> If the main goal is clean serial dilution practice, use **2-fold**.
> If the main goal is clean bar plots and interpretable dose spacing, use **1-2-5**.
> If the main goal is IC50 scouting across orders of magnitude, use **1-3-10**.

For the OVCAR8 lab specifically, the 1-2-5 series is defensible, but present
it as:

> This is a rounded log-style dose series. The dose labels are easy to graph
> and interpret. The dilution preparation is not a repeated fixed-DF series,
> so we will use a prepared dilution table.

Students see one dose-spacing rule (1-2-5) and one prep rule (single-source
400 &micro;M parent + c1V1 = c2V2 per row). Two skills, one tutorial.

See the next section, "Recommended student-facing choice: resolution per
decade," for the simplified single-dial framing that supersedes this list.

## Recommended student-facing choice: resolution per decade

The four candidate series (1-3, 2-fold, rounded 2-fold, 1-2-5) are useful
reference material, but presenting all four to students as named schemes is
more confusing than helpful. The cleanest pedagogical frame collapses the
choice to a single question:

> How many dose points do you want per order of magnitude?

That is cleaner than asking students to choose between "binary," "half-log,"
"shallow," and "1-2-5" as separate concepts.

### Three log-spaced options

| Option            | Pattern             | Points per decade | Best use                              |
| ----------------- | ------------------- | ----------------- | ------------------------------------- |
| Low resolution    | 1, 10, 100          | 1                 | Very broad scouting                   |
| Medium resolution | 1, 3, 10, 30, 100   | 2                 | Standard log-style IC50 scouting      |
| High resolution   | 1, 2, 5, 10, 20, 50 | 3                 | Clean graph labels, better resolution |

### Where 2-fold fits

A 2-fold series (1, 2, 4, 8, 16, 32) is excellent for practicing serial
dilution mechanics, but it does not map as neatly to "points per decade" --
it gives about 3.3 points per order of magnitude, and the labels are less
graph-friendly. Present it separately:

> A 2-fold series is best when the main goal is practicing serial dilution,
> but for a drug-response graph we focus on log-spaced dose choices.

That keeps the lab conceptually focused on graph interpretation when that is
the goal.

### For the OVCAR8 lab specifically

Offer only three choices to students, framed as resolution trade-offs:

| Option         | Pattern             | Why choose it                            |
| -------------- | ------------------- | ---------------------------------------- |
| Broad          | 1, 10, 100          | Fast scan across orders of magnitude     |
| Balanced       | 1, 3, 10, 30, 100   | Standard log-style IC50 scouting         |
| Graph-friendly | 1, 2, 5, 10, 20, 50 | More points per decade with clean labels |

The 2-fold series is mentioned only as an aside when the discussion shifts
to dilution mechanics.

### Recommendation

Use 1-2-5 (Graph-friendly) as the default, but let students justify whether
they would prefer 1-10-100 (Broad) or 1-3-10 (Balanced) for a different
experimental goal. All working-stock concentrations in this lab are computed
at 40&times; the final in-well dose, because 5 &micro;L of drug is added to a
200 &micro;L final well. Metformin stays constant at 5 mM in columns 7-12
(200 mM working stock); only the carboplatin dose series varies.

### Student-facing prompt

> Choose a dose series based on the resolution you want per order of
> magnitude. More points per order give better detail, but fewer points let
> you cover a wider concentration range with the same number of wells.

That is the clean teaching point.

## See also

- [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md) -- C1V1 = C2V2, DF/CF, and serial dilution sections.
- [OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](OVCAR8_Carboplatin_Metformin_MTT_Protocol.md) Part 4 -- drug dilution guide table.
- Plate-scene plan `~/.claude/plans/pure-moseying-ember.md` -- Wave 3 calc-step subsystem will consume this decision.
- `src/content/cell_culture/protocol.yaml` `carb_low_range` step -- natural home for the scheme-picker calc step.
- [VOSS_DILUTIONS_GUIDE.md](VOSS_DILUTIONS_GUIDE.md) DF/CF and Serial Dilutions sections -- background for the redesign rules above.
