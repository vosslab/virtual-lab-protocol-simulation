# Usage

Protocol terminology is defined in [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

Players learn cell culture techniques by completing a guided 25-step laboratory
protocol or focused tutorials in the browser.

## Quick start

```bash
bash export_single_file.sh
open dist-single/game.html
```

The build compiles all TypeScript files in `src` into a single
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

Protocol specifications are authored in YAML under `content/protocols/<cluster>/<protocol_name>/`;
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

| Category    | Tracks                                     |
| ----------- | ------------------------------------------ |
| Order       | Steps completed in correct sequence        |
| Cleanliness | Contamination and sterile technique errors |
| Waste       | Excess media usage                         |
| Timing      | Speed to completion                        |

A 1-3 star rating is shown on the results screen.

## Inputs and outputs

- **Source:** TypeScript modules in `src` and HTML/CSS templates
- **Build outputs:** `dist/` for the served build and
  `dist-single/game.html` for the portable single-file export
- **Test outputs:** `report_*.txt`, `test-results/walker/`, and other
  `test-results/` browser screenshots and reports

## Protocol builder

Build the protocol catalog's TypeScript data files:

```bash
source source_me.sh && python3 pipeline/build_protocol_data.py
```

Validate a specific protocol (for example, a tutorial) while keeping generated
output catalog-backed:

```bash
source source_me.sh && python3 pipeline/build_protocol_data.py --protocol tutorial_split
```

Validate only (no output files):

```bash
source source_me.sh && python3 pipeline/build_protocol_data.py --validate-only
```

## HTML builder

Generate one HTML file per mini-protocol under `dist/`:

```bash
source source_me.sh && python3 pipeline/build_protocol_html.py --all
```

Generate HTML for a single protocol:

```bash
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
```

Each generated shell is a minimal ~1.5 KB HTML file that references the shared
`dist/runtime.bundle.js` and loads per-protocol runtime data. The `dist/`
directory is gitignored (build artifact only).

## Validation

All validation tools accept a unified command-line interface. The canonical
invocation pattern uses `source_me.sh` to set `PYTHONPATH`:

```bash
source source_me.sh && python3 validation/validate.py
```

### Canonical entry point

`validation/validate.py` is the aggregate entry point for the full
validation suite. It runs five stages (YAML schema, SVG assets, protocol
stepper, folder layout, manual lint) with a unified command-line interface and
overview-mode rich summary output.

### Unified flag table

All validation CLIs (aggregate `validation/validate.py`, plus per-stage
`python3 -m validation.yaml`, `python3 -m validation.svg`,
`python3 -m validation.stepper`, and `python3 validation/manual/protocol_manual.py --validate`)
accept this flag set:

| Long            | Short | Type     | Default | Notes                                                                                                                                                                                                                                             |
| --------------- | ----- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--focus`       | `-f`  | flag     | off     | Run on protocols/objects/scenes touched by `git diff HEAD --cached` plus transitive dependents. Mutually exclusive with `--protocol`, `--object`, `--scene`.                                                                                      |
| `--protocol`    | `-p`  | name(s)  | (all)   | One or more protocol names to validate.                                                                                                                                                                                                           |
| `--object`      | `-o`  | name(s)  | (all)   | One or more object names. Alias: `--asset` / `-A`.                                                                                                                                                                                                |
| `--scene`       | `-S`  | name(s)  | (all)   | One or more scene names.                                                                                                                                                                                                                          |
| `--list`        | `-l`  | flag     | off     | List selectable entities for the tool and exit.                                                                                                                                                                                                   |
| `--interactive` | `-i`  | flag     | off     | Numbered picker menu (no effect if stdin not a tty).                                                                                                                                                                                              |
| `--quiet`       | `-q`  | flag     | off     | Suppress stage rows; findings + summary only. Mutually exclusive with `--verbose`.                                                                                                                                                                |
| `--verbose`     | `-v`  | flag     | off     | Per-item state + inline warnings. Mutually exclusive with `--quiet`.                                                                                                                                                                              |
| `--errors-only` | `-e`  | flag     | off     | Suppress warnings from output (exit code unchanged).                                                                                                                                                                                              |
| `--strict`      | `-s`  | flag     | off     | Exit non-zero on warning in addition to error.                                                                                                                                                                                                    |
| `--no-color`    | --    | flag     | off     | Suppress color output. Also honors `NO_COLOR` env var.                                                                                                                                                                                            |
| `--json`        | `-j`  | flag     | off     | Emit unified JSON document.                                                                                                                                                                                                                       |
| `--ndjson`      | `-J`  | flag     | off     | Stream one finding per line + final summary record.                                                                                                                                                                                               |
| `--only`        | `-O`  | stage(s) | (all)   | Stage filter: `yaml`, `svg`, `stepper`, `structure`, `manual` (aggregate entry only). `svg` runs both pipeline_check and asset_audit. `manual` runs `validation/manual/protocol_manual.py --validate` (lint pass over rendered protocol manuals). |

Short-flag summary: `-f -p -o -S -l -i -q -v -e -s -j -J -O`, plus alias `-A` for `--asset`.

### Verbosity contract

All validation tools enforce a consistent verbosity model:

| Mode               | Output                                                            | Use case                             |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------ |
| `-q` / `--quiet`   | Final pass/fail only (one line)                                   | CI, automated reporting              |
| (default)          | Overview dashboard with counts and top offenders                  | Human feedback, local development    |
| `-v` / `--verbose` | Diagnostic summary (grouped findings, top codes, per-item counts) | Investigation and debugging          |
| `--json` / `-j`    | Full structured JSON document                                     | Agent parsing, programmatic analysis |
| `--ndjson` / `-J`  | Newline-delimited JSON (one finding per line)                     | Stream processing, large datasets    |

Key principle: raw per-step, per-file, or per-asset detail is available only via `--json` or `--ndjson`. The text modes (`-q`, default, `-v`) stay bounded and human-readable. All modes preserve the same exit code semantics (0 = clean, 1 = errors).

### Overview-mode examples

Default mode shows a one-screen rich summary (suitable for CI, local feedback, and humans):

```bash
validation/validate.py                          # whole suite
validation/validate.py --focus                  # git-scoped
validation/validate.py -p passage_hood_detachment
validation/validate.py -o cell_culture_dish
validation/validate.py -O yaml                  # YAML stage only
validation/validate.py -O structure             # folder layout stage only
validation/validate.py -O stepper -v            # stepper with per-step state
```

### Agent-mode examples

Use `--json` or `--ndjson` for tool consumption and parsing:

```bash
validation/validate.py --json | jq '.findings[]'
validation/validate.py --ndjson | jq -c 'select(.severity=="ERROR")'
validation/validate.py --protocol cell_culture_full --json > findings.json
```

### Per-stage direct invocation

Run individual validation stages directly (per-stage entry points ignore `--only`):

```bash
python3 validation/structure/layout_check.py
python3 -m validation.yaml
python3 -m validation.svg
python3 -m validation.stepper
python3 validation/manual/protocol_manual.py --validate --all
```

Equivalent to:

```bash
validation/validate.py --only structure
validation/validate.py --only yaml
validation/validate.py --only svg
validation/validate.py --only stepper
validation/validate.py --only manual
```

### Protocol stepper details

The protocol stepper is the second of two content gates. It loads validated
YAML content and performs whole-protocol simulation: walks every mini-protocol's
flow graph, tracks material and set-point state on declared objects, runs scene
operations against the scene adapter, and chains constituent mini-protocols
inside every sequence runner.

Example with verbose state-delta output:

```bash
source source_me.sh && python3 validation/stepper/step_check.py --protocol passage_hood_detachment --verbose
```

#### Stepper error classes

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
- `s-state-jump`: a state field increased on an object with no matching
  decrement elsewhere in the same interaction (suspected un-sourced
  material gain; WARNING).
- `s-cycle`: a `next_step` chain re-enters a previously visited step
  (loop detected by graph walk).
- `s-unreachable`: an authored `step_name` is never reached from
  `entry_step`.
- `s-unregistered`: a step writes a `material_name` (or
  `held_material_name`) that is neither declared in `materials.yaml` nor
  in the sentinel allowlist (WARNING).
- `s-unused`: a material declared in `materials.yaml` is never
  referenced by any step (WARNING).

#### Manual lint codes

The manual-renderer lint pass (`validation/manual/protocol_manual.py
--validate`) emits these codes:

- `l-aspirate`: a prompt or response uses "aspirate" outside its
  reserved meaning (vacuum-removal-to-waste); WARNING.
- `l-matdrift`: rendered material identity drifts from the authored
  state at a step boundary; WARNING.
- `l-volmismatch`: an authored set-volume value disagrees with the
  computed transfer delta for the same interaction; WARNING.
- `l-prompt`: a prompt phrasing diverges from the action the step
  performs (advisory only); INFO.

#### Flow-shape checks

The stepper also enforces flow-shape invariants:

- every `entry_step` resolves to a real `step_name`;
- every reachable step terminates (no orphan branches);
- every `target` in an interaction resolves through the scene adapter to
  a placed object (currently a WARNING; see the scene-adapter design
  follow-on in [archive/scene_adapter_resolution_design.md](archive/scene_adapter_resolution_design.md)).

#### Deferred checks

Two related checks are deferred to follow-on RFCs and are not enforced
by the stepper today:

- Material volume conservation across a step's scene operations
  (see `material_volume_conservation_spec.md`, archived).
- `step_kind` semantic gating for `TimedWait` and related primitives
  (see `step_kind_spec_rfc.md`, archived).

### JSON schema reference

Validation output formats (`--json` and `--ndjson`) follow a closed
schema. See [VALIDATION_JSON_SCHEMA.md](VALIDATION_JSON_SCHEMA.md) for
the complete output schema, field definitions, and parsing examples.

### Deprecated flag aliases

The following flag aliases are accepted for backward compatibility and
will be removed in a future release:

- `--list-protocols` -> use `--list`
- `--list-objects` -> use `--list`
- `--format json` (svg_asset_audit) -> use `--json`
- `--format table` (svg_asset_audit) -> default text output

### Exit codes

- `0` clean (no errors; warnings permitted unless `--strict`)
- `1` error findings present, or warning findings with `--strict`
- `2` command-line usage error

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
source source_me.sh && python3 pipeline/generate_svg_globals.py
```

The diff classifies any path whose fill or stroke is not shared across all
three variants as part of the liquid layer, assigns `liquid_<sha8(d)>`
ids, and emits per-id opacity from luminance to preserve Servier shading.
See [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md#dynamic-svg-recolor-pipeline)
for the full pipeline.

## Known gaps

- TODO: Confirm minimum Node.js version required by esbuild.
