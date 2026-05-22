# Round 3 M2: staining_bench mount proof

Date: 2026-05-22
Owner: Round 3 Runtime Quality Initiative, milestone M2
Inputs:

- [round3_runtime_mount_gap_repair.md](round3_runtime_mount_gap_repair.md) (R1 fix)
- [round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md) (R6 schema)

Decision: KEEP R1 (`inferInitialScene` entry-`SceneChange` branch).

## Mount-success

- Protocol: `sdspage_destain_gel_setup`
- Target scene: `staining_bench`
- Driver: walker-mount via `loadAndMountByProtocolName(root, protocol)` on `http://127.0.0.1:8765/index.html` (local `python3 -m http.server` over `dist/`).
- Result:
  - `runtime.mounted = true`
  - `runtime.activeSceneId = staining_bench`
  - `runtime.protocol_name = sdspage_destain_gel_setup`
  - `runtime.entry_step = rinse_first`
  - Console error count = 0 (no `pageerror`, no `[error]`).

Build inputs:

- `bash build_github_pages.sh` exit 0 (`dist/main.js` 2.3 MB rebuilt).
- `bash pipeline/build_runtime_bundle.sh` exit 0 (`dist/runtime.bundle.js` 2.6 MB rebuilt).
- `python3 pipeline/build_protocol_html.py --protocol sdspage_destain_gel_setup` -> `dist/sdspage_destain_gel_setup.html`.

## Screenshot path

`test-results/round3_runtime_initiative/staining_bench_proof.png` (1280 x 900, headless chromium).

## Scoreboard row

| protocol | scene | mounted | console_errors | visible_crop_count | placeholder_count | label_overlap_count | off_page_count | object_clarity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sdspage_destain_gel_setup | staining_bench | YES | 0 | 1 | 2 | 1 | 0 | 2 |

Notes on inventory: counts are from a single 1280x900 viewport capture of the
initial mounted state with no interactions performed. They reflect what a
student would see on first paint of the scene.

## Top 3 residual visual defects

1. Label overflow on right edge: the "Rocking Shaker" label is clipped on
   the right side of the 1280-wide viewport, and its baseline overlaps the
   "Microwave" label directly below. Two adjacent labels in the bottom-right
   instrument cluster collide visually. This is the single most prominent
   defect: it is a label-layer problem (text bbox overruns scene bbox), not
   an asset-layer crop. Severity: HIGH (legibility, scene boundary).

2. Staining tray asset is a placeholder shape: the central "Staining Tray"
   target renders as a thick green rounded rectangle outline with no
   internal tray geometry (no walls, no liquid surface, no scientific
   detail). This is the protocol's primary interactive target, so the
   placeholder reads as the most clarity-eroding scene element.
   Severity: HIGH (clarity = 2/5 across scene driven mainly by this object).

3. Tiny volumetric flasks vs oversized typography: the four reagent
   bottles (Coomassie stain, Coomassie recycle bottle, Destain, Destain
   waste bottle) and the ddH2O wash bottle render at ~ 60-80 px tall while
   the "Staining Tray" header text and "Rocking Shaker"/"Microwave" device
   labels render at display sizes that visually dominate them. Reagent
   identity is recognizable but not legible at a glance; aspect ratios look
   correct (no obvious distortion), but the size hierarchy fights pedagogy
   (the labeled scientific objects feel less prominent than ambient text).
   Severity: MEDIUM (clarity and visual hierarchy, not a hard crop).

Inventory counts behind the row:

- `visible_crop_count = 1` ("Rocking Shaker" label clipped at viewport right edge).
- `placeholder_count = 2` (staining tray as bare green rounded-rect outline; kimwipe pad as small "O").
- `label_overlap_count = 1` ("Rocking Shaker" / "Microwave" label baselines overlap).
- `off_page_count = 0` (no scene object centroid lies outside the 1280 x 900 viewport).
- `object_clarity = 2/5` (volumetric flasks read; primary target staining tray reads as placeholder; instrument labels collide).

## Recommended next fix

Address the bottom-right instrument label cluster before any asset re-skin:
clamp scene-object label text width to the parent placement card and add a
small vertical gutter between adjacent device labels so "Rocking Shaker" and
"Microwave" do not collide and the right-edge clipping disappears. This is a
single layout-engine / label-style change (no content YAML edit, no asset
re-author) and removes the highest-severity defect from the scoreboard row
without touching R1.

Second-priority fix (separate milestone): replace the staining-tray placeholder
with a real scientific SVG. That is content/authoring work and exceeds an
M2-style runtime fix; track under a future milestone.

## Keep / reject

- KEEP R1: `inferInitialScene` entry-`SceneChange` branch in
  `src/scene_runtime/loader/world.ts`. It is the load-bearing reason
  `staining_bench` mounts at all; reverting R1 returns the
  `Cannot determine scene for target object "staining_tray"` failure.

## Reproduce

```
bash build_github_pages.sh
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_destain_gel_setup
( cd dist && python3 -m http.server 8765 ) &
node tests/playwright/_temp_round3_staining_mount.mjs
```

The driver script `_temp_round3_staining_mount.mjs` is an underscore-prefixed
scratch file mirroring `_temp_round3_cell_counter_mount.mjs` and is safe to
delete after the run.

## Boundaries respected

- No edits to `src/`, `content/`, `generated/`, layout engine, or render pipeline.
- No edits to `docs/PRIMARY_CONTRACT.md`, `docs/PRIMARY_SPEC.md`, `docs/PRIMARY_DESIGN.md`, or `docs/specs/`.
- No new vocabulary, no contract item added.
- No git commit, no broad pytest run.
- ASCII only throughout.
