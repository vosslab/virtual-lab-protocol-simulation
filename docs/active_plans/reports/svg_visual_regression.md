# SVG v3 visual regression report

**Sample mode:** sample (300 of 848 passing files, screened from 1500 candidates, seed=42)
**Files processed:** 300
**Engines:** chromium, firefox
**Render size:** 256x256 px
**Hash type:** phash (primary), dhash (secondary)

> NOTE: v3 flattens simple clipPaths (allowlist) and rejects complex ones.
> Only the small simple-clip subset is normalized; most clip-bearing files
> are rejected (CLIPPATH_UNSUPPORTED_COMPLEX).

> NOTE: The wild verdicts JSON was stale at time of run. This harness
> pre-screens by running the normalizer fresh on all candidates.

## Chromium engine

| Classification | Count |
| --- | --- |
| identical (distance 0-2) | 73 |
| minor (distance 3-6) | 72 |
| divergent (distance >6) | 155 |
| render errors | 0 |
| worst phash distance | 38 |

## Firefox engine

| Classification | Count |
| --- | --- |
| identical (distance 0-2) | 76 |
| minor (distance 3-6) | 69 |
| divergent (distance >6) | 155 |
| render errors | 0 |
| worst phash distance | 38 |

## Chromium vs Firefox divergence (normalized SVGs)

| Classification | Count |
| --- | --- |
| identical | 268 |
| minor | 22 |
| divergent | 10 |
| unavailable | 0 |

## Top 25 worst offenders

| File | Max phash | chromium phash | chromium class | firefox phash | firefox class | CF hamming |
| --- | --- | --- | --- | --- | --- | --- |
| `erythrocyte.svg` | 38 | 38 | divergent | 38 | divergent | 0 |
| `duplicate-gradient-stops-pct.svg` | 34 | 34 | divergent | 33 | divergent | 17 |
| `group-no-creation.svg` | 34 | 33 | divergent | 34 | divergent | 15 |
| `path-with-closepath.svg` | 34 | 34 | divergent | 34 | divergent | 0 |
| `flask-3-empty.svg` | 34 | 34 | divergent | 32 | divergent | 8 |
| `stanford_b_debakey_IIIa.svg` | 34 | 34 | divergent | 34 | divergent | 0 |
| `dont-convert-short-color-names.svg` | 33 | 33 | divergent | 33 | divergent | 0 |
| `group-creation.svg` | 33 | 33 | divergent | 33 | divergent | 8 |
| `quot-in-url.svg` | 33 | 33 | divergent | 33 | divergent | 0 |
| `path-quad-optimize.svg` | 32 | 32 | divergent | 32 | divergent | 6 |
| `plano-convex-lens.svg` | 32 | 32 | divergent | 28 | divergent | 4 |
| `stanford_a_debakey_II.svg` | 32 | 32 | divergent | 32 | divergent | 0 |
| `polygon-coord-neg.svg` | 31 | 30 | divergent | 31 | divergent | 0 |
| `nucleotide-c-ul.svg` | 30 | 30 | divergent | 26 | divergent | 12 |
| `liver-fluke-unembryonated-egg.svg` | 30 | 30 | divergent | 30 | divergent | 0 |
| `flask.svg` | 30 | 30 | divergent | 30 | divergent | 0 |
| `microtube-closed.svg` | 30 | 28 | divergent | 30 | divergent | 2 |
| `penetrating_atherosclerotic_ulcer.svg` | 30 | 30 | divergent | 30 | divergent | 0 |
| `thermometer.svg` | 28 | 22 | divergent | 28 | divergent | 6 |
| `nucleotide-t-ul.svg` | 28 | 28 | divergent | 28 | divergent | 4 |
| `zygote.svg` | 28 | 28 | divergent | 28 | divergent | 0 |
| `Amphiprion_ocellaris_egg.svg` | 28 | 28 | divergent | 28 | divergent | 0 |
| `useClientPoint.svg` | 26 | 26 | divergent | 26 | divergent | 0 |
| `Scientist_female.svg` | 26 | 26 | divergent | 26 | divergent | 0 |
| `harmful.svg` | 26 | 26 | divergent | 26 | divergent | 0 |

## Worst-offender gallery

Before/after PNG pairs saved under `test-results/svg_visual_regression/` (gitignored).
Files are named `NNN_<stem>_<engine>_orig.png` and `NNN_<stem>_<engine>_norm.png`.

## Visual fidelity assessment

**Chromium:** 24.3% identical, 24.0% minor, 51.7% divergent
**Firefox:** 25.3% identical, 23.0% minor, 51.7% divergent

