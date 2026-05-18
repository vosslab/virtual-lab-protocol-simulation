# sdspage scene content completion - WP-IDENT-1 identify deliverable

This document is the WP-IDENT-1 output of the plan
[sdspage_scene_content_completion.md](sdspage_scene_content_completion.md).
It enumerates the seven zero-placement sdspage workspace scenes, confirms
their current zero-placement status, walks every parent mini-protocol's
step-target inventory, aggregates the distinct object inventory the
contracts (WP-CONTRACT-1 through WP-CONTRACT-N) must address, and
surfaces adapter coverage gaps as follow-up blockers.

In-scope per plan: identification only. Out of scope: contract design,
adapter authoring, scene edits, object edits, runtime/CSS edits.

User-locked defaults applied: required scene items come from each parent
mini-protocol's `protocol.yaml` step targets; runner-level overrides are
out of scope but noted if discovered; adapter gaps are recorded as
follow-up blockers, not solved.

## 1. Seven sdspage zero-placement scene file paths

1. [content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml](../../content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml)
2. [content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml](../../content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml)
3. [content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml](../../content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml)
4. [content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml](../../content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml)
5. [content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml](../../content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml)
6. [content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml](../../content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml)
7. [content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml](../../content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml)

## 2. Zero-placement confirmation (7 of 7)

For each file, the entire authored body is reproduced below. None of the
seven scene YAMLs carries a `placements:` block at the override layer.
All seven currently rely entirely on inheritance through `extends:` to a
shared base scene (`electrophoresis_bench`, `staining_bench`, or
`heat_block_bench`), with no `add_placements`, `remove_placements`,
`reposition_placements`, or `deactivate_placements` directives.

This matches the Experiment 1 Section 3 corpus rows 25, 26, 28, 29, 31,
33, 34 carrying `placement_count = 0` and the
`failure_mode = scene_content_incomplete` flag from Section 2.5.

### 2.1 sdspage_attach_lid_and_leads_workspace.yaml

```yaml
scene_name: sdspage_attach_lid_and_leads_workspace
extends: electrophoresis_bench

scene_notes: |
  Electrophoresis bench workspace for securing apparatus with lid and leads.
  Extends electrophoresis_bench which provides electrophoresis_tank and power_supply.
```

Placements: none authored at override layer.

### 2.2 sdspage_destain_gel_rock_workspace.yaml

```yaml
scene_name: sdspage_destain_gel_rock_workspace
extends: staining_bench

scene_notes: |
  Staining bench workspace for SDS-PAGE gel destaining. Extends staining_bench
  which provides rocking_shaker, staining_tray, kimwipe_pad, and destain_waste_bottle.
```

Placements: none authored at override layer.

### 2.3 sdspage_fill_tank_buffer_workspace.yaml

```yaml
scene_name: sdspage_fill_tank_buffer_workspace
extends: electrophoresis_bench

scene_notes: |
  Electrophoresis bench workspace for filling tank buffer chambers. Extends electrophoresis_bench
  which provides serological_pipette, running_buffer_1x_carboy, and electrophoresis_tank.
```

Placements: none authored at override layer.

### 2.4 sdspage_heat_denature_samples_workspace.yaml

```yaml
scene_name: sdspage_heat_denature_samples_workspace
extends: heat_block_bench

scene_notes: |
  Heat block workspace for SDS-PAGE sample denaturation. Extends heat_block_bench
  which provides heat_block in center and microtube_rack_24 in rear_left.
```

Placements: none authored at override layer.

### 2.5 sdspage_prepare_running_buffer_workspace.yaml

```yaml
scene_name: sdspage_prepare_running_buffer_workspace
extends: electrophoresis_bench

scene_notes: |
  Electrophoresis bench workspace for preparing running buffer. Extends electrophoresis_bench
  which provides serological_pipette, running_buffer_10x_bottle, running_buffer_1x_carboy, and ddh2o_bottle.
```

