# Round 3 runtime mount-gap repair

Date: 2026-05-22
Owner: Round 3 pivot workstream R1 (runtime mount gap repair)
Inputs: [round3_runtime_truth_audit.md](round3_runtime_truth_audit.md) Finding 1
Bundle evidence: `test-results/round3_runtime_truth/runtime_truth_summary_v1_failed_picks.json`

## Summary

Three gold-listed scenes failed to mount in the production runtime path
(`file://dist/<protocol>.html` -> `runtime.bundle.js` -> `loadAndMountByProtocolName`)
because `inferInitialScene` raised `Cannot determine scene for target object
"<x>"` when the entry-step's first interaction target object was placed in many
scenes and no scene's `scene_name` started with `<protocol_name>_`.

Result of this workstream:

- electrophoresis_bench: FIXED (mounted via runtime, screenshot captured).
- staining_bench: FIXED (mounted via runtime, screenshot captured).
- cell_counter_workspace: DOCUMENTED ONLY (root cause is different; safe fix
  requires content authoring, see below).

Fix applied: one narrow change in `src/scene_runtime/loader/world.ts`
`inferInitialScene` to honor an explicit `SceneChange` operation in the entry
step's first interaction when its `to_scene` already appears among the
scenes that contain the target object. No content edits, no contract edits,
no vocabulary additions.

## Per-scene analysis

### Scene 1: electrophoresis_bench

- Expected scene/protocol entry: protocol `sdspage_assemble_electrode_module`,
  entry_step `open_wing_clamps`, first interaction target `electrode_module`.
  The entry step's first interaction declares
  `scene_operations: [{type: SceneChange, to_scene: electrophoresis_bench}, ...]`
  (`content/protocols/sdspage/sdspage_assemble_electrode_module/protocol.yaml`
  line 25-36).
- Actual catalog lookup path traced: `loadWorld`
  (`src/scene_runtime/loader/world.ts:407`) -> `inferInitialScene`
  (`src/scene_runtime/loader/world.ts:139`) -> `resolveSceneForTarget`
  (`src/scene_runtime/loader/world.ts:66`). `electrode_module` matched 8
  scenes (`electrophoresis_bench`, `extraction_workspace`,
  `sdspage_attach_lid_and_leads_workspace`, `sdspage_fill_tank_buffer_workspace`,
  `sdspage_load_sample_single_lane_workspace`,
  `sdspage_prepare_running_buffer_workspace`,
  `sdspage_recycle_buffer_workspace`, `sdspage_run_electrophoresis_workspace`).
  None started with prefix `sdspage_assemble_electrode_module_`. Resolver
  threw `Cannot determine scene for target object "electrode_module"`.
- Missing data identified: `inferInitialScene` did not consult the entry
  interaction's `scene_operations` list. The author's explicit `SceneChange`
  to `electrophoresis_bench` was already present in the YAML; the runtime
  was discarding that authored intent during initial-scene inference.
- Smallest fix proposed: extend `inferInitialScene` to inspect the entry
  step's first interaction `scene_operations` and, if a `SceneChange` whose
  `to_scene` is in the set of matching scenes is found, return that scene
  before falling back to `resolveSceneForTarget`. Single file
  (`src/scene_runtime/loader/world.ts`), single logical addition (~15 lines),
  no schema or vocabulary change.
- Applied? YES. The added branch runs strictly before the existing prefix
  resolver and only fires when `to_scene` is already one of the
  target-matching scenes, so it can never widen the set of acceptable
  scenes or introduce a new mount-target.
- Screenshot:
  `test-results/round3_runtime_truth/electrophoresis_bench_after_fix.png`

### Scene 2: staining_bench

- Expected scene/protocol entry: protocol `sdspage_destain_gel_setup`,
  entry_step `rinse_first`, first interaction target `staining_tray`.
  Its first interaction declares
  `scene_operations: [{type: SceneChange, to_scene: staining_bench}]`.
- Actual catalog lookup path traced: same path as Scene 1. `staining_tray`
  matched 4 scenes (`staining_bench`, `extraction_workspace`, `imaging_bench`,
  `sdspage_destain_gel_rock_workspace`). None started with prefix
  `sdspage_destain_gel_setup_`. Resolver threw the same ambiguity error.
- Missing data identified: identical to Scene 1 - the authored
  `SceneChange` to `staining_bench` was not consulted by
  `inferInitialScene`.
- Smallest fix proposed: same edit as Scene 1 (one branch in
  `inferInitialScene`).
- Applied? YES (one shared fix covers both Scene 1 and Scene 2).
- Screenshot:
  `test-results/round3_runtime_truth/staining_bench_after_fix.png`

### Scene 3: cell_counter_workspace

- Expected scene/protocol entry: protocol `trypan_blue_counting`,
  entry_step `add_trypan_blue_to_chamber`, first interaction target
  `micropipette`. The entry step's first interaction has NO `SceneChange`
  in its `scene_operations` (it only has a `CursorAttach`). A `SceneChange`
  to `cell_counter_workspace` exists later in the protocol (step
  `insert_slide_into_counter`, line 281-282), not in the entry step.
