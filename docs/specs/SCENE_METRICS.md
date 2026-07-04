# Scene metrics

Canonical reference for the layout health report. Written for scene YAML authors
who edit scene files but are not engine developers. For scene-by-scene analysis
and priority work lists, see
[LAYOUT_REMAINING_WORK.md](../LAYOUT_REMAINING_WORK.md).

---

## Quickstart for scene writers

Run the report for all scenes from the repo root:

```bash
python3 run_scene_health.py
```

Run for one scene only:

```bash
python3 run_scene_health.py scene_name
```

List all known scene names:

```bash
python3 run_scene_health.py --list
```

Replace `scene_name` with the snake_case name of your scene (for example
`bench_basic`, `hood_workspace`).

**Where the output lands.** The all-scenes command writes:

- `test-results/layout_health/health_report.md` -- worst-first designer scorecard
  (gitignored; regenerate it before reading).
- `test-results/layout_health/health_report.json` -- machine-readable per-scene data.

The single-scene command (`python3 run_scene_health.py scene_name`) prints the
selected scene's row directly to the terminal AND writes (or refreshes) the full
all-scenes `health_report.md`. You can open the report after running the single-scene
command to see the wider context around your scene.

---

## How do I get scene metrics for my new scene?

Follow this workflow each time you add or edit a scene and want a health readout.

1. Add or edit your scene YAML.

2. Run `python3 run_scene_health.py <scene_name>` (no precompute, no npm -- the
   script does everything).

3. Read the printed scorecard row: category, one-line diagnosis, evidence, suggested
   authoring target.

4. Open `test-results/layout_health/health_report.md` for the full report if you want
   more detail.

5. Revise the scene YAML.

6. Rerun the same command until the diagnosis is acceptable.

### Troubleshooting

- **Scene not found.** Run `python3 run_scene_health.py --list` and match the exact
  name.

- **Report did not update.** Rerun the command; check `test-results/layout_health/`.

- **Metrics look wrong.** Open the SVG overlay under `test-results/` and compare
  visually before changing authoring.

- **Borderline warning.** Inspect the overlay before acting; provisional bands are
  advisory, not hard gates.

---

## How to read the scorecard

A scene may belong to more than one category. Categories describe what the
metrics show, not who is responsible for a fix.

| Category | What it means |
| --- | --- |
| `healthy` | Fill, shrink, and label are within the target bands. No action needed. |
| `sparse` | Very little content; fill is well below the lower band. Usually a dev or test fixture. |
| `crowded` | Fill is above the upper band or object bounding boxes overlap. Dense layouts may be intentional (microscope views). |
| `shrink-stressed` | Objects are compressed to near the packing floor. Mean final scale at or below the corpus median (0.47), or a uniform rescale was applied. Content may be too small to read comfortably. |
| `label-stressed` | Label conflict count is 2 or more. Labels overlap or are very close to object artwork. |
| `off-canvas` | One or more object bounding boxes extend beyond the scene boundary. The engine did not catch this as an error. |
| `high-empty-space-plus-shrink` | Objects are shrunk while a large empty region persists. The packer is not filling available space even though content is compressed. |

---

## What to change in a scene

The **finding** is the root-cause classification -- it says who acts and what
kind of change is needed. The finding appears next to each scene in the report.

| Finding | Root cause | Authoring action |
| --- | --- | --- |
| `healthy` | Metrics within all bands. | No change needed. |
| `authoring` | Too many objects for the current zone layout; packer shrinks content to fit. | Reduce object count in the named zone (check protocol first -- do not remove objects the protocol actually uses), or add a zone row to give the packer more vertical space. |
| `engine-fit` | Objects pack correctly but the zone spans only part of the scene, leaving a large empty region outside it. Object count is not too high. | Widen the packed zone in scene YAML so the packer uses more of the scene. Do not reduce object count. |
| `intentional` | Dense layering (microscope views) or trivial content (dev fixtures) is expected by design. | Confirm the design is correct and leave the scene alone. |
| `validation` | A constraint violation the engine did not catch: off-canvas art, same-tier object overlap, or unresolved label conflicts. | Fix the violation directly: pull off-canvas objects inside `scene_bounds`, separate overlapping same-tier objects by moving one to a different depth tier, or shorten labels and widen label spacing. |

### Practical authoring moves mapped to findings

**Reduce object count (`authoring`).** Remove objects from the named zone that
are not required by the protocol. Read the protocol YAML to confirm which
objects appear in interactions before removing anything. Do not thin a zone
without checking protocol intent.

**Add a zone row (`authoring`).** Split a dense zone into two narrower rows
in the scene YAML. This keeps all objects but spreads them across more vertical
space, letting the packer place them at a larger scale.

**Widen the packed zone (`engine-fit`).** Extend the zone's `x_start`/`x_end`
(or `y_start`/`y_end`) boundaries so the packer fills more of the available
scene area. Do not reduce object count.

**Move content between tiers (`authoring` or `engine-fit`).** Move an object
from an overcrowded zone into an underused zone. Verify the object still appears
in the correct curriculum context after the move.

**Adjust label placement (`validation`, label conflicts).** Shorten a label
string in the object YAML, increase `label_offset_y` to push the label away
from nearby artwork, or narrow the zone to reduce label-to-artwork proximity.

