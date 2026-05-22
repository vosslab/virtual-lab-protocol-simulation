# Round 3 checkpoint: risk and review list

Workstream D artifact. Surfaces risks before the human commit/merge decision
for the Round 3 no-crop SVG work. READ-ONLY review of production; this file
is the only new artifact.

## Scope and baseline

Round 3 code changes are already committed in commits `c373a59`
(M1 no-crop reconciliation bundle), `d42c3f6`, and `a7ab89c`
(package.json refresh). The working tree at checkpoint time is small:
14 changed items, dominated by docs (CHANGELOG.md, active_plans
additions, stress_results notes). The big code surfaces
(`render_stress_to_html.py`, `object_footprints.yaml`,
`styles/bench.css`, `content/objects/bottle/conical_15ml.yaml`,
`content/objects/waste/sharps_container.yaml`, `src/asset_specs.ts`)
are tracked and currently clean in the working tree.

## Working tree summary

- 14 changed entries (per `git status --short`)
- Composition: 1 modified docs/CHANGELOG.md, multiple new
  `docs/active_plans/audits/no_crop_*.md` audit notes, decisions,
  next-fix queue, plus 5 modified `experiments/css_native_layout/
stress_results/*.md` and 2 modified archive docs.
- No tracked production code changes pending; this is a docs-and-notes
  checkpoint, not a code checkpoint.

## Caller-grep result for renamed assets

The "asset_name renames" in `content/objects/bottle/conical_15ml.yaml`
and `content/objects/waste/sharps_container.yaml` are already committed.
Both files are clean in the working tree, and both `object_name` values
(`conical_15ml`, `sharps_container`) are already established vocabulary
across the repo. Caller-string sweep (excludes `docs/`, `experiments/`,
and the YAML files themselves):

| asset name       | caller files | total references |
| ---------------- | ------------ | ---------------- |
| conical_15ml     | 13           | 34               |
| sharps_container | 1            | 4                |

`conical_15ml` callers (sample): `src/asset_specs.ts`, `src/svg_assets.ts`,
`src/scenes/cell_culture_hood/render.ts`, `src/scenes/cell_culture_hood/
cell_culture_hood.yaml`, `content/protocols/cell_culture/
passage_pellet_reseed/` (protocol + 2 scenes), `content/objects/bottle/
conical_tube_for_dilution.yaml`, `content/objects/rack/
conical_15ml_rack.yaml`, `assets/equipment/conical_15ml_rack.svg`,
`tests/content/dev_smoke/bench_direct_check/` (items + protocol),
`tests/test_svg_pipeline.mjs`.

`sharps_container` callers: `tests/test_object_validator_variant_collapse.py`
only.

No call sites name a stale pre-rename string (no orphans were surfaced by
the sweep). If the rename intent was to change the `object_name` field
itself, that change is already reflected in the YAML head and is the
established name across callers; no partial-rename inconsistency is
visible. Confirmation that the rename is semantically complete would
require knowing the prior identifier; the working tree shows no
mismatch.

## Risk table