- Actual catalog lookup path traced: same code path. `micropipette` matched
  9 scenes including `cell_counter_workspace`, `dilution_workspace`,
  `drug_dilution_setup_bench_setup`, `mtt_reagent_prep_bench_workspace`,
  `mtt_solubilization_readout_bench_workspace`, `plate_workspace`,
  `sample_prep_bench`,
  `sdspage_prepare_sample_mix_single_lane_workspace`, `seeding_workspace`.
  None started with prefix `trypan_blue_counting_`. Even after this
  workstream's fix, no `SceneChange` is present on the entry interaction,
  so the resolver still throws.
- Missing data identified: this is a different class of gap. The protocol
  does not declare which scene it opens in, neither by an explicit entry
  `SceneChange` nor by a scene that uniquely contains its first target.
  `cell_counter_workspace` is not even the intended initial scene of
  `trypan_blue_counting`; runtime would transition there later via the
  step `insert_slide_into_counter`. The protocol's actual intended initial
  scene appears to be a hemocytometer / chamber-prep scene under
  `content/protocols/cell_culture/trypan_blue_counting/scenes/`
  (`hemocytometer_view.yaml`), but `micropipette` is not unique to that
  scene either.
- Smallest fix proposed (NOT APPLIED): two viable options, both require
  judgment beyond a single-line edit:
  1. Content fix: add an explicit `SceneChange` to the entry step's first
     interaction naming the intended initial scene
     (`hemocytometer_view` or equivalent). This author decision is not
     mechanical and changes step semantics (first click would advance the
     scene before any work is done).
  2. Content fix: rename one scene to match the protocol prefix
     (e.g. `trypan_blue_counting_hemocytometer_view`) so the
     `resolveSceneForTarget` prefix branch fires. This is a scene
     vocabulary rename that ripples through every `to_scene:` reference
     and is not safe within this workstream's "no broad scene YAML
     rewrites" boundary.
- Applied? NO. Both candidate fixes require author intent confirmation and
  exceed the "one file, one field" boundary for this workstream. The
  cell_counter_workspace failure is documented as a content gap, not a
  runtime gap.
- Screenshot path if applied: N/A. The post-fix screenshot
  (`test-results/round3_runtime_truth/cell_counter_workspace_after_fix.png`)
  was captured for evidence but shows the same `RUNTIME INITIALIZATION
  ERROR` page as before; it documents the unchanged failure, not a fix.

## The applied fix in context

Edit location: `src/scene_runtime/loader/world.ts`, function
`inferInitialScene`. After computing the set of `matchingScenes` for the
entry-step target object, before falling through to `resolveSceneForTarget`,
the function now scans `firstInteraction.response.scene_operations` for the
first `SceneChange` whose `to_scene` is already in `matchingScenes` and
returns it. The branch only narrows the existing candidate set; it can
never select a scene that was not already a valid scene for the target.

Rationale: the protocol vocabulary already supports `SceneChange` in
`scene_operations` (`docs/PRIMARY_SPEC.md` "Scene operations"); authoring
a `SceneChange` on the very first interaction is the documented way for
an author to declare "this protocol opens in scene X." The runtime was
simply not consulting that declaration during initial-scene inference.
No new field, no new operation type, no new author-facing vocabulary.

Build evidence:

- `bash build_github_pages.sh` -> exit 0
  (`dist/main.js` 2.3 MB rebuilt 2026-05-22).
- `bash pipeline/build_runtime_bundle.sh` -> exit 0
  (`dist/runtime.bundle.js` 2.6 MB rebuilt 2026-05-22).
- Per-protocol HTML rebuilt for all three protocols.
- Playwright driver `tests/playwright/_temp_runtime_mount_gap.mjs` loaded
  each protocol page and inspected `globalThis.__RUNTIME_PROTOCOL_CONFIG`.
  Results JSON:
  `test-results/round3_runtime_truth/runtime_mount_gap_repair_results.json`.

Runtime mount results after fix:

| Protocol | Expected scene | Mounted? | Notes |
| --- | --- | --- | --- |
| sdspage_assemble_electrode_module | electrophoresis_bench | YES | runtime now resolves via entry SceneChange |
| sdspage_destain_gel_setup | staining_bench | YES | runtime now resolves via entry SceneChange |
| trypan_blue_counting | cell_counter_workspace | NO | content gap, not entry-SceneChange disambiguable |

## Boundaries respected

- One source edit: `src/scene_runtime/loader/world.ts` `inferInitialScene`
  function, additive branch only.
- No edits to: `docs/PRIMARY_CONTRACT.md`, `docs/PRIMARY_SPEC.md`,
  `docs/PRIMARY_DESIGN.md`, `docs/specs/`, any `content/**/*.yaml`,
  `generated/`, layout engine, render pipeline, walker.
- No new vocabulary, no schema-version bump, no contract item added.
- No git commit, no `check_codebase.sh`, no broad pytest run.
- ASCII only throughout.

## Reproduce

```
bash build_github_pages.sh
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_assemble_electrode_module
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_destain_gel_setup
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol trypan_blue_counting
node tests/playwright/_temp_runtime_mount_gap.mjs
```

## Scenes fixed vs documented

- Fixed (scene mounts in production runtime after edit): 2
  (electrophoresis_bench, staining_bench).
- Documented only (root cause exceeds workstream boundary): 1
  (cell_counter_workspace).
