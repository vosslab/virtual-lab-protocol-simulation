# No-crop Round 3 architecture vocabulary clarification

Date: 2026-05-21
HEAD: 8795d25
Status: clarification note (doc-only; no code, CSS, YAML, or contract edits)
Author note: This is a meta-clarification, not a workstream artifact. It
corrects vocabulary drift in WS-D, WS-E, and WS-F output that implied
`experiments/css_native_layout/regions/*.yaml` was sanctioned project
architecture. It is not. This note re-anchors language without deleting
files, renaming files, or changing the contract.

## Durable vocabulary surface

Durable vocabulary surface is `docs/specs/`. Anything outside
`docs/specs/` is working or experimental and must not be promoted by
language. `docs/active_plans/` and `docs/CHANGELOG.md` are working
documents and are not cited here as canonical vocabulary sources.

The canonical vocabulary docs are:

- [docs/specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md)
- [docs/specs/MATERIAL_CONVENTION.md](specs/MATERIAL_CONVENTION.md)
- [docs/specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md)
- [docs/specs/OBJECT_YAML_FORMAT.md](specs/OBJECT_YAML_FORMAT.md)
- [docs/specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md)
- [docs/specs/PROTOCOL_STEPS.md](specs/PROTOCOL_STEPS.md)
- [docs/specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md)
- [docs/specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md)
- [docs/specs/SCALING_MODEL.md](specs/SCALING_MODEL.md)
- [docs/specs/SCENE_ARCHITECTURE.md](specs/SCENE_ARCHITECTURE.md)
- [docs/specs/SCENE_INHERITANCE.md](specs/SCENE_INHERITANCE.md)
- [docs/specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md)
- [docs/specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md)
- [docs/specs/SPEC_DESIGN_CHECKLIST.md](specs/SPEC_DESIGN_CHECKLIST.md)
- [docs/specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md)
- [docs/specs/TARGET_FILE_STRUCTURE.md](specs/TARGET_FILE_STRUCTURE.md)
- [docs/specs/WALKTHROUGH_GUIDE.md](specs/WALKTHROUGH_GUIDE.md)

None of the canonical specs above carry a "region" schema construct.
The closest canonical construct (a named placement area inside a
scene) is `zone`, declared by the scene YAML `zones[]` array and
referenced from placements via `placement.zone`. See
[docs/specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md) sections
"What a scene is" and "zone".

## Repo-wide evidence (verified at HEAD 8795d25)

| Quantity | Count | Notes |
| --- | --- | --- |
| Total YAML files in repo | 416 | matches user snapshot |
| YAML files mentioning "scene" | 86 | user snapshot listed 263; actual is 86 |
| YAML files mentioning "region" | 8 | user snapshot listed 4 |
| YAML files under `experiments/css_native_layout/regions/` | 4 | `bench.yaml`, `bench_e.yaml`, `hood.yaml`, `instrument.yaml` |

The eight YAML files that mention "region" at all are:

- `experiments/css_native_layout/regions/bench.yaml`
- `experiments/css_native_layout/regions/bench_e.yaml`
- `experiments/css_native_layout/regions/hood.yaml`
- `experiments/css_native_layout/regions/instrument.yaml`
- `experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml`
- `experiments/css_native_layout/scenes/crowded_bench_dense.yaml`
- `experiments/css_native_layout/spike_fixtures/well_plate_96_zoom_manifest.yaml`
- `content/objects/plate/well_plate_96.yaml`

All eight live under `experiments/css_native_layout/` (and the two
non-experiments occurrences are incidental string usage, not schema
adoption). The "region" word does not appear in any
`docs/specs/*.md` schema table; it only appears as descriptive
English (for example "a layout region declared by `zones[]`" in
SCENE_VOCABULARY.md).

