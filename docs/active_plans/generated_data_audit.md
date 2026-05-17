# Generated data audit

WP-GENERATED-DATA-1 / M0.5 / WS-GENERATED-DATA
Date: 2026-05-17
Status: COMPLETE

## 1. Executive summary

Three new Python builders are required. Two existing builders must be retired.
One new generated-data file must be added.

| Action | File | Reason |
| --- | --- | --- |
| RETIRE | pipeline/build_protocol_data.py | Reads old vocabulary (items.yaml, reagents.yaml, completionPath, interactionSequence). Produces empty PROTOCOL_CATALOG. Cannot be extended. |
| RETIRE | pipeline/build_scene_data.py | Reads src/scenes/*/*.yaml (frozen legacy tree). No content/base_scenes/ or protocol-local scene consumption. No inheritance resolution. Cannot be extended. |
| NEW | pipeline/build_new_protocol_data.py | Reads content/protocols/cluster/name/protocol.yaml + materials.yaml. Emits new-vocabulary ProtocolConfig records with materials inlined. |
| NEW | pipeline/build_new_scene_data.py | Reads content/base_scenes/*.yaml + content/protocols/cluster/name/scenes/*.yaml. Resolves inheritance Python-side. Emits ResolvedSceneConfig records. |
| NEW | pipeline/build_object_data.py | Reads content/objects/kind/name.yaml. Emits ObjectConfig records with state_fields, visual_states, subpart_groups, capabilities. |
| KEEP | pipeline/generate_svg_globals.py | Reads assets/ for SVG discovery. Format-agnostic. No generated-data gaps. |
| KEEP | pipeline/bootstrap_generated.sh | Orchestration shell script. Must be updated to invoke new builders instead of retired ones. |

generated/inventory_data.ts (empty scaffold, 35 lines) is not needed by the new runtime.
It will become a dead artifact once the retired builder is replaced. Flag for removal in WP-CONTRACT-1.

## 2. Interchange shape decision

Chosen shape: ESM TypeScript literal modules, one file per data kind.

Rationale:

- `esbuild` is already in the repo as the chosen bundler.
- ESM TS literal modules work unchanged in both `node --test` (test suite) and
  the esbuild browser bundle. No loader configuration required for either target.
- JSON sidecars require a fetch or require call at runtime, adding an async load
  boundary and complicating the test harness.
- Hybrid approaches (TS wrapper around JSON import) are unnecessary complexity.

File layout after all three new builders run:

```
generated/
  protocol_data.ts      <- new builder (new vocabulary, replaces old)
  scene_data.ts         <- new builder (inheritance resolved, replaces old)
  object_data.ts        <- new builder (new file; no current equivalent)
  svg_manifest.ts       <- kept as-is (generate_svg_globals.py)
  svg_assets/           <- kept as-is
  inventory_data.ts     <- dead scaffold (remove in WP-CONTRACT-1)
```

Materials inlining decision: materials are embedded directly into each protocol
record rather than emitted as a separate file. This eliminates cross-file
resolution in the loader and keeps each protocol record self-contained.
The loader reads one module, not two.

## 3. Protocol data audit

### 3.1 Current state

`generated/protocol_data.ts` (70 lines):

- `PROTOCOL_IDS = [] as const` -- empty.
- `PROTOCOL_CATALOG: Record<ProtocolId, ProtocolCatalogEntry> = {}` -- empty.
- Imports retired types: `ProtocolStep` from `../src/constants`, old `ContractCatalogEntry`
  from `../src/scene_runtime/contract`.
- Contains browser-only URL-parsing helpers (`getRequestedProtocolId`, `SELECTED_PROTOCOL_ID`,
  `ACTIVE_PROTOCOL_ID`, etc.). These belong in the browser runtime entry point, not
  in generated data. They are a layering violation: generated data must be
  environment-agnostic.
- `PROTOCOL_STEPS`, `PROTOCOL_PARTS`, `PROTOCOL_DAYS` are module-level eager reads
  from the empty catalog. This produces a runtime crash when the file is imported.

`generated/inventory_data.ts` (35 lines):

- `INVENTORY_CATALOG: Record<ProtocolId, InventoryCatalogEntry> = {}` -- empty.
- `EQUIPMENT` and `REAGENTS` are eager reads from the empty catalog. Same crash risk.
- Not needed by the new runtime. Mark for removal.

### 3.2 Builder root cause

`pipeline/build_protocol_data.py` (2046 lines) discovers zero protocols because:

1. `discover_protocols()` calls `find_protocol_directory()` from
   `validation/shared_toolkit/discovery.py`, which was patched (WS-ENFORCE Patch 5)
   to use `rglob` under `content/protocols/`. The CHANGELOG entry for that patch
   states the fix was applied to the validation layer. However, the builder then
   passes discovered protocol names to `build_protocol_catalog()`, which calls
   `load_protocol_yaml()`. That function reads `items.yaml` and `reagents.yaml`
   (old inventory files that no longer exist in the new layout). Every discovered
   protocol fails silently or raises, leaving the catalog empty.
2. `validate_items()` and `validate_reagents()` validate old vocabulary fields
   (`role`, `scene`, `colorKey`, `completionPath`, `interactionSequence`,
   `plateTargets`, `tubeTargets`, `requiredItems`, `errorHints`). None of these
   fields exist in new-vocabulary protocol YAML.
3. The builder cannot be extended to emit new vocabulary while keeping old
   validation logic intact. A replacement builder is required.

### 3.3 Required fields for new protocol records

Each protocol record must carry these fields, all BLOCKER (zero currently emitted):

| Field | Source | Notes |
| --- | --- | --- |
| protocol_type | protocol.yaml top-level | enum: mini_protocol, sequence_runner, dev_smoke |
| protocol_name | protocol.yaml top-level | snake_case identifier |
| entry_step | protocol.yaml top-level | step_name of first step |
| learning.objectives | protocol.yaml learning block | required for mini_protocol |
| learning.outcomes | protocol.yaml learning block | required for mini_protocol |
| learning.goals | protocol.yaml learning block | required for mini_protocol |
| steps[].step_name | protocol.yaml steps | stable identifier |
| steps[].prompt | protocol.yaml steps | student-facing prompt text |
| steps[].sequence[].target | protocol.yaml interactions | semantic scene object name |
| steps[].sequence[].gesture | protocol.yaml interactions | enum: click, drag, adjust, select, type |
| steps[].sequence[].validator | protocol.yaml interactions | preset name + params |
| steps[].sequence[].response.scene_operations | protocol.yaml interactions | discriminated union list |
| steps[].step_validator | protocol.yaml steps | preset name |
| steps[].outcome | protocol.yaml steps | {on_success, on_failure} |
| steps[].next_step | protocol.yaml steps | step_name or null |
| materials | materials.yaml | inlined per-protocol; keyed by material_id |

### 3.4 Builder patch path

New builder: `pipeline/build_new_protocol_data.py`

Discovery: `rglob` under `content/protocols/` (reuse
`validation/shared_toolkit/discovery.py::find_protocol_yaml_files()`).

Per protocol:
1. Load `protocol.yaml` from the protocol directory.
2. Load `materials.yaml` from the same directory (optional; emit empty dict if absent).
3. Validate against new vocabulary (protocol_type, entry_step, learning, steps[].sequence[]).
4. Emit one `ProtocolConfig` record per protocol.

Output: `generated/protocol_data.ts` with `PROTOCOL_CATALOG` keyed by `protocol_name`.

## 4. Scene data audit

### 4.1 Current state

`generated/scene_data.ts` (710 lines):

- Discovery comment on line 1: "from src/scenes/*/*.yaml" -- frozen legacy tree.
- `discover_scene_yamls()` in `pipeline/build_scene_data.py` globs `src/scenes/*/*yaml`.
- `src/scenes/` contains 6 YAML files (34 total files). These are frozen legacy configs.
- The builder validates against old scene vocabulary: `sceneId`, `workspace`, `capabilities`,
  `zones`, `items` (not `placements`). `sceneId` is old name; new spec uses `scene_name`.
