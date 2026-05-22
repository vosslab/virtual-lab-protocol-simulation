# Round 3 R10: cell_counter_workspace SceneChange add

Date: 2026-05-22

## Protocol path

`content/protocols/cell_culture/trypan_blue_counting/protocol.yaml`

## Problem

R1-alt surfaced that the entry_step `add_trypan_blue_to_chamber` had a first
interaction on `micropipette` with only a `CursorAttach` scene operation. The
runtime loader `inferInitialScene` could not disambiguate which scene to
mount because `micropipette` is placed in 9 scenes (including
`cell_counter_workspace`, `dilution_workspace`, `plate_workspace`, and others)
and none used the protocol-name prefix `trypan_blue_counting_`. Mount failed
with `Cannot determine scene for target object "micropipette"`.

## Before/after YAML snippet

Before (entry_step first interaction):

```yaml
- target: micropipette
  gesture: click
  validator:
    preset: correct_target
  response:
    scene_operations:
      - type: CursorAttach
        target: micropipette
        operation: attach
```

After (SceneChange added as the FIRST scene_operation; CursorAttach preserved
after it):

```yaml
- target: micropipette
  gesture: click
  validator:
    preset: correct_target
  response:
    scene_operations:
      - type: SceneChange
        to_scene: cell_counter_workspace
      - type: CursorAttach
        target: micropipette
        operation: attach
```

Contract compliance: `SceneChange` is one of the 5 ratified `scene_operation`
primitives listed in `docs/PRIMARY_SPEC.md` (Scene operations section);
`CursorAttach` is also ratified. Order preserved per task: SceneChange first,
CursorAttach second.

The `inferInitialScene` function in `src/scene_runtime/loader/world.ts` (added
2026-05-22 round 3 repair) explicitly honors an entry-step first-interaction
`SceneChange.to_scene` when it appears in the matching-scenes list for the
target, which resolves the ambiguity at load time without any runtime click.

## Build pass

YES. `bash build_github_pages.sh` reports `dist/main.js 2.3mb` and exits 0
after `bash pipeline/build_protocol_data.py` regenerates
`generated/protocol_data.ts`.

## Mount-success

YES. Walker output:

```
final runtime: {"activeSceneId":"cell_counter_workspace","mounted":true}
MOUNT_SUCCESS: true
```

The runtime reports `__RUNTIME_PROTOCOL_CONFIG.world.activeSceneId =
cell_counter_workspace` immediately after `loadAndMountByProtocolName`
completes, confirming the explicit-SceneChange disambiguation path fires
during `loadWorld`.

## Screenshot path

`test-results/round3_runtime_truth/cell_counter_workspace_after_scenechange.png`