User-snapshot reconciliation: the 4/263 figures in the dispatch
brief were a smaller sample than the verified counts above. The
shape of the finding does not change: region YAML is an
experiment-local artifact, scene YAML is the durable form, and the
ratio (8 / 416 = ~2% region; 86 / 416 = ~21% scene) confirms
"experiment-local" vs "broadly adopted".

## What "scene" means in this repo

"Scene" is the durable, canonical authoring concept for "where
things appear and how the space is arranged". The canonical
definition lives in
[docs/specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md):

> A scene is the unit of authoring for "where things appear and how
> the space is arranged". One scene declares one workspace surface,
> one optional static backdrop, one set of named placement regions
> (zones), one set of object placements (each placement references
> an object from the object library by id), and the
> spatial-arrangement rules that the layout engine consumes.

The hard contract item that anchors this is
[docs/PRIMARY_CONTRACT.md](PRIMARY_CONTRACT.md) item 1 (scene and
protocol configuration live in YAML) and item 3 (clickable objects
are SVG-backed scene objects laid out by the layout engine). The
scene YAML schema is closed and lives in
[docs/specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md). The
scene runtime model lives in
[docs/specs/SCENE_ARCHITECTURE.md](specs/SCENE_ARCHITECTURE.md).

Scene-side durable terms (from SCENE_VOCABULARY.md):

- `scene` -- the authoring unit; lives in scene YAML.
- `placement` -- a scene-side entry that names an object by
  `object_name` and states where it goes (zone, depth tier, align
  stop, optional layout overrides).
- `zone` -- a named placement region inside a scene, declared by
  `zones[]` and referenced via `placement.zone`. The word "region"
  in spec text is descriptive English for a zone; the schema
  construct is `zone`.
- `object_name` -- the id by which a placement references an entry
  in the object library.
- `scene_bounds`, `layout_rules` -- placement geometry consumed by
  the layout engine.

## What "region" means in the css_native_layout experiment

`experiments/css_native_layout/regions/*.yaml` is an experiment-local
mapping artifact. It declares a `kind_to_footprint` map from object
`kind` strings to `footprint--*` CSS class labels, used by the
CSS-native visual-test pipeline that the css_native_layout experiment
was prototyping. The four files in that folder are `bench.yaml`,
`bench_e.yaml`, `hood.yaml`, and `instrument.yaml`.

These files are not scene YAML. They do not declare a scene, a
backdrop, zones, placements, scene bounds, or layout rules. They
declare a mapping table consumed (or intended to be consumed) by an
experiment-local renderer. The canonical schema for scenes lives in
[docs/specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md) and is
unrelated to the `regions/*.yaml` shape.

The word "region" in the folder name predates the canonical "zone"
vocabulary in SCENE_VOCABULARY.md. It is therefore a shadow term, in
the sense of PRIMARY_DESIGN's "one canonical term per concept" rule
(see PRIMARY_DESIGN "Vocabulary closure and anti-drift"). The fix is
language, not deletion. See "Recommendation" below.

## Is regions/*.yaml consumed by any current render path?

No production path consumes it. The WS-D audit
([docs/active_plans/workstreams/no_crop_render_harness_audit.md](workstreams/no_crop_render_harness_audit.md))
established that none of the three render paths
(production runtime, static template, stress static-HTML) reads
`kind_to_footprint` from `regions/*.yaml` at HEAD 8795d25:

- Production runtime: `src/scene_runtime/layout/css_native_adapter.ts`
  builds `.placement` divs but does not add a `footprint--<kind>`
  class. `git ls-files src/ | xargs grep -ln kind_to_footprint` is
  empty.
- Static template: each `experiments/css_native_layout/templates/*.html`
  has the `footprint--<kind>` class hand-typed per element. No
  generator script consults regions YAML.
- Stress static-HTML harness: the canonical referencing script
  `experiments/css_native_layout/stress_generators/render_stress_to_html.py`
  is missing from git history and was never tracked. The
  `experiments/css_native_layout/stress_scenes/rendered/*.html`
  files on disk are the untracked byproduct of an uncommitted
  script.

