# Plan: stepper semantic validation (Part 1)

## Context

Design review surfaced a layer leak in an earlier draft that mixed
execution-truth checks with human-prose checks. The clean boundary, used
throughout this plan, is:

- YAML validator: structure, schema, bounds.
- Stepper (`validation/stepper/`): execution truth; "what happens when the
  protocol runs".
- Manual (`validation/manual/protocol_manual.py`): human interpretation of
  execution; "does the rendered prose match the action".

"Stepper" is deliberately distinct from the Playwright browser walker under
`tests/playwright/walker/`. Do not introduce walker terminology into
`validation/stepper/`.

The full two-part plan splits as:

- Part 1 (this document): stepper semantic checks.
- Part 2 (separate document, [manual_validator_extension.md](manual_validator_extension.md)):
  manual narrative checks.

Each part ships independently with its own validator gate. Part 1 is sequenced
first because it carries higher leverage (four checks shipped together) and
because landing it prevents layer leak from creeping back into Part 2.

## Objectives

Add execution-semantic checks to the stepper that catch real bugs YAML
structure cannot detect on its own:

- Physically impossible state transitions (volume rises with no matching draw,
  material identity changes with no transfer op).
- Orphaned steps (declared but never reached from `entry_step`).
- `next_step` cycles (infinite loops in protocol flow).
- Materials written into objects but absent from `materials.yaml`.
- Materials declared in `materials.yaml` but never referenced by execution.

Findings must be local, explainable, and tied to a single
protocol + step + interaction + object + field tuple. No global inference,
no cross-protocol reasoning, no inference engine.

## Design philosophy

This plan follows three repo principles:

- Fix the design, not the symptom (`docs/REPO_STYLE.md`). When a finding
  fires, the remediation lives in the YAML or stepper model, not in a
  per-protocol allowlist.
- Closure over openness (`docs/PRIMARY_DESIGN.md`). Check codes are a closed
  set; severity is a closed set; the prefix vocabulary is closed.
- Long-term over short-term (`docs/REPO_STYLE.md`). Ship S-STATE-JUMP as
  WARNING first, ramp to ERROR after the shipped tree stabilizes; do not
  rush a noisy ERROR that authors learn to ignore.

The interaction is the atomic unit of semantic correctness. All stepper
checks operate at the interaction boundary; intermediate op ordering inside
a single interaction is not significant. Do not push checks into per-op
hooks.

## Scope

In scope:

- Five new stepper checks (S-STATE-JUMP, S-UNREACHABLE, S-CYCLE,
  S-UNREGISTERED, S-UNUSED) with the severities and mechanics defined below.
- New tests under `tests/test_stepper_semantic.py` plus fixtures under
  `tests/fixtures/stepper_semantic/`.
- Wiring through `validation/validate.py` so the new findings flow through
  the existing gate.

Out of scope for Part 1:

- S-CONSERVATION (cross-object volume balance over a step). Deferred to the
  `material_volume_conservation_spec.md` RFC and a follow-on stepper patch.
- Any manual-layer check (handled by Part 2).
- Any new schema field on protocol or scene YAML.
- Any new `scene_operation` primitive.
- External graph libraries (no `networkx`); stdlib only.

## Non-goals

- No new check prefix beyond `S-*` (stepper) and `L-*` (manual). No check
  class may exist under both prefixes.
- No inference of source-to-sink op pairs by volume math inside
  S-STATE-JUMP. Pair inference is an explicit non-goal for the first
  version; revisit only if real bugs slip through.
- No CHANGELOG entry from this plan. The close-out CHANGELOG line is
  written when Part 1 lands, not when the plan is authored.

## Current state summary

- `validation/stepper/` already simulates per-object state during a step
  walk; it already follows `entry_step` -> `next_step` to traverse a
  protocol.
- `validation/shared_toolkit/findings.py` already defines the Finding shape
  and severity enum; this plan reuses it without modification.
- `validation/manual/protocol_manual.py` renders a soft `*(cycle detected
  ...)*` line in prose around line 1413 when a `next_step` loop is hit.
  The hard gate moves into the stepper as S-CYCLE; the manual prose line
  stays for human readability.

## Architecture boundaries and ownership

| Layer            | Owns                                              | Does not own                          |
|------------------|---------------------------------------------------|---------------------------------------|
| YAML validator   | structure, schema, bounds                         | execution semantics, prose            |
| Stepper          | execution truth, S-* checks                       | prose alignment, narrative wording    |
| Manual renderer  | human interpretation, L-* checks                  | execution truth, state simulation     |

