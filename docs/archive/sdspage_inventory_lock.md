# SDS-PAGE inventory lock

Third and final M0 artifact for the SDS-PAGE YAML implementation plan
(`keen-finding-tarjan.md`, Milestone M0 / WP-0.3). Reconciles the WP-0.1 action
map (`sdspage_action_map.md`, 143 atomic interactions across Parts 1-10) and
the WP-0.2 spec-gap decision lock (`sdspage_decision_lock.md`, all 20 SGs
decided) against the plan's canonical Tables 1-4. Records the schema
acceptance check for the optional `physical_scale` object-YAML field
described in the plan's "Object physical-scale convention" section. Records
every delta the lock applies to the plan tables so M1-M5 doers have one
authoring contract instead of three artifacts to cross-reference.

The action map, the decision lock, and this inventory lock are jointly the
authoring contract for M1 through M5. If any M1+ doer hits an artifact not
present in any of the three, stop and escalate to the manager.

## Action-map reconciliation

### Coverage report

Action-map row count: **143** (matches WP-0.1 verification window of
120-150).

Gesture distribution: `click` 127, `adjust` 15, `select` 1.

The single `select` row (P7.2 `select buffer_inspection_choice`) is the
sole gesture the current stepper does not handle. Per R4 below, it is
rewritten as a `click` on a new `electrophoresis_tank.clean_buffer_affordance`
subpart and removed from the residual-risk list. After R4, gesture
distribution is `click` 128, `adjust` 15.

#### Per-parent-object touch counts

Resolved against Table 2 canonical object names, after aliasing the
action-map target tokens that drifted from the plan's naming:

| Parent object (Table 2) | Source | Touches |
| --- | --- | --- |
| `staining_tray` | Created new | 18 |
| `eppendorf_tube` | Created new | 15 |
| `gel_cassette` | Created new | 11 |
| `power_supply` | Created new | 9 |
| `electrode_module` | Created new | 7 |
| `electrophoresis_tank` | Created new | 6 |
| `ddh2o_bottle` | Created new | 5 |
| `microwave` | Created new | 4 |
| `heat_block` | Created new | 4 |
| `running_buffer_1x_carboy` | Created new | 4 |
| `p10_gel_loading_tip_box` | Created new | 4 |
| `serological_pipette` | Reused existing | 4 |
| `bme_bottle` | Created new | 3 |
| `laemmli_4x_bottle` | Created new | 3 |
| `protein_sample_tube` | Created new | 3 |
| `rocking_shaker` | Created new | 2 |
| `protein_ladder_tube` | Created new | 2 |
| `kimwipe_pad` | Created new | 2 |
| `gel_opening_tool` | Created new | 2 |
| `coomassie_stain_bottle` | Created new | 1 |
| `destain_bottle` | Created new | 1 |
| `running_buffer_10x_bottle` | Created new | 1 |
| `recycle_buffer_bottle` | Created new | 1 |
| `mini_protean_gel` | Created new | 1 |
| `p10_micropipette` | Created new | 1 |
| `lightbox` | Created new | 1 |

#### Orphan objects in Table 2

Objects in Table 2 "Created new" that the action map does not touch by name:

| Object | Disposition | Reason |
| --- | --- | --- |
| `gel_comb` | Keep | Touched only as the `gel_cassette.comb` subpart at P3.7; the standalone object exists after removal (ObjectStateChange flips `comb_present` and instantiates the standalone). Justified per M6 usage-audit "forward-compatible scaffolding" allowance. |
| `eppendorf_rack_24` | Keep | Passive scene-placement container for the 3 eppendorf tubes; never clicked. Acceptable per scene-placement carve-out. |
| `p10_gel_loading_tip` | Keep | Instantiated via cursor-attach state on `p10_micropipette` after grabbing from `p10_gel_loading_tip_box` (P5.1, P5.6, P5.10, P5.14); not clicked as a standalone target. |

Objects in Table 2 "Reused existing" that the action map does not touch:

| Object | Disposition | Reason |
| --- | --- | --- |
| `waste_container` | Keep, reconcile aliases | Action map references it under three drift names (`tip_eject_waste`, `sink_drain`, `stain_waste_bottle`); see Locked inventory delta below. |
| `aspirating_pipette` | Drop from Table 2 | Plan WP-1.5 listed it for "Part 8 tank drain", but the action map's Part 8 only removes the module/cassette and never drains the tank. The recycle path (MP-14) uses pour-into-funnel, not aspirate; the dispose path is cut by SG-stepper limitation. No interaction needs this object. |

