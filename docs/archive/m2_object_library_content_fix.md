# A1x: Object Library Content Fix

**Date:** 2026-05-23
**Task:** Lane A1x, contingent work to resolve 9 failing object YAMLs detected by `tools/gen_object_library.py`

## Scope

Resolve validation failures in object YAML content where:
- Referenced SVG assets do not exist in `assets/**/*.svg`
- Required `asset` field is missing from decoration objects with empty visual_states

All 9 failures passed validation rules closure: no rule loosening, no fallback assets, no new SVGs authored. Every object either fixed via Option A (correct asset reference) or quarantined via Option B (no asset available).

## Method

For each of the 9 failing objects reported by lane A1, apply exactly one resolution:

**Option A: Fix the YAML if a matching SVG exists under a different name.**
- Check `assets/equipment/` and related directories for SVGs with similar names
- Edit the YAML to reference the correct asset
- Example: if `well_plate_96.svg` doesn't exist but similar assets do, change the reference

**Option B: Quarantine the object to `content/objects_quarantine/` if no SVG exists.**
- Use `git mv` to move the YAML to the quarantine directory
- Add a one-line comment: `# QUARANTINED 2026-05-23 by A1x: <reason>`
- Mark for future restoration when the asset lands

## Results

All 9 failures resolved. No validation errors remaining.

### Per-Failure Resolution

#### 1. `trypan_blue_bottle.yaml` - **QUARANTINED (Option B)**

**Status:** Moved to `content/objects_quarantine/bottle/trypan_blue_bottle.yaml`

**Reason:** References asset `trypan_blue_bottle` (via visual_states.material_name). No such SVG exists in `assets/equipment/`. Generic bottle assets exist (bottle.svg, bottle_medium_pink.svg, etc.) but not a trypan-blue-specific asset.

**Comment added:**
```yaml
# QUARANTINED 2026-05-23 by A1x: asset trypan_blue_bottle not found in assets/. Restore when asset lands.
```

---

#### 2. `trypsin_bottle.yaml` - **QUARANTINED (Option B)**

**Status:** Moved to `content/objects_quarantine/bottle/trypsin_bottle.yaml`

**Reason:** Missing `asset` field entirely. `visual_states.material_name` has no cases (composite: []). No way to resolve to an SVG. No trypsin-specific asset exists.

**Comment added:**
```yaml
# QUARANTINED 2026-05-23 by A1x: missing asset_name field; no matching trypsin asset in assets/. Restore when asset lands.
```

---

#### 3. `p10_gel_loading_tip.yaml` - **FIXED (Option A)**

**Status:** Edited in place. Now resolves to `p10_gel_loading_tip.svg`.

**Change:**
- Added `asset: p10_gel_loading_tip` field at top level (after label)
- Asset `p10_gel_loading_tip.svg` exists in `assets/equipment/`
- Decoration object with empty state_fields and empty visual_states requires top-level `asset` field per codegen script validation

**Before:**
```yaml
object_name: p10_gel_loading_tip
kind: decoration
label: p10 gel loading tip
state_fields: []
visual_states: {}
```

**After:**
```yaml
object_name: p10_gel_loading_tip
kind: decoration
label: p10 gel loading tip
asset: p10_gel_loading_tip
state_fields: []
visual_states: {}
```

---

#### 4. `professor_avatar.yaml` - **FIXED (Option A)**

**Status:** Edited in place. Now resolves to `angry_professor.svg`.

**Change:**
- Added `asset: angry_professor` field at top level
- Asset `angry_professor.svg` exists in `assets/equipment/`
- Object name `professor_avatar` does not match any asset name exactly; `angry_professor` is the canonical asset for this avatar

**Before:**
```yaml
object_name: professor_avatar
kind: decoration
label: Professor avatar
state_fields: []
visual_states: {}
```

**After:**
```yaml
object_name: professor_avatar
kind: decoration
label: Professor avatar
asset: angry_professor
state_fields: []
visual_states: {}
```

---

#### 5. `centrifuge.yaml` - **FIXED (Option A)**

**Status:** Edited in place. Now references `centrifuge.svg` in both visual_states cases.

**Reason:** Visual_states.running had cases with `asset_name: centrifuge_idle` and `asset_name: centrifuge_spinning`. Neither exists. Base asset `centrifuge.svg` exists.

**Change:** Updated visual_states.running.cases to use the same asset in both cases (false -> `centrifuge`, true -> `centrifuge`). This follows the pattern used by vortex.yaml, which uses the same asset for both on/off states when state-specific variants don't exist.

**Before:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: centrifuge_idle }
      - when: true
        output: { asset_name: centrifuge_spinning }
```

**After:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: centrifuge }
      - when: true
        output: { asset_name: centrifuge }
```

---

#### 6. `hemocytometer.yaml` - **QUARANTINED (Option B)**

**Status:** Moved to `content/objects_quarantine/equipment/hemocytometer.yaml`

