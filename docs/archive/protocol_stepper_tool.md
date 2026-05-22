# Plan: `tools/protocol_stepper.py` non-browser semantic walker

## Context

`tools/validate_content_yaml.py` answers "is this YAML structurally valid?" and currently reports 0 failures across 88 files. It cannot answer "does this protocol's authored flow execute coherently?" - broken `next_step` chains, undeclared materials, mutation of nonexistent state fields, and sequence-runner handoffs that assume state the prior mini never produced all pass the schema gate today.

The Playwright walker covers the visible-UI contract but is heavy, slow, and brittle to author errors that should fail much earlier. The recent F2/F3 math bugs (CHANGELOG 2026-05-16) - a working stock named in a treatment step but never produced in the dilution step, a volume gate validating against the wrong material volume - are exactly the class of mismatch a semantic stepper would catch in milliseconds before any browser run.

This plan delivers `tools/protocol_stepper.py`: a fast, in-memory, non-browser walker that loads validated content, follows `entry_step` and `next_step`, applies supported `scene_operations`, tracks object/material state, and reports semantic findings. It is the second gate after `validate_content_yaml.py`. CI runs them serially: `validate_content_yaml.py && protocol_stepper.py`. Each owns one question.

## Objectives

- Ship `tools/protocol_stepper.py` that steps every shipped mini-protocol from `entry_step` to terminal step with zero ERROR findings on the current intended-good tree.
- Step both shipped sequence runners (`cell_culture_full`, `routine_passage`) by executing their mini-protocol leaves in order while threading object/material state across the handoff.
- Track per-placement object and material state across steps and within a sequence-runner across constituent minis.
- Catch the six primary failure-fixture classes (unknown material, unknown target at active scene, invalid state-field mutation, broken `next_step`, sequence runner referencing another sequence runner, cross-mini material-production gap - F2 pattern) plus three flow-shape checks (cycles, unreachable steps, multi-terminal) plus one structural-mutation check (capability-gated material writes).
- Emit human-readable findings with protocol, step, interaction, and file-path context, with ERROR and WARNING levels; ERROR drives exit 1.

## Design philosophy

Stepper is a semantic check, not a runtime. It mirrors the authored YAML contract, not the TypeScript renderer - when authored YAML changes shape, the stepper changes; it does not chase render behavior. Reuse `tools/validators/database.ContentDatabase` and `tools/validators/yaml_io.load_yaml` rather than re-implementing content discovery; the validator already owns that surface and forking it would drift. Per `docs/REPO_STYLE.md` "fix the design, not the symptom": when a check is hard to express without per-protocol knowledge, fix the spec/schema first rather than encoding curriculum-specific names in the stepper. No protocol names, no step names, no material names appear as literals in stepper source - rules generalize over the schema. Rejected alternative: building the stepper on top of the TypeScript runtime via Node - that would couple the semantic check to render behavior and reintroduce the very class of slowness this tool exists to bypass.

**Stepper output is the runtime contract.** The per-step state-transition trace the stepper emits defines the semantic contract any future TypeScript runtime must reproduce. Given identical inputs (validated YAML), the TS runtime must produce identical state transitions to those the stepper records. This locks the stepper's role as the single source of truth for "what should happen" independent of "how it renders." Every Finding cites its governing spec section so rule legitimacy is auditable from the output alone (`per docs/specs/PROTOCOL_STEPS.md sequence_complete`).

## Scope

- Add `tools/protocol_stepper.py` driven by `argparse`, runnable via `source source_me.sh && python3 tools/protocol_stepper.py`.
- Add stepper-local helpers under `tools/stepper/` (loader adapter, flow engine, state model, scene-operation handlers, finding emitter, runner orchestration, cross-mini production check) - split files so each component is single-purpose per `docs/PYTHON_STYLE.md`.
- Reuse `tools/validators/database.ContentDatabase` (verified API surface: `load_from_tree`, `resolve_object`, `resolve_target`, `subpart_matches`, `resolve_state_field`, `resolve_material`) and `tools/validators/yaml_io.load_yaml`. Extend the validator package only if a resolution gap is identified.
- Apply the four ratified scene operations in memory: `CursorAttach`, `ObjectStateChange`, `SceneChange`, `TimedWait`. Unknown `scene_operation.type` -> ERROR.
- Track material state fields (`material_name`, `material_volume`, `held_material_name`, `held_material_volume`) per object instance.
- Validate `entry_step` resolution, `next_step` chain reachability, no cycles, no unreachable steps, exactly one terminal step.
- Validate sequence runners reference only `mini_protocol` leaves.
- Add pytest fixtures under `tests/fixtures/stepper/` proving the six primary failure-fixture classes plus the three flow-shape classes (cycle, unreachable step, multi-terminal).
- Add pytest gate `tests/test_protocol_stepper_gate.py` invoking the stepper on the live `content/` tree.
- Update `docs/CHANGELOG.md` per-milestone (M1, M2, M3 each get an entry under the correct date) and add a brief usage section to `docs/USAGE.md`.

## Non-goals

- Do not render scenes, click SVGs, or replace the Playwright walker - visible-UI evidence stays with `tests/playwright/` per `docs/PRIMARY_CONTRACT.md` item 4.
- Do not introduce new schema fields, new `scene_operation` primitives, or new validator presets - those require spec amendment.
- Do not implement layout-engine math, SVG inspection, or click-target visibility checks.
- Do not implement named-groups or tolerance semantics - neither exists in the current spec.
- Do not check `display_color` divergence here - that is a static cross-file consistency rule belonging to `tools/validate_content_yaml.py`. Filed as a separate follow-up plan and out of scope for this tool.
- Do not infer step semantics (incubation / treatment / wait) from prompt text or step name - heuristic rot vector; either the spec adds a `step_kind` field or the check does not exist.
- Do not maintain a stepper-side sentinel exemption list beyond `empty` and `mixed`. `waste` and similar are real declared materials in `materials.yaml`, not sentinels.
- Do not wire the stepper into `tools/validate_content_yaml.py`. Separate CLIs, separate exit codes, separate failure diagnosis.
- Do not run TypeScript or invoke Node; pure Python 3.12.
- Do not modify `tools/validate_content_yaml.py` behavior or output format.

