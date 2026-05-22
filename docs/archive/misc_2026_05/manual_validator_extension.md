# Plan: Manual renderer validation extension (Part 2)

## Context

`validation/manual/protocol_manual.py` is the third gate in the repo's
validation pipeline: after YAML structure checks and the stepper flow
simulation, the renderer walks the executed step chain, simulates per-object
material state, and converts YAML into human-readable markdown. The tool
already has a `--lint` flag with three authoring-warning checks (`L-PROMPT`,
`L-MATDRIFT`, `L-VOLMISMATCH`). Those checks emit text to stderr and are not
yet integrated into the structured validation pipeline at
`validation/validate.py`.

This plan is the **Part 2** deliverable of the broader semantic-validation
work. The original draft proposed five new manual-layer checks. Design review
concluded that four of them (state-jump, unreachable, unregistered, unused)
are execution-semantics checks: they do not require prompt text or rendering
context, so they belong to the stepper layer, not the manual layer. Those
four are now `S-*` checks owned by the sibling plan
[stepper_semantic_validation.md](stepper_semantic_validation.md) (Part 1).
The file at that path may not yet exist on disk when this plan is read; it is
the planned Part 1 destination and is referenced here for cross-link
intentionality.

Manual's job, narrowed: **alignment between prompt text and the simulated
action**. Concretely that is one new check (`L-ASPIRATE`), the existing
three checks, a `LintCollector` upgrade to emit structured findings, and a
`--validate` mode so the renderer can join `validation/validate.py` as a real
gate.

## Objectives

- Add `L-ASPIRATE` (WARNING): catches "aspirate" in a step prompt when the
  paired pipette gesture is a non-waste draw.
- Upgrade `LintCollector` to emit structured findings per
  `docs/VALIDATION_JSON_SCHEMA.md` via
  `validation/shared_toolkit/findings.py`, while keeping the text-to-stderr
  path for human `--lint` use.
- Add `--validate` flag: lint-only mode that emits findings as JSON / NDJSON
  and returns a non-zero exit on ERROR (and on WARNING with `--strict`).
- Wire the renderer gate into `validation/validate.py --all`.

## Design philosophy

The manual layer's unique vantage point is **the rendered prose next to the
simulated action**. A check belongs here only if it needs both. Vocabulary
alignment is the textbook case: the prompt token "aspirate" is only wrong
in the context of a non-waste draw, which the renderer already knows because
it walks per-object material state.

Execution-only checks (volume jumps, unreached steps, unregistered materials,
orphaned material entries) require no prompt text. Putting them in the
renderer leaks execution-semantics logic into a text-rendering layer and
duplicates work that the stepper already does. Per the core "fix the design,
not the symptom" principle from `docs/REPO_STYLE.md`, those checks move to
the stepper.

The `LintCollector` upgrade preserves the existing text path for human use
and adds a structured-findings path so the renderer can join the same CI
evidence stream as the stepper and SVG auditor. A single collection object
that renders to either format on demand is the right shape; two separate
output codepaths would force the `render_step` chain to be called twice.

## Scope

- **L-ASPIRATE check** in `validation/manual/protocol_manual.py`:
  - Token match: regex `\baspirate(s|d|ing)?\b`, case-insensitive,
    word-boundary anchored.
  - Does NOT match `reaspirate`, `aspirator`, `aspirational`.
  - Fires when the step sequence also contains a pipette draw gesture
    whose dest material is NOT the sentinel `empty`.
  - Suppressed when the only pipette action in the step is
    vacuum-removal-to-waste (dest material -> `empty`); that is the
    correct "aspirate" use case.
  - Severity: WARNING.
- **LintCollector upgrade**:
  - `record(step_name, check_class, message)` call sites unchanged.
  - Rename `emit()` to `emit_text(stderr_stream)`; keep `emit()` as an alias
    until call sites in `main()` are updated.
  - Add `emit_findings(protocol_name, path)` returning a list of `Finding`
    objects from `validation/shared_toolkit/findings.py`.
  - Severity map lives in a module-level `LINT_SEVERITY` dict; entries:
    `L-ASPIRATE -> WARNING`, `L-MATDRIFT -> WARNING`,
    `L-VOLMISMATCH -> WARNING`, `L-PROMPT -> INFO`.
  - Finding fields: `tool="manual_lint"`, `code=<class lowercased with
    hyphens>` (e.g. `l-aspirate`), `severity`, `message`, `path`,
    `protocol`, `step`, `target`.
- **--validate flag** in `parse_args()` / `main()`:
  - Runs the lint pass, does NOT write or print rendered markdown.
  - Accepts `--json` / `--ndjson` (previously rejected for this tool because
    those flags applied to rendered markdown; under `--validate` they apply
    to findings, which is the correct semantics).
  - Exit 1 on ERROR.
  - Exit 1 on WARNING when `--strict` is set; exit 0 otherwise.
