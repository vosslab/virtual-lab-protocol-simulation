# Pilot Selection

Tracks the M4 solid-walker pilot protocol choice and rationale.

## 2026-05-28 M4 pilot pivot to click-only

### Context

The M4 solid walker (`tests/playwright/test_solid_walker.mjs`) drives a
mini-protocol entirely through visible UI (`[data-item-id]` clicks in
`#scene-root`), per PRIMARY_CONTRACT.md item 4. The original pilot
`mtt_reagent_prep` includes an `adjust` gesture
(`micropipette.set_volume = 1000`) for which the runtime's click_resolver
has no DOM affordance yet. The walker stalls at that interaction.

To unblock M4 acceptance evidence, pilot pivots to a click-only
mini-protocol. `mtt_reagent_prep` returns as the pilot once
adjust-gesture DOM affordance lands (follow-up).

### Audit method

One-time script `tools/audit_gestures.py` walked every
`content/protocols/<cluster>/<name>/protocol.yaml` and printed the
gesture set, step count, and unresolved-target count (sourced from
`docs/active_plans/active/web_ui/audits/protocol_object_xref.md`).
Script deleted after use; output baked in below.

### Audit output (mini-protocols only)

```
cell_seeding_plate_setup                {adjust,click}  steps= 4  unresolved=0
drug_dilution_setup                     {adjust,click}  steps= 9  unresolved=0
mtt_plate_reaction                      {adjust,click}  steps= 6  unresolved=0
mtt_reagent_prep                        {adjust,click}  steps= 4  unresolved=0
mtt_solubilization_readout              {adjust,click}  steps= 3  unresolved=0
passage_hood_detachment                 {adjust,click}  steps= 9  unresolved=1
passage_pellet_reseed                   {adjust,click}  steps= 9  unresolved=1
plate_drug_treatment_drug_addition      {adjust,click}  steps= 9  unresolved=0
plate_drug_treatment_media_adjustment   {adjust,click}  steps= 2  unresolved=0
trypan_blue_counting                    {adjust,click}  steps= 9  unresolved=1
sdspage_assemble_electrode_module       {click}         steps= 4  unresolved=0
sdspage_attach_lid_and_leads            {click}         steps= 1  unresolved=0
sdspage_destain_gel_rock                {adjust,click}  steps= 3  unresolved=0
sdspage_destain_gel_setup               {adjust,click}  steps= 6  unresolved=0
sdspage_extract_gel_from_cassette       {click}         steps= 5  unresolved=0
sdspage_fill_tank_buffer                {adjust,click}  steps= 2  unresolved=0
sdspage_heat_denature_samples           {click}         steps= 4  unresolved=0
sdspage_image_gel                       {click}         steps= 3  unresolved=2
sdspage_load_protein_ladder             {adjust,click}  steps= 6  unresolved=0
sdspage_load_sample_single_lane         {adjust,click}  steps= 3  unresolved=0
sdspage_prepare_gel_cassette            {click}         steps= 4  unresolved=0
sdspage_prepare_running_buffer          {adjust,click}  steps= 2  unresolved=0
sdspage_prepare_sample_mix_single_lane  {adjust,click}  steps= 4  unresolved=0
sdspage_recycle_buffer                  {click}         steps= 3  unresolved=0
sdspage_run_electrophoresis             {adjust,click}  steps= 3  unresolved=0
sdspage_stain_gel                       {click}         steps= 5  unresolved=0
```

### Click-only candidates (gesture_set == {click} and unresolved == 0)

| Protocol | Steps |
| --- | ---:|
| sdspage_attach_lid_and_leads | 1 |
| sdspage_recycle_buffer | 3 |
| sdspage_assemble_electrode_module | 4 |
| sdspage_heat_denature_samples | 4 |
| sdspage_prepare_gel_cassette | 4 |
| sdspage_extract_gel_from_cassette | 5 |
| sdspage_stain_gel | 5 |

`sdspage_image_gel` is also click-only but has 2 unresolved targets
(BLOCKING per the xref audit) and is excluded.

### Choice: sdspage_attach_lid_and_leads

Simplest click-only candidate by step count. The single step
`secure_apparatus` contains three `click` interactions with one
`SceneChange` and three `ObjectStateChange` scene operations, which is
enough to exercise the typed seam (step_started, interaction_validated,
step_completed, protocol_completed) end-to-end without requiring any
non-click gesture affordance.

Alternatives if step coverage proves too thin:

- `sdspage_recycle_buffer` (3 steps)
- `sdspage_assemble_electrode_module` (4 steps)
- `sdspage_prepare_gel_cassette` (4 steps)

### Follow-up

When adjust-gesture DOM affordance lands in the runtime, switch the
pilot back to `mtt_reagent_prep` and exercise the broader gesture set.
