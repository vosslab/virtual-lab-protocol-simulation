# Layout pipeline specification

Single-source spec for the scene-YAML → 2D layout pipeline. Designed for
consumption by an AI coding agent porting from JS to TypeScript, or by
a human implementing against the same contract.

- **Companion docs in the repo**: `docs/specs/LAYOUT_ENGINE.md`,
  `docs/specs/SCENE_VOCABULARY.md`, `docs/specs/SCENE_YAML_FORMAT.md`,
  `docs/specs/SCENE_INHERITANCE.md`, `docs/specs/OBJECT_VOCABULARY.md`,
  `docs/specs/SCALING_MODEL.md`, `docs/specs/MATERIAL_CONVENTION.md`.
- **Reference implementation in this project**: `pipeline.jsx` (pure JS,
  no DOM dependencies, direct TS port). All sections below cite the
  function names used there so the two stay in lockstep.
- **Target file in repo**: `src/scene_runtime/layout/layout_engine.ts`.

## 0. Contract

1. The pipeline is a composition of ten pure functions.
2. No global state, no DOM dependencies, no side effects.
3. Inputs: scene YAML (parsed), object library, asset specs, viewport,
   per-workspace `px_per_cm` constants. Optional base-scene registry.
4. Output: `{ scene, sourceScene, stages, final, diagnostics }`. `final`
   is an ordered list of `ComputedItem` records; `diagnostics` is an
   ordered list of structured records the host (validator or runtime UI)
   surfaces.
5. Errors are returned, not thrown, at runtime. Validator-time checks
   (unknown object_name, unknown row_name, multi-level extends, cycles,
   locked-field mutations, duplicate placement_name) **throw** in the
   validator entry point and never reach the runtime pipeline.

## 1. Type signatures

