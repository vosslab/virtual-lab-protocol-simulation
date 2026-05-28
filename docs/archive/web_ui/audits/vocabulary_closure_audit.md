# Vocabulary closure audit

Date: 2026-05-27
Mission: apply docs/specs/SPEC_DESIGN_CHECKLIST.md systematically to the
four authoring-vocabulary specs and flag every closure violation.

## Summary

| Spec | BLOCKING | CONCERN | INFO |
| --- | --- | --- | --- |
| PROTOCOL_VOCABULARY.md | 3 | 6 | 4 |
| SCENE_VOCABULARY.md | 3 | 5 | 3 |
| OBJECT_VOCABULARY.md | 2 | 4 | 3 |
| MATERIAL_CONVENTION.md | 4 | 5 | 3 |
| Total | 12 | 20 | 13 |

12 BLOCKING items must be addressed before any new shell or runtime work
consumes the affected vocab. 20 CONCERN items are cosmetic drift; 13 INFO
are noted for future cleanup.

## PROTOCOL_VOCABULARY.md

### BLOCKING

1. Rule 1 / 11 -- `target_with_value` preset (lines 622-623): `value`
   described as "a mapping of typed value keys" with no closure on which
   keys are allowed. Open-ended mini-language. Fix: enumerate the closed
   set (`volume_ml`, `voltage_v`, `ph`, `temperature_c`, etc) and reject
   unknown keys.
2. Rule 1 / 11 -- `final_state_matches.contains` (lines 625, 637, 849)
   is an open mapping; no closure on which state-field names are valid.
   Fix: keys must resolve to declared `state_fields` on the target object;
   validator rejects unknown keys.
3. Rule 4 / 10 -- `TimedWait.display` (line 421) is an authoring-side
   appearance knob. Render leak. Fix: either remove `display` from the
   protocol primitive (let object/visual_states own it) or declare its
   closed enum here.

### CONCERN

4. Rule 2 -- `response.feedback` (lines 331, 372) inconsistently placed
   in container-terms / slot-charters table. Tighten to single canonical
   location.