- Field names are camelCase (`depthTier`, `svgAsset`, `accentKey`, `inventoryRef`).
  New runtime requires snake_case (`depth_tier`, `object_name`, `placement_name`).
- No consumption of `content/base_scenes/*.yaml` (9 files).
- No consumption of `content/protocols/cluster/name/scenes/*.yaml` (25 files).
- No inheritance resolution: `extends`, `add_placements`, `remove_placements`,
  `deactivate_placements`, `reposition_placements` are not parsed anywhere in
  `pipeline/build_scene_data.py`.

Content available but not consumed:

| Source | File count | Consumed by builder |
| --- | --- | --- |
| content/base_scenes/*.yaml | 9 | NO |
| content/protocols/cluster/name/scenes/*.yaml | 25 | NO |
| src/scenes/*/*.yaml (frozen) | 6 | YES (wrong source) |

### 4.2 Inheritance resolution requirement

Scene inheritance MUST be resolved Python-side before emission. The spec
([docs/specs/SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md)) states:
"The scene graph resolves statically before runtime. Build errors include cycles,
multi-level chains, unknown base names, unknown placement_name references."

Resolution is a static build step, not a runtime TypeScript computation. The
new builder must:

1. Load all base scenes from `content/base_scenes/`.
2. Load all protocol-local scenes from `content/protocols/.../scenes/`.
3. For each protocol-local scene: resolve `extends` to its base, then apply
   operations in fixed order: remove_placements, deactivate_placements,
   reposition_placements, add_placements.