```typescript
// ── Inputs ──────────────────────────────────────────────────────

type Workspace =
  | "bench" | "hood" | "microscope"
  | "incubator" | "plate_reader" | "cell_counter";

type AlignMode = "left" | "right" | "center" | "justify" | "tab-stops";
type AlignStop = "left" | "center" | "right";
type AnchorY   = "bottom" | "tip" | "top";     // "top" is fallback only
type Depth     = "back" | "mid" | "front";
type Kind     =
  | "plate" | "bottle" | "flask" | "pipette"
  | "rack" | "waste" | "equipment" | "decoration";

interface Bounds { left: number; right: number; top: number; bottom: number; }

interface SceneBoundsRect extends Bounds {}

interface Zone {
  id: string;
  bounds: Bounds;
  align?: AlignMode;        // default: "left"
  baseline?: number;        // default: midpoint of bounds.top..bounds.bottom
  label?: string;
}

interface LayoutHint {
  default_width: number;          // scene-percent
  label_width?: number;           // scene-percent (default 8)
  anchor_y?: AnchorY;             // default "bottom"
  anchor_y_offset?: number;       // scene-percent; only consumed when anchor_y === "tip"
  width_scale?: number;           // legacy authored scale; fallback when display_width_cm absent
  display_width_cm?: number;      // CANONICAL authored size, per SCALING_MODEL.md
  fudge?: number;                 // optional final multiplier
}

interface ObjectDef {
  object_name: string;
  kind: Kind;
  label: string;
  asset: string;                  // resolves to ASSET_SPECS[asset]
  capabilities: Capability[];
  layout: LayoutHint;
  // visual_states + state_fields exist on the object but are out of
  // pipeline scope; see Section 11.
}

interface AssetSpec {
  default_width: number;
  label_width: number;
  aspect: number;                 // w / h of the SVG viewBox
}

// ── Authored scene shapes ──────────────────────────────────────

interface PlacementAuthored {
  placement_name: string;
  object_name: string;
  zone: string;
  depth_tier?: number;            // sort order within zone; default 0
  align_stop?: AlignStop;         // only meaningful in tab-stops zones
  baseline_override?: number;     // rare per-placement override
  depth?: Depth;                  // manual override; normally runtime
  layout?: Partial<LayoutHint>;   // instance overrides (layout hints only)
}

// Schema A: zone + bounds
interface SceneA {
  scene_name: string;
  workspace: Workspace;
  capabilities: string[];
  scene_bounds: SceneBoundsRect;
  background?: { asset: string; bounds?: Bounds };
  zones: Zone[];
  placements: PlacementAuthored[];
  layout_rules?: LayoutRules;
  wrong_order_message?: { template: string; toast_duration_ms?: number };
  // Inheritance keys (protocol-scoped scenes only)
  extends?: string;
  add_placements?: PlacementAuthored[];
  reposition_placements?: Array<Pick<PlacementAuthored, "placement_name"> &
                                Partial<PlacementAuthored>>;
  deactivate_placements?: Array<{ placement_name: string }>;
  remove_placements?: Array<{ placement_name: string }>;
}

// Schema B: row + slot (coordinate-free)
interface SceneB {
  scene_name: string;
  workspace: Workspace;
  capabilities: string[];
  background?: { asset: string; bounds?: Bounds };
  rows: Array<{
    row_name: string;             // must exist in WORKSPACE_ROW_LIBRARY[workspace]
    slots: Array<{
      placement_name: string;
      object_name: string;
      depth_tier?: number;
      align_stop?: AlignStop;
      layout?: Partial<LayoutHint>;
    }>;
  }>;
  scene_bounds?: SceneBoundsRect;       // optional; defaults applied if absent
  layout_rules?: LayoutRules;
  wrong_order_message?: { template: string; toast_duration_ms?: number };
}

interface LayoutRules {
  zone_gap?: number;              // default 2
  label_font_size?: number;       // default 9
  label_line_height?: number;     // default 1.1
  label_offset_y?: number;        // default 4 (scene-%)
  default_align_stop?: AlignStop; // default "center"
}

// ── Pipeline intermediate + final shapes ───────────────────────

interface BoundPlacement extends PlacementAuthored {
  kind: Kind;
  label: string;
  asset: string;
  capabilities: Capability[];
  aspect: number;
  layout: Required<LayoutHint>;
}

interface ScaledPlacement extends BoundPlacement {
  _width_scale: number;
  _scale_source: "cm_model" | "fallback_authored" | "fallback_no_workspace" | "skipped_error";
  _px_per_cm: number | null;
}

interface ComputedItem extends ScaledPlacement {
  _scale: number;                 // residual horizontal-overflow scale (≥ MIN_SCALE)
  _x: number;                     // center x in scene-%
  _y: number;                     // baseline y in scene-% (anchor point)
  _top: number;                   // top y in scene-%
  _visualWidth: number;
  _height: number;
  _footprint: number;             // horizontal slot in scene-%
  _labelX: number;
  _labelY: number;
  _labelLines: string[];
  _clamped?: boolean;             // true if scene_bounds shifted this item
}

interface Diagnostic {
  stage: "normalize" | "inheritance" | "bind" | "scale" | "group"
       | "horizontal" | "vertical" | "labels" | "clamp" | "meta";
  severity: "error" | "warn" | "info";
  kind: DiagnosticKind;
  // Optional context:
  placement_name?: string;
  object_name?: string;
  row?: string;
  zone?: string;
  workspace?: string;
  dx?: number; dy?: number;
  overflow_pct?: number;
  between?: [string, string];
  items?: number;
  passes_used?: number;
  unresolved?: number;
}

type DiagnosticKind =
  | "unknown_row"                    // normalize: row_name not in workspace library
  | "unknown_object"                 // bind: object_name not in library
  | "unknown_workspace"              // scale: no px_per_cm for workspace
  | "unknown_zone"                   // group: placement.zone not in zones[]
  | "zone_overflow_negative_gap"     // horizontal: zone overloaded past MIN_SCALE
  | "tab_stop_overflow"              // horizontal: tab-stop buckets collide
  | "item_escapes_zone_vertically"   // vertical: top/bottom escapes zone bounds > 3%
  | "label_collision_residual"       // labels: nudge couldn't separate two labels
  | "zone_clamped_to_bounds"          // clamp: scene_bounds shifted a zone group
  | "max_iterations_reached";         // meta: convergence loop exhausted (§4.5)

interface PipelineResult {
  scene: SceneA;                  // post-normalize (always Schema A)
  sourceScene: SceneA | SceneB;
  diagnostics: Diagnostic[];
  stages: {
    inputs:       { scene: SceneA|SceneB; library: ObjectLibrary; assets: AssetSpecs };
    normalized:   { scene: SceneA; source: "row_slot"|"zone_bounds"; trace: NormalizeTrace[] };
    inheritance:  { placements: PlacementAuthored[]; operations: InheritanceOp[]; provenance: { name: string; from: "base"|"own" }[] };
    bound:        BoundPlacement[];
    scaled:       ScaledPlacement[];
    grouped:      { groups: Map<string, ScaledPlacement[]>; orphans: ScaledPlacement[] };
    horizontal:   Map<string, ComputedItem[]>;
    vertical:     Map<string, ComputedItem[]>;
    labelled:     Map<string, ComputedItem[]>;
    clamped:      Map<string, ComputedItem[]>;
  };
  final: ComputedItem[];
}
```

