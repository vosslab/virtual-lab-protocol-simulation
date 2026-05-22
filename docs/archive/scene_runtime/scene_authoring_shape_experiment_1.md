# Scene authoring shape experiment 1

Pre-registered paper experiment comparing three scene authoring models
against every current scene file. This document is the pre-registration
deliverable for WP-EXP1-PRE-1 of plan
`~/.claude/plans/serene-stargazing-moore.md`. Sections 4, 5, 7, 8, 9
are intentionally left for later work packages (WP-EXP1-SKETCH-1 and
WP-EXP1-SCORE-1) and MUST NOT be filled before sketching begins.

Pre-registration timestamp: 2026-05-17.

## 1. Pre-registration

The following sub-sections are copied verbatim from the approved plan
`~/.claude/plans/serene-stargazing-moore.md`. They are frozen at
pre-registration. Any edit to candidates, metrics, threshold, hypothesis,
or the row-name / region-name guardrails invalidates the experiment and
restarts the plan.

### 1.1 Experimental hypothesis

**H1**: At least one coordinate-free authoring model can represent every
current scene-level workspace composition without authored geometry, after
structured scientific objects are treated as single placements.

**Null hypothesis**: Every coordinate-free authoring model under test
requires either authored geometry or an unflagged extra hint to describe at
least one current scene.

**Success criterion**: at least one of {Model B, Model C} is `expressible`
for 100% of current scene files (base + protocol overrides), with sketches
that preserve all `placement_name` values verbatim and contain zero
geometry fields.

**Failure outcome**: no coordinate-free model is expressible across the
corpus. The experiment reports `no_coordinate_free_model_supported`. A
redesign plan opens with the ranked gap signals as input. This plan does
NOT extend to coerce a failing case into either model.

### 1.2 Candidates: Model A, Model B, Model C

This is a paper experiment. No engine built. Per scene, three models are
compared:

- **Model A**: current authored YAML (geometry-bearing: `zones`, `bounds`,
  `scene_bounds`, `depth_tier`, `align`, etc.). The baseline.
- **Model B**: row+slot sketch (workspace + ordered rows + ordered slots;
  zero authored geometry; row order drives vertical position via engine
  policy).

  ```yaml
  scene_name: hood_basic
  workspace: hood
  background: { asset: hood_workspace_bg }
  rows:
    - row_name: rear
      slots:
        - { placement_name: ethanol, object_name: ethanol_bottle }
    - row_name: surface
      slots:
        - { placement_name: hood_surface, object_name: hood_surface }
  ```

- **Model C**: region+slot sketch (workspace + named regions + ordered
  slots; zero authored geometry; region names are semantic areas, not
  positions; engine policy maps named regions to geometry per workspace).

  ```yaml
  scene_name: bench_basic
  workspace: bench
  background: { asset: bench_workspace_bg }
  regions:
    - region_name: back_shelf
      slots:
        - { placement_name: ethanol, object_name: ethanol_bottle }
    - region_name: work_surface
      slots:
        - { placement_name: plate, object_name: well_plate_96 }
    - region_name: front_tools
      slots:
        - { placement_name: pipette, object_name: p200_pipette }
  ```

The difference between B and C:

- Model B assumes vertical ordering is the main structure; row index drives
  geometry.
- Model C allows semantic areas without pretending everything is a row;
  engine policy resolves region semantics to geometry per workspace.
- Both leave geometry to the engine; both forbid authored coordinates.

Only Model B and Model C are scored as candidates for "winning." Model A is
the baseline used to count current geometry leakage; it cannot win because
it carries authored geometry by definition.

Three is the cap. No fourth model added; more than three turns this into
design theater per the four-archive lesson.

### 1.3 Pre-registered metrics

Per-scene table columns. Model-specific columns are computed twice per
scene (once for Model B, once for Model C).

| Column | Type | Definition |
| --- | --- | --- |
| `file` | path | scene file path |
| `scene_name` | string | scene_name |
| `workspace` | enum | `hood` \| `bench` \| `instrument` \| `default` |
| `placement_count` | int | current placement count |
| `structured_object_count` | int | placements whose `object_name` is in the structured-object inventory |
| `current_geometry_fields` | int | count of authored geometry fields in Model A (any of `bounds`, `scene_bounds`, `x`, `y`, `left`, `right`, `top`, `bottom`, `width`, `height`, `center`, `center_x`, `center_y`, `anchor_x`, `anchor_y`, `offset`, `offset_x`, `offset_y`, `margin`, `padding`, `row_y`, `slot_x`, `pixel`, `px`, `depth_tier`, `zone`, `zones`, `align`, `alignment`, `label_orientation`, `align_stop`, `scale`, `baseline`) |
| `B.sketched_rows` | int | rows in Model B sketch |
| `B.placement_preservation` | percent | percent of Model A `placement_name` values preserved verbatim in Model B |
| `B.geometry_leak_count` | int | count of authored geometry fields in Model B (target: 0) |
| `B.ambiguity` | string | one-line note if more than one valid Model B sketch exists; `none` otherwise |
| `B.needs_extra_author_hint` | bool | true if Model B requires the sketcher to invent a hint not in `scene_name`/`workspace`/`capabilities`/`background`/`rows`/`slots`/`placement_name`/`object_name`/`active` |
| `B.inheritance_handled` | bool | for override files: whether `add_placements` / `remove_placements` / `deactivate_placements` / `reposition_placements` can be expressed against Model B without geometry |
| `B.structured_boundary_respected` | bool | true if structured objects appear as one placement in Model B |
| `B.expressible` | bool | true iff `B.geometry_leak_count == 0` AND `B.placement_preservation == 100%` AND `B.needs_extra_author_hint == false` AND (inheritance absent OR `B.inheritance_handled == true`) AND `B.structured_boundary_respected == true` |
| `B.blocker` | string | one-line reason if `B.expressible == false`; empty otherwise |
| `C.sketched_regions` | int | regions in Model C sketch |
| `C.placement_preservation` | percent | percent of Model A `placement_name` values preserved verbatim in Model C |
| `C.geometry_leak_count` | int | count of authored geometry fields in Model C (target: 0) |
| `C.ambiguity` | string | one-line note if more than one valid Model C sketch exists; `none` otherwise |
| `C.needs_extra_author_hint` | bool | true if Model C requires the sketcher to invent a hint not in `scene_name`/`workspace`/`capabilities`/`background`/`regions`/`slots`/`placement_name`/`object_name`/`active` |
| `C.inheritance_handled` | bool | for override files: whether inheritance keys can be expressed against Model C without geometry |
| `C.structured_boundary_respected` | bool | true if structured objects appear as one placement in Model C |
| `C.expressible` | bool | true iff `C.geometry_leak_count == 0` AND `C.placement_preservation == 100%` AND `C.needs_extra_author_hint == false` AND (inheritance absent OR `C.inheritance_handled == true`) AND `C.structured_boundary_respected == true` |
| `C.blocker` | string | one-line reason if `C.expressible == false`; empty otherwise |
| `gap_signal` | string | optional one-line note about any real scene need that neither Model B nor Model C naturally expresses |
| `scene_content_known_issue` | string | optional one-line note when the scene YAML is known incomplete (e.g. `well_plate_workspace` per `focused_well_plate_workspace_plan.md`); carries a pointer to the doc that records the gap |
| `failure_mode` | enum | one of `none`, `model_insufficiency`, `scene_content_incomplete`, `both`. Set when neither model is expressible. Distinguishes "no coordinate-free model can express this" from "the scene is missing content" |

No metric added after sketching begins.

### 1.4 Pre-registered acceptance threshold

The experiment rejects the null hypothesis only if AT LEAST ONE of
{Model B, Model C} satisfies, across every scene with `failure_mode == none`:

- `expressible == true` for that model
- `placement_preservation == 100%` for that model
- `geometry_leak_count == 0` for that model
- `needs_extra_author_hint == false` for that model
- `inheritance_handled == true` for every override file (for that model)
- `structured_boundary_respected == true` for every scene with a
  structured object (for that model)

Additional corpus-wide gates (apply across all sketches):

- Scenes with `failure_mode == scene_content_incomplete` are excluded from
  the H1 threshold but listed explicitly in Section 5.
- Any scene with `failure_mode == model_insufficiency` or
  `failure_mode == both` causes `no_coordinate_free_model_supported`.

If both models are expressible for every scene, the verdict is
`both_supported` and the tie-break is the simpler model. Tie-break rule:
prefer the model with the smaller authoring surface (fewer required
top-level keys), then the model with fewer `ambiguity != none` rows
(clarity over count), then the model with the lower
`vocabulary_extension_count` (count of distinct row_names or region_names
introduced corpus-wide), then Model B by default.

If `scene_content_incomplete` scenes exist but no other failure mode
appears, the verdict carries `_pending_content`.

A scene marked `scene_content_incomplete` still requires a best-effort
Model B and Model C sketch of the currently authored placements. The
incomplete status excludes only the missing, unauthored content from the
verdict. It does not excuse geometry leakage, placement-name loss, or
structured-boundary violations for the placements that do exist.

### 1.5 Model B row-name guardrail

Model B row names are free strings. They must describe semantic grouping,
not geometry. Avoid names such as `left`, `right`, `top`, `bottom`,
`upper`, `lower`, `x1`, `y2`, `north`, `south`, `front`, `back` unless
those words are part of an existing domain term (e.g. `bench_front` where
"front" is a domain convention rather than a coordinate). Reviewer flags
coordinate-flavored row names; sketcher renames before the sketch counts
as `expressible`.

### 1.6 Model C region-name guardrail

Model C region names are free strings. Same rule as Model B: semantic
grouping, not geometry. Region names like `back_shelf`, `work_surface`,
`front_tools`, `instrument_face`, `popup_layer` are semantic. Region
names like `region_1`, `top_region`, `left_panel` are positional and
trigger the same rename-or-fail flag.

### Pre-registration amendment: override-file authoring surface

Amendment date: 2026-05-17.

