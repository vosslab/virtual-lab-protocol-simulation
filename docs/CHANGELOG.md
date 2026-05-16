# Changelog

## 2026-05-15 (Capability snake_case purism + active-plans triage)

### Behavior or Interface Changes

- Retired the last camelCase capability ids and template variables.
  Scene capability values renamed in `content/scenes/bench_basic.yaml`
  and `content/scenes/hood_basic.yaml`: `itemWorkspace` ->
  `item_workspace`. `wrong_order_message.template` placeholder
  `{expectedLabel}` -> `{expected_label}`. Spec docs touched:
  `SCENE_YAML_FORMAT.md`, `SCENE_ARCHITECTURE.md`, `CODE_ARCHITECTURE.md`.
  The legacy camelCase capability id family (`modalWorkspace`,
  `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`,
  `plateReaderWorkspace`, `liquidTransfer`) is renamed in lockstep
  across the same docs.
- `tests/test_spec_vocabulary.py` G9 `CAPABILITY_ID_ALLOWLIST` retired
  to an empty `frozenset()`. G9 scanner now flags every camelCase
  capability id. 9/9 spec vocabulary gates green.
- Three additional active plans archived after the YAML / scene-inheritance /
  docs-org work landed:
  - `docs/active_plans/protocol_entry_audit.md` ->
    `docs/archive/protocol_entry_audit.md` (explicitly superseded by
    the Class I `entry_step` sweep).
  - `docs/active_plans/scene_inheritance_migration.md` ->
    `docs/archive/scene_inheritance_migration.md` (content-side shipped;
    runtime alignment moves to `typescript_migration_plan.md`).
  - `docs/active_plans/docs_folder_organization_plan.md` ->
    `docs/archive/docs_folder_organization_plan.md` (specs +
    protocols moves shipped; `docs/architecture/` subfolder and
    `QTI_v3_SPEC.md` relocation **decided against**).

### Fixes and Maintenance

- Markdown link gate (`pytest tests/test_markdown_links.py`) green
  after every cross-link rewrite implied by the archive moves.

## 2026-05-15 (M3 close-out: content YAML reauthoring plan archived)

### Behavior or Interface Changes

- Archived `docs/active_plans/content_yaml_migration_plan.md` to
  `docs/archive/content_yaml_migration_plan.md` via `git mv`. The plan's
  structural milestones (M1 pilot, M2 full object library + scene
  inheritance, M3 sequence runner + validator sweep) are closed.
  Validator gates green: 55 files across four vocabularies (34 objects,
  2 base scenes, 6 protocol scenes, 6 materials, 7 protocols).
- `AGENTS.md` "Core rules" pointer updated:
  `docs/specs/LIQUID_CONVENTION.md` -> `docs/specs/MATERIAL_CONVENTION.md`;
  rule expanded from "Liquids follow..." to "Materials (liquids,
  mixtures, suspensions, waste) follow...". Reflects the four-vocabulary
  authoring model (protocol, object, scene, material) ratified earlier
  today.

### Decisions and Failures

- Closed scope of `sorted-snacking-kettle` plan:
  - M1 / M2 / M3 structural milestones shipped (object library, scene
    inheritance, sequence runner, four-class validator).
  - **Deferred to follow-on plan(s):**
    1. Pedagogy reauthoring pass per WP-MP-* (T-1..T-23 reauthoring
       rules in the archived plan). Structural conformance shipped;
       deep step rewrites from `docs/protocols/OVCAR8_*.md` are not yet
       done.
    2. Cross-workspace `SceneChange` wiring (hood / bench / microscope /
       centrifuge / plate_reader transitions). Needs `src/scene_runtime/`
       alignment, expected to live in a separate runtime-alignment plan.

### Fixes and Maintenance

- Stale `LIQUID_CONVENTION.md` links repaired across 6 docs
  (`CHANGELOG-2026-05c.md`, `FILE_STRUCTURE.md`, `PRIMARY_CONTRACT.md`,
  `PRIMARY_DESIGN.md`, `SCENE_VOCABULARY.md`, archived
  `content_yaml_migration_plan.md`). `pytest tests/test_markdown_links.py`
  passes.

## 2026-05-15 (validator: colored compiled summary tail)

### Additions and New Features

- Added `tools/validators/compiled_summary.py`: aggregates tree-level counts
  across the four authoring vocabularies (objects, scenes, materials, protocols)
  from the already-built `ContentDatabase` plus the protocol / protocol-scene /
  material rows loaded during the existing whole-tree walk. No second YAML pass.
- Wired into `tools/validate_content_yaml.py::validate_whole_tree`: renders
  four `rich.panel.Panel` blocks above the existing terse `Validated N files ...`
  summary line. Color is forced via
  `Console(force_terminal=True, color_system="truecolor")`. No new argparse
  flags. `-q` still silent on success.
- Extracted shared `_protocol_counts` helper in `tools/validators/summary.py`;
  used by both `print_protocol_summary` (per-file `-v` printer) and the new
  compiled summary aggregator.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits clean.
  Four colored panels render above terse summary line. `pytest
  tests/test_pyflakes_code_lint.py` and `pytest
  tests/test_import_requirements.py` green. `rich` is supplied by
  `pip_requirements-dev.txt` (devel tools).

## 2026-05-15 (Vocabulary rename: contents -> materials; fourth small authoring vocabulary)

### Behavior or Interface Changes

- **Authoring vocabulary expanded from three to four**: protocol, object,
  scene, **material**. A material is anything physically present in, on,
  produced by, removed from, or transferred between objects (reagents,
  media, cells, mixtures, suspensions, waste). Objects remain interactable
  rendered things; materials are what objects hold or carry. Decision
  rationale: previous `contents` name overlapped with the `content/` folder
  and read as a subset of "object", obscuring that materials are their own
  small vocabulary surface.
- **File rename, 6x**: `content/protocols/<name>/contents.yaml` ->
  `content/protocols/<name>/materials.yaml` via `git mv`. Top-level YAML
  key `contents:` -> `materials:` in every file.
- **State field rename**: `contents_name` -> `material_name`,
  `contents_volume` -> `material_volume`, `held_contents_name` ->
  `held_material_name`, `held_contents_volume` -> `held_material_volume`.
  Applied across 24 object YAMLs and 6 protocol YAMLs.
- **Capability rename**: `contents_container` -> `material_container`
  (object closed-set capability).
- **Spec doc rename**: `docs/specs/LIQUID_CONVENTION.md` ->
  `docs/specs/MATERIAL_CONVENTION.md` via `git mv`. The doc now opens with
  a `## Material vs object` section defining materials as a first-class
  fourth authoring vocabulary, plus a `## Materials YAML schema` section
  hosting the canonical closed schema (label + display_color required, no
  optional keys, no `material_kind` enum until a non-liquid material needs
  it). The pipette-fill rendering content is preserved as a subsection
  because liquid remains the most common material state.
- **Validator updates**: `T1_CONTENTS_REF` finding tag renamed to
  `T1_MATERIAL_REF`. New `MaterialValidator` class enforces the closed
  schema (top-level `materials:` only; per-entry only `label` +
  `display_color`; snake_case material names; hex color format).
  `validate_content_yaml.py` gains `-m` / `--material` CLI flag and
  validates materials in the whole-tree sweep. `ContentDatabase.resolve_contents`
  -> `resolve_material`; `contents_by_protocol` -> `materials_by_protocol`.

### Fixes and Maintenance

- Updated 12 spec / design docs to the new vocabulary
  (`MATERIAL_CONVENTION.md`, `OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`,
  `PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_VOCABULARY.md`,
  `PROTOCOL_YAML_FORMAT.md`, `SCENE_YAML_FORMAT.md`,
  `SPEC_DESIGN_CHECKLIST.md`, `TARGET_FILE_STRUCTURE.md`,
  `PRIMARY_SPEC.md`, `CODE_ARCHITECTURE.md`).
- Validator green at 55 files, 0 failures: 34 objects, 2 base scenes,
  6 protocol scenes, 6 materials, 7 protocols.

### Decisions and Failures

- Decided: stay minimal on the material schema. `material_kind` enum
  (liquid, solid, gel, powder) deliberately not authored until a real
  non-liquid material needs distinct behavior. Two fields only:
  `label`, `display_color`.
- Decided: rename `LIQUID_CONVENTION.md` to `MATERIAL_CONVENTION.md`.
  "Liquid" lives on as a material state in prose, not as the doc
  boundary. The pipette-fill rendering convention remains in this doc
  because liquid is the only currently-rendered material state.
- Decided: keep volume field as `material_volume`, not `liquid_volume`.
  When a future solid or powder material needs a different physical
  field, it adds a new flat field (e.g. `material_mass`) rather than
  renaming `material_volume`.

## 2026-05-15 (M2 scenes: bench_basic base + 5 inherited protocol scenes)

### Additions and New Features

- Promoted `content/scenes/bench_basic.yaml` as a shared base scene. Used
  by five mini-protocols (cell_counting_and_seeding, drug_dilution_setup,
  mtt_assay_readout, plate_drug_treatment, and the bench-side steps of
  cell_culture), satisfying the promotion rule in
  `docs/specs/SCENE_INHERITANCE.md`. Placement set is intentionally
  minimal: waste container rear-left, vortex rear-right; per-protocol
  scenes layer the working inventory on top via `add_placements`.
- Authored five inherited protocol scenes per the pilot pattern:
  - `content/protocols/cell_culture/scenes/hood_setup.yaml` (extends
    `hood_basic`)
  - `content/protocols/cell_counting_and_seeding/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/drug_dilution_setup/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/mtt_assay_readout/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/plate_drug_treatment/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  Each scene uses only the four allowed protocol-scene operations
  (currently just `add_placements`), one inheritance level, and stable
  `placement_name` values per `SCENE_INHERITANCE.md`. Cross-workspace
  transitions (e.g. centrifuge inside cell_culture) are deferred to a
  future expansion that wires `SceneChange` per `PRIMARY_SPEC.md`.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits
  clean. 49 files validated (34 objects, 2 base scenes, 6 protocol
  scenes, 7 protocols). 0 failures.

## 2026-05-15 (sequence runner: cell_culture_full authored, validator passes 7 protocols)

### Additions and New Features

- Authored `content/protocols/cell_culture_full/protocol.yaml` as the
  pathway-level sequence runner. Declares `protocol_type: sequence_runner`,
  carries a pathway-scoped `learning` block (using the sequence-runner
  leading phrases per `LEARNING_SEQUENCE_RUNNER_PREFIXES`), and lists the
  six constituent mini-protocols in pedagogical order
  (cell_culture, hood_flask_prep, cell_counting_and_seeding,
  drug_dilution_setup, plate_drug_treatment, mtt_assay_readout).
- Added `mini_protocols` to `PROTOCOL_OPTIONAL_KEYS` in
  `tools/validators/constants.py`. Sequence runners declare this ordered
  constituent list instead of authored `steps`, per the
  `## Sequence runners` section of `docs/PRIMARY_SPEC.md`.

### Behavior or Interface Changes

- `ProtocolValidator` now enforces required slots per protocol type:
  `sequence_runner` requires `mini_protocols` (non-empty list of known
  protocol names); every other protocol type requires `steps`. Step-shape
  and step-count gates apply to `mini_protocol`/`protocol`/`dev_smoke`
  only. A new `_validate_sequence_runner` method walks the constituent
  list and emits an error per unresolved name (cross-checked against
  `ContentDatabase.protocols`).
- `PROTOCOL_REQUIRED_KEYS` shrank to the universal set
  (`protocol_type`, `protocol_name`, `entry_step`, `learning`). Per-type
  branches enforce the additional required slot.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits
  clean. 43 files validated (34 objects, 1 base scene, 1 protocol scene,
  7 protocols including the new sequence runner). 0 failures.

## 2026-05-15 (content YAML drift cleanup: validator green on full content/ tree)

### Behavior or Interface Changes

- Renamed `state_fields[*].name` -> `state_fields[*].field_name` across every
  `content/objects/*.yaml` (63 renames in 31 files) to match the ratified
  `OBJECT_YAML_FORMAT.md` schema. Validator now passes T1_STATE_FIELD on every
  declared field.
- Renamed protocol top-level `name:` -> `protocol_name:` across all six
  mini-protocols. Renamed every step's `name:` -> `step_name:` (46 step
  renames). Renamed `plate_drug_treatment.parts[*].dayId` -> `day_name`
  (4 renames, T-10 camelCase rule in plan
  `sorted-snacking-kettle.md`).

### Additions and New Features

- Added new declared `state_fields` to objects authored as required by
  protocol writes: `hemocytometer.{contents_name, contents_volume}`,
  `t75_flask.inspection_status`, `t75_flask_new.incubation_status`,
  `media_bottle.temperature_status`, `water_bath.stage`,
  `well_plate_96.{inspection_status, dosing_status}`.
- Expanded enum `allowed` lists on liquid-bearing objects so the values
  protocols write are declared: `conical_15ml.contents_name`
  (cell_suspension, cell_pellet); `serological_pipette.held_contents_name`
  (cell_suspension); `micropipette.held_contents_name`
  (cell_suspension, carboplatin_10mM, metformin_1M);
  `microscope.objective` (high_power);
  `microtube_15ml_intermediate.contents_name` (carboplatin_400uM);
  `metformin_working_tube.contents_name` (metformin_10mM);
  `aspirating_pipette.held_contents_name` (mtt);
  `biohazard_decant.contents_name` (mtt);
  `multichannel_pipette.held_contents_name` (carboplatin, metformin).
- Added missing per-protocol contents entries: `cells` in
  `cell_culture/contents.yaml`; `drug_combo` in
  `plate_drug_treatment/contents.yaml`.

### Fixes and Maintenance

- Fixed validator bug: `ObjectStateChange` now resolves against the op-level
  `target` when present, falling back to the interaction-level `target`.
  Previously the validator conflated where the student clicked with which
  object the op mutated, producing spurious T1_STATE_FIELD failures.
  Single-fix delta: 123 -> 47 findings.
- `T1_CONTENTS_REF` now treats `'empty'` and `'mixed'` as universal sentinel
  values (per `OBJECT_VOCABULARY.md`) and skips the contents-registry lookup
  for those. Bulk-write a sentinel without polluting `contents.yaml`.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits clean.
  42 files validated (34 objects, 1 base scene, 1 protocol scene, 6 protocols).
  0 failures.

## 2026-05-15 (content YAML snake_case sweep: zero camelCase across content tree)

### Behavior or Interface Changes

- Renamed `displayColor:` -> `display_color:` across every per-protocol
  `contents.yaml` (32 sites in 6 files).
- Dropped retired `colorKey:` field from every contents entry (15 sites in
  2 files). Color is derived from `contents_name` + the object's
  `visual_states`, per T-3 in plan `sorted-snacking-kettle.md`.
- Renamed scientific-unit contents identifiers to pure snake_case to drop
  the embedded uppercase molar suffixes (mM, uM, M):
  `carboplatin_10mM` -> `carboplatin_10mmol`,
  `carboplatin_400uM` -> `carboplatin_400umol`,
  `metformin_10mM` -> `metformin_10mmol`,
  `metformin_1M` -> `metformin_1mol`. Applied across
  `drug_dilution_setup/contents.yaml`, `drug_dilution_setup/protocol.yaml`
  state writes, and the matching object enum `allowed:` lists on
  `micropipette`, `microtube_15ml_intermediate`, `metformin_working_tube`.

### Developer Tests and Notes

- A walk of every `content/**/*.yaml` confirms no key contains any ASCII
  uppercase character. Validator still passes 42 files, 0 failures.

## 2026-05-15 (spec consistency pass: PRIMARY*.md and docs/specs/ contradictions reconciled)

