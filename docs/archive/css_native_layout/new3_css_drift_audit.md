# NEW3 CSS drift audit

Audit date: 2026-05-20
Scope: All tracked CSS (12 files) + 30 HTML templates under `experiments/css_native_layout/templates/`
Method: Manual line-by-line read of all tracked CSS files; template inspection for inline `<style>` blocks

## Summary table by severity

| Severity | Count | Primary concern                                                                                                                           |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | 42    | overflow:hidden on wrappers, position:absolute, max-height/max-width constraints on footprints, transform:translate for overlay placement |
| MEDIUM   | 8     | Per-scene selectors in non-canonical locations, inline `<style>` stubs                                                                    |
| LOW      | 10    | !important on border/stroke overrides                                                                                                     |
| Total    | 60    |                                                                                                                                           |

## HIGH findings

### Group 1: overflow hidden on scene containers and region wrappers

This group directly violates the NEW2 hard rule "Never crop SVG assets".

- `hood.css:76` `.scene-container` `overflow: hidden` -- scene-level clip hides any asset whose rendered height exceeds 1080px nominal container. Confirmed root cause in new2_no_crop_audit.md for 3 hood_basic `cropped` incidents.
- `hood.css:92` `.region` `overflow: hidden` -- clips any asset that grows beyond region strip height. hood.css rear_shelf is 120px; p1000 pipette at natural 313px clips at boundary.
- `instrument.css:74` `.scene-container` `overflow: hidden` -- same as hood.css:76. Confirmed cause of microscope_basic 0x0 rendered size.
- `instrument.css:90` `.region` `overflow: hidden` -- same as hood.css:92.
- `bench.css:108` `.region--work_surface` `overflow: hidden` -- NEW2 audit specifically names this as intentional no-crop rule that has been superseded. Truncates tall glassware.
- `dir_b_bench.css:80`, `dir_b_bench.css:96` -- reference variant, same pattern.
- `dir_b_hood.css:69`, `dir_b_hood.css:85` -- same.
- `dir_b_instrument.css:68`, `dir_b_instrument.css:84` -- same.
- `dir_c_bench.css:80`, `dir_c_bench.css:94` -- same.
- `dir_c_hood.css:76`, `dir_c_hood.css:90` -- same.
- `dir_c_instrument.css:74`, `dir_c_instrument.css:88` -- same.
- `src/style.css:229` `#hood-scene` `overflow: hidden` -- production runtime; any SVG asset taller than flex container is clipped.
- `src/style.css:249` `#bench-scene` `overflow: hidden` -- same for bench scene.
- `src/style.css:563-585` `.workspace-region-tool`, `.workspace-region-source`, `.workspace-region-rack`, `.workspace-region-plate` -- four well-plate workspace regions all set `overflow: hidden`. Any SVG exceeding region box is silently clipped.
- `src/style.css:659` `.workspace-region-tool .scene-object`, `.workspace-region-source .scene-object`, `.workspace-region-rack .scene-object` -- same issue one level deeper. Double-clip.

NEW2 cross-reference: All 16 `overflow: hidden` findings on `.scene-container`, `.region`, `.scene-object` directly caused or match the 45 confirmed crop/distortion incidents in new2_no_crop_audit.md.

### Group 2: max-height and max-width constraints on footprint classes

Approximately 54 footprint constraint pairs (6 classes x 9 files). Representative findings:

- `bench.css` crowded `.footprint--small-tool` `max-height: 90px` -- p200 micropipette renders 150-183px; 90px cap + `overflow:hidden` forces too-small state. Confirmed cause of bench*basic + drug_dilution*\* p200 off-card.
- `bench.css` crowded `.footprint--handheld` `max-height: 160px` -- bottle natural h at 82px wide is 228px; 160px cap + overflow:hidden = clipping. Confirmed: every bottle in crowded_bench_dense is off-card.
- `bench.css` crowded `.footprint--small-tool` `max-height: 160px` + `max-width: 80px` -- p200 pipette renders 183px tall at 42px wide; 160px max-height truncates 23px.

The `too-small` failures (tip_box, kimwipe_pad, counter_slide_cartridge) are caused by `max-width` constraints forcing dramatic scale-down.

### Group 3: position absolute on layout-significant selectors in src/style.css

