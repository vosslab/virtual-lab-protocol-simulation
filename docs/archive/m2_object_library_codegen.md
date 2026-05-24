# M2b Object Library Codegen (Lane A1)

## Scope

Build `tools/gen_object_library.py` to read `content/objects/**/*.yaml` and emit `generated/object_library.ts` with typed `OBJECT_LIBRARY` and `ASSET_SPECS` exports matching the layout engine types.

## Method

The script:
1. Reads the closed `KINDS` enum from `src/scene_runtime/layout/constants.ts`
2. Collects all SVG files under `assets/**/*.svg` into a registry
3. Processes each object YAML file sequentially, logging the absolute path before opening
4. Validates each object:
   - `object.kind` is in the closed `KINDS` enum
   - `object.asset` resolves to a real SVG file
   - `object.layout.default_width` and `object.layout.label_width` are positive numbers
   - `object.layout.aspect` (if set) is positive
   - Aspect ratio is derived from SVG `viewBox` (width/height), overridable by YAML
5. Fails loudly on first validation error with file path visible in stderr
6. Emits TypeScript module with OBJECT_LIBRARY dict and ASSET_SPECS dict

Per `docs/PYTHON_STYLE.md`: tabs (not spaces), no try/except blocks, no defensive defaults, no asserts in plain scripts.

## Results

- Script created at `tools/gen_object_library.py` (executable)
- Processed 78 object YAML files
- Successfully parsed 69 objects
- Found 9 validation failures (see below)

### Objects Failing Validation

| Object | File | Failure Reason |
| --- | --- | --- |
| trypan_blue_bottle | `content/objects/bottle/trypan_blue_bottle.yaml` | Asset 'trypan_blue_bottle' not found in SVG registry |
| trypsin_bottle | `content/objects/bottle/trypsin_bottle.yaml` | Missing asset_name in visual_states |
| p10_gel_loading_tip | `content/objects/decoration/p10_gel_loading_tip.yaml` | Missing asset_name in visual_states |
| professor_avatar | `content/objects/decoration/professor_avatar.yaml` | Missing asset_name in visual_states |
| centrifuge | `content/objects/equipment/centrifuge.yaml` | Asset 'centrifuge_idle' not found in SVG registry |
| hemocytometer | `content/objects/equipment/hemocytometer.yaml` | Missing asset_name in visual_states |
| plate_reader | `content/objects/equipment/plate_reader.yaml` | Asset 'plate_reader_idle' not found in SVG registry |
| water_bath | `content/objects/equipment/water_bath.yaml` | Asset 'water_bath_idle' not found in SVG registry |
| well_plate_96 | `content/objects/plate/well_plate_96.yaml` | Asset 'well' not found in SVG registry |

### Root Causes

Two validation failure categories emerged:

1. **Missing SVG assets** (5 cases): Authored objects reference SVG assets that do not exist in the `assets/` tree.
   - `centrifuge_idle`
   - `plate_reader_idle`
   - `water_bath_idle`
   - `trypan_blue_bottle`
   - `well`

2. **Missing asset_name in visual_states** (4 cases): Object YAML files define state-driven visual switching but do not include an `asset_name` in the output blocks.
   - `trypsin_bottle`
   - `p10_gel_loading_tip`
   - `professor_avatar`
   - `hemocytometer`

## Failures

Script exit code: 1 (expected; validation failures block code generation per "fail loud" discipline)

No `generated/object_library.ts` file was written because validation did not complete cleanly. This is the correct behavior: the script does not produce intermediate or partial output on validation failure.

## Next Steps

**Lane A1 work is complete.** The codegen script is ready and correctly validates all required fields and asset references.

**Manager decision required:** The 9 failing objects block the M2b vertical slice. Two options:

1. **Content fix path** (preferred per plan): Fix the 9 objects in `content/objects/` (add missing SVG assets or add asset_name to visual_states) and re-run the codegen.
2. **Asset authoring path**: Missing SVG assets (centrifuge_idle, plate_reader_idle, water_bath_idle, trypan_blue_bottle, well) route to asset authoring queue if mechanical derivation is not applicable.

The script logs `processing <abs-path>` to stderr for each file, enabling easy diagnosis of which object failed and why. The error messages include the exact validation rule and the offending file path, fulfilling the "fail loud with path visible" requirement.