## Current state summary

- `tools/validate_content_yaml.py` loads 88 files into a `ContentDatabase`, runs per-file and cross-file validators, exits 0 on current tree (CHANGELOG 2026-05-16).
- Verified `tools/validators/database.py` API (line numbers from `git ls-files tools/validators/database.py`):
  - `ContentDatabase.load_from_tree(root: Path) -> None` (line 21)
  - `resolve_object(name) -> dict | None` (line 111)
  - `resolve_target(target) -> tuple | None` - handles dotted subparts (line 115)
  - `subpart_matches(obj, subpart_name) -> bool` (line 143)
  - `resolve_state_field(object_name, field_name) -> dict | None` (line 194)
  - `resolve_material(protocol_name, material_name) -> dict | None` (line 210)
- Note: `tools/validators/findings.py` already exists; stepper finding module is named `tools/stepper/findings.py` (separate package, no shadow; both accessed via fully qualified imports).
- Content tree: `content/objects/` (~48 flat YAML files), `content/scenes/` (4 base scenes), `content/protocols/<name>/protocol.yaml` (+ optional `materials.yaml`, `scenes/`).
- 10 mini-protocols and 2 sequence runners shipped per CHANGELOG 2026-05-16.
- Objects declare `state_fields` (with `field_name`, `type`, `allowed`, `default`) and `capabilities` (e.g. `material_container`).
- `docs/specs/MATERIAL_CONVENTION.md` (line 44) closes sentinel set at `empty` and `mixed`. `waste` is a real material (line 39-40) with `display_color` and `label` like any other.
- No prior semantic walker exists. `tools/run_protocol_walkthrough.py` wraps the Playwright walker; `tests/test_walker_no_step_branches.py` constrains walker source patterns. Neither implements stepping logic.

## Architecture boundaries and ownership

Stepper lives under `tools/` next to the existing validator. Stepper-internal helpers live under `tools/stepper/` (new package directory, minimal `__init__.py` per `docs/PYTHON_STYLE.md`). Tests live under `tests/` (pytest fast lane); fixtures live under `tests/fixtures/stepper/`. The validator and its `tools/validators/` package are untouched in terms of behavior; the stepper imports from it.

Durable component names used in code (stage / module / component, never milestone or workstream):

- `tools/stepper/loader.py` - content loader adapter over `ContentDatabase`.
- `tools/stepper/flow.py` - `entry_step` resolution, `next_step` traversal, reachability/cycle/terminal checks.
- `tools/stepper/state.py` - object-instance state map, state-field mutation gate, material-field tracking.
- `tools/stepper/scene_ops.py` - handlers for `CursorAttach`, `ObjectStateChange`, `SceneChange`, `TimedWait`.
- `tools/stepper/findings.py` - `Finding` dataclass and emitter with ERROR / WARNING levels.
- `tools/stepper/runner.py` - top-level orchestration: per-mini stepping, per-sequence-runner stepping.
- `tools/stepper/cross_mini.py` - generalized material-production check for sequence-runner leaves.
- `tools/protocol_stepper.py` - `argparse` entry point and CLI; delegates to `tools/stepper/runner.py`.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component                                                                      | Expected patches |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------- |
| M1 / WS-A              | `tools/stepper/loader.py`, `tools/stepper/findings.py`                         | 1                |
| M1 / WS-B              | `tools/stepper/flow.py`                                                        | 1                |
| M1 / WS-C              | `tools/stepper/state.py`, `tools/stepper/scene_ops.py` (incl. capability gate) | 1                |
| M1 / WS-D              | `tools/protocol_stepper.py`, `tools/stepper/runner.py`                         | 1                |
| M1 / WS-E              | `tests/fixtures/stepper/`, `tests/test_protocol_stepper_*.py`                  | 1-2              |
| M2 / WS-F              | `tools/stepper/cross_mini.py`, sequence-runner traversal in `runner.py`        | 1                |
| M2 / WS-G              | live-tree pytest gate, `tests/fixtures/stepper/cross_mini/`                    | 1                |
| M3 / WS-H              | `docs/CHANGELOG.md`, `docs/USAGE.md`                                           | 1                |

## Resolved decisions

The following decisions were pinned during plan drafting; doers do not re-decide them:

- **Active-scene checks demoted to WARNING in M1.** Live-tree dry-run found 234 active-scene findings on intended-good shipped content vs 44 real ERRORs (unknown_material + state_value_type_mismatch). Stepper's active-scene model is too tight given how authored protocols implicitly span scenes. Per Risk register mitigation, `unknown_target_active_scene` and `ambiguous_target_in_scene` demoted to WARNING for M1. Follow-on: `docs/active_plans/scene_adapter_resolution_design.md` (SPAWNED 2026-05-16) ratifies the full scene-adapter model; once spec lands, these codes return to ERROR.

