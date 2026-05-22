# Round 3 A3 alias map justification

Read-only cost/benefit analysis: would adding a semantic-name -> asset-name
alias map in the SVG resolver reduce churn versus the current pattern of
renaming `asset_name` inside each object YAML?

Feeder evidence:

- [round3_asset_alias_verification.md](round3_asset_alias_verification.md)
  (B1 audit: 30 problem objects, no alias map today, literal
  `SVG_<UPPER>` lookup).
- [round3_placeholder_asset_replacement.md](round3_placeholder_asset_replacement.md)
  (R2: 4 yaml edits applied, 12 bottle-family edits deferred).

## Current pattern

Single resolution path in `src/scene_runtime/render/svg_loader.ts`:

```
yaml asset_name: foo  ->  SVG_FOO  ->  generated/svg_assets/foo.ts
```

No alias table, no fallback rename. Mismatch yields the green-rect
fallback in `scene.ts`.

Fix shape today: edit `asset_name:` field(s) inside the offending object
YAML to a snake_case basename that matches a real
`assets/equipment/<basename>.svg`.

## Cost: yaml renames so far and projected

R2 applied edits (single-field-per-yaml shape):

- `content/objects/bottle/pbs_bottle.yaml` (2 case lines).
- `content/objects/pipette/micropipette.yaml` (15 case lines, split
  empty / filled).
- `content/objects/pipette/p10_micropipette.yaml` (7 case lines).
- `content/objects/pipette/p200_micropipette.yaml` (7 case lines).

R2 yaml file count: 4. R2 case-line edits: 31 (multiple cases per file
when the visual_states block fans out by material).

A1B (bottle family) not yet executed; report does not exist. R2 deferred
12 bottle-family objects, each documented as a single-field rename in
the B1 audit table.

Projected total yaml renames to clear all 30 B1 problem objects, using
the B1 "safe-fix recommendation" column as the work estimate:

| Class | Object count | Per-object yaml edits | Notes |
| --- | --- | --- | --- |
| Bottle family rename to `bottle` / variant | 12 | 1-2 case lines | pbs_bottle done; 12 remain |
| Pipette empty/filled split | 3 | 7-15 case lines | all done in R2 |
| Tube family rename (conical, microtube, mtt) | 5 | 2-3 case lines | semantic decision per object |
| Equipment state-collapse rename (centrifuge, vortex, water_bath, incubator, microscope, plate_reader) | 6 | 2 case lines each | each forfeits a state distinction (idle/spin etc.) until new SVGs exist |
| Larger-work blocks (well_plate_96, gel_cassette, electrode_module, electrophoresis_tank, hood_surface, label_pen, staining_tray split) | 7 | n/a -- needs new SVGs or schema change | not solvable by rename |

Net: roughly 26 of the 30 problem objects are reachable by single-field
yaml rename. Each rename touches 1 yaml file.

## Alternative: alias map in resolver

Shape under consideration: a hand-edited TS table inside
`src/scene_runtime/render/svg_loader.ts` (or a sibling
`svg_aliases.ts`) keyed by semantic asset_name, valued by the real
SVG basename that should be loaded in its place.

```ts
// svg_aliases.ts (hypothetical)
export const SVG_ALIASES: Record<string, string> = {
  pbs_bottle: "bottle",
  ethanol_bottle: "ethanol_spray",
  trypan_blue_bottle: "bottle",
  dmso_bottle: "bottle",
  // ... 26 entries to clear the safe-fix set
};
```

The resolver consults the alias map before falling through to the
literal `SVG_<UPPER>` lookup. Authors then leave the yaml semantic names
in place and the resolver redirects.

## Cost comparison

| Axis | Current pattern (yaml renames) | Alias map |
| --- | --- | --- |
| Files edited per fix | 1 yaml | 1 alias entry (one shared TS file) |
| Edit unit | per case line in visual_states | per object name |
| Semantic name preserved in yaml | NO (yaml says `bottle`, not `pbs_bottle`) | YES (yaml keeps `pbs_bottle`) |
| Discoverability | High (the yaml describes what it loads) | Low (need to read alias map to know real SVG) |
| Indirection layers | 1 (yaml -> SVG_const) | 2 (yaml -> alias -> SVG_const) |
| Future contributor cost | Standard yaml inspection | Must know about the alias layer |
| Generated artifact churn | None beyond existing svg_globals regen | None |
| Breaks on rename of real SVG | Yaml-side edit | Alias-map-side edit |
| Per-state granularity (empty / filled) | Naturally supported (each case names its own SVG) | Loses granularity unless alias map keys include state |
| Audit story | Grep yaml for asset_name | Grep yaml + grep alias map |
| Test surface | Existing yaml validators | Alias map needs its own test (no orphan keys, no cycles) |