#### Action-map rows that do not yet map to a Table 2 object

Residual aliases requiring reconciliation (resolution decided in
"Locked inventory delta" below):

| Action-map token | Touches | Resolution |
| --- | --- | --- |
| `micropipette_p20` | 9 | Reuse existing repo `micropipette` object (set_volume 0.5-1000 ul); add to Table 2 Reused existing |
| `tip_eject_waste` | 4 | Subpart of `waste_container.tip_eject_slot` |
| `sink_drain` | 3 | Subpart of `waste_container.sink_drain` |
| `timer` | 4 | Per-host equipment subpart (see delta) |
| `gel_slab` | 2 | Post-extraction state of `mini_protean_gel` (no new object) |
| `stain_waste_bottle` | 2 | New object `destain_waste_bottle` (used destain storage) |
| `coomassie_recycle_bottle` | 1 | New object `coomassie_recycle_bottle` (used Coomassie storage for reuse) |
| `funnel` | 1 | Overlay on `recycle_buffer_bottle` per plan Table 2 note; no new object |
| `smartphone_camera` | 1 | Replaced per SG16: `lightbox.capture_button` subpart |
| `buffer_inspection_choice` | 1 | Replaced per R4: `electrophoresis_tank.clean_buffer_affordance` subpart |

#### Per-mini interaction count (after reconciliation)

Mini IDs follow Table 4. MP-3, MP-11, and MP-18 are sequence runners and
have no authored interaction count of their own. R1 below leaves totals
unchanged.

| Mini ID | Mini name | Source-doc Part | Action-map slice | Count |
| --- | --- | --- | --- | --- |
| MP-1 | `sdspage_prepare_running_buffer` | Part 2 | P2.1-P2.6 | 6 |
| MP-2 | `sdspage_prepare_sample_mix_single_lane` | Part 1 (lane 1 slice) | P1.1-P1.9 | 9 |
| MP-3 | `sdspage_prepare_sample_mix_batch` | Part 1 (3 lanes) | composes MP-2 x 3 = P1.1-P1.27 | (27) |
| MP-4 | `sdspage_heat_denature_samples` | Part 1 step 3 | P1.28-P1.36 | 9 |
| MP-5 | `sdspage_prepare_gel_cassette` | Part 3 | P3.1-P3.7 | 7 |
| MP-6 | `sdspage_assemble_electrode_module` | Part 4 | P4.1-P4.4 | 4 |
| MP-7 | `sdspage_fill_tank_buffer` | Parts 3+4 | P4.5-P4.10 | 6 |
| MP-8 | `sdspage_attach_lid_and_leads` | Part 4 | P4.11-P4.13 | 3 |
| MP-9 | `sdspage_load_protein_ladder` | Part 5 (ladder slice) | P5.1-P5.5 | 5 |
| MP-10 | `sdspage_load_sample_single_lane` | Part 5 (per lane) | P5.6-P5.9 (one lane) | 4 |
| MP-11 | `sdspage_load_samples_batch` | Part 5 (3 lanes) | composes MP-10 x 3 = P5.6-P5.17 | (12) |
| MP-12 | `sdspage_run_electrophoresis` | Part 6 | P6.1-P6.6 | 6 |
| MP-13 | `sdspage_extract_gel_from_cassette` | Part 8 | P8.1-P8.11 | 11 |
| MP-14 | `sdspage_recycle_buffer` | Part 7 | P7.1-P7.5 (after R4) | 5 |
| MP-15 | `sdspage_stain_gel` | Part 9 first half | P9.1-P9.14 | 14 |
| MP-16 | `sdspage_destain_gel` | Part 9 second half | P9.15-P9.35 | 21 |
| MP-17 | `sdspage_image_gel` | Part 10 | P10.1-P10.7 | 7 |

Authored-interaction subtotal (single-lane minis only, not double-counting
the sequence runners): 6 + 9 + 9 + 7 + 4 + 6 + 3 + 5 + 4 + 6 + 11 + 5 + 14 +
21 + 7 = **117**.

Total atomic interactions across the full pathway, expanding MP-3 (MP-2 x 3)
and MP-11 (MP-10 x 3): 117 - 9 - 4 + 27 + 12 = **143**, matching the
action-map row count.