4. Emit fully resolved `ResolvedSceneConfig` records. The TypeScript runtime
   receives flat placement lists; it does not implement inheritance logic.

Any cycle, unknown base, or unknown placement_name reference is a build error
(stop and report; do not silently skip).

### 4.3 Required fields for new scene records

Each resolved scene record must carry:

| Field | Source | Notes |
| --- | --- | --- |
| scene_name | base or protocol scene YAML | unique identifier |
| workspace | base scene YAML (locked) | workspace identity |
| capabilities | base scene YAML (locked) | list of capability strings |
| scene_bounds | base scene YAML (locked) | {left, right, top, bottom} |
| background | base scene YAML (locked) | {asset: string} |
| zones | base scene YAML (locked) | list of zone defs with id, bounds, align, label |
| placements | resolved merge of base + ops | list with placement_name, object_name, zone, depth_tier; deactivated flag |
| layout_rules | base scene YAML (locked) | optional |
| wrong_order_message | base scene YAML (locked) | optional |

### 4.4 Builder patch path

New builder: `pipeline/build_new_scene_data.py`

Steps:
1. Load all 9 base scenes from `content/base_scenes/`.
2. Load all 25 protocol-local scenes from `content/protocols/.../scenes/`.
3. Resolve inheritance for each protocol-local scene (apply 4 ops in spec order).
4. Validate: no cycles, no multi-level chains, no unknown placement_names,
   no duplicate placement_names after add_placements.
5. Emit `generated/scene_data.ts` with `SCENE_CATALOG` keyed by `scene_name`.

Base scenes emit as-is (no inheritance to resolve). Protocol-local scenes emit
the fully resolved placement list.

## 5. Object data audit

### 5.1 Current state

No `generated/object_data.ts` exists. There is no object builder in `pipeline/`.
The runtime has no programmatic access to object definitions.

Object files: 78 YAML files across 8 kinds under `content/objects/`.

| Kind | Count |
| --- | --- |
| bottle | 31 |
| equipment | 22 |
| decoration | 7 |
| pipette | 7 |
| flask | 2 |
| rack | 4 |
| plate | 1 |
| waste | 4 |
| TOTAL | 78 |

### 5.2 Fields that must be emitted

Each object record must carry:

| Field | Required | Notes |
| --- | --- | --- |
| object_name | yes | snake_case identifier |
| kind | yes | enum: bottle, equipment, decoration, pipette, flask, rack, plate, waste |
| label | yes | display label |
| state_fields | yes | list of field defs; each has field_name, type, allowed/min/max, default, unit, applies_to |
| visual_states | yes | map of field_name -> mechanism record; see section 7 |
| capabilities | yes | list of capability strings |
| layout | no | {default_width, label_width} |
| structure | no | subpart_kind, layout, rows, cols, name_pattern, subpart_groups |