During WP-EXP1-SKETCH-1, we found that the pre-registered
`needs_extra_author_hint` metric listed only the base-scene authoring surface.
Override files require an explicit override authoring surface, otherwise the
separate `inheritance_handled` metric is impossible to evaluate.

For override files only, these keys are allowed and do not count as extra
author hints:

- `extends`
- `add_slots`
- `remove_slots`
- `deactivate_slots`
- `move_slots`

This amendment clarifies the intended override surface. It does not change the
candidate models, success threshold, geometry ban, placement-preservation rule,
structured-object boundary, or verdict set.

## 2. Method

The Method section describes the planned procedure for WP-EXP1-SKETCH-1
(per-scene sketching) and WP-EXP1-SCORE-1 (aggregate and verdict). It
does not execute the method; sketching begins only after this
pre-registration is reviewed.

### 2.1 Sketcher and reviewer

- One sketcher subagent is dispatched per scene file. Each sketcher
  receives the scene YAML path, the locked metric set from Section 1.3,
  the row-name and region-name guardrails from Sections 1.5 and 1.6, and
  the structured-object inventory from Section 6. The sketcher reads no
  other prior sketches before producing its own.
- One reviewer subagent is dispatched after all sketches land. The
  reviewer reads only the deliverable (Sections 1, 3, 4, 6) and the
  source scene YAMLs. The reviewer audits each sketch for
  geometry-field leakage, placement-name preservation, structured-
  boundary respect, and guardrail compliance. The reviewer flags any
  `needs_extra_author_hint` underreport.

### 2.2 Per-scene sketch order randomization

For each scene, the sketcher draws a coin: Model B sketch first on
even-indexed corpus rows, Model C sketch first on odd-indexed corpus
rows. Index is the row number assigned in Section 3. The intent is to
reduce systematic bias from the sketcher always anchoring on one model.

### 2.3 Sketch surface limits

A Model B sketch may use only these top-level keys:
`scene_name`, `workspace`, `capabilities`, `background`, `rows`,
`add_placements`, `remove_placements`, `deactivate_placements`,
`reposition_placements`. Each row contains `row_name` and `slots`. Each
slot contains `placement_name`, `object_name`, `active` (optional).

A Model C sketch may use only these top-level keys:
`scene_name`, `workspace`, `capabilities`, `background`, `regions`,
`add_placements`, `remove_placements`, `deactivate_placements`,
`reposition_placements`. Each region contains `region_name` and `slots`.
Each slot contains `placement_name`, `object_name`, `active` (optional).

Any additional field appearing in a sketch is either a
`B.needs_extra_author_hint == true` flag or a `geometry_leak_count`
increment, never a silent extension.

### 2.4 Structured-object boundary

Any reference whose `object_name` appears in Section 6 is rendered as one
slot in either model. Its interior layout is owned by the object adapter
(per `docs/specs/LAYOUT_ENGINE.md`). A sketch that breaks a structured
object's interior into multiple slots is flagged
`structured_boundary_respected == false` for that scene-model row.

### 2.5 Scene-content incompleteness flagging

Before scoring, the sketcher cross-references
`docs/archive/well_plate_workspace_pause_note.md` and
`docs/archive/focused_well_plate_workspace_plan.md` for any known-
incomplete scene. A scene with placements that match its current YAML
but documented gaps not yet authored is marked
`scene_content_known_issue` and `failure_mode = scene_content_incomplete`.
The sketcher still produces a best-effort sketch of the currently
authored placements.

### 2.6 Scoring

Scoring is mechanical from the metric definitions in Section 1.3 and the
threshold in Section 1.4. The verdict is one of the seven enum values
listed in the plan's Section 9 (deliverable schema) and reproduced in
the scoring work package WP-EXP1-SCORE-1.

## 3. Per-scene corpus

The corpus is every file enumerated by
`git ls-files content/base_scenes/*.yaml content/protocols/*/scenes/*.yaml`
at pre-registration time (2026-05-17). Total: 34 scene files.

`placements` is the count of `placement_name` strings reachable in the
authored YAML (including inside `add_placements` overrides).
`objects` is the count of distinct `object_name` references in the same
file. `inheritance` lists the inheritance keys present at the top level
of the file (empty list means standalone scene).

| # | file | placements | objects | inheritance |
| --- | --- | --- | --- | --- |
| 1 | content/base_scenes/bench_basic.yaml | 2 | 2 | [] |
| 2 | content/base_scenes/cell_counter_basic.yaml | 2 | 2 | [] |
| 3 | content/base_scenes/electrophoresis_bench.yaml | 16 | 16 | [] |
| 4 | content/base_scenes/heat_block_bench.yaml | 3 | 3 | [] |
| 5 | content/base_scenes/hood_basic.yaml | 4 | 4 | [] |
| 6 | content/base_scenes/imaging_bench.yaml | 2 | 2 | [] |
| 7 | content/base_scenes/microscope_basic.yaml | 1 | 1 | [] |
| 8 | content/base_scenes/sample_prep_bench.yaml | 5 | 5 | [] |
| 9 | content/base_scenes/staining_bench.yaml | 10 | 10 | [] |
| 10 | content/protocols/cell_culture/cell_seeding_plate_setup/scenes/seeding_workspace.yaml | 8 | 8 | [add_placements] |
| 11 | content/protocols/cell_culture/drug_dilution_setup/scenes/bench_setup.yaml | 8 | 8 | [add_placements] |
| 12 | content/protocols/cell_culture/drug_dilution_setup/scenes/dilution_workspace.yaml | 9 | 9 | [add_placements] |
| 13 | content/protocols/cell_culture/mtt_plate_reaction/scenes/incubator_workspace.yaml | 6 | 6 | [add_placements] |
| 14 | content/protocols/cell_culture/mtt_reagent_prep/scenes/bench_workspace.yaml | 5 | 5 | [add_placements] |
| 15 | content/protocols/cell_culture/mtt_solubilization_readout/scenes/bench_workspace.yaml | 3 | 3 | [add_placements] |
| 16 | content/protocols/cell_culture/mtt_solubilization_readout/scenes/plate_reader_workspace.yaml | 2 | 2 | [add_placements] |
| 17 | content/protocols/cell_culture/passage_hood_detachment/scenes/hood_workspace.yaml | 6 | 4 | [add_placements, reposition_placements] |
| 18 | content/protocols/cell_culture/passage_hood_detachment/scenes/microscope_view.yaml | 1 | 1 | [add_placements] |
| 19 | content/protocols/cell_culture/passage_pellet_reseed/scenes/centrifuge_workspace.yaml | 6 | 6 | [add_placements] |
| 20 | content/protocols/cell_culture/passage_pellet_reseed/scenes/hood_workspace.yaml | 6 | 6 | [add_placements] |
| 21 | content/protocols/cell_culture/plate_drug_treatment_drug_addition/scenes/plate_workspace.yaml | 4 | 4 | [add_placements] |
| 22 | content/protocols/cell_culture/plate_drug_treatment_media_adjustment/scenes/plate_workspace.yaml | 3 | 3 | [add_placements] |
| 23 | content/protocols/cell_culture/trypan_blue_counting/scenes/cell_counter_workspace.yaml | 3 | 3 | [add_placements] |
| 24 | content/protocols/cell_culture/trypan_blue_counting/scenes/hemocytometer_view.yaml | 2 | 2 | [add_placements] |
| 25 | content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml | 0 | 0 | [] |
| 26 | content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml | 0 | 0 | [] |
| 27 | content/protocols/sdspage/sdspage_extract_gel_from_cassette/scenes/extraction_workspace.yaml | 1 | 1 | [add_placements] |
| 28 | content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml | 0 | 0 | [] |
| 29 | content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml | 0 | 0 | [] |
| 30 | content/protocols/sdspage/sdspage_load_sample_single_lane/scenes/sdspage_load_sample_single_lane_workspace.yaml | 1 | 1 | [add_placements] |
| 31 | content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml | 0 | 0 | [] |
| 32 | content/protocols/sdspage/sdspage_prepare_sample_mix_single_lane/scenes/sample_prep_bench_override.yaml | 1 | 1 | [add_placements] |
| 33 | content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml | 0 | 0 | [] |
| 34 | content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml | 0 | 0 | [] |