## 2. Constants (closed)

| Constant | Value | Source |
|---|---|---|
| `ZONE_PADDING` | `1.5` (scene-%) | Engine shrinks each zone's bounds inward before laying out. |
| `MIN_SCALE` | `0.55` | Lower bound for residual horizontal-overflow scale. |
| `MAX_FOOTPRINT_RATIO` | `2.5` | Cap on how much a long label can expand an item's footprint past visual width. |
| `MAX_LAYOUT_PASSES` | `3` | Convergence-loop iteration budget for Stages 6–10 (see §4.5). |
| `LAYOUT_SHRINK_FACTOR` | `0.9` | Uniform `_width_scale` multiplier applied to items in zones that overflowed last pass. Aspect-preserving by construction. |
| `PX_PER_SCENE_PERCENT` | `11.52` | Empirical: 1280-px viewport × 90% usable / 100. Used by Stage 5 scaling math. |
| `AVG_CHAR_WIDTH_PCT` | `0.6` | Per-char width estimate (scene-%) used in label-wrap budget. |
| `DEFAULT_VIEWPORT` | `{ w: 1920, h: 1080 }` | Default render viewport. Other ratios are valid. |
| `DEPTH_SCALE` | `{ back: 0.80, mid: 1.00, front: 1.10 }` | Visual width multiplier per depth state. |
| `DEPTH_BASELINE_OFFSET` | `{ back: -4, mid: 0, front: +4 }` (scene-%) | Vertical baseline shift per depth state. |
| `WORKSPACE_PX_PER_CM` | `{ bench: 3.2, hood: 8, microscope: 8, incubator: 6, plate_reader: 8, cell_counter: 8 }` | Per-workspace content-density dial. |
| `DEFAULT_SCENE_BOUNDS` | `{ left: 1, right: 99, top: 5, bottom: 95 }` | Applied when row_slot YAML omits scene_bounds. |
| `DEFAULT_LAYOUT_RULES` | `{ label_font_size: 9, label_line_height: 1.1, label_offset_y: 4, zone_gap: 2 }` | **Canonical** layout-rule defaults. Applied to both Schema A and Schema B scenes when `layout_rules` is absent. Matches every shipped base scene. |

## 3. Workspace row library

Schema B (row+slot) requires a closed library of named rows per workspace.
Authors using row_slot pick `row_name` from this enum; no coordinates.

```typescript
const WORKSPACE_ROW_LIBRARY: Record<Workspace, Array<{
  row_name: string;
  bounds: Bounds;
  align: AlignMode;
  baseline: number;
}>> = {
  bench: [
    { row_name: "rear_reagents",  bounds: { left:  5, right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_supplies",  bounds: { left:  5, right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_bench",     bounds: { left:  5, right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_imaging",   bounds: { left:  5, right: 95, top: 10, bottom: 35 }, align: "center",    baseline: 32 },
    { row_name: "work_surface",   bounds: { left: 10, right: 80, top: 45, bottom: 75 }, align: "center",    baseline: 72 },
    { row_name: "tools",          bounds: { left: 80, right: 95, top: 55, bottom: 80 }, align: "center",    baseline: 78 },
    { row_name: "gel_staging",    bounds: { left:  5, right: 95, top: 80, bottom: 95 }, align: "tab-stops", baseline: 93 },
  ],
  hood: [
    { row_name: "rear_reagents",  bounds: { left:  5, right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "work_surface",   bounds: { left: 10, right: 80, top: 45, bottom: 75 }, align: "center",    baseline: 72 },
    { row_name: "tools",          bounds: { left: 80, right: 95, top: 55, bottom: 80 }, align: "center",    baseline: 78 },
  ],
  microscope: [
    { row_name: "instrument_row", bounds: { left: 15, right: 85, top: 20, bottom: 70 }, align: "center", baseline: 65 },
  ],
  cell_counter: [
    { row_name: "instrument_row", bounds: { left: 15, right: 85, top: 15, bottom: 55 }, align: "center", baseline: 50 },
    { row_name: "accessory_row",  bounds: { left: 25, right: 75, top: 65, bottom: 90 }, align: "center", baseline: 85 },
  ],
  incubator:    [],   // populate when needed
  plate_reader: [],
};
```

