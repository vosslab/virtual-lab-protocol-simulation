# Plan: `validate_content_yaml.py` cross-protocol `display_color` consistency check

## Context

`docs/specs/MATERIAL_CONVENTION.md` declares `display_color` as a property of a material name. Same `material_name` declared in multiple protocols' `materials.yaml` files must carry the same `display_color`. Divergence is drift, not pedagogy: PBS rendered blue in one mini and yellow in another is an authoring bug, not intent.

`validation/yaml/validate.py` does not currently enforce this. The check was scoped out of the `validation/stepper/validate.py` plan (`docs/active_plans/protocol_stepper_tool.md`) on the grounds that it is a static cross-file consistency check - flow-independent - and therefore belongs to the validator, not the stepper. This plan files that work so it does not rot in conversation.

## Objectives

- Extend `validation/yaml/validate.py` with a cross-protocol consistency check that fails ERROR when the same `material_name` carries different `display_color` values across any two `materials.yaml` files in `content/protocols/*/materials.yaml`.
- Add fixture coverage proving the check fires on a divergence and stays silent on a consistent multi-protocol declaration.

## Design philosophy

Static cross-file consistency is the validator's domain, not the stepper's. The stepper threads runtime state; declared metadata divergence has no runtime dependency and resolves entirely from the loaded `ContentDatabase`. Per `docs/REPO_STYLE.md` "fix the design, not the symptom": when the same material name appears with two display colors, the bug is one of the two files, not the rendering layer. Catch it at load time, ERROR-level, so authors fix the YAML before the bug ships. Rejected alternative: per-protocol `display_color` override - this would legitimize divergence and undermine the closure of `MATERIAL_CONVENTION.md`.

## Scope

- Add a cross-file check in `tools/validators/` (existing package) that groups `display_color` declarations by `material_name` across all protocols and ERRORs on any name with more than one distinct color value.
- Add `tests/fixtures/validator/display_color_divergence/` with two minimal protocol stubs that declare the same material with different colors; assert the ERROR fires.
- Add `tests/fixtures/validator/display_color_consistent/` with two minimal protocol stubs that declare the same material with the same color; assert no finding.
- Add a focused pytest covering the check; keep it under 1 s.
- Update `docs/CHANGELOG.md` with a single entry under the correct date.

## Non-goals

- Do not introduce a per-protocol `display_color` override field.
- Do not move `display_color` to a shared material library (separate spec amendment, out of scope here).
- Do not alter stepper behavior (`validation/stepper/validate.py` remains unaware).
- Do not extend the check to other fields (`label`, `category`, etc.) in this patch - file as follow-on if drift surfaces.

## Current state summary

- `validation/yaml/validate.py` already loads every `materials.yaml` via `ContentDatabase` (`resolve_material(protocol_name, material_name)` per validated API on line 210 of `tools/validators/database.py`).
- Validator currently runs per-file and cross-file checks; this addition fits the cross-file lane.
- No prior check enforces `display_color` consistency.

## Work packages

### Work package WP-1: cross-protocol `display_color` check

- Owner: coder
- Touch points: `tools/validators/<appropriate_module>.py` (place alongside existing cross-file validators), `tests/fixtures/validator/display_color_divergence/`, `tests/fixtures/validator/display_color_consistent/`, `tests/test_validate_content_yaml_display_color.py`.
- Depends on: none
- Acceptance criteria:
  - Walks every `content/protocols/*/materials.yaml`, indexes `(material_name -> set of display_color values)`.
  - For any `material_name` whose color set has more than one element, emits ERROR naming the divergent material and the two (or more) protocol files declaring different colors.
  - Spec-cite in finding output: `per docs/specs/MATERIAL_CONVENTION.md material identity`.
  - Live tree exits 0 after merge (run validator post-patch; if existing content has real divergence, file each as a bug fix in the same patch or a follow-on patch - do not soften the check).
  - Test runs under 1 s.
- Verification commands:
  - `source source_me.sh && python3 validation/yaml/validate.py`
  - `source source_me.sh && pytest tests/test_validate_content_yaml_display_color.py`
- Obvious follow-ons:
  - Update `docs/CHANGELOG.md` under today's date.

## Acceptance criteria and gates

- Per-patch gate: pyflakes clean; new pytest green; full validator run on live tree exits 0.
- Release gate: `docs/CHANGELOG.md` entry under correct date and required subsections.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Live tree already carries `display_color` divergence | medium | Post-patch validator run fails | coder | Run pre-patch audit (`source source_me.sh && python3 _temp.py` indexing colors per material); fix divergent YAML in the same patch; do not relax the check to ship green. |
| Future material library shared file changes the source location | low | A shared `content/materials/` directory is introduced | maintainer | Re-point the check at the shared file when that spec amendment lands; update fixture path. |

## Open questions and decisions needed

- None at plan publication. New questions surface as items in this file during execution.

## Documentation close-out requirements

- `docs/CHANGELOG.md`: single entry under Additions and Tests subsections.
- Plan file `git mv`'d to `docs/archive/` once the patch ships.
