# Expected screenshot paths

Exact relative paths (from repo root) where NEW1 spike screenshot evidence
will land. The Playwright walkthrough writes these; reviewers consume them
against NEW1 plan section 9 success gates in
[../../../docs/active_plans/new1_css_native_layout_integration_plan.md](../../../docs/active_plans/new1_css_native_layout_integration_plan.md).

All paths sit under `test-results/`, which is gitignored per
[../../../docs/PLAYWRIGHT_USAGE.md](../../../docs/PLAYWRIGHT_USAGE.md).

## Walkthrough screenshots

The NEW1 spike runs one end-to-end interaction (plan section 3 step 3):
pipette pickup -> well click -> `ObjectStateChange`. The walkthrough
captures one screenshot before and one after each meaningful interaction,
matching contract item 4 in
[../../../docs/PRIMARY_CONTRACT.md](../../../docs/PRIMARY_CONTRACT.md).

| Path | Step it documents |
| --- | --- |
| `test-results/new1_spike/well_plate_96_zoom/01_scene_initial.png` | Scene loaded through production runtime; no interaction yet |
| `test-results/new1_spike/well_plate_96_zoom/02_pipette_attached.png` | After pipette pickup; cursor-attach anchor visible |
| `test-results/new1_spike/well_plate_96_zoom/03_well_hover.png` | Hover state on the primary placement well-plate node |
| `test-results/new1_spike/well_plate_96_zoom/04_well_clicked.png` | Click registered on the primary placement |
| `test-results/new1_spike/well_plate_96_zoom/05_object_state_change.png` | After `ObjectStateChange` re-render; visual state updated |

## Precheck screenshots

The precheck runner emits its own screenshots independently. Paths are
pinned by [expected_precheck_command.md](expected_precheck_command.md).

| Path | Purpose |
| --- | --- |
| `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.png` | Raw scene capture used for pixel-diff vs current production rendering (plan section 3 step 5) |
| `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.annotated.png` | Annotated capture used for visual review |

## Baseline (current production) screenshot

Plan section 9 success gate references a pixel-diff vs the existing layout
engine rendering. The spike writes the baseline alongside the CSS-native
capture so the diff is colocated.

| Path | Purpose |
| --- | --- |
| `test-results/new1_spike/well_plate_96_zoom/baseline_layout_engine.png` | `well_plate_96_zoom` rendered by current production layout engine |
| `test-results/new1_spike/well_plate_96_zoom/diff_css_native_vs_baseline.png` | Pixel-diff overlay; consumed by the 5%-per-region delta gate |
