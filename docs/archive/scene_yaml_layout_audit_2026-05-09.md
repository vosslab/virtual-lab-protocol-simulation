# Bench/hood layout duplication audit (2026-05-09)

## Context

This doc supports Plan B / Patch B4 (WP-2.2.1) of `~/.claude/plans/sorted-kindling-swing.md`.
Plan B is migrating per-scene layout truth from TypeScript constant files into per-scene YAMLs.
Before B10 (bench migration) and B11 (hood migration) retire `src/bench_config.ts` and
`src/hood_config.ts`, every fact those files currently hold must be enumerated and routed to
exactly one of four destinations: the scene YAML, a shared runtime helper, an in-adapter
runtime helper, or deletion. B1 already classified all six scenes
(see [scene_classification_2026-05-09.md](scene_classification_2026-05-09.md)) and B2 extended
the `SceneConfig` schema with zones, items, layoutRules, accentRules, tabStops, and
wrongOrderMessage. This audit closes the loop on bench and hood specifically.

## Methodology

- Read `src/bench_config.ts` (84 lines) and `src/hood_config.ts` (139 lines) in full.
- Read `src/scenes/bench/bench.yaml` (117 lines) and
  `src/scenes/cell_culture_hood/cell_culture_hood.yaml` (329 lines) in full.
- Cross-walked every named export from each `_config.ts` against the corresponding YAML to
  classify whether the fact is already represented, partially represented, or absent.
- Used `git ls-files | xargs grep -n` to enumerate every callsite of the exported names
  outside the config files themselves so that helper functions could be classified by who
  uses them, not just by where they are declared.
- Bucket definitions follow the plan's WP-2.2.1 acceptance criteria:
  `static-decl-YAML`, `runtime-helper-shared`, `runtime-helper-adapter`, `delete-dead`.

## Bench audit table

Source key: `bc:N` = `src/bench_config.ts` line N. `by:N` = `src/scenes/bench/bench.yaml` line N.

| Fact | Source | Type / shape | Decision | Target location | Notes |
| --- | --- | --- | --- | --- | --- |
| `BENCH_BOUNDS` | `bc:28-33` | `SceneBounds` `{left, right, top, bottom}` | static-decl-YAML | `bench.yaml` `sceneBounds` (new top-level key, schema already supports under layoutRules) | Currently absent from `bench.yaml`; B10 must add. Values `{1,99,1,98}` are identical to `HOOD_BOUNDS`; consider whether `sceneBounds` should be a schema default. |
| `BENCH_ZONES.back_shelf` | `bc:40` | `ZoneDef` `{x0,x1,baseline,gap,align}` | static-decl-YAML | `bench.yaml` `zones[]` entry id=`back_shelf` | Already present at `by:101-106`; B10 deletes the TS copy. |
| `BENCH_ZONES.mid_bench` | `bc:43` | `ZoneDef` | static-decl-YAML | `bench.yaml` `zones[]` entry id=`mid_bench` | Already present at `by:107-112`; B10 deletes the TS copy. |
| `BENCH_SCENE_ITEMS[]` (10 rows) | `bc:51-63` | `SceneItem[]` (id, asset, kind, zone, priority, widthScale, label, shortLabel?, anchorY, alignStop, baselineOverride?) | static-decl-YAML | `bench.yaml` `items[]` | Already present at `by:6-98` with field rename `priority` -> `depthTier` and `asset` -> `svgAsset`. B10 deletes the TS copy and confirms the rename is intentional. See open question 1. |
| `BENCH_LAYOUT_RULES.zones` | `bc:66` | reference to `BENCH_ZONES` | delete-dead | n/a | Redundant with the top-level `zones[]` once YAML owns truth. The runtime layout helper can read zones directly from the loaded `SceneConfig`. |
| `BENCH_LAYOUT_RULES.labelFontSize` | `bc:67` | `number` (9) | static-decl-YAML | `bench.yaml` `layoutRules.labelFontSize` | Currently absent from `bench.yaml`; B10 must add. Identical to hood (9). See open question 2. |
| `BENCH_LAYOUT_RULES.labelLineHeight` | `bc:68` | `number` (1.1) | static-decl-YAML | `bench.yaml` `layoutRules.labelLineHeight` | Currently absent. Identical to hood. |
| `BENCH_LAYOUT_RULES.labelOffsetY` | `bc:69` | `number` (3) | static-decl-YAML | `bench.yaml` `layoutRules.labelOffsetY` | Currently absent. Identical to hood. |
| `BENCH_LAYOUT_RULES.sceneBounds` | `bc:70` | reference to `BENCH_BOUNDS` | delete-dead | n/a | Duplicate of the standalone `BENCH_BOUNDS` export above; only one copy survives in YAML. |
| `getBenchItemLabel(itemId)` | `bc:75-83` | `(string) => string` | runtime-helper-shared | `src/scenes/shared/scene_item_lookup.ts` (new) or extension of an existing shared helper | Identical shape to `getHoodItemLabel`. Callers: `bench.ts:119,122,125,410`. After B10, the helper should accept the loaded `SceneConfig.items[]` (or scene id) rather than importing `BENCH_SCENE_ITEMS` directly. The fallback `return itemId` is intentional for unknown ids and should be preserved. |