### Behavior or Interface Changes
- **`docs/specs/PROTOCOL_AUTHORING_GUIDE.md`** (F1): replaced stale "`entry` block that declares the initial scene and first step" wording with the canonical "top-level `entry_step` field" statement. Protocol has no `entry` block and declares no opening scene; scene context comes from the first step's interactions and any `SceneChange` operation in their responses.
- **`target_groups` term retired across all canonical specs** (F2 expanded): per user direction, the term is not part of the vocabulary at all -- not deferred, not retired-with-successor, just absent. Purged from `docs/PRIMARY_SPEC.md`, `docs/specs/OBJECT_VOCABULARY.md`, `docs/specs/OBJECT_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md`, `docs/specs/SCENE_VOCABULARY.md`, `docs/specs/SCENE_YAML_FORMAT.md`, `docs/specs/SPEC_DESIGN_CHECKLIST.md`. Deleted the "Named groups deferred" subsections (OBJECT_VOCABULARY, OBJECT_YAML_FORMAT) and the SCENE_VOCABULARY "retired" paragraph. Replaced with "the vocabulary has no named-group construct"; the explicit-subpart pattern (`treatment_plate.A1`, ...) remains the only mechanism. Removed `target_groups` from every placement-may-not-override list. Validator gate in OBJECT_YAML_FORMAT now reads "unknown structure keys rejected" rather than a `target_groups`-specific rejection.
- **`docs/PRIMARY_SPEC.md` walker bullet** (F1 follow-on): "starts in the protocol's declared entry scene" replaced with "starts in the scene reached by the protocol's `entry_step` (resolved through that step's target adapter or a `SceneChange` operation)". Removes self-contradiction with the no-scene-at-protocol-level rule.
- **6-to-10 step "gate" softened to "guideline"** (F5): `docs/PRIMARY_SPEC.md` (two occurrences), `docs/PRIMARY_DESIGN.md`, and `docs/specs/PROTOCOL_VOCABULARY.md` updated. Sequence runners and `dev_smoke` remain exempt; wording now matches descriptive (not enforcement) language in PROTOCOL_VOCABULARY.
- **Render-layer primitive home moved to `docs/specs/OBJECT_VOCABULARY.md`** (F7): `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, `SetPointDisplayChange` are now canonically described in the `visual_states` section of `OBJECT_VOCABULARY.md`, including the `ObjectStateChange` boundary and the flat state fields it writes. `docs/specs/SCENE_YAML_FORMAT.md` shrunk to a one-line pointer.

### Decisions and Failures
- **F3 (asset SVG path scope)**: user chose to keep `assets/` as the parent scope in `PRIMARY_CONTRACT.md`. `assets/equipment/` in `SVG_PIPELINE.md` is a valid subdir, no edit required.
- **F4 (learning-block leading phrases)**: false positive on initial audit. `docs/specs/PROTOCOL_YAML_FORMAT.md` already quotes the three exact required phrases verbatim in its schema table.
- **F6 (`background` locked-field)**: false positive on initial audit. `docs/specs/SPEC_DESIGN_CHECKLIST.md` rule 20 already lists `background` among locked fields.
- **F8 (canonical `contents.yaml` path)**: not addressed this pass. `OBJECT_VOCABULARY.md` and `PRIMARY_DESIGN.md` reference a `contents.yaml` registry without a canonical path; resolve in a follow-up doc edit.

### Removals and Deprecations
- **All "deferred" / "reserved" / "not yet implemented" markers purged from canonical specs.** Per user direction, vocabulary docs state present tense only; no future-work hatches in spec surface. Changes:
  - `structure.layout: custom` enum value removed. `structure.layout` accepts only `grid` or `list`. Updated in `docs/specs/OBJECT_VOCABULARY.md` and `docs/specs/OBJECT_YAML_FORMAT.md`.
  - `liquidTransfer` capability id retired entirely (not declared by any scene, no module registered). Removed from `docs/specs/SCENE_YAML_FORMAT.md` and `docs/specs/SCENE_ARCHITECTURE.md` capability tables, from `tools/build_scene_data.py` `VALID_CAPABILITY_IDS`, and from `tests/test_spec_vocabulary.py` G9 allowlist.
  - "RESERVED" status column entries on five capability rows (`modalWorkspace`, `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`, `plateReaderWorkspace`) replaced with present-tense "Validates `scene_name` only" or equivalent.
  - `wrongOrderMessage` RESERVED-for-future-wiring note dropped from `SCENE_ARCHITECTURE.md` (the field's authoring surface remains documented).
  - `workspace` field "reserved for future runtime use" dropped from `SCENE_VOCABULARY.md`; now describes present-tense behavior.
  - "Future work" and "Out of scope" sections deleted from `SCENE_INHERITANCE.md`; replaced with present-tense "Inheritance depth" statement (one level, no multi-level).
  - "Referenced interaction names are deferred" removed from `PROTOCOL_VOCABULARY.md`; replaced with "Interactions are not addressable by name."
  - "Candidate future primitive `DataReadout`/`InstrumentReadDisplayChange`" paragraph deleted from `PROTOCOL_VOCABULARY.md`; instrument-produced data stays `feedback`-only.
  - "Complex branching is deferred" softened to present-tense statement: `outcome` mapping carries no `on_hint_requested`, no `branches`, no adaptive review.
  - "or marked deferred and excluded from current authoring" exit hatch removed from `docs/PRIMARY_DESIGN.md` closure-over-openness principle. Every container must have a closed schema, no exceptions.
  - `docs/specs/SPEC_DESIGN_CHECKLIST.md` rule 2 and smell-class table row dropped the "OR be explicitly marked future/deferred" clause.
  - "Named groups are deferred" purged everywhere it lingered (12+ residual mentions across all canonical specs). Replaced with "the vocabulary has no named-group construct".
  - `effects.ts` reference deleted from `SCENE_ARCHITECTURE.md` Bench scene row (file does not exist).

## 2026-05-15 (spec doc sweep: key normalization, camelCase removal, retired-language cleanup - giggly-mixing-minsky)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` Author YAML vocabulary lock extended (Class L1)**: Added ratified rule 8 to lock scope-specific identity handles in authored YAML. Bare `name:` is banned; the allowed handles are `protocol_name` (protocol), `step_name` (step), `object_name` (object identity, instruments included), and `field_name` (object state-field). Ordinary prose may still use the English word "name"; the ban applies to YAML fields and schema-table field-name cells. `entry_step` and `next_step` reference `step_name`. Any "the name of X" schema wording becomes "the `X_name`".
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` smell-class 29 (Class L1)**: New blocker-severity smell class flagging bare `name:` in authored YAML and schema tables. RD-16 records the live rule only; no retired-term table rows.
- **`tests/test_spec_vocabulary.py` G7, G8, G9 gates (Class L2)**: New hard-pass assertions enforce the vocabulary lock. G7 bans bare `name:` (excludes the checklist). G8 bans the retired root-of-protocol `entry:` block shape. G9 bans camelCase YAML keys in YAML fenced blocks and schema-table field-name cells, with a documented capability-id allowlist (`itemWorkspace`, `modalWorkspace`, `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`, `plateReaderWorkspace`, `liquidTransfer`) and a fence-language parser that excludes TypeScript and other code-language fences.

### Behavior or Interface Changes
- **Tier 1 key normalization across `docs/PRIMARY_*.md` and `docs/specs/*.md`**:
  - **Protocol handle (Class A)**: bare `name:` -> `protocol_name:` in protocol-level schema tables and YAML examples. `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md` updated.
  - **Step handle (Class B)**: bare `name:` -> `step_name:` in step schema tables, YAML examples, and all "the `name`" prose. `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md`, `docs/specs/PROTOCOL_STEPS.md`, `docs/specs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/specs/WALKTHROUGH_GUIDE.md` updated. `next_step` and `entry_step` prose now reference `step_name`.
  - **Object state-field handle (Class C)**: bare `name:` -> `field_name:` in object `state_fields` entries. `docs/specs/OBJECT_VOCABULARY.md` and `docs/specs/OBJECT_YAML_FORMAT.md` updated.
  - **Instrument/object handle (Class D)**: `docs/specs/SCALING_MODEL.md` "Adding a new object" example flattened to canonical `object_name:` form. Removed redundant outer wrapper that introduced a bare `name:` field.
- **Tier 2 camelCase removal (Class E)**:
  - `colorKey` retired entirely from authored `contents.yaml` (legacy runtime field). `display_color` is the sole authored color field; it remains live as `contents.yaml` metadata, distinct from the retired object-state `liquid_color`.
  - `displayColor` -> `display_color` in `docs/specs/PROTOCOL_YAML_FORMAT.md` schema table and YAML example; the generated TypeScript example now reflects the renamed field.
  - `dayId` -> `day_name` in the Parts block schema and TypeScript example in `docs/specs/PROTOCOL_YAML_FORMAT.md`. The `id` row in the Parts table becomes `part_name`.
  - `sceneId` -> `scene_name` in the SCENE_YAML_FORMAT validator-rule prose (line 380), eliminating the contradiction with line 113.
  - `wrongOrderMessage` -> `wrong_order_message` and `toastDurationMs` -> `toast_duration_ms` in `docs/specs/SCENE_YAML_FORMAT.md` validator-gap list and in `docs/specs/SCENE_VOCABULARY.md` entry.
  - `{expectedLabel}` -> `{expected_label}` in toast-template field description and YAML examples (`docs/specs/SCENE_YAML_FORMAT.md`).
- **Tier 3 retired language and contradictions**:
  - **Retired step kinds (Class F)**: `interactionSequence`, `directTool`, `multipleChoice` removed from `docs/specs/WALKTHROUGH_GUIDE.md` "How the walker decides what to click" and "Completion-path support" sections. Replaced with the current interaction model: the walker dispatches from each interaction's `target.kind` plus `gesture`, not from a per-step kind discriminator. Legacy-to-current mapping documented so authors can find their bearings.
  - **Retired `src/content/` paths (Class G)**: `src/content/` -> `content/protocols/` (or `content/scenes/`) in `docs/specs/PROTOCOL_STEPS.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/SCENE_ARCHITECTURE.md`, `docs/specs/SCENE_YAML_FORMAT.md`, `docs/specs/WALKTHROUGH_GUIDE.md`.
  - **Retired `_id` identity in prose (Class H)**: `<object_id>.<subpart_id>` -> `<object_name>.<subpart_name>` in `docs/specs/SCENE_ARCHITECTURE.md`.
  - **`entry:` block contradiction (Class I)**: `docs/specs/PROTOCOL_YAML_FORMAT.md` "Entry block" section rewritten to the canonical flat top-level `entry_step:` field. Dropped the `scene:` and `step:` subkeys entirely; PRIMARY_SPEC.md wins by contract precedence per `docs/PRIMARY_CONTRACT.md`. Validation rules now match the canonical form.
  - **Retired `liquid_*` authored fields (Class J)**: `docs/specs/SCENE_YAML_FORMAT.md` `ObjectStateChange` prose rewritten from `liquid_id` / `liquid_volume` / `held_liquid_id` / `held_liquid_volume` to `contents_name` / `contents_volume` / `held_contents_name` / `held_contents_volume`, consistent with the broader `liquid_*` -> `contents_*` migration completed earlier.
  - **RD-10 runtime drift (Class K)**: `docs/specs/LIQUID_CONVENTION.md` reframed. The "Color Map" section now grounds color sourcing in `contents.yaml` `display_color` instead of `inventory_data.ts:REAGENTS:displayColor` and `style_constants.ts:COLOR_MAP`. The "Game State Integration" and "Rendering in Hood Scene" sections rewritten as an "Authored state model" section that names the canonical `held_contents_name` / `held_contents_volume` / `contents_name` / `contents_volume` authored fields and the `ObjectStateChange` protocol primitive that writes them; runtime-state names (`gameState.heldLiquid`, `gameState.tubeLiquids`, `gameState.plateLiquids`, `addTubeLiquid`) are no longer surfaced as authoring vocabulary. `docs/specs/SCENE_YAML_FORMAT.md` "Gaps not validated today" cross-reference updated from `inventory_data.ts` to `contents.yaml` and the object library.

### Fixes and Maintenance
- `docs/specs/PROTOCOL_YAML_FORMAT.md` generated-TypeScript example (the runtime emit shape) updated to drop retired `colorKey` and to use the renamed `display_color` and `day_name` / `part_name` fields, so the documented emit matches the authored YAML form.

### Removals and Deprecations
- `colorKey` removed from authored `contents.yaml` schema entirely (Class E). Color now derives solely from `display_color`.
- `interactionSequence`, `directTool`, `multipleChoice` removed from WALKTHROUGH_GUIDE normative dispatch description (Class F). These per-step kinds are retired per `docs/PRIMARY_SPEC.md`.
- The `entry:` multi-key block (`entry: { scene:, step: }`) removed from PROTOCOL_YAML_FORMAT.md (Class I). The flat top-level `entry_step:` field is the sole canonical form.
- Bare `name:` retired as an authored YAML field across protocol, step, object, and instrument surfaces (Classes A-D, locked by L1, gated by L2).

### Decisions and Failures
- **Instrument handle merged into `object_name`**: An earlier plan draft introduced `instrument_name` as a fourth scope-specific handle alongside `protocol_name` / `step_name` / `field_name`. Audit of object docs showed that instruments are already objects (instrument set-points live in `state_fields`; there is no separate instrument identity layer). The lock now states "Object identity handle is `object_name` (instruments included)" to avoid a synonym for the same concept and to honor "one canonical term per concept" from `docs/PRIMARY_DESIGN.md`.
- **Class L split into L1 (lock-first) and L2 (gate-last)**: L1 extends `SPEC_DESIGN_CHECKLIST.md` before any content edits so every subsequent class cites a canonical reference. L2 adds the pytest gates after Classes A-K land, so the test suite turns green in the same commit as the final cleanup.
- **`display_color` kept; `colorKey` dropped**: `contents.yaml` retains `display_color` as live authored color metadata for contents. `colorKey` is legacy runtime language with no current authoring use; dropping rather than renaming.
- **G9 table-cell regex requires backticks**: First-cut Markdown table parser flagged glossary tables like `| dispatchInteraction | The adapter's ...`. Tightened the regex to require backticks around the field-name cell (`` | `fieldName` | ``), the documented schema-table convention. Glossary tables (no backticks) stay out of scope.

### Developer Tests and Notes
- `source source_me.sh && pytest tests/test_spec_vocabulary.py -q`: **9 passed in 0.11s** (G1-G9).
- `tests/test_markdown_links.py` failures are pre-existing (unrelated CHANGELOG and FILE_STRUCTURE links); not introduced by this sweep.

## 2026-05-15 (Validator hardening: relational DB, Tier 1 cross-file checks, closure model)

### Additions and New Features
- **`tools/validators/` package**: validator split into modules - `constants.py` (closed sets + finding-tag registry), `findings.py` (Finding + Severity), `database.py` (ContentDatabase relational registry: objects, base_scenes, protocols, contents_by_protocol), `object_validator.py`, `scene_base_validator.py`, `scene_protocol_validator.py`, `protocol_validator.py`, `cross_protocol.py`, `summary.py`, `yaml_io.py`.
- **ContentDatabase lookup methods**: `resolve_object`, `resolve_target` (bare + dotted subpart forms), `resolve_state_field`, `resolve_contents`.
- **Tier 1 cross-file checks** with structured tags emitted by `ProtocolValidator`:
  - `T1_TARGET` - interaction target does not resolve to a declared object or subpart.
  - `T1_STATE_FIELD` - `ObjectStateChange` writes a field not declared on target's `state_fields`.
  - `T1_ENUM` - enum state field receives a value outside the declared `allowed` list.
  - `T1_CONTENTS_REF` - `contents_name` / `held_contents_name` does not resolve to a protocol contents entry.
  - `T1_TARGET_WITH_VALUE` - `target_with_value` payload key not a declared state field on the target.
- **`SCENE_EXTENDS` tag**: protocol scene `extends` lookup against base-scene registry.
- **`CLOSURE` tag**: closed top-level whitelists per container (`OBJECT_ALL_KEYS`, `PROTOCOL_ALL_KEYS`, `BASE_SCENE_ALL_KEYS`, `PROTOCOL_SCENE_ALLOWED_KEYS`). Unknown top-level keys flagged automatically.
- **`T3_CAMELCASE` tag**: general regex `[a-z][A-Z]` flags any camelCase key recursively across loaded YAML; no allow-list.

### Behavior or Interface Changes
- Validator now requires `protocol_name`, `step_name`, `field_name` per `docs/specs/SPEC_DESIGN_CHECKLIST.md` bare-`name:` ban; old bare `name:` keys are flagged via `CLOSURE`.
- `CONTENTS_REQUIRED_KEYS = {label, display_color}`; `colorKey` dropped.
- File-category counts now reflect every file walked, not only files that passed.
- Whole-tree scan walks `content/` only; `tests/content/` fixtures are out of scope.

### Fixes and Maintenance
- Pyflakes clean across `tools/validate_content_yaml.py` and `tools/validators/*.py`.
- All `from typing import ...` purged in favor of bare `dict`, `list`, `tuple`, `set`, `X | None` per `docs/PYTHON_STYLE.md`.
- Replaced repeated `try/except RuntimeError` per file with a single `_load_and_collect` helper.
- `yaml_io.py` catches only `yaml.YAMLError`; other I/O errors propagate.
- `database.subpart_matches` lets `re.error` surface instead of silently swallowing regex errors.
- Removed broad `except Exception` fallback around `Path(__file__).resolve()` in `main()`.
- Removed redundant `import sys as sys_module` and inner `import re as re_module`.
- Wired `BaseSceneValidator.set_object_names(db.objects.keys())` so placement cross-reference check is active.
- Verbose detail printers consolidated in `tools/validators/summary.py`; inline duplicates in `validate_content_yaml.py` removed.

### Removals and Deprecations
- Deleted `RETIRED_OBJECT_KEYS`, `RETIRED_BASE_SCENE_KEYS`, `RETIRED_PROTOCOL_KEYS`, and `BANNED_TOKENS` allow-lists. Replaced by `CLOSURE` + `T3_CAMELCASE`.
- Deleted unused `ContentDatabase.is_enum_value_valid` and `get_all_contents_names` (`ProtocolValidator` performs enum checks inline).
- Deferred `check_contents_drift`; not wired in this pass.

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: **Validated 42 files (34 objects, 1 base scenes, 1 protocol scenes, 6 protocols). 79 failures** - failures are real YAML drift now correctly surfaced for follow-up content cleanup.

## 2026-05-15 (protocol_type vocabulary consolidation)

### Additions and New Features
- **`docs/specs/PROTOCOL_VOCABULARY.md` Protocol kinds section** added: canonical home for protocol package terminology and the allowed `protocol_type` values. New rows in Container Terms for protocol package, protocol type, mini-protocol, sequence runner, and developer smoke. New `protocol_type` slot added to the protocol-level slot charters table; new closed-enum row added to the cost-guardrail table.
- **`docs/specs/PROTOCOL_YAML_FORMAT.md` top-level protocol-fields table** added with the `protocol_type` enum row and a worked YAML example.

### Behavior or Interface Changes
- **Field renamed: `protocolType` -> `protocol_type`** across normative docs (`docs/PRIMARY_DESIGN.md`, `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_*.md`, `docs/active_plans/*.md`), content YAML (`content/protocols/*/protocol.yaml`), runtime contract (`src/scene_runtime/contract.ts`), validator and builder (`tools/validate_content_yaml.py`, `tools/build_protocol_data.py`), tests (`tests/test_protocol_entry_no_hood_default.py`), and Playwright fixtures (`tests/playwright/fixtures/*/protocol.mjs`). Aligns with the snake_case authored-field rule from `SPEC_DESIGN_CHECKLIST.md` Author YAML vocabulary lock.
- **Terminology surfaces trimmed to pointers**: `docs/specs/PROTOCOL_AUTHORING_GUIDE.md` "Terminology" section, `docs/PRIMARY_DESIGN.md` "Protocol and mini-protocol hierarchy" section, and `docs/PRIMARY_SPEC.md` "Protocol types" section now link into `PROTOCOL_VOCABULARY.md#protocol-kinds` instead of redefining the kinds independently.
- **Friendly-label paragraphs absorbed**: `PRIMARY_DESIGN.md` and `PRIMARY_SPEC.md` "Sequence runners and friendly terminology" sections removed; the "may be rendered as 'full protocol'" note now lives inside the canonical Sequence runner definition in `PROTOCOL_VOCABULARY.md`.

### Removals and Deprecations
- **Retired `protocol_type` value: `protocol`.** Active enum is now `{mini_protocol, sequence_runner, dev_smoke}` (`tools/validate_content_yaml.py` `PROTOCOL_TYPES`). The audit confirmed no in-tree content declared the retired value; no reclassification was required. The bare word "protocol" is no longer a formal kind or enum value, but it remains valid in structural contexts (`protocol.yaml`, protocol package, protocol-level field, `protocol_type` field name).
- **Retired field name: `protocolType`.** The camelCase form has no validator special case; an authored file that uses it fails the existing missing-required-key and unknown-extra-key checks. Historical changelog entries and archived planning docs that reference the old name are preserved (per REPO_STYLE "entries are never removed").

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: validator runs clean across the migrated `content/protocols/*/protocol.yaml` set after the rename.

## 2026-05-15 (M2 Wave 2a: five mini-protocols + 25 objects - sorted-snacking-kettle)

### Additions and New Features
- **25 new shared objects** under `content/objects/`: liquid-bearing (serological_pipette, conical_15ml, multichannel_pipette, micropipette, carboplatin_stock_bottle, metformin_stock_bottle, dmso_bottle, mtt_vial, sterile_water_bottle, microtube_15ml_intermediate, metformin_working_tube), structured (conical_15ml_rack, well_plate_96, dilution_tube_rack_8, hemocytometer), equipment (centrifuge, incubator, microscope, plate_reader, vortex, water_bath, micropipette_tip_box, professor_avatar), waste (biohazard_decant, sharps_container), plus `t75_flask_new` for passage workflow.
- **Five new mini-protocols** under `content/protocols/`: `drug_dilution_setup` (8 steps), `plate_drug_treatment` (7 steps), `cell_counting_and_seeding` (9 steps), `mtt_assay_readout` (7 steps), `cell_culture` (9 steps). All conform to two-level step/interaction model, closed gesture set, ratified `scene_operation` primitives, and 6-10 step gate.

### Behavior or Interface Changes
- **Cross-protocol contents standardization**: `cell_suspension` displayColor canonicalized to `#d89bb8`; `media` label canonicalized to "Complete RPMI media"; `trypsin` label canonicalized to "Trypsin-EDTA 0.25%".

