# Plan: scene-adapter resolution model design

## Context

The protocol stepper (M1, landed 2026-05-16) models target resolution with an active-scene scope: a semantic target must resolve to a placement in the currently active scene (set by the latest `SceneChange`). A live-tree dry-run of the stepper revealed 234 instances where shipped protocols target objects that are spec-legal (static validator passes) but not present in the active scene at step-execution time. This indicates either:

1. **Authored protocols rely on implicit cross-scene resolution** that the spec does not yet make explicit, or
2. **The spec's scene-adapter contract needs a richer registry** than the stepper currently models.

Per the stepper plan Risk register ("Stepper rule disagrees with spec"), findings from the narrow active-scene model are demoted to WARNING until the spec is amended. This design plan ratifies the canonical scene-adapter resolution algorithm so the stepper's checks can return to ERROR level.

## Objectives

- **Define the canonical scene-adapter resolution algorithm** in spec terms, not stepper terms.
- **Decide the scope of target resolution:** Does a target resolve only in the active scene, or across the protocol's full scenes/ directory, or via an explicit `scene_adapter` registry block authored in protocol YAML?
- **Audit live-tree findings** to confirm the chosen model covers all shipped protocols.
- **Update specs** (`docs/specs/SCENE_VOCABULARY.md` and `docs/specs/PROTOCOL_YAML_FORMAT.md`) to ratify the chosen model.
- **Spawn follow-on stepper work** (`protocol_stepper_scene_adapter_alignment.md`) to re-enable active-scene checks at ERROR level once the spec lands.

## Scope

- **In scope:**
  - Spec-level design and analysis only. No stepper code changes in this plan.
  - Root-cause analysis: are the 234 warnings due to authored intent or a spec gap?
  - Proposed amendment to scene-adapter contract.
  - Updated spec docs: `SCENE_VOCABULARY.md` and `PROTOCOL_YAML_FORMAT.md`.

- **Out of scope:**
  - Stepper code or test changes. (Covered by follow-on: `protocol_stepper_scene_adapter_alignment.md`.)
  - Authored-content fixes. (If the spec change requires YAML edits, those are in the next plan.)
  - Runtime behavior or layout-engine math.

## Entry criteria

- Stepper M1 landed; active-scene checks demoted to WARNING (CHANGELOG 2026-05-16).
- Audit of live-tree stepper output confirms 234 `unknown_target_active_scene` + `ambiguous_target_in_scene` findings.
- Stepper plan Risk register identifies this plan as the mitigation path.

## Exit criteria

- **Root-cause analysis complete:** explanation of why the 234 warnings exist (authored intent or spec gap) with concrete examples from the live tree.
- **Proposed resolution algorithm documented:** ratified target resolution scope and rules (active-scene only, full-protocol-scenes registry, explicit YAML adapter, or hybrid).
- **Spec updates drafted:** proposed amendments to `docs/specs/SCENE_VOCABULARY.md` and `docs/specs/PROTOCOL_YAML_FORMAT.md`.
- **Audit result:** proposed spec applied retroactively to live-tree findings confirms either (a) all 234 become non-errors under the new spec, or (b) remaining warnings are legitimate and documented.
- **Follow-on plan spawned:** `docs/active_plans/protocol_stepper_scene_adapter_alignment.md` ready to re-enable stepper ERROR checks once this plan lands.

## Milestone and ownership

- **Tier:** Tier 1 + Approach (design and spec, no code).
- **Owner:** Architect.
- **Duration estimate:** 1-2 weeks (root-cause analysis + spec review + coordination).
- **Blocking:** M1 stepper tool is shipped with demoted checks; this plan unblocks M2 + M3 to proceed in parallel while design resolves.

## Next steps

1. Analyze the 234 live-tree warnings: categorize by protocol, step name, and target name; identify patterns.
2. Sample 10-20 warnings and examine the authored YAML to determine if targets are meant to be reachable across scene boundaries.
3. Propose one of: (a) active-scene-only resolution (no change; requires YAML fixes), (b) full-protocol-scenes registry (targets auto-resolve from any protocol scene), (c) explicit YAML adapter block (authors specify the resolver), or (d) hybrid (active + fallback to full registry).
4. Draft spec amendments to `SCENE_VOCABULARY.md` and `PROTOCOL_YAML_FORMAT.md`.
5. Apply the proposed spec retroactively to live-tree findings; confirm coverage.
6. Spawn follow-on stepper plan to re-enable checks at ERROR.

## Retire-rule contract

This plan is responsible for retiring the demoted WARNING. Until it lands:

- Stepper emits 234 `unknown_target_active_scene` + a few `ambiguous_target_in_scene` findings as WARNING on every live-tree run. **This is noise authors will learn to ignore. WARNINGs that live forever become rot.**
- The stepper's `tools/stepper/state.py` `resolve_target` method carries an inline comment pointing here.

Trigger condition for ratification: **before the next scene-introducing protocol expansion (e.g. SDS-PAGE, electrophoresis, any new equipment scene)**. Adding new scenes without resolving target-adapter semantics multiplies the WARNING noise.

Upon ratification + follow-on stepper patch landing:

1. The follow-on stepper patch promotes `unknown_target_active_scene` and `ambiguous_target_in_scene` back to ERROR.
2. The stepper CHANGELOG entry must explicitly record: "active-scene check restored to ERROR per [scene_adapter_resolution_design.md]; WARNING noise eliminated; N legitimate authoring bugs surfaced in audit and fixed."
3. This plan moves to `docs/archive/scene_adapter_resolution_design.md` per the archive convention.

Owner accountability: architect owns this plan AND owns the follow-on stepper patch that retires the WARNING. Same accountability chain prevents the demoted rule from becoming permanent.
