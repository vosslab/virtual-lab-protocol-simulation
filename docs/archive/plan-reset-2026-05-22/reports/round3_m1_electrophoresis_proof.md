# Round 3 M1: electrophoresis_bench mount proof

Date: 2026-05-22
Owner: Round 3 Runtime Quality Initiative, milestone M1
Depends on: R1 mount-gap fix at `src/scene_runtime/loader/world.ts:188-205`
Companion: [round3_runtime_mount_gap_repair.md](round3_runtime_mount_gap_repair.md),
[round3_electrophoresis_mount_variant.md](round3_electrophoresis_mount_variant.md),
[round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md)

## Mount-success confirmation

Protocol `sdspage_assemble_electrode_module` was loaded through the production
runtime path (`file://dist/sdspage_assemble_electrode_module.html` ->
`runtime.bundle.js` -> `loadAndMountByProtocolName`) after a fresh
`bash build_github_pages.sh` and `bash pipeline/build_runtime_bundle.sh`.

Runtime state observed:

- `__RUNTIME_PROTOCOL_CONFIG` present: YES
- `world.protocol.protocol_name`: `sdspage_assemble_electrode_module`
- `world.activeSceneId`: `electrophoresis_bench` (matches expected)
- `world.activeStepIndex`: 0
- console errors: 0
- pageerror count: 0

The R1 fix at `src/scene_runtime/loader/world.ts:188-205` is doing exactly
what its rationale claims: the explicit `SceneChange { to_scene:
electrophoresis_bench }` in the entry step's first interaction is honored
by `inferInitialScene` and the runtime mounts directly into the
electrophoresis bench scene.

Raw walker summary: `test-results/round3_runtime_initiative/electrophoresis_bench_proof.json`.

## Screenshot path

`test-results/round3_runtime_initiative/electrophoresis_bench_proof.png`
(1280 x 900 viewport, fullPage: false, headless chromium).

## Scoreboard row

Following the R6 schema in [round3_runtime_quality_scoreboard.md](round3_runtime_quality_scoreboard.md).

| Scene | visible_crop_count | placeholder_count | label_overlap_count | off_page_count | object_clarity | click_target_smoke | object_state_change_smoke | combined_score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| electrophoresis_bench (initial, post-R1) | 1 | 4 | 4 | 3 | 2 | untested | untested | -10 |

Notes on counts:

- `visible_crop_count = 1`: the lower row of placement cards ("Mini-PROTEAN"
  label plus bottom-right p10 tip-box placeholder ring) is clipped at the
  viewport bottom edge.
- `placeholder_count = 4`: large left green ring (Gel cassette), large
  center green ring (electrode module), bottom-right green ring (p10 gel
  loading tip box), small green dot near p100 micropipette. The dashed
  "Power Supply (off)" box is an authored placeholder visual and is
  counted alongside the four green fallback rings only once at the row
  level (kept at 4 to align with R6 counting of fallback shapes; the
  authored dashed box is documented narratively, not double-counted).
- `label_overlap_count = 4`: (a) top-center title cluster
  "Electrophoresis" and "Power Supply" collide and stack; (b) mid-canvas
  "Gel cassette" and "electrode module" titles collide; (c) "p10 gel
  loading tip box" overlaps "p100 micropipette" right of center;
  (d) "Power Supply" title sits inside the dashed placeholder and
  collides with the adjacent "Gel Opening Tool" label.
- `off_page_count = 3`: top "Electrophoresis" and "Power Supply" titles
  overshoot the top viewport edge; bottom "Mini-PROTEAN" label and the
  bottom-right p10 tip-box ring are clipped at the bottom edge.
- `object_clarity = 2`: three small lab-glassware silhouettes (running
  buffer 10x flask, protein ladder tube, buffer recycle bottle) are
  recognizable top-left; a Mini-PROTEAN-style tank silhouette is
  recognizable center; everything else is a green placeholder ring or
  an oversized label, so clarity is limited but better than the worst
  rows in R6.
- `combined_score = 2 - (1 + 4 + 4 + 3) = -10`.
- `click_target_smoke = untested`, `object_state_change_smoke = untested`:
  this milestone's brief was mount-proof + visual inventory only. M1 did
  not drive a follow-on click; doing so would burn the M4 budget.

## Top 3 residual defects

1. Oversized title typography overflows the viewport and collides with
   other titles. Two large bold titles ("Electrophoresis" + "Power
   Supply") render at a size that pushes them off the top edge and stacks
   them on top of each other. The mid-canvas "Gel cassette" + "electrode
   module" titles do the same on a second row. This is a placement-card
   typography problem, not a per-asset crop.
2. Four green fallback placeholder rings dominate the scene (gel
   cassette, electrode module, p10 tip box, plus a small dot). None of
   these have resolved to a real SVG asset, so the bottom half of the
   scene reads as "placeholder shapes with labels" rather than a
   recognizable lab bench.
3. Bottom-edge clipping of the p10 tip-box card and its label
   ("Mini-PROTEAN"). The lower row of placement cards extends beyond the
   1280 x 900 viewport at this layout density, costing one of the few
   recognizable assets visibility.

## Recommended next fix for this scene

The mount path is done. The remaining work is asset and layout, not
runtime. Recommended sequence for the next scene-quality milestone that
targets electrophoresis_bench:

1. Replace the four green fallback rings with real SVG assets for
   `gel_cassette`, `electrode_module`, `p10_gel_loading_tip_box`, and
   whatever the small bottom-right ring resolves to. This is an SVG
   pipeline + asset registry task (see
   specs/SVG_PIPELINE.md) and will
   collapse `placeholder_count` from 4 toward 0.
2. Shrink and reflow the placement-card titles so "Electrophoresis",
   "Power Supply", "Gel cassette", and "electrode module" fit inside
   their cards and stop overshooting the viewport. This is a CSS / card
   typography task in the scene render pipeline, not a YAML edit, and
   it will collapse `label_overlap_count` and `off_page_count`
   together.
3. Tighten the bottom row's card heights or move the lower placements
   up so the p10 tip-box card and "Mini-PROTEAN" label fit inside the
   900 px viewport, eliminating the single `visible_crop_count`
   instance.

Sequence rationale: step 1 is the largest clarity gain (replaces 4
placeholder rings with real artwork), step 2 is the largest defect-
count gain (resolves 4 overlap + 3 off-page in one pass), step 3 is
the smallest residual and should ride along.

## Keep / reject recommendation

KEEP the R1 fix in `src/scene_runtime/loader/world.ts:188-205`. This
milestone re-proves R1: with the fix in place,
`sdspage_assemble_electrode_module` mounts cleanly into
`electrophoresis_bench` with zero console errors and the expected
`activeSceneId`. The branch is additive (only narrows the candidate
scene set; never widens it) and respects the contract
(`SceneChange` is already authored vocabulary per
PRIMARY_SPEC.md "Scene operations"). No
content YAML was edited to land mount success here; the authored
intent was already correct.

## Next action queued

M1 done. M4 catalog audit covers any siblings: `staining_bench` (also
fixed by R1) and `cell_counter_workspace` (still a content gap per the
R1 report; not entry-`SceneChange` disambiguable). M4 should re-confirm
all R1-touched scenes against the same scoreboard schema and flag any
other gold-listed scene that still fails to mount.

## Boundaries respected

- No edits to `src/`, `content/`, `generated/`, `dist/`, or `pipeline/`
  in this milestone. The R1 source edit is the prior workstream's
  artifact, not this one's.
- No `git commit`. No `./check_codebase.sh`. No broad pytest run other
  than the markdown-links check requested for this artifact.
- ASCII only.