### Fixes and Maintenance
- **Schema conformance fixes** applied across Wave 2a: vortex `running` field name; PDT parts/days `id`/`label` schema; well_plate_96 subpart addressing (A1..H12); contents_name enum alignment; TimedWait `duration_min`/`display` field names; hemocytometer flat state_fields addressing; aspirate_and_wash T-9 split.

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: **Validated 42 files (34 objects, 1 base scenes, 1 protocol scenes, 6 protocols). 0 failures.**

## 2026-05-15 (spec vocabulary consolidation sweep - cheeky-popping-hartmanis)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` extended**: New "Author YAML vocabulary lock" section codifies the closed authored-YAML surface, the identity tuple `(object_name, kind, label)`, the snake_case authored-field rule, the scene-placement override surface restricted to layout hints, and the `contents_container` rename.
- **`tests/test_spec_vocabulary.py` (new)**: Grep-gate test enforces vocabulary closure across `docs/specs/*.md` and `docs/PRIMARY_*.md`. G1-G4 hard-assert zero occurrences of retired tokens (`short_label`/`shortLabel`, `element_id`/`elementId`, `render_map`, `inventory_ref`/`inventoryRef`, `liquid_container`, camelCase YAML field references). G5-G6 are informational sweeps for residual drift.

### Behavior or Interface Changes
- **Spec sweep across `docs/specs/*.md` and `docs/PRIMARY_*.md`** (M2.W1-W7): Object, scene, protocol, layout-engine, liquid, SVG, and PRIMARY trio surfaces normalized to the locked vocabulary.
- **Identity tuple locked**: Object identity expressed exclusively as `(object_name, kind, label)`; legacy `short_label` and `element_id` references retired from normative spec text.
- **Scene-placement override surface locked**: Authored scene placements may override layout hints only; identity fields are not overridable at placement time.
- **Authored YAML enforced as snake_case**: `docs/specs/LAYOUT_ENGINE.md` and `docs/specs/SCALING_MODEL.md` camelCase authored-field references renamed to snake_case form.
- **`liquid_container` -> `contents_container` rename completed** across normative spec text (consistent with the broader `liquid_*` -> `contents_*` migration).
- **PRIMARY trio cross-links to the lock section added**: `docs/PRIMARY_CONTRACT.md`, `docs/PRIMARY_DESIGN.md`, and `docs/PRIMARY_SPEC.md` now point to the Author YAML vocabulary lock section in `docs/specs/SPEC_DESIGN_CHECKLIST.md`.

### Fixes and Maintenance
- **Dead-link cleanup** in `docs/CHANGELOG.md` and `docs/CHANGELOG-2026-05a.md`: historical `content/plate_drug_treatment/*.yaml` and `content/cell_culture/{items,reagents}.yaml` link wrappers rephrased to bare backticked paths (per REPO_STYLE "entries are never removed, may be rephrased for accuracy and clarity"). The underlying historical text is unchanged; only the broken hyperlink wrappers are removed because those paths were retired by the 2026-05-15 vocabulary closure.
- **`docs/FILE_STRUCTURE.md` "Where to add new work" table trimmed** of the `content/protocols/`, `content/objects/`, and `content/scenes/` rows pending layout settling. Content directories still exist on disk; the table rows return when the layout stabilizes.

### Removals and Deprecations
- **Deleted retired-terms tables** from `docs/specs/OBJECT_VOCABULARY.md`, `docs/specs/SCENE_VOCABULARY.md`, `docs/specs/SCENE_YAML_FORMAT.md`, and `docs/specs/PROTOCOL_VOCABULARY.md` (no quarantine doc; closure is enforced by `tests/test_spec_vocabulary.py`).
- **Retired tokens removed from normative spec text**: `short_label` / `shortLabel`, `element_id` / `elementId`, `liquid_color` as authored state, `render_map`, `inventory_ref` / `inventoryRef`, scene-placement `label` overrides, and all camelCase YAML field references.
- Removed `scene_kind` field from authored scene YAML and validator; `workspace` is the sole identity field.

### Decisions and Failures
- **D1 resolved**: `shortLabel` is fully retired in normative spec text regardless of any runtime residue. Runtime cleanup is tracked separately and is not a blocker for the spec lock.
- **D2 resolved**: `scene_kind` removed entirely. It duplicated `workspace` as the identity field. Footprint was 4 locations (SCENE_INHERITANCE.md locked-field row, hood_basic.yaml usage, validator optional-keys set, this changelog entry).

### Developer Tests and Notes
- `source source_me.sh && pytest tests/test_spec_vocabulary.py -q`: **6 passed in 0.08s** (G1-G6).

## 2026-05-15 (vocabulary audit sweep: retired-terms inventory and spec-consistency gates - WP-F1)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` extended**: Added four new checklist smell classes with examples and severity labels covering vocabulary drift:
  - RD-10 (semantic vs runtime): Flag authored YAML that uses runtime implementation terms (prefixes, coordinates, element names, internal state names) instead of semantic author vocabulary (object_name, scene_name, contents_name).
  - RD-13 (layer boundaries): Flag author vocabulary that mixes protocol layer (intent), object layer (state and visual), and scene layer (placement and geometry). Protocol must not name assets; scene must not name protocol steps; object must not read protocol sequencing.
  - RD-14 (closed visual variants): Objects declare closed `visual_states` enumeration only; no generic `render_map`, `render_config`, templating, expressions, or metadata escape hatches.
  - RD-15 (retired-terms closure): Sweepable audit table with fifteen retired-term renames and seven retired-field removals, guarded in examples and new authoring.
- **Retired-terms closure table (SPEC_DESIGN_CHECKLIST.md RD-15)**: Fifteen author-YAML renames documented as ratified migrations (liquid_id -> contents_name, object_id -> object_name, render_map -> visual_states, etc.). Seven retired authored fields documented as removed (element_id, liquid_color authored separately, inventory_ref, items.yaml, reagents.yaml, src/content/<protocol>/). Enables systematic sweep validation in future spec audits.

### Behavior or Interface Changes
- **Author-YAML semantic renaming (vocabulary closure WP-F1)**: Author-written YAML migrates from runtime-oriented naming to semantic author vocabulary:
  - liquid-state fields: `liquid_id` / `held_liquid_id` -> `contents_name` / `held_contents_name` (reflects semantic scope: reagents, waste, media, cells, mixtures, suspensions, drugs).
  - volume fields: `liquid_volume` / `held_liquid_volume` -> `contents_volume` / `held_contents_volume`.
  - identity fields: `object_id` -> `object_name`, `scene_id` -> `scene_name`, `placement_id` -> `placement_name`, `subpart_id` -> `subpart_name`, `step_id` -> `step_name`, `protocol_id` -> `protocol_name`, `part_id` -> `part_name`, `day_id` -> `day_name` (closure: all identity fields use _name suffix, not _id).
  - asset identity: `asset_id` -> `asset_name`, `overlay_id` -> `overlay_name` (consistency with subparts and elements).
  - rendering surface: `render_map` -> `visual_states` (emphasizes closed enumeration, not generic template or expression engine).
- **Authoring layout restructure**: Authored content relocates from protocol-centric `src/content/<protocol_name>/` to multi-layer organization under `content/`: protocols to `content/protocols/<protocol_name>/{protocol.yaml, contents.yaml, scenes/}`, shared objects to `content/objects/`, shared scenes to `content/scenes/`.
- **Contents registry unification**: `items.yaml` and `reagents.yaml` consolidated into `contents.yaml` reflecting unified semantic scope (reagents, waste, media, cells, mixtures, suspensions, drugs, not separate item/reagent categories).

### Removals and Deprecations
- **Dropped authored fields**: `element_id` (runtime derives mount identifier as `${scene_name}-scene`); `liquid_color` as authored state field (color derived from `contents_name` via object `visual_states`); scene-placement `label` / `short_label` overrides (use scene-global naming); `inventory_ref` (inventory external to author YAML).
- **Retired authored files**: `items.yaml`, `reagents.yaml` (merged into `contents.yaml`).
- **Retired path structure**: `src/content/<protocol_name>/` (moved to `content/protocols/<protocol_name>/`).
- **Retired rendering surface**: `render_map` (replaced by closed `visual_states` enumeration; no generic template, expression, or metadata-blob rendering engine).

## 2026-05-15 (scene_object_split: three-vocabulary model close-out - WP-EV1 through WP-DOC-C1)

### Additions and New Features
- **`docs/OBJECT_VOCABULARY.md` (new)**: Canonical object vocabulary
  defining object identity, structured surfaces and subparts (wells in
  plates, lanes in gels, slots in racks), the `state_fields` schema
  (flat primitive types per RD-11), the `render_map` (state-value to
  visual asset), the closed `capabilities` list per RD-6, and layout
  hints. Establishes that the object owns the state-to-visual map and
  all SVG manipulation; the protocol sets semantic state and the
  object resolves the asset.
- **`docs/OBJECT_YAML_FORMAT.md` (new)**: Canonical object-definition
  YAML schema with every field typed and worked examples (96-well
  plate, serological pipette). Encodes the closed per-type constraint
  metadata per RD-12 and the small closed `render_map` formula token
  set per RD-7 (unknown tokens = build error).
- **`docs/SPEC_DESIGN_CHECKLIST.md`**: New permanent checklist
  promoting the design philosophy that emerged during this plan
  (vocabulary closure, anti-drift, evidence-gated additions). Used by
  future spec edits to keep canonical docs internally consistent.
- **`docs/active_plans/scene_object_split_inventory.md` (new)**:
  Consolidated evidence artifact -- every `items[]` sub-field across
  current scene YAML files tagged object-identity vs placement, every
  scene-YAML top-level key tagged, every `src/asset_specs.ts` entry
  with its property names, the runtime liquid-state model, the
  ratified `scene_operation` primitive set with current layer, plus
  the M3 ratification and gap matrices.
- **`docs/active_plans/scene_object_split_design.md` (new)**: Working
  design doc for the three-vocabulary model -- object section, cleaned
  scene section, three-way boundary with per-key assignment table, and
  the protocol-side `ObjectStateChange` plus `SvgSwap` reclassification.
- **Three follow-on plan stubs in `docs/active_plans/`**: New stubs
  for the next stages of work --
  [content_yaml_migration_plan.md](archive/content_yaml_migration_plan.md),
  [typescript_migration_plan.md](active_plans/typescript_migration_plan.md),
  and [docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md).
  Each names inputs, targets, first decision or risk, and out-of-scope
  boundaries; full plans land when an owner picks one up.

- **Two-level step/interaction model**: Reworked
  `docs/active_plans/unified_interaction_vocabulary_design.md` from the
  superseded flat `target + mode + action` first-pass draft into a two-level
  model. A `step` owns an ordered `sequence` of `interaction` entries, so one
  step can span multiple gestures (for example, "wash the flask with 4 mL PBS"
  is one step, three gestures).
- **Step slots defined**: A `step` has six slots: `name` (stable snake_case
  identifier), `prompt`, `sequence` (ordered list of interactions),
  `step_validator`, `outcome` (the `on_success` / `on_failure` mapping), and
  `next_step`. In the tightened model `sequence` order is always meaningful;
  there is no unordered mode.
