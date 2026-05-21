# Expected data attributes

Every `data-*` attribute the spike-rendered DOM must carry, with type and an
example value. The closed schema this table reflects is NEW1 plan section 4
(see
[../../../docs/active_plans/new1_css_native_layout_integration_plan.md](../../../docs/active_plans/new1_css_native_layout_integration_plan.md)).

## Required data attributes

| Attribute | Carried on | Type | Example value | Source (manifest field) |
| --- | --- | --- | --- | --- |
| `data-region` | `.region` | enum string (closed region vocabulary) | `work_surface` | derived from `placements[].region` plus the fixed five-region region set |
| `data-placement-name` | `.placement` | snake_case string | `zoom_well_plate_96` | `placements[].placement_name` |
| `data-object-name` | `.placement` | snake_case string | `well_plate_96` | `placements[].object_name` |
| `data-primary` | `.placement` (only when true) | bool literal `"true"` | `true` | `placements[].primary` |

## Open questions: template attributes NOT in the closed schema

The NEW0 reference template
[../templates/well_plate_96_zoom.html](../templates/well_plate_96_zoom.html)
uses additional attributes that the NEW1 closed schema does not name. They
are listed here as questions for the spike author, not propagated into the
spike DOM contract.

| Template attribute | Carried on | Question |
| --- | --- | --- |
| `data-scene-mode` (value `composition`) | `.scene-container` | Is scene-mode a runtime concern, or a NEW0-only visual flag? NEW1 schema has no `scene_mode` field. Resolve before spike. |
| `data-placement` (duplicate of `data-placement-name`) | `.placement` | NEW0 template emits both `data-placement` and `data-placement-name`. The closed schema names only `placement_name`. Drop the duplicate or canonicalize on one name. |
| `footprint--zoom-view` (class on `.object-graphic`) | `.placement > .object-graphic` | Footprint class is not in the NEW1 schema's `placements[]` shape. Is footprint a render-time derivation from `region` + `primary`, or a missing schema field? Decide before spike. |
| `scene-mode--detail` (class on `.scene-container`) | `.scene-container` | Same question as `data-scene-mode`. Render-time class, or schema field? Not propagated yet. |

## Forbidden attributes

The NEW1 schema (section 4) denylists coordinate fields. The spike DOM must
emit none of the following as authored data attributes:

`data-x`, `data-y`, `data-bounds`, `data-align`, `data-offset`,
`data-depth`, `data-width`, `data-height`, `data-coords`, `data-position`,
`data-transform`.

Computed layout values that the browser derives via CSS Grid (for example,
`getBoundingClientRect()` results) are not authored attributes and are not
covered by this denylist; the denylist is about author-controlled inputs,
not browser-computed geometry.