Bench bucket counts: 7 static-decl-YAML, 1 runtime-helper-shared, 0 runtime-helper-adapter,
2 delete-dead. (Total of 10 facts.)

## Hood audit table

Source key: `hc:N` = `src/hood_config.ts` line N. `hy:N` =
`src/scenes/cell_culture_hood/cell_culture_hood.yaml` line N.

| Fact | Source | Type / shape | Decision | Target location | Notes |
| --- | --- | --- | --- | --- | --- |
| `HOOD_BOUNDS` | `hc:19-24` | `SceneBounds` | static-decl-YAML | `cell_culture_hood.yaml` `sceneBounds` | Currently absent from the YAML; B11 must add. Values `{1,99,1,98}` are identical to `BENCH_BOUNDS`. |
| `HOOD_ZONES.back_row` | `hc:63` | `ZoneDef` | static-decl-YAML | `cell_culture_hood.yaml` `zones[]` entry id=`back_row` | Already present at `hy:305-310`; B11 deletes the TS copy. |
| `HOOD_ZONES.front_row` | `hc:66` | `ZoneDef` | static-decl-YAML | `cell_culture_hood.yaml` `zones[]` entry id=`front_row` | Already present at `hy:312-317`. |
| `HOOD_ZONES.shelf_row` | `hc:73` | `ZoneDef` | static-decl-YAML | `cell_culture_hood.yaml` `zones[]` entry id=`shelf_row` | Already present at `hy:319-324`. |
| `HOOD_SCENE_ITEMS[]` (29 rows) | `hc:81-118` | `SceneItem[]` | static-decl-YAML | `cell_culture_hood.yaml` `items[]` | Already present at `hy:7-300` with field renames `priority` -> `depthTier` and `asset` -> `svgAsset`. B11 deletes the TS copy. Includes flask `baselineOverride: 52` which the YAML preserves at `hy:48`. |
| `HOOD_LAYOUT_RULES.zones` | `hc:121` | reference to `HOOD_ZONES` | delete-dead | n/a | Redundant with top-level `zones[]`. |
| `HOOD_LAYOUT_RULES.labelFontSize` | `hc:122` | `number` (9) | static-decl-YAML | `cell_culture_hood.yaml` `layoutRules.labelFontSize` | Currently absent; B11 must add. |
| `HOOD_LAYOUT_RULES.labelLineHeight` | `hc:123` | `number` (1.1) | static-decl-YAML | `cell_culture_hood.yaml` `layoutRules.labelLineHeight` | Currently absent. |
| `HOOD_LAYOUT_RULES.labelOffsetY` | `hc:124` | `number` (3) | static-decl-YAML | `cell_culture_hood.yaml` `layoutRules.labelOffsetY` | Currently absent. |
| `HOOD_LAYOUT_RULES.sceneBounds` | `hc:125` | reference to `HOOD_BOUNDS` | delete-dead | n/a | Duplicate of standalone `HOOD_BOUNDS`. |
| `getHoodItemLabel(itemId)` | `hc:130-138` | `(string) => string` | runtime-helper-shared | `src/scenes/shared/scene_item_lookup.ts` (same module as the bench equivalent) | Callers: `cell_culture_hood.ts:612`, `render.ts:134,138,142,355,362,367,389`. Identical body to `getBenchItemLabel`; merging into one shared helper is the durable fix. The `find` calls in `render.ts:65,87,94,133,137,141` (which return the whole item, not just the label) need the same shared lookup -- they currently duplicate the search logic inline. |

Hood bucket counts: 8 static-decl-YAML, 1 runtime-helper-shared, 0 runtime-helper-adapter,
2 delete-dead. (Total of 11 facts.)

## Decisions and rationale

- **static-decl-YAML** applies when the value is a literal in TS that never changes per
  runtime state and the schema (post-B2) has a slot for it. Zone definitions, item rows,
  scene bounds, and label layout numbers all qualify. This is the largest bucket because
  Plan B's whole point is to make the YAML the single source of truth for static layout
  facts.
- **runtime-helper-shared** applies when the fact is logic (a function) that both bench and
  hood adapters need and that has no scene-specific behavior. The two `get*ItemLabel`
  helpers are byte-for-byte identical except for the array name they close over, so a
  single helper parameterized by the loaded `SceneConfig.items[]` (or by scene id) replaces
  both. Putting it under `src/scenes/shared/` matches the location convention already used
  for cross-scene helpers.
- **runtime-helper-adapter** applies when the logic is genuinely scene-specific and only
  one adapter calls it. No bench or hood fact lands here today; both helpers are clearly
  shared. The bucket is preserved in the schema in case a future fact needs it.