### 5.3 Builder patch path

New builder: `pipeline/build_object_data.py`

Discovery: `rglob` under `content/objects/`, grouped by kind subfolder name.

Per object:
1. Load YAML.
2. Validate required fields (object_name, kind, label, state_fields, visual_states, capabilities).
3. Classify each visual_states entry by mechanism (see section 7).
4. Emit one `ObjectConfig` record per object.

Output: `generated/object_data.ts` with `OBJECT_CATALOG` keyed by `object_name`.

## 6. Material data audit

### 6.1 Current state

26 `materials.yaml` files under `content/protocols/cluster/name/materials.yaml`.
Each file has a top-level `materials:` dict keyed by material_id.

Each material entry carries:
- `label`: display string.
- `display_color.light`: hex color for light mode.
- `display_color.dark`: hex color for dark mode.

### 6.2 Inline decision

Materials are inlined into each protocol record. The new protocol builder reads
`materials.yaml` alongside `protocol.yaml` and embeds the materials dict in the
emitted `ProtocolConfig`. No separate `generated/material_data.ts`.

Rationale: the materials for a protocol are scoped to that protocol. Inlining
keeps the runtime loader single-file per protocol. Cross-protocol material
sharing does not exist in the current content set.

## 7. Visual-states mechanism classification

Four mechanisms appear in the authored `content/objects/` YAML.

| Mechanism | Count | Pilot 0 eligible | Spec note |
| --- | --- | --- | --- |
| svg_swap (kind: svg) | Many | YES | Swap SVG asset based on enum state value. Already implemented in legacy src/. Well-understood. |
| composite + fill_height | Many | NO (defer M2/WS-LIQUID) | Animated liquid-level fill. Requires anchor-based overlay render path. |
| composite + empty (no composite entries) | Several | NO (no-op at render) | Bool state fields (tape_present, comb_present, etc.) with empty composite list. Render-time: no visual change. Emit as deferred. |
| overlay (kind: overlay) | 1 instance | NO (defer M3+) | Label text rendered over SVG. Only authored instance: micropipette set_volume. Requires text-layer render path not yet implemented. |

Notes:

- `attribute_patch`: present in legacy `src/svg_color_patch.ts` as a runtime
  mechanism (SVG string-scan for fill/stroke). No authored instances in
  `visual_states` YAML across all 78 objects. Not a classification category for
  the current object set. Do not include in `ObjectConfig.visual_states` schema.
- `css_class`: not authored in any object YAML and not implemented in any src/
  file. Not a current mechanism.

### 7.1 Pilot 0 recommendation

Pilot 0 should target objects that use only `svg_swap` for `visual_states`.
Recommended Pilot 0 object: `media_bottle` (kind=bottle).

- `material_name`: svg_swap (2 cases: empty, media). Pilot 0 eligible.
- `material_volume`: composite+fill_height. Defer (not needed for functional
  click-sequence test).
- `temperature_status`: composite+empty. Defer (no-op at render; safe to skip).

Avoid `micropipette` in Pilot 0: `set_volume` uses `overlay` (deferred M3+).

## 8. Concrete sample records

