# Plan: Collapse liquid-fill SVG variants to single base assets

## Context

`content/objects/<kind>/*.yaml` currently authors one SVG per material-fill state. A bottle that
holds five different liquids (or `empty` + one liquid) carries one `asset_name` per case under
`visual_states.material_name.cases[].output.asset_name`: `bme_bottle_empty`,
`bme_bottle_filled`; `t75_flask_empty`, `t75_flask_with_media`, `t75_flask_with_pbs`,
`t75_flask_with_trypsin`, `t75_flask_with_cell_suspension`. The picker queue
(`tools/svg_picker/missing_targets.json`) shows 31 of the 74 missing-asset slots are
liquid-fill variants (13 `_empty`, 14 `_filled`, 4 `_with_<material>`); the remaining 43 are
true non-variant slots (centrifuge `_idle`/`_spinning`, hardware `_open`/`_closed`, bare
names like `dmso_bottle`).

There is no live TypeScript runtime today. The user confirmed: "we will eventually
implement a composite/overlay, but TypeScript is non-existent for now. Just plan ahead
that it will exist eventually." Older code under `src/` (including `src/svg_overlays.ts`
and `src/scene_runtime/`) is dead reference material; the new runtime is in flight under
a separate plan owned by another manager. This plan therefore prepares the **vocabulary,
asset, validator, and picker** ground so that when the runtime composite handler lands,
it has correct authoring shape, correctly-anchored base SVGs, and a validator that keeps
authors on the convention. No browser smoke is in scope (there is nothing to smoke
against); the runtime plan will own the rendering tests when it ships.

The dead code is still useful as a **reference design** for the future runtime: the
generic anchor-driven overlay function (`src/svg_overlays.ts:91 createLiquidOverlay`)
shows the intended interface (equipmentId + level + color + svgString -> overlay SVG),
and the `anchor_liquid_clip` + `anchor_liquid_bounds` convention is well-established for
pipettes. The collapse work here lets the new runtime adopt that same interface across
every container kind without re-authoring 30+ YAMLs after the fact.

The picker work uncovered this design smell. Per `docs/REPO_STYLE.md` "Long-term over
short-term" and "Fix the design, not the symptom", the durable fix is to collapse the
variants to a single base SVG per object and let the existing runtime overlay carry the
material identity + volume. The picker queue shrinks by ~31 slots; future containers add
without minting empty/filled pairs; the asset library stays small and stylistically
consistent.

## Objectives

- Rewrite every liquid-fill variant pair in `content/objects/<kind>/*.yaml` so every
  `material_name` case in the affected objects resolves to one base `asset_name`.
- Author or patch base SVG assets so every collapsed object's base SVG carries
  bare-id `<rect id="anchor_liquid_clip">` and `<rect id="anchor_liquid_bounds">`.
  Namespacing to `<asset_name>__anchor_liquid_clip` is the generator / future runtime's
  job, not the author's. Document this boundary in the spec so authors are never asked
  to type the prefix.
- Tighten `validation/yaml/object_validator.py` with two distinct gates:
  - **Vocabulary error** (hard fail): any object whose `visual_states` declares a
    `<prefix>material_volume` `fill_height(...)` composite while its paired
    `<prefix>material_name` (or `<prefix>held_material_name`) cases resolve to multiple
    distinct `asset_name` values. This is the smell that allows the variant pattern to
    return; it is a vocabulary mistake, not an asset gap.
  - **Asset-readiness warning** (soft report): any object whose collapsed base asset's
    SVG file on disk lacks `id="anchor_liquid_clip"` or `id="anchor_liquid_bounds"`.
    Soft-reports while WS-ANCHORS catches up; hardens to a failure once anchor authoring
    completes.
- Drop the now-redundant `_empty` / `_filled` / `_with_<material>` slots from
  `tools/svg_picker/missing_targets.json` and lower `BASELINE_MISSING_COUNT` in
  `tests/test_object_asset_refs.py` to the new gap floor.
- Update `docs/specs/MATERIAL_CONVENTION.md` and `docs/specs/OBJECT_VOCABULARY.md` to make
  the single-base-asset + overlay rule the documented authoring convention, and to
  document the prefixed-id anchor contract the future runtime will consume.

## Design philosophy

This plan leans on `docs/REPO_STYLE.md` "Long-term over short-term" and "Fix the design,
not the symptom". The picker quick-patch (batch-assign one SVG to both `bottle_empty` and
`bottle_filled` filenames) clears the gate today but bakes a per-state SVG enumeration that
the runtime overlay was designed to eliminate; the cost compounds with every new container
because it doubles asset count and forces the picker queue to grow when new materials land.
The rejected alternative (option 1 from the prior thread: duplicate one SVG into both
filenames) is faster by an afternoon but locks the vocabulary into a shape that contradicts
`MATERIAL_CONVENTION.md`. This plan accepts a multi-day cost (YAML rewrite + anchor
authoring + validator gate + spec updates) to retire the variant pattern repo-wide and to
add a structural validator gate so re-introduction of the pattern is rejected at authoring
time, not absorbed silently.

## Scope

