# Usage

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

Players learn cell culture techniques by completing a guided 9-step laboratory
protocol in the browser.

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

This rebuilds [dist/](../dist/) and serves it on a local port.

## Playing the game

The game guides players through a 9-step cell culture protocol:

1. Spray and sanitize the sterile hood
2. Aspirate old media from the flask
3. Add fresh media to the correct volume
4. Check cell viability under the microscope
5. Count cells using hemocytometer quadrant selection
6. Transfer cells to a well plate
7. Add drug dilutions (choose a serial dilution series)
8. Incubate the plate
9. Read plate results

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

Build the active protocol's TypeScript data files:

```bash
source source_me.sh && python3 tools/build_protocol_data.py
```

Build a different protocol (e.g., tutorial):

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
bash smoke.sh
```

This verifies the app loads and renders the first 9 bench gates. Fast signal for CI/local feedback.

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