- **State-map keying.** Key by **`placement_name` treated as the object instance name**, globally unique across the entire content tree. Rationale: a sequence runner threads state from one mini to the next; if MP-1 writes flask state under one key and MP-2 reads under another, the cross-mini check silently passes. Globally unique placement names give one stable key per physical object instance regardless of which scene currently owns it. Stepper emits ERROR if two scenes declare the same `placement_name` with different `object_name` (collision). Future spec extension may introduce an explicit `object_instance_name` field; until then, `placement_name` is the instance key. (Naming convention: YAML/spec fields use `xxx_name`, never `xxx_id`. Runtime variables in Python/TS may use `_id` freely.)
- **Cross-mini check generalization.** The rule is: "any non-sentinel material name written to or referenced in mini N must have been produced (via `ObjectStateChange` writing that material name) or declared as an input material in `materials.yaml` of some mini M with M <= N in the sequence-runner order." No protocol names, step names, or material names appear as literals in `tools/stepper/cross_mini.py`. Sentinels (`empty`, `mixed`) are exempt. This rule covers the F2 pattern (working stock referenced before being produced) without rotting with every curriculum edit.
- **TimedWait step-kind check removed.** Spec gap confirmed: no `step_kind` field exists in `PROTOCOL_VOCABULARY.md` / `PROTOCOL_STEPS.md`. Stepper accepts any `TimedWait` location without WARNING. A spec RFC is filed in Open questions for `step_kind: incubation|treatment|centrifugation|wait`. No prompt-text or step-name inference. When the spec lands the field, the stepper enforces; until then, the check does not exist.
- **`display_color` divergence is ERROR and lives in the validator, not the stepper.** Same `material_name` with two `display_color` values across protocols is drift, not pedagogy. It is static cross-file consistency, not flow-dependent, so it belongs to `tools/validate_content_yaml.py`. Filed as a separate validator follow-up plan. Out of scope here.
- **Stepper is a separate CLI, not wired into `validate_content_yaml.py`.** Three reasons: (1) blast-radius isolation - a stepper bug does not break the validator gate; (2) cost asymmetry - validator is a sub-second static walk, stepper simulates state across sequence-runner stitches; keep the cheap gate cheap; (3) vocabulary boundary - validator owns "is this YAML legal?", stepper owns "does this flow execute coherently?". CI runs them serially: `validate_content_yaml.py && protocol_stepper.py`.
- **Sentinel materials closed at `empty` and `mixed`.** Per `docs/specs/MATERIAL_CONVENTION.md` line 44. `waste`, `air`, and any other named materials are real materials declared in `materials.yaml` and resolved normally. No stepper-side exemption list. If a third sentinel is ever needed, that is a `MATERIAL_CONVENTION.md` amendment.
- **CLI flag set.** Per `docs/PYTHON_STYLE.md` argparse minimalism: `--protocol <name>` (frequently changed when debugging one protocol) and `--verbose` (frequently changed when investigating findings). No `--strict`: ERROR drives exit 1, WARNING is advisory only.
- **CHANGELOG cadence.** Per-milestone entries (one entry per milestone under the correct date heading). No final rollup. Each milestone exit criterion lists the CHANGELOG update as an obvious follow-on.
- **Validator/stepper boundary on "unknown target".** The validator catches static "target not declared in any scene reachable from this protocol." The stepper catches "target not in the _active_ scene at _this_ step" - a runtime-context check the static validator cannot make without simulating `SceneChange`. Documented; not duplicative.
- **Conservation rule deferred.** PRE-V dry-run found within-response volume balance incompatible with current split-response transfer pattern. M1 ships without WP-C3. Spec RFC in `material_volume_conservation_spec.md` resolves scope (per-response vs per-step), aspiration-to-air semantics, and disposal sentinel before any stepper conservation rule lands.

## Milestone plan

### Milestone M1: per-mini-protocol stepping with state model

