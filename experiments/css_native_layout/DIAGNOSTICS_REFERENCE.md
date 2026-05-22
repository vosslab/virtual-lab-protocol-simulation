# DIAGNOSTICS_REFERENCE.md

Reference for the NEW0 CSS-native layout precheck diagnostic metrics.
Produced as part of the NEW0 reproducible evidence package.
All data is from `experiments/css_native_layout/precheck.mjs`.

## Metric classification

| Class | Meaning |
| --- | --- |
| HARD FAIL | Any instance blocks the scene from passing. Must be zero before a direction is promoted. |
| ADVISORY WARN | Flagged in the audit report. Does not block promotion. Requires a documented rationale. |
| INFO | Reported for traceability. No threshold. |

## Metric reference

### 1. clipped_artwork

**Class:** HARD FAIL

**What it measures:** Whether any SVG image element is partially outside its
parent `.object-graphic` bounding box, meaning artwork is cut off at the CSS
boundary.

**How detected:** For each `.placement` the check compares the bounding boxes
of every `img` (SVG) inside `.object-graphic` against the `.object-graphic`
container. Clip is flagged when `img.right > container.right` or
`img.bottom > container.bottom` by more than a 2px tolerance.

**Hard-fail rationale:** Clipped artwork cannot be distinguished from a broken
asset by a student. Zero tolerance.

**Acceptable value:** Empty array `[]`.

---

### 2. off_page

**Class:** HARD FAIL

**What it measures:** Whether any placement element has any part outside the
1920x1080 viewport boundary.

**How detected:** `element.getBoundingClientRect()` compared against the
viewport dimensions. Flagged when `right > 1920 || bottom > 1080 || left < 0 || top < 0`.

**Hard-fail rationale:** Off-page elements are invisible to students. Any such
placement is a layout regression.

**Acceptable value:** Empty array `[]`.

---

### 3. svg_svg_overlap

**Class:** HARD FAIL

**What it measures:** Whether any two SVG artwork elements overlap each other
in the rendered scene.

**How detected:** Pairwise comparison of all `.object-graphic img` bounding
boxes. Overlap is flagged when intersection area exceeds 50 sq px.

**Hard-fail rationale:** Overlapping artwork creates visual confusion and
implies the layout system lost control of placement. Pedagogically, a student
cannot tell which object is which.

**Acceptable value:** Empty array `[]`.

---

### 4. region_overflow

**Class:** HARD FAIL

**What it measures:** Whether any placement element overflows its containing
`.region` element.

**How detected:** Each placement bounding box is compared to its parent region
bounding box. Overflow flagged when placement extends beyond region by more
than 4px on any edge.

**Hard-fail rationale:** Region overflow means the CSS layout has broken
containment. Cross-region bleed violates the semantic region model.

**Acceptable value:** Empty array `[]`.

---

### 5. label_label_overlap

**Class:** ADVISORY WARN

**What it measures:** Whether any two `.placement-label` text elements overlap.

**How detected:** Pairwise bounding-box intersection of all `.placement-label`
spans. Flagged when intersection area exceeds 4 sq px.

**Advisory rationale:** Label overlap is a density signal, not always an error.
High-density scenes may accept modest overlap when the scene is clearly crowded
and the design intent is documented.

**Acceptable value:** Empty array preferred. Non-zero requires per-scene rationale.

---

### 6. svg_label_overlap

**Class:** ADVISORY WARN

**What it measures:** Whether any SVG image element overlaps a placement label
in a way that would obscure the label.

**How detected:** Each SVG bounding box is tested against each `.placement-label`
bounding box. Flagged when overlap area exceeds 10 sq px.

**Advisory rationale:** SVG-over-label overlap usually means a footprint size is
too large for the label position. It is recoverable by adjusting footprint CSS.
Not a hard fail because it may be an intentional trade-off in zoom-view scenes.

**Acceptable value:** Empty array preferred.

---

### 7. region_whitespace

**Class:** ADVISORY WARN

**What it measures:** For each named region, the percentage of the region area
not occupied by any placement bounding box.

**How detected:** Sum of all placement bounding box areas in each region,
divided by region bounding box area. Whitespace = 1 - (occupied / total).

**Threshold:** Flagged as WARN when `whitespace_pct > 80` AND `placement_count > 0`.
Regions with zero placements are not flagged (empty regions are a valid scene design).

