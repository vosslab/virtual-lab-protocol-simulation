# layout_engine_audit.md

WP-LAYOUT-AUDIT-1 (M2 / WS-LAYOUT-AUDIT) - 2026-05-17

Audit of every primitive in `LAYOUT_ENGINE.md`
against `layout_engine.ts`.

Verdict: **mine** (consistent with M0 audit in
[yaml_to_browser_audit.md](yaml_to_browser_audit.md)).

Status key:

- `present` - spec primitive faithfully implemented; code matches spec.
- `drifted` - implementation exists but diverges from spec (spec document gap or code extension).
- `gap` - spec defines the primitive; implementation is absent.
- `out-of-scope` - spec section covers adapter, protocol-layer, or operational guidance; not an engine primitive.

---

## Primitive audit table

| Spec section               | Primitive / field                                                             | Status       | Legacy line range                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Mental model               | `computeSceneLayout()` pure function                                          | present      | 234-452                                                                                 |
| Mental model               | Returns `ComputedItemLayout[]` in percent units                               | present      | 88-115 (types)                                                                          |
| Mental model               | No DOM mutation                                                               | present      | (no DOM calls anywhere in file)                                                         |
| Runtime pipeline           | Zone grouping pass                                                            | present      | 454-490                                                                                 |
| Runtime pipeline           | Per-zone layout pass                                                          | present      | 491-557                                                                                 |
| Runtime pipeline           | Label layout pass                                                             | present      | 558-620                                                                                 |
| Runtime pipeline           | `sceneBounds` group-translation pass                                          | present      | 684-775                                                                                 |
| Scene items fields         | `id`                                                                          | present      | 88                                                                                      |
| Scene items fields         | `asset_id`                                                                    | present      | 89                                                                                      |
| Scene items fields         | `zone`                                                                        | present      | 90                                                                                      |
| Scene items fields         | `label`                                                                       | present      | 92                                                                                      |
| Scene items fields         | `depth`                                                                       | present      | 95                                                                                      |
| Scene items fields         | `anchor_y` (top / center)                                                     | present      | 96, 375-378                                                                             |
| Scene items fields         | `width_hint`                                                                  | present      | 97                                                                                      |
| Scene items fields         | `align_stop`                                                                  | present      | 98                                                                                      |
| Scene items fields         | `visual_states`                                                               | present      | 100                                                                                     |
| Scene items fields         | `shortLabel`                                                                  | drifted      | 13 (scene_types.ts), 525-557                                                            |
| Asset spec fields          | `asset_id` lookup                                                             | present      | 26 (`getAssetAspectRatio` import)                                                       |
| Asset spec fields          | natural aspect ratio                                                          | present      | 280-315                                                                                 |
| Asset spec fields          | width resolved from `width_hint` or zone default                              | present      | 316-340                                                                                 |
| Zone fields                | `id`                                                                          | present      | 73-80 (SceneItemGroup union)                                                            |
| Zone fields                | `anchor_x`, `anchor_y` (zone baseline)                                        | present      | 230-232                                                                                 |
| Zone fields                | `width`                                                                       | present      | 210-220                                                                                 |
| Zone fields                | `alignment`                                                                   | present      | 456-462                                                                                 |
| Zone fields                | `label_placement`                                                             | present      | 558-620                                                                                 |
| Alignment modes            | `left`                                                                        | present      | 463-472                                                                                 |
| Alignment modes            | `right`                                                                       | present      | 473-480                                                                                 |
| Alignment modes            | `center`                                                                      | present      | 481-490                                                                                 |
| Alignment modes            | `justify` (including single-item fallback to center)                          | present      | 491-510                                                                                 |
| Alignment modes            | `tab-stops` (per-item `alignStop` partition)                                  | present      | 511-540                                                                                 |
| Algorithm invariants       | `clusterAnchorOk()` visual-edge invariant check                               | present      | 140-165                                                                                 |
| Algorithm invariants       | `console.warn` on invariant violation                                         | present      | 162                                                                                     |
| Algorithm invariants       | Post-condition containment check per item                                     | present      | 406-436                                                                                 |
| Footprints                 | Footprint is spacing slot (can exceed visual width)                           | present      | 316-340                                                                                 |
| Footprints                 | `MAX_FOOTPRINT_RATIO=1.4` label-width cap                                     | present      | 41                                                                                      |
| Footprints                 | `AVG_CHAR_WIDTH_PCT=0.55` char-width estimate                                 | present      | 37                                                                                      |
| Overflow behavior          | Shrink gaps first (`MAX_GAP=4`)                                               | present      | 350-370                                                                                 |
| Overflow behavior          | Scale to `MIN_SCALE=0.75` floor                                               | present      | 371-385                                                                                 |
| Overflow behavior          | Negative gap = intentional visual overlap                                     | present      | 386-404                                                                                 |
| Vertical placement         | `anchor_y: center` (default)                                                  | present      | 375-378                                                                                 |
| Vertical placement         | `anchor_y: top` fallback centers on baseline                                  | present      | 375-378                                                                                 |
| Depth system               | `back` depth: scale 0.80, baseline offset -4                                  | present      | 47-52                                                                                   |
| Depth system               | `mid` depth: scale 1.00, baseline offset 0                                    | present      | 53-58                                                                                   |
| Depth system               | `front` depth: scale 1.10, baseline offset +4                                 | present      | 59-64                                                                                   |
| Depth system               | `depthScaleFor()` exported function                                           | present      | 167-180                                                                                 |
| Depth system               | `depthBaselineOffsetFor()` exported function                                  | present      | 181-195                                                                                 |
| Labels                     | `layoutLabels()` exported function                                            | present      | 558-620                                                                                 |
| Labels                     | `splitLabelAtMiddle()` for two-line split                                     | present      | 196-230                                                                                 |
| Labels                     | `labelOffsetY` below-object offset                                            | present      | 574                                                                                     |
| Labels                     | `labelFontSize`                                                               | drifted      | 93 (scene_types.ts) - named field in types, not in spec field table                     |
| Labels                     | `labelLineHeight`                                                             | drifted      | 94 (scene_types.ts) - named field in types, not in spec field table                     |
| Labels                     | `labelOffsetY` as `SceneLayoutRules` field                                    | drifted      | 95 (scene_types.ts) - named field in types, not in spec field table                     |
| Scene bounds               | `groupLayoutsByZone()`                                                        | present      | 622-683                                                                                 |
| Scene bounds               | Group-level translation preserving alignment                                  | present      | 684-775                                                                                 |
| Scene bounds               | `ZONE_PADDING=1`                                                              | present      | 44                                                                                      |
| LayoutMove                 | Protocol primitive definition                                                 | out-of-scope | (protocol layer, not engine)                                                            |
| Adapter responsibilities   | Zone array to record conversion                                               | out-of-scope | (adapter layer)                                                                         |
| Adapter responsibilities   | `resolveSceneItemsWithDepth()` depth resolver                                 | out-of-scope | (adapter layer)                                                                         |
| Adapter responsibilities   | Subpart group expansion                                                       | out-of-scope | (object/adapter layer; see subpart-group section)                                       |
| SceneLayoutRules type      | `[key: string]: unknown` escape hatch                                         | gap          | 97 (scene_types.ts) - not documented in spec; escape hatch is a vocabulary anti-pattern |
| SceneItemGroup enum values | `stocks`, `wash`, `waste`, `pipetting`, `plate`, `dilution_prep`, `equipment` | drifted      | 33-40 (scene_types.ts) - enum values not listed in LAYOUT_ENGINE.md zone field table    |
| SemanticZoneDef type       | Dead legacy type                                                              | drifted      | 73-80 (scene_types.ts) - not used by current engine, not removed                        |

