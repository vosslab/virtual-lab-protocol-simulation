# Layout engine

## Overview

The layout engine places scene objects (bottles, pipettes, instruments, etc.)
into horizontally-zoned rows and emits positioned `ComputedItem` records. It
does not know lab biology, protocol meaning, click behavior, or scene-specific
rendering.

The engine runs at BUILD TIME only. `pipeline/precompute_layout.mjs` runs
`runPipeline` over every scene at canonical 16:9 (1920x1080) and emits
`generated/precomputed_layout.ts`. The production browser loads precomputed
positions via `resolvePrecomputedResult` in
`src/scene_runtime/layout/precomputed_result.ts` and never calls `runPipeline`.
Tests import the engine directly. See [CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md)
for the full file-level map.

The scene runtime is documented in [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md).
The scene YAML schema is documented in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).
Object identity (state, assets, subparts) is documented in
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) and [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md).

## Build pipeline

```text
content/base_scenes/*.yaml   +   content/protocols/.../scenes/*.yaml
  |
  v
pipeline/gen_scene_index.py  ->  generated/scenes.ts (SCENES)
  |
  v
pipeline/precompute_layout.mjs
  (imports SCENES, OBJECT_LIBRARY, ASSET_SPECS; runs runPipeline per scene)
  |
  v
generated/precomputed_layout.ts  (PRECOMPUTED_LAYOUT: per-scene { final: ComputedItem[] })
  |
  v
production browser: resolvePrecomputedResult(scene_name, scene)
  ->  PipelineResult  ->  renderScene()
```

## Production render path

```typescript
// protocol_host.tsx (simplified)
const scene_name = resolve_entry_scene_name(config, PROTOCOLS);
const scene = SCENES[scene_name];
const result = resolvePrecomputedResult(scene_name, scene);
renderScene(root, result);
```

`resolvePrecomputedResult` loads `PRECOMPUTED_LAYOUT[scene_name].final`, wraps
it in a `PipelineResult`, and passes it to the renderer. A missing entry throws.
No `runPipeline` call path ships in the production bundle.

## Source module seams

The layout engine is structured into four seams under
`src/scene_runtime/layout/`. See [CODE_ARCHITECTURE.md](../CODE_ARCHITECTURE.md)
for file-level details.

- `geometry/` - Pure 2D AABB geometry core. Immutable `Vector` and `Aabb` value
  types. `detectCollision` returns a rich `Collision` fact;
  `buildResolutionCandidate` proposes the cheaper-axis correction.
  Geometry is pure and stateless; placement phases own all mutation.
- `config/` - `LayoutConfig` resolution by fixed precedence: global defaults,
  scene `layout_rules`, zone overrides, placement-derived values, then
  strategy-local values. Stages read every tunable through `LayoutConfig` rather
  than importing constants directly.
- `diagnostics/` - Severity-graded typed diagnostics keyed by severity (Error /
  Warning / Review-required) and likely owner. Error-severity codes fail the
  build. Per-scene decision metadata (selected strategy, packer trigger/result,
  shrink applied, rows created, resolved config) is emitted separately from the
  diagnostic stream.
- `strategies/` - `PlacementStrategy` seam with two implementations.
  `row_strategy.ts` is the default. The overflow packer (`pack_strategy.ts`)
  engages only when a row would shrink below the configured threshold or overflow;
  it preserves primary-object scale and input order before maximizing area.

`phases.ts` holds the phase registry. `runPipeline` drives named phases:
`prepare -> resolve-metadata -> measure -> partition -> place-horizontal ->
place-vertical -> place-labels -> resolve-collisions -> validate -> report`,
with explicit read/mutate boundaries and a bounded deterministic convergence loop.
The former `clamp_scene_bounds` step is now a validation phase (`validate_bounds`),
not a silent fix.

## When to use the layout engine

Use it when the scene is made of lab objects arranged in physical rows or zones:
benches, hoods, shelves, equipment racks, storage areas, pipette stations.

Do not use it for structured scientific surfaces where individual subpart
positions or fills matter: 96-well plate grids, microtube racks (if tube fills
matter), microscope fields, plate-reader tables, gel lanes, graphs, or
instrument control panels. Use a custom geometry renderer for those surfaces.
The surrounding loose objects may still use the layout engine.

## Zones

A zone is a horizontal row-like placement area with x bounds (`x0`, `x1`), a
vertical baseline, a minimum gap, and an alignment mode.

Alignment modes:

| Mode        | Placement rule                                                                   |
| ----------- | -------------------------------------------------------------------------------- |
| `left`      | First item visual left edge is flush with the padded left edge.                  |
| `right`     | Last item visual right edge is flush with the padded right edge.                 |
| `center`    | Cluster visual midpoint is centered in the padded zone.                          |
| `justify`   | First and last visual edges are pushed to both padded edges.                     |
| `tab-stops` | Items partitioned by `align_stop` into left, center, and right sub-clusters.     |

