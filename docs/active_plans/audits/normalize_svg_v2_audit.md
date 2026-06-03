# normalize_svg_v2 correctness audit

**Date:** 2026-06-03
**Plan:** read-the-tools-svg-code-fluttering-clarke, milestone M3 (workstream M3-a)
**File:** [tools/normalize_svg_v2.py](../../../tools/normalize_svg_v2.py)
**Scope:** line-by-line correctness review of the SVG normalizer (path command
conversion, curve/arc bbox math, viewBox rewrite, attribution preservation,
ASCII id cleanup). The only confirmed defect (arc-extrema undershoot) is fixed
in M3-b; this audit records its severity plus every other finding.

Severity labels:

- HIGH: produces wrong geometry or loses data on real assets.
- MEDIUM: correct on shipped assets but wrong on a plausible authored input.
- LOW: cosmetic, defensive, or style; no behavior risk on current corpus.
- INFO: confirmed-correct behavior worth recording (no action).

---

## Finding summary

| ID | Area | Severity | Status |
| --- | --- | --- | --- |
| F1 | Arc extrema not solved (bbox undershoot) | HIGH | FIXED in M3-b |
| F2 | h/v/z relative command conversion | INFO | correct |
| F3 | Cubic/quad control-point overshoot bbox | MEDIUM | accepted (conservative) |
| F4 | S/T smooth reflection state tracking | INFO | correct |
| F5 | viewBox rewrite (origin + padding) | INFO | correct |
| F6 | width/height sync vs viewBox | LOW | partial by design |
| F7 | Attribution / comment preservation | INFO | correct |
| F8 | ASCII id cleanup + ref rewrite | MEDIUM | correct, narrow ref scan |
| F9 | `text` element bbox is a zero-size point | MEDIUM | accepted |
| F10 | No transform / nested-transform handling | MEDIUM | out of scope, document |
| F11 | stroke-width excluded from bbox | LOW | accepted |
| F12 | Local `import unicodedata` inside helper | LOW | style |

Count by severity: HIGH 1, MEDIUM 4, LOW 3, INFO 4.

---

## F1 -- Arc extrema not solved (HIGH, fixed)

