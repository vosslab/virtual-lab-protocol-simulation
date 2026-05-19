# NEW0 reproducible evidence package

**Status:** Evidence complete. Provisional recommendation recorded. No production promotion.

**Date produced:** 2026-05-18

**Scope:** CSS-native layout prototype (NEW0) under `experiments/css_native_layout/`.
Compares three layout directions across 10 scenes using precheck diagnostics and screenshots.
This document is the decision input; it is not a promotion decision.

---

## 1. Contract status

NEW0 is NOT contract-compliant under
[docs/PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md) item 3:

> "Scene object layout is handled by the layout engine. Scenes must use the layout engine
> for positioning clickable objects."

CSS-native layout bypasses the layout engine entirely. Objects are positioned by
CSS Grid and Flexbox rules, not by YAML-declared layout primitives. Promoting NEW0
to production would require either:

- Amending contract item 3 (requires user approval), or
- Integrating the NEW0 CSS model as the layout engine's output backend
  (YAML declares regions and footprint classes; engine emits the CSS at build time).

Until one of those paths is chosen, NEW0 remains an experiment.
No production files were modified during this evidence package production.

---

## 2. What is reproducible

The following artifacts are under git tracking (`.gitignore` allow-list):

**CSS (6 files, tracked):**
- `experiments/css_native_layout/styles/bench.css` (Direction A baseline)
- `experiments/css_native_layout/styles/hood.css`
- `experiments/css_native_layout/styles/instrument.css`
- `experiments/css_native_layout/styles/dir_b_bench.css`
- `experiments/css_native_layout/styles/dir_b_hood.css`
- `experiments/css_native_layout/styles/dir_b_instrument.css`
- `experiments/css_native_layout/styles/dir_c_bench.css`
- `experiments/css_native_layout/styles/dir_c_hood.css`
- `experiments/css_native_layout/styles/dir_c_instrument.css`

**HTML templates (tracked):**
- `experiments/css_native_layout/templates/*.html` (8 Direction A templates)
- `experiments/css_native_layout/templates/dir_b/*.html` (10 Direction B templates)
- `experiments/css_native_layout/templates/dir_c/*.html` (10 Direction C templates)

**Scene YAML (tracked):**
- `experiments/css_native_layout/scenes/crowded_bench_dense.yaml`
- `experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml`

**Documentation (tracked):**
- `experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md`
- `experiments/css_native_layout/precheck.mjs` (1258-line diagnostic runner)

**Generated outputs (gitignored, reproducible on demand):**
- `test-results/new0_css_native/dir_a/` (screenshots, visual_audit.json, visual_audit.md)
- `test-results/new0_css_native/dir_b/`
- `test-results/new0_css_native/dir_c/`
- `test-results/new0_css_native/contact_sheets/` (contact sheet PNGs)
- `test-results/new0_css_native/gallery.html`

**Reproduce command (Direction A):**
```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/*.html' \
  --out test-results/new0_css_native/dir_a
```

**Reproduce command (Direction B):**
```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/dir_b/*.html' \
  --out test-results/new0_css_native/dir_b
```

**Reproduce command (Direction C):**
```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/dir_c/*.html' \
  --out test-results/new0_css_native/dir_c
```

**Reproduce contact sheets:**
```
source source_me.sh && python3 _temp_contact_sheets.py
```

---

## 3. Scene set

10 scenes tested per direction. 4 are base/template scenes (1-3 placements).
6 are composition scenes with multiple objects.

| Scene | Type | Placements | Primary? | Workspace |
| --- | --- | --- | --- | --- |
| bench_basic | template | 2 | no | bench |
| hood_basic | template | 1 | no | hood |
| cell_counter_basic | template | 3 | no | instrument |
| microscope_basic | template | 2 | no | instrument |
| well_plate_96_zoom | zoom composition | 1 | yes | bench |
| drug_dilution_plate_workspace | composition | 9 | yes | bench |
| electrophoresis_bench | composition | 9 | yes | bench |
| staining_bench | composition | 9 | no (omitted in A) | bench |
| crowded_bench_dense | stress/composition | 13 | yes | bench |
| drug_dilution_workspace_dense | stress/composition | 14 | yes | bench |

