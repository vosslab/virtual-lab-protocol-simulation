# No-crop object sizing coverage audit

Status: complete (read-only)
Date: 2026-05-21
HEAD: 8795d25
Scope: every YAML under `content/objects/**` plus every YAML under
`content/base_scenes/` and `content/protocols/**`.

## TL;DR

- 78 / 78 object YAMLs are MISSING `layout.display_width_cm` (100% gap).
- 0 / 0 scene placements declare a per-placement `width_scale` override.
- The no-crop chain's fix-priority step 4 (object `display_width_cm`) has
  zero coverage in the authored YAML surface. Every object currently
  relies on either `layout.default_width` (scene-percent baseline) or
  the hardcoded `ASSET_SPECS` and `legacy_scales` fallbacks in
  TypeScript (`src/asset_specs.ts`).
- Fix-priority step 5 (scene `width_scale` overrides) has no surface to
  audit at the placement level; if a width_scale tweak is happening at
  all, it is happening in TypeScript, not in content YAML.

## Methodology

Per SCALING_MODEL.md the
authored sizing field is `layout.display_width_cm` on each object YAML
(see "How sizing works", section 1, and "Adding a new object",
section 1). The runtime converts that value to `width_scale` via:

    width_scale = (display_width_cm * px_per_cm) / (default_width * 11.52)

When a scene wants to override per-placement, it sets `width_scale`
directly in the placement entry under `scene.items[]` (per
SCENE_YAML_FORMAT.md).
SCALING_MODEL.md "Current fallback behavior" explicitly states that
objects without `display_width_cm` fall back to hardcoded `width_scale`
in scene configs (the `legacy_scales` map in TypeScript). That fallback
path bypasses the documented px_per_cm computation entirely and is the
root cause of mis-sized assets that no-crop sees as "clipped" or
"squashed".

The audit:

1. Enumerated `content/objects/*/*.yaml` (78 files).
2. For each file, checked for the literal key `display_width_cm`,
   `asset_name` (via visual_states), and `fudge`.
3. Enumerated `content/base_scenes/*.yaml` and
   `content/protocols/**/*.yaml` (82 protocol files + 19 base scenes).
4. For each, scanned placement entries for `width_scale: <value>`.
5. Cross-referenced object YAMLs against `src/asset_specs.ts`
   `ASSET_SPECS` table (asset-keyed default widths + sparse
   `widthScale` overrides).

The methodology is intentionally line-oriented; nested fields like
`visual_states.<field>.cases[].output.asset_name` are still detected by
literal-key match. The `display_width_cm` check is conservative: a true
positive requires the literal token to appear anywhere in the file.

## Coverage table: object YAMLs

| Bucket                            | Count | % of 78 |
| --------------------------------- | ----- | ------- |
| Total object YAMLs                | 78    | 100%    |
| With `layout.display_width_cm`    | 0     | 0%      |
| Without `layout.display_width_cm` | 78    | 100%    |
| With explicit `fudge` factor      | 0     | 0%      |
| With `asset_name` declaration     | 78    | 100%    |

## Coverage table: scene `width_scale` overrides

| Bucket                                 | Count |
| -------------------------------------- | ----- |
| Total scene/protocol YAMLs scanned     | 101   |
| Placement entries with `width_scale`   | 0     |
| Suspect overrides (`< 0.5` or `> 2.0`) | 0     |

Every sizing decision currently routes through `src/asset_specs.ts`
(`ASSET_SPECS`) or the layout engine's `legacy_scales` table. No
content YAML applies a per-placement size correction today.

## Cross-reference against ASSET_SPECS

`src/asset_specs.ts` carries `defaultWidth` (scene-percent units) and,
for a small subset of equipment, a `widthScale` multiplier already
baked in:

| Asset key (asset_name) | defaultWidth | widthScale (TS) |
| ---------------------- | ------------ | --------------- |
| `centrifuge`           | 14           | 1.6             |
| `water_bath`           | 16           | 1.5             |
| `incubator`            | 10           | 1.4             |
| `plate_reader`         | 12           | 1.2             |
| `cell_counter`         | 12           | 1.0             |
| `microscope`           | 8            | 0.9             |
| `vortex`               | 8            | 0.5             |