- **Naming and ordering rules**: Protocol flow is explicit through
  `next_step`, which names the next step by its `name`; flow is never inferred
  from YAML file order. `step_index` is display-only and carries no flow
  meaning.
- **Interaction slots defined**: Each `interaction` has exactly four slots: a
  `target` (an addressable semantic named scene object that declares its
  `kind`, so the kind carries task semantics and no separate task-type slot is
  needed), a `gesture` (`click` / `drag` / `adjust` / `select` / `type`, where
  `adjust` is the skill-based continuous set-point gesture), a `validator`
  (checks one gesture on one target), and a `response`. In the tightened model
  the interaction carries no `name` slot; the optional snake_case `name` is
  deferred until evidence shows interactions need naming.
- **`response` container defined**: The per-interaction `response` container
  holds post-validation system behavior: an ordered `scene_operations` list of
  typed primitives plus an optional `feedback` block structured into `correct`
  / `incorrect` messages. In the tightened model `response` has exactly those
  two fields; state change is explicit through a `scene_operation` mutation
  only -- there is no `state_update` field.
- **Initial six `scene_operation` typed primitives**: The first WP-SOP1 pass
  ratified `SvgSwap`, `ColorChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, and `LiquidDisplayChange`, each specified with typed fields to
  a durable-primitive standard. `LiquidDisplayChange` is first-class because it
  tracks liquid quantity and well-contents state. WP-STA1 and the WP-SOP1
  follow-up later grew the ratified set to eight by adding `TimedWait` and
  `SetPointDisplayChange` (see the WP-STA1 and WP-SOP1 follow-up lines below).
- **Domain-verb mechanism and cost guardrail**: Added a domain-verb mechanism
  of named compositions that expand at the interaction level to one
  interaction or at the step level to a whole sequence plus `step_validator`,
  with no hidden state change. A cost guardrail keeps domain verbs cheap while
  new `gesture` values and new `scene_operation` primitives are expensive and
  evidence-gated.
- **`protocol` level added (WP-STA1)**: Added a `protocol` level above `step`
  with three slots: `name` (stable snake_case identifier), `entry_step` (names
  the first step the runtime runs), and `steps` (the list of steps; list order
  is reading convenience, never flow). The level exists so protocol flow has a
  defined start instead of an implied file-order first step.
- **Named-preset validator system and preset library (WP-STA1)**: The
  interaction `validator` and the `step_validator` are now named presets with
  typed parameters (`{ preset: <name>, ...params }`); content creators select
  from a documented library and never write custom validation logic. The
  initial library has three interaction presets (`correct_target`,
  `correct_choice`, `target_with_value`) and two step presets
  (`sequence_complete`, `final_state_matches`). A new preset requires
  ratification evidence under the cost guardrail.
- **`outcome` mapping defined (WP-STA1)**: The step `outcome` is the simple
  two-key mapping `{ on_success: complete, on_failure: retry }`, where `retry`
  restarts the whole step and the entire `sequence` resets. `outcome` never
  carries an `advance` value; advancing is `next_step`'s job. The mapping shape
  absorbs future keys without a redefinition.
- **`TimedWait` seventh `scene_operation` primitive (WP-STA1)**: Ratified
  `TimedWait` with typed fields `type`, `target`, `duration_min`, and
  `display`. It runs a timed phase on a piece of equipment with a visible
  progress display, covering incubation, centrifugation, staining, destaining,
  and timed equipment runs. It is a `scene_operation` inside a `response`, not
  a special step type, closing the timed-wait residual gap.
- **Runtime state model, event-emission rule, and event naming (WP-STA1)**:
  Defined the named, non-positional runtime state the validator presets read
  (held material, target contents, set-point values, equipment state, phase
  state, object appearance), the rule that the runtime emits events on state
  transitions, and a single snake_case event-naming convention
  (`<step_name>_complete`, `<equipment_name>_elapsed`) that replaces the legacy
  `completionEvent` inconsistency. Event names are derived, not hand-authored.
- **Pedagogy-first rule (WP-PED1)**: Added the rule that an author chooses each
  interaction's `target` (and its `kind`) and its `gesture` to teach the
  specific lab skill the step is about -- the shape of an interaction is a
  pedagogical decision, not just a UI decision. Includes worked `click` and
  `adjust` examples showing the skill each teaches. This is the standard M3
  ratification checks each interaction against.
- **`SetPointDisplayChange` eighth `scene_operation` primitive (WP-SOP1
  follow-up)**: Ratified `SetPointDisplayChange` with typed fields `type`,
  `target` (a configured display target such as `pipette_volume_display` or
  `power_supply_display`), and `value` (a mapping such as `{ volume_ml: 4 }` or
  `{ voltage_v: 150 }`). It names the visible change an `adjust` gesture
  causes, giving the "set-point values" runtime state row a primitive that
  writes it (OQ-21). `ColorChange`, `LiquidDisplayChange`, and
  `SetPointDisplayChange` form a loose conceptual `DisplayChange` family -- a
  clarifying note only, not a nested taxonomy; the eight primitives stay a flat
  set.
- **Scene-vs-protocol boundary rule and slot-by-slot ownership map (WP-BND1)**:
  Added the quotable boundary rule -- the protocol vocabulary names no plate,
  well, tube, gel, column, lane, rack, or coordinate; the scene adapter owns
  all geometry, target expansion, and gesture rendering -- plus a slot-by-slot
  ownership map (protocol-owned / scene-owned / shared) across the `protocol`,
  `step`, `interaction`, and `response` slots. Protocol YAML is geometry-free.
- **Target-resolution mechanism (WP-BND1, OQ-16)**: Resolved how a protocol
  `target` resolves to a scene object: an adapter registry maps each semantic
  `target` name to a concrete scene object, and grouped targets (a row of
  wells, a tube rack, a set of gel lanes) are named groups defined in the scene
  YAML. The protocol writes `target: row_b`; the scene YAML defines the `row_b`
  group. All group membership and target expansion live on the scene side,
  which retires `plateTargets` and `tubeTargets`.
- **M3 ratification passed across all four source protocols**: Checked the
  two-level step/interaction model against 120 steps spanning OVCAR8, the 7
  shipped `content/*/protocol.yaml` files, Miraculin, and SDS-PAGE. Every step
  maps cleanly onto the ratified `protocol -> step -> interaction -> response`
  model with the eight `scene_operation` primitives and the named-preset
  validators. No M2 design revision was forced by the ratification pass.
- **M4 canonical-doc rewrites**:
  `docs/PROTOCOL_VOCABULARY.md` and
  `docs/SCENE_VOCABULARY.md` were fully rewritten to the
  ratified two-level model. WP-DOC-D1 aligned 10 dependent docs to the same
  model: `docs/PROTOCOL_YAML_FORMAT.md`,
  `docs/PROTOCOL_STEPS.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`,
  `docs/SCENE_YAML_FORMAT.md`,
  `docs/SCENE_ARCHITECTURE.md`,
  `docs/CODE_ARCHITECTURE.md`,
  `docs/FILE_STRUCTURE.md`,
  `docs/LAYOUT_ENGINE.md`,
  `docs/LIQUID_CONVENTION.md`, and
  `docs/WALKTHROUGH_GUIDE.md`.
  `docs/SVG_PIPELINE.md` was also audited under WP-DOC-D1
  and found to contain no interaction-model vocabulary, so it needed no
  alignment (audited-clean, not skipped). As a follow-on primary-doc pass,
  `docs/PRIMARY_SPEC.md` and
  `docs/PRIMARY_DESIGN.md` were reconciled to the
  ratified model as well (see the Decisions and Failures entry below).
- **`target_groups` schema section added to SCENE_YAML_FORMAT.md**: Documents
  the named-group schema (a row of wells, a tube rack, a set of gel lanes) that
  the scene YAML defines and the protocol `target` resolves against. Group
  membership and target expansion live entirely on the scene side.
- **Adapter-registry section added to SCENE_ARCHITECTURE.md**: Documents the
  registry that maps each semantic `target` name to a concrete scene object,
  the resolution mechanism ratified under WP-BND1 / OQ-16.
- **`docs/specs/SCENE_INHERITANCE.md` (new)**: Canonical scene-inheritance
  policy defining the three-layer asymmetry (objects canonical-by-id with no
  extends; protocols spec-shaped with no template layer; scenes shallow-extends
  with closed four-operation mutation surface). Establishes one-level depth
  maximum per protocol scene file, base-scene residence in `content/scenes/`,
  protocol-scene location under `content/protocols/<name>/scenes/`, and the four
  named operations (`add_placements`, `reposition_placements`,
  `deactivate_placements`, `remove_placements`). Includes the promotion rule: a
  base scene moves into `content/scenes/` when expected to serve multiple
  protocols or represents a stable workspace contract.
- **`docs/active_plans/scene_inheritance_migration.md` (new)**: Deferred
  content-side migration stub owning the folder-layout reshape, base-scene
  extraction, conversion of per-protocol `scene.yaml` files to `extends:` form,
  static scene-graph validator, and supporting-pipeline updates. Identifies six
  seed base scenes (bench_basic, hood_basic, plate_reader_basic,
  microscope_workspace_basic, well_plate_workspace_basic,
  centrifuge_workspace_basic) and current migration candidates.

### Behavior or Interface Changes
- **Scene-inheritance policy ratified; five dependent specs updated**: Ratified
  the three-layer scene-inheritance model in
  [specs/SCENE_INHERITANCE.md](specs/SCENE_INHERITANCE.md) with one-level depth,
  four named mutation operations, and a promotion rule. Updated five dependent
  spec docs: [specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md) (Inheritance
  section with four-operation schema), [specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md)
  (no-extends subsection), [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md)
  (no-template subsection), [specs/SPEC_DESIGN_CHECKLIST.md](specs/SPEC_DESIGN_CHECKLIST.md)
  (seven anti-drift smell classes), and [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md)
  (Deactivated placements section). All five docs remain backward-compatible with
  current code; migration is deferred to the scene-inheritance migration plan.
- **Self-contained spec cleanup**: Stripped temporary-plan citations
  (RD-N codes, M0..M3 milestone references, WP-* work-package codes),
  archive/active_plans links, and `current-code` / `target-state` /
  `for now` / `previously` / `eventually` transitional wording from
  every file under `docs/specs/` plus `docs/PRIMARY_SPEC.md` and
  `docs/PRIMARY_DESIGN.md`. The spec set now reads as a single
  ratified normative surface; historical justification stays in
  `docs/archive/` and `docs/active_plans/` for anyone wanting it.
  Plan: out-of-tree, not in the repo tree.
- **docs/specs/ expanded by 7 more docs (Patch 3 of docs reorg plan)**:
  Seven additional spec-surface docs `git mv`'d into `docs/specs/`:
  `LAYOUT_ENGINE.md`, `LIQUID_CONVENTION.md`, `SCALING_MODEL.md`,
  `SPEC_DESIGN_CHECKLIST.md`, `SVG_PIPELINE.md`,
  `TARGET_FILE_STRUCTURE.md`, `WALKTHROUGH_GUIDE.md`. 142 markdown link
  errors closed: inbound references rewritten across all callers via
  the same Patch-2 migration script (expanded target list to 17);
  outbound `specs/X.md` and `../X` forms inside the moved files
  repointed to bare-sibling and `../../X` respectively. Two pre-existing
  broken-image references in `docs/archive/FLASK_DESIGN_REVIEW.md` and
  one nonexistent `images/` row in [FILE_STRUCTURE.md](FILE_STRUCTURE.md)
  removed per RD-G (target file or directory does not exist;
  surrounding text preserved). `AGENTS.md` "Core rules" and "Where to
  find things" inline path strings updated for `LIQUID_CONVENTION.md`
  and `SPEC_DESIGN_CHECKLIST.md`. `pytest tests/test_markdown_links.py`
  and `pytest tests/test_ascii_compliance.py` both pass.
- **docs/specs/ folder added; 10 spec docs relocated (Patch 2 of docs reorg plan)**:
  Created `docs/specs/` and `git mv`'d the ten specification-surface docs into
  it: all four `PROTOCOL_*` (`PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_STEPS.md`,
  `PROTOCOL_VOCABULARY.md`, `PROTOCOL_YAML_FORMAT.md`), all three `SCENE_*`
  (`SCENE_ARCHITECTURE.md`, `SCENE_VOCABULARY.md`, `SCENE_YAML_FORMAT.md`),
  both `OBJECT_*` (`OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`), and
  `QTI_v3_SPEC.md`. `PRIMARY_*` docs, style docs, test docs, and architecture
  docs (`CODE_ARCHITECTURE.md`, `FILE_STRUCTURE.md`, `LAYOUT_ENGINE.md`,
  `LIQUID_CONVENTION.md`, `SVG_PIPELINE.md`, etc.) stay at root by design --
  `docs/specs/` admits only formal specification surfaces (project-native plus
  external standards reference). All inbound markdown links rewritten in the
  same patch via a one-shot Python migration script; outbound links inside
  the moved files repointed to repo-root and `docs/`-sibling locations with
  one extra `../`. `AGENTS.md` "Required reading" and "Where to find
  things" sections updated. `CLAUDE.md` was simultaneously trimmed to
  only the three `@docs/PRIMARY_*.md` import lines (length-reduction
  pass); the previous PROTOCOL_*, SCENE_*, OBJECT_*, and style/test
  `@`-imports were dropped from the manifest. `pytest tests/test_markdown_links.py` and
  `pytest tests/test_ascii_compliance.py` both pass. Plan source:
  [archive/docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md).
- **`docs/SCENE_VOCABULARY.md` rewritten**: Now defines only scene-side
  terms (placement, zones, object reference, background per RD-1).
  Object-identity terms moved out and pointed at OBJECT_VOCABULARY.md.
  The old fused `items[]` model is no longer the canonical authoring
  surface; target-state and current-code sections clearly labeled.
- **`docs/SCENE_YAML_FORMAT.md` rewritten**: Documents the cleaned
  scene YAML schema (object references plus placement). Adds a
  migration note pointing at the content/scene-YAML-migration follow-on
  plan for keys now owned by object YAML.
- **`docs/PROTOCOL_VOCABULARY.md` re-touched**: Reclassified four
  primitives -- `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, and
  `SetPointDisplayChange` -- out of the protocol-level
  `scene_operation` set into the object/render layer. Added
  `ObjectStateChange` as the semantic primitive that sets declared
  object `state_fields` (per RD-8: target a named state field, value
  must match the field's declared primitive type, validator rejects
  unknown fields and type-mismatched values). The retired-terms section
  and the primitive list updated; the ratified protocol-level primitive
  count is five (`ObjectStateChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, `TimedWait`). No other part of the M4-closed
  protocol model was changed.
- **`docs/PRIMARY_DESIGN.md` "Vocabulary closure and anti-drift"
  section**: Permanent design philosophy promoted from the working
  design doc -- vocabulary terms are closed sets ratified against real
  inputs; new terms require evidence and an explicit vocabulary edit;
  unknown tokens are build errors, not silent drift.
- **Dependent doc alignment**: `SCENE_ARCHITECTURE.md`, `LAYOUT_ENGINE.md`,
  `LIQUID_CONVENTION.md`, `PROTOCOL_AUTHORING_GUIDE.md`,
  `PROTOCOL_YAML_FORMAT.md`, `CODE_ARCHITECTURE.md`, `FILE_STRUCTURE.md`,
  and `PRIMARY_SPEC.md` all updated to point at OBJECT_VOCABULARY.md /
  OBJECT_YAML_FORMAT.md, reflect the cleaned scene scope, and remove
  fused-format wording. No transitional notes left in the canonical
  path.
- **Model tightened to a linear protocol spec (WP-STA1)**: A course-correction
  tightened the model to a tight linear protocol spec. It adds the `protocol`
  level, drops `sequence_mode` (sequence order is always meaningful), drops the
  optional interaction `name` (deferred), drops `state_update` from `response`
  (`response` is `scene_operations` plus optional `feedback`), and defers
  complex branching (`outcome` stays the simple `{ on_success, on_failure }`
  mapping). The tight model is `protocol -> step(name, prompt, sequence,
  step_validator, outcome, next_step) -> interaction(target, gesture,
  validator, response) -> response(scene_operations[], feedback?)`.
- **`LiquidDisplayChange.operation` set settled (WP-STA1)**: The
  `LiquidDisplayChange` operation set settled to `hold` (tool-carried
  contents), `set` (direct absolute assign; empty a tool or vessel via
  `volume_ml: 0`), and `add` (a destination transfer). The earlier `fill`
  operation is renamed `add`, and the earlier `empty` is expressed as `set`
  with `volume_ml: 0`.

### Fixes and Maintenance
- **docs/ link repair after protocols/ move (Patch 1 of docs reorg plan)**:
  Rewrote 13 broken markdown links left over from the in-flight `git mv`
  of five protocol-content docs into `docs/protocols/`. Touched
  [docs/CHANGELOG-2026-05b.md](CHANGELOG-2026-05b.md) (6 link rewrites
  pointing OVCAR8 references at `protocols/`),
  [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) (3 rewrites for OVCAR8 +
  VOSS_DILUTIONS_GUIDE), [docs/USAGE.md](USAGE.md) (1 OVCAR8 reference),
  [docs/archive/protocol_interaction_inventory.md](archive/protocol_interaction_inventory.md)
  (2 `../protocols/` rewrites for Miraculin and SDS-PAGE), and
  [docs/archive/2026-04-09-scene-layout-engine.md](archive/2026-04-09-scene-layout-engine.md)
  (1 stale superpowers/specs link repointed at the design doc's new
  sibling location in `docs/archive/`; pre-existing failure flagged in
  the same report). `pytest tests/test_markdown_links.py` and
  `pytest tests/test_ascii_compliance.py` both pass. See the docs
  reorganization plan [docs/archive/docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md)
  for context; Patch 2 of that plan will create `docs/specs/`.
- **Unified interaction vocabulary plan marked closed**: Added a
  `Plan status: closed` section to
  [docs/archive/unified_interaction_vocabulary_plan.md](archive/unified_interaction_vocabulary_plan.md)
  and flipped 10 rollout-checklist boxes to checked. The plan's M1-M4 work
  (canonical doc rewrites, dependent-doc alignment, primary-doc reconcile,
  4-pass audit, final terminology gate) was already complete and committed
  earlier; this was stale plan-file bookkeeping only. The human-review gate
  checkbox was left unchecked because it is a human-only gate.
- **Markdown link sweep**: Converted 161 broken markdown links flagged by
  `tests/test_markdown_links.py` into backticked inline code spans. The broken
  links pointed at historical files (deleted code paths, old changelog refs,
  pre-`src/scene_runtime/` filenames, line-number-suffixed paths) where a real
  link target no longer exists; backticking preserves the historical text while
  satisfying the GitHub-browsable-link rule. Touched `docs/CHANGELOG.md`,
  `docs/CHANGELOG-2026-05a.md`, `docs/CHANGELOG-2026-05b.md`,
  `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`, `docs/QTI_v3_SPEC.md`,
  `docs/SCENE_ARCHITECTURE.md`, `docs/SCENE_VOCABULARY.md`, `docs/TODO.md`,
  `docs/USAGE.md`, `docs/WALKTHROUGH_GUIDE.md`,
  `docs/active_plans/unified_interaction_vocabulary_plan.md`, and several
  `docs/archive/` files. `pytest tests/test_markdown_links.py` now passes.

### Removals and Deprecations
- **Archived 4 stale plan files**: Moved four superseded plan files from
  `docs/active_plans/` to `docs/archive/` with `git mv`:
  `focused_well_plate_workspace_plan.md` and
  `well_plate_workspace_pause_note.md` (paused 2026-05-12, superseded by the
  Fresh Refactor Plan), `protocol-step-vocab-refinement-plan.md` (superseded by
  the unified interaction vocabulary plan), and `scene_runtime_doc_conflicts.md`
  (superseded M0 audit, already annotated by WP-DOC-C1). References to the old
  paths in `scene_runtime_spine_plan.md`,
  `2026_May_13-Fresh_Refactor_Plan.md`, and
  `unified_interaction_vocabulary_plan.md` were left as-is because they are plan
  steps that anticipate the archival.

### Decisions and Failures
- **RD-1 (background = backdrop)**: A scene background is a static
  backdrop declared in scene YAML; clickable regions are objects
  placed over the background, not properties of the background.
- **RD-2 (instance overrides bounded)**: A scene placement may
  override an object's `label` and layout hints only; identity,
  `state_fields`, `render_map`, and `capabilities` stay object-owned.
- **RD-3 (`ColorChange` to render layer)**: `ColorChange` lives in
  the object/render layer alongside `SvgSwap`. The single exception
  is a future protocol primitive when color itself is the learning
  target (a colorimetric reading); that primitive is its own slot,
  not generic `ColorChange`.
- **RD-4 (subparts belong to the object)**: Wells, lanes, rack
  slots, and similar internal structure are declared by the object,
  not by the scene. The named-groups portion of the original RD-4
  was superseded by RD-9.
- **RD-5 (no fixed asset / scene counts in canonical docs)**: Counts
  belong in the inventory artifact, not in plan prose or canonical
  docs. "31 / every entry" wording replaced with "every current
  `src/asset_specs.ts` entry" and similar across all canonical docs
  and the parent plan.
- **RD-6 (`capabilities` is a closed list)**: Initial closed set --
  `clickable`, `liquid_container`, `instrument_with_setpoint`,
  `structured_surface`, `cursor_attachable`, `decoration_only`.
  `decoration_only` mutually exclusive with the others. Adding a
  capability requires an explicit vocabulary edit.
- **RD-7 (`render_map` formula language is a small closed token
  set)**: No prose formulas. Closed token set defined in
  OBJECT_YAML_FORMAT.md. Unknown tokens = build error.
- **RD-8 (`ObjectStateChange` only sets declared `state_fields`)**:
  No arbitrary nested writes. Target a named state field; value must
  match the field's declared primitive type. Validator rejects
  unknown fields and type-mismatched values.
- **RD-9 (drop `target_groups` from initial vocabulary)**: Protocols
  list explicit subparts (`treatment_plate.A1`, `treatment_plate.A2`,
  ...). Named groups deferred until real authoring pain appears.
  Supersedes the named-groups portion of RD-4.
- **RD-10 (`LayoutMove` stays narrow)**: Move an existing placement
  only -- row-to-row reposition handled by the layout engine, plus
  cross-scene transitions (remove from one scene, add to another).
  The layout engine owns the visible motion; `LayoutMove` names what
  moves and where.
- **RD-11 (state-field types are flat primitives only)**: Allowed
  types -- `enum`, `int`, `float`, `bool`. No `string` (use `enum`
  with a closed `allowed` list). No structured `liquid` or
  `set_point` composite types. Liquid and set-point state model as
  multiple flat fields per object (well: `liquid_id`, `liquid_volume`,
  `liquid_color`; pipette: `set_volume`, `held_liquid_id`,
  `held_liquid_volume`).
- **RD-12 (per-type constraint metadata is closed)**: No open-ended
  `constraints:` object. Allowed metadata per primitive type --
  `enum`: `allowed`, `default`; `int`/`float`: `unit`, `min`, `max`,
  `step`, `default`; `bool`: `default`. Unknown metadata keys =
  build error.
- **RD-13 (`LiquidDisplayChange` reclassified to render layer)**:
  Same drift class as `SvgSwap` and `ColorChange` -- it named the
  display result instead of the semantic state change.
  `ObjectStateChange` is the sole protocol primitive for liquid state
  mutation; the object's `render_map` resolves the flat declared
  liquid fields to a fill height, tint, and asset. Prevents two
  competing liquid paths in canonical docs.
- **RD-14 (`SetPointDisplayChange` reclassified to render layer)**:
  Same drift class as `SvgSwap`, `ColorChange`, and
  `LiquidDisplayChange` -- it named the display result (a numeric
  overlay) instead of the semantic state change. Per user
  ratification on 2026-05-15 (option 1): reclassify
  `SetPointDisplayChange` to the object/render layer; keep
  `ObjectStateChange` as the protocol path for set-point state.
  Display changes belong to object rendering; protocol changes
  declared state. `ObjectStateChange` is the sole protocol primitive
  for set-point state mutation; it writes the flat declared set-point
  fields (`set_volume`, `set_temperature`, `set_rpm`, etc. per
  RD-11), and the object's `render_map` resolves the digit overlay
  or display visual. Brings the ratified protocol-level primitive
  count down from six (post RD-13) to five (`ObjectStateChange`,
  `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`).
- **RD-15 (semantic-state-vs-appearance rule)**: Generalized the
  drift class behind RD-3, RD-13, and RD-14 into a permanent rule.
  User-verbatim test: "Does this primitive change semantic simulation
  state, or does it merely describe how that state appears? If it
  merely describes appearance, move it to object/render." Every
  protocol-level primitive must change semantic simulation state, not
  describe appearance. Encoded as smell class 16 in
  `docs/SPEC_DESIGN_CHECKLIST.md` with the past-pitfalls (`SvgSwap`,
  `ColorChange`, `LiquidDisplayChange`, `SetPointDisplayChange`)
  named, and applied preemptively to the five remaining ratified
  primitives. PROTOCOL_VOCABULARY.md primitive-table reason column
  sharpened to state semantic effect explicitly for every primitive.
- **RD-16 (`CursorAttach` is the held-material state primitive)**:
  Per-primitive narrowing under RD-15. `CursorAttach` is protocol-
  level only when it means "the learner is now holding this object
  instance" (a semantic state change to the runtime's held-material
  state). It must not be read as "draw the object under the cursor"
  or as a cursor-follow visual; the cursor-follow render is owned by
  the scene / object-render layer. Operations stay limited to
  `attach` and `detach`.
- **RD-17 (`TimedWait` is the protocol-time-advance primitive)**:
  Per-primitive narrowing under RD-15. `TimedWait` is protocol-level
  only when it means "protocol time advances on this equipment" or
  "the timed condition on this equipment is satisfied" (a semantic
  change to the runtime's equipment-state). It must not be read as
  "show a spinner" or "render a progress bar"; the visible progress
  display is owned by the object's `render_map` over the equipment's
  declared timed-phase state. The `display` field is an authoring
  hint to the render layer about display style, not a protocol-side
  appearance knob.
- **RD-15 sweep verdict (per-primitive)**: `LayoutMove` already
  covered by RD-10 (placement-only; layout engine owns visible
  motion); PROTOCOL_VOCABULARY.md reason column extended to spell out
  RD-15 explicitly with no new RD. `ObjectStateChange` already
  covered by RD-8 (declared flat fields only); semantic by definition
  with no new RD. `SceneChange` is semantic by inherent definition (a
  scene transition is the scene-id state change); no new RD. Only
  `CursorAttach` and `TimedWait` required new RDs (RD-16 and RD-17
  respectively).
- **RD-18 (scene inheritance is three-layer asymmetric)**: Objects are
  canonical-by-id with no extends and no template-object layer; protocols are
  spec-shaped with no template-protocol layer; scenes use shallow one-level
  extends with a closed four-operation mutation surface. This asymmetry reflects
  semantic differences: objects are identity-bearing stateful entities; protocols
  are pedagogical workflows with their own learning contract; scenes are layout
  containers for shared workspaces. The bounded-inheritance rule prevents
  template-object proliferation, template-protocol duplication, and multi-level
  scene-inheritance chains. See SCENE_INHERITANCE.md.
- **RD-19 (one-level scene inheritance per protocol scene file)**:
  Scene inheritance is strictly one level with no chains (base -> protocol).
  No scene may extend a protocol scene, and no scene may extend a scene that
  already extends another scene. Depth = 1 per protocol scene file; multi-scene
  protocols allowed (each protocol scene file extends its own base
  independently). Cycles, multi-level chains, and unknown bases are build
  errors.
- **RD-20 (four named mutation operations, no generic overrides)**: Scene
  inheritance supports exactly four mutation operations on inherited placements:
  `add_placements`, `reposition_placements`, `deactivate_placements`,
  `remove_placements`. These are named explicit operations, not a generic
  `overrides:` block. Unknown operations are build errors. A protocol scene may
  not override any other field.
- **RD-21 (scene-inheritance promotion rule)**: A base scene moves from a
  protocol's internal scenes into `content/scenes/` when it is expected to serve
  multiple protocols OR when it represents a stable workspace contract shared
  across the curriculum. Seed workspace bases (bench_basic, hood_basic,
  plate_reader_basic, microscope_workspace_basic, well_plate_workspace_basic,
  centrifuge_workspace_basic) are promoted to `content/scenes/` and established
  as stable workspace context. Authoring convenience alone does not trigger
  promotion.
- **Deliberate reopen of just-closed `PROTOCOL_VOCABULARY.md`**: The
  M4-closed protocol vocabulary was reopened intentionally for the
  narrow `SvgSwap` / `ColorChange` / `LiquidDisplayChange`
  reclassification and the addition of `ObjectStateChange`. The
  reason is that the unified-interaction-vocabulary plan named those
  three primitives at the protocol layer before the object vocabulary
  existed; once the object layer was designed, they belonged on the
  render side. WP-DOC-PV1 was scoped narrowly to the primitive list
  and retired-terms sections; WP-RAT-C1 confirmed the re-partition
  before the doc edit.
- **Docs-first staging (docs ahead of YAML, YAML ahead of TypeScript)**:
  This plan deliberately ships canonical docs that describe a format
  the scene YAML files and TypeScript do not yet match. The two
  follow-on plans -- content/scene-YAML migration first, TypeScript
  migration second -- close that gap in order. Accepting the temporary
  doc/code mismatch is cheaper than designing the format inside the
  code rewrite.
- **`docs/CHANGELOG.md` rotation flagged for human decision**: With
  the 2026-05-15 entry appended, the active changelog crosses the
  ~1000-line rotation threshold (current: 1049 lines before the entry,
  more after). Per WP-DOC-C1's obvious-follow-on rule, rotation is
  not performed as part of this work package; the human owner decides
  when and how to rotate.
- **Flat model could not express a multi-gesture step**: The first-pass flat
  six-slot model could not represent a single step that needs several
  gestures, which forced the course-correction to the two-level
  step/interaction model. An earlier seven-slot variant was also tightened to
  six slots.
- **`scene_operation` kept distinct from `response`**: `scene_operation`
  stays the durable typed-primitive layer and was deliberately not renamed to
  `response`. The first pass's "base actions" are renamed to `scene_operation`
  primitives because they describe how the scene changes, not what the learner
  does (OQ-10).
- **Uniform snake_case, vocabulary rewrite not a compatibility layer**: Chose
  snake_case uniformly across the vocabulary for readability and repo
  consistency, and applied a uniform snake_case sweep across the design doc.
  This is a vocabulary rewrite: legacy camelCase terms such as
  `completionPath`, `volumeMl`, and `plateTargets` are removed from the
  target-state vocabulary, not preserved (OQ-10).
- **Naming and ordering rules locked in**: Ratified that `step.name` is the
  stable identifier, `next_step` names the next step explicitly, and
  `step_index` is display-only. In the tightened model `sequence` order is
  always meaningful; the earlier opt-in `sequence_mode: unordered` relaxation
  is dropped (OQ-9).
- **Tighten to a linear spec first, defer the branching model (WP-STA1)**:
  Decided to tighten the model to a tight linear protocol spec now and defer
  the learning-tree / complex-branching model. The `outcome` mapping stays the
  simple `{ on_success, on_failure }` shape; the graph-flow framing is a stated
  future direction, not built. Unordered sequences, the interaction `name`, and
  any non-visual bookkeeping path are likewise deferred until a later plan has
  evidence (OQ-14, OQ-15).
- **Set-point gap forced `SetPointDisplayChange` (WP-SOP1 follow-up)**: Found a
  real gap -- the `adjust` gesture sets a set-point and the runtime state model
  lists "set-point values" as a state row, but no `scene_operation` primitive
  wrote it. Ratified `SetPointDisplayChange` as the eighth primitive to close
  it (OQ-21), and fixed the stale WP-PED1 `adjust` worked example, which
  previously misused a `LiquidDisplayChange` `operation: hold` to render a
  set-point.
- **"click target" / `ClickTarget` naming collision resolved (WP-BND1)**:
  Resolved the `PROTOCOL_VOCABULARY.md` "click target" versus
  `SCENE_VOCABULARY.md` `ClickTarget` naming collision. A protocol names a
  `target`; the scene adapter resolves it to a `placement`; "click target"
  is retired from the protocol vocabulary, and `ClickTarget` is scoped to the
  narrow `{itemId}` driver-payload runtime type. This gives the M4
  canonical-doc rewrites one decision to follow.
- **Ninth `scene_operation` primitive deferred (M3, Option 2 accepted)**: M3
  ratification surfaced instrument-produced data (absorbance readouts, cell
  counts, gel band patterns, molecular-weight estimates) as a candidate ninth
  `scene_operation` primitive, `DataReadout` / `InstrumentReadDisplayChange`.
  Option 2 was accepted: instrument data stays feedback-only for this pass and
  is not modeled as a typed primitive. Designing and ratifying the ninth
  primitive is carried to the follow-on code-migration plan.
- **OQ-19 resolved: domain verbs are shorthand, not YAML fields**: Domain verbs
  are authoring and documentation shorthand only. They are not protocol YAML
  fields; executable protocol YAML is always the expanded two-level model.
  Domain verbs expand at author time and never appear in the runtime schema.
- **CHANGELOG / ROADMAP / TODO left untouched as historical record**: A
  deliberate decision was made to leave `docs/CHANGELOG.md` prior entries,
  `docs/ROADMAP.md`, and `docs/TODO.md` unedited. They are a historical record
  of how the vocabulary evolved; rewriting them to the ratified model would
  destroy that record. Only new dated entries are appended.
- **Two primary docs reconciled to the ratified model**: A follow-on
  primary-doc pass reconciled both primary docs to the ratified two-level
  model. `docs/PRIMARY_DESIGN.md` had its "Flow before
  implementation" passage rewritten off `completionPath.kind`,
  `interactionSequence`, and `nextId` onto the two-level model.
  `docs/PRIMARY_SPEC.md` had its top-level-fields YAML
  example, entry block, and the completion-paths / derived-fields sections
  rewritten to the ratified step / interaction / response schema, with
  clearly-labeled current-code notes where the legacy `completionPath.kind`,
  `completionEvent`, `completionTrigger`, `usedItems`, and `nextId` fields are
  still what the runtime reads. `docs/PRIMARY_CONTRACT.md`
  was checked and contains no retired vocabulary. The remaining residual is the
  code itself, carried to the follow-on code-migration plan.

### Developer Tests and Notes
- **M3 ratification evidence**: 120 steps across OVCAR8, the 7 shipped
  `content/*/protocol.yaml` files, Miraculin, and SDS-PAGE all map to the
  ratified two-level model with no M2 design revision required. The
  dependent-doc set rewritten under M4 / WP-DOC-D1 is internally consistent;
  `docs/PRIMARY_SPEC.md` and `docs/PRIMARY_DESIGN.md` are the only known
  residual contradictions and are handed off to the follow-on code-migration
  plan stub at
  [active_plans/protocol_vocabulary_code_migration_plan.md](active_plans/protocol_vocabulary_code_migration_plan.md).

## 2026-05-14 (unified interaction vocabulary: M1 evidence)

### Additions and New Features
- **Unified interaction vocabulary plan**: Added
  `docs/active_plans/unified_interaction_vocabulary_plan.md`, the approved
  docs-first plan to design one scene-agnostic protocol interaction vocabulary
  (`target + mode + action`) ratified against all four source protocols
  before any code changes.
- **Protocol interaction inventory (M1 evidence artifact)**: Added
  `docs/active_plans/protocol_interaction_inventory.md`, consolidating the
  evidence base: the click-target fields and 54-step mapping across the 7
  shipped `content/*/protocol.yaml` files, the legacy
  `src/interaction_resolver.ts` action model, the `target + mode + action`
  mappings of OVCAR8 / Miraculin / SDS-PAGE, the candidate base primitives and
  composed-action categories, the candidate mode set, the residual gaps, and
  the known content inconsistencies.

### Decisions and Failures
- **Drift origin recorded**: The protocol vocabulary was designed against the
  cell-culture scene; `plateTargets` / `tubeTargets` and the four
  `completionPath.kind` step types are scene-specific drift. The M0 doc audit
  (`docs/active_plans/scene_runtime_doc_conflicts.md`) mis-classified the
  `plateTargets` / `tubeTargets` sections as `matches-contract`; the new plan
  supersedes that verdict. `tubeTargets` is broken in the modern runtime
  (contract types it as `{tubeId}`, YAML authors `{source, diluent, ...}`).

## 2026-05-14 (scene_runtime spine and subsystems: M3-M6)

### Additions and New Features
- **New `src/scene_runtime/` runtime spine**: Added the modern scene runtime tree to replace the
  legacy hood-centric design from `src/scenes/`. New modules:
  - `src/scene_runtime/contract.ts` - shared runtime contract types.
  - `src/scene_runtime/types.ts` - core scene runtime type definitions.
  - `src/scene_runtime/layout/` - layout engine for positioning clickable scene objects.
  - `src/scene_runtime/dispatch/` - click dispatch subsystem.
  - `src/scene_runtime/highlight/` - object highlighting subsystem.
  - `src/scene_runtime/liquid/` - liquid state subsystem per the liquid convention.
- **Well plate adapter**: Added `src/scene_runtime/adapters/well_plate/` (`index.ts`, `render.ts`).
  The adapter renders the 96-well plate as a structured scientific object with addressable wells
  (`data-well-id`, unpadded `A1`..`H12`). Equipment around the plate is placed via `layoutScene()`;
  only the wells inside the plate use custom geometry, consistent with PRIMARY_CONTRACT item 3.
- **Scene runtime unit tests**: Added focused tests for each new subsystem:
  - `tests/test_dispatch_click.ts` - click dispatch behavior.
  - `tests/test_highlight.ts` - highlight subsystem behavior.
  - `tests/test_layout_engine.mjs` - layout engine positioning.
  - `tests/test_liquid_state.mjs` - liquid state transitions.
  - `tests/test_scene_runtime_loader.py` - scene runtime loader.

### Behavior or Interface Changes
- **Layout engine default constants changed**: In `src/scene_runtime/layout/`, `DEFAULT_ITEM_WIDTH`
  and `DEFAULT_ITEM_HEIGHT` changed from 10 to 100, and `MIN_GAP` changed from 2 to 10. The earlier
  values produced scene objects too small to interact with at realistic viewport sizes.

## 2026-05-14 (Generic schema-driven walker: M4-M6)

### Additions and New Features
- **Generic schema-driven walker**: Added `tests/playwright/walker/` (engine) and
  `tests/playwright/walker.mjs` (CLI). The walker dispatches only on `completionPath.kind`. It
  contains zero `step.id` or `protocolId` branches and never writes runtime state, so it advances
  a protocol only through the same visible UI path a student would use.
- **Walker fixtures**: Added fixtures under `tests/playwright/fixtures/`: `smoke`,
  `interactions_array`, `plate_drug_treatment`, `plate_drug_treatment_full`, and
  `plate_drug_treatment_real`. The walker reads steps from each fixture's `protocol.mjs`.
- **Test fixture build tool**: Added `tools/build_test_fixture.sh`, which esbuild-bundles the real
  well plate adapter to `adapter-wrapped.js` so fixtures load it under `file://` without CORS
  errors.
- **Walker branch enforcement test**: Added `tests/test_walker_no_step_branches.py` to enforce that
  the walker stays schema-driven (no per-step or per-protocol branching).

### Developer Tests and Notes
- **M6 schema-coverage track CLOSED**: The `plate_drug_treatment_full` fixture passes all 9 steps
  through the generic walker (9/9), proving the walker handles the full schema surface for that
  protocol shape.
- **M6 real-adapter track PARTIAL**: Steps 1-5 of `plate_drug_treatment` are proven through the
  real `src/scene_runtime/adapters/well_plate/` adapter via visible UI clicks (walker 5/5). Steps
  6-9 against the real adapter are deferred; see Decisions and Failures below.

## 2026-05-14 (src/scenes/ freeze: M3)

### Behavior or Interface Changes
- **`src/scenes/` frozen as legacy**: Added a legacy banner header to every file under
  `src/scenes/`. New scene work lives in `src/scene_runtime/` plus `content/*/` YAML; `src/scenes/`
  is no longer extended.

### Additions and New Features
- **Freeze enforcement tests**: Added tests to lock the freeze:
  - `tests/test_scenes_freeze_baseline.py` with `tests/data/scenes_freeze_baseline.json` locks the
    per-file line counts of every `src/scenes/` file.
  - `tests/test_scenes_legacy_banner.py` enforces the legacy banner header on every `src/scenes/`
    file.
  - `tests/test_scene_runtime_no_scenes_imports.py` enforces zero imports from `src/scenes/` into
    `src/scene_runtime/`.

## 2026-05-14 (plate_drug_treatment content and backend status)

### Additions and New Features
- **Scene YAML for plate_drug_treatment**: Added `content/plate_drug_treatment/scene.yaml`.

### Behavior or Interface Changes
- **plate_drug_treatment protocol content reworked**: Revised the content text in
  `content/plate_drug_treatment/protocol.yaml`.

### Decisions and Failures
- **Backend architecture refactor PAUSED**: An architect-proposed backend design was rejected by
  the user. The proposal introduced `plateTargets`/`tubeTargets` as first-class primitives; the
  user judged this a regression on the protocol vocabulary. `interactions` is the canonical
  primitive and should stay that way.
- **Schema reconciliation findings**: A reconciliation pass over the modern runtime found:
  - `interactions[]` and `plateTargets[]` are LIVE: exercised across the walker, dispatch,
    highlight, and build paths.
  - `tubeTargets[]` is BROKEN: `contract.ts` types it as `{tubeId}`, but the YAML uses
    `{source, diluent, destination, ...}`. The walker produces zero clicks for it.
  - `stateChange.heldLiquid`, `consumesVolumeMl`, per-interaction `completionEvent`,
    `requiredItems`, and `plateMap` are DEAD in the modern runtime (declared but not consumed).
- **Open question blocking resumption**: How should the schema express a transfer into many wells
  or tubes (for example, `add_carboplatin` targeting 84 wells) without either hand-authoring 84
  individual interactions or reintroducing a parallel target-collection like `plateTargets`?
  Resolving this is a prerequisite to resuming the backend refactor.

## 2026-05-14 (Content quality verification: cell_culture_full sequence runner)

### Verification and Audit
- **Verified cell_culture_full sequence runner contract compliance**: Audited `content/cell_culture_full/protocol.yaml` against PRIMARY_CONTRACT item 5 (learning block requirement for sequence runners).
  - Learning block carries all three required fields with correct sequence-runner-specific prefixes (not mini-protocol prefixes).
  - `learning.objectives` begins with "Students completing this protocol will have achieved..." [OK]
  - `learning.outcomes` begins with "Students completing this protocol will be able to..." [OK]
  - `learning.goals` begins with "Overall, this protocol aims to accomplish..." [OK]
  - All three fields accurately describe the complete OVCAR8 cell culture dose-response workflow from flask prep through MTT readout.

- **Verified sequence runner structure and constituent references**: Confirmed all required structural elements and integrity of mini-protocol linkage.
  - `protocolType: sequence_runner` declared [OK]
  - `entry` block present and correctly points to first constituent mini-protocol's entry (`scene: cell_culture_hood`, `step: spray_hood`) [OK]
  - `steps`, `parts`, `days` are all empty arrays as required for sequence runners [OK]
  - `sequence` list contains five mini-protocol ids in correct scientific order:
    1. `hood_flask_prep` - flask cleaning and enzymatic dissociation
    2. `cell_counting_and_seeding` - cell counting and plate seeding
    3. `drug_dilution_setup` - drug dilution planning and calculation verification
    4. `plate_drug_treatment` - plate drug additions (Day 2)
    5. `mtt_assay_readout` - MTT viability assay and readout
  - All five constituent mini-protocol folders and protocol.yaml files exist with correct ids [OK]

- **Verified consistency with reworked mini-protocol learning blocks**: The sequence runner's learning block accurately reflects the scope and pedagogy of all five constituent mini-protocols post-rework:
  - hood_flask_prep teaches aseptic flask passaging and enzymatic dissociation (included in "aseptic hood technique")
  - cell_counting_and_seeding teaches hemocytometer counting and accurate plate seeding (included in "cell counting")
  - drug_dilution_setup teaches dilution planning and calculation verification (included in "dilution calculations")
  - plate_drug_treatment teaches dose-response design and plate preparation (included in "plate preparation" and "drug dosing")
  - mtt_assay_readout teaches complete MTT workflow (included in "quantitative viability assay readout")

### Developer Tests and Notes
- All verification commands pass cleanly:
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema or reference errors)
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (size-exempt sequence runner; learning block fully compliant)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
- Sequence runner is schema-compliant and ready for walker integration in subsequent milestones.
- Residual risk: None. All structure verified, learning block accurate, all referenced mini-protocols exist and are post-rework.

## 2026-05-14 (Content quality rework: drug_dilution_setup)

### Behavior or Interface Changes
- **Mini-protocol reframed as planning/calculation workflow**: `content/drug_dilution_setup/protocol.yaml` was entirely quiz-based (8 multipleChoice steps with no hands-on interaction). Reworked to explicitly frame as a **dilution planning and calculation verification** mini-protocol rather than a hands-on lab workflow.
  - Updated learning block to emphasize planning, calculation verification, and preparation for execution.
  - `learning.objectives` now focuses on "calculations required to plan and verify the preparation" rather than abstract fluency.
  - `learning.outcomes` now emphasizes "calculate and verify the complete dilution cascade" for multi-drug experiments.
  - `learning.goals` now targets "mastery of dilution planning and calculation verification for complex multi-drug experiments" as a bridge to the full protocol planning phase.
  - Entry scene remains `well_plate_workspace` as reference context for where solutions will be added (not for interactive manipulation).

- **Normalized step labels and actions to consistent imperative voice**: All 8 steps now use parallel "Verify..." or "Recognize..." imperatives, reflecting the planning/calculation mindset.
  - Step 1: "Verify carboplatin intermediate dilution recipe" (was "Calculate...")
  - Step 2: "Verify final carboplatin concentration for Row B" (was "Calculate...")
  - Step 3: "Recognize the 1-2-5 dose-series pattern" (was "Identify...")
  - Step 4: "Verify the recipe for 4 uM carboplatin working stock" (was "Calculate...")
  - Step 5: "Verify metformin working stock recipe" (was "Calculate...")
  - Step 6: "Verify final metformin concentration in well" (was "Calculate...")
  - Step 7: "Verify the requirement to pre-warm media adjustments" (was "Explain...")
  - Step 8: "Verify the complete dilution strategy" (was "Review...")

- **Updated all `why` fields** to reinforce planning/calculation focus and interdependencies:
  - Emphasized parent-child cascade relationships.
  - Connected each calculation to its practical importance in planning.
  - Highlighted how pre-planning prevents errors during execution.
  - Reframed as components of a cohesive multi-drug dose-response planning workflow.

### Fixes and Maintenance
- **Verified science accuracy**: Reviewed all 8 steps for arithmetic correctness:
  - Carboplatin 10 mM -> 400 uM: 40 uL stock + 960 uL (VERIFIED).
  - 400 uM -> 4 uM: 10 uL + 990 uL (VERIFIED).
  - 4 uM x 5 uL / 200 uL well = 0.1 uM (VERIFIED).
  - Metformin 1 M -> 200 mM: 200 uL stock + 800 uL (VERIFIED).
  - 200 mM x 5 uL / 200 uL well = 5 mM (VERIFIED).
  - All multipleChoice feedback text is arithmetically consistent.
  - Pre-warming rationale is scientifically sound (osmotic shock prevention).

- **Verified step completionPath structure**: All 8 steps are multipleChoice with correctly marked correct answers and feedback. No structural defects found.

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block complies with PRIMARY_CONTRACT item 5; step count 8 within 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions across full test suite).
- Protocol step count: **8 steps** (within 6-10 range).
- All items referenced in steps are declared in items.yaml (well_plate) and reagents.yaml (carboplatin, metformin, media).
- Pedagogical approach: Reframing as a planning/calculation mini-protocol is honest and aligns with the protocol's current design. All-quiz is appropriate for a calculation-focused protocol; adding hands-on interaction would require scene state management and asset definitions that do not yet exist.
- Residual risk: None. Learning block now explicitly describes the planning/calculation workflow. All step labels are consistent. Science is correct. All tests pass.

## 2026-05-14 (Content quality rework: plate_drug_treatment)

### Fixes and Maintenance
- **PRIMARY_CONTRACT item 5 compliance and pedagogical clarity**: Reworked learning block in `content/plate_drug_treatment/protocol.yaml` to be more focused on actual learning outcomes and scientific context.
  - `learning.objectives` now emphasizes what students gain fluency with: logarithmic dose-response assay design (1-2-5 series), media-adjustment discipline, and fixed-dose modifier approaches (was overly focused on plate map and media rule).
  - `learning.outcomes` now clearly states what students can do: dose a 96-well OVCAR8 assay plate on Day 2 using the specific dose series (0.1-10 uM final), 5 mM metformin, and 200 uL final volume (was vague about cell type and specific doses).
  - `learning.goals` now articulates the complete workflow integration: carboplatin dilution, metformin application, and media-adjustment sequencing ready for incubation (was generic "Day-2 workflow").
  - All three fields remain contract-compliant with exact verbatim prefixes.

- **Step 7 structure clarification** (`add_carboplatin`, the 1-2-5 dose series addition):
  - Refactored `interactions` array to remove verbose per-row comments while preserving the canonical `plateTargets` array that encodes the dose series structure (rows B-H each with per-row dose labels: 0.1 uM, 0.2 uM, 0.5 uM, 1 uM, 2 uM, 5 uM, 10 uM).
  - Step remains a single coherent "add dose series to all rows" interaction sequence (not split into 7 separate steps), staying within the 6-10 step gate (protocol has 9 steps total).
  - The `plateTargets` array is the canonical declarative source for which wells receive which dose; `interactions` array provides the generic tool/source/destination pattern.
  - No change to protocol behavior, runtime execution, or walker expectations.

- **Declarative data verification**: All completionPath definitions, interaction sequences, plateTargets, and item declarations verified to be internally consistent, correctly ordered, and scientifically accurate for OVCAR8 96-well dose-response on Day 2.

### Behavior or Interface Changes
- None (internal protocol content and documentation only; no API or runtime changes).

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block validation).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 9 steps (within 6-10 gate; no change from baseline).
- All required items (7 carboplatin dilution tubes, 1 metformin dilution tube, 2 stock solutions, 1 media bottle, 1 96-well plate, 1 multichannel pipette) declared in items.yaml/reagents.yaml/scene.yaml.
- All step labels, actions, `why` fields, completionPaths, and plateTargets internally consistent with the scientific workflow (Day-2 OVCAR8 dosing with carboplatin 1-2-5 series and fixed-dose 5 mM metformin, media-adjusted to 200 uL final per well).
- Residual risk: None. Protocol is contract-compliant, pedagogically clear, and scientifically correct.

## 2026-05-14 (Content quality rework: mtt_assay_readout)

### Fixes and Maintenance
- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/mtt_assay_readout/protocol.yaml` to use exact verbatim prefixes required by contract.
  - `learning.objectives` now starts with "Students completing this mini-protocol will have achieved" (previously missing required prefix).
  - `learning.outcomes` now starts with "Students completing this mini-protocol will be able to" (previously missing required prefix).
  - `learning.goals` now starts with "Overall, this mini-protocol aims to accomplish" (previously missing required prefix).
  - Refocused objectives/outcomes/goals to explicitly mention safe waste handling, reagent addition, incubation, safe MTT removal, solubilization, and absorbance measurement at 560 nm.