Placements: none authored at override layer.

### 2.6 sdspage_recycle_buffer_workspace.yaml

```yaml
scene_name: sdspage_recycle_buffer_workspace
extends: electrophoresis_bench

scene_notes: |
  Electrophoresis bench workspace for buffer recycling. Extends electrophoresis_bench
  which provides electrophoresis_tank, recycle_buffer_bottle, and ddh2o_bottle.
```

Placements: none authored at override layer.

### 2.7 sdspage_run_electrophoresis_workspace.yaml

```yaml
scene_name: sdspage_run_electrophoresis_workspace
extends: electrophoresis_bench

scene_notes: |
  Electrophoresis bench workspace for running the gel. Extends electrophoresis_bench
  which provides power_supply and other electrophoresis apparatus.
```

Placements: none authored at override layer.

Confirmation: 7 of 7 are zero-placement at the override layer.

Important nuance for contract design (M2-M5): each override resolves a
non-zero effective placement set via `extends:`, because the three base
scenes already carry placement bodies. The contracts must decide whether
"scene content completion" means (a) every parent-protocol step target
is present in the inherited base scene, (b) the override must opt-in to
each inherited placement, or (c) the override must republish its
required items via `add_placements`/`reposition_placements`. This choice
is NOT made here; this WP only inventories.

## 3. Per-protocol step.sequence[*].target enumeration

Each row below is `target` exactly as authored in
`content/protocols/sdspage/<protocol_name>/protocol.yaml`. Targets are
deduplicated within each protocol while preserving authoring order on
first appearance. Structured classification is taken verbatim from
Experiment 1 Section 6.

### 3.1 sdspage_attach_lid_and_leads

Parent file: [content/protocols/sdspage/sdspage_attach_lid_and_leads/protocol.yaml](../../content/protocols/sdspage/sdspage_attach_lid_and_leads/protocol.yaml)

| target | classification |
| --- | --- |
| electrophoresis_tank | workspace (Section 6 workspace note; flip-rule on lid/buffer interior) |
| power_supply | structured (instrument display readout) |

Distinct targets: 2.

### 3.2 sdspage_destain_gel_rock

Parent file: [content/protocols/sdspage/sdspage_destain_gel_rock/protocol.yaml](../../content/protocols/sdspage/sdspage_destain_gel_rock/protocol.yaml)

| target | classification |
| --- | --- |
| rocking_shaker | workspace |
| staining_tray | workspace |
| kimwipe_pad | workspace |
| destain_waste_bottle | workspace |

Distinct targets: 4.

### 3.3 sdspage_fill_tank_buffer

Parent file: [content/protocols/sdspage/sdspage_fill_tank_buffer/protocol.yaml](../../content/protocols/sdspage/sdspage_fill_tank_buffer/protocol.yaml)

| target | classification |
| --- | --- |
| serological_pipette | workspace |
| running_buffer_1x_carboy | workspace |
| electrophoresis_tank | workspace |

Distinct targets: 3.

### 3.4 sdspage_heat_denature_samples

Parent file: [content/protocols/sdspage/sdspage_heat_denature_samples/protocol.yaml](../../content/protocols/sdspage/sdspage_heat_denature_samples/protocol.yaml)

| target | classification |
| --- | --- |
| heat_block | structured (instrument display readout) |
| microtube_rack_24 | structured (rack-kind; 24-microtube interior) |

Distinct targets: 2.

### 3.5 sdspage_prepare_running_buffer

Parent file: [content/protocols/sdspage/sdspage_prepare_running_buffer/protocol.yaml](../../content/protocols/sdspage/sdspage_prepare_running_buffer/protocol.yaml)

| target | classification |
| --- | --- |
| serological_pipette | workspace |
| running_buffer_10x_bottle | workspace |
| running_buffer_1x_carboy | workspace |
| ddh2o_bottle | workspace |

Distinct targets: 4.

### 3.6 sdspage_recycle_buffer

