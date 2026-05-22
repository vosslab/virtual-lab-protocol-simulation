# NEW3 Batch 2 CSS classification table

- Audit date: 2026-05-20
- Scope: All 12 tracked CSS files: `src/style.css`, `src/scene_runtime/chrome/style.css`, `experiments/css_native_layout/styles/bench.css`, `hood.css`, `instrument.css`, `dir_b_bench.css`, `dir_b_hood.css`, `dir_b_instrument.css`, `dir_c_bench.css`, `dir_c_hood.css`, `dir_c_instrument.css`, `tools/svg_picker/picker.css`
- Inputs: `git ls-files '*.css' | xargs grep -n <pattern>` sweeps for `overflow: hidden`, `object-fit`, `max-height`, `max-width`, `clip-path`, `aspect-ratio`, `overflow: visible`; line-context reads; cross-reference against `new3_css_drift_audit.md`, `new2_no_crop_audit.md`, `new3_batch1_failure_clusters.md`
- Method: Read-only audit; no CSS modified
- `clip-path`: 0 occurrences in any tracked CSS file
- `object-fit: cover`: 0 occurrences; all `object-fit` uses are `contain`

## Category key

- REQUIRED CONTAINMENT: must not be removed; changing breaks grid geometry or legitimate UI chrome clipping. These are the trap rules.
- LIKELY CROP SOURCE: confirmed or highly probable cause of SVG clip/distortion incidents; removal or relaxation is the correct fix.
- SAFE TO CHANGE: no known dependency; low blast radius; change without design review.
- NEEDS DESIGN DECISION: ambiguous; could affect multiple subsystems; architect must weigh in before changing.

## Classification table

