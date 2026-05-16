> **Predecessor:** dream-YAML reauthoring plan (landed; not separately tracked -- it lived only in the `sorted-snacking-kettle.md` scratch file).
>
> **Scratch source:** `~/.claude/plans/sorted-snacking-kettle.md` (drafting only; do not edit further -- all updates go to this repo-tracked file).

# Plan: YAML cleanup gate before SDS-PAGE expansion or TypeScript runtime

## Context

Two verification gates relevant to this plan:

- `tools/validate_content_yaml.py` (syntax) -- 88 files, 0 failures
- `tools/protocol_stepper.py` (semantic flow) -- 12/12 protocols exit 0, but
  emit **478 WARNING findings**, all of class `unknown_target_active_scene`,
  clustered in 8 of 12 protocols

User flags that "some of these warnings are more concerning than just
warnings." They are correct: the 478-warning bucket conflates a known spec
gap (architect-owned `docs/active_plans/scene_adapter_resolution_design.md`)
with real authoring bugs that the spec change will NOT silence. Until those
are separated, the warning stream is noise authors will learn to ignore.
WARNINGs that live forever become rot (per `docs/REPO_STYLE.md` long-term
over short-term).

This plan is the YAML cleanup gate that runs **before** either of the two
candidate next moves (SDS-PAGE vocabulary expansion or TypeScript runtime
pilot). The existing scene-adapter design plan already names this trigger
explicitly: "before the next scene-introducing protocol expansion".
TypeScript runtime equally demands a clean semantic baseline -- a runtime
built against 478 noise warnings inherits the noise.

**Predecessor plan.** The M1-M3 dream-YAML content reauthoring plan
(previously drafted in this same scratch file `sorted-snacking-kettle.md`)
has landed. That work created the 10 mini-protocols + 2 sequence runners
and the verification gates this plan now uses. This cleanup gate is a
distinct task, not an amendment.

**Plan file location.** This draft lives at
`~/.claude/plans/sorted-snacking-kettle.md` as a planning scratch file.
Patch 0 (first action of M1) creates the repo-tracked active plan at
`docs/active_plans/yaml_cleanup_gate.md` by copying this draft and adding
a "Predecessor: dream-YAML reauthoring plan (landed)" cross-reference at
the top. All subsequent patches edit the repo-tracked file, not this
scratch.

## Objectives

- Triage all 478 stepper warnings into severity buckets: **spec-gap**
  (consumed by architect plan), **authoring-bug** (real protocol error),
  **stepper-gap** (stepper false positive), with concrete counts per
  bucket.
- Close the architect-owned `scene_adapter_resolution_design.md` plan to
  ratify the canonical scene-adapter resolution algorithm, then re-promote
  stepper checks from WARNING back to ERROR within this plan (no separate
  follow-on plan -- see anti-sprawl note in Scope).
- Fix every authoring-bug-class warning that survives the spec change.
- Exit gate: **validator exits 0; stepper exits 0 with 0 ERRORs and 0
  unresolved WARNINGs on all 12 protocols.** A warning class is
  "unresolved" if it is still emitted at WARNING severity after this
  plan. Every surviving class is resolved by being promoted to ERROR,
  demoted to a documented INFO class with a written rationale, or
  removed entirely. WARNING is not a terminal state.
- Land cleanup before any work on SDS-PAGE vocabulary expansion or the
  TypeScript runtime pilot.

## Design philosophy

Severity-tiered, design-fix-not-symptom. Trade-off accepted: this plan
delays both SDS-PAGE and TypeScript runtime by the duration of the
cleanup pass, in exchange for a clean stepper baseline that prevents
478-warning rot from becoming permanent and prevents the TypeScript
runtime from being designed against unverified semantic flow.
Alternative rejected: ship SDS-PAGE or TS first and "clean up later."
That path lets warnings ossify (per `docs/REPO_STYLE.md` core
philosophies) and the runtime would have no oracle since the stepper
output would already be contaminated. Cite `REPO_STYLE.md` long-term
over short-term and fix-the-design-not-the-symptom.

## Scope

- Triage and fix, reclassify, or document as INFO for all 478 stepper
  warnings.
- Close-out of `docs/active_plans/scene_adapter_resolution_design.md` (the
  spec ratification half).
