# Layout pipeline · design decisions

Companion to `LAYOUT_PIPELINE.md` (the runtime spec). This doc captures
**why** the spec says what it says — every Q&A from the spec-out phase,
locked unless explicitly revisited.

Status: locked. Changes require an entry under "Revision log" at the
end of this file.

## 0. Index

Each decision has a stable ID. The spec sections that reference these
decisions cite them by ID (e.g. "see DEC-A1 in DECISIONS").

| ID | Topic | Status |
|---|---|---|
| **Block A — foundational** (initial 13) | |
| A1 | cm scaling model — where it enters the pipeline | locked |
| A2 | Aspect-adjust formula | locked |
| A3 | Overflow handling — diagnostic vs throw vs clamp | locked |
| A4 | extends chain — single-level only | locked |
| A5 | Subpart layout — object-internal, never pipeline | locked |
| A6 | Materials — object-internal via visual_states | locked |
| A7 | depth_tier vs depth — two parallel concepts | locked |
| A8 | Cross-zone collision — author responsibility | locked |
| A9 | Tab-stops bucket collision — runtime diagnostic | locked |
| A10 | Anchor set — `bottom`, `tip` authored; `top` fallback | locked |
| A11 | Label wrap — split at center-nearest space, cap 2 lines | locked |
| A12 | wrong_order_message — scene-side by design | locked |
| A13 | Error reporting style — diagnostics array + validator throw | locked |
| **Block B — spec consistency** (porter round 2) | |
| B1 | §7 fixture math — corrected values | fixed |
| B2 | DEFAULT_LAYOUT_RULES — single canonical set | locked |
| B3 | normalizeSchema invariant — defaults on both branches | locked |
| B4 | tab_stop_overflow diagnostic — implemented, not future | locked |
| B5 | Error-marked items filtered at Stage 6 | locked |
| B6 | final[] order is sort order, NOT z-stacking order | locked |
| B7 | wrong_order_message — passes through pipeline | locked |
| B8 | Runtime deactivation — pipeline re-runs only on placement set change | locked |
| **Block C — edges from CSS trial experience** (porter round 3) | |
| C1 | Off-page items in final[] — emit + diagnose, render visible | locked |
| C2 | Tall single object exceeds zone — fix YAML upstream, no auto-fit | locked |
| C3 | Material overlays render inside the asset's design bbox | locked |
| C4 | Multi-instance placement — no de-dup by object_name | locked |
| C5 | Empty scenes — legitimate, no warning | locked |
| **Block E — multi-pass convergence** (porter round 4) | |
| E1 | Stages 6–10 wrapped in a convergence loop with uniform shrink | locked |
| **Block D — why the pipeline** | |
| D1 | Six CSS-grid failure modes the pipeline avoids by construction | informational |

---

## A. Foundational decisions

### A1. cm scaling model — where it enters the pipeline

**Question.** SCALING_MODEL.md defines `display_width_cm` per object,
`px_per_cm` per scene, and `width_scale = (display_width_cm × px_per_cm)
÷ (default_width × 11.52)`. Earlier pipeline drafts treated `width_scale`
as a free input multiplier. Where does cm actually enter?

**Decision.** **Upstream into the engine, as its own dedicated stage**
(Stage 5 · Scale). Authors write `display_width_cm` on the object; per-
workspace `px_per_cm` lives in a constants module (`WORKSPACE_PX_PER_CM`),
not YAML. Stage 5 produces `_width_scale` for every placement using
the canonical formula plus optional `fudge`.

**Fallback chain.**
1. `cm_model` — both `display_width_cm` and `px_per_cm` present.
2. `fallback_no_workspace` — cm present, workspace has no constant.
   Use authored `layout.width_scale`. Emit `unknown_workspace` warn.
3. `fallback_authored` — cm absent. Use authored `layout.width_scale`.
   Legacy escape hatch; no diagnostic.
4. `skipped_error` — placement carries `_error` from Stage 4.