---

## Evidence fields

Each scene entry in the full report lists evidence fields below the verdict.
These are the raw metric values behind the category and finding.

| Field | What it measures | How to read it |
| --- | --- | --- |
| `fill <value> (band <low>..<high>)` | Fill ratio: fraction of scene area covered by object bounding boxes. Low fill alone is not a problem; it becomes one combined with shrink stress. | Below the low edge = sparse. Above the high edge = dense. |
| `largest empty rect <pct>% at <location> (room edge <threshold>)` | Largest empty rectangle as a fraction of scene area, and where it sits (top, bottom, center, left, right). | Above the room edge (0.23) means usable space is not being used. Combine with shrink to identify `engine-fit` scenes. |
| `shrink proxy: mean final_scale <value>` | Average object scale after the horizontal packer runs. Lower = smaller objects. At or below 0.47 (stressed edge) means significant compression. **PROXY** -- derived from available data, not an exact per-object measurement. | At or below 0.47 = shrink-stressed. Near or below 0.27 = at the engine floor. |
| `shrink proxy: uniform_rescale factor <value>` | A single-pass vertical rescale applied because packed content exceeded the scene boundary. Near the vertical floor (0.27) means content is as small as the engine allows. **PROXY.** | Any non-null value means vertical overflow occurred; lower = more severe. |
| `shrink proxy: up to N horizontal shrink pass(es)` | How many horizontal shrink iterations ran before convergence. Present only when passes > 0. **PROXY.** | Higher pass count = more packing pressure. |
| `label conflicts <n> (edge <threshold>)` | Count of label-to-label or label-to-artwork overlaps. At or above 2 is label-stressed. | 0 = clean. 2 or more = investigate which objects are causing conflicts. |
| `object overlaps <n> (same-tier S, cross-tier C, cross-zone Z)` | Overlap graph: how many object bounding boxes touch or cross, split by same depth tier, cross tier, and cross zone. Same-tier overlaps are always defects; cross-tier overlaps may be intentional in layered scenes. | Same-tier > 0 in a bench scene = zone sizing error. Cross-tier in a microscope scene = intentional layering. |
| `<N> objects; balance offset (<x>, <y>)` | Item count and the centroid offset from the scene center. Large offsets indicate lopsided composition. | Near (0, 0) = balanced. Large offset = consider redistributing objects across zones. |

### PROVISIONAL bands and PROXY shrink signals

**PROVISIONAL:** All threshold bands (fill, largest empty rectangle, shrink,
label conflict) are derived from the distribution of 38 scenes and are pending
human approval. They drive category assignment but are not approved quality gates.
Recalibrate bands after a scene-fixing pass as the distribution shifts.

**PROXY:** The shrink evidence fields (`mean final_scale`, `uniform_rescale factor`,
horizontal shrink passes) are approximations derived from available layout data.
The engine does not expose an exact per-object rescale count. Treat them as
directional signals, not precise measurements.

---

## For maintainers

### How the report is generated

The health report tool (`tools/layout_health_report.mjs`) is a pure
interpretation layer over the raw geometry metrics produced by
`tools/layout_metrics.mjs`. It reads `test-results/layout_metrics/*.json` and
never reruns the layout pipeline. `run_scene_health.py` runs both steps in
sequence: `node --import tsx tools/layout_metrics.mjs` first to refresh metrics,
then `node --import tsx tools/layout_health_report.mjs` to classify them. For
direct tool access, `npm run layout:metrics` regenerates metrics for all scenes
and `npm run layout:health` regenerates the full health report.

The tool derives threshold bands at runtime from the distribution of all scenes
present in the metrics directory (percentile-based: p25, p50, p75, p90). Bands
shift when scenes are added or removed. The full band derivation is in
`deriveBands()` inside `tools/layout_health_report.mjs`.

### Current provisional band values

Derived from 38 scenes (WS-C/WS-D wave, 2026-06-26). PROVISIONAL -- pending
human approval.

| Band | Edge | Value | Basis |
| --- | --- | --- | --- |
| Fill -- sparse edge | p25 | 0.028 | Below = sparse |
| Fill -- dense edge | p75 | 0.1095 | Above = dense |
| Largest empty rect -- elevated | p75 | 0.2288 | Above = room unused |
| Largest empty rect -- severe | p90 | 0.4091 | Above = severely empty |
| Shrink -- stressed edge | p50 | 0.4656 | At or below = shrink-stressed |
| Shrink -- horizontal floor | constant | 0.55 | Individual object minimum scale |
| Shrink -- vertical floor | constant | 0.27 | Uniform-rescale minimum |
| Label conflicts -- stressed edge | p90 | 2 | At or above = label-stressed |

### Severity scoring

Worst-first severity score is a weighted sum of defect signals: off-canvas
objects (weight 1000 each), same-tier overlaps (100 each),
high-empty-space-plus-shrink (flat 50), shrink severity (60 times distance from
healthy scale), wasted room while shrunk (60 times LER overshoot), label
conflicts (weight per conflict), uniform-rescale-at-floor (flat penalty), and
object overlaps (weight per overlap). Higher score = higher priority.