Stress scenes (`crowded_bench_dense`, `drug_dilution_workspace_dense`) were created
for this evidence package as NEW0-format YAML + HTML templates. They test layout
behavior under high-density conditions.

---

## 4. Layout directions

### Direction A (baseline)

3-band horizontal strip layout: `rear_shelf` (top, fixed height) / `work_surface`
(middle, flex) / `front_tools` (bottom, fixed height). Left column
(`instrument_station`) is a fourth strip rendered as a sidebar.

CSS file: `experiments/css_native_layout/styles/bench.css`

Characteristics:
- Uniform horizontal bands; no object-class hierarchy.
- Objects in all regions share similar footprint sizing.
- Primary objects do not get preferential sizing; `footprint--zoom-view` is the
  exception (min-width 600px, min-height 600px).
- High scene whitespace (88-96%) on composition scenes because objects do not fill
  their region bands.

### Direction B (stage/composition)

3-band layout where `work_surface` is the dominant central stage. The `instrument_station`
region is hidden (`display: none`). The primary object in `work_surface` gets
`flex-grow: 1` so it expands toward the available width.

CSS file: `experiments/css_native_layout/styles/dir_b_bench.css`

Characteristics:
- Primary objects larger than Direction A (13-31% ratio vs. 0.6-2.7%).
- No instrument column; instruments must move to `work_surface`.
- Rear shelf and front tools bands are narrower (120px / 100px).
- Scene whitespace improved to 62-83% for composition scenes.
- `well_plate_96_zoom` primary ratio dropped to 31.9% (below 70% zoom threshold).

### Direction C (instrument-first, 2-column)

Asymmetric 2-column CSS grid: `instrument_station` is a fixed-width left column
(600px) spanning all three row bands. Right panel has `rear_shelf` / `work_surface` /
`front_tools` stacked vertically.

CSS file: `experiments/css_native_layout/styles/dir_c_bench.css`

Characteristics:
- Instruments anchored in left column; semantically separates instruments from reagents.
- Electrophoresis and staining bench primary ratios: 21-22% (best across directions
  for those scene types).
- Drug dilution scenes lower (5.9%) because the well plate primary is in the narrow
  right work_surface panel.
- Scenes without instruments (bench_basic) leave the left column empty, creating
  structural whitespace.
- `well_plate_96_zoom` primary ratio 18.4% (WARN; zoom threshold 70%).
- Scene whitespace: 68-93% for composition scenes.

---

## 5. Screenshots and contact sheets

All screenshots captured at 1920x1080 by `precheck.mjs` using Playwright/Chromium.
Contact sheets (3-up horizontal, Dir A | Dir B | Dir C) generated by
`_temp_contact_sheets.py` using Pillow.

Gallery: `test-results/new0_css_native/gallery.html`

Contact sheets: `test-results/new0_css_native/contact_sheets/<scene>.png`

Annotated sheets (for scenes with WARN): `test-results/new0_css_native/contact_sheets/<scene>_annotated.png`

---

## 6. Diagnostic summary table

Verdicts: PASS = no issues; PASS_TEMPLATE = template scene (expected sparse); WARN = advisory; FAIL = hard fail.

No direction produced any FAIL. No direction produced svg_svg_overlap or off_page.

### Verdict counts

| Metric | Dir A | Dir B | Dir C |
| --- | --- | --- | --- |
| PASS | 1 | 0 | 0 |
| PASS_TEMPLATE | 4 | 4 | 4 |
| WARN | 5 | 6 | 6 |
| FAIL | 0 | 0 | 0 |

### Primary object ratio (composition scenes only)

Threshold: >= 25% standard; >= 70% zoom. Flag = below threshold.

