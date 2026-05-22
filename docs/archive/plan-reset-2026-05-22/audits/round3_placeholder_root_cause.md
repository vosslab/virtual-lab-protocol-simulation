# Round 3 placeholder root cause investigation

## Verdict

STREAM_3A_INCOMPLETE combined with VISUAL_STATE_GAP. 17 fallbacks remain after the staining_tray fix.

## Decision path in code

`src/scene_runtime/render/scene.ts:renderPlacement()` (lines 289-318) drives the placeholder decision:

1. Calls `resolveVisualAsset(objectConfig, objectState)` at line 290.
2. `resolveVisualAsset` iterates `objectConfig.visual_states` and skips any entry whose `kind` is `composite`, `overlay`, or `formula` (lines 168-174). Processes only `kind: svg` or `kind: svg_swap`.
3. For matching entries, walks `cases`, finds the entry matching the current state value, returns `caseEntry.output?.asset_name`.
4. If no svg/svg_swap entry is found, or the matching case has no asset_name, returns `{asset_name: undefined, deferred: true}`.
5. Back in renderPlacement: if assetName is defined, calls `getAssetSvgString(assetName)` (line 305). That function in `src/scene_runtime/render/svg_loader.ts` builds `"SVG_" + assetName.toUpperCase()` and looks up the barrel export in `generated/svg_assets/index.ts`. If absent, returns undefined, triggering the fallback.
6. Green `#e8f5e9` rect with `data-render-fallback="true"` written at lines 321-335.

The resolver key is always computed from `asset_name` declared in YAML `visual_states.cases.output.asset_name`. No separate registry, no alias map, no prefix system. The barrel is the sole lookup table.

## ASSET_NAME_DRIFT offenders (12 variants)

| Object yaml | asset_name referenced | barrel export expected | exists? |
| --- | --- | --- | --- |
| vortex.yaml | vortex_idle | SVG_VORTEX_IDLE | NO |
| vortex.yaml | vortex_spinning | SVG_VORTEX_SPINNING | NO |
| microscope.yaml | microscope_dark | SVG_MICROSCOPE_DARK | NO |
| microscope.yaml | microscope_lit | SVG_MICROSCOPE_LIT | NO |
| electrode_module.yaml | electrode_module_mounted | SVG_ELECTRODE_MODULE_MOUNTED | NO |
| electrode_module.yaml | electrode_module_unmounted | SVG_ELECTRODE_MODULE_UNMOUNTED | NO |
| electrode_module.yaml | electrode_module_without_cassette | SVG_ELECTRODE_MODULE_WITHOUT_CASSETTE | NO |
| electrode_module.yaml | electrode_module_clamps_open | SVG_ELECTRODE_MODULE_CLAMPS_OPEN | NO |
| ethanol_bottle.yaml | ethanol_bottle | SVG_ETHANOL_BOTTLE | NO (only SVG_ETHANOL_SPRAY) |
| hood_surface.yaml | hood_surface_dirty | SVG_HOOD_SURFACE_DIRTY | NO |
| hood_surface.yaml | hood_surface_clean | SVG_HOOD_SURFACE_CLEAN | NO |
| gel_cassette.yaml | gel_lane_empty (subpart) | SVG_GEL_LANE_EMPTY | NO |

## VISUAL_STATE_GAP objects (8 fallbacks)

All `visual_states` entries are composite or overlay; resolveVisualAsset skips all and returns `deferred: true`; `data-asset` is null.

| Object yaml | visual_states kinds | fallback count |
| --- | --- | --- |
| microtube_rack_24.yaml | both composite | 2 |
| cell_counter.yaml | overlay/composite | 1 |
| counter_slide_cartridge.yaml | overlay/composite | 1 |
| kimwipe_pad.yaml | empty visual_states | 1 |
| mini_protean_gel.yaml | composite | 1 |
| gel_comb.yaml | composite | 1 |
| p10_gel_loading_tip_box.yaml | empty visual_states | 1 |
| gel_opening_tool.yaml | empty visual_states | 1 |

## Reconciliation with prior reports

Neither A5 nor Stream 3A is wrong; they measured different things.

- A5 measured all 19 placement-instance fallbacks and correctly identified both asset-registration gaps and state-resolution gaps.
- Stream 3A addressed only asset-registration gaps for the 5 objects in A5's "Top 5" list. Correctly fixed staining_tray (-2 fallbacks). Marked p200_micropipette, micropipette, p10_micropipette as VERIFIED CLEAN (correct). Did not audit the remaining 8 asset-drift offenders. Its "all other objects are correctly wired" claim was unverified.

Post-3A state: 17 fallbacks remain (19 minus 2 staining_tray).

## Recommended fix workstreams

Stream 3B (asset registration follow-on, eliminates 8-9 fallbacks via YAML remap):

- vortex.yaml: vortex_idle and vortex_spinning to vortex
- microscope.yaml: microscope_dark and microscope_lit to microscope
- electrode_module.yaml: all four variants to electrode_module

Deferred (no clean remap target, awaiting user decision):

- ethanol_bottle.yaml: no SVG_ETHANOL_BOTTLE exists; needs new SVG or visual_states removal.
- hood_surface.yaml: no hood_surface SVGs at all; same choice.
- gel_cassette.yaml gel_lane_empty: may belong on gel adapter lane path.

Stream 3C (VISUAL_STATE_GAP decision):

Composite/overlay-only objects need either an svg base case for current runtime coverage, or formal deferral to a composite-render path.

## Status

DONE. Foundation analysis complete. Stream 3B and Stream 3C dispatchable independently.