Parent file: [content/protocols/sdspage/sdspage_recycle_buffer/protocol.yaml](../../content/protocols/sdspage/sdspage_recycle_buffer/protocol.yaml)

| target | classification |
| --- | --- |
| electrophoresis_tank | workspace |
| recycle_buffer_bottle | workspace |

Distinct targets: 2.

### 3.7 sdspage_run_electrophoresis

Parent file: [content/protocols/sdspage/sdspage_run_electrophoresis/protocol.yaml](../../content/protocols/sdspage/sdspage_run_electrophoresis/protocol.yaml)

| target | classification |
| --- | --- |
| power_supply | structured (instrument display readout) |

Distinct targets: 1.

### 3.8 Total step-target enumeration

Sum of per-protocol distinct targets across all seven mini-protocols
(not yet deduplicated cross-protocol): 2 + 4 + 3 + 2 + 4 + 2 + 1 = 18.

## 4. Aggregated referenced object inventory

Cross-protocol deduplicated list of distinct `object_name` values
referenced by the seven parent mini-protocols. Distinct object count: 13.

For each object the "adapter coverage" column is classified as one of:

- has-adapter: a dedicated adapter exists under
  `src/scene_runtime/adapters/<object>/`.
- likely-adapter-gap: object is structured per Experiment 1 Section 6
  (or carries instrument readout / interior addressing) and has NO
  dedicated adapter under `src/scene_runtime/adapters/`. Listed as a
  follow-up blocker in Section 6.
- workspace-only: object is workspace-classified per Section 6 and
  requires only a generic workspace renderer plus its object YAML; no
  per-object adapter is presumed required.

Current adapter inventory under `src/scene_runtime/adapters/`
(from `git ls-files src/scene_runtime/adapters/`):

- `src/scene_runtime/adapters/well_plate/index.ts`
- `src/scene_runtime/adapters/well_plate/render.ts`

Only one adapter exists: `well_plate`. None of the 13 objects below is
`well_plate_96`; the well_plate adapter does not cover any sdspage
inventory item.

| object_name | object YAML | Section 6 class | adapter coverage |
| --- | --- | --- | --- |
| electrophoresis_tank | content/objects/equipment/electrophoresis_tank.yaml | workspace (flip-rule note) | workspace-only |
| power_supply | content/objects/equipment/power_supply.yaml | structured | likely-adapter-gap |
| rocking_shaker | content/objects/equipment/rocking_shaker.yaml | workspace (flip-rule note) | workspace-only |
| staining_tray | content/objects/equipment/staining_tray.yaml | workspace (flip-rule note) | workspace-only |
| kimwipe_pad | content/objects/decoration/kimwipe_pad.yaml | workspace | workspace-only |
| destain_waste_bottle | content/objects/bottle/destain_waste_bottle.yaml | workspace | workspace-only |
| serological_pipette | content/objects/pipette/serological_pipette.yaml | workspace | workspace-only |
| running_buffer_1x_carboy | content/objects/bottle/running_buffer_1x_carboy.yaml | workspace | workspace-only |
| running_buffer_10x_bottle | content/objects/bottle/running_buffer_10x_bottle.yaml | workspace | workspace-only |
| ddh2o_bottle | content/objects/bottle/ddh2o_bottle.yaml | workspace | workspace-only |
| recycle_buffer_bottle | content/objects/bottle/recycle_buffer_bottle.yaml | workspace | workspace-only |
| heat_block | content/objects/equipment/heat_block.yaml | structured | likely-adapter-gap |
| microtube_rack_24 | content/objects/rack/microtube_rack_24.yaml | structured | likely-adapter-gap |

Distinct workspace-only objects: 10. Distinct structured / likely-adapter-gap
objects: 3.

## 5. Runner-level overrides discovered

Out of scope per user-locked default. None of the seven scene YAMLs
declares `add_placements`, `remove_placements`, `reposition_placements`,
or `deactivate_placements` at the override layer, and no
sequence-runner-level scene override file was discovered while reading
the seven `protocol.yaml` files. No runner-level overrides surfaced
during this WP.

