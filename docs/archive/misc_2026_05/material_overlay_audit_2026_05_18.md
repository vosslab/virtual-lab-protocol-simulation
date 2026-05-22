# Material overlay audit: base-asset + anchor-gap inventory

Audit date: 2026-05-18
Produced by: WP-AUDIT-1 (M1 of docs/active_plans/material_overlay_vocabulary.md)

This document is the deliverable for WP-AUDIT-1. It lists every object YAML
that uses liquid-fill variant pairs, proposes the base `asset_name` after
collapse, records whether a base SVG exists on disk, records whether that SVG
carries both `anchor_liquid_clip` and `anchor_liquid_bounds`, and includes
M2-coder notes.

A second section records the future runtime contract this plan freezes.
A third section tallies anchor-authoring work by visual shape, for use by
WS-ANCHORS.

---

## Section 1: Per-object audit table

Legend for "has anchors" column:
- YES = both `anchor_liquid_clip` and `anchor_liquid_bounds` present
- CLIP_ONLY = `anchor_liquid_clip` present, `anchor_liquid_bounds` missing
- BOUNDS_ONLY = `anchor_liquid_bounds` present, `anchor_liquid_clip` missing
- NO = neither present
- N/A = base SVG does not exist on disk (author first, then anchor)

### Bottles

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/bottle/bme_bottle.yaml` | `bme_bottle` | NO | N/A | Variant pair: `bme_bottle_empty` / `bme_bottle_filled`. Both variant SVGs exist. Author `bme_bottle.svg` from either variant. |
| `content/objects/bottle/coomassie_recycle_bottle.yaml` | `coomassie_recycle_bottle` | NO | N/A | Variant pair: `coomassie_recycle_bottle_empty` / `coomassie_recycle_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/coomassie_stain_bottle.yaml` | `coomassie_stain_bottle` | NO | N/A | Variant pair: `coomassie_stain_bottle_empty` / `coomassie_stain_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/ddh2o_bottle.yaml` | `ddh2o_bottle` | NO | N/A | Variant pair: `ddh2o_bottle_empty` / `ddh2o_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/destain_bottle.yaml` | `destain_bottle` | NO | N/A | Variant pair: `destain_bottle_empty` / `destain_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/destain_waste_bottle.yaml` | `destain_waste_bottle` | NO | N/A | Variant pair: `destain_waste_bottle_empty` / `destain_waste_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/laemmli_4x_bottle.yaml` | `laemmli_4x_bottle` | NO | N/A | Variant pair: `laemmli_4x_bottle_empty` / `laemmli_4x_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/media_bottle.yaml` | `media_bottle` | NO | N/A | Variant pair: `media_bottle_empty` / `media_bottle_filled`. Neither variant SVG exists on disk (both in missing_targets.json). |
| `content/objects/bottle/mtt_solution_bottle.yaml` | `bottle` | YES (see note) | BOUNDS_ONLY | Uses generic `bottle_empty` / `bottle_filled`. Collapse target is `assets/equipment/bottle.svg`, which already exists but has only `anchor_liquid_bounds`, NOT `anchor_liquid_clip`. Open question from plan confirmed: one shared base SVG is the intended outcome. WS-ANCHORS must add the `anchor_liquid_clip` clipPath to `bottle.svg`. |
| `content/objects/bottle/pbs_bottle.yaml` | `pbs_bottle` | NO | N/A | Variant pair: `pbs_bottle_empty` / `pbs_bottle_filled`. Neither variant SVG exists on disk. |
| `content/objects/bottle/recycle_buffer_bottle.yaml` | `recycle_buffer_bottle` | NO | N/A | Variant pair: `recycle_buffer_bottle_empty` / `recycle_buffer_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/running_buffer_10x_bottle.yaml` | `running_buffer_10x_bottle` | NO | N/A | Variant pair: `running_buffer_10x_bottle_empty` / `running_buffer_10x_bottle_filled`. Both variant SVGs exist. |
| `content/objects/bottle/running_buffer_1x_carboy.yaml` | `running_buffer_1x_carboy` | NO | N/A | Three-case fan-out: `empty` and `running_buffer_1x` both map to `running_buffer_1x_carboy_empty` / `running_buffer_1x_carboy_filled` (ddh2o also maps to filled). Both variant SVGs exist. Collapse target is `running_buffer_1x_carboy`. |

### Conical tubes (in bottle/ directory)

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/bottle/conical_15ml.yaml` | `conical_15ml` | NO | N/A | Variant pair: `conical_15ml_empty` / `conical_15ml_filled`. Neither variant SVG exists on disk. `falcon_15ml.svg` exists and has `anchor_liquid_bounds` only; `falcon_50ml.svg` and `falcon_50ml_new.svg` both have full anchors. `conical_15ml.svg` must be authored (or derived from falcon family); anchors needed. |
| `content/objects/bottle/protein_ladder_tube.yaml` | `protein_ladder_tube` | NO | N/A | Variant pair: `protein_ladder_tube_empty` / `protein_ladder_tube_filled`. Both variant SVGs exist. |
| `content/objects/bottle/protein_sample_tube.yaml` | `protein_sample_tube` | NO | N/A | Variant pair: `protein_sample_tube_empty` / `protein_sample_tube_filled`. Both variant SVGs exist. Multiple non-empty materials all resolve to `_filled`. |
| `content/objects/bottle/microtube.yaml` | `microtube` | NO | N/A | Variant pair: `microtube_empty` / `microtube_filled`. Both variant SVGs exist (`microtube_empty.svg`, `microtube_filled.svg`). Multiple non-empty materials all resolve to `_filled`. |