**Advisory rationale:** High whitespace in an occupied region suggests objects
are not filling the region meaningfully. 80% is a provisional threshold
(sourced: NEW0 design review, 2026-05-17). May need calibration per workspace type.

**Acceptable value:** All flags `false` preferred. Template scenes (1-3 placements)
routinely exceed 80% and are reported as PASS_TEMPLATE rather than WARN.

---

### 8. scene_whitespace

**Class:** INFO

**What it measures:** Total whitespace as a percentage of the full 1920x1080
scene area.

**How detected:** Sum of all placement bounding box areas across the full scene
container, divided by scene container area.

**No threshold.** Reported for reference. Very high values (>95%) in composition
scenes suggest the layout has failed to distribute objects. Used diagnostically
in Step 6 report analysis.

---

### 9. primary_object ratio

**Class:** ADVISORY WARN

**What it measures:** For scenes with a `data-primary="true"` placement, the
ratio of that placement's bounding box area to the full scene area, expressed
as a percentage.

**How detected:** Locates the first element matching
`.placement[data-primary="true"]`. Gets its bounding box area. Divides by
scene container area.

**Thresholds (provisional, sourced: NEW0 design review, 2026-05-17):**

| Scene mode | Threshold | Flag direction |
| --- | --- | --- |
| Standard composition | 25% | Flag if BELOW |
| Zoom view (scene-mode--detail) | 70% | Flag if BELOW |

**Advisory rationale:** Primary objects should dominate their scene. Below-threshold
values mean the primary is visually lost among supporting objects. Both thresholds
are provisional and contested (especially zoom 70%). See open questions in
`docs/active_plans/new0_reproducible_evidence_package.md`.

**Acceptable value:** ratio >= 25% (standard), >= 70% (zoom). Skipped for
template-mode scenes.

---

### 10. largest_empty_band

**Class:** INFO

**What it measures:** The largest rectangular empty quadrant in the scene, identified
as one of four named quadrants: top-left, top-right, bottom-left, bottom-right.
Reports the quadrant name and its pixel dimensions.

**How detected:** The scene is divided into four equal quadrants. For each quadrant,
the proportion of empty (unoccupied) area is computed. The quadrant with the most
empty space is reported.

**No threshold.** Used to detect systematic layout problems: e.g., if bottom-left is
always the largest empty band across all Direction A scenes, the layout has a
structural bias.

---

### 11. supporting_distance

**Class:** ADVISORY WARN (when enabled)

**What it measures:** The pixel distance from the primary object to each supporting
object. Intended to detect "supporting objects parked far from the primary" as a
layout quality signal.

**Current status:** Skipped for template-mode scenes. Skipped for composition
scenes when no primary object is tagged. Currently unreliable for multi-region
Direction C scenes because supporting objects in the left column are structurally
far from the work_surface primary even when the layout is correct.

**Advisory rationale:** When enabled and reliable, large distances indicate
objects are not visually associated. Threshold not yet set.

---

### 12. artwork_integrity

**Class:** Mixed (ADVISORY WARN and HARD FAIL sub-checks).

**What it measures:** Whether SVG images are rendered at the correct aspect
ratio, scale, and without cropping by parent containers.

**Sub-checks emitted under `checks.artwork_integrity`:**

| Sub-check | Class | Description |
| --- | --- | --- |
| natural_vs_rendered | ADVISORY WARN | Aspect mismatch (>5%), forced shrink (<60% area), upscaling (>120%) |
| artwork_vs_card | ADVISORY WARN | `.object-graphic` extends outside its `.placement` card |
| object_vs_region | ADVISORY WARN | Placement card clipped by its region |
| label_clipping | ADVISORY WARN | Label clipped by its region |
| clipped_by_parent | HARD FAIL | Rendered `<img>`/`<svg>` clipped by any ancestor with `overflow != visible` |
| aspect_distorted | WARN, escalates to HARD FAIL | Rendered vs natural aspect ratio delta exceeds tolerance |

**clipped_by_parent detection:** For each `.placement`, the precheck reads
`<img>` `getBoundingClientRect()` and walks every ancestor, intersecting the
visible clip rect for any ancestor whose computed `overflow-x` or `overflow-y`
is not `visible`. If the `<img>` bbox extends beyond the intersected clip rect
by more than `CLIP_TOLERANCE_PX` (default 1px) on any side, the placement is
recorded with `severity: HARD_FAIL`. Visible clipping is never tolerated.

