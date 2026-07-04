# Structured objects with multiple material areas

This document is the single orientation reference for a class of object that
repeatedly gets misread: one scene object whose surface carries many
independent material-bearing regions. A 96-well plate, a tube rack, and a gel
cassette are the canonical examples. Each is ONE SVG scene object, not a
collection of many objects, and its wells, tubes, or lanes are material areas
rendered on that one object.

This is a rationale and orientation doc in the style of
[MATERIAL_DESIGN.md](MATERIAL_DESIGN.md). It states the model and points every
schema term at its owning doc. It introduces no new field or token. Where a
term is named below, it is named for orientation and linked to the doc that
owns it.

It exists because the design lives correctly across several specs
([OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md),
[MATERIAL_DESIGN.md](MATERIAL_DESIGN.md),
[MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md), and the
[subpart-click decision](../active_plans/decisions/subpart_click_pattern.md)),
and reading only one of them invites a wrong conclusion. The common wrong
conclusions are listed in [What this is not](#what-this-is-not); read that
section before proposing any change to a plate, rack, or gel.

## The core rule: one object, many material areas

A structured object is a single scene object placed by the layout engine, with
a single underlying SVG asset. Its internal cells (wells, tubes, lanes, slots,
channels) are addressable subparts declared in the object's `structure` block
(see [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) Structure). A subpart is a
region on the one object, not a scene object of its own.

The reason is deliberate: a 96-well plate is one physical thing a student sees
and reaches for as one thing. Rendering it as many scene objects would multiply
layout work, multiply click targets, and break the "one object, one placement"
model the layout engine and the material system are built on. The plate stays
one object; the wells are material areas on it.

Generated geometry ties each subpart to its real position on the art, so a
region colored for well B7 sits on B7 and nowhere else. That alignment is a
pedagogical requirement, not a cosmetic one; see
[MATERIAL_DESIGN.md](MATERIAL_DESIGN.md) spatial correspondence.

## Subparts are material areas, not new objects

Each subpart carries its own material state and renders its own material
identity. The object declares that its per-subpart region is tinted by that
subpart's material through the `material_tint` render effect with
`applies_to: subpart` (see [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)
render-effect set). At render time the runtime reads each subpart's material
field and tints that subpart's generated geometry to the resolved color.

This reuses the exact material model that colors a bottle's liquid: a neutral
region tinted by whatever material it currently holds. A well holding
carboplatin and a bottle holding PBS are the same mechanism at two scales. The
material owns the color; the object owns where the color appears; TypeScript
interprets the declared contract and hardcodes neither. See
[MATERIAL_DESIGN.md](MATERIAL_DESIGN.md) for that ownership split.

Per-subpart state fields (the material name and volume each subpart stores) are
declared with `structure.subpart_state_fields` on the object
([OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md)). The subpart is a state-bearing
material area; it is not a separate object with its own placement.

## Group addressing and the cascade write

Real lab actions often act on many cells at once: a plate-wide reagent
addition, a multichannel column sweep, a row read. Enumerating every cell in
the protocol would bury the intent. A structured-grid object may therefore
declare higher-granularity namespaces through `structure.subpart_groups`, with
a closed `group_kind` of `row`, `column`, or `region`
([OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) Subpart groups). Each group
member lists the canonical cells it contains.

A protocol addresses a group the same way it addresses one cell, through a
dotted target on one object, for example `well_plate_96.all_wells` or
`well_plate_96.col_3`. When an `ObjectStateChange` names a group target, the
write propagates the named fields to every cell in that group's `contains`
list; each member cell changes in its own place. This cascade write is the
design of record, first proposed in the
[subpart-addressing recommendation](../archive/subpart_addressing_recommendation.md)
and rendered through the per-subpart material layer above. A bulk write like
`all_wells` is meant to color exactly its member wells, each at its own
position (see [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md) spatial correspondence).

Group addressing does not violate the protocol vocabulary's "no named-group
construct" rule. That rule binds the PROTOCOL layer: an author cannot invent a
group by editing protocol YAML. Groups are declared on the OBJECT, and the
protocol still names one target. The object schema is what fans the write out.
See [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) "Grouped targets are listed
explicitly" and [PRIMARY_SPEC.md](../PRIMARY_SPEC.md).

## Clicking versus writing state: the distinction that gets missed

A subpart is a material area, not a click target. Subparts render as
`pointer-events: none` material overlays with no DOM hit target of their own;
the base placement (the plate, rack, or gel) is the only click target. The
subpart or group name lives inside the interaction response's
`ObjectStateChange`, not on the click. This is an architect-locked render
contract; see the
[subpart-click decision](../active_plans/decisions/subpart_click_pattern.md).

Two cases follow, and keeping them apart is what avoids the recurring
confusion:

- A group or non-discrimination subpart STATE-WRITE (for example `all_wells`, a
  column, a technique-only single lane) is correct as authored. The student
  clicks the base object; the response writes the subpart or group state; the
  material layer colors the member cells. Nothing about this needs a
  subpart-level click target.
- A discrimination-bearing subpart CLICK, where the taught skill is picking the
  correct cell among its peers (which dose in which well, which tube in the
  rack), cannot be expressed today, because subparts have no click target.
  These interactions are the held class in the
  [subpart-click decision](../active_plans/decisions/subpart_click_pattern.md),
  and giving subparts real click targets is the future architect-owned
  Direction-B work described there.

The dividing line is the taught skill, not the target shape. A subpart target
is in the held class only when picking the correct subpart is the discrimination
the protocol grades. Bulk group writes and technique-only single-subpart steps
are not.

## What this is not

Read this before proposing any change to a plate, rack, or gel. Each item below
is a wrong conclusion that a partial reading produces.

- A structured object is NOT many scene objects. Do not split a plate into
  per-well objects or place wells through the layout engine. One object, one
  placement; the wells are material areas.
- `well_plate_96.all_wells` in an `ObjectStateChange` is NOT a bug, a
  regression, or a missing placement. It is the ratified group cascade write.
  Do not flatten it to bare `well_plate_96` and do not expand it to individual
  per-well writes.
- `subpart_groups` is NOT an open escape hatch and NOT a protocol-layer
  named-group violation. It is a closed, build-validated object-schema block
  with a closed `group_kind` enum, declared on the object, consumed as one
  target by the protocol.
- A subpart click target that fails to resolve in the DOM is NOT necessarily a
  scene-placement gap. Subparts intentionally have no click target; the base
  placement is the click. A discrimination-bearing subpart click is a known
  held item, not a scene bug.
- The absence of `subpart_groups` handling under
  `src/scene_runtime/protocol/` does NOT mean the cascade is unimplemented. The
  per-subpart material rendering lives in the renderer and material layer
  (`src/scene_runtime/renderer/subpart_dispatch.ts`,
  `subpart_visual_state_renderer.tsx`).

## Reading map

| Question | Owning doc |
| --- | --- |
| How is the subpart namespace and `subpart_groups` schema declared? | [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) |
| Why are wells material areas, and what is spatial correspondence? | [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md) |
| Which render effect and target tint a subpart region? | [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md) |
| What are the closed material terms? | [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md) |
| Why does clicking hit the base object, not the subpart? | [subpart-click decision](../active_plans/decisions/subpart_click_pattern.md) |
| Where did group addressing and the cascade write originate? | [subpart-addressing recommendation](../archive/subpart_addressing_recommendation.md) |
| What are the layer-ownership and target-addressing invariants? | [PRIMARY_SPEC.md](../PRIMARY_SPEC.md), [PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md) |