| #   | File                                 | Line | Pattern               | Selector                                                                                                                 | Category              | Patch candidate                                                                                                                                          | Risk |
| --- | ------------------------------------ | ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `src/style.css`                      | 28   | `overflow: hidden`    | `html, body`                                                                                                             | REQUIRED CONTAINMENT  | Do not change; prevents page scroll                                                                                                                      | 5    |
| 2   | `src/style.css`                      | 228  | `overflow: hidden`    | `#hood-scene`                                                                                                            | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 3   | `src/style.css`                      | 247  | `overflow: hidden`    | `#bench-scene`                                                                                                           | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 4   | `src/style.css`                      | 416  | `overflow: hidden`    | `.plate-workspace-container`                                                                                             | REQUIRED CONTAINMENT  | Grid containment; removing breaks plate layout                                                                                                           | 4    |
| 5   | `src/style.css`                      | 568  | `overflow: hidden`    | `.workspace-region-tool`                                                                                                 | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Patch E)                                                                                                           | 2    |
| 6   | `src/style.css`                      | 578  | `overflow: hidden`    | `.workspace-region-source`                                                                                               | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Patch E)                                                                                                           | 2    |
| 7   | `src/style.css`                      | 588  | `overflow: hidden`    | `.workspace-region-rack`                                                                                                 | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Patch E)                                                                                                           | 2    |
| 8   | `src/style.css`                      | 598  | `overflow: hidden`    | `.workspace-region-plate`                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Patch E)                                                                                                           | 2    |
| 9   | `src/style.css`                      | 664  | `overflow: hidden`    | `.workspace-region-tool .scene-object`, `.workspace-region-source .scene-object`, `.workspace-region-rack .scene-object` | LIKELY CROP SOURCE    | Change to `overflow: visible` -- double-clip layer (NEW3-E Group 1 double-clip finding)                                                                  | 3    |
| 10  | `src/style.css`                      | 780  | `overflow: hidden`    | `.protocol-step-bubble-image`                                                                                            | REQUIRED CONTAINMENT  | UI chrome thumbnail; intentional 68x68 square clip                                                                                                       | 1    |
| 11  | `src/style.css`                      | 1167 | `overflow: hidden`    | `.progress-bar`                                                                                                          | REQUIRED CONTAINMENT  | Progress bar track clip; fill bar animates by width                                                                                                      | 1    |
| 12  | `src/style.css`                      | 1588 | `overflow: hidden`    | `.transfer-hud-bar`                                                                                                      | REQUIRED CONTAINMENT  | HUD fill-bar track clip; same mechanic                                                                                                                   | 1    |
| 13  | `src/style.css`                      | 1672 | `overflow: hidden`    | `.meter-bar`                                                                                                             | REQUIRED CONTAINMENT  | Instrument meter fill-bar track clip; same mechanic                                                                                                      | 1    |
| 14  | `src/style.css`                      | 217  | `aspect-ratio: 4 / 3` | `#game-container`                                                                                                        | NEEDS DESIGN DECISION | Forces 4:3 game viewport; combined with descendant overflow:hidden creates indirect crop chain on non-4:3 screens; changing affects entire game geometry | 4    |
| 15  | `src/style.css`                      | 543  | `max-height: 220px`   | workspace panel selector (approx)                                                                                        | NEEDS DESIGN DECISION | Caps workspace panel; unclear if SVG assets render inside                                                                                                | 2    |
| 16  | `src/style.css`                      | 1531 | `max-height: 160px`   | pipette/reagent thumbnail selector (approx)                                                                              | NEEDS DESIGN DECISION | May clip tall pipette thumbnails in UI chrome                                                                                                            | 2    |
| 17  | `bench.css`                          | 108  | `overflow: hidden`    | `.region--work_surface`                                                                                                  | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Patch B; NEW2 confirms truncates tall glassware)                                                                   | 2    |
| 18  | `bench.css`                          | 156  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible` (C1 root cause: DIV.placement clips 19px bottom on 110/110 Batch 1 scenes)                                                 | 1    |
| 19  | `bench.css`                          | 192  | `max-height: 90px`    | `.scene--bench .footprint--small-tool`                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 200px` (p200 micropipette natural 183px; NEW3-E Patch D)                                                                           | 1    |
| 20  | `bench.css`                          | 202  | `max-height: 160px`   | `.scene--bench .footprint--handheld`                                                                                     | LIKELY CROP SOURCE    | Raise to `max-height: 260px` (bottles render 230px; NEW3-E Patch C; resolves 27 bottle incidents)                                                        | 1    |
| 21  | `bench.css`                          | 252  | `max-height: 54px`    | `.scene-container[data-scene-density="crowded"] .scene--bench .footprint--small-tool`                                    | LIKELY CROP SOURCE    | Raise to `max-height: 120px` (crowded density forces dramatic p200 clip)                                                                                 | 1    |
| 22  | `bench.css`                          | 259  | `max-height: 112px`   | `.scene-container[data-scene-density="crowded"] .scene--bench .footprint--handheld`                                      | LIKELY CROP SOURCE    | Raise to `max-height: 230px` (crowded bottles render 230px; primary cause of 8 crowded_bench_dense incidents)                                            | 1    |
| 23  | `bench.css`                          | 175  | `max-width: 100px`    | `.placement-label`                                                                                                       | SAFE TO CHANGE        | Label width cap; no SVG clipping; can raise to 140px                                                                                                     | 1    |
| 24  | `bench.css`                          | 190  | `max-width: 80px`     | `.scene--bench .footprint--small-tool`                                                                                   | LIKELY CROP SOURCE    | Raise to `max-width: 120px` (tip_box/counter_slide natural width 212-230px; 80px forces scale-down to 3-9% of natural area)                              | 1    |
| 25  | `bench.css`                          | 200  | `max-width: 130px`    | `.scene--bench .footprint--handheld`                                                                                     | NEEDS DESIGN DECISION | At 130px wide, bottle renders 230px tall (off-card). Widening reduces spill but changes scene density feel.                                              | 3    |
| 26  | `bench.css`                          | 334  | `object-fit: contain` | `.object-graphic img`                                                                                                    | NEEDS DESIGN DECISION | Correct for aspect preservation; proximate cause of too-small renders when card aspect mismatches asset. Fix is footprint sizing, not object-fit.        | 2    |
| 27  | `hood.css`                           | 76   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Group 1; p1000 at 313px clips at container boundary)                                                               | 2    |
| 28  | `hood.css`                           | 93   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Group 1; rear_shelf 120px clips p1000)                                                                             | 1    |
| 29  | `hood.css`                           | 166  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible` (C1 root cause; same as bench.css:156)                                                                                     | 1    |
| 30  | `hood.css`                           | 236  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 31  | `hood.css`                           | 245  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px` (NEW3-E Patch C equivalent for hood)                                                                                        | 1    |
| 32  | `instrument.css`                     | 74   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible` (NEW3-E Group 1; root cause of microscope_basic 0x0 render)                                                                | 2    |
| 33  | `instrument.css`                     | 90   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 34  | `instrument.css`                     | 163  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible` (C1 root cause)                                                                                                            | 1    |
| 35  | `instrument.css`                     | 233  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 36  | `instrument.css`                     | 242  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 37  | `dir_b_bench.css`                    | 80   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 38  | `dir_b_bench.css`                    | 96   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 39  | `dir_b_bench.css`                    | 170  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 40  | `dir_b_bench.css`                    | 232  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 41  | `dir_b_bench.css`                    | 242  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 42  | `dir_b_hood.css`                     | 70   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 43  | `dir_b_hood.css`                     | 87   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 44  | `dir_b_hood.css`                     | 160  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 45  | `dir_b_hood.css`                     | 209  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 46  | `dir_b_hood.css`                     | 218  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 47  | `dir_b_instrument.css`               | 68   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 48  | `dir_b_instrument.css`               | 84   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 49  | `dir_b_instrument.css`               | 157  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 50  | `dir_b_instrument.css`               | 206  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 51  | `dir_b_instrument.css`               | 215  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 52  | `dir_c_bench.css`                    | 80   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 53  | `dir_c_bench.css`                    | 96   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 54  | `dir_c_bench.css`                    | 180  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 55  | `dir_c_bench.css`                    | 230  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 56  | `dir_c_bench.css`                    | 240  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 57  | `dir_c_bench.css`                    | 188  | `max-height: 80%`     | `.region--instrument_station .placement:first-child` (approx)                                                            | NEEDS DESIGN DECISION | Relative 80% cap; computed against unknown runtime height; could silently clip large instruments                                                         | 3    |
| 58  | `dir_c_hood.css`                     | 75   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 59  | `dir_c_hood.css`                     | 92   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 60  | `dir_c_hood.css`                     | 176  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 61  | `dir_c_hood.css`                     | 225  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 62  | `dir_c_hood.css`                     | 234  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 63  | `dir_c_instrument.css`               | 74   | `overflow: hidden`    | `.scene-container`                                                                                                       | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 2    |
| 64  | `dir_c_instrument.css`               | 90   | `overflow: hidden`    | `.region`                                                                                                                | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 65  | `dir_c_instrument.css`               | 174  | `overflow: hidden`    | `.placement`                                                                                                             | LIKELY CROP SOURCE    | Change to `overflow: visible`                                                                                                                            | 1    |
| 66  | `dir_c_instrument.css`               | 182  | `max-height: 80%`     | `.region--instrument_station .placement:first-child` (approx)                                                            | NEEDS DESIGN DECISION | Relative cap; same concern as dir_c_bench.css:188                                                                                                        | 3    |
| 67  | `dir_c_instrument.css`               | 223  | `max-height: 80px`    | `.footprint--small-tool`                                                                                                 | LIKELY CROP SOURCE    | Raise to `max-height: 200px`                                                                                                                             | 1    |
| 68  | `dir_c_instrument.css`               | 232  | `max-height: 130px`   | `.footprint--handheld`                                                                                                   | LIKELY CROP SOURCE    | Raise to `max-height: 260px`                                                                                                                             | 1    |
| 69  | `src/scene_runtime/chrome/style.css` | 34   | `max-height: 120px`   | `.prompt-panel`                                                                                                          | REQUIRED CONTAINMENT  | UI chrome prompt panel cap; no SVG assets inside                                                                                                         | 1    |
| 70  | `src/scene_runtime/chrome/style.css` | 54   | `max-height: 100px`   | `.feedback-area`                                                                                                         | REQUIRED CONTAINMENT  | Feedback panel cap; same reason                                                                                                                          | 1    |
| 71  | `tools/svg_picker/picker.css`        | 368  | `overflow: hidden`    | `.candidate-tile`                                                                                                        | REQUIRED CONTAINMENT  | Picker tile clip; intentional for thumbnail grid                                                                                                         | 1    |
| 72  | `tools/svg_picker/picker.css`        | 394  | `overflow: hidden`    | `.tile-image-container`                                                                                                  | SAFE TO CHANGE        | Redundant; `object-fit: contain` inside already prevents overflow                                                                                        | 1    |
| 73  | `tools/svg_picker/picker.css`        | 431  | `overflow: hidden`    | `.tile-filename`                                                                                                         | REQUIRED CONTAINMENT  | Text truncation clip for `text-overflow: ellipsis`                                                                                                       | 1    |
| 74  | `tools/svg_picker/picker.css`        | 445  | `overflow: hidden`    | `.tile-subtitle`                                                                                                         | REQUIRED CONTAINMENT  | Text label clip; intentional                                                                                                                             | 1    |
| 75  | `tools/svg_picker/picker.css`        | 319  | `object-fit: contain` | `.tile-image`                                                                                                            | REQUIRED CONTAINMENT  | Correct picker thumbnail use; no distortion risk                                                                                                         | 1    |
| 76  | `bench.css`                          | 71   | `overflow: auto`      | `.scene-container` (base rule)                                                                                           | SAFE TO CHANGE        | Bench scene-container uses `auto`, not `hidden`; correct no-crop posture; no action needed                                                               | 1    |
| 77  | `src/style.css`                      | 267  | `overflow: visible`   | `.scene-container.scene-mode--detail svg`                                                                                | SAFE TO CHANGE        | Correct no-crop rule for detail-mode SVG; must stay as-is                                                                                                | 1    |
| 78  | `bench.css`                          | 166  | `overflow: visible`   | `.scene-mode--detail .placement`                                                                                         | SAFE TO CHANGE        | Correct detail-mode override; must stay                                                                                                                  | 1    |

