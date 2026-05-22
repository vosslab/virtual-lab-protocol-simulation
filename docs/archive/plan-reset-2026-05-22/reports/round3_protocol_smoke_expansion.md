# Round 3 protocol smoke expansion (P5)

Date: 2026-05-22
Owner: Round 3 P5 (scene-specific smoke expansion, read-only)
Plan ref: Round 3 pivot, follow-on to R7 (round3_runtime_interaction_smoke.md)
and R1 (round3_runtime_mount_gap_repair.md)
Artifacts: `test-results/round3_protocol_smoke_expansion/` (11 per-scene `.log`
files + `summary.json`)

## Purpose

R7 tested 4 protocols. P5 widens the smoke coverage to 11 mounted protocols
covering 9 distinct target scenes, to separate global click-path regressions
from scene-specific defects.

## Method

Driver: `tests/playwright/_temp_round3_protocol_smoke_expansion.mjs` (adapted
from R7's `_temp_round3_interaction_smoke.mjs`; same probe shape and same
`globalThis.__RUNTIME_PROTOCOL_CONFIG` snapshot path). For each protocol:

- mountSuccess: `__RUNTIME_PROTOCOL_CONFIG` present after 3.5 s.
- clickWorks: click step 0 first target; pass if `activeStepIndex`,
  `activeSceneId`, or any `world.objects[*].state` snapshot diffs.
- wrongTargetHandling: click an off-target `data-target-id`; pass if runtime
  config still present and no fatal page error.
- ObjectStateChange: forward-scan steps; click the first `ObjectStateChange`
  op's `target`; pass if `world.objects` snapshot diffs.
- Console errors: count of `pageerror` + `console.error` events.
- DOM growth: `document.querySelectorAll("*").length` before vs after.

Build: `bash pipeline/build_runtime_bundle.sh` + per-protocol
`python3 pipeline/build_protocol_html.py --protocol <name>` for all 11 names.
No edits under `src/`, `generated/`, `content/`, `pipeline/`, `docs/specs/`,
or `docs/PRIMARY_*`.

## Scenes tested

| Protocol -> target scene | mountSuccess | clickWorks | wrongTargetHandling | ObjectStateChange | Console errors | DOM delta (before -> after) |
| --- | --- | --- | --- | --- | --- | --- |
| `mtt_reagent_prep` -> `mtt_reagent_prep_bench_workspace` | yes | no | yes | untested | 0 | 121 -> 122 (+1) |
| `mtt_solubilization_readout` -> `mtt_solubilization_readout_bench_workspace` | yes | no | yes | no | 0 | 352 -> 358 (+6) |
| `sdspage_attach_lid_and_leads` -> `sdspage_attach_lid_and_leads_workspace` | yes | no | yes | no | 0 | 359 -> 359 (+0) |
| `sdspage_heat_denature_samples` -> `sdspage_heat_denature_samples_workspace` | yes | no | yes | no | 0 | 114 -> 115 (+1) |
| `sdspage_assemble_electrode_module` -> `electrophoresis_bench` | yes | no | yes | no | 0 | 359 -> 360 (+1) |
| `sdspage_destain_gel_setup` -> `staining_bench` | yes | no | yes | no | 0 | 289 -> 289 (+0) |
| `sdspage_prepare_running_buffer` -> `sdspage_prepare_running_buffer_workspace` | yes | no | yes | no | 0 | 359 -> 365 (+6) |
| `sdspage_load_protein_ladder` -> `electrophoresis_bench` | yes | no | yes | untested | 0 | 359 -> 360 (+1) |
| `sdspage_image_gel` -> `imaging_bench` | yes | no | yes | no | 0 | 31 -> 31 (+0) |
| `mtt_plate_reaction` -> `incubator_workspace` | yes | no | yes | untested | 0 | 499 -> 499 (+0) |
| `passage_pellet_reseed` -> `hood_workspace` | yes | no | yes | no | 0 | 385 -> 386 (+1) |

Per-column tally (11 protocols / 9 distinct target scenes):

- mountSuccess: 11 yes, 0 no.
- clickWorks: 0 yes, 11 no.
- wrongTargetHandling: 11 yes, 0 no.
- ObjectStateChange: 0 yes, 8 no, 3 untested.
- Console errors: 0 across all 11 protocols (sum = 0).
- DOM delta range: +0 to +6 nodes. No runaway growth.

Distinct target scenes covered: `mtt_reagent_prep_bench_workspace`,
`mtt_solubilization_readout_bench_workspace`,
`sdspage_attach_lid_and_leads_workspace`,
`sdspage_heat_denature_samples_workspace`, `electrophoresis_bench`,
`staining_bench`, `sdspage_prepare_running_buffer_workspace`, `imaging_bench`,
`incubator_workspace`, `hood_workspace`. Ten unique scenes across the 11
runs (`electrophoresis_bench` appears for two protocols).

## Failure mode categorization

P5 rules in the global category and rules out the two scene-specific
categories considered in R7.

### Global click path failure: CONFIRMED

clickWorks fails identically on all 11 protocols and all 10 distinct target
scenes. Across protocols spanning four content clusters (`mtt_*`, `sdspage_*`,
`passage_*`, the R1-fixed `electrophoresis_bench` and `staining_bench`
landings) the behavior is the same:

- Mount succeeds, `activeSceneId` and `firstTarget` are set, the
  `data-target-id` element exists in the DOM and is clickable.
- The click is dispatched (a small DOM delta of +1 to +6 is frequently
  observed, indicating chrome / feedback nodes were appended).
- Neither `activeStepIndex`, `activeSceneId`, nor any `world.objects[*].state`
  snapshot surfaced through `__RUNTIME_PROTOCOL_CONFIG` changes.
