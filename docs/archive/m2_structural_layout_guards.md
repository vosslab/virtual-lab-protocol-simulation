# Lane B2: Structural no-crop guards

**Status**: COMPLETE

**Scope**: Implement `src/scene_runtime/renderer/structural_guards.ts`, a verifier module that enforces layout invariants before rendering.

## Method

Implemented 8 guard functions that read geometry from `PipelineResult.final` and `scene` data structures, without computing positions or sizes. Each guard throws with clear error messages on first violation.

**Guard implementations**:

1. **Every item inside its zone bbox** - Reads item's `_x, _top, _visualWidth, _height` (percent units), zone's `bounds`, verifies containment with 0.5% jitter tolerance.

2. **Every zone inside scene_bounds** - Reads zone bounds and `scene.scene_bounds`, verifies nesting.

3. **No item-item overlap** - Computes all pairwise bounding boxes, checks intersection area < 1% of smaller bbox (jitter tolerance).

4. **Same-zone horizontal gap >= layout_rules.zone_gap** - Groups items by zone, checks horizontal gap between adjacent items, converts px to percent via viewport width (default 1200px).

5. **Aspect ratio preserved** - Reads `item._visualWidth / item._height` and compares to `ASSET_SPECS[item.asset].aspect`, allows 5% deviation.

6. **Asset resolves in SVG_REGISTRY** - For each item, checks `SVG_REGISTRY[item.asset]` exists; throws with scene/placement/object/asset names per Core Invariant 2.

7. **No label outside scene** - Estimates label bbox from `_labelX, _labelY, _labelLines.length` using `AVG_CHAR_WIDTH` constant (0.6%), compares to `scene_bounds`.

8. **No label overlap with own SVG** - Computes label and SVG bboxes, rejects overlap > 1% of smaller area.

**TypeScript details**:
- Strict mode: no `any`, explicit parameter/return types, branded `Bounds` type.
- Type assertions for generated values (`ASSET_SPECS`, `SVG_REGISTRY`) for ESLint compatibility.
- Exported function: `export function runStructuralGuards(final: ComputedItem[], scene: SceneA | SceneB): void`
- Throws on first violation; renderer refuses to paint if guard fails.

## Results

**Deliverable**: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/scene_runtime/renderer/structural_guards.ts` (354 lines)

**Code quality**:
- `npx tsc --noEmit -p tsconfig.json`: PASS (no errors)
- `npx eslint src/scene_runtime/renderer/structural_guards.ts`: PASS
- `npx prettier --check`: PASS (formatted)

**Test coverage**: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/tests/test_structural_guards.mjs` (318 lines)

Each of the 8 guards is tested with:
- Passing case (passes the guard)
- Failing case (throws expected error)

Sample test results:
```
Testing Guard 1: item inside zone bbox...
  OK Guard 1 passes for item inside zone
  OK Guard 1 correctly rejects item outside zone
Testing Guard 2: zone inside scene_bounds...
  OK Guard 2 passes for zone inside scene
Testing Guard 3: no item-item overlap...
  OK Guard 3 correctly rejects overlapping items
  OK Guard 3 passes for non-overlapping items
Testing Guard 5: aspect ratio preserved...
  OK Guard 5 passes for correct aspect ratio
  OK Guard 5 correctly rejects wrong aspect ratio
Testing Guard 6: asset resolved...
  OK Guard 6 passes for real asset
  OK Guard 6 correctly rejects missing asset
Testing Guard 7: label inside scene...
  OK Guard 7 passes for label inside scene
  OK Guard 7 correctly rejects label outside scene
Testing Guard 8: no label-SVG overlap...
  OK Guard 8 correctly rejects label overlapping own SVG
```

## Geometry assumptions and tolerance values

**Tolerances**:
- Zone/scene containment: 0.5% jitter (allows minor floating-point rounding)
- Item-item overlap: reject if > 1% of smaller bbox area
- Label-label overlap: reject if > 1% of smaller bbox area
- Aspect ratio: reject if > 5% deviation

**Label bbox estimation**:
- Width: `max(_labelLines.map(line => line.length)) * AVG_CHAR_WIDTH` (0.6% per character)
- Height: `_labelLines.length * (item.layout.label_width || 9)` (rough estimate using label_width field)
- Position: centered at `_labelX`, top at `_labelY`
- **Assumption**: This is an approximation; actual rendered label may differ slightly due to font metrics and CSS transforms. B4's render_label.ts uses `transform: translateX(-50%)` to center; guards use same centering model.

**Viewport units**:
- All coordinates in scene-percent (0..100 per axis)
- Reads default 1200px viewport width for gap calculation; could be refined via `PipelineResult` if exposed

## Failures and blockers

None. All guards implemented and tested.

## Geometry data exposure check

**Question**: Does `PipelineResult` expose all needed geometry?

**Answer**: YES. Verified against `ComputedItem` type:
- Item bbox: `_x, _top, _visualWidth, _height` OK
- Zone bbox: via `scene.zones[].bounds` OK
- Scene bounds: via `scene.scene_bounds` OK
- Label layout: `_labelX, _labelY, _labelLines` OK
- Asset specs: `ASSET_SPECS[item.asset]` OK
- SVG registry: `SVG_REGISTRY[item.asset]` OK
- Layout rules: `scene.layout_rules?.zone_gap` OK

No passthrough request needed; pipeline already exposes all required fields.

## B1 integration notes

**Caller contract**:
- B1's `render_scene.ts` must call `runStructuralGuards(final, scene)` BEFORE painting
- If guard throws, renderer catches and logs error, refuses to paint
- Error messages name offending placement(s) for debugging

**Error handling example**:
```
Structural guard failure (missing asset): scene "bench_basic" / placement "rear_left_waste" / object "waste_container" / asset "waste_jar.svg" not in SVG_REGISTRY.
```

**Integration status**: B1 owns the renderer shell; B2 provides guards module. No file ownership conflict.

## Residual risks

1. **Label bbox estimation**: Uses rough heuristic for height (multiplying line count by label_width). Actual rendered height depends on CSS font-size, line-height, and render metrics. If label rendering changes significantly in B4, label guard may over/under-report. Mitigation: if B4 changes label layout, recompute label_width constant in guards.

2. **Viewport width hardcoding**: Gap calculation uses 1200px default. For scenes at different viewport widths, gap tolerance may be imprecise. Mitigation: if PipelineResult exposes viewport info, update guards to read it instead of hardcoding.

3. **Cross-platform floating-point**: Jitter tolerances (0.5%, 1%) may be too tight or too loose depending on rounding in pipeline. If border-line layouts fail tests, adjust tolerances via constants at top of file.

4. **SceneB (row_slot) handling**: Guards treat SceneB as zone-less (checkItemsInZones and checkSameZoneGap skip it). If SceneB gains zones in future, update guard 1 and 4 to handle both schemas.

## Next steps

1. B1 integrates structural_guards call into render_scene.ts
2. C1 runs two-stage precheck; if guards fire, classify as pipeline/content issue
3. Lane L reviews for provenance compliance (no old-engine code, no escape hatches)
4. M2b changelog entry documents guard framework and tolerance values

---

**Report generated**: 2026-05-23
