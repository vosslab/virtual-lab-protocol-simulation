# Round 3 protocol regression bisect (P3)

Date: 2026-05-22
Owner: P3 bisect pass (temporary reverts, no commits)
Plan ref: Round 3 pivot, P3 follow-up to R7 (clickWorks 0/4)
Artifacts: `test-results/round3_protocol_regression_bisect/` (per-trial
`build.log`, `smoke.log`, `summary.json`, and copied per-scene logs)
Source baseline: [round3_runtime_interaction_smoke.md](round3_runtime_interaction_smoke.md)

## Purpose

R7 reported `clickWorks = 0/4` across the four runtime-mounted scenes. Four
in-flight working-tree changes (R3, R3-alt, R2-alt, R1) were candidates for
the regression. This bisect tests whether reverting each candidate one at a
time restores clickWorks, and if so, which one.

## Method

For each candidate, the candidate file(s) were reverted to `HEAD` via
`git checkout HEAD -- <path>` while leaving the other three candidates
in their working-tree state. A backup of the working-tree version was
saved under `_temp_bisect_backups/` so the file could be restored before
moving on to the next trial.

For every trial the run was:

1. `bash build_github_pages.sh` (typecheck + esbuild bundle).
2. `bash pipeline/build_runtime_bundle.sh` (runtime bundle).
3. `python3 pipeline/build_protocol_html.py --protocol <p>` for each of
   the four protocols (`mtt_reagent_prep`,
   `mtt_solubilization_readout`, `sdspage_attach_lid_and_leads`,
   `sdspage_heat_denature_samples`).
4. `node tests/playwright/_temp_round3_interaction_smoke.mjs`.
5. Copy `summary.json` and per-scene logs into the trial folder.

The smoke driver is unmodified from R7. No `git commit`, no `git stash`,
no production-source edits outside the four candidate files.

## Per-trial results

| Trial | Reverted file(s) | Build | Mount (wrongTarget pass / 4) | clickWorks pass / 4 | Console errors total | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | none (all candidates present) | OK | 4 / 4 | 0 / 4 | 0 | Reproduces R7 verbatim. |
| trial1 | `src/scene_runtime/render/scene.ts` (R3 font-size clamp) | OK | 4 / 4 | 0 / 4 | 0 | No change in clickWorks. |
| trial2 | `src/scene_runtime/chrome/style.css` + `pipeline/build_protocol_html.py` (R3-alt halo CSS) | OK | 4 / 4 | 0 / 4 | 0 | No change in clickWorks. |
| trial3 | `src/scene_runtime/adapters/well_plate/render.ts` (R2-alt composite render) | OK | 4 / 4 | 0 / 4 | 0 | No change in clickWorks. |
| trial4 | `src/scene_runtime/loader/world.ts` (R1 inferInitialScene) | OK | 4 / 4 | 0 / 4 | 0 | Mounts survived the revert; expected mount break did not occur in this smoke. |

Per-trial scene-level results were identical across all five rows
(baseline + four trials): each of the four scenes reports
`clickWorks = fail`, `wrongTarget = pass`, and 0 console errors. The
DOM-delta values were stable across trials as well (`+1`, `+6`, `+0`,
`+1` for the four scenes respectively in baseline, trial1, trial2, and
trial4; trial3 matched within +/- 0 nodes per scene).

## Synthesis

No single candidate revert restored advance. Reverting all four
candidates one at a time leaves clickWorks at 0/4 with the same per-scene
failure profile that R7 reported. The clickWorks regression is therefore
NOT caused by any of the four in-flight working-tree changes (R3, R3-alt,
R2-alt, R1).

Ranked, in the sense of "which revert moved the needle":

1. trial1 (R3 scene.ts) -- no effect on clickWorks.
2. trial2 (R3-alt halo CSS) -- no effect on clickWorks.
3. trial3 (R2-alt well_plate render) -- no effect on clickWorks.
4. trial4 (R1 world.ts inferInitialScene) -- no effect on clickWorks; the
   anticipated mount-break did not appear (the four target scenes still
   mounted, wrongTarget still passed).

Conclusion: the regression has a shared / older root cause that predates
the four candidate edits. Likely venues to inspect next (out of scope
here, recorded for the next bisect step):

- The interaction dispatch path between `data-target-id` click handlers
  and the protocol state machine (`activeStepIndex` / `activeSceneId` /
  `world.objects[*].state`). All four scenes accept clicks but do not
  advance state, suggesting the click-to-validator wire is the suspect
  surface, not the visual fixes audited here.
- `scene-chrome` pointer-events stacking on
  `sdspage_heat_denature_samples_workspace` (called out in R7) is a
  separate chrome-layer issue and is also unaffected by the four
  candidate reverts.
- Older commits that touched the runtime interaction dispatch (predating
  the current working-tree set) are the next bisect candidates.

## Reproduce

```
# For each trial, replace <file> with the candidate path and <label> with
# the trial label, then:
git checkout HEAD -- <file>
bash _temp_bisect_trial.sh <label>
cp _temp_bisect_backups/<file>.current <file>
```

`_temp_bisect_trial.sh` orchestrates build + smoke + summary copy.

## Boundaries respected

- No `git commit`. No `git stash`. No `git mv`.
- All five candidate files restored to their pre-task working-tree state
  at end of run (verified via `git diff --stat`: 5 files, 133 insertions
  total, matching the start-of-task snapshot).
- Edits only to: `test-results/round3_protocol_regression_bisect/`,
  this report, `_temp_bisect_trial.sh` (temp, safe to delete),
  `_temp_bisect_backups/` (temp, safe to delete).
- ASCII only.