### Flasks

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/flask/t75_flask.yaml` | `t75_flask` | YES | YES | Five-case fan-out: `empty` / `media` / `pbs` / `trypsin` / `cell_suspension` each maps to a distinct named variant (all missing from disk). `assets/equipment/t75_flask.svg` exists and has BOTH `anchor_liquid_clip` and `anchor_liquid_bounds`. This is the only bottle/flask class object with a fully-anchored base SVG ready for YAML rewrite. WS-YAML can rewrite this immediately after WP-AUDIT-1 lands. |
| `content/objects/flask/t75_flask_new.yaml` | `t75_flask` | YES | YES | Identical fan-out to `t75_flask.yaml`. Same base asset `t75_flask`. No additional SVG work needed; this YAML can share the same base as `t75_flask`. |

### Pipettes

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/pipette/p10_micropipette.yaml` | `p10_micropipette` | NO | N/A | `held_material_name` variant pair: `p10_micropipette_empty` / `p10_micropipette_filled`. Both variant SVGs exist. No base `p10_micropipette.svg` on disk. |
| `content/objects/pipette/p200_micropipette.yaml` | `p200_micropipette` | NO | N/A | `held_material_name` variant pair: `p200_micropipette_empty` / `p200_micropipette_filled`. Both variant SVGs exist. No base `p200_micropipette.svg` on disk. |
| `content/objects/pipette/micropipette.yaml` | `micropipette` | NO | N/A | `held_material_name` variant pair: `micropipette_empty` / `micropipette_filled`. Neither variant SVG exists on disk (both in missing_targets.json). |
| `content/objects/pipette/multichannel_pipette.yaml` | `multichannel_pipette` | YES | NO | `held_material_name` variant pair: `multichannel_pipette_empty` / `multichannel_pipette_filled`. Both variant SVGs exist. `assets/equipment/multichannel_pipette.svg` exists but has NO liquid anchors. WS-ANCHORS must add both anchor rects. |
| `content/objects/pipette/aspirating_pipette.yaml` | `aspirating_pipette` | YES | NO | `held_material_name` variant pair: `aspirating_pipette_empty` / `aspirating_pipette_filled`. Neither variant SVG exists (both in missing_targets.json). `assets/equipment/aspirating_pipette.svg` exists but has NO liquid anchors. WS-ANCHORS must add both anchor rects. |
| `content/objects/pipette/serological_pipette.yaml` | `sero_pipette` (recommended; or rename `sero_pipette.svg` -> `serological_pipette.svg`) | YES (as `sero_pipette.svg`) | YES | `held_material_name` variant pair: `serological_pipette_empty` / `serological_pipette_filled`. Neither variant SVG exists on disk. `sero_pipette.svg` exists with BOTH anchors. Decision needed: rename `sero_pipette.svg` to `serological_pipette.svg` via `git mv` (cleanest), or rewrite the YAML to reference `sero_pipette`. Recommend rename. |

