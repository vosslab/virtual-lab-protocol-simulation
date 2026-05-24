# Scene Cascade Fix (Lane A1x, follow-up)

**Date:** 2026-05-23
**Task:** Quarantine scenes that reference objects quarantined by Lane A1x.
**Status:** Complete

---

## Scope

After Lane A1x quarantined four objects (trypan_blue_bottle, trypsin_bottle, hemocytometer, well_plate_96) to `content/objects_quarantine/`, Lane A4 detected that `tools/gen_scene_index.py` failed when processing scenes that referenced the now-unavailable objects.

Per Core Invariant 2 (PRIMARY_CONTRACT.md), every `placement.object_name` must resolve to an existing object. The fix is to quarantine affected scenes, not to weaken validation.

---

## Method

1. **Audit scope:** For each quarantined object, grep `content/base_scenes/` for references using word-boundary matching (`\b`).
2. **Document affected scenes:** List scenes that reference each quarantined object.
3. **Quarantine affected scenes:** Move each scene to `content/base_scenes_quarantine/` using `git mv`, adding a one-line quarantine comment.
4. **Verify codegen:** Re-run all three codegen scripts and TypeScript type check. Expect exit 0.
5. **Report results:** Document scene count changes and downstream risks.

---

## Cascade Audit Results

**Scenes scanned:** 19 total in `content/base_scenes/`

### Per-Object References

| Quarantined Object | Referencing Scenes | Count |
|--------------------|-------------------|-------|
| `well_plate_96` | well_plate_96_zoom | 1 |
| `trypan_blue_bottle` | (none) | 0 |
| `trypsin_bottle` | (none) | 0 |
| `hemocytometer` | (none) | 0 |

**Total affected scenes:** 1

---

## Scenes Quarantined

### well_plate_96_zoom.yaml

**Path:** `content/base_scenes_quarantine/well_plate_96_zoom.yaml`
**Reason:** References now-quarantined object `well_plate_96` at placement level (line 35).

**Quarantine comment added:**
```yaml
# QUARANTINED 2026-05-23: references quarantined object well_plate_96. Restore when the underlying SVG and object YAML land.
```

**Git operation:**
```
RM content/base_scenes/well_plate_96_zoom.yaml -> content/base_scenes_quarantine/well_plate_96_zoom.yaml
```

---

## Codegen Verification

### Object Library

```bash
source source_me.sh && python3 tools/gen_object_library.py
```

**Result:**
- Exit code: 0 OK
- Objects: 74 (4 quarantined)
- Asset specs: 48

### SVG Registry

```bash
source source_me.sh && python3 tools/gen_svg_registry.py
```

**Result:**
- Exit code: 0 OK
- SVG entries: 125

### Scene Index

```bash
source source_me.sh && python3 tools/gen_scene_index.py
```

**Result:**
- Exit code: 0 OK
- Scenes generated: 1 (bench_basic)
- Scenes skipped: 17 (includes well_plate_96_zoom)

**Output:**
```
Generated /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/scenes.ts with 1 scenes, 17 skipped
```

### TypeScript Type Check

```bash
npx tsc --noEmit -p tsconfig.json
```

**Result:** Exit code 0, no errors OK

---

## Scene Count Changes

| Metric | Before A1x | After cascade |
|--------|-----------|--------------|
| Base scenes in `content/base_scenes/` | 19 | 18 |
| Scenes in `content/base_scenes_quarantine/` | 0 | 1 |
| Generated scenes (SCENE_ALLOWLIST) | - | 1 |
| Skipped scenes (SCENES_SKIPPED) | - | 17 |
| **Total scenes in scope** | 19 | 19 |

---

## Downstream Impact Assessment

### Lane D1 (Generalization Scene Selection)

**Risk:** Lane D1 selected scenes for the generalization test set from `content/base_scenes/`. If `well_plate_96_zoom` was selected, it must be re-selected or noted as unavailable.

**Action:** D1 subagent should verify that `well_plate_96_zoom` was not selected. If it was, update the generalization scene set to remove it and re-run the scene selection audit.

### Lane C2 (Playwright Artifact Screenshot)

**Impact:** `bench_basic` is the sole scene in `SCENE_ALLOWLIST`. Playwright screenshots will only cover bench_basic. The 17 skipped scenes (including well_plate_96_zoom) are excluded from the artifact suite.

**Status:** No action needed. Artifact coverage is limited by design (only active scenes are photographed).

### Content Future Work

When `well_plate_96` object SVG is authored and the object YAML is restored from `content/objects_quarantine/`, the scene can be restored from `content/base_scenes_quarantine/` using:
```bash
git mv content/base_scenes_quarantine/well_plate_96_zoom.yaml \
  content/base_scenes/well_plate_96_zoom.yaml
```

---

## Summary

- **Scope:** 19 scenes scanned, 1 affected, 1 quarantined.
- **Method:** Word-boundary grep of object names; git mv + quarantine comment.
- **Results:** All codegen scripts exit 0. TypeScript clean. No validation errors.
- **Risk:** D1 generalization scene set may need to be re-audited to remove well_plate_96_zoom if it was selected.
- **Future:** Scene can be restored when underlying object and SVG are available.

---

## Files Changed

### Moved (git mv)
- `content/base_scenes/well_plate_96_zoom.yaml` -> `content/base_scenes_quarantine/well_plate_96_zoom.yaml`

### Updated
- `docs/active_plans/reports/m2_object_library_content_fix.md` - Added Appendix: Scene Cascade section documenting this fix.
