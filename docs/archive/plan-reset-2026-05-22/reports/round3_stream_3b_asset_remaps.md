# Round 3 Stream 3B - Asset Name Drift Remediation

**Date:** 2026-05-22
**Context:** Eliminate ASSET_NAME_DRIFT placeholder fallbacks (6 cleanest YAML files)
**Status:** COMPLETED

## Summary

Remapped three object YAML files to eliminate placeholder fallback asset_names. Eight fallback instances removed. Build and typecheck both pass.

## Edits Applied

### 1. vortex.yaml

**Before:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: vortex_idle }
      - when: true
        output: { asset_name: vortex_spinning }
```

**After:**
```yaml
visual_states:
  running:
    kind: svg
    cases:
      - when: false
        output: { asset_name: vortex }
      - when: true
        output: { asset_name: vortex }
```

**Fallback instances removed:** 2

---

### 2. microscope.yaml

**Before:**
```yaml
  light_on:
    kind: svg
    cases:
      - when: false
        output: { asset_name: microscope_dark }
      - when: true
        output: { asset_name: microscope_lit }
```

**After:**
```yaml
  light_on:
    kind: svg
    cases:
      - when: false
        output: { asset_name: microscope }
      - when: true
        output: { asset_name: microscope }
```

**Fallback instances removed:** 2

---

### 3. electrode_module.yaml

**Before:**
```yaml
visual_states:
  mounted:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module_mounted }
      - when: false
        output: { asset_name: electrode_module_unmounted }
  cassette_mounted:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module_with_cassette }
      - when: false
        output: { asset_name: electrode_module_without_cassette }
  wing_clamps_open:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module_clamps_open }
      - when: false
        output: { asset_name: electrode_module_clamps_closed }
```

**After:**
```yaml
visual_states:
  mounted:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module }
      - when: false
        output: { asset_name: electrode_module }
  cassette_mounted:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module }
      - when: false
        output: { asset_name: electrode_module }
  wing_clamps_open:
    kind: svg
    cases:
      - when: true
        output: { asset_name: electrode_module }
      - when: false
        output: { asset_name: electrode_module }
```

**Fallback instances removed:** 4

---

## Barrel Export Verification

Confirmed all three required exports exist in `generated/svg_assets/index.ts`:

```
export { SVG_VORTEX } from "./vortex";                    (line 121)
export { SVG_MICROSCOPE } from "./microscope";            (line 62)
export { SVG_ELECTRODE_MODULE } from "./electrode_module"; (line 38)
```

---

## Build & Typecheck Results

**Build Output:**
```
  dist/main.js      2.3mb !
  dist/main.js.map  3.0mb

* Done in 13ms
Built dist/ (GitHub Pages-ready).
```

**Typecheck (`tsc --noEmit`):**
```
(no output = zero errors)
```

---

## Deferred Files

As specified in brief, no edits applied to:
- `content/objects/bottle/ethanol_bottle.yaml` (only `SVG_ETHANOL_SPRAY` exists, not `SVG_ETHANOL_BOTTLE`)
- `content/objects/equipment/hood_surface.yaml` (no hood_surface SVGs in barrel)
- `content/objects/equipment/gel_cassette.yaml` (gel_lane_empty case deferred to gel adapter lane path)

These remain for user decision or future workstreams.

---

## Metrics

| Metric | Value |
| --- | --- |
| YAML files edited | 3 |
| Fallback instances removed | 8 |
| Build status | PASS |
| Typecheck status | PASS |

## Artifact Paths

- Edited files:
  - `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/vortex.yaml`
  - `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/microscope.yaml`
  - `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/electrode_module.yaml`

- Report:
  - `docs/active_plans/reports/round3_stream_3b_asset_remaps.md`
