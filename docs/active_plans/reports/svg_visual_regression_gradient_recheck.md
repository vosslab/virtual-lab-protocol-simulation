# SVG gradient-under-transform recheck report

**Scope:** top-20 phash offenders from the prior visual regression run (all files with
pre-fix phash >= 28 in either engine)
**Fix audited:** gradient-under-transform (Category B) -- `tools/normalize_svg_v3.py`
**Normalizer:** current (post-fix) `normalize_svg_v3.py`
**Driver:** `tests/e2e/e2e_svg_gradient_recheck.py`
**Engines:** chromium, firefox
**Render size:** 256x256 px
**Hash type:** phash (perceptual hash, 8x8 = 64 bits, hamming distance) +
dhash (directional hash, structure-sensitive)

## Before/after comparison table

Legend: distance 0-2 = identical, 3-6 = minor, >6 = divergent.
Verdict: improved = new dist < prior - 2, unchanged = within +/-2, regressed = new dist > prior + 2.

### Chromium engine

| File | Category | Pre-fix phash | Post-fix phash | dhash | Verdict |
| --- | --- | --- | --- | --- | --- |
| `cpu.svg` | B (gradient) | 38 | 40 (divergent) | 41 | unchanged |
| `cell_membrane_arc.svg` | A (viewBox reframe) | 42 | 42 (divergent) | 31 | unchanged |
| `straight-curve.svg` | A/D | 32 | 32 (divergent) | -- | unchanged |
| `Amphiprion_ocellaris_egg.svg` | C (stacking) | 36 | 36 (divergent) | 30 | unchanged |
| `group-no-creation.svg` | D (test fixture) | 33 | 33 (divergent) | -- | unchanged |
| `round-bottomed-flask-1-500ml.svg` | A (viewBox reframe) | 34 | 34 (divergent) | -- | unchanged |
| `arrow-twosides-horizontal.svg` | A (viewBox reframe) | 34 | 34 (divergent) | -- | unchanged |
| `flask-3-empty.svg` | A (viewBox reframe) | 34 | 34 (divergent) | -- | unchanged |
| `pipette-tip-box.svg` | A (viewBox reframe) | 34 | 34 (divergent) | -- | unchanged |
| `stanford_b_debakey_IIIa.svg` | C (stacking) | 34 | 34 (divergent) | -- | unchanged |
| `dont-convert-short-color-names.svg` | D (test fixture) | 33 | 33 (divergent) | -- | unchanged |
| `group-creation.svg` | D (test fixture) | 33 | 33 (divergent) | -- | unchanged |
| `path-quad-optimize.svg` | D (test fixture) | 32 | 32 (divergent) | -- | unchanged |
| `Xenopus_new.svg` | A (viewBox reframe) | 30 | 22 (divergent) | 7 | improved |
| `ribosome.svg` | A/C | 32 | 32 (divergent) | -- | unchanged |
| `variational-autoencoder.svg` | A/C | 32 | 32 (divergent) | -- | unchanged |
| `nucleotide-a-ul.svg` | A | 28 | 28 (divergent) | -- | unchanged |
| `microtube-closed.svg` | A (viewBox reframe) | 32 | 32 (divergent) | -- | unchanged |
| `stanford_a_debakey_I.svg` | C (stacking) | 32 | 32 (divergent) | -- | unchanged |
| `stanford_a_debakey_II.svg` | C (stacking) | 32 | 32 (divergent) | -- | unchanged |

### Firefox engine

| File | Category | Pre-fix phash | Post-fix phash | dhash | Verdict |
| --- | --- | --- | --- | --- | --- |
| `cpu.svg` | B (gradient) | 38 | 40 (divergent) | 39 | unchanged |
| `cell_membrane_arc.svg` | A (viewBox reframe) | 42 | 42 (divergent) | 31 | unchanged |
| `straight-curve.svg` | A/D | 38 | 38 (divergent) | -- | unchanged |
| `Amphiprion_ocellaris_egg.svg` | C (stacking) | 36 | 36 (divergent) | 30 | unchanged |
| `group-no-creation.svg` | D (test fixture) | 34 | 34 (divergent) | -- | unchanged |
| `round-bottomed-flask-1-500ml.svg` | A (viewBox reframe) | 34 | 36 (divergent) | -- | unchanged |
| `arrow-twosides-horizontal.svg` | A (viewBox reframe) | 32 | 32 (divergent) | -- | unchanged |
| `flask-3-empty.svg` | A (viewBox reframe) | 32 | 32 (divergent) | -- | unchanged |
| `pipette-tip-box.svg` | A (viewBox reframe) | 32 | 32 (divergent) | -- | unchanged |
| `stanford_b_debakey_IIIa.svg` | C (stacking) | 34 | 34 (divergent) | -- | unchanged |
| `dont-convert-short-color-names.svg` | D (test fixture) | 33 | 33 (divergent) | -- | unchanged |
| `group-creation.svg` | D (test fixture) | 33 | 33 (divergent) | -- | unchanged |
| `path-quad-optimize.svg` | D (test fixture) | 32 | 32 (divergent) | -- | unchanged |
| `Xenopus_new.svg` | A (viewBox reframe) | 32 | 22 (divergent) | 8 | improved |
| `ribosome.svg` | A/C | 32 | 32 (divergent) | -- | unchanged |
| `variational-autoencoder.svg` | A/C | 32 | 32 (divergent) | -- | unchanged |
| `nucleotide-a-ul.svg` | 32 | 32 | 32 (divergent) | -- | unchanged |
| `microtube-closed.svg` | A (viewBox reframe) | 32 | 32 (divergent) | -- | unchanged |
| `stanford_a_debakey_I.svg` | C (stacking) | 32 | 32 (divergent) | -- | unchanged |
| `stanford_a_debakey_II.svg` | C (stacking) | 32 | 32 (divergent) | -- | unchanged |