**Rule.** Adding a new `row_name` for a workspace requires a code edit
to this constant, not a YAML edit. This is the entire reason row_slot
authoring stays disciplined.

## 4. The ten stages

Stages 1–5 are **identity resolution**, run once. Stages 6–10 are
**placement and fit**, run inside a convergence loop (see §4.5).

Each stage is a pure function. Pre/post conditions name the diagnostic
kinds the stage may emit. Validator-time errors (which throw before
reaching runtime) are listed separately.

### Stage 1 · Inputs

**Signature**

```typescript
type PipelineInputs = {
  scene: SceneA | SceneB;
  library: ObjectLibrary;          // Record<object_name, ObjectDef>
  assets: AssetSpecs;              // Record<asset_name, AssetSpec>
  viewport?: { w: number; h: number };
  baseSceneMap?: Record<string, SceneA>;
  workspacePxPerCm?: Record<Workspace, number>;
  rowLibrary?: typeof WORKSPACE_ROW_LIBRARY;
};
```

**Job.** Resolve dependencies; supply defaults. No computation here.

### Stage 2 · Schema normalize

**Function.** `normalizeSchema(scene, rowLibrary?) -> NormalizedScene`

**Job.** Detect input schema. Schema B → expand each row into a `Zone`
via `WORKSPACE_ROW_LIBRARY[scene.workspace]`; assign `depth_tier` from
slot index when not authored. Schema A → passthrough.

**Output invariant.** `result.scene.zones` and `result.scene.placements`
are both present and well-formed. `result.scene.scene_bounds` is
present (Schema A authors required to write it; Schema B falls back to
`DEFAULT_SCENE_BOUNDS`). `result.scene.layout_rules` is populated by
merging authored values over `DEFAULT_LAYOUT_RULES` — **applied on
both Schema A and Schema B paths**.

**Diagnostics**

- `unknown_row` (error) — `row.row_name` not in
  `WORKSPACE_ROW_LIBRARY[scene.workspace]`. The row is dropped.

**Validator-time errors (throw).** None — unknown row is recoverable at
runtime as "row dropped." In strict validator mode, throw on
`unknown_row` too.

### Stage 3 · Resolve inheritance

**Function.** `resolveInheritance(scene, baseSceneMap?) -> InheritanceResolution`

**Job.** If `scene.extends` is set, look up the base in `baseSceneMap`,
then apply the four operations in **this fixed order**:

1. `remove_placements`
2. `deactivate_placements`
3. `reposition_placements`
4. `add_placements`

Each operation selects an inherited placement by `placement_name`.
Tag every output placement with `_from: "base" | "own"`.

**Validator-time errors (throw).**

- `extends` references unknown base scene.
- `extends` chain length > 1 (no transitive inheritance).
- `placement_name` referenced by `deactivate_placements` or
  `reposition_placements` after being removed by `remove_placements`.
- New `placement_name` in `add_placements` collides with surviving
  base names.
- `reposition_placements` entry attempts to mutate a locked field
  (anything outside `zone`, `depth_tier`, `align_stop`, `layout`,
  `baseline_override`).

**Runtime fallback.** If the base scene isn't found in the runtime map,
log a single `inheritance` warn and proceed with the extender's own
placements only.

### Stage 4 · Bind objects

**Function.** `bindObjects(placements, library, assets, diagnostics) -> BoundPlacement[]`

**Job.** For each placement: resolve `object_name` in `library`; resolve
`asset` in `assets`. Merge layout hints (per-placement `layout`
overrides object defaults). Identity fields (`kind`, `label`,
`capabilities`) and the asset's `aspect` come from the object/asset
side and cannot be overridden.

**Diagnostics**

- `unknown_object` (error) — `placement.object_name` not in library.
  Placement is marked `_error` and skipped by subsequent stages.

**Validator-time errors (throw).** Same — strict validator mode rejects
unknown object_name at build time.

### Stage 5 · Scale to real-world dimensions

**Function.** `scaleToRealWorld(boundPlacements, workspace, opts, diagnostics) -> ScaledPlacement[]`

**Job.** Compute `_width_scale` per placement using SCALING_MODEL.md:

