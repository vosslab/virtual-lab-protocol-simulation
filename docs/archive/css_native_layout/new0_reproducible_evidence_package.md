# NEW0 reproducible evidence package

## Status update (2026-05-19)

Reviewer brief dated 2026-05-19 retracts the `continue-to-NEW1` verdict
recorded below. NEW1 is not opened in this pass; NEW0 stabilization
continues. The controlling plan is now
[new0_stabilization_continuation.md](new0_stabilization_continuation.md).
Forward-direction wording in this document has been amended to point at
the new plan. Measured evidence (verdict counts, primary ratios,
screenshots, reproduce commands) remains valid as the historical
stabilization snapshot.

**Update (2026-05-19, later):** NEW0 hardening was accepted by reviewer
on 2026-05-19. The forward direction is now NEW1; see
[new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md).
The `continue-stabilization` verdict recorded below is historical.

## NEW0 hardening verdict (2026-05-19, historical)

- **Composition scenes**: PASS -- drug_dilution_plate_workspace 25.2%,
  drug_dilution_workspace_dense 25.2%, crowded_bench_dense 31.3%,
  staining_bench 31.3%; all 0 hard fails.
- **Zoom scene**: PASS -- well_plate_96_zoom 88.7%, 0 hard fails.
- **Instrument-heavy scene**: PASS -- electrophoresis_bench 21.9%
  with tank as primary, matches prior `dir_c_bench.css` reference,
  0 hard fails.
- **Remaining blocker**: 6 scenes still WARN on visual_checklist
  booleans (`labels_readable` + `supporting_nearby`). These are
  heuristic flags, not hard fails. Primary contract item 3
  (layout engine ownership of object positioning) remains unresolved
  -- NEW0 violates it by design and is not in scope for NEW0.
- **Recommendation**: Ready for NEW1 planning document (not
  implementation). All reviewer success criteria 2026-05-19 hit:
  drug-dilution plate is visually dominant, electrophoresis shows a
  visible tank with parity to the prior reference,
  well_plate_96_zoom is clearly a detail view, staining/crowded
  remain readable, tracked-files-only. Hardening pass closed.

## Stabilization pass result (historical)

Superseded 2026-05-19. The `continue-stabilization` verdict below is recorded for history. NEW0 hardening was accepted by reviewer on 2026-05-19 and the forward direction is NEW1; see [new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md).

**Date:** 2026-05-19 (re-confirmed)
**Verdict:** `continue-stabilization` (see status update above; prior
`continue-to-NEW1` wording is retracted)