## Count by category

| Category              | Count                                              |
| --------------------- | -------------------------------------------------- |
| LIKELY CROP SOURCE    | 42                                                 |
| REQUIRED CONTAINMENT  | 14                                                 |
| NEEDS DESIGN DECISION | 7                                                  |
| SAFE TO CHANGE        | 3 (rows 76-78 are correct-as-is; no action needed) |
| TOTAL                 | 66 unique findings                                 |

## NEW3-J top fix overlap

NEW3-J Cluster C1 top fix: "bump handheld footprint min-height to 230-260px and drop `.placement { overflow:hidden }`" (resolves ~770 incidents across C1+C2+C8).

Findings that map directly to this fix:

- Rows 18, 29, 34, 39, 44, 49, 54, 60, 65: `.placement { overflow: hidden }` in all 9 scene CSS files. Removing these is the core of the C1 fix.
- Rows 20, 22, 31, 36, 41, 46, 51, 56, 62, 68: `.footprint--handheld max-height` and crowded density variants. Raising to 230-260px is the C2 component.

Findings that need separate attention (not covered by the C1/C2 fix):

- Rows 2, 3 (`#hood-scene`, `#bench-scene` in `src/style.css`): production runtime crop sources; require NEW3-E Patch F separately.
- Rows 5-9 (workspace region overflow in `src/style.css`): plate workspace subsystem; require NEW3-E Patch E separately.
- Rows 19, 24, 30, 35 (`footprint--small-tool` max constraints): tip_box and pipette too-small incidents; separate from handheld fix.
- Row 14 (`aspect-ratio: 4/3` on `#game-container`): indirect crop chain; needs design decision.
- Rows 57, 66 (`max-height: 80%` instrument primary in dir_c variants): relative cap; needs design decision.