- Depends on: none - current validator and content tree are in place.
- Workstreams: WS-A, WS-B, WS-C, WS-D, WS-E (WS-B, WS-C, WS-D, WS-E run in parallel after WS-A scaffolding lands).
- Entry criteria:
  - `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0 on current tree.
  - Pre-patch-1 sanity check: confirm the six `ContentDatabase` methods listed in Current state summary still exist (the `git ls-files tools/validators/database.py | xargs cat | grep -n "def "` view returns the four `resolve_*` plus `subpart_matches` plus `load_from_tree`). If the API has shifted, pause WS-A and reconcile.
  - Placement-name uniqueness verified across `content/scenes/` + every `content/protocols/<name>/scenes/` before WS-C starts. Same `placement_name` declared with different `object_name` blocks M1. If collisions exist in shipped content, fix the YAML before WS-C; do not weaken the keying rule.
- Exit criteria:
  - `tools/protocol_stepper.py` steps every shipped mini-protocol from `entry_step` to terminal step with zero ERROR findings.
  - Pytest `tests/test_protocol_stepper_unit.py` and `tests/test_protocol_stepper_fixtures.py` pass.
  - Fixture set demonstrates four of the six primary failure classes (`unknown_material`, `unknown_target_active_scene`, `invalid_state_field`, `broken_next_step`); the three flow-shape classes (`flow_cycle`, `flow_unreachable`, `flow_multi_terminal`); the one structural-mutation class (`capability_mismatch`); the two positive cases (`waste_is_real_material`, `scene_ops_ordering`) each produce zero findings.
  - `source source_me.sh && pytest tests/test_protocol_stepper_*.py` finishes under 5 s total.
  - `source source_me.sh && python3 tools/protocol_stepper.py` exits 0 on current `content/` tree.
  - `docs/CHANGELOG.md` entry added for M1 patches (per-milestone cadence).
- Parallel-plan ready: yes - max parallel doers: 4 (WS-B, WS-C, WS-D, WS-E run concurrently after WS-A lands).

### Milestone M2: sequence-runner stepping and cross-mini production check

- Depends on: M1 - sequence-runner stepping reuses the per-mini state model and flow engine.
- Workstreams: WS-F, WS-G (run in parallel).
- Entry criteria: M1 exit criteria met.
- Exit criteria:
  - `tools/protocol_stepper.py` steps both shipped sequence runners by executing constituent mini leaves in order and threading the global `StateMap` across the handoff.
  - Stepper rejects with ERROR a sequence runner whose `mini_protocols` list contains another `sequence_runner`.
  - Generalized cross-mini production check catches the F2 pattern (treatment step references a stock the dilution step never produced) without naming any protocol, step, or material literally.
  - Fixture set demonstrates the remaining two primary failure classes: sequence runner referencing another sequence runner, cross-mini material-production gap (fixture explicitly mirrors the F2 shape - a downstream mini references `<drug>_<concentration>_working` that no upstream mini produces).
  - Live-tree pytest gate `tests/test_protocol_stepper_gate.py` runs the stepper on `content/` and asserts zero ERROR findings.
  - `source source_me.sh && python3 tools/protocol_stepper.py` reports per-runner PASS lines and exits 0.
  - `docs/CHANGELOG.md` entry added for M2 patches (per-milestone cadence).
- Parallel-plan ready: yes - max parallel doers: 2.

### Milestone M3: documentation closeout

- Depends on: M2 - usage section reflects final CLI surface.
- Workstreams: WS-H.
- Entry criteria: M2 exit criteria met; CLI flag set frozen.
- Exit criteria:
  - `docs/USAGE.md` includes a section documenting both CLI modes (`--protocol`, `--verbose`) with one example each.
  - `docs/CHANGELOG.md` entry for M3 documenting the docs landing (per-milestone cadence; no rollup).
  - `tests/test_markdown_links.py` green.
  - Plan destination decided: stays at `docs/active_plans/protocol_stepper_tool.md` while in flight; on tool ship the planner moves it to `docs/archive/` with `git mv`.
- Parallel-plan ready: no - single doc-only workstream; no parallelization benefit.

## Workstream breakdown

### Workstream WS-A: loader adapter and findings model

- Owner: coder
- Interfaces:
  - Needs: `tools/validators/database.ContentDatabase`, `tools/validators/yaml_io.load_yaml`.
  - Provides: `tools/stepper/loader.py:load_content_tree()` returning a stepper-side view of the database; `tools/stepper/findings.py:Finding` dataclass and emitter for ERROR / WARNING output.
- Expected patches: 1.

### Workstream WS-B: flow engine

- Owner: coder
- Interfaces:
  - Needs: loader from WS-A.
  - Provides: `tools/stepper/flow.py:walk_mini_protocol()` yielding `(step, interaction_index, interaction)` in `entry_step` -> `next_step` order; cycle / unreachable / multi-terminal validators emitting findings.
- Expected patches: 1.

### Workstream WS-C: state model and scene-operation handlers

- Owner: coder
- Interfaces:
  - Needs: loader and findings from WS-A.
  - Provides: `tools/stepper/state.py:StateMap` keyed by `placement_name` (global instance name per Resolved decisions); per-field mutation gate that uses `ContentDatabase.resolve_state_field()` to confirm the field exists and the value matches the declared type; capability gate (A2) ensuring material-\* writes require `material_container` capability on target; `tools/stepper/scene_ops.py` handlers for `CursorAttach`, `ObjectStateChange`, `SceneChange`, `TimedWait` with ordered top-to-bottom application within a response; unknown `scene_operation.type` emits ERROR. Detection of placement-name collision across scenes is in scope here. Material conservation (WP-C3) is DEFERRED; see Resolved decisions and `material_volume_conservation_spec.md`.
- Expected patches: 1.

### Workstream WS-D: CLI and orchestration

- Owner: coder
- Interfaces:
  - Needs: WS-A, WS-B, WS-C.
  - Provides: `tools/protocol_stepper.py` argparse entry with `--protocol`, `--verbose`; `tools/stepper/runner.py` orchestrating per-mini walks; exit code 0 when no ERROR findings, 1 otherwise; default concise summary line per protocol; `--verbose` prints each step and state transition.
- Expected patches: 1.

### Workstream WS-E: unit tests and per-mini fixtures

- Owner: tester
- Interfaces:
  - Needs: WS-A, WS-B, WS-C, WS-D landed.
  - Provides: fixtures for the four M1 primary cases (unknown material, unknown target at active-scene level, invalid state-field mutation, broken `next_step`) plus three flow-shape fixtures (cycle, unreachable step, multi-terminal); `tests/test_protocol_stepper_unit.py` covering flow, state, scene-ops, findings in isolation; `tests/test_protocol_stepper_fixtures.py` running stepper on each fixture and asserting the expected ERROR finding identity (stable code or offending name - not message text; per `docs/PYTEST_STYLE.md`). One fixture exercises `waste` as a normal declared material so the "no sentinel exemption beyond empty/mixed" rule is regression-covered.
- Expected patches: 1-2.

### Workstream WS-F: sequence-runner traversal and generalized production check

- Owner: coder
- Interfaces:
  - Needs: M1 complete.
  - Provides: sequence-runner branch in `tools/stepper/runner.py` (executes constituent minis in order, threads `StateMap`); rejection of sequence-runner-of-sequence-runner; `tools/stepper/cross_mini.py` implementing the generalized production check from Resolved decisions.
- Expected patches: 1.

### Workstream WS-G: cross-mini fixtures and live-tree gate

- Owner: tester
- Interfaces:
  - Needs: WS-F landed.
  - Provides: fixtures for the remaining two primary cases (sequence runner referencing another sequence runner; cross-mini material-production gap - F2-shaped: a downstream mini references `<drug>_<concentration>_working` that no upstream mini's `ObjectStateChange` produces); `tests/test_protocol_stepper_gate.py` invoking the stepper on the live `content/` tree and asserting zero ERROR findings - finishes under 2 s.
- Expected patches: 1.

### Workstream WS-H: documentation closeout

- Owner: planner
- Interfaces:
  - Needs: M2 complete; CLI frozen.
  - Provides: `docs/USAGE.md` stepper section; `docs/CHANGELOG.md` M3 entry; plan-file `git mv` to `docs/archive/` once the tool ships.
- Expected patches: 1.

## Work packages

### Work package WP-A1: stand up `tools/stepper/` package and loader

- Owner: coder
- Touch points: `tools/stepper/__init__.py` (one-line docstring, no exports per `docs/PYTHON_STYLE.md`), `tools/stepper/loader.py`.
- Depends on: none
- Acceptance criteria:
  - `import tools.stepper.loader` succeeds; `tools.stepper.loader.load_content_tree(root)` returns a structure exposing the protocols, objects, materials, base scenes, and protocol-local scenes for any protocol name.
  - Loader raises a typed exception (not `Exception`) when called against a missing protocol; no try/except hides the original `ContentDatabase` error.
- Verification commands:
  - `source source_me.sh && pyflakes tools/stepper/loader.py tools/stepper/__init__.py`
  - `source source_me.sh && python3 -c 'import tools.stepper.loader; print(tools.stepper.loader.load_content_tree.__doc__)'`
- Obvious follow-ons:
  - Confirm the new files are picked up by the repo-wide pyflakes and ascii-compliance gates (they walk by directory; no opt-in needed).

### Work package WP-A2: `Finding` dataclass and emitter

- Owner: coder
- Touch points: `tools/stepper/findings.py`.
- Depends on: none
- Acceptance criteria:
  - `Finding` carries: `level` (`ERROR` or `WARNING`), `protocol_name`, `step_name` (optional), `interaction_index` (optional), `target` (optional), `file_path`, `code` (stable short identifier), `message`, **`spec_cite`** (required: `docs/specs/<file>.md` section or anchor that governs the rule - anti-rot mechanism per ARCH-1).
  - Emitter formats findings to stdout per the Output section below; trailing `per <spec_cite>` line on every finding; suppresses per-step transition lines unless `--verbose`.
  - Module name `tools/stepper/findings.py` is intentionally distinct from `tools/validators/findings.py`; the two are imported as fully qualified modules (`import tools.stepper.findings`).
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_unit.py -k findings`
- Obvious follow-ons:
  - Wire emitter exit-code aggregation into runner once WS-D lands.