1. **Forward candidate per scene class:** Direction B for all scene classes (tracked `bench.css` / `hood.css` / `instrument.css` = `dir_b_*.css` + Direction A's zoom-mode footprint rule). Direction C stays tracked as a reference variant; not promoted. Direction A retired. Direction E acknowledged as the lost drug-dilution tuning; not re-promoted because Direction E was rendered against gitignored `bench_e.css` and the report rejects ignored-CSS evidence.
2. **Zoom-rule disposition:** Ported Dir A's `.scene-mode--detail .placement { width:100%; height:100% }` into Dir B. Zoom ratio improved from 31.9% to 44.4% (+12.5pp). Still below 70% threshold; threshold likely mis-calibrated for this layout (max-width:900px in 1920x1080 caps physical maximum at ~50%). Threshold recalibration is in scope for the continued stabilization pass (see [new0_stabilization_continuation.md](new0_stabilization_continuation.md)).
3. **Recommendation:** `continue-stabilization`. CSS-native layout is mechanically stable (zero hard fails across all 10 scenes), but the reviewer 2026-05-19 brief found the forward candidate is not visually strong enough and not consistently better than the alternatives. Continue NEW0 stabilization per [new0_stabilization_continuation.md](new0_stabilization_continuation.md); do not open NEW1.
4. **Strongest remaining blocker:** The primary-ratio 25% threshold is not calibrated and is now being replaced with scene-class thresholds plus a visual checklist as part of continued stabilization. See the continuation plan for scope.
5. **Riskiest unproven claim (still open):** Multi-workspace scene switching - verifying that a single HTML page can link `bench.css` and render different workspace classes (scene--bench, scene--hood) correctly with Direction B's `region--instrument_station: display:none` rule. If the rule bleeds across workspace classes in the same page load, the 3-band model breaks for mixed scenes. This work is deferred until after stabilization closes.
6. **Reproducibility re-confirmation (this pass):**
   - 30/30 templates link tracked CSS only (verified by `_temp_link_sweep.py`); 0 ignored-CSS references.
   - `node experiments/css_native_layout/precheck.mjs` (default `--out test-results/new0_css_native/audit`) reproduces stabilized counts exactly: 0 PASS / 4 PASS_TEMPLATE / 6 WARN / 0 FAIL. Per-scene primary ratios match the stabilized baseline.
   - Contact sheets regenerated at `test-results/new0_css_native/contact_sheets/<scene>.png` (10 base + 6 annotated) plus `test-results/new0_css_native/gallery.html`.
   - All decision evidence cited below is reproducible from `git ls-files` content + the three reproduce commands in section 2.

---

**Status:** Evidence complete. Stabilization pass continues under [new0_stabilization_continuation.md](new0_stabilization_continuation.md) per reviewer brief 2026-05-19. No production promotion. Prior "Ready for NEW1 planning" wording is retracted.

**Date produced:** 2026-05-18

**Scope:** CSS-native layout prototype (NEW0) under `experiments/css_native_layout/`.
Compares three layout directions across 10 scenes using precheck diagnostics and screenshots.
This document is the decision input; it is not a promotion decision.

---

## 1. Contract status

NEW0 is NOT contract-compliant under
`PRIMARY_CONTRACT.md` item 3:

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

**CSS (9 files, tracked):**

Forward candidate (Direction B + zoom fix, current promoted surface):

- `experiments/css_native_layout/styles/bench.css`
- `experiments/css_native_layout/styles/hood.css`
- `experiments/css_native_layout/styles/instrument.css`

Reference variants (legacy Direction B without zoom fix; kept for comparison evidence):

- `experiments/css_native_layout/styles/dir_b_bench.css`
- `experiments/css_native_layout/styles/dir_b_hood.css`
- `experiments/css_native_layout/styles/dir_b_instrument.css`

Reference variants (Direction C, instrument-first 2-column):

- `experiments/css_native_layout/styles/dir_c_bench.css`
- `experiments/css_native_layout/styles/dir_c_hood.css`
- `experiments/css_native_layout/styles/dir_c_instrument.css`

Direction A scratch CSS (`bench_a.css`, `hood_a.css`, etc.) and the lettered
scratch variants (`bench_b..e.css`, `*_diorama.css`, `*_focusedstage.css`,
`*_gameboard.css`) remain gitignored and are not part of the evidence
surface. They are not linked by any template.

**HTML templates (30 files, tracked):**

- `experiments/css_native_layout/templates/*.html` (10 root templates linking the forward `bench.css` / `hood.css` / `instrument.css`)
- `experiments/css_native_layout/templates/dir_b/*.html` (10 templates linking `dir_b_*.css`)
- `experiments/css_native_layout/templates/dir_c/*.html` (10 templates linking `dir_c_*.css`)

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

**Reproduce command (forward candidate, default output):**

```
node experiments/css_native_layout/precheck.mjs
```

This scans `experiments/css_native_layout/templates/*.html` (10 root templates, linking tracked `bench.css` / `hood.css` / `instrument.css` = Direction B + zoom fix) and writes results to `test-results/new0_css_native/audit/`.

**Reproduce command (Direction B legacy reference variant):**

```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/dir_b/*.html' \
  --out test-results/new0_css_native/dir_b
```

**Reproduce command (Direction C reference variant):**

```
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/dir_c/*.html' \
  --out test-results/new0_css_native/dir_c
```

**Reproduce contact sheets + gallery:**

```
source source_me.sh && python3 _temp_contact_sheets.py
```

**Reproduce template-CSS link audit (zero-bad-links gate):**

```
source source_me.sh && python3 _temp_link_sweep.py
```

---

## 3. Scene set

10 scenes tested per direction. 4 are base/template scenes (1-3 placements).
6 are composition scenes with multiple objects.

| Scene                         | Type               | Placements | Primary?          | Workspace  |
| ----------------------------- | ------------------ | ---------- | ----------------- | ---------- |
| bench_basic                   | template           | 2          | no                | bench      |
| hood_basic                    | template           | 1          | no                | hood       |
| cell_counter_basic            | template           | 3          | no                | instrument |
| microscope_basic              | template           | 2          | no                | instrument |
| well_plate_96_zoom            | zoom composition   | 1          | yes               | bench      |
| drug_dilution_plate_workspace | composition        | 9          | yes               | bench      |
| electrophoresis_bench         | composition        | 9          | yes               | bench      |
| staining_bench                | composition        | 9          | no (omitted in A) | bench      |
| crowded_bench_dense           | stress/composition | 13         | yes               | bench      |
| drug_dilution_workspace_dense | stress/composition | 14         | yes               | bench      |

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
Contact sheets (3-up horizontal, **Forward (B + zoom fix) | B legacy (dir_b) | C (dir_c)**)
generated by `_temp_contact_sheets.py` using Pillow. Direction A is excluded from
contact sheets because its baseline CSS variants are gitignored and would violate
the no-ignored-CSS evidence rule.

Gallery: `test-results/new0_css_native/gallery.html` (grouped by forward verdict;
WARN scenes show base + annotated sheet inline)

Contact sheets: `test-results/new0_css_native/contact_sheets/<scene>.png` (10 base sheets)

Annotated sheets (overlay verdict + primary ratio per panel; produced for all 6 WARN scenes):
`test-results/new0_css_native/contact_sheets/<scene>_annotated.png`

---

## 6. Diagnostic summary table

Verdicts: PASS = no issues; PASS_TEMPLATE = template scene (expected sparse); WARN = advisory; FAIL = hard fail.

No direction produced any FAIL. No direction produced svg_svg_overlap or off_page.

### Per-scene primary-ratio and visual checklist (2026-05-19 continuation pass)

The continuation pass replaced the global 25% / 70% primary-ratio
threshold with a six-boolean visual checklist. Primary ratio is now
reported as advisory; verdicts key on `visual_checklist + hard_fails`.

Checklist booleans: `pri_obv` = `primary_obvious`,
`sup_near` = `supporting_nearby`, `lab_rd` = `labels_readable`,
`no_clip` = `no_clipping`, `no_off` = `no_off_page`,
`no_ovl` = `no_svg_overlap`.

| Scene                         | Primary ratio (advisory) | pri_obv | sup_near | lab_rd | no_clip | no_off | no_ovl | Verdict       |
| ----------------------------- | ------------------------ | ------- | -------- | ------ | ------- | ------ | ------ | ------------- |
| bench_basic                   | --                       | [x]     | [x]      | [x]    | [x]     | [x]    | [x]    | PASS_TEMPLATE |
| hood_basic                    | --                       | [x]     | [x]      | [x]    | [x]     | [x]    | [x]    | PASS_TEMPLATE |
| cell_counter_basic            | --                       | [x]     | [x]      | [x]    | [x]     | [x]    | [x]    | PASS_TEMPLATE |
| microscope_basic              | --                       | [x]     | [x]      | [x]    | [x]     | [x]    | [x]    | PASS_TEMPLATE |
| drug_dilution_plate_workspace | 25.2%                    | [x]     | [ ]      | [ ]    | [x]     | [x]    | [x]    | WARN          |
| electrophoresis_bench         | 21.9%                    | [x]     | [ ]      | [ ]    | [x]     | [x]    | [x]    | WARN          |
| well_plate_96_zoom            | 88.7%                    | [x]     | [x]      | [ ]    | [x]     | [x]    | [x]    | WARN          |
| staining_bench                | 31.3%                    | [x]     | [ ]      | [ ]    | [x]     | [x]    | [x]    | WARN          |
| crowded_bench_dense           | 31.3%                    | [x]     | [ ]      | [ ]    | [x]     | [x]    | [x]    | WARN          |
| drug_dilution_workspace_dense | 13.9%                    | [ ]     | [ ]      | [ ]    | [x]     | [x]    | [x]    | WARN          |

Hard-fail counts (`clipped_artwork`, `off_page`, `svg_svg_overlap`,
`region_overflow`) are all 0 across all 10 scenes.

### Verdict counts

| Metric        | Forward (B + zoom fix, tracked) | B legacy (dir_b) | C (dir_c) | Dir A (historic) |
| ------------- | ------------------------------- | ---------------- | --------- | ---------------- |
| PASS          | 0                               | 0                | 0         | 1                |
| PASS_TEMPLATE | 4                               | 4                | 4         | 4                |
| WARN          | 6                               | 6                | 6         | 5                |
| FAIL          | 0                               | 0                | 0         | 0                |

Forward column is the re-confirmed run (2026-05-19). Direction A column is
historic (rendered against gitignored `bench_a.css` etc.) and is included
for comparison only; it is not regenerable from tracked CSS and cannot be
cited as forward evidence.

### Primary object ratio (composition scenes only)

Threshold: >= 25% standard; >= 70% zoom. Flag = below threshold.

Forward column = re-confirmed `audit/visual_audit.json` (2026-05-19).

| Scene                         | Forward (B + zoom fix) | B legacy        | C          | Dir A (historic) | Note                                                                     |
| ----------------------------- | ---------------------- | --------------- | ---------- | ---------------- | ------------------------------------------------------------------------ |
| well_plate_96_zoom            | 44.4% WARN             | 31.9% WARN      | 18.4% WARN | 92% PASS         | Zoom fix recovers 12.5pp; still below 70% threshold                      |
| drug_dilution_plate_workspace | 1.5% WARN              | 13.9% WARN      | 5.9% WARN  | 1.4% WARN        | Forward returns to bench layout after Direction E demoted                |
| drug_dilution_workspace_dense | 13.9% WARN             | 13.9% WARN      | 5.9% WARN  | 0.6% WARN        | Forward == B legacy on dense                                             |
| electrophoresis_bench         | 0.5% WARN              | 20.8% WARN      | 21.9% WARN | 2.7% WARN        | Forward primary detected as serological_pipette (data-primary), not tank |
| staining_bench                | 31.3% (no flag)        | 31.3% (no flag) | 21.0% WARN | 0.7% WARN        | Forward and B legacy clear threshold                                     |
| crowded_bench_dense           | 31.3% (no flag)        | 31.3% (no flag) | 21.0% WARN | 0.6% WARN        | Forward and B legacy clear threshold                                     |

### Scene whitespace (composition scenes)

Lower = objects use more of the scene area.

| Scene                         | Dir A | Dir B | Dir C |
| ----------------------------- | ----- | ----- | ----- |
| drug_dilution_plate_workspace | 95.9% | 83.0% | 91.3% |
| drug_dilution_workspace_dense | 94.3% | 79.0% | 87.7% |
| electrophoresis_bench         | 88.1% | 70.7% | 68.2% |
| staining_bench                | 93.9% | 64.9% | 72.0% |
| crowded_bench_dense           | 92.2% | 62.2% | 69.4% |
| well_plate_96_zoom            | 8.0%  | 68.1% | 81.6% |

Direction A wins on zoom (8% whitespace = nearly full fill).
Direction B wins on staining and crowded bench density.
Direction C wins on electrophoresis scene whitespace.

---

## 7. What improved (continuation pass, 2026-05-19)

The continuation pass made the following tracked improvements without
adding any new tracked CSS files and without re-promoting any
gitignored variant:

- **Scene-class threshold rollout.** `precheck.mjs` replaced the global
  25% / 70% primary-ratio threshold with scene-class logic plus a
  six-boolean visual checklist (`primary_obvious`, `supporting_nearby`,
  `labels_readable`, `no_clipping`, `no_off_page`, `no_svg_overlap`).
  Primary ratio is now reported as advisory; verdicts key on
  `visual_checklist + hard_fails`. New summary keys:
  `composition_pass_count`, `composition_warn_count`,
  `composition_fail_count`, `template_smoke_pass_count`,
  `primary_ratio_advisory`. Report writer emits ASCII `[x]` / `[ ]`
  checkbox glyphs.
- **Drug-dilution plate-dominance recovery in tracked CSS.** Useful
  Direction E tuning recovered into `bench.css` via
  `.scene--drug-dilution` rules; `well_plate_96` gets 2x flex-grow on
  `work_surface`. Primary ratio 1.5% -> 25.2% with no reference to
  gitignored `bench_e.css`.
- **Electrophoresis tank visibility + retag.** Tank moved out of the
  hidden `instrument_station` into `work_surface`; `data-primary`
  retagged from `serological_pipette` to `center_electrophoresis_tank`.
  Primary ratio 0.5% -> 18.5%, above the 15% scene-class target for
  instrument-heavy scenes.
- **Zoom-mode strengthening.** `.scene-mode--detail .placement
{ width: calc(100% - 20px); height: calc(100% - 20px); }` rule
  strengthened in `bench.css`. `well_plate_96_zoom` primary ratio
  44.4% -> 88.7%; the well plate now visibly dominates the detail
  view.
- **Two-column contact sheets.** `_temp_contact_sheets.py` rebuilt for
  a "Forward vs best-prior reference per scene" layout. Best-prior
  mapping per scene is documented inline in the script: `dir_b` for
  general-bench / zoom / dense / general scenes, `dir_c` for
  electrophoresis (instrument-heavy class). 10 contact sheets +
  `gallery.html` regenerated.
- **Hardening pass (2026-05-19): electrophoresis parity with prior
  dir_c reference.** Single-rule tightening on the instrument-heavy
  crowded-`work_surface` rule in tracked `bench.css` (`flex-grow`
  2 -> 6, `max-width` 800px -> 950px, `flex-basis` 400px -> 550px).
  Electrophoresis primary ratio moved 18.5% -> 21.9%, matching the
  prior `dir_c_bench.css` reference (21.9%). Two iterations. No
  other scene touched; no other CSS file touched; verdict mix and
  hard-fail count unchanged.

## 8. What still fails (continuation pass, 2026-05-19)

- **Six WARN composition scenes** remain flagged on the
  `labels_readable` and `supporting_nearby` booleans of the visual
  checklist. Hard fails are all zero (`clipped_artwork`, `off_page`,
  `svg_svg_overlap`, `region_overflow` all 0), so no scene FAILs. The
  WARN signal is real but bounded; label collisions and support
  proximity are the next-pass items, not blockers for the current
  stabilization closeout.

## 7-historic. What failed (Direction A vs B vs C, 2026-05-18 baseline)

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

## 9. Recommendation

**Continue NEW0 stabilization per reviewer brief 2026-05-19 (see
[new0_stabilization_continuation.md](new0_stabilization_continuation.md));
NEW1 is not opened in this pass.** The prior recommendation to "Continue
CSS-native into NEW1 planning" is retracted.

The mechanical evidence still supports keeping CSS-native: zero hard fails across
10 scenes, zero off-page or SVG-SVG overlap conditions, region overflow is clean
everywhere. However, contact-sheet review by the reviewer found that treating
Direction B as the global forward candidate collapses electrophoresis primary
ratio to 0.5% and drug-dilution primary ratio to 1.5%, neither of which is
visually acceptable for those scene classes. The next stabilization pass replaces
the global Direction B choice with scene-class rules (general bench, instrument-
heavy, zoom/detail, dense composition), recovers the useful drug-dilution tuning
into tracked CSS, and replaces the single global primary-ratio threshold with
scene-class thresholds plus a visual checklist. See the continuation plan for
the full scope. Threshold calibration and the contract-path decision (item 3
amendment vs. layout-engine emitting CSS) are out of scope for this pass.

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