- **Unrealistic interaction fix**: Reworked step `decant_mtt` to use pipette-based safe removal instead of hand-decant.
  - Original step used `tool: well_plate` with only `destination: biohazard_decant` and no source/liquid/volume, implying unsafe hand-pouring of toxic MTT.
  - New step uses `tool: multichannel_pipette` with proper `source: well_plate`, `liquid: mtt`, `volumeMl: 0.025` (matching the added volume) and `destination: biohazard_decant`, matching the safe lab practice of pipetting spent reagent into waste.
  - Updated step label and action from "Decant MTT into the biohazard bin" to "Remove spent MTT with multichannel pipette" to clarify the method.
  - Updated `requiredItems` to include `multichannel_pipette` (was missing, only had `well_plate` and `biohazard_decant`).
  - Updated error hint from "MTT goes into the biohazard bin, not the vacuum waste" to "Use the multichannel pipette to safely remove MTT into the biohazard bin" to align with the new method.

- **Backwards feedback text fix**: Corrected choice feedback in step `review_results` (multipleChoice question on MTT absorbance interpretation).
  - Choice A (choice_reduced_viability, correct): Feedback now explicitly states that lower absorbance in drug-treated cells (0.3 vs 0.8) indicates fewer viable cells and correlates to the drug being toxic or growth-inhibitory.
  - Choice B (choice_higher_viability, incorrect): Feedback was previously phrased backwards ("Higher absorbance... indicates more viable cells"); now correctly explains that untreated cells have higher absorbance (0.8) = more live cells, drug-treated cells have lower absorbance (0.3) = the drug reduces viability.
  - Choice C (choice_no_difference, incorrect): Feedback now quantifies the 0.5 absorbance unit difference (0.8 vs 0.3) as significant and states it indicates a substantial reduction in cell viability.

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block now contract-compliant; step count 6 within 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 6 steps (within 6-10 range); all items referenced in steps are declared in items.yaml and reagents.yaml.
- Residual risk: None. All contract violations fixed, pipette-based interaction is scientifically sound and matches lab practice, feedback is now logically correct and aligned with MTT biology, and all tests pass.