| Scene | Dir A | Dir B | Dir C | Note |
| --- | --- | --- | --- | --- |
| well_plate_96_zoom | 92% PASS | 31.9% WARN | 18.4% WARN | A wins on zoom fill |
| drug_dilution_plate_workspace | 1.4% WARN | 13.9% WARN | 5.9% WARN | B best |
| drug_dilution_workspace_dense | 0.6% WARN | 13.9% WARN | 5.9% WARN | B best |
| electrophoresis_bench | 2.7% WARN | 20.8% WARN | 21.9% WARN | C marginally best |
| staining_bench | 0.7% WARN | 31.3% (no flag) | 21.0% WARN | B best (meets 25%) |
| crowded_bench_dense | 0.6% WARN | 31.3% (no flag) | 21.0% WARN | B best (meets 25%) |

### Scene whitespace (composition scenes)

Lower = objects use more of the scene area.

| Scene | Dir A | Dir B | Dir C |
| --- | --- | --- | --- |
| drug_dilution_plate_workspace | 95.9% | 83.0% | 91.3% |
| drug_dilution_workspace_dense | 94.3% | 79.0% | 87.7% |
| electrophoresis_bench | 88.1% | 70.7% | 68.2% |
| staining_bench | 93.9% | 64.9% | 72.0% |
| crowded_bench_dense | 92.2% | 62.2% | 69.4% |
| well_plate_96_zoom | 8.0% | 68.1% | 81.6% |

Direction A wins on zoom (8% whitespace = nearly full fill).
Direction B wins on staining and crowded bench density.
Direction C wins on electrophoresis scene whitespace.

---

## 7. What failed

No HARD FAIL conditions were triggered in any direction. All three directions
are free of clipped artwork, off-page elements, SVG-SVG overlap, and region overflow.

### Advisory issues found

**All three directions:**
- High region_whitespace flags across multiple occupied regions, especially in template scenes.
- `drug_dilution_plate_workspace` in Direction A has region_whitespace flags on five regions;
  this suggests the template used custom region names that do not match standard region IDs,
  causing all five to read as near-empty.

**Direction A specific:**
- Primary object ratios universally below 3% on all composition scenes (except zoom).
- `drug_dilution_plate_workspace` in Direction A likely used a non-standard region structure
  (flags on `reagent_shelf`, `side_support`, `primary_work_surface`, `tool_lane`, `waste_corner`
  which are not the canonical five-region names).
- Scene whitespace 88-96% for composition scenes: objects are too small relative to the viewport.

**Direction B specific:**
- `well_plate_96_zoom` drops from PASS (92%) to WARN (31.9%) vs. the 70% zoom threshold.
  This is a Direction B regression. The `footprint--zoom-view` rule in `dir_b_bench.css`
  does not replicate the Direction A zoom sizing (600px min-width/height).
- `staining_bench` and `crowded_bench_dense`: no primary tag applied to these scenes in
  Direction B templates; ratio not flagged but objects may not be semantically designated.

**Direction C specific:**
- `well_plate_96_zoom`: 18.4% (far below 70% threshold). The 2-column layout allocates
  much of the viewport to the left instrument column, leaving the right work_surface panel
  narrow; the zoom object cannot fill it.
- Scenes without instruments (bench_basic, hood_basic) leave the left instrument column
  structurally empty: visible as a blank gray band on the left side of those screenshots.
- All five region_whitespace flags on `drug_dilution_plate_workspace` persist in Dir C
  (four regions flagged), worse than Direction B (two regions).

---

## 8. What worked

**All directions:**
- Zero hard fails across all 30 scene renderings (10 scenes x 3 directions).
- Zero SVG-SVG overlaps: no artwork collisions in any direction.
- Zero off-page elements.
- Zero region overflow: all CSS contained objects within their regions.
- The precheck runner is reproducible and deterministic; all runs produced consistent verdicts.

**Direction A:**
- `well_plate_96_zoom` achieved PASS (92% primary ratio): the zoom-view footprint sizing works.
- Template scenes correctly reported PASS_TEMPLATE without false WARN inflation.
- Artwork integrity check functional; aspect ratio mismatches detected and reported.

**Direction B:**
- Primary object ratios 10-31% on composition scenes: meaningful improvement over Direction A's 0.6-2.7%.
- `staining_bench` and `crowded_bench_dense` primary ratios above 25% threshold (no flag).
- Lowest scene whitespace on dense scenes (62-79%): best overall object density.
- The `flex-grow: 1` primary rule on `work_surface` produces the most visually useful sizing
  for scenes where the primary dominates the center band.

