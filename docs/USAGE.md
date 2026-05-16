# Usage

Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

Players learn cell culture techniques by completing a guided 25-step laboratory
protocol or focused tutorials in the browser.

## Quick start

```bash
bash export_single_file.sh
open dist-single/game.html
```

The build compiles all TypeScript files in [src/](../src/) into a single
self-contained HTML file (a generated artifact not tracked in git). No web
server is needed to play.

For local development with a web server, use [run_web_server.sh](../run_web_server.sh):

```bash
bash run_web_server.sh
```

This rebuilds `dist/` and serves it on a local port. The root URL
(`/`) opens a browser launcher where players can choose the full protocol or
one of the short tutorials. Direct links use the protocol query parameter:

```text
/?protocol=cell_culture_full
/?protocol=passage_hood_detachment
/?protocol=trypan_blue_counting
```

Invalid protocol links return to the launcher with a recoverable error banner.

## Playing the game

The curriculum guides players through the OVCAR8 carboplatin + metformin MTT
workflow via 10 mini-protocols, each teaching one focused lab skill. The
`cell_culture_full` sequence runner assembles them in order. Major phases:

- Passage and cell counting (splitting, counting cells, seeding).
- Drug dilution and treatment (preparing dilutions, dosing the plate).
- MTT readout (adding MTT, dissolving formazan, reading absorbance, viewing results).

Protocol specifications are authored in YAML under `content/<protocol_name>/`;
see [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) for the
authoring contract and
[protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)
for the wet-lab source protocol.

Interact by clicking items. Click the tool first, then click the destination
or source to complete each interaction. Valid items for the current interaction
glow with a pulsing green border. Real-time warnings appear in the sidebar when
technique errors occur.

## Scoring

Performance is rated on four categories:

| Category | Tracks |
| --- | --- |
| Order | Steps completed in correct sequence |
| Cleanliness | Contamination and sterile technique errors |
| Waste | Excess media usage |
| Timing | Speed to completion |

A 1-3 star rating is shown on the results screen.

## Inputs and outputs

- **Source:** TypeScript modules in [src/](../src/) and HTML/CSS templates
- **Build outputs:** `dist/` for the served build and
  `dist-single/game.html` for the portable single-file export
- **Test outputs:** `report_*.txt`, `test-results/walker/`, and other
  `test-results/` browser screenshots and reports

## Protocol builder

Build the protocol catalog's TypeScript data files:

```bash
source source_me.sh && python3 tools/build_protocol_data.py
```

Validate a specific protocol (for example, a tutorial) while keeping generated
output catalog-backed:

```bash
source source_me.sh && python3 tools/build_protocol_data.py --protocol tutorial_split
```

Validate only (no output files):

```bash
source source_me.sh && python3 tools/build_protocol_data.py --validate-only
```

## Protocol stepper

The protocol stepper is the second of two content gates. Run the schema
validator first, then the stepper:

```bash
source source_me.sh && python3 tools/validate_content_yaml.py
source source_me.sh && python3 tools/protocol_stepper.py
```

The validator catches schema and per-mini authoring errors. The stepper
loads the validated content and performs whole-protocol simulation: it
walks every mini-protocol's flow graph, tracks material and set-point
state on declared objects, runs scene operations against the scene
adapter, and chains constituent mini-protocols inside every sequence
runner.

Default invocation walks every mini-protocol plus every sequence runner
in the content tree. Walk a single protocol:

```bash
source source_me.sh && python3 tools/protocol_stepper.py --protocol passage_hood_detachment
```

Verbose mode prints per-step state deltas (which object fields changed,
which materials moved, which scene operations fired) as the walk
progresses:

```bash
source source_me.sh && python3 tools/protocol_stepper.py --protocol passage_hood_detachment --verbose
```

### Error classes

The stepper surfaces these primary error classes:

- `unknown_material`: a step references a material name not declared in
  the mini's `materials.yaml`.
- `state_value_type_mismatch`: a setter primitive writes a value whose
  type does not match the declared primitive type of the field.
- `flow_cycle`: `next_step` chains form a loop with no terminal step.
- `broken_next_step`: a `next_step` names a `step_name` that does not
  exist in the mini's `steps` list.
- `runner_of_runner`: a `sequence_runner` lists another `sequence_runner`
  as a constituent (only `mini_protocol` constituents are allowed).
- `placement_name_collision`: two scene placements share the same
  `placement_name`.
- `capability_mismatch`: a step targets an object that does not declare
  the capability the gesture requires.

### Flow-shape checks

The stepper also enforces flow-shape invariants:

- every `entry_step` resolves to a real `step_name`;
- every reachable step terminates (no orphan branches);
- every `target` in an interaction resolves through the scene adapter to
  a placed object (currently a WARNING; see the scene-adapter design
  follow-on in [active_plans/scene_adapter_resolution_design.md](active_plans/scene_adapter_resolution_design.md)).

### Deferred checks

Two related checks are deferred to follow-on RFCs and are not enforced
by the stepper today:

- Material volume conservation across a step's scene operations. See
  [active_plans/material_volume_conservation_spec.md](active_plans/material_volume_conservation_spec.md).
- `step_kind` semantic gating for `TimedWait` and related primitives.
  See [active_plans/step_kind_spec_rfc.md](active_plans/step_kind_spec_rfc.md).

## Testing

### Browser smoke test (fast 9-gate check)

```bash
source source_me.sh && python3 tools/run_smoke.py
```

This verifies the app loads and renders the first 9 bench gates. Fast signal for CI/local feedback.
On macOS Codex, real Playwright browser launches may need approval/escalation
because Chromium and Firefox can hit OS sandbox limits before app code runs.
The narrow browser command is:

```bash
npm run browser:smoke
```

For a screenshot-oriented UI review of the compiled page, use:

```bash
npm run build
npm run ui:review
```

For local pre-commit review on macOS Codex only, use the Podman wrapper when
the local browser launch hits sandbox failures:

```bash
tools/run_ui_review_podman.sh
```

### Full protocol walkthrough

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py
```

This builds the game, then runs the YAML-driven UI walker to completion of the active protocol.
Run with `--wrong-order` to verify soft-fail recovery:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --wrong-order
```

Run on a specific protocol:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_split
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_hemocytometer_count
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_plate_drug_additions
```

Skip the build step for speed during iteration:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol cell_culture --no-build
```

List available protocols:

```bash
source source_me.sh && python3 tools/run_protocol_walkthrough.py --list-protocols
```

## Running tests

```bash
source source_me.sh && python3 -m pytest tests/
```

Run only changed files for faster feedback:

```bash
FAST_REPO_HYGIENE=1 source source_me.sh && python3 -m pytest tests/
```

## Regenerating the shared bottle SVG

The shared bottle artwork at `assets/equipment/bottle.svg` is derived from
the Servier Bioicons sources. Regenerate it (and its sidecar colormap)
from the three pristine variants whenever the upstream art changes:

```bash
source source_me.sh && python3 tools/build_servier_recolor.py bottle \
    OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/bottle-medium-pink.svg \
    OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/bottle-medium-orange.svg \
    OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/bottle-medium-green.svg
```

Then refresh the runtime manifest:

```bash
source source_me.sh && python3 tools/generate_svg_globals.py
```

The diff classifies any path whose fill or stroke is not shared across all
three variants as part of the liquid layer, assigns `liquid_<sha8(d)>`
ids, and emits per-id opacity from luminance to preserve Servier shading.
See [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md#dynamic-svg-recolor-pipeline)
for the full pipeline.

## Known gaps

- TODO: Confirm minimum Node.js version required by esbuild.