- **validate.py wiring**: `validation/validate.py --all` invokes
  `protocol_manual.py --validate --json` as one gate step and includes
  renderer findings in the aggregate count and exit code.
- **Tests**: `tests/test_manual_lint.py` with one positive and one negative
  fixture for `L-ASPIRATE`, plus a structured-findings shape test.

## Non-goals

- **Execution-semantics checks (state validity, reachability, material
  registration, orphan materials) belong to the stepper plan; do not
  duplicate them here.** Reviewers should reject any new `L-*` check whose
  detection logic does not depend on prompt text or rendering context.
- Do not add new `L-*` check classes beyond `L-ASPIRATE` in this plan.
- Do not rewrite `L-PROMPT`, `L-MATDRIFT`, or `L-VOLMISMATCH` unless a bug
  surfaces during fixture work.
- Do not add NLP, grammar, or prose-style checks. Out of scope by design.
- Do not add a `--fix` mode. The renderer is read-only.
- Do not change how `--all` renders markdown. `--validate` is a separate
  operating mode.

## Architecture boundaries and ownership

| Component | Files | Layer |
| --- | --- | --- |
| Renderer lint pass | `validation/manual/protocol_manual.py` | analysis |
| Lint finding output | `validation/shared_toolkit/findings.py` | shared infrastructure |
| Validate orchestrator | `validation/validate.py` | orchestration |
| Lint unit tests | `tests/test_manual_lint.py` | test |
| Lint fixtures | `tests/fixtures/manual_lint/` | test data |

Layer rule: the manual layer's new check lives inside `render_step` (or a
sibling helper) in `protocol_manual.py`. It must not reach into
`validation/yaml/` or `validation/stepper/` for helpers; the renderer reads
YAML directly, per its existing design.

## Anti-drift guardrails

From the approved master plan:

- **Manual checks may not duplicate stepper checks.** This is a review rule,
  not just intent. A check whose detection logic does not require prompt
  text or rendering context belongs in `validation/stepper/`, not here.
- **No new prefixes beyond `L-*`.** The only check class added by this plan
  is `L-ASPIRATE`. Renaming or re-prefixing existing checks is out of scope.
- **The same concept does not exist under two prefixes.** If a future
  reviewer proposes an `L-*` mirror of an `S-*` stepper check, reject it.

## Files to modify

- `validation/manual/protocol_manual.py`
  - Add `L-ASPIRATE` detection in `render_step`.
  - Upgrade `LintCollector` (rename `emit` -> `emit_text`, alias kept; add
    `emit_findings`; add `LINT_SEVERITY` module constant).
  - Add `--validate` flag in `parse_args()`; branch in `main()`.
- `validation/shared_toolkit/findings.py` -- import and reuse, no new code
  unless a missing field surfaces during implementation.
- `validation/validate.py` -- add renderer gate invocation in the `--all`
  flow; aggregate renderer findings into the summary.
- `tests/test_manual_lint.py` -- one positive and one negative fixture for
  `L-ASPIRATE`; one structured-findings shape test.
- `tests/fixtures/manual_lint/aspirate_violation/` -- minimal positive
  fixture (`protocol.yaml`, `materials.yaml`).

## Verification

```bash
# L-ASPIRATE fires on a known violator and is silent on a known-clean protocol:
source source_me.sh && python3 validation/manual/protocol_manual.py drug_dilution_setup --lint 2>&1 | grep L-ASPIRATE
source source_me.sh && python3 validation/manual/protocol_manual.py mtt_plate_reaction --lint 2>&1 | grep L-ASPIRATE

# --validate mode runs cleanly and produces well-formed JSON:
source source_me.sh && python3 validation/manual/protocol_manual.py --validate --all; echo "exit: $?"
source source_me.sh && python3 validation/manual/protocol_manual.py --validate --all --json | python3 -m json.tool > /dev/null

# Full validation pipeline includes the renderer gate:
source source_me.sh && python3 validation/validate.py -q

# Unit tests:
pytest tests/test_manual_lint.py
```

## Open questions and decisions needed

- **OQ-1 (L-ASPIRATE severity)**: Should `L-ASPIRATE` be WARNING (the
  default), or should it stay INFO until the 8 named protocols in
  `docs/TODO.md` are remediated?
  - Decision: **WARNING by default.** A `WARN_ALLOWLIST` is not needed
    because `validation/validate.py` only fails on ERROR by default;
    WARNING findings appear in the report but do not block the gate.
    `--strict` callers (humans, future CI tightening) will see WARNING
    findings and can act on them.
  - Decision owner: user (recorded here).