Zones represent meaningful physical regions. Avoid creating a zone for every
item; use `tab-stops` when one row has left, center, and right clusters.

The engine applies zone padding internally (`x0 + ZONE_PADDING .. x1 - ZONE_PADDING`).
Scene authors do not pre-subtract padding in YAML.

## Overflow

When items do not fit, the engine shrinks gaps then scales footprints and visual
widths down to the configured minimum. If content is still too large, negative
gaps (visible overlap) are permitted as an intentional failure mode. Fix
overflow by moving objects to a new zone, using tab stops, or reducing
`width_scale` for secondary objects.

## Vertical placement

Vertical placement starts from the zone baseline. Baseline precedence:

1. `item.baseline_override` if present.
2. `zone.baseline + depthBaselineOffsetFor(item.depth)`.

Depth states:

| Depth   | Scale | Baseline offset | Meaning                                  |
| ------- | ----- | --------------- | ---------------------------------------- |
| `back`  | 0.80  | -4              | Parked farther back, smaller and higher. |
| `mid`   | 1.00  | 0               | Normal working position.                 |
| `front` | 1.10  | +4              | Active or pulled forward.                |

Anchor modes:

| `anchor_y` | Placement rule                                              |
| ---------- | ----------------------------------------------------------- |
| `bottom`   | Object bottom sits on the baseline.                         |
| `tip`      | Object tip sits on the baseline, adjusted by `anchor_y_offset`. |
| `top`      | Engine fallback centers the object vertically around the baseline. |

## Adding a new layout-driven scene

1. Create the scene YAML under `content/base_scenes/<name>.yaml`.
2. Define `items` with stable ids, `asset_name`, `zone`, `depth_tier`,
   `width_scale`, `label`, and `anchor_y`.
3. Define `zones` with `id`, `x0`, `x1`, `baseline`, `gap`, and `align`.
4. Add any missing `ASSET_SPECS` entries in `generated/object_library.ts`
   (via `content/objects/` YAML and `pipeline/gen_object_library.py`).
5. Re-run `bash pipeline/build_generated.sh` and then `pipeline/precompute_layout.mjs`
   to regenerate `generated/precomputed_layout.ts`.
6. Type-check with `npx tsc --noEmit -p tsconfig.json`.
7. Save screenshot evidence at laptop and desktop viewports.
8. If the scene participates in a protocol, run the relevant Playwright walker.

## Tuning order

1. Zone geometry (`x0`, `x1`, `baseline`).
2. Item zone membership.
3. `align` and `align_stop`.
4. Asset `default_width` (if the global asset size is wrong everywhere).
5. Item `width_scale` (if the asset size is only wrong in this scene).
6. Renderer-level label suppression for dense, secondary items.
7. `baseline_override` only for exceptional visual-contact fixes.

Avoid changing engine constants for a single scene; constants affect every
layout-driven scene.

## Verification

For layout code or scene YAML changes:

```bash
npx tsc --noEmit -p tsconfig.json
bash build_github_pages.sh
```

Then save screenshot evidence at laptop and desktop viewports. A passing type
check proves the layout code compiles; screenshot evidence proves visual
correctness. If the scene participates in a protocol, also run the relevant
Playwright walker.

## Layout invariant: no clipping or distortion

Canonical home: [../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md).

The layout engine must size containers to fit their placed objects' natural aspect ratios. A container that clips or distorts its placed asset is a layout failure regardless of bbox-level metrics. This rule applies even if precheck reports `hard_fail_count = 0`.

Forbidden in any rendered scene:

- Cropped bottoms of volumetric flasks
- Cropped bottle necks or caps
- Clipped pipette tips
- Hidden instrument edges
- Object artwork cut off by cards, regions, wrappers, `overflow: hidden`, or `.object-graphic` containers
- Squashing or stretching that changes the intended asset aspect ratio

Diagnostic requirement:

- The `artwork_integrity` check must compare the rendered asset bbox against its parent placement card and flag overflow clipping plus aspect-ratio deviation > 5%.
- Visible clipping is HARD FAIL.
- Aspect distortion is HARD FAIL for lab glassware, pipettes, plates, and instruments; advisory for decorative items.

Fix direction (not a substitute for the rule):

- Use `object-fit: contain`, never `cover`.
- Preserve SVG `preserveAspectRatio="xMidYMid meet"`.
- Remove parent `overflow: hidden` where it clips assets.
- Size cards around assets, not assets into too-small cards.
- Add `min-height` / `min-width` for tall glassware cards.

Anti-patterns (forbidden):

- Do not "fix" cropping by hiding cropped assets, deleting DOM, or weakening diagnostics.
- Do not accept a high score if the asset is visibly cropped.
- Do not claim visual success while glassware bottoms are cut off.

