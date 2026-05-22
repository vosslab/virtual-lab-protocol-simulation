# Round 3 Runtime Quality Initiative: Foundation HTML Wiring

**Scope:** Wire per-protocol HTML generation into the production build pipeline.

**Date:** 2026-05-22

---

## Gap Diagnosis

The repository had a structural capability mismatch:

- `pipeline/build_protocol_html.py` existed and could generate `dist/<protocol_name>.html` per PRIMARY_SPEC convention
- `src/scene_runtime/bundle/entry.ts` exported `loadAndMountByProtocolName()` ready for IIFE bundle consumption
- **BUT:** `build_github_pages.sh` never invoked either the IIFE bundle pass or the Python generator
- **AND:** No IIFE bundle (`dist/runtime.bundle.js`) was produced; only ESM `dist/main.js` existed
- **RESULT:** Every Playwright walker that loaded `dist/<protocol>.html` received 0/N mounted protocols (confirmed by R9 audit rerun and cluster mount audit)

This gap prevented the visible interaction standard (PRIMARY_CONTRACT item 4) from being testable: walkers could not access runtime state through the normal HTML entry path.

---

## Solution Implemented

### 1. build_github_pages.sh Edits

Added two sequential build passes after the existing ESM bundle:

**IIFE bundle pass:**
```bash
npx esbuild "src/scene_runtime/bundle/entry.ts" \
	--bundle \
	--format=iife \
	--global-name=SceneRuntime \
	--target=es2020 \
	--platform=browser \
	--minify \
	--sourcemap \
	--outfile=dist/runtime.bundle.js
```

Produces a classic IIFE that exposes `window.SceneRuntime` with `loadAndMountByProtocolName()` callable from plain `<script>` tags in protocol HTML shells.

**Protocol HTML generation pass:**
```bash
python3 pipeline/build_protocol_html.py --all
```

Scans `content/protocols/` for all `protocol_type: mini_protocol` YAML files and generates one `dist/<protocol_name>.html` per protocol. Each HTML shell:
- Inlines a `<script type="application/json">` containing `{protocol_name}`
- Loads `./runtime.bundle.js`
- Calls `SceneRuntime.loadAndMountByProtocolName(rootElement, protocolName)` inline

**New assertions in build script:**
```bash
test -f dist/runtime.bundle.js
test -f dist/mtt_reagent_prep.html
```

Added as final assertions to catch missing bundle or protocol generation failures during subsequent builds.

### 2. No Source-Code Changes

- No edits to `src/scene_runtime/bundle/entry.ts` (exports already present and correct)
- No edits to `pipeline/build_protocol_html.py` (generator already complete)
- No changes to TypeScript config, package.json, or content specs

---

## Build Execution & Output

**Command:** `bash build_github_pages.sh`

**Build summary:**
```
✓ dist/index.html (481 bytes) — ESM landing page
✓ dist/main.js (2.3 MB) — ESM bundle for index.html
✓ dist/main.js.map (3.0 MB) — ESM source map
✓ dist/runtime.bundle.js (2.4 MB / 2,416,160 bytes) — IIFE runtime bundle
✓ dist/runtime.bundle.js.map (3.0 MB) — IIFE source map
✓ dist/style.css (42 KB) — shared stylesheet
✓ dist/.nojekyll (0 bytes) — GitHub Pages marker
✓ dist/<protocol_name>.html × 26 files (~2.4 KB each)
```

**Protocol HTML files generated (26 mini-protocols):**

