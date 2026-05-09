# SP-K2f: Migrate 4 Drug-Treatment Steps from Modal to InteractionSequence

## Overview

This plan covers migration of the remaining 4 steps from `kind: modal` to `kind: interactionSequence`:
- `carb_high_range` — 2 high-range stocks (5 µM, 25 µM) from 10 mM stock
- `metformin_stock` — 10 mM working stock (10 µL + 990 µL)
- `add_carboplatin` — Add carboplatin to rows B-H of plate
- `add_metformin` — Add metformin to columns 7-12 of plate

All follow the `carb_intermediate` reference template. The `carb_low_range` step (SP-K2e) is being handled separately.

---

## 1. carb_high_range

**Wet-lab action:** Prepare 2 high-range working stocks from the 10 mM carboplatin stock:
- 5 µM stock: 10 µL carboplatin + 990 µL media (row G)
- 25 µM stock: 50 µL carboplatin + 950 µL media (row H)

**Tool:** Micropipette (one tool for both stocks).

**Sources and destinations:**
- Source: `carboplatin_stock`
- Diluent: `media_bottle`
- Destinations: NEW items `dilution_tube_carb_g`, `dilution_tube_carb_h`

**New items needed:**
- `dilution_tube_carb_g`: label "Carb row G", role culture_vessel, asset dilution_tube_rack, scene hood, capacityMl 1, allowedLiquids [carboplatin, media]
- `dilution_tube_carb_h`: label "Carb row H", role culture_vessel, asset dilution_tube_rack, scene hood, capacityMl 1, allowedLiquids [carboplatin, media]

**Interaction list:** 8 interactions (load 10µL carb + 990µL media → carb_g; load 50µL carb + 950µL media → carb_h). All micropipette. Final discharge carries `completionEvent: carb-high-range-confirm`.

**Required items:** [carboplatin_stock, dilution_tube_carb_g, dilution_tube_carb_h, media_bottle, micropipette]

**Side-effect handoff:**
- Current: `advanceDrugModalStep(carb_high_range)` → `triggerStep()`.
- After: Dispatch on `completionEvent: carb-high-range-confirm`.
- Landing: Event-keyed handler (no per-step side effects).

---

## 2. metformin_stock

**Wet-lab action:** Prepare 10 mM metformin working stock from 1 M stock:
- 10 µL metformin stock + 990 µL sterile water.

**Tool:** Micropipette.

**Sources and destinations:**
- Source: `metformin_stock` (existing)
- Diluent: `sterile_water`
- Destination: NEW item `dilution_tube_metformin`

**New items needed:**
- `dilution_tube_metformin`: label "Metformin 10 mM", role culture_vessel, asset dilution_tube_rack, scene hood, capacityMl 1, allowedLiquids [metformin, water]

**Interaction list (4 interactions):** Load 10 µL metformin, discharge to tube; load 990 µL water, discharge. Final interaction carries `completionEvent: metformin-stock-prepare`.

**Required items:** [metformin_stock, sterile_water, dilution_tube_metformin, micropipette]

**Side-effect handoff:**
- Current: `advanceDrugModalStep(metformin_stock)` → `triggerStep()`.
- After: Dispatch on `completionEvent: metformin-stock-prepare`.

---

## 3. add_carboplatin

**Wet-lab action:** Transfer 5 µL carboplatin from 7 working-stock tubes (rows B-H) into the plate.
- 7 tubes (carb_b through carb_h)
- One load+discharge cycle per tube

**Tool:** Multichannel pipette.

**Sources and destinations:**
- Sources: 7 dilution tubes (carb_b, _c, _d, _e, _f, _g, _h)
- Destination: `well_plate`
- Volume: 5 µL per well per row

**New items needed:** None (carb_g/carb_h created by carb_high_range; reused).

**Interaction list (14 interactions):** One load+discharge pair per tube. Final interaction (row H discharge) carries `completionEvent: carb-add-confirm`.

**Required items:** [well_plate, multichannel_pipette, dilution_tube_carb_b, _c, _d, _e, _f, _g, _h]

**Side-effect handoff:**
- Current: `advanceDrugModalStep(add_carboplatin)` calls `applyPlateDoseMap()`, sets `gameState.drugsAdded = true`, then `triggerStep()`.
- After: Dispatch on `completionEvent: carb-add-confirm`. Dose-map call must move to event handler.
- Landing: Event-keyed handler must call `applyPlateDoseMap()` and set `gameState.drugsAdded = true`.

---

## 4. add_metformin

**Wet-lab action:** Transfer 5 µL metformin working stock into columns 7-12 of the plate.

**Tool:** Multichannel pipette.

**Sources and destinations:**
- Source: `dilution_tube_metformin`
- Destination: `well_plate` (columns 7-12)
- Volume: 5 µL per well

**New items needed:** None (created by metformin_stock).

**Interaction list (2 interactions):** Load 5 µL metformin, discharge to plate. Final interaction carries `completionEvent: metformin-add-confirm`.

**Required items:** [well_plate, multichannel_pipette, dilution_tube_metformin]

**Side-effect handoff:**
- Current: `advanceDrugModalStep(add_metformin)` → `triggerStep()`.
- After: Dispatch on `completionEvent: metformin-add-confirm`.

---

## drug_treatment.ts Edits Required

**Remove lines 116-119:**
- `registeredEmitters.add(carb_high_range);`
- `registeredEmitters.add(metformin_stock);`
- `registeredEmitters.add(add_carboplatin);`
- `registeredEmitters.add(add_metformin);`

**Dead code after migration:**
- `renderDilutionChoiceScreen()` — no caller (carb_low_range already migrated)
- `selectLowRangeDilution()` — no caller
- `DILUTION_OPTIONS` — no caller
- `advanceDrugModalStep()` — no remaining callers; becomes dead code
- `MODAL_OWNED_STEPS` — becomes empty array, causing `renderDrugModalStep()` to auto-close overlay

**Event-keyed side effects:**
For `carb-add-confirm`: implement event dispatch table in game_state.ts:

```typescript
const EVENT_SIDE_EFFECTS: Record<string, (state: GameState) => void> = {
  ''carb-add-confirm'': (state) => {
    applyPlateDoseMap();
    state.drugsAdded = true;
  },
};

// Wire in completeStep() after triggerStep():
const completionEvent = activeStep.completionPath?.completionEvent;
if (completionEvent && EVENT_SIDE_EFFECTS[completionEvent]) {
  EVENT_SIDE_EFFECTS[completionEvent](gameState);
}
```

---

## Open Questions

1. **Media vs. water for metformin:** Modal screen says "sterile water"; confirm if media is acceptable per protocol.
2. **Dose-map timing:** Confirm `applyPlateDoseMap()` has hard-coded row→conc map (safe to call anytime) or reads gameState (must call after all interactions).
3. **Metformin column range:** Confirm columns 7-12 (6 columns) with 8-channel tool (load all 8, dispense only 7-12, or narrower tool required).

---

## Suggested Patch Order

**Single coherent patch** for all 4 steps:

1. items.yaml: Add dilution_tube_carb_g, dilution_tube_carb_h, dilution_tube_metformin.
2. protocol.yaml: Rewrite 4 steps from `kind: modal` to `kind: interactionSequence`.
3. drug_treatment.ts: Remove 4 registeredEmitters.add() lines; optionally deprecate dead code.
4. game_state.ts: Add EVENT_SIDE_EFFECTS and wire event dispatch.
5. Walk: Verify 4 steps advance and plate state correct (8 carb doses + metformin in cols 7-12).

This completes drug-treatment modal deprecation after carb_intermediate and carb_low_range ship.