## Verification

For documentation-only edits, no runtime test is required. For code or scene
YAML changes that affect layout:

```bash
source source_me.sh && python3 tools/build_scene_data.py
npx tsc --noEmit -p src/tsconfig.json
```

Then save screenshot evidence at laptop and desktop viewports. A passing type
check proves the layout code compiles; it does not prove the scene is visually
correct. If the scene participates in a protocol, also run the relevant
Playwright walker or scene-specific smoke test.

## Compile-time model and known limitations

The layout engine now runs at build time, not in the browser. The sections above
describe the algorithm; this section records the current model and its known
limitations so authors know what the engine does and does not do today.

Current model:

- Compile-time layout. `pipeline/precompute_layout.mjs` runs the engine over every
  scene at a canonical 16:9 viewport (1920x1080) and emits
  `generated/precomputed_layout.ts` (one `ComputedItem[]` per scene). The production
  browser path loads those precomputed positions and renders them inside an exact 16:9
  letterbox; resizing the window changes only the letterbox bars and the uniform scale
  factor, never the scene-internal composition. 16:9 is the single compiled contract; an
  alternate aspect ships as a separate authored scene variant, not as per-viewport reflow.
- Pure 2D geometry core. `src/scene_runtime/layout/geometry/` provides immutable
  `Vector` and `Aabb` value types plus an AABB collision detector that returns a rich
  `Collision` fact and a `ResolutionCandidate` (cheaper-axis correction, x-first tie-break).
  Geometry is pure and proposes corrections; only placement phases mutate positions.
- Declarative config. `src/scene_runtime/layout/config/` resolves a `LayoutConfig` by a
  fixed precedence (global defaults -> scene `layout_rules` -> zone overrides ->
  placement-derived -> strategy-local) with distinct label and object spacing keys. Stages
  read every tunable through `LayoutConfig` rather than importing constants directly.
- Placement strategies. `src/scene_runtime/layout/strategies/` exposes a
  `PlacementStrategy` seam; `row_strategy.ts` is the default and an overflow packer engages
  only when a row would shrink below the configured threshold or overflow, preserving
  primary-object scale and input order before maximizing area. Object placement stays 1D
  row footprint; same-tier de-overlap is deferred (see below).
- Phase registry. `run_pipeline.ts` runs named phases (`prepare -> resolve-metadata ->
  measure -> partition -> place-horizontal -> place-vertical -> place-labels ->
  resolve-collisions -> validate -> report`) with explicit read/mutate boundaries and a
  bounded, deterministic convergence loop. The former `clamp_scene_bounds` step is now a
  validation phase (`validate_bounds`), not a silent fix.
- Severity-graded diagnostics. `src/scene_runtime/layout/diagnostics/` emits typed
  diagnostics keyed by severity (Error / Warning / Review-required) and likely owner.
  Error-severity codes fail the build; Warnings and Review-required surface in the report
  and allow success. Per-scene decision metadata (selected strategy, packer trigger/result,
  shrink applied, rows created, resolved config) is emitted separately from the diagnostic
  stream.

Known limitations:

- Same-depth-tier object de-overlap is not implemented. Objects in the same `depth_tier`
  are placed as 1D row footprints and are not pushed apart by 2D geometry. Cross-tier
  overlap is preserved on purpose as authored z-layering. M7 evidence found no genuine
  same-tier real-asset overlap that harms composition, so this work (M8) stays deferred and
  evidence-gated (see
  [m8_same_tier_overlap_evidence.md](../active_plans/reports/m8_same_tier_overlap_evidence.md)).
- Authored per-zone strategy and per-item priority are not exposed in YAML. The strategy
  and shrink priority are derived (kind, footprint, `placement_name` tiebreak); a closed
  authored-enum surface is the deferred M9 RFC.
- Label placement resolves label-label and label-vs-artwork overlaps to zero for feasible
  scenes; an infeasible scene emits an `unresolved_label_overlap` Error with an actionable
  payload rather than silently clamping. A label clear of overlaps but far from its anchor
  is a `poor_label_alignment` Warning, not an error.
- Overall visual polish (composition, pedagogy, plausibility) is judged by a layered review
  -- typed diagnostics, the rendered bbox stats as a regression signal, an AI visual-polish
  reviewer over before/after screenshots, and human review for appeals -- not by any single
  score. The bbox scorecard is a regression detector, not the optimization target.

## Related docs

- [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) - Runtime scene driver,
  registry, adapter, and capability model.
- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) - Scene YAML fields and build
  pipeline.
- [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) - Canonical scene terms.
- [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) - Canonical object terms;
  asset metrics like `default_width` migrate here in the follow-on plan.
- [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) - Object-definition YAML
  schema referenced by scene placements.
- [SVG_PIPELINE.md](SVG_PIPELINE.md) - SVG asset generation and ownership.