```
_width_scale = (display_width_cm × px_per_cm)
               ÷ (default_width × PX_PER_SCENE_PERCENT)
               × (fudge ?? 1.0)
```

Fallback chain:

1. `cm_model` — both `display_width_cm` and `px_per_cm` present.
2. `fallback_no_workspace` — `display_width_cm` present, workspace
   has no `px_per_cm`. Use authored `layout.width_scale` (default 1.0).
   Emit `unknown_workspace` diagnostic.
3. `fallback_authored` — `display_width_cm` absent. Use authored
   `layout.width_scale` (default 1.0). No diagnostic.
4. `skipped_error` — placement already carries `_error` from Stage 4.

**Diagnostics**

- `unknown_workspace` (warn) — workspace has no `px_per_cm` constant.

**Validator-time errors (throw).** None.

### Stage 6 · Group + sort

**Function.** `groupByZone(scaledPlacements, zones) -> { groups, orphans }`

**Job.** Group `_from`-tagged placements by `zone`. Within each zone,
sort by `(depth_tier ?? 0, placement_name)` for stable ordering.
Inactive placements (Schema A `deactivate_placements`) are dropped.

**Diagnostics**

- `unknown_zone` (error) — `placement.zone` not in `scene.zones[]`.
  Placement goes into `orphans` and is not rendered.
- `_error`-marked items from Stage 4 are silently filtered out here.
  Their diagnostic was emitted at Stage 4; downstream stages must not
  see them.

**Output invariant.** `final[]` order is **sort order**, not z-stacking
order. `depth_tier` controls deterministic layout ordering; the render
layer applies `z-index` separately from `depth` (`back: 1`, `mid: 2`,
`front: 3`). The two are independent concerns.

**Validator-time errors (throw).** Same.

### Stage 7 · Horizontal layout

**Function.** `horizontalLayout(groups, zones, layoutRules, diagnostics) -> Map<zoneId, ComputedItem[]>`

**Job.** For each zone, compute each item's `_x` (center, scene-%),
`_visualWidth`, `_footprint`, `_scale`.

**Footprint math.**

```
visualWidth = default_width × _width_scale × DEPTH_SCALE[depth] × scale
labelWidth  = layout.label_width
footprint   = max(visualWidth, min(labelWidth, visualWidth × MAX_FOOTPRINT_RATIO))
```

**Alignment dispatch** (zone-level `align`):

| Mode | Rule |
|---|---|
| `left` | First item's visual left edge flush with `bounds.left + ZONE_PADDING`. Gap between items. |
| `right` | Last item's visual right edge flush with `bounds.right - ZONE_PADDING`. Gap between items. |
| `center` | Cluster's visual midpoint at `(bounds.left + bounds.right) / 2`. Gap between items. |
| `justify` | First and last visual edges flush; gap expands to fill. |
| `tab-stops` | Partition items by `align_stop` into `left`/`center`/`right` buckets; each bucket runs its own layout against the corresponding edge of the same zone. |

**Overflow handling.** Compute total footprint. If > zone width:

1. Shrink gaps (toward 0).
2. If still > zone width, scale all footprints uniformly to
   `max(MIN_SCALE, zoneW / minSpread)`.
3. If still > zone width past `MIN_SCALE`, accept negative gaps
   (visible overlap) and emit `zone_overflow_negative_gap` warn.

**Diagnostics**

- `zone_overflow_negative_gap` (warn) — items overlap visibly.
- `tab_stop_overflow` (warn) — total footprint of the left + center +
  right buckets + 2 × `zone_gap` exceeds zone width. Emitted from the
  tab-stops branch after all three sub-layouts complete.

**Provisional `_y`.** Set to `zone.baseline` so stage 5/6 visualizations
(footprint, anchor) can render before Stage 8 refines.

### Stage 8 · Vertical layout

**Function.** `verticalLayout(zoneLayouts, zones, viewport, diagnostics) -> Map<zoneId, ComputedItem[]>`

**Job.** Compute final `_y` (baseline), `_height`, `_top`.

```
depthOffset = DEPTH_BASELINE_OFFSET[depth]
baseline    = baseline_override ?? (zone.baseline + depthOffset)
heightPct   = visualWidth × (viewport.w / viewport.h) / aspect
```

**Anchor dispatch** (`layout.anchor_y`):

