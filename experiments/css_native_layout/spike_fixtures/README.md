# Spike fixtures - well_plate_96_zoom

These files are planning fixtures for the NEW1 integration spike defined in
[new1_css_native_layout_integration_plan.md](../../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md),
section 3.

## What these fixtures are

- A stable scene manifest in the closed schema from
  [new1_css_native_layout_integration_plan.md](../../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md)
  section 4.
- A frozen description of the DOM selectors and data attributes the spike
  rendering must expose so a Playwright walkthrough can drive it.
- An exact precheck command line and screenshot path list, so reviewers
  know in advance what evidence the spike will produce.

The fixtures pin the spike's external interface before any code is written.
They are inputs to the spike implementation task, not outputs of it.

## What these fixtures are NOT

- NOT wired into the production runtime. Nothing under
  `src` reads these files.
- NOT production. They live under `experiments/` and have no consumers
  outside the NEW1 spike.
- NOT a contract amendment. The closed schema documented here mirrors the
  NEW1 plan's section 4 schema; promotion into
  [../../../docs/PRIMARY_CONTRACT.md](../../../docs/PRIMARY_CONTRACT.md)
  is a post-spike decision (Path A vs Path B in the plan).
- NOT a replacement for [../templates/well_plate_96_zoom.html](../templates/well_plate_96_zoom.html).
  The NEW0 template stays as the static reference HTML; these fixtures
  describe what the runtime-rendered DOM must look like instead.

## How the spike will use them

1. The spike implementation reads
   [well_plate_96_zoom_manifest.yaml](well_plate_96_zoom_manifest.yaml)
   as the scene input.
2. It renders the scene through the production scene loader and adapter.
3. The Playwright walkthrough asserts the DOM matches
   [expected_dom_selectors.md](expected_dom_selectors.md) and
   [expected_data_attributes.md](expected_data_attributes.md).
4. The spike runs the command in
   [expected_precheck_command.md](expected_precheck_command.md) and
   writes screenshots to the paths listed in
   [expected_screenshot_paths.md](expected_screenshot_paths.md).
5. Hard-fail count is checked against NEW1 plan section 5; the run is a
   pass only if all section 9 success gates hold.

## Source of truth for DOM shape

The DOM shape these fixtures describe is derived from the NEW0 reference
template at [../templates/well_plate_96_zoom.html](../templates/well_plate_96_zoom.html).
Where the template uses attributes outside the closed schema, those are
flagged as open questions in
[expected_data_attributes.md](expected_data_attributes.md) rather than
propagated.
