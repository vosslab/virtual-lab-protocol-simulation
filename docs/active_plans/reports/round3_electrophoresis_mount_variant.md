# Round 3 R1-ALT: electrophoresis_bench mount gap deep dive

Date: 2026-05-22
Owner: R1-ALT (competing-path agent; electrophoresis_bench-only focus)
Peer: R1 (works all three failed scenes)
Plan ref: Round 3 mount-gap repair, A1 audit follow-up
Artifacts: `test-results/round3_runtime_truth/electrophoresis_bench_mounted.png`,
`test-results/round3_runtime_truth/electrophoresis_mount_variant.json`

## Trace of original mount failure

Source location (current head): `src/scene_runtime/loader/world.ts`

- `loadWorld` (line 426) calls `inferInitialScene` (line 535) to resolve the
  protocol's initial scene from its `entry_step` first interaction target.
- `inferInitialScene` (line 139) extracts `objectName = getBaseObjectName(firstTarget)`,
  builds a local `matchingScenes[]` of every scene whose placements contain that
  object (lines 171-186), then delegates to `resolveSceneForTarget` (line 66).
- `resolveSceneForTarget` returns the unique match if there is exactly one,
  otherwise prefers a scene whose name starts with `protocol_name + "_"`,
  otherwise throws `Cannot determine scene for target object "<x>". Matching
  scenes: ...` (line 119-123).

Original failure path for `sdspage_assemble_electrode_module`:

- `entry_step = open_wing_clamps`, first interaction `target = electrode_module`.
- `electrode_module` is placed in 8 scenes: `electrophoresis_bench`,
  `extraction_workspace`, `sdspage_attach_lid_and_leads_workspace`,
  `sdspage_fill_tank_buffer_workspace`, `sdspage_load_sample_single_lane_workspace`,
  `sdspage_prepare_running_buffer_workspace`, `sdspage_recycle_buffer_workspace`,
  `sdspage_run_electrophoresis_workspace`.
- None starts with `sdspage_assemble_electrode_module_`, so the prefix rule does
  not pick a unique scene. `resolveSceneForTarget` throws.
- Failure was recorded in
  `test-results/round3_runtime_truth/runtime_truth_summary_v1_failed_picks.json`
  (V1 audit run).

Current head already carries the fix (`src/scene_runtime/loader/world.ts:188-205`,
dated 2026-05-22): explicit-SceneChange disambiguation. Before the resolver call,
`inferInitialScene` scans the first interaction's `response.scene_operations` for
a `SceneChange` whose `to_scene` is among the local `matchingScenes`, and if
present, returns that scene. The `sdspage_assemble_electrode_module` first
interaction declares `SceneChange to_scene: electrophoresis_bench` (see
`content/protocols/sdspage/sdspage_assemble_electrode_module/protocol.yaml:31-32`),
and `electrophoresis_bench` is in `matchingScenes`, so the resolver is bypassed
and the scene mounts.

## Two approaches considered

### A. TypeScript-side disambiguation rule (already implemented at head)

Shape: In `inferInitialScene`, before falling back to `resolveSceneForTarget`,
inspect the first interaction's `response.scene_operations` for a `SceneChange`
whose `to_scene` is among the local `matchingScenes`. Return that scene if
found.

Blast radius:

- Pure additive code path inside `inferInitialScene` (one file, ~18 lines).
- No change to existing resolver semantics; the prefix rule and unique-match
  rule still run for protocols without an entry `SceneChange`.
- No content edits, no schema changes, no walker changes.
- Touches NO contract concerns: PRIMARY_CONTRACT.md and PRIMARY_SPEC.md state
  that the initial scene is inferred from the entry-step interaction; honoring
  an authored `SceneChange` in that same interaction is consistent with the
  "scene adapter resolves target names" wording in PRIMARY_SPEC.md "Entry step".

### B. Content-side disambiguation

Shape: Either add an explicit per-protocol scene anchor (rejected by spec;
PRIMARY_SPEC.md "Entry step" forbids a protocol-level scene field), or rename
the entry-step target so that it is unique to one scene (e.g. `electrode_module`
becomes a subpart of the tank: `electrophoresis_tank.electrode_module`).

Blast radius:

- Per-protocol YAML edits in all 8+ protocols that reference `electrode_module`
  (rename ripples through every scene placement, object definition, every
  validator, every step using the target).