| Anchor | `top` formula |
|---|---|
| `bottom` | `baseline - heightPct` |
| `tip` | `baseline + anchor_y_offset - heightPct` |
| `top` (fallback) | `baseline - heightPct / 2` (centered) |

**Aspect invariant.** A square asset (`aspect = 1`) renders square in
pixels at every viewport. The `(viewport.w / viewport.h)` factor
compensates for percent units being per-axis.

**Diagnostics**

- `item_escapes_zone_vertically` (warn) — `_top < zone.bounds.top - 3`
  or `_top + _height > zone.bounds.bottom + 3`. Tolerance: 3 scene-%.

### Stage 9 · Label layout

**Function.** `layoutLabels(zoneLayouts, zones, layoutRules, diagnostics) -> Map<zoneId, ComputedItem[]>`

**Job.** Set `_labelX`, `_labelY`, `_labelLines`. Wrap labels exceeding
their budget. Resolve collisions within each zone.

**Wrap rule.** If `label.length × AVG_CHAR_WIDTH_PCT > label_width × 1.1`,
split at the space nearest the middle of the string. Cap at 2 lines.
No spaces → no wrap.

**Collision nudge.** Three passes within each zone:

1. Sort by `_labelX`.
2. For each adjacent pair, if `(_labelX[i] - _labelX[i-1]) < (label_width[i-1] + label_width[i]) / 2`,
   push them apart symmetrically.
3. Clamp every label center inside `[bounds.left + label_width/2,
   bounds.right - label_width/2]` (with `ZONE_PADDING` already applied).

Labels never cross zone boundaries. Cross-zone collision is not
checked here (see Section 10).

**Diagnostics**

- `label_collision_residual` (warn) — pair still overlaps after 3 passes.

### Stage 10 · Scene-bounds clamp + render

**Function.** `clampSceneBounds(zoneLayouts, zones, sceneBounds, diagnostics) -> Map<zoneId, ComputedItem[]>`

**Job.** For each zone, compute the bounding box of all its items. If
any edge escapes `scene_bounds`, translate the **whole zone group** by
a single `(dx, dy)` to bring it back in.

**Group-level rule.** Items in the same zone shift together; this
preserves the zone's internal alignment semantics. If the group is
larger than `scene_bounds`, prefer the edge matching the zone's
`align` (right-aligned groups honor the right edge first).

**Render.** Each `ComputedItem` becomes an absolutely-positioned DOM
element:

```html
<div data-item-id="<placement_name>"
     style="left:<_x - _visualWidth/2>%;
            top:<_top>%;
            width:<_visualWidth>%;
            height:<_height>%;">
  <!-- object's resolved SVG asset (object-internal render path) -->
</div>
```

Label markup is renderer-specific but uses `_labelX`, `_labelY`,
`_labelLines`.

**Diagnostics**

- `zone_clamped_to_bounds` (warn) — `dx !== 0 || dy !== 0`. The zone
  geometry should usually be fixed upstream; routine triggering of
  this is a YAML smell.

## 5. Top-level pipeline function

```typescript
function runPipeline(
  scene: SceneA | SceneB,
  opts: Partial<PipelineInputs> = {},
): PipelineResult;
```

Composes stages 2–10 in order. Returns the full intermediate stage map
plus `diagnostics` and `final`. Does not throw at runtime (except on
malformed input that fails type guards). Validator entry points (see
Section 8) throw before invoking `runPipeline`.

Stages 6–10 run inside the convergence loop described in §4.5. The
`stages` map records the **last pass**; per-pass detail is in
`result.passes[]`. `result.diagnostics` contains identity-stage
diagnostics (Stages 1–5) plus the **last pass's** placement-stage
diagnostics. A scene that converged cleanly on pass 1 reports
`result.passes.length === 1` and an empty `zones_shrunk` array.

## 6. Closed enums in one place

For copy-pasting into TS unions:

```typescript
const ALIGN_MODES   = ["left","right","center","justify","tab-stops"] as const;
const ALIGN_STOPS   = ["left","center","right"] as const;
const ANCHOR_YS     = ["bottom","tip","top"] as const;
const DEPTHS        = ["back","mid","front"] as const;
const KINDS         = ["plate","bottle","flask","pipette","rack","waste","equipment","decoration"] as const;
const WORKSPACES    = ["bench","hood","microscope","incubator","plate_reader","cell_counter"] as const;
const CAPABILITIES  = ["clickable","material_container","instrument_with_setpoint",
                       "structured_surface","cursor_attachable","decoration_only"] as const;
const SCALE_SOURCES = ["cm_model","fallback_no_workspace","fallback_authored","skipped_error"] as const;
const STAGES        = ["normalize","inheritance","bind","scale","group",
                       "horizontal","vertical","labels","clamp"] as const;
```