### Work package WP-B1: flow engine `walk_mini_protocol`

- Owner: coder
- Touch points: `tools/stepper/flow.py`.
- Depends on: WP-A1
- Acceptance criteria:
  - Resolves `entry_step` to a step in `steps`; missing `entry_step` -> ERROR.
  - Yields `(step, interaction_index, interaction)` in `entry_step` -> `next_step` order until `next_step: null`.
  - Emits ERROR on broken `next_step`, on cycles (detected via visited set), on unreachable `steps` entries, on absence of a single terminal step.
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_unit.py -k flow`
- Obvious follow-ons:
  - If a fixture surfaces a flow shape the current spec does not cover, raise it in `## Open questions and decisions needed`; do not silently extend behavior.

### Work package WP-C1: state map and mutation gate

- Owner: coder
- Touch points: `tools/stepper/state.py`.
- Depends on: WP-A1, WP-A2
- Acceptance criteria:
  - `StateMap` is keyed by `placement_name` treated as the global instance name (Resolved decisions). Internal Python attribute naming is unconstrained (`_id` suffix OK in runtime code); the `_name` discipline applies only to YAML/spec field names.
  - Detects placement-name collision: two scenes that declare the same `placement_name` with different `object_name` produce an ERROR at load.
  - Mutation of a state field uses `ContentDatabase.resolve_state_field()` to confirm the field is declared on the target object; undeclared field -> ERROR.
  - Mutated value validated against `type` and `allowed` from the object's `state_fields`; mismatch -> ERROR.
  - Material-name mutation cross-checked against the active protocol's `materials.yaml`; only `empty` and `mixed` are exempt (Resolved decisions: `waste` and other named materials resolve normally); unknown material -> ERROR.
  - **Capability gate (A2):** any `ObjectStateChange` writing `material_name`, `material_volume`, `held_material_name`, or `held_material_volume` requires the target object's `capabilities` list to include `material_container`. Verified canonical name from `content/objects/micropipette.yaml` (`capabilities: [clickable, material_container, instrument_with_setpoint, cursor_attachable]`); both flasks and pipettes carry `material_container`. Capability mismatch -> ERROR. Uses declared capabilities; no new schema.
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_unit.py -k state`
- Obvious follow-ons:
  - If `tools/validators/database.py` lacks a helper the stepper needs (for example, listing all declared materials for a protocol), add the helper to the validator package rather than reimplementing inside the stepper.

### Work package WP-C2: scene-operation handlers

- Owner: coder
- Touch points: `tools/stepper/scene_ops.py`.
- Depends on: WP-C1
- Acceptance criteria:
  - One handler per ratified type: `CursorAttach`, `ObjectStateChange`, `SceneChange`, `TimedWait`.
  - `scene_operations` list within an `interaction.response` is ordered; handlers apply top-to-bottom. State changes from op N are visible to op N+1 inside the same response. Fixture in WP-E2 exercises `CursorAttach` followed by an `ObjectStateChange` that depends on the cursor state.
  - `ObjectStateChange` delegates to `StateMap` mutation gate.
  - `SceneChange.to_scene` resolved against base scenes plus the active protocol's local scenes; unresolved -> ERROR. Sets the active scene; subsequent "unknown target at active scene" checks use this.
  - `CursorAttach` updates a tracked cursor placement (used later for held-material tracking).
  - `TimedWait` checks that the host step exists and that a `duration_min` (or spec-canonical duration field) is present and positive. **No `target` resolution** - `TimedWait` has no target per spec; only host-step and duration. **No step-kind check, no prompt-text or step-name inference** (Resolved decisions; spec RFC for `step_kind` filed in Open questions).
  - Unknown `scene_operation.type` -> ERROR.
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_unit.py -k scene_ops`
- Obvious follow-ons:
  - When the spec ratifies `step_kind`, reopen this work package and add the deferred wait-class check.

### Work package WP-C3: material conservation (DEFERRED to follow-on RFC)

**DEFERRED.** Pre-M1 dry-run (PRE-V, 2026-05-16) found every authored mini-protocol splits source-decrement and sink-increment across separate `interaction.response` blocks, so the within-response physical-volume balance rule false-fires on every liquid transfer. The rule scope (per-response vs per-step), the aspiration-to-air case, and the disposal sentinel are unresolved. Owner: tracked in `material_volume_conservation_spec.md`. Stepper M1 ships without conservation; capability gate (WP-C1 A2) is unaffected and remains in scope.