These are the intended post-builder shapes. They show exactly what each
generated/*.ts file should contain after the three new builders run.

### 8.1 ProtocolConfig (from trypan_blue_counting)

```typescript
// In generated/protocol_data.ts
export const PROTOCOL_CATALOG: Record<string, ProtocolConfig> = {
  trypan_blue_counting: {
    protocol_type: "mini_protocol",
    protocol_name: "trypan_blue_counting",
    entry_step: "add_trypan_blue_to_chamber",
    learning: {
      objectives: "Students completing this mini-protocol will have achieved...",
      outcomes: "Students completing this mini-protocol will be able to...",
      goals: "Overall, this mini-protocol aims to accomplish..."
    },
    steps: [
      {
        step_name: "add_trypan_blue_to_chamber",
        prompt: "Add 10 microL of Trypan Blue stain to the diamond chamber...",
        sequence: [
          {
            target: "micropipette",
            gesture: "click",
            validator: { preset: "correct_target" },
            response: {
              scene_operations: [
                { type: "CursorAttach", target: "micropipette", operation: "attach" }
              ]
            }
          },
          {
            target: "micropipette",
            gesture: "adjust",
            validator: { preset: "target_with_value", value: { set_volume: 10 } },
            response: {
              scene_operations: [
                { type: "ObjectStateChange", target: "micropipette",
                  state: { set_volume: 10 } }
              ]
            }
          }
        ],
        step_validator: { preset: "sequence_complete" },
        outcome: { on_success: "complete", on_failure: "retry" },
        next_step: "add_cell_suspension_to_chamber"
      }
    ],
    materials: {
      trypan_blue: {
        label: "Trypan Blue",
        display_color: { light: "#0067cc", dark: "#0067cc" }
      },
      cell_suspension: {
        label: "Cell suspension",
        display_color: { light: "#cc0066", dark: "#cc0066" }
      },
      trypan_blue_mixture: {
        label: "Trypan Blue + cell suspension (mixed)",
        display_color: { light: "#cc0066", dark: "#cc0066" }
      }
    }
  }
};
```

### 8.2 ResolvedSceneConfig (from cell_counter_workspace, resolved from cell_counter_basic)

```typescript
// In generated/scene_data.ts
export const SCENE_CATALOG: Record<string, ResolvedSceneConfig> = {
  cell_counter_workspace: {
    scene_name: "cell_counter_workspace",
    extends_base: "cell_counter_basic",
    workspace: "cell_counter",
    capabilities: ["item_workspace"],
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    background: { asset: "cell_counter_workspace_bg" },
    zones: [
      {
        id: "instrument_area",
        bounds: { left: 15, right: 85, top: 20, bottom: 70 },
        align: "center",
        label: "Cell counter display and controls"
      },
      {
        id: "right_accessory_area",
        bounds: { left: 80, right: 95, top: 50, bottom: 80 },
        align: "center",
        label: "Accessory area"
      }
    ],
    placements: [
      // inherited from cell_counter_basic (base placements)
      {
        placement_name: "instrument_cell_counter",
        object_name: "cell_counter",
        zone: "instrument_area",
        depth_tier: 1,
        deactivated: false
      },
      // added by cell_counter_workspace protocol scene
      {
        placement_name: "right_micropipette",
        object_name: "micropipette",
        zone: "right_accessory_area",
        depth_tier: 2,
        deactivated: false
      },
      {
        placement_name: "right_hemocytometer_slide",
        object_name: "hemocytometer_slide",
        zone: "right_accessory_area",
        depth_tier: 1,
        deactivated: false
      },
      {
        placement_name: "instrument_lens_tissue",
        object_name: "lens_tissue",
        zone: "instrument_area",
        depth_tier: 1,
        deactivated: false
      }
    ]
  }
};
```

### 8.3 ObjectConfig (from media_bottle -- Pilot 0 recommended object)

```typescript
// In generated/object_data.ts
export const OBJECT_CATALOG: Record<string, ObjectConfig> = {
  media_bottle: {
    object_name: "media_bottle",
    kind: "bottle",
    label: "Media",
    state_fields: [
      {
        field_name: "material_name",
        type: "enum",
        allowed: ["empty", "media"],
        default: "empty",
        description: "Contents currently in the bottle."
      },
      {
        field_name: "material_volume",
        type: "float",
        unit: "ml",
        min: 0,
        max: 500,
        default: 500,
        description: "Volume of media remaining, in milliliters."
      },
      {
        field_name: "temperature_status",
        type: "enum",
        allowed: ["cold", "warmed"],
        default: "cold",
        description: "Whether the media has been warmed in the water bath."
      }
    ],
    visual_states: {
      material_name: {
        kind: "svg_swap",
        pilot_0_eligible: true,
        cases: [
          { when: "empty", asset_name: "media_bottle_empty" },
          { when: "media", asset_name: "media_bottle_filled" }
        ]
      },
      material_volume: {
        kind: "composite_fill_height",
        pilot_0_eligible: false,
        deferred_milestone: "M2/WS-LIQUID"
      },
      temperature_status: {
        kind: "composite_empty",
        pilot_0_eligible: false,
        deferred_milestone: "no-op"
      }
    },
    capabilities: ["clickable", "material_container", "cursor_attachable"],
    layout: { default_width: 3, label_width: 4 }
  }
};
```

### 8.4 MaterialConfig (from trypan_blue_counting/materials.yaml)

```typescript
// Inlined into ProtocolConfig.materials (not a separate file)
trypan_blue: {
  label: "Trypan Blue",
  display_color: { light: "#0067cc", dark: "#0067cc" }
},
cell_suspension: {
  label: "Cell suspension",
  display_color: { light: "#cc0066", dark: "#cc0066" }
},
trypan_blue_mixture: {
  label: "Trypan Blue + cell suspension (mixed)",
  display_color: { light: "#cc0066", dark: "#cc0066" }
}
```

## 9. TypeScript contract outline for WP-CONTRACT-1

The following type shapes are required in `src/scene_runtime/contract.ts`.
The current `contract.ts` (174 lines) uses old vocabulary (`CompletionPath`,
`interactionSequence`, `requiredItems`, `errorHints`, `SceneConfig.items`).
These types must be replaced. This is a WP-CONTRACT-1 deliverable; listed here
as input.

```typescript
// New vocabulary types (WP-CONTRACT-1 input)

export type GestureKind = "click" | "drag" | "adjust" | "select" | "type";

export type ValidatorPreset =
  | { preset: "correct_target" }
  | { preset: "correct_choice" }
  | { preset: "target_with_value"; value: Record<string, number | string | boolean> };

export type StepValidatorPreset =
  | { preset: "sequence_complete" }
  | { preset: "final_state_matches" };

export type SceneOperationType =
  | "ObjectStateChange"
  | "CursorAttach"
  | "SceneChange"
  | "LayoutMove"
  | "TimedWait";

export interface SceneOperation {
  type: SceneOperationType;
  target?: string;
  state?: Record<string, number | string | boolean>;
  operation?: string;
  to_scene?: string;
}

export interface Response {
  scene_operations: SceneOperation[];
  feedback?: string;
}

export interface Interaction {
  target: string;
  gesture: GestureKind;
  validator: ValidatorPreset;
  response: Response;
}

export interface Step {
  step_name: string;
  prompt: string;
  sequence: Interaction[];
  step_validator: StepValidatorPreset;
  outcome: { on_success: "complete"; on_failure: "retry" };
  next_step: string | null;
}

export interface LearningBlock {
  objectives: string;
  outcomes: string;
  goals: string;
}

export interface MaterialConfig {
  label: string;
  display_color: { light: string; dark: string };
}

export interface ProtocolConfig {
  protocol_type: "mini_protocol" | "sequence_runner" | "dev_smoke";
  protocol_name: string;
  entry_step: string;
  learning?: LearningBlock;
  steps: Step[];
  materials: Record<string, MaterialConfig>;
}

export interface PlacementConfig {
  placement_name: string;
  object_name: string;
  zone: string;
  depth_tier: number;
  deactivated: boolean;
  anchor?: string;
  position?: Record<string, number>;
}

export interface ZoneConfig {
  id: string;
  bounds: { left: number; right: number; top: number; bottom: number };
  align: string;
  label?: string;
}

export interface ResolvedSceneConfig {
  scene_name: string;
  extends_base: string | null;
  workspace: string;
  capabilities: string[];
  scene_bounds: { left: number; right: number; top: number; bottom: number };
  background: { asset: string };
  zones: ZoneConfig[];
  placements: PlacementConfig[];
  layout_rules?: Record<string, unknown>;
  wrong_order_message?: Record<string, unknown>;
}

export type StateFieldType = "enum" | "float" | "int" | "bool";

export interface StateFieldConfig {
  field_name: string;
  type: StateFieldType;
  allowed?: string[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number | boolean;
  unit?: string;
  applies_to?: "subpart" | undefined;
  description?: string;
}

export interface VisualStateEntry {
  kind: "svg_swap" | "composite_fill_height" | "composite_empty" | "overlay";
  pilot_0_eligible: boolean;
  cases?: Array<{ when: string; asset_name: string }>;
  formula?: string;
  deferred_milestone?: string;
}

export interface SubpartGroupConfig {
  group_kind: string;
  members: Array<{ name: string; contains: string[] }>;
}

export interface StructureConfig {
  subpart_kind: string;
  layout: string;
  rows: number;
  cols: number;
  name_pattern: string;
  subpart_groups: Record<string, SubpartGroupConfig>;
}

export interface ObjectConfig {
  object_name: string;
  kind: string;
  label: string;
  state_fields: StateFieldConfig[];
  visual_states: Record<string, VisualStateEntry>;
  capabilities: string[];
  layout?: { default_width: number; label_width?: number };
  structure?: StructureConfig;
}
```

## 10. Gap inventory

All gaps are generated-data gaps. No spec gaps. No content gaps.

| Gap | Severity | Kind | Builder path |
| --- | --- | --- | --- |
| PROTOCOL_CATALOG is empty | BLOCKER | generated-data | pipeline/build_new_protocol_data.py |
| materials not emitted | BLOCKER | generated-data | inline into build_new_protocol_data.py |
| learning block not emitted | BLOCKER | generated-data | inline into build_new_protocol_data.py |
| steps[].sequence[] not emitted | BLOCKER | generated-data | inline into build_new_protocol_data.py |
| SCENE_CATALOG reads wrong source | BLOCKER | generated-data | pipeline/build_new_scene_data.py |
| scene inheritance not resolved | BLOCKER | generated-data | pipeline/build_new_scene_data.py |
| placements not emitted (uses items) | BLOCKER | generated-data | pipeline/build_new_scene_data.py |
| object_data.ts does not exist | BLOCKER | generated-data | pipeline/build_object_data.py |
| state_fields not emitted | BLOCKER | generated-data | pipeline/build_object_data.py |
| visual_states not emitted | BLOCKER | generated-data | pipeline/build_object_data.py |
| capabilities not emitted | BLOCKER | generated-data | pipeline/build_object_data.py |
| browser helpers in generated data | HIGH | layering violation | remove in build_new_protocol_data.py |
| contract.ts uses old vocabulary | HIGH | layering violation | WP-CONTRACT-1 |
| inventory_data.ts dead scaffold | LOW | cleanup | remove in WP-CONTRACT-1 |

## 11. Builder retirement plan and base-scenes coverage

### Retirement order

1. Freeze `pipeline/build_protocol_data.py` (do not extend; retire in WP-CONTRACT-1).
2. Freeze `pipeline/build_scene_data.py` (do not extend; retire in WP-CONTRACT-1).
3. New builders emit into `generated/protocol_data.ts`, `generated/scene_data.ts`,
   `generated/object_data.ts` alongside the frozen builders.
4. Once new builders are verified (WP-CONTRACT-1 + WP-PILOT0-1), remove frozen
   builders and update `pipeline/bootstrap_generated.sh`.

### Base-scene coverage

9 base scenes in `content/base_scenes/`:

- bench_basic.yaml
- cell_counter_basic.yaml
- electrophoresis_bench.yaml
- heat_block_bench.yaml
- hood_basic.yaml
- imaging_bench.yaml
- microscope_basic.yaml
- sample_prep_bench.yaml
- staining_bench.yaml

All 9 must be loaded by the new scene builder. Each base scene becomes a
`ResolvedSceneConfig` with `extends_base: null`. Protocol-local scenes reference
these by `scene_name` in their `extends` field; the builder must reject any
`extends` value not matching a loaded base scene name.

### Protocol-local scene coverage

25 protocol-local scene files under `content/protocols/.../scenes/`.
All 25 must be resolved by the new scene builder.

### Spec references

- Scene inheritance algorithm: [docs/specs/SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md)
- Scene YAML format: [docs/specs/SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md)
- Protocol YAML format: [docs/specs/PROTOCOL_YAML_FORMAT.md](../specs/PROTOCOL_YAML_FORMAT.md)
- Object YAML format: [docs/specs/OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md)
- Material convention: [docs/specs/MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md)
- Object vocabulary: [docs/specs/OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md)