1. cell_seeding_plate_setup.html
2. drug_dilution_setup.html
3. mtt_plate_reaction.html
4. mtt_reagent_prep.html
5. mtt_solubilization_readout.html
6. passage_hood_detachment.html
7. passage_pellet_reseed.html
8. plate_drug_treatment_drug_addition.html
9. plate_drug_treatment_media_adjustment.html
10. sdspage_assemble_electrode_module.html
11. sdspage_attach_lid_and_leads.html
12. sdspage_destain_gel_rock.html
13. sdspage_destain_gel_setup.html
14. sdspage_extract_gel_from_cassette.html
15. sdspage_fill_tank_buffer.html
16. sdspage_heat_denature_samples.html
17. sdspage_image_gel.html
18. sdspage_load_protein_ladder.html
19. sdspage_load_sample_single_lane.html
20. sdspage_prepare_gel_cassette.html
21. sdspage_prepare_running_buffer.html
22. sdspage_prepare_sample_mix_single_lane.html
23. sdspage_recycle_buffer.html
24. sdspage_run_electrophoresis.html
25. sdspage_stain_gel.html
26. trypan_blue_counting.html

---

## Smoke Test: Mount Verification

**Script:** `tests/playwright/_temp_foundation_smoke.mjs`

**Test path:**
1. Load `dist/mtt_reagent_prep.html` in headless Chromium
2. Verify `window.SceneRuntime` global exists (IIFE bundle was parsed and executed)
3. Verify `window.SceneRuntime.loadAndMountByProtocolName` is callable
4. Verify `window.__RUNTIME_PROTOCOL_CONFIG` is set after page settles (proof of successful mount)

**Results:**
```
[1] Loading protocol HTML: file://.../dist/mtt_reagent_prep.html
[2] Checking window.SceneRuntime availability...
    ✓ window.SceneRuntime is available
[3] Checking window.SceneRuntime.loadAndMountByProtocolName...
    ✓ window.SceneRuntime.loadAndMountByProtocolName is callable
[4] Checking window.__RUNTIME_PROTOCOL_CONFIG...
    ✓ window.__RUNTIME_PROTOCOL_CONFIG is set
    - sceneId: mtt_reagent_prep_bench_workspace
    - protocol name: mtt_reagent_prep
    - entry step: pick_up_mtt_powder

All smoke tests passed ✓
Status: mount=yes
```

---

## Artifacts

| Artifact | Path | Purpose |
| --- | --- | --- |
| Modified build script | `build_github_pages.sh` | Wires IIFE and HTML generation into pipeline |
| IIFE runtime bundle | `dist/runtime.bundle.js` (2.4 MB) | Shared scene runtime for all per-protocol HTML |
| Per-protocol HTML (26) | `dist/<protocol_name>.html` | Individual protocol entry points |
| Smoke test | `tests/playwright/_temp_foundation_smoke.mjs` | Verifies mount behavior |
| This report | `docs/active_plans/reports/round3_foundation_html_wiring.md` | Documentation |

---

## Status

**Build success:** YES

**Per-protocol HTML count:** 26

**Runtime bundle bytes:** 2,416,160 (2.4 MB minified + sourcemap)

**Smoke mount status:** YES (window.__RUNTIME_PROTOCOL_CONFIG verified)

**Ready for:** Playwright walker integration and cluster re-audit.

---

## Next Steps

1. **Cluster re-audit:** Rerun R9 walker suite against per-protocol HTML files; expect mount=yes for all 26 protocols.
2. **Visible interaction validation:** Confirm walkers can interact with scenes, click objects, and advance steps via the normal UI path (not internal APIs).
3. **Performance check:** Verify runtime bundle footprint acceptable for page load (currently 2.4 MB minified; source maps are development-only).
4. **Cleanup:** Delete `tests/playwright/_temp_foundation_smoke.mjs` after final validation (it is an underscore-prefixed scratch file).

---

## Notes

- No structural issues encountered during bundle or generation.
- Dynamic `import()` in `entry.ts` **works** with IIFE format via esbuild (the tool resolves relative imports and inlines them into the IIFE).
- Protocol HTML shells use standard document structure: no custom loaders, no unusual bundling, no per-protocol special cases.
- The solution aligns with PRIMARY_SPEC: each protocol compiles to its own HTML file, and the layout engine and material convention are enforced at runtime.