## 2026-05-14 (Content quality rework: hood_flask_prep mini-protocol)

### Fixes and Maintenance
- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/hood_flask_prep/protocol.yaml` to consolidate objectives and match contract requirements.
  - `learning.objectives` now focuses on ONE integrated workflow ("fluency with aseptic flask passaging, including all stages from hood preparation through enzymatic dissociation and cell resuspension") instead of listing seven granular skills separately.
  - `learning.outcomes` and `learning.goals` already had correct verbatim prefixes; confirmed they remain unchanged.

- **Aspiration step incomplete**: Step `aspirate_old_media` was missing critical fields in its interaction definition.
  - Added `liquid: media` to specify what is being aspirated (spent media).
  - Added `volumeMl: 9` to define the volume (approximate flask volume after initial seeding with 12 mL media and partial cell confluence).
  - Added `correctVolumeMl: 9` and `toleranceMl: 1` at step level to match error hint semantics.
  - Added error hint `volume_off` for clarity on aspirate volume.

- **Resuspend volume mismatch**: Step `resuspend` declared `correctVolumeMl: 12` in the label and step metadata, but the interaction only transferred `volumeMl: 10`.
  - Changed all occurrences to `12 mL` for scientific consistency: a T-75 flask passaging protocol typically resuspends in 10-12 mL to achieve ~2e5 cells/mL working concentration (downstream seeding uses 100 µL per well to target ~2e4 cells/well in a 96-well plate).
  - Updated first interaction's source transfer from `volumeMl: 10` to `volumeMl: 12`.
  - Updated heldLiquid volume from `10` to `12`.
  - Updated destination consumesVolumeMl from `10` to `12`.
  - Removed `waste_container` from `requiredItems` (resuspension does not route to waste).

- **completionPath verification**: Confirmed all steps reference items declared in items.yaml (ethanol_bottle, flask, serological_pipette, aspirating_pipette, pbs_bottle, trypsin_bottle, media_bottle, waste_container, centrifuge, conical_15ml_rack). All interaction sequences properly shaped.

### Behavior or Interface Changes
- Aspiration step now explicitly tracks media type and volume, enabling liquid state tracking and volume validation during student interaction.
- Resuspend step now uses correct target volume (12 mL) throughout, enabling precise volume checking and feedback.
- Learning block now emphasizes the integrated single-workflow nature of aseptic flask passaging (matching PRIMARY_CONTRACT item 5 intent: one focused self-contained workflow).

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block contract-compliant, 7 steps in 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- All items/liquids/volumes in interactions are now internally consistent across the protocol.
- Residual risk: None. All identified issues resolved.

## 2026-05-14 (Content quality rework: cell_counting_and_seeding)

### Fixes and Maintenance
- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/cell_counting_and_seeding/protocol.yaml` to use exact verbatim prefixes required by contract.
  - `learning.objectives` now starts with "Students completing this mini-protocol will have achieved" (was missing prefix).
  - `learning.outcomes` now starts with "Students completing this mini-protocol will be able to" (was missing prefix).
  - `learning.goals` now starts with "Overall, this mini-protocol aims to accomplish" (was missing prefix).
  - Refocused objectives/outcomes/goals to match the actual steps: manual hemocytometer counting, dilution calculation, and seeding volume determination (removed reference to automated counter, which is step 1 but not central to learning).