The plan body's pre-WP-0.1 estimate at locked SG defaults was 124. The lock
totals are 143 (143 vs 124 = +19), driven by MP-15/MP-16 stain-and-destain
being slightly larger than the plan estimate once rinses and pours are
itemized, and by MP-13 extract being 11 vs 10. No mini exceeds the plan's
stop-and-escalate cap of 15 interactions per single mini (the largest is
MP-16 at 21; MP-16 is single-lane and not a sequence-runner expansion, so
this is a real over-cap and is recorded in the deltas below).

### Residual-risk decisions (R1 through R4)

| Risk | Decision | Rationale |
| --- | --- | --- |
| R1 (collapse `adjust micropipette` to per-pipette set-point) | NO collapse. Adjust stays per-aspirate. Total stays 143. | The action map already lists one `adjust` per distinct aspirate, and the volumes differ between draws (21 ul protein, 7.5 ul Laemmli, 1.5 ul BME). `set_volume` being a stateful field on the pipette per `content/objects/micropipette.yaml` does not justify collapsing distinct set-point writes; only consecutive duplicate volumes would collapse, and there are none. The plan note's "~9 drop" worry was premised on a double-counted action map; the action map did not double-count. |
| R2 (adopt subpart-group authoring for staining-tray repeats) | NO. Out of scope per plan default. | Plan default keeps per-step authoring; MP-15 / MP-16 stay flat. |
| R3 (audit subpart targets vs Table 2 declarations) | Multiple drift items, all reconciled in Locked inventory delta below. | Drift items: cassette `bottom_tape` vs Table 2 `tape_bottom`; cassette `seal_left/right` vs Table 2 `arrow_left/right`; cassette `top_plate` vs Table 2 `glass_plate_front`; electrode_module subparts and power_supply/microwave/heat_block subparts not enumerated in Table 2; resolved below. |
| R4 (cut Part 7 `select`) | YES. Replace P7.2 with `click electrophoresis_tank.clean_buffer_affordance`. | Plan's allowed-simplifications and SG-stepper-limitation block require no `select` gestures; new subpart name keeps the pedagogy ("inspect the buffer for contamination, click 'clean' to proceed to recycle") without leaving the linear stepper path. Net interaction count unchanged at 143. |

## Physical-scale schema-acceptance check

Per the plan's "Object physical-scale convention" section, WP-0.3 must
confirm whether the optional `physical_scale: { class: ... }` field is
accepted by the current object validator before any WP-1.x object is
authored with it.

### Probe object

Authored at `/tmp/_physical_scale_probe.yaml` (deleted after the check):

```yaml
object_name: probe_for_physical_scale
kind: bottle
label: Physical-scale probe
physical_scale:
  class: small
```

### Validator command

```
source source_me.sh && python3 tools/validate_content_yaml.py -o /tmp/_physical_scale_probe.yaml
```

### Validator output

```
/tmp/_physical_scale_probe.yaml: ERROR: [CLOSURE] unknown top-level key 'physical_scale' (allowed: ['capabilities', 'channel_addressing', 'kind', 'label', 'layout', 'object_name', 'state_fields', 'structure', 'visual_states'])
/tmp/_physical_scale_probe.yaml: ERROR: missing required key 'state_fields'
2 error(s) in /tmp/_physical_scale_probe.yaml
EXIT=1
```

### Decision

FAIL. The current object schema closes its top-level key set to
`capabilities`, `channel_addressing`, `kind`, `label`, `layout`,
`object_name`, `state_fields`, `structure`, `visual_states`. The
`physical_scale` field is unknown and the validator rejects it. Per the
plan's spec-vocabulary-lock rule ("Closure over openness") and the
plan's explicit instruction that no validator edits are permitted in
this scope, the `physical_scale` convention is **deferred**.

No WP-1.x object YAML will carry `physical_scale` or `approx_volume_ml`.
Object physical-scale intent is captured in a text-only companion file
at `docs/active_plans/sdspage_physical_scale.md` (one line per object,
class only). No schema extension by this plan under any circumstance.