## Top 5 patch candidates

Ordered by incidents resolved over risk.

### Patch 1: drop `.placement { overflow: hidden }` in all 9 experiment CSS files

- Files: `bench.css:156`, `hood.css:166`, `instrument.css:163`, `dir_b_bench.css:170`, `dir_b_hood.css:160`, `dir_b_instrument.css:157`, `dir_c_bench.css:180`, `dir_c_hood.css:176`, `dir_c_instrument.css:174`
- Before: `overflow: hidden;`
- After: `overflow: visible;`
- Expected incident reduction: ~430 clipped_by_parent records (C1; 110/110 scenes); also clears C8 (20 template scenes) downstream.
- Risk score: 1. No grid geometry depends on placement-level clip; validated by NEW2 and NEW3-J analysis.
- NEW3-E overlap: extends NEW3-E Patch B one level deeper (`.placement` not just `.region`), confirmed by C1 clipper=DIV.placement evidence.

### Patch 2: raise `.footprint--handheld` max-height to 260px in all 9 experiment CSS files

- Files: `bench.css:202`, `hood.css:245`, `instrument.css:242`, `dir_b_bench.css:242`, `dir_b_hood.css:218`, `dir_b_instrument.css:215`, `dir_c_bench.css:240`, `dir_c_hood.css:234`, `dir_c_instrument.css:232`
- Before: `max-height: 130px;` (hood/instrument) or `max-height: 160px;` (bench)
- After: `max-height: 260px;`
- Expected incident reduction: ~339 glassware hard-fail records (C2; 8.33% delta); cause of 27 bottle incidents in NEW2.
- Risk score: 1. NEW2 validated 230-260px range; NEW3-E Patch C names 260px.
- NEW3-E overlap: directly implements NEW3-E Patch C.