- Rewrite `visual_states.material_name.cases[].output.asset_name` (and the pipette
  `held_material_name` analogue) in every container, flask, pipette, plate-subpart, waste,
  and equipment-chamber YAML so every case names the same base asset.
- Author / patch `assets/equipment/*.svg` base assets to carry `anchor_liquid_clip` +
  `anchor_liquid_bounds` rects with the equipmentId prefix convention.
- Extend `validation/yaml/object_validator.py` with a new rule that rejects authoring drift
  back to the variant pattern.
- Rebuild `tools/svg_picker/missing_targets.json`; lower `BASELINE_MISSING_COUNT`.
- Update `docs/specs/MATERIAL_CONVENTION.md`, `docs/specs/OBJECT_VOCABULARY.md`, and
  `docs/specs/SVG_PIPELINE.md` (if it duplicates the variant convention anywhere) to make
  single-base + overlay the canonical rule.
- (Playwright fill smoke deferred to the future runtime plan; there is no live
  TypeScript renderer to assert against today.)

## Non-goals

- Closing non-liquid variants (`_idle`/`_spinning`/`_open`/`_closed`/`_with_lid`/etc.) --
  these are motion or hardware-configuration states, not liquid-fill, and need a separate
  vocabulary discussion.
- Migrating sentinel materials (`empty`, `mixed`, `cells`, `formazan`, waste sinks) -- the
  allowlist in `MATERIAL_CONVENTION.md:126-142` is not changing; `empty` remains the
  state-sentinel value that triggers the overlay-skipped path.
- Rebuilding the picker UI / ranker / applier -- those tools keep working; the only picker
  change is the shrunken manifest.
- Migrating any third-party content under `OTHER_REPOS/` -- read-only candidate pool only.
- Adding a new `render` block or vocabulary primitive -- the existing
  `visual_states.material_volume.kind: composite` + `fill_height(...)` formula already
  expresses the overlay intent; no new authoring surface is needed.
- Touching any TypeScript runtime. The runtime composite handler is owned by a separate
  in-flight plan; this plan only **prepares** YAML + assets + validator so the future
  runtime can adopt them without rework.
- Adding browser / Playwright smokes for the new overlay. Those land with the runtime
  plan, not here.

## Current state summary

- 19 container YAMLs declare `_empty`/`_filled` pairs (bottles + waste, per the audit).
- 2 flask YAMLs declare a 5-way fan-out (`_empty` + 4 `_with_<material>`): `t75_flask.yaml`,
  `t75_flask_new.yaml`.
- 6 pipette YAMLs declare `_empty`/`_filled` pairs against `held_material_name`.
- 1 plate YAML (`well_plate_96.yaml`) uses `_empty`/`_filled` for well subparts.
- 1 equipment YAML (`electrophoresis_tank.yaml`) uses `_empty`/`_filled` for two distinct
  chambers (inner + outer); the collapse here yields two base assets, one per chamber.
- 4 waste YAMLs share one `_empty`/`_filled` pair across multiple objects.
- 1 rack YAML references the same conical tube variant pair.
- No live TypeScript runtime. `src/svg_overlays.ts:91 createLiquidOverlay` and
  `src/scene_runtime/render/scene.ts:164` are dead reference code; the runtime composite
  handler is in flight under a separate plan. This plan's deliverable is **vocabulary +
  asset readiness**, not rendering.
- Picker queue at `tools/svg_picker/missing_targets.json` currently lists 74 missing
  slots; collapse retires ~31 (`_empty`+`_filled`+`_with_*` for the kinds above, minus
  duplicates across object YAMLs that share an asset name).
- Validator `validation/yaml/object_validator.py:179-238` enforces visual_states
  completeness but does not gate the variant-collapse rule; an author can re-introduce the
  smell silently.

## Architecture boundaries and ownership

| Component                                                                                  | Owner          | Touch rule                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Object YAMLs (`content/objects/<kind>/*.yaml`)                                             | content author | Edit `visual_states.material_name.cases[].output.asset_name` and the `held_material_name` analogue only; do not edit `state_fields`, `material_volume` composite formulas, capabilities, layout.     |
| Validator (`validation/yaml/object_validator.py`)                                          | tooling author | Add one new rule + tests; do not refactor existing rules.                                                                                                                                            |
| Base SVG assets (`assets/equipment/*.svg`)                                                 | art author     | Inkscape pass to add bare-id `<rect id="anchor_liquid_clip">` + `<rect id="anchor_liquid_bounds">`; do not pre-prefix with `<asset_name>__` (the generator does that); do not modify visual artwork. |
| Spec docs (`docs/specs/MATERIAL_CONVENTION.md`, `OBJECT_VOCABULARY.md`, `SVG_PIPELINE.md`) | doc author     | Update authoring rule and examples; no spec versioning per `docs/PRIMARY_SPEC.md` "No schema version".                                                                                               |
| Picker manifests (`tools/svg_picker/`)                                                     | tooling author | Rebuild only; no code change.                                                                                                                                                                        |
| Gate test (`tests/test_object_asset_refs.py`)                                              | tester         | Lower `BASELINE_MISSING_COUNT` to the post-collapse floor; do not switch to hard `assert` yet (separate follow-up plan).                                                                             |
| Runtime overlay (`src/svg_overlays.ts`, `src/scene_runtime/`)                              | other manager  | Dead reference only. Do not edit or rely on for behavior; the runtime composite handler lands in a separate plan.                                                                                    |
| Playwright smoke                                                                           | other manager  | Out of scope; the runtime plan owns rendering tests.                                                                                                                                                 |

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component                                                           | Expected patches                                                                          |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| M1 / WS-AUDIT          | Per-object base-asset + anchor-gap audit (static, no runtime probe) | 1 patch (audit doc under `docs/active_plans/`)                                            |
| M2 / WS-ANCHORS        | Base SVG anchor authoring                                           | 1-2 patches (grouped by kind: bottles/flasks first, waste/equipment second)               |
| M2 / WS-YAML           | Object YAML rewrite                                                 | 1-2 patches (containers + plate subpart in one, pipettes + equipment chambers in another) |
| M2 / WS-VALIDATOR      | Validator rule + unit tests                                         | 1 patch                                                                                   |
| M3 / WS-PICKER         | Manifest rebuild + gate threshold                                   | 1 patch                                                                                   |
| M4 / WS-DOCS           | Spec + changelog + plan archive                                     | 1 patch                                                                                   |