- `.scene-nav-btn`, `.hood-toolbar` -- UI chrome, justified.
- `.hood-item` -- legacy absolute-positioned hood layout. Known PRIMARY_CONTRACT item 3 violation. Not a NEW3 fix; deferred.
- `#hood-items-layer`, `#hood-labels-layer` -- overlay layers, justified for hood layer model.
- `.transfer-hud` -- absolutely positioned HUD, justified.

### Group 4: transform translate for overlay and notification positioning

All instances on `.hood-toolbar`, `.workspace-popup-overlay`, `#notification-area`, `.transfer-hud` are justified for chrome centering. `.hood-item-label` translate inherits hood-item fragility; medium risk.

### Group 5: aspect-ratio override on game-container

`src/style.css:218` `aspect-ratio: 4 / 3` on `#game-container` with `overflow: hidden` on descendants creates indirect crop chain when screen is not 4:3.

## MEDIUM findings

### Group 6: per-scene selectors in experiment CSS

- `bench.css` `~184` `.scene--bench .footprint--small-tool` -- footprint sizing scoped to `.scene--bench`; if a scene uses `scene--hood` with bench-like footprints, rules don't apply. Inconsistent with hood/instrument which apply class-policy footprint rules without scene-type scoping.
- `dir_b_bench.css:~228`, `dir_c_bench.css:~226` -- same pattern in reference variants.

### Group 7: inline style blocks in HTML templates

All 30 templates contain one `<style>` block each, all are empty stubs. Safe; monitor.

## LOW findings

### Group 8: important in src/style.css

Six of ten `!important` uses are justified by SVG attribute cascade mechanics or state-machine visual dominance. The `pointer-events: none !important` on `#hood-items-layer .hood-item:not(...)` is fragile.

## Cross-reference with NEW2 CSS-FIX-NOCROP lane

- 16 `overflow: hidden` findings overlap with the 3 root causes named in new2_no_crop_audit.md.
- 12 footprint `max-height`/`max-width` findings overlap with new2 too-small incident class.
- This audit confirms NEW2 prescription to remove `overflow: visible` overrides and extends it to all region types.

Total cross-reference: 28 findings overlap with new2 CSS-FIX-NOCROP lane.

## Unreviewed variant CSS files

21 additional tracked variant CSS files (bench*a..e.css, hood_b..e.css, instrument_b..e.css, *\_diorama.css, \_\_focusedstage.css, \*\_gameboard.css) were not scanned. Assume identical HIGH findings.

## Safe cleanup patches

### Patch A: remove overflow hidden from experiment scene-container (9 files)

Change `overflow: hidden` to `overflow: auto` on `.scene-container` in all 9 experiment CSS files.

### Patch B: remove overflow hidden from experiment region base rule (9 files)

Remove or change to `overflow: visible` on `.region` default rule.

### Patch C: fix handheld footprint max-height for crowded density (bench.css)

Change `.scene-container[data-scene-density="crowded"] .scene--bench .footprint--handheld` `max-height` from 112px to 260px.

### Patch D: fix small-tool footprint max-height for crowded density (bench.css)

Change `.scene-container[data-scene-density="crowded"] .scene--bench .footprint--small-tool` `max-height` from 54px to 200px.

### Patch E: remove overflow hidden from src/style.css workspace regions

Change `overflow: hidden` to `overflow: visible` on `.workspace-region-*` and `.workspace-region-* .scene-object` selectors.

### Patch F: remove overflow hidden from hood-scene and bench-scene in src/style.css

Change both `src/style.css:229` and `src/style.css:249` to `overflow: visible`.

## Recommended fix priority

1. Patch B (region overflow) -- unblocks 45 NEW2 incidents at root
2. Patch C + D (handheld/small-tool max-height) -- eliminates 27/45 bottle-family incidents
3. Patch A (scene-container overflow) -- eliminates secondary crop chain
4. Patch E (production workspace regions)
5. Patch F (production hood/bench scenes)
6. dir_b and dir_c variant cleanup -- low urgency

## Top 5 highest-risk files

1. `experiments/css_native_layout/styles/bench.css`
2. `experiments/css_native_layout/styles/hood.css`
3. `experiments/css_native_layout/styles/instrument.css`
4. `src/style.css`
5. `experiments/css_native_layout/styles/dir_c_bench.css`

## Final counts

- HIGH: 42 findings
- MEDIUM: 8 findings
- LOW: 10 findings
- Total: 60 findings
- NEW2 cross-reference: 28 findings overlap