If a future sequence-runner-level scene override comes to light it must
be appended to this section as evidence, not silently merged into
Section 3.

## 6. Adapter coverage gaps (follow-up blockers)

Recorded only; not solved by this WP. Each gap below should be opened as
a separate follow-up adapter authoring task before contracts M2-M5 try to
guarantee end-to-end visible interaction for the affected steps.

| object_name | reason adapter is needed |
| --- | --- |
| power_supply | structured instrument with set_voltage / running display readout (Experiment 1 Section 6). Used by `sdspage_attach_lid_and_leads` (`cathode_lead_attached`, `anode_lead_attached`) and `sdspage_run_electrophoresis` (`set_voltage`, `running`). |
| heat_block | structured instrument with lid_open / set_temperature display readout (Experiment 1 Section 6). Used by `sdspage_heat_denature_samples` (`lid_open`, `rack_present`, 5 min TimedWait). |
| microtube_rack_24 | rack-kind object owning 24-microtube interior (Experiment 1 Section 6). Used by `sdspage_heat_denature_samples` (rack-into-block placement, ladder + 3 sample tubes). |

Adapter-gap count: 3.

Note (recorded, not solved): `electrophoresis_tank`, `rocking_shaker`,
and `staining_tray` are currently workspace-classified per Section 6 with
the explicit flip-rule that they become structured the moment a sketch
needs to address their interior (tank buffer chambers, shaker bed,
tray sub-positions). The contracts may need to invoke the flip rule and
add those to the adapter-gap list; this WP records the watch-list and
does not flip them.

## 7. Contract input summary

Distilled from Sections 3 and 4 for the contract authors of WP-CONTRACT-1
through WP-CONTRACT-N. Each item is a closed input the contracts must
address, not a design proposal.

Regions / item categories the contracts will need to address:

- **Electrophoresis apparatus region.** electrophoresis_tank,
  power_supply. Used by 4 of 7 protocols (attach_lid_and_leads,
  fill_tank_buffer, recycle_buffer, run_electrophoresis). Inherited
  through `extends: electrophoresis_bench`. Includes a structured
  instrument (power_supply) requiring adapter coverage (Section 6 gap).
- **Buffer reagent shelf region.** running_buffer_10x_bottle,
  running_buffer_1x_carboy, ddh2o_bottle, recycle_buffer_bottle,
  destain_waste_bottle. Used by 4 of 7 protocols. All workspace-only;
  no adapter gap.
- **Pipetting tool region.** serological_pipette. Used by 2 of 7
  protocols (fill_tank_buffer, prepare_running_buffer).
- **Gel staining tray region.** staining_tray, kimwipe_pad,
  rocking_shaker, destain_waste_bottle. Used by 1 of 7 protocols
  (destain_gel_rock). Inherited through `extends: staining_bench`.
- **Heat block region.** heat_block, microtube_rack_24. Used by 1 of 7
  protocols (heat_denature_samples). Inherited through
  `extends: heat_block_bench`. Both items are structured (Section 6
  gaps).
- **Decision the contracts must record explicitly:** for each of the
  seven scenes, whether scene-content completion means (a) the inherited
  base scene already covers every required target (validate, do not add),
  (b) the override must explicitly republish required placements with
  `add_placements`, or (c) the base scenes must change so the inheritance
  always carries the right effective set. The current zero-placement
  state of all seven override files makes this choice load-bearing; the
  contracts must not leave it implicit.
- **Adapter blockers for any contract that gates on visible interaction:**
  power_supply, heat_block, microtube_rack_24. Until adapter coverage
  exists for these three, mini-protocols whose step.targets include them
  cannot satisfy the PRIMARY_CONTRACT rule that "a mini-protocol is not
  complete until the visible interaction works."

End of WP-IDENT-1 deliverable.
