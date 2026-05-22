# Expected DOM selectors

CSS selectors the spike-rendered `well_plate_96_zoom` DOM must expose. The
Playwright walkthrough in the NEW1 spike (see
[new1_css_native_layout_integration_plan.md](../../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md)
section 3) asserts against this list.

DOM shape is derived from the NEW0 reference template at
[../templates/well_plate_96_zoom.html](../templates/well_plate_96_zoom.html).
The closed schema lives in NEW1 plan section 4. Any attribute the template
uses but the schema does not name is listed as a question in
[expected_data_attributes.md](expected_data_attributes.md), not silently
promoted.

## Root scene container

| Selector                        | Data attributes           | Purpose                                                   |
| ------------------------------- | ------------------------- | --------------------------------------------------------- |
| `.scene-container`              | (none required by schema) | Outermost scene root                                      |
| `.scene-container.scene--bench` | (none required by schema) | Workspace marker class (`workspace: bench` from manifest) |

## Per-region selectors

This table documents the NEW0 reference template's behavior (five region
containers emitted even when empty). It is a reference baseline, not a
closed-schema requirement on the spike's DOM emitter. See "Region scaffold:
spike-time implementation question" below.

Rows marked `(*)` are empty in this scene: the manifest's `placements[]`
contains no entry whose `region` field names them. Only `work_surface` is
required by the manifest's actual placement data.

| Selector                                         | Data attributes                    | Purpose                                                     |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------- |
| `.region[data-region="rear_shelf"]` (\*)         | `data-region="rear_shelf"`         | Rear shelf region container (empty in this scene)           |
| `.region[data-region="work_surface"]`            | `data-region="work_surface"`       | Work surface region; holds the primary placement (required) |
| `.region[data-region="front_tools"]` (\*)        | `data-region="front_tools"`        | Front tools region (empty in this scene)                    |
| `.region[data-region="instrument_station"]` (\*) | `data-region="instrument_station"` | Instrument station region (empty in this scene)             |
| `.region[data-region="popup_layer"]` (\*)        | `data-region="popup_layer"`        | Popup layer region (empty in this scene)                    |

### Region scaffold: spike-time implementation question

The closed NEW1 manifest
([well_plate_96_zoom_manifest.yaml](well_plate_96_zoom_manifest.yaml))
defines only `placements[]` with a `region` field per placement. There is
no schema-level "five-region default scaffold" concept; the schema does
not require the emitter to materialize containers for regions that have
no placements.

The spike implementer chooses one of these DOM-emission strategies:

- (a) Always emit all five region containers as render-time scaffolds.
  Matches the NEW0 reference template exactly. Empty rows above resolve.
- (b) Emit only regions that have at least one placement. Minimal DOM.
  Empty rows above do not resolve in this scene.
- (c) Emit only regions referenced by some placement's `region` field.
  Close to (b) but explicit about the derivation rule.

The selectors in the table above are the NEW0 template's behavior as a
reference baseline. They are not a binding contract on the spike's
emitter. Only the `work_surface` row (and the composite selector in
"Region-to-placement scoping" below) is required by the manifest's
placement data for this scene.

## Per-placement selectors

One selector per entry in `placements[]` from
[well_plate_96_zoom_manifest.yaml](well_plate_96_zoom_manifest.yaml).

| Selector                                               | Data attributes                                                                                       | Purpose                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `.placement[data-placement-name="zoom_well_plate_96"]` | `data-placement-name="zoom_well_plate_96"`, `data-object-name="well_plate_96"`, `data-primary="true"` | Primary placement node; hit target for spike click step                      |
| `.placement[data-object-name="well_plate_96"]`         | `data-object-name="well_plate_96"`                                                                    | Object-name lookup; scene adapter resolves semantic target name to this node |
| `.placement[data-primary="true"]`                      | `data-primary="true"`                                                                                 | Primary-placement marker; at most one per scene per NEW1 schema              |

## Region-to-placement scoping

The primary placement must live inside the `work_surface` region. The spike
asserts this composite selector resolves to exactly one node:

| Selector                                                                                   | Data attributes                   | Purpose                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------- |
| `.region[data-region="work_surface"] .placement[data-placement-name="zoom_well_plate_96"]` | combined region + placement attrs | Verifies the manifest's `region: work_surface` was honored at render time |