- **delete-dead** applies when the fact only exists to bundle other facts that the YAML
  already owns. The `LAYOUT_RULES.zones` and `LAYOUT_RULES.sceneBounds` aliases each
  duplicate the standalone exports; once YAML is the source of truth, the bundling object
  is no longer carrying any unique information and the runtime can read zones and bounds
  directly off the loaded `SceneConfig`.

## Implications for B10 / B11

- **B10 (bench migration) must:**
  - Add `sceneBounds: {left:1, right:99, top:1, bottom:98}` to `bench.yaml` at the top level
    (schema slot exists per B2).
  - Add `layoutRules: {labelFontSize:9, labelLineHeight:1.1, labelOffsetY:3}` to
    `bench.yaml`. Do not re-nest `zones` under `layoutRules`; keep zones at the top level
    where they already live.
  - Verify the existing field rename `priority` -> `depthTier` and `asset` -> `svgAsset`
    is intentional before removing the TS copy. If intentional, update the layout engine to
    read `depthTier` and `svgAsset`. (See open question 1.)
  - Delete `src/bench_config.ts` once `src/scenes/bench/bench.ts` (lines 20, 119, 122, 125,
    410, 430, 432) and `src/game_state.ts` (lines 5, 369) read from the loaded
    `SceneConfig` instead.
  - Replace `getBenchItemLabel` callsites with the shared helper landed earlier (or as part
    of B10 if order requires).

- **B11 (hood migration) must:**
  - Add `sceneBounds` and `layoutRules` to `cell_culture_hood.yaml` (same triplet of
    `labelFontSize`/`labelLineHeight`/`labelOffsetY` constants).
  - Confirm the field rename matches B10's choice and apply identically.
  - Delete `src/hood_config.ts` once `src/scenes/cell_culture_hood/cell_culture_hood.ts`
    (line 612), `src/scenes/cell_culture_hood/render.ts` (lines 9, 65, 87, 94, 133, 134,
    137, 138, 141, 142, 261, 355, 362, 367, 389), and `src/game_state.ts` (lines 8, 369)
    read from the loaded `SceneConfig`.
  - Replace `getHoodItemLabel` callsites and the inline `HOOD_SCENE_ITEMS.find(...)`
    searches in `render.ts` with the shared lookup. The `find`-then-label pattern in
    `render.ts:133-142` is a near-duplicate of the helper and can collapse into one call.

- **Shared helper module (prerequisite for both):** B10 and B11 both depend on a
  `src/scenes/shared/scene_item_lookup.ts` (or equivalent) that exposes `getSceneItemLabel`
  and `findSceneItem` parameterized by the loaded `SceneConfig`. Landing this before B10
  avoids two churn cycles. If patch ordering puts B10 first, B10 should introduce the
  shared module and route both adapters through it; B11 then has nothing to add on the
  shared side.

## Open questions

1. **Field rename `priority` -> `depthTier` and `asset` -> `svgAsset`:** the bench and hood
   YAMLs already use the new names, but `src/bench_config.ts` and `src/hood_config.ts`, the
   `SceneItem` type in `src/scene_types.ts`, and `computeSceneLayout` callsites still use
   the old names. Was this rename approved as part of B2's schema work, or is the YAML
   ahead of the TS contract? B10/B11 need a definite answer before deleting the TS copies,
   because the layout engine has to be updated in lockstep. This audit assumes the rename
   is intentional but the migration patches must verify.

2. **Schema location for label layout constants:** `labelFontSize`, `labelLineHeight`, and
   `labelOffsetY` are identical across bench and hood (9, 1.1, 3). Three options:
   (a) repeat in each scene YAML under `layoutRules` (current B2 schema slot);
   (b) hoist to a global default in the loader with per-scene overrides allowed;
   (c) leave hardcoded in the layout engine. This audit picks (a) because it keeps the YAML
   self-describing and matches how zones are already handled, but the architect should
   confirm before B10 lands.

3. **`SceneBounds` duplication:** `BENCH_BOUNDS` and `HOOD_BOUNDS` are identical and the
   schema currently slots `sceneBounds` per-scene. If every scene ends up with the same
   bounds, the per-scene field is noise; if any scene ever needs different bounds, the
   per-scene field is necessary. No scene other than bench/hood declares bounds today, so
   this is not blocking, but worth flagging to the architect during B10 review.

4. **Inline `HOOD_SCENE_ITEMS.find(...)` searches in `render.ts`:** these are not labelled
   helpers and so do not appear as separate exports from `hood_config.ts`, but they share
   the same lookup logic as `getHoodItemLabel`. Should B11 fold these into the shared
   helper, or leave them as render-time `findSceneItem(sceneConfig, itemId)` calls? This
   audit recommends the latter (a separate shared `findSceneItem` returning the full item),
   but it is a design question for the architect.