### Plate (subpart)

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/plate/well_plate_96.yaml` | `well` | NO | N/A | Subpart `visual_states` with `applies_to: subpart`. Variant pair: `well_empty` / `well_filled`. Neither exists on disk. `well_plate_24.svg` and `96well_pcr_plate.svg` are full-plate SVGs, not individual-well SVGs. WS-ANCHORS must author `well.svg` as a minimal circular/rectangular well shape with both anchor rects. |

### Equipment (dual-chamber)

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/equipment/electrophoresis_tank.yaml` | `electrophoresis_tank_inner_chamber` (inner) and `electrophoresis_tank_outer_chamber` (outer) | NO for either chamber base | N/A | The tank has two independent `material_name` + `material_volume` pairs. `assets/equipment/electrophoresis_tank.svg` exists (the complete-tank SVG) but carries no liquid anchors and is not a per-chamber base. Two new base SVGs must be authored, one per chamber. Each needs both anchor rects. The existing `electrophoresis_tank.svg` can serve as a visual reference. |

### Waste

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/waste/waste_container.yaml` | `waste_container` | YES | YES | Variant pair: `waste_container_empty` / `waste_container_filled`. Multiple non-empty materials resolve to `_filled`. `assets/equipment/waste_container.svg` exists and has BOTH `anchor_liquid_clip` and `anchor_liquid_bounds`. Ready for YAML rewrite immediately. |
| `content/objects/waste/biohazard_decant.yaml` | `waste_container` | YES | YES | Currently uses `waste_container_empty` / `waste_container_filled` as its variants. After collapse the base is the same shared `waste_container.svg`. Anchors present. Ready for YAML rewrite. |
| `content/objects/waste/biohazard_decant_bin.yaml` | `waste_container` | YES | YES | Same as `biohazard_decant`: uses `waste_container_empty` / `waste_container_filled`. Shared base. Ready for YAML rewrite. |
| `content/objects/waste/sharps_container.yaml` | `sharps_container` | NO | N/A | Variant pair: `sharps_container_empty` / `sharps_container_filled`. Neither exists on disk. Note: `material_volume` composite block uses `composite: []` (empty), not `fill_height(...)`, so the validator rule (pairs `material_volume fill_height(...)` with `material_name`) will not flag this object. It is technically out of scope for the vocabulary-error gate but included here because it follows the same `_empty`/`_filled` naming smell. |

### Rack (subpart with conical-tube reference)

| Object YAML | Proposed base asset_name | Base SVG on disk | Has anchors | M2 notes |
| --- | --- | --- | --- | --- |
| `content/objects/rack/conical_15ml_rack.yaml` | `conical_15ml` | NO | N/A | Subpart `visual_states` with `applies_to: subpart`. Variant pair: `conical_15ml_empty` / `conical_15ml_filled`. Same collapse target as `conical_15ml.yaml` above. Once `conical_15ml.svg` is authored and anchored, both the standalone YAML and the rack subpart YAML can be rewritten in the same WP-YAML-1 patch. |

---

## Section 2: Future runtime contract

This section records the authoring convention and generator/runtime boundary
that this plan freezes. It is normative for M2 coders; the spec docs
(WP-DOCS-1) will canonicalize these rules in `docs/specs/MATERIAL_CONVENTION.md`
and `docs/specs/OBJECT_VOCABULARY.md`.

### Bare anchor ids (authored in SVG)

Every base SVG that serves a liquid-fill container must carry two bare-id
anchor elements, added by the art author (WS-ANCHORS), NOT pre-prefixed:

```xml
<clipPath id="anchor_liquid_clip">
  <rect id="anchor_liquid_bounds" ... />
</clipPath>
```

The `anchor_liquid_bounds` rect defines the interior region of the container
where liquid can appear (x, y, width, height in the SVG coordinate space).
The `anchor_liquid_clip` clipPath element wraps that rect so the runtime can
clip the liquid fill to the container interior.

Authors never type the `<asset_name>__` prefix. Only bare ids are authored.

### Generator / runtime namespacing

At composition time the generator (and the future TypeScript runtime composite
handler) is responsible for rewriting the bare ids to namespaced forms:

```
anchor_liquid_clip   ->  <asset_name>__anchor_liquid_clip
anchor_liquid_bounds ->  <asset_name>__anchor_liquid_bounds
```

This prevents id collisions when multiple container SVGs are composed into
the same scene DOM. The `src/svg_overlays.ts:91 createLiquidOverlay`
function (dead reference code) shows the intended interface:
`equipmentId + level + color + svgString -> overlay SVG`.

### Overlay color: material_name to display_color lookup

The runtime resolves overlay color from `material_name` via the
`display_color` field in the material registry
(`docs/specs/MATERIAL_CONVENTION.md`). The protocol YAML and object YAML
never encode a color directly. The author only names the material; the
runtime looks up its display color.

### Overlay level: fill_height formula

The overlay fill level is computed from:

```yaml
material_volume:
  kind: composite
  formula: fill_height(state(material_volume), capacity_ml=<N>)