**Rationale.** Separating Scale from Bind makes the two decisions
legible: Bind resolves *identity* (kind/label/asset), Scale resolves
*size in this scene*. The per-workspace dial is the only knob for
"this scene feels dense / spacious" at constant viewport.

### A2. Aspect-adjust formula

**Question.** Stage 8 was using `aspectAdjust = (viewport.w/viewport.h)
× (1080/1920)`. At non-16:9 viewports this changed heights non-trivially.
Intentional or bug?

**Decision.** **Bug.** Correct formula:

```
heightPct = visualWidth × (viewport.w / viewport.h) / aspect
```

No magic 16:9 constant. A square asset (`aspect = 1`) renders square in
pixels at *every* viewport aspect. Heights varying with viewport aspect
in scene-percent is correct, not a defect — scene-percent is per-axis.

**Invariant.** `visualWidth_px ÷ visualHeight_px === aspect` at any
viewport. Verifiable by porter: assert `visualWidth × viewport.w ===
visualHeight × viewport.h × aspect` (within FP tolerance).

### A3. Overflow handling — diagnostic vs throw vs clamp

**Question.** When zone overflow exceeds `MIN_SCALE`, should the pipeline
throw, continue with negative gaps, or rely on scene_bounds clamp?

**Decision.** **Emit diagnostic, continue with negative gaps.** The
`scene_bounds` clamp (Stage 10) solves a different problem (zone group
escapes canvas). Overloaded zones get
`zone_overflow_negative_gap` (warn) diagnostic; runtime renders the
overlap visibly; validator can promote the warn to a build error in
strict mode.

**Why not throw at runtime.** The runtime doesn't know which scenes are
authored vs which are derived from runtime state mutation (LayoutMove).
A throw here is a debugger trap, not a contract.

**Why visible overlap not silent clamp.** Visible overlap is the
designed signal that authoring is wrong. PRIMARY_DESIGN's hard-fail
rule (>5% aspect distortion = hard fail) targets silent crops, not
visible overlaps. The layout engine preserves aspect by construction;
overflow is always positional, never aspect-distorting.

### A4. extends chain — single-level only

**Question.** Does the pipeline recurse through multi-level inheritance
(A→B→C), or is single-level the final design?

**Decision.** **Single-level final.** SCENE_INHERITANCE.md is explicit:
"strictly one level... cycles, multi-level chains, and unknown bases are
build errors." The validator enforces this statically; `resolveInheritance`
does not recurse. Porter does not need recursion logic.

### A5. Subpart layout — object-internal, never pipeline

**Question.** Does the pipeline lay out wells inside a 96-well plate,
lanes inside a gel, tubes inside a rack?

**Decision.** **No.** Structured objects (`well_plate_96`, `dilution_tube_rack_8`,
gels) emit their own internal subpart geometry inside their render
functions. Pipeline lays out the top-level container only. This is
PRIMARY_CONTRACT item 3.

**Boundary check.** If you find yourself adding "subpart layout" code to
`layout_engine.ts`, stop. The object owns its internal geometry. The
pipeline emits an absolutely-positioned `<div data-item-id="treatment_plate">`;
the object's render fills in the 96 well circles.

### A6. Materials — object-internal via visual_states

**Question.** How are liquid levels, gel contents, mixture colors
rendered? Pipeline composites? Or object-internal?

**Decision.** **Object-internal.** Per MATERIAL_CONVENTION.md: "single
base SVG + runtime overlay." Each container's `visual_states.material_volume`
declares a `fill_height(state(material_volume), capacity_ml=N)` formula;
the renderer composites the overlay via namespaced `anchor_liquid_clip`
and `anchor_liquid_bounds` SVG ids. **The pipeline knows nothing about
material identity.** A pipette and a flask are positioned identically
regardless of what they contain.

### A7. depth_tier vs depth — two parallel concepts

**Question.** Pipeline reads both `depth_tier` (int) and `depth` (back/mid/
front enum). Two concepts, or one with a derivation rule?