**Reason:** Missing `asset` field. `visual_states` declares only composite fields (material_name, material_volume) with no SVG cases. No hemocytometer SVG exists in `assets/equipment/`. A slide variant (`hemocytometer_slide.yaml`) exists and is not quarantined, but the main instrument is missing its asset.

**Comment added:**
```yaml
# QUARANTINED 2026-05-23 by A1x: missing asset_name field; no hemocytometer asset in assets/. Restore when asset lands.
```

---

#### 7. `plate_reader.yaml` - **FIXED (Option A)**

**Status:** Edited in place. Now references `plate_reader.svg` in both visual_states cases.

**Reason:** Visual_states.reading had cases with `asset_name: plate_reader_idle` and `asset_name: plate_reader_reading`. Neither exists. Base asset `plate_reader.svg` exists.

**Change:** Updated visual_states.reading.cases to use the same asset in both cases (false -> `plate_reader`, true -> `plate_reader`).

**Before:**
```yaml
visual_states:
  reading:
    kind: svg
    cases:
      - when: false
        output: { asset_name: plate_reader_idle }
      - when: true
        output: { asset_name: plate_reader_reading }
```

**After:**
```yaml
visual_states:
  reading:
    kind: svg
    cases:
      - when: false
        output: { asset_name: plate_reader }
      - when: true
        output: { asset_name: plate_reader }
```

---

#### 8. `water_bath.yaml` - **FIXED (Option A)**

**Status:** Edited in place. Now references `water_bath.svg` in both visual_states cases.

**Reason:** Visual_states.running had cases with `asset_name: water_bath_idle` and `asset_name: water_bath_heating`. Neither exists. Base asset `water_bath.svg` exists.

**Change:** Updated visual_states.running.cases to use the same asset in both cases (false -> `water_bath`, true -> `water_bath`).

**Before:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: water_bath_idle }
      - when: true
        output: { asset_name: water_bath_heating }
```

**After:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: water_bath }
      - when: true
        output: { asset_name: water_bath }
```

---

#### 9. `well_plate_96.yaml` - **QUARANTINED (Option B)**

**Status:** Moved to `content/objects_quarantine/plate/well_plate_96.yaml`

**Reason:** Structured plate object. Visual_states.material_name references asset `well` (applies_to: subpart). No such SVG exists. Only `well_plate_24.svg` and `96well_pcr_plate.svg` exist in assets. The 96-well plate requires custom subpart geometry authoring; this is not a simple asset swap.

**Comment added:**
```yaml
# QUARANTINED 2026-05-23 by A1x: references asset 'well' which does not exist in assets/. 96-well plate assets need custom authoring; 24-well exists but not 96-well. Restore when asset lands.
```

---

## Verification

### Script Execution

```bash
source source_me.sh && python3 tools/gen_object_library.py
```

**Result:**
- Exit code: 0 OK
- Generated `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/object_library.ts`
- Lines generated: 1317
- Objects emitted: 74 (was 78; 4 quarantined)
- Asset specs: 48
- **No validation errors** OK

### TypeScript Check

```bash
npx tsc --noEmit -p tsconfig.json
```

**Result:** Clean compile OK

---

## Files Changed

### YAMLs Edited (in place)

1. `content/objects/decoration/p10_gel_loading_tip.yaml` - Added `asset: p10_gel_loading_tip`
2. `content/objects/decoration/professor_avatar.yaml` - Added `asset: angry_professor`
3. `content/objects/equipment/centrifuge.yaml` - Fixed visual_states.running to use `centrifuge` asset in both cases
4. `content/objects/equipment/plate_reader.yaml` - Fixed visual_states.reading to use `plate_reader` asset in both cases
5. `content/objects/equipment/water_bath.yaml` - Fixed visual_states.running to use `water_bath` asset in both cases

### YAMLs Quarantined (git mv)

1. `content/objects/bottle/trypan_blue_bottle.yaml` -> `content/objects_quarantine/bottle/trypan_blue_bottle.yaml`
2. `content/objects/bottle/trypsin_bottle.yaml` -> `content/objects_quarantine/bottle/trypsin_bottle.yaml`
3. `content/objects/equipment/hemocytometer.yaml` -> `content/objects_quarantine/equipment/hemocytometer.yaml`
4. `content/objects/plate/well_plate_96.yaml` -> `content/objects_quarantine/plate/well_plate_96.yaml`

---

## Concerns and Risks

### Downstream Scene Impact

**Risk:** Scenes that reference the quarantined objects will now fail codegen during lane A3 (scene index generation).

**Scope check:** The quarantined objects should be checked against all scenes in `content/base_scenes/` to confirm which scenes reference them. If any in-scope scene uses them, those scenes must also be quarantined or updated.

**Known impact:**
- `well_plate_96` is a structured plate and likely used in multiple assay scenes. Scenes using it must be quarantined or updated to use `well_plate_24` if compatible.
- Trypan blue and trypsin objects may be used in cell-culture or preparation scenes; those scenes should be flagged for review.

**Verification approach:** Lane A3 will report any unresolved object references during scene codegen. Those scenes will be quarantined or moved to the failure queue.

### Equipment State Assumption