5. Rule 12 -- Lines 380-383 carry transitional wording ("Additional
   bookkeeping paths require a future evidence-gated vocabulary update");
   move to migration notes.
6. Rule 15 -- Example at line 832 mixes uL and mL without naming the
   unit field. Reader could infer `held_material_volume` is unit-free.
7. Rule 6 / 12 -- Lines 718-719 reference retired forms inline;
   per ratified rule 7 retired-term mentions belong in CHANGELOG only.
8. Rule 7 -- "five ratified primitives" (lines 394, 415) -- snapshot
   count baked into prose. Replace with "every ratified scene_operation
   primitive".
9. Rule 5 -- "The set is closed but extensible" (line 478) -- ensure the
   RFC / cost-guardrail link is co-located each time.

### INFO

10. Rule 7 -- "click target" / `ClickTarget` retirement (line 862);
    verify text agrees with SCENE_VOCABULARY's retirement.
11. Rule 8 -- "shared" ownership rows (lines 766-779) name multiple
    owners; document explains the split.
12. Rule 6 -- "Twelve interactions are abbreviated for brevity" (line
    836); fixed-count assumption in example.
13. Rule 14 -- `ObjectStateChange.state` is flat-primitive-only and
    validator rejects unknown fields (lines 437-450); good closure.

## SCENE_VOCABULARY.md

### BLOCKING

1. Rule 1 / 2 -- `placement.layout` is an open subset (line 141): "a
   placement may set any subset". Closure is by reference. Fix: state
   that unknown layout keys are a build error; the allowed keys are the
   five named layout hints declared in OBJECT_VOCABULARY.md.
2. Rule 1 -- `placement.baseline_override` (line 140) has no type, no
   allowed values, no closure. Fix: declare type / range, or remove if
   subsumed by `zone.bounds`.
3. Rule 1 -- `zone.align` (line 172) open enum: "Includes `tab-stops`".
   "Includes" implies more values exist. Fix: declare the closed set;
   drop "Includes".

### CONCERN

4. Rule 12 -- "today's behavior" (line 172) transitional in canonical
   doc.
5. Rule 12 -- "Today's `sceneBounds`" (line 184) migration reference.
6. Rule 12 -- "Today's `layoutRules`" (line 401) same pattern.
7. Rule 12 -- "in cleaned authoring" (line 311) transitional.
8. Rule 10 / 4 -- `instrument-overlay` (lines 313, 463) names a DOM
   mechanism (modal-slot DOM element); runtime/render detail surfacing
   as vocabulary.

### INFO

9. Rule 7 -- `placement.depth_tier` (line 138) has no parallel
   definition; consider unifying or pointing to LAYOUT_ENGINE.md.
10. Rule 6 -- Line 297 names DOM root in authored vocabulary; covered by
    checklist rule 24.
11. Rule 7 -- `item` term (lines 311, 451) explicit shadow-vocab
    pointer; good closure.

## OBJECT_VOCABULARY.md

### BLOCKING

1. Rule 11 / 1 -- formula mini-language pointer is open by reference
   (lines 161, 187, 231). Closed token set is named only in
   OBJECT_YAML_FORMAT.md. Fix: enumerate the formula tokens
   (`fill_height`, `label`, `state`, `min`, `max`, ...) or assert closure
   verbatim here.
2. Rule 11 / 0 -- `name_pattern` is a templating mini-language (lines 95,
   410-413). Template tokens (`row_letter`, `col`, `index`) not
   enumerated as a closed set. Fix: enumerate the closed token set; mark
   unknown tokens as build errors.

### CONCERN

3. Rule 6 -- `kind` closed enum (line 63) carries "eight values mirror
   today's `kind` sub-field; the inventory observed all eight in shipped
   scene YAML". Snapshot count + migration framing.
4. Rule 12 -- Lines 240-241 carry migration framing about `capabilities`
   moving from scene-YAML to object.
5. Rule 15 -- Lines 350-402 introduce `unit: ul` on `material_volume`;
   the unit value `ul` is not declared anywhere in the doc as an allowed
   unit token.
6. Rule 10 -- `visual_states.<field>.kind: composite` (line 185) "list
   of any of the above"; recursion shape is not bounded.

### INFO

7. Rule 7 -- Materials section (lines 113-118) points to
   MATERIAL_CONVENTION.md; good closure.
8. Rule 8 -- `applies_to: subpart` appears on both `state_fields` and
   `visual_states`; document says equivalent.
9. Rule 14 -- `ObjectStateChange` constraints copied verbatim (lines
   304-308); cross-doc consistency check needed.

## MATERIAL_CONVENTION.md

### BLOCKING

1. Rule 4 / 10 -- extensive SVG-mechanism leakage into a vocabulary doc
   (lines 161-183, 292-318): `anchor_liquid_clip`, `anchor_liquid_bounds`,
   prefixing rules, generator path `pipeline/generate_svg_globals.py`.
   Fix: move SVG anchor mechanics into SVG_PIPELINE.md or
   OBJECT_YAML_FORMAT.md; keep MATERIAL_CONVENTION focused on material
   identity contract.
2. Rule 12 / 7 -- DEPRECATED scalar form documented inside canonical
   (lines 22-24, 110-123): "DEPRECATED scalar form", "V6a validator",
   "M4 content migration". Per ratified rule 7 retired mentions belong
   in CHANGELOG. Fix: delete the deprecation section.
3. Rule 12 -- version tokens in canonical doc (lines 22, 96, 112, 123):
   "V6a", "V6b", "M4 content migration", "material_validator.py V6a".
   Per PRIMARY_SPEC.md "No schema version" rule, version tokens must not
   appear in canonical specs. Fix: strip every V6a/V6b/M4 token.
4. Rule 0 / 1 -- `Future Extensions` section (lines 354-358) names
   unimplemented behavior without RFC pointers. Future-proofing that
   bypasses design (checklist rule 5). Fix: delete or convert to RFC
   pointers.

### CONCERN

5. Rule 6 -- "The full set is eight values" (line 130) -- snapshot count
   in prose.
6. Rule 7 -- Lines 7-9 define "material"; OBJECT_VOCABULARY.md also
   defines it (line 498). Two canonical homes.
7. Rule 12 -- "(not implemented)" appears three times in Future
   Extensions.
8. Rule 1 -- `display_color` mapping (lines 60-64) closed to
   `light`/`dark` only; no validator language stating unknown sub-keys
   rejected.
9. Rule 8 -- Sentinel allowlist (lines 130-141) split between
   OBJECT_VOCABULARY (state sentinels) and MATERIAL_CONVENTION
   (biological + waste sentinels). Two owners for one closed set.

### INFO

10. Rule 1 -- `display_color.light` / `dark` typed as hex strings;
    could tighten to `^#[0-9a-fA-F]{6}$` regex.
11. Rule 4 -- Lines 198-206 explicitly label "Runtime implementation
    note (not authoring vocabulary)"; good defensive labeling.
12. Rule 6 -- `Convention scope` list (lines 254-271) enumerates kinds;
    verify kind-list is the same closed set as OBJECT_VOCABULARY.

## Cross-spec observations

### Top 3 issues

1. **Shadow vocabulary on `material_*` field naming.** OBJECT_VOCABULARY
   (lines 100-103) declares `material_name` / `material_volume` for
   vessels and `held_material_name` / `held_material_volume` for tools.
   PROTOCOL_VOCABULARY repeats this in multiple places (lines 410-413,
   459-477, 681). MATERIAL_CONVENTION repeats it again (lines 210-233).
   Pick one canonical home (likely OBJECT_VOCABULARY); have others link.
2. **`kind` enum has two homes.** OBJECT_VOCABULARY enumerates eight
   values (line 63). MATERIAL_CONVENTION's "Convention scope" (lines
   257-271) lists kinds informally and adds `conical tube`, `microtube`,
   `waste container`, `electrophoresis chamber`, `well subpart` as if
   they were kinds. Layer-boundary drift.
3. **`SvgSwap` / `ColorChange` / `LiquidDisplayChange` /
   `SetPointDisplayChange` retirement.** PROTOCOL_VOCABULARY (lines
   399-413) and OBJECT_VOCABULARY (lines 219-228) both describe the
   reclassification. Per ratified rule 7, retired-term mentions belong
   in CHANGELOG only.

### Other cross-spec issues

- "Material" defined in both OBJECT_VOCABULARY (line 498) and
  MATERIAL_CONVENTION (lines 7-9). One canonical home.
- Sentinels (`empty`, `mixed`): MATERIAL_CONVENTION line 143 says
  OBJECT_VOCABULARY defines them, but OBJECT_VOCABULARY never enumerates
  them. Missing canonical home.
- `ClickTarget` retirement text in both PROTOCOL_VOCABULARY (lines
  862-887) and SCENE_VOCABULARY (lines 228-253). Verify agreement.
- `placement_name` / `object_name` distinction documented well in
  SCENE_VOCABULARY only; confirm no protocol example accidentally
  references a `placement_name`.

## Status

- Status label: DONE.
- 12 BLOCKING violations across the four specs; address before any new
  shell or runtime consumer is written against the vocab.
- 20 CONCERN, 13 INFO items.
- No spec file modified; the audit is advisory.
- Owner: vocabulary owner (likely user) for closure fixes; runtime-seam
  plan should not consume the vocab until BLOCKING items are addressed
  or explicitly accepted.