## 7. Worked example fixture

Input scene (Schema A):

```yaml
scene_name: heat_block_bench
workspace: bench
scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 }
zones:
  - id: rear_supplies
    bounds: { left: 5, right: 95, top: 10, bottom: 35 }
    baseline: 32
    align: tab-stops
  - id: work_surface
    bounds: { left: 20, right: 80, top: 45, bottom: 75 }
    baseline: 72
    align: center
placements:
  - placement_name: rear_left_eppendorf_rack
    object_name: microtube_rack_24
    zone: rear_supplies
    depth_tier: 1
    align_stop: left
  - placement_name: rear_right_protein_ladder
    object_name: protein_ladder_tube
    zone: rear_supplies
    depth_tier: 1
    align_stop: right
  - placement_name: center_heat_block
    object_name: heat_block
    zone: work_surface
    depth_tier: 1
```

Reference object library (relevant entries):

```typescript
{
  heat_block:          { ..., layout: { default_width: 18, label_width: 12, anchor_y: "bottom", display_width_cm: 25 } },
  microtube_rack_24:   { ..., layout: { default_width: 13, label_width: 10, anchor_y: "bottom", display_width_cm: 12 } },
  protein_ladder_tube: { ..., layout: { default_width:  4, label_width:  8, anchor_y: "bottom", display_width_cm:  3 } },
}
```

Reference asset specs:

```typescript
{
  heat_block:     { default_width: 18, label_width: 12, aspect: 1.35 },
  microtube_rack: { default_width: 13, label_width: 10, aspect: 1.55 },
  eppendorf_tube: { default_width:  4, label_width:  8, aspect: 0.46 },
}
```

Expected `final` (with viewport 1920×1080, `WORKSPACE_PX_PER_CM.bench = 3.2`):

| placement_name | _width_scale | _visualWidth | _height | _top | _y (baseline) | _x |
|---|---|---|---|---|---|---|
| `rear_left_eppendorf_rack`  | 0.256 | 3.33 | 3.82 | 28.18 | 32.00 | 10.66 |
| `rear_right_protein_ladder` | 0.208 | 0.83 | 3.22 | 28.78 | 32.00 | 92.46 |
| `center_heat_block`         | 0.386 | 6.95 | 9.15 | 62.85 | 72.00 | 50.00 |

Math (all values in scene-percent):

```
_width_scale  = (display_width_cm × px_per_cm) ÷ (default_width × PX_PER_SCENE_PERCENT)
              = (cm × 3.2) ÷ (default_width × 11.52)

_visualWidth  = default_width × _width_scale × DEPTH_SCALE[depth]    (depth = mid → 1.0)
_height       = _visualWidth × (1920 / 1080) ÷ aspect
_top          = baseline − _height                                    (anchor_y = bottom)

_x (tab-stops left bucket):   padded_left + footprint/2
_x (tab-stops right bucket):  padded_right − footprint/2
_x (center single item):      (bounds.left + bounds.right) / 2
footprint = max(_visualWidth, min(label_width, _visualWidth × MAX_FOOTPRINT_RATIO))
```

Heat_block worked through: `(25 × 3.2) ÷ (18 × 11.52) = 0.3858`, `_visualWidth =
18 × 0.3858 = 6.95`, `_height = 6.95 × 1.778 ÷ 1.35 = 9.15`, `_top = 72 − 9.15 = 62.85`.
For tab-stops items, `padded_left = 5 + 1.5 = 6.5`, `padded_right = 95 − 1.5 = 93.5`;
microtube footprint = `max(3.33, min(10, 3.33 × 2.5)) = 8.33`, `_x = 6.5 + 4.165 = 10.66`.

Diagnostics array: empty for this fixture. Numerical tolerance for porters:
±0.01 on `_width_scale`, ±0.5 scene-% on positions.

## 8. Validator vs runtime split

The pipeline as specified is **runtime-only**. A separate validator
runs at build time over the same scene YAML and:

- **Throws** on every condition listed under "Validator-time errors
  (throw)" in each stage above.
- Walks the inheritance graph and rejects cycles + multi-level chains
  (per `SCENE_INHERITANCE.md`).
