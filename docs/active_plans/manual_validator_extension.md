# Plan: Manual renderer validation extension

## Context

`validation/manual/protocol_manual.py` is the third gate in the repo's validation
pipeline: after YAML structure checks and the stepper flow simulation, the renderer
walks the executed step chain, simulates per-object material state, and converts
YAML into human-readable markdown. This execution-aware walk gives the renderer a
unique vantage point that neither of the earlier gates has: it can compare authored
*intent* (the step prompt) against authored *action* (the sequence), track cumulative
material state across steps, and identify steps that are declared but never executed.

The tool already has a `--lint` flag with three authoring-warning checks
(`L-PROMPT`, `L-MATDRIFT`, `L-VOLMISMATCH`). Those checks produce text to stderr
but are not integrated into the structured validation pipeline at
`validation/validate.py`. The drift-remediation plan (archived in
`docs/archive/spec_content_drift_remediation.md`) closed five BLOCKER findings
and added seven YAML-level gates, but the renderer's lint pass was intentionally
left as a soft warning surface rather than a hard gate.

This plan adds four new checks to the renderer's lint pass and promotes the lint
output to the structured finding format used by all other validators
(`docs/VALIDATION_JSON_SCHEMA.md`). The result is a renderer that can be run as a
real validation gate, not just a prose review aid.

The `--lint` flag and the existing `LintCollector` class are the extension points.
No new architecture is introduced; the existing collection/emit pattern is extended
in-place and wired to the structured finding shape.

## Objectives

- Define four new check classes - `L-ASPIRATE`, `L-UNREGISTERED`, `L-UNUSED`,
  `L-UNREACHABLE` - with concrete per-class detection logic and acceptance criteria.
- Promote `LintCollector` output from bare-text stderr to findings shaped per
  `docs/VALIDATION_JSON_SCHEMA.md`, so `--lint` can be driven by `validation/validate.py`.
- Demonstrate that the five extended checks (`L-PROMPT`, `L-MATDRIFT`, `L-VOLMISMATCH`
  plus the four new ones) catch at least one real authoring drift instance each on
  the current shipped protocol tree.
- Integrate the renderer's lint gate into `validation/validate.py --all` with a
  configurable severity threshold (WARNING or higher fails by default).

## Design philosophy

The renderer's structural advantage over YAML validators is its execution walk: it
sees only the steps actually reachable from `entry_step` and accumulates state as
the walk proceeds. New checks exploit this walk; they do not re-implement YAML
structure checks already owned by `validation/yaml/`. The alternative - adding
these checks to the YAML validators - would require the YAML validators to simulate
execution state, which is outside their layer contract. Fix the design (validator
at the right layer) not the symptom (catch everything in one file).

The `LintCollector` is upgraded to emit structured findings rather than bare text
so the renderer can join the same CI evidence stream as the stepper and SVG auditor.
We reject the alternative of keeping two separate output codepaths (text for humans,
JSON for CI) because the `render_step` call chain is not designed to be called
twice; a shared collection object that renders to either format on demand is the
right shape.

## Scope

- Add `L-ASPIRATE` check: flag any step prompt containing "aspirate" (case-insensitive)
  when the step also contains a pipette draw (not vacuum-removal-to-waste) gesture.
  Direct remediation target: the 8 protocols listed in `docs/TODO.md` under
  "Vocabulary: aspirate reserved for vacuum removal to waste".