**Decision.** **Two parallel concepts, no derivation rule.**
- `depth_tier` (int) — author sort key within a zone. Used by Stage 6
  (Group + sort). Never affects scale or baseline.
- `depth` (back/mid/front) — runtime visual emphasis. Normally set by
  `resolveSceneItemsWithDepth()` based on the active protocol target.
  May be authored on a placement to force.

The two are independent. `depth_tier` does NOT imply `depth`.

**Runtime depth promotion happens BEFORE `runPipeline()`.** When the
pipeline sees the placement list, `depth` is already set. The pipeline
does not call `resolveSceneItemsWithDepth`.

### A8. Cross-zone collision

**Question.** Two zones with overlapping bounds, or items in adjacent
zones colliding after Stage 10 clamp. Pipeline check?

**Decision.** **Author responsibility now; build-time validator check
planned.** The runtime pipeline does not compare cross-zone items. The
validator should reject scenes where two zones' `bounds` rects overlap.
This is a build-time check, not a runtime one.

### A9. Tab-stops bucket collision

**Question.** Within a single tab-stops zone, the left/center/right
buckets layout independently. They can collide.

**Decision.** **Runtime diagnostic `tab_stop_overflow`** emitted from
Stage 7. After all three buckets place, check
`(left.footprint_total + center.footprint_total + right.footprint_total
+ 2 × zone_gap) > zone_width`. If so, emit warn with overflow magnitude.

Build-time validator can promote this to error if desired.

### A10. Anchor set

**Question.** What are the valid `anchor_y` values?

**Decision.** Closed authored set: **`bottom`, `tip`**.
- `bottom` — most containers (flasks, bottles, racks, plates).
- `tip` — pipettes; uses `anchor_y_offset`.

`top` is an engine fallback for unknown anchors (centers around baseline);
**not surfaced in the YAML schema**. No `center` value.

### A11. Label wrap

**Question.** Pipeline emitted single-line labels. LAYOUT_ENGINE.md says
it should wrap.

**Decision.** **Split at the space nearest the middle if estimated label
width exceeds budget. Cap at 2 lines.** Implementation: estimate with
`AVG_CHAR_WIDTH_PCT = 0.6` × label length; if > `label_width × 1.1`,
find space index nearest `label.length / 2` and split. No space → no
wrap.

**Known gap (Block C extension).** Multi-line label width should
recompute footprint from the wrapped widest line. Currently does not;
future work.

### A12. wrong_order_message — scene-side

**Question.** Is `wrong_order_message` in scene YAML a real scene-level
concept or a leak from protocol?

**Decision.** **Real scene-level concept.** SCENE_VOCABULARY.md:
"property of how this scene gives feedback, not of any one object's
identity or state."

Split:
- Protocol: which interaction is "current"; what counts as wrong-order;
  the `{expected_label}` substitution value.
- Scene: the template string + toast duration. Per-scene UX pacing.
- Layout pipeline: nothing. Field passes through. (See B7 + Section §9
  in the spec.)

### A13. Error reporting style

**Question.** Unknown `object_name` — throw, return diagnostics, or per-
item `_error` field?

**Decision.** **Layered.**
- **Validator (build time)** — throws on unknown `object_name`,
  unknown `row_name`, missing base scene, locked-field mutation,
  multi-level extends, cycle.
- **Runtime pipeline** — accumulates diagnostics into a single array.
  No `_error` field in production code (demo only).
- **Render layer** — surfaces diagnostics to whatever UI is present
  (dev overlay, console, telemetry).

The validator is the *primary* error surface. The runtime diagnostics
exist for layout-time problems the YAML couldn't predict (overflow,
label collision, clamp delta).

---

## B. Spec-consistency decisions

### B1. §7 fixture math — corrected

**Bug.** Original §7 table had hand-computed errors in `_height` and `_x`
columns.

**Fix.** Recomputed values now in spec:

| placement | _width_scale | _visualWidth | _height | _top | _x |
|---|---|---|---|---|---|
| `rear_left_eppendorf_rack`  | 0.256 | 3.33 | 3.82 | 28.18 | 10.66 |
| `rear_right_protein_ladder` | 0.208 | 0.83 | 3.22 | 28.78 | 92.46 |
| `center_heat_block`         | 0.386 | 6.95 | 9.15 | 62.85 | 50.00 |

Tab-stops `_x` uses footprint-cap math (`max(visualWidth, min(label_width,
visualWidth × MAX_FOOTPRINT_RATIO))`), which is non-obvious. Microtube
footprint = 8.33 (label-driven, not visual-driven); flush-left from
padded edge 6.5 → `_x = 6.5 + 8.33/2 = 10.66`.

### B2. DEFAULT_LAYOUT_RULES — single canonical set

**Bug.** Three diverging default sets across §1, §2, and pipeline.jsx's
`layoutLabels` fallback.

**Fix.** Canonical set, applied everywhere:

```typescript
const DEFAULT_LAYOUT_RULES = {
  label_font_size: 9,
  label_line_height: 1.1,
  label_offset_y: 4,
  zone_gap: 2,
};
```

Matches every shipped base scene YAML. Single source of truth.

### B3. normalizeSchema invariant