- Stepper code patch that re-promotes the demoted check level. Folded
  into this plan (see WS-STEPPER) rather than spawning a separate plan
  file -- ownership is the same crew, scope is one file, no architectural
  daylight requires a separate plan. Anti-sprawl rule per user feedback.
- Update `docs/CHANGELOG.md` per patch.

## Non-goals

- SDS-PAGE, electrophoresis, chromatography vocabulary expansion. (Gated
  by this plan's exit.)
- TypeScript runtime work under `src/scene_runtime/`. (Gated by this
  plan's exit.)
- New scene-operation primitives. (Five ratified set is unchanged.)
- New gestures. (Closed set is unchanged.)
- SVG asset edits.
- Pedagogy bug fixes from manual-renderer output. The pedagogy gate
  (`tools/protocol_manual.py` + reviewer prose pass) is tracked
  separately; per user direction, this plan stays scoped to stepper
  warnings.
- Renderer template enhancements -- tool-side tech debt, filed
  separately.
- Validator new checks (e.g. `display_color` per
  `docs/active_plans/validator_display_color_check.md`) -- that side task
  stays separate.

## Current state summary

Source: stepper + validator dry-runs as of today.

| Gate | Status | Findings to close |
| --- | --- | --- |
| Static YAML validator | 0 failures across 88 files | 0 |
| Stepper semantic | 12/12 exit 0; 478 WARNINGs | 478 to triage |

Warning class distribution (single class):

- `unknown_target_active_scene`: 478 (100%)

Per-protocol warning counts (descending):

| Protocol | Warnings | Status |
| --- | --- | --- |
| `cell_culture_full` (sequence runner) | 234 | dirty |
| `mtt_solubilization_readout` | 193 | dirty |
| `trypan_blue_counting` | 18 | dirty |
| `mtt_plate_reaction` | 12 | dirty |
| `cell_seeding_plate_setup` | 10 | dirty |
| `plate_drug_treatment_drug_addition` | 8 | dirty |
| `passage_pellet_reseed` | 2 | dirty |
| `drug_dilution_setup` | 1 | dirty |
| `mtt_reagent_prep` | 0 | clean |
| `plate_drug_treatment_media_adjustment` | 0 | clean |
| `passage_hood_detachment` | 0 | clean |
| `routine_passage` (sequence runner) | 0 | clean |

Note: `cell_culture_full` stitches 10 minis, so its 234 likely double-counts
warnings from constituent minis after they fire in stepped runner context.
Triage must dedupe.

## Architecture boundaries and ownership

| Boundary | Owner | Touch rule |
| --- | --- | --- |
| Spec ratification (scene-adapter resolution algorithm) | architect (WS-SPEC-SCENE) | Edits `docs/specs/SCENE_VOCABULARY.md` + `docs/specs/PROTOCOL_YAML_FORMAT.md` only |
| Spec ratification (subpart addressing, structured grids only) | architect (WS-SPEC-SUBPART) | Edits `docs/specs/OBJECT_YAML_FORMAT.md` only |
| Stepper code (demote -&gt; promote check level) | tooling author | Edits `tools/stepper/state.py` per WS-STEPPER |
| Content authoring fixes | protocol author | Edits `content/protocols/<name>/protocol.yaml` and `content/protocols/<name>/scenes/<scene>.yaml` per residual S1 and S0b fix list |
| Triage report | planner | Writes `docs/active_plans/yaml_cleanup_triage.md` with bucket counts; Patch 2e re-classifies per S0a/S0b split |

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-INIT | promote draft to repo-tracked plan | 1 (Patch 0) |
| M1 / WS-TRIAGE | triage report at `docs/active_plans/yaml_cleanup_triage.md` | 1 |
| M1 / WS-SPEC-SCENE | scene-adapter spec amendment (architect plan close-out) | 1 to 2 (Patch 2 memo + Patch 2a amend) |
| M1 / WS-SPEC-SUBPART | subpart-addressing spec amendment (structured grids only) | 1 to 2 (Patch 2b memo + Patch 2d amend) |
| M1 / (plan revision) | plan revision folding WS-SPEC-SUBPART into M1; triage re-classification | 2 (Patch 2c plan revise + Patch 2e re-triage) |
| M2 / WS-STEPPER | stepper check re-promotion (folded into this plan) | 1 |
| M2 / WS-AUTHOR-CONTENT | scene-related + subpart-related authoring fixes (post-triage) | 1 to 3 |
| M3 / WS-VERIFY | full-tree stepper sweep | 1 |
| M3 / WS-DOCS | changelog, plan close-out, gate-passed marker | 1 |

## Severity tiering of the 478 warnings

User concern is exactly this point. The plan splits the bucket up-front so
nothing hides. The original S0/S1/S2 trichotomy stands; S0 is subdivided
into S0a (scene-adapter spec gap) and S0b (subpart-modeling spec gap) per
the Patch 2c plan revision. Final S0/S1 counts will be re-stated in the
triage doc by Patch 2e after the WS-SPEC-SUBPART memo (Patch 2b) is
user-ratified.

- **Tier S0a (scene-adapter spec gap).** Targets a reasonable
  scene-adapter rule would resolve from the protocol's full scenes/
  directory rather than only the currently-active scene. Per WS-TRIAGE:
  25 unique signatures / 92 raw warnings. Resolved by WS-SPEC-SCENE
  (Option 2: full-protocol-scenes registry, ratified per user 2026-05-16).
- **Tier S0b (subpart-modeling spec gap).** Targets that name a structured
  subpart of a placed object (`well_plate_96.<RC>`, `tube_rack.<slot>`,
  `gel.<lane>`) where the structured parent IS placed in the active scene
  but the subpart-addressing schema does not yet allow the subpart to
  resolve implicitly. **S0b is defined as a spec gap measured against the
  dream authoring model, not against implementation feasibility.** Under
  the dream model the author writes one plate SVG, names overlapping
  logical subparts (wells + rows + columns), and authors interactions at
  the meaningful lab unit ("dispense to column A1-H1") rather than the
  renderer atom (96 individual well clicks). The 193 warnings count
  exactly the cases where today's schema cannot express that intent.
  Per WS-TRIAGE: 97 unique signatures / 193 raw warnings (the entire
  `mtt_solubilization_readout.read_absorbance` cluster, surfacing again
  under `cell_culture_full`). Reclassified from S1 by Patch 2c per user
  direction 2026-05-16. Resolved by WS-SPEC-SUBPART (memo in flight as
  Patch 2b; spec amendment lands as Patch 2d).
- **Tier S1 (authoring bug, real protocol error).** Targets that no
  scene-adapter rule and no subpart-addressing rule could legitimately
  resolve -- the protocol references an object after SceneChange where
  pedagogy required SceneChange back to the prior scene first, or the
  wrong target name was authored, or a placement is missing from the
  scene's `add_placements`. These are the warnings the user is concerned
  about. Final S1 count will be re-stated after the S0b reclassification
  lands in Patch 2e (current pre-reclass count: 194 unique / 386 raw;
  after S0b removal the residual S1 unique-signature count is the small
  cluster of genuine missing-workspace and typo'd-target cases).
- **Tier S2 (stepper-gap, false positive).** Stepper bug in the
  semantic checker -- e.g. sequence-runner double-counts the same
  warning from a constituent mini, or the active-scene tracker mis-
  reads a SceneChange. Confirmed during WS-TRIAGE: 0 unique / 0 raw.
  Reserved bucket; fixed in stepper code under `tools/stepper/`, not in
  content YAML if it ever fires. Distinct from the separately-tracked
  manual-renderer template gaps, which are out of scope here.

Bucket counts go in `yaml_cleanup_triage.md` table. Triage is the M1
deliverable. Patch 2e re-classifies the table per the S0a/S0b split.

### Warning signature definition

A "unique warning signature" used by the triage dedupe is:

```
signature = protocol_name + step_name + warning class + target name + active scene name
```

Including `protocol_name` and `step_name` prevents merging different
authoring bugs that share class + target + scene across different
protocols or different steps.

## Milestone plan

### Milestone M1: Triage + spec ratification

- Depends on: architect plan `scene_adapter_resolution_design.md` already
  entry-ready.
- Workstreams: WS-INIT (planner), WS-TRIAGE (planner), WS-SPEC-SCENE
  (architect), WS-SPEC-SUBPART (architect; folded in per Patch 2c).
- Entry criteria: stepper output captured (478 warnings).
- Exit criteria:
  - **Patch 0 (WS-INIT) landed.** Repo-tracked plan exists at
    `docs/active_plans/yaml_cleanup_gate.md` with predecessor
    cross-reference.
  - **Decision deadline (two decisions).** M1 cannot close until BOTH
    spec amendments are user-ratified AND landed in their respective
    spec files: (a) the scene-adapter algorithm (Option 2:
    full-protocol-scenes registry, already ratified per user
    2026-05-16) and (b) the subpart-addressing schema (architect
    memo in flight as Patch 2b at
    `docs/active_plans/subpart_addressing_recommendation.md`; user
    ratifies on next turn). If either decision stalls past the M1
    close target, escalate to user with a written one-paragraph
    trade-off summary; user picks. Both decisions are hard blockers
    for M1.
  - `docs/active_plans/yaml_cleanup_triage.md` published with:
    - **Every unique warning signature classified** (signature per the
      definition above). Dedupe first; then categorize each unique
      pattern S0a/S0b/S1/S2 with a one-line rationale. Patch 2e
      re-classifies the original S0/S1 split into the S0a/S0b/S1
      split once WS-SPEC-SUBPART is ratified.
    - bucket table (S0a/S0b/S1/S2 counts per protocol, both raw and
      unique).
    - sampled-warnings appendix: &gt;= 20 verbatim raw lines spanning the
      bucket distribution as illustration, not as the basis for
      classification.
  - `docs/specs/SCENE_VOCABULARY.md` and
    `docs/specs/PROTOCOL_YAML_FORMAT.md` ratified per the chosen
    scene-adapter algorithm (WS-SPEC-SCENE).
  - `docs/specs/OBJECT_YAML_FORMAT.md` ratified per the chosen
    subpart-addressing schema (WS-SPEC-SUBPART; structured grids
    only -- plates, racks, gels).
  - Architect plan `scene_adapter_resolution_design.md` moves to
    `docs/archive/` on close.
  - Architect memo `subpart_addressing_recommendation.md` moves to
    `docs/archive/` on close. A second architect plan stub at
    `docs/active_plans/subpart_addressing_design.md` may be opened
    only if the recommendation memo flags unresolved open questions;
    otherwise the recommendation memo itself archives.
  - `docs/CHANGELOG.md` updated.
- Parallel-plan ready: yes -- max parallel doers 3 (triage, scene-adapter
  spec, and subpart spec run independently; both spec lanes consume
  triage sample output as evidence).

### Milestone M2: Fixes (content authoring + stepper code)

- Depends on: M1 (need both spec amendments to know what counts as a
  Tier S1 bug after S0a/S0b removal).
- Workstreams: WS-STEPPER (tooling), WS-AUTHOR-CONTENT (protocol
  authors; covers both the scene-adapter rewrites and the subpart-schema
  rewrites of the 193-warning step).
- Entry criteria: M1 exit met; re-triaged table identifies the residual
  S1 fix list and S2 stepper-bug list.
- Exit criteria:
  - Stepper code re-promotes `unknown_target_active_scene` and
    `ambiguous_target_in_scene` from WARNING to ERROR (WS-STEPPER lane).
    Stepper exits non-zero on any remaining instance.
  - Every residual Tier S1 warning closed by a fix to the corresponding
    `content/protocols/<name>/protocol.yaml` or
    `content/protocols/<name>/scenes/<scene>.yaml` (WS-AUTHOR-CONTENT
    lane, scene-adapter half).
  - The S0b cluster in `mtt_solubilization_readout.read_absorbance`
    (193 warnings) is rewritten to express column-, row-, or
    plate-level dispenses per the ratified subpart schema
    (WS-AUTHOR-CONTENT lane, subpart half). The rewrite uses the new
    overlapping logical subpart vocabulary; it does NOT add 96
    explicit per-well placements.
  - Every Tier S2 warning closed by a stepper code fix (WS-STEPPER
    lane).
  - **Patch-stream separation enforced.** A single patch must not mix
    scene-adapter / scene-boundary fixes with unrelated content edits
    (such as material-state corrections or learning-block tweaks that
    belong to a separate concern). Exception: a single S1 fix to one
    protocol may touch both that protocol's `protocol.yaml` and its
    sibling `scenes/<scene>.yaml` -- those are the same scene-boundary
    concern. The ban is on mixing scene-resolution work with unrelated
    authoring work, not on touching multiple files for one logically
    cohesive fix. Reviewer rejects any patch that violates this.
  - `docs/CHANGELOG.md` line per patch.
- Parallel-plan ready: yes -- max parallel doers 4 (stepper-code lane +
  per-protocol-cluster author lanes).

### Milestone M3: Verify + close-out

- Depends on: M2.
- Workstreams: WS-VERIFY (any), WS-DOCS (maintainer).
- Entry criteria: M2 exit met.
- Exit criteria:
  - `source source_me.sh && python3 tools/validate_content_yaml.py` exits
    0.
  - `source source_me.sh && python3 tools/protocol_stepper.py` exits 0
    with 0 ERRORs and 0 unresolved WARNINGs on all 12 protocols. A
    "resolved" WARNING is one that has been promoted to ERROR, demoted
    to a documented INFO class, or removed.
  - `docs/active_plans/yaml_cleanup_triage.md` moves to `docs/archive/`.
  - `docs/CHANGELOG.md` carries "YAML cleanup gate passed" entry under
    today's date.
  - Gate-passed marker recorded so next-step planning (SDS-PAGE or TS)
    can proceed.
- Parallel-plan ready: no -- final sequential verification + docs.

## Workstream breakdown

### WS-INIT: Promote draft to repo (Patch 0)

- Owner: planner (or maintainer)
- Reads: this draft (`~/.claude/plans/sorted-snacking-kettle.md`).
- Provides: `docs/active_plans/yaml_cleanup_gate.md` (this plan, copied
  with a "Predecessor: dream-YAML reauthoring plan (landed; archived)"
  cross-reference at the top).
- Expected patches: 1 (Patch 0).

### WS-TRIAGE: 478-warning bucket separation

- Owner: planner
- Provides: `docs/active_plans/yaml_cleanup_triage.md` containing:
  - **Unique-signature classification (mandatory).** Dedupe the 478
    raw warnings to a unique-signature set per the signature
    definition above (`protocol_name + step_name + warning class +
    target name + active scene name`). Every unique signature is
    categorized S0/S1/S2 with a one-line rationale. This is the
    primary classification artifact; raw 478 is appendix.
  - bucket table (S0/S1/S2 counts per protocol, both raw and unique).
  - sampled-warnings appendix: &gt;= 20 verbatim raw lines spanning the
    bucket distribution as illustration, not as the basis for
    classification.
  - dedupe analysis for `cell_culture_full` runner (which of its 234
    overlap with constituent mini findings).
- Expected patches: 1.

### WS-SPEC-SCENE: scene-adapter algorithm ratification

- Owner: architect
- Reads: existing
  `docs/active_plans/scene_adapter_resolution_design.md`,
  `docs/active_plans/scene_adapter_recommendation.md` (Patch 2
  ratified memo recommending Option 2),
  `docs/specs/SCENE_VOCABULARY.md`,
  `docs/specs/PROTOCOL_YAML_FORMAT.md`, WS-TRIAGE output.
- Provides: spec amendments per Option 2 (full-protocol-scenes
  registry) + architect plan close-out. No separate follow-on plan
  -- stepper re-promotion folded into WS-STEPPER.
- Expected patches: 1 to 2 (Patch 2 memo done; Patch 2a amend
  pending).

### WS-SPEC-SUBPART: subpart-addressing schema ratification

- Owner: architect
- Reads: WS-TRIAGE S0b cluster (97 unique / 193 raw
  `well_plate_96.<RC>` signatures), `docs/specs/OBJECT_YAML_FORMAT.md`,
  `docs/specs/OBJECT_VOCABULARY.md`, current `well_plate_96.yaml` object
  definition, the `mtt_solubilization_readout` protocol and its scene.
- Scope: structured grids only -- plates, racks, gels later. NOT a
  generalized hierarchical subparts framework. Ratifies the DREAM-YAML
  authoring target (overlapping row + column + well logical subparts on
  one plate SVG, interactions at the meaningful lab unit) as the
  authoring contract; runtime implementation strategy stays flexible.
- Provides: architect memo at
  `docs/active_plans/subpart_addressing_recommendation.md` (Patch 2b,
  drafting in parallel) and follow-on spec amendment patch (Patch 2d)
  that edits `docs/specs/OBJECT_YAML_FORMAT.md` per user ratification.
  A second design plan stub at
  `docs/active_plans/subpart_addressing_design.md` may be opened only
  if the memo flags unresolved open questions; otherwise the memo
  archives directly on M1 close.
- Expected patches: 1 to 2 (Patch 2b memo + Patch 2d amend).

### WS-STEPPER: re-promote checks (folded; no separate plan)

- Owner: tooling author
- Reads: `tools/stepper/state.py` `resolve_target`, WS-SPEC output.
- Provides: code patch that switches Level.WARNING back to Level.ERROR
  on `unknown_target_active_scene` and `ambiguous_target_in_scene`;
  removes inline pointer comment referencing the archived architect
  plan; updates stepper CHANGELOG line per architect plan's retire-rule
  contract.
- Folded into this plan per user feedback (anti-sprawl). No separate
  `protocol_stepper_scene_adapter_alignment.md` plan file.
- Expected patches: 1.

### WS-AUTHOR-CONTENT: S1 + S0b authoring fixes

Decision: WS-AUTHOR-SCENE renamed to WS-AUTHOR-CONTENT (rather than
adding a sibling WS-AUTHOR-SUBPART workstream) because the two fix
streams share the same owner, the same per-protocol patch boundaries,
and the patch-stream separation rule already gates against mixing
unrelated concerns inside one patch. One workstream, two distinct fix
shapes, cleaner mapping table.

- Owner: protocol author (may split across protocols)
- Reads: re-triaged WS-TRIAGE fix list, per-protocol `protocol.yaml`,
  per-protocol `scenes/*.yaml`, ratified scene-adapter and
  subpart-addressing specs.
- Provides: YAML edits in two fix shapes:
  - **Scene-adapter half (residual S1).** Typical shapes: add missing
    `SceneChange` back to prior scene, add a placement to the
    inherited scene file, rename a typo'd target, split a step that
    spans scenes into two steps.
  - **Subpart half (S0b cluster).** Rewrite the
    `mtt_solubilization_readout.read_absorbance` step (and its
    sequence-runner echo) to express column-, row-, or plate-level
    dispenses per the ratified subpart vocabulary. Do NOT add 96
    explicit per-well placements.
- Expected patches: 1 to 3.

### WS-VERIFY: full sweep

- Owner: any
- Provides: gate-passed evidence -- validator + stepper clean, 0 ERRORs,
  0 unresolved WARNINGs.
- Expected patches: 0 to 1 (only patches if a verification finding
  surfaces residual drift).

### WS-DOCS: close-out

- Owner: maintainer
- Provides: changelog entry, archive moves, README/AGENTS pointer
  refresh if either references active plans.
- Expected patches: 1.

## Acceptance criteria and gates

- **Per-patch gate**: the touched tool exits 0; `docs/CHANGELOG.md`
  updated.
- **Integration gate (M3 exit)**: validator + stepper clean (0 ERRORs,
  0 unresolved WARNINGs); triage report and architect plan archived;
  gate-passed marker recorded.

## Test and verification strategy

Static-only (no runtime tests required; runtime not built yet).

- `tools/validate_content_yaml.py` -- syntax gate; must exit 0
- `tools/protocol_stepper.py` -- semantic gate; must exit 0 with 0
  ERRORs and 0 unresolved WARNINGs after M2
- `pytest tests/` -- existing repo-wide lint and link checks must stay
  green throughout

## Migration and compatibility policy

- Additive: spec amendments add a resolution algorithm; do not break
  existing validator/stepper.
- Backward compatibility: none required at YAML layer -- content authors
  edit YAML to match the new spec when WS-AUTHOR-SCENE fires.
- Rollback: revert per-patch via standard git workflow; architect plan
  archive can be unarchived if spec amendment must be revisited.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Triage misclassifies S0 vs S1; real bugs hide in spec-gap bucket | high | Reviewer disagrees with bucket assignment | planner | Unique-signature classification covers every distinct pattern; reviewer signs off on triage before M2 starts. |
| Architect spec ratification stalls | high | Open question in `scene_adapter_resolution_design.md` cannot be resolved | architect | Plan trigger says "before next scene-introducing protocol expansion" -- this plan IS that trigger; escalate to user for decision at M1 close. |
| Sequence runner double-count obscures true count | medium | `cell_culture_full` 234 collapses to single-digit unique | planner | WS-TRIAGE explicitly dedupes runner findings against constituent minis. |
| Stepper re-promotion exposes additional warnings the M1 triage missed | medium | M2 final stepper run shows new warnings | tooling author | Re-triage any survivor in M2 close-out; do not ship M3 until count is 0. |
| Scene-resolution YAML fix accidentally changes pedagogy | medium | Author rewrites a step while fixing a scene issue | protocol author | Patch-stream separation rule + reviewer check; pedagogy reviewer not in scope for this plan but any prose drift is flagged for the separate pedagogy gate. |

## Rollout and release checklist

- [ ] M1 exit met (Patch 0 landed, triage published with unique-signature
  classification, BOTH scene-adapter and subpart-addressing specs
  ratified and landed, architect plan + memo archived, stepper
  re-promotion folded into this plan, triage re-classified per
  S0a/S0b split via Patch 2e).
- [ ] M2 exit met (stepper re-promoted, S1 + S2 warnings closed).
- [ ] M3 exit met (full sweep clean, triage archived, gate-passed
  marker recorded).
- [ ] `docs/CHANGELOG.md` carries one entry per milestone close.
- [ ] No file under `src/` modified.
- [ ] Next-step planning (SDS-PAGE expansion or TS runtime pilot) is now
  unblocked.

## Documentation close-out requirements

- Active plan: `docs/active_plans/yaml_cleanup_gate.md` (created at
  Patch 0) archived on M3 close.
- Triage report: `docs/active_plans/yaml_cleanup_triage.md` archived
  on M3 close.
- Architect plan `docs/active_plans/scene_adapter_resolution_design.md`
  archived on M1 close.
- Architect memo
  `docs/active_plans/subpart_addressing_recommendation.md` archived
  on M1 close. (Optional successor
  `docs/active_plans/subpart_addressing_design.md` opens only if the
  memo flags unresolved open questions.)
- No separate follow-on plan for stepper re-promotion (folded into
  WS-STEPPER).
- `docs/CHANGELOG.md`: one entry per milestone close-out.

## Patch plan and reporting format

M1:
- Patch 0: WS-INIT -- create `docs/active_plans/yaml_cleanup_gate.md`
  (repo-tracked plan with predecessor cross-reference). Done.
- Patch 1: WS-TRIAGE -- `yaml_cleanup_triage.md` with every unique
  warning signature classified + bucket counts + &gt;= 20 verbatim
  samples. Done.
- Patch 2: WS-SPEC-SCENE memo --
  `docs/active_plans/scene_adapter_recommendation.md`. Done and
  user-ratified (Option 2).
- Patch 2a: WS-SPEC-SCENE amend -- `docs/specs/SCENE_VOCABULARY.md` +
  `docs/specs/PROTOCOL_YAML_FORMAT.md` per Option 2; architect plan
  close-out.
- Patch 2b: WS-SPEC-SUBPART memo --
  `docs/active_plans/subpart_addressing_recommendation.md` (drafting
  in parallel by another architect).
- Patch 2c: plan revision -- THIS PATCH; splits WS-SPEC into
  WS-SPEC-SCENE + WS-SPEC-SUBPART, folds subpart spec into M1,
  reclassifies 193 well-reference warnings from S1 to S0b.
- Patch 2d: WS-SPEC-SUBPART amend -- `docs/specs/OBJECT_YAML_FORMAT.md`
  per user-ratified subpart schema; architect memo close-out.
- Patch 2e: re-triage doc update --
  `docs/active_plans/yaml_cleanup_triage.md` re-classified into
  S0a/S0b/S1/S2 with reconciled counts.

M2:
- Patch 3: WS-STEPPER -- re-promote check level.
- Patches 4 to 6: WS-AUTHOR-CONTENT -- residual S1 fixes clustered by
  protocol PLUS S0b subpart-rewrite of
  `mtt_solubilization_readout.read_absorbance`.

M3:
- Patch 7: WS-VERIFY -- only if residual drift surfaces.
- Patch 8: WS-DOCS -- close-out.

Patch sizing per `docs/REPO_STYLE.md`: one to two patches per coder per
week; split if any patch touches more than two protocols.

## Verification

End-to-end check from a clean checkout:

```bash
source source_me.sh
python3 tools/validate_content_yaml.py            # exits 0
python3 tools/protocol_stepper.py                  # exits 0; 0 ERRORs, 0 unresolved WARNINGs
pytest tests/                                       # repo-wide lint clean
```

The gate now stabilizes TWO semantic contracts in one pass
(scene-adapter resolution + subpart addressing) so M2 does not need to
re-triage twice. No new verification commands; validator + stepper +
pytest remain the only gates.

## Open questions and decisions needed

- **Subpart schema (hard blocker for M1 close).** Architect memo at
  `docs/active_plans/subpart_addressing_recommendation.md` (Patch 2b,
  in flight) recommends an overlapping row + column + well schema for
  structured grids (plates, racks, gels). User ratifies on next turn.
  Plan does not progress past M1 without a ratified subpart schema.

## Resolved decisions

- This plan gates both SDS-PAGE expansion and TypeScript runtime pilot.
  Per user direction 2026-05-16: clean up stepper first.
- Severity tiering (S0/S1/S2) is the framing user requested:
  "some warnings more concerning than just warnings." Triage report
  separates the buckets explicitly.
- Existing architect plan owns the spec ratification; this plan consumes
  + closes it. No re-litigation of the four candidate algorithms here.
- Manual-renderer / pedagogy gate is out of scope per user direction.
  Tracked separately; not blocking this gate.
- Plan file lives at `docs/active_plans/yaml_cleanup_gate.md` after
  Patch 0; the `~/.claude/plans/sorted-snacking-kettle.md` scratch is
  the draft staging area only. Predecessor plan (dream-YAML
  reauthoring) already landed; not overwritten on disk -- it lived only
  in this scratch.
- Stepper re-promotion (WS-STEPPER) is folded into this plan rather
  than spawning a separate alignment plan. Per user feedback: anti-
  sprawl, same ownership, one-file scope.
- Triage classifies every unique warning signature (deduped from raw
  478) using the signature `protocol_name + step_name + warning class
  + target name + active scene name`. Samples are illustration.
- Patch-stream separation: a single patch must not mix scene-adapter /
  scene-boundary fixes with unrelated content edits. Exception: one
  cohesive S1 fix may touch both `protocol.yaml` and the sibling
  `scenes/<scene>.yaml` for the same protocol -- that is the same
  concern.
- "0 warnings" means 0 unresolved warnings. Every surviving warning
  class is promoted to ERROR, demoted to documented INFO, or removed.
  WARNING is not a terminal severity.
- Option 2 (full-protocol-scenes registry) ratified per user
  2026-05-16. WS-SPEC-SCENE spec amend (Patch 2a) proceeds.
- Subpart-addressing spec amendment folded into M1 per user
  2026-05-16. Workstreams split into WS-SPEC-SCENE + WS-SPEC-SUBPART.
  Both close before M1 exit.
- Subpart spec amendment scope: structured grids only (plates, racks,
  gels). NOT a generalized hierarchical subparts framework.
- 193 well-reference signatures (97 unique) reclassified from S1
  (authoring bug) to S0b (subpart-modeling spec gap). Re-classification
  lands in the triage doc as Patch 2e.
- WS-SPEC-SUBPART ratifies the DREAM-YAML authoring target under
  ideal learning conditions: one plate SVG, overlapping logical
  subparts (wells + rows + columns), interactions at the meaningful
  lab unit rather than the renderer atom. This is the authoring
  contract, NOT the final renderer implementation. The spec may
  evolve once TypeScript runtime work proves implementation
  constraints. The cleanup gate classifies the 193 well warnings
  (now S0b) against this dream model, not against today's renderer
  limitations. Goal: keep YAML pedagogically honest; leave runtime
  strategy flexible.
- WS-AUTHOR-SCENE renamed to WS-AUTHOR-CONTENT (not split into a
  sibling WS-AUTHOR-SUBPART). Same owner, same per-protocol patch
  boundaries; patch-stream separation rule already prevents mixing
  scene-resolution and subpart-rewrite work inside one patch.