Critical asymmetry: the alias map cannot express the
`empty -> p10_micropipette_empty` / `filled -> p10_micropipette_filled`
case-by-case split. R2's three pipette fixes are inherently per-case
yaml edits, not single-name aliases. The alias map only helps when an
object has exactly ONE target SVG regardless of state. That intersects
the bottle family (12 objects) and the tube family (5 objects); it
mostly does NOT help equipment-state and pipette-state objects.

Adjusted reach: alias map clears 12 + 5 = 17 of the 30 objects in one
file; remaining 13 still need yaml edits. Versus current pattern that
clears 26 of 30 via yaml edits with the same per-object cost.

## Recommendation

REJECT alias map. Keep the current pattern.

Reasons:

1. The alias map is not strictly cheaper. Bottle and tube objects each
   have 1-2 case lines, so a per-object yaml rename is one line of edit
   anyway. The alias entry is also one line. No leverage.
2. The alias map cannot express state-dependent SVG selection (the
   empty / filled split). The pipette fixes -- which were the highest-
   value R2 wins -- are unreachable through an alias-only path.
3. Adding an indirection layer makes the yaml less self-describing. A
   reader of `pbs_bottle.yaml` today sees `asset_name: bottle` and
   knows exactly which SVG renders. With an alias map they see
   `asset_name: pbs_bottle` and must consult a second file to learn the
   real artwork.
4. The alias map adds a new failure mode (alias points to a missing
   SVG; alias collides with a real basename; alias cycles) that needs
   its own test. The current pattern's only failure mode is "yaml
   names a missing basename," which the green-rect fallback already
   surfaces visibly.
5. Future asset-rich work (per-state SVGs for centrifuge_spinning,
   water_bath_heating, gel_lane_sample) WILL need yaml-side per-case
   asset_name anyway. An alias map would be a stopgap that has to be
   undone once the real SVGs land.
6. Vocabulary closure principle ([PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md))
   prefers explicit fields over hidden indirection layers. An alias map
   is a hidden cross-layer behavior of the kind the design spec warns
   against.

## Hybrid option considered and rejected

A minimal alias map keyed only on the bottle-family `*_bottle` ->
`bottle` collapse was considered as a smaller pilot. Rejected because:

- The bottle family will not stay collapsed long-term. Curriculum work
  is likely to author per-reagent bottle SVGs (`pbs_bottle.svg`,
  `dmso_bottle.svg`) once the bottle color sidecar gets per-asset
  overrides. An alias map installed now would have to be unwired then.
- The bottle-family yaml renames take 12 single-line edits, which is
  smaller than the alias-map TS file + test + doc bringup cost.

## Evidence summary

- Current pattern resolves 26 of 30 problem objects via 1-2 case-line
  yaml edits per object.
- Alias map resolves at most 17 of 30 problem objects via 1 entry per
  object.
- Pipette state splits (R2 wins) are not expressible as aliases.
- No existing alias map test infrastructure; introducing one adds
  surface area.
- Yaml-side semantics keep the object file self-describing.

## Risks of NOT adding an alias map

- Yaml semantic names get watered down (`pbs_bottle` yaml has
  `asset_name: bottle`, losing the reagent specificity in the most
  obvious read-site). Mitigated by: yaml `object_name`, `display_name`,
  and `material_name` fields still carry the reagent semantics. The
  asset_name field is correctly an artwork pointer, not a semantic
  label.
- Future migration to per-reagent SVGs requires 12 yaml edits to
  swap back. Mitigated by: each edit is the same one-line shape as the
  original rename, and grep-discoverable.

## Risks of ADDING an alias map (rejected path)

- New indirection layer to learn for every contributor.
- New failure mode (orphan key, cycle, name collision with real basename).
- Locks future per-reagent SVG authoring behind alias-map undo.
- Conflicts with vocabulary closure principle.

## Keep / Reject

REJECT. Do not add an alias map. Continue the current per-yaml
`asset_name` rename pattern. Future per-state and per-reagent artwork
work will need yaml-side fields anyway; the existing pattern already
supports that.

## Verification commands

- python3 tests/check_ascii_compliance.py -i docs/active_plans/reports/round3_a3_alias_map_justification.md
- pytest tests/test_markdown_links.py -q