**Direction C:**
- Electrophoresis bench: 21.9% primary ratio (best for instrument-class scenes) and
  68.2% scene whitespace (best for electrophoresis across all directions).
- Instrument-station left column provides clear spatial separation of instruments from
  reagent bottles -- a genuine semantic layout improvement over the other directions.
- Staining bench and crowded bench both at 21% primary ratio; respectable density.

---

## 9. Provisional recommendation

**Provisional direction: B as the primary candidate, with C as the instrument-context variant.**

Rationale:

1. Direction B produces the best primary-object ratios on general bench composition scenes
   (drug dilution, staining, dense scenes). The `flex-grow: 1` primary rule is effective.

2. Direction C's instrument-station column is semantically correct for scenes with a dominant
   instrument (electrophoresis tank, gel apparatus). It separates instrument from reagent
   spatially. For instrument-heavy scenes, Direction C gives marginally better clarity.

3. Direction A should be retired for composition scenes. Its 0.6-2.7% primary ratios make
   the "primary" object visually indistinguishable from supporting objects.

4. The zoom regression in both B and C is a CSS gap, not an architectural problem. The
   Direction A `footprint--zoom-view` min-size rule (600px/600px) can be ported to B and C.
   Fix this before promoting either direction.

5. The empty left column in Direction C bench/hood scenes is a genuine cost. If Direction C
   is adopted, bench and hood workspace templates should suppress the instrument column
   (e.g., `display: none` or `width: 0`) when no instrument_station placements exist.

6. The `drug_dilution_plate_workspace` primary ratio remains below 25% in all directions.
   The 96-well plate in work_surface does not grow enough even with `flex-grow`. This is
   a CSS footprint-class gap, not a direction selection issue.

**This recommendation is provisional.** The user reviews screenshots in `gallery.html`
and contact sheets in `contact_sheets/` to make the final decision. The primary-ratio
thresholds (25% standard, 70% zoom) are provisional and unvalidated; if the user finds
Direction C screenshots more pedagogically useful, the threshold argument does not override
that judgment.

---

## 10. Open questions

1. **Zoom threshold.** The 70% primary-ratio threshold for zoom scenes is sourced from the
   NEW0 design review (2026-05-17) but has no pedagogical validation. Direction A achieves
   92% via fixed-size footprint; B achieves 31.9%; C achieves 18.4%. Are 31.9% and 18.4%
   actually problematic visually? The contact sheets provide evidence; the threshold alone
   does not.

2. **Empty instrument column.** Direction C leaves the left column blank for scenes without
   instruments. Is this a hard layout bug, or acceptable in exchange for the clear separation
   it provides in instrument-heavy scenes? A hybrid approach (instrument column conditional
   on placement count) may be warranted.

3. **Drug dilution primary ratio.** The 96-well plate never exceeds 14% primary ratio in
   any direction (and 5.9% in C). Is this a footprint class problem, a scene design problem
   (wrong primary designation), or acceptable because drug-dilution scenes are inherently
   multi-object?

4. **Region-whitespace threshold.** 80% is provisional. Template scenes and single-object
   scenes routinely exceed it. PASS_TEMPLATE suppresses this for known skeleton scenes, but
   the threshold may need per-workspace-type calibration.

5. **Contract path.** If the user wants to promote NEW0 to production, the two options are:
   (a) amend contract item 3 to allow CSS-native layout and sunset the layout engine, or
   (b) make the layout engine emit CSS Grid class names from YAML region+footprint
   declarations instead of computing pixel positions. Option (b) is the lower-risk path:
   it preserves the YAML authoring surface and the layout engine as the single source of
   truth, while gaining the CSS flexibility that NEW0 demonstrates.

6. **Supporting distance reliability.** The `supporting_distance` check is currently skipped
   for most scenes. For Direction C, it would be structurally unreliable because the
   instrument column objects are far from the right-panel primary by design. The check
   needs workspace-type awareness before it can produce useful verdicts.