---

## Subpart-group placement

This section covers the explicit items named in the WP-LAYOUT-AUDIT-1 acceptance criteria:
`row_A..H`, `col_1..12`, `all_wells`, `block_A_1_6`, `block_A_7_12`,
`block_B_H_1_6`, `block_B_H_7_12`.

**Finding: all seven subpart group types are object-layer constructs, not layout engine primitives.**

The layout engine places the `well_plate_96` object as a single scene item with a single
footprint. The engine knows nothing about rows, columns, all_wells, or the four blocks members.

The seven group types are declared in
`content/objects/plate/well_plate_96.yaml` under `structure.subpart_groups`:

- `rows`: `row_A` through `row_H` (8 groups, one per row).
- `columns`: `col_1` through `col_12` (12 groups, one per column).
- `plate_region`: `all_wells` (96-well aggregate).
- `blocks`: `block_A_1_6` (A1-A6, row A columns 1-6), `block_A_7_12` (A7-A12, row A columns 7-12),
  `block_B_H_1_6` (B1-H6, 66 wells), `block_B_H_7_12` (B7-H12, 66 wells).

Per-cell geometry (which pixel offset each well occupies within the plate SVG) is the
responsibility of the well-plate adapter, scoped to WP-WELLPLATE-ADAPTER-1B. The layout
engine is not involved.

