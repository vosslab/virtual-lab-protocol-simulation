# Round 3 adjust panel visibility diagnosis

## Verdict

TEST_DRIVER_TIMING. NOT a runtime panel-visibility bug. The orchestrator renders the adjust panel correctly on every adjust interaction. The 3 failing OSC audit protocols failed because the driver read state before the click handler's async finally block executed and rendered the panel.

Five candidate classes from the brief:

- PANEL_NEVER_CREATED: false. Container created once at mount, appended to document.body.
- PANEL_HIDDEN: false. Orchestrator sets display:block before renderAdjustPanel.
- PANEL_OFFSCREEN: false. Panel uses position:absolute top:50% left:50% translate(-50%,-50%).
- PANEL_BEHIND_OVERLAY: no evidence.
- OBJECT_FIELD_MISSING: false. Both micropipette and multichannel_pipette declare set_volume in state_fields.

## Affected protocols

| Protocol | Entry step | First adjust at index | Real cause |
| --- | --- | --- | --- |
| trypan_blue_counting | add_trypan_blue_to_chamber | 1 (after click on micropipette) | Driver read state before finally fired |
| mtt_plate_reaction | prepare_pipette_for_mtt (step 1) | 1 (after click on multichannel_pipette) | Same |
| mtt_solubilization_readout | add_dmso_to_wells | 1 (after click on micropipette) | Same |

## Trace through entry.ts

`src/scene_runtime/bundle/entry.ts`:

1. Mount: loadAndMountByProtocolName at line 914 calls orchestrateNextInteractionWithCompletion. currentInteractionIndex is 0, gesture is click. Line 474-480 else-branch runs: display:none set. Correct.
2. User clicks the target. attachClickDispatch handler fires (line 840). It validates the target, applies SceneChange / CursorAttach / OSC ops, increments currentInteractionIndex to 1, re-renders the scene. The finally block at line 898 then calls orchestrateNextInteractionWithCompletion.
3. Orchestrator at line 365 detects gesture is adjust. getFieldNameFromValidator extracts the field (e.g. set_volume). Object lookup succeeds (state_field exists). Line 417: adjustPanelContainer.style.display = "block". renderAdjustPanel called.

Panel is created and visible after the click handler's finally block runs. Drivers that query the DOM synchronously before that block completes miss the panel.

## Evidence

- `src/scene_runtime/bundle/entry.ts` lines 365-473 (adjust branch in orchestrateNextInteraction)
- `src/scene_runtime/bundle/entry.ts` lines 898-910 (finally block calls orchestrator after every click)
- `src/scene_runtime/bundle/entry.ts` line 822-827 (panel container created once at mount, appended to body)
- `src/scene_runtime/chrome/adjust_panel.ts` line 18 (Pilot 1 closed set includes set_volume)
- `generated/object_data.ts` lines 1637-1647 (micropipette set_volume field present)
- `content/objects/pipette/multichannel_pipette.yaml` lines 6-13 (multichannel set_volume field present)
- `content/protocols/cell_culture/trypan_blue_counting/protocol.yaml` lines 48-71 (click then adjust)
- `content/protocols/cell_culture/mtt_plate_reaction/protocol.yaml` lines 66-88 (click then adjust)
- `content/protocols/cell_culture/mtt_solubilization_readout/protocol.yaml` lines 33-51 (click then adjust)
- `docs/active_plans/reports/round3_osc_fire_audit.md` lines 35-37 (error text per protocol)

## Fix recommendation

Driver-side only. Runtime is correct.

For any protocol whose entry_step has gesture adjust at interaction index 0, the panel is visible at mount. For any protocol where the first adjust interaction follows one or more clicks (index >= 1), the panel appears only after the preceding click's finally block runs. The driver must:

1. After clicking a scene object that precedes an adjust interaction, use `page.waitForSelector('[data-testid="adjust-panel"]:not([style*="display: none"])')` (or equivalent) before reading or interacting with the panel.
2. Alternatively, poll `adjustPanelContainer.style.display === "block"` via page.evaluate before treating the next interaction as adjust.

Secondary correction: round3_osc_fire_audit.md line 27 describes mtt_solubilization_readout as opening in incubator_workspace. Actual YAML declares SceneChange to_scene mtt_solubilization_readout_bench_workspace.

## Status

DONE. No runtime defect. OSC infrastructure confirmed healthy across all 5 protocols in the audit. Driver-side wait pattern documented for next OSC walker iteration.