- Zero console errors are emitted.

The same shape repeats whether the step 0 target carries a `SceneChange`
(`sdspage_assemble_electrode_module` already routes through R1's entry-
SceneChange branch), an `ObjectStateChange` (`sdspage_attach_lid_and_leads`,
`sdspage_heat_denature_samples`), or only a `CursorAttach`
(`mtt_reagent_prep`). The protocol-state runtime does not advance from
a click on the active step's first target, regardless of operation kind.

This is consistent with R7's interpretation that "click -> state transition
is not visibly wired through the surfaced runtime config" and lifts that
finding from 4 / 4 to 11 / 11.

### Scene-specific pointer intercept: NOT REPRODUCED ON THIS PASS

R7 reported that on `sdspage_heat_denature_samples_workspace` the
`scene-chrome` div intercepted pointer events at the `heat_block` screen
position, causing a 4 s click timeout. After rebuilding the runtime bundle
and per-protocol HTML for this run, the same click resolved without a
timeout (no `intercepts pointer events` error, no `Timeout` exception in the
log), but still did not advance protocol state. The intercept may have been
a transient stack-order artifact during R7's run, or may depend on a
DOM-mutation timing window that this re-run did not hit. Either way, the
intercept-style failure is not currently the dominant failure shape; the
global click-path failure (above) is.

No other scene in the 11-run set exhibited a pointer-intercept-style
exception during this pass.

### Protocol fixture issue (target name absent in scene): NOT OBSERVED

Every protocol's step 0 `firstTarget` was present in the DOM at click time
(no `selector not present in DOM` log line on any of the 11 runs). The
runtime is wiring the authored target name through to a real
`[data-target-id]` element in every case. Fixture-level mismatches between
the protocol target names and the rendered scene's clickables are not the
cause of the clickWorks=no rows.

## Top 3 worst scenes

All 11 protocols share the same failure rank on the primary metric
(clickWorks=no, OSC=no/untested). Among them, three rows show the smallest
DOM response, suggesting the click is receiving the least visible scene
acknowledgment:

1. `sdspage_image_gel` -> `imaging_bench`: DOM delta +0 nodes; mounted DOM
   total is only 31 nodes, the smallest in the set. Combined with `OSC=no`
   the scene appears to be the most under-rendered of the mounted set: the
   clickable exists and is hit, but the scene produces neither a state
   advance nor a chrome / feedback DOM update.
2. `sdspage_attach_lid_and_leads` -> `sdspage_attach_lid_and_leads_workspace`:
   DOM delta +0 nodes despite a 359-node scene. Click on
   `electrophoresis_tank` produces no observable response in either state
   or DOM. R7's parallel observation is preserved here.
3. `sdspage_destain_gel_setup` -> `staining_bench`: DOM delta +0 nodes on a
   289-node scene. The R1-fixed mount works, but the click on
   `staining_tray` produces no response. This is the most concerning of the
   R1-newly-mounted pair (the other, `electrophoresis_bench`, at least
   produces +1 DOM node).

`mtt_plate_reaction` (DOM delta +0, OSC untested) is a close fourth on the
same axis.

## Interpretation

The R7 finding generalises: the visible click -> protocol-state path is
broken at the runtime level, not at the scene-author or scene-mount level.
Eight of the 11 protocols carry an `ObjectStateChange` operation reachable
from step 0 in the protocol YAML, and every one of those eight clicks
produces no observable diff in the surfaced `world.objects[*].state`
snapshot. The behavior is independent of the target's `gesture` family, the
scene's complexity (31 nodes -> 499 nodes), the content cluster, and
whether R1's entry-`SceneChange` branch was used to choose the initial
scene.

Caveats unchanged from R7: clickWorks only sees a "pass" via the
`__RUNTIME_PROTOCOL_CONFIG`-surfaced fields; the runtime may mutate state
through another channel not visible to this probe. The DOM-delta column
distinguishes scenes that at least produce visible feedback chrome (most
rows, +1 to +6) from the three above that produce nothing.

## Reproduce

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh
python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
python3 pipeline/build_protocol_html.py --protocol mtt_solubilization_readout
python3 pipeline/build_protocol_html.py --protocol sdspage_attach_lid_and_leads
python3 pipeline/build_protocol_html.py --protocol sdspage_heat_denature_samples
python3 pipeline/build_protocol_html.py --protocol sdspage_assemble_electrode_module
python3 pipeline/build_protocol_html.py --protocol sdspage_destain_gel_setup
python3 pipeline/build_protocol_html.py --protocol sdspage_prepare_running_buffer
python3 pipeline/build_protocol_html.py --protocol sdspage_load_protein_ladder
python3 pipeline/build_protocol_html.py --protocol sdspage_image_gel
python3 pipeline/build_protocol_html.py --protocol mtt_plate_reaction
python3 pipeline/build_protocol_html.py --protocol passage_pellet_reseed
node tests/playwright/_temp_round3_protocol_smoke_expansion.mjs
```

Outputs:

- `test-results/round3_protocol_smoke_expansion/<protocol>.log` (11 files)
- `test-results/round3_protocol_smoke_expansion/summary.json`

## Boundaries respected

- Read-only on production source. Edits only to:
  `tests/playwright/_temp_round3_protocol_smoke_expansion.mjs` (temp driver,
  underscore-prefixed, safe to delete),
  `test-results/round3_protocol_smoke_expansion/`, this report.
- No edits under `src/`, `generated/`, `content/`, `pipeline/`,
  `docs/specs/`, or `docs/PRIMARY_*`.
- No git commit, no contract change, no vocabulary addition.
- ASCII only.
