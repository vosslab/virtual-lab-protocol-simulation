# M2a: TypeScript port of the layout engine - handoff

Status: **complete**. All gates green (`tsc --noEmit`, `eslint`, `prettier --check`, `node --test`).

The pipeline now lives in TypeScript at `src/scene_runtime/layout/`. The
reference implementation in `design_advice/pipeline.jsx` and the
specification in `design_advice/LAYOUT_PIPELINE.md` were the source of
truth; this doc describes what the port does, the decisions baked in for
the open questions, and what remains for follow-up.

## What got built

17 TypeScript files, one per stage plus shared infrastructure, plus a
test file covering each stage and the convergence loop.

| File | Role |
| --- | --- |
| `constants.ts` | All closed enums + numeric constants (`ZONE_PADDING`, `MIN_SCALE`, `MAX_FOOTPRINT_RATIO`, `MAX_LAYOUT_PASSES = 3`, `LAYOUT_SHRINK_FACTOR = 0.9`, `WORKSPACE_PX_PER_CM`, etc.). |
| `types.ts` | All interfaces from `LAYOUT_PIPELINE.md` §1, plus the new fields that were referenced in spec text but not yet in the TS interface (`passes`, `identityDiagCount`, `_shrunk_passes`). |
| `workspace_row_library.ts` | Schema B row coordinates per workspace (bench, hood, microscope, cell_counter, incubator, plate_reader). |
| `demo_library.ts` | Reference `OBJECT_LIBRARY` + `ASSET_SPECS` for the heat_block_bench fixture. Will be replaced by a real `content/objects/` loader once content lands. |
| `wrap_label.ts` | Label wrap helper used by Stage 9. |
| `footprint.ts` | Shared helpers: `depthFor`, `widthScaleFor`, `visualWidthFor`, `footprintFor`. |
| `normalize_schema.ts` | Stage 2 - Schema A passthrough, Schema B expansion via row library, applies `layout_rules` defaults on both paths. |
| `resolve_inheritance.ts` | Stage 3 - remove -> deactivate -> reposition -> add, in that order. |
| `bind_objects.ts` | Stage 4 - object/asset resolution + layout-hint merge. Identity fields and asset aspect cannot be overridden. |
| `scale_to_real_world.ts` | Stage 5 - cm-model formula + fallback chain (cm_model -> fallback_no_workspace -> fallback_authored -> skipped_error). |
| `group_by_zone.ts` | Stage 6 - groups by zone, sorts (`depth_tier` ASC, `placement_name`). Error-marked items go to `orphans`. |
| `horizontal_layout.ts` | Stage 7 - alignment dispatch (left/right/center/justify/tab-stops), overflow handling, footprint math. Includes the previously-unimplemented `tab_stop_overflow` diagnostic. |
| `vertical_layout.ts` | Stage 8 - `heightPct = visualWidth * (viewport.w / viewport.h) / aspect`. Aspect invariant by construction. |
| `layout_labels.ts` | Stage 9 - wrap + 3-pass collision nudge + residual-overlap diagnostic. |
| `clamp_scene_bounds.ts` | Stage 10 - per-zone group translation. |
| `run_pipeline.ts` | Top-level runner + convergence loop. Stages 1-5 once; Stages 6-10 looped to `MAX_LAYOUT_PASSES`, shrinking `_width_scale` by `LAYOUT_SHRINK_FACTOR` per overflowing zone. |
| `index.ts` | Public surface (barrel export). |

Test file: `tests/test_layout_engine.mjs`, 23 tests covering each stage,
the heat_block_bench fixture, and the convergence loop. Imports TS
directly via the `tsx` loader (no compile step).

## Open-question decisions baked in

These are the decisions made during the port. All match the spec or its
Decisions doc where one exists; the few inferred answers are flagged.