Old `path_bbox_from_segments` recorded only the arc endpoint
(`xs.append(nums[5]); ys.append(nums[6])`, with the marker comment "Arc extrema
are not solved"). An elliptical arc that bulges past its two endpoints
contributed nothing but the endpoint, so the bounding box undershot the drawn
shape and the cropped viewBox clipped the bulge.

Fix (M3-b): `path_bbox_from_segments` now tracks the pen position and calls
`arc_extrema(x0, y0, rx, ry, rot, large, sweep, x1, y1)`. `arc_extrema` uses
`_arc_center_params` (the SVG F.6.5/F.6.6 endpoint-to-center conversion,
including out-of-range radius correction and the large-arc/sweep sign rules) to
recover the ellipse center, start angle, and signed sweep, then evaluates the
parametric angles where `dx/dt = 0` and `dy/dt = 0` (rotation-aware), keeping
only the extrema that fall inside the actual swept interval `[theta1, theta2]`.
Endpoints are always included, so the result is never smaller than the old
behavior.

Concrete before/after (semicircle `M 0 0 A 50 50 0 0 1 100 0`):

- old endpoint-only bbox height: 0.0 (both endpoints at y=0)
- new bbox: `min_y=-50`, height `50.0` (the true bulge)

Verified by `test_arc_extrema_contains_semicircle_bulge` and
`test_arc_extrema_quarter_arc_corner` in
[tests/test_normalize_svg_geometry.py](../../../tests/test_normalize_svg_geometry.py),
which fail against the old endpoint-only logic and pass after the fix.

**Asset-bbox impact (flag for M4, NOT applied here):** re-normalizing existing
arc-using assets under the fix expands some viewBoxes:

| Asset | Committed viewBox | Re-normalized viewBox |
| --- | --- | --- |
| vortex.svg | 271.143 x 322.847 | 275.315 x 327.084 |
| water_bath.svg | 281.688 x 274.431 | 285.35 x 278.634 |
| gel_cassette.svg | 462.274 x 518.665 | 465.72 x 523.046 |
| bottle.svg | 180.693 x 391.925 | 180.693 x 391.925 (no change) |

M3 only fixes the function and proves it on a fixture. The asset
re-normalization sweep is M4's risk to own (risk register: "Arc bbox fix
re-crops other assets"); do not re-normalize the library in M3.

---

## F2 -- h/v/z relative command conversion (INFO)

`parse_path_to_absolute` lowers `H/h` to an absolute `L` carrying the unchanged
`y` (line 224-231), `V/v` to an absolute `L` carrying the unchanged `x`
(233-240), and `Z/z` to a bare `Z` that snaps the pen back to the subpath start
(`x, y = start_x, start_y`, 180-186). Relative offsets are added to the running
pen position before storing absolute coordinates. `assert_no_relative_hvz`
guards the output. Correct; covered by `test_hvz_conversion_bbox_matches_rectangle`
and `test_hvz_commands_become_absolute_lineto`.

## F3 -- Cubic / quadratic control-point overshoot (MEDIUM, accepted)

Cubic (`C`/`S`) and quadratic (`Q`/`T`) bboxes use the control points plus
endpoints (lines 522-529), a conservative superset of the true Bezier hull. The
box never undershoots the curve, but it can overshoot when control points sit
outside the drawn curve. This is intentional for icon cropping (padding hides
the slack) and is documented in the module docstring. A future exact-Bezier
solver would tighten crops but is not required. Covered by
`test_cubic_control_points_included_in_bbox` and
`test_quadratic_control_point_included_in_bbox`.

## F4 -- S/T smooth-curve reflection (INFO)

`S` reflects the previous cubic control point through the current point when the
previous segment was a cubic, else uses the current point (lines 251-262); `T`
does the same for the previous quadratic control point (273-284). `last_c_ctrl`
/ `last_q_ctrl` are reset on every non-matching command, matching the SVG rule
that reflection applies only after a same-family curve. Correct.

## F5 -- viewBox rewrite (INFO)

`normalize_svg_file` computes the drawn bbox, shifts all geometry by
`(-min_x + padding, -min_y + padding)`, and writes
`viewBox="0 0 (width+2*padding) (height+2*padding)"` (lines 802-810). Origin is
always `0 0`; padding is symmetric. Covered by
`test_viewbox_rewrite_starts_at_origin_with_padding`.

## F6 -- width/height attribute sync (LOW, by design)

`width`/`height` root attributes are rewritten only when already present (lines
812-815). An SVG that declares neither keeps relying on the viewBox, which is
correct. No defect.

## F7 -- Attribution / comment preservation (INFO)

Pre-root XML comments are captured by `extract_pre_root_comments` and re-injected
after the parser drops them (lines 796, 820-827). In-root comments survive via
`TreeBuilder(insert_comments=True)`. The `dc:`/`cc:`/`rdf:`/`xlink:` prefixes are
preserved by the module-level `ET.register_namespace` calls (lines 48-53), so
attribution is not renamed to `ns0:`/`ns1:`. Covered by
`test_attribution_and_comment_preservation` and the built-in `--self-test`
metadata fixture.

## F8 -- ASCII id cleanup + reference rewrite (MEDIUM)

`make_ascii_clean` renames non-ASCII `id`/`data-name` values via `_ascii_id`
(NFKD transliteration, CJK drop, `layer` fallback, in-file dedup) and rewrites
matching references in `href`/`xlink:href` fragments and `url(#id)` inside a
fixed presentation-attribute set (lines 752-776). The reference scan is an
enumerated attribute list, not a generic scan, and does NOT cover `url(#id)`
inside embedded `<style>` text. That gap is acceptable here because non-ASCII ids
referenced from `<style>` are not present in the corpus, but it is a narrower
surface than the M1 runtime namespacer (which does handle `<style>` text).
Recorded so a future author does not assume parity. Covered by
`test_ascii_id_cleanup_replaces_nonascii`.

## F9 -- `text` element bbox is a point (MEDIUM, accepted)

`element_bbox` returns a zero-size `BBox(x, y, x, y)` for `text` (lines 607-610)
because glyph metrics require font shaping the normalizer does not do. Text-only
assets would crop to a point; shipped lab assets are vector art, not live text,
so this is accepted. Document if a text-bearing asset enters the corpus.

## F10 -- No transform handling (MEDIUM, out of scope)

`compute_bbox` and `shift_element` ignore `transform` attributes on elements or
ancestors. An asset that positions geometry via `transform="translate(...)"` or
`matrix(...)` would compute a wrong bbox. Shipped assets are pre-flattened
(no element transforms in the cropped corpus), so this does not bite today, but
it is a real limitation to flag before normalizing transform-bearing input.

## F11 -- stroke-width excluded from bbox (LOW, accepted)

The bbox is the geometric path extent and ignores `stroke-width`, so a thick
stroke can paint up to half a stroke-width outside the box. The default padding
(2 user units) absorbs typical hairline strokes; heavy strokes rely on padding.
Accepted for icon normalization.

## F12 -- local `import unicodedata` (LOW, style)

`_ascii_id` imports `unicodedata` inside the function body (line 684) rather than
at module top. It works (stdlib, cached after first import) but violates the
top-of-file import convention. Cosmetic; safe to hoist in a later cleanup.

---

## Verification performed

- `python3 -m pytest tests/test_normalize_svg_geometry.py` -- 9 passed.
- `python3 tools/normalize_svg_v2.py --self-test` -- SELF-TEST PASSED.
- `pyflakes tools/normalize_svg_v2.py tests/test_normalize_svg_geometry.py` -- clean.
- `node tools/svg_to_html_render.mjs /tmp/arc_bulge.svg --no-open` -- the bulged
  capsule (the `ARC_BULGE_SVG` markup inlined in the test, written to /tmp)
  renders fully on all swatches with no clipping of the rounded arc ends. No
  durable non-YAML fixture file is kept; the arc markup lives inline in the test
  and is regenerated to /tmp on demand.