- **Modal schema violation fix**: Step `count_hemocytometer_quadrants` was missing required `openClick` in `completionPath.kind: modal`. Added `openClick: hemocytometer` to match the schema requirement (modal steps require both `openClick` and `advanceClick`).

- **Math error fix in step `calculate_dilution` and `calculate_seeding_volume`**:
  - The original working suspension concentration was set to 2e4 cells/mL, but seeding 100 µL per well would deliver only 2e3 cells per well, not the stated goal of 2e4 cells/well.
  - Fixed to use correct working suspension concentration: 2e5 cells/mL (so 100 µL per well delivers 2e4 cells).
  - Updated `calculate_dilution` question and all choice feedback to reference 2e5 cells/mL.
  - Updated `calculate_seeding_volume` question and all choice feedback to reference 2e5 cells/mL and correctly show that 100 µL delivers 2e4 cells.
  - Updated `seed_plate` error hint and description to reference 2e5 cells/mL suspension.

- **Overstated precision fix**: Changed learning outcomes from "exactly 2e4 cells per well" to "approximately 2e4 cells per well" to acknowledge pipetting and counting variability.

### Behavior or Interface Changes
- Protocol step descriptions now use correct target cell density language (2e5 cells/mL working suspension -> 2e4 cells/well in 96-well plate).
- Learning block now matches what is actually taught: manual hemocytometer counting (not automated counter), dilution formula, and seeding volume calculation.

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block now contract-compliant).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 7 steps (within 6-10 range); all items referenced in steps are declared in items.yaml and reagents.yaml.
- Residual risk: None. All contract violations fixed, math is now consistent, and all tests pass.

## 2026-05-14 (M6 corrective: well-id format regression - unpadded wellId canonical format)

### Fixes and Maintenance
- **REGRESSION FIX**: Fixed well-id format to canonical unpadded form (e.g., `B1`, `B12`, `H6` not `B01`, `B12`, `H06`).
  - Prior M6 work introduced zero-padded well IDs in the real adapter (`src/scene_runtime/adapters/well_plate/`) and walker engine (`tests/playwright/walker/index.js`).
  - This broke backward compatibility with existing fixture `plate_drug_treatment_full`, which uses unpadded well IDs matching the YAML protocol specification (e.g., `cols: [1, 2, 3, ..., 12]`).
  - Canonical format is unpadded: `<uppercase row A-H><bare integer col 1-12>` (e.g., `B1`, `B12`, `H6`).
  - This is the shared contract between walker engine, all adapters (well_plate and others), and scene runtime dispatch/highlight systems.

- Reverted [tests/playwright/walker/index.js](../tests/playwright/walker/index.js):
  - Removed `.padStart(2, '0')` from well-id generation in `plateTargets` handling (lines 59, 71).
  - Walker now generates unpadded well IDs from protocol `plateTargets` exactly as it did before step-5 work.

- Fixed [src/scene_runtime/adapters/well_plate/render.ts](../src/scene_runtime/adapters/well_plate/render.ts):
  - Removed `.padStart(2, '0')` from column label generation in `renderWellGrid()` (line 135).
  - Removed `.padStart(2, '0')` from well-id generation in wells grid loop (line 145).
  - Removed `.padStart(2, '0')` from column label generation in `renderWell()` helper (line 178).
  - Wells now render with unpadded `data-well-id` attributes (e.g., `data-well-id="B1"` not `data-well-id="B01"`).

- Fixed [src/scene_runtime/dispatch/index.ts](../src/scene_runtime/dispatch/index.ts):
  - Updated `expandPlateTargets()` helper to produce unpadded well IDs (e.g., `B1`, `B12` not `B01`, `B12`).
  - Removed `.padStart(2, '0')` from column label generation (line 133).
  - Updated JSDoc example from `['B01', 'B02', 'C01', 'C02']` to `['B1', 'B2', 'C1', 'C2']`.

- Fixed [src/scene_runtime/highlight/index.ts](../src/scene_runtime/highlight/index.ts):
  - Updated `expandPlateTargets()` helper to produce unpadded well IDs.
  - Removed `.padStart(2, '0')` from column label generation (line 141).
  - Updated JSDoc example from `['B01', 'B02', 'C01', 'C02']` to `['B1', 'B2', 'C1', 'C2']`.

- Rebuilt fixture adapter: `bash tools/build_test_fixture.sh plate_drug_treatment_real` to reflect adapter source changes in `adapter-wrapped.js`.

### Behavior or Interface Changes
- Well-id format is now canonically unpadded across walker engine, all adapters, and scene runtime dispatch/highlight/render systems.
- Fixture `plate_drug_treatment_full` regains full regression coverage (was 4/9, now 9/9 with unpadded well IDs).
- Fixture `plate_drug_treatment_real` maintains step 5 verification (5/5 passes with unpadded well IDs).