| risk                                                                     | severity | trigger                                                                                                                                                                                       | mitigation                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/CHANGELOG.md rotation overdue                                       | HIGH     | wc -l reports 4044 lines; REPO_STYLE.md rotation threshold is ~1000 lines                                                                                                                     | Run `devel/rotate_changelog.py` to archive older day blocks into `docs/CHANGELOG-YYYY-MM[a-z].md`, keeping only the two most recent date headings active; do this before the next human commit so the rotation lands as its own reviewable change.               |
| Strategy C still leaves 59 combined crops (templates 21 + gold 38)       | HIGH     | Stress-sweep results in `experiments/css_native_layout/stress_results/` show non-zero crop counts after Strategy C; PRIMARY_DESIGN.md forbids cropped scientific assets in any rendered scene | Block declaring Strategy C "done"; treat 59 as the next-fix backlog. Feed counts into `docs/active_plans/no_crop_round3_next_fix_queue.md` so each crop has a triaged owner before any user-facing scene ships.                                                  |
| Placeholder SVGs flagged in asset_specs.ts (microwave, gel_opening_tool) | HIGH     | Exp 9 entries in `src/asset_specs.ts` are flagged as placeholder rather than measured; PRIMARY_DESIGN.md forbids cropped/unfinished scientific assets in rendered scenes                      | Do not enable scenes that depend on `microwave` or `gel_opening_tool` until a real SVG replaces each placeholder; gate them in the scene runtime or content launcher until measurement is added.                                                                 |
| Exp 9 entries are source-correct, not static-template-measurable         | MED      | The 7 new + 2 modified `asset_specs.ts` entries from Exp 9 are validated against source SVG geometry, not against the static-template renderer used by the stress sweep                       | Add a static-template measurement pass for the 9 entries, or document the divergence explicitly so a future agent does not "fix" the renderer to match wrong measurements. Track in next-fix queue.                                                              |
| render_stress_to_html.py was reconstructed (no prior baseline)           | MED      | The script was rewritten in commit `c373a59`; there is no prior tagged version to diff against for behavioral regression checks                                                               | Pin a known-good output snapshot (e.g., one rendered HTML per scene class) into `experiments/css_native_layout/stress_scenes/rendered/` and treat it as the reference for future stress sweeps. Re-render-and-diff is the regression test.                       |
| object_footprints.yaml is experiment-local, not production schema        | MED      | File header explicitly states "Experimental CSS-native visual-test mapping. Not production schema"; consumed only by `render_stress_to_html.py`                                               | Keep the file inside `experiments/css_native_layout/` and out of any production import path. If footprints become production vocabulary, route them through `docs/specs/SCENE_VOCABULARY.md` first per the Author YAML vocabulary lock; do not promote silently. |
| Walker evidence not part of this checkpoint                              | MED      | PRIMARY_CONTRACT.md item 4 requires browser screenshots for mini-protocol completion; this checkpoint reviews static stress-render output, not walker output                                  | Before declaring any Round 3 scene "complete", run the Playwright walker per docs/PLAYWRIGHT_USAGE.md and capture before/after screenshots through the visible UI. Static renderer evidence does not satisfy the contract.                                       |
| Two docs in archive/ are modified in working tree                        | LOW      | `docs/archive/css_native_layout/CSS_TRIAL_EXECUTION_SUMMARY.md` and `docs/archive/no_crop_svg/no_cropped_svg_round2_asset_resolution_experiment.md` show as modified                          | Confirm the edits are correction-only and not re-litigation of archived decisions. Archive is meant to be stable; if substantive, move the new content to an active artifact instead.                                                                            |
| 14-item working tree is largely undocumented in CHANGELOG                | LOW      | New audit/decision/queue files exist under `docs/active_plans/`, plus stress_results edits, but the active CHANGELOG.md must reflect user-visible or structural changes per REPO_STYLE.md     | Add a single dated CHANGELOG block summarizing the docs additions (audits, decisions, next-fix queue) and the stress-results updates, even if no production code shipped in the same window.                                                                     |

## High-severity count

3 HIGH-severity risks identified: CHANGELOG rotation overdue, 59 remaining
crops under Strategy C, placeholder SVGs for `microwave` and
`gel_opening_tool`.

## Suggested order before human commit

1. Rotate docs/CHANGELOG.md (HIGH; mechanical, isolated change).
2. Add a CHANGELOG entry for the doc additions in this checkpoint (LOW
   but fast).
3. Triage the 59 crops and the 2 placeholder SVGs into the next-fix
   queue with owners and severity before any scene-launcher exposure
   (HIGH).
4. Capture walker screenshot evidence for any Round 3 scene before
   marking the mini-protocol complete (MED, contractual).
5. Decide whether the two `docs/archive/` edits stay or revert (LOW).