- Add `L-UNREGISTERED` check: flag any `ObjectStateChange` that writes a `material_name`
  or `held_material_name` value not present in the protocol's `materials.yaml`, excluding
  the sentinels `empty`, `mixed`, and `cells` (cell suspension has no entry in most
  protocols' materials.yaml by design).
- Add `L-UNUSED` check: flag any entry in `materials.yaml` whose `material_name` key
  is never referenced by any `ObjectStateChange` in the executed step chain.
- Add `L-UNREACHABLE` check: after walking the `entry_step` -> `next_step` chain,
  flag any step declared in `steps[]` that was never visited.
- Upgrade `LintCollector` to emit findings per `docs/VALIDATION_JSON_SCHEMA.md`
  (severity / tool / code / message / path / protocol / step / target fields) via
  `validation/shared_toolkit/findings.py`; keep the existing text-to-stderr path for
  human use when `--lint` is used without `--validate`.
- Add `--validate` flag that runs the lint pass and emits findings as JSON or NDJSON
  (matching other validators) without writing a rendered manual; returns exit 1 when
  any finding at WARNING or higher severity is emitted.
- Wire `validation/validate.py --all` to invoke `protocol_manual.py --validate --json`
  and include renderer findings in the aggregate finding count and exit code.
- Add pytest fixtures under `tests/fixtures/manual_lint/` and unit tests under
  `tests/test_manual_lint.py` covering each new check class.

## Non-goals

- Do not implement per-step or per-response volume conservation (source depletion).
  This is deferred pending the spec RFC in `docs/active_plans/material_volume_conservation_spec.md`.
- Do not add cross-protocol material consistency checks. That gap is owned by the
  V6a gate deferred in `docs/TODO.md` and `validation/yaml/cross_protocol.py`.
- Do not rewrite the existing `L-PROMPT`, `L-MATDRIFT`, or `L-VOLMISMATCH` checks;
  extend them only if a bug is found during M1 fixture work.
- Do not add learning-block quality scoring (word count, required phrase check). Learning
  block required-phrase validation is owned by the YAML validator (V1 gate); prose
  quality is editorial, not automatable.
- Do not add a `--fix` mode that rewrites YAML in-place. The renderer is a read-only
  analysis tool.
- Do not change how `--all` renders markdown; `--validate` is a separate operating mode.

## Current state summary

**What works today:**

- `protocol_manual.py --lint` emits three text warnings per step to stderr.
- `L-PROMPT` catches `Click`, `Tap`, `Press` at prompt start. Passes on 12 shipped
  mini-protocols; 0 real violations found in current tree (authors corrected after
  the check was introduced).
- `L-MATDRIFT` catches source material undefined when a dest material is assumed.
  Currently emits 2-3 warnings per run across the cell-culture mini-protocols where
  multichannel steps draw from a well state that has no explicit `held_material_name`
  on the pipette.
- `L-VOLMISMATCH` catches pipette set volume vs dest delta > 1%. Currently emits
  0 warnings; all authored volumes match.

**What is missing:**

- `L-ASPIRATE`: `docs/TODO.md` names 8 protocols where "aspirate" is used in a
  pipette-loading context. This is a vocabulary violation that a human reviewer must
  catch today; the renderer's prompt-scan already identifies the right hook.
- `L-UNREGISTERED`: no gate catches a `material_name` used in a scene op that was
  never entered in `materials.yaml`. A typo or copy-paste error would be visible in the
  rendered manual as an unformatted name string (because `load_material_labels`
  returns `{}` for missing entries) but not as a validation failure.
- `L-UNUSED`: no gate catches materials registered in `materials.yaml` but never
  referenced. The `render_materials_section` already filters to referenced materials for
  the manual output, so orphaned entries are invisible in the rendered prose.
- `L-UNREACHABLE`: the render loop warns on a broken `next_step` reference but does
  not enumerate unreachable steps. A step could be declared and have valid content but
  be silently orphaned from the chain.
- Structured output: `--lint` emits text only; no machine-readable output; cannot be
  driven by `validation/validate.py`. The tool explicitly rejects `--json` and `--ndjson`
  (these apply only to the rendered markdown path, not to lint findings).

**Evidence:**

```
source source_me.sh && python3 validation/manual/protocol_manual.py --all --lint 2>&1 | grep -v "^$"
```

Current run produces approximately 8-12 `L-MATDRIFT` warnings and zero of the other
classes. The 8 aspirate-vocabulary protocols are findable via:

```
git ls-files content/protocols/ | xargs grep -l "aspirate"
```

## Architecture boundaries and ownership

**Components touched:**

| Component | Files | Layer |
| --- | --- | --- |
| Renderer lint pass | `validation/manual/protocol_manual.py` | analysis |
| Lint finding output | `validation/shared_toolkit/findings.py` | shared infrastructure |
| Validate orchestrator | `validation/validate.py` | orchestration |
| Lint unit tests | `tests/test_manual_lint.py` | test |
| Lint fixtures | `tests/fixtures/manual_lint/` | test data |

**Layer rule:** new checks live inside `protocol_manual.py`'s existing `render_step` /
`render_group_at` / `apply_state_changes` call chain or in a new `collect_lint_findings`
post-walk function. They must not reach into `validation/yaml/` or `validation/stepper/`
for helper functions; the renderer reads YAML directly (per its existing design).

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-A | Renderer lint pass (vocabulary checks) | 1 patch |
| M1 / WS-B | Renderer lint pass (material registration checks) | 1 patch |
| M1 / WS-C | Renderer lint pass (flow reachability check) | 1 patch |
| M2 / WS-D | Lint finding output + validate flag | 1-2 patches |
| M2 / WS-E | Validate orchestrator + tests | 1 patch |

## Milestone plan

### Milestone M1: New lint check implementation

- Depends on: none
- Workstreams: WS-A, WS-B, WS-C (all independent; differ only in which part of
  `protocol_manual.py` they touch and which fixture protocols they use)
- Entry criteria: none - current `--lint` pass runs cleanly; no existing failures
- Exit criteria:
  - `L-ASPIRATE` detects "aspirate" + non-waste pipette draw in at least 4 of the 8
    named protocols from `docs/TODO.md`; emits no false positives on the remaining
    mini-protocols
  - `L-UNREGISTERED` detects a test fixture with a typo material name; emits no
    false positives on current shipped protocols
  - `L-UNUSED` detects an orphaned material in a test fixture; emits no false
    positives on shipped protocols (verify: all shipped materials.yaml entries are
    referenced)
  - `L-UNREACHABLE` detects a step declared but not reachable in a test fixture;
    emits no false positives on shipped protocols
  - All three checks use the same `LintCollector.record(step_name, check_class, message)`
    call site pattern as existing checks
  - `pytest tests/test_manual_lint.py` passes (M1 fixtures added, each check class
    has at least one positive and one negative fixture)
  - Update `docs/CHANGELOG.md` with M1 additions entry
- Parallel-plan ready: yes - max parallel doers: 3 (one per workstream, no shared
  file writes within the same function bodies)

### Milestone M2: Structured output and gate integration

- Depends on: M1-exit - WS-D needs LintCollector stable before rewriting its emit path
- Workstreams: WS-D, WS-E (WS-D upgrades LintCollector; WS-E consumes the new output)
- Entry criteria: M1 exit criteria met; all four new checks land cleanly
- Exit criteria:
  - `protocol_manual.py --validate --json` emits a JSON object with `findings` array
    shaped per `docs/VALIDATION_JSON_SCHEMA.md`; each finding has `severity`, `tool`,
    `code`, `message`, `path`, `protocol`, `step`, `target` fields populated
  - `protocol_manual.py --validate --all` exits 0 on the current shipped tree
    (no WARNING-or-higher findings on shipped protocols, since all four checks should
    emit only on the aspirate vocabulary violation class, which is documented in TODO.md
    as a known-deferred fix, not a gate-blocker)
  - **OR** if aspirate warnings are emitted: the integrate step adds an explicit
    `WARN_ALLOWLIST` of the 8 named protocols so the gate can pass with a known-warning
    count; see Open questions below
  - `validation/validate.py --all` includes renderer findings in aggregate count and
    reports renderer-gate status on exit
  - `pytest tests/test_manual_lint.py` passes including structured-output shape tests
  - Update `docs/CHANGELOG.md` with M2 entry
- Parallel-plan ready: no - WS-E depends on WS-D's structured output shape; two-step
  serial dispatch within M2

## Workstream breakdown

### Workstream WS-A: Vocabulary checks

- Owner: coder
- Interfaces:
  - Needs: none (the `render_step` function and `LintCollector` are already present)
  - Provides: `L-ASPIRATE` check class; updated `LintCollector` calls in `render_step`
- Expected patches: 1 patch touching `protocol_manual.py` + fixture YAML under
  `tests/fixtures/manual_lint/`

### Workstream WS-B: Material registration checks

- Owner: coder
- Interfaces:
  - Needs: `material_labels` dict (already loaded and passed through to `render_step`);
    `collect_referenced_materials` function (already exists)
  - Provides: `L-UNREGISTERED` and `L-UNUSED` check classes; a post-walk lint pass
    that compares referenced-vs-registered materials
- Expected patches: 1 patch touching `protocol_manual.py` + fixture YAML + fixture
  `materials.yaml` under `tests/fixtures/manual_lint/`

### Workstream WS-C: Flow reachability check

- Owner: coder
- Interfaces:
  - Needs: the step walk loop in `render_protocol_manual` (already tracks `visited` set)
  - Provides: `L-UNREACHABLE` check class; a post-walk lint pass that diffs `visited`
    against `steps_by_name.keys()`
- Expected patches: 1 patch touching `render_protocol_manual` + fixture YAML

### Workstream WS-D: Structured lint output and validate flag

- Owner: coder
- Interfaces:
  - Needs: M1-exit (stable `LintCollector` with all four new check classes)
  - Provides: upgraded `LintCollector` that emits findings per
    `docs/VALIDATION_JSON_SCHEMA.md` via `validation/shared_toolkit/findings.py`;
    `--validate` flag added to `parse_args()`
- Expected patches: 1-2 patches; the `LintCollector` rewrite may be its own patch if
  the diff is complex

### Workstream WS-E: Validate orchestrator integration and tests

- Owner: coder
- Interfaces:
  - Needs: WS-D's `--validate --json` output shape; `validation/validate.py` entry
    points
  - Provides: renderer gate wired into `validation/validate.py --all`; structured-output
    shape tests added to `tests/test_manual_lint.py`
- Expected patches: 1 patch

## Work packages

### Work package WP-A1: Implement L-ASPIRATE check

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (`render_step`); new fixture
  `tests/fixtures/manual_lint/aspirate_violation/protocol.yaml` and `materials.yaml`
- Depends on: none
- Acceptance criteria:
  - `render_step` scans the step prompt for the token "aspirate" (case-insensitive,
    word-boundary match to avoid false positives on "aspirated" vs "re-aspirated")
  - If found AND the step sequence contains a pipette-draw gesture (any interaction
    where `is_pipette(catalog, target)` is True and the dest's `material_name` result
    is NOT "empty"), emit `lint.record(step_name, "L-ASPIRATE", <message>)`
  - The check does NOT fire when the only pipette action is vacuum-removal-to-waste
    (dest `material_name` -> "empty"), which is the correct "aspirate" use case
  - Running `--lint` on the 8 named protocols in `docs/TODO.md` produces at least
    one `L-ASPIRATE` warning each
  - Running `--lint` on the remaining shipped protocols produces zero `L-ASPIRATE` warnings
- Verification commands:
  - `source source_me.sh && python3 validation/manual/protocol_manual.py drug_dilution_setup --lint 2>&1 | grep L-ASPIRATE`
    (should produce at least one hit)
  - `source source_me.sh && python3 validation/manual/protocol_manual.py mtt_plate_reaction --lint 2>&1 | grep L-ASPIRATE`
    (should produce zero hits; MTT protocol uses "draw" correctly after the prior fix)
  - `pytest tests/test_manual_lint.py -k aspirate`
- Obvious follow-ons:
  - Add `L-ASPIRATE` to the check-class list in the module docstring
  - Run `--lint --all` and record the initial aspirate-violation list in a comment in
    `docs/TODO.md` under the aspirate vocabulary section

### Work package WP-B1: Implement L-UNREGISTERED check

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (`render_protocol_manual`
  post-walk block); new fixture `tests/fixtures/manual_lint/unregistered_material/`
- Depends on: none
- Acceptance criteria:
  - After the step walk loop completes, collect all `material_name` / `held_material_name`
    values written by `ObjectStateChange` ops (reuse or extend `collect_referenced_materials`)
  - For each collected material name (excluding sentinels `empty`, `mixed`, `cells`,
    `formazan`, `waste_mtt`, `waste_media`), check membership in `material_labels`
  - Emit `lint.record("(post-walk)", "L-UNREGISTERED", <message>)` for any unregistered name
  - The sentinel allowlist must be declared as a module-level constant so it can be
    extended without touching the check logic
  - Fixture with a typo (`meia` instead of `media`) emits exactly one `L-UNREGISTERED` warning
  - Zero `L-UNREGISTERED` warnings on the full shipped protocol tree
- Verification commands:
  - `pytest tests/test_manual_lint.py -k unregistered`
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --all --lint 2>&1 | grep L-UNREGISTERED`
    (should produce zero lines)
- Obvious follow-ons:
  - If any shipped protocols emit `L-UNREGISTERED`, add to `docs/TODO.md` as a new
    follow-up item rather than blocking M1 gate

### Work package WP-B2: Implement L-UNUSED check

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (same post-walk block as WP-B1);
  add fixture case to `tests/fixtures/manual_lint/unregistered_material/` or create
  `tests/fixtures/manual_lint/unused_material/`
- Depends on: WP-B1 (same post-walk block; serialize within WS-B)
- Acceptance criteria:
  - After collecting referenced materials (WP-B1), compute `unused = set(material_labels.keys()) - referenced`
  - Emit `lint.record("(post-walk)", "L-UNUSED", <message>)` for each unused name
  - Fixture with an orphaned material entry emits exactly one `L-UNUSED` warning
  - Zero `L-UNUSED` warnings on the full shipped protocol tree
- Verification commands:
  - `pytest tests/test_manual_lint.py -k unused`
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --all --lint 2>&1 | grep L-UNUSED`
- Obvious follow-ons:
  - If shipped protocols emit `L-UNUSED`, record them; some may be intentional
    (materials defined but reserved for a follow-on step that hasn't shipped yet)

### Work package WP-C1: Implement L-UNREACHABLE check

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (`render_protocol_manual`
  post-walk block); new fixture `tests/fixtures/manual_lint/unreachable_step/`
- Depends on: none
- Acceptance criteria:
  - After the step walk loop, compute `unreachable = set(steps_by_name.keys()) - visited`
  - Emit `lint.record("(post-walk)", "L-UNREACHABLE", f"step {name!r} is declared but never reached")`
    for each unreachable step name
  - Fixture with an orphaned step (declared in `steps[]` but not reachable via
    `entry_step` -> `next_step` chain) emits exactly one `L-UNREACHABLE` warning
  - Zero `L-UNREACHABLE` warnings on the full shipped protocol tree
- Verification commands:
  - `pytest tests/test_manual_lint.py -k unreachable`
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --all --lint 2>&1 | grep L-UNREACHABLE`
- Obvious follow-ons:
  - If shipped protocols emit `L-UNREACHABLE`, triage: some may be legitimate
    dead-code from a prior step rename that left an orphan

### Work package WP-D1: Upgrade LintCollector to structured findings

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (`LintCollector` class);
  `validation/shared_toolkit/findings.py` (import and use)
- Depends on: WP-A1, WP-B1, WP-B2, WP-C1 (needs all check classes stable)
- Acceptance criteria:
  - `LintCollector.record()` continues to accept `(step_name, check_class, message)` -
    call sites unchanged
  - `LintCollector` stores enough context (protocol_name, path) to populate all
    required finding fields
  - `LintCollector.emit_text(stderr_stream)` retains the existing text-to-stderr
    behavior for `--lint` without `--validate`
  - `LintCollector.emit_findings()` returns a list of `Finding` objects shaped per
    `docs/VALIDATION_JSON_SCHEMA.md`; severity mapping: `L-ASPIRATE` -> WARNING,
    `L-UNREGISTERED` -> WARNING, `L-UNUSED` -> INFO, `L-UNREACHABLE` -> WARNING,
    `L-MATDRIFT` -> WARNING, `L-VOLMISMATCH` -> WARNING, `L-PROMPT` -> INFO
  - `tool` field value: `"manual_lint"` (matches the gate name in validate.py)
  - `code` field value: the check class string lowercased with hyphens
    (e.g. `"l-aspirate"`, `"l-unregistered"`)
- Verification commands:
  - `pytest tests/test_manual_lint.py -k findings_shape`
- Obvious follow-ons:
  - Update module docstring to document the severity mapping table

### Work package WP-D2: Add --validate flag

- Owner: coder
- Touch points: `validation/manual/protocol_manual.py` (`parse_args`, `main`)
- Depends on: WP-D1
- Acceptance criteria:
  - `--validate` flag added to the `Lint` argument group in `parse_args()`
  - When `--validate` is set, `main()` runs `render_protocol_manual` with lint
    collection enabled, does NOT write or print the rendered markdown, and instead
    calls `LintCollector.emit_findings()` and writes output per `--json` / `--ndjson`
    / text based on the existing `args.output_format` flow
  - `--validate` accepts `--json` and `--ndjson` (previously rejected for this tool
    because they applied to rendered markdown, not findings; `--validate` mode
    produces findings, not markdown)
  - Exit code 1 when any finding with severity WARNING or ERROR is emitted
  - Exit code 0 when only INFO findings or no findings are emitted
- Verification commands:
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --validate --all --json | python3 -m json.tool | grep severity`
  - `source source_me.sh && python3 validation/manual/protocol_manual.py --validate --all; echo "exit: $?"`

### Work package WP-E1: Wire renderer into validation/validate.py and add tests

- Owner: coder
- Touch points: `validation/validate.py`; `tests/test_manual_lint.py`
- Depends on: WP-D2
- Acceptance criteria:
  - `validation/validate.py --all` invokes `protocol_manual.py --validate --json` as one
    of its gate steps and includes renderer finding count in the aggregate summary
  - `validation/validate.py` exits 1 if the renderer gate exits 1
  - `tests/test_manual_lint.py` includes:
    - One positive fixture test per check class (L-ASPIRATE, L-UNREGISTERED, L-UNUSED,
      L-UNREACHABLE) asserting `check_class in output`
    - One negative fixture test per check class asserting no false positive
    - One structured-findings shape test asserting required fields present and typed
      correctly
  - `pytest tests/test_manual_lint.py` passes (0 failures)
  - `source source_me.sh && validation/validate.py -q` passes with renderer gate
    reporting 0 WARNING/ERROR findings on the current shipped tree (modulo the
    aspirate allowlist decision from Open questions)
- Verification commands:
  - `pytest tests/test_manual_lint.py`
  - `source source_me.sh && python3 validation/validate.py -q`
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md` M2 entry
  - Update `docs/TODO.md` aspirate vocabulary section to note gate is now active

## Acceptance criteria and gates

- Per-patch gate: each work package's verification commands pass; no new `L-*` false
  positives on the 12 shipped mini-protocols
- M1 integration gate: `pytest tests/test_manual_lint.py` passes; `--lint --all`
  shows a stable, documented finding set (aspirate list); no findings of classes
  `L-UNREGISTERED`, `L-UNUSED`, `L-UNREACHABLE` on shipped protocols
- M2 integration gate: `validation/validate.py -q` exits 0 with renderer gate included;
  `--validate --json --all` produces valid JSON per schema
- Manual review gate: someone reads the rendered manual for one protocol
  (`mtt_plate_reaction`) and confirms the lint output is actionable (not noisy)

## Test and verification strategy

**M1 tests** (WS-A, WS-B, WS-C parallel):
- Each check class: 1 positive fixture (minimum viable YAML that triggers the check),
  1 negative fixture (valid YAML that must not trigger the check)
- Fixtures under `tests/fixtures/manual_lint/<check_name>/`; named `protocol.yaml`
  and `materials.yaml`
- `tests/test_manual_lint.py` imports `protocol_manual` helpers and calls
  `render_protocol_manual(name, catalog, lint=LintCollector())` directly on the fixture
  protocol; asserts `check_class` in `{cls for _, cls, _ in lint.warnings}`

**M2 tests** (WS-E):
- One test asserts JSON output shape: `findings` key present, each finding has
  `severity`, `tool`, `code`, `message` at minimum
- One test asserts exit code 1 on a fixture with a WARNING-class finding
- One test asserts exit code 0 on a valid fixture

**Regression baseline:**
- After M2, run `source source_me.sh && python3 validation/validate.py --all -q` and
  record the finding counts. This becomes the new baseline for future regressions.

## Migration and compatibility policy

- `--lint` flag behavior unchanged: text to stderr, no exit code impact. Existing
  scripts and CI invocations using `--lint` continue to work.
- `--validate` is a new flag; no existing callers. No backward-compatibility concern.
- `LintCollector.record()` signature unchanged; all M1 call sites use the same
  three-argument form as the existing L-PROMPT/L-MATDRIFT/L-VOLMISMATCH checks.
- `LintCollector.emit()` (existing method) retains its text-to-stderr contract;
  renamed to `emit_text()` internally for clarity, but an `emit()` alias is kept
  for backward compatibility until the call site in `main()` is updated.
- Deletion criteria for legacy text path: remove the `emit()` alias in a follow-on
  housekeeping patch after M2 confirms all callers updated.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| L-ASPIRATE emits false positives on non-aspirate uses of the word | high (noisy gate) | "aspirate" appears in a step prompt for a legitimate vacuum-removal step | coder (WP-A1) | Word-boundary match; check only fires when a non-waste pipette draw gesture is also present |
| L-UNREGISTERED fires on sentinels not in allowlist | medium | New sentinel like `waste_drug` added to a protocol but not to the allowlist constant | coder (WP-B1) | Module-level `MATERIAL_SENTINEL_ALLOWLIST` constant; doer adds `waste_*` pattern or individual names |
| Renderer validate gate adds significant wall-clock to CI | low (performance) | `--validate --all` renders all 12 protocols (slow) | maintainer | Profile before M2; add `--quiet` to suppress per-protocol output if needed |
| aspirate-vocabulary findings cause gate to fail before TODO items fixed | high (blocks CI) | M2 ships before the 8 aspirate protocols are cleaned up | coder (WP-E1) | Open question below; resolve before WP-E1 ships |

## Documentation close-out requirements

- Active plan / progress tracker: move `docs/active_plans/manual_validator_extension.md`
  to `docs/archive/manual_validator_extension.md` after M2 gates pass
- `docs/CHANGELOG.md` entries:
  - M1 entry: `### Additions and New Features` - four new L-* check classes; each
    with a one-line description and the affected file
  - M2 entry: `### Additions and New Features` - `--validate` flag, structured finding
    output, `validate.py` integration
- `docs/TODO.md`: update the "Vocabulary: aspirate" section to note the gate is now
  active; keep the per-protocol list as the remediation target
- Update `validation/manual/protocol_manual.py` module docstring to document the new
  check classes, severity mapping, and `--validate` mode

## Patch plan and reporting format

- Patch 1 (WS-A): `protocol_manual.py` L-ASPIRATE implementation + fixture
- Patch 2 (WS-B): `protocol_manual.py` L-UNREGISTERED + L-UNUSED implementation + fixtures
- Patch 3 (WS-C): `protocol_manual.py` L-UNREACHABLE implementation + fixture
- Patch 4 (WS-D): `protocol_manual.py` LintCollector structured output + --validate flag
- Patch 5 (WS-E): `validation/validate.py` renderer gate + `tests/test_manual_lint.py`

Patches 1, 2, 3 are parallel. Patch 4 follows M1 exit. Patch 5 follows Patch 4.

## Open questions and decisions needed

- **OQ-1 (aspirate gate blocking)**: If L-ASPIRATE emits WARNING findings for the 8
  named protocols, should the M2 gate include an explicit `WARN_ALLOWLIST` of those
  protocols so the gate passes while the vocabulary remediation is in progress? Or
  should the aspirate findings be INFO severity (non-blocking) until the 8 protocols
  are cleaned up?
  - Decision owner: user (before WP-E1 ships)
  - Recommendation: emit L-ASPIRATE as INFO severity for now, upgrade to WARNING
    after the 8 protocols are cleaned. This avoids allowlist maintenance.

- **OQ-2 (sentinel allowlist scope)**: Should `MATERIAL_SENTINEL_ALLOWLIST` include
  a `waste_*` glob pattern (any material name starting with `waste_`) or an explicit
  list? A glob is easier to extend; an explicit list is safer against author typos.
  - Decision owner: coder (WP-B1), subject to user review of the initial list
  - Recommendation: explicit list (`empty`, `mixed`, `cells`, `formazan`, `waste_mtt`,
    `waste_media`, `waste_drug`, `waste_buffer`); expand from actual usage in tree