**Note on centrifuge, plate_reader, water_bath:**

The _idle/_spinning/_reading/_heating naming pattern suggests these objects had planned multi-state visual variants (different SVG per state). By using the same asset in both states, we've preserved the object schema but lost the visual-state distinction. This is acceptable for M2b (the objects are usable and render), but M3 content work or asset authoring should address this gap if visual state feedback is pedagogically important.

The objects still declare the state field (running/reading) and overlay labels work, so the visual interface is not broken-the SVG simply doesn't change on state. This is a content limitation, not a schema or renderer bug.

---

## Next Steps

1. **Lane A3 (scene index codegen):** Run `python3 tools/gen_scene_index.py` to validate all scenes. Any scene referencing quarantined objects will fail and must be:
   - Quarantined to `content/base_scenes_quarantine/`
   - Updated to use alternative objects if possible
   - Added to the M2c failure queue if in the active allowlist

2. **Lane A4 (reproducibility):** Confirm full build path works: `rm -rf generated dist && bash check_codebase.sh && bash build_github_pages.sh`

3. **Lane C1 (bench_basic preflight):** Verify bench_basic scene does not depend on any quarantined objects. If bench_basic uses any of these, it must be resolved before C2.

4. **Lane E2 (SVG completeness audit):** Audit remaining objects in `generated/object_library.ts` to confirm all 74 resolve to real SVGs with valid viewBox.

5. **Content future work:** Quarantine folder remains in git history. When trypan_blue, trypsin, hemocytometer, and 96-well plate SVG assets are created, the objects can be restored and unquarantined.

---

## Summary Table

| # | Object | Failure | Resolution | Status | Asset |
|---|--------|---------|-----------|--------|-------|
| 1 | trypan_blue_bottle | Asset trypan_blue_bottle not found | Quarantine (no asset) | OK | - |
| 2 | trypsin_bottle | Missing asset_name | Quarantine (no asset) | OK | - |
| 3 | p10_gel_loading_tip | Missing asset_name | Fixed: add asset field | OK | p10_gel_loading_tip |
| 4 | professor_avatar | Missing asset_name | Fixed: add asset field | OK | angry_professor |
| 5 | centrifuge | Asset centrifuge_idle not found | Fixed: use centrifuge in both states | OK | centrifuge |
| 6 | hemocytometer | Missing asset_name | Quarantine (no asset) | OK | - |
| 7 | plate_reader | Asset plate_reader_idle not found | Fixed: use plate_reader in both states | OK | plate_reader |
| 8 | water_bath | Asset water_bath_idle not found | Fixed: use water_bath in both states | OK | water_bath |
| 9 | well_plate_96 | Asset well not found | Quarantine (no asset) | OK | - |

---

## Codegen Metrics

| Metric | Before A1x | After A1x |
|--------|-----------|-----------|
| Total object YAMLs | 78 | 74 |
| Quarantined YAMLs | 0 | 4 |
| Validation errors | 9 | 0 |
| Generated objects | - | 74 |
| Asset specs | - | 48 |
| Exit code | non-zero | 0 OK |
| TypeScript compile | - | clean OK |

---

## Appendix: Scene Cascade (Lane A1x, follow-up)

**Date:** 2026-05-23
**Trigger:** Lane A4 reproducibility audit reported that `tools/gen_scene_index.py` failed when processing scenes that referenced the now-quarantined objects.

### Cascade Audit

After quarantining the four objects (trypan_blue_bottle, trypsin_bottle, hemocytometer, well_plate_96), a sweep of `content/base_scenes/` identified scenes that referenced them:

| Quarantined Object | Referencing Scenes |
|--------------------|-------------------|
| well_plate_96 | well_plate_96_zoom.yaml |
| trypan_blue_bottle | (none) |
| trypsin_bottle | (none) |
| hemocytometer | (none) |

**Total scenes scanned:** 19
**Scenes referencing quarantined objects:** 1

### Resolution: Scene Quarantine

Scene `well_plate_96_zoom.yaml` references the now-quarantined `well_plate_96` object at placement level (line 35: `object_name: well_plate_96`). Per Core Invariant 2 (every placement.object_name must resolve), this scene was moved to `content/base_scenes_quarantine/` using `git mv`:

```bash
git mv content/base_scenes/well_plate_96_zoom.yaml \
  content/base_scenes_quarantine/well_plate_96_zoom.yaml
```

Quarantine comment added:
```yaml
# QUARANTINED 2026-05-23: references quarantined object well_plate_96. Restore when the underlying SVG and object YAML land.
```

### Codegen Verification After Scene Cascade

After moving the scene:

```bash
python3 tools/gen_scene_index.py  # Exit code: 0 OK
npx tsc --noEmit -p tsconfig.json # Exit code: 0 OK
```

**Result:** `generated/scenes.ts` regenerated with:
- `SCENE_ALLOWLIST = ['bench_basic']`
- `SCENES_SKIPPED = 17` (includes well_plate_96_zoom)

No validation errors. All remaining 18 scenes in `content/base_scenes/` resolve cleanly.