```

The `fill_height` function maps the current `material_volume` state value to
a fractional height in the range [0.0, 1.0]. The runtime clips the liquid
fill rect to that fraction of the `anchor_liquid_bounds` height.

### Empty sentinel: overlay skipped

When `material_name == empty` OR `material_volume == 0`, the runtime skips
the liquid overlay entirely and renders the base SVG unchanged. The
`empty` case in `visual_states.material_name.cases` points to the same
base asset as every non-empty case; no separate empty-state SVG is needed.

### No live-runtime probe

There is no live TypeScript runtime today. This plan prepares vocabulary,
assets, and the validator gate. The runtime composite handler is owned by
a separate in-flight plan. Browser evidence for overlay rendering is
deferred to that plan.

---

## Section 3: Anchor-authoring work tally by shape

This section groups the base SVGs that need anchor authoring by visual
shape similarity, so WS-ANCHORS can decide where a
`tools/_temp_inject_liquid_anchors.py` helper script pays off versus where
an Inkscape-per-SVG pass is the right choice.

### Group A: Wide-body screw-cap bottles (13 objects, similar shape)

Objects: `bme_bottle`, `coomassie_recycle_bottle`, `coomassie_stain_bottle`,
`ddh2o_bottle`, `destain_bottle`, `destain_waste_bottle`, `laemmli_4x_bottle`,
`media_bottle`, `pbs_bottle`, `recycle_buffer_bottle`,
`running_buffer_10x_bottle`, `running_buffer_1x_carboy`, and `bottle`
(shared base for `mtt_solution_bottle`).

Visual shape: wide-body reagent bottle with shoulder taper and screw cap,
similar to the existing `bottle.svg` geometry. The variant SVGs on disk
(`bme_bottle_empty.svg`, etc.) show the same proportions. The interior
fill region is a tall rectangular body below the shoulder.

`bottle.svg` already exists and has `anchor_liquid_bounds` but is missing
`anchor_liquid_clip`. Adding the clipPath wrapper to `bottle.svg` is a
one-element edit. For the 12 objects that need a new base SVG authored
from scratch (or derived from the corresponding variant), the
`_temp_inject_liquid_anchors.py` script would: (a) take an existing
`_empty` variant as input, (b) compute the `anchor_liquid_bounds` rect from
the largest interior path bounding box, and (c) inject the clipPath + rect
pair. All 13 share enough visual structure that one parameterized script
call per bottle is feasible.

Recommendation: build `tools/_temp_inject_liquid_anchors.py` for this group.
Expected payoff: 13 SVG files handled with a single script invocation loop
rather than 13 manual Inkscape sessions.

### Group B: Tall conical tubes (4 objects, similar cylindrical profile)

Objects: `conical_15ml` (used by both `conical_15ml.yaml` and
`conical_15ml_rack.yaml`), `protein_ladder_tube`, `protein_sample_tube`,
`microtube`.

Visual shape: tall narrow conical or cylindrical tubes (Eppendorf /
Falcon family). The `falcon_15ml.svg` and `falcon_50ml_new.svg` on disk
already have anchor rects and serve as shape references. `falcon_50ml_new.svg`
has both anchors correctly placed.

`conical_15ml.svg` does not exist on disk; it must be authored (likely
derived from `falcon_15ml.svg` or the `conical_15ml_empty.svg` variant).
`protein_ladder_tube.svg`, `protein_sample_tube.svg`, and `microtube.svg`
also do not exist; each can be derived from its corresponding `_empty` variant.

Recommendation: The `_temp_inject_liquid_anchors.py` script can handle this
group if the bottle group script generalizes to "find the tallest interior
path, compute bounding box, inject rect." Manual Inkscape is acceptable
as a fallback given only 4 files.

### Group C: Micropipettes (5 objects, each distinct profile)

Objects: `p10_micropipette`, `p200_micropipette`, `micropipette`,
`multichannel_pipette`, `aspirating_pipette`, `serological_pipette` /
`sero_pipette`.

Shape: Each pipette kind has a distinct visual profile (barrel length,
tip shape, channel count). `sero_pipette.svg` and `aspirating_pipette.svg`
already exist; `sero_pipette.svg` has both anchors. `aspirating_pipette.svg`
and `multichannel_pipette.svg` exist but have no anchors.

`p10_micropipette.svg`, `p200_micropipette.svg`, `micropipette.svg`, and
`serological_pipette.svg` (or a rename decision from `sero_pipette.svg`)
do not exist as base files. Each needs to be authored from the corresponding
`_empty` variant.

Recommendation: manual Inkscape pass for each pipette (6 files, each
visually distinct). The interior fill region for a pipette is the barrel /
tip area, which requires visual judgment to place correctly. A script is
unlikely to generalize well across the different barrel geometries.

Note: the `serological_pipette` vs `sero_pipette` naming decision must be
resolved before WS-ANCHORS starts on this group. If `sero_pipette.svg` is
renamed to `serological_pipette.svg` (via `git mv`), its existing anchors
transfer with it and no anchor work is needed for that object. The YAML
rewrite then points at `serological_pipette`.

### Group D: Well subpart (1 object, purpose-built geometry)

Object: `well` (subpart of `well_plate_96`).

The well SVG must be authored as a small circular or square sub-element
sized to fit within a 96-well plate grid cell. No existing on-disk well
SVG can be reused directly. This is the most novel authoring task in the
set.

Recommendation: manual Inkscape authoring. The anchor bounds rect for
a well is simply the circular interior of the well. One new SVG file,
`assets/equipment/well.svg`.

### Group E: Waste containers (1 shared base, already anchored)

Objects: `waste_container`, `biohazard_decant`, `biohazard_decant_bin` all
share `waste_container` as their collapse target.

`assets/equipment/waste_container.svg` already has both
`anchor_liquid_clip` and `anchor_liquid_bounds`. No anchor work needed for
this group.

### Group F: Electrophoresis tank chambers (2 new base SVGs, manual)

Objects: `electrophoresis_tank` inner and outer chambers.

Two new base SVGs must be authored:
`electrophoresis_tank_inner_chamber.svg` and
`electrophoresis_tank_outer_chamber.svg`. Use `electrophoresis_tank.svg`
as a visual reference; the anchor rects must cover each chamber's interior
region independently. The two chambers have different capacities (800 ml
inner, 500 ml outer) and likely different aspect ratios. Manual Inkscape
pass required.

### Summary table

| Group | Description | Count | Base SVG exists? | Anchors present? | Approach |
| --- | --- | --- | --- | --- |
| A | Wide-body screw-cap bottles | 13 | 1 of 13 (bottle.svg, partial) | 1 partial (bounds only) | Script candidate |
| B | Tall conical tubes | 4 | 0 of 4 | 0 | Script or manual |
| C | Micropipettes (all kinds) | 6 | 2 of 6 (aspirating, multichannel) | 1 of 6 (sero_pipette.svg if renamed) | Manual Inkscape |
| D | Well subpart | 1 | 0 of 1 | 0 | Manual Inkscape |
| E | Waste containers (shared) | 3 objects, 1 SVG | 1 of 1 | YES (both) | No work needed |
| F | Electrophoresis chambers | 2 new SVGs | 0 of 2 | 0 | Manual Inkscape |

Total SVGs needing anchor authoring: approximately 23 (13 bottles + 4 tubes +
3 pipette base SVGs without anchors + 1 well + 2 chamber SVGs).
Of these, Group A and B (17 SVGs) are candidates for a single injection
script. Group C, D, F (6 SVGs) require manual Inkscape passes.

---

## Open question from plan: resolved in audit

The plan asked: "does `mtt_solution_bottle.yaml` confirm one shared `bottle.svg`
as the collapse target?" Confirmed YES. `mtt_solution_bottle.yaml` already
references `bottle_empty` / `bottle_filled` (generic names). The collapse
target is the existing `assets/equipment/bottle.svg`. Multiple bottle
objects sharing one base SVG is the intended outcome per
`docs/specs/SVG_PIPELINE.md` reuse rules.

## Open question from plan: serological_pipette vs sero_pipette

`serological_pipette.yaml` references `serological_pipette_empty` /
`serological_pipette_filled` (both missing). `assets/equipment/sero_pipette.svg`
exists with both anchors. Decision options:

1. WS-YAML renames `asset_name` references in the YAML to `sero_pipette`
   (matching the existing file). No SVG work needed.
2. WS-ANCHORS runs `git mv sero_pipette.svg serological_pipette.svg`. YAML
   collapse target becomes `serological_pipette`. No anchor work needed.

Option 2 is cleaner (object name matches asset name). Recommend option 2.
Decision owner: M2 WS-ANCHORS coder on first pass.