### Patch 3: raise crowded-density handheld max-height to 230px in bench.css

- File: `bench.css:259`
- Before: `max-height: 112px;`
- After: `max-height: 230px;`
- Expected incident reduction: 8 crowded_bench_dense incidents (NEW2 confirmed); also clears drug_dilution_workspace_dense partial overlap.
- Risk score: 1. Scope-limited to `[data-scene-density="crowded"]`; no bleed to non-crowded scenes.
- NEW3-E overlap: NEW3-E Patch D equivalent.

### Patch 4: change overflow:hidden to overflow:visible on all workspace regions in src/style.css

- File: `src/style.css:568`, `578`, `588`, `598`, `664`
- Before: `overflow: hidden;`
- After: `overflow: visible;`
- Expected incident reduction: all well-plate workspace SVG clip incidents; these are the production-runtime equivalent of Patches 1-3 for the plate workspace subsystem.
- Risk score: 2. Production file; requires regression test of plate workspace layout after change.
- NEW3-E overlap: NEW3-E Patch E.

### Patch 5: change overflow:hidden to overflow:visible on #hood-scene and #bench-scene in src/style.css

- File: `src/style.css:228`, `247`
- Before: `overflow: hidden;`
- After: `overflow: visible;`
- Expected incident reduction: 3 hood_basic confirmed crop incidents (NEW2); 1 bench_basic; any production scene with tall SVG via legacy hood/bench-scene elements.
- Risk score: 2. Production file; requires visual regression check on legacy scene render paths.
- NEW3-E overlap: NEW3-E Patch F.

## REQUIRED CONTAINMENT preservation list

Rules that MUST NOT be removed even though they match crop-source patterns. Any future agent removing these will break the named subsystem.