**Bug.** Schema A passthrough didn't apply `DEFAULT_LAYOUT_RULES`; Schema B
did. Spec invariant ("scene_bounds and layout_rules always populated
post-normalize") lied for Schema A.

**Fix.** **Apply defaults uniformly.** Both Schema A and Schema B emerge
from `normalizeSchema` with `scene_bounds` (Schema A authors required to
write it; Schema B falls back to `DEFAULT_SCENE_BOUNDS`) and
`layout_rules` (`DEFAULT_LAYOUT_RULES` merged under authored values).

### B4. tab_stop_overflow

**Bug.** Diagnostic kind declared in the enum; no stage emitted it.

**Fix.** Implemented in Stage 7's tab-stops branch (see A9). After all
three buckets place, check overflow; emit if violated.

### B5. Error-marked items filtered at Stage 6

**Bug.** `_error`-flagged items from Stage 4 flowed through Stages 6–10.

**Fix.** **Filter at Stage 6 (`groupByZone`).** Items with `_error` are
dropped from groups. Diagnostic was already emitted at Stage 4
(`unknown_object`). Downstream stages must not see `_error` items — no
defensive branches needed.

### B6. final[] order is sort order, not z-stacking order

**Clarification.** `final[]` is in *layout sort order*: `(depth_tier asc,
placement_name asc)`. The render layer applies `z-index` **independently**
from `depth` (`back: 1, mid: 2, front: 3`). The two are unrelated.

**Renderer contract.** Iterate `final[]` in array order; per-item, set
`style.zIndex = DEPTH_Z_INDEX[item.depth ?? 'mid']`. The renderer never
touches `depth_tier`.

### B7. wrong_order_message — passes through pipeline

**Clarification.** Scene YAML carries `wrong_order_message: { template,
toast_duration_ms }`. The layout pipeline ignores this field entirely.
It propagates through `normalizeSchema` unchanged (Schema B authors can
declare it at the scene root; same shape as Schema A). Runtime toast
layer reads it.

### B8. Runtime deactivation — pipeline re-runs only on placement set change

**Question.** Mid-protocol used-up reagents, instruments moved out —
how is `active: false` set at runtime? Does the pipeline re-run?

**Decision.** **Pipeline re-runs only when the placement set changes.**
Two distinct paths:

| Runtime event | Mechanism | Pipeline re-runs? |
|---|---|---|
| Material identity / volume changes | Object's `visual_states` re-renders via `ObjectStateChange`. | **No.** |
| Set-point changes (pipette volume, heat block temp) | Same as above. | **No.** |
| Pipette picked up | `CursorAttach` scene_op. Placement removed temporarily. | **Yes.** |
| Equipment moved to another scene | `LayoutMove` scene_op. Placement list mutates. | **Yes**, source + destination. |
| Active scene switches | `SceneChange` scene_op. | **Yes**, on the new scene. |
| Authored-time deactivation | `deactivate_placements` in extends. | Resolved at Stage 3. |

**Caching strategy this implies:**
- Cache key: `(scene_id, hash(resolved_placement_list, scene_options))`
- Invalidate on: `CursorAttach`, `LayoutMove`, `SceneChange`,
  `deactivate_placements` toggle.
- Do **not** invalidate on: any `ObjectStateChange` (material, volume,
  set-point, held-material).

Hot path during a protocol step is the object renderer reading state.
Pipeline runs once per scene load + once per cursor/move op.

---

## C. Edge clarifications from M1 trial experience

The porter ran 7 CSS-grid trials before requesting the pipeline port.
The trials surfaced 5 edges the spec didn't fully pin down.

### C1. Off-page items in final[]

**Question.** Stage 10's clamp shifts zone groups inside `scene_bounds`,
but items inside a zone whose `bounds.bottom` exceeds `scene_bounds.bottom`
still escape vertically. Should the renderer suppress them? Hide?

**Decision.** **Render visible; pipeline diagnoses; never crop.**

1. Pipeline emits `final[]` regardless of overflow.
2. Stage 8 emits `item_escapes_zone_vertically` (warn) if an item's
   `_top` or `_top + _height` falls outside zone bounds by > 3%.
3. Stage 10 emits `zone_clamped_to_bounds` if the group was translated.
4. **Renderer responsibility:** apply NO `overflow: hidden` on the
   scene container or per-item wrapper. Overflow is visible.
5. **Validator responsibility (strict mode):** treat
   `item_escapes_zone_vertically` as a build error before runtime.

**Rationale.** Silent crop violates PRIMARY_DESIGN. Visible overflow is
the diagnostic signal that the scene needs upstream fixing — either
zone bounds enlarged, or `display_width_cm` reduced. The renderer must
not hide what the pipeline reveals.

### C2. Tall single object exceeds zone vertically

**Question.** A 35-cm microscope at `px_per_cm = 8` is ~280 px tall.
In a 150-px-tall zone, it doesn't fit. Auto-fit? Force author?

**Decision.** **Force author to fix YAML. No auto-fit.**

| Option | Verdict |
|---|---|
| Auto-shrink vertically (asymmetric scale) | **Rejected.** Violates PRIMARY_DESIGN's >5% aspect distortion rule. |
| Auto-shrink uniformly (vertical AND horizontal) | **Rejected for v1.** Possible future opt-in (`fit_strategy: shrink_uniform` on object). |
| Force author to enlarge zone bounds or reduce `display_width_cm` | **Accepted.** Emit `item_escapes_zone_vertically`; strict validator treats as build error. |

**Practical guidance for authors:**
- Microscope-class objects belong in a zone whose `bounds.bottom -
  bounds.top` is ≥ 50% of viewport height.
- If a single instrument dominates a scene, use `align: center` and
  let the zone fill the working surface.
- The `microscope_basic.yaml` and `cell_counter_basic.yaml` row-library
  entries are sized for this; `bench` workspace zones are NOT, by
  design.

### C3. Material overlays render inside the asset's design bbox

**Question.** A half-empty flask renders smaller-looking than a full
flask. Does `_visualWidth` / `_height` track that?

**Decision.** **No. `_visualWidth` and `_height` come from the asset's
DESIGN bbox (SVG viewBox aspect), invariant per asset.** Material
overlays render *inside* that bbox, never outside.

A half-empty flask renders:
- Flask SVG at full design bbox (computed by Stage 8).
- Liquid overlay fills 50% of `anchor_liquid_bounds` rect — visually
  smaller, but no impact on layout.

The pipeline's `aspect` is `asset.aspect`, a constant per asset, never
varies with state. The runtime object renderer composites the overlay
inside the bbox; the layout engine never sees state.

### C4. Multi-instance placement

**Question.** Two p200 pipettes (`front_left_p200`, `front_right_p200`)
both reference `object_name: p200_micropipette`. De-dup?

**Decision.** **No de-dup. Two placements with different `placement_name`
referencing the same `object_name` are independent layout entities.**
The pipeline never compares by `object_name`.

Each placement gets:
- Its own `_x`, `_y`, `_top`, `_height`, etc.
- Its own state (if the object carries state — pipette held material,
  for instance, tracks separately per placement).
- Its own `data-item-id="<placement_name>"` for click dispatch.

The runtime tracks state by `placement_name`, not `object_name`. Two
p200s, two independent held-material states.

### C5. Empty scenes — legitimate

**Question.** A welcome screen or transition scene has zero placements.
Pipeline emits empty `final[]`. Warn?

**Decision.** **No warning. Empty scenes are legitimate.** The pipeline
emits an empty render result; the renderer paints the background +
`scene_bounds` only. Valid use cases:
- Welcome / loading screens.
- Camera/zoom transition stages between scenes.
- Diagnostic stages where the user views just the scene chrome.

The validator should not require placements. A scene with no zones AND
no placements AND no background is suspicious — flag in lint mode only.

---

## E. Multi-pass convergence

### E1. Stages 6–10 wrapped in a convergence loop with uniform shrink

**Observation.** A single pass through the placement stages cannot
recover from authoring that produces overflowing zones. The pipeline
either fails the layout (overflow visible, contract intact) or
falsely accepts a broken layout. Neither outcome serves the runtime.

**Decision.** **Wrap Stages 6–10 in a convergence loop, up to
`MAX_LAYOUT_PASSES = 3` iterations. After each pass, items in zones
that emitted fittable diagnostics get their `_width_scale` multiplied
by `LAYOUT_SHRINK_FACTOR = 0.9` (uniform — aspect preserved). Iterate
until convergence or budget exhausted.**

**Fittable diagnostic kinds** (trigger a shrink for the next pass):
- `zone_overflow_negative_gap`
- `tab_stop_overflow`
- `item_escapes_zone_vertically`

**Non-fittable** (do not trigger shrink):
- `unknown_object`, `unknown_zone`, `unknown_row`, `unknown_workspace`
  — authoring problems; no amount of shrinking fixes them.
- `label_collision_residual` — Stage 9's internal 3-pass nudge already
  handles labels; further shrink would distort visual content for a
  label problem.
- `zone_clamped_to_bounds` — clamping is the renderer's safety net;
  not a fit problem.

**Why uniform shrink, not asymmetric.** PRIMARY_DESIGN's aspect-
preservation rule. Asymmetric scale (vertical-only or horizontal-only)
violates the hard rule. Uniform `_width_scale` multiplication scales
both axes proportionally; aspect is invariant by construction.

**Why per-zone, not global.** A scene with one crowded zone and three
clean zones should only shrink items in the crowded zone. Shrinking
everything would degrade legible layouts to fix one broken zone.

**Why 3 passes.** Empirical sweet spot. Pass 1 catches most overflows;
pass 2 handles cascading shrinks (one zone shrinks → its items'
footprints get smaller → label collision nudge can resolve labels
that previously couldn't). Pass 3 is the safety net. Beyond 3 the
improvements are negligible and the diagnostic value of
`max_iterations_reached` is higher than further attempts at recovery.

**Why deterministic, not adaptive.** `LAYOUT_SHRINK_FACTOR = 0.9` is
a fixed constant. The same scene + viewport always produces the same
result. Required for testing, caching, walker reproducibility.

**Diagnostic.** `max_iterations_reached` (warn) emitted only if the
loop exhausts its budget with fittable diagnostics still present.
Strict validator promotes this to a build error.

**Per-pass debug record.** `result.passes: Array<{ pass, diagnostics,
zones_shrunk }>`. Lets the porter / debugger see exactly how many
attempts the layout needed and which zones got shrunk. A clean layout
has `passes.length === 1` with `zones_shrunk: []`.

**Implications for caching (updates B8).** Cache key now includes the
number of passes used and the post-loop `_width_scale` values. In
practice this means the cache key is `hash(stages.scaled)` (post-loop),
not `hash(scaled_naive)`. Two scenes that converge to the same final
positions hit the same cache entry even if their naive `_width_scale`
values differed.

**Updates A3 (Overflow handling).** Overflow is no longer a single
"emit diagnostic and continue" event. The first overflow triggers a
shrink-and-retry. Only `max_iterations_reached` indicates final
failure to fit. Visible overflow at render time means the loop ran
out of budget — the YAML genuinely cannot fit.

**Updates C2 (Tall single object).** A 35-cm microscope in a 150-px
zone now goes through up to 3 shrink passes before giving up. If
shrinking to `0.9^3 ≈ 0.729` of the cm-derived size fits the zone,
the runtime accepts it (and the validator can still flag a warning
that the cm value is large for the zone). If it still doesn't fit,
`max_iterations_reached` fires and the YAML needs an upstream fix.

This is the first runtime adjustment of authored content the pipeline
permits. The fallback is aspect-preserving and bounded; the validator
remains the primary correctness gate.

---

## D. Why the pipeline (M1 trial postmortem)

The porter ran 7 CSS-grid trials over ~3 hours trying to fix
10/10 scenes failing precheck at 1920×1080. The trials are evidence
for *why* a cm-driven aspect-preserving pipeline is needed. The
short version:

### D1. Six CSS-grid failure modes the pipeline avoids by construction

| Mode | CSS-grid failure | Pipeline answer |
|---|---|---|
| **Fixed-px grid rows** | `grid-template-rows: 100px 1fr 100px 150px 0px` pre-allocates row heights. Three sources of truth (CSS row, `region-min-height`, asset natural size) all claim "150px"; tall objects (536-px microscope) bleed. | Zones declared in YAML. Single source of truth. Height not pre-allocated — derived from `cm × px_per_cm × aspect`. |
| **popup_layer grid-area bug** | `.region--popup_layer { grid-area: 1/1/-1/-1 }` claimed every cell of the explicit grid. Real regions auto-flowed into 4 implicit rows below. Content effectively started at y=426 instead of y=16. Two independent investigators rediscovered this bug. | No grid container. Items are absolutely positioned by zone bounds. No way for any single element to claim the layout. |
| **Hardcoded viewport** | `.scene-container { width: 1920px; height: 1080px }`. A 6-viewport sweep found 1920×1080 was the least-bad — all 6 viewports failed. | Viewport is a `runPipeline` input. Aspect-adjust formula compensates. Invariant: "square asset renders square in pixels at every viewport." |
| **Placement-card crush** | `.footprint--handheld { max-height: 180px }` shrank container without shrinking SVG. p200 micropipette went 213 → 180 px (16% squash), aspect 61.7% → 79.7%. Every "make it fit" CSS fix that doesn't change the asset itself ends up violating PRIMARY_DESIGN. | Stage 8 derives height from `visualWidth × viewport_aspect / aspect`. Aspect is invariant by construction. Shrink only happens uniformly via `MIN_SCALE = 0.55`. |
| **Masked failures** | `.placement { overflow: hidden; max-height: 100% }` clipped SVG content silently. Diagnostics under-counted. | No per-card `overflow` control. SVG renders at computed size; clipping cannot be silent. |
| **YAML↔HTML divergence** | 1/10 scenes share canonical `zones[]` vocabulary with `content/base_scenes/*.yaml`. 8/10 use experiment-local taxonomy. | YAML is single source of truth. HTML is emitted. No way to drift. |

**Conclusion.** Every CSS trial was a band-aid on a model the contract
already says is wrong (PRIMARY_CONTRACT item 3: "scene object layout is
handled by the layout engine"). Porting `pipeline.jsx` to
`src/scene_runtime/layout/layout_engine.ts` plus a thin renderer is the
right next move.

---

## Revision log

| Date | Change | Notes |
|---|---|---|
| initial | Created from spec-out phase Q&A. Captures 26 questions across 3 porter rounds. | |
