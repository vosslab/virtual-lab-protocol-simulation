# Usage

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

Players learn cell culture techniques by completing a guided 25-step laboratory
protocol or focused tutorials in the browser.

## Quick start

```bash
bash export_single_file.sh
open cell_culture_game.html
```

The build compiles all TypeScript files in [src/](../src/) into a single
self-contained HTML file (a generated artifact not tracked in git). No web
server is needed to play.

For local development with a web server, use [run_web_server.sh](../run_web_server.sh):

```bash
bash run_web_server.sh
```

This rebuilds [dist/](../dist/) and serves it on a local port. The root URL
(`/`) opens a browser launcher where players can choose the full protocol or
one of the short tutorials. Direct links use the protocol query parameter:

```text
/?protocol=cell_culture
/?protocol=tutorial_pbs
/?protocol=tutorial_plate_reader
```

Invalid protocol links return to the launcher with a recoverable error banner.

## Playing the game

The game guides players through a 25-step cell culture protocol modeling the
OVCAR8 carboplatin + metformin MTT workflow across three lab days. Major
phases:

- Day 1: split, count cells, seed the 96-well plate, overnight incubation.
- Day 2: prepare carboplatin and metformin dilutions, dose the plate,
  48-hour incubation.
- Day 4: MTT readout (add MTT, decant, dissolve formazan with DMSO, read
  absorbance, view results).

The full ordered step list is generated from
[src/content/cell_culture/protocol.yaml](../src/content/cell_culture/protocol.yaml);
see [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md) for the
authoring contract and
[OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)
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
- **Build output:** `cell_culture_game.html` (single file, no external deps)
- **Test outputs:** `report_*.txt` files and `test-results/walkthrough/*.png` screenshots

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

For local pre-commit review on macOS Codex, prefer the Podman wrapper so the
browser runs in the Playwright container:

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
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol tutorial_plate_intro
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

- TODO: Document expected Playwright walkthrough screenshot output