| Question | Decision | Source |
| --- | --- | --- |
| Q1: cm scaling model | Stage 5 formula `(display_width_cm * px_per_cm) / (default_width * PX_PER_SCENE_PERCENT) * fudge`. Fallback chain documented in code. | Spec §4 Stage 5; Decisions A1. |
| Q2: `LayoutRules` defaults - §1 inline vs §2 table | §2 `DEFAULT_LAYOUT_RULES` is canonical for both schemas. | Inferred. (Spec divergence flagged in M1 review; §2 is the only place with numeric values.) |
| Q3: `normalizeSchema` invariant | `layout_rules` defaults applied on both Schema A and Schema B paths. `scene_bounds` defaulted only on B (Schema A authors required to write it). | Spec §4 Stage 2 (already corrected in latest spec text). |
| Q4: tab_stop_overflow diagnostic | Emitted in `horizontalLayout` tab-stops branch when bucket totals + 2 * gap > zone width. | Inferred from `DiagnosticKind` enum + Decisions §B4. |
| Q5: error-marked items in Stage 6+ | `groupByZone` routes `_error` items into `orphans`. Downstream stages do not need to filter. | Spec note that `bind_objects` skips error items; extended to Stage 6. |
| Q6: z-order | `final[]` is in `depth_tier` order. Renderer is expected to apply z-index from `depth` (back:1, mid:2, front:3). Documented in `run_pipeline.ts`. | Spec §10. |
| Q7: `wrong_order_message` | Passes through `normalize_schema` unchanged. Layout engine does not validate or consume it. | Inferred (decision: scene-level UX message, neither protocol nor object). |
| Q8: runtime deactivation | Caller re-runs `runPipeline` with a mutated placement list. No per-call deactivate hook in pipeline. | Inferred from "pure function" contract. |
| Convergence loop | Wraps Stages 6-10. 3-pass budget. 0.9 uniform shrink per overflowing zone. Emits `max_iterations_reached` if budget exhausted. | Spec §4.5 (referenced; see "Spec gaps" below) and Decisions §E1. |
| `passes` + `identityDiagCount` in result | Both added to `PipelineResult`. `passes: PassRecord[]` records per-pass diagnostics + zones_shrunk. | Decisions §E1. |
| `_shrunk_passes` field on `ScaledPlacement` | Added. Increments each time the placement's zone got shrunk. | pipeline.jsx behavior + Decisions §E1 debug record. |

## Spec gaps surfaced during the port

These are places where the spec or reference impl could be tightened.
None blocked the port (decisions were made and documented in code), but
worth syncing.

1. **Spec §4.5 heading missing.** The doc references §4.5 four times
   (lines 209, 238, 294, 589) but no `## 4.5 Multi-pass convergence`
   heading actually exists in `LAYOUT_PIPELINE.md`. The content lives in
   the Decisions doc §E1. The spec should have its own §4.5 so the spec
   is self-contained.
2. **`PipelineResult` interface incomplete.** Spec §1 doesn't include
   `passes: PassRecord[]` or `identityDiagCount: number`. Both are
   returned by `pipeline.jsx` and required by the port. Suggest:
   ```ts
   interface PassRecord {
     pass: number;
     diagnostics: Diagnostic[];
     zones_shrunk: string[];
   }
   interface PipelineResult {
     // existing fields ...
     passes: PassRecord[];
     identityDiagCount: number;
   }
   ```
3. **`ScaledPlacement._shrunk_passes` missing from spec §1 interface.**
   pipeline.jsx writes it (`(p._shrunk_passes || 0) + 1`). Useful debug
   field; add to the TS type in the spec.
4. **`PipelineInputs.maxPasses` / `shrinkFactor`.** pipeline.jsx accepts
   both via opts; spec `PipelineInputs` doesn't list them. Either expose
   them (TS port currently does) or note they are not externally
   overridable.
5. **Asymmetric snapshot in `passes[]`.** pipeline.jsx snapshots
   `passDiagnostics` into `passes[i].diagnostics` then later mutates
   `passes[i].zones_shrunk` via reference. The
   `max_iterations_reached` meta-diagnostic is pushed after the
   snapshot, so it appears in `result.diagnostics` but not in the
   per-pass record. The TS port preserves this behavior; worth either
   documenting in the spec or snapshotting after the meta-diagnostic
   push.