### Mapping: checks to files

| Check          | Primary file                            | Supporting file                                   |
|----------------|-----------------------------------------|---------------------------------------------------|
| S-STATE-JUMP   | `validation/stepper/state.py`           | `validation/stepper/scene_ops.py` (emit during op)|
| S-UNREACHABLE  | `validation/stepper/step_check.py`      | (post-walk diff over visited set)                 |
| S-CYCLE        | `validation/stepper/step_check.py`      | (same traversal as S-UNREACHABLE)                 |
| S-UNREGISTERED | `validation/stepper/scene_ops.py`       | (membership check at ObjectStateChange)           |
| S-UNUSED       | `validation/stepper/step_check.py`      | (post-walk set diff)                              |

Shared support:

- `validation/shared_toolkit/findings.py`: Finding shape (reused, not edited).
- `validation/validate.py`: gate flow already runs stepper; new findings
  flow through without restructuring.

## Check definitions

### S-STATE-JUMP (WARNING; ramp to ERROR)

Catches: a `material_volume` (or `held_material_volume`) increase without a
matching decrement anywhere in the same interaction; a `material_name` (or
`held_material_name`) identity change without a transfer op targeting the
object.

Mechanism: snapshot per-object state before the interaction; compare after
all of the interaction's ops have applied; emit a finding if the comparison
shows an unbalanced increase or an unsourced identity change.

First-version simplicity rules (avoid inference-engine drift):

- Detect "increase with no decrease anywhere in the same interaction".
- Evaluate after the full interaction completes, not per-op.
- Order-independent: op sequence inside an interaction does not affect the
  verdict.
- Do not pair specific source-to-sink ops by volume math.

Required finding fields (explainability is mandatory):

- protocol name
- step name
- interaction index
- object id
- field name (`material_volume`, `held_material_volume`, `material_name`, or
  `held_material_name`)
- previous value -> new value
- whether any decrement exists in the same interaction (true/false)

Suppressions:

- `TimedWait` ops (formazan conversion is an intentional identity change).
- Initial state writes (old value is the declared default).
- Plate-subpart dotted targets when the parent plate stays conserved
  (multichannel aggregation).

Promotion condition (WARNING -> ERROR): zero false positives on the full
shipped tree across two consecutive `validation/validate.py` runs after
suppression tuning. The promotion ships with an explicit CHANGELOG entry.

### S-UNREACHABLE (ERROR)

A declared `step_name` is never visited from the `entry_step` chain.

Mechanism: walk `entry_step` -> `next_step` with a `visited` set; after
traversal, diff `visited` against `steps_by_name.keys()`. Each missing key
emits one S-UNREACHABLE finding naming the orphan step.

For `sequence_runner` kinds, every constituent listed in `mini_protocols`
is expanded and walked the same way. Orphan constituents emit S-UNREACHABLE
at the sequence-runner level.

### S-CYCLE (ERROR)

A `next_step` chain revisits a step already in the `visited` set.

Mechanism: the same traversal as S-UNREACHABLE. If `next_step` resolves to
a node already in `visited`, emit one S-CYCLE finding and halt traversal.

Interaction with S-UNREACHABLE: if S-CYCLE fired, do not emit S-UNREACHABLE
for any step on that protocol. The traversal was truncated; "unreached" is
ambiguous past the cycle. Cycle finding alone is sufficient signal for the
author to repair.

Model assumption: protocol step structure is a linear chain today (one
`entry_step`, each step has one `next_step`). Branching and looping are not
schema primitives. Cycles are author error, not a supported construct. If
the schema ever introduces branching or looping primitives, the S-CYCLE
definition must be revisited.

S-CYCLE supersedes the existing soft cycle handling in
`validation/manual/protocol_manual.py:1413` (which renders
`*(cycle detected ...)*` as prose). The manual renderer keeps the prose
fallback for human readability; the hard gate moves to the stepper.

### S-UNREGISTERED (WARNING)

When an `ObjectStateChange` writes `material_name` or `held_material_name`,
check membership in the protocol's `materials.yaml`.

Sentinel allowlist (module-level constant `MATERIAL_SENTINEL_ALLOWLIST`):

- `empty`
- `mixed`
- `cells`
- `formazan`
- `waste_mtt`
- `waste_media`
- `waste_drug`
- `waste_buffer`

The allowlist is an explicit list with no glob support. The doer may expand
it from current usage but must not introduce wildcards.

Dedup rule: emit one finding per `(protocol, material_name)` tuple, not one
per occurrence. This prevents log spam when a typoed material is referenced
many times. The finding must record the first occurrence location
(step name + interaction index) so the dedup does not erase the user's
debugging context.