Note on sdspage zero-placement rows (#25, #26, #28, #29, #31, #33, #34):
the scene YAML for these protocols references no `placement_name` /
`object_name` pairs at the scene-file layer; downstream sketching must
flag any of these that prove to require placements as
`scene_content_incomplete` per Section 2.5, and must not invent
placements during sketching.

## 4. Per-scene comparison

This section appends WP-EXP1-SKETCH-1 output. Sketching followed the
pre-registered procedure in Section 2; metrics use the definitions in
Section 1.3; the structured-object inventory in Section 6 is the
authority for the workspace-vs-structured boundary.

Sketch order randomization rule (locked in this section's intro per the
plan's "randomized per scene" requirement): for each corpus row in
Section 3, an even row number sketches Model B first and Model C
second; an odd row number sketches Model C first and Model B second.
The rule is deterministic so the randomization is reproducible.

Convention used in this section:

- `current_geometry_fields` is reported as the count of distinct
  geometry-field NAMES from Section 1.3's enum that appear anywhere in
  the scene YAML (the metric is a count of distinct field types
  authored, not a count of occurrences). Base scenes with the standard
  `scene_bounds` + `zones[].bounds` + `align` + per-placement
  `zone`/`depth_tier` author surface score 10 distinct field types
  (`scene_bounds`, `left`, `right`, `top`, `bottom`, `zones`, `bounds`,
  `align`, `zone`, `depth_tier`). Override scenes with only
  per-placement `zone` + `depth_tier` score 2.
- `B.sketched_rows` and `C.sketched_regions` count only the rows or
  regions that actually carry slots in the sketch. An empty sketch
  (no placements to sketch) reports 0.
- `B.placement_preservation` and `C.placement_preservation` are
  computed against the placements authored in THE FILE ITSELF (the
  Section 3 corpus counts), not against the inherited base-scene
  placements visible at runtime. Inherited base placements are left
  to the base scene's own sketch row.
- Structural finding flagged in advance and recorded once here, then
  rolled into per-scene rows: the `extends` top-level key used by every
  override scene in the corpus is NOT in the locked Model B / Model C
  sketch surface listed in Section 2.3. Per Section 2.3, "any
  additional field appearing in a sketch is either a
  `B.needs_extra_author_hint == true` flag or a `geometry_leak_count`
  increment, never a silent extension." Because `extends` is the only
  authored mechanism to attach `add_placements` /
  `reposition_placements` to a base scene, and the metric
  `inheritance_handled` is silent on the base-attachment mechanism, the
  honest reading is: every override sketch flags
  `needs_extra_author_hint = true` with the inventoried hint
  `extends: <base_scene_name>`. This is recorded uniformly per scene
  and not silently extended into the sketch body. It is exactly the
  kind of locked-surface finding the experiment is designed to
  surface; the verdict and recommendation work package
  (WP-EXP1-SCORE-1) decides what to do with it (e.g. add `extends`
  to the locked surface, or replace inheritance with a different
  mechanism). Sketching does NOT alter the locked surface to fit.
- For all sketches, the placement order inside `slots:` mirrors the
  authoring order of the corresponding placements in the source YAML
  so that placement_name preservation is verifiable line-by-line.
- All sketches use ASCII only.

### 1. bench_basic (content/base_scenes/bench_basic.yaml)

Sketch order: B first, C second (even row).

Model A summary: 2 placements (`rear_left_waste`, `rear_right_vortex`);
current_geometry_fields = 10 (`scene_bounds`, `left`, `right`, `top`,
`bottom`, `zones`, `bounds`, `align`, `zone`, `depth_tier`); no
inheritance keys (standalone base scene).

Model B sketch:

```yaml
scene_name: bench_basic
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_bench
    slots:
      - { placement_name: rear_left_waste, object_name: waste_container }
      - { placement_name: rear_right_vortex, object_name: vortex }
```

Model C sketch:

```yaml
scene_name: bench_basic
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_shelf
    slots:
      - { placement_name: rear_left_waste, object_name: waste_container }
      - { placement_name: rear_right_vortex, object_name: vortex }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could split rear_left vs rear_right into two rows | could split into two regions |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a (no inheritance) | n/a (no inheritance) |
| structured_boundary_respected | true (no structured objects) | true (no structured objects) |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 2. cell_counter_basic (content/base_scenes/cell_counter_basic.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 2 placements (`main_cell_counter`,
`counter_slide_cartridge`); current_geometry_fields = 10; no
inheritance keys. `cell_counter` and `counter_slide_cartridge` are
both in Section 6 (structured).

Model C sketch:

```yaml
scene_name: cell_counter_basic
workspace: cell_counter
capabilities:
  - item_workspace
background: { asset: cell_counter_workspace_bg }
regions:
  - region_name: instrument_face
    slots:
      - { placement_name: main_cell_counter, object_name: cell_counter }
  - region_name: accessory_shelf
    slots:
      - { placement_name: counter_slide_cartridge, object_name: counter_slide_cartridge }
```

Model B sketch:

```yaml
scene_name: cell_counter_basic
workspace: cell_counter
capabilities:
  - item_workspace
background: { asset: cell_counter_workspace_bg }
rows:
  - row_name: instrument_row
    slots:
      - { placement_name: main_cell_counter, object_name: cell_counter }
  - row_name: accessory_row
    slots:
      - { placement_name: counter_slide_cartridge, object_name: counter_slide_cartridge }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could combine into one row | could combine into one region |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (cell_counter + counter_slide_cartridge each one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 3. electrophoresis_bench (content/base_scenes/electrophoresis_bench.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 16 placements; current_geometry_fields = 10; no
inheritance keys. Structured objects present:
`rear_center_electrophoresis_tank` (electrophoresis_tank --
`workspace` per Section 6; see flip-rule note),
`rear_right_power_supply` (power_supply -- structured),
`front_left_mini_protean_gel` (mini_protean_gel -- structured),
`center_gel_cassette` (gel_cassette -- structured). Section 6 flip
rule check: `electrophoresis_tank` kept as `workspace` because the
authored scene does not address tank interior buffer / lid state at
the scene layer.

Model C sketch:

```yaml
scene_name: electrophoresis_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_shelf_reagents
    slots:
      - { placement_name: rear_left_running_buffer_10x, object_name: running_buffer_10x_bottle }
      - { placement_name: rear_left_protein_ladder_tube, object_name: protein_ladder_tube }
      - { placement_name: rear_left_recycle_buffer_bottle, object_name: recycle_buffer_bottle }
  - region_name: rear_apparatus
    slots:
      - { placement_name: rear_center_electrophoresis_tank, object_name: electrophoresis_tank }
      - { placement_name: rear_right_power_supply, object_name: power_supply }
      - { placement_name: rear_right_gel_opening_tool, object_name: gel_opening_tool }
  - region_name: work_surface
    slots:
      - { placement_name: center_running_buffer_1x_carboy, object_name: running_buffer_1x_carboy }
      - { placement_name: center_ddh2o_bottle, object_name: ddh2o_bottle }
      - { placement_name: center_serological_pipette, object_name: serological_pipette }
      - { placement_name: center_waste_container, object_name: waste_container }
      - { placement_name: center_electrode_module, object_name: electrode_module }
      - { placement_name: center_gel_cassette, object_name: gel_cassette }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_area_p200_micropipette, object_name: p200_micropipette }
      - { placement_name: right_tool_area_p10_gel_loading_tip_box, object_name: p10_gel_loading_tip_box }
  - region_name: gel_staging
    slots:
      - { placement_name: front_left_mini_protean_gel, object_name: mini_protean_gel }
      - { placement_name: front_right_gel_comb, object_name: gel_comb }
```

Model B sketch:

```yaml
scene_name: electrophoresis_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_running_buffer_10x, object_name: running_buffer_10x_bottle }
      - { placement_name: rear_center_electrophoresis_tank, object_name: electrophoresis_tank }
      - { placement_name: rear_right_power_supply, object_name: power_supply }
      - { placement_name: rear_left_protein_ladder_tube, object_name: protein_ladder_tube }
      - { placement_name: rear_left_recycle_buffer_bottle, object_name: recycle_buffer_bottle }
      - { placement_name: rear_right_gel_opening_tool, object_name: gel_opening_tool }
  - row_name: work_surface
    slots:
      - { placement_name: center_running_buffer_1x_carboy, object_name: running_buffer_1x_carboy }
      - { placement_name: center_ddh2o_bottle, object_name: ddh2o_bottle }
      - { placement_name: center_serological_pipette, object_name: serological_pipette }
      - { placement_name: center_waste_container, object_name: waste_container }
      - { placement_name: center_electrode_module, object_name: electrode_module }
      - { placement_name: center_gel_cassette, object_name: gel_cassette }
  - row_name: tools
    slots:
      - { placement_name: right_tool_area_p200_micropipette, object_name: p200_micropipette }
      - { placement_name: right_tool_area_p10_gel_loading_tip_box, object_name: p10_gel_loading_tip_box }
  - row_name: gel_staging
    slots:
      - { placement_name: front_left_mini_protean_gel, object_name: mini_protean_gel }
      - { placement_name: front_right_gel_comb, object_name: gel_comb }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 4 | 5 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | rear could split into rear_reagents + rear_apparatus | could merge tool_shelf into work_surface |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (power_supply, mini_protean_gel, gel_cassette each one slot; tank kept one slot per Section 6 workspace classification) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 4. heat_block_bench (content/base_scenes/heat_block_bench.yaml)

Sketch order: B first, C second (even row).

Model A summary: 3 placements; current_geometry_fields = 10; no
inheritance keys. Structured objects: `center_heat_block` (heat_block
-- structured), `rear_left_eppendorf_rack` (microtube_rack_24 --
structured per Section 6 flip-rule check; rack owns 24-tube interior).

Model B sketch:

```yaml
scene_name: heat_block_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_supplies
    slots:
      - { placement_name: rear_left_eppendorf_rack, object_name: microtube_rack_24 }
      - { placement_name: rear_right_protein_ladder, object_name: protein_ladder_tube }
  - row_name: work_surface
    slots:
      - { placement_name: center_heat_block, object_name: heat_block }
```

Model C sketch:

```yaml
scene_name: heat_block_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_shelf
    slots:
      - { placement_name: rear_left_eppendorf_rack, object_name: microtube_rack_24 }
      - { placement_name: rear_right_protein_ladder, object_name: protein_ladder_tube }
  - region_name: work_surface
    slots:
      - { placement_name: center_heat_block, object_name: heat_block }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (heat_block + microtube_rack_24 each one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 5. hood_basic (content/base_scenes/hood_basic.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 4 placements; current_geometry_fields = 10; no
inheritance keys. No structured objects in this scene (`ethanol_bottle`,
`waste_container`, `hood_surface`, `aspirating_pipette` are all
workspace).

Model C sketch:

```yaml
scene_name: hood_basic
workspace: hood
capabilities:
  - item_workspace
background: { asset: hood_workspace_bg }
regions:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_ethanol, object_name: ethanol_bottle }
      - { placement_name: rear_center_waste, object_name: waste_container }
  - region_name: work_surface
    slots:
      - { placement_name: center_hood_surface, object_name: hood_surface }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_aspirating_pipette, object_name: aspirating_pipette }
```

Model B sketch:

```yaml
scene_name: hood_basic
workspace: hood
capabilities:
  - item_workspace
background: { asset: hood_workspace_bg }
rows:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_ethanol, object_name: ethanol_bottle }
      - { placement_name: rear_center_waste, object_name: waste_container }
  - row_name: work_surface
    slots:
      - { placement_name: center_hood_surface, object_name: hood_surface }
  - row_name: tools
    slots:
      - { placement_name: right_aspirating_pipette, object_name: aspirating_pipette }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | tools could fold into work_surface | tools could fold into work_surface |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (no structured objects) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 6. imaging_bench (content/base_scenes/imaging_bench.yaml)

Sketch order: B first, C second (even row).

Model A summary: 2 placements (`center_staining_tray`,
`rear_center_lightbox`); current_geometry_fields = 10; no inheritance
keys. No structured objects.

Model B sketch:

```yaml
scene_name: imaging_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_imaging
    slots:
      - { placement_name: rear_center_lightbox, object_name: lightbox }
  - row_name: work_surface
    slots:
      - { placement_name: center_staining_tray, object_name: staining_tray }
```

Model C sketch:

```yaml
scene_name: imaging_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_imaging
    slots:
      - { placement_name: rear_center_lightbox, object_name: lightbox }
  - region_name: work_surface
    slots:
      - { placement_name: center_staining_tray, object_name: staining_tray }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (no structured objects) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 7. microscope_basic (content/base_scenes/microscope_basic.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 1 placement (`main_microscope`);
current_geometry_fields = 10; no inheritance keys. Structured object:
`microscope` (per Section 6).

Model C sketch:

```yaml
scene_name: microscope_basic
workspace: microscope
capabilities:
  - item_workspace
background: { asset: microscope_view_bg }
regions:
  - region_name: instrument_face
    slots:
      - { placement_name: main_microscope, object_name: microscope }
```

Model B sketch:

```yaml
scene_name: microscope_basic
workspace: microscope
capabilities:
  - item_workspace
background: { asset: microscope_view_bg }
rows:
  - row_name: instrument_row
    slots:
      - { placement_name: main_microscope, object_name: microscope }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none (single placement, only one shape) | none |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (microscope one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 8. sample_prep_bench (content/base_scenes/sample_prep_bench.yaml)

Sketch order: B first, C second (even row).

Model A summary: 5 placements; current_geometry_fields = 10; no
inheritance keys. Structured object: `center_eppendorf_rack`
(microtube_rack_24 -- structured).

Model B sketch:

```yaml
scene_name: sample_prep_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_protein_sample, object_name: protein_sample_tube }
      - { placement_name: rear_center_laemmli, object_name: laemmli_4x_bottle }
      - { placement_name: rear_right_bme, object_name: bme_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_eppendorf_rack, object_name: microtube_rack_24 }
      - { placement_name: center_micropipette, object_name: micropipette }
```

Model C sketch:

```yaml
scene_name: sample_prep_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_protein_sample, object_name: protein_sample_tube }
      - { placement_name: rear_center_laemmli, object_name: laemmli_4x_bottle }
      - { placement_name: rear_right_bme, object_name: bme_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_eppendorf_rack, object_name: microtube_rack_24 }
      - { placement_name: center_micropipette, object_name: micropipette }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could split tools from work_surface | could split tools from work_surface |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (microtube_rack_24 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 9. staining_bench (content/base_scenes/staining_bench.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 10 placements (note: a vortex appears under
`rear_right_vortex` inherited from bench_basic at runtime but the file
itself has 10 own placements + the `wrong_order_message` template; the
Section 3 corpus count of 10 is what we sketch against);
current_geometry_fields = 10; no inheritance keys. No structured
objects.

Model C sketch:

```yaml
scene_name: staining_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
regions:
  - region_name: rear_stains
    slots:
      - { placement_name: rear_left_coomassie_stain, object_name: coomassie_stain_bottle }
      - { placement_name: rear_center_destain, object_name: destain_bottle }
      - { placement_name: rear_right_ddh2o, object_name: ddh2o_bottle }
  - region_name: rear_recycle
    slots:
      - { placement_name: rear_left_coomassie_recycle, object_name: coomassie_recycle_bottle }
      - { placement_name: rear_center_destain_waste, object_name: destain_waste_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_staining_tray, object_name: staining_tray }
      - { placement_name: center_kimwipe_pad, object_name: kimwipe_pad }
      - { placement_name: center_waste_container, object_name: waste_container }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_area_microwave, object_name: microwave }
      - { placement_name: right_tool_area_rocking_shaker, object_name: rocking_shaker }
```

Model B sketch:

```yaml
scene_name: staining_bench
workspace: bench
capabilities:
  - item_workspace
background: { asset: bench_workspace_bg }
rows:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_coomassie_stain, object_name: coomassie_stain_bottle }
      - { placement_name: rear_center_destain, object_name: destain_bottle }
      - { placement_name: rear_right_ddh2o, object_name: ddh2o_bottle }
      - { placement_name: rear_left_coomassie_recycle, object_name: coomassie_recycle_bottle }
      - { placement_name: rear_center_destain_waste, object_name: destain_waste_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_staining_tray, object_name: staining_tray }
      - { placement_name: center_kimwipe_pad, object_name: kimwipe_pad }
      - { placement_name: center_waste_container, object_name: waste_container }
  - row_name: tools
    slots:
      - { placement_name: right_tool_area_microwave, object_name: microwave }
      - { placement_name: right_tool_area_rocking_shaker, object_name: rocking_shaker }
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 4 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | rear_reagents could split into stains + recycle | rear_stains and rear_recycle could merge |
| needs_extra_author_hint | false | false |
| inheritance_handled | n/a | n/a |
| structured_boundary_respected | true (no structured objects) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | rear_reagents fan-out within Model B forces 5-slot row (engine ordering vs author intent) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 10. seeding_workspace (content/protocols/cell_culture/cell_seeding_plate_setup/scenes/seeding_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 8 placements via `add_placements`; extends
`hood_basic`; current_geometry_fields = 2 (per-placement `zone`,
`depth_tier`); inheritance keys: [add_placements]. Structured object:
`center_well_plate_96` (well_plate_96 -- structured).

Model B sketch:

```yaml
scene_name: seeding_workspace
extends: hood_basic
add_slots:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_center_media_bottle, object_name: media_bottle }
      - { placement_name: rear_right_incubator, object_name: incubator }
  - row_name: work_surface
    slots:
      - { placement_name: center_cell_suspension_tube, object_name: cell_suspension_tube }
      - { placement_name: center_conical_tube_for_dilution, object_name: conical_tube_for_dilution }
      - { placement_name: center_well_plate_96, object_name: well_plate_96 }
      - { placement_name: center_vortex, object_name: vortex }
  - row_name: tools
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
      - { placement_name: right_serological_pipette, object_name: serological_pipette }
```

Model C sketch:

```yaml
scene_name: seeding_workspace
extends: hood_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_center_media_bottle, object_name: media_bottle }
      - { placement_name: rear_right_incubator, object_name: incubator }
  - region_name: work_surface
    slots:
      - { placement_name: center_cell_suspension_tube, object_name: cell_suspension_tube }
      - { placement_name: center_conical_tube_for_dilution, object_name: conical_tube_for_dilution }
      - { placement_name: center_well_plate_96, object_name: well_plate_96 }
      - { placement_name: center_vortex, object_name: vortex }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
      - { placement_name: right_serological_pipette, object_name: serological_pipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | sketch shape of add_slots as rows[] vs flat list | same as B |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true (add_slots keyed as rows) | true (add_slots keyed as regions) |
| structured_boundary_respected | true (well_plate_96 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 11. drug_dilution_setup_bench_setup (content/protocols/cell_culture/drug_dilution_setup/scenes/bench_setup.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 8 placements via `add_placements`; extends
`bench_basic`; current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `center_dilution_tube_rack` (dilution_tube_rack_8
-- structured).

Model C sketch:

```yaml
scene_name: drug_dilution_setup_bench_setup
extends: bench_basic
add_slots:
  - region_name: rear_stocks
    slots:
      - { placement_name: rear_left_carboplatin_stock, object_name: carboplatin_stock_bottle }
      - { placement_name: rear_center_metformin_stock, object_name: metformin_stock_bottle }
      - { placement_name: rear_right_sterile_water, object_name: sterile_water_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_microtube_intermediate, object_name: microtube_15ml_intermediate }
      - { placement_name: center_metformin_working_tube, object_name: metformin_working_tube }
      - { placement_name: center_dilution_tube_rack, object_name: dilution_tube_rack_8 }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
      - { placement_name: right_tool_tip_box, object_name: micropipette_tip_box }
```

Model B sketch:

```yaml
scene_name: drug_dilution_setup_bench_setup
extends: bench_basic
add_slots:
  - row_name: rear_stocks
    slots:
      - { placement_name: rear_left_carboplatin_stock, object_name: carboplatin_stock_bottle }
      - { placement_name: rear_center_metformin_stock, object_name: metformin_stock_bottle }
      - { placement_name: rear_right_sterile_water, object_name: sterile_water_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_microtube_intermediate, object_name: microtube_15ml_intermediate }
      - { placement_name: center_metformin_working_tube, object_name: metformin_working_tube }
      - { placement_name: center_dilution_tube_rack, object_name: dilution_tube_rack_8 }
  - row_name: tools
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
      - { placement_name: right_tool_tip_box, object_name: micropipette_tip_box }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (dilution_tube_rack_8 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 12. dilution_workspace (content/protocols/cell_culture/drug_dilution_setup/scenes/dilution_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 9 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `dilution_rack` (dilution_tube_rack_8).

Model B sketch:

```yaml
scene_name: dilution_workspace
extends: bench_basic
add_slots:
  - row_name: rear_stocks
    slots:
      - { placement_name: carb_stock, object_name: carboplatin_stock_bottle }
      - { placement_name: met_stock, object_name: metformin_stock_bottle }
      - { placement_name: water_source, object_name: sterile_water_bottle }
      - { placement_name: carb_intermediate, object_name: microtube_15ml_intermediate }
      - { placement_name: media_source, object_name: media_bottle }
      - { placement_name: met_working_tube, object_name: metformin_working_tube }
  - row_name: work_surface
    slots:
      - { placement_name: dilution_rack, object_name: dilution_tube_rack_8 }
  - row_name: tools
    slots:
      - { placement_name: pipette_tool, object_name: micropipette }
      - { placement_name: labeling_tool, object_name: label_pen }
```

Model C sketch:

```yaml
scene_name: dilution_workspace
extends: bench_basic
add_slots:
  - region_name: rear_stock_shelf
    slots:
      - { placement_name: carb_stock, object_name: carboplatin_stock_bottle }
      - { placement_name: met_stock, object_name: metformin_stock_bottle }
      - { placement_name: water_source, object_name: sterile_water_bottle }
  - region_name: rear_intermediates
    slots:
      - { placement_name: carb_intermediate, object_name: microtube_15ml_intermediate }
      - { placement_name: media_source, object_name: media_bottle }
      - { placement_name: met_working_tube, object_name: metformin_working_tube }
  - region_name: work_surface
    slots:
      - { placement_name: dilution_rack, object_name: dilution_tube_rack_8 }
  - region_name: tool_shelf
    slots:
      - { placement_name: pipette_tool, object_name: micropipette }
      - { placement_name: labeling_tool, object_name: label_pen }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 4 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | rear_stocks could split into stocks + intermediates | combining stocks + intermediates is plausible |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 13. incubator_workspace (content/protocols/cell_culture/mtt_plate_reaction/scenes/incubator_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 6 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `treatment_plate_main` (well_plate_96 --
structured).

Model C sketch:

```yaml
scene_name: incubator_workspace
extends: bench_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: mtt_solution, object_name: mtt_solution_bottle }
      - { placement_name: drying_surface, object_name: paper_towel_pad }
      - { placement_name: hazard_waste_bin, object_name: biohazard_decant_bin }
  - region_name: work_surface
    slots:
      - { placement_name: main_incubator, object_name: incubator }
      - { placement_name: treatment_plate_main, object_name: well_plate_96 }
  - region_name: tool_shelf
    slots:
      - { placement_name: pipette_multichannel, object_name: multichannel_pipette }
```

Model B sketch:

```yaml
scene_name: incubator_workspace
extends: bench_basic
add_slots:
  - row_name: rear_supplies
    slots:
      - { placement_name: mtt_solution, object_name: mtt_solution_bottle }
      - { placement_name: drying_surface, object_name: paper_towel_pad }
      - { placement_name: hazard_waste_bin, object_name: biohazard_decant_bin }
  - row_name: work_surface
    slots:
      - { placement_name: main_incubator, object_name: incubator }
      - { placement_name: treatment_plate_main, object_name: well_plate_96 }
  - row_name: tools
    slots:
      - { placement_name: pipette_multichannel, object_name: multichannel_pipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (well_plate_96 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 14. mtt_reagent_prep_bench_workspace (content/protocols/cell_culture/mtt_reagent_prep/scenes/bench_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 5 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements]. No
structured objects in the override.

Model B sketch:

```yaml
scene_name: mtt_reagent_prep_bench_workspace
extends: bench_basic
add_slots:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_mtt_powder, object_name: mtt_powder_container }
      - { placement_name: rear_center_pbs_bottle, object_name: pbs_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_mtt_solution_tube, object_name: mtt_solution_tube }
  - row_name: tools
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
      - { placement_name: right_tool_tip_box, object_name: micropipette_tip_box }
```

Model C sketch:

```yaml
scene_name: mtt_reagent_prep_bench_workspace
extends: bench_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_mtt_powder, object_name: mtt_powder_container }
      - { placement_name: rear_center_pbs_bottle, object_name: pbs_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_mtt_solution_tube, object_name: mtt_solution_tube }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
      - { placement_name: right_tool_tip_box, object_name: micropipette_tip_box }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (no structured objects) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 15. mtt_solubilization_readout_bench_workspace (content/protocols/cell_culture/mtt_solubilization_readout/scenes/bench_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 3 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `center_treatment_plate` (well_plate_96).

Model C sketch:

```yaml
scene_name: mtt_solubilization_readout_bench_workspace
extends: bench_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_dmso, object_name: dmso_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_treatment_plate, object_name: well_plate_96 }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
```

Model B sketch:

```yaml
scene_name: mtt_solubilization_readout_bench_workspace
extends: bench_basic
add_slots:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_dmso, object_name: dmso_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_treatment_plate, object_name: well_plate_96 }
  - row_name: tools
    slots:
      - { placement_name: right_tool_micropipette, object_name: micropipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (well_plate_96 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 16. mtt_solubilization_readout_plate_reader_workspace (content/protocols/cell_culture/mtt_solubilization_readout/scenes/plate_reader_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 2 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured objects: `rear_center_treated_plate` (well_plate_96),
`center_plate_reader` (plate_reader).

Model B sketch:

```yaml
scene_name: mtt_solubilization_readout_plate_reader_workspace
extends: bench_basic
add_slots:
  - row_name: rear_supply
    slots:
      - { placement_name: rear_center_treated_plate, object_name: well_plate_96 }
  - row_name: instrument_face
    slots:
      - { placement_name: center_plate_reader, object_name: plate_reader }
```

Model C sketch:

```yaml
scene_name: mtt_solubilization_readout_plate_reader_workspace
extends: bench_basic
add_slots:
  - region_name: rear_staging
    slots:
      - { placement_name: rear_center_treated_plate, object_name: well_plate_96 }
  - region_name: instrument_face
    slots:
      - { placement_name: center_plate_reader, object_name: plate_reader }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could merge into single row | could merge into single region |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (well_plate_96 + plate_reader each one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 17. passage_hood_detachment_hood_workspace (content/protocols/cell_culture/passage_hood_detachment/scenes/hood_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 6 placements (4 `add_placements` +
2 `reposition_placements`); extends `hood_basic`;
current_geometry_fields = 2; inheritance: [add_placements,
reposition_placements]. No structured objects.

Model C sketch:

```yaml
scene_name: passage_hood_detachment_hood_workspace
extends: hood_basic
add_slots:
  - region_name: work_surface
    slots:
      - { placement_name: center_flask, object_name: t75_flask }
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_pbs, object_name: pbs_bottle }
      - { placement_name: rear_center_trypsin, object_name: trypsin_bottle }
      - { placement_name: rear_right_media, object_name: media_bottle }
reposition_placements:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_ethanol }
  - region_name: work_surface
    slots:
      - { placement_name: center_hood_surface }
```

Model B sketch:

```yaml
scene_name: passage_hood_detachment_hood_workspace
extends: hood_basic
add_slots:
  - row_name: work_surface
    slots:
      - { placement_name: center_flask, object_name: t75_flask }
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_pbs, object_name: pbs_bottle }
      - { placement_name: rear_center_trypsin, object_name: trypsin_bottle }
      - { placement_name: rear_right_media, object_name: media_bottle }
reposition_placements:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_ethanol }
  - row_name: work_surface
    slots:
      - { placement_name: center_hood_surface }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 add + 2 reposition | 2 add + 2 reposition |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | reposition shape (slots-with-no-object_name) is plausible | same as B |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true (add_slots and reposition_placements both expressed via row/region grouping; depth_tier not authored) | true (same) |
| structured_boundary_respected | true (no structured objects) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 18. passage_hood_detachment_microscope_view (content/protocols/cell_culture/passage_hood_detachment/scenes/microscope_view.yaml)

Sketch order: B first, C second (even row).

Model A summary: 1 placement; extends `microscope_basic`;
current_geometry_fields = 2; inheritance: [add_placements]. No
structured objects in the override (the microscope itself comes from
the base scene).

Model B sketch:

```yaml
scene_name: passage_hood_detachment_microscope_view
extends: microscope_basic
add_slots:
  - row_name: instrument_face
    slots:
      - { placement_name: instrument_t75_flask, object_name: t75_flask }
```

Model C sketch:

```yaml
scene_name: passage_hood_detachment_microscope_view
extends: microscope_basic
add_slots:
  - region_name: instrument_face
    slots:
      - { placement_name: instrument_t75_flask, object_name: t75_flask }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (no structured objects in override) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 19. centrifuge_workspace (content/protocols/cell_culture/passage_pellet_reseed/scenes/centrifuge_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 6 placements; extends `bench_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `rear_center_conical_rack` (conical_15ml_rack).

Model C sketch:

```yaml
scene_name: centrifuge_workspace
extends: bench_basic
add_slots:
  - region_name: rear_staging
    slots:
      - { placement_name: rear_center_conical_rack, object_name: conical_15ml_rack }
      - { placement_name: rear_left_conical_tube, object_name: conical_15ml }
  - region_name: work_surface
    slots:
      - { placement_name: center_centrifuge, object_name: centrifuge }
      - { placement_name: center_t75_flask, object_name: t75_flask }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_label_pen, object_name: label_pen }
      - { placement_name: right_aspirating_pipette, object_name: aspirating_pipette }
```

Model B sketch:

```yaml
scene_name: centrifuge_workspace
extends: bench_basic
add_slots:
  - row_name: rear_staging
    slots:
      - { placement_name: rear_center_conical_rack, object_name: conical_15ml_rack }
      - { placement_name: rear_left_conical_tube, object_name: conical_15ml }
  - row_name: work_surface
    slots:
      - { placement_name: center_centrifuge, object_name: centrifuge }
      - { placement_name: center_t75_flask, object_name: t75_flask }
  - row_name: tools
    slots:
      - { placement_name: right_label_pen, object_name: label_pen }
      - { placement_name: right_aspirating_pipette, object_name: aspirating_pipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (conical_15ml_rack one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 20. hood_workspace -- passage_pellet_reseed (content/protocols/cell_culture/passage_pellet_reseed/scenes/hood_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 6 placements; extends `hood_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured objects: `center_conical_rack` (conical_15ml_rack),
`center_fresh_plate` (well_plate_96).

Model B sketch:

```yaml
scene_name: hood_workspace
extends: hood_basic
add_slots:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_left_fresh_media, object_name: media_bottle }
      - { placement_name: rear_right_incubator, object_name: incubator }
  - row_name: work_surface
    slots:
      - { placement_name: center_t75_flask, object_name: t75_flask }
      - { placement_name: center_conical_rack, object_name: conical_15ml_rack }
      - { placement_name: center_fresh_plate, object_name: well_plate_96 }
  - row_name: tools
    slots:
      - { placement_name: right_label_pen, object_name: label_pen }
```

Model C sketch:

```yaml
scene_name: hood_workspace
extends: hood_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_left_fresh_media, object_name: media_bottle }
      - { placement_name: rear_right_incubator, object_name: incubator }
  - region_name: work_surface
    slots:
      - { placement_name: center_t75_flask, object_name: t75_flask }
      - { placement_name: center_conical_rack, object_name: conical_15ml_rack }
      - { placement_name: center_fresh_plate, object_name: well_plate_96 }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_label_pen, object_name: label_pen }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (conical_15ml_rack + well_plate_96 each one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 21. plate_workspace -- drug_addition (content/protocols/cell_culture/plate_drug_treatment_drug_addition/scenes/plate_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 4 placements; extends `hood_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured objects: `rear_center_carb_stocks` (dilution_tube_rack_8),
`center_well_plate` (well_plate_96).

Model C sketch:

```yaml
scene_name: plate_workspace
extends: hood_basic
add_slots:
  - region_name: rear_stocks
    slots:
      - { placement_name: rear_center_carb_stocks, object_name: dilution_tube_rack_8 }
      - { placement_name: rear_center_metformin_stock, object_name: metformin_working_tube }
  - region_name: work_surface
    slots:
      - { placement_name: center_well_plate, object_name: well_plate_96 }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
```

Model B sketch:

```yaml
scene_name: plate_workspace
extends: hood_basic
add_slots:
  - row_name: rear_stocks
    slots:
      - { placement_name: rear_center_carb_stocks, object_name: dilution_tube_rack_8 }
      - { placement_name: rear_center_metformin_stock, object_name: metformin_working_tube }
  - row_name: work_surface
    slots:
      - { placement_name: center_well_plate, object_name: well_plate_96 }
  - row_name: tools
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (well_plate_96 + dilution_tube_rack_8 each one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 22. plate_drug_treatment_media_adjustment_plate_workspace (content/protocols/cell_culture/plate_drug_treatment_media_adjustment/scenes/plate_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 3 placements; extends `hood_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `center_well_plate_96` (well_plate_96).

Model B sketch:

```yaml
scene_name: plate_drug_treatment_media_adjustment_plate_workspace
extends: hood_basic
add_slots:
  - row_name: rear_reagents
    slots:
      - { placement_name: rear_center_media, object_name: media_bottle }
  - row_name: work_surface
    slots:
      - { placement_name: center_well_plate_96, object_name: well_plate_96 }
  - row_name: tools
    slots:
      - { placement_name: right_tool_multichannel, object_name: multichannel_pipette }
```

Model C sketch:

```yaml
scene_name: plate_drug_treatment_media_adjustment_plate_workspace
extends: hood_basic
add_slots:
  - region_name: rear_reagents
    slots:
      - { placement_name: rear_center_media, object_name: media_bottle }
  - region_name: work_surface
    slots:
      - { placement_name: center_well_plate_96, object_name: well_plate_96 }
  - region_name: tool_shelf
    slots:
      - { placement_name: right_tool_multichannel, object_name: multichannel_pipette }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 3 | 3 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (well_plate_96 one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 23. cell_counter_workspace (content/protocols/cell_culture/trypan_blue_counting/scenes/cell_counter_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 3 placements; extends `cell_counter_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `right_hemocytometer_slide` (hemocytometer_slide).

Model C sketch:

```yaml
scene_name: cell_counter_workspace
extends: cell_counter_basic
add_slots:
  - region_name: accessory_shelf
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
      - { placement_name: right_hemocytometer_slide, object_name: hemocytometer_slide }
  - region_name: instrument_face
    slots:
      - { placement_name: instrument_lens_tissue, object_name: lens_tissue }
```

Model B sketch:

```yaml
scene_name: cell_counter_workspace
extends: cell_counter_basic
add_slots:
  - row_name: accessories
    slots:
      - { placement_name: right_micropipette, object_name: micropipette }
      - { placement_name: right_hemocytometer_slide, object_name: hemocytometer_slide }
  - row_name: instrument_row
    slots:
      - { placement_name: instrument_lens_tissue, object_name: lens_tissue }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 2 | 2 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could merge into one row | could merge into one region |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (hemocytometer_slide one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 24. hemocytometer_view (content/protocols/cell_culture/trypan_blue_counting/scenes/hemocytometer_view.yaml)

Sketch order: B first, C second (even row).

Model A summary: 2 placements; extends `microscope_basic`;
current_geometry_fields = 2; inheritance: [add_placements].
Structured object: `prepared_hemocytometer` (hemocytometer_slide).

Model B sketch:

```yaml
scene_name: hemocytometer_view
extends: microscope_basic
add_slots:
  - row_name: instrument_face
    slots:
      - { placement_name: prepared_hemocytometer, object_name: hemocytometer_slide }
      - { placement_name: staining_bottles, object_name: trypan_blue_bottle }
```

Model C sketch:

```yaml
scene_name: hemocytometer_view
extends: microscope_basic
add_slots:
  - region_name: instrument_face
    slots:
      - { placement_name: prepared_hemocytometer, object_name: hemocytometer_slide }
      - { placement_name: staining_bottles, object_name: trypan_blue_bottle }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | could split staining_bottles into a side row | same as B |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true (hemocytometer_slide one slot) | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 25. sdspage_attach_lid_and_leads_workspace (content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 0 placements at this scene layer; extends
`electrophoresis_bench`; current_geometry_fields = 0; inheritance:
[] (only `extends` and `scene_notes`). All placements come from the
base scene. The Section 3 corpus reports 0 own placements; the
sdspage walkthrough surfaces lid-attach and lead-attach interactions
that this scene YAML does not author at the scene layer (the protocol
runs those via runtime steps against the base scene's
electrophoresis_tank + power_supply). Per Section 2.5, this is
flagged `scene_content_known_issue` and `failure_mode =
scene_content_incomplete`.

Model C sketch:

```yaml
scene_name: sdspage_attach_lid_and_leads_workspace
extends: electrophoresis_bench
regions: []
```

Model B sketch:

```yaml
scene_name: sdspage_attach_lid_and_leads_workspace
extends: electrophoresis_bench
rows: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% (no placements to preserve) | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | empty sketch only valid shape |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true (no inheritance overrides authored) | true |
| structured_boundary_respected | true (no structured object slots authored here) | true |
| expressible | false | false |
| blocker | `extends` not in locked surface; no placements to sketch | same |
| gap_signal | empty sketch shape under locked surface limits | same |
| scene_content_known_issue | no scene-layer placements; lid/lead interaction targets not authored at scene layer | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 26. sdspage_destain_gel_rock_workspace (content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 0 own placements; extends `staining_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort sketches
are empty per Section 1.4 (sketch the currently authored placements).
Flagged `scene_content_incomplete`.

Model B sketch:

```yaml
scene_name: sdspage_destain_gel_rock_workspace
extends: staining_bench
rows: []
```

Model C sketch:

```yaml
scene_name: sdspage_destain_gel_rock_workspace
extends: staining_bench
regions: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true (no overrides authored) | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | no scene-layer placements authored for rocking destain workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 27. extraction_workspace (content/protocols/sdspage/sdspage_extract_gel_from_cassette/scenes/extraction_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 1 placement (`front_center_staining_tray`); extends
`electrophoresis_bench`; current_geometry_fields = 2; inheritance:
[add_placements]. No structured objects in the override.

Model C sketch:

```yaml
scene_name: extraction_workspace
extends: electrophoresis_bench
add_slots:
  - region_name: gel_staging
    slots:
      - { placement_name: front_center_staining_tray, object_name: staining_tray }
```

Model B sketch:

```yaml
scene_name: extraction_workspace
extends: electrophoresis_bench
add_slots:
  - row_name: gel_staging
    slots:
      - { placement_name: front_center_staining_tray, object_name: staining_tray }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 28. sdspage_fill_tank_buffer_workspace (content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 0 own placements; extends `electrophoresis_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort empty
sketches; flagged `scene_content_incomplete`.

Model B sketch:

```yaml
scene_name: sdspage_fill_tank_buffer_workspace
extends: electrophoresis_bench
rows: []
```

Model C sketch:

```yaml
scene_name: sdspage_fill_tank_buffer_workspace
extends: electrophoresis_bench
regions: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | scene-layer placements not authored for tank-fill workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 29. sdspage_heat_denature_samples_workspace (content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 0 own placements; extends `heat_block_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort empty
sketches; flagged `scene_content_incomplete`.

Model C sketch:

```yaml
scene_name: sdspage_heat_denature_samples_workspace
extends: heat_block_bench
regions: []
```

Model B sketch:

```yaml
scene_name: sdspage_heat_denature_samples_workspace
extends: heat_block_bench
rows: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | scene-layer placements not authored for denature workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 30. sdspage_load_sample_single_lane_workspace (content/protocols/sdspage/sdspage_load_sample_single_lane/scenes/sdspage_load_sample_single_lane_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 1 placement (`center_microtube`); extends
`electrophoresis_bench`; current_geometry_fields = 2; inheritance:
[add_placements]. No structured objects in the override.

Model B sketch:

```yaml
scene_name: sdspage_load_sample_single_lane_workspace
extends: electrophoresis_bench
add_slots:
  - row_name: work_surface
    slots:
      - { placement_name: center_microtube, object_name: microtube }
```

Model C sketch:

```yaml
scene_name: sdspage_load_sample_single_lane_workspace
extends: electrophoresis_bench
add_slots:
  - region_name: work_surface
    slots:
      - { placement_name: center_microtube, object_name: microtube }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none for the authored placement; the full lane-load workflow may need more scene-layer placements but only one is currently authored) | (same) |
| failure_mode | none | none |

### 31. sdspage_prepare_running_buffer_workspace (content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 0 own placements; extends `electrophoresis_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort empty
sketches; flagged `scene_content_incomplete`.

Model C sketch:

```yaml
scene_name: sdspage_prepare_running_buffer_workspace
extends: electrophoresis_bench
regions: []
```

Model B sketch:

```yaml
scene_name: sdspage_prepare_running_buffer_workspace
extends: electrophoresis_bench
rows: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | scene-layer placements not authored for buffer-prep workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 32. sdspage_prepare_sample_mix_single_lane_workspace (content/protocols/sdspage/sdspage_prepare_sample_mix_single_lane/scenes/sample_prep_bench_override.yaml)

Sketch order: B first, C second (even row).

Model A summary: 1 placement (`eppendorf_tube`); extends
`sample_prep_bench`; current_geometry_fields = 2; inheritance:
[add_placements]. No structured objects in the override.

Model B sketch:

```yaml
scene_name: sdspage_prepare_sample_mix_single_lane_workspace
extends: sample_prep_bench
add_slots:
  - row_name: work_surface
    slots:
      - { placement_name: eppendorf_tube, object_name: microtube }
```

Model C sketch:

```yaml
scene_name: sdspage_prepare_sample_mix_single_lane_workspace
extends: sample_prep_bench
add_slots:
  - region_name: work_surface
    slots:
      - { placement_name: eppendorf_tube, object_name: microtube }
```

Row amended 2026-05-17 under WP-EXP1-AMEND-1: override surface (`extends` + `add_slots`) is now allowed; prior `model_insufficiency` verdict was an instrument defect.

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 1 | 1 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | none | none |
| needs_extra_author_hint | false (override surface allowed by amendment) | false (override surface allowed by amendment) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | true | true |
| blocker | (empty) | (empty) |
| gap_signal | (none) | (none) |
| scene_content_known_issue | (none) | (none) |
| failure_mode | none | none |

### 33. sdspage_recycle_buffer_workspace (content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml)

Sketch order: C first, B second (odd row).

Model A summary: 0 own placements; extends `electrophoresis_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort empty
sketches; flagged `scene_content_incomplete`.

Model C sketch:

```yaml
scene_name: sdspage_recycle_buffer_workspace
extends: electrophoresis_bench
regions: []
```

Model B sketch:

```yaml
scene_name: sdspage_recycle_buffer_workspace
extends: electrophoresis_bench
rows: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | scene-layer placements not authored for recycle workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

### 34. sdspage_run_electrophoresis_workspace (content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml)

Sketch order: B first, C second (even row).

Model A summary: 0 own placements; extends `electrophoresis_bench`;
current_geometry_fields = 0; inheritance: []. Best-effort empty
sketches; flagged `scene_content_incomplete`.

Model B sketch:

```yaml
scene_name: sdspage_run_electrophoresis_workspace
extends: electrophoresis_bench
rows: []
```

Model C sketch:

```yaml
scene_name: sdspage_run_electrophoresis_workspace
extends: electrophoresis_bench
regions: []
```

| metric | B | C |
| --- | --- | --- |
| sketched_rows / sketched_regions | 0 | 0 |
| placement_preservation | 100% | 100% |
| geometry_leak_count | 0 | 0 |
| ambiguity | empty sketch only valid shape | same |
| needs_extra_author_hint | true (`extends`) | true (`extends`) |
| inheritance_handled | true | true |
| structured_boundary_respected | true | true |
| expressible | false | false |
| blocker | `extends` + no placements to sketch | same |
| gap_signal | empty sketch shape | same |
| scene_content_known_issue | scene-layer placements not authored for run-electrophoresis workflow | same |
| failure_mode | scene_content_incomplete | scene_content_incomplete |

## 5. Aggregate scoreboard

WP-EXP1-SCORE-1 aggregation across the 34-scene corpus of Section 4.
Counts are derived mechanically from the per-scene metric tables in
Section 4 under the metric definitions of Section 1.3 and the
Pre-registration amendment override-file authoring surface.

Conventions:

- "Eligible scenes" = scenes with `failure_mode == none`. The threshold
  in Section 1.4 evaluates expressibility against this denominator.
  Scenes with `failure_mode == scene_content_incomplete` are excluded
  from the H1 threshold but listed below.
- `expressible_percent` reports the model's expressible count divided by
  the eligible-scene count (27), expressed as percent.
- Corpus-wide totals for `placement_preservation`, `geometry_leak_count`,
  `needs_extra_author_hint`, `inheritance_handled`, and
  `structured_boundary_respected` count rows across the full corpus
  (34 scenes); the 7 incomplete scenes still satisfy the structural
  gates (100% placement preservation on the zero placements they author,
  zero geometry leakage, locked-surface compliance after the
  amendment), so the corpus totals and the eligible-scene totals only
  diverge on `expressible` itself.

| metric | Model B | Model C |
| --- | --- | --- |
| total scenes scored | 34 | 34 |
| eligible scenes (`failure_mode == none`) | 27 | 27 |
| expressible count | 27 | 27 |
| expressible percent (eligible) | 100% | 100% |
| `placement_preservation == 100%` (corpus) | 34 / 34 | 34 / 34 |
| `geometry_leak_count` sum (corpus, target 0) | 0 | 0 |
| `needs_extra_author_hint == false` (corpus) | 27 / 27 eligible (incomplete rows carry `extends`-only hint that no longer counts post-amendment, so corpus total is 34 / 34) | 27 / 27 eligible (corpus 34 / 34, same logic) |
| `inheritance_handled == true` or n/a (corpus) | 34 / 34 | 34 / 34 |
| `structured_boundary_respected == true` (corpus) | 34 / 34 | 34 / 34 |
| `ambiguity != none` rows (corpus) | 19 | 19 |
| `failure_mode == none` | 27 | 27 |
| `failure_mode == scene_content_incomplete` | 7 | 7 |
| `failure_mode == model_insufficiency` | 0 | 0 |
| `failure_mode == both` | 0 | 0 |

### 5.1 Scene-content-incomplete callout

Seven scenes carry `failure_mode = scene_content_incomplete` per
Section 2.5. They are excluded from the H1 threshold and from
`expressible_percent`, but listed here explicitly so the verdict
remains audit-traceable:

| # | scene file |
| --- | --- |
| 25 | content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml |
| 26 | content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml |
| 28 | content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml |
| 29 | content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml |
| 31 | content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml |
| 33 | content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml |
| 34 | content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml |

Each row authored zero scene-layer placements at its current YAML
revision, so a best-effort sketch under either Model B or Model C is
empty (`rows: []` or `regions: []`) and the scene cannot reach
`expressible = true` until the underlying scene content is authored.
These rows neither leak geometry nor break placement preservation;
they are blocked solely on missing content.

## 6. Structured object inventory

Built by scanning every `object_name` referenced by any scene in the
Section 3 corpus and resolving each name to its
`content/objects/**/<object>.yaml`. Total distinct objects referenced
by the corpus: 69. The table below lists ONLY the objects classified as
`structured`. All other referenced objects are `workspace` and are
implicitly eligible for a single row-or-region slot under both Model B
and Model C.

Classification rule used:

- An object is `structured` if (a) its object YAML carries a `structure`
  key (object explicitly owns sub-geometry), OR (b) it is a rack-kind
  object (own its tube/slot interior), OR (c) it carries an instrument
  display surface or scientific-field interior (microscope field,
  hemocytometer grid, plate-reader / cell-counter / heat-block /
  power-supply readout, gel lane surface) per the carve-out in
  `docs/specs/LAYOUT_ENGINE.md` and the plan's enumeration of
  `well_plate_*`, `tube_rack_*`, `gel_*`, `microscope_*`,
  `plate_reader_*`, and instrument-display surfaces.
- Per the plan's review-gated guidance, ambiguous cases are flagged as
  `workspace` with an inline note rather than silently promoted to
  `structured`.

| object_name | object YAML path | reason structured |
| --- | --- | --- |
| well_plate_96 | content/objects/plate/well_plate_96.yaml | YAML carries `structure` key; owns 96-well A1..H12 interior layout |
| gel_cassette | content/objects/equipment/gel_cassette.yaml | YAML carries `structure` key; owns gel lane interior |
| conical_15ml_rack | content/objects/rack/conical_15ml_rack.yaml | YAML carries `structure` key; rack owns conical tube slot interior |
| counter_slide_cartridge | content/objects/rack/counter_slide_cartridge.yaml | YAML carries `structure` key; cartridge owns counter chamber sub-cells |
| dilution_tube_rack_8 | content/objects/rack/dilution_tube_rack_8.yaml | YAML carries `structure` key; rack owns 8 tube slot interior |
| microtube_rack_24 | content/objects/rack/microtube_rack_24.yaml | rack-kind object; owns 24 microtube slot interior even though `structure` key is implicit at adapter level |
| microscope | content/objects/equipment/microscope.yaml | owns microscope field marks / quadrant view interior per plan's `microscope_*` enumeration |
| plate_reader | content/objects/equipment/plate_reader.yaml | owns plate-reader readout surface / channel display per plan's `plate_reader_*` enumeration |
| cell_counter | content/objects/equipment/cell_counter.yaml | instrument display readout (cell count); display surface is adapter-owned |
| hemocytometer_slide | content/objects/equipment/hemocytometer_slide.yaml | owns counting grid sub-cells (4 corner quadrants + center) interior |
| heat_block | content/objects/equipment/heat_block.yaml | instrument display readout (set_temperature); display surface is adapter-owned |
| power_supply | content/objects/equipment/power_supply.yaml | instrument display readout (set_voltage / set_current); display surface is adapter-owned |
| mini_protean_gel | content/objects/equipment/mini_protean_gel.yaml | gel-family object per plan's `gel_*` enumeration; owns lane interior |

Workspace-classified note (carried with uncertainty per the
conservative rule):

- `electrophoresis_tank` (content/objects/equipment/electrophoresis_tank.yaml)
  is treated as `workspace` because the tank acts as a frame whose
  electrically-loaded gel cassette is itself a separate structured
  placement. If the tank turns out to own internal buffer-level or
  lid-state geometry the sketcher must reach for at scene-author time,
  flip this to `structured` and record the change as a metric gap, not
  a silent reclassification.
- `incubator`, `centrifuge`, `microwave`, `vortex`, `rocking_shaker`,
  `staining_tray`, `electrode_module`, `gel_comb`, `gel_opening_tool`,
  `lightbox`, `hood_surface` are treated as `workspace`: they expose
  capabilities (open lid, run cycle, hold) but do not require the
  scene-author to enumerate internal sub-positions. Same flip-rule
  applies if a future sketch needs interior addressing.

Structured object count: 13.

## 7. Verdict

Applying the Section 1.4 acceptance threshold to the Section 5
aggregate scoreboard:

- Across the 27 eligible scenes (`failure_mode == none`), BOTH Model B
  and Model C satisfy every threshold predicate: `expressible == true`,
  `placement_preservation == 100%`, `geometry_leak_count == 0`,
  `needs_extra_author_hint == false` (under the amended override-file
  surface), `inheritance_handled == true` for every override file,
  and `structured_boundary_respected == true`.
- Zero scenes carry `failure_mode == model_insufficiency` or
  `failure_mode == both`. The `no_coordinate_free_model_supported`
  guard does not fire.
- Seven scenes carry `failure_mode == scene_content_incomplete`. Per
  Section 1.4, this triggers the `_pending_content` suffix on the
  verdict.

Verdict: `both_supported_pending_content`

### 7.1 Tie-break trail

Section 1.4 tie-break rule applies because both candidate models
satisfy the threshold across the eligible corpus. Applied in order:

1. **Smaller authoring surface (fewer required top-level keys).**
   Model B locked surface (Section 2.3):
   `scene_name`, `workspace`, `capabilities`, `background`, `rows`,
   plus the override-only keys
   `add_placements`, `remove_placements`, `deactivate_placements`,
   `reposition_placements` and the amendment-allowed `extends`,
   `add_slots`, `remove_slots`, `deactivate_slots`, `move_slots`.
   Model C locked surface (Section 2.3):
   `scene_name`, `workspace`, `capabilities`, `background`, `regions`,
   plus the identical override surface.
   Difference: one key (`rows` vs `regions`). Top-level cardinality
   identical. Result: **tie**.

2. **Fewer `ambiguity != none` rows.** From Section 5:
   Model B = 19, Model C = 19. Result: **tie**.

3. **Lower `vocabulary_extension_count` (distinct row_names or
   region_names introduced corpus-wide).** Counted from the
   Section 4 sketches:
   Model B distinct row_names = 14
   (`accessories`, `accessory_row`, `gel_staging`, `instrument_face`,
   `instrument_row`, `rear_bench`, `rear_imaging`, `rear_reagents`,
   `rear_staging`, `rear_stocks`, `rear_supplies`, `rear_supply`,
   `tools`, `work_surface`).
   Model C distinct region_names = 16
   (`accessory_shelf`, `gel_staging`, `instrument_face`,
   `rear_apparatus`, `rear_imaging`, `rear_intermediates`,
   `rear_reagents`, `rear_recycle`, `rear_shelf`,
   `rear_shelf_reagents`, `rear_staging`, `rear_stains`,
   `rear_stock_shelf`, `rear_stocks`, `tool_shelf`,
   `work_surface`).
   Result: Model B wins (14 < 16).

Tie-break-preferred model: **Model B (row+slot)**, selected on
criterion 3 (lower vocabulary extension count). The `_pending_content`
suffix means this preference is provisional; the final verdict and
tie-break must be re-run against the completed corpus before layout
rollout commits to a model.

## 8. Gap signals

Deduplicated from the `gap_signal` cells of every Section 4 metric
table. The dedup key is the lower-cased signal string; signals
recorded as `(none)` are excluded. The `same` shorthand in a Model C
column is treated as a repeat of the Model B signal for the same
scene, not as a distinct signal. Rank is by occurrence count
across the corpus (signal-instances, summing B and C columns).

| rank | count | signal | scenes (corpus #) |
| --- | --- | --- | --- |
| 1 | 14 | empty sketch shape under locked surface limits (Model B `rows: []` / Model C `regions: []`); blocked solely on missing scene content, not on model insufficiency | 25, 26, 28, 29, 31, 33, 34 (Model B and Model C columns each) |
| 2 | 1 | `rear_reagents` fan-out within Model B forces a 5-slot row, exposing engine row-ordering versus author intent (single-axis Model B can flatten a multi-shelf rear surface into one long row); Model C carries no equivalent signal because its semantic regions already separate the shelves | 9 (staining_bench, Model B only) |

### 8.1 Signal-class roll-up

Two distinct signal classes appear corpus-wide:

- **Scene content incompleteness (class A)**. Seven sdspage scenes
  authored zero scene-layer placements, so every coordinate-free
  sketch collapses to an empty body. This is the dominant signal by
  occurrence (14 of 15 signal-instances). It is not a model
  insufficiency; it is missing content. Both Model B and Model C are
  blocked on identical grounds, so the signal cannot discriminate the
  two models.
- **Single-axis row ordering pressure (class B)**. One base scene
  (`staining_bench`) exposes Model B's row mechanism to multi-shelf
  fan-out where region semantics would express the structure more
  cleanly. The signal is asymmetric: it counts against Model B and
  not against Model C. Frequency is 1, so it does not move the
  verdict, but it is the only post-content-completion structural
  signal that distinguishes the two models on the eligible corpus.

## 9. Recommendation

Section 9 carries one branch per verdict enum value from Section 1.4.
Only the branch matching the Section 7 verdict is filled. All other
branches are intentionally left empty per the pre-registered
"verdict-driven branch" requirement.

- `row_slot_supported`: (not applicable to this run)
- `region_slot_supported`: (not applicable to this run)
- `both_supported`: (not applicable to this run; the `_pending_content`
  suffix is set)
- `row_slot_supported_pending_content`: (not applicable to this run)
- `region_slot_supported_pending_content`: (not applicable to this run)
- `no_coordinate_free_model_supported`: (not applicable to this run;
  zero scenes failed `model_insufficiency` or `both`)

### 9.1 Branch: both_supported_pending_content

Both Model B (row+slot) and Model C (region+slot) clear the Section 1.4
threshold across the 27 eligible scenes with zero authored geometry,
100% placement-name preservation, no extra author hints under the
amended override surface, full inheritance handling for every override
file, and full structured-object boundary respect. Neither model is
disqualified. The verdict carries `_pending_content` because seven
scenes were excluded from the threshold for missing scene content, not
for model insufficiency.

#### 9.1.1 Scenes blocked on content (must be completed before re-run)

The following seven scenes carry `failure_mode = scene_content_incomplete`
and must author their scene-layer placements before the experiment can
be re-run to produce a content-complete verdict:

| # | scene file |
| --- | --- |
| 25 | content/protocols/sdspage/sdspage_attach_lid_and_leads/scenes/sdspage_attach_lid_and_leads_workspace.yaml |
| 26 | content/protocols/sdspage/sdspage_destain_gel_rock/scenes/sdspage_destain_gel_rock_workspace.yaml |
| 28 | content/protocols/sdspage/sdspage_fill_tank_buffer/scenes/sdspage_fill_tank_buffer_workspace.yaml |
| 29 | content/protocols/sdspage/sdspage_heat_denature_samples/scenes/sdspage_heat_denature_samples_workspace.yaml |
| 31 | content/protocols/sdspage/sdspage_prepare_running_buffer/scenes/sdspage_prepare_running_buffer_workspace.yaml |
| 33 | content/protocols/sdspage/sdspage_recycle_buffer/scenes/sdspage_recycle_buffer_workspace.yaml |
| 34 | content/protocols/sdspage/sdspage_run_electrophoresis/scenes/sdspage_run_electrophoresis_workspace.yaml |

#### 9.1.2 Narrow content-completion plan reference

A narrow per-scene content-completion plan must precede any re-run.
The next-step guidance from
[../archive/well_plate_workspace_pause_note.md](../archive/well_plate_workspace_pause_note.md)
is the template: each incomplete scene completes against a stable
render contract, a stable dispatch contract, and a stable visual
contract; each scene carries a per-scene layout invariant doc; each
scene gates on a screenshot check before being marked content-complete.
The seven sdspage scenes above adopt that template one at a time so
content authoring does not race ahead of the model lock.

#### 9.1.3 Tie-break-preferred model for the content-completion plan

Per Section 7.1, the tie-break-preferred model is **Model B (row+slot)**,
selected on the vocabulary-extension-count criterion (B = 14 distinct
row_names corpus-wide; C = 16 distinct region_names corpus-wide; ties
on smaller authoring surface and on `ambiguity != none` count). The
content-completion plan SHOULD use Model B for any sketching it needs
to do during scene-content authoring, so that the eventual re-run
inherits a consistent surface. This preference is provisional; the
final tie-break (or absence of one, if only one model expresses the
content-complete corpus) is decided by the re-run.

#### 9.1.4 Re-run requirement before layout rollout

This verdict is intentionally NOT promotable to a layout-engine
implementation plan. Layout rollout requires a content-complete verdict
of `row_slot_supported`, `region_slot_supported`, `both_supported`, or
the failure verdict `no_coordinate_free_model_supported`. Once the
seven scenes above are authored, this experiment must be re-run end-to-
end (re-sketch, re-aggregate, re-verdict) against the now-complete
corpus to produce that final verdict.

## 10. Experiment roadmap

This roadmap is not pre-registered. It records the follow-on experiments
in order so Experiment 1 is not mistaken for the whole solution. Each
future experiment opens its own plan with its own pre-registration. No
experiment in the roadmap may proceed while a prior experiment's verdict
is unresolved.

- **Experiment 2: dispatch contract** -- paper comparison of the current
  implicit dispatch surface against one or more candidate explicit
  dispatch contracts; runs only after Experiment 1 closes.
- **Experiment 3: visual / render contract** -- paper comparison of
  active vs dim vs future, cursor, pointer-events, and pulse handling
  against one canonical render primitive versus current scene-specific
  affordances.
- **Experiment 4: capability schema** -- paper comparison of whether
  scenes / objects need a capability surface, which tokens are closed,
  and what falls through to adapter-internal logic.
- **Experiment 5: scene interaction invariant / gallery contract** --
  paper comparison of per-scene visual invariants (overlap, occupancy,
  label collision) framed as contract checks rather than protocol-
  content-driven checks.

Disclaimer: these experiments are roadmap entries only and are NOT
pre-registered by this document. Each opens its own plan with its own
pre-registration before any sketching begins.