**aspect_distorted detection:** Computes
`abs((rendered_aspect - natural_aspect) / natural_aspect) * 100` and flags
when the delta exceeds `ASPECT_DISTORTION_TOLERANCE_PCT` (default 5%). Default
severity is `WARN`; the finding is escalated to `HARD_FAIL` when the object
name matches the high-priority pattern groups below.

**Hard-fail escalation groups (matched case-insensitively against
`object_name`):**

| Group | Patterns |
| --- | --- |
| glassware | flask, beaker, bottle, tube, cylinder |
| pipette | pipette, tip |
| plate | plate, well |
| instrument | microscope, centrifuge, power_supply, electrophoresis, incubator, cell_counter, hemocytometer, vortex, heat_block |

**Configuration:** Both tolerances live as top-of-file constants in
`precheck.mjs` (`ASPECT_DISTORTION_TOLERANCE_PCT`, `CLIP_TOLERANCE_PX`) plus
the `HARD_FAIL_OBJECT_PATTERNS` map. Adjust there; do not duplicate.

**Verdict effect:** `clipped_by_parent` (any entry) and `aspect_distorted`
entries with `severity: HARD_FAIL` both add to the scene's hard-fail count
and therefore drive verdict to `FAIL`. WARN-severity aspect distortions do
not affect the verdict.

---

## Hard rule: NEVER crop SVG assets in display

This diagnostic requirement is the canonical mechanism that enforces the
"NEVER crop SVG assets in display" hard rule defined in
[VISUAL_TARGETS.md](VISUAL_TARGETS.md). It applies even when
`hard_fail_count = 0` at the precheck level; visible cropping or distortion
is a visual failure regardless of bbox-level checks.

The `artwork_integrity` check must:

- Compare the rendered `.object-graphic` or `img`/`svg` bbox against its
  parent placement card.
- Flag if the asset is clipped by parent `overflow`.
- Flag if rendered aspect ratio deviates from expected asset aspect ratio
  beyond a small tolerance (default: 5%).
- Treat visible clipping as a HARD FAIL.
- Treat mild aspect distortion as advisory at first; escalate to hard fail
  for lab glassware, pipettes, plates, and instruments.

Anti-patterns (forbidden):

- Do NOT "fix" cropping by hiding cropped assets, deleting DOM, or weakening
  diagnostics.
- Do NOT accept a high score if the asset is visibly cropped.
- Do NOT claim visual success while glassware bottoms are cut off.

See also: [VISUAL_TARGETS.md](VISUAL_TARGETS.md),
[../../docs/active_plans/new2_css_native_production_blocker_plan.md](../../docs/active_plans/new2_css_native_production_blocker_plan.md),
[new2_css_native_best_case_showcase_no_crop_addendum.md](../../docs/archive/css_native_layout/new2_css_native_best_case_showcase_no_crop_addendum.md).

---

## Verdict ladder

| Verdict | Condition |
| --- | --- |
| PASS | No hard fails, no advisory warns |
| PASS_TEMPLATE | No hard fails; scene has 1-3 placements and is template-mode; warns expected |
| WARN | No hard fails; one or more advisory warns |
| FAIL | Any hard fail (clipped_artwork, off_page, svg_svg_overlap, region_overflow, artwork_integrity.clipped_by_parent, artwork_integrity.aspect_distorted[HARD_FAIL]) |

PASS_TEMPLATE was introduced in P2.5 cleanup to prevent false WARN verdicts on
intentionally sparse template/skeleton scenes. Template scenes with `data-scene-mode="template"`
and fewer than 4 placements are eligible for this verdict.

---

## Evidence package cross-references

- Precheck runner: `experiments/css_native_layout/precheck.mjs`
- Direction A raw audit: `test-results/new0_css_native/dir_a/visual_audit.md`
- Direction B raw audit: `test-results/new0_css_native/dir_b/visual_audit.md`
- Direction C raw audit: `test-results/new0_css_native/dir_c/visual_audit.md`
- Full evidence report: `docs/active_plans/new0_reproducible_evidence_package.md`
- Contact sheets: `test-results/new0_css_native/contact_sheets/`