- Object catalog edit: `content/objects/equipment/electrode_module.yaml` and
  every scene placement that names it.
- Walker behavior risk: targets that used to address the module directly now
  require a subpart suffix; any test, generated registry, or walker code that
  looks up `electrode_module` as a bare object name breaks.
- Touches a contract-adjacent surface: PRIMARY_SPEC.md "Targets and the scene
  boundary" says targets are named, not positional, and subparts are listed
  explicitly. Renaming a top-level object to a subpart of another object would
  reshape the object graph for one disambiguation case.

## Picked approach

Approach A (TypeScript-side SceneChange disambiguation) is the lower-risk fix
and is already in `src/scene_runtime/loader/world.ts` at head (lines 188-205,
inline comment "Round 3 runtime-mount-gap repair (2026-05-22)"). No additional
TypeScript or content edit is required for `electrophoresis_bench`.

## Applied: no (no new code edit; verified existing fix at head)

The fix was committed prior to this R1-ALT pass. This run rebuilt the dist
bundle and the per-protocol HTML, then verified the mount completes without
runtime errors.

## Verification

Steps:

```
bash build_github_pages.sh
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --all
node tests/playwright/_temp_electrophoresis_mount.mjs
node tests/playwright/_temp_three_mount_check.mjs
```

Result (`electrophoresis_mount_variant.json`):

- `protocol`: `sdspage_assemble_electrode_module`
- `target_scene`: `electrophoresis_bench`
- `runtime.mounted`: `true`
- `console_errors`: `[]`
- `screenshot`: `test-results/round3_runtime_truth/electrophoresis_bench_mounted.png`

Mount succeeds at head with zero runtime errors.

## Screenshot path

`/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/round3_runtime_truth/electrophoresis_bench_mounted.png`

## Residual issues for staining_bench and cell_counter_workspace

Sibling check via `_temp_three_mount_check.mjs` (all three previously-failing
protocols rebuilt at head):

| Protocol                          | Target scene             | Mount? | Has entry SceneChange? |
| --------------------------------- | ------------------------ | ------ | ---------------------- |
| `sdspage_assemble_electrode_module` | `electrophoresis_bench`   | YES    | YES (line 31-32)        |
| `sdspage_destain_gel_setup`         | `staining_bench`          | YES    | YES (line 31-32)        |
| `trypan_blue_counting`              | `cell_counter_workspace`  | NO     | NO                      |

Shared root cause? Partially. All three trace to the same ambiguity in
`inferInitialScene`: the entry-step target exists in many scenes and the
protocol name does not prefix-match any of them. The current TS fix (Approach
A) closes the gap for the two protocols whose first interaction declares an
explicit `SceneChange` to the intended scene; it cannot help a protocol whose
first interaction has no `SceneChange`.

Different residual cause for `trypan_blue_counting`:
`content/protocols/cell_culture/trypan_blue_counting/protocol.yaml` step
`add_trypan_blue_to_chamber` begins with `target: micropipette` and a
`response.scene_operations` list whose first entry is `CursorAttach`, not a
`SceneChange`. `micropipette` is placed in 9 scenes (none prefixed
`trypan_blue_counting_`). The TS disambiguation rule never fires; the resolver
throws. Closing this gap is outside the electrophoresis_bench focus; options
for the peer R1 agent:

- B1. Add a `SceneChange to_scene: cell_counter_workspace` to the first
  interaction of `add_trypan_blue_to_chamber` (content-side, single-file edit,
  consistent with how `sdspage_destain_gel_setup` and
  `sdspage_assemble_electrode_module` declare their initial scene).
- B2. Reorder the entry interaction so a target unique to
  `cell_counter_workspace` is clicked first (e.g. start with the cell counter
  instrument target rather than the micropipette).
- B3. Extend Approach A to look forward through the step chain for the first
  `SceneChange` of any later interaction in the entry step, not only the first
  interaction. Larger blast radius and weakens the "first interaction names the
  initial scene's target" intent in PRIMARY_SPEC.md "Entry step", so B1 or B2
  is preferred.

## Boundaries respected

- No edits to PRIMARY_CONTRACT.md, PRIMARY_SPEC.md, PRIMARY_DESIGN.md.
- ASCII only.
- No git commits.
- No `src/scene_runtime/` edits (the existing fix at head is the picked
  approach).
- Temp drivers under `tests/playwright/` use the `_temp_` prefix and are safe to
  delete.