These TS-side `widthScale` values are EXACTLY the lever
`SCALING_MODEL.md` says should move into the object YAML as
`display_width_cm` (per "Current fallback behavior" and "Adding a new
object"). Until that migration lands, every clipped-equipment finding
from no-crop traces back to one of these rows.

Note: several object YAMLs reference `asset_name` keys that do NOT
appear in `ASSET_SPECS` at all (for example `coomassie_stain_bottle`,
`destain_bottle`, `running_buffer_1x_carboy`, `staining_tray`,
`heat_block_closed`, `microwave_closed`, `rocking_shaker_idle`,
`electrophoresis_tank_inner_chamber`, `gel_lane_empty`,
`hood_surface_dirty`). For these, the runtime has no asset-side
default width AND no YAML-side `display_width_cm`. They fall through
to whatever the layout engine's last-resort default is. These objects
are the highest-risk candidates for fix-step-4 crops.

## Top 5 objects most likely to cause crops (missing `display_width_cm`)

Ranking criterion: large physical extent + visible scientific glassware
or instrument body + missing both `display_width_cm` AND any
`ASSET_SPECS` entry for the rendered asset_name. These are most
exposed to fix-priority step 4.

1. `electrophoresis_tank` (asset: `electrophoresis_tank_inner_chamber`)
   -- large tank, no ASSET_SPECS row for the inner chamber variant.
2. `heat_block` (asset: `heat_block_closed`) -- bench instrument, no
   ASSET_SPECS row for the closed variant; tall lid risks bottom crop.
3. `rocking_shaker` (asset: `rocking_shaker_idle`) -- wide footprint,
   no ASSET_SPECS row; in a row-slot scene it will likely be undersized
   then stretched.
4. `mini_protean_gel` (no asset_name set at top level; rendered via
   composite states) -- no width anchor at all in either YAML or
   ASSET_SPECS.
5. `staining_tray` (asset: `staining_tray`) -- large flat tray; without
   a real width it sizes from `default_width: <small>` in YAML and
   visibly clips when liquid overlay extends past parent card.

Honorable mention: `running_buffer_1x_carboy` (carboy is taller than the
generic `bottle` baseline; falls through to a too-small slot and
collides with no-crop "bottle neck cropped" findings).

## Top 5 scene `width_scale` overrides most likely to cause crops

NONE. Zero placements set `width_scale` in any audited YAML
(0 of 101 files). Fix-priority step 5 cannot be exercised from
content alone today; any per-placement correction must currently be
made by either (a) editing `ASSET_SPECS.widthScale` in TypeScript, or
(b) adding new `width_scale` placement fields to scene YAML once
`SCALING_MODEL.md` migration starts.

If WS-A retry data names specific clipped placements, those crops are
attributable to the TS-side `widthScale` row for that asset_name
(table above), not to a YAML override.

## Citations to SCALING_MODEL.md

- "Adding a new object", step 1: every new object must declare
  `layout.display_width_cm`. Current state: 0 of 78 comply.
- "Current fallback behavior": objects without `display_width_cm` use
  hardcoded scales. Every object in this repo is on the fallback path.
- "Optional fudge factor": `fudge` exists for visual tweaks. Not used
  anywhere in current YAMLs.
- "Compatibility notes for layout scaling": items without
  `display_width_cm` "continue to work" -- but this audit shows the
  "continue to work" path is precisely where no-crop crops originate,
  because it bypasses px_per_cm normalization.

## Source files read

- SCALING_MODEL.md (full)
- OBJECT_YAML_FORMAT.md (header confirmed)
- SCENE_YAML_FORMAT.md (header confirmed)
- ethanol_bottle.yaml (sample)
- centrifuge.yaml (sample)
- micropipette_tip_box.yaml (sample)
- `asset_specs.ts` (ASSET_SPECS table)
- All 78 object YAMLs under `content/objects/`
- 19 base scenes under `content/base_scenes/`
- 82 protocol YAMLs under `content/protocols/`

## Constraints

Read-only. No YAML edits. Only this file was written.