## Milestone plan

### Milestone M1: Per-object base-asset + anchor-gap audit

- Depends on: none.
- Workstreams: WS-AUDIT (static read-only investigation; single workstream).
- Entry criteria: this plan approved.
- Exit criteria:
  - One audit document under `docs/active_plans/material_overlay_audit_<DATE>.md` lists,
    per affected object, (a) the proposed base `asset_name`, (b) the SVG file that will
    serve as the base on disk, and (c) whether that SVG already carries
    `anchor_liquid_clip` + `anchor_liquid_bounds` or needs anchor authoring. No runtime
    probe; rendering is the future runtime plan's responsibility.
  - Obvious follow-on: link the audit doc from `docs/CHANGELOG.md` and pin it from this
    plan so M2 workstreams can dispatch with concrete file targets.
- Parallel-plan ready: no -- single read-only workstream; sequencing into M2 requires the
  audit output to define M2 work.

### Milestone M2: Rewrite YAML + author anchors + add validator gate

- Depends on: M1 (need audit's per-object base-asset list and anchor-gap list).
- Workstreams: WS-ANCHORS (SVG authoring), WS-YAML (YAML rewrite), WS-VALIDATOR (validator
  rule). All three are independent: WS-ANCHORS only edits SVG files, WS-YAML only edits
  YAML files, WS-VALIDATOR only edits one Python file + adds unit tests.
- Entry criteria: M1 audit doc lists base asset per object and anchor gaps.
- Exit criteria:
  - Every YAML in the audit list rewritten so `material_name` (or `held_material_name`)
    cases all resolve to the same base asset; `material_volume` composite block unchanged.
  - Every base SVG named in the audit carries both anchor rects with the correct prefixed
    id convention (`<equipmentId>__anchor_liquid_clip`,
    `<equipmentId>__anchor_liquid_bounds`).
  - `validation/yaml/object_validator.py` rejects any object whose `visual_states`
    declares a `material_volume` `fill_height(...)` composite **and** whose
    `material_name`/`held_material_name` cases resolve to more than one distinct
    `asset_name`. Two new unit tests in
    `validation/yaml/tests/test_object_validator_variant_collapse.py` (or equivalent
    location) cover the positive (collapsed: passes) and negative (variant fan-out:
    rejected) paths.
  - `pytest tests/` green (existing suite plus the new validator unit tests).
  - **Asset-readiness gate hardening**: once every audited base SVG carries both
    anchors (WS-ANCHORS complete across the audit list), the validator's
    asset-readiness check flips from soft report to hard fail. The flip is its own
    one-line commit so re-introducing an unanchored base SVG fails CI from that
    point on.
  - Obvious follow-on: each patch updates `docs/CHANGELOG.md` under today's date and runs
    the validator across all `content/objects/` to confirm zero new failures.
- Parallel-plan ready: yes -- max parallel doers: 3 (one per workstream).

### Milestone M3: Picker manifest rebuild + gate threshold

- Depends on: M2 (need YAML edits landed so the post-collapse asset count is real).
- Workstreams: WS-PICKER (single workstream).
- Entry criteria: M2 exit met.
- Exit criteria:
  - `source source_me.sh && python3 tools/svg_picker/build_missing_targets.py` regenerated;
    new count printed and recorded in `docs/CHANGELOG.md`.
  - `tests/test_object_asset_refs.py` `BASELINE_MISSING_COUNT` lowered to the new floor;
    `pytest tests/test_object_asset_refs.py -v` reports the new gap and exits 0.
  - Obvious follow-on: update `docs/CHANGELOG.md` with old vs new gap floor and rerun
    the full pytest suite.
- Parallel-plan ready: no -- single workstream.

### Milestone M4: Documentation close-out

- Depends on: M3.
- Workstreams: WS-DOCS (single workstream).
- Entry criteria: M3 exit met.
- Exit criteria:
  - `docs/specs/MATERIAL_CONVENTION.md` rewritten so the canonical authoring rule is
    "one base SVG per container, fill rendered at runtime from `material_name` +
    `material_volume`"; the "Convention scope: pipettes, microtubes, and wells" line
    expands to enumerate every kind that now uses the convention (bottle, flask,
    conical tube, waste container, electrophoresis chamber).
  - `docs/specs/OBJECT_VOCABULARY.md` updated to record the new validator rule and to
    cross-link the worked container example.
  - If `docs/specs/SVG_PIPELINE.md` documents the legacy variant pattern anywhere, that
    paragraph is replaced with a pointer to the new convention.
  - This plan moved from `docs/active_plans/material_overlay_vocabulary.md` to
    `docs/archive/material_overlay_vocabulary.md` (date-prefixed per
    `docs/REPO_STYLE.md` archive conventions).
  - `docs/CHANGELOG.md` close-out entry summarizes the four-milestone arc, lists the
    final asset-gap floor, and links the new spec text.
  - Obvious follow-on: open a follow-up TODO (or short plan) to harden
    `tests/test_object_asset_refs.py` from soft-reporter to hard `assert` once the
    non-liquid `_idle`/`_spinning`/`_open`/`_closed` slots also close.
- Parallel-plan ready: no -- single workstream, documentation-only.

## Workstream breakdown

### Workstream WS-AUDIT: Runtime overlay scope check + anchor inventory

- Owner: reviewer (read-only).
- Interfaces:
  - Needs: `content/objects/<kind>/*.yaml`, `assets/equipment/*.svg`, running game build
    for browser probe.
  - Provides: audit document with per-object base-asset choice + anchor gap list, consumed
    by every M2 workstream.
- Expected patches: 1.

### Workstream WS-ANCHORS: Base SVG anchor authoring

- Owner: coder.
- Interfaces:
  - Needs: WS-AUDIT anchor gap list plus the "anchor-authoring by shape" tally.
  - Provides: patched `assets/equipment/*.svg` files with bare `id="anchor_liquid_clip"`
    - `id="anchor_liquid_bounds"` rects (no prefix; the generator namespaces).
- Approach: Inkscape for shape-distinct SVGs; `tools/_temp_inject_liquid_anchors.py`
  helper for kinds with many similar shapes (e.g. cylindrical bottles), only if the
  audit tally shows the helper pays off. Helper, if built, lives under `tools/` and is
  reusable for future container additions.
- Expected patches: 1-2 (grouped by kind to keep diffs reviewable; helper script lands
  as its own small patch if used).

### Workstream WS-YAML: Object YAML rewrite

- Owner: coder.
- Interfaces:
  - Needs: WS-AUDIT base-asset list.
  - Provides: rewritten `content/objects/<kind>/*.yaml` files.
- Expected patches: 1-2 (containers + plate in one, pipettes + equipment in another).

### Workstream WS-VALIDATOR: Validator rule + unit tests

- Owner: coder.
- Interfaces:
  - Needs: agreed rule text (this plan).
  - Provides: extended `validation/yaml/object_validator.py` + new unit tests.
- Expected patches: 1.

### Workstream WS-PICKER: Manifest rebuild + gate threshold

- Owner: coder.
- Interfaces:
  - Needs: M2 landed (YAML edits in tree).
  - Provides: regenerated `tools/svg_picker/missing_targets.json`, lowered
    `BASELINE_MISSING_COUNT`.
- Expected patches: 1.

### Workstream WS-DOCS: Spec + changelog + plan archive

- Owner: doc author.
- Interfaces:
  - Needs: M3 landed.
  - Provides: spec edits, changelog entry, plan archive move.
- Expected patches: 1.

## Work packages

### Work package WP-AUDIT-1: Per-object base-asset + anchor-gap audit

- Owner: reviewer.
- Touch points: write only `docs/active_plans/material_overlay_audit_<DATE>.md`.
- Depends on: none.
- Acceptance criteria:
  - One markdown table lists every affected object YAML (path), proposed base
    `asset_name`, base SVG path on disk, "has anchors" boolean, and notes for the M2
    coders.
  - One short section records the future runtime contract this plan freezes (anchor ids
    authored as bare `anchor_liquid_clip` / `anchor_liquid_bounds`; runtime adds the
    `<asset_name>__` prefix at composition time; overlay color comes from
    `material_name` -> `display_color` lookup; level comes from `fill_height(state(...),
capacity=...)`). No live-runtime probe; rendering is the future runtime plan's
    responsibility.
  - One subsection tallies anchor-authoring work by SVG shape (e.g. "12 bottles, similar
    cylindrical body -- candidate for a `_temp.py` injection script", "4 flasks, each
    distinct -- manual Inkscape pass", "1 electrophoresis tank, two chambers -- manual").
    Used by WS-ANCHORS to decide where a helper script pays off.
- Verification commands:
  - `source source_me.sh && python3 tools/svg_picker/build_missing_targets.py` (regenerate
    manifest for cross-reference).
- Obvious follow-ons:
  - Link the audit doc from this plan.
  - Update `docs/CHANGELOG.md` under today's date with one line.

### Work package WP-ANCHORS-1: Add anchors to bottle / flask / conical base SVGs

- Owner: coder.
- Touch points: `assets/equipment/<bottle/flask/conical>_*.svg` per WS-AUDIT list.
- Depends on: WP-AUDIT-1.
- Acceptance criteria:
  - Every base SVG in the list carries bare `<rect id="anchor_liquid_clip">` and
    `<rect id="anchor_liquid_bounds">` (no `<asset_name>__` prefix; the generator /
    runtime adds it). Coordinate discipline matches the inner-container interior the
    same way `assets/equipment/sero_pipette.svg` shapes its pipette tube.
  - `tools/normalize_svg_v2.py` round-trip is clean (the post-anchor SVG normalizes
    without metadata loss).
- Verification commands:
  - `source source_me.sh && python3 tools/normalize_svg_v2.py --self-test`.
  - `source source_me.sh && python3 tools/normalize_svg_v2.py <each patched svg>`.
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md`.
  - Hand off WS-PICKER once WS-YAML and WS-VALIDATOR also land.

### Work package WP-ANCHORS-2: Add anchors to waste / electrophoresis-tank base SVGs

- Owner: coder.
- Touch points: `assets/equipment/<waste/electrophoresis>_*.svg` per WS-AUDIT list.
- Depends on: WP-AUDIT-1.
- Acceptance criteria: same as WP-ANCHORS-1.
- Verification commands: same as WP-ANCHORS-1.
- Obvious follow-ons: same as WP-ANCHORS-1.

### Work package WP-YAML-1: Rewrite container + plate-subpart YAMLs

- Owner: coder.
- Touch points: every `content/objects/bottle/*.yaml`,
  `content/objects/plate/well_plate_96.yaml`, and `content/objects/waste/*.yaml` listed
  in WS-AUDIT.
- Depends on: WP-AUDIT-1.
- Acceptance criteria:
  - Every `visual_states.material_name.cases[].output.asset_name` in the touched files
    resolves to the same base asset (one value per object).
  - `state_fields`, `material_volume` composite, capabilities, and layout blocks
    unchanged.
  - Existing validator (`object_validator.py`) still passes for every touched file.
- Verification commands:
  - `source source_me.sh && python3 validation/validate.py`.
  - `source source_me.sh && pytest tests/`.
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md`.

### Work package WP-YAML-2: Rewrite pipette + equipment-chamber YAMLs

- Owner: coder.
- Touch points: every `content/objects/pipette/*.yaml` plus
  `content/objects/equipment/electrophoresis_tank.yaml`.
- Depends on: WP-AUDIT-1.
- Acceptance criteria:
  - Every pipette `held_material_name.cases[].output.asset_name` resolves to a single base
    asset per pipette.
  - `electrophoresis_tank.yaml` collapses each chamber's variant pair independently
    (inner-chamber base, outer-chamber base).
- Verification commands: same as WP-YAML-1.
- Obvious follow-ons: same as WP-YAML-1.

### Work package WP-VALIDATOR-1: Add variant-collapse gate + unit tests

- Owner: coder.
- Touch points: `validation/yaml/object_validator.py`, new unit test file under
  `validation/yaml/tests/` (or wherever the validator's tests live -- match local
  convention).
- Depends on: WP-AUDIT-1 (need the rule text settled; the audit confirms validator scope).
- Acceptance criteria:
  - **Vocabulary rule** (hard fail): the validator pairs every
    `<prefix>material_volume` (or `<prefix>held_material_volume`) `fill_height(...)`
    composite with its same-prefix `<prefix>material_name` (or
    `<prefix>held_material_name`) visual_state, and rejects any object where the
    paired name-state's `cases[].output.asset_name` values are not all identical.
    Pairing is by shared field-name prefix so `inner_chamber_material_name`/
    `inner_chamber_material_volume` and `outer_chamber_material_name`/
    `outer_chamber_material_volume` validate independently inside
    `electrophoresis_tank.yaml`. The empty prefix (`material_name` /
    `material_volume`) is the common bottle/flask/waste case.
  - **`empty` semantics** (explicit in error messages + spec): the sentinel value
    `empty` may point to the SAME base asset as every non-empty material value; the
    runtime is expected to skip the liquid overlay when `material_name == empty` or
    `material_volume == 0`. The validator does not require a separate base SVG for
    the `empty` case.
  - **Asset-readiness check** (soft report initially, hard fail after WS-ANCHORS lands):
    for every object whose vocabulary rule passes, open the collapsed base SVG and
    confirm both `id="anchor_liquid_clip"` and `id="anchor_liquid_bounds"` appear
    (authored as bare ids, not pre-prefixed). On miss, report the SVG path + missing
    anchor name; do not fail the validator yet so WS-YAML can land before
    WS-ANCHORS completes.
  - Unit tests cover: (a) collapsed YAML passes vocabulary rule, (b) fan-out is
    rejected with expected message, (c) electrophoresis-tank dual-chamber YAML
    validates per-prefix correctly, (d) an object whose paired composite is absent
    is exempt from the vocabulary rule (intentional non-liquid material art stays
    legal).
  - Existing validator unit tests still pass.
- Verification commands:
  - `source source_me.sh && pytest validation/`.
  - `source source_me.sh && python3 validation/validate.py` (full pass over
    `content/objects/`).
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md`.

### Work package WP-PICKER-1: Rebuild missing-targets manifest + lower gate baseline

- Owner: coder.
- Touch points: `tools/svg_picker/missing_targets.json` (regenerated, gitignored),
  `tools/svg_picker/suggestions.json` (regenerated, gitignored),
  `tests/test_object_asset_refs.py` (lower `BASELINE_MISSING_COUNT`).
- Depends on: WP-YAML-1, WP-YAML-2 (need both rewrites in tree).
- Acceptance criteria:
  - `source source_me.sh && python3 tools/svg_picker/build_missing_targets.py` prints a
    count strictly less than 74 and equal to the new floor.
  - `BASELINE_MISSING_COUNT` in `tests/test_object_asset_refs.py` matches the new printed
    count.
  - `pytest tests/test_object_asset_refs.py -v` exits 0 and prints the new gap list.
- Verification commands:
  - `source source_me.sh && python3 tools/svg_picker/build_missing_targets.py`.
  - `source source_me.sh && python3 tools/svg_picker/build_ranked_suggestions.py`.
  - `source source_me.sh && pytest tests/test_object_asset_refs.py -v`.
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md` with old vs new gap floor.

### Work package WP-DOCS-1: Spec rewrite + plan archive + changelog close-out

- Owner: doc author.
- Touch points: `docs/specs/MATERIAL_CONVENTION.md`, `docs/specs/OBJECT_VOCABULARY.md`,
  optionally `docs/specs/SVG_PIPELINE.md`; this plan moves from `docs/active_plans/` to
  `docs/archive/`; `docs/CHANGELOG.md`.
- Depends on: WP-PICKER-1.
- Acceptance criteria:
  - Canonical rule in `MATERIAL_CONVENTION.md` reads: "Each container or pipette is
    rendered from a single base SVG; the runtime overlays liquid fill from `material_name`
    - `material_volume` (or `held_material_name` + `held_material_volume`) via
      `anchor_liquid_clip` and `anchor_liquid_bounds`." The "Convention scope" line lists
      every kind now bound by this rule.
  - Anchor-id boundary documented explicitly: authored SVG carries bare
    `id="anchor_liquid_clip"` / `id="anchor_liquid_bounds"`; the generator (and the
    future runtime) is responsible for namespacing them to
    `<asset_name>__anchor_liquid_clip` at composition time. Authors never type the
    prefix.
  - `empty` semantics documented: the sentinel `empty` may resolve to the same base
    asset as every non-empty material; runtime is expected to skip the overlay when
    `material_name == empty` or `material_volume == 0`. Spec example shows the
    single-asset case explicitly.
  - `OBJECT_VOCABULARY.md` records the new validator rule (one base asset per material
    enum) and cross-links one worked example.
  - This plan archived to `docs/archive/material_overlay_vocabulary.md` via `git mv`.
  - `docs/CHANGELOG.md` close-out entry summarizes the arc and links the final gap floor.
- Verification commands:
  - `source source_me.sh && pytest tests/test_markdown_links.py`.
- Obvious follow-ons:
  - Open a short TODO in `docs/TODO.md` to harden
    `tests/test_object_asset_refs.py` to a hard `assert` once the non-liquid variant slots
    (`_idle`, `_spinning`, `_open`, `_closed`, `_with_lid` family) also close.

## Acceptance criteria and gates

- Per-patch gate: validator + full pytest pass; `docs/CHANGELOG.md` updated.
- Integration gate after M2: every YAML touched validates;
  `source source_me.sh && python3 validation/validate.py` exits 0 across
  `content/objects/`. No runtime smoke (deferred to the future runtime plan).
- M3 gate: `tests/test_object_asset_refs.py` reports the new (lower) floor; picker
  `missing_targets.json` count matches the new floor.
- M4 close-out gate: spec docs describe the new rule; this plan archived; changelog entry
  links the final floor.

## Test and verification strategy

- Unit: validator unit tests (positive + negative variant-collapse cases) under
  `validation/yaml/tests/`.
- Integration: `source source_me.sh && python3 validation/validate.py` passes on the full
  `content/objects/` tree after each WS-YAML and WS-VALIDATOR patch.
- Regression: `pytest tests/` green after every patch; in particular
  `tests/test_object_asset_refs.py`, validator tests, and any pipette/well runtime tests
  that exercise the overlay path.
- Browser evidence: none in scope. The runtime composite handler is deferred to a
  separate in-flight plan; its plan will own rendering tests when it ships.
- Picker manifest regeneration is a verification gate, not a release gate: stale manifests
  are local artifacts (`tools/svg_picker/*.json` are gitignored), so the only release
  evidence is the lowered `BASELINE_MISSING_COUNT` in the committed test.

## Migration and compatibility policy

- Additive within each milestone: every patch is reviewable on its own and reverts cleanly.
- YAML rewrite is the only schema-shape change for authors. The validator gate ships in
  the SAME milestone (M2) so re-introduction of the variant pattern fails at authoring
  time, not silently.
- No deprecation window for `_empty`/`_filled`/`_with_<material>` asset names: those
  names never appear on disk in `assets/equipment/`, only in YAML cases that point at
  missing files. The picker queue already treats them as missing; the post-collapse
  rewrite makes them unreferenced and the picker stops listing them.
- Rollback: each YAML rewrite + anchor patch + validator patch is one git commit. Revert
  the chain (or any subset) cleanly; the validator gate revert restores authoring
  flexibility but reopens the smell.
- Sentinel allowlist (`empty`, `mixed`, `cells`, `formazan`, `waste_*`) is untouched.
- No `schema_version` or version-token churn per `docs/PRIMARY_SPEC.md` "No schema
  version".

## Risk register

| Risk                                                                                                          | Impact | Trigger                                                                                                                                         | Owner      | Mitigation                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future runtime adopts a different anchor convention than this plan assumes                                    | Medium | Runtime plan ships expecting bare or differently-namespaced ids that don't match `<asset_name>__anchor_liquid_clip` after generator namespacing | reviewer   | This plan locks the convention in `MATERIAL_CONVENTION.md` (WP-DOCS-1): authors write bare ids, generator/runtime adds `<asset_name>__` prefix. Runtime plan inherits this contract; if it needs a different one, surface during runtime-plan review, not after assets ship. |
| Future runtime ships before this plan and re-introduces the variant pattern                                   | Low    | Runtime plan adds rendering for `_empty`/`_filled` baked variants                                                                               | reviewer   | The validator gate (WP-VALIDATOR-1) blocks YAML drift back to variants; cross-link from the runtime plan once it appears.                                                                                                                                                    |
| Existing base SVGs lack space for anchor rects (artwork crowded)                                              | Medium | WS-ANCHORS coder cannot place `anchor_liquid_bounds` inside the container interior                                                              | coder      | Pick a different Servier candidate from the picker pool and re-do anchor authoring; document the chosen alternative in WS-AUDIT.                                                                                                                                             |
| Picker SVG candidate already chosen (or already shipped) for `bottle_empty` becomes wrong base after collapse | Medium | WP-PICKER-1 regen reveals a dangling `assets/equipment/bottle_empty.svg` on disk                                                                | coder      | Delete the now-unreferenced SVG via `git rm`; record in changelog (prior memory: prefer `git rm` over `archive/` for retired content).                                                                                                                                       |
| Validator new rule rejects an object outside the audit list (false positive elsewhere)                        | Medium | `python3 validation/validate.py` fails on an unrelated YAML                                                                                     | coder      | Fix the YAML if it's the same variant smell; if not, narrow the validator rule's predicate to the `material_volume` + `fill_height` combination only.                                                                                                                        |
| `well_plate_96.yaml` subpart pattern interacts oddly with `applies_to: subpart`                               | Medium | Validator passes but runtime renders empty wells incorrectly                                                                                    | tester     | WS-SMOKE includes one well-plate state in the assertion set; if it fails, escalate to a runtime plan rather than patch the YAML around it.                                                                                                                                   |
| Anchor authoring breaks existing pipette / well overlay path (collision with prefix rule)                     | Low    | Existing pipette Playwright tests fail after WP-ANCHORS-1 lands                                                                                 | coder      | WP-ANCHORS-1 must not touch pipette or well SVGs (out of scope); CI runs the existing pipette smoke as a guard.                                                                                                                                                              |
| (Per-chamber pairing risk moved into WP-VALIDATOR-1 acceptance criteria; no longer a separate risk.)          | --     | --                                                                                                                                              | --         | --                                                                                                                                                                                                                                                                           |
| Spec change conflicts with an in-flight plan elsewhere                                                        | Low    | WP-DOCS-1 conflicts on `MATERIAL_CONVENTION.md`                                                                                                 | doc author | Resolve via plain merge; this plan owns the canonical rule rewrite.                                                                                                                                                                                                          |

## Rollout and release checklist

- [ ] M1 exit met (audit doc landed, future runtime contract recorded, anchor-shape tally written).
- [ ] M2 exit met (YAML rewrite + anchors + validator rule all landed, validator gate
      green across `content/objects/`).
- [ ] M3 exit met (picker manifest regenerated, `BASELINE_MISSING_COUNT` lowered).
- [ ] M4 exit met (spec docs rewritten, plan archived, changelog close-out).
- [ ] Follow-up TODO opened to harden gate test from soft-reporter to hard `assert` once
      non-liquid variants also close.

## Documentation close-out requirements

- Active plan: this file lives at `docs/active_plans/material_overlay_vocabulary.md`
  through M3; WS-DOCS moves it to `docs/archive/material_overlay_vocabulary.md` at M4.
- Audit doc: `docs/active_plans/material_overlay_audit_<DATE>.md` written in WP-AUDIT-1;
  optionally archived alongside this plan at M4.
- `docs/CHANGELOG.md`: per-patch entries under today's `## YYYY-MM-DD` heading, plus a
  close-out entry at M4 summarizing the arc.
- `docs/specs/MATERIAL_CONVENTION.md`, `docs/specs/OBJECT_VOCABULARY.md`: rewritten in
  WP-DOCS-1 to make single-base + overlay the documented authoring rule.

## Patch plan and reporting format

- Patch 1 (M1): WP-AUDIT-1 audit doc.
- Patch 2 (M2): WP-ANCHORS-1 bottle/flask/conical SVG anchors.
- Patch 3 (M2): WP-ANCHORS-2 waste / electrophoresis-tank SVG anchors.
- Patch 4 (M2): WP-YAML-1 container + plate YAML rewrite.
- Patch 5 (M2): WP-YAML-2 pipette + equipment-chamber YAML rewrite.
- Patch 6 (M2): WP-VALIDATOR-1 validator rule + unit tests.
- Patch 7 (M3): WP-PICKER-1 manifest rebuild + gate baseline lowered.
- Patch 8 (M4): WP-DOCS-1 spec rewrite + plan archive + changelog close-out.

(Patches 2-6 can interleave in any order once M1 is in; Patch 7 waits on M2; Patch 8
waits on M3. Cadence: one or two patches per coder per session, sized to keep diffs
reviewable.)

## Open questions and decisions needed

- Where do the validator unit tests live? `validation/yaml/tests/` is the natural home if
  it exists; if not, follow the local convention. Decision owner: WS-VALIDATOR coder
  after a one-minute look. Default: place beside the existing object validator tests.
- For `well_plate_96.yaml`'s subpart visual_state, does the validator rule apply
  per-subpart or per-object? Decision owner: WS-VALIDATOR coder after reading the
  subpart resolution logic. Default: per-subpart (so the rule says "every
  `material_name` case for the well subpart resolves to one base asset").
- `mtt_solution_bottle.yaml` references the generic `bottle_empty`/`bottle_filled`
  asset names; the collapse target is `bottle.svg`, but multiple objects share that
  base. Confirm during WS-AUDIT that one shared base SVG is the intended outcome (it
  is, per `SVG_PIPELINE.md` reuse rules). Decision owner: reviewer in WP-AUDIT-1.
- Anchor coordinates for existing artwork-heavy SVGs: do we author the rects via
  Inkscape (manual) or via a `_temp.py` script that injects `<rect>` elements at
  the centroid of the largest path's bounding box? Decision owner: WS-ANCHORS coder
  on first SVG; default to Inkscape for the first 3, evaluate, then script the rest.

## Resolved decisions

- Variant collapse is the durable fix; the picker quick-patch (duplicate one SVG into
  both `_empty` and `_filled` filenames) is rejected per `docs/REPO_STYLE.md`
  "Long-term over short-term" and "Fix the design, not the symptom".
- No live TypeScript runtime today. Per user direction: the composite/overlay handler
  will land in a separate in-flight plan. This plan prepares vocabulary + assets +
  validator + picker so the future runtime adopts the convention without rework. Browser
  smokes are deferred to that runtime plan.
- Authored SVG carries **bare** `id="anchor_liquid_clip"` and `id="anchor_liquid_bounds"`.
  The generator / future runtime is responsible for namespacing to
  `<asset_name>__anchor_liquid_clip` at composition time. Authors never type the prefix.
- Validator separates two failure classes: vocabulary error (variant fan-out) is a hard
  fail; asset-readiness (missing anchor) is a soft report until WS-ANCHORS completes,
  then hardens.
- Per-chamber validator pairing (`inner_chamber_material_name` <->
  `inner_chamber_material_volume`) is in WP-VALIDATOR-1 acceptance criteria, not a
  separate risk row.
- The sentinel `empty` value may share the base asset with every non-empty material;
  the runtime is expected to skip the overlay when `material_name == empty` or
  `material_volume == 0`. Documented in the spec and explicit in the validator's
  error messages.
- WS-ANCHORS uses Inkscape for shape-distinct SVGs and an optional
  `tools/_temp_inject_liquid_anchors.py` helper for kinds with many similar shapes (only
  if the audit tally shows the helper pays off).
- No new authoring vocabulary surface: existing
  `visual_states.material_volume.kind: composite` + `fill_height(...)` already expresses
  the overlay intent (`bme_bottle.yaml:27-29`, `t75_flask.yaml:38-40`). Adding a `render`
  block would expand the authoring surface for no semantic gain.
- The validator gate is in scope for this plan (not a follow-up). Without it the smell
  re-enters silently the next time an author wants per-state artwork.
- Non-liquid variants (`_idle`, `_spinning`, `_open`, `_closed`, `_with_lid`,
  `_with_module`, `_without_lid`, `_without_module`) are out of scope. Those need a
  separate vocabulary for motion / hardware-configuration state and a different overlay
  or sprite strategy.
- Sentinel allowlist unchanged (`empty`, `mixed`, `cells`, `formazan`, waste sinks per
  `MATERIAL_CONVENTION.md:126-142`).
- `BASELINE_MISSING_COUNT` lowers in this plan but the gate stays soft-reporter; the
  hard `assert` transition is a separate plan that waits for non-liquid variants to
  close.
- Retired SVG variant files (if any are already on disk under `assets/equipment/`) are
  deleted via `git rm`, not moved to `archive/`, per the prior memory on archive policy.