## Summary

**Chromium:** improved=1, unchanged=19, regressed=0, resolved-via-reject=0, errors=0

**Firefox:** improved=1, unchanged=19, regressed=0, resolved-via-reject=0, errors=0

No files were rejected by the current normalizer. All 20 files pass normalization.

## Diagnostic analysis: why cpu.svg is still divergent

`cpu.svg` was identified in the prior report as the primary Category-B offender:
before=colorful multi-colored CPU chip, after=nearly monochrome grey grid (phash=38).

Deep analysis of the normalized output reveals:

- The original SVG has 268 radialGradients and 3 linearGradients, all with
  `gradientUnits="userSpaceOnUse"`.
- The original SVG has 22 geometry-element `transform=` attributes (translate, matrix,
  rotate). The current normalizer correctly flattens these to zero remaining transforms.
- The gradient `cx/cy` coordinates in the original are in the 69-72 range (absolute
  coordinate space of the untransformed geometry).
- After transform flattening, the geometry paths move to a 0-40 coordinate space
  (bbox is approximately 0,0 to 38,39).
- The fix prepends the accumulated element matrix (e.g. `matrix(0.415,0,0,0.415,...)`)
  into the gradient's `gradientTransform` attribute. This is visible in the normalized
  output: most gradients show `translate(0,6.77e-5)` (unchanged, identity element
  transform) and some show `matrix(.415354,0,0,.415354,-11.4099,-47.1674)`.
- However, the gradient `cx/cy` absolute coordinate values are NOT updated. They remain
  at 71.5/157.8 (original space), while the painted geometry now occupies coordinates
  around 0-40. For `userSpaceOnUse`, the browser resolves `cx/cy` in the current
  user coordinate system after applying `gradientTransform`. Since the geometry now
  sits at 0-40 but the gradient center is still declared at 71.5/157.8, the gradient
  center falls far outside the element bounding box, collapsing to the nearest stop
  color.
- The confirmed dhash value of 41 (out of 64) for cpu.svg confirms structural content
  loss (not a viewBox reframe, which would show dhash < 10).

The fix (`move_userspace_paints_in_sync`) prepends the matrix into `gradientTransform`
correctly for the general case. But for `userSpaceOnUse` gradients, the `cx/cy/x1/y1/x2/y2`
coordinate attributes also need to be transformed by the inverse of the matrix already
embedded in `gradientTransform` (if any), or equivalently: the absolute coordinate
attributes must be recomputed in the new post-flatten coordinate space. The current
implementation updates the transform but not the absolute coordinate attributes, leaving
the gradient center stranded outside the painted geometry.

## Diagnostic analysis: why Xenopus_new.svg improved

`Xenopus_new.svg` (chromium phash: 30 -> 22, firefox: 32 -> 22) improved because its
dhash dropped from ~30 to 7-8, confirming it was a partial viewBox reframe case
(Category A) rather than a true gradient bug. The viewBox change is smaller for Xenopus
(200x200 -> 210x212) compared to cpu.svg, and any residual gradient movement in
the fix slightly reduced the phash distance. The improvement is modest and not related
to gradient color restoration.

## Conclusion

The gradient-under-transform fix (Category B from the prior report) did **not** resolve
the color-loss regression for `cpu.svg`:

- `cpu.svg` phash: 38 (before) -> 40 (after), **both chromium and firefox**.
  The dhash of 41 confirms this is genuine content loss, not a viewBox reframe artifact.
- 18 of 19 other files are unchanged (as expected -- they are Category A, C, or D, not B).
- 1 file (`Xenopus_new.svg`) improved slightly (30/32 -> 22), but this is a Category A
  reframe case where the fix incidentally reduced drift; it does not represent gradient
  color restoration.
- 0 files regressed. 0 files were rejected.

The root cause of the remaining failure is that `move_userspace_paints_in_sync` correctly
prepends the element matrix into `gradientTransform` but does not update the gradient's
absolute `cx/cy/x1/y1/x2/y2` coordinate attributes. For `userSpaceOnUse` gradients, the
browser resolves these coordinates in the post-flatten user space, so the gradient center
lands outside the painted geometry and the color collapses. The full fix requires
transforming those coordinate attributes directly, not just the `gradientTransform` matrix.

**Category B verdict: partially implemented -- the gradientTransform update runs but is
insufficient. cpu.svg remains visually broken with color loss (dhash=41).**

Gallery before/after PNGs are saved to `test-results/svg_gradient_recheck/` (gitignored).