6. **`tab_stop_overflow` was declared but not emitted.** The
   `DiagnosticKind` enum already named it. The TS port now emits it in
   `horizontalLayout` so the convergence loop can react. Verify the
   formula matches your intent: `bucketTotal = leftTotal + centerTotal +
   rightTotal + 2 * gap; if bucketTotal > zoneW + 0.5 emit warn`.

## Worked example coverage

The heat_block_bench fixture from spec §7 is exercised end-to-end in the
test suite. `_width_scale` values match the spec table within 0.001:

| placement | spec _width_scale | TS port |
| --- | --- | --- |
| `rear_left_eppendorf_rack` | `(12 * 3.2) / (13 * 11.52) = 0.2564` | matches |
| `rear_right_protein_ladder` | `(3 * 3.2) / (4 * 11.52) = 0.2083` | matches |
| `center_heat_block` | `(25 * 3.2) / (18 * 11.52) = 0.3858` | matches |

For `_height`, the heat_block row matches the Stage 8 formula and the
spec table (~9.1). The other two rows in the spec table (`5.5` for the
rack, `1.2` for the ladder) do not match the documented formula. The TS
port follows the formula as the source of truth; suggest verifying the
spec table values.

## Build, test, lint commands

```bash
# from repo root
npx tsc --noEmit -p tsconfig.json     # typecheck
npx eslint src/                        # lint
npx prettier --check 'src/**/*.ts'     # format check
node --import tsx --test tests/test_layout_engine.mjs    # tests
```

All four return clean as of this commit.

## File layout under `src/scene_runtime/layout/`

```
src/scene_runtime/layout/
  bind_objects.ts          # Stage 4
  clamp_scene_bounds.ts    # Stage 10
  constants.ts             # closed enums + numeric constants
  demo_library.ts          # reference OBJECT_LIBRARY + ASSET_SPECS
  footprint.ts             # depthFor, widthScaleFor, visualWidthFor, footprintFor
  group_by_zone.ts         # Stage 6
  horizontal_layout.ts     # Stage 7
  index.ts                 # public surface
  layout_labels.ts         # Stage 9
  normalize_schema.ts      # Stage 2
  resolve_inheritance.ts   # Stage 3
  run_pipeline.ts          # top-level + convergence loop
  scale_to_real_world.ts   # Stage 5
  types.ts                 # all interfaces
  vertical_layout.ts       # Stage 8
  workspace_row_library.ts # Schema B coordinates
  wrap_label.ts            # label wrap helper
```

## What's next (M2b candidates)

1. **Renderer.** Thin DOM/SVG renderer that reads `final[]` and emits
   absolutely-positioned elements per spec §4 Stage 10. Replaces the
   hand-authored HTML templates under `experiments/css_native_layout/`.
2. **Object-library wiring.** Replace `demo_library.ts` with a real
   loader that compiles `content/objects/<kind>/<object_name>.yaml` into
   the `ObjectLibrary` shape.
3. **First scene end-to-end.** Take `content/base_scenes/bench_basic.yaml`
   through pipeline + renderer + Playwright screenshot. Compare against
   the M0 static baseline.
4. **Validator entry point.** Build-time strict validator that throws
   on `unknown_object`, multi-level extends, locked-field mutations,
   etc. (per spec §8). Runtime pipeline never throws; validator catches
   authoring problems before runtime.
5. **Sync spec to port.** The six spec gaps above either need edits in
   `LAYOUT_PIPELINE.md` or notes that they are intentionally divergent.

## Pointers

- Pipeline reference (JS): `design_advice/pipeline.jsx`
- Spec: `design_advice/LAYOUT_PIPELINE.md`
- Decisions: `design_advice/LAYOUT_PIPELINE_DECISIONS.md`
- TS port: `src/scene_runtime/layout/`
- Test fixture + per-stage tests: `tests/test_layout_engine.mjs`
- Prior CSS-trial postmortem (why this engine matters):
  `docs/active_plans/reports/m1_trial_summary_for_designer.md`
