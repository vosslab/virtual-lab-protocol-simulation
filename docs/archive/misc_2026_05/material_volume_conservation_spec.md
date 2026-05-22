# Plan: material volume conservation spec amendment

## Context

The stepper plan `protocol_stepper_tool.md` originally included WP-C3, a within-response physical-volume balance rule on `material_container` objects. A pre-M1 dry-run (PRE-V, CHANGELOG 2026-05-16) loaded the three transfer-heavy mini-protocols (MP-1 hood detachment, MP-5 carboplatin dilution, MP-7 plate drug treatment) and found that **every authored protocol splits source-decrement and sink-increment across separate `interaction.response` blocks**. The within-response balance rule false-fires on every liquid transfer in the current shipped tree, so the rule cannot ship as written.

Conservation is still pedagogically valuable: the F2 bug class (5 ul aspirated from a stock without the stock losing 5 ul, or without the destination gaining 5 ul) is exactly what a balance check should catch. The problem is rule **scope** and **disposal semantics**, not the goal.

`docs/specs/MATERIAL_CONVENTION.md` line 7 ("a material is something physically present in, on, produced by, removed from, or transferred between objects") is the only in-spec anchor today. There is no explicit "Volume conservation" section.

This plan is a spec RFC that resolves the open semantics before any stepper conservation rule lands.

## Objectives

- Add an explicit "Volume conservation" section to `docs/specs/MATERIAL_CONVENTION.md` that ratifies the chosen rule scope (per-response, per-step, or per-mini).
- Resolve aspiration-to-air (drawing into a pipette tip that is open to atmosphere before deposit) so it is not an automatic imbalance.
- Resolve disposal (vacuum trap, aerosol loss, evaporation, spray application, intentional discard) so the spec names the modeled-sink or sentinel-disposal pattern authors must use.
- Provide enough detail that a follow-on stepper patch can re-open WP-C3 and ship a check that passes on the current authored tree without weakening the rule.

## Design philosophy

Fix the design, not the symptom. The pre-M1 dry-run showed the per-response rule is wrong as written, not that the rule is unimplementable. Per `docs/PRIMARY_DESIGN.md`: closure over openness, layer boundaries strict. Whatever rule scope wins must keep conservation in the object/material layer; it must not name protocols, steps, or materials. Per `docs/PRIMARY_CONTRACT.md`: no new schema field, no new `scene_operation` primitive ships without architect approval. This RFC produces the approval artifact for any disposal sentinel or `step_kind`-style scoping field a stepper rule would need.

## Scope

- Edit `docs/specs/MATERIAL_CONVENTION.md`: add "Volume conservation" section with the chosen rule scope, disposal handling, and an example for transfer, dilution, and discard.
- If the chosen approach requires a new schema field (e.g. `disposal: true` on a response, a new `scene_operation` type for liquid loss, a `step_kind` on steps), update the relevant schema spec in `docs/specs/` and route through `docs/specs/SPEC_DESIGN_CHECKLIST.md` first.
- Do not implement the stepper rule here. The follow-on stepper patch references this spec and lands the rule in a separate work package.
- Do not edit any authored protocol YAML to satisfy a not-yet-ratified rule.

## Non-goals

- Do not implement WP-C3 in `tools/stepper/`. That is a follow-on patch unblocked by this RFC.
- Do not introduce per-material balance. Conservation owns physical volume only; material identity is owned by the unknown-material rule (WP-C1) and the cross-mini production rule (WP-F1).
- Do not retroactively re-author MP-1, MP-5, or MP-7 to a one-response-per-transfer shape until the spec ratifies that scope.

## Approach

The PRE-V dry-run reviewer identified three resolution options. The RFC must evaluate all three and pick one.

- **Option 1: amend rule scope from per-response to per-step.** Sum every `material_volume` and `held_material_volume` delta across every `ObjectStateChange` in every `interaction.response` inside one step; net must equal zero (allowing for any declared disposal). This matches the authored shape: MP-5 aspirates from a stock in interaction 1's response and deposits into a well in interaction 2's response of the same step. Pro: zero authoring churn; existing protocols pass as-is. Con: a single step that legitimately aspirates and then deposits to two different wells must still balance across the step, which it does, but reviewer must confirm by enumeration. Open: aspirate-into-pipette followed by no-deposit (operator carries the tip to the next step) still imbalances; needs step-boundary state-carryover.

- **Option 2: spec-amend with a `disposal: true` flag (or new `scene_operation` type) for aspiration-to-air / spray / vacuum-evap responses.** The conservation rule then skips disposal-flagged responses or treats the disposal primitive as a sink with infinite capacity. Pro: explicit author intent; the F2 catch remains strong for non-disposal cases. Con: introduces a new schema surface; requires `SPEC_DESIGN_CHECKLIST.md` approval; author burden to flag disposal correctly. Open: which is cleaner, a boolean flag on the response or a typed primitive like `MaterialDispose`?

- **Option 3: cross-mini balance only -- drop within-response and within-step checks; enforce that total volume in any `material_container`'s lifetime balances across the full mini.** Pro: maximum authoring freedom; matches the cross-mini production rule's philosophy. Con: weakest F2 catch (a step-internal bug is invisible until end of mini); does not catch typos in mid-step transfers; loses fine-grained pedagogy.

RFC selection criteria: prefer the option with (a) zero false fires on the current authored tree, (b) strongest retention of the F2 catch, (c) smallest new schema surface, in that order. Architect approval required to ratify the choice and any associated schema change.

## Out-of-scope follow-ons

- Stepper implementation of the ratified rule (re-opens WP-C3 with a new acceptance section anchored to the new spec section).
- Authored-protocol audit to confirm zero false fires under the chosen rule before the stepper rule ships.

## Retire-rule contract

This plan exists to close the WP-C3 gap. Until this RFC ratifies + a follow-on stepper patch lands the chosen rule:

- F2 volume-math drift class is **only partially gated** in production (`unknown_material` catches name drift; volume drift with names resolved slips through).
- The stepper docs (`docs/USAGE.md`) and CHANGELOG explicitly note the gap.

Trigger condition for ratification: **before any new dilution-heavy mini-protocol lands beyond MP-5**. The next protocol that authors a multi-stock dilution chain or aspirate-to-waste sequence reopens this RFC as a blocker.

Upon ratification + stepper patch landing, the stepper CHANGELOG entry must explicitly record: "WP-C3 conservation rule shipped per [material_volume_conservation_spec.md]; F2 volume-math class now fully gated."