### Work package WP-D1: CLI + runner orchestration

- Owner: coder
- Touch points: `tools/protocol_stepper.py`, `tools/stepper/runner.py`.
- Depends on: WP-A1, WP-A2, WP-B1, WP-C1, WP-C2
- Acceptance criteria:
  - `argparse` exposes `--protocol <name>` (nargs `+` accepts multiple protocol names for batch debug) and `--verbose`. No `--strict` (per Resolved decisions: ERROR drives exit; WARNING advisory).
  - Default mode walks every `content/protocols/*/protocol.yaml` and prints one summary line per protocol.
  - Exit code 0 when no ERROR findings; 1 otherwise.
  - `--verbose` prints per-step state deltas in the form `<placement_name>.<field>: <before> -> <after>` for every mutation, plus the firing `scene_operation.type`. Cheap given `StateMap` is already authoritative.
  - Shebang `#!/usr/bin/env python3` and executable bit set; `tests/test_shebangs.py` stays green.
- Verification commands:
  - `source source_me.sh && python3 tools/protocol_stepper.py --help`
  - `source source_me.sh && python3 tools/protocol_stepper.py`
- Obvious follow-ons:
  - Run the live-tree command and confirm exit 0; if not, fix the underlying authored YAML or the stepper rule rather than masking the finding.

### Work package WP-E1: unit-test scaffold

- Owner: tester
- Touch points: `tests/test_protocol_stepper_unit.py`, `tests/conftest.py` (only if a stepper-specific fixture root is needed).
- Depends on: WP-A1, WP-A2, WP-B1, WP-C1, WP-C2
- Acceptance criteria:
  - One small test per public function in `tools/stepper/`; no asserts on collection sizes, default lists, function names, or dates per `docs/PYTEST_STYLE.md`.
  - **No-mock rule:** tests load real fixture YAML through the real loader. No `ContentDatabase` mocks. Mocked schema masks loader/database drift.
  - Each test finishes in well under 1 s.
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_unit.py`
- Obvious follow-ons:
  - Delete any test that proves brittle (asserts on changeable counts or names) - `docs/PYTEST_STYLE.md` "prefer deleting over rewriting".

### Work package WP-E2: per-mini and flow-shape failure fixtures

- Owner: tester
- Touch points: `tests/fixtures/stepper/unknown_material/`, `tests/fixtures/stepper/unknown_target_active_scene/`, `tests/fixtures/stepper/invalid_state_field/`, `tests/fixtures/stepper/broken_next_step/`, `tests/fixtures/stepper/flow_cycle/`, `tests/fixtures/stepper/flow_unreachable/`, `tests/fixtures/stepper/flow_multi_terminal/`, `tests/fixtures/stepper/waste_is_real_material/`, `tests/fixtures/stepper/capability_mismatch/` (ObjectStateChange writing `material_name` on object lacking `material_container`), `tests/fixtures/stepper/scene_ops_ordering/` (CursorAttach followed by ObjectStateChange that reads cursor state); `tests/test_protocol_stepper_fixtures.py`.
- Depends on: WP-D1
- Acceptance criteria:
  - Each fixture is the minimum YAML needed to surface its one error class (or, for `waste_is_real_material/`, the absence of any finding when `waste` is properly declared in `materials.yaml`); reuses real `content/objects/` and `content/scenes/` declarations where practical.
  - Test asserts a finding with the expected `level` and stable `code` (or stable offending target/material name) - not the human message text.
  - "unknown target at active scene" fixture explicitly notes the stepper-vs-validator boundary in a comment (validator catches static absence; stepper catches active-scene absence).
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_fixtures.py`
- Obvious follow-ons:
  - If creating a fixture surfaces a real bug in shipped content, that bug is an ERROR finding. Fix the authored YAML in this work package or block the patch. No `docs/TODO.md` defer - defer is how F2 stayed shipped.

### Work package WP-F1: sequence-runner traversal and generalized production check

- Owner: coder
- Touch points: `tools/stepper/runner.py` (extend), `tools/stepper/cross_mini.py` (new).
- Depends on: M1 complete
- Acceptance criteria:
  - Runner detects `protocol_type: sequence_runner` and iterates listed mini-protocols in order, threading a single `StateMap` across the handoff.
  - Rejects with ERROR any sequence runner whose `mini_protocols` list contains an item whose own `protocol_type` is `sequence_runner`.
  - Cross-mini production check implements the generalized rule from Resolved decisions: any non-sentinel material name "referenced" in mini N must be produced via an `ObjectStateChange` (writing `material_name` or `held_material_name`) or declared as an input in `materials.yaml` of some mini M with M <= N. No protocol, step, or material names appear as literals in `tools/stepper/cross_mini.py`.
  - "Referenced" is defined enumeratively (closed set, sourced from current spec - when the spec ratifies a new preset that carries a material slot, this list is updated in the same patch that lands the spec change): (a) the value of `material_name` or `held_material_name` in an `ObjectStateChange.state` block, whether read-side or write-side; (b) the value of `material_name` or `held_material_name` in an interaction `validator.preset = target_with_value` value field; (c) the value of `material_name` or `held_material_name` in a step `step_validator.preset = final_state_matches` `contains` clause (per `docs/specs/PROTOCOL_STEPS.md`); (d) any other ratified scene-operation or preset field whose schema names it as a material slot. Plain `target:` strings naming a placement are NOT material references; the material reference is the placement's tracked state, not the placement name.
- Verification commands:
  - `source source_me.sh && python3 tools/protocol_stepper.py --protocol cell_culture_full --verbose`
  - `source source_me.sh && python3 tools/protocol_stepper.py --protocol routine_passage`
- Obvious follow-ons:
  - If threading state across the handoff surfaces an authored gap in a shipped mini, that gap is an ERROR finding. Fix the authored YAML in this work package or block the patch. No `docs/TODO.md` defer - defer is how F2 stayed shipped.