### S-UNUSED (INFO)

Static set difference: `materials.yaml` keys minus the set of
`material_name` and `held_material_name` values referenced anywhere in
execution. Each unreferenced key emits one S-UNUSED finding.

Severity is INFO; this check never fails CI.

### S-CONSERVATION (deferred, not in Part 1)

Cross-object volume balance over a step: total volume removed from sources
approximately equals total added to sinks within a tolerance. This is
explicitly out of scope for Part 1. It is deferred pending the
[material_volume_conservation_spec.md](material_volume_conservation_spec.md)
RFC. Revisiting external graph libraries (such as `networkx`) is also
deferred until then; a flow-network shape genuinely fits S-CONSERVATION
and may justify a library at that point.

## Milestone plan

### P1-M1: stepper checks (parallel, 3 doers)

Three workstreams run in parallel because they touch disjoint files and
deliver independent checks. Each workstream lands with its own commit and
local doer-level tests before merging.

- P1-WS-A: S-STATE-JUMP.
- P1-WS-B: S-UNREACHABLE + S-CYCLE.
- P1-WS-C: S-UNREGISTERED + S-UNUSED.

Gate to leave P1-M1: each workstream's check fires on a fixture designed
to trigger it and stays silent on a clean fixture, demonstrated by a doer
smoke run.

### P1-M2: tests and integration (serial)

- P1-WS-D: `tests/test_stepper_semantic.py` plus fixtures under
  `tests/fixtures/stepper_semantic/`.
- P1-WS-E: `validation/validate.py` wiring confirmation plus the Part 1
  CHANGELOG entry.

P1-WS-D runs after P1-M1 lands so the test module exercises real code, not
stubs. P1-WS-E runs after P1-WS-D so the integration is wired against
green tests.

## Workstream breakdown

### P1-WS-A: S-STATE-JUMP

- Files: `validation/stepper/state.py` (snapshot hook),
  `validation/stepper/scene_ops.py` (emit during op application).
- Adds before/after snapshot wrapper at the interaction boundary.
- Emits a Finding object with the field set listed above.
- Respects the three suppression rules.

### P1-WS-B: S-UNREACHABLE and S-CYCLE

- File: `validation/stepper/step_check.py`.
- Adds one traversal pass that records `visited` and detects revisits.
- Emits S-CYCLE on revisit, halts that protocol's traversal.
- Emits S-UNREACHABLE post-walk for steps absent from `visited`, but only
  when S-CYCLE did not fire for the same protocol.

### P1-WS-C: S-UNREGISTERED and S-UNUSED

- File: `validation/stepper/step_check.py` plus
  `validation/stepper/scene_ops.py` for the per-op check.
- S-UNREGISTERED at op time: membership check against `materials.yaml`
  minus `MATERIAL_SENTINEL_ALLOWLIST`; dedup by
  `(protocol, material_name)`.
- S-UNUSED post-walk: set diff `materials.yaml` keys minus referenced set.

### P1-WS-D: tests and fixtures

- File: `tests/test_stepper_semantic.py`.
- Fixture directory: `tests/fixtures/stepper_semantic/` (created by the
  doer; this plan only names the path).
- One trigger fixture per check; one clean fixture per check.
- Tests assert the specific finding code, severity, and required fields.

### P1-WS-E: validate.py wiring and CHANGELOG

- File: `validation/validate.py`.
- Confirms the new findings flow through the existing gate without bespoke
  routing (the stepper already runs; this is a wiring check).
- Adds one `docs/CHANGELOG.md` entry under the appropriate dated heading
  describing the Part 1 ship.

## Acceptance criteria and gates

Part 1 is complete when all of the following hold:

- Each of S-STATE-JUMP, S-UNREACHABLE, S-CYCLE, S-UNREGISTERED, S-UNUSED
  fires on a fixture authored to trigger it, with the documented severity.
- Each check stays silent on a clean fixture.
- `validation/validate.py -q` exits 0 on the current shipped content tree
  with the new checks active.
- `pytest tests/test_stepper_semantic.py` passes.
- `validation/stepper/step_check.py --all --json` round-trips through
  `python3 -m json.tool` without error.
- No new schema fields, no new `scene_operation` primitives, no new check
  prefixes.

Exit threshold (existing stepper severity contract; unchanged):

- ERROR -> exit 1 by default.
- `--strict` adds WARNING to the exit-1 set.
- INFO never fails.

## Test and verification strategy

Pytest coverage:

- `tests/test_stepper_semantic.py` exercises each check on positive and
  negative fixtures.
- Fixtures live under `tests/fixtures/stepper_semantic/` and follow the
  one-trigger / one-clean pattern.
- Tests assert finding code + severity + the documented required fields
  (object id, field name, previous/new value, etc.).

Verification commands (from the plan; run from the repo root):

```
source source_me.sh && python3 validation/stepper/step_check.py --all
source source_me.sh && python3 validation/stepper/step_check.py --all --json | python3 -m json.tool > /dev/null
source source_me.sh && python3 validation/validate.py -q
pytest tests/test_stepper_semantic.py
```

The first command confirms the stepper passes on the clean shipped tree
with the new checks active. The second confirms the JSON output is
well-formed. The third runs the full validator pipeline so new findings
flow through the existing gate. The fourth runs the unit tests.

## Migration and compatibility policy

- No schema migration. No authored YAML changes are required to land
  Part 1.
- Existing soft cycle prose in `validation/manual/protocol_manual.py`
  stays for human readability; the hard cycle gate is added in the stepper.
- S-STATE-JUMP ships as WARNING; existing CI passes today by definition
  (warnings do not fail without `--strict`). Promotion to ERROR is a
  separate, later, CHANGELOG-announced change.

## Risk register

| Risk                                                 | Likelihood | Mitigation                                                                 |
|------------------------------------------------------|------------|-----------------------------------------------------------------------------|
| S-STATE-JUMP false-fires on legitimate authoring     | medium     | Ship as WARNING; tune suppressions; promote only after two clean runs.      |
| Sentinel allowlist drifts via glob creep             | low        | Explicit list, no globs; doer expands by adding entries, not patterns.      |
| S-CYCLE re-emits S-UNREACHABLE noise                 | medium     | Halt traversal on cycle; do not emit S-UNREACHABLE for that protocol.      |
| External graph library creeps in during Part 1       | low        | Anti-drift guardrail; revisit only if and when S-CONSERVATION lands.        |
| Per-op hooks fragment the interaction-atomic rule    | medium     | Evaluate S-STATE-JUMP only at the interaction boundary; reviewer enforced. |

## Anti-drift guardrails

- Stepper checks stay local and explainable, not global and inferred.
  Every finding names protocol + step + interaction + object + field +
  old/new.
- The interaction is the atomic unit of correctness. All semantic checks
  operate at the interaction boundary. Do not move checks into per-op
  hooks.
- Manual checks may not duplicate stepper checks. No check class may exist
  under both `S-*` and `L-*` prefixes.
- No new prefixes beyond `S-*` and `L-*`.
- Stdlib only. No external graph or inference libraries until and unless
  S-CONSERVATION lands.

## Documentation close-out requirements

When Part 1 lands:

- Add a dated entry to `docs/CHANGELOG.md` describing the five shipped
  checks, their severities, and the S-STATE-JUMP WARNING posture.
- Do not retire this plan file until Part 2 has landed; both parts share a
  vocabulary surface (prefix discipline) and should retire together.
- Any future S-STATE-JUMP severity promotion ships with its own CHANGELOG
  entry naming the two clean runs that justified the promotion.

## Patch plan and reporting format

Each workstream lands as one patch. Patches name the workstream id
(P1-WS-A through P1-WS-E) in the commit subject so the milestone is
traceable in `git log`. The doer reports:

- Workstream id.
- Files changed.
- Trigger fixture path and clean fixture path.
- Pytest result for the relevant module.
- Confirmation that no schema fields, scene-op primitives, or check
  prefixes were added.

## Open questions and decisions needed

None outstanding. The four resolved decisions below cover the ambiguous
points that surfaced during plan review.

## Resolved decisions

- S-STATE-JUMP severity ramp: ship WARNING; promote to ERROR after zero
  false positives on the shipped tree across two consecutive
  `validation/validate.py` runs. The promotion ships with a CHANGELOG
  entry.
- Sentinel allowlist shape: explicit list, no globs. The doer expands the
  list from current usage by adding named entries, not patterns. The
  initial list is `empty`, `mixed`, `cells`, `formazan`, `waste_mtt`,
  `waste_media`, `waste_drug`, `waste_buffer`.
- S-CONSERVATION deferral: not in Part 1. Pending the
  [material_volume_conservation_spec.md](material_volume_conservation_spec.md)
  RFC and a follow-on stepper patch.
- Implementation tooling: stdlib only. No `networkx` or other external
  graph or inference libraries in Part 1. Revisit only when S-CONSERVATION
  lands.