So both statements are true and need to be kept together when
describing the state:

1. `regions/*.yaml` is not consumed by any current production render
   path.
2. It was intended for an experiment-local static visual-test
   renderer that does not currently exist in the tree.

Treating `regions/*.yaml` as durable project architecture confuses
these two facts. It is the input shape that a missing experimental
renderer was meant to read.

## Should regions/*.yaml remain, be renamed, or be replaced?

Recommendation for the current Round 3 work: keep the files in
place. Do not delete them. Do not rename them in this session.
Renaming requires a follow-up plan because at least one rendered
HTML on disk and several plan docs reference the path.

For future work, if a mapping artifact is needed by an
experiment-local static visual-test renderer, prefer:

- A single file at `experiments/css_native_layout/object_footprints.yaml`
- A header comment block that reads, verbatim: "Experimental
  CSS-native visual-test mapping. Not production schema. See
  docs/specs/SCENE_VOCABULARY.md for the canonical scene-side
  vocabulary; this file is not scene YAML."
- A schema scoped to the experiment, not the project; the canonical
  scene-side vocabulary stays in docs/specs/.

The eventual rename
(`experiments/css_native_layout/regions/*.yaml` -> a single
`experiments/css_native_layout/object_footprints.yaml`) is queued
as a separate plan, not executed here.

## Vocabulary table for future reports

| Concept | Durable canonical term | Where it lives | Notes |
| --- | --- | --- | --- |
| Authoring unit for "where things appear" | scene | docs/specs/SCENE_VOCABULARY.md; docs/specs/SCENE_YAML_FORMAT.md | the contract-anchored term |
| Scene declaration data | scene YAML / scene manifest | content/scenes/*.yaml (and equivalents) | not regions/*.yaml |
| A clickable lab thing | scene object | docs/specs/OBJECT_VOCABULARY.md; PRIMARY_CONTRACT item 3 | SVG-backed, declared in scene YAML |
| Visible artwork for a scene object | SVG asset | docs/specs/SVG_PIPELINE.md; assets/ | normalized SVGs only |
| Named placement area inside a scene | zone | docs/specs/SCENE_VOCABULARY.md "zone" section | the schema construct; "region" in spec text is descriptive English for a zone |
| Aspect/sizing class for visual-test layout | footprint class | docs/active_plans/workstreams/no_crop_footprint_vocab_proposal.md (proposal-only) | experimental until promoted; not in docs/specs/ |
| Experiment-local mapping artifact | region YAML (legacy filename); future: object_footprints YAML | experiments/css_native_layout/regions/*.yaml today | not project architecture; not scene YAML |

Going-forward language rules for workstream reports:

- "scene" is durable. Use it freely.
- "scene YAML" / "scene manifest" is durable. Use it freely.
- "scene object" is durable. Use it freely.
- "SVG asset" is durable. Use it freely.
- "footprint class" is the experiment-local visual-test class label;
  use it when describing the visual-test CSS work. Mark it as
  experimental.
- "region" (in this repo) is the legacy filename inside the
  css_native_layout experiment. When used in a workstream report,
  qualify it as "experiment-local" and do not let it stand alone as
  if it were durable architecture.

## Source files read

- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/PRIMARY_CONTRACT.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/PRIMARY_DESIGN.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/specs/SCENE_VOCABULARY.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_render_harness_audit.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_footprint_vocab_proposal.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_round3_plan.md`
- `experiments/css_native_layout/regions/` listing (4 files)
- repo-wide YAML scan for "scene" and "region" tokens at HEAD 8795d25

## Handoff

- Status: DONE.
- Artifact: this file.
- Round 3 plan is now framed as scene/object/asset/footprint driven.
- Region YAML stays in place; rename is queued, not executed.
- Durable vocabulary surface is docs/specs/ only.