### Work package WP-G1: cross-mini fixtures and live-tree gate

- Owner: tester
- Touch points: `tests/fixtures/stepper/runner_of_runner/`, `tests/fixtures/stepper/cross_mini_production_gap/`, `tests/test_protocol_stepper_gate.py`.
- Depends on: WP-F1
- Acceptance criteria:
  - `runner_of_runner/` fixture: sequence runner whose `mini_protocols` list contains another sequence runner; stepper emits ERROR.
  - `cross_mini_production_gap/` fixture explicitly mirrors the F2 shape: a downstream mini's interaction references a working-stock material (e.g. `<drug>_<concentration>_working`) that no upstream mini's `ObjectStateChange` produces nor `materials.yaml` declares. Fixture README or top-comment cites F2 as the anchor.
  - `tests/test_protocol_stepper_gate.py` invokes the stepper on the live `content/` tree, asserts zero ERROR findings, runs under 2 s.
- Verification commands:
  - `source source_me.sh && pytest tests/test_protocol_stepper_fixtures.py tests/test_protocol_stepper_gate.py`
- Obvious follow-ons:
  - If the live-tree gate fails, treat it as an authored-content bug (fix the YAML) - do not relax the stepper rule.

### Work package WP-H1: documentation closeout

- Owner: planner
- Touch points: `docs/USAGE.md`, `docs/CHANGELOG.md`, plan-file `git mv` to `docs/archive/` when tool ships.
- Depends on: M2 complete
- Acceptance criteria:
  - `docs/USAGE.md` section explains the validator-then-stepper two-gate pattern, lists the two CLI flags with one example each, names the primary error classes and the flow-shape checks.
  - `docs/CHANGELOG.md` M3 entry under the correct date and required subsections (Additions / Behavior / Fixes / Removals / Decisions / Tests).
- Verification commands:
  - `source source_me.sh && pytest tests/test_markdown_links.py`
- Obvious follow-ons:
  - Run the markdown link gate; if it flags anything, fix it inside this work package, do not defer.

## Acceptance criteria and gates

- Per-patch gate: pyflakes clean on touched files; pytest under `tests/test_protocol_stepper_*.py` green; `source source_me.sh && python3 tools/protocol_stepper.py` exits 0.
- Integration gate (end of M2): live-tree stepper run exits 0; both sequence runners report PASS; every WP-E2 and WP-G1 fixture produces its expected finding identity - specifically: six primary failure classes (unknown_material, unknown_target_active_scene, invalid_state_field, broken_next_step, runner_of_runner, cross_mini_production_gap); three flow-shape classes (flow_cycle, flow_unreachable, flow_multi_terminal); one structural-mutation class (capability_mismatch); positive cases (waste_is_real_material, scene_ops_ordering) produce zero findings.
- Manual review gate (end of M3): reviewer confirms no new schema fields, no new `scene_operation` primitives, no new validator presets, and no protocol/step/material names appear as literals anywhere in `tools/stepper/`; if any do, route through `docs/specs/SPEC_DESIGN_CHECKLIST.md` first.
- Release gate: per-milestone `docs/CHANGELOG.md` entries present (M1, M2, M3); `docs/USAGE.md` section present.

## Test and verification strategy

- Unit: `tests/test_protocol_stepper_unit.py` covers loader, flow, state, scene-ops, findings in isolation. Each test sub-second; lives in pytest fast lane.
- Fixture-driven: `tests/test_protocol_stepper_fixtures.py` runs the stepper against minimal `tests/fixtures/stepper/<case>/` trees and asserts the expected finding identity. No browser, no Playwright.
- Live-tree gate: `tests/test_protocol_stepper_gate.py` runs the stepper against `content/` and asserts zero ERROR findings. Runs in under 2 s and replaces ad-hoc "did I break it" smoke.
- Regression: the live-tree gate is the regression net - every PR that touches `content/` or `tools/stepper/` runs it via `pytest tests/`.
- Out of scope: Playwright walker continues to cover visible-UI evidence; this plan does not modify those tests.

## Output

Default per-protocol PASS:

```text
Stepping content/protocols/passage_hood_detachment/protocol.yaml
PASS: 10 steps, 34 interactions, 0 findings
```

Failure shape (ERROR):

```text
FAIL: content/protocols/plate_drug_treatment_drug_addition/protocol.yaml
  step add_carb_row_b
  interaction 3 target carboplatin_working_stock
  ERROR [unknown_material]: material_name carboplatin_working_stock not declared in materials.yaml
  per docs/specs/MATERIAL_CONVENTION.md material identity
```

Verbose state-delta line (with `--verbose`):

```text
  CursorAttach -> cursor=p1000_pipette
  ObjectStateChange  p1000_pipette.held_material_name: empty -> carboplatin_400umol
  ObjectStateChange  p1000_pipette.held_material_volume: 0.0 -> 5.0
  ObjectStateChange  carb_stock_bottle.material_volume: 1000.0 -> 995.0
```

Sequence-runner summary (M2):

```text
Stepping content/protocols/cell_culture_full/protocol.yaml (sequence_runner, 10 leaves)
  -> passage_hood_detachment PASS
  -> passage_pellet_reseed PASS
  ...
PASS: 10 leaves, 0 findings
```

## Migration and compatibility policy

- Additive rollout: M1 ships the per-mini stepper; M2 adds sequence-runner traversal and the cross-mini production check; M3 lands docs. No existing tool changes behavior.
- Backward compatibility: `tools/validate_content_yaml.py` API, output format, and exit codes are unchanged. The stepper is a separate CLI with its own exit codes.
- Deletion criteria for legacy paths: none - no code is being retired by this plan.
- Rollback: if the live-tree gate fails on a previously passing tree, revert the offending patch; the validator gate is unaffected and remains the primary correctness signal.

## Risk register