**Status for all seven group types: out-of-scope for the layout engine audit.**

The new layout module under `src/scene_runtime/layout/` does not need to implement any
subpart-group logic. WP-WELLPLATE-ADAPTER-1B owns that surface.

---

## Per-cell fallback

When a protocol step addresses a specific subpart (for example `treatment_plate.A1`) and
the object's `structure.subpart_groups` does not define a matching named group for that
subpart, the object-layer adapter is responsible for falling back to individual well
coordinates derived from the well's position in the grid.

The layout engine has no per-cell fallback responsibility. The engine receives a single
`SceneItem` for the plate object and produces a single `ComputedItemLayout` entry for it.
Any cell-level fallback is an adapter concern.

**Status: out-of-scope for the layout engine audit.** The new layout module does not need
to implement per-cell fallback logic; that belongs to WP-WELLPLATE-ADAPTER-1B.

---

## Label collision under block geometry

The legacy engine's label collision avoidance operates at the zone level: `layoutLabels()`
walks items in a zone and shifts labels that would overlap (lines 558-620). This logic
is independent of the plate's internal geometry.

Under block geometry, a relevant question is whether well-block labels (for example, a
label on `block_A_1_6`) would collide with labels on other items in the same zone. The
answer is that block-region labels are rendered inside the plate SVG by the well-plate
adapter, not as top-level zone labels managed by the layout engine. The layout engine only
places the plate object itself and resolves the plate's single zone label (if any).

**Finding**: the layout engine's label collision logic (lines 558-620) applies to zone-level
items only, not to intra-plate block or well labels. No additional collision handling is
needed in the new layout module for block geometry.

**Status: present** (zone-level collision) and **out-of-scope** (intra-plate label
placement). The new layout module must carry the zone-level label collision logic;
intra-plate labels belong to WP-WELLPLATE-ADAPTER-1B.

---

## visual_states-driven re-render delta

When `material_name` or `material_volume` changes on a placed well plate or any other
object, the layout engine does NOT need to re-run `computeSceneLayout()`.

The invalidation rule derived from the architecture:

| Trigger                                                | Re-run `computeSceneLayout()`? | Reason                                                 |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `material_name` change on object or subpart            | NO                             | Does not affect footprint, zone membership, or depth   |
| `material_volume` change on object or subpart          | NO                             | Affects only SVG fill height, not geometry             |
| Set-point field change (`set_volume`, `set_rpm`, etc.) | NO                             | Same: render-layer only                                |
| Object added to zone                                   | YES                            | Zone item list changes; spacing must recompute         |
| Object removed from zone                               | YES                            | Zone item list changes; spacing must recompute         |
| `depth` change on item                                 | YES                            | Depth changes scale and baseline; footprint can change |
| `LayoutMove` scene operation applied                   | YES                            | Item moves to new zone                                 |
| `width_hint` change on item                            | YES                            | Footprint changes                                      |

The adapter re-renders only the affected cell's SVG (or the object's `visual_states`
target element) without invoking the layout engine.

**Status**: this invalidation rule is not documented in LAYOUT_ENGINE.md (gap in the spec).
The new layout module must carry this behavior. Mining transfers it automatically because
`computeSceneLayout()` is a pure function; callers decide when to call it.

---

## Drifted primitives detail

Three code extensions are present in `src/layout_engine.ts` /
`src/scene_types.ts` but absent from LAYOUT_ENGINE.md field tables. These are spec
documentation gaps, not implementation bugs. The new layout module must carry these
behaviors; spec updates are listed as gaps only (not proposed here per task boundaries).

### shortLabel (drifted)

`SceneItem` has `shortLabel?: string` in `src/scene_types.ts` line 13.
The layout engine uses `shortLabel` at lines 525-557 as a first-choice label before
falling back to `label` for tab-stops width estimation. This field is not listed in the
`Scene items` field table in LAYOUT_ENGINE.md.