- Walks the row library and rejects scenes whose `row_name` values
  aren't in `WORKSPACE_ROW_LIBRARY[workspace]`.
- Walks each placement and rejects locked-field mutations on
  `reposition_placements` entries.
- Verifies every `object_name` resolves in the object library and
  every asset resolves in `ASSET_SPECS`.

Runtime ingestion assumes the validator has already accepted the YAML.
Runtime diagnostics are for *layout-time* problems (overflow, label
collision, clamp) that authors can't always predict from YAML alone.

## 9. Out of pipeline scope

These are owned elsewhere and the layout engine does not touch them:

| Concern | Owner | Reference |
|---|---|---|
| Subpart geometry (wells in plate, lanes in gel, tubes in rack) | The structured object's internal render path. Custom SVG geometry inside the object. | `PRIMARY_CONTRACT.md` item 3; `LAYOUT_ENGINE.md` "Subparts". |
| Material overlays (liquid fill, mixture color, gel content) | Object's `visual_states` formula resolved by the runtime via `anchor_liquid_clip` / `anchor_liquid_bounds` namespaced ids. | `MATERIAL_CONVENTION.md`. |
| State-driven visual variants (set-point displays, color changes) | Object's `visual_states.cases` and `SvgSwap`/`ColorChange`/`LiquidDisplayChange`/`SetPointDisplayChange` render-layer mechanisms. | `OBJECT_VOCABULARY.md` "Visual states". |
| `wrong_order_message` toast | Field passes through scene YAML; runtime toast layer reads `template` + `toast_duration_ms`. Protocol decides when to fire and supplies `{expected_label}`; scene supplies the UX text + duration. The layout engine never reads this field. | `SCENE_VOCABULARY.md` "Scene-level UI feedback". |
| Runtime placement deactivation (used-up reagents, equipment in cursor, moved to other scene) | Two distinct paths. (a) Material/state changes: object-internal via `visual_states`; pipeline does NOT re-run. (b) Placement set changes (`CursorAttach`, `LayoutMove`, `SceneChange`): pipeline DOES re-run; cache by `hash(resolved_placement_list)`. | `PROTOCOL_VOCABULARY.md` scene_operations. |
| Protocol step routing, click validation, wrong-order detection | Protocol vocabulary + walker. Layout engine just emits `data-item-id`. | `PROTOCOL_VOCABULARY.md`, `WALKTHROUGH_GUIDE.md`. |
| Runtime depth promotion (active placement → `front`) | `resolveSceneItemsWithDepth()` in game state, runs before `runPipeline` so `depth` is set when the pipeline sees the placement. | `LAYOUT_ENGINE.md` "Depth". |

## 10. Known gaps (future work)

The pipeline does **not** currently check:

- **Cross-zone collision.** Two zones with overlapping `bounds`, or
  items in adjacent zones colliding after Stage 10 clamp. Author
  responsibility today; build-time check planned.
- **Multi-line label width.** Wrap caps at 2 lines but doesn't
  recompute footprint from the wrapped widest line.
- **Z-order rendering.** `depth_tier` controls layout sort order, not
  stacking. Front-tier items render last in source order; if explicit
  z-index is needed, the render layer applies it from `depth`
  (`back: 1`, `mid: 2`, `front: 3`) — outside this pipeline.

## 11. Vocabulary boundaries (one-line)

Single-axis statements that should hold across the codebase. Each is
enforced by validation + invariant in this spec.

- **Protocol writes intent.** Names targets; never names SVG assets or
  pixel coordinates.
- **Object owns identity.** Declares state schema, capabilities, and
  the state→visual map.
- **Scene owns geometry.** Declares zones, placements, bounds; never
  declares object identity or state.
- **Layout owns position.** Declares the math that turns geometry into
  rendered pixels; never reads state or protocol step.
- **Author writes cm.** Never writes pixels, scale, or width_scale
  directly except as fallback escape hatch.

## 12. Reference implementation pointer

`pipeline.jsx` (in this project) is the live JS reference for the
runtime stages. Each stage in this spec has a function of the same
name in that file. Stage numbers in the function comments match this
document.

The TypeScript port should produce `src/scene_runtime/layout/layout_engine.ts`
with the same function names and signatures. The reference JS preserves
the same behavior modulo `null`/`undefined` typing and `Map` ergonomics
— no algorithm change should be needed.
