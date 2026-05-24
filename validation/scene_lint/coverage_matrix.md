# Group A Coverage Matrix

Mapping of Group A rules from `design_advice/SCENE_LINT_PLAN.md` to implementation location.

## Matrix

| Rule | Covered by vocab lint? | Evidence | Owner after decision |
|------|------------------------|----------|----------------------|
| `duplicate_scene_name` | no | No existing tool checks for duplicate `scene_name` across files. Requires cross-file scanning. | scene_lint |
| `duplicate_placement_name` | yes (partial) | `validation/yaml/scene_base_validator.py` detects duplicates within a single scene after load (lines 140-149), but WP-LINT-2 must handle post-inheritance resolution duplicates. | scene_lint (post-inheritance dedup) |
| `invalid_scene_bounds` | no | No validation of `scene_bounds.left/right/top/bottom` ranges or ordering. Requires numeric range checks and left < right / top < bottom. | scene_lint |
| `invalid_zone_bounds` | no | No validation of `zone.bounds` fields against range `[0, 100]` or containment within `scene_bounds`. | scene_lint |
| `zone_outside_scene_bounds` | no | No check that each zone bounds rect is fully contained in scene_bounds. | scene_lint |
| `missing_svg_asset` | no | Asset file existence is not validated. Requires traversal of `placements[].asset` and stat-based file checks. | scene_lint |
| `invalid_svg_viewbox` | no | SVG `viewBox` parsing and validation not performed. Requires regex extraction and format validation. | scene_lint |
| `inheritance_unknown_base` | yes | `validation/shared_toolkit/scene_loaders.py` raises `DanglingReferenceError` when base scene file does not exist (line 149). | shared_toolkit (exception), scene_lint (finding) |
| `inheritance_multi_level` | yes | `validation/shared_toolkit/scene_loaders.py` raises `MultiLevelInheritanceError` when base scene also has `extends` (line 158). | shared_toolkit (exception), scene_lint (finding) |
| `inheritance_cycle` | yes | `validation/shared_toolkit/scene_loaders.py` raises `InheritanceCycleError` for self-extends (line 144). | shared_toolkit (exception), scene_lint (finding) |
| `inheritance_locked_field_mutation` | yes | `validation/shared_toolkit/scene_loaders.py` raises `LockedFieldMutationError` when mutation operations attempt invalid field updates (lines 175-224). | shared_toolkit (exception), scene_lint (finding) |
| `inheritance_dangling_ref` | partial | `validation/shared_toolkit/scene_loaders.py` does not validate that `deactivate_placements` / `reposition_placements` target names exist before `remove_placements` deletes them. Requires sequencing check. | scene_lint (new detection logic) |

## Decision summary

- **6 rules implemented in scene_lint**: `duplicate_scene_name`, `invalid_scene_bounds`, `invalid_zone_bounds`, `zone_outside_scene_bounds`, `missing_svg_asset`, `invalid_svg_viewbox`.
- **4 rules delegated to shared_toolkit (exceptions) + scene_lint (finding wrappers)**: `inheritance_unknown_base`, `inheritance_multi_level`, `inheritance_cycle`, `inheritance_locked_field_mutation`.
- **1 rule requiring post-inheritance dedup in scene_lint**: `duplicate_placement_name`.
- **1 rule requiring new dangling-ref validation in scene_lint**: `inheritance_dangling_ref`.

Total rules in this WP: 12 (all Group A).
