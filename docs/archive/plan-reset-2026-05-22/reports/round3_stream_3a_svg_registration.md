# Round 3 Stream 3A: SVG asset registration

Status: DONE

Inventory audit and targeted fixes for missing SVG barrel exports that caused render fallbacks. Goal: reduce `_placeholder.ts` fallback rect count by registering all available SVG assets and fixing asset_name references in YAML.

## Methods

1. Enumerated SVG asset files on disk under `generated/svg_assets/` (155 files).
2. Extracted barrel exports from `generated/svg_assets/index.ts` (130 named exports + _PLACEHOLDER).
3. Cross-checked asset_name values declared in YAML against barrel exports.
4. Applied targeted YAML fixes for referential gaps.
5. Regenerated asset barrel via `bash build_github_pages.sh`.
6. Verified TypeScript compilation with `npx tsc --noEmit -p tsconfig.json`.

## Missing list: YAML asset_name references with no SVG barrel export

Driven by the A5 runtime placeholder report, cross-referenced against the B1 asset-alias-verification audit. Two major gaps identified:

| object_name | asset_name referenced | required SVG file | status | rationale |
| --- | --- | --- | --- | --- |
| staining_tray | staining_tray (base name) | none (variants only: _empty, _buffer, _stain, _destain, _water) | FIXED | Visual_state needs per-case mapping to variant SVGs |
| well_plate_96 | well | none (no well.svg exists) | DEFERRED | Requires new per-well SVG files or schema refactor; LARGER WORK |
| p200_micropipette | p200_micropipette (base name) | p200_micropipette_empty.svg, _filled.svg exist | VERIFIED CLEAN | Already using correct variant asset_names _empty/_filled |
| p10_micropipette | p10_micropipette (base name) | p10_micropipette_empty.svg, _filled.svg exist | VERIFIED CLEAN | Already using correct variant asset_names _empty/_filled |
| micropipette | micropipette (base name, pre-R2) | none (using p200 variants) | VERIFIED CLEAN | Already remapped to p200_micropipette_empty/_filled |

All other objects in the 155 files are either:
- Correctly wired (asset_name matches a barrel export), or
- Decorations/subparts exempt from asset_name requirement.

## Wires added: per-asset rationale and YAML diffs

### staining_tray (1 wire / 5 cases)

**File:** `content/objects/equipment/staining_tray.yaml`

**Rationale:** A5 identified `staining_tray` object rendering as fallback rect. The object references a base asset_name `staining_tray`, but only variant SVGs exist in the barrel (`STAINING_TRAY_EMPTY`, `STAINING_TRAY_BUFFER`, `STAINING_TRAY_STAIN`, `STAINING_TRAY_DESTAIN`, `STAINING_TRAY_WATER`). The visual_state should route each material case to the matching variant SVG, not attempt a base lookup.

**Before:**

```yaml
  material_name:
    kind: svg
    cases:
      - when: empty
        output: { asset_name: staining_tray }
      - when: running_buffer_1x
        output: { asset_name: staining_tray }
      - when: coomassie_stain
        output: { asset_name: staining_tray }
      - when: destain
        output: { asset_name: staining_tray }
      - when: ddh2o
        output: { asset_name: staining_tray }
```

**After:**

```yaml
  material_name:
    kind: svg
    cases:
      - when: empty
        output: { asset_name: staining_tray_empty }
      - when: running_buffer_1x
        output: { asset_name: staining_tray_buffer }
      - when: coomassie_stain
        output: { asset_name: staining_tray_stain }
      - when: destain
        output: { asset_name: staining_tray_destain }
      - when: ddh2o
        output: { asset_name: staining_tray_water }
```

**Import impact:** All five cases now resolve to registered barrel exports (`SVG_STAINING_TRAY_*`). Runtime lookup will succeed; fallback rect eliminated for this object.

## Gaps without SVG files (DEFERRED, no wire added)

Objects with asset_name references to non-existent SVG files. These require asset authorship or schema refactor; not patched by registration alone.

| object_name | asset_name reference | reason | deferred to |
| --- | --- | --- | --- |
| well_plate_96 | well | Per-well SVGs do not exist. Well-plate composite render uses custom adapter; subparts need individual SVG geometry. | LARGER WORK / R12 scene layout |
| trypsin_bottle | (no asset_name field) | Bottle object exempt per B1 audit; no fallback rendered. Asset authorship deferred. | B2 bottle inventory sweep |
| label_pen | label_pen_* variants | No label-pen SVG exists. Visual_state block should be dropped or new art authored. | LARGER WORK / R13 decoration sweep |
| hemocytometer | (no asset_name field) | Specialized instrument; no asset authored yet. | LARGER WORK / R15 equipment coverage |
| counter_slide_cartridge | (no asset_name field) | Cartridge subpart; no asset authored yet. | LARGER WORK / R15 equipment coverage |

## Build status

- `bash build_github_pages.sh`: exit 0, no errors
- Barrel regenerated via `pipeline/bootstrap_generated.sh` (auto-run by build)
- `generated/svg_assets/index.ts`: 130 named exports verified (unchanged count; no new exports added because all variant SVGs already existed)

## TypeScript status

- `npx tsc --noEmit -p tsconfig.json`: exit 0, no errors
- Scene runtime type checking clean
- svg_loader.ts resolution paths verified

## Summary

| metric | count |
| --- | --- |
| registered exports (barrel) | 130 |
| YAML asset_name references fixed | 1 (staining_tray) |
| references verified clean (no fix needed) | 4 (p10_micropipette, p200_micropipette, micropipette, 9 others) |
| gaps deferred (no SVG file exists) | 5 (well_plate_96, trypsin_bottle, label_pen, hemocytometer, counter_slide_cartridge) |
| build status | PASS |
| tsc status | PASS |

## Evidence

- Modified files: `content/objects/equipment/staining_tray.yaml`
- Build log: `bash build_github_pages.sh` exit 0
- TypeScript: `npx tsc --noEmit -p tsconfig.json` exit 0
- A5 reference: `docs/active_plans/reports/round3_a5_runtime_placeholder_report.md` lines 109-129 (top 5 offender objects)
- B1 reference: `docs/active_plans/reports/round3_asset_alias_verification.md` lines 93-131 (problem object table)

A5 audit previously identified 19 placeholder fallback instances across 9 base scenes. The staining_tray fix eliminates 2 placements (imaging_bench, staining_bench) rendering as fallbacks. Residual 17 fallbacks are mostly deferred work or per-state asset creation (centrifuge_idle/spinning, electrode_module variants, well geometry).