| Risk                                          | Impact | Trigger                                                                  | Owner               | Mitigation                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stepper rule disagrees with spec              | medium | A new rule rejects shipped content the spec permits                      | architect           | When in doubt, raise as an open question and emit WARNING (not ERROR) until the spec is amended. **Example in action (M1):** active-scene checks demoted to WARNING (2026-05-16) when live-tree run found 234 findings on intended-good shipped content. Spawned scene-adapter design plan to resolve spec gap. |
| Generalized cross-mini rule too strict        | medium | Live-tree gate fails on a shipped runner                                 | coder (WS-F)        | Rule narrowly targets unresolved material names; sentinels (`empty`, `mixed`) exempt; widen exemption list only via `MATERIAL_CONVENTION.md` amendment, never inline.                                                                                                                                           |
| Loader drift from `ContentDatabase`           | low    | Validator changes the database shape                                     | coder (WS-A)        | M1 entry criterion verifies the API surface; stepper imports `ContentDatabase` directly so renames surface immediately at import.                                                                                                                                                                               |
| Placement-name collisions discovered too late | low    | M1 entry-criterion audit finds collisions after WS-C work begins         | coder (WS-C)        | Entry criterion runs the uniqueness check before WS-C; if collisions surface mid-WS-C anyway (e.g. via a fixture), escalate to architect to introduce an explicit `object_instance_name` field rather than weakening the key.                                                                                   |
| Fixtures grow into a parallel content tree    | low    | Fixture directory acquires shared helpers                                | tester (WS-E, WS-G) | Each fixture is the minimum YAML for one error class; shared helpers live in `tools/stepper/`, not `tests/fixtures/`.                                                                                                                                                                                           |
| Validator and stepper overlap                 | low    | A future validator extension catches what a stepper rule already catches | maintainer          | Retire the stepper rule and add a fixture proving the validator now owns it; do not run two rules for the same finding.                                                                                                                                                                                         |

## Rollout and release checklist

- [ ] M1 patches merged; live-tree stepper run exits 0.
- [ ] M2 patches merged; both sequence runners step PASS; M1 fixtures (4 primary + 3 flow-shape + 1 structural capability_mismatch) plus M2 fixtures (2 primary: runner_of_runner + cross_mini_production_gap) each produce expected ERROR; positives (waste_is_real_material, scene_ops_ordering) produce zero findings.
- [ ] `tests/test_protocol_stepper_gate.py` added to default `pytest tests/` lane.
- [ ] `docs/CHANGELOG.md` entries added (per-milestone: M1, M2, M3).
- [ ] `docs/USAGE.md` section added.
- [ ] `tools/protocol_stepper.py` shebang + executable bit verified (`tests/test_shebangs.py` green).

## Documentation close-out requirements

- Active plan / progress tracker updates: plan lives at `docs/active_plans/protocol_stepper_tool.md` during execution; planner moves it to `docs/archive/` with `git mv` once the tool ships.
- `docs/CHANGELOG.md` entries: per-milestone (M1, M2, M3); planner; categories used = Additions, Fixes, Tests, Decisions.
- Archive / closure notes: none beyond the `git mv` at ship time.

## Patch plan and reporting format

- Patch 1: `tools/stepper` loader + findings (WS-A).
- Patch 2: `tools/stepper` flow engine (WS-B).
- Patch 3: `tools/stepper` state + scene-ops + capability gate (WS-C, WP-C1 + WP-C2).
- Patch 4: `tools/protocol_stepper.py` CLI + runner (WS-D).
- Patch 5: unit tests + per-mini and flow-shape fixtures (WS-E).
- Patch 6: sequence-runner traversal + generalized cross-mini check (WS-F).
- Patch 7: cross-mini fixtures + live-tree gate (WS-G).
- Patch 8: docs closeout (WS-H).

Patch counts and cadence follow `references/CAPACITY_AND_SIZING.md`: target 1-2 patches per coder per week; split any patch that touches more than two components.

## Spawned side tasks

These side tasks were identified during stepper plan drafting. Each is out of scope for `tools/protocol_stepper.py` but must not be lost on stepper ship. The planner must draft a stub plan for each under `docs/active_plans/` immediately after this plan is approved, so they exist as durable, trackable artifacts and not just bullets in a paragraph that ages off.

- **[validator_display_color_check.md](validator_display_color_check.md)** (SPAWNED 2026-05-16). Add an ERROR-level static cross-file consistency check to `tools/validate_content_yaml.py`: same `material_name` declared with different `display_color` across any two protocols' `materials.yaml` files -> ERROR. Owner: coder. Anchor: stepper Non-goals + Resolved decisions; spawned per user instruction during stepper v3 review.
- **`step_kind_spec_rfc.md`** (SPAWNED 2026-05-16). Spec RFC to add a `step_kind: incubation|treatment|centrifugation|wait` enum on steps so the stepper can validate `TimedWait` host steps. Without this, the WP-C2 deferred check never lands. Owner: architect.
- **`material_volume_conservation_spec.md`** (SPAWNED 2026-05-16). Spec amendment to `docs/specs/MATERIAL_CONVENTION.md` adding an explicit "Volume conservation" section that ratifies a physical-volume balance rule. PRE-V dry-run found within-response balance incompatible with current authored protocols; RFC must resolve rule scope and disposal semantics before a stepper conservation rule lands. Owner: architect.
- **[scene_adapter_resolution_design.md](scene_adapter_resolution_design.md)** (SPAWNED 2026-05-16). Design plan to ratify the canonical scene-adapter resolution algorithm (active-scene only, full-protocol-scenes registry, explicit YAML adapter, or hybrid). M1 demoted `unknown_target_active_scene` and `ambiguous_target_in_scene` to WARNING due to tight active-scene model finding 234 warnings on shipped content; this plan resolves the spec gap and spawns a follow-on stepper plan to re-enable checks at ERROR. Owner: architect.

## Open questions and decisions needed

- All questions resolved during drafting; see Resolved decisions and Spawned side tasks.