### Developer Tests and Notes
- Verification suite (all commands pass cleanly):
  - `npx tsc --noEmit`: clean (TypeScript type-safe)
  - `node tests/test_layout_engine.mjs`: **7 pass** (no regressions)
  - `node tests/test_liquid_state.mjs`: **12 pass** (no regressions)
  - `node --import tsx --test tests/test_dispatch_click.ts tests/test_highlight.ts`: **19 pass** (no regressions)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_full`: **9/9** pass (RESTORED: regression now fixed, all 9 steps complete with unpadded wells)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **5/5** pass (step 5 verification holds with unpadded wells)
- Canonical well-id format is stable and shared across all systems: `<uppercase row letter A-H><bare integer col 1-12>` (no zero-padding).
- No changes to `src/scenes/` (frozen per contract).
- No changes to fixture protocol definitions (they are correct reference implementations).

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: plateTargets well-click support and step 5 integration)

### Additions and New Features
- Extended [src/scene_runtime/adapters/well_plate/index.ts](../src/scene_runtime/adapters/well_plate/index.ts) to wire click handlers on well plate elements:
  - Added click handler registration for `[data-well-id]` elements alongside `[data-item-id]` elements.
  - Well clicks dispatch as `{ id: wellId, kind: 'well' }` through the existing `dispatchClick()` path.
  - Both item and well clicks apply the same click tracking and step completion logic.

- Extended [src/scene_runtime/dispatch/index.ts](../src/scene_runtime/dispatch/index.ts) to resolve well clicks against `plateTargets`:
  - Added `expandPlateTargets()` helper to expand rows x cols arrays into well IDs (e.g., `rows: ['B']`, `cols: [1,2]` -> `['B01', 'B02']`).
  - Updated `dispatchInteractionSequence()` to accept `kind: 'well'` and check if clicked well ID is in expanded `plateTargets`.
  - Non-matching wells return `matched: false` (no partial credit for wrong-order or wrong-target wells).

- Extended [src/scene_runtime/highlight/index.ts](../src/scene_runtime/highlight/index.ts) to highlight target wells:
  - Added `expandPlateTargets()` helper (same logic as dispatch).
  - Updated `highlightInteractionSequence()` to expand `plateTargets` into well IDs for `nextTargets` when destination is `well_plate`.
  - Completed wells are tracked separately in `completedTargets` (marked with `.is-filled` class).

- Enhanced [src/scene_runtime/adapters/well_plate/render.ts](../src/scene_runtime/adapters/well_plate/render.ts):
  - Updated `renderWellGrid()` to accept optional `HighlightState` parameter.
  - Applied `.is-next-target` class to wells in `nextTargets` for blue highlight during interaction.
  - Applied `.is-filled` class to completed wells for green background visual confirmation.
  - Added CSS rule for `.well.is-filled` with green background (#c8e6c9) and border (#4caf50).

- Extended `tests/playwright/fixtures/plate_drug_treatment_real/protocol.mjs`:
  - Added step 5 (`add_media_cols_1_6`) as first protocol step using `plateTargets` (rows: [B-H], cols: [1-6]).
  - Step 5 completionPath includes 2 interactions (tool/source, tool/destination) plus plateTargets array.

- Extended `tests/playwright/fixtures/plate_drug_treatment_real/index.html`:
  - Added `step5` variable with plateTargets configuration matching YAML spec.
  - Added `renderStep5()` function to instantiate real adapter with step 5.
  - Updated `completeStep()` to transition from step 4 to step 5 (added `prep_metformin_dilution` -> `add_media_cols_1_6` branch).
  - Updated header description to indicate "Steps 1-5" support.

- Fixed [tests/playwright/walker/index.js](../tests/playwright/walker/index.js):
  - Updated `plateTargets` well ID generation to zero-pad column numbers (e.g., `B1` -> `B01`).
  - Matches render function's well ID format exactly for selector resolution.

### Behavior or Interface Changes
- Well plate now supports granular click-level targeting within the 96-well grid via `plateTargets` YAML declaration.
- Target wells display blue highlight (`.is-next-target`) before click and green background (`.is-filled`) after click.
- Walker now generates zero-padded well IDs (`B01` not `B1`) for consistency with adapter render output.

### Fixes and Maintenance
- None (all changes are additions for M6 plateTargets feature).

### Developer Tests and Notes
- Verification suite:
  - `npx tsc --noEmit`: clean (TypeScript type-safe)
  - `node tests/test_layout_engine.mjs`: **7 pass** (no regressions)
  - `node tests/test_liquid_state.mjs`: **12 pass** (no regressions)
  - `node --import tsx --test tests/test_dispatch_click.ts tests/test_highlight.ts`: **19 pass** (no regressions; dispatch and highlight functions tested)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline holds)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **5/5** pass (all steps including step 5 with 42 well clicks complete)
    - Step 1: open_plate_workspace (modal kind) - PASS
    - Step 2: prep_carb_first_dilution (interactionSequence) - PASS
    - Step 3: prep_carb_last_dilution (interactionSequence) - PASS
    - Step 4: prep_metformin_dilution (interactionSequence) - PASS
    - Step 5: add_media_cols_1_6 (interactionSequence with plateTargets) - **NEW** PASS (42 well clicks: B01-H06, rows B-H x cols 1-6)
  - `ls test-results/walker/plate_drug_treatment_real/step_05/`: **42 action pairs** (action_01 through action_42, each with before/after screenshots showing well highlight and fill state)
- Step 5 well clicks flow through real `initWellPlateAdapter()` via `dispatchClick()` with kind='well', highlighting and filling work end-to-end.
- All changes are generic (no step IDs, no hardcoded rows/cols, no protocol branches in dispatch/highlight/render).
- wellId format is stable: uppercase row letter (A-H) + zero-padded column (01-12) = B01, B02, ..., H12.

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: real adapter load path + steps 1-4 fixture expansion)

### Additions and New Features
- Extended `tests/playwright/fixtures/plate_drug_treatment_real/` to define and render steps 1-4 (previously only 1-2 defined):
  - Added step 3 (`prep_carb_last_dilution`) and step 4 (`prep_metformin_dilution`) as JavaScript constants with `kind: interactionSequence`.
  - Added `renderStep3()` and `renderStep4()` functions that call `initWellPlateAdapter()` with step 3-4 definitions.
  - Updated `completeStep()` to transition to step 3 when step 2 completes, and to step 4 when step 3 completes.
  - All 4 steps are fully defined, ready for walker navigation.

- Extended `content/plate_drug_treatment/scene.yaml` with scene item declarations for steps 3-4:
  - Added `dilution_tube_carb_c` through `dilution_tube_carb_h` (6 intermediate dilution tubes for carboplatin dose series).
  - Added `metformin_stock_solution` and `dilution_tube_metformin_working`.
  - All items assigned to appropriate zones: `top_left_bench` for reagent stocks, `right_shelf` for dilution tubes.

- Fixed [src/scene_runtime/layout/index.ts](../src/scene_runtime/layout/index.ts) layout engine bugs:
  - Corrected zone height calculation: was using `sorted.length * 15 + 10` (incorrect), now computes rows based on actual item layout with correct wrap thresholds.
  - Fixed zone width constant: increased minimum from 80px to accommodate 100px items without overflow.
  - Ensured zone ordering preserves insertion order (preserves top-left_bench before right_shelf).

- Enhanced [src/scene_runtime/adapters/well_plate/render.ts](../src/scene_runtime/adapters/well_plate/render.ts):
  - Added item sorting by Y position (top items first) before rendering to ensure correct z-index via document order.
  - Reversed z-index assignment so items higher on page (lower Y) have higher z-index and appear clickable.

- Fixed [tools/build_test_fixture.sh](../tools/build_test_fixture.sh) build script:
  - Now generates `adapter-wrapped.js` from `adapter.js` by wrapping ES6 exports in `window.adapterExports = { ... }` for file:// protocol compatibility.
  - Fixture HTML loads wrapped version via `<script>` tag, avoiding CORS issues.

- Updated `tests/playwright/fixtures/plate_drug_treatment_real/protocol.mjs` walker protocol source:
  - Added step 3 (`prep_carb_last_dilution`) and step 4 (`prep_metformin_dilution`) step definitions to plateDrugTreatmentFullProtocol.steps array.
  - Each step faithfully transcribed from `content/plate_drug_treatment/protocol.yaml` with correct ids, labels, actions, requiredItems, stepIndex, and interactionSequence completionPaths.
  - Walker now drives steps 1-4 end-to-end through generic Playwright fixture dispatcher.

### Behavior or Interface Changes
- Layout engine now correctly positions and layers multiple items in a zone, fixing spatial overlaps that blocked clicks.
- Adapter rendering orders items by Y position to ensure correct visual stacking.

### Developer Tests and Notes
- Verification suite:
  - `npx tsc --noEmit`: clean (TypeScript passes)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **4/4** pass (steps 1-4 all complete)
    - Step 1: open_plate_workspace (modal kind) - PASS
    - Step 2: prep_carb_first_dilution (interactionSequence) - PASS via real initWellPlateAdapter
    - Step 3: prep_carb_last_dilution (interactionSequence) - PASS via real initWellPlateAdapter; 8 interactions, before/after screenshots confirm tool/source/destination clicks on carboplatin_stock_solution, dilution_tube_carb_h, media_bottle
    - Step 4: prep_metformin_dilution (interactionSequence) - PASS via real initWellPlateAdapter; 8 interactions, before/after screenshots confirm tool/source/destination clicks on metformin_stock_solution, dilution_tube_metformin_working, media_bottle
  - `ls test-results/walker/plate_drug_treatment_real/step_03/ test-results/walker/plate_drug_treatment_real/step_04/`: both directories contain action_01-08 before/after pairs + action_99_summary
- All steps rendered and completed through real `initWellPlateAdapter()` (not via inline fallback). Walker schema mismatch resolved: protocol.mjs now authoritative source for walker step list and step definitions.
- No gaps in adapter affordance; no YAML-schema mismatches; adapter dispatch logic generic (kind-based, no step.id branches).

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: real adapter load path + step 2 fixture bootstrap)

### Additions and New Features
- [tools/build_test_fixture.sh](../tools/build_test_fixture.sh): new build script to bundle scene_runtime adapters into browser-loadable JavaScript using esbuild. Outputs adapter.js alongside fixture HTML. Example: `bash tools/build_test_fixture.sh plate_drug_treatment_real`.
- `tests/playwright/fixtures/plate_drug_treatment_real/adapter.js`: bundled well_plate adapter (18.3 KB). Contains full adapter tree (dispatch, highlight, layout, render) as single ESM module. Exports initWellPlateAdapter directly for fixture import.
- `tests/playwright/fixtures/plate_drug_treatment_real/index.html`: completely rewritten to eliminate fake inline adapters (second-protocol-engine violation). Now:
  - Loads real adapter via `import('./adapter.js')` at module startup; throws on import failure (fails loud per spec).
  - Step 1 (open_plate_workspace, modal kind): custom HTML render with button[data-item-id="well_plate"]. Walker successfully clicks through modal sequence; step 1/2 passes.
  - Step 2 (prep_carb_first_dilution, interactionSequence kind): calls `initWellPlateAdapter(sceneConfig, step2, config)` to render workspace via real adapter. Passes SceneConfig derived from scene.yaml (items: Record<string, SceneItem> with id/label/scene zone).
  - Step completion callback wires via onStepComplete to `window.gameState.completedSteps.push(stepId)`.
  - No gameState writes, no internal API calls, no second render engine.

- [src/scene_runtime/dispatch/index.ts](../src/scene_runtime/dispatch/index.ts): dispatchInteractionSequence() now supports both flat form (tool, source, destination) AND array form (interactions: Interaction[]). Extracts tool/source/destination from each interaction in sequence.

- [src/scene_runtime/highlight/index.ts](../src/scene_runtime/highlight/index.ts): highlightInteractionSequence() now supports both flat and array forms; builds expected click sequence from interactions array when present.

### Behavior or Interface Changes
- Dispatch and highlight now accept interactions array format matching protocol YAML step definitions. Backward compatible with flat form.

### Fixes and Maintenance
- None. All changes are additions.

### Developer Tests and Notes
- Verification suite:
  - `npx tsc --noEmit`: clean (new code type-safe)
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean
  - `pytest tests/ -q`: **520 passed** (no regressions; adapter changes validated)
  - `node tests/playwright/walker.mjs --fixture smoke`: 4/4 pass (regression baseline)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **1/2 pass**
    - Step 1: PASS. Walker clicks well_plate button, modal appears, walker clicks confirm-plate-intro, step completes. 5 screenshots taken (2 actions x before/after + summary).
    - Step 2: FAIL on first click. Walker cannot find [data-item-id="multichannel_pipette"]. adapter.js builds and exports initWellPlateAdapter successfully. Import succeeds (no error messages in fixture). Callpath is clear: completeStep('open_plate_workspace') -> renderStep2() -> initWellPlateAdapter(). Issue is rendering: initWellPlateAdapter() is either not rendering items, or items HTML lacks data-item-id attributes. This is a runtime issue in renderWorkspace() or layoutScene(), not a load-path issue.

### Fixes and Maintenance (continued)
- Fixed fixture loader: replaced ES6 dynamic import with script tag + global wrapper to bypass CORS block on file:// protocol. Created adapter-wrapped.js by rewriting export statement to window.adapterExports assignment.
- Fixed sceneConfig to include zones array (main_plate_area, top_left_bench, right_shelf) from scene.yaml. Zones define positioning grids for layout engine.
- Fixed layout engine constants: increased DEFAULT_ITEM_WIDTH and DEFAULT_ITEM_HEIGHT from 10px to 100px to match equipment-item CSS width/height (ITEM_SIZE_PX=100px). Increased MIN_GAP from 2px to 10px for readable spacing. Layout now produces correctly-spaced 100x100 equipment items in vertical stack.
- Fixed interactionSequence completion tracking in well_plate adapter: added getInteractionSequenceLength() helper to compute expected sequence length from interactions array. Modified initWellPlateAdapter() and wireClickHandlers() to check if completedClicks.length >= expectedLength after each click; when true, mark advances=true and call onStepComplete(stepId). Dispatch module returns advances=false for interactionSequence; adapter now provides completion logic.
- [src/scene_runtime/adapters/well_plate/index.ts](../src/scene_runtime/adapters/well_plate/index.ts): added completion tracking for interactionSequence path kind. Helper function counts tool/source/destination across interactions array. Main click handler and re-render handler both check completion and advance step when all interactions consumed.

### Verification (post-fix)
- `npx tsc --noEmit`: clean [OK]
- `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions) [OK]
- `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline holds) [OK]
- `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **2/2** pass [OK]
  - Step 1 (open_plate_workspace, modal): walker clicks well_plate, modal appears, walker clicks confirm, completes [OK]
  - Step 2 (prep_carb_first_dilution, interactionSequence): walker clicks 8 targets (tool/source/destination x 4 interactions), adapter renders items, dispatch matches each click, adapter tracks sequence completion, calls onStepComplete after click 8 [OK]
- `ls test-results/walker/plate_drug_treatment_real/step_02/`: before/after screenshots for all 8 interactions + summary [OK]
- Step 2 final state: "Completed steps: 2" shown in fixture; gameState.completedSteps = ['open_plate_workspace', 'prep_carb_first_dilution'] [OK]

### Removals and Deprecations
- Deleted all inline fake render code from fixture (was rendering hardcoded equipment list and expectedSequence array without using adapter).



### Additions and New Features
- WP-WP-1: Authored `content/plate_drug_treatment/scene.yaml` - scene declarations for well_plate_workspace: well_plate (main_plate_area zone), multichannel_pipette, carboplatin_stock_solution, media_bottle, dilution_tube_carb_b (equipment zones). Minimal schema: id, label, zone per contract item 3 (SVG-backed, layout-engine-placed). No layout-rules/asset-metrics yet (deferred); scene is ready for adapter render.
- WP-WP-2: Real well_plate adapter implementation:
  - [src/scene_runtime/adapters/well_plate/render.ts](../src/scene_runtime/adapters/well_plate/render.ts): pure `renderWorkspace(scene: SceneConfig, highlights: HighlightState): string` renders SVG-backed equipment (pipettes, bottles, tubes) and custom 96-well grid (8x12 with row/col labels A-H and 1-12). Equipment items and plate container apply is-next-target highlight class. Reuses deriveHighlights() and getWorkspaceStyles() for CSS-in-JS. Under 350 lines.
  - [src/scene_runtime/adapters/well_plate/index.ts](../src/scene_runtime/adapters/well_plate/index.ts): `initWellPlateAdapter(scene, step, config)` mounts workspace, injects styles, wires click handlers for all [data-item-id] elements. On matched click, re-renders highlights and re-wires handlers. Calls config.onClickMatched() for each valid click and config.onStepComplete(stepId) when step completes. Imports dispatchClick(), deriveHighlights() (pure subsystems); no branching on step.id. Under 250 lines.
- WP-WP-3: Real entrypoint HTML:
  - `tests/playwright/fixtures/plate_drug_treatment_real/index.html`: loads PROTOCOL_CATALOG['plate_drug_treatment'] and INVENTORY_CATALOG['plate_drug_treatment'] from generated/* data. Mounts well_plate adapter on step 1 (open_plate_workspace, modal kind). Inline JavaScript (no ES modules for file:// compatibility) renders workspace, wires workspace item clicks to show modal, wires modal confirm button to record step completion. Verified: walker passes step 1 end-to-end via visible clicks (well_plate -> confirm-plate-intro); saves 5 screenshots to test-results/walker/plate_drug_treatment_real/step_01/.
- build_protocol_data.py: already supports scene.yaml parsing (no changes needed); scene YAML is for documentation/future layout-engine integration; current adapter reads from INVENTORY_CATALOG generated data.

### Behavior or Interface Changes
- Minimal: scene.yaml schema defined in docs/SCENE_YAML_FORMAT.md already supports items/zones; well_plate_workspace scene added to required scenes list in build_protocol_data.py.

### Fixes and Maintenance
- Rewrote plate_drug_treatment_full fixture state machine from fragile blind click-counter to sequence-aware target-id matching; generic walker now completes all 9 steps of plate_drug_treatment end-to-end (M6 well_plate full walker proof). Fixed by matching each clicked target id against the step's expected sequence (derived from protocol interactions, plateTargets, and tubeTargets in walker order), advancing expectedClickIndex only on match, and completing the step when all expected clicks are consumed. Verified: walker passes plate_drug_treatment_full 9/9, plate_drug_treatment 1/1, smoke 4/4; pytest 520 pass; tsc clean.

### Developer Tests and Notes
- Verification: `npx tsc --noEmit` clean; `source source_me.sh && python3 tools/build_protocol_data.py` clean (generated files updated); `pytest tests/ -q` 520 pass (6 new tests from earlier work); `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real` passes 1/1 step with 5 screenshots; `node tests/playwright/walker.mjs --fixture smoke` passes 4/4 steps (regression).
- Walking-skeleton complete: Step 1 (open_plate_workspace, modal kind) passes end-to-end. Real adapter renders 96-well plate (custom geometry per contract item 3) + 4 surrounding equipment items via renderWorkspace(). Highlights, click dispatch, and re-render loop all functional. Step 2+ stubbed: scene.yaml lists required items; interactions would follow once step 2 adapter is built.
- What is implemented: scene.yaml with minimal zone/item declarations, real render.ts (workspace + grid + highlights + styles), real index.ts mount/click/re-render loop, real entrypoint with modal UI, INVENTORY_CATALOG integration. Walker proven against step 1 with visible click sequence and before/after screenshots.
- What is stubbed: Steps 2-9 not implemented (protocol.yaml has all 9, but fixture step 1 only); plate/tube target rendering (contract allows; not needed for step 1 modal); wells as click targets (wells render visibly; not wired to dispatch yet); liquid rendering (LiquidState exists but not applied).
- No gaps found: dispatch, highlight, and liquid subsystems all pure and ready; walker runs clean against real adapter without branching on step.id or protocol-specific hacks.