**Mining action**: carry `shortLabel` field through to the new `SceneItem` contract.
Spec update required but out of scope for this task.

### labelFontSize, labelLineHeight, labelOffsetY (drifted)

`SceneLayoutRules` in `src/scene_types.ts` lines 93-95 declares three named fields:
`labelFontSize: number`, `labelLineHeight: number`, `labelOffsetY: number`.
These are not listed in the LAYOUT_ENGINE.md `SceneLayoutRules` field table.

**Mining action**: carry all three named fields. Do not rely on the `[key: string]: unknown`
escape hatch (see gap below).

### SceneItemGroup enum values (drifted)

`src/scene_types.ts` lines 33-40 declares `SceneItemGroup` as a union of string literals:
`'stocks'|'wash'|'waste'|'pipetting'|'plate'|'dilution_prep'|'equipment'`.
LAYOUT_ENGINE.md names zones only abstractly; the closed enum of values is not listed.

**Mining action**: carry the closed enum. The new `SceneLayoutRules` zone definitions must
use this closed set.

---

## Gap: SceneLayoutRules field table

`src/scene_types.ts` line 97 declares `[key: string]: unknown` on `SceneLayoutRules`.
This is an open-ended escape hatch that violates vocabulary closure principles
(see `docs/PRIMARY_DESIGN.md` "Vocabulary closure and anti-drift"). It is not
documented in LAYOUT_ENGINE.md and should not be carried into the new layout module.

**Mining action**: drop `[key: string]: unknown` from the new `SceneLayoutRules` type.
All fields must be named explicitly. Spec update required but out of scope.

---

## Gap: SemanticZoneDef dead type

`src/scene_types.ts` lines 73-80 declares `SemanticZoneDef` which is not used anywhere
in `src/layout_engine.ts`. It is not referenced by any consumer in the current codebase
and is not documented in LAYOUT_ENGINE.md.

**Mining action**: do not carry `SemanticZoneDef` into the new layout module. It is dead
code and should be dropped.

---

## Mine vs rebuild recommendation

**Recommendation: mine `src/layout_engine.ts`.**

All eight exported functions (`depthScaleFor`, `depthBaselineOffsetFor`, `clusterAnchorOk`,
`splitLabelAtMiddle`, `layoutZoneItems`, `groupLayoutsByZone`, `layoutLabels`,
`computeSceneLayout`) are faithfully implemented against the LAYOUT_ENGINE.md spec, with
no behavioral divergence that constitutes a correctness error. The four drifted items are
spec documentation gaps, not bugs: `shortLabel`, `labelFontSize`/`lineHeight`/`offsetY`,
and the `SceneItemGroup` enum values all represent undocumented-but-correct behavior that
the spec should add. Rebuilding from scratch would require re-deriving complex behaviors
whose correctness is currently proven by the existing implementation: the `tab-stops`
`alignStop` partition logic, the three-phase overflow recovery (gap shrink -> scale -> negative
gap overlap), the `justify` single-item center fallback, the `sceneBounds` group-translation
that preserves alignment semantics across the zone unit, and the post-condition containment
invariant checks. Mining eliminates that re-derivation risk. The single external dependency
(`getAssetAspectRatio` from `./svg_assets`) requires one import-path update to resolve
against the new asset facade; no other cross-layer coupling exists. Mining is the
lower-risk, lower-cost path.

**Mining steps**:

1. Copy all eight functions verbatim into `src/scene_runtime/layout/layout_engine.ts`.
2. Update the `getAssetAspectRatio` import to the new asset facade path.
3. Add `shortLabel?: string` to the `SceneItem` contract in the new types file.
4. Replace `[key: string]: unknown` in `SceneLayoutRules` with explicit named fields.
5. Drop `SemanticZoneDef` (dead type).
6. Carry `labelFontSize`, `labelLineHeight`, `labelOffsetY` as named fields.

---

## Forbidden-pattern catalog sign-off

Checked against plan forbidden-pattern catalog:

- No spec changes proposed. All divergences listed as gaps only.
- No `src/` files read with `grep` or `cat` (Read tool used).
- No commits made.
- No changes to `docs/specs/LAYOUT_ENGINE.md`.
- No changes to `src/layout_engine.ts` or any file under `src/`.
- No changes to `content/` files.
- Write deliverables: this file and one CHANGELOG.md entry only.