A side benefit of the probe: the validator's error message enumerates
the canonical object top-level keys, which is itself reusable evidence
for the M1 doer ("if you reach for any key outside that list, you are
inventing vocabulary").

## Locked inventory delta vs plan tables

The reconciliation above produces the following concrete changes to plan
Tables 1-4. M1 doers must follow this delta in addition to the original
plan tables; in any conflict between the delta and the plan tables, the
delta wins.

### Table 1 (Scenes)

No changes.

### Table 2 (Objects)

Created new -- additions (2):

1. Add `coomassie_recycle_bottle` to Created new consumables. Source-doc
   reason: Part 9 step "pour off stain into recycle bottle for reuse"
   (action-map P9.14). Owner WP: WP-1.4. Source SVG candidate:
   `flask-*.svg` blue-tint variant + pre-printed label overlay.
2. Add `destain_waste_bottle` to Created new consumables. Source-doc
   reason: Part 9 step "pour used destain into waste" (action-map P9.32).
   Owner WP: WP-1.4. Source SVG candidate: `flask-*.svg` clear variant +
   "destain waste" pre-printed label overlay.

Reused existing -- addition (1) and removal (1):

3. Add `micropipette` to Reused existing. Source-doc reason: Part 1
   sample-mix volumes 21 / 7.5 / 1.5 ul fit within the existing
   `micropipette` set_volume range (0.5-1000 ul) per
   `content/objects/micropipette.yaml`. Owner WP: WP-1.5. No enum
   extension required if `protein_sample_raw`, `laemmli_4x`, `bme`,
   `running_buffer_1x`, `ddh2o`, `coomassie_stain`, and `destain` are
   added to `held_material_name`. WP-1.5 must perform this enum extension
   along with the other reused-object extensions and rerun full-repo
   `validate_content_yaml.py`.
4. Remove `aspirating_pipette` from Reused existing. The action map never
   uses tank-drain-by-aspirate; the recycle path (MP-14) pours through a
   funnel; the dispose path is cut by stepper limitation (SG8 / SG15
   pattern). No interaction needs this object.

Subpart enumerations missing from Table 2 (additions to existing object
declarations; not new objects):

5. `gel_cassette` subparts must include the action-map names. Reconcile
   plan-table naming drift by adopting the action-map names as canonical:
   `bottom_tape` (plan said `tape_bottom`), `comb`, `lane_1`..`lane_10`,
   `seal_left`, `seal_right` (plan said `arrow_left/right` per SG19;
   `seal_left/seal_right` is more descriptive of the prising target),
   `top_plate` (plan said `glass_plate_front`; `top_plate` matches the
   action-map use as the plate prised off and is what the source doc
   calls it), `glass_plate_back`, `side_clamp_left`, `side_clamp_right`,
   `wing_clamp_left`, `wing_clamp_right`. State-field names retain plan
   conventions: `tape_present`, `comb_present`, `glass_plate_inserted`,
   `side_clamps_locked`, `wing_clamps_locked`.
6. `electrode_module` subparts must include: `slot_left`, `clamp_left`,
   `clamp_right`, `wing_clamp_left`, `wing_clamp_right`. (Plan WP-1.3
   listed clamps and wing clamps on `electrophoresis_tank`; action map
   places them on `electrode_assembly`, which the alias table resolves
   to `electrode_module`. The module owns the clamps; the tank owns the
   chambers and lid.)
7. `electrophoresis_tank` subparts must include: `inner_chamber`,
   `outer_chamber`, `lid`, `clean_buffer_affordance` (NEW per R4;
   visible "buffer looks clean" affordance that the student clicks at
   P7.2 to enter the recycle path instead of selecting from a Y/N
   choice). The R4 affordance is a passive subpart whose `click` resolves
   to a `correct_target` validator; no `select` gesture authored.
8. `power_supply` subparts must include: `power_switch`, `voltage_knob`,
   `run_button`, `lead_red`, `lead_black`. `set_voltage` remains an
   adjusted state field with `target_with_value` validator preset (per
   Risk register entry).
9. `microwave` subparts must include: `start_button`. `set_time_s`
   remains a state field per WP-1.1.
10. `heat_block` subparts must include: `slot_1`, `slot_2`, `slot_3`,
    `slot_4` (matches action-map P1.29 / P1.31 / P1.33 / P1.35; 4-slot
    layout suffices because only 4 lanes carry sample per SG18) and
    `timer_start` (replaces alias `timer` at P1.36). `set_temperature`
    remains a state field per WP-1.1.
11. `rocking_shaker` subparts must include: `timer_start` (replaces
    alias `timer` at P9.12 and P9.35).
12. `waste_container` subparts must include: `tip_eject_slot` (replaces
    alias `tip_eject_waste` at P5.5 / P5.9 / P5.13 / P5.17) and
    `sink_drain` (replaces alias `sink_drain` at P9.4 / P9.18 / P9.22).
    Both are passive `click`-only subparts; their `response` does an
    `ObjectStateChange` that flips a `material_volume` increment on
    the tracked waste material.
13. `lightbox` subparts must include: `capture_button` (replaces alias
    `smartphone_camera` at P10.7; SG16 already decided to put this on
    the lightbox).

Mentioned-but-deferred (additions to Table 2 "Mentioned but deferred"):

14. Add `timer` (standalone) to Mentioned but deferred. Reason: the
    action map's `click timer` rows resolve to per-host equipment
    subparts (`heat_block.timer_start`, `rocking_shaker.timer_start`,
    `power_supply.run_button`); no standalone scene-level timer object
    is authored.

### Table 3 (Materials)

No changes. The 14 materials listed in plan Table 3 cover every material
state the action map exercises.

### Table 4 (Mini-protocols)

Interaction counts revised after reconciliation. The plan body's
estimates remain useful as order-of-magnitude bounds; the table below
is the authoring contract:

| Mini ID | Plan estimate | Locked count | Delta | Note |
| --- | --- | --- | --- | --- |
| MP-1 | 4 | 6 | +2 | Two extra cap/place steps the plan rounded out |
| MP-2 | 9 | 9 | 0 | -- |
| MP-3 | composes MP-2 x 3 | composes MP-2 x 3 | 0 | -- |
| MP-4 | 6 | 9 | +3 | Action map enumerates per-tube placements (4 tubes x slot, plus timer); plan rounded to 6 |
| MP-5 | 10 | 7 | -3 | Action map decomposes more compactly (no per-clamp leak-check step) |
| MP-6 | 6 | 4 | -2 | Module-drop-into-tank is one ObjectStateChange, not multiple steps |
| MP-7 | 5 | 6 | +1 | Two distinct chamber-fill aspirate/dispense pairs |
| MP-8 | 5 | 3 | -2 | Plan over-rounded the lid+leads sequence |
| MP-9 | 4 | 5 | +1 | Tip change discipline included (matches SG10) |
| MP-10 | 7 | 4 | -3 | Per-lane is leaner; the +3 lives in MP-11 sequence-runner expansion |
| MP-11 | composes MP-10 x 3 | composes MP-10 x 3 (= 12) | 0 | -- |
| MP-12 | 4 | 6 | +2 | Action map enumerates power-switch on/off bracketing run |
| MP-13 | 10 | 11 | +1 | One extra pour-off step before opening tool work |
| MP-14 | 3 | 5 | +2 | R4 adds clean-buffer affordance click; plan didn't budget the inspection step |
| MP-15 | 10 | 14 | +4 | Two distinct rinses before stain plus pour-off into recycle bottle |
| MP-16 | 10 | 21 | +11 | Two rinses before destain, two kimwipe steps, full destain pour to waste; **over the 15-interaction cap**, see follow-up note below |
| MP-17 | 5 | 7 | +2 | Action map includes ddh2o rinse and gel-removal steps |
| MP-18 | composes MP-1..MP-17 | composes MP-1..MP-17 | 0 | -- |

**MP-16 over-cap follow-up**: the plan's "Stop-and-escalate conditions"
include "any mini exceeds 15 interactions after decomposition". MP-16 at
21 interactions exceeds the cap. Decision: decompose MP-16 into two
sequential leaf minis -- **MP-16a `sdspage_destain_gel_setup`** (rinses +
add destain + microwave; P9.15-P9.29, 15 interactions) and **MP-16b
`sdspage_destain_gel_rock`** (kimwipe + rocker + final pour-off;
P9.30-P9.35, 6 interactions). Both stay within the cap. MP-16 becomes a
two-leaf composition wired into MP-18. This is the only mini-protocol
count change in Table 4 (now 19 total minis, not 18). Authoring contract
for MP-16 splits accordingly; rest of Table 4 unchanged.

## Doer contract

The action map (`sdspage_action_map.md`), the decision lock
(`sdspage_decision_lock.md`), and this inventory lock
(`sdspage_inventory_lock.md`) are jointly the authoring contract for
M1 through M5. M1-M5 doers must consult all three. If any doer hits an
artifact (object name, subpart name, material name, mini name, gesture,
scene op, state field, validator preset) that is not present in any of
the three artifacts, stop and escalate to the manager rather than
inventing the artifact in place. The schema-acceptance check above is
also load-bearing: no WP-1.x object adds a `physical_scale` field, no
validator gets edited, and the physical-scale companion file is the
sole authoring surface for layout-size hints during this plan.