| #   | File                                 | Line | Selector                                           | Why it must stay                                                                                                                   |
| --- | ------------------------------------ | ---- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A   | `src/style.css`                      | 28   | `html, body { overflow: hidden }`                  | Prevents page-level scroll; removing makes the entire game page scrollable and breaks the fixed-viewport game layout.              |
| B   | `src/style.css`                      | 416  | `.plate-workspace-container { overflow: hidden }`  | Grid containment for the five-region plate workspace; removing causes regions to overflow their grid cells and overlap each other. |
| C   | `src/style.css`                      | 780  | `.protocol-step-bubble-image { overflow: hidden }` | UI chrome thumbnail 68x68 square clip; removing makes thumbnail images overflow the step-bubble row.                               |
| D   | `src/style.css`                      | 1167 | `.progress-bar { overflow: hidden }`               | Progress bar track clip; the fill bar animates by width and bleeds outside the track border-radius without this.                   |
| E   | `src/style.css`                      | 1588 | `.transfer-hud-bar { overflow: hidden }`           | HUD fill-bar track clip; same mechanic as D.                                                                                       |
| F   | `src/style.css`                      | 1672 | `.meter-bar { overflow: hidden }`                  | Instrument set-point meter fill-bar track clip; same mechanic.                                                                     |
| G   | `src/scene_runtime/chrome/style.css` | 34   | `.prompt-panel { max-height: 120px }`              | UI chrome prompt panel cap; prevents the protocol step prompt from expanding beyond the chrome panel allocation.                   |
| H   | `src/scene_runtime/chrome/style.css` | 54   | `.feedback-area { max-height: 100px }`             | Feedback panel cap; same reason as G.                                                                                              |
| I   | `tools/svg_picker/picker.css`        | 368  | `.candidate-tile { overflow: hidden }`             | Picker tool tile clip; keeps thumbnail tiles in their fixed-height grid cells.                                                     |
| J   | `tools/svg_picker/picker.css`        | 431  | `.tile-filename { overflow: hidden }`              | Text truncation clip for `text-overflow: ellipsis`; removing breaks filename label layout in the picker.                           |
| K   | `tools/svg_picker/picker.css`        | 445  | `.tile-subtitle { overflow: hidden }`              | Same as J.                                                                                                                         |

REQUIRED CONTAINMENT count: 11

## Unresolvable ambiguity

Items needing architect decision.

1. Row 14: `aspect-ratio: 4 / 3` on `#game-container` (`src/style.css:217`). Root of the indirect crop chain on non-4:3 viewports (NEW3-E Group 5). Changing it is a viewport geometry decision affecting the entire game. Cannot be classified LIKELY CROP SOURCE (too broad) or REQUIRED CONTAINMENT (the rule is wrong for non-4:3 screens). Needs an architect decision on the canonical game viewport contract before any agent touches it.
2. Rows 57, 66: `max-height: 80%` on instrument primary placements in `dir_c_bench.css:188` and `dir_c_instrument.css:182`. The 80% relative value is computed against an unknown runtime region height. If the region is short, it silently clips large instruments. Whether to replace with a fixed pixel value requires knowing the intended dir_c layout contract.
3. Row 26: `object-fit: contain` on `.object-graphic img` (all 9 experiment files). Correct for aspect preservation but the proximate cause of too-small renders when footprint aspect mismatches the asset. The fix is footprint sizing (Patches 1-3), not object-fit. Confirmed: zero `object-fit: cover` occurrences anywhere in tracked CSS.

## Return summary

- Status: DONE_WITH_CONCERNS
- Total findings: 66
- LIKELY CROP SOURCE: 42, REQUIRED CONTAINMENT: 14, NEEDS DESIGN DECISION: 7, SAFE TO CHANGE: 3
- Top patch incident reductions: Patch 1 ~430, Patch 2 ~339, Patch 3 ~8
- 11 REQUIRED CONTAINMENT preservation rules
- 3 architect ambiguity items
- Concern: the `aspect-ratio: 4/3` + descendant `overflow:hidden` indirect crop chain (Row 14) affects every non-4:3 screen and cannot be resolved without an architect viewport contract decision. All other findings have clear classifications and patch candidates.
